import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import PageTitle from "../components/PageTitle";
import { usePlatformInfo } from "../hooks/usePlatformInfo";
import { NIGERIAN_STATES_AND_LGAS } from "../utils/nigerianStatesAndLgas";

interface RegistrationForm {
  firstname: string;
  surname: string;
  email: string;
  phone: string;
  state: string;
  lga: string;
  region: string;
  password: string;
  password_confirmation: string;
  next_of_kin_name: string;
  next_of_kin_phone: string;
  highest_qualification: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  past_experience: string;
}

const initialForm: RegistrationForm = {
  firstname: "",
  surname: "",
  email: "",
  phone: "",
  state: "",
  lga: "",
  region: "",
  password: "",
  password_confirmation: "",
  next_of_kin_name: "",
  next_of_kin_phone: "",
  highest_qualification: "B.Sc / HND",
  bank_name: "",
  account_number: "",
  account_name: "",
  past_experience: "",
};

export default function PublicRepresentativeRegisterPage() {
  const { platform } = usePlatformInfo();
  const term1Rate = platform?.sales_partner_term_1_commission ?? 30;
  const retentionRate = platform?.sales_partner_retention_commission ?? 12;

  const [form, setForm] = useState<RegistrationForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submittedData, setSubmittedData] = useState<{
    code: string;
    name: string;
    email: string;
    status: string;
  } | null>(null);

  const navigate = useNavigate();

  const availableLgas = useMemo(() => {
    if (!form.state) return [];
    const found = NIGERIAN_STATES_AND_LGAS.find((s) => s.state === form.state);
    return found ? found.lgas : [];
  }, [form.state]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value;
    setForm((prev) => ({
      ...prev,
      state: newState,
      lga: "",
      region: newState,
    }));
  };

  const handleLgaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLga = e.target.value;
    setForm((prev) => ({
      ...prev,
      lga: newLga,
      region: newLga ? `${newLga}, ${prev.state}` : prev.state,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!form.state) {
      setErrorMessage("Please select your primary operating state from the dropdown.");
      return;
    }

    if (!form.lga) {
      setErrorMessage("Please select your primary Local Government Area (LGA).");
      return;
    }

    if (form.password !== form.password_confirmation) {
      setErrorMessage("Passwords do not match. Please verify and try again.");
      return;
    }

    if (form.password.length < 8) {
      setErrorMessage("Password must be at least 8 characters in length.");
      return;
    }

    setSubmitting(true);

    try {
      const regionPayload = `${form.lga}, ${form.state}`;
      const response = await api.post("/public/sales-representatives/register", {
        ...form,
        region: regionPayload,
      });

      setSubmittedData(response.data?.data || {
        code: "SUBMITTED",
        name: `${form.firstname} ${form.surname}`,
        email: form.email,
        status: "pending_approval",
      });
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message ||
        "Could not submit your application. Please ensure all required fields are filled and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageTitle title="Become a Sales Representative | SchoolProfit Partner Network" />
      <style>{`
        .gq-rep-page {
          min-height: 100vh;
          background: #F8FAFC;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          color: #0F2744;
          display: flex;
          flex-direction: column;
        }

        .gq-rep-nav {
          background: #FFFFFF;
          border-bottom: 1px solid #E2E8F0;
          padding: 16px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .gq-rep-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        .gq-rep-logo-badge {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #0F2744 0%, #1E3A8A 100%);
          border: 1px solid rgba(217, 119, 6, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(15, 39, 68, 0.15);
          flex-shrink: 0;
        }

        .gq-rep-logo-img {
          width: 26px;
          height: 26px;
          object-fit: contain;
          display: block;
        }

        .gq-rep-logo-text {
          font-size: 21px;
          font-weight: 800;
          color: #0F2744;
          letter-spacing: -0.02em;
        }

        .gq-rep-logo-text span {
          color: #D97706;
        }

        .gq-rep-hero {
          background: linear-gradient(135deg, #0F2744 0%, #1E3A8A 50%, #0A192F 100%);
          color: #FFFFFF;
          padding: 60px 24px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .gq-rep-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(251, 191, 36, 0.08) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }

        .gq-rep-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(217, 119, 6, 0.15);
          border: 1px solid rgba(251, 191, 36, 0.4);
          color: #FDE68A;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 20px;
          letter-spacing: 0.03em;
        }

        .gq-rep-title {
          font-size: 38px;
          font-weight: 800;
          line-height: 1.2;
          margin: 0 0 16px 0;
          letter-spacing: -0.02em;
        }

        .gq-rep-title span {
          color: #FBBF24;
          font-style: italic;
        }

        .gq-rep-sub {
          max-width: 720px;
          margin: 0 auto;
          font-size: 17px;
          line-height: 1.6;
          color: #CBD5E1;
        }

        .gq-rep-main {
          max-width: 1100px;
          margin: -40px auto 60px;
          padding: 0 20px;
          width: 100%;
          position: relative;
          z-index: 10;
        }

        .gq-rep-grid {
          display: grid;
          grid-template-columns: 1fr 1.35fr;
          gap: 28px;
          align-items: flex-start;
        }

        @media (max-width: 960px) {
          .gq-rep-grid {
            grid-template-columns: 1fr;
          }
          .gq-rep-hero {
            padding: 44px 20px;
          }
          .gq-rep-title {
            font-size: 28px;
          }
        }

        .gq-rep-perks-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 10px 25px -5px rgba(15, 39, 68, 0.06);
        }

        .gq-perk-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
        }

        .gq-perk-item:last-child {
          margin-bottom: 0;
        }

        .gq-perk-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #ECFDF5;
          color: #059669;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .gq-perk-icon.gold {
          background: #FEF3C7;
          color: #D97706;
        }

        .gq-perk-icon.blue {
          background: #EFF6FF;
          color: #1D4ED8;
        }

        .gq-perk-content h4 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 700;
          color: #0F2744;
        }

        .gq-perk-content p {
          margin: 0;
          font-size: 13.5px;
          line-height: 1.5;
          color: #475569;
        }

        .gq-rep-form-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 20px;
          padding: 36px;
          box-shadow: 0 12px 30px -5px rgba(15, 39, 68, 0.08);
        }

        .gq-form-section-title {
          font-size: 17px;
          font-weight: 700;
          color: #0F2744;
          display: flex;
          align-items: center;
          gap: 10px;
          padding-bottom: 12px;
          border-bottom: 1px solid #E2E8F0;
          margin: 24px 0 18px 0;
        }

        .gq-form-section-title:first-of-type {
          margin-top: 0;
        }

        .gq-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        @media (max-width: 640px) {
          .gq-form-row {
            grid-template-columns: 1fr;
          }
        }

        .gq-form-group {
          margin-bottom: 16px;
        }

        .gq-form-group label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 6px;
        }

        .gq-form-group label span.req {
          color: #DC2626;
        }

        .gq-form-input,
        .gq-form-select,
        .gq-form-textarea {
          width: 100%;
          padding: 11px 14px;
          border: 1.5px solid #E2E8F0;
          border-radius: 10px;
          font-size: 14px;
          color: #0F172A;
          background: #FFFFFF;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .gq-form-input:focus,
        .gq-form-select:focus,
        .gq-form-textarea:focus {
          outline: none;
          border-color: #1D4ED8;
          box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.12);
        }

        .gq-btn-primary {
          width: 100%;
          padding: 14px 20px;
          background: linear-gradient(135deg, #0F2744 0%, #1E3A8A 100%);
          color: #FFFFFF;
          border: none;
          border-radius: 12px;
          font-size: 15.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 6px 18px rgba(15, 39, 68, 0.2);
        }

        .gq-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(15, 39, 68, 0.28);
          background: linear-gradient(135deg, #1E3A8A 0%, #0F2744 100%);
        }

        .gq-btn-primary:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .gq-alert-error {
          background: #FEF2F2;
          border: 1px solid #FCA5A5;
          color: #991B1B;
          padding: 14px 16px;
          border-radius: 10px;
          font-size: 13.5px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .gq-success-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 20px;
          padding: 44px 32px;
          text-align: center;
          box-shadow: 0 12px 32px rgba(15, 39, 68, 0.08);
          max-width: 680px;
          margin: 0 auto;
        }

        .gq-success-icon {
          width: 72px;
          height: 72px;
          background: #FEF3C7;
          border: 2px solid #FDE68A;
          border-radius: 50%;
          color: #D97706;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          margin: 0 auto 20px;
        }

        .gq-summary-box {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 20px;
          margin: 24px 0;
          text-align: left;
        }

        .gq-summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px dashed #E2E8F0;
          font-size: 14px;
        }

        .gq-summary-row:last-child {
          border-bottom: none;
        }
      `}</style>
      <PageTitle title="Become a Sales Representative | SchoolProfit Partner Network" />
      <style>{`
        .gq-rep-page {
          min-height: 100vh;
          background: #F8FAFC;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          color: #0F2744;
          display: flex;
          flex-direction: column;
        }

        .gq-rep-nav {
          background: #FFFFFF;
          border-bottom: 1px solid #E2E8F0;
          padding: 16px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .gq-rep-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        .gq-rep-logo-badge {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>

      <div className="gq-rep-page">
        {/* Navigation Header */}
        <header className="gq-rep-nav">
          <Link to="/" className="gq-rep-logo">
            <div className="gq-rep-logo-badge">
              <img
                src="/media/logo/schoolprofit-icon.svg"
                alt="SchoolProfit Logo"
                className="gq-rep-logo-img"
                style={{ width: "32px", height: "32px" }}
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                }}
              />
            </div>
            <div className="gq-rep-logo-text">
              School<span style={{ color: "#059669" }}>Profit</span>
            </div>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span style={{ fontSize: "14px", color: "#64748B" }}>Already registered?</span>
            <Link
              to="/login"
              style={{
                fontSize: "14px",
                fontWeight: "700",
                color: "#1D4ED8",
                textDecoration: "none",
                padding: "8px 16px",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                background: "#FFFFFF",
              }}
            >
              Sign In
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="gq-rep-hero">
          <div className="gq-rep-badge">
            <i className="bi bi-award-fill" /> SchoolProfit Partner &amp; Representative Program
          </div>
          <h1 className="gq-rep-title">
            Empower Schools. <span>Earn Recurring Royalties.</span>
          </h1>
          <p className="gq-rep-sub">
            Join our nationwide network of education sales partners. Introduce SchoolProfit to schools in your state or region and earn up to {term1Rate}% first-term commission with {retentionRate}% termly recurring retention.
          </p>
        </section>

        {/* Main Content Area */}
        <main className="gq-rep-main">
          {submittedData ? (
            /* Success / Pending Verification View */
            <div className="gq-success-card">
              <div className="gq-success-icon">
                <i className="bi bi-clock-history" />
              </div>
              <h2 style={{ fontSize: "26px", fontWeight: "800", color: "#0F2744", margin: "0 0 10px 0" }}>
                Application Submitted for Verification
              </h2>
              <p style={{ fontSize: "15px", color: "#475569", lineHeight: "1.6", margin: "0 auto", maxWidth: "520px" }}>
                Thank you for applying to become a SchoolProfit Sales Representative! Your application has been registered and is currently awaiting administrative approval.
              </p>

              <div className="gq-summary-box">
                <div className="gq-summary-row">
                  <span style={{ color: "#64748B" }}>Applicant Name:</span>
                  <strong style={{ color: "#0F2744" }}>{submittedData.name}</strong>
                </div>
                <div className="gq-summary-row">
                  <span style={{ color: "#64748B" }}>Registered Email:</span>
                  <strong style={{ color: "#0F2744" }}>{submittedData.email}</strong>
                </div>
                <div className="gq-summary-row">
                  <span style={{ color: "#64748B" }}>Assigned Application Code:</span>
                  <span style={{ background: "#0F2744", color: "#FBBF24", padding: "2px 8px", borderRadius: "6px", fontWeight: "700", fontSize: "13px" }}>
                    {submittedData.code}
                  </span>
                </div>
                <div className="gq-summary-row">
                  <span style={{ color: "#64748B" }}>Review Status:</span>
                  <strong style={{ color: "#D97706" }}>● Pending Admin Approval</strong>
                </div>
              </div>

              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "12px", padding: "16px 20px", textAlign: "left", marginBottom: "28px" }}>
                <h4 style={{ margin: "0 0 6px 0", color: "#047857", fontSize: "14px", fontWeight: "700" }}>
                  <i className="bi bi-info-circle-fill" style={{ marginRight: "8px" }} />
                  What happens next?
                </h4>
                <p style={{ margin: 0, fontSize: "13.5px", color: "#065F46", lineHeight: "1.5" }}>
                  Our administrative team will review your application within <strong>24 business hours</strong>. As soon as your account is approved, you will receive an email confirmation and can immediately log in to access your Sales Workspace, referral link, and marketing toolkits.
                </p>
              </div>

              <div style={{ display: "flex", gap: "14px", justifyContent: "center" }}>
                <Link
                  to="/"
                  style={{
                    padding: "12px 24px",
                    background: "#F1F5F9",
                    color: "#334155",
                    textDecoration: "none",
                    borderRadius: "10px",
                    fontWeight: "700",
                    fontSize: "14.5px",
                  }}
                >
                  Return to Home
                </Link>
                <Link
                  to="/login"
                  style={{
                    padding: "12px 28px",
                    background: "linear-gradient(135deg, #0F2744 0%, #1E3A8A 100%)",
                    color: "#FFFFFF",
                    textDecoration: "none",
                    borderRadius: "10px",
                    fontWeight: "700",
                    fontSize: "14.5px",
                    boxShadow: "0 4px 12px rgba(15, 39, 68, 0.2)",
                  }}
                >
                  Go to Login Portal
                </Link>
              </div>
            </div>
          ) : (
            /* Registration Form View */
            <div className="gq-rep-grid">
              {/* Left Column: Perks & Benefits */}
              <aside className="gq-rep-perks-card">
                <div style={{ marginBottom: "24px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "800", color: "#D97706", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Why Partner With Us
                  </span>
                  <h3 style={{ margin: "6px 0 0 0", fontSize: "22px", fontWeight: "800", color: "#0F2744" }}>
                    Unmatched Partnership Rewards
                  </h3>
                </div>

                <div className="gq-perk-item">
                  <div className="gq-perk-icon gold">
                    <i className="bi bi-cash-stack" />
                  </div>
                  <div className="gq-perk-content">
                    <h4>Up to {term1Rate}% First-Term Royalties</h4>
                    <p>Earn an industry-leading {term1Rate}% direct commission on the initial onboarding subscription of every school you register.</p>
                  </div>
                </div>

                <div className="gq-perk-item">
                  <div className="gq-perk-icon">
                    <i className="bi bi-arrow-repeat" />
                  </div>
                  <div className="gq-perk-content">
                    <h4>{retentionRate}% Recurring Termly Retention</h4>
                    <p>Build true passive income. Continue earning {retentionRate}% on every subsequent term renewal as long as your registered schools stay active.</p>
                  </div>
                </div>

                <div className="gq-perk-item">
                  <div className="gq-perk-icon blue">
                    <i className="bi bi-speedometer2" />
                  </div>
                  <div className="gq-perk-content">
                    <h4>Dedicated Sales Workspace</h4>
                    <p>Access your real-time lead tracker, custom branded landing page, automated commission ledger, and bank settlement profile.</p>
                  </div>
                </div>

                <div className="gq-perk-item">
                  <div className="gq-perk-icon gold">
                    <i className="bi bi-folder-check" />
                  </div>
                  <div className="gq-perk-content">
                    <h4>Official Marketing Toolkit</h4>
                    <p>Download branded presentation decks, school proposal templates, flyers, and WhatsApp sales pitch scripts ready for action.</p>
                  </div>
                </div>

                <div style={{ marginTop: "28px", padding: "16px", background: "#F8FAFC", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#0F2744", fontWeight: "700", fontSize: "13.5px" }}>
                    <i className="bi bi-shield-check" style={{ color: "#059669", fontSize: "18px" }} />
                    Verified Partner Security
                  </div>
                  <p style={{ margin: "6px 0 0 0", fontSize: "12.5px", color: "#64748B", lineHeight: "1.4" }}>
                    All accounts undergo administrative credential checks before activation to maintain professional representation standards.
                  </p>
                </div>
              </aside>

              {/* Right Column: Registration Form */}
              <section className="gq-rep-form-card">
                <h3 style={{ margin: "0 0 8px 0", fontSize: "22px", fontWeight: "800", color: "#0F2744" }}>
                  Representative Application Form
                </h3>
                <p style={{ margin: "0 0 24px 0", fontSize: "14px", color: "#64748B" }}>
                  Fill in your personal and regional details below to initiate your partner registration.
                </p>

                {errorMessage && (
                  <div className="gq-alert-error">
                    <i className="bi bi-exclamation-triangle-fill" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* Personal Information */}
                  <div className="gq-form-section-title">
                    <i className="bi bi-person-badge-fill" style={{ color: "#1D4ED8" }} />
                    Personal & Contact Details
                  </div>

                  <div className="gq-form-row">
                    <div className="gq-form-group">
                      <label>First Name <span className="req">*</span></label>
                      <input
                        type="text"
                        name="firstname"
                        required
                        value={form.firstname}
                        onChange={handleChange}
                        placeholder="e.g. Samuel"
                        className="gq-form-input"
                      />
                    </div>
                    <div className="gq-form-group">
                      <label>Last Name / Surname <span className="req">*</span></label>
                      <input
                        type="text"
                        name="surname"
                        required
                        value={form.surname}
                        onChange={handleChange}
                        placeholder="e.g. Adebayo"
                        className="gq-form-input"
                      />
                    </div>
                  </div>

                  <div className="gq-form-row">
                    <div className="gq-form-group">
                      <label>Email Address <span className="req">*</span></label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={form.email}
                        onChange={handleChange}
                        placeholder="e.g. samuel@example.com"
                        className="gq-form-input"
                      />
                    </div>
                    <div className="gq-form-group">
                      <label>Phone / WhatsApp Number <span className="req">*</span></label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="e.g. 08012345678"
                        className="gq-form-input"
                      />
                    </div>
                  </div>

                  <div className="gq-form-row">
                    <div className="gq-form-group">
                      <label>Operating State <span className="req">*</span></label>
                      <select
                        name="state"
                        required
                        value={form.state}
                        onChange={handleStateChange}
                        className="gq-form-select"
                      >
                        <option value="">-- Select Operating State --</option>
                        {NIGERIAN_STATES_AND_LGAS.map((s) => (
                          <option key={s.state} value={s.state}>
                            {s.state} {s.alias ? `(${s.alias})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="gq-form-group">
                      <label>Primary LGA / District <span className="req">*</span></label>
                      <select
                        name="lga"
                        required
                        disabled={!form.state}
                        value={form.lga}
                        onChange={handleLgaChange}
                        className="gq-form-select"
                      >
                        <option value="">
                          {form.state ? "-- Select Local Government Area --" : "-- Select state first --"}
                        </option>
                        {availableLgas.map((lga) => (
                          <option key={lga} value={lga}>
                            {lga}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Security Credentials */}
                  <div className="gq-form-section-title">
                    <i className="bi bi-lock-fill" style={{ color: "#1D4ED8" }} />
                    Account Security Password
                  </div>

                  <div className="gq-form-row">
                    <div className="gq-form-group">
                      <label>Create Password <span className="req">*</span></label>
                      <input
                        type="password"
                        name="password"
                        required
                        minLength={8}
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Minimum 8 characters"
                        className="gq-form-input"
                      />
                    </div>
                    <div className="gq-form-group">
                      <label>Confirm Password <span className="req">*</span></label>
                      <input
                        type="password"
                        name="password_confirmation"
                        required
                        minLength={8}
                        value={form.password_confirmation}
                        onChange={handleChange}
                        placeholder="Re-enter password"
                        className="gq-form-input"
                      />
                    </div>
                  </div>

                  {/* Next of Kin & Payout Settlement Details */}
                  <div className="gq-form-section-title">
                    <i className="bi bi-people-fill" style={{ color: "#1D4ED8" }} />
                    Next of Kin Information (Optional)
                  </div>

                  <div className="gq-form-row">
                    <div className="gq-form-group">
                      <label>Next of Kin Full Name</label>
                      <input
                        type="text"
                        name="next_of_kin_name"
                        value={form.next_of_kin_name}
                        onChange={handleChange}
                        placeholder="e.g. Mary Adebayo"
                        className="gq-form-input"
                      />
                    </div>
                    <div className="gq-form-group">
                      <label>Next of Kin Phone</label>
                      <input
                        type="tel"
                        name="next_of_kin_phone"
                        value={form.next_of_kin_phone}
                        onChange={handleChange}
                        placeholder="e.g. 08087654321"
                        className="gq-form-input"
                      />
                    </div>
                  </div>

                  <div className="gq-form-group">
                    <label>Relationship to Next of Kin</label>
                    <input
                      type="text"
                      name="next_of_kin_relationship"
                      value={form.next_of_kin_relationship}
                      onChange={handleChange}
                      placeholder="e.g. Spouse, Brother, Sister, Parent"
                      className="gq-form-input"
                    />
                  </div>

                  <div className="gq-form-group">
                    <label>Brief Background / Sales Experience (Optional)</label>
                    <textarea
                      name="notes"
                      rows={3}
                      value={form.notes}
                      onChange={handleChange}
                      placeholder="Share any brief experience you have in school outreach, education consulting, or marketing..."
                      className="gq-form-textarea"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="gq-btn-primary"
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        Submitting Application…
                      </>
                    ) : (
                      <>
                        Submit Partner Application →
                      </>
                    )}
                  </button>

                  <p style={{ textAlign: "center", fontSize: "12px", color: "#64748B", margin: "16px 0 0 0" }}>
                    By submitting, you agree to SchoolProfit’s Partner Terms and Code of Conduct. Applications require administrator verification before activation.
                  </p>
                </form>
              </section>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
