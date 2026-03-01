"""
================================================================================
 models.py — Updated with customer_name field in Sale model
================================================================================
"""
from django.db import models
from django.contrib.auth.models import User
from datetime import datetime, timedelta
from django.utils import timezone
import re
import secrets


class StoreSettings(models.Model):
    profit_margin   = models.DecimalField(max_digits=5,  decimal_places=2, default=20.00)
    low_stock_limit = models.IntegerField(default=5)
    theme           = models.CharField(max_length=10, default='light')
    debt_surcharge  = models.DecimalField(max_digits=5,  decimal_places=2, default=0.00)
    change_history  = models.TextField(default='[]', blank=True)

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return "Global Store Settings"

    class Meta:
        verbose_name_plural = "Store Settings"


class RememberMeToken(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='remember_tokens')
    token      = models.CharField(max_length=64, unique=True, db_index=True)
    user_agent = models.CharField(max_length=300, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used  = models.DateTimeField(auto_now=True)

    @classmethod
    def create_for_user(cls, user, request):
        token_value = secrets.token_urlsafe(48)
        ua = request.META.get('HTTP_USER_AGENT', '')[:300]
        ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
        if ',' in ip:
            ip = ip.split(',')[0].strip()
        return cls.objects.create(
            user=user,
            token=token_value,
            user_agent=ua,
            ip_address=ip or None,
        )

    def __str__(self):
        return f"Token for {self.user.username}"

    class Meta:
        verbose_name_plural = "Remember Me Tokens"


DEFAULT_CATEGORIES = [
    {'slug': 'beverages',          'name': 'Beverages',                    'icon': '🥤', 'color': 'linear-gradient(135deg, #e3b04b 0%, #d19a3d 100%)', 'is_default': True, 'order': 1},
    {'slug': 'school',             'name': 'School Supplies',              'icon': '📚', 'color': 'linear-gradient(135deg, #d48c2e 0%, #ba7a26 100%)', 'is_default': True, 'order': 2},
    {'slug': 'snacks',             'name': 'Snacks',                       'icon': '🍿', 'color': 'linear-gradient(135deg, #a44a3f 0%, #934635 100%)', 'is_default': True, 'order': 3},
    {'slug': 'foods',              'name': 'Whole Foods',                  'icon': '🍚', 'color': 'linear-gradient(135deg, #967751 0%, #92784f 100%)', 'is_default': True, 'order': 4},
    {'slug': 'bath',               'name': 'Bath, Hygiene & Laundry Soaps','icon': '🧼', 'color': 'linear-gradient(135deg, #f3c291 0%, #e5b382 100%)', 'is_default': True, 'order': 5},
    {'slug': 'wholesale_beverages','name': 'Wholesale Beverages',          'icon': '📦', 'color': 'linear-gradient(135deg, #cc8451 0%, #b87545 100%)', 'is_default': True, 'order': 6},
    {'slug': 'liquor',             'name': 'Hard Liquors',                 'icon': '🍺', 'color': 'linear-gradient(135deg, #e2e8b0 0%, #ced49d 100%)', 'is_default': True, 'order': 7},
]

AUTO_COLORS = [
    'linear-gradient(135deg, #a8c99c 0%, #8ab88a 100%)',
    'linear-gradient(135deg, #7bc4be 0%, #5da8a2 100%)',
    'linear-gradient(135deg, #7ba8c9 0%, #5d8aab 100%)',
    'linear-gradient(135deg, #9a7bc4 0%, #7c5da8 100%)',
    'linear-gradient(135deg, #c97ba8 0%, #ab5d8a 100%)',
    'linear-gradient(135deg, #c9a87b 0%, #ab8a5d 100%)',
    'linear-gradient(135deg, #c4c47b 0%, #a8a85d 100%)',
    'linear-gradient(135deg, #7bc47b 0%, #5da85d 100%)',
]


class Category(models.Model):
    slug       = models.CharField(max_length=100, unique=True)
    name       = models.CharField(max_length=200)
    icon       = models.CharField(max_length=20,  default='📦')
    color      = models.CharField(max_length=300, default='linear-gradient(135deg, #cbdfbd 0%, #a8c99c 100%)')
    is_default = models.BooleanField(default=False)
    order      = models.IntegerField(default=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.icon} {self.name} ({self.slug})"

    class Meta:
        ordering = ['order', 'name']
        verbose_name_plural = "Categories"

    @classmethod
    def seed_defaults(cls):
        created_count = 0
        for data in DEFAULT_CATEGORIES:
            _, created = cls.objects.get_or_create(
                slug=data['slug'],
                defaults={
                    'name':       data['name'],
                    'icon':       data['icon'],
                    'color':      data['color'],
                    'is_default': data['is_default'],
                    'order':      data['order'],
                }
            )
            if created:
                created_count += 1
        return created_count

    @classmethod
    def generate_unique_slug(cls, name: str) -> str:
        base = re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_') or 'category'
        slug = base
        counter = 2
        while cls.objects.filter(slug=slug).exists():
            slug = f"{base}_{counter}"
            counter += 1
        return slug

    @classmethod
    def next_auto_color(cls) -> str:
        count = cls.objects.filter(is_default=False).count()
        return AUTO_COLORS[count % len(AUTO_COLORS)]


class Product(models.Model):
    name       = models.CharField(max_length=200)
    category   = models.CharField(max_length=100)
    cost       = models.DecimalField(max_digits=12, decimal_places=2)
    price      = models.DecimalField(max_digits=12, decimal_places=2)
    quantity   = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['category', 'name']


class Sale(models.Model):
    PAYMENT_CHOICES = [
        ('cash',        'Cash'),
        ('credit',      'Credit'),
        ('credit-paid', 'Credit Paid'),
    ]

    date           = models.DateTimeField(auto_now_add=True)
    total          = models.DecimalField(max_digits=12, decimal_places=2)
    profit         = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES)
    customer_name  = models.CharField(max_length=200, blank=True, default='')
    user           = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        customer_label = f" — {self.customer_name}" if self.customer_name else ""
        return f"Sale {self.id}{customer_label} — ₱{self.total} ({self.payment_method})"

    class Meta:
        ordering = ['-date']


class SaleItem(models.Model):
    sale     = models.ForeignKey(Sale,    on_delete=models.CASCADE, related_name='items')
    product  = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField()
    price    = models.DecimalField(max_digits=12, decimal_places=2)
    cost     = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.quantity}× {self.product.name} @ ₱{self.price}"


class Debtor(models.Model):
    name              = models.CharField(max_length=200)
    contact           = models.CharField(max_length=100, blank=True)
    total_debt        = models.DecimalField(max_digits=12, decimal_places=2)
    date_borrowed     = models.DateTimeField(auto_now_add=True)
    paid              = models.BooleanField(default=False)
    date_paid         = models.DateTimeField(null=True, blank=True)
    original_total    = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    surcharge_percent = models.DecimalField(max_digits=5,  decimal_places=2, default=0)
    surcharge_amount  = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.name} — ₱{self.total_debt} ({'PAID' if self.paid else 'UNPAID'})"

    class Meta:
        ordering = ['paid', '-date_borrowed']


class DebtorItem(models.Model):
    debtor   = models.ForeignKey(Debtor,  on_delete=models.CASCADE, related_name='items')
    product  = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField()
    price    = models.DecimalField(max_digits=12, decimal_places=2)
    cost     = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.quantity}× {self.product.name} for {self.debtor.name}"

# ============================================================================
# ADD THIS TO models.py (after the Debtor model)
# ============================================================================

class PaymentHistory(models.Model):
    """
    Permanent record of all debt payments.
    Created when a debtor is marked as paid.
    Persists after debtor record is deleted (7-365 days later).
    Included in calendar revenue calculations.
    """
    debtor_id       = models.IntegerField()  # Keep reference even if debtor deleted
    customer_name   = models.CharField(max_length=200)
    total_amount    = models.DecimalField(max_digits=12, decimal_places=2)
    surcharge_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_date       = models.DateField(db_index=True)  # When payment was made
    items_json      = models.TextField(blank=True)     # JSON of items paid for
    created_at      = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.customer_name} — ₱{self.total_amount} paid on {self.paid_date}"
    
    class Meta:
        ordering = ['-paid_date']
        indexes = [
            models.Index(fields=['paid_date']),
            models.Index(fields=['customer_name']),
        ]
        verbose_name_plural = "Payment History"

class DailySummary(models.Model):
    date                    = models.DateField(unique=True, db_index=True)
    total_revenue           = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_profit            = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    transaction_count       = models.IntegerField(default=0)
    best_seller_by_quantity = models.CharField(max_length=200, blank=True)
    best_seller_quantity    = models.IntegerField(default=0)
    best_seller_by_profit   = models.CharField(max_length=200, blank=True)
    best_seller_profit      = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    products_sold           = models.TextField(blank=True)
    created_at              = models.DateTimeField(auto_now_add=True)
    updated_at              = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.date} — ₱{self.total_revenue}"

    class Meta:
        ordering = ['-date']
        verbose_name_plural = "Daily Summaries"

    @classmethod
    def cleanup_old_data(cls):
        cutoff = timezone.now().date() - timedelta(days=365)
        deleted_count, _ = cls.objects.filter(date__lt=cutoff).delete()
        return deleted_count

    @classmethod
    def generate_summary_for_date(cls, target_date):
        from django.db.models import Sum
        import json
        from collections import defaultdict

        sales = Sale.objects.filter(date__date=target_date)
        if not sales.exists():
            summary, _ = cls.objects.get_or_create(
                date=target_date,
                defaults={'total_revenue': 0, 'total_profit': 0,
                          'transaction_count': 0, 'products_sold': '[]'}
            )
            return summary

        total_revenue     = sales.aggregate(Sum('total'))['total__sum']  or 0
        total_profit      = sales.aggregate(Sum('profit'))['profit__sum'] or 0
        transaction_count = sales.count()

        sale_items         = SaleItem.objects.filter(sale__date__date=target_date)
        product_quantities = defaultdict(int)
        product_profits    = defaultdict(float)

        for item in sale_items:
            name = item.product.name
            product_quantities[name] += item.quantity
            product_profits[name]    += float((item.price - item.cost) * item.quantity)

        best_by_qty    = max(product_quantities.items(), key=lambda x: x[1]) if product_quantities else ('', 0)
        best_by_profit = max(product_profits.items(),    key=lambda x: x[1]) if product_profits    else ('', 0)

        products_list = [
            {'name': n, 'quantity': q, 'profit': round(product_profits.get(n, 0), 2)}
            for n, q in sorted(product_quantities.items(), key=lambda x: -x[1])
        ]

        summary, _ = cls.objects.update_or_create(
            date=target_date,
            defaults={
                'total_revenue':           total_revenue,
                'total_profit':            total_profit,
                'transaction_count':       transaction_count,
                'best_seller_by_quantity': best_by_qty[0],
                'best_seller_quantity':    best_by_qty[1],
                'best_seller_by_profit':   best_by_profit[0],
                'best_seller_profit':      best_by_profit[1],
                'products_sold':           json.dumps(products_list),
            }
        )
        return summary


class PeriodTotals(models.Model):
    PERIOD_CHOICES = [
        ('yesterday',  'Yesterday'),
        ('last_week',  'Last Week'),
        ('last_month', 'Last Month'),
        ('last_year',  'Last Year'),
    ]

    period_type  = models.CharField(max_length=20, choices=PERIOD_CHOICES, unique=True)
    revenue      = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    profit       = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sales_count  = models.IntegerField(default=0)
    period_start = models.DateField(null=True, blank=True)
    period_end   = models.DateField(null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.get_period_type_display()} — ₱{self.revenue}"

    class Meta:
        verbose_name_plural = "Period Totals"