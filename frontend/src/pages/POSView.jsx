
import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Trash2,
  Printer,
  Search,
  Smartphone,
  Banknote,
  Package,
  Plus,
  Minus,
} from 'lucide-react';
import { getProducts, updateProductStock } from '../utils/productService';

const API_BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://127.0.0.1:8000/api/v1'
    : 'https://sawa-pos-backend.onrender.com/api/v1';

const formatKES = (amount) =>
  `KES ${Number(amount || 0).toLocaleString('en-KE')}`;

const formatLocalDateTime = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(now.getDate()).padStart(2, '0')} ${String(
    now.getHours()
  ).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const normalizePhone = (value) => {
  let number = value.replace(/[\s-]/g, '');

  if (number.startsWith('07') || number.startsWith('01')) {
    number = `+254${number.slice(1)}`;
  } else if (number.startsWith('254')) {
    number = `+${number}`;
  }

  return number;
};

export default function POSView({ globalSearch = '' }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState(globalSearch);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [phone, setPhone] = useState('');
  const [waitingForPayment, setWaitingForPayment] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [messageType, setMessageType] = useState('info');

  useEffect(() => {
    setSearchQuery(globalSearch);
  }, [globalSearch]);

  useEffect(() => {
    const loadProducts = () => {
      const result = getProducts();
      setProducts(Array.isArray(result) ? result : []);
    };

    loadProducts();

    window.addEventListener('sawa_products_updated', loadProducts);
    window.addEventListener('productsUpdated', loadProducts);
    window.addEventListener('storage', loadProducts);

    return () => {
      window.removeEventListener('sawa_products_updated', loadProducts);
      window.removeEventListener('productsUpdated', loadProducts);
      window.removeEventListener('storage', loadProducts);
    };
  }, []);

  const totalPayable = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * item.qty,
    0
  );

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  const filteredProducts = products.filter((product) => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return true;

    return [
      product.name,
      product.sku,
      product.category,
      product.compatibility,
    ].some((value) =>
      String(value || '').toLowerCase().includes(query)
    );
  });

  const addToCart = (product) => {
    const stock = Number(product.stock || 0);

    if (stock <= 0) {
      setPaymentMessage('This item is out of stock.');
      setMessageType('error');
      return;
    }

    setPaymentMessage('');

    const existing = cart.find((item) => item.sku === product.sku);

    if (existing) {
      if (existing.qty >= stock) {
        setPaymentMessage(`Only ${stock} units are available.`);
        setMessageType('error');
        return;
      }

      setCart((currentCart) =>
        currentCart.map((item) =>
          item.sku === product.sku
            ? { ...item, qty: item.qty + 1 }
            : item
        )
      );

      return;
    }

    setCart((currentCart) => [
      ...currentCart,
      { ...product, qty: 1 },
    ]);
  };

  const changeQuantity = (sku, change) => {
    const cartItem = cart.find((item) => item.sku === sku);
    if (!cartItem) return;

    const currentProduct = products.find(
      (product) => product.sku === sku
    );

    const availableStock = Number(
      currentProduct?.stock ?? cartItem.stock ?? 0
    );

    const nextQuantity = cartItem.qty + change;

    if (nextQuantity > availableStock) {
      setPaymentMessage(`Only ${availableStock} units are available.`);
      setMessageType('error');
      return;
    }

    setPaymentMessage('');

    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.sku === sku ? { ...item, qty: nextQuantity } : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const removeFromCart = (sku) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.sku !== sku)
    );
  };

  const finalizeCashTransaction = () => {
    if (cart.length === 0) return;

    // Check stock again before completing the sale.
    const latestProducts = getProducts();

    for (const item of cart) {
      const currentProduct = latestProducts.find(
        (product) => product.sku === item.sku
      );

      if (
        !currentProduct ||
        Number(currentProduct.stock || 0) < item.qty
      ) {
        setPaymentMessage(
          `Insufficient stock for ${item.name}. Refresh the products and try again.`
        );
        setMessageType('error');
        setProducts(latestProducts);
        return;
      }
    }

    const receiptNo = `SAWA-${Date.now()}`;
    const referenceNo = `CASH-${Math.floor(
      100000 + Math.random() * 900000
    )}`;

    const newReceipt = {
      receiptNo,
      id: receiptNo,
      date: formatLocalDateTime(),
      cashier: 'Carolyne Waruguru',
      customer: 'Walk-in Customer (Kitale)',
      cart: [...cart],
      total: formatKES(totalPayable),
      amount: formatKES(totalPayable),
      paymentMethod: 'Cash (CASH-001)',
      status: 'Paid via Cash',
      referenceNo,
    };

    try {
      // Update inventory.
      cart.forEach((item) => {
        const currentProduct = latestProducts.find(
          (product) => product.sku === item.sku
        );

        updateProductStock(
          item.sku,
          Number(currentProduct.stock) - item.qty
        );
      });

      const existingSales = JSON.parse(
        localStorage.getItem('sawa_sales_history') || '[]'
      );

      const existingTransactions = JSON.parse(
        localStorage.getItem('sawa_pos_transactions_v1') || '[]'
      );

      localStorage.setItem(
        'sawa_sales_history',
        JSON.stringify([newReceipt, ...existingSales])
      );

      localStorage.setItem(
        'sawa_pos_transactions_v1',
        JSON.stringify([newReceipt, ...existingTransactions])
      );

      window.dispatchEvent(new Event('sawa_products_updated'));
      window.dispatchEvent(new Event('productsUpdated'));
      window.dispatchEvent(new Event('sawa_sales_updated'));

      const updatedProducts = getProducts();
      setProducts(Array.isArray(updatedProducts) ? updatedProducts : []);
      setReceiptData(newReceipt);
      setPaymentMessage('');
    } catch (error) {
      console.error('Cash checkout error:', error);
      setPaymentMessage(
        'The sale could not be saved successfully. Check the inventory and sales records before retrying.'
      );
      setMessageType('error');
    }
  };

  const handleMpesaSTKPush = async () => {
    if (cart.length === 0 || totalPayable <= 0) {
      setPaymentMessage('Your cart is empty.');
      setMessageType('error');
      return;
    }

    const normalizedPhone = normalizePhone(phone.trim());

    if (!/^\+254[17]\d{8}$/.test(normalizedPhone)) {
      setPaymentMessage(
        'Enter a valid Kenyan phone number, for example 0712345678 or 0112345678.'
      );
      setMessageType('error');
      return;
    }

    setWaitingForPayment(true);
    setPaymentMessage('Sending the M-Pesa request...');
    setMessageType('info');

    try {
      const response = await fetch(`${API_BASE_URL}/mpesa/stk-push/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: normalizedPhone,
          phone: normalizedPhone,
          amount: totalPayable,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.detail ||
            `Request failed with status ${response.status}.`
        );
      }

      console.log('M-Pesa STK Push response:', data);

      // An accepted STK Push request is not proof of payment.
      // Do not create a paid receipt or deduct stock here.
      setPaymentMessage(
        'The backend accepted the request, but payment is not yet confirmed. No paid receipt has been created and no stock has been deducted. Payment status must be verified by the backend callback or status-check endpoint.'
      );
      setMessageType('info');
    } catch (error) {
      console.error('M-Pesa request failed:', error);

      setPaymentMessage(
        `M-Pesa request failed: ${error.message}. No payment was simulated and no stock was deducted.`
      );
      setMessageType('error');
    } finally {
      setWaitingForPayment(false);
    }
  };

  const startNewSale = () => {
    setCart([]);
    setReceiptData(null);
    setPhone('');
    setPaymentMethod('cash');
    setPaymentMessage('');
  };

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1800px] flex-col gap-4 p-2 font-sans text-[#17212B] sm:gap-5 sm:p-4 xl:grid xl:h-full xl:min-h-0 xl:grid-cols-3 xl:gap-5 xl:overflow-hidden xl:p-5">
      {/* Product catalogue */}
      <section className="flex min-w-0 flex-col gap-4 xl:col-span-2 xl:min-h-0">
        <div className="relative min-w-0">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]"
          />

          <input
            type="search"
            aria-label="Search spare parts"
            placeholder="Search by name, SKU, category..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full min-w-0 border border-[#DCE3EA] bg-white py-3 pl-10 pr-3 text-sm text-[#17212B] focus:border-black focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide sm:text-base">
            Spare Parts
          </h2>
          <span className="shrink-0 text-xs text-[#64748B]">
            {filteredProducts.length} products
          </span>
        </div>

        <div className="grid min-w-0 grid-cols-2 content-start gap-2 sm:gap-3 md:grid-cols-3 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1 2xl:grid-cols-4">
          {filteredProducts.map((product) => {
            const stock = Number(product.stock || 0);
            const outOfStock = stock <= 0;

            return (
              <button
                key={product.sku}
                type="button"
                disabled={outOfStock}
                onClick={() => addToCart(product)}
                aria-label={`Add ${product.name} to order`}
                className="flex min-w-0 flex-col border border-[#DCE3EA] bg-white text-left transition-colors hover:border-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="flex h-24 w-full items-center justify-center overflow-hidden border-b border-[#DCE3EA] bg-[#F9FAFB] p-2 sm:h-32 sm:p-3">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 py-3 text-slate-400">
                      <Package className="h-5 w-5" />
                      <span className="text-[9px] font-bold uppercase tracking-wide">
                        No image
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-2 p-2 sm:p-3">
                  <div className="min-w-0">
                    <h3 className="break-words text-xs font-bold leading-5 sm:text-sm">
                      {product.name}
                    </h3>
                    <p className="mt-1 break-all font-mono text-[10px] font-bold uppercase text-blue-600">
                      {product.sku}
                    </p>
                  </div>

                  <div className="mt-auto flex flex-col gap-2 border-t border-[#DCE3EA] pt-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs font-bold sm:text-sm">
                      {formatKES(product.price)}
                    </span>

                    <span
                      className={`w-fit border px-1.5 py-1 text-[9px] font-bold sm:px-2 sm:text-[10px] ${
                        outOfStock
                          ? 'border-red-600 bg-red-50 text-red-600'
                          : stock <= 5
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-blue-600 bg-blue-50 text-blue-600'
                      }`}
                    >
                      {outOfStock ? 'OUT OF STOCK' : `${stock} left`}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full border border-[#DCE3EA] bg-white px-4 py-10 text-center">
              <Package className="mx-auto mb-3 h-8 w-8 text-slate-400" />
              <p className="text-sm font-bold">No products found</p>
              <p className="mt-1 text-xs text-[#64748B]">
                Try another product name, SKU or category.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Cart and checkout */}
      <aside className="flex min-w-0 flex-col gap-4 border border-[#DCE3EA] bg-white p-3 sm:p-5 xl:col-span-1 xl:min-h-0 xl:overflow-y-auto">
        <div className="flex items-center justify-between gap-3 border-b border-[#DCE3EA] pb-3">
          <div className="flex min-w-0 items-center gap-2">
            <ShoppingCart className="h-5 w-5 shrink-0" />
            <h2 className="text-sm font-bold uppercase tracking-wide">
              Current Order
            </h2>
          </div>

          <span className="shrink-0 bg-[#F3F4F6] px-2 py-1 text-xs font-bold">
            {totalItems} items
          </span>
        </div>

        <div className="flex min-h-16 flex-col gap-2 sm:max-h-72 sm:overflow-y-auto xl:min-h-0 xl:flex-1">
          {cart.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <ShoppingCart className="mb-2 h-7 w-7 text-slate-400" />
              <p className="text-sm font-semibold">Cart is empty</p>
              <p className="mt-1 text-xs text-[#64748B]">
                Select a spare part to begin.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.sku}
                className="flex min-w-0 items-start justify-between gap-2 border border-[#DCE3EA] bg-[#F9FAFB] p-2 sm:p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words text-xs font-bold sm:text-sm">
                    {item.name}
                  </p>
                  <p className="mt-1 text-[11px] text-[#64748B]">
                    {formatKES(item.price)} each
                  </p>

                  <div className="mt-2 flex w-fit items-center border border-[#DCE3EA] bg-white">
                    <button
                      type="button"
                      aria-label={`Decrease ${item.name} quantity`}
                      onClick={() => changeQuantity(item.sku, -1)}
                      className="p-2 hover:bg-[#F3F4F6]"
                    >
                      <Minus className="h-3 w-3" />
                    </button>

                    <span className="min-w-7 text-center text-xs font-bold">
                      {item.qty}
                    </span>

                    <button
                      type="button"
                      aria-label={`Increase ${item.name} quantity`}
                      onClick={() => changeQuantity(item.sku, 1)}
                      disabled={
                        item.qty >=
                        Number(
                          products.find(
                            (product) => product.sku === item.sku
                          )?.stock ?? item.stock ?? 0
                        )
                      }
                      className="p-2 hover:bg-[#F3F4F6] disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-xs font-bold sm:text-sm">
                    {formatKES(item.price * item.qty)}
                  </span>

                  <button
                    type="button"
                    aria-label={`Remove ${item.name} from order`}
                    onClick={() => removeFromCart(item.sku)}
                    className="p-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-4 border-t border-[#DCE3EA] pt-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold">Total Payable</span>
            <span className="text-lg font-bold sm:text-xl">
              {formatKES(totalPayable)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setPaymentMethod('cash');
                setPaymentMessage('');
              }}
              className={`flex min-h-11 items-center justify-center gap-2 border px-2 py-2 text-xs font-bold uppercase ${
                paymentMethod === 'cash'
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-[#DCE3EA] bg-white text-[#17212B] hover:bg-[#F3F4F6]'
              }`}
            >
              <Banknote className="h-4 w-4 shrink-0" />
              Cash
            </button>

            <button
              type="button"
              onClick={() => {
                setPaymentMethod('mpesa');
                setPaymentMessage('');
              }}
              className={`flex min-h-11 items-center justify-center gap-2 border px-2 py-2 text-xs font-bold uppercase ${
                paymentMethod === 'mpesa'
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-[#DCE3EA] bg-white text-[#17212B] hover:bg-[#F3F4F6]'
              }`}
            >
              <Smartphone className="h-4 w-4 shrink-0" />
              M-Pesa
            </button>
          </div>

          {paymentMethod === 'mpesa' && (
            <div className="space-y-2 border border-emerald-200 bg-emerald-50 p-3">
              <label
                htmlFor="mpesa-phone"
                className="block text-xs font-bold uppercase"
              >
                M-Pesa Phone Number
              </label>

              <input
                id="mpesa-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="0712345678 or 0112345678"
                className="w-full min-w-0 border border-[#DCE3EA] bg-white px-3 py-3 text-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>
          )}

          {paymentMessage && (
            <p
              role="status"
              aria-live="polite"
              className={`break-words border p-3 text-xs leading-5 ${
                messageType === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-blue-200 bg-blue-50 text-blue-800'
              }`}
            >
              {paymentMessage}
            </p>
          )}

          {paymentMethod === 'cash' ? (
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={finalizeCashTransaction}
              className="min-h-12 w-full bg-blue-600 px-3 py-3 text-xs font-bold uppercase text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-[#9CA3AF] sm:text-sm"
            >
              Complete Cash Sale
            </button>
          ) : (
            <button
              type="button"
              disabled={cart.length === 0 || waitingForPayment}
              onClick={handleMpesaSTKPush}
              className="min-h-12 w-full bg-emerald-600 px-3 py-3 text-xs font-bold uppercase text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-[#9CA3AF] sm:text-sm"
            >
              {waitingForPayment
                ? 'Sending STK Push...'
                : 'Send M-Pesa STK Push'}
            </button>
          )}
        </div>
      </aside>

      {/* Receipt modal */}
      {receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-2 sm:p-4">
          <div
            id="printable-receipt"
            role="dialog"
            aria-modal="true"
            aria-label="Sale receipt"
            className="my-auto w-full max-w-sm border border-[#DCE3EA] bg-white p-4 text-xs sm:p-6"
          >
            <div className="space-y-1 border-b border-dashed border-[#DCE3EA] pb-3 text-center">
              <h3 className="text-sm font-bold">
                SAWA MOTORCYCLE SPARES
              </h3>
              <p className="text-[10px] text-[#64748B]">
                Kitale P.O. Box 30200
              </p>
              <p className="text-[10px] text-[#64748B]">
                Tel: +254712160288
              </p>
              <p className="pt-1 text-[10px] font-bold">
                Receipt #: {receiptData.receiptNo}
              </p>
              <p className="text-[10px] text-[#64748B]">
                Date &amp; Time: {receiptData.date}
              </p>
              <p className="text-[10px] text-[#64748B]">
                Cashier: {receiptData.cashier}
              </p>
            </div>

            <div className="max-h-48 space-y-2 overflow-y-auto border-b border-dashed border-[#DCE3EA] py-3">
              {receiptData.cart?.map((item, index) => (
                <div
                  key={`${item.sku}-${index}`}
                  className="flex items-start justify-between gap-3 text-[#17212B]"
                >
                  <span className="min-w-0 break-words">
                    {item.name}
                  </span>
                  <span className="shrink-0 font-bold">
                    {item.qty} × {formatKES(item.price)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-b border-dashed border-[#DCE3EA] py-3">
              <div className="flex justify-between gap-3 text-sm font-bold">
                <span>TOTAL PAID</span>
                <span>{receiptData.total}</span>
              </div>

              <div className="flex justify-between gap-3 text-[10px] text-[#64748B]">
                <span>PAYMENT METHOD</span>
                <span className="break-words text-right font-semibold uppercase">
                  {receiptData.paymentMethod}
                </span>
              </div>

              <div className="flex justify-between gap-3 text-[10px] text-[#64748B]">
                <span>REFERENCE</span>
                <span className="break-all text-right">
                  {receiptData.referenceNo}
                </span>
              </div>
            </div>

            <p className="pt-3 text-center text-[10px] italic text-[#64748B]">
              Asante sana! Karibu tena Kitale Branch.
            </p>

            <div className="no-print flex flex-col gap-2 pt-4 sm:flex-row">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 bg-blue-600 px-3 py-3 text-xs font-bold uppercase text-white hover:bg-blue-700"
              >
                <Printer className="h-4 w-4" />
                Print Receipt
              </button>

              <button
                type="button"
                onClick={startNewSale}
                className="min-h-11 flex-1 border border-[#DCE3EA] bg-white px-3 py-3 text-xs font-bold uppercase hover:bg-[#F3F4F6]"
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
