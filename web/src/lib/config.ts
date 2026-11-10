// All backend URLs come from web/.env.local
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export const DISEASE_API_URL = process.env.NEXT_PUBLIC_DISEASE_API_URL ?? "http://127.0.0.1:5000";
export const UPLOADS_URL = `${API_URL}/uploads`;
