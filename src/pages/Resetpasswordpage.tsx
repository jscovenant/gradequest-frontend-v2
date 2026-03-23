// src/pages/Auth/ResetPasswordPage.tsx
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { publicApi } from "../utils/axios";
import PageTitle from "../components/PageTitle";

type Step = "otp" | "password" | "done";

const api = (path: string, body: object) => publicApi.post(path, body);

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const prefillEmail =
    (location.state as any)?.email ??
    sessionStorage.getItem("reset_email") ??
    "";

  const [email, setEmail] = useState(prefillEmail);
  const [step, setStep] = useState<Step>("otp");

  /* OTP step */
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* Password step */
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");

  const otpValue = otp.join("");
  const otpComplete = otpValue.length === 6;

  const pwStrength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const pwStrengthLabel = ["", "Weak", "Fair", "Good", "Strong"][pwStrength];
  const pwStrengthColor = ["", "#ef4444", "#f59e0b", "#3b82f6", "#22c55e"][pwStrength];

  const pwMatch = confirm.length > 0 && password === confirm;
  const pwError2 = confirm.length > 0 && password !== confirm ? "Passwords do not match." : "";
  const pwReady = password.length >= 8 && pwMatch;

  useEffect(() => {
    otpRefs.current[0]?.focus();
  }, []);

  const getErrorMessage = (err: any, fallback: string) => {
    const data = err?.response?.data;
    if (data?.errors) {
      const firstKey = Object.keys(data.errors)[0];
      if (firstKey && data.errors[firstKey]?.[0]) {
        return data.errors[firstKey][0];
      }
    }
    return data?.message || fallback;
  };

  const handleOtpChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    setOtpError("");

    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) otpRefs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    const next = ["", "", "", "", "", ""];
    digits.forEach((d, i) => {
      if (i < 6) next[i] = d;
    });
    setOtp(next);
    setOtpError("");
    otpRefs.current[Math.min(digits.length, 5)]?.focus();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setOtpError("Email is missing. Go back to forgot password.");
      return;
    }

    if (!otpComplete) {
      setOtpError("Please enter all 6 digits.");
      return;
    }

    setOtpError("");
    setOtpLoading(true);

    try {
      await api("/verify-reset-code", {
        email: email.trim(),
        code: otpValue,
      });

      setStep("password");
    } catch (err: any) {
      setOtpError(getErrorMessage(err, "Invalid or expired reset code."));

      otpRefs.current[0]?.closest(".rp-otp-row")?.animate(
        [
          { transform: "translateX(-6px)" },
          { transform: "translateX(6px)" },
          { transform: "translateX(-4px)" },
          { transform: "translateX(0)" },
        ],
        { duration: 300, easing: "ease-out" }
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pwReady) return;

    setPwError("");
    setPwLoading(true);

    try {
      await api("/reset-password", {
        email: email.trim(),
        code: otpValue,
        password,
        password_confirmation: confirm,
      });

      sessionStorage.removeItem("reset_email");
      setStep("done");
    } catch (err: any) {
      setPwError(getErrorMessage(err, "Failed to reset password. Try again."));
    } finally {
      setPwLoading(false);
    }
  };

  const steps: { key: Step | "otp"; label: string; sub: string }[] = [
    { key: "otp", label: "Enter 6-digit code", sub: "Sent to your admin email." },
    { key: "password", label: "Set a new password", sub: "Min 8 characters." },
    { key: "done", label: "Access restored", sub: "Log in with your new password." },
  ];

  const stepIndex = { otp: 0, password: 1, done: 2 }[step];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        .rp-root {
          min-height:100vh; display:flex;
          font-family:'DM Sans',sans-serif; background:#0a0f1e;
        }

        .rp-left {
          flex:1; background:#0f172a; position:relative; overflow:hidden;
          display:flex; flex-direction:column; justify-content:space-between;
          padding:48px 52px;
        }
        @media(max-width:900px){ .rp-left{ display:none; } }

        .rp-noise {
          position:absolute; inset:0;
          background-image:radial-gradient(circle,rgba(255,255,255,.04) 1px,transparent 1px);
          background-size:24px 24px; pointer-events:none;
        }
        .rp-glow1 {
          position:absolute; top:-80px; right:-80px; width:420px; height:420px;
          border-radius:50%;
          background:radial-gradient(circle,rgba(201,168,76,.09) 0%,transparent 65%);
          pointer-events:none;
        }
        .rp-glow2 {
          position:absolute; bottom:-60px; left:-40px; width:300px; height:300px;
          border-radius:50%;
          background:radial-gradient(circle,rgba(99,102,241,.06) 0%,transparent 70%);
          pointer-events:none;
        }

        .rp-logo { position:relative; z-index:1; display:flex; align-items:center; gap:10px; }
        .rp-logo-mark {
          width:36px; height:36px; border-radius:9px;
          background:linear-gradient(135deg,#c9a84c,#e8c97a);
          display:flex; align-items:center; justify-content:center;
        }
        .rp-logo-name {
          font-family:'Lora',serif; font-size:18px; font-weight:700;
          color:#fff; letter-spacing:-.01em;
        }
        .rp-logo-name span { color:#c9a84c; }

        .rp-left-body { position:relative; z-index:1; }

        .rp-kicker {
          display:inline-flex; align-items:center; gap:7px;
          font-size:10.5px; font-weight:500; letter-spacing:.14em; text-transform:uppercase;
          color:#e8c97a; background:rgba(201,168,76,.1); border:1px solid rgba(201,168,76,.2);
          border-radius:999px; padding:4px 13px; margin-bottom:22px;
        }
        .rp-kicker-dot { width:5px; height:5px; border-radius:50%; background:#c9a84c; }

        .rp-headline {
          font-family:'Lora',serif; font-size:clamp(28px,3vw,40px);
          font-weight:700; color:#fff; line-height:1.1; margin-bottom:16px;
        }
        .rp-headline em { font-style:italic; color:#e8c97a; }

        .rp-desc {
          font-size:14px; font-weight:300; color:#64748b;
          line-height:1.7; max-width:360px; margin-bottom:40px;
        }

        .rp-steps { display:flex; flex-direction:column; gap:0; }
        .rp-step {
          display:flex; gap:16px; align-items:flex-start;
          padding:14px 0; border-bottom:1px solid rgba(255,255,255,.05);
          transition:opacity .3s;
        }
        .rp-step:last-child { border-bottom:none; }
        .rp-step--done   { opacity:.45; }
        .rp-step--future { opacity:.3; }
        .rp-step--active { opacity:1; }

        .rp-step-num {
          width:28px; height:28px; border-radius:8px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          font-size:11.5px; font-weight:600;
          transition:background .3s, border-color .3s, color .3s;
          margin-top:1px;
        }
        .rp-step-num--done {
          background:rgba(34,197,94,.15); border:1px solid rgba(34,197,94,.3); color:#22c55e;
        }
        .rp-step-num--active {
          background:rgba(201,168,76,.15); border:1px solid rgba(201,168,76,.3); color:#c9a84c;
        }
        .rp-step-num--future {
          background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); color:#475569;
        }

        .rp-step-text { display:flex; flex-direction:column; gap:2px; }
        .rp-step-label { font-size:13.5px; font-weight:500; color:rgba(255,255,255,.85); }
        .rp-step-sub   { font-size:12px; font-weight:300; color:#475569; }

        .rp-left-foot {
          position:relative; z-index:1; font-size:12px; font-weight:300; color:#334155;
          display:flex; align-items:center; gap:8px;
        }

        .rp-right {
          width:520px; flex-shrink:0; background:#faf8f5;
          display:flex; flex-direction:column; justify-content:center;
          padding:56px 52px; position:relative; overflow:hidden;
        }
        @media(max-width:900px){
          .rp-right{ width:100%; padding:40px 24px; padding-top:60px; justify-content:flex-start; }
        }

        .rp-right::before {
          content:''; position:absolute; top:-80px; right:-80px;
          width:400px; height:400px; border-radius:50%;
          background:radial-gradient(circle,rgba(180,83,9,.05) 0%,transparent 70%);
          pointer-events:none;
        }

        .rp-mobile-logo {
          display:none; align-items:center; gap:9px; margin-bottom:32px;
        }
        @media(max-width:900px){ .rp-mobile-logo{ display:flex; } }

        .rp-panel {
          position:relative; z-index:1;
          animation:rpIn .45s cubic-bezier(.4,0,.2,1) both;
        }
        @keyframes rpIn {
          from{ opacity:0; transform:translateY(16px); }
          to  { opacity:1; transform:translateY(0); }
        }

        .rp-eyebrow {
          font-size:11px; font-weight:500; letter-spacing:.16em; text-transform:uppercase;
          color:#b45309; margin-bottom:10px; display:flex; align-items:center; gap:7px;
        }
        .rp-title {
          font-family:'Lora',serif; font-size:26px; font-weight:700;
          color:#1a1a2e; line-height:1.15; margin-bottom:8px;
        }
        .rp-title em { font-style:italic; color:#b45309; }
        .rp-sub {
          font-size:13.5px; font-weight:300; color:#9a8a7a;
          line-height:1.6; margin-bottom:28px;
        }

        .rp-email-chip {
          display:inline-flex; align-items:center; gap:7px;
          font-size:12.5px; font-weight:400; color:#b45309;
          background:rgba(180,83,9,.07); border:1px solid rgba(180,83,9,.16);
          border-radius:100px; padding:5px 13px; margin-bottom:24px;
        }

        .rp-otp-row {
          display:flex; gap:10px; margin-bottom:22px; justify-content:center;
        }
        .rp-otp-box {
          width:52px; height:60px; border-radius:12px;
          background:#fff; border:1.5px solid #e5ddd3;
          font-family:'Lora',serif; font-size:22px; font-weight:700;
          color:#1a1a2e; text-align:center;
          outline:none; transition:border-color .2s,box-shadow .2s,background .2s;
          caret-color:#c9a84c;
        }
        .rp-otp-box::placeholder { color:#e5ddd3; }
        .rp-otp-box:focus {
          border-color:#c9a84c; box-shadow:0 0 0 3px rgba(201,168,76,.15);
          background:#fffdf9;
        }
        .rp-otp-box--filled {
          border-color:#c9a84c; background:#fffdf9; color:#1a1a2e;
        }
        .rp-otp-box--error {
          border-color:#ef4444 !important; box-shadow:0 0 0 3px rgba(239,68,68,.1) !important;
          animation:rpShake .3s ease;
        }
        @keyframes rpShake {
          0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)}
        }
        @media(max-width:400px){ .rp-otp-box{ width:42px; height:52px; font-size:18px; } }

        .rp-resend {
          font-size:13px; font-weight:300; color:#9a8a7a;
          text-align:center; margin-bottom:24px;
        }
        .rp-resend button {
          background:none; border:none; font-size:13px; font-weight:500;
          color:#b45309; cursor:pointer; transition:color .2s; padding:0;
        }
        .rp-resend button:hover { color:#92400e; }

        .rp-field { margin-bottom:18px; }
        .rp-label {
          display:block; font-size:12px; font-weight:500; color:#4a4a5a;
          margin-bottom:7px; letter-spacing:.02em;
        }
        .rp-input-wrap { position:relative; }
        .rp-input-icon {
          position:absolute; left:14px; top:50%; transform:translateY(-50%);
          color:#b5a090; display:flex; align-items:center; pointer-events:none;
        }
        .rp-input {
          width:100%; background:#fff; border:1.5px solid #e5ddd3; border-radius:10px;
          padding:13px 44px 13px 42px;
          font-family:'DM Sans',sans-serif; font-size:14px; color:#1a1a2e;
          outline:none; transition:border-color .2s,box-shadow .2s;
        }
        .rp-input::placeholder { color:#c8bfb5; }
        .rp-input:focus { border-color:#c9a84c; box-shadow:0 0 0 3px rgba(201,168,76,.14); }
        .rp-input--ok    { border-color:#22c55e !important; }
        .rp-input--error { border-color:#ef4444 !important; }

        .rp-toggle {
          position:absolute; right:13px; top:50%; transform:translateY(-50%);
          background:none; border:none; cursor:pointer; color:#b5a090;
          display:flex; align-items:center; padding:4px; transition:color .2s;
        }
        .rp-toggle:hover { color:#7a6a5a; }

        .rp-strength { margin-top:8px; }
        .rp-strength-track {
          height:3px; background:#ede8e0; border-radius:999px; overflow:hidden; margin-bottom:4px;
        }
        .rp-strength-fill {
          height:3px; border-radius:999px;
          transition:width .3s ease, background .3s ease;
        }
        .rp-strength-label {
          font-size:11.5px; font-weight:400;
          transition:color .3s;
        }

        .rp-match-msg {
          display:flex; align-items:center; gap:5px;
          font-size:12px; margin-top:6px; font-weight:400;
        }

        .rp-error-banner {
          display:flex; align-items:flex-start; gap:10px;
          background:#fff5f5; border:1px solid #fecaca; border-radius:10px;
          padding:13px 15px; margin-bottom:20px;
          font-size:13px; color:#b91c1c; line-height:1.5;
        }

        .rp-btn {
          width:100%; padding:14px;
          font-family:'DM Sans',sans-serif; font-size:14.5px; font-weight:500;
          color:#0f172a; background:#c9a84c; border:none; border-radius:10px;
          cursor:pointer; display:flex; align-items:center; justify-content:center; gap:9px;
          transition:background .2s,transform .15s,box-shadow .2s; margin-bottom:18px;
        }
        .rp-btn:hover:not(:disabled) {
          background:#e8c97a; transform:translateY(-1px); box-shadow:0 6px 20px rgba(201,168,76,.3);
        }
        .rp-btn:disabled { opacity:.5; cursor:not-allowed; }

        .rp-btn--dark {
          background:#1a1a2e; color:#fff;
        }
        .rp-btn--dark:hover:not(:disabled) {
          background:#0a0f1e; box-shadow:0 6px 20px rgba(0,0,0,.18);
        }

        .rp-back-btn {
          display:flex; align-items:center; justify-content:center; gap:7px;
          width:100%; background:none; border:none; cursor:pointer;
          font-size:13px; font-weight:400; color:#9a8a7a; transition:color .2s;
        }
        .rp-back-btn:hover { color:#1a1a2e; }

        .rp-spinner {
          width:16px; height:16px;
          border:2px solid rgba(15,23,42,.2); border-top-color:#0f172a;
          border-radius:50%; animation:rpSpin .7s linear infinite; flex-shrink:0;
        }
        @keyframes rpSpin { to{ transform:rotate(360deg); } }

        .rp-success {
          display:flex; flex-direction:column; align-items:center; text-align:center; gap:0;
          animation:rpIn .5s ease both;
        }
        .rp-success-icon {
          width:80px; height:80px; border-radius:50%; margin-bottom:24px;
          background:linear-gradient(135deg,rgba(201,168,76,.15),rgba(232,201,122,.1));
          border:2px solid rgba(201,168,76,.25);
          display:flex; align-items:center; justify-content:center;
          animation:rpPop .5s cubic-bezier(.34,1.56,.64,1) .1s both;
        }
        @keyframes rpPop {
          from{ transform:scale(.6); opacity:0; }
          to  { transform:scale(1); opacity:1; }
        }
        .rp-success-title {
          font-family:'Lora',serif; font-size:26px; font-weight:700; color:#1a1a2e; margin-bottom:10px;
        }
        .rp-success-desc {
          font-size:13.5px; font-weight:300; color:#7a6a5a; line-height:1.7;
          max-width:320px; margin-bottom:28px;
        }
        .rp-success-note {
          display:flex; align-items:center; gap:7px;
          font-size:12px; font-weight:300; color:#b5a090;
          background:#f5f1eb; border-radius:8px; padding:10px 14px;
          width:100%; justify-content:center; margin-bottom:28px;
        }
      `}</style>
        <PageTitle title="Reset Password" />
      <div className="rp-root">
        <div className="rp-left">
          <div className="rp-noise" aria-hidden="true" />
          <div className="rp-glow1" aria-hidden="true" />
          <div className="rp-glow2" aria-hidden="true" />

          <div className="rp-logo">
            <div className="rp-logo-mark">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L17 6v8l-7 4-7-4V6l7-4z" stroke="#0f172a" strokeWidth="1.6" strokeLinejoin="round"/>
                <path d="M10 10l7-4M10 10v8M10 10L3 6" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="rp-logo-name">Grade<span>Quest</span></span>
          </div>

          <div className="rp-left-body">
            <div className="rp-kicker">
              <span className="rp-kicker-dot" />
              Password reset
            </div>
            <h1 className="rp-headline">
              Almost there —
              <br />
              <em>new password,</em>
              <br />
              fresh start.
            </h1>
            <p className="rp-desc">
              Enter the 6-digit code from your inbox, then choose a strong new password for your admin account.
            </p>

            <div className="rp-steps">
              {steps.map((s, i) => {
                const status = i < stepIndex ? "done" : i === stepIndex ? "active" : "future";
                return (
                  <div key={s.label} className={`rp-step rp-step--${status}`}>
                    <div className={`rp-step-num rp-step-num--${status}`}>
                      {status === "done" ? (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l2.5 2.5 5.5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        `0${i + 1}`
                      )}
                    </div>
                    <div className="rp-step-text">
                      <span className="rp-step-label">{s.label}</span>
                      <span className="rp-step-sub">{s.sub}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rp-left-foot">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5L2 3.5v4c0 2.9 2.2 5.6 5 6.5 2.8-.9 5-3.6 5-6.5v-4L7 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
            Admin accounts only.
          </div>
        </div>

        <div className="rp-right">
          <div className="rp-mobile-logo">
            <div className="rp-logo-mark">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L17 6v8l-7 4-7-4V6l7-4z" stroke="#0f172a" strokeWidth="1.6" strokeLinejoin="round"/>
                <path d="M10 10l7-4M10 10v8M10 10L3 6" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="rp-logo-name">Grade<span>Quest</span></span>
          </div>

          {step === "otp" && (
            <div className="rp-panel" key="otp">
              <div className="rp-eyebrow">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M1 5l6 4 6-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Step 1 of 2
              </div>

              <h2 className="rp-title">
                Enter your
                <br />
                <em>reset code</em>
              </h2>

              <p className="rp-sub">We sent a 6-digit code to your inbox. It expires in 15 minutes.</p>

              {email && (
                <div className="rp-email-chip">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M1 5l6 4 6-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  {email}
                </div>
              )}

              {otpError && (
                <div className="rp-error-banner">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M8 5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  {otpError}
                </div>
              )}

              <form onSubmit={handleVerifyOtp}>
                <div className="rp-otp-row" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        otpRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      placeholder="·"
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className={`rp-otp-box${digit ? " rp-otp-box--filled" : ""}${otpError ? " rp-otp-box--error" : ""}`}
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>

                <div className="rp-resend">
                  Didn&apos;t get the code?{" "}
                  <button type="button" onClick={() => navigate("/forgot-password")}>
                    Resend it
                  </button>
                </div>

                <button type="submit" className="rp-btn" disabled={!otpComplete || otpLoading}>
                  {otpLoading ? (
                    <>
                      <span className="rp-spinner" />
                      Verifying code…
                    </>
                  ) : (
                    <>
                      Verify code
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <button className="rp-back-btn" onClick={() => navigate("/forgot-password")}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M13 7H1M7 13L1 7l6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back to forgot password
              </button>
            </div>
          )}

          {step === "password" && (
            <div className="rp-panel" key="password">
              <div className="rp-eyebrow">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M4 6V4a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.2"/>
                  <circle cx="7" cy="9.5" r="1" fill="currentColor"/>
                </svg>
                Step 2 of 2
              </div>

              <h2 className="rp-title">
                Set a <em>new password</em>
              </h2>

              <p className="rp-sub">Choose something strong. Minimum 8 characters.</p>

              {pwError && (
                <div className="rp-error-banner">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M8 5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  {pwError}
                </div>
              )}

              <form onSubmit={handleResetPassword}>
                <div className="rp-field">
                  <label className="rp-label" htmlFor="rp-pw">New password</label>
                  <div className="rp-input-wrap">
                    <span className="rp-input-icon">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="7" width="12" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.2"/>
                        <circle cx="8" cy="10.5" r="1" fill="currentColor"/>
                      </svg>
                    </span>

                    <input
                      id="rp-pw"
                      type={showPw ? "text" : "password"}
                      className="rp-input"
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPwError("");
                      }}
                      autoFocus
                      required
                    />

                    <button
                      type="button"
                      className="rp-toggle"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? "Hide" : "Show"}
                    >
                      {showPw ? (
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                          <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3"/>
                          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
                          <path d="M3 3l10 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                          <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3"/>
                          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
                        </svg>
                      )}
                    </button>
                  </div>

                  {password.length > 0 && (
                    <div className="rp-strength">
                      <div className="rp-strength-track">
                        <div
                          className="rp-strength-fill"
                          style={{ width: `${pwStrength * 25}%`, background: pwStrengthColor }}
                        />
                      </div>
                      <span className="rp-strength-label" style={{ color: pwStrengthColor }}>
                        {pwStrengthLabel}
                      </span>
                    </div>
                  )}
                </div>

                <div className="rp-field">
                  <label className="rp-label" htmlFor="rp-confirm">Confirm password</label>
                  <div className="rp-input-wrap">
                    <span className="rp-input-icon">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="7" width="12" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M6 10.5l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>

                    <input
                      id="rp-confirm"
                      type={showConfirm ? "text" : "password"}
                      className={`rp-input${pwMatch ? " rp-input--ok" : pwError2 ? " rp-input--error" : ""}`}
                      placeholder="Re-enter password"
                      value={confirm}
                      onChange={(e) => {
                        setConfirm(e.target.value);
                        setPwError("");
                      }}
                      required
                    />

                    <button
                      type="button"
                      className="rp-toggle"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? "Hide" : "Show"}
                    >
                      {showConfirm ? (
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                          <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3"/>
                          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
                          <path d="M3 3l10 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                          <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3"/>
                          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
                        </svg>
                      )}
                    </button>
                  </div>

                  {pwError2 && (
                    <div className="rp-match-msg" style={{ color: "#ef4444" }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M6 3.5v3M6 8v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                      {pwError2}
                    </div>
                  )}

                  {pwMatch && (
                    <div className="rp-match-msg" style={{ color: "#22c55e" }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Passwords match
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className={`rp-btn${pwLoading ? "" : " rp-btn--dark"}`}
                  style={pwReady && !pwLoading ? { background: "#c9a84c", color: "#0f172a" } : {}}
                  disabled={!pwReady || pwLoading}
                >
                  {pwLoading ? (
                    <>
                      <span className="rp-spinner" />
                      Resetting password…
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M4 6V4a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M5 9.5l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Reset password
                    </>
                  )}
                </button>
              </form>

              <button
                className="rp-back-btn"
                onClick={() => {
                  setStep("otp");
                  setOtp(["", "", "", "", "", ""]);
                  setPwError("");
                }}
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M13 7H1M7 13L1 7l6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back to code entry
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="rp-panel rp-success" key="done">
              <div className="rp-success-icon">
                <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
                  <path d="M6 18l8 8 16-16" stroke="#c9a84c" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <h2 className="rp-success-title">Password reset!</h2>

              <p className="rp-success-desc">
                Your admin password has been updated. You can now sign in with your new credentials.
              </p>

              <div className="rp-success-note">
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1.5L2 3.5v4c0 2.9 2.2 5.6 5 6.5 2.8-.9 5-3.6 5-6.5v-4L7 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                </svg>
                Your password has been changed successfully.
              </div>

              <button className="rp-btn" onClick={() => navigate("/login")}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Sign in now
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}