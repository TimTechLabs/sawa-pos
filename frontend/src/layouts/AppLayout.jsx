import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout({ activeTab, setActiveTab, searchQuery, setSearchQuery, children }) {
  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-[#F5F7FA] font-sans text-[#17212B] overflow-hidden">
      {/* Sidebar Container */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#F5F7FA]">
        <div className="hidden md:block">
          <Topbar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </div>
        
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-[#F5F7FA]">
          {children}
        </main>
      </div>
    </div>
  );
}