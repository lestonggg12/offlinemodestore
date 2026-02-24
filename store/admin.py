# store/admin.py

from django.contrib import admin
from .models import Product, Sale, SaleItem, Debtor, DebtorItem
from django.contrib import admin
from .models import (
    Product, Sale, SaleItem, Debtor, DebtorItem, 
    StoreSettings, DailySummary, PeriodTotals  # Add these
)

# ... your existing admin registrations ...

@admin.register(DailySummary)
class DailySummaryAdmin(admin.ModelAdmin):
    list_display = ['date', 'total_revenue', 'total_profit', 'transaction_count', 'best_seller_by_quantity']
    list_filter = ['date']
    search_fields = ['best_seller_by_quantity', 'best_seller_by_profit']
    ordering = ['-date']

@admin.register(PeriodTotals)
class PeriodTotalsAdmin(admin.ModelAdmin):
    list_display = ['period_type', 'revenue', 'profit', 'sales_count', 'period_start', 'period_end', 'last_updated']
    list_filter = ['period_type']
    ordering = ['-last_updated']
@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'cost', 'price', 'quantity', 'profit')
    list_filter = ('category',)
    search_fields = ('name',)
    
    def profit(self, obj):
        return f"₱{obj.price - obj.cost:.2f}"
    profit.short_description = 'Profit per Unit'

class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0

@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ('id', 'date', 'total', 'payment_method', 'user')
    list_filter = ('payment_method', 'date')
    inlines = [SaleItemInline]

class DebtorItemInline(admin.TabularInline):
    model = DebtorItem
    extra = 0

@admin.register(Debtor)
class DebtorAdmin(admin.ModelAdmin):
    list_display = ('name', 'contact', 'total_debt', 'paid', 'date_borrowed')
    list_filter = ('paid',)
    search_fields = ('name', 'contact')
    inlines = [DebtorItemInline]

    from django.contrib import admin
from .models import StoreSettings

@admin.register(StoreSettings)
class StoreSettingsAdmin(admin.ModelAdmin):
    # Only allow one instance to be created
    def has_add_permission(self, request):
        return not StoreSettings.objects.exists()