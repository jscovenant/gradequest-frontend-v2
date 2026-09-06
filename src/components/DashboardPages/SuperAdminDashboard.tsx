import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";
import TopNav from "../LayoutComponents/TopNav";
import Sidebar from "../LayoutComponents/Sidebar";
import Footer from "../LayoutComponents/Footer";
import Loader from "../ui/dashboardLoader";
import { authApi } from "../../utils/axios";
import { useToast } from "../../contexts/ToastContext";
import PageTitle from "../PageTitle";
import { getUser } from "../../utils/token";

type Plan = { id: number; name: string; price?: number | null; duration_in_days?: number | null };
type SubscriptionRow = { id: number; status: string; starts_at?: string | null; ends_at?: string | null; auto_renew?: boolean; user?: { id: number; firstname?: string; surname?: string; name?: string; email?: string; school_id?: number | null }; plan?: Plan | null };
type Paginated<T> = { current_page: number; data: T[]; from?: number | null; to?: number | null; last_page: number; per_page: number; total: number };
type AdminRow = { id: number; firstname?: string; surname?: string; email?: string; created_at?: string | null; school?: { id?: number; school_name?: string } | null };
type LogRow = { id: number; user_name: string; action: string; description?: string | null; created_at: string };
type RevenueRow = { month: string; revenue: number };
type MarketingMaterial = { id:number; title:string; description?:string|null; type:string; asset_url?:string|null; is_active:boolean };
type Tier = "core" | "premium_active" | "premium_expired";

function isCorePlan(name?: string | null) { const n = (name || "").trim().toLowerCase(); return !n || n === "free" || n === "core"; }
function deriveTier(s: SubscriptionRow): Tier { if (isCorePlan(s.plan?.name)) return "core"; if (!s.ends_at) return "premium_active"; const d = new Date(s.ends_at); if (Number.isNaN(d.getTime()) || d.getFullYear() >= 2099) return "premium_active"; return d.getTime() < Date.now() ? "premium_expired" : "premium_active"; }
function tierLabel(t: Tier) { return t === "premium_active" ? "Premium Active" : t === "premium_expired" ? "Premium Expired" : "Core"; }
function tierClass(t: Tier) { return t === "premium_active" ? "sa-pill good" : t === "premium_expired" ? "sa-pill warn" : "sa-pill muted"; }
function statusClass(s?: string) { const v = String(s || "").toLowerCase(); if (v.includes("active")) return "sa-pill good"; if (v.includes("pending")) return "sa-pill warn"; if (v.includes("expire") || v.includes("cancel")) return "sa-pill danger"; return "sa-pill muted"; }
function fmtNaira(n: number) { try { return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(n || 0)); } catch { return `NGN ${Number(n || 0).toLocaleString()}`; } }
function fmtDate(v?: string | null) { if (!v) return "Lifetime / Forever"; const d = new Date(v); if (Number.isNaN(d.getTime())) return v; if (d.getFullYear() >= 2099) return "Lifetime / Forever"; return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
function personName(u?: SubscriptionRow["user"] | AdminRow) { if (!u) return "Unknown"; const n = `${(u as any).surname ?? ""} ${(u as any).firstname ?? ""}`.trim(); return n || (u as any).name || (u as any).email || "Unknown"; }
function initials(n: string) { return n.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "GQ"; }

function Metric({ title, value, hint, icon, tone = "pink" }: { title: string; value: string | number; hint: string; icon: string; tone?: string }) {
  return <div className={`sa-metric tone-${tone}`}><div className="sa-metric-top"><span className="sa-metric-icon"><i className={`bi bi-${icon}`} /></span><i className="bi bi-arrow-up-right sa-metric-arrow" /></div><p>{title}</p><h3>{value}</h3><small>{hint}</small></div>;
}
function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="sa-panel"><div className="sa-panel-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action && <div>{action}</div>}</div>{children}</section>;
}
function Empty({ text }: { text: string }) { return <div className="sa-empty"><i className="bi bi-inbox" /><span>{text}</span></div>; }
function Pager({ data, perPage, sizes, onPage, onPerPage }: { data: Paginated<any> | null; perPage: number; sizes: number[]; onPage: (p: number) => void; onPerPage: (n: number) => void }) {
  if (!data || data.last_page <= 1) return null;
  return <div className="sa-pager"><span>Showing {data.from ?? 0} - {data.to ?? 0} of {data.total}</span><div><select value={perPage} onChange={(e) => onPerPage(Number(e.target.value))}>{sizes.map((n) => <option key={n} value={n}>{n}/page</option>)}</select><button disabled={data.current_page <= 1} onClick={() => onPage(Math.max(1, data.current_page - 1))}><i className="bi bi-chevron-left" /></button><b>{data.current_page} / {data.last_page}</b><button disabled={data.current_page >= data.last_page} onClick={() => onPage(Math.min(data.last_page, data.current_page + 1))}><i className="bi bi-chevron-right" /></button></div></div>;
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revenueRows, setRevenueRows] = useState<RevenueRow[]>([]);
  const [subs, setSubs] = useState<Paginated<SubscriptionRow> | null>(null);
  const [admins, setAdmins] = useState<Paginated<AdminRow> | null>(null);
  const [logs, setLogs] = useState<Paginated<LogRow> | null>(null);
  const [featuredCampaign, setFeaturedCampaign] = useState<MarketingMaterial | null>(null);
  const [activeStudentsCount, setActiveStudentsCount] = useState<number | null>(null);
  const [subsPage, setSubsPage] = useState(1); const [subsPerPage, setSubsPerPage] = useState(10); const [subsStatus, setSubsStatus] = useState(""); const [subsTier, setSubsTier] = useState("all"); const [subsSearch, setSubsSearch] = useState(""); const [activeOnly, setActiveOnly] = useState(false);
  const [adminsPage, setAdminsPage] = useState(1); const [adminsPerPage, setAdminsPerPage] = useState(8); const [adminsSearch, setAdminsSearch] = useState("");
  const [logsPage, setLogsPage] = useState(1); const [logsPerPage, setLogsPerPage] = useState(10); const [selectedLogs, setSelectedLogs] = useState<number[]>([]); const [deletingLogs, setDeletingLogs] = useState(false);
  const [maintenanceState, setMaintenanceState] = useState<{
    is_active: boolean;
    is_scheduled?: boolean;
    is_in_effect?: boolean;
    start_time?: string | null;
    end_time?: string | null;
    message: string;
    activated_at?: string | null;
    activated_by?: string | null;
    last_emailed_at?: string | null;
  }>({
    is_active: false,
    is_scheduled: false,
    is_in_effect: false,
    start_time: null,
    end_time: null,
    message: "We are working harder to make things better, please hold on...",
    activated_at: null,
    activated_by: null,
    last_emailed_at: null,
  });
  const [maintenanceUpdating, setMaintenanceUpdating] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"immediate" | "scheduled">("immediate");
  const [customMaintenanceMsg, setCustomMaintenanceMsg] = useState("We are working harder to make things better, please hold on...");
  const [scheduledStartTime, setScheduledStartTime] = useState("");
  const [scheduledEndTime, setScheduledEndTime] = useState("");
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const chartRef = useRef<HTMLCanvasElement | null>(null); const chartInstance = useRef<Chart | null>(null);
  const currentUser = getUser();
  const superAdminPermissions = Array.isArray(currentUser?.super_admin_permissions) ? currentUser.super_admin_permissions : [];
  const can = (permission: string) => superAdminPermissions.includes("all") || superAdminPermissions.includes(permission);
  const visibleSubs = useMemo(() => (subs?.data || []).filter((s) => { const t = deriveTier(s); if (subsTier === "core") return t === "core"; if (subsTier === "premium_active") return t === "premium_active"; if (subsTier === "premium_expired") return t === "premium_expired"; if (subsTier === "premium") return t !== "core"; return true; }), [subs, subsTier]);
  const tierCounts = useMemo(() => (subs?.data || []).reduce((a, s) => { const t = deriveTier(s); a.total += 1; if (t === "core") a.core += 1; if (t === "premium_active") a.active += 1; if (t === "premium_expired") a.expired += 1; return a; }, { total: 0, core: 0, active: 0, expired: 0 }), [subs]);
  const ytdRevenue = useMemo(() => revenueRows.reduce((sum, r) => sum + Number(r.revenue || 0), 0), [revenueRows]);
  const latestRevenue = Number(revenueRows[revenueRows.length - 1]?.revenue || 0);
  const activeSubsOnPage = (subs?.data || []).filter((s) => String(s.status || "").toLowerCase().includes("active")).length;
  const logIds = useMemo(() => (logs?.data || []).map((l) => l.id), [logs]);
  const allLogsSelected = logIds.length > 0 && logIds.every((id) => selectedLogs.includes(id));

  async function fetchMaintenance() {
    try {
      const res = await authApi.get("/superadmin/maintenance-mode/status");
      if (res.data?.status) {
        setMaintenanceState(res.data.status);
        if (res.data.status.message) setCustomMaintenanceMsg(res.data.status.message);
        if (res.data.status.start_time) setScheduledStartTime(res.data.status.start_time);
        if (res.data.status.end_time) setScheduledEndTime(res.data.status.end_time);
        if (res.data.status.is_scheduled) setScheduleMode("scheduled");
      }
    } catch { /* ignore */ }
  }

  async function handleToggleMaintenance(targetActive: boolean, isScheduled = false) {
    setMaintenanceUpdating(true);
    try {
      const res = await authApi.post("/superadmin/maintenance-mode/toggle", {
        is_active: targetActive,
        is_scheduled: isScheduled,
        start_time: isScheduled && scheduledStartTime ? scheduledStartTime : undefined,
        end_time: isScheduled && scheduledEndTime ? scheduledEndTime : undefined,
        message: customMaintenanceMsg.trim() || undefined,
        send_email_notification: targetActive || isScheduled ? sendEmailNotification : false,
      });
      setMaintenanceState(res.data.status);
      setShowMaintenanceModal(false);
      showSuccess(res.data.message || (targetActive ? "Maintenance mode activated." : "Platform restored online."));
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to update maintenance mode.");
    } finally {
      setMaintenanceUpdating(false);
    }
  }

  async function fetchRevenue() {
    const res = await authApi.get("/monthly-revenue-stats");
    setRevenueRows(Array.isArray(res.data?.data) ? res.data.data : []);
    if (res.data?.total_active_students !== undefined) {
      setActiveStudentsCount(Number(res.data.total_active_students));
    }
  }
  async function fetchSubscribers(page = subsPage, perPage = subsPerPage) { const p = new URLSearchParams(); p.set("page", String(page)); p.set("per_page", String(perPage)); if (subsStatus) p.set("status", subsStatus); if (activeOnly) p.set("active", "1"); if (subsSearch.trim()) p.set("search", subsSearch.trim()); const res = await authApi.get(`/admin/subscriptions?${p.toString()}`); setSubs(res.data?.data || null); }
  async function fetchAdmins(page = adminsPage, perPage = adminsPerPage) { const p = new URLSearchParams(); p.set("page", String(page)); p.set("perPage", String(perPage)); if (adminsSearch.trim()) p.set("search", adminsSearch.trim()); const res = await authApi.get(`/admin-users?${p.toString()}`); setAdmins(res.data || null); }
  async function fetchLogs(page = logsPage, perPage = logsPerPage) { const p = new URLSearchParams(); p.set("page", String(page)); p.set("per_page", String(perPage)); const res = await authApi.get(`/platform-logs?${p.toString()}`); setLogs(res.data || null); }
  async function fetchCampaign() { const res = await authApi.get("/superadmin/sales-marketing-materials", { params:{ active_only:1 } }); setFeaturedCampaign(res.data?.materials?.[0] || null); }
  async function refreshDashboard(toast = false) { setLoading(true); try { const tasks: Promise<any>[] = [fetchMaintenance()]; if (can("finance") || can("billing")) tasks.push(fetchRevenue(), fetchSubscribers()); if (can("support") || can("billing") || can("finance")) tasks.push(fetchAdmins()); if (can("audit")) tasks.push(fetchLogs()); if (can("marketing") || can("sales")) tasks.push(fetchCampaign()); await Promise.all(tasks); if (toast) showSuccess("Dashboard refreshed."); } catch (e: any) { showError(e?.response?.data?.message || "Failed to load Super Admin dashboard."); } finally { setLoading(false); } }

  useEffect(() => { void refreshDashboard(false); }, []);
  useEffect(() => { if (can("finance") || can("billing")) fetchSubscribers(subsPage, subsPerPage).catch(() => showError("Failed to load subscribers.")); }, [subsPage, subsPerPage]);
  useEffect(() => { if (can("support") || can("billing") || can("finance")) fetchAdmins(adminsPage, adminsPerPage).catch(() => showError("Failed to load schools.")); }, [adminsPage, adminsPerPage]);
  useEffect(() => { if (can("audit")) fetchLogs(logsPage, logsPerPage).catch(() => showError("Failed to load activity.")); }, [logsPage, logsPerPage]);

  useEffect(() => {
    if (!chartRef.current) return; const ctx = chartRef.current.getContext("2d"); if (!ctx) return;
    chartInstance.current?.destroy();
    chartInstance.current = new Chart(ctx, { type: "bar", data: { labels: revenueRows.map((r) => r.month), datasets: [{ label: "Revenue", data: revenueRows.map((r) => Number(r.revenue || 0)), backgroundColor: "rgba(211,0,176,.78)", hoverBackgroundColor: "rgba(247,201,72,.95)", borderRadius: 8, barThickness: 28 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (item) => fmtNaira(Number(item.raw || 0)) } } }, scales: { x: { grid: { display: false }, ticks: { color: "#766a79", font: { size: 11 } } }, y: { beginAtZero: true, grid: { color: "rgba(29,21,31,.08)" }, ticks: { color: "#766a79", font: { size: 11 } } } } } });
    return () => chartInstance.current?.destroy();
  }, [revenueRows]);

  function applySubscriberFilters() { setSubsPage(1); fetchSubscribers(1, subsPerPage).then(() => showSuccess("Subscribers updated.")).catch(() => showError("Failed to apply subscriber filters.")); }
  function applyAdminSearch() { setAdminsPage(1); fetchAdmins(1, adminsPerPage).then(() => showSuccess("Schools updated.")).catch(() => showError("Failed to apply school search.")); }
  function reloadLogs() { setLogsPage(1); fetchLogs(1, logsPerPage).then(() => showSuccess("Activity reloaded.")).catch(() => showError("Failed to reload activity.")); }
  function toggleLog(id: number) { setSelectedLogs((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]); }
  function toggleAllLogs() { setSelectedLogs((cur) => allLogsSelected ? cur.filter((id) => !logIds.includes(id)) : Array.from(new Set([...cur, ...logIds]))); }
  async function deleteSelectedLogs() { if (!selectedLogs.length) return; if (!window.confirm(`Delete ${selectedLogs.length} selected activity log(s)?`)) return; setDeletingLogs(true); try { await authApi.post("/platform-logs/delete-multiple", { ids: selectedLogs }); setSelectedLogs([]); showSuccess("Selected logs deleted."); await fetchLogs(); } catch (e: any) { showError(e?.response?.data?.message || "Failed to delete selected logs."); } finally { setDeletingLogs(false); } }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        :root{--sa-bg:#F8FAFC;--sa-panel:#fff;--sa-ink:#0F2744;--sa-muted:#64748B;--sa-border:#E2E8F0;--sa-gold:#D97706;--sa-primary:#0F2744;--sa-green:#10B981;--sa-blue:#2563EB;--sa-red:#EF4444}
        .sa-main{min-height:100vh;background:#F8FAFC;font-family:'Plus Jakarta Sans',system-ui,-apple-system,sans-serif;margin-left:280px;width:calc(100% - 280px);max-width:calc(100% - 280px);padding:96px 28px 32px;transition:margin .2s,width .2s}.sa-shell{max-width:1480px;margin:0 auto}.sa-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:end;background:linear-gradient(135deg,#0A192F 0%,#0F2744 60%,#1E3A8A 100%);border-radius:20px;padding:32px;color:#fff;box-shadow:0 10px 30px -5px rgba(15,39,68,0.15)}.sa-eyebrow{display:inline-flex;align-items:center;gap:8px;color:#FBBF24;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px}.sa-title{font-size:clamp(28px,3.5vw,42px);font-weight:800;letter-spacing:0;line-height:1.1;margin:0 0 10px}.sa-sub{max-width:760px;color:#CBD5E1;line-height:1.6;font-size:14px;margin:0}.sa-hero-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}
        .sa-btn{border:0;border-radius:10px;min-height:40px;padding:9px 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap;transition:all .2s ease}.sa-btn:disabled{opacity:.55;cursor:not-allowed}.sa-btn-gold{background:#D97706;color:#fff}.sa-btn-gold:hover{background:#B45309;color:#fff}.sa-btn-dark{background:#0F2744;color:#fff}.sa-btn-soft{background:#fff;color:#0F2744;border:1px solid #E2E8F0}.sa-btn-soft:hover{background:#F8FAFC}.sa-btn-light{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.2)}.sa-btn-light:hover{background:rgba(255,255,255,.2)}
        .sa-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px;margin:20px 0}.sa-metric{background:#fff;border:1px solid #E2E8F0;border-radius:16px;padding:20px;box-shadow:0 4px 16px rgba(15,39,68,0.03);transition:all .2s ease}.sa-metric:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(15,39,68,0.06);border-color:#CBD5E1}.sa-metric-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.sa-metric-icon{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;background:rgba(15,39,68,.08);color:#0F2744}.tone-gold .sa-metric-icon{background:rgba(217,119,6,.12);color:#D97706}.tone-green .sa-metric-icon{background:rgba(16,185,129,.12);color:#10B981}.tone-blue .sa-metric-icon{background:rgba(37,99,235,.12);color:#2563EB}.tone-red .sa-metric-icon{background:rgba(239,68,68,.12);color:#EF4444}.sa-metric p{font-size:12px;color:#64748B;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:0 0 6px}.sa-metric h3{font-size:clamp(22px,2.4vw,28px);font-weight:800;color:#0F2744;margin:0;letter-spacing:0}.sa-metric small{font-size:12px;color:#94A3B8}.sa-metric-arrow{color:#CBD5E1;font-size:13px}
        .sa-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(320px,.65fr);gap:20px;margin-bottom:20px}.sa-two{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}.sa-panel{background:#fff;border:1px solid #E2E8F0;border-radius:18px;box-shadow:0 4px 16px rgba(15,39,68,0.03);overflow:hidden;margin-bottom:20px}.sa-panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:20px 24px;border-bottom:1px solid #F1F5F9}.sa-panel-head h2{color:#0F2744;font-weight:800;font-size:18px;margin:0;letter-spacing:0}.sa-panel-head p{font-size:12.5px;color:#64748B;margin:3px 0 0}.sa-chart{height:310px;padding:20px 24px 24px}.sa-health{display:grid;gap:12px;padding:20px 24px}.sa-health-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 16px;border:1px solid #E2E8F0;border-radius:12px;background:#F8FAFC}.sa-health-main{display:flex;align-items:center;gap:10px}.sa-health-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid #E2E8F0;color:#0F2744}.sa-health-title{font-weight:800;color:#0F2744;font-size:13.5px;margin:0}.sa-health-sub{font-size:12px;color:#64748B;margin:2px 0 0}.sa-health-value{font-weight:800;color:#0F2744;font-size:20px}
        .sa-actions{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px;margin-bottom:20px}.sa-action{border:1px solid #E2E8F0;background:#fff;border-radius:16px;padding:18px;text-decoration:none;color:#0F2744;box-shadow:0 4px 16px rgba(15,39,68,0.03);transition:all .2s ease}.sa-action:hover{color:#0F2744;transform:translateY(-2px);border-color:#CBD5E1;box-shadow:0 8px 24px rgba(15,39,68,0.06)}.sa-action i{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:rgba(217,119,6,.12);color:#D97706;font-size:18px;margin-bottom:12px}.sa-action-title{font-weight:800;margin:0 0 4px}.sa-action-sub{font-size:12px;color:#64748B;margin:0;line-height:1.5}
        .sa-filters{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:14px 24px;border-bottom:1px solid #F1F5F9;background:#F8FAFC}.sa-input,.sa-select{height:38px;border:1px solid #E2E8F0;background:#fff;border-radius:10px;padding:0 12px;color:#0F2744;font-size:13px;outline:0}.sa-check{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;color:#64748B;font-weight:700}.sa-table-wrap{overflow:auto}.sa-table{width:100%;min-width:760px;border-collapse:collapse}.sa-table th{background:#F8FAFC;color:#64748B;text-transform:uppercase;font-size:11px;font-weight:700;letter-spacing:.06em;padding:12px 16px;border-bottom:1px solid #E2E8F0}.sa-table td{padding:14px 16px;border-bottom:1px solid #F1F5F9;font-size:13.5px;color:#334155;vertical-align:middle}.sa-table tr:hover td{background:#F8FAFC}.sa-name-cell{display:flex;align-items:center;gap:10px;min-width:0}.sa-avatar{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#0F2744,#1E3A8A);color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}.sa-main-text{font-weight:800;color:#0F2744;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px}.sa-sub-text{font-size:12px;color:#64748B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px}.sa-pill{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:4px 10px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap}.sa-pill.good{background:#D1FAE5;color:#065F46}.sa-pill.warn{background:#FEF3C7;color:#92400E}.sa-pill.danger{background:#FEE2E2;color:#991B1B}.sa-pill.muted{background:#F1F5F9;color:#475569}
        .sa-pager{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 24px;color:#64748B;font-size:12.5px}.sa-pager>div{display:flex;align-items:center;gap:8px}.sa-pager select,.sa-pager button{height:34px;border:1px solid #E2E8F0;background:#fff;border-radius:8px;padding:0 10px;color:#0F2744}.sa-pager button:disabled{opacity:.45}.sa-empty{padding:36px 20px;text-align:center;color:#64748B;display:flex;flex-direction:column;align-items:center;gap:8px}.sa-empty i{font-size:28px;color:#CBD5E1}.sa-log-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 24px;border-bottom:1px solid #F1F5F9;background:#F8FAFC}.sa-log-select{display:flex;align-items:center;gap:8px;color:#64748B;font-size:12.5px;font-weight:700}.sa-risk{padding:20px 24px;display:grid;gap:12px}.sa-risk-item{display:flex;gap:12px;padding:14px 16px;border-radius:12px;border:1px solid #E2E8F0;background:#F8FAFC}.sa-risk-dot{width:10px;height:10px;border-radius:999px;margin-top:5px;flex-shrink:0}.sa-risk-dot.red{background:#EF4444}.sa-risk-dot.gold{background:#F59E0B}.sa-risk-dot.green{background:#10B981}.sa-risk-title{font-weight:800;color:#0F2744;margin:0 0 3px;font-size:13.5px}.sa-risk-sub{color:#64748B;font-size:12px;line-height:1.5;margin:0}
        @media(max-width:1199px){.sa-main{margin-left:0;width:100%;max-width:100%;padding:92px 16px 28px}.sa-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.sa-grid,.sa-two{grid-template-columns:1fr}.sa-actions{grid-template-columns:repeat(2,minmax(0,1fr))}.sa-hero{grid-template-columns:1fr}.sa-hero-actions{justify-content:flex-start}}@media(max-width:640px){.sa-main{padding-left:12px;padding-right:12px}.sa-metrics,.sa-actions{grid-template-columns:1fr}.sa-hero{padding:22px}.sa-panel-head,.sa-filters,.sa-log-toolbar,.sa-pager{align-items:flex-start;flex-direction:column}.sa-btn,.sa-input,.sa-select{width:100%}.sa-pager>div{width:100%;justify-content:space-between}.sa-chart{height:260px}}
      `}</style>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Platform Command Center" />
      <PageTitle title="Super Admin Dashboard" />
      <div className="container-fluid"><div className="row"><Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="sa-main">{loading && <Loader message="Loading Super Admin dashboard..." />}<div className="sa-shell">
          <section className="sa-hero"><div><div className="sa-eyebrow"><i className="bi bi-shield-lock" /> GradiosEdu Super Admin</div><h1 className="sa-title">Platform Command Center</h1><p className="sa-sub">Monitor the platform areas assigned to your administrator account. Your access level is {currentUser?.super_admin_type_label || "Super Admin"}.</p></div><div className="sa-hero-actions"><button className="sa-btn sa-btn-light" onClick={() => refreshDashboard(true)}><i className="bi bi-arrow-repeat" />Refresh</button><button className="sa-btn sa-btn-gold" onClick={() => navigate("/superadmin/billing-policy")}><i className="bi bi-sliders" />Billing policy</button></div></section>

          {/* Platform Maintenance Mode Controller */}
          <section
            style={{
              background: (maintenanceState.is_active || maintenanceState.is_in_effect)
                ? "linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #991b1b 100%)"
                : maintenanceState.is_scheduled
                ? "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)"
                : "#ffffff",
              color: (maintenanceState.is_active || maintenanceState.is_in_effect || maintenanceState.is_scheduled) ? "#ffffff" : "#0f172a",
              border: (maintenanceState.is_active || maintenanceState.is_in_effect)
                ? "2px solid #ef4444"
                : maintenanceState.is_scheduled
                ? "2px solid #6366f1"
                : "1px solid rgba(29,21,31,.1)",
              borderRadius: 20,
              padding: "22px 26px",
              marginTop: 18,
              marginBottom: 18,
              boxShadow: (maintenanceState.is_active || maintenanceState.is_in_effect)
                ? "0 14px 34px rgba(220, 38, 38, 0.25)"
                : maintenanceState.is_scheduled
                ? "0 14px 34px rgba(99, 102, 241, 0.25)"
                : "0 10px 30px rgba(29,21,31,.05)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <div style={{ maxWidth: 820 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 12px",
                    borderRadius: 999,
                    fontSize: 11.5,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    background: (maintenanceState.is_active || maintenanceState.is_in_effect) ? "#fef2f2" : maintenanceState.is_scheduled ? "#eef2ff" : "#ecfdf5",
                    color: (maintenanceState.is_active || maintenanceState.is_in_effect) ? "#b91c1c" : maintenanceState.is_scheduled ? "#4338ca" : "#047857",
                    border: `1px solid ${(maintenanceState.is_active || maintenanceState.is_in_effect) ? "#fecaca" : maintenanceState.is_scheduled ? "#c7d2fe" : "#a7f3d0"}`,
                  }}
                >
                  <i className={`bi ${(maintenanceState.is_active || maintenanceState.is_in_effect) ? "bi-exclamation-octagon-fill" : maintenanceState.is_scheduled ? "bi-clock-history" : "bi-patch-check-fill"}`} />
                  {(maintenanceState.is_active || maintenanceState.is_in_effect) ? "Maintenance Mode Active (Read-Only Mode)" : maintenanceState.is_scheduled ? "Maintenance Scheduled Ahead" : "Platform Live & Operational"}
                </span>
                {maintenanceState.activated_at && (
                  <span style={{ fontSize: 12, opacity: 0.85 }}>
                    Set {new Date(maintenanceState.activated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} by {maintenanceState.activated_by || "Super Admin"}
                  </span>
                )}
                {maintenanceState.start_time && (
                  <span style={{ fontSize: 12, opacity: 0.9 }}>
                    • Start: <strong>{new Date(maintenanceState.start_time).toLocaleString()}</strong>
                  </span>
                )}
                {maintenanceState.end_time && (
                  <span style={{ fontSize: 12, opacity: 0.9 }}>
                    • Est. End: <strong>{new Date(maintenanceState.end_time).toLocaleString()}</strong>
                  </span>
                )}
              </div>

              <h2 style={{ fontSize: 19, fontWeight: 900, margin: "0 0 6px", color: (maintenanceState.is_active || maintenanceState.is_in_effect || maintenanceState.is_scheduled) ? "#ffffff" : "#0f172a" }}>
                {(maintenanceState.is_active || maintenanceState.is_in_effect)
                  ? "Platform Maintenance In Progress (Read-Only Portal Access)"
                  : maintenanceState.is_scheduled
                  ? "Scheduled Platform Optimization Upcoming"
                  : "Platform Maintenance & Infrastructure Controls"}
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: (maintenanceState.is_active || maintenanceState.is_in_effect || maintenanceState.is_scheduled) ? "rgba(255,255,255,0.85)" : "#64748b", lineHeight: 1.5 }}>
                {(maintenanceState.is_active || maintenanceState.is_in_effect)
                  ? `Active Notice: "${maintenanceState.message}" (School admins can browse records in read-only mode; results publishing, CBT, and parent payments are paused).`
                  : maintenanceState.is_scheduled
                  ? `Scheduled Notice: "${maintenanceState.message}". Advance emails were dispatched to school administrators.`
                  : "Trigger immediate or scheduled maintenance. School portals remain open in read-only mode while critical mutations (results, CBT, payments) are suspended."}
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {(maintenanceState.is_active || maintenanceState.is_in_effect || maintenanceState.is_scheduled) ? (
                <button
                  className="sa-btn"
                  style={{ background: "#ffffff", color: "#991b1b", fontWeight: 900, padding: "10px 18px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
                  onClick={() => handleToggleMaintenance(false, false)}
                  disabled={maintenanceUpdating}
                >
                  <i className="bi bi-power" />
                  {maintenanceUpdating ? "Restoring..." : "End Maintenance (Bring Online)"}
                </button>
              ) : (
                <button
                  className="sa-btn"
                  style={{ background: "#dc2626", color: "#ffffff", fontWeight: 900, padding: "10px 18px" }}
                  onClick={() => setShowMaintenanceModal(true)}
                  disabled={maintenanceUpdating}
                >
                  <i className="bi bi-tools" />
                  Trigger / Schedule Maintenance
                </button>
              )}
            </div>
          </section>

          {/* Maintenance Confirmation & Scheduling Modal */}
          {showMaintenanceModal && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16, backdropFilter: "blur(5px)" }}>
              <div style={{ background: "#ffffff", width: "100%", maxWidth: 580, borderRadius: 20, padding: 28, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                    <i className="bi bi-tools" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 19, fontWeight: 900, margin: 0, color: "#0f172a" }}>Platform Maintenance Controller</h3>
                    <p style={{ fontSize: 12.5, color: "#64748b", margin: 0 }}>Manage SaaS maintenance windows, read-only mode, and admin broadcasts</p>
                  </div>
                </div>

                {/* Mode Selector */}
                <div style={{ display: "flex", gap: 8, background: "#f1f5f9", padding: 4, borderRadius: 12, marginBottom: 16 }}>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      border: "none",
                      background: scheduleMode === "immediate" ? "#ffffff" : "transparent",
                      color: scheduleMode === "immediate" ? "#0f172a" : "#64748b",
                      fontWeight: 800,
                      fontSize: 13,
                      padding: "8px 12px",
                      borderRadius: 9,
                      boxShadow: scheduleMode === "immediate" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                      cursor: "pointer",
                    }}
                    onClick={() => setScheduleMode("immediate")}
                  >
                    <i className="bi bi-lightning-charge me-1" /> Activate Immediately
                  </button>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      border: "none",
                      background: scheduleMode === "scheduled" ? "#ffffff" : "transparent",
                      color: scheduleMode === "scheduled" ? "#0f172a" : "#64748b",
                      fontWeight: 800,
                      fontSize: 13,
                      padding: "8px 12px",
                      borderRadius: 9,
                      boxShadow: scheduleMode === "scheduled" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                      cursor: "pointer",
                    }}
                    onClick={() => setScheduleMode("scheduled")}
                  >
                    <i className="bi bi-calendar-event me-1" /> Schedule for Later
                  </button>
                </div>

                {/* Schedule Inputs if mode is scheduled */}
                {scheduleMode === "scheduled" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#334155", marginBottom: 4 }}>
                        Start Date & Time (WAT)
                      </label>
                      <input
                        type="datetime-local"
                        className="sa-input"
                        style={{ width: "100%" }}
                        value={scheduledStartTime}
                        onChange={(e) => setScheduledStartTime(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#334155", marginBottom: 4 }}>
                        Est. End Date & Time (WAT)
                      </label>
                      <input
                        type="datetime-local"
                        className="sa-input"
                        style={{ width: "100%" }}
                        value={scheduledEndTime}
                        onChange={(e) => setScheduledEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "12px 14px", color: "#1e40af", fontSize: 12.5, marginBottom: 16, lineHeight: 1.5 }}>
                  <i className="bi bi-info-circle-fill me-1" />
                  <strong>Read-Only Access Enabled:</strong> School Admins and Teachers can still log in and view past records. All score entry, CBT exams, parent payments, and data modifications will be paused until maintenance finishes.
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 800, color: "#334155", marginBottom: 6 }}>
                    User & Parent Response Message
                  </label>
                  <textarea
                    style={{ width: "100%", minHeight: 70, border: "1px solid #cbd5e1", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#0f172a", outline: "none", resize: "vertical" }}
                    value={customMaintenanceMsg}
                    onChange={(e) => setCustomMaintenanceMsg(e.target.value)}
                    placeholder="We are working harder to make things better, please hold on..."
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#1e293b", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={sendEmailNotification}
                      onChange={(e) => setSendEmailNotification(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: "#d300b0" }}
                    />
                    <span>
                      <i className="bi bi-envelope-check me-1 text-primary" /> Send advance broadcast email notification to all active School Owners/Admins ({admins?.total ?? 20} schools)
                    </span>
                  </label>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button className="sa-btn sa-btn-soft" onClick={() => setShowMaintenanceModal(false)} disabled={maintenanceUpdating}>
                    Cancel
                  </button>
                  <button
                    className="sa-btn"
                    style={{ background: scheduleMode === "immediate" ? "#dc2626" : "#4338ca", color: "#ffffff", fontWeight: 800 }}
                    onClick={() => handleToggleMaintenance(scheduleMode === "immediate", scheduleMode === "scheduled")}
                    disabled={maintenanceUpdating}
                  >
                    {maintenanceUpdating
                      ? "Processing..."
                      : scheduleMode === "immediate"
                      ? "Confirm & Activate Now"
                      : "Confirm & Schedule Maintenance"}
                  </button>
                </div>
              </div>
            </div>
          )}
          {featuredCampaign && <section className="sa-panel" style={{display:"grid",gridTemplateColumns:featuredCampaign.asset_url ? "minmax(220px,360px) 1fr" : "1fr",gap:22,alignItems:"center"}}>{featuredCampaign.asset_url && featuredCampaign.type !== "copy" && (featuredCampaign.type === "video" ? <video controls src={featuredCampaign.asset_url} style={{width:"100%",maxHeight:210,borderRadius:14}} /> : <img src={featuredCampaign.asset_url} alt={featuredCampaign.title} style={{width:"100%",maxHeight:210,objectFit:"cover",borderRadius:14}} />)}<div><span className="sa-pill warn">Active sales campaign</span><h2>{featuredCampaign.title}</h2><p className="sa-sub-text">{featuredCampaign.description}</p><button className="sa-btn sa-btn-gold" onClick={()=>navigate("/superadmin/sales-marketing-materials")}><i className="bi bi-megaphone" /> Manage campaign</button></div></section>}
          <section className="sa-metrics">
            <Metric title="Admin schools" value={admins?.total ?? 0} hint="Registered school owners" icon="building" />
            <Metric title="Active Students" value={activeStudentsCount !== null ? activeStudentsCount.toLocaleString() : "..."} hint="Across all schools" icon="mortarboard" tone="green" />
            <Metric title="Subscribers" value={subs?.total ?? 0} hint={`${activeSubsOnPage} active on this page`} icon="people" tone="blue" />
            <Metric title="Premium schools" value={tierCounts.active} hint="Active premium on current page" icon="stars" tone="gold" />
            <Metric title="Platform Revenue YTD" value={fmtNaira(ytdRevenue)} hint={`${fmtNaira(latestRevenue)} last recorded month`} icon="cash-coin" tone="pink" />
          </section>
          <section className="sa-actions"><a className="sa-action" href="/superadmin/subscribers" onClick={(e) => { e.preventDefault(); navigate("/superadmin/subscribers"); }}><i className="bi bi-people" /><p className="sa-action-title">Manage subscribers</p><p className="sa-action-sub">Review school subscriptions and billing records.</p></a><a className="sa-action" href="/subplan" onClick={(e) => { e.preventDefault(); navigate("/subplan"); }}><i className="bi bi-boxes" /><p className="sa-action-title">Package settings</p><p className="sa-action-sub">Configure pricing, student limits, and features.</p></a><a className="sa-action" href="/superadmin/twilio-whatsapp" onClick={(e) => { e.preventDefault(); navigate("/superadmin/twilio-whatsapp"); }}><i className="bi bi-whatsapp" /><p className="sa-action-title">WhatsApp gateway</p><p className="sa-action-sub">Check Twilio readiness and testing.</p></a><a className="sa-action" href="/demo-bookers" onClick={(e) => { e.preventDefault(); navigate("/demo-bookers"); }}><i className="bi bi-calendar-check" /><p className="sa-action-title">Demo requests</p><p className="sa-action-sub">Follow up with interested schools.</p></a><a className="sa-action" href="/training/GradiosEdu-School-Training-Deck.pptx" download="GradiosEdu-School-Training-Deck.pptx"><i className="bi bi-file-earmark-slides" /><p className="sa-action-title">Training presentation</p><p className="sa-action-sub">Download the editable deck for school and user training.</p></a></section>
          <section className="sa-grid"><Panel title="Revenue trend" subtitle="Monthly platform revenue performance."><div className="sa-chart"><canvas ref={chartRef} /></div></Panel><Panel title="Platform health" subtitle="Signals that need attention."><div className="sa-health"><div className="sa-health-row"><div className="sa-health-main"><div className="sa-health-icon"><i className="bi bi-check-circle" /></div><div><p className="sa-health-title">Active subscribers</p><p className="sa-health-sub">Active status on current page</p></div></div><span className="sa-health-value">{activeSubsOnPage}</span></div><div className="sa-health-row"><div className="sa-health-main"><div className="sa-health-icon"><i className="bi bi-exclamation-triangle" /></div><div><p className="sa-health-title">Expired premium</p><p className="sa-health-sub">May need renewal follow-up</p></div></div><span className="sa-health-value">{tierCounts.expired}</span></div><div className="sa-health-row"><div className="sa-health-main"><div className="sa-health-icon"><i className="bi bi-activity" /></div><div><p className="sa-health-title">Activity logs</p><p className="sa-health-sub">Recent platform actions</p></div></div><span className="sa-health-value">{logs?.total ?? 0}</span></div></div></Panel></section>
          <Panel title="Schools and subscriptions" subtitle="Monitor current package status and renewal state." action={<button className="sa-btn sa-btn-soft" onClick={applySubscriberFilters}><i className="bi bi-funnel" />Apply filters</button>}>
            <div className="sa-filters"><select className="sa-select" value={subsStatus} onChange={(e) => setSubsStatus(e.target.value)}><option value="">All status</option><option value="active">Active</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option><option value="canceled">Canceled</option><option value="expired">Expired</option></select><select className="sa-select" value={subsTier} onChange={(e) => setSubsTier(e.target.value)}><option value="all">All packages</option><option value="core">Core</option><option value="premium">Premium schools</option><option value="premium_active">Premium active</option><option value="premium_expired">Premium expired</option></select><input className="sa-input" style={{ minWidth: 260 }} placeholder="Search school owner or email" value={subsSearch} onChange={(e) => setSubsSearch(e.target.value)} /><label className="sa-check"><input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />Active only</label></div>
            <div className="sa-table-wrap"><table className="sa-table"><thead><tr><th>School owner</th><th>Email</th><th>Package</th><th>Tier</th><th>Status</th><th>Start</th><th>End</th></tr></thead><tbody>{visibleSubs.length === 0 ? <tr><td colSpan={7}><Empty text="No subscribers match this selection." /></td></tr> : visibleSubs.map((s) => { const tier = deriveTier(s); const owner = personName(s.user); return <tr key={s.id}><td><div className="sa-name-cell"><div className="sa-avatar">{initials(owner)}</div><div><div className="sa-main-text">{owner}</div><div className="sa-sub-text">School ID: {s.user?.school_id ?? "Not linked"}</div></div></div></td><td><span className="sa-sub-text">{s.user?.email || "Not provided"}</span></td><td>{s.plan?.name || "Core"}</td><td><span className={tierClass(tier)}>{tierLabel(tier)}</span></td><td><span className={statusClass(s.status)}>{s.status || "Unknown"}</span></td><td>{fmtDate(s.starts_at)}</td><td>{fmtDate(s.ends_at)}</td></tr>; })}</tbody></table></div>
            <Pager data={subs} perPage={subsPerPage} sizes={[10, 20, 30, 50]} onPage={setSubsPage} onPerPage={(n) => { setSubsPerPage(n); setSubsPage(1); }} />
          </Panel>
          <section className="sa-two">
            <Panel title="School owners" subtitle="Recently registered administrator accounts." action={<button className="sa-btn sa-btn-soft" onClick={applyAdminSearch}><i className="bi bi-search" />Search</button>}>
              <div className="sa-filters"><input className="sa-input" style={{ minWidth: 260 }} placeholder="Search school owner" value={adminsSearch} onChange={(e) => setAdminsSearch(e.target.value)} /></div><div className="sa-table-wrap"><table className="sa-table" style={{ minWidth: 620 }}><thead><tr><th>Name</th><th>Email</th><th>School</th><th>Status</th><th>Action</th></tr></thead><tbody>{(admins?.data || []).length === 0 ? <tr><td colSpan={5}><Empty text="No school owner found." /></td></tr> : (admins?.data || []).map((a) => { const n = personName(a); const isSusp = String(a.status) === "0"; return <tr key={a.id}><td><div className="sa-name-cell"><div className="sa-avatar">{initials(n)}</div><div><div className="sa-main-text">{n}</div><div className="sa-sub-text">Joined {fmtDate(a.created_at)}</div></div></div></td><td><span className="sa-sub-text">{a.email || "Not provided"}</span></td><td>{a.school?.school_name || "Not set"}</td><td><span className={isSusp ? "sa-pill bad" : "sa-pill ok"}>{isSusp ? "Suspended" : "Active"}</span></td><td><button className="sa-btn sa-btn-soft" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => navigate(`/admin-users/view/${a.id}`)}><i className="bi bi-gear" /> Manage</button></td></tr>; })}</tbody></table></div><Pager data={admins} perPage={adminsPerPage} sizes={[8, 12, 20]} onPage={setAdminsPage} onPerPage={(n) => { setAdminsPerPage(n); setAdminsPage(1); }} />
            </Panel>
            <Panel title="Operational risk" subtitle="Business follow-up items for the platform team."><div className="sa-risk"><div className="sa-risk-item"><span className="sa-risk-dot red" /><div><p className="sa-risk-title">Expired premium accounts</p><p className="sa-risk-sub">{tierCounts.expired} premium account(s) on this page may need renewal or downgrade follow-up.</p></div></div><div className="sa-risk-item"><span className="sa-risk-dot gold" /><div><p className="sa-risk-title">Core package schools</p><p className="sa-risk-sub">{tierCounts.core} school(s) on this page are on Core. They are good candidates for GradiosEduPlus upgrade prompts.</p></div></div><div className="sa-risk-item"><span className="sa-risk-dot green" /><div><p className="sa-risk-title">Platform activity</p><p className="sa-risk-sub">Keep reviewing activity logs for billing override, access changes, and support-sensitive actions.</p></div></div></div></Panel>
          </section>
          <Panel title="Platform activity" subtitle="Audit trail of important activity across GradiosEdu." action={<button className="sa-btn sa-btn-soft" onClick={reloadLogs}><i className="bi bi-arrow-repeat" />Reload</button>}>
            <div className="sa-log-toolbar"><label className="sa-log-select"><input type="checkbox" checked={allLogsSelected} onChange={toggleAllLogs} />Select all on this page</label><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button className="sa-btn sa-btn-soft" disabled={!selectedLogs.length || deletingLogs} onClick={() => setSelectedLogs([])}>Clear</button><button className="sa-btn sa-btn-dark" disabled={!selectedLogs.length || deletingLogs} onClick={deleteSelectedLogs}><i className="bi bi-trash3" />{deletingLogs ? "Deleting" : `Delete ${selectedLogs.length || ""}`}</button></div></div>
            <div className="sa-table-wrap"><table className="sa-table"><thead><tr><th style={{ width: 42 }}></th><th>When</th><th>User</th><th>Action</th><th>Description</th></tr></thead><tbody>{(logs?.data || []).length === 0 ? <tr><td colSpan={5}><Empty text="No platform activity found." /></td></tr> : (logs?.data || []).map((l) => <tr key={l.id}><td><input type="checkbox" checked={selectedLogs.includes(l.id)} onChange={() => toggleLog(l.id)} /></td><td>{fmtDate(l.created_at)}</td><td><div className="sa-main-text">{l.user_name || "System"}</div></td><td><span className="sa-pill muted">{l.action || "Activity"}</span></td><td><span className="sa-sub-text">{l.description || "No description"}</span></td></tr>)}</tbody></table></div><Pager data={logs} perPage={logsPerPage} sizes={[10, 20, 30]} onPage={setLogsPage} onPerPage={(n) => { setLogsPerPage(n); setLogsPage(1); }} />
          </Panel>
          <div className="mt-auto"><Footer /></div>
        </div></main></div></div>
    </>
  );
}


