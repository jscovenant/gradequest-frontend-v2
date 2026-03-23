import { useEffect, useMemo, useState } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";
import { whatsappApi } from "../../../api/whatsappApi";
import type {
  SchoolWhatsappAccount,
  CreditSummary,
  ConnectAccountPayload,
} from "../../../api/whatsappApi";
import { useToast } from "../../../contexts/ToastContext";

// ─── Status helpers ────────────────────────────────────────────────────────────

function getStatusConfig(status?: string | null) {
  switch (status) {
    case "active":
      return {
        label: "Active",
        color: "rgb(21,128,61)",
        bg: "rgba(34,197,94,0.10)",
        border: "rgba(34,197,94,0.18)",
        dot: "#22c55e",
      };
    case "pending":
      return {
        label: "Pending",
        color: "rgb(146,64,14)",
        bg: "rgba(245,158,11,0.10)",
        border: "rgba(245,158,11,0.20)",
        dot: "#f59e0b",
      };
    case "suspended":
      return {
        label: "Suspended",
        color: "rgb(185,28,28)",
        bg: "rgba(239,68,68,0.10)",
        border: "rgba(239,68,68,0.20)",
        dot: "#ef4444",
      };
    case "disconnected":
      return {
        label: "Disconnected",
        color: "rgb(29,78,216)",
        bg: "rgba(59,130,246,0.10)",
        border: "rgba(59,130,246,0.20)",
        dot: "#3b82f6",
      };
    default:
      return {
        label: "Not connected",
        color: "#7a6a5a",
        bg: "rgba(0,0,0,0.04)",
        border: "rgba(0,0,0,0.08)",
        dot: "#9a8a7a",
      };
  }
}

function formatCycle(start?: string | null, end?: string | null) {
  if (!start && !end) return "No active cycle";
  return `${start || "–"} to ${end || "–"}`;
}

// ─── Local form state ──────────────────────────────────────────────────────────
// Mirrors ConnectAccountPayload but intentionally excludes access_token —
// the token is resolved server-side from environment variables only.

interface FormState {
  phone_number_id:      string;
  display_phone_number: string;
  verified_name:        string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function SchoolWhatsappSettingsPage() {
  const { showToast } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [verifying,   setVerifying]   = useState(false);

  const [account, setAccount] = useState<SchoolWhatsappAccount | null>(null);
  const [credits, setCredits] = useState<CreditSummary | null>(null);

  const [form, setForm] = useState<FormState>({
    phone_number_id:      "",
    display_phone_number: "",
    verified_name:        "",
  });

  const [adminPhone,     setAdminPhone]     = useState("");
  const [verificationId, setVerificationId] = useState<number | null>(null);
  const [otpCode,        setOtpCode]        = useState("");

  // ── Derived credit values ──────────────────────────────────────────────────
  const statusCfg    = useMemo(() => getStatusConfig(account?.status), [account?.status]);
  const allocated    = credits?.allocated_credits ?? 0;
  const used         = credits?.used_credits      ?? 0;
  const remaining    = credits?.remaining_credits ?? 0;
  const usagePct     = allocated > 0 ? Math.min(100, Math.round((used      / allocated) * 100)) : 0;
  const remainingPct = allocated > 0 ? Math.min(100, Math.round((remaining / allocated) * 100)) : 0;

  // ── Data loading ───────────────────────────────────────────────────────────
  async function loadData() {
    try {
      setLoading(true);
      const [accountRes, creditsRes] = await Promise.all([
        whatsappApi.getAccount(),
        whatsappApi.getCredits().catch(() => null),
      ]);

      setAccount(accountRes);
      setCredits(creditsRes);

      if (accountRes) {
        setForm({
          phone_number_id:      accountRes.phone_number_id      || "",
          display_phone_number: accountRes.display_phone_number || "",
          verified_name:        accountRes.verified_name        || "",
        });
      }
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "Failed to load WhatsApp settings",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  // ── Save ───────────────────────────────────────────────────────────────────
  // Builds a ConnectAccountPayload typed object.
  // access_token is deliberately omitted (it is optional in the type) so the
  // server always falls back to the environment variable token — never the frontend.
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);

      const payload: ConnectAccountPayload = {
        phone_number_id:      form.phone_number_id,
        display_phone_number: form.display_phone_number || undefined,
        verified_name:        form.verified_name        || undefined,
        // access_token intentionally omitted — resolved server-side from .env
      };

      await whatsappApi.connectAccount(payload);
      showToast("WhatsApp account saved successfully", "success");
      await loadData();
    } catch (error: any) {
      showToast(error?.response?.data?.message || "Failed to save account", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── OTP ────────────────────────────────────────────────────────────────────
  async function handleStartVerification() {
    try {
      setVerifying(true);
      const res = await whatsappApi.startAdminVerification(adminPhone);
      setVerificationId(res.verification_id);
      showToast(res.message, "success");
    } catch (error: any) {
      showToast(error?.response?.data?.message || "Failed to start verification", "error");
    } finally {
      setVerifying(false);
    }
  }

  async function handleVerifyCode() {
    if (!verificationId) return;
    try {
      setVerifying(true);
      const res = await whatsappApi.verifyCode({
        verification_id: verificationId,
        code: otpCode,
      });
      showToast(res.message, "success");
    } catch (error: any) {
      showToast(error?.response?.data?.message || "Failed to verify code", "error");
    } finally {
      setVerifying(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;700&display=swap');

        :root {
          --db-light:         var(--bs-light,         #fcf8f8);
          --db-dark:          var(--bs-dark,           #050008);
          --db-accent:        var(--bs-secondary,      rgb(255,200,87));
          --db-magenta:       var(--bs-primary,        rgb(211,0,176));
          --db-success:       var(--bs-success,        rgb(34,197,94));
          --db-danger:        var(--bs-danger,         rgb(239,68,68));
          --db-info:          var(--bs-info,           rgb(59,130,246));
          --db-warning:       var(--bs-warning,        rgb(245,158,11));
          --db-border:        var(--bs-border-color,   #ede8e0);
          --db-radius:        var(--bs-border-radius-lg, 14px);
          --db-accent-dim:    rgba(255,200,87,0.10);
          --db-accent-border: rgba(255,200,87,0.22);
          --db-magenta-dim:   rgba(211,0,176,0.08);
          --wa-green:         #25D366;
        }

        .wa-main {
          background: var(--db-light);
          min-height: 100vh;
          font-family: 'DM Sans', sans-serif;
          padding: 28px 28px 0;
        }

        /* Hero */
        .wa-hero {
          background: var(--db-dark); border-radius: var(--db-radius);
          padding: 32px 36px; position: relative; overflow: hidden; margin-bottom: 24px;
        }
        .wa-hero::before {
          content: ''; position: absolute; inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px);
          background-size: 24px 24px; pointer-events: none;
        }
        .wa-hero-glow {
          position: absolute; top: -60px; right: -60px;
          width: 320px; height: 320px; border-radius: 50%;
          background: radial-gradient(circle, rgba(37,211,102,0.14) 0%, transparent 65%);
          pointer-events: none;
        }
        .wa-hero-glow2 {
          position: absolute; bottom: -40px; left: 28%;
          width: 220px; height: 220px; border-radius: 50%;
          background: radial-gradient(circle, rgba(211,0,176,0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .wa-hero-inner {
          position: relative; z-index: 1; display: flex; align-items: center;
          justify-content: space-between; gap: 28px; flex-wrap: wrap;
        }
        .wa-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase;
          color: #86efac; background: rgba(34,197,94,0.10);
          border: 1px solid rgba(34,197,94,0.18); border-radius: 999px;
          padding: 5px 12px; margin-bottom: 14px;
        }
        .wa-eyebrow-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #22c55e; animation: waPulse 2s ease infinite;
        }
        @keyframes waPulse {
          0%,100%{ opacity:1; transform:scale(1) }
          50%    { opacity:.4; transform:scale(1.5) }
        }
        .wa-greeting {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(24px,2.7vw,34px); font-weight: 900;
          color: #fff; line-height: 1.08; margin: 0 0 10px;
        }
        .wa-greeting em { font-style: italic; color: var(--wa-green); }
        .wa-sub {
          font-size: 13.5px; font-weight: 300; color: rgba(255,255,255,0.40);
          line-height: 1.7; max-width: 520px; margin: 0 0 22px;
        }
        .wa-actions { display: flex; flex-wrap: wrap; gap: 10px; }

        /* Buttons */
        .wa-btn-primary,.wa-btn-secondary,.wa-btn-outline,.wa-btn-success {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          border-radius: 12px; padding: 10px 18px; font-size: 13px; font-weight: 500;
          cursor: pointer; border: none;
          transition: transform .2s, background .2s, border-color .2s, color .2s, box-shadow .2s;
          text-decoration: none; white-space: nowrap;
        }
        .wa-btn-primary   { color: var(--db-dark); background: var(--db-accent); }
        .wa-btn-primary:hover   { background: #ffe0a0; transform: translateY(-1px); }
        .wa-btn-secondary { color: #fff; background: var(--wa-green); }
        .wa-btn-secondary:hover { background: #20bd5b; transform: translateY(-1px); }
        .wa-btn-outline {
          color: rgba(255,255,255,0.76); background: transparent;
          border: 1px solid rgba(255,255,255,0.14);
        }
        .wa-btn-outline:hover {
          background: rgba(255,255,255,0.06); color: #fff;
          border-color: rgba(255,255,255,0.24);
        }
        .wa-btn-success { color: #fff; background: var(--db-success); }
        .wa-btn-success:hover { background: #16a34a; transform: translateY(-1px); }
        .wa-btn-primary:disabled,.wa-btn-secondary:disabled,
        .wa-btn-outline:disabled,.wa-btn-success:disabled {
          opacity: .6; cursor: not-allowed; transform: none;
        }

        /* Hero quick-glance card */
        .wa-hero-card {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
          backdrop-filter: blur(8px); border-radius: var(--db-radius);
          padding: 22px 24px; min-width: 260px; max-width: 320px;
        }
        .wa-hero-card-head {
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; margin-bottom: 14px;
        }
        .wa-hero-card-title {
          font-size: 11px; font-weight: 500; letter-spacing: .12em;
          text-transform: uppercase; color: #86efac; margin: 0;
        }
        .wa-hero-list { display: flex; flex-direction: column; gap: 12px; }
        .wa-hero-row  { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .wa-hero-label { font-size: 12px; font-weight: 300; color: rgba(255,255,255,0.34); }
        .wa-hero-value {
          font-family: 'Playfair Display', serif;
          font-size: 17px; font-weight: 700; color: var(--db-accent);
        }
        .wa-hero-sep { height: 1px; background: rgba(255,255,255,0.06); }

        /* Stats */
        .wa-stats {
          display: grid; grid-template-columns: repeat(4,1fr);
          gap: 16px; margin-bottom: 24px;
        }
        @media(max-width:1199.98px){ .wa-stats{ grid-template-columns:repeat(2,1fr); } }
        @media(max-width:575.98px) { .wa-stats{ grid-template-columns:1fr; } }

        .wa-stat {
          background: #fff; border: 1px solid var(--db-border);
          border-radius: var(--db-radius); padding: 22px 20px;
          position: relative; overflow: hidden;
          transition: box-shadow .25s, transform .25s;
          animation: waFadeUp .45s ease both;
        }
        .wa-stat:hover { box-shadow: 0 10px 28px rgba(0,0,0,0.08); transform: translateY(-3px); }
        .wa-stat::before {
          content: ''; position: absolute; inset: 0 auto auto 0;
          width: 100%; height: 3px; background: var(--wa-stat-color);
          transform: scaleX(0); transform-origin: left; transition: transform .3s ease;
        }
        .wa-stat:hover::before { transform: scaleX(1); }
        @keyframes waFadeUp {
          from{ opacity:0; transform:translateY(14px) }
          to  { opacity:1; transform:translateY(0) }
        }
        .wa-stat-head {
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 12px; margin-bottom: 16px;
        }
        .wa-stat-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: var(--wa-stat-bg); color: var(--wa-stat-color);
          display: flex; align-items: center; justify-content: center;
          transition: transform .25s cubic-bezier(.34,1.56,.64,1);
        }
        .wa-stat:hover .wa-stat-icon { transform: scale(1.08) rotate(-4deg); }
        .wa-stat-label { font-size: 12px; color: #9a8a7a; margin: 0 0 5px; }
        .wa-stat-value {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 30px; line-height: 1; color: var(--db-dark); margin: 0; font-weight: 700;
        }
        .wa-stat-foot {
          display: flex; align-items: center; gap: 6px;
          margin-top: 14px; padding-top: 12px;
          border-top: 1px solid rgba(0,0,0,0.06);
          font-size: 12px; color: #9a8a7a;
        }

        /* Panel grid */
        .wa-grid {
          display: grid;
          grid-template-columns: minmax(0,1.15fr) minmax(320px,.85fr);
          gap: 20px; margin-bottom: 24px;
        }
        @media(max-width:991.98px){ .wa-grid{ grid-template-columns:1fr; } }

        .wa-panel {
          background: #fff; border: 1px solid var(--db-border);
          border-radius: var(--db-radius); overflow: hidden;
        }
        .wa-panel-head {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 20px 22px 16px;
          border-bottom: 1px solid rgba(0,0,0,0.06); flex-wrap: wrap;
        }
        .wa-panel-head-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .wa-panel-icon {
          width: 40px; height: 40px; border-radius: 11px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          background: var(--wa-panel-icon-bg); color: var(--wa-panel-icon-color);
        }
        .wa-panel-title {
          font-family: 'Playfair Display', serif;
          font-size: 16px; font-weight: 700; color: var(--db-dark); margin: 0 0 3px;
        }
        .wa-panel-sub  { font-size: 12px; color: #9a8a7a; margin: 0; }
        .wa-panel-body { padding: 20px 22px 22px; }

        /* Status card */
        .wa-status-card {
          border: 1px solid var(--db-border); border-radius: 14px; padding: 16px;
          background: linear-gradient(180deg,rgba(255,255,255,0.9),rgba(252,248,248,0.95));
        }
        .wa-status-top {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap; margin-bottom: 14px;
        }
        .wa-pill {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 6px 12px; border-radius: 999px;
          font-size: 11.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
          color: var(--wa-pill-color); background: var(--wa-pill-bg);
          border: 1px solid var(--wa-pill-border);
        }
        .wa-pill-dot {
          width: 7px; height: 7px; border-radius: 50%; background: var(--wa-pill-dot);
        }

        /* Key-value pairs */
        .wa-kv { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media(max-width:575.98px){ .wa-kv{ grid-template-columns:1fr; } }
        .wa-kv-item {
          padding: 14px; border-radius: 12px;
          background: #fff; border: 1px solid rgba(0,0,0,0.05);
        }
        .wa-kv-label {
          display: block; font-size: 11px; text-transform: uppercase;
          letter-spacing: .08em; color: #9a8a7a; margin-bottom: 6px;
        }
        .wa-kv-value {
          display: block; font-size: 14px; color: var(--db-dark);
          font-weight: 600; word-break: break-word;
        }

        /* Credit card */
        .wa-credit-card {
          background: #fff; border: 1px solid var(--db-border);
          border-radius: 14px; padding: 16px;
        }
        .wa-progress {
          height: 10px; border-radius: 999px;
          background: rgba(0,0,0,0.06); overflow: hidden;
        }
        .wa-progress-fill {
          height: 100%; border-radius: 999px; transition: width .4s ease;
          background: linear-gradient(90deg,#25D366 0%,#7ee787 100%);
        }
        .wa-credit-meta {
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; margin-top: 8px; font-size: 12px; color: #9a8a7a;
        }
        .wa-credit-grid {
          display: grid; grid-template-columns: repeat(3,1fr);
          gap: 12px; margin-top: 16px;
        }
        @media(max-width:575.98px){ .wa-credit-grid{ grid-template-columns:1fr; } }
        .wa-credit-box {
          background: var(--wa-box-bg); border: 1px solid var(--wa-box-border);
          border-radius: 12px; padding: 14px;
        }
        .wa-credit-box-label {
          font-size: 11px; text-transform: uppercase;
          letter-spacing: .08em; color: #9a8a7a; margin-bottom: 5px;
        }
        .wa-credit-box-value {
          font-family: 'Playfair Display', serif;
          font-size: 24px; line-height: 1; color: var(--db-dark); font-weight: 700;
        }
        .wa-credit-cycle {
          margin-top: 14px; padding-top: 14px;
          border-top: 1px solid rgba(0,0,0,0.06);
          font-size: 12px; color: #7a6a5a;
        }

        /* Form */
        .wa-form-grid {
          display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 16px;
        }
        @media(max-width:767.98px){ .wa-form-grid{ grid-template-columns:1fr; } }
        .wa-field       { display: flex; flex-direction: column; gap: 8px; }
        .wa-field--full { grid-column: 1 / -1; }
        .wa-label       { font-size: 12px; font-weight: 500; color: #7a6a5a; }
        .wa-input,.wa-select {
          width: 100%; min-height: 48px; border-radius: 12px;
          border: 1px solid var(--db-border); background: #fff;
          padding: 12px 14px; font-size: 14px; color: var(--db-dark);
          outline: none;
          transition: border-color .2s, box-shadow .2s, background .2s;
        }
        .wa-input:focus,.wa-select:focus {
          border-color: rgba(37,211,102,0.38);
          box-shadow: 0 0 0 4px rgba(37,211,102,0.10);
        }
        .wa-help { font-size: 11.5px; color: #9a8a7a; line-height: 1.55; margin: 0; }

        /* Security info banner */
        .wa-info-banner {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 14px 16px; background: rgba(37,211,102,0.06);
          border: 1px solid rgba(37,211,102,0.18); border-radius: 12px;
          margin-bottom: 20px; font-size: 13px; line-height: 1.6; color: rgb(21,128,61);
        }
        .wa-info-banner svg { flex-shrink: 0; margin-top: 2px; }

        .wa-form-actions {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap;
          margin-top: 18px; padding-top: 16px;
          border-top: 1px solid rgba(0,0,0,0.06);
        }
        .wa-form-note { font-size: 12px; color: #9a8a7a; }

        /* OTP */
        .wa-verify-wrap { display: flex; flex-direction: column; gap: 16px; }
        .wa-verify-step {
          border: 1px solid var(--db-border); border-radius: 14px;
          padding: 16px; background: #fff;
        }
        .wa-step-head  { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
        .wa-step-index {
          width: 30px; height: 30px; border-radius: 9px;
          background: rgba(59,130,246,0.10); color: rgb(29,78,216);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; flex-shrink: 0;
        }
        .wa-step-title { font-size: 14px; font-weight: 700; color: var(--db-dark); margin: 0 0 4px; }
        .wa-step-sub   { font-size: 12px; color: #9a8a7a; margin: 0; line-height: 1.6; }
        .wa-otp-row    { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; }
        .wa-otp-row .wa-field { flex: 1 1 220px; }
        .wa-soft-note {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 14px; background: rgba(59,130,246,0.06);
          border: 1px solid rgba(59,130,246,0.14); border-radius: 10px;
          font-size: 12px; line-height: 1.6; color: rgb(29,78,216);
        }

        /* Empty state */
        .wa-empty-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 10px; padding: 36px 16px;
          text-align: center; color: #9a8a7a; font-size: 13px;
        }

        /* Misc */
        .wa-refresh-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; font-size: 12px; color: #7a6a5a;
          background: var(--db-light); border: 1px solid var(--db-border);
          border-radius: 8px; cursor: pointer;
          transition: background .2s, border-color .2s;
        }
        .wa-refresh-btn:hover    { background: #ede8e0; border-color: var(--db-accent-border); }
        .wa-refresh-btn:disabled { opacity: .6; cursor: not-allowed; }
        @keyframes waSpin { to{ transform:rotate(360deg); } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="School WhatsApp Settings" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto wa-main">
            {loading && <Loader message="Loading WhatsApp settings…" />}

            {/* ── Hero ────────────────────────────────────────────────── */}
            <div className="wa-hero">
              <div className="wa-hero-glow"  aria-hidden="true" />
              <div className="wa-hero-glow2" aria-hidden="true" />

              <div className="wa-hero-inner">
                <div>
                  <div className="wa-eyebrow">
                    <span className="wa-eyebrow-dot" />
                    School messaging channel
                  </div>
                  <h1 className="wa-greeting">
                    Manage your <em>WhatsApp</em> connection.
                  </h1>
                  <p className="wa-sub">
                    Register this school's phone number, monitor messaging credits,
                    and verify the administrator number — all from one clean control centre.
                  </p>
                  <div className="wa-actions">
                    <button className="wa-btn-secondary" type="button" onClick={loadData}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                        style={{ animation: loading ? "waSpin .8s linear infinite" : "none" }}>
                        <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Refresh data
                    </button>
                    <button
                      className="wa-btn-outline"
                      type="button"
                      onClick={() =>
                        document.getElementById("wa-connection-form")
                          ?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M8 1v9M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                      Edit connection
                    </button>
                  </div>
                </div>

                {/* Quick-glance card */}
                <div className="wa-hero-card">
                  <div className="wa-hero-card-head">
                    <p className="wa-hero-card-title">Quick glance</p>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 10V6M5 10V4M8 10V7M11 10V3" stroke="rgba(255,255,255,0.34)" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="wa-hero-list">
                    <div className="wa-hero-row">
                      <span className="wa-hero-label">Connection</span>
                      <span className="wa-hero-value">{statusCfg.label}</span>
                    </div>
                    <div className="wa-hero-sep" />
                    <div className="wa-hero-row">
                      <span className="wa-hero-label">Remaining credits</span>
                      <span className="wa-hero-value">{remaining}</span>
                    </div>
                    <div className="wa-hero-sep" />
                    <div className="wa-hero-row">
                      <span className="wa-hero-label">Admin verification</span>
                      <span className="wa-hero-value">
                        {verificationId ? "In progress" : "Not started"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Stats ───────────────────────────────────────────────── */}
            <div className="wa-stats">
              <div className="wa-stat"
                style={{ "--wa-stat-color":"#25D366","--wa-stat-bg":"rgba(37,211,102,0.10)" } as React.CSSProperties}>
                <div className="wa-stat-head">
                  <div className="wa-stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M16.5 13.5l-1.8 1.8a1.5 1.5 0 01-1.58.34c-2.18-.73-4.01-2.56-4.74-4.74a1.5 1.5 0 01.34-1.58l1.8-1.8a1.5 1.5 0 000-2.12L8.6 4.56a1.5 1.5 0 00-2.12 0L5.2 5.84c-.8.8-1.12 1.97-.84 3.08 1.2 4.75 4.97 8.52 9.72 9.72 1.11.28 2.28-.04 3.08-.84l1.28-1.28a1.5 1.5 0 000-2.12l-1.92-1.9a1.5 1.5 0 00-2.12 0z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <p className="wa-stat-label">Connection status</p>
                <p className="wa-stat-value">{statusCfg.label}</p>
                <div className="wa-stat-foot">
                  <span style={{ width:8, height:8, borderRadius:"50%", background:statusCfg.dot, display:"inline-block" }} />
                  Latest saved school channel status
                </div>
              </div>

              <div className="wa-stat"
                style={{ "--wa-stat-color":"rgb(59,130,246)","--wa-stat-bg":"rgba(59,130,246,0.10)" } as React.CSSProperties}>
                <div className="wa-stat-head">
                  <div className="wa-stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="6" width="18" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M7 10h5M7 14h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
                <p className="wa-stat-label">Allocated credits</p>
                <p className="wa-stat-value">{allocated}</p>
                <div className="wa-stat-foot">Credits assigned this billing cycle</div>
              </div>

              <div className="wa-stat"
                style={{ "--wa-stat-color":"rgb(245,158,11)","--wa-stat-bg":"rgba(245,158,11,0.10)" } as React.CSSProperties}>
                <div className="wa-stat-head">
                  <div className="wa-stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M12 8v4l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
                <p className="wa-stat-label">Used credits</p>
                <p className="wa-stat-value">{used}</p>
                <div className="wa-stat-foot">{usagePct}% of allocation consumed</div>
              </div>

              <div className="wa-stat"
                style={{ "--wa-stat-color":"var(--bs-primary,rgb(211,0,176))","--wa-stat-bg":"rgba(211,0,176,0.08)" } as React.CSSProperties}>
                <div className="wa-stat-head">
                  <div className="wa-stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M4 18V9M9 18V5M14 18v-7M19 18V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
                <p className="wa-stat-label">Remaining credits</p>
                <p className="wa-stat-value">{remaining}</p>
                <div className="wa-stat-foot">{remainingPct}% still available</div>
              </div>
            </div>

            {/* ── Row 1: Status panel + Credits panel ─────────────────── */}
            <div className="wa-grid">

              {/* Connection status panel */}
              <div className="wa-panel">
                <div className="wa-panel-head">
                  <div className="wa-panel-head-left"
                    style={{ "--wa-panel-icon-bg":"rgba(37,211,102,0.10)","--wa-panel-icon-color":"#25D366" } as React.CSSProperties}>
                    <div className="wa-panel-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M16.5 13.5l-1.8 1.8a1.5 1.5 0 01-1.58.34c-2.18-.73-4.01-2.56-4.74-4.74a1.5 1.5 0 01.34-1.58l1.8-1.8a1.5 1.5 0 000-2.12L8.6 4.56a1.5 1.5 0 00-2.12 0L5.2 5.84c-.8.8-1.12 1.97-.84 3.08 1.2 4.75 4.97 8.52 9.72 9.72 1.11.28 2.28-.04 3.08-.84l1.28-1.28a1.5 1.5 0 000-2.12l-1.92-1.9a1.5 1.5 0 00-2.12 0z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="wa-panel-title">Connection status</h3>
                      <p className="wa-panel-sub">Current school WhatsApp channel details</p>
                    </div>
                  </div>
                  <button className="wa-refresh-btn" type="button" onClick={loadData} disabled={loading}>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none"
                      style={{ animation: loading ? "waSpin .8s linear infinite" : "none" }}>
                      <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {loading ? "Loading…" : "Refresh"}
                  </button>
                </div>

                <div className="wa-panel-body">
                  {account ? (
                    <div className="wa-status-card" style={{
                      "--wa-pill-color":  statusCfg.color,
                      "--wa-pill-bg":     statusCfg.bg,
                      "--wa-pill-border": statusCfg.border,
                      "--wa-pill-dot":    statusCfg.dot,
                    } as React.CSSProperties}>
                      <div className="wa-status-top">
                        <div className="wa-pill">
                          <span className="wa-pill-dot" />
                          {statusCfg.label}
                        </div>
                        <div className="text-end">
                          <div style={{ fontSize:11, textTransform:"uppercase", letterSpacing:".08em", color:"#9a8a7a", marginBottom:4 }}>
                            Verified name
                          </div>
                          <div style={{ fontWeight:700, color:"var(--db-dark)", fontSize:14 }}>
                            {account.verified_name || "–"}
                          </div>
                        </div>
                      </div>
                      <div className="wa-kv">
                        <div className="wa-kv-item">
                          <span className="wa-kv-label">Display number</span>
                          <span className="wa-kv-value">{account.display_phone_number || "–"}</span>
                        </div>
                        <div className="wa-kv-item">
                          <span className="wa-kv-label">Phone Number ID</span>
                          <span className="wa-kv-value">{account.phone_number_id || "–"}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="wa-empty-state">
                      <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
                        <circle cx="16" cy="16" r="14" stroke="#d4c9bd" strokeWidth="1.5"/>
                        <path d="M16 10v7M16 21h.01" stroke="#d4c9bd" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      No WhatsApp account has been connected for this school yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Credits panel */}
              <div className="wa-panel">
                <div className="wa-panel-head">
                  <div className="wa-panel-head-left"
                    style={{ "--wa-panel-icon-bg":"rgba(59,130,246,0.10)","--wa-panel-icon-color":"rgb(59,130,246)" } as React.CSSProperties}>
                    <div className="wa-panel-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="6" width="18" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M7 10h5M7 14h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="wa-panel-title">Subscription credits</h3>
                      <p className="wa-panel-sub">Usage and remaining messaging balance</p>
                    </div>
                  </div>
                </div>
                <div className="wa-panel-body">
                  <div className="wa-credit-card">
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:10 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"var(--db-dark)" }}>Credit consumption</div>
                      <div style={{ fontSize:12, color:"#9a8a7a" }}>{usagePct}% used</div>
                    </div>
                    <div className="wa-progress">
                      <div className="wa-progress-fill" style={{ width:`${usagePct}%` }} />
                    </div>
                    <div className="wa-credit-meta">
                      <span>Used: {used}</span>
                      <span>Remaining: {remaining}</span>
                    </div>
                    <div className="wa-credit-grid">
                      <div className="wa-credit-box"
                        style={{ "--wa-box-bg":"rgba(59,130,246,0.06)","--wa-box-border":"rgba(59,130,246,0.14)" } as React.CSSProperties}>
                        <div className="wa-credit-box-label">Allocated</div>
                        <div className="wa-credit-box-value">{allocated}</div>
                      </div>
                      <div className="wa-credit-box"
                        style={{ "--wa-box-bg":"rgba(245,158,11,0.06)","--wa-box-border":"rgba(245,158,11,0.14)" } as React.CSSProperties}>
                        <div className="wa-credit-box-label">Used</div>
                        <div className="wa-credit-box-value">{used}</div>
                      </div>
                      <div className="wa-credit-box"
                        style={{ "--wa-box-bg":"rgba(34,197,94,0.06)","--wa-box-border":"rgba(34,197,94,0.14)" } as React.CSSProperties}>
                        <div className="wa-credit-box-label">Remaining</div>
                        <div className="wa-credit-box-value">{remaining}</div>
                      </div>
                    </div>
                    <div className="wa-credit-cycle">
                      <strong>Cycle:</strong> {formatCycle(credits?.cycle_start, credits?.cycle_end)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Row 2: Connection form + OTP panel ──────────────────── */}
            <div className="wa-grid">

              {/* Connection form */}
              <div className="wa-panel" id="wa-connection-form">
                <div className="wa-panel-head">
                  <div className="wa-panel-head-left"
                    style={{ "--wa-panel-icon-bg":"rgba(255,200,87,0.10)","--wa-panel-icon-color":"rgb(180,83,9)" } as React.CSSProperties}>
                    <div className="wa-panel-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M12 3H7a2 2 0 00-2 2v14l4-2 4 2 4-2 4 2V9l-6-6h-3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                        <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="wa-panel-title">Register school number</h3>
                      <p className="wa-panel-sub">Phone Number ID from your Meta Business Manager</p>
                    </div>
                  </div>
                </div>

                <div className="wa-panel-body">
                  {/* Security notice */}
                  <div className="wa-info-banner">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path d="M10 2l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      <path d="M7.5 10.5l1.7 1.7 3.3-3.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>
                      WABA credentials and access token are stored securely server-side.
                      Only this school's phone number details are needed here.
                    </span>
                  </div>

                  <form onSubmit={handleSave}>
                    <div className="wa-form-grid">

                      {/* phone_number_id — required */}
                      <div className="wa-field">
                        <label className="wa-label">
                          Phone Number ID{" "}
                          <span style={{ color:"var(--db-danger)" }}>*</span>
                        </label>
                        <input
                          className="wa-input"
                          required
                          value={form.phone_number_id}
                          onChange={(e) =>
                            setForm({ ...form, phone_number_id: e.target.value })
                          }
                          placeholder="e.g. 123456789012345"
                        />
                        <p className="wa-help">
                          Found in Meta Business Manager → WhatsApp → Phone Numbers.
                        </p>
                      </div>

                      {/* display_phone_number — optional */}
                      <div className="wa-field">
                        <label className="wa-label">Display Phone Number</label>
                        <input
                          className="wa-input"
                          value={form.display_phone_number}
                          onChange={(e) =>
                            setForm({ ...form, display_phone_number: e.target.value })
                          }
                          placeholder="e.g. +2348012345678"
                        />
                        <p className="wa-help">
                          The number recipients see on their device.
                        </p>
                      </div>

                      {/* verified_name — optional, full width */}
                      <div className="wa-field wa-field--full">
                        <label className="wa-label">Verified Business Name</label>
                        <input
                          className="wa-input"
                          value={form.verified_name}
                          onChange={(e) =>
                            setForm({ ...form, verified_name: e.target.value })
                          }
                          placeholder="Business display name as approved by Meta"
                        />
                        <p className="wa-help">
                          Displayed in WhatsApp as the sender's business name.
                        </p>
                      </div>

                    </div>

                    <div className="wa-form-actions">
                      <div className="wa-form-note">
                        Ensure the Phone Number ID matches the number registered under your WABA.
                      </div>
                      <button className="wa-btn-primary" disabled={saving} type="submit">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {saving ? "Saving…" : "Save connection"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* OTP / admin verification panel */}
              <div className="wa-panel">
                <div className="wa-panel-head">
                  <div className="wa-panel-head-left"
                    style={{ "--wa-panel-icon-bg":"rgba(211,0,176,0.08)","--wa-panel-icon-color":"var(--bs-primary,rgb(211,0,176))" } as React.CSSProperties}>
                    <div className="wa-panel-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                        <path d="M9.5 12.5l1.7 1.7 3.3-3.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="wa-panel-title">Verify admin WhatsApp</h3>
                      <p className="wa-panel-sub">Confirm an administrator number via OTP</p>
                    </div>
                  </div>
                </div>

                <div className="wa-panel-body">
                  <div className="wa-verify-wrap">

                    {/* Step 1 */}
                    <div className="wa-verify-step">
                      <div className="wa-step-head">
                        <div className="wa-step-index">1</div>
                        <div>
                          <h4 className="wa-step-title">Send OTP to admin number</h4>
                          <p className="wa-step-sub">
                            Enter the administrator's WhatsApp number and trigger a one-time code.
                          </p>
                        </div>
                      </div>
                      <div className="wa-field">
                        <label className="wa-label">Admin WhatsApp number</label>
                        <input
                          className="wa-input"
                          value={adminPhone}
                          onChange={(e) => setAdminPhone(e.target.value)}
                          placeholder="080…, +234…, or international format"
                        />
                      </div>
                      <div style={{ marginTop:14 }}>
                        <button
                          type="button"
                          className="wa-btn-secondary"
                          disabled={verifying || !adminPhone.trim()}
                          onClick={handleStartVerification}
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M2 8h12M8 2l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {verifying ? "Sending…" : "Send OTP"}
                        </button>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="wa-verify-step">
                      <div className="wa-step-head">
                        <div className="wa-step-index" style={{
                          background: verificationId ? "rgba(34,197,94,0.10)" : "rgba(59,130,246,0.10)",
                          color:      verificationId ? "rgb(21,128,61)"        : "rgb(29,78,216)",
                        }}>
                          2
                        </div>
                        <div>
                          <h4 className="wa-step-title">Confirm OTP code</h4>
                          <p className="wa-step-sub">
                            Enter the code sent to the admin number to complete verification.
                          </p>
                        </div>
                      </div>

                      {!verificationId ? (
                        <div className="wa-soft-note">
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3"/>
                            <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                          Send the OTP first before entering a verification code.
                        </div>
                      ) : (
                        <div className="wa-otp-row">
                          <div className="wa-field">
                            <label className="wa-label">OTP code</label>
                            <input
                              className="wa-input"
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value)}
                              placeholder="Enter verification code"
                            />
                          </div>
                          <button
                            type="button"
                            className="wa-btn-success"
                            disabled={verifying || !otpCode.trim()}
                            onClick={handleVerifyCode}
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                              <path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            {verifying ? "Verifying…" : "Verify code"}
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            </div>

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}