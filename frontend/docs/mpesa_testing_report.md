# Sawa POS - M-Pesa Daraja Integration Audit & Testing Report

This document records the verification states, API responses, and sandbox testing behaviors for the Sawa POS M-Pesa integration.

## 1. OAuth Authentication Result
* **Endpoint:** `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`
* **HTTP Status:** `200 OK`
* **Response Body Structure:**
  ```json
  {
      "access_token": "[REDACTED_TOKEN_STRING]",
      "expires_in": "3599"
  }