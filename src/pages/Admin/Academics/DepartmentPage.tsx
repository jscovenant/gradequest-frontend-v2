// src/pages/Admin/Academics/DepartmentPage.tsx
import  { useEffect, useMemo, useState } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";

/* =========================
   TYPES
========================= */
type Department = {
  id: number;
  name: string;
  description?: string | null;
  school_id?: number;
  created_at?: string;
  updated_at?: string;
};

function getErrorMessage(err: any): string {
  const status = err?.response?.status;
  const data = err?.response?.data;

  if (status === 409) return data?.message ?? data?.error ?? "This item already exists.";
  if (status === 404) return data?.message ?? "Not found.";
  if (status === 422) {
    const errors = data?.errors;
    if (errors) {
      const firstKey = Object.keys(errors)[0];
      const firstMsg = errors[firstKey]?.[0];
      if (firstMsg) return firstMsg;
    }
    return data?.message ?? "Validation error.";
  }
  return data?.message ?? data?.error ?? err?.message ?? "Something went wrong.";
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/* =========================
   PAGE
========================= */
export default function DepartmentPage() {
  const { showSuccess, showError } = useToast();

  // layout
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // loading
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [query, setQuery] = useState("");

  // modals
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  // create
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");

  // edit
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const isBusy = (key: string) => busyKey === key;

  /* =========================
     FETCH
  ========================= */
  async function fetchDepartments() {
    try {
      setLoadingDepartments(true);
      const res = await authApi.get<Department[]>("/departments");
      setDepartments(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      showError(getErrorMessage(err));
      setDepartments([]);
    } finally {
      setLoadingDepartments(false);
    }
  }

  useEffect(() => {
    setLoadingPage(true);
    fetchDepartments().finally(() => setLoadingPage(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     DERIVED
  ========================= */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) => {
      const hay = `${d.name ?? ""} ${d.description ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [departments, query]);

  const totalDepartments = departments.length;

  /* =========================
     PAGINATION (template-style)
  ========================= */
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => setPage(1), [query, departments.length]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / perPage)), [filtered.length]);
  const safePage = clamp(page, 1, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, safePage]);

  /* =========================
     ACTIONS
  ========================= */
  async function createDepartment() {
    const name = createName.trim();
    const description = createDesc.trim();

    if (!name) return showError("Please enter a department name.");

    try {
      setBusyKey("dept:create");
      const res = await authApi.post("/departments", { name, description: description || null });
      showSuccess(res.data?.message ?? "Department created successfully.");
      setShowCreate(false);
      setCreateName("");
      setCreateDesc("");
      await fetchDepartments();
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  function openEdit(d: Department) {
    setEditId(d.id);
    setEditName(d.name ?? "");
    setEditDesc(d.description ?? "");
    setShowEdit(true);
  }

  async function updateDepartment() {
    if (!editId) return;

    const name = editName.trim();
    const description = editDesc.trim();
    if (!name) return showError("Please enter a department name.");

    try {
      setBusyKey(`dept:update:${editId}`);
      const res = await authApi.put(`/departments/${editId}`, {
        name,
        description: description || null,
      });
      showSuccess(res.data?.message ?? "Department updated successfully.");
      setShowEdit(false);
      setEditId(null);
      setEditName("");
      setEditDesc("");
      await fetchDepartments();
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  /* =========================
     STYLES (same template family)
  ========================= */
  return (
    <>
      <style>{`
        /* ======= DepartmentPage - AdminDashboard template style ======= */
        .db-main {
          background: var(--bs-body-bg, #f5f1eb);
          min-height: 100vh;
          font-family: "DM Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          padding: 28px 28px 0;
        }

        .db-hero {
          background: #0f172a;
          border-radius: 16px;
          padding: 32px 36px;
          position: relative;
          overflow: hidden;
          margin-bottom: 22px;
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
          left: 18%;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .db-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
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
          border: 1px solid rgba(201, 168, 76, 0.20);
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
          0%, 100% { opacity: 1; transform: scale(1); }
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
          max-width: 720px;
          margin-bottom: 18px;
        }

        .db-hero-btns { display:flex; gap:10px; flex-wrap:wrap; }

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
          text-decoration: none;
          white-space: nowrap;
        }
        .db-btn-gold:hover { background: #e8c97a; transform: translateY(-1px); }
        .db-btn-gold:disabled { opacity: .55; cursor:not-allowed; transform:none; }

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
        .db-btn-outline:disabled { opacity: .55; cursor:not-allowed; }

        .db-hero-stat-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.09);
          backdrop-filter: blur(8px);
          border-radius: 12px;
          padding: 20px 24px;
          min-width: 260px;
        }
        .db-hero-stat-row { display:flex; flex-direction:column; gap:10px; }
        .db-hero-stat-item { display:flex; justify-content:space-between; align-items:center; gap:16px; }
        .db-hero-stat-label { font-size: 12px; font-weight: 300; color: #64748b; }
        .db-hero-stat-val { font-family: "Lora", serif; font-size: 18px; font-weight: 700; color: #fff; }
        .db-hero-stat-sep { height: 1px; background: rgba(255, 255, 255, 0.06); }

        .db-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 18px;
        }
        @media (max-width: 1199.98px) { .db-stats { grid-template-columns: repeat(2, 1fr);} }
        @media (max-width: 575.98px) { .db-stats { grid-template-columns: 1fr; } }

        .db-stat {
          background: #fff;
          border: 1px solid #ede8e0;
          border-radius: 14px;
          padding: 22px 20px;
          position: relative;
          overflow: hidden;
          cursor: default;
          transition: box-shadow 0.25s, transform 0.25s;
        }
        .db-stat:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.08); transform: translateY(-3px); }
        .db-stat::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: #b45309;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s ease;
        }
        .db-stat:hover::before { transform: scaleX(1); }
        .db-stat-head { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom: 14px; }
        .db-stat-icon {
          width: 42px; height: 42px;
          border-radius: 10px;
          background: #fef3c7;
          color: #b45309;
          display:flex; align-items:center; justify-content:center;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .db-stat:hover .db-stat-icon { transform: scale(1.1) rotate(-4deg); }
        .db-stat-more { color: #c8bfb5; padding: 2px; }
        .db-stat-label { font-size: 12px; font-weight: 500; color: #9a8a7a; margin-bottom: 6px; letter-spacing: .03em; }
        .db-stat-val { font-family: "Lora", Georgia, serif; font-size: 28px; font-weight: 700; color: #1a1a2e; line-height: 1; }
        .db-stat-footer {
          display:flex; align-items:center; gap:6px;
          margin-top: 12px; padding-top: 10px;
          border-top: 1px solid rgba(0,0,0,0.06);
          font-size: 12px; color: #9a8a7a;
        }
        .db-stat-trend { color:#22c55e; font-weight:600; }

        .db-panel {
          background: #fff;
          border: 1px solid #ede8e0;
          border-radius: 14px;
          overflow: hidden;
          margin-bottom: 24px;
        }
        .db-panel-head {
          display:flex;
          align-items:center;
          justify-content: space-between;
          padding: 18px 20px 16px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          gap: 12px;
          flex-wrap: wrap;
        }
        .db-panel-title {
          font-family: "Lora", serif;
          font-size: 16px;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0;
        }
        .db-panel-sub {
          font-size: 11.5px;
          font-weight: 300;
          color: #9a8a7a;
          margin: 0;
        }
        .db-toolbar { display:flex; align-items:center; gap: 10px; flex-wrap: wrap; }
        .db-input {
          display:flex;
          align-items:center;
          gap: 8px;
          padding: 10px 12px;
          background: #faf8f5;
          border: 1px solid #e5ddd3;
          border-radius: 12px;
          min-width: 280px;
        }
        .db-input input {
          border: none;
          outline: none;
          background: transparent;
          width: 100%;
          font-size: 13.5px;
          color: #1a1a2e;
        }

        .db-chip-btn {
          display:inline-flex;
          align-items:center;
          gap: 6px;
          padding: 8px 12px;
          font-size: 12.5px;
          font-weight: 800;
          color: #7a6a5a;
          background: #f5f1eb;
          border: 1px solid #e5ddd3;
          border-radius: 10px;
          cursor: pointer;
          transition: background .2s, color .2s, transform .2s;
          white-space: nowrap;
        }
        .db-chip-btn:hover:not(:disabled) { background:#ede8e0; color:#1a1a2e; transform: translateY(-1px); }
        .db-chip-btn:disabled { opacity: .5; cursor: not-allowed; }

        .db-table { width: 100%; border-collapse: collapse; }
        .db-table th {
          padding: 10px 16px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: #9a8a7a;
          background: #faf8f5;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          text-align: left;
          white-space: nowrap;
        }
        .db-table th:last-child { text-align: right; }
        .db-table td {
          padding: 13px 16px;
          font-size: 13.5px;
          color: #4a4a5a;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          vertical-align: middle;
        }
        .db-table tbody tr { transition: background 0.15s; }
        .db-table tbody tr:hover { background: #faf8f5; }
        .db-table tbody tr:last-child td { border-bottom: none; }

        .db-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 900;
          padding: 4px 10px;
          border-radius: 999px;
          background: #f0ebe3;
          color: #7a6a5a;
          white-space: nowrap;
        }

        .db-actions { display:inline-flex; justify-content:flex-end; gap: 8px; flex-wrap: wrap; }
        .db-action-btn {
          display:inline-flex;
          align-items:center;
          gap: 6px;
          padding: 7px 12px;
          font-size: 12.5px;
          font-weight: 900;
          border-radius: 10px;
          cursor: pointer;
          border: 1px solid rgba(0,0,0,0.10);
          background: #fff;
          transition: transform .2s, box-shadow .2s, background .2s;
          white-space: nowrap;
        }
        .db-action-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 18px rgba(0,0,0,0.08); background: #faf8f5; }
        .db-action-btn:disabled { opacity: .5; cursor: not-allowed; }

        .db-action-primary { border-color: rgba(30, 64, 175, 0.25); color: #1e40af; }

        .db-pagination {
          display:flex;
          align-items:center;
          justify-content: space-between;
          padding: 14px 16px;
          border-top: 1px solid rgba(0,0,0,0.06);
          flex-wrap: wrap;
          gap: 10px;
        }
        .db-page-info { font-size: 12px; color:#9a8a7a; }
        .db-page-btns { display:flex; align-items:center; gap: 8px; }
        .db-page-btn {
          display:inline-flex;
          align-items:center;
          gap: 6px;
          padding: 7px 12px;
          font-size: 12.5px;
          font-weight: 900;
          color: #7a6a5a;
          background: #f5f1eb;
          border: 1px solid #e5ddd3;
          border-radius: 10px;
          cursor: pointer;
          transition: background .2s, transform .2s, color .2s;
        }
        .db-page-btn:hover:not(:disabled) { background:#ede8e0; color:#1a1a2e; transform: translateY(-1px); }
        .db-page-btn:disabled { opacity: .45; cursor:not-allowed; }
        .db-page-current { font-size: 12px; color:#9a8a7a; }

        /* Modals */
        .db-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(7px);
          z-index: 1400;
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 12px;
        }
        .db-modal {
          width: min(920px, 96vw);
          max-height: 92vh;
          border-radius: 18px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 24px 70px rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.12);
        }
        .db-modal-head {
          padding: 18px 20px;
          background: linear-gradient(135deg, #0f172a 0%, #1f2937 100%);
          color: #fff;
          position: relative;
          overflow: hidden;
        }
        .db-modal-head::before {
          content:"";
          position:absolute;
          inset:0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events:none;
        }
        .db-modal-head-inner {
          position: relative;
          z-index: 1;
          display:flex;
          align-items:flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .db-modal-title {
          margin:0;
          font-family: "Lora", Georgia, serif;
          font-size: 16px;
          font-weight: 900;
        }
        .db-modal-sub {
          margin: 2px 0 0;
          color: rgba(255,255,255,0.72);
          font-size: 12.5px;
          font-weight: 300;
        }
        .db-modal-close {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.06);
          color: #fff;
          cursor: pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          transition: background .2s, border-color .2s, transform .2s;
          flex-shrink: 0;
        }
        .db-modal-close:hover:not(:disabled) { background: rgba(255,255,255,0.10); border-color: rgba(255,255,255,0.26); transform: translateY(-1px); }
        .db-modal-close:disabled { opacity: .5; cursor:not-allowed; }

        .db-modal-body { background:#f5f1eb; padding: 16px; overflow:auto; max-height: calc(92vh - 130px); }
        .db-modal-card { background:#fff; border: 1px solid #ede8e0; border-radius: 16px; padding: 16px; }

        .db-form-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 767.98px) { .db-form-grid { grid-template-columns: 1fr; } }

        .db-field label {
          display:block;
          font-size: 12px;
          font-weight: 900;
          color: #7a6a5a;
          margin-bottom: 6px;
          letter-spacing: .02em;
        }
        .db-field input, .db-field textarea {
          width: 100%;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid #e5ddd3;
          background: #faf8f5;
          outline: none;
          font-size: 13.5px;
          color: #1a1a2e;
          resize: vertical;
        }
        .db-field input:focus, .db-field textarea:focus {
          border-color: rgba(201,168,76,0.55);
          box-shadow: 0 0 0 4px rgba(201,168,76,0.18);
          background: #fff;
        }
        .db-help { margin-top: 6px; font-size: 11.5px; color: #9a8a7a; }

        .db-modal-foot {
          padding: 14px 16px;
          background: #fff;
          border-top: 1px solid rgba(0,0,0,0.06);
          display:flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .db-btn {
          display:inline-flex;
          align-items:center;
          gap: 7px;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          border: 1px solid transparent;
          transition: transform .2s, box-shadow .2s, background .2s, border-color .2s;
          white-space: nowrap;
        }
        .db-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(0,0,0,0.10); }
        .db-btn:disabled { opacity: .55; cursor:not-allowed; box-shadow:none; transform:none; }

        .db-btn-secondary { background: #f5f1eb; border-color: #e5ddd3; color: #7a6a5a; }
        .db-btn-secondary:hover:not(:disabled) { background: #ede8e0; color:#1a1a2e; }

        .db-btn-primary { background: #c9a84c; color: #0f172a; border-color: rgba(201,168,76,0.35); }
        .db-btn-primary:hover:not(:disabled) { background:#e8c97a; }

        @keyframes dbSpin { to { transform: rotate(360deg); } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Department" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loadingPage && <Loader message="Loading departments..." />}

            {/* ===== HERO ===== */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Departments • School Structure
                  </div>

                  <h1 className="db-greeting">
                    {getGreeting()}, <em>Admin.</em>
                  </h1>

                  <p className="db-hero-sub">
                    Create and manage departments. Departments help you organize students and subjects properly (e.g.
                    Science, Arts, Commercial).
                  </p>

                  <div className="db-hero-btns">
                    <button className="db-btn-gold" onClick={() => setShowCreate(true)} disabled={busyKey !== null} type="button">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      Add Department
                    </button>

                    <button className="db-btn-outline" onClick={fetchDepartments} disabled={busyKey !== null || loadingDepartments} type="button">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        style={{ animation: loadingDepartments ? "dbSpin 0.8s linear infinite" : "none" }}
                      >
                        <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Quick summary */}
                <div className="db-hero-stat-card d-none d-md-block">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c9a84c" }}>
                      Quick summary
                    </span>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M2 10V6M5 10V4M8 10V7M11 10V3" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div className="db-hero-stat-row">
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Total departments</span>
                      <span className="db-hero-stat-val">{loadingDepartments ? "…" : totalDepartments}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Showing</span>
                      <span className="db-hero-stat-val">{filtered.length}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Tip: Keep names short & consistent.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== STATS ===== */}
            <div className="db-stats">
              {[
                { title: "Total Departments", value: totalDepartments, hint: "All departments" },
                { title: "Search Results", value: filtered.length, hint: "After filtering" },
                { title: "Page", value: `${safePage}/${totalPages}`, hint: "Pagination" },
                { title: "Busy", value: busyKey ? "Yes" : "No", hint: "Actions running" },
              ].map((c, i) => (
                <div className="db-stat" key={c.title}>
                  <div className="db-stat-head">
                    <div className="db-stat-icon">
                      {i === 0 ? (
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                          <path d="M3 17V8l7-5 7 5v9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                          <path d="M8 17v-5h4v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                        </svg>
                      ) : i === 1 ? (
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M14 14l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      ) : i === 2 ? (
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                          <path d="M6 4h8M6 10h8M6 16h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M3 4h.01M3 10h.01M3 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                          <path d="M10 3v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      )}
                    </div>

                    <svg className="db-stat-more" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="4" cy="8" r="1.2" fill="currentColor" />
                      <circle cx="8" cy="8" r="1.2" fill="currentColor" />
                      <circle cx="12" cy="8" r="1.2" fill="currentColor" />
                    </svg>
                  </div>
                  <p className="db-stat-label">{c.title}</p>
                  <div className="db-stat-val">{c.value as any}</div>
                  <div className="db-stat-footer">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 9l3-4 2 2 3-5" stroke="#22c55e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="db-stat-trend">OK</span>
                    <span style={{ color: "#9a8a7a" }}>{c.hint}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ===== PANEL ===== */}
            <div className="db-panel">
              <div className="db-panel-head">
                <div>
                  <p className="db-panel-title">Departments</p>
                  <p className="db-panel-sub">Search, create and edit departments.</p>
                </div>

                <div className="db-toolbar">
                  <div className="db-input" title="Search">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="7" cy="7" r="4.5" stroke="#9a8a7a" strokeWidth="1.4" />
                      <path d="M11 11l3 3" stroke="#9a8a7a" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <input
                      placeholder="Search departments…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      disabled={busyKey !== null}
                    />
                    {query.trim() ? (
                      <button
                        className="db-chip-btn"
                        style={{ padding: "6px 10px", borderRadius: 10 }}
                        onClick={() => setQuery("")}
                        type="button"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>

                  <button className="db-chip-btn" onClick={fetchDepartments} disabled={busyKey !== null || loadingDepartments} type="button">
                    Refresh
                  </button>
                  <button className="db-chip-btn" onClick={() => setShowCreate(true)} disabled={busyKey !== null} type="button">
                    Add Department
                  </button>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="db-table">
                  <thead>
                    <tr>
                      <th style={{ width: 320 }}>Department</th>
                      <th>Description</th>
                      <th style={{ width: 220, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loadingDepartments ? (
                      <tr>
                        <td colSpan={3} style={{ padding: 28, textAlign: "center", color: "#9a8a7a" }}>
                          <span className="spinner-border spinner-border-sm" /> <span style={{ marginLeft: 8 }}>Loading departments…</span>
                        </td>
                      </tr>
                    ) : pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: 34, textAlign: "center", color: "#9a8a7a" }}>
                          <div style={{ fontWeight: 900, color: "#1a1a2e" }}>No departments found</div>
                          <div style={{ marginTop: 6 }}>Click “Add department” to create one.</div>
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((d) => (
                        <tr key={d.id}>
                          <td>
                            <div style={{ fontWeight: 900, color: "#1a1a2e" }}>{d.name}</div>
                            <div style={{ fontSize: 12, color: "#9a8a7a" }}>ID: {d.id}</div>
                          </td>

                          <td>{d.description?.trim() ? d.description : <span style={{ color: "#9a8a7a" }}>—</span>}</td>

                          <td style={{ textAlign: "right" }}>
                            <div className="db-actions">
                              <button
                                className="db-action-btn db-action-primary"
                                onClick={() => openEdit(d)}
                                disabled={busyKey !== null}
                                type="button"
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="db-pagination">
                <div className="db-page-info">
                  Showing <b>{pageRows.length}</b> of <b>{filtered.length}</b> results • Page <b>{safePage}</b> of <b>{totalPages}</b>
                </div>

                <div className="db-page-btns">
                  <button className="db-page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} type="button">
                    Prev
                  </button>
                  <span className="db-page-current">Page {safePage}</span>
                  <button className="db-page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} type="button">
                    Next
                  </button>
                </div>
              </div>
            </div>

            <Footer />

            {/* =========================
                MODAL: CREATE
            ========================= */}
            {showCreate && (
              <div className="db-modal-backdrop" onMouseDown={() => (busyKey ? null : setShowCreate(false))}>
                <div className="db-modal" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="db-modal-head">
                    <div className="db-modal-head-inner">
                      <div>
                        <h3 className="db-modal-title">Add Department</h3>
                        <p className="db-modal-sub">Create a new department for your school.</p>
                      </div>
                      <button className="db-modal-close" onClick={() => setShowCreate(false)} disabled={busyKey !== null} type="button">
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="db-modal-body">
                    <div className="db-modal-card">
                      <div className="db-form-grid">
                        <div className="db-field" style={{ gridColumn: "1 / -1" }}>
                          <label>Name *</label>
                          <input
                            placeholder="e.g. Science"
                            value={createName}
                            onChange={(e) => setCreateName(e.target.value)}
                            disabled={isBusy("dept:create")}
                          />
                        </div>

                        <div className="db-field" style={{ gridColumn: "1 / -1" }}>
                          <label>Description (optional)</label>
                          <textarea
                            rows={4}
                            placeholder="Short description…"
                            value={createDesc}
                            onChange={(e) => setCreateDesc(e.target.value)}
                            disabled={isBusy("dept:create")}
                          />
                          <div className="db-help">Tip: Keep it short. You can leave this empty.</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="db-modal-foot">
                    <button className="db-btn db-btn-secondary" onClick={() => setShowCreate(false)} disabled={busyKey !== null} type="button">
                      Cancel
                    </button>
                    <button className="db-btn db-btn-primary" onClick={createDepartment} disabled={busyKey !== null} type="button">
                      {isBusy("dept:create") ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" style={{ width: 14, height: 14 }} />
                          Saving…
                        </>
                      ) : (
                        "Save Department"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =========================
                MODAL: EDIT
            ========================= */}
            {showEdit && editId && (
              <div className="db-modal-backdrop" onMouseDown={() => (busyKey ? null : setShowEdit(false))}>
                <div className="db-modal" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="db-modal-head">
                    <div className="db-modal-head-inner">
                      <div>
                        <h3 className="db-modal-title">Edit Department</h3>
                        <p className="db-modal-sub">Update department details.</p>
                      </div>
                      <button className="db-modal-close" onClick={() => setShowEdit(false)} disabled={busyKey !== null} type="button">
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="db-modal-body">
                    <div className="db-modal-card">
                      <div className="db-form-grid">
                        <div className="db-field" style={{ gridColumn: "1 / -1" }}>
                          <label>Name *</label>
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            disabled={isBusy(`dept:update:${editId}`)}
                          />
                        </div>

                        <div className="db-field" style={{ gridColumn: "1 / -1" }}>
                          <label>Description (optional)</label>
                          <textarea
                            rows={4}
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            disabled={isBusy(`dept:update:${editId}`)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="db-modal-foot">
                    <button className="db-btn db-btn-secondary" onClick={() => setShowEdit(false)} disabled={busyKey !== null} type="button">
                      Cancel
                    </button>
                    <button className="db-btn db-btn-primary" onClick={updateDepartment} disabled={busyKey !== null} type="button">
                      {isBusy(`dept:update:${editId}`) ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" style={{ width: 14, height: 14 }} />
                          Saving…
                        </>
                      ) : (
                        "Update Department"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}