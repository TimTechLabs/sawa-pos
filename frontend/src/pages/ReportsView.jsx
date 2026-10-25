import React, { useState, useEffect } from 'react';
import { TrendingUp, Printer, CheckCircle, Search, DollarSign, Smartphone, Banknote } from 'lucide-react';

const parseNumericTotal = (val) => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]+/g, '');
    return parseFloat(cleaned) || 0;
  }
  return 0;
};

export default function ReportsView() {
  const [transactions, setTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = () => {
    try {
      // Unify both storage keys so reports pull all transactions
      const history = JSON.parse(localStorage.getItem('sawa_sales_history') || '[]');
      const legacy = JSON.parse(localStorage.getItem('sawa_pos_transactions_v1') || '[]');
      
      // Combine and remove duplicates based on receiptNo / id
      const combined = [...history, ...legacy];
      const unique = Array.from(new Map(combined.map(item => [item.receiptNo || item.id, item])).values());
      
      setTransactions(unique);
    } catch (err) {
      console.error("Error loading report transactions:", err);
    }
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('sawa_products_updated', handleSync);
    window.addEventListener('productsUpdated', handleSync);
    return () => {
      window.removeEventListener('sawa_products_updated', handleSync);
      window.removeEventListener('productsUpdated', handleSync);
    };
  }, []);

  const totalRevenue = transactions.reduce((sum, tx) => sum + parseNumericTotal(tx.total || tx.amount), 0);
  const mpesaCount = transactions.filter(tx => tx.paymentMethod?.toLowerCase().includes('mpesa') || tx.paymentMethod?.toLowerCase().includes('m-pesa')).length;
  const cashCount = transactions.filter(tx => tx.paymentMethod?.toLowerCase().includes('cash')).length;

  const filteredTxns = transactions.filter(tx =>
    (tx.receiptNo || tx.id)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.paymentMethod?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="printable-report space-y-6 max-w-7xl mx-auto pb-10 font-sans text-[#1E293B]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-[#DCE3EA]">
        <div>
          <h2 className="text-base font-bold text-[#111827] uppercase tracking-wider">
            Business Performance & Sales Reports
          </h2>
          <p className="text-xs text-[#64748B]">
            Real-time analytics computed directly from store transaction ledgers (Kitale Branch).
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="no-print px-3.5 py-2 bg-[#2563EB] text-white text-xs font-bold uppercase hover:bg-blue-700 flex items-center gap-1.5"
        >
          <Printer className="w-4 h-4" /> Print Report
        </button>
      </div>

      {/* Summary Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#DCE3EA] p-4 flex justify-between items-start">
          <div>
            <div className="text-[11px] font-bold text-[#64748B] uppercase">Total Revenue</div>
            <div className="text-xl font-black text-[#111827] mt-1">KES {totalRevenue.toLocaleString()}</div>
            <div className="text-[10px] text-emerald-600 font-bold mt-1">Live store ledger</div>
          </div>
          <div className="w-8 h-8 bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-[#DCE3EA] p-4 flex justify-between items-start">
          <div>
            <div className="text-[11px] font-bold text-[#64748B] uppercase">Completed Transactions</div>
            <div className="text-xl font-black text-[#111827] mt-1">{transactions.length}</div>
            <div className="text-[10px] text-[#64748B] mt-1">Total checkouts recorded</div>
          </div>
          <div className="w-8 h-8 bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-[#DCE3EA] p-4 flex justify-between items-start">
          <div>
            <div className="text-[11px] font-bold text-[#64748B] uppercase">M-Pesa Checkouts</div>
            <div className="text-xl font-black text-[#111827] mt-1">{mpesaCount}</div>
            <div className="text-[10px] text-emerald-600 font-bold mt-1">Safaricom STK & Till</div>
          </div>
          <div className="w-8 h-8 bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold">
            <Smartphone className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-[#DCE3EA] p-4 flex justify-between items-start">
          <div>
            <div className="text-[11px] font-bold text-[#64748B] uppercase">Cash Checkouts</div>
            <div className="text-xl font-black text-[#111827] mt-1">{cashCount}</div>
            <div className="text-[10px] text-blue-600 font-bold mt-1">Physical cash sales</div>
          </div>
          <div className="w-8 h-8 bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold">
            <Banknote className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Detailed Sales Ledger Table */}
      <div className="bg-white border border-[#DCE3EA] p-4 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#DCE3EA] pb-3">
          <h3 className="font-bold text-xs text-[#111827] uppercase">Detailed Sales Ledger</h3>
          <div className="no-print relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search receipt ID or payment method..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#DCE3EA] pl-9 pr-3 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-black"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead className="bg-[#F3F4F6] border-b border-[#DCE3EA] text-[#374151] font-bold">
              <tr>
                <th className="p-3">Receipt No</th>
                <th className="p-3">Date / Time</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Payment Method</th>
                <th className="p-3 text-right">Amount (KES)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE3EA]">
              {filteredTxns.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-[#64748B]">
                    No completed sales recorded in the ledger yet. Process a checkout in the POS to populate reports.
                  </td>
                </tr>
              ) : (
                filteredTxns.map((tx, index) => (
                  <tr key={tx.receiptNo || tx.id || index} className="hover:bg-[#F9FAFB]">
                    <td className="p-3 font-mono font-bold text-[#2563EB]">{tx.receiptNo || tx.id}</td>
                    <td className="p-3 text-[#4B5563]">{tx.date}</td>
                    <td className="p-3 text-[#111827] font-semibold">{tx.customer || 'Walk-in Customer'}</td>
                    <td className="p-3">
                      <span className="inline-block px-2 py-0.5 bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] text-[10px] font-bold uppercase">
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3 text-right font-black text-[#111827]">
                      {tx.total || tx.amount}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}