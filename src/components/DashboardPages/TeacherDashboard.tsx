import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { authApi } from "../../utils/axios";

import TopNav from "../LayoutComponents/TopNav";
import Sidebar from "../LayoutComponents/Sidebar";
import Footer from "../LayoutComponents/Footer";
import Loader from "../ui/dashboardLoader";
import { useNavigate } from "react-router-dom";
import PageTitle from "../PageTitle";

interface StatCard {
  title: string;
  value: string | number;
  icon: string;
}

interface StudentTrendPoint {
  label: string;
  score: number;
}

interface StudentWeakSubject {
  subject: string;
  score: number;
}

interface StudentInsight {
  level: string;
  headline: string;
  recommendation: string;
}

interface StudentPerformanceItem {
  id: number;
  name: string;
  reg_no?: string;
  class_name?: string;
  average: number;
  latest_score: number;
  change: number;
  status: string;
  trend: StudentTrendPoint[];
  weak_subjects: StudentWeakSubject[];
  insight: StudentInsight;
}

interface StudentPerformanceResponse {
  summary: {
    tracked_students: number;
    strong_count: number;
    struggling_count: number;
    class_average: number;
  };
  top_performers: StudentPerformanceItem[];
  struggling_students: StudentPerformanceItem[];
}

interface TeacherActionItem {
  priority: "high" | "medium" | "low" | string;
  label: string;
  description: string;
  route: string;
  icon: string;
}

interface AttendanceClassGap {
  class_id: number;
  class_name: string;
  total_students: number;
  marked_students: number;
  missing_count: number;
}

interface FrequentAbsentee {
  id: number;
  name: string;
  reg_no?: string;
  class_name?: string;
  absences: number;
}

interface PendingResultBatch {
  id: number;
  class_name?: string;
  term: string;
  session: string;
  status: string;
  entered_count: number;
  expected_count: number;
  missing_count: number;
}

interface TeacherActionCenterResponse {
  actions: TeacherActionItem[];
  attendance: {
    date: string;
    total_students: number;
    marked_today: number;
    present_today: number;
    absent_today: number;
    late_today: number;
    attendance_rate: number;
    classes_needing_attendance: AttendanceClassGap[];
    frequent_absentees: FrequentAbsentee[];
  };
  results: {
    total_batches: number;
    completed_batches: number;
    pending_batches_count: number;
    completion_percent: number;
    pending_batches: PendingResultBatch[];
  };
}

const emptyStudentPerformance: StudentPerformanceResponse = {
  summary: {
    tracked_students: 0,
    strong_count: 0,
    struggling_count: 0,
    class_average: 0,
  },
  top_performers: [],
  struggling_students: [],
};

const emptyActionCenter: TeacherActionCenterResponse = {
  actions: [],
  attendance: {
    date: "",
    total_students: 0,
    marked_today: 0,
    present_today: 0,
    absent_today: 0,
    late_today: 0,
    attendance_rate: 0,
    classes_needing_attendance: [],
    frequent_absentees: [],
  },
  results: {
    total_batches: 0,
    completed_batches: 0,
    pending_batches_count: 0,
    completion_percent: 0,
    pending_batches: [],
  },
};

export default function TeacherDashboard() {
  const navigate = useNavigate();

  // ===== Sidebar State =====
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ===== Academic Info =====
  const [academicSession, setAcademicSession] = useState("");
  const [currentTerm, setCurrentTerm] = useState("");

  // ===== Loading State =====
  const [loading, setLoading] = useState(true);
  const [aiCredits, setAiCredits] = useState<{
    remaining_credits: number;
    is_plus_active?: boolean;
    user_allocation?: {
      allocated_credits: number;
      used_credits: number;
      remaining_credits: number;
      is_unlimited: boolean;
    } | null;
  } | null>(null);

  // ===== Stats =====
  const [stats, setStats] = useState<StatCard[]>([
    { title: "My Students", value: 0, icon: "people" },
    { title: "My Classes", value: 0, icon: "building" },
    { title: "My Subjects", value: 0, icon: "book" },
    { title: "Results Completion", value: "0%", icon: "check-circle" },
  ]);

  // ===== Chart Refs =====
  const accessChartRef = useRef<HTMLCanvasElement | null>(null);
  const performanceChartRef = useRef<HTMLCanvasElement | null>(null);
  const accessChartInstance = useRef<Chart | null>(null);
  const performanceChartInstance = useRef<Chart | null>(null);

  // ===== Chart Data =====
  const [accessLabels, setAccessLabels] = useState<string[]>([]);
  const [accessData, setAccessData] = useState<number[]>([]);
  const [performanceLabels, setPerformanceLabels] = useState<string[]>([]);
  const [performanceData, setPerformanceData] = useState<number[]>([]);
  const [studentPerformance, setStudentPerformance] =
    useState<StudentPerformanceResponse>(emptyStudentPerformance);
  const [actionCenter, setActionCenter] = useState<TeacherActionCenterResponse>(emptyActionCenter);

  // ===== Fetch all dashboard data =====
  useEffect(() => {
    setLoading(true);

    const fetchSessionTerm = authApi.get("/current-session-term");
    const fetchCounts = authApi.get("/teacher/dashboard/counts");
    const fetchPerformance = authApi.get("/teacher/performance-stats");
    const fetchAccess = authApi.get("/teacher/access-stats");
    const fetchActionCenter = authApi.get("/teacher/action-center");
    const fetchStudentPerformance = authApi.get("/teacher/student-performance");
    authApi.get("/admin/ai/credits").then((r) => setAiCredits(r.data?.data || null)).catch(() => undefined);

    Promise.all([fetchSessionTerm, fetchCounts, fetchPerformance, fetchAccess, fetchActionCenter, fetchStudentPerformance])
      .then(([sessionRes, countsRes, perfRes, accessRes, actionRes, studentPerfRes]) => {
        //  Session & Term
        setAcademicSession(sessionRes.data.session);
        setCurrentTerm(sessionRes.data.term);

        //  Counts
        const counts = countsRes.data;
        setStats([
          { title: "My Students", value: counts.students, icon: "people" },
          { title: "My Classes", value: counts.classes, icon: "building" },
          { title: "My Subjects", value: counts.subjects, icon: "book" },
          { title: "Results Completion", value: counts.results_uploaded, icon: "check-circle" },
        ]);

        //  Performance stats
        const perfData = perfRes.data.data || [];
        setPerformanceLabels(perfData.map((d: any) => d.term));
        setPerformanceData(perfData.map((d: any) => Number(d.average || 0)));

        //  Access stats
        setAccessLabels(accessRes.data.labels || ["Mon", "Tue", "Wed", "Thu", "Fri"]);
        setAccessData(accessRes.data.data || [0, 0, 0, 0, 0]);

        setActionCenter({
          ...emptyActionCenter,
          ...(actionRes.data || {}),
          attendance: {
            ...emptyActionCenter.attendance,
            ...(actionRes.data?.attendance || {}),
          },
          results: {
            ...emptyActionCenter.results,
            ...(actionRes.data?.results || {}),
          },
        });

        setStudentPerformance({
          ...emptyStudentPerformance,
          ...(studentPerfRes.data || {}),
          summary: {
            ...emptyStudentPerformance.summary,
            ...(studentPerfRes.data?.summary || {}),
          },
        });
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // ===== Chart Logic =====
  useEffect(() => {
    const primaryColor =
      getComputedStyle(document.documentElement).getPropertyValue("--bs-secondary").trim() || "rgb(255,200,87)";

    const withAlpha = (color: string, alpha: number) => {
      if (color.startsWith("rgb")) return color.replace("rgb", "rgba").replace(")", `, ${alpha})`);
      return color + Math.round(alpha * 255).toString(16).padStart(2, "0");
    };

    const createGradient = (ctx: CanvasRenderingContext2D) => {
      const g = ctx.createLinearGradient(0, 0, 0, 320);
      g.addColorStop(0, withAlpha(primaryColor, 0.35));
      g.addColorStop(1, withAlpha(primaryColor, 0.05));
      return g;
    };

    // ===== Access Chart =====
    if (accessChartRef.current) {
      const ctx = accessChartRef.current.getContext("2d");
      if (!ctx) return;

      accessChartInstance.current?.destroy();

      accessChartInstance.current = new Chart(ctx, {
        type: "line",
        data: {
          labels: accessLabels,
          datasets: [
            {
              label: "Results Saved",
              data: accessData,
              borderColor: "rgb(255,200,87)",
              backgroundColor: createGradient(ctx),
              pointBackgroundColor: "rgb(255,200,87)",
              pointBorderColor: "#fff",
              pointBorderWidth: 2,
              pointRadius: 6,
              pointHoverRadius: 8,
              tension: 0.4,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              padding: 12,
              cornerRadius: 8,
              titleFont: { size: 13, weight: "bold" },
              bodyFont: { size: 12 },
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
            y: { grid: { color: "rgba(0, 0, 0, 0.05)" }, ticks: { stepSize: 5, font: { size: 11 } } },
          },
        },
      });
    }

    // ===== Performance Chart =====
    if (performanceChartRef.current) {
      const ctx = performanceChartRef.current.getContext("2d");
      if (!ctx) return;

      performanceChartInstance.current?.destroy();

      performanceChartInstance.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels: performanceLabels,
          datasets: [
            {
              label: "Average Score",
              data: performanceData,
              backgroundColor: "rgba(255,200,87,0.88)",
              borderRadius: 8,
              barThickness: 40,
              hoverBackgroundColor: "#ffe0a0",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              padding: 12,
              cornerRadius: 8,
              titleFont: { size: 13, weight: "bold" },
              bodyFont: { size: 12 },
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
            y: { beginAtZero: true, grid: { color: "rgba(0, 0, 0, 0.05)" }, ticks: { font: { size: 11 } } },
          },
        },
      });
    }

    return () => {
      accessChartInstance.current?.destroy();
      performanceChartInstance.current?.destroy();
    };
  }, [accessLabels, accessData, performanceLabels, performanceData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const scoreColor = (score: number) => {
    if (score >= 70) return "#16a34a";
    if (score >= 50) return "#f59e0b";
    return "#dc2626";
  };

  const insightTone = (level: string) => {
    if (level === "no_results") {
      return { bg: "#f8fafc", text: "#475569", border: "#e2e8f0", icon: "clipboard-data" };
    }

    if (level === "urgent") {
      return { bg: "#fef2f2", text: "#991b1b", border: "#fecaca", icon: "exclamation-triangle" };
    }

    if (level === "declining" || level === "at_risk") {
      return { bg: "#fff7ed", text: "#9a3412", border: "#fed7aa", icon: "lightbulb" };
    }

    return { bg: "#ecfdf5", text: "#166534", border: "#bbf7d0", icon: "stars" };
  };

  const priorityTone = (priority: string) => {
    if (priority === "high") return { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" };
    if (priority === "medium") return { bg: "#fff7ed", text: "#9a3412", border: "#fed7aa" };
    return { bg: "#ecfdf5", text: "#166534", border: "#bbf7d0" };
  };

  const ProgressBar = ({ value, color = "#2563eb" }: { value: number; color?: string }) => (
    <div className="rounded-pill overflow-hidden" style={{ height: 8, backgroundColor: "#e2e8f0" }}>
      <div
        className="h-100 rounded-pill"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }}
      />
    </div>
  );

  const MiniTrend = ({ points }: { points: StudentTrendPoint[] }) => {
    const usefulPoints = points.length ? points : [{ label: "No data", score: 0 }];

    return (
      <div className="d-flex align-items-end gap-1" style={{ height: 46 }}>
        {usefulPoints.map((point, index) => (
          <div
            key={`${point.label}-${index}`}
            title={`${point.label}: ${point.score}%`}
            className="rounded-top flex-fill"
            style={{
              minWidth: 10,
              height: `${Math.max(8, Math.min(100, point.score))}%`,
              backgroundColor: scoreColor(point.score),
              opacity: 0.78,
            }}
          />
        ))}
      </div>
    );
  };

  const StudentPerformanceCard = ({
    student,
    variant,
  }: {
    student: StudentPerformanceItem;
    variant: "support" | "strong";
  }) => {
    const tone = insightTone(student.insight?.level || "stable");
    const changeColor = student.change < 0 ? "#dc2626" : student.change > 0 ? "#16a34a" : "#64748b";
    const hasResults = student.status !== "no_results";

    return (
      <div className="border rounded-3 p-3 bg-white">
        <div className="d-flex justify-content-between gap-3">
          <div style={{ minWidth: 0 }}>
            <h6 className="fw-semibold mb-1 text-truncate" style={{ color: "#0f172a" }}>
              {student.name}
            </h6>
            <div className="d-flex flex-wrap gap-2 small text-muted">
              {student.class_name && <span>{student.class_name}</span>}
              {student.reg_no && <span>{student.reg_no}</span>}
            </div>
          </div>

          <div className="text-end flex-shrink-0">
            <span
              className="badge rounded-pill"
              style={{
                backgroundColor: hasResults ? `${scoreColor(student.average)}1a` : "#f1f5f9",
                color: hasResults ? scoreColor(student.average) : "#64748b",
              }}
            >
              {hasResults ? `${student.average}%` : "No result"}
            </span>
            {hasResults && (
              <div className="small fw-semibold mt-1" style={{ color: changeColor }}>
                {student.change > 0 ? "+" : ""}
                {student.change}%
              </div>
            )}
          </div>
        </div>

        <div className="mt-3">
          <MiniTrend points={student.trend} />
        </div>

        {variant === "support" && (
          <>
            {student.weak_subjects?.length > 0 && (
              <div className="d-flex flex-wrap gap-2 mt-3">
                {student.weak_subjects.map((subject) => (
                  <span
                    key={`${student.id}-${subject.subject}`}
                    className="badge rounded-pill fw-normal"
                    style={{ backgroundColor: "#f1f5f9", color: "#475569" }}
                  >
                    {subject.subject}: {subject.score}%
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3 p-3 rounded-3 border" style={{ backgroundColor: tone.bg, borderColor: tone.border }}>
              <div className="d-flex gap-2">
                <i className={`bi bi-${tone.icon} flex-shrink-0`} style={{ color: tone.text }} />
                <div>
                  <div className="fw-semibold small mb-1" style={{ color: tone.text }}>
                    {student.insight?.headline || "AI insight"}
                  </div>
                  <p className="small mb-0" style={{ color: "#475569", lineHeight: 1.55 }}>
                    {student.insight?.recommendation}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        .teacher-db-main {
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: 24px 28px 40px;
        }

        @media (max-width: 767.98px) {
          .teacher-db-main {
            padding: 16px 12px 32px !important;
          }
        }

        .teacher-db-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 18px;
          padding: 32px 36px;
          color: #FFFFFF;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
          position: relative;
          overflow: hidden;
        }

        @media (max-width: 767.98px) {
          .teacher-db-hero {
            padding: 20px 18px !important;
            border-radius: 14px !important;
            margin-bottom: 16px !important;
          }
        }

        .teacher-db-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }

        .teacher-db-hero-glow {
          position: absolute;
          top: -40px;
          right: -40px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.2) 0%, transparent 65%);
          pointer-events: none;
        }

        .teacher-db-hero-glow2 {
          position: absolute;
          bottom: -40px;
          left: 30%;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .teacher-db-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 24px;
        }

        .teacher-db-session-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
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

        .teacher-db-session-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 6px #10B981;
        }

        .teacher-db-greeting {
          font-size: 26px;
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.1;
          margin-bottom: 8px;
        }

        .teacher-db-greeting em {
          font-style: normal;
          color: #FBBF24;
        }

        .teacher-db-hero-sub {
          font-size: 13.5px;
          color: #CBD5E1;
          line-height: 1.6;
          max-width: 520px;
          margin-bottom: 20px;
        }

        @media (max-width: 767.98px) {
          .teacher-db-greeting {
            font-size: 20px !important;
          }
          .teacher-db-hero-sub {
            font-size: 12.5px !important;
            margin-bottom: 16px !important;
          }
        }

        .teacher-db-hero-card {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(8px);
          border-radius: 14px;
          padding: 18px 22px;
          min-width: 250px;
        }

        .teacher-db-btn-gold {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 700;
          color: #0F2744;
          background: #FBBF24;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(251, 191, 36, 0.3);
        }

        .teacher-db-btn-gold:hover {
          background: #F59E0B;
          transform: translateY(-1px);
        }

        .teacher-db-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 600;
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.10);
          border: 1px solid rgba(255, 255, 255, 0.20);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .teacher-db-btn-outline:hover {
          background: rgba(255, 255, 255, 0.18);
          color: #FFFFFF;
        }

        @media (max-width: 575.98px) {
          .teacher-db-btn-gold, .teacher-db-btn-outline {
            width: 100% !important;
            justify-content: center !important;
          }
        }

        /* ── Unified Stat Cards ── */
        .t-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        @media (max-width: 1199px) {
          .t-stats-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 575px) {
          .t-stats-grid { grid-template-columns: 1fr; }
        }

        .t-stat-card {
          background: #FFFFFF;
          border: 1px solid rgba(15, 39, 68, 0.08);
          border-radius: 16px;
          padding: 22px 20px;
          position: relative;
          overflow: hidden;
          transition: all 0.25s ease;
          box-shadow: 0 2px 10px rgba(15, 39, 68, 0.04);
        }

        .t-stat-card:hover {
          box-shadow: 0 8px 24px rgba(15, 39, 68, 0.08);
          transform: translateY(-3px);
        }

        .t-stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--stat-color, #D97706);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s ease;
        }

        .t-stat-card:hover::before {
          transform: scaleX(1);
        }

        .t-stat-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .t-stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: var(--stat-bg, #FEF3C7);
          color: var(--stat-color, #D97706);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .t-stat-label {
          font-size: 12px;
          font-weight: 600;
          color: #64748B;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .t-stat-val {
          font-size: 28px;
          font-weight: 800;
          color: #0F2744;
          line-height: 1;
        }

        .t-stat-footer {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid #F1F5F9;
          font-size: 12px;
          color: #64748B;
        }

        /* ── Unified Panels ── */
        .t-panel {
          background: #FFFFFF;
          border: 1px solid rgba(15, 39, 68, 0.08);
          border-radius: 18px;
          box-shadow: 0 4px 20px rgba(15, 39, 68, 0.06);
          overflow: hidden;
          margin-bottom: 24px;
        }

        .t-panel-head {
          padding: 20px 24px;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .t-panel-title {
          font-size: 16px;
          font-weight: 800;
          color: #0F2744;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .t-panel-body {
          padding: 24px;
        }

        /* ── Quick Actions Grid ── */
        .t-qa-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        @media (max-width: 991px) {
          .t-qa-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 575px) {
          .t-qa-grid { grid-template-columns: 1fr; }
        }

        .t-qa-card {
          background: #FFFFFF;
          border: 1px solid rgba(15, 39, 68, 0.08);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 2px 8px rgba(15, 39, 68, 0.04);
          text-decoration: none;
          color: inherit;
        }

        .t-qa-card:hover {
          box-shadow: 0 8px 24px rgba(15, 39, 68, 0.08);
          transform: translateY(-3px);
          border-color: rgba(217, 119, 6, 0.3);
        }

        .t-qa-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: var(--qa-bg, #FEF3C7);
          color: var(--qa-color, #D97706);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
          transition: transform 0.3s ease;
        }

        .t-qa-card:hover .t-qa-icon {
          transform: scale(1.1) rotate(-4deg);
        }

        .t-qa-title {
          font-size: 14px;
          font-weight: 800;
          color: #0F2744;
          margin-bottom: 2px;
        }

        .t-qa-desc {
          font-size: 12px;
          color: #64748B;
          margin: 0;
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Teacher Dashboard" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto gq-app-main teacher-db-main d-flex flex-column min-vh-100">
            {loading && <Loader message="Loading dashboard..." />}

            {/* ── Signature GradiosEdu Hero ── */}
            <div className="teacher-db-hero">
              <div className="teacher-db-hero-glow" />
              <div className="teacher-db-hero-glow2" />

              <div className="teacher-db-hero-inner">
                <div>
                  <div className="teacher-db-session-badge">
                    <span className="teacher-db-session-dot" />
                    {academicSession || "Academic Session"} · {currentTerm || "Active Term"}
                  </div>

                  <h1 className="teacher-db-greeting">
                    {getGreeting()}, <em>Teacher.</em>
                  </h1>

                  <p className="teacher-db-hero-sub">
                    Welcome to your teaching workspace. Manage class attendance, upload term examination results, generate AI lesson plans, and track student performance.
                  </p>

                  <div className="d-flex gap-2 flex-wrap">
                    <button
                      className="teacher-db-btn-gold"
                      onClick={() => navigate("/results/upload")}
                    >
                      <i className="bi bi-file-earmark-arrow-up-fill me-1" />
                      Upload Results
                    </button>

                    <button
                      className="teacher-db-btn-outline"
                      onClick={() => navigate("/students/attendance")}
                    >
                      <i className="bi bi-calendar2-check-fill me-1" />
                      Take Attendance
                    </button>

                    <button
                      className="teacher-db-btn-outline"
                      onClick={() => navigate("/settings/ai-lesson-plans")}
                    >
                      <i className="bi bi-journal-richtext me-1" />
                      AI Lesson Planner
                    </button>

                    <button
                      className="teacher-db-btn-outline"
                      onClick={() => navigate("/settings/ai-credits")}
                    >
                      <i className="bi bi-stars me-1 text-warning" />
                      AI Credits
                    </button>
                  </div>
                </div>

                {/* Hero Quick Glance */}
                <div className="teacher-db-hero-card d-none d-md-block">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#FBBF24" }}>
                      Quick Glance
                    </span>
                    <i className="bi bi-mortarboard-fill text-warning" />
                  </div>

                  <div className="d-flex flex-column gap-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <span style={{ fontSize: "12.5px", color: "#CBD5E1" }}>My Students</span>
                      <span style={{ fontSize: "15px", fontWeight: 800, color: "#FFFFFF" }}>{stats[0]?.value ?? 0}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span style={{ fontSize: "12.5px", color: "#CBD5E1" }}>Result Completion</span>
                      <span style={{ fontSize: "15px", fontWeight: 800, color: "#10B981" }}>{stats[3]?.value ?? "0%"}</span>
                    </div>

                    <div
                      className="d-flex justify-content-between align-items-center pt-2 mt-1 border-top"
                      style={{ borderColor: "rgba(255, 255, 255, 0.15)", cursor: "pointer" }}
                      onClick={() => navigate("/settings/ai-credits")}
                      title="Click to view AI credit details"
                    >
                      <span style={{ fontSize: "12px", color: "#CBD5E1" }}>
                        <i className="bi bi-stars me-1 text-warning" /> AI Allowance
                      </span>
                      <span className="badge bg-warning text-dark fw-bold" style={{ fontSize: "11px" }}>
                        {aiCredits?.is_plus_active
                          ? (aiCredits.user_allocation?.is_unlimited ? "Unlimited" : `${aiCredits.user_allocation?.remaining_credits ?? aiCredits.remaining_credits ?? 0} credits`)
                          : "Plus Active"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 4 Unified Stat Cards ── */}
            <div className="t-stats-grid">
              {[
                { title: "My Students", value: stats[0]?.value ?? 0, icon: "people-fill", color: "#D97706", bg: "#FEF3C7", footer: "Enrolled in assigned classes" },
                { title: "Assigned Subjects", value: stats[1]?.value ?? 0, icon: "book-fill", color: "#2563EB", bg: "#DBEAFE", footer: "Curriculum allocations" },
                { title: "Assigned Classes", value: stats[2]?.value ?? 0, icon: "building", color: "#7C3AED", bg: "#EDE9FE", footer: "Active teaching arms" },
                { title: "Result Batches", value: stats[3]?.value ?? "0%", icon: "award-fill", color: "#10B981", bg: "#D1FAE5", footer: "Entered and verified" },
              ].map((c) => (
                <div key={c.title} className="t-stat-card" style={{ ["--stat-color" as any]: c.color, ["--stat-bg" as any]: c.bg }}>
                  <div className="t-stat-head">
                    <div>
                      <div className="t-stat-label">{c.title}</div>
                      <div className="t-stat-val">{c.value}</div>
                    </div>
                    <div className="t-stat-icon">
                      <i className={`bi bi-${c.icon}`} />
                    </div>
                  </div>
                  <div className="t-stat-footer">
                    <i className="bi bi-info-circle text-muted" />
                    <span>{c.footer}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Quick Actions Grid ── */}
            <div className="t-qa-grid">
              {[
                { title: "Take Attendance", desc: "Mark daily classroom register", icon: "clipboard-check-fill", color: "#2563EB", bg: "#DBEAFE", route: "/students/attendance" },
                { title: "Upload Results", desc: "Score entries & assessments", icon: "cloud-arrow-up-fill", color: "#D97706", bg: "#FEF3C7", route: "/results/upload" },
                { title: "AI Lesson Planner", desc: "Generate term weekly lesson plans", icon: "journal-richtext", color: "#7C3AED", bg: "#EDE9FE", route: "/settings/ai-lesson-plans" },
                { title: "Broadsheets & Reports", desc: "Class broadsheets & report cards", icon: "file-earmark-bar-graph-fill", color: "#10B981", bg: "#D1FAE5", route: "/reports" },
              ].map((qa) => (
                <div
                  key={qa.title}
                  className="t-qa-card"
                  style={{ ["--qa-color" as any]: qa.color, ["--qa-bg" as any]: qa.bg }}
                  onClick={() => navigate(qa.route)}
                >
                  <div className="t-qa-icon">
                    <i className={`bi bi-${qa.icon}`} />
                  </div>
                  <div>
                    <div className="t-qa-title">{qa.title}</div>
                    <div className="t-qa-desc">{qa.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Action Center & Attendance Insight ── */}
            <div className="row g-4 mb-4">
              <div className="col-xl-5">
                <div className="t-panel h-100 mb-0">
                  <div className="t-panel-head">
                    <h2 className="t-panel-title">
                      <i className="bi bi-lightning-charge-fill text-warning" />
                      Priority Action Center
                    </h2>
                    <span className="badge bg-warning-subtle text-warning fw-bold px-2 py-1" style={{ borderRadius: 8 }}>
                      {actionCenter.actions.length} Tasks
                    </span>
                  </div>

                  <div className="t-panel-body">
                    <div className="d-flex flex-column gap-3">
                      {actionCenter.actions.map((action, index) => {
                        const tone = priorityTone(action.priority);

                        return (
                          <button
                            key={`${action.label}-${index}`}
                            type="button"
                            className="border rounded-3 p-3 text-start bg-white w-100 transition-all"
                            style={{ borderColor: tone.border, cursor: "pointer", transition: "all 0.2s ease" }}
                            onClick={() => navigate(action.route)}
                          >
                            <div className="d-flex gap-3">
                              <div
                                className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                                style={{ width: 42, height: 42, backgroundColor: tone.bg }}
                              >
                                <i className={`bi bi-${action.icon}`} style={{ color: tone.text }} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div className="d-flex align-items-center gap-2 mb-1">
                                  <h6 className="mb-0 fw-bold text-truncate" style={{ color: "#0F2744", fontSize: "14px" }}>
                                    {action.label}
                                  </h6>
                                  <span
                                    className="badge rounded-pill text-capitalize"
                                    style={{ backgroundColor: tone.bg, color: tone.text, fontSize: "10.5px" }}
                                  >
                                    {action.priority}
                                  </span>
                                </div>
                                <p className="small mb-0" style={{ color: "#64748B", lineHeight: 1.5 }}>
                                  {action.description}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-xl-7">
                <div className="row g-4 h-100">
                  <div className="col-md-6">
                    <div className="t-panel h-100 mb-0">
                      <div className="t-panel-head">
                        <div>
                          <h2 className="t-panel-title" style={{ fontSize: "15px" }}>
                            <i className="bi bi-calendar-check-fill text-success" />
                            Attendance Insight
                          </h2>
                          <small className="text-muted">{actionCenter.attendance.date || "Today"}</small>
                        </div>
                        <span className="badge bg-success-subtle text-success fw-bold px-2 py-1" style={{ borderRadius: 8 }}>
                          {actionCenter.attendance.attendance_rate}%
                        </span>
                      </div>

                      <div className="t-panel-body">
                        <ProgressBar value={actionCenter.attendance.attendance_rate} color="#16a34a" />

                        <div className="row g-2 mt-3">
                          {[
                            { label: "Marked", value: actionCenter.attendance.marked_today, color: "#2563EB" },
                            { label: "Present", value: actionCenter.attendance.present_today, color: "#16A34A" },
                            { label: "Absent", value: actionCenter.attendance.absent_today, color: "#DC2626" },
                            { label: "Late", value: actionCenter.attendance.late_today, color: "#F59E0B" },
                          ].map((item) => (
                            <div className="col-6" key={item.label}>
                              <div className="rounded-3 p-2 text-center" style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                                <div className="small text-muted" style={{ fontSize: "11px", fontWeight: 600 }}>{item.label}</div>
                                <div className="fw-bold" style={{ color: item.color, fontSize: "16px" }}>
                                  {item.value}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {actionCenter.attendance.classes_needing_attendance.length > 0 && (
                          <div className="mt-3">
                            <div className="small fw-bold mb-2" style={{ color: "#0F2744" }}>
                              Arms needing attendance:
                            </div>
                            <div className="d-flex flex-column gap-2">
                              {actionCenter.attendance.classes_needing_attendance.slice(0, 3).map((item) => (
                                <div className="d-flex justify-content-between small p-2 rounded-2" style={{ background: "#FEF2F2", border: "1px solid #FEE2E2" }} key={item.class_id}>
                                  <span className="text-truncate fw-semibold" style={{ color: "#991B1B" }}>{item.class_name}</span>
                                  <span className="text-danger fw-bold">{item.missing_count} unmarked</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="t-panel h-100 mb-0">
                      <div className="t-panel-head">
                        <div>
                          <h2 className="t-panel-title" style={{ fontSize: "15px" }}>
                            <i className="bi bi-file-earmark-check-fill text-primary" />
                            Result Progress
                          </h2>
                          <small className="text-muted">
                            {actionCenter.results.completed_batches}/{actionCenter.results.total_batches} completed
                          </small>
                        </div>
                        <span className="badge bg-primary-subtle text-primary fw-bold px-2 py-1" style={{ borderRadius: 8 }}>
                          {actionCenter.results.completion_percent}%
                        </span>
                      </div>

                      <div className="t-panel-body">
                        <ProgressBar value={actionCenter.results.completion_percent} color="#2563EB" />

                        <div className="mt-3">
                          <div className="d-flex justify-content-between small mb-2">
                            <span className="text-muted fw-semibold">Pending Result Batches</span>
                            <span className="fw-bold" style={{ color: "#0F2744" }}>
                              {actionCenter.results.pending_batches_count}
                            </span>
                          </div>

                          <div className="d-flex flex-column gap-2">
                            {actionCenter.results.pending_batches.length > 0 ? (
                              actionCenter.results.pending_batches.slice(0, 3).map((batch) => (
                                <div
                                  key={batch.id}
                                  className="rounded-3 p-2"
                                  style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}
                                >
                                  <div className="d-flex justify-content-between gap-2 small">
                                    <span className="fw-bold text-truncate" style={{ color: "#0F2744" }}>
                                      {batch.class_name} - {batch.term}
                                    </span>
                                    <span className="text-muted">{batch.session}</span>
                                  </div>
                                  <div className="small text-muted mt-1">
                                    {batch.entered_count}/{batch.expected_count} scores entered
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="small text-muted p-3 text-center rounded-3" style={{ background: "#F8FAFC" }}>
                                All current result batches are up to date!
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Charts Row ── */}
            <div className="row g-4 mb-4">
              <div className="col-lg-8">
                <div className="t-panel h-100 mb-0">
                  <div className="t-panel-head">
                    <h2 className="t-panel-title">
                      <i className="bi bi-activity text-primary" />
                      Results Activity & Score Log
                    </h2>
                    <small className="text-muted">Recent assessment distribution</small>
                  </div>
                  <div className="t-panel-body">
                    <div style={{ height: 300 }}>
                      <canvas ref={accessChartRef} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-4">
                <div className="t-panel h-100 mb-0">
                  <div className="t-panel-head">
                    <h2 className="t-panel-title">
                      <i className="bi bi-bar-chart-fill text-success" />
                      Term Performance Trend
                    </h2>
                    <small className="text-muted">Average score by term</small>
                  </div>
                  <div className="t-panel-body">
                    <div style={{ height: 300 }}>
                      <canvas ref={performanceChartRef} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Student Performance Watch ── */}
            <div className="t-panel mb-4">
              <div className="t-panel-head">
                <div className="d-flex align-items-center gap-2">
                  <h2 className="t-panel-title">
                    <i className="bi bi-person-lines-fill text-warning" />
                    Student Academic Performance Watch
                  </h2>
                </div>

                <div className="d-flex flex-wrap gap-2">
                  {[
                    { label: "Tracked", value: studentPerformance.summary.tracked_students, color: "#2563EB" },
                    { label: "High Honors", value: studentPerformance.summary.strong_count, color: "#16A34A" },
                    { label: "Needs Support", value: studentPerformance.summary.struggling_count, color: "#DC2626" },
                    { label: "Class Avg", value: `${studentPerformance.summary.class_average}%`, color: "#7C3AED" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="px-3 py-1 rounded-3"
                      style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}
                    >
                      <span className="small text-muted me-2" style={{ fontSize: "11px", fontWeight: 600 }}>{item.label}:</span>
                      <span className="fw-bold" style={{ color: item.color, fontSize: "13px" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="t-panel-body">
                <div className="row g-4">
                  <div className="col-lg-6">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <h6 className="mb-0 fw-bold" style={{ color: "#991B1B", fontSize: "14px" }}>
                        <i className="bi bi-exclamation-triangle-fill me-1" />
                        Students Needing Support
                      </h6>
                      <span className="badge bg-danger-subtle text-danger fw-bold">
                        {studentPerformance.struggling_students.length}
                      </span>
                    </div>

                    <div className="d-flex flex-column gap-3">
                      {studentPerformance.struggling_students.length > 0 ? (
                        studentPerformance.struggling_students.map((student) => (
                          <StudentPerformanceCard key={student.id} student={student} variant="support" />
                        ))
                      ) : (
                        <div className="border rounded-3 p-4 text-center bg-white">
                          <i className="bi bi-check2-circle fs-3 text-success d-block mb-2" />
                          <p className="mb-0 text-muted">No struggling students identified from available records.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-lg-6">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <h6 className="mb-0 fw-bold" style={{ color: "#166534", fontSize: "14px" }}>
                        <i className="bi bi-trophy-fill me-1" />
                        Top Performing Students
                      </h6>
                      <span className="badge bg-success-subtle text-success fw-bold">
                        {studentPerformance.top_performers.length}
                      </span>
                    </div>

                    <div className="d-flex flex-column gap-3">
                      {studentPerformance.top_performers.length > 0 ? (
                        studentPerformance.top_performers.map((student) => (
                          <StudentPerformanceCard key={student.id} student={student} variant="strong" />
                        ))
                      ) : (
                        <div className="border rounded-3 p-4 text-center bg-white">
                          <i className="bi bi-bar-chart fs-3 text-primary d-block mb-2" />
                          <p className="mb-0 text-muted">Performance analysis will appear once scores are uploaded.</p>
                        </div>
                      )}
                    </div>
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
