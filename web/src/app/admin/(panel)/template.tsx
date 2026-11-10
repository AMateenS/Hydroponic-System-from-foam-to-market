"use client";
import { motion } from "framer-motion";

// Re-runs on every navigation: a quick fade. (Opacity only, so fixed/sticky elements inside pages keep working.)
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28 }}>
      {children}
    </motion.div>
  );
}
