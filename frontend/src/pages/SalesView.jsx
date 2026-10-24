import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Search, Calendar, Smartphone, Banknote, FileText, X, Printer } from 'lucide-react';

export default function SalesView() {
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const res = await api.get('sales/');
      setSales(res.data);
    } catch (err) {
      setSales([
        {
          id: 'TXN-9842',
          timestamp: '2026-10-20 09:32',
          customer: 'Walk-in Biker (Boxer BM 150)',
          payment_method: 'M-Pesa',
          reference: 'QJH82910KP',
          total: 3100,
          items: [
            { name: 'Spark Plug (Bosch / NGK)', qty: 2, price: 350 },
            { name: 'Drive Chain & Sprocket Kit', qty: 1, price: 2400 }
          ]
        },
        {
          id: 'TXN-9841',
          timestamp: '2026-10-19 12:15',
          customer: 'John Kamau (TVS Star HLX)',
          payment_method: 'Cash',
          reference: 'CASH-001',
          total: 650,
          items: [
            { name: 'Brake Shoes (Front/Rear)', qty: 1, price: 650 }
          ]
        },
        {
          id: 'TXN-9840',
          timestamp: '2026-10-19 10:04',
          customer: 'Boda Boda Stage 49',
          payment_method: 'M-Pesa',
          reference: 'QJH71029LM',
          total: 2550,
          items: [
            { name: 'Engine Oil (Total 4T 1L)', qty: 3, price: 850 }
          ]
        }
      ]);
    }
  };

  const filteredSales = sales.filter(s => 
    s.id.toLowerCase().includes(search.toLowerCase()) || 
    s.customer.toLowerCase().includes(search.toLowerCase()) ||
    s.reference.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#111827]">Sales & Receipts History</h2>
          <p className="text-xs text-gray-500">Track completed transactions, payment methods (M-Pesa & Cash), and print receipts.</p>
        </div>
        <div className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-medium text-gray-600 flex items-center gap-2 shadow-xs">
          <Calendar className="w-4 h-4 text-[#2563EB]" />
          <span>Showing records for Today & Yesterday</span>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input 
          type="text"
          placeholder="Search by transaction ID, customer name, or M-Pesa ref..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm outline-none"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 text-xs font-semibold uppercase">
            <tr>
              <th className="px-4 py-3">Transaction ID</th>
              <th className="px-4 py-3">Date & Time</th>
              <th className="px-4 py-3">Customer / Bike</th>
              <th className="px-4 py-3">Payment Method</th>
              <th className="px-4 py-3">Total Amount (KES)</th>
              <th className="px-4 py-3 text-right">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSales.map(sale => (
              <tr key={sale.id} className="hover:bg-gray-50/80 transition-colors">
                <td className="px-4 py-3 font-mono font-bold text-[#2563EB] text-xs">
                  {sale.id}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">{sale.timestamp}</td>
                <td className="px-4 py-3 font-medium text-[#111827] text-xs">{sale.customer}</td>
                <td className="px-4 py-3 text-xs">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold ${
                    sale.payment_method === 'M-Pesa' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {sale.payment_method === 'M-Pesa' ? <Smartphone className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                    {sale.payment_method} ({sale.reference})
                  </span>
                </td>
                <td className="px-4 py-3 font-bold text-[#111827]">
                  KES {sale.total.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button 
                    onClick={() => setSelectedReceipt(sale)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 ml-auto cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#2563EB]" /> View Receipt
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 print-receipt-container">
            <div className="flex items-center justify-between border-b pb-3 no-print">
              <h3 className="font-bold text-base text-[#111827]">Receipt Preview</h3>
              <button onClick={() => setSelectedReceipt(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thermal Receipt Paper Layout */}
            <div className="bg-white font-mono text-xs p-4 rounded-xl border border-dashed border-gray-300 space-y-3 text-black">
              <div className="text-center space-y-0.5">
                <h4 className="font-bold text-sm tracking-wide">SAWA MOTORCYCLE SPARES</h4>
                <p className="text-[10px] text-gray-600">Kitale, P.O. Box 30200</p>
                <p className="text-[10px] text-gray-600">Tel: +254 712 345 678</p>
              </div>

              <div className="border-t border-b border-gray-300 py-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Receipt ID:</span>
                  <span className="font-bold">{selectedReceipt.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{selectedReceipt.timestamp}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cashier:</span>
                  <span>Carolyne Waruguru</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment:</span>
                  <span className="font-bold text-[#2563EB]">{selectedReceipt.payment_method} ({selectedReceipt.reference})</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-gray-600 uppercase flex justify-between">
                  <span>Item</span>
                  <span>Total</span>
                </div>
                {selectedReceipt.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <div>
                      <div>{item.name}</div>
                      <div className="text-[10px] text-gray-600">{item.qty} x KES {item.price.toLocaleString()}</div>
                    </div>
                    <span className="font-bold">KES {(item.qty * item.price).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-300 pt-2 flex justify-between font-bold text-sm text-black">
                <span>TOTAL PAID:</span>
                <span>KES {selectedReceipt.total.toLocaleString()}</span>
              </div>

              <div className="text-center text-[10px] text-gray-600 pt-2 border-t border-gray-200">
                <p>Karibu Tena! No goods returned after 48 hrs.</p>
                <p className="font-semibold text-[#2563EB] mt-1">Powered by Sawa POS</p>
              </div>
            </div>

            <div className="flex gap-2 no-print">
              <button 
                onClick={() => window.print()} 
                className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Thermal Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}