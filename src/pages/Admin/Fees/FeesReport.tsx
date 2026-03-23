// src/pages/Fees/SchoolFinancialReportDashboardPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";

type FilterOption = { id: number; name: string };

type BreakdownRow = {
  id: number;
  student_id: number;
  fee_type_id: number;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: "paid" | "partial" | "unpaid" | string;
  student?: { id: number; firstname: string; surname: string; reg_no: string };
  fee_type?: { id: number; name: string };
  feeType?: { id: number; name: string };
};

type LaravelPaginator<T> = {
  data: T[];
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
};

type ReportResponse = {
  message: string;
  data: {
    school_id: number;
    filters: { session_id?: number | null; term_id?: number | null; section_id?: number | null };
    summary: {
      total_fees_assigned: number;
      total_paid: number;
      total_partially_paid: number;
      total_unpaid: number;
      total_balance_remaining: number;
      payment_percentage: number;
    };
    breakdown: LaravelPaginator<BreakdownRow>;
  };
};

type FiltersResponse = {
  sessions: FilterOption[];
  terms: FilterOption[];
  sections: FilterOption[];
};

function money(n: any) {
  const v = Number(n ?? 0);
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(v);
  } catch {
    return `₦${v.toLocaleString()}`;
  }
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function statusPillClass(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "paid") return "db-pill db-pill--green";
  if (s === "partial") return "db-pill db-pill--violet";
  return "db-pill db-pill--gold";
}

export default function SchoolFinancialReportDashboardPage() {
  const { showError, showWarning, showSuccess } = useToast();

  // ===== Sidebar State =====
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ===== Loading State =====
  const [loading, setLoading] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);

  // ===== Filter options =====
  const [sessions, setSessions] = useState<FilterOption[]>([]);
  const [terms, setTerms] = useState<FilterOption[]>([]);
  const [sections, setSections] = useState<FilterOption[]>([]);

  // ===== Selected filters =====
  const [sessionId, setSessionId] = useState<number | "">("");
  const [termId, setTermId] = useState<number | "">("");
  const [sectionId, setSectionId] = useState<number | "">("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  // ===== Local search (current page only) =====
  const [query, setQuery] = useState("");

  // ===== Report data =====
  const [report, setReport] = useState<ReportResponse["data"] | null>(null);

  // ===== Chart Refs =====
  const paidChartRef = useRef<HTMLCanvasElement | null>(null);
  const statusChartRef = useRef<HTMLCanvasElement | null>(null);
  const paidChartInstance = useRef<Chart | null>(null);
  const statusChartInstance = useRef<Chart | null>(null);

  // ===== Boot filters + initial report =====
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    async function boot() {
      try {
        setLoadingFilters(true);

        const fRes = await authApi.get<FiltersResponse>("/filters");
        if (!mounted) return;

        setSessions(fRes.data?.sessions ?? []);
        setTerms(fRes.data?.terms ?? []);
        setSections(fRes.data?.sections ?? []);

        setLoadingFilters(false);

        // initial report
        await fetchReport(1, { mounted });
      } catch (e: any) {
        console.error(e);
        showError(e?.response?.data?.message || e?.message || "Failed to load report filters.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void boot();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchReport(nextPage?: number, opts?: { mounted?: boolean }) {
    const p = nextPage ?? page;
    const mounted = opts?.mounted ?? true;

    try {
      setLoadingReport(true);

      const params: any = { per_page: perPage, page: p };
      if (sessionId) params.session_id = sessionId;
      if (termId) params.term_id = termId;
      if (sectionId) params.section_id = sectionId;

      const res = await authApi.get<ReportResponse>("/financial-report", { params });
      if (!mounted) return;

      setReport(res.data?.data ?? null);
      setPage(p);
    } catch (e: any) {
      console.error(e);
      showError(e?.response?.data?.message || e?.message || "Failed to generate financial report.");
      setReport(null);
    } finally {
      setLoadingReport(false);
    }
  }

  function applyFilters() {
    setQuery("");
    void fetchReport(1);
  }

  function resetFilters() {
    setSessionId("");
    setTermId("");
    setSectionId("");
    setPerPage(10);
    setPage(1);
    setQuery("");
    showWarning("Filters cleared.");
    void fetchReport(1);
  }

  const summary = report?.summary;

  const progressPct = useMemo(() => {
    const pct = Number(summary?.payment_percentage ?? 0);
    return Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  }, [summary]);

  const breakdown = report?.breakdown;
  const rows = breakdown?.data ?? [];

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((r) => {
      const fee = r.feeType ?? r.fee_type;
      const st = r.student;
      const hay = `${st?.firstname ?? ""} ${st?.surname ?? ""} ${st?.reg_no ?? ""} ${fee?.name ?? ""} ${r.status ?? ""} ${r.id}`
        .toLowerCase()
        .trim();
      return hay.includes(q);
    });
  }, [rows, query]);

  // ===== Chart logic (same template vibe) =====
  useEffect(() => {
    const withAlpha = (hex: string, alpha: number) => {
      const h = (hex || "").trim();
      if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h)) return h;
      const full = h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h;
      const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
      return `${full}${a}`;
    };

    const createGradient = (ctx: CanvasRenderingContext2D, color: string) => {
      const g = ctx.createLinearGradient(0, 0, 0, 320);
      g.addColorStop(0, withAlpha(color, 0.28));
      g.addColorStop(1, withAlpha(color, 0.04));
      return g;
    };

    // Paid trend chart (Assigned vs Collected vs Balance)
    if (paidChartRef.current) {
      const ctx = paidChartRef.current.getContext("2d");
      if (ctx) {
        paidChartInstance.current?.destroy();

        const assigned = Number(summary?.total_fees_assigned ?? 0);
        const collected = Number(summary?.total_paid ?? 0) + Number(summary?.total_partially_paid ?? 0);
        const balance = Number(summary?.total_balance_remaining ?? 0);

        paidChartInstance.current = new Chart(ctx, {
          type: "line",
          data: {
            labels: ["Assigned", "Collected", "Balance"],
            datasets: [
              {
                label: "Amount (₦)",
                data: [assigned, collected, balance],
                borderColor: "#c9a84c",
                backgroundColor: createGradient(ctx, "#c9a84c"),
                pointBackgroundColor: "#c9a84c",
                pointBorderColor: "#0f172a",
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.35,
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
                callbacks: {
                  label: (t) => ` ${money(t.parsed.y)}`,
                },
              },
            },
            scales: {
              x: { grid: { display: false }, ticks: { font: { size: 11 } } },
              y: { grid: { color: "rgba(0,0,0,0.06)" }, ticks: { font: { size: 11 }, callback: (v) => `${v}` } },
            },
          },
        });
      }
    }

    // Status chart (Paid / Partial / Unpaid) - current page counts
    if (statusChartRef.current) {
      const ctx = statusChartRef.current.getContext("2d");
      if (ctx) {
        statusChartInstance.current?.destroy();

        const paidCount = rows.filter((r) => (r.status || "").toLowerCase() === "paid").length;
        const partialCount = rows.filter((r) => (r.status || "").toLowerCase() === "partial").length;
        const unpaidCount = rows.filter((r) => (r.status || "").toLowerCase() === "unpaid").length;

        statusChartInstance.current = new Chart(ctx, {
          type: "bar",
          data: {
            labels: ["Paid", "Partial", "Unpaid"],
            datasets: [
              {
                label: "Records (current page)",
                data: [paidCount, partialCount, unpaidCount],
                backgroundColor: "#64748b",
                borderRadius: 10,
                barThickness: 34,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { font: { size: 11 } } },
              y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.06)" }, ticks: { font: { size: 11 } } },
            },
          },
        });
      }
    }

    return () => {
      paidChartInstance.current?.destroy();
      statusChartInstance.current?.destroy();
    };
  }, [summary, rows]);

  // ===== Stat cards =====
  const statCards = useMemo(() => {
    const assigned = Number(summary?.total_fees_assigned ?? 0);
    const paid = Number(summary?.total_paid ?? 0);
    const partialPaid = Number(summary?.total_partially_paid ?? 0);
    const unpaid = Number(summary?.total_unpaid ?? 0);
    const balance = Number(summary?.total_balance_remaining ?? 0);

    return [
      { title: "Total Assigned", value: money(assigned), hint: "Total fee value assigned", icon: "bi-cash-stack", tone: "gold" as const },
      { title: "Fully Paid", value: money(paid), hint: "Collections fully settled", icon: "bi-check2-circle", tone: "green" as const },
      { title: "Partially Paid", value: money(partialPaid), hint: "Collections in progress", icon: "bi-pie-chart", tone: "violet" as const },
      { title: "Balance Remaining", value: money(balance), hint: "Outstanding balance", icon: "bi-exclamation-circle", tone: "red" as const },
      { title: "Unpaid (incl partial bal)", value: money(unpaid), hint: "Unpaid total exposure", icon: "bi-dash-circle", tone: "slate" as const },
      { title: "Payment %", value: `${progressPct}%`, hint: "Overall collection rate", icon: "bi-percent", tone: "slate" as const },
    ];
  }, [summary, progressPct]);

  const selectedSessionName = useMemo(() => sessions.find((s) => s.id === sessionId)?.name, [sessions, sessionId]);
  const selectedTermName = useMemo(() => terms.find((t) => t.id === termId)?.name, [terms, termId]);
  const selectedSectionName = useMemo(() => sections.find((s) => s.id === sectionId)?.name, [sections, sectionId]);

  /* =========================
     SAME TEMPLATE (INLINE CSS)
  ========================= */
  const templateCss = `
    .db-main {
      background: var(--bs-body-bg, #f5f1eb);
      min-height: 100vh;
      font-family: "DM Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      padding: 28px 28px 0;
    }
    @media (max-width: 991.98px) { .db-main { padding: 18px 14px 0; } }

    .db-hero {
      background: #0f172a;
      border-radius: 16px;
      padding: 32px 36px;
      position: relative;
      overflow: hidden;
      margin: 10px 0 18px;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .db-hero::before {
      content: "";
      position: absolute;
      inset: 0;
      background-image: radial-gradient(circle, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
      background-size: 24px 24px;
      pointer-events: none;
    }
    .db-hero-glow {
      position: absolute;
      top: -60px;
      right: -60px;
      width: 320px;
      height: 320px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(201, 168, 76, 0.12) 0%, transparent 65%);
      pointer-events: none;
    }
    .db-hero-glow2 {
      position: absolute;
      bottom: -40px;
      left: 26%;
      width: 220px;
      height: 220px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
      pointer-events: none;
    }
    .db-hero-inner {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 28px;
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
      color: #e8c97a;
      background: rgba(201, 168, 76, 0.10);
      border: 1px solid rgba(201, 168, 76, 0.22);
      border-radius: 100px;
      padding: 4px 12px;
      margin-bottom: 14px;
    }
    .db-session-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22c55e;
      animation: dbPulse 2s ease infinite;
    }
    @keyframes dbPulse {
      0%,100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.5); }
    }
    .db-greeting {
      font-family: "Lora", Georgia, serif;
      font-size: clamp(22px, 2.5vw, 32px);
      font-weight: 700;
      color: #fff;
      line-height: 1.1;
      margin-bottom: 8px;
    }
    .db-greeting em { font-style: italic; color: #e8c97a; }

    .db-hero-sub {
      font-size: 13.5px;
      font-weight: 300;
      color: #cbd5e1;
      line-height: 1.65;
      max-width: 680px;
      margin-bottom: 16px;
      opacity: 0.9;
    }
    .db-hero-btns { display: flex; gap: 10px; flex-wrap: wrap; }

    .db-btn-gold {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
      background: #c9a84c;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s, transform 0.2s;
      white-space: nowrap;
    }
    .db-btn-gold:hover { background: #e8c97a; transform: translateY(-1px); }
    .db-btn-gold:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

    .db-btn-outline {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.75);
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s, color 0.2s;
      white-space: nowrap;
    }
    .db-btn-outline:hover { background: rgba(255, 255, 255, 0.06); color: #fff; border-color: rgba(255, 255, 255, 0.28); }
    .db-btn-outline:disabled { opacity: 0.55; cursor: not-allowed; }

    .db-hero-stat-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.09);
      backdrop-filter: blur(8px);
      border-radius: 14px;
      padding: 18px 20px;
      min-width: 330px;
    }
    @media (max-width: 991.98px) { .db-hero { padding: 24px 20px; } .db-hero-stat-card { min-width: 0; width: 100%; } }
    .db-hero-stat-row { display: flex; flex-direction: column; gap: 10px; }
    .db-hero-stat-item { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
    .db-hero-stat-label { font-size: 12px; font-weight: 300; color: #94a3b8; }
    .db-hero-stat-val {
      font-family: "Lora", serif;
      font-size: 18px;
      font-weight: 700;
      color: #fff;
    }
    .db-hero-stat-sep { height: 1px; background: rgba(255, 255, 255, 0.06); }
    .db-progress { height: 10px; border-radius: 999px; background: rgba(255,255,255,0.12); overflow: hidden; }
    .db-progress > div { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #c9a84c, #e8c97a); width: 0%; transition: width 0.35s ease; }

    .db-panel {
      background: #ffffff;
      border: 1px solid #ede8e0;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(15,23,42,0.04);
    }
    .db-panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 18px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      gap: 12px;
      flex-wrap: wrap;
    }
    .db-panel-title {
      font-family: "Lora", serif;
      font-size: 16px;
      font-weight: 800;
      color: #1a1a2e;
      margin: 0;
    }
    .db-panel-sub { font-size: 11.5px; font-weight: 300; color: #9a8a7a; margin: 0; }

    .db-pill {
      display: inline-flex;
      align-items: center;
      font-size: 12px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 999px;
      background: rgba(30, 64, 175, 0.08);
      color: #1e40af;
      border: 1px solid rgba(30, 64, 175, 0.12);
      white-space: nowrap;
    }
    .db-pill--gold {
      background: rgba(180, 83, 9, 0.08);
      color: #b45309;
      border-color: rgba(180, 83, 9, 0.14);
    }
    .db-pill--violet {
      background: rgba(124, 58, 237, 0.08);
      color: #7c3aed;
      border-color: rgba(124, 58, 237, 0.12);
    }
    .db-pill--green {
      background: rgba(6, 95, 70, 0.08);
      color: #065f46;
      border-color: rgba(6, 95, 70, 0.12);
    }

    .db-refresh-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #7a6a5a;
      background: #f5f1eb;
      border: 1px solid #e5ddd3;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s;
      white-space: nowrap;
    }
    .db-refresh-btn:hover { background: #ede8e0; }
    .db-refresh-btn:disabled { opacity: 0.55; cursor: not-allowed; }

    .db-grid2 { display: grid; grid-template-columns: 1fr 420px; gap: 18px; margin: 16px 0 18px; }
    @media (max-width: 991.98px) { .db-grid2 { grid-template-columns: 1fr; } }
    .db-cardgrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin: 14px 0 18px; }
    @media (max-width: 991.98px) { .db-cardgrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 575.98px) { .db-cardgrid { grid-template-columns: 1fr; } }

    .db-stat {
      border: 1px solid #ede8e0;
      border-radius: 14px;
      padding: 14px 14px;
      background: #fff;
      box-shadow: 0 2px 10px rgba(15,23,42,0.04);
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
      overflow: hidden;
    }
    .db-stat:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(15,23,42,0.08); }
    .db-stat::before {
      content: "";
      position: absolute;
      inset: 0;
      opacity: 0.55;
      pointer-events: none;
      background: radial-gradient(circle at 12% 10%, rgba(201,168,76,0.10), transparent 45%),
                  radial-gradient(circle at 90% 25%, rgba(99,102,241,0.08), transparent 55%);
    }
    .db-stat-inner { position: relative; z-index: 1; display: flex; gap: 12px; align-items: flex-start; }
    .db-stat-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      border: 1px solid rgba(0,0,0,0.06);
    }
    .db-tone-gold { background: rgba(201,168,76,0.12); color: #b45309; }
    .db-tone-green { background: rgba(34,197,94,0.12); color: #065f46; }
    .db-tone-violet { background: rgba(124,58,237,0.10); color: #7c3aed; }
    .db-tone-red { background: rgba(239,68,68,0.10); color: #b91c1c; }
    .db-tone-slate { background: rgba(100,116,139,0.10); color: #334155; }

    .db-stat-title { font-size: 12px; color: #9a8a7a; margin: 0 0 4px; }
    .db-stat-value { font-family: "Lora", serif; font-weight: 900; color: #1a1a2e; font-size: 18px; margin: 0; }
    .db-stat-hint { font-size: 11px; color: #a89a8a; margin: 8px 0 0; }

    .db-table { width: 100%; border-collapse: collapse; }
    .db-table th {
      padding: 10px 14px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #9a8a7a;
      background: #faf8f5;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      text-align: left;
      white-space: nowrap;
    }
    .db-table td {
      padding: 12px 14px;
      font-size: 13.5px;
      color: #4a4a5a;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      vertical-align: middle;
    }
    .db-table tbody tr:hover { background: #faf8f5; }

    .db-input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid #e5ddd3;
      outline: none;
      font-size: 13px;
      background: #fff;
    }
    .db-input:focus { border-color: rgba(201,168,76,0.7); box-shadow: 0 0 0 3px rgba(201,168,76,0.18); }

    .db-select {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid #e5ddd3;
      outline: none;
      font-size: 13px;
      background: #fff;
    }
    .db-select:focus { border-color: rgba(201,168,76,0.7); box-shadow: 0 0 0 3px rgba(201,168,76,0.18); }

    .db-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; padding: 14px 18px; }
    @media (max-width: 991.98px) { .db-row { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 575.98px) { .db-row { grid-template-columns: 1fr; } }
    .db-field label { font-size: 11px; color: #9a8a7a; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 6px; display: block; }
    .db-actions { display: flex; gap: 10px; justify-content: flex-end; align-items: flex-end; flex-wrap: wrap; }

    .db-chartWrap { padding: 14px 18px 16px; }
    .db-chartBox { height: 300px; }
    .db-foot {
      padding: 12px 18px;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      border-top: 1px solid rgba(0,0,0,0.06);
      color: #9a8a7a;
      font-size: 12px;
    }

    @keyframes dbSpin { to { transform: rotate(360deg); } }
  `;

  return (
    <>
      <style>{templateCss}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Fees Report" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {(loading || loadingReport) && <Loader message={loading ? "Loading report..." : "Generating report..."} />}

            {/* HERO (same template) */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Fees • Finance Dashboard
                  </div>

                  <h1 className="db-greeting">
                    {getGreeting()}, <em>Admin.</em>
                  </h1>

                  <p className="db-hero-sub">
                    Track assigned fees, collections, and outstanding balances. Use filters to drill down by{" "}
                    <b>session</b>, <b>term</b>, and <b>section</b>.
                  </p>

                  <div className="db-hero-btns">
                    <button className="db-btn-gold" onClick={applyFilters} disabled={loadingFilters || loadingReport}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M2 3h12M4 7h8M6 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      {loadingReport ? "Generating…" : "Apply filters"}
                    </button>

                    <button className="db-btn-outline" onClick={resetFilters} disabled={loadingReport}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M3 3l10 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        <path d="M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      Clear filters
                    </button>
                  </div>
                </div>

                <div className="db-hero-stat-card d-none d-md-block">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c9a84c" }}>
                      Active filters
                    </span>
                    <span className="db-pill db-pill--violet">{progressPct}%</span>
                  </div>

                  <div className="db-hero-stat-row">
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Session</span>
                      <span className="db-hero-stat-val" style={{ fontSize: 14 }}>
                        {selectedSessionName || "All"}
                      </span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Term</span>
                      <span className="db-hero-stat-val" style={{ fontSize: 14 }}>
                        {selectedTermName || "All"}
                      </span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Section</span>
                      <span className="db-hero-stat-val" style={{ fontSize: 14 }}>
                        {selectedSectionName || "All"}
                      </span>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1", fontSize: 12, marginBottom: 6 }}>
                        <span>Collection progress</span>
                        <span style={{ fontWeight: 800 }}>{progressPct}%</span>
                      </div>
                      <div className="db-progress">
                        <div style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FILTER PANEL */}
            <div className="db-panel">
              <div className="db-panel-head">
                <div>
                  <p className="db-panel-title">Report filters</p>
                  <p className="db-panel-sub">Choose session, term, section, and paging size</p>
                </div>

                <button className="db-refresh-btn" onClick={() => fetchReport(page)} disabled={loadingReport}>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 14 14"
                    fill="none"
                    style={{ animation: loadingReport ? "dbSpin 0.8s linear infinite" : "none" }}
                  >
                    <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  Refresh
                </button>
              </div>

              <div className="db-row">
                <div className="db-field">
                  <label>Session</label>
                  <select
                    className="db-select"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value ? Number(e.target.value) : "")}
                    disabled={loadingFilters || loadingReport}
                  >
                    <option value="">All sessions</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="db-field">
                  <label>Term</label>
                  <select
                    className="db-select"
                    value={termId}
                    onChange={(e) => setTermId(e.target.value ? Number(e.target.value) : "")}
                    disabled={loadingFilters || loadingReport}
                  >
                    <option value="">All terms</option>
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="db-field">
                  <label>Section</label>
                  <select
                    className="db-select"
                    value={sectionId}
                    onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : "")}
                    disabled={loadingFilters || loadingReport}
                  >
                    <option value="">All sections</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="db-field">
                  <label>Per page</label>
                  <select className="db-select" value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} disabled={loadingReport}>
                    {[10, 20, 30, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="db-actions" style={{ gridColumn: "1 / -1" }}>
                  <button className="db-refresh-btn" onClick={resetFilters} disabled={loadingReport}>
                    Clear
                  </button>
                  <button className="db-btn-gold" onClick={applyFilters} disabled={loadingFilters || loadingReport}>
                    {loadingReport ? "Generating…" : "Apply"}
                  </button>
                </div>
              </div>
            </div>

            {/* STAT CARDS */}
            <div className="db-cardgrid">
              {statCards.map((c) => (
                <div className="db-stat" key={c.title}>
                  <div className="db-stat-inner">
                    <div
                      className={`db-stat-icon ${
                        c.tone === "gold"
                          ? "db-tone-gold"
                          : c.tone === "green"
                          ? "db-tone-green"
                          : c.tone === "violet"
                          ? "db-tone-violet"
                          : c.tone === "red"
                          ? "db-tone-red"
                          : "db-tone-slate"
                      }`}
                    >
                      <i className={`bi ${c.icon}`} />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <p className="db-stat-title">{c.title}</p>
                      <p className="db-stat-value">{c.value}</p>
                      <p className="db-stat-hint">{c.hint}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CHARTS */}
            <div className="db-grid2">
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <p className="db-panel-title">Financial trend</p>
                    <p className="db-panel-sub">Assigned vs Collected vs Balance</p>
                  </div>

                  <span className="db-pill db-pill--gold">{progressPct}% collected</span>
                </div>

                <div className="db-chartWrap">
                  <div className="db-chartBox">
                    <canvas ref={paidChartRef} />
                  </div>
                  <div style={{ marginTop: 10, color: "#9a8a7a", fontSize: 12 }}>
                    Tip: If collected is far below assigned, focus on partial + unpaid balances.
                  </div>
                </div>
              </div>

              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <p className="db-panel-title">Status mix</p>
                    <p className="db-panel-sub">Counts (current page only)</p>
                  </div>

                  <button
                    className="db-refresh-btn"
                    onClick={() => {
                      showSuccess?.("Chart refreshed.");
                      fetchReport(page);
                    }}
                    disabled={loadingReport}
                  >
                    Refresh
                  </button>
                </div>

                <div className="db-chartWrap">
                  <div className="db-chartBox">
                    <canvas ref={statusChartRef} />
                  </div>
                  <div style={{ marginTop: 10, color: "#9a8a7a", fontSize: 12 }}>
                    Note: status counts are computed from the current page of results.
                  </div>
                </div>
              </div>
            </div>

            {/* BREAKDOWN TABLE */}
            <div className="db-panel" style={{ marginBottom: 18 }}>
              <div className="db-panel-head">
                <div>
                  <p className="db-panel-title">Breakdown</p>
                  <p className="db-panel-sub">
                    Page <b>{breakdown?.current_page ?? 1}</b> of <b>{breakdown?.last_page ?? 1}</b> • Total{" "}
                    <b>{breakdown?.total ?? 0}</b>
                  </p>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    className="db-input"
                    style={{ width: 320 }}
                    placeholder="Search student / reg no / fee / status (this page)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={loadingReport}
                  />

                  <button className="db-refresh-btn" onClick={() => setQuery("")} disabled={!query || loadingReport}>
                    Clear
                  </button>

                  <button
                    className="db-refresh-btn"
                    onClick={() => fetchReport(Math.max(1, (breakdown?.current_page ?? 1) - 1))}
                    disabled={loadingReport || (breakdown?.current_page ?? 1) <= 1}
                  >
                    ← Prev
                  </button>

                  <span className="db-pill db-pill--violet">Page {breakdown?.current_page ?? 1}</span>

                  <button
                    className="db-refresh-btn"
                    onClick={() => fetchReport(Math.min(breakdown?.last_page ?? 1, (breakdown?.current_page ?? 1) + 1))}
                    disabled={loadingReport || (breakdown?.current_page ?? 1) >= (breakdown?.last_page ?? 1)}
                  >
                    Next →
                  </button>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="db-table">
                  <thead>
                    <tr>
                      <th style={{ width: 70 }}>#</th>
                      <th>Student</th>
                      <th style={{ width: 160 }}>Reg No</th>
                      <th>Fee Type</th>
                      <th style={{ width: 150, textAlign: "right" }}>Total</th>
                      <th style={{ width: 150, textAlign: "right" }}>Paid</th>
                      <th style={{ width: 150, textAlign: "right" }}>Balance</th>
                      <th style={{ width: 120 }}>Status</th>
                      <th style={{ width: 90, textAlign: "right" }}>ID</th>
                    </tr>
                  </thead>

                  <tbody>
                    {!report && !loadingReport ? (
                      <tr>
                        <td colSpan={9} style={{ padding: 18, textAlign: "center", color: "#9a8a7a" }}>
                          No report loaded. Apply filters to generate.
                        </td>
                      </tr>
                    ) : loadingReport ? (
                      <tr>
                        <td colSpan={9} style={{ padding: 18 }}>
                          <div style={{ height: 14, borderRadius: 8, background: "#f0ebe3", marginBottom: 10 }} />
                          <div style={{ height: 14, borderRadius: 8, background: "#f0ebe3", marginBottom: 10 }} />
                          <div style={{ height: 14, borderRadius: 8, background: "#f0ebe3" }} />
                        </td>
                      </tr>
                    ) : filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: 18, textAlign: "center", color: "#9a8a7a" }}>
                          No records found. Try changing filters or search query.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((r, idx) => {
                        const fee = r.feeType ?? r.fee_type;
                        const st = (r.status || "").toLowerCase();
                        const displayIndex = (breakdown?.from ?? 1) + idx;

                        return (
                          <tr key={r.id}>
                            <td>{displayIndex}</td>
                            <td>
                              <div style={{ fontWeight: 800, color: "#1a1a2e" }}>
                                {((r.student?.firstname ?? "") + " " + (r.student?.surname ?? "")).trim() || "—"}
                              </div>
                              <div style={{ fontSize: 12, color: "#9a8a7a" }}>Student ID: {r.student_id}</div>
                            </td>
                            <td style={{ color: "#6b7280" }}>{r.student?.reg_no ?? "—"}</td>
                            <td>{fee?.name ?? `Fee #${r.fee_type_id}`}</td>
                            <td style={{ textAlign: "right" }}>{money(r.total_amount)}</td>
                            <td style={{ textAlign: "right" }}>{money(r.amount_paid)}</td>
                            <td style={{ textAlign: "right" }}>
                              <span style={{ fontWeight: Number(r.balance ?? 0) > 0 ? 800 : 500, color: Number(r.balance ?? 0) > 0 ? "#1a1a2e" : "#9a8a7a" }}>
                                {money(r.balance)}
                              </span>
                            </td>
                            <td>
                              <span className={statusPillClass(st)}>{(st || "—").toUpperCase()}</span>
                            </td>
                            <td style={{ textAlign: "right", color: "#9a8a7a" }}>{r.id}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="db-foot">
                <div>
                  Showing <b>{filteredRows.length}</b> of <b>{rows.length}</b> rows on this page
                </div>
                <div>Tip: Use Section filter to identify the most affected classes.</div>
              </div>
            </div>

            <div className="mt-auto">
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

/**
 * Routes:
 * - GET /filters
 * - GET /financial-report?session_id=&term_id=&section_id=&per_page=&page=
 */