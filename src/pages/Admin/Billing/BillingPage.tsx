
// src/pages/Subscriptions/BillingPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";

type Plan = {
  id: number | null;
  name: string;
  price?: number | null;
  price_per_student?: number | null;
  active_students?: number | null;
  current_amount?: number | null;
  billing_interval?: string | null;
  duration_in_days?: number | null;
};

type SubscriptionDetails = {
  id: number;
  status: string;
  auto_renew: boolean;
  auto_renew_source: "wallet" | "card" | string;
  starts_at?: string | null;
  ends_at?: string | null;
  plan: Plan;
};

type PaymentRow = {
  id: number;
  reference: string;
  amount: number;
  status: string;
  channel?: string | null;
  card_type?: string | null;
  last4?: string | null;
  starts_at?: string | null;
  created_at?: string | null;
  plan: Plan;
};

type SchoolBillingDashboard = {
  settings?: {
    payment_mode: "online" | "offline";
    grace_days: number;
  };
  package?: {
    id: number | null;
    name: string;
    billing_interval?: string | null;
    duration_in_days?: number | null;
    access_model?: string | null;
  } | null;
  revenue_model?: "online_transaction_fee" | "offline_term_invoice" | string;
  payment_mode?: "online" | "offline" | string;
  price_per_student?: string | number;
  active_student_count?: number;
  billable_student_count?: number;
  student_limit?: number | null;
  current_invoice_amount?: string | number;
  next_billing_estimate_amount?: string | number;
  legacy_subscription?: {
    active: boolean;
    status: string;
    subscription_id?: number;
    plan_name?: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
    cutover_at?: string | null;
    message?: string;
  } | null;
  current_period_online_collected_amount?: string | number;
  current_period_invoice_paid_amount?: string | number;
  current_period_subscription_credit_amount?: string | number;
  current_period_paid_amount?: string | number;
  current_period_balance_amount?: string | number;
  subscription_paid_amount?: string | number;
  outstanding_amount?: string | number;
  period?: {
    session: string;
    term: string;
  } | null;
  summary?: {
    total: number;
    paid: number;
    unpaid: number;
    grace: number;
    waived: number;
    override: number;
  };
  invoice?: {
    id: number;
    invoice_no: string;
    amount_due: string | number;
    amount_paid: string | number;
    balance: string | number;
    status: string;
    due_date?: string | null;
  } | null;
  transition_invoice?: {
    id: number;
    invoice_no: string;
    amount_due: string | number;
    amount_paid: string | number;
    balance: string | number;
    status: string;
    due_date?: string | null;
  } | null;
  online_collection?: {
    current_period_collected_amount?: string | number;
    current_period_collected_count?: number;
    total_collected_amount?: string | number;
    total_collected_count?: number;
    recent?: Array<{
      id: number;
      reference: string;
      platform_fee: string | number;
      created_at?: string | null;
    }>;
  };
  unpaid_students?: Array<{
    id: number;
    firstname?: string;
    surname?: string;
    reg_no?: string;
    class_name?: string;
    status: string;
    grace_until?: string | null;
  }>;
  switch_check?: {
    can_switch: boolean;
    outstanding_invoices: number;
    unpaid_entitlements: number;
    message: string;
    transition_invoice?: SchoolBillingDashboard["transition_invoice"];
  };
};

function fmtNaira(n: number) {
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(n);
  } catch {
    return `₦${Number(n || 0).toLocaleString()}`;
  }
}

function fmtDate(val?: string | null) {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function badgeTone(status: string) {
  const s = (status || "").toLowerCase();
  if (s.includes("success") || s.includes("paid")) return { bg: "rgba(34,197,94,0.14)", fg: "#22c55e", text: status };
  if (s.includes("pending")) return { bg: "rgba(245,158,11,0.16)", fg: "#fbbf24", text: status };
  if (s.includes("fail") || s.includes("error")) return { bg: "rgba(239,68,68,0.14)", fg: "#ef4444", text: status };
  if (s.includes("cancel")) return { bg: "rgba(148,163,184,0.14)", fg: "#94a3b8", text: status };
  return { bg: "rgba(0,0,0,0.04)", fg: "#7a6a5a", text: status || "Unknown" };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function revenueModelLabel(model?: string | null) {
  if (model === "online_transaction_fee") return "Online transaction fee";
  if (model === "offline_term_invoice") return "Offline term invoice";
  return "Not configured";
}

function revenueModelHelp(model?: string | null) {
  if (model === "online_transaction_fee") {
    return "Core access is supported by GradeQuest charges collected automatically from parent fee payments.";
  }

  if (model === "offline_term_invoice") {
    return "GradeQuest bills the school directly based on active students for the current term.";
  }

  return "Set up online payments or offline billing to activate the GradeQuest revenue model.";
}

export default function BillingPage() {
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [schoolBilling, setSchoolBilling] = useState<SchoolBillingDashboard | null>(null);
  const [q, setQ] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return payments;
    return payments.filter((p) => {
      return (
        (p.reference || "").toLowerCase().includes(s) ||
        (p.plan?.name || "").toLowerCase().includes(s) ||
        (p.status || "").toLowerCase().includes(s) ||
        (p.channel || "").toLowerCase().includes(s)
      );
    });
  }, [payments, q]);

  // reset to page 1 on search/pageSize
  useEffect(() => {
    setPage(1);
  }, [q, pageSize]);

  const totalItems = filtered.length;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalItems / pageSize)), [totalItems, pageSize]);
  const safePage = useMemo(() => clamp(page, 1, totalPages), [page, totalPages]);

  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const pageNumbers = useMemo(() => {
    const windowSize = 2;
    const start = Math.max(1, safePage - windowSize);
    const end = Math.min(totalPages, safePage + windowSize);
    const nums: number[] = [];
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  }, [safePage, totalPages]);

  const showingFrom = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const showingTo = Math.min(safePage * pageSize, totalItems);

  const loadBillingData = async (showToast = false) => {
    setLoading(true);
    try {
      const [subscriptionRes, schoolBillingRes] = await Promise.all([
        authApi.get("/subscription/billing"),
        authApi.get("/school/billing/dashboard"),
      ]);
      setSubscription(subscriptionRes.data.subscription || null);
      setPayments(subscriptionRes.data.payments || []);
      setSchoolBilling(schoolBillingRes.data || null);
      if (showToast) showSuccess?.("Billing refreshed.");
    } catch (err: any) {
      console.error(err);
      showError?.(err?.response?.data?.message || "Failed to load billing records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subStatus = subscription?.status ? subscription.status : "No subscription";
  const isActive = (subscription?.status || "").toLowerCase() === "active";
  const statusPill = useMemo(() => {
    if (!subscription) return { bg: "rgba(245,158,11,0.16)", fg: "#fbbf24", text: "NO SUBSCRIPTION" };
    return isActive
      ? { bg: "rgba(34,197,94,0.16)", fg: "#22c55e", text: "ACTIVE" }
      : { bg: "rgba(245,158,11,0.16)", fg: "#fbbf24", text: "INACTIVE" };
  }, [subscription, isActive]);

  const planName = subscription?.plan?.name || "—";
  const endsAt = fmtDate(subscription?.ends_at);
  const renewSource = subscription?.auto_renew_source || "—";
  const autoRenew = subscription ? (subscription.auto_renew ? "Enabled" : "Disabled") : "—";

  const quickTotals = useMemo(() => {
    const totalPaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const successCount = payments.filter((p) => (p.status || "").toLowerCase().includes("success")).length;
    const lastPayment = payments.length ? payments[0] : null; // assuming newest first (if backend sorts)
    return {
      totalPaid,
      successCount,
      lastPaymentDate: fmtDate(lastPayment?.created_at || lastPayment?.starts_at),
    };
  }, [payments]);

  const schoolInvoice = schoolBilling?.invoice || null;
  const transitionInvoice = schoolBilling?.transition_invoice || schoolBilling?.switch_check?.transition_invoice || null;
  const isOnlineRevenue = schoolBilling?.revenue_model === "online_transaction_fee";
  const legacySubscription = schoolBilling?.legacy_subscription;
  const isLegacyProtected = !!legacySubscription?.active;
  const invoiceDue = Number(schoolInvoice?.amount_due ?? schoolBilling?.current_invoice_amount ?? 0);
  const invoicePaid = isOnlineRevenue
    ? Number(schoolBilling?.current_period_paid_amount ?? Math.max(0, invoiceDue - Number(schoolBilling?.outstanding_amount ?? 0)))
    : Number(schoolInvoice?.amount_paid ?? Math.min(invoiceDue, Number(schoolBilling?.subscription_paid_amount ?? 0)));
  const invoiceBalance = isOnlineRevenue
    ? Number(schoolBilling?.current_period_balance_amount ?? Math.max(0, invoiceDue - invoicePaid))
    : Number(schoolInvoice?.balance ?? schoolBilling?.outstanding_amount ?? Math.max(0, invoiceDue - invoicePaid));
  const invoiceProgress = invoiceDue <= 0 ? 0 : Math.min(100, Math.round((invoicePaid / invoiceDue) * 100));
  const unpaidStudents = schoolBilling?.unpaid_students || [];
  const coveredStudents = Number(schoolBilling?.summary?.paid || 0);
  const uncoveredStudents = Number((schoolBilling?.summary?.unpaid || 0) + (schoolBilling?.summary?.grace || 0));
  const onlineCollection = schoolBilling?.online_collection;
  const currentCollected = Number(schoolBilling?.current_period_online_collected_amount ?? onlineCollection?.current_period_collected_amount ?? 0);
  const currentInvoiceRecovered = Number(schoolBilling?.current_period_invoice_paid_amount || 0);
  const subscriptionCredit = Number(schoolBilling?.current_period_subscription_credit_amount ?? schoolBilling?.subscription_paid_amount ?? 0);
  const currentCollectedCount = Number(onlineCollection?.current_period_collected_count || 0);

  const refresh = async () => {
    await loadBillingData(true);
  };

  const generateOfflineInvoice = async () => {
    setLoading(true);
    try {
      await authApi.post("/school/billing/offline-invoice/generate", {});
      await loadBillingData(false);
      showSuccess?.("GradeQuest invoice generated.");
    } catch (err: any) {
      console.error(err);
      showError?.(err?.response?.data?.message || "Unable to generate GradeQuest invoice.");
    } finally {
      setLoading(false);
    }
  };

  const switchRevenueModel = async (paymentMode: "online" | "offline") => {
    setLoading(true);
    try {
      await authApi.put("/school/billing/settings", { payment_mode: paymentMode });
      await loadBillingData(false);
      showSuccess?.(
        paymentMode === "online"
          ? "Online transaction fee model enabled."
          : "Offline term invoice model enabled."
      );
    } catch (err: any) {
      console.error(err);
      let refreshedTransitionInvoice: SchoolBillingDashboard["transition_invoice"] | null = null;
      try {
        const refreshed = await authApi.get("/school/billing/dashboard");
        setSchoolBilling(refreshed.data || null);
        refreshedTransitionInvoice = refreshed.data?.transition_invoice || refreshed.data?.switch_check?.transition_invoice || null;
      } catch {
        await loadBillingData(false);
      }
      showError?.(
        err?.response?.data?.message ||
          (paymentMode === "online"
            ? "Unable to switch to online model. Make sure online bank payment is enabled and outstanding GradeQuest revenue is settled."
            : "Unable to switch to offline model.")
      );

      if (paymentMode === "offline" && refreshedTransitionInvoice?.id && Number(refreshedTransitionInvoice.balance || 0) > 0) {
        navigate(`/billing/invoice-payment/${refreshedTransitionInvoice.id}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        /* ===== AdminDashboard template styles (aligned with your upgraded pages) ===== */
        .db-main {
          background: var(--bs-body-bg, #f5f1eb);
          min-height: 100vh;
          font-family: "DM Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          padding: 28px 28px 0;
        }

        .db-hero {
          background: #0f172a;
          border-radius: var(--bs-border-radius-lg, 16px);
          padding: 32px 36px;
          position: relative;
          overflow: hidden;
          margin: 10px 0 18px;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .db-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
        }
        .db-hero-glow {
          position: absolute;
          top: -60px;
          right: -60px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(201, 168, 76, 0.10) 0%, transparent 65%);
          pointer-events: none;
        }
        .db-hero-glow2 {
          position: absolute;
          bottom: -40px;
          left: 25%;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .db-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 32px;
          flex-wrap: wrap;
        }
        @media (min-width: 768px) { .db-hero-inner { flex-wrap: nowrap; } }

        .db-session-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #e8c97a;
          background: rgba(201, 168, 76, 0.10);
          border: 1px solid rgba(201, 168, 76, 0.22);
          border-radius: 100px;
          padding: 4px 12px;
          margin-bottom: 14px;
        }
        .db-session-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          animation: dbPulse 2s ease infinite;
        }
        @keyframes dbPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.5); }
        }

        .db-greeting {
          font-family: "Lora", Georgia, serif;
          font-size: clamp(22px, 2.5vw, 32px);
          font-weight: 700;
          color: #fff;
          line-height: 1.1;
          margin-bottom: 8px;
        }
        .db-greeting em { font-style: italic; color: #e8c97a; }

        .db-hero-sub {
          font-size: 13.5px;
          font-weight: 300;
          color: #64748b;
          line-height: 1.65;
          max-width: 560px;
          margin-bottom: 18px;
        }

        .db-hero-btns { display: flex; gap: 10px; flex-wrap: wrap; }

        .db-btn-gold {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 20px;
          font-family: "DM Sans", sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: #0f172a;
          background: #c9a84c;
          border: none;
          border-radius: var(--bs-border-radius, 8px);
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
          white-space: nowrap;
        }
        .db-btn-gold:hover { background: #e8c97a; transform: translateY(-1px); }
        .db-btn-gold:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        .db-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 20px;
          font-family: "DM Sans", sans-serif;
          font-size: 13px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.7);
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: var(--bs-border-radius, 8px);
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
          white-space: nowrap;
        }
        .db-btn-outline:hover { background: rgba(255, 255, 255, 0.06); color: #fff; border-color: rgba(255, 255, 255, 0.28); }
        .db-btn-outline:disabled { opacity: 0.55; cursor: not-allowed; }

        .db-hero-stat-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.09);
          backdrop-filter: blur(8px);
          border-radius: var(--bs-border-radius, 12px);
          padding: 20px 24px;
          min-width: 270px;
          margin-left: auto;
          align-self: flex-end;
        }
        .db-hero-stat-row { display: flex; flex-direction: column; gap: 10px; }
        .db-hero-stat-item { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .db-hero-stat-label { font-size: 12px; font-weight: 300; color: #64748b; }
        .db-hero-stat-val { font-family: "Lora", serif; font-size: 18px; font-weight: 700; color: #fff; }
        .db-hero-stat-sep { height: 1px; background: rgba(255, 255, 255, 0.06); }

        .db-panel {
          background: var(--bs-body-bg, #fff);
          border: 1px solid var(--bs-border-color, #ede8e0);
          border-radius: var(--bs-border-radius-lg, 14px);
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(15,23,42,0.04);
          margin-bottom: 18px;
        }

        .db-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 18px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          gap: 12px;
          flex-wrap: wrap;
        }

        .db-panel-title {
          font-family: "Lora", serif;
          font-size: 16px;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0;
        }

        .db-panel-sub {
          font-size: 11.5px;
          font-weight: 300;
          color: #9a8a7a;
          margin: 0;
        }

        .db-refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 400;
          color: #7a6a5a;
          background: #f5f1eb;
          border: 1px solid #e5ddd3;
          border-radius: var(--bs-border-radius, 7px);
          cursor: pointer;
          transition: background 0.2s;
          white-space: nowrap;
        }
        .db-refresh-btn:hover { background: #ede8e0; }
        .db-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .db-pill {
          display: inline-flex;
          align-items: center;
          font-size: 12px;
          font-weight: 800;
          padding: 6px 10px;
          border-radius: 999px;
          white-space: nowrap;
          border: 1px solid rgba(0,0,0,0.06);
        }

        .db-muted { color: #9a8a7a; }
        .db-strong { font-weight: 900; color: #1a1a2e; }

        .db-table { width: 100%; border-collapse: collapse; }
        .db-table th {
          padding: 10px 16px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #9a8a7a;
          background: #faf8f5;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          text-align: left;
          white-space: nowrap;
        }
        .db-table td {
          padding: 13px 16px;
          font-size: 13.5px;
          color: #4a4a5a;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          vertical-align: middle;
        }
        .db-table tbody tr:last-child td { border-bottom: none; }
        .db-table tbody tr:hover { background: #faf8f5; }

        .db-search {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          border: 1px solid #e5ddd3;
          border-radius: 12px;
          padding: 10px 12px;
          min-width: 260px;
        }
        .db-search input { border: none; outline: none; width: 100%; font-size: 13px; }

        @media (max-width: 991.98px) { .db-main { padding: 18px 14px 0; } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Billing" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loading && <Loader message="Loading billing..." />}

            {/* ===== HERO ===== */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Subscriptions — Billing
                  </div>

                  <h1 className="db-greeting">
                    Billing <em>&</em> Payments
                  </h1>

                  <p className="db-hero-sub">
                    Track your subscription status, renew when needed, and review payment history for receipts and audit.
                  </p>

                  <div className="db-hero-btns">
                    <button className="db-btn-gold" onClick={() => navigate("/checkout")} disabled={loading}>
                      <i className="bi bi-arrow-repeat" />
                      Renew / Upgrade
                    </button>

                    <button className="db-btn-outline" onClick={() => navigate("/checkout")} disabled={loading}>
                      <i className="bi bi-arrow-left" />
                      Back
                    </button>

                    <button className="db-btn-outline" onClick={refresh} disabled={loading}>
                      <i className="bi bi-arrow-clockwise" />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Right stat card */}
                <div className="db-hero-stat-card d-none d-md-block">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c9a84c" }}>
                      Quick glance
                    </span>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M2 10V6M5 10V4M8 10V7M11 10V3" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div className="db-hero-stat-row">
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Plan</span>
                      <span className="db-hero-stat-val" style={{ fontSize: 14, fontFamily: "DM Sans" }}>
                        {planName}
                      </span>
                    </div>

                    <div className="db-hero-stat-sep" />

                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Status</span>
                      <span className="db-pill" style={{ background: statusPill.bg, color: statusPill.fg }}>
                        {statusPill.text}
                      </span>
                    </div>

                    <div className="db-hero-stat-sep" />

                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Ends</span>
                      <span className="db-hero-stat-val" style={{ fontSize: 14, fontFamily: "DM Sans" }}>
                        {endsAt}
                      </span>
                    </div>

                    <div className="db-hero-stat-sep" />

                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Total Paid</span>
                      <span className="db-hero-stat-val">{fmtNaira(quickTotals.totalPaid)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== SUBSCRIPTION SUMMARY ===== */}
            <div className="db-panel">
              <div className="db-panel-head">
                <div>
                  <p className="db-panel-title">Subscription summary</p>
                  <p className="db-panel-sub">Core subscription details and renewal settings.</p>
                </div>

                <span className="db-pill" style={{ background: statusPill.bg, color: statusPill.fg }}>
                  {subStatus}
                </span>
              </div>

              <div style={{ padding: 16 }}>
                <div className="row g-3">
                  {[
                    { k: "Plan", v: planName, icon: "box-seam" },
                    { k: "Price / Student", v: fmtNaira(Number(subscription?.plan?.price_per_student ?? subscription?.plan?.price ?? 0)), icon: "cash-coin" },
                    { k: "Active Students", v: Number(subscription?.plan?.active_students ?? 0).toLocaleString(), icon: "people" },
                    { k: "Current Amount", v: fmtNaira(Number(subscription?.plan?.current_amount ?? 0)), icon: "receipt" },
                    { k: "Auto Renew", v: autoRenew, icon: "arrow-repeat" },
                    { k: "Renewal Source", v: renewSource, icon: "wallet2" },
                    { k: "End Date", v: endsAt, icon: "calendar-event" },
                  ].map((c) => (
                    <div className="col-12 col-md-6 col-lg-3" key={c.k}>
                      <div
                        style={{
                          background: "#faf8f5",
                          border: "1px solid rgba(0,0,0,0.06)",
                          borderRadius: 14,
                          padding: 14,
                          height: "100%",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div className="db-muted" style={{ fontSize: 12 }}>
                            {c.k}
                          </div>
                          <i className={`bi bi-${c.icon}`} style={{ color: "#c8bfb5" }} />
                        </div>
                        <div className="db-strong" style={{ fontFamily: "Lora, serif", fontSize: 18, marginTop: 6 }}>
                          {c.v}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="db-refresh-btn" onClick={() => navigate("/checkout")} disabled={loading}>
                    <i className="bi bi-credit-card" />
                    Go to Checkout
                  </button>

                  <button className="db-refresh-btn" onClick={() => navigate("/subscriptions/checkout")} disabled={loading}>
                    <i className="bi bi-arrow-repeat" />
                    Renew
                  </button>
                </div>
              </div>
            </div>

            {/* ===== GRADEQUEST INVOICE ===== */}
            <div className="db-panel">
              <div className="db-panel-head">
                <div>
                  <p className="db-panel-title">GradeQuest per-student invoice</p>
                  <p className="db-panel-sub">
                    Current term invoice is calculated from active students and package price per student.
                  </p>
                </div>

                <span className="db-pill" style={{ background: "rgba(15,23,42,0.08)", color: "#0f172a" }}>
                  Enforcement managed by GradeQuest
                </span>
              </div>

              <div style={{ padding: 16 }}>
                <div
                  style={{
                    marginBottom: 16,
                    background: schoolBilling?.revenue_model === "online_transaction_fee" ? "#ecfdf5" : "#fffbeb",
                    border: `1px solid ${schoolBilling?.revenue_model === "online_transaction_fee" ? "#bbf7d0" : "#fde68a"}`,
                    borderRadius: 16,
                    padding: "16px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 14,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        display: "grid",
                        placeItems: "center",
                        background: schoolBilling?.revenue_model === "online_transaction_fee" ? "#16a34a" : "#d97706",
                        color: "#fff",
                        flex: "0 0 auto",
                      }}
                    >
                      <i className={`bi bi-${schoolBilling?.revenue_model === "online_transaction_fee" ? "cash-coin" : "receipt"}`} />
                    </div>
                    <div>
                      <div className="db-muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0, fontWeight: 800 }}>
                        GradeQuest revenue model
                      </div>
                      <div className="db-strong" style={{ fontSize: 20, marginTop: 2 }}>
                        {revenueModelLabel(schoolBilling?.revenue_model)}
                      </div>
                      <div className="db-muted" style={{ fontSize: 13, marginTop: 4, maxWidth: 720 }}>
                        {revenueModelHelp(schoolBilling?.revenue_model)}
                      </div>
                    </div>
                  </div>

                  <span
                    className="db-pill"
                    style={{
                      background: "#fff",
                      color: schoolBilling?.revenue_model === "online_transaction_fee" ? "#15803d" : "#92400e",
                      border: `1px solid ${schoolBilling?.revenue_model === "online_transaction_fee" ? "#bbf7d0" : "#fde68a"}`,
                    }}
                  >
                    {(schoolBilling?.settings?.payment_mode || "offline").toUpperCase()} MODE
                  </span>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {schoolBilling?.settings?.payment_mode !== "online" ? (
                      <button
                        className="db-refresh-btn"
                        type="button"
                        onClick={() => switchRevenueModel("online")}
                        disabled={loading}
                      >
                        <i className="bi bi-lightning-charge" />
                        Switch to Online Model
                      </button>
                    ) : (
                      <button
                        className="db-refresh-btn"
                        type="button"
                        onClick={() => switchRevenueModel("offline")}
                        disabled={loading}
                      >
                        <i className="bi bi-receipt" />
                        Switch to Offline Model
                      </button>
                    )}

                    <button
                      className="db-refresh-btn"
                      type="button"
                      onClick={() => navigate("/school/bank-account-setting")}
                      disabled={loading}
                    >
                      <i className="bi bi-bank" />
                      Bank Settings
                    </button>
                  </div>
                </div>

                <div className="row g-3">
                  {[
                    { k: "Payment Mode", v: schoolBilling?.settings?.payment_mode || "offline", icon: "toggle2-on" },
                    { k: "Revenue Model", v: revenueModelLabel(schoolBilling?.revenue_model), icon: "diagram-3" },
                    { k: "Current Period", v: schoolBilling?.period ? `${schoolBilling.period.term} - ${schoolBilling.period.session}` : "Not set", icon: "calendar-range" },
                    { k: "Package", v: schoolBilling?.package?.name || "No active package", icon: "boxes" },
                    { k: "Price / Student", v: fmtNaira(Number(schoolBilling?.price_per_student || 0)), icon: "person-badge" },
                    { k: "Active Students", v: Number(schoolBilling?.active_student_count || 0).toLocaleString(), icon: "people" },
                    { k: "Student Limit", v: schoolBilling?.student_limit === 0 ? "Unlimited" : String(schoolBilling?.student_limit ?? "Not set"), icon: "speedometer2" },
                    { k: isOnlineRevenue ? "Expected GQ Fee" : "Invoice Amount", v: fmtNaira(Number(schoolBilling?.current_invoice_amount || 0)), icon: isOnlineRevenue ? "cash-coin" : "receipt-cutoff" },
                    { k: isOnlineRevenue ? "Uncovered Students" : "Unpaid Students", v: uncoveredStudents.toLocaleString(), icon: "exclamation-circle" },
                  ].map((c) => (
                    <div className="col-12 col-md-6 col-lg-3" key={c.k}>
                      <div
                        style={{
                          background: "#faf8f5",
                          border: "1px solid rgba(0,0,0,0.06)",
                          borderRadius: 14,
                          padding: 14,
                          height: "100%",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div className="db-muted" style={{ fontSize: 12 }}>
                            {c.k}
                          </div>
                          <i className={`bi bi-${c.icon}`} style={{ color: "#c8bfb5" }} />
                        </div>
                        <div className="db-strong" style={{ fontFamily: "Lora, serif", fontSize: 18, marginTop: 6 }}>
                          {c.v}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: 14,
                    background: schoolBilling?.revenue_model === "online_transaction_fee" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.12)",
                    border: `1px solid ${schoolBilling?.revenue_model === "online_transaction_fee" ? "rgba(34,197,94,0.22)" : "rgba(245,158,11,0.24)"}`,
                    borderRadius: 14,
                    padding: 14,
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <i
                    className={`bi bi-${schoolBilling?.revenue_model === "online_transaction_fee" ? "check-circle" : "receipt"}`}
                    style={{ color: schoolBilling?.revenue_model === "online_transaction_fee" ? "#16a34a" : "#b7791f", fontSize: 20 }}
                  />
                  <div>
                    <div className="db-strong" style={{ fontSize: 15 }}>
                      {revenueModelLabel(schoolBilling?.revenue_model)}
                    </div>
                    <div className="db-muted" style={{ fontSize: 13, marginTop: 3 }}>
                      {revenueModelHelp(schoolBilling?.revenue_model)}
                    </div>
                  </div>
                </div>

                <div className="row g-3 mt-1">
                  <div className="col-12 col-xl-5">
                    <div
                      style={{
                        background: "#fff",
                        border: "1px solid rgba(0,0,0,0.06)",
                        borderRadius: 14,
                        padding: 16,
                        height: "100%",
                      }}
                    >
                      {isLegacyProtected ? (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                            <div>
                              <div className="db-muted" style={{ fontSize: 12 }}>Legacy subscription</div>
                              <div className="db-strong" style={{ fontSize: 18 }}>
                                Active until {fmtDate(legacySubscription?.ends_at)}
                              </div>
                              <div className="db-muted" style={{ fontSize: 12, marginTop: 4 }}>
                                Existing subscription is honored. Per-student billing starts from the next renewal.
                              </div>
                            </div>

                            <span className="db-pill" style={{ background: "rgba(34,197,94,0.14)", color: "#16a34a" }}>
                              Protected
                            </span>
                          </div>

                          <div
                            style={{
                              marginTop: 18,
                              padding: 14,
                              borderRadius: 12,
                              background: "#faf8f5",
                              border: "1px solid rgba(0,0,0,0.06)",
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                              gap: 12,
                            }}
                          >
                            <div>
                              <div className="db-muted" style={{ fontSize: 11 }}>Current Debt</div>
                              <div className="db-strong" style={{ fontSize: 18, color: "#15803d" }}>{fmtNaira(0)}</div>
                            </div>
                            <div>
                              <div className="db-muted" style={{ fontSize: 11 }}>Next Billing Estimate</div>
                              <div className="db-strong" style={{ fontSize: 18 }}>
                                {fmtNaira(Number(schoolBilling?.next_billing_estimate_amount ?? schoolBilling?.current_invoice_amount ?? 0))}
                              </div>
                            </div>
                            <div>
                              <div className="db-muted" style={{ fontSize: 11 }}>Active Students</div>
                              <div className="db-strong" style={{ fontSize: 18 }}>{Number(schoolBilling?.active_student_count || 0).toLocaleString()}</div>
                            </div>
                          </div>

                          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button className="db-refresh-btn" onClick={() => navigate("/checkout")} disabled={loading}>
                              <i className="bi bi-arrow-repeat" />
                              Renew / Upgrade
                            </button>
                          </div>
                        </>
                      ) : isOnlineRevenue ? (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                            <div>
                              <div className="db-muted" style={{ fontSize: 12 }}>Current term invoice</div>
                              <div className="db-strong" style={{ fontSize: 18 }}>
                                {schoolBilling?.period ? `${schoolBilling.period.term} - ${schoolBilling.period.session}` : "Current billing period"}
                              </div>
                              <div className="db-muted" style={{ fontSize: 12, marginTop: 4 }}>
                                One simple view of what is expected, what has been recovered, and what remains.
                              </div>
                            </div>

                            <span
                              className="db-pill"
                              style={{
                                background: invoiceBalance <= 0 ? "rgba(34,197,94,0.14)" : "rgba(245,158,11,0.16)",
                                color: invoiceBalance <= 0 ? "#16a34a" : "#b45309",
                              }}
                            >
                              {invoiceBalance <= 0 ? "Paid" : "Balance due"}
                            </span>
                          </div>

                          <div
                            style={{
                              marginTop: 18,
                              padding: 14,
                              borderRadius: 12,
                              background: "#faf8f5",
                              border: "1px solid rgba(0,0,0,0.06)",
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                              gap: 12,
                            }}
                          >
                            <div>
                              <div className="db-muted" style={{ fontSize: 11 }}>Amount Expected</div>
                              <div className="db-strong" style={{ fontSize: 18 }}>{fmtNaira(invoiceDue)}</div>
                            </div>
                            <div>
                              <div className="db-muted" style={{ fontSize: 11 }}>Amount Recovered</div>
                              <div className="db-strong" style={{ fontSize: 18 }}>{fmtNaira(invoicePaid)}</div>
                            </div>
                            <div>
                              <div className="db-muted" style={{ fontSize: 11 }}>Balance</div>
                              <div className="db-strong" style={{ fontSize: 18, color: invoiceBalance <= 0 ? "#15803d" : "#b91c1c" }}>
                                {fmtNaira(invoiceBalance)}
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              marginTop: 12,
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                padding: 12,
                                borderRadius: 12,
                                background: "rgba(34,197,94,0.08)",
                                border: "1px solid rgba(34,197,94,0.16)",
                              }}
                            >
                              <div className="db-muted" style={{ fontSize: 11 }}>From parent payments</div>
                              <div className="db-strong">{fmtNaira(currentCollected)}</div>
                              <div className="db-muted" style={{ fontSize: 11 }}>
                                {currentCollectedCount.toLocaleString()} record(s) this term
                              </div>
                            </div>
                            <div
                              style={{
                                padding: 12,
                                borderRadius: 12,
                                background: currentInvoiceRecovered > 0 ? "rgba(245,158,11,0.1)" : "#faf8f5",
                                border: currentInvoiceRecovered > 0 ? "1px solid rgba(245,158,11,0.24)" : "1px solid rgba(0,0,0,0.06)",
                              }}
                            >
                              <div className="db-muted" style={{ fontSize: 11 }}>From invoice payment</div>
                              <div className="db-strong">{fmtNaira(currentInvoiceRecovered)}</div>
                              <div className="db-muted" style={{ fontSize: 11 }}>
                                School-paid or transition invoice
                              </div>
                            </div>
                          </div>

                          <div style={{ marginTop: 14 }}>
                            <div style={{ height: 10, background: "#ede8e0", borderRadius: 999, overflow: "hidden" }}>
                              <div
                                style={{
                                  height: "100%",
                                  width: `${invoiceProgress}%`,
                                  background: invoiceBalance <= 0 ? "#16a34a" : "#c9a84c",
                                }}
                              />
                            </div>
                            <div className="db-muted" style={{ fontSize: 12, marginTop: 8 }}>
                              {coveredStudents.toLocaleString()} of {Number(schoolBilling?.summary?.total || 0).toLocaleString()} student(s) covered.
                            </div>
                          </div>

                          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button className="db-refresh-btn" onClick={() => navigate("/pay-school-fee")} disabled={loading}>
                              <i className="bi bi-link-45deg" />
                              Open Payment Link
                            </button>
                            <button className="db-refresh-btn" onClick={() => navigate("/school/bank-account-setting")} disabled={loading}>
                              <i className="bi bi-bank" />
                              Bank Settings
                            </button>
                          </div>

                          {transitionInvoice && Number(transitionInvoice.balance || 0) > 0 && (
                            <div
                              style={{
                                marginTop: 14,
                                border: "1px solid rgba(245,158,11,0.24)",
                                background: "rgba(245,158,11,0.1)",
                                borderRadius: 12,
                                padding: 12,
                              }}
                            >
                              <div className="db-strong" style={{ fontSize: 14 }}>Offline switch invoice pending</div>
                              <div className="db-muted" style={{ fontSize: 12, marginTop: 4 }}>
                                To switch from online to offline, settle invoice {transitionInvoice.invoice_no}.
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 10 }}>
                                <div><div className="db-muted" style={{ fontSize: 11 }}>Due</div><div className="db-strong">{fmtNaira(Number(transitionInvoice.amount_due || 0))}</div></div>
                                <div><div className="db-muted" style={{ fontSize: 11 }}>Paid</div><div className="db-strong">{fmtNaira(Number(transitionInvoice.amount_paid || 0))}</div></div>
                                <div><div className="db-muted" style={{ fontSize: 11 }}>Balance</div><div className="db-strong">{fmtNaira(Number(transitionInvoice.balance || 0))}</div></div>
                              </div>
                              <button className="db-refresh-btn mt-2" onClick={() => navigate(`/billing/invoice-payment/${transitionInvoice.id}`)} disabled={loading}>
                                <i className="bi bi-credit-card" />
                                Pay Transition Invoice
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                            <div>
                              <div className="db-muted" style={{ fontSize: 12 }}>
                                {schoolInvoice?.id ? "Invoice" : "Estimated invoice"}
                              </div>
                              <div className="db-strong" style={{ fontSize: 18 }}>
                                {schoolInvoice?.invoice_no || "Not created yet"}
                              </div>
                              <div className="db-muted" style={{ fontSize: 12, marginTop: 4 }}>
                                {schoolInvoice?.id
                                  ? `Status: ${schoolInvoice.status || "none"} | Due: ${fmtDate(schoolInvoice.due_date)}`
                                  : "Create the invoice before collecting the remaining balance."}
                              </div>
                            </div>

                            {invoiceBalance > 0 && schoolInvoice?.id ? (
                              <button className="db-refresh-btn" onClick={() => navigate(`/billing/invoice-payment/${schoolInvoice.id}`)} disabled={loading}>
                                <i className="bi bi-credit-card" />
                                Make Payment
                              </button>
                            ) : invoiceBalance > 0 ? (
                              <button className="db-refresh-btn" onClick={generateOfflineInvoice} disabled={loading}>
                                <i className="bi bi-receipt" />
                                Generate Invoice
                              </button>
                            ) : (
                              <span className="db-pill" style={{ background: "rgba(34,197,94,0.14)", color: "#16a34a" }}>
                                Paid
                              </span>
                            )}
                          </div>

                          <div className="progress mt-3" style={{ height: 8, borderRadius: 999 }}>
                            <div className="progress-bar" style={{ width: `${invoiceProgress}%`, background: invoiceProgress >= 100 ? "#16a34a" : "#c9a84c" }} />
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 14 }}>
                            <div>
                              <div className="db-muted" style={{ fontSize: 11 }}>Expected</div>
                              <div className="db-strong">{fmtNaira(invoiceDue)}</div>
                            </div>
                            <div>
                              <div className="db-muted" style={{ fontSize: 11 }}>Applied Credit</div>
                              <div className="db-strong">{fmtNaira(invoicePaid)}</div>
                            </div>
                            <div>
                              <div className="db-muted" style={{ fontSize: 11 }}>Balance</div>
                              <div className="db-strong">{fmtNaira(invoiceBalance)}</div>
                            </div>
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                              gap: 10,
                              marginTop: 12,
                            }}
                          >
                            <div
                              style={{
                                padding: 12,
                                borderRadius: 12,
                                background: subscriptionCredit > 0 ? "rgba(34,197,94,0.08)" : "#faf8f5",
                                border: subscriptionCredit > 0 ? "1px solid rgba(34,197,94,0.16)" : "1px solid rgba(0,0,0,0.06)",
                              }}
                            >
                              <div className="db-muted" style={{ fontSize: 11 }}>Previous subscription credit</div>
                              <div className="db-strong">{fmtNaira(subscriptionCredit)}</div>
                            </div>
                            <div
                              style={{
                                padding: 12,
                                borderRadius: 12,
                                background: currentInvoiceRecovered > 0 ? "rgba(245,158,11,0.1)" : "#faf8f5",
                                border: currentInvoiceRecovered > 0 ? "1px solid rgba(245,158,11,0.24)" : "1px solid rgba(0,0,0,0.06)",
                              }}
                            >
                              <div className="db-muted" style={{ fontSize: 11 }}>Invoice payment received</div>
                              <div className="db-strong">{fmtNaira(currentInvoiceRecovered)}</div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="col-12 col-xl-7">
                    <div
                      style={{
                        background: "#fff",
                        border: "1px solid rgba(0,0,0,0.06)",
                        borderRadius: 14,
                        padding: 16,
                        height: "100%",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                        <div>
                          <div className="db-strong">Students at risk</div>
                          <div className="db-muted" style={{ fontSize: 12 }}>
                            Teachers will be protected from entering resources when GradeQuest revenue is not covered.
                          </div>
                        </div>
                        <span className="db-pill" style={{ background: "rgba(245,158,11,0.14)", color: "#b45309" }}>
                          {unpaidStudents.length} shown
                        </span>
                      </div>

                      {unpaidStudents.length === 0 ? (
                        <div className="db-muted" style={{ padding: "18px 0" }}>No unpaid students found for the current term.</div>
                      ) : (
                        <div style={{ display: "grid", gap: 8 }}>
                          {unpaidStudents.slice(0, 8).map((student) => (
                            <div
                              key={student.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 10,
                                flexWrap: "wrap",
                                borderTop: "1px solid rgba(0,0,0,0.06)",
                                paddingTop: 8,
                              }}
                            >
                              <div>
                                <div className="db-strong" style={{ fontSize: 13 }}>
                                  {student.surname} {student.firstname}
                                </div>
                                <div className="db-muted" style={{ fontSize: 12 }}>
                                  {student.reg_no || "No reg no"} | {student.class_name || "No class"}
                                </div>
                              </div>
                              <span className="db-pill" style={{ background: "rgba(245,158,11,0.14)", color: "#b45309" }}>
                                {student.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== FILTERS / SEARCH ===== */}
            <div className="db-panel">
              <div className="db-panel-head">
                <div>
                  <p className="db-panel-title">Payment history</p>
                  <p className="db-panel-sub">Search records, adjust page size, and review transaction details.</p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div className="db-search">
                    <i className="bi bi-search" style={{ color: "#9a8a7a" }} />
                    <input
                      placeholder="Search by reference, plan, status, channel…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                  </div>

                  <select
                    className="form-select"
                    style={{ width: 140, borderRadius: 12, borderColor: "#e5ddd3" }}
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                  >
                    {[5, 10, 20, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}/page
                      </option>
                    ))}
                  </select>

                  <button className="db-refresh-btn" onClick={refresh} disabled={loading}>
                    <i className="bi bi-arrow-clockwise" />
                    Refresh
                  </button>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="db-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Plan</th>
                      <th>Amount</th>
                      <th>Channel</th>
                      <th>Reference</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pagedRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: 46, textAlign: "center", color: "#b5a090" }}>
                          <div style={{ fontWeight: 800, color: "#1a1a2e" }}>No billing records found</div>
                          <div style={{ fontSize: 12.5, marginTop: 4 }}>Try a different search keyword or refresh.</div>
                        </td>
                      </tr>
                    ) : (
                      pagedRows.map((p) => {
                        const t = badgeTone(p.status);
                        return (
                          <tr key={p.id}>
                            <td className="db-muted">{fmtDate(p.created_at || p.starts_at)}</td>

                            <td>
                              <div className="db-strong" style={{ fontWeight: 700 }}>
                                {p.plan?.name || "—"}
                              </div>
                              <div className="db-muted" style={{ fontSize: 12, marginTop: 2 }}>
                                {p.card_type && p.last4 ? `${p.card_type} • ${p.last4}` : "—"}
                              </div>
                            </td>

                            <td className="db-strong">{fmtNaira(Number(p.amount || 0))}</td>

                            <td style={{ textTransform: "capitalize" }}>{p.channel || "—"}</td>

                            <td>
                              <code style={{ fontSize: 12, color: "#1a1a2e" }}>{p.reference}</code>
                            </td>

                            <td>
                              <span className="db-pill" style={{ background: t.bg, color: t.fg }}>
                                {t.text}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div className="db-muted" style={{ fontSize: 12.5 }}>
                  Showing <b>{showingFrom}</b>–<b>{showingTo}</b> of <b>{totalItems}</b>
                  <span className="ms-2">•</span>
                  <span className="ms-2">Successful: <b>{quickTotals.successCount}</b></span>
                  <span className="ms-2">•</span>
                  <span className="ms-2">Last payment: <b>{quickTotals.lastPaymentDate}</b></span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="db-refresh-btn"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <i className="bi bi-chevron-left" />
                    Prev
                  </button>

                  {safePage > 3 && (
                    <>
                      <button className="db-refresh-btn" onClick={() => setPage(1)}>1</button>
                      <span className="db-muted">…</span>
                    </>
                  )}

                  {pageNumbers.map((n) => (
                    <button
                      key={n}
                      className="db-refresh-btn"
                      onClick={() => setPage(n)}
                      style={{
                        background: n === safePage ? "#c9a84c" : undefined,
                        color: n === safePage ? "#0f172a" : undefined,
                        borderColor: n === safePage ? "#c9a84c" : undefined,
                        fontWeight: n === safePage ? 800 : 400,
                        minWidth: 44,
                        justifyContent: "center",
                      }}
                    >
                      {n}
                    </button>
                  ))}

                  {safePage < totalPages - 2 && (
                    <>
                      <span className="db-muted">…</span>
                      <button className="db-refresh-btn" onClick={() => setPage(totalPages)}>
                        {totalPages}
                      </button>
                    </>
                  )}

                  <button
                    className="db-refresh-btn"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                    <i className="bi bi-chevron-right" />
                  </button>
                </div>
              </div>

              <div style={{ padding: "0 16px 16px" }} className="db-muted">
                <i className="bi bi-info-circle me-1" />
                Tip: If you don’t see a recent payment, refresh after verification or contact support.
              </div>
            </div>

            <div className="mt-auto">
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
