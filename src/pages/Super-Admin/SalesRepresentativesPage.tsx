import { FormEvent, useEffect, useMemo, useState } from "react";

import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import PageTitle from "../../components/PageTitle";
import { useToast } from "../../contexts/ToastContext";
import { authApi } from "../../utils/axios";

type SalesSummary = {
  total_representatives: number;
  active_representatives: number;
  assigned_leads: number;
  converted_leads: number;
  pipeline_value: number;
  pending_commission: number;
  approved_commission: number;
  paid_commission: number;
};

type SalesRepresentative = {
  id: number;
  code: string;
  name: string;
  firstname?: string | null;
  surname?: string | null;
  email?: string | null;
  phone?: string | null;
  region?: string | null;
  status: string;
  status_reason?: string | null;
  status_changed_at?: string | null;
  commission_rate: number;
  monthly_target_amount: number;
  monthly_target_schools: number;
  joined_at?: string | null;
  next_of_kin_name?: string | null;
  next_of_kin_phone?: string | null;
  next_of_kin_relationship?: string | null;
  final_settlement_status?: string | null;
  assigned_leads: number;
  converted_leads: number;
  pipeline_value: number;
  commission_pending: number;
  commission_paid: number;
  last_activity?: string | null;
};

type SalesForm = {
  firstname: string;
  surname: string;
  email: string;
  phone: string;
  region: string;
  commission_rate: string;
  monthly_target_amount: string;
  monthly_target_schools: string;
  next_of_kin_name: string;
  next_of_kin_phone: string;
  next_of_kin_relationship: string;
  send_login_email: boolean;
};

type StatusForm = {
  status: string;
  status_reason: string;
  final_settlement_status: string;
};

type LoginDetails = {
  login_url: string;
  email: string;
  sales_code: string;
  temporary_password?: string;
  email_error?: string | null;
};

const defaultSummary: SalesSummary = {
  total_representatives: 0,
  active_representatives: 0,
  assigned_leads: 0,
  converted_leads: 0,
  pipeline_value: 0,
  pending_commission: 0,
  approved_commission: 0,
  paid_commission: 0,
};

const emptyForm: SalesForm = {
  firstname: "",
  surname: "",
  email: "",
  phone: "",
  region: "",
  commission_rate: "5",
  monthly_target_amount: "0",
  monthly_target_schools: "0",
  next_of_kin_name: "",
  next_of_kin_phone: "",
  next_of_kin_relationship: "",
  send_login_email: true,
};

const currency = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

function fmtDate(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function initials(name?: string | null) {
  return (name || "Sales Rep").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function statusClass(status?: string) {
  const normalized = (status || "").toLowerCase();
  if (normalized === "active") return "sr-badge sr-badge--ok";
  if (["paused", "under_review"].includes(normalized)) return "sr-badge sr-badge--warn";
  if (["suspended", "terminated", "closed", "deceased"].includes(normalized)) return "sr-badge sr-badge--danger";
  return "sr-badge sr-badge--muted";
}

function StatCard({ title, value, hint, icon }: { title: string; value: string | number; hint: string; icon: string }) {
  return <article className="sr-stat"><span><i className={`bi bi-${icon}`} /></span><div><p>{title}</p><strong>{value}</strong><small>{hint}</small></div></article>;
}

export default function SalesRepresentativesPage() {
  const { showSuccess, showError } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [summary, setSummary] = useState<SalesSummary>(defaultSummary);
  const [representatives, setRepresentatives] = useState<SalesRepresentative[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<SalesForm>(emptyForm);
  const [statusForm, setStatusForm] = useState<StatusForm>({ status: "active", status_reason: "", final_settlement_status: "pending_review" });
  const [loginDetails, setLoginDetails] = useState<LoginDetails | null>(null);
  const [sendingLoginId, setSendingLoginId] = useState<number | null>(null);

  const loadRepresentatives = async () => {
    setLoading(true);
    try {
      const res = await authApi.get("/superadmin/sales-representatives", { params: { search: query.trim() || undefined, per_page: 80 } });
      const reps = res.data?.representatives?.data || [];
      setSummary(res.data?.summary || defaultSummary);
      setRepresentatives(reps);
      setSelectedId((current) => current || reps[0]?.id || null);
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to load sales representatives.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRepresentatives(); }, []);

  const filteredRepresentatives = useMemo(() => {
    const term = query.trim().toLowerCase();
    return representatives.filter((rep) => {
      const matchesSearch = !term || [rep.name, rep.email || "", rep.phone || "", rep.region || "", rep.status, rep.code].some((value) => value.toLowerCase().includes(term));
      const matchesStatus = statusFilter === "all" || rep.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [query, representatives, statusFilter]);

  const selectedRep = useMemo(() => representatives.find((rep) => rep.id === selectedId) || filteredRepresentatives[0], [representatives, filteredRepresentatives, selectedId]);

  useEffect(() => {
    if (!selectedRep) return;
    setStatusForm({
      status: selectedRep.status || "active",
      status_reason: "",
      final_settlement_status: selectedRep.final_settlement_status || "pending_review",
    });
  }, [selectedRep?.id]);

  const submitRepresentative = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        commission_rate: Number(form.commission_rate || 0),
        monthly_target_amount: Number(form.monthly_target_amount || 0),
        monthly_target_schools: Number(form.monthly_target_schools || 0),
      };
      const res = await authApi.post("/superadmin/sales-representatives", payload);
      showSuccess?.(res.data?.message || "Sales representative created successfully.");
      setLoginDetails(res.data?.login_details || null);
      setForm(emptyForm);
      setShowForm(false);
      await loadRepresentatives();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to create sales representative.");
    } finally {
      setSaving(false);
    }
  };

  const sendLoginDetails = async (rep: SalesRepresentative) => {
    setSendingLoginId(rep.id);
    try {
      const res = await authApi.post(`/superadmin/sales-representatives/${rep.id}/send-login`);
      showSuccess?.(res.data?.message || "Login details emailed successfully.");
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to send login details.");
    } finally {
      setSendingLoginId(null);
    }
  };

  const updateStatus = async () => {
    if (!selectedRep) return;
    if (statusForm.status !== "active" && !statusForm.status_reason.trim()) {
      showError?.("Please enter a reason before restricting this representative.");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        firstname: selectedRep.firstname || selectedRep.name.split(" ")[0] || "Sales",
        surname: selectedRep.surname || "",
        email: selectedRep.email || "",
        phone: selectedRep.phone || "",
        region: selectedRep.region || "",
        status: statusForm.status,
        status_reason: statusForm.status_reason,
        final_settlement_status: statusForm.final_settlement_status,
        commission_rate: selectedRep.commission_rate,
        monthly_target_amount: selectedRep.monthly_target_amount,
        monthly_target_schools: selectedRep.monthly_target_schools,
        next_of_kin_name: selectedRep.next_of_kin_name || undefined,
        next_of_kin_phone: selectedRep.next_of_kin_phone || undefined,
        next_of_kin_relationship: selectedRep.next_of_kin_relationship || undefined,
      };
      if (statusForm.status === "deceased") payload.death_reported_at = new Date().toISOString().slice(0, 10);
      if (statusForm.status === "closed") payload.closure_requested_at = new Date().toISOString().slice(0, 10);
      const res = await authApi.put(`/superadmin/sales-representatives/${selectedRep.id}`, payload);
      showSuccess?.(res.data?.message || "Representative account updated.");
      await loadRepresentatives();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Could not update representative status.");
    } finally {
      setSaving(false);
    }
  };

  return <>
    <style>{`
      .sr-main { min-height: 100vh; background: #f6f8fb; color: #0f172a; overflow-x: hidden; }
      .sr-shell { max-width: 1420px; margin: 0 auto; }
      .sr-header { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; margin-bottom:18px; }
      .sr-kicker { display:inline-flex; align-items:center; gap:8px; color:#0f766e; font-size:12px; font-weight:900; text-transform:uppercase; letter-spacing:.08em; }
      .sr-title { margin:7px 0 5px; font-size:clamp(25px,3vw,36px); font-weight:900; letter-spacing:0; }
      .sr-copy { margin:0; color:#64748b; max-width:760px; line-height:1.6; }
      .sr-actions { display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end; }
      .sr-btn { border:0; border-radius:10px; padding:10px 14px; min-height:42px; display:inline-flex; align-items:center; justify-content:center; gap:8px; font-weight:850; white-space:nowrap; }
      .sr-btn-primary { background:#0f766e; color:white; }
      .sr-btn-gold { background:#facc15; color:#111827; }
      .sr-btn-soft { background:#eaf3ff; color:#1d4ed8; }
      .sr-btn-muted { background:#f1f5f9; color:#334155; }
      .sr-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; margin-bottom:18px; }
      .sr-stat, .sr-panel, .sr-detail { background:#fff; border:1px solid #e5e7eb; border-radius:14px; box-shadow:0 12px 30px rgba(15,23,42,.05); }
      .sr-stat { padding:16px; display:flex; gap:12px; min-width:0; }
      .sr-stat span { width:42px; height:42px; border-radius:12px; display:inline-flex; align-items:center; justify-content:center; background:#ecfeff; color:#0f766e; font-size:19px; flex:0 0 auto; }
      .sr-stat p { margin:0; color:#64748b; font-weight:800; font-size:12px; }
      .sr-stat strong { display:block; margin:4px 0 1px; font-size:21px; font-weight:950; overflow-wrap:anywhere; }
      .sr-stat small { color:#94a3b8; }
      .sr-layout { display:grid; grid-template-columns:minmax(0,1.45fr) minmax(360px,.75fr); gap:18px; align-items:start; }
      .sr-panel { overflow:hidden; }
      .sr-toolbar { padding:16px; display:flex; align-items:center; justify-content:space-between; gap:12px; border-bottom:1px solid #edf2f7; flex-wrap:wrap; }
      .sr-toolbar h2 { margin:0; font-size:18px; font-weight:950; }
      .sr-filters { display:flex; gap:9px; flex-wrap:wrap; }
      .sr-input, .sr-select { border:1px solid #dbe3ef; border-radius:10px; min-height:40px; padding:9px 11px; background:#fff; outline:0; min-width:0; }
      .sr-list { display:grid; }
      .sr-row { width:100%; border:0; background:#fff; display:grid; grid-template-columns:minmax(220px,1.2fr) repeat(4,minmax(105px,.65fr)); gap:12px; align-items:center; padding:15px 16px; text-align:left; border-bottom:1px solid #edf2f7; }
      .sr-row:hover, .sr-row--active { background:#f8fafc; }
      .sr-person { display:flex; align-items:center; gap:12px; min-width:0; }
      .sr-avatar { width:42px; height:42px; border-radius:12px; background:#0f766e; color:#fff; display:inline-flex; align-items:center; justify-content:center; font-weight:950; flex:0 0 auto; }
      .sr-person strong, .sr-metric strong { display:block; overflow-wrap:anywhere; }
      .sr-person small, .sr-metric span { display:block; color:#64748b; font-size:12px; margin-top:3px; }
      .sr-badge { display:inline-flex; align-items:center; justify-content:center; width:max-content; max-width:100%; border-radius:999px; padding:6px 9px; font-size:12px; font-weight:900; text-transform:capitalize; }
      .sr-badge--ok { background:#dcfce7; color:#166534; }
      .sr-badge--warn { background:#fef3c7; color:#92400e; }
      .sr-badge--danger { background:#fee2e2; color:#991b1b; }
      .sr-badge--muted { background:#e5e7eb; color:#475569; }
      .sr-detail { padding:0; overflow:hidden; position:sticky; top:88px; }
      .sr-detail-head { padding:18px; background:linear-gradient(135deg,#0f172a,#0f766e); color:#fff; }
      .sr-detail-head h2 { margin:9px 0 4px; font-size:22px; font-weight:950; overflow-wrap:anywhere; }
      .sr-detail-head p { margin:0; color:rgba(255,255,255,.75); overflow-wrap:anywhere; }
      .sr-detail-body { padding:16px; display:grid; gap:16px; }
      .sr-section { border:1px solid #edf2f7; border-radius:12px; padding:13px; background:#fff; }
      .sr-section h3 { margin:0 0 10px; font-size:14px; font-weight:950; }
      .sr-info-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
      .sr-info { padding:10px; background:#f8fafc; border-radius:10px; min-width:0; }
      .sr-info span { display:block; color:#64748b; font-size:11px; font-weight:900; text-transform:uppercase; }
      .sr-info strong { display:block; margin-top:4px; overflow-wrap:anywhere; }
      .sr-form-grid { display:grid; gap:10px; }
      .sr-form-grid label { display:grid; gap:6px; color:#334155; font-size:12px; font-weight:850; }
      .sr-form-grid input, .sr-form-grid select { border:1px solid #dbe3ef; border-radius:10px; min-height:40px; padding:9px 11px; background:#fff; outline:0; min-width:0; }
      .sr-create { padding:16px; border-bottom:1px solid #edf2f7; background:#f8fafc; }
      .sr-create-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:11px; }
      .sr-create-grid label { display:grid; gap:6px; color:#334155; font-size:12px; font-weight:850; }
      .sr-create-grid input { border:1px solid #dbe3ef; border-radius:10px; min-height:40px; padding:9px 11px; background:#fff; min-width:0; }
      .sr-note { grid-column:1/-1; border-radius:10px; background:#fffbeb; color:#92400e; padding:10px 12px; font-size:13px; font-weight:750; }
      .sr-create-actions { grid-column:1/-1; display:flex; justify-content:flex-end; gap:9px; flex-wrap:wrap; }
      .sr-login { margin-bottom:12px; padding:13px; border:1px solid #bbf7d0; background:#f0fdf4; border-radius:12px; color:#14532d; }
      .sr-login-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin-top:8px; }
      .sr-login-item { background:rgba(255,255,255,.8); border-radius:9px; padding:9px; overflow-wrap:anywhere; }
      .sr-empty { padding:30px; text-align:center; color:#64748b; }
      @media(max-width:1199px){.sr-stats{grid-template-columns:repeat(2,minmax(0,1fr));}.sr-layout{grid-template-columns:1fr;}.sr-detail{position:static;}.sr-create-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
      @media(max-width:850px){.sr-row{grid-template-columns:1fr 1fr;}.sr-header{flex-direction:column;}.sr-actions{justify-content:flex-start;}.sr-filters{width:100%;}.sr-input,.sr-select{width:100%;}}
      @media(max-width:560px){.sr-stats,.sr-row,.sr-info-grid,.sr-create-grid,.sr-login-grid{grid-template-columns:1fr;}.sr-main{padding-left:0!important;}}
    `}</style>

    <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Sales Representatives" />
    <PageTitle title="Sales Representatives" />
    <div className="container-fluid"><div className="row"><Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <main className="col-md-9 col-lg-10 ms-auto db-main sa-main sr-main py-4 px-md-4">
        {loading && <Loader message="Loading sales representatives..." />}
        <div className="sr-shell">
          <section className="sr-header"><div><span className="sr-kicker"><i className="bi bi-person-workspace" /> Sales operations</span><h1 className="sr-title">Sales Representatives</h1><p className="sr-copy">Manage representative profiles, account restrictions, next-of-kin records, commission risk, and final settlement from one clean workspace.</p></div><div className="sr-actions"><button className="sr-btn sr-btn-muted" onClick={loadRepresentatives} disabled={loading}><i className="bi bi-arrow-repeat" /> Refresh</button><button className="sr-btn sr-btn-gold" onClick={() => setShowForm((value) => !value)}><i className="bi bi-plus-circle" /> Add Representative</button></div></section>
          <section className="sr-stats"><StatCard title="Representatives" value={summary.total_representatives} hint={`${summary.active_representatives} active`} icon="people" /><StatCard title="Assigned Leads" value={summary.assigned_leads} hint={`${summary.converted_leads} converted`} icon="building" /><StatCard title="Pipeline Value" value={currency.format(summary.pipeline_value)} hint="Open opportunity" icon="graph-up-arrow" /><StatCard title="Pending Commission" value={currency.format(summary.pending_commission)} hint={`${currency.format(summary.paid_commission)} paid`} icon="cash-coin" /></section>
          <section className="sr-layout"><div className="sr-panel"><div className="sr-toolbar"><div><h2>Representative Directory</h2><p className="sr-copy">Select a representative to manage their account.</p></div><div className="sr-filters"><input className="sr-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, code, region..." /><select className="sr-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="under_review">Under review</option><option value="terminated">Terminated</option><option value="closed">Closed</option><option value="deceased">Deceased</option></select></div></div>
            {loginDetails && <div className="sr-login"><strong>Login details generated</strong><div className="sr-login-grid"><div className="sr-login-item"><small>Login URL</small><br />{loginDetails.login_url}</div><div className="sr-login-item"><small>Email</small><br />{loginDetails.email}</div><div className="sr-login-item"><small>Sales Code</small><br />{loginDetails.sales_code}</div><div className="sr-login-item"><small>Temporary Password</small><br />{loginDetails.temporary_password || "Sent by email"}</div></div>{loginDetails.email_error && <p style={{ margin: "10px 0 0", color: "#991b1b" }}>Email not sent: {loginDetails.email_error}</p>}</div>}
            {showForm && <form className="sr-create" onSubmit={submitRepresentative}><div className="sr-create-grid"><label>First Name<input value={form.firstname} onChange={(e) => setForm({ ...form, firstname: e.target.value })} required /></label><label>Surname<input value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} /></label><label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label><label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label>Region<input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></label><label>Commission %<input type="number" min="0" max="100" step="0.01" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} /></label><label>Monthly Target Amount<input type="number" min="0" value={form.monthly_target_amount} onChange={(e) => setForm({ ...form, monthly_target_amount: e.target.value })} /></label><label>Monthly Target Schools<input type="number" min="0" value={form.monthly_target_schools} onChange={(e) => setForm({ ...form, monthly_target_schools: e.target.value })} /></label><div className="sr-note">Next-of-kin details are recommended before payout eligibility and final settlement handling.</div><label>Next of Kin Name<input value={form.next_of_kin_name} onChange={(e) => setForm({ ...form, next_of_kin_name: e.target.value })} /></label><label>Next of Kin Phone<input value={form.next_of_kin_phone} onChange={(e) => setForm({ ...form, next_of_kin_phone: e.target.value })} /></label><label>Relationship<input value={form.next_of_kin_relationship} onChange={(e) => setForm({ ...form, next_of_kin_relationship: e.target.value })} /></label><label style={{ display: "flex", alignItems: "center", gap: 9 }}><input type="checkbox" checked={form.send_login_email} onChange={(e) => setForm({ ...form, send_login_email: e.target.checked })} style={{ width: 18, minHeight: 18 }} /> Send login email</label><div className="sr-create-actions"><button className="sr-btn sr-btn-muted" type="button" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button><button className="sr-btn sr-btn-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Representative"}</button></div></div></form>}
            <div className="sr-list">{!loading && filteredRepresentatives.length === 0 && <div className="sr-empty">No representative found.</div>}{filteredRepresentatives.map((rep) => <button type="button" key={rep.id} className={`sr-row ${selectedRep?.id === rep.id ? "sr-row--active" : ""}`} onClick={() => setSelectedId(rep.id)}><div className="sr-person"><div className="sr-avatar">{initials(rep.name)}</div><div><strong>{rep.name || "Unnamed Representative"}</strong><small>{rep.email || "No email"} - {rep.code}</small></div></div><div><span className={statusClass(rep.status)}>{rep.status}</span></div><div className="sr-metric"><strong>{rep.assigned_leads}</strong><span>Leads</span></div><div className="sr-metric"><strong>{currency.format(rep.pipeline_value)}</strong><span>Pipeline</span></div><div className="sr-metric"><strong>{currency.format(rep.commission_pending)}</strong><span>Pending</span></div></button>)}</div></div>
            <aside className="sr-detail">{selectedRep ? <><div className="sr-detail-head"><span className={statusClass(selectedRep.status)}>{selectedRep.status}</span><h2>{selectedRep.name}</h2><p>{selectedRep.email || "No email"} - {selectedRep.code}</p></div><div className="sr-detail-body"><section className="sr-section"><h3>Profile</h3><div className="sr-info-grid"><div className="sr-info"><span>Phone</span><strong>{selectedRep.phone || "Not set"}</strong></div><div className="sr-info"><span>Region</span><strong>{selectedRep.region || "Not set"}</strong></div><div className="sr-info"><span>Joined</span><strong>{fmtDate(selectedRep.joined_at)}</strong></div><div className="sr-info"><span>Commission</span><strong>{selectedRep.commission_rate}%</strong></div></div></section><section className="sr-section"><h3>Next Of Kin</h3><div className="sr-info-grid"><div className="sr-info"><span>Name</span><strong>{selectedRep.next_of_kin_name || "Missing"}</strong></div><div className="sr-info"><span>Phone</span><strong>{selectedRep.next_of_kin_phone || "Missing"}</strong></div><div className="sr-info"><span>Relationship</span><strong>{selectedRep.next_of_kin_relationship || "Not set"}</strong></div><div className="sr-info"><span>Status</span><strong>{selectedRep.next_of_kin_name && selectedRep.next_of_kin_phone ? "Complete" : "Incomplete"}</strong></div></div></section><section className="sr-section"><h3>Account Action</h3><div className="sr-form-grid"><label>Status<select value={statusForm.status} onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}><option value="active">Active</option><option value="suspended">Suspended</option><option value="under_review">Under review</option><option value="terminated">Terminated</option><option value="closed">Closed</option><option value="deceased">Deceased</option></select></label><label>Reason<input value={statusForm.status_reason} onChange={(e) => setStatusForm({ ...statusForm, status_reason: e.target.value })} placeholder="Required for restrictions" /></label><label>Settlement<select value={statusForm.final_settlement_status} onChange={(e) => setStatusForm({ ...statusForm, final_settlement_status: e.target.value })}><option value="pending_review">Pending review</option><option value="approved">Approved</option><option value="paid">Paid</option><option value="forfeited">Forfeited</option><option value="not_applicable">Not applicable</option></select></label><button className="sr-btn sr-btn-primary" type="button" disabled={saving} onClick={updateStatus}><i className="bi bi-shield-check" /> Apply Account Decision</button></div></section><section className="sr-section"><h3>Commission Snapshot</h3><div className="sr-info-grid"><div className="sr-info"><span>Pending</span><strong>{currency.format(selectedRep.commission_pending)}</strong></div><div className="sr-info"><span>Paid</span><strong>{currency.format(selectedRep.commission_paid)}</strong></div><div className="sr-info"><span>Leads</span><strong>{selectedRep.assigned_leads}</strong></div><div className="sr-info"><span>Converted</span><strong>{selectedRep.converted_leads}</strong></div></div><button className="sr-btn sr-btn-soft mt-3" type="button" onClick={() => sendLoginDetails(selectedRep)} disabled={sendingLoginId === selectedRep.id}><i className="bi bi-envelope" /> {sendingLoginId === selectedRep.id ? "Sending..." : "Send Login Details"}</button></section></div></> : <div className="sr-empty">Select a representative to view details.</div>}</aside>
          </section><Footer /></div></main></div></div>
  </>;
}
