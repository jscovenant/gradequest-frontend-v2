// src/utils/apiUrl.ts
import { isCustomPortalHost } from "./portal";

/**
 * Returns the backend base URL (without trailing slash and without /api)
 * e.g. "https://api.gradequest.com.ng" or "https://gradequest.com.ng" or "http://localhost:8000"
 */
export const getBackendBaseUrl = (): string => {
  if (isCustomPortalHost()) {
    return window.location.origin;
  }

  const rawUrl =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL;

  if (rawUrl && rawUrl !== "/api" && rawUrl !== "" && !rawUrl.includes("laravel.cloud")) {
    return String(rawUrl).replace(/\/+$/, "").replace(/\/api$/, "");
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "http://18.133.82.13";
};

/**
 * Returns the full API URL (e.g. "https://gradequest.com.ng/api")
 */
export const getApiBaseUrl = (): string => {
  const base = getBackendBaseUrl();
  return `${base}/api`;
};

/**
 * Returns the frontend application base URL
 * e.g. "https://portal.gradequest.com.ng" or "http://localhost:5173"
 */
export const getAppBaseUrl = (): string => {
  const rawUrl =
    import.meta.env.VITE_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return String(rawUrl).replace(/\/+$/, "");
};

/**
 * Resolves a media / photo / logo URL from backend.
 * Handles full URLs (http/https/data), relative paths, or user avatar filenames.
 *
 * @param path The relative or full photo path (e.g. "photo.jpg", "/uploads/users/photo.jpg", "https://...")
 * @param fallback The fallback default image (e.g. "/media/profile.jpg")
 * @param subfolder Optional default subfolder if path is just a filename (e.g. "uploads/users")
 */
export const resolveMediaUrl = (
  path?: string | null,
  fallback = "/media/profile.jpg",
  subfolder?: string
): string => {
  if (!path || typeof path !== "string" || !path.trim()) {
    return fallback;
  }

  const trimmed = path.trim();

  // Already a full or data URL
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  const base = getBackendBaseUrl();

  // If path already starts with / or uploads/
  if (trimmed.startsWith("/")) {
    return `${base}${trimmed}`;
  }

  if (trimmed.startsWith("uploads/")) {
    return `${base}/${trimmed}`;
  }

  if (subfolder) {
    const cleanSub = subfolder.replace(/^\/+|\/+$/g, "");
    return `${base}/${cleanSub}/${trimmed}`;
  }

  return `${base}/uploads/users/${trimmed}`;
};