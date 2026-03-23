// src/pages/Admin/Academics/SectionsPage.tsx
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
type Section = {
  id: number;
  name: string;
  school_id?: number;
  created_at?: string;
  updated_at?: string;
};

type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
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
export default function SectionsPage() {
  const { showSuccess, showError } = useToast();

  // layout
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // loading
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingSections, setLoadingSections] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // data
  const [sections, setSections] = useState<Section[]>([]);
  const [query, setQuery] = useState("");

  // pagination (server)
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  // modals
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  // create
  const [createName, setCreateName] = useState("");

  // edit
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const isBusy = (key: string) => busyKey === key;

  /* =========================
     FETCH
  ========================= */
  async function fetchSections(p = page) {
    try {
      setLoadingSections(true);

      // API exists as /sections or /sections/ in your project
      let res: any;
      try {
        res = await authApi.get<Paginated<Section>>("/sections", { params: { page: p } });
      } catch {
        res = await authApi.get<Paginated<Section>>("/sections/", { params: { page: p } });
      }

      const payload = res.data;

      const list = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      setSections(list);
      setPage(payload?.current_page ?? p);
      setLastPage(payload?.last_page ?? 1);
     setPerPage(payload?.per_page ?? (list.length || 10));
      setTotal(payload?.total ?? list.length);
    } catch (err: any) {
      showError(getErrorMessage(err));
      setSections([]);
      setLastPage(1);
      setTotal(0);
      setPerPage(10);
    } finally {
      setLoadingSections(false);
    }
  }

  useEffect(() => {
    setLoadingPage(true);
    fetchSections(1).finally(() => setLoadingPage(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchSections(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  /* =========================
     DERIVED
  ========================= */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter((s) => (s.name ?? "").toLowerCase().includes(q));
  }, [sections, query]);

  // If user is searching, use client-side pagination (template style)
  const usingLocalPaging = query.trim().length > 0;

  const localTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / Math.max(1, perPage))),
    [filtered.length, perPage]
  );

  // reset local page when query changes
  useEffect(() => {
    if (usingLocalPaging) setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const safePage = usingLocalPaging ? clamp(page, 1, localTotalPages) : clamp(page, 1, lastPage);

  const pageRows = useMemo(() => {
    if (!usingLocalPaging) return filtered;

    const start = (safePage - 1) * Math.max(1, perPage);
    return filtered.slice(start, start + Math.max(1, perPage));
  }, [filtered, usingLocalPaging, safePage, perPage]);

  const displayTotal = usingLocalPaging ? filtered.length : total;
  const displayLastPage = usingLocalPaging ? localTotalPages : lastPage;

  /* =========================
     ACTIONS
  ========================= */
  async function createSection() {
    const name = createName.trim();
    if (!name) return showError("Please enter a section name.");

    try {
      setBusyKey("sec:create");
      const res = await authApi.post("/sections", { name });
      showSuccess(res.data?.message ?? "Section saved successfully.");
      setShowCreate(false);
      setCreateName("");

      // If searching locally, refresh page 1 so the new item can appear
      if (usingLocalPaging) {
        setQuery("");
        await fetchSections(1);
      } else {
        await fetchSections(page);
      }
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  function openEdit(s: Section) {
    setEditId(s.id);
    setEditName(s.name ?? "");
    setShowEdit(true);
  }

  async function updateSection() {
    if (!editId) return;
    const name = editName.trim();
    if (!name) return showError("Please enter a section name.");

    try {
      setBusyKey(`sec:update:${editId}`);
      const res = await authApi.put(`/sections/${editId}`, { name });
      showSuccess(res.data?.message ?? "Section updated successfully.");
      setShowEdit(false);
      setEditId(null);
      setEditName("");

      if (usingLocalPaging) {
        await fetchSections(1);
      } else {
        await fetchSections(page);
      }
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  /* =========================
     TEMPLATE STYLES (inline)
  ========================= */
  return (
    <>
      <style>{`
        /* ======= SectionsPage - AdminDashboard template style ======= */
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
          background: radial-gradient(circle, rgba(16, 185, 129, 0.10) 0%, transparent 65%);
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
          color: #86efac;
          background: rgba(16, 185, 129, 0.10);
          border: 1px solid rgba(16, 185, 129, 0.20);
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
        .db-greeting em { font-style: italic; color: #86efac; }

        .db-hero-sub {
          font-size: 13.5px;
          font-weight: 300;
          color: #64748b;
          line-height: 1.65;
          max-width: 720px;
          margin-bottom: 18px;
        }

        .db-hero-btns { display:flex; gap:10px; flex-wrap:wrap; }

        .db-btn-green {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 700;
          color: #052e1b;
          background: #22c55e;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
          white-space: nowrap;
        }
        .db-btn-green:hover { background: #86efac; transform: translateY(-1px); }
        .db-btn-green:disabled { opacity: .55; cursor:not-allowed; transform:none; }

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
          width: min(900px, 96vw);
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

        .db-field label {
          display:block;
          font-size: 12px;
          font-weight: 900;
          color: #7a6a5a;
          margin-bottom: 6px;
          letter-spacing: .02em;
        }
        .db-field input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid #e5ddd3;
          background: #faf8f5;
          outline: none;
          font-size: 13.5px;
          color: #1a1a2e;
        }
        .db-field input:focus {
          border-color: rgba(34,197,94,0.55);
          box-shadow: 0 0 0 4px rgba(34,197,94,0.16);
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
        .db-btn-primary { background: #22c55e; color: #052e1b; border-color: rgba(34,197,94,0.35); }
        .db-btn-primary:hover:not(:disabled) { background:#86efac; }

        @keyframes dbSpin { to { transform: rotate(360deg); } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Academic Section" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loadingPage && <Loader message="Loading sections..." />}

            {/* ===== HERO ===== */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Sections • School Structure
                  </div>

                  <h1 className="db-greeting">
                    {getGreeting()}, <em>Admin.</em>
                  </h1>

                  <p className="db-hero-sub">
                    Create and manage sections (e.g. Primary, Junior Secondary, Senior Secondary). Sections help you group classes properly.
                  </p>

                  <div className="db-hero-btns">
                    <button className="db-btn-green" onClick={() => setShowCreate(true)} disabled={busyKey !== null} type="button">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      Add Section
                    </button>

                    <button
                      className="db-btn-outline"
                      onClick={() => fetchSections(page)}
                      disabled={busyKey !== null || loadingSections}
                      type="button"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        style={{ animation: loadingSections ? "dbSpin 0.8s linear infinite" : "none" }}
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
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#86efac" }}>
                      Quick summary
                    </span>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M2 10V6M5 10V4M8 10V7M11 10V3" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div className="db-hero-stat-row">
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Total sections</span>
                      <span className="db-hero-stat-val">{loadingSections ? "…" : displayTotal}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Pagination</span>
                      <span className="db-hero-stat-val">
                        {safePage}/{displayLastPage}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Search uses local paging (does not request server).
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== PANEL ===== */}
            <div className="db-panel">
              <div className="db-panel-head">
                <div>
                  <p className="db-panel-title">Sections</p>
                  <p className="db-panel-sub">Search, create and edit sections.</p>
                </div>

                <div className="db-toolbar">
                  <div className="db-input" title="Search">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="7" cy="7" r="4.5" stroke="#9a8a7a" strokeWidth="1.4" />
                      <path d="M11 11l3 3" stroke="#9a8a7a" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <input
                      placeholder="Search sections…"
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

                  <button className="db-chip-btn" onClick={() => fetchSections(page)} disabled={busyKey !== null || loadingSections} type="button">
                    Refresh
                  </button>
                  <button className="db-chip-btn" onClick={() => setShowCreate(true)} disabled={busyKey !== null} type="button">
                    Add Section
                  </button>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="db-table">
                  <thead>
                    <tr>
                      <th style={{ width: 340 }}>Section</th>
                      <th style={{ width: 220, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loadingSections ? (
                      <tr>
                        <td colSpan={2} style={{ padding: 28, textAlign: "center", color: "#9a8a7a" }}>
                          <span className="spinner-border spinner-border-sm" /> <span style={{ marginLeft: 8 }}>Loading sections…</span>
                        </td>
                      </tr>
                    ) : pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={2} style={{ padding: 34, textAlign: "center", color: "#9a8a7a" }}>
                          <div style={{ fontWeight: 900, color: "#1a1a2e" }}>No sections found</div>
                          <div style={{ marginTop: 6 }}>Click “Add section” to create one.</div>
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <div style={{ fontWeight: 900, color: "#1a1a2e" }}>{s.name}</div>
                            <div style={{ fontSize: 12, color: "#9a8a7a" }}>ID: {s.id}</div>
                          </td>

                          <td style={{ textAlign: "right" }}>
                            <div className="db-actions">
                              <button
                                className="db-action-btn db-action-primary"
                                onClick={() => openEdit(s)}
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

              {/* Pagination */}
              <div className="db-pagination">
                <div className="db-page-info">
                  Showing <b>{pageRows.length}</b> of <b>{displayTotal}</b> • Page <b>{safePage}</b> of <b>{displayLastPage}</b>
                </div>

                <div className="db-page-btns">
                  <button
                    className="db-page-btn"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1 || busyKey !== null}
                    type="button"
                  >
                    Prev
                  </button>

                  <button
                    className="db-page-btn"
                    onClick={() => {
                      const nextMax = displayLastPage;
                      setPage((p) => Math.min(nextMax, p + 1));
                    }}
                    disabled={safePage >= displayLastPage || busyKey !== null}
                    type="button"
                  >
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
                        <h3 className="db-modal-title">Add Section</h3>
                        <p className="db-modal-sub">Create a new section.</p>
                      </div>
                      <button className="db-modal-close" onClick={() => setShowCreate(false)} disabled={busyKey !== null} type="button">
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="db-modal-body">
                    <div className="db-modal-card">
                      <div className="db-field">
                        <label>Name *</label>
                        <input
                          placeholder="e.g. Junior Secondary"
                          value={createName}
                          onChange={(e) => setCreateName(e.target.value)}
                          disabled={isBusy("sec:create")}
                        />
                        <div className="db-help">Examples: Primary, Junior, Senior.</div>
                      </div>
                    </div>
                  </div>

                  <div className="db-modal-foot">
                    <button className="db-btn db-btn-secondary" onClick={() => setShowCreate(false)} disabled={busyKey !== null} type="button">
                      Cancel
                    </button>
                    <button className="db-btn db-btn-primary" onClick={createSection} disabled={busyKey !== null} type="button">
                      {isBusy("sec:create") ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" style={{ width: 14, height: 14 }} />
                          Saving…
                        </>
                      ) : (
                        "Save Section"
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
                        <h3 className="db-modal-title">Edit Section</h3>
                        <p className="db-modal-sub">Update section name.</p>
                      </div>
                      <button className="db-modal-close" onClick={() => setShowEdit(false)} disabled={busyKey !== null} type="button">
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="db-modal-body">
                    <div className="db-modal-card">
                      <div className="db-field">
                        <label>Name *</label>
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          disabled={isBusy(`sec:update:${editId}`)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="db-modal-foot">
                    <button className="db-btn db-btn-secondary" onClick={() => setShowEdit(false)} disabled={busyKey !== null} type="button">
                      Cancel
                    </button>
                    <button className="db-btn db-btn-primary" onClick={updateSection} disabled={busyKey !== null} type="button">
                      {isBusy(`sec:update:${editId}`) ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" style={{ width: 14, height: 14 }} />
                          Saving…
                        </>
                      ) : (
                        "Update Section"
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