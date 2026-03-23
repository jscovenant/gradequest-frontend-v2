import { authApi } from "../utils/axios";

export type SystemNote = {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "danger" | string;
  time: string;
  action_url?: string | null;
  read_at?: string | null; // only on /notifications/all
};

export async function getUnreadNotifications(): Promise<SystemNote[]> {
  const res = await authApi.get<SystemNote[]>("/notifications");
  return res.data;
}

export async function getAllNotifications(): Promise<SystemNote[]> {
  const res = await authApi.get<SystemNote[]>("/notifications/all");
  return res.data;
}

export async function markNotificationRead(id: string) {
  const res = await authApi.post(`/notifications/read/${id}`);
  return res.data;
}