import React, { useState } from 'react';

export default function MpesaPayment({ amount, phoneNumber, onPaid }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStkPush = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      alert("Please enter a valid M-Pesa phone number.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/mpesa/stk-push/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          amount: amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate STK push.');
      }

      console.log('STK Push initiated successfully:', data);
      // Pass response/callback data up to finalize the transaction
      if (onPaid) {
        onPaid(data);
      }
    } catch (err) {
      console.error('M-Pesa error:', err);
      setError('Cannot connect to Django. Check that the backend is running.');
      alert('The M-Pesa request failed. Check the browser console and Django terminal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleStkPush}
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded text-xs transition"
      >
        {loading ? 'Sending STK Push Prompt...' : `Pay KSh ${amount} with M-Pesa`}
      </button>
      {error && <p className="text-red-600 text-[10px]">{error}</p>}
    </div>
  );
}