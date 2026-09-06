import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../../../utils/axios";

import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const LAST_REGNO_KEY = "gq_parent_payments_last_reg_no";

const money = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(n || 0));

type SummaryResponse = {
  student: { id: number; reg_no: string; name: string };
  totals: { total_due: number; total_paid: number; total_balance: number };
  breakdown: {
    by_fee_status: Array<{ status: string; count: number; due: number; paid: number; bal: number }>;
    by_session_term: Array<{
      session_id: number;
      session_name: string;
      term_id: number | null;
      term_name: string;
      due: number;
      paid: number;
      bal: number;
      items: number;
    }>;
    by_fee_type: Array<{
      fee_type_id: number | null;
      fee_type_name: string;
      due: number;
      paid: number;
      bal: number;
      items: number;
    }>;
  };
};

type PaymentRow = {
  id: number;
  student_fee_id: number;
  amount: string | number | null;
  payment_method: string | null;
  reference: string;
  received_by: number;
  created_at?: string | null;

  session_id: number | null;
  session_name: string | null;

  term_id: number | null;
  term_name: string | null;

  fee_type_id: number | null;
  fee_type_name: string | null;

  total_amount: string | number;
  amount_paid: string | number | null;
  balance: string | number;
  fee_status: string | null;
};

type Paginated<T> = {
  current_page: number;
  data: T[];
  last_page: number;
  per_page: number;
  total: number;
};

type HistoryResponse = {
  student: { id: number; reg_no: string; name: string };
  payments: Paginated<PaymentRow>;
};

export default function ParentPaymentSummaryPage() {
  const navigate = useNavigate();
  const q = useQuery();
  const { showError, showInfo } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const initialRegNo = q.get("reg_no") || localStorage.getItem(LAST_REGNO_KEY) || "";
  const [regNo, setRegNo] = useState(initialRegNo);

  const [summary, setSummary] = useState<SummaryResponse | null>(null);

  // History filters
  const [termId, setTermId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [feeStatus, setFeeStatus] = useState("");

  const [history, setHistory] = useState<HistoryResponse | null>(null);

  // persist reg_no to URL + localStorage
  useEffect(() => {
    const v = regNo.trim();
    if (v) {
      localStorage.setItem(LAST_REGNO_KEY, v);
      const params = new URLSearchParams(window.location.search);
      if (params.get("reg_no") !== v) {
        params.set("reg_no", v);
        navigate({ search: params.toString() }, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regNo]);

  const loadSummary = async (rn?: string) => {
    const v = (rn ?? regNo).trim();
    if (!v) {
      setLoadingSummary(false);
      return;
    }
    setLoadingSummary(true);
    try {
      const res = await authApi.get<SummaryResponse>(`/parent/payments/summary?reg_no=${encodeURIComponent(v)}`);
      setSummary(res.data);
    } catch (e: any) {
      console.error(e);
      showError(e?.response?.data?.message || "Failed to load payment summary.");
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadHistory = async (rn?: string, page?: number) => {
    const v = (rn ?? regNo).trim();
    if (!v) {
      setLoadingHistory(false);
      return;
    }

    setLoadingHistory(true);
    try {
      const params = new URLSearchParams();
      params.set("reg_no", v);
      if (termId.trim()) params.set("term_id", termId.trim());
      if (sessionId.trim()) params.set("session_id", sessionId.trim());
      if (feeStatus.trim()) params.set("fee_status", feeStatus.trim());
      if (page) params.set("page", String(page));

      const res = await authApi.get<HistoryResponse>(`/parent/payments/history?${params.toString()}`);
      setHistory(res.data);
    } catch (e: any) {
      console.error(e);
      showError(e?.response?.data?.message || "Failed to load payment history.");
      setHistory(null);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadSummary(regNo);
    loadHistory(regNo, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regNo]);

  const studentName = summary?.student?.name || history?.student?.name || "";
  const totals = summary?.totals;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        .parent-pay-main {
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: calc(66px + 24px) 28px 40px !important;
        }

        @media (max-width: 767.98px) {
          .parent-pay-main {
            padding: calc(66px + 16px) 14px 36px !important;
          }
          .parent-hero {
            padding: 20px 18px !important;
            border-radius: 14px !important;
            margin-bottom: 16px !important;
          }
          .parent-greeting {
            font-size: 20px !important;
          }
          .parent-hero-sub {
            font-size: 12.5px !important;
          }
        }

        .parent-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 18px;
          padding: 32px 36px;
          color: #FFFFFF;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
          position: relative;
          overflow: hidden;
        }

        .parent-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }

        .parent-hero-glow {
          position: absolute;
          top: -40px;
          right: -40px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.18) 0%, transparent 65%);
          pointer-events: none;
        }

        .parent-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 24px;
        }

        .parent-session-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #FBBF24;
          background: rgba(217, 119, 6, 0.2);
          border: 1px solid rgba(217, 119, 6, 0.35);
          border-radius: 100px;
          padding: 4px 12px;
          margin-bottom: 12px;
        }

        .parent-session-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 6px #10B981;
        }

        .parent-greeting {
          font-size: 26px;
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.1;
          margin-bottom: 8px;
        }

        .parent-hero-sub {
          font-size: 13.5px;
          color: #CBD5E1;
          line-height: 1.6;
          max-width: 520px;
          margin-bottom: 0;
        }

        .parent-stat-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        @media (max-width: 900px) {
          .parent-stat-grid {
            grid-template-columns: 1fr;
          }
        }

        .parent-stat-card {
          background: #FFFFFF;
          border: 1px solid rgba(15, 39, 68, 0.08);
          border-radius: 16px;
          padding: 20px 24px;
          box-shadow: 0 2px 10px rgba(15, 39, 68, 0.04);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .parent-stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(15, 39, 68, 0.08);
        }

        .parent-stat-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #64748B;
          margin-bottom: 6px;
        }

        .parent-stat-val {
          font-size: 24px;
          font-weight: 800;
          color: #0F2744;
          line-height: 1.1;
        }

        .parent-panel {
          background: #FFFFFF;
          border: 1px solid rgba(15, 39, 68, 0.08);
          border-radius: 16px;
          box-shadow: 0 2px 10px rgba(15, 39, 68, 0.04);
          overflow: hidden;
          margin-bottom: 24px;
        }

        .parent-panel-head {
          padding: 18px 24px;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .parent-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .parent-table th {
          background: #F8FAFC;
          padding: 12px 16px;
          font-weight: 700;
          color: #475569;
          font-size: 11.5px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid #E2E8F0;
        }

        .parent-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #F1F5F9;
          color: #1E293B;
          vertical-align: middle;
        }

        .parent-table tr:hover td {
          background: #F8FAFC;
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Parent Payment Summary" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto gq-app-main parent-pay-main d-flex flex-column min-vh-100">
            {(loadingSummary || loadingHistory) && <Loader message="Loading payments summary..." />}

            {/* ── Signature Hero ── */}
            <div className="parent-hero">
              <div className="parent-hero-glow" />
              <div className="parent-hero-inner">
                <div>
                  <div className="parent-session-badge">
                    <span className="parent-session-dot" />
                    Financial Ledger
                  </div>

                  <h1 className="parent-greeting">
                    Payment Summary & Receipts
                  </h1>

                  <p className="parent-hero-sub">
                    {studentName ? `Showing financial clearance records for: ${studentName}` : "Enter your child's Admission No to inspect fee breakdowns and receipts."}
                  </p>
                </div>

                <div className="d-flex gap-2">
                  <button
                    className="btn btn-outline-light px-4 py-2"
                    style={{ borderRadius: 10, fontWeight: 700, backdropFilter: "blur(8px)" }}
                    onClick={() => {
                      showInfo("Refreshing...");
                      loadSummary(regNo);
                      loadHistory(regNo, 1);
                    }}
                  >
                    <i className="bi bi-arrow-clockwise me-2" />
                    Refresh
                  </button>
                  <button
                    className="btn btn-warning px-4 py-2"
                    style={{ borderRadius: 10, fontWeight: 700, color: "#0F2744", background: "#FBBF24" }}
                    onClick={() => navigate("/dashboard")}
                  >
                    <i className="bi bi-speedometer2 me-2" />
                    Dashboard
                  </button>
                </div>
              </div>
            </div>

            {/* ── Search & Filters Panel ── */}
            <div className="parent-panel">
              <div className="parent-panel-head">
                <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#0F2744", margin: 0 }}>
                  <i className="bi bi-funnel-fill text-primary me-2" />
                  Student Lookup & Filter Criteria
                </h2>
              </div>
              <div className="p-4">
                <div className="row g-3 align-items-end">
                  <div className="col-md-6">
                    <label className="form-label" style={{ fontSize: "12.5px", fontWeight: 700, color: "#0F2744" }}>
                      Student Admission Number
                    </label>
                    <input
                      className="form-control"
                      style={{ borderRadius: 10, fontSize: "13.5px" }}
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value)}
                      placeholder="e.g. REG/2026/001"
                    />
                    <small className="text-muted">Saved automatically in your session.</small>
                  </div>

                  <div className="col-md-6 d-flex gap-2 justify-content-md-end">
                    <button
                      className="btn btn-outline-secondary"
                      style={{ borderRadius: 10, fontWeight: 700 }}
                      onClick={() => {
                        setTermId("");
                        setSessionId("");
                        setFeeStatus("");
                        loadHistory(regNo, 1);
                      }}
                    >
                      Reset Filters
                    </button>
                    <button
                      className="btn btn-primary"
                      style={{ borderRadius: 10, fontWeight: 700 }}
                      onClick={() => loadHistory(regNo, 1)}
                    >
                      Apply Filters
                    </button>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label" style={{ fontSize: "12.5px", fontWeight: 700, color: "#0F2744" }}>
                      Session ID (Optional)
                    </label>
                    <input
                      className="form-control"
                      style={{ borderRadius: 10, fontSize: "13.5px" }}
                      value={sessionId}
                      onChange={(e) => setSessionId(e.target.value)}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label" style={{ fontSize: "12.5px", fontWeight: 700, color: "#0F2744" }}>
                      Term ID (Optional)
                    </label>
                    <input
                      className="form-control"
                      style={{ borderRadius: 10, fontSize: "13.5px" }}
                      value={termId}
                      onChange={(e) => setTermId(e.target.value)}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label" style={{ fontSize: "12.5px", fontWeight: 700, color: "#0F2744" }}>
                      Fee Status (Optional)
                    </label>
                    <input
                      className="form-control"
                      style={{ borderRadius: 10, fontSize: "13.5px" }}
                      value={feeStatus}
                      onChange={(e) => setFeeStatus(e.target.value)}
                      placeholder="paid / unpaid / partial"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Summary Stat Cards ── */}
            <div className="parent-stat-grid">
              <div className="parent-stat-card">
                <div className="d-flex align-items-start justify-content-between">
                  <div>
                    <div className="parent-stat-title">Total Fees Billed</div>
                    <div className="parent-stat-val" style={{ color: "#2563EB" }}>{money(totals?.total_due || 0)}</div>
                  </div>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "rgba(37, 99, 235, 0.12)",
                      color: "#2563EB",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                    }}
                  >
                    <i className="bi bi-wallet2" />
                  </div>
                </div>
              </div>

              <div className="parent-stat-card">
                <div className="d-flex align-items-start justify-content-between">
                  <div>
                    <div className="parent-stat-title">Total Verified Paid</div>
                    <div className="parent-stat-val" style={{ color: "#10B981" }}>{money(totals?.total_paid || 0)}</div>
                  </div>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "rgba(16, 185, 129, 0.12)",
                      color: "#10B981",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                    }}
                  >
                    <i className="bi bi-check-circle-fill" />
                  </div>
                </div>
              </div>

              <div className="parent-stat-card">
                <div className="d-flex align-items-start justify-content-between">
                  <div>
                    <div className="parent-stat-title">Outstanding Balance</div>
                    <div className="parent-stat-val" style={{ color: Number(totals?.total_balance || 0) > 0 ? "#EF4444" : "#10B981" }}>
                      {money(totals?.total_balance || 0)}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: Number(totals?.total_balance || 0) > 0 ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)",
                      color: Number(totals?.total_balance || 0) > 0 ? "#EF4444" : "#10B981",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                    }}
                  >
                    <i className="bi bi-exclamation-circle-fill" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Breakdown Tables ── */}
            <div className="row g-4 mb-4">
              <div className="col-lg-6">
                <div className="parent-panel h-100 mb-0">
                  <div className="parent-panel-head">
                    <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#0F2744", margin: 0 }}>
                      <i className="bi bi-calendar3 text-primary me-2" />
                      Breakdown by Academic Term
                    </h2>
                  </div>
                  <div className="table-responsive">
                    <table className="parent-table">
                      <thead>
                        <tr>
                          <th>Session</th>
                          <th>Term</th>
                          <th>Due</th>
                          <th>Paid</th>
                          <th>Bal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(summary?.breakdown?.by_session_term || []).map((r, idx) => (
                          <tr key={idx}>
                            <td>{r.session_name}</td>
                            <td>{r.term_name}</td>
                            <td className="fw-semibold">{money(r.due)}</td>
                            <td style={{ color: "#10B981" }}>{money(r.paid)}</td>
                            <td style={{ fontWeight: 700, color: Number(r.bal) > 0 ? "#EF4444" : "#10B981" }}>
                              {money(r.bal)}
                            </td>
                          </tr>
                        ))}
                        {(!summary?.breakdown?.by_session_term || summary.breakdown.by_session_term.length === 0) && (
                          <tr>
                            <td colSpan={5} className="text-center text-muted py-4">No term breakdowns available</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="col-lg-6">
                <div className="parent-panel h-100 mb-0">
                  <div className="parent-panel-head">
                    <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#0F2744", margin: 0 }}>
                      <i className="bi bi-tag-fill text-warning me-2" />
                      Breakdown by Fee Type
                    </h2>
                  </div>
                  <div className="table-responsive">
                    <table className="parent-table">
                      <thead>
                        <tr>
                          <th>Fee Item</th>
                          <th>Due</th>
                          <th>Paid</th>
                          <th>Bal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(summary?.breakdown?.by_fee_type || []).map((r, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{r.fee_type_name}</td>
                            <td>{money(r.due)}</td>
                            <td style={{ color: "#10B981" }}>{money(r.paid)}</td>
                            <td style={{ fontWeight: 700, color: Number(r.bal) > 0 ? "#EF4444" : "#10B981" }}>
                              {money(r.bal)}
                            </td>
                          </tr>
                        ))}
                        {(!summary?.breakdown?.by_fee_type || summary.breakdown.by_fee_type.length === 0) && (
                          <tr>
                            <td colSpan={4} className="text-center text-muted py-4">No fee item breakdowns available</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Transaction History Table ── */}
            <div className="parent-panel mb-5">
              <div className="parent-panel-head">
                <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#0F2744", margin: 0 }}>
                  <i className="bi bi-clock-history text-primary me-2" />
                  Verified Payment Receipts & Ledger ({history?.payments?.total ?? 0})
                </h2>
              </div>

              <div className="table-responsive">
                <table className="parent-table">
                  <thead>
                    <tr>
                      <th>Ref Number</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Fee Type</th>
                      <th>Session</th>
                      <th>Term</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(history?.payments?.data || []).map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 700, color: "#0F2744" }}>{p.reference}</td>
                        <td style={{ fontWeight: 800, color: "#10B981" }}>{money(Number(p.amount || 0))}</td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {(p.payment_method || "-").toUpperCase()}
                          </span>
                        </td>
                        <td>{p.fee_type_name ?? "-"}</td>
                        <td>{p.session_name ?? "-"}</td>
                        <td>{p.term_name ?? "-"}</td>
                        <td>
                          <span className="badge bg-success-subtle text-success">
                            {p.fee_status ?? "Verified"}
                          </span>
                        </td>
                        <td style={{ fontSize: "12px", color: "#64748B" }}>
                          {p.created_at ? new Date(p.created_at).toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }) : "—"}
                        </td>
                        <td className="text-end">
                          <a
                            href={`/api/parent/payments/${encodeURIComponent(p.reference)}/receipt/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                            style={{ borderRadius: 8, fontSize: "12px", padding: "4px 10px", fontWeight: 700 }}
                            title="Download Official PDF Receipt"
                          >
                            <i className="bi bi-file-earmark-pdf" />
                            <span>PDF</span>
                          </a>
                        </td>
                      </tr>
                    ))}

                    {!loadingHistory && (!history?.payments?.data || history.payments.data.length === 0) && (
                      <tr>
                        <td colSpan={9} className="text-center text-muted py-5">
                          <i className="bi bi-receipt fs-2 d-block mb-2 text-secondary" />
                          No payment transactions recorded for this student.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {history?.payments && history.payments.last_page > 1 && (
                <div className="p-3 border-top d-flex justify-content-between align-items-center">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    style={{ borderRadius: 8, fontWeight: 700 }}
                    disabled={history.payments.current_page <= 1}
                    onClick={() => loadHistory(regNo, history.payments.current_page - 1)}
                  >
                    Previous
                  </button>
                  <div className="text-muted small">
                    Page {history.payments.current_page} of {history.payments.last_page}
                  </div>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    style={{ borderRadius: 8, fontWeight: 700 }}
                    disabled={history.payments.current_page >= history.payments.last_page}
                    onClick={() => loadHistory(regNo, history.payments.current_page + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}