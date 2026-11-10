"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AuthShell, { FormMessage } from "@/components/AuthShell";

const Signup = () => {
  const router = useRouter();
  const { signup } = useAuth();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.username.trim().length < 3) return setError("Please enter your name (at least 3 characters).");
    if (form.password.length < 8) return setError("Password must be at least 8 characters long.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");

    setBusy(true);
    const result = await signup(form.username, form.email, form.password);
    setBusy(false);

    if (result.ok) router.push("/verify-email");
    else setError(result.message);
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Order fresh hydroponic produce in a few clicks."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-green-700 hover:underline dark:text-green-400">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="username">Full name</label>
          <input id="username" name="username" required autoComplete="name" value={form.username} onChange={handleChange} placeholder="Your name" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" value={form.email} onChange={handleChange} placeholder="you@example.com" className="field" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required autoComplete="new-password" value={form.password} onChange={handleChange} placeholder="8+ characters" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="confirm">Confirm password</label>
            <input id="confirm" name="confirm" type="password" required autoComplete="new-password" value={form.confirm} onChange={handleChange} placeholder="Repeat password" className="field" />
          </div>
        </div>

        <FormMessage>{error}</FormMessage>

        <button type="submit" disabled={busy} className="btn btn-primary w-full !py-3">
          {busy ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
};

export default Signup;
