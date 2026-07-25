// src/utils/api.ts
import axios from "axios";

const rawBaseUrl =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "https://gradequest.com.ng" : "http://localhost:8000");

const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, "");
const API_BASE_URL = normalizedBaseUrl.endsWith("/api")
  ? normalizedBaseUrl
  : `${normalizedBaseUrl}/api`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

// Add a helper for Authorization
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};
