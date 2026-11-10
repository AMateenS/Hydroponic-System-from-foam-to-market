import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-24 bg-ink text-white print:hidden">
      <div className="ph-ribbon h-[3px] w-full" />
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-xl font-bold">AgroIntelliSense</p>
          <p className="mt-3 max-w-sm text-sm text-white/70">
            Smart Hydroponic Management System. Monitor, manage and sell hydroponic crops with real-time
            intelligence.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-white/90">Shop</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>
              <Link href="/products" className="hover:text-white">Products</Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-white">Cart</Link>
            </li>
            <li>
              <Link href="/orders" className="hover:text-white">My orders</Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-white/90">Learn more</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>
              <Link href="/about-hydroponics" className="hover:text-white">About hydroponics</Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white">Team and contact</Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-white">Log in</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">
        © {new Date().getFullYear()} AgroIntelliSense, Smart Hydroponic Management System
      </div>
    </footer>
  );
}
