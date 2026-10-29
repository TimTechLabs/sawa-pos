
import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { Menu, Search, X } from "lucide-react";
import logoImage from "../assets/logo.jpg";

export default function AppLayout({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  children,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileOpen((previous) => !previous);
  };

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  return (
    <div className="flex h-screen h-dvh w-full min-w-0 flex-col overflow-hidden bg-[#F5F7FA] font-sans text-[#17212B] md:flex-row">

      {/* Mobile Header */}
      <header className="flex w-full shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#172B3A] p-3 text-white md:hidden">

        {/* Logo and application name */}
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <img
            src={logoImage}
            alt="Sawa POS"
            className="h-7 w-7 rounded border border-white/20 object-cover"
          />

          <span className="whitespace-nowrap text-xs font-bold tracking-wide">
            SAWA POS
          </span>
        </div>

        {/* Mobile Search */}
        <div className="flex min-w-0 max-w-48 flex-1 items-center rounded-lg border border-white/20 bg-white/10 px-2 py-2">
          <Search
            className="mr-1.5 h-4 w-4 shrink-0 text-slate-300"
            aria-hidden="true"
          />

          <input
            type="search"
            aria-label="Search products and records"
            placeholder="Search..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full min-w-0 border-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-400 focus:ring-0"
          />
        </div>

        {/* Menu Toggle */}
        <button
          type="button"
          onClick={toggleMobileMenu}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Application Area */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#F5F7FA]">

        {/* Desktop and Tablet Topbar */}
        <div className="hidden shrink-0 md:block">
          <Topbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </div>

        {/* Page Content */}
        <main
          id="main-content"
          className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 md:p-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
