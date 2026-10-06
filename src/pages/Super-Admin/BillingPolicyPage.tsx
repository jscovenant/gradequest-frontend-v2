import { useEffect, useMemo, useState, type ReactNode } from "react";
import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import { authApi } from "../../utils/axios";
import { useToast } from "../../contexts/ToastContext";

type Policy = {
  online_grace_days: number;
  online_minimum_coverage_percent: number;
  online_whole_school_block_enabled: boolean;
  online_student_level_block_enabled: boolean;
  offline_grace_days: number;
  offline_school_block_enabled: boolean;
  platform_fee_per_student: string | number;
  support_whatsapp?: string;
  whatsapp_credit_unit_price: string | number;
  legacy_plus_ai_credits: number;
  ai_result_comment_credit_cost: number;
  ai_cbt_question_credit_cost: number;
  ai_lesson_plan_credit_cost: number;
  ai_scheme_work_credit_cost: number;
  ai_lesson_note_credit_cost: number;
  ai_fee_collection_credit_cost: number;
  ai_credit_unit_price: string | number;
  welcome_ai_credits?: number;
  welcome_whatsapp_credits?: number;
  legacy_subscription_honor_enabled: boolean;
  per_student_billing_starts_at?: string | null;
  temporary_access_min_days: number;
  temporary_access_max_days: number;
  promo_enabled?: boolean;
  promo_title?: string;
  promo_description?: string;
  promo_target_plan?: string;
  promo_min_students?: number;
  promo_bonus_days?: number;
  promo_starts_at?: string | null;
  promo_ends_at?: string | null;
  promo_max_claims?: number | null;
  promo_claims_count?: number;
  sales_partner_term_1_commission_rate?: number;
  sales_partner_retention_commission_rate?: number;
  basic_tier_price_per_student?: number | string;
  standard_cbt_tier_price_per_student?: number | string;
  annual_full_session_multiplier?: number | string;
  annual_session_discount_percent?: number | string;
  default_bank_charge_amount?: number | string;
  promo_target_tier?: string;
  promo_discount_percent?: number | string;
  domain_pricing?: Record<string, { price: number | string; label?: string }>;
};

type School = { id: number; school_name?: string | null };

type AuditItem = {
  period_key: string;
  session_id: number;
  session_name: string;
  term_id: number;
  term_name: string;
  is_current: boolean;
  results_count: number;
  cbt_attempts: number;
  invoice_id: number | null;
  invoice_no: string | null;
  invoice_status: string | null;
  invoice_amount_due: number;
  invoice_balance: number;
  students_count: number;
  cleared_students: number;
  blocked_students: number;
  has_activity: boolean;
  is_dormant: boolean;
  is_waivable: boolean;
};

type AuditResponse = {
  school: {
    id: number;
    name: string;
    current_session?: string;
    current_term?: string;
  } | null;
  audit: AuditItem[];
  summary: {
    total_terms: number;
    dormant_terms_count: number;
    total_dormant_debt: number;
    blocked_students_count: number;
  };
};

type Access = {
  id: number;
  school_id: number;
  scope: string;
  status: string;
  starts_at?: string | null;
  ends_at: string;
  reason?: string | null;
  school?: School | null;
};

type BillingPeriod = {
  id: number;
  school_id: number;
  session_id: number;
  term_id: number;
  academic_start_date?: string | null;
  billing_started_at: string;
  billing_grace_ends_at?: string | null;
  term_activated_at?: string | null;
  first_protected_activity_at?: string | null;
  status: string;
  source: string;
  reason?: string | null;
  suspicious_flags?: string[] | null;
  flagged_at?: string | null;
  school?: School | null;
  session?: { id: number; name: string } | null;
  term?: { id: number; name: string } | null;
};

const defaultPolicy: Policy = {
  online_grace_days: 14,
  online_minimum_coverage_percent: 70,
  online_whole_school_block_enabled: true,
  online_student_level_block_enabled: true,
  offline_grace_days: 7,
  offline_school_block_enabled: true,
  platform_fee_per_student: 500,
  basic_tier_price_per_student: 300,
  standard_cbt_tier_price_per_student: 500,
  annual_full_session_multiplier: 3,
  annual_session_discount_percent: 0,
  default_bank_charge_amount: 200,
  support_whatsapp: "08165748374",
  whatsapp_credit_unit_price: 10,
  legacy_plus_ai_credits: 100,
  ai_result_comment_credit_cost: 1,
  ai_cbt_question_credit_cost: 5,
  ai_lesson_plan_credit_cost: 3,
  ai_scheme_work_credit_cost: 4,
  ai_lesson_note_credit_cost: 5,
  ai_fee_collection_credit_cost: 2,
  ai_credit_unit_price: 25,
  welcome_ai_credits: 50,
  welcome_whatsapp_credits: 15,
  legacy_subscription_honor_enabled: true,
  per_student_billing_starts_at: "",
  temporary_access_min_days: 3,
  temporary_access_max_days: 7,
  promo_enabled: false,
  promo_title: "SchoolProfit 2-for-1 Launch Offer",
  promo_description: "Subscribe or clear for 1 full academic session with at least 100 students and receive the next full academic session 100% free with ₦0 platform fee.",
  promo_target_plan: "SchoolProfit Plus",
  promo_target_tier: "all",
  promo_discount_percent: 100,
  promo_min_students: 100,
  promo_bonus_days: 365,
  promo_starts_at: "",
  promo_ends_at: "",
  promo_max_claims: 50,
  promo_claims_count: 0,
  sales_partner_term_1_commission_rate: 30,
  sales_partner_retention_commission_rate: 12,
  domain_pricing: {
    ".com.ng": { price: 35000, label: ".com.ng (Nigeria Commercial/Standard)" },
    ".sch.ng": { price: 35000, label: ".sch.ng (Official Academic)" },
    ".ng": { price: 45000, label: ".ng (Direct National Pride)" },
    ".com": { price: 50000, label: ".com (Global Commercial)" },
    ".org": { price: 55000, label: ".org (Global Organization)" },
  },
};

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function asBool(value: any) {
  return value === true || value === 1 || value === "1";
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="bp-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function BillingPolicyPage() {
  const { showError, showSuccess } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<Policy>(defaultPolicy);
  const [accessList, setAccessList] = useState<Access[]>([]);
  const [billingPeriods, setBillingPeriods] = useState<BillingPeriod[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [grant, setGrant] = useState({ school_id: "", scope: "school_crud", days: 3, reason: "" });
  const [periodSchoolId, setPeriodSchoolId] = useState("");
  const [editingPeriod, setEditingPeriod] = useState<BillingPeriod | null>(null);
  const [periodDate, setPeriodDate] = useState("");
  const [periodReason, setPeriodReason] = useState("");

  const [auditSchoolId, setAuditSchoolId] = useState("");
  const [auditLoading, setAuditLoading] = useState(false);
  const [waiveLoading, setWaiveLoading] = useState(false);
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const [selectedPeriodKeys, setSelectedPeriodKeys] = useState<string[]>([]);
  const [waiverReason, setWaiverReason] = useState("Waived due to verified zero platform usage during dormant term");

  // Whogohost Reseller Wallet & Domain Orders State
  const [domainOrdersData, setDomainOrdersData] = useState<{ reseller_credits?: any; orders?: any } | null>(null);
  const [loadingDomainOrders, setLoadingDomainOrders] = useState(false);
  const [retryingDomainOrderId, setRetryingDomainOrderId] = useState<number | null>(null);
  const [markingDomainOrderId, setMarkingDomainOrderId] = useState<number | null>(null);

  const activeAccess = useMemo(() => accessList.filter((a) => a.status === "active").length, [accessList]);
  const suspiciousPeriods = useMemo(
    () => billingPeriods.filter((p) => Array.isArray(p.suspicious_flags) && p.suspicious_flags.length > 0),
    [billingPeriods]
  );

  const fetchSuperAdminDomainOrders = async () => {
    setLoadingDomainOrders(true);
    try {
      const res = await authApi.get("/superadmin/domain-orders");
      if (res.data?.status) {
        setDomainOrdersData(res.data);
      }
    } catch (err: any) {
      console.warn("Unable to load domain orders:", err);
    } finally {
      setLoadingDomainOrders(false);
    }
  };

  const handleSuperAdminRetryProvision = async (orderId: number) => {
    setRetryingDomainOrderId(orderId);
    try {
      showInfo?.("Triggering domain registration with Whogohost...");
      const res = await authApi.post(`/superadmin/domain-orders/${orderId}/retry-provision`);
      if (res.data?.status) {
        showSuccess?.(res.data.message || "Domain registration action completed!");
        fetchSuperAdminDomainOrders();
      } else {
        showError?.(res.data.message || "Provisioning attempt failed.");
      }
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to communicate with domain registrar.");
    } finally {
      setRetryingDomainOrderId(null);
    }
  };

  const handleSuperAdminMarkActive = async (orderId: number) => {
    setMarkingDomainOrderId(orderId);
    try {
      const res = await authApi.post(`/superadmin/domain-orders/${orderId}/mark-active`);
      if (res.data?.status) {
        showSuccess?.(res.data.message || "Domain marked as Active!");
        fetchSuperAdminDomainOrders();
      } else {
        showError?.(res.data.message || "Action failed.");
      }
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to mark domain as active.");
    } finally {
      setMarkingDomainOrderId(null);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await authApi.get("/superadmin/billing-policy");
      setPolicy({ ...defaultPolicy, ...(res.data.policy || {}) });
      setAccessList(Array.isArray(res.data.temporary_access) ? res.data.temporary_access : []);
      setBillingPeriods(Array.isArray(res.data.billing_periods) ? res.data.billing_periods : []);
      fetchSuperAdminDomainOrders();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to load billing policy.");
    } finally {
      setLoading(false);
    }
  };

  const searchSchools = async () => {
    try {
      const res = await authApi.get(`/superadmin/billing-policy/schools?q=${encodeURIComponent(schoolSearch)}`);
      setSchools(Array.isArray(res.data.schools) ? res.data.schools : []);
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to search schools.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchSchools();
    }, 250);
    return () => clearTimeout(timer);
  }, [schoolSearch]);

  const savePolicy = async () => {
    setSaving(true);
    try {
      const payload = {
        platform_fee_per_student: Number(policy.platform_fee_per_student || 0),
        basic_tier_price_per_student: Number(policy.basic_tier_price_per_student || 300),
        standard_cbt_tier_price_per_student: Number(policy.standard_cbt_tier_price_per_student || 500),
        default_bank_charge_amount: Number(policy.default_bank_charge_amount || 200),
        annual_full_session_multiplier: Number(policy.annual_full_session_multiplier || 3),
        annual_session_discount_percent: Number(policy.annual_session_discount_percent || 0),
        online_grace_days: Number(policy.online_grace_days || 0),
        online_minimum_coverage_percent: Number(policy.online_minimum_coverage_percent || 0),
        online_whole_school_block_enabled: asBool(policy.online_whole_school_block_enabled),
        online_student_level_block_enabled: asBool(policy.online_student_level_block_enabled),
        offline_grace_days: Number(policy.offline_grace_days || 0),
        offline_school_block_enabled: asBool(policy.offline_school_block_enabled),
        support_whatsapp: policy.support_whatsapp || null,
        sales_partner_term_1_commission_rate: Number(policy.sales_partner_term_1_commission_rate ?? 30),
        sales_partner_retention_commission_rate: Number(policy.sales_partner_retention_commission_rate ?? 12),
        whatsapp_credit_unit_price: Number(policy.whatsapp_credit_unit_price || 0),
        legacy_plus_ai_credits: Number(policy.legacy_plus_ai_credits || 0),
        ai_result_comment_credit_cost: Number(policy.ai_result_comment_credit_cost || 1),
        ai_cbt_question_credit_cost: Number(policy.ai_cbt_question_credit_cost || 1),
        ai_lesson_plan_credit_cost: Number(policy.ai_lesson_plan_credit_cost || 1),
        ai_scheme_work_credit_cost: Number((policy as any).ai_scheme_work_credit_cost || 4),
        ai_lesson_note_credit_cost: Number((policy as any).ai_lesson_note_credit_cost || 5),
        ai_fee_collection_credit_cost: Number(policy.ai_fee_collection_credit_cost || 1),
        ai_credit_unit_price: Number(policy.ai_credit_unit_price || 0),
        welcome_ai_credits: Number(policy.welcome_ai_credits ?? 50),
        welcome_whatsapp_credits: Number(policy.welcome_whatsapp_credits ?? 15),
        legacy_subscription_honor_enabled: asBool(policy.legacy_subscription_honor_enabled),
        per_student_billing_starts_at: policy.per_student_billing_starts_at || null,
        temporary_access_min_days: Number(policy.temporary_access_min_days || 1),
        temporary_access_max_days: Number(policy.temporary_access_max_days || 1),
        promo_enabled: asBool(policy.promo_enabled),
        promo_title: policy.promo_title || "",
        promo_description: policy.promo_description || "",
        promo_target_plan: policy.promo_target_plan || "SchoolProfit Plus",
        promo_target_tier: policy.promo_target_tier || "all",
        promo_discount_percent: Number(policy.promo_discount_percent ?? 100),
        promo_min_students: Number(policy.promo_min_students ?? 100),
        promo_bonus_days: Number(policy.promo_bonus_days ?? 365),
        promo_starts_at: policy.promo_starts_at || null,
        promo_ends_at: policy.promo_ends_at || null,
        promo_max_claims: policy.promo_max_claims ? Number(policy.promo_max_claims) : null,
        domain_pricing: policy.domain_pricing || defaultPolicy.domain_pricing,
      };
      const res = await authApi.put("/superadmin/billing-policy", payload);
      setPolicy({ ...defaultPolicy, ...(res.data.policy || {}) });
      showSuccess?.("Billing policy updated successfully.");
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to update billing policy.");
    } finally {
      setSaving(false);
    }
  };

  const grantWelcomeBonusToAll = async () => {
    if (!window.confirm("Grant the 50 AI + 15 WhatsApp welcome package to all registered schools in the database? Existing schools that already received it will be safely skipped.")) {
      return;
    }
    setSaving(true);
    try {
      const res = await authApi.post("/superadmin/billing-policy/grant-welcome-credits");
      showSuccess?.(res.data.message || "Welcome credits granted to all schools successfully!");
      await load();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to grant welcome credits.");
    } finally {
      setSaving(false);
    }
  };

  const grantAccess = async () => {
    if (!grant.school_id || !grant.reason.trim()) {
      showError?.("Select a school and enter a reason.");
      return;
    }

    setSaving(true);
    try {
      await authApi.post("/superadmin/billing-temporary-access", {
        ...grant,
        school_id: Number(grant.school_id),
        days: Number(grant.days),
      });
      setGrant({ school_id: "", scope: "school_crud", days: Number(policy.temporary_access_min_days || 3), reason: "" });
      showSuccess?.("Temporary access granted.");
      await load();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to grant temporary access.");
    } finally {
      setSaving(false);
    }
  };

  const revokeAccess = async (id: number) => {
    setSaving(true);
    try {
      await authApi.delete(`/superadmin/billing-temporary-access/${id}`);
      showSuccess?.("Temporary access revoked.");
      await load();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to revoke access.");
    } finally {
      setSaving(false);
    }
  };

  const syncCurrentPeriod = async () => {
    if (!periodSchoolId) {
      showError?.("Select a school first.");
      return;
    }

    setSaving(true);
    try {
      await authApi.post("/superadmin/billing-periods/sync-current", {
        school_id: Number(periodSchoolId),
      });
      showSuccess?.("Current period synchronized.");
      await load();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to sync current period.");
    } finally {
      setSaving(false);
    }
  };

  const openEditPeriod = (period: BillingPeriod) => {
    setEditingPeriod(period);
    setPeriodDate((period.billing_started_at || "").slice(0, 10));
    setPeriodReason(period.reason || "");
  };

  const updateBillingPeriod = async () => {
    if (!editingPeriod || !periodDate || !periodReason.trim()) {
      showError?.("Enter a valid start date and reason.");
      return;
    }

    setSaving(true);
    try {
      await authApi.put(`/superadmin/billing-periods/${editingPeriod.id}`, {
        billing_started_at: periodDate,
        reason: periodReason.trim(),
      });
      showSuccess?.("Billing start date updated.");
      setEditingPeriod(null);
      setPeriodDate("");
      setPeriodReason("");
      await load();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to update billing period.");
    } finally {
      setSaving(false);
    }
  };

  const handleAuditSchool = async () => {
    if (!auditSchoolId) {
      showError?.("Select a school to audit.");
      return;
    }
    setAuditLoading(true);
    try {
      const res = await authApi.get(`/superadmin/billing/audit-activity/${auditSchoolId}`);
      setAuditData(res.data);
      const waivableKeys = (res.data.audit || [])
        .filter((item: AuditItem) => item.is_waivable)
        .map((item: AuditItem) => item.period_key);
      setSelectedPeriodKeys(waivableKeys);
      showSuccess?.(`Audit complete: ${res.data.summary?.dormant_terms_count || 0} dormant term(s) detected.`);
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to audit school activity.");
    } finally {
      setAuditLoading(false);
    }
  };

  const togglePeriodKey = (key: string) => {
    setSelectedPeriodKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleSelectAll = () => {
    if (!auditData) return;
    const waivableKeys = (auditData.audit || [])
      .filter((item) => item.is_waivable)
      .map((item) => item.period_key);
    if (selectedPeriodKeys.length === waivableKeys.length) {
      setSelectedPeriodKeys([]);
    } else {
      setSelectedPeriodKeys(waivableKeys);
    }
  };

  const handleWaiveSelected = async () => {
    if (!auditSchoolId || !auditData) {
      showError?.("Audit a school first.");
      return;
    }
    if (selectedPeriodKeys.length === 0) {
      showError?.("Select at least one dormant period to waive.");
      return;
    }

    if (!window.confirm(`Are you sure you want to waive billings for ${selectedPeriodKeys.length} period(s)? This will clear student billing locks and synchronize the school to start fresh on their active session.`)) {
      return;
    }

    setWaiveLoading(true);
    try {
      const res = await authApi.post("/superadmin/billing/waive-dormant-terms", {
        school_id: Number(auditSchoolId),
        period_keys: selectedPeriodKeys,
        reason: waiverReason.trim(),
      });
      showSuccess?.(res.data.message || "Dormant billings successfully waived.");
      if (res.data.fresh_audit) {
        setAuditData(res.data.fresh_audit);
        const newWaivable = (res.data.fresh_audit.audit || [])
          .filter((item: AuditItem) => item.is_waivable)
          .map((item: AuditItem) => item.period_key);
        setSelectedPeriodKeys(newWaivable);
      } else {
        await handleAuditSchool();
      }
      await load();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to waive dormant billings.");
    } finally {
      setWaiveLoading(false);
    }
  };


  return (
    <>
      <style>{`
        .bp-main { padding: 24px; max-width: 100%; overflow-x: hidden; box-sizing: border-box; }
        .bp-hero { margin-bottom: 24px; }
        .bp-kicker { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #d300b0; letter-spacing: .08em; }
        .bp-title { font-size: 26px; font-weight: 800; color: #0f172a; margin: 4px 0 6px; word-break: break-word; }
        .bp-sub { color: #64748b; font-size: 14px; max-width: 760px; margin: 0; word-break: break-word; }
        .bp-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 18px; min-width: 0; }
        .bp-grid > * { min-width: 0; max-width: 100%; }
        @media (max-width: 1199px) { .bp-grid { grid-template-columns: 1fr; } }
        .bp-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; max-width: 100%; box-sizing: border-box; }
        .bp-card-pad { padding: 18px; }
        .bp-card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
        .bp-card-head > * { min-width: 0; }
        .bp-card-title { font-size: 15px; font-weight: 700; color: #0f172a; word-break: break-word; }
        .bp-muted { font-size: 12.5px; color: #64748b; word-break: break-word; }
        .bp-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 768px) { .bp-form-grid { grid-template-columns: 1fr; } }
        .bp-field { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; font-weight: 600; color: #334155; min-width: 0; }
        .bp-input, .bp-select, .bp-textarea { width: 100%; max-width: 100%; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 10px; padding: 9px 12px; font-size: 13.5px; background: #fff; }
        .bp-input:focus, .bp-select:focus, .bp-textarea:focus { outline: none; border-color: #d300b0; box-shadow: 0 0 0 3px rgba(211,0,176,.12); }
        .bp-textarea { min-height: 80px; resize: vertical; }
        .bp-switch { display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #f8fafc; border-radius: 12px; margin-top: 10px; flex-wrap: wrap; gap: 8px; }
        .bp-switch input { width: 18px; height: 18px; flex-shrink: 0; }
        .bp-btn { background: #0F2744; color: #fff; border: none; border-radius: 10px; padding: 10px 16px; font-size: 13.5px; font-weight: 700; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
        .bp-btn:disabled { opacity: .6; cursor: not-allowed; }
        .bp-btn-outline { background: #fff; border: 1px solid #cbd5e1; color: #334155; border-radius: 8px; padding: 6px 10px; font-size: 12px; font-weight: 600; cursor: pointer; }
        .bp-pill { display: inline-flex; align-items: center; font-size: 11.5px; font-weight: 700; padding: 3px 8px; border-radius: 999px; background: rgba(211,0,176,.12); color: #d300b0; max-width: 100%; }
        .bp-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9; flex-wrap: wrap; gap: 8px; }
        .bp-row > * { min-width: 0; }
        .bp-row:last-child { border-bottom: none; }
        .bp-flag { font-size: 11px; font-weight: 700; color: #b91c1c; background: #fee2e2; border-radius: 999px; padding: 2px 8px; display: inline-block; margin: 2px 4px 0 0; }
        .bp-audit-grid { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: flex-end; margin-bottom: 16px; }
        .bp-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; max-width: 100%; }
        @media (max-width: 768px) {
          .bp-main { padding: 14px 10px; }
          .bp-card-pad { padding: 14px 12px; }
          .bp-title { font-size: 20px; }
          .bp-hero { margin-bottom: 16px; }
          .bp-audit-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Billing Policy" />
      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="col-md-9 col-lg-10 ms-auto db-main bp-main">
            {(loading || saving) && <Loader message={saving ? "Saving billing policy..." : "Loading billing policy..."} />}

            <section className="bp-hero d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div>
                <div className="bp-kicker">SchoolProfit Revenue & Platform Policy</div>
                <h1 className="bp-title">Platform Billing & Tier Policy</h1>
                <p className="bp-sub">
                  Configure per-student edition tier prices, custom domain selling rates, welcome AI & WhatsApp starter packs, standard bank processing charges, and commissions.
                </p>
              </div>
              <div>
                <button className="bp-btn" onClick={savePolicy} disabled={saving} style={{ padding: "10px 20px", fontSize: 14 }}>
                  <i className="bi bi-check2-circle fs-5" />
                  {saving ? "Saving Policy..." : "Save Platform Policies"}
                </button>
              </div>
            </section>

            <div className="bp-grid">
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* 1. Core Pricing & Universal Bank Charge Card */}
                <section className="bp-card" style={{ border: "2px solid rgba(211, 0, 176, 0.2)", boxShadow: "0 10px 30px rgba(211, 0, 176, 0.06)" }}>
                  <div className="bp-card-pad">
                    <div className="bp-card-head">
                      <div>
                        <div className="bp-card-title" style={{ fontSize: 16, color: "#4c0519", display: "flex", alignItems: "center", gap: 8 }}>
                          <i className="bi bi-credit-card-2-front-fill" style={{ color: "#d300b0" }} />
                          1. Universal Bank Processing Charge & Edition Tiers
                        </div>
                        <div className="bp-muted">
                          These platform rates apply universally across all schools. School Admins cannot modify or bypass these values.
                        </div>
                      </div>
                      <span className="bp-pill" style={{ background: "rgba(211, 0, 176, 0.12)", color: "#9d174d", fontWeight: 800 }}>
                        <i className="bi bi-shield-lock-fill me-1" /> Super-Admin Controlled
                      </span>
                    </div>

                    {/* Prominent Bank Charge Banner */}
                    <div style={{ background: "linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)", border: "1.5px solid #f0abfc", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
                      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                        <label style={{ fontSize: 13.5, fontWeight: 900, color: "#701a75", display: "flex", alignItems: "center", gap: 6 }}>
                          <i className="bi bi-bank2" />
                          Platform Bank Processing Charge (₦ / student transaction)
                        </label>
                        <span className="badge" style={{ background: "#701a75", color: "#fff", padding: "4px 10px", borderRadius: 999, fontSize: 11 }}>
                          Universal Standard
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: "#86198f", margin: "0 0 10px 0", lineHeight: 1.5 }}>
                        This charge is automatically added to both <strong>Online checkout</strong> and <strong>Offline school invoices</strong> per student (e.g., ₦200 gateway cost). School admins cannot alter this amount in their dashboard.
                      </p>
                      <div style={{ maxWidth: 280 }}>
                        <div className="input-group">
                          <span className="input-group-text" style={{ background: "#f5d0fe", borderColor: "#f0abfc", fontWeight: 900, color: "#701a75" }}>₦</span>
                          <input
                            className="form-control fw-bold"
                            style={{ borderColor: "#f0abfc", fontSize: 16, color: "#4a044e" }}
                            type="number"
                            min={0}
                            step="10"
                            value={policy.default_bank_charge_amount ?? 200}
                            onChange={(e) => setPolicy((p) => ({ ...p, default_bank_charge_amount: e.target.value }))}
                          />
                          <span className="input-group-text" style={{ background: "#f5d0fe", borderColor: "#f0abfc", fontSize: 12, color: "#701a75" }}>/ txn</span>
                        </div>
                      </div>
                    </div>

                    {/* Per-Student Edition Tiers */}
                    <div className="bp-form-grid">
                      <Field label="Basic Result Edition Fee (₦ / student / term)">
                        <input
                          className="bp-input"
                          type="number"
                          min={0}
                          value={policy.basic_tier_price_per_student ?? 300}
                          onChange={(e) => setPolicy((p) => ({ ...p, basic_tier_price_per_student: e.target.value }))}
                        />
                      </Field>
                      <Field label="Standard CBT & AI Edition Fee (₦ / student / term)">
                        <input
                          className="bp-input"
                          type="number"
                          min={0}
                          value={policy.standard_cbt_tier_price_per_student ?? 500}
                          onChange={(e) => setPolicy((p) => ({ ...p, standard_cbt_tier_price_per_student: e.target.value, platform_fee_per_student: e.target.value }))}
                        />
                      </Field>
                      <Field label="Annual Full Session Multiplier (Terms)">
                        <input
                          className="bp-input"
                          type="number"
                          min={1}
                          max={12}
                          step="0.5"
                          value={policy.annual_full_session_multiplier ?? 3}
                          onChange={(e) => setPolicy((p) => ({ ...p, annual_full_session_multiplier: Number(e.target.value) }))}
                        />
                      </Field>
                      <Field label="Annual Full Session Discount (%)">
                        <input
                          className="bp-input"
                          type="number"
                          min={0}
                          max={100}
                          step="0.5"
                          value={policy.annual_session_discount_percent ?? 0}
                          onChange={(e) => setPolicy((p) => ({ ...p, annual_session_discount_percent: Number(e.target.value) }))}
                        />
                      </Field>
                      <Field label="Per-student billing system cutover starts">
                        <input
                          className="bp-input"
                          type="datetime-local"
                          value={(policy.per_student_billing_starts_at || "").slice(0, 16)}
                          onChange={(e) => setPolicy((p) => ({ ...p, per_student_billing_starts_at: e.target.value }))}
                        />
                      </Field>
                    </div>
                  </div>
                </section>

                {/* 2. Free Welcome Pack & AI / WhatsApp Credits */}
                <section className="bp-card" style={{ border: "1.5px solid rgba(5, 150, 105, 0.3)" }}>
                  <div className="bp-card-pad">
                    <div className="bp-card-head">
                      <div>
                        <div className="bp-card-title" style={{ color: "#065F46", display: "flex", alignItems: "center", gap: 8 }}>
                          <i className="bi bi-gift-fill" style={{ color: "#059669" }} />
                          2. Free Welcome Starter Pack &amp; Credits Config
                        </div>
                        <div className="bp-muted">Set default starter bonuses for new signups and top-up unit costs.</div>
                      </div>
                    </div>

                    <div className="bp-form-grid">
                      <Field label="Free Welcome AI Credits (on signup)">
                        <input
                          className="bp-input"
                          type="number"
                          min={0}
                          value={policy.welcome_ai_credits ?? 50}
                          onChange={(e) => setPolicy((p) => ({ ...p, welcome_ai_credits: Number(e.target.value) }))}
                        />
                      </Field>
                      <Field label="Free Welcome WhatsApp Messages (on signup)">
                        <input
                          className="bp-input"
                          type="number"
                          min={0}
                          value={policy.welcome_whatsapp_credits ?? 15}
                          onChange={(e) => setPolicy((p) => ({ ...p, welcome_whatsapp_credits: Number(e.target.value) }))}
                        />
                      </Field>
                      <Field label="AI credit unit price (₦ / credit top-up)">
                        <input className="bp-input" type="number" min={0} step="0.5" value={policy.ai_credit_unit_price} onChange={(e) => setPolicy((p) => ({ ...p, ai_credit_unit_price: e.target.value }))} />
                      </Field>
                      <Field label="WhatsApp unit price (₦ / message top-up)">
                        <input className="bp-input" type="number" min={0} step="0.5" value={policy.whatsapp_credit_unit_price} onChange={(e) => setPolicy((p) => ({ ...p, whatsapp_credit_unit_price: e.target.value }))} />
                      </Field>
                      <Field label="AI Lesson Note generation cost (Credits)">
                        <input className="bp-input" type="number" min={1} value={policy.ai_lesson_note_credit_cost ?? 5} onChange={(e) => setPolicy((p) => ({ ...p, ai_lesson_note_credit_cost: Number(e.target.value) }))} />
                      </Field>
                      <Field label="AI Scheme of Work generation cost (Credits)">
                        <input className="bp-input" type="number" min={1} value={policy.ai_scheme_work_credit_cost ?? 4} onChange={(e) => setPolicy((p) => ({ ...p, ai_scheme_work_credit_cost: Number(e.target.value) }))} />
                      </Field>
                      <Field label="AI CBT Question creation cost (Credits)">
                        <input className="bp-input" type="number" min={1} value={policy.ai_cbt_question_credit_cost} onChange={(e) => setPolicy((p) => ({ ...p, ai_cbt_question_credit_cost: Number(e.target.value) }))} />
                      </Field>
                      <Field label="AI Result evaluation remark cost (Credits)">
                        <input className="bp-input" type="number" min={1} value={policy.ai_result_comment_credit_cost} onChange={(e) => setPolicy((p) => ({ ...p, ai_result_comment_credit_cost: Number(e.target.value) }))} />
                      </Field>
                    </div>

                    {/* Re-Activation Banner */}
                    <div style={{ marginTop: 14, padding: "14px 16px", background: "rgba(5, 150, 105, 0.08)", borderRadius: 12, border: "1px solid rgba(5, 150, 105, 0.25)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 800, color: "#065F46", fontSize: 13.5 }}>🎁 Welcome Starter Pack Re-Activation</div>
                        <div style={{ color: "#047857", fontSize: 12 }}>
                          Inject 50 AI + 15 WhatsApp welcome credits into all existing registered schools in the database.
                        </div>
                      </div>
                      <button type="button" className="btn btn-sm btn-success" onClick={grantWelcomeBonusToAll} disabled={saving} style={{ fontWeight: 700, borderRadius: 8, padding: "7px 16px" }}>
                        <i className="bi bi-gift-fill me-1" /> Grant to All Existing Schools
                      </button>
                    </div>
                  </div>
                </section>

                {/* 3. Sales Partner Commissions */}
                <section className="bp-card">
                  <div className="bp-card-pad">
                    <div className="bp-card-head">
                      <div>
                        <div className="bp-card-title">3. Sales Representative & Partner Commissions</div>
                        <div className="bp-muted">Default commission percentage rates for onboarding sales agents.</div>
                      </div>
                    </div>
                    <div className="bp-form-grid">
                      <Field label="First Term Commission Rate (%)">
                        <input
                          className="bp-input"
                          type="number"
                          min={0}
                          max={100}
                          step="0.5"
                          value={policy.sales_partner_term_1_commission_rate ?? 30}
                          onChange={(e) => setPolicy((p) => ({ ...p, sales_partner_term_1_commission_rate: Number(e.target.value) }))}
                        />
                      </Field>
                      <Field label="Recurring Retention Commission Rate (%)">
                        <input
                          className="bp-input"
                          type="number"
                          min={0}
                          max={100}
                          step="0.5"
                          value={policy.sales_partner_retention_commission_rate ?? 12}
                          onChange={(e) => setPolicy((p) => ({ ...p, sales_partner_retention_commission_rate: Number(e.target.value) }))}
                        />
                      </Field>
                    </div>
                  </div>
                </section>

                {/* 4. Managed Custom Domain Registration & Hosting Retail Pricing */}
                <section className="bp-card" style={{ border: "2px solid #2563EB", boxShadow: "0 10px 25px rgba(37, 99, 235, 0.08)" }}>
                  <div className="bp-card-pad">
                    <div className="bp-card-head">
                      <div>
                        <div className="bp-card-title" style={{ color: "#1E3A8A", display: "flex", alignItems: "center", gap: 8 }}>
                          <i className="bi bi-globe2" style={{ color: "#2563EB" }} />
                          4. Custom Domain Registration & Managed Hosting Retail Pricing
                        </div>
                        <div className="bp-muted">
                          Dynamically set the annual price (₦ / year) charged to schools when purchasing custom domains on SchoolProfit. Whogohost wholesale fees are automatically deducted from your reseller wallet upon school payment.
                        </div>
                      </div>
                      <span className="bp-pill" style={{ background: "rgba(37, 99, 235, 0.12)", color: "#1D4ED8", fontWeight: 800 }}>
                        <i className="bi bi-shield-lock-fill me-1" /> Whogohost Automated
                      </span>
                    </div>

                    <div className="row g-3">
                      {[
                        { tld: ".com.ng", wholesale: "~₦2,500 - ₦3,500", name: "Nigeria Standard / Commercial (.com.ng)", defaultPrice: 35000 },
                        { tld: ".sch.ng", wholesale: "~₦2,500 - ₦3,500", name: "Official Academic Nigeria (.sch.ng)", defaultPrice: 35000 },
                        { tld: ".ng", wholesale: "~₦12,000 - ₦15,000", name: "Direct National Pride (.ng)", defaultPrice: 45000 },
                        { tld: ".com", wholesale: "~₦18,000 - ₦22,000", name: "Global Commercial (.com)", defaultPrice: 50000 },
                        { tld: ".org", wholesale: "~₦20,000 - ₦25,000", name: "Global Non-Profit / NGO (.org)", defaultPrice: 55000 },
                      ].map((item) => {
                        const currentPrice = Number(policy.domain_pricing?.[item.tld]?.price ?? item.defaultPrice);
                        return (
                          <div key={item.tld} className="col-12 col-md-6 col-xl-4">
                            <div className="p-3 rounded-3 border bg-light h-100 d-flex flex-column justify-content-between">
                              <div>
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <span className="badge bg-primary fs-6">{item.tld}</span>
                                  <span className="text-muted small">Cost: {item.wholesale}</span>
                                </div>
                                <div className="small fw-bold text-dark mb-2">{item.name}</div>
                              </div>
                              <div>
                                <label className="form-label small fw-bold text-muted mb-1">Retail Selling Price (₦ / year):</label>
                                <div className="input-group">
                                  <span className="input-group-text bg-white fw-bold">₦</span>
                                  <input
                                    type="number"
                                    className="form-control fw-bold text-primary"
                                    min={0}
                                    step={1000}
                                    value={currentPrice}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setPolicy((p) => ({
                                        ...p,
                                        domain_pricing: {
                                          ...(p.domain_pricing || {}),
                                          [item.tld]: {
                                            price: val,
                                            label: p.domain_pricing?.[item.tld]?.label || item.name,
                                          },
                                        },
                                      }));
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* One-Time Existing Domain Setup Fee */}
                    <div className="mt-4 p-3 rounded-3 border" style={{ background: "rgba(37, 99, 235, 0.04)", borderColor: "rgba(37, 99, 235, 0.25)" }}>
                      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                        <div>
                          <div className="fw-bold text-dark d-flex align-items-center gap-2">
                            <i className="bi bi-link-45deg text-primary fs-5" />
                            Existing Custom Domain Connection / Setup Processing Fee (₦)
                          </div>
                          <div className="text-muted small">
                            One-time fee charged via Paystack when a school connects an existing domain registered externally (e.g. GoDaddy, Namecheap). If a school removes and connects another domain later, they are charged for that new domain connection.
                          </div>
                        </div>
                        <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2 fw-bold">
                          One-Time Processing Fee
                        </span>
                      </div>

                      <div className="row g-2 align-items-center mt-2">
                        <div className="col-12 col-md-5">
                          <div className="input-group">
                            <span className="input-group-text bg-white fw-bold">₦</span>
                            <input
                              type="number"
                              className="form-control fw-bold text-primary"
                              min={0}
                              step={500}
                              value={Number(policy.domain_pricing?.setup_fee?.price ?? policy.domain_pricing?.setup_fee ?? 10000)}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setPolicy((p) => ({
                                  ...p,
                                  domain_pricing: {
                                    ...(p.domain_pricing || {}),
                                    setup_fee: {
                                      price: val,
                                      label: "Existing Custom Domain Setup & DNS Processing Fee",
                                    },
                                  },
                                }));
                              }}
                            />
                            <span className="input-group-text bg-light small text-muted">one-time / domain</span>
                          </div>
                        </div>
                        <div className="col-12 col-md-7">
                          <span className="text-muted small">
                            Set to <code>0</code> if you want to allow schools to connect existing domains for free without Paystack checkout.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 5. Whogohost Reseller Wallet & Live School Domain Orders */}
                <section className="bp-card" style={{ border: "2px solid #0ea5e9", boxShadow: "0 10px 25px rgba(14, 165, 233, 0.08)" }}>
                  <div className="bp-card-pad">
                    <div className="bp-card-head">
                      <div>
                        <div className="bp-card-title" style={{ color: "#0369a1", display: "flex", alignItems: "center", gap: 8, fontSize: 16 }}>
                          <i className="bi bi-hdd-network-fill" style={{ color: "#0ea5e9" }} />
                          5. Whogohost Reseller Wallet & Live School Domain Orders
                        </div>
                        <div className="bp-muted">
                          Monitor your live Whogohost/GO54 reseller wallet balance and manage custom domain purchases across all schools. Once your reseller wallet is funded, you can retry automated provisioning with 1 click.
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm fw-bold d-inline-flex align-items-center gap-1"
                          onClick={fetchSuperAdminDomainOrders}
                          disabled={loadingDomainOrders}
                        >
                          <i className="bi bi-arrow-repeat" />
                          {loadingDomainOrders ? "Refreshing..." : "Refresh Wallet & Orders"}
                        </button>
                        <a
                          href="https://whogohost.com/host/clientarea.php"
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-primary btn-sm fw-bold d-inline-flex align-items-center gap-1 text-white"
                          style={{ background: "#0F2744" }}
                        >
                          <i className="bi bi-wallet2" /> Top-Up GO54 Wallet
                        </a>
                      </div>
                    </div>

                    {/* Reseller Wallet Balance Display */}
                    <div
                      className="p-3 rounded-3 border mb-4 d-flex flex-wrap justify-content-between align-items-center gap-3"
                      style={{
                        background: Number(domainOrdersData?.reseller_credits?.balance ?? 0) < 5000
                          ? "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)"
                          : "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                        borderColor: Number(domainOrdersData?.reseller_credits?.balance ?? 0) < 5000 ? "#fcd34d" : "#86efac",
                      }}
                    >
                      <div className="d-flex align-items-center gap-3" style={{ minWidth: 0 }}>
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            background: Number(domainOrdersData?.reseller_credits?.balance ?? 0) < 5000 ? "#f59e0b" : "#10b981",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: 24,
                            flexShrink: 0,
                          }}
                        >
                          <i className="bi bi-cash-stack" />
                        </div>
                        <div style={{ minWidth: 0, wordBreak: "break-word" }}>
                          <div className="text-muted small fw-bold">WHOGOHOST / GO54 RESELLER WALLET BALANCE</div>
                          <div className="fs-3 fw-bold text-dark font-monospace" style={{ wordBreak: "break-all" }}>
                            {domainOrdersData?.reseller_credits?.formatted ?? `₦${Number(domainOrdersData?.reseller_credits?.balance ?? 0).toLocaleString()}`}
                          </div>
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        {Number(domainOrdersData?.reseller_credits?.balance ?? 0) < 5000 ? (
                          <span className="badge bg-warning text-dark px-3 py-2 fw-bold">
                            <i className="bi bi-exclamation-triangle-fill me-1" /> Low Balance — Top-up needed for new automated registrations
                          </span>
                        ) : (
                          <span className="badge bg-success px-3 py-2 fw-bold">
                            <i className="bi bi-check-circle-fill me-1" /> Sufficient Balance for Auto-Registration
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Domain Orders Table */}
                    <div className="bp-table-wrap border rounded-3 bg-white">
                      <table className="table table-hover align-middle mb-0" style={{ minWidth: 800 }}>
                        <thead className="table-light small">
                          <tr>
                            <th className="ps-3">#</th>
                            <th>School</th>
                            <th>Domain Name</th>
                            <th>Amount</th>
                            <th>Paystack Ref</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th className="pe-3 text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody className="small">
                          {(!domainOrdersData?.orders?.data || domainOrdersData.orders.data.length === 0) ? (
                            <tr>
                              <td colSpan={8} className="text-center py-4 text-muted">
                                {loadingDomainOrders ? "Loading domain orders..." : "No domain orders placed yet."}
                              </td>
                            </tr>
                          ) : (
                            domainOrdersData.orders.data.map((order: any) => (
                              <tr key={order.id}>
                                <td className="ps-3 fw-bold text-muted">{order.id}</td>
                                <td>
                                  <div className="fw-bold text-dark">{order.school_name || `School #${order.school_id}`}</div>
                                  <div className="text-muted small">{order.school_email || "-"}</div>
                                </td>
                                <td>
                                  <span className="fw-bold text-primary font-monospace">{order.domain_name}</span>
                                  <span className="badge bg-light text-dark border ms-1">{order.tld}</span>
                                </td>
                                <td className="fw-bold text-dark">
                                  ₦{Number(order.amount).toLocaleString()}
                                </td>
                                <td>
                                  <code>{order.payment_reference}</code>
                                  {order.paystack_transaction_id && (
                                    <div className="text-muted small" style={{ fontSize: 11 }}>
                                      ID: {order.paystack_transaction_id}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  {order.status === "active" && (
                                    <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1">
                                      <i className="bi bi-check-circle-fill me-1" /> Active & Live
                                    </span>
                                  )}
                                  {order.status === "provisioning_pending" && (
                                    <span className="badge bg-warning bg-opacity-10 text-warning text-dark border border-warning border-opacity-50 px-2 py-1">
                                      <i className="bi bi-clock-history me-1" /> Paid — Pending Registrar
                                    </span>
                                  )}
                                  {order.status === "pending_payment" && (
                                    <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 px-2 py-1">
                                      Pending Payment
                                    </span>
                                  )}
                                  {order.status === "failed" && (
                                    <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2 py-1">
                                      Registration Failed
                                    </span>
                                  )}
                                </td>
                                <td className="text-muted">
                                  {order.paid_at ? new Date(order.paid_at).toLocaleDateString() : (order.created_at ? new Date(order.created_at).toLocaleDateString() : "-")}
                                </td>
                                <td className="pe-3 text-end">
                                  {order.status === "provisioning_pending" || order.status === "failed" ? (
                                    <div className="d-inline-flex gap-1">
                                      <button
                                        type="button"
                                        className="btn btn-warning btn-sm fw-bold d-inline-flex align-items-center gap-1"
                                        onClick={() => handleSuperAdminRetryProvision(order.id)}
                                        disabled={retryingDomainOrderId === order.id}
                                      >
                                        <i className="bi bi-arrow-repeat" />
                                        {retryingDomainOrderId === order.id ? "Retrying..." : "Retry Provision"}
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-outline-success btn-sm fw-bold d-inline-flex align-items-center gap-1"
                                        onClick={() => handleSuperAdminMarkActive(order.id)}
                                        disabled={markingDomainOrderId === order.id}
                                        title="Mark Active if domain was registered manually directly on GO54/Whogohost"
                                      >
                                        <i className="bi bi-check-lg" />
                                        {markingDomainOrderId === order.id ? "Activating..." : "Mark Active"}
                                      </button>
                                    </div>
                                  ) : (
                                    <a
                                      href={`https://${order.domain_name}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="btn btn-outline-primary btn-sm fw-bold"
                                    >
                                      <i className="bi bi-box-arrow-up-right me-1" /> Visit
                                    </a>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>

                {/* 6. Inactivity & Dormant Term Waiver Card */}
                <section className="bp-card" style={{ border: "1.5px solid #cbd5e1" }}>
                  <div className="bp-card-pad">
                    <div className="bp-card-head">
                      <div>
                        <div className="bp-card-title" style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                          <i className="bi bi-clock-history text-primary" />
                          5. School Inactivity Audit & Dormant Term Waiver
                        </div>
                        <div className="bp-muted">
                          Audit past academic terms for schools that onboarded or switched sessions but did not use the platform. If zero scores and zero CBT exams were recorded, waive past term invoices and student blocks so they start fresh on their active session.
                        </div>
                      </div>
                      <span className="bp-pill" style={{ background: "rgba(30, 41, 59, 0.08)", color: "#0f172a" }}>
                        <i className="bi bi-magic me-1" /> Fresh Start Tool
                      </span>
                    </div>

                    <div className="bp-audit-grid">
                      <Field label="Select School to Audit">
                        <select
                          className="bp-select"
                          value={auditSchoolId}
                          onChange={(e) => {
                            setAuditSchoolId(e.target.value);
                            setAuditData(null);
                            setSelectedPeriodKeys([]);
                          }}
                        >
                          <option value="">-- Choose a school to audit usage --</option>
                          {schools.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.school_name || `School #${s.id}`} (ID: {s.id})
                            </option>
                          ))}
                        </select>
                      </Field>
                      <button
                        type="button"
                        className="bp-btn"
                        style={{ height: 42, whiteSpace: "nowrap" }}
                        onClick={handleAuditSchool}
                        disabled={!auditSchoolId || auditLoading}
                      >
                        {auditLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" /> Auditing...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-search me-1" /> Audit School Activity
                          </>
                        )}
                      </button>
                    </div>

                    {auditData && (
                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
                        {/* Summary metrics */}
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                          <div>
                            <strong style={{ fontSize: 15, color: "#0f172a" }}>{auditData.school?.name}</strong>
                            <div style={{ fontSize: 12, color: "#64748b" }}>
                              Current Active Period: <span className="badge bg-primary">{auditData.school?.current_session || "None"} &bull; {auditData.school?.current_term || "None"}</span>
                            </div>
                          </div>
                          <div className="d-flex gap-2 flex-wrap">
                            <span className="badge bg-light text-dark border p-2">
                              Historical Terms: <strong>{auditData.summary.total_terms}</strong>
                            </span>
                            <span className="badge bg-warning text-dark border p-2">
                              Dormant Terms: <strong>{auditData.summary.dormant_terms_count}</strong>
                            </span>
                            <span className="badge bg-danger text-white border p-2">
                              Dormant Debt: <strong>₦{auditData.summary.total_dormant_debt.toLocaleString()}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Audit Table */}
                        <div className="bp-table-wrap" style={{ maxHeight: 320, overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff" }}>
                          <table className="table table-sm table-hover mb-0" style={{ fontSize: 12.5, minWidth: 680 }}>
                            <thead className="table-light" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                              <tr>
                                <th style={{ width: 40, textAlign: "center" }}>
                                  <input
                                    type="checkbox"
                                    checked={
                                      auditData.audit.filter((a) => a.is_waivable).length > 0 &&
                                      selectedPeriodKeys.length === auditData.audit.filter((a) => a.is_waivable).length
                                    }
                                    onChange={toggleSelectAll}
                                  />
                                </th>
                                <th>Session & Term</th>
                                <th>Scores Entered</th>
                                <th>CBT Attempts</th>
                                <th>Invoice & Debt</th>
                                <th>Student Locks</th>
                                <th>Activity Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {auditData.audit.map((item) => (
                                <tr key={item.period_key} style={item.is_current ? { background: "#eff6ff" } : undefined}>
                                  <td style={{ textAlign: "center" }}>
                                    {item.is_waivable ? (
                                      <input
                                        type="checkbox"
                                        checked={selectedPeriodKeys.includes(item.period_key)}
                                        onChange={() => togglePeriodKey(item.period_key)}
                                      />
                                    ) : (
                                      <span className="text-muted">-</span>
                                    )}
                                  </td>
                                  <td>
                                    <strong>{item.session_name}</strong> - {item.term_name}
                                    {item.is_current && <span className="badge bg-primary ms-2" style={{ fontSize: 10 }}>Active Current</span>}
                                  </td>
                                  <td>
                                    {item.results_count > 0 ? (
                                      <span className="badge bg-success-subtle text-success border border-success-subtle">{item.results_count} scores</span>
                                    ) : (
                                      <span className="text-muted">0 scores</span>
                                    )}
                                  </td>
                                  <td>
                                    {item.cbt_attempts > 0 ? (
                                      <span className="badge bg-success-subtle text-success border border-success-subtle">{item.cbt_attempts} attempts</span>
                                    ) : (
                                      <span className="text-muted">0 CBT</span>
                                    )}
                                  </td>
                                  <td>
                                    {item.invoice_no ? (
                                      <div>
                                        <span style={{ fontFamily: "monospace", fontSize: 11 }}>#{item.invoice_no}</span>
                                        <div>
                                          <span className={`badge ${item.invoice_status === "paid" ? "bg-success" : item.invoice_status === "waived" ? "bg-secondary" : "bg-danger"}`} style={{ fontSize: 10 }}>
                                            {item.invoice_status}
                                          </span>
                                          {item.invoice_balance > 0 && <strong className="text-danger ms-1">₦{item.invoice_balance.toLocaleString()}</strong>}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-muted">No Invoice</span>
                                    )}
                                  </td>
                                  <td>
                                    {item.blocked_students > 0 ? (
                                      <span className="badge bg-danger-subtle text-danger border border-danger-subtle">{item.blocked_students} blocked</span>
                                    ) : item.students_count > 0 ? (
                                      <span className="badge bg-success-subtle text-success border border-success-subtle">All {item.students_count} clear</span>
                                    ) : (
                                      <span className="text-muted">0 students</span>
                                    )}
                                  </td>
                                  <td>
                                    {item.is_current ? (
                                      <span className="badge bg-info text-dark">Current Term</span>
                                    ) : item.has_activity ? (
                                      <span className="badge bg-success">Active Used</span>
                                    ) : (
                                      <span className="badge bg-secondary">Dormant / Unused</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Waiver Action Bar */}
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed #cbd5e1" }}>
                          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                                Waiver Audit Note / Reason:
                              </label>
                              <input
                                className="bp-input"
                                style={{ fontSize: 12.5 }}
                                value={waiverReason}
                                onChange={(e) => setWaiverReason(e.target.value)}
                                placeholder="Audit reason for waiving dormant billings..."
                              />
                            </div>
                            <div className="d-flex gap-2 align-items-end">
                              <button
                                type="button"
                                className="btn btn-danger"
                                style={{ fontWeight: 800, padding: "9px 18px", borderRadius: 10, fontSize: 13, whiteSpace: "nowrap" }}
                                onClick={handleWaiveSelected}
                                disabled={selectedPeriodKeys.length === 0 || waiveLoading}
                              >
                                {waiveLoading ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm me-1" /> Waiving...
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-check-circle-fill me-1" />
                                    Waive ({selectedPeriodKeys.length}) Dormant Periods & Reset
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 8 }}>
                            <i className="bi bi-info-circle me-1" />
                            <strong>Non-destructive:</strong> Waiving marks past invoices as <code>waived</code> and clears student billing blocks. All uploaded students, classes, teacher logins, and settings remain 100% intact.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Save Button */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="bp-btn" onClick={savePolicy} disabled={saving} style={{ padding: "12px 24px", fontSize: 14 }}>
                    <i className="bi bi-check2-circle fs-5" />
                    Save Platform Billing Policies
                  </button>
                </div>
              </div>

              {/* Sidebar Controls */}
              <aside style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
                <div className="bp-card bp-card-pad">
                  <div className="bp-card-title" style={{ marginBottom: 12 }}>Platform Policy Summary</div>
                  <div className="bp-row">
                    <span className="bp-muted">Basic Result Fee</span>
                    <strong>₦{Number(policy.basic_tier_price_per_student || 300).toLocaleString()}/student</strong>
                  </div>
                  <div className="bp-row">
                    <span className="bp-muted">Standard CBT & AI Fee</span>
                    <strong>₦{Number(policy.standard_cbt_tier_price_per_student || 500).toLocaleString()}/student</strong>
                  </div>
                  <div className="bp-row">
                    <span className="bp-muted">Bank Processing Charge</span>
                    <strong>₦{Number(policy.default_bank_charge_amount || 200).toLocaleString()}/txn</strong>
                  </div>
                  <div className="bp-row">
                    <span className="bp-muted">Welcome AI Bonus</span>
                    <strong style={{ color: "#059669" }}>{policy.welcome_ai_credits ?? 50} Credits</strong>
                  </div>
                  <div className="bp-row">
                    <span className="bp-muted">Welcome WhatsApp Bonus</span>
                    <strong style={{ color: "#059669" }}>{policy.welcome_whatsapp_credits ?? 15} Msgs</strong>
                  </div>
                  <div className="bp-row">
                    <span className="bp-muted">Sales Partner Term 1</span>
                    <strong>{policy.sales_partner_term_1_commission_rate ?? 30}%</strong>
                  </div>
                  <div className="bp-row">
                    <span className="bp-muted">Active Temporary Grants</span>
                    <span className="bp-pill">{activeAccess}</span>
                  </div>
                  <div className="bp-row">
                    <span className="bp-muted">Suspicious Periods</span>
                    <span className="bp-pill" style={suspiciousPeriods.length ? { background: "#fee2e2", color: "#b91c1c" } : undefined}>
                      {suspiciousPeriods.length}
                    </span>
                  </div>
                </div>

                <div className="bp-card bp-card-pad">
                  <div className="bp-card-title">Grant temporary access</div>
                  <div className="bp-muted" style={{ marginBottom: 12 }}>
                    Temporarily bypass billing restrictions for emergency school operations or support escalation.
                  </div>

                  <Field label="School Search">
                    <input className="bp-input" value={schoolSearch} onChange={(e) => setSchoolSearch(e.target.value)} placeholder="Type school name..." />
                  </Field>
                  <Field label="School">
                    <select className="bp-select" value={grant.school_id} onChange={(e) => setGrant((p) => ({ ...p, school_id: e.target.value }))}>
                      <option value="">Select school</option>
                      {schools.map((s) => <option key={s.id} value={s.id}>{s.school_name || `School #${s.id}`}</option>)}
                    </select>
                  </Field>
                  <Field label="Access scope">
                    <select className="bp-select" value={grant.scope} onChange={(e) => setGrant((p) => ({ ...p, scope: e.target.value }))}>
                      <option value="school_crud">School CRUD only</option>
                      <option value="student_academic">Student academic actions</option>
                      <option value="all">All protected actions</option>
                    </select>
                  </Field>
                  <Field label={`Days (${policy.temporary_access_min_days}-${policy.temporary_access_max_days})`}>
                    <input className="bp-input" type="number" min={policy.temporary_access_min_days} max={policy.temporary_access_max_days} value={grant.days} onChange={(e) => setGrant((p) => ({ ...p, days: Number(e.target.value) }))} />
                  </Field>
                  <Field label="Reason">
                    <textarea className="bp-textarea" value={grant.reason} onChange={(e) => setGrant((p) => ({ ...p, reason: e.target.value }))} placeholder="Example: verified settlement delay, support escalation..." />
                  </Field>
                  <button className="bp-btn mt-3" style={{ width: "100%" }} onClick={grantAccess} disabled={saving}>
                    <i className="bi bi-shield-check" />
                    Grant Access
                  </button>
                </div>
              </aside>
            </div>

            <section className="bp-card mt-3">
              <div className="bp-card-pad">
                <div className="bp-card-head">
                  <div>
                    <div className="bp-card-title">Recent temporary access grants</div>
                    <div className="bp-muted">Active and revoked access records for support audit.</div>
                  </div>
                </div>
                {accessList.length ? accessList.map((a) => (
                  <div className="bp-row" key={a.id}>
                    <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                      <div className="bp-card-title" style={{ fontSize: 14 }}>{a.school?.school_name || `School #${a.school_id}`}</div>
                      <div className="bp-muted" style={{ wordBreak: "break-word" }}>{a.scope.replaceAll("_", " ")} | Ends {fmtDate(a.ends_at)} | {a.reason || "No reason"}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                      <span className="bp-pill" style={a.status === "active" ? undefined : { background: "rgba(148,163,184,.16)", color: "#64748b" }}>{a.status}</span>
                      {a.status === "active" && <button className="bp-btn-outline" onClick={() => revokeAccess(a.id)}>Revoke</button>}
                    </div>
                  </div>
                )) : <div className="bp-muted">No temporary access grants recorded yet.</div>}
              </div>
            </section>

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}

