"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import AuthShell, { FormMessage } from "@/components/AuthShell";

const COOLDOWN = 60;

export default function VerifyEmail() {
  const router = useRouter();
  const { completeVerification, resendVerification } = useAuth();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Firebase restores the signed-in user a moment after the page opens
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setEmail(u?.email ?? null);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const proceed = async () => {
    setBusy(true);
    setMessage(null);
    const result = await completeVerification();
    setBusy(false);
    if (result.ok) {
      router.push(result.user.role === "admin" ? "/admin" : "/");
      router.refresh();
    } else {
      setMessage({ type: "error", text: result.message });
    }
  };

  const resend = async () => {
    setMessage(null);
    const result = await resendVerification();
    if (result.ok) {
      setCooldown(COOLDOWN);
      setMessage({ type: "ok", text: "Verification email sent again. Check your inbox and spam folder." });
    } else {
      setMessage({ type: "error", text: result.message });
    }
  };

  return (
    <AuthShell title="Verify your email" subtitle="One last step before you can log in.">
      {!ready ? (
        <p className="muted">Loading...</p>
      ) : !email ? (
        <div className="space-y-4">
          <p className="muted text-sm">
            We could not find a sign-in in progress. Log in again and we will bring you back here.
          </p>
          <Link href="/login" className="btn btn-primary w-full !py-3">
            Go to login
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-sm leading-relaxed">
            We sent a verification link to <strong>{email}</strong>. Open it (check spam too), then come back and
            press the button below.
          </p>

          <FormMessage type={message?.type}>{message?.text}</FormMessage>

          <button onClick={proceed} disabled={busy} className="btn btn-primary w-full !py-3">
            {busy ? "Checking..." : "I have verified my email"}
          </button>

          <p className="muted text-center text-sm">
            Did not get it?{" "}
            <button
              onClick={resend}
              disabled={cooldown > 0}
              className="font-semibold text-green-700 hover:underline disabled:text-gray-400 disabled:no-underline dark:text-green-400"
            >
              {cooldown > 0 ? `Resend email in ${cooldown}s` : "Resend email"}
            </button>
          </p>
        </div>
      )}
    </AuthShell>
  );
}
