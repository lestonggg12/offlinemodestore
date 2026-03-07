"""
================================================================================
 urls.py — Updated with Category API routes + Backfill endpoint
================================================================================

 DEPLOYMENT NOTE:
  After first deploying the new views.py, run the backfill once from the
  browser console to generate DailySummary rows for all pre-existing sales:

      fetch('/api/calendar/backfill/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': document.cookie.match(/csrftoken=([^;]+)/)?.[1] || ''
        }
      }).then(r => r.json()).then(console.log);

  Once the calendar shows all historical dates correctly, the backfill
  endpoint can be removed from both this file and views.py.
================================================================================
"""

from django.urls import path
from . import views
from django.views.generic import RedirectView
from django.http import HttpResponse
from django.http import JsonResponse
from django.contrib.staticfiles import finders
from django.http import FileResponse

def health_check(request):
    return JsonResponse({'status': 'ok'})
def favicon(request):
    return HttpResponse(status=204)

def service_worker(request):
    """Serve the service worker from the root scope so it can control all pages."""
    sw_path = finders.find('js/service-worker.js')
    if sw_path:
        return FileResponse(open(sw_path, 'rb'), content_type='application/javascript',
                            headers={'Service-Worker-Allowed': '/'})
    return HttpResponse(status=404)

urlpatterns = [

    path('favicon.ico', favicon),
    path('service-worker.js', service_worker, name='service-worker'),
    # ── Auth & Dashboard ──────────────────────────────────────────────────────
    path('',           views.login_view,     name='login'),
    path('dashboard/', views.dashboard_view, name='dashboard'),
    path('logout/',    views.logout_view,    name='logout'),

    # ── Settings API ──────────────────────────────────────────────────────────
    path('api/get-settings/',  views.get_settings,  name='get-settings'),
    path('api/save-settings/', views.save_settings, name='save-settings'),

    # ── Accumulated Totals ────────────────────────────────────────────────────
    path('api/accumulated-totals/', views.accumulated_totals, name='accumulated-totals'),

    # ── Category API ──────────────────────────────────────────────────────────
    path('api/categories/',          views.category_list,   name='category-list'),
    path('api/categories/<int:pk>/', views.category_detail, name='category-detail'),

    # ── Product API ───────────────────────────────────────────────────────────
    path('api/products/',          views.product_list,   name='product-list'),
    path('api/products/<int:pk>/', views.product_detail, name='product-detail'),

    # ── Sales API ─────────────────────────────────────────────────────────────
    path('api/sales/',       views.sale_list,    name='sale-list'),
    path('api/sales/clear/', views.sale_clear_all, name='sale-clear'),

    # ── Debtor API ────────────────────────────────────────────────────────────
    path('api/debtors/',              views.debtor_list,               name='debtor-list'),
    path('api/debtors/clear-paid/',   views.clear_paid_debtors,        name='clear-paid-debtors'),
    path('api/debtors/auto-cleanup/', views.auto_cleanup_paid_debtors, name='auto-cleanup-paid-debtors'),
    path('api/debtors/<int:pk>/',     views.debtor_detail,             name='debtor-detail'),

    # ── Period Totals API ─────────────────────────────────────────────────────
    path('api/period-totals/',  views.period_totals,  name='period-totals'),
    path('api/update-periods/', views.update_periods, name='update-periods'),

    # ── Calendar & Daily Summary API ──────────────────────────────────────────
    # NOTE: Fixed-path routes (generate, cleanup, backfill) must come BEFORE
    # the <str:date_str> catch-all to avoid URL conflicts.
    path('api/calendar/',                views.calendar_data,    name='calendar-data'),
    path('api/calendar/generate/',       views.generate_summary, name='generate-summary'),
    path('api/calendar/cleanup/',        views.cleanup_old_data, name='cleanup-old-data'),
    path('api/calendar/backfill/',           views.backfill_summaries,        name='backfill-summaries'),
    path('api/calendar/backfill-payments/', views.backfill_payment_history, name='backfill-payments'),
    path('api/calendar/<str:date_str>/', views.date_details,     name='date-details'),

    # ── Transaction Cleanup API ───────────────────────────────────────────────
    path('api/transactions/cleanup-old/', views.cleanup_old_transactions, name='cleanup-old-transactions'),
    path('health/', health_check, name='health'),]