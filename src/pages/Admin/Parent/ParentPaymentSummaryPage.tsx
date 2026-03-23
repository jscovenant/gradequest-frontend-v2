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
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Payment Summary" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto px-4 d-flex flex-column min-vh-100" style={{ backgroundColor: "#f8f9fa" }}>
            {(loadingSummary || loadingHistory) && <Loader message="Loading payments..." />}

            {/* Hero */}
            <div
              className="mt-4 p-4"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: 16,
                boxShadow: "0 10px 30px rgba(102, 126, 234, 0.25)",
              }}
            >
              <div className="d-flex flex-wrap justify-content-between align-items-center">
                <div>
                  <span
                    className="badge px-3 py-2 mb-2"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.2)",
                      color: "#fff",
                      borderRadius: 20,
                      fontSize: "0.75rem",
                      fontWeight: 500,
                    }}
                  >
                    <i className="bi bi-receipt me-1" />
                    Payments
                  </span>

                  <h3 className="fw-bold text-white mb-1">Payment History & Breakdown</h3>
                  <p className="text-white mb-0" style={{ opacity: 0.9 }}>
                    {studentName ? `Student: ${studentName}` : "Enter your child Reg No to load fee/payment records."}
                  </p>
                </div>

                <div className="d-flex gap-2 mt-3 mt-md-0">
                  <button
                    className="btn btn-light"
                    style={{ borderRadius: 10 }}
                    onClick={() => {
                      showInfo("Refreshing...");
                      loadSummary(regNo);
                      loadHistory(regNo, 1);
                    }}
                  >
                    <i className="bi bi-arrow-clockwise me-2" />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Reg No + filters */}
            <div className="card border-0 shadow-sm mt-3" style={{ borderRadius: 12 }}>
              <div className="card-body p-4">
                <div className="row g-3 align-items-end">
                  <div className="col-md-6">
                    <label className="form-label">Student Reg No</label>
                    <input
                      className="form-control"
                      style={{ borderRadius: 10 }}
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value)}
                      placeholder="e.g. REG/2026/001"
                    />
                    <small className="text-muted">Saved automatically. Refresh won’t clear it.</small>
                  </div>

                  <div className="col-md-6 d-flex gap-2 justify-content-md-end">
                    <button
                      className="btn btn-outline-dark"
                      style={{ borderRadius: 10 }}
                      onClick={() => {
                        setTermId("");
                        setSessionId("");
                        setFeeStatus("");
                        loadHistory(regNo, 1);
                      }}
                    >
                      Reset Filters
                    </button>
                    <button className="btn btn-primary" style={{ borderRadius: 10 }} onClick={() => loadHistory(regNo, 1)}>
                      Apply Filters
                    </button>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Session ID (optional)</label>
                    <input className="form-control" style={{ borderRadius: 10 }} value={sessionId} onChange={(e) => setSessionId(e.target.value)} />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Term ID (optional)</label>
                    <input className="form-control" style={{ borderRadius: 10 }} value={termId} onChange={(e) => setTermId(e.target.value)} />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Fee Status (optional)</label>
                    <input
                      className="form-control"
                      style={{ borderRadius: 10 }}
                      value={feeStatus}
                      onChange={(e) => setFeeStatus(e.target.value)}
                      placeholder="paid / unpaid / partial etc"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Summary cards */}
            <div className="row g-3 mt-1">
              <div className="col-md-4">
                <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                  <div className="card-body p-4">
                    <div className="text-muted small">Total Fees Due</div>
                    <div className="fw-bold fs-4">{money(totals?.total_due || 0)}</div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                  <div className="card-body p-4">
                    <div className="text-muted small">Total Paid</div>
                    <div className="fw-bold fs-4">{money(totals?.total_paid || 0)}</div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                  <div className="card-body p-4">
                    <div className="text-muted small">Outstanding Balance</div>
                    <div className="fw-bold fs-4">{money(totals?.total_balance || 0)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Breakdown tables */}
            <div className="row g-3 mt-1">
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                  <div className="card-body p-4">
                    <h6 className="fw-semibold mb-2">Breakdown by Session & Term</h6>
                    <div className="table-responsive">
                      <table className="table table-sm align-middle">
                        <thead>
                          <tr className="text-muted small">
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
                              <td>{money(r.paid)}</td>
                              <td>{money(r.bal)}</td>
                            </tr>
                          ))}
                          {(!summary?.breakdown?.by_session_term || summary.breakdown.by_session_term.length === 0) && (
                            <tr>
                              <td colSpan={5} className="text-center text-muted py-3">No data</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-6">
                <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                  <div className="card-body p-4">
                    <h6 className="fw-semibold mb-2">Breakdown by Fee Type</h6>
                    <div className="table-responsive">
                      <table className="table table-sm align-middle">
                        <thead>
                          <tr className="text-muted small">
                            <th>Fee Type</th>
                            <th>Due</th>
                            <th>Paid</th>
                            <th>Bal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(summary?.breakdown?.by_fee_type || []).map((r, idx) => (
                            <tr key={idx}>
                              <td>{r.fee_type_name}</td>
                              <td className="fw-semibold">{money(r.due)}</td>
                              <td>{money(r.paid)}</td>
                              <td>{money(r.bal)}</td>
                            </tr>
                          ))}
                          {(!summary?.breakdown?.by_fee_type || summary.breakdown.by_fee_type.length === 0) && (
                            <tr>
                              <td colSpan={4} className="text-center text-muted py-3">No data</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div className="card border-0 shadow-sm mt-3 mb-5" style={{ borderRadius: 12 }}>
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="fw-semibold mb-0">Payment History</h6>
                  <span className="badge bg-primary">{history?.payments?.total ?? 0} records</span>
                </div>

                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr className="text-muted small">
                        <th>Ref</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Fee Type</th>
                        <th>Session</th>
                        <th>Term</th>
                        <th>Fee Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(history?.payments?.data || []).map((p) => (
                        <tr key={p.id}>
                          <td className="fw-semibold">{p.reference}</td>
                          <td>{money(Number(p.amount || 0))}</td>
                          <td>{(p.payment_method || "—").toUpperCase()}</td>
                          <td>{p.fee_type_name ?? "—"}</td>
                          <td>{p.session_name ?? "—"}</td>
                          <td>{p.term_name ?? "—"}</td>
                          <td>
                            <span className="badge bg-light text-dark" style={{ borderRadius: 20 }}>
                              {p.fee_status ?? "—"}
                            </span>
                          </td>
                          <td>{p.created_at ? new Date(p.created_at).toLocaleString() : "—"}</td>
                        </tr>
                      ))}

                      {!loadingHistory && (!history?.payments?.data || history.payments.data.length === 0) && (
                        <tr>
                          <td colSpan={8} className="text-center text-muted py-4">
                            No payments found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {history?.payments && history.payments.last_page > 1 && (
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <button
                      className="btn btn-outline-secondary"
                      style={{ borderRadius: 10 }}
                      disabled={history.payments.current_page <= 1}
                      onClick={() => loadHistory(regNo, history.payments.current_page - 1)}
                    >
                      Prev
                    </button>
                    <div className="text-muted small">
                      Page {history.payments.current_page} of {history.payments.last_page}
                    </div>
                    <button
                      className="btn btn-outline-secondary"
                      style={{ borderRadius: 10 }}
                      disabled={history.payments.current_page >= history.payments.last_page}
                      onClick={() => loadHistory(regNo, history.payments.current_page + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}