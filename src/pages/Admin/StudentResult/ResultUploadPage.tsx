// src/pages/Results/ResultUploadPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import { getUser } from "../../../utils/token";

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

type Department = { id: number; name: string };

type ImportPreview = {
  summary: {
    students_found: number;
    ready_rows: number;
    subjects_found: number;
    errors_count: number;
    warnings_count: number;
    can_import: boolean;
  };
  rows: Array<{
    row: number;
    admission_no: string;
    student_name: string;
    status: string;
    subjects: Array<{ subject_id: number; subject_name: string; ca: number; exam: number; total: number }>;
  }>;
  errors: string[];
  warnings: string[];
};

type AssessmentFormat = "ca_exam" | "ca_ca_exam" | "ca_ca_ca_ca_exam";

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
  const [departments, setDepartments] = useState<Department[]>([]);

  const [filter, setFilter] = useState("");
  const [entryMode, setEntryMode] = useState<"roster" | "excel">("roster");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending">("all");
  const user = getUser();
  const isTeacher = user?.role === "Teacher";
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [assessmentFormat, setAssessmentFormat] = useState<AssessmentFormat>("ca_exam");
  const [importDepartmentId, setImportDepartmentId] = useState<number | "">("");
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setPageLoading(false), 120);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      if (!batchId || Number.isNaN(batchId)) {
        navigate("/students/results/add?mode=excel", { replace: true });
        return;
      }

      setBatchLoading(true);
      setStudentsLoading(true);

      try {
        const [bRes, sRes, dRes] = await Promise.all([
          authApi.get(`/result-batches/${batchId}`),
          authApi.get(`/result-batches/${batchId}/students`),
          authApi.get("/fdepartments").catch(() => ({ data: [] })),
        ]);

        if (!mounted) return;

        const b = bRes.data?.batch ?? bRes.data;
        setBatch(b);

        const rawStudents = sRes.data?.data ?? sRes.data ?? [];
        setStudents(Array.isArray(rawStudents) ? rawStudents : []);
        const rawDepartments = dRes.data?.data ?? dRes.data ?? [];
        setDepartments(Array.isArray(rawDepartments) ? rawDepartments : []);
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
  }, [batchId, navigate, showError]);

  const filteredStudents = useMemo(() => {
    let list = students;
    if (statusFilter === "completed") {
      list = list.filter((s) => s.status === "completed");
    } else if (statusFilter === "pending") {
      list = list.filter((s) => s.status !== "completed");
    }

    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) => {
      const name = `${s.firstname} ${s.surname}`.toLowerCase();
      const reg = (s.reg_no || "").toLowerCase();
      return name.includes(q) || reg.includes(q);
    });
  }, [students, filter, statusFilter]);

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

  const refreshStudents = async () => {
    if (!batchId) return;
    const sRes = await authApi.get(`/result-batches/${batchId}/students`);
    const rawStudents = sRes.data?.data ?? sRes.data ?? [];
    setStudents(Array.isArray(rawStudents) ? rawStudents : []);
  };

  const downloadTemplate = async (format: "xlsx" | "xls" | "csv") => {
    if (!batchId) return;
    try {
      const res = await authApi.get(`/result-batches/${batchId}/result-import/template`, {
        params: {
          format,
          assessment_format: assessmentFormat,
          ...(importDepartmentId ? { department_id: importDepartmentId } : {}),
        },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `result_upload_template_batch_${batchId}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      showError?.(e?.response?.data?.message || "Unable to download result template.");
    }
  };

  const handlePreviewImport = async () => {
    if (!batchId || !importFile) {
      showWarning?.("Choose an Excel or CSV file first.");
      return;
    }

    const form = new FormData();
    form.append("file", importFile);
    if (importDepartmentId) form.append("department_id", String(importDepartmentId));

    setPreviewing(true);
    try {
      const res = await authApi.post(`/result-batches/${batchId}/result-import/preview`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportPreview(res.data);
      if (res.data?.summary?.can_import) {
        showSuccess?.("File looks good. You can now import the results.");
      } else {
        showWarning?.("Please correct the highlighted issues before importing.");
      }
    } catch (e: any) {
      console.error(e);
      const data = e?.response?.data;
      const message = data?.message || data?.errors?.file?.[0] || "Unable to preview result file.";
      showError?.(message);
    } finally {
      setPreviewing(false);
    }
  };

  const handleImportFileChange = (file?: File | null) => {
    setImportFile(file ?? null);
    setImportPreview(null);

    if (file) {
      showSuccess?.(`${file.name} selected. You can preview it now.`);
      window.setTimeout(() => window.focus(), 100);
    }
  };

  const chooseImportFile = () => {
    importFileInputRef.current?.click();
  };

  const handleConfirmImport = async () => {
    if (!batchId || !importFile || !importPreview?.summary?.can_import) return;

    const form = new FormData();
    form.append("file", importFile);
    if (importDepartmentId) form.append("department_id", String(importDepartmentId));

    setImporting(true);
    try {
      const res = await authApi.post(`/result-batches/${batchId}/result-import/import`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showSuccess?.(res.data?.message || "Results imported successfully.");
      setImportFile(null);
      setImportPreview(null);
      await refreshStudents();
    } catch (e: any) {
      console.error(e);
      const data = e?.response?.data;
      const message = data?.message || data?.errors?.file?.[0] || "Unable to import result file.";
      showError?.(message);
    } finally {
      setImporting(false);
    }
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

    const params = new URLSearchParams({
      student_id: String(studentId),
      class_id: String(batch.class_id),
      term: String(batch.term),
      session: String(batch.session),
      school_id: String(batch.school_id),
    });

    navigate(`/students/results/show?${params.toString()}`, {
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
        /* ======= ResultUploadPage - Modern SaaS style ======= */
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .db-main {
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: 24px 28px 0;
        }

        .db-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 18px;
          padding: 32px 36px;
          position: relative;
          overflow: hidden;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
        }

        .db-hero-glow {
          position: absolute;
          top: -60px;
          right: -60px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.15) 0%, transparent 65%);
          pointer-events: none;
        }

        .db-hero-glow2 {
          position: absolute;
          bottom: -40px;
          left: 30%;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.10) 0%, transparent 70%);
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

        @media (min-width: 768px) {
          .db-hero-inner { flex-wrap: nowrap; }
        }

        .db-session-badge {
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

        .db-session-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          animation: dbPulse 2s ease infinite;
        }

        @keyframes dbPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.5); }
        }

        .db-greeting {
          font-size: 26px;
          font-weight: 800;
          color: #fff;
          line-height: 1.1;
          margin-bottom: 8px;
        }
        .db-greeting em { font-style: normal; color: #FBBF24; }

        .db-hero-sub {
          font-size: 13.5px;
          color: #CBD5E1;
          line-height: 1.6;
          max-width: 440px;
          margin-bottom: 20px;
        }

        .db-hero-btns { display: flex; gap: 10px; flex-wrap: wrap; }

        .db-btn-gold {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 700;
          color: #FFFFFF;
          background: #D97706;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .db-btn-gold:hover { background: #B45309; transform: translateY(-1px); color: #FFFFFF; }
        .db-btn-gold:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        .db-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 600;
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.10);
          border: 1px solid rgba(255, 255, 255, 0.20);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .db-btn-outline:hover {
          background: rgba(255, 255, 255, 0.18);
          color: #fff;
        }
        .db-btn-outline:disabled { opacity: 0.55; cursor: not-allowed; }

        .db-hero-stat-card {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(8px);
          border-radius: 14px;
          padding: 18px 20px;
          min-width: 240px;
          margin-left: auto;
          align-self: flex-end;
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
          font-weight: 400;
          color: #CBD5E1;
        }

        .db-hero-stat-val {
          font-size: 18px;
          font-weight: 800;
          color: #FBBF24;
        }

        .db-hero-stat-sep {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
        }

        .db-panel {
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(15, 39, 68, 0.03);
          margin-bottom: 20px;
        }

        .db-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          border-bottom: 1px solid #E2E8F0;
          gap: 12px;
          flex-wrap: wrap;
        }

        .db-panel-title {
          font-size: 16px;
          font-weight: 700;
          color: #0F2744;
          margin: 0;
        }

        .db-panel-sub {
          font-size: 12px;
          color: #64748B;
          margin: 0;
        }

        .db-refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          font-size: 12.5px;
          font-weight: 600;
          color: #0F2744;
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .db-refresh-btn:hover { background: #E2E8F0; }
        .db-refresh-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .db-grid {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 20px;
          margin-bottom: 24px;
        }
        @media (max-width: 991.98px) { .db-grid { grid-template-columns: 1fr; } }

        .db-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .db-table th {
          padding: 12px 16px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #64748B;
          background: #F8FAFC;
          border-bottom: 1px solid #E2E8F0;
          text-align: left;
          white-space: nowrap;
        }
        .db-table th:last-child { text-align: right; }
        .db-table td {
          padding: 14px 16px;
          font-size: 13px;
          color: #334155;
          border-bottom: 1px solid #E2E8F0;
          vertical-align: middle;
        }
        .db-table tbody tr:last-child td { border-bottom: none; }
        .db-table tbody tr:hover { background: #F8FAFC; }

        .db-muted { color: #64748B; }
        .db-strong { font-weight: 700; color: #0F2744; }

        .db-pill {
          display: inline-flex;
          align-items: center;
          font-size: 11.5px;
          font-weight: 700;
          padding: 5px 10px;
          border-radius: 999px;
          white-space: nowrap;
          border: 1px solid rgba(0,0,0,0.06);
        }

        .db-skeleton {
          height: 14px;
          border-radius: 7px;
          background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
          background-size: 200% 100%;
          animation: dbSkeleton 1.4s ease infinite;
        }
        @keyframes dbSkeleton { from { background-position: 200% 0; } to { background-position: -200% 0; } }

        .db-search {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 10px 14px;
          min-width: 260px;
        }
        .db-search input { border: none; outline: none; width: 100%; font-size: 13px; color: #0F2744; }

        .db-progress-wrap { min-width: 280px; }
        .db-progress-bar {
          height: 8px;
          border-radius: 999px;
          background: #E2E8F0;
          overflow: hidden;
        }
        .db-progress-fill {
          height: 100%;
          width: var(--w, 0%);
          background: linear-gradient(90deg, #D97706, #FBBF24);
        }

        .db-badge {
          display:inline-flex;
          align-items:center;
          gap:6px;
          padding:4px 10px;
          border-radius:999px;
          font-size:11.5px;
          font-weight:700;
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
                    Score Entry Workspace
                  </div>

                  <h1 className="db-greeting">
                    {getGreeting()}, <em>{isTeacher ? "Teacher" : "Staff"}.</em>
                  </h1>

                  <p className="db-hero-sub">
                    {batch ? (
                      <>
                        <strong>{batch.class_name || "Assigned Class"}</strong> • {batch.term} ({batch.session}).{" "}
                      </>
                    ) : null}
                    Enter Continuous Assessment and Exam marks student-by-student, or upload in bulk using the pre-filled Excel template. All calculations, averages, and rankings are computed automatically.
                    {isTeacher ? " You are assigned to this class." : ""}
                  </p>

                  <div className="db-hero-btns">
                    <button
                      className="db-btn-gold"
                      onClick={() => navigate(`/results/broadsheet/${batchId}`)}
                      disabled={!batchId}
                    >
                      <i className="bi bi-table me-1" />
                      View Broadsheet
                    </button>

                    <button className="db-btn-outline" onClick={() => navigate("/students/results/batch")}>
                      <i className="bi bi-arrow-left-circle me-1" />
                      Switch Class
                    </button>

                    <button
                      className="db-btn-outline"
                      onClick={handleComputeBatch}
                      disabled={!batchId}
                      title="Recalculate class averages and positions if needed"
                    >
                      <i className="bi bi-arrow-repeat me-1" />
                      Recalculate
                    </button>
                  </div>
                </div>

                {/* ✅ Hero mini stat */}
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
                      Class Progress
                    </span>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M2 10V6M5 10V4M8 10V7M11 10V3" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div className="db-hero-stat-row">
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Entered</span>
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
                    <p className="db-panel-title">Loading class batch…</p>
                    <p className="db-panel-sub">Fetching Batch #{batchId}</p>
                  </div>
                </div>
                <div style={{ padding: 24, display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="spinner-border spinner-border-sm" role="status" />
                  <span className="db-muted">Please wait while class records load…</span>
                </div>
              </div>
            ) : !batch ? (
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <p className="db-panel-title">Access Restricted or Batch Not Found</p>
                    <p className="db-panel-sub">You may only access result batches for classes assigned to you.</p>
                  </div>
                  <button className="db-refresh-btn" onClick={() => navigate(isTeacher ? "/dashboard" : "/students/results/batch")}>
                    <i className="bi bi-arrow-left-circle" />
                    {isTeacher ? "Back to Dashboard" : "Back to Batch Setup"}
                  </button>
                </div>
                <div style={{ padding: 24 }}>
                  <div style={{ color: "#b91c1c", fontWeight: 800, fontSize: 15 }}>
                    ⛔ Batch not accessible.
                  </div>
                  <div className="db-muted" style={{ marginTop: 8, fontSize: 13 }}>
                    Teachers can only enter or upload scores for their assigned classes. If you should have access to this class, please ask your school administrator to verify your class assignment.
                  </div>
                </div>
              </div>
            ) : (
              <div className="db-grid">
                {/* LEFT: WORKSPACE */}
                <div className="db-panel">
                  {/* WORKSPACE MODE SWITCHER */}
                  <div style={{ display: "flex", gap: 10, padding: "16px 20px 0", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
                    <button
                      type="button"
                      onClick={() => setEntryMode("roster")}
                      style={{
                        padding: "10px 18px",
                        borderTopLeftRadius: "10px",
                        borderTopRightRadius: "10px",
                        borderBottomLeftRadius: 0,
                        borderBottomRightRadius: 0,
                        fontWeight: 700,
                        fontSize: "13px",
                        border: "none",
                        borderBottom: entryMode === "roster" ? "3px solid #c9a84c" : "3px solid transparent",
                        background: entryMode === "roster" ? "#0F2744" : "transparent",
                        color: entryMode === "roster" ? "#FFFFFF" : "#64748B",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        transition: "all 0.2s",
                      }}
                    >
                      <i className="bi bi-person-lines-fill" />
                      Online Score Entry ({stats.total})
                    </button>

                    <button
                      type="button"
                      onClick={() => setEntryMode("excel")}
                      style={{
                        padding: "10px 18px",
                        borderTopLeftRadius: "10px",
                        borderTopRightRadius: "10px",
                        borderBottomLeftRadius: 0,
                        borderBottomRightRadius: 0,
                        fontWeight: 700,
                        fontSize: "13px",
                        border: "none",
                        borderBottom: entryMode === "excel" ? "3px solid #c9a84c" : "3px solid transparent",
                        background: entryMode === "excel" ? "#0F2744" : "transparent",
                        color: entryMode === "excel" ? "#FFFFFF" : "#64748B",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        transition: "all 0.2s",
                      }}
                    >
                      <i className="bi bi-file-earmark-spreadsheet-fill" />
                      Bulk Excel / CSV Upload
                    </button>
                  </div>

                  {entryMode === "roster" ? (
                    <div>
                      {/* ROSTER TOOLBAR */}
                      <div className="db-panel-head">
                        <div>
                          <p className="db-panel-title">Class Student Roster</p>
                          <p className="db-panel-sub">Select any student to enter Continuous Assessment & Exam marks.</p>
                        </div>

                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                          {/* Filter pills: All, Completed, Pending */}
                          <div style={{ display: "inline-flex", background: "#F1F5F9", borderRadius: 8, padding: 3 }}>
                            <button
                              type="button"
                              onClick={() => setStatusFilter("all")}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: "none",
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: "pointer",
                                background: statusFilter === "all" ? "#FFFFFF" : "transparent",
                                color: statusFilter === "all" ? "#0F2744" : "#64748B",
                                boxShadow: statusFilter === "all" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                              }}
                            >
                              All ({stats.total})
                            </button>
                            <button
                              type="button"
                              onClick={() => setStatusFilter("completed")}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: "none",
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: "pointer",
                                background: statusFilter === "completed" ? "#FFFFFF" : "transparent",
                                color: statusFilter === "completed" ? "#16a34a" : "#64748B",
                                boxShadow: statusFilter === "completed" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                              }}
                            >
                              Entered ({stats.done})
                            </button>
                            <button
                              type="button"
                              onClick={() => setStatusFilter("pending")}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: "none",
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: "pointer",
                                background: statusFilter === "pending" ? "#FFFFFF" : "transparent",
                                color: statusFilter === "pending" ? "#d97706" : "#64748B",
                                boxShadow: statusFilter === "pending" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                              }}
                            >
                              Pending ({stats.pending})
                            </button>
                          </div>

                          <div className="db-search">
                            <i className="bi bi-search" style={{ color: "#9a8a7a" }} />
                            <input
                              placeholder="Search name or reg no…"
                              value={filter}
                              onChange={(e) => setFilter(e.target.value)}
                            />
                          </div>

                          {filter && (
                            <button className="db-refresh-btn" onClick={() => setFilter("")}>
                              <i className="bi bi-x-circle" />
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      {/* STUDENT TABLE */}
                      <div style={{ overflowX: "auto" }}>
                        <table className="db-table">
                          <thead>
                            <tr>
                              <th style={{ width: 60 }}>#</th>
                              <th>Student Name</th>
                              <th style={{ width: 180 }}>Admission No</th>
                              <th style={{ width: 140 }}>Status</th>
                              <th style={{ width: 220, textAlign: "right" }}>Action</th>
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
                                  <td style={{ textAlign: "right" }}><div className="db-skeleton" style={{ width: 140, marginLeft: "auto" }} /></td>
                                </tr>
                              ))
                            ) : filteredStudents.length === 0 ? (
                              <tr>
                                <td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#94A3B8" }}>
                                  <i className="bi bi-person-x fs-2 d-block mb-2 text-muted" />
                                  No students found {filter ? `matching "${filter}"` : ""}.
                                </td>
                              </tr>
                            ) : (
                              filteredStudents.map((s, idx) => {
                                const isCompleted = s.status === "completed";
                                const initials = `${s.firstname?.[0] || ""}${s.surname?.[0] || ""}`.toUpperCase() || "S";
                                return (
                                  <tr key={s.id}>
                                    <td><strong>{idx + 1}</strong></td>
                                    <td>
                                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <div
                                          style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: "50%",
                                            background: isCompleted ? "#DCFCE7" : "#F1F5F9",
                                            color: isCompleted ? "#15803D" : "#475569",
                                            fontWeight: 800,
                                            fontSize: 12,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                          }}
                                        >
                                          {initials}
                                        </div>
                                        <div>
                                          <div className="db-strong" style={{ color: "#0F2744" }}>
                                            {s.firstname} {s.surname}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      <span style={{ fontFamily: "monospace", fontSize: 12, color: "#475569" }}>
                                        {s.reg_no || "—"}
                                      </span>
                                    </td>
                                    <td>
                                      {isCompleted ? (
                                        <span
                                          className="db-pill"
                                          style={{ background: "#DCFCE7", color: "#15803D", fontWeight: 700 }}
                                        >
                                          <i className="bi bi-check-circle-fill me-1" />
                                          Entered
                                        </span>
                                      ) : (
                                        <span
                                          className="db-pill"
                                          style={{ background: "#FEF3C7", color: "#B45309", fontWeight: 700 }}
                                        >
                                          <i className="bi bi-clock-history me-1" />
                                          Pending
                                        </span>
                                      )}
                                    </td>
                                    <td style={{ textAlign: "right" }}>
                                      <div style={{ display: "inline-flex", gap: 6 }}>
                                        <button
                                          className="db-refresh-btn"
                                          style={{
                                            background: isCompleted ? "#F8FAFC" : "#c9a84c",
                                            color: "#0F2744",
                                            fontWeight: 700,
                                            border: isCompleted ? "1px solid #E2E8F0" : "none",
                                          }}
                                          onClick={() => handleGoToAddResult(s.id)}
                                        >
                                          <i className={`bi ${isCompleted ? "bi-pencil-square" : "bi-plus-circle-fill"}`} />
                                          {isCompleted ? "Edit Scores" : "Enter Scores"}
                                        </button>
                                        {isCompleted && (
                                          <button
                                            className="db-refresh-btn"
                                            onClick={() => handleShowResult(s.id)}
                                            title="Preview Report Card"
                                          >
                                            <i className="bi bi-eye" />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div style={{ padding: "14px 20px", background: "#F8FAFC", borderTop: "1px solid #E2E8F0", fontSize: 12.5, color: "#64748B" }}>
                        💡 <strong>Automated Calculations:</strong> Whenever you save a student's score, the system automatically computes their total, letter grade, class averages, and ranking position in real time.
                      </div>
                    </div>
                  ) : (
                    /* EXCEL UPLOAD WORKFLOW */
                    <div style={{ padding: 20 }}>
                      <div
                        style={{
                          border: "1px solid rgba(201,168,76,0.28)",
                          background: "#fffdf8",
                          borderRadius: 14,
                          padding: 20,
                          display: "grid",
                          gap: 18,
                        }}
                      >
                        <div>
                          <div className="db-strong" style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8, color: "#0F2744" }}>
                            <i className="bi bi-file-earmark-spreadsheet" style={{ color: "#c9a84c", fontSize: 20 }} />
                            Bulk Result Upload via Excel or CSV
                          </div>
                          <div className="db-muted" style={{ fontSize: 13, marginTop: 4 }}>
                            Follow 3 simple steps: download this class's pre-filled template, enter the marks in Excel, and upload the completed file.
                          </div>
                        </div>

                        {/* STEP 1 & 2 CONTROLS */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                          <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
                              Step 1: Download Class Template
                            </label>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button className="db-refresh-btn" onClick={() => downloadTemplate("xlsx")} disabled={!batchId}>
                                <i className="bi bi-download" />
                                Excel Template (.xlsx)
                              </button>
                              <button className="db-refresh-btn" onClick={() => downloadTemplate("csv")} disabled={!batchId}>
                                <i className="bi bi-filetype-csv" />
                                CSV
                              </button>
                            </div>
                          </div>

                          <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
                              Step 2: Score Breakdown Format
                            </label>
                            <select
                              value={assessmentFormat}
                              onChange={(e) => {
                                setAssessmentFormat(e.target.value as AssessmentFormat);
                                setImportPreview(null);
                              }}
                              style={{
                                border: "1px solid #CBD5E1",
                                borderRadius: 8,
                                padding: "8px 12px",
                                background: "#fff",
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#0F2744",
                                width: "100%",
                              }}
                              aria-label="Select result upload score format"
                            >
                              <option value="ca_exam">CA + Exam (e.g. 40/60)</option>
                              <option value="ca_ca_exam">CA 1 + CA 2 + Exam (e.g. 20/20/60)</option>
                              <option value="ca_ca_ca_ca_exam">CA 1 + CA 2 + CA 3 + CA 4 + Exam (e.g. 10/10/10/10/60)</option>
                            </select>
                          </div>
                        </div>

                        {/* STEP 3 UPLOAD */}
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
                            Step 3: Select File & Preview
                          </label>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                            <input
                              ref={importFileInputRef}
                              type="file"
                              accept=".xlsx,.xls,.csv"
                              onClick={(e) => {
                                (e.currentTarget as HTMLInputElement).value = "";
                              }}
                              onChange={(e) => {
                                const f = e.target.files?.[0] || null;
                                setImportFile(f);
                                setImportPreview(null);
                              }}
                              style={{
                                border: "1px dashed #CBD5E1",
                                borderRadius: 8,
                                padding: "8px 12px",
                                background: "#fff",
                                fontSize: 13,
                                flex: 1,
                                minWidth: 200,
                              }}
                            />
                            <button
                              className="db-refresh-btn"
                              onClick={handlePreviewImport}
                              disabled={!importFile || previewing || !batchId}
                            >
                              {previewing ? <span className="spinner-border spinner-border-sm" role="status" /> : <i className="bi bi-eye" />}
                              Preview Import
                            </button>
                            <button
                              className="db-btn-gold"
                              onClick={handleConfirmImport}
                              disabled={!importPreview?.summary?.can_import || importing || !batchId}
                            >
                              {importing ? <span className="spinner-border spinner-border-sm" role="status" /> : <i className="bi bi-cloud-upload-fill" />}
                              Import Scores & Calculate
                            </button>
                          </div>
                        </div>

                        {/* PREVIEW DETAILS */}
                        {importPreview && (
                          <div style={{ borderTop: "1px solid #EDE8E0", paddingTop: 14 }}>
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                              <span className="db-pill" style={{ background: "#DCFCE7", color: "#15803D" }}>
                                {importPreview.summary.ready_rows} students ready
                              </span>
                              <span className="db-pill" style={{ background: "#DBEAFE", color: "#1E40AF" }}>
                                {importPreview.summary.subjects_found} subjects detected
                              </span>
                              {importPreview.summary.errors_count > 0 && (
                                <span className="db-pill" style={{ background: "#FEE2E2", color: "#991B1B" }}>
                                  {importPreview.summary.errors_count} errors
                                </span>
                              )}
                            </div>

                            {importPreview.rows.length > 0 && (
                              <div style={{ overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: 10 }}>
                                <table className="db-table">
                                  <thead>
                                    <tr>
                                      <th>Row</th>
                                      <th>Student Name</th>
                                      <th>Admission No</th>
                                      <th>Subjects with Scores</th>
                                      <th>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {importPreview.rows.slice(0, 5).map((row) => (
                                      <tr key={`${row.row}-${row.admission_no}`}>
                                        <td>{row.row}</td>
                                        <td className="db-strong">{row.student_name || "Unknown"}</td>
                                        <td>{row.admission_no}</td>
                                        <td>{row.subjects.length}</td>
                                        <td>
                                          <span
                                            className="db-pill"
                                            style={{
                                              background: row.status === "ready" ? "#DCFCE7" : "#FEF3C7",
                                              color: row.status === "ready" ? "#15803D" : "#B45309",
                                            }}
                                          >
                                            {row.status === "ready" ? "Ready" : "No scores"}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT: BATCH STATS & SUMMARY */}
                <div className="db-panel" style={{ height: "fit-content" }}>
                  <div className="db-panel-head">
                    <div>
                      <p className="db-panel-title">Batch Summary</p>
                      <p className="db-panel-sub">{batch.term} • {batch.session}</p>
                    </div>
                  </div>

                  <div style={{ padding: 18, display: "grid", gap: 14 }}>
                    <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="db-muted">Class</span>
                        <span className="db-strong">{batch.class_name || `Class #${batch.class_id}`}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="db-muted">Batch ID</span>
                        <span className="db-strong">#{batch.id}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="db-muted">Status</span>
                        <span className="db-pill" style={{ background: statusPill.bg, color: statusPill.fg }}>
                          {statusPill.text}
                        </span>
                      </div>
                    </div>

                    <div style={{ height: 1, background: "#E2E8F0" }} />

                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="db-muted">Scores Entered</span>
                        <span className="db-pill" style={{ background: "#DCFCE7", color: "#15803D" }}>
                          {stats.done}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="db-muted">Pending Entry</span>
                        <span className="db-pill" style={{ background: "#FEF3C7", color: "#B45309" }}>
                          {stats.pending}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="db-muted">Total Students</span>
                        <span className="db-pill" style={{ background: "#DBEAFE", color: "#1E40AF" }}>
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
                        borderRadius: 12,
                        border: "1px solid rgba(34,197,94,0.25)",
                        background: "rgba(34,197,94,0.08)",
                        padding: 12,
                        color: "#15803D",
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                      }}
                    >
                      <i className="bi bi-lightning-charge-fill" style={{ fontSize: 16 }} />
                      <div>
                        <div style={{ fontWeight: 800, marginBottom: 2 }}>Automated Calculations</div>
                        <div style={{ opacity: 0.9, fontSize: 12, lineHeight: 1.5 }}>
                          Student totals, letter grades, GPAs, and class ranking positions are calculated automatically in the background whenever marks are saved or imported.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 10 }}>
                      <button className="db-btn-gold" onClick={() => navigate(`/results/broadsheet/${batch.id}`)} disabled={!batchId}>
                        <i className="bi bi-table me-1" />
                        View Master Broadsheet
                      </button>

                      <button className="db-refresh-btn" onClick={() => navigate("/students/results/batch")}>
                        <i className="bi bi-arrow-left-circle me-1" />
                        Switch Class
                      </button>

                      <button className="db-refresh-btn" onClick={handleComputeBatch} disabled={!batchId} title="Recalculate rankings if needed">
                        <i className="bi bi-arrow-repeat me-1" />
                        Recalculate Rankings
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
