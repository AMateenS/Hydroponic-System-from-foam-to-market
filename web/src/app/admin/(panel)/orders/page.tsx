"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { ORDER_STATUSES, paymentColor, paymentText, type Order } from "@/lib/orderStatus";
import { useToast } from "@/components/Toast";
import StatusBadge from "@/components/StatusBadge";
import { CountUp } from "@/components/motion";

const FILTERS = ["All", ...ORDER_STATUSES];

export default function AdminOrders() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/order/all");
      if (!res.ok) throw new Error();
      setOrders(await res.json());
      setError("");
    } catch {
      setError("Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (id: string, status: string) => {
    const res = await apiFetch(`/order/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, status: status as Order["status"] } : o)));
      toast({ type: "ok", text: `Order marked ${status}.` });
    } else {
      const data = await res.json().catch(() => null);
      toast({ type: "error", text: data?.error || "Could not update the status." });
    }
  };

  const shown = filter === "All" ? orders : orders.filter((o) => o.status === filter);
  const revenue = orders.filter((o) => o.status !== "Cancelled").reduce((sum, o) => sum + o.totalAmount, 0);
  const pending = orders.filter((o) => o.status === "Pending").length;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-3xl font-bold md:text-4xl">Orders</h1>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="surface p-4">
            <p className="muted text-sm">Total orders</p>
            <p className="font-display text-3xl font-bold tabular-nums">
              <CountUp value={orders.length} duration={0.8} />
            </p>
          </div>
          <div className="surface p-4">
            <p className="muted text-sm">Pending</p>
            <p className="font-display text-3xl font-bold tabular-nums">
              <CountUp value={pending} duration={0.8} />
            </p>
          </div>
          <div className="surface p-4">
            <p className="muted text-sm">Revenue</p>
            <p className="font-display text-3xl font-bold tabular-nums">
              Rs <CountUp value={revenue} duration={0.8} />
            </p>
          </div>
        </div>
        <p className="muted mt-2 text-xs">Revenue excludes cancelled orders.</p>
      </div>

      <LayoutGroup id="order-filter">
        <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line">
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f)}
                className={`relative whitespace-nowrap px-4 py-2.5 text-sm font-semibold transition-colors ${
                  active ? "text-green-700 dark:text-green-400" : "muted hover:text-fg"
                }`}
              >
                {f}
                {active && (
                  <motion.span
                    layoutId="filter-underline"
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-green-600"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </LayoutGroup>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface h-28 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="surface p-8 text-center">
          <p className="font-semibold">{error}</p>
          <button onClick={load} className="btn btn-outline mt-4">
            Try again
          </button>
        </div>
      ) : shown.length === 0 ? (
        <div className="surface p-8 text-center">
          <p className="font-semibold">No {filter === "All" ? "" : filter.toLowerCase() + " "}orders found.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false} mode="popLayout">
            {shown.map((o) => {
              const customer = typeof o.userId === "object" && o.userId ? o.userId : null;
              return (
                <motion.li
                  key={o._id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  className="surface p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <Link
                        href={`/admin/orders/${o._id}`}
                        className="font-display text-lg font-semibold text-green-700 hover:underline dark:text-green-400"
                      >
                        ORD-{o._id.slice(-6).toUpperCase()}
                      </Link>
                      <p className="muted text-sm">{new Date(o.createdAt).toLocaleString()}</p>
                      <p className="mt-1 text-sm">
                        {o.customerDetails.name}
                        {customer ? <span className="muted"> ({customer.email})</span> : null}
                      </p>
                      <p className="muted text-sm">{o.customerDetails.location}</p>
                    </div>

                    <div className="text-right">
                      <p className="font-display text-xl font-bold tabular-nums">Rs. {o.totalAmount.toLocaleString()}</p>
                      <p className={`text-sm font-medium ${paymentColor(o)}`}>{paymentText(o)}</p>
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <StatusBadge status={o.status} />
                        <select
                          value={o.status}
                          onChange={(e) => changeStatus(o._id, e.target.value)}
                          disabled={o.status === "Cancelled"}
                          aria-label={`Change status of order ${o._id.slice(-6)}`}
                          className="field !w-auto !py-1.5 !text-sm disabled:opacity-50"
                        >
                          {ORDER_STATUSES.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <p className="muted mt-3 border-t border-line pt-3 text-sm">
                    {o.items.map((i) => `${i.name} × ${i.qty} ${i.unit ?? ""}`.trim()).join(", ")}
                  </p>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
