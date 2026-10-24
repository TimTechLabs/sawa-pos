import React, { useState, useEffect } from 'react';
import { FileBarChart, TrendingUp, ShoppingBag, Boxes, DollarSign, Printer } from 'lucide-react';

export default function ReportsView() {
  const [salesLedger, setSalesLedger] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const ledger = JSON.parse(localStorage.getItem('sawa_sales_ledger') || '[]');
    setSalesLedger(ledger);
  }, []);

  // Compute metrics from actual sales data
  const totalRevenue = salesLedger.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const totalTransactions = salesLedger.length;
  const mpesaCount = salesLedger.filter(item => item.paymentMethod === 'mpesa' || item.payment_method === 'mpesa').length;
  const cashCount = totalTransactions - mpesaCount;

  return (
    <div className="space-y-6 max-w-6xl pb-10">
      {/* Header filter controls */}
      <div className="bg-white border border-[#DCE3EA] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-sm text-[#17212B]">Business Performance & Sales Reports</h3>
          <p className="text-xs text-[#64748B]">Real-time analytics computed directly from store transaction ledgers.</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-slate-50 border border-[#DCE3EA] px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
          >
            <option value="all">All Time Records</option>
            <option value="today">Today's Shift</option>
            <option value="week">This Week</option>
          </select>
          <button 
            onClick={() => window.print()} 
            className="border border-[#DCE3EA] bg-white hover:bg-slate-50 text-[#17212B] text-xs font-semibold px-3 py-1.5 flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Revenue" value={`KES ${totalRevenue.toLocaleString()}`} icon={DollarSign} color="text-blue-600" bg="bg-blue-50 border-blue-200" />
        <MetricCard title="Completed Transactions" value={totalTransactions} icon={ShoppingBag} color="text-emerald-700" bg="bg-emerald-50 border-emerald-200" />
        <MetricCard title="M-Pesa Checkouts" value={mpesaCount} icon={TrendingUp} color="text-emerald-700" bg="bg-emerald-50 border-emerald-200" />
        <MetricCard title="Cash Checkouts" value={cashCount} icon={Boxes} color="text-amber-700" bg="bg-amber-50 border-amber-200" />
      </div>

      {/* Transactions Ledger Table */}
      <div className="bg-white border border-[#DCE3EA] overflow-hidden">
        <div className="p-4 border-b border-[#DCE3EA]">
          <h4 className="font-bold text-xs text-[#17212B] uppercase tracking-wider">Detailed Sales Ledger</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-[#DCE3EA] text-[11px] font-bold text-[#64748B] uppercase">
                <th className="p-3">Receipt No</th>
                <th className="p-3">Date / Time</th>
                <th className="p-3">Payment Method</th>
                <th className="p-3 text-right">Amount (KES)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE3EA] text-xs">
              {salesLedger.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-[#64748B]">
                    No completed sales recorded in the ledger yet. Process a checkout in the POS to populate reports.
                  </td>
                </tr>
              ) : (
                salesLedger.map((sale, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-[#17212B]">{sale.receiptNo || sale.receipt_no || 'SAWA-9921'}</td>
                    <td className="p-3 text-[#64748B]">{sale.date || new Date().toLocaleString()}</td>
                    <td className="p-3">
                      <span className="uppercase text-[10px] font-bold px-2 py-0.5 bg-slate-100 border border-[#DCE3EA] text-[#17212B]">
                        {sale.paymentMethod || 'Cash'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-[#17212B]">KES {(Number(sale.total) || 0).toLocaleString()}</td>
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

function MetricCard({ title, value, icon: Icon, color, bg }) {
  return (
    <div className="bg-white border border-[#DCE3EA] p-4 flex items-center justify-between">
      <div>
        <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">{title}</div>
        <div className="text-lg font-bold text-[#17212B] mt-1">{value}</div>
      </div>
      <div className={`w-10 h-10 flex items-center justify-center border ${bg} ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}