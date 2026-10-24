import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

export default function ReceiptModal({ saleData, onClose }) {
  const contentRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `Receipt_${saleData?.receipt_number || 'SawaPOS'}`,
  });

  if (!saleData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        
        {/* Printable thermal receipt container attached to ref */}
        <div ref={contentRef} className="p-4 text-gray-800 font-mono text-sm bg-white">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold">SAWA MOTORCYCLE SPARES</h2>
            <p className="text-xs">Kitale, Kenya | Tel: +254 712 160 288</p>
            <p className="text-xs border-b border-dashed pb-2 mt-1">OFFICIAL SALES RECEIPT</p>
          </div>

          <div className="mb-3 text-xs space-y-1">
            <div className="flex justify-between"><span>Receipt No:</span> <span className="font-bold">{saleData.receipt_number}</span></div>
            <div className="flex justify-between"><span>Date:</span> <span>{saleData.date || new Date().toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Cashier:</span> <span>{saleData.cashier || "Carolyne Waruguru"}</span></div>
            <div className="flex justify-between"><span>Payment:</span> <span>{saleData.payment_method}</span></div>
          </div>

          <table className="w-full text-xs border-t border-b border-dashed my-2 py-1">
            <thead>
              <tr className="border-b border-dashed">
                <th className="text-left py-1">ITEM</th>
                <th className="text-center py-1">QTY</th>
                <th className="text-right py-1">PRICE</th>
                <th className="text-right py-1">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {saleData.items?.map((item, index) => (
                <tr key={index}>
                  <td className="py-1 truncate max-w-[120px]">{item.name}</td>
                  <td className="text-center py-1">{item.quantity}</td>
                  <td className="text-right py-1">{Number(item.unit_price).toLocaleString()}</td>
                  <td className="text-right py-1">{Number(item.line_total).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-1 text-xs pt-2 border-t border-dashed">
            <div className="flex justify-between font-bold text-sm">
              <span>GRAND TOTAL:</span>
              <span>KES {Number(saleData.total_amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Status:</span>
              <span className="font-semibold text-green-600">{saleData.status || "Completed"}</span>
            </div>
          </div>

          <div className="text-center mt-6 text-xs border-t border-dashed pt-3">
            <p>Asante sana! Karibu tena.</p>
            <p className="text-[10px] text-gray-500 mt-1">Powered by Sawa POS v1.0</p>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="mt-6 flex space-x-3 pt-2 border-t">
          <button
            onClick={() => handlePrint()}
            className="flex-1 bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition"
          >
            Print Receipt
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 py-2 rounded font-semibold hover:bg-gray-300 transition"
          >
            Close / New Sale
          </button>
        </div>

      </div>
    </div>
  );
}