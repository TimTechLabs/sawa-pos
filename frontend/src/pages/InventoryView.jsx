import React, { useState, useEffect } from 'react';
import { Search, Boxes } from 'lucide-react';
import { getProducts } from '../utils/productService';

export default function InventoryView({ globalSearch = '' }) {
  const [inventory, setInventory] = useState([]);
  const [localSearch, setLocalSearch] = useState('');

  const loadData = () => {
    const products = getProducts();
    setInventory(products);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('sawa_products_updated', loadData);
    return () => window.removeEventListener('sawa_products_updated', loadData);
  }, []);

  const searchTerm = (localSearch || globalSearch || '').trim().toLowerCase();

  const filteredInventory = inventory.filter(item => {
    if (!searchTerm) return true;
    return (
      (item.name && item.name.toLowerCase().includes(searchTerm)) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm)) ||
      (item.category && item.category.toLowerCase().includes(searchTerm)) ||
      (item.model_compatibility && item.model_compatibility.toLowerCase().includes(searchTerm))
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="font-bold text-base text-[#111827]">Stock & Inventory Control</h3>
          <p className="text-xs text-gray-500">Monitor stock levels, reorder thresholds, and manual stock adjustments.</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Search inventory by part name or SKU..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600">
              <th className="p-4">Spare Part & SKU</th>
              <th className="p-4">Category</th>
              <th className="p-4">Cost Price (KES)</th>
              <th className="p-4">Selling Price (KES)</th>
              <th className="p-4">Current Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs text-[#111827]">
            {filteredInventory.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-12 text-center text-gray-400">
                  <Boxes className="w-8 h-8 mx-auto mb-2 stroke-1 text-gray-300" />
                  No products found matching "{searchTerm}".
                </td>
              </tr>
            ) : (
              filteredInventory.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="p-4 font-bold">
                    <div>{item.name}</div>
                    <div className="text-[10px] font-mono text-[#2563EB]">{item.sku}</div>
                  </td>
                  <td className="p-4 text-gray-600">{item.category}</td>
                  <td className="p-4">KES {Number(item.cost_price || 0).toLocaleString()}</td>
                  <td className="p-4 font-bold">KES {Number(item.price || 0).toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                      Number(item.stock) <= 5 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {item.stock} units
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}