
import React from "react";

export default function Topbar({ activeTab }) {
  const pageTitles = {
    dashboard: "Dashboard Overview",
    pos: "Point of Sale Checkout",
    products: "Spare Parts Catalog",
    catalog: "Spare Parts Catalog",
    inventory: "Stock & Inventory Control",
    sales: "Sales & Receipts History",
    reports: "Reports & Analytics",
    settings: "Shop Settings",
  };

  const title = pageTitles[activeTab] || "Dashboard Overview";

  return (
    <header className="flex w-full min-w-0 shrink-0 items-center justify-between gap-3 border-b border-[#DCE3EA] bg-white px-3 py-3 sm:px-4 md:px-6 md:py-3.5">
      {/* Current page title */}
      <div className="min-w-0 flex-1">
        <h2 className="break-words text-sm font-bold tracking-tight text-[#17212B] sm:text-base">
          {title}
        </h2>
      </div>

      {/* Administrator details */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="min-w-0 text-right">
          <div className="whitespace-nowrap text-[11px] font-bold text-[#17212B] sm:text-xs">
            Carolyne Waruguru
          </div>

          <div className="text-[9px] font-medium uppercase tracking-wider text-[#64748B] sm:text-[10px]">
            Administrator
          </div>
        </div>

        {/* Administrator initials */}
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#172B3A] text-xs font-bold text-white"
          aria-label="Administrator initials CW"
          title="Carolyne Waruguru"
        >
          CW
        </div>
      </div>
    </header>
  );
}
