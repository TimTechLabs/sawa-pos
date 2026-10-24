import React, { useState, useEffect } from 'react';

export default function POSCheckout({ totalAmount, onCompleteSale }) {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [mpesaCode, setMpesaCode] = useState('');
  const [tillNumber, setTillNumber] = useState('');

  useEffect(() => {
    // Fetch the configured till number
    const storedTill = localStorage.getItem('mpesa_till_number');
    setTillNumber(storedTill || 'Not Configured Yet');
  }, []);

  const handleCheckout = (e) => {
    e.preventDefault();
    if (paymentMethod === 'mpesa' && !mpesaCode.trim()) {
      alert('Please enter the M-Pesa confirmation code to complete the sale.');
      return;
    }

    const transaction = {
      id: Date.now(),
      total: totalAmount,
      paymentMethod,
      mpesaCode: paymentMethod === 'mpesa' ? mpesaCode.trim().toUpperCase() : 'N/A',
      timestamp: new Date().toLocaleString(),
    };

    // Save transaction locally offline
    const existingSales = JSON.parse(localStorage.getItem('offline_sales') || '[]');
    localStorage.setItem('offline_sales', JSON.stringify([...existingSales, transaction]));

    alert('Sale completed and saved offline successfully!');
    if (onCompleteSale) onCompleteSale();
  };

  return (
    <div style={{ padding: '20px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', maxWidth: '450px' }}>
      <h3>POS Checkout</h3>
      <div style={{ background: '#f3f4f6', padding: '12px', borderRadius: '6px', margin: '15px 0' }}>
        <p style={{ margin: '0 0 5px 0' }}><strong>Total Due:</strong> KES {totalAmount}</p>
        <p style={{ margin: '0', color: '#1d4ed8' }}><strong>Active Till Number:</strong> {tillNumber}</p>
      </div>

      <form onSubmit={handleCheckout}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ marginRight: '20px', cursor: 'pointer' }}>
            <input
              type="radio"
              value="cash"
              checked={paymentMethod === 'cash'}
              onChange={() => setPaymentMethod('cash')}
            /> Cash
          </label>
          <label style={{ cursor: 'pointer' }}>
            <input
              type="radio"
              value="mpesa"
              checked={paymentMethod === 'mpesa'}
              onChange={() => setPaymentMethod('mpesa')}
            /> M-Pesa (Offline Mode)
          </label>
        </div>

        {paymentMethod === 'mpesa' && (
          <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '6px', marginBottom: '15px' }}>
            <p style={{ fontSize: '13px', margin: '0 0 8px 0', color: '#92400e' }}>
              Instruct customer to pay to Till: <strong>{tillNumber}</strong>. Enter confirmation code below:
            </p>
            <input
              type="text"
              placeholder="e.g. QHS78XYZ90"
              value={mpesaCode}
              onChange={(e) => setMpesaCode(e.target.value)}
              style={{ padding: '8px', width: '100%', border: '1px solid #d97706', borderRadius: '4px', textTransform: 'uppercase' }}
            />
          </div>
        )}

        <button type="submit" style={{ width: '100%', padding: '12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
          Complete Transaction
        </button>
      </form>
    </div>
  );
}