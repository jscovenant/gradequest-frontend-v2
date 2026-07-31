import { FormEvent, useEffect, useState } from "react";
import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import { useToast } from "../../contexts/ToastContext";
import "./SalesWorkspace.css";
import { currency, fmtDate, leadContact, leadTitle, salesApi } from "./salesApi";
import type { SalesLead } from "./salesApi";

const stages = ["", "lead", "contacted", "demo_booked", "proposal_sent", "follow_up", "converted", "lost"];

const emptyLeadForm = {
  prospect_school_name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  location: "",
  expected_students: "",
  pipeline_value: "",
  expected_close_date: "",
  notes: "",
};

export default function SalesLeadsPage() {
  const { showSuccess, showError } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [form, setForm] = useState(emptyLeadForm);

  const load = async () => {
    setLoading(true);
    try {
      const data = await salesApi.leads({ search: search.trim() || undefined, stage: stage || undefined, per_page: 100 });
      setLeads(data.leads?.data || []);
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to load leads.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submitLead = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        expected_students: form.expected_students ? Number(form.expected_students) : undefined,
        pipeline_value: form.pipeline_value ? Number(form.pipeline_value) : undefined,
      };
      const res = await salesApi.createLead(payload);
      showSuccess?.(res.message || "Lead registered successfully.");
      setForm(emptyLeadForm);
      setShowForm(false);
      await load();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to register lead.");
    } finally {
      setSaving(false);
    }
  };

  return <><TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="My Leads" />
    <div className="container-fluid"><div className="row"><Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <main className="col-md-9 col-lg-10 ms-auto db-main sales-work-main">{loading && <Loader message="Loading leads..." />}<div className="sales-work-shell">
        <section className="sales-work-hero"><div><div className="sales-work-eyebrow"><i className="bi bi-kanban" /> Pipeline</div><h1>My Leads</h1><p>Register school prospects, follow up with decision makers, and track each opportunity until the school becomes a paying customer.</p></div><div className="sales-work-actions"><button className="sales-work-btn sales-work-btn-light" onClick={load}><i className="bi bi-arrow-repeat" /> Refresh</button><button className="sales-work-btn sales-work-btn-primary" onClick={() => setShowForm((value) => !value)}><i className="bi bi-plus-circle" /> Register Lead</button></div></section>
        <section className="sales-work-panel"><div className="sales-work-head"><div><h2>Lead Pipeline</h2><p>Filter by school, contact, source, or stage.</p></div><div className="sales-work-actions"><input className="sales-work-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads..." /><select className="sales-work-search" value={stage} onChange={(e) => setStage(e.target.value)}>{stages.map((s) => <option key={s} value={s}>{s || "All stages"}</option>)}</select><button className="sales-work-btn sales-work-btn-primary" onClick={load}>Apply</button></div></div>
          {showForm && <form className="sales-work-form" onSubmit={submitLead}><label>School Name<input value={form.prospect_school_name} onChange={(e) => setForm({ ...form, prospect_school_name: e.target.value })} required /></label><label>Contact Person<input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></label><label>Email<input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></label><label>Phone<input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></label><label>Location<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label><label>Expected Students<input type="number" min="0" value={form.expected_students} onChange={(e) => setForm({ ...form, expected_students: e.target.value })} /></label><label>Pipeline Value<input type="number" min="0" value={form.pipeline_value} onChange={(e) => setForm({ ...form, pipeline_value: e.target.value })} /></label><label>Expected Close Date<input type="date" value={form.expected_close_date} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} /></label><label className="sales-work-form-wide">Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label><div className="sales-work-form-actions"><button className="sales-work-btn sales-work-btn-light" type="button" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button><button className="sales-work-btn sales-work-btn-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Lead"}</button></div></form>}
          <div className="sales-work-list">{!loading && leads.length === 0 && <div className="sales-work-empty">No lead found.</div>}{leads.map((lead) => <article className="sales-work-row" key={lead.id}><div><h3>{leadTitle(lead)}</h3><p>{leadContact(lead)}</p><div className="sales-work-meta"><span className="sales-work-pill sales-work-blue">{lead.stage}</span><span className="sales-work-pill">Source: {lead.source}</span><span className="sales-work-pill">Value: {currency.format(Number(lead.pipeline_value || 0))}</span><span className="sales-work-pill">Expected close: {fmtDate(lead.expected_close_date)}</span>{lead.location && <span className="sales-work-pill">Location: {lead.location}</span>}{lead.expected_students != null && <span className="sales-work-pill">Students: {lead.expected_students}</span>}</div>{lead.contact_email && <p>{lead.contact_email}</p>}{lead.contact_phone && <p>{lead.contact_phone}</p>}{lead.notes && <p>{lead.notes}</p>}</div><span className={`sales-work-pill ${lead.stage === "converted" ? "sales-work-green" : lead.stage === "lost" ? "sales-work-red" : "sales-work-gold"}`}>{lead.stage}</span></article>)}</div>
        </section><Footer /></div></main>
    </div></div></>;
}
