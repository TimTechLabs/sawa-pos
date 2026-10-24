import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  PackageSearch, 
  Boxes, 
  ReceiptText, 
  Truck, 
  FileBarChart, 
  Settings2 
} from 'lucide-react';
import logoImage from '../assets/logo.jpg';

export default function Sidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'Point of Sale (POS)', icon: ShoppingCart },
    { id: 'products', label: 'Spare Parts Catalog', icon: PackageSearch },
    { id: 'inventory', label: 'Stock & Inventory', icon: Boxes },
    { id: 'sales', label: 'Sales & Receipts', icon: ReceiptText },
    { id: 'suppliers', label: 'Parts Suppliers', icon: Truck },
    { id: 'reports', label: 'Reports & Analytics', icon: FileBarChart },
    { id: 'settings', label: 'Shop Settings', icon: Settings2 },
  ];

  return (
    <aside className="w-64 bg-[#172B3A] text-white flex flex-col border-r border-[#DCE3EA]/10 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-white/10 flex items-center space-x-3">
        <img src={logoImage} alt="Sawa POS" className="w-9 h-9 object-cover border border-white/20" />
        <div>
          <h1 className="font-bold text-sm tracking-wide">SAWA POS</h1>
          <p className="text-[10px] text-slate-400">Motorcycle Spares</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-1 px-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium transition-colors border-l-2 ${
                isActive 
                  ? 'bg-blue-600/20 text-white border-blue-600' 
                  : 'text-slate-300 border-transparent hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-white/10 text-center text-[10px] text-slate-400 bg-[#172B3A]">
        Sawa POS v1.0 • Kenya
      </div>
    </aside>
  );
}