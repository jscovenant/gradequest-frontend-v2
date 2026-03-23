// src/pages/Attendance/StaffQrAttendancePage.tsx
import { useMemo, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";

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
type StaffUser = {
  id: number;
  firstname?: string;
  surname?: string;
  email?: string;
  reg_no?: string | null;
  photo?: string | null;
};

type AttendanceRecord = {
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
};

type MarkAttendanceResponse = {
  success: boolean;
  message: string;
  action?: "checkin" | "checkout" | "none" | string;
  already_marked?: boolean;
  attendance?: AttendanceRecord;
  user?: StaffUser;
};

type UiLog = {
  id: number;
  created_at: string;
  biometric_code: string;
  status: "success" | "failed";
  note: string;
  action?: string;
  user?: StaffUser;
};

function formatDateTime(dt?: string | null) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return String(dt);
  return d.toLocaleString();
}

function maskCode(code?: string) {
  if (!code) return "";
  if (code.length <= 4) return code;
  return `${code.slice(0, 2)}••••••${code.slice(-2)}`;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function StaffQrAttendancePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { showError, showSuccess, showWarning } = useToast();

  const [loading, setLoading] = useState(false);

  // scanner
  const [cameraOn, setCameraOn] = useState(true);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  // anti-duplicate
  const [lastScannedCode, setLastScannedCode] = useState("");
  const [lastScanAt, setLastScanAt] = useState<number>(0);

  // manual
  const [manualCode, setManualCode] = useState("");

  // result panel
  const [lastUser, setLastUser] = useState<StaffUser | null>(null);
  const [lastAttendance, setLastAttendance] = useState<AttendanceRecord | null>(null);
  const [lastCode, setLastCode] = useState("");
  const [lastAction, setLastAction] = useState<string>("");
  const [lastMessage, setLastMessage] = useState<string>("");
  const [lastAt, setLastAt] = useState<string>("");

  // ui logs
  const [logs, setLogs] = useState<UiLog[]>([]);
  const [reveal, setReveal] = useState(false);

  const canScan = useMemo(() => cameraOn && !loading, [cameraOn, loading]);

  const toggleFacing = () => setFacingMode((p) => (p === "environment" ? "user" : "environment"));

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess?.("Copied");
    } catch {
      showError?.("Copy failed");
    }
  };

  const badgeForAction = (action?: string) => {
    const a = (action || "").toLowerCase();
    if (a === "checkin") return { bg: "#dcfce7", fg: "#166534", text: "CHECK-IN" };
    if (a === "checkout") return { bg: "#dbeafe", fg: "#1d4ed8", text: "CHECK-OUT" };
    return { bg: "#e2e8f0", fg: "#0f172a", text: (action || "NONE").toUpperCase() };
  };

  const markAttendance = async (biometric_code: string, source: "camera" | "manual") => {
    const code = biometric_code.trim();
    if (!code) return;

    // throttle: ignore same code within 4 seconds
    const now = Date.now();
    if (code === lastScannedCode && now - lastScanAt < 4000) return;

    setLastScannedCode(code);
    setLastScanAt(now);

    try {
      setLoading(true);

      setLastCode(code);
      setLastAt(new Date().toISOString());
      setLastUser(null);
      setLastAttendance(null);
      setLastAction("");
      setLastMessage("");

      const res = await authApi.post<MarkAttendanceResponse>("/staff-attendance/mark", {
        biometric_code: code,
        source,
        mode: "auto",
      });

      const data = res.data;

      if (!data?.success) {
        const msg = data?.message || "Failed to mark attendance";
        showError?.(msg);

        setLastMessage(msg);
        setLastAction(data?.action || "none");

        setLogs((prev) => [
          {
            id: now,
            created_at: new Date().toISOString(),
            biometric_code: code,
            status: "failed",
            note: msg,
            action: data?.action,
            user: data?.user,
          },
          ...prev,
        ]);
        return;
      }

      const msg = data?.message || "Attendance marked";
      showSuccess?.(msg);

      setLastUser(data.user || null);
      setLastAttendance(data.attendance || null);
      setLastAction(String(data.action || ""));
      setLastMessage(msg);

      setLogs((prev) => [
        {
          id: now,
          created_at: new Date().toISOString(),
          biometric_code: code,
          status: "success",
          note: msg,
          action: data?.action,
          user: data?.user,
        },
        ...prev,
      ]);
    } catch (err: any) {
      console.error(err);
      const apiMsg =
        err?.response?.data?.message ||
        (err?.response?.status === 404
          ? "Attendance endpoint not found. Add POST /api/staff-attendance/mark in Laravel."
          : "Failed to mark attendance");

      showError?.(apiMsg);

      setLastMessage(apiMsg);
      setLastAction("none");

      setLogs((prev) => [
        {
          id: now,
          created_at: new Date().toISOString(),
          biometric_code: code,
          status: "failed",
          note: apiMsg,
        },
        ...prev,
      ]);
    } finally {
      setLoading(false);
    }
  };

  const submitManual = async () => {
    const code = manualCode.trim();
    if (!code) return showWarning?.("Enter biometric code");
    await markAttendance(code, "manual");
    setManualCode("");
  };

  /* =========================
     SAME TEMPLATE (INLINE CSS)
     - matches the BiometricGeneratePage template you asked for
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
      max-width: 720px;
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
    .db-pill--red {
      background: rgba(185, 28, 28, 0.08);
      color: #b91c1c;
      border-color: rgba(185, 28, 28, 0.12);
    }
    .db-pill--slate {
      background: rgba(100,116,139,0.10);
      color: #334155;
      border-color: rgba(100,116,139,0.14);
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

    .db-grid2 { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 18px; margin: 16px 0 18px; }
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

    .db-codeBox {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 12px;
      border-radius: 12px;
      background: #0b1220;
      color: #fff;
      border: 1px solid rgba(255,255,255,0.08);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      letter-spacing: 0.08em;
      font-size: 13px;
    }
    .db-miniBtn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.08);
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
    }
    .db-miniBtn:hover { background: rgba(255,255,255,0.14); }
    .db-miniBtn:disabled { opacity: 0.55; cursor: not-allowed; }

    .db-card {
      background: #fff;
      border: 1px solid #ede8e0;
      border-radius: 14px;
      box-shadow: 0 2px 10px rgba(15,23,42,0.04);
      overflow: hidden;
    }
    .db-card-body { padding: 16px 18px; }

    .db-avatar {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: #e2e8f0;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      border: 1px solid rgba(0,0,0,0.06);
    }
    .db-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .db-muted { color: #9a8a7a; }
    .db-strong { font-weight: 900; color: #1a1a2e; }
    .db-rowline { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .db-sep { height: 1px; background: rgba(0,0,0,0.06); margin: 10px 0; }

    .scanWrap {
      position: relative;
      border-radius: 16px;
      border: 1px solid rgba(0,0,0,0.08);
      background: #0b1220;
      overflow: hidden;
      min-height: 360px;
    }
    .scanOverlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .scanFrame {
      width: 230px;
      height: 230px;
      border-radius: 20px;
      border: 2px dashed rgba(255,255,255,0.55);
      box-shadow: 0 0 0 9999px rgba(0,0,0,0.15) inset;
    }
    .scanPaused {
      height: 360px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #fff;
      opacity: 0.9;
      gap: 6px;
    }

    .logItem {
      border: 1px solid rgba(0,0,0,0.06);
      border-radius: 14px;
      background: #fff;
      padding: 12px 14px;
    }
    .logTop { display: flex; justify-content: space-between; gap: 12px; }
    .logBadges { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
    .tag {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      padding: 7px 10px;
      font-weight: 900;
      font-size: 12px;
      white-space: nowrap;
    }
  `;

  // Stats for hero
  const heroStats = useMemo(() => {
    const total = logs.length;
    const success = logs.filter((l) => l.status === "success").length;
    const failed = logs.filter((l) => l.status === "failed").length;
    return { total, success, failed };
  }, [logs]);

  return (
    <>
      <style>{templateCss}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Staff Qr Attendance" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loading && <Loader message="Marking attendance..." />}

            {/* HERO (same template) */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Attendance • Staff QR
                  </div>

                  <h1 className="db-greeting">
                    {getGreeting()}, <em>Admin.</em>
                  </h1>

                  <p className="db-hero-sub">
                    Scan a staff QR code to automatically <b>check-in</b>, then scan again to <b>check-out</b> (auto
                    mode). Manual entry is available if camera permissions fail.
                  </p>

                  <div className="db-hero-btns">
                    <button
                      className="db-btn-gold"
                      onClick={() => setCameraOn(true)}
                      disabled={loading}
                      title="Start camera"
                    >
                      <i className="bi bi-camera-video" />
                      Start scanner
                    </button>

                    <button className="db-btn-outline" onClick={toggleFacing} disabled={loading}>
                      <i className="bi bi-arrow-repeat" />
                      Switch camera
                    </button>

                    <button
                      className="db-btn-outline"
                      onClick={() => {
                        setCameraOn(false);
                        showWarning?.("Scanner paused.");
                      }}
                      disabled={loading}
                    >
                      <i className="bi bi-pause" />
                      Pause
                    </button>
                  </div>
                </div>

                <div className="db-hero-stat-card d-none d-md-block">
                  <div className="db-hero-stat-row">
                    <div className="db-rowline">
                      <span className="db-hero-stat-label">Scans</span>
                      <span className="db-hero-stat-val">{heroStats.total}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-rowline">
                      <span className="db-hero-stat-label">Success</span>
                      <span className="db-hero-stat-val">{heroStats.success}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-rowline">
                      <span className="db-hero-stat-label">Failed</span>
                      <span className="db-hero-stat-val">{heroStats.failed}</span>
                    </div>

                    <div className="db-sep" />
                    <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.6 }}>
                      Auto mode uses a single endpoint: <b>POST /staff-attendance/mark</b>.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CONTENT GRID */}
            <div className="db-grid2">
              {/* LEFT: Scanner + Manual */}
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <p className="db-panel-title">QR Scanner</p>
                    <p className="db-panel-sub">Scan staff QR → auto check-in/out</p>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="db-refresh-btn" onClick={() => setCameraOn((p) => !p)} disabled={loading}>
                      <i className={`bi ${cameraOn ? "bi-pause" : "bi-play"}`} />
                      {cameraOn ? "Pause" : "Start"}
                    </button>

                    <button className="db-refresh-btn" onClick={toggleFacing} disabled={loading}>
                      <i className="bi bi-arrow-repeat" />
                      Switch
                    </button>
                  </div>
                </div>

                <div className="db-card-body">
                  <div className="scanWrap">
                    {cameraOn ? (
                      <Scanner
                        constraints={{ facingMode }}
                        onScan={(result) => {
                          if (!canScan) return;
                          const code = String(result?.[0]?.rawValue || "").trim();
                          if (!code) return;

                          // small pause to reduce multi-fire
                          setCameraOn(false);
                          markAttendance(code, "camera").finally(() => {
                            setTimeout(() => setCameraOn(true), 1400);
                          });
                        }}
                        onError={(err) => {
                          console.error(err);
                          showError?.("Camera error or permission denied.");
                        }}
                        styles={{
                          container: { width: "100%", height: 360 },
                          video: { width: "100%", height: 360, objectFit: "cover" },
                        }}
                      />
                    ) : (
                      <div className="scanPaused">
                        <i className="bi bi-camera-video-off" style={{ fontSize: 34 }} />
                        <div style={{ fontWeight: 900 }}>Scanner paused</div>
                        <div style={{ fontSize: 12, opacity: 0.85 }}>Click “Start” to resume</div>
                      </div>
                    )}

                    <div className="scanOverlay" aria-hidden="true">
                      <div className="scanFrame" />
                    </div>
                  </div>

                  <div className="db-sep" />

                  <div>
                    <div className="db-strong" style={{ fontSize: 14, marginBottom: 6 }}>
                      Manual entry (fallback)
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <input
                        className="db-input"
                        style={{ flex: 1, minWidth: 240 }}
                        placeholder="Paste biometric code here..."
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void submitManual();
                        }}
                        disabled={loading}
                      />

                      <button className="db-btn-gold" onClick={submitManual} disabled={loading}>
                        <i className="bi bi-check2-circle" />
                        Mark
                      </button>
                    </div>

                    <div style={{ marginTop: 8, fontSize: 12, color: "#9a8a7a" }}>
                      If camera permission fails, paste the code and mark attendance.
                    </div>
                  </div>
                </div>

                <div className="db-foot">
                  <div>
                    Mode: <b>{cameraOn ? "Camera" : "Paused"}</b> • Facing: <b>{facingMode}</b>
                  </div>
                  <div>Throttle: same code ignored for 4s</div>
                </div>
              </div>

              {/* RIGHT: Last action + Log */}
              <div style={{ display: "grid", gap: 18 }}>
                {/* Last action */}
                <div className="db-panel">
                  <div className="db-panel-head">
                    <div>
                      <p className="db-panel-title">Last action</p>
                      <p className="db-panel-sub">Staff + check-in/out result</p>
                    </div>

                    <button
                      className="db-refresh-btn"
                      onClick={() => setReveal((p) => !p)}
                      disabled={!lastCode}
                      title="Reveal/Mask code"
                    >
                      <i className={`bi ${reveal ? "bi-eye-slash" : "bi-eye"}`} />
                      {reveal ? "Mask" : "Reveal"}
                    </button>
                  </div>

                  <div className="db-card-body">
                    <div className="db-card">
                      <div className="db-card-body">
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <div className="db-avatar" style={{ width: 54, height: 54 }}>
                            {lastUser?.photo ? (
                              <img src={lastUser.photo} alt="staff" />
                            ) : (
                              <i className="bi bi-person-fill" style={{ color: "#64748b", fontSize: 22 }} />
                            )}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="db-strong" style={{ fontSize: 14 }}>
                              {lastUser ? `${lastUser.firstname ?? ""} ${lastUser.surname ?? ""}`.trim() : "—"}
                            </div>
                            <div className="db-muted" style={{ fontSize: 12 }}>{lastUser?.email || "—"}</div>
                            <div className="db-muted" style={{ fontSize: 12 }}>
                              Reg No: <b>{lastUser?.reg_no || "—"}</b>
                            </div>
                          </div>

                          {lastAction ? (
                            (() => {
                              const b = badgeForAction(lastAction);
                              return <span className="db-pill" style={{ background: b.bg, color: b.fg, borderColor: "transparent" }}>{b.text}</span>;
                            })()
                          ) : (
                            <span className="db-pill db-pill--slate">—</span>
                          )}
                        </div>

                        <div style={{ height: 12 }} />

                        <div className="db-codeBox">
                          <span style={{ fontWeight: 900 }}>{reveal ? lastCode : maskCode(lastCode) || "—"}</span>
                          <button className="db-miniBtn" onClick={() => lastCode && copy(lastCode)} disabled={!lastCode}>
                            <i className="bi bi-clipboard" /> Copy
                          </button>
                        </div>

                        <div style={{ marginTop: 10, fontSize: 12, color: "#9a8a7a" }}>
                          Time: <b>{lastAt ? formatDateTime(lastAt) : "—"}</b>
                        </div>

                        {lastMessage && (
                          <div style={{ marginTop: 8, fontSize: 12.5, color: "#1a1a2e", lineHeight: 1.5 }}>
                            <i className="bi bi-info-circle" style={{ marginRight: 6, color: "#64748b" }} />
                            {lastMessage}
                          </div>
                        )}

                        {lastAttendance && (
                          <>
                            <div className="db-sep" />
                            <div style={{ display: "grid", gap: 8 }}>
                              <div className="db-rowline">
                                <span className="db-muted" style={{ fontSize: 12 }}>Date</span>
                                <span className="db-strong" style={{ fontSize: 12.5 }}>{lastAttendance.att_date}</span>
                              </div>
                              <div className="db-rowline">
                                <span className="db-muted" style={{ fontSize: 12 }}>Check-in</span>
                                <span className="db-strong" style={{ fontSize: 12.5 }}>{formatDateTime(lastAttendance.check_in_at)}</span>
                              </div>
                              <div className="db-rowline">
                                <span className="db-muted" style={{ fontSize: 12 }}>Check-out</span>
                                <span className="db-strong" style={{ fontSize: 12.5 }}>{formatDateTime(lastAttendance.check_out_at)}</span>
                              </div>
                            </div>
                          </>
                        )}

                        <div style={{ height: 12 }} />

                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button
                            className="db-refresh-btn"
                            onClick={() => {
                              setLastUser(null);
                              setLastAttendance(null);
                              setLastCode("");
                              setLastAction("");
                              setLastMessage("");
                              setLastAt("");
                              setReveal(false);
                            }}
                            disabled={loading}
                          >
                            <i className="bi bi-arrow-repeat" />
                            Clear panel
                          </button>

                          <button
                            className="db-refresh-btn"
                            onClick={() => {
                              const name = lastUser ? `${lastUser.firstname ?? ""} ${lastUser.surname ?? ""}`.trim() : "-";
                              const details = [
                                `Name: ${name}`,
                                `Reg No: ${lastUser?.reg_no ?? "-"}`,
                                `Email: ${lastUser?.email ?? "-"}`,
                                `Action: ${lastAction || "-"}`,
                                `Date: ${lastAttendance?.att_date ?? "-"}`,
                                `Check-in: ${lastAttendance?.check_in_at ?? "-"}`,
                                `Check-out: ${lastAttendance?.check_out_at ?? "-"}`,
                                `Message: ${lastMessage || "-"}`,
                                `Code: ${lastCode || "-"}`,
                              ].join("\n");
                              void copy(details);
                            }}
                            disabled={!lastCode}
                          >
                            <i className="bi bi-share" />
                            Copy details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="db-foot">
                    <div>Endpoint: <b>POST /staff-attendance/mark</b></div>
                    <div>Mode: <b>auto</b></div>
                  </div>
                </div>

                {/* Scan log */}
                <div className="db-panel">
                  <div className="db-panel-head">
                    <div>
                      <p className="db-panel-title">Scan log</p>
                      <p className="db-panel-sub">UI log (latest first)</p>
                    </div>

                    <button
                      className="db-refresh-btn"
                      onClick={() => setLogs([])}
                      disabled={logs.length === 0}
                      title="Clear logs"
                    >
                      <i className="bi bi-trash3" />
                      Clear
                    </button>
                  </div>

                  <div className="db-card-body">
                    {logs.length === 0 ? (
                      <div style={{ padding: 18, textAlign: "center", color: "#9a8a7a" }}>
                        No scans yet. Start scanning to see activity here.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 380, overflow: "auto" }}>
                        {logs.map((l) => {
                          const name = l.user ? `${l.user.firstname ?? ""} ${l.user.surname ?? ""}`.trim() : "Unknown staff";
                          const actionBadge = badgeForAction(l.action);

                          const ok = l.status === "success";

                          return (
                            <div key={l.id} className="logItem">
                              <div className="logTop">
                                <div style={{ minWidth: 0 }}>
                                  <div className="db-strong" style={{ fontSize: 13.5 }}>{name}</div>
                                  <div className="db-muted" style={{ fontSize: 12 }}>{formatDateTime(l.created_at)}</div>
                                  <div style={{ marginTop: 6, fontSize: 12.5, color: "#4a4a5a", lineHeight: 1.5 }}>
                                    {l.note}
                                  </div>
                                </div>

                                <div className="logBadges">
                                  <span
                                    className="tag"
                                    style={{
                                      background: ok ? "#dcfce7" : "#fee2e2",
                                      color: ok ? "#166534" : "#991b1b",
                                    }}
                                  >
                                    {ok ? "SUCCESS" : "FAILED"}
                                  </span>

                                  <span
                                    className="tag"
                                    style={{
                                      background: actionBadge.bg,
                                      color: actionBadge.fg,
                                      fontSize: 11,
                                      padding: "6px 10px",
                                    }}
                                  >
                                    {actionBadge.text}
                                  </span>
                                </div>
                              </div>

                              <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                                <div
                                  style={{
                                    fontFamily:
                                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                    fontSize: 12.5,
                                    color: "#0b1220",
                                    letterSpacing: "0.06em",
                                  }}
                                >
                                  {maskCode(l.biometric_code)}
                                </div>

                                <button className="db-refresh-btn" onClick={() => void copy(l.biometric_code)}>
                                  <i className="bi bi-clipboard" />
                                  Copy
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div style={{ marginTop: 12, fontSize: 12, color: "#9a8a7a" }}>
                      Tip: Scan once to check-in. Scan again later to check-out (auto mode).
                    </div>
                  </div>

                  <div className="db-foot">
                    <div>Keep camera steady; align QR within the frame.</div>
                    <div>Manual entry is supported.</div>
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

/**
 * Install:
 *   npm i @yudiel/react-qr-scanner
 *
 * Backend endpoint used (single request flow):
 *   POST /staff-attendance/mark
 *   body: { biometric_code, source, mode: "auto" }
 *
 * Expected response:
 *   { success, message, action, attendance, user }
 */