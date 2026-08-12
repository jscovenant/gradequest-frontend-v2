import { authApi } from "../utils/axios";

export type SupportUser = { id: number; firstname?: string; surname?: string; name?: string; email?: string; role?: string };
export type SupportMessage = {
  id: number;
  sender_type: "school" | "support";
  message: string;
  is_internal_note: boolean;
  created_at: string;
  user?: SupportUser | null;
};
export type SupportTicket = {
  id: number;
  public_id: string;
  ticket_number: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  last_reply_at: string;
  created_at: string;
  messages_count?: number;
  messages?: SupportMessage[];
  school?: { id: number; name: string };
  creator?: SupportUser;
  assignee?: SupportUser | null;
};

export const supportApi = {
  list: (params?: Record<string, string | number>) => authApi.get("/support/tickets", { params }),
  create: (payload: { subject: string; category: string; priority: string; message: string }) => authApi.post("/support/tickets", payload),
  show: (publicId: string) => authApi.get(`/support/tickets/${publicId}`),
  reply: (publicId: string, message: string, internalNote = false) => authApi.post(`/support/tickets/${publicId}/replies`, { message, internal_note: internalNote }),
  update: (publicId: string, payload: { status?: string; priority?: string }) => authApi.patch(`/support/tickets/${publicId}`, payload),
  assign: (publicId: string, assignedTo: number | null) => authApi.patch(`/support/tickets/${publicId}/assign`, { assigned_to: assignedTo }),
  assignees: () => authApi.get("/support/assignees"),
};
