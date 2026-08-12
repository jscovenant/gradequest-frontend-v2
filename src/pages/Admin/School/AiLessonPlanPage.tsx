import { useEffect, useState } from "react";
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
type LessonPlan = {
  title: string;
  subject: string;
  class: string;
  topic: string;
  duration_minutes: number;
  objectives: string[];
  teaching_aids: string[];
  previous_knowledge: string;
  introduction: string;
  teacher_activities: string[];
  learner_activities: string[];
  assessment: string[];
  homework: string[];
  board_summary: string[];
  closure: string;
};

type CreditSummary = {
  remaining_credits: number;
  ai_lesson_plan_credit_cost?: number;
};

function ListBlock({ title, items }: { title: string; items?: string[] }) {
  return (
    <section className="lp-section">
      <h3>{title}</h3>
      {items?.length ? <ol>{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ol> : <p className="lp-muted">No item generated.</p>}
    </section>
  );
}

export default function AiLessonPlanPage() {
  const { showError, showSuccess } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<CreditSummary | null>(null);
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [form, setForm] = useState({ subject: "", class: "", topic: "", duration_minutes: 40, teacher_notes: "" });

  const loadCredits = async () => {
    try {
      const res = await authApi.get<{ data: CreditSummary }>("/admin/ai/credits");
      setCredits(res.data?.data || null);
    } catch {
      setCredits(null);
    }
  };

  useEffect(() => {
    loadCredits();
  }, []);

  const generate = async () => {
    if (!form.subject.trim() || !form.class.trim() || !form.topic.trim()) {
      showError?.("Enter subject, class, and topic.");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.post("/admin/ai/lesson-plans/generate", {
        ...form,
        duration_minutes: Number(form.duration_minutes || 40),
      });
      setPlan(res.data?.lesson_plan || null);
      const aiCredits = res.data?.ai_credits;
      if (aiCredits) setCredits({ remaining_credits: aiCredits.remaining, ai_lesson_plan_credit_cost: aiCredits.charged });
      showSuccess?.(aiCredits ? `Lesson plan generated. ${aiCredits.charged} credit(s) used, ${aiCredits.remaining} remaining.` : "Lesson plan generated.");
    } catch (err: any) {
      showError?.(safeAiError(err?.response?.data?.message, "Unable to generate lesson plan."));
    } finally {
      setLoading(false);
    }
  };

  const update = (key: keyof typeof form, value: string | number) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <>
      <style>{`
        .lp-main{background:linear-gradient(180deg,rgba(211,0,176,.035),transparent 280px),var(--bs-light,#fcf8f8);min-height:100vh;padding:28px 28px 0;overflow-x:hidden;font-family:"DM Sans",system-ui,sans-serif}.lp-hero{background:#050008;color:#fff;border-radius:16px;padding:26px 28px;margin-bottom:18px;position:relative;overflow:hidden}.lp-hero:before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,.055) 1px,transparent 1px);background-size:22px 22px}.lp-hero>*{position:relative;z-index:1}.lp-kicker{font-size:11px;text-transform:uppercase;font-weight:900;color:var(--bs-secondary,rgb(255,200,87));letter-spacing:.12em}.lp-title{font-family:"Lora",serif;font-weight:900;font-size:clamp(25px,3vw,36px);margin:6px 0}.lp-sub{max-width:760px;color:rgba(255,255,255,.66);font-size:13.5px;line-height:1.7;margin:0}.lp-grid{display:grid;grid-template-columns:390px 1fr;gap:18px;align-items:start}.lp-card{background:#fff;border:1px solid rgba(5,0,8,.08);border-radius:14px;box-shadow:0 12px 34px rgba(5,0,8,.055);overflow:hidden}.lp-pad{padding:18px}.lp-card h2{font-size:17px;font-weight:900;color:#1a1a2e;margin:0}.lp-muted{font-size:12.5px;color:#8d7d70;line-height:1.6;margin:4px 0 0}.lp-field{display:flex;flex-direction:column;gap:6px;margin-top:12px}.lp-field span{font-size:12px;font-weight:900;color:#4a3f4f}.lp-input,.lp-textarea{border:1px solid rgba(5,0,8,.12);border-radius:10px;padding:11px 12px;outline:none;background:#fff;color:#1a1a2e;font-weight:750}.lp-textarea{min-height:120px;resize:vertical}.lp-input:focus,.lp-textarea:focus{border-color:rgba(211,0,176,.45);box-shadow:0 0 0 4px rgba(211,0,176,.08)}.lp-btn{border:0;border-radius:10px;background:var(--bs-secondary,rgb(255,200,87));color:#050008;font-weight:900;padding:11px 15px;width:100%;margin-top:14px}.lp-btn:disabled{opacity:.65}.lp-credit{display:flex;justify-content:space-between;gap:10px;border:1px solid rgba(5,0,8,.08);background:#fffcf7;border-radius:12px;padding:12px;margin-top:14px}.lp-credit span{font-size:12px;color:#8d7d70}.lp-credit strong{font-weight:900;color:#1a1a2e}.lp-section{border:1px solid rgba(5,0,8,.08);border-radius:12px;padding:14px;background:#fff;margin-top:12px}.lp-section h3{font-size:14px;font-weight:900;color:var(--bs-primary,rgb(211,0,176));margin:0 0 8px}.lp-section p,.lp-section li{font-size:13px;line-height:1.75;color:#322739}.lp-plan-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.lp-pill{border-radius:999px;background:rgba(34,197,94,.12);color:#16a34a;font-size:11px;font-weight:900;padding:6px 10px;white-space:nowrap}.lp-print{border:1px solid rgba(5,0,8,.12);background:#fff;border-radius:10px;padding:9px 12px;font-weight:850;color:#1a1a2e}@media(max-width:1199.98px){.lp-grid{grid-template-columns:1fr}}@media print{.lp-hero,.lp-card:first-child,.sidebar,.top-nav,.navbar,footer{display:none!important}.lp-main{padding:0;background:#fff}.lp-grid{display:block}.lp-card{box-shadow:none;border:0}.lp-section{break-inside:avoid}}
      `}</style>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="AI Lesson Planner" />
      <div className="container-fluid"><div className="row"><Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="col-md-9 col-lg-10 ms-auto db-main lp-main">
          <PageTitle title="AI Lesson Planner" />
          {loading && <Loader message="Generating lesson plan..." />}
          <section className="lp-hero"><div className="lp-kicker">GradeQuest AI teaching tools</div><h1 className="lp-title">AI Lesson Plan Generator</h1><p className="lp-sub">Generate structured lesson plans with objectives, introduction, activities, assessment, homework, and board summary. Credit charging is controlled from Super Admin billing policy.</p></section>
          <div className="lp-grid">
            <section className="lp-card"><div className="lp-pad"><h2>Lesson details</h2><p className="lp-muted">Enter the exact class topic you want to teach.</p>
              <label className="lp-field"><span>Subject</span><input className="lp-input" value={form.subject} onChange={(e)=>update("subject", e.target.value)} placeholder="e.g. Biology" /></label>
              <label className="lp-field"><span>Class</span><input className="lp-input" value={form.class} onChange={(e)=>update("class", e.target.value)} placeholder="e.g. SS2 Science" /></label>
              <label className="lp-field"><span>Topic</span><input className="lp-input" value={form.topic} onChange={(e)=>update("topic", e.target.value)} placeholder="e.g. Digestive system" /></label>
              <label className="lp-field"><span>Duration minutes</span><input className="lp-input" type="number" min={10} max={240} value={form.duration_minutes} onChange={(e)=>update("duration_minutes", Number(e.target.value))} /></label>
              <label className="lp-field"><span>Teacher notes optional</span><textarea className="lp-textarea" value={form.teacher_notes} onChange={(e)=>update("teacher_notes", e.target.value)} placeholder="Paste any school-specific note, textbook reference, or teaching style here." /></label>
                    <div className="lp-credit"><div><span>Cost per generation</span><strong>{credits?.ai_lesson_plan_credit_cost ?? "-"} credit(s)</strong></div><div><span>Remaining</span><strong>{credits?.remaining_credits ?? "-"}</strong></div></div>
              <button className="lp-btn" disabled={loading} onClick={generate}>{loading ? "Generating..." : "Generate Lesson Plan"}</button>
            </div></section>
            <section className="lp-card"><div className="lp-pad">
              <div className="lp-plan-head"><div><h2>{plan?.title || "Generated lesson plan"}</h2><p className="lp-muted">{plan ? `${plan.subject} - ${plan.class} - ${plan.duration_minutes} minutes` : "Your generated lesson plan will appear here."}</p></div>{plan && <button className="lp-print" onClick={() => window.print()}><i className="bi bi-printer me-1" /> Print</button>}</div>
              {plan ? <>
                <div className="lp-section"><h3>Topic</h3><p>{plan.topic}</p>{plan.previous_knowledge && <p><strong>Previous knowledge:</strong> {plan.previous_knowledge}</p>}</div>
                <ListBlock title="Objectives" items={plan.objectives} />
                <ListBlock title="Teaching Aids" items={plan.teaching_aids} />
                <div className="lp-section"><h3>Introduction</h3><p>{plan.introduction || "No introduction generated."}</p></div>
                <ListBlock title="Teacher Activities" items={plan.teacher_activities} />
                <ListBlock title="Learner Activities" items={plan.learner_activities} />
                <ListBlock title="Assessment" items={plan.assessment} />
                <ListBlock title="Homework" items={plan.homework} />
                <ListBlock title="Board Summary" items={plan.board_summary} />
                <div className="lp-section"><h3>Closure</h3><p>{plan.closure || "No closure generated."}</p></div>
              </> : <div className="lp-section"><h3>No lesson plan yet</h3><p>Fill the form and generate a plan. The system charges credits only after a successful generation.</p></div>}
            </div></section>
          </div>
          <Footer />
        </main>
      </div></div>
    </>
  );
}
