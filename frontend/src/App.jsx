import React, { useState } from "react";
import DashboardView from "./pages/DashboardView";
import POSView from "./pages/POSView";
import ProductsView from "./pages/ProductsView";
import InventoryView from "./pages/InventoryView";
import SalesView from "./pages/SalesView";
import ReportsView from './pages/ReportsView';
import SettingsView from './pages/SettingsView';
import AppLayout from './layouts/AppLayout';

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView setActiveTab={setActiveTab} />;
      case "pos":
        return <POSView globalSearch={searchQuery} />;
      case "products":
        return <ProductsView globalSearch={searchQuery} />;
      case "inventory":
        return <InventoryView globalSearch={searchQuery} />;
      case "sales":
        return <SalesView globalSearch={searchQuery} />;
      case "reports": 
        return <ReportsView />;
      case "settings": 
        // Handles your offline configuration page for M-Pesa Till/Paybill numbers
        return <SettingsView />; 
      default:
        return <DashboardView setActiveTab={setActiveTab} />;
    }
  };

  return (
    <AppLayout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    >
      {renderContent()}
    </AppLayout>
  );
}