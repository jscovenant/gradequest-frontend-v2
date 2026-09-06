import { useEffect, useMemo, useState } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";

const safeAiError = (message: string | undefined, fallback: string) => {
  const text = String(message || fallback);
  return /openai|api key|quota|billing|organization|insufficient_quota|provider/i.test(text)
    ? "Something went wrong while processing this AI request. Please try again later."
    : text;
};
type Option = { id: number; name: string };
type Breakdown = { label: string; balance: number; count: number };
type ParentRisk = {
  parent_id: number | null;
  parent_name: string;
  phone?: string | null;
  children_count: number;
  fee_items_count: number;
  balance: number;
  risk_score: number;
  risk_level: string;
  students: { student_name: string; reg_no?: string; class_name?: string; balance: number }[];
};
type ParentMessage = { parent_id: number | null; parent_name: string; risk_level: string; message: string };
type Analysis = {
  summary: { total_balance: number; total_amount: number; amount_paid: number; owing_students: number; owing_parents: number; fee_items: number; high_risk_parents: number };
  executive_summary: string;
  collection_priorities: string[];
  risk_notes: string[];
  at_risk_parents: ParentRisk[];
  parent_messages: ParentMessage[];
  breakdowns: { by_class: Breakdown[]; by_parent: Breakdown[]; by_term: Breakdown[]; by_student: Breakdown[] };
};
type CreditSummary = {
  remaining_credits: number;
  user_allocation?: {
    allocated_credits: number;
    used_credits: number;
    remaining_credits: number;
    is_unlimited: boolean;
  } | null;
  is_plus_active?: boolean;
  ai_fee_collection_credit_cost?: number;
};

function money(value?: number | string | null) {
  return `NGN ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function riskClass(level?: string) {
  const key = String(level || "medium").toLowerCase();
  if (key === "high") return "fee-ai-risk-high";
  if (key === "low") return "fee-ai-risk-low";
  return "fee-ai-risk-medium";
}

export default function AiFeeCollectionAssistantPage() {
  const { showError, showSuccess } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingParentId, setSendingParentId] = useState<number | null>(null);
  const [credits, setCredits] = useState<CreditSummary | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [sessions, setSessions] = useState<Option[]>([]);
  const [terms, setTerms] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [sections, setSections] = useState<Option[]>([]);
  const [filters, setFilters] = useState({ session_id: "", term_id: "", class_id: "", section_id: "", limit: 10 });

  const selectedScope = useMemo(() => {
    const parts = [
      sessions.find((x) => String(x.id) === filters.session_id)?.name,
      terms.find((x) => String(x.id) === filters.term_id)?.name,
      classes.find((x) => String(x.id) === filters.class_id)?.name,
      sections.find((x) => String(x.id) === filters.section_id)?.name,
    ].filter(Boolean);
    return parts.length ? parts.join(" • ") : "All outstanding fees";
  }, [classes, filters, sections, sessions, terms]);

  const loadMeta = async () => {
    const [creditRes, sessionRes, termRes, classRes, sectionRes] = await Promise.allSettled([
      authApi.get<{ data: CreditSummary }>("/admin/ai/credits"),
      authApi.get("/facademic-sessions"),
      authApi.get("/fterms"),
      authApi.get("/levels"),
      authApi.get("/sections"),
    ]);
    if (creditRes.status === "fulfilled") setCredits(creditRes.value.data?.data || null);
    if (sessionRes.status === "fulfilled") setSessions(Array.isArray(sessionRes.value.data) ? sessionRes.value.data : sessionRes.value.data?.data || []);
    if (termRes.status === "fulfilled") setTerms(Array.isArray(termRes.value.data) ? termRes.value.data : termRes.value.data?.data || []);
    if (classRes.status === "fulfilled") setClasses(Array.isArray(classRes.value.data) ? classRes.value.data : classRes.value.data?.data || []);
    if (sectionRes.status === "fulfilled") setSections(Array.isArray(sectionRes.value.data) ? sectionRes.value.data : sectionRes.value.data?.data || []);
  };

  useEffect(() => {
    loadMeta().catch(() => undefined);
  }, []);

  const analyze = async () => {
    setLoading(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(filters)
          .filter(([, value]) => value !== "" && value !== null && value !== undefined)
          .map(([key, value]) => [key, Number(value)])
      );
      const res = await authApi.post("/admin/ai/fee-collection/analyze", payload);
      setAnalysis(res.data?.analysis || null);
      const aiCredits = res.data?.ai_credits;
      if (aiCredits?.remaining !== null && aiCredits?.remaining !== undefined) {
        setCredits({ remaining_credits: aiCredits.remaining, ai_fee_collection_credit_cost: aiCredits.charged });
      }
      showSuccess?.(aiCredits?.charged ? `Analysis generated. ${aiCredits.charged} credit(s) used.` : "Analysis generated.");
    } catch (err: any) {
      showError?.(safeAiError(err?.response?.data?.message, "Unable to generate fee collection analysis."));
    } finally {
      setLoading(false);
    }
  };


  const reminderPayload = (parentId: number) => {
    const payload: Record<string, number> = { parent_id: parentId };
    Object.entries(filters).forEach(([key, value]) => {
      if (key === "limit") return;
      if (value !== "" && value !== null && value !== undefined) {
        payload[key] = Number(value);
      }
    });
    return payload;
  };

  const sendReminder = async (item: ParentMessage) => {
    if (!item.parent_id) {
      showError?.("This reminder cannot be sent because no parent account is linked.");
      return;
    }

    setSendingParentId(item.parent_id);
    try {
      const res = await authApi.post("/admin/ai/fee-collection/reminders/send", reminderPayload(item.parent_id));
      const delivery = res.data || {};
      const channels = [delivery.email_queued ? "email" : null, delivery.whatsapp_sent ? "WhatsApp" : null].filter(Boolean).join(" and ");
      showSuccess?.(channels ? `Reminder sent by ${channels}.` : delivery.message || "Reminder request completed.");
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to send reminder to this parent.");
    } finally {
      setSendingParentId(null);
    }
  };
  const copyMessage = async (message: string) => {
    await navigator.clipboard.writeText(message);
    showSuccess?.("Reminder message copied.");
  };

  const update = (key: keyof typeof filters, value: string | number) => setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .fee-ai-main {
          background: #F8FAFC;
          min-height: 100vh;
          padding: 24px 28px 0;
          overflow-x: hidden;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        }
        .fee-ai-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          color: #fff;
          border-radius: 18px;
          padding: 32px 36px;
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
        }
        .fee-ai-hero-glow {
          position: absolute;
          top: -60px;
          right: -60px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.15) 0%, transparent 65%);
          pointer-events: none;
        }
        .fee-ai-hero>* { position: relative; z-index: 1; }
        .fee-ai-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #FBBF24;
          background: rgba(217, 119, 6, 0.20);
          border: 1px solid rgba(217, 119, 6, 0.35);
          border-radius: 100px;
          padding: 4px 12px;
          margin-bottom: 12px;
        }
        .fee-ai-title {
          font-weight: 800;
          font-size: 26px;
          margin: 6px 0 8px;
          color: #fff;
        }
        .fee-ai-sub {
          max-width: 800px;
          color: #CBD5E1;
          font-size: 13.5px;
          line-height: 1.6;
          margin: 0;
        }
        .fee-ai-grid {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 20px;
          align-items: start;
        }
        .fee-ai-card {
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(15, 39, 68, 0.03);
          overflow: hidden;
        }
        .fee-ai-pad { padding: 20px; }
        .fee-ai-card h2 { font-size: 16px; font-weight: 700; color: #0F2744; margin: 0; }
        .fee-ai-muted { font-size: 12.5px; color: #64748B; line-height: 1.5; margin: 4px 0 0; }
        .fee-ai-field { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; }
        .fee-ai-field span { font-size: 12px; font-weight: 700; color: #0F2744; }
        .fee-ai-input {
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 10px 12px;
          outline: none;
          background: #F8FAFC;
          color: #0F2744;
          font-size: 13px;
          font-weight: 600;
          transition: border-color 0.2s;
        }
        .fee-ai-input:focus { border-color: #D97706; background: #fff; }
        .fee-ai-btn {
          border: 0;
          border-radius: 10px;
          background: #D97706;
          color: #FFFFFF;
          font-weight: 700;
          font-size: 13px;
          padding: 11px 15px;
          width: 100%;
          margin-top: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .fee-ai-btn:hover { background: #B45309; transform: translateY(-1px); }
        .fee-ai-btn:disabled { opacity: .65; transform: none; cursor: not-allowed; }
        .fee-ai-credit {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          border: 1px solid #E2E8F0;
          background: #F8FAFC;
          border-radius: 12px;
          padding: 12px 14px;
          margin-top: 14px;
        }
        .fee-ai-credit span { font-size: 12px; color: #64748B; font-weight: 500; }
        .fee-ai-credit strong { font-weight: 700; color: #0F2744; font-size: 13px; }
        .fee-ai-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }
        .fee-ai-stat {
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 18px 20px;
          box-shadow: 0 4px 12px rgba(15,39,68,0.02);
        }
        .fee-ai-stat span { font-size: 11.5px; text-transform: uppercase; letter-spacing: .04em; color: #64748B; font-weight: 700; }
        .fee-ai-stat strong { display: block; font-size: 22px; font-weight: 800; color: #0F2744; margin-top: 6px; }
        .fee-ai-section { border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; background: #F8FAFC; margin-top: 14px; }
        .fee-ai-section h3 { font-size: 14px; font-weight: 700; color: #0F2744; margin: 0 0 8px; }
        .fee-ai-section p, .fee-ai-section li { font-size: 13px; line-height: 1.7; color: #334155; }
        .fee-ai-risk-card { border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; background: #F8FAFC; margin-top: 10px; }
        .fee-ai-risk-top { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
        .fee-ai-risk-name { font-weight: 700; color: #0F2744; font-size: 14px; }
        .fee-ai-pill { border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .fee-ai-risk-high { background: rgba(239, 68, 68, .12); color: #b91c1c; }
        .fee-ai-risk-medium { background: rgba(245, 158, 11, .14); color: #b45309; }
        .fee-ai-risk-low { background: rgba(16, 185, 129, .12); color: #059669; }
        .fee-ai-table { width: 100%; border-collapse: collapse; }
        .fee-ai-table th { font-size: 11.5px; text-transform: uppercase; color: #64748B; letter-spacing: .04em; font-weight: 700; }
        .fee-ai-table th, .fee-ai-table td { padding: 10px 12px; border-bottom: 1px solid #F1F5F9; font-size: 13px; color: #334155; }
        .fee-ai-message { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px; margin-top: 12px; white-space: pre-wrap; font-size: 13px; line-height: 1.7; color: #334155; }
        .fee-ai-copy { border: 1px solid #E2E8F0; background: #fff; border-radius: 8px; padding: 7px 12px; font-size: 12px; font-weight: 700; color: #0F2744; cursor: pointer; transition: all 0.2s; }
        .fee-ai-copy:hover { background: #E2E8F0; }
        .fee-ai-send { border: 0; background: #D97706; color: #fff; border-radius: 8px; padding: 7px 14px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .fee-ai-send:hover { background: #B45309; }
        .fee-ai-send:disabled { opacity: .6; cursor: not-allowed; }
        .fee-ai-message-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        @media(max-width:1199.98px){.fee-ai-grid{grid-template-columns:1fr}.fee-ai-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:767.98px){.fee-ai-main{padding:20px 16px 0}.fee-ai-stats{grid-template-columns:1fr}}
      `}</style>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="AI Fee Collection" />
      <div className="container-fluid"><div className="row"><Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="col-md-9 col-lg-10 ms-auto db-main fee-ai-main">
          <PageTitle title="AI Fee Collection Assistant" />
          {loading && <Loader message="Analyzing outstanding fees..." />}
          <section className="fee-ai-hero">
            <div className="fee-ai-hero-glow" />
            <div className="fee-ai-kicker">GradiosEdu AI finance tools</div>
            <h1 className="fee-ai-title">AI Fee Collection Assistant</h1>
            <p className="fee-ai-sub">Identify parents with the highest outstanding balances, summarize debts by class, term, parent, or student, and generate polite reminder drafts.</p>
          </section>
          <div className="fee-ai-grid">
            <section className="fee-ai-card"><div className="fee-ai-pad"><h2>Analysis filters</h2><p className="fee-ai-muted">Leave filters empty to analyze all unpaid fee records.</p>
              <label className="fee-ai-field"><span>Academic session</span><select className="fee-ai-input" value={filters.session_id} onChange={(e)=>update("session_id", e.target.value)}><option value="">All sessions</option>{sessions.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="fee-ai-field"><span>Term</span><select className="fee-ai-input" value={filters.term_id} onChange={(e)=>update("term_id", e.target.value)}><option value="">All terms</option>{terms.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="fee-ai-field"><span>Class</span><select className="fee-ai-input" value={filters.class_id} onChange={(e)=>update("class_id", e.target.value)}><option value="">All classes</option>{classes.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="fee-ai-field"><span>Section</span><select className="fee-ai-input" value={filters.section_id} onChange={(e)=>update("section_id", e.target.value)}><option value="">All sections</option>{sections.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="fee-ai-field"><span>Parents to review</span><input className="fee-ai-input" type="number" min={3} max={25} value={filters.limit} onChange={(e)=>update("limit", Number(e.target.value))} /></label>
              <div className="fee-ai-credit">
                <div><span>Cost per analysis</span><strong>{credits?.ai_fee_collection_credit_cost ?? 2} credit(s)</strong></div>
                <div>
                  <span>{credits?.user_allocation ? "Your Quota" : "Remaining"}</span>
                  <strong>
                    {credits?.user_allocation
                      ? credits.user_allocation.is_unlimited
                        ? "Unlimited"
                        : `${credits.user_allocation.remaining_credits} credits`
                      : `${credits?.remaining_credits ?? "-"} credits`}
                  </strong>
                </div>
              </div>
              {credits && credits.is_plus_active === false && (
                <div className="alert alert-warning py-2 px-3 mt-3 mb-0" style={{ fontSize: "12px", borderRadius: "10px" }}>
                  <i className="bi bi-exclamation-triangle me-1" />
                  <strong>GradiosEdu Plus Required:</strong> AI Fee Assistant requires an active GradiosEdu Plus subscription.
                </div>
              )}
              <button className="fee-ai-btn" disabled={loading || (credits && credits.is_plus_active === false)} onClick={analyze}>
                {loading ? "Analyzing..." : "Generate Fee Analysis"}
              </button>
            </div></section>
            <section>
              {analysis ? <>
                <div className="fee-ai-stats">
                  <div className="fee-ai-stat"><span>Total outstanding</span><strong>{money(analysis.summary.total_balance)}</strong></div>
                  <div className="fee-ai-stat"><span>Owing parents</span><strong>{analysis.summary.owing_parents}</strong></div>
                  <div className="fee-ai-stat"><span>Owing students</span><strong>{analysis.summary.owing_students}</strong></div>
                  <div className="fee-ai-stat"><span>High risk</span><strong>{analysis.summary.high_risk_parents}</strong></div>
                </div>
                <section className="fee-ai-card"><div className="fee-ai-pad"><h2>Collection summary</h2><p className="fee-ai-muted">{selectedScope}</p><div className="fee-ai-section"><h3>Executive summary</h3><p>{analysis.executive_summary}</p></div><div className="fee-ai-section"><h3>Recommended actions</h3><ol>{analysis.collection_priorities.map((item, index)=><li key={index}>{item}</li>)}</ol></div>{analysis.risk_notes.length > 0 && <div className="fee-ai-section"><h3>Risk notes</h3><ol>{analysis.risk_notes.map((item, index)=><li key={index}>{item}</li>)}</ol></div>}</div></section>
                <section className="fee-ai-card mt-3"><div className="fee-ai-pad"><h2>Parents most likely to owe</h2><p className="fee-ai-muted">Ranked by balance, unpaid records, partial payment pattern, and contact availability.</p>{analysis.at_risk_parents.map((parent)=><div className="fee-ai-risk-card" key={`${parent.parent_id}-${parent.parent_name}`}><div className="fee-ai-risk-top"><div><div className="fee-ai-risk-name">{parent.parent_name}</div><div className="fee-ai-muted">{parent.children_count} child(ren) • {parent.fee_items_count} fee item(s) • {parent.phone || "No phone"}</div></div><span className={`fee-ai-pill ${riskClass(parent.risk_level)}`}>{parent.risk_level} • {parent.risk_score}</span></div><div className="mt-2 fw-bold">{money(parent.balance)}</div>{parent.students.map((student)=><div className="fee-ai-muted" key={`${parent.parent_id}-${student.reg_no}`}>{student.student_name} {student.reg_no ? `(${student.reg_no})` : ""} - {student.class_name || "Class not set"}: {money(student.balance)}</div>)}</div>)}</div></section>
                <section className="fee-ai-card mt-3"><div className="fee-ai-pad"><h2>Reminder drafts</h2><p className="fee-ai-muted">Review the message, then send it directly to the parent by email and WhatsApp where contact details are available.</p>{analysis.parent_messages.length ? analysis.parent_messages.map((item, index)=><div className="fee-ai-message" key={`${item.parent_id}-${index}`}><div className="d-flex justify-content-between gap-2 align-items-start mb-2"><strong>{item.parent_name}</strong><div className="fee-ai-message-actions"><button className="fee-ai-copy" onClick={()=>copyMessage(item.message)}>Copy</button><button className="fee-ai-send" disabled={!item.parent_id || sendingParentId === item.parent_id} onClick={()=>sendReminder(item)}>{sendingParentId === item.parent_id ? "Sending..." : "Send Email + WhatsApp"}</button></div></div>{item.message}</div>) : <p className="fee-ai-muted mt-3">No reminder message needed for this selection.</p>}</div></section>
                <section className="fee-ai-card mt-3"><div className="fee-ai-pad"><h2>Debt breakdown</h2><div className="table-responsive"><table className="fee-ai-table"><thead><tr><th>Class</th><th>Records</th><th className="text-end">Balance</th></tr></thead><tbody>{analysis.breakdowns.by_class.map((row)=><tr key={row.label}><td>{row.label}</td><td>{row.count}</td><td className="text-end fw-bold">{money(row.balance)}</td></tr>)}</tbody></table></div><div className="table-responsive mt-3"><table className="fee-ai-table"><thead><tr><th>Term</th><th>Records</th><th className="text-end">Balance</th></tr></thead><tbody>{analysis.breakdowns.by_term.map((row)=><tr key={row.label}><td>{row.label}</td><td>{row.count}</td><td className="text-end fw-bold">{money(row.balance)}</td></tr>)}</tbody></table></div></div></section>
              </> : <section className="fee-ai-card"><div className="fee-ai-pad"><h2>No analysis yet</h2><p className="fee-ai-muted">Choose a period or class, then generate the analysis. The system uses your fee records; balances are not guessed.</p></div></section>}
            </section>
          </div>
          <Footer />
        </main>
      </div></div>
    </>
  );
}
