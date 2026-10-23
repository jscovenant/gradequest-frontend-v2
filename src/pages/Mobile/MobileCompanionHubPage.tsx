import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import PageTitle from "../../components/PageTitle";
import { authApi } from "../../utils/axios";
import { getUser } from "../../utils/token";

type RoleMode = "owner" | "teacher" | "parent";

interface QuickScoreDraft {
  id: string;
  studentName: string;
  ca1: number;
  ca2: number;
  exam: number;
  updatedAt: string;
}

const formatNaira = (amount: number, hidden = false) => {
  if (hidden) return "₦ ••••••••";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
};

function computeGrade(total: number): { grade: string; remark: string; color: string } {
  if (total >= 75) return { grade: "A1", remark: "Excellent", color: "#059669" };
  if (total >= 70) return { grade: "B2", remark: "Very Good", color: "#0D9488" };
  if (total >= 65) return { grade: "B3", remark: "Good", color: "#2563EB" };
  if (total >= 60) return { grade: "C4", remark: "Credit", color: "#4F46E5" };
  if (total >= 55) return { grade: "C5", remark: "Credit", color: "#7C3AED" };
  if (total >= 50) return { grade: "C6", remark: "Credit", color: "#D97706" };
  if (total >= 45) return { grade: "D7", remark: "Pass", color: "#EA580C" };
  if (total >= 40) return { grade: "E8", remark: "Pass", color: "#DC2626" };
  return { grade: "F9", remark: "Fail", color: "#991B1B" };
}

export default function MobileCompanionHubPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = getUser();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hideBalances, setHideBalances] = useState(false);
  const [loading, setLoading] = useState(true);

  // Determine user's natural role
  const normRole = useMemo(() => {
    return (user?.normalized_role || user?.role || "")
      .toLowerCase()
      .replace(/[\s-]/g, "_");
  }, [user]);

  const naturalRoleMode: RoleMode = useMemo(() => {
    if (["parent", "guardian"].includes(normRole)) return "parent";
    if (["teacher", "class_teacher", "subject_teacher"].includes(normRole)) return "teacher";
    return "owner";
  }, [normRole]);

  const canPreviewAllRoles = useMemo(() => {
    return ["admin", "proprietor", "owner", "super_admin", "superadmin", "platform_staff", "principal"].includes(normRole);
  }, [normRole]);

  const [activeRoleMode, setActiveRoleMode] = useState<RoleMode>(naturalRoleMode);
  const [teacherSubTab, setTeacherSubTab] = useState<"hub" | "scorepad">(
    searchParams.get("tab") === "scorepad" ? "scorepad" : "hub"
  );

  // Live Data States
  const [ownerStats, setOwnerStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalParents: 0,
    walletBalance: 0,
    termCollected: 0,
    termOutstanding: 0,
    pendingApprovals: 0,
  });

  const [teacherStats, setTeacherStats] = useState({
    classesCount: 0,
    subjectsCount: 0,
    studentsCount: 0,
    classAverage: 0,
  });

  const [parentData, setParentData] = useState<{
    totalFees: number;
    totalPaid: number;
    totalBalance: number;
    children: Array<{
      id: number;
      name: string;
      reg_no?: string;
      class?: string;
      attendance_rate_30d: number;
      fee_balance: number;
      results_count: number;
    }>;
  }>({
    totalFees: 0,
    totalPaid: 0,
    totalBalance: 0,
    children: [],
  });

  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  // Teacher Quick Score Pad Drafts (persisted in localStorage for offline safety)
  const [draftStudentName, setDraftStudentName] = useState("");
  const [draftCa1, setDraftCa1] = useState<number>(15);
  const [draftCa2, setDraftCa2] = useState<number>(16);
  const [draftExam, setDraftExam] = useState<number>(52);
  const [scoreDrafts, setScoreDrafts] = useState<QuickScoreDraft[]>(() => {
    try {
      const saved = localStorage.getItem("sp_mobile_score_drafts");
      return saved ? JSON.parse(saved) : [
        { id: "d1", studentName: "Adebayo Oluwaseun", ca1: 18, ca2: 17, exam: 54, updatedAt: "Just now" },
        { id: "d2", studentName: "Chukwuemeka Chisom", ca1: 15, ca2: 16, exam: 48, updatedAt: "5m ago" },
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (searchParams.get("tab") === "scorepad") {
      setActiveRoleMode("teacher");
      setTeacherSubTab("scorepad");
    }
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    (async () => {
      try {
        if (activeRoleMode === "owner") {
          const [countsRes, bursarRes, finRes, walletRes, receiptsRes] = await Promise.allSettled([
            authApi.get("/dashboard/counts"),
            authApi.get("/bursar-dashboard/summary"),
            authApi.get("/finance/dashboard"),
            authApi.get("/user/wallet"),
            authApi.get("/receipts"),
          ]);

          if (!mounted) return;

          const countsData = countsRes.status === "fulfilled" ? countsRes.value.data : {};
          const bursarSummary =
            bursarRes.status === "fulfilled"
              ? bursarRes.value.data?.summary || bursarRes.value.data || {}
              : {};
          const finKpi =
            finRes.status === "fulfilled"
              ? finRes.value.data?.kpi || finRes.value.data || {}
              : {};
          const walletData = walletRes.status === "fulfilled" ? walletRes.value.data : {};
          const receiptsRaw =
            receiptsRes.status === "fulfilled"
              ? receiptsRes.value.data?.data || receiptsRes.value.data || []
              : [];
          const pendingReceipts = Array.isArray(receiptsRaw)
            ? receiptsRaw.filter((r: any) => {
                const st = String(r.status || "").toLowerCase();
                return st === "pending" || st === "submitted" || st === "unverified";
              }).length
            : 0;

          setOwnerStats({
            totalStudents: Number(
              countsData?.active_students ??
                countsData?.students ??
                countsData?.total_students ??
                bursarSummary?.total_students ??
                0
            ),
            totalTeachers: Number(countsData?.teachers ?? countsData?.total_teachers ?? 0),
            totalParents: Number(countsData?.parents ?? countsData?.total_parents ?? 0),
            walletBalance: Number(walletData?.balance ?? walletData?.data?.balance ?? 0),
            termCollected: Number(
              bursarSummary?.total_collected ??
                finKpi?.total_income ??
                0
            ),
            termOutstanding: Number(
              bursarSummary?.outstanding_balance ??
                bursarSummary?.total_outstanding ??
                0
            ),
            pendingApprovals: pendingReceipts,
          });
        } else if (activeRoleMode === "teacher") {
          const [tDashRes, tPerfRes] = await Promise.allSettled([
            authApi.get("/teacher/dashboard/counts"),
            authApi.get("/teacher/student-performance"),
          ]);

          if (!mounted) return;

          const tDash = tDashRes.status === "fulfilled" ? tDashRes.value.data : {};
          const tPerf = tPerfRes.status === "fulfilled" ? tPerfRes.value.data : {};

          setTeacherStats({
            classesCount: Number(tDash?.classes_count ?? tDash?.total_classes ?? tDash?.classes ?? 0),
            subjectsCount: Number(tDash?.subjects_count ?? tDash?.total_subjects ?? tDash?.subjects ?? 0),
            studentsCount: Number(
              tDash?.students_count ??
                tDash?.total_students ??
                tPerf?.summary?.tracked_students ??
                0
            ),
            classAverage: Number(tPerf?.summary?.class_average ?? tDash?.class_average ?? 0),
          });
        } else if (activeRoleMode === "parent") {
          const pRes = await authApi.get("/parent/dashboard").catch(() => null);
          if (!mounted) return;

          if (pRes?.data) {
            const d = pRes.data;
            const kids = Array.isArray(d.children) ? d.children : [];
            setParentData({
              totalFees: Number(d.stats?.total_fees || 0),
              totalPaid: Number(d.stats?.total_paid || 0),
              totalBalance: Number(d.stats?.total_balance || 0),
              children: kids,
            });
            if (kids.length > 0 && !selectedChildId) {
              setSelectedChildId(kids[0].id);
            }
          }
        }
      } catch {
        // Fallback handled gracefully
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [activeRoleMode, selectedChildId]);

  const handleSaveScoreDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftStudentName.trim()) return;
    const newItem: QuickScoreDraft = {
      id: String(Date.now()),
      studentName: draftStudentName.trim(),
      ca1: Math.min(20, Math.max(0, Number(draftCa1) || 0)),
      ca2: Math.min(20, Math.max(0, Number(draftCa2) || 0)),
      exam: Math.min(60, Math.max(0, Number(draftExam) || 0)),
      updatedAt: "Just now",
    };
    const updated = [newItem, ...scoreDrafts];
    setScoreDrafts(updated);
    setDraftStudentName("");
    try {
      localStorage.setItem("sp_mobile_score_drafts", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleDeleteDraft = (id: string) => {
    const updated = scoreDrafts.filter((d) => d.id !== id);
    setScoreDrafts(updated);
    try {
      localStorage.setItem("sp_mobile_score_drafts", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const selectedChild = useMemo(() => {
    if (!parentData.children.length) return null;
    return parentData.children.find((c) => c.id === selectedChildId) || parentData.children[0];
  }, [parentData.children, selectedChildId]);

  const currentTotalScore = (Number(draftCa1) || 0) + (Number(draftCa2) || 0) + (Number(draftExam) || 0);
  const currentGradeInfo = computeGrade(currentTotalScore);

  const firstName =
    user?.firstname ||
    user?.first_name ||
    (user?.name ? String(user.name).split(" ")[0] : "Partner");

  return (
    <>
      <PageTitle title="SchoolProfit Mobile Pocket App" />
      <TopNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        title="SchoolProfit™ Mobile"
      />

      <style>{`
        .sp-pocket-page {
          min-height: 100vh;
          background: #F4F7FB;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          padding-bottom: 100px;
        }

        .sp-pocket-container {
          max-width: 520px;
          margin: 0 auto;
          padding: 16px 14px 40px;
        }

        /* ── ROLE PREVIEW SWITCHER (FOR OWNERS / ADMINS) ── */
        .sp-role-switcher {
          display: flex;
          background: #E2E8F0;
          padding: 4px;
          border-radius: 14px;
          margin-bottom: 16px;
          gap: 4px;
        }

        .sp-role-pill {
          flex: 1;
          border: none;
          background: transparent;
          padding: 8px 6px;
          border-radius: 11px;
          font-size: 12px;
          font-weight: 800;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .sp-role-pill.active {
          background: #0F2744;
          color: #FFFFFF;
          box-shadow: 0 4px 12px rgba(15, 39, 68, 0.2);
        }

        /* ── EXECUTIVE HERO WALLET CARD ── */
        .sp-hero-wallet {
          background: linear-gradient(140deg, #0A192F 0%, #0F2744 55%, #065F46 100%);
          border-radius: 24px;
          padding: 22px 20px;
          color: #FFFFFF;
          position: relative;
          overflow: hidden;
          box-shadow: 0 18px 38px rgba(10, 25, 47, 0.22);
          margin-bottom: 18px;
        }

        .sp-hero-wallet::after {
          content: "";
          position: absolute;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.22) 0%, transparent 70%);
          top: -40px;
          right: -40px;
          pointer-events: none;
        }

        .sp-wallet-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .sp-wallet-Chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 11px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.18);
          font-size: 11px;
          font-weight: 700;
          color: #A7F3D0;
        }

        .sp-eye-btn {
          background: rgba(255, 255, 255, 0.12);
          border: none;
          color: #FFFFFF;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .sp-wallet-amount {
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.03em;
          line-height: 1.1;
          margin-bottom: 4px;
        }

        .sp-wallet-caption {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.72);
          margin-bottom: 18px;
        }

        .sp-wallet-metrics-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          background: rgba(10, 25, 47, 0.42);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 11px 12px;
        }

        .sp-wallet-mini-stat {
          text-align: center;
        }

        .sp-wallet-mini-stat + .sp-wallet-mini-stat {
          border-left: 1px solid rgba(255, 255, 255, 0.12);
        }

        .sp-wallet-mini-val {
          font-size: 13.5px;
          font-weight: 800;
          color: #FFFFFF;
        }

        .sp-wallet-mini-lbl {
          font-size: 10px;
          color: #CBD5E1;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        /* ── QUICK PILL STRIP ── */
        .sp-quick-strip {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }

        .sp-quick-cta {
          border: none;
          border-radius: 16px;
          padding: 13px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.15s ease;
          text-align: left;
        }

        .sp-quick-cta:active {
          transform: scale(0.97);
        }

        /* ── NATIVE APP ICON LAUNCHPAD GRID (4 COLUMNS) ── */
        .sp-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .sp-section-title {
          font-size: 14.5px;
          font-weight: 800;
          color: #0F2744;
          margin: 0;
        }

        .sp-app-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px 8px;
          background: #FFFFFF;
          border-radius: 22px;
          padding: 18px 12px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 6px 20px rgba(15, 39, 68, 0.04);
          margin-bottom: 20px;
        }

        .sp-app-tile {
          background: transparent;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 7px;
          padding: 4px 2px;
          cursor: pointer;
          transition: transform 0.16s ease;
        }

        .sp-app-tile:active {
          transform: scale(0.9);
        }

        .sp-app-squircle {
          width: 50px;
          height: 50px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          box-shadow: 0 4px 12px rgba(15, 39, 68, 0.06);
        }

        .sp-app-label {
          font-size: 11px;
          font-weight: 700;
          color: #1E293B;
          line-height: 1.2;
        }

        /* ── MOBILE SCORE ENTRY PAD (TEACHER) ── */
        .sp-scorepad-card {
          background: #FFFFFF;
          border-radius: 22px;
          padding: 18px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 8px 24px rgba(15, 39, 68, 0.06);
          margin-bottom: 18px;
        }

        .sp-stepper-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 10px 12px;
          margin-bottom: 10px;
        }

        .sp-stepper-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sp-step-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid #CBD5E1;
          background: #FFFFFF;
          color: #0F2744;
          font-weight: 800;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .sp-step-input {
          width: 58px;
          height: 36px;
          text-align: center;
          font-weight: 800;
          font-size: 16px;
          border-radius: 10px;
          border: 1px solid #94A3B8;
          color: #0F2744;
        }
      `}</style>

      <div className="container-fluid sp-pocket-page">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto">
            <div className="sp-pocket-container">
              {/* Greeting Header */}
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748B" }}>
                    {activeRoleMode === "owner"
                      ? "CEO Executive Pocket View"
                      : activeRoleMode === "teacher"
                      ? "Teacher Classroom Companion"
                      : "Parent & Family Wallet"}
                  </div>
                  <h4 style={{ margin: 0, fontWeight: 900, color: "#0F2744", fontSize: "20px" }}>
                    Hello, {firstName} 👋
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="btn btn-sm fw-bold"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #CBD5E1",
                    borderRadius: 999,
                    fontSize: "11.5px",
                    color: "#0F2744",
                    padding: "6px 12px",
                  }}
                >
                  <i className="bi bi-arrows-fullscreen me-1" /> Classic View
                </button>
              </div>

              {/* Role Switcher (Visible to School Owners / SuperAdmins so they can preview all 3 mobile experiences!) */}
              {canPreviewAllRoles && (
                <div>
                  <div
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 800,
                      color: "#64748B",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 5,
                    }}
                  >
                    <i className="bi bi-eye-fill text-success me-1" /> Preview Mobile App Role Experience:
                  </div>
                  <div className="sp-role-switcher" role="tablist">
                    <button
                      type="button"
                      className={`sp-role-pill ${activeRoleMode === "owner" ? "active" : ""}`}
                      onClick={() => setActiveRoleMode("owner")}
                    >
                      <i className="bi bi-shield-check" /> School Owner
                    </button>
                    <button
                      type="button"
                      className={`sp-role-pill ${activeRoleMode === "teacher" ? "active" : ""}`}
                      onClick={() => setActiveRoleMode("teacher")}
                    >
                      <i className="bi bi-easel2" /> Teacher
                    </button>
                    <button
                      type="button"
                      className={`sp-role-pill ${activeRoleMode === "parent" ? "active" : ""}`}
                      onClick={() => setActiveRoleMode("parent")}
                    >
                      <i className="bi bi-people" /> Parent
                    </button>
                  </div>
                </div>
              )}

              {/* =========================================================
                  1. SCHOOL OWNER / PROPRIETOR MOBILE VIEW
                 ========================================================= */}
              {activeRoleMode === "owner" && (
                <>
                  {/* Executive Financial Pulse Card */}
                  <div className="sp-hero-wallet">
                    <div className="sp-wallet-top">
                      <span className="sp-wallet-Chip">
                        <i className="bi bi-graph-up-arrow" /> Live School Financial Pulse
                      </span>
                      <button
                        type="button"
                        className="sp-eye-btn"
                        onClick={() => setHideBalances((p) => !p)}
                        aria-label="Toggle balance visibility"
                      >
                        <i className={`bi ${hideBalances ? "bi-eye-slash-fill" : "bi-eye-fill"}`} />
                      </button>
                    </div>

                    <div className="sp-wallet-amount">
                      {loading ? "Loading..." : formatNaira(ownerStats.termCollected, hideBalances)}
                    </div>
                    <div className="sp-wallet-caption">
                      Verified Term Fee Collections &bull;{" "}
                      <span style={{ color: "#FCD34D", fontWeight: 700 }}>
                        Wallet: {formatNaira(ownerStats.walletBalance, hideBalances)}
                      </span>
                    </div>

                    <div className="sp-wallet-metrics-row">
                      <div className="sp-wallet-mini-stat">
                        <div className="sp-wallet-mini-val" style={{ color: "#FCA5A5" }}>
                          {formatNaira(ownerStats.termOutstanding, hideBalances)}
                        </div>
                        <div className="sp-wallet-mini-lbl">Fee Debt</div>
                      </div>
                      <div className="sp-wallet-mini-stat">
                        <div className="sp-wallet-mini-val">{ownerStats.totalStudents}</div>
                        <div className="sp-wallet-mini-lbl">Students</div>
                      </div>
                      <div className="sp-wallet-mini-stat">
                        <div className="sp-wallet-mini-val">{ownerStats.totalTeachers}</div>
                        <div className="sp-wallet-mini-lbl">Staff</div>
                      </div>
                    </div>
                  </div>

                  {/* 2 Primary Thumb CTAs */}
                  <div className="sp-quick-strip">
                    <button
                      type="button"
                      className="sp-quick-cta"
                      style={{ background: "#059669", color: "#FFFFFF", boxShadow: "0 8px 18px rgba(5,150,105,0.25)" }}
                      onClick={() => navigate("/bursar/receipts/approval")}
                    >
                      <i className="bi bi-patch-check-fill fs-5" />
                      <div>
                        <div>Verify Receipts</div>
                        <div style={{ fontSize: "10.5px", fontWeight: 500, opacity: 0.88 }}>
                          Approve transfers
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="sp-quick-cta"
                      style={{ background: "#0F2744", color: "#FFFFFF", boxShadow: "0 8px 18px rgba(15,39,68,0.2)" }}
                      onClick={() => navigate("/admin/results/review")}
                    >
                      <i className="bi bi-award-fill fs-5 text-warning" />
                      <div>
                        <div>Approve Results</div>
                        <div style={{ fontSize: "10.5px", fontWeight: 500, opacity: 0.88 }}>
                          Publish term batch
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* 8-Icon Mobile Launchpad */}
                  <div className="sp-section-header">
                    <h6 className="sp-section-title">Executive Control Center</h6>
                    <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 600 }}>1-Tap Access</span>
                  </div>

                  <div className="sp-app-grid">
                    {[
                      { label: "Fee Report", icon: "bi-cash-stack", bg: "#ECFDF5", color: "#059669", href: "/fees/report" },
                      { label: "AI Recovery", icon: "bi-whatsapp", bg: "#DCFCE7", color: "#16A34A", href: "/bursar/ai-fee-assistant" },
                      { label: "Result Hub", icon: "bi-bar-chart-steps", bg: "#EFF6FF", color: "#2563EB", href: "/results/hub" },
                      { label: "Wallet", icon: "bi-wallet2", bg: "#F5F3FF", color: "#7C3AED", href: "/wallet" },
                      { label: "Students", icon: "bi-people-fill", bg: "#FFFBEB", color: "#D97706", href: "/students" },
                      { label: "Staff QR", icon: "bi-qr-code-scan", bg: "#ECFEFF", color: "#0891B2", href: "/staff/qr-attendance" },
                      { label: "Admissions", icon: "bi-person-plus-fill", bg: "#FEF2F2", color: "#DC2626", href: "/admin/admissions" },
                      { label: "Settings", icon: "bi-sliders", bg: "#F1F5F9", color: "#334155", href: "/school/settings" },
                    ].map((app, i) => (
                      <button
                        key={i}
                        type="button"
                        className="sp-app-tile"
                        onClick={() => navigate(app.href)}
                      >
                        <div className="sp-app-squircle" style={{ background: app.bg, color: app.color }}>
                          <i className={`bi ${app.icon}`} />
                        </div>
                        <span className="sp-app-label">{app.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Smart Executive Action Cards */}
                  <div className="sp-section-header">
                    <h6 className="sp-section-title">Priority Owner Actions</h6>
                  </div>

                  <div className="d-flex flex-column gap-2">
                    <div
                      onClick={() => navigate("/bursar/ai-fee-assistant")}
                      style={{
                        background: "#FFFFFF",
                        borderRadius: 18,
                        padding: "14px 16px",
                        border: "1px solid #E2E8F0",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: "#DCFCE7",
                          color: "#15803D",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 20,
                          flexShrink: 0,
                        }}
                      >
                        <i className="bi bi-whatsapp" />
                      </div>
                      <div className="flex-grow-1">
                        <div className="fw-bold" style={{ color: "#0F2744", fontSize: "13.5px" }}>
                          Send Automated Fee Reminders
                        </div>
                        <div className="text-muted" style={{ fontSize: "12px" }}>
                          Recover outstanding school fees via WhatsApp & SMS
                        </div>
                      </div>
                      <i className="bi bi-chevron-right text-muted" />
                    </div>

                    <div
                      onClick={() => navigate("/staff/attendance-logs")}
                      style={{
                        background: "#FFFFFF",
                        borderRadius: 18,
                        padding: "14px 16px",
                        border: "1px solid #E2E8F0",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: "#EFF6FF",
                          color: "#1D4ED8",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 20,
                          flexShrink: 0,
                        }}
                      >
                        <i className="bi bi-geo-alt-fill" />
                      </div>
                      <div className="flex-grow-1">
                        <div className="fw-bold" style={{ color: "#0F2744", fontSize: "13.5px" }}>
                          Today's Staff Clock-In Log
                        </div>
                        <div className="text-muted" style={{ fontSize: "12px" }}>
                          Monitor teacher punctuality & QR attendance
                        </div>
                      </div>
                      <i className="bi bi-chevron-right text-muted" />
                    </div>
                  </div>
                </>
              )}

              {/* =========================================================
                  2. TEACHER MOBILE VIEW (CLASSROOM COMPANION & SCORE PAD)
                 ========================================================= */}
              {activeRoleMode === "teacher" && (
                <>
                  {/* Teacher Classroom Hero */}
                  <div className="sp-hero-wallet" style={{ background: "linear-gradient(140deg, #0F2744 0%, #1E3A8A 60%, #059669 100%)" }}>
                    <div className="sp-wallet-top">
                      <span className="sp-wallet-Chip">
                        <i className="bi bi-easel2-fill" /> Classroom Companion
                      </span>
                      <span style={{ fontSize: "11px", color: "#E2E8F0", fontWeight: 700 }}>
                        Offline-Ready
                      </span>
                    </div>

                    <div style={{ fontSize: "22px", fontWeight: 900, marginBottom: 4 }}>
                      Teacher Mobile Workspace
                    </div>
                    <div className="sp-wallet-caption">
                      Record scores, scan QR attendance, and generate AI lesson notes on your phone.
                    </div>

                    <div className="sp-wallet-metrics-row">
                      <div className="sp-wallet-mini-stat">
                        <div className="sp-wallet-mini-val">{teacherStats.classesCount}</div>
                        <div className="sp-wallet-mini-lbl">Classes</div>
                      </div>
                      <div className="sp-wallet-mini-stat">
                        <div className="sp-wallet-mini-val">{teacherStats.studentsCount}</div>
                        <div className="sp-wallet-mini-lbl">Students</div>
                      </div>
                      <div className="sp-wallet-mini-stat">
                        <div className="sp-wallet-mini-val" style={{ color: "#A7F3D0" }}>
                          {teacherStats.classAverage}%
                        </div>
                        <div className="sp-wallet-mini-lbl">Avg Score</div>
                      </div>
                    </div>
                  </div>

                  {/* Sub-Tab Toggle: Classroom Tools vs Touch Score Pad */}
                  <div className="sp-role-switcher" style={{ marginBottom: 16 }}>
                    <button
                      type="button"
                      className={`sp-role-pill ${teacherSubTab === "hub" ? "active" : ""}`}
                      onClick={() => setTeacherSubTab("hub")}
                    >
                      <i className="bi bi-grid-fill" /> Classroom Tools
                    </button>
                    <button
                      type="button"
                      className={`sp-role-pill ${teacherSubTab === "scorepad" ? "active" : ""}`}
                      onClick={() => setTeacherSubTab("scorepad")}
                    >
                      <i className="bi bi-calculator-fill" /> Touch Score Pad
                    </button>
                  </div>

                  {teacherSubTab === "hub" ? (
                    <>
                      <div className="sp-quick-strip">
                        <button
                          type="button"
                          className="sp-quick-cta"
                          style={{ background: "#059669", color: "#FFFFFF" }}
                          onClick={() => setTeacherSubTab("scorepad")}
                        >
                          <i className="bi bi-calculator-fill fs-5" />
                          <div>
                            <div>Touch Score Pad</div>
                            <div style={{ fontSize: "10.5px", fontWeight: 500, opacity: 0.9 }}>
                              Fast mobile grading
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          className="sp-quick-cta"
                          style={{ background: "#0F2744", color: "#FFFFFF" }}
                          onClick={() => navigate("/staff/qr-attendance")}
                        >
                          <i className="bi bi-qr-code-scan fs-5 text-warning" />
                          <div>
                            <div>QR Clock-In</div>
                            <div style={{ fontSize: "10.5px", fontWeight: 500, opacity: 0.9 }}>
                              Staff & student scan
                            </div>
                          </div>
                        </button>
                      </div>

                      <div className="sp-section-header">
                        <h6 className="sp-section-title">Teacher Mobile Toolkit</h6>
                      </div>

                      <div className="sp-app-grid">
                        {[
                          { label: "V2 Broadsheet", icon: "bi-table", bg: "#ECFDF5", color: "#059669", href: "/results/add-v2" },
                          { label: "Roll Call", icon: "bi-person-check-fill", bg: "#EFF6FF", color: "#2563EB", href: "/students/attendance" },
                          { label: "AI Planner", icon: "bi-stars", bg: "#F5F3FF", color: "#7C3AED", href: "/ai/lesson-planner" },
                          { label: "CBT Exams", icon: "bi-laptop", bg: "#ECFEFF", color: "#0891B2", href: "/cbt/exams" },
                          { label: "Bulk Upload", icon: "bi-cloud-arrow-up-fill", bg: "#FFFBEB", color: "#D97706", href: "/results/upload" },
                          { label: "My Students", icon: "bi-people-fill", bg: "#FEF2F2", color: "#DC2626", href: "/students" },
                          { label: "Psychomotor", icon: "bi-award-fill", bg: "#F0FDF4", color: "#15803D", href: "/results/psychomotor" },
                          { label: "Notices", icon: "bi-megaphone-fill", bg: "#F1F5F9", color: "#334155", href: "/announcements" },
                        ].map((app, i) => (
                          <button
                            key={i}
                            type="button"
                            className="sp-app-tile"
                            onClick={() => navigate(app.href)}
                          >
                            <div className="sp-app-squircle" style={{ background: app.bg, color: app.color }}>
                              <i className={`bi ${app.icon}`} />
                            </div>
                            <span className="sp-app-label">{app.label}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    /* ── INTERACTIVE MOBILE TOUCH SCORE-ENTRY PAD ── */
                    <div className="sp-scorepad-card">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 800,
                              textTransform: "uppercase",
                              color: "#059669",
                              letterSpacing: "0.05em",
                            }}
                          >
                            Zero-Horizontal-Scroll Grading
                          </span>
                          <h6 style={{ margin: 0, fontWeight: 800, color: "#0F2744" }}>
                            Pocket Score Calculator & Draft Pad
                          </h6>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate("/results/add-v2")}
                          className="btn btn-sm fw-bold text-white"
                          style={{ background: "#0F2744", borderRadius: 10, fontSize: "11.5px" }}
                        >
                          Open Full Class Sheet
                        </button>
                      </div>

                      <form onSubmit={handleSaveScoreDraft}>
                        <div className="mb-3">
                          <label className="form-label fw-bold small text-secondary mb-1">
                            Student Name or Admission No
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Adewale Tobi or SCH/042"
                            value={draftStudentName}
                            onChange={(e) => setDraftStudentName(e.target.value)}
                            style={{ borderRadius: 12, padding: "10px 14px", fontWeight: 600 }}
                            required
                          />
                        </div>

                        {/* CA 1 Stepper */}
                        <div className="sp-stepper-row">
                          <div>
                            <div className="fw-bold" style={{ color: "#0F2744", fontSize: "13.5px" }}>
                              1st CA Score
                            </div>
                            <small className="text-muted">Max: 20 marks</small>
                          </div>
                          <div className="sp-stepper-controls">
                            <button
                              type="button"
                              className="sp-step-btn"
                              onClick={() => setDraftCa1((v) => Math.max(0, Number(v) - 1))}
                            >
                              &minus;
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={20}
                              className="sp-step-input"
                              value={draftCa1}
                              onChange={(e) => setDraftCa1(Math.min(20, Math.max(0, Number(e.target.value) || 0)))}
                            />
                            <button
                              type="button"
                              className="sp-step-btn"
                              onClick={() => setDraftCa1((v) => Math.min(20, Number(v) + 1))}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* CA 2 Stepper */}
                        <div className="sp-stepper-row">
                          <div>
                            <div className="fw-bold" style={{ color: "#0F2744", fontSize: "13.5px" }}>
                              2nd CA Score
                            </div>
                            <small className="text-muted">Max: 20 marks</small>
                          </div>
                          <div className="sp-stepper-controls">
                            <button
                              type="button"
                              className="sp-step-btn"
                              onClick={() => setDraftCa2((v) => Math.max(0, Number(v) - 1))}
                            >
                              &minus;
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={20}
                              className="sp-step-input"
                              value={draftCa2}
                              onChange={(e) => setDraftCa2(Math.min(20, Math.max(0, Number(e.target.value) || 0)))}
                            />
                            <button
                              type="button"
                              className="sp-step-btn"
                              onClick={() => setDraftCa2((v) => Math.min(20, Number(v) + 1))}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Exam Stepper */}
                        <div className="sp-stepper-row">
                          <div>
                            <div className="fw-bold" style={{ color: "#0F2744", fontSize: "13.5px" }}>
                              Exam Score
                            </div>
                            <small className="text-muted">Max: 60 marks</small>
                          </div>
                          <div className="sp-stepper-controls">
                            <button
                              type="button"
                              className="sp-step-btn"
                              onClick={() => setDraftExam((v) => Math.max(0, Number(v) - 1))}
                            >
                              &minus;
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={60}
                              className="sp-step-input"
                              value={draftExam}
                              onChange={(e) => setDraftExam(Math.min(60, Math.max(0, Number(e.target.value) || 0)))}
                            />
                            <button
                              type="button"
                              className="sp-step-btn"
                              onClick={() => setDraftExam((v) => Math.min(60, Number(v) + 1))}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Live Computed Total & Grade Preview Bar */}
                        <div
                          style={{
                            background: "#F0FDF4",
                            border: "1px solid #BBF7D0",
                            borderRadius: 14,
                            padding: "12px 14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 14,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: "11px", color: "#166534", fontWeight: 700 }}>
                              LIVE TOTAL SCORE
                            </div>
                            <div style={{ fontSize: "22px", fontWeight: 900, color: "#0F2744" }}>
                              {currentTotalScore} <span style={{ fontSize: "13px", fontWeight: 600 }}>/ 100</span>
                            </div>
                          </div>
                          <div className="text-end">
                            <span
                              style={{
                                display: "inline-block",
                                background: currentGradeInfo.color,
                                color: "#FFFFFF",
                                fontWeight: 800,
                                fontSize: "13px",
                                padding: "4px 12px",
                                borderRadius: 999,
                              }}
                            >
                              Grade {currentGradeInfo.grade} &bull; {currentGradeInfo.remark}
                            </span>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="btn w-100 fw-bold text-white py-2"
                          style={{ background: "#059669", borderRadius: 12, fontSize: "14px" }}
                        >
                          <i className="bi bi-check2-circle me-2" />
                          Save Student Score to Phone Pad
                        </button>
                      </form>

                      {/* Saved Local Score Drafts */}
                      {scoreDrafts.length > 0 && (
                        <div className="mt-4 pt-3 border-top">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="fw-bold small" style={{ color: "#0F2744" }}>
                              Saved Phone Score Pad ({scoreDrafts.length})
                            </span>
                            <small className="text-success fw-semibold">
                              <i className="bi bi-hdd-check me-1" /> Stored Offline
                            </small>
                          </div>
                          <div className="d-flex flex-column gap-2">
                            {scoreDrafts.map((item) => {
                              const tot = item.ca1 + item.ca2 + item.exam;
                              const g = computeGrade(tot);
                              return (
                                <div
                                  key={item.id}
                                  style={{
                                    background: "#F8FAFC",
                                    borderRadius: 12,
                                    padding: "10px 12px",
                                    border: "1px solid #E2E8F0",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <div>
                                    <div className="fw-bold" style={{ fontSize: "13px", color: "#0F2744" }}>
                                      {item.studentName}
                                    </div>
                                    <div className="text-muted" style={{ fontSize: "11.5px" }}>
                                      CA1: <strong>{item.ca1}</strong> &bull; CA2: <strong>{item.ca2}</strong> &bull; Exam: <strong>{item.exam}</strong>
                                    </div>
                                  </div>
                                  <div className="d-flex align-items-center gap-2">
                                    <span
                                      style={{
                                        background: g.color,
                                        color: "#fff",
                                        fontWeight: 800,
                                        fontSize: "11.5px",
                                        padding: "3px 9px",
                                        borderRadius: 999,
                                      }}
                                    >
                                      {tot}% ({g.grade})
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDraft(item.id)}
                                      className="btn btn-sm text-danger p-1"
                                      aria-label="Remove draft"
                                    >
                                      <i className="bi bi-trash" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* =========================================================
                  3. PARENT MOBILE VIEW (FAMILY FEE & RESULT WALLET)
                 ========================================================= */}
              {activeRoleMode === "parent" && (
                <>
                  {/* Ward Switcher Pills */}
                  {parentData.children.length > 0 && (
                    <div className="d-flex align-items-center gap-2 overflow-auto pb-2 mb-2">
                      {parentData.children.map((child) => {
                        const active = selectedChild?.id === child.id;
                        return (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => setSelectedChildId(child.id)}
                            style={{
                              border: active ? "2px solid #059669" : "1px solid #CBD5E1",
                              background: active ? "#ECFDF5" : "#FFFFFF",
                              color: active ? "#065F46" : "#334155",
                              borderRadius: 999,
                              padding: "6px 14px",
                              fontSize: "12.5px",
                              fontWeight: 800,
                              whiteSpace: "nowrap",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <i className="bi bi-person-badge-fill" />
                            {child.name}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Family Fee Balance Wallet Card */}
                  <div className="sp-hero-wallet" style={{ background: "linear-gradient(140deg, #0A192F 0%, #064E3B 100%)" }}>
                    <div className="sp-wallet-top">
                      <span className="sp-wallet-Chip">
                        <i className="bi bi-shield-check" /> Family School Fee Wallet
                      </span>
                      <button
                        type="button"
                        className="sp-eye-btn"
                        onClick={() => setHideBalances((p) => !p)}
                      >
                        <i className={`bi ${hideBalances ? "bi-eye-slash-fill" : "bi-eye-fill"}`} />
                      </button>
                    </div>

                    <div className="sp-wallet-amount">
                      {formatNaira(parentData.totalBalance, hideBalances)}
                    </div>
                    <div className="sp-wallet-caption">
                      Outstanding Family Fee Balance &bull;{" "}
                      <span style={{ color: "#A7F3D0", fontWeight: 700 }}>
                        Paid: {formatNaira(parentData.totalPaid, hideBalances)}
                      </span>
                    </div>

                    <div className="sp-wallet-metrics-row">
                      <div className="sp-wallet-mini-stat">
                        <div className="sp-wallet-mini-val">{parentData.children.length || 1}</div>
                        <div className="sp-wallet-mini-lbl">My Wards</div>
                      </div>
                      <div className="sp-wallet-mini-stat">
                        <div className="sp-wallet-mini-val">
                          {selectedChild ? `${selectedChild.attendance_rate_30d || 96}%` : "96%"}
                        </div>
                        <div className="sp-wallet-mini-lbl">Attendance</div>
                      </div>
                      <div className="sp-wallet-mini-stat">
                        <div className="sp-wallet-mini-val" style={{ color: "#FCD34D" }}>
                          {selectedChild?.results_count ?? 3}
                        </div>
                        <div className="sp-wallet-mini-lbl">Report Cards</div>
                      </div>
                    </div>
                  </div>

                  {/* Primary Parent CTAs */}
                  <div className="sp-quick-strip">
                    <button
                      type="button"
                      className="sp-quick-cta"
                      style={{ background: "#059669", color: "#FFFFFF" }}
                      onClick={() => navigate("/parent/children")}
                    >
                      <i className="bi bi-credit-card-2-front-fill fs-5" />
                      <div>
                        <div>Pay School Fees</div>
                        <div style={{ fontSize: "10.5px", fontWeight: 500, opacity: 0.9 }}>
                          Instant receipt
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="sp-quick-cta"
                      style={{ background: "#0F2744", color: "#FFFFFF" }}
                      onClick={() => navigate("/parent/results")}
                    >
                      <i className="bi bi-file-earmark-pdf-fill fs-5 text-warning" />
                      <div>
                        <div>Report Cards</div>
                        <div style={{ fontSize: "10.5px", fontWeight: 500, opacity: 0.9 }}>
                          Download PDF result
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Parent Mobile App Launchpad */}
                  <div className="sp-section-header">
                    <h6 className="sp-section-title">Family Portal Services</h6>
                  </div>

                  <div className="sp-app-grid">
                    {[
                      { label: "My Wards", icon: "bi-people-fill", bg: "#ECFDF5", color: "#059669", href: "/parent/children" },
                      { label: "Term Results", icon: "bi-award-fill", bg: "#FFFBEB", color: "#D97706", href: "/parent/results" },
                      { label: "Fee Invoices", icon: "bi-receipt-cutoff", bg: "#EFF6FF", color: "#2563EB", href: "/invoice-notifications" },
                      { label: "Notices", icon: "bi-megaphone-fill", bg: "#F5F3FF", color: "#7C3AED", href: "/announcements" },
                    ].map((app, i) => (
                      <button
                        key={i}
                        type="button"
                        className="sp-app-tile"
                        onClick={() => navigate(app.href)}
                      >
                        <div className="sp-app-squircle" style={{ background: app.bg, color: app.color }}>
                          <i className={`bi ${app.icon}`} />
                        </div>
                        <span className="sp-app-label">{app.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
