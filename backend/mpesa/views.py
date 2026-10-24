
import base64
import logging
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from uuid import UUID

import requests

from django.conf import settings
from django.db import IntegrityError, transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import MpesaPayment


logger = logging.getLogger(__name__)

REQUEST_TIMEOUT = 30


def normalize_phone(value):
    """Convert common Kenyan phone formats to 2547XXXXXXXX."""
    if not value:
        return None

    phone = re.sub(r"[\s\-()+]", "", str(value))

    if phone.startswith("0") and len(phone) == 10:
        phone = "+254" + phone[1:]
    elif phone.startswith("7") and len(phone) == 9:
        phone = "+254" + phone
    elif phone.startswith("1") and len(phone) == 9:
        phone = "+254" + phone
    elif phone.startswith("254") and len(phone) == 12:
        pass
    else:
        return None

    if not re.fullmatch(r"254[17]\d{8}", phone):
        return None

    return phone


def mpesa_base_url():
    environment = getattr(
        settings, "MPESA_ENVIRONMENT", "sandbox"
    ).lower()

    if environment == "sandbox":
        return "https://sandbox.safaricom.co.ke"
    if environment == "production":
        return "https://api.safaricom.co.ke"

    raise ValueError("MPESA_ENVIRONMENT must be sandbox or production.")


def get_mpesa_access_token():
    consumer_key = getattr(settings, "MPESA_CONSUMER_KEY", "")
    consumer_secret = getattr(settings, "MPESA_CONSUMER_SECRET", "")

    if not consumer_key or not consumer_secret:
        raise ValueError("Daraja consumer credentials are not configured.")

    credentials = f"{consumer_key}:{consumer_secret}".encode("utf-8")
    encoded_credentials = base64.b64encode(credentials).decode("utf-8")

    response = requests.get(
        f"{mpesa_base_url()}/oauth/v1/generate?grant_type=client_credentials",
        headers={
            "Authorization": f"Basic {encoded_credentials}",
        },
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()

    data = response.json()
    token = data.get("access_token")

    if not token:
        raise ValueError("Daraja did not return an access token.")

    return token


def make_stk_password(shortcode, passkey, timestamp):
    raw = f"{shortcode}{passkey}{timestamp}".encode("utf-8")
    return base64.b64encode(raw).decode("utf-8")


def get_callback_url():
    callback_url = getattr(settings, "MPESA_CALLBACK_URL", "").strip()

    if not callback_url.startswith("https://"):
        raise ValueError(
            "MPESA_CALLBACK_URL must be a public HTTPS URL."
        )

    return callback_url


@api_view(["POST"])
@permission_classes([AllowAny])
def stk_push(request):
    """
    Start an STK Push.

    Expected JSON:
    {
        "phone": "0712345678",
        "amount": 10,
        "idempotency_key": "a-unique-uuid"
    }
    """
    raw_phone = request.data.get("phone") or request.data.get("phone_number")
    phone = normalize_phone(raw_phone)

    if not phone:
        return Response(
            {"success": False, "error": "Enter a valid Kenyan M-Pesa number."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        amount_decimal = Decimal(str(request.data.get("amount", "")))
        if (
            not amount_decimal.is_finite()
            or amount_decimal != amount_decimal.to_integral_value()
        ):
            raise InvalidOperation
        amount = int(amount_decimal)
    except (InvalidOperation, TypeError, ValueError):
        return Response(
            {"success": False, "error": "Amount must be a whole number."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if amount < 1:
        return Response(
            {"success": False, "error": "Amount must be at least KSh 1."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    raw_key = (
        request.data.get("idempotency_key")
        or request.headers.get("Idempotency-Key")
    )

    try:
        idempotency_key = UUID(str(raw_key))
    except (TypeError, ValueError, AttributeError):
        return Response(
            {
                "success": False,
                "error": "A valid idempotency_key UUID is required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Reuse an existing attempt for this key instead of charging twice.
    existing = MpesaPayment.objects.filter(
        idempotency_key=idempotency_key
    ).first()

    if existing:
        if existing.phone_number != phone or existing.amount != amount:
            return Response(
                {
                    "success": False,
                    "error": (
                        "This idempotency key was already used for a "
                        "different phone number or amount."
                    ),
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {
                "success": True,
                "message": "Existing payment attempt returned.",
                "payment_id": str(existing.public_id),
                "status": existing.status.lower(),
                "CheckoutRequestID": existing.checkout_request_id,
            },
            status=status.HTTP_200_OK,
        )

    shortcode = str(getattr(settings, "MPESA_SHORTCODE", "")).strip()
    passkey = getattr(settings, "MPESA_PASSKEY", "").strip()

    if not shortcode or not passkey:
        return Response(
            {
                "success": False,
                "error": "Daraja shortcode or passkey is not configured.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    try:
        callback_url = get_callback_url()
        token = get_mpesa_access_token()

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        password = make_stk_password(shortcode, passkey, timestamp)

        payload = {
            "BusinessShortCode": shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount,
            "PartyA": phone,
            "PartyB": shortcode,
            "PhoneNumber": phone,
            "CallBackURL": callback_url,
            "AccountReference": "SAWAPOS",
            "TransactionDesc": "Sawa POS payment",
        }

        # Create the record before calling Safaricom.
        try:
            with transaction.atomic():
                payment = MpesaPayment.objects.create(
                    idempotency_key=idempotency_key,
                    phone_number=phone,
                    amount=amount,
                    status=MpesaPayment.Status.PENDING,
                )
        except IntegrityError:
            payment = MpesaPayment.objects.get(
                idempotency_key=idempotency_key
            )
            return Response(
                {
                    "success": True,
                    "message": "Existing payment attempt returned.",
                    "payment_id": str(payment.public_id),
                    "status": payment.status.lower(),
                    "CheckoutRequestID": payment.checkout_request_id,
                },
                status=status.HTTP_200_OK,
            )

        response = requests.post(
            f"{mpesa_base_url()}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=REQUEST_TIMEOUT,
        )

        try:
            data = response.json()
        except ValueError:
            data = {}

        if not response.ok:
            payment.status = MpesaPayment.Status.FAILED
            payment.result_description = (
                data.get("errorMessage")
                or data.get("errorCode")
                or "Daraja rejected the STK Push request."
            )
            payment.save(
                update_fields=[
                    "status",
                    "result_description",
                    "updated_at",
                ]
            )

            return Response(
                {
                    "success": False,
                    "payment_id": str(payment.public_id),
                    "status": payment.status.lower(),
                    "error": payment.result_description,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if str(data.get("ResponseCode")) != "0":
            payment.status = MpesaPayment.Status.FAILED
            payment.result_description = (
                data.get("ResponseDescription")
                or data.get("errorMessage")
                or "Safaricom did not accept the STK Push request."
            )
            payment.save(
                update_fields=[
                    "status",
                    "result_description",
                    "updated_at",
                ]
            )

            return Response(
                {
                    "success": False,
                    "payment_id": str(payment.public_id),
                    "status": payment.status.lower(),
                    "error": payment.result_description,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        checkout_id = data.get("CheckoutRequestID")
        merchant_id = data.get("MerchantRequestID")

        if not checkout_id:
            payment.status = MpesaPayment.Status.FAILED
            payment.result_description = (
                "Daraja accepted the request but returned no checkout ID."
            )
            payment.save(
                update_fields=[
                    "status",
                    "result_description",
                    "updated_at",
                ]
            )
            return Response(
                {
                    "success": False,
                    "payment_id": str(payment.public_id),
                    "error": payment.result_description,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        payment.checkout_request_id = checkout_id
        payment.merchant_request_id = merchant_id or ""
        payment.result_description = (
            data.get("CustomerMessage")
            or data.get("ResponseDescription")
            or "STK Push sent. Waiting for customer payment."
        )
        payment.save(
            update_fields=[
                "checkout_request_id",
                "merchant_request_id",
                "result_description",
                "updated_at",
            ]
        )

        return Response(
            {
                "success": True,
                "message": "STK Push sent. Check the customer's phone.",
                "payment_id": str(payment.public_id),
                "status": "pending",
                "CheckoutRequestID": checkout_id,
                "CustomerMessage": payment.result_description,
            },
            status=status.HTTP_202_ACCEPTED,
        )

    except requests.RequestException:
        logger.exception("Network error communicating with Daraja.")
        return Response(
            {
                "success": False,
                "error": (
                    "Could not communicate with Safaricom. "
                    "Check the backend internet connection and Daraja service."
                ),
            },
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except (ValueError, KeyError):
        logger.exception("M-Pesa configuration or response error.")
        return Response(
            {
                "success": False,
                "error": (
                    "M-Pesa configuration or response is invalid. "
                    "Check the backend configuration and logs."
                ),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@csrf_exempt
@require_POST
def mpesa_callback(request):
    """Receive the transaction result posted by Safaricom."""
    import json

    try:
        body = json.loads(request.body.decode("utf-8"))
        callback = body["Body"]["stkCallback"]
        checkout_id = callback["CheckoutRequestID"]
        result_code = int(callback["ResultCode"])
        result_description = callback.get("ResultDesc", "")
    except (ValueError, KeyError, TypeError):
        logger.warning("Invalid M-Pesa callback payload.")
        return JsonResponse(
            {"ResultCode": 1, "ResultDesc": "Invalid callback payload"},
            status=400,
        )

    payment = MpesaPayment.objects.filter(
        checkout_request_id=checkout_id
    ).first()

    if not payment:
        logger.warning("Callback received for unknown checkout ID.")
        # Acknowledge receipt so callback retries don't continue indefinitely.
        return JsonResponse({"ResultCode": 0, "ResultDesc": "Accepted"})

    metadata = {}
    callback_metadata = callback.get("CallbackMetadata", {}).get("Item", [])

    for item in callback_metadata:
        name = item.get("Name")
        if name:
            metadata[name] = item.get("Value")

    # Do not allow a delayed failure callback to overwrite a confirmed payment.
    if payment.status != MpesaPayment.Status.PAID:
        payment.result_code = result_code
        payment.result_description = result_description

        if result_code == 0:
            receipt = metadata.get("MpesaReceiptNumber")
            callback_amount = metadata.get("Amount")

            # Verify the callback amount before marking the payment as paid.
            try:
                valid_amount = (
                    callback_amount is not None
                    and Decimal(str(callback_amount)) == Decimal(payment.amount)
                )
            except (InvalidOperation, TypeError, ValueError):
                valid_amount = False

            if not valid_amount or not receipt:
                payment.status = MpesaPayment.Status.FAILED
                payment.result_description = (
                    "Payment callback received but amount or receipt "
                    "could not be verified."
                )
            else:
                payment.status = MpesaPayment.Status.PAID
                payment.mpesa_receipt_number = str(receipt)
        else:
            # 1032 is the usual customer-cancelled result.
            payment.status = (
                MpesaPayment.Status.CANCELLED
                if result_code == 1032
                else MpesaPayment.Status.FAILED
            )

        payment.save()

    return JsonResponse({"ResultCode": 0, "ResultDesc": "Accepted"})


@api_view(["GET"])
@permission_classes([AllowAny])
def payment_status(request, payment_id):
    """Return the latest known payment status for the POS."""
    payment = get_object_or_404(
        MpesaPayment,
        public_id=payment_id,
    )

    return Response(
        {
            "success": True,
            "payment_id": str(payment.public_id),
            "status": payment.status.lower(),
            "amount": payment.amount,
            "phone": payment.phone_number,
            "receipt": payment.mpesa_receipt_number or None,
            "message": payment.result_description,
        },
        status=status.HTTP_200_OK,
    )
