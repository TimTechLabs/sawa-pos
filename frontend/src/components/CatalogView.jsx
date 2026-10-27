import React, { useState, useEffect } from 'react';
import { Search, Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import { getProducts, updateProduct, deleteProduct } from '../utils/productService';

export default function CatalogView() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);

  const loadCatalog = async () => {
    try {
      const data = await getProducts();
      setProducts(data || []);
    } catch (err) {
      console.error("Error loading products:", err);
    }
  };

  useEffect(() => {
    loadCatalog();

    // Listen for changes triggered elsewhere in the application
    const handleUpdates = () => loadCatalog();
    window.addEventListener("productsUpdated", handleUpdates);

    return () => window.removeEventListener("productsUpdated", handleUpdates);
  }, []);

  const handleDelete = async (sku) => {
    if (window.confirm('Are you sure you want to delete this spare part?')) {
      try {
        const updated = await deleteProduct(sku);
        setProducts(updated || products.filter(p => p.sku !== sku));
        // Trigger event so POSView and InventoryView instantly sync
        window.dispatchEvent(new Event("productsUpdated"));
      } catch (err) {
        console.error("Failed to delete product:", err);
      }
    }
  };

  // Handle image conversion to Base64 so it can render locally offline
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingProduct({ ...editingProduct, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      // Updates local storage, dispatches sync event, and posts to Django API
      await updateProduct(editingProduct);
      setEditingProduct(null);
      await loadCatalog();
      // Dispatch custom event to notify POSView
      window.dispatchEvent(new Event("productsUpdated"));
    } catch (err) {
      console.error("Failed to update product:", err);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#17212B]">Spare Parts Catalog</h2>
          <p className="text-xs text-[#64748B]">Manage, edit, and update stock items</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search parts by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#DCE3EA] pl-9 pr-3 py-2 text-xs rounded-lg focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Catalog Grid/Table */}
      <div className="bg-white border border-[#DCE3EA] rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-[#DCE3EA] text-[#64748B] font-semibold">
            <tr>
              <th className="p-3">Image</th>
              <th className="p-3">Part Name</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Price (KES)</th>
              <th className="p-3">Stock</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DCE3EA]">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-4 text-center text-[#64748B]">
                  No spare parts found matching your query.
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => (
                <tr key={p.sku} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-10 h-10 object-cover rounded border" />
                    ) : (
                      <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-[#64748B]">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    )}
                  </td>
                  <td className="p-3 font-semibold text-[#17212B]">{p.name}</td>
                  <td className="p-3 text-blue-600 font-mono">{p.sku}</td>
                  <td className="p-3 font-bold text-[#17212B]">
                    KES {Number(p.price || 0).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        p.stock > 5 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {p.stock} available
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => setEditingProduct(p)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit Item"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.sku)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                      title="Delete Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white border border-[#DCE3EA] p-6 rounded-xl w-full max-w-md space-y-4 shadow-xl"
          >
            <h3 className="font-bold text-sm text-[#17212B]">Edit Spare Part</h3>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#64748B]">Part Name</label>
              <input
                type="text"
                value={editingProduct.name || ''}
                onChange={(e) =>
                  setEditingProduct({ ...editingProduct, name: e.target.value })
                }
                className="w-full border border-[#DCE3EA] p-2 text-xs rounded focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#64748B]">Selling Price (KES)</label>
                <input
                  type="number"
                  value={editingProduct.price || 0}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      price: Number(e.target.value),
                    })
                  }
                  className="w-full border border-[#DCE3EA] p-2 text-xs rounded focus:outline-none focus:border-blue-600"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#64748B]">Current Stock</label>
                <input
                  type="number"
                  value={editingProduct.stock || 0}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      stock: Number(e.target.value),
                    })
                  }
                  className="w-full border border-[#DCE3EA] p-2 text-xs rounded focus:outline-none focus:border-blue-600"
                  required
                />
              </div>
            </div>

            {/* Image Upload Field */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#64748B]">Product Image</label>
              <div className="flex items-center gap-3">
                {editingProduct.image && (
                  <img src={editingProduct.image} alt="Preview" className="w-12 h-12 object-cover rounded border" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-xs text-[#64748B] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 text-xs font-semibold rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="flex-1 border border-[#DCE3EA] py-2 text-xs font-semibold rounded hover:bg-slate-50"
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