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
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .teacher-db-main{
          background:
            linear-gradient(180deg, rgba(211,0,176,0.035), transparent 260px),
            var(--bs-light,#fcf8f8);
          min-height:100vh;
          font-family:'DM Sans',system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
          overflow-x:hidden;
        }
        .teacher-db-hero{
          background:var(--bs-dark,#050008)!important;
          border-radius:14px!important;
          padding:32px 36px!important;
          position:relative;
          overflow:hidden;
          margin-bottom:28px;
          box-shadow:none!important;
        }
        .teacher-db-hero::before{
          content:'';
          position:absolute;
          inset:0;
          background-image:radial-gradient(circle,rgba(255,255,255,0.045) 1px,transparent 1px);
          background-size:24px 24px;
          pointer-events:none;
        }
        .teacher-db-hero-glow{
          position:absolute;
          top:-60px;
          right:-60px;
          width:320px;
          height:320px;
          border-radius:50%;
          background:radial-gradient(circle,rgba(255,200,87,0.10) 0%,transparent 65%);
          pointer-events:none;
        }
        .teacher-db-hero-glow2{
          position:absolute;
          bottom:-40px;
          left:30%;
          width:220px;
          height:220px;
          border-radius:50%;
          background:radial-gradient(circle,rgba(211,0,176,0.06) 0%,transparent 70%);
          pointer-events:none;
        }
        .teacher-db-hero-inner{
          position:relative;
          z-index:1;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:32px;
          flex-wrap:wrap;
        }
        .teacher-db-session-badge{
          display:inline-flex;
          align-items:center;
          gap:7px;
          font-size:11px;
          font-weight:600;
          letter-spacing:.12em;
          text-transform:uppercase;
          color:rgb(255,200,87);
          background:rgba(255,200,87,0.10);
          border:1px solid rgba(255,200,87,0.22);
          border-radius:999px;
          padding:4px 12px;
          margin-bottom:14px;
        }
        .teacher-db-status-badge{
          color:#d1fae5;
          background:rgba(34,197,94,0.10);
          border-color:rgba(34,197,94,0.22);
        }
        .teacher-db-dot{
          width:6px;
          height:6px;
          border-radius:50%;
          background:rgb(34,197,94);
          animation:teacherDbPulse 2s ease infinite;
        }
        @keyframes teacherDbPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}
        .teacher-db-greeting{
          font-family:'Playfair Display',Georgia,serif;
          font-size:clamp(24px,2.6vw,34px);
          font-weight:900;
          color:#fff;
          line-height:1.1;
          margin:0 0 8px;
        }
        .teacher-db-greeting em{font-style:italic;color:rgb(255,200,87)}
        .teacher-db-hero h2,
        .teacher-db-hero .teacher-db-greeting{
          font-family:'Playfair Display',Georgia,serif!important;
          font-size:clamp(24px,2.6vw,34px)!important;
          font-weight:900!important;
          color:#fff!important;
          line-height:1.1!important;
          margin:0 0 8px!important;
        }
        .teacher-db-hero h2::after{
          content:'';
        }
        .teacher-db-hero p{
          color:rgba(255,255,255,0.42)!important;
          font-size:13.5px!important;
          font-weight:300!important;
          line-height:1.65!important;
          max-width:500px;
        }
        .teacher-db-hero-sub{
          font-size:13.5px;
          font-weight:300;
          color:rgba(255,255,255,0.42);
          line-height:1.65;
          max-width:500px;
          margin-bottom:24px;
        }
        .teacher-db-btn-gold,.teacher-db-btn-outline{
          display:inline-flex;
          align-items:center;
          gap:7px;
          padding:10px 20px;
          font-size:13px;
          font-weight:600;
          border-radius:10px;
          cursor:pointer;
          transition:background .2s,transform .2s,border-color .2s,color .2s;
          white-space:nowrap;
        }
        .teacher-db-btn-gold{
          color:#050008!important;
          background:rgb(255,200,87)!important;
          border:0!important;
          box-shadow:none!important;
        }
        .teacher-db-btn-gold:hover{background:#ffe0a0;transform:translateY(-1px)}
        .teacher-db-btn-outline{
          color:rgba(255,255,255,0.74)!important;
          background:transparent!important;
          border:1px solid rgba(255,255,255,0.14)!important;
        }
        .teacher-db-btn-outline:hover{background:rgba(255,255,255,0.06);color:#fff;border-color:rgba(255,255,255,0.28)}
        .teacher-db-hero-card{
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.09);
          backdrop-filter:blur(8px);
          border-radius:14px;
          padding:20px 24px;
          min-width:230px;
        }
        .teacher-db-hero-label{
          font-size:11px;
          font-weight:600;
          letter-spacing:.14em;
          text-transform:uppercase;
          color:rgb(255,200,87);
        }
        .teacher-db-hero-stat{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
        }
        .teacher-db-hero-stat span:first-child{font-size:12px;font-weight:300;color:rgba(255,255,255,0.34)}
        .teacher-db-hero-stat span:last-child{font-family:'Playfair Display',Georgia,serif;font-size:18px;font-weight:700;color:rgb(255,200,87)}
        .teacher-db-sep{height:1px;background:rgba(255,255,255,0.06);margin:12px 0}
        .teacher-db-main .card{
          background:#fff!important;
          border:1px solid var(--bs-border-color,#ede8e0)!important;
          border-radius:14px!important;
          box-shadow:none!important;
        }
        .teacher-db-main .card:hover{
          box-shadow:0 8px 28px rgba(0,0,0,0.07)!important;
        }
        .teacher-db-main h6,
        .teacher-db-main .fw-semibold{
          color:#050008!important;
        }
        .teacher-db-main .text-muted,
        .teacher-db-main small{
          color:#9a8a7a!important;
        }
        .teacher-db-main h3{
          font-family:'Playfair Display',Georgia,serif;
          font-weight:700!important;
          color:#050008!important;
        }
        .teacher-db-main .badge.text-bg-light{
          background:rgba(255,200,87,0.10)!important;
          color:#7a4b00!important;
          border:1px solid rgba(255,200,87,0.20);
        }
        .teacher-db-main .card .card-body.text-white{
          color:#050008!important;
        }
        .teacher-db-main .card .card-body.text-white > i{
          width:46px;
          height:46px;
          border-radius:12px;
          display:flex!important;
          align-items:center;
          justify-content:center;
          background:rgba(255,200,87,0.12);
          color:#b45309;
          margin-bottom:12px!important;
          font-size:1.25rem!important;
        }
        .teacher-db-main .card .card-body.text-white small{
          opacity:1!important;
          color:#9a8a7a!important;
        }
        .teacher-db-action-card{
          background:#fff!important;
          border:1px solid var(--bs-border-color,#ede8e0)!important;
          border-radius:14px!important;
          padding:22px 18px;
          cursor:pointer;
          transition:box-shadow .25s,transform .25s,border-color .25s;
          min-height:132px;
        }
        .teacher-db-action-card:hover{
          box-shadow:0 8px 24px rgba(0,0,0,0.08)!important;
          transform:translateY(-4px)!important;
          border-color:rgba(255,200,87,0.28)!important;
        }
        .teacher-db-action-icon{
          width:46px;
          height:46px;
          border-radius:12px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:var(--action-bg);
          color:var(--action-color);
          margin-bottom:12px;
        }
        .teacher-db-action-title{font-size:13.5px;font-weight:700;color:#050008;margin-bottom:4px}
        .teacher-db-action-copy{font-size:11.5px;font-weight:300;color:#9a8a7a}
        @media(max-width:767.98px){
          .teacher-db-main{padding-left:16px!important;padding-right:16px!important}
          .teacher-db-hero{padding:26px 22px}
        }
      `}</style>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
<PageTitle title="Teacher Dashboard" />
      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main
            className="col-md-9 col-lg-10 ms-auto teacher-db-main d-flex flex-column"
          >
            {loading && <Loader message="Loading dashboard..." />}

            {/* Hero Section */}
            <div
              className="teacher-db-hero"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: "16px",
                boxShadow: "0 10px 30px rgba(102, 126, 234, 0.3)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-50px",
                  right: "-50px",
                  width: "200px",
                  height: "200px",
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "50%",
                  filter: "blur(40px)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "-30px",
                  left: "-30px",
                  width: "150px",
                  height: "150px",
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "50%",
                  filter: "blur(40px)",
                }}
              />

              <div className="teacher-db-hero-inner">
                <div className="col-md-8">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span
                      className="teacher-db-session-badge"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        color: "#fff",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                      }}
                    >
                      <i className="bi bi-calendar-check me-1"></i>
                      {academicSession || "Loading..."} - {currentTerm || "..."}
                    </span>

                    <span
                      className="teacher-db-session-badge teacher-db-status-badge"
                      style={{
                        backgroundColor: "rgba(16, 185, 129, 0.9)",
                        color: "#fff",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                      }}
                    >
                      <i className="bi bi-check-circle-fill me-1"></i>
                      Teacher Dashboard
                    </span>
                  </div>

                  <h2 className="fw-bold text-white mb-2">{getGreeting()}, Teacher! </h2>

                  <p className="text-white mb-4" style={{ opacity: 0.9, fontSize: "1rem" }}>
                    Here's your teaching overview - classes, subjects, students and results activity.
                  </p>

                  <div className="d-flex gap-2 flex-wrap">
                    <button
                      className="teacher-db-btn-gold"
                      style={{
                        borderRadius: "10px",
                        fontWeight: "500",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                      }}
                      onClick={() => navigate("/results/upload")}
                    >
                      <i className="bi bi-file-earmark-text"></i>
                      Upload Results
                    </button>

                    <button
                      className="teacher-db-btn-outline"
                      style={{
                        borderRadius: "10px",
                        fontWeight: "500",
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        color: "#fff",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                      }}
                      onClick={() => navigate("/students/attendance")}
                    >
                      <i className="bi bi-clipboard-check"></i>
                      Take Attendance
                    </button>
                    <button
                      className="teacher-db-btn-outline"
                      style={{
                        borderRadius: "10px",
                        fontWeight: "500",
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        color: "#fff",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                      }}
                      onClick={() => navigate("/settings/ai-lesson-plans")}
                    >
                      <i className="bi bi-journal-text"></i>
                      AI Lesson Planner
                    </button>
                  </div>
                </div>

                <div className="col-md-4 d-none d-md-block text-end">
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(10px)",
                      borderRadius: "16px",
                      padding: "1.5rem",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <span className="text-white" style={{ fontSize: "0.9rem", opacity: 0.9 }}>
                        Quick Stats
                      </span>
                      <i className="bi bi-graph-up text-white"></i>
                    </div>
                    <div className="d-flex flex-column gap-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-white" style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                          My Students
                        </span>
                        <span className="text-white fw-bold">{stats[0].value}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-white" style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                          Completion
                        </span>
                        <span className="text-white fw-bold">{stats[3].value}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="row g-3 mb-4">
              {stats.map(({ title, value, icon }, index) => {
                const colors = [
                  { gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", icon: "#667eea", bg: "#f0edff" },
                  { gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", icon: "#f5576c", bg: "#fff0f3" },
                  { gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", icon: "#00f2fe", bg: "#e6f9ff" },
                  { gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", icon: "#38f9d7", bg: "#e6fff9" },
                ];

                return (
                  <div className="col-md-6 col-lg-3" key={title}>
                    <div
                      className="card border-0 h-100 position-relative overflow-hidden"
                      style={{
                        borderRadius: "12px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                        transition: "transform 0.2s, box-shadow 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.12)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08)";
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: "4px",
                          background: colors[index].gradient,
                        }}
                      />

                      <div className="card-body p-4">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div className="p-2 rounded-3" style={{ backgroundColor: colors[index].bg }}>
                            <i className={`bi bi-${icon} fs-4`} style={{ color: colors[index].icon }} />
                          </div>
                          <i className="bi bi-three-dots-vertical text-muted" style={{ cursor: "pointer" }} />
                        </div>

                        <p className="text-muted mb-1 small">{title}</p>
                        <h3 className="fw-bold mb-0" style={{ color: "#1e293b" }}>
                          {value}
                        </h3>

                        <div className="mt-3 pt-3" style={{ borderTop: "1px solid #f1f5f9" }}>
                          <small className="text-muted d-flex align-items-center gap-1">
                            <i className="bi bi-info-circle"></i>
                            Based on your allocations
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Teacher Action Center */}
            <div className="row g-4 mb-4">
              <div className="col-xl-5">
                <div className="card shadow-sm border-0 h-100" style={{ borderRadius: "12px" }}>
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <div className="p-2 rounded-2" style={{ backgroundColor: "#e0f2fe" }}>
                          <i className="bi bi-lightning-charge-fill" style={{ color: "#0284c7" }} />
                        </div>
                        <div>
                          <h6 className="mb-0 fw-semibold" style={{ color: "#1e293b" }}>
                            Action Center
                          </h6>
                          <small className="text-muted">Today&apos;s teaching priorities</small>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex flex-column gap-3">
                      {actionCenter.actions.map((action, index) => {
                        const tone = priorityTone(action.priority);

                        return (
                          <button
                            key={`${action.label}-${index}`}
                            type="button"
                            className="border rounded-3 p-3 text-start bg-white w-100"
                            style={{ borderColor: tone.border, cursor: "pointer" }}
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
                                  <h6 className="mb-0 fw-semibold text-truncate" style={{ color: "#0f172a" }}>
                                    {action.label}
                                  </h6>
                                  <span
                                    className="badge rounded-pill text-capitalize"
                                    style={{ backgroundColor: tone.bg, color: tone.text }}
                                  >
                                    {action.priority}
                                  </span>
                                </div>
                                <p className="small mb-0" style={{ color: "#64748b", lineHeight: 1.5 }}>
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
                    <div className="card shadow-sm border-0 h-100" style={{ borderRadius: "12px" }}>
                      <div className="card-body p-4">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div>
                            <h6 className="fw-semibold mb-1" style={{ color: "#1e293b" }}>
                              Attendance Insight
                            </h6>
                            <small className="text-muted">{actionCenter.attendance.date || "Today"}</small>
                          </div>
                          <span className="badge rounded-pill text-bg-light">
                            {actionCenter.attendance.attendance_rate}%
                          </span>
                        </div>

                        <ProgressBar value={actionCenter.attendance.attendance_rate} color="#16a34a" />

                        <div className="row g-2 mt-3">
                          {[
                            { label: "Marked", value: actionCenter.attendance.marked_today, color: "#2563eb" },
                            { label: "Present", value: actionCenter.attendance.present_today, color: "#16a34a" },
                            { label: "Absent", value: actionCenter.attendance.absent_today, color: "#dc2626" },
                            { label: "Late", value: actionCenter.attendance.late_today, color: "#f59e0b" },
                          ].map((item) => (
                            <div className="col-6" key={item.label}>
                              <div className="rounded-3 p-2" style={{ backgroundColor: "#f8fafc" }}>
                                <div className="small text-muted">{item.label}</div>
                                <div className="fw-bold" style={{ color: item.color }}>
                                  {item.value}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {actionCenter.attendance.classes_needing_attendance.length > 0 && (
                          <div className="mt-3">
                            <div className="small fw-semibold mb-2" style={{ color: "#475569" }}>
                              Not fully marked
                            </div>
                            <div className="d-flex flex-column gap-2">
                              {actionCenter.attendance.classes_needing_attendance.slice(0, 3).map((item) => (
                                <div className="d-flex justify-content-between small" key={item.class_id}>
                                  <span className="text-truncate">{item.class_name}</span>
                                  <span className="text-danger fw-semibold">{item.missing_count} left</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="card shadow-sm border-0 h-100" style={{ borderRadius: "12px" }}>
                      <div className="card-body p-4">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div>
                            <h6 className="fw-semibold mb-1" style={{ color: "#1e293b" }}>
                              Result Progress
                            </h6>
                            <small className="text-muted">
                              {actionCenter.results.completed_batches}/{actionCenter.results.total_batches} completed
                            </small>
                          </div>
                          <span className="badge rounded-pill text-bg-light">
                            {actionCenter.results.completion_percent}%
                          </span>
                        </div>

                        <ProgressBar value={actionCenter.results.completion_percent} color="#7c3aed" />

                        <div className="mt-3">
                          <div className="d-flex justify-content-between small mb-2">
                            <span className="text-muted">Pending batches</span>
                            <span className="fw-semibold" style={{ color: "#0f172a" }}>
                              {actionCenter.results.pending_batches_count}
                            </span>
                          </div>

                          <div className="d-flex flex-column gap-2">
                            {actionCenter.results.pending_batches.length > 0 ? (
                              actionCenter.results.pending_batches.slice(0, 3).map((batch) => (
                                <div
                                  key={batch.id}
                                  className="rounded-3 p-2"
                                  style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}
                                >
                                  <div className="d-flex justify-content-between gap-2 small">
                                    <span className="fw-semibold text-truncate" style={{ color: "#334155" }}>
                                      {batch.class_name} - {batch.term}
                                    </span>
                                    <span className="text-muted">{batch.session}</span>
                                  </div>
                                  <div className="small text-muted">
                                    {batch.entered_count}/{batch.expected_count} students entered
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="small text-muted">No pending result batch found.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {actionCenter.attendance.frequent_absentees.length > 0 && (
                    <div className="col-12">
                      <div className="card shadow-sm border-0" style={{ borderRadius: "12px" }}>
                        <div className="card-body p-4">
                          <div className="d-flex align-items-center justify-content-between mb-3">
                            <h6 className="fw-semibold mb-0" style={{ color: "#1e293b" }}>
                              Attendance Follow-Up
                            </h6>
                            <small className="text-muted">Last 30 days</small>
                          </div>

                          <div className="row g-2">
                            {actionCenter.attendance.frequent_absentees.slice(0, 4).map((student) => (
                              <div className="col-sm-6" key={student.id}>
                                <div className="rounded-3 p-3" style={{ backgroundColor: "#fff7ed" }}>
                                  <div className="d-flex justify-content-between gap-2">
                                    <div style={{ minWidth: 0 }}>
                                      <div className="fw-semibold text-truncate" style={{ color: "#9a3412" }}>
                                        {student.name}
                                      </div>
                                      <div className="small text-muted text-truncate">
                                        {student.class_name} {student.reg_no ? `- ${student.reg_no}` : ""}
                                      </div>
                                    </div>
                                    <span className="badge rounded-pill" style={{ backgroundColor: "#fed7aa", color: "#9a3412" }}>
                                      {student.absences}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="row g-4 mb-4">
              <div className="col-lg-8">
                <div className="card shadow-sm border-0 h-100" style={{ borderRadius: "12px" }}>
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <div className="d-flex align-items-center gap-2">
                        <div className="p-2 rounded-2" style={{ backgroundColor: "#e0e7ff" }}>
                          <i className="bi bi-activity" style={{ color: "#6366f1" }} />
                        </div>
                        <div>
                          <h6 className="mb-0 fw-semibold" style={{ color: "#1e293b" }}>
                            Results Activity
                          </h6>
                          <small className="text-muted">Recent days</small>
                        </div>
                      </div>
                    </div>
                    <div style={{ height: 300 }}>
                      <canvas ref={accessChartRef} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-4">
                <div className="card shadow-sm border-0 h-100" style={{ borderRadius: "12px" }}>
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center gap-2 mb-4">
                      <div className="p-2 rounded-2" style={{ backgroundColor: "#dbeafe" }}>
                        <i className="bi bi-bar-chart-fill" style={{ color: "#3b82f6" }} />
                      </div>
                      <div>
                        <h6 className="mb-0 fw-semibold" style={{ color: "#1e293b" }}>
                          Performance Trend
                        </h6>
                        <small className="text-muted">By term</small>
                      </div>
                    </div>
                    <div style={{ height: 300 }}>
                      <canvas ref={performanceChartRef} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Student Performance Watch */}
            <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: "12px" }}>
              <div className="card-body p-4">
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
                  <div className="d-flex align-items-center gap-2">
                    <div className="p-2 rounded-2" style={{ backgroundColor: "#dcfce7" }}>
                      <i className="bi bi-person-lines-fill" style={{ color: "#16a34a" }} />
                    </div>
                    <div>
                      <h6 className="mb-0 fw-semibold" style={{ color: "#1e293b" }}>
                        Student Performance Watch
                      </h6>
                      <small className="text-muted">Strong performers and students needing support</small>
                    </div>
                  </div>

                  <div className="d-flex flex-wrap gap-2">
                    {[
                      { label: "Tracked", value: studentPerformance.summary.tracked_students, color: "#2563eb" },
                      { label: "Strong", value: studentPerformance.summary.strong_count, color: "#16a34a" },
                      { label: "Needs support", value: studentPerformance.summary.struggling_count, color: "#dc2626" },
                      { label: "Class avg", value: `${studentPerformance.summary.class_average}%`, color: "#7c3aed" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="px-3 py-2 rounded-3"
                        style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}
                      >
                        <div className="small text-muted" style={{ lineHeight: 1.1 }}>
                          {item.label}
                        </div>
                        <div className="fw-bold" style={{ color: item.color }}>
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="row g-4">
                  <div className="col-lg-6">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <h6 className="mb-0 fw-semibold" style={{ color: "#0f172a" }}>
                        Needs support
                      </h6>
                      <span className="badge rounded-pill text-bg-light">
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
                          <p className="mb-0 text-muted">No struggling students found from the available results.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-lg-6">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <h6 className="mb-0 fw-semibold" style={{ color: "#0f172a" }}>
                        Doing well
                      </h6>
                      <span className="badge rounded-pill text-bg-light">
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
                          <p className="mb-0 text-muted">Performance will appear after results are entered.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="row g-3 mb-4">
              <div className="col-md-6 col-lg-3">
                <div
                  className="card border-0 h-100"
                  style={{
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    cursor: "pointer",
                    transition: "transform 0.2s",
                  }}
                  onClick={() => navigate("/students/attendance")}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <div className="card-body p-4 text-white">
                    <i className="bi bi-clipboard-check fs-2 mb-3 d-block"></i>
                    <h6 className="fw-semibold mb-1">Take Attendance</h6>
                    <small style={{ opacity: 0.9 }}>Mark daily attendance</small>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-lg-3">
                <div
                  className="card border-0 h-100"
                  style={{
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                    cursor: "pointer",
                    transition: "transform 0.2s",
                  }}
                  onClick={() => navigate("/results/upload")}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <div className="card-body p-4 text-white">
                    <i className="bi bi-file-earmark-text fs-2 mb-3 d-block"></i>
                    <h6 className="fw-semibold mb-1">Upload Results</h6>
                    <small style={{ opacity: 0.9 }}>Enter and submit scores</small>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-lg-3">
                <div
                  className="card border-0 h-100"
                  style={{
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                    cursor: "pointer",
                    transition: "transform 0.2s",
                  }}
                  onClick={() => navigate("/my-classes")}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <div className="card-body p-4 text-white">
                    <i className="bi bi-building fs-2 mb-3 d-block"></i>
                    <h6 className="fw-semibold mb-1">My Classes</h6>
                    <small style={{ opacity: 0.9 }}>See assigned classes</small>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-lg-3">
                <div
                  className="card border-0 h-100"
                  style={{
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                    cursor: "pointer",
                    transition: "transform 0.2s",
                  }}
                  onClick={() => navigate("/reports")}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <div className="card-body p-4 text-white">
                    <i className="bi bi-graph-up fs-2 mb-3 d-block"></i>
                    <h6 className="fw-semibold mb-1">Reports</h6>
                    <small style={{ opacity: 0.9 }}>Insights & summaries</small>
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

