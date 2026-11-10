"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import AuthShell, { FormMessage } from "@/components/AuthShell";

const COOLDOWN = 60;

export default function ForgotPassword() {
  const { sendReset } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError("");
    const result = await sendReset(email);
    setBusy(false);
    if (result.ok) {
      setSent(true);
      setCooldown(COOLDOWN);
    } else {
      setError(result.message);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We will email you a link to choose a new one."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-green-700 hover:underline dark:text-green-400">
            Back to login
          </Link>
        </>
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {!sent ? (
          <motion.form
            key="form"
            onSubmit={submit}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="field" />
            </div>
            <FormMessage>{error}</FormMessage>
            <button type="submit" disabled={busy} className="btn btn-primary w-full !py-3">
              {busy ? "Sending..." : "Send reset link"}
            </button>
          </motion.form>
        ) : (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <p className="font-display text-xl font-semibold text-green-700 dark:text-green-400">Check your email</p>
            <p className="muted text-sm leading-relaxed">
              If an account exists for <strong>{email}</strong>, a password reset link is on its way. Check your spam
              folder too. After choosing a new password, log in with it.
            </p>
            <button
              onClick={() => submit()}
              disabled={cooldown > 0 || busy}
              className="text-sm font-semibold text-green-700 hover:underline disabled:text-gray-400 disabled:no-underline dark:text-green-400"
            >
              {cooldown > 0 ? `Send again in ${cooldown}s` : "Send again"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
