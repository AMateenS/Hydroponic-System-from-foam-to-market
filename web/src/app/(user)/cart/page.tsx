"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { API_URL, UPLOADS_URL } from "@/lib/config";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { CountUp } from "@/components/motion";

interface Product {
  _id: string;
  image: string;
  name: string;
  price: number;
  unit: string;
  stock: number;
}
interface CartItem extends Product {
  qty: number;
}
interface OrderDetails {
  name: string;
  phone: string;
  location: string;
}

const PayOption = ({
  checked,
  onChange,
  title,
  desc,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  desc: string;
}) => (
  <label
    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
      checked ? "border-green-600 bg-green-50 dark:bg-green-900/20" : "border-line-strong"
    }`}
  >
    <input type="radio" name="payment" checked={checked} onChange={onChange} className="mt-1 accent-green-600" />
    <span>
      <span className="block text-sm font-semibold">{title}</span>
      <span className="muted block text-xs">{desc}</span>
    </span>
  </label>
);

const Cart: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "card">("cod");
  const [cardEnabled, setCardEnabled] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({ name: "", phone: "", location: "" });

  const fetchProducts = async () => {
    try {
      const response = await apiFetch(`${API_URL}/admin/get-products`);
      const data = await response.json();
      if (response.ok) setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
    // Is online card payment switched on in the backend?
    apiFetch("/order/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCardEnabled(!!d?.cardEnabled))
      .catch(() => {});
  }, []);

  // load the cart saved in this browser
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("cart");
      if (savedCart) setCart(JSON.parse(savedCart));
    } catch {}
  }, []);

  // pre-fill the name from the account
  useEffect(() => {
    if (user && !orderDetails.name) setOrderDetails((d) => ({ ...d, name: user.username }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // close the dialog with Escape
  useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !placing && setIsModalOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isModalOpen, placing]);

  /* -------- Cart logic -------- */
  const updateCartAndStorage = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    window.dispatchEvent(new Event("cart:changed"));
  };

  const stockOf = (id: string) => products.find((p) => p._id === id)?.stock ?? 0;

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item._id === product._id);
    if ((existing?.qty ?? 0) + 1 > product.stock) {
      toast({ type: "error", text: `Only ${product.stock} ${product.unit} of ${product.name} in stock.` });
      return;
    }
    updateCartAndStorage(
      existing
        ? cart.map((item) => (item._id === product._id ? { ...item, qty: item.qty + 1 } : item))
        : [...cart, { ...product, qty: 1 }]
    );
  };

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) {
      updateCartAndStorage(cart.filter((item) => item._id !== id));
      return;
    }
    if (qty > stockOf(id)) {
      toast({ type: "error", text: `Only ${stockOf(id)} available in stock.` });
      return;
    }
    updateCartAndStorage(cart.map((item) => (item._id === id ? { ...item, qty } : item)));
  };

  const removeFromCart = (id: string) => updateCartAndStorage(cart.filter((item) => item._id !== id));

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  /* -------- Place the order -------- */
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({ type: "info", text: "Please log in to place an order." });
      router.push("/login");
      return;
    }

    // Only ids and quantities are sent. The server looks up the real prices
    // and calculates the total, so it cannot be changed from the browser.
    const orderData = {
      items: cart.map((i) => ({ _id: i._id, qty: i.qty })),
      customerDetails: orderDetails,
      paymentMethod,
    };

    setPlacing(true);
    try {
      const response = await apiFetch(`${API_URL}/order/place-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const data = await response.json();
        updateCartAndStorage([]);
        setIsModalOpen(false);
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl; // secure Stripe payment page
        } else {
          router.push(`/orders/${data.orderId}`);
        }
      } else {
        const err = await response.json().catch(() => null);
        toast({ type: "error", text: err?.error || "Failed to place the order." });
      }
    } catch (error) {
      console.error("Order Error:", error);
      toast({ type: "error", text: "Could not reach the server. Please try again." });
    } finally {
      setPlacing(false);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
      <h1 className="font-display text-4xl font-bold md:text-5xl">Your cart</h1>
      <p className="muted mt-3">Buy fresh hydroponic products directly from the farm.</p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        {/* ---------- products to add ---------- */}
        <section>
          <h2 className="font-display text-xl font-semibold">Add more produce</h2>
          <div className="mt-4 space-y-3">
            {products.length === 0 && <p className="muted text-sm">No products available right now.</p>}
            {products.map((product) => (
              <div key={product._id} className="surface flex items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-4">
                  <img
                    src={`${UPLOADS_URL}/${product.image}`}
                    alt={product.name}
                    className="h-16 w-20 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-lg font-semibold">{product.name}</h3>
                    <p className="muted text-sm">
                      Rs {product.price} / {product.unit}
                    </p>
                    <p className={`text-xs font-medium ${product.stock > 0 ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>
                      {product.stock > 0 ? `${product.stock} ${product.unit} in stock` : "Out of stock"}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => addToCart(product)}
                  disabled={product.stock < 1}
                  className="btn btn-primary shrink-0"
                >
                  Add
                </motion.button>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- the cart ---------- */}
        <aside className="self-start lg:sticky lg:top-24">
          <div className="surface p-6">
            <div className="mb-5 flex items-center gap-2.5">
              <ShoppingCart className="text-green-600" size={22} />
              <h2 className="font-display text-xl font-semibold">Your Cart</h2>
            </div>

            {cart.length === 0 && (
              <p className="muted rounded-xl border border-dashed border-line-strong p-6 text-center text-sm">
                Your cart is empty. Add produce from the list.
              </p>
            )}

            <ul>
              <AnimatePresence initial={false} mode="popLayout">
                {cart.map((item) => (
                  <motion.li
                    key={item._id}
                    layout
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="flex items-center justify-between gap-3 border-b border-line py-4 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="muted text-sm">
                        Rs {item.price} × {item.qty} {item.unit}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center rounded-lg border border-line-strong">
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => updateQty(item._id, item.qty - 1)}
                          aria-label={`Decrease ${item.name}`}
                          className="grid h-8 w-8 place-items-center"
                        >
                          <Minus size={14} />
                        </motion.button>
                        <span className="w-7 text-center text-sm font-semibold tabular-nums">{item.qty}</span>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => updateQty(item._id, item.qty + 1)}
                          aria-label={`Increase ${item.name}`}
                          className="grid h-8 w-8 place-items-center"
                        >
                          <Plus size={14} />
                        </motion.button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item._id)}
                        aria-label={`Remove ${item.name}`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            <div className="mt-5 flex items-baseline justify-between">
              <span className="muted">Total</span>
              <span className="font-display text-3xl font-bold tabular-nums">
                Rs <CountUp value={total} duration={0.5} />
              </span>
            </div>

            <button
              disabled={cart.length === 0}
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary mt-5 w-full !py-3"
            >
              Place Order
            </button>
          </div>
        </aside>
      </div>

      {/* ---------- delivery dialog ---------- */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-ink/70 backdrop-blur-sm" onClick={() => !placing && setIsModalOpen(false)} />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="checkout-title"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="surface relative max-h-[90vh] w-full max-w-md overflow-y-auto p-7 shadow-2xl"
            >
              <h2 id="checkout-title" className="font-display text-2xl font-bold">
                Delivery Details
              </h2>
              <p className="muted mt-1 text-sm">
                {cart.length} {cart.length === 1 ? "product" : "products"}, total Rs {total}
              </p>

              <form onSubmit={handlePlaceOrder} className="mt-6 space-y-4">
                <div>
                  <label className="label" htmlFor="o-name">Full Name</label>
                  <input
                    id="o-name"
                    required
                    autoFocus
                    type="text"
                    className="field"
                    value={orderDetails.name}
                    onChange={(e) => setOrderDetails({ ...orderDetails, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="o-phone">Phone Number</label>
                  <input
                    id="o-phone"
                    required
                    type="tel"
                    className="field"
                    value={orderDetails.phone}
                    onChange={(e) => setOrderDetails({ ...orderDetails, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="o-location">Delivery Location/Address</label>
                  <textarea
                    id="o-location"
                    required
                    rows={3}
                    className="field resize-none"
                    value={orderDetails.location}
                    onChange={(e) => setOrderDetails({ ...orderDetails, location: e.target.value })}
                  />
                </div>

                <div>
                  <span className="label">Payment Method</span>
                  <div className="space-y-2">
                    <PayOption
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                      title="Cash on delivery"
                      desc="Pay when your order arrives."
                    />
                    {cardEnabled && (
                      <PayOption
                        checked={paymentMethod === "card"}
                        onChange={() => setPaymentMethod("card")}
                        title="Pay online by card"
                        desc="Secure checkout by Stripe. You will be redirected to pay."
                      />
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} disabled={placing} className="btn btn-outline flex-1">
                    Cancel
                  </button>
                  <button type="submit" disabled={placing} className="btn btn-primary flex-1">
                    {placing ? "Please wait..." : paymentMethod === "card" ? "Pay now" : "Confirm Order"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Cart;
