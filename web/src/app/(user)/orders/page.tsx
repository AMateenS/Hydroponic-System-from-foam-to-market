"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { paymentColor, paymentText, type Order } from "@/lib/orderStatus";
import { useToast } from "@/components/Toast";
import StatusBadge from "@/components/StatusBadge";
import { StaggerItem, StaggerOnMount } from "@/components/motion";

const OrderHistory = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/order/my-orders");
      if (!res.ok) throw new Error();
      setOrders(await res.json());
      setError("");
    } catch {
      setError("We could not load your orders. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cancelOrder = async (id: string) => {
    if (!window.confirm("Cancel this order?")) return;
    const res = await apiFetch(`/order/${id}/cancel`, { method: "PATCH" });
    if (res.ok) {
      toast({ type: "ok", text: "Order cancelled." });
      load();
    } else {
      const data = await res.json().catch(() => null);
      toast({ type: "error", text: data?.error || "Could not cancel this order." });
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 md:py-16">
      <h1 className="font-display text-4xl font-bold md:text-5xl">My orders</h1>

      <div className="mt-10">
        {loading ? (
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="surface h-36 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="surface p-8 text-center">
            <p className="font-semibold">{error}</p>
            <button onClick={load} className="btn btn-outline mt-5">
              Try again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="surface p-10 text-center">
            <Package className="mx-auto text-green-600" size={34} />
            <p className="mt-4 font-display text-xl font-semibold">No orders yet</p>
            <p className="muted mt-1 text-sm">When you place an order, you can follow it here.</p>
            <Link href="/products" className="btn btn-primary mt-6">
              Browse products
            </Link>
          </div>
        ) : (
          <StaggerOnMount className="space-y-4">
            {orders.map((order) => (
              <StaggerItem key={order._id} className="surface p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/orders/${order._id}`}
                      className="font-display text-lg font-semibold text-green-700 hover:underline dark:text-green-400"
                    >
                      ORD-{order._id.slice(-6).toUpperCase()}
                    </Link>
                    <p className="muted text-sm">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={order.status} />
                    <p className="mt-2 font-display text-xl font-bold tabular-nums">
                      Rs. {order.totalAmount.toLocaleString()}
                    </p>
                  </div>
                </div>

                <p className="muted mt-3 text-sm">
                  {order.items.map((i) => `${i.name} × ${i.qty} ${i.unit ?? ""}`.trim()).join(", ")}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link href={`/orders/${order._id}`} className="btn btn-outline !py-2">
                    View details
                  </Link>
                  {order.status === "Pending" && order.paymentStatus !== "paid" && (
                    <button onClick={() => cancelOrder(order._id)} className="btn btn-danger !py-2">
                      Cancel order
                    </button>
                  )}
                  <span className={`text-sm font-medium ${paymentColor(order)}`}>{paymentText(order)}</span>
                </div>
              </StaggerItem>
            ))}
          </StaggerOnMount>
        )}
      </div>
    </div>
  );
};

export default OrderHistory;
