import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Truck, 
  Receipt, 
  BarChart3, 
  Settings,
  Menu,
  X
} from 'lucide-react';
import logoImage from '../assets/logo.jpg';

export default function Sidebar({ activeTab, setActiveTab }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'Point of Sale (POS)', icon: ShoppingCart },
    { id: 'products', label: 'Spare Parts Catalog', icon: Package },
    { id: 'inventory', label: 'Stock & Inventory', icon: Truck },
    { id: 'sales', label: 'Sales & Receipts', icon: Receipt },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Shop Settings', icon: Settings },
  ];

  const handleSelect = (id) => {
    setActiveTab(id);
    setMobileOpen(false); // Close drawer on mobile click
  };

  return (
    <>
      {/* Mobile Header Bar & Hamburger Button (Visible on mobile/tablet) */}
      <div className="md:hidden bg-[#172B3A] text-white p-3 flex items-center justify-between border-b border-white/10 w-full flex-shrink-0">
        <div className="flex items-center space-x-2">
          <img src={logoImage} alt="Sawa POS" className="w-7 h-7 object-cover border border-white/20" />
          <span className="font-bold text-xs tracking-wide">SAWA POS</span>
        </div>
        <button 
          onClick={() => setMobileOpen(!mobileOpen)} 
          className="p-1.5 rounded-lg bg-white/10 text-white focus:outline-none"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Overlay Backing */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)} 
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
        />
      )}

      {/* Sidebar Element (Drawer on mobile, locked column on desktop) */}
      <aside 
        className={`fixed md:static top-0 left-0 z-50 w-64 h-full bg-[#172B3A] text-white flex flex-col justify-between border-r border-[#DCE3EA]/10 select-none flex-shrink-0 transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ boxShadow: 'none' }}
      >
        <div>
          {/* Brand Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src={logoImage} alt="Sawa POS" className="w-9 h-9 object-cover border border-white/20" />
              <div>
                <h1 className="font-bold text-sm tracking-wide">SAWA POS</h1>
                <p className="text-[10px] text-slate-400">Motorcycle Spares</p>
              </div>
            </div>
            <button onClick={() => setMobileOpen(false)} className="md:hidden text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="py-3 space-y-1 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium transition-colors border-l-2 ${
                    isActive 
                      ? 'bg-blue-600/20 text-white border-blue-600 font-bold' 
                      : 'text-slate-300 border-transparent hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Info Pinned to Bottom */}
        <div className="p-3 border-t border-white/10 text-center text-[10px] text-slate-400 bg-[#172B3A]">
          Sawa POS v1.0 • Kenya
        </div>
      </aside>
    </>
  );
}