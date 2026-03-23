import { authApi } from "../utils/axios";

// ─── Model types ───────────────────────────────────────────────────────────────

export type SchoolWhatsappAccount = {
  id: number;
  school_id: number;
  admin_user_id?: number | null;
  waba_id?: string | null;
  phone_number_id?: string | null;
  business_account_id?: string | null;
  display_phone_number?: string | null;
  verified_name?: string | null;
  status?: "pending" | "active" | "disconnected" | "suspended";
  connected_at?: string | null;
  last_health_check_at?: string | null;
  meta_payload?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

export type CreditSummary = {
  allocated_credits: number;
  used_credits: number;
  remaining_credits: number;
  cycle_start: string;
  cycle_end: string;
  subscription_id: number;
};

export type WhatsappMessage = {
  id: number;
  school_id: number;
  subscription_id?: number | null;
  parent_user_id?: number | null;
  student_user_id?: number | null;
  school_whatsapp_account_id: number;
  to_phone: string;
  normalized_phone: string;
  template_name?: string | null;
  template_lang?: string | null;
  status: "queued" | "sent" | "delivered" | "read" | "failed";
  meta_message_id?: string | null;
  credit_cost: number;
  payload?: any;
  meta_response?: any;
  failure_reason?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

// ─── Payload type for connectAccount ──────────────────────────────────────────
// Exported so pages can type their form payloads against it directly.
//
// access_token is OPTIONAL — the school settings page never collects it.
// It is resolved server-side from environment variables (WHATSAPP_GLOBAL_TOKEN).
// waba_id, business_account_id, and status are also optional for the same reason:
// they are managed globally and never entered per-school on the frontend.

export type ConnectAccountPayload = {
  phone_number_id:       string;                                              // required
  access_token?:         string;                                              // optional — server resolves from .env
  waba_id?:              string;                                              // optional — global, stored server-side
  business_account_id?:  string;                                              // optional — global, stored server-side
  display_phone_number?: string;                                              // optional
  verified_name?:        string;                                              // optional
  status?:               "pending" | "active" | "disconnected" | "suspended"; // optional — system-managed
  meta_payload?:         Record<string, unknown>;                             // optional
};

// ─── API methods ───────────────────────────────────────────────────────────────

export const whatsappApi = {
  async getAccount() {
    const res = await authApi.get<{ data: SchoolWhatsappAccount | null }>(
      "/admin/whatsapp/account"
    );
    return res.data.data;
  },

  // Uses the exported ConnectAccountPayload type so callers stay in sync.
  async connectAccount(payload: ConnectAccountPayload) {
    const res = await authApi.post("/admin/whatsapp/account", payload);
    return res.data;
  },

  async getCredits() {
    const res = await authApi.get<{ data: CreditSummary }>("/admin/whatsapp/credits");
    return res.data.data;
  },

  async startAdminVerification(phone: string) {
    const res = await authApi.post("/whatsapp/verify/admin/start", { phone });
    return res.data as {
      message: string;
      verification_id: number;
      expires_at: string;
    };
  },

  async startParentVerification() {
    const res = await authApi.post("/whatsapp/verify/parent/start");
    return res.data as {
      message: string;
      verification_id: number;
      expires_at: string;
    };
  },

  async verifyCode(payload: { verification_id: number; code: string }) {
    const res = await authApi.post("/whatsapp/verify/code", payload);
    return res.data as { message: string };
  },

  async sendToParent(payload: {
    parent_user_id: number;
    student_user_id?: number | null;
    template_name: string;
    lang?: string;
    body_params?: (string | number | null)[];
    credit_cost?: number;
  }) {
    const res = await authApi.post("/admin/whatsapp/send-parent", payload);
    return res.data;
  },

  async getMessages(page = 1) {
    const res = await authApi.get(`/admin/whatsapp/messages?page=${page}`);
    return res.data;
  },
};