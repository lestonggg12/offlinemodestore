"""
================================================================================
 views.py — REWRITTEN WITH PAYMENTHISTORY PERSISTENCE
================================================================================

KEY CHANGES:
  ✅ PaymentHistory is NEVER cascade-deleted when debtor is deleted
  ✅ DELETE method explicitly preserves PaymentHistory
  ✅ Better logging to track payment history creation and deletion
  ✅ Calendar includes PaymentHistory even if debtor no longer exists
  ✅ Date details show payments from deleted debtors
  ✅ FIX: date_details now ALWAYS merges PaymentHistory even when using
          cached DailySummary (previously, cached path skipped PaymentHistory)

Sections:
  1. AUTH VIEWS
  2. SETTINGS API
  3. CATEGORY API
  4. PRODUCT API
  5. SALES API
  6. DEBTOR API (with PaymentHistory preservation)
  7. ACCUMULATED TOTALS API
  8. PERIOD TOTALS
  9. CALENDAR / DAILY SUMMARY API (with PaymentHistory)
  10. BACKFILL
  11. TRANSACTION CLEANUP API
"""

import os
import json
import traceback
from datetime import datetime, timedelta, time
from decimal import Decimal

from django.core.cache import cache
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.csrf import ensure_csrf_cookie
from django.db.models import Sum, Count
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    Category, Product, Sale, SaleItem,
    Debtor, DebtorItem, StoreSettings, DailySummary, PeriodTotals,
    PaymentHistory,
)
from .serializers import (
    CategorySerializer, ProductSerializer, SaleSerializer, DebtorSerializer,
    DailySummarySerializer, PeriodTotalsSerializer, PaymentHistorySerializer,
)


# =============================================================================
#  1. AUTH VIEWS
# =============================================================================

def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    if request.method == 'POST':
        username    = request.POST.get('username')
        password    = request.POST.get('password')
        access_code = request.POST.get('access_code')

        store_access_code = os.environ.get('STORE_ACCESS_CODE','123456')

        user = authenticate(request, username=username, password=password)
        if user is not None and access_code == store_access_code:
            auth_login(request, user)
            return redirect('dashboard')
        messages.error(request, "Invalid credentials or access code.")
    return render(request, 'admin_login.html')


def logout_view(request):
    auth_logout(request)
    return redirect('login')


@login_required(login_url='login')
@ensure_csrf_cookie
def dashboard_view(request):
    return render(request, 'dashboard.html')


# =============================================================================
#  2. SETTINGS API
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_settings(request):
    settings = StoreSettings.load()
    try:
        change_history = json.loads(settings.change_history or '[]')
        if not isinstance(change_history, list):
            change_history = []
    except (json.JSONDecodeError, TypeError):
        change_history = []
    return JsonResponse({
        'profitMargin':  float(settings.profit_margin),
        'lowStockLimit': settings.low_stock_limit,
        'theme':         settings.theme,
        'debtSurcharge': float(settings.debt_surcharge),
        'changeHistory': change_history,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_settings(request):
    try:
        data     = request.data
        settings = StoreSettings.load()
        settings.profit_margin   = data.get('profitMargin',  settings.profit_margin)
        settings.low_stock_limit = data.get('lowStockLimit', settings.low_stock_limit)
        settings.theme           = data.get('theme',         settings.theme)
        settings.debt_surcharge  = data.get('debtSurcharge', settings.debt_surcharge)
        incoming_history = data.get('changeHistory', None)
        if incoming_history is not None and isinstance(incoming_history, list):
            settings.change_history = json.dumps(incoming_history[-10:])
        settings.save()
        try:
            saved_history = json.loads(settings.change_history or '[]')
        except (json.JSONDecodeError, TypeError):
            saved_history = []
        return Response({
            'status':        'success',
            'profitMargin':  float(settings.profit_margin),
            'lowStockLimit': settings.low_stock_limit,
            'theme':         settings.theme,
            'debtSurcharge': float(settings.debt_surcharge),
            'changeHistory': saved_history,
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'status': 'error', 'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
#  3. CATEGORY API
# =============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def category_list(request):
    if request.method == 'GET':
        if not Category.objects.exists():
            Category.seed_defaults()
        return Response(CategorySerializer(Category.objects.all(), many=True).data)

    data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
    name = data.get('name', '').strip()
    if not name:
        return Response({'error': 'Category name is required.'}, status=status.HTTP_400_BAD_REQUEST)

    if not data.get('slug'):
        data['slug'] = Category.generate_unique_slug(name)
    if not data.get('color'):
        data['color'] = Category.next_auto_color()
    if 'order' not in data:
        max_order = Category.objects.filter(is_default=False).aggregate(
            m=__import__('django.db.models', fromlist=['Max']).Max('order')
        )['m'] or 99
        data['order'] = max_order + 1
    data['is_default'] = False

    serializer = CategorySerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def category_detail(request, pk):
    try:
        category = Category.objects.get(pk=pk)
    except Category.DoesNotExist:
        return Response({'error': 'Category not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(CategorySerializer(category).data)

    if request.method == 'PUT':
        allowed = {'name', 'icon', 'color', 'order'}
        data = {k: v for k, v in request.data.items() if k in allowed}
        serializer = CategorySerializer(category, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    old_slug        = category.slug
    reassign_to     = request.data.get('reassign_to',    None)
    delete_products = request.data.get('delete_products', False)

    if reassign_to:
        if not Category.objects.filter(slug=reassign_to).exists():
            return Response(
                {'error': f'Target category "{reassign_to}" does not exist.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        Product.objects.filter(category=old_slug).update(category=reassign_to)
    elif delete_products:
        Product.objects.filter(category=old_slug).delete()

    product_count = Product.objects.filter(category=old_slug).count()
    category.delete()
    return Response(
        {'message': f'Category "{old_slug}" deleted.', 'products_left': product_count},
        status=status.HTTP_200_OK,
    )


# =============================================================================
#  4. PRODUCT API
# =============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def product_list(request):
    if request.method == 'GET':
        return Response(ProductSerializer(Product.objects.all(), many=True).data)
    serializer = ProductSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def product_detail(request, pk):
    try:
        product = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(ProductSerializer(product).data)
    if request.method == 'PUT':
        serializer = ProductSerializer(product, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    product.delete()
    return Response({'message': 'Product deleted'}, status=status.HTTP_204_NO_CONTENT)


# =============================================================================
#  5. SALES API
# =============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def sale_list(request):
    if request.method == 'GET':
        return Response(SaleSerializer(Sale.objects.all().order_by('-date'), many=True).data)

    data = request.data.copy()
    if 'user' not in data:
        data['user'] = request.user.id

    serializer = SaleSerializer(data=data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    sale = serializer.save()

    try:
        DailySummary.generate_summary_for_date(sale.date.date())
    except Exception as e:
        traceback.print_exc()
        print(f'⚠️  DailySummary update failed for {sale.date.date()}: {e}')

    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def sale_clear_all(request):
    Sale.objects.all().delete()
    return Response({'message': 'All sales cleared'}, status=status.HTTP_200_OK)


# =============================================================================
#  6. DEBTOR API (✅ WITH PAYMENTHISTORY PRESERVATION)
# =============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def debtor_list(request):
    if request.method == 'GET':
        return Response(DebtorSerializer(Debtor.objects.all(), many=True).data)
    serializer = DebtorSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def debtor_detail(request, pk):
    try:
        debtor = Debtor.objects.get(pk=pk)
    except Debtor.DoesNotExist:
        return Response({'error': 'Debtor not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(DebtorSerializer(debtor).data)

    if request.method == 'PUT':
        try:
            # ✅ Check if this is transitioning from unpaid to paid
            was_unpaid = not debtor.paid
            new_paid   = request.data.get('paid', debtor.paid)
            
            serializer = DebtorSerializer(debtor, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                
                # ✅ Create PaymentHistory when marking as paid
                if was_unpaid and new_paid:
                    paid_date = request.data.get('date_paid', timezone.now().isoformat())
                    
                    # Parse date if it's a string
                    if isinstance(paid_date, str):
                        try:
                            paid_date = datetime.fromisoformat(paid_date).date()
                        except (ValueError, AttributeError):
                            paid_date = timezone.now().date()
                    elif hasattr(paid_date, 'date'):
                        paid_date = paid_date.date()
                    else:
                        paid_date = timezone.now().date()
                    
                    # Collect debtor items
                    items_data = []
                    try:
                        debtor_items = debtor.items.all()
                        items_data = [
                            {
                                'product_name': item.product.name,
                                'quantity': item.quantity,
                                'price': float(item.price),
                            }
                            for item in debtor_items
                        ]
                    except Exception as e:
                        print(f"⚠️ Error serializing debtor items: {e}")
                    
                    # ✅ Create PaymentHistory record
                    payment_history = PaymentHistory.objects.create(
                        debtor_id=debtor.id,
                        customer_name=debtor.name,
                        total_amount=debtor.total_debt,
                        surcharge_amount=debtor.surcharge_amount,
                        paid_date=paid_date,
                        items_json=json.dumps(items_data),
                    )
                    print(f"✅ PaymentHistory #{payment_history.id} created for {debtor.name} on {paid_date}")
                    
                    # ✅ Regenerate DailySummary to include the payment in calendar
                    try:
                        DailySummary.generate_summary_for_date(paid_date)
                        print(f"✅ DailySummary regenerated for {paid_date}")
                    except Exception as e:
                        print(f"⚠️ Failed to regenerate DailySummary: {e}")
                
                return Response(serializer.data)
            print(f'❌ Debtor update validation errors: {serializer.errors}')
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f'❌ Debtor update error: {str(e)}')
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        try:
            debtor_id = debtor.id
            debtor_name = debtor.name
            
            # ✅ CHECK: Verify PaymentHistory exists BEFORE deleting debtor
            payment_history_records = PaymentHistory.objects.filter(debtor_id=debtor_id)
            payment_count = payment_history_records.count()
            
            if payment_count > 0:
                print(f"✅ PaymentHistory found: {payment_count} record(s) for {debtor_name}")
                for ph in payment_history_records:
                    print(f"   - PaymentHistory #{ph.id}: {ph.customer_name} - ₱{ph.total_amount} on {ph.paid_date}")
            
            # ✅ DELETE DEBTOR (PaymentHistory remains - it uses IntegerField not ForeignKey)
            debtor.delete()
            
            print(f"✅ Debtor deleted: {debtor_name} (ID: {debtor_id})")
            print(f"   PaymentHistory records preserved: {payment_count}")
            
            return Response({
                'message': f'Debtor "{debtor_name}" deleted',
                'payment_history_preserved': payment_count
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f'❌ Error deleting debtor: {str(e)}')
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def clear_paid_debtors(request):
    paid  = Debtor.objects.filter(paid=True)
    count = paid.count()
    paid.delete()
    return Response({'message': f'{count} paid debtors cleared', 'count': count})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auto_cleanup_paid_debtors(request):
    # ✅ Records persist for 365 days (PaymentHistory keeps the record)
    cutoff   = timezone.now() - timedelta(days=365)
    old_paid = Debtor.objects.filter(paid=True, date_paid__lte=cutoff)
    count    = old_paid.count()
    if count > 0:
        old_paid.delete()
    return Response({'message': f'{count} old paid debtors auto-deleted', 'count': count})


# =============================================================================
#  7. ACCUMULATED TOTALS API
# =============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def accumulated_totals(request):
    if request.method == 'GET':
        return Response({
            'accumulated_revenue': float(cache.get('accumulated_revenue', 0.0)),
            'accumulated_profit':  float(cache.get('accumulated_profit',  0.0)),
            'last_cleared':        cache.get('last_cleared', None),
        })
    revenue = float(request.data.get('accumulated_revenue', 0))
    profit  = float(request.data.get('accumulated_profit',  0))
    cache.set('accumulated_revenue', revenue, None)
    cache.set('accumulated_profit',  profit,  None)
    cache.set('last_cleared', request.data.get('last_cleared'))
    return Response({'accumulated_revenue': revenue, 'accumulated_profit': profit})


# =============================================================================
#  8. PERIOD TOTALS
# =============================================================================

def _get_period_data(start_date, end_date):
    summaries = DailySummary.objects.filter(
        date__gte=start_date,
        date__lte=end_date,
    )
    revenue = sum(float(s.total_revenue) for s in summaries)
    profit  = sum(float(s.total_profit)  for s in summaries)
    count   = sum(s.transaction_count    for s in summaries)
    return revenue, profit, count


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def period_totals(request):
    try:
        now         = timezone.localtime(timezone.now())
        today       = now.date()
        today_start = now.replace(hour=0,  minute=0,  second=0,      microsecond=0)
        today_end   = now.replace(hour=23, minute=59, second=59, microsecond=999999)

        # Today: always query live Sales (not DailySummary which may be stale)
        today_sales   = Sale.objects.filter(date__gte=today_start, date__lte=today_end)
        today_revenue = float(sum(s.total  for s in today_sales))
        today_profit  = float(sum(s.profit for s in today_sales))
        today_count   = today_sales.count()

        yesterday = today - timedelta(days=1)
        y_revenue, y_profit, y_count = _get_period_data(yesterday, yesterday)

        weekday = today.weekday()
        if weekday == 6:
            last_saturday = today - timedelta(days=1)
        else:
            days_back     = (weekday + 2) % 7 or 7
            last_saturday = today - timedelta(days=days_back)
        last_week_sunday = last_saturday - timedelta(days=6)
        vis_w_start      = last_saturday + timedelta(days=1)
        vis_w_end        = vis_w_start   + timedelta(days=7)
        is_vis_w         = vis_w_start <= today < vis_w_end
        w_rev, w_prof, w_cnt = _get_period_data(last_week_sunday, last_saturday)

        last_month_end   = today.replace(day=1) - timedelta(days=1)
        last_month_start = last_month_end.replace(day=1)
        vis_m_start      = today.replace(day=1)
        vis_m_end        = datetime(
            today.year + 1 if today.month == 12 else today.year,
            1             if today.month == 12 else today.month + 1,
            1,
        ).date()
        is_vis_m         = vis_m_start <= today < vis_m_end
        m_rev, m_prof, m_cnt = _get_period_data(last_month_start, last_month_end)

        last_year   = today.year - 1
        ly_start    = datetime(last_year, 1,  1).date()
        ly_end      = datetime(last_year, 12, 31).date()
        vis_y_start = datetime(today.year,     1, 1).date()
        vis_y_end   = datetime(today.year + 1, 1, 1).date()
        is_vis_y    = vis_y_start <= today < vis_y_end
        y2_rev, y2_prof, y2_cnt = _get_period_data(ly_start, ly_end)

        return Response({
            'today': {
                'revenue':      today_revenue,
                'profit':       today_profit,
                'sales_count':  today_count,
                'has_data':     today_count > 0,
                'period_start': today_start.isoformat(),
                'period_end':   today_end.isoformat(),
            },
            'yesterday': {
                'revenue':      y_revenue,
                'profit':       y_profit,
                'sales_count':  y_count,
                'has_data':     y_count > 0,
                'period_start': yesterday.isoformat(),
                'period_end':   yesterday.isoformat(),
            },
            'last_week': {
                'revenue':          w_rev  if is_vis_w else 0,
                'profit':           w_prof if is_vis_w else 0,
                'sales_count':      w_cnt  if is_vis_w else 0,
                'has_data':         w_cnt > 0 and is_vis_w,
                'period_start':     last_week_sunday.isoformat() if w_cnt else None,
                'period_end':       last_saturday.isoformat()    if w_cnt else None,
                'visibility_start': vis_w_start.isoformat(),
                'visibility_end':   vis_w_end.isoformat(),
            },
            'last_month': {
                'revenue':          m_rev  if is_vis_m else 0,
                'profit':           m_prof if is_vis_m else 0,
                'sales_count':      m_cnt  if is_vis_m else 0,
                'has_data':         m_cnt > 0 and is_vis_m,
                'period_start':     last_month_start.isoformat() if m_cnt else None,
                'period_end':       last_month_end.isoformat()   if m_cnt else None,
                'visibility_start': vis_m_start.isoformat(),
                'visibility_end':   vis_m_end.isoformat(),
            },
            'last_year': {
                'revenue':          y2_rev  if is_vis_y else 0,
                'profit':           y2_prof if is_vis_y else 0,
                'sales_count':      y2_cnt  if is_vis_y else 0,
                'has_data':         y2_cnt > 0 and is_vis_y,
                'period_start':     ly_start.isoformat() if y2_cnt else None,
                'period_end':       ly_end.isoformat()   if y2_cnt else None,
                'visibility_start': vis_y_start.isoformat(),
                'visibility_end':   vis_y_end.isoformat(),
            },
        })
    except Exception as e:
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_periods(request):
    try:
        now       = timezone.now()
        today     = now.date()
        yesterday = today - timedelta(days=1)

        rev, prof, cnt = _get_period_data(yesterday, yesterday)
        PeriodTotals.objects.update_or_create(
            period_type='yesterday',
            defaults={'revenue': rev, 'profit': prof, 'sales_count': cnt,
                      'period_start': yesterday, 'period_end': yesterday},
        )

        if today.weekday() == 6:
            ls = today - timedelta(days=1)
            rev, prof, cnt = _get_period_data(ls - timedelta(days=6), ls)
            PeriodTotals.objects.update_or_create(
                period_type='last_week',
                defaults={'revenue': rev, 'profit': prof, 'sales_count': cnt,
                          'period_start': ls - timedelta(days=6), 'period_end': ls},
            )

        if today.day == 1:
            lme = today - timedelta(days=1)
            rev, prof, cnt = _get_period_data(lme.replace(day=1), lme)
            PeriodTotals.objects.update_or_create(
                period_type='last_month',
                defaults={'revenue': rev, 'profit': prof, 'sales_count': cnt,
                          'period_start': lme.replace(day=1), 'period_end': lme},
            )

        if today.month == 1 and today.day == 1:
            ly = today.year - 1
            rev, prof, cnt = _get_period_data(
                datetime(ly, 1,  1).date(),
                datetime(ly, 12, 31).date(),
            )
            PeriodTotals.objects.update_or_create(
                period_type='last_year',
                defaults={'revenue': rev, 'profit': prof, 'sales_count': cnt,
                          'period_start': datetime(ly, 1,  1).date(),
                          'period_end':   datetime(ly, 12, 31).date()},
            )

        return Response({'message': 'Period totals updated successfully', 'updated_at': now.isoformat()})
    except Exception as e:
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
#  9. CALENDAR / DAILY SUMMARY API (✅ WITH PAYMENTHISTORY)
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def calendar_data(request):
    """
    Get calendar data for a month, including both sales AND payment history.
    ✅ PaymentHistory records persist even if debtor is deleted.
    """
    try:
        year  = int(request.GET.get('year',  datetime.now().year))
        month = int(request.GET.get('month', datetime.now().month))

        # Get sales summaries
        summaries = DailySummary.objects.filter(
            date__year=year,
            date__month=month,
            transaction_count__gt=0,
        ).order_by('date')
        
        # ✅ Get payment history for this month (including deleted debtors)
        payment_data = PaymentHistory.objects.filter(
            paid_date__year=year,
            paid_date__month=month,
        ).values('paid_date').annotate(
            total=Sum('total_amount'),
            count=Count('id')
        )
        
        payment_dict = {str(p['paid_date']): p for p in payment_data}

        result = []
        
        # Process summaries (sales)
        for s in summaries:
            date_str = s.date.strftime('%Y-%m-%d')
            revenue = float(s.total_revenue)
            count = s.transaction_count
            
            # ✅ Add payment history for this date if exists
            if date_str in payment_dict:
                revenue += float(payment_dict[date_str]['total'])
                count += payment_dict[date_str]['count']
            
            result.append({
                'date':              date_str,
                'total_revenue':     revenue,
                'total_profit':      float(s.total_profit),
                'transaction_count': count,
            })
        
        # ✅ Include dates with ONLY payment history (no sales)
        for date_str, payment in payment_dict.items():
            if not any(r['date'] == date_str for r in result):
                result.append({
                    'date':              date_str,
                    'total_revenue':     float(payment['total']),
                    'total_profit':      0,
                    'transaction_count': payment['count'],
                })
        
        # Sort by date
        result.sort(key=lambda x: x['date'])

        return Response({'year': year, 'month': month, 'summaries': result})
    except Exception as e:
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def date_details(request, date_str):
    """
    Get detailed sales + payment history for a specific date.
    ✅ Shows payments from deleted debtors.
    ✅ FIX: Always merges PaymentHistory even when returning from DailySummary cache.
    """
    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()

        # ✅ Always fetch PaymentHistory for this date (persists after debtor deletion)
        payment_history = PaymentHistory.objects.filter(paid_date=target_date)
        debts_paid = []
        for p in payment_history:
            try:    items = json.loads(p.items_json) if p.items_json else []
            except: items = []
            debts_paid.append({
                'id':            p.debtor_id,
                'customer_name': p.customer_name,
                'total_amount':  float(p.total_amount),
                'items':         items,
            })
        extra_revenue = sum(float(p.total_amount) for p in payment_history)
        extra_count   = payment_history.count()

        # Try to get cached DailySummary first
        try:
            ds = DailySummary.objects.get(date=target_date)
            if ds.transaction_count > 0:
                try:    products_list = json.loads(ds.products_sold)
                except: products_list = []

                # ✅ KEY FIX: Merge PaymentHistory into the cached summary response
                return Response({
                    'date':                   date_str,
                    'total_revenue':           float(ds.total_revenue) + extra_revenue,
                    'total_profit':            float(ds.total_profit),
                    'transaction_count':       ds.transaction_count + extra_count,
                    'best_seller_by_quantity': ds.best_seller_by_quantity,
                    'best_seller_quantity':    ds.best_seller_quantity or 0,
                    'best_seller_by_profit':   ds.best_seller_by_profit,
                    'best_seller_profit':      float(ds.best_seller_profit) if ds.best_seller_profit else 0,
                    'products_sold_list':      products_list,
                    'debts_paid':              debts_paid,
                    'source':                  'summary',
                })
            elif extra_count > 0:
                # ✅ Day has no sales but has payment history — return payments only
                return Response({
                    'date':                   date_str,
                    'total_revenue':           extra_revenue,
                    'total_profit':            0,
                    'transaction_count':       extra_count,
                    'best_seller_by_quantity': None,
                    'best_seller_quantity':    0,
                    'best_seller_by_profit':   None,
                    'best_seller_profit':      0,
                    'products_sold_list':      [],
                    'debts_paid':              debts_paid,
                    'source':                  'summary',
                })
        except DailySummary.DoesNotExist:
            pass

        # Query live data
        day_start = datetime.combine(target_date, time.min)
        day_end   = datetime.combine(target_date, time.max)
        if timezone.is_aware(timezone.now()):
            day_start = timezone.make_aware(day_start)
            day_end   = timezone.make_aware(day_end)

        sales             = Sale.objects.filter(date__gte=day_start, date__lte=day_end).prefetch_related('items__product')
        
        total_revenue     = sum(float(s.total)  for s in sales) + extra_revenue
        total_profit      = sum(float(s.profit) for s in sales)
        transaction_count = sales.count() + extra_count

        if transaction_count == 0:
            return Response({
                'date':               date_str,
                'total_revenue':      0,
                'total_profit':       0,
                'transaction_count':  0,
                'products_sold_list': [],
                'debts_paid':         [],
            })

        product_stats = {}
        
        # Process sales items
        for sale in sales:
            for item in sale.items.all():
                name   = item.product.name if item.product else 'Unknown Product'
                qty    = item.quantity
                profit = (float(item.price) - float(item.cost)) * qty
                if name in product_stats:
                    product_stats[name]['quantity'] += qty
                    product_stats[name]['profit']   += profit
                else:
                    product_stats[name] = {'name': name, 'quantity': qty, 'profit': profit}

        # ✅ Add payment history items to product stats
        for payment in payment_history:
            try:
                items = json.loads(payment.items_json) if payment.items_json else []
                for item in items:
                    name = item.get('product_name', 'Payment')
                    qty  = item.get('quantity', 0)
                    if name in product_stats:
                        product_stats[name]['quantity'] += qty
                    else:
                        product_stats[name] = {'name': name, 'quantity': qty, 'profit': 0}
            except Exception as e:
                print(f"⚠️ Error processing payment items: {e}")

        pl  = list(product_stats.values())
        bbq = max(pl, key=lambda x: x['quantity']) if pl else None
        bbp = max(pl, key=lambda x: x['profit'])   if pl else None
        pl.sort(key=lambda x: x['quantity'], reverse=True)

        return Response({
            'date':                   date_str,
            'total_revenue':           total_revenue,
            'total_profit':            total_profit,
            'transaction_count':       transaction_count,
            'best_seller_by_quantity': bbq['name']     if bbq else None,
            'best_seller_quantity':    bbq['quantity'] if bbq else 0,
            'best_seller_by_profit':   bbp['name']     if bbp else None,
            'best_seller_profit':      bbp['profit']   if bbp else 0,
            'products_sold_list':      pl,
            'debts_paid':              debts_paid,
            'source':                  'live',
        })
    except Exception as e:
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_summary(request):
    try:
        if 'date' not in request.data:
            return Response({'error': 'date field is required'}, status=status.HTTP_400_BAD_REQUEST)
        target_date = datetime.strptime(request.data['date'], '%Y-%m-%d').date()
        summary     = DailySummary.generate_summary_for_date(target_date)
        return Response({
            'message': 'Summary generated successfully',
            'summary': {
                'date':              summary.date.strftime('%Y-%m-%d'),
                'total_revenue':     float(summary.total_revenue),
                'total_profit':      float(summary.total_profit),
                'transaction_count': summary.transaction_count,
            },
        })
    except Exception as e:
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cleanup_old_data(request):
    try:
        cutoff           = datetime.now().date() - timedelta(days=365)
        deleted_count, _ = DailySummary.objects.filter(date__lt=cutoff).delete()
        return Response({'message': f'Deleted {deleted_count} old summaries', 'deleted_count': deleted_count})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
#  10. BACKFILL
# =============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def backfill_summaries(request):
    try:
        sale_dates = (
            Sale.objects
            .annotate(sale_date=TruncDate('date'))
            .values_list('sale_date', flat=True)
            .distinct()
        )

        backfilled = []
        for target_date in sale_dates:
            if not target_date:
                continue
            DailySummary.generate_summary_for_date(target_date)
            backfilled.append(str(target_date))

        return Response({
            'message':    f'Backfilled {len(backfilled)} date(s) successfully.',
            'backfilled': backfilled,
            'status':     'success',
        })
    except Exception as e:
        traceback.print_exc()
        return Response({'error': str(e), 'status': 'error'}, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
#  11. TRANSACTION CLEANUP API
# =============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cleanup_old_transactions(request):
    try:
        days_threshold  = max(int(request.data.get('days', 2)), 2)
        now             = timezone.now()
        today           = now.date()
        yesterday       = today - timedelta(days=1)

        cutoff_time     = now - timedelta(days=days_threshold)
        yesterday_start = timezone.make_aware(datetime.combine(yesterday, time.min))
        old_sales       = Sale.objects.filter(date__lt=cutoff_time).filter(date__lt=yesterday_start)

        if not old_sales.exists():
            return Response({
                'message':       'No old transactions to delete (Today and Yesterday are protected)',
                'deleted_count': 0,
                'status':        'success',
            })

        for target_date in set(s.date.date() for s in old_sales):
            if target_date < yesterday:
                DailySummary.generate_summary_for_date(target_date)

        count, breakdown = old_sales.delete()
        return Response({
            'message':           f'Deleted {count} transaction records older than {days_threshold} day(s)',
            'deleted_count':     count,
            'deleted_breakdown': breakdown,
            'status':            'success',
        })
    except Exception as e:
        traceback.print_exc()
        return Response({'error': str(e), 'status': 'error'}, status=status.HTTP_400_BAD_REQUEST)