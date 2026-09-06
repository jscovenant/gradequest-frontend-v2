import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { authApi } from "../../../utils/axios";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";

type Student = {
  id: number;
  firstname?: string;
  surname?: string;
  reg_no?: string;
  photo?: string | null;
  school_id?: number | null;
};

type FeeItem = {
  id: number;
  fee_type_id?: number | null;
  fee_name: string;
  total_amount: string | number;
  amount_paid: string | number | null;
  balance: string | number;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type FeesResponse = {
  student: Student;
  school_id: number;
  filters: {
    term: { id: number; name: string } | null;
    session: { id: number; name: string } | null;
    term_id: number | null;
    session_id: number | null;
  };
  summary: {
    total: number;
    paid: number;
    balance: number;
    status: "paid" | "partial" | "unpaid" | string;
  };
  items: FeeItem[];
};

type BankAccount = {
  id: number;
  bank_name: string;
  bank_code?: string | null;
  account_name: string;
  account_number: string;
  currency?: string | null;
};

type BankAccountsResponse = {
  school_id: number;
  accounts: BankAccount[];
};

function money(n: any) {
  const v = Number(n ?? 0);
  if (Number.isNaN(v)) return "₦0.00";
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(v);
}

function copy(text: string) {
  try {
    navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function ChildFeeDetailsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FeesResponse | null>(null);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // bank modal
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankData, setBankData] = useState<BankAccountsResponse | null>(null);

  const { studentId } = useParams();
  const nav = useNavigate();

  const load = async () => {
    if (!studentId) return;
    setLoading(true);
    setError("");
    try {
      const res = await authApi.get<FeesResponse>(`/parent/students/${studentId}/fees`);
      setData(res.data);
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || "Failed to load fee details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const openBankAccounts = async () => {
    if (!studentId) return;
    setShowBankModal(true);
    setBankLoading(true);
    setBankData(null);

    try {
      const res = await authApi.get<BankAccountsResponse>(
        `/parent/students/${studentId}/bank-accounts`
      );
      setBankData(res.data);
    } catch (e: any) {
      console.error(e);
      setBankData(null);
    } finally {
      setBankLoading(false);
    }
  };

  const studentName = useMemo(() => {
    const s = data?.student;
    if (!s) return "";
    return `${s.firstname || ""} ${s.surname || ""}`.trim();
  }, [data]);

  const studentInitials = useMemo(() => {
    const s = data?.student;
    if (!s) return "ST";
    return `${s.firstname?.[0] || ""}${s.surname?.[0] || ""}`.toUpperCase() || "ST";
  }, [data]);

  const handleCopy = (acc: BankAccount) => {
    copy(acc.account_number);
    setCopiedId(acc.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status?: string | null) => {
    const s = (status || "unpaid").toLowerCase();
    if (s === "paid") {
      return <span className="badge bg-success-subtle text-success fw-bold px-2 py-1"><i className="bi bi-check-circle-fill me-1" />Paid in Full</span>;
    }
    if (s === "partial") {
      return <span className="badge bg-warning-subtle text-warning fw-bold px-2 py-1"><i className="bi bi-clock-history me-1" />Partially Paid</span>;
    }
    return <span className="badge bg-danger-subtle text-danger fw-bold px-2 py-1"><i className="bi bi-exclamation-circle-fill me-1" />Unpaid Balance</span>;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        .p-fee-main {
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: calc(66px + 24px) 28px 40px !important;
        }

        @media (max-width: 767.98px) {
          .p-fee-main {
            padding: calc(66px + 16px) 14px 36px !important;
          }
        }

        .p-fee-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 18px;
          padding: 32px 36px;
          color: #FFFFFF;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
          position: relative;
          overflow: hidden;
        }

        @media (max-width: 767.98px) {
          .p-fee-hero {
            padding: 20px 18px !important;
            border-radius: 14px !important;
            margin-bottom: 16px !important;
          }
        }

        .p-fee-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }

        .p-fee-hero-glow {
          position: absolute;
          top: -40px;
          right: -40px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.2) 0%, transparent 65%);
          pointer-events: none;
        }

        .p-fee-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
        }

        .p-fee-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
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

        .p-fee-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 6px #10B981;
        }

        .p-fee-title {
          font-size: 26px;
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.1;
          margin-bottom: 8px;
        }

        .p-fee-title em {
          font-style: normal;
          color: #FBBF24;
        }

        .p-fee-sub {
          font-size: 13.5px;
          color: #CBD5E1;
          line-height: 1.6;
          max-width: 620px;
          margin-bottom: 0;
        }

        @media (max-width: 767.98px) {
          .p-fee-title {
            font-size: 20px !important;
          }
          .p-fee-sub {
            font-size: 12.5px !important;
          }
        }

        /* KPI Stat Cards */
        .p-stat-card {
          background: #FFFFFF;
          border: 1px solid rgba(15, 39, 68, 0.08);
          border-radius: 16px;
          padding: 20px 24px;
          box-shadow: 0 2px 10px rgba(15, 39, 68, 0.04);
          transition: all 0.2s ease;
        }

        .p-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(15, 39, 68, 0.08);
        }

        /* Panel */
        .p-fee-panel {
          background: #FFFFFF;
          border: 1px solid rgba(15, 39, 68, 0.08);
          border-radius: 18px;
          box-shadow: 0 4px 20px rgba(15, 39, 68, 0.06);
          overflow: hidden;
          margin-bottom: 24px;
        }

        .p-fee-panel-head {
          padding: 18px 24px;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .p-fee-table {
          width: 100%;
          border-collapse: collapse;
        }

        .p-fee-table th {
          background: #F8FAFC;
          color: #64748B;
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 12px 18px;
          border-bottom: 1px solid #E2E8F0;
        }

        .p-fee-table td {
          padding: 14px 18px;
          border-bottom: 1px solid #F1F5F9;
          font-size: 13.5px;
          color: #1E293B;
          vertical-align: middle;
        }

        .p-fee-table tr:hover td {
          background: #F8FAFC;
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title={`Fee Details - ${studentName || "Student"}`} />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto gq-app-main p-fee-main d-flex flex-column min-vh-100">
            {loading && <Loader message="Loading fee details..." />}

            {/* ── Signature Hero ── */}
            <div className="p-fee-hero">
              <div className="p-fee-hero-glow" />
              <div className="p-fee-hero-inner">
                <div>
                  <div className="p-fee-badge">
                    <span className="p-fee-dot" />
                    Parent Portal · Fee & Payment Breakdown
                  </div>
                  <h1 className="p-fee-title">
                    Fee Statement: <em>{studentName || "Ward"}</em>
                  </h1>
                  <p className="p-fee-sub">
                    {data?.filters?.term?.name || "Current Term"} · {data?.filters?.session?.name || "Session"} · Reg No: <strong>{data?.student?.reg_no || "—"}</strong>
                  </p>
                </div>

                <div className="d-flex gap-2 flex-wrap">
                  <button
                    type="button"
                    className="btn btn-outline-light rounded-pill px-4 fw-bold"
                    onClick={() => nav("/parent/children")}
                  >
                    <i className="bi bi-arrow-left me-1" />
                    My Children
                  </button>

                  <button
                    type="button"
                    className="btn btn-warning rounded-pill px-4 fw-bold"
                    style={{ color: "#0F2744", background: "#FBBF24" }}
                    onClick={openBankAccounts}
                    disabled={!data}
                  >
                    <i className="bi bi-bank2 me-1" />
                    School Bank Accounts
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger rounded-4 mb-4 shadow-sm">
                <i className="bi bi-exclamation-triangle-fill me-2" />
                {error}
              </div>
            )}

            {/* ── KPI Summary Cards ── */}
            <div className="row g-3 mb-4">
              <div className="col-sm-6 col-xl-3">
                <div className="p-stat-card border-start border-primary border-4">
                  <div className="small fw-bold text-uppercase text-muted mb-1">Total Fee Assessed</div>
                  <div className="fs-3 fw-bold text-dark">{money(data?.summary?.total)}</div>
                  <div className="small text-muted">Curriculum & facility fees</div>
                </div>
              </div>

              <div className="col-sm-6 col-xl-3">
                <div className="p-stat-card border-start border-success border-4">
                  <div className="small fw-bold text-uppercase text-muted mb-1">Total Amount Paid</div>
                  <div className="fs-3 fw-bold text-success">{money(data?.summary?.paid)}</div>
                  <div className="small text-muted">Confirmed bank & online receipts</div>
                </div>
              </div>

              <div className="col-sm-6 col-xl-3">
                <div className="p-stat-card border-start border-danger border-4">
                  <div className="small fw-bold text-uppercase text-muted mb-1">Outstanding Balance</div>
                  <div className={`fs-3 fw-bold ${(data?.summary?.balance || 0) <= 0 ? "text-success" : "text-danger"}`}>
                    {money(data?.summary?.balance)}
                  </div>
                  <div className="small text-muted">Amount currently due</div>
                </div>
              </div>

              <div className="col-sm-6 col-xl-3">
                <div className="p-stat-card border-start border-warning border-4">
                  <div className="small fw-bold text-uppercase text-muted mb-1">Payment Status</div>
                  <div className="mt-1">{getStatusBadge(data?.summary?.status)}</div>
                  <div className="small text-muted mt-2">Overall account clearance</div>
                </div>
              </div>
            </div>

            {/* ── Fee Breakdown Table ── */}
            <div className="p-fee-panel mb-4">
              <div className="p-fee-panel-head">
                <div>
                  <h2 className="fs-6 fw-bold mb-0 text-dark">
                    <i className="bi bi-receipt me-2 text-primary" />
                    Itemized Fee Schedule
                  </h2>
                  <small className="text-muted">Itemized breakdown for the academic term</small>
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                    onClick={load}
                  >
                    <i className="bi bi-arrow-clockwise me-1" />
                    Refresh
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary rounded-pill px-3 fw-bold"
                    onClick={() => nav("/parent/upload-receipt")}
                  >
                    <i className="bi bi-cloud-arrow-up-fill me-1" />
                    Upload Bank Receipt
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="p-fee-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Fee Description</th>
                      <th>Assessed Amount</th>
                      <th>Amount Paid</th>
                      <th>Balance Due</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data?.items || data.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-5 text-muted">
                          <i className="bi bi-cash-stack fs-2 d-block mb-2 text-secondary" />
                          No specific fee items assigned for this term.
                        </td>
                      </tr>
                    ) : (
                      data.items.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="text-muted small">{idx + 1}</td>
                          <td className="fw-bold text-dark">{item.fee_name}</td>
                          <td>{money(item.total_amount)}</td>
                          <td className="text-success fw-bold">{money(item.amount_paid)}</td>
                          <td className={`fw-bold ${Number(item.balance || 0) <= 0 ? "text-success" : "text-danger"}`}>
                            {money(item.balance)}
                          </td>
                          <td>{getStatusBadge(item.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Bank Account Modal ── */}
            {showBankModal && (
              <div className="modal show d-block gq-modal-backdrop" style={{ background: "rgba(15, 39, 68, 0.6)", backdropFilter: "blur(4px)" }}>
                <div className="modal-dialog modal-dialog-centered modal-lg">
                  <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
                    <div className="modal-header text-white" style={{ background: "linear-gradient(135deg, #0A192F 0%, #0F2744 100%)" }}>
                      <h5 className="modal-title fw-bold fs-6">
                        <i className="bi bi-bank me-2 text-warning" />
                        School Official Bank Accounts
                      </h5>
                      <button type="button" className="btn-close btn-close-white" onClick={() => setShowBankModal(false)} />
                    </div>

                    <div className="modal-body p-4">
                      {bankLoading && <div className="text-center py-4"><Loader message="Loading bank details..." /></div>}

                      {!bankLoading && (!bankData?.accounts || bankData.accounts.length === 0) && (
                        <div className="text-center py-5 text-muted">
                          <i className="bi bi-building-x fs-1 d-block mb-2" />
                          No bank accounts currently listed by the school.
                        </div>
                      )}

                      {!bankLoading && bankData?.accounts && bankData.accounts.length > 0 && (
                        <div className="row g-3">
                          {bankData.accounts.map((acc) => (
                            <div key={acc.id} className="col-md-6">
                              <div className="border rounded-4 p-3 bg-light position-relative h-100">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <span className="badge bg-primary-subtle text-primary fw-bold">
                                    {acc.bank_name}
                                  </span>
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${copiedId === acc.id ? "btn-success" : "btn-outline-secondary"} rounded-pill`}
                                    onClick={() => handleCopy(acc)}
                                  >
                                    <i className={`bi ${copiedId === acc.id ? "bi-check-lg" : "bi-clipboard"} me-1`} />
                                    {copiedId === acc.id ? "Copied!" : "Copy"}
                                  </button>
                                </div>
                                <div className="fs-5 fw-bold text-dark mb-1 font-monospace">{acc.account_number}</div>
                                <div className="small text-muted">Account Name: <strong>{acc.account_name}</strong></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="alert alert-info rounded-3 mt-4 small mb-0">
                        <i className="bi bi-info-circle-fill me-2" />
                        After making a direct bank deposit or electronic transfer, please use the <strong>Upload Bank Receipt</strong> button to attach your payment receipt for bursary clearance.
                      </div>
                    </div>

                    <div className="modal-footer bg-light">
                      <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowBankModal(false)}>
                        Close
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary rounded-pill px-4 fw-bold"
                        onClick={() => {
                          setShowBankModal(false);
                          nav("/parent/upload-receipt");
                        }}
                      >
                        <i className="bi bi-cloud-arrow-up me-1" />
                        Proceed to Upload Receipt
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}