// src/pages/Biometrics/BiometricGeneratePage.tsx
import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
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
  reg_no?: string;
  email?: string;
  photo?: string | null;
};

type GeneratedBiometric = {
  id: number;
  biometric_code: string;
  expires_at: string;
  staff: {
    firstname: string;
    surname: string;
    reg_no: string;
    email: string;
  };
};

type BiometricRow = {
  id: number;
  user_id: number;
  biometric_code: string;
  status: string;
  expires_at: string;
  created_at?: string;

  // backend returns with('teacher') in your current API.
  // We map it to "staff" in the UI to keep wording consistent.
  staff?: {
    id: number;
    firstname: string;
    surname: string;
    reg_no: string;
    email: string;
    photo?: string | null;
  };
};

function formatDateTime(dt?: string) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return dt;
  return d.toLocaleString();
}

function maskCode(code?: string) {
  if (!code) return "";
  if (code.length <= 4) return code;
  return `${code.slice(0, 2)}••••••${code.slice(-2)}`;
}

/**
 * Map backend payload to UI shape:
 * - backend currently returns "teacher" key on rows + generated payload.
 * - UI wants "staff" wording everywhere.
 */
function normalizeBiometricRow(row: any): BiometricRow {
  const staff = row?.staff ?? row?.teacher ?? null;
  return {
    ...row,
    staff: staff
      ? {
          id: staff.id,
          firstname: staff.firstname,
          surname: staff.surname,
          reg_no: staff.reg_no,
          email: staff.email,
          photo: staff.photo ?? null,
        }
      : undefined,
  };
}

function normalizeGenerated(payload: any): GeneratedBiometric {
  const staff = payload?.staff ?? payload?.teacher ?? {};
  return {
    id: payload.id,
    biometric_code: payload.biometric_code,
    expires_at: payload.expires_at,
    staff: {
      firstname: staff.firstname,
      surname: staff.surname,
      reg_no: staff.reg_no,
      email: staff.email,
    },
  };
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function pillClass(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "active") return "db-pill db-pill--green";
  if (s === "expired") return "db-pill db-pill--red";
  return "db-pill db-pill--slate";
}

export default function BiometricGeneratePage() {
  // ===== Sidebar State =====
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { showError, showSuccess, showWarning } = useToast();

  // ===== Loading =====
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // ===== Search / Form =====
  const [regNo, setRegNo] = useState("");
  const [staff, setStaff] = useState<Staff | null>(null);

  // ===== Generated Result =====
  const [generated, setGenerated] = useState<GeneratedBiometric | null>(null);

  // ===== List =====
  const [biometrics, setBiometrics] = useState<BiometricRow[]>([]);
  const [q, setQ] = useState("");
  const [revealId, setRevealId] = useState<number | null>(null);

  // ===== QR Modal =====
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrSelected, setQrSelected] = useState<BiometricRow | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return biometrics;
    return biometrics.filter((b) => {
      const name = `${b.staff?.firstname ?? ""} ${b.staff?.surname ?? ""}`.toLowerCase();
      const reg = (b.staff?.reg_no ?? "").toLowerCase();
      const code = (b.biometric_code ?? "").toLowerCase();
      return name.includes(s) || reg.includes(s) || code.includes(s);
    });
  }, [q, biometrics]);

  // ===== Initial load (list all) =====
  const loadAll = async () => {
    try {
      setLoading(true);
      const res = await authApi.get("/biometric-qr/all");
      const rows = Array.isArray(res.data) ? res.data : [];
      setBiometrics(rows.map(normalizeBiometricRow));
    } catch (err: any) {
      console.error(err);
      showError?.(err?.response?.data?.message || "Failed to load biometrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Actions =====
  const findStaff = async () => {
    const value = regNo.trim();
    if (!value) return showWarning?.("Enter staff Reg No");

    try {
      setActionLoading(true);
      setGenerated(null);
      setStaff(null);

      // NOTE: your backend route is /biometric-qr/find-staff (not find-teacher)
      const res = await authApi.post("/biometric-qr/find-staff", { reg_no: value });
      setStaff(res.data);
      showSuccess?.("Staff found");
    } catch (err: any) {
      console.error(err);
      setStaff(null);
      showError?.(err?.response?.data?.message || "Staff not found");
    } finally {
      setActionLoading(false);
    }
  };

  const generateBiometric = async () => {
    const value = regNo.trim();
    if (!value) return showWarning?.("Enter staff Reg No");

    try {
      setActionLoading(true);
      setGenerated(null);

      const res = await authApi.post("/biometric-qr/generate", { reg_no: value });
      setGenerated(normalizeGenerated(res.data));
      showSuccess?.("Biometric generated");
      await loadAll();
    } catch (err: any) {
      console.error(err);
      showError?.(err?.response?.data?.message || "Failed to generate biometric");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteBiometric = async (id: number) => {
    try {
      setActionLoading(true);
      await authApi.delete(`/biometric-qr/${id}`);
      showSuccess?.("Deleted successfully");
      setBiometrics((prev) => prev.filter((x) => x.id !== id));
      if (revealId === id) setRevealId(null);
      if (qrSelected?.id === id) {
        setQrModalOpen(false);
        setQrSelected(null);
      }
    } catch (err: any) {
      console.error(err);
      showError?.(err?.response?.data?.message || "Failed to delete");
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess?.("Copied");
    } catch {
      showError?.("Copy failed");
    }
  };

  // ===== QR Download helper (works for generated + modal) =====
  const downloadQrAsPng = (canvasId: string, filename: string) => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return showError?.("QR not ready yet");

    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = filename;
    a.click();
  };

  const openQrModal = (row: BiometricRow) => {
    setQrSelected(row);
    setQrModalOpen(true);
  };

  // ===== Derived counts =====
  const stats = useMemo(() => {
    const now = Date.now();
    const total = biometrics.length;
    const active = biometrics.filter((b) => {
      const exp = new Date(b.expires_at).getTime();
      const isExpired = Number.isFinite(exp) ? exp < now : false;
      return (b.status || "").toLowerCase() === "active" && !isExpired;
    }).length;
    const expired = biometrics.filter((b) => {
      const exp = new Date(b.expires_at).getTime();
      return Number.isFinite(exp) ? exp < now : false;
    }).length;
    return { total, active, expired };
  }, [biometrics]);

  /* =========================
     TEMPLATE (INLINE CSS)
     - Matches your "same template" used previously
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

    .db-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 16px 0 18px; }
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
    .db-split {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 14px;
    }
    @media (max-width: 991.98px) { .db-split { grid-template-columns: 1fr; } }

    .db-avatar {
      width: 42px;
      height: 42px;
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

    /* Modal */
    .db-modalBack {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.45);
      backdrop-filter: blur(6px);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .db-modal {
      width: 100%;
      max-width: 620px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 18px 50px rgba(0,0,0,0.25);
      overflow: hidden;
      border: 1px solid rgba(0,0,0,0.06);
    }
    .db-modalHead {
      padding: 14px 18px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid rgba(0,0,0,0.06);
      background: #faf8f5;
    }
    .db-x {
      border: none;
      background: transparent;
      cursor: pointer;
      color: #6b7280;
      font-size: 18px;
      line-height: 1;
    }
  `;

  return (
    <>
      <style>{templateCss}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Qrcode" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {(loading || actionLoading) && (
              <Loader message={loading ? "Loading biometrics..." : "Processing..."} />
            )}

            {/* HERO (same template) */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Biometrics • QR Issuance
                  </div>

                  <h1 className="db-greeting">
                    {getGreeting()}, <em>Admin.</em>
                  </h1>

                  <p className="db-hero-sub">
                    Generate a biometric code + scannable QR for staff, copy it instantly, download the QR, and manage
                    all issued codes in one place.
                  </p>

                  <div className="db-hero-btns">
                    <button className="db-btn-gold" onClick={generateBiometric} disabled={actionLoading}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M2.5 8a5.5 5.5 0 1011 0 5.5 5.5 0 10-11 0Z"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        />
                        <path d="M8 5v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M5 8h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                      Generate QR
                    </button>

                    <button className="db-btn-outline" onClick={loadAll} disabled={loading || actionLoading}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M13.5 8A5.5 5.5 0 112.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M13.5 4v4h-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                      Refresh list
                    </button>
                  </div>
                </div>

                <div className="db-hero-stat-card d-none d-md-block">
                  <div className="db-hero-stat-row">
                    <div className="db-rowline">
                      <span className="db-hero-stat-label">Total issued</span>
                      <span className="db-hero-stat-val">{stats.total}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-rowline">
                      <span className="db-hero-stat-label">Active (approx.)</span>
                      <span className="db-hero-stat-val">{stats.active}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-rowline">
                      <span className="db-hero-stat-label">Expired</span>
                      <span className="db-hero-stat-val">{stats.expired}</span>
                    </div>

                    <div className="db-sep" />

                    <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.6 }}>
                      Tip: Codes are <b>masked</b> by default. Use the eye icon to reveal briefly, and download QR for offline use.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MAIN GRID */}
            <div className="db-grid2">
              {/* LEFT: Generate */}
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <p className="db-panel-title">Generate staff biometric code</p>
                    <p className="db-panel-sub">Search staff by Reg No → generate QR</p>
                  </div>

                  <button className="db-refresh-btn" onClick={findStaff} disabled={actionLoading}>
                    Find staff
                  </button>
                </div>

                <div className="db-card-body">
                  {/* Reg input */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                    <input
                      className="db-input"
                      placeholder="Enter staff Reg No (e.g. STF-00123)"
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void findStaff();
                      }}
                      disabled={actionLoading}
                    />

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button className="db-refresh-btn" onClick={findStaff} disabled={actionLoading}>
                        <i className="bi bi-search" /> Find
                      </button>

                      <button className="db-btn-gold" onClick={generateBiometric} disabled={actionLoading}>
                        <i className="bi bi-fingerprint" /> Generate
                      </button>

                      <button
                        className="db-refresh-btn"
                        onClick={() => {
                          setRegNo("");
                          setStaff(null);
                          setGenerated(null);
                          showWarning?.("Cleared.");
                        }}
                        disabled={actionLoading}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Staff preview */}
                  <div className="db-sep" />

                  <div className="db-card" style={{ borderRadius: 14 }}>
                    <div className="db-card-body">
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div className="db-avatar">
                          {staff?.photo ? (
                            <img src={staff.photo} alt="staff" />
                          ) : (
                            <i className="bi bi-person-fill" style={{ color: "#64748b" }} />
                          )}
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="db-strong" style={{ fontSize: 14 }}>
                            {staff ? `${staff.firstname ?? ""} ${staff.surname ?? ""}`.trim() || "—" : "—"}
                          </div>
                          <div className="db-muted" style={{ fontSize: 12 }}>
                            Reg No: <b>{staff?.reg_no ?? "—"}</b>
                          </div>
                          <div className="db-muted" style={{ fontSize: 12 }}>
                            {staff?.email ?? "—"}
                          </div>
                        </div>

                        {staff ? <span className="db-pill db-pill--green">FOUND</span> : <span className="db-pill db-pill--slate">NOT LOADED</span>}
                      </div>
                    </div>
                  </div>

                  {/* Generated block */}
                  {generated && (
                    <>
                      <div className="db-sep" />

                      <div className="db-card">
                        <div className="db-card-body">
                          <div className="db-rowline">
                            <div>
                              <div className="db-strong" style={{ fontSize: 14 }}>Generated successfully</div>
                              <div className="db-muted" style={{ fontSize: 12 }}>
                                Expires: <b>{formatDateTime(generated.expires_at)}</b>
                              </div>
                            </div>
                            <span className="db-pill db-pill--violet">READY</span>
                          </div>

                          <div style={{ height: 10 }} />

                          <div className="db-codeBox">
                            <span style={{ fontWeight: 900 }}>{generated.biometric_code}</span>
                            <button className="db-miniBtn" onClick={() => copyToClipboard(generated.biometric_code)} disabled={actionLoading}>
                              <i className="bi bi-clipboard" /> Copy
                            </button>
                          </div>

                          <div style={{ height: 12 }} />

                          <div className="db-card" style={{ borderRadius: 14 }}>
                            <div className="db-card-body">
                              <div className="db-rowline" style={{ alignItems: "flex-start" }}>
                                <div>
                                  <div className="db-strong" style={{ fontSize: 13 }}>
                                    QR Code (scan)
                                  </div>
                                  <div className="db-muted" style={{ fontSize: 12 }}>
                                    Staff:{" "}
                                    <b>
                                      {generated.staff.firstname} {generated.staff.surname}
                                    </b>{" "}
                                    • Reg: <b>{generated.staff.reg_no}</b>
                                  </div>
                                </div>
                                <span className="db-pill db-pill--gold">SECURE</span>
                              </div>

                              <div style={{ height: 12 }} />

                              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                                <div
                                  style={{
                                    padding: 10,
                                    borderRadius: 14,
                                    border: "1px dashed rgba(0,0,0,0.14)",
                                    background: "#fff",
                                  }}
                                >
                                  <QRCodeCanvas id="generated-qr" value={generated.biometric_code} size={170} includeMargin level="H" />
                                </div>

                                <div style={{ flex: 1, minWidth: 220 }}>
                                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                    <button
                                      className="db-refresh-btn"
                                      onClick={() =>
                                        downloadQrAsPng("generated-qr", `biometric-qr-${generated.staff.reg_no}.png`)
                                      }
                                    >
                                      <i className="bi bi-download" /> Download QR
                                    </button>

                                    <button
                                      className="db-refresh-btn"
                                      onClick={() =>
                                        copyToClipboard(
                                          `Name: ${generated.staff.firstname} ${generated.staff.surname}\nReg No: ${generated.staff.reg_no}\nCode: ${generated.biometric_code}\nExpires: ${generated.expires_at}`
                                        )
                                      }
                                    >
                                      <i className="bi bi-share" /> Copy details
                                    </button>
                                  </div>

                                  <div style={{ marginTop: 10, fontSize: 12, color: "#9a8a7a", lineHeight: 1.6 }}>
                                    Scanner should submit: <b>POST /biometric-validate</b> with{" "}
                                    <code style={{ background: "#faf8f5", padding: "1px 6px", borderRadius: 8, border: "1px solid #ede8e0" }}>
                                      biometric_code
                                    </code>
                                    .
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div style={{ height: 12 }} />

                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button
                              className="db-refresh-btn"
                              onClick={() => {
                                setGenerated(null);
                                setStaff(null);
                                setRegNo("");
                                showSuccess?.("Ready for next staff.");
                              }}
                              disabled={actionLoading}
                            >
                              <i className="bi bi-arrow-repeat" /> New
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* RIGHT: List */}
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <p className="db-panel-title">Issued biometrics</p>
                    <p className="db-panel-sub">Search, reveal, copy, view QR, or delete</p>
                  </div>

                  <button className="db-refresh-btn" onClick={loadAll} disabled={loading || actionLoading}>
                    <i className="bi bi-arrow-clockwise" /> Refresh
                  </button>
                </div>

                <div className="db-card-body">
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
                    <input
                      className="db-input"
                      style={{ flex: 1, minWidth: 240 }}
                      placeholder="Search name, reg no, code..."
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                    <span className="db-pill db-pill--slate">{filtered.length} shown</span>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table className="db-table">
                      <thead>
                        <tr>
                          <th>Staff</th>
                          <th>Reg No</th>
                          <th>Code</th>
                          <th>Expires</th>
                          <th>Status</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filtered.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: 18, textAlign: "center", color: "#9a8a7a" }}>
                              No biometric records found.
                            </td>
                          </tr>
                        ) : (
                          filtered.map((b) => {
                            const isRevealed = revealId === b.id;

                            const fullName = `${b.staff?.firstname ?? ""} ${b.staff?.surname ?? ""}`.trim();
                            const expMs = new Date(b.expires_at).getTime();
                            const isExpired = Number.isFinite(expMs) ? expMs < Date.now() : false;

                            const normalizedStatus =
                              (b.status || "").toLowerCase() === "active" && !isExpired
                                ? "active"
                                : isExpired
                                ? "expired"
                                : (b.status || "unknown").toLowerCase();

                            return (
                              <tr key={b.id}>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div className="db-avatar" style={{ width: 34, height: 34 }}>
                                      {b.staff?.photo ? (
                                        <img src={b.staff.photo} alt="staff" />
                                      ) : (
                                        <i className="bi bi-person-fill" style={{ color: "#64748b" }} />
                                      )}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ fontWeight: 900, color: "#1a1a2e" }}>{fullName || "—"}</div>
                                      <div style={{ fontSize: 12, color: "#9a8a7a" }}>{b.staff?.email || "—"}</div>
                                    </div>
                                  </div>
                                </td>

                                <td style={{ color: "#6b7280" }}>{b.staff?.reg_no || "-"}</td>

                                <td>
                                  <div
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 8,
                                      padding: "8px 10px",
                                      borderRadius: 12,
                                      background: "#0b1220",
                                      color: "#fff",
                                      border: "1px solid rgba(255,255,255,0.08)",
                                      fontFamily:
                                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                      letterSpacing: "0.08em",
                                      fontSize: 12.5,
                                    }}
                                  >
                                    <span style={{ fontWeight: 900 }}>
                                      {isRevealed ? b.biometric_code : maskCode(b.biometric_code)}
                                    </span>

                                    <button
                                      className="db-miniBtn"
                                      style={{ padding: "6px 8px" }}
                                      onClick={() => setRevealId(isRevealed ? null : b.id)}
                                      title={isRevealed ? "Hide code" : "Reveal code"}
                                      disabled={actionLoading}
                                    >
                                      <i className={`bi ${isRevealed ? "bi-eye-slash" : "bi-eye"}`} />
                                    </button>

                                    <button
                                      className="db-miniBtn"
                                      style={{ padding: "6px 8px" }}
                                      onClick={() => copyToClipboard(b.biometric_code)}
                                      title="Copy code"
                                      disabled={actionLoading}
                                    >
                                      <i className="bi bi-clipboard" />
                                    </button>
                                  </div>
                                </td>

                                <td style={{ color: "#6b7280" }}>{formatDateTime(b.expires_at)}</td>

                                <td>
                                  <span className={pillClass(normalizedStatus)}>
                                    {normalizedStatus.toUpperCase()}
                                  </span>
                                </td>

                                <td style={{ textAlign: "right" }}>
                                  <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                    <button
                                      className="db-refresh-btn"
                                      onClick={() => openQrModal(b)}
                                      disabled={actionLoading}
                                    >
                                      <i className="bi bi-qr-code-scan" /> QR
                                    </button>

                                    <button
                                      className="db-refresh-btn"
                                      onClick={() =>
                                        copyToClipboard(
                                          `Name: ${fullName}\nReg No: ${b.staff?.reg_no ?? "-"}\nCode: ${b.biometric_code}\nExpires: ${b.expires_at}`
                                        )
                                      }
                                      disabled={actionLoading}
                                    >
                                      <i className="bi bi-share" /> Share
                                    </button>

                                    <button
                                      className="db-refresh-btn"
                                      onClick={() => deleteBiometric(b.id)}
                                      disabled={actionLoading}
                                      style={{ color: "#b91c1c", borderColor: "rgba(185,28,28,0.25)" }}
                                    >
                                      <i className="bi bi-trash" /> Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="db-foot">
                  <div>
                    Showing <b>{filtered.length}</b> of <b>{biometrics.length}</b> issued codes
                  </div>
                  <div>Tip: Keep codes masked. Reveal only when needed.</div>
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <Footer />
            </div>

            {/* QR MODAL */}
            {qrModalOpen && qrSelected && (
              <div
                className="db-modalBack"
                onClick={() => {
                  setQrModalOpen(false);
                  setQrSelected(null);
                }}
              >
                <div className="db-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="db-modalHead">
                    <div>
                      <div className="db-strong" style={{ fontSize: 14 }}>Staff QR Code</div>
                      <div className="db-muted" style={{ fontSize: 12 }}>
                        Scan → submit to <b>POST /biometric-validate</b>
                      </div>
                    </div>
                    <button
                      className="db-x"
                      aria-label="Close"
                      onClick={() => {
                        setQrModalOpen(false);
                        setQrSelected(null);
                      }}
                    >
                      ×
                    </button>
                  </div>

                  <div className="db-card-body">
                    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                      <div className="db-avatar" style={{ width: 46, height: 46 }}>
                        {qrSelected.staff?.photo ? (
                          <img src={qrSelected.staff.photo} alt="staff" />
                        ) : (
                          <i className="bi bi-person-fill" style={{ color: "#64748b" }} />
                        )}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="db-strong" style={{ fontSize: 14 }}>
                          {`${qrSelected.staff?.firstname ?? ""} ${qrSelected.staff?.surname ?? ""}`.trim() || "—"}
                        </div>
                        <div className="db-muted" style={{ fontSize: 12 }}>
                          Reg No: <b>{qrSelected.staff?.reg_no ?? "-"}</b> • Expires: <b>{formatDateTime(qrSelected.expires_at)}</b>
                        </div>
                      </div>

                      <span className="db-pill db-pill--violet">QR READY</span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        padding: 14,
                        borderRadius: 16,
                        border: "1px solid rgba(0,0,0,0.08)",
                        background: "#fff",
                      }}
                    >
                      <QRCodeCanvas
                        id={`qr-modal-${qrSelected.id}`}
                        value={qrSelected.biometric_code}
                        size={270}
                        includeMargin
                        level="H"
                      />
                    </div>

                    <div style={{ height: 12 }} />

                    <div className="db-codeBox">
                      <span style={{ fontWeight: 900 }}>{qrSelected.biometric_code}</span>
                      <button className="db-miniBtn" onClick={() => copyToClipboard(qrSelected.biometric_code)}>
                        <i className="bi bi-clipboard" /> Copy
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end", marginTop: 12 }}>
                      <button
                        className="db-refresh-btn"
                        onClick={() =>
                          downloadQrAsPng(
                            `qr-modal-${qrSelected.id}`,
                            `biometric-qr-${qrSelected.staff?.reg_no ?? qrSelected.id}.png`
                          )
                        }
                      >
                        <i className="bi bi-download" /> Download QR
                      </button>

                      <button
                        className="db-refresh-btn"
                        onClick={() => {
                          setQrModalOpen(false);
                          setQrSelected(null);
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

/**
 * Dependency:
 *   npm i qrcode.react
 *
 * Routes used:
 * - GET    /biometric-qr/all
 * - POST   /biometric-qr/find-staff   { reg_no }
 * - POST   /biometric-qr/generate     { reg_no }
 * - DELETE /biometric-qr/{id}
 *
 * Scanner flow:
 * - POST /biometric-validate  { biometric_code: "<scanned_value>" }
 *
 * Notes:
 * - Backend returns "teacher" on some payloads; UI normalizes to "staff".
 */