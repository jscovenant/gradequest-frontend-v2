import { authApi } from "../../utils/axios";

export type SalesRepresentative = {
  id: number;
  code: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  region?: string | null;
  status: string;
  sales_page_url?: string;
  commission_rate: number;
  monthly_target_amount: number;
  monthly_target_schools: number;
  joined_at?: string | null;
  assigned_leads: number;
  converted_leads: number;
  pipeline_value: number;
  commission_pending: number;
  commission_paid: number;
};

export type SalesMarketingMaterial = {
  id: number;
  title: string;
  description?: string | null;
  type: "banner" | "flyer" | "video" | "copy";
  asset_url?: string | null;
  external_url?: string | null;
  share_caption?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
};

export type SalesSummary = {
  assigned_leads: number;
  converted_leads: number;
  open_leads: number;
  pipeline_value: number;
  pending_commission: number;
  approved_commission: number;
  paid_commission: number;
  monthly_target_amount: number;
  monthly_target_schools: number;
  sales_page_views?: number;
  sales_page_leads?: number;
};

export type SalesLead = {
  id: number;
  stage: string;
  source: string;
  pipeline_value: number;
  expected_close_date?: string | null;
  converted_at?: string | null;
  prospect_school_name?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  location?: string | null;
  expected_students?: number | null;
  notes?: string | null;
  demo_booking?: any;
  school?: any;
  admin_user?: any;
  representative?: any;
  school_id?: number | null;
  admin_user_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type SalesCommission = {
  id: number;
  commissionable_amount: number;
  commission_rate: number;
  amount: number;
  status: string;
  earned_at?: string | null;
  approved_at?: string | null;
  paid_at?: string | null;
  school?: any;
  subscription?: any;
  sub_payment?: any;
};

export const salesApi = {
  workspace: async () => (await authApi.get("/sales/workspace")).data,
  leads: async (params?: Record<string, any>) => (await authApi.get("/sales/leads", { params })).data,
  commissions: async (params?: Record<string, any>) => (await authApi.get("/sales/commissions", { params })).data,
  createLead: async (payload: Record<string, any>) => (await authApi.post("/sales/leads", payload)).data,
  materials: async () => (await authApi.get("/sales/marketing-materials")).data,
};

export const currency = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export function fmtDate(value?: string | null) {
  if (!value) return "Not set";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function leadTitle(lead?: SalesLead | null) {
  if (!lead) return "Lead";
  return lead.school?.school_name || lead.school?.name || lead.prospect_school_name || lead.demo_booking?.school_name || [lead.admin_user?.firstname, lead.admin_user?.surname].filter(Boolean).join(" ") || `Lead #${lead.id}`;
}

export function leadContact(lead?: SalesLead | null) {
  if (!lead) return "No contact yet";
  return lead.contact_name || lead.contact_email || lead.contact_phone || lead.demo_booking?.email || lead.admin_user?.email || lead.school?.email || "No contact yet";
}



