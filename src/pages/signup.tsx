import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import FrontendLoader from "../components/ui/FrontendLoader";
import { publicApi } from "../utils/axios";
import { setToken, setUser } from "../utils/token";
import PageTitle from "../components/PageTitle";

type RegisterPayload = {
  firstname: string;
  surname: string;
  email?: string | null;
  phone: string;
  school_name: string;
  address: string;
  password: string;
  password_confirmation: string;
};

type RegisterSuccess = {
  message: string;
  token: string;
  user: {
    id: number;
    firstname: string;
    email: string | null;
    reg_no: string;
    school_id: number;
    role: string;
  };
};

type FieldErrors = Partial<Record<keyof RegisterPayload, string>> & {
  general?: string;
};

/* ── Password strength ── */
function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "transparent" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: "Too short", color: "#ef4444" },
    { label: "Weak", color: "#f97316" },
    { label: "Fair", color: "#eab308" },
    { label: "Good", color: "#22c55e" },
    { label: "Strong", color: "#16a34a" },
  ];
  return { score, ...map[score] };
}

/* ✅ EyeIcon defined ONCE (top-level) */
function EyeIcon({ crossed }: { crossed: boolean }) {
  return crossed ? (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M3 3l10 10"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

/* ── Input field component ── */
interface FieldProps {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  icon: React.ReactNode;
  children: React.ReactElement;
}

function Field({ id, label, optional, hint, error, icon, children }: FieldProps) {
  return (
    <div className="sg-field" style={{ marginBottom: 16 }}>
      <label className="sg-label" htmlFor={id}>
        {label}
        {optional && <span className="sg-optional">optional</span>}
      </label>
      <div className="sg-input-wrap">
        <span className="sg-icon">{icon}</span>
        {children}
      </div>
      {error && (
        <p className="sg-err" role="alert">
          {error}
        </p>
      )}
      {!error && hint && <p className="sg-hint">{hint}</p>}
    </div>
  );
}

export default function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const [form, setForm] = useState<RegisterPayload>({
    school_name: "",
    firstname: "",
    surname: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    password_confirmation: "",
  });

  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  const strength = getStrength(form.password);

  const step1Valid = form.school_name.trim() && form.address.trim();
  const step2Valid = form.firstname.trim() && form.surname.trim() && form.phone.trim();

  const canSubmit = useMemo(
    () =>
      !!(
        step1Valid &&
        step2Valid &&
        form.password.length >= 8 &&
        form.password === form.password_confirmation
      ),
    [step1Valid, step2Valid, form.password, form.password_confirmation]
  );

  function set<K extends keyof RegisterPayload>(k: K, v: RegisterPayload[K]) {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined, general: undefined }));
  }

  function mapErrors(data: any): FieldErrors {
    const out: FieldErrors = {};
    const bag = data?.errors || {};
    (Object.keys(bag) as Array<keyof RegisterPayload>).forEach((k) => {
      out[k] = Array.isArray(bag[k]) ? bag[k][0] : String(bag[k]);
    });
    if (data?.message && !Object.keys(out).length) out.general = data.message;
    return out;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setErrors({});
    try {
      const payload: RegisterPayload = {
        firstname: form.firstname.trim(),
        surname: form.surname.trim(),
        email: form.email?.trim() || null,
        phone: form.phone.trim(),
        school_name: form.school_name.trim(),
        address: form.address.trim(),
        password: form.password,
        password_confirmation: form.password_confirmation,
      };
      const res = await publicApi.post<RegisterSuccess>("/register", payload);
      setToken(res.data.token);
      setUser(res.data.user);
      navigate("/dashboard");
    } catch (err: any) {
      const errs = mapErrors(err?.response?.data);
      setErrors(errs);
      const step1Keys: (keyof RegisterPayload)[] = ["school_name", "address"];
      if (step1Keys.some((k) => errs[k])) setStep(1);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <FrontendLoader />;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .sg-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          font-family: 'DM Sans', sans-serif;
          background: #0a0f1e;
        }
        @media (max-width: 900px) {
          .sg-page { grid-template-columns: 1fr; }
          .sg-left  { display: none !important; }
        }

        /* ══════════ LEFT ══════════ */
        .sg-left {
          position: relative;
          background: #0a0f1e;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px 52px;
          overflow: hidden;
        }
        .sg-left::before {
          content: '';
          position: absolute; inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
        }
        .sg-left::after {
          content: '';
          position: absolute;
          top: -80px; right: -80px;
          width: 480px; height: 480px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 65%);
          pointer-events: none;
        }

        .sg-orbit {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%,-50%);
          border-radius: 50%;
          border: 1px solid rgba(201,168,76,0.06);
          pointer-events: none;
          animation: sgSpin linear infinite;
        }
        .sg-orbit:nth-child(1) { width: 340px; height: 340px; animation-duration: 34s; }
        .sg-orbit:nth-child(2) { width: 500px; height: 500px; animation-duration: 55s; animation-direction:reverse; border-color:rgba(99,102,241,0.04); }
        .sg-orbit:nth-child(3) { width: 680px; height: 680px; animation-duration: 85s; border-color:rgba(255,255,255,0.02); }
        .sg-orbit-dot { position:absolute; top:-4px; left:50%; transform:translateX(-50%); width:8px; height:8px; border-radius:50%; background:#c9a84c; box-shadow:0 0 10px rgba(201,168,76,0.7); }

        @keyframes sgSpin {
          from { transform: translate(-50%,-50%) rotate(0deg); }
          to   { transform: translate(-50%,-50%) rotate(360deg); }
        }

        .sg-left-logo {
          display: inline-flex; align-items: center; gap: 11px;
          text-decoration: none; position: relative; z-index: 1;
        }
        .sg-mark {
          width: 40px; height: 40px; border-radius: 10px;
          background: linear-gradient(135deg, #c9a84c, #e8c97a);
          display: flex; align-items: center; justify-content: center;
        }
        .sg-mark-name {
          font-family: 'Lora', serif; font-size: 22px; font-weight: 700;
          color: #fff; letter-spacing: -0.01em;
        }
        .sg-mark-pill {
          font-size: 9px; font-weight: 500; letter-spacing: 0.1em;
          text-transform: uppercase; color: #c9a84c;
          background: rgba(201,168,76,0.12); border: 1px solid rgba(201,168,76,0.25);
          border-radius: 100px; padding: 2px 7px;
        }

        .sg-left-body { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 48px 0 32px; }

        .sg-left-headline {
          font-family: 'Lora', serif; font-size: clamp(28px,2.8vw,42px);
          font-weight: 700; color: #fff; line-height: 1.1; margin-bottom: 16px;
        }
        .sg-left-headline em { font-style: italic; color: #e8c97a; }

        .sg-left-sub {
          font-size: 14.5px; font-weight: 300; color: #64748b;
          line-height: 1.8; max-width: 320px; margin-bottom: 44px;
        }

        /* Steps timeline on left */
        .sg-steps { display: flex; flex-direction: column; gap: 0; }

        .sg-step {
          display: flex; gap: 16px; align-items: flex-start;
          padding-bottom: 28px; position: relative;
        }
        .sg-step:last-child { padding-bottom: 0; }

        /* Vertical connector */
        .sg-step:not(:last-child)::after {
          content: '';
          position: absolute;
          left: 15px; top: 32px;
          width: 1px; bottom: 0;
          background: rgba(201,168,76,0.15);
        }

        .sg-step-num {
          width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Lora', serif; font-size: 12px; font-weight: 700;
          transition: background 0.3s, color 0.3s, border-color 0.3s;
        }

        .sg-step-num--done {
          background: rgba(201,168,76,0.15);
          border: 1.5px solid rgba(201,168,76,0.4);
          color: #c9a84c;
        }
        .sg-step-num--active {
          background: #c9a84c;
          border: 1.5px solid #c9a84c;
          color: #0a0f1e;
        }
        .sg-step-num--pending {
          background: transparent;
          border: 1.5px solid rgba(255,255,255,0.1);
          color: #334155;
        }

        .sg-step-info { padding-top: 4px; }
        .sg-step-title {
          font-size: 13.5px; font-weight: 500;
          color: #94a3b8; margin-bottom: 2px;
          transition: color 0.3s;
        }
        .sg-step-title--active { color: #e2e8f0; }
        .sg-step-desc { font-size: 12px; font-weight: 300; color: #475569; }

        /* Left footer quote */
        .sg-left-quote { position: relative; z-index: 1; }
        .sg-quote-text { font-family: 'Lora', serif; font-style: italic; font-size: 13.5px; color: #475569; line-height: 1.7; margin-bottom: 8px; }
        .sg-quote-author { font-size: 11.5px; color: #334155; }
        .sg-quote-line { display: inline-block; width: 18px; height: 1px; background: #c9a84c; opacity: 0.5; vertical-align: middle; margin-right: 7px; }

        /* ══════════ RIGHT ══════════ */
        .sg-right {
          background: #faf8f5;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 40px 40px 60px;
          position: relative; overflow: hidden;
        }
        .sg-right::before {
          content: '';
          position: absolute; top: -80px; right: -80px;
          width: 400px; height: 400px; border-radius: 50%;
          background: radial-gradient(circle, rgba(180,83,9,0.05) 0%, transparent 70%);
          pointer-events: none;
        }
        .sg-right::after {
          content: '';
          position: absolute; bottom: -60px; left: -60px;
          width: 300px; height: 300px; border-radius: 50%;
          background: radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%);
          pointer-events: none;
        }

        .sg-form-wrap {
          width: 100%; max-width: 440px;
          position: relative; z-index: 1;
          animation: sgFormIn 0.6s cubic-bezier(0.4,0,0.2,1) both;
        }
        @keyframes sgFormIn {
          from { opacity:0; transform: translateY(20px); }
          to   { opacity:1; transform: translateY(0); }
        }

        /* Mobile logo */
        .sg-mobile-logo {
          display: none; align-items: center; gap: 10px;
          text-decoration: none; margin-bottom: 32px;
        }
        @media (max-width: 900px) { .sg-mobile-logo { display: flex; } }

        /* Step pill */
        .sg-step-pill {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 500; letter-spacing: 0.18em;
          text-transform: uppercase; color: #b45309;
          margin-bottom: 10px;
        }
        .sg-step-pill-line { display: block; width: 22px; height: 1px; background: #d97706; opacity: 0.6; }

        .sg-form-title {
          font-family: 'Lora', serif; font-size: 26px; font-weight: 700;
          color: #1a1a2e; line-height: 1.15; margin-bottom: 6px;
        }
        .sg-form-title em { font-style: italic; color: #b45309; }

        .sg-form-sub {
          font-size: 13.5px; font-weight: 300; color: #7a6a5a;
          margin-bottom: 28px; line-height: 1.65;
        }

        /* Step progress dots */
        .sg-dots {
          display: flex; align-items: center; gap: 6px; margin-bottom: 28px;
        }
        .sg-dot {
          height: 3px; border-radius: 100px;
          transition: width 0.3s ease, background 0.3s ease;
        }
        .sg-dot--active   { width: 28px; background: #c9a84c; }
        .sg-dot--done     { width: 16px; background: #d97706; }
        .sg-dot--pending  { width: 16px; background: #e5ddd3; }

        /* Error banner */
        .sg-error-banner {
          display: flex; align-items: flex-start; gap: 10px;
          background: #fef2f2; border: 1px solid #fecaca;
          border-radius: 8px; padding: 11px 14px;
          margin-bottom: 18px; font-size: 13.5px; color: #b91c1c;
          line-height: 1.5; animation: sgShake 0.35s ease;
        }
        @keyframes sgShake {
          0%,100% { transform:translateX(0); }
          25% { transform:translateX(-5px); }
          75% { transform:translateX(5px); }
        }

        /* Fields */
        .sg-label {
          display: flex; align-items: center; gap: 6px;
          font-size: 12.5px; font-weight: 500; color: #4a4a5a;
          margin-bottom: 7px; letter-spacing: 0.02em;
        }
        .sg-optional {
          font-size: 10.5px; font-weight: 400; color: #b5a090;
          background: #f0ebe3; border-radius: 100px; padding: 1px 7px;
        }
        .sg-input-wrap { position: relative; }
        .sg-icon {
          position: absolute; left: 13px; top: 50%;
          transform: translateY(-50%);
          color: #b5a090; pointer-events: none;
          display: flex; align-items: center;
        }
        .sg-input {
          width: 100%; background: #fff;
          border: 1.5px solid #e5ddd3; border-radius: 9px;
          padding: 11px 13px 11px 40px;
          font-family: 'DM Sans', sans-serif; font-size: 13.5px;
          font-weight: 400; color: #1a1a2e; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          -webkit-appearance: none;
        }
        .sg-input::placeholder { color: #bdb3a8; }
        .sg-input:focus { border-color: #c9a84c; box-shadow: 0 0 0 3px rgba(201,168,76,0.12); }
        .sg-input--err { border-color: #fca5a5 !important; box-shadow: 0 0 0 3px rgba(239,68,68,0.08) !important; }

        .sg-pw-toggle {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: #b5a090; display: flex; align-items: center; padding: 4px;
          transition: color 0.2s;
        }
        .sg-pw-toggle:hover { color: #7a6a5a; }

        .sg-hint { font-size: 11.5px; font-weight: 300; color: #b5a090; margin-top: 5px; line-height: 1.5; }
        .sg-err  { font-size: 12px; color: #ef4444; margin-top: 5px; }

        /* Password strength */
        .sg-strength { margin-top: 8px; }
        .sg-strength-bar { display: flex; gap: 4px; margin-bottom: 4px; }
        .sg-strength-seg {
          flex: 1; height: 3px; border-radius: 100px;
          background: #e5ddd3;
          transition: background 0.3s;
        }
        .sg-strength-label { font-size: 11px; color: #9a8a7a; }

        /* Two-col grid */
        .sg-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        /* Buttons */
        .sg-btn-row { display: flex; gap: 10px; margin-top: 6px; }

        .sg-btn-back {
          padding: 12px 18px;
          font-family: 'DM Sans', sans-serif; font-size: 13.5px;
          font-weight: 400; color: #7a6a5a;
          background: transparent; border: 1.5px solid #e5ddd3;
          border-radius: 9px; cursor: pointer; white-space: nowrap;
          transition: background 0.2s, border-color 0.2s;
          display: flex; align-items: center; gap: 6px;
        }
        .sg-btn-back:hover { background: #f0ebe3; border-color: #d4c9bc; }

        .sg-btn-next, .sg-btn-submit {
          flex: 1; padding: 12px 20px;
          font-family: 'DM Sans', sans-serif; font-size: 14px;
          font-weight: 500; color: #fff;
          background: #1a1a2e; border: none;
          border-radius: 9px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
        }
        .sg-btn-next:hover:not(:disabled),
        .sg-btn-submit:hover:not(:disabled) {
          background: #0a0f1e;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        }
        .sg-btn-next:disabled,
        .sg-btn-submit:disabled { opacity: 0.55; cursor: not-allowed; }

        .sg-spinner {
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff; border-radius: 50%;
          animation: sgSpinAnim 0.7s linear infinite; flex-shrink: 0;
        }
        @keyframes sgSpinAnim { to { transform: rotate(360deg); } }

        /* Divider */
        .sg-divider {
          display: flex; align-items: center; gap: 10px;
          margin: 20px 0 14px;
        }
        .sg-divider-line { flex: 1; height: 1px; background: #e5ddd3; }
        .sg-divider-text { font-size: 11.5px; color: #b5a090; white-space: nowrap; }

        /* Trust chips */
        .sg-trust { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
        .sg-trust-chip {
          display: flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 300; color: #9a8a7a;
          background: #f0ebe3; border-radius: 100px; padding: 3px 10px;
        }
        .sg-trust-chip svg { color: #b45309; }

        /* Login link */
        .sg-login-link {
          text-align: center; font-size: 13px;
          font-weight: 300; color: #9a8a7a;
        }
        .sg-login-link a {
          color: #b45309; font-weight: 500;
          text-decoration: none; transition: color 0.2s;
        }
        .sg-login-link a:hover { color: #92400e; }

        /* Right footer */
        .sg-right-footer {
          position: absolute; bottom: 20px; left: 0; right: 0;
          text-align: center; font-size: 11px; font-weight: 300; color: #c8bfb5; z-index: 1;
        }
        .sg-right-footer a { color: #b5a090; text-decoration: none; }
        .sg-right-footer a:hover { color: #7a6a5a; }

        /* Slide animations for step transitions */
        .sg-step-panel {
          animation: sgSlideIn 0.4s cubic-bezier(0.4,0,0.2,1) both;
        }
        @keyframes sgSlideIn {
          from { opacity:0; transform: translateX(16px); }
          to   { opacity:1; transform: translateX(0); }
        }
      `}</style>
  <PageTitle title="Signup" />
     <div className="sg-page">
    
            {/* ══ LEFT PANEL ══ */}
            <div className="sg-left" style={{ display: 'flex' }}>
              <div className="sg-orbit"><div className="sg-orbit-dot" /></div>
              <div className="sg-orbit" />
              <div className="sg-orbit" />
    
              {/* Logo */}
              <a href="/" className="sg-left-logo">
                <span className="sg-mark">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <polygon points="12,2 22,19 2,19" stroke="#0a0f1e" strokeWidth="2"
                      strokeLinejoin="round" fill="none"/>
                    <path d="M12 8v5M12 15.5v.5" stroke="#0a0f1e" strokeWidth="2.2" strokeLinecap="round"/>
                  </svg>
                </span>
                <span className="sg-mark-name">GradeQuest</span>
                <span className="sg-mark-pill">AI</span>
              </a>
    
              {/* Body */}
              <div className="sg-left-body">
                <h1 className="sg-left-headline">
                  Get your school<br />
                  <em>set up in minutes.</em>
                </h1>
                <p className="sg-left-sub">
                  Join 500+ Nigerian schools already running smarter
                  with GradeQuest. No setup fee. No long contracts.
                </p>
    
                {/* Progress steps */}
                <div className="sg-steps">
                  {[
                    { num: "1", title: "School details", desc: "Name, address & location" },
                    { num: "2", title: "Admin account",  desc: "Your name, phone & email" },
                    { num: "3", title: "Set password",   desc: "Secure your account" },
                  ].map((s, i) => {
                    const activeStep = i + 1;
                    const state = step > activeStep ? "done" : step === activeStep ? "active" : "pending";
                    return (
                      <div className="sg-step" key={s.num}>
                        <div className={`sg-step-num sg-step-num--${state}`}>
                          {state === "done" ? (
                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                              <path d="M2 7l3.5 3.5 6.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : s.num}
                        </div>
                        <div className="sg-step-info">
                          <p className={`sg-step-title ${state === "active" ? "sg-step-title--active" : ""}`}>{s.title}</p>
                          <p className="sg-step-desc">{s.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
    
              {/* Quote */}
              <div className="sg-left-quote">
                <p className="sg-quote-text">
                  "Onboarding was seamless. Our data was migrated in one day and staff were trained the same week."
                </p>
                <span className="sg-quote-author">
                  <span className="sg-quote-line" />
                  Dr. Seun Fashola · Heritage International School, PH
                </span>
              </div>
            </div>
    
            {/* ══ RIGHT PANEL ══ */}
            <div className="sg-right">
              <div className="sg-form-wrap">
    
                {/* Mobile logo */}
                <a href="/" className="sg-mobile-logo">
                  <span className="sg-mark" style={{ width: 34, height: 34, borderRadius: 9 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <polygon points="12,2 22,19 2,19" stroke="#0a0f1e" strokeWidth="2"
                        strokeLinejoin="round" fill="none"/>
                      <path d="M12 8v5M12 15.5v.5" stroke="#0a0f1e" strokeWidth="2.2" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <span style={{ fontFamily: "'Lora',serif", fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>GradeQuest</span>
                </a>
    
                {/* Step indicator dots */}
                <div className="sg-dots">
                  {[1, 2].map(n => (
                    <div key={n} className={`sg-dot sg-dot--${step === n ? "active" : step > n ? "done" : "pending"}`} />
                  ))}
                </div>
    
                {/* Error banner */}
                {errors.general && (
                  <div className="sg-error-banner" role="alert">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                      <circle cx="8" cy="8" r="7" stroke="#b91c1c" strokeWidth="1.4"/>
                      <path d="M8 5v3.5M8 10.5v.5" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    {errors.general}
                  </div>
                )}
    
                <form onSubmit={handleSubmit} noValidate>
    
                  {/* ─── STEP 1 ─── */}
                  {step === 1 && (
                    <div className="sg-step-panel" key="step1">
                      <div className="sg-step-pill">
                        <span className="sg-step-pill-line" />
                        Step 1 of 2
                      </div>
                      <h2 className="sg-form-title">
                        Tell us about<br />
                        <em>your school.</em>
                      </h2>
                      <p className="sg-form-sub">
                        This information will be used to set up your school's profile.
                      </p>
    
                      <Field
                        id="school_name" label="School Name"
                        error={errors.school_name}
                        icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 6.5L8 2l6 4.5V14H2V6.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><rect x="5.5" y="9" width="2" height="5" rx="0.5" fill="currentColor" opacity="0.4"/><rect x="8.5" y="9" width="2" height="5" rx="0.5" fill="currentColor" opacity="0.4"/></svg>}
                      >
                        <input id="school_name" type="text" className={`sg-input ${errors.school_name ? "sg-input--err" : ""}`}
                          placeholder="e.g. Bright Future Academy"
                          value={form.school_name} onChange={e => set("school_name", e.target.value)}
                          autoFocus/>
                      </Field>
    
                      <Field
                        id="address" label="School Address"
                        error={errors.address}
                        hint="Full address — used on report cards and official documents."
                        icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6c0 4 4.5 8.5 4.5 8.5S12.5 10 12.5 6c0-2.485-2.015-4.5-4.5-4.5z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="6" r="1.5" fill="currentColor" opacity="0.5"/></svg>}
                      >
                        <input id="address" type="text" className={`sg-input ${errors.address ? "sg-input--err" : ""}`}
                          placeholder="e.g. 12 Allen Avenue, Ikeja, Lagos"
                          value={form.address} onChange={e => set("address", e.target.value)}/>
                      </Field>
    
                      <div className="sg-btn-row">
                        <button
                          type="button"
                          className="sg-btn-next"
                          disabled={!step1Valid}
                          onClick={() => setStep(2)}
                        >
                          Continue
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                            <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
    
                  {/* ─── STEP 2 ─── */}
                  {step === 2 && (
                    <div className="sg-step-panel" key="step2">
                      <div className="sg-step-pill">
                        <span className="sg-step-pill-line" />
                        Step 2 of 2
                      </div>
                      <h2 className="sg-form-title">
                        Create your<br />
                        <em>admin account.</em>
                      </h2>
                      <p className="sg-form-sub">
                        This will be the primary Super-Admin account for <strong style={{ color: "#4a4a5a" }}>{form.school_name || "your school"}</strong>.
                      </p>
    
                      {/* Name row */}
                      <div className="sg-row2">
                        <Field
                          id="firstname" label="First Name"
                          error={errors.firstname}
                          icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
                        >
                          <input id="firstname" type="text" className={`sg-input ${errors.firstname ? "sg-input--err" : ""}`}
                            placeholder="e.g. Mausi"
                            value={form.firstname} onChange={e => set("firstname", e.target.value)} autoFocus/>
                        </Field>
                        <Field
                          id="surname" label="Surname"
                          error={errors.surname}
                          icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
                        >
                          <input id="surname" type="text" className={`sg-input ${errors.surname ? "sg-input--err" : ""}`}
                            placeholder="e.g. Tokunbo"
                            value={form.surname} onChange={e => set("surname", e.target.value)}/>
                        </Field>
                      </div>
    
                      <Field
                        id="phone" label="Phone Number"
                        error={errors.phone}
                        icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 1h3l1.5 3.5-1.5 1.5a9 9 0 004 4l1.5-1.5L15 10v3c0 1.1-.9 2-2 2A12 12 0 011 3c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>}
                      >
                        <input id="phone" type="tel" className={`sg-input ${errors.phone ? "sg-input--err" : ""}`}
                          placeholder="+234 800 000 0000"
                          value={form.phone} onChange={e => set("phone", e.target.value)}/>
                      </Field>
    
                      <Field
                        id="email" label="Email Address" optional
                        error={errors.email}
                        hint="We'll send a verification link if you provide this."
                        icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M1 6l7 4 7-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
                      >
                        <input id="email" type="email" className={`sg-input ${errors.email ? "sg-input--err" : ""}`}
                          placeholder="admin@school.com"
                          value={form.email ?? ""} onChange={e => set("email", e.target.value)}/>
                      </Field>
    
                      <Field
                        id="password" label="Password"
                        error={errors.password}
                        icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="7" width="12" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="10.5" r="1" fill="currentColor"/></svg>}
                      >
                        <>
                          <input id="password" type={showPw ? "text" : "password"}
                            className={`sg-input ${errors.password ? "sg-input--err" : ""}`}
                            placeholder="Min. 8 characters" style={{ paddingRight: 40 }}
                            value={form.password} onChange={e => set("password", e.target.value)}/>
                          <button type="button" className="sg-pw-toggle" onClick={() => setShowPw(v => !v)} aria-label={showPw ? "Hide" : "Show"}>
                            <EyeIcon crossed={showPw} />
                          </button>
                        </>
                      </Field>
    
                      {/* Strength meter */}
                      {form.password && (
                        <div className="sg-strength" style={{ marginTop: -10, marginBottom: 14 }}>
                          <div className="sg-strength-bar">
                            {[1,2,3,4].map(n => (
                              <div key={n} className="sg-strength-seg"
                                style={{ background: n <= strength.score ? strength.color : "#e5ddd3" }}/>
                            ))}
                          </div>
                          <span className="sg-strength-label" style={{ color: strength.color || "#9a8a7a" }}>
                            {strength.label}
                          </span>
                        </div>
                      )}
    
                      <Field
                        id="password_confirmation" label="Confirm Password"
                        error={
                          errors.password_confirmation ||
                          (form.password_confirmation && form.password !== form.password_confirmation
                            ? "Passwords do not match." : undefined)
                        }
                        icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="7" width="12" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.2"/><path d="M6 10.5l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      >
                        <>
                          <input id="password_confirmation" type={showPw2 ? "text" : "password"}
                            className={`sg-input ${(errors.password_confirmation || (form.password_confirmation && form.password !== form.password_confirmation)) ? "sg-input--err" : ""}`}
                            placeholder="••••••••" style={{ paddingRight: 40 }}
                            value={form.password_confirmation} onChange={e => set("password_confirmation", e.target.value)}/>
                          <button type="button" className="sg-pw-toggle" onClick={() => setShowPw2(v => !v)} aria-label={showPw2 ? "Hide" : "Show"}>
                            <EyeIcon crossed={showPw2} />
                          </button>
                        </>
                      </Field>
    
                      <div className="sg-btn-row">
                        <button type="button" className="sg-btn-back" onClick={() => setStep(1)}>
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                            <path d="M13 7H1M7 13L1 7l6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Back
                        </button>
                        <button type="submit" className="sg-btn-submit" disabled={!canSubmit || submitting}>
                          {submitting ? (
                            <><span className="sg-spinner" /> Creating account…</>
                          ) : (
                            <>Create Account <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg></>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
    
                <div className="sg-divider">
                  <span className="sg-divider-line" />
                  <span className="sg-divider-text">Trusted & secure</span>
                  <span className="sg-divider-line" />
                </div>
    
                <div className="sg-trust">
                  {["No credit card", "Free 14-day trial", "NDPR compliant"].map(t => (
                    <span className="sg-trust-chip" key={t}>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M1.5 6l2.5 2.5 6.5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {t}
                    </span>
                  ))}
                </div>
    
                <p className="sg-login-link">
                  Already have an account?{" "}
                  <Link to="/login">Sign in →</Link>
                </p>
              </div>
    
              <div className="sg-right-footer">
                <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · © {new Date().getFullYear()} GradeQuest
              </div>
            </div>
    
          </div>
    </>
  );
}