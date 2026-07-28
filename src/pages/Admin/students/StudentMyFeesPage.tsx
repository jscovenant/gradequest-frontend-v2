import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../../utils/axios";

import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";

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
  fee_type?: FeeType | null;
  feeType?: FeeType | null;
};

type Pagination<T> = {
  current_page: number;
  data: T[];
  from?: number | null;
  last_page: number;
  next_page_url: string | null;
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

function formatMoney(value: any) {
  const amount = Number(value ?? 0);
  if (Number.isNaN(amount)) return "NGN 0";
  return amount.toLocaleString("en-NG", { style: "currency", currency: "NGN" });
}

function formatDate(value: any) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function StudentMyFeesPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [studentName, setStudentName] = useState("");
  const [regNo, setRegNo] = useState("");
  const [summary, setSummary] = useState<MyFeesResponse["summary"]>({
    total_fees: 0,
    total_paid: 0,
    balance: 0,
    last_payment_date: null,
  });
  const [fees, setFees] = useState<Pagination<FeeRow> | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setErrorMsg("");

    authApi
      .get<MyFeesResponse>("/student/my-fees", { params: { page } })
      .then((res) => {
        if (!mounted) return;
        setStudentName(res.data.student?.name ?? "");
        setRegNo(res.data.student?.reg_no ?? "");
        setSummary(res.data.summary);
        setFees(res.data.fees);
      })
      .catch((err) => {
        if (!mounted) return;
        setErrorMsg(err?.response?.data?.message || "Failed to load fee records.");
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [page]);

  const paidPercent = useMemo(() => {
    if (!summary.total_fees) return 0;
    return Math.min(100, Math.round((Number(summary.total_paid) / Number(summary.total_fees)) * 100));
  }, [summary.total_fees, summary.total_paid]);

  const statusText = Number(summary.balance) <= 0 ? "Paid" : Number(summary.total_paid) > 0 ? "Part payment" : "Pending";

  return (
    <>
      <style>{`
        .sf-hero{background:linear-gradient(135deg,var(--gq-dark,#050008),#180820);border-radius:14px;padding:26px;position:relative;overflow:hidden;color:#fff;box-shadow:0 18px 42px rgba(5,0,8,.12);margin-bottom:18px}
        .sf-hero:before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,.045) 1px,transparent 1px);background-size:22px 22px}
        .sf-hero-inner{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:20px;align-items:center}
        .sf-pill-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}.sf-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);font-size:11.5px;color:rgba(255,255,255,.78)}
        .sf-title{font-size:clamp(24px,3vw,34px);font-weight:900;letter-spacing:0;margin:0 0 8px}.sf-title span{color:var(--gq-secondary,#ffc857)}
        .sf-sub{font-size:13.5px;color:rgba(255,255,255,.64);line-height:1.65;max-width:650px;margin:0}
        .sf-panel{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:18px}.sf-panel-label{font-size:11.5px;color:rgba(255,255,255,.5);margin-bottom:5px}.sf-panel-balance{font-size:26px;font-weight:900;color:var(--gq-secondary,#ffc857);line-height:1}.sf-panel-meta{font-size:12px;color:rgba(255,255,255,.62);margin-top:8px}
        .sf-progress{height:9px;border-radius:999px;background:rgba(255,255,255,.13);overflow:hidden;margin-top:16px}.sf-progress-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--gq-secondary,#ffc857),var(--gq-primary,#d300b0))}
        .sf-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:18px}.sf-card{background:#fff;border:1px solid var(--gq-border,rgba(5,0,8,.09));border-radius:14px;box-shadow:0 10px 28px rgba(5,0,8,.045);min-width:0}.sf-stat{padding:16px}.sf-stat-icon{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;background:rgba(211,0,176,.08);color:var(--gq-primary,#d300b0)}.sf-stat-label{font-size:11.5px;color:#8a7d72;margin:0 0 5px}.sf-stat-value{font-size:clamp(16px,1.6vw,21px);font-weight:900;color:var(--gq-dark,#050008);margin:0;word-break:break-word}.sf-stat-sub{font-size:11.5px;color:#a3978d;margin-top:6px}
        .sf-card-pad{padding:18px}.sf-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.sf-card-title{font-size:15px;font-weight:900;color:var(--gq-dark,#050008);margin:0}.sf-card-sub{font-size:12px;color:#8a7d72;margin:2px 0 0}
        .sf-btn{border:0;border-radius:10px;padding:10px 15px;font-size:13px;font-weight:750;display:inline-flex;align-items:center;gap:8px;text-decoration:none;cursor:pointer}.sf-btn-gold{background:var(--gq-secondary,#ffc857);color:var(--gq-dark,#050008)}.sf-btn-soft{background:var(--gq-surface-soft,#fbf7f8);color:#5f5147;border:1px solid rgba(5,0,8,.08)}
        .sf-table-wrap{overflow:auto;border:1px solid rgba(5,0,8,.07);border-radius:12px}.sf-table{width:100%;border-collapse:separate;border-spacing:0;min-width:760px}.sf-table th{background:var(--gq-surface-soft,#fbf7f8);color:#74675e;font-size:11px;text-transform:uppercase;letter-spacing:.06em;padding:13px 14px;border-bottom:1px solid rgba(5,0,8,.07);white-space:nowrap}.sf-table td{padding:14px;border-bottom:1px solid rgba(5,0,8,.06);font-size:13px;color:var(--gq-dark,#050008);vertical-align:middle}.sf-table tr:last-child td{border-bottom:0}.sf-fee-name{font-weight:850}.sf-muted{color:#8a7d72}.sf-balance-due{color:#b91c1c;font-weight:850}.sf-badge{display:inline-flex;align-items:center;border-radius:999px;padding:5px 9px;font-size:11.5px;font-weight:850}.sf-badge.paid{background:rgba(34,197,94,.1);color:#15803d}.sf-badge.partial{background:rgba(245,158,11,.14);color:#92400e}.sf-badge.pending{background:#f1f5f9;color:#64748b}
        .sf-empty,.sf-error{border-radius:12px;padding:18px;font-size:13px}.sf-empty{border:1px dashed rgba(5,0,8,.14);background:var(--gq-surface-soft,#fbf7f8);color:#7a6a5a;text-align:center}.sf-error{background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.18);color:#b91c1c;margin-bottom:16px}
        .sf-pager{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:16px}.sf-page-group{display:flex;gap:6px}.sf-page-btn{width:36px;height:36px;border-radius:9px;border:1px solid rgba(5,0,8,.1);background:#fff;color:#5f5147}.sf-page-btn.active{background:var(--gq-primary,#d300b0);border-color:var(--gq-primary,#d300b0);color:#fff}.sf-page-btn:disabled{opacity:.45;cursor:not-allowed}
        @media(max-width:1199.98px){.sf-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sf-hero-inner{grid-template-columns:1fr}}
        @media(max-width:575.98px){.sf-hero{padding:20px}.sf-grid{grid-template-columns:1fr}.sf-panel{display:none}.sf-card-head{align-items:flex-start;flex-direction:column}.sf-btn{justify-content:center;width:100%}}
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="My Fees" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto gq-app-main d-flex flex-column">
            {loading && <Loader message="Loading your fees..." />}
            {errorMsg && <div className="sf-error"><i className="bi bi-exclamation-circle me-2" />{errorMsg}</div>}

            <section className="sf-hero">
              <div className="sf-hero-inner">
                <div>
                  <div className="sf-pill-row">
                    <span className="sf-pill"><i className="bi bi-person-badge" />{regNo || "Student"}</span>
                    <span className="sf-pill"><i className="bi bi-receipt" />{statusText}</span>
                  </div>
                  <h1 className="sf-title">{greeting()}, <span>{studentName || "Student"}.</span></h1>
                  <p className="sf-sub">Track school fees, payments, and outstanding balance in one clear place.</p>
                  <div className="sf-pill-row mt-3">
                    <button className="sf-btn sf-btn-gold" onClick={() => navigate("/dashboard")}><i className="bi bi-speedometer2" /> Dashboard</button>
                  </div>
                </div>

                <div className="sf-panel">
                  <div className="sf-panel-label">Outstanding Balance</div>
                  <div className="sf-panel-balance">{formatMoney(summary.balance)}</div>
                  <div className="sf-panel-meta">{paidPercent}% paid. Last payment: {formatDate(summary.last_payment_date)}</div>
                  <div className="sf-progress"><div className="sf-progress-fill" style={{ width: `${paidPercent}%` }} /></div>
                </div>
              </div>
            </section>

            <section className="sf-grid">
              {[
                { label: "Total Fees", value: formatMoney(summary.total_fees), sub: "All assigned fees", icon: "cash-coin" },
                { label: "Total Paid", value: formatMoney(summary.total_paid), sub: `${paidPercent}% completed`, icon: "check-circle" },
                { label: "Balance", value: formatMoney(summary.balance), sub: "Amount still unpaid", icon: "exclamation-triangle" },
                { label: "Last Payment", value: formatDate(summary.last_payment_date), sub: "Most recent update", icon: "calendar-check" },
              ].map((item) => (
                <div className="sf-card sf-stat" key={item.label}>
                  <div className="sf-stat-icon"><i className={`bi bi-${item.icon}`} /></div>
                  <p className="sf-stat-label">{item.label}</p>
                  <p className="sf-stat-value">{item.value}</p>
                  <div className="sf-stat-sub">{item.sub}</div>
                </div>
              ))}
            </section>

            <section className="sf-card sf-card-pad mb-4">
              <div className="sf-card-head">
                <div>
                  <h2 className="sf-card-title">Fee Records</h2>
                  <p className="sf-card-sub">Showing {fees?.from ?? 0} - {fees?.to ?? 0} of {fees?.total ?? 0} record{fees?.total === 1 ? "" : "s"}.</p>
                </div>
                <button className="sf-btn sf-btn-soft" onClick={() => setPage((value) => value)}>
                  <i className="bi bi-arrow-clockwise" /> Refresh
                </button>
              </div>

              <div className="sf-table-wrap">
                <table className="sf-table">
                  <thead>
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
                        <td colSpan={7}>
                          <div className="sf-empty">
                            <i className="bi bi-receipt fs-2 d-block mb-2" />
                            <strong>No fee records found</strong>
                            <div>Your fee records will appear here once the school creates them.</div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      fees.data.map((row, index) => {
                        const feeType = row.feeType?.name || row.fee_type?.name || "Fee";
                        const rowBalance = Number(row.balance || 0);
                        const paid = Number(row.amount_paid || 0);
                        const badgeClass = rowBalance <= 0 ? "paid" : paid > 0 ? "partial" : "pending";
                        const label = rowBalance <= 0 ? "Paid" : paid > 0 ? "Part payment" : row.status || "Pending";

                        return (
                          <tr key={row.id}>
                            <td className="sf-muted">{(fees.from ?? 1) + index}</td>
                            <td className="sf-fee-name">{feeType}</td>
                            <td>{formatMoney(row.total_amount)}</td>
                            <td>{formatMoney(row.amount_paid)}</td>
                            <td className={rowBalance > 0 ? "sf-balance-due" : ""}>{formatMoney(row.balance)}</td>
                            <td><span className={`sf-badge ${badgeClass}`}>{label}</span></td>
                            <td className="sf-muted">{formatDate(row.updated_at || row.created_at)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {fees && fees.last_page > 1 && (
                <div className="sf-pager">
                  <div className="sf-muted small">Page <strong>{fees.current_page}</strong> of <strong>{fees.last_page}</strong></div>
                  <div className="sf-page-group">
                    <button className="sf-page-btn" disabled={!fees.prev_page_url || fees.current_page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                      <i className="bi bi-chevron-left" />
                    </button>
                    {Array.from({ length: fees.last_page }).slice(Math.max(0, fees.current_page - 3), Math.min(fees.last_page, fees.current_page + 2)).map((_, index) => {
                      const pageNumber = Math.max(1, fees.current_page - 2) + index;
                      return (
                        <button key={pageNumber} className={`sf-page-btn ${pageNumber === fees.current_page ? "active" : ""}`} onClick={() => setPage(pageNumber)}>
                          {pageNumber}
                        </button>
                      );
                    })}
                    <button className="sf-page-btn" disabled={!fees.next_page_url || fees.current_page >= fees.last_page} onClick={() => setPage((value) => Math.min(fees.last_page, value + 1))}>
                      <i className="bi bi-chevron-right" />
                    </button>
                  </div>
                </div>
              )}
            </section>

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}
