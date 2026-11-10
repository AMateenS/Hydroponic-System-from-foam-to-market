"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AuthShell, { FormMessage } from "@/components/AuthShell";

export default function AdminLogin() {
  const router = useRouter();
  const { login, logout } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result = await login(form.email, form.password);
    setBusy(false);

    if (!result.ok) {
      if (result.needsVerification) {
        router.push("/verify-email");
        return;
      }
      setError(result.message);
      return;
    }
    if (result.user.role !== "admin") {
      await logout();
      setError("This account does not have admin access.");
      return;
    }
    router.push("/admin");
    router.refresh();
  };

  return (
    <AuthShell
      variant="admin"
      title="Admin login"
      subtitle="Sign in to the farm control panel."
      footer={
        <Link href="/" className="font-semibold text-green-700 hover:underline dark:text-green-400">
          Back to the website
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="admin-email">Admin email</label>
          <input id="admin-email" type="email" required autoComplete="email" placeholder="admin@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="admin-password">Password</label>
          <input id="admin-password" type="password" required autoComplete="current-password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="field" />
        </div>

        <FormMessage>{error}</FormMessage>

        <button type="submit" disabled={busy} className="btn btn-primary w-full !py-3">
          {busy ? "Checking..." : "Log in"}
        </button>
      </form>
    </AuthShell>
  );
}
