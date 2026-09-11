// src/pages/Fees/StudentFeePaymentPage.tsx
import { useEffect, useMemo, useState } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";

/* =========================
   TYPES
========================= */
type StudentInfo = {
  id: number;
  name: string;
  reg_no: string;
  section: string;
  class: string;
};

type FeeTypeRel = { id: number; name: string; amount: number };
type TermRel = { id: number; name: string };
type SessionRel = { id: number; name: string };

type StudentFee = {
  id: number;
  student_id: number;
  school_id: number;
  section_id: number;
  fee_type_id: number;
  term_id: number;
  session_id: number;
  total_amount: number;
  amount_paid: number;
  balance: number;

  feeType?: FeeTypeRel | null;
  term?: TermRel | null;
  session?: SessionRel | null;
};

type FullPaymentDiscount = {
  enabled: boolean;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  discount_amount: number;
  original_balance: number;
  discounted_payable_amount: number;
  formatted_discount: string;
  message: string;
};

type InstallmentPreset = {
  label: string;
  percent: number;
  amount: number;
  original_amount?: number;
  discount_amount?: number;
  discount_applied?: boolean;
};

type InstallmentPlan = {
  enabled: boolean;
  installment_type: string;
  min_initial_percent: number;
  min_initial_amount: number;
  min_payable_now: number;
  presets: InstallmentPreset[];
  full_payment_discount?: FullPaymentDiscount | null;
  message: string;
};

type StudentFeeDetailsResponse = {
  student: StudentInfo;
  fees: StudentFee[];
  installment_plan?: InstallmentPlan;
  full_payment_discount?: FullPaymentDiscount | null;
};

type PayFeeResponse = {
  message: string;
  payment: any;
  balance: number;
  status: "paid" | "partial" | "unpaid" | string;
};

/* =========================
   HELPERS
========================= */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getErrorMessage(err: any): string {
  const status = err?.response?.status;
  const data = err?.response?.data;

  if (status === 422) return data?.message ?? "Validation error.";
  if (status === 404) return data?.message ?? "Not found.";
  if (status === 403) return data?.message ?? "Forbidden.";
  if (status === 400) return data?.message ?? "Bad request.";
  return data?.message ?? err?.message ?? "Something went wrong.";
}

function naira(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return v.toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
}

function paymentStatus(f: StudentFee) {
  const bal = Number(f.balance ?? 0);
  const total = Number(f.total_amount ?? 0);
  if (bal <= 0) return { label: "Paid", tone: "paid" as const };
  if (bal < total) return { label: "Partial", tone: "partial" as const };
  return { label: "Unpaid", tone: "unpaid" as const };
}

/* =========================
   PAGE
========================= */
export default function StudentFeePaymentPage() {
  const { showSuccess, showError, showWarning } = useToast();

  // layout
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // loading
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // query inputs
  const [regNo, setRegNo] = useState("");
  const [sessionId, setSessionId] = useState<string>(""); // optional filter
  const [termId, setTermId] = useState<string>(""); // optional filter

  // optional filters dropdown
  const [sessions, setSessions] = useState<{ id: number; name: string }[]>([]);
  const [terms, setTerms] = useState<{ id: number; name: string }[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  // fetched result
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [installmentPlan, setInstallmentPlan] = useState<InstallmentPlan | null>(null);
  const [fullDiscount, setFullDiscount] = useState<FullPaymentDiscount | null>(null);

  // UI state
  const [filter, setFilter] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const isBusy = (k: string) => busyKey === k;

  // pay modal
  const [showPay, setShowPay] = useState(false);
  const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null);
  const [payFeeId, setPayFeeId] = useState<number | null>(null);
  const [payMethod, setPayMethod] = useState<string>("");
  const [payAmount, setPayAmount] = useState<string>("");
  const [applyFullDiscount, setApplyFullDiscount] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setLoadingPage(false), 120);
    return () => window.clearTimeout(t);
  }, []);

  // OPTIONAL: load sessions/terms
  useEffect(() => {
    let mounted = true;

    async function bootMeta() {
      try {
        setLoadingMeta(true);
        const [sesRes, termRes] = await Promise.all([authApi.get("/facademic-sessions"), authApi.get("/fterms")]);

        if (!mounted) return;

        const rawSes = sesRes.data?.data ?? sesRes.data ?? [];
        setSessions((Array.isArray(rawSes) ? rawSes : []).map((s: any) => ({ id: s.id, name: s.name ?? s.session ?? s.title ?? "" })));

        const rawTerms = termRes.data?.data ?? termRes.data ?? [];
        setTerms((Array.isArray(rawTerms) ? rawTerms : []).map((t: any) => ({ id: t.id, name: t.name ?? t.term ?? "" })));
      } catch {
        // silently ignore (page still works)
      } finally {
        if (mounted) setLoadingMeta(false);
      }
    }

    bootMeta();
    return () => {
      mounted = false;
    };
  }, []);

  /* =========================
     FETCH DETAILS
  ========================= */
  async function fetchStudentFees() {
    const rn = regNo.trim();
    if (!rn) return showWarning("Enter student registration number.");

    try {
      setLoadingDetails(true);
      const res = await authApi.get<StudentFeeDetailsResponse>("/fees/student/details", {
        params: {
          reg_no: rn,
          session_id: sessionId || undefined,
          term_id: termId || undefined,
        },
      });

      setStudent(res.data?.student ?? null);
      setFees(Array.isArray(res.data?.fees) ? res.data.fees : []);
      setInstallmentPlan(res.data?.installment_plan ?? null);
      setFullDiscount(res.data?.full_payment_discount ?? res.data?.installment_plan?.full_payment_discount ?? null);
      showSuccess("Student fee details loaded.");
    } catch (e: any) {
      console.error(e);
      setStudent(null);
      setFees([]);
      setInstallmentPlan(null);
      setFullDiscount(null);
      showError(getErrorMessage(e));
    } finally {
      setLoadingDetails(false);
    }
  }

  /* =========================
     PAY FLOW
  ========================= */
  function openPayModal(f: StudentFee) {
    if (!f?.id) return;
    setSelectedFee(f);
    setPayFeeId(f.id);
    setPayMethod("");
    setApplyFullDiscount(false);
    setPayAmount(String(Math.max(0, Number(f.balance ?? 0))));
    setShowPay(true);
  }

  async function submitPayment() {
    if (!payFeeId) return;
    const method = payMethod.trim();
    if (!method) return showError("Enter payment method (e.g. bank transfer).");

    const amountNum = Number(payAmount);
    if (Number.isNaN(amountNum) || amountNum <= 0) return showError("Enter a valid amount.");

    try {
      setBusyKey(`fee:pay:${payFeeId}`);
      const res = await authApi.post<PayFeeResponse>("/fees/pay", {
        student_fee_id: payFeeId,
        amount: amountNum,
        payment_method: method,
        apply_full_discount: applyFullDiscount,
      });

      showSuccess(res.data?.message ?? "Payment successful.");
      setShowPay(false);

      await fetchStudentFees();
    } catch (e: any) {
      console.error(e);
      showError(getErrorMessage(e));
    } finally {
      setBusyKey(null);
    }
  }

  const filteredFees = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return fees;

    return fees.filter((f) => {
      const name = (f.feeType?.name ?? "").toLowerCase();
      const term = (f.term?.name ?? "").toLowerCase();
      const ses = (f.session?.name ?? "").toLowerCase();
      const status = paymentStatus(f).label.toLowerCase();
      return `${name} ${term} ${ses} ${status} ${f.total_amount} ${f.amount_paid} ${f.balance}`.includes(q);
    });
  }, [fees, filter]);

  const stats = useMemo(() => {
    const total = fees.length;
    const paid = fees.filter((f) => Number(f.balance ?? 0) <= 0).length;
    const outstanding = fees.reduce((acc, f) => acc + Number(f.balance ?? 0), 0);
    const paidAmount = fees.reduce((acc, f) => acc + Number(f.amount_paid ?? 0), 0);
    const totalAmount = fees.reduce((acc, f) => acc + Number(f.total_amount ?? 0), 0);
    return { total, paid, outstanding, paidAmount, totalAmount };
  }, [fees]);

  const canSearch = !!regNo.trim() && busyKey === null && !loadingDetails;

  /* =========================
     RENDER
  ========================= */
  return (
    <>
      {/* SAME TEMPLATE (inline CSS) */}
      <style>{`
        /* ======= StudentFeePaymentPage - Modern SaaS style ======= */
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .db-main {
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: 24px 28px 0;
        }

        .db-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 18px;
          padding: 32px 36px;
          position: relative;
          overflow: hidden;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
        }
        .db-hero-glow {
          position: absolute;
          top: -60px;
          right: -60px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.15) 0%, transparent 65%);
          pointer-events: none;
        }
        .db-hero-glow2 {
          position: absolute;
          bottom: -40px;
          left: 30%;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.10) 0%, transparent 70%);
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

        .db-session-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #FBBF24;
          background: rgba(217, 119, 6, 0.20);
          border: 1px solid rgba(217, 119, 6, 0.35);
          border-radius: 100px;
          padding: 4px 12px;
          margin-bottom: 12px;
        }
        .db-session-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          animation: dbPulse 2s ease infinite;
        }
        @keyframes dbPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.5); }
        }

        .db-greeting {
          font-size: 26px;
          font-weight: 800;
          color: #fff;
          line-height: 1.1;
          margin-bottom: 8px;
        }
        .db-greeting em { font-style: normal; color: #FBBF24; }

        .db-hero-sub {
          font-size: 13.5px;
          color: #CBD5E1;
          line-height: 1.6;
          max-width: 620px;
          margin-bottom: 20px;
        }

        .db-hero-btns { display: flex; gap: 10px; flex-wrap: wrap; }

        .db-btn-gold {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 700;
          color: #FFFFFF;
          background: #D97706;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          white-space: nowrap;
        }
        .db-btn-gold:hover { background: #B45309; transform: translateY(-1px); color: #FFFFFF; }
        .db-btn-gold:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        .db-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 600;
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.10);
          border: 1px solid rgba(255, 255, 255, 0.20);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .db-btn-outline:hover { background: rgba(255, 255, 255, 0.18); color: #fff; }
        .db-btn-outline:disabled { opacity: 0.55; cursor: not-allowed; }

        .db-hero-stat-card {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(8px);
          border-radius: 14px;
          padding: 20px 24px;
          min-width: 320px;
        }
        .db-hero-stat-row { display: flex; flex-direction: column; gap: 10px; }
        .db-hero-stat-item { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .db-hero-stat-label { font-size: 12px; font-weight: 400; color: #CBD5E1; }
        .db-hero-stat-val { font-size: 18px; font-weight: 800; color: #FBBF24; }
        .db-hero-stat-sep { height: 1px; background: rgba(255, 255, 255, 0.08); }

        .db-panel {
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(15,39,68,0.03);
          margin-bottom: 24px;
        }
        .db-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          gap: 12px;
          flex-wrap: wrap;
        }
        .db-panel-title-group { display: flex; align-items: center; gap: 12px; min-width: 240px; }
        .db-panel-icon {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--pi, #fef3c7);
          color: var(--pc, #b45309);
          flex-shrink: 0;
        }
        .db-panel-title {
          font-family: "Lora", serif;
          font-size: 16px;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0;
        }
        .db-panel-sub { font-size: 11.5px; font-weight: 300; color: #9a8a7a; margin: 0; }

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
        .db-table tbody tr { transition: background 0.15s; }
        .db-table tbody tr:hover { background: #faf8f5; }

        .db-skeleton {
          height: 14px;
          border-radius: 7px;
          background: linear-gradient(90deg, #f0ebe3 25%, #e8e0d5 50%, #f0ebe3 75%);
          background-size: 200% 100%;
          animation: dbSkeleton 1.4s ease infinite;
        }
        @keyframes dbSkeleton {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }

        .db-pill {
          display: inline-flex;
          align-items: center;
          font-size: 12px;
          font-weight: 500;
          padding: 3px 10px;
          border-radius: 999px;
          background: rgba(30, 64, 175, 0.08);
          color: #1e40af;
          border: 1px solid rgba(30, 64, 175, 0.12);
          white-space: nowrap;
        }
        .db-pill--gold {
          background: rgba(180, 83, 9, 0.08);
          color: #b45309;
          border-color: rgba(180, 83, 9, 0.14);
        }
        .db-pill--violet {
          background: rgba(124, 58, 237, 0.08);
          color: #7c3aed;
          border-color: rgba(124, 58, 237, 0.12);
        }
        .db-pill--green {
          background: rgba(6, 95, 70, 0.08);
          color: #065f46;
          border-color: rgba(6, 95, 70, 0.12);
        }
        .db-pill--red {
          background: rgba(220, 38, 38, 0.08);
          color: #b91c1c;
          border-color: rgba(220, 38, 38, 0.14);
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
          border-radius: var(--bs-border-radius, 9px);
          cursor: pointer;
          transition: background 0.2s;
          white-space: nowrap;
        }
        .db-refresh-btn:hover { background: #ede8e0; }
        .db-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .db-grid2 { display: grid; grid-template-columns: 1fr 420px; gap: 18px; margin-bottom: 22px; }
        @media (max-width: 991.98px) {
          .db-grid2 { grid-template-columns: 1fr; }
          .db-main { padding: 18px 14px 0; }
          .db-hero { padding: 24px 20px; }
          .db-hero-stat-card { min-width: 0; width: 100%; }
        }
        @keyframes dbSpin { to { transform: rotate(360deg); } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Student Fee Payment" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loadingPage && <Loader message="Loading fee payment..." />}

            {/* HERO */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Fees • Offline Payment
                  </div>

                  <h1 className="db-greeting">
                    {getGreeting()}, <em>Admin.</em>
                  </h1>

                  <p className="db-hero-sub">
                    Look up a student’s assigned fees by <b>Registration Number</b> to record offline fee collections, bank transfers, POS payments, and apply full-settlement discounts.
                  </p>

                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span
                      style={{
                        background: "rgba(255, 255, 255, 0.12)",
                        color: "#F8FAFC",
                        border: "1px solid rgba(255, 255, 255, 0.20)",
                        borderRadius: 999,
                        padding: "5px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <i className="bi bi-wallet2 text-warning" /> Direct Offline Collections
                    </span>
                    <span
                      style={{
                        background: "rgba(255, 255, 255, 0.12)",
                        color: "#F8FAFC",
                        border: "1px solid rgba(255, 255, 255, 0.20)",
                        borderRadius: 999,
                        padding: "5px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <i className="bi bi-patch-check-fill text-success" /> Receipt & Installment Reconciled
                    </span>
                  </div>
                </div>

                <div className="db-hero-stat-card d-none d-md-block">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c9a84c" }}>
                      Fee Summary Glance
                    </span>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M2 10V6M5 10V4M8 10V7M11 10V3" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div className="db-hero-stat-row">
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Fees Loaded</span>
                      <span className="db-hero-stat-val">{stats.total}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Fully Settled</span>
                      <span className="db-hero-stat-val">{stats.paid}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Total Outstanding</span>
                      <span className="db-hero-stat-val">{naira(stats.outstanding)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MAIN GRID */}
            <div className="db-grid2">
              {/* LEFT: search + table */}
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Search / Filters */}
                <div className="db-panel">
                  <div className="db-panel-head">
                    <div className="db-panel-title-group">
                      <div className="db-panel-icon" style={{ "--pi": "#dbeafe", "--pc": "#1e40af" } as any}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M11 11l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div>
                        <p className="db-panel-title">Lookup Student Fees</p>
                        <p className="db-panel-sub">Enter Registration Number to query assigned fee structures</p>
                      </div>
                    </div>

                    {student && (
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        style={{ borderRadius: 8, fontSize: 12, fontWeight: 600 }}
                        onClick={() => {
                          setStudent(null);
                          setFees([]);
                          setFilter("");
                          setRegNo("");
                        }}
                        disabled={busyKey !== null || loadingDetails}
                      >
                        <i className="bi bi-x-circle me-1" /> Clear Student
                      </button>
                    )}
                  </div>

                  <div style={{ padding: 20 }}>
                    <div className="row g-3 align-items-end">
                      <div className="col-12 col-md-4 col-lg-4">
                        <label className="form-label fw-bold small mb-1" style={{ color: "#0F2744" }}>
                          Student Reg Number <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <span className="input-group-text bg-white" style={{ borderColor: "#CBD5E1", borderRight: "none" }}>
                            <i className="bi bi-person-badge text-muted" />
                          </span>
                          <input
                            className="form-control"
                            style={{ borderColor: "#CBD5E1", borderLeft: "none", fontWeight: 700, color: "#0F2744" }}
                            placeholder="e.g. GQ/2026/012"
                            value={regNo}
                            onChange={(e) => setRegNo(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && canSearch) {
                                fetchStudentFees();
                              }
                            }}
                            disabled={busyKey !== null || loadingDetails}
                          />
                        </div>
                      </div>

                      <div className="col-12 col-md-3 col-lg-3">
                        <label className="form-label fw-bold small mb-1" style={{ color: "#0F2744" }}>
                          Academic Session <span className="text-muted fw-normal">(Optional)</span>
                        </label>
                        <select
                          className="form-select"
                          style={{ borderColor: "#CBD5E1" }}
                          value={sessionId}
                          onChange={(e) => setSessionId(e.target.value)}
                          disabled={busyKey !== null || loadingMeta}
                          title={!sessions.length ? "Optional" : ""}
                        >
                          <option value="">All Sessions</option>
                          {sessions.map((s) => (
                            <option key={s.id} value={String(s.id)}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-12 col-md-3 col-lg-3">
                        <label className="form-label fw-bold small mb-1" style={{ color: "#0F2744" }}>
                          Term <span className="text-muted fw-normal">(Optional)</span>
                        </label>
                        <select
                          className="form-select"
                          style={{ borderColor: "#CBD5E1" }}
                          value={termId}
                          onChange={(e) => setTermId(e.target.value)}
                          disabled={busyKey !== null || loadingMeta}
                          title={!terms.length ? "Optional" : ""}
                        >
                          <option value="">All Terms</option>
                          {terms.map((t) => (
                            <option key={t.id} value={String(t.id)}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-12 col-md-2 col-lg-2">
                        <button
                          className="db-btn-gold w-100"
                          style={{ height: 38, justifyContent: "center" }}
                          onClick={fetchStudentFees}
                          disabled={!canSearch}
                          title={!regNo.trim() ? "Enter Registration Number first" : "Click or press Enter to fetch fees"}
                        >
                          {loadingDetails ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1" />
                              Fetching…
                            </>
                          ) : (
                            <>
                              <i className="bi bi-search me-1" />
                              Fetch Fees
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {fees.length > 0 && (
                      <div className="mt-3 pt-3 border-top">
                        <div className="row g-2 align-items-center">
                          <div className="col-12 col-md-8">
                            <div className="input-group input-group-sm">
                              <span className="input-group-text bg-white border-end-0">
                                <i className="bi bi-funnel text-muted" />
                              </span>
                              <input
                                className="form-control border-start-0"
                                placeholder="Filter loaded fees by fee name, term, status…"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="col-12 col-md-4 d-flex justify-content-end">
                            {filter && (
                              <button className="btn btn-sm btn-outline-secondary w-100" onClick={() => setFilter("")} style={{ borderRadius: 8 }}>
                                Clear Filter
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {installmentPlan?.enabled && (
                  <div
                    style={{
                      background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
                      border: "1px solid #BFDBFE",
                      borderRadius: 14,
                      padding: "14px 18px",
                      marginBottom: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 14,
                      flexWrap: "wrap",
                      boxShadow: "0 2px 8px rgba(30, 64, 175, 0.05)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: "#2563EB",
                          color: "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                        }}
                      >
                        <i className="bi bi-pie-chart-fill" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: "#1E3A8A" }}>
                          School Installment Policy ({installmentPlan.min_initial_percent}% Initial Payment)
                        </div>
                        <div style={{ fontSize: 12.5, color: "#2563EB" }}>
                          {installmentPlan.message || `Minimum initial payment for the term is ${naira(installmentPlan.min_initial_amount)}.`}
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        background: "#1E40AF",
                        color: "#FFFFFF",
                        fontSize: 11.5,
                        fontWeight: 700,
                        padding: "5px 12px",
                        borderRadius: 999,
                        letterSpacing: "0.03em",
                      }}
                    >
                      <i className="bi bi-shield-check me-1" /> Policy Active
                    </span>
                  </div>
                )}

                {fullDiscount?.enabled && (
                  <div
                    style={{
                      background: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)",
                      border: "1px solid #6EE7B7",
                      borderRadius: 14,
                      padding: "14px 18px",
                      marginBottom: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 14,
                      flexWrap: "wrap",
                      boxShadow: "0 2px 8px rgba(5, 150, 105, 0.06)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: "#059669",
                          color: "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                        }}
                      >
                        <i className="bi bi-tag-fill" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: "#065F46" }}>
                          Full-Payment Early Incentive Active ({fullDiscount.formatted_discount} Discount)
                        </div>
                        <div style={{ fontSize: 12.5, color: "#047857" }}>
                          {fullDiscount.message || `Full upfront settlements save ${fullDiscount.formatted_discount} (${naira(fullDiscount.discount_amount)}).`}
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        background: "#047857",
                        color: "#FFFFFF",
                        fontSize: 11.5,
                        fontWeight: 700,
                        padding: "5px 12px",
                        borderRadius: 999,
                        letterSpacing: "0.03em",
                      }}
                    >
                      <i className="bi bi-patch-check-fill me-1" /> Discount Active
                    </span>
                  </div>
                )}

                {/* Fees Table */}
                <div className="db-panel">
                  <div className="db-panel-head">
                    <div className="db-panel-title-group">
                      <div className="db-panel-icon" style={{ "--pi": "#fef3c7", "--pc": "#b45309" } as any}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M4 2h8v12H4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                          <path d="M6 5h4M6 8h4M6 11h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div>
                        <p className="db-panel-title">Assigned Fees</p>
                        <p className="db-panel-sub">Pay selected fee items (backend may enforce receipt approval)</p>
                      </div>
                    </div>

                    <button className="db-refresh-btn" onClick={fetchStudentFees} disabled={!canSearch}>
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 14 14"
                        fill="none"
                        style={{ animation: loadingDetails ? "dbSpin 0.8s linear infinite" : "none" }}
                      >
                        <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                      Refresh
                    </button>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table className="db-table">
                      <thead>
                        <tr>
                          <th style={{ width: 60 }}>#</th>
                          <th>Fee</th>
                          <th style={{ width: 140, textAlign: "right" }}>Total</th>
                          <th style={{ width: 140, textAlign: "right" }}>Paid</th>
                          <th style={{ width: 140, textAlign: "right" }}>Balance</th>
                          <th style={{ width: 140 }}>Term</th>
                          <th style={{ width: 180 }}>Session</th>
                          <th style={{ width: 120 }}>Status</th>
                          <th style={{ width: 160, textAlign: "right" }}>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {!student ? (
                          <tr>
                            <td colSpan={9} style={{ padding: 18, textAlign: "center", color: "#9a8a7a" }}>
                              Enter Reg No and click <b>Fetch</b> to load assigned fees.
                            </td>
                          </tr>
                        ) : loadingDetails ? (
                          <tr>
                            <td colSpan={9} style={{ padding: 18 }}>
                              <div className="db-skeleton" style={{ width: "60%", marginBottom: 10 }} />
                              <div className="db-skeleton" style={{ width: "90%", marginBottom: 10 }} />
                              <div className="db-skeleton" style={{ width: "80%" }} />
                            </td>
                          </tr>
                        ) : filteredFees.length === 0 ? (
                          <tr>
                            <td colSpan={9} style={{ padding: 18, textAlign: "center", color: "#9a8a7a" }}>
                              No fees found. Try adjusting filters (Session/Term) or the search keyword.
                            </td>
                          </tr>
                        ) : (
                          filteredFees.map((f, idx) => {
                            const st = paymentStatus(f);
                            const fullyPaid = st.tone === "paid";
                            const actionBusy = payFeeId === f.id && isBusy(`fee:pay:${f.id}`);

                            const statusPill =
                              st.tone === "paid" ? "db-pill db-pill--green" : st.tone === "partial" ? "db-pill db-pill--gold" : "db-pill";

                            return (
                              <tr key={f.id}>
                                <td>{idx + 1}</td>
                                <td>
                                  <div style={{ fontWeight: 600, color: "#1a1a2e" }}>{f.feeType?.name ?? `Fee Type #${f.fee_type_id}`}</div>
                                  <div style={{ fontSize: 12, color: "#9a8a7a" }}>StudentFee ID: {f.id}</div>
                                </td>
                                <td style={{ textAlign: "right", fontWeight: 700, color: "#1a1a2e" }}>{naira(f.total_amount)}</td>
                                <td style={{ textAlign: "right" }}>{naira(f.amount_paid)}</td>
                                <td style={{ textAlign: "right", fontWeight: 700 }}>{naira(f.balance)}</td>
                                <td>
                                  <span className="db-pill db-pill--violet">{f.term?.name ?? `#${f.term_id}`}</span>
                                </td>
                                <td>
                                  <span className="db-pill">{f.session?.name ?? `#${f.session_id}`}</span>
                                </td>
                                <td>
                                  <span className={statusPill}>{st.label}</span>
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  <button
                                    className="db-refresh-btn"
                                    onClick={() => openPayModal(f)}
                                    disabled={busyKey !== null || fullyPaid}
                                      title={fullyPaid ? "Already fully paid" : "Pay fee"}
                                    style={{
                                      background: fullyPaid ? "#f5f1eb" : "rgba(201,168,76,0.16)",
                                      borderColor: fullyPaid ? "#e5ddd3" : "rgba(201,168,76,0.26)",
                                      color: fullyPaid ? "#7a6a5a" : "#1a1a2e",
                                    }}
                                  >
                                      {actionBusy ? (
                                      <>
                                        <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} />
                                        Paying…
                                      </>
                                    ) : (
                                      <>
                                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                                          <path
                                            d="M2.5 6.5h11"
                                            stroke="currentColor"
                                            strokeWidth="1.4"
                                            strokeLinecap="round"
                                          />
                                          <path
                                            d="M4 10h3"
                                            stroke="currentColor"
                                            strokeWidth="1.4"
                                            strokeLinecap="round"
                                          />
                                          <path
                                            d="M3.5 4.5h9a1.5 1.5 0 011.5 1.5v5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11V6a1.5 1.5 0 011.5-1.5z"
                                            stroke="currentColor"
                                            strokeWidth="1.4"
                                            strokeLinejoin="round"
                                          />
                                        </svg>
                                        Pay
                                      </>
                                    )}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* RIGHT: student snapshot */}
              <div className="db-panel" style={{ height: "fit-content", position: "sticky", top: 16 }}>
                <div className="db-panel-head">
                  <div className="db-panel-title-group">
                    <div className="db-panel-icon" style={{ "--pi": "#d1fae5", "--pc": "#065f46" } as any}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.4" />
                        <path d="M3 14c0-3 3-5 5-5s5 2 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="db-panel-title">Student Snapshot</p>
                      <p className="db-panel-sub">Overview of totals and outstanding balance</p>
                    </div>
                  </div>

                  <button className="db-refresh-btn" onClick={fetchStudentFees} disabled={!canSearch}>
                    Refresh
                  </button>
                </div>

                <div style={{ padding: 18 }}>
                        {!student ? (
                    <div style={{ color: "#9a8a7a" }}>
                      No student loaded yet. Use the search to load fee details.
                    </div>
                  ) : (
                    <>
                      <div style={{ fontWeight: 700, color: "#1a1a2e" }}>{student.name}</div>
                      <div style={{ marginTop: 6, color: "#9a8a7a", fontSize: 12.5 }}>
                        <div>
                          Reg No: <b style={{ color: "#1a1a2e" }}>{student.reg_no}</b>
                        </div>
                        <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span className="db-pill">{student.section}</span>
                          <span className="db-pill db-pill--violet">{student.class}</span>
                        </div>
                      </div>

                      <hr style={{ opacity: 0.08 }} />

                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <span style={{ color: "#9a8a7a", fontSize: 12 }}>Total fees</span>
                          <span style={{ fontFamily: "Lora, serif", fontWeight: 700, color: "#1a1a2e" }}>{stats.total}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <span style={{ color: "#9a8a7a", fontSize: 12 }}>Fully paid</span>
                          <span style={{ fontFamily: "Lora, serif", fontWeight: 700, color: "#1a1a2e" }}>{stats.paid}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <span style={{ color: "#9a8a7a", fontSize: 12 }}>Total amount</span>
                          <span style={{ fontFamily: "Lora, serif", fontWeight: 700, color: "#1a1a2e" }}>{naira(stats.totalAmount)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <span style={{ color: "#9a8a7a", fontSize: 12 }}>Paid amount</span>
                          <span style={{ fontFamily: "Lora, serif", fontWeight: 700, color: "#1a1a2e" }}>{naira(stats.paidAmount)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <span style={{ color: "#9a8a7a", fontSize: 12 }}>Outstanding</span>
                          <span style={{ fontFamily: "Lora, serif", fontWeight: 700, color: "#b45309" }}>{naira(stats.outstanding)}</span>
                        </div>
                      </div>

                      <div style={{ marginTop: 14 }} className="db-pill db-pill--red">
                        Backend may reject payment if receipt is not approved.
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="mt-auto">
              <Footer />
            </div>

            {/* =========================
                MODAL: PAY FEE
            ========================= */}
            {showPay && payFeeId && (
              <div
                className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                style={{
                  background: "rgba(15, 23, 42, 0.55)",
                  backdropFilter: "blur(6px)",
                  zIndex: 1100,
                  padding: 12,
                }}
                  onClick={() => (busyKey ? null : setShowPay(false))}
              >
                <div
                  className="db-panel"
                  style={{ width: "100%", maxWidth: 720, borderRadius: 16, boxShadow: "0 30px 80px rgba(0,0,0,0.35)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="db-panel-head" style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                    <div className="db-panel-title-group">
                      <div className="db-panel-icon" style={{ "--pi": "#ede9fe", "--pc": "#7c3aed" } as any}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M3.5 4.5h9a1.5 1.5 0 011.5 1.5v5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11V6a1.5 1.5 0 011.5-1.5z"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinejoin="round"
                          />
                          <path d="M2.5 6.5h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          <path d="M4 10h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div>
                        <p className="db-panel-title">Pay Fee</p>
                        <p className="db-panel-sub">Payment may require an approved receipt (backend enforced)</p>
                      </div>
                    </div>

                    <button
                      className="db-refresh-btn"
                      onClick={() => setShowPay(false)}
                      disabled={busyKey !== null}
                      style={{ background: "transparent" }}
                      title="Close"
                    >
                      Close
                    </button>
                  </div>

                  <div style={{ padding: 18 }}>
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label fw-semibold small mb-1">Payment Method *</label>
                        <div className="d-flex gap-2 mb-2 flex-wrap">
                          {["Cash", "Bank Transfer", "POS"].map((m) => (
                            <button
                              key={m}
                              type="button"
                              className={`btn btn-sm ${payMethod === m ? "btn-dark" : "btn-outline-secondary"}`}
                              style={{ borderRadius: 8, fontSize: 12, fontWeight: 600 }}
                              onClick={() => setPayMethod(m)}
                              disabled={busyKey !== null}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                        <input
                          className="form-control"
                          placeholder="e.g. Bank Transfer / POS / Cash"
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value)}
                          disabled={busyKey !== null}
                        />
                        <div className="form-text">
                          Must match the method used for the uploaded receipt (backend checks <code>payment_method</code>).
                        </div>
                      </div>

                      {/* Full-Payment Incentive Switch */}
                      {fullDiscount?.enabled && selectedFee && (
                        <div
                          className="col-12"
                          style={{
                            background: applyFullDiscount ? "#F0FDF4" : "#F8FAFC",
                            border: `1.5px solid ${applyFullDiscount ? "#86EFAC" : "#E2E8F0"}`,
                            borderRadius: 12,
                            padding: "14px 16px",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div className="d-flex align-items-center justify-content-between mb-0">
                            <label
                              className="form-check-label fw-bold small text-dark d-flex align-items-center gap-2 mb-0"
                              htmlFor="applyDiscountSwitch"
                              style={{ cursor: "pointer" }}
                            >
                              <i className="bi bi-tag-fill text-success fs-6" />
                              <div>
                                <div>Apply Full-Payment Early Settlement Discount</div>
                                <div className="text-muted fw-normal" style={{ fontSize: 11.5 }}>
                                  {fullDiscount.formatted_discount} discount on full fee settlement
                                </div>
                              </div>
                            </label>
                            <div className="form-check form-switch m-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                role="switch"
                                id="applyDiscountSwitch"
                                style={{ width: "2.4em", height: "1.2em", cursor: "pointer" }}
                                checked={applyFullDiscount}
                                disabled={busyKey !== null}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setApplyFullDiscount(checked);
                                  const feeBal = Number(selectedFee.balance || 0);
                                  const feeTotal = Number(selectedFee.total_amount || 0);
                                  if (checked) {
                                    const disc =
                                      fullDiscount.discount_type === "percentage"
                                        ? (fullDiscount.discount_value / 100) * (feeTotal > 0 ? feeTotal : feeBal)
                                        : fullDiscount.discount_value;
                                    const finalDisc = Math.min(disc, feeBal);
                                    setPayAmount(String(Math.max(0, Math.round((feeBal - finalDisc) * 100) / 100)));
                                  } else {
                                    setPayAmount(String(feeBal));
                                  }
                                }}
                              />
                            </div>
                          </div>
                          {applyFullDiscount && (
                            <div className="mt-2 pt-2 border-top small text-success fw-semibold d-flex justify-content-between align-items-center">
                              <span>Settles Fee in Full at Discount:</span>
                              <span className="badge bg-success text-white">
                                Pay {naira(Number(payAmount))} (Waives {naira(Math.max(0, Number(selectedFee.balance || 0) - Number(payAmount)))})
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <label className="form-label fw-semibold small mb-0">Amount (₦) *</label>
                          {installmentPlan?.enabled && (
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                              Min {installmentPlan.min_initial_percent}% Initial
                            </span>
                          )}
                        </div>

                        {installmentPlan?.enabled && (
                          <div className="alert alert-info py-2 px-3 mb-2" style={{ fontSize: 12.5, borderRadius: 8 }}>
                            <i className="bi bi-info-circle me-1" />
                            {installmentPlan.message || `Minimum initial payment required is ${naira(installmentPlan.min_payable_now)}.`}
                          </div>
                        )}

                        {/* Quick Presets */}
                        {installmentPlan?.presets && installmentPlan.presets.length > 0 && (
                          <div className="d-flex gap-2 mb-2 flex-wrap">
                            {installmentPlan.presets.map((preset, pIdx) => {
                              const isSelected = payAmount === String(preset.amount);
                              const isDiscountPreset = Boolean(preset.discount_applied);
                              return (
                                <button
                                  key={pIdx}
                                  type="button"
                                  className={`btn btn-sm ${
                                    isSelected
                                      ? isDiscountPreset
                                        ? "btn-success"
                                        : "btn-primary"
                                      : isDiscountPreset
                                      ? "btn-outline-success"
                                      : "btn-outline-primary"
                                  }`}
                                  style={{ borderRadius: 8, fontSize: 12, fontWeight: 600 }}
                                  onClick={() => {
                                    setPayAmount(String(preset.amount));
                                    if (preset.discount_applied) {
                                      setApplyFullDiscount(true);
                                    } else {
                                      setApplyFullDiscount(false);
                                    }
                                  }}
                                  disabled={busyKey !== null}
                                >
                                  {isDiscountPreset && <i className="bi bi-patch-check-fill me-1" />}
                                  {preset.label} ({naira(preset.amount)})
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <input
                          className="form-control"
                          type="number"
                          min={1}
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          disabled={busyKey !== null}
                        />
                        <div className="form-text">
                          {applyFullDiscount
                            ? "Full payment discount applied: Settles fee in full upon payment."
                            : "Backend will reject if amount exceeds the remaining balance."}
                        </div>
                      </div>

                      <div className="col-12">
                        <div className="alert alert-warning mb-0">
                          <b>If payment fails</b>, confirm the student has uploaded a receipt and it is <b>approved</b>.
                        </div>
                      </div>
                    </div>

                    <div className="d-flex flex-wrap gap-2 justify-content-end mt-4">
                      <button
                        className="btn btn-outline-secondary"
                        onClick={() => setShowPay(false)}
                        disabled={busyKey !== null}
                        style={{ borderRadius: 10 }}
                      >
                        Cancel
                      </button>

                      <button
                        className="btn"
                        onClick={submitPayment}
                        disabled={busyKey !== null}
                        style={{
                          borderRadius: 10,
                          fontWeight: 700,
                          background: "#c9a84c",
                          border: "1px solid rgba(201,168,76,0.35)",
                          color: "#0f172a",
                        }}
                      >
                        {isBusy(`fee:pay:${payFeeId}`) ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Processing...
                          </>
                        ) : (
                          "Confirm Payment"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

/**
 * Routes used:
 * - GET  /fees/student/details-reg_no=...&session_id=...&term_id=...
 * - POST /fees/pay  { student_fee_id, amount, payment_method }
 */