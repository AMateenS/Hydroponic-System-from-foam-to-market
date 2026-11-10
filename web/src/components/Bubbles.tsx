"use client";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/** Slowly rising air-stone bubbles. Purely decorative, skipped for "reduce motion". */
export default function Bubbles({ count = 10, className = "" }: { count?: number; className?: string }) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || reduce) return null;

  const items = Array.from({ length: count }, (_, i) => ({
    left: (i * 37 + 8) % 96,
    size: 6 + ((i * 13) % 14),
    delay: (i * 0.9) % 7,
    duration: 8 + ((i * 5) % 6),
  }));

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {items.map((b, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border border-white/30 bg-white/10"
          style={{ left: `${b.left}%`, bottom: -30, width: b.size, height: b.size }}
          animate={{ y: ["0vh", "-110vh"], opacity: [0, 0.8, 0] }}
          transition={{ duration: b.duration, delay: b.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}
