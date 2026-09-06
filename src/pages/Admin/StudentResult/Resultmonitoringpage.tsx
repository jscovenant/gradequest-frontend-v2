import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../../utils/axios";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../features/frontend/footer";
import PageTitle from "../../../components/PageTitle";

/* ─── Types ─── */
type SubmissionMonitor = {
  id: number; batch_id: number; class_id: number; class_name: string;
  teacher_id?: number | null; teacher_name?: string | null;
  expected_students_count: number; completed_students_count: number; pending_students_count: number;
  status: "pending" | "partial" | "complete" | "overdue";
  submission_deadline?: string | null; last_scanned_at?: string | null;
};

type AlertSummaryResponse = {
  data: unknown[];
  submission_monitors: SubmissionMonitor[];
  counts: { open_total: number; high: number; medium: number; low: number; submission_open_total: number; submission_overdue_total: number };
};

type StatusFilter = "all" | "overdue" | "partial" | "pending" | "complete";
type SortKey = "class_name" | "pct" | "status" | "pending_students_count";

/* ─── Helpers ─── */
function getMonitorConfig(status: SubmissionMonitor["status"]) {
  if (status === "overdue") return {
    color: "rgb(239,68,68)", bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.16)",
    barFill: "#ef4444", barTrack: "rgba(239,68,68,0.12)",
    label: "Overdue", labelColor: "#dc2626", labelBg: "rgba(239,68,68,0.10)",
    pillBg: "rgba(239,68,68,0.08)", pillBorder: "rgba(239,68,68,0.20)",
  };
  if (status === "partial") return {
    color: "rgb(245,158,11)", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.16)",
    barFill: "#f59e0b", barTrack: "rgba(245,158,11,0.12)",
    label: "Partial", labelColor: "rgb(146,64,14)", labelBg: "rgba(245,158,11,0.12)",
    pillBg: "rgba(245,158,11,0.08)", pillBorder: "rgba(245,158,11,0.20)",
  };
  if (status === "complete") return {
    color: "rgb(34,197,94)", bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.14)",
    barFill: "#22c55e", barTrack: "rgba(34,197,94,0.12)",
    label: "Complete", labelColor: "rgb(21,128,61)", labelBg: "rgba(34,197,94,0.10)",
    pillBg: "rgba(34,197,94,0.08)", pillBorder: "rgba(34,197,94,0.18)",
  };
  return {
    color: "rgb(59,130,246)", bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.14)",
    barFill: "#3b82f6", barTrack: "rgba(59,130,246,0.12)",
    label: "Pending", labelColor: "rgb(29,78,216)", labelBg: "rgba(59,130,246,0.10)",
    pillBg: "rgba(59,130,246,0.08)", pillBorder: "rgba(59,130,246,0.18)",
  };
}

function formatRelativeTime(d?: string | null): string {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function calcPct(m: SubmissionMonitor) {
  return m.expected_students_count > 0
    ? Math.round((m.completed_students_count / m.expected_students_count) * 100)
    : 0;
}

const PAGE_SIZE = 12;

/* ─── Stat bar card ─── */
function StatTile({ label, value, color, bg, border, onClick, active }: {
  label: string; value: number; color: string; bg: string; border: string;
  onClick: () => void; active: boolean;
}) {
  return (
    <button className="rm-stat-tile" onClick={onClick}
      style={{ "--st-color": color, "--st-bg": active ? bg : "transparent", "--st-border": active ? border : "var(--db-border)" } as React.CSSProperties}>
      <span className="rm-stat-tile-val">{value}</span>
      <span className="rm-stat-tile-label">{label}</span>
      {active && <span className="rm-stat-tile-dot" style={{ background: color }} />}
    </button>
  );
}

/* ─── Monitor card ─── */
function MonitorCard({ m, idx }: { m: SubmissionMonitor; idx: number }) {
  const cfg = getMonitorConfig(m.status);
  const pct = calcPct(m);
  return (
    <div className="rm-card" style={{
      "--rmc-bg": cfg.bg, "--rmc-border": cfg.border, "--rmc-color": cfg.color,
      "--rmc-bar": cfg.barFill, "--rmc-track": cfg.barTrack,
      animationDelay: `${idx * 50}ms`,
    } as React.CSSProperties}>
      <div className="rm-card-top">
        <div className="rm-card-info">
          <p className="rm-card-class">{m.class_name}</p>
          {m.teacher_name && (
            <p className="rm-card-teacher">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M1 11c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              {m.teacher_name}
            </p>
          )}
        </div>
        <span className="rm-status-badge" style={{ color: cfg.labelColor, background: cfg.labelBg }}>{cfg.label}</span>
      </div>

      <div className="rm-bar-wrap">
        <div className="rm-bar-track"><div className="rm-bar-fill" style={{ width: `${pct}%`, background: cfg.barFill }} /></div>
        <div className="rm-bar-labels">
          <span className="rm-bar-pct">{pct}%</span>
          <span className="rm-bar-count">{m.completed_students_count}/{m.expected_students_count} students</span>
        </div>
      </div>

      <div className="rm-card-footer">
        {m.submission_deadline && (
          <span className="rm-meta-chip rm-meta-chip--deadline">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M6 3v3l2 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {m.submission_deadline}
          </span>
        )}
        {m.pending_students_count > 0 && (
          <span className="rm-meta-chip rm-meta-chip--pending">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M6 2v4l3 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.1" />
            </svg>
            {m.pending_students_count} pending
          </span>
        )}
        {m.last_scanned_at && (
          <span className="rm-meta-chip rm-meta-chip--scan">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.1" />
              <path d="M9 6A3 3 0 116 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M9 3v3h-3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {formatRelativeTime(m.last_scanned_at)}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Skeleton card ─── */
function SkeletonCard() {
  return (
    <div className="rm-skeleton-card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div className="rm-skel rm-skel--title" style={{ marginBottom: 8 }} />
          <div className="rm-skel rm-skel--sub" />
        </div>
        <div className="rm-skel" style={{ width: 58, height: 22, borderRadius: 999, marginLeft: 10, flexShrink: 0 }} />
      </div>
      <div className="rm-skel rm-skel--bar" style={{ marginBottom: 8 }} />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div className="rm-skel" style={{ width: 36, height: 10, borderRadius: 4 }} />
        <div className="rm-skel" style={{ width: 80, height: 10, borderRadius: 4 }} />
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 14, paddingTop: 10, borderTop: "1px solid rgba(0,0,0,0.05)" }}>
        <div className="rm-skel" style={{ width: 70, height: 22, borderRadius: 6 }} />
        <div className="rm-skel" style={{ width: 60, height: 22, borderRadius: 6 }} />
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function ResultMonitoringPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [monitors, setMonitors] = useState<SubmissionMonitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await authApi.get<AlertSummaryResponse>("/admin/academic-alerts/summary");
      setMonitors(res.data.submission_monitors || []);
      setLastUpdated(new Date());
    } catch (e: any) {
      setMonitors([]);
      setError(e?.response?.data?.message || "Unable to load submission monitors.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── derived counts ── */
  const overdueCount  = monitors.filter(m => m.status === "overdue").length;
  const partialCount  = monitors.filter(m => m.status === "partial").length;
  const pendingCount  = monitors.filter(m => m.status === "pending").length;
  const completeCount = monitors.filter(m => m.status === "complete").length;
  const avgCompletion = monitors.length > 0
    ? Math.round(monitors.reduce((acc, m) => acc + calcPct(m), 0) / monitors.length)
    : 0;

  /* ── filter + sort + paginate ── */
  const filtered = useMemo(() => {
    let list = monitors;
    if (statusFilter !== "all") list = list.filter(m => m.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.class_name.toLowerCase().includes(q) ||
        (m.teacher_name || "").toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      let va: string | number, vb: string | number;
      if (sortKey === "pct") { va = calcPct(a); vb = calcPct(b); }
      else if (sortKey === "status") {
        const order = { overdue: 0, partial: 1, pending: 2, complete: 3 };
        va = order[a.status]; vb = order[b.status];
      } else { va = (a as any)[sortKey] ?? ""; vb = (b as any)[sortKey] ?? ""; }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [monitors, statusFilter, search, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
    setPage(1);
  }

  function handleFilterClick(f: StatusFilter) {
    setStatusFilter(f);
    setPage(1);
  }

  /* ── export CSV ── */
  function exportCSV() {
    const rows = [
      ["Class", "Teacher", "Completed", "Expected", "Pending", "Pct%", "Status", "Deadline", "Last Scanned"],
      ...filtered.map(m => [
        m.class_name, m.teacher_name || "", m.completed_students_count,
        m.expected_students_count, m.pending_students_count, calcPct(m),
        m.status, m.submission_deadline || "", m.last_scanned_at || "",
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `result-monitoring-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  const isSpinning = loading || refreshing;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .rmp-main {
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: 24px 28px 0;
        }

        /* ── page header ── */
        .rmp-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 24px;
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 18px;
          padding: 32px 36px;
          color: #fff;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
          position: relative;
          overflow: hidden;
        }
        .rmp-header::after {
          content: "";
          position: absolute;
          top: -60px;
          right: -60px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.15) 0%, transparent 65%);
          pointer-events: none;
        }
        .rmp-header > * { position: relative; z-index: 1; }

        .rmp-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 700; color: #FBBF24; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em; }
        .rmp-breadcrumb a { color: #FBBF24; text-decoration: none; cursor: pointer; }
        .rmp-breadcrumb a:hover { color: #fff; }
        .rmp-breadcrumb-sep { opacity: .6; }
        .rmp-page-title { font-size: 26px; font-weight: 800; color: #fff; line-height: 1.1; margin: 0 0 6px; }
        .rmp-page-sub { font-size: 13.5px; color: #CBD5E1; margin: 0; line-height: 1.6; }
        .rmp-header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 4px; }

        /* ── buttons ── */
        .rmp-btn { display: inline-flex; align-items: center; gap: 8px; padding: 9px 18px; font-size: 13px; font-weight: 700; border-radius: 10px; cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
        .rmp-btn--gold { color: #FFFFFF; background: #D97706; border: none; }
        .rmp-btn--gold:hover { background: #B45309; transform: translateY(-1px); }
        .rmp-btn--outline { color: #FFFFFF; background: rgba(255, 255, 255, 0.10); border: 1px solid rgba(255, 255, 255, 0.20); }
        .rmp-btn--outline:hover { background: rgba(255, 255, 255, 0.18); color: #fff; }
        .rmp-btn--outline:disabled { opacity: .55; cursor: not-allowed; transform: none; }
        @keyframes rmSpin { to { transform: rotate(360deg); } }

        /* ── stat bar ── */
        .rmp-statbar { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px; }
        @media(max-width:991.98px) { .rmp-statbar { grid-template-columns: repeat(3, 1fr); } }
        @media(max-width:575.98px) { .rmp-statbar { grid-template-columns: repeat(2, 1fr); } }
        .rm-stat-tile { background: #fff; border: 1px solid #E2E8F0; border-radius: 14px; padding: 16px 18px; cursor: pointer; transition: all 0.2s ease; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; position: relative; overflow: hidden; text-align: left; box-shadow: 0 2px 8px rgba(15,39,68,0.02); }
        .rm-stat-tile:hover { transform: translateY(-2px); border-color: #D97706 !important; box-shadow: 0 4px 16px rgba(217,119,6,0.10); }
        .rm-stat-tile-val { font-size: 24px; font-weight: 800; color: var(--st-color); line-height: 1; }
        .rm-stat-tile-label { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #64748B; }
        .rm-stat-tile-dot { position: absolute; top: 12px; right: 12px; width: 8px; height: 8px; border-radius: 50%; }

        /* ── avg completion tile ── */
        .rmp-avg-tile { background: #fff; border: 1px solid #E2E8F0; border-radius: 14px; padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 2px 8px rgba(15,39,68,0.02); }
        .rmp-avg-label { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #64748B; }
        .rmp-avg-val { font-size: 24px; font-weight: 800; color: #0F2744; line-height: 1; }
        .rmp-avg-bar { height: 6px; border-radius: 999px; background: #E2E8F0; overflow: hidden; margin-top: 6px; }
        .rmp-avg-bar-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #D97706, #FBBF24); transition: width .6s ease; }

        /* ── toolbar ── */
        .rmp-toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
        .rmp-search-wrap { position: relative; flex: 1; min-width: 180px; max-width: 320px; }
        .rmp-search { width: 100%; padding: 10px 14px 10px 36px; font-size: 13px; color: #0F2744; font-weight: 600; background: #fff; border: 1px solid #E2E8F0; border-radius: 10px; outline: none; transition: border-color .2s; }
        .rmp-search:focus { border-color: #D97706; box-shadow: 0 0 0 3px rgba(217,119,6,0.12); }
        .rmp-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #64748B; pointer-events: none; }
        .rmp-sort-select { padding: 10px 14px; font-size: 13px; font-weight: 600; color: #0F2744; background: #fff; border: 1px solid #E2E8F0; border-radius: 10px; cursor: pointer; outline: none; appearance: none; padding-right: 30px; background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2364748B' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; transition: border-color .2s; }
        .rmp-sort-select:focus { border-color: #D97706; }
        .rmp-result-count { margin-left: auto; font-size: 12px; color: #64748B; font-weight: 600; white-space: nowrap; }

        /* ── grid ── */
        .rmp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 16px; margin-bottom: 24px; }

        /* ── card ── */
        .rm-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px; animation: rmCardIn .4s ease both; transition: all .2s ease; box-shadow: 0 2px 8px rgba(15,39,68,0.02); }
        .rm-card:hover { box-shadow: 0 6px 20px rgba(15,39,68,0.08); transform: translateY(-2px); border-color: #CBD5E1; }
        @keyframes rmCardIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .rm-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 14px; }
        .rm-card-class { font-size: 15px; font-weight: 800; color: #0F2744; margin: 0 0 4px; }
        .rm-card-teacher { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #64748B; margin: 0; }
        .rm-status-badge { font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; white-space: nowrap; flex-shrink: 0; }
        .rm-bar-wrap { margin-bottom: 12px; }
        .rm-bar-track { height: 6px; border-radius: 999px; background: #E2E8F0; overflow: hidden; margin-bottom: 6px; }
        .rm-bar-fill { height: 100%; border-radius: 999px; transition: width .6s cubic-bezier(.34,1.2,.64,1); }
        .rm-bar-labels { display: flex; justify-content: space-between; align-items: center; }
        .rm-bar-pct { font-size: 12.5px; font-weight: 700; color: var(--rmc-color); }
        .rm-bar-count { font-size: 11.5px; font-weight: 600; color: #64748B; }
        .rm-card-footer { display: flex; flex-wrap: wrap; gap: 6px; padding-top: 12px; border-top: 1px solid #E2E8F0; }
        .rm-meta-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 600; padding: 4px 10px; border-radius: 8px; }
        .rm-meta-chip--deadline { background: #F1F5F9; color: #475569; }
        .rm-meta-chip--pending { background: #FEF3C7; color: #92400E; }
        .rm-meta-chip--scan { background: #EEF2FF; color: #3730A3; }

        /* ── skeleton ── */
        .rm-skeleton-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px; }
        .rm-skel { display: block; border-radius: 6px; background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%); background-size: 200% 100%; animation: rmSkelAnim 1.4s ease infinite; }
        @keyframes rmSkelAnim { from { background-position: 200% 0; } to { background-position: -200% 0; } }
        .rm-skel--title { height: 14px; width: 55%; margin-bottom: 0; }
        .rm-skel--sub { height: 11px; width: 70%; }
        .rm-skel--bar { height: 6px; border-radius: 999px; }

        /* ── empty state ── */
        .rmp-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 72px 24px; text-align: center; }
        .rmp-empty-icon { width: 64px; height: 64px; border-radius: 50%; background: #DCFCE7; border: 1px solid #BBF7D0; display: flex; align-items: center; justify-content: center; color: #166534; }
        .rmp-empty-icon--neutral { background: #F1F5F9; border-color: #E2E8F0; color: #64748B; }
        .rmp-empty-title { font-size: 18px; font-weight: 800; color: #0F2744; margin: 0; }
        .rmp-empty-sub { font-size: 13px; color: #64748B; margin: 0; max-width: 280px; }

        /* ── error bar ── */
        .rmp-error { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #FEE2E2; border: 1px solid #FECACA; border-radius: 10px; font-size: 13px; color: #991B1B; margin-bottom: 20px; }

        /* ── pagination ── */
        .rmp-pagination { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 0 0 28px; }
        .rmp-page-info { font-size: 12px; color: #64748B; font-weight: 600; }
        .rmp-page-btns { display: flex; align-items: center; gap: 6px; }
        .rmp-page-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; font-size: 12.5px; font-weight: 600; color: #0F2744; background: #fff; border: 1px solid #E2E8F0; cursor: pointer; transition: all .15s ease; }
        .rmp-page-btn:hover:not(:disabled) { background: #F1F5F9; }
        .rmp-page-btn:disabled { opacity: .35; cursor: not-allowed; }
        .rmp-page-btn--active { background: #0F2744 !important; color: #fff !important; border-color: #0F2744 !important; }

        /* ── last-updated ── */
        .rmp-last-updated { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: #CBD5E1; }
        .rmp-live-dot { width: 6px; height: 6px; border-radius: 50%; background: #10B981; animation: rmPulse 2.4s ease infinite; }
        @keyframes rmPulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .3; transform: scale(1.6); } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Result Submission Monitoring" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />
          <main className="col-md-9 col-lg-10 ms-auto rmp-main">

            {/* ── Page Header ── */}
            <div className="rmp-header">
              <div>
                <div className="rmp-breadcrumb">
                  <a onClick={() => navigate("/dashboard")}>Dashboard</a>
                  <span className="rmp-breadcrumb-sep">/</span>
                  <span>Result Monitoring</span>
                </div>
                <h1 className="rmp-page-title">Result Submission Monitoring</h1>
                <p className="rmp-page-sub">Live upload status across all classes this term</p>
              </div>
              <div className="rmp-header-actions">
                {lastUpdated && (
                  <span className="rmp-last-updated">
                    <span className="rmp-live-dot" />
                    Updated {formatRelativeTime(lastUpdated.toISOString())}
                  </span>
                )}
                <button className="rmp-btn rmp-btn--outline" onClick={exportCSV} disabled={loading || monitors.length === 0}>
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1v8M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M1 10v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  Export CSV
                </button>
                <button className="rmp-btn rmp-btn--gold" onClick={() => fetchData(true)} disabled={isSpinning}>
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ animation: refreshing ? "rmSpin 0.8s linear infinite" : "none" }}>
                    <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {refreshing ? "Refreshing…" : "Refresh"}
                </button>
              </div>
            </div>

            {/* ── Stat Bar ── */}
            <div className="rmp-statbar">
              <StatTile label="All classes" value={monitors.length}
                color="rgb(107,114,128)" bg="rgba(107,114,128,0.06)" border="rgba(107,114,128,0.18)"
                onClick={() => handleFilterClick("all")} active={statusFilter === "all"} />
              <StatTile label="Overdue" value={overdueCount}
                color="rgb(239,68,68)" bg="rgba(239,68,68,0.07)" border="rgba(239,68,68,0.20)"
                onClick={() => handleFilterClick("overdue")} active={statusFilter === "overdue"} />
              <StatTile label="Partial" value={partialCount}
                color="rgb(245,158,11)" bg="rgba(245,158,11,0.07)" border="rgba(245,158,11,0.20)"
                onClick={() => handleFilterClick("partial")} active={statusFilter === "partial"} />
              <StatTile label="Pending" value={pendingCount}
                color="rgb(59,130,246)" bg="rgba(59,130,246,0.07)" border="rgba(59,130,246,0.20)"
                onClick={() => handleFilterClick("pending")} active={statusFilter === "pending"} />
              <StatTile label="Complete" value={completeCount}
                color="rgb(34,197,94)" bg="rgba(34,197,94,0.07)" border="rgba(34,197,94,0.18)"
                onClick={() => handleFilterClick("complete")} active={statusFilter === "complete"} />
            </div>

            {/* ── Avg completion banner ── */}
            {!loading && monitors.length > 0 && (
              <div style={{ background: "#fff", border: "1px solid var(--db-border)", borderRadius: "var(--db-radius)", padding: "18px 22px", marginBottom: 20, display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
                <div>
                  <p style={{ fontSize: 12, color: "#9a8a7a", margin: "0 0 4px" }}>Average completion rate</p>
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: "var(--db-dark)", margin: 0, lineHeight: 1 }}>{avgCompletion}%</p>
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ height: 8, borderRadius: 999, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${avgCompletion}%`, background: avgCompletion >= 80 ? "#22c55e" : avgCompletion >= 50 ? "#f59e0b" : "#ef4444", borderRadius: 999, transition: "width .8s ease" }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  {[
                    { label: "Total classes", val: monitors.length },
                    { label: "Total students expected", val: monitors.reduce((s, m) => s + m.expected_students_count, 0) },
                    { label: "Submitted", val: monitors.reduce((s, m) => s + m.completed_students_count, 0) },
                    { label: "Still pending", val: monitors.reduce((s, m) => s + m.pending_students_count, 0) },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "var(--db-dark)", margin: 0, lineHeight: 1 }}>{val}</p>
                      <p style={{ fontSize: 11, color: "#9a8a7a", margin: "3px 0 0" }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Toolbar ── */}
            <div className="rmp-toolbar">
              <div className="rmp-search-wrap">
                <svg className="rmp-search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <input className="rmp-search" type="text" placeholder="Search class or teacher…"
                  value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
              </div>

              <select className="rmp-sort-select" value={sortKey}
                onChange={e => { setSortKey(e.target.value as SortKey); setPage(1); }}>
                <option value="status">Sort: Status</option>
                <option value="class_name">Sort: Class name</option>
                <option value="pct">Sort: Completion %</option>
                <option value="pending_students_count">Sort: Pending count</option>
              </select>

              <button className="rmp-btn rmp-btn--outline" style={{ padding: "9px 12px" }}
                onClick={() => setSortAsc(a => !a)} title={sortAsc ? "Ascending" : "Descending"}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  {sortAsc
                    ? <path d="M3 10V4M3 4l-2 2M3 4l2 2M7 4h6M7 7h5M7 10h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    : <path d="M3 4v6M3 10l-2-2M3 10l2-2M7 4h6M7 7h5M7 10h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  }
                </svg>
              </button>

              <span className="rmp-result-count">
                {loading ? "Loading…" : `${filtered.length} class${filtered.length !== 1 ? "es" : ""}`}
              </span>
            </div>

            {/* ── Error ── */}
            {error && (
              <div className="rmp-error">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {error}
                <button className="rmp-btn rmp-btn--outline" style={{ marginLeft: "auto", padding: "5px 12px", fontSize: 12 }} onClick={() => fetchData(true)}>Retry</button>
              </div>
            )}

            {/* ── Grid ── */}
            <div className="rmp-grid">
              {loading
                ? Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)
                : paged.length === 0
                  ? null
                  : paged.map((m, idx) => <MonitorCard key={m.id} m={m} idx={idx} />)
              }
            </div>

            {/* ── Empty state ── */}
            {!loading && paged.length === 0 && (
              <div className="rmp-empty">
                {filtered.length === 0 && monitors.length > 0 ? (
                  <>
                    <div className="rmp-empty-icon rmp-empty-icon--neutral">
                      <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.4"/><path d="M11 16h10M11 11l5-5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <p className="rmp-empty-title">No results match</p>
                    <p className="rmp-empty-sub">Try adjusting your search or filter to find what you're looking for.</p>
                    <button className="rmp-btn rmp-btn--outline" onClick={() => { setSearch(""); setStatusFilter("all"); }}>Clear filters</button>
                  </>
                ) : (
                  <>
                    <div className="rmp-empty-icon">
                      <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.4"/><path d="M10 16l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <p className="rmp-empty-title">All caught up!</p>
                    <p className="rmp-empty-sub">No incomplete result submissions right now.</p>
                  </>
                )}
              </div>
            )}

            {/* ── Pagination ── */}
            {!loading && totalPages > 1 && (
              <div className="rmp-pagination">
                <span className="rmp-page-info">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <div className="rmp-page-btns">
                  <button className="rmp-page-btn" onClick={() => setPage(1)} disabled={page === 1}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9 2L5 6l4 4M6 2L2 6l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <button className="rmp-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                    const n = start + i;
                    return n <= totalPages ? (
                      <button key={n} className={`rmp-page-btn ${n === page ? "rmp-page-btn--active" : ""}`} onClick={() => setPage(n)}>{n}</button>
                    ) : null;
                  })}
                  <button className="rmp-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <button className="rmp-page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 2l4 4-4 4M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </div>
            )}

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}