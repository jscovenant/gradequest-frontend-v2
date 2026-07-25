// src/utils/token.ts
const TOKEN_KEY = "gradequest_token";
const USER_KEY = "gradequest_user";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  bursar: "Bursar",
  parent: "Parent",
  student: "Student",
  teacher: "Teacher",
  "super-admin": "Super-Admin",
  superadmin: "Super-Admin",
};

const normalizeUser = (user: any) => {
  if (!user?.role) return user;

  const roleKey = String(user.role).trim().toLowerCase();
  return {
    ...user,
    role: ROLE_LABELS[roleKey] || user.role,
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
  window.location.href = "/login"; 
};
