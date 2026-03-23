import { useState, useEffect } from "react";
import FrontendLoader from "../components/ui/FrontendLoader";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import { setToken, setUser } from "../utils/token";
import PageTitle from "../components/PageTitle";

export default function Login() {
  const [loading, setLoading]           = useState(true);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPass, setShowPass]         = useState(false);
  const [error, setError]               = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  if (loading) return <FrontendLoader />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setButtonLoading(true);
    try {
      const response = await api.post("/login", { identifier: email, password });
      const { access_token, user } = response.data;
      setToken(access_token);
      setUser(user);
      switch (user.role) {
        case "Admin": case "Super-Admin": case "Teacher":
        case "Student": case "Parent": case "Bursar":
          navigate("/dashboard"); break;
        default: navigate("/unauthorized");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setButtonLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .lg-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          font-family: 'DM Sans', sans-serif;
          background: #0a0f1e;
        }

        @media (max-width: 900px) {
          .lg-page { grid-template-columns: 1fr; }
          .lg-left  { display: none; }
        }

        /* ══════════════════════════════
           LEFT PANEL
        ══════════════════════════════ */
        .lg-left {
          position: relative;
          background: #0a0f1e;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px 52px;
          overflow: hidden;
        }

        /* Dot grid */
        .lg-left::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
        }

        /* Gold glow */
        .lg-left::after {
          content: '';
          position: absolute;
          bottom: -100px; left: -100px;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 65%);
          pointer-events: none;
        }

        /* Orbit rings */
        .lg-orbit {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          border: 1px solid rgba(201,168,76,0.06);
          pointer-events: none;
          animation: lgSpin linear infinite;
        }

        .lg-orbit:nth-child(1) { width: 340px; height: 340px; animation-duration: 32s; }
        .lg-orbit:nth-child(2) { width: 500px; height: 500px; animation-duration: 52s; animation-direction: reverse; border-color: rgba(99,102,241,0.04); }
        .lg-orbit:nth-child(3) { width: 680px; height: 680px; animation-duration: 80s; border-color: rgba(255,255,255,0.025); }

        @keyframes lgSpin {
          from { transform: translate(-50%,-50%) rotate(0deg); }
          to   { transform: translate(-50%,-50%) rotate(360deg); }
        }

        /* Orbit dot on ring 1 */
        .lg-orbit-dot {
          position: absolute;
          top: -4px; left: 50%;
          transform: translateX(-50%);
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #c9a84c;
          box-shadow: 0 0 10px rgba(201,168,76,0.7);
        }

        /* Left content */
        .lg-left-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          flex: 1;
          padding: 60px 0 40px;
        }

        .lg-left-logo {
          display: inline-flex;
          align-items: center;
          gap: 11px;
          text-decoration: none;
          position: relative;
          z-index: 1;
        }

        .lg-left-mark {
          width: 40px; height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #c9a84c, #e8c97a);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lg-left-name {
          font-family: 'Lora', serif;
          font-size: 22px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.01em;
        }

        .lg-left-pill {
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #c9a84c;
          background: rgba(201,168,76,0.12);
          border: 1px solid rgba(201,168,76,0.25);
          border-radius: 100px;
          padding: 2px 7px;
        }

        .lg-headline {
          font-family: 'Lora', Georgia, serif;
          font-size: clamp(30px, 3vw, 44px);
          font-weight: 700;
          color: #fff;
          line-height: 1.1;
          margin: 56px 0 18px;
        }

        .lg-headline em {
          font-style: italic;
          color: #e8c97a;
        }

        .lg-tagline {
          font-size: 15px;
          font-weight: 300;
          color: #64748b;
          line-height: 1.8;
          max-width: 340px;
          margin-bottom: 48px;
        }

        /* Feature chips */
        .lg-chips {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .lg-chip {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13.5px;
          font-weight: 400;
          color: #94a3b8;
        }

        .lg-chip-icon {
          width: 34px; height: 34px;
          border-radius: 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #c9a84c;
          flex-shrink: 0;
        }

        /* Bottom quote */
        .lg-left-quote {
          position: relative;
          z-index: 1;
        }

        .lg-quote-text {
          font-family: 'Lora', serif;
          font-style: italic;
          font-size: 14px;
          color: #475569;
          line-height: 1.7;
          margin-bottom: 10px;
        }

        .lg-quote-author {
          font-size: 12px;
          font-weight: 400;
          color: #334155;
        }

        .lg-quote-line {
          display: inline-block;
          width: 20px; height: 1px;
          background: #c9a84c;
          opacity: 0.5;
          vertical-align: middle;
          margin-right: 8px;
        }

        /* ══════════════════════════════
           RIGHT PANEL
        ══════════════════════════════ */
        .lg-right {
          background: #faf8f5;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 40px;
          position: relative;
          overflow: hidden;
        }

        /* Warm ambient glow */
        .lg-right::before {
          content: '';
          position: absolute;
          top: -80px; right: -80px;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(180,83,9,0.05) 0%, transparent 70%);
          pointer-events: none;
        }

        .lg-right::after {
          content: '';
          position: absolute;
          bottom: -60px; left: -60px;
          width: 300px; height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%);
          pointer-events: none;
        }

        /* Form card */
        .lg-form-wrap {
          width: 100%;
          max-width: 420px;
          position: relative;
          z-index: 1;
          animation: lgFormIn 0.6s cubic-bezier(0.4,0,0.2,1) both;
        }

        @keyframes lgFormIn {
          from { opacity:0; transform: translateY(20px); }
          to   { opacity:1; transform: translateY(0); }
        }

        /* Mobile logo */
        .lg-mobile-logo {
          display: none;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          margin-bottom: 36px;
        }

        @media (max-width: 900px) {
          .lg-mobile-logo { display: flex; }
        }

        .lg-form-eyebrow {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #b45309;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .lg-form-eyebrow-line {
          display: block;
          width: 22px; height: 1px;
          background: #d97706;
          opacity: 0.6;
        }

        .lg-form-title {
          font-family: 'Lora', Georgia, serif;
          font-size: 28px;
          font-weight: 700;
          color: #1a1a2e;
          line-height: 1.15;
          margin-bottom: 8px;
        }

        .lg-form-title em {
          font-style: italic;
          color: #b45309;
        }

        .lg-form-sub {
          font-size: 14px;
          font-weight: 300;
          color: #7a6a5a;
          margin-bottom: 36px;
          line-height: 1.6;
        }

        /* Error */
        .lg-error {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 20px;
          font-size: 13.5px;
          color: #b91c1c;
          line-height: 1.5;
          animation: lgShake 0.35s ease;
        }

        @keyframes lgShake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .lg-error-icon { flex-shrink: 0; margin-top: 1px; }

        /* Field */
        .lg-field {
          margin-bottom: 18px;
        }

        .lg-label {
          display: block;
          font-size: 12.5px;
          font-weight: 500;
          color: #4a4a5a;
          margin-bottom: 7px;
          letter-spacing: 0.02em;
        }

        .lg-input-wrap {
          position: relative;
        }

        .lg-input-icon {
          position: absolute;
          left: 14px; top: 50%;
          transform: translateY(-50%);
          color: #b5a090;
          pointer-events: none;
          display: flex;
          align-items: center;
        }

        .lg-input {
          width: 100%;
          background: #ffffff;
          border: 1.5px solid #e5ddd3;
          border-radius: 9px;
          padding: 12px 14px 12px 42px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: #1a1a2e;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          -webkit-appearance: none;
        }

        .lg-input::placeholder { color: #bdb3a8; }

        .lg-input:focus {
          border-color: #c9a84c;
          box-shadow: 0 0 0 3px rgba(201,168,76,0.12);
        }

        .lg-input:focus + .lg-input-focus-ring { opacity: 1; }

        /* Password toggle */
        .lg-pass-toggle {
          position: absolute;
          right: 13px; top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #b5a090;
          display: flex;
          align-items: center;
          padding: 4px;
          transition: color 0.2s;
        }

        .lg-pass-toggle:hover { color: #7a6a5a; }

        /* Remember + forgot row */
        .lg-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          gap: 12px;
        }

        .lg-check-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          user-select: none;
        }

        .lg-check {
          width: 16px; height: 16px;
          border: 1.5px solid #e5ddd3;
          border-radius: 4px;
          background: #fff;
          accent-color: #c9a84c;
          cursor: pointer;
        }

        .lg-check-label {
          font-size: 13px;
          font-weight: 300;
          color: #7a6a5a;
        }

        .lg-forgot {
          font-size: 13px;
          font-weight: 500;
          color: #b45309;
          text-decoration: none;
          white-space: nowrap;
          transition: color 0.2s;
        }

        .lg-forgot:hover { color: #92400e; }

        /* Submit button */
        .lg-submit {
          width: 100%;
          padding: 13px 20px;
          background: #1a1a2e;
          color: #ffffff;
          font-family: 'DM Sans', sans-serif;
          font-size: 14.5px;
          font-weight: 500;
          border: none;
          border-radius: 9px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
          margin-bottom: 20px;
          letter-spacing: 0.01em;
        }

        .lg-submit:hover:not(:disabled) {
          background: #0a0f1e;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        }

        .lg-submit:disabled {
          opacity: 0.75;
          cursor: not-allowed;
        }

        /* Spinner */
        .lg-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: lgSpin 0.7s linear infinite;
          flex-shrink: 0;
        }

        @keyframes lgSpin {
          to { transform: rotate(360deg); }
        }

        /* Divider */
        .lg-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .lg-divider-line {
          flex: 1;
          height: 1px;
          background: #e5ddd3;
        }

        .lg-divider-text {
          font-size: 11.5px;
          font-weight: 400;
          color: #b5a090;
          white-space: nowrap;
        }

        /* Role badges */
        .lg-roles {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          margin-bottom: 28px;
        }

        .lg-role {
          font-size: 11px;
          font-weight: 400;
          color: #9a8a7a;
          background: #f0ebe3;
          border: 1px solid #e5ddd3;
          border-radius: 100px;
          padding: 3px 10px;
        }

        /* Signup link */
        .lg-signup {
          text-align: center;
          font-size: 13.5px;
          font-weight: 300;
          color: #9a8a7a;
        }

        .lg-signup a {
          color: #b45309;
          font-weight: 500;
          text-decoration: none;
          transition: color 0.2s;
        }

        .lg-signup a:hover { color: #92400e; }

        /* Footer of right panel */
        .lg-right-footer {
          position: absolute;
          bottom: 24px;
          left: 0; right: 0;
          text-align: center;
          font-size: 11.5px;
          font-weight: 300;
          color: #c8bfb5;
          z-index: 1;
        }

        .lg-right-footer a {
          color: #b5a090;
          text-decoration: none;
          transition: color 0.2s;
        }

        .lg-right-footer a:hover { color: #7a6a5a; }
      `}</style>
      <PageTitle title="Login" />
      <div className="lg-page">

        {/* ══ LEFT PANEL ══ */}
        <div className="lg-left">
          <div className="lg-orbit"><div className="lg-orbit-dot" /></div>
          <div className="lg-orbit" />
          <div className="lg-orbit" />

          {/* Logo */}
          <a href="/" className="lg-left-logo">
            <span className="lg-left-mark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <polygon points="12,2 22,19 2,19" stroke="#0a0f1e" strokeWidth="2"
                  strokeLinejoin="round" fill="none"/>
                <path d="M12 8v5M12 15.5v.5" stroke="#0a0f1e" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </span>
            <span className="lg-left-name">GradeQuest</span>
            <span className="lg-left-pill">AI</span>
          </a>

          {/* Main copy */}
          <div className="lg-left-content">
            <h1 className="lg-headline">
              Your school,<br />
              <em>fully in control.</em>
            </h1>
            <p className="lg-tagline">
              Manage results, fees, attendance, and parent communication —
              all from one intelligent dashboard built for Nigerian schools.
            </p>

            <div className="lg-chips">
              {[
                {
                  label: "AI-powered result monitoring",
                  icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="5" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="9" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M5 5V4a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.3"/></svg>
                },
                {
                  label: "Secure PIN-based result portal",
                  icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="5" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M5 5V4a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="9.5" r="1.2" fill="currentColor"/></svg>
                },
                {
                  label: "Real-time fees & attendance tracking",
                  icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 12V5M6 12V8M10 12V3M14 12V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                },
                {
                  label: "Role-based access for all staff",
                  icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 14c0-2.76 2.24-5 5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M11 9v4M9 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                },
              ].map((c, i) => (
                <div className="lg-chip" key={i}>
                  <span className="lg-chip-icon">{c.icon}</span>
                  {c.label}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom testimonial quote */}
          <div className="lg-left-quote">
            <p className="lg-quote-text">
              "GradeQuest cut our result processing time from two weeks to one afternoon."
            </p>
            <span className="lg-quote-author">
              <span className="lg-quote-line" />
              Mrs. Adaeze Okonkwo · Greenfield Model School, Enugu
            </span>
          </div>
        </div>

        {/* ══ RIGHT PANEL ══ */}
        <div className="lg-right">
          <div className="lg-form-wrap">

            {/* Mobile logo */}
            <a href="/" className="lg-mobile-logo">
              <span className="lg-left-mark" style={{ width: 34, height: 34, borderRadius: 9 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <polygon points="12,2 22,19 2,19" stroke="#0a0f1e" strokeWidth="2"
                    strokeLinejoin="round" fill="none"/>
                  <path d="M12 8v5M12 15.5v.5" stroke="#0a0f1e" strokeWidth="2.2" strokeLinecap="round"/>
                </svg>
              </span>
              <span style={{ fontFamily: "'Lora', serif", fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>
                GradeQuest
              </span>
            </a>

            {/* Form heading */}
            <div className="lg-form-eyebrow">
              <span className="lg-form-eyebrow-line" />
              Secure login
            </div>
            <h2 className="lg-form-title">
              Welcome back,<br />
              <em>let's pick up where you left off.</em>
            </h2>
            <p className="lg-form-sub">
              Sign in with your school email or registration number.
            </p>

            {/* Error message */}
            {error && (
              <div className="lg-error" role="alert">
                <span className="lg-error-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="#b91c1c" strokeWidth="1.4"/>
                    <path d="M8 5v3.5M8 10.5v.5" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </span>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate>
              {/* Email / Reg No */}
              <div className="lg-field">
                <label className="lg-label" htmlFor="identifier">
                  Email or Registration Number
                </label>
                <div className="lg-input-wrap">
                  <span className="lg-input-icon">
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                      <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M1 6l7 4 7-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <input
                    id="identifier"
                    type="text"
                    className="lg-input"
                    placeholder="school@email.com or R123456"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="lg-field">
                <label className="lg-label" htmlFor="password">Password</label>
                <div className="lg-input-wrap">
                  <span className="lg-input-icon">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="7" width="12" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.3"/>
                      <circle cx="8" cy="10.5" r="1" fill="currentColor"/>
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPass ? "text" : "password"}
                    className="lg-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    style={{ paddingRight: 42 }}
                    required
                  />
                  <button
                    type="button"
                    className="lg-pass-toggle"
                    onClick={() => setShowPass(v => !v)}
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3"/>
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M3 3l10 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3"/>
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className="lg-row">
                <label className="lg-check-wrap">
                  <input type="checkbox" className="lg-check" id="remember" />
                  <span className="lg-check-label">Keep me signed in</span>
                </label>
                <Link to="/forgot-password" className="lg-forgot">Forgot password?</Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="lg-submit"
                disabled={buttonLoading}
              >
                {buttonLoading ? (
                  <>
                    <span className="lg-spinner" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In to Dashboard
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.7"
                        strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Role divider */}
            <div className="lg-divider">
              <span className="lg-divider-line" />
              <span className="lg-divider-text">Available for</span>
              <span className="lg-divider-line" />
            </div>

            <div className="lg-roles">
              {["Admin", "Teacher", "Student", "Parent", "Bursar"].map(r => (
                <span className="lg-role" key={r}>{r}</span>
              ))}
            </div>

            {/* Signup */}
            <p className="lg-signup">
              New school on GradeQuest?{" "}
              <Link to="/register">Request access →</Link>
            </p>
          </div>

          {/* Footer */}
          <div className="lg-right-footer">
            <a href="/privacy">Privacy</a>
            {" · "}
            <a href="/terms">Terms</a>
            {" · "}
            © {new Date().getFullYear()} GradeQuest
          </div>
        </div>

      </div>
    </>
  );
}