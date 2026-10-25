import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  Plus, 
  CheckCircle2, 
  Boxes, 
  ArrowUpRight 
} from 'lucide-react';
import { getProducts, addProduct } from '../utils/productService';
import sideImg from '../assets/side.jpg';

// Helper function to safely parse totals whether they are numbers, strings, or undefined
const parseNumericTotal = (val) => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]+/g, '');
    return parseFloat(cleaned) || 0;
  }
  return 0;
};

export default function DashboardView({ setActiveTab }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [salesLedger, setSalesLedger] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '', sku: '', category: 'Electrical', price: '', cost_price: '', stock: '', compatibility: ''
  });

  const loadData = () => {
    try {
      const ledger = JSON.parse(localStorage.getItem('sawa_sales_history') || '[]');
      setSalesLedger(Array.isArray(ledger) ? ledger : []);

      const prods = getProducts();
      setProducts(Array.isArray(prods) ? prods : []);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for real-time synchronization events across tabs and views
    const handleSync = () => loadData();
    window.addEventListener("sawa_products_updated", handleSync);
    window.addEventListener("productsUpdated", handleSync);

    return () => {
      window.removeEventListener("sawa_products_updated", handleSync);
      window.removeEventListener("productsUpdated", handleSync);
    };
  }, []);

  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.stock || !formData.sku) {
      setErrorMsg('Please fill in all required fields (Name, SKU, Price, Stock).');
      return;
    }
    
    const newProductPayload = {
      name: formData.name.trim(),
      sku: formData.sku.trim().toUpperCase(),
      category: formData.category || 'General Spares',
      costPrice: Number(formData.cost_price || formData.price * 0.7),
      price: Number(formData.price),
      stock: Number(formData.stock),
      compatibility: formData.compatibility || 'Universal / Boxer / TVS'
    };

    // Save using shared service
    addProduct(newProductPayload);

    setSuccessMsg('Spare part successfully saved and synchronized across Inventory, Catalog, and POS!');
    setIsAddModalOpen(false);
    setTimeout(() => setSuccessMsg(''), 4000);
    setFormData({ name: '', sku: '', category: 'Electrical', price: '', cost_price: '', stock: '', compatibility: '' });
    loadData();
  };

  // Calculations from actual offline sales ledger safely using parseNumericTotal
  const todayStr = new Date().toDateString();
  const todaysSalesTotal = salesLedger
    .filter(s => new Date(s.date || Date.now()).toDateString() === todayStr)
    .reduce((sum, s) => sum + parseNumericTotal(s.total || s.amount), 0);
  
  const totalTransactionsCount = salesLedger.length;
  const lowStockCount = products.filter(p => p.stock <= 5).length;

  // Weekly sales aggregation (Mon - Sun) connected to offline ledger
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeklyData = daysOfWeek.map((day, idx) => {
    const dayTotal = salesLedger
      .filter(s => {
        const d = new Date(s.date || Date.now());
        const dayIndex = (d.getDay() + 6) % 7;
        return dayIndex === idx;
      })
      .reduce((sum, s) => sum + parseNumericTotal(s.total || s.amount), 0);
    return { day, amount: dayTotal };
  });

  const maxWeeklyAmount = Math.max(...weeklyData.map(d => d.amount), 5000);

  return (
    <div className="space-y-6 pb-10">
      {/* Success Notification Banner */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Welcome Hero Banner */}
      <div className="bg-white border border-[#DCE3EA] p-6 flex flex-col lg:flex-row items-center justify-between gap-6" style={{ boxShadow: 'none' }}>
        <div className="flex-1 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 border border-blue-200">
            Sawa MotoManager
          </span>
          <h1 className="text-xl font-bold text-[#17212B]">
            Welcome Back, Carolyne Waruguru.
          </h1>
          <p className="text-xs text-[#64748B]">
            Manage your Kenyan motorcycle spare parts inventory, process M-Pesa & cash checkouts, and monitor daily shop performance from your professional dashboard.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button 
              onClick={() => setActiveTab('pos')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 flex items-center gap-2 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Open POS Checkout</span>
            </button>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-white hover:bg-slate-50 text-[#17212B] border border-[#DCE3EA] text-xs font-semibold px-4 py-2 flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
            <button 
              onClick={() => setActiveTab('inventory')}
              className="bg-white hover:bg-slate-50 text-[#17212B] border border-[#DCE3EA] text-xs font-semibold px-4 py-2 flex items-center gap-2 transition-colors"
            >
              <Boxes className="w-4 h-4" />
              <span>Manage Inventory</span>
            </button>
          </div>
        </div>

        {/* side.jpg image container */}
        <div className="w-full lg:w-72 h-36 border border-[#DCE3EA] overflow-hidden flex-shrink-0 bg-slate-100">
          <img 
            src={sideImg} 
            alt="Motorcycle Spares Inventory" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Statistics Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Today's Sales" 
          value={`KES ${todaysSalesTotal.toLocaleString()}`} 
          change="+12% from yesterday" 
          icon={TrendingUp} 
        />
        <MetricCard 
          title="Completed Transactions" 
          value={totalTransactionsCount} 
          change="Completed today" 
          icon={ShoppingCart} 
        />
        <MetricCard 
          title="Total Inventory Items" 
          value={products.length} 
          change="Active parts catalog" 
          icon={Package} 
        />
        <MetricCard 
          title="Low-Stock Alerts" 
          value={`${lowStockCount} parts`} 
          change="Requires reordering" 
          icon={AlertTriangle} 
        />
      </div>

      {/* Weekly Sales Performance Graph Section */}
      <div className="bg-white border border-[#DCE3EA] p-5 space-y-4" style={{ boxShadow: 'none' }}>
        <div className="flex items-center justify-between border-b border-[#DCE3EA] pb-3">
          <div>
            <h3 className="font-bold text-sm text-[#17212B]">Weekly Sales Performance (Mon - Sun)</h3>
            <p className="text-[11px] text-[#64748B]">Actual offline revenue tracked across the current operational week in KES.</p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 border border-[#DCE3EA] px-2 py-1 text-[#17212B]">
            Live Offline Ledger
          </span>
        </div>

        {/* Dynamic Graph Visualizer */}
        <div className="pt-4 pb-2 flex items-end justify-between gap-2 h-48 border-b border-[#DCE3EA] px-4">
          {weeklyData.map((item, index) => {
            const heightPercent = maxWeeklyAmount > 0 ? (item.amount / maxWeeklyAmount) * 100 : 0;
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[10px] font-bold text-[#64748B] opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.amount > 0 ? `KES ${item.amount.toLocaleString()}` : '0'}
                </div>
                <div 
                  style={{ height: `${Math.max(heightPercent, 6)}%` }} 
                  className={`w-full max-w-[40px] transition-all duration-300 ${
                    item.amount > 0 ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                />
                <span className="text-[11px] font-bold text-[#17212B] mt-1">{item.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Supporting Operations & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#DCE3EA] p-5 space-y-4" style={{ boxShadow: 'none' }}>
          <div className="flex items-center justify-between border-b border-[#DCE3EA] pb-3">
            <h3 className="font-bold text-sm text-[#17212B]">Recent Transactions</h3>
            <button 
              onClick={() => setActiveTab('sales')}
              className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {salesLedger.length === 0 ? (
              <p className="text-xs text-[#64748B] py-6 text-center">No recent transactions recorded yet.</p>
            ) : (
              salesLedger.slice(-5).reverse().map((sale, i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-[#DCE3EA] bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-xs">
                      POS
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#17212B]">{sale.receiptNo || sale.id || 'SAWA-REC'}</div>
                      <div className="text-[10px] text-[#64748B]">{sale.date || 'Today'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-[#17212B]">
                      {typeof sale.total === 'number' ? `KES ${sale.total.toLocaleString()}` : (sale.total || sale.amount || 'KES 0')}
                    </div>
                    <span className="text-[9px] uppercase font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5">
                      {sale.paymentMethod || 'Cash'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Quick Watch */}
        <div className="bg-white border border-[#DCE3EA] p-5 space-y-4" style={{ boxShadow: 'none' }}>
          <div className="border-b border-[#DCE3EA] pb-3">
            <h3 className="font-bold text-sm text-[#17212B]">Low-Stock Watchlist</h3>
          </div>
          <div className="space-y-3">
            {products.filter(p => p.stock <= 5).length === 0 ? (
              <p className="text-xs text-[#64748B] py-4 text-center">All inventory stock levels are optimal.</p>
            ) : (
              products.filter(p => p.stock <= 5).slice(0, 4).map((item) => (
                <div key={item.sku} className="p-3 border border-blue-200 bg-blue-50/30 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#17212B]">{item.name}</div>
                    <div className="text-[10px] text-blue-800">Stock remaining: {item.stock} units</div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('inventory')}
                    className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 font-semibold"
                  >
                    Restock
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#DCE3EA] w-full max-w-lg p-6 space-y-4" style={{ boxShadow: 'none' }}>
            <div className="flex justify-between items-center border-b border-[#DCE3EA] pb-3">
              <h3 className="font-bold text-sm text-[#17212B]">Add New Spare Part</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-xs text-[#64748B] hover:text-black">✕</button>
            </div>
            
            {errorMsg && <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5">{errorMsg}</div>}

            <form onSubmit={handleAddProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#17212B] mb-1">Part Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Clutch Cable - Bajaj Boxer"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-50 border border-[#DCE3EA] px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#17212B] mb-1">SKU Code *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. CLT-007"
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    className="w-full bg-slate-50 border border-[#DCE3EA] px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#17212B] mb-1">Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-slate-50 border border-[#DCE3EA] px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="Electrical">Electrical</option>
                    <option value="Engine">Engine</option>
                    <option value="Body">Body</option>
                    <option value="Brakes">Brakes</option>
                    <option value="Transmission">Transmission</option>
                    <option value="Tyres">Tyres</option>
                    <option value="Fluids">Fluids</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#17212B] mb-1">Selling Price (KES) *</label>
                  <input 
                    type="number" 
                    required
                    placeholder="1200"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full bg-slate-50 border border-[#DCE3EA] px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#17212B] mb-1">Initial Stock Qty *</label>
                  <input 
                    type="number" 
                    required
                    placeholder="20"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    className="w-full bg-slate-50 border border-[#DCE3EA] px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-[#DCE3EA] flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-[#DCE3EA] text-xs font-medium text-[#17212B] bg-white hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Single Uniform Accent Color Metric Card Component
function MetricCard({ title, value, change, icon: Icon }) {
  return (
    <div className="bg-white border border-[#DCE3EA] p-4 flex items-center justify-between" style={{ boxShadow: 'none' }}>
      <div>
        <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">{title}</div>
        <div className="text-lg font-bold text-[#17212B] mt-1">{value}</div>
        <div className="text-[11px] font-medium text-blue-600 mt-1">{change}</div>
      </div>
      <div className="w-10 h-10 flex items-center justify-center border border-blue-200 bg-blue-50 text-blue-600">
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}