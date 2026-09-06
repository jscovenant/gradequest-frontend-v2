// src/utils/axios.ts
import axios from "axios";
import { getToken, logout } from "./token";
import { getApiBaseUrl } from "./apiUrl";

const BASE_URL = getApiBaseUrl();

// Public instance (no auth)
export const publicApi = axios.create({
  headers: { 
    "Content-Type": "application/json",
    "Accept": "application/json", 
  },
});

publicApi.interceptors.request.use((config) => {
  if (!config.baseURL || config.baseURL.includes("laravel.cloud")) {
    config.baseURL = getApiBaseUrl();
  }
  return config;
});

// Authenticated instance
export const authApi = axios.create({
  headers: { 
    "Content-Type": "application/json",
    "Accept": "application/json", 
  },
  withCredentials: true, 
});

// Attach token automatically and ensure dynamic baseURL
authApi.interceptors.request.use((config) => {
  if (!config.baseURL || config.baseURL.includes("laravel.cloud")) {
    config.baseURL = getApiBaseUrl();
  }
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
    if (err.response?.status === 401) {
      logout();
    }
    return Promise.reject(err);
  }
);