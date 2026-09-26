// src/pages/SuperAdmin/SubscribersManagementPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import { authApi } from "../../utils/axios";
import { useToast } from "../../contexts/ToastContext";

/* ==========================================================================
   TYPES
   ========================================================================== */

type SchoolInfo = {
  id: number;
  school_name: string;
  active_edition_tier?: string | null;
  active_edition_tier_label?: string | null;
  online_payment_enabled?: boolean | number;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  created_at?: string | null;
};

type SchoolOwnerRow = {
  id: number;
  firstname: string;
  surname: string;
  name?: string;
  email: string;
  phone?: string | null;
  status: string | number;
  role: string;
  school_id?: number | null;
  student_count?: number;
  active_edition_tier?: string;
  active_edition_tier_label?: string;
  online_payment_enabled?: boolean;
  created_at?: string | null;
  school?: SchoolInfo | null;
};

type TierCounts = {
  total: number;
  standard_cbt: number;
  basic_result: number;
  annual_full_session: number;
  online_pay_enabled: number;
  online_pay_disabled: number;
};

type Paginated<T> = {
  current_page: number;
  data: T[];
  from?: number | null;
  to?: number | null;
  last_page: number;
  per_page: number;
  total: number;
  tier_counts?: TierCounts;
};

/* ==========================================================================
   HELPERS & FORMATTERS
   ========================================================================== */

function fmtDate(val?: string | null) {
  if (!val) return "—";
  const d = new Date(val);
  return Number.isNaN(d.getTime())
    ? val
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function nameOf(u?: { firstname?: string; surname?: string; name?: string; email?: string } | null) {
  if (!u) return "—";
  const full = `${u.surname ?? ""} ${u.firstname ?? ""}`.trim();
  return full || u.name || u.email || "—";
}

function getTierBadgeInfo(tier?: string | null) {
  const t = (tier || "").toLowerCase();
  if (t === "basic_result") {
    return {
      label: "Basic Result (₦300/student)",
      badgeClass: "bg-info text-dark",
      icon: "bi-file-earmark-text",
    };
  }
  if (t === "annual_full_session") {
    return {
      label: "Annual Full Session",
      badgeClass: "bg-warning text-dark",
      icon: "bi-calendar-check",
    };
  }
  return {
    label: "Standard CBT & AI (₦500/student)",
    badgeClass: "bg-primary text-white",
    icon: "bi-cpu",
  };
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

/* ==========================================================================
   COMPONENT
   ========================================================================== */

export default function SubscribersManagementPage() {
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Filters
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [onlinePayFilter, setOnlinePayFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [togglingAdminId, setTogglingAdminId] = useState<number | null>(null);
  const [schoolsData, setSchoolsData] = useState<Paginated<SchoolOwnerRow> | null>(null);

  useEffect(() => {
    document.title = "School Directory & Edition Tiers - SchoolProfit";
  }, []);

  /* =========================
     DEBOUNCE SEARCH
  ========================= */
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  /* =========================
     FETCHER
  ========================= */
  const fetchSchools = async (p = page, pp = perPage) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("perPage", String(pp));
      if (tierFilter && tierFilter !== "all") params.set("tier", tierFilter);
      if (onlinePayFilter && onlinePayFilter !== "all") params.set("online_payment", onlinePayFilter);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      const res = await authApi.get(`/admin-users?${params.toString()}`);
      setSchoolsData(res.data || null);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to load registered schools.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSchools(page, perPage);
  }, [page, perPage, debouncedSearch, tierFilter, onlinePayFilter, statusFilter]);

  /* =========================
     ONLINE PAY TOGGLE
  ========================= */
  const toggleSchoolOnlinePayment = async (adminRow: SchoolOwnerRow) => {
    if (!adminRow.id) return;
    const isCurrentlyOn = adminRow.school?.online_payment_enabled !== false && (adminRow.school?.online_payment_enabled as any) !== 0;
    const nextState = !isCurrentlyOn;
    const schoolName = adminRow.school?.school_name || nameOf(adminRow) + "'s School";

    const promptText = nextState
      ? `Enable online fee payments for ${schoolName}?\n\nParents and students will be allowed to make fee payments online on /pay-fees and branded links.`
      : `Switch OFF online fee payments for ${schoolName}?\n\nThe platform will REJECT all fee payment attempts on /pay-fees for this school and notify parents.`;

    if (!window.confirm(promptText)) {
      return;
    }

    setTogglingAdminId(adminRow.id);
    try {
      const res = await authApi.patch(`/admin-users/${adminRow.id}/toggle-online-payment`, {
        enabled: nextState,
      });
      showSuccess(res.data?.message || `Online payment ${nextState ? "enabled" : "disabled"} successfully.`);
      
      setSchoolsData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((item) => {
            if (item.id === adminRow.id) {
              return {
                ...item,
                online_payment_enabled: nextState,
                school: item.school ? { ...item.school, online_payment_enabled: nextState } : null,
              };
            }
            return item;
          }),
        };
      });
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to update online payment switch.");
    } finally {
      setTogglingAdminId(null);
    }
  };

  /* =========================
     BULK ONLINE PAY TOGGLE (ALL SCHOOLS)
  ========================= */
  const [bulkToggling, setBulkToggling] = useState(false);

  const bulkToggleAllSchoolsOnlinePayment = async (enable: boolean) => {
    const actionWord = enable ? "ENABLE" : "DISABLE";
    const promptText = enable
      ? `Are you sure you want to ENABLE Online Fee Payment for ALL schools on the platform?\n\nParents and students across all registered schools will be allowed to make fee payments online via payment gateways.`
      : `Are you sure you want to DISABLE Online Fee Payment for ALL schools on the platform?\n\nOnline fee payment attempts will be REJECTED platform-wide.`;

    if (!window.confirm(promptText)) {
      return;
    }

    setBulkToggling(true);
    try {
      const res = await authApi.post("/superadmin/schools/bulk-toggle-online-payment", {
        enabled: enable,
      });
      showSuccess(res.data?.message || `Online payment ${actionWord.toLowerCase()}d for all schools.`);
      await fetchSchools(page, perPage);
    } catch (err: any) {
      showError(err?.response?.data?.message || `Failed to ${actionWord.toLowerCase()} online payment for all schools.`);
    } finally {
      setBulkToggling(false);
    }
  };

  /* =========================
     EXPORT CSV
  ========================= */
  const exportAllToCsv = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("perPage", "500");
      if (tierFilter && tierFilter !== "all") params.set("tier", tierFilter);
      if (onlinePayFilter && onlinePayFilter !== "all") params.set("online_payment", onlinePayFilter);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      const res = await authApi.get(`/admin-users?${params.toString()}`);
      const exportList: SchoolOwnerRow[] = res.data?.data || [];

      if (!exportList.length) {
        showError("No schools available to export.");
        return;
      }

      const rows = exportList.map((row) => ({
        school_name: row.school?.school_name || "School Not Linked",
        owner_name: nameOf(row),
        email: row.email || "—",
        phone: row.phone || row.school?.phone || "—",
        tier: row.school?.active_edition_tier_label || getTierBadgeInfo(row.school?.active_edition_tier).label,
        student_count: row.student_count || 0,
        online_payment: row.school?.online_payment_enabled !== false ? "Enabled" : "Disabled",
        status: String(row.status) === "1" ? "Active" : "Suspended",
        joined_at: fmtDate(row.created_at),
      }));

      const columns = [
        { key: "school_name", label: "School Name" },
        { key: "owner_name", label: "Owner Name" },
        { key: "email", label: "Email Address" },
        { key: "phone", label: "Phone Number" },
        { key: "tier", label: "Pricing Edition Tier" },
        { key: "student_count", label: "Students" },
        { key: "online_payment", label: "Online Fee Pay" },
        { key: "status", label: "Account Status" },
        { key: "joined_at", label: "Joined Date" },
      ];

      downloadCsv(`SchoolProfit-Schools-Directory-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows, columns));
      showSuccess("Export downloaded successfully.");
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to export schools.");
    } finally {
      setExporting(false);
    }
  };

  const counts = schoolsData?.tier_counts || {
    total: 0,
    standard_cbt: 0,
    basic_result: 0,
    annual_full_session: 0,
    online_pay_enabled: 0,
    online_pay_disabled: 0,
  };

  return (
    <>
      <style>{`
        .sp-filter-card {
          border-radius: 12px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          padding: 16px;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .sp-filter-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 14px rgba(15, 39, 68, 0.08);
        }
        .sp-filter-card.active {
          border-color: #1D4ED8;
          background: #EFF6FF;
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Registered Schools & Subscribers" />
      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="col-md-9 col-lg-10 ms-auto db-main p-3 p-md-4 d-flex flex-column min-vh-100">
            {loading && <Loader message="Loading registered schools..." />}
            {/* HERO HEADER */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
              <div>
                <h4 className="fw-bold mb-1 text-dark" style={{ letterSpacing: "-0.02em" }}>
                  Registered Schools &amp; Edition Tiers
                </h4>
                <p className="text-muted small mb-0">
                  Manage active school accounts, edition tiers, online fee gateways, free credits, and quick WhatsApp re-engagement.
                </p>
              </div>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
                  style={{ borderRadius: 10, fontWeight: 600 }}
                  onClick={() => fetchSchools(page, perPage)}
                  disabled={loading}
                >
                  <i className="bi bi-arrow-clockwise" />
                  Refresh
                </button>

                <button
                  type="button"
                  className="btn btn-sm btn-primary d-flex align-items-center gap-2"
                  style={{ borderRadius: 10, fontWeight: 600, background: "#0F2744", borderColor: "#0F2744" }}
                  onClick={exportAllToCsv}
                  disabled={exporting || loading}
                >
                  <i className="bi bi-download" />
                  {exporting ? "Exporting..." : "Export CSV"}
                </button>
              </div>
            </div>

            {/* MASTER PLATFORM ONLINE PAYMENT BULK SWITCH */}
            <div
              className="card shadow-sm border-0 mb-4"
              style={{
                borderRadius: 16,
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                color: "#fff",
              }}
            >
              <div className="card-body p-3 p-md-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <i className="bi bi-globe2 text-warning fs-5" />
                    <h6 className="mb-0 fw-bold text-white fs-5">Platform-Wide Online Fee Payment Switch</h6>
                    <span className="badge bg-warning text-dark px-2 py-1" style={{ fontSize: 11, fontWeight: 800 }}>Master Control</span>
                  </div>
                  <p className="mb-0 text-white-50" style={{ fontSize: 13, maxWidth: 680 }}>
                    Enable or disable online fee payments for <strong>ALL {counts.total} registered schools</strong> at once. When disabled, public online fee checkouts are safely rejected platform-wide.
                  </p>
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    className="btn btn-success fw-bold d-flex align-items-center gap-2 px-3 py-2"
                    style={{ borderRadius: 10, fontSize: 13 }}
                    onClick={() => bulkToggleAllSchoolsOnlinePayment(true)}
                    disabled={bulkToggling || loading}
                  >
                    {bulkToggling ? (
                      <span className="spinner-border spinner-border-sm" />
                    ) : (
                      <i className="bi bi-check-circle-fill" />
                    )}
                    Enable for ALL Schools
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger fw-bold d-flex align-items-center gap-2 px-3 py-2 text-white border-danger"
                    style={{ borderRadius: 10, fontSize: 13, background: "rgba(220, 38, 38, 0.2)" }}
                    onClick={() => bulkToggleAllSchoolsOnlinePayment(false)}
                    disabled={bulkToggling || loading}
                  >
                    {bulkToggling ? (
                      <span className="spinner-border spinner-border-sm" />
                    ) : (
                      <i className="bi bi-x-circle-fill text-danger" />
                    )}
                    Disable for ALL Schools
                  </button>
                </div>
              </div>
            </div>

            {/* QUICK STATS / FILTER CARDS */}
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-3">
                <div
                  className={`sp-filter-card ${tierFilter === "all" ? "active" : ""}`}
                  onClick={() => {
                    setTierFilter("all");
                    setPage(1);
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted small fw-bold">All Schools</span>
                    <i className="bi bi-buildings text-secondary" />
                  </div>
                  <h4 className="fw-bold text-dark mt-2 mb-0">{counts.total}</h4>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div
                  className={`sp-filter-card ${tierFilter === "standard_cbt" ? "active" : ""}`}
                  onClick={() => {
                    setTierFilter("standard_cbt");
                    setPage(1);
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-primary small fw-bold">Standard CBT & AI</span>
                    <i className="bi bi-cpu text-primary" />
                  </div>
                  <h4 className="fw-bold text-primary mt-2 mb-0">{counts.standard_cbt}</h4>
                  <small className="text-muted" style={{ fontSize: 11 }}>₦500/student plan</small>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div
                  className={`sp-filter-card ${tierFilter === "basic_result" ? "active" : ""}`}
                  onClick={() => {
                    setTierFilter("basic_result");
                    setPage(1);
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-info small fw-bold">Basic Result</span>
                    <i className="bi bi-file-earmark-text text-info" />
                  </div>
                  <h4 className="fw-bold text-info mt-2 mb-0">{counts.basic_result}</h4>
                  <small className="text-muted" style={{ fontSize: 11 }}>₦300/student plan</small>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div
                  className={`sp-filter-card ${onlinePayFilter === "enabled" ? "active" : ""}`}
                  onClick={() => {
                    setOnlinePayFilter(onlinePayFilter === "enabled" ? "all" : "enabled");
                    setPage(1);
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-success small fw-bold">Online Pay Active</span>
                    <i className="bi bi-credit-card-2-front text-success" />
                  </div>
                  <h4 className="fw-bold text-success mt-2 mb-0">{counts.online_pay_enabled}</h4>
                  <small className="text-muted" style={{ fontSize: 11 }}>Live Fee Collection</small>
                </div>
              </div>
            </div>

            {/* FILTER BAR */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 14 }}>
              <div className="card-body p-3">
                <div className="d-flex flex-wrap align-items-center gap-3">
                  {/* Pricing Edition Filter */}
                  <div style={{ minWidth: 200 }}>
                    <label className="form-label small text-muted fw-bold mb-1">Pricing Edition</label>
                    <select
                      className="form-select form-select-sm"
                      style={{ borderRadius: 10 }}
                      value={tierFilter}
                      onChange={(e) => {
                        setTierFilter(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="all">All Pricing Editions</option>
                      <option value="standard_cbt">Standard CBT & AI Edition</option>
                      <option value="basic_result">Basic Result Edition</option>
                    </select>
                  </div>

                  {/* Online Payment Filter */}
                  <div style={{ minWidth: 170 }}>
                    <label className="form-label small text-muted fw-bold mb-1">Online Fee Payment</label>
                    <select
                      className="form-select form-select-sm"
                      style={{ borderRadius: 10 }}
                      value={onlinePayFilter}
                      onChange={(e) => {
                        setOnlinePayFilter(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="all">All Online Pay States</option>
                      <option value="enabled">Online Pay ON</option>
                      <option value="disabled">Online Pay OFF</option>
                    </select>
                  </div>

                  {/* Account Status Filter */}
                  <div style={{ minWidth: 140 }}>
                    <label className="form-label small text-muted fw-bold mb-1">Status</label>
                    <select
                      className="form-select form-select-sm"
                      style={{ borderRadius: 10 }}
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>

                  {/* Search Box */}
                  <div className="flex-grow-1" style={{ minWidth: 240 }}>
                    <label className="form-label small text-muted fw-bold mb-1">Search Directory</label>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text bg-white" style={{ borderRadius: "10px 0 0 10px" }}>
                        <i className="bi bi-search text-muted" />
                      </span>
                      <input
                        className="form-control"
                        style={{ borderRadius: "0 10px 10px 0" }}
                        placeholder="Search school name, owner, email or phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* TABLE */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 14 }}>
              <div className="card-body p-3 p-md-4">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{ background: "#F8FAFC" }}>
                      <tr>
                        <th style={{ fontWeight: 700, color: "#475569" }}>School &amp; Owner</th>
                        <th style={{ fontWeight: 700, color: "#475569" }}>Contact</th>
                        <th style={{ fontWeight: 700, color: "#475569" }}>Pricing Edition Tier</th>
                        <th style={{ fontWeight: 700, color: "#475569" }}>Students</th>
                        <th style={{ fontWeight: 700, color: "#475569" }}>Online Fee Pay</th>
                        <th style={{ fontWeight: 700, color: "#475569" }}>Status</th>
                        <th style={{ fontWeight: 700, color: "#475569", width: 170 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!schoolsData?.data || schoolsData.data.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center text-muted py-5">
                            <i className="bi bi-buildings fs-1 d-block mb-2 text-secondary" />
                            No schools found matching the selected filters.
                          </td>
                        </tr>
                      ) : (
                        schoolsData.data.map((row) => {
                          const tierInfo = getTierBadgeInfo(row.school?.active_edition_tier);
                          const isOnlinePay = row.school?.online_payment_enabled !== false && (row.school?.online_payment_enabled as any) !== 0;
                          const isSuspended = String(row.status) === "0";
                          const isToggling = togglingAdminId === row.id;
                          const phoneClean = (row.phone || row.school?.phone || "").replace(/[^0-9]/g, "");
                          const waPhone = phoneClean.startsWith("0") ? "234" + phoneClean.slice(1) : phoneClean;

                          return (
                            <tr key={row.id}>
                              <td>
                                <div>
                                  <div className="fw-bold text-dark fs-6">{row.school?.school_name || "School Not Linked"}</div>
                                  <div className="text-muted small">
                                    Owner: <span className="fw-semibold text-secondary">{nameOf(row)}</span> • Joined {fmtDate(row.created_at)}
                                  </div>
                                </div>
                              </td>

                              <td>
                                <div>
                                  <div className="small fw-semibold text-dark">{row.email || "—"}</div>
                                  <div className="text-muted small">{row.phone || row.school?.phone || "No phone"}</div>
                                </div>
                              </td>

                              <td>
                                <span className={`badge ${tierInfo.badgeClass}`} style={{ borderRadius: 999, padding: "6px 12px" }}>
                                  <i className={`bi ${tierInfo.icon} me-1`} />
                                  {tierInfo.label}
                                </span>
                              </td>

                              <td>
                                <span className="fw-bold text-dark">{(row.student_count || 0).toLocaleString()}</span>{" "}
                                <span className="text-muted small">students</span>
                              </td>

                              <td>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${isOnlinePay ? "btn-success" : "btn-danger"}`}
                                  style={{ borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "4px 12px" }}
                                  onClick={() => toggleSchoolOnlinePayment(row)}
                                  disabled={isToggling}
                                  title={isOnlinePay ? "Click to switch OFF online fee payments (system will reject payments on /pay-fees)" : "Click to ENABLE online fee payments"}
                                >
                                  {isToggling ? (
                                    <span className="spinner-border spinner-border-sm me-1" style={{ width: 11, height: 11 }} />
                                  ) : (
                                    <i className={`bi ${isOnlinePay ? "bi-check-circle-fill" : "bi-slash-circle-fill"} me-1`} />
                                  )}
                                  {isOnlinePay ? "Online Pay ON" : "Online Pay OFF"}
                                </button>
                              </td>

                              <td>
                                <span className={`badge ${isSuspended ? "bg-danger" : "bg-success"}`} style={{ borderRadius: 999 }}>
                                  {isSuspended ? "Suspended" : "Active"}
                                </span>
                              </td>

                              <td>
                                <div className="d-flex align-items-center gap-1">
                                  <button
                                    className="btn btn-sm btn-outline-primary"
                                    style={{ borderRadius: 10, fontWeight: 600 }}
                                    onClick={() => navigate(`/admin-users/view/${row.id}`)}
                                  >
                                    <i className="bi bi-gear me-1" />
                                    Manage
                                  </button>

                                  {phoneClean.length >= 8 && (
                                    <a
                                      href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                                        `Good day Proprietor / Principal of ${row.school?.school_name || "your school"},\n\nExciting news! SchoolProfit has credited your school account with 50 FREE AI Lesson Planning & CBT Credits with zero upfront subscription fees.\n\nYou can log in at https://schoolprofit.ng/login to explore, or let us know if you need help uploading your students for free!`
                                      )}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-sm btn-outline-success"
                                      style={{ borderRadius: 10, fontWeight: 600, padding: "4px 8px" }}
                                      title="Reach out on WhatsApp"
                                    >
                                      <i className="bi bi-whatsapp" />
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION */}
                {schoolsData && schoolsData.last_page > 1 && (
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3 pt-3 border-top">
                    <div className="text-muted small">
                      Showing {schoolsData.from ?? 0} - {schoolsData.to ?? 0} of {schoolsData.total} schools
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

                      <button
                        className="btn btn-sm btn-outline-secondary"
                        style={{ borderRadius: 10 }}
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        <i className="bi bi-chevron-left" />
                      </button>

                      <span className="small text-muted">
                        Page <b>{page}</b> / {schoolsData.last_page}
                      </span>

                      <button
                        className="btn btn-sm btn-outline-secondary"
                        style={{ borderRadius: 10 }}
                        disabled={page >= schoolsData.last_page}
                        onClick={() => setPage((p) => Math.min(schoolsData.last_page, p + 1))}
                      >
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
