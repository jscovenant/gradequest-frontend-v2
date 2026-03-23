import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { authApi } from "../../utils/axios";

import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import PageTitle from "../PageTitle";

interface StatCard {
  title: string;
  value: string | number;
  icon: string;
  subtitle?: string;
}

type DashboardResponse = {
  student: {
    id: number;
    name: string;
    reg_no?: string;
    photo?: string | null;
    class?: string | null;
  };
  stats: {
    subjects: number;
    attendance_rate: number;
    fee_balance: number;
    unread_notifications: number;
    results_count: number;
    avg_score: number;
  };
  fees: {
    total_fees: number;
    total_paid: number;
    balance: number;
    last_payment_date?: string | null;
  };
  charts: {
    performance: { label: string; average: number }[];
    access: { labels: string[]; data: number[] };
  };
  next_class?: any;
  recent_notifications?: any[];
};

export default function StudentDashboard() {
  // ===== Sidebar State =====
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ===== Academic Info =====
  const [academicSession, setAcademicSession] = useState("");
  const [currentTerm, setCurrentTerm] = useState("");

  // ===== Loading State =====
  const [loading, setLoading] = useState(true);

  // ===== Student Info =====
  const [studentName, setStudentName] = useState("Student");
  const [studentRegNo, setStudentRegNo] = useState<string>("");
  const [studentClass, setStudentClass] = useState<string>("");

  // ===== Widgets =====
  const [nextClass, setNextClass] = useState<any>(null);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);

  // ===== Stats =====
  const [stats, setStats] = useState<StatCard[]>([
    { title: "My Subjects", value: 0, icon: "book" },
    { title: "Attendance Rate", value: "0%", icon: "clipboard-check" },
    { title: "Fee Balance", value: 0, icon: "wallet2" },
    { title: "Unread Notices", value: 0, icon: "bell" },
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

  // ===== Helper: format money =====
  const formatMoney = (n: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(n || 0);

  // ===== Fetch all dashboard data =====
  useEffect(() => {
    setLoading(true);

    const fetchSessionTerm = authApi.get("/current-session-term");
    const fetchStudentDash = authApi.get("/student/dashboard");

    Promise.all([fetchSessionTerm, fetchStudentDash])
      .then(([sessionRes, dashRes]) => {
        // ✅ Session & Term
        setAcademicSession(sessionRes.data.session);
        setCurrentTerm(sessionRes.data.term);

        const data: DashboardResponse = dashRes.data;

        // ✅ Student header info
        setStudentName(data.student?.name || "Student");
        setStudentRegNo(data.student?.reg_no || "");
        setStudentClass(data.student?.class || "");

        // ✅ Widgets
        setNextClass(data.next_class || null);
        setRecentNotifications(data.recent_notifications || []);

        // ✅ Stats Cards
        setStats([
          {
            title: "My Subjects",
            value: data.stats.subjects ?? 0,
            icon: "book",
            subtitle: "Enrolled this session",
          },
          {
            title: "Attendance Rate",
            value: `${data.stats.attendance_rate ?? 0}%`,
            icon: "clipboard-check",
            subtitle: "Present vs absent",
          },
          {
            title: "Fee Balance",
            value: formatMoney(data.stats.fee_balance ?? 0),
            icon: "wallet2",
            subtitle: "Outstanding fees",
          },
          {
            title: "Unread Notices",
            value: data.stats.unread_notifications ?? 0,
            icon: "bell",
            subtitle: "Announcements",
          },
        ]);

        // ✅ Performance chart
        const perf = data.charts?.performance || [];
        setPerformanceLabels(perf.map((p) => p.label));
        setPerformanceData(perf.map((p) => Math.round((p.average || 0) * 10) / 10));

        // ✅ Access chart (result checks)
        const access = data.charts?.access;
        if (access?.labels?.length) {
          setAccessLabels(access.labels);
          setAccessData(access.data || []);
        } else {
          // fallback if backend has no activity logs yet
          setAccessLabels(["Mon", "Tue", "Wed", "Thu", "Fri"]);
          setAccessData([0, 0, 0, 0, 0]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // ===== Chart Logic =====
  useEffect(() => {
    const primaryColor =
      getComputedStyle(document.documentElement).getPropertyValue("--bs-primary").trim() || "#0d6efd";

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
              label: "Result Checks",
              data: accessData,
              borderColor: "#0d6efd",
              backgroundColor: createGradient(ctx),
              pointBackgroundColor: "#0d6efd",
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
              backgroundColor: "#0d6efd",
              borderRadius: 8,
              barThickness: 40,
              hoverBackgroundColor: "#0b5ed7",
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

  // Get current time greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Student Dashboard" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main
            className="col-md-9 col-lg-10 ms-auto px-4 d-flex flex-column min-vh-100"
            style={{ backgroundColor: "#f8f9fa" }}
          >
            {loading && <Loader message="Loading dashboard..." />}

            {/* Hero Section */}
            <div
              className="mt-4 p-4 position-relative overflow-hidden"
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

              <div className="row align-items-center position-relative">
                <div className="col-md-8">
                  <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                    <span
                      className="badge px-3 py-2"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        color: "#fff",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                      }}
                    >
                      <i className="bi bi-calendar-check me-1"></i>
                      {academicSession || "Loading..."} — {currentTerm || "..."}
                    </span>

                    {studentClass && (
                      <span
                        className="badge px-3 py-2"
                        style={{
                          backgroundColor: "rgba(16, 185, 129, 0.9)",
                          color: "#fff",
                          borderRadius: "20px",
                          fontSize: "0.75rem",
                          fontWeight: "500",
                        }}
                      >
                        <i className="bi bi-mortarboard-fill me-1"></i>
                        {studentClass}
                      </span>
                    )}

                    {studentRegNo && (
                      <span
                        className="badge px-3 py-2"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.15)",
                          color: "#fff",
                          borderRadius: "20px",
                          fontSize: "0.75rem",
                          fontWeight: "500",
                        }}
                      >
                        <i className="bi bi-person-badge me-1"></i>
                        {studentRegNo}
                      </span>
                    )}
                  </div>

                  <h2 className="fw-bold text-white mb-2">
                    {getGreeting()}, {studentName}! 👋
                  </h2>

                  <p className="text-white mb-4" style={{ opacity: 0.9, fontSize: "1rem" }}>
                    Here’s your academic snapshot: attendance, fees, results and your latest updates.
                  </p>

                  <div className="d-flex gap-2 flex-wrap">
                    <a
                      className="btn btn-light px-4 py-2 d-flex align-items-center gap-2"
                      style={{ borderRadius: "10px", fontWeight: "500", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}
                      href="/student/my-fees"
                    >
                      <i className="bi bi-wallet2"></i>
                      My Fees
                    </a>

                    <a
                      className="btn px-4 py-2 d-flex align-items-center gap-2"
                      style={{
                        borderRadius: "10px",
                        fontWeight: "500",
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        color: "#fff",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                      }}
                      href="/results"
                    >
                      <i className="bi bi-journal-check"></i>
                      Check Results
                    </a>
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
                        Quick Summary
                      </span>
                      <i className="bi bi-speedometer2 text-white"></i>
                    </div>

                    <div className="d-flex flex-column gap-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-white" style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                          Avg Score
                        </span>
                        <span className="text-white fw-bold">{performanceData.length ? `${performanceData.at(-1)}%` : "—"}</span>
                      </div>

                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-white" style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                          Results Records
                        </span>
                        <span className="text-white fw-bold">{/* safely read */}{stats?.[0]?.value !== undefined ? "" : ""}</span>
                      </div>

                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-white" style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                          Unread Notices
                        </span>
                        <span className="text-white fw-bold">{stats?.[3]?.value ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>


            {/* Stats Cards */}
            <div className="row g-3 mb-4 mt-1">
              {stats.map(({ title, value, icon, subtitle }, index) => {
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
                            <i className={`bi bi-${icon} fs-4`} style={{ color: colors[index].icon }}></i>
                          </div>
                          <i className="bi bi-three-dots-vertical text-muted" style={{ cursor: "pointer" }}></i>
                        </div>

                        <p className="text-muted mb-1 small">{title}</p>
                        <h3 className="fw-bold mb-1" style={{ color: "#1e293b" }}>
                          {value}
                        </h3>

                        <small className="text-muted">{subtitle || ""}</small>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Charts + Widgets */}
            <div className="row g-4 mb-4">
              <div className="col-lg-8">
                <div className="card shadow-sm border-0 h-100" style={{ borderRadius: "12px" }}>
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <div className="d-flex align-items-center gap-2">
                        <div className="p-2 rounded-2" style={{ backgroundColor: "#e0e7ff" }}>
                          <i className="bi bi-graph-up-arrow" style={{ color: "#6366f1" }}></i>
                        </div>
                        <div>
                          <h6 className="mb-0 fw-semibold" style={{ color: "#1e293b" }}>
                            Result Check Activity
                          </h6>
                          <small className="text-muted">Last 7 days</small>
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
                        <i className="bi bi-bar-chart-fill" style={{ color: "#3b82f6" }}></i>
                      </div>
                      <div>
                        <h6 className="mb-0 fw-semibold" style={{ color: "#1e293b" }}>
                          Performance Trend
                        </h6>
                        <small className="text-muted">Average by term</small>
                      </div>
                    </div>

                    <div style={{ height: 300 }}>
                      <canvas ref={performanceChartRef} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Next class + recent notifications */}
            <div className="row g-4 mb-4">
              <div className="col-lg-5">
                <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <div className="p-2 rounded-2" style={{ backgroundColor: "#ecfeff" }}>
                          <i className="bi bi-calendar2-event" style={{ color: "#06b6d4" }}></i>
                        </div>
                        <div>
                          <h6 className="mb-0 fw-semibold">Next Class</h6>
                          <small className="text-muted">Today’s schedule</small>
                        </div>
                      </div>
                    </div>

                    {!nextClass ? (
                      <div className="text-muted">No timetable entry found for today.</div>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Subject</span>
                          <span className="fw-semibold">{nextClass.subject_name || nextClass.subject || "—"}</span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Time</span>
                          <span className="fw-semibold">
                            {(nextClass.start_time || "—")} - {(nextClass.end_time || "—")}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Venue</span>
                          <span className="fw-semibold">{nextClass.venue || nextClass.room || "—"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-lg-7">
                <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <div className="p-2 rounded-2" style={{ backgroundColor: "#fff7ed" }}>
                          <i className="bi bi-megaphone" style={{ color: "#f97316" }}></i>
                        </div>
                        <div>
                          <h6 className="mb-0 fw-semibold">Recent Notifications</h6>
                          <small className="text-muted">Latest announcements</small>
                        </div>
                      </div>

                      <a href="/notifications" className="btn btn-sm btn-light" style={{ borderRadius: 8 }}>
                        View all
                      </a>
                    </div>

                    {recentNotifications.length === 0 ? (
                      <div className="text-muted">No notifications yet.</div>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {recentNotifications.map((n: any) => {
                          let title = "Notification";
                          let body = "";

                          // Laravel stores data as JSON string sometimes
                          const dataObj = typeof n.data === "string" ? (() => {
                            try { return JSON.parse(n.data); } catch { return {}; }
                          })() : (n.data || {});

                          title = dataObj.title || dataObj.subject || n.type?.split("\\").pop() || "Notification";
                          body = dataObj.message || dataObj.body || "";

                          return (
                            <div key={n.id} className="p-3 rounded-3" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                              <div className="d-flex justify-content-between align-items-start">
                                <div>
                                  <div className="fw-semibold" style={{ color: "#0f172a" }}>{title}</div>
                                  <div className="text-muted small">{body}</div>
                                </div>
                                {n.read_at ? (
                                  <span className="badge bg-light text-muted">Read</span>
                                ) : (
                                  <span className="badge bg-warning text-dark">New</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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