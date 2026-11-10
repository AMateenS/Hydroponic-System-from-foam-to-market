"use client";
import { MotionConfig } from "framer-motion";

// reducedMotion="user": people who turned on "reduce motion" in their system get no movement animations
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
