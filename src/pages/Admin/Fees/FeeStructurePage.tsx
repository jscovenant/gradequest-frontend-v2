// src/pages/Fees/FeeStructurePage.tsx
import { useEffect, useMemo, useState } from "react";
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
type Option = { id: number; name: string };

type FeeType = {
  id: number;
  school_id: number;
  section_id: number;
  session_id: number;
  term_id: number;
  name: string;
  amount: number;
  created_at?: string;
  updated_at?: string;

  section?: Option | null;
  session?: Option | null;
  term?: Option | null;
};

type IndexResponse = {
  feeTypes: {
    data: FeeType[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  sections: Option[];
  sessions: Option[];
  terms: Option[];
};

/* =========================
   HELPERS
========================= */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getErrorMessage(err: any): string {
  const status = err?.response?.status;
  const data = err?.response?.data;

  if (status === 409) return data?.message ?? data?.error ?? "This item already exists.";
  if (status === 404) return data?.message ?? "Not found.";
  if (status === 422) return data?.message ?? "Validation error.";
  return data?.message ?? err?.message ?? "Something went wrong.";
}

function naira(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return v.toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  });
}

/* =========================
   PAGE
========================= */
export default function FeeStructurePage() {
  const { showSuccess, showError } = useToast();

  // layout
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // loading
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingIndex, setLoadingIndex] = useState(true);

  // meta
  const [sections, setSections] = useState<Option[]>([]);
  const [sessions, setSessions] = useState<Option[]>([]);
  const [terms, setTerms] = useState<Option[]>([]);

  // list
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // filters
  const [search, setSearch] = useState("");
  const [sectionId, setSectionId] = useState<number | "">("");
  const [sessionId, setSessionId] = useState<number | "">("");
  const [termId, setTermId] = useState<number | "">("");

  // busy key
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const isBusy = (k: string) => busyKey === k;

  // modals
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  // create form
  const [cSectionId, setCSectionId] = useState<number | "">("");
  const [cSessionId, setCSessionId] = useState<number | "">("");
  const [cTermId, setCTermId] = useState<number | "">("");
  const [cName, setCName] = useState("");
  const [cAmount, setCAmount] = useState<string>("");

  // edit form
  const [eId, setEId] = useState<number | null>(null);
  const [eSectionId, setESectionId] = useState<number | "">("");
  const [eSessionId, setESessionId] = useState<number | "">("");
  const [eTermId, setETermId] = useState<number | "">("");
  const [eName, setEName] = useState("");
  const [eAmount, setEAmount] = useState<string>("");

  useEffect(() => {
    const t = window.setTimeout(() => setLoadingPage(false), 120);
    return () => window.clearTimeout(t);
  }, []);

  /* =========================
     FETCH INDEX
  ========================= */
  async function fetchIndex(nextPage?: number) {
    const p = nextPage ?? page;

    try {
      setLoadingIndex(true);

      const res = await authApi.get<IndexResponse>("/fee-types", {
        params: {
          page: p,
          search: search.trim() || undefined,
          section_id: sectionId || undefined,
          session_id: sessionId || undefined,
          term_id: termId || undefined,
        },
      });

      const payload = res.data;

      const ft = payload?.feeTypes?.data ?? [];
      setFeeTypes(Array.isArray(ft) ? ft : []);

      setSections(Array.isArray(payload.sections) ? payload.sections : []);
      setSessions(Array.isArray(payload.sessions) ? payload.sessions : []);
      setTerms(Array.isArray(payload.terms) ? payload.terms : []);

      setPage(payload?.feeTypes?.current_page ?? p);
      setLastPage(payload?.feeTypes?.last_page ?? 1);
      setTotal(payload?.feeTypes?.total ?? ft.length ?? 0);
    } catch (e: any) {
      console.error(e);
      showError(getErrorMessage(e));
      setFeeTypes([]);
    } finally {
      setLoadingIndex(false);
    }
  }

  useEffect(() => {
    fetchIndex(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When filters/search change -> reset to page 1
  useEffect(() => {
    const t = window.setTimeout(() => {
      fetchIndex(1);
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sectionId, sessionId, termId]);

  const summary = useMemo(() => {
    const sum = feeTypes.reduce((acc, f) => acc + Number(f.amount ?? 0), 0);
    return { count: feeTypes.length, sum };
  }, [feeTypes]);

  const sectionName = (f: FeeType) => f.section?.name ?? sections.find((s) => s.id === f.section_id)?.name ?? "—";
  const sessionName = (f: FeeType) => f.session?.name ?? sessions.find((s) => s.id === f.session_id)?.name ?? "—";
  const termName = (f: FeeType) => f.term?.name ?? terms.find((t) => t.id === f.term_id)?.name ?? "—";

  /* =========================
     CREATE
  ========================= */
  function openCreate() {
    setCSectionId(sectionId || "");
    setCSessionId(sessionId || "");
    setCTermId(termId || "");
    setCName("");
    setCAmount("");
    setShowCreate(true);
  }

  async function createFeeType() {
    if (!cSectionId || !cSessionId || !cTermId) return showError("Please select Section, Session and Term.");
    const name = cName.trim();
    if (!name) return showError("Please enter fee name.");
    const amountNum = Number(cAmount);
    if (Number.isNaN(amountNum) || amountNum < 0) return showError("Enter a valid amount.");

    try {
      setBusyKey("fee:create");
      const res = await authApi.post("/fee-types", {
        section_id: Number(cSectionId),
        session_id: Number(cSessionId),
        term_id: Number(cTermId),
        name,
        amount: amountNum,
      });

      showSuccess(res.data?.message ?? "Fee type created successfully.");
      setShowCreate(false);
      await fetchIndex(1);
    } catch (e: any) {
      console.error(e);
      showError(getErrorMessage(e));
    } finally {
      setBusyKey(null);
    }
  }

  /* =========================
     EDIT
  ========================= */
  async function openEdit(id: number) {
    try {
      setBusyKey(`fee:load:${id}`);
      const res = await authApi.get<FeeType>(`/fee-types/${id}`);
      const f = res.data;

      setEId(f.id);
      setESectionId(f.section_id ?? "");
      setESessionId(f.session_id ?? "");
      setETermId(f.term_id ?? "");
      setEName(f.name ?? "");
      setEAmount(String(f.amount ?? 0));

      setShowEdit(true);
    } catch (e: any) {
      console.error(e);
      showError(getErrorMessage(e));
    } finally {
      setBusyKey(null);
    }
  }

  async function updateFeeType() {
    if (!eId) return;
    if (!eSectionId || !eSessionId || !eTermId) return showError("Please select Section, Session and Term.");
    const name = eName.trim();
    if (!name) return showError("Please enter fee name.");
    const amountNum = Number(eAmount);
    if (Number.isNaN(amountNum) || amountNum < 0) return showError("Enter a valid amount.");

    try {
      setBusyKey(`fee:update:${eId}`);
      const res = await authApi.put(`/fee-types/${eId}`, {
        section_id: Number(eSectionId),
        session_id: Number(eSessionId),
        term_id: Number(eTermId),
        name,
        amount: amountNum,
      });

      showSuccess(res.data?.message ?? "Fee type updated successfully.");
      setShowEdit(false);
      setEId(null);
      await fetchIndex(page);
    } catch (e: any) {
      console.error(e);
      showError(getErrorMessage(e));
    } finally {
      setBusyKey(null);
    }
  }

  /* =========================
     DELETE
  ========================= */
  async function deleteFeeType(id: number) {
    const ok = window.confirm("Delete this fee type? This cannot be undone.");
    if (!ok) return;

    try {
      setBusyKey(`fee:delete:${id}`);
      const res = await authApi.delete(`/fee-types/${id}`);
      showSuccess(res.data?.message ?? "Fee type deleted successfully.");
      await fetchIndex(Math.min(page, lastPage));
    } catch (e: any) {
      console.error(e);
      showError(getErrorMessage(e));
    } finally {
      setBusyKey(null);
    }
  }

  /* =========================
     PAGINATION
  ========================= */
  const canPrev = page > 1 && !loadingIndex;
  const canNext = page < lastPage && !loadingIndex;

  const activeFiltersCount =
    (search.trim() ? 1 : 0) + (sectionId ? 1 : 0) + (sessionId ? 1 : 0) + (termId ? 1 : 0);

  /* =========================
     RENDER
  ========================= */
  return (
    <>
      {/* Template-style inline CSS (matches your AdminDashboard aesthetic) */}
      <style>{`
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
          margin-bottom: 20px;
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
          max-width: 520px;
          margin-bottom: 16px;
        }

        .db-hero-btns {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .db-btn-gold {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 18px;
          font-family: "DM Sans", sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: #0f172a;
          background: #c9a84c;
          border: none;
          border-radius: var(--bs-border-radius, 8px);
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
          text-decoration: none;
          white-space: nowrap;
        }
        .db-btn-gold:hover { background: #e8c97a; transform: translateY(-1px); }
        .db-btn-gold:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        .db-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 18px;
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
        .db-btn-outline:hover { background: rgba(255, 255, 255, 0.06); color: #fff; border-color: rgba(255, 255, 255, 0.28); }
        .db-btn-outline:disabled { opacity: 0.55; cursor: not-allowed; }

        .db-hero-stat-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.09);
          backdrop-filter: blur(8px);
          border-radius: var(--bs-border-radius, 12px);
          padding: 20px 24px;
          min-width: 260px;
        }
        .db-hero-stat-row { display: flex; flex-direction: column; gap: 10px; }
        .db-hero-stat-item { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .db-hero-stat-label { font-size: 12px; font-weight: 300; color: #64748b; }
        .db-hero-stat-val {
          font-family: "Lora", serif;
          font-size: 18px;
          font-weight: 700;
          color: #fff;
        }
        .db-hero-stat-sep { height: 1px; background: rgba(255, 255, 255, 0.06); }

        .db-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
          margin-bottom: 24px;
        }

        .db-panel {
          background: var(--bs-body-bg, #fff);
          border: 1px solid var(--bs-border-color, #ede8e0);
          border-radius: var(--bs-border-radius-lg, 14px);
          overflow: hidden;
        }

        .db-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          gap: 12px;
          flex-wrap: wrap;
        }

        .db-panel-title-group { display: flex; align-items: center; gap: 12px; min-width: 240px; }
        .db-panel-icon {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--pi, #fef3c7);
          color: var(--pc, #b45309);
          flex-shrink: 0;
        }
        .db-panel-title {
          font-family: "Lora", serif;
          font-size: 16px;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0;
        }
        .db-panel-sub { font-size: 11.5px; font-weight: 300; color: #9a8a7a; margin: 0; }

        .db-toolbar {
          padding: 14px 20px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .db-input, .db-select {
          height: 40px;
          border-radius: 10px;
          border: 1px solid #e5ddd3;
          background: #fff;
          font-size: 13px;
          color: #1a1a2e;
          padding: 0 12px;
          outline: none;
          transition: box-shadow 0.2s, border-color 0.2s;
        }
        .db-input:focus, .db-select:focus {
          border-color: rgba(201, 168, 76, 0.65);
          box-shadow: 0 0 0 4px rgba(201, 168, 76, 0.18);
        }

        .db-input-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .db-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border-radius: 999px;
          padding: 6px 10px;
          border: 1px solid rgba(0,0,0,0.08);
          background: #faf8f5;
          color: #7a6a5a;
          white-space: nowrap;
        }

        .db-table {
          width: 100%;
          border-collapse: collapse;
        }
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
        .db-table td {
          padding: 13px 16px;
          font-size: 13.5px;
          color: #4a4a5a;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          vertical-align: middle;
        }
        .db-table tbody tr { transition: background 0.15s; }
        .db-table tbody tr:hover { background: #faf8f5; }

        .db-pill {
          display: inline-flex;
          align-items: center;
          font-size: 12px;
          font-weight: 500;
          padding: 3px 10px;
          border-radius: 999px;
          background: rgba(30, 64, 175, 0.08);
          color: #1e40af;
          border: 1px solid rgba(30, 64, 175, 0.12);
        }

        .db-pill--gold {
          background: rgba(180, 83, 9, 0.08);
          color: #b45309;
          border-color: rgba(180, 83, 9, 0.14);
        }

        .db-actions-cell {
          display: inline-flex;
          gap: 8px;
          justify-content: flex-end;
          width: 100%;
          flex-wrap: wrap;
        }

        .db-sm-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          font-size: 12.5px;
          border-radius: 10px;
          border: 1px solid #e5ddd3;
          background: #f5f1eb;
          color: #1a1a2e;
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
          white-space: nowrap;
        }
        .db-sm-btn:hover:not(:disabled) { background: #ede8e0; transform: translateY(-1px); }
        .db-sm-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        .db-sm-btn--danger {
          background: rgba(220, 38, 38, 0.08);
          border-color: rgba(220, 38, 38, 0.18);
          color: #b91c1c;
        }
        .db-sm-btn--danger:hover:not(:disabled) { background: rgba(220, 38, 38, 0.12); }

        .db-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          flex-wrap: wrap;
          gap: 10px;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
        }

        .db-page-info {
          font-size: 12px;
          font-weight: 300;
          color: #9a8a7a;
        }

        .db-page-btns { display: flex; align-items: center; gap: 6px; }

        .db-page-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          font-size: 12.5px;
          font-weight: 400;
          color: #7a6a5a;
          background: #f5f1eb;
          border: 1px solid #e5ddd3;
          border-radius: var(--bs-border-radius, 9px);
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
          white-space: nowrap;
        }
        .db-page-btn:hover:not(:disabled) { background: #ede8e0; color: #1a1a2e; }
        .db-page-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .db-page-current { padding: 6px 10px; font-size: 12px; color: #9a8a7a; }

        .db-table-empty {
          padding: 48px 16px;
          text-align: center;
          color: #b5a090;
          font-size: 13.5px;
        }

        .db-alert {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: var(--bs-border-radius, 10px);
          padding: 11px 14px;
          font-size: 13px;
          color: #9a3412;
          margin: 12px 20px 0;
        }

        /* Modal */
        .db-modal-overlay {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(6px);
          z-index: 1100;
          padding: 12px;
        }
        .db-modal-card {
          width: 100%;
          max-width: 780px;
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.06);
          background: #fff;
          box-shadow: 0 22px 70px rgba(0,0,0,0.25);
          overflow: hidden;
        }
        .db-modal-head {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .db-modal-body { padding: 18px 20px 20px; }
        .db-modal-title {
          font-family: "Lora", serif;
          font-size: 16px;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0 0 4px;
        }
        .db-modal-sub { margin: 0; font-size: 12px; color: #9a8a7a; }

        .db-form-label { font-size: 12px; font-weight: 600; color: #1a1a2e; margin-bottom: 6px; display: block; }
        .db-row { display: grid; grid-template-columns: repeat(12, 1fr); gap: 12px; }
        .db-col-12 { grid-column: span 12; }
        .db-col-4 { grid-column: span 4; }
        .db-col-8 { grid-column: span 8; }
        @media (max-width: 767.98px) {
          .db-col-4, .db-col-8 { grid-column: span 12; }
          .db-main { padding: 18px 14px 0; }
          .db-hero { padding: 24px 20px; }
        }

        .db-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 14px;
        }

        @keyframes dbSpin { to { transform: rotate(360deg); } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Fee Structure" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loadingPage && <Loader message="Loading fee structure..." />}

            {/* HERO */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge" title="Fee Structure">
                    <span className="db-session-dot" />
                    Fee Structure • Manage payments
                  </div>

                  <h1 className="db-greeting">
                    {getGreeting()}, <em>Admin.</em>
                  </h1>

                  <p className="db-hero-sub">
                    Create and manage fee types per <b>Section</b>, <b>Session</b> and <b>Term</b>. Use search + filters
                    to quickly locate records and maintain accurate fee setup.
                  </p>

                  <div className="db-hero-btns">
                    <button className="db-btn-gold" onClick={openCreate} disabled={busyKey !== null}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M8 2v12M2 8h12"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>
                      Add Fee Type
                    </button>

                    <button
                      className="db-btn-outline"
                      onClick={() => fetchIndex(1)}
                      disabled={busyKey !== null || loadingIndex}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        style={{ animation: loadingIndex ? "dbSpin 0.8s linear infinite" : "none" }}
                      >
                        <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path
                          d="M12 3v4h-4"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Hero mini stat */}
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
                      <span className="db-hero-stat-label">On page</span>
                      <span className="db-hero-stat-val">{summary.count}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Page total</span>
                      <span className="db-hero-stat-val">{naira(summary.sum)}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">All records</span>
                      <span className="db-hero-stat-val">{total}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* GRID */}
            <div className="db-grid">
              {/* TOOLBAR PANEL */}
              <div className="db-panel">
                <div className="db-panel-head">
                  <div className="db-panel-title-group">
                    <div className="db-panel-icon" style={{ "--pi": "#dbeafe", "--pc": "#1e40af" } as any}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M2 4h12M4 8h8M6 12h4"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="db-panel-title">Search & Filters</p>
                      <p className="db-panel-sub">
                        {activeFiltersCount > 0
                          ? `${activeFiltersCount} filter(s) active`
                          : "No filters applied"}
                      </p>
                    </div>
                  </div>

                  <span className="db-chip">
                    Page <b style={{ marginLeft: 6 }}>{page}</b> / <b>{lastPage}</b>
                  </span>
                </div>

                <div className="db-toolbar">
                  <div className="db-input-group">
                    <input
                      className="db-input"
                      style={{ width: 290 }}
                      placeholder="Search fee name or amount…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      disabled={busyKey !== null}
                    />

                    <select
                      className="db-select"
                      style={{ width: 190 }}
                      value={sectionId}
                      onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : "")}
                      disabled={busyKey !== null}
                    >
                      <option value="">All Sections</option>
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>

                    <select
                      className="db-select"
                      style={{ width: 190 }}
                      value={sessionId}
                      onChange={(e) => setSessionId(e.target.value ? Number(e.target.value) : "")}
                      disabled={busyKey !== null}
                    >
                      <option value="">All Sessions</option>
                      {sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>

                    <select
                      className="db-select"
                      style={{ width: 170 }}
                      value={termId}
                      onChange={(e) => setTermId(e.target.value ? Number(e.target.value) : "")}
                      disabled={busyKey !== null}
                    >
                      <option value="">All Terms</option>
                      {terms.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="db-input-group" style={{ justifyContent: "flex-end" }}>
                    <button
                      className="db-sm-btn"
                      onClick={() => {
                        setSearch("");
                        setSectionId("");
                        setSessionId("");
                        setTermId("");
                      }}
                      disabled={busyKey !== null}
                      title="Clear search & filters"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M4 4l8 8M12 4l-8 8"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>
                      Clear
                    </button>

                    <button className="db-sm-btn" onClick={() => fetchIndex(1)} disabled={busyKey !== null || loadingIndex}>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        style={{ animation: loadingIndex ? "dbSpin 0.8s linear infinite" : "none" }}
                      >
                        <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path
                          d="M12 3v4h-4"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Refresh
                    </button>

                    <button className="db-sm-btn" style={{ background: "rgba(201,168,76,0.16)", borderColor: "rgba(201,168,76,0.22)" }} onClick={openCreate} disabled={busyKey !== null}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      Add Fee Type
                    </button>
                  </div>
                </div>
              </div>

              {/* TABLE PANEL */}
              <div className="db-panel">
                <div className="db-panel-head">
                  <div className="db-panel-title-group">
                    <div className="db-panel-icon" style={{ "--pi": "#fef3c7", "--pc": "#b45309" } as any}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M3 4h10M3 8h10M3 12h10"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="db-panel-title">Fee Types</p>
                      <p className="db-panel-sub">
                        Total records: <b>{total}</b> • Showing page <b>{page}</b>
                      </p>
                    </div>
                  </div>

                  <span className="db-chip" title="Total amount for items currently displayed">
                    Page total <b style={{ marginLeft: 8 }}>{naira(summary.sum)}</b>
                  </span>
                </div>

                {loadingIndex ? (
                  <div className="db-table-empty">
                    <span className="spinner-border spinner-border-sm me-2" />
                    Loading fee types…
                  </div>
                ) : feeTypes.length === 0 ? (
                  <div className="db-table-empty">
                    <div style={{ fontWeight: 700, color: "#7a6a5a" }}>No fee types found</div>
                    <div style={{ marginTop: 6 }}>Try changing filters or click “Add Fee Type”.</div>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="db-table">
                      <thead>
                        <tr>
                          <th style={{ width: 70 }}>#</th>
                          <th>Fee Name</th>
                          <th style={{ width: 170, textAlign: "right" }}>Amount</th>
                          <th style={{ width: 180 }}>Section</th>
                          <th style={{ width: 180 }}>Session</th>
                          <th style={{ width: 140 }}>Term</th>
                          <th style={{ width: 280, textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {feeTypes.map((f, idx) => {
                          const deleting = isBusy(`fee:delete:${f.id}`);
                          return (
                            <tr key={f.id}>
                              <td style={{ color: "#9a8a7a", fontSize: 12.5 }}>{idx + 1}</td>

                              <td>
                                <div style={{ fontWeight: 600, color: "#1a1a2e" }}>{f.name}</div>
                                <div style={{ fontSize: 12, color: "#9a8a7a" }}>ID: {f.id}</div>
                              </td>

                              <td style={{ textAlign: "right", fontWeight: 700, color: "#1a1a2e" }}>
                                {naira(f.amount)}
                              </td>

                              <td>
                                <span className="db-pill">{sectionName(f)}</span>
                              </td>

                              <td>
                                <span className="db-pill" style={{ background: "rgba(124,58,237,0.08)", color: "#7c3aed", borderColor: "rgba(124,58,237,0.12)" }}>
                                  {sessionName(f)}
                                </span>
                              </td>

                              <td>
                                <span className="db-pill db-pill--gold">{termName(f)}</span>
                              </td>

                              <td style={{ textAlign: "right" }}>
                                <div className="db-actions-cell">
                                  <button
                                    className="db-sm-btn"
                                    onClick={() => openEdit(f.id)}
                                    disabled={busyKey !== null}
                                    title="Edit fee type"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                      <path
                                        d="M3 11.5V13h1.5L12.8 4.7 11.3 3.2 3 11.5z"
                                        stroke="currentColor"
                                        strokeWidth="1.4"
                                        strokeLinejoin="round"
                                      />
                                      <path
                                        d="M10.8 3.7l1.5 1.5"
                                        stroke="currentColor"
                                        strokeWidth="1.4"
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                    Edit
                                  </button>

                                  <button
                                    className="db-sm-btn db-sm-btn--danger"
                                    onClick={() => deleteFeeType(f.id)}
                                    disabled={busyKey !== null}
                                    title="Delete fee type"
                                  >
                                    {deleting ? (
                                      <>
                                        <span
                                          className="spinner-border spinner-border-sm"
                                          style={{ width: 14, height: 14 }}
                                        />
                                        Deleting…
                                      </>
                                    ) : (
                                      <>
                                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                          <path
                                            d="M3 4h10M6 4V3h4v1M6 6v7M10 6v7M5 4l.7 10.2c.04.5.45.8.95.8h2.7c.5 0 .91-.3.95-.8L11 4"
                                            stroke="currentColor"
                                            strokeWidth="1.2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </svg>
                                        Delete
                                      </>
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                <div className="db-pagination">
                  <span className="db-page-info">
                    Total: <b>{total}</b> • Page: <b>{page}</b> / <b>{lastPage}</b>
                  </span>

                  <div className="db-page-btns">
                    <button
                      className="db-page-btn"
                      onClick={() => fetchIndex(page - 1)}
                      disabled={!canPrev || busyKey !== null}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M8 2L4 6l4 4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Prev
                    </button>

                    <span className="db-page-current">Page {page}</span>

                    <button
                      className="db-page-btn"
                      onClick={() => fetchIndex(page + 1)}
                      disabled={!canNext || busyKey !== null}
                    >
                      Next
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M4 2l4 4-4 4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <Footer />
            </div>

            {/* =========================
                MODAL: CREATE
            ========================= */}
            {showCreate && (
              <div
                className="db-modal-overlay"
                onClick={() => (busyKey ? null : setShowCreate(false))}
              >
                <div className="db-modal-card" onClick={(e) => e.stopPropagation()}>
                  <div className="db-modal-head">
                    <div>
                      <h5 className="db-modal-title">Add Fee Type</h5>
                      <p className="db-modal-sub">Define a fee under Section • Session • Term.</p>
                    </div>

                    <button
                      className="btn-close"
                      onClick={() => setShowCreate(false)}
                      disabled={busyKey !== null}
                      aria-label="Close"
                    />
                  </div>

                  <div className="db-modal-body">
                    <div className="db-row">
                      <div className="db-col-4">
                        <label className="db-form-label">Section *</label>
                        <select
                          className="db-select"
                          style={{ width: "100%" }}
                          value={cSectionId}
                          onChange={(e) => setCSectionId(e.target.value ? Number(e.target.value) : "")}
                          disabled={busyKey !== null}
                        >
                          <option value="">Select Section</option>
                          {sections.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="db-col-4">
                        <label className="db-form-label">Session *</label>
                        <select
                          className="db-select"
                          style={{ width: "100%" }}
                          value={cSessionId}
                          onChange={(e) => setCSessionId(e.target.value ? Number(e.target.value) : "")}
                          disabled={busyKey !== null}
                        >
                          <option value="">Select Session</option>
                          {sessions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="db-col-4">
                        <label className="db-form-label">Term *</label>
                        <select
                          className="db-select"
                          style={{ width: "100%" }}
                          value={cTermId}
                          onChange={(e) => setCTermId(e.target.value ? Number(e.target.value) : "")}
                          disabled={busyKey !== null}
                        >
                          <option value="">Select Term</option>
                          {terms.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="db-col-8">
                        <label className="db-form-label">Fee Name *</label>
                        <input
                          className="db-input"
                          style={{ width: "100%" }}
                          placeholder="e.g. Tuition Fee"
                          value={cName}
                          onChange={(e) => setCName(e.target.value)}
                          disabled={busyKey !== null}
                        />
                      </div>

                      <div className="db-col-4">
                        <label className="db-form-label">Amount (₦) *</label>
                        <input
                          className="db-input"
                          style={{ width: "100%" }}
                          type="number"
                          min={0}
                          value={cAmount}
                          onChange={(e) => setCAmount(e.target.value)}
                          placeholder="e.g. 25000"
                          disabled={busyKey !== null}
                        />
                      </div>
                    </div>

                    <div className="db-modal-actions">
                      <button
                        className="db-sm-btn"
                        onClick={() => setShowCreate(false)}
                        disabled={busyKey !== null}
                      >
                        Cancel
                      </button>

                      <button
                        className="db-sm-btn"
                        style={{
                          background: "rgba(201,168,76,0.18)",
                          borderColor: "rgba(201,168,76,0.26)",
                          fontWeight: 700,
                        }}
                        onClick={createFeeType}
                        disabled={busyKey !== null}
                      >
                        {isBusy("fee:create") ? (
                          <>
                            <span
                              className="spinner-border spinner-border-sm"
                              style={{ width: 14, height: 14 }}
                            />
                            Saving…
                          </>
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                              <path
                                d="M13.5 4.5l-7 7-3-3"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Save Fee Type
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =========================
                MODAL: EDIT
            ========================= */}
            {showEdit && eId && (
              <div
                className="db-modal-overlay"
                onClick={() => (busyKey ? null : setShowEdit(false))}
              >
                <div className="db-modal-card" onClick={(e) => e.stopPropagation()}>
                  <div className="db-modal-head">
                    <div>
                      <h5 className="db-modal-title">Edit Fee Type</h5>
                      <p className="db-modal-sub">Update the fee type and amount.</p>
                    </div>

                    <button
                      className="btn-close"
                      onClick={() => setShowEdit(false)}
                      disabled={busyKey !== null}
                      aria-label="Close"
                    />
                  </div>

                  <div className="db-modal-body">
                    <div className="db-row">
                      <div className="db-col-4">
                        <label className="db-form-label">Section *</label>
                        <select
                          className="db-select"
                          style={{ width: "100%" }}
                          value={eSectionId}
                          onChange={(e) => setESectionId(e.target.value ? Number(e.target.value) : "")}
                          disabled={busyKey !== null}
                        >
                          <option value="">Select Section</option>
                          {sections.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="db-col-4">
                        <label className="db-form-label">Session *</label>
                        <select
                          className="db-select"
                          style={{ width: "100%" }}
                          value={eSessionId}
                          onChange={(e) => setESessionId(e.target.value ? Number(e.target.value) : "")}
                          disabled={busyKey !== null}
                        >
                          <option value="">Select Session</option>
                          {sessions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="db-col-4">
                        <label className="db-form-label">Term *</label>
                        <select
                          className="db-select"
                          style={{ width: "100%" }}
                          value={eTermId}
                          onChange={(e) => setETermId(e.target.value ? Number(e.target.value) : "")}
                          disabled={busyKey !== null}
                        >
                          <option value="">Select Term</option>
                          {terms.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="db-col-8">
                        <label className="db-form-label">Fee Name *</label>
                        <input
                          className="db-input"
                          style={{ width: "100%" }}
                          value={eName}
                          onChange={(e) => setEName(e.target.value)}
                          disabled={busyKey !== null}
                        />
                      </div>

                      <div className="db-col-4">
                        <label className="db-form-label">Amount (₦) *</label>
                        <input
                          className="db-input"
                          style={{ width: "100%" }}
                          type="number"
                          min={0}
                          value={eAmount}
                          onChange={(e) => setEAmount(e.target.value)}
                          disabled={busyKey !== null}
                        />
                      </div>
                    </div>

                    <div className="db-modal-actions">
                      <button className="db-sm-btn" onClick={() => setShowEdit(false)} disabled={busyKey !== null}>
                        Cancel
                      </button>

                      <button
                        className="db-sm-btn"
                        style={{
                          background: "rgba(201,168,76,0.18)",
                          borderColor: "rgba(201,168,76,0.26)",
                          fontWeight: 700,
                        }}
                        onClick={updateFeeType}
                        disabled={busyKey !== null}
                      >
                        {isBusy(`fee:update:${eId}`) ? (
                          <>
                            <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} />
                            Saving…
                          </>
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                              <path
                                d="M13.5 4.5l-7 7-3-3"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Update Fee Type
                          </>
                        )}
                      </button>
                    </div>
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

/**
 * Backend matched:
 * - GET    /fee-types (supports search, section_id, session_id, term_id, pagination)
 * - POST   /fee-types
 * - GET    /fee-types/{id}
 * - PUT    /fee-types/{id}
 * - DELETE /fee-types/{id}
 *
 * This page uses the index response which also returns:
 * - sections, sessions, terms
 */