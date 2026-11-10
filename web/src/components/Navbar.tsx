"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Menu, ShoppingCart, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "./ThemeToggle";

const BASE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/about-hydroponics", label: "About hydroponics" },
  { href: "/contact", label: "Contact" },
];

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  // number of different products in the cart (kept in the browser)
  useEffect(() => {
    const read = () => {
      try {
        const cart = JSON.parse(localStorage.getItem("cart") || "[]");
        setCartCount(Array.isArray(cart) ? cart.length : 0);
      } catch {
        setCartCount(0);
      }
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener("cart:changed", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("cart:changed", read);
    };
  }, [pathname]);

  useEffect(() => setOpen(false), [pathname]);

  const links = [
    ...BASE_LINKS,
    ...(user ? [{ href: "/orders", label: "My orders" }] : []),
    ...(user?.role === "admin" ? [{ href: "/admin", label: "Admin panel" }] : []),
  ];
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="glass sticky top-0 z-40 print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/fyplogo.png" alt="" className="h-9 w-9 object-contain" />
          <span className="font-display text-lg font-bold tracking-tight">AgroIntelliSense</span>
        </Link>

        <LayoutGroup id="main-nav">
          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((l) => {
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                    active ? "" : "muted hover:text-fg"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-surface-2"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative">{l.label}</span>
                </Link>
              );
            })}
          </nav>
        </LayoutGroup>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {!loading && user && (
            <Link
              href="/cart"
              aria-label={`Cart, ${cartCount} items`}
              className="relative grid h-9 w-9 place-items-center rounded-full border border-line-strong transition-colors hover:bg-surface-2"
            >
              <ShoppingCart size={17} />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-green-600 px-1 text-[11px] font-bold text-white"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )}

          <div className="hidden items-center gap-2 sm:flex">
            {loading ? null : user ? (
              <>
                <span className="muted hidden text-sm xl:inline">Hi, {user.username.split(" ")[0]}</span>
                <button onClick={handleLogout} className="btn btn-outline !py-2">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-outline !py-2">
                  Log in
                </Link>
                <Link href="/signup" className="btn btn-primary !py-2">
                  Sign up
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="grid h-9 w-9 place-items-center rounded-full border border-line-strong lg:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-line lg:hidden"
          >
            <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-xl px-3 py-2.5 text-sm font-medium ${
                    isActive(l.href) ? "bg-surface-2" : "muted"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-2 flex gap-2 sm:hidden">
                {user ? (
                  <button onClick={handleLogout} className="btn btn-outline flex-1">
                    Log out
                  </button>
                ) : (
                  <>
                    <Link href="/login" className="btn btn-outline flex-1">
                      Log in
                    </Link>
                    <Link href="/signup" className="btn btn-primary flex-1">
                      Sign up
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="ph-ribbon h-[3px] w-full" />
    </header>
  );
};

export default Navbar;
