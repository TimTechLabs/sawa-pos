
import React, { useState, useEffect } from 'react';
import {
  Save,
  CheckCircle2,
  Store,
  Printer,
  Shield,
  CreditCard,
  Boxes,
  Lock,
  Trash2,
  AlertTriangle,
  KeyRound,
  Smartphone,
  Banknote,
  X,
} from 'lucide-react';

const DEFAULT_SETTINGS = {
  shopName: 'Sawa Motorcycle Spares',
  phone: '+254 712 160 288 / +254 781702033',
  email: 'sawamotorcyclespares@gmail.com',
  location: 'Kitale Town',
  currency: 'KES',
  receiptFooter: 'Asante sana! Karibu tena. No goods returned after 7 days.',
  paperSize: '80mm',
  lowStockThreshold: 5,
  cashierNameOnReceipt: true,
};

const SETTINGS_KEY = 'sawa_shop_settings';
const PIN_KEY = 'sawa_admin_pin';

const readSettings = () => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);

    if (!stored) return { ...DEFAULT_SETTINGS };

    const parsed = JSON.parse(stored);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ...DEFAULT_SETTINGS };
    }

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      lowStockThreshold: Math.max(
        0,
        Number.isFinite(Number(parsed.lowStockThreshold))
          ? Number(parsed.lowStockThreshold)
          : DEFAULT_SETTINGS.lowStockThreshold
      ),
      cashierNameOnReceipt:
        typeof parsed.cashierNameOnReceipt === 'boolean'
          ? parsed.cashierNameOnReceipt
          : DEFAULT_SETTINGS.cashierNameOnReceipt,
    };
  } catch (error) {
    console.error('Unable to load shop settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
};

const getStoredPin = () => {
  try {
    return localStorage.getItem(PIN_KEY) || '2026';
  } catch {
    return null;
  }
};

const Section = ({ icon: Icon, title, children, danger = false }) => (
  <section
    className={`space-y-4 border bg-white p-4 sm:p-5 ${
      danger ? 'border-red-200' : 'border-[#DCE3EA]'
    }`}
  >
    <div
      className={`flex items-center gap-2 border-b pb-3 ${
        danger ? 'border-red-100' : 'border-[#DCE3EA]'
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${
          danger ? 'text-red-600' : 'text-blue-600'
        }`}
      />
      <h3
        className={`text-sm font-bold ${
          danger ? 'text-red-700' : 'text-[#17212B]'
        }`}
      >
        {title}
      </h3>
    </div>

    {children}
  </section>
);

const Field = ({ label, children, description }) => (
  <div className="min-w-0">
    <label className="mb-1 block text-xs font-bold text-[#17212B]">
      {label}
    </label>
    {children}
    {description && (
      <p className="mt-1 text-[11px] leading-5 text-[#64748B]">
        {description}
      </p>
    )}
  </div>
);

const inputClass =
  'min-h-10 w-full border border-[#DCE3EA] bg-[#F9FAFB] px-3 py-2 text-sm text-[#17212B] focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100';

export default function SettingsView() {
  const [settings, setSettings] = useState(readSettings);
  const [saved, setSaved] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [mode, setMode] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSettings(readSettings());
  }, []);

  const updateSetting = (key, value) => {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));

    setSaved(false);
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleSave = (event) => {
    event.preventDefault();

    setSaved(false);
    setSuccessMsg('');
    setErrorMsg('');
    setIsSaving(true);

    try {
      if (!settings.shopName.trim()) {
        setErrorMsg('Please enter a shop name.');
        return;
      }

      if (!settings.location.trim()) {
        setErrorMsg('Please enter the shop location.');
        return;
      }

      if (
        !Number.isInteger(Number(settings.lowStockThreshold)) ||
        Number(settings.lowStockThreshold) < 0
      ) {
        setErrorMsg('The low-stock threshold must be a whole number of zero or more.');
        return;
      }

      const settingsToSave = {
        ...settings,
        shopName: settings.shopName.trim(),
        phone: settings.phone.trim(),
        email: settings.email.trim(),
        location: settings.location.trim(),
        receiptFooter: settings.receiptFooter.trim(),
        lowStockThreshold: Number(settings.lowStockThreshold),
      };

      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsToSave));

      setSettings(settingsToSave);
      setSaved(true);
      setSuccessMsg('Shop settings saved in this browser.');

      window.dispatchEvent(new Event('sawa_settings_updated'));
      window.dispatchEvent(new Event('settingsUpdated'));
    } catch (error) {
      console.error('Unable to save shop settings:', error);
      setErrorMsg(
        'Settings could not be saved. Check browser storage and try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleActionTrigger = (actionType) => {
    setMode(actionType);
    setCurrentPinInput('');
    setNewPinInput('');
    setErrorMsg('');
    setSuccessMsg('');
    setIsPinModalOpen(true);
  };

  const closePinModal = () => {
    setIsPinModalOpen(false);
    setCurrentPinInput('');
    setNewPinInput('');
    setErrorMsg('');
    setMode(null);
  };

  const handleVerifyAndExecute = (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const storedPin = getStoredPin();

    if (storedPin === null) {
      setErrorMsg('Browser storage is unavailable. The action cannot continue.');
      return;
    }

    if (currentPinInput !== storedPin) {
      setErrorMsg('Incorrect administrator PIN. Access denied.');
      return;
    }

    if (mode === 'change_pin') {
      if (!/^\d{4}$/.test(newPinInput)) {
        setErrorMsg('The new PIN must contain exactly four digits.');
        return;
      }

      try {
        localStorage.setItem(PIN_KEY, newPinInput);

        setSuccessMsg('Administrator PIN updated in this browser.');
        closePinModal();
      } catch (error) {
        console.error('Unable to update administrator PIN:', error);
        setErrorMsg('The PIN could not be saved. Please try again.');
        return;
      }
    } else if (mode === 'clear') {
      const confirmed = window.confirm(
        'WARNING: This will permanently clear the sales history stored in this browser. Export or back up any records you need first. Do you want to continue?'
      );

      if (!confirmed) return;

      try {
        localStorage.setItem('sawa_sales_history', JSON.stringify([]));
        localStorage.setItem('sawa_pos_transactions_v1', JSON.stringify([]));

        // Notify views that already listen to these legacy events.
        window.dispatchEvent(new Event('sawa_products_updated'));
        window.dispatchEvent(new Event('productsUpdated'));

        // Notify newer sales-aware views as well.
        window.dispatchEvent(new Event('sawa_sales_updated'));
        window.dispatchEvent(new Event('salesUpdated'));
        window.dispatchEvent(new Event('sawa_transaction_completed'));

        setSuccessMsg(
          'Sales records in this browser have been cleared. Backend records, if any, were not deleted.'
        );

        closePinModal();
      } catch (error) {
        console.error('Unable to clear local sales records:', error);
        setErrorMsg(
          'The sales ledger could not be cleared completely. Check browser storage.'
        );
        return;
      }
    }

    window.setTimeout(() => {
      setSuccessMsg('');
    }, 5000);
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 pb-8 font-sans text-[#1E293B] sm:space-y-6">
      {/* Feedback */}
      {saved && (
        <div
          role="status"
          className="flex items-start gap-2 border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs text-emerald-800"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Shop settings saved successfully.</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="flex items-start gap-2 border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs text-emerald-800"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && !isPinModalOpen && (
        <div
          role="alert"
          className="flex items-start gap-2 border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5 sm:space-y-6">
        {/* A. Shop Information */}
        <Section icon={Store} title="Shop Information">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Shop Name">
              <input
                type="text"
                required
                autoComplete="organization"
                value={settings.shopName}
                onChange={(event) =>
                  updateSetting('shopName', event.target.value)
                }
                className={inputClass}
              />
            </Field>

            <Field label="Phone Number">
              <input
                type="tel"
                autoComplete="tel"
                value={settings.phone}
                onChange={(event) =>
                  updateSetting('phone', event.target.value)
                }
                className={inputClass}
              />
            </Field>

            <Field label="Email Address">
              <input
                type="email"
                autoComplete="email"
                value={settings.email}
                onChange={(event) =>
                  updateSetting('email', event.target.value)
                }
                className={inputClass}
              />
            </Field>

            <Field label="Currency">
              <input
                type="text"
                value={settings.currency}
                disabled
                readOnly
                className={inputClass}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Physical Location / Address">
                <input
                  type="text"
                  required
                  autoComplete="street-address"
                  value={settings.location}
                  onChange={(event) =>
                    updateSetting('location', event.target.value)
                  }
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* B. Receipt Configuration */}
        <Section icon={Printer} title="Receipt Configuration">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Thermal Paper Size">
              <select
                value={settings.paperSize}
                onChange={(event) =>
                  updateSetting('paperSize', event.target.value)
                }
                className={inputClass}
              >
                <option value="58mm">58 mm Thermal</option>
                <option value="80mm">80 mm Thermal</option>
              </select>
            </Field>

            <div className="flex min-h-10 items-center">
              <label className="flex cursor-pointer items-start gap-3 py-2">
                <input
                  type="checkbox"
                  checked={settings.cashierNameOnReceipt}
                  onChange={(event) =>
                    updateSetting(
                      'cashierNameOnReceipt',
                      event.target.checked
                    )
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
                />
                <span className="text-xs font-bold leading-5 text-[#17212B]">
                  Display Cashier Name on Receipts
                </span>
              </label>
            </div>

            <div className="sm:col-span-2">
              <Field label="Receipt Footer / Thank-You Message">
                <textarea
                  rows={3}
                  value={settings.receiptFooter}
                  onChange={(event) =>
                    updateSetting('receiptFooter', event.target.value)
                  }
                  className={`${inputClass} resize-y`}
                />
              </Field>
            </div>
          </div>

          <p className="text-[11px] leading-5 text-[#64748B]">
            These settings are saved locally. Your receipt component must read
            sawa_shop_settings for the changes to appear on printed receipts.
          </p>
        </Section>

        {/* C. Inventory Settings */}
        <Section icon={Boxes} title="Inventory Settings">
          <Field
            label="Low-Stock Warning Threshold (Units)"
            description="Products at or below this quantity should trigger a low-stock warning, provided the dashboard uses this setting."
          >
            <input
              type="number"
              min="0"
              step="1"
              required
              value={settings.lowStockThreshold}
              onChange={(event) =>
                updateSetting(
                  'lowStockThreshold',
                  event.target.value === ''
                    ? ''
                    : Number(event.target.value)
                )
              }
              className="min-h-10 w-full border border-[#DCE3EA] bg-[#F9FAFB] px-3 py-2 text-sm focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 sm:max-w-xs"
            />
          </Field>
        </Section>

        {/* D. Payment Integrations */}
        <Section icon={CreditCard} title="Payment Integrations">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex min-w-0 items-start justify-between gap-3 border border-[#DCE3EA] bg-[#F9FAFB] p-3">
              <div className="flex min-w-0 items-start gap-3">
                <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                <div>
                  <p className="text-xs font-bold text-[#17212B]">
                    M-Pesa STK Push / Till
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[#64748B]">
                    Connection status has not been verified by this screen.
                  </p>
                </div>
              </div>

              <span className="shrink-0 border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">
                Unverified
              </span>
            </div>

            <div className="flex min-w-0 items-start justify-between gap-3 border border-[#DCE3EA] bg-[#F9FAFB] p-3">
              <div className="flex min-w-0 items-start gap-3">
                <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                <div>
                  <p className="text-xs font-bold text-[#17212B]">
                    Cash Checkout
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[#64748B]">
                    Availability depends on your POS checkout implementation.
                  </p>
                </div>
              </div>

              <span className="shrink-0 border border-[#DCE3EA] bg-white px-2 py-1 text-[10px] font-bold text-[#475569]">
                Informational
              </span>
            </div>
          </div>

          <p className="text-[11px] leading-5 text-[#64748B]">
            This section does not test Daraja credentials or initiate a
            transaction. Verify M-Pesa connectivity through the Django backend
            and a proper Sandbox or production payment test.
          </p>
        </Section>

        {/* E. Administrator Controls */}
        <Section
          icon={Shield}
          title="Restricted Administrator Controls"
          danger
        >
          <p className="text-xs leading-5 text-[#64748B]">
            These controls request the administrator PIN for Carolyne Waruguru.
            Clearing the ledger affects records saved in this browser only.
          </p>

          <div className="flex flex-col gap-3 pt-1 min-[400px]:flex-row min-[400px]:flex-wrap">
            <button
              type="button"
              onClick={() => handleActionTrigger('change_pin')}
              className="flex min-h-10 items-center justify-center gap-2 border border-[#DCE3EA] bg-white px-4 py-2 text-xs font-bold uppercase text-[#17212B] hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <KeyRound className="h-4 w-4" />
              Change Admin PIN
            </button>

            <button
              type="button"
              onClick={() => handleActionTrigger('clear')}
              className="flex min-h-10 items-center justify-center gap-2 bg-red-600 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <Trash2 className="h-4 w-4" />
              Clear Sales Ledger
            </button>
          </div>

          <div className="border-l-2 border-amber-400 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">
            <strong>Security note:</strong> this browser-based PIN is not
            server-side authentication. Someone with access to the browser's
            developer tools may bypass it. Do not rely on it to protect
            sensitive business records.
          </div>
        </Section>

        {/* Save */}
        <div className="flex flex-col-reverse gap-3 border-t border-[#DCE3EA] pt-4 min-[400px]:flex-row min-[400px]:justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex min-h-11 items-center justify-center gap-2 bg-blue-600 px-6 py-3 text-xs font-bold uppercase text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* PIN Modal — kept outside the settings form */}
      {isPinModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePinModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-pin-title"
            className="my-auto w-full max-w-sm border border-[#DCE3EA] bg-white p-4 sm:p-6"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#DCE3EA] pb-3">
              <h3
                id="admin-pin-title"
                className="flex items-center gap-2 text-sm font-bold text-[#17212B]"
              >
                <Lock className="h-4 w-4 shrink-0 text-red-600" />
                Admin Authentication
              </h3>

              <button
                type="button"
                onClick={closePinModal}
                aria-label="Close administrator dialog"
                className="flex h-9 w-9 shrink-0 items-center justify-center text-[#64748B] hover:bg-slate-100 hover:text-black focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-xs leading-5 text-[#64748B]">
              {mode === 'clear'
                ? 'Verify the administrator PIN before clearing local sales records.'
                : 'Verify your current PIN before changing it.'}
            </p>

            {errorMsg && (
              <div
                role="alert"
                className="mt-3 flex items-start gap-2 border border-red-200 bg-red-50 p-3 text-xs text-red-700"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form
              onSubmit={handleVerifyAndExecute}
              className="mt-4 space-y-4"
            >
              <Field label="Current 4-Digit Admin PIN">
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  minLength={4}
                  required
                  autoFocus
                  autoComplete="current-password"
                  placeholder="Enter 4 digits"
                  value={currentPinInput}
                  onChange={(event) => {
                    setCurrentPinInput(
                      event.target.value.replace(/\D/g, '').slice(0, 4)
                    );
                    setErrorMsg('');
                  }}
                  className={`${inputClass} text-center font-mono tracking-[0.4em]`}
                />
              </Field>

              {mode === 'change_pin' && (
                <Field label="New 4-Digit Admin PIN">
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    minLength={4}
                    required
                    autoComplete="new-password"
                    placeholder="Enter new 4 digits"
                    value={newPinInput}
                    onChange={(event) => {
                      setNewPinInput(
                        event.target.value.replace(/\D/g, '').slice(0, 4)
                      );
                      setErrorMsg('');
                    }}
                    className={`${inputClass} text-center font-mono tracking-[0.4em]`}
                  />
                  <p className="mt-1 text-[11px] leading-5 text-[#64748B]">
                    Choose a PIN you can remember. Avoid using an easily
                    guessed number.
                  </p>
                </Field>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-[#DCE3EA] pt-4 min-[350px]:flex-row">
                <button
                  type="button"
                  onClick={closePinModal}
                  className="min-h-10 flex-1 border border-[#DCE3EA] bg-white px-4 py-2 text-xs font-bold text-[#17212B] hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={`min-h-10 flex-1 px-4 py-2 text-xs font-bold uppercase text-white focus:outline-none focus:ring-2 ${
                    mode === 'clear'
                      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-400'
                      : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-400'
                  }`}
                >
                  {mode === 'clear' ? 'Verify & Clear' : 'Confirm PIN'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
