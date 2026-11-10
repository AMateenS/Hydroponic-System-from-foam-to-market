import { API_URL } from "./config";

/**
 * fetch() for the Express backend. Always sends the login cookie.
 * Accepts either a path ("/order/my-orders") or a full URL.
 */
export const apiFetch = (path: string, init: RequestInit = {}) =>
  fetch(path.startsWith("http") ? path : `${API_URL}${path}`, {
    credentials: "include",
    ...init,
  });
