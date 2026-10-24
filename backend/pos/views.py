
import base64
import logging
import re
import uuid
from datetime import datetime
from decimal import Decimal, InvalidOperation
from urllib.parse import urlparse

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import MpesaPayment


logger = logging.getLogger(__name__)
from rest_framework import viewsets
from .models import BusinessSetting
from .serializers import BusinessSettingSerializer

class BusinessSettingViewSet(viewsets.ModelViewSet):
    queryset = BusinessSetting.objects.all()
    serializer_class = BusinessSettingSerializer

def normalize_mpesa_phone(value):
    """Convert a Kenyan phone number to 2547XXXXXXXX format."""
    if not value:
        raise ValueError("Phone number is required.")

    phone = re.sub(r"[\s()+-]", "", str(value))

    if phone.startswith("0"):
        phone = "+254" + phone[1:]
    elif phone.startswith("7") or phone.startswith("1"):
        phone = "+254" + phone

    if not re.fullmatch(r"254[17]\d{8}", phone):
        raise ValueError(
            "Enter a valid Kenyan Safaricom phone number, "
            "for example 0712345678."
        )

    return phone


def mpesa_base_url():
    environment = getattr(
        settings, "MPESA_ENVIRONMENT", "sandbox"
    ).lower()

    if environment == "production":
        return "https://api.safaricom.co.ke"

    return "https://sandbox.safaricom.co.ke"


def get_mpesa_access_token():
    consumer_key = getattr(settings, "MPESA_CONSUMER_KEY", "")
    consumer_secret = getattr(settings, "MPESA_CONSUMER_SECRET", "")

    if not consumer_key or not consumer_secret:
        raise RuntimeError("M-Pesa API credentials are not configured.")

    response = requests.get(
        f"{mpesa_base_url()}/oauth/v1/generate",
        params={"grant_type": "client_credentials"},
        auth=(consumer_key, consumer_secret),
        timeout=30,
    )
    response.raise_for_status()

    token = response.json().get("access_token")
    if not token:
        raise RuntimeError("Safaricom did not return an access token.")

    return token


def mpesa_password_and_timestamp():
    shortcode = str(getattr(settings, "MPESA_SHORTCODE", ""))
    passkey = getattr(settings, "MPESA_PASSKEY", "")

    if not shortcode or not passkey:
        raise RuntimeError("M-Pesa shortcode or passkey is not configured.")

    timestamp = timezone.localtime().strftime("%Y%m%d%H%M%S")
    raw = f"{shortcode}{passkey}{timestamp}"
    password = base64.b64encode(raw.encode("utf-8")).decode("utf-8")

    return password, timestamp


def validate_callback_url():
    callback_url = getattr(settings, "MPESA_CALLBACK_URL", "")

    if not callback_url:
        raise RuntimeError("MPESA_CALLBACK_URL is not configured.")

    parsed = urlparse(callback_url)

    if parsed.scheme != "https" or not parsed.netloc:
        raise RuntimeError(
            "MPESA_CALLBACK_URL must be a publicly accessible HTTPS URL."
        )

    return callback_url


def payment_response(payment):
    """Return safe payment information to the frontend."""
    return {
        "success": True,
        "payment_id": str(payment.public_id),
        "status": payment.status,
        "amount": str(payment.amount),
        "checkout_request_id": payment.checkout_request_id,
        "merchant_request_id": payment.merchant_request_id,
        "receipt_number": payment.mpesa_receipt_number,
        "message": payment.result_description or "",
    }


def query_mpesa_payment(payment, force=False):
    """Ask Safaricom for the current status of an initiated STK request."""
    if not payment.checkout_request_id:
        return payment

    if (
        payment.status != MpesaPayment.Status.PENDING
        and not force
    ):
        return payment

    try:
        token = get_mpesa_access_token()
        password, timestamp = mpesa_password_and_timestamp()
        shortcode = str(settings.MPESA_SHORTCODE)

        payload = {
            "BusinessShortCode": shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": payment.checkout_request_id,
        }

        response = requests.post(
            f"{mpesa_base_url()}/mpesa/stkpushquery/v1/query",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()

        result_code = data.get("ResultCode")
        result_description = data.get("ResultDesc", "")

        payment.last_status_query_at = timezone.now()

        if result_code is not None:
            code = str(result_code)
            payment.result_code = code
            payment.result_description = result_description

            if code == "0":
                payment.status = MpesaPayment.Status.PAID
            elif code == "1032":
                payment.status = MpesaPayment.Status.CANCELLED
            elif code == "1037":
                payment.status = MpesaPayment.Status.TIMED_OUT
            else:
                payment.status = MpesaPayment.Status.FAILED

        payment.save(
            update_fields=[
                "last_status_query_at",
                "result_code",
                "result_description",
                "status",
                "updated_at",
            ]
        )

    except Exception:
        logger.exception(
            "Could not query Safaricom payment status for %s",
            payment.checkout_request_id,
        )

    return payment


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mpesa_stk_push_view(request):
    """Initiate an M-Pesa STK Push."""
    raw_phone = request.data.get("phone") or request.data.get("phone_number")
    raw_amount = request.data.get("amount")

    try:
        phone = normalize_mpesa_phone(raw_phone)
    except ValueError as exc:
        return Response(
            {"success": False, "error": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        amount_decimal = Decimal(str(raw_amount))
        if (
            not amount_decimal.is_finite()
            or amount_decimal != amount_decimal.to_integral_value()
            or amount_decimal < 1
        ):
            raise ValueError
        amount = int(amount_decimal)
    except (InvalidOperation, TypeError, ValueError):
        return Response(
            {
                "success": False,
                "error": "Amount must be a positive whole number.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    raw_key = (
        request.data.get("idempotency_key")
        or request.headers.get("Idempotency-Key")
    )

    if raw_key:
        try:
            idempotency_key = uuid.UUID(str(raw_key))
        except (TypeError, ValueError, AttributeError):
            return Response(
                {
                    "success": False,
                    "error": "idempotency_key must be a valid UUID.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
    else:
        idempotency_key = uuid.uuid4()

    # A key must identify one payment attempt and its original details.
    fingerprint = f"{phone}:{amount}"

    with transaction.atomic():
        existing = (
            MpesaPayment.objects.select_for_update()
            .filter(idempotency_key=idempotency_key)
            .first()
        )

        if existing:
            if existing.request_fingerprint != fingerprint:
                return Response(
                    {
                        "success": False,
                        "error": (
                            "This idempotency key was already used "
                            "with different payment details."
                        ),
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            if existing.checkout_request_id:
                return Response(
                    payment_response(existing),
                    status=status.HTTP_200_OK,
                )

            if existing.status != MpesaPayment.Status.PENDING:
                return Response(
                    payment_response(existing),
                    status=status.HTTP_200_OK,
                )

            # A record without a checkout ID may represent an interrupted
            # request. Do not blindly submit it again and risk a duplicate.
            return Response(
                {
                    "success": False,
                    "error": (
                        "This payment attempt is still being processed. "
                        "Check its status before trying again."
                    ),
                    "payment_id": str(existing.public_id),
                },
                status=status.HTTP_409_CONFLICT,
            )

        try:
            payment = MpesaPayment.objects.create(
                idempotency_key=idempotency_key,
                request_fingerprint=fingerprint,
                amount=Decimal(amount),
                status=MpesaPayment.Status.PENDING,
            )
        except Exception:
            logger.exception("Could not create M-Pesa payment record.")
            return Response(
                {
                    "success": False,
                    "error": "Could not create the payment record.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    try:
        callback_url = validate_callback_url()
        token = get_mpesa_access_token()
        password, timestamp = mpesa_password_and_timestamp()
        shortcode = str(settings.MPESA_SHORTCODE)

        payload = {
            "BusinessShortCode": shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": getattr(
                settings,
                "MPESA_TRANSACTION_TYPE",
                "CustomerPayBillOnline",
            ),
            "Amount": amount,
            "PartyA": phone,
            "PartyB": shortcode,
            "PhoneNumber": phone,
            "CallBackURL": callback_url,
            "AccountReference": getattr(
                settings, "MPESA_ACCOUNT_REFERENCE", "SAWAPOS"
            ),
            "TransactionDesc": "Sawa POS payment",
        }

        response = requests.post(
            f"{mpesa_base_url()}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()

        if (
            str(data.get("ResponseCode")) != "0"
            or not data.get("CheckoutRequestID")
        ):
            description = (
                data.get("errorMessage")
                or data.get("ResponseDescription")
                or "Safaricom rejected the STK Push request."
            )
            payment.status = MpesaPayment.Status.FAILED
            payment.result_description = description
            payment.save(
                update_fields=["status", "result_description", "updated_at"]
            )
            return Response(
                {"success": False, "error": description},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment.checkout_request_id = data["CheckoutRequestID"]
        payment.merchant_request_id = data.get("MerchantRequestID")
        payment.result_description = data.get(
            "ResponseDescription", "STK Push initiated. Awaiting payment."
        )
        payment.save(
            update_fields=[
                "checkout_request_id",
                "merchant_request_id",
                "result_description",
                "updated_at",
            ]
        )

        result = payment_response(payment)
        result["message"] = "STK Push sent. Awaiting customer confirmation."
        return Response(result, status=status.HTTP_202_ACCEPTED)

    except requests.RequestException:
        logger.exception("Network error while initiating M-Pesa STK Push.")

        # The request may have reached Safaricom even if the response was
        # lost. Do not automatically submit another STK request.
        payment.result_description = (
            "The request outcome is uncertain. Check payment status "
            "before retrying."
        )
        payment.save(update_fields=["result_description", "updated_at"])

        return Response(
            {
                "success": False,
                "error": payment.result_description,
                "payment_id": str(payment.public_id),
            },
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except Exception:
        logger.exception("Unexpected error while initiating M-Pesa payment.")
        return Response(
            {
                "success": False,
                "error": (
                    "Could not initiate the payment. Check the server logs "
                    "and M-Pesa configuration."
                ),
                "payment_id": str(payment.public_id),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def mpesa_callback_view(request):
    """Receive the asynchronous payment result from Safaricom."""
    try:
        callback = request.data["Body"]["stkCallback"]
        checkout_id = callback["CheckoutRequestID"]
        result_code = str(callback["ResultCode"])
        description = callback.get("ResultDesc", "")

        with transaction.atomic():
            payment = (
                MpesaPayment.objects.select_for_update()
                .filter(checkout_request_id=checkout_id)
                .first()
            )

            if not payment:
                logger.warning(
                    "M-Pesa callback received for unknown checkout ID %s",
                    checkout_id,
                )
                return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

            payment.callback_received_at = timezone.now()
            payment.callback_result_code = result_code
            payment.callback_result_description = description
            payment.result_code = result_code
            payment.result_description = description

            if result_code == "0":
                payment.status = MpesaPayment.Status.PAID

                items = callback.get("CallbackMetadata", {}).get("Item", [])
                metadata = {
                    item.get("Name"): item.get("Value")
                    for item in items
                    if isinstance(item, dict) and item.get("Name")
                }

                receipt = metadata.get("MpesaReceiptNumber")
                if receipt:
                    payment.mpesa_receipt_number = str(receipt)

            elif result_code == "1032":
                payment.status = MpesaPayment.Status.CANCELLED
            elif result_code == "1037":
                payment.status = MpesaPayment.Status.TIMED_OUT
            else:
                payment.status = MpesaPayment.Status.FAILED

            payment.save(
                update_fields=[
                    "callback_received_at",
                    "callback_result_code",
                    "callback_result_description",
                    "result_code",
                    "result_description",
                    "status",
                    "mpesa_receipt_number",
                    "updated_at",
                ]
            )

        return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

    except (KeyError, TypeError, ValueError):
        logger.exception("Invalid M-Pesa callback payload.")
        # Return a response to avoid endless retries on malformed callbacks.
        return Response({"ResultCode": 0, "ResultDesc": "Received"})

    except Exception:
        logger.exception("Could not process M-Pesa callback.")
        return Response(
            {"ResultCode": 1, "ResultDesc": "Callback processing failed"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def mpesa_payment_status_view(request, payment_id):
    """Retrieve the current status of a payment using its public ID."""
    payment = MpesaPayment.objects.filter(public_id=payment_id).first()

    if not payment:
        return Response(
            {"success": False, "error": "Payment not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if payment.status == MpesaPayment.Status.PENDING:
        query_mpesa_payment(payment)

    return Response(payment_response(payment), status=status.HTTP_200_OK)
