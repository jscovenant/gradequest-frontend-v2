// src/services/auth.service.ts
import { publicApi } from "../utils/axios";
import { setToken, setUser } from "../utils/token";

export const login = async (identifier: string, password: string) => {
  const res = await publicApi.post("/login", { identifier, password });
  setToken(res.data.access_token);
  setUser(res.data.user);
  return res.data.user;
};

export const getCurrentUser = () => {
  return JSON.parse(localStorage.getItem("gradequest_user") || "null");
};
