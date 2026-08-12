import { useEffect, useMemo, useState, type ReactNode } from "react";
import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import { authApi } from "../../utils/axios";
import { useToast } from "../../contexts/ToastContext";

type Policy = {
  online_grace_days: number;
  online_minimum_coverage_percent: number;
  online_whole_school_block_enabled: boolean;
  online_student_level_block_enabled: boolean;
  offline_grace_days: number;
  offline_school_block_enabled: boolean;
  platform_fee_per_student: string | number;
  whatsapp_credit_unit_price: string | number;
  legacy_plus_ai_credits: number;
  ai_result_comment_credit_cost: number;
  ai_cbt_question_credit_cost: number;
  ai_lesson_plan_credit_cost: number;
  ai_fee_collection_credit_cost: number;
  ai_credit_unit_price: string | number;
  legacy_subscription_honor_enabled: boolean;
  per_student_billing_starts_at?: string | null;
  temporary_access_min_days: number;
  temporary_access_max_days: number;
};

type School = { id: number; school_name?: string | null };
type Access = {
  id: number;
  school_id: number;
  scope: string;
  status: string;
  starts_at?: string | null;
  ends_at: string;
  reason?: string | null;
  school?: School | null;
};

type BillingPeriod = {
  id: number;
  school_id: number;
  session_id: number;
  term_id: number;
  academic_start_date?: string | null;
  billing_started_at: string;
  billing_grace_ends_at?: string | null;
  term_activated_at?: string | null;
  first_protected_activity_at?: string | null;
  status: string;
  source: string;
  reason?: string | null;
  suspicious_flags?: string[] | null;
  flagged_at?: string | null;
  school?: School | null;
  session?: { id: number; name: string } | null;
  term?: { id: number; name: string } | null;
};

const defaultPolicy: Policy = {
  online_grace_days: 14,
  online_minimum_coverage_percent: 70,
  online_whole_school_block_enabled: true,
  online_student_level_block_enabled: true,
  offline_grace_days: 7,
  offline_school_block_enabled: true,
  platform_fee_per_student: 1000,
  whatsapp_credit_unit_price: 10,
  legacy_plus_ai_credits: 100,
  ai_result_comment_credit_cost: 1,
  ai_cbt_question_credit_cost: 5,
  ai_lesson_plan_credit_cost: 3,
  ai_fee_collection_credit_cost: 2,
  ai_credit_unit_price: 25,
  legacy_subscription_honor_enabled: true,
  per_student_billing_starts_at: "",
  temporary_access_min_days: 3,
  temporary_access_max_days: 7,
};

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function asBool(value: any) {
  return value === true || value === 1 || value === "1";
}

export default function BillingPolicyPage() {
  const { showError, showSuccess } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<Policy>(defaultPolicy);
  const [accessList, setAccessList] = useState<Access[]>([]);
  const [billingPeriods, setBillingPeriods] = useState<BillingPeriod[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [grant, setGrant] = useState({ school_id: "", scope: "school_crud", days: 3, reason: "" });
  const [periodSchoolId, setPeriodSchoolId] = useState("");
  const [editingPeriod, setEditingPeriod] = useState<BillingPeriod | null>(null);
  const [periodDate, setPeriodDate] = useState("");
  const [periodReason, setPeriodReason] = useState("");

  const activeAccess = useMemo(() => accessList.filter((a) => a.status === "active").length, [accessList]);
  const suspiciousPeriods = useMemo(
    () => billingPeriods.filter((p) => Array.isArray(p.suspicious_flags) && p.suspicious_flags.length > 0),
    [billingPeriods]
  );

  const load = async () => {
    setLoading(true);
    try {
      const res = await authApi.get("/superadmin/billing-policy");
      setPolicy({ ...defaultPolicy, ...(res.data.policy || {}) });
      setAccessList(Array.isArray(res.data.temporary_access) ? res.data.temporary_access : []);
      setBillingPeriods(Array.isArray(res.data.billing_periods) ? res.data.billing_periods : []);
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to load billing policy.");
    } finally {
      setLoading(false);
    }
  };

  const searchSchools = async () => {
    try {
      const res = await authApi.get(`/superadmin/billing-policy/schools?q=${encodeURIComponent(schoolSearch)}`);
      setSchools(Array.isArray(res.data.schools) ? res.data.schools : []);
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to search schools.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = window.setTimeout(searchSchools, 350);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolSearch]);

  const updatePolicy = async () => {
    setSaving(true);
    try {
      const payload = {
        ...policy,
        online_grace_days: Number(policy.online_grace_days || 0),
        online_minimum_coverage_percent: Number(policy.online_minimum_coverage_percent || 0),
        offline_grace_days: Number(policy.offline_grace_days || 0),
        platform_fee_per_student: Number(policy.platform_fee_per_student || 0),
        whatsapp_credit_unit_price: Number(policy.whatsapp_credit_unit_price || 0),
        legacy_plus_ai_credits: Number(policy.legacy_plus_ai_credits || 0),
        ai_result_comment_credit_cost: Number(policy.ai_result_comment_credit_cost || 1),
        ai_cbt_question_credit_cost: Number(policy.ai_cbt_question_credit_cost || 1),
        ai_lesson_plan_credit_cost: Number(policy.ai_lesson_plan_credit_cost || 1),
        ai_fee_collection_credit_cost: Number(policy.ai_fee_collection_credit_cost || 1),
        ai_credit_unit_price: Number(policy.ai_credit_unit_price || 0),
        legacy_subscription_honor_enabled: asBool(policy.legacy_subscription_honor_enabled),
        per_student_billing_starts_at: policy.per_student_billing_starts_at || null,
        temporary_access_min_days: Number(policy.temporary_access_min_days || 1),
        temporary_access_max_days: Number(policy.temporary_access_max_days || 1),
      };
      const res = await authApi.put("/superadmin/billing-policy", payload);
      setPolicy({ ...defaultPolicy, ...(res.data.policy || {}) });
      showSuccess?.("Billing policy updated.");
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to update billing policy.");
    } finally {
      setSaving(false);
    }
  };

  const grantAccess = async () => {
    if (!grant.school_id || !grant.reason.trim()) {
      showError?.("Select a school and enter a reason.");
      return;
    }

    setSaving(true);
    try {
      await authApi.post("/superadmin/billing-temporary-access", {
        ...grant,
        school_id: Number(grant.school_id),
        days: Number(grant.days),
      });
      setGrant({ school_id: "", scope: "school_crud", days: Number(policy.temporary_access_min_days || 3), reason: "" });
      showSuccess?.("Temporary access granted.");
      await load();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to grant temporary access.");
    } finally {
      setSaving(false);
    }
  };

  const revokeAccess = async (id: number) => {
    if (!window.confirm("Revoke this temporary access?")) return;
    setSaving(true);
    try {
      await authApi.delete(`/superadmin/billing-temporary-access/${id}`);
      showSuccess?.("Temporary access revoked.");
      await load();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to revoke temporary access.");
    } finally {
      setSaving(false);
    }
  };

  const syncCurrentPeriod = async () => {
    if (!periodSchoolId) {
      showError?.("Select a school first.");
      return;
    }

    setSaving(true);
    try {
      await authApi.post("/superadmin/billing-periods/sync-current", { school_id: Number(periodSchoolId) });
      showSuccess?.("Billing period prepared.");
      await load();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to prepare billing period.");
    } finally {
      setSaving(false);
    }
  };

  const openEditPeriod = (period: BillingPeriod) => {
    setEditingPeriod(period);
    setPeriodDate((period.billing_started_at || "").slice(0, 10));
    setPeriodReason("");
  };

  const updateBillingPeriod = async () => {
    if (!editingPeriod || !periodDate || !periodReason.trim()) {
      showError?.("Enter billing start date and reason.");
      return;
    }

    setSaving(true);
    try {
      await authApi.put(`/superadmin/billing-periods/${editingPeriod.id}`, {
        billing_started_at: periodDate,
        reason: periodReason,
      });
      setEditingPeriod(null);
      setPeriodDate("");
      setPeriodReason("");
      showSuccess?.("Billing start date updated.");
      await load();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to update billing period.");
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, children }: { label: string; children: ReactNode }) => (
    <label className="bp-field">
      <span>{label}</span>
      {children}
    </label>
  );

  return (
    <>
      <style>{`
        .bp-main{font-family:"DM Sans",system-ui,sans-serif}
        .bp-hero{background:#050008;color:#fff;border-radius:16px;padding:24px;margin-bottom:18px;position:relative;overflow:hidden}
        .bp-hero:before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,.06) 1px,transparent 1px);background-size:22px 22px}
        .bp-hero>*{position:relative;z-index:1}
        .bp-kicker{font-size:11px;text-transform:uppercase;font-weight:900;color:rgb(255,200,87)}
        .bp-title{font-family:"Lora",serif;font-weight:900;font-size:32px;margin:6px 0}
        .bp-sub{max-width:820px;color:rgba(255,255,255,.65);font-size:13px;line-height:1.7;margin:0}
        .bp-grid{display:grid;grid-template-columns:1fr 390px;gap:18px;align-items:start}
        .bp-card{background:#fff;border:1px solid rgba(5,0,8,.08);border-radius:14px;box-shadow:0 14px 38px rgba(5,0,8,.06);overflow:hidden}
        .bp-card-pad{padding:18px}
        .bp-card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:14px}
        .bp-card-title{font-weight:900;color:#1a1a2e}
        .bp-muted{font-size:12px;color:#8d7d70}
        .bp-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .bp-field{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:800;color:#4a3f4f}
        .bp-input,.bp-select,.bp-textarea{border:1px solid rgba(5,0,8,.12);border-radius:10px;padding:10px 12px;outline:none;background:#fff;color:#1a1a2e;font-weight:750}
        .bp-textarea{min-height:86px;resize:vertical}
        .bp-input:focus,.bp-select:focus,.bp-textarea:focus{border-color:rgba(211,0,176,.45);box-shadow:0 0 0 4px rgba(211,0,176,.08)}
        .bp-switch{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid rgba(5,0,8,.08);border-radius:12px;padding:12px;background:#faf8f5}
        .bp-btn{border:none;border-radius:10px;background:rgb(255,200,87);color:#050008;font-weight:900;padding:11px 15px;display:inline-flex;align-items:center;gap:8px;justify-content:center}
        .bp-btn-outline{border:1px solid rgba(5,0,8,.12);border-radius:10px;background:#fff;color:#1a1a2e;font-weight:850;padding:10px 14px}
        .bp-row{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid rgba(5,0,8,.06)}
        .bp-row:last-child{border-bottom:none}
        .bp-pill{border-radius:999px;padding:5px 10px;font-size:11px;font-weight:900;background:rgba(34,197,94,.12);color:#16a34a;text-transform:uppercase}
        .bp-flag{display:inline-flex;margin:4px 6px 0 0;border-radius:999px;padding:4px 8px;font-size:10px;font-weight:900;background:rgba(239,68,68,.12);color:#dc2626;text-transform:uppercase}
        @media(max-width:1199.98px){.bp-grid{grid-template-columns:1fr}.bp-form-grid{grid-template-columns:1fr}}
        @media(max-width:575.98px){.bp-title{font-size:25px}.bp-hero{padding:20px}.bp-card-pad{padding:15px}}
      `}</style>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Billing Policy" />
      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="col-md-9 col-lg-10 ms-auto db-main bp-main">
            {(loading || saving) && <Loader message={saving ? "Saving billing policy..." : "Loading billing policy..."} />}

            <section className="bp-hero">
              <div className="bp-kicker">GradeQuest revenue protection</div>
              <h1 className="bp-title">Billing Enforcement Policy</h1>
              <p className="bp-sub">
                Configure online collection grace, student-level protection, whole-school thresholds, offline invoice blocking, platform fee charges, and short temporary access grants.
              </p>
            </section>

            <div className="bp-grid">
              <section className="bp-card">
                <div className="bp-card-pad">
                  <div className="bp-card-head">
                    <div>
                      <div className="bp-card-title">Dynamic enforcement settings</div>
                      <div className="bp-muted">These values are loaded by the backend before CRUD and academic actions are allowed.</div>
                    </div>
                    <span className="bp-pill">{activeAccess} active grants</span>
                    {suspiciousPeriods.length > 0 && <span className="bp-pill" style={{ background: "rgba(239,68,68,.12)", color: "#dc2626" }}>{suspiciousPeriods.length} flagged</span>}
                  </div>

                  <div className="bp-form-grid">
                    <Field label="Online grace days">
                      <input className="bp-input" type="number" min={0} max={90} value={policy.online_grace_days} onChange={(e)=>setPolicy((p)=>({...p, online_grace_days:Number(e.target.value)}))} />
                    </Field>
                    <Field label="Online minimum coverage (%)">
                      <input className="bp-input" type="number" min={0} max={100} value={policy.online_minimum_coverage_percent} onChange={(e)=>setPolicy((p)=>({...p, online_minimum_coverage_percent:Number(e.target.value)}))} />
                    </Field>
                    <Field label="Offline grace days">
                      <input className="bp-input" type="number" min={0} max={90} value={policy.offline_grace_days} onChange={(e)=>setPolicy((p)=>({...p, offline_grace_days:Number(e.target.value)}))} />
                    </Field>
                    <Field label="Platform fee per student">
                      <input className="bp-input" type="number" min={0} value={policy.platform_fee_per_student} onChange={(e)=>setPolicy((p)=>({...p, platform_fee_per_student:e.target.value}))} />
                    </Field>
                    <Field label="WhatsApp price per credit (NGN)">
                      <input className="bp-input" type="number" min={0.01} step="0.01" value={policy.whatsapp_credit_unit_price} onChange={(e)=>setPolicy((p)=>({...p, whatsapp_credit_unit_price:e.target.value}))} />
                    </Field>
                    <Field label="AI credits allocated on Plus upgrade">
                      <input className="bp-input" type="number" min={0} value={policy.legacy_plus_ai_credits} onChange={(e)=>setPolicy((p)=>({...p, legacy_plus_ai_credits:Number(e.target.value)}))} />
                    </Field>
                    <Field label="AI result comment cost (credits)">
                      <input className="bp-input" type="number" min={1} value={policy.ai_result_comment_credit_cost} onChange={(e)=>setPolicy((p)=>({...p, ai_result_comment_credit_cost:Number(e.target.value)}))} />
                    </Field>
                    <Field label="AI CBT question cost (credits)">
                      <input className="bp-input" type="number" min={1} value={policy.ai_cbt_question_credit_cost} onChange={(e)=>setPolicy((p)=>({...p, ai_cbt_question_credit_cost:Number(e.target.value)}))} />
                    </Field>
                    <Field label="AI lesson plan cost (credits)">
                      <input className="bp-input" type="number" min={1} value={policy.ai_lesson_plan_credit_cost} onChange={(e)=>setPolicy((p)=>({...p, ai_lesson_plan_credit_cost:Number(e.target.value)}))} />
                    </Field>                    <Field label="AI fee collection cost (credits)">
                      <input className="bp-input" type="number" min={1} value={policy.ai_fee_collection_credit_cost} onChange={(e)=>setPolicy((p)=>({...p, ai_fee_collection_credit_cost:Number(e.target.value)}))} />
                    </Field>
                    <Field label="AI credit price (NGN)">
                      <input className="bp-input" type="number" min={0.01} step="0.01" value={policy.ai_credit_unit_price} onChange={(e)=>setPolicy((p)=>({...p, ai_credit_unit_price:e.target.value}))} />
                    </Field>
                    <Field label="Per-student billing starts">
                      <input
                        className="bp-input"
                        type="datetime-local"
                        value={(policy.per_student_billing_starts_at || "").slice(0, 16)}
                        onChange={(e)=>setPolicy((p)=>({...p, per_student_billing_starts_at:e.target.value}))}
                      />
                    </Field>
                    <Field label="Temporary access min days">
                      <input className="bp-input" type="number" min={1} max={30} value={policy.temporary_access_min_days} onChange={(e)=>setPolicy((p)=>({...p, temporary_access_min_days:Number(e.target.value)}))} />
                    </Field>
                    <Field label="Temporary access max days">
                      <input className="bp-input" type="number" min={1} max={90} value={policy.temporary_access_max_days} onChange={(e)=>setPolicy((p)=>({...p, temporary_access_max_days:Number(e.target.value)}))} />
                    </Field>
                  </div>

                  <div className="bp-form-grid" style={{ marginTop: 14 }}>
                    <div className="bp-switch">
                      <div>
                        <div className="bp-card-title" style={{ fontSize: 13 }}>Online student-level blocking</div>
                        <div className="bp-muted">Protect results and promotion per uncovered student.</div>
                      </div>
                      <input type="checkbox" checked={asBool(policy.online_student_level_block_enabled)} onChange={(e)=>setPolicy((p)=>({...p, online_student_level_block_enabled:e.target.checked}))} />
                    </div>
                    <div className="bp-switch">
                      <div>
                        <div className="bp-card-title" style={{ fontSize: 13 }}>Online whole-school threshold</div>
                        <div className="bp-muted">Block CRUD only below coverage after grace.</div>
                      </div>
                      <input type="checkbox" checked={asBool(policy.online_whole_school_block_enabled)} onChange={(e)=>setPolicy((p)=>({...p, online_whole_school_block_enabled:e.target.checked}))} />
                    </div>
                    <div className="bp-switch">
                      <div>
                        <div className="bp-card-title" style={{ fontSize: 13 }}>Offline invoice school block</div>
                        <div className="bp-muted">Offline schools are responsible for direct invoice settlement.</div>
                      </div>
                      <input type="checkbox" checked={asBool(policy.offline_school_block_enabled)} onChange={(e)=>setPolicy((p)=>({...p, offline_school_block_enabled:e.target.checked}))} />
                    </div>
                    <div className="bp-switch">
                      <div>
                        <div className="bp-card-title" style={{ fontSize: 13 }}>Honor old active subscriptions</div>
                        <div className="bp-muted">Schools paid before the cutover keep access until their subscription expires.</div>
                      </div>
                      <input type="checkbox" checked={asBool(policy.legacy_subscription_honor_enabled)} onChange={(e)=>setPolicy((p)=>({...p, legacy_subscription_honor_enabled:e.target.checked}))} />
                    </div>
                  </div>

                  <button className="bp-btn mt-3" onClick={updatePolicy} disabled={saving}>
                    <i className="bi bi-check2-circle" />
                    Save Policy
                  </button>
                </div>
              </section>

              <aside className="bp-card">
                <div className="bp-card-pad">
                  <div className="bp-card-title">Grant temporary access</div>
                  <div className="bp-muted mb-3">Use this for verified complaints or special cases. Every grant is audit logged.</div>

                  <Field label="Search school">
                    <input className="bp-input" value={schoolSearch} onChange={(e)=>setSchoolSearch(e.target.value)} placeholder="Type school name or ID" />
                  </Field>
                  <Field label="School" >
                    <select className="bp-select" value={grant.school_id} onChange={(e)=>setGrant((p)=>({...p, school_id:e.target.value}))}>
                      <option value="">Select school</option>
                      {schools.map((s) => <option key={s.id} value={s.id}>{s.school_name || `School #${s.id}`}</option>)}
                    </select>
                  </Field>
                  <Field label="Access scope">
                    <select className="bp-select" value={grant.scope} onChange={(e)=>setGrant((p)=>({...p, scope:e.target.value}))}>
                      <option value="school_crud">School CRUD only</option>
                      <option value="student_academic">Student academic actions</option>
                      <option value="all">All protected actions</option>
                    </select>
                  </Field>
                  <Field label={`Days (${policy.temporary_access_min_days}-${policy.temporary_access_max_days})`}>
                    <input className="bp-input" type="number" min={policy.temporary_access_min_days} max={policy.temporary_access_max_days} value={grant.days} onChange={(e)=>setGrant((p)=>({...p, days:Number(e.target.value)}))} />
                  </Field>
                  <Field label="Reason">
                    <textarea className="bp-textarea" value={grant.reason} onChange={(e)=>setGrant((p)=>({...p, reason:e.target.value}))} placeholder="Example: verified settlement delay, support escalation..." />
                  </Field>
                  <button className="bp-btn mt-3" style={{ width: "100%" }} onClick={grantAccess} disabled={saving}>
                    <i className="bi bi-shield-check" />
                    Grant Access
                  </button>
                </div>
              </aside>
            </div>

            <section className="bp-card mt-3">
              <div className="bp-card-pad">
                <div className="bp-card-head">
                  <div>
                    <div className="bp-card-title">Recent temporary access grants</div>
                    <div className="bp-muted">Active and revoked access records for support audit.</div>
                  </div>
                </div>
                {accessList.length ? accessList.map((a) => (
                  <div className="bp-row" key={a.id}>
                    <div>
                      <div className="bp-card-title" style={{ fontSize: 14 }}>{a.school?.school_name || `School #${a.school_id}`}</div>
                      <div className="bp-muted">{a.scope.replaceAll("_", " ")} | Ends {fmtDate(a.ends_at)} | {a.reason || "No reason"}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className="bp-pill" style={a.status === "active" ? undefined : { background: "rgba(148,163,184,.16)", color: "#64748b" }}>{a.status}</span>
                      {a.status === "active" && <button className="bp-btn-outline" onClick={() => revokeAccess(a.id)}>Revoke</button>}
                    </div>
                  </div>
                )) : <div className="bp-muted">No temporary access grants recorded yet.</div>}
              </div>
            </section>

            <section className="bp-card mt-3">
              <div className="bp-card-pad">
                <div className="bp-card-head">
                  <div>
                    <div className="bp-card-title">Billing start dates</div>
                    <div className="bp-muted">
                      Prepare or adjust the locked billing start date used for grace-period enforcement. Future declared dates cannot delay billing once a term is active or protected features are used.
                    </div>
                  </div>
                </div>

                <div className="bp-form-grid">
                  <Field label="School">
                    <select className="bp-select" value={periodSchoolId} onChange={(e)=>setPeriodSchoolId(e.target.value)}>
                      <option value="">Select school</option>
                      {schools.map((s) => <option key={s.id} value={s.id}>{s.school_name || `School #${s.id}`}</option>)}
                    </select>
                  </Field>
                  <div style={{ display: "flex", alignItems: "end" }}>
                    <button className="bp-btn" onClick={syncCurrentPeriod} disabled={saving || !periodSchoolId}>
                      <i className="bi bi-calendar2-check" />
                      Prepare Current Period
                    </button>
                  </div>
                </div>

                {editingPeriod && (
                  <div style={{ marginTop: 14, border: "1px solid rgba(211,0,176,.18)", borderRadius: 14, padding: 14, background: "rgba(211,0,176,.04)" }}>
                    <div className="bp-card-title" style={{ marginBottom: 10 }}>
                      Adjust billing start for {editingPeriod.school?.school_name || `School #${editingPeriod.school_id}`}
                    </div>
                    <div className="bp-form-grid">
                      <Field label="Billing started at">
                        <input className="bp-input" type="date" value={periodDate} onChange={(e)=>setPeriodDate(e.target.value)} />
                      </Field>
                      <Field label="Reason">
                        <input className="bp-input" value={periodReason} onChange={(e)=>setPeriodReason(e.target.value)} placeholder="Required audit reason" />
                      </Field>
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                      <button className="bp-btn" onClick={updateBillingPeriod} disabled={saving}>
                        <i className="bi bi-check2" />
                        Save Billing Start
                      </button>
                      <button className="bp-btn-outline" onClick={() => setEditingPeriod(null)} disabled={saving}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 12 }}>
                  {billingPeriods.length ? billingPeriods.map((p) => (
                    <div className="bp-row" key={p.id}>
                      <div>
                        <div className="bp-card-title" style={{ fontSize: 14 }}>
                          {p.school?.school_name || `School #${p.school_id}`}
                        </div>
                        <div className="bp-muted">
                          {p.session?.name || `Session #${p.session_id}`} | {p.term?.name || `Term #${p.term_id}`} | Grace ends {fmtDate(p.billing_grace_ends_at)}
                        </div>
                        <div className="bp-muted">
                          Academic start {fmtDate(p.academic_start_date)} | Billing start {fmtDate(p.billing_started_at)} | Source {p.source}
                        </div>
                        {(p.term_activated_at || p.first_protected_activity_at) && (
                          <div className="bp-muted">
                            Activated {fmtDate(p.term_activated_at)} | First protected use {fmtDate(p.first_protected_activity_at)}
                          </div>
                        )}
                        {Array.isArray(p.suspicious_flags) && p.suspicious_flags.length > 0 && (
                          <div>
                            {p.suspicious_flags.map((flag) => (
                              <span className="bp-flag" key={flag}>{flag.replaceAll("_", " ")}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button className="bp-btn-outline" onClick={() => openEditPeriod(p)}>
                        Adjust
                      </button>
                    </div>
                  )) : <div className="bp-muted">No billing periods prepared yet. Select a school and prepare its current period.</div>}
                </div>
              </div>
            </section>

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}



