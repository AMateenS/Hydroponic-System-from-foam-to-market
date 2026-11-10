"use client";
import React, { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type Variants } from "framer-motion";

/** True when the visitor asked for reduced motion. Always false on the first render, so server and browser HTML match. */
export function useReduced() {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!reduce;
}

export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/** Children appear one after another when the group scrolls into view (plays once). */
export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}

/** Same as Stagger, but plays on mount instead of on scroll (for lists that load from the server). */
export function StaggerOnMount({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={container} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

/** A number that counts up, and animates smoothly whenever its value changes. */
export function CountUp({
  value,
  decimals = 0,
  suffix = "",
  duration = 1.1,
  className,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${v.toFixed(decimals)}${suffix}`);

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration, ease: EASE });
    return () => controls.stop();
  }, [value, reduce, duration, mv]);

  return <motion.span className={className}>{text}</motion.span>;
}
