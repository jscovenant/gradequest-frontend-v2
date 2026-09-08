import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import { setToken, setUser } from "../utils/token";
import PageTitle from "../components/PageTitle";

type PortalTab = "school" | "parent" | "platform";

export default function Login() {
  const [buttonLoading, setButtonLoading] = useState(false);
  const [portalMode, setPortalMode] = useState<PortalTab>("school");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setButtonLoading(true);
    try {
      const response = await api.post("/login", {
        identifier: email,
        password,
      });
      const { access_token, user } = response.data;
      setToken(access_token);
      setUser(user);
      switch (user.role) {
        case "Admin":
        case "Operator":
        case "Super-Admin":
        case "Platform-Staff":
        case "Teacher":
        case "Student":
        case "Parent":
        case "Bursar":
        case "Sales-Representative":
          navigate("/dashboard");
          break;
        default:
          navigate("/unauthorized");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Invalid credentials. Please verify your username and password.");
    } finally {
      setButtonLoading(false);
    }
  };

  const portalMeta = {
    school: {
      badge: "School Community",
      eyebrow: "School Academic & Admin Access",
      title: "Sign in to your School",
      subtitle: "Use your school email, Staff ID, or Student Registration Number.",
      inputLabel: "Email, Staff ID, or Student Reg Number",
      placeholder: "e.g. admin@school.com or SCH/2026/041",
    },
    parent: {
      badge: "Parents & Guardians",
      eyebrow: "Family Portal Access",
      title: "Sign in as a Parent",
      subtitle: "View your ward's verified term results, fee invoices, and attendance.",
      inputLabel: "Registered Email or Phone Number",
      placeholder: "e.g. parent@email.com or 08012345678",
    },
    platform: {
      badge: "Central Operations",
      eyebrow: "Operations & HQ Console",
      title: "Sign in to HQ Console",
      subtitle: "Secure access for platform administrators, support engineers, and managers.",
      inputLabel: "SchoolProfit Staff Email",
      placeholder: "e.g. staff@schoolprofit.ng",
    },
  }[portalMode];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,800;1,600&display=swap');

        :root {
          --gq-auth-navy: #0F2744;
          --gq-auth-gold: #D97706;
          --gq-auth-border: #E2E8F0;
          --gq-auth-bg: #F8FAFC;
        }

        .gq-auth-wrapper {
          min-height: 100vh;
          display: flex;
          background: var(--gq-auth-bg);
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        /* ── Left Visual Panel ── */
        .gq-auth-left {
          flex: 1;
          background: linear-gradient(145deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px;
          position: relative;
          overflow: hidden;
          color: #FFFFFF;
        }

        @media (max-width: 991px) {
          .gq-auth-left {
            display: none;
          }
        }

        .gq-auth-left-bg-art {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle at 10% 20%, rgba(217, 119, 6, 0.15) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(29, 78, 216, 0.2) 0%, transparent 45%);
          pointer-events: none;
        }

        .gq-auth-brand-link {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          z-index: 2;
        }

        .gq-auth-brand-logo {
          width: 40px;
          height: 40px;
          object-fit: contain;
          border-radius: 10px;
        }

        .gq-auth-brand-text {
          font-size: 22px;
          font-weight: 800;
          color: #FFFFFF;
          letter-spacing: -0.02em;
        }

        .gq-auth-left-content {
          position: relative;
          z-index: 2;
          max-width: 500px;
          margin: 40px 0;
        }

        .gq-auth-left-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 14px;
          border-radius: 999px;
          background: rgba(217, 119, 6, 0.2);
          border: 1px solid rgba(217, 119, 6, 0.4);
          color: #FBBF24;
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 20px;
        }

        .gq-auth-left-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(28px, 3vw, 40px);
          font-weight: 800;
          line-height: 1.2;
          color: #FFFFFF;
          margin-bottom: 16px;
        }

        .gq-auth-left-title em {
          font-style: italic;
          color: #F59E0B;
        }

        .gq-auth-left-desc {
          font-size: 15px;
          color: #CBD5E1;
          line-height: 1.65;
          margin-bottom: 32px;
        }

        /* Testimonial snippet on login page */
        .gq-auth-quote-card {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .gq-quote-avatar {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #F59E0B;
          flex-shrink: 0;
        }

        .gq-quote-text {
          font-size: 13px;
          color: #F1F5F9;
          line-height: 1.5;
          margin-bottom: 6px;
          font-style: italic;
        }

        .gq-quote-author {
          font-size: 12px;
          font-weight: 700;
          color: #FBBF24;
        }

        .gq-auth-left-footer {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 20px;
          font-size: 12px;
          color: #94A3B8;
        }

        /* ── Right Form Panel ── */
        .gq-auth-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
        }

        .gq-auth-card {
          width: 100%;
          max-width: 440px;
          background: #FFFFFF;
          border: 1px solid var(--gq-auth-border);
          border-radius: 20px;
          padding: 36px 32px;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.06);
        }

        .gq-auth-mobile-logo {
          display: none;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          margin-bottom: 24px;
        }

        @media (max-width: 991px) {
          .gq-auth-mobile-logo {
            display: inline-flex;
          }
        }

        /* Portal Tabs */
        .gq-portal-tabs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          background: #F1F5F9;
          border-radius: 12px;
          padding: 4px;
          gap: 4px;
          margin-bottom: 24px;
        }

        .gq-portal-tab {
          border: none;
          background: transparent;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          color: #64748B;
          padding: 8px 4px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }

        .gq-portal-tab.active {
          background: #FFFFFF;
          color: #0F2744;
          box-shadow: 0 2px 6px rgba(15, 39, 68, 0.08);
        }

        .gq-form-title {
          font-size: 22px;
          font-weight: 800;
          color: #0F2744;
          margin-bottom: 6px;
        }

        .gq-form-subtitle {
          font-size: 13px;
          color: #64748B;
          line-height: 1.5;
          margin-bottom: 24px;
        }

        .gq-form-group {
          margin-bottom: 18px;
        }

        .gq-form-label {
          display: block;
          font-size: 12.5px;
          font-weight: 700;
          color: #1E293B;
          margin-bottom: 6px;
        }

        .gq-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .gq-input-icon {
          position: absolute;
          left: 14px;
          color: #94A3B8;
          font-size: 16px;
          pointer-events: none;
        }

        .gq-auth-input {
          width: 100%;
          height: 46px;
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 10px;
          padding: 0 14px 0 42px;
          font-family: inherit;
          font-size: 14px;
          color: #0F172A;
          outline: none;
          transition: all 0.2s ease;
        }

        .gq-auth-input:focus {
          border-color: #D97706;
          box-shadow: 0 0 0 3.5px rgba(217, 119, 6, 0.15);
        }

        .gq-auth-input::placeholder {
          color: #94A3B8;
          font-size: 13px;
        }

        .gq-btn-eye {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: #94A3B8;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .gq-btn-eye:hover {
          color: #0F2744;
        }

        .gq-auth-options {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          font-size: 12.5px;
        }

        .gq-auth-btn-submit {
          width: 100%;
          height: 48px;
          background: #0F2744;
          color: #FFFFFF;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(15, 39, 68, 0.2);
        }

        .gq-auth-btn-submit:hover:not(:disabled) {
          background: #1E3A8A;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(30, 58, 138, 0.3);
        }

        .gq-auth-btn-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .gq-auth-error {
          background: #FEF2F2;
          border: 1px solid #FEE2E2;
          color: #B91C1C;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 12.5px;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .gq-auth-footer-links {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #F1F5F9;
          text-align: center;
          font-size: 13px;
          color: #64748B;
        }

        .gq-auth-footer-links a {
          color: #D97706;
          font-weight: 700;
          text-decoration: none;
        }

        .gq-auth-footer-links a:hover {
          text-decoration: underline;
        }

        /* Quick shortcuts */
        .gq-quick-links {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 14px;
          flex-wrap: wrap;
        }

        .gq-quick-btn {
          font-size: 11.5px;
          font-weight: 600;
          color: #475569;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          padding: 4px 10px;
          border-radius: 6px;
          text-decoration: none;
          transition: all 0.2s;
        }

        .gq-quick-btn:hover {
          background: #EFF6FF;
          border-color: #BFDBFE;
          color: #1D4ED8;
        }
      `}</style>

      <PageTitle title="Sign In | SchoolProfit Portal" />

      <div className="gq-auth-wrapper">
        {/* ── Left Hero Panel ── */}
        <div className="gq-auth-left">
          <div className="gq-auth-left-bg-art" />

          <Link to="/" className="gq-auth-brand-link">
            <img
              src="/media/logo/schoolprofit-logo.svg"
              alt="SchoolProfit"
              className="gq-auth-brand-logo"
              style={{ width: "auto", height: 38 }}
            />
            <span className="gq-auth-brand-text">School<span style={{ color: "#059669" }}>Profit</span></span>
          </Link>

          <div className="gq-auth-left-content">
            <div className="gq-auth-left-kicker">
              <span>⚡</span> School Growth &amp; Profit OS
            </div>
            <h1 className="gq-auth-left-title">
              Stop Fee Defaults &amp; Grow Your School with <em>Total Financial Control.</em>
            </h1>
            <p className="gq-auth-left-desc">
              From automated fee debt recovery and instant multi-bank settlements to 1-click broadsheets and offline CBT exams — SchoolProfit keeps your entire school institution thriving.
            </p>

            {/* Testimonial Card */}
            <div className="gq-auth-quote-card">
              <img
                src="/images/testimonials/funmi-bello.jpg"
                alt="Principal"
                className="gq-quote-avatar"
              />
              <div>
                <p className="gq-quote-text">
                  "SchoolProfit eliminated our fee debt defaults and cut result compilation from two weeks down to minutes."
                </p>
                <div className="gq-quote-author">
                  Mrs. Deborah Afolabi · Power of Success Int'l School, Lagos
                </div>
              </div>
            </div>
          </div>

          <div className="gq-auth-left-footer">
            <span>🛡️ 256-Bit SSL Encrypted</span>
            <span>● 99.9% Uptime</span>
            <span>● Role-Based Security</span>
          </div>
        </div>

        {/* ── Right Form Panel ── */}
        <div className="gq-auth-right">
          <div className="gq-auth-card">
            {/* Mobile Logo */}
            <Link to="/" className="gq-auth-mobile-logo">
              <img src="/media/logo/schoolprofit-icon.svg" alt="SchoolProfit" style={{ width: 32, height: 32 }} />
              <span style={{ fontSize: 19, fontWeight: 800, color: "#0F2744" }}>School<span style={{ color: "#059669" }}>Profit</span></span>
            </Link>

            {/* Portal Tab Switcher */}
            <div className="gq-portal-tabs" role="tablist">
              <button
                type="button"
                className={`gq-portal-tab ${portalMode === "school" ? "active" : ""}`}
                onClick={() => { setPortalMode("school"); setError(""); }}
              >
                School Staff
              </button>
              <button
                type="button"
                className={`gq-portal-tab ${portalMode === "parent" ? "active" : ""}`}
                onClick={() => { setPortalMode("parent"); setError(""); }}
              >
                Parents
              </button>
              <button
                type="button"
                className={`gq-portal-tab ${portalMode === "platform" ? "active" : ""}`}
                onClick={() => { setPortalMode("platform"); setError(""); }}
              >
                HQ & Ops
              </button>
            </div>

            <h2 className="gq-form-title">{portalMeta.title}</h2>
            <p className="gq-form-subtitle">{portalMeta.subtitle}</p>

            {error && (
              <div className="gq-auth-error" role="alert">
                <i className="bi bi-exclamation-circle-fill" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Identifier Input */}
              <div className="gq-form-group">
                <label className="gq-form-label" htmlFor="identifier">
                  {portalMeta.inputLabel}
                </label>
                <div className="gq-input-wrap">
                  <span className="gq-input-icon">
                    <i className={portalMode === "parent" ? "bi bi-phone" : portalMode === "platform" ? "bi bi-shield-lock" : "bi bi-person"} />
                  </span>
                  <input
                    id="identifier"
                    type="text"
                    className="gq-auth-input"
                    placeholder={portalMeta.placeholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="gq-form-group">
                <label className="gq-form-label" htmlFor="password">
                  Password
                </label>
                <div className="gq-input-wrap">
                  <span className="gq-input-icon">
                    <i className="bi bi-lock" />
                  </span>
                  <input
                    id="password"
                    type={showPass ? "text" : "password"}
                    className="gq-auth-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    style={{ paddingRight: 40 }}
                    required
                  />
                  <button
                    type="button"
                    className="gq-btn-eye"
                    onClick={() => setShowPass(!showPass)}
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    <i className={showPass ? "bi bi-eye-slash" : "bi bi-eye"} />
                  </button>
                </div>
              </div>

              {/* Options Row */}
              <div className="gq-auth-options">
                <label className="d-flex align-items-center gap-2" style={{ color: "#475569", cursor: "pointer" }}>
                  <input type="checkbox" style={{ accentColor: "#D97706" }} />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot-password" style={{ color: "#D97706", fontWeight: 600, textDecoration: "none" }}>
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="gq-auth-btn-submit"
                disabled={buttonLoading || !email || !password}
              >
                {buttonLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In to {portalMeta.badge}
                    <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                      <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Quick Access */}
            <div className="gq-quick-links">
              <Link to="/check-result" className="gq-quick-btn">
                📜 Check Result (PIN)
              </Link>
              <Link to="/cbt/access" className="gq-quick-btn">
                💻 CBT Exam Room
              </Link>
            </div>

            {/* Register Footer */}
            <div className="gq-auth-footer-links">
              New school proprietor or principal?{" "}
              <Link to="/book-demo">Request School Demo &amp; Setup</Link>
              <div style={{ marginTop: 6, fontSize: "12px" }}>
                Interested in earning commissions?{" "}
                <Link to="/sales-representative/register">Join Sales Partner Program</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}