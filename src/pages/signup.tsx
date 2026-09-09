import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
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
  referral_code?: string | null;
  invitation?: string | null;
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

function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "transparent" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: "Too short", color: "#EF4444" },
    { label: "Weak", color: "#F97316" },
    { label: "Fair", color: "#F59E0B" },
    { label: "Good", color: "#10B981" },
    { label: "Strong", color: "#059669" },
  ];
  return { score, ...map[score] };
}

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRef = (searchParams.get("ref") || searchParams.get("code") || searchParams.get("partner") || searchParams.get("invitation") || "").trim().toUpperCase();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const [referralCode, setReferralCode] = useState(initialRef);
  const [isUnlocked, setIsUnlocked] = useState(Boolean(initialRef));
  const [enteredCode, setEnteredCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);

  const [form, setForm] = useState<RegisterPayload>({
    school_name: "",
    firstname: "",
    surname: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    password_confirmation: "",
    referral_code: initialRef || null,
    invitation: searchParams.get("invitation") || null,
  });

  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 600);
    return () => window.clearTimeout(timer);
  }, []);

  const strength = getStrength(form.password);

  const step1Valid = Boolean(form.school_name.trim() && form.address.trim());
  const step2Valid = Boolean(form.firstname.trim() && form.surname.trim() && form.phone.trim());

  const canSubmit = useMemo(
    () =>
      Boolean(
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

  function handleUnlockWithCode(e: React.FormEvent) {
    e.preventDefault();
    const clean = enteredCode.trim().toUpperCase();
    if (!clean) {
      setCodeError("Please enter a valid Referral or Invitation Code.");
      return;
    }
    setReferralCode(clean);
    set("referral_code", clean);
    setIsUnlocked(true);
    setCodeError("");
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
        referral_code: referralCode || null,
        invitation: searchParams.get("invitation") || null,
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

        .gq-benefits-list {
          list-style: none;
          padding: 0;
          margin: 24px 0 0 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .gq-benefit-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          color: #E2E8F0;
        }

        .gq-benefit-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.2);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #34D399;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          flex-shrink: 0;
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
          max-width: 500px;
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

        /* Step Progress Header */
        .gq-step-progress {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #F1F5F9;
        }

        .gq-step-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #94A3B8;
          cursor: pointer;
        }

        .gq-step-item.active {
          color: #0F2744;
        }

        .gq-step-num {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #F1F5F9;
          color: #64748B;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
        }

        .gq-step-item.active .gq-step-num {
          background: #0F2744;
          color: #FFFFFF;
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
          margin-bottom: 16px;
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

        .gq-field-err {
          font-size: 11.5px;
          color: #EF4444;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* Password strength bar */
        .gq-strength-bar-wrap {
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .gq-strength-track {
          flex: 1;
          height: 4px;
          background: #E2E8F0;
          border-radius: 999px;
          overflow: hidden;
        }

        .gq-strength-fill {
          height: 100%;
          transition: all 0.3s ease;
        }

        .gq-strength-label {
          font-size: 11px;
          font-weight: 700;
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
          margin-top: 10px;
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
      `}</style>

      <PageTitle title="Register Your School | SchoolProfit" />

      <div className="gq-auth-wrapper">
        {/* ── Left Hero Panel ── */}
        <div className="gq-auth-left">
          <div className="gq-auth-left-bg-art" />

          <Link to="/" className="gq-auth-brand-link">
            <img
              src="/media/logo/schoolprofit-logo.png"
              alt="SchoolProfit"
              className="gq-auth-brand-logo"
              style={{ width: "auto", height: 38, objectFit: "contain", borderRadius: 6 }}
            />
            <span className="gq-auth-brand-text">School<span style={{ color: "#059669" }}>Profit</span></span>
          </Link>

          <div className="gq-auth-left-content">
            <div className="gq-auth-left-kicker">
              <span>🚀</span> Start in Under 2 Minutes
            </div>
            <h1 className="gq-auth-left-title">
              Scale Your School with <em>Total Financial &amp; Academic Control.</em>
            </h1>

            <ul className="gq-benefits-list">
              <li className="gq-benefit-item">
                <span className="gq-benefit-icon">✓</span>
                <span><strong>Stop Fee Debts:</strong> Instant multi-bank collections, debt gatekeepers, and automated receipts.</span>
              </li>
              <li className="gq-benefit-item">
                <span className="gq-benefit-icon">✓</span>
                <span><strong>Scale Admissions:</strong> Transparent parent portal, instant SMS/WhatsApp billing alerts.</span>
              </li>
              <li className="gq-benefit-item">
                <span className="gq-benefit-icon">✓</span>
                <span><strong>Master Academic Broadsheets:</strong> 1-click terminal collation, verified QR transcripts, offline CBT.</span>
              </li>
              <li className="gq-benefit-item">
                <span className="gq-benefit-icon">✓</span>
                <span><strong>Empower Staff:</strong> AI lesson planning and automated biometric attendance logging.</span>
              </li>
            </ul>
          </div>

          <div className="gq-auth-left-footer">
            <span>🛡️ 256-Bit SSL Encrypted</span>
            <span>● 99.9% Uptime</span>
            <span>● Dedicated Growth Support</span>
          </div>
        </div>

        {/* ── Right Form Panel ── */}
        <div className="gq-auth-right">
          <div className="gq-auth-card">
            {/* Mobile Logo */}
            <Link to="/" className="gq-auth-mobile-logo">
              <img src="/media/logo/schoolprofit-logo.png" alt="SchoolProfit" style={{ width: "auto", height: 32, objectFit: "contain", borderRadius: 6 }} />
              <span style={{ fontSize: 19, fontWeight: 800, color: "#0F2744" }}>School<span style={{ color: "#059669" }}>Profit</span></span>
            </Link>

            {!isUnlocked ? (
              <div className="gq-gate-card">
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "rgba(5, 150, 105, 0.1)",
                      color: "#047857",
                      padding: "5px 14px",
                      borderRadius: 999,
                      fontSize: 11.5,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 12,
                    }}
                  >
                    <i className="bi bi-shield-check" /> Institutional Guided Setup
                  </div>
                  <h2 className="gq-form-title" style={{ fontSize: 24, lineHeight: 1.25, marginBottom: 8 }}>
                    School Onboarding is by Guided Demo &amp; Invitation
                  </h2>
                  <p className="gq-form-subtitle" style={{ fontSize: 13.5, lineHeight: 1.6, color: "#475569", margin: "0 auto 18px" }}>
                    To ensure your school portal is configured with your official broadsheet grading templates, multi-bank split accounts, and teacher training, all new workspaces are provisioned following a quick 10-minute demonstration.
                  </p>
                </div>

                <div className="d-grid gap-2 mb-4">
                  <button
                    type="button"
                    className="gq-auth-btn-submit"
                    style={{ marginTop: 0, padding: "14px 20px", fontSize: 15 }}
                    onClick={() => navigate("/book-demo")}
                  >
                    <i className="bi bi-calendar-check me-2" /> Book a Free 10-Minute Live Demo
                  </button>
                  <a
                    href="https://wa.me/2348165748374?text=Hello%20SchoolProfit%2C%20I%20want%20to%20request%20guided%20onboarding%20for%20my%20school"
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline-success"
                    style={{ borderRadius: 12, padding: "12px 18px", fontWeight: 700, fontSize: 13.5, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <i className="bi bi-whatsapp me-2" /> Chat with School Onboarding Specialist
                  </a>
                </div>

                {/* Partner Code Access */}
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 14, padding: "16px 18px", marginTop: 10 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: "#334155", marginBottom: 6 }}>
                    Have a Sales Partner Referral Code or Admin Invite?
                  </div>
                  <p style={{ fontSize: 12, color: "#64748B", marginBottom: 12, lineHeight: 1.5 }}>
                    Enter your certified Sales Representative code (e.g. <code>REP-LAGOS-01</code>) or invitation token to unlock registration immediately.
                  </p>

                  <form onSubmit={handleUnlockWithCode}>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control fw-bold"
                        style={{ textTransform: "uppercase", fontSize: 13.5, borderColor: "#CBD5E1" }}
                        placeholder="Enter Referral Code"
                        value={enteredCode}
                        onChange={(e) => {
                          setEnteredCode(e.target.value);
                          setCodeError("");
                        }}
                      />
                      <button className="btn btn-dark fw-bold px-3" type="submit" style={{ fontSize: 13 }}>
                        Unlock Form →
                      </button>
                    </div>
                    {codeError && <p className="gq-field-err mt-1">{codeError}</p>}
                  </form>
                </div>
              </div>
            ) : (
              <>
                {/* Referral Code Active Banner */}
                {referralCode && (
                  <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 10, padding: "8px 12px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: "#065F46", fontWeight: 700 }}>
                      <i className="bi bi-check-circle-fill me-1 text-success" /> Partner Referral: <strong>{referralCode}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUnlocked(false);
                        setReferralCode("");
                        set("referral_code", null);
                      }}
                      style={{ background: "transparent", border: "none", color: "#047857", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
                    >
                      Change
                    </button>
                  </div>
                )}

                {/* Step Progress */}
                <div className="gq-step-progress">
                  <div
                    className={`gq-step-item ${step === 1 ? "active" : ""}`}
                    onClick={() => setStep(1)}
                  >
                    <span className="gq-step-num">1</span>
                    <span>School Profile</span>
                  </div>
                  <span style={{ color: "#CBD5E1" }}>→</span>
                  <div
                    className={`gq-step-item ${step === 2 ? "active" : ""}`}
                    onClick={() => step1Valid && setStep(2)}
                  >
                    <span className="gq-step-num">2</span>
                    <span>Admin Account</span>
                  </div>
                </div>

                {errors.general && (
                  <div className="gq-auth-error" role="alert">
                    <i className="bi bi-exclamation-circle-fill" />
                    <span>{errors.general}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  {/* ── STEP 1: SCHOOL IDENTITY ── */}
                  {step === 1 && (
                    <div>
                      <h2 className="gq-form-title">Tell us about your school</h2>
                      <p className="gq-form-subtitle">Enter your institution name and operating location in Nigeria.</p>

                      <div className="gq-form-group">
                        <label className="gq-form-label" htmlFor="school_name">
                          Official School Name *
                        </label>
                        <div className="gq-input-wrap">
                          <span className="gq-input-icon">
                            <i className="bi bi-buildings" />
                          </span>
                          <input
                            id="school_name"
                            type="text"
                            className="gq-auth-input"
                            placeholder="e.g. Samjane Arise and Shine Group of Schools"
                            value={form.school_name}
                            onChange={(e) => set("school_name", e.target.value)}
                            required
                          />
                        </div>
                        {errors.school_name && <p className="gq-field-err">{errors.school_name}</p>}
                      </div>

                      <div className="gq-form-group">
                        <label className="gq-form-label" htmlFor="address">
                          School Address / State *
                        </label>
                        <div className="gq-input-wrap">
                          <span className="gq-input-icon">
                            <i className="bi bi-geo-alt" />
                          </span>
                          <input
                            id="address"
                            type="text"
                            className="gq-auth-input"
                            placeholder="e.g. Badagry, Lagos State"
                            value={form.address}
                            onChange={(e) => set("address", e.target.value)}
                            required
                          />
                        </div>
                        {errors.address && <p className="gq-field-err">{errors.address}</p>}
                      </div>

                      <button
                        type="button"
                        className="gq-auth-btn-submit"
                        disabled={!step1Valid}
                        onClick={() => setStep(2)}
                      >
                        Continue to Admin Setup
                        <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                          <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* ── STEP 2: ADMINISTRATOR ACCOUNT ── */}
                  {step === 2 && (
                    <div>
                      <h2 className="gq-form-title">Create Admin Credentials</h2>
                      <p className="gq-form-subtitle">These details will be your primary login as the school proprietor / principal.</p>

                      <div className="row g-2 mb-3">
                        <div className="col-6">
                          <label className="gq-form-label" htmlFor="firstname">First Name *</label>
                          <input
                            id="firstname"
                            type="text"
                            className="gq-auth-input"
                            style={{ paddingLeft: 14 }}
                            placeholder="e.g. Samuel"
                            value={form.firstname}
                            onChange={(e) => set("firstname", e.target.value)}
                            required
                          />
                          {errors.firstname && <p className="gq-field-err">{errors.firstname}</p>}
                        </div>
                        <div className="col-6">
                          <label className="gq-form-label" htmlFor="surname">Surname *</label>
                          <input
                            id="surname"
                            type="text"
                            className="gq-auth-input"
                            style={{ paddingLeft: 14 }}
                            placeholder="e.g. Adeyemi"
                            value={form.surname}
                            onChange={(e) => set("surname", e.target.value)}
                            required
                          />
                          {errors.surname && <p className="gq-field-err">{errors.surname}</p>}
                        </div>
                      </div>

                      <div className="gq-form-group">
                        <label className="gq-form-label" htmlFor="phone">Phone Number *</label>
                        <div className="gq-input-wrap">
                          <span className="gq-input-icon"><i className="bi bi-telephone" /></span>
                          <input
                            id="phone"
                            type="tel"
                            className="gq-auth-input"
                            placeholder="08012345678"
                            value={form.phone}
                            onChange={(e) => set("phone", e.target.value)}
                            required
                          />
                        </div>
                        {errors.phone && <p className="gq-field-err">{errors.phone}</p>}
                      </div>

                      <div className="gq-form-group">
                        <label className="gq-form-label" htmlFor="email">Email Address (Optional)</label>
                        <div className="gq-input-wrap">
                          <span className="gq-input-icon"><i className="bi bi-envelope" /></span>
                          <input
                            id="email"
                            type="email"
                            className="gq-auth-input"
                            placeholder="proprietor@school.com"
                            value={form.email || ""}
                            onChange={(e) => set("email", e.target.value)}
                          />
                        </div>
                        {errors.email && <p className="gq-field-err">{errors.email}</p>}
                      </div>

                      <div className="gq-form-group">
                        <label className="gq-form-label" htmlFor="password">Password (Min 8 characters) *</label>
                        <div className="gq-input-wrap">
                          <span className="gq-input-icon"><i className="bi bi-lock" /></span>
                          <input
                            id="password"
                            type={showPw ? "text" : "password"}
                            className="gq-auth-input"
                            placeholder="Create strong password"
                            value={form.password}
                            onChange={(e) => set("password", e.target.value)}
                            style={{ paddingRight: 40 }}
                            required
                          />
                          <button
                            type="button"
                            className="gq-btn-eye"
                            onClick={() => setShowPw(!showPw)}
                          >
                            <i className={showPw ? "bi bi-eye-slash" : "bi bi-eye"} />
                          </button>
                        </div>
                        {form.password && (
                          <div className="gq-strength-bar-wrap">
                            <div className="gq-strength-track">
                              <div
                                className="gq-strength-fill"
                                style={{
                                  width: `${(strength.score / 4) * 100}%`,
                                  backgroundColor: strength.color,
                                }}
                              />
                            </div>
                            <span className="gq-strength-label" style={{ color: strength.color }}>
                              {strength.label}
                            </span>
                          </div>
                        )}
                        {errors.password && <p className="gq-field-err">{errors.password}</p>}
                      </div>

                      <div className="gq-form-group">
                        <label className="gq-form-label" htmlFor="password_confirmation">Confirm Password *</label>
                        <div className="gq-input-wrap">
                          <span className="gq-input-icon"><i className="bi bi-lock-fill" /></span>
                          <input
                            id="password_confirmation"
                            type={showPw2 ? "text" : "password"}
                            className="gq-auth-input"
                            placeholder="Repeat your password"
                            value={form.password_confirmation}
                            onChange={(e) => set("password_confirmation", e.target.value)}
                            style={{ paddingRight: 40 }}
                            required
                          />
                          <button
                            type="button"
                            className="gq-btn-eye"
                            onClick={() => setShowPw2(!showPw2)}
                          >
                            <i className={showPw2 ? "bi bi-eye-slash" : "bi bi-eye"} />
                          </button>
                        </div>
                        {form.password_confirmation && form.password !== form.password_confirmation && (
                          <p className="gq-field-err">Passwords do not match</p>
                        )}
                      </div>

                      <div className="d-flex gap-2 mt-3">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          style={{ borderRadius: 10, padding: "0 18px", fontWeight: 700 }}
                          onClick={() => setStep(1)}
                        >
                          ← Back
                        </button>
                        <button
                          type="submit"
                          className="gq-auth-btn-submit flex-grow-1"
                          style={{ marginTop: 0 }}
                          disabled={!canSubmit || submitting}
                        >
                          {submitting ? (
                            <>
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                              Creating School...
                            </>
                          ) : (
                            <>
                              Complete Registration
                              <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                                <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </>
            )}

            {/* Login Footer */}
            <div className="gq-auth-footer-links">
              Already have an active school account?{" "}
              <Link to="/login">Sign In Here</Link>
              <div style={{ marginTop: 6, fontSize: "12px" }}>
                Looking to represent SchoolProfit in your state?{" "}
                <Link to="/sales-representative/register">Join as Sales Partner (Earn 30%)</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
