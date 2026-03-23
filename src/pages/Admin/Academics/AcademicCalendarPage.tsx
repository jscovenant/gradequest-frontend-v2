// src/pages/Admin/Academics/AcademicCalendarPage.tsx
import React, { useEffect, useMemo, useState } from "react";
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
type TermStatus = "Active" | "Inactive" | string;

interface Term {
  id: number;
  name: string;
  status?: TermStatus;
  created_at?: string;
  updated_at?: string;
}

type SessionStatus = "Active" | "Inactive" | string;

interface AcademicSession {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status?: SessionStatus;
  is_current?: boolean | number;
  created_at?: string;
  updated_at?: string;
}

type TabKey = "sessions" | "terms";

/* =========================
   HELPERS
========================= */
function getErrorMessage(err: any): string {
  const status = err?.response?.status;
  const data = err?.response?.data;

  if (status === 409) return data?.message ?? "This item already exists.";
  if (status === 422) {
    const errors = data?.errors;
    if (errors) {
      const firstKey = Object.keys(errors)[0];
      const firstMsg = errors[firstKey]?.[0];
      if (firstMsg) return firstMsg;
    }
    return data?.message ?? "Validation error.";
  }
  return data?.message ?? err?.message ?? "Something went wrong.";
}

function toBool(v: any) {
  return v === true || v === 1 || v === "1";
}

function fmtDate(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
export default function AcademicCalendarPage() {
  const { showSuccess, showError } = useToast();

  // ===== Sidebar State =====
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ===== UI State =====
  const [activeTab, setActiveTab] = useState<TabKey>("sessions");
  const [query, setQuery] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // ===== Data =====
  const [terms, setTerms] = useState<Term[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);

  // ===== Loading =====
  const [loading, setLoading] = useState(true);
  const [loadingTerms, setLoadingTerms] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // ===== Modals =====
  const [showCreateTerm, setShowCreateTerm] = useState(false);
  const [showEditTerm, setShowEditTerm] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [showEditSession, setShowEditSession] = useState(false);

  // ===== Term forms =====
  const [createTermName, setCreateTermName] = useState("");
  const [editTermId, setEditTermId] = useState<number | null>(null);
  const [editTermName, setEditTermName] = useState("");

  // ===== Session forms =====
  const [createSession, setCreateSession] = useState({
    name: "",
    start_date: "",
    end_date: "",
  });

  const [editSessionId, setEditSessionId] = useState<number | null>(null);
  const [editSession, setEditSession] = useState({
    name: "",
    start_date: "",
    end_date: "",
    status: "Active" as SessionStatus,
  });

  const isBusy = (key: string) => busyKey === key;

  /* =========================
     FETCH
  ========================= */
  async function fetchTerms() {
    try {
      setLoadingTerms(true);
      const res = await authApi.get<Term[]>("/terms");
      setTerms(res.data ?? []);
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setLoadingTerms(false);
    }
  }

  async function fetchSessions() {
    try {
      setLoadingSessions(true);
      const res = await authApi.get<AcademicSession[]>("/sessions");
      setSessions(res.data ?? []);
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setLoadingSessions(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSessions(), fetchTerms()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setQuery("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  /* =========================
     DERIVED
  ========================= */
  const activeTerm = useMemo(
    () => terms.find((t) => (t.status ?? "").toLowerCase() === "active"),
    [terms]
  );

  const currentSession = useMemo(() => sessions.find((s) => toBool(s.is_current)), [sessions]);

  const filteredTerms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return terms;
    return terms.filter((t) => (t.name ?? "").toLowerCase().includes(q));
  }, [terms, query]);

  const filteredSessions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => {
      const hay = `${s.name ?? ""} ${s.start_date ?? ""} ${s.end_date ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [sessions, query]);

  const totalSessions = sessions.length;
  const totalTerms = terms.length;

  const activeTermsCount = useMemo(
    () => terms.filter((t) => (t.status ?? "").toLowerCase() === "active").length,
    [terms]
  );

  const currentSessionsCount = useMemo(() => sessions.filter((s) => toBool(s.is_current)).length, [sessions]);

  /* =========================
     PAGINATION (template-style)
  ========================= */
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => setPage(1), [query, activeTab, terms.length, sessions.length]);

  const dataForTab = activeTab === "sessions" ? filteredSessions : filteredTerms;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(dataForTab.length / perPage)), [dataForTab.length]);
  const safePage = clamp(page, 1, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return dataForTab.slice(start, start + perPage);
  }, [dataForTab, safePage]);

  /* =========================
     TERM ACTIONS
  ========================= */
  async function createTerm() {
    const name = createTermName.trim();
    if (!name) return showError("Please enter a term name.");

    try {
      setBusyKey("term:create");
      const res = await authApi.post("/terms", { name });
      showSuccess(res.data?.message ?? "Term created.");
      setCreateTermName("");
      setShowCreateTerm(false);
      await fetchTerms();
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  function openEditTerm(term: Term) {
    setEditTermId(term.id);
    setEditTermName(term.name ?? "");
    setShowEditTerm(true);
  }

  async function updateTerm() {
    if (!editTermId) return;
    const name = editTermName.trim();
    if (!name) return showError("Please enter a term name.");

    try {
      setBusyKey(`term:update:${editTermId}`);
      const res = await authApi.put(`/terms/${editTermId}`, { name });
      showSuccess(res.data?.message ?? "Term updated.");
      setShowEditTerm(false);
      setEditTermId(null);
      setEditTermName("");
      await fetchTerms();
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  async function setActiveTerm(termId: number) {
    try {
      setBusyKey(`term:setactive:${termId}`);
      const res = await authApi.put(`/terms/${termId}/status`);
      showSuccess(res.data?.message ?? "Term set as active.");
      await fetchTerms();
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  /* =========================
     SESSION ACTIONS
  ========================= */
  async function createNewSession() {
    const name = createSession.name.trim();
    if (!name) return showError("Please enter a session name.");
    if (!createSession.start_date) return showError("Please select a start date.");
    if (!createSession.end_date) return showError("Please select an end date.");

    try {
      setBusyKey("session:create");
      const res = await authApi.post("/sessions", {
        name,
        start_date: createSession.start_date,
        end_date: createSession.end_date,
      });
      showSuccess(res.data?.message ?? "Session created.");
      setCreateSession({ name: "", start_date: "", end_date: "" });
      setShowCreateSession(false);
      await fetchSessions();
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  function openEditSession(s: AcademicSession) {
    setEditSessionId(s.id);
    setEditSession({
      name: s.name ?? "",
      start_date: s.start_date ?? "",
      end_date: s.end_date ?? "",
      status: (s.status ?? "Active") as SessionStatus,
    });
    setShowEditSession(true);
  }

  async function updateSession() {
    if (!editSessionId) return;

    const name = editSession.name.trim();
    if (!name) return showError("Please enter a session name.");
    if (!editSession.start_date) return showError("Please select a start date.");
    if (!editSession.end_date) return showError("Please select an end date.");

    try {
      setBusyKey(`session:update:${editSessionId}`);
      const res = await authApi.put(`/sessions/${editSessionId}`, {
        name,
        start_date: editSession.start_date,
        end_date: editSession.end_date,
        status: editSession.status,
      });
      showSuccess(res.data?.message ?? "Session updated.");
      setShowEditSession(false);
      setEditSessionId(null);
      await fetchSessions();
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  async function setCurrentSession(sessionId: number) {
    try {
      setBusyKey(`session:current:${sessionId}`);
      // ✅ your route is POST /sessions/set-current/{id}
      const res = await authApi.post(`/sessions/set-current/${sessionId}`);
      showSuccess(res.data?.message ?? "Current session updated.");
      await fetchSessions();
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  /* =========================
     STYLES (same template family)
  ========================= */
  const STAT_META = [
    { color: "#b45309", bg: "#fef3c7", label: "Sessions total" },
    { color: "#065f46", bg: "#d1fae5", label: "Terms total" },
    { color: "#1e40af", bg: "#dbeafe", label: "Current session" },
    { color: "#7c3aed", bg: "#ede9fe", label: "Active term" },
  ];

  return (
    <>
      <style>{`
        /* ======= AcademicCalendarPage - AdminDashboard template style ======= */
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

        .db-tabs {
          display:inline-flex;
          gap: 8px;
          padding: 6px;
          border-radius: 14px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
        }
        .db-tab {
          display:inline-flex;
          align-items:center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 12px;
          cursor:pointer;
          font-size: 13px;
          font-weight: 700;
          border: 1px solid transparent;
          color: rgba(255,255,255,0.78);
          background: transparent;
          transition: background .2s, border-color .2s, color .2s;
          white-space: nowrap;
        }
        .db-tab:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .db-tab-active {
          background: rgba(201,168,76,0.12);
          border-color: rgba(201,168,76,0.26);
          color: #e8c97a;
        }

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
          background: var(--sc, #b45309);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s ease;
        }
        .db-stat:hover::before { transform: scaleX(1); }

        .db-stat-head { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom: 14px; }
        .db-stat-icon {
          width: 42px; height: 42px;
          border-radius: 10px;
          background: var(--si, #fef3c7);
          color: var(--sc, #b45309);
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
          font-weight: 700;
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
          font-weight: 800;
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
          font-weight: 800;
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
        .db-action-gold    { border-color: rgba(180, 83, 9, 0.25); color: #b45309; }
        .db-action-green   { border-color: rgba(6, 95, 70, 0.25); color: #065f46; }

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
          font-weight: 800;
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
          font-weight: 800;
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
        .db-field input, .db-field select {
          width: 100%;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid #e5ddd3;
          background: #faf8f5;
          outline: none;
          font-size: 13.5px;
          color: #1a1a2e;
        }
        .db-field input:focus, .db-field select:focus {
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

        .db-btn-green { background: #10b981; color: #062a22; border-color: rgba(16,185,129,0.35); }
        .db-btn-green:hover:not(:disabled) { background: #34d399; }

        @keyframes dbSpin { to { transform: rotate(360deg); } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Calendar" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loading && <Loader message="Loading academic calendar..." />}

            {/* ===== HERO ===== */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Academic Calendar • Settings
                  </div>

                  <h1 className="db-greeting">
                    {getGreeting()}, <em>Admin.</em>
                  </h1>

                  <p className="db-hero-sub">
                    Manage <b>sessions</b> and <b>terms</b> in one place. Set current session and active term for results,
                    attendance and promotions.
                  </p>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div className="db-tabs">
                      <button
                        className={`db-tab ${activeTab === "sessions" ? "db-tab-active" : ""}`}
                        onClick={() => setActiveTab("sessions")}
                        type="button"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M3.5 2.5v2M12.5 2.5v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M3 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <rect x="3" y="4.5" width="10" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                        Sessions
                      </button>

                      <button
                        className={`db-tab ${activeTab === "terms" ? "db-tab-active" : ""}`}
                        onClick={() => setActiveTab("terms")}
                        type="button"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M4 5h8M4 8h8M4 11h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <rect x="3" y="3.5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                        Terms
                      </button>
                    </div>

                    <span className="db-pill" style={{ background: "rgba(201,168,76,0.12)", color: "#e8c97a" }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M6 2v4l2.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                      {currentSession?.name ?? "No current session"} • {activeTerm?.name ?? "No active term"}
                    </span>
                  </div>

                  <div className="db-hero-btns" style={{ marginTop: 14 }}>
                    {activeTab === "sessions" ? (
                      <>
                        <button
                          className="db-btn-gold"
                          onClick={() => setShowCreateSession(true)}
                          disabled={busyKey !== null}
                          type="button"
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                          </svg>
                          Add Session
                        </button>

                        <button
                          className="db-btn-outline"
                          onClick={fetchSessions}
                          disabled={busyKey !== null || loadingSessions}
                          type="button"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            style={{ animation: loadingSessions ? "dbSpin 0.8s linear infinite" : "none" }}
                          >
                            <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Refresh
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="db-btn-gold"
                          onClick={() => setShowCreateTerm(true)}
                          disabled={busyKey !== null}
                          type="button"
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                          </svg>
                          Add Term
                        </button>

                        <button className="db-btn-outline" onClick={fetchTerms} disabled={busyKey !== null || loadingTerms} type="button">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            style={{ animation: loadingTerms ? "dbSpin 0.8s linear infinite" : "none" }}
                          >
                            <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Refresh
                        </button>
                      </>
                    )}
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
                      <span className="db-hero-stat-label">Sessions</span>
                      <span className="db-hero-stat-val">{totalSessions}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Terms</span>
                      <span className="db-hero-stat-val">{totalTerms}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Current set</span>
                      <span className="db-hero-stat-val">{currentSessionsCount ? "Yes" : "No"}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Active term:{" "}
                      <span style={{ color: "#fff", fontWeight: 700 }}>{activeTerm?.name ?? "Not set"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== STAT CARDS ===== */}
            <div className="db-stats">
              {[
                { title: "Total Sessions", value: totalSessions, hint: "All sessions" },
                { title: "Total Terms", value: totalTerms, hint: "All terms" },
                { title: "Current Session", value: currentSession?.name ?? "—", hint: "In use" },
                { title: "Active Term", value: activeTerm?.name ?? "—", hint: "In use" },
              ].map((c, i) => {
                const m = STAT_META[i];
                const icons = [
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" key="i1">
                    <path d="M6 3v2M14 3v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <rect x="4" y="5" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M4 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>,
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" key="i2">
                    <path d="M6 6h8M6 10h8M6 14h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <rect x="4" y="4" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  </svg>,
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" key="i3">
                    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>,
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" key="i4">
                    <path d="M6 10h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M10 6v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <rect x="4" y="4" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  </svg>,
                ];

                return (
                  <div className="db-stat" key={c.title} style={{ "--sc": m.color, "--si": m.bg } as React.CSSProperties}>
                    <div className="db-stat-head">
                      <div className="db-stat-icon">{icons[i]}</div>
                      <svg className="db-stat-more" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="4" cy="8" r="1.2" fill="currentColor" />
                        <circle cx="8" cy="8" r="1.2" fill="currentColor" />
                        <circle cx="12" cy="8" r="1.2" fill="currentColor" />
                      </svg>
                    </div>
                    <p className="db-stat-label">{c.title}</p>
                    <div className="db-stat-val" title={typeof c.value === "string" ? c.value : undefined}>
                      {c.value as any}
                    </div>
                    <div className="db-stat-footer">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 9l3-4 2 2 3-5" stroke="#22c55e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="db-stat-trend">OK</span>
                      <span style={{ color: "#9a8a7a" }}>{c.hint}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ===== PANEL: TOOLBAR + TABLE ===== */}
            <div className="db-panel">
              <div className="db-panel-head">
                <div>
                  <p className="db-panel-title">{activeTab === "sessions" ? "Sessions management" : "Terms management"}</p>
                  <p className="db-panel-sub">
                    {activeTab === "sessions" ? "Create, edit and set current session." : "Create, edit and set active term."}
                  </p>
                </div>

                <div className="db-toolbar">
                  <div className="db-input" title="Search">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="7" cy="7" r="4.5" stroke="#9a8a7a" strokeWidth="1.4" />
                      <path d="M11 11l3 3" stroke="#9a8a7a" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <input
                      placeholder={activeTab === "sessions" ? "Search sessions…" : "Search terms…"}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {query.trim() ? (
                      <button className="db-chip-btn" style={{ padding: "6px 10px", borderRadius: 10 }} onClick={() => setQuery("")} type="button">
                        Clear
                      </button>
                    ) : null}
                  </div>

                  {activeTab === "sessions" ? (
                    <>
                      <button className="db-chip-btn" onClick={fetchSessions} disabled={loadingSessions || busyKey !== null} type="button">
                        Refresh
                      </button>
                      <button className="db-chip-btn" onClick={() => setShowCreateSession(true)} disabled={busyKey !== null} type="button">
                        Add Session
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="db-chip-btn" onClick={fetchTerms} disabled={loadingTerms || busyKey !== null} type="button">
                        Refresh
                      </button>
                      <button className="db-chip-btn" onClick={() => setShowCreateTerm(true)} disabled={busyKey !== null} type="button">
                        Add Term
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="db-table">
                  <thead>
                    {activeTab === "sessions" ? (
                      <tr>
                        <th style={{ width: 70 }}>#</th>
                        <th>Session</th>
                        <th style={{ width: 170 }}>Start</th>
                        <th style={{ width: 170 }}>End</th>
                        <th style={{ width: 140 }}>Current</th>
                        <th style={{ width: 260, textAlign: "right" }}>Actions</th>
                      </tr>
                    ) : (
                      <tr>
                        <th style={{ width: 70 }}>#</th>
                        <th>Term</th>
                        <th style={{ width: 140 }}>Status</th>
                        <th style={{ width: 260, textAlign: "right" }}>Actions</th>
                      </tr>
                    )}
                  </thead>

                  <tbody>
                    {activeTab === "sessions" ? (
                      loadingSessions ? (
                        <tr>
                          <td colSpan={6} style={{ padding: 28, textAlign: "center", color: "#9a8a7a" }}>
                            <span className="spinner-border spinner-border-sm" /> <span style={{ marginLeft: 8 }}>Loading sessions…</span>
                          </td>
                        </tr>
                      ) : pageRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: 34, textAlign: "center", color: "#9a8a7a" }}>
                            <div style={{ fontWeight: 900, color: "#1a1a2e" }}>No sessions found</div>
                            <div style={{ marginTop: 6 }}>Click “Add session” to create one.</div>
                          </td>
                        </tr>
                      ) : (
                        (pageRows as AcademicSession[]).map((s, idx) => {
                          const current = toBool(s.is_current);
                          const busySet = isBusy(`session:current:${s.id}`);
                          const busyEdit = isBusy(`session:update:${s.id}`);

                          return (
                            <tr key={s.id}>
                              <td>{(safePage - 1) * perPage + idx + 1}</td>

                              <td>
                                <div style={{ fontWeight: 800, color: "#1a1a2e" }}>{s.name}</div>
                                <div style={{ fontSize: 12, color: "#9a8a7a" }}>ID: {s.id}</div>
                              </td>

                              <td>{fmtDate(s.start_date)}</td>
                              <td>{fmtDate(s.end_date)}</td>

                              <td>
                                <span
                                  className="db-pill"
                                  style={{
                                    background: current ? "rgba(16,185,129,0.16)" : "#f0ebe3",
                                    color: current ? "#065f46" : "#7a6a5a",
                                  }}
                                >
                                  {current ? "Current" : "—"}
                                </span>
                              </td>

                              <td style={{ textAlign: "right" }}>
                                <div className="db-actions">
                                  <button
                                    className="db-action-btn db-action-primary"
                                    onClick={() => openEditSession(s)}
                                    disabled={busyKey !== null}
                                    type="button"
                                  >
                                    Edit
                                  </button>

                                  <button
                                    className="db-action-btn db-action-green"
                                    onClick={() => setCurrentSession(s.id)}
                                    disabled={current || busyKey !== null}
                                    type="button"
                                    title={current ? "Already current" : "Set as current"}
                                  >
                                    {busySet ? (
                                      <>
                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: "dbSpin .9s linear infinite" }}>
                                          <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                          <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Setting…
                                      </>
                                    ) : (
                                      "Set Current"
                                    )}
                                  </button>

                                  {busyEdit ? <span className="db-pill">Saving…</span> : null}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )
                    ) : loadingTerms ? (
                      <tr>
                        <td colSpan={4} style={{ padding: 28, textAlign: "center", color: "#9a8a7a" }}>
                          <span className="spinner-border spinner-border-sm" /> <span style={{ marginLeft: 8 }}>Loading terms…</span>
                        </td>
                      </tr>
                    ) : pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: 34, textAlign: "center", color: "#9a8a7a" }}>
                          <div style={{ fontWeight: 900, color: "#1a1a2e" }}>No terms found</div>
                          <div style={{ marginTop: 6 }}>Click “Add term” to create one.</div>
                        </td>
                      </tr>
                    ) : (
                      (pageRows as Term[]).map((t, idx) => {
                        const isActive = (t.status ?? "").toLowerCase() === "active";
                        const busySet = isBusy(`term:setactive:${t.id}`);
                        const busyEdit = isBusy(`term:update:${t.id}`);

                        return (
                          <tr key={t.id}>
                            <td>{(safePage - 1) * perPage + idx + 1}</td>

                            <td>
                              <div style={{ fontWeight: 800, color: "#1a1a2e" }}>{t.name}</div>
                              <div style={{ fontSize: 12, color: "#9a8a7a" }}>ID: {t.id}</div>
                            </td>

                            <td>
                              <span
                                className="db-pill"
                                style={{
                                  background: isActive ? "rgba(16,185,129,0.16)" : "#f0ebe3",
                                  color: isActive ? "#065f46" : "#7a6a5a",
                                }}
                              >
                                {isActive ? "Active" : "Inactive"}
                              </span>
                            </td>

                            <td style={{ textAlign: "right" }}>
                              <div className="db-actions">
                                <button
                                  className="db-action-btn db-action-primary"
                                  onClick={() => openEditTerm(t)}
                                  disabled={busyKey !== null}
                                  type="button"
                                >
                                  Edit
                                </button>

                                <button
                                  className="db-action-btn db-action-green"
                                  onClick={() => setActiveTerm(t.id)}
                                  disabled={isActive || busyKey !== null}
                                  type="button"
                                  title={isActive ? "Already active" : "Set as active"}
                                >
                                  {busySet ? (
                                    <>
                                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: "dbSpin .9s linear infinite" }}>
                                        <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                        <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                      Setting…
                                    </>
                                  ) : (
                                    "Set Active"
                                  )}
                                </button>

                                {busyEdit ? <span className="db-pill">Saving…</span> : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="db-pagination">
                <div className="db-page-info">
                  Showing <b>{pageRows.length}</b> of <b>{dataForTab.length}</b> results • Page <b>{safePage}</b> of <b>{totalPages}</b>
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
                MODALS
            ========================= */}
            {showCreateSession && (
              <div className="db-modal-backdrop" onMouseDown={() => (busyKey ? null : setShowCreateSession(false))}>
                <div className="db-modal" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="db-modal-head">
                    <div className="db-modal-head-inner">
                      <div>
                        <h3 className="db-modal-title">Add Session</h3>
                        <p className="db-modal-sub">Create a new academic session (e.g. 2025/2026).</p>
                      </div>
                      <button className="db-modal-close" onClick={() => setShowCreateSession(false)} disabled={busyKey !== null} type="button">
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="db-modal-body">
                    <div className="db-modal-card">
                      <div className="db-form-grid">
                        <div className="db-field" style={{ gridColumn: "1 / -1" }}>
                          <label>Session name *</label>
                          <input
                            placeholder="e.g. 2025/2026"
                            value={createSession.name}
                            onChange={(e) => setCreateSession((p) => ({ ...p, name: e.target.value }))}
                            disabled={isBusy("session:create")}
                          />
                        </div>

                        <div className="db-field">
                          <label>Start date *</label>
                          <input
                            type="date"
                            value={createSession.start_date}
                            onChange={(e) => setCreateSession((p) => ({ ...p, start_date: e.target.value }))}
                            disabled={isBusy("session:create")}
                          />
                        </div>

                        <div className="db-field">
                          <label>End date *</label>
                          <input
                            type="date"
                            value={createSession.end_date}
                            onChange={(e) => setCreateSession((p) => ({ ...p, end_date: e.target.value }))}
                            disabled={isBusy("session:create")}
                          />
                        </div>

                        <div className="db-help" style={{ gridColumn: "1 / -1" }}>
                          Tip: Use a consistent format like <b>2025/2026</b>.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="db-modal-foot">
                    <button className="db-btn db-btn-secondary" onClick={() => setShowCreateSession(false)} disabled={busyKey !== null} type="button">
                      Cancel
                    </button>
                    <button className="db-btn db-btn-primary" onClick={createNewSession} disabled={busyKey !== null} type="button">
                      {isBusy("session:create") ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" style={{ width: 14, height: 14 }} />
                          Saving…
                        </>
                      ) : (
                        "Save Session"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showEditSession && editSessionId && (
              <div className="db-modal-backdrop" onMouseDown={() => (busyKey ? null : setShowEditSession(false))}>
                <div className="db-modal" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="db-modal-head">
                    <div className="db-modal-head-inner">
                      <div>
                        <h3 className="db-modal-title">Edit Session</h3>
                        <p className="db-modal-sub">Update session details.</p>
                      </div>
                      <button className="db-modal-close" onClick={() => setShowEditSession(false)} disabled={busyKey !== null} type="button">
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="db-modal-body">
                    <div className="db-modal-card">
                      <div className="db-form-grid">
                        <div className="db-field" style={{ gridColumn: "1 / -1" }}>
                          <label>Session name *</label>
                          <input
                            value={editSession.name}
                            onChange={(e) => setEditSession((p) => ({ ...p, name: e.target.value }))}
                            disabled={isBusy(`session:update:${editSessionId}`)}
                          />
                        </div>

                        <div className="db-field">
                          <label>Start date *</label>
                          <input
                            type="date"
                            value={editSession.start_date}
                            onChange={(e) => setEditSession((p) => ({ ...p, start_date: e.target.value }))}
                            disabled={isBusy(`session:update:${editSessionId}`)}
                          />
                        </div>

                        <div className="db-field">
                          <label>End date *</label>
                          <input
                            type="date"
                            value={editSession.end_date}
                            onChange={(e) => setEditSession((p) => ({ ...p, end_date: e.target.value }))}
                            disabled={isBusy(`session:update:${editSessionId}`)}
                          />
                        </div>

                        <div className="db-field" style={{ gridColumn: "1 / -1" }}>
                          <label>Status</label>
                          <select
                            value={editSession.status}
                            onChange={(e) => setEditSession((p) => ({ ...p, status: e.target.value }))}
                            disabled={isBusy(`session:update:${editSessionId}`)}
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="db-modal-foot">
                    <button className="db-btn db-btn-secondary" onClick={() => setShowEditSession(false)} disabled={busyKey !== null} type="button">
                      Cancel
                    </button>
                    <button className="db-btn db-btn-primary" onClick={updateSession} disabled={busyKey !== null} type="button">
                      {isBusy(`session:update:${editSessionId}`) ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" style={{ width: 14, height: 14 }} />
                          Updating…
                        </>
                      ) : (
                        "Update Session"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showCreateTerm && (
              <div className="db-modal-backdrop" onMouseDown={() => (busyKey ? null : setShowCreateTerm(false))}>
                <div className="db-modal" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="db-modal-head">
                    <div className="db-modal-head-inner">
                      <div>
                        <h3 className="db-modal-title">Add Term</h3>
                        <p className="db-modal-sub">Create a new term for your school.</p>
                      </div>
                      <button className="db-modal-close" onClick={() => setShowCreateTerm(false)} disabled={busyKey !== null} type="button">
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="db-modal-body">
                    <div className="db-modal-card">
                      <div className="db-form-grid">
                        <div className="db-field" style={{ gridColumn: "1 / -1" }}>
                          <label>Term name *</label>
                          <input
                            placeholder="e.g. First Term"
                            value={createTermName}
                            onChange={(e) => setCreateTermName(e.target.value)}
                            disabled={isBusy("term:create")}
                          />
                          <div className="db-help">Tip: Keep naming consistent across sessions.</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="db-modal-foot">
                    <button className="db-btn db-btn-secondary" onClick={() => setShowCreateTerm(false)} disabled={busyKey !== null} type="button">
                      Cancel
                    </button>
                    <button className="db-btn db-btn-primary" onClick={createTerm} disabled={busyKey !== null} type="button">
                      {isBusy("term:create") ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" style={{ width: 14, height: 14 }} />
                          Saving…
                        </>
                      ) : (
                        "Save Term"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showEditTerm && editTermId && (
              <div className="db-modal-backdrop" onMouseDown={() => (busyKey ? null : setShowEditTerm(false))}>
                <div className="db-modal" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="db-modal-head">
                    <div className="db-modal-head-inner">
                      <div>
                        <h3 className="db-modal-title">Edit Term</h3>
                        <p className="db-modal-sub">Update term name.</p>
                      </div>
                      <button className="db-modal-close" onClick={() => setShowEditTerm(false)} disabled={busyKey !== null} type="button">
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="db-modal-body">
                    <div className="db-modal-card">
                      <div className="db-form-grid">
                        <div className="db-field" style={{ gridColumn: "1 / -1" }}>
                          <label>Term name *</label>
                          <input
                            value={editTermName}
                            onChange={(e) => setEditTermName(e.target.value)}
                            disabled={isBusy(`term:update:${editTermId}`)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="db-modal-foot">
                    <button className="db-btn db-btn-secondary" onClick={() => setShowEditTerm(false)} disabled={busyKey !== null} type="button">
                      Cancel
                    </button>
                    <button className="db-btn db-btn-primary" onClick={updateTerm} disabled={busyKey !== null} type="button">
                      {isBusy(`term:update:${editTermId}`) ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" style={{ width: 14, height: 14 }} />
                          Updating…
                        </>
                      ) : (
                        "Update Term"
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