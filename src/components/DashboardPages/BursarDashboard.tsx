import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { authApi } from "../../utils/axios";
import TopNav from "../LayoutComponents/TopNav";
import Sidebar from "../LayoutComponents/Sidebar";
import Footer from "../LayoutComponents/Footer";
import Loader from "../ui/dashboardLoader";
import { useNavigate } from "react-router-dom";
import PageTitle from "../PageTitle";

interface FinanceStat {
  title: string;
  value: string | number;
  icon: string;
}

interface CurrentSessionTermResponse {
  session: string;
  term: string;
}

interface DashboardSummaryResponse {
  summary: {
    total_billed: number;
    total_paid: number;
    total_outstanding: number;
    total_transactions: number;
    paid_students_count: number;
    owing_students_count: number;
  };
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

const STAT_META = [
  { color: "var(--bs-warning,  rgb(245,158,11))", bg: "rgba(245,158,11,0.10)", label: "fees raised" },
  { color: "var(--bs-success,  rgb(34,197,94))",  bg: "rgba(34,197,94,0.10)",  label: "payments received" },
  { color: "var(--bs-danger,   rgb(239,68,68))",  bg: "rgba(239,68,68,0.10)",  label: "still outstanding" },
  { color: "var(--bs-primary,  rgb(211,0,176))",  bg: "rgba(211,0,176,0.08)",  label: "transactions logged" },
];

const QUICK_ACTIONS = [
  {
    label: "Record Payment",
    desc: "Log a new fee payment",
    color: "var(--bs-success, rgb(34,197,94))",
    bg: "rgba(34,197,94,0.10)",
    path: "/payments",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 14h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Student Fees",
    desc: "Manage student fee records",
    color: "var(--bs-warning, rgb(245,158,11))",
    bg: "rgba(245,158,11,0.10)",
    path: "/student-fees",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M2 19c0-3.314 2.686-6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M15 7h6M15 12h6M15 17h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
 
  {
    label: "Fee Reports",
    desc: "Review finance analytics",
    color: "var(--bs-primary, rgb(211,0,176))",
    bg: "rgba(211,0,176,0.08)",
    path: "/reports/finance",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M4 20V10M9 20V4M14 20v-7M19 20V7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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

  const [stats, setStats] = useState<FinanceStat[]>([
    { title: "Total Billed", value: naira(0), icon: "billed" },
    { title: "Total Paid", value: naira(0), icon: "paid" },
    { title: "Outstanding", value: naira(0), icon: "outstanding" },
    { title: "Transactions", value: 0, icon: "transactions" },
  ]);

  const [summaryMeta, setSummaryMeta] = useState({
    paid_students_count: 0,
    owing_students_count: 0,
  });

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

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(paymentsTotal / paymentLimit)),
    [paymentsTotal]
  );

  const totalFinanceUsers = summaryMeta.paid_students_count + summaryMeta.owing_students_count;

  const fetchRecentPayments = async (page: number) => {
    setPaymentsLoading(true);
    setPaymentsError(null);
    try {
      const res = await authApi.get<RecentPaymentsResponse>("/bursar-dashboard/recent-payments", {
        params: { limit: paymentLimit, page },
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

  useEffect(() => {
    setLoading(true);

    Promise.all([
      authApi.get<CurrentSessionTermResponse>("/current-session-term"),
      authApi.get<DashboardSummaryResponse>("/bursar-dashboard/summary"),
      authApi.get<PaymentMethodResponse>("/bursar-dashboard/payment-method-breakdown"),
      fetchRecentPayments(1),
      fetchBankDetails(),
    ])
      .then(([sess, summary, breakdown]) => {
        setAcademicSession(sess.data.session || "");
        setCurrentTerm(sess.data.term || "");

        const s = summary.data.summary;
        setStats([
          { title: "Total Billed", value: naira(s.total_billed), icon: "billed" },
          { title: "Total Paid", value: naira(s.total_paid), icon: "paid" },
          { title: "Outstanding", value: naira(s.total_outstanding), icon: "outstanding" },
          { title: "Transactions", value: s.total_transactions, icon: "transactions" },
        ]);
        setSummaryMeta({
          paid_students_count: s.paid_students_count,
          owing_students_count: s.owing_students_count,
        });

        const breakdownData = breakdown.data.data || [];
        setChartLabels(breakdownData.map((x) => x.method || "Unknown"));
        setChartData(breakdownData.map((x) => Number(x.total_amount || 0)));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRecentPayments(paymentPage);
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
            label: "Amount Received",
            data: chartData,
            backgroundColor: (ctx) => {
              const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 260);
              g.addColorStop(0, "rgba(255,200,87,0.88)");
              g.addColorStop(1, "rgba(255,200,87,0.20)");
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
            backgroundColor: "#050008",
            padding: 12,
            cornerRadius: 8,
            titleColor: "rgb(255,200,87)",
            bodyColor: "#94a3b8",
            callbacks: {
              label: (context) => ` ${naira(Number(context.raw || 0))}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 }, color: "#9a8a7a" },
            border: { display: false },
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(0,0,0,0.04)" },
            ticks: {
              font: { size: 11 },
              color: "#9a8a7a",
              callback: (value) => naira(Number(value)),
            },
            border: { display: false },
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
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500&display=swap');

        :root {
          --db-light:    var(--bs-light,     #fcf8f8);
          --db-dark:     var(--bs-dark,      #050008);
          --db-accent:   var(--bs-secondary, rgb(255,200,87));
          --db-magenta:  var(--bs-primary,   rgb(211,0,176));
          --db-success:  var(--bs-success,   rgb(34,197,94));
          --db-danger:   var(--bs-danger,    rgb(239,68,68));
          --db-border:   var(--bs-border-color, #ede8e0);
          --db-radius:   var(--bs-border-radius-lg, 14px);

          --db-accent-dim:    rgba(255,200,87,0.10);
          --db-accent-border: rgba(255,200,87,0.22);
        }

        .db-main {
          background: var(--db-light);
          min-height: 100vh;
          font-family: 'DM Sans', sans-serif;
          padding: 28px 28px 0;
        }

        .db-hero {
          background: var(--db-dark);
          border-radius: var(--db-radius);
          padding: 32px 36px;
          position: relative;
          overflow: hidden;
          margin-bottom: 28px;
        }
        .db-hero::before {
          content: '';
          position: absolute; inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
        }
        .db-hero-glow {
          position: absolute;
          top: -60px; right: -60px;
          width: 320px; height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,200,87,0.10) 0%, transparent 65%);
          pointer-events: none;
        }
        .db-hero-glow2 {
          position: absolute;
          bottom: -40px; left: 30%;
          width: 200px; height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(211,0,176,0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .db-hero-inner {
          position: relative; z-index: 1;
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
          color: var(--db-accent);
          background: rgba(255,200,87,0.10);
          border: 1px solid rgba(255,200,87,0.22);
          border-radius: 100px;
          padding: 4px 12px;
          margin-bottom: 14px;
        }
        .db-session-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--db-success);
          animation: dbPulse 2s ease infinite;
        }
        @keyframes dbPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: .4; transform: scale(1.5); }
        }
        .db-greeting {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(22px, 2.5vw, 32px);
          font-weight: 900;
          color: #fff;
          line-height: 1.1;
          margin-bottom: 8px;
        }
        .db-greeting em { font-style: italic; color: var(--db-magenta); }
        .db-hero-sub {
          font-size: 13.5px;
          font-weight: 300;
          color: rgba(255,255,255,0.38);
          line-height: 1.65;
          max-width: 520px;
          margin-bottom: 24px;
        }

        .db-btn-gold, .db-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 20px;
          font-size: 13px;
          border-radius: var(--db-radius);
          cursor: pointer;
          white-space: nowrap;
          transition: .2s ease;
        }
        .db-btn-gold {
          color: var(--db-dark);
          background: var(--db-accent);
          border: none;
        }
        .db-btn-gold:hover { background: #ffe0a0; transform: translateY(-1px); }
        .db-btn-outline {
          color: rgba(255,255,255,0.7);
          background: transparent;
          border: 1px solid rgba(255,255,255,0.14);
        }
        .db-btn-outline:hover {
          background: rgba(255,255,255,0.06);
          color: #fff;
          border-color: rgba(255,255,255,0.28);
        }

        .db-hero-stat-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          backdrop-filter: blur(8px);
          border-radius: var(--db-radius);
          padding: 20px 24px;
          min-width: 220px;
        }
        .db-hero-stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }
        .db-hero-stat-label { font-size: 12px; font-weight: 300; color: rgba(255,255,255,0.28); }
        .db-hero-stat-val {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 700;
          color: var(--db-accent);
        }
        .db-hero-stat-sep { height: 1px; background: rgba(255,255,255,0.06); }

        .db-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        @media (max-width: 1199.98px) { .db-stats { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 575.98px)  { .db-stats { grid-template-columns: 1fr; } }

        .db-stat {
          background: #fff;
          border: 1px solid var(--db-border);
          border-radius: var(--db-radius);
          padding: 24px 22px;
          position: relative;
          overflow: hidden;
          transition: box-shadow .25s, transform .25s;
        }
        .db-stat:hover {
          box-shadow: 0 8px 28px rgba(0,0,0,0.08);
          transform: translateY(-3px);
        }
        .db-stat::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: var(--sc);
        }
        .db-stat-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .db-stat-icon {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: var(--si);
          color: var(--sc);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .db-stat-label {
          font-size: 12px;
          font-weight: 400;
          color: #9a8a7a;
          margin-bottom: 5px;
        }
        .db-stat-val {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 24px;
          font-weight: 700;
          color: var(--db-dark);
          line-height: 1.2;
          word-break: break-word;
        }
        .db-stat-footer {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid rgba(0,0,0,0.06);
          font-size: 12px;
          color: #9a8a7a;
        }

        .db-grid {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 20px;
          margin-bottom: 24px;
        }
        @media (max-width: 991.98px) { .db-grid { grid-template-columns: 1fr; } }

        .db-panel {
          background: #fff;
          border: 1px solid var(--db-border);
          border-radius: var(--db-radius);
          overflow: hidden;
        }
        .db-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 22px 24px 18px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          gap: 12px;
          flex-wrap: wrap;
        }
        .db-panel-icon {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--pi);
          color: var(--pc);
          flex-shrink: 0;
        }
        .db-panel-title {
          font-family: 'Playfair Display', serif;
          font-size: 16px;
          font-weight: 700;
          color: var(--db-dark);
          margin: 0;
        }
        .db-panel-sub {
          font-size: 11.5px;
          font-weight: 300;
          color: #9a8a7a;
          margin: 0;
        }

        .db-refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          font-size: 12px;
          color: #7a6a5a;
          background: var(--db-light);
          border: 1px solid var(--db-border);
          border-radius: 7px;
          cursor: pointer;
        }

        .db-table { width: 100%; border-collapse: collapse; }
        .db-table th {
          padding: 10px 16px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: #9a8a7a;
          background: var(--db-light);
          border-bottom: 1px solid rgba(0,0,0,0.06);
          text-align: left;
          white-space: nowrap;
        }
        .db-table td {
          padding: 13px 16px;
          font-size: 13.5px;
          color: #4a4a5a;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          vertical-align: middle;
        }
        .db-table tbody tr:last-child td { border-bottom: none; }
        .db-table tbody tr:hover { background: var(--db-light); }

        .db-student-name { font-weight: 500; color: var(--db-dark); }
        .db-score-pill {
          display: inline-flex;
          align-items: center;
          font-size: 12px;
          font-weight: 500;
          padding: 3px 10px;
          border-radius: 100px;
          background: rgba(255,200,87,0.10);
          color: rgb(180,83,9);
        }

        .db-badge-method {
          display: inline-flex;
          align-items: center;
          font-size: 11.5px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 100px;
          background: rgba(59,130,246,0.10);
          color: rgb(59,130,246);
        }

        .db-table-empty {
          padding: 48px 16px;
          text-align: center;
          color: #b5a090;
          font-size: 13.5px;
        }

        .db-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          flex-wrap: wrap;
          gap: 10px;
          border-top: 1px solid rgba(0,0,0,0.06);
        }
        .db-page-info { font-size: 12px; font-weight: 300; color: #9a8a7a; }
        .db-page-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          font-size: 12.5px;
          color: #7a6a5a;
          background: var(--db-light);
          border: 1px solid var(--db-border);
          border-radius: 7px;
          cursor: pointer;
        }
        .db-page-btn:disabled { opacity: .4; cursor: not-allowed; }
        .db-page-current { padding: 6px 12px; font-size: 12px; color: #9a8a7a; }

        .db-chart-wrap { padding: 20px; height: 280px; }

        .db-actions {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 28px;
        }
        @media (max-width: 991.98px) { .db-actions { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 575.98px)  { .db-actions { grid-template-columns: 1fr 1fr; } }

        .db-action {
          background: #fff;
          border: 1px solid var(--db-border);
          border-radius: var(--db-radius);
          padding: 22px 18px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: box-shadow .25s, transform .25s, border-color .25s;
          text-decoration: none;
          color: inherit;
        }
        .db-action:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
          transform: translateY(-4px);
        }
        .db-action-icon {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: var(--ac-bg);
          color: var(--ac-color);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .db-action-label { font-size: 13.5px; font-weight: 500; color: var(--db-dark); }
        .db-action-desc  { font-size: 11.5px; font-weight: 300; color: #9a8a7a; }

        .db-bank-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 18px 20px 20px;
        }
        .db-bank-card {
          border: 1px solid var(--db-border);
          border-radius: 12px;
          padding: 14px;
          background: #fff;
        }
        .db-bank-label {
          font-size: 11px;
          color: #9a8a7a;
          text-transform: uppercase;
          letter-spacing: .08em;
          margin-bottom: 4px;
        }
        .db-bank-val {
          font-size: 14px;
          font-weight: 500;
          color: var(--db-dark);
        }
        .db-bank-sub {
          font-size: 12px;
          color: #9a8a7a;
          margin-top: 8px;
        }

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

        @keyframes dbSpin { to { transform: rotate(360deg); } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Bursar Dashboard" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loading && <Loader message="Loading finance dashboard…" />}

            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    {academicSession || "Loading…"} — {currentTerm || "…"}
                  </div>

                  <h1 className="db-greeting">
                    {getGreeting()}, <em>Bursar.</em>
                  </h1>

                  <p className="db-hero-sub">
                    Here is your school's finance overview for the current session and term,
                    including billing, payments, balances, and bank account information.
                  </p>

                  <div className="d-flex flex-wrap gap-2">
                    <button className="db-btn-gold" onClick={() => navigate("/payments")}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="4" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                        <path d="M2 7h12" stroke="currentColor" strokeWidth="1.3" />
                      </svg>
                      Record Payment
                    </button>

                    <button className="db-btn-outline" onClick={() => navigate("/student-fees")}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M3 2.5h10v11H3z" stroke="currentColor" strokeWidth="1.3" />
                        <path d="M5 5.5h6M5 8h6M5 10.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                      View Fee Records
                    </button>
                  </div>
                </div>

                <div className="db-hero-stat-card d-none d-md-block">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--db-accent)" }}>
                      Quick glance
                    </span>
                  </div>
                  <div className="d-flex flex-column gap-3">
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Students with payments</span>
                      <span className="db-hero-stat-val">{summaryMeta.paid_students_count}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Students owing</span>
                      <span className="db-hero-stat-val">{summaryMeta.owing_students_count}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Student fee accounts</span>
                      <span className="db-hero-stat-val">{totalFinanceUsers}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="db-stats">
              {stats.map(({ title, value }, i) => {
                const m = STAT_META[i];
                const icons = [
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M4 5h12v10H4z" stroke="currentColor" strokeWidth="1.5" /><path d="M4 8h12" stroke="currentColor" strokeWidth="1.4" /></svg>,
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" /><path d="M6.5 10l2.2 2.2L13.8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" /><path d="M10 6v4M10 13h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>,
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M4 15V7M8 15V4M12 15V9M16 15V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>,
                ];

                return (
                  <div
                    className="db-stat"
                    key={title}
                    style={{ "--sc": m.color, "--si": m.bg } as React.CSSProperties}
                  >
                    <div className="db-stat-head">
                      <div className="db-stat-icon">{icons[i]}</div>
                    </div>
                    <p className="db-stat-label">{title}</p>
                    <div className="db-stat-val">{value}</div>
                    <div className="db-stat-footer">
                      <span>{m.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="db-grid">
              <div className="db-panel">
                <div className="db-panel-head">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="db-panel-icon"
                      style={{ "--pi": "var(--db-accent-dim)", "--pc": "rgb(180,83,9)" } as React.CSSProperties}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="4" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                        <path d="M2 7h12" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                    </div>
                    <div>
                      <p className="db-panel-title">Recent Payments</p>
                      <p className="db-panel-sub">Latest recorded fee payments</p>
                    </div>
                  </div>

                  <button className="db-refresh-btn" onClick={() => fetchRecentPayments(paymentPage)} disabled={paymentsLoading}>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 14 14"
                      fill="none"
                      style={{ animation: paymentsLoading ? "dbSpin 0.8s linear infinite" : "none" }}
                    >
                      <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {paymentsLoading ? "Loading…" : "Refresh"}
                  </button>
                </div>

                {paymentsError && (
                  <div style={{ padding: "0 20px 16px", color: "var(--bs-danger, rgb(239,68,68))", fontSize: 13 }}>
                    {paymentsError}
                  </div>
                )}

                <div className="overflow-auto">
                  <table className="db-table">
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Student</th>
                        <th>Method</th>
                        <th>Date</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentsLoading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 5 }).map((_, j) => (
                              <td key={j}>
                                <div className="db-skeleton" style={{ width: j === 1 ? 140 : 90 }} />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : recentPayments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="db-table-empty">
                            No recent payments found.
                          </td>
                        </tr>
                      ) : (
                        recentPayments.map((p) => (
                          <tr key={p.id}>
                            <td style={{ fontSize: 12.5, color: "#9a8a7a" }}>{p.reference}</td>
                            <td>
                              <div className="db-student-name">{p.student_name}</div>
                              <div style={{ fontSize: 11.5, color: "#9a8a7a" }}>{p.admission_no}</div>
                            </td>
                            <td>
                              <span className="db-badge-method">{p.payment_method || "Unknown"}</span>
                            </td>
                            <td>{fmtDate(p.created_at)}</td>
                            <td>
                              <span className="db-score-pill">{naira(p.amount)}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="db-pagination">
                  <span className="db-page-info">{paymentsTotal} payment records total</span>
                  <div className="d-flex align-items-center gap-2">
                    <button
                      className="db-page-btn"
                      onClick={() => setPaymentPage((p) => Math.max(1, p - 1))}
                      disabled={paymentPage <= 1 || paymentsLoading}
                    >
                      Prev
                    </button>
                    <span className="db-page-current">Page {paymentPage} of {totalPages}</span>
                    <button
                      className="db-page-btn"
                      onClick={() => setPaymentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={paymentPage >= totalPages || paymentsLoading}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>

              <div className="db-panel" style={{ display: "flex", flexDirection: "column" }}>
                <div className="db-panel-head">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="db-panel-icon"
                      style={{ "--pi": "rgba(59,130,246,0.10)", "--pc": "rgb(59,130,246)" } as React.CSSProperties}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 12V8M5 12V5M8 12V7M11 12V3M14 12V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="db-panel-title">Payment Method Breakdown</p>
                      <p className="db-panel-sub">Amounts collected by method</p>
                    </div>
                  </div>
                </div>

                <div className="db-chart-wrap" style={{ flex: 1 }}>
                  <canvas ref={chartRef} />
                </div>
              </div>
            </div>

            <div className="db-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="db-panel">
                <div className="db-panel-head">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="db-panel-icon"
                      style={{ "--pi": "rgba(34,197,94,0.10)", "--pc": "rgb(21,128,61)" } as React.CSSProperties}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="4" width="12" height="8" rx="1.4" stroke="currentColor" strokeWidth="1.3" />
                        <path d="M2 7h12" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                    </div>
                    <div>
                      <p className="db-panel-title">School Bank Details</p>
                      <p className="db-panel-sub">Extracted from payment gateways</p>
                    </div>
                  </div>
                </div>

                <div className="db-bank-list">
                  {bankLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <div className="db-bank-card" key={i}>
                        <div className="db-skeleton" style={{ width: 120, marginBottom: 10 }} />
                        <div className="db-skeleton" style={{ width: 200, marginBottom: 8 }} />
                        <div className="db-skeleton" style={{ width: 160 }} />
                      </div>
                    ))
                  ) : bankDetails.length === 0 ? (
                    <div className="db-table-empty">No bank details configured.</div>
                  ) : (
                    bankDetails.map((b, i) => (
                      <div className="db-bank-card" key={i}>
                        <div className="db-bank-label">Bank Name</div>
                        <div className="db-bank-val">{b.bank_name || "N/A"}</div>

                        <div className="db-bank-sub">
                          <strong>Account No:</strong> {b.account_number || "N/A"}
                        </div>
                        <div className="db-bank-sub">
                          <strong>Account Name:</strong> {b.account_name || "N/A"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="db-actions">
                {QUICK_ACTIONS.map((a) => (
                  <a
                    key={a.label}
                    href={a.path}
                    className="db-action"
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
                    <div className="db-action-icon">{a.icon}</div>
                    <div>
                      <div className="db-action-label">{a.label}</div>
                      <div className="db-action-desc">{a.desc}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}