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

  // ===== Fetch all dashboard data =====
  useEffect(() => {
    setLoading(true);

    const fetchSessionTerm = authApi.get("/current-session-term");
    const fetchCounts = authApi.get("/teacher/dashboard/counts");
    const fetchPerformance = authApi.get("/teacher/performance-stats");
    const fetchAccess = authApi.get("/teacher/access-stats");

    Promise.all([fetchSessionTerm, fetchCounts, fetchPerformance, fetchAccess])
      .then(([sessionRes, countsRes, perfRes, accessRes]) => {
        // ✅ Session & Term
        setAcademicSession(sessionRes.data.session);
        setCurrentTerm(sessionRes.data.term);

        // ✅ Counts
        const counts = countsRes.data;
        setStats([
          { title: "My Students", value: counts.students, icon: "people" },
          { title: "My Classes", value: counts.classes, icon: "building" },
          { title: "My Subjects", value: counts.subjects, icon: "book" },
          { title: "Results Completion", value: counts.results_uploaded, icon: "check-circle" },
        ]);

        // ✅ Performance stats
        const perfData = perfRes.data.data || [];
        setPerformanceLabels(perfData.map((d: any) => d.term));
        setPerformanceData(perfData.map((d: any) => Number(d.average || 0)));

        // ✅ Access stats
        setAccessLabels(accessRes.data.labels || ["Mon", "Tue", "Wed", "Thu", "Fri"]);
        setAccessData(accessRes.data.data || [0, 0, 0, 0, 0]);
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
              label: "Results Saved",
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
<PageTitle title="Teacher Dashboard" />
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
                  <div className="d-flex align-items-center gap-2 mb-2">
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
                      <i className="bi bi-check-circle-fill me-1"></i>
                      Teacher Dashboard
                    </span>
                  </div>

                  <h2 className="fw-bold text-white mb-2">{getGreeting()}, Teacher! 👋</h2>

                  <p className="text-white mb-4" style={{ opacity: 0.9, fontSize: "1rem" }}>
                    Here’s your teaching overview — classes, subjects, students and results activity.
                  </p>

                  <div className="d-flex gap-2 flex-wrap">
                    <button
                      className="btn btn-light px-4 py-2 d-flex align-items-center gap-2"
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
                      className="btn px-4 py-2 d-flex align-items-center gap-2"
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