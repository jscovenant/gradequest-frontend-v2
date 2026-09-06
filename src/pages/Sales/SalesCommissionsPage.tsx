import { useEffect, useState } from "react";
import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import { useToast } from "../../contexts/ToastContext";
import "./SalesWorkspace.css";
import { commissionSourceLabel, commissionTierLabel, currency, fmtDate, salesApi } from "./salesApi";
import type { SalesCommission } from "./salesApi";

const statuses = ["", "pending", "approved", "paid", "void"];

export default function SalesCommissionsPage() {
  const { showError } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [summary, setSummary] = useState({ pending: 0, approved: 0, paid: 0 });
  const [commissions, setCommissions] = useState<SalesCommission[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await salesApi.commissions({ status: status || undefined, per_page: 100 });
      setSummary(data.summary || { pending: 0, approved: 0, paid: 0 });
      setCommissions(data.commissions?.data || []);
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to load commissions.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return <><TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="My Commissions" />
    <div className="container-fluid"><div className="row"><Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <main className="col-md-9 col-lg-10 ms-auto db-main sales-work-main">{loading && <Loader message="Loading commissions..." />}<div className="sales-work-shell">
        <section className="sales-work-hero"><div><div className="sales-work-eyebrow"><i className="bi bi-cash-coin" /> Earnings & Lifecycle</div><h1>My Commissions</h1><p>Track earnings across GradiosEdu Offline Term Invoices, Core Online Fees, and Plus Subscriptions. Earn up to 30% upfront Term 1 Bounty and 12% Terms 2–3 Retention.</p></div><div className="sales-work-actions"><button className="sales-work-btn sales-work-btn-light" onClick={load}><i className="bi bi-arrow-repeat" /> Refresh</button></div></section>
        <section className="sales-work-grid"><article className="sales-work-card"><span className="sales-work-icon"><i className="bi bi-hourglass-split" /></span><div><p>Pending</p><h3>{currency.format(summary.pending)}</h3><small>Awaiting policy review</small></div></article><article className="sales-work-card"><span className="sales-work-icon"><i className="bi bi-check-circle" /></span><div><p>Approved</p><h3>{currency.format(summary.approved)}</h3><small>Ready for payout</small></div></article><article className="sales-work-card"><span className="sales-work-icon"><i className="bi bi-wallet2" /></span><div><p>Paid</p><h3>{currency.format(summary.paid)}</h3><small>Completed payouts</small></div></article><article className="sales-work-card"><span className="sales-work-icon"><i className="bi bi-percent" /></span><div><p>Total</p><h3>{currency.format(summary.pending + summary.approved + summary.paid)}</h3><small>All lifetime commissions</small></div></article></section>
        <section className="sales-work-panel"><div className="sales-work-head"><div><h2>Commission History</h2><p>Filter commission records by approval and payout status.</p></div><div className="sales-work-actions"><select className="sales-work-search" value={status} onChange={(e) => setStatus(e.target.value)}>{statuses.map((s) => <option key={s} value={s}>{s || "All statuses"}</option>)}</select><button className="sales-work-btn sales-work-btn-primary" onClick={load}>Apply</button></div></div><div className="sales-work-table-wrap"><table className="sales-work-table"><thead><tr><th>School & Source</th><th>Tier & Cycle</th><th>Status</th><th>Base Amount</th><th>Rate</th><th>Commission</th><th>Earned</th><th>Paid</th></tr></thead><tbody>{commissions.map((item) => <tr key={item.id}><td><div><strong>{item.school?.school_name || item.school?.name || "School not linked"}</strong><br /><small className="text-muted">{commissionSourceLabel(item.source)}</small></div></td><td><span className="sales-work-pill sales-work-blue">{commissionTierLabel(item.term_number)}</span></td><td><span className={`sales-work-pill ${item.status === "paid" ? "sales-work-green" : item.status === "approved" ? "sales-work-blue" : item.status === "void" ? "sales-work-red" : "sales-work-gold"}`}>{item.status}</span></td><td>{currency.format(Number(item.commissionable_amount || 0))}</td><td><strong>{Number(item.commission_rate || 0)}%</strong></td><td><strong style={{ color: "#0f766e" }}>{currency.format(Number(item.amount || 0))}</strong></td><td>{fmtDate(item.earned_at)}</td><td>{fmtDate(item.paid_at)}</td></tr>)}</tbody></table>{!loading && commissions.length === 0 && <div className="sales-work-empty">No commission record found.</div>}</div></section><Footer /></div></main>
    </div></div></>;
}
