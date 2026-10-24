
from django.urls import path

from .views import (
    mpesa_callback,
    payment_status,
    stk_push,
)

urlpatterns = [
    path("stk-push/", stk_push, name="mpesa-stk-push"),
    path(
        "callback/",
        mpesa_callback,
        name="mpesa-callback",
    ),
    path(
        "status/<uuid:payment_id>/",
        payment_status,
        name="mpesa-payment-status",
    ),
]
