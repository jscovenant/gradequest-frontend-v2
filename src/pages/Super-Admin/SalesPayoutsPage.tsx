import { FormEvent, useEffect, useMemo, useState } from "react";

import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import PageTitle from "../../components/PageTitle";
import { useToast } from "../../contexts/ToastContext";
import { authApi } from "../../utils/axios";
import { currency, fmtDate } from "../Sales/salesApi";

type Rep = {
  id: number;
  code: string;
  name: string;
  email?: string | null;
  commission_rate: number;
  status?: string;
  bank_name?: string | null;
  bank_code?: string | null;
  account_number?: string | null;
  account_name?: string | null;
  paystack_recipient_code?: string | null;
  payout_verified_at?: string | null;
  pending_commission: number;
  approved_commission: number;
  paid_commission: number;
};

type Batch = {
  id: number;
  reference: string;
  total_amount: number;
  commission_count: number;
  status: string;
  failure_reason?: string | null;
  paystack_transfer_code?: string | null;
  initiated_at?: string | null;
  paid_at?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  payout_month?: string | null;
  batch_type?: string | null;
  representative?: { user?: any; code?: string };
};

type Summary = {
  pending_commissions: number;
  approved_commissions: number;
  held_commissions?: number;
  queued_commissions?: number;
  paid_commissions: number;
  processing_payouts: number;
  paid_payouts: number;
};

type Automation = {
  auto_review_enabled: boolean;
  auto_payout_enabled: boolean;
  next_auto_review_at?: string | null;
  next_payout_run_at?: string | null;
  last_review_at?: string | null;
  last_review_approved_count: number;
  last_review_held_count: number;
  eligible_commissions_count: number;
  eligible_commissions_amount: number;
  held_exceptions_count: number;
  held_exceptions_amount: number;
};

type PolicyForm = {
  default_commission_rate: number;
  default_term_1_rate: number;
  default_retention_rate: number;
  max_commission_terms: number;
  minimum_payout_amount: number;
  monthly_payout_day: number;
  commission_waiting_days: number;
  auto_approval_enabled: boolean;
  auto_payout_enabled: boolean;
  large_commission_review_threshold: number;
};

type PayoutAuthorization = {
  can_manage_policy: boolean;
  can_authorize_transfers: boolean;
};

const defaultSummary: Summary = {
  pending_commissions: 0,
  approved_commissions: 0,
  held_commissions: 0,
  queued_commissions: 0,
  paid_commissions: 0,
  processing_payouts: 0,
  paid_payouts: 0,
};

const defaultAutomation: Automation = {
  auto_review_enabled: true,
  auto_payout_enabled: false,
  next_auto_review_at: null,
  next_payout_run_at: null,
  last_review_at: null,
  last_review_approved_count: 0,
  last_review_held_count: 0,
  eligible_commissions_count: 0,
  eligible_commissions_amount: 0,
  held_exceptions_count: 0,
  held_exceptions_amount: 0,
};

const defaultPolicy: PolicyForm = {
  default_commission_rate: 30,
  default_term_1_rate: 30,
  default_retention_rate: 12,
  max_commission_terms: 3,
  minimum_payout_amount: 5000,
  monthly_payout_day: 5,
  commission_waiting_days: 7,
  auto_approval_enabled: true,
  auto_payout_enabled: false,
  large_commission_review_threshold: 50000,
};

function fmtDateTime(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function repName(batch: Batch) {
  const user = batch.representative?.user;
  return [user?.firstname, user?.surname].filter(Boolean).join(" ") || user?.email || batch.representative?.code || "Sales rep";
}

function statusClass(status?: string) {
  const value = (status || "").toLowerCase();
  if (value === "paid") return "sales-pill-active";
  if (["processing", "queued", "requires_otp", "awaiting_approval"].includes(value)) return "sales-pill-paused";
  if (["failed", "held", "reversed"].includes(value)) return "sales-pill-muted";
  return "sales-pill-soft";
}

function StatCard({ title, value, hint, icon }: { title: string; value: string; hint: string; icon: string }) {
  return <article className="sales-stat-card"><span className="sales-stat-icon"><i className={`bi bi-${icon}`} /></span><div><p>{title}</p><h3>{value}</h3><small>{hint}</small></div></article>;
}

export default function SalesPayoutsPage() {
  const { showSuccess, showError } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<Summary>(defaultSummary);
  const [representatives, setRepresentatives] = useState<Rep[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [policyForm, setPolicyForm] = useState<PolicyForm>(defaultPolicy);
  const [automation, setAutomation] = useState<Automation>(defaultAutomation);
  const [authorization, setAuthorization] = useState<PayoutAuthorization>({ can_manage_policy: false, can_authorize_transfers: false });
  const [selectedRepId, setSelectedRepId] = useState<number | "">("");
  const [bankForm, setBankForm] = useState({ bank_name: "", bank_code: "", account_number: "" });

  const selectedRep = useMemo(() => representatives.find((rep) => rep.id === Number(selectedRepId)), [representatives, selectedRepId]);

  const load = async () => {
    setLoading(true);
    try {
      const [payoutRes, repsRes, policyRes] = await Promise.all([
        authApi.get("/superadmin/sales-payouts", { params: { per_page: 100 } }),
        authApi.get("/superadmin/sales-payouts/representatives"),
        authApi.get("/superadmin/sales-payout-policy"),
      ]);
      const nextPolicy = policyRes.data?.policy || payoutRes.data?.policy || defaultPolicy;
      setSummary({ ...defaultSummary, ...(payoutRes.data?.summary || {}) });
      setBatches(payoutRes.data?.batches?.data || []);
      setAuthorization({ can_manage_policy: false, can_authorize_transfers: false, ...(payoutRes.data?.authorization || {}) });
      setRepresentatives(repsRes.data?.representatives || []);
      setAutomation({ ...defaultAutomation, ...(policyRes.data?.automation || payoutRes.data?.automation || {}) });
      setPolicyForm({
        minimum_payout_amount: Number(nextPolicy.minimum_payout_amount || 5000),
        monthly_payout_day: Number(nextPolicy.monthly_payout_day || 5),
        commission_waiting_days: Number(nextPolicy.commission_waiting_days || 7),
        auto_approval_enabled: !!nextPolicy.auto_approval_enabled,
        auto_payout_enabled: !!nextPolicy.auto_payout_enabled,
        large_commission_review_threshold: Number(nextPolicy.large_commission_review_threshold || 50000),
      });
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to load sales payouts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selectedRep) return;
    setBankForm({
      bank_name: selectedRep.bank_name || "",
      bank_code: selectedRep.bank_code || "",
      account_number: "",
    });
  }, [selectedRep]);

  const savePolicy = async (event: FormEvent) => {
    event.preventDefault();
    if (!authorization.can_manage_policy) return;
    setSaving(true);
    try {
      const res = await authApi.put("/superadmin/sales-payout-policy", policyForm);
      showSuccess?.(res.data?.message || "Sales payout policy saved.");
      await load();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Could not save payout policy.");
    } finally {
      setSaving(false);
    }
  };

  const approveEligible = async () => {
    setSaving(true);
    try {
      const res = await authApi.post("/superadmin/sales-payouts/approve-eligible");
      showSuccess?.(res.data?.message || "Eligible commissions reviewed.");
      await load();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Could not review eligible commissions.");
    } finally {
      setSaving(false);
    }
  };

  const createMonthlyBatch = async () => {
    setSaving(true);
    try {
      const res = await authApi.post("/superadmin/sales-payouts/monthly");
      const data = res.data?.data;
      showSuccess?.(data ? `Monthly review done. ${data.created_count || 0} payout batch(es) created.` : res.data?.message || "Monthly payout batches created.");
      await load();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Could not create monthly payout batches.");
    } finally {
      setSaving(false);
    }
  };

  const saveBank = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedRep) return;
    setSaving(true);
    try {
      const res = await authApi.post(`/superadmin/sales-representatives/${selectedRep.id}/bank`, bankForm);
      showSuccess?.(res.data?.message || "Bank account verified.");
      await load();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Could not verify bank account.");
    } finally {
      setSaving(false);
    }
  };

  const createBatch = async (rep: Rep) => {
    setSaving(true);
    try {
      const res = await authApi.post(`/superadmin/sales-representatives/${rep.id}/payouts`);
      showSuccess?.(res.data?.message || "Payout batch created.");
      await load();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Could not create payout batch.");
    } finally {
      setSaving(false);
    }
  };

  const initiate = async (batch: Batch) => {
    setSaving(true);
    try {
      const res = await authApi.post(`/superadmin/sales-payouts/${batch.id}/initiate`);
      showSuccess?.(res.data?.message || "Paystack transfer initiated.");
      await load();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Could not initiate transfer.");
    } finally {
      setSaving(false);
    }
  };

  const reconcile = async (batch: Batch) => {
    setSaving(true);
    try {
      const res = await authApi.post(`/superadmin/sales-payouts/${batch.id}/reconcile`);
      showSuccess?.(res.data?.message || "Transfer status refreshed from Paystack.");
      await load();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Could not refresh transfer status.");
    } finally {
      setSaving(false);
    }
  };

  return <>
    <style>{`
      .sales-main { min-height: 100vh; background: #f5f7fb; overflow-x: hidden; }
      form[data-readonly="true"] .sales-policy-grid { pointer-events:none; opacity:.65; }
      .sales-shell { width: 100%; max-width: 1360px; margin: 0 auto; }
      .sales-hero { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 20px; align-items: center; padding: 24px; border-radius: 16px; color: #fff; background: linear-gradient(135deg,#0f172a 0%,#1e3a5f 54%,#0f766e 100%); box-shadow: 0 18px 48px rgba(15,23,42,.14); margin-bottom: 18px; }
      .sales-eyebrow { display:inline-flex; align-items:center; gap:8px; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; color:#a7f3d0; }
      .sales-hero h1 { margin:8px 0; font-size:clamp(26px,4vw,38px); font-weight:900; }
      .sales-hero p { max-width:760px; margin:0; color:rgba(255,255,255,.78); line-height:1.65; }
      .sales-btn { border:0; border-radius:10px; padding:10px 14px; font-weight:800; display:inline-flex; align-items:center; justify-content:center; gap:8px; white-space:nowrap; }
      .sales-btn-primary { background:#facc15; color:#111827; }
      .sales-btn-soft { background:#eef6ff; color:#1d4ed8; }
      .sales-btn-success { background:#dcfce7; color:#166534; }
      .sales-grid { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:14px; margin-bottom:18px; }
      .sales-policy-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
      .sales-automation-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-bottom:14px; }
      .sales-automation-card { border:1px solid #e5e7eb; border-radius:12px; background:#f8fafc; padding:13px; min-width:0; }
      .sales-automation-card span { display:block; color:#64748b; font-size:11px; font-weight:900; text-transform:uppercase; }
      .sales-automation-card strong { display:block; color:#0f172a; margin-top:5px; overflow-wrap:anywhere; }
      .sales-automation-card small { color:#64748b; display:block; margin-top:4px; line-height:1.4; }
      .sales-stat-card,.sales-panel,.sales-rep-card { background:#fff; border:1px solid #e5e7eb; border-radius:14px; box-shadow:0 12px 32px rgba(15,23,42,.06); }
      .sales-stat-card { display:flex; gap:12px; padding:18px; min-width:0; }
      .sales-stat-icon { width:42px; height:42px; display:inline-flex; align-items:center; justify-content:center; border-radius:12px; background:#ecfeff; color:#0f766e; font-size:19px; flex:0 0 auto; }
      .sales-stat-card p { margin:0; color:#64748b; font-weight:700; font-size:12px; }
      .sales-stat-card h3 { margin:4px 0; font-size:22px; font-weight:900; color:#0f172a; }
      .sales-stat-card small { color:#94a3b8; font-weight:700; }
      .sales-two-col { display:grid; grid-template-columns:minmax(0,1.15fr) minmax(340px,.85fr); gap:18px; align-items:start; }
      .sales-panel { padding:18px; margin-bottom:18px; }
      .sales-panel-head { display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom:14px; flex-wrap:wrap; }
      .sales-panel-head h2 { margin:0; color:#0f172a; font-size:20px; font-weight:900; }
      .sales-panel-head p { margin:4px 0 0; color:#64748b; }
      .sales-input,.sales-select { width:100%; border:1px solid #dbe3ef; border-radius:10px; padding:11px 12px; min-height:44px; background:#fff; color:#0f172a; outline:none; }
      .sales-form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
      .sales-form-grid .span-2 { grid-column:1 / -1; }
      .sales-label { display:block; font-size:12px; font-weight:900; color:#334155; margin-bottom:6px; }
      .sales-switch-row { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px; border:1px solid #e5e7eb; border-radius:12px; background:#f8fafc; }
      .sales-switch-row strong { display:block; color:#0f172a; }
      .sales-switch-row span span { display:block; color:#64748b; font-size:12px; margin-top:3px; }
      .sales-rep-list { display:grid; gap:12px; }
      .sales-rep-card { padding:16px; display:grid; gap:12px; }
      .sales-rep-top { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
      .sales-rep-top h3 { margin:0; font-size:17px; font-weight:900; color:#0f172a; }
      .sales-rep-top p { margin:4px 0 0; color:#64748b; }
      .sales-meta-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
      .sales-meta { background:#f8fafc; border:1px solid #edf2f7; border-radius:10px; padding:10px; min-width:0; }
      .sales-meta span { display:block; color:#64748b; font-size:11px; font-weight:800; text-transform:uppercase; }
      .sales-meta strong { display:block; margin-top:4px; color:#0f172a; overflow-wrap:anywhere; }
      .sales-pill-active,.sales-pill-paused,.sales-pill-muted,.sales-pill-soft { border-radius:999px; padding:7px 10px; font-size:12px; font-weight:900; text-transform:capitalize; display:inline-flex; align-items:center; justify-content:center; }
      .sales-pill-active { background:#dcfce7; color:#166534; }
      .sales-pill-paused { background:#fef9c3; color:#854d0e; }
      .sales-pill-muted { background:#f1f5f9; color:#475569; }
      .sales-pill-soft { background:#e0f2fe; color:#075985; }
      .sales-table-wrap { width:100%; overflow:auto; }
      .sales-table { width:100%; border-collapse:separate; border-spacing:0 10px; min-width:900px; }
      .sales-table th { color:#64748b; font-size:12px; text-transform:uppercase; padding:0 12px; }
      .sales-table td { background:#fff; border-top:1px solid #e5e7eb; border-bottom:1px solid #e5e7eb; padding:14px 12px; vertical-align:middle; }
      .sales-table td:first-child { border-left:1px solid #e5e7eb; border-radius:12px 0 0 12px; }
      .sales-table td:last-child { border-right:1px solid #e5e7eb; border-radius:0 12px 12px 0; }
      @media(max-width:1199px){.sales-grid,.sales-automation-grid{grid-template-columns:repeat(2,minmax(0,1fr));}.sales-two-col{grid-template-columns:1fr;}.sales-policy-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
      @media(max-width:767px){.sales-main{padding-left:0!important;}.sales-hero,.sales-form-grid,.sales-meta-grid,.sales-policy-grid,.sales-automation-grid{grid-template-columns:1fr;}.sales-hero{padding:18px;}}
    `}</style>
    <PageTitle title="Sales Payouts" />
    <TopNav onToggleSidebar={() => setSidebarOpen(true)} />
    <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4 py-4 db-main sales-main">
      <div className="sales-shell">
        <section className="sales-hero"><div><span className="sales-eyebrow"><i className="bi bi-bank" /> Monthly payout automation</span><h1>Pay sales representatives professionally</h1><p>Commissions are reviewed by policy, held when risk is detected, carried forward below the minimum, and grouped into monthly Paystack payout batches.</p></div><button className="sales-btn sales-btn-primary" onClick={load}><i className="bi bi-arrow-clockwise" /> Refresh</button></section>
        <section className="sales-grid">
          <StatCard title="Pending" value={currency.format(summary.pending_commissions)} hint="Waiting period" icon="hourglass-split" />
          <StatCard title="Approved" value={currency.format(summary.approved_commissions)} hint="Eligible balance" icon="check2-circle" />
          <StatCard title="Held" value={currency.format(summary.held_commissions || 0)} hint="Needs review" icon="pause-circle" />
          <StatCard title="Processing" value={currency.format(summary.processing_payouts)} hint="Sent to Paystack" icon="send" />
          <StatCard title="Paid" value={currency.format(summary.paid_payouts)} hint="Completed" icon="wallet2" />
        </section>
        {loading ? <Loader /> : <>
          <section className="sales-panel"><div className="sales-panel-head"><div><h2>Monthly payout policy</h2><p>System review runs automatically daily at 2:00 AM. The button is only for forcing an immediate review.</p></div><div className="d-flex gap-2 flex-wrap"><button className="sales-btn sales-btn-soft" disabled={saving} onClick={approveEligible}><i className="bi bi-play-circle" /> Run review now</button><button className="sales-btn sales-btn-primary" disabled={saving} onClick={createMonthlyBatch}><i className="bi bi-calendar2-check" /> Generate monthly batch</button></div></div><div className="sales-automation-grid"><div className="sales-automation-card"><span>Next auto review</span><strong>{fmtDateTime(automation.next_auto_review_at)}</strong><small>{automation.auto_review_enabled ? "System auto-review is enabled" : "Auto-review is disabled"}</small></div><div className="sales-automation-card"><span>Next payout run</span><strong>{fmtDateTime(automation.next_payout_run_at)}</strong><small>Monthly payout day: {policyForm.monthly_payout_day}</small></div><div className="sales-automation-card"><span>Eligible commissions</span><strong>{automation.eligible_commissions_count}</strong><small>{currency.format(automation.eligible_commissions_amount || 0)} ready for review</small></div><div className="sales-automation-card"><span>Held exceptions</span><strong>{automation.held_exceptions_count}</strong><small>{currency.format(automation.held_exceptions_amount || 0)} needs attention</small></div><div className="sales-automation-card"><span>Last review</span><strong>{fmtDateTime(automation.last_review_at)}</strong><small>{automation.last_review_approved_count} approved automatically</small></div><div className="sales-automation-card"><span>Last held</span><strong>{automation.last_review_held_count}</strong><small>Held during the last review</small></div></div><form onSubmit={savePolicy}><div className="sales-policy-grid"><div><label className="sales-label">Default Term 1 Acquisition Bounty %</label><input className="sales-input" type="number" min="0" max="100" step="0.01" value={policyForm.default_term_1_rate ?? 30} onChange={(e) => setPolicyForm((p) => ({ ...p, default_term_1_rate: Number(e.target.value), default_commission_rate: Number(e.target.value) }))} /></div><div><label className="sales-label">Default Terms 2-3 Retention %</label><input className="sales-input" type="number" min="0" max="100" step="0.01" value={policyForm.default_retention_rate ?? 12} onChange={(e) => setPolicyForm((p) => ({ ...p, default_retention_rate: Number(e.target.value) }))} /></div><div><label className="sales-label">Max Commission Terms (1 Year = 3)</label><input className="sales-input" type="number" min="1" max="12" value={policyForm.max_commission_terms ?? 3} onChange={(e) => setPolicyForm((p) => ({ ...p, max_commission_terms: Number(e.target.value) }))} /></div><div><label className="sales-label">Minimum payout amount</label><input className="sales-input" type="number" min="0" value={policyForm.minimum_payout_amount} onChange={(e) => setPolicyForm((p) => ({ ...p, minimum_payout_amount: Number(e.target.value) }))} /></div><div><label className="sales-label">Monthly payout day</label><input className="sales-input" type="number" min="1" max="28" value={policyForm.monthly_payout_day} onChange={(e) => setPolicyForm((p) => ({ ...p, monthly_payout_day: Number(e.target.value) }))} /></div><div><label className="sales-label">Waiting days before approval</label><input className="sales-input" type="number" min="0" max="90" value={policyForm.commission_waiting_days} onChange={(e) => setPolicyForm((p) => ({ ...p, commission_waiting_days: Number(e.target.value) }))} /></div><div><label className="sales-label">Large commission threshold</label><input className="sales-input" type="number" min="0" value={policyForm.large_commission_review_threshold} onChange={(e) => setPolicyForm((p) => ({ ...p, large_commission_review_threshold: Number(e.target.value) }))} /></div><label className="sales-switch-row"><span><strong>Auto approval</strong><span>Approve low-risk commissions after waiting period.</span></span><input type="checkbox" checked={policyForm.auto_approval_enabled} onChange={(e) => setPolicyForm((p) => ({ ...p, auto_approval_enabled: e.target.checked }))} /></label><label className="sales-switch-row"><span><strong>Auto Paystack payout</strong><span>Send transfers automatically after batch creation.</span></span><input type="checkbox" checked={policyForm.auto_payout_enabled} onChange={(e) => setPolicyForm((p) => ({ ...p, auto_payout_enabled: e.target.checked }))} /></label></div><button className="sales-btn sales-btn-primary mt-3" disabled={saving}><i className="bi bi-save" /> Save policy</button></form></section>
          <section className="sales-two-col">
            <div className="sales-rep-list">
              {representatives.map((rep) => <article className="sales-rep-card" key={rep.id}>
                <div className="sales-rep-top"><div><h3>{rep.name}</h3><p>{rep.email} - {rep.code}</p></div><span className={rep.paystack_recipient_code ? "sales-pill-active" : "sales-pill-muted"}>{rep.paystack_recipient_code ? "Bank verified" : "No payout account"}</span></div>
                <div className="sales-meta-grid"><div className="sales-meta"><span>Pending</span><strong>{currency.format(rep.pending_commission)}</strong></div><div className="sales-meta"><span>Approved</span><strong>{currency.format(rep.approved_commission)}</strong></div><div className="sales-meta"><span>Paid</span><strong>{currency.format(rep.paid_commission)}</strong></div><div className="sales-meta"><span>Account</span><strong>{rep.account_name || "Not set"}</strong></div><div className="sales-meta"><span>Bank</span><strong>{rep.bank_name || "Not set"}</strong></div><div className="sales-meta"><span>Verified</span><strong>{fmtDate(rep.payout_verified_at)}</strong></div></div>
                <div className="d-flex gap-2 flex-wrap justify-content-end"><button className="sales-btn sales-btn-soft" onClick={() => setSelectedRepId(rep.id)}><i className="bi bi-pencil-square" /> Bank Details</button><button className="sales-btn sales-btn-success" disabled={saving || !rep.paystack_recipient_code || rep.approved_commission <= 0} onClick={() => createBatch(rep)}><i className="bi bi-box-seam" /> Manual Batch</button></div>
              </article>)}
            </div>
            <aside className="sales-panel"><div className="sales-panel-head"><div><h2>Payout Bank</h2><p>Verify a sales rep bank account and create their Paystack recipient.</p></div></div><form onSubmit={saveBank}><div className="sales-form-grid"><div className="span-2"><label className="sales-label">Sales representative</label><select className="sales-select" value={selectedRepId} onChange={(e) => setSelectedRepId(e.target.value ? Number(e.target.value) : "")}><option value="">Select representative</option>{representatives.map((rep) => <option key={rep.id} value={rep.id}>{rep.name} - {rep.code}</option>)}</select></div><div><label className="sales-label">Bank name</label><input className="sales-input" value={bankForm.bank_name} onChange={(e) => setBankForm((p) => ({ ...p, bank_name: e.target.value }))} required /></div><div><label className="sales-label">Bank code</label><input className="sales-input" value={bankForm.bank_code} onChange={(e) => setBankForm((p) => ({ ...p, bank_code: e.target.value }))} required /></div><div className="span-2"><label className="sales-label">Account number</label><input className="sales-input" value={bankForm.account_number} maxLength={10} onChange={(e) => setBankForm((p) => ({ ...p, account_number: e.target.value }))} required /></div></div><button className="sales-btn sales-btn-primary w-100 mt-3" disabled={saving || !selectedRep}>Verify & Save Recipient</button></form></aside>
          </section>
        </>}
        <section className="sales-panel"><div className="sales-panel-head"><div><h2>Payout History</h2><p>Finance prepares payout batches. Only the owner authorizes transfers. Paid status comes from Paystack verification, never a manual confirmation.</p></div></div><div className="sales-table-wrap"><table className="sales-table"><thead><tr><th>Reference</th><th>Sales Rep</th><th>Period</th><th>Status</th><th>Amount</th><th>Items</th><th>Initiated</th><th>Paid</th><th>Action</th></tr></thead><tbody>{batches.map((batch) => <tr key={batch.id}><td><strong>{batch.reference}</strong><br /><small>{batch.paystack_transfer_code || batch.failure_reason || batch.batch_type || "No transfer yet"}</small></td><td>{repName(batch)}</td><td>{batch.payout_month || `${fmtDate(batch.period_start)} - ${fmtDate(batch.period_end)}`}</td><td><span className={statusClass(batch.status)}>{batch.status.replaceAll("_", " ")}</span></td><td><strong>{currency.format(Number(batch.total_amount || 0))}</strong></td><td>{batch.commission_count}</td><td>{fmtDate(batch.initiated_at)}</td><td>{fmtDate(batch.paid_at)}</td><td><div className="d-flex gap-2">{authorization.can_authorize_transfers && <><button className="sales-btn sales-btn-success" disabled={saving || !["pending", "failed", "reversed"].includes(batch.status)} onClick={() => initiate(batch)}>Authorize</button><button className="sales-btn sales-btn-soft" disabled={saving || !["processing", "requires_otp", "awaiting_approval"].includes(batch.status)} onClick={() => reconcile(batch)}>Refresh status</button></>}</div></td></tr>)}</tbody></table>{!loading && batches.length === 0 ? <div className="text-center text-muted py-4">No payout batch has been created.</div> : null}</div></section>
      </div><Footer />
    </main>
  </>;
}



