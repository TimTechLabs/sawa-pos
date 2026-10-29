import React from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  Receipt,
  BarChart3,
  Settings,
  X,
} from "lucide-react";
import logoImage from "../assets/logo.jpg";

export default function Sidebar({
  activeTab,
  setActiveTab,
  mobileOpen,
  setMobileOpen,
}) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "pos", label: "Point of Sale (POS)", icon: ShoppingCart },
    { id: "products", label: "Spare Parts Catalog", icon: Package },
    { id: "inventory", label: "Stock & Inventory", icon: Truck },
    { id: "sales", label: "Sales & Receipts", icon: Receipt },
    { id: "reports", label: "Reports & Analytics", icon: BarChart3 },
    { id: "settings", label: "Shop Settings", icon: Settings },
  ];

  const handleSelect = (id) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  const closeMenu = () => {
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          tabIndex={-1}
          onClick={closeMenu}
          className="fixed inset-0 z-40 cursor-default bg-black/60 md:hidden"
        />
      )}

      {/* Sidebar / Mobile Drawer */}
      <aside
        id="sawa-sidebar"
        aria-label="Main navigation"
        aria-hidden={!mobileOpen}
        className={`
          fixed inset-y-0 left-0 z-50
          flex h-dvh w-64 max-w-[85vw] shrink-0
          flex-col overflow-hidden
          border-r border-white/10
          bg-[#172B3A] text-white
          transition-transform duration-300 ease-in-out
          md:static md:z-auto md:h-full md:max-w-none
          md:translate-x-0 md:transition-none
          ${
            mobileOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }
        `}
        style={{ boxShadow: "none" }}
      >
        {/* Brand Header */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={logoImage}
              alt="Sawa POS logo"
              className="h-9 w-9 shrink-0 rounded border border-white/20 object-cover"
            />

            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-wide">
                SAWA POS
              </h1>
              <p className="text-[10px] text-slate-400">
                Motorcycle Spares
              </p>
            </div>
          </div>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={closeMenu}
            aria-label="Close navigation menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white md:hidden"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <nav
          aria-label="Application pages"
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-3"
        >
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`
                    flex min-h-11 w-full items-center gap-3
                    border-l-2 px-3.5 py-3 text-left text-xs
                    font-medium transition-colors
                    focus-visible:outline-2 focus-visible:outline-offset-[-2px]
                    focus-visible:outline-white
                    ${
                      isActive
                        ? "border-blue-600 bg-blue-600/20 font-bold text-white"
                        : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white"
                    }
                  `}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? "text-blue-500" : "text-slate-400"
                    }`}
                    aria-hidden="true"
                  />

                  <span className="min-w-0 break-words">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer stays at the bottom */}
        <footer className="shrink-0 border-t border-white/10 bg-[#172B3A] p-3 text-center text-[10px] text-slate-400">
          Sawa POS v1.0 • Kenya
        </footer>
      </aside>
    </>
  );
}
