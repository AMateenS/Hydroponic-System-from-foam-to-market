import { Suspense } from "react";
import OrderDetail from "@/components/OrderDetail";

export default function OrderDetailPage() {
  return (
    <Suspense fallback={null}>
      <OrderDetail admin />
    </Suspense>
  );
}
