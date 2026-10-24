from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal
import uuid

class BusinessSetting(models.Model):
    shop_name = models.CharField(max_length=255, default="Sawa Motorcycle Spare Parts POS")
    phone = models.CharField(max_length=50, default="+254 700 000000")
    email = models.EmailField(blank=True, null=True)
    receipt_header = models.TextField(blank=True, default="Thank you for shopping with Sawa POS!")
    receipt_footer = models.TextField(blank=True, default="No returns on electrical parts after 3 days.")
    default_tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00')) # Configurable tax
    currency = models.CharField(max_length=10, default="KES")

    def __str__(self):
        return self.shop_name

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True) # e.g., Spark Plugs, Brake Shoes, Oils
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

class MotorcycleModel(models.Model):
    make = models.CharField(max_length=100) # e.g., Bajaj, TVS, Honda
    model_name = models.CharField(max_length=100) # e.g., Boxer BM 150, Star HLX 125, Ace 110, Discover
    year_range = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"{self.make} {self.model_name}"

class Supplier(models.Model):
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class Product(models.Model):
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, unique=True)
    barcode = models.CharField(max_length=100, blank=True, null=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    compatible_models = models.ManyToManyField(MotorcycleModel, blank=True, related_name='spare_parts')
    cost_price = models.DecimalField(max_digits=12, decimal_places=2)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    wholesale_price = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    stock_quantity = models.IntegerField(default=0)
    low_stock_threshold = models.IntegerField(default=5)
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='supplied_products')
    shelf_location = models.CharField(max_length=100, blank=True, null=True)
    is_taxable = models.BooleanField(default=False) # Flexible tax configuration
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.sku})"

class StockMovement(models.Model):
    MOVEMENT_TYPES = (
        ('RECEIVING', 'Stock Receiving'),
        ('SALE', 'Sale'),
        ('RETURN', 'Return/Refund'),
        ('ADJUSTMENT', 'Stock Adjustment'),
        ('DAMAGE', 'Damaged Goods'),
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='movements')
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES)
    quantity_changed = models.IntegerField() # Positive for stock in, negative for stock out
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2)
    reference_number = models.CharField(max_length=100, blank=True, null=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.movement_type} - {self.product.name} ({self.quantity_changed})"

class PriceHistory(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='price_history')
    old_price = models.DecimalField(max_digits=12, decimal_places=2)
    new_price = models.DecimalField(max_digits=12, decimal_places=2)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    reason = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product.name}: {self.old_price} -> {self.new_price}"

class Sale(models.Model):
    PAYMENT_METHODS = (
        ('CASH', 'Cash'),
        ('MPESA', 'M-Pesa STK Push'),
        ('MIXED', 'Mixed Payment'),
    )
    PAYMENT_STATUS = (
        ('COMPLETED', 'Completed'),
        ('PENDING', 'Pending Verification'),
        ('FAILED', 'Failed'),
    )
    receipt_number = models.CharField(max_length=100, unique=True)
    cashier = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2)
    change_due = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='COMPLETED')
    mpesa_receipt_number = models.CharField(max_length=100, blank=True, null=True)
    mpesa_phone_number = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Receipt #{self.receipt_number} - KES {self.total_amount}"


class MpesaPayment(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PAID = "PAID", "Paid"
        FAILED = "FAILED", "Failed"
        CANCELLED = "CANCELLED", "Cancelled"
        TIMED_OUT = "TIMED_OUT", "Timed out"

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    idempotency_key = models.UUIDField(unique=True)
    request_fingerprint = models.CharField(max_length=64)
    merchant_request_id = models.CharField(max_length=100, blank=True)
    checkout_request_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        unique=True,
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    result_code = models.CharField(max_length=20, blank=True)
    result_description = models.TextField(blank=True)
    callback_result_code = models.CharField(max_length=20, blank=True)
    callback_result_description = models.TextField(blank=True)
    mpesa_receipt_number = models.CharField(max_length=100, blank=True)
    callback_received_at = models.DateTimeField(blank=True, null=True)
    last_status_query_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"M-Pesa {self.public_id} ({self.status})"


class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    product_name_snapshot = models.CharField(max_length=255) # Locked in case product name changes later
    quantity = models.IntegerField()
    unit_price_snapshot = models.DecimalField(max_digits=12, decimal_places=2) # Locked sale price
    unit_cost_snapshot = models.DecimalField(max_digits=12, decimal_places=2) # Locked cost for COGS/Profit
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.quantity}x {self.product_name_snapshot} @ {self.unit_price_snapshot}"

class Expense(models.Model):
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=100) # Rent, Transport, Wages, Utilities, etc.
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - KES {self.amount}"