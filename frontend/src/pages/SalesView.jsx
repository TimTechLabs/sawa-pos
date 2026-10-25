import React, { useState, useEffect } from 'react';
import { Receipt, Search, Printer, CheckCircle } from 'lucide-react';

export default function SalesView() {
  const [transactions, setTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const loadTransactions = () => {
    try {
      const stored = localStorage.getItem('sawa_sales_history');
      if (stored) {
        setTransactions(JSON.parse(stored));
      } else {
        const defaults = [
          { receiptNo: 'SAWA-1051', date: '2026-10-25 10:00', cashier: 'Carolyne Waruguru', customer: 'John Kamau', paymentMethod: 'M-Pesa (Q8291OP)', total: 'KES 3,100', cart: [{ name: 'Brake Shoes (Front/Rear)', qty: 2, price: 1550 }] },
          { receiptNo: 'SAWA-1042', date: '2026-10-25 09:15', cashier: 'Carolyne Waruguru', customer: 'Walk-in Customer (Kitale)', paymentMethod: 'Cash (CASH-001)', total: 'KES 650', cart: [{ name: 'Spark Plug (Bosch / NGK)', qty: 1, price: 650 }] }
        ];
        localStorage.setItem('sawa_sales_history', JSON.stringify(defaults));
        setTransactions(defaults);
      }
    } catch (err) {
      console.error("Error loading transactions:", err);
    }
  };

  useEffect(() => {
    loadTransactions();
    const handleSync = () => loadTransactions();
    window.addEventListener('sawa_products_updated', handleSync);
    window.addEventListener('productsUpdated', handleSync);
    return () => {
      window.removeEventListener('sawa_products_updated', handleSync);
      window.removeEventListener('productsUpdated', handleSync);
    };
  }, []);

  const filteredTxns = transactions.filter(tx =>
    (tx.receiptNo || tx.id)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.paymentMethod?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8 font-sans text-[#1E293B]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-[#DCE3EA]">
        <div>
          <h2 className="text-base font-bold text-[#111827] uppercase tracking-wider">
            Sales & Receipts History
          </h2>
          <p className="text-xs text-[#64748B]">
            Track completed transactions, payment methods (M-Pesa & cash), and print receipts.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search transaction ID or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F9FAFB] border border-[#DCE3EA] pl-9 pr-3 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-black"
          />
        </div>
      </div>

      <div className="border border-[#DCE3EA] bg-white overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[640px]">
          <thead className="bg-[#F3F4F6] border-b border-[#DCE3EA] text-[#374151] font-bold">
            <tr>
              <th className="p-3">Transaction ID</th>
              <th className="p-3">Date & Time</th>
              <th className="p-3">Customer / Branch</th>
              <th className="p-3">Payment Method</th>
              <th className="p-3">Total Amount</th>
              <th className="p-3 text-right">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DCE3EA]">
            {filteredTxns.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-6 text-center text-[#64748B]">
                  No sales receipts found. Complete a checkout in POS to record transactions.
                </td>
              </tr>
            ) : (
              filteredTxns.map((tx, idx) => (
                <tr key={tx.receiptNo || tx.id || idx} className="hover:bg-[#F9FAFB]">
                  <td className="p-3 font-mono font-bold text-[#2563EB]">{tx.receiptNo || tx.id}</td>
                  <td className="p-3 text-[#4B5563]">{tx.date}</td>
                  <td className="p-3 text-[#111827] font-semibold">{tx.customer || 'Walk-in Customer (Kitale)'}</td>
                  <td className="p-3">
                    <span className="inline-block px-2 py-0.5 bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] text-[10px] font-bold uppercase">
                      {tx.paymentMethod}
                    </span>
                  </td>
                  <td className="p-3 font-black text-[#111827]">{tx.total || tx.amount}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setSelectedReceipt(tx)}
                      className="px-2.5 py-1 border border-[#DCE3EA] bg-white text-[#374151] hover:bg-[#F3F4F6] text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <Receipt className="w-3.5 h-3.5" /> View Receipt
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div id="printable-receipt" className="bg-white border border-[#DCE3EA] w-full max-w-sm p-6 space-y-4 text-xs mx-auto rounded-none shadow-none">
            <div className="text-center space-y-1 border-b border-dashed border-[#DCE3EA] pb-3">
              <h3 className="font-bold text-sm text-[#17212B]">SAWA MOTORCYCLE SPARES</h3>
              <p className="text-[10px] text-[#64748B]">Kitale Branch, P.O. Box 30200</p>
              <p className="text-[10px] text-[#64748B]">Tel: +254712160288</p>
              <p className="text-[10px] font-bold text-[#17212B]">Receipt #: {selectedReceipt.receiptNo || selectedReceipt.id}</p>
              <p className="text-[10px] text-[#64748B]">Date & Time: {selectedReceipt.date}</p>
              <p className="text-[10px] text-[#64748B]">Cashier: {selectedReceipt.cashier || 'Carolyne Waruguru'}</p>
            </div>

            <div className="space-y-2 border-b border-dashed border-[#DCE3EA] pb-3 max-h-36 overflow-y-auto">
              {selectedReceipt.cart && selectedReceipt.cart.length > 0 ? (
                selectedReceipt.cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[#17212B]">
                    <span>{item.name}</span>
                    <span className="font-bold">{item.qty || item.quantity || 1} × KES {item.price}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between text-[#17212B]">
                  <span>General Spare Parts Purchase</span>
                  <span className="font-bold">1 × {selectedReceipt.total || selectedReceipt.amount}</span>
                </div>
              )}
            </div>

            <div className="space-y-1 border-b border-dashed border-[#DCE3EA] pb-3">
              <div className="flex justify-between font-bold text-sm text-[#17212B]">
                <span>TOTAL PAID</span>
                <span>{selectedReceipt.total || selectedReceipt.amount}</span>
              </div>
              <div className="flex justify-between text-[10px] text-[#64748B]">
                <span>PAYMENT METHOD</span>
                <span className="font-semibold uppercase">{selectedReceipt.paymentMethod}</span>
              </div>
            </div>

            <div className="text-center pt-1 text-[10px] text-[#64748B] italic">
              Asante sana! Karibu tena Kitale Branch.
            </div>

            <div className="flex gap-3 pt-3 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 font-semibold text-xs flex items-center justify-center gap-1 rounded-none"
              >
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="flex-1 border border-[#DCE3EA] bg-white hover:bg-slate-50 text-[#17212B] py-2.5 font-semibold text-xs rounded-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}