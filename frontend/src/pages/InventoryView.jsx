import React, { useState, useEffect } from 'react';
import { Search, Package, Plus, AlertCircle, Edit } from 'lucide-react';
import { getProducts, addProduct, updateProduct } from '../utils/productService';

export default function InventoryView({ globalSearch = '' }) {
  const [products, setProducts] = useState([]);
  const [localSearch, setLocalSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Braking',
    costPrice: '',
    price: '',
    stock: ''
  });

  const loadInventory = () => {
    try {
      const data = getProducts();
      // Ensure data is always an array to prevent .filter() crashes
      if (Array.isArray(data)) {
        setProducts(data);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Error loading inventory:", err);
      setProducts([]);
    }
  };

  useEffect(() => {
    loadInventory();

    const handleUpdates = () => loadInventory();
    window.addEventListener("sawa_products_updated", handleUpdates);
    window.addEventListener("productsUpdated", handleUpdates);

    return () => {
      window.removeEventListener("sawa_products_updated", handleUpdates);
      window.removeEventListener("productsUpdated", handleUpdates);
    };
  }, []);

  const searchQuery = globalSearch || localSearch;

  // Safe filter check
  const filteredProducts = Array.isArray(products) ? products.filter((p) =>
    (p.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (p.sku?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (p.category?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  ) : [];

  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.sku || !formData.price) {
      alert("Please fill in all required fields.");
      return;
    }

    const payload = {
      name: formData.name,
      sku: formData.sku,
      category: formData.category || 'General Spares',
      costPrice: Number(formData.costPrice || 0),
      price: Number(formData.price),
      stock: Number(formData.stock || 0)
    };

    if (editingItem) {
      updateProduct(payload);
    } else {
      addProduct(payload);
    }

    setFormData({ name: '', sku: '', category: 'Braking', costPrice: '', price: '', stock: '' });
    setIsAddModalOpen(false);
    setEditingItem(null);
    loadInventory();

    window.dispatchEvent(new Event("sawa_products_updated"));
    window.dispatchEvent(new Event("productsUpdated"));
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      sku: item.sku,
      category: item.category || 'General Spares',
      costPrice: item.costPrice || 0,
      price: item.price,
      stock: item.stock
    });
    setIsAddModalOpen(true);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8 font-sans text-[#1E293B]">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-[#DCE3EA]">
        <div>
          <h2 className="text-base font-bold text-[#111827] uppercase tracking-wider">
            Stock & Inventory Control
          </h2>
          <p className="text-xs text-[#6B7280]">
            Monitor stock levels, reorder thresholds, and manual stock adjustments in real time.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search inventory by name, SKU..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#DCE3EA] pl-9 pr-3 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-black"
            />
          </div>

          <button
            onClick={() => {
              setEditingItem(null);
              setFormData({ name: '', sku: '', category: 'Braking', costPrice: '', price: '', stock: '' });
              setIsAddModalOpen(true);
            }}
            className="px-3 py-2 bg-[#2563EB] text-white text-xs font-bold uppercase hover:bg-blue-700 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Spare Part
          </button>
        </div>
      </div>

      {/* Inventory Data Table */}
      <div className="border border-[#DCE3EA] bg-white overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[640px]">
          <thead className="bg-[#F3F4F6] border-b border-[#DCE3EA] text-[#374151] font-bold">
            <tr>
              <th className="p-3">Spare Part & SKU</th>
              <th className="p-3">Category</th>
              <th className="p-3">Cost Price (KES)</th>
              <th className="p-3">Selling Price (KES)</th>
              <th className="p-3">Current Stock</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DCE3EA]">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-6 text-center text-[#6B7280]">
                  No inventory items found.
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const isLowStock = p.stock <= 5;
                return (
                  <tr key={p.sku} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="p-3">
                      <div className="font-semibold text-[#111827]">{p.name}</div>
                      <div className="font-mono text-[10px] text-[#2563EB]">{p.sku}</div>
                    </td>
                    <td className="p-3 text-[#4B5563]">{p.category || 'General'}</td>
                    <td className="p-3 font-semibold text-[#4B5563]">
                      KES {Number(p.costPrice || p.price * 0.7).toLocaleString()}
                    </td>
                    <td className="p-3 font-bold text-[#111827]">
                      KES {Number(p.price || 0).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-1 text-[10px] font-bold border ${
                          isLowStock
                            ? 'border-[#DC2626] text-[#DC2626] bg-[#FEF2F2]'
                            : 'border-[#059669] text-[#059669] bg-[#ECFDF5]'
                        }`}
                      >
                        {p.stock} units
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => openEditModal(p)}
                        className="px-2.5 py-1 border border-[#DCE3EA] bg-white text-[#374151] hover:bg-[#F3F4F6] text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" /> Adjust / Restock
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Restock Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white border-2 border-[#111827] p-6 w-full max-w-md space-y-4"
          >
            <div className="border-b border-[#DCE3EA] pb-3 flex justify-between items-center">
              <h3 className="font-bold text-sm text-[#111827] uppercase tracking-wide">
                {editingItem ? 'Adjust / Restock Item' : 'Add New Spare Part'}
              </h3>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#374151] uppercase">Part Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Spark Plug (Bosch / NGK)"
                className="w-full border border-[#DCE3EA] p-2 text-xs bg-[#F9FAFB] focus:outline-none focus:border-black"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#374151] uppercase">SKU Code *</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="SPK-001"
                  disabled={!!editingItem}
                  className="w-full border border-[#DCE3EA] p-2 text-xs bg-[#F9FAFB] focus:outline-none focus:border-black disabled:bg-[#E5E7EB]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#374151] uppercase">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border border-[#DCE3EA] p-2 text-xs bg-[#F9FAFB] focus:outline-none focus:border-black"
                >
                  <option value="Electrical">Electrical</option>
                  <option value="Braking">Braking</option>
                  <option value="Transmission">Transmission</option>
                  <option value="Fluids">Fluids</option>
                  <option value="Tyres">Tyres</option>
                  <option value="General Spares">General Spares</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#374151] uppercase">Cost (KES)</label>
                <input
                  type="number"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  placeholder="220"
                  className="w-full border border-[#DCE3EA] p-2 text-xs bg-[#F9FAFB] focus:outline-none focus:border-black"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#374151] uppercase">Selling (KES) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="350"
                  className="w-full border border-[#DCE3EA] p-2 text-xs bg-[#F9FAFB] focus:outline-none focus:border-black"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#374151] uppercase">Stock Qty *</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="17"
                  className="w-full border border-[#DCE3EA] p-2 text-xs bg-[#F9FAFB] focus:outline-none focus:border-black"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-[#DCE3EA]">
              <button
                type="submit"
                className="flex-1 bg-[#2563EB] text-white py-2 text-xs font-bold uppercase hover:bg-blue-700"
              >
                Save Product
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingItem(null);
                }}
                className="flex-1 border border-[#DCE3EA] bg-white text-[#374151] py-2 text-xs font-bold uppercase hover:bg-[#F3F4F6]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}