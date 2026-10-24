import React from 'react';

export default function Topbar({ activeTab }) {
  const getTitle = (tab) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'pos': return 'Point of Sale Checkout';
      case 'products': return 'Spare Parts Catalog';
      case 'inventory': return 'Stock & Inventory Control';
      case 'sales': return 'Sales & Receipts History';
      case 'suppliers': return 'Parts Suppliers Management';
      case 'reports': return 'Reports & Analytics';
      case 'settings': return 'Shop Settings';
      default: return 'Dashboard Overview';
    }
  };

  return (
    <header className="bg-white border-b border-[#DCE3EA] px-6 py-3.5 flex items-center justify-between">
      <h2 className="font-bold text-base text-[#17212B] tracking-tight">
        {getTitle(activeTab)}
      </h2>

      <div className="flex items-center space-x-3">
        <div className="text-right">
          <div className="text-xs font-bold text-[#17212B]">Carolyn(e) Waruguru</div>
          <div className="text-[10px] text-[#64748B] uppercase tracking-wider font-medium">Administrator</div>
        </div>
        <div className="w-8 h-8 bg-[#172B3A] text-white text-xs font-bold flex items-center justify-center">
          CW
        </div>
      </div>
    </header>
  );
}