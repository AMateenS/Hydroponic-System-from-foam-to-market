"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { UPLOADS_URL } from "@/lib/config";
import { ORDER_STATUSES, paymentColor, paymentText, type Order } from "@/lib/orderStatus";
import StatusBadge from "./StatusBadge";
import { EASE } from "./motion";

const STEPS = ["Pending", "Confirmed", "Shipped", "Delivered"];
const money = (n: number) => `Rs. ${n.toLocaleString()}`;
const JSON_HEADERS = { "Content-Type": "application/json" };

type Notice = { type: "ok" | "warn"; text: string };

export default function OrderDetail({ admin = false }: { admin?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const handledReturn = useRef(false);

  const backHref = admin ? "/admin/orders" : "/orders";

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(`/order/${id}`);
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || "Could not load this order.");
      }
      setOrder(await res.json());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load this order.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // The customer just came back from the Stripe payment page
  useEffect(() => {
    if (admin || handledReturn.current) return;
    const sessionId = searchParams.get("session_id");
    const cancelled = searchParams.get("payment") === "cancelled";
    if (!sessionId && !cancelled) return;
    handledReturn.current = true;

    (async () => {
      if (sessionId) {
        const res = await apiFetch(`/order/${id}/verify-payment`, {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.paid) {
          setNotice({ type: "ok", text: "Payment received. Thank you! A confirmation email is on its way." });
        } else {
          setNotice({
            type: "warn",
            text: "We could not confirm your payment yet. If money was taken, it will show here shortly.",
          });
        }
      } else {
        setNotice({
          type: "warn",
          text: "Payment was cancelled. Your order is saved: you can pay now or cancel it below.",
        });
      }
      router.replace(pathname); // remove ?session_id from the address bar
      load();
    })();
  }, [admin, id, load, pathname, router, searchParams]);

  const finish = async (res: Response, okText: string) => {
    const d = await res.json().catch(() => null);
    setNotice(
      res.ok ? { type: "ok", text: okText } : { type: "warn", text: d?.error || d?.message || "Something went wrong." }
    );
    await load();
    setBusy(false);
  };

  const run = async (path: string, init: RequestInit, okText: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      await finish(await apiFetch(path, init), okText);
    } catch {
      setNotice({ type: "warn", text: "Could not reach the server. Please try again." });
      setBusy(false);
    }
  };

  const cancelOrder = () => run(`/order/${id}/cancel`, { method: "PATCH" }, "Order cancelled.", "Cancel this order?");

  const payNow = async () => {
    setBusy(true);
    try {
      const res = await apiFetch(`/order/${id}/pay`, { method: "POST" });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.checkoutUrl) {
        window.location.href = d.checkoutUrl;
        return; // leaving the page
      }
      if (res.ok && d?.alreadyPaid) {
        setNotice({ type: "ok", text: "This order is already paid." });
        await load();
      } else {
        setNotice({ type: "warn", text: d?.error || "Could not start the payment." });
      }
    } catch {
      setNotice({ type: "warn", text: "Could not reach the server. Please try again." });
    }
    setBusy(false);
  };

  const changeStatus = (status: string) =>
    run(
      `/order/${id}/status`,
      { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ status }) },
      "Status updated.",
      status === "Cancelled" ? "Cancel this order? Stock will be returned and this cannot be undone." : undefined
    );

  const setPaid = (paymentStatus: "paid" | "unpaid") =>
    run(
      `/order/${id}/payment`,
      { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ paymentStatus }) },
      "Payment updated."
    );

  const refund = () =>
    run(`/order/${id}/refund`, { method: "POST" }, "Refund issued through Stripe.", "Refund this payment through Stripe?");

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <div className="surface h-24 animate-pulse" />
        <div className="surface h-64 animate-pulse" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="surface p-8 text-center">
          <p className="font-semibold">{error || "Order not found."}</p>
          <Link href={backHref} className="btn btn-outline mt-5">
            Back to orders
          </Link>
        </div>
      </div>
    );
  }

  const method = order.paymentMethod ?? "cod";
  const pay = order.paymentStatus ?? "unpaid";
  const cancelled = order.status === "Cancelled";
  const stepIndex = STEPS.indexOf(order.status);
  const owner = typeof order.userId === "object" && order.userId ? order.userId : null;

  const canCustomerCancel = !admin && order.status === "Pending" && pay !== "paid";
  const canPayNow = !admin && method === "card" && pay === "unpaid" && !cancelled;

  return (
    <div className="px-4 py-8 sm:px-6 print:p-0">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href={backHref} className="text-sm font-medium text-green-700 hover:underline dark:text-green-400">
            Back to orders
          </Link>
          <button onClick={() => window.print()} className="btn btn-outline !py-2">
            Print invoice
          </button>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold md:text-4xl">
              Order ORD-{order._id.slice(-6).toUpperCase()}
            </h1>
            <p className="muted mt-1 text-sm">Placed on {new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <AnimatePresence>
          {notice && (
            <motion.div
              key={notice.text}
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              role="status"
              className={`overflow-hidden rounded-xl px-4 py-3 text-sm print:hidden ${
                notice.type === "ok"
                  ? "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200"
                  : "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
              }`}
            >
              {notice.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- progress ---------- */}
        <div className="surface p-6">
          {cancelled ? (
            <p className="font-semibold text-red-600">This order was cancelled.</p>
          ) : (
            <div className="relative flex">
              <div className="absolute left-[12.5%] right-[12.5%] top-[18px] h-1 rounded-full bg-line" />
              <motion.div
                className="absolute left-[12.5%] right-[12.5%] top-[18px] h-1 origin-left rounded-full bg-green-600"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: Math.max(stepIndex, 0) / (STEPS.length - 1) }}
                transition={{ duration: 0.9, ease: EASE, delay: 0.25 }}
              />
              {STEPS.map((s, i) => {
                const done = i <= stepIndex;
                const current = i === stepIndex;
                return (
                  <div key={s} className="relative flex flex-1 flex-col items-center">
                    <motion.span
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.1 + i * 0.12 }}
                      className={`grid h-10 w-10 place-items-center rounded-full border-2 ${
                        done
                          ? "border-green-600 bg-green-600 text-white"
                          : "border-line-strong bg-surface text-transparent"
                      } ${current ? "ring-4 ring-green-200 dark:ring-green-900" : ""}`}
                    >
                      {done && <Check size={18} />}
                    </motion.span>
                    <p className={`mt-2 text-xs sm:text-sm ${done ? "font-semibold" : "muted"}`}>{s}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ---------- items ---------- */}
        <div className="surface p-6">
          <h2 className="font-display text-lg font-semibold">Items</h2>
          <div className="mt-2 divide-y divide-line">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 py-4">
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${UPLOADS_URL}/${item.image}`} alt={item.name} className="h-14 w-16 rounded-xl object-cover" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="muted text-sm">
                    {item.qty} {item.unit} × {money(item.price)}
                  </p>
                </div>
                <p className="font-semibold tabular-nums">{money(item.price * item.qty)}</p>
              </div>
            ))}
          </div>
          <div className="flex items-baseline justify-between border-t border-line pt-4">
            <span className="muted">Total</span>
            <span className="font-display text-3xl font-bold tabular-nums">{money(order.totalAmount)}</span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="surface p-6">
            <h2 className="font-display text-lg font-semibold">Delivery</h2>
            <p className="mt-2">{order.customerDetails.name}</p>
            <p className="muted">{order.customerDetails.phone}</p>
            <p className="muted">{order.customerDetails.location}</p>
            {admin && owner && (
              <p className="muted mt-4 border-t border-line pt-3 text-sm">
                Account: {owner.username} ({owner.email})
              </p>
            )}
          </div>

          <div className="surface p-6">
            <h2 className="font-display text-lg font-semibold">Payment</h2>
            <p className="mt-2">{method === "card" ? "Credit / debit card (Stripe)" : "Cash on delivery"}</p>
            <p className={`font-semibold ${paymentColor(order)}`}>{paymentText(order)}</p>
            {order.paidAt && (
              <p className="muted text-sm">
                {pay === "paid" ? "Paid" : "Payment received"} on {new Date(order.paidAt).toLocaleString()}
              </p>
            )}
            {pay === "refund_due" && !admin && (
              <p className="muted mt-2 text-sm">Your order was cancelled. We will refund your payment shortly.</p>
            )}
          </div>
        </div>

        {/* ---------- customer actions ---------- */}
        {(canPayNow || canCustomerCancel) && (
          <div className="flex flex-wrap gap-3 print:hidden">
            {canPayNow && (
              <button onClick={payNow} disabled={busy} className="btn btn-primary !px-6 !py-3">
                Pay now by card
              </button>
            )}
            {canCustomerCancel && (
              <button onClick={cancelOrder} disabled={busy} className="btn btn-danger !px-6 !py-3">
                Cancel order
              </button>
            )}
          </div>
        )}
        {!admin && pay === "paid" && order.status === "Pending" && (
          <p className="muted text-sm print:hidden">
            Paid orders cannot be cancelled online. Please contact us if you need help.
          </p>
        )}

        {/* ---------- admin actions ---------- */}
        {admin && (
          <div className="surface space-y-5 p-6 print:hidden">
            <h2 className="font-display text-lg font-semibold">Admin actions</h2>

            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="status" className="text-sm font-medium">Status</label>
              <select
                id="status"
                value={order.status}
                disabled={busy || cancelled}
                onChange={(e) => changeStatus(e.target.value)}
                className="field !w-auto !py-2 capitalize disabled:opacity-50"
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              {cancelled && <span className="muted text-sm">Cancelled orders cannot be changed.</span>}
            </div>

            {method === "cod" && !cancelled && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium">Cash payment</span>
                {pay === "paid" ? (
                  <button onClick={() => setPaid("unpaid")} disabled={busy} className="btn btn-outline !py-2">
                    Mark as unpaid
                  </button>
                ) : (
                  <button onClick={() => setPaid("paid")} disabled={busy} className="btn btn-primary !py-2">
                    Mark cash as received
                  </button>
                )}
              </div>
            )}

            {cancelled && pay === "refund_due" && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-red-600">This paid card order was cancelled and needs a refund.</span>
                <button onClick={refund} disabled={busy} className="btn btn-danger !py-2">
                  Refund via Stripe
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
