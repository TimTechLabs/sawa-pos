import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, Store, Printer, Shield, CreditCard, Boxes, Lock, Trash2, AlertTriangle, KeyRound } from 'lucide-react';

export default function SettingsView() {
  const [settings, setSettings] = useState({
    shopName: 'Sawa Motorcycle Spares',
    phone: '+254 712 160 288 / +254 781702033',
    email: 'sawamotorcyclespares@gmail.com',
    location: 'Kitale Town',
    currency: 'KES',
    receiptFooter: 'Asante sana! Karibu tena. No goods returned after 7 days.',
    paperSize: '80mm',
    lowStockThreshold: 5,
    cashierNameOnReceipt: true,
  });

  const [saved, setSaved] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // PIN management states
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [mode, setMode] = useState(null); // 'clear' or 'change_pin'

  const getStoredPin = () => localStorage.getItem('sawa_admin_pin') || '2026';

  useEffect(() => {
    const savedSettings = localStorage.getItem('sawa_shop_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('sawa_shop_settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleActionTrigger = (actionType) => {
    setMode(actionType);
    setCurrentPinInput('');
    setNewPinInput('');
    setErrorMsg('');
    setIsPinModalOpen(true);
  };

  const handleVerifyAndExecute = (e) => {
    e.preventDefault();
    const storedPin = getStoredPin();

    if (currentPinInput !== storedPin) {
      setErrorMsg('Incorrect Admin PIN. Access denied.');
      return;
    }

    if (mode === 'clear') {
      localStorage.setItem('sawa_sales_history', JSON.stringify([]));
      localStorage.removeItem('sawa_pos_transactions_v1');
      window.dispatchEvent(new Event('sawa_products_updated'));
      setSuccessMsg('Sales ledger successfully cleared and reset.');
      setIsPinModalOpen(false);
    } else if (mode === 'change_pin') {
      if (!newPinInput || newPinInput.length !== 4 || isNaN(newPinInput)) {
        setErrorMsg('New PIN must be exactly 4 digits.');
        return;
      }
      localStorage.setItem('sawa_admin_pin', newPinInput);
      setSuccessMsg('Admin PIN successfully updated!');
      setIsPinModalOpen(false);
    }

    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10 font-sans text-[#1E293B]">
      {saved && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Shop settings successfully saved and applied to POS workflows!</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* A. Shop Information */}
        <div className="bg-white border border-[#DCE3EA] p-5 space-y-4 rounded-none shadow-none">
          <div className="flex items-center gap-2 border-b border-[#DCE3EA] pb-3">
            <Store className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-[#17212B]">Shop Information</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#17212B] mb-1">Shop Name</label>
              <input 
                type="text" 
                value={settings.shopName}
                onChange={(e) => setSettings({...settings, shopName: e.target.value})}
                className="w-full bg-slate-50 border border-[#DCE3EA] px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-600 rounded-none shadow-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#17212B] mb-1">Phone Number</label>
              <input 
                type="text" 
                value={settings.phone}
                onChange={(e) => setSettings({...settings, phone: e.target.value})}
                className="w-full bg-slate-50 border border-[#DCE3EA] px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-600 rounded-none shadow-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#17212B] mb-1">Email Address</label>
              <input 
                type="email" 
                value={settings.email}
                onChange={(e) => setSettings({...settings, email: e.target.value})}
                className="w-full bg-slate-50 border border-[#DCE3EA] px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-600 rounded-none shadow-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#17212B] mb-1">Currency</label>
              <input 
                type="text" 
                disabled 
                value={settings.currency}
                className="w-full bg-slate-100 border border-[#DCE3EA] px-3 py-2 text-xs text-slate-500 cursor-not-allowed rounded-none shadow-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#17212B] mb-1">Physical Location / Address</label>
              <input 
                type="text" 
                value={settings.location}
                onChange={(e) => setSettings({...settings, location: e.target.value})}
                className="w-full bg-slate-50 border border-[#DCE3EA] px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-600 rounded-none shadow-none"
              />
            </div>
          </div>
        </div>

        {/* B. Receipt Configuration */}
        <div className="bg-white border border-[#DCE3EA] p-5 space-y-4 rounded-none shadow-none">
          <div className="flex items-center gap-2 border-b border-[#DCE3EA] pb-3">
            <Printer className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-[#17212B]">Receipt Configuration</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#17212B] mb-1">Thermal Paper Size</label>
              <select 
                value={settings.paperSize}
                onChange={(e) => setSettings({...settings, paperSize: e.target.value})}
                className="w-full bg-slate-50 border border-[#DCE3EA] px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-600 rounded-none shadow-none"
              >
                <option value="58mm">58 mm Thermal</option>
                <option value="80mm">80 mm Thermal</option>
              </select>
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={settings.cashierNameOnReceipt}
                  onChange={(e) => setSettings({...settings, cashierNameOnReceipt: e.target.checked})}
                  className="rounded-none border-[#DCE3EA] text-blue-600 focus:ring-0 shadow-none"
                />
                <span className="text-xs font-bold text-[#17212B]">Display Cashier Name on Receipts</span>
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#17212B] mb-1">Receipt Footer / Thank-You Message</label>
              <input 
                type="text" 
                value={settings.receiptFooter}
                onChange={(e) => setSettings({...settings, receiptFooter: e.target.value})}
                className="w-full bg-slate-50 border border-[#DCE3EA] px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-600 rounded-none shadow-none"
              />
            </div>
          </div>
        </div>

        {/* C. Inventory Settings */}
        <div className="bg-white border border-[#DCE3EA] p-5 space-y-4 rounded-none shadow-none">
          <div className="flex items-center gap-2 border-b border-[#DCE3EA] pb-3">
            <Boxes className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-[#17212B]">Inventory Settings</h3>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#17212B] mb-1">Low-Stock Warning Threshold (Units)</label>
            <input 
              type="number" 
              value={settings.lowStockThreshold}
              onChange={(e) => setSettings({...settings, lowStockThreshold: parseInt(e.target.value) || 0})}
              className="w-full sm:w-1/2 bg-slate-50 border border-[#DCE3EA] px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-600 rounded-none shadow-none"
            />
            <p className="text-[11px] text-[#64748B] mt-1">Products with stock at or below this number trigger low-stock alerts on the dashboard.</p>
          </div>
        </div>

        {/* D. Payment Settings */}
        <div className="bg-white border border-[#DCE3EA] p-5 space-y-4 rounded-none shadow-none">
          <div className="flex items-center gap-2 border-b border-[#DCE3EA] pb-3">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-[#17212B]">Payment Integrations</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 border border-[#DCE3EA] bg-slate-50 flex items-center justify-between rounded-none shadow-none">
              <div>
                <div className="text-xs font-bold text-[#17212B]">M-Pesa STK Push / Till</div>
                <div className="text-[11px] text-emerald-700 font-medium">Connected & Active</div>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 border border-emerald-300 rounded-none">Live</span>
            </div>
            <div className="p-3 border border-[#DCE3EA] bg-slate-50 flex items-center justify-between rounded-none shadow-none">
              <div>
                <div className="text-xs font-bold text-[#17212B]">Cash Checkout</div>
                <div className="text-[11px] text-emerald-700 font-medium">Always Enabled</div>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 border border-emerald-300 rounded-none">Active</span>
            </div>
          </div>
        </div>

        {/* E. Restricted Administrator Security & Actions */}
        <div className="bg-white border border-red-200 p-5 space-y-4 rounded-none shadow-none">
          <div className="flex items-center gap-2 border-b border-red-100 pb-3">
            <Shield className="w-4 h-4 text-red-600" />
            <h3 className="font-bold text-sm text-red-700 uppercase">Restricted Administrator Controls</h3>
          </div>
          <p className="text-xs text-[#64748B]">
            Actions in this section require a 4-digit PIN authorized solely for management (Carolyne Waruguru).
          </p>
          
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={() => handleActionTrigger('change_pin')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#17212B] border border-[#DCE3EA] text-xs font-bold uppercase flex items-center gap-2 rounded-none shadow-none"
            >
              <KeyRound className="w-3.5 h-3.5" /> Change Admin PIN
            </button>

            <button
              type="button"
              onClick={() => handleActionTrigger('clear')}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase flex items-center gap-2 rounded-none shadow-none"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Sales Ledger
            </button>
          </div>
        </div>

        {/* Save Changes Button */}
        <div className="flex justify-end">
          <button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-6 py-2.5 flex items-center gap-2 transition-colors rounded-none shadow-none"
          >
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </form>

      {/* PIN Verification Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#DCE3EA] w-full max-w-sm p-6 space-y-4 rounded-none shadow-none">
            <div className="flex justify-between items-center border-b border-[#DCE3EA] pb-3">
              <h3 className="font-bold text-sm text-[#17212B] flex items-center gap-2">
                <Lock className="w-4 h-4 text-red-600" /> Admin Authentication
              </h3>
              <button type="button" onClick={() => setIsPinModalOpen(false)} className="text-xs text-[#64748B] hover:text-black font-bold">✕</button>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleVerifyAndExecute} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#17212B] mb-1">
                  Enter 4-Digit Admin PIN *
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  autoFocus
                  placeholder="••••"
                  value={currentPinInput}
                  onChange={(e) => setCurrentPinInput(e.target.value)}
                  className="w-full bg-slate-50 border border-[#DCE3EA] px-3 py-2 text-sm font-mono tracking-widest text-center focus:bg-white focus:outline-none focus:border-blue-600 rounded-none shadow-none"
                />
              </div>

              {mode === 'change_pin' && (
                <div>
                  <label className="block text-xs font-bold text-[#17212B] mb-1">
                    Enter New 4-Digit PIN *
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="••••"
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    className="w-full bg-slate-50 border border-[#DCE3EA] px-3 py-2 text-sm font-mono tracking-widest text-center focus:bg-white focus:outline-none focus:border-blue-600 rounded-none shadow-none"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-[#DCE3EA] flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-[#DCE3EA] text-xs font-medium text-[#17212B] bg-white hover:bg-slate-50 rounded-none shadow-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold uppercase rounded-none shadow-none"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}