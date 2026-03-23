// src/services/auth.service.ts
import { publicApi } from "../utils/axios";
import { setToken, setUser } from "../utils/token";

export const login = async (email: string, password: string) => {
  const res = await publicApi.post("/auth/login", { email, password });
  setToken(res.data.token);
  setUser(res.data.user);
  return res.data.user;
};

export const getCurrentUser = () => {
  return JSON.parse(localStorage.getItem("gradequest_user") || "null");
};
