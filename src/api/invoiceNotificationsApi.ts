// src/api/invoiceNotificationsApi.ts
import { authApi } from "../utils/axios";

export type InvoiceInfo = {
  id?: number | string;
  invoice_no?: string;
  reference?: string;
  title?: string;
  description?: string;
  payer_name?: string;
  payer_phone?: string;
  payer_email?: string;
  amount?: number | string;
  currency?: string;
  status?: "pending" | "paid" | "overdue" | string;
  due_date?: string | null;
  created_at?: string | null;
  payment_url?: string | null;
};

export type InvoiceNote = {
  id: number;
  type?: "info" | "success" | "warning" | "danger" | "error" | string;
  message: string;
  time?: string;
  created_at?: string;

  is_read?: boolean;
  action_url?: string | null;

  // backend can return invoice directly...
  invoice?: InvoiceInfo | null;

  // ...or meta payload.
  meta?: any;
};

function unwrap<T>(data: any): T {
  // supports: {data: [...]}, {notifications: [...]}, or direct array/object
  return (data?.data ?? data?.notifications ?? data) as T;
}

export async function getUnreadInvoiceNotifications(): Promise<InvoiceNote[]> {
  const res = await authApi.get("/invoice-notifications/unread");
  return unwrap<InvoiceNote[]>(res.data) || [];
}

export async function getAllInvoiceNotifications(): Promise<InvoiceNote[]> {
  const res = await authApi.get("/invoice-notifications");
  return unwrap<InvoiceNote[]>(res.data) || [];
}

export async function getInvoiceNotification(id: number): Promise<InvoiceNote> {
  const res = await authApi.get(`/invoice-notifications/${id}`);
  return unwrap<InvoiceNote>(res.data);
}

export async function markInvoiceNotificationRead(id: number): Promise<void> {
  await authApi.post(`/invoice-notifications/${id}/read`);
}