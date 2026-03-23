// src/pages/Fees/FeeMethodsPage.tsx
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
type StudentSearchItem = {
  id: number;
  firstname: string;
  surname: string;
  reg_no: string;
  section_id?: number | null;
  level_id?: number | null;
};

type StudentFeeDetails = {
  student: {
    id: number;
    name: string;
    reg_no: string;
    section: string;
    class: string;
  };
  fees: Array<{
    id: number;
    fee_type_id: number;
    section_id: number;
    term_id: number;
    session_id: number;
    total_amount: number;
    amount_paid: number;
    balance: number;
    fee_type?: { id: number; name: string; amount: number };
    session?: { id: number; name: string };
    term?: { id: number; name: string };
  }>;
};

type Option = { id: number; name: string };
type FeeType = { id: number; name: string; amount: number };

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
  return v.toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
}

/* =========================
   PAGE
========================= */
export default function FeeMethodsPage() {
  const { showSuccess, showError, showWarning } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // page loading
  const [loadingPage, setLoadingPage] = useState(true);

  // dropdowns
  const [sections, setSections] = useState<Option[]>([]);
  const [sessions, setSessions] = useState<Option[]>([]);
  const [terms, setTerms] = useState<Option[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // student lookup
  const [regNo, setRegNo] = useState("");
  const [searchingStudent, setSearchingStudent] = useState(false);
  const [studentPick, setStudentPick] = useState<StudentSearchItem | null>(null);

  // fee context
  const [sectionId, setSectionId] = useState<number | "">("");
  const [sessionId, setSessionId] = useState<number | "">("");
  const [termId, setTermId] = useState<number | "">("");

  // fee types to assign
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [loadingFeeTypes, setLoadingFeeTypes] = useState(false);
  const [selectedFeeTypeIds, setSelectedFeeTypeIds] = useState<Record<number, boolean>>({});

  // assigned fees + student details
  const [details, setDetails] = useState<StudentFeeDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // busy key
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const isBusy = (k: string) => busyKey === k;

  useEffect(() => {
    const t = window.setTimeout(() => setLoadingPage(false), 120);
    return () => window.clearTimeout(t);
  }, []);

  /* =========================
     FETCH META
========================= */
  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        setLoadingMeta(true);

        const [secRes, sesRes, termRes] = await Promise.all([
          authApi.get("/sections"),
          authApi.get("/facademic-sessions"),
          authApi.get("/fterms"),
        ]);

        if (!mounted) return;

        const rawSec = secRes.data?.data ?? secRes.data ?? [];
        const secArr: Option[] = Array.isArray(rawSec) ? rawSec.map((s: any) => ({ id: s.id, name: s.name })) : [];
        setSections(secArr);

        const rawSes = sesRes.data?.data ?? sesRes.data ?? [];
        const sesArr: Option[] = (Array.isArray(rawSes) ? rawSes : []).map((s: any) => ({
          id: s.id,
          name: s.name ?? s.session ?? s.title ?? "",
        }));
        setSessions(sesArr);

        const rawTerms = termRes.data?.data ?? termRes.data ?? [];
        const termArr: Option[] = (Array.isArray(rawTerms) ? rawTerms : []).map((t: any) => ({
          id: t.id,
          name: t.name ?? t.term ?? "",
        }));
        setTerms(termArr);
      } catch (e: any) {
        console.error(e);
        showError(getErrorMessage(e) || "Failed to load fee setup data.");
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

  /* =========================
     STUDENT SEARCH
========================= */
  async function searchStudentByReg() {
    const q = regNo.trim();
    if (!q) return showWarning("Enter a registration number.");

    try {
      setSearchingStudent(true);

      // If your backend uses q or reg_no, change `query` below.
      const res = await authApi.get("/students/search", { params: { query: q } });

      const list = res.data?.data ?? res.data ?? [];
      const arr: StudentSearchItem[] = Array.isArray(list) ? list : [];

      const exact = arr.find((s) => (s.reg_no ?? "").toLowerCase() === q.toLowerCase());
      const pick = exact ?? arr[0];

      if (!pick) {
        setStudentPick(null);
        setDetails(null);
        return showError("No student found with that registration number.");
      }

      setStudentPick(pick);

      if (pick.section_id) setSectionId(pick.section_id);

      showSuccess(`Student found: ${pick.firstname} ${pick.surname} (${pick.reg_no})`);
    } catch (e: any) {
      console.error(e);
      showError(getErrorMessage(e) || "Failed to find student.");
    } finally {
      setSearchingStudent(false);
    }
  }

  /* =========================
     FETCH FEE TYPES
========================= */
  async function fetchFeeTypes() {
    if (!studentPick?.id) return showError("Search and select a student first.");
    if (!sectionId || !sessionId || !termId) return showError("Select Section, Session and Term.");

    try {
      setLoadingFeeTypes(true);
      setSelectedFeeTypeIds({});

      const res = await authApi.post("/fees/fetch-types", {
        student_id: studentPick.id,
        section_id: Number(sectionId),
        session_id: Number(sessionId),
        term_id: Number(termId),
      });

      const ft: FeeType[] = Array.isArray(res.data?.fee_types) ? res.data.fee_types : [];
      setFeeTypes(ft);

      if (!ft.length) showWarning(res.data?.message ?? "No fee types found for this selection.");
      else showSuccess(res.data?.message ?? "Fee types loaded.");
    } catch (e: any) {
      console.error(e);
      showError(getErrorMessage(e));
      setFeeTypes([]);
    } finally {
      setLoadingFeeTypes(false);
    }
  }

  /* =========================
     ASSIGN FEES
========================= */
  const selectedFeeIds = useMemo(
    () => Object.entries(selectedFeeTypeIds).filter(([_, v]) => v).map(([k]) => Number(k)),
    [selectedFeeTypeIds]
  );

  const totalSelectedAmount = useMemo(() => {
    if (!feeTypes.length) return 0;
    const map = new Map<number, FeeType>(feeTypes.map((f) => [f.id, f]));
    return selectedFeeIds.reduce((sum, id) => sum + (map.get(id)?.amount ?? 0), 0);
  }, [selectedFeeIds, feeTypes]);

  function toggleFee(id: number) {
    setSelectedFeeTypeIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function selectAllFees() {
    const next: Record<number, boolean> = {};
    feeTypes.forEach((f) => (next[f.id] = true));
    setSelectedFeeTypeIds(next);
  }

  function clearFeeSelection() {
    setSelectedFeeTypeIds({});
  }

  async function assignFees() {
    if (!studentPick?.id) return showError("Search and select a student first.");
    if (!sectionId || !sessionId || !termId) return showError("Select Section, Session and Term.");
    if (selectedFeeIds.length === 0) return showError("Select at least one fee type to assign.");

    try {
      setBusyKey("fees:assign");
      const res = await authApi.post("/fees/assign", {
        student_id: studentPick.id,
        section_id: Number(sectionId),
        session_id: Number(sessionId),
        term_id: Number(termId),
        fee_type_ids: selectedFeeIds,
      });

      showSuccess(res.data?.message ?? "Fee(s) assigned successfully.");
      await loadStudentFeeDetails();
      clearFeeSelection();
    } catch (e: any) {
      console.error(e);
      showError(getErrorMessage(e));
    } finally {
      setBusyKey(null);
    }
  }

  /* =========================
     STUDENT FEE DETAILS
========================= */
  async function loadStudentFeeDetails() {
    const q = regNo.trim();
    if (!q) return showWarning("Enter a registration number first.");

    try {
      setLoadingDetails(true);
      const res = await authApi.get<StudentFeeDetails>("/fees/student/details", {
        params: {
          reg_no: q,
          session_id: sessionId || undefined,
          term_id: termId || undefined,
        },
      });

      setDetails(res.data);
    } catch (e: any) {
      console.error(e);
      showError(getErrorMessage(e));
      setDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  }

  /* =========================
     REMOVE ASSIGNED FEE
========================= */
  async function removeAssignedFee(studentFeeId: number) {
    const ok = window.confirm("Remove this fee assignment? (You cannot remove paid fees)");
    if (!ok) return;

    try {
      setBusyKey(`fees:remove:${studentFeeId}`);
      const res = await authApi.delete(`/student-fees/${studentFeeId}`);
      showSuccess(res.data?.message ?? "Fee assignment removed.");
      await loadStudentFeeDetails();
    } catch (e: any) {
      console.error(e);
      showError(getErrorMessage(e));
    } finally {
      setBusyKey(null);
    }
  }

  /* =========================
     DERIVED
========================= */
  const canFetchFeeTypes = !!studentPick?.id && !!sectionId && !!sessionId && !!termId;

  const ledgerTotals = useMemo(() => {
    const fees = details?.fees ?? [];
    const totalAmount = fees.reduce((a, f) => a + Number(f.total_amount ?? 0), 0);
    const totalPaid = fees.reduce((a, f) => a + Number(f.amount_paid ?? 0), 0);
    const totalBal = fees.reduce((a, f) => a + Number(f.balance ?? 0), 0);
    return { totalAmount, totalPaid, totalBal, count: fees.length };
  }, [details]);

  /* =========================
     RENDER
========================= */
  return (
    <>
      {/* Same template CSS from AdminDashboard / FeeStructurePage */}
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
          max-width: 560px;
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
          min-width: 300px;
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

        .db-skeleton {
          height: 14px;
          border-radius: 7px;
          background: linear-gradient(90deg, #f0ebe3 25%, #e8e0d5 50%, #f0ebe3 75%);
          background-size: 200% 100%;
          animation: dbSkeleton 1.4s ease infinite;
        }
        @keyframes dbSkeleton {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }

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
          white-space: nowrap;
        }
        .db-pill--gold {
          background: rgba(180, 83, 9, 0.08);
          color: #b45309;
          border-color: rgba(180, 83, 9, 0.14);
        }
        .db-pill--violet {
          background: rgba(124, 58, 237, 0.08);
          color: #7c3aed;
          border-color: rgba(124, 58, 237, 0.12);
        }
        .db-score-pill {
          display: inline-flex;
          align-items: center;
          font-size: 12.5px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 999px;
          float: right;
        }

        .db-refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 400;
          color: #7a6a5a;
          background: #f5f1eb;
          border: 1px solid #e5ddd3;
          border-radius: var(--bs-border-radius, 9px);
          cursor: pointer;
          transition: background 0.2s;
          white-space: nowrap;
        }
        .db-refresh-btn:hover { background: #ede8e0; }
        .db-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .db-page-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
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

        .db-grid2 {
          display: grid;
          grid-template-columns: 1fr 420px;
          gap: 18px;
          margin-bottom: 22px;
        }
        @media (max-width: 991.98px) {
          .db-grid2 { grid-template-columns: 1fr; }
          .db-main { padding: 18px 14px 0; }
          .db-hero { padding: 24px 20px; }
          .db-hero-stat-card { min-width: 0; width: 100%; }
        }

        @keyframes dbSpin { to { transform: rotate(360deg); } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Fee Method" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loadingPage && <Loader message="Loading fee tools..." />}

            {/* HERO */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Fees • Assignment & Ledger
                  </div>

                  <h1 className="db-greeting">
                    {getGreeting()}, <em>Admin.</em>
                  </h1>

                  <p className="db-hero-sub">
                    Search a student by <b>Reg No</b>, choose <b>Section</b>, <b>Session</b>, <b>Term</b>, load fee types,
                    then assign multiple fees in one action. You can also review the student fee ledger.
                  </p>

                  <div className="db-hero-btns">
                    <button
                      className="db-btn-gold"
                      onClick={searchStudentByReg}
                      disabled={searchingStudent || !regNo.trim()}
                      title={!regNo.trim() ? "Enter Reg No" : ""}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M11 11l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      {searchingStudent ? "Searching…" : "Find Student"}
                    </button>

                    <button
                      className="db-btn-outline"
                      onClick={loadStudentFeeDetails}
                      disabled={loadingDetails || !regNo.trim()}
                      title={!regNo.trim() ? "Enter Reg No first" : ""}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M4 2h8v12H4z"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinejoin="round"
                        />
                        <path d="M6 5h4M6 8h4M6 11h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                      {loadingDetails ? "Loading…" : "Load Ledger"}
                    </button>
                  </div>
                </div>

                {/* Quick glance */}
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
                      <span className="db-hero-stat-label">Fee types loaded</span>
                      <span className="db-hero-stat-val">{feeTypes.length}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Selected fees</span>
                      <span className="db-hero-stat-val">{selectedFeeIds.length}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Selected total</span>
                      <span className="db-hero-stat-val">{naira(totalSelectedAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Meta loading */}
            {loadingMeta ? (
              <div className="db-panel">
                <div className="db-panel-head">
                  <div className="db-panel-title-group">
                    <div className="db-panel-icon" style={{ "--pi": "#dbeafe", "--pc": "#1e40af" } as any}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        <path
                          d="M8 2v12"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          style={{ opacity: 0.35 }}
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="db-panel-title">Loading setup</p>
                      <p className="db-panel-sub">Fetching sections, sessions and terms…</p>
                    </div>
                  </div>

                  <button className="db-refresh-btn" disabled>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 14 14"
                      fill="none"
                      style={{ animation: "dbSpin 0.8s linear infinite" }}
                    >
                      <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    Loading…
                  </button>
                </div>

                <div style={{ padding: 18 }}>
                  <div className="db-skeleton" style={{ width: "45%", marginBottom: 10 }} />
                  <div className="db-skeleton" style={{ width: "80%", marginBottom: 10 }} />
                  <div className="db-skeleton" style={{ width: "65%" }} />
                </div>
              </div>
            ) : (
              <div className="db-grid2">
                {/* LEFT: Search + Context + FeeTypes */}
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {/* Student search + context */}
                  <div className="db-panel">
                    <div className="db-panel-head">
                      <div className="db-panel-title-group">
                        <div className="db-panel-icon" style={{ "--pi": "#d1fae5", "--pc": "#065f46" } as any}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.4" />
                            <path
                              d="M2 14c0-3 2.5-5 5-5"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                            />
                            <path
                              d="M10.5 9.5h3M12 8v3"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="db-panel-title">Student & Context</p>
                          <p className="db-panel-sub">Find student → pick Section/Session/Term → load fee types</p>
                        </div>
                      </div>

                      <button
                        className="db-refresh-btn"
                        onClick={fetchFeeTypes}
                        disabled={!canFetchFeeTypes || loadingFeeTypes || busyKey !== null}
                        title={!canFetchFeeTypes ? "Select student + section + session + term" : ""}
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 14 14"
                          fill="none"
                          style={{ animation: loadingFeeTypes ? "dbSpin 0.8s linear infinite" : "none" }}
                        >
                          <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                        {loadingFeeTypes ? "Loading…" : "Load Fee Types"}
                      </button>
                    </div>

                    <div style={{ padding: 18 }}>
                      <div className="row g-3">
                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold small mb-1">Registration Number</label>
                          <div className="input-group">
                            <span className="input-group-text bg-white">
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M11 11l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                            </span>
                            <input
                              className="form-control"
                              placeholder="Enter Reg No…"
                              value={regNo}
                              onChange={(e) => setRegNo(e.target.value)}
                              disabled={busyKey !== null}
                            />
                            <button
                              className="btn btn-outline-secondary"
                              onClick={searchStudentByReg}
                              disabled={searchingStudent || !regNo.trim() || busyKey !== null}
                            >
                              {searchingStudent ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" />
                                  Searching…
                                </>
                              ) : (
                                "Find"
                              )}
                            </button>
                          </div>

                          <div style={{ marginTop: 10 }}>
                            {studentPick ? (
                              <div className="db-pill" style={{ background: "rgba(201,168,76,0.12)", color: "#b45309", borderColor: "rgba(201,168,76,0.24)" }}>
                                Selected: {studentPick.firstname} {studentPick.surname} • {studentPick.reg_no}
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: "#9a8a7a" }}>No student selected yet.</span>
                            )}
                          </div>
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold small mb-1">Ledger</label>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button
                              className="btn btn-outline-primary"
                              onClick={loadStudentFeeDetails}
                              disabled={loadingDetails || !regNo.trim() || busyKey !== null}
                              style={{ borderRadius: 10 }}
                            >
                              {loadingDetails ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" />
                                  Loading…
                                </>
                              ) : (
                                "Load Ledger"
                              )}
                            </button>

                            <button
                              className="btn btn-outline-secondary"
                              onClick={() => {
                                setDetails(null);
                                setFeeTypes([]);
                                setSelectedFeeTypeIds({});
                                setStudentPick(null);
                              }}
                              disabled={busyKey !== null}
                              style={{ borderRadius: 10 }}
                              title="Clear current selection"
                            >
                              Clear
                            </button>
                          </div>

                          <div style={{ marginTop: 10, fontSize: 12, color: "#9a8a7a" }}>
                            Tip: pick Session/Term to view ledger for that period.
                          </div>
                        </div>
                      </div>

                      <hr style={{ opacity: 0.08 }} />

                      <div className="row g-3">
                        <div className="col-12 col-md-4">
                          <label className="form-label fw-semibold small mb-1">Section</label>
                          <select
                            className="form-select"
                            value={sectionId}
                            onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : "")}
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

                        <div className="col-12 col-md-4">
                          <label className="form-label fw-semibold small mb-1">Session</label>
                          <select
                            className="form-select"
                            value={sessionId}
                            onChange={(e) => setSessionId(e.target.value ? Number(e.target.value) : "")}
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

                        <div className="col-12 col-md-4">
                          <label className="form-label fw-semibold small mb-1">Term</label>
                          <select
                            className="form-select"
                            value={termId}
                            onChange={(e) => setTermId(e.target.value ? Number(e.target.value) : "")}
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
                      </div>
                    </div>
                  </div>

                  {/* Fee types list + assign */}
                  <div className="db-panel">
                    <div className="db-panel-head">
                      <div className="db-panel-title-group">
                        <div className="db-panel-icon" style={{ "--pi": "#fef3c7", "--pc": "#b45309" } as any}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3 4h10M3 8h10M3 12h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                          </svg>
                        </div>
                        <div>
                          <p className="db-panel-title">Available Fee Types</p>
                          <p className="db-panel-sub">
                            Loaded: <b>{feeTypes.length}</b> • Selected: <b>{selectedFeeIds.length}</b>
                          </p>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="db-refresh-btn" onClick={selectAllFees} disabled={!feeTypes.length || busyKey !== null}>
                          Select all
                        </button>
                        <button className="db-refresh-btn" onClick={clearFeeSelection} disabled={!selectedFeeIds.length || busyKey !== null}>
                          Clear
                        </button>
                        <button
                          className="db-refresh-btn"
                          onClick={assignFees}
                          disabled={!selectedFeeIds.length || !studentPick || busyKey !== null}
                          style={{ background: "rgba(201,168,76,0.16)", borderColor: "rgba(201,168,76,0.26)", color: "#1a1a2e" }}
                          title={!studentPick ? "Select student first" : ""}
                        >
                          {isBusy("fees:assign") ? (
                            <>
                              <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} />
                              Assigning…
                            </>
                          ) : (
                            <>
                              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                                <path
                                  d="M13.5 4.5l-7 7-3-3"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              Assign ({selectedFeeIds.length})
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div style={{ padding: 0 }}>
                      {loadingFeeTypes ? (
                        <div style={{ padding: 18 }}>
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} style={{ display: "flex", gap: 10, padding: "12px 16px", alignItems: "center" }}>
                              <div className="db-skeleton" style={{ width: 16, height: 16, borderRadius: 4 }} />
                              <div className="db-skeleton" style={{ width: "55%" }} />
                              <div className="db-skeleton" style={{ width: 80, marginLeft: "auto" }} />
                            </div>
                          ))}
                        </div>
                      ) : feeTypes.length === 0 ? (
                        <div style={{ padding: 18, color: "#9a8a7a" }}>
                          No fee types loaded yet. Select context and click <b>Load Fee Types</b>.
                        </div>
                      ) : (
                        <div style={{ overflowX: "auto" }}>
                          <table className="db-table">
                            <thead>
                              <tr>
                                <th style={{ width: 70 }}>
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={feeTypes.length > 0 && feeTypes.every((f) => !!selectedFeeTypeIds[f.id])}
                                    onChange={(e) => (e.target.checked ? selectAllFees() : clearFeeSelection())}
                                  />
                                </th>
                                <th>Fee Type</th>
                                <th style={{ textAlign: "right", width: 200 }}>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {feeTypes.map((f) => (
                                <tr key={f.id}>
                                  <td>
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
                                      checked={!!selectedFeeTypeIds[f.id]}
                                      onChange={() => toggleFee(f.id)}
                                    />
                                  </td>
                                  <td>
                                    <div style={{ fontWeight: 600, color: "#1a1a2e" }}>{f.name}</div>
                                    <div style={{ fontSize: 12, color: "#9a8a7a" }}>ID: {f.id}</div>
                                  </td>
                                  <td style={{ textAlign: "right", fontWeight: 700, color: "#1a1a2e" }}>
                                    {naira(f.amount)}
                                  </td>
                                </tr>
                              ))}
                              <tr>
                                <td colSpan={3} style={{ textAlign: "right", padding: "14px 16px" }}>
                                  <span className="db-pill db-pill--gold" style={{ float: "right" }}>
                                    Selected total: {naira(totalSelectedAmount)}
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT: Ledger panel */}
                <div className="db-panel" style={{ height: "fit-content", position: "sticky", top: 16 }}>
                  <div className="db-panel-head">
                    <div className="db-panel-title-group">
                      <div className="db-panel-icon" style={{ "--pi": "#ede9fe", "--pc": "#7c3aed" } as any}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M4 2h8v12H4z"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinejoin="round"
                          />
                          <path d="M6 5h4M6 8h4M6 11h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div>
                        <p className="db-panel-title">Student Fee Ledger</p>
                        <p className="db-panel-sub">Assigned fees • Payments • Balance</p>
                      </div>
                    </div>

                    <button
                      className="db-refresh-btn"
                      onClick={loadStudentFeeDetails}
                      disabled={loadingDetails || !regNo.trim() || busyKey !== null}
                      title={!regNo.trim() ? "Enter Reg No first" : ""}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 14 14"
                        fill="none"
                        style={{ animation: loadingDetails ? "dbSpin 0.8s linear infinite" : "none" }}
                      >
                        <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                      {loadingDetails ? "Loading…" : "Refresh"}
                    </button>
                  </div>

                  {loadingDetails ? (
                    <div style={{ padding: 18 }}>
                      <div className="db-skeleton" style={{ width: "55%", marginBottom: 10 }} />
                      <div className="db-skeleton" style={{ width: "80%", marginBottom: 18 }} />
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="db-skeleton" style={{ width: "100%", marginBottom: 10 }} />
                      ))}
                    </div>
                  ) : !details ? (
                    <div style={{ padding: 18, color: "#9a8a7a" }}>
                      Enter Reg No and click <b>Load Ledger</b> to view assigned fees.
                    </div>
                  ) : (
                    <>
                      <div style={{ padding: "14px 18px 0" }}>
                        <div style={{ fontWeight: 700, color: "#1a1a2e" }}>{details.student.name}</div>
                        <div style={{ fontSize: 12.5, color: "#9a8a7a", marginTop: 3 }}>
                          {details.student.reg_no} • <span className="db-pill">{details.student.section}</span>{" "}
                          <span className="db-pill db-pill--violet" style={{ marginLeft: 8 }}>
                            {details.student.class}
                          </span>
                        </div>

                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                          <span className="db-pill db-pill--gold">Total: {naira(ledgerTotals.totalAmount)}</span>
                          <span className="db-pill" style={{ background: "rgba(6,95,70,0.08)", color: "#065f46", borderColor: "rgba(6,95,70,0.12)" }}>
                            Paid: {naira(ledgerTotals.totalPaid)}
                          </span>
                          <span className="db-pill" style={{ background: "rgba(220,38,38,0.08)", color: "#b91c1c", borderColor: "rgba(220,38,38,0.14)" }}>
                            Balance: {naira(ledgerTotals.totalBal)}
                          </span>
                        </div>
                      </div>

                      <div style={{ overflowX: "auto", marginTop: 12 }}>
                        <table className="db-table">
                          <thead>
                            <tr>
                              <th>Fee</th>
                              <th style={{ textAlign: "right", width: 110 }}>Total</th>
                              <th style={{ textAlign: "right", width: 110 }}>Paid</th>
                              <th style={{ textAlign: "right", width: 110 }}>Bal</th>
                              <th style={{ textAlign: "right", width: 90 }}>Action</th>
                            </tr>
                          </thead>

                          <tbody>
                            {details.fees?.length ? (
                              details.fees.map((f) => {
                                const removing = isBusy(`fees:remove:${f.id}`);
                                return (
                                  <tr key={f.id}>
                                    <td>
                                      <div style={{ fontWeight: 600, color: "#1a1a2e" }}>
                                        {f.fee_type?.name ?? `FeeType #${f.fee_type_id}`}
                                      </div>
                                      <div style={{ fontSize: 12, color: "#9a8a7a" }}>
                                        {f.session?.name ?? `Session #${f.session_id}`} • {f.term?.name ?? `Term #${f.term_id}`}
                                      </div>
                                    </td>
                                    <td style={{ textAlign: "right" }}>{naira(f.total_amount)}</td>
                                    <td style={{ textAlign: "right" }}>{naira(f.amount_paid)}</td>
                                    <td style={{ textAlign: "right", fontWeight: 700 }}>{naira(f.balance)}</td>
                                    <td style={{ textAlign: "right" }}>
                                      <button
                                        className="db-page-btn"
                                        onClick={() => removeAssignedFee(f.id)}
                                        disabled={busyKey !== null}
                                        title="Remove assignment (only if unpaid)"
                                        style={{
                                          padding: "6px 10px",
                                          background: "rgba(220,38,38,0.08)",
                                          borderColor: "rgba(220,38,38,0.18)",
                                          color: "#b91c1c",
                                        }}
                                      >
                                        {removing ? (
                                          <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} />
                                        ) : (
                                          "Remove"
                                        )}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={5} style={{ padding: 18, textAlign: "center", color: "#b5a090" }}>
                                  No fees found for this student (and filters).
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div style={{ padding: "12px 18px 18px", color: "#9a8a7a", fontSize: 12.5 }}>
                        Tip: Changing <b>Session/Term</b> affects ledger view and assignment context.
                      </div>
                    </>
                  )}
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

/**
 * NOTES:
 * 1) Student search params:
 *    - I used: GET /students/search?query=REGNO
 *    If your backend uses ?q or ?reg_no, change it in searchStudentByReg().
 *
 * 2) Meta endpoints:
 *    - /sections
 *    - /facademic-sessions
 *    - /fterms
 *
 * 3) Assign fees:
 *    - POST /fees/assign requires: student_id, section_id, session_id, term_id, fee_type_ids[]
 *
 * 4) Ledger:
 *    - GET /fees/student/details?reg_no=...&session_id=...&term_id=...
 */