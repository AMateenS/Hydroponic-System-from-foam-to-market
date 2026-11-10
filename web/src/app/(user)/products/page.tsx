"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Minus, Plus, ShoppingCart } from "lucide-react";
import { API_URL, UPLOADS_URL } from "@/lib/config";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { StaggerItem, StaggerOnMount } from "@/components/motion";

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  image: string;
  stock: number;
}

const StockBadge = ({ stock, unit }: { stock: number; unit: string }) => {
  const style =
    stock < 1
      ? "bg-red-600 text-white"
      : stock <= 5
        ? "bg-amber-400 text-amber-950"
        : "bg-white/90 text-gray-900 dark:bg-black/60 dark:text-white";
  return (
    <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur ${style}`}>
      {stock < 1 ? "Out of stock" : stock <= 5 ? `Only ${stock} ${unit} left` : `${stock} ${unit} in stock`}
    </span>
  );
};

const Skeleton = () => (
  <div className="surface animate-pulse overflow-hidden">
    <div className="aspect-[4/3] bg-surface-2" />
    <div className="space-y-3 p-5">
      <div className="h-5 w-2/3 rounded bg-surface-2" />
      <div className="h-3 w-full rounded bg-surface-2" />
      <div className="h-3 w-5/6 rounded bg-surface-2" />
      <div className="h-9 w-1/2 rounded bg-surface-2" />
    </div>
  </div>
);

const Products: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      const response = await apiFetch(`${API_URL}/admin/get-products`);
      const data = await response.json();
      if (response.ok) {
        setProducts(data);
        setStatus("ready");
      } else {
        setStatus("error");
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setStatus("error");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const qtyOf = (p: Product) => quantities[p._id] ?? 1;
  const setQty = (p: Product, next: number) =>
    setQuantities((q) => ({ ...q, [p._id]: Math.min(Math.max(p.stock, 1), Math.max(1, next)) }));

  const handleAddToCart = (product: Product) => {
    const qty = qtyOf(product);
    const existingCart = JSON.parse(localStorage.getItem("cart") || "[]");
    const itemIndex = existingCart.findIndex((item: any) => item._id === product._id);

    const inCart = itemIndex > -1 ? existingCart[itemIndex].qty : 0;
    if (inCart + qty > product.stock) {
      toast({
        type: "error",
        text:
          `Only ${product.stock} ${product.unit} in stock` +
          (inCart ? ` (you already have ${inCart} in your cart).` : "."),
      });
      return;
    }

    if (itemIndex > -1) existingCart[itemIndex].qty += qty;
    else existingCart.push({ ...product, qty });

    localStorage.setItem("cart", JSON.stringify(existingCart));
    window.dispatchEvent(new Event("cart:changed"));

    setJustAdded(product._id);
    setTimeout(() => setJustAdded((id) => (id === product._id ? null : id)), 1500);
    toast({
      type: "ok",
      text: `${product.name} added to your cart`,
      action: { label: "View cart", href: "/cart" },
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-14 md:py-20">
      <div className="max-w-2xl">
        <h1 className="font-display text-4xl font-bold leading-tight md:text-6xl">Our Hydroponic Products</h1>
        <p className="muted mt-5 text-lg">Explore our fresh, smart-grown hydroponic produce.</p>
      </div>

      <div className="mt-12">
        {status === "loading" && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} />
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="surface p-8 text-center">
            <p className="font-semibold">We could not load the products.</p>
            <p className="muted mt-2 text-sm">
              Check that the backend is running at <span className="font-mono">{API_URL}</span>, then try again.
            </p>
            <button
              onClick={() => {
                setStatus("loading");
                fetchProducts();
              }}
              className="btn btn-outline mt-5"
            >
              Try again
            </button>
          </div>
        )}

        {status === "ready" && products.length === 0 && (
          <div className="surface p-8 text-center">
            <p className="font-semibold">No products yet.</p>
            <p className="muted mt-2 text-sm">New produce will show up here as soon as the farm adds it.</p>
          </div>
        )}

        {status === "ready" && products.length > 0 && (
          <StaggerOnMount className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <StaggerItem key={p._id} className="surface group flex flex-col overflow-hidden">
                <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
                  <img
                    src={`${UPLOADS_URL}/${p.image}`}
                    alt={p.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <StockBadge stock={p.stock} unit={p.unit} />
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-display text-xl font-semibold">{p.name}</h2>
                  <p className="muted mt-1.5 line-clamp-3 text-sm leading-relaxed">{p.description}</p>
                  <p className="mt-4 font-display text-3xl font-bold tabular-nums">
                    Rs. {p.price}
                    <span className="muted ml-1 text-sm font-normal">/ {p.unit}</span>
                  </p>

                  <div className="mt-auto pt-5">
                    {!user ? (
                      <Link href="/login" className="btn btn-outline w-full">
                        Log in to order
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center rounded-xl border border-line-strong">
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            onClick={() => setQty(p, qtyOf(p) - 1)}
                            disabled={p.stock < 1 || qtyOf(p) <= 1}
                            aria-label={`Decrease ${p.name} quantity`}
                            className="grid h-10 w-10 place-items-center disabled:opacity-40"
                          >
                            <Minus size={16} />
                          </motion.button>
                          <span className="relative grid h-10 w-9 place-items-center overflow-hidden text-sm font-semibold tabular-nums">
                            <AnimatePresence mode="popLayout" initial={false}>
                              <motion.span
                                key={qtyOf(p)}
                                initial={{ y: -10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 10, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                              >
                                {qtyOf(p)}
                              </motion.span>
                            </AnimatePresence>
                          </span>
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            onClick={() => setQty(p, qtyOf(p) + 1)}
                            disabled={p.stock < 1 || qtyOf(p) >= p.stock}
                            aria-label={`Increase ${p.name} quantity`}
                            className="grid h-10 w-10 place-items-center disabled:opacity-40"
                          >
                            <Plus size={16} />
                          </motion.button>
                        </div>

                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleAddToCart(p)}
                          disabled={p.stock < 1}
                          className="btn btn-primary flex-1"
                        >
                          <AnimatePresence mode="wait" initial={false}>
                            {p.stock < 1 ? (
                              <motion.span key="out">Out of stock</motion.span>
                            ) : justAdded === p._id ? (
                              <motion.span
                                key="added"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="inline-flex items-center gap-1.5"
                              >
                                <Check size={16} /> Added
                              </motion.span>
                            ) : (
                              <motion.span
                                key="add"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="inline-flex items-center gap-1.5"
                              >
                                <ShoppingCart size={16} /> Add to cart
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      </div>
                    )}
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerOnMount>
        )}
      </div>
    </div>
  );
};

export default Products;
