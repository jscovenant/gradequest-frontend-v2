import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import { useToast } from "../../contexts/ToastContext";
import "./SalesWorkspace.css";
import { currency, fmtDate, leadContact, leadTitle, salesApi } from "./salesApi";
import type { SalesCommission, SalesLead, SalesMarketingMaterial, SalesRepresentative, SalesSummary } from "./salesApi";

const defaultSummary: SalesSummary = { assigned_leads: 0, converted_leads: 0, open_leads: 0, pipeline_value: 0, pending_commission: 0, approved_commission: 0, paid_commission: 0, monthly_target_amount: 0, monthly_target_schools: 0 };

function StatCard({ title, value, hint, icon }: { title: string; value: string | number; hint: string; icon: string }) {
  return <article className="sales-work-card"><span className="sales-work-icon"><i className={`bi bi-${icon}`} /></span><div><p>{title}</p><h3>{value}</h3><small>{hint}</small></div></article>;
}

export default function SalesDashboardPage() {
  const { showError } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rep, setRep] = useState<SalesRepresentative | null>(null);
  const [summary, setSummary] = useState<SalesSummary>(defaultSummary);
  const [recentLeads, setRecentLeads] = useState<SalesLead[]>([]);
  const [commissions, setCommissions] = useState<SalesCommission[]>([]);
  const [featuredMaterial, setFeaturedMaterial] = useState<SalesMarketingMaterial | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [data, kit] = await Promise.all([salesApi.workspace(), salesApi.materials()]);
      setRep(data.representative || null);
      setSummary(data.summary || defaultSummary);
      setRecentLeads(data.recent_leads || []);
      setCommissions(data.commissions || []);
      setFeaturedMaterial(kit.materials?.[0] || null);
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to load sales dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const targetProgress = summary.monthly_target_amount > 0 ? Math.min(100, Math.round((summary.pipeline_value / summary.monthly_target_amount) * 100)) : 0;

  return <>
    <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Sales Dashboard" />
    <div className="container-fluid"><div className="row"><Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <main className="col-md-9 col-lg-10 ms-auto db-main sales-work-main">{loading && <Loader message="Loading sales dashboard..." />}<div className="sales-work-shell">
        <section className="sales-work-hero"><div><div className="sales-work-eyebrow"><i className="bi bi-briefcase" /> Sales Workspace</div><h1>{rep?.name || "Sales Representative"}</h1><p>Manage your assigned schools, demo follow-ups, pipeline value, and commission progress from one focused dashboard.</p></div><div className="sales-work-actions"><Link className="sales-work-btn sales-work-btn-light" to="/sales/leads"><i className="bi bi-kanban" /> Leads</Link><Link className="sales-work-btn sales-work-btn-primary" to="/sales/marketing-kit"><i className="bi bi-megaphone" /> Marketing Kit</Link></div></section>
        {featuredMaterial && <section className="sales-work-panel" style={{display:"grid",gridTemplateColumns:featuredMaterial.asset_url ? "minmax(220px,360px) 1fr" : "1fr",gap:22,alignItems:"center"}}>{featuredMaterial.asset_url && featuredMaterial.type !== "copy" && (featuredMaterial.type === "video" ? <video controls src={featuredMaterial.asset_url} style={{width:"100%",maxHeight:210,borderRadius:14}} /> : <img src={featuredMaterial.asset_url} alt={featuredMaterial.title} style={{width:"100%",maxHeight:210,objectFit:"cover",borderRadius:14}} />)}<div><span className="sales-work-pill sales-work-gold">Featured campaign</span><h2 style={{marginTop:12}}>{featuredMaterial.title}</h2><p>{featuredMaterial.description}</p><Link className="sales-work-btn sales-work-btn-primary" to="/sales/marketing-kit">Share this campaign</Link></div></section>}
        <section className="sales-work-grid"><StatCard title="Open Leads" value={summary.open_leads} hint={`${summary.assigned_leads} assigned total`} icon="person-lines-fill" /><StatCard title="Converted" value={summary.converted_leads} hint="Schools won" icon="check2-circle" /><StatCard title="Pipeline" value={currency.format(summary.pipeline_value)} hint={`${targetProgress}% of target`} icon="graph-up-arrow" /><StatCard title="Pending Commission" value={currency.format(summary.pending_commission)} hint={`${currency.format(summary.paid_commission)} paid`} icon="wallet2" /></section>
        <section className="sales-work-content"><div className="sales-work-panel"><div className="sales-work-head"><div><h2>Recent Leads</h2><p>Your latest assigned prospects and follow-ups.</p></div><Link className="sales-work-btn sales-work-btn-primary" to="/sales/leads">View All</Link></div><div className="sales-work-list">{recentLeads.length === 0 && <div className="sales-work-empty">No assigned lead yet.</div>}{recentLeads.map((lead) => <article className="sales-work-row" key={lead.id}><div><h3>{leadTitle(lead)}</h3><p>{leadContact(lead)}</p><div className="sales-work-meta"><span className="sales-work-pill sales-work-blue">{lead.stage}</span><span className="sales-work-pill">{currency.format(Number(lead.pipeline_value || 0))}</span><span className="sales-work-pill">Close: {fmtDate(lead.expected_close_date)}</span></div></div><span className="sales-work-pill sales-work-gold">{lead.source}</span></article>)}</div></div><aside className="sales-work-panel"><div className="sales-work-head"><div><h2>Commission Snapshot</h2><p>Latest earnings status.</p></div></div><div className="sales-work-list">{commissions.length === 0 && <div className="sales-work-empty">No commission recorded yet.</div>}{commissions.map((item) => <article className="sales-work-row" key={item.id}><div><h3>{currency.format(Number(item.amount || 0))}</h3><p>{item.school?.name || "School not linked"}</p><div className="sales-work-meta"><span className="sales-work-pill sales-work-green">{item.status}</span><span className="sales-work-pill">Earned: {fmtDate(item.earned_at)}</span></div></div></article>)}</div></aside></section><Footer /></div></main>
    </div></div>
  </>;
}


