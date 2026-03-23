// src/pages/Auth/OnboardingPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import {
  activateBonus, createAllTerms, getOnboardingStatus,
  resendEmailCode, setCurrentSession, verifyEmailCode,
  type OnboardingStatus,
} from "../../auth/activationApi";
import PageTitle from "../../components/PageTitle";

type StepKey = "email" | "session" | "terms" | "bonus";

function percentFromStatus(s: OnboardingStatus | null) {
  if (!s) return 0;
  const checks = [s.email_verified, s.current_session, s.all_terms_exist, s.bonus_given];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function nextStepFromStatus(s: OnboardingStatus): StepKey {
  if (!s.email_verified) return "email";
  if (!s.current_session) return "session";
  if (!s.all_terms_exist) return "terms";
  return "bonus";
}

/* ── Step card ── defined outside to avoid remount */
function StepCard({
  number, title, subtitle, done, active, children,
}: {
  number: number; title: string; subtitle: string;
  done: boolean; active: boolean; children?: React.ReactNode;
}) {
  return (
    <div className={`ob-step ${done ? "ob-step--done" : active ? "ob-step--active" : "ob-step--pending"}`}>
      {/* Connector line */}
      <div className="ob-step-connector" aria-hidden="true" />

      <div className="ob-step-row">
        {/* Number badge */}
        <div className="ob-step-badge" aria-hidden="true">
          {done ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7l3.5 3.5 6.5-6" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : number}
        </div>

        {/* Content */}
        <div className="ob-step-content">
          <div className="ob-step-head">
            <div className="ob-step-title-wrap">
              <span className="ob-step-title">{title}</span>
              {done && <span className="ob-badge ob-badge--done">Completed</span>}
              {active && !done && <span className="ob-badge ob-badge--active">Up next</span>}
            </div>
            <p className="ob-step-sub">{subtitle}</p>
          </div>

          {/* Body — always mounted, hidden via display */}
          <div style={{ display: (active || done) && children ? "block" : "none" }}
            className="ob-step-body">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton loader ── */
function Skeleton() {
  return (
    <div className="ob-skeleton-wrap">
      <div className="ob-skel ob-skel--title" />
      <div className="ob-skel ob-skel--sub" />
      <div style={{ display:"flex", flexDirection:"column", gap:12, marginTop:24 }}>
        {[1,2,3,4].map(i => (
          <div key={i} className="ob-skel-card">
            <div style={{ display:"flex", gap:14, alignItems:"center" }}>
              <div className="ob-skel ob-skel--circle" />
              <div style={{ flex:1 }}>
                <div className="ob-skel" style={{ width:"40%", height:12, marginBottom:8 }} />
                <div className="ob-skel" style={{ width:"70%", height:10 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading]   = useState(true);
  const [status, setStatus]     = useState<OnboardingStatus | null>(null);

  // Email
  const [code, setCode]         = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [codeFocused, setCodeFocused] = useState(false);

  // Session
  const [sessionName, setSessionName] = useState("");
  const [sessionStartDate, setSessionStartDate] = useState("");
  const [sessionEndDate, setSessionEndDate]     = useState("");
  const [makeCurrentSession, setMakeCurrentSession] = useState(true);
  const [settingSession, setSettingSession] = useState(false);

  // Terms
  const DEFAULT_TERMS = ["First Term", "Second Term", "Third Term"] as const;
  const [currentTerm, setCurrentTerm] = useState<(typeof DEFAULT_TERMS)[number]>("First Term");
  const [makeCurrentTerm, setMakeCurrentTerm] = useState(true);
  const [creatingTerms, setCreatingTerms] = useState(false);

  // Bonus
  const [claiming, setClaiming] = useState(false);

  const progress   = useMemo(() => percentFromStatus(status), [status]);
  const activeStep = useMemo(() => (status ? nextStepFromStatus(status) : null), [status]);

  const refresh = async () => {
    setLoading(true);
    try {
      const s = await getOnboardingStatus();
      setStatus(s);
      if (s.bonus_given) {
        showToast("Activation complete 🎉 Redirecting…", "success");
        navigate("/dashboard", { replace: true });
      }
    } catch (e: any) {
      showToast(e?.response?.data?.message || "Unable to load onboarding status.", "error");
      navigate("/login", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleVerify = async () => {
    if (code.trim().length !== 5) { showToast("Enter the 5-digit code.", "error"); return; }
    setVerifying(true);
    try {
      await verifyEmailCode(code.trim());
      showToast("Email verified ✅", "success");
      setCode(""); await refresh();
    } catch (e: any) { showToast(e?.response?.data?.message || "Invalid code.", "error"); }
    finally { setVerifying(false); }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendEmailCode();
      showToast("Code resent — check your inbox.", "success");
    } catch (e: any) { showToast(e?.response?.data?.message || "Failed to resend.", "error"); }
    finally { setResending(false); }
  };

  const handleSetSession = async () => {
    if (!sessionName.trim()) { showToast("Enter a session name, e.g., 2025/2026.", "error"); return; }
    if ((sessionStartDate && !sessionEndDate) || (!sessionStartDate && sessionEndDate)) {
      showToast("Provide both start and end dates, or leave both empty.", "error"); return;
    }
    if (sessionStartDate && sessionEndDate && sessionEndDate < sessionStartDate) {
      showToast("End date cannot be before start date.", "error"); return;
    }
    setSettingSession(true);
    try {
      await setCurrentSession({ name: sessionName.trim(), start_date: sessionStartDate||undefined, end_date: sessionEndDate||undefined, make_current: makeCurrentSession });
      showToast(makeCurrentSession ? "Session saved & set as current ✅" : "Session saved ✅", "success");
      await refresh();
    } catch (e: any) { showToast(e?.response?.data?.message || "Failed to save session.", "error"); }
    finally { setSettingSession(false); }
  };

  const handleCreateTerms = async () => {
    setCreatingTerms(true);
    try {
      await createAllTerms({ terms: [...DEFAULT_TERMS], make_current: makeCurrentTerm, current_term: currentTerm });
      showToast(makeCurrentTerm ? "Terms created & current set ✅" : "Terms created ✅", "success");
      await refresh();
    } catch (e: any) { showToast(e?.response?.data?.message || "Failed to create terms.", "error"); }
    finally { setCreatingTerms(false); }
  };

  const handleClaimBonus = async () => {
    setClaiming(true);
    try {
      const res = await activateBonus();
      showToast(res?.message || "Bonus activated ✅", "success");
      await refresh();
    } catch (e: any) { showToast(e?.response?.data?.message || "Complete all steps first.", "error"); }
    finally { setClaiming(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }

        .ob-page {
          min-height: 100vh;
          background: #f5f1eb;
          font-family: 'DM Sans', sans-serif;
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: 0;
        }

        @media (max-width: 900px) {
          .ob-page { grid-template-columns: 1fr; }
          .ob-sidebar { display: none !important; }
        }

        /* ══════════ LEFT SIDEBAR ══════════ */
        .ob-sidebar {
          background: #0f172a;
          min-height: 100vh;
          padding: 48px 40px;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .ob-sidebar::before {
          content: '';
          position: absolute; inset:0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
        }

        .ob-sidebar-glow {
          position: absolute; bottom: -60px; left: -60px;
          width: 380px; height: 380px; border-radius: 50%;
          background: radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 65%);
          pointer-events: none;
        }

        .ob-sidebar-inner { position: relative; z-index:1; display:flex; flex-direction:column; height:100%; }

        /* Logo */
        .ob-logo {
          display: inline-flex; align-items: center; gap: 10px;
          text-decoration: none; margin-bottom: 48px;
        }
        .ob-logo-mark {
          width: 38px; height: 38px; border-radius: 10px;
          background: linear-gradient(135deg, #c9a84c, #e8c97a);
          display: flex; align-items: center; justify-content: center;
        }
        .ob-logo-name { font-family:'Lora',serif; font-size:19px; font-weight:700; color:#fff; }
        .ob-logo-pill {
          font-size:9px; font-weight:500; letter-spacing:0.1em; text-transform:uppercase;
          color:#c9a84c; background:rgba(201,168,76,0.12); border:1px solid rgba(201,168,76,0.25);
          border-radius:100px; padding:2px 7px;
        }

        /* Left headline */
        .ob-sidebar-head { margin-bottom: 32px; }
        .ob-sidebar-kicker {
          display: flex; align-items: center; gap: 7px;
          font-size:11px; font-weight:500; letter-spacing:0.18em; text-transform:uppercase;
          color:#c9a84c; margin-bottom:12px;
        }
        .ob-sidebar-kicker-line { width:20px; height:1px; background:#d97706; opacity:0.6; }
        .ob-sidebar-title {
          font-family:'Lora',serif; font-size:clamp(22px,2vw,28px); font-weight:700;
          color:#fff; line-height:1.15;
        }
        .ob-sidebar-title em { font-style:italic; color:#e8c97a; }
        .ob-sidebar-sub { font-size:13px; font-weight:300; color:#64748b; line-height:1.75; margin-top:10px; }

        /* Progress ring */
        .ob-ring-wrap {
          display: flex; flex-direction: column; align-items: center; gap: 16px;
          padding: 28px 0; margin-bottom:32px;
          border-top:1px solid rgba(255,255,255,0.06);
          border-bottom:1px solid rgba(255,255,255,0.06);
        }

        .ob-ring { position: relative; width:100px; height:100px; }

        .ob-ring svg { transform: rotate(-90deg); }

        .ob-ring-track { fill:none; stroke:rgba(255,255,255,0.06); stroke-width:6; }
        .ob-ring-fill {
          fill:none; stroke:#c9a84c; stroke-width:6;
          stroke-linecap:round;
          stroke-dasharray: 283;
          transition: stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1);
        }

        .ob-ring-text {
          position:absolute; inset:0;
          display:flex; flex-direction:column; align-items:center; justify-content:center;
        }

        .ob-ring-pct {
          font-family:'Lora',serif; font-size:26px; font-weight:700; color:#fff; line-height:1;
        }

        .ob-ring-label { font-size:10px; font-weight:300; color:#64748b; margin-top:2px; }

        .ob-ring-caption { font-size:12px; font-weight:300; color:#64748b; text-align:center; }

        /* Sidebar step indicators */
        .ob-sidebar-steps { display:flex; flex-direction:column; gap:14px; flex:1; }

        .ob-sidebar-step {
          display:flex; align-items:center; gap:12px;
          opacity:0.45; transition:opacity 0.3s;
        }
        .ob-sidebar-step--done  { opacity:1; }
        .ob-sidebar-step--active { opacity:1; }

        .ob-sidebar-dot {
          width:28px; height:28px; border-radius:50%; flex-shrink:0;
          border:1.5px solid rgba(255,255,255,0.12);
          display:flex; align-items:center; justify-content:center;
          font-size:11px; font-weight:700; color:#64748b;
          transition:background 0.3s, border-color 0.3s, color 0.3s;
        }
        .ob-sidebar-step--done .ob-sidebar-dot {
          background:rgba(34,197,94,0.15); border-color:rgba(34,197,94,0.4); color:#22c55e;
        }
        .ob-sidebar-step--active .ob-sidebar-dot {
          background:rgba(201,168,76,0.15); border-color:rgba(201,168,76,0.5); color:#c9a84c;
          animation: obDotPulse 2s ease infinite;
        }
        @keyframes obDotPulse {
          0%,100% { box-shadow:0 0 0 0 rgba(201,168,76,0.3); }
          50%      { box-shadow:0 0 0 8px rgba(201,168,76,0); }
        }

        .ob-sidebar-step-label {
          font-size:13px; font-weight:400; color:#94a3b8;
          transition:color 0.3s;
        }
        .ob-sidebar-step--active .ob-sidebar-step-label { color:#e2e8f0; }
        .ob-sidebar-step--done  .ob-sidebar-step-label { color:#64748b; }

        /* Sidebar quote */
        .ob-sidebar-quote { margin-top:auto; padding-top:28px; }
        .ob-quote-text {
          font-family:'Lora',serif; font-style:italic;
          font-size:13px; color:#475569; line-height:1.7; margin-bottom:8px;
        }
        .ob-quote-author { font-size:11.5px; color:#334155; }
        .ob-quote-line { display:inline-block; width:16px; height:1px; background:#c9a84c; opacity:0.5; vertical-align:middle; margin-right:6px; }

        /* ══════════ MAIN AREA ══════════ */
        .ob-main {
          padding: 48px 52px;
          max-width: 680px;
        }

        @media (max-width: 640px) { .ob-main { padding: 32px 20px; } }

        /* Mobile logo */
        .ob-mobile-logo {
          display:none; align-items:center; gap:9px;
          text-decoration:none; margin-bottom:32px;
        }
        @media (max-width:900px) { .ob-mobile-logo { display:flex; } }

        /* Header */
        .ob-header { margin-bottom:36px; }
        .ob-eyebrow {
          display:flex; align-items:center; gap:7px;
          font-size:11px; font-weight:500; letter-spacing:0.18em; text-transform:uppercase;
          color:#b45309; margin-bottom:10px;
        }
        .ob-eyebrow-line { width:20px; height:1px; background:#d97706; opacity:0.6; }
        .ob-title { font-family:'Lora',serif; font-size:clamp(24px,3vw,34px); font-weight:700; color:#1a1a2e; line-height:1.1; }
        .ob-title em { font-style:italic; color:#b45309; }
        .ob-subtitle { font-size:14px; font-weight:300; color:#7a6a5a; line-height:1.75; margin-top:8px; max-width:460px; }

        /* Bonus banner */
        .ob-bonus-banner {
          display:flex; align-items:center; gap:14px;
          background:#fff;
          border:1px solid #e8c97a;
          border-radius:12px; padding:16px 20px;
          margin-bottom:32px;
        }
        .ob-bonus-icon {
          width:42px; height:42px; border-radius:10px; flex-shrink:0;
          background:linear-gradient(135deg,#fef3c7,#fde68a);
          display:flex; align-items:center; justify-content:center;
          color:#b45309;
        }
        .ob-bonus-text { flex:1; }
        .ob-bonus-title { font-size:13.5px; font-weight:500; color:#1a1a2e; margin-bottom:2px; }
        .ob-bonus-sub { font-size:12px; font-weight:300; color:#9a8a7a; line-height:1.5; }

        /* Refresh btn */
        .ob-refresh {
          display:inline-flex; align-items:center; gap:6px;
          padding:7px 14px; font-size:12px; font-weight:400;
          color:#7a6a5a; background:#f5f1eb;
          border:1px solid #e5ddd3; border-radius:7px;
          cursor:pointer; transition:background 0.2s;
          flex-shrink:0;
        }
        .ob-refresh:hover { background:#ede8e0; }
        .ob-refresh:disabled { opacity:0.45; cursor:not-allowed; }

        /* ── Steps ── */
        .ob-steps { display:flex; flex-direction:column; position:relative; }

        .ob-step {
          display:flex; flex-direction:column;
          position:relative;
          animation: obFadeUp 0.5s ease both;
        }

        ${[0,1,2,3].map(i => `.ob-step:nth-child(${i+1}) { animation-delay:${i*0.07}s; }`).join(" ")}

        @keyframes obFadeUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }

        .ob-step-connector {
          position:absolute; left:17px; top:40px; bottom:0;
          width:1px; background:rgba(0,0,0,0.08);
        }
        .ob-step:last-child .ob-step-connector { display:none; }

        .ob-step-row {
          display:flex; gap:16px; padding-bottom:28px;
        }

        .ob-step-badge {
          width:36px; height:36px; border-radius:50%; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          font-family:'Lora',serif; font-size:14px; font-weight:700;
          transition:background 0.3s, border-color 0.3s, color 0.3s;
          margin-top:2px;
        }

        .ob-step--done .ob-step-badge {
          background:rgba(34,197,94,0.1); border:1.5px solid rgba(34,197,94,0.35); color:#22c55e;
        }
        .ob-step--active .ob-step-badge {
          background:#1a1a2e; border:1.5px solid #1a1a2e; color:#e8c97a;
          box-shadow: 0 0 0 4px rgba(26,26,46,0.08);
        }
        .ob-step--pending .ob-step-badge {
          background:#fff; border:1.5px solid #e5ddd3; color:#c8bfb5;
        }

        .ob-step-content { flex:1; min-width:0; }

        .ob-step-head { margin-bottom:4px; }
        .ob-step-title-wrap { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:3px; }

        .ob-step-title {
          font-family:'Lora',serif; font-size:16px; font-weight:700;
          color:#1a1a2e;
        }
        .ob-step--pending .ob-step-title { color:#b5a090; }

        .ob-badge {
          font-size:10.5px; font-weight:500; letter-spacing:0.06em;
          border-radius:100px; padding:2px 9px; line-height:1.6;
        }
        .ob-badge--done  { background:rgba(34,197,94,0.1); color:#065f46; border:1px solid rgba(34,197,94,0.25); }
        .ob-badge--active { background:rgba(180,83,9,0.1); color:#b45309; border:1px solid rgba(180,83,9,0.2); }

        .ob-step-sub { font-size:13px; font-weight:300; color:#9a8a7a; line-height:1.65; }
        .ob-step--pending .ob-step-sub { color:#c8bfb5; }

        /* Step body card */
        .ob-step-body {
          margin-top:16px;
          background:#fff;
          border:1px solid #e8e0d5;
          border-radius:12px;
          padding:22px;
        }

        /* ── Form elements ── */
        .ob-label {
          display:block; font-size:12px; font-weight:500; color:#4a4a5a;
          margin-bottom:7px; letter-spacing:0.02em;
        }
        .ob-hint { font-size:11.5px; font-weight:300; color:#b5a090; margin-top:5px; }

        .ob-input-wrap { position:relative; }
        .ob-input-icon {
          position:absolute; left:13px; top:50%;
          transform:translateY(-50%); color:#b5a090;
          pointer-events:none; display:flex; align-items:center;
        }

        .ob-input, .ob-select {
          width:100%; background:#fff;
          border:1.5px solid #e5ddd3; border-radius:9px;
          padding:11px 13px 11px 40px;
          font-family:'DM Sans',sans-serif; font-size:13.5px; color:#1a1a2e;
          outline:none; -webkit-appearance:none;
          transition:border-color 0.2s, box-shadow 0.2s;
        }
        .ob-input-plain { padding-left:13px; }
        .ob-input:focus, .ob-select:focus {
          border-color:#c9a84c;
          box-shadow: 0 0 0 3px rgba(201,168,76,0.12);
        }
        .ob-input::placeholder { color:#bdb3a8; }

        /* OTP input */
        .ob-otp-wrap { position:relative; }
        .ob-otp {
          width:100%; letter-spacing:0.5em; font-size:22px; font-weight:700;
          text-align:center; background:#fff;
          border:2px solid #e5ddd3; border-radius:12px;
          padding:14px; font-family:'Lora',serif; color:#1a1a2e;
          outline:none;
          transition:border-color 0.2s, box-shadow 0.2s;
        }
        .ob-otp:focus {
          border-color:#c9a84c;
          box-shadow: 0 0 0 4px rgba(201,168,76,0.12);
        }
        .ob-otp::placeholder { color:#e5ddd3; letter-spacing:0.3em; font-size:18px; }

        /* 2-col grid */
        .ob-row2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        @media (max-width:520px) { .ob-row2 { grid-template-columns:1fr; } }

        /* Toggle switch */
        .ob-toggle-row {
          display:flex; align-items:center; justify-content:space-between;
          padding:10px 14px; background:#faf8f5;
          border:1px solid #e8e0d5; border-radius:8px; cursor:pointer;
          user-select:none;
        }
        .ob-toggle-label { font-size:13px; font-weight:400; color:#4a4a5a; }
        .ob-toggle { position:relative; width:36px; height:20px; cursor:pointer; }
        .ob-toggle input { opacity:0; width:0; height:0; }
        .ob-toggle-track {
          position:absolute; inset:0; border-radius:100px;
          background:#e5ddd3; transition:background 0.2s;
        }
        .ob-toggle input:checked + .ob-toggle-track { background:#c9a84c; }
        .ob-toggle-thumb {
          position:absolute; top:3px; left:3px;
          width:14px; height:14px; border-radius:50%;
          background:#fff; transition:transform 0.2s;
          pointer-events:none;
        }
        .ob-toggle input:checked ~ .ob-toggle-thumb { transform:translateX(16px); }

        /* Term pills */
        .ob-term-pills { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
        .ob-term-pill {
          padding:7px 16px; font-size:13px; font-weight:400;
          border:1.5px solid #e5ddd3; border-radius:100px;
          background:#fff; color:#7a6a5a;
          cursor:pointer; transition:background 0.2s, border-color 0.2s, color 0.2s;
        }
        .ob-term-pill--selected {
          background:#1a1a2e; border-color:#1a1a2e; color:#e8c97a;
        }

        /* Bonus claim card */
        .ob-bonus-claim {
          display:flex; flex-direction:column; align-items:center; gap:8px;
          padding:24px 20px; background:#faf8f5;
          border:1px dashed #e8c97a; border-radius:12px;
          text-align:center; margin-bottom:0;
        }
        .ob-bonus-amount {
          font-family:'Lora',serif; font-size:36px; font-weight:700; color:#b45309;
        }
        .ob-bonus-desc { font-size:13px; font-weight:300; color:#7a6a5a; max-width:280px; line-height:1.65; }

        /* Buttons */
        .ob-btn-primary {
          width:100%; padding:12px 20px;
          font-family:'DM Sans',sans-serif; font-size:14px; font-weight:500;
          color:#fff; background:#1a1a2e; border:none; border-radius:9px;
          cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;
          transition:background 0.2s, transform 0.2s, box-shadow 0.2s;
          margin-top:16px;
        }
        .ob-btn-primary:hover:not(:disabled) {
          background:#0a0f1e; transform:translateY(-1px);
          box-shadow:0 6px 20px rgba(0,0,0,0.15);
        }
        .ob-btn-primary:disabled { opacity:0.55; cursor:not-allowed; }

        .ob-btn-claim {
          width:100%; padding:14px 20px;
          font-family:'DM Sans',sans-serif; font-size:14.5px; font-weight:500;
          color:#0f172a; background:#c9a84c; border:none; border-radius:10px;
          cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;
          transition:background 0.2s, transform 0.2s, box-shadow 0.2s;
          margin-top:16px;
        }
        .ob-btn-claim:hover:not(:disabled) {
          background:#e8c97a; transform:translateY(-1px);
          box-shadow:0 6px 20px rgba(201,168,76,0.3);
        }
        .ob-btn-claim:disabled { opacity:0.55; cursor:not-allowed; }

        .ob-btn-link {
          background:none; border:none; padding:0;
          font-size:13px; font-weight:400; color:#b45309;
          cursor:pointer; text-decoration:underline; text-underline-offset:2px;
          transition:color 0.2s;
        }
        .ob-btn-link:hover { color:#92400e; }
        .ob-btn-link:disabled { opacity:0.45; cursor:not-allowed; }

        /* Spinner */
        .ob-spinner {
          width:15px; height:15px; border-radius:50%;
          border:2px solid rgba(255,255,255,0.3); border-top-color:#fff;
          animation:obSpin 0.7s linear infinite; flex-shrink:0;
        }
        .ob-spinner--dark { border:2px solid rgba(0,0,0,0.15); border-top-color:#0f172a; }
        @keyframes obSpin { to { transform:rotate(360deg); } }

        /* Footer note */
        .ob-footer { text-align:center; font-size:12px; font-weight:300; color:#b5a090; margin-top:36px; }
        .ob-footer a { color:#b45309; text-decoration:none; }

        /* ── Skeleton ── */
        .ob-skeleton-wrap { padding:12px 0; }
        .ob-skel {
          border-radius:6px; background:#ece8e0;
          background: linear-gradient(90deg,#ece8e0 25%,#e0dad2 50%,#ece8e0 75%);
          background-size:200% 100%;
          animation:obSkelAnim 1.4s ease infinite;
        }
        @keyframes obSkelAnim { from{background-position:200% 0;} to{background-position:-200% 0;} }
        .ob-skel--title { width:55%; height:16px; margin-bottom:10px; }
        .ob-skel--sub   { width:75%; height:12px; }
        .ob-skel--circle { width:36px; height:36px; border-radius:50%; flex-shrink:0; }
        .ob-skel-card { background:#fff; border:1px solid #e8e0d5; border-radius:12px; padding:18px; }
      `}</style>
  <PageTitle title="Onboarding" />
      <div className="ob-page">

        {/* ══ LEFT SIDEBAR ══ */}
        <aside className="ob-sidebar" style={{ display:"flex" }}>
          <div className="ob-sidebar-glow" aria-hidden="true" />
          <div className="ob-sidebar-inner">

            {/* Logo */}
            <a href="/" className="ob-logo">
              <span className="ob-logo-mark">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <polygon points="12,2 22,19 2,19" stroke="#0a0f1e" strokeWidth="2"
                    strokeLinejoin="round" fill="none"/>
                  <path d="M12 8v5M12 15.5v.5" stroke="#0a0f1e" strokeWidth="2.2" strokeLinecap="round"/>
                </svg>
              </span>
              <span className="ob-logo-name">GradeQuest</span>
              <span className="ob-logo-pill">AI</span>
            </a>

            {/* Headline */}
            <div className="ob-sidebar-head">
              <div className="ob-sidebar-kicker">
                <span className="ob-sidebar-kicker-line" />
                School activation
              </div>
              <h2 className="ob-sidebar-title">
                You're almost<br/>
                <em>ready to go.</em>
              </h2>
              <p className="ob-sidebar-sub">
                Four quick steps and your school management platform is fully live.
              </p>
            </div>

            {/* Progress ring */}
            <div className="ob-ring-wrap">
              <div className="ob-ring">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle className="ob-ring-track" cx="50" cy="50" r="45"/>
                  <circle
                    className="ob-ring-fill"
                    cx="50" cy="50" r="45"
                    style={{ strokeDashoffset: 283 - (283 * progress / 100) }}
                  />
                </svg>
                <div className="ob-ring-text">
                  <span className="ob-ring-pct">{progress}%</span>
                  <span className="ob-ring-label">complete</span>
                </div>
              </div>
              <p className="ob-ring-caption">
                Most schools finish this<br/>in under 2 minutes.
              </p>
            </div>

            {/* Step list */}
            <div className="ob-sidebar-steps">
              {([
                { key:"email",   label:"Verify email" },
                { key:"session", label:"Set academic session" },
                { key:"terms",   label:"Create term structure" },
                { key:"bonus",   label:"Claim welcome bonus" },
              ] as { key:StepKey; label:string }[]).map((s, i) => {
                const done   = status ? nextStepFromStatus(status) !== s.key && (
                  (s.key==="email"   && status.email_verified)   ||
                  (s.key==="session" && status.current_session)  ||
                  (s.key==="terms"   && status.all_terms_exist)  ||
                  (s.key==="bonus"   && status.bonus_given)
                ) : false;
                const active = activeStep === s.key;
                return (
                  <div key={s.key}
                    className={`ob-sidebar-step ${done ? "ob-sidebar-step--done" : active ? "ob-sidebar-step--active" : ""}`}>
                    <div className="ob-sidebar-dot">
                      {done ? (
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <path d="M1.5 6l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : i+1}
                    </div>
                    <span className="ob-sidebar-step-label">{s.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Bottom quote */}
            <div className="ob-sidebar-quote">
              <p className="ob-quote-text">
                "Setup took 90 seconds. We were uploading results the same afternoon."
              </p>
              <span className="ob-quote-author">
                <span className="ob-quote-line"/>
                Mr. Tunde Balogun · Sunrise Academy, Abuja
              </span>
            </div>
          </div>
        </aside>

        {/* ══ MAIN ══ */}
        <main className="ob-main">

          {/* Mobile logo */}
          <a href="/" className="ob-mobile-logo">
            <span className="ob-logo-mark" style={{ width:32, height:32, borderRadius:8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <polygon points="12,2 22,19 2,19" stroke="#0a0f1e" strokeWidth="2" strokeLinejoin="round" fill="none"/>
                <path d="M12 8v5M12 15.5v.5" stroke="#0a0f1e" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </span>
            <span style={{ fontFamily:"'Lora',serif", fontSize:17, fontWeight:700, color:"#1a1a2e" }}>GradeQuest</span>
          </a>

          {/* Header */}
          <div className="ob-header">
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
              <div>
                <div className="ob-eyebrow">
                  <span className="ob-eyebrow-line"/>
                  Step {loading ? "–" : status ? (["email","session","terms","bonus"].indexOf(activeStep||"bonus")+1) : "–"} of 4
                </div>
                <h1 className="ob-title">
                  Activate your<br/>
                  <em>GradeQuest school.</em>
                </h1>
                <p className="ob-subtitle">
                  Complete four steps and unlock your <strong style={{ color:"#b45309" }}>₦500 welcome bonus</strong> and a free 14-day plan.
                </p>
              </div>
              <button className="ob-refresh" onClick={refresh} disabled={loading}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none"
                  style={{ animation: loading ? "obSpin 0.8s linear infinite" : "none" }}>
                  <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </div>

          {/* Bonus banner */}
          {!loading && status && !status.bonus_given && (
            <div className="ob-bonus-banner">
              <div className="ob-bonus-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="ob-bonus-text">
                <div className="ob-bonus-title">₦500 welcome bonus + 14-day free plan waiting for you</div>
                <div className="ob-bonus-sub">Complete all steps to claim. Bonus goes directly to your school wallet.</div>
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && !status && <Skeleton />}

          {/* Steps */}
          {status && (
            <div className="ob-steps">

              {/* ── Step 1: Email ── */}
              <StepCard number={1} title="Verify your email address"
                subtitle="Enter the 5-digit code we sent to your registered email."
                done={status.email_verified} active={activeStep === "email"}>
                {!status.email_verified && (
                  <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    <div>
                      <label className="ob-label">Verification code</label>
                      <input
                        className="ob-otp"
                        inputMode="numeric"
                        maxLength={5}
                        placeholder="• • • • •"
                        value={code}
                        onChange={e => setCode(e.target.value.replace(/\D/g,""))}
                        onFocus={() => setCodeFocused(true)}
                        onBlur={() => setCodeFocused(false)}
                        onKeyDown={e => e.key==="Enter" && handleVerify()}
                      />
                      <p className="ob-hint">Check your spam folder if you don't see it.</p>
                    </div>
                    <button className="ob-btn-primary" onClick={handleVerify} disabled={verifying || code.length<5}>
                      {verifying ? <><span className="ob-spinner"/>&nbsp;Verifying…</> : <>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2 7l3.5 3.5 6.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Verify Email
                      </>}
                    </button>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <span style={{ fontSize:12.5, color:"#9a8a7a", fontWeight:300 }}>Didn't receive the code?</span>
                      <button className="ob-btn-link" onClick={handleResend} disabled={resending}>
                        {resending ? "Sending…" : "Resend code →"}
                      </button>
                    </div>
                  </div>
                )}
              </StepCard>

              {/* ── Step 2: Session ── */}
              <StepCard number={2} title="Set your academic session"
                subtitle="This drives your result sheets, reports, and term structure."
                done={status.current_session} active={activeStep === "session"}>
                {!status.current_session && (
                  <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    <div>
                      <label className="ob-label" htmlFor="sessionName">Session name</label>
                      <div className="ob-input-wrap">
                        <span className="ob-input-icon">
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <rect x="1" y="3" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                            <path d="M5 1v3M11 1v3M1 7h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                          </svg>
                        </span>
                        <input id="sessionName" className="ob-input" placeholder="e.g. 2025/2026"
                          value={sessionName} onChange={e => setSessionName(e.target.value)}/>
                      </div>
                    </div>

                    <div className="ob-row2">
                      <div>
                        <label className="ob-label">Start date <span style={{ color:"#b5a090", fontWeight:300 }}>(optional)</span></label>
                        <input className="ob-input ob-input-plain" type="date"
                          value={sessionStartDate} onChange={e => setSessionStartDate(e.target.value)}/>
                      </div>
                      <div>
                        <label className="ob-label">End date <span style={{ color:"#b5a090", fontWeight:300 }}>(optional)</span></label>
                        <input className="ob-input ob-input-plain" type="date"
                          value={sessionEndDate} onChange={e => setSessionEndDate(e.target.value)}/>
                      </div>
                    </div>

                    <label className="ob-toggle-row" htmlFor="makeCurrentSessionToggle">
                      <span className="ob-toggle-label">Set as current session</span>
                      <span className="ob-toggle">
                        <input type="checkbox" id="makeCurrentSessionToggle"
                          checked={makeCurrentSession} onChange={e => setMakeCurrentSession(e.target.checked)}/>
                        <span className="ob-toggle-track"/>
                        <span className="ob-toggle-thumb"/>
                      </span>
                    </label>

                    <button className="ob-btn-primary" onClick={handleSetSession} disabled={settingSession || !sessionName.trim()}>
                      {settingSession ? <><span className="ob-spinner"/>Saving…</> : <>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Save Session
                      </>}
                    </button>
                  </div>
                )}
              </StepCard>

              {/* ── Step 3: Terms ── */}
              <StepCard number={3} title="Create your term structure"
                subtitle="We'll create First, Second, and Third Term — choose which is active now."
                done={status.all_terms_exist} active={activeStep === "terms"}>
                {!status.all_terms_exist && (
                  <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    <div>
                      <label className="ob-label">Current term</label>
                      <div className="ob-term-pills">
                        {(["First Term","Second Term","Third Term"] as const).map(t => (
                          <button key={t} type="button"
                            className={`ob-term-pill ${currentTerm===t && makeCurrentTerm ? "ob-term-pill--selected" : ""}`}
                            onClick={() => { setCurrentTerm(t); setMakeCurrentTerm(true); }}>
                            {t}
                          </button>
                        ))}
                      </div>
                      <p className="ob-hint">We'll auto-create all three terms. The selected one becomes active.</p>
                    </div>

                    <label className="ob-toggle-row" htmlFor="makeCurrentTermToggle">
                      <span className="ob-toggle-label">Mark selected term as current</span>
                      <span className="ob-toggle">
                        <input type="checkbox" id="makeCurrentTermToggle"
                          checked={makeCurrentTerm} onChange={e => setMakeCurrentTerm(e.target.checked)}/>
                        <span className="ob-toggle-track"/>
                        <span className="ob-toggle-thumb"/>
                      </span>
                    </label>

                    <button className="ob-btn-primary" onClick={handleCreateTerms} disabled={creatingTerms}>
                      {creatingTerms ? <><span className="ob-spinner"/>Creating terms…</> : <>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Create All Terms
                      </>}
                    </button>
                  </div>
                )}
              </StepCard>

              {/* ── Step 4: Bonus ── */}
              <StepCard number={4} title="Claim your welcome bonus"
                subtitle="All steps complete — your ₦500 bonus and free plan are ready."
                done={status.bonus_given} active={activeStep === "bonus"}>
                {!status.bonus_given && (
                  <div className="ob-bonus-claim">
                    <div style={{ fontSize:32 }} aria-hidden="true">🎉</div>
                    <div className="ob-bonus-amount">₦500</div>
                    <p className="ob-bonus-desc">
                      Credited directly to your school wallet,
                      plus <strong>14 days free</strong> on any plan. No credit card needed.
                    </p>
                    <button className="ob-btn-claim" onClick={handleClaimBonus} disabled={claiming}
                      style={{ maxWidth:280 }}>
                      {claiming ? <><span className="ob-spinner ob-spinner--dark"/>Activating…</> : <>
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                          <path d="M8 2l2 4h4l-3 2.6 1.2 4L8 10.3 3.8 12.6 5 8.6 2 6h4z"
                            stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                        </svg>
                        Claim ₦500 &amp; Activate
                      </>}
                    </button>
                  </div>
                )}
              </StepCard>
            </div>
          )}

          <p className="ob-footer">
            Need help? Contact{" "}
            <a href="mailto:support@gradequest.com">support@gradequest.com</a>
            {" "}after activation.
          </p>
        </main>
      </div>
    </>
  );
}