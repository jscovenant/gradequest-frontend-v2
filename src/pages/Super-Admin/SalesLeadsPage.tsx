import { FormEvent, useEffect, useMemo, useState } from "react";

import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import PageTitle from "../../components/PageTitle";
import { useToast } from "../../contexts/ToastContext";
import { authApi } from "../../utils/axios";
import type { SalesLead } from "../Sales/salesApi";
import { currency, fmtDate, leadContact, leadTitle } from "../Sales/salesApi";

type LeadSummary = {
  total: number;
  open: number;
  converted: number;
  lost: number;
  pipeline_value: number;
};

type ConvertForm = {
  school_name: string;
  address: string;
  admin_firstname: string;
  admin_surname: string;
  admin_email: string;
  admin_phone: string;
  password: string;
  send_login_email: boolean;
};

type LoginDetails = {
  login_url: string;
  email: string;
  reg_no: string;
  temporary_password?: string;
  email_sent?: boolean;
  email_error?: string | null;
};

const defaultSummary: LeadSummary = { total: 0, open: 0, converted: 0, lost: 0, pipeline_value: 0 };
const stages = ["lead", "contacted", "demo_booked", "proposal_sent", "follow_up", "converted", "lost"];

function stageLabel(stage?: string) {
  return (stage || "lead").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stageClass(stage?: string) {
  const normalized = (stage || "").toLowerCase();
  if (normalized === "converted") return "sales-pill-active";
  if (normalized === "lost") return "sales-pill-muted";
  if (["demo_booked", "proposal_sent"].includes(normalized)) return "sales-pill-paused";
  return "sales-pill-soft";
}

function splitName(value?: string | null) {
  const parts = (value || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstname: parts[0] || "",
    surname: parts.slice(1).join(" "),
  };
}

function emptyConvertForm(lead?: SalesLead | null): ConvertForm {
  const name = splitName(lead?.contact_name);
  const title = lead ? leadTitle(lead) : "";
  return {
    school_name: lead && title !== `Lead #${lead.id}` ? title : "",
    address: lead?.location || "",
    admin_firstname: name.firstname,
    admin_surname: name.surname,
    admin_email: lead?.contact_email || lead?.demo_booking?.email || "",
    admin_phone: lead?.contact_phone || lead?.demo_booking?.phone || "",
    password: "",
    send_login_email: true,
  };
}

function StatCard({ title, value, hint, icon }: { title: string; value: string | number; hint: string; icon: string }) {
  return (
    <article className="sales-stat-card">
      <span className="sales-stat-icon"><i className={`bi bi-${icon}`} /></span>
      <div>
        <p>{title}</p>
        <h3>{value}</h3>
        <small>{hint}</small>
      </div>
    </article>
  );
}

export default function SalesLeadsManagementPage() {
  const { showSuccess, showError } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("");
  const [summary, setSummary] = useState<LeadSummary>(defaultSummary);
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [selectedLead, setSelectedLead] = useState<SalesLead | null>(null);
  const [convertForm, setConvertForm] = useState<ConvertForm>(emptyConvertForm(null));
  const [loginDetails, setLoginDetails] = useState<LoginDetails | null>(null);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const res = await authApi.get("/superadmin/sales-leads", {
        params: {
          search: query.trim() || undefined,
          stage: stage || undefined,
          per_page: 100,
        },
      });
      setSummary(res.data?.summary || defaultSummary);
      setLeads(res.data?.leads?.data || []);
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to load sales leads.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredLeads = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return leads;
    return leads.filter((lead) =>
      [leadTitle(lead), leadContact(lead), lead.location || "", lead.stage || ""].some((value) => value.toLowerCase().includes(term))
    );
  }, [leads, query]);

  const openConvert = (lead: SalesLead) => {
    setSelectedLead(lead);
    setLoginDetails(null);
    setConvertForm(emptyConvertForm(lead));
  };

  const updateStage = async (lead: SalesLead, nextStage: string) => {
    if (nextStage === lead.stage) return;
    try {
      const res = await authApi.patch(`/superadmin/sales-leads/${lead.id}/stage`, { stage: nextStage });
      showSuccess?.(res.data?.message || "Lead stage updated.");
      await loadLeads();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to update lead stage.");
    }
  };

  const submitConversion = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedLead) return;
    setSaving(true);
    try {
      const payload = {
        ...convertForm,
        password: convertForm.password.trim() || undefined,
      };
      const res = await authApi.post(`/superadmin/sales-leads/${selectedLead.id}/convert`, payload);
      showSuccess?.(res.data?.message || "Lead converted successfully.");
      setLoginDetails(res.data?.login_details || null);
      await loadLeads();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to convert lead.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{`
        .sales-main { min-height: 100vh; background: #f5f7fb; overflow-x: hidden; }
        .sales-shell { width: 100%; max-width: 1360px; margin: 0 auto; }
        .sales-hero { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 20px; align-items: center; padding: 24px; border-radius: 16px; color: #fff; background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 54%, #0f766e 100%); box-shadow: 0 18px 48px rgba(15, 23, 42, .14); margin-bottom: 18px; max-width: 100%; }
        .sales-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: #a7f3d0; }
        .sales-hero h1 { margin: 8px 0; font-size: clamp(26px, 4vw, 38px); font-weight: 900; letter-spacing: 0; }
        .sales-hero p { max-width: 740px; margin: 0; color: rgba(255,255,255,.78); line-height: 1.65; }
        .sales-hero-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
        .sales-btn { border: 0; border-radius: 10px; padding: 10px 14px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; gap: 8px; white-space: nowrap; }
        .sales-btn-primary { background: #facc15; color: #111827; }
        .sales-btn-light { background: rgba(255,255,255,.14); color: #fff; border: 1px solid rgba(255,255,255,.22); }
        .sales-btn-soft { background: #eef6ff; color: #1d4ed8; }
        .sales-btn-success { background: #dcfce7; color: #166534; }
        .sales-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
        .sales-stat-card, .sales-panel, .sales-lead-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; box-shadow: 0 12px 32px rgba(15, 23, 42, .06); }
        .sales-stat-card { display: flex; gap: 12px; padding: 18px; min-width: 0; }
        .sales-stat-icon { width: 42px; height: 42px; display: inline-flex; align-items: center; justify-content: center; border-radius: 12px; background: #ecfeff; color: #0f766e; font-size: 19px; flex: 0 0 auto; }
        .sales-stat-card p { margin: 0; color: #64748b; font-weight: 700; font-size: 12px; }
        .sales-stat-card h3 { margin: 4px 0; font-size: 22px; font-weight: 900; color: #0f172a; }
        .sales-stat-card small { color: #94a3b8; font-weight: 700; }
        .sales-panel { padding: 18px; margin-bottom: 18px; }
        .sales-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 14px; flex-wrap: wrap; }
        .sales-panel-head h2 { margin: 0; color: #0f172a; font-size: 20px; font-weight: 900; }
        .sales-panel-head p { margin: 4px 0 0; color: #64748b; }
        .sales-filter-row { display: grid; grid-template-columns: minmax(220px, 1fr) 190px auto; gap: 12px; align-items: end; }
        .sales-input, .sales-select { width: 100%; border: 1px solid #dbe3ef; border-radius: 10px; padding: 11px 12px; min-height: 44px; background: #fff; color: #0f172a; outline: none; }
        .sales-input:focus, .sales-select:focus { border-color: #0f766e; box-shadow: 0 0 0 3px rgba(15, 118, 110, .12); }
        .sales-two-col { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(340px, .85fr); gap: 18px; align-items: start; }
        .sales-lead-list { display: grid; gap: 12px; }
        .sales-lead-card { padding: 16px; display: grid; gap: 12px; }
        .sales-lead-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
        .sales-lead-title h3 { margin: 0; font-size: 17px; font-weight: 900; color: #0f172a; }
        .sales-lead-title p { margin: 4px 0 0; color: #64748b; }
        .sales-meta-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        .sales-meta { background: #f8fafc; border: 1px solid #edf2f7; border-radius: 10px; padding: 10px; min-width: 0; }
        .sales-meta span { display: block; color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; }
        .sales-meta strong { display: block; margin-top: 4px; color: #0f172a; overflow-wrap: anywhere; }
        .sales-card-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; align-items: center; }
        .sales-pill-active, .sales-pill-paused, .sales-pill-muted, .sales-pill-soft { border-radius: 999px; padding: 7px 10px; font-size: 12px; font-weight: 900; text-transform: capitalize; display: inline-flex; align-items: center; justify-content: center; }
        .sales-pill-active { background: #dcfce7; color: #166534; }
        .sales-pill-paused { background: #fef9c3; color: #854d0e; }
        .sales-pill-muted { background: #f1f5f9; color: #475569; }
        .sales-pill-soft { background: #e0f2fe; color: #075985; }
        .sales-empty { padding: 40px 18px; text-align: center; color: #64748b; }
        .sales-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .sales-form-grid .span-2 { grid-column: 1 / -1; }
        .sales-label { display: block; font-size: 12px; font-weight: 900; color: #334155; margin-bottom: 6px; }
        .sales-login-box { margin-top: 14px; padding: 14px; border-radius: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
        .sales-login-box h4 { margin: 0 0 10px; font-weight: 900; }
        .sales-login-box p { margin: 4px 0; overflow-wrap: anywhere; }
        @media (max-width: 1199px) { .sales-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .sales-two-col { grid-template-columns: 1fr; } }
        @media (max-width: 767px) { .sales-main { padding-left: 0 !important; } .sales-hero { grid-template-columns: 1fr; padding: 18px; } .sales-hero-actions { justify-content: flex-start; } .sales-grid, .sales-meta-grid, .sales-filter-row, .sales-form-grid { grid-template-columns: 1fr; } .sales-card-actions { justify-content: flex-start; } }
      `}</style>
      <PageTitle title="Sales Leads" />
      <TopNav onToggleSidebar={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4 py-4 db-main sales-main">
        <div className="sales-shell">
          <section className="sales-hero">
            <div>
              <span className="sales-eyebrow"><i className="bi bi-kanban" /> Lead conversion desk</span>
              <h1>Review sales leads and open school accounts</h1>
              <p>Track leads from sales representatives, move them through the pipeline, and convert qualified schools into real GradeQuest admin accounts.</p>
            </div>
            <div className="sales-hero-actions">
              <button className="sales-btn sales-btn-light" type="button" onClick={loadLeads}>
                <i className="bi bi-arrow-clockwise" /> Refresh
              </button>
            </div>
          </section>

          <section className="sales-grid">
            <StatCard title="Total Leads" value={summary.total} hint="All submitted leads" icon="collection" />
            <StatCard title="Open Leads" value={summary.open} hint="Still being worked" icon="hourglass-split" />
            <StatCard title="Converted" value={summary.converted} hint="School accounts opened" icon="check2-circle" />
            <StatCard title="Pipeline Value" value={currency.format(summary.pipeline_value || 0)} hint="Expected revenue" icon="graph-up-arrow" />
          </section>

          <section className="sales-panel">
            <div className="sales-panel-head">
              <div>
                <h2>Find Leads</h2>
                <p>Search by school, contact, phone, region, or sales representative.</p>
              </div>
            </div>
            <div className="sales-filter-row">
              <input className="sales-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search sales leads" />
              <select className="sales-select" value={stage} onChange={(e) => setStage(e.target.value)}>
                <option value="">All stages</option>
                {stages.map((item) => <option key={item} value={item}>{stageLabel(item)}</option>)}
              </select>
              <button className="sales-btn sales-btn-soft" type="button" onClick={loadLeads}>
                <i className="bi bi-search" /> Apply
              </button>
            </div>
          </section>

          {loading ? <Loader /> : (
            <section className="sales-two-col">
              <div className="sales-lead-list">
                {filteredLeads.length === 0 ? (
                  <div className="sales-panel sales-empty">
                    <i className="bi bi-inbox fs-2 d-block mb-2" />
                    No sales leads found.
                  </div>
                ) : filteredLeads.map((lead) => (
                  <article className="sales-lead-card" key={lead.id}>
                    <div className="sales-lead-top">
                      <div className="sales-lead-title">
                        <h3>{leadTitle(lead)}</h3>
                        <p>{leadContact(lead)}</p>
                      </div>
                      <span className={stageClass(lead.stage)}>{stageLabel(lead.stage)}</span>
                    </div>

                    <div className="sales-meta-grid">
                      <div className="sales-meta"><span>Sales Rep</span><strong>{lead.representative?.name || [lead.representative?.user?.firstname, lead.representative?.user?.surname].filter(Boolean).join(" ") || "Unassigned"}</strong></div>
                      <div className="sales-meta"><span>Expected Students</span><strong>{lead.expected_students || 0}</strong></div>
                      <div className="sales-meta"><span>Expected Close</span><strong>{fmtDate(lead.expected_close_date)}</strong></div>
                      <div className="sales-meta"><span>Pipeline</span><strong>{currency.format(Number(lead.pipeline_value || 0))}</strong></div>
                      <div className="sales-meta"><span>Location</span><strong>{lead.location || "Not set"}</strong></div>
                      <div className="sales-meta"><span>Updated</span><strong>{fmtDate(lead.updated_at)}</strong></div>
                    </div>

                    {lead.notes ? <p className="mb-0 text-muted">{lead.notes}</p> : null}

                    <div className="sales-card-actions">
                      <select className="sales-select" style={{ width: 190 }} value={lead.stage || "lead"} onChange={(e) => updateStage(lead, e.target.value)} disabled={lead.stage === "converted"}>
                        {stages.map((item) => <option key={item} value={item}>{stageLabel(item)}</option>)}
                      </select>
                      <button className="sales-btn sales-btn-success" type="button" onClick={() => openConvert(lead)} disabled={lead.stage === "converted" || Boolean(lead.school_id)}>
                        <i className="bi bi-building-add" /> Convert to School
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <aside className="sales-panel">
                <div className="sales-panel-head">
                  <div>
                    <h2>Convert Lead</h2>
                    <p>{selectedLead ? leadTitle(selectedLead) : "Select a lead to create a school admin account."}</p>
                  </div>
                </div>

                {!selectedLead ? (
                  <div className="sales-empty">Choose a lead from the list to continue.</div>
                ) : selectedLead.stage === "converted" || selectedLead.school_id ? (
                  <div className="sales-login-box">
                    <h4>Already Converted</h4>
                    <p>This lead is already linked to a school account.</p>
                  </div>
                ) : (
                  <form onSubmit={submitConversion}>
                    <div className="sales-form-grid">
                      <div className="span-2">
                        <label className="sales-label">School name</label>
                        <input className="sales-input" value={convertForm.school_name} onChange={(e) => setConvertForm((prev) => ({ ...prev, school_name: e.target.value }))} required />
                      </div>
                      <div className="span-2">
                        <label className="sales-label">School address</label>
                        <input className="sales-input" value={convertForm.address} onChange={(e) => setConvertForm((prev) => ({ ...prev, address: e.target.value }))} />
                      </div>
                      <div>
                        <label className="sales-label">Admin first name</label>
                        <input className="sales-input" value={convertForm.admin_firstname} onChange={(e) => setConvertForm((prev) => ({ ...prev, admin_firstname: e.target.value }))} required />
                      </div>
                      <div>
                        <label className="sales-label">Admin surname</label>
                        <input className="sales-input" value={convertForm.admin_surname} onChange={(e) => setConvertForm((prev) => ({ ...prev, admin_surname: e.target.value }))} />
                      </div>
                      <div>
                        <label className="sales-label">Admin email</label>
                        <input className="sales-input" type="email" value={convertForm.admin_email} onChange={(e) => setConvertForm((prev) => ({ ...prev, admin_email: e.target.value }))} required />
                      </div>
                      <div>
                        <label className="sales-label">Admin phone</label>
                        <input className="sales-input" value={convertForm.admin_phone} onChange={(e) => setConvertForm((prev) => ({ ...prev, admin_phone: e.target.value }))} />
                      </div>
                      <div className="span-2">
                        <label className="sales-label">Temporary password</label>
                        <input className="sales-input" value={convertForm.password} onChange={(e) => setConvertForm((prev) => ({ ...prev, password: e.target.value }))} placeholder="Leave blank to auto-generate" />
                      </div>
                      <label className="span-2 d-flex align-items-center gap-2 fw-bold text-muted">
                        <input type="checkbox" checked={convertForm.send_login_email} onChange={(e) => setConvertForm((prev) => ({ ...prev, send_login_email: e.target.checked }))} />
                        Email login details to the school admin
                      </label>
                    </div>
                    <button className="sales-btn sales-btn-primary w-100 mt-3" type="submit" disabled={saving}>
                      {saving ? "Converting..." : <><i className="bi bi-check2-circle" /> Create School Account</>}
                    </button>
                  </form>
                )}

                {loginDetails ? (
                  <div className="sales-login-box">
                    <h4>School Login Details</h4>
                    <p><strong>URL:</strong> {loginDetails.login_url}</p>
                    <p><strong>Email:</strong> {loginDetails.email}</p>
                    <p><strong>School Code:</strong> {loginDetails.reg_no}</p>
                    {loginDetails.temporary_password ? <p><strong>Password:</strong> {loginDetails.temporary_password}</p> : null}
                    <p><strong>Email sent:</strong> {loginDetails.email_sent ? "Yes" : "No"}</p>
                    {loginDetails.email_error ? <p><strong>Email error:</strong> {loginDetails.email_error}</p> : null}
                  </div>
                ) : null}
              </aside>
            </section>
          )}
        </div>
        <Footer />
      </main>
    </>
  );
}


