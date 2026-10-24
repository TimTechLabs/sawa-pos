import React, { useState, useEffect } from 'react';

export default function ShopSettings() {
  const [tillNumber, setTillNumber] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    // Load existing saved till number on startup
    const savedTill = localStorage.getItem('mpesa_till_number');
    if (savedTill) setTillNumber(savedTill);
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('mpesa_till_number', tillNumber);
    setSavedMessage('Till Number saved successfully for offline use!');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  return (
    <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h2>Shop Settings</h2>
      <form onSubmit={handleSave} style={{ marginTop: '15px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
          M-Pesa Till Number / Paybill:
        </label>
        <input
          type="text"
          value={tillNumber}
          onChange={(e) => setTillNumber(e.target.value)}
          placeholder="e.g. 123456 or Business Name"
          style={{ padding: '10px', width: '100%', maxWidth: '350px', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <div>
          <button type="submit" style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Save Till Number
          </button>
        </div>
      </form>
      {savedMessage && <p style={{ color: 'green', marginTop: '10px', fontWeight: '500' }}>{savedMessage}</p>}
    </div>
  );
}