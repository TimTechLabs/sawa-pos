import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, Store, Printer, Shield, CreditCard, Boxes } from 'lucide-react';

export default function SettingsView() {
  const [settings, setSettings] = useState({
    shopName: 'Sawa Motorcycle Spares',
    phone: '+254 712 160 288 / +254 733 998 122',
    email: 'sawamotorcyclespares@gmail.com',
    location: 'Main Street, Kirinyaga Road, Nairobi, Kenya',
    currency: 'KES',
    receiptFooter: 'Asante sana! Karibu tena. No goods returned after 7 days.',
    paperSize: '80mm',
    lowStockThreshold: 5,
    cashierNameOnReceipt: true,
  });

  const [saved, setSaved] = useState(false);

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

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      {saved && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Shop settings successfully saved and applied to POS workflows!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* A. Shop Information */}
        <div className="bg-white border border-[#DCE3EA] p-5 space-y-4">
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
                className="w-full bg-slate-50 border border-[#DCE3EA] px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#17212B] mb-1">Phone Number</label>
              <input 
                type="text" 
                value={settings.phone}
                onChange={(e) => setSettings({...settings, phone: e.target.value})}
                className="w-full bg-slate-50 border border-[#DCE3EA] px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#17212B] mb-1">Email Address</label>
              <input 
                type="email" 
                value={settings.email}
                onChange={(e) => setSettings({...settings, email: e.target.value})}
                className="w-full bg-slate-50 border border-[#DCE3EA] px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#17212B] mb-1">Currency</label>
              <input 
                type="text" 
                disabled 
                value={settings.currency}
                className="w-full bg-slate-100 border border-[#DCE3EA] px-3 py-2 text-xs text-slate-500 cursor-not-allowed"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#17212B] mb-1">Physical Location / Address</label>
              <input 
                type="text" 
                value={settings.location}
                onChange={(e) => setSettings({...settings, location: e.target.value})}
                className="w-full bg-slate-50 border border-[#DCE3EA] px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </div>

        {/* B. Receipt Configuration */}
        <div className="bg-white border border-[#DCE3EA] p-5 space-y-4">
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
                className="w-full bg-slate-50 border border-[#DCE3EA] px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
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
                  className="rounded border-[#DCE3EA] text-blue-600 focus:ring-0"
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
                className="w-full bg-slate-50 border border-[#DCE3EA] px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </div>

        {/* C. Inventory Settings */}
        <div className="bg-white border border-[#DCE3EA] p-5 space-y-4">
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
              className="w-full sm:w-1/2 bg-slate-50 border border-[#DCE3EA] px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
            />
            <p className="text-[11px] text-[#64748B] mt-1">Products with stock at or below this number trigger low-stock alerts on the dashboard.</p>
          </div>
        </div>

        {/* D. Payment Settings */}
        <div className="bg-white border border-[#DCE3EA] p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#DCE3EA] pb-3">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-[#17212B]">Payment Integrations</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 border border-[#DCE3EA] bg-slate-50 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#17212B]">M-Pesa STK Push / Till</div>
                <div className="text-[11px] text-emerald-700 font-medium">Connected & Active</div>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 border border-emerald-300">Live</span>
            </div>
            <div className="p-3 border border-[#DCE3EA] bg-slate-50 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#17212B]">Cash Checkout</div>
                <div className="text-[11px] text-emerald-700 font-medium">Always Enabled</div>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 border border-emerald-300">Active</span>
            </div>
          </div>
        </div>

        {/* E. User Profile & Security */}
        <div className="bg-white border border-[#DCE3EA] p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#DCE3EA] pb-3">
            <Shield className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-[#17212B]">Administrator Security</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[#17212B]">Current Administrator: Carolyn(e) Waruguru</div>
              <div className="text-[11px] text-[#64748B]">Full POS privileges and audit logs enabled.</div>
            </div>
            <button 
              type="button" 
              onClick={() => alert('Password reset link sent to admin profile.')}
              className="border border-[#DCE3EA] bg-white hover:bg-slate-50 text-[#17212B] text-xs font-semibold px-3 py-1.5"
            >
              Change Password
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-6 py-2.5 flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
}