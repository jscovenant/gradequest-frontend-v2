import { authApi } from "../utils/axios";

export type SystemNote = {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "danger" | string;
  time: string;
  action_url?: string | null;
  read_at?: string | null; // only on /notifications/all
};

function unwrapList(data: any): SystemNote[] {
  const value = data?.data ?? data?.notifications ?? data;
  return Array.isArray(value) ? value : [];
}

export async function getUnreadNotifications(): Promise<SystemNote[]> {
  const res = await authApi.get("/notifications");
  return unwrapList(res.data);
}

export async function getAllNotifications(): Promise<SystemNote[]> {
  const res = await authApi.get("/notifications/all");
  return unwrapList(res.data);
}

export async function markNotificationRead(id: string) {
  const res = await authApi.post(`/notifications/read/${id}`);
  return res.data;
}
