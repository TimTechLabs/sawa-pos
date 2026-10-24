from django.db import models

# Create your models here.

import uuid

from django.db import models


class MpesaPayment(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PAID = "PAID", "Paid"
        CANCELLED = "CANCELLED", "Cancelled"
        FAILED = "FAILED", "Failed"

    # Public identifier used by the frontend to check payment status.
    public_id = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
    )

    # Prevents the same frontend payment attempt from being created twice.
    idempotency_key = models.UUIDField(unique=True)

    phone_number = models.CharField(max_length=15)
    amount = models.PositiveIntegerField()

    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    merchant_request_id = models.CharField(
        max_length=100,
        blank=True,
        default="",
    )
    checkout_request_id = models.CharField(
        max_length=100,
        blank=True,
        default="",
        db_index=True,
    )

    result_code = models.IntegerField(null=True, blank=True)
    result_description = models.TextField(blank=True, default="")
    mpesa_receipt_number = models.CharField(
        max_length=50,
        blank=True,
        default="",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return (
            f"{self.phone_number} - KSh {self.amount} - "
            f"{self.status}"
        )
