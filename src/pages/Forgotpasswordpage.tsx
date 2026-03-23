// src/pages/Auth/ForgotPasswordPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { publicApi } from "../utils/axios";
import PageTitle from "../components/PageTitle";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!isValidEmail) return;

    setError("");
    setLoading(true);

    try {
      await publicApi.post("/forgot-password", {
        email: email.trim(),
      });

      navigate("/reset-password", {
        state: { email: email.trim() },
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .fp-root {
          min-height: 100vh;
          display: flex;
          font-family: 'DM Sans', sans-serif;
          background: #0a0f1e;
        }

        .fp-left {
          flex: 1;
          background: #0f172a;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px 52px;
        }
        @media (max-width: 900px) { .fp-left { display: none; } }

        .fp-left-noise {
          position: absolute; inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,.04) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
        }
        .fp-left-glow1 {
          position: absolute; top: -80px; right: -80px;
          width: 420px; height: 420px; border-radius: 50%;
          background: radial-gradient(circle, rgba(201,168,76,.09) 0%, transparent 65%);
          pointer-events: none;
        }
        .fp-left-glow2 {
          position: absolute; bottom: -60px; left: -40px;
          width: 300px; height: 300px; border-radius: 50%;
          background: radial-gradient(circle, rgba(99,102,241,.06) 0%, transparent 70%);
          pointer-events: none;
        }

        .fp-logo {
          position: relative; z-index: 1;
          display: flex; align-items: center; gap: 10px;
        }
        .fp-logo-mark {
          width: 36px; height: 36px; border-radius: 9px;
          background: linear-gradient(135deg, #c9a84c, #e8c97a);
          display: flex; align-items: center; justify-content: center;
        }
        .fp-logo-name {
          font-family: 'Lora', serif;
          font-size: 18px; font-weight: 700; color: #fff;
          letter-spacing: -.01em;
        }
        .fp-logo-name span { color: #c9a84c; }

        .fp-left-body { position: relative; z-index: 1; }

        .fp-left-kicker {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 10.5px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase;
          color: #e8c97a; background: rgba(201,168,76,.1); border: 1px solid rgba(201,168,76,.2);
          border-radius: 999px; padding: 4px 13px; margin-bottom: 22px;
        }
        .fp-left-kicker-dot {
          width: 5px; height: 5px; border-radius: 50%; background: #c9a84c;
        }

        .fp-left-headline {
          font-family: 'Lora', serif;
          font-size: clamp(28px, 3vw, 40px);
          font-weight: 700; color: #fff; line-height: 1.1;
          margin-bottom: 16px;
        }
        .fp-left-headline em { font-style: italic; color: #e8c97a; }

        .fp-left-desc {
          font-size: 14px; font-weight: 300; color: #64748b;
          line-height: 1.7; max-width: 380px; margin-bottom: 40px;
        }

        .fp-steps { display: flex; flex-direction: column; gap: 0; }
        .fp-step {
          display: flex; gap: 16px; align-items: flex-start;
          padding: 14px 0;
          border-bottom: 1px solid rgba(255,255,255,.05);
        }
        .fp-step:last-child { border-bottom: none; }
        .fp-step-num {
          width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
          background: rgba(201,168,76,.1); border: 1px solid rgba(201,168,76,.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 11.5px; font-weight: 600; color: #c9a84c;
          margin-top: 1px;
        }
        .fp-step-text { display: flex; flex-direction: column; gap: 2px; }
        .fp-step-label { font-size: 13.5px; font-weight: 500; color: rgba(255,255,255,.85); }
        .fp-step-sub   { font-size: 12px; font-weight: 300; color: #475569; }

        .fp-left-foot {
          position: relative; z-index: 1;
          font-size: 12px; font-weight: 300; color: #334155;
          display: flex; align-items: center; gap: 8px;
        }

        .fp-right {
          width: 520px; flex-shrink: 0;
          background: #faf8f5;
          display: flex; flex-direction: column; justify-content: center;
          padding: 56px 52px;
          position: relative;
        }
        @media (max-width: 900px) {
          .fp-right { width: 100%; padding: 40px 24px; justify-content: flex-start; padding-top: 60px; }
        }

        .fp-form-header { margin-bottom: 32px; }
        .fp-form-eyebrow {
          font-size: 11px; font-weight: 500; letter-spacing: .16em; text-transform: uppercase;
          color: #b45309; margin-bottom: 10px; display: flex; align-items: center; gap: 7px;
        }
        .fp-form-title {
          font-family: 'Lora', serif; font-size: 26px; font-weight: 700;
          color: #1a1a2e; line-height: 1.15; margin-bottom: 8px;
        }
        .fp-form-sub { font-size: 13.5px; font-weight: 300; color: #9a8a7a; line-height: 1.6; }

        .fp-field { margin-bottom: 20px; }
        .fp-label {
          display: block; font-size: 12px; font-weight: 500; color: #4a4a5a;
          margin-bottom: 8px; letter-spacing: .02em;
        }
        .fp-input-wrap { position: relative; }
        .fp-input-icon {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          color: #b5a090; display: flex; align-items: center; pointer-events: none;
        }
        .fp-input {
          width: 100%; background: #fff; border: 1.5px solid #e5ddd3;
          border-radius: 10px; padding: 13px 14px 13px 42px;
          font-family: 'DM Sans', sans-serif; font-size: 14px; color: #1a1a2e;
          outline: none; transition: border-color .2s, box-shadow .2s;
        }
        .fp-input::placeholder { color: #c8bfb5; }
        .fp-input:focus { border-color: #c9a84c; box-shadow: 0 0 0 3px rgba(201,168,76,.14); }
        .fp-input--error { border-color: #ef4444 !important; box-shadow: 0 0 0 3px rgba(239,68,68,.1) !important; }

        .fp-error-msg {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; color: #ef4444; margin-top: 7px; font-weight: 400;
        }

        .fp-submit {
          width: 100%; padding: 14px;
          font-family: 'DM Sans', sans-serif; font-size: 14.5px; font-weight: 500;
          color: #0f172a; background: #c9a84c;
          border: none; border-radius: 10px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 9px;
          transition: background .2s, transform .15s, box-shadow .2s;
          margin-bottom: 20px;
        }
        .fp-submit:hover:not(:disabled) {
          background: #e8c97a; transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(201,168,76,.3);
        }
        .fp-submit:active:not(:disabled) { transform: translateY(0); }
        .fp-submit:disabled { opacity: .55; cursor: not-allowed; }

        .fp-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(15,23,42,.25);
          border-top-color: #0f172a;
          border-radius: 50%;
          animation: fpSpin .7s linear infinite; flex-shrink: 0;
        }
        @keyframes fpSpin { to { transform: rotate(360deg); } }

        .fp-back-link {
          display: flex; align-items: center; justify-content: center; gap: 7px;
          font-size: 13px; font-weight: 400; color: #9a8a7a;
          text-decoration: none; transition: color .2s; cursor: pointer;
          background: none; border: none; width: 100%;
        }
        .fp-back-link:hover { color: #1a1a2e; }

        .fp-banner-error {
          display: flex; align-items: flex-start; gap: 10px;
          background: #fff5f5; border: 1px solid #fecaca; border-radius: 10px;
          padding: 13px 15px; margin-bottom: 22px;
          font-size: 13px; color: #b91c1c; line-height: 1.5;
        }

        .fp-mobile-logo {
          display: none; align-items: center; gap: 9px; margin-bottom: 32px;
        }
        @media (max-width: 900px) { .fp-mobile-logo { display: flex; } }
      `}</style>
    <PageTitle title="Forgot Password" />
      <div className="fp-root">
        <div className="fp-left">
          <div className="fp-left-noise" aria-hidden="true" />
          <div className="fp-left-glow1" aria-hidden="true" />
          <div className="fp-left-glow2" aria-hidden="true" />

          <div className="fp-logo">
            <div className="fp-logo-mark">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L17 6v8l-7 4-7-4V6l7-4z" stroke="#0f172a" strokeWidth="1.6" strokeLinejoin="round"/>
                <path d="M10 10l7-4M10 10v8M10 10L3 6" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="fp-logo-name">Grade<span>Quest</span></span>
          </div>

          <div className="fp-left-body">
            <div className="fp-left-kicker">
              <span className="fp-left-kicker-dot" />
              Account recovery
            </div>

            <h1 className="fp-left-headline">
              Regain access
              <br />
              to your <em>admin</em>
              <br />
              account.
            </h1>

            <p className="fp-left-desc">
              Enter the email address registered to your GradeQuest admin account.
              We&apos;ll send a 6-digit code valid for 15 minutes.
            </p>

            <div className="fp-steps">
              {[
                { n: "01", label: "Enter your admin email", sub: "Must match the email on your account." },
                { n: "02", label: "Check your inbox for the code", sub: "A 6-digit OTP is sent immediately." },
                { n: "03", label: "Enter the code & reset", sub: "Code expires in 15 minutes." },
              ].map((s) => (
                <div className="fp-step" key={s.n}>
                  <div className="fp-step-num">{s.n}</div>
                  <div className="fp-step-text">
                    <span className="fp-step-label">{s.label}</span>
                    <span className="fp-step-sub">{s.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="fp-left-foot">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 1.5L2 3.5v4c0 2.9 2.2 5.6 5 6.5 2.8-.9 5-3.6 5-6.5v-4L7 1.5z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
            Admin portal only — student accounts use a different flow.
          </div>
        </div>

        <div className="fp-right">
          <div className="fp-mobile-logo">
            <div className="fp-logo-mark">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L17 6v8l-7 4-7-4V6l7-4z" stroke="#0f172a" strokeWidth="1.6" strokeLinejoin="round"/>
                <path d="M10 10l7-4M10 10v8M10 10L3 6" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="fp-logo-name">Grade<span>Quest</span></span>
          </div>

          <div className="fp-form-header">
            <div className="fp-form-eyebrow">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1.5L2 3.5v4c0 2.9 2.2 5.6 5 6.5 2.8-.9 5-3.6 5-6.5v-4L7 1.5z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
              </svg>
              Password recovery
            </div>
            <h2 className="fp-form-title">Forgot your password?</h2>
            <p className="fp-form-sub">
              Enter your admin email and we&apos;ll send a 6-digit OTP to get you back in.
            </p>
          </div>

          {error && (
            <div className="fp-banner-error">
              <svg
                width="15"
                height="15"
                viewBox="0 0 16 16"
                fill="none"
                style={{ flexShrink: 0, marginTop: 1 }}
              >
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
                <path d="M8 5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="fp-field">
              <label className="fp-label" htmlFor="fp-email">
                Admin email address
              </label>

              <div className="fp-input-wrap">
                <span className="fp-input-icon">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M1 5.5l7 4.5 7-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </span>

                <input
                  id="fp-email"
                  type="email"
                  className={`fp-input${touched && !isValidEmail ? " fp-input--error" : ""}`}
                  placeholder="admin@yourschool.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  onBlur={() => setTouched(true)}
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {touched && !isValidEmail && (
                <div className="fp-error-msg">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M6 3.5v3M6 8v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  Please enter a valid email address.
                </div>
              )}
            </div>

            <button
              type="submit"
              className="fp-submit"
              disabled={loading || (touched && !isValidEmail)}
            >
              {loading ? (
                <>
                  <span className="fp-spinner" />
                  Sending code…
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M2 8h12M9 3l5 5-5 5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Send reset code
                </>
              )}
            </button>
          </form>

          <button className="fp-back-link" onClick={() => navigate("/login")}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path
                d="M13 7H1M7 13L1 7l6-6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back to login
          </button>
        </div>
      </div>
    </>
  );
}