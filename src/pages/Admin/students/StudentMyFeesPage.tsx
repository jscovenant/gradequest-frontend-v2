import { useEffect, useMemo, useState } from "react";
import { authApi } from "../../../utils/axios";

import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";

/* =========================
   TYPES
========================= */
type FeeType = {
  id: number;
  name: string;
};

type FeeRow = {
  id: number;
  student_id: number;
  fee_type_id?: number | null;
  total_amount: number | string;
  amount_paid: number | string;
  balance: number | string;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  fee_type?: FeeType | null; // sometimes backend uses fee_type
  feeType?: FeeType | null;  // your backend uses with('feeType')
};

type Pagination<T> = {
  current_page: number;
  data: T[];
  first_page_url?: string;
  from?: number | null;
  last_page: number;
  last_page_url?: string;
  links?: Array<{ url: string | null; label: string; active: boolean }>;
  next_page_url: string | null;
  path?: string;
  per_page: number;
  prev_page_url: string | null;
  to?: number | null;
  total: number;
};

type MyFeesResponse = {
  student: {
    name: string;
    reg_no: string;
  };
  summary: {
    total_fees: number;
    total_paid: number;
    balance: number;
    last_payment_date: string | null;
  };
  fees: Pagination<FeeRow>;
};

type StatCard = {
  title: string;
  value: string | number;
  icon: string;
  helper?: string;
};

function formatMoney(val: any) {
  const n = Number(val ?? 0);
  if (Number.isNaN(n)) return "₦0";
  return n.toLocaleString("en-NG", { style: "currency", currency: "NGN" });
}

function formatDate(val: any) {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default function StudentMyFeesPage() {
  // ===== Sidebar State =====
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ===== Loading & Error =====
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // ===== Data =====
  const [studentName, setStudentName] = useState("");
  const [regNo, setRegNo] = useState("");
  const [summary, setSummary] = useState<MyFeesResponse["summary"]>({
    total_fees: 0,
    total_paid: 0,
    balance: 0,
    last_payment_date: null,
  });

  const [fees, setFees] = useState<Pagination<FeeRow> | null>(null);

  // ===== Pagination =====
  const [page, setPage] = useState<number>(1);

  const stats: StatCard[] = useMemo(() => {
    const paidPct =
      summary.total_fees > 0 ? Math.round((summary.total_paid / summary.total_fees) * 100) : 0;

    return [
      {
        title: "Total Fees",
        value: formatMoney(summary.total_fees),
        icon: "cash-coin",
        helper: "All assigned fees",
      },
      {
        title: "Total Paid",
        value: formatMoney(summary.total_paid),
        icon: "check-circle",
        helper: `${paidPct}% paid`,
      },
      {
        title: "Outstanding Balance",
        value: formatMoney(summary.balance),
        icon: "exclamation-triangle",
        helper: "Pending payments",
      },
      {
        title: "Last Payment Date",
        value: formatDate(summary.last_payment_date),
        icon: "calendar-check",
        helper: "Most recent update",
      },
    ];
  }, [summary]);

  // ===== Fetch Data =====
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setErrorMsg("");

    authApi
      .get<MyFeesResponse>("/student/my-fees", { params: { page } })
      .then((res) => {
        if (!mounted) return;

        const data = res.data;
        setStudentName(data.student?.name ?? "");
        setRegNo(data.student?.reg_no ?? "");
        setSummary(data.summary);
        setFees(data.fees);
      })
      .catch((err) => {
        console.error(err);
        if (!mounted) return;
        setErrorMsg(err?.response?.data?.message || "Failed to load fee records.");
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [page]);

  // ===== Greeting =====
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="My Fees" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main
            className="col-md-9 col-lg-10 ms-auto px-4 d-flex flex-column min-vh-100"
            style={{ backgroundColor: "#f8f9fa" }}
          >
            {loading && <Loader message="Loading your fees..." />}

            {/* Header / Hero */}
            <div
              className="mt-4 p-4 position-relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
                borderRadius: "16px",
                boxShadow: "0 10px 30px rgba(99, 102, 241, 0.25)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-50px",
                  right: "-50px",
                  width: "220px",
                  height: "220px",
                  background: "rgba(255, 255, 255, 0.12)",
                  borderRadius: "50%",
                  filter: "blur(40px)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "-40px",
                  left: "-40px",
                  width: "180px",
                  height: "180px",
                  background: "rgba(255, 255, 255, 0.10)",
                  borderRadius: "50%",
                  filter: "blur(40px)",
                }}
              />

              <div className="row align-items-center position-relative">
                <div className="col-md-8">
                  <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                    <span
                      className="badge px-3 py-2"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        color: "#fff",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                      }}
                    >
                      <i className="bi bi-person-badge me-1"></i>
                      {regNo || "—"}
                    </span>
                    <span
                      className="badge px-3 py-2"
                      style={{
                        backgroundColor: "rgba(16, 185, 129, 0.9)",
                        color: "#fff",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                      }}
                    >
                      <i className="bi bi-shield-check me-1"></i>
                      Student Account
                    </span>
                  </div>

                  <h2 className="fw-bold text-white mb-2">
                    {getGreeting()}, {studentName || "Student"} 👋
                  </h2>
                  <p className="text-white mb-0" style={{ opacity: 0.9, fontSize: "1rem" }}>
                    Here’s a complete breakdown of your school fees, payments, and outstanding balance.
                  </p>
                </div>

                <div className="col-md-4 d-none d-md-block text-end">
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(10px)",
                      borderRadius: "16px",
                      padding: "1.25rem",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-white" style={{ fontSize: "0.9rem", opacity: 0.9 }}>
                        Quick Summary
                      </span>
                      <i className="bi bi-receipt text-white"></i>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-white" style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                        Balance
                      </span>
                      <span className="text-white fw-bold">{formatMoney(summary.balance)}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-1">
                      <span className="text-white" style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                        Last Payment
                      </span>
                      <span className="text-white fw-bold">{formatDate(summary.last_payment_date)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Error */}
            {errorMsg && (
              <div className="alert alert-danger mt-3" role="alert">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {errorMsg}
              </div>
            )}

            {/* Stat Cards */}
            <div className="row g-3 my-3">
              {stats.map((s, idx) => {
                const colors = [
                  { gradient: "linear-gradient(135deg,#0ea5e9,#6366f1)", bg: "#eaf6ff" },
                  { gradient: "linear-gradient(135deg,#22c55e,#16a34a)", bg: "#eafff1" },
                  { gradient: "linear-gradient(135deg,#f59e0b,#ef4444)", bg: "#fff4e6" },
                  { gradient: "linear-gradient(135deg,#a855f7,#6366f1)", bg: "#f5eeff" },
                ];

                return (
                  <div className="col-md-6 col-lg-3" key={s.title}>
                    <div
                      className="card border-0 h-100 position-relative overflow-hidden"
                      style={{
                        borderRadius: "12px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: "4px",
                          background: colors[idx]?.gradient ?? colors[0].gradient,
                        }}
                      />
                      <div className="card-body p-4">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div className="p-2 rounded-3" style={{ backgroundColor: colors[idx]?.bg }}>
                            <i className={`bi bi-${s.icon} fs-4`}></i>
                          </div>
                        </div>

                        <p className="text-muted mb-1 small">{s.title}</p>
                        <h5 className="fw-bold mb-1" style={{ color: "#1e293b" }}>
                          {s.value}
                        </h5>
                        <small className="text-muted">{s.helper}</small>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Fees Table */}
            <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: "12px" }}>
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                  <div>
                    <h6 className="mb-0 fw-semibold" style={{ color: "#1e293b" }}>
                      Fee Records
                    </h6>
                    <small className="text-muted">
                      Showing {fees?.from ?? 0} - {fees?.to ?? 0} of {fees?.total ?? 0}
                    </small>
                  </div>

                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => {
                      // refresh same page
                      setPage((p) => p);
                    }}
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    Refresh
                  </button>
                </div>

                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Fee Type</th>
                        <th>Total</th>
                        <th>Paid</th>
                        <th>Balance</th>
                        <th>Status</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!fees?.data?.length ? (
                        <tr>
                          <td colSpan={7} className="text-center text-muted py-4">
                            No fee records found.
                          </td>
                        </tr>
                      ) : (
                        fees.data.map((row, i) => {
                          const feeType = row.feeType?.name || row.fee_type?.name || "—";
                          const status = (row.status || "").toLowerCase();

                          const statusBadge =
                            status === "paid" || Number(row.balance) === 0
                              ? "success"
                              : status === "partial"
                              ? "warning"
                              : "secondary";

                          return (
                            <tr key={row.id}>
                              <td className="text-muted">
                                {(fees.from ?? 1) + i}
                              </td>
                              <td className="fw-semibold">{feeType}</td>
                              <td>{formatMoney(row.total_amount)}</td>
                              <td>{formatMoney(row.amount_paid)}</td>
                              <td className={Number(row.balance) > 0 ? "text-danger fw-semibold" : ""}>
                                {formatMoney(row.balance)}
                              </td>
                              <td>
                                <span className={`badge text-bg-${statusBadge}`}>
                                  {Number(row.balance) === 0 ? "Paid" : row.status || "Pending"}
                                </span>
                              </td>
                              <td className="text-muted">{formatDate(row.updated_at || row.created_at)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {fees && fees.last_page > 1 && (
                  <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                    <div className="text-muted small">
                      Page <strong>{fees.current_page}</strong> of <strong>{fees.last_page}</strong>
                    </div>

                    <div className="btn-group">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        disabled={!fees.prev_page_url || fees.current_page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        <i className="bi bi-chevron-left"></i>
                      </button>

                      {Array.from({ length: fees.last_page })
                        .slice(
                          Math.max(0, fees.current_page - 3),
                          Math.min(fees.last_page, fees.current_page + 2)
                        )
                        .map((_, idx) => {
                          const pageNumber =
                            Math.max(1, fees.current_page - 2) + idx;

                          return (
                            <button
                              key={pageNumber}
                              className={`btn btn-sm ${
                                pageNumber === fees.current_page
                                  ? "btn-primary"
                                  : "btn-outline-primary"
                              }`}
                              onClick={() => setPage(pageNumber)}
                            >
                              {pageNumber}
                            </button>
                          );
                        })}

                      <button
                        className="btn btn-sm btn-outline-secondary"
                        disabled={!fees.next_page_url || fees.current_page >= fees.last_page}
                        onClick={() => setPage((p) => Math.min(fees.last_page, p + 1))}
                      >
                        <i className="bi bi-chevron-right"></i>
                      </button>
                    </div>
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