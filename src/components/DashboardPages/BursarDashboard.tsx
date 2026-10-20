import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { authApi } from "../../utils/axios";
import TopNav from "../LayoutComponents/TopNav";
import Sidebar from "../LayoutComponents/Sidebar";
import Footer from "../LayoutComponents/Footer";
import Loader from "../ui/dashboardLoader";
import { useNavigate } from "react-router-dom";
import PageTitle from "../PageTitle";

interface CurrentSessionTermResponse {
  session: string;
  term: string;
}

interface DashboardSummaryResponse {
  summary: {
    total_gross_billed?: number;
    total_discounts_granted?: number;
    total_billed: number;
    total_paid: number;
    total_outstanding: number;
    total_transactions: number;
    paid_students_count: number;
    owing_students_count: number;
  };
  active_section?: { id: number; name: string } | null;
  available_sections?: { id: number; name: string }[];
  is_scoped_bursar?: boolean;
}

interface RecentPayment {
  id: number;
  reference: string;
  amount: number;
  payment_method: string | null;
  created_at: string | null;
  received_by: number | null;
  student_name: string;
  admission_no: string;
  section_name?: string;
  fee_type_name?: string;
}

interface RecentPaymentsResponse {
  data: RecentPayment[];
  total: number;
}

interface PaymentMethodItem {
  method: string;
  total_amount: number;
  total_count: number;
}

interface PaymentMethodResponse {
  data: PaymentMethodItem[];
}

interface BankDetail {
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  provider?: string | null;
  is_default?: number | boolean;
  is_active?: number | boolean;
}

interface BankDetailsResponse {
  data: BankDetail[];
}

interface SectionBreakdownItem {
  section_id: number;
  section_name: string;
  gross_billed: number;
  discounts: number;
  net_billed: number;
  paid: number;
  balance: number;
  total_students: number;
  owing_students: number;
  collection_rate: number;
}

const QUICK_ACTIONS = [
  {
    label: "Record Payment",
    desc: "Collect fee & print QR receipt",
    color: "var(--bs-success, rgb(34,197,94))",
    bg: "rgba(34,197,94,0.10)",
    path: "/fees/payments",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 14h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Concession Approvals",
    desc: "Authorize fee discounts & waivers",
    color: "#d97706",
    bg: "rgba(217,119,6,0.12)",
    path: "/fees/concessions",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Fee Structure",
    desc: "Configure tuition & levy tariffs",
    color: "var(--bs-warning, rgb(245,158,11))",
    bg: "rgba(245,158,11,0.10)",
    path: "/fees/structure",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M2 19c0-3.314 2.686-6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M15 7h6M15 12h6M15 17h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Student Payments",
    desc: "Collect & record fee payments",
    color: "var(--bs-primary, rgb(37,99,235))",
    bg: "rgba(37,99,235,0.08)",
    path: "/fees/payments",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M2 10h20" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="6" cy="15" r="1" fill="currentColor" />
      </svg>
    ),
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const naira = (value: number | string | null | undefined) => {
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(n);
};

const fmtDate = (date?: string | null) => {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function BursarDashboard() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [academicSession, setAcademicSession] = useState("");
  const [currentTerm, setCurrentTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Section Scoping state
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [availableSections, setAvailableSections] = useState<{ id: number; name: string }[]>([]);
  const [activeSection, setActiveSection] = useState<{ id: number; name: string } | null>(null);
  const [isScopedBursar, setIsScopedBursar] = useState(false);
  const [sectionBreakdown, setSectionBreakdown] = useState<SectionBreakdownItem[]>([]);

  // Financial Metrics (gross-to-net accounting)
  const [metrics, setMetrics] = useState({
    grossBilled: 0,
    discountsGranted: 0,
    netBilled: 0,
    paidAmount: 0,
    outstandingAmount: 0,
    collectionRate: 0,
    transactions: 0,
  });

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

  const [summaryMeta, setSummaryMeta] = useState({
    paid_students_count: 0,
    owing_students_count: 0,
  });

  const [pendingConcessionsCount, setPendingConcessionsCount] = useState(0);

  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [paymentPage, setPaymentPage] = useState(1);
  const paymentLimit = 6;

  const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
  const [bankLoading, setBankLoading] = useState(false);

  const [chartLabels, setChartLabels] = useState<string[]>([]);
  const [chartData, setChartData] = useState<number[]>([]);
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInst = useRef<Chart | null>(null);

  const [bursarTrendPoints, setBursarTrendPoints] = useState<any[]>([]);
  const [bursarTrendMode, setBursarTrendMode] = useState<"daily" | "cumulative">("daily");
  const bursarLineChartRef = useRef<HTMLCanvasElement | null>(null);
  const bursarLineChartInst = useRef<Chart | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(paymentsTotal / paymentLimit)),
    [paymentsTotal]
  );

  const fetchRecentPayments = async (page: number, secId?: string) => {
    setPaymentsLoading(true);
    setPaymentsError(null);
    try {
      const activeSec = secId !== undefined ? secId : selectedSectionId;
      const res = await authApi.get<RecentPaymentsResponse>("/bursar-dashboard/recent-payments", {
        params: { limit: paymentLimit, page, ...(activeSec ? { section_id: activeSec } : {}) },
      });
      setRecentPayments(res.data.data || []);
      setPaymentsTotal(res.data.total || 0);
    } catch (e: any) {
      setRecentPayments([]);
      setPaymentsTotal(0);
      setPaymentsError(e?.response?.data?.message || "Unable to load recent payments.");
    } finally {
      setPaymentsLoading(false);
    }
  };

  const fetchBankDetails = async () => {
    setBankLoading(true);
    try {
      const res = await authApi.get<BankDetailsResponse>("/bursar-dashboard/bank-details");
      setBankDetails(res.data.data || []);
    } catch {
      setBankDetails([]);
    } finally {
      setBankLoading(false);
    }
  };

  const loadDashboard = async (secId: string) => {
    setLoading(true);
    try {
      const params = secId ? { section_id: secId } : {};
      const [sess, summary, breakdown, secBreakdown, trendRes] = await Promise.all([
        authApi.get<CurrentSessionTermResponse>("/current-session-term"),
        authApi.get<DashboardSummaryResponse>("/bursar-dashboard/summary", { params }),
        authApi.get<PaymentMethodResponse>("/bursar-dashboard/payment-method-breakdown", { params }),
        authApi.get<{ sections: SectionBreakdownItem[] }>("/bursar-dashboard/section-breakdown", { params }).catch(() => ({ data: { sections: [] } })),
        authApi.get<{ trend: any[]; total_recovered: number }>("/bursar-dashboard/revenue-trend", { params }).catch(() => ({ data: { trend: [], total_recovered: 0 } })),
        fetchRecentPayments(1, secId),
        fetchBankDetails(),
      ]);

      authApi.get("/admin/ai/credits").then((r) => setAiCredits(r.data?.data || null)).catch(() => undefined);
      authApi.get("/fees/concessions/pending?per_page=1").then((r) => setPendingConcessionsCount(r.data?.pending_count ?? 0)).catch(() => undefined);
      setAcademicSession(sess.data.session || "");
      setCurrentTerm(sess.data.term || "");

      const s = (summary.data as any).metrics || summary.data.summary;
      const gross = Number(s.total_gross_billed ?? s.gross_billed ?? s.total_billed ?? 0);
      const discounts = Number(s.total_discounts_granted ?? s.discounts_granted ?? 0);
      const net = Number(s.total_billed ?? s.net_billed ?? gross - discounts);
      const paid = Number(s.total_paid ?? s.total_collected ?? s.paidAmount ?? 0);
      const outstanding = Number(s.total_outstanding ?? s.outstanding_balance ?? s.outstandingAmount ?? 0);
      const rate = net > 0 ? Math.round((paid / net) * 1000) / 10 : 0;

      setMetrics({
        grossBilled: gross,
        discountsGranted: discounts,
        netBilled: net,
        paidAmount: paid,
        outstandingAmount: outstanding,
        collectionRate: rate,
        transactions: s.total_transactions,
      });

      setSummaryMeta({
        paid_students_count: s.paid_students_count,
        owing_students_count: s.owing_students_count,
      });

      setAvailableSections(summary.data.available_sections || []);
      setActiveSection(summary.data.active_section || null);
      setIsScopedBursar(Boolean(summary.data.is_scoped_bursar));
      setSectionBreakdown(secBreakdown.data?.sections || []);

      const breakdownData = breakdown.data.data || [];
      setChartLabels(breakdownData.map((x) => x.method || "Unknown"));
      setChartData(breakdownData.map((x) => Number(x.total_amount || 0)));

      if (trendRes.data?.trend) {
        setBursarTrendPoints(trendRes.data.trend);
      }
    } catch (err) {
      console.error("Dashboard load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard(selectedSectionId);
  }, [selectedSectionId]);

  useEffect(() => {
    if (!bursarLineChartRef.current) return;
    const ctx = bursarLineChartRef.current.getContext("2d");
    if (!ctx) return;

    bursarLineChartInst.current?.destroy();

    const points = bursarTrendPoints.length > 0
      ? bursarTrendPoints
      : metrics.paidAmount > 0
      ? [
          { label: "Initial", amount: 0, cumulative: 0 },
          { label: "Today", amount: metrics.paidAmount, cumulative: metrics.paidAmount }
        ]
      : [];

    const labels = points.map((p: any) => p.label);
    const dataValues = points.map((p: any) => (bursarTrendMode === "cumulative" ? p.cumulative : p.amount));

    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, "rgba(16, 185, 129, 0.35)");
    gradient.addColorStop(0.7, "rgba(16, 185, 129, 0.05)");
    gradient.addColorStop(1, "rgba(16, 185, 129, 0.0)");

    bursarLineChartInst.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels.length > 0 ? labels : ["No Records"],
        datasets: [
          {
            label: bursarTrendMode === "cumulative" ? "Cumulative Recovery (₦)" : "Daily Inflow (₦)",
            data: dataValues.length > 0 ? dataValues : [0],
            borderColor: "#10B981",
            backgroundColor: gradient,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#FFFFFF",
            pointBorderColor: "#059669",
            pointBorderWidth: 2.5,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#0F2744",
            titleFont: { size: 12, weight: "bold" },
            bodyFont: { size: 13 },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (context) => ` ${naira(context.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#64748B", font: { size: 11.5 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(226, 232, 240, 0.7)" },
            ticks: {
              color: "#64748B",
              font: { size: 11 },
              callback: (val) => `₦${Number(val).toLocaleString()}`,
            },
          },
        },
      },
    });

    return () => {
      bursarLineChartInst.current?.destroy();
    };
  }, [bursarTrendPoints, bursarTrendMode, metrics.paidAmount]);

  useEffect(() => {
    fetchRecentPayments(paymentPage, selectedSectionId);
  }, [paymentPage]);

  useEffect(() => {
    if (!chartRef.current) return;
    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    chartInst.current?.destroy();

    chartInst.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: chartLabels,
        datasets: [
          {
            label: "Amount Received (₦)",
            data: chartData,
            backgroundColor: (context) => {
              const g = context.chart.ctx.createLinearGradient(0, 0, 0, 260);
              g.addColorStop(0, "rgba(245, 158, 11, 0.88)");
              g.addColorStop(1, "rgba(245, 158, 11, 0.20)");
              return g;
            },
            borderRadius: 6,
            barThickness: 32,
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
              label: (item) => ` Collected: ${naira(item.parsed.y)}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (v) => naira(Number(v)),
              font: { size: 11 },
            },
            grid: { color: "rgba(0,0,0,0.04)" },
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 } },
          },
        },
      },
    });

    return () => {
      chartInst.current?.destroy();
    };
  }, [chartLabels, chartData]);

  return (
    <>
      <style>{`
        :root {
          --sp-navy: #0f2744;
          --sp-accent: #d97706;
          --sp-border: #e2e8f0;
          --sp-light: #f8fafc;
          --sp-radius: 14px;
        }

        .sp-dash-main {
          background: #f8fafc;
          min-height: 100vh;
          padding-top: calc(var(--gq-topnav-height, 66px) + 24px) !important;
          padding-bottom: 54px !important;
        }
        @media (min-width: 768px) {
          .sp-dash-main {
            padding-left: 28px !important;
            padding-right: 28px !important;
            width: calc(100% - var(--gq-sidebar-width, 280px)) !important;
            max-width: calc(100% - var(--gq-sidebar-width, 280px)) !important;
            margin-left: auto !important;
          }
          .gq-sidebar-collapsed .sp-dash-main {
            width: calc(100% - var(--gq-sidebar-collapsed-width, 86px)) !important;
            max-width: calc(100% - var(--gq-sidebar-collapsed-width, 86px)) !important;
          }
        }
        @media (max-width: 767.98px) {
          .sp-dash-main {
            width: 100% !important;
            max-width: 100% !important;
            padding-top: calc(var(--gq-topnav-height, 66px) + 16px) !important;
            padding-left: 14px !important;
            padding-right: 14px !important;
          }
        }

        /* Scope & Section Controls */
        .sp-scope-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          padding: 12px 18px;
          background: rgba(37,99,235,0.06);
          border: 1px solid rgba(37,99,235,0.20);
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .sp-section-tabs-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 20px;
          padding: 8px 12px;
          background: #fff;
          border: 1px solid var(--sp-border);
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .sp-section-tabs-label {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-right: 6px;
          display: flex;
          align-items: center;
        }
        .sp-section-tab {
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: #f1f5f9;
          color: #475569;
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .sp-section-tab:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .sp-section-tab--active {
          background: var(--sp-navy);
          color: #ffffff;
          border-color: var(--sp-navy);
          font-weight: 600;
        }

        /* Hero Banner */
        .sp-hero {
          position: relative;
          background: linear-gradient(135deg, #0f2744 0%, #1e3a5f 60%, #172554 100%);
          border-radius: var(--sp-radius);
          padding: 28px 32px;
          overflow: hidden;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
        }
        .sp-hero-glow {
          position: absolute;
          top: -60px; right: -60px;
          width: 320px; height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217,119,6,0.18) 0%, transparent 65%);
          pointer-events: none;
        }
        .sp-hero-inner {
          position: relative; z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 32px;
          flex-wrap: wrap;
        }
        .sp-session-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #FBBF24;
          background: rgba(217,119,6,0.22);
          border: 1px solid rgba(217,119,6,0.4);
          border-radius: 100px;
          padding: 4px 12px;
          margin-bottom: 12px;
        }
        .sp-session-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22c55e;
          animation: spPulse 2s ease infinite;
        }
        @keyframes spPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: .4; transform: scale(1.4); }
        }
        .sp-greeting {
          font-size: 26px;
          font-weight: 800;
          color: #fff;
          line-height: 1.1;
          margin-bottom: 8px;
        }
        .sp-greeting em { font-style: normal; color: #FBBF24; }
        .sp-hero-sub {
          font-size: 13.5px;
          color: #CBD5E1;
          line-height: 1.6;
          max-width: 540px;
          margin-bottom: 20px;
        }
        .sp-btn-gold, .sp-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 10px;
          cursor: pointer;
          white-space: nowrap;
          transition: all .2s ease;
        }
        .sp-btn-gold {
          color: #FFFFFF;
          background: var(--sp-accent);
          border: none;
        }
        .sp-btn-gold:hover { background: #b45309; transform: translateY(-1px); }
        .sp-btn-outline {
          color: #FFFFFF;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.20);
        }
        .sp-btn-outline:hover {
          background: rgba(255,255,255,0.18);
          color: #fff;
        }

        .sp-hero-stat-card {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(8px);
          border-radius: var(--sp-radius);
          padding: 20px 24px;
          min-width: 230px;
        }
        .sp-hero-stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }
        .sp-hero-stat-label { font-size: 12px; color: #CBD5E1; }
        .sp-hero-stat-val { font-size: 18px; font-weight: 800; color: #FBBF24; }
        .sp-hero-stat-sep { height: 1px; background: rgba(255,255,255,0.08); margin: 10px 0; }

        /* 5 Stats Cards Grid */
        .sp-stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        @media (max-width: 1400px) { .sp-stats-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 991.98px) { .sp-stats-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 575.98px)  { .sp-stats-grid { grid-template-columns: 1fr; } }

        .sp-stat-card {
          background: #fff;
          border: 1px solid var(--sp-border);
          border-radius: var(--sp-radius);
          padding: 20px 20px 18px;
          position: relative;
          overflow: hidden;
          transition: box-shadow .25s, transform .25s;
        }
        .sp-stat-card:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          transform: translateY(-2px);
        }
        .sp-stat-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3.5px;
          background: var(--card-color);
        }
        .sp-stat-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .sp-stat-icon {
          width: 38px; height: 38px;
          border-radius: 9px;
          background: var(--card-bg);
          color: var(--card-color);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sp-stat-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 20px;
          background: var(--card-bg);
          color: var(--card-color);
        }
        .sp-stat-label { font-size: 12px; font-weight: 500; color: #64748b; margin-bottom: 4px; }
        .sp-stat-val { font-size: 21px; font-weight: 800; color: #0f172a; line-height: 1.2; }
        .sp-stat-footer {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #f1f5f9;
          font-size: 11.5px;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        /* Panel Common */
        .sp-panel {
          background: #fff;
          border: 1px solid var(--sp-border);
          border-radius: var(--sp-radius);
          overflow: hidden;
          margin-bottom: 24px;
        }
        .sp-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          gap: 12px;
          flex-wrap: wrap;
        }
        .sp-panel-icon {
          width: 36px; height: 36px;
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          background: var(--pi); color: var(--pc);
          flex-shrink: 0;
        }
        .sp-panel-title { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0; }
        .sp-panel-sub   { font-size: 12px; color: #64748b; margin: 0; }

        /* Tables */
        .sp-table { width: 100%; border-collapse: collapse; }
        .sp-table th {
          padding: 11px 16px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: #64748b;
          background: #f8fafc;
          border-bottom: 1px solid var(--sp-border);
          text-align: left;
          white-space: nowrap;
        }
        .sp-table td {
          padding: 13px 16px;
          font-size: 13px;
          color: #334155;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .sp-table tbody tr:hover { background: #f8fafc; }
        .sp-table tbody tr:last-child td { border-bottom: none; }
        .sp-table-empty { padding: 48px 16px; text-align: center; color: #94a3b8; font-size: 13px; }

        .sp-badge {
          display: inline-flex; align-items: center;
          font-size: 11.5px; font-weight: 600;
          padding: 3px 10px; border-radius: 100px;
        }
        .sp-badge--blue   { background: rgba(37,99,235,0.08); color: #1d4ed8; }
        .sp-badge--green  { background: rgba(34,197,94,0.10); color: #15803d; }
        .sp-badge--amber  { background: rgba(245,158,11,0.10); color: #b45309; }
        .sp-badge--violet { background: rgba(124,58,237,0.08); color: #6d28d9; }

        .sp-prog-bar {
          height: 6px; border-radius: 3px; background: #e2e8f0; overflow: hidden; margin-top: 4px; width: 100px;
        }
        .sp-prog-fill { height: 100%; border-radius: 3px; background: #22c55e; }

        .sp-chart-wrap { padding: 20px; height: 280px; }

        .pfc-trend-toggle {
          display: inline-flex;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 3px;
          gap: 2px;
        }
        .pfc-trend-btn {
          background: transparent;
          border: none;
          border-radius: 8px;
          padding: 6px 13px;
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
        }
        .pfc-trend-btn:hover { color: #0f2744; }
        .pfc-trend-btn.active {
          background: #ffffff;
          color: #0f2744;
          font-weight: 700;
          box-shadow: 0 2px 6px rgba(15, 39, 68, 0.08);
        }
        .pfc-trend-stat-chip {
          background: rgba(34, 197, 94, 0.08);
          border: 1px solid rgba(34, 197, 94, 0.25);
          border-radius: 10px;
          padding: 5px 12px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          line-height: 1.2;
        }
        .pfc-trend-stat-label {
          font-size: 10px;
          color: #15803d;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .pfc-trend-stat-val {
          font-size: 15px;
          font-weight: 800;
        }

        /* Actions & Bank Cards */
        .sp-actions-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        @media (max-width: 768px) { .sp-actions-grid { grid-template-columns: 1fr; } }

        .sp-action-card {
          background: #fff;
          border: 1px solid var(--sp-border);
          border-radius: var(--sp-radius);
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          transition: all .2s ease;
          text-decoration: none;
          color: inherit;
        }
        .sp-action-card:hover {
          box-shadow: 0 6px 20px rgba(0,0,0,0.06);
          transform: translateY(-2px);
        }
        .sp-action-icon {
          width: 44px; height: 44px;
          border-radius: 10px;
          background: var(--ac-bg);
          color: var(--ac-color);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .sp-bank-card {
          border: 1px solid var(--sp-border);
          border-radius: 10px;
          padding: 14px;
          background: #fff;
          margin-bottom: 10px;
        }
        .sp-bank-label {
          font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 2px;
        }
        .sp-bank-val { font-size: 14px; font-weight: 700; color: #0f172a; }

        .sp-spin { animation: spSpin .8s linear infinite; }
        @keyframes spSpin { to { transform: rotate(360deg); } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Bursar Financial Dashboard — SchoolProfit" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto gq-app-main db-main sp-dash-main d-flex flex-column min-vh-100">
            {loading && <Loader message="Loading financial records…" />}

            {/* SECTION SCOPING BAR / BANNER */}
            {isScopedBursar && (
              <div className="sp-scope-banner">
                <div className="d-flex align-items-center gap-2">
                  <span className="sp-badge sp-badge--blue">
                    🔒 Section Scoped Access
                  </span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                    {activeSection?.name ? `${activeSection.name} Section Financial Ledger` : "Assigned Sections Financial Ledger"}
                  </span>
                </div>
                <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                  Strict section segregation active: Only records for your assigned {activeSection?.name ? `section (${activeSection.name})` : `sections (${availableSections.map((s) => s.name).join(", ")})`} are accessible to your bursar account.
                </span>
              </div>
            )}

            {availableSections.length > 1 && (
              <div className="sp-section-tabs-bar">
                <span className="sp-section-tabs-label">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="me-1">
                    <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                    <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                    <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                    <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                  Financial Scope:
                </span>
                <button
                  className={`sp-section-tab ${selectedSectionId === "" ? "sp-section-tab--active" : ""}`}
                  onClick={() => setSelectedSectionId("")}
                >
                  {isScopedBursar ? "All Assigned Sections" : "All Sections (Consolidated)"}
                </button>
                {availableSections.map((sec) => (
                  <button
                    key={sec.id}
                    className={`sp-section-tab ${selectedSectionId === String(sec.id) ? "sp-section-tab--active" : ""}`}
                    onClick={() => setSelectedSectionId(String(sec.id))}
                  >
                    {sec.name} Section
                  </button>
                ))}
              </div>
            )}

            {/* PENDING CONCESSIONS ALERT BANNER FOR SCHOOL OWNER */}
            {pendingConcessionsCount > 0 && !isScopedBursar && (
              <div
                style={{
                  background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                  border: "1px solid #fde68a",
                  borderRadius: 14,
                  padding: "16px 22px",
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 14,
                  boxShadow: "0 4px 14px rgba(217, 119, 6, 0.09)",
                }}
              >
                <div className="d-flex align-items-center gap-3">
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "rgba(217, 119, 6, 0.15)",
                      color: "#b45309",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    🛡️
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: "#92400e", fontSize: 14.5 }}>
                      {pendingConcessionsCount} Pending Concession / Scholarship {pendingConcessionsCount === 1 ? "Request" : "Requests"} Awaiting Your Approval
                    </div>
                    <div style={{ fontSize: 12.5, color: "#b45309", marginTop: 2 }}>
                      Bursars have submitted tuition discount requests that require your signoff as School Owner before legal balance deductions occur.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background: "#d97706",
                    color: "#fff",
                    fontWeight: 700,
                    borderRadius: 8,
                    padding: "8px 18px",
                    border: "none",
                    boxShadow: "0 2px 8px rgba(217, 119, 6, 0.25)",
                  }}
                  onClick={() => navigate("/fees/concessions")}
                >
                  Review & Approve Now →
                </button>
              </div>
            )}

            {/* HERO BANNER */}
            <div className="sp-hero">
              <div className="sp-hero-glow" aria-hidden="true" />
              <div className="sp-hero-inner">
                <div>
                  <div className="sp-session-badge">
                    <span className="sp-session-dot" />
                    {academicSession || "Current Session"} — {currentTerm || "Current Term"}
                    {activeSection ? ` • ${activeSection.name} Section` : isScopedBursar ? " • Assigned Sections" : " • Consolidated View"}
                  </div>

                  <h1 className="sp-greeting">
                    {getGreeting()}, <em>Bursar.</em>
                  </h1>

                  <p className="sp-hero-sub">
                    Welcome to the <strong>SchoolProfit</strong> Financial Command Center.
                    Track gross tuition billing, concession deductions, net collections, and past debt roll-forwards in real-time.
                  </p>

                  <div className="d-flex flex-wrap gap-2">
                    <button className="sp-btn-gold" onClick={() => navigate("/fees/payments")}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="4" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                        <path d="M2 7h12" stroke="currentColor" strokeWidth="1.3" />
                      </svg>
                      Record Fee Payment
                    </button>

                    <button className="sp-btn-outline" onClick={() => navigate("/fees/payments")}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M3 2.5h10v11H3z" stroke="currentColor" strokeWidth="1.3" />
                        <path d="M5 5.5h6M5 8h6M5 10.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                      Student Fees & Payments
                    </button>

                    {!isScopedBursar && (
                      <button
                        className="btn btn-sm d-inline-flex align-items-center gap-2"
                        style={{
                          background: pendingConcessionsCount > 0 ? "#d97706" : "rgba(255,255,255,0.12)",
                          color: "#fff",
                          fontWeight: 700,
                          borderRadius: 8,
                          padding: "8px 16px",
                          border: "1px solid rgba(255,255,255,0.25)",
                          transition: "all 0.18s",
                        }}
                        onClick={() => navigate("/fees/concessions")}
                      >
                        <span>🛡️ Concession Approvals</span>
                        {pendingConcessionsCount > 0 && (
                          <span
                            style={{
                              background: "#ef4444",
                              color: "#fff",
                              borderRadius: 100,
                              padding: "1px 7px",
                              fontSize: 11,
                              fontWeight: 800,
                            }}
                          >
                            {pendingConcessionsCount}
                          </span>
                        )}
                      </button>
                    )}

                    <button className="sp-btn-outline" onClick={() => navigate("/fees/ai-collection")}>
                      <i className="bi bi-robot me-1 text-warning" />
                      AI Fee Assistant
                    </button>
                    <button className="sp-btn-outline" onClick={() => navigate("/settings/ai-credits")}>
                      <i className="bi bi-stars me-1 text-warning" />
                      AI Credits
                    </button>
                  </div>
                </div>

                <div className="sp-hero-stat-card d-none d-md-block">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--sp-accent)" }}>
                      Collection Pulse
                    </span>
                  </div>
                  <div>
                    <div className="sp-hero-stat-item">
                      <span className="sp-hero-stat-label">Students Paid</span>
                      <span className="sp-hero-stat-val">{summaryMeta.paid_students_count}</span>
                    </div>
                    <div className="sp-hero-stat-sep" />
                    <div className="sp-hero-stat-item">
                      <span className="sp-hero-stat-label">Students Owing</span>
                      <span className="sp-hero-stat-val" style={{ color: "#f87171" }}>{summaryMeta.owing_students_count}</span>
                    </div>
                    <div className="sp-hero-stat-sep" />
                    <div className="sp-hero-stat-item">
                      <span className="sp-hero-stat-label">Collection Rate</span>
                      <span className="sp-hero-stat-val" style={{ color: "#4ade80" }}>{metrics.collectionRate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5-METRIC FINANCIAL CARDS */}
            <div className="sp-stats-grid">
              {/* Card 1: Gross Billed */}
              <div
                className="sp-stat-card"
                style={
                  {
                    "--card-color": "rgb(217,119,6)",
                    "--card-bg": "rgba(217,119,6,0.10)",
                  } as React.CSSProperties
                }
              >
                <div className="sp-stat-head">
                  <div className="sp-stat-icon">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <path d="M4 4h12v12H4z" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M4 8h12M8 12h4" stroke="currentColor" strokeWidth="1.3" />
                    </svg>
                  </div>
                  <span className="sp-stat-badge">Gross</span>
                </div>
                <div className="sp-stat-label">Gross Tuition & Levies</div>
                <div className="sp-stat-val">{naira(metrics.grossBilled)}</div>
                <div className="sp-stat-footer">
                  <span>Standard published tuition</span>
                </div>
              </div>

              {/* Card 2: Concessions / Scholarships */}
              <div
                className="sp-stat-card"
                style={
                  {
                    "--card-color": "rgb(124,58,237)",
                    "--card-bg": "rgba(124,58,237,0.10)",
                  } as React.CSSProperties
                }
              >
                <div className="sp-stat-head">
                  <div className="sp-stat-icon">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M7 13l6-6M8 8h.01M12 12h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="sp-stat-badge">Discounts</span>
                </div>
                <div className="sp-stat-label">Concessions & Scholarships</div>
                <div className="sp-stat-val" style={{ color: "rgb(124,58,237)" }}>
                  -{naira(metrics.discountsGranted)}
                </div>
                <div className="sp-stat-footer">
                  <span>Staff child & sibling relief</span>
                </div>
              </div>

              {/* Card 3: Net Realizable Revenue */}
              <div
                className="sp-stat-card"
                style={
                  {
                    "--card-color": "rgb(37,99,235)",
                    "--card-bg": "rgba(37,99,235,0.10)",
                  } as React.CSSProperties
                }
              >
                <div className="sp-stat-head">
                  <div className="sp-stat-icon">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <rect x="3" y="5" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M3 9h14" stroke="currentColor" strokeWidth="1.3" />
                      <circle cx="13" cy="12" r="1" fill="currentColor" />
                    </svg>
                  </div>
                  <span className="sp-stat-badge">Net Payable</span>
                </div>
                <div className="sp-stat-label">Net Realizable Revenue</div>
                <div className="sp-stat-val">{naira(metrics.netBilled)}</div>
                <div className="sp-stat-footer">
                  <span>Gross minus concessions</span>
                </div>
              </div>

              {/* Card 4: Total Collected */}
              <div
                className="sp-stat-card"
                style={
                  {
                    "--card-color": "rgb(21,128,61)",
                    "--card-bg": "rgba(34,197,94,0.10)",
                  } as React.CSSProperties
                }
              >
                <div className="sp-stat-head">
                  <div className="sp-stat-icon">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="sp-stat-badge" style={{ color: "#15803d", background: "rgba(34,197,94,0.12)" }}>
                    {metrics.collectionRate}%
                  </span>
                </div>
                <div className="sp-stat-label">Realized Cash Collections</div>
                <div className="sp-stat-val" style={{ color: "#15803d" }}>
                  {naira(metrics.paidAmount)}
                </div>
                <div className="sp-stat-footer">
                  <span>{metrics.transactions} transactions logged</span>
                </div>
              </div>

              {/* Card 5: Outstanding Arrears */}
              <div
                className="sp-stat-card"
                style={
                  {
                    "--card-color": "rgb(220,38,38)",
                    "--card-bg": "rgba(239,68,68,0.10)",
                  } as React.CSSProperties
                }
              >
                <div className="sp-stat-head">
                  <div className="sp-stat-icon">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M10 6v4M10 13h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="sp-stat-badge" style={{ color: "#dc2626", background: "rgba(239,68,68,0.12)" }}>
                    Owing
                  </span>
                </div>
                <div className="sp-stat-label">Outstanding Arrears</div>
                <div className="sp-stat-val" style={{ color: "#dc2626" }}>
                  {naira(metrics.outstandingAmount)}
                </div>
                <div className="sp-stat-footer">
                  <span>{summaryMeta.owing_students_count} students owing</span>
                </div>
              </div>
            </div>

            {/* COMPARATIVE SECTION BREAKDOWN (Section Reconciliation) */}
            {sectionBreakdown.length > 0 && (
              <div className="sp-panel">
                <div className="sp-panel-head">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="sp-panel-icon"
                      style={{ "--pi": "rgba(37,99,235,0.10)", "--pc": "rgb(37,99,235)" } as React.CSSProperties}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 13h12M4 10V6M8 10V3M12 10V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="sp-panel-title">
                        {sectionBreakdown.length > 1
                          ? (isScopedBursar ? "Assigned Sections Reconciliation" : "Comparative Section Reconciliation")
                          : `${sectionBreakdown[0].section_name} Section Audit & Reconciliation`}
                      </p>
                      <p className="sp-panel-sub">
                        {sectionBreakdown.length > 1
                          ? (isScopedBursar
                              ? `Audit breakdown strictly isolated to your assigned sections (${sectionBreakdown.map((s) => s.section_name).join(", ")}): Revenue, collections & arrears`
                              : "Multi-section audit breakdown: Section revenue performance, collections & arrears")
                          : `Designated section audit breakdown: ${sectionBreakdown[0].section_name} section revenue, collections & arrears`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-auto">
                  <table className="sp-table">
                    <thead>
                      <tr>
                        <th>Section</th>
                        <th>Gross Billed</th>
                        <th>Concessions</th>
                        <th>Net Payable</th>
                        <th>Collected (Cash)</th>
                        <th>Outstanding</th>
                        <th>Efficiency</th>
                        {sectionBreakdown.length > 1 && <th style={{ textAlign: "right" }}>Focus</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {sectionBreakdown.map((s) => (
                        <tr key={s.section_id}>
                          <td>
                            <strong>{s.section_name} Section</strong>
                            <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                              {s.total_students} students ({s.owing_students} owing)
                            </div>
                          </td>
                          <td>{naira(s.gross_billed)}</td>
                          <td style={{ color: "rgb(124,58,237)" }}>
                            {s.discounts > 0 ? `-${naira(s.discounts)}` : "—"}
                          </td>
                          <td style={{ fontWeight: 600 }}>{naira(s.net_billed)}</td>
                          <td style={{ color: "#15803d", fontWeight: 700 }}>{naira(s.paid)}</td>
                          <td style={{ color: s.balance > 0 ? "#dc2626" : "#64748b" }}>
                            {naira(s.balance)}
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <span style={{ fontSize: "12px", fontWeight: 700 }}>
                                {s.collection_rate}%
                              </span>
                              <div className="sp-prog-bar">
                                <div
                                  className="sp-prog-fill"
                                  style={{ width: `${Math.min(100, s.collection_rate)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          {sectionBreakdown.length > 1 && (
                            <td style={{ textAlign: "right" }}>
                              <button
                                type="button"
                                className="sp-btn-outline"
                                style={{
                                  padding: "4px 10px",
                                  fontSize: "11.5px",
                                  color: "#0f2744",
                                  borderColor: "#cbd5e1",
                                  background: "#f8fafc",
                                }}
                                onClick={() => setSelectedSectionId(String(s.section_id))}
                              >
                                Filter →
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* REVENUE COLLECTION & RECOVERY TRAJECTORY LINE GRAPH */}
            <div className="sp-panel mb-4">
              <div className="sp-panel-head flex-wrap gap-2">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="sp-panel-icon"
                    style={{ "--pi": "rgba(34,197,94,0.10)", "--pc": "rgb(21,128,61)" } as React.CSSProperties}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 13h12M4 10l3-4 3 2 4-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="sp-panel-title">Revenue Recovery & Inflow Trajectory</p>
                    <p className="sp-panel-sub">
                      {activeSection ? `${activeSection.name} section continuous recovery timeline` : "Real-time timeline of verified school fee receipts and cumulative collections"}
                    </p>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <div className="pfc-trend-toggle">
                    <button
                      type="button"
                      className={`pfc-trend-btn ${bursarTrendMode === "daily" ? "active" : ""}`}
                      onClick={() => setBursarTrendMode("daily")}
                    >
                      Daily Inflow
                    </button>
                    <button
                      type="button"
                      className={`pfc-trend-btn ${bursarTrendMode === "cumulative" ? "active" : ""}`}
                      onClick={() => setBursarTrendMode("cumulative")}
                    >
                      Cumulative Recovery
                    </button>
                  </div>

                  <div className="pfc-trend-stat-chip">
                    <span className="pfc-trend-stat-label">Total Recovered</span>
                    <strong className="pfc-trend-stat-val text-success">
                      {naira(metrics.paidAmount)}
                    </strong>
                  </div>
                </div>
              </div>

              <div style={{ height: 260, width: "100%", position: "relative", marginTop: 10 }}>
                <canvas ref={bursarLineChartRef} />
              </div>
            </div>

            {/* RECENT PAYMENTS & PAYMENT METHOD BREAKDOWN */}
            <div className="row g-4 mb-4">
              <div className="col-lg-7">
                <div className="sp-panel h-100 mb-0">
                  <div className="sp-panel-head">
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="sp-panel-icon"
                        style={{ "--pi": "rgba(217,119,6,0.10)", "--pc": "rgb(180,83,9)" } as React.CSSProperties}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <rect x="2" y="4" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                          <path d="M2 7h12" stroke="currentColor" strokeWidth="1.2" />
                        </svg>
                      </div>
                      <div>
                        <p className="sp-panel-title">Recent Fee Receipts</p>
                        <p className="sp-panel-sub">
                          {activeSection ? `${activeSection.name} section transactions` : "Latest recorded school payments"}
                        </p>
                      </div>
                    </div>

                    <button
                      className="sp-btn-outline"
                      style={{ padding: "5px 12px", fontSize: "12px", color: "#475569", borderColor: "#cbd5e1" }}
                      onClick={() => fetchRecentPayments(paymentPage, selectedSectionId)}
                      disabled={paymentsLoading}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 14 14"
                        fill="none"
                        className={paymentsLoading ? "sp-spin" : ""}
                        style={{ marginRight: 4 }}
                      >
                        <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {paymentsLoading ? "Loading…" : "Refresh"}
                    </button>
                  </div>

                  {paymentsError && (
                    <div style={{ padding: "12px 20px", color: "#dc2626", fontSize: 13 }}>
                      {paymentsError}
                    </div>
                  )}

                  <div className="overflow-auto">
                    <table className="sp-table">
                      <thead>
                        <tr>
                          <th>Ref & Receipt</th>
                          <th>Student</th>
                          <th>Section</th>
                          <th>Method</th>
                          <th>Date</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentsLoading ? (
                          Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i}>
                              <td colSpan={6} style={{ padding: "14px 16px" }}>
                                <div style={{ height: 14, background: "#f1f5f9", borderRadius: 4 }} />
                              </td>
                            </tr>
                          ))
                        ) : recentPayments.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="sp-table-empty">
                              No recent payments found for this section.
                            </td>
                          </tr>
                        ) : (
                          recentPayments.map((p) => (
                            <tr key={p.id}>
                              <td style={{ fontSize: 12, color: "#64748b" }}>
                                <div style={{ fontWeight: 600, color: "#0f172a" }}>{p.reference}</div>
                                <span style={{ fontSize: "11px", color: "#94a3b8" }}>Receipt #{p.id}</span>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, color: "#0f172a" }}>{p.student_name}</div>
                                <div style={{ fontSize: 11.5, color: "#64748b" }}>{p.admission_no}</div>
                              </td>
                              <td>
                                <span className="sp-badge sp-badge--blue">
                                  {p.section_name || "General"}
                                </span>
                              </td>
                              <td>
                                <span className="sp-badge sp-badge--amber">
                                  {p.payment_method || "Cash / Bank"}
                                </span>
                              </td>
                              <td>{fmtDate(p.created_at)}</td>
                              <td>
                                <span style={{ fontWeight: 700, color: "#15803d" }}>
                                  {naira(p.amount)}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="d-flex align-items-center justify-content-between p-3 border-top">
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>{paymentsTotal} records logged</span>
                    <div className="d-flex align-items-center gap-2">
                      <button
                        className="sp-btn-outline"
                        style={{ padding: "4px 10px", fontSize: "12px", color: "#475569" }}
                        onClick={() => setPaymentPage((p) => Math.max(1, p - 1))}
                        disabled={paymentPage <= 1 || paymentsLoading}
                      >
                        Prev
                      </button>
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        {paymentPage} / {totalPages}
                      </span>
                      <button
                        className="sp-btn-outline"
                        style={{ padding: "4px 10px", fontSize: "12px", color: "#475569" }}
                        onClick={() => setPaymentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={paymentPage >= totalPages || paymentsLoading}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* PAYMENT METHOD BAR CHART */}
              <div className="col-lg-5">
                <div className="sp-panel h-100 mb-0 d-flex flex-column">
                  <div className="sp-panel-head">
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="sp-panel-icon"
                        style={{ "--pi": "rgba(34,197,94,0.10)", "--pc": "rgb(21,128,61)" } as React.CSSProperties}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M2 12V8M5 12V5M8 12V7M11 12V3M14 12V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div>
                        <p className="sp-panel-title">Collections by Channel</p>
                        <p className="sp-panel-sub">Bank Transfer, Cash, POS, Paystack</p>
                      </div>
                    </div>
                  </div>

                  <div className="sp-chart-wrap flex-grow-1">
                    <canvas ref={chartRef} />
                  </div>
                </div>
              </div>
            </div>

            {/* BANK DETAILS & QUICK ACTIONS */}
            <div className="row g-4">
              <div className="col-lg-6">
                <div className="sp-panel mb-0">
                  <div className="sp-panel-head">
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="sp-panel-icon"
                        style={{ "--pi": "rgba(37,99,235,0.10)", "--pc": "rgb(37,99,235)" } as React.CSSProperties}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <rect x="2" y="4" width="12" height="8" rx="1.4" stroke="currentColor" strokeWidth="1.3" />
                          <path d="M2 7h12" stroke="currentColor" strokeWidth="1.2" />
                        </svg>
                      </div>
                      <div>
                        <p className="sp-panel-title">Official School Bank Accounts</p>
                        <p className="sp-panel-sub">Verified accounts for direct parent fee deposits</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: "16px 20px" }}>
                    {bankLoading ? (
                      <div style={{ fontSize: 13, color: "#94a3b8" }}>Loading bank details…</div>
                    ) : bankDetails.length === 0 ? (
                      <div className="sp-table-empty">No designated bank accounts configured.</div>
                    ) : (
                      bankDetails.map((b, i) => (
                        <div className="sp-bank-card" key={i}>
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <div className="sp-bank-label">Bank Name</div>
                              <div className="sp-bank-val">{b.bank_name || "N/A"}</div>
                            </div>
                            <span className="sp-badge sp-badge--green">Active Account</span>
                          </div>
                          <div className="mt-2" style={{ fontSize: 13, color: "#475569" }}>
                            <strong>Account No:</strong>{" "}
                            <span style={{ fontFamily: "monospace", fontSize: 14 }}>
                              {b.account_number || "N/A"}
                            </span>
                          </div>
                          <div style={{ fontSize: 12.5, color: "#64748b" }}>
                            <strong>Account Name:</strong> {b.account_name || "N/A"}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="col-lg-6">
                <div className="sp-panel mb-0">
                  <div className="sp-panel-head">
                    <div>
                      <p className="sp-panel-title">Finance Fast Actions</p>
                      <p className="sp-panel-sub">Quick shortcuts to core financial operations</p>
                    </div>
                  </div>
                  <div style={{ padding: "16px 20px" }}>
                    <div className="sp-actions-grid">
                      {QUICK_ACTIONS.map((a) => (
                        <a
                          key={a.label}
                          href={a.path}
                          className="sp-action-card"
                          style={
                            {
                              "--ac-color": a.color,
                              "--ac-bg": a.bg,
                            } as React.CSSProperties
                          }
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(a.path);
                          }}
                        >
                          <div className="sp-action-icon">{a.icon}</div>
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
                              {a.label}
                            </div>
                            <div style={{ fontSize: 11.5, color: "#64748b" }}>{a.desc}</div>
                          </div>
                        </a>
                      ))}
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