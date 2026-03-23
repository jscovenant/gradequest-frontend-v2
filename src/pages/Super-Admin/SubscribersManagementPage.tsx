// src/pages/SuperAdmin/SubscribersManagementPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import { authApi } from "../../utils/axios";
import { useToast } from "../../contexts/ToastContext";

/* =========================
   TYPES
========================= */

type Plan = {
  id: number;
  name: string;
  price?: number | null;
  duration_in_days?: number | null;
};

type SubscriberUser = {
  id: number;
  firstname?: string;
  surname?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  school_id?: number | null;
};

type SubscriptionRow = {
  id: number;
  status: string;
  starts_at?: string | null;
  ends_at?: string | null;
  auto_renew?: boolean;
  user?: SubscriberUser;
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

/* =========================
   HELPERS
========================= */

type Tier = "free" | "premium_active" | "premium_expired";
type TierFilter = "all" | "free" | "premium_all" | "premium_active" | "premium_expired";

function isFreePlanName(name?: string | null) {
  const n = (name || "").trim().toLowerCase();
  return !n || n === "free";
}

function deriveTier(s: SubscriptionRow): Tier {
  const planName = s.plan?.name ?? null;
  if (isFreePlanName(planName)) return "free";

  // prefer ends_at for active/expired determination
  const ends = s.ends_at ? new Date(s.ends_at) : null;
  if (ends && !Number.isNaN(ends.getTime())) {
    return ends.getTime() >= Date.now() ? "premium_active" : "premium_expired";
  }

  // fallback: if plan isn't free, treat as premium_active
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

function fmtDate(val?: string | null) {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function nameOf(u?: SubscriberUser) {
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

function toCsv(rows: Record<string, any>[], columns: { key: string; label: string }[]) {
  const escape = (v: any) => {
    const s = String(v ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const header = columns.map((c) => escape(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => escape(r[c.key])).join(",")).join("\n");
  return `${header}\n${body}\n`;
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

/* =========================
   COMPONENT
========================= */

export default function SubscribersManagementPage() {
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Server paging
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Server filters
  const [status, setStatus] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  // Search (debounced)
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // UI-only tier filter
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");

  // Optional: show badge when filters changed (nice UX)
  const [isDirty, setIsDirty] = useState(false);

  // Data
  const [subs, setSubs] = useState<Paginated<SubscriptionRow> | null>(null);

  /* =========================
     FETCHER
  ========================= */

  const fetchSubscribers = async (p: number, pp: number) => {
    const params = new URLSearchParams();
    params.set("page", String(p));
    params.set("per_page", String(pp));
    if (status) params.set("status", status);
    if (activeOnly) params.set("active", "1");
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

    const res = await authApi.get(`/admin/subscriptions?${params.toString()}`);
    const paginated: Paginated<SubscriptionRow> = res.data?.data;
    setSubs(paginated);
  };

  /* =========================
     DEBOUNCE SEARCH
  ========================= */

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  /* =========================
     MARK FILTERS DIRTY + RESET PAGE
     (server-affecting filters)
  ========================= */

  useEffect(() => {
    // whenever any server filter changes, reset paging
    setPage(1);
    setIsDirty(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, activeOnly, debouncedSearch, perPage]);

  // Tier filter is UI-only. We still mark dirty so user sees it changed.
  useEffect(() => {
    setIsDirty(true);
  }, [tierFilter]);

  /* =========================
     AUTO-FETCH ON FILTER CHANGE
  ========================= */

  useEffect(() => {
    setLoading(true);
    fetchSubscribers(1, perPage)
      .catch((err) => {
        console.error(err);
        showError(err?.response?.data?.message || "Failed to load subscribers.");
      })
      .finally(() => {
        setLoading(false);
        setIsDirty(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, activeOnly, debouncedSearch, perPage]);

  /* =========================
     FETCH ON PAGE CHANGE
  ========================= */

  useEffect(() => {
    // page changes fetch current page
    setLoading(true);
    fetchSubscribers(page, perPage)
      .catch((err) => {
        console.error(err);
        showError(err?.response?.data?.message || "Failed to load subscribers.");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  /* =========================
     MANUAL APPLY (OPTIONAL)
  ========================= */

  const applyFilters = () => {
    setLoading(true);
    setPage(1);
    fetchSubscribers(1, perPage)
      .then(() => showSuccess("Subscribers updated."))
      .catch(() => showError("Failed to apply filters."))
      .finally(() => {
        setLoading(false);
        setIsDirty(false);
      });
  };

  /* =========================
     UI FILTER: TIER ON TOP OF SERVER
  ========================= */

  const visibleRows = useMemo(() => {
    const rows = subs?.data || [];
    return rows.filter((s) => {
      const t = deriveTier(s);

      if (tierFilter === "free" && t !== "free") return false;
      if (tierFilter === "premium_active" && t !== "premium_active") return false;
      if (tierFilter === "premium_expired" && t !== "premium_expired") return false;
      if (tierFilter === "premium_all" && !(t === "premium_active" || t === "premium_expired")) return false;

      return true;
    });
  }, [subs, tierFilter]);

  const tierCounts = useMemo(() => {
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

    return { free, premium_active: pa, premium_expired: pe, premium_all: pa + pe, total: rows.length };
  }, [subs]);

  /* =========================
     EXPORT
  ========================= */

  const columns = useMemo(
    () => [
      { key: "user_name", label: "User" },
      { key: "email", label: "Email" },
      { key: "tier", label: "Tier" },
      { key: "plan", label: "Plan" },
      { key: "status", label: "Status" },
      { key: "starts_at", label: "Start Date" },
      { key: "ends_at", label: "End Date" },
      { key: "auto_renew", label: "Auto Renew" },
    ],
    []
  );

  const exportCurrentPageCsv = () => {
    const rows = visibleRows.map((s) => {
      const t = deriveTier(s);
      return {
        user_name: nameOf(s.user),
        email: s.user?.email || "",
        tier: tierLabel(t),
        plan: s.plan?.name || "",
        status: s.status || "",
        starts_at: fmtDate(s.starts_at),
        ends_at: fmtDate(s.ends_at),
        auto_renew: s.auto_renew ? "Yes" : "No",
      };
    });

    const csv = toCsv(rows, columns);
    downloadCsv(`subscribers_visible_page_${subs?.current_page ?? 1}.csv`, csv);
    showSuccess("Exported CSV (visible rows on this page).");
  };

  const exportAllPagesCsv = async () => {
    setExporting(true);
    try {
      const firstParams = new URLSearchParams();
      firstParams.set("page", "1");
      firstParams.set("per_page", String(perPage));
      if (status) firstParams.set("status", status);
      if (activeOnly) firstParams.set("active", "1");
      if (debouncedSearch.trim()) firstParams.set("search", debouncedSearch.trim());

      const firstRes = await authApi.get(`/admin/subscriptions?${firstParams.toString()}`);
      const first: Paginated<SubscriptionRow> = firstRes.data?.data;

      const all: SubscriptionRow[] = [...(first?.data || [])];
      const last = first?.last_page ?? 1;

      for (let p = 2; p <= last; p++) {
        const params = new URLSearchParams(firstParams);
        params.set("page", String(p));
        const res = await authApi.get(`/admin/subscriptions?${params.toString()}`);
        const paginated: Paginated<SubscriptionRow> = res.data?.data;
        all.push(...(paginated?.data || []));
      }

      const filtered = all.filter((s) => {
        const t = deriveTier(s);
        if (tierFilter === "free" && t !== "free") return false;
        if (tierFilter === "premium_active" && t !== "premium_active") return false;
        if (tierFilter === "premium_expired" && t !== "premium_expired") return false;
        if (tierFilter === "premium_all" && !(t === "premium_active" || t === "premium_expired")) return false;
        return true;
      });

      const rows = filtered.map((s) => {
        const t = deriveTier(s);
        return {
          user_name: nameOf(s.user),
          email: s.user?.email || "",
          tier: tierLabel(t),
          plan: s.plan?.name || "",
          status: s.status || "",
          starts_at: fmtDate(s.starts_at),
          ends_at: fmtDate(s.ends_at),
          auto_renew: s.auto_renew ? "Yes" : "No",
        };
      });

      const csv = toCsv(rows, columns);
      downloadCsv(`subscribers_all_pages_${tierFilter}.csv`, csv);
      showSuccess("Exported CSV (all pages with current filters).");
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Failed to export all pages.");
    } finally {
      setExporting(false);
    }
  };

  /* =========================
     NAV
  ========================= */

  const openAdminDetails = (userId?: number) => {
    if (!userId) return;
    navigate(`/admin-users/view/${userId}`);
  };

  return (
    <>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto px-4 d-flex flex-column min-vh-100" style={{ backgroundColor: "#f8f9fa" }}>
            {(loading || exporting) && <Loader message={exporting ? "Exporting CSV..." : "Loading subscribers..."} />}

            {/* HERO */}
            <div
              className="mt-4 p-4 position-relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: 16,
                boxShadow: "0 10px 30px rgba(102, 126, 234, 0.3)",
              }}
            >
              <div className="row align-items-center g-3 position-relative">
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
                      <i className="bi bi-people me-1" />
                      Subscribers Management
                    </span>
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
                      <i className="bi bi-database me-1" />
                      /admin/subscriptions
                    </span>
                  </div>

                  <h2 className="fw-bold text-white mb-2">Subscribers</h2>
                  <p className="text-white mb-0" style={{ opacity: 0.9 }}>
                    Tier view: <b>Free</b>, <b>Premium (Active)</b>, <b>Premium (Expired)</b>.
                  </p>

                  <div className="d-flex flex-wrap gap-2 mt-3">
                    <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                      Free: <b>{tierCounts.free}</b>
                    </span>
                    <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                      Premium Active: <b>{tierCounts.premium_active}</b>
                    </span>
                    <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                      Premium Expired: <b>{tierCounts.premium_expired}</b>
                    </span>
                    <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                      Premium Total: <b>{tierCounts.premium_all}</b>
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
                    <div className="text-white" style={{ opacity: 0.95 }}>
                      <div className="d-flex justify-content-between">
                        <span style={{ opacity: 0.85 }}>Total</span>
                        <b>{subs?.total ?? "—"}</b>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span style={{ opacity: 0.85 }}>Page</span>
                        <b>
                          {subs?.current_page ?? "—"} / {subs?.last_page ?? "—"}
                        </b>
                      </div>

                      <div className="mt-3 d-flex gap-2">
                        <button className="btn btn-light btn-sm" style={{ borderRadius: 10, fontWeight: 700 }} onClick={exportCurrentPageCsv} disabled={!visibleRows.length}>
                          <i className="bi bi-download me-1" />
                          Export visible
                        </button>
                        <button className="btn btn-outline-light btn-sm" style={{ borderRadius: 10, fontWeight: 700 }} onClick={exportAllPagesCsv} disabled={!subs?.data?.length || exporting}>
                          <i className="bi bi-cloud-download me-1" />
                          Export all
                        </button>
                      </div>

                      <div className="mt-2 text-white small" style={{ opacity: 0.9 }}>
                        Export respects the selected <b>Tier</b> filter.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FILTERS */}
            <div className="card border-0 shadow-sm my-4" style={{ borderRadius: 12 }}>
              <div className="card-body p-3 p-md-4">
                <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                  <div>
                    <div className="fw-semibold" style={{ color: "#1e293b" }}>
                      Filters
                    </div>
                    <div className="text-muted small">Dynamic server filters + Tier filter (computed).</div>
                  </div>

                  <div className="d-flex flex-wrap gap-2">
                    <select className="form-select form-select-sm" style={{ width: 170, borderRadius: 10 }} value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="expired">Expired</option>
                    </select>

                    <div className="form-check d-flex align-items-center gap-2 px-2">
                      <input className="form-check-input" type="checkbox" id="activeOnly" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
                      <label className="form-check-label small" htmlFor="activeOnly">
                        Active only (server)
                      </label>
                    </div>

                    <select className="form-select form-select-sm" style={{ width: 210, borderRadius: 10 }} value={tierFilter} onChange={(e) => setTierFilter(e.target.value as TierFilter)}>
                      <option value="all">All tiers</option>
                      <option value="free">Free</option>
                      <option value="premium_all">Premium (Active + Expired)</option>
                      <option value="premium_active">Premium (Active)</option>
                      <option value="premium_expired">Premium (Expired)</option>
                    </select>

                    <div className="input-group input-group-sm" style={{ width: 280 }}>
                      <span className="input-group-text">
                        <i className="bi bi-search" />
                      </span>
                      <input className="form-control" placeholder="Search name/email..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>

                    <button className="btn btn-sm btn-primary" style={{ borderRadius: 10, fontWeight: 700 }} onClick={applyFilters} disabled={loading}>
                      <i className="bi bi-funnel me-1" />
                      {loading ? "Applying..." : "Apply"}
                    </button>

                    {isDirty && !loading && (
                      <span className="badge bg-light text-dark" style={{ borderRadius: 999, alignSelf: "center" }}>
                        Filters changed
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 text-muted small">
                  <i className="bi bi-info-circle me-1" />
                  Tier is computed from <b>plan</b> + <b>ends_at</b>. Free plan name expected: <b>“Free”</b>.
                  Search is debounced (350ms) to avoid too many requests.
                </div>
              </div>
            </div>

            {/* TABLE */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
              <div className="card-body p-3 p-md-4">
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
                        <th style={{ width: 220 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center text-muted py-4">
                            No subscribers found for the selected filters.
                          </td>
                        </tr>
                      ) : (
                        visibleRows.map((s) => {
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
                              <td>
                                <div className="d-flex gap-2 flex-wrap">
                                  <button className="btn btn-sm btn-outline-primary" style={{ borderRadius: 10 }} onClick={() => openAdminDetails(s.user?.id)}>
                                    <i className="bi bi-person-badge me-1" />
                                    View User
                                  </button>

                                  <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 10 }} onClick={() => openAdminDetails(s.user?.id)}>
                                    <i className="bi bi-buildings me-1" />
                                    View School
                                  </button>
                                </div>
                                <div className="text-muted small mt-1">Tip: “View School” is inside Admin details.</div>
                              </td>
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
                      Showing {subs.from ?? 0} - {subs.to ?? 0} of {subs.total} (server paging)
                    </div>

                    <div className="d-flex gap-2 align-items-center">
                      <select
                        className="form-select form-select-sm"
                        style={{ width: 110, borderRadius: 10 }}
                        value={perPage}
                        onChange={(e) => {
                          setPerPage(Number(e.target.value));
                          setPage(1);
                        }}
                      >
                        {[10, 20, 30, 50].map((n) => (
                          <option key={n} value={n}>
                            {n}/page
                          </option>
                        ))}
                      </select>

                      <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 10 }} disabled={subs.current_page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                        <i className="bi bi-chevron-left" />
                      </button>

                      <span className="small text-muted">
                        Page <b>{subs.current_page}</b> / {subs.last_page}
                      </span>

                      <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 10 }} disabled={subs.current_page >= subs.last_page} onClick={() => setPage((p) => Math.min(subs.last_page, p + 1))}>
                        <i className="bi bi-chevron-right" />
                      </button>
                    </div>
                  </div>
                )}
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
