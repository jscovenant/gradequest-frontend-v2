import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";

type BatchStatus = "draft" | "computed" | "approved" | "published" | string;

type ReviewBatch = {
  id: number;
  school_id?: number;
  class_id: number;
  class_name: string;
  term: string;
  session: string;
  status: BatchStatus;
  updated_at?: string | null;
  submission_deadline?: string | null;
  review?: ReviewSummary;
};

type ReviewSummary = {
  total_students: number;
  completed_students: number;
  missing_students_count: number;
  open_alerts: number;
  open_high_alerts: number;
  can_approve: boolean;
  can_publish: boolean;
  is_complete: boolean;
  simple_status: string;
  missing_students?: Array<{ id: number; firstname?: string; surname?: string; reg_no?: string }>;
};

type BatchStudent = {
  id: number;
  reg_no: string;
  firstname: string;
  surname: string;
  status: "completed" | "pending" | string;
  saved_at?: string | null;
};

type TermOption = { id: number; name: string };
type SessionOption = { id: number; name: string };

function nameOf(student: BatchStudent | { firstname?: string; surname?: string }) {
  return [student.firstname, student.surname].filter(Boolean).join(" ") || "Unnamed student";
}

function normalizeStatus(status?: string) {
  const s = String(status || "draft").toLowerCase();
  if (s === "draft") return "Still entering";
  if (s === "computed") return "Ready for review";
  if (s === "approved") return "Approved";
  if (s === "published") return "Published";
  return "Needs attention";
}

function statusClass(status?: string) {
  const s = String(status || "draft").toLowerCase();
  if (s === "published") return "published";
  if (s === "approved") return "approved";
  if (s === "computed") return "computed";
  return "draft";
}

function formatDate(value?: string | null) {
  if (!value) return "Not yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not yet";
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function progressOf(batch?: ReviewBatch | null) {
  const review = batch?.review;
  const total = Number(review?.total_students || 0);
  const done = Number(review?.completed_students || 0);
  return total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
}

export default function AdminResultReviewPage() {
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [pageLoading, setPageLoading] = useState(true);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [batches, setBatches] = useState<ReviewBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [students, setStudents] = useState<BatchStudent[]>([]);

  const [terms, setTerms] = useState<TermOption[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [term, setTerm] = useState("");
  const [session, setSession] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === selectedBatchId) || null,
    [batches, selectedBatchId]
  );

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((student) =>
      `${student.firstname} ${student.surname} ${student.reg_no}`.toLowerCase().includes(q)
    );
  }, [students, search]);

  const completedStudents = students.filter((student) => student.status === "completed").length;
  const pendingStudents = Math.max(0, students.length - completedStudents);
  const progress = progressOf(selectedBatch);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      setPageLoading(true);
      try {
        const [currentRes, termRes, sessionRes] = await Promise.allSettled([
          authApi.get("/current-session-term"),
          authApi.get("/fterms"),
          authApi.get("/facademic-sessions"),
        ]);

        if (!mounted) return;

        let defaultTerm = "";
        let defaultSession = "";

        if (currentRes.status === "fulfilled") {
          defaultTerm = currentRes.value.data?.term || "";
          defaultSession = currentRes.value.data?.session || "";
          setTerm(defaultTerm);
          setSession(defaultSession);
        }

        if (termRes.status === "fulfilled") {
          setTerms(termRes.value.data?.data ?? termRes.value.data ?? []);
        }

        if (sessionRes.status === "fulfilled") {
          const raw = sessionRes.value.data?.data ?? sessionRes.value.data ?? [];
          setSessions(raw.map((item: any) => ({ id: item.id, name: item.name ?? item.session ?? "" })));
        }

        await loadBatches(defaultTerm, defaultSession, "all");
      } catch (e: any) {
        setError(e?.response?.data?.message || "Unable to load result review data.");
      } finally {
        if (mounted) setPageLoading(false);
      }
    }

    boot();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedBatchId) {
      setStudents([]);
      return;
    }
    void loadStudents(selectedBatchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBatchId]);

  async function loadBatches(nextTerm = term, nextSession = session, nextStatus = status) {
    setLoadingBatches(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (nextTerm) params.term = nextTerm;
      if (nextSession) params.session = nextSession;
      if (nextStatus && nextStatus !== "all") params.status = nextStatus;

      const { data } = await authApi.get("/admin/result-batches", { params });
      const list: ReviewBatch[] = Array.isArray(data?.data) ? data.data : [];
      const enriched = await Promise.all(
        list.map(async (batch) => {
          try {
            const summary = await authApi.get(`/result-batches/${batch.id}/review-summary`);
            return { ...batch, ...summary.data.batch, review: summary.data.review };
          } catch {
            return batch;
          }
        })
      );

      setBatches(enriched);
      setSelectedBatchId((current) => {
        if (current && enriched.some((batch) => batch.id === current)) return current;
        return enriched[0]?.id ?? null;
      });
    } catch (e: any) {
      setBatches([]);
      setSelectedBatchId(null);
      setError(e?.response?.data?.message || "Unable to load result batches.");
    } finally {
      setLoadingBatches(false);
    }
  }

  async function loadStudents(batchId: number) {
    setLoadingStudents(true);
    setError(null);
    try {
      const { data } = await authApi.get(`/result-batches/${batchId}/students`);
      setStudents(Array.isArray(data?.data) ? data.data : []);
    } catch (e: any) {
      setStudents([]);
      setError(e?.response?.data?.message || "Unable to load students in this result batch.");
    } finally {
      setLoadingStudents(false);
    }
  }

  async function refreshSelectedBatch() {
    if (!selectedBatchId) return;
    try {
      const summary = await authApi.get(`/result-batches/${selectedBatchId}/review-summary`);
      setBatches((items) =>
        items.map((batch) =>
          batch.id === selectedBatchId ? { ...batch, ...summary.data.batch, review: summary.data.review } : batch
        )
      );
      await loadStudents(selectedBatchId);
    } catch {
      await loadBatches();
    }
  }

  async function runBatchAction(action: "compute" | "approve" | "publish" | "reopen") {
    if (!selectedBatch) return;

    if (action === "approve" && !selectedBatch.review?.can_approve) {
      showWarning?.("This result is not ready for approval. Check missing students or serious alerts first.");
      return;
    }

    if (action === "publish" && !selectedBatch.review?.can_publish) {
      showWarning?.("This result is not ready to publish yet.");
      return;
    }

    setBusyAction(action);
    try {
      await authApi.post(`/result-batches/${selectedBatch.id}/${action}`);
      showSuccess?.(
        action === "compute"
          ? "Result totals and positions updated."
          : action === "approve"
          ? "Result approved successfully."
          : action === "publish"
          ? "Result published for parents and students."
          : "Result reopened for correction."
      );
      await refreshSelectedBatch();
    } catch (e: any) {
      showError?.(e?.response?.data?.message || `Unable to ${action} this result.`);
    } finally {
      setBusyAction(null);
    }
  }

  function openStudentResult(student: BatchStudent) {
    if (!selectedBatch) return;

    const params = new URLSearchParams({
      student_id: String(student.id),
      class_id: String(selectedBatch.class_id),
      term: String(selectedBatch.term),
      session: String(selectedBatch.session),
      school_id: String(selectedBatch.school_id),
    });

    navigate(`/students/results/show?${params.toString()}`, {
      state: {
        studentId: student.id,
        classId: selectedBatch.class_id,
        term: selectedBatch.term,
        session: selectedBatch.session,
        schoolId: selectedBatch.school_id,
      },
    });
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .rr-main {
          min-height: 100vh;
          margin-left: 280px;
          width: calc(100% - 280px);
          padding: max(96px, calc(78px + env(safe-area-inset-top))) 28px 40px;
          background: #F8FAFC;
          color: #0F172A;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        }
        @media(max-width: 1199px) {
          .rr-main {
            margin-left: 0;
            width: 100%;
            padding: max(88px, calc(72px + env(safe-area-inset-top))) 16px 32px;
          }
        }
        .rr-shell { max-width: 100%; margin: 0 auto; }
        .rr-hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 18px;
          padding: 32px 36px;
          color: #fff;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
          position: relative;
          overflow: hidden;
        }
        .rr-hero-glow {
          position: absolute;
          top: -60px;
          right: -60px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.15) 0%, transparent 65%);
          pointer-events: none;
        }
        .rr-hero>* { position: relative; z-index: 1; }
        .rr-eyebrow {
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
        .rr-title {
          font-size: 26px;
          font-weight: 800;
          line-height: 1.1;
          margin: 0 0 8px;
          color: #fff;
        }
        .rr-sub {
          max-width: 720px;
          margin: 0;
          color: #CBD5E1;
          font-size: 13.5px;
          line-height: 1.6;
        }
        .rr-hero-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
        .rr-btn {
          border: 0;
          border-radius: 10px;
          padding: 9px 16px;
          font-weight: 700;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 40px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .rr-btn:hover { transform: translateY(-1px); }
        .rr-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
        .rr-btn-gold { background: #D97706; color: #FFFFFF; }
        .rr-btn-gold:hover { background: #B45309; }
        .rr-btn-dark { background: #0F2744; color: #fff; }
        .rr-btn-dark:hover { background: #1E3A8A; }
        .rr-btn-soft { background: #F1F5F9; color: #0F2744; border: 1px solid #E2E8F0; }
        .rr-btn-soft:hover { background: #E2E8F0; }
        .rr-btn-light { background: rgba(255,255,255,0.10); color: #fff; border: 1px solid rgba(255,255,255,0.20); }
        .rr-btn-light:hover { background: rgba(255,255,255,0.18); color: #fff; }
        .rr-filter { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; margin: 20px 0; }
        .rr-field { background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; padding: 10px 14px; box-shadow: 0 2px 8px rgba(15,39,68,0.02); }
        .rr-label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #64748B; margin-bottom: 6px; }
        .rr-select, .rr-input { width: 100%; border: 0; outline: 0; background: transparent; color: #0F2744; font-weight: 700; font-size: 13.5px; min-height: 24px; }
        .rr-grid { display: grid; grid-template-columns: minmax(310px, 390px) minmax(0, 1fr); gap: 20px; align-items: start; }
        .rr-panel { background: #fff; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 4px 16px rgba(15,39,68,0.03); overflow: hidden; }
        .rr-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 20px; border-bottom: 1px solid #E2E8F0; }
        .rr-panel-title { margin: 0; color: #0F2744; font-size: 16px; font-weight: 800; }
        .rr-panel-sub { margin: 2px 0 0; color: #64748B; font-size: 12px; }
        .rr-batch-list { padding: 14px; display: flex; flex-direction: column; gap: 10px; max-height: 720px; overflow-y: auto; }
        .rr-batch-card { width: 100%; text-align: left; border: 1px solid #E2E8F0; background: #fff; border-radius: 12px; padding: 14px 16px; cursor: pointer; transition: all 0.2s ease; }
        .rr-batch-card:hover, .rr-batch-card.active { border-color: #D97706; box-shadow: 0 4px 16px rgba(217,119,6,0.10); transform: translateY(-1px); }
        .rr-batch-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
        .rr-class { font-weight: 800; color: #0F2744; font-size: 14.5px; margin: 0; }
        .rr-meta { color: #64748B; font-size: 12px; margin: 4px 0 0; }
        .rr-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; }
        .rr-badge.draft { background: #FEF3C7; color: #92400E; }
        .rr-badge.computed { background: #EEF2FF; color: #3730A3; }
        .rr-badge.approved { background: #F3E8FF; color: #6B21A8; }
        .rr-badge.published { background: #DCFCE7; color: #166534; }
        .rr-mini-progress { margin-top: 12px; }
        .rr-progress-line { display: flex; align-items: center; justify-content: space-between; color: #64748B; font-size: 11.5px; font-weight: 700; margin-bottom: 6px; }
        .rr-track { height: 6px; border-radius: 999px; background: #E2E8F0; overflow: hidden; }
        .rr-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #D97706, #FBBF24); }
        .rr-detail-head { padding: 20px 22px; border-bottom: 1px solid #E2E8F0; display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 18px; align-items: center; }
        .rr-detail-title { font-size: 20px; font-weight: 800; color: #0F2744; margin: 0; }
        .rr-detail-sub { color: #64748B; font-size: 13px; margin: 4px 0 0; }
        .rr-kpis { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; padding: 16px 20px; border-bottom: 1px solid #E2E8F0; background: #F8FAFC; }
        .rr-kpi { background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px; }
        .rr-kpi-label { font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em; margin: 0 0 6px; }
        .rr-kpi-value { font-size: 22px; color: #0F2744; font-weight: 800; margin: 0; }
        .rr-status-note { margin: 16px 20px 0; padding: 12px 14px; border-radius: 12px; background: #EFF6FF; border: 1px solid #BFDBFE; color: #1E40AF; font-size: 13px; line-height: 1.6; display: flex; gap: 10px; align-items: flex-start; }
        .rr-action-row { display: flex; gap: 10px; flex-wrap: wrap; padding: 16px 20px; border-bottom: 1px solid #E2E8F0; }
        .rr-student-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px; border-bottom: 1px solid #E2E8F0; }
        .rr-search { width: min(360px, 100%); border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px; font-size: 13px; outline: 0; background: #F8FAFC; color: #0F2744; font-weight: 600; }
        .rr-search:focus { border-color: #D97706; background: #fff; }
        .rr-table-wrap { overflow-x: auto; }
        .rr-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 760px; }
        .rr-table th { background: #F8FAFC; color: #64748B; text-transform: uppercase; font-size: 11px; letter-spacing: 0.04em; font-weight: 700; padding: 12px 16px; border-bottom: 1px solid #E2E8F0; }
        .rr-table td { padding: 14px 16px; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #334155; vertical-align: middle; }
        .rr-student-name { font-weight: 700; color: #0F2744; }
        .rr-muted { color: #64748B; font-size: 12px; }
        .rr-student-status { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .rr-student-status.completed { background: #DCFCE7; color: #166534; }
        .rr-student-status.pending { background: #FEF3C7; color: #92400E; }
        .rr-empty { padding: 40px 20px; text-align: center; color: #64748B; }
        .rr-empty i { font-size: 32px; color: #94A3B8; display: block; margin-bottom: 8px; }
        .rr-error { margin: 0 0 14px; padding: 12px 14px; border-radius: 12px; background: #FEE2E2; border: 1px solid #FECACA; color: #991B1B; font-size: 13px; display: flex; gap: 8px; align-items: center; }
        .rr-skeleton { height: 12px; border-radius: 999px; background: linear-gradient(90deg, #E2E8F0, #F8FAFC, #E2E8F0); background-size: 220% 100%; animation: rrSkel 1.1s infinite linear; }
        @keyframes rrSkel { to { background-position: -220% 0; } }
        @media(max-width: 991px) { .rr-grid { grid-template-columns: 1fr; } .rr-filter { grid-template-columns: repeat(2, minmax(0, 1fr)); } .rr-detail-head { grid-template-columns: 1fr; } .rr-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media(max-width: 640px) { .rr-hero { align-items: flex-start; flex-direction: column; padding: 22px; } .rr-filter { grid-template-columns: 1fr; } .rr-kpis { grid-template-columns: 1fr; } .rr-student-toolbar { align-items: flex-start; flex-direction: column; } .rr-action-row .rr-btn { width: 100%; justify-content: center; } .rr-main { padding-left: 14px; padding-right: 14px; } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Result Review" />
      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="rr-main d-flex flex-column">
            {pageLoading && <Loader message="Preparing result review..." />}
            <div className="rr-shell">
              <section className="rr-hero">
                <div className="rr-hero-glow" />
                <div>
                  <div className="rr-eyebrow"><i className="bi bi-clipboard-check" /> Result Review Center</div>
                  <h1 className="rr-title">Review student results before release.</h1>
                  <p className="rr-sub">
                    Open a class result, check completion, preview each student's report card, review the broadsheet, then approve and publish when everything is correct.
                  </p>
                </div>
                <div className="rr-hero-actions">
                  <button className="rr-btn rr-btn-light" onClick={() => navigate("/students/results/batch")}><i className="bi bi-plus-circle" /> Prepare result</button>
                  <button className="rr-btn rr-btn-gold" onClick={() => navigate("/results/design")}><i className="bi bi-palette" /> Result design</button>
                </div>
              </section>

              <section className="rr-filter">
                <label className="rr-field"><span className="rr-label">Term</span><select className="rr-select" value={term} onChange={(e) => setTerm(e.target.value)}><option value="">All terms</option>{terms.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
                <label className="rr-field"><span className="rr-label">Session</span><select className="rr-select" value={session} onChange={(e) => setSession(e.target.value)}><option value="">All sessions</option>{sessions.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
                <label className="rr-field"><span className="rr-label">Status</span><select className="rr-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All results</option><option value="draft">Still entering</option><option value="computed">Ready for review</option><option value="approved">Approved</option><option value="published">Published</option></select></label>
                <div className="rr-field" style={{ display: "flex", alignItems: "end" }}><button className="rr-btn rr-btn-dark" style={{ width: "100%", justifyContent: "center" }} onClick={() => loadBatches()} disabled={loadingBatches}><i className="bi bi-search" /> {loadingBatches ? "Loading" : "Find results"}</button></div>
              </section>

              {error && <div className="rr-error"><i className="bi bi-exclamation-circle" /> {error}</div>}

              <section className="rr-grid">
                <aside className="rr-panel">
                  <div className="rr-panel-head">
                    <div><h2 className="rr-panel-title">Class Results</h2><p className="rr-panel-sub">Choose the class result to inspect.</p></div>
                    <button className="rr-btn rr-btn-soft" onClick={() => loadBatches()} disabled={loadingBatches}><i className="bi bi-arrow-clockwise" /></button>
                  </div>
                  <div className="rr-batch-list">
                    {loadingBatches && batches.length === 0 ? [1,2,3].map((i) => <div className="rr-batch-card" key={i}><div className="rr-skeleton" style={{ width: "55%" }} /><div className="rr-skeleton" style={{ width: "80%", marginTop: 12 }} /></div>) : batches.length === 0 ? <div className="rr-empty"><i className="bi bi-folder2-open" />No result batch found for this selection.</div> : batches.map((batch) => {
                      const batchProgress = progressOf(batch);
                      return <button key={batch.id} className={`rr-batch-card ${selectedBatchId === batch.id ? "active" : ""}`} onClick={() => setSelectedBatchId(batch.id)}>
                        <div className="rr-batch-top"><div><p className="rr-class">{batch.class_name}</p><p className="rr-meta">{batch.term} - {batch.session}</p></div><span className={`rr-badge ${statusClass(batch.status)}`}>{normalizeStatus(batch.status)}</span></div>
                        <div className="rr-mini-progress"><div className="rr-progress-line"><span>{batch.review?.completed_students ?? 0}/{batch.review?.total_students ?? 0} completed</span><span>{batchProgress}%</span></div><div className="rr-track"><div className="rr-fill" style={{ width: `${batchProgress}%` }} /></div></div>
                      </button>;
                    })}
                  </div>
                </aside>

                <section className="rr-panel">
                  {!selectedBatch ? <div className="rr-empty"><i className="bi bi-clipboard" />Select a class result to view students and actions.</div> : <>
                    <div className="rr-detail-head">
                      <div><h2 className="rr-detail-title">{selectedBatch.class_name}</h2><p className="rr-detail-sub">{selectedBatch.term} - {selectedBatch.session} - Last updated {formatDate(selectedBatch.updated_at)}</p></div>
                      <span className={`rr-badge ${statusClass(selectedBatch.status)}`}>{normalizeStatus(selectedBatch.status)}</span>
                    </div>

                    <div className="rr-kpis">
                      <div className="rr-kpi"><p className="rr-kpi-label">Completion</p><p className="rr-kpi-value">{progress}%</p></div>
                      <div className="rr-kpi"><p className="rr-kpi-label">Entered</p><p className="rr-kpi-value">{completedStudents}</p></div>
                      <div className="rr-kpi"><p className="rr-kpi-label">Pending</p><p className="rr-kpi-value">{pendingStudents}</p></div>
                      <div className="rr-kpi"><p className="rr-kpi-label">Alerts</p><p className="rr-kpi-value">{selectedBatch.review?.open_alerts ?? 0}</p></div>
                    </div>

                    <div className="rr-status-note"><i className="bi bi-info-circle" /> <span>{selectedBatch.review?.simple_status || "Review the class result and student report cards before publishing."}</span></div>

                    <div className="rr-action-row">
                      <button className="rr-btn rr-btn-soft" onClick={() => navigate(`/results/broadsheet/${selectedBatch.id}`)}><i className="bi bi-table" /> Open broadsheet</button>
                      <button className="rr-btn rr-btn-soft" onClick={() => navigate(`/results/upload?batchId=${selectedBatch.id}`)}><i className="bi bi-upload" /> Upload/enter scores</button>
                      <button className="rr-btn rr-btn-dark" onClick={() => runBatchAction("compute")} disabled={busyAction !== null}><i className="bi bi-calculator" /> {busyAction === "compute" ? "Computing" : "Compute"}</button>
                      <button className="rr-btn rr-btn-dark" onClick={() => runBatchAction("approve")} disabled={busyAction !== null || !selectedBatch.review?.can_approve}><i className="bi bi-check2-circle" /> {busyAction === "approve" ? "Approving" : "Approve"}</button>
                      <button className="rr-btn rr-btn-gold" onClick={() => runBatchAction("publish")} disabled={busyAction !== null || !selectedBatch.review?.can_publish}><i className="bi bi-send-check" /> {busyAction === "publish" ? "Publishing" : "Publish"}</button>
                      {String(selectedBatch.status).toLowerCase() === "published" && <button className="rr-btn rr-btn-soft" onClick={() => runBatchAction("reopen")} disabled={busyAction !== null}><i className="bi bi-unlock" /> Reopen</button>}
                    </div>

                    <div className="rr-student-toolbar">
                      <div><h3 className="rr-panel-title" style={{ fontSize: 18 }}>Students in this result</h3><p className="rr-panel-sub">Open any completed student result for report-card preview.</p></div>
                      <input className="rr-search" placeholder="Search student or admission no" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>

                    <div className="rr-table-wrap">
                      <table className="rr-table">
                        <thead><tr><th>#</th><th>Student</th><th>Admission No</th><th>Status</th><th>Saved</th><th>Action</th></tr></thead>
                        <tbody>
                          {loadingStudents ? [1,2,3,4].map((i) => <tr key={i}><td colSpan={6}><div className="rr-skeleton" style={{ width: `${55 + i * 7}%` }} /></td></tr>) : filteredStudents.length === 0 ? <tr><td colSpan={6}><div className="rr-empty"><i className="bi bi-person-lines-fill" />No student found.</div></td></tr> : filteredStudents.map((student, index) => {
                            const completed = student.status === "completed";
                            return <tr key={student.id}>
                              <td>{index + 1}</td>
                              <td><div className="rr-student-name">{nameOf(student)}</div><div className="rr-muted">ID: {student.id}</div></td>
                              <td>{student.reg_no || "-"}</td>
                              <td><span className={`rr-student-status ${completed ? "completed" : "pending"}`}><i className={`bi ${completed ? "bi-check-circle" : "bi-hourglass-split"}`} />{completed ? "Ready" : "Pending"}</span></td>
                              <td>{formatDate(student.saved_at)}</td>
                              <td><button className="rr-btn rr-btn-soft" onClick={() => openStudentResult(student)} disabled={!completed}><i className="bi bi-eye" /> View result</button></td>
                            </tr>;
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>}
                </section>
              </section>
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

