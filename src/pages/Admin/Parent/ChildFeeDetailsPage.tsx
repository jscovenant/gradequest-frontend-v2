// src/pages/Parents/ChildFeeDetailsPage.tsx
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
  if (Number.isNaN(v)) return "0.00";
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function badgeForStatus(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "paid") return "bg-success";
  if (s === "partial") return "bg-warning text-dark";
  return "bg-danger";
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
      alert(e?.response?.data?.message || "Unable to load bank accounts.");
    } finally {
      setBankLoading(false);
    }
  };

  const studentName = useMemo(() => {
    const s = data?.student;
    if (!s) return "";
    return `${s.firstname || ""} ${s.surname || ""}`.trim();
  }, [data]);

  return (
    <>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Child Fees" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main
            className="col-md-9 col-lg-10 ms-auto px-4 d-flex flex-column min-vh-100"
            style={{ backgroundColor: "#f8f9fa" }}
          >
            {loading && <Loader message="Loading fee details..." />}

            {/* Header */}
            <div
              className="mt-4 p-4"
              style={{
                background: "linear-gradient(135deg, #22c55e 0%, #0ea5e9 100%)",
                borderRadius: 16,
                boxShadow: "0 10px 30px rgba(34, 197, 94, 0.18)",
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
                    <i className="bi bi-receipt-cutoff me-1" />
                    Fees
                  </span>

                  <h3 className="fw-bold text-white mb-1">
                    Fee Details {studentName ? `— ${studentName}` : ""}
                  </h3>

                  <p className="text-white mb-0" style={{ opacity: 0.9 }}>
                    {data?.filters?.term?.name || "Term"} • {data?.filters?.session?.name || "Session"} • Reg No:{" "}
                    {data?.student?.reg_no || "—"}
                  </p>
                </div>

                <div className="d-flex gap-2 mt-3 mt-md-0">
                  <button
                    className="btn btn-light"
                    style={{ borderRadius: 10 }}
                    onClick={() => nav(-1)}
                  >
                    <i className="bi bi-arrow-left me-2" />
                    Back
                  </button>

                  <button
                    className="btn btn-dark"
                    style={{ borderRadius: 10 }}
                    onClick={openBankAccounts}
                    disabled={!data}
                  >
                    <i className="bi bi-bank me-2" />
                    View Bank Account Details
                  </button>
                </div>
              </div>

              {/* Summary cards */}
              <div className="row g-3 mt-3">
                <div className="col-md-3">
                  <div
                    className="p-3"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.15)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      borderRadius: 14,
                    }}
                  >
                    <div className="text-white-50 small">Total</div>
                    <div className="text-white fw-bold fs-4">{money(data?.summary?.total)}</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div
                    className="p-3"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.15)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      borderRadius: 14,
                    }}
                  >
                    <div className="text-white-50 small">Paid</div>
                    <div className="text-white fw-bold fs-4">{money(data?.summary?.paid)}</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div
                    className="p-3"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.15)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      borderRadius: 14,
                    }}
                  >
                    <div className="text-white-50 small">Balance</div>
                    <div className="text-white fw-bold fs-4">{money(data?.summary?.balance)}</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div
                    className="p-3"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.15)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      borderRadius: 14,
                    }}
                  >
                    <div className="text-white-50 small">Status</div>
                    <div className="d-flex align-items-center gap-2 mt-1">
                      <span className={`badge ${badgeForStatus(data?.summary?.status || "unpaid")}`}>
                        {(data?.summary?.status || "unpaid").toUpperCase()}
                      </span>
                      <span className="text-white-50 small">overall</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger mt-3" style={{ borderRadius: 12 }}>
                <i className="bi bi-exclamation-triangle me-2" />
                {error}
              </div>
            )}

            {/* Items table */}
            <div className="card border-0 shadow-sm mt-4 mb-5" style={{ borderRadius: 12 }}>
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h6 className="fw-semibold mb-0" style={{ color: "#1e293b" }}>
                      Fee Breakdown
                    </h6>
                    <small className="text-muted">Shows each fee type and its payment status.</small>
                  </div>

                  <button className="btn btn-outline-primary" style={{ borderRadius: 10 }} onClick={load}>
                    <i className="bi bi-arrow-clockwise me-2" />
                    Refresh
                  </button>
                </div>

                {!data?.items?.length ? (
                  <div className="text-muted text-center py-5">
                    No fee records found for this term/session.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>Fee Type</th>
                          <th className="text-end">Total</th>
                          <th className="text-end">Paid</th>
                          <th className="text-end">Balance</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.items.map((it) => (
                          <tr key={it.id}>
                            <td className="fw-semibold" style={{ color: "#0f172a" }}>
                              {it.fee_name}
                            </td>
                            <td className="text-end">{money(it.total_amount)}</td>
                            <td className="text-end">{money(it.amount_paid)}</td>
                            <td className="text-end">{money(it.balance)}</td>
                            <td>
                              <span className={`badge ${badgeForStatus(it.status || "unpaid")}`}>
                                {(it.status || "unpaid").toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-3 text-muted small">
                  Tip: If you paid via transfer, go back and upload the payment receipt for approval.
                </div>
              </div>
            </div>

            {/* Bank accounts modal */}
            {showBankModal && (
              <div
                className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                style={{
                  background: "rgba(0,0,0,0.45)",
                  backdropFilter: "blur(6px)",
                  zIndex: 1100,
                }}
              >
                <div
                  className="card shadow-lg border-0"
                  style={{ width: "100%", maxWidth: 700, borderRadius: 18 }}
                >
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <h5 className="fw-bold mb-0">Bank Account Details</h5>
                        <small className="text-muted">
                          Use these details to make a transfer. Then upload your receipt.
                        </small>
                      </div>
                      <button
                        className="btn-close"
                        onClick={() => setShowBankModal(false)}
                      />
                    </div>

                    {bankLoading ? (
                      <div className="py-4">
                        <span className="spinner-border spinner-border-sm me-2" />
                        Loading bank accounts...
                      </div>
                    ) : !bankData?.accounts?.length ? (
                      <div className="text-muted text-center py-4">
                        No active bank accounts configured by the school.
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {bankData.accounts.map((a) => (
                          <div
                            key={a.id}
                            className="p-3"
                            style={{
                              border: "1px solid #eef2f7",
                              borderRadius: 14,
                              background: "#f8fafc",
                            }}
                          >
                            <div className="d-flex justify-content-between align-items-start gap-2">
                              <div>
                                <div className="fw-semibold" style={{ color: "#0f172a" }}>
                                  {a.bank_name}{" "}
                                  <span className="text-muted fw-normal">
                                    {a.bank_code ? `• ${a.bank_code}` : ""}
                                  </span>
                                </div>
                                <div className="text-muted small">Currency: {a.currency || "NGN"}</div>

                                <div className="mt-2">
                                  <div className="text-muted small">Account Name</div>
                                  <div className="fw-semibold">{a.account_name}</div>
                                </div>

                                <div className="mt-2">
                                  <div className="text-muted small">Account Number</div>
                                  <div className="d-flex align-items-center gap-2">
                                    <div className="fw-semibold" style={{ letterSpacing: 0.6 }}>
                                      {a.account_number}
                                    </div>
                                    <button
                                      className="btn btn-sm btn-outline-secondary"
                                      style={{ borderRadius: 10 }}
                                      onClick={() => {
                                        const ok = copy(a.account_number);
                                        if (ok) alert("Account number copied.");
                                      }}
                                    >
                                      <i className="bi bi-clipboard me-1" />
                                      Copy
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <i className="bi bi-bank fs-4 text-muted" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="d-flex justify-content-end mt-4">
                      <button
                        className="btn btn-outline-dark"
                        style={{ borderRadius: 10 }}
                        onClick={() => setShowBankModal(false)}
                      >
                        Close
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