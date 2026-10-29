
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

// Safely parse totals whether they are numbers, strings, or undefined.
const parseNumericTotal = (val) => {
  if (typeof val === 'number') return val;

  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]+/g, '');
    return parseFloat(cleaned) || 0;
  }

  return 0;
};

// Check whether a sale happened today.
const isToday = (dateString) => {
  if (!dateString) return false;

  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return false;

  const today = new Date();

  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

export default function DashboardView({ setActiveTab }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [salesLedger, setSalesLedger] = useState([]);
  const [products, setProducts] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Electrical',
    price: '',
    cost_price: '',
    stock: '',
    compatibility: '',
    image: ''
  });

  const loadData = () => {
    try {
      const ledger = JSON.parse(
        localStorage.getItem('sawa_sales_history') || '[]'
      );

      const legacy = JSON.parse(
        localStorage.getItem('sawa_pos_transactions_v1') || '[]'
      );

      const combined = [
        ...(Array.isArray(ledger) ? ledger : []),
        ...(Array.isArray(legacy) ? legacy : [])
      ];

      const unique = Array.from(
        new Map(
          combined.map((item, index) => [
            item.receiptNo || item.id || `unknown-${index}`,
            item
          ])
        ).values()
      );

      setSalesLedger(unique);

      const prods = getProducts();
      setProducts(Array.isArray(prods) ? prods : []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  useEffect(() => {
    loadData();

    const handleSync = () => loadData();

    window.addEventListener('sawa_products_updated', handleSync);
    window.addEventListener('productsUpdated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('sawa_products_updated', handleSync);
      window.removeEventListener('productsUpdated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        image: reader.result
      }));
    };

    reader.readAsDataURL(file);
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (
      !formData.name.trim() ||
      !formData.price ||
      !formData.stock ||
      !formData.sku.trim()
    ) {
      setErrorMsg(
        'Please fill in all required fields (Name, SKU, Price, Stock).'
      );
      return;
    }

    if (
      Number(formData.price) < 0 ||
      Number(formData.stock) < 0 ||
      !Number.isFinite(Number(formData.price)) ||
      !Number.isFinite(Number(formData.stock))
    ) {
      setErrorMsg('Price and stock must be valid, non-negative numbers.');
      return;
    }

    const newProductPayload = {
      name: formData.name.trim(),
      sku: formData.sku.trim().toUpperCase(),
      category: formData.category || 'General Spares',
      costPrice: Number(formData.cost_price || Number(formData.price) * 0.7),
      price: Number(formData.price),
      stock: Number(formData.stock),
      compatibility: formData.compatibility || 'Universal / Boxer / TVS',
      image: formData.image || ''
    };

    try {
      addProduct(newProductPayload);

      setSuccessMsg(
        'Spare part successfully saved and synchronized across Inventory, Catalog, and POS!'
      );
      setIsAddModalOpen(false);
      setErrorMsg('');

      window.setTimeout(() => setSuccessMsg(''), 4000);

      setFormData({
        name: '',
        sku: '',
        category: 'Electrical',
        price: '',
        cost_price: '',
        stock: '',
        compatibility: '',
        image: ''
      });

      loadData();
    } catch (err) {
      console.error('Error saving product:', err);
      setErrorMsg('Unable to save the product. Please try again.');
    }
  };

  const todaysSalesTotal = salesLedger
    .filter((sale) => isToday(sale.date))
    .reduce(
      (sum, sale) =>
        sum + parseNumericTotal(sale.total || sale.amount),
      0
    );

  const totalTransactionsCount = salesLedger.length;
  const lowStockProducts = products.filter(
    (product) => Number(product.stock) <= 5
  );
  const lowStockCount = lowStockProducts.length;

  // Aggregate recorded sales by day of the week, Monday through Sunday.
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const weeklyData = daysOfWeek.map((day, idx) => {
    const dayTotal = salesLedger
      .filter((sale) => {
        if (!sale.date) return false;

        const date = new Date(sale.date);

        if (Number.isNaN(date.getTime())) return false;

        const dayIndex = (date.getDay() + 6) % 7;
        return dayIndex === idx;
      })
      .reduce(
        (sum, sale) =>
          sum + parseNumericTotal(sale.total || sale.amount),
        0
      );

    return { day, amount: dayTotal };
  });

  const maxWeeklyAmount = Math.max(
    ...weeklyData.map((day) => day.amount),
    5000
  );

  const updateFormField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setErrorMsg('');
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-4 pb-6 sm:space-y-6 sm:pb-10">
      {/* Success notification */}
      {successMsg && (
        <div
          role="status"
          className="flex min-w-0 items-start gap-2 border border-emerald-300 bg-emerald-50 px-3 py-3 text-xs text-emerald-800 sm:px-4"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span className="min-w-0 break-words">{successMsg}</span>
        </div>
      )}

      {/* Welcome banner */}
      <section className="flex min-w-0 flex-col items-stretch justify-between gap-4 border border-[#DCE3EA] bg-white p-3 sm:gap-6 sm:p-5 lg:flex-row lg:items-center lg:p-6">
        <div className="min-w-0 flex-1 space-y-3">
          <span className="inline-block border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600">
            Sawa MotoManager
          </span>

          <h1 className="break-words text-lg font-bold text-[#17212B] sm:text-xl">
            Welcome Back, Carolyne Waruguru.
          </h1>

          <p className="text-xs leading-5 text-[#64748B] sm:text-sm">
            Manage your Kenyan motorcycle spare parts inventory, process
            M-Pesa and cash checkouts, and monitor daily shop performance
            from your professional dashboard.
          </p>

          <div className="flex min-w-0 flex-col items-stretch gap-2 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className="flex min-h-10 w-full items-center justify-center gap-2 bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 sm:w-auto sm:px-4"
            >
              <ShoppingCart className="h-4 w-4 shrink-0" />
              <span>Open POS Checkout</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setIsAddModalOpen(true);
              }}
              className="flex min-h-10 w-full items-center justify-center gap-2 border border-[#DCE3EA] bg-white px-3 py-2 text-xs font-semibold text-[#17212B] transition-colors hover:bg-slate-50 sm:w-auto sm:px-4"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Add Product</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className="flex min-h-10 w-full items-center justify-center gap-2 border border-[#DCE3EA] bg-white px-3 py-2 text-xs font-semibold text-[#17212B] transition-colors hover:bg-slate-50 sm:w-auto sm:px-4"
            >
              <Boxes className="h-4 w-4 shrink-0" />
              <span>Manage Inventory</span>
            </button>
          </div>
        </div>

        <div className="h-36 w-full shrink-0 overflow-hidden border border-[#DCE3EA] bg-slate-100 sm:h-44 lg:h-40 lg:w-72">
          <img
            src={sideImg}
            alt="Motorcycle spare parts"
            className="h-full w-full object-cover"
          />
        </div>
      </section>

      {/* Statistics cards */}
      <section
        aria-label="Shop statistics"
        className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4"
      >
        <MetricCard
          title="Today's Sales"
          value={`KES ${todaysSalesTotal.toLocaleString()}`}
          change="Recorded sales today"
          icon={TrendingUp}
        />

        <MetricCard
          title="Completed Transactions"
          value={totalTransactionsCount.toLocaleString()}
          change="Recorded transactions"
          icon={ShoppingCart}
        />

        <MetricCard
          title="Total Inventory Items"
          value={products.length.toLocaleString()}
          change="Active parts catalog"
          icon={Package}
        />

        <MetricCard
          title="Low-Stock Alerts"
          value={`${lowStockCount} parts`}
          change="Requires reordering"
          icon={AlertTriangle}
        />
      </section>

      {/* Weekly sales graph */}
      <section className="min-w-0 space-y-4 border border-[#DCE3EA] bg-white p-3 sm:p-5">
        <div className="flex min-w-0 flex-col gap-2 border-b border-[#DCE3EA] pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#17212B]">
              Weekly Sales Performance
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-[#64748B]">
              Monday to Sunday · Recorded revenue in KES
            </p>
          </div>

          <span className="self-start border border-[#DCE3EA] bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[#17212B] sm:self-auto">
            Offline Ledger
          </span>
        </div>

        <div
          role="img"
          aria-label="Weekly sales chart showing recorded sales for Monday through Sunday"
          className="flex h-52 min-w-0 items-end justify-between gap-1 border-b border-[#DCE3EA] px-1 pb-2 pt-3 sm:gap-2 sm:px-4"
        >
          {weeklyData.map((item) => {
            const heightPercent =
              maxWeeklyAmount > 0
                ? (item.amount / maxWeeklyAmount) * 100
                : 0;

            return (
              <div
                key={item.day}
                className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
              >
                <span
                  className="max-w-full truncate text-center text-[9px] font-semibold text-[#64748B] sm:text-[10px]"
                  title={`KES ${item.amount.toLocaleString()}`}
                >
                  {item.amount > 0
                    ? item.amount.toLocaleString()
                    : '0'}
                </span>

                <div
                  className={`w-full max-w-[40px] transition-all duration-300 ${
                    item.amount > 0 ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                  style={{
                    height: `${Math.max(heightPercent, 6)}%`
                  }}
                />

                <span className="mt-1 text-[10px] font-bold text-[#17212B] sm:text-[11px]">
                  {item.day}
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-[10px] leading-4 text-[#64748B]">
          Figures depend on the sales records available on this device.
        </p>
      </section>

      {/* Recent transactions and low-stock watchlist */}
      <section className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        {/* Recent transactions */}
        <div className="min-w-0 space-y-4 border border-[#DCE3EA] bg-white p-3 sm:p-5 lg:col-span-2">
          <div className="flex min-w-0 items-center justify-between gap-2 border-b border-[#DCE3EA] pb-3">
            <h2 className="min-w-0 text-sm font-bold text-[#17212B]">
              Recent Transactions
            </h2>

            <button
              type="button"
              onClick={() => setActiveTab('sales')}
              className="flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
            >
              <span>View All</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="min-w-0 space-y-2">
            {salesLedger.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#64748B]">
                No recent transactions recorded yet.
              </p>
            ) : (
              salesLedger
                .slice(-5)
                .reverse()
                .map((sale, index) => (
                  <div
                    key={sale.receiptNo || sale.id || index}
                    className="flex min-w-0 flex-col gap-3 border border-[#DCE3EA] bg-slate-50/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-blue-200 bg-blue-50 text-xs font-bold text-blue-600">
                        POS
                      </div>

                      <div className="min-w-0">
                        <div className="break-words text-xs font-bold text-[#17212B]">
                          {sale.receiptNo || sale.id || 'SAWA-REC'}
                        </div>
                        <div className="break-words text-[10px] text-[#64748B]">
                          {sale.date || 'Today'}
                        </div>
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:flex-col sm:items-end">
                      <div className="break-words text-xs font-bold text-[#17212B]">
                        {typeof sale.total === 'number'
                          ? `KES ${sale.total.toLocaleString()}`
                          : sale.total || sale.amount || 'KES 0'}
                      </div>

                      <span className="max-w-full break-words border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-blue-600">
                        {sale.paymentMethod || 'Cash'}
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Low-stock watchlist */}
        <div className="min-w-0 space-y-4 border border-[#DCE3EA] bg-white p-3 sm:p-5">
          <div className="border-b border-[#DCE3EA] pb-3">
            <h2 className="text-sm font-bold text-[#17212B]">
              Low-Stock Watchlist
            </h2>
          </div>

          <div className="min-w-0 space-y-3">
            {lowStockProducts.length === 0 ? (
              <p className="py-4 text-center text-xs text-[#64748B]">
                All inventory stock levels are optimal.
              </p>
            ) : (
              lowStockProducts.slice(0, 4).map((item, index) => (
                <div
                  key={item.sku || item.id || index}
                  className="flex min-w-0 flex-col gap-3 border border-blue-200 bg-blue-50/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="break-words text-xs font-bold text-[#17212B]">
                      {item.name}
                    </div>
                    <div className="mt-1 text-[10px] text-blue-800">
                      Stock remaining: {item.stock} units
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('inventory')}
                    className="min-h-9 w-full shrink-0 bg-blue-600 px-3 py-2 text-[10px] font-semibold text-white hover:bg-blue-700 sm:w-auto"
                  >
                    Restock
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Add product modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAddModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-product-title"
            className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-lg space-y-4 overflow-y-auto border border-[#DCE3EA] bg-white p-4 sm:max-h-[calc(100dvh-2rem)] sm:p-6"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#DCE3EA] pb-3">
              <h2
                id="add-product-title"
                className="text-sm font-bold text-[#17212B]"
              >
                Add New Spare Part
              </h2>

              <button
                type="button"
                onClick={closeAddModal}
                aria-label="Close add product form"
                className="flex h-9 w-9 shrink-0 items-center justify-center text-lg text-[#64748B] hover:bg-slate-100 hover:text-black"
              >
                ×
              </button>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="border border-red-200 bg-red-50 p-2.5 text-xs text-red-700"
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddProduct} className="space-y-3">
              <div>
                <label
                  htmlFor="product-name"
                  className="mb-1 block text-xs font-bold text-[#17212B]"
                >
                  Part Name *
                </label>
                <input
                  id="product-name"
                  type="text"
                  required
                  placeholder="e.g. Clutch Cable - Bajaj Boxer"
                  value={formData.name}
                  onChange={(e) => updateFormField('name', e.target.value)}
                  className="w-full min-w-0 border border-[#DCE3EA] bg-slate-50 px-3 py-2.5 text-xs focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <label
                    htmlFor="product-sku"
                    className="mb-1 block text-xs font-bold text-[#17212B]"
                  >
                    SKU Code *
                  </label>
                  <input
                    id="product-sku"
                    type="text"
                    required
                    placeholder="e.g. CLT-007"
                    value={formData.sku}
                    onChange={(e) => updateFormField('sku', e.target.value)}
                    className="w-full min-w-0 border border-[#DCE3EA] bg-slate-50 px-3 py-2.5 text-xs focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="min-w-0">
                  <label
                    htmlFor="product-category"
                    className="mb-1 block text-xs font-bold text-[#17212B]"
                  >
                    Category
                  </label>
                  <select
                    id="product-category"
                    value={formData.category}
                    onChange={(e) =>
                      updateFormField('category', e.target.value)
                    }
                    className="w-full min-w-0 border border-[#DCE3EA] bg-slate-50 px-3 py-2.5 text-xs focus:border-blue-600 focus:bg-white focus:outline-none"
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <label
                    htmlFor="product-price"
                    className="mb-1 block text-xs font-bold text-[#17212B]"
                  >
                    Selling Price (KES) *
                  </label>
                  <input
                    id="product-price"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="1200"
                    value={formData.price}
                    onChange={(e) => updateFormField('price', e.target.value)}
                    className="w-full min-w-0 border border-[#DCE3EA] bg-slate-50 px-3 py-2.5 text-xs focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="min-w-0">
                  <label
                    htmlFor="product-stock"
                    className="mb-1 block text-xs font-bold text-[#17212B]"
                  >
                    Initial Stock Qty *
                  </label>
                  <input
                    id="product-stock"
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="20"
                    value={formData.stock}
                    onChange={(e) => updateFormField('stock', e.target.value)}
                    className="w-full min-w-0 border border-[#DCE3EA] bg-slate-50 px-3 py-2.5 text-xs focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Product image upload */}
              <div>
                <label
                  htmlFor="product-image"
                  className="mb-1 block text-xs font-bold text-[#17212B]"
                >
                  Product Image
                </label>
                <input
                  id="product-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full min-w-0 border border-[#DCE3EA] bg-slate-50 px-2 py-2 text-xs text-[#64748B] file:mr-2 file:border-0 file:bg-blue-50 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100 sm:file:mr-3 sm:file:px-3"
                />
              </div>

              <div className="flex flex-col-reverse justify-end gap-2 border-t border-[#DCE3EA] pt-3 sm:flex-row">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="min-h-10 w-full border border-[#DCE3EA] bg-white px-4 py-2 text-xs font-medium text-[#17212B] hover:bg-slate-50 sm:w-auto"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="min-h-10 w-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 sm:w-auto"
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

// Reusable dashboard metric card.
function MetricCard({ title, value, change, icon: Icon }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border border-[#DCE3EA] bg-white p-3 sm:p-4">
      <div className="min-w-0 flex-1">
        <div className="break-words text-[10px] font-semibold uppercase tracking-wider text-[#64748B] sm:text-[11px]">
          {title}
        </div>

        <div className="mt-1 break-words text-base font-bold text-[#17212B] sm:text-lg">
          {value}
        </div>

        <div className="mt-1 break-words text-[10px] font-medium text-blue-600 sm:text-[11px]">
          {change}
        </div>
      </div>

      <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-blue-200 bg-blue-50 text-blue-600 sm:h-10 sm:w-10">
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}
