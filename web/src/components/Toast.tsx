"use client";
import React, { createContext, useCallback, useContext, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Info, X } from "lucide-react";

type ToastInput = {
  type?: "ok" | "error" | "info";
  text: string;
  action?: { label: string; href: string };
};
type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<{ toast: (t: ToastInput) => void }>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => setItems((p) => p.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    (t: ToastInput) => {
      const id = Date.now() + Math.random();
      setItems((p) => [...p.slice(-2), { ...t, id }]);
      setTimeout(() => dismiss(id), 4200);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {items.map((t) => {
            const type = t.type ?? "ok";
            return (
              <motion.div
                key={t.id}
                layout
                role="status"
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="surface pointer-events-auto flex w-full max-w-sm items-center gap-3 px-4 py-3 shadow-xl"
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-white ${
                    type === "ok" ? "bg-green-600" : type === "error" ? "bg-red-600" : "bg-gray-600"
                  }`}
                >
                  {type === "ok" ? <Check size={15} /> : type === "error" ? <X size={15} /> : <Info size={15} />}
                </span>
                <p className="flex-1 text-sm">{t.text}</p>
                {t.action && (
                  <Link
                    href={t.action.href}
                    onClick={() => dismiss(t.id)}
                    className="text-sm font-semibold text-green-700 hover:underline dark:text-green-400"
                  >
                    {t.action.label}
                  </Link>
                )}
                <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="muted hover:opacity-70">
                  <X size={15} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
