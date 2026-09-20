import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { publicApi } from "../../utils/axios";
import { setToken, setUser } from "../../utils/token";
import { isCustomPortalHost } from "../../utils/portal";
import PageTitle from "../../components/PageTitle";

// Helper to sanitize and normalize media URLs
const resolveMediaUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  const clean = url.replace(/^\/+/, "");
  if (clean.startsWith("uploads/")) {
    return `https://schoolprofit.ng/${clean}`;
  }
  if (clean.startsWith("storage/")) {
    return `https://schoolprofit.ng/${clean}`;
  }
  return `https://schoolprofit.ng/storage/${clean}`;
};

type PortalAudience = "parent" | "student" | "staff";

export default function SchoolBrandedLoginPage() {
  const { slugOrId } = useParams<{ slugOrId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [schoolData, setSchoolData] = useState<any>(null);
  const [error, setError] = useState("");
  const [fetchError, setFetchError] = useState("");

  const [audience, setAudience] = useState<PortalAudience>("parent");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [logoLoaded, setLogoLoaded] = useState(true);

  // Extract school identifier from route params, query string, or domain
  const schoolParam = slugOrId || searchParams.get("school") || searchParams.get("id") || searchParams.get("slug") || "current";

  useEffect(() => {
    fetchSchoolData();
  }, [schoolParam]);

  const fetchSchoolData = async () => {
    setLoading(true);
    setFetchError("");
    try {
      const res = await publicApi.get(`/public/school/${schoolParam}`);
      if (res.data?.status && res.data?.school) {
        setSchoolData(res.data);
      } else {
        setFetchError("School portal not found. Please verify the school web address.");
      }
    } catch (err: any) {
      console.error("Error fetching school branding:", err);
      // Fallback: try 'current' or first school
      try {
        const fallbackRes = await publicApi.get(`/public/school/current`);
        if (fallbackRes.data?.status && fallbackRes.data?.school) {
          setSchoolData(fallbackRes.data);
        } else {
          setFetchError("Unable to connect to school portal. Please try again later.");
        }
      } catch (e) {
        setFetchError("Unable to connect to school portal. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Please enter your login username and password.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await publicApi.post("/login", {
        identifier: identifier.trim(),
        password,
      });

      const { access_token, user } = response.data;
      setToken(access_token);
      setUser(user);

      // Route based on role
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
      setError(
        err?.response?.data?.message ||
          "Invalid login credentials. Please check your username and password, or contact your school administrator."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center"
        style={{ backgroundColor: "#0A192F", color: "#FFFFFF", fontFamily: "Plus Jakarta Sans, sans-serif" }}
      >
        <div className="text-center p-4">
          <div
            className="spinner-border text-warning mb-3"
            role="status"
            style={{ width: "3.5rem", height: "3.5rem" }}
          ></div>
          <h4 className="fw-bold text-white mb-2">Connecting to School Portal...</h4>
          <p className="text-white-50 small mb-0">Loading verified school security credentials and theme</p>
        </div>
      </div>
    );
  }

  if (fetchError || !schoolData) {
    return (
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center p-4"
        style={{ backgroundColor: "#F8FAFC", fontFamily: "Plus Jakarta Sans, sans-serif" }}
      >
        <div className="card border-0 shadow-lg rounded-4 p-5 text-center" style={{ maxWidth: 460 }}>
          <div className="display-4 text-warning mb-3">
            <i className="bi bi-shield-exclamation"></i>
          </div>
          <h4 className="fw-bold text-dark mb-2">School Portal Unavailable</h4>
          <p className="text-muted small mb-4">{fetchError || "The requested school portal address could not be resolved."}</p>
          <div className="d-flex flex-column gap-2">
            <Link to="/login" className="btn btn-primary fw-bold py-2.5 rounded-pill">
              Go to Unified Portal Login
            </Link>
            <Link to="/" className="btn btn-outline-secondary rounded-pill py-2.5">
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { school, website = {}, admission = {} } = schoolData;
  const primaryColor = website.theme_color_primary || "#0F2744";
  const secondaryColor = website.theme_color_secondary || "#D97706";
  const accentColor = website.theme_color_accent || "#2563EB";
  const fontFamily = website.font_family || "Plus Jakarta Sans";
  const schoolLogo = resolveMediaUrl(school.logo || school.logo_url);
  const websiteHomeUrl = isCustomPortalHost() ? "/" : `/school/${school.subdomain || school.id}`;
  const admissionUrl = `/school/${school.id}/admission`;

  const audienceMeta = {
    parent: {
      badge: "Parent & Family Access",
      title: "Sign in as a Parent",
      desc: "Monitor your ward's daily attendance, academic scores, report cards, and fee invoices.",
      label: "Registered Phone Number or Email",
      placeholder: "e.g. 08012345678 or parent@gmail.com",
      icon: "bi-people-fill",
    },
    student: {
      badge: "Student Academic Portal",
      title: "Sign in as a Student",
      desc: "Access your daily timetable, continuous assessments, CBT exams, and term report cards.",
      label: "Student Registration ID or Email",
      placeholder: "e.g. SCH/2026/041 or student@school.edu.ng",
      icon: "bi-mortarboard-fill",
    },
    staff: {
      badge: "Educators & Administration",
      title: "Sign in as Staff / Teacher",
      desc: "Upload CA scores, compile broadsheets, manage student attendance, and bursary ledgers.",
      label: "Official Staff ID or Email",
      placeholder: "e.g. STF/004 or teacher@school.edu.ng",
      icon: "bi-person-badge-fill",
    },
  }[audience];

  return (
    <>
      <PageTitle title={`${school.name} | Official Portal Sign In`} />

      <style>{`
        :root {
          --sch-primary: ${primaryColor};
          --sch-secondary: ${secondaryColor};
          --sch-accent: ${accentColor};
          --sch-font: '${fontFamily}', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .sch-auth-body {
          min-height: 100vh;
          font-family: var(--sch-font);
          display: flex;
          background: #F8FAFC;
          overflow-x: hidden;
        }

        /* ── Left Hero Panel ── */
        .sch-auth-left {
          flex: 1.15;
          background: linear-gradient(145deg, var(--sch-primary) 0%, #06101E 100%);
          color: #FFFFFF;
          padding: 48px 56px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }

        @media (max-width: 991px) {
          .sch-auth-left {
            display: none;
          }
        }

        .sch-auth-mesh {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle at 15% 20%, rgba(217, 119, 6, 0.18) 0%, transparent 45%),
            radial-gradient(circle at 85% 85%, rgba(37, 99, 235, 0.18) 0%, transparent 50%);
          pointer-events: none;
        }

        .sch-brand-card {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          text-decoration: none;
          z-index: 2;
        }

        .sch-brand-logo-wrap {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: #FFFFFF;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
          flex-shrink: 0;
        }

        .sch-brand-logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 10px;
        }

        .sch-brand-text-name {
          font-size: 20px;
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.2;
          letter-spacing: -0.01em;
        }

        .sch-brand-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          color: #FDE68A;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 3px;
        }

        .sch-left-content {
          position: relative;
          z-index: 2;
          max-width: 520px;
          margin: 36px 0;
        }

        .sch-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #FDE68A;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 22px;
        }

        .sch-left-title {
          font-size: clamp(28px, 2.8vw, 38px);
          font-weight: 800;
          line-height: 1.25;
          color: #FFFFFF;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .sch-left-desc {
          font-size: 15px;
          color: #E2E8F0;
          line-height: 1.65;
          margin-bottom: 32px;
        }

        /* 4 Trust Feature Cards */
        .sch-trust-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .sch-trust-item {
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          padding: 14px 16px;
          transition: transform 0.2s ease, background-color 0.2s ease;
        }

        .sch-trust-item:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.1);
        }

        .sch-trust-icon {
          font-size: 20px;
          color: #FBBF24;
          margin-bottom: 6px;
        }

        .sch-trust-item-title {
          font-size: 13px;
          font-weight: 700;
          color: #FFFFFF;
          margin-bottom: 3px;
        }

        .sch-trust-item-sub {
          font-size: 11.5px;
          color: #94A3B8;
          line-height: 1.4;
        }

        .sch-left-footer {
          position: relative;
          z-index: 2;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          color: #94A3B8;
          flex-wrap: wrap;
          gap: 12px;
        }

        /* ── Right Form Panel ── */
        .sch-auth-right {
          flex: 0.95;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          background: #F8FAFC;
        }

        .sch-auth-card {
          width: 100%;
          max-width: 460px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 22px;
          padding: 38px 34px;
          box-shadow: 0 16px 40px -10px rgba(15, 39, 68, 0.08);
          position: relative;
          overflow: hidden;
        }

        .sch-card-top-accent {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 5px;
          background: linear-gradient(90deg, var(--sch-primary) 0%, var(--sch-secondary) 100%);
        }

        /* Audience Tabs */
        .sch-tabs-bar {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          background: #F1F5F9;
          border-radius: 12px;
          padding: 4px;
          gap: 4px;
          margin-bottom: 24px;
        }

        .sch-tab-btn {
          border: none;
          background: transparent;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          color: #64748B;
          padding: 9px 4px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          text-align: center;
        }

        .sch-tab-btn.active {
          background: #FFFFFF;
          color: var(--sch-primary);
          box-shadow: 0 2px 8px rgba(15, 39, 68, 0.08);
        }

        .sch-form-title {
          font-size: 22px;
          font-weight: 800;
          color: #0F172A;
          margin-bottom: 6px;
          line-height: 1.25;
        }

        .sch-form-desc {
          font-size: 13px;
          color: #64748B;
          line-height: 1.5;
          margin-bottom: 22px;
        }

        .sch-form-group {
          margin-bottom: 18px;
        }

        .sch-form-label {
          display: block;
          font-size: 12.5px;
          font-weight: 700;
          color: #1E293B;
          margin-bottom: 6px;
        }

        .sch-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .sch-input-icon {
          position: absolute;
          left: 14px;
          color: #94A3B8;
          font-size: 16px;
          pointer-events: none;
        }

        .sch-input-field {
          width: 100%;
          height: 48px;
          background: #FFFFFF;
          border: 1.5px solid #CBD5E1;
          border-radius: 12px;
          padding: 0 14px 0 42px;
          font-family: inherit;
          font-size: 14px;
          color: #0F172A;
          outline: none;
          transition: all 0.2s ease;
        }

        .sch-input-field:focus {
          border-color: var(--sch-secondary);
          box-shadow: 0 0 0 3.5px rgba(217, 119, 6, 0.18);
        }

        .sch-input-field::placeholder {
          color: #94A3B8;
          font-size: 13px;
        }

        .sch-btn-eye {
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
          font-size: 16px;
        }

        .sch-btn-eye:hover {
          color: #0F172A;
        }

        .sch-btn-submit {
          width: 100%;
          height: 48px;
          background: linear-gradient(135deg, var(--sch-primary) 0%, #173860 100%);
          color: #FFFFFF;
          font-family: inherit;
          font-size: 14.5px;
          font-weight: 700;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.25s ease;
          box-shadow: 0 6px 18px rgba(15, 39, 68, 0.25);
        }

        .sch-btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: brightness(1.1);
          box-shadow: 0 10px 24px rgba(15, 39, 68, 0.35);
        }

        .sch-btn-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .sch-auth-alert-err {
          background: #FEF2F2;
          border: 1px solid #FEE2E2;
          color: #B91C1C;
          border-radius: 10px;
          padding: 11px 14px;
          font-size: 12.5px;
          margin-bottom: 18px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          line-height: 1.45;
        }

        .sch-mobile-brand {
          display: none;
          align-items: center;
          gap: 12px;
          margin-bottom: 22px;
          padding-bottom: 16px;
          border-bottom: 1px solid #E2E8F0;
        }

        @media (max-width: 991px) {
          .sch-mobile-brand {
            display: flex;
          }
        }
      `}</style>

      <div className="sch-auth-body">
        {/* ── LEFT HERO PANEL ── */}
        <div className="sch-auth-left">
          <div className="sch-auth-mesh"></div>

          {/* School Header / Brand link */}
          <Link to={websiteHomeUrl} className="sch-brand-card">
            <div className="sch-brand-logo-wrap">
              {schoolLogo && logoLoaded ? (
                <img
                  src={schoolLogo}
                  alt={school.name}
                  className="sch-brand-logo-img"
                  onError={() => setLogoLoaded(false)}
                />
              ) : (
                <div
                  className="fw-bold fs-5 text-dark rounded-3 d-flex align-items-center justify-content-center w-100 h-100"
                  style={{ background: "#F59E0B" }}
                >
                  {school.name?.[0] || "S"}
                </div>
              )}
            </div>
            <div>
              <div className="sch-brand-text-name">{school.name}</div>
              <div className="sch-brand-badge">
                <i className="bi bi-patch-check-fill text-warning"></i> Official Digital Portal
              </div>
            </div>
          </Link>

          {/* Core Value / Headline */}
          <div className="sch-left-content">
            <div className="sch-kicker">
              <span>🏛️</span> {website.tagline || "Knowledge, Character & Leadership"}
            </div>

            <h1 className="sch-left-title">
              Welcome to the Official <span style={{ color: "#FBBF24" }}>{school.name}</span> Portal.
            </h1>

            <p className="sch-left-desc">
              {website.about_content
                ? website.about_content.slice(0, 180) + "..."
                : "Seamless, secure access for parents, students, and educators to view continuous assessments, verified term report cards, fee payment receipts, and attendance."}
            </p>

            {/* 4 Trust Highlights */}
            <div className="sch-trust-grid">
              <div className="sch-trust-item">
                <div className="sch-trust-icon">
                  <i className="bi bi-file-earmark-bar-graph"></i>
                </div>
                <div className="sch-trust-item-title">1-Click Broadsheets</div>
                <div className="sch-trust-item-sub">WAEC &amp; NECO standard verified report cards.</div>
              </div>

              <div className="sch-trust-item">
                <div className="sch-trust-icon">
                  <i className="bi bi-wallet2"></i>
                </div>
                <div className="sch-trust-item-title">Parent Virtual Accounts</div>
                <div className="sch-trust-item-sub">Instant fee payment &amp; digital clearance passes.</div>
              </div>

              <div className="sch-trust-item">
                <div className="sch-trust-icon">
                  <i className="bi bi-whatsapp"></i>
                </div>
                <div className="sch-trust-item-title">WhatsApp Alerts</div>
                <div className="sch-trust-item-sub">Direct attendance &amp; result delivery to parents.</div>
              </div>

              <div className="sch-trust-item">
                <div className="sch-trust-icon">
                  <i className="bi bi-shield-lock-fill"></i>
                </div>
                <div className="sch-trust-item-title">256-Bit SSL Security</div>
                <div className="sch-trust-item-sub">Bank-grade data privacy &amp; daily backups.</div>
              </div>
            </div>
          </div>

          {/* Left Footer info */}
          <div className="sch-left-footer">
            <div className="d-flex align-items-center gap-3">
              {school.phone && (
                <span>
                  <i className="bi bi-telephone-fill text-warning me-1"></i> {school.phone}
                </span>
              )}
              {school.email && (
                <span>
                  <i className="bi bi-envelope-fill text-warning me-1"></i> {school.email}
                </span>
              )}
            </div>
            <div>
              Powered by <span className="text-warning fw-bold">SchoolProfit.ng</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT AUTH CARD ── */}
        <div className="sch-auth-right">
          <div className="sch-auth-card">
            <div className="sch-card-top-accent"></div>

            {/* Mobile Header */}
            <div className="sch-mobile-brand">
              <div className="sch-brand-logo-wrap" style={{ width: 44, height: 44 }}>
                {schoolLogo && logoLoaded ? (
                  <img
                    src={schoolLogo}
                    alt={school.name}
                    className="sch-brand-logo-img"
                    onError={() => setLogoLoaded(false)}
                  />
                ) : (
                  <div
                    className="fw-bold fs-6 text-dark rounded-3 d-flex align-items-center justify-content-center w-100 h-100"
                    style={{ background: "#F59E0B" }}
                  >
                    {school.name?.[0] || "S"}
                  </div>
                )}
              </div>
              <div>
                <div className="fw-bold text-dark" style={{ fontSize: 16, lineHeight: 1.2 }}>
                  {school.name}
                </div>
                <small className="text-muted" style={{ fontSize: 11.5 }}>
                  Official Digital School Portal
                </small>
              </div>
            </div>

            {/* Audience Tabs */}
            <div className="sch-tabs-bar">
              <button
                type="button"
                className={`sch-tab-btn ${audience === "parent" ? "active" : ""}`}
                onClick={() => {
                  setAudience("parent");
                  setError("");
                }}
              >
                <i className="bi bi-people-fill"></i> Parents
              </button>
              <button
                type="button"
                className={`sch-tab-btn ${audience === "student" ? "active" : ""}`}
                onClick={() => {
                  setAudience("student");
                  setError("");
                }}
              >
                <i className="bi bi-mortarboard-fill"></i> Students
              </button>
              <button
                type="button"
                className={`sch-tab-btn ${audience === "staff" ? "active" : ""}`}
                onClick={() => {
                  setAudience("staff");
                  setError("");
                }}
              >
                <i className="bi bi-person-badge-fill"></i> Staff
              </button>
            </div>

            {/* Form Titles */}
            <h2 className="sch-form-title">{audienceMeta.title}</h2>
            <p className="sch-form-desc">{audienceMeta.desc}</p>

            {/* Error message */}
            {error && (
              <div className="sch-auth-alert-err">
                <i className="bi bi-exclamation-triangle-fill flex-shrink-0 mt-0.5"></i>
                <div>{error}</div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit}>
              <div className="sch-form-group">
                <label className="sch-form-label">{audienceMeta.label}</label>
                <div className="sch-input-wrap">
                  <i className={`bi ${audienceMeta.icon} sch-input-icon`}></i>
                  <input
                    type="text"
                    required
                    className="sch-input-field"
                    placeholder={audienceMeta.placeholder}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="sch-form-group">
                <label className="sch-form-label">Password</label>
                <div className="sch-input-wrap">
                  <i className="bi bi-lock-fill sch-input-icon"></i>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="sch-input-field"
                    placeholder="Enter your secret password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    className="sch-btn-eye"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <i className={`bi ${showPassword ? "bi-eye-slash-fill" : "bi-eye-fill"}`}></i>
                  </button>
                </div>
              </div>

              <div className="d-flex align-items-center justify-content-between mb-4 small">
                <label className="d-flex align-items-center gap-2 cursor-pointer mb-0 text-muted">
                  <input
                    type="checkbox"
                    className="form-check-input mt-0"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Keep me signed in</span>
                </label>

                <Link
                  to={`/forgot-password?school=${school.subdomain || school.id}`}
                  className="fw-bold text-decoration-none"
                  style={{ color: secondaryColor }}
                >
                  Forgot Password?
                </Link>
              </div>

              <button type="submit" className="sch-btn-submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to School Portal</span>
                    <i className="bi bi-arrow-right"></i>
                  </>
                )}
              </button>
            </form>

            {/* Quick Links & Back to Website */}
            <div className="mt-4 pt-3 border-top text-center">
              <Link
                to={websiteHomeUrl}
                className="d-inline-flex align-items-center gap-1.5 fw-bold text-decoration-none small"
                style={{ color: primaryColor }}
              >
                <i className="bi bi-arrow-left"></i> Return to {school.name} Website
              </Link>

              {admission.is_open && (
                <div className="mt-2.5">
                  <span className="small text-muted me-1">New student?</span>
                  <Link
                    to={admissionUrl}
                    className="small fw-bold text-decoration-underline"
                    style={{ color: secondaryColor }}
                  >
                    Apply for Online Admission
                  </Link>
                </div>
              )}
            </div>

            {/* Support footer */}
            <div className="mt-4 p-2.5 rounded-3 bg-light text-center small text-muted">
              <div>Need help with your login credentials?</div>
              {school.phone && (
                <a
                  href={`tel:${school.phone}`}
                  className="fw-bold text-decoration-none mt-1 d-inline-block"
                  style={{ color: secondaryColor }}
                >
                  <i className="bi bi-telephone-fill me-1"></i> Call School Office: {school.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
