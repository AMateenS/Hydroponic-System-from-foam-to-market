"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type ActionCodeSettings,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiFetch } from "@/lib/api";

export type User = {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin";
};

export type LoginResult =
  | { ok: true; user: User }
  | { ok: false; message: string; needsVerification?: boolean };

export type ActionResult = { ok: true } | { ok: false; message: string };

type Ctx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  signup: (username: string, email: string, password: string) => Promise<ActionResult>;
  completeVerification: () => Promise<LoginResult>;
  resendVerification: () => Promise<ActionResult>;
  sendReset: (email: string) => Promise<ActionResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<Ctx>(null!);
export const useAuth = () => useContext(AuthContext);

const codeOf = (e: unknown) => (e as { code?: string } | null)?.code ?? "";

const errorMessage = (e: unknown): string => {
  if (e instanceof TypeError) return "Could not connect to the server. Is your backend running?";
  switch (codeOf(e)) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Please log in instead (if you never verified it, we will help you do that).";
    case "auth/invalid-email":
      return "That email address is not valid.";
    case "auth/weak-password":
      return "That password is too weak. Use at least 8 characters.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "Invalid email or password.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is switched off in your Firebase project. Enable it in Firebase console → Authentication → Sign-in method.";
    case "auth/configuration-not-found":
      return "Firebase Authentication is not set up yet. Open Firebase console → Authentication → Get started.";
    case "auth/requires-recent-login":
      return "Please log in again and retry.";
    default:
      return "Something went wrong. Please try again.";
  }
};

// Firebase emails can send people back to our site. If the domain is not on Firebase's
// "authorized domains" list yet, send the plain email instead of failing.
const withContinueUrl = async (send: (settings?: ActionCodeSettings) => Promise<void>) => {
  try {
    await send({ url: `${window.location.origin}/login` });
  } catch (e) {
    const code = codeOf(e);
    if (code === "auth/unauthorized-continue-uri" || code === "auth/invalid-continue-uri") await send();
    else throw e;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch("/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Firebase proves who you are; the backend then starts the shop session (cookie).
  // After that the Firebase login on this device is no longer needed.
  const startSession = async (fbUser: FirebaseUser): Promise<LoginResult> => {
    const idToken = await fbUser.getIdToken(true);
    const res = await apiFetch("/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, username: fbUser.displayName ?? undefined }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      setUser(data.user);
      await signOut(auth).catch(() => {});
      return { ok: true, user: data.user };
    }
    if (data.needsVerification) {
      return { ok: false, needsVerification: true, message: data.message };
    }
    return { ok: false, message: data.message || "Login failed. Please try again." };
  };

  const login: Ctx["login"] = async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!cred.user.emailVerified) {
        // stay signed in with Firebase so the verify page can resend the email
        return { ok: false, needsVerification: true, message: "Please verify your email before logging in." };
      }
      return await startSession(cred.user);
    } catch (e) {
      return { ok: false, message: errorMessage(e) };
    }
  };

  const signup: Ctx["signup"] = async (username, email, password) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: username.trim() });
      await withContinueUrl((s) => sendEmailVerification(cred.user, s));
      return { ok: true }; // stay signed in with Firebase until the email is verified
    } catch (e) {
      return { ok: false, message: errorMessage(e) };
    }
  };

  const completeVerification: Ctx["completeVerification"] = async () => {
    const fbUser = auth.currentUser;
    if (!fbUser) return { ok: false, message: "Please log in again to continue." };
    try {
      await fbUser.reload();
      const fresh = auth.currentUser;
      if (!fresh || !fresh.emailVerified) {
        return {
          ok: false,
          needsVerification: true,
          message: "Your email is not verified yet. Open the link we emailed you, then try again.",
        };
      }
      return await startSession(fresh);
    } catch (e) {
      return { ok: false, message: errorMessage(e) };
    }
  };

  const resendVerification: Ctx["resendVerification"] = async () => {
    const fbUser = auth.currentUser;
    if (!fbUser) return { ok: false, message: "Please log in again, then we can resend the email." };
    try {
      await withContinueUrl((s) => sendEmailVerification(fbUser, s));
      return { ok: true };
    } catch (e) {
      return { ok: false, message: errorMessage(e) };
    }
  };

  const sendReset: Ctx["sendReset"] = async (email) => {
    try {
      await withContinueUrl((s) => sendPasswordResetEmail(auth, email.trim(), s));
      return { ok: true };
    } catch (e) {
      // Do not reveal whether an email has an account
      if (codeOf(e) === "auth/user-not-found") return { ok: true };
      return { ok: false, message: errorMessage(e) };
    }
  };

  const logout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      await signOut(auth).catch(() => {});
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, completeVerification, resendVerification, sendReset, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}
