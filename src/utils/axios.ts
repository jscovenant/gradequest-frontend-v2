// src/utils/axios.ts
import axios from "axios";
import { getToken, logout } from "./token";

const rawBaseUrl =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "https://gradequest.com.ng" : "http://localhost:8000");

const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, "");
const BASE_URL = normalizedBaseUrl.endsWith("/api")
  ? normalizedBaseUrl
  : `${normalizedBaseUrl}/api`;


// const BASE_URL = import.meta.env.VITE_API_URL 
//   ? import.meta.env.VITE_API_URL + "/api"
//   : "http://localhost:8000/api";




// Public instance (no auth)
export const publicApi = axios.create({
  baseURL: BASE_URL,
  headers: { 
    "Content-Type": "application/json",
    "Accept": "application/json", 
  },
  // withCredentials: true, 
});

// Authenticated instance
export const authApi = axios.create({
  baseURL: BASE_URL,
  headers: { 
    "Content-Type": "application/json",
    "Accept": "application/json", 
  },
  withCredentials: true, 
});

// Attach token automatically
authApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
    delete config.headers["content-type"];
  }
  return config;
});

// Handle 401 globally
authApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) logout();
    return Promise.reject(err);
  }
);
