// src/pages/Admin/StudentResult/ResultsHubPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import PageTitle from "../../../components/PageTitle";
import Loader from "../../../components/ui/dashboardLoader";

type StudentClass = {
  id: number;
  name: string;
  section?: { id: number; name: string } | null;
  department?: { id: number; name: string } | null;
};

type TermOption = { id: number; name: string };
type SessionOption = { id: number; name: string };

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
  review?: {
    total_students: number;
    completed_students: number;
    missing_students_count: number;
    can_approve: boolean;
    can_publish: boolean;
    is_complete: boolean;
  };
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function ResultsHubPage() {
  const navigate = useNavigate();
  const { showError, showInfo } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Filters & Dropdowns
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Student Quick Search
  const [studentSearchText, setStudentSearchText] = useState("");

  // Batches
  const [batches, setBatches] = useState<ReviewBatch[]>([]);

  // Quick action class dropdowns
  const [quickScoreClassId, setQuickScoreClassId] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      try {
        const [currentRes, termRes, sessionRes, classRes] = await Promise.allSettled([
          authApi.get("/current-session-term"),
          authApi.get("/fterms"),
          authApi.get("/facademic-sessions"),
          authApi.get("/fstudent-classes"),
        ]);

        if (!mounted) return;

        let curTerm = "";
        let curSession = "";

        if (currentRes.status === "fulfilled") {
          curTerm = currentRes.value.data?.term || "";
          curSession = currentRes.value.data?.session || "";
          setSelectedTerm(curTerm);
          setSelectedSession(curSession);
        }

        if (termRes.status === "fulfilled") {
          const tList = termRes.value.data?.data ?? termRes.value.data ?? [];
          setTerms(tList);
          if (!curTerm && tList.length > 0) {
            curTerm = tList[0].name;
            setSelectedTerm(curTerm);
          }
        }

        if (sessionRes.status === "fulfilled") {
          const rawSess = sessionRes.value.data?.data ?? sessionRes.value.data ?? [];
          const sList = rawSess.map((item: any) => ({
            id: item.id,
            name: item.name ?? item.session ?? "",
          }));
          setSessions(sList);
          if (!curSession && sList.length > 0) {
            curSession = sList[0].name;
            setSelectedSession(curSession);
          }
        }

        if (classRes.status === "fulfilled") {
          const payload = classRes.value.data;
          const clsList = Array.isArray(payload) ? payload : payload?.classes ?? [];
          setClasses(clsList);
        }

        if (curTerm && curSession) {
          await loadBatches(curTerm, curSession);
        }
      } catch (err: any) {
        showError("Failed to initialize Results Hub");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBatches(t = selectedTerm, s = selectedSession) {
    if (!t || !s) return;
    setLoadingBatches(true);
    try {
      const { data } = await authApi.get("/admin/result-batches", {
        params: { term: t, session: s },
      });
      const list: ReviewBatch[] = Array.isArray(data?.data) ? data.data : [];
      setBatches(list);
    } catch {
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  }

  // Handle Term/Session change
  const handleTermChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedTerm(val);
    loadBatches(val, selectedSession);
  };

  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedSession(val);
    loadBatches(selectedTerm, val);
  };

  // Quick student lookup jump
  const handleQuickStudentSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = studentSearchText.trim();
    if (!q) {
      showInfo("Please enter a student name or registration number.");
      return;
    }
    navigate(`/results/student-editor?search=${encodeURIComponent(q)}&term=${encodeURIComponent(selectedTerm)}&session=${encodeURIComponent(selectedSession)}`);
  };

  // Quick score entry jump
  const handleQuickScoreJump = () => {
    if (!quickScoreClassId) {
      navigate("/students/results/add");
      return;
    }
    navigate(`/students/results/add?class_id=${quickScoreClassId}&term=${encodeURIComponent(selectedTerm)}&session=${encodeURIComponent(selectedSession)}`);
  };

  // Stats Calculations
  const totalClasses = classes.length;
  const batchesCount = batches.length;
  const approvedBatchesCount = batches.filter((b) => b.status === "approved" || b.status === "published").length;
  const publishedBatchesCount = batches.filter((b) => b.status === "published").length;

  // Filtered Class Rows
  const filteredClasses = useMemo(() => {
    let list = classes;
    if (classFilter !== "all") {
      const id = Number(classFilter);
      list = list.filter((c) => c.id === id);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [classes, classFilter, searchQuery]);

  if (loading) {
    return (
      <>
        <PageTitle title="Results Command Center | SchoolProfit" />
        <Loader />
      </>
    );
  }

  return (
    <>
      <style>{`
        /* ======= Results Hub Styles ======= */
        .gq-rh-page {
          background-color: #F8FAFC;
          min-height: 100vh;
        }
        .gq-rh-main {
          padding: 24px 28px;
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .gq-rh-main { padding: 16px 14px; }
        }

        /* Hero Banner */
        .gq-rh-hero {
          background: linear-gradient(135deg, #0F172A 0%, #1E293B 55%, #0B192C 100%);
          border-radius: 20px;
          padding: 32px 36px;
          color: #fff;
          margin-bottom: 24px;
          box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.18);
          position: relative;
          overflow: hidden;
        }
        .gq-rh-hero-eyebrow {
          font-size: 11.5px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #38BDF8;
          font-weight: 800;
          margin-bottom: 6px;
        }
        .gq-rh-hero-title {
          font-size: 26px;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0 0 8px 0;
          letter-spacing: -0.02em;
        }
        .gq-rh-hero-sub {
          font-size: 13.5px;
          color: #CBD5E1;
          line-height: 1.6;
          max-width: 680px;
          margin: 0;
        }

        /* Context Filter Bar in Hero */
        .gq-rh-context-bar {
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .gq-rh-term-selects {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }
        .gq-rh-select {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 10px;
          color: #FFFFFF;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 700;
          outline: none;
          cursor: pointer;
        }
        .gq-rh-select option {
          background: #1E293B;
          color: #FFFFFF;
        }

        .gq-rh-stats {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .gq-rh-stat-chip {
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 12px;
          padding: 8px 16px;
          text-align: center;
          min-width: 85px;
        }
        .gq-rh-stat-num {
          font-size: 18px;
          font-weight: 800;
          color: #F8FAFC;
          display: block;
        }
        .gq-rh-stat-lbl {
          font-size: 10.5px;
          color: #94A3B8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
        }

        /* 4-Step Lifecycle Workflow Grid */
        .gq-rh-workflow-section {
          margin-bottom: 28px;
        }
        .gq-rh-section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .gq-rh-section-title {
          font-size: 18px;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .gq-rh-section-sub {
          font-size: 13px;
          color: #64748B;
          margin: 2px 0 0 0;
        }

        .gq-rh-workflow-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }

        .gq-rh-step-card {
          background: #FFFFFF;
          border-radius: 18px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
          padding: 22px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .gq-rh-step-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
          border-color: #CBD5E1;
        }

        .gq-rh-step-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 4px 10px;
          border-radius: 99px;
          margin-bottom: 14px;
          width: fit-content;
        }
        .gq-rh-step-1 { background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; }
        .gq-rh-step-2 { background: #F5F3FF; color: #6D28D9; border: 1px solid #DDD6FE; }
        .gq-rh-step-3 { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
        .gq-rh-step-4 { background: #FFFBEB; color: #B45309; border: 1px solid #FDE68A; }

        .gq-rh-step-heading {
          font-size: 16px;
          font-weight: 800;
          color: #0F172A;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .gq-rh-step-desc {
          font-size: 12.5px;
          color: #64748B;
          line-height: 1.5;
          margin: 0 0 18px 0;
          flex: 1;
        }

        .gq-rh-btn-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          border: none;
          transition: all 0.15s ease;
        }
        .gq-rh-btn-blue {
          background: #2563EB;
          color: #FFFFFF;
        }
        .gq-rh-btn-blue:hover {
          background: #1D4ED8;
          color: #FFFFFF;
        }
        .gq-rh-btn-purple {
          background: #7C3AED;
          color: #FFFFFF;
        }
        .gq-rh-btn-purple:hover {
          background: #6D28D9;
          color: #FFFFFF;
        }
        .gq-rh-btn-green {
          background: #10B981;
          color: #FFFFFF;
        }
        .gq-rh-btn-green:hover {
          background: #059669;
          color: #FFFFFF;
        }
        .gq-rh-btn-amber {
          background: #D97706;
          color: #FFFFFF;
        }
        .gq-rh-btn-amber:hover {
          background: #B45309;
          color: #FFFFFF;
        }

        /* Quick Search Form on Step 4 */
        .gq-rh-quick-search {
          display: flex;
          gap: 6px;
          margin-top: 10px;
        }
        .gq-rh-quick-search input {
          flex: 1;
          padding: 7px 10px;
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          font-size: 12px;
          outline: none;
        }
        .gq-rh-quick-search button {
          padding: 7px 12px;
          border-radius: 8px;
          background: #0F172A;
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          border: none;
          cursor: pointer;
        }

        /* Class Batch Progress Table Panel */
        .gq-rh-panel {
          background: #FFFFFF;
          border-radius: 18px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
          padding: 24px;
          margin-bottom: 28px;
        }
        .gq-rh-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .gq-rh-table th {
          text-align: left;
          padding: 12px 14px;
          background: #F8FAFC;
          color: #475569;
          font-size: 11.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid #E2E8F0;
        }
        .gq-rh-table td {
          padding: 14px;
          border-bottom: 1px solid #F1F5F9;
          color: #1E293B;
          vertical-align: middle;
        }
        .gq-rh-table tr:hover td {
          background: #F8FAFC;
        }

        /* Status Pills */
        .gq-rh-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 9px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 700;
        }
        .gq-rh-pill-published { background: #ECFDF5; color: #047857; }
        .gq-rh-pill-approved { background: #EFF6FF; color: #1D4ED8; }
        .gq-rh-pill-computed { background: #F5F3FF; color: #6D28D9; }
        .gq-rh-pill-draft { background: #FFFBEB; color: #B45309; }
        .gq-rh-pill-none { background: #F1F5F9; color: #64748B; }

        /* Tools Grid */
        .gq-rh-tools-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 14px;
        }
        .gq-rh-tool-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: #0F172A;
          transition: all 0.15s ease;
          cursor: pointer;
        }
        .gq-rh-tool-card:hover {
          border-color: #2563EB;
          background: #F8FAFC;
          transform: translateY(-1px);
        }
        .gq-rh-tool-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #EFF6FF;
          color: #2563EB;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }
        .gq-rh-tool-title {
          font-size: 13px;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
        }
        .gq-rh-tool-desc {
          font-size: 11.5px;
          color: #64748B;
          margin: 2px 0 0 0;
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Academic Results Command Center | SchoolProfit" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto gq-rh-page gq-rh-main d-flex flex-column min-vh-100">
            {/* HERO HEADER */}
            <div className="gq-rh-hero">
              <div className="gq-rh-hero-eyebrow">Result Management Command Center</div>
              <h1 className="gq-rh-hero-title">{getGreeting()}, Administrator</h1>
              <p className="gq-rh-hero-sub">
                Manage your complete school term results lifecycle in 4 seamless stages: score entry, batch compilation, administrative review & publishing, and student report card distribution.
              </p>

              {/* CONTEXT BAR */}
              <div className="gq-rh-context-bar">
                <div className="gq-rh-term-selects">
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8" }}>Term:</span>
                    <select
                      className="gq-rh-select"
                      value={selectedTerm}
                      onChange={handleTermChange}
                    >
                      {terms.map((t) => (
                        <option key={t.id ?? t.name} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8" }}>Session:</span>
                    <select
                      className="gq-rh-select"
                      value={selectedSession}
                      onChange={handleSessionChange}
                    >
                      {sessions.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="gq-rh-stats">
                  <div className="gq-rh-stat-chip">
                    <span className="gq-rh-stat-num">{totalClasses}</span>
                    <span className="gq-rh-stat-lbl">Classes</span>
                  </div>
                  <div className="gq-rh-stat-chip">
                    <span className="gq-rh-stat-num" style={{ color: "#60A5FA" }}>{batchesCount}</span>
                    <span className="gq-rh-stat-lbl">Batches</span>
                  </div>
                  <div className="gq-rh-stat-chip">
                    <span className="gq-rh-stat-num" style={{ color: "#FBBF24" }}>{approvedBatchesCount}</span>
                    <span className="gq-rh-stat-lbl">Approved</span>
                  </div>
                  <div className="gq-rh-stat-chip">
                    <span className="gq-rh-stat-num" style={{ color: "#34D399" }}>{publishedBatchesCount}</span>
                    <span className="gq-rh-stat-lbl">Published</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4-STEP RESULT LIFECYCLE WORKFLOW */}
            <div className="gq-rh-workflow-section">
              <div className="gq-rh-section-header">
                <div>
                  <h2 className="gq-rh-section-title">
                    <span>⚡ End-of-Term Result Workflow</span>
                  </h2>
                  <p className="gq-rh-section-sub">
                    Follow the standard 4-step progression to process and release academic results for {selectedTerm} {selectedSession}.
                  </p>
                </div>
              </div>

              <div className="gq-rh-workflow-grid">
                {/* STEP 1: SCORE ENTRY */}
                <div className="gq-rh-step-card">
                  <div>
                    <span className="gq-rh-step-badge gq-rh-step-1">
                      <span>1️⃣</span> Step 1 • Score Entry
                    </span>
                    <h3 className="gq-rh-step-heading">
                      <span>📝 Enter Student Scores</span>
                    </h3>
                    <p className="gq-rh-step-desc">
                      Teachers and administrators input Continuous Assessment (CA 1, CA 2) and Exam scores for all subjects in their classes.
                    </p>

                    {/* Quick Class Shortcut */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11.5, fontWeight: 700, color: "#475569", marginBottom: 4, display: "block" }}>
                        Jump directly to class:
                      </label>
                      <select
                        style={{
                          width: "100%",
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid #CBD5E1",
                          fontSize: 12,
                          color: "#0F172A",
                          outline: "none",
                        }}
                        value={quickScoreClassId}
                        onChange={(e) => setQuickScoreClassId(e.target.value)}
                      >
                        <option value="">Choose Class (Optional)</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    className="gq-rh-btn-action gq-rh-btn-blue"
                    onClick={handleQuickScoreJump}
                    type="button"
                  >
                    Enter Scores Now →
                  </button>
                </div>

                {/* STEP 2: COMPILE TERM RESULTS */}
                <div className="gq-rh-step-card">
                  <div>
                    <span className="gq-rh-step-badge gq-rh-step-2">
                      <span>2️⃣</span> Step 2 • Batch Computation
                    </span>
                    <h3 className="gq-rh-step-heading">
                      <span>⚙️ Compile Term Results</span>
                    </h3>
                    <p className="gq-rh-step-desc">
                      Calculate overall term scores, student class positions, subject averages, term attendance, and class teacher remarks.
                    </p>
                  </div>

                  <button
                    className="gq-rh-btn-action gq-rh-btn-purple"
                    onClick={() => navigate("/students/results/batch")}
                    type="button"
                  >
                    Compile Term Batch →
                  </button>
                </div>

                {/* STEP 3: REVIEW & PUBLISH */}
                <div className="gq-rh-step-card">
                  <div>
                    <span className="gq-rh-step-badge gq-rh-step-3">
                      <span>3️⃣</span> Step 3 • Principal Review
                    </span>
                    <h3 className="gq-rh-step-heading">
                      <span>✅ Review & Publish</span>
                    </h3>
                    <p className="gq-rh-step-desc">
                      Audit class completion rates, check for missing student marks, approve final results, and publish them online for parents.
                    </p>
                  </div>

                  <button
                    className="gq-rh-btn-action gq-rh-btn-green"
                    onClick={() => navigate("/results/review")}
                    type="button"
                  >
                    Review & Publish →
                  </button>
                </div>

                {/* STEP 4: STUDENT REPORT CARDS */}
                <div className="gq-rh-step-card">
                  <div>
                    <span className="gq-rh-step-badge gq-rh-step-4">
                      <span>4️⃣</span> Step 4 • Print & Share
                    </span>
                    <h3 className="gq-rh-step-heading">
                      <span>📄 Student Report Cards</span>
                    </h3>
                    <p className="gq-rh-step-desc">
                      Search any student, preview their personalized report sheet, make one-off corrections, print PDF, or share via WhatsApp.
                    </p>

                    {/* Quick Student Search */}
                    <form onSubmit={handleQuickStudentSearch} className="gq-rh-quick-search">
                      <input
                        placeholder="Search student or Reg No..."
                        value={studentSearchText}
                        onChange={(e) => setStudentSearchText(e.target.value)}
                      />
                      <button type="submit">Open</button>
                    </form>
                  </div>

                  <button
                    className="gq-rh-btn-action gq-rh-btn-amber"
                    style={{ marginTop: 12 }}
                    onClick={() => navigate("/results/student-editor")}
                    type="button"
                  >
                    Open Student Editor →
                  </button>
                </div>
              </div>
            </div>

            {/* CLASS RESULTS PROGRESS TABLE */}
            <div className="gq-rh-panel">
              <div className="gq-rh-section-header">
                <div>
                  <h2 className="gq-rh-section-title">
                    <span>📋 Class Results Progress Overview</span>
                  </h2>
                  <p className="gq-rh-section-sub">
                    Live compilation status for {selectedTerm} {selectedSession} across all registered school classes.
                  </p>
                </div>

                {/* Search / Filter Bar */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="Search class name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      padding: "7px 12px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  <select
                    style={{
                      padding: "7px 12px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      fontSize: 13,
                      fontWeight: 600,
                      outline: "none",
                    }}
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                  >
                    <option value="all">All Classes ({classes.length})</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="gq-rh-table">
                  <thead>
                    <tr>
                      <th>Class Name</th>
                      <th>Section / Dept</th>
                      <th>Batch Status</th>
                      <th style={{ width: 180 }}>Compilation Progress</th>
                      <th style={{ textAlign: "right", width: 260 }}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loadingBatches ? (
                      <tr>
                        <td colSpan={5} style={{ padding: 28, textAlign: "center", color: "#64748B" }}>
                          <span className="spinner-border spinner-border-sm" /> Loading class batches...
                        </td>
                      </tr>
                    ) : filteredClasses.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#64748B" }}>
                          No classes found.
                        </td>
                      </tr>
                    ) : (
                      filteredClasses.map((cls) => {
                        const batch = batches.find((b) => b.class_id === cls.id);
                        const status = batch?.status || "not_started";
                        const total = batch?.review?.total_students ?? 0;
                        const done = batch?.review?.completed_students ?? 0;
                        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

                        return (
                          <tr key={cls.id}>
                            <td>
                              <div style={{ fontWeight: 800, color: "#0F172A", fontSize: 13.5 }}>{cls.name}</div>
                              {batch?.id && (
                                <div style={{ fontSize: 11, color: "#94A3B8" }}>Batch #{batch.id}</div>
                              )}
                            </td>
                            <td>
                              <span style={{ fontSize: 12, color: "#475569" }}>
                                {cls.section?.name || "General Section"}
                              </span>
                            </td>
                            <td>
                              {status === "published" ? (
                                <span className="gq-rh-pill gq-rh-pill-published">🌍 Published</span>
                              ) : status === "approved" ? (
                                <span className="gq-rh-pill gq-rh-pill-approved">✓ Approved</span>
                              ) : status === "computed" ? (
                                <span className="gq-rh-pill gq-rh-pill-computed">⚙️ Ready for Review</span>
                              ) : status === "draft" ? (
                                <span className="gq-rh-pill gq-rh-pill-draft">✏️ Still Entering</span>
                              ) : (
                                <span className="gq-rh-pill gq-rh-pill-none">⚪ Not Started</span>
                              )}
                            </td>
                            <td>
                              {batch ? (
                                <div>
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, marginBottom: 3 }}>
                                    <span>{done}/{total} students</span>
                                    <span>{pct}%</span>
                                  </div>
                                  <div style={{ height: 6, width: "100%", background: "#E2E8F0", borderRadius: 99, overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#10B981" : "#3B82F6", borderRadius: 99 }} />
                                  </div>
                                </div>
                              ) : (
                                <span style={{ fontSize: 12, color: "#94A3B8" }}>—</span>
                              )}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                <button
                                  style={{
                                    padding: "5px 10px",
                                    borderRadius: 6,
                                    border: "1px solid #CBD5E1",
                                    background: "#FFFFFF",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                  onClick={() =>
                                    navigate(
                                      `/students/results/add?class_id=${cls.id}&term=${encodeURIComponent(
                                        selectedTerm
                                      )}&session=${encodeURIComponent(selectedSession)}`
                                    )
                                  }
                                  type="button"
                                >
                                  Enter Scores
                                </button>

                                <button
                                  style={{
                                    padding: "5px 10px",
                                    borderRadius: 6,
                                    border: "1px solid #7C3AED",
                                    background: "#F5F3FF",
                                    color: "#6D28D9",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                  onClick={() =>
                                    navigate(
                                      `/students/results/batch?classId=${cls.id}&term=${encodeURIComponent(
                                        selectedTerm
                                      )}&session=${encodeURIComponent(selectedSession)}`
                                    )
                                  }
                                  type="button"
                                >
                                  Compile
                                </button>

                                {batch && (
                                  <button
                                    style={{
                                      padding: "5px 10px",
                                      borderRadius: 6,
                                      border: "1px solid #10B981",
                                      background: "#ECFDF5",
                                      color: "#047857",
                                      fontSize: 12,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                    onClick={() =>
                                      navigate(
                                        `/results/review?batchId=${batch.id}&term=${encodeURIComponent(
                                          selectedTerm
                                        )}&session=${encodeURIComponent(selectedSession)}`
                                      )
                                    }
                                    type="button"
                                  >
                                    Review
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
            </div>

            {/* MANAGEMENT TOOLS & SETTINGS GRID */}
            <div className="gq-rh-workflow-section">
              <div className="gq-rh-section-header">
                <div>
                  <h2 className="gq-rh-section-title">
                    <span>🛠️ Result Tools & Administration</span>
                  </h2>
                  <p className="gq-rh-section-sub">
                    Configure report card design, generate online checking PINs, track teacher submissions, and manage transcripts.
                  </p>
                </div>
              </div>

              <div className="gq-rh-tools-grid">
                <div className="gq-rh-tool-card" onClick={() => navigate("/result/monitor")}>
                  <div className="gq-rh-tool-icon">📊</div>
                  <div>
                    <h4 className="gq-rh-tool-title">Submission Tracker</h4>
                    <p className="gq-rh-tool-desc">Monitor teacher progress & deadlines</p>
                  </div>
                </div>

                <div className="gq-rh-tool-card" onClick={() => navigate("/results/design")}>
                  <div className="gq-rh-tool-icon">🎨</div>
                  <div>
                    <h4 className="gq-rh-tool-title">Report Card Design</h4>
                    <p className="gq-rh-tool-desc">Templates, logo & color branding</p>
                  </div>
                </div>

                <div className="gq-rh-tool-card" onClick={() => navigate("/results/pins")}>
                  <div className="gq-rh-tool-icon">🔑</div>
                  <div>
                    <h4 className="gq-rh-tool-title">Generate Result PINs</h4>
                    <p className="gq-rh-tool-desc">Parent scratch cards & access tokens</p>
                  </div>
                </div>

                <div className="gq-rh-tool-card" onClick={() => navigate("/transcripts")}>
                  <div className="gq-rh-tool-icon">📜</div>
                  <div>
                    <h4 className="gq-rh-tool-title">Student Transcripts</h4>
                    <p className="gq-rh-tool-desc">Multi-term official academic records</p>
                  </div>
                </div>

                <div className="gq-rh-tool-card" onClick={() => navigate("/results/withdrawn-archive")}>
                  <div className="gq-rh-tool-icon">📦</div>
                  <div>
                    <h4 className="gq-rh-tool-title">Withdrawn Archive</h4>
                    <p className="gq-rh-tool-desc">Archived records of past students</p>
                  </div>
                </div>

                <div className="gq-rh-tool-card" onClick={() => navigate("/results/deadlines")}>
                  <div className="gq-rh-tool-icon">⏰</div>
                  <div>
                    <h4 className="gq-rh-tool-title">Submission Deadlines</h4>
                    <p className="gq-rh-tool-desc">Set score entry cutoff dates</p>
                  </div>
                </div>
              </div>
            </div>

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}
