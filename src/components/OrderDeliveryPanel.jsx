import { useState } from "react";
import {
  AlertTriangle,
  RefreshCw,
  Truck,
  Download,
  XCircle,
} from "lucide-react";

const BADGE_CLS =
  "border border-gray-400 text-gray-800 px-2 py-0.5 text-xs uppercase tracking-wide";

function fmtMoney(cents) {
  if (cents == null) return "—";
  return `$ ${(cents / 100).toFixed(2)}`;
}

function fmtWindow(from, to) {
  if (!from || !to) return null;
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const dateLabel = fromDate.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
  });
  const fromTime = fromDate.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });
  const toTime = toDate.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dateLabel}, ${fromTime} – ${toTime}`;
}

export default function OrderDeliveryPanel({
  delivery,
  isLoading,
  onRetry,
  onCancel,
  onRefresh,
  onDownloadLabel,
  isRetrying,
  isCancelling,
  isRefreshing,
  isDownloading,
  actionError,
}) {
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  if (isLoading) {
    return (
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1.5">Delivery</p>
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  const canCancel =
    delivery &&
    !["delivered", "cancelled", "returned", "failed"].includes(delivery.status);
  const canDispatch = !delivery || delivery.status === "failed";
  const priceMismatch =
    delivery?.priceCents != null &&
    delivery.priceCents !== delivery.quotedPriceCents;
  const windowLabel = delivery
    ? fmtWindow(delivery.windowFrom, delivery.windowTo)
    : null;

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1.5">Delivery</p>

      {delivery ? (
        <div className="border border-gray-200 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className={`inline-block capitalize ${BADGE_CLS}`}>
              {delivery.status.replaceAll("_", " ")}
            </span>
            {delivery.deliveryType && (
              <span className="text-xs text-gray-500 capitalize">
                {delivery.deliveryType}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-gray-400">Price</p>
              <p className="text-gray-800 font-medium">
                {fmtMoney(delivery.priceCents ?? delivery.quotedPriceCents)}
              </p>
            </div>
            {delivery.consignmentNumber && (
              <div>
                <p className="text-gray-400">Consignment</p>
                <p className="text-gray-800 font-mono">
                  {delivery.consignmentNumber}
                </p>
              </div>
            )}
            {windowLabel && (
              <div className="col-span-2">
                <p className="text-gray-400">Window</p>
                <p className="text-gray-800">{windowLabel}</p>
              </div>
            )}
          </div>

          {priceMismatch && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1">
              Rendr's booked price ({fmtMoney(delivery.priceCents)}) differs
              from the quoted price ({fmtMoney(delivery.quotedPriceCents)}).
            </p>
          )}

          {delivery.status === "failed" && (
            <div className="border border-amber-200 bg-amber-50 px-3 py-2 flex gap-2">
              <AlertTriangle
                size={14}
                className="shrink-0 mt-0.5 text-amber-500"
              />
              <div className="text-xs text-amber-900">
                <p className="font-medium">Dispatch to Rendr failed</p>
                {delivery.failureMessage && (
                  <p className="mt-0.5 text-amber-700">
                    {delivery.failureMessage}
                  </p>
                )}
                <p className="mt-0.5 text-amber-600">
                  {delivery.attemptCount} attempt
                  {delivery.attemptCount === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {canDispatch && (
              <button
                onClick={onRetry}
                disabled={isRetrying}
                className="flex items-center gap-1 text-xs bg-primary text-white px-3 py-1.5 disabled:opacity-50"
              >
                <Truck size={12} />
                {isRetrying ? "Retrying…" : "Retry Dispatch"}
              </button>
            )}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1 text-xs border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={12} />
              {isRefreshing ? "Refreshing…" : "Refresh Status"}
            </button>
            <button
              onClick={onDownloadLabel}
              disabled={isDownloading}
              className="flex items-center gap-1 text-xs border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              <Download size={12} />
              {isDownloading ? "Downloading…" : "Label"}
            </button>
            {canCancel && !showCancelForm && (
              <button
                onClick={() => setShowCancelForm(true)}
                className="flex items-center gap-1 text-xs border border-red-600 text-red-600 px-3 py-1.5 hover:bg-red-50"
              >
                <XCircle size={12} />
                Cancel
              </button>
            )}
          </div>

          {showCancelForm && (
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation"
                className="flex-1 border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-primary"
              />
              <button
                onClick={() => {
                  onCancel(cancelReason);
                  setShowCancelForm(false);
                  setCancelReason("");
                }}
                disabled={isCancelling || !cancelReason.trim()}
                className="text-xs bg-red-600 text-white px-3 py-1.5 hover:bg-red-700 disabled:opacity-50"
              >
                {isCancelling ? "Cancelling…" : "Confirm"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-gray-200 p-3 flex items-center justify-between">
          <p className="text-sm text-gray-400">No delivery record yet</p>
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="flex items-center gap-1 text-xs bg-primary text-white px-3 py-1.5 disabled:opacity-50"
          >
            <Truck size={12} />
            {isRetrying ? "Dispatching…" : "Dispatch to Rendr"}
          </button>
        </div>
      )}

      {actionError && (
        <p className="text-xs text-red-500 mt-1.5">{actionError}</p>
      )}
    </div>
  );
}
