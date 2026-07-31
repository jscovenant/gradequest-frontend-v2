import { useEffect, useState } from "react";

import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";

type Exam = {
  id: number;
  title: string;
  exam_code?: string;
  duration_minutes: number;
  delivery_mode: string;
  questions_count?: number;
  subject?: { name?: string };
  term?: { name?: string };
  academic_session?: { name?: string };
};

export default function StudentCbtExamsPage() {
  const { showError, showSuccess } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<number | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [activeAttempt, setActiveAttempt] = useState<any>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await authApi.get("/cbt/student/exams");
      setExams(Array.isArray(res.data?.exams) ? res.data.exams : []);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to load CBT exams.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function startExam(id: number) {
    setStartingId(id);
    setActiveAttempt(null);
    try {
      const res = await authApi.post(`/cbt/student/exams/${id}/start`);
      setActiveAttempt(res.data);
      showSuccess("CBT exam started.");
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to start CBT exam.");
    } finally {
      setStartingId(null);
    }
  }

  return (
    <>
      <style>{`
        .scbt-main{min-height:100vh;background:#f8fafc;margin-left:280px;width:calc(100% - 280px);padding:96px 26px 32px}
        .scbt-shell{max-width:1180px;margin:0 auto}.scbt-hero{background:linear-gradient(135deg,#171222,#3c1237);color:#fff;border-radius:18px;padding:26px}.scbt-hero h1{font-family:'Playfair Display',serif;font-weight:900;margin:4px 0 8px;font-size:clamp(28px,4vw,42px)}.scbt-hero p{margin:0;color:rgba(255,255,255,.76);line-height:1.7}
        .scbt-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin-top:16px}.scbt-card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 12px 30px rgba(15,23,42,.06);padding:18px}.scbt-title{font-size:18px;font-weight:900;color:#111827;margin:0}.scbt-sub{color:#64748b;font-size:13px;margin:6px 0 0}.scbt-meta{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.scbt-pill{display:inline-flex;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900;background:#eef2ff;color:#3730a3}.scbt-btn{border:0;border-radius:10px;padding:10px 14px;font-weight:900;background:var(--bs-primary,#d300b0);color:#fff}.scbt-attempt{background:#ecfeff;border:1px solid #a5f3fc;color:#155e75;border-radius:14px;padding:14px;margin-top:16px;font-weight:800;overflow:auto}
        @media(max-width:1199px){.scbt-main{margin-left:0;width:100%;padding:92px 16px 28px}}
      `}</style>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="My CBT Exams" />
      <PageTitle title="My CBT Exams" />
      <div className="container-fluid"><div className="row"><Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="scbt-main">{loading && <Loader message="Loading CBT exams..." />}<div className="scbt-shell">
          <section className="scbt-hero"><h1>My CBT Exams</h1><p>Start only when your teacher or school tells you to begin. Keep this page open until you submit.</p></section>
          {activeAttempt && <div className="scbt-attempt">Attempt created successfully. Attempt ID: {activeAttempt.attempt?.id}. The answering screen will be added in the next CBT phase.</div>}
          <section className="scbt-grid">
            {exams.length === 0 ? <div className="scbt-card"><p className="scbt-title">No CBT exam available</p><p className="scbt-sub">Published exams assigned to your class will appear here.</p></div> : exams.map((exam) => (
              <article className="scbt-card" key={exam.id}>
                <h2 className="scbt-title">{exam.title}</h2>
                <p className="scbt-sub">{exam.subject?.name || "Subject"} - {exam.term?.name || "Term"} {exam.academic_session?.name || ""}</p>
                <div className="scbt-meta"><span className="scbt-pill">{exam.duration_minutes} minutes</span><span className="scbt-pill">{exam.questions_count ?? 0} questions</span><span className="scbt-pill">{exam.delivery_mode}</span></div>
                <button className="scbt-btn" disabled={startingId === exam.id} onClick={() => startExam(exam.id)}>{startingId === exam.id ? "Starting..." : "Start Exam"}</button>
              </article>
            ))}
          </section>
          <Footer />
        </div></main>
      </div></div>
    </>
  );
}
