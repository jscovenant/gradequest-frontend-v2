import { FormEvent, useEffect, useState } from "react";

import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";

type CbtExam = {
  id: number;
  title: string;
  exam_code?: string;
  delivery_mode: "online" | "offline" | "hybrid";
  status: string;
  duration_minutes: number;
  questions_count?: number;
  attempts_count?: number;
};

const emptyExam = {
  title: "",
  delivery_mode: "online",
  duration_minutes: 60,
  pass_mark: 50,
  max_attempts: 1,
  general_instructions: "",
};

export default function CbtExamsPage() {
  const { showError, showSuccess } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exams, setExams] = useState<CbtExam[]>([]);
  const [form, setForm] = useState(emptyExam);
  const [licenseDays, setLicenseDays] = useState(30);
  const [licensePayload, setLicensePayload] = useState<any>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await authApi.get("/cbt/exams");
      setExams(Array.isArray(res.data?.exams?.data) ? res.data.exams.data : []);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to load CBT exams.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createExam(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await authApi.post("/cbt/exams", form);
      setForm(emptyExam);
      showSuccess("CBT exam created.");
      await load();
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to create CBT exam.");
    } finally {
      setSaving(false);
    }
  }

  async function publishExam(id: number) {
    setSaving(true);
    try {
      await authApi.post(`/cbt/exams/${id}/publish`);
      showSuccess("CBT exam published.");
      await load();
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to publish CBT exam.");
    } finally {
      setSaving(false);
    }
  }

  async function generateLicense() {
    setSaving(true);
    setLicensePayload(null);
    try {
      const res = await authApi.post("/cbt/offline/licenses", { days: licenseDays });
      setLicensePayload(res.data?.download_payload || null);
      showSuccess("Offline CBT license generated.");
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to generate offline license.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <style>{`
        .cbt-main{min-height:100vh;background:#f8fafc;margin-left:280px;width:calc(100% - 280px);padding:96px 26px 32px}
        .cbt-shell{max-width:1320px;margin:0 auto}
        .cbt-hero{background:linear-gradient(135deg,#171222,#3c1237);color:#fff;border-radius:18px;padding:26px;display:flex;align-items:flex-end;justify-content:space-between;gap:18px}
        .cbt-eyebrow{color:#f7c948;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.14em}
        .cbt-hero h1{font-family:'Playfair Display',serif;font-weight:900;margin:8px 0;font-size:clamp(28px,4vw,42px)}
        .cbt-hero p{margin:0;color:rgba(255,255,255,.76);max-width:820px;line-height:1.7}
        .cbt-grid{display:grid;grid-template-columns:380px minmax(0,1fr);gap:16px;margin-top:16px}
        .cbt-panel{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 12px 30px rgba(15,23,42,.06);overflow:hidden}
        .cbt-head{padding:18px 20px;border-bottom:1px solid #e5e7eb}.cbt-head h2{font-size:19px;font-weight:900;margin:0;color:#111827}.cbt-head p{margin:4px 0 0;color:#64748b;font-size:13px}
        .cbt-body{padding:18px 20px}.cbt-label{font-size:12px;font-weight:900;color:#475569;text-transform:uppercase;margin-bottom:6px}
        .cbt-input,.cbt-select,.cbt-textarea{width:100%;border:1px solid #dbe3ef;border-radius:10px;padding:10px 11px;margin-bottom:12px}.cbt-input,.cbt-select{height:42px}.cbt-textarea{min-height:96px}
        .cbt-btn{border:0;border-radius:10px;padding:10px 14px;font-weight:900;display:inline-flex;align-items:center;gap:8px}.cbt-primary{background:var(--bs-primary,#d300b0);color:#fff}.cbt-soft{background:#f1f5f9;color:#0f172a}.cbt-gold{background:#f7c948;color:#221827}
        .cbt-table-wrap{overflow:auto}.cbt-table{width:100%;min-width:780px;border-collapse:separate;border-spacing:0}.cbt-table th{background:#f8fafc;color:#64748b;text-transform:uppercase;font-size:11px;letter-spacing:.08em;padding:12px;border-bottom:1px solid #e5e7eb}.cbt-table td{padding:13px 12px;border-bottom:1px solid #eef2f7;vertical-align:top}
        .cbt-title{font-weight:900;color:#111827}.cbt-sub{color:#64748b;font-size:12px}.cbt-pill{display:inline-flex;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900;background:#eef2ff;color:#3730a3;text-transform:capitalize}.cbt-license{background:#0f172a;color:#e2e8f0;border-radius:12px;padding:12px;margin-top:12px;white-space:pre-wrap;overflow:auto;max-height:240px}
        @media(max-width:1199px){.cbt-main{margin-left:0;width:100%;padding:92px 16px 28px}.cbt-grid{grid-template-columns:1fr}.cbt-hero{align-items:flex-start;flex-direction:column}}
      `}</style>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="CBT Exams" />
      <PageTitle title="CBT Exams" />
      <div className="container-fluid"><div className="row"><Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="cbt-main">{loading && <Loader message="Loading CBT module..." />}<div className="cbt-shell">
          <section className="cbt-hero">
            <div><span className="cbt-eyebrow"><i className="bi bi-pc-display-horizontal" /> Online and Offline CBT</span><h1>Computer Based Tests</h1><p>Create school exams that support normal questions, grouped instructions, and comprehension passages. Offline CBT licenses are used for LAN exams when internet is unstable.</p></div>
            <button className="cbt-btn cbt-soft" onClick={load}><i className="bi bi-arrow-repeat" /> Refresh</button>
          </section>
          <section className="cbt-grid">
            <form className="cbt-panel" onSubmit={createExam}>
              <div className="cbt-head"><h2>Create exam</h2><p>Start with exam details. Questions and comprehension groups are added from the exam builder.</p></div>
              <div className="cbt-body">
                <label className="cbt-label">Exam title</label><input className="cbt-input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required placeholder="e.g. English Language CBT" />
                <label className="cbt-label">Mode</label><select className="cbt-select" value={form.delivery_mode} onChange={(e) => setForm((p) => ({ ...p, delivery_mode: e.target.value }))}><option value="online">Online</option><option value="offline">Offline/LAN</option><option value="hybrid">Online and Offline</option></select>
                <label className="cbt-label">Duration minutes</label><input className="cbt-input" type="number" min={1} value={form.duration_minutes} onChange={(e) => setForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))} />
                <label className="cbt-label">General instructions</label><textarea className="cbt-textarea" value={form.general_instructions} onChange={(e) => setForm((p) => ({ ...p, general_instructions: e.target.value }))} placeholder="Instructions shown before students start." />
                <button className="cbt-btn cbt-primary" disabled={saving}><i className="bi bi-plus-circle" /> {saving ? "Saving" : "Create CBT Exam"}</button>
              </div>
            </form>
            <div>
              <section className="cbt-panel">
                <div className="cbt-head"><h2>Exam list</h2><p>Published exams become available to assigned students.</p></div>
                <div className="cbt-table-wrap"><table className="cbt-table"><thead><tr><th>Exam</th><th>Mode</th><th>Status</th><th>Questions</th><th>Attempts</th><th>Action</th></tr></thead><tbody>{exams.length === 0 ? <tr><td colSpan={6} className="text-muted">No CBT exam has been created yet.</td></tr> : exams.map((exam) => <tr key={exam.id}><td><div className="cbt-title">{exam.title}</div><div className="cbt-sub">{exam.exam_code || `Exam #${exam.id}`} - {exam.duration_minutes} mins</div></td><td><span className="cbt-pill">{exam.delivery_mode}</span></td><td><span className="cbt-pill">{exam.status}</span></td><td>{exam.questions_count ?? 0}</td><td>{exam.attempts_count ?? 0}</td><td>{exam.status === "draft" ? <button className="cbt-btn cbt-gold" disabled={saving} onClick={() => publishExam(exam.id)}><i className="bi bi-send" /> Publish</button> : <span className="cbt-sub">Published/closed</span>}</td></tr>)}</tbody></table></div>
              </section>
              <section className="cbt-panel mt-3">
                <div className="cbt-head"><h2>Offline CBT license</h2><p>Generate a signed license for a local computer that will serve exams over school WiFi.</p></div>
                <div className="cbt-body">
                  <label className="cbt-label">License days</label><input className="cbt-input" type="number" min={1} max={365} value={licenseDays} onChange={(e) => setLicenseDays(Number(e.target.value))} />
                  <button className="cbt-btn cbt-primary" disabled={saving} onClick={generateLicense}><i className="bi bi-key" /> Generate Offline License</button>
                  {licensePayload && <pre className="cbt-license">{JSON.stringify(licensePayload, null, 2)}</pre>}
                </div>
              </section>
            </div>
          </section>
          <Footer />
        </div></main>
      </div></div>
    </>
  );
}
