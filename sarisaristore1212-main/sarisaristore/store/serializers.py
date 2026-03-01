"""
================================================================================
 serializers.py — Django REST Framework Serializers
================================================================================

 CHANGES: Added CategorySerializer & improved DebtorSerializer for updates.
================================================================================
"""

from rest_framework import serializers
import json

from .models import (
    Category, Product, Sale, SaleItem,
    Debtor, DebtorItem, DailySummary, PeriodTotals,
)


# =============================================================================
#  CATEGORY
# =============================================================================

class CategorySerializer(serializers.ModelSerializer):
    """Full CRUD serializer for Category."""
    product_count = serializers.SerializerMethodField()

    class Meta:
        model  = Category
        fields = ['id', 'slug', 'name', 'icon', 'color', 'is_default', 'order', 'created_at', 'product_count']
        read_only_fields = ['id', 'created_at', 'product_count']

    def get_product_count(self, obj):
        return Product.objects.filter(category=obj.slug).count()


# =============================================================================
#  PERIOD TOTALS
# =============================================================================

class PeriodTotalsSerializer(serializers.ModelSerializer):
    period_name = serializers.CharField(source='get_period_type_display', read_only=True)

    class Meta:
        model  = PeriodTotals
        fields = ['id', 'period_type', 'period_name', 'revenue', 'profit',
                  'sales_count', 'period_start', 'period_end', 'last_updated']


# =============================================================================
#  PRODUCT
# =============================================================================

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Product
        fields = '__all__'


# =============================================================================
#  SALE  &  SALE ITEM
# =============================================================================

class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_id   = serializers.IntegerField(write_only=True, required=False)
    cost         = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)

    class Meta:
        model  = SaleItem
        fields = ['id', 'product', 'product_id', 'product_name', 'quantity', 'price', 'cost']
        extra_kwargs = {'product': {'required': False}}


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, required=False)

    class Meta:
        model  = Sale
        fields = ['id', 'date', 'total', 'profit', 'payment_method', 'customer_name', 'user', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        sale = Sale.objects.create(**validated_data)
        for item_data in items_data:
            product_id = item_data.get('product_id') or item_data.get('product')
            if product_id:
                SaleItem.objects.create(
                    sale=sale,
                    product_id=product_id,
                    quantity=item_data.get('quantity', 0),
                    price=item_data.get('price', 0),
                    cost=item_data.get('cost', 0),
                )
        return sale


# =============================================================================
#  DEBTOR  &  DEBTOR ITEM
# =============================================================================

class DebtorItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_id   = serializers.IntegerField(write_only=True, required=False)
    cost         = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)

    class Meta:
        model  = DebtorItem
        fields = ['id', 'product', 'product_id', 'product_name', 'quantity', 'price', 'cost']
        extra_kwargs = {'product': {'required': False}}


class DebtorSerializer(serializers.ModelSerializer):
    items             = DebtorItemSerializer(many=True, required=False)
    original_total    = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    surcharge_percent = serializers.DecimalField(max_digits=5,  decimal_places=2, required=False, default=0)
    surcharge_amount  = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)

    class Meta:
        model  = Debtor
        fields = ['id', 'name', 'contact', 'total_debt', 'original_total',
                  'surcharge_percent', 'surcharge_amount', 'date_borrowed',
                  'paid', 'date_paid', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        name = validated_data.get('name')
        debtor = Debtor.objects.filter(name=name, paid=False).first()
        if debtor:
            debtor.total_debt += validated_data.get('total_debt', 0)
            if 'original_total'   in validated_data: debtor.original_total   += validated_data['original_total']
            if 'surcharge_amount' in validated_data: debtor.surcharge_amount += validated_data['surcharge_amount']
            debtor.save()
        else:
            debtor = Debtor.objects.create(**validated_data)
        for item_data in items_data:
            product_id = item_data.get('product_id') or item_data.get('product')
            if product_id:
                DebtorItem.objects.create(
                    debtor=debtor, product_id=product_id,
                    quantity=item_data.get('quantity', 0),
                    price=item_data.get('price', 0),
                    cost=item_data.get('cost', 0),
                )
        return debtor

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        
        # Only update fields that are explicitly provided
        if 'name' in validated_data:
            instance.name = validated_data['name']
        if 'contact' in validated_data:
            instance.contact = validated_data['contact']
        if 'total_debt' in validated_data:
            instance.total_debt = validated_data['total_debt']
        if 'paid' in validated_data:
            instance.paid = validated_data['paid']
        if 'date_paid' in validated_data:
            instance.date_paid = validated_data['date_paid']
        if 'original_total' in validated_data:
            instance.original_total = validated_data['original_total']
        if 'surcharge_percent' in validated_data:
            instance.surcharge_percent = validated_data['surcharge_percent']
        if 'surcharge_amount' in validated_data:
            instance.surcharge_amount = validated_data['surcharge_amount']
        
        instance.save()
        
        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                product_id = item_data.get('product_id') or item_data.get('product')
                if product_id:
                    DebtorItem.objects.create(
                        debtor=instance, product_id=product_id,
                        quantity=item_data.get('quantity', 0),
                        price=item_data.get('price', 0),
                        cost=item_data.get('cost', 0),
                    )
        return instance

"""
PASTE THIS INTO serializers.py
Location: After the DebtorSerializer class (around line 140-150)
         Before the DailySummarySerializer class
"""

# ============================================================================
# ADD THIS IMPORT AT THE TOP (if not already there)
# ============================================================================
# In the imports section, add PaymentHistory to the from .models import:

from .models import (
    Category, Product, Sale, SaleItem,
    Debtor, DebtorItem, DailySummary, PeriodTotals,
    PaymentHistory,  # ← ADD THIS LINE
)


# ============================================================================
# ADD THIS SERIALIZER (after DebtorSerializer, before DailySummarySerializer)
# ============================================================================

class PaymentHistorySerializer(serializers.ModelSerializer):
    """Serializer for permanent payment history records."""
    
    class Meta:
        model  = PaymentHistory
        fields = [
            'id', 'debtor_id', 'customer_name', 'total_amount',
            'surcharge_amount', 'paid_date', 'items_json', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


# ============================================================================
# THEN THE EXISTING DailySummarySerializer continues as before...
# ============================================================================

class DailySummarySerializer(serializers.ModelSerializer):
    products_sold_list = serializers.SerializerMethodField()

    class Meta:
        model  = DailySummary
        fields = ['id', 'date', 'total_revenue', 'total_profit', 'transaction_count',
                  'best_seller_by_quantity', 'best_seller_quantity',
                  'best_seller_by_profit', 'best_seller_profit', 'products_sold_list']

    def get_products_sold_list(self, obj):
        try:
            return json.loads(obj.products_sold) if obj.products_sold else []
        except (json.JSONDecodeError, TypeError):
            return []
# =============================================================================
#  DAILY SUMMARY
# =============================================================================

class DailySummarySerializer(serializers.ModelSerializer):
    products_sold_list = serializers.SerializerMethodField()

    class Meta:
        model  = DailySummary
        fields = ['id', 'date', 'total_revenue', 'total_profit', 'transaction_count',
                  'best_seller_by_quantity', 'best_seller_quantity',
                  'best_seller_by_profit', 'best_seller_profit', 'products_sold_list']

    def get_products_sold_list(self, obj):
        try:
            return json.loads(obj.products_sold) if obj.products_sold else []
        except (json.JSONDecodeError, TypeError):
            return []