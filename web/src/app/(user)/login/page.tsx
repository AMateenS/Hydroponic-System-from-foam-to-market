"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AuthShell, { FormMessage } from "@/components/AuthShell";

const Login = () => {
  const router = useRouter();
  const { login } = useAuth();
  const [formdata, setformdata] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handlechange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setformdata({ ...formdata, [e.target.name]: e.target.value });
  };

  const handlesubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result = await login(formdata.email, formdata.password);
    setBusy(false);

    if (result.ok) {
      router.push(result.user.role === "admin" ? "/admin" : "/");
      router.refresh();
    } else if (result.needsVerification) {
      router.push("/verify-email");
    } else {
      setError(result.message);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to order produce and follow your orders."
      footer={
        <>
          Don’t have an account?{" "}
          <Link href="/signup" className="font-semibold text-green-700 hover:underline dark:text-green-400">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handlesubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" name="email" required autoComplete="email" value={formdata.email} onChange={handlechange} placeholder="you@example.com" className="field" />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label !mb-0" htmlFor="password">Password</label>
            <Link href="/forgot-password" className="text-sm font-medium text-green-700 hover:underline dark:text-green-400">
              Forgot password?
            </Link>
          </div>
          <input id="password" type="password" name="password" required autoComplete="current-password" value={formdata.password} onChange={handlechange} placeholder="Enter password" className="field mt-1.5" />
        </div>

        <FormMessage>{error}</FormMessage>

        <button type="submit" disabled={busy} className="btn btn-primary w-full !py-3">
          {busy ? "Logging in..." : "Log in"}
        </button>
      </form>
    </AuthShell>
  );
};

export default Login;
