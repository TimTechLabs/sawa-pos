import hmac
import base64
import uuid
from unittest.mock import Mock, patch

import requests
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIRequestFactory

from .models import MpesaPayment
from .views import (
    get_mpesa_access_token,
    mpesa_callback_view,
    mpesa_payment_status_view,
    mpesa_stk_push_view,
    normalize_mpesa_phone,
)


@override_settings(
    DEBUG_MPESA_MOCK=False,
    MPESA_CONSUMER_KEY="test-key",
    MPESA_CONSUMER_SECRET="test-secret",
    MPESA_ENVIRONMENT="sandbox",
    MPESA_SHORTCODE="174379",
    MPESA_PASSKEY="test-passkey",
    MPESA_CALLBACK_URL="https://example.test/api/v1/mpesa/callback/",
)
class MpesaPaymentFlowTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def make_stk_request(self, phone="0712345678", amount=100, key=None):
        return self.factory.post(
            "/api/v1/mpesa/stk-push/",
            {
                "phone": phone,
                "amount": amount,
                "idempotency_key": str(key or uuid.uuid4()),
            },
            format="json",
        )

    @staticmethod
    def fingerprint(phone, amount):
        normalized_phone = "254" + phone[1:] if phone.startswith("0") else phone
        from django.conf import settings

        return hmac.new(
            settings.SECRET_KEY.encode("utf-8"),
            f"{normalized_phone}:{amount}".encode("utf-8"),
            "sha256",
        ).hexdigest()

    @patch("pos.views.requests.get")
    @patch("pos.views.requests.post")
    def test_mock_mode_does_not_call_daraja_or_create_paid_payment(self, post, get):
        request = self.make_stk_request(phone="anything goes ++")

        with override_settings(DEBUG_MPESA_MOCK=True, DEBUG=True):
            response = mpesa_stk_push_view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["ResponseCode"], "0")
        self.assertNotIn("payment_id", response.data)
        self.assertFalse(MpesaPayment.objects.exists())
        get.assert_not_called()
        post.assert_not_called()

    @override_settings(
        DEBUG_MPESA_MOCK=True,
        DEBUG=True,
        MPESA_ENVIRONMENT="production",
    )
    @patch(
        "pos.views._get_mpesa_access_token_result",
        return_value=(None, {"oauth_http_status": 401, "oauth_error": {"error": "invalid_client"}}),
    )
    def test_mock_mode_is_never_used_with_production_environment(self, get_token):
        response = mpesa_stk_push_view(self.make_stk_request())

        self.assertEqual(response.status_code, 502)
        self.assertNotIn("ResponseCode", response.data)
        get_token.assert_called_once_with()

    def test_kenyan_phone_normalization_and_validation(self):
        self.assertEqual(normalize_mpesa_phone("  +254712345678 "), "254712345678")
        self.assertEqual(normalize_mpesa_phone("0712345678"), "254712345678")
        self.assertEqual(normalize_mpesa_phone("0112345678"), "254112345678")
        self.assertEqual(normalize_mpesa_phone("712345678"), "254712345678")
        self.assertIsNone(normalize_mpesa_phone("not-a-phone"))

    def test_callback_url_route_is_registered_at_configured_path(self):
        self.assertEqual(
            reverse("mpesa_callback"),
            "/api/v1/mpesa/callback/",
        )

    @override_settings(MPESA_PASSKEY="", MPESA_CALLBACK_URL="")
    def test_missing_stk_configuration_is_reported_before_oauth(self):
        with patch("pos.views.requests.get") as get:
            response = mpesa_stk_push_view(self.make_stk_request())

        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            response.data["missing_configuration"],
            [
                "MPESA_PASSKEY",
                "MPESA_CALLBACK_URL (public HTTPS callback route)",
            ],
        )
        get.assert_not_called()

    def test_invalid_phone_is_rejected_before_oauth(self):
        with patch("pos.views.requests.get") as get:
            response = mpesa_stk_push_view(self.make_stk_request(phone="abc"))

        self.assertEqual(response.status_code, 400)
        get.assert_not_called()

    def test_invalid_credentials_oauth_error_is_logged_and_not_forwarded(self):
        oauth_response = Mock(
            ok=False,
            status_code=401,
            text='{"error":"invalid_client","consumer_secret":"dont-log"}',
        )
        oauth_response.json.return_value = {
            "error": "invalid_client",
            "consumer_secret": "dont-log",
        }
        with patch("pos.views.requests.get", return_value=oauth_response) as get:
            with self.assertLogs("pos.views", level="ERROR") as logs:
                response = mpesa_stk_push_view(self.make_stk_request())

        self.assertEqual(response.status_code, 502)
        self.assertNotIn("dont-log", "\n".join(logs.output))
        self.assertIn("invalid_client", "\n".join(logs.output))
        self.assertEqual(response.data["oauth_http_status"], 401)
        self.assertEqual(response.data["oauth_error"]["error"], "invalid_client")
        get.assert_called_once()
        self.assertEqual(
            get.call_args.args[0],
            "https://sandbox.safaricom.co.ke/oauth/v1/generate"
            "?grant_type=client_credentials",
        )

    @override_settings(MPESA_ENVIRONMENT="production")
    @patch("pos.views.requests.get")
    def test_production_environment_uses_production_oauth_host(self, get):
        oauth_response = Mock(ok=True, status_code=200)
        oauth_response.json.return_value = {"access_token": "test-token"}
        get.return_value = oauth_response

        self.assertEqual(get_mpesa_access_token(), "test-token")
        self.assertEqual(
            get.call_args.args[0],
            "https://api.safaricom.co.ke/oauth/v1/generate"
            "?grant_type=client_credentials",
        )

    @patch("pos.views._get_mpesa_access_token_result", return_value=("test-token", {}))
    @patch("pos.views.requests.post")
    def test_accepted_stk_is_pending_until_payment_query_confirms(
        self,
        post,
        get_token,
    ):
        stk_response = Mock(ok=True, status_code=200)
        stk_response.json.return_value = {
            "ResponseCode": "0",
            "ResponseDescription": "Success. Request accepted for processing",
            "CustomerMessage": "Success. Request accepted for processing",
            "MerchantRequestID": "merchant-123",
            "CheckoutRequestID": "checkout-123",
        }
        post.return_value = stk_response

        response = mpesa_stk_push_view(self.make_stk_request())

        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data["payment_status"], "PENDING")
        self.assertEqual(response.data["CheckoutRequestID"], "checkout-123")
        self.assertEqual(response.data["gateway_http_status"], 200)
        self.assertEqual(response.data["ResponseCode"], "0")
        self.assertFalse(
            MpesaPayment.objects.get().status == MpesaPayment.Status.PAID
        )
        stk_call = post.call_args
        self.assertEqual(stk_call.args[0], (
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
        ))
        self.assertEqual(stk_call.kwargs["json"]["PhoneNumber"], "254712345678")
        self.assertEqual(stk_call.kwargs["json"]["Amount"], 100)
        self.assertEqual(
            stk_call.kwargs["headers"]["Authorization"],
            "Bearer test-token",
        )
        timestamp = stk_call.kwargs["json"]["Timestamp"]
        self.assertRegex(timestamp, r"^\d{14}$")
        decoded_password = base64.b64decode(
            stk_call.kwargs["json"]["Password"]
        ).decode()
        self.assertEqual(decoded_password, f"174379test-passkey{timestamp}")
        self.assertEqual(
            stk_call.kwargs["json"]["CallBackURL"],
            "https://example.test/api/v1/mpesa/callback/",
        )
        get_token.assert_called_once_with()
        post.assert_called_once()

    @patch("pos.views._get_mpesa_access_token_result", return_value=("test-token", {}))
    @patch("pos.views.requests.post")
    def test_daraja_rejection_is_logged_and_payment_is_failed(self, post, _token):
        rejected = Mock(
            ok=False,
            status_code=400,
            text='{"errorMessage":"invalid shortcode","msisdn":"+254712345678"}',
        )
        rejected.json.return_value = {
            "errorMessage": "invalid shortcode",
            "msisdn": "254712345678",
        }
        post.return_value = rejected

        with self.assertLogs("pos.views", level="ERROR") as logs:
            response = mpesa_stk_push_view(self.make_stk_request())

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            MpesaPayment.objects.get().status,
            MpesaPayment.Status.FAILED,
        )
        self.assertEqual(response.data["payment_status"], "FAILED")
        self.assertIn("invalid shortcode", "\n".join(logs.output))
        self.assertNotIn("+254712345678", "\n".join(logs.output))
        self.assertEqual(response.data["gateway_http_status"], 400)
        self.assertEqual(response.data["ResponseDescription"], "invalid shortcode")
        self.assertNotIn("+254712345678", str(response.data))

    @patch("pos.views._get_mpesa_access_token_result", return_value=("test-token", {}))
    @patch("pos.views.requests.post")
    def test_http_200_with_nonzero_daraja_code_is_not_accepted(self, post, _token):
        rejected = Mock(ok=True, status_code=200)
        rejected.json.return_value = {
            "ResponseCode": "1",
            "ResponseDescription": "Rejected",
            "CustomerMessage": "Invalid shortcode",
        }
        post.return_value = rejected

        with self.assertLogs("pos.views", level="ERROR"):
            response = mpesa_stk_push_view(self.make_stk_request())

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            MpesaPayment.objects.get().status,
            MpesaPayment.Status.FAILED,
        )
        self.assertEqual(response.data["payment_status"], "FAILED")
        self.assertEqual(response.data["gateway_http_status"], 200)
        self.assertEqual(response.data["ResponseCode"], "1")
        self.assertEqual(response.data["ResponseDescription"], "Rejected")
        self.assertEqual(response.data["CustomerMessage"], "Invalid shortcode")

    @patch("pos.views._get_mpesa_access_token_result", return_value=("test-token", {}))
    @patch("pos.views.requests.post", side_effect=requests.Timeout("timeout"))
    def test_unknown_network_outcome_is_not_reported_as_success(self, post, _token):
        response = mpesa_stk_push_view(self.make_stk_request())

        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.data["payment_status"], "PENDING")
        self.assertEqual(
            MpesaPayment.objects.get().status,
            MpesaPayment.Status.PENDING,
        )
        self.assertFalse(response.data.get("ResponseCode") == "0")

    @patch("pos.views.requests.post")
    @patch("pos.views._get_mpesa_access_token_result", return_value=("test-token", {}))
    def test_duplicate_initiation_key_does_not_send_second_stk(self, _token, post):
        key = uuid.uuid4()
        payment = MpesaPayment.objects.create(
            idempotency_key=key,
            request_fingerprint=self.fingerprint("0712345678", 100),
            amount=100,
            checkout_request_id="checkout-existing",
        )

        response = mpesa_stk_push_view(self.make_stk_request(key=key))

        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data["payment_id"], str(payment.public_id))
        post.assert_not_called()

    def create_pending_payment(self, checkout_request_id="checkout-123"):
        return MpesaPayment.objects.create(
            idempotency_key=uuid.uuid4(),
            request_fingerprint=self.fingerprint("0712345678", 100),
            amount=100,
            merchant_request_id="merchant-123",
            checkout_request_id=checkout_request_id,
        )

    def make_callback(self, checkout_id="checkout-123", result_code=0):
        return self.factory.post(
            "/api/v1/mpesa/callback/",
            {
                "Body": {
                    "stkCallback": {
                        "CheckoutRequestID": checkout_id,
                        "ResultCode": result_code,
                        "ResultDesc": "Callback result",
                    }
                }
            },
            format="json",
        )

    @patch("pos.views._get_mpesa_access_token_result", return_value=("test-token", {}))
    @patch("pos.views.requests.post")
    def test_successful_callback_queries_daraja_before_marking_paid(
        self,
        post,
        _token,
    ):
        payment = self.create_pending_payment()
        query_response = Mock(ok=True, status_code=200)
        query_response.json.return_value = {
            "ResponseCode": "0",
            "ResultCode": "0",
            "ResultDesc": "The service request is processed successfully.",
            "MpesaReceiptNumber": "ABC123",
        }
        post.return_value = query_response

        response = mpesa_callback_view(self.make_callback())
        payment.refresh_from_db()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payment.status, MpesaPayment.Status.PAID)
        self.assertEqual(payment.mpesa_receipt_number, "ABC123")
        self.assertIsNotNone(payment.callback_received_at)
        self.assertEqual(payment.callback_result_code, "0")
        self.assertEqual(post.call_args.args[0], (
            "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query"
        ))

    @patch("pos.views._get_mpesa_access_token_result", return_value=("test-token", {}))
    @patch("pos.views.requests.post")
    def test_duplicate_callback_is_idempotent(self, post, _token):
        payment = self.create_pending_payment()
        query_response = Mock(ok=True, status_code=200)
        query_response.json.return_value = {
            "ResultCode": "0",
            "ResultDesc": "Processed",
            "MpesaReceiptNumber": "ABC123",
        }
        post.return_value = query_response
        mpesa_callback_view(self.make_callback())

        duplicate_response = mpesa_callback_view(self.make_callback())
        payment.refresh_from_db()

        self.assertEqual(duplicate_response.status_code, 200)
        self.assertEqual(payment.status, MpesaPayment.Status.PAID)
        post.assert_called_once()

    @patch("pos.views._get_mpesa_access_token_result", return_value=("test-token", {}))
    @patch("pos.views.requests.post")
    def test_cancellation_and_timeout_query_results_are_terminal(self, post, _token):
        for result_code, expected_status in (
            ("1032", MpesaPayment.Status.CANCELLED),
            ("1037", MpesaPayment.Status.TIMED_OUT),
        ):
            with self.subTest(result_code=result_code):
                payment = self.create_pending_payment(
                    checkout_request_id=f"checkout-{result_code}"
                )
                query_response = Mock(ok=True, status_code=200)
                query_response.json.return_value = {
                    "ResultCode": result_code,
                    "ResultDesc": "Customer did not complete request.",
                }
                post.return_value = query_response

                response = mpesa_payment_status_view(
                    self.factory.get("/"),
                    payment.public_id,
                )

                payment.refresh_from_db()
                self.assertEqual(response.status_code, 200)
                self.assertEqual(payment.status, expected_status)

    @patch("pos.views._get_mpesa_access_token_result", return_value=("test-token", {}))
    @patch("pos.views.requests.post")
    def test_missing_callback_is_reconciled_by_status_query(self, post, _token):
        payment = self.create_pending_payment()
        query_response = Mock(ok=True, status_code=200)
        query_response.json.return_value = {
            "ResultCode": "0",
            "ResultDesc": "Processed",
            "MpesaReceiptNumber": "ABC124",
        }
        post.return_value = query_response

        response = mpesa_payment_status_view(
            self.factory.get("/"),
            payment.public_id,
        )

        payment.refresh_from_db()
        self.assertEqual(response.data["payment_status"], "PAID")
        self.assertEqual(payment.status, MpesaPayment.Status.PAID)

    @patch("pos.views._get_mpesa_access_token_result", return_value=("test-token", {}))
    @patch("pos.views.requests.post")
    def test_idempotent_key_cannot_be_reused_for_different_amount(self, post, _token):
        key = uuid.uuid4()
        payment = MpesaPayment.objects.create(
            idempotency_key=key,
            request_fingerprint=self.fingerprint("0712345678", 100),
            amount=100,
            checkout_request_id="checkout-existing",
        )

        response = mpesa_stk_push_view(
            self.make_stk_request(amount=999, key=key)
        )

        self.assertEqual(response.status_code, 409)
        self.assertNotIn("payment_id", response.data)
        post.assert_not_called()
