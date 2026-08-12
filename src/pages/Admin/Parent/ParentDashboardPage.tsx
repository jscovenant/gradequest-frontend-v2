import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../../utils/axios";

import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";

type ChildSummary = {
  id: number;
  name: string;
  reg_no?: string;
  photo?: string | null;
  class?: string | null;
  attendance_rate_30d: number;
  fee_balance: number;
  results_count: number;
};

type DashboardResponse = {
  parent: { id: number; name: string; email?: string; phone?: string | null };
  stats: {
    children: number;
    total_fees: number;
    total_paid: number;
    total_balance: number;
    unread_notifications: number;
  };
  selected_child_id: number;
  children: ChildSummary[];
  charts: {
    fee_balance_by_child: { labels: string[]; data: number[] };
    attendance_weekly: { labels: string[]; data: number[] };
  };
  recent_notifications: Array<{
    id: string;
    type: string;
    data: any;
    read_at: string | null;
    created_at: string;
  }>;
};

interface StatCard {
  title: string;
  value: string | number;
  icon: string;
}

const money = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(n || 0);

const emptyDashboard: DashboardResponse = {
  parent: { id: 0, name: "Parent" },
  stats: {
    children: 0,
    total_fees: 0,
    total_paid: 0,
    total_balance: 0,
    unread_notifications: 0,
  },
  selected_child_id: 0,
  children: [],
  charts: {
    fee_balance_by_child: { labels: [], data: [] },
    attendance_weekly: { labels: [], data: [] },
  },
  recent_notifications: [],
};

function normalizeDashboardPayload(rawPayload: any): DashboardResponse {
  const payload: Partial<DashboardResponse> | null | undefined = rawPayload?.data ?? rawPayload;
  const children = data?.children ?? [];
  const firstChildId = children[0]?.id ?? 0;
  const stats = payload?.stats || {};

  return {
    ...emptyDashboard,
    ...payload,
    parent: {
      ...emptyDashboard.parent,
      ...(payload?.parent || {}),
    },
    stats: {
      ...emptyDashboard.stats,
      ...stats,
      children: Number((stats as any).children ?? children.length ?? 0),
    },
    selected_child_id: Number(payload?.selected_child_id || firstChildId || 0),
    children,
    charts: {
      fee_balance_by_child: {
        labels: Array.isArray(payload?.charts?.fee_balance_by_child?.labels) ? payload.charts.fee_balance_by_child.labels : [],
        data: Array.isArray(payload?.charts?.fee_balance_by_child?.data) ? payload.charts.fee_balance_by_child.data : [],
      },
      attendance_weekly: {
        labels: Array.isArray(payload?.charts?.attendance_weekly?.labels) ? payload.charts.attendance_weekly.labels : [],
        data: Array.isArray(payload?.charts?.attendance_weekly?.data) ? payload.charts.attendance_weekly.data : [],
      },
    },
    recent_notifications: Array.isArray(payload?.recent_notifications) ? payload.recent_notifications : [],
  };
}

export default function ParentDashboardPage() {
  const navigate = useNavigate();

  // ===== Sidebar State =====
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ===== Loading State =====
  const [loading, setLoading] = useState(true);

  // ===== API Data =====
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [paymentLinkCopied, setPaymentLinkCopied] = useState(false);

  // ===== Stats cards =====
  const [stats, setStats] = useState<StatCard[]>([
    { title: "My Children", value: 0, icon: "people" },
    { title: "Total Fees", value: money(0), icon: "wallet2" },
    { title: "Total Paid", value: money(0), icon: "cash-stack" },
    { title: "Outstanding Balance", value: money(0), icon: "exclamation-circle" },
  ]);

  // ===== Chart Refs =====
  const attendanceChartRef = useRef<HTMLCanvasElement | null>(null);
  const feesChartRef = useRef<HTMLCanvasElement | null>(null);
  const attendanceChartInstance = useRef<Chart | null>(null);
  const feesChartInstance = useRef<Chart | null>(null);

  // ===== Derived chart data =====
  const weeklyLabels = useMemo(() => data?.charts?.attendance_weekly?.labels ?? [], [data]);
  const weeklyData = useMemo(() => data?.charts?.attendance_weekly?.data ?? [], [data]);

  const feeLabels = useMemo(() => data?.charts?.fee_balance_by_child?.labels ?? [], [data]);
  const feeData = useMemo(() => data?.charts?.fee_balance_by_child?.data ?? [], [data]);

  // ===== Fetch dashboard =====
  const fetchDashboard = (childId?: number) => {
    setLoading(true);
    const url = childId ? `/parent/dashboard?child_id=${childId}` : `/parent/dashboard`;

    authApi
      .get(url)
      .then((res) => {
        const payload = normalizeDashboardPayload(res.data);
        setData(payload);
        setSelectedChildId(payload.selected_child_id);

        setStats([
          { title: "My Children", value: payload.stats.children, icon: "people" },
          { title: "Total Fees", value: money(payload.stats.total_fees), icon: "wallet2" },
          { title: "Total Paid", value: money(payload.stats.total_paid), icon: "cash-stack" },
          { title: "Outstanding Balance", value: money(payload.stats.total_balance), icon: "exclamation-circle" },
        ]);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // ===== Chart Logic (same “template colors” approach) =====
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

    // Attendance chart (line)
    if (attendanceChartRef.current) {
      const ctx = attendanceChartRef.current.getContext("2d");
      if (!ctx) return;

      attendanceChartInstance.current?.destroy();

      attendanceChartInstance.current = new Chart(ctx, {
        type: "line",
        data: {
          labels: weeklyLabels,
          datasets: [
            {
              label: "Present/Late Marks",
              data: weeklyData,
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
            y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.05)" }, ticks: { font: { size: 11 } } },
          },
        },
      });
    }

    // Fees chart (bar)
    if (feesChartRef.current) {
      const ctx = feesChartRef.current.getContext("2d");
      if (!ctx) return;

      feesChartInstance.current?.destroy();

      feesChartInstance.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels: feeLabels,
          datasets: [
            {
              label: "Balance",
              data: feeData,
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
              callbacks: {
                label: (ctx) => ` ${money(Number(ctx.raw || 0))}`,
              },
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              padding: 12,
              cornerRadius: 8,
              titleFont: { size: 13, weight: "bold" },
              bodyFont: { size: 12 },
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
            y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.05)" }, ticks: { font: { size: 11 } } },
          },
        },
      });
    }

    return () => {
      attendanceChartInstance.current?.destroy();
      feesChartInstance.current?.destroy();
    };
  }, [weeklyLabels, weeklyData, feeLabels, feeData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const parentName = data?.parent?.name ?? "Parent";
  const children = data?.children ?? [];
  const selectedChild = children.find((child) => child.id === selectedChildId) || children[0];
  const paymentLink = `${window.location.origin}/pay-school-fee${selectedChild?.reg_no ? `?student_reg_no=${encodeURIComponent(selectedChild.reg_no)}` : ""}`;
  const copyPaymentLink = async () => {
    try {
      await navigator.clipboard.writeText(paymentLink);
      setPaymentLinkCopied(true);
      window.setTimeout(() => setPaymentLinkCopied(false), 1800);
    } catch {
      window.prompt("Copy payment link", paymentLink);
    }
  };

  return (
    <>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Parent Dashboard" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto px-4 d-flex flex-column min-vh-100" style={{ backgroundColor: "#f8f9fa" }}>
            {loading && <Loader message="Loading dashboard..." />}

            {/* Hero */}
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
                        fontWeight: 500,
                      }}
                    >
                      <i className="bi bi-person-badge me-1"></i>
                      Parent Portal
                    </span>

                    <span
                      className="badge px-3 py-2"
                      style={{
                        backgroundColor: "rgba(16, 185, 129, 0.9)",
                        color: "#fff",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                      }}
                    >
                      <i className="bi bi-bell-fill me-1"></i>
                      {data?.stats.unread_notifications ?? 0} Unread
                    </span>
                  </div>

                  <h2 className="fw-bold text-white mb-2">
                    {getGreeting()}, {parentName}! 👋
                  </h2>

                  <p className="text-white mb-4" style={{ opacity: 0.9, fontSize: "1rem" }}>
                    Here’s a quick overview of your children’s school activity—fees, attendance, and updates.
                  </p>

                  <div className="d-flex gap-2 flex-wrap">
                    <button
                      className="btn btn-light px-4 py-2 d-flex align-items-center gap-2"
                      style={{
                        borderRadius: "10px",
                        fontWeight: 500,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                      onClick={() => navigate("/student/my-fees")}
                    >
                      <i className="bi bi-wallet2"></i>
                      View Fees
                    </button>

                    <button
                      className="btn px-4 py-2 d-flex align-items-center gap-2"
                      style={{
                        borderRadius: "10px",
                        fontWeight: 500,
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        color: "#fff",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                      }}
                      onClick={() => navigate("/notifications")}
                    >
                      <i className="bi bi-bell"></i>
                      Notifications
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
                        Selected Child
                      </span>
                      <i className="bi bi-people text-white"></i>
                    </div>

                    <select
                      className="form-select"
                      value={selectedChildId ?? ""}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        setSelectedChildId(id);
                        fetchDashboard(id);
                      }}
                      style={{
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.35)",
                        background: "rgba(255,255,255,0.2)",
                        color: "#fff",
                      }}
                    >
                      {children.map((c) => (
                        <option key={c.id} value={c.id} style={{ color: "#0b1220" }}>
                          {c.name} ({c.reg_no || "N/A"})
                        </option>
                      ))}
                    </select>

                    <div className="mt-3 d-flex flex-column gap-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-white" style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                          Attendance (30d)
                        </span>
                        <span className="text-white fw-bold">
                          {children.find((x) => x.id === selectedChildId)?.attendance_rate_30d ?? 0}%
                        </span>
                      </div>

                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-white" style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                          Balance
                        </span>
                        <span className="text-white fw-bold">
                          {money(children.find((x) => x.id === selectedChildId)?.fee_balance ?? 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="row g-3 mb-4 mt-1">
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
                        borderRadius: 12,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        transition: "transform 0.2s, box-shadow 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.12)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                      }}
                    >
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: colors[index].gradient }} />

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
                            <i className="bi bi-shield-check text-success" />
                            Live data from your account
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
              <div className="card-body p-4">
                <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
                  <div className="d-flex align-items-start gap-3">
                    <div
                      className="d-flex align-items-center justify-content-center"
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 12,
                        background: "rgba(211, 0, 176, 0.08)",
                        color: "rgb(211, 0, 176)",
                        flexShrink: 0,
                      }}
                    >
                      <i className="bi bi-credit-card-2-front fs-5" />
                    </div>
                    <div>
                      <h6 className="fw-bold mb-1" style={{ color: "#1e293b" }}>
                        Pay School Fees Online
                      </h6>
                      <div className="text-muted small">
                        Open the public payment page, enter the school code and your child admission number, then pay securely.
                      </div>
                      {selectedChild?.reg_no && (
                        <div className="mt-2 small text-muted">
                          Selected admission no: <b>{selectedChild.reg_no}</b>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <button className="btn btn-primary" style={{ borderRadius: 10, fontWeight: 700 }} onClick={() => window.open(paymentLink, "_blank")}>
                      <i className="bi bi-box-arrow-up-right me-1" />
                      Open Payment Link
                    </button>
                    <button className="btn btn-outline-secondary" style={{ borderRadius: 10, fontWeight: 700 }} onClick={copyPaymentLink}>
                      <i className="bi bi-clipboard me-1" />
                {paymentLinkCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="row g-4 mb-4">
              <div className="col-lg-8">
                <div className="card shadow-sm border-0 h-100" style={{ borderRadius: 12 }}>
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <div className="d-flex align-items-center gap-2">
                        <div className="p-2 rounded-2" style={{ backgroundColor: "#e0e7ff" }}>
                          <i className="bi bi-clipboard-check" style={{ color: "#6366f1" }} />
                        </div>
                        <div>
                          <h6 className="mb-0 fw-semibold" style={{ color: "#1e293b" }}>
                            Attendance (Last 7 Days)
                          </h6>
                          <small className="text-muted">For selected child</small>
                        </div>
                      </div>
                    </div>
                    <div style={{ height: 300 }}>
                      <canvas ref={attendanceChartRef} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-4">
                <div className="card shadow-sm border-0 h-100" style={{ borderRadius: 12 }}>
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center gap-2 mb-4">
                      <div className="p-2 rounded-2" style={{ backgroundColor: "#dbeafe" }}>
                        <i className="bi bi-wallet2" style={{ color: "#3b82f6" }} />
                      </div>
                      <div>
                        <h6 className="mb-0 fw-semibold" style={{ color: "#1e293b" }}>
                          Fee Balance by Child
                        </h6>
                        <small className="text-muted">Outstanding amounts</small>
                      </div>
                    </div>
                    <div style={{ height: 300 }}>
                      <canvas ref={feesChartRef} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Children Table */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h6 className="fw-semibold mb-0" style={{ color: "#1e293b" }}>
                      My Children
                    </h6>
                    <small className="text-muted">Quick overview (fees, attendance, results)</small>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr className="text-muted small">
                        <th>Student</th>
                        <th>Class</th>
                        <th>Attendance (30d)</th>
                        <th>Fee Balance</th>
                        <th>Results</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {children.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div
                                className="rounded-circle d-flex align-items-center justify-content-center"
                                style={{
                                  width: 38,
                                  height: 38,
                                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                  color: "#fff",
                                  fontWeight: 700,
                                }}
                              >
                                {(c.name?.[0] || "S").toUpperCase()}
                              </div>
                              <div>
                                <div className="fw-semibold">{c.name}</div>
                                <small className="text-muted">{c.reg_no || "N/A"}</small>
                              </div>
                            </div>
                          </td>
                          <td>{c.class || "—"}</td>
                          <td>
                            <span className="badge bg-light text-dark" style={{ borderRadius: 20 }}>
                              {c.attendance_rate_30d}%
                            </span>
                          </td>
                          <td className="fw-semibold">{money(c.fee_balance)}</td>
                          <td>{c.results_count}</td>
                          <td className="text-end">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              style={{ borderRadius: 10 }}
                              onClick={() => {
                                setSelectedChildId(c.id);
                                fetchDashboard(c.id);
                              }}
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                      {children.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center text-muted py-4">
                            No children assigned.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="card border-0 shadow-sm mb-5" style={{ borderRadius: 12 }}>
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h6 className="fw-semibold mb-0" style={{ color: "#1e293b" }}>
                      Recent Notifications
                    </h6>
                    <small className="text-muted">Latest updates for your account</small>
                  </div>
                  <button className="btn btn-sm btn-light" style={{ borderRadius: 10 }} onClick={() => navigate("/notifications")}>
                    View all
                  </button>
                </div>

                <div className="d-flex flex-column gap-2">
                  {(data?.recent_notifications ?? []).map((n) => (
                    <div
                      key={n.id}
                      className="p-3 rounded-3"
                      style={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #eef2f7",
                      }}
                    >
                      <div className="d-flex justify-content-between">
                    <div className="fw-semibold">{n.data?.message ?? "Notification"}</div>
                        <small className="text-muted">{new Date(n.created_at).toLocaleString()}</small>
                      </div>
                      {n.data?.type && <small className="text-muted">Type: {n.data.type}</small>}
                    </div>
                  ))}

                  {(data?.recent_notifications ?? []).length === 0 && (
                    <div className="text-muted">No notifications yet.</div>
                  )}
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
