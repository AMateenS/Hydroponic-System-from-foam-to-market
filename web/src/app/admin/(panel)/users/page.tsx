"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface UserRow {
  _id: string;
  username: string;
  email: string;
  role: "user" | "admin";
  isVerified: boolean;
  createdAt: string;
  orders: number;
  spent: number;
}

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/admin/users");
      if (!res.ok) throw new Error();
      setUsers(await res.json());
      setError("");
    } catch {
      setError("Could not load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, path: string, init: RequestInit) => {
    setBusyId(id);
    setNotice(null);
    try {
      const res = await apiFetch(path, init);
      const d = await res.json().catch(() => null);
      setNotice(
        res.ok
          ? { type: "ok", text: d?.message || "Done." }
          : { type: "error", text: d?.message || "Something went wrong." }
      );
      await load();
    } catch {
      setNotice({ type: "error", text: "Could not reach the server." });
    }
    setBusyId(null);
  };

  const changeRole = (u: UserRow, role: "user" | "admin") => {
    if (
      !window.confirm(
        role === "admin"
          ? `Give ${u.username} full admin access?`
          : `Remove admin access from ${u.username}?`
      )
    )
      return;
    act(u._id, `/admin/users/${u._id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
  };

  const remove = (u: UserRow) => {
    if (!window.confirm(`Delete ${u.username} (${u.email}) from the shop? Their past orders are kept. Their Firebase login still exists, so to remove it completely also delete them in Firebase console → Authentication → Users.`)) return;
    act(u._id, `/admin/users/${u._id}`, { method: "DELETE" });
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        (roleFilter === "all" || u.role === roleFilter) &&
        (!q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
  }, [users, search, roleFilter]);

  const admins = users.filter((u) => u.role === "admin").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">Users</h1>
          <p className="muted mt-1 text-sm">
            {users.length} accounts · {admins} admin{admins === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email"
            className="field !w-64"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as "all" | "user" | "admin")}
            className="field !w-auto"
          >
            <option value="all">All roles</option>
            <option value="user">Customers</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      <AnimatePresence>
        {notice && (
          <motion.p
            key={notice.text}
            role="status"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`overflow-hidden rounded-xl px-4 py-3 text-sm ${
              notice.type === "ok"
                ? "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200"
                : "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200"
            }`}
          >
            {notice.text}
          </motion.p>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="surface h-64 animate-pulse" />
      ) : error ? (
        <div className="surface p-8 text-center"><p className="font-semibold">{error}</p><button onClick={load} className="btn btn-outline mt-4">Try again</button></div>
      ) : shown.length === 0 ? (
        <div className="surface p-8 text-center"><p className="font-semibold">No users match.</p></div>
      ) : (
        <div className="surface overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2 text-left text-muted">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Verified</th>
                <th className="p-3">Orders</th>
                <th className="p-3">Spent</th>
                <th className="p-3">Joined</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((u) => {
                const isMe = u._id === me?.id;
                return (
                  <motion.tr key={u._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="border-t border-line">
                    <td className="p-3 font-semibold">
                      {u.username}
                      {isMe && <span className="ml-2 text-xs text-green-600">(you)</span>}
                    </td>
                    <td className="muted p-3">{u.email}</td>
                    <td className="p-3">
                      <select
                        value={u.role}
                        disabled={isMe || busyId === u._id}
                        onChange={(e) => changeRole(u, e.target.value as "user" | "admin")}
                        className="field !w-auto !py-1.5 !text-sm disabled:opacity-50"
                      >
                        <option value="user">Customer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="p-3">
                      {u.isVerified ? (
                        <span className="text-green-600">Yes</span>
                      ) : (
                        <span className="text-yellow-600">No</span>
                      )}
                    </td>
                    <td className="p-3">{u.orders}</td>
                    <td className="p-3">Rs. {u.spent.toLocaleString()}</td>
                    <td className="p-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      <button
                        onClick={() => remove(u)}
                        disabled={isMe || busyId === u._id}
                        className="font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
                      >
                        Delete
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
