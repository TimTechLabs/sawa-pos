
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    mpesa_callback_view,
    mpesa_payment_status_view,
    mpesa_stk_push_view,
    BusinessSettingViewSet,
)

router = DefaultRouter()
router.register(
    r"settings",
    BusinessSettingViewSet,
    basename="business-settings",
)

urlpatterns = [
    # POS settings endpoints
    path("", include(router.urls)),

    # M-Pesa STK Push
    path(
        "mpesa/stk-push/",
        mpesa_stk_push_view,
        name="mpesa_stk_push",
    ),

    # Safaricom payment callback
    path(
        "mpesa/callback/",
        mpesa_callback_view,
        name="mpesa_callback",
    ),

    # Check the status of an individual payment
    path(
        "mpesa/payments/<uuid:payment_id>/",
        mpesa_payment_status_view,
        name="mpesa_payment_status",
    ),
]
