export const ORDER_STATUSES = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type PaymentMethod = "cod" | "card";
export type PaymentStatus = "unpaid" | "paid" | "refund_due" | "refunded";

export const statusColor = (status: string) => {
  switch (status) {
    case "Delivered":
      return "text-green-500";
    case "Confirmed":
      return "text-blue-500";
    case "Shipped":
      return "text-indigo-500";
    case "Pending":
      return "text-yellow-500";
    case "Cancelled":
      return "text-red-500";
    default:
      return "text-gray-400";
  }
};

export interface OrderItem {
  product: string;
  name: string;
  price: number;
  qty: number;
  unit?: string;
  image?: string;
}

export interface Order {
  _id: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
  customerDetails: { name: string; phone: string; location: string };
  paymentMethod?: PaymentMethod; // orders made before online payment existed have none (= cod)
  paymentStatus?: PaymentStatus;
  paidAt?: string;
  userId?: { _id: string; username: string; email: string } | string | null;
}

/** One-line, human readable payment summary */
export const paymentText = (o: Pick<Order, "paymentMethod" | "paymentStatus">) => {
  const method = o.paymentMethod ?? "cod";
  const status = o.paymentStatus ?? "unpaid";
  if (status === "refunded") return "Refunded";
  if (status === "refund_due") return "Refund due";
  if (method === "card") return status === "paid" ? "Paid online" : "Awaiting card payment";
  return status === "paid" ? "Cash on delivery (paid)" : "Cash on delivery";
};

export const paymentColor = (o: Pick<Order, "paymentMethod" | "paymentStatus">) => {
  const status = o.paymentStatus ?? "unpaid";
  if (status === "paid") return "text-green-600";
  if (status === "refund_due") return "text-red-600";
  if (status === "refunded") return "text-gray-500";
  return o.paymentMethod === "card" ? "text-yellow-600" : "text-gray-600 dark:text-gray-400";
};
