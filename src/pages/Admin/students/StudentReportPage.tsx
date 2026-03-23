// src/pages/Students/StudentReportPage.tsx
import  { useEffect, useMemo, useState } from "react";
import { authApi } from "../../../utils/axios";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";

import pdfMake from "pdfmake/build/pdfmake";
import { vfs } from "pdfmake/build/vfs_fonts";
pdfMake.vfs = vfs;

/* ================= INTERFACES ================= */
interface StudentReport {
  id: number;
  name: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  totalTimesPresent: number;
  totalTimesAbsent: number;
  total: number;
}

interface StudentClass {
  id: number;
  name: string;
}

/* ================= HELPERS ================= */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function fmtDate(d?: string) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function clampRange(start: string, end: string) {
  if (!start || !end) return { start, end };
  if (new Date(start) > new Date(end)) return { start: end, end: start };
  return { start, end };
}

/* ================= COMPONENT ================= */
export default function StudentReportPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { showSuccess, showError } = useToast();

  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [classId, setClassId] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [reportData, setReportData] = useState<StudentReport[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  const selectedClassName = useMemo(
    () => classes.find((c) => String(c.id) === String(classId))?.name ?? "No class selected",
    [classes, classId]
  );

  const totals = useMemo(() => {
    const sum = (key: keyof StudentReport) => reportData.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
    return {
      students: reportData.length,
      present: sum("present"),
      absent: sum("absent"),
      late: sum("late"),
      excused: sum("excused"),
      tp: sum("totalTimesPresent"),
      ta: sum("totalTimesAbsent"),
      total: sum("total"),
    };
  }, [reportData]);

  const statusPill = useMemo(() => {
    if (!reportData.length) return { bg: "rgba(245,158,11,0.16)", fg: "#fbbf24", text: "NO DATA" };
    return { bg: "rgba(34,197,94,0.16)", fg: "#22c55e", text: "READY" };
  }, [reportData.length]);

  /* ================= FETCH CLASSES ================= */
 useEffect(() => {
  const fetchClasses = async () => {
    try {
      const res = await authApi.get("/attendance/classes");

      const payload = res.data;

      // Accept both shapes (array or { classes: [] })
      const cls: StudentClass[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.classes)
          ? payload.classes
          : [];

      setClasses(cls);

      // Optional: auto-select teacher default class
      const defaultId =
        payload?.default_class_id != null ? String(payload.default_class_id) : "";

      if (defaultId && !classId) setClassId(defaultId);
    } catch (e) {
      console.error(e);
      showError?.("Failed to load classes.");
    } finally {
      setPageLoading(false);
    }
  };

  fetchClasses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  /* ================= FETCH REPORT ================= */
  const generateReport = async () => {
    if (!classId) return showError?.("Please select a class");

    const fixed = clampRange(startDate, endDate);
    if (fixed.start !== startDate) setStartDate(fixed.start);
    if (fixed.end !== endDate) setEndDate(fixed.end);

    setReportLoading(true);
    try {
      const res = await authApi.get("/student-report", {
        params: { class_id: classId, start_date: fixed.start, end_date: fixed.end },
      });

      const rows = Array.isArray(res.data) ? res.data : [];
      setReportData(rows);

      showSuccess?.(`Report generated for ${selectedClassName}.`);
    } catch (e) {
      console.error(e);
      showError?.("Failed to generate report");
      setReportData([]);
    } finally {
      setReportLoading(false);
    }
  };

  /* ================= DOWNLOAD CSV ================= */
  const downloadCSV = () => {
    if (!reportData.length) return;

    const headers = ["Student Name", "Present", "Absent", "Late", "Excused", "Total Times Present", "Total Times Absent", "Total"];
    const rows = reportData.map((s) => [
      s.name,
      s.present,
      s.absent,
      s.late,
      s.excused,
      s.totalTimesPresent,
      s.totalTimesAbsent,
      s.total,
    ]);

    const csv = "data:text/csv;charset=utf-8," + [headers, ...rows].map((r) => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = "attendance_report.csv";
    link.click();
  };

  /* ================= DOWNLOAD PDF ================= */
  const downloadPDF = () => {
    if (!reportData.length) return;

    const body = [
      ["#", "Student", "P", "A", "L", "E", "TP", "TA", "Total"],
      ...reportData.map((s, i) => [
        i + 1,
        s.name,
        s.present,
        s.absent,
        s.late,
        s.excused,
        s.totalTimesPresent,
        s.totalTimesAbsent,
        s.total,
      ]),
      ["", "TOTAL", totals.present, totals.absent, totals.late, totals.excused, totals.tp, totals.ta, totals.total],
    ];

    pdfMake
      .createPdf({
        content: [
          { text: "Student Attendance Report", bold: true, fontSize: 16, margin: [0, 0, 0, 6] },
          { text: `${selectedClassName} • ${fmtDate(startDate)} - ${fmtDate(endDate)}`, color: "#555", margin: [0, 0, 0, 10] },
          {
            table: {
              headerRows: 1,
              widths: ["auto", "*", "auto", "auto", "auto", "auto", "auto", "auto", "auto"],
              body,
            },
            layout: "lightHorizontalLines",
          },
        ],
        defaultStyle: { fontSize: 10 },
      })
      .download("attendance_report.pdf");
  };

  return (
    <>
      <style>{`
        /* ===== AdminDashboard template styles (only what's needed) ===== */
        .db-main {
          background: var(--bs-body-bg, #f5f1eb);
          min-height: 100vh;
          font-family: "DM Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          padding: 28px 28px 0;
        }

        .db-hero {
          background: #0f172a;
          border-radius: var(--bs-border-radius-lg, 16px);
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
          background: radial-gradient(circle, rgba(201, 168, 76, 0.10) 0%, transparent 65%);
          pointer-events: none;
        }
        .db-hero-glow2 {
          position: absolute;
          bottom: -40px;
          left: 30%;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .db-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 32px;
          flex-wrap: wrap;
        }
        @media (min-width: 768px) { .db-hero-inner { flex-wrap: nowrap; } }

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
          color: #64748b;
          line-height: 1.65;
          max-width: 520px;
          margin-bottom: 24px;
        }

        .db-hero-btns { display: flex; gap: 10px; flex-wrap: wrap; }

        .db-btn-gold {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 20px;
          font-family: "DM Sans", sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: #0f172a;
          background: #c9a84c;
          border: none;
          border-radius: var(--bs-border-radius, 8px);
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
          white-space: nowrap;
        }
        .db-btn-gold:hover { background: #e8c97a; transform: translateY(-1px); }
        .db-btn-gold:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        .db-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 20px;
          font-family: "DM Sans", sans-serif;
          font-size: 13px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.7);
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: var(--bs-border-radius, 8px);
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
          border-radius: var(--bs-border-radius, 12px);
          padding: 20px 24px;
          min-width: 240px;
          margin-left: auto;
          align-self: flex-end;
        }

        .db-hero-stat-row { display: flex; flex-direction: column; gap: 10px; }
        .db-hero-stat-item { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .db-hero-stat-label { font-size: 12px; font-weight: 300; color: #64748b; }
        .db-hero-stat-val { font-family: "Lora", serif; font-size: 18px; font-weight: 700; color: #fff; }
        .db-hero-stat-sep { height: 1px; background: rgba(255, 255, 255, 0.06); }

        .db-panel {
          background: var(--bs-body-bg, #fff);
          border: 1px solid var(--bs-border-color, #ede8e0);
          border-radius: var(--bs-border-radius-lg, 14px);
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(15,23,42,0.04);
          margin-bottom: 18px;
        }

        .db-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 18px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          gap: 12px;
          flex-wrap: wrap;
        }

        .db-panel-title {
          font-family: "Lora", serif;
          font-size: 16px;
          font-weight: 700;
          color: #1a1a2e;
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
          font-weight: 400;
          color: #7a6a5a;
          background: #f5f1eb;
          border: 1px solid #e5ddd3;
          border-radius: var(--bs-border-radius, 7px);
          cursor: pointer;
          transition: background 0.2s;
          white-space: nowrap;
        }
        .db-refresh-btn:hover { background: #ede8e0; }
        .db-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .db-search {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          border: 1px solid #e5ddd3;
          border-radius: 12px;
          padding: 10px 12px;
          min-width: 260px;
        }
        .db-search input { border: none; outline: none; width: 100%; font-size: 13px; }

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

        .db-progress-bar {
          height: 10px;
          border-radius: 999px;
          background: #f0ebe3;
          overflow: hidden;
          border: 1px solid rgba(0,0,0,0.06);
        }
        .db-progress-fill {
          height: 100%;
          width: var(--w, 0%);
          background: linear-gradient(90deg, rgba(201,168,76,0.9), rgba(201,168,76,0.25));
        }

        .db-table { width: 100%; border-collapse: collapse; }
        .db-table th {
          padding: 10px 16px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #9a8a7a;
          background: #faf8f5;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          text-align: left;
          white-space: nowrap;
        }
        .db-table td {
          padding: 13px 16px;
          font-size: 13.5px;
          color: #4a4a5a;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          vertical-align: middle;
        }
        .db-table tbody tr:last-child td { border-bottom: none; }
        .db-table tbody tr:hover { background: #faf8f5; }

        .db-muted { color: #9a8a7a; }
        .db-strong { font-weight: 900; color: #1a1a2e; }

        .db-skeleton {
          height: 14px;
          border-radius: 7px;
          background: linear-gradient(90deg, #f0ebe3 25%, #e8e0d5 50%, #f0ebe3 75%);
          background-size: 200% 100%;
          animation: dbSkeleton 1.4s ease infinite;
        }
        @keyframes dbSkeleton { from { background-position: 200% 0; } to { background-position: -200% 0; } }

        @media (max-width: 991.98px) { .db-main { padding: 18px 14px 0; } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Report" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {pageLoading && <Loader message="Loading classes..." />}

            {/* ===== HERO (AdminDashboard template-aligned) ===== */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Attendance — Reports
                  </div>

                  <h1 className="db-greeting">
                    {getGreeting()}, <em>Staff.</em>
                  </h1>

                  <p className="db-hero-sub">
                    Generate class attendance report by date range and export for printing or sharing.
                  </p>

                  <div className="db-hero-btns">
                    <button className="db-btn-gold" onClick={generateReport} disabled={reportLoading || pageLoading}>
                      {reportLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm" />
                          Generating…
                        </>
                      ) : (
                        <>
                          <i className="bi bi-play-circle" />
                          Generate Report
                        </>
                      )}
                    </button>

                    <button className="db-btn-outline" onClick={downloadCSV} disabled={!reportData.length || reportLoading}>
                      <i className="bi bi-filetype-csv" />
                      CSV
                    </button>

                    <button className="db-btn-outline" onClick={downloadPDF} disabled={!reportData.length || reportLoading}>
                      <i className="bi bi-file-earmark-pdf" />
                      PDF
                    </button>
                  </div>
                </div>

                {/* Right stat card (pinned right like template) */}
                <div className="db-hero-stat-card d-none d-md-block">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c9a84c" }}>
                      Quick glance
                    </span>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M2 10V6M5 10V4M8 10V7M11 10V3" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div className="db-hero-stat-row">
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Class</span>
                      <span className="db-hero-stat-val" style={{ fontSize: 14, fontFamily: "DM Sans" }}>
                        {selectedClassName}
                      </span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Range</span>
                      <span className="db-hero-stat-val" style={{ fontSize: 14, fontFamily: "DM Sans" }}>
                        {fmtDate(startDate)} — {fmtDate(endDate)}
                      </span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Students</span>
                      <span className="db-hero-stat-val">{totals.students}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Status</span>
                      <span className="db-pill" style={{ background: statusPill.bg, color: statusPill.fg }}>
                        {statusPill.text}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== FILTERS ===== */}
            <div className="db-panel">
              <div className="db-panel-head">
                <div>
                  <p className="db-panel-title">Filters</p>
                  <p className="db-panel-sub">Select class and date range, then generate report.</p>
                </div>

                <button className="db-refresh-btn" onClick={generateReport} disabled={reportLoading || pageLoading}>
                  {reportLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <i className="bi bi-play-circle" />
                      Generate
                    </>
                  )}
                </button>
              </div>

              <div style={{ padding: 16 }}>
                <div className="row g-3 align-items-end">
                  <div className="col-12 col-md-4">
                    <label className="form-label fw-semibold small mb-1">Class</label>
                    <select
                      className="form-select"
                      value={classId}
                      onChange={(e) => setClassId(e.target.value)}
                      disabled={pageLoading}
                    >
                      <option value="">Select Class</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-6 col-md-4">
                    <label className="form-label fw-semibold small mb-1">Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      disabled={pageLoading}
                    />
                  </div>

                  <div className="col-6 col-md-4">
                    <label className="form-label fw-semibold small mb-1">End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      disabled={pageLoading}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ===== KPI STRIP (kept bootstrap cards, now template spacing) ===== */}
            <div className="row g-3 mt-1 mb-3">
              {[
                { title: "Students", value: totals.students, icon: "people", toneBg: "#ede9fe", toneFg: "#7c3aed" },
                { title: "Present", value: totals.present, icon: "check2-circle", toneBg: "#d1fae5", toneFg: "#065f46" },
                { title: "Absent", value: totals.absent, icon: "x-circle", toneBg: "#ffe4e6", toneFg: "#be123c" },
                { title: "Late", value: totals.late, icon: "alarm", toneBg: "#dbeafe", toneFg: "#1e40af" },
              ].map((c) => (
                <div className="col-md-6 col-lg-3" key={c.title}>
                  <div className="db-panel" style={{ padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: c.toneBg, color: c.toneFg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className={`bi bi-${c.icon}`} style={{ fontSize: 18 }} />
                      </div>
                      <i className="bi bi-three-dots-vertical" style={{ color: "#c8bfb5" }} />
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <div className="db-muted" style={{ fontSize: 12 }}>{c.title}</div>
                      <div className="db-strong" style={{ fontFamily: "Lora, serif", fontSize: 26, marginTop: 2 }}>
                        {c.value}
                      </div>
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                        <span className="db-muted" style={{ fontSize: 12 }}>
                          <i className="bi bi-info-circle me-1" />
                          Based on selected range
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ===== EXPORT BAR ===== */}
            {reportData.length > 0 && (
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <p className="db-panel-title">Export</p>
                    <p className="db-panel-sub">Download attendance report in CSV or PDF format.</p>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="db-refresh-btn" onClick={downloadCSV} disabled={reportLoading}>
                      <i className="bi bi-filetype-csv" />
                      CSV
                    </button>
                    <button className="db-refresh-btn" onClick={downloadPDF} disabled={reportLoading}>
                      <i className="bi bi-file-earmark-pdf" />
                      PDF
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ===== TABLE ===== */}
            <div className="db-panel">
              <div className="db-panel-head">
                <div>
                  <p className="db-panel-title">Report table</p>
                  <p className="db-panel-sub">P, A, L, E, TP, TA totals included.</p>
                </div>

                <span className="db-pill" style={{ background: "rgba(0,0,0,0.04)", color: "#7a6a5a" }}>
                  {reportData.length ? `${reportData.length} students` : "No data"}
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="db-table">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>#</th>
                      <th>Student</th>
                      <th style={{ textAlign: "center" }}>P</th>
                      <th style={{ textAlign: "center" }}>A</th>
                      <th style={{ textAlign: "center" }}>L</th>
                      <th style={{ textAlign: "center" }}>E</th>
                      <th style={{ textAlign: "center" }}>TP</th>
                      <th style={{ textAlign: "center" }}>TA</th>
                      <th style={{ textAlign: "center" }}>Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {reportLoading ? (
                      <tr>
                        <td colSpan={9} style={{ padding: 40, textAlign: "center" }}>
                          <span className="spinner-border text-primary me-2" />
                          <span className="db-muted">Generating report…</span>
                        </td>
                      </tr>
                    ) : reportData.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: 46, textAlign: "center", color: "#b5a090" }}>
                          <div style={{ fontWeight: 800, color: "#1a1a2e" }}>No report generated</div>
                          <div style={{ fontSize: 12.5, marginTop: 4 }}>Select filters and click “Generate”.</div>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {reportData.map((s, i) => (
                          <tr key={s.id}>
                            <td style={{ color: "#9a8a7a" }}>{i + 1}</td>
                            <td className="db-strong" style={{ fontWeight: 600 }}>{s.name}</td>
                            <td style={{ textAlign: "center" }}>{s.present}</td>
                            <td style={{ textAlign: "center" }}>{s.absent}</td>
                            <td style={{ textAlign: "center" }}>{s.late}</td>
                            <td style={{ textAlign: "center" }}>{s.excused}</td>
                            <td style={{ textAlign: "center" }}>{s.totalTimesPresent}</td>
                            <td style={{ textAlign: "center" }}>{s.totalTimesAbsent}</td>
                            <td style={{ textAlign: "center", fontWeight: 900, color: "#1a1a2e" }}>{s.total}</td>
                          </tr>
                        ))}

                        <tr style={{ background: "#faf8f5" }}>
                          <td />
                          <td className="db-strong">TOTAL</td>
                          <td style={{ textAlign: "center", fontWeight: 800 }}>{totals.present}</td>
                          <td style={{ textAlign: "center", fontWeight: 800 }}>{totals.absent}</td>
                          <td style={{ textAlign: "center", fontWeight: 800 }}>{totals.late}</td>
                          <td style={{ textAlign: "center", fontWeight: 800 }}>{totals.excused}</td>
                          <td style={{ textAlign: "center", fontWeight: 800 }}>{totals.tp}</td>
                          <td style={{ textAlign: "center", fontWeight: 800 }}>{totals.ta}</td>
                          <td style={{ textAlign: "center", fontWeight: 900, color: "#1a1a2e" }}>{totals.total}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
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