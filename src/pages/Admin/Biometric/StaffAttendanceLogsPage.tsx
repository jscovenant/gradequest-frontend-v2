// src/pages/Attendance/StaffAttendanceLogsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";

import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";

/* =========================
   TYPES
========================= */
type Staff = {
  id: number;
  firstname?: string;
  surname?: string;
  email?: string;
  reg_no?: string | null;
  photo?: string | null;
};

type AttendanceRow = {
  id: number;
  school_id: number;
  user_id: number;
  att_date: string; // YYYY-MM-DD
  check_in_at: string | null;
  check_out_at: string | null;
  status: "present" | "late" | "absent" | "on_leave" | string;
  source?: string | null;
  device_id?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  staff?: Staff; // from backend with(['staff'])
};

type Paginated<T> = {
  current_page: number;
  data: T[];
  from: number | null;
  last_page: number;
  next_page_url: string | null;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
};

type LogsResponse = {
  success: boolean;
  data: Paginated<AttendanceRow>;
  summary: {
    total: number;
    present: number;
    late: number;
    absent: number;
    on_leave: number;
  };
};

function formatDateTime(dt?: string | null) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return String(dt);
  return d.toLocaleString();
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfMonthISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function StaffAttendanceLogsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { showError, showSuccess, showWarning } = useToast();

  const [loading, setLoading] = useState(true);

  // filters
  const [from, setFrom] = useState(startOfMonthISO());
  const [to, setTo] = useState(todayISO());
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");

  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // data
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [summary, setSummary] = useState<LogsResponse["summary"]>({
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
    on_leave: 0,
  });

  const [meta, setMeta] = useState<{ total: number; last_page: number; current_page: number }>({
    total: 0,
    last_page: 1,
    current_page: 1,
  });

  const statusBadge = (s: string) => {
    const v = (s || "").toLowerCase();
    if (v === "present") return { bg: "#dcfce7", fg: "#166534", label: "PRESENT" };
    if (v === "late") return { bg: "#fef9c3", fg: "#854d0e", label: "LATE" };
    if (v === "absent") return { bg: "#fee2e2", fg: "#991b1b", label: "ABSENT" };
    if (v === "on_leave") return { bg: "#dbeafe", fg: "#1d4ed8", label: "ON LEAVE" };
    return { bg: "#e2e8f0", fg: "#0f172a", label: (s || "UNKNOWN").toUpperCase() };
  };

  const fetchLogs = async (targetPage = page) => {
    try {
      setLoading(true);

      const res = await authApi.get<LogsResponse>("/staff-attendance/logs", {
        params: {
          from,
          to,
          q: q.trim() || undefined,
          status: status || undefined,
          page: targetPage,
          per_page: perPage,
        },
      });

      const data = res.data;
      const pag = data.data;

      setRows(pag.data || []);
      setSummary(data.summary);

      setMeta({
        total: pag.total,
        last_page: pag.last_page,
        current_page: pag.current_page,
      });
    } catch (err: any) {
      console.error(err);
      showError?.(err?.response?.data?.message || "Failed to load attendance logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refetch when date/status/perPage change (reset to page 1)
  useEffect(() => {
    setPage(1);
    fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, status, perPage]);

  const filteredCountText = useMemo(() => {
    const parts: string[] = [];
    if (from) parts.push(`From ${from}`);
    if (to) parts.push(`To ${to}`);
    if (status) parts.push(`Status: ${status}`);
    if (q.trim()) parts.push(`Search: "${q.trim()}"`);
    return parts.length ? parts.join(" • ") : "All logs";
  }, [from, to, status, q]);

  const exportCSV = () => {
    if (!rows.length) return showWarning?.("No rows on this page to export.");

    const header = ["Date", "Staff Name", "Reg No", "Email", "Status", "Check In", "Check Out", "Source", "Device", "Notes"];

    const lines = rows.map((r) => {
      const name = `${r.staff?.firstname ?? ""} ${r.staff?.surname ?? ""}`.trim();
      const safe = (x: any) => `"${String(x ?? "").replaceAll('"', '""')}"`;

      return [
        safe(r.att_date),
        safe(name),
        safe(r.staff?.reg_no ?? ""),
        safe(r.staff?.email ?? ""),
        safe(r.status),
        safe(r.check_in_at ?? ""),
        safe(r.check_out_at ?? ""),
        safe(r.source ?? ""),
        safe(r.device_id ?? ""),
        safe(r.notes ?? ""),
      ].join(",");
    });

    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `staff_attendance_${from}_to_${to}_page_${meta.current_page}.csv`;
    a.click();

    window.URL.revokeObjectURL(url);
    showSuccess?.("Export started");
  };

  const resetFilters = () => {
    setFrom(startOfMonthISO());
    setTo(todayISO());
    setStatus("");
    setPerPage(20);
    setQ("");
    setPage(1);
    showSuccess?.("Filters reset");
    fetchLogs(1);
  };

  /* =========================
     SAME TEMPLATE (INLINE CSS)
     - matches the template used in StaffQrAttendancePage
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
      background: radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%);
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
      max-width: 760px;
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
      font-weight: 800;
      padding: 6px 10px;
      border-radius: 999px;
      white-space: nowrap;
      border: 1px solid rgba(0,0,0,0.06);
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

    .db-grid2 { display: grid; grid-template-columns: 0.95fr 1.05fr; gap: 18px; margin: 16px 0 18px; }
    @media (max-width: 991.98px) { .db-grid2 { grid-template-columns: 1fr; } }

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

    .db-cardGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin: 14px 0 8px; }
    @media (max-width: 991.98px) { .db-cardGrid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 575.98px) { .db-cardGrid { grid-template-columns: 1fr; } }

    .miniCard {
      background: #fff;
      border: 1px solid #ede8e0;
      border-radius: 14px;
      box-shadow: 0 2px 10px rgba(15,23,42,0.04);
      overflow: hidden;
    }
    .miniCardTop {
      height: 4px;
      background: linear-gradient(135deg, #c9a84c 0%, #e8c97a 100%);
    }
    .miniCardBody { padding: 14px 14px; display: grid; gap: 8px; }
    .miniCardLabel { font-size: 11px; color: #9a8a7a; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
    .miniCardValue { font-family: "Lora", serif; font-size: 22px; font-weight: 900; color: #1a1a2e; line-height: 1.1; }
    .miniCardHint { font-size: 12px; color: #9a8a7a; }
    .miniCardIcon {
      width: 38px; height: 38px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(201,168,76,0.12);
      border: 1px solid rgba(201,168,76,0.18);
      color: #b45309;
    }

    .db-avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: #e2e8f0; overflow: hidden;
      display: flex; align-items: center; justify-content: center;
      border: 1px solid rgba(0,0,0,0.06);
      flex: 0 0 auto;
    }
    .db-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .db-muted { color: #9a8a7a; }
    .db-strong { font-weight: 900; color: #1a1a2e; }
  `;

  const heroStats = useMemo(() => {
    return {
      total: summary.total,
      present: summary.present,
      late: summary.late,
      absent: summary.absent,
      on_leave: summary.on_leave,
    };
  }, [summary]);

  const cards = useMemo(
    () => [
      { label: "Present", value: heroStats.present, icon: "person-check", top: "linear-gradient(135deg,#16a34a 0%,#22c55e 100%)", hint: "Checked-in staff" },
      { label: "Absent", value: heroStats.absent, icon: "person-x", top: "linear-gradient(135deg,#ef4444 0%,#f43f5e 100%)", hint: "No check-in" },
      { label: "Late", value: heroStats.late, icon: "alarm", top: "linear-gradient(135deg,#f59e0b 0%,#fbbf24 100%)", hint: "After cutoff time" },
      { label: "On Leave", value: heroStats.on_leave, icon: "calendar2-check", top: "linear-gradient(135deg,#3b82f6 0%,#60a5fa 100%)", hint: "Approved leave" },
    ],
    [heroStats]
  );

  return (
    <>
      <style>{templateCss}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Staff Attendance" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loading && <Loader message="Loading attendance logs..." />}

            {/* HERO (same template) */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Attendance • Logs
                  </div>

                  <h1 className="db-greeting">
                    {getGreeting()}, <em>Admin.</em>
                  </h1>

                  <p className="db-hero-sub">
                    View, filter, and export staff attendance logs. Current filters: <b>{filteredCountText}</b>.
                  </p>

                  <div className="db-hero-btns">
                    <button className="db-btn-gold" onClick={() => fetchLogs(1)} disabled={loading}>
                      <i className="bi bi-arrow-clockwise" />
                      Refresh
                    </button>

                    <button className="db-btn-outline" onClick={resetFilters} disabled={loading}>
                      <i className="bi bi-sliders" />
                      Reset filters
                    </button>

                    <button className="db-btn-outline" onClick={exportCSV} disabled={loading || rows.length === 0}>
                      <i className="bi bi-download" />
                      Export CSV (page)
                    </button>
                  </div>
                </div>

                <div className="db-hero-stat-card d-none d-md-block">
                  <div className="db-hero-stat-row">
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Total</span>
                      <span className="db-hero-stat-val">{heroStats.total}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Present</span>
                      <span className="db-hero-stat-val">{heroStats.present}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Absent</span>
                      <span className="db-hero-stat-val">{heroStats.absent}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Late</span>
                      <span className="db-hero-stat-val">{heroStats.late}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">On Leave</span>
                      <span className="db-hero-stat-val">{heroStats.on_leave}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mini cards (same vibe as template) */}
            <div className="db-cardGrid">
              {cards.map((c) => (
                <div className="miniCard" key={c.label}>
                  <div className="miniCardTop" style={{ background: c.top }} />
                  <div className="miniCardBody">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
                      <div>
                        <div className="miniCardLabel">{c.label}</div>
                        <div className="miniCardValue">{c.value}</div>
                      </div>
                      <div className="miniCardIcon" style={{ background: "rgba(0,0,0,0.04)", borderColor: "rgba(0,0,0,0.06)", color: "#0f172a" }}>
                        <i className={`bi bi-${c.icon}`} />
                      </div>
                    </div>
                    <div className="miniCardHint">{c.hint}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* FILTERS + TABLE */}
            <div className="db-panel" style={{ marginTop: 14 }}>
              <div className="db-panel-head">
                <div>
                  <p className="db-panel-title">Attendance log table</p>
                  <p className="db-panel-sub">
                    Page <b>{meta.current_page}</b> of <b>{meta.last_page}</b> • Total <b>{meta.total}</b>
                  </p>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="db-refresh-btn" onClick={() => fetchLogs(1)} disabled={loading}>
                    <i className="bi bi-arrow-clockwise" /> Refresh
                  </button>
                  <button className="db-refresh-btn" onClick={exportCSV} disabled={loading || rows.length === 0}>
                    <i className="bi bi-download" /> Export (page)
                  </button>
                </div>
              </div>

              <div style={{ padding: 16 }}>
                {/* filters row */}
                <div className="db-grid2" style={{ gridTemplateColumns: "1fr 1fr", margin: 0 }}>
                  <div className="db-panel" style={{ borderRadius: 14 }}>
                    <div className="db-panel-head">
                      <div>
                        <p className="db-panel-title" style={{ fontSize: 14 }}>Filters</p>
                        <p className="db-panel-sub">Date range, status, search, and page size</p>
                      </div>
                      <button className="db-refresh-btn" onClick={resetFilters} disabled={loading}>
                        <i className="bi bi-sliders" /> Reset
                      </button>
                    </div>

                    <div style={{ padding: 14, display: "grid", gap: 10 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <div className="miniCardLabel" style={{ marginBottom: 6 }}>From</div>
                          <input type="date" className="db-input" value={from} onChange={(e) => setFrom(e.target.value)} disabled={loading} />
                        </div>
                        <div>
                          <div className="miniCardLabel" style={{ marginBottom: 6 }}>To</div>
                          <input type="date" className="db-input" value={to} onChange={(e) => setTo(e.target.value)} disabled={loading} />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <div className="miniCardLabel" style={{ marginBottom: 6 }}>Status</div>
                          <select className="db-input" value={status} onChange={(e) => setStatus(e.target.value)} disabled={loading}>
                            <option value="">All</option>
                            <option value="present">Present</option>
                            <option value="late">Late</option>
                            <option value="absent">Absent</option>
                            <option value="on_leave">On Leave</option>
                          </select>
                        </div>
                        <div>
                          <div className="miniCardLabel" style={{ marginBottom: 6 }}>Per page</div>
                          <select className="db-input" value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} disabled={loading}>
                            {[10, 20, 30, 50, 100].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <div className="miniCardLabel" style={{ marginBottom: 6 }}>Search</div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                          <input
                            className="db-input"
                            style={{ flex: 1, minWidth: 240 }}
                            placeholder="Search name, reg no, email..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") fetchLogs(1);
                            }}
                            disabled={loading}
                          />
                          <button className="db-btn-gold" onClick={() => fetchLogs(1)} disabled={loading}>
                            <i className="bi bi-search" /> Search
                          </button>
                        </div>
                        <div style={{ marginTop: 8, fontSize: 12, color: "#9a8a7a" }}>
                          Search doesn’t auto-run on typing. Press Enter or click Search.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* right panel: pagination controls */}
                  <div className="db-panel" style={{ borderRadius: 14 }}>
                    <div className="db-panel-head">
                      <div>
                        <p className="db-panel-title" style={{ fontSize: 14 }}>Pagination</p>
                        <p className="db-panel-sub">Navigate pages</p>
                      </div>
                    </div>

                    <div style={{ padding: 14, display: "grid", gap: 10 }}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                          className="db-refresh-btn"
                          disabled={loading || meta.current_page <= 1}
                          onClick={() => {
                            const p = Math.max(1, meta.current_page - 1);
                            setPage(p);
                            fetchLogs(p);
                          }}
                        >
                          <i className="bi bi-chevron-left" /> Prev
                        </button>

                        <button className="db-refresh-btn" disabled>
                          Page {meta.current_page} / {meta.last_page}
                        </button>

                        <button
                          className="db-refresh-btn"
                          disabled={loading || meta.current_page >= meta.last_page}
                          onClick={() => {
                            const p = Math.min(meta.last_page, meta.current_page + 1);
                            setPage(p);
                            fetchLogs(p);
                          }}
                        >
                          Next <i className="bi bi-chevron-right" />
                        </button>
                      </div>

                      <div style={{ fontSize: 12, color: "#9a8a7a", lineHeight: 1.6 }}>
                        Export downloads only the <b>current page</b>. Use filters + pagination to export multiple pages.
                      </div>
                    </div>
                  </div>
                </div>

                {/* table */}
                <div style={{ marginTop: 14, overflow: "auto", borderRadius: 14, border: "1px solid rgba(0,0,0,0.06)" }}>
                  <table className="db-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Staff</th>
                        <th>Reg No</th>
                        <th>Status</th>
                        <th>Check In</th>
                        <th>Check Out</th>
                        <th>Source</th>
                        <th>Device</th>
                        <th>Notes</th>
                      </tr>
                    </thead>

                    <tbody>
                      {!rows.length ? (
                        <tr>
                          <td colSpan={9} style={{ padding: 18, color: "#9a8a7a", textAlign: "center" }}>
                            No attendance logs found for the selected filters.
                          </td>
                        </tr>
                      ) : (
                        rows.map((r) => {
                          const name = `${r.staff?.firstname ?? ""} ${r.staff?.surname ?? ""}`.trim();
                          const b = statusBadge(r.status);

                          return (
                            <tr key={r.id}>
                              <td style={{ whiteSpace: "nowrap" }}>
                                <span className="db-strong">{r.att_date}</span>
                              </td>

                              <td style={{ minWidth: 240 }}>
                                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                  <div className="db-avatar">
                                    {r.staff?.photo ? (
                                      <img src={r.staff.photo} alt="staff" />
                                    ) : (
                                      <i className="bi bi-person-fill" style={{ color: "#64748b" }} />
                                    )}
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <div className="db-strong" style={{ fontSize: 13.5 }}>
                                      {name || "—"}
                                    </div>
                                    <div className="db-muted" style={{ fontSize: 12 }}>
                                      {r.staff?.email || "—"}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td style={{ whiteSpace: "nowrap" }} className="db-muted">
                                {r.staff?.reg_no || "—"}
                              </td>

                              <td>
                                <span className="db-pill" style={{ background: b.bg, color: b.fg }}>
                                  {b.label}
                                </span>
                              </td>

                              <td className="db-muted" style={{ whiteSpace: "nowrap" }}>
                                {formatDateTime(r.check_in_at)}
                              </td>
                              <td className="db-muted" style={{ whiteSpace: "nowrap" }}>
                                {formatDateTime(r.check_out_at)}
                              </td>

                              <td className="db-muted" style={{ whiteSpace: "nowrap" }}>
                                {r.source ? (
                                  <span className="db-pill" style={{ background: "rgba(100,116,139,0.10)", color: "#334155" }}>
                                    {r.source}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>

                              <td className="db-muted" style={{ whiteSpace: "nowrap" }}>
                                {r.device_id || "—"}
                              </td>

                              <td className="db-muted" style={{ maxWidth: 320 }}>
                                {r.notes || "—"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="db-foot" style={{ marginTop: 12 }}>
                  <div>
                    Showing page <b>{meta.current_page}</b> of <b>{meta.last_page}</b>
                  </div>
                  <div>Tip: Narrow date range for faster queries.</div>
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

/**
 * Backend:
 *   GET /staff-attendance/logs?from=YYYY-MM-DD&to=YYYY-MM-DD&q=&status=&page=&per_page=
 *
 * Response:
 *   { success, data: paginator, summary: { total,present,late,absent,on_leave } }
 */