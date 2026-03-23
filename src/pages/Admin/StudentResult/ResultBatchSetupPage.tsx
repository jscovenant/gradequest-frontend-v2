// src/pages/Admin/StudentResult/ResultBatchSetupPage.tsx
import  { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";

import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";

type StudentClass = { id: number; name: string };
type Term = { id: number; name: string };
type Session = { id: number; name: string };
type Department = { id: number; name: string };
type Section = { id: number; name: string };

type ResolveBatchResponse = {
  batch: {
    id: number;
    school_id: number;
    class_id: number;
    term: string;
    session: string;
    status: string;
  };
  active_term?: string;
};

const LS_KEY = "gq_result_batch_setup_v1";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function ResultBatchSetupPage() {
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning, showInfo } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // overall loading
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [resolving, setResolving] = useState(false);

  // role (optional UI hint)
  const [userRole, setUserRole] = useState<string>("");

  // dropdown data
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  // form state
  const [classId, setClassId] = useState<number | "">("");
  const [term, setTerm] = useState<string>("");
  const [session, setSession] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [sectionId, setSectionId] = useState<number | "">("");

  // restore last selection
  useEffect(() => {
    const saved = safeParse<{
      classId: number | "";
      term: string;
      session: string;
      departmentId: number | "";
      sectionId: number | "";
    }>(localStorage.getItem(LS_KEY));

    if (saved) {
      setClassId(saved.classId ?? "");
      setTerm(saved.term ?? "");
      setSession(saved.session ?? "");
      setDepartmentId(saved.departmentId ?? "");
      setSectionId(saved.sectionId ?? "");
    }
  }, []);

  // persist selection
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ classId, term, session, departmentId, sectionId }));
  }, [classId, term, session, departmentId, sectionId]);

  // boot loader
  useEffect(() => {
    const t = window.setTimeout(() => setLoadingPage(false), 120);
    return () => window.clearTimeout(t);
  }, []);

  // fetch dropdowns
  useEffect(() => {
    let mounted = true;

    async function boot() {
      setLoadingMeta(true);
      try {
        const [clsRes, termRes, sesRes] = await Promise.all([
          authApi.get("/fstudent-classes"),
          authApi.get("/fterms"),
          authApi.get("/facademic-sessions"),
        ]);

        if (!mounted) return;

        // ✅ support both response shapes:
        // 1) old: []
        // 2) new: { classes: [], user_role: "Teacher"|"Admin" }
        const clsPayload = clsRes.data;
        const clsList: StudentClass[] = Array.isArray(clsPayload) ? clsPayload : clsPayload?.classes ?? [];
        const role = Array.isArray(clsPayload) ? "" : clsPayload?.user_role ?? "";

        setClasses(clsList);
        setUserRole(role);

        setTerms(termRes.data?.data ?? termRes.data ?? []);

        const rawSessions = sesRes.data?.data ?? sesRes.data ?? [];
        const normalized: Session[] = rawSessions.map((s: any) => ({
          id: s.id,
          name: s.name ?? s.session ?? s.title ?? "",
        }));
        setSessions(normalized);

        // optional endpoints
        try {
          const deptRes = await authApi.get("/fdepartments");
          if (!mounted) return;
          setDepartments(deptRes.data?.data ?? deptRes.data ?? []);
        } catch {
          if (!mounted) return;
          setDepartments([]);
        }

        try {
          const secRes = await authApi.get("/fsections");
          if (!mounted) return;
          setSections(secRes.data?.data ?? secRes.data ?? []);
        } catch {
          if (!mounted) return;
          setSections([]);
        }

        // If saved classId is no longer allowed (teacher switched class), reset it safely
        setClassId((prev) => {
          if (!prev) return prev;
          const stillAllowed = clsList.some((c) => c.id === prev);
          return stillAllowed ? prev : "";
        });
      } catch (e: any) {
        console.error(e);
        showError?.(e?.response?.data?.message || "Failed to load batch setup data.");
      } finally {
        if (mounted) setLoadingMeta(false);
      }
    }

    boot();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isTeacher = useMemo(() => String(userRole) === "Teacher", [userRole]);

  const canContinue = useMemo(() => !!classId && !!term && !!session, [classId, term, session]);

  const selectedClassName = useMemo(() => {
    if (!classId) return "—";
    return classes.find((c) => c.id === classId)?.name ?? "—";
  }, [classId, classes]);

  const selectedDeptName = useMemo(() => {
    if (!departmentId) return "—";
    return departments.find((d) => d.id === departmentId)?.name ?? "—";
  }, [departmentId, departments]);

  const selectedSectionName = useMemo(() => {
    if (!sectionId) return "—";
    return sections.find((s) => s.id === sectionId)?.name ?? "—";
  }, [sectionId, sections]);

  const clearSavedContext = () => {
    localStorage.removeItem(LS_KEY);
    setClassId("");
    setTerm("");
    setSession("");
    setDepartmentId("");
    setSectionId("");
    showInfo?.("Saved selection cleared.");
  };

  const handleResolveBatch = async () => {
    if (!canContinue) return showWarning?.("Please select Class, Term and Session.");

    setResolving(true);
    try {
      const payload: any = { class_id: classId, term, session };
      if (departmentId) payload.department_id = departmentId;
      if (sectionId) payload.section_id = sectionId;

      const { data } = await authApi.post<ResolveBatchResponse>("/result-batches/resolve", payload);

      const batchId = data?.batch?.id;
      if (!batchId) return showError?.("Batch resolved but no batch id returned.");

      showSuccess?.(`Batch ready (#${batchId}) ✅`);
      navigate(`/results/upload?batchId=${batchId}`);
    } catch (e: any) {
      console.error(e);
      showError?.(e?.response?.data?.message || "Failed to prepare batch.");
    } finally {
      setResolving(false);
    }
  };

  return (
    <>
      <style>{`
        /* Uses the same AdminDashboard template styling (trimmed to what this page needs) */
        .db-main {
          background: var(--bs-body-bg, #f5f1eb);
          min-height: 100vh;
          font-family: "DM Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          padding: 28px 28px 0;
        }
        @media (max-width: 991.98px) { .db-main { padding: 18px 14px 0; } }

        .db-hero {
          background: #0f172a;
          border-radius: 16px;
          padding: 32px 36px;
          position: relative;
          overflow: hidden;
          margin: 10px 0 18px;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .db-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
        }
        .db-hero-glow {
          position: absolute;
          top: -60px;
          right: -60px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(201, 168, 76, 0.10) 0%, transparent 65%);
          pointer-events: none;
        }
        .db-hero-glow2 {
          position: absolute;
          bottom: -40px;
          left: 30%;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .db-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 28px;
          flex-wrap: wrap;
        }

        .db-session-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #e8c97a;
          background: rgba(201, 168, 76, 0.10);
          border: 1px solid rgba(201, 168, 76, 0.22);
          border-radius: 100px;
          padding: 4px 12px;
          margin-bottom: 14px;
        }
        .db-session-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          animation: dbPulse 2s ease infinite;
        }
        @keyframes dbPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.5); }
        }

        .db-greeting {
          font-family: "Lora", Georgia, serif;
          font-size: clamp(22px, 2.5vw, 32px);
          font-weight: 700;
          color: #fff;
          line-height: 1.1;
          margin-bottom: 8px;
        }
        .db-greeting em { font-style: italic; color: #e8c97a; }

        .db-hero-sub {
          font-size: 13.5px;
          font-weight: 300;
          color: #64748b;
          line-height: 1.65;
          max-width: 760px;
          margin-bottom: 16px;
          opacity: 0.95;
        }

        .db-hero-btns { display: flex; gap: 10px; flex-wrap: wrap; }

        .db-btn-gold {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
          background: #c9a84c;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
          white-space: nowrap;
        }
        .db-btn-gold:hover { background: #e8c97a; transform: translateY(-1px); }
        .db-btn-gold:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        .db-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.75);
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
          white-space: nowrap;
        }
        .db-btn-outline:hover { background: rgba(255, 255, 255, 0.06); color: #fff; border-color: rgba(255, 255, 255, 0.28); }
        .db-btn-outline:disabled { opacity: 0.55; cursor: not-allowed; }

        .db-hero-stat-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.09);
          backdrop-filter: blur(8px);
          border-radius: 14px;
          padding: 18px 20px;
          min-width: 280px;
        }
        @media (max-width: 991.98px) { .db-hero { padding: 24px 20px; } .db-hero-stat-card { min-width: 0; width: 100%; } }
        .db-hero-stat-row { display: flex; flex-direction: column; gap: 10px; }
        .db-hero-stat-item { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .db-hero-stat-label { font-size: 12px; font-weight: 300; color: #64748b; }
        .db-hero-stat-val { font-family: "Lora", serif; font-size: 18px; font-weight: 700; color: #fff; }
        .db-hero-stat-sep { height: 1px; background: rgba(255, 255, 255, 0.06); }

        .db-grid {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 20px;
          margin-bottom: 24px;
        }
        @media (max-width: 991.98px) { .db-grid { grid-template-columns: 1fr; } }

        .db-panel {
          background: #fff;
          border: 1px solid #ede8e0;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(15,23,42,0.04);
        }
        .db-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 18px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          gap: 12px;
          flex-wrap: wrap;
        }
        .db-panel-title {
          font-family: "Lora", serif;
          font-size: 16px;
          font-weight: 800;
          color: #1a1a2e;
          margin: 0;
        }
        .db-panel-sub {
          font-size: 11.5px;
          font-weight: 300;
          color: #9a8a7a;
          margin: 0;
        }

        .db-refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 600;
          color: #7a6a5a;
          background: #f5f1eb;
          border: 1px solid #e5ddd3;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.2s;
          white-space: nowrap;
        }
        .db-refresh-btn:hover { background: #ede8e0; }
        .db-refresh-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .db-muted { color: #9a8a7a; }
        .db-strong { font-weight: 900; color: #1a1a2e; }

        .db-input, .db-select {
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid #e5ddd3;
          outline: none;
          font-size: 13px;
          background: #fff;
        }
        .db-input:focus, .db-select:focus { border-color: rgba(201,168,76,0.7); box-shadow: 0 0 0 3px rgba(201,168,76,0.18); }

        .db-alert {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 12px;
          padding: 11px 14px;
          font-size: 13px;
          color: #9a3412;
        }
        .db-alert--info {
          background: #eef2ff;
          border-color: rgba(99,102,241,0.25);
          color: #3730a3;
        }
        .db-alert--warn {
          background: rgba(245, 158, 11, 0.10);
          border-color: rgba(245, 158, 11, 0.25);
          color: #92400e;
        }

        .db-pill {
          display: inline-flex;
          align-items: center;
          font-size: 12px;
          font-weight: 800;
          padding: 6px 10px;
          border-radius: 999px;
          white-space: nowrap;
          border: 1px solid rgba(0,0,0,0.06);
        }

        .db-kv {
          display: grid;
          gap: 10px;
          margin-top: 12px;
        }
        .db-kv-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 12px;
          background: #faf8f5;
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Result Batch" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {(loadingPage || resolving) && (
              <Loader message={loadingPage ? "Preparing Batch Setup..." : "Preparing batch…"} />
            )}

            {/* HERO (AdminDashboard style) */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Results • Batch Setup
                  </div>

                  <h1 className="db-greeting">
                    {getGreeting()}, <em>{isTeacher ? "Teacher" : "Admin"}.</em>
                  </h1>

                  <p className="db-hero-sub">
                    Select <b>Class</b>, <b>Term</b> and <b>Session</b> to resolve a result batch, then proceed to upload results.
                    {isTeacher ? " You will only see classes assigned to you." : ""}
                  </p>

                  <div className="db-hero-btns">
                    <button className="db-btn-gold" onClick={handleResolveBatch} disabled={!canContinue || resolving || loadingMeta}>
                      <i className="bi bi-arrow-right-circle" />
                      Start Uploading Results
                    </button>

                    <button className="db-btn-outline" onClick={clearSavedContext} disabled={resolving}>
                      <i className="bi bi-eraser" />
                      Clear selection
                    </button>

                    <button className="db-btn-outline" onClick={() => navigate("/results/upload")} disabled={resolving}>
                      <i className="bi bi-upload" />
                      Go to upload
                    </button>
                  </div>
                </div>

                <div className="db-hero-stat-card d-none d-md-block">
                  <div className="db-hero-stat-row">
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Classes</span>
                      <span className="db-hero-stat-val">{loadingMeta ? "…" : classes.length}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Terms</span>
                      <span className="db-hero-stat-val">{loadingMeta ? "…" : terms.length}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Sessions</span>
                      <span className="db-hero-stat-val">{loadingMeta ? "…" : sessions.length}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Selected class</span>
                      <span className="db-hero-stat-val">{selectedClassName}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CONTENT */}
            {loadingMeta ? (
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <p className="db-panel-title">Loading setup…</p>
                    <p className="db-panel-sub">Fetching classes, terms and sessions</p>
                  </div>
                </div>
                <div style={{ padding: 16 }}>
                  <div className="db-muted" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="spinner-border spinner-border-sm" role="status" />
                    Please wait…
                  </div>
                </div>
              </div>
            ) : (
              <div className="db-grid">
                {/* LEFT PANEL (FORM) */}
                <div className="db-panel">
                  <div className="db-panel-head">
                    <div>
                      <p className="db-panel-title">Batch context</p>
                      <p className="db-panel-sub">This selection will be used to resolve the result batch</p>
                    </div>

                    <button className="db-refresh-btn" onClick={clearSavedContext} disabled={resolving}>
                      <i className="bi bi-eraser-fill" />
                      Clear saved
                    </button>
                  </div>

                  <div style={{ padding: 16, display: "grid", gap: 12 }}>
                    {isTeacher ? (
                      <div className="db-alert db-alert--warn">
                        <i className="bi bi-exclamation-triangle-fill" />
                        <div>
                          <div style={{ fontWeight: 900, marginBottom: 2 }}>Teacher restriction</div>
                          <div style={{ opacity: 0.85 }}>
                            You can only prepare batches for classes assigned to you by the admin.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="db-alert db-alert--info">
                        <i className="bi bi-info-circle-fill" />
                        <div>
                          <div style={{ fontWeight: 900, marginBottom: 2 }}>Tip</div>
                          <div style={{ opacity: 0.85 }}>
                            Prepare once, upload for all students, then compute positions/averages once per batch.
                          </div>
                        </div>
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <div className="db-muted" style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                          Class *
                        </div>
                        <select
                          className="db-select"
                          value={classId}
                          onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : "")}
                          disabled={resolving}
                        >
                          <option value="">-- Select Class --</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>

                        {isTeacher && classes.length === 0 ? (
                          <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 6 }}>
                            No class assigned to you yet. Ask admin to assign your class.
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <div className="db-muted" style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                          Term *
                        </div>
                        <select className="db-select" value={term} onChange={(e) => setTerm(e.target.value)} disabled={resolving}>
                          <option value="">-- Select Term --</option>
                          {terms.map((t) => (
                            <option key={t.id} value={t.name}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="db-muted" style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                          Session *
                        </div>
                        <select className="db-select" value={session} onChange={(e) => setSession(e.target.value)} disabled={resolving}>
                          <option value="">-- Select Session --</option>
                          {sessions.map((s) => (
                            <option key={s.id} value={s.name}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="db-muted" style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                          Department (optional)
                        </div>
                        <select
                          className="db-select"
                          value={departmentId}
                          onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : "")}
                          disabled={resolving || departments.length === 0}
                          title={departments.length === 0 ? "Departments not configured" : ""}
                        >
                          <option value="">{departments.length ? "-- Select Department --" : "Not configured"}</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="db-muted" style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                          Section (optional)
                        </div>
                        <select
                          className="db-select"
                          value={sectionId}
                          onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : "")}
                          disabled={resolving || sections.length === 0}
                          title={sections.length === 0 ? "Sections not configured" : ""}
                        >
                          <option value="">{sections.length ? "-- Select Section --" : "Not configured"}</option>
                          {sections.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "4px 0" }} />

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button className="db-refresh-btn" onClick={handleResolveBatch} disabled={!canContinue || resolving}>
                        {resolving ? (
                          <>
                            <span className="spinner-border spinner-border-sm" role="status" />
                            Preparing…
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check2-circle" />
                            Resolve batch
                          </>
                        )}
                      </button>

                      <button className="db-btn-gold" onClick={handleResolveBatch} disabled={!canContinue || resolving}>
                        <i className="bi bi-arrow-right-circle-fill" />
                        Start Uploading Results
                      </button>
                    </div>

                    {!canContinue ? (
                      <div className="db-muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
                        Please select <b>Class</b>, <b>Term</b>, and <b>Session</b> to continue.
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* RIGHT PANEL (PREVIEW) */}
                <div className="db-panel" style={{ alignSelf: "start" }}>
                  <div className="db-panel-head">
                    <div>
                      <p className="db-panel-title">Selected context</p>
                      <p className="db-panel-sub">Preview of what will be used</p>
                    </div>

                    <span className="db-pill" style={{ background: "rgba(180,83,9,0.08)", color: "#b45309" }}>
                      Preview
                    </span>
                  </div>

                  <div style={{ padding: 16 }}>
                    <div className="db-kv">
                      <div className="db-kv-row">
                        <span className="db-muted">Class</span>
                        <span className="db-strong">{selectedClassName}</span>
                      </div>
                      <div className="db-kv-row">
                        <span className="db-muted">Term</span>
                        <span className="db-strong">{term || "—"}</span>
                      </div>
                      <div className="db-kv-row">
                        <span className="db-muted">Session</span>
                        <span className="db-strong">{session || "—"}</span>
                      </div>
                      <div className="db-kv-row">
                        <span className="db-muted">Department</span>
                        <span className="db-strong">{selectedDeptName}</span>
                      </div>
                      <div className="db-kv-row">
                        <span className="db-muted">Section</span>
                        <span className="db-strong">{selectedSectionName}</span>
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }} className="db-alert">
                      <i className="bi bi-shield-check" />
                      <div>
                        <div style={{ fontWeight: 900, marginBottom: 2 }}>Note</div>
                        <div style={{ opacity: 0.85 }}>
                          After uploading for all students, compute positions/averages once per batch.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                      <button className="db-refresh-btn" onClick={clearSavedContext} disabled={resolving}>
                        <i className="bi bi-eraser-fill" />
                        Clear selection
                      </button>

                      <button
                        className="db-btn-gold"
                        onClick={handleResolveBatch}
                        disabled={!canContinue || resolving}
                        title={!canContinue ? "Select Class, Term and Session first" : ""}
                      >
                        <i className="bi bi-arrow-right-circle-fill" />
                        Continue to upload
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-auto">
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}