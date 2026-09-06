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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        .parent-db-main {
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: 24px 28px 40px;
        }

        /* ── Signature Hero Banner ── */
        .parent-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 18px;
          padding: 32px 36px;
          color: #FFFFFF;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
          position: relative;
          overflow: hidden;
        }

        .parent-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }

        .parent-hero-glow {
          position: absolute;
          top: -40px;
          right: -40px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.18) 0%, transparent 65%);
          pointer-events: none;
        }

        .parent-hero-glow2 {
          position: absolute;
          bottom: -30px;
          left: 20%;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, transparent 65%);
          pointer-events: none;
        }

        .parent-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 24px;
        }

        .parent-session-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #FBBF24;
          background: rgba(217, 119, 6, 0.2);
          border: 1px solid rgba(217, 119, 6, 0.35);
          border-radius: 100px;
          padding: 4px 12px;
          margin-bottom: 12px;
        }

        .parent-session-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 6px #10B981;
          animation: parentPulse 2s ease infinite;
        }

        @keyframes parentPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.5); }
        }

        .parent-greeting {
          font-size: 26px;
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.1;
          margin-bottom: 8px;
        }

        .parent-greeting em {
          font-style: normal;
          color: #FBBF24;
        }

        .parent-hero-sub {
          font-size: 13.5px;
          color: #CBD5E1;
          line-height: 1.6;
          max-width: 520px;
          margin-bottom: 20px;
        }

        .parent-hero-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .parent-btn-gold {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 700;
          border-radius: 10px;
          color: #FFFFFF !important;
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%) !important;
          border: none;
          box-shadow: 0 4px 14px rgba(217, 119, 6, 0.3);
          transition: all 0.2s ease;
          text-decoration: none;
          cursor: pointer;
        }

        .parent-btn-gold:hover {
          background: linear-gradient(135deg, #B45309 0%, #92400E 100%) !important;
          transform: translateY(-1px);
        }

        .parent-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 700;
          border-radius: 10px;
          color: #FFFFFF !important;
          background: rgba(255, 255, 255, 0.12) !important;
          border: 1px solid rgba(255, 255, 255, 0.22) !important;
          backdrop-filter: blur(8px);
          transition: all 0.2s ease;
          text-decoration: none;
          cursor: pointer;
        }

        .parent-btn-outline:hover {
          background: rgba(255, 255, 255, 0.2) !important;
          transform: translateY(-1px);
        }

        /* ── Child Selector Card in Hero ── */
        .parent-child-card {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 14px;
          padding: 18px 22px;
          backdrop-filter: blur(12px);
          min-width: 280px;
        }

        .parent-child-card-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        /* ── Unified Stat Cards ── */
        .parent-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        @media (max-width: 1100px) {
          .parent-stat-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .parent-stat-grid {
            grid-template-columns: 1fr;
          }
        }

        .parent-stat-card {
          background: #FFFFFF;
          border: 1px solid rgba(15, 39, 68, 0.08);
          border-radius: 16px;
          padding: 20px 24px;
          box-shadow: 0 2px 10px rgba(15, 39, 68, 0.04);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }

        .parent-stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(15, 39, 68, 0.08);
          border-color: rgba(217, 119, 6, 0.25);
        }

        .parent-stat-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          margin-bottom: 14px;
        }

        .parent-stat-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #64748B;
          margin-bottom: 6px;
        }

        .parent-stat-val {
          font-size: 24px;
          font-weight: 800;
          color: #0F2744;
          line-height: 1.1;
          margin-bottom: 8px;
        }

        /* ── Quick Actions Grid ── */
        .parent-qa-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 24px;
        }

        @media (max-width: 1000px) {
          .parent-qa-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 540px) {
          .parent-qa-grid {
            grid-template-columns: 1fr;
          }
        }

        .parent-qa-card {
          background: #FFFFFF;
          border: 1px solid rgba(15, 39, 68, 0.08);
          border-radius: 14px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          text-decoration: none;
          color: #0F2744;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(15, 39, 68, 0.03);
          cursor: pointer;
        }

        .parent-qa-card:hover {
          border-color: rgba(217, 119, 6, 0.35);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(15, 39, 68, 0.07);
          color: #0F2744;
        }

        .parent-qa-icon {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }

        /* ── Content Panels & Tables ── */
        .parent-panel {
          background: #FFFFFF;
          border: 1px solid rgba(15, 39, 68, 0.08);
          border-radius: 16px;
          box-shadow: 0 2px 10px rgba(15, 39, 68, 0.04);
          overflow: hidden;
          margin-bottom: 24px;
        }

        .parent-panel-head {
          padding: 18px 24px;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .parent-panel-title {
          font-size: 16px;
          font-weight: 800;
          color: #0F2744;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .parent-panel-body {
          padding: 24px;
        }

        .parent-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .parent-table th {
          background: #F8FAFC;
          padding: 12px 16px;
          font-weight: 700;
          color: #475569;
          font-size: 11.5px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid #E2E8F0;
        }

        .parent-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #F1F5F9;
          color: #1E293B;
          vertical-align: middle;
        }

        .parent-table tr:hover td {
          background: #F8FAFC;
        }

        .parent-badge-clear {
          background: #DCFCE7;
          color: #15803D;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
        }

        .parent-badge-pending {
          background: #FEF3C7;
          color: #B45309;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
        }

        .parent-badge-owing {
          background: #FEE2E2;
          color: #B91C1C;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Parent Dashboard" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto gq-app-main parent-db-main d-flex flex-column min-vh-100">
            {loading && <Loader message="Loading parent dashboard..." />}

            {/* ── Signature GradiosEdu Jumbotron ── */}
            <div className="parent-hero">
              <div className="parent-hero-glow" />
              <div className="parent-hero-glow2" />

              <div className="parent-hero-inner">
                <div>
                  <div className="parent-session-badge">
                    <span className="parent-session-dot" />
                    Parent Academic Portal
                  </div>

                  <h1 className="parent-greeting">
                    {getGreeting()}, <em>{parentName}!</em> 👋
                  </h1>

                  <p className="parent-hero-sub">
                    Institutional oversight for your children — view real-time continuous assessment, verified term broadsheets, digital fee clearance, and daily attendance logs.
                  </p>

                  <div className="parent-hero-actions">
                    <button
                      className="parent-btn-gold"
                      onClick={() => window.open(paymentLink, "_blank")}
                    >
                      <i className="bi bi-credit-card-2-front-fill" />
                      Pay School Fees Online
                    </button>
                    <button
                      className="parent-btn-outline"
                      onClick={() => navigate("/parent/children")}
                    >
                      <i className="bi bi-people-fill" />
                      Manage Children
                    </button>
                    <button
                      className="parent-btn-outline"
                      onClick={() => navigate("/notifications")}
                    >
                      <i className="bi bi-bell-fill" />
                      Notifications ({data?.stats.unread_notifications ?? 0})
                    </button>
                  </div>
                </div>

                {/* Selected Child Switcher Card in Hero */}
                <div className="parent-child-card">
                  <div className="parent-child-card-title">
                    <span>Active Student</span>
                    <i className="bi bi-mortarboard-fill text-warning" />
                  </div>

                  <select
                    className="form-select mb-3"
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
                      color: "#FFFFFF",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    {children.map((c) => (
                      <option key={c.id} value={c.id} style={{ color: "#0F2744" }}>
                        {c.name} ({c.class || "No Class"})
                      </option>
                    ))}
                  </select>

                  <div className="d-flex flex-column gap-2" style={{ fontSize: "12.5px" }}>
                    <div className="d-flex justify-content-between align-items-center">
                      <span style={{ color: "rgba(255, 255, 255, 0.75)" }}>Admission No:</span>
                      <strong className="text-white">{selectedChild?.reg_no || "N/A"}</strong>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span style={{ color: "rgba(255, 255, 255, 0.75)" }}>Attendance Rate (30d):</span>
                      <strong className="text-success">{selectedChild?.attendance_rate_30d ?? 0}%</strong>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span style={{ color: "rgba(255, 255, 255, 0.75)" }}>Fee Balance:</span>
                      <strong style={{ color: Number(selectedChild?.fee_balance || 0) > 0 ? "#FCA5A5" : "#86EFAC" }}>
                        {money(selectedChild?.fee_balance ?? 0)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Unified 4-Column Stat Cards ── */}
            <div className="parent-stat-grid">
              {stats.map(({ title, value, icon }, idx) => {
                const meta = [
                  { color: "#10B981", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.3)" },
                  { color: "#2563EB", bg: "rgba(37, 99, 235, 0.12)", border: "rgba(37, 99, 235, 0.3)" },
                  { color: "#059669", bg: "rgba(5, 150, 105, 0.12)", border: "rgba(5, 150, 105, 0.3)" },
                  { color: "#D97706", bg: "rgba(217, 119, 6, 0.12)", border: "rgba(217, 119, 6, 0.3)" },
                ][idx % 4];

                return (
                  <div className="parent-stat-card" key={title}>
                    <div className="d-flex align-items-start justify-content-between">
                      <div>
                        <div className="parent-stat-title">{title}</div>
                        <div className="parent-stat-val">{value}</div>
                      </div>
                      <div
                        className="parent-stat-icon-wrap"
                        style={{ backgroundColor: meta.bg, color: meta.color }}
                      >
                        <i className={`bi bi-${icon}`} />
                      </div>
                    </div>
                    <div className="pt-2 d-flex align-items-center gap-1" style={{ borderTop: "1px solid #F1F5F9", fontSize: "11.5px", color: "#64748B" }}>
                      <i className="bi bi-shield-check text-success" />
                      Live institutional ledger
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Quick Actions Grid ── */}
            <div className="parent-qa-grid">
              <div
                className="parent-qa-card"
                onClick={() => window.open(paymentLink, "_blank")}
              >
                <div className="parent-qa-icon" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10B981" }}>
                  <i className="bi bi-credit-card-2-front-fill" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "13.5px" }}>Pay School Fees</div>
                  <div style={{ fontSize: "11.5px", color: "#64748B" }}>Secure instant gateway</div>
                </div>
              </div>

              <div
                className="parent-qa-card"
                onClick={() => navigate("/parent/children")}
              >
                <div className="parent-qa-icon" style={{ background: "rgba(37, 99, 235, 0.12)", color: "#2563EB" }}>
                  <i className="bi bi-file-earmark-bar-graph-fill" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "13.5px" }}>Term Broadsheet</div>
                  <div style={{ fontSize: "11.5px", color: "#64748B" }}>Official academic results</div>
                </div>
              </div>

              <div
                className="parent-qa-card"
                onClick={() => navigate("/student/my-fees")}
              >
                <div className="parent-qa-icon" style={{ background: "rgba(217, 119, 6, 0.12)", color: "#D97706" }}>
                  <i className="bi bi-receipt-cutoff" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "13.5px" }}>Payment History</div>
                  <div style={{ fontSize: "11.5px", color: "#64748B" }}>Verified receipts & logs</div>
                </div>
              </div>

              <div
                className="parent-qa-card"
                onClick={() => navigate("/parent/whatsapp-verification")}
              >
                <div className="parent-qa-icon" style={{ background: "rgba(5, 150, 105, 0.12)", color: "#059669" }}>
                  <i className="bi bi-whatsapp" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "13.5px" }}>WhatsApp Alerts</div>
                  <div style={{ fontSize: "11.5px", color: "#64748B" }}>Direct mobile updates</div>
                </div>
              </div>
            </div>

            {/* ── Visual Analytics / Charts ── */}
            <div className="row g-4 mb-4">
              <div className="col-lg-8">
                <div className="parent-panel h-100 mb-0">
                  <div className="parent-panel-head">
                    <h2 className="parent-panel-title">
                      <i className="bi bi-calendar2-check-fill text-primary" />
                      Weekly Attendance Activity
                    </h2>
                    <span className="badge bg-light text-dark" style={{ border: "1px solid #E2E8F0" }}>
                      {selectedChild?.name || "Selected Student"}
                    </span>
                  </div>
                  <div className="parent-panel-body">
                    <div style={{ height: 280 }}>
                      <canvas ref={attendanceChartRef} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-4">
                <div className="parent-panel h-100 mb-0">
                  <div className="parent-panel-head">
                    <h2 className="parent-panel-title">
                      <i className="bi bi-pie-chart-fill text-warning" />
                      Fee Balance by Child
                    </h2>
                    <span className="badge bg-light text-dark" style={{ border: "1px solid #E2E8F0" }}>
                      ₦ NGN
                    </span>
                  </div>
                  <div className="parent-panel-body">
                    <div style={{ height: 280 }}>
                      <canvas ref={feesChartRef} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Children Summary Table ── */}
            <div className="parent-panel">
              <div className="parent-panel-head">
                <div>
                  <h2 className="parent-panel-title">
                    <i className="bi bi-people-fill text-primary" />
                    Enrolled Children Overview
                  </h2>
                  <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                    Continuous assessment, fee status, and result access for your family
                  </div>
                </div>
                <button
                  className="btn btn-sm btn-outline-primary"
                  style={{ borderRadius: 8, fontWeight: 700 }}
                  onClick={() => fetchDashboard(selectedChildId ?? undefined)}
                >
                  <i className="bi bi-arrow-clockwise me-1" />
                  Refresh Data
                </button>
              </div>

              <div className="table-responsive">
                <table className="parent-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Class</th>
                      <th>Attendance (30d)</th>
                      <th>Fee Status</th>
                      <th>Outstanding</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {children.map((c) => {
                      const balance = Number(c.fee_balance || 0);
                      const isClear = balance <= 0;

                      return (
                        <tr key={c.id}>
                          <td>
                            <div className="d-flex align-items-center gap-3">
                              <div
                                style={{
                                  width: 38,
                                  height: 38,
                                  borderRadius: "50%",
                                  background: "linear-gradient(135deg, #0A192F 0%, #1E3A8A 100%)",
                                  color: "#FBBF24",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 800,
                                  fontSize: "14px",
                                }}
                              >
                                {(c.name?.[0] || "S").toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: "#0F2744" }}>{c.name}</div>
                                <div style={{ fontSize: "11.5px", color: "#64748B" }}>
                                  Admission No: <strong>{c.reg_no || "N/A"}</strong>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600 }}>{c.class || "—"}</span>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="progress flex-grow-1" style={{ height: 6, width: 60, borderRadius: 999 }}>
                                <div
                                  className="progress-bar bg-success"
                                  style={{ width: `${Math.min(100, c.attendance_rate_30d || 0)}%` }}
                                />
                              </div>
                              <span style={{ fontWeight: 700, fontSize: "12px" }}>{c.attendance_rate_30d}%</span>
                            </div>
                          </td>
                          <td>
                            {isClear ? (
                              <span className="parent-badge-clear">
                                <i className="bi bi-check-circle-fill me-1" />
                                Cleared
                              </span>
                            ) : (
                              <span className="parent-badge-owing">
                                <i className="bi bi-exclamation-circle-fill me-1" />
                                Balance Due
                              </span>
                            )}
                          </td>
                          <td style={{ fontWeight: 700, color: isClear ? "#15803D" : "#B91C1C" }}>
                            {money(c.fee_balance)}
                          </td>
                          <td className="text-end">
                            <div className="d-flex align-items-center justify-content-end gap-2">
                              <button
                                className={`btn btn-sm ${c.id === selectedChildId ? "btn-primary" : "btn-outline-secondary"}`}
                                style={{ borderRadius: 8, fontWeight: 700, fontSize: "12px" }}
                                onClick={() => {
                                  setSelectedChildId(c.id);
                                  fetchDashboard(c.id);
                                }}
                              >
                                {c.id === selectedChildId ? "Selected" : "Select"}
                              </button>
                              <button
                                className="btn btn-sm btn-outline-success"
                                style={{ borderRadius: 8, fontWeight: 700, fontSize: "12px" }}
                                onClick={() => {
                                  const childPayLink = `${window.location.origin}/pay-school-fee${c.reg_no ? `?student_reg_no=${encodeURIComponent(c.reg_no)}` : ""}`;
                                  window.open(childPayLink, "_blank");
                                }}
                              >
                                Pay Fees
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {children.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-5 text-muted">
                          <i className="bi bi-people fs-2 d-block mb-2 text-secondary" />
                          No children assigned to this parent account yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Recent Notifications Panel ── */}
            <div className="parent-panel mb-5">
              <div className="parent-panel-head">
                <h2 className="parent-panel-title">
                  <i className="bi bi-bell-fill text-warning" />
                  Recent Account & School Notifications
                </h2>
                <button
                  className="btn btn-sm btn-light"
                  style={{ borderRadius: 8, fontWeight: 700 }}
                  onClick={() => navigate("/notifications")}
                >
                  View All Notifications
                </button>
              </div>

              <div className="parent-panel-body p-0">
                <div className="d-flex flex-column">
                  {(data?.recent_notifications ?? []).map((n) => (
                    <div
                      key={n.id}
                      className="p-3 d-flex align-items-center justify-content-between border-bottom"
                      style={{ transition: "background 0.2s" }}
                    >
                      <div className="d-flex align-items-center gap-3">
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: "rgba(217, 119, 6, 0.12)",
                            color: "#D97706",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "16px",
                          }}
                        >
                          <i className="bi bi-chat-left-dots-fill" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: "#0F2744", fontSize: "13.5px" }}>
                            {n.data?.message ?? "School Notification"}
                          </div>
                          {n.data?.type && (
                            <small className="text-muted">Type: {n.data.type}</small>
                          )}
                        </div>
                      </div>
                      <small className="text-muted">
                        {new Date(n.created_at).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </small>
                    </div>
                  ))}

                  {(data?.recent_notifications ?? []).length === 0 && (
                    <div className="text-muted text-center py-4">
                      No new notifications at this time.
                    </div>
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
