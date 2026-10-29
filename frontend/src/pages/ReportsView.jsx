
import React, { useState, useEffect, useCallback } from "react";
import {
  Printer,
  CheckCircle,
  Search,
  DollarSign,
  Smartphone,
  Banknote,
  RefreshCw,
} from "lucide-react";

const STORAGE_KEYS = [
  "sawa_sales_history",
  "sawa_pos_transactions_v1",
];

const UNCOMPLETED_STATUSES = new Set([
  "pending",
  "processing",
  "failed",
  "cancelled",
  "canceled",
  "rejected",
  "unpaid",
  "initiated",
]);

const COMPLETED_STATUSES = new Set([
  "paid",
  "completed",
  "complete",
  "success",
  "successful",
]);

// Convert values such as 1300, "KES 1,300", or "1,300.00"
// into a number that can be used for calculations.
const parseNumericTotal = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    const parsed = Number(cleaned);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const getPaymentMethod = (tx) =>
  String(
    tx.paymentMethod ??
      tx.payment_method ??
      tx.payment_method_display ??
      ""
  ).trim();

const getReceiptNumber = (tx) =>
  String(
    tx.receiptNo ??
      tx.receipt_no ??
      tx.receiptNumber ??
      tx.receipt_number ??
      tx.receipt ??
      tx.client_txn_id ??
      tx.transaction_id ??
      tx.id ??
      ""
  ).trim();

const getStatus = (tx) =>
  String(
    tx.paymentStatus ??
      tx.payment_status ??
      tx.status ??
      tx.transactionStatus ??
      tx.transaction_status ??
      ""
  )
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const isCompletedTransaction = (tx) => {
  const status = getStatus(tx);

  // Keep older records that have no status.
  if (!status) return true;

  // Never count unfinished or unsuccessful transactions.
  if (
    UNCOMPLETED_STATUSES.has(status) ||
    /\b(pending|processing|failed|cancelled|canceled|rejected|unpaid|initiated)\b/.test(
      status
    )
  ) {
    return false;
  }

  // IMPORTANT:
  // The POS cash checkout uses "Paid via Cash".
  // This also accepts descriptions such as "Paid via M-Pesa".
  if (
    COMPLETED_STATUSES.has(status) ||
    /\b(paid|completed|complete|success|successful)\b/.test(status)
  ) {
    return true;
  }

  // Do not count unknown statuses as completed sales.
  return false;
};

const getTransactionAmount = (tx) =>
  parseNumericTotal(
    tx.total ??
      tx.amount ??
      tx.total_amount ??
      tx.grand_total ??
      tx.totalAmount ??
      0
  );

const getTransactionDate = (tx) =>
  tx.date ??
  tx.created_at ??
  tx.createdAt ??
  tx.timestamp ??
  tx.transaction_date ??
  tx.transactionDate ??
  "";

const getTransactionKey = (tx) => {
  const receipt = getReceiptNumber(tx);

  if (receipt) {
    return `receipt:${receipt}`;
  }

  const date = getTransactionDate(tx);
  const amount = getTransactionAmount(tx);
  const method = getPaymentMethod(tx).toLowerCase();
  const customer = tx.customer ?? tx.customer_name ?? "";

  // Avoid merging unrelated records that have no receipt or ID.
  if (date || amount || method || customer) {
    return [
      "fallback",
      date,
      amount,
      method,
      customer,
    ].join(":");
  }

  // Last-resort unique key for an otherwise unidentified record.
  return `unidentified:${JSON.stringify(tx)}`;
};

const getRecordsFromStorage = (parsed) => {
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (Array.isArray(parsed?.transactions)) {
    return parsed.transactions;
  }

  if (Array.isArray(parsed?.sales)) {
    return parsed.sales;
  }

  if (Array.isArray(parsed?.results)) {
    return parsed.results;
  }

  return [];
};

const formatDate = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatKES = (amount) =>
  `KES ${amount.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function ReportsView() {
  const [transactions, setTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [storageError, setStorageError] = useState("");

  const loadData = useCallback(() => {
    try {
      const combined = [];
      const errors = [];

      for (const key of STORAGE_KEYS) {
        const raw = localStorage.getItem(key);

        if (!raw) continue;

        try {
          const parsed = JSON.parse(raw);
          const records = getRecordsFromStorage(parsed);

          combined.push(
            ...records.filter(
              (item) =>
                item &&
                typeof item === "object" &&
                !Array.isArray(item)
            )
          );
        } catch (error) {
          console.error(`Could not read ${key}:`, error);
          errors.push(key);
        }
      }

      // Deduplicate the same receipt saved under both storage keys.
      const unique = new Map();

      for (const tx of combined) {
        unique.set(getTransactionKey(tx), tx);
      }

      const completed = Array.from(unique.values()).filter(
        isCompletedTransaction
      );

      setTransactions(completed);
      setLastUpdated(new Date());

      if (errors.length > 0) {
        setStorageError(
          `Some saved records could not be read: ${errors.join(", ")}.`
        );
      } else {
        setStorageError("");
      }

      console.info("Sawa POS reports refreshed:", {
        recordsRead: combined.length,
        uniqueRecords: unique.size,
        completedRecords: completed.length,
      });
    } catch (error) {
      console.error("Unable to load Sawa POS reports:", error);
      setStorageError(
        "Could not read saved sales records. Check the browser console for details."
      );
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleStorage = (event) => {
      if (!event.key || STORAGE_KEYS.includes(event.key)) {
        loadData();
      }
    };

    const updateEvents = [
      "sawa_sales_updated",
      "sawa_sale_completed",
      "sawa_transaction_saved",
      "sawa_receipt_created",
      "sawa_products_updated",
      "productsUpdated",
      "salesUpdated",
      "transactionsUpdated",
    ];

    window.addEventListener("storage", handleStorage);

    updateEvents.forEach((eventName) => {
      window.addEventListener(eventName, loadData);
    });

    window.addEventListener("focus", loadData);

    return () => {
      window.removeEventListener("storage", handleStorage);

      updateEvents.forEach((eventName) => {
        window.removeEventListener(eventName, loadData);
      });

      window.removeEventListener("focus", loadData);
    };
  }, [loadData]);

  const totalRevenue = transactions.reduce(
    (sum, tx) => sum + getTransactionAmount(tx),
    0
  );

  const mpesaCount = transactions.filter((tx) => {
    const method = getPaymentMethod(tx).toLowerCase();

    return (
      method.includes("mpesa") ||
      method.includes("m-pesa")
    );
  }).length;

  const cashCount = transactions.filter((tx) =>
    getPaymentMethod(tx).toLowerCase().includes("cash")
  ).length;

  const query = searchQuery.trim().toLowerCase();

  const filteredTxns = transactions.filter((tx) => {
    const searchable = [
      getReceiptNumber(tx),
      tx.customer,
      tx.customer_name,
      getPaymentMethod(tx),
      getTransactionDate(tx),
      tx.referenceNo,
      tx.reference_no,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(query);
  });

  return (
    <div className="printable-report mx-auto max-w-7xl space-y-6 pb-10 font-sans text-[#1E293B]">
      {/* Report header */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-[#DCE3EA] pb-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-bold uppercase tracking-wider text-[#111827]">
            Business Performance &amp; Sales Reports
          </h2>

          <p className="text-xs text-[#64748B]">
            Completed POS sales and receipt records saved in this browser.
          </p>

          {lastUpdated && (
            <p className="mt-1 text-[10px] text-[#64748B]">
              Last refreshed:{" "}
              {lastUpdated.toLocaleTimeString("en-KE")}
            </p>
          )}
        </div>

        <div className="no-print flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadData}
            className="flex items-center gap-1.5 border border-[#DCE3EA] bg-white px-3.5 py-2 text-xs font-bold text-[#17212B] hover:bg-[#F3F4F6]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-[#2563EB] px-3.5 py-2 text-xs font-bold uppercase text-white hover:bg-blue-700"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </button>
        </div>
      </div>

      {storageError && (
        <div
          role="alert"
          className="border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {storageError}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-start justify-between border border-[#DCE3EA] bg-white p-4">
          <div>
            <div className="text-[11px] font-bold uppercase text-[#64748B]">
              Total Revenue
            </div>

            <div className="mt-1 text-xl font-black text-[#111827]">
              {formatKES(totalRevenue)}
            </div>

            <div className="mt-1 text-[10px] font-bold text-[#64748B]">
              Completed ledger records
            </div>
          </div>

          <div className="flex h-8 w-8 items-center justify-center border border-blue-200 bg-blue-50 text-blue-600">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-start justify-between border border-[#DCE3EA] bg-white p-4">
          <div>
            <div className="text-[11px] font-bold uppercase text-[#64748B]">
              Completed Transactions
            </div>

            <div className="mt-1 text-xl font-black text-[#111827]">
              {transactions.length}
            </div>

            <div className="mt-1 text-[10px] text-[#64748B]">
              Saved completed receipts
            </div>
          </div>

          <div className="flex h-8 w-8 items-center justify-center border border-emerald-200 bg-emerald-50 text-emerald-600">
            <CheckCircle className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-start justify-between border border-[#DCE3EA] bg-white p-4">
          <div>
            <div className="text-[11px] font-bold uppercase text-[#64748B]">
              M-Pesa Checkouts
            </div>

            <div className="mt-1 text-xl font-black text-[#111827]">
              {mpesaCount}
            </div>

            <div className="mt-1 text-[10px] text-[#64748B]">
              Recorded completed checkouts
            </div>
          </div>

          <div className="flex h-8 w-8 items-center justify-center border border-emerald-200 bg-emerald-50 text-emerald-600">
            <Smartphone className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-start justify-between border border-[#DCE3EA] bg-white p-4">
          <div>
            <div className="text-[11px] font-bold uppercase text-[#64748B]">
              Cash Checkouts
            </div>

            <div className="mt-1 text-xl font-black text-[#111827]">
              {cashCount}
            </div>

            <div className="mt-1 text-[10px] text-[#64748B]">
              Recorded cash sales
            </div>
          </div>

          <div className="flex h-8 w-8 items-center justify-center border border-blue-200 bg-blue-50 text-blue-600">
            <Banknote className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Detailed sales ledger */}
      <section className="space-y-4 border border-[#DCE3EA] bg-white p-4">
        <div className="flex flex-col items-start justify-between gap-3 border-b border-[#DCE3EA] pb-3 sm:flex-row sm:items-center">
          <h3 className="text-xs font-bold uppercase text-[#111827]">
            Detailed Sales Ledger
          </h3>

          <div className="no-print relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]" />

            <input
              type="search"
              placeholder="Search receipt, customer or payment..."
              aria-label="Search sales ledger"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              className="w-full border border-[#DCE3EA] bg-[#F9FAFB] py-2 pl-9 pr-3 text-xs text-[#111827] focus:border-black focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="border-b border-[#DCE3EA] bg-[#F3F4F6] font-bold text-[#374151]">
              <tr>
                <th className="p-3">Receipt No</th>
                <th className="p-3">Date / Time</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Payment Method</th>
                <th className="p-3 text-right">Amount (KES)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#DCE3EA]">
              {filteredTxns.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-[#64748B]"
                  >
                    {transactions.length === 0
                      ? "No completed sales found in the browser ledgers. Check the POS storage keys and saved records."
                      : "No records match your search."}
                  </td>
                </tr>
              ) : (
                filteredTxns.map((tx, index) => (
                  <tr
                    key={`${getTransactionKey(tx)}-${index}`}
                    className="hover:bg-[#F9FAFB]"
                  >
                    <td className="p-3 font-mono font-bold text-[#2563EB]">
                      {getReceiptNumber(tx) ||
                        "Receipt unavailable"}
                    </td>

                    <td className="p-3 text-[#4B5563]">
                      {formatDate(getTransactionDate(tx))}
                    </td>

                    <td className="p-3 font-semibold text-[#111827]">
                      {tx.customer ||
                        tx.customer_name ||
                        "Walk-in Customer"}
                    </td>

                    <td className="p-3">
                      <span className="inline-block border border-[#DCE3EA] bg-[#F9FAFB] px-2 py-0.5 text-[10px] font-bold uppercase text-[#374151]">
                        {getPaymentMethod(tx) ||
                          "Not recorded"}
                      </span>
                    </td>

                    <td className="p-3 text-right font-black text-[#111827]">
                      {getTransactionAmount(tx).toLocaleString(
                        "en-KE",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
