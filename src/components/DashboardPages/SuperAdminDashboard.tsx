import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";

import TopNav from "../LayoutComponents/TopNav";
import Sidebar from "../LayoutComponents/Sidebar";
import Footer from "../LayoutComponents/Footer";
import Loader from "../ui/dashboardLoader";
import { authApi } from "../../utils/axios";
import { useToast } from "../../contexts/ToastContext";
import PageTitle from "../PageTitle";

/* =========================
   TYPES
========================= */

type Plan = {
  id: number;
  name: string;
  price?: number | null;
  duration_in_days?: number | null;
};

type SubscriptionRow = {
  id: number;
  status: string;
  starts_at?: string | null;
  ends_at?: string | null;
  auto_renew?: boolean;
  user?: {
    id: number;
    firstname?: string;
    surname?: string;
    name?: string;
    email?: string;
    school_id?: number | null;
  };
  plan?: Plan | null;
};

type Paginated<T> = {
  current_page: number;
  data: T[];
  from?: number | null;
  to?: number | null;
  last_page: number;
  per_page: number;
  total: number;
};

type AdminRow = {
  id: number;
  firstname?: string;
  surname?: string;
  email?: string;
  phone?: string | null;
  created_at?: string | null;
  status?: string | number | null;
  school?: {
    id?: number;
    school_name?: string;
    email?: string;
    phone?: string;
    address?: string;
  } | null;
  roles?: { id: number; name: string }[];
};

type LogRow = {
  id: number;
  user_id?: number | null;
  user_name: string;
  action: string;
  description?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
};

type RevenueRow = { month: string; revenue: number };

type StatCard = {
  title: string;
  value: string | number;
  icon: string;
  hint?: string;
};

/* =========================
   HELPERS
========================= */

type Tier = "free" | "premium_active" | "premium_expired";

function isFreePlanName(name?: string | null) {
  const n = (name || "").trim().toLowerCase();
  return !n || n === "free";
}

function deriveTier(s: SubscriptionRow): Tier {
  const planName = s.plan?.name ?? null;
  if (isFreePlanName(planName)) return "free";

  const ends = s.ends_at ? new Date(s.ends_at) : null;
  if (ends && !Number.isNaN(ends.getTime())) {
    return ends.getTime() >= Date.now() ? "premium_active" : "premium_expired";
  }
  // If plan isn't free but ends_at is missing, treat as premium active
  return "premium_active";
}

function tierLabel(t: Tier) {
  if (t === "premium_active") return "Premium (Active)";
  if (t === "premium_expired") return "Premium (Expired)";
  return "Free";
}

function tierBadge(t: Tier) {
  if (t === "premium_active") return "bg-success";
  if (t === "premium_expired") return "bg-warning text-dark";
  return "bg-secondary";
}

function fmtNaira(n: number) {
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(n);
  } catch {
    return `₦${Number(n || 0).toLocaleString()}`;
  }
}

function fmtDate(val?: string | null) {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function nameOf(u?: SubscriptionRow["user"]) {
  if (!u) return "—";
  const composed = `${u.surname ?? ""} ${u.firstname ?? ""}`.trim();
  return composed || u.name || u.email || "—";
}

function statusBadge(status: string) {
  const s = (status || "").toLowerCase();
  if (s.includes("active")) return "bg-success";
  if (s.includes("pending")) return "bg-warning text-dark";
  if (s.includes("cancel")) return "bg-secondary";
  if (s.includes("expire")) return "bg-danger";
  return "bg-light text-dark";
}

/* =========================
   COMPONENT
========================= */

export default function SuperAdminDashboard() {
  const { showError, showSuccess } = useToast();

  // layout
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // loading
  const [loading, setLoading] = useState(true);

  // stats
  const [stats, setStats] = useState<StatCard[]>([
    { title: "Admin Schools", value: 0, icon: "buildings" },
    { title: "Total Subscribers", value: 0, icon: "people" },
    { title: "Premium Users", value: 0, icon: "award", hint: "Active + Expired" },
    { title: "Revenue (YTD)", value: fmtNaira(0), icon: "cash-coin" },
  ]);

  // Revenue chart
  const revChartRef = useRef<HTMLCanvasElement | null>(null);
  const revChartInstance = useRef<Chart | null>(null);
  const [revLabels, setRevLabels] = useState<string[]>([]);
  const [revData, setRevData] = useState<number[]>([]);

  // Subscribers
  const [subsPage, setSubsPage] = useState(1);
  const [subsPerPage, setSubsPerPage] = useState(10);
  const [subsStatus, setSubsStatus] = useState<string>("");
  const [subsActiveOnly, setSubsActiveOnly] = useState(false);
  const [subsSearch, setSubsSearch] = useState("");

  // ✅ tier filter (computed on frontend)
  const [subsTier, setSubsTier] = useState<"all" | "free" | "premium_all" | "premium_active" | "premium_expired">("all");

  const [subs, setSubs] = useState<Paginated<SubscriptionRow> | null>(null);

  // Admins
  const [adminsPage, setAdminsPage] = useState(1);
  const [adminsPerPage, setAdminsPerPage] = useState(8);
  const [adminsSearch, setAdminsSearch] = useState("");
  const [admins, setAdmins] = useState<Paginated<AdminRow> | null>(null);

  // Logs
  const [logsPage, setLogsPage] = useState(1);
  const [logsPerPage, setLogsPerPage] = useState(10);
  const [logs, setLogs] = useState<Paginated<LogRow> | null>(null);

  // ✅ Logs bulk selection
  const [selectedLogIds, setSelectedLogIds] = useState<number[]>([]);
  const [deletingLogs, setDeletingLogs] = useState(false);

  const logsOnPageIds = useMemo(() => (logs?.data || []).map((l) => l.id), [logs]);
  const allSelectedOnPage = useMemo(() => {
    if (!logsOnPageIds.length) return false;
    return logsOnPageIds.every((id) => selectedLogIds.includes(id));
  }, [logsOnPageIds, selectedLogIds]);

  const selectedCount = selectedLogIds.length;

  /* =========================
     DERIVED: SUBS VIEW + COUNTS
  ========================= */

  const subsTierCounts = useMemo(() => {
    const rows = subs?.data || [];
    let free = 0;
    let pa = 0;
    let pe = 0;

    rows.forEach((r) => {
      const t = deriveTier(r);
      if (t === "free") free++;
      if (t === "premium_active") pa++;
      if (t === "premium_expired") pe++;
    });

    return { free, premium_active: pa, premium_expired: pe, premium_all: pa + pe, totalOnPage: rows.length };
  }, [subs]);

  const visibleSubs = useMemo(() => {
    const rows = subs?.data || [];
    return rows.filter((s) => {
      const t = deriveTier(s);

      if (subsTier === "free" && t !== "free") return false;
      if (subsTier === "premium_active" && t !== "premium_active") return false;
      if (subsTier === "premium_expired" && t !== "premium_expired") return false;
      if (subsTier === "premium_all" && !(t === "premium_active" || t === "premium_expired")) return false;

      return true;
    });
  }, [subs, subsTier]);

  /* =========================
     FETCHERS (MATCH YOUR ROUTES)
  ========================= */

  const fetchRevenue = async () => {
    const res = await authApi.get("/monthly-revenue-stats");
    const rows: RevenueRow[] = res.data?.data || [];

    setRevLabels(rows.map((r) => r.month));
    setRevData(rows.map((r) => Number(r.revenue || 0)));

    const total = rows.reduce((sum, r) => sum + Number(r.revenue || 0), 0);
    setStats((prev) => {
      const next = [...prev];
      next[3] = { ...next[3], value: fmtNaira(total) };
      return next;
    });
  };

  const fetchSubscribers = async () => {
    const params = new URLSearchParams();
    params.set("page", String(subsPage));
    params.set("per_page", String(subsPerPage));
    if (subsStatus) params.set("status", subsStatus);
    if (subsActiveOnly) params.set("active", "1");
    if (subsSearch.trim()) params.set("search", subsSearch.trim());

    const res = await authApi.get(`/admin/subscriptions?${params.toString()}`);
    const paginated: Paginated<SubscriptionRow> = res.data?.data;
    setSubs(paginated);

    // ✅ Stats: total subscribers (from server)
    const totalSubs = paginated?.total ?? 0;

    // ✅ Premium count (computed only from current page; we label it clearly)
    const pageRows = paginated?.data || [];
    const premiumOnPage = pageRows.filter((r) => {
      const t = deriveTier(r);
      return t === "premium_active" || t === "premium_expired";
    }).length;

    setStats((prev) => {
      const next = [...prev];
      next[1] = { ...next[1], value: totalSubs, hint: "Total in database" };
      next[2] = { ...next[2], value: premiumOnPage, hint: "Premium on current page" };
      return next;
    });
  };

  const fetchAdmins = async () => {
    const params = new URLSearchParams();
    params.set("page", String(adminsPage));
    params.set("perPage", String(adminsPerPage));
    if (adminsSearch.trim()) params.set("search", adminsSearch.trim());

    const res = await authApi.get(`/admin-users?${params.toString()}`);
    const paginated: Paginated<AdminRow> = res.data;
    setAdmins(paginated);

    setStats((prev) => {
      const next = [...prev];
      next[0] = { ...next[0], value: paginated?.total ?? 0 };
      return next;
    });
  };

  const fetchLogs = async () => {
    const params = new URLSearchParams();
    params.set("page", String(logsPage));
    params.set("per_page", String(logsPerPage));

    const res = await authApi.get(`/platform-logs?${params.toString()}`);
    const paginated: Paginated<LogRow> = res.data;
    setLogs(paginated);
  };

  /* =========================
     INITIAL LOAD
  ========================= */

  useEffect(() => {
    setLoading(true);

    Promise.all([fetchRevenue(), fetchSubscribers(), fetchAdmins(), fetchLogs()])
      .catch((err) => {
        console.error(err);
        showError(err?.response?.data?.message || "Failed to load Super Admin dashboard.");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     RELOAD ON PAGINATION
  ========================= */

  useEffect(() => {
    fetchSubscribers().catch(() => showError("Failed to load subscribers."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subsPage, subsPerPage]);

  useEffect(() => {
    fetchAdmins().catch(() => showError("Failed to load admin users."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminsPage, adminsPerPage]);

  useEffect(() => {
    fetchLogs().catch(() => showError("Failed to load logs."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logsPage, logsPerPage]);

  /* =========================
     CHART RENDER
  ========================= */

  useEffect(() => {
    if (!revChartRef.current) return;
    const ctx = revChartRef.current.getContext("2d");
    if (!ctx) return;

    revChartInstance.current?.destroy();

    revChartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: revLabels,
        datasets: [{ label: "Revenue (₦)", data: revData, borderRadius: 10, barThickness: 32 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { beginAtZero: true, ticks: { font: { size: 11 } } },
        },
      },
    });

    return () => revChartInstance.current?.destroy();
  }, [revLabels, revData]);

  /* =========================
     UI ACTIONS
  ========================= */

  const applySubsFilters = () => {
    setSubsPage(1);
    fetchSubscribers()
      .then(() => showSuccess("Subscribers updated."))
      .catch(() => showError("Failed to apply subscriber filters."));
  };

  const applyAdminsSearch = () => {
    setAdminsPage(1);
    fetchAdmins()
      .then(() => showSuccess("Admin users updated."))
      .catch(() => showError("Failed to apply admin search."));
  };

  const reloadLogs = () => {
    setLogsPage(1);
    fetchLogs()
      .then(() => showSuccess("Logs reloaded."))
      .catch(() => showError("Failed to reload logs."));
  };

  /* =========================
     LOGS BULK SELECT + DELETE
  ========================= */

  const toggleLog = (id: number) => {
    setSelectedLogIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAllOnPage = () => {
    const ids = logsOnPageIds;
    if (!ids.length) return;

    setSelectedLogIds((prev) => {
      const allOnPageSelected = ids.every((id) => prev.includes(id));
      if (allOnPageSelected) {
        return prev.filter((id) => !ids.includes(id));
      }
      const merged = new Set([...prev, ...ids]);
      return Array.from(merged);
    });
  };

  const clearSelectedLogs = () => setSelectedLogIds([]);

  const bulkDeleteLogs = async () => {
    if (selectedLogIds.length === 0) return;

    const ok = window.confirm(`Delete ${selectedLogIds.length} selected log(s)? This cannot be undone.`);
    if (!ok) return;

    setDeletingLogs(true);
    try {
      await authApi.post("/platform-logs/delete-multiple", { ids: selectedLogIds });

      showSuccess("Selected logs deleted.");

      clearSelectedLogs();

      const remainingOnPage =
        (logs?.data || []).length - logsOnPageIds.filter((id) => selectedLogIds.includes(id)).length;

      if (remainingOnPage <= 0 && (logs?.current_page || 1) > 1) {
        setLogsPage((p) => Math.max(1, p - 1));
      } else {
        await fetchLogs();
      }
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Failed to delete logs.");
    } finally {
      setDeletingLogs(false);
    }
  };

  return (
    <>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="SuperAdmin Dashboard" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto px-4 d-flex flex-column min-vh-100" style={{ backgroundColor: "#f8f9fa" }}>
            {loading && <Loader message="Loading Super Admin dashboard..." />}

            {/* HERO */}
            <div
              className="mt-4 p-4 position-relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: 16,
                boxShadow: "0 10px 30px rgba(102, 126, 234, 0.3)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-50px",
                  right: "-50px",
                  width: 220,
                  height: 220,
                  background: "rgba(255, 255, 255, 0.10)",
                  borderRadius: "50%",
                  filter: "blur(40px)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "-30px",
                  left: "-30px",
                  width: 160,
                  height: 160,
                  background: "rgba(255, 255, 255, 0.10)",
                  borderRadius: "50%",
                  filter: "blur(40px)",
                }}
              />

              <div className="row align-items-center position-relative g-3">
                <div className="col-lg-8">
                  <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                    <span
                      className="badge px-3 py-2"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        color: "#fff",
                        borderRadius: 999,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      <i className="bi bi-shield-lock me-1" />
                      Super Admin Console
                    </span>
                    <span
                      className="badge px-3 py-2"
                      style={{
                        backgroundColor: "rgba(16, 185, 129, 0.9)",
                        color: "#fff",
                        borderRadius: 999,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      <i className="bi bi-check-circle-fill me-1" />
                      Platform Online
                    </span>
                  </div>

                  <h2 className="fw-bold text-white mb-2">Platform Dashboard</h2>
                  <p className="text-white mb-0" style={{ opacity: 0.9, fontSize: "1rem" }}>
                    Monitor revenue, subscribers (Free vs Premium Active/Expired), admin schools, and activity logs.
                  </p>

                  {/* quick tier chips (current page only) */}
                  <div className="d-flex flex-wrap gap-2 mt-3">
                    <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                      Free: <b>{subsTierCounts.free}</b>
                    </span>
                    <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                      Premium Active: <b>{subsTierCounts.premium_active}</b>
                    </span>
                    <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                      Premium Expired: <b>{subsTierCounts.premium_expired}</b>
                    </span>
                    <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                      Premium Total: <b>{subsTierCounts.premium_all}</b>
                    </span>
                    <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                      On page: <b>{subsTierCounts.totalOnPage}</b>
                    </span>
                  </div>
                </div>

                <div className="col-lg-4 d-none d-lg-block">
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(10px)",
                      borderRadius: 16,
                      padding: "1.25rem",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-white" style={{ fontSize: "0.9rem", opacity: 0.9 }}>
                        Quick Actions
                      </span>
                      <i className="bi bi-lightning-charge text-white" />
                    </div>

                    <div className="d-flex flex-column gap-2">
                      <button
                        className="btn btn-light btn-sm"
                        style={{ borderRadius: 10, fontWeight: 700 }}
                        onClick={() => {
                          applySubsFilters();
                          applyAdminsSearch();
                          reloadLogs();
                          fetchRevenue().catch(() => {});
                        }}
                      >
                        <i className="bi bi-arrow-repeat me-1" />
                        Refresh Dashboard
                      </button>

                      <button
                        className="btn btn-outline-light btn-sm"
                        style={{ borderRadius: 10 }}
                        onClick={() => window.scrollTo({ top: 950, behavior: "smooth" })}
                      >
                        <i className="bi bi-graph-up me-1" />
                        Jump to Analytics
                      </button>
                    </div>

                    <div className="mt-3 text-white small" style={{ opacity: 0.9 }}>
                      <i className="bi bi-info-circle me-1" />
                      Premium stat card is computed from <b>current page</b> until you add a backend aggregate endpoint.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STATS */}
            <div className="row g-3 my-3">
              {stats.map((s, idx) => {
                const colors = [
                  { gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", icon: "#667eea", bg: "#f0edff" },
                  { gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", icon: "#f5576c", bg: "#fff0f3" },
                  { gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", icon: "#00f2fe", bg: "#e6f9ff" },
                  { gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", icon: "#38f9d7", bg: "#e6fff9" },
                ];

                return (
                  <div className="col-md-6 col-lg-3" key={s.title}>
                    <div className="card border-0 h-100 position-relative overflow-hidden" style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: colors[idx].gradient }} />
                      <div className="card-body p-4">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div className="p-2 rounded-3" style={{ backgroundColor: colors[idx].bg }}>
                            <i className={`bi bi-${s.icon} fs-4`} style={{ color: colors[idx].icon }} />
                          </div>
                          <i className="bi bi-three-dots-vertical text-muted" />
                        </div>

                        <p className="text-muted mb-1 small">{s.title}</p>
                        <h3 className="fw-bold mb-0" style={{ color: "#1e293b" }}>
                          {s.value}
                        </h3>

                        <div className="mt-3 pt-3" style={{ borderTop: "1px solid #f1f5f9" }}>
                          <small className="text-muted">
                            {s.hint ? (
                              <>
                                <i className="bi bi-info-circle me-1" />
                                {s.hint}
                              </>
                            ) : (
                              <>
                                <i className="bi bi-activity me-1" />
                                Live platform stat
                              </>
                            )}
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* REVENUE */}
            <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: 12 }}>
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <div className="fw-semibold" style={{ color: "#1e293b" }}>
                      Monthly Revenue
                    </div>
                    <div className="text-muted small">Successful subscription payments (this year)</div>
                  </div>

                  <button className="btn btn-sm btn-light" style={{ borderRadius: 10 }} onClick={() => fetchRevenue().catch(() => showError("Failed to refresh revenue stats."))}>
                    <i className="bi bi-arrow-repeat me-1" />
                    Refresh
                  </button>
                </div>

                <div style={{ height: 320 }}>
                  <canvas ref={revChartRef} />
                </div>
              </div>
            </div>

            {/* SUBSCRIBERS */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
              <div className="card-body p-3 p-md-4">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                  <div>
                    <div className="fw-semibold" style={{ color: "#1e293b" }}>
                      Subscribers
                    </div>
                    <div className="text-muted small">Route: /admin/subscriptions</div>
                  </div>

                  <div className="d-flex flex-wrap gap-2">
                    <select className="form-select form-select-sm" style={{ width: 170, borderRadius: 10 }} value={subsStatus} onChange={(e) => setSubsStatus(e.target.value)}>
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="canceled">Canceled</option>
                      <option value="expired">Expired</option>
                    </select>

                    <select className="form-select form-select-sm" style={{ width: 220, borderRadius: 10 }} value={subsTier} onChange={(e) => setSubsTier(e.target.value as any)}>
                      <option value="all">All tiers</option>
                      <option value="free">Free</option>
                      <option value="premium_all">Premium (Active + Expired)</option>
                      <option value="premium_active">Premium (Active)</option>
                      <option value="premium_expired">Premium (Expired)</option>
                    </select>

                    <div className="form-check d-flex align-items-center gap-2">
                      <input className="form-check-input" type="checkbox" id="activeOnly" checked={subsActiveOnly} onChange={(e) => setSubsActiveOnly(e.target.checked)} />
                      <label className="form-check-label small" htmlFor="activeOnly">
                        Active only
                      </label>
                    </div>

                    <div className="input-group input-group-sm" style={{ width: 260 }}>
                      <span className="input-group-text">
                        <i className="bi bi-search" />
                      </span>
                      <input className="form-control" placeholder="Search name/email..." value={subsSearch} onChange={(e) => setSubsSearch(e.target.value)} />
                    </div>

                    <button className="btn btn-sm btn-primary" style={{ borderRadius: 10, fontWeight: 700 }} onClick={applySubsFilters}>
                      <i className="bi bi-funnel me-1" />
                      Apply
                    </button>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{ background: "#eef2ff" }}>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Tier</th>
                        <th>Plan</th>
                        <th>Status</th>
                        <th>Start</th>
                        <th>End</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleSubs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center text-muted py-4">
                            No subscriptions found for the selected filters.
                          </td>
                        </tr>
                      ) : (
                        visibleSubs.map((s) => {
                          const t = deriveTier(s);
                          return (
                            <tr key={s.id}>
                              <td className="fw-semibold">{nameOf(s.user)}</td>
                              <td className="text-muted">{s.user?.email || "—"}</td>
                              <td>
                                <span className={`badge ${tierBadge(t)}`} style={{ borderRadius: 999 }}>
                                  {tierLabel(t)}
                                </span>
                              </td>
                              <td>{s.plan?.name || "—"}</td>
                              <td>
                                <span className={`badge ${statusBadge(s.status)}`} style={{ borderRadius: 999 }}>
                                  {s.status}
                                </span>
                              </td>
                              <td className="text-muted">{fmtDate(s.starts_at)}</td>
                              <td className="text-muted">{fmtDate(s.ends_at)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {subs && subs.last_page > 1 && (
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
                    <div className="text-muted small">
                      Showing {subs.from ?? 0} - {subs.to ?? 0} of {subs.total}
                      <span className="ms-2">
                        • Visible: <b>{visibleSubs.length}</b>
                      </span>
                    </div>

                    <div className="d-flex gap-2 align-items-center">
                      <select
                        className="form-select form-select-sm"
                        style={{ width: 110, borderRadius: 10 }}
                        value={subsPerPage}
                        onChange={(e) => {
                          setSubsPerPage(Number(e.target.value));
                          setSubsPage(1);
                        }}
                      >
                        {[10, 20, 30, 50].map((n) => (
                          <option key={n} value={n}>
                            {n}/page
                          </option>
                        ))}
                      </select>

                      <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 10 }} disabled={subs.current_page <= 1} onClick={() => setSubsPage((p) => Math.max(1, p - 1))}>
                        <i className="bi bi-chevron-left" />
                      </button>

                      <span className="small text-muted">
                        Page <b>{subs.current_page}</b> / {subs.last_page}
                      </span>

                      <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 10 }} disabled={subs.current_page >= subs.last_page} onClick={() => setSubsPage((p) => Math.min(subs.last_page, p + 1))}>
                        <i className="bi bi-chevron-right" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-3 text-muted small">
                  <i className="bi bi-info-circle me-1" />
                  Tier is computed from <b>plan.name</b> + <b>ends_at</b>. Premium includes Active + Expired.
                </div>
              </div>
            </div>

            {/* ADMINS + LOGS */}
            <div className="row g-4 mb-4">
              {/* ADMINS */}
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
                  <div className="card-body p-3 p-md-4">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                      <div>
                        <div className="fw-semibold" style={{ color: "#1e293b" }}>
                          Admin Users
                        </div>
                        <div className="text-muted small">Route: /admin-users</div>
                      </div>

                      <div className="d-flex gap-2 align-items-center">
                        <div className="input-group input-group-sm" style={{ width: 230 }}>
                          <span className="input-group-text">
                            <i className="bi bi-search" />
                          </span>
                          <input className="form-control" placeholder="Search admin..." value={adminsSearch} onChange={(e) => setAdminsSearch(e.target.value)} />
                        </div>
                        <button className="btn btn-sm btn-primary" style={{ borderRadius: 10, fontWeight: 700 }} onClick={applyAdminsSearch}>
                          Apply
                        </button>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead style={{ background: "#eef2ff" }}>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>School</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(admins?.data || []).length === 0 ? (
                            <tr>
                              <td colSpan={3} className="text-center text-muted py-4">
                                No admins found.
                              </td>
                            </tr>
                          ) : (
                            (admins?.data || []).map((a) => (
                              <tr key={a.id}>
                                <td className="fw-semibold">{`${a.surname ?? ""} ${a.firstname ?? ""}`.trim() || "—"}</td>
                                <td className="text-muted">{a.email || "—"}</td>
                                <td className="text-muted">{a.school?.school_name || "—"}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {admins && admins.last_page > 1 && (
                      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
                        <div className="text-muted small">
                          Showing {admins.from ?? 0} - {admins.to ?? 0} of {admins.total}
                        </div>

                        <div className="d-flex gap-2 align-items-center">
                          <select
                            className="form-select form-select-sm"
                            style={{ width: 110, borderRadius: 10 }}
                            value={adminsPerPage}
                            onChange={(e) => {
                              setAdminsPerPage(Number(e.target.value));
                              setAdminsPage(1);
                            }}
                          >
                            {[8, 12, 20].map((n) => (
                              <option key={n} value={n}>
                                {n}/page
                              </option>
                            ))}
                          </select>

                          <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 10 }} disabled={admins.current_page <= 1} onClick={() => setAdminsPage((p) => Math.max(1, p - 1))}>
                            <i className="bi bi-chevron-left" />
                          </button>

                          <span className="small text-muted">
                            Page <b>{admins.current_page}</b> / {admins.last_page}
                          </span>

                          <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 10 }} disabled={admins.current_page >= admins.last_page} onClick={() => setAdminsPage((p) => Math.min(admins.last_page, p + 1))}>
                            <i className="bi bi-chevron-right" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* LOGS */}
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
                  <div className="card-body p-3 p-md-4">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                      <div>
                        <div className="fw-semibold" style={{ color: "#1e293b" }}>
                          Platform Logs
                        </div>
                        <div className="text-muted small">Route: /platform-logs</div>
                      </div>

                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-light" style={{ borderRadius: 10 }} onClick={reloadLogs}>
                          <i className="bi bi-arrow-repeat me-1" />
                          Reload
                        </button>
                      </div>
                    </div>

                    {/* Bulk actions bar */}
                    <div
                      className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 p-2"
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                      }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <input type="checkbox" className="form-check-input" checked={allSelectedOnPage} onChange={toggleSelectAllOnPage} id="selectAllLogsOnPage" />
                        <label htmlFor="selectAllLogsOnPage" className="small text-muted mb-0">
                          Select all on page
                        </label>

                        <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                          {selectedCount} selected
                        </span>
                      </div>

                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 10 }} disabled={selectedCount === 0 || deletingLogs} onClick={clearSelectedLogs}>
                          Clear
                        </button>

                        <button className="btn btn-sm btn-danger" style={{ borderRadius: 10, fontWeight: 700 }} disabled={selectedCount === 0 || deletingLogs} onClick={bulkDeleteLogs}>
                          {deletingLogs ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-trash3 me-1" />
                              Delete Selected
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead style={{ background: "#eef2ff" }}>
                          <tr>
                            <th style={{ width: 40 }} />
                            <th>When</th>
                            <th>User</th>
                            <th>Action</th>
                          </tr>
                        </thead>

                        <tbody>
                          {(logs?.data || []).length === 0 ? (
                            <tr>
                              <td colSpan={4} className="text-center text-muted py-4">
                                No logs found.
                              </td>
                            </tr>
                          ) : (
                            (logs?.data || []).map((l) => (
                              <tr key={l.id}>
                                <td>
                                  <input type="checkbox" className="form-check-input" checked={selectedLogIds.includes(l.id)} onChange={() => toggleLog(l.id)} />
                                </td>
                                <td className="text-muted">{fmtDate(l.created_at)}</td>
                                <td className="fw-semibold">{l.user_name}</td>
                                <td>
                                  <div className="fw-semibold">{l.action}</div>
                                  <div className="text-muted small" style={{ maxWidth: 340 }}>
                                    {l.description || "—"}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {logs && logs.last_page > 1 && (
                      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
                        <div className="text-muted small">
                          Showing {logs.from ?? 0} - {logs.to ?? 0} of {logs.total}
                        </div>

                        <div className="d-flex gap-2 align-items-center">
                          <select
                            className="form-select form-select-sm"
                            style={{ width: 110, borderRadius: 10 }}
                            value={logsPerPage}
                            onChange={(e) => {
                              setLogsPerPage(Number(e.target.value));
                              setLogsPage(1);
                            }}
                          >
                            {[10, 20, 30].map((n) => (
                              <option key={n} value={n}>
                                {n}/page
                              </option>
                            ))}
                          </select>

                          <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 10 }} disabled={logs.current_page <= 1} onClick={() => setLogsPage((p) => Math.max(1, p - 1))}>
                            <i className="bi bi-chevron-left" />
                          </button>

                          <span className="small text-muted">
                            Page <b>{logs.current_page}</b> / {logs.last_page}
                          </span>

                          <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 10 }} disabled={logs.current_page >= logs.last_page} onClick={() => setLogsPage((p) => Math.min(logs.last_page, p + 1))}>
                            <i className="bi bi-chevron-right" />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 text-muted small">
                      <i className="bi bi-info-circle me-1" />
                      Bulk delete removes the selected log entries from the database permanently.
                    </div>
                  </div>
                </div>
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
