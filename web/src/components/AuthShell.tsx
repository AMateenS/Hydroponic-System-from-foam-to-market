"use client";
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import Bubbles from "./Bubbles";
import { EASE } from "./motion";

/** Split screen used by login, signup, verify email, forgot password and the admin login. */
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
  variant = "user",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "user" | "admin";
}) {
  const admin = variant === "admin";

  return (
    <div className={`grid lg:grid-cols-[0.9fr_1.1fr] ${admin ? "min-h-screen" : "min-h-[calc(100vh-67px)]"}`}>
      <div className="relative hidden overflow-hidden bg-ink text-white lg:block">
        <Bubbles count={14} />
        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <p className="font-display text-xl font-bold">AgroIntelliSense</p>
          <div>
            <h2 className="font-display text-4xl font-bold leading-tight xl:text-5xl">
              {admin ? "Run the farm from one place." : "Smart Hydroponics. Fresh Harvests."}
            </h2>
            <p className="mt-4 max-w-sm text-white/70">
              {admin
                ? "Manage the website content, watch the sensors, and handle orders and users."
                : "Order fresh hydroponic produce, grown and monitored by our smart farm."}
            </p>
          </div>
          <div className="ph-ribbon h-[3px] w-24 rounded-full" />
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
          className="w-full max-w-md"
        >
          <h1 className="font-display text-3xl font-bold md:text-4xl">{title}</h1>
          {subtitle && <p className="muted mt-2">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="muted mt-6 text-center text-sm">{footer}</div>}
        </motion.div>
      </div>
    </div>
  );
}

/** Error / success line that slides in, and shakes once for errors. */
export function FormMessage({
  type = "error",
  children,
}: {
  type?: "error" | "ok";
  children?: React.ReactNode;
}) {
  return (
    <AnimatePresence initial={false}>
      {children ? (
        <motion.p
          key={String(children)}
          role={type === "error" ? "alert" : "status"}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto", x: type === "error" ? [0, -7, 6, -3, 0] : 0 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.35 }}
          className={`overflow-hidden rounded-xl px-3.5 py-2.5 text-sm ${
            type === "error"
              ? "bg-red-50 text-red-700 dark:bg-red-900/25 dark:text-red-300"
              : "bg-green-50 text-green-800 dark:bg-green-900/25 dark:text-green-300"
          }`}
        >
          {children}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}
