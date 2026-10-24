import React, { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, Printer, Search, Smartphone, Banknote, CheckCircle } from 'lucide-react';
import { getProducts, updateProductStock } from '../utils/productService';

const API_BASE_URL = window.location.hostname === 'localhost' 
  ? "http://127.0.0.1:8000/api/v1" 
  : "https://sawa-pos-backend.onrender.com/api/v1";


export default function POSView({ globalSearch = '' }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState(globalSearch);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'mpesa'
  const [phone, setPhone] = useState('');
  const [waitingForPayment, setWaitingForPayment] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

 useEffect(() => {
  const loadProducts = () => setProducts(getProducts());

  // Initial load
  loadProducts();

  // Listen for catalog updates across tabs/views
  window.addEventListener("sawa_products_updated", loadProducts);
  window.addEventListener("productsUpdated", loadProducts);

  return () => {
    window.removeEventListener("sawa_products_updated", loadProducts);
    window.removeEventListener("productsUpdated", loadProducts);
  };
}, []); 
  const addToCart = (product) => {
    if (product.stock <= 0) {
      alert('This item is out of stock!');
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.sku === product.sku);
      if (existing) {
        if (existing.qty >= product.stock) {
          alert(`Only ${product.stock} units available in stock.`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.sku === product.sku ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prevCart, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (sku) => {
    setCart((prevCart) => prevCart.filter((item) => item.sku !== sku));
  };

  const totalPayable = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.compatibility && p.compatibility.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const finalizeTransaction = (methodLabel, referenceNo) => {
    const newReceipt = {
      receiptNo: `SAWA-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toLocaleString(),
      cashier: 'Carolyne Waruguru',
      cart: [...cart],
      total: totalPayable,
      paymentMethod: methodLabel,
      referenceNo: referenceNo || 'CASH-REF',
    };

    cart.forEach((item) => updateProductStock(item.sku, item.qty));
    
    const existingSales = JSON.parse(localStorage.getItem('sawa_sales_history') || '[]');
    localStorage.setItem('sawa_sales_history', JSON.stringify([...existingSales, newReceipt]));

    setReceiptData(newReceipt);
    setProducts(getProducts());
    setWaitingForPayment(false);
  };

  const handleCashCheckout = () => {
    if (cart.length === 0) return;
    finalizeTransaction('Cash', `CASH-${Math.floor(100000 + Math.random() * 900000)}`);
  };

  const handleMpesaSTKPush = async () => {
    if (!phone || phone.trim() === "") {
      alert("Please enter a valid M-Pesa phone number.");
      return;
    }

    if (totalPayable <= 0) {
      alert("Your cart is empty.");
      return;
    }

    setWaitingForPayment(true);

    try {
      const response = await fetch(`${API_BASE_URL}/mpesa/stk-push/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone_number: phone.trim(),
          phone: phone.trim(),
          amount: totalPayable,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`M-Pesa request failed: ${data.error || response.statusText}`);
        setWaitingForPayment(false);
        return;
      }

      console.log("M-Pesa response:", data);
      finalizeTransaction("M-PESA", data.receipt_number || `MPESA-${Math.floor(100000 + Math.random() * 900000)}`);
    } catch (err) {
      console.error("M-Pesa Network Error:", err);
      alert("The M-Pesa request failed. Check if Django backend is running on port 8000.");
      setWaitingForPayment(false);
    }
  };

  const startNewSale = () => {
    setCart([]);
    setReceiptData(null);
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6 h-full p-2 sm:p-4">
      {/* Product Search & Grid */}
      <div className="lg:col-span-2 space-y-4 flex flex-col h-full min-h-[350px]">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search parts by name, SKU, bike..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#DCE3EA] pl-10 pr-4 py-2.5 text-xs text-[#17212B] focus:outline-none focus:border-blue-600 rounded-xl"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto pr-1">
          {filteredProducts.map((product) => (
            <div
              key={product.sku}
              onClick={() => addToCart(product)}
              className="bg-white border border-[#DCE3EA] p-3.5 rounded-xl cursor-pointer hover:border-blue-600 transition-colors flex flex-col justify-between"
            >
              <div>
                <h4 className="font-bold text-xs text-[#17212B]">{product.name}</h4>
                <p className="text-[10px] text-blue-600 uppercase font-bold">{product.sku}</p>
              </div>
              <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100">
                <span className="font-bold text-xs text-[#17212B]">KES {product.price.toLocaleString()}</span>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-semibold">
                  {product.stock} left
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart & Checkout Panel */}
      <div className="bg-white border border-[#DCE3EA] p-4 sm:p-5 rounded-2xl flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between border-b border-[#DCE3EA] pb-3">
            <h3 className="font-bold text-sm text-[#17212B]">Current Order</h3>
            <span className="text-xs bg-slate-100 text-[#17212B] px-2 py-0.5 rounded-full font-semibold">
              {cart.reduce((sum, item) => sum + item.qty, 0)} items
            </span>
          </div>

          <div className="space-y-2 py-3 max-h-56 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="text-xs text-[#64748B] text-center py-8">Cart is empty. Click parts to add.</p>
            ) : (
              cart.map((item) => (
                <div key={item.sku} className="flex items-center justify-between p-2 bg-slate-50 border border-[#DCE3EA] rounded-lg">
                  <div>
                    <div className="text-xs font-bold text-[#17212B]">{item.name}</div>
                    <div className="text-[10px] text-[#64748B]">
                      KES {item.price} × {item.qty}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#17212B]">KES {item.price * item.qty}</span>
                    <button onClick={() => removeFromCart(item.sku)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-3 border-t border-[#DCE3EA] pt-3">
          <div className="flex justify-between items-center text-sm font-bold text-[#17212B]">
            <span>Total Payable</span>
            <span className="text-base text-[#17212B]">KES {totalPayable.toLocaleString()}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 border ${
                paymentMethod === 'cash'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-[#17212B] border-[#DCE3EA] hover:bg-slate-50'
              }`}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Cash Payment</span>
            </button>
            <button
              onClick={() => setPaymentMethod('mpesa')}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 border ${
                paymentMethod === 'mpesa'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-[#17212B] border-[#DCE3EA] hover:bg-slate-50'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>M-Pesa STK Push</span>
            </button>
          </div>

          {paymentMethod === 'mpesa' && (
            <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-2">
              <label className="block text-[10px] font-bold text-[#17212B]">M-Pesa Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  let input = e.target.value.trim();
                  if (input.startsWith('07') || input.startsWith('01')) {
                    input = '+254' + input.slice(1);
                  }
                  setPhone(input);
                }}
                placeholder="e.g. 0712345678 or 0112345678"
                className="w-full bg-white border border-[#DCE3EA] px-3 py-1.5 text-xs text-[#17212B] rounded focus:outline-none focus:border-emerald-600"
              />
            </div>
          )}

          {paymentMethod === 'cash' ? (
            <button
              disabled={cart.length === 0}
              onClick={handleCashCheckout}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white py-2.5 font-semibold text-xs rounded-lg transition-colors"
            >
              Complete Sale & Print Receipt (Cash)
            </button>
          ) : (
            <button
              disabled={cart.length === 0 || waitingForPayment}
              onClick={handleMpesaSTKPush}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white py-2.5 font-semibold text-xs rounded-lg transition-colors"
            >
              {waitingForPayment ? "Sending STK Push..." : "Send M-Pesa STK Push Prompt"}
            </button>
          )}
        </div>
      </div>

      {receiptData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div id="printable-receipt" className="bg-white border border-[#DCE3EA] w-full max-w-sm p-6 space-y-4 text-xs mx-auto rounded-xl shadow-xl">
            <div className="text-center space-y-1 border-b border-dashed border-[#DCE3EA] pb-3">
              <h3 className="font-bold text-sm text-[#17212B]">SAWA MOTORCYCLE SPARES</h3>
              <p className="text-[10px] text-[#64748B]">Kitale, P.O. Box 30200</p>
              <p className="text-[10px] text-[#64748B]">Tel: +254712160288</p>
              <p className="text-[10px] font-bold text-[#17212B]">Receipt #: {receiptData.receiptNo}</p>
              <p className="text-[10px] text-[#64748B]">Date & Time: {receiptData.date}</p>
              <p className="text-[10px] text-[#64748B]">Cashier: {receiptData.cashier}</p>
            </div>

            <div className="space-y-2 border-b border-dashed border-[#DCE3EA] pb-3 max-h-36 overflow-y-auto">
              {receiptData.cart?.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[#17212B]">
                  <span>{item.name}</span>
                  <span className="font-bold">{item.qty} × KES {item.price}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 border-b border-dashed border-[#DCE3EA] pb-3">
              <div className="flex justify-between font-bold text-sm text-[#17212B]">
                <span>TOTAL PAID</span>
                <span>KES {receiptData.total}</span>
              </div>
              <div className="flex justify-between text-[10px] text-[#64748B]">
                <span>PAYMENT METHOD</span>
                <span className="font-semibold uppercase">{receiptData.paymentMethod}</span>
              </div>
            </div>

            <div className="text-center pt-1 text-[10px] text-[#64748B] italic">
              Asante sana! Karibu tena.
            </div>

            <div className="flex gap-3 pt-3 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 font-semibold rounded-lg"
              >
                Print Receipt
              </button>
              <button
                type="button"
                onClick={startNewSale}
                className="flex-1 border border-[#DCE3EA] bg-white hover:bg-slate-50 text-[#17212B] py-2.5 font-semibold rounded-lg"
              >
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}