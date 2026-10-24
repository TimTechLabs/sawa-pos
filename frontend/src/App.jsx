import React, { useState } from "react";
import DashboardView from "./pages/DashboardView";
import POSView from "./pages/POSView";
import CatalogView from "./components/CatalogView";
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
      case "catalog": // <--- Routes Spare Parts Catalog directly here
        return <CatalogView />;
      case "inventory":
        return <InventoryView globalSearch={searchQuery} />;
      case "sales":
        return <SalesView globalSearch={searchQuery} />;
      case "reports": 
        return <ReportsView />;
      case "settings": 
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