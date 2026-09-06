// src/utils/api.ts
import axios from "axios";
import { getApiBaseUrl } from "./apiUrl";

export const api = axios.create({
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (!config.baseURL || config.baseURL.includes("laravel.cloud")) {
    config.baseURL = getApiBaseUrl();
  }
  return config;
});

// Add a helper for Authorization
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};
