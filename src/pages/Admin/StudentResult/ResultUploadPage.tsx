// src/pages/Results/ResultUploadPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";

import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";

type Batch = {
  id: number;
  school_id: number;
  class_id: number;
  term: string;
  session: string;
  status: "draft" | "computed" | "published" | string;
  created_at?: string;
};

type Student = {
  id: number;
  reg_no: string;
  firstname: string;
  surname: string;
  photo?: string | null;

  status?: "completed" | "pending";
  saved_at?: string | null;
};

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function ResultUploadPage() {
  const query = useQuery();
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useToast();

  const batchId = Number(query.get("batchId") || 0);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [pageLoading, setPageLoading] = useState(true);
  const [batchLoading, setBatchLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(true);

  const [batch, setBatch] = useState<Batch | null>(null);
  const [students, setStudents] = useState<Student[]>([]);

  const [filter, setFilter] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setPageLoading(false), 120);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      if (!batchId || Number.isNaN(batchId)) {
        showWarning?.("Missing batchId in URL. Go back to Batch Setup.");
        setBatchLoading(false);
        setStudentsLoading(false);
        return;
      }

      setBatchLoading(true);
      setStudentsLoading(true);

      try {
        const [bRes, sRes] = await Promise.all([
          authApi.get(`/result-batches/${batchId}`),
          authApi.get(`/result-batches/${batchId}/students`),
        ]);

        if (!mounted) return;

        const b = bRes.data?.batch ?? bRes.data;
        setBatch(b);

        const rawStudents = sRes.data?.data ?? sRes.data ?? [];
        setStudents(Array.isArray(rawStudents) ? rawStudents : []);
      } catch (e: any) {
        console.error(e);
        showError?.(e?.response?.data?.message || "Failed to load batch upload data.");
        setBatch(null);
        setStudents([]);
      } finally {
        if (mounted) {
          setBatchLoading(false);
          setStudentsLoading(false);
        }
      }
    }

    boot();
    return () => {
      mounted = false;
    };
  }, [batchId, showError, showWarning]);

  const filteredStudents = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const name = `${s.firstname} ${s.surname}`.toLowerCase();
      const reg = (s.reg_no || "").toLowerCase();
      return name.includes(q) || reg.includes(q);
    });
  }, [students, filter]);

  const stats = useMemo(() => {
    const total = students.length;
    const done = students.filter((s) => s.status === "completed").length;
    const pending = Math.max(0, total - done);
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, pending, pct };
  }, [students]);

  const handleGoToAddResult = (studentId: number) => {
    navigate(`/students/results/add?batchId=${batchId}&studentId=${studentId}`);
  };

  const handleComputeBatch = async () => {
    if (!batchId) return;
    try {
      await authApi.post(`/result-batches/${batchId}/compute`);
      showSuccess?.("Batch compute started ✅");
    } catch (e: any) {
      console.error(e);
      showError?.(e?.response?.data?.message || "Failed to compute batch.");
    }
  };

  const handleShowResult = (studentId: number) => {
    if (!batch) return;

    navigate("/students/results/show", {
      state: {
        studentId,
        classId: batch.class_id,
        term: batch.term,
        session: batch.session,
        schoolId: batch.school_id,
      },
    });
  };

  const statusPill = useMemo(() => {
    const st = String(batch?.status || "").toLowerCase();
    if (st === "published") return { bg: "rgba(34,197,94,0.16)", fg: "#22c55e", text: "PUBLISHED" };
    if (st === "computed") return { bg: "rgba(59,130,246,0.16)", fg: "#60a5fa", text: "COMPUTED" };
    return { bg: "rgba(245,158,11,0.16)", fg: "#fbbf24", text: (batch?.status || "DRAFT").toUpperCase() };
  }, [batch]);

  return (
    <>
      <style>{`
        /* --- TEMPLATE BASE (same feel as AdminDashboard) --- */
        .db-main {
          background: var(--bs-body-bg, #f5f1eb);
          min-height: 100vh;
          font-family: "DM Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          padding: 28px 28px 0;
        }

        .db-hero {
          background: #0f172a;
          border-radius: var(--bs-border-radius-lg, 16px);
          padding: 32px 36px;
          position: relative;
          overflow: hidden;
          margin-bottom: 28px;
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
          background: radial-gradient(circle, rgba(201, 168, 76, 0.1) 0%, transparent 65%);
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
          align-items: center;
          justify-content: space-between;
          gap: 32px;
          flex-wrap: wrap;
        }

        /* ✅ KEY FIX: on desktop, keep stat card on the same row */
        @media (min-width: 768px) {
          .db-hero-inner { flex-wrap: nowrap; }
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
          background: rgba(201, 168, 76, 0.1);
          border: 1px solid rgba(201, 168, 76, 0.2);
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
          max-width: 440px;
          margin-bottom: 24px;
        }

        .db-hero-btns { display: flex; gap: 10px; flex-wrap: wrap; }

        .db-btn-gold {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 20px;
          font-family: "DM Sans", sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: #0f172a;
          background: #c9a84c;
          border: none;
          border-radius: var(--bs-border-radius, 8px);
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
          padding: 10px 20px;
          font-family: "DM Sans", sans-serif;
          font-size: 13px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.7);
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: var(--bs-border-radius, 8px);
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
          white-space: nowrap;
        }
        .db-btn-outline:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.28);
        }
        .db-btn-outline:disabled { opacity: 0.55; cursor: not-allowed; }

        /* ✅ KEY FIX: pin card to the RIGHT even when wrapping */
        .db-hero-stat-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.09);
          backdrop-filter: blur(8px);
          border-radius: var(--bs-border-radius, 12px);
          padding: 20px 24px;
          min-width: 240px;

          margin-left: auto;      /* push to far right */
          align-self: flex-end;   /* if it wraps, keep it right aligned */
        }

        .db-hero-stat-row {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .db-hero-stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .db-hero-stat-label {
          font-size: 12px;
          font-weight: 300;
          color: #64748b;
        }

        .db-hero-stat-val {
          font-family: "Lora", serif;
          font-size: 18px;
          font-weight: 700;
          color: #fff;
        }

        .db-hero-stat-sep {
          height: 1px;
          background: rgba(255, 255, 255, 0.06);
        }

        /* --- your existing table/panel styles (kept from your file) --- */
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

        .db-grid {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 20px;
          margin-bottom: 24px;
        }
        @media (max-width: 991.98px) { .db-grid { grid-template-columns: 1fr; } }

        .db-table { width: 100%; border-collapse: collapse; }
        .db-table th {
          padding: 10px 16px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #9a8a7a;
          background: #faf8f5;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          text-align: left;
          white-space: nowrap;
        }
        .db-table th:last-child { text-align: right; }
        .db-table td {
          padding: 13px 16px;
          font-size: 13.5px;
          color: #4a4a5a;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          vertical-align: middle;
        }
        .db-table tbody tr:last-child td { border-bottom: none; }
        .db-table tbody tr:hover { background: #faf8f5; }

        .db-muted { color: #9a8a7a; }
        .db-strong { font-weight: 900; color: #1a1a2e; }

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

        .db-skeleton {
          height: 14px;
          border-radius: 7px;
          background: linear-gradient(90deg, #f0ebe3 25%, #e8e0d5 50%, #f0ebe3 75%);
          background-size: 200% 100%;
          animation: dbSkeleton 1.4s ease infinite;
        }
        @keyframes dbSkeleton { from { background-position: 200% 0; } to { background-position: -200% 0; } }

        .db-search {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          border: 1px solid #e5ddd3;
          border-radius: 12px;
          padding: 10px 12px;
          min-width: 260px;
        }
        .db-search input { border: none; outline: none; width: 100%; font-size: 13px; }

        .db-progress-wrap { min-width: 280px; }
        .db-progress-bar {
          height: 10px;
          border-radius: 999px;
          background: #f0ebe3;
          overflow: hidden;
          border: 1px solid rgba(0,0,0,0.06);
        }
        .db-progress-fill {
          height: 100%;
          width: var(--w, 0%);
          background: linear-gradient(90deg, rgba(201,168,76,0.9), rgba(201,168,76,0.25));
        }

        .db-badge {
          display:inline-flex;
          align-items:center;
          gap:6px;
          padding:4px 10px;
          border-radius:999px;
          font-size:12px;
          font-weight:800;
          border: 1px solid rgba(0,0,0,0.06);
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Input Result" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {pageLoading && <Loader message="Preparing Results Upload..." />}

            {/* Hero banner (template-aligned) */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Results — Upload
                  </div>

                  <h1 className="db-greeting">
                    {getGreeting()}, <em>Staff.</em>
                  </h1>

                  <p className="db-hero-sub">
                    Upload results student-by-student for this batch. When everyone is done, compute positions and averages once.
                  </p>

                  <div className="db-hero-btns">
                    <button className="db-btn-gold" onClick={handleComputeBatch} disabled={!batchId}>
                      <i className="bi bi-calculator-fill" />
                      Compute Batch
                    </button>

                    <button
                      className="db-btn-outline"
                      onClick={() => navigate(`/results/broadsheet/${batchId}`)}
                      disabled={!batchId}
                    >
                      <i className="bi bi-table" />
                      Broadsheet
                    </button>

                    <button className="db-btn-outline" onClick={() => navigate("/students/results/batch")}>
                      <i className="bi bi-arrow-left-circle" />
                      Change Batch
                    </button>
                  </div>
                </div>

                {/* ✅ Hero mini stat (Pinned RIGHT like your template) */}
                <div className="db-hero-stat-card d-none d-md-block">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "#c9a84c",
                      }}
                    >
                      Quick glance
                    </span>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M2 10V6M5 10V4M8 10V7M11 10V3" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div className="db-hero-stat-row">
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Completed</span>
                      <span className="db-hero-stat-val">{batchLoading ? "…" : stats.done}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Pending</span>
                      <span className="db-hero-stat-val">{batchLoading ? "…" : stats.pending}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Total</span>
                      <span className="db-hero-stat-val">{batchLoading ? "…" : stats.total}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Progress</span>
                      <span className="db-hero-stat-val">{batchLoading ? "…" : `${stats.pct}%`}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BODY */}
            {batchLoading ? (
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <p className="db-panel-title">Loading batch…</p>
                    <p className="db-panel-sub">Fetching Batch #{batchId}</p>
                  </div>
                </div>
                <div style={{ padding: 16, display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="spinner-border spinner-border-sm" role="status" />
                  <span className="db-muted">Please wait…</span>
                </div>
              </div>
            ) : !batch ? (
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <p className="db-panel-title">Batch not found</p>
                    <p className="db-panel-sub">You may not have access, or the batch does not exist.</p>
                  </div>
                  <button className="db-refresh-btn" onClick={() => navigate("/students/results/batch")}>
                    <i className="bi bi-arrow-left-circle" />
                    Back to Batch Setup
                  </button>
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ color: "#b91c1c", fontWeight: 800 }}>Batch not found or you don’t have access.</div>
                  <div className="db-muted" style={{ marginTop: 6 }}>
                    Go back to Batch Setup and resolve a new batch.
                  </div>
                </div>
              </div>
            ) : (
              <div className="db-grid">
                {/* LEFT */}
                <div className="db-panel">
                  <div className="db-panel-head">
                    <div>
                      <p className="db-panel-title">Students in this batch</p>
                      <p className="db-panel-sub">Search by name or admission number, then enter/edit results.</p>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <div className="db-search">
                        <i className="bi bi-search" style={{ color: "#9a8a7a" }} />
                        <input
                          placeholder="Search name or reg no…"
                          value={filter}
                          onChange={(e) => setFilter(e.target.value)}
                        />
                      </div>

                      <button className="db-refresh-btn" onClick={() => setFilter("")} disabled={!filter}>
                        <i className="bi bi-x-circle" />
                        Clear
                      </button>
                    </div>
                  </div>

                  <div style={{ padding: 16, display: "grid", gap: 12 }}>
                    {/* Context + Progress */}
                    <div
                      style={{
                        border: "1px solid rgba(0,0,0,0.06)",
                        background: "#faf8f5",
                        borderRadius: 14,
                        padding: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div className="db-strong" style={{ fontSize: 13.5 }}>
                          Batch #{batch.id} • Class ID {batch.class_id}
                        </div>
                        <div className="db-muted" style={{ fontSize: 12, marginTop: 2 }}>
                          {batch.term} • {batch.session} •{" "}
                          <span className="db-pill" style={{ background: statusPill.bg, color: statusPill.fg }}>
                            {statusPill.text}
                          </span>
                        </div>
                      </div>

                      <div className="db-progress-wrap">
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                          <span className="db-muted">Progress</span>
                          <span className="db-strong">
                            {stats.done}/{stats.total} ({stats.pct}%)
                          </span>
                        </div>
                        <div className="db-progress-bar">
                          <div className="db-progress-fill" style={{ ["--w" as any]: `${stats.pct}%` }} />
                        </div>
                        <div className="db-muted" style={{ fontSize: 12, marginTop: 6 }}>
                          Pending: <span className="db-strong">{stats.pending}</span>
                        </div>
                      </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: "auto" }}>
                      <table className="db-table">
                        <thead>
                          <tr>
                            <th style={{ width: 60 }}>#</th>
                            <th>Student</th>
                            <th style={{ width: 180 }}>Adm No</th>
                            <th style={{ width: 140 }}>Status</th>
                            <th style={{ width: 240, textAlign: "right" }}>Actions</th>
                          </tr>
                        </thead>

                        <tbody>
                          {studentsLoading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                              <tr key={i}>
                                <td><div className="db-skeleton" style={{ width: 24 }} /></td>
                                <td><div className="db-skeleton" style={{ width: 160 }} /></td>
                                <td><div className="db-skeleton" style={{ width: 120 }} /></td>
                                <td><div className="db-skeleton" style={{ width: 90 }} /></td>
                                <td style={{ textAlign: "right" }}>
                                  <div className="db-skeleton" style={{ width: 180, marginLeft: "auto" }} />
                                </td>
                              </tr>
                            ))
                          ) : students.length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ padding: 28, textAlign: "center", color: "#b5a090" }}>
                                No students returned for this batch.
                              </td>
                            </tr>
                          ) : filteredStudents.length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ padding: 28, textAlign: "center", color: "#b5a090" }}>
                                No matches for “{filter}”.
                              </td>
                            </tr>
                          ) : (
                            filteredStudents.map((s, idx) => {
                              const done = s.status === "completed";
                              return (
                                <tr key={s.id}>
                                  <td>{idx + 1}</td>
                                  <td>
                                    <div className="db-strong" style={{ fontSize: 13.5 }}>
                                      {s.firstname} {s.surname}
                                    </div>
                                    <div className="db-muted" style={{ fontSize: 12 }}>
                                      ID: {s.id}
                                      {s.saved_at ? ` • Saved: ${s.saved_at}` : ""}
                                    </div>
                                  </td>
                                  <td style={{ color: "#9a8a7a", fontSize: 12.5 }}>{s.reg_no}</td>
                                  <td>
                                    <span
                                      className="db-badge"
                                      style={{
                                        background: done ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                                        color: done ? "#16a34a" : "#92400e",
                                      }}
                                    >
                                      <span
                                        style={{
                                          width: 7,
                                          height: 7,
                                          borderRadius: 999,
                                          background: done ? "#22c55e" : "#f59e0b",
                                        }}
                                      />
                                      {done ? "Completed" : "Pending"}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: "right" }}>
                                    <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                      <button
                                        className="db-refresh-btn"
                                        style={{
                                          background: done ? "rgba(59,130,246,0.08)" : "rgba(201,168,76,0.14)",
                                          borderColor: "rgba(0,0,0,0.06)",
                                          color: "#1a1a2e",
                                        }}
                                        onClick={() => handleGoToAddResult(s.id)}
                                      >
                                        <i className={`bi ${done ? "bi-pencil-square" : "bi-plus-circle"}`} />
                                        {done ? "Edit" : "Enter"}
                                      </button>

                                      {done ? (
                                        <button
                                          className="db-refresh-btn"
                                          style={{
                                            background: "rgba(34,197,94,0.12)",
                                            borderColor: "rgba(0,0,0,0.06)",
                                            color: "#14532d",
                                          }}
                                          onClick={() => handleShowResult(s.id)}
                                          title="View Result Sheet"
                                        >
                                          <i className="bi bi-file-earmark-text-fill" />
                                          View
                                        </button>
                                      ) : null}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="db-panel" style={{ alignSelf: "start" }}>
                  <div className="db-panel-head">
                    <div>
                      <p className="db-panel-title">Batch actions</p>
                      <p className="db-panel-sub">Compute + navigation shortcuts</p>
                    </div>

                    <button className="db-refresh-btn" onClick={() => navigate("/students/results/batch")} disabled={studentsLoading}>
                      <i className="bi bi-arrow-left-circle" />
                      Change
                    </button>
                  </div>

                  <div style={{ padding: 16, display: "grid", gap: 12 }}>
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="db-muted">Batch</span>
                        <span className="db-strong">#{batch.id}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="db-muted">Term</span>
                        <span className="db-strong">{batch.term}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="db-muted">Session</span>
                        <span className="db-strong">{batch.session}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="db-muted">Status</span>
                        <span className="db-pill" style={{ background: statusPill.bg, color: statusPill.fg }}>
                          {statusPill.text}
                        </span>
                      </div>
                    </div>

                    <div style={{ height: 1, background: "rgba(0,0,0,0.06)" }} />

                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="db-muted">Completed</span>
                        <span className="db-pill" style={{ background: "rgba(34,197,94,0.12)", color: "#16a34a" }}>
                          {stats.done}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="db-muted">Pending</span>
                        <span className="db-pill" style={{ background: "rgba(245,158,11,0.12)", color: "#92400e" }}>
                          {stats.pending}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="db-muted">Total</span>
                        <span className="db-pill" style={{ background: "rgba(59,130,246,0.12)", color: "#1e40af" }}>
                          {stats.total}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                        <span className="db-muted">Progress</span>
                        <span className="db-strong">{stats.pct}%</span>
                      </div>
                      <div className="db-progress-bar">
                        <div className="db-progress-fill" style={{ ["--w" as any]: `${stats.pct}%` }} />
                      </div>
                    </div>

                    <div
                      style={{
                        borderRadius: 14,
                        border: "1px solid rgba(245,158,11,0.25)",
                        background: "rgba(245,158,11,0.10)",
                        padding: 12,
                        color: "#92400e",
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                      }}
                    >
                      <i className="bi bi-exclamation-triangle-fill" />
                      <div>
                        <div style={{ fontWeight: 900, marginBottom: 2 }}>Reminder</div>
                        <div style={{ opacity: 0.85, fontSize: 12.5, lineHeight: 1.55 }}>
                          Compute once after all students are entered to generate averages & positions.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 10 }}>
                      <button className="db-btn-gold" onClick={handleComputeBatch} disabled={!batchId}>
                        <i className="bi bi-calculator-fill" />
                        Compute batch
                      </button>

                      <button className="db-refresh-btn" onClick={() => navigate(`/results/broadsheet/${batch.id}`)} disabled={!batchId}>
                        <i className="bi bi-table" />
                        Open broadsheet
                      </button>

                      <button className="db-refresh-btn" onClick={() => navigate("/students/results/batch")}>
                        <i className="bi bi-arrow-left-circle" />
                        Change batch
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