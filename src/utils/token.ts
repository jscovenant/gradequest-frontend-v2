// src/utils/token.ts
import { portalLoginUrl } from "./portal";

const TOKEN_KEY = "gradequest_token";
const USER_KEY = "gradequest_user";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  bursar: "Bursar",
  parent: "Parent",
  student: "Student",
  teacher: "Teacher",
  "super-admin": "Super-Admin",
  "platform-staff": "Platform-Staff",
  "platform staff": "Platform-Staff",
  platformstaff: "Platform-Staff",
  superadmin: "Super-Admin",
  "sales-representative": "Sales-Representative",
  "sales representative": "Sales-Representative",
  salesrepresentative: "Sales-Representative",
  salesrep: "Sales-Representative",
  "sales-rep": "Sales-Representative",
  sales_rep: "Sales-Representative",
};
const OWNER_SUPER_ADMIN_PERMISSIONS = [
  "dashboard",
  "billing",
  "finance",
  "support",
  "sales",
  "marketing",
  "content",
  "settings",
  "audit",
  "staff",
];

const PLATFORM_STAFF_PERMISSION_MAP: Record<string, string[]> = {
  operations: ["dashboard", "support", "billing", "audit"],
  finance: ["dashboard", "billing", "finance", "audit"],
  support: ["dashboard", "support", "audit"],
  sales_manager: ["dashboard", "sales", "marketing", "audit"],
};
const normalizeUser = (user: any) => {
  if (!user?.role) return user;

  const roleKey = String(user.role).trim().toLowerCase();
  const role = ROLE_LABELS[roleKey] || user.role;
  const isSuperAdmin = role === "Super-Admin";
  const isPlatformStaff = role === "Platform-Staff";
  const currentPermissions = Array.isArray(user.super_admin_permissions) ? user.super_admin_permissions : [];
  const superAdminType = user.super_admin_type || (isSuperAdmin ? "owner" : null);
  const fallbackPermissions = isSuperAdmin
    ? OWNER_SUPER_ADMIN_PERMISSIONS
    : role === "Platform-Staff" && superAdminType
      ? (PLATFORM_STAFF_PERMISSION_MAP[superAdminType] || [])
      : [];

  return {
    ...user,
    role,
    super_admin_type: superAdminType,
    super_admin_type_label: user.super_admin_type_label || (isSuperAdmin ? "Super Admin Owner" : null),
    super_admin_permissions: currentPermissions.length === 0 ? fallbackPermissions : currentPermissions,
  };
};

export const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const setUser = (user: any) => {
  localStorage.setItem(USER_KEY, JSON.stringify(normalizeUser(user)));
};

export const getUser = (): any | null => {
  const data = localStorage.getItem(USER_KEY);
  return data ? normalizeUser(JSON.parse(data)) : null;
};

export const clearUser = () => {
  localStorage.removeItem(USER_KEY);
};

export const logout = () => {
  clearToken();
  clearUser();
  window.location.assign(portalLoginUrl());
};








