
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

export default function BillingPage() {
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
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

  useEffect(() => {
    setLoading(true);
    authApi
      .get("/subscription/billing")
      .then((res) => {
        setSubscription(res.data.subscription || null);
        setPayments(res.data.payments || []);
      })
      .catch((err) => {
        console.error(err);
        showError?.(err?.response?.data?.message || "Failed to load billing records.");
      })
      .finally(() => setLoading(false));
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

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await authApi.get("/subscription/billing");
      setSubscription(res.data.subscription || null);
      setPayments(res.data.payments || []);
      showSuccess?.("Billing refreshed.");
    } catch (err: any) {
      console.error(err);
      showError?.(err?.response?.data?.message || "Failed to refresh billing.");
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