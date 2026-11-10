"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Activity, ClipboardList, ExternalLink, LayoutGrid, LogOut, Menu, Users, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";

const links = [
  { href: "/admin", label: "Website content", icon: LayoutGrid },
  { href: "/admin/monitoring", label: "Farm monitoring", icon: Activity },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/users", label: "Users", icon: Users },
];

function SidebarContent({
  groupId,
  onNavigate,
  onLogout,
  username,
}: {
  groupId: string;
  onNavigate?: () => void;
  onLogout: () => void;
  username?: string;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-6">
        <div className="flex items-center gap-2.5">
          <img src="/fyplogo.png" alt="" className="h-9 w-9 object-contain" />
          <div>
            <p className="font-display text-lg font-bold leading-none">AgroIntelliSense</p>
            <p className="mt-1 text-xs text-white/55">Admin panel</p>
          </div>
        </div>
        <div className="ph-ribbon mt-5 h-[3px] w-full rounded-full" />
      </div>

      <LayoutGroup id={groupId}>
        <nav className="flex-1 space-y-1 px-3">
          {links.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "text-white" : "text-white/65 hover:text-white"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="admin-pill"
                    className="absolute inset-0 rounded-xl bg-white/12"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon size={18} className="relative" />
                <span className="relative">{label}</span>
              </Link>
            );
          })}
        </nav>
      </LayoutGroup>

      <div className="space-y-2 border-t border-white/10 p-4">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm text-white/70">{username}</p>
          <ThemeToggle className="!border-white/25 text-white hover:!bg-white/10" />
        </div>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/65 transition-colors hover:text-white"
        >
          <ExternalLink size={16} /> View website
        </Link>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-red-300 transition-colors hover:text-red-200"
        >
          <LogOut size={16} /> Log out
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [drawer, setDrawer] = useState(false);

  // Session ended, or this account is no longer an admin: back to the admin login
  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) router.replace("/admin/login");
  }, [loading, user, router]);

  useEffect(() => setDrawer(false), [pathname]);

  const handleLogout = async () => {
    await logout();
    router.push("/admin/login");
    router.refresh();
  };

  if (loading || user?.role !== "admin") {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted">Checking access...</div>
    );
  }

  return (
    <div className="min-h-screen lg:flex">
      {/* desktop sidebar */}
      <aside className="hidden w-64 shrink-0 bg-ink text-white lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent groupId="desktop" onLogout={handleLogout} username={user.username} />
        </div>
      </aside>

      {/* mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between bg-ink px-4 text-white lg:hidden">
        <p className="font-display font-bold">Admin panel</p>
        <button
          onClick={() => setDrawer(true)}
          aria-label="Open menu"
          className="grid h-9 w-9 place-items-center rounded-full border border-white/25"
        >
          <Menu size={18} />
        </button>
      </div>

      <AnimatePresence>
        {drawer && (
          <motion.div
            className="fixed inset-0 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="absolute left-0 top-0 h-full w-72 bg-ink text-white"
            >
              <button
                onClick={() => setDrawer(false)}
                aria-label="Close menu"
                className="absolute right-3 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/25"
              >
                <X size={18} />
              </button>
              <SidebarContent
                groupId="mobile"
                onNavigate={() => setDrawer(false)}
                onLogout={handleLogout}
                username={user.username}
              />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="min-w-0 flex-1">{children}</section>
    </div>
  );
}
