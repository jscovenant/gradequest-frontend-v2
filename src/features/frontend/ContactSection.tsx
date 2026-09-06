import { useState } from "react";
import { usePlatformInfo } from "../../hooks/usePlatformInfo";
import { api } from "../../utils/api";

export default function ContactSection() {
  const { whatsappLink, platform } = usePlatformInfo();
  const [formData, setFormData] = useState({
    name: "",
    school_name: "",
    phone: "",
    email: "",
    location: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/frontend/demo-booking", {
        contact_name: formData.name,
        prospect_school_name: formData.school_name,
        contact_phone: formData.phone,
        contact_email: formData.email,
        location: formData.location,
        additional_notes: formData.message,
        source: "homepage_contact_section",
      });
      setSubmitted(true);
      setFormData({
        name: "",
        school_name: "",
        phone: "",
        email: "",
        location: "",
        message: "",
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to send message right now. Please message us directly on WhatsApp or call our support lines.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

        .gq-contact-section {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #172554 100%);
          padding: 100px 0 110px;
          position: relative;
          overflow: hidden;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          color: #FFFFFF;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .gq-contact-section::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 80% 20%, rgba(217, 119, 6, 0.12) 0%, transparent 60%),
                      radial-gradient(circle at 10% 90%, rgba(29, 78, 216, 0.15) 0%, transparent 60%);
          pointer-events: none;
        }

        .gq-contact-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #FBBF24;
          background: rgba(251, 191, 36, 0.15);
          border: 1px solid rgba(251, 191, 36, 0.35);
          border-radius: 999px;
          padding: 6px 18px;
          margin-bottom: 18px;
        }

        .gq-contact-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(32px, 4vw, 50px);
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.2;
          margin-bottom: 18px;
        }

        .gq-contact-title em {
          font-style: italic;
          color: #FBBF24;
          background: linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .gq-contact-subtitle {
          font-size: 16px;
          line-height: 1.7;
          color: #E2E8F0;
          max-width: 580px;
          margin-bottom: 40px;
        }

        .gq-contact-card {
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 18px;
          padding: 24px;
          backdrop-filter: blur(12px);
          transition: all 0.25s ease;
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 18px;
          text-decoration: none;
          color: #FFFFFF;
        }

        .gq-contact-card:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: #FBBF24;
          transform: translateY(-3px);
          color: #FFFFFF;
        }

        .gq-contact-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }

        .gq-contact-label {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #FBBF24;
          margin-bottom: 4px;
        }

        .gq-contact-value {
          font-size: 16px;
          font-weight: 700;
          color: #FFFFFF;
          margin-bottom: 2px;
        }

        .gq-contact-desc {
          font-size: 13px;
          color: #CBD5E1;
          margin: 0;
        }

        /* ── Form Card ── */
        .gq-contact-form-box {
          background: #FFFFFF;
          border-radius: 24px;
          padding: 38px 34px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
          color: #0F172A;
        }

        .gq-form-heading {
          font-size: 22px;
          font-weight: 800;
          color: #0F2744;
          margin-bottom: 6px;
        }

        .gq-form-subheading {
          font-size: 14px;
          color: #64748B;
          margin-bottom: 24px;
        }

        .gq-form-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #1E293B;
          margin-bottom: 6px;
        }

        .gq-form-label span.req {
          color: #DC2626;
        }

        .gq-form-control {
          width: 100%;
          padding: 12px 16px;
          border: 1.5px solid #CBD5E1;
          border-radius: 10px;
          font-size: 14.5px;
          color: #0F172A;
          background: #F8FAFC;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .gq-form-control:focus {
          outline: none;
          background: #FFFFFF;
          border-color: #1D4ED8;
          box-shadow: 0 0 0 3.5px rgba(29, 78, 216, 0.14);
        }

        .gq-btn-contact-submit {
          width: 100%;
          background: linear-gradient(135deg, #0F2744 0%, #1E3A8A 100%);
          color: #FFFFFF;
          font-size: 15px;
          font-weight: 800;
          padding: 14px 20px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 6px 18px rgba(15, 39, 68, 0.25);
        }

        .gq-btn-contact-submit:hover {
          background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(30, 58, 138, 0.35);
          color: #FFFFFF;
        }

        .gq-contact-success {
          background: #ECFDF5;
          border: 1.5px solid #A7F3D0;
          border-radius: 14px;
          padding: 24px;
          text-align: center;
          color: #065F46;
        }
      `}</style>

      <section id="contact" className="gq-contact-section gq-scroll-reveal">
        <div className="container-xl position-relative" style={{ zIndex: 1 }}>
          <div className="row g-5 align-items-center">
            {/* Left Info Column */}
            <div className="col-12 col-lg-6">
              <div className="gq-contact-kicker">
                <span>📞</span> Get In Touch With SchoolProfit
              </div>

              <h2 className="gq-contact-title">
                Ready to make your school profitable? <br />
                <em>Let's talk today.</em>
              </h2>

              <p className="gq-contact-subtitle">
                Our school growth advisory team is available to guide school proprietors, principals, bursars, and ICT directors on smooth onboarding, fee debt elimination, and live system deployment.
              </p>

              {/* Contact Cards */}
              <div className="gq-contact-cards-wrap">
                {/* WhatsApp Card */}
                <a
                  href={whatsappLink("Hello SchoolProfit Team, I want to learn more about setting up our school on the platform.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gq-contact-card"
                >
                  <div className="gq-contact-icon" style={{ background: "rgba(34, 197, 94, 0.2)", color: "#4ADE80", border: "1px solid rgba(34, 197, 94, 0.4)" }}>
                    <i className="bi bi-whatsapp" />
                  </div>
                  <div>
                    <div className="gq-contact-label">Instant WhatsApp Hotline</div>
                    <div className="gq-contact-value">Click to Chat on WhatsApp</div>
                    <p className="gq-contact-desc">Immediate live response from dedicated school specialists.</p>
                  </div>
                </a>

                {/* Email Support */}
                <a
                  href="mailto:support@schoolprofit.ng"
                  className="gq-contact-card"
                >
                  <div className="gq-contact-icon" style={{ background: "rgba(59, 130, 246, 0.2)", color: "#60A5FA", border: "1px solid rgba(59, 130, 246, 0.4)" }}>
                    <i className="bi bi-envelope-fill" />
                  </div>
                  <div>
                    <div className="gq-contact-label">Official Support Desk</div>
                    <div className="gq-contact-value">support@schoolprofit.ng</div>
                    <p className="gq-contact-desc">Official inquiries, security audits, and institutional contracts.</p>
                  </div>
                </a>

                {/* Live Campus Advisory */}
                <div className="gq-contact-card" style={{ cursor: "default" }}>
                  <div className="gq-contact-icon" style={{ background: "rgba(245, 158, 11, 0.2)", color: "#FBBF24", border: "1px solid rgba(245, 158, 11, 0.4)" }}>
                    <i className="bi bi-clock-history" />
                  </div>
                  <div>
                    <div className="gq-contact-label">Operational Hours</div>
                    <div className="gq-contact-value">Monday – Saturday (8:00 AM – 7:00 PM)</div>
                    <p className="gq-contact-desc">24/7 Automated Exam Server and Results Verification monitoring.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Form Column */}
            <div className="col-12 col-lg-6">
              <div className="gq-contact-form-box">
                {submitted ? (
                  <div className="gq-contact-success">
                    <div style={{ fontSize: "36px", marginBottom: "10px" }}>🎉</div>
                    <h4 style={{ fontWeight: 800, color: "#065F46", marginBottom: "8px" }}>
                      Enquiry Received Successfully!
                    </h4>
                    <p style={{ fontSize: "14px", color: "#047857", marginBottom: "18px" }}>
                      Thank you for contacting SchoolProfit. A School Growth Consultant has received your request and will reach out to you within the hour.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSubmitted(false)}
                      className="btn btn-sm btn-outline-success fw-bold px-4 py-2"
                      style={{ borderRadius: "8px" }}
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <h3 className="gq-form-heading">Send Us a Direct Message</h3>
                    <p className="gq-form-subheading">
                      Fill out your institution details and we'll configure a tailored setup plan for you.
                    </p>

                    {error && (
                      <div className="alert alert-danger py-2 px-3 mb-3 fw-semibold" style={{ fontSize: "13px" }}>
                        {error}
                      </div>
                    )}

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="gq-form-label">Your Name <span className="req">*</span></label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="gq-form-control"
                          placeholder="e.g. Dr. Adesola Adeleke"
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="gq-form-label">School / Institution <span className="req">*</span></label>
                        <input
                          type="text"
                          required
                          value={formData.school_name}
                          onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                          className="gq-form-control"
                          placeholder="e.g. Kingsway College"
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="gq-form-label">Phone / WhatsApp Number <span className="req">*</span></label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="gq-form-control"
                          placeholder="e.g. +234 812 000 0000"
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="gq-form-label">Email Address <span className="req">*</span></label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="gq-form-control"
                          placeholder="e.g. admin@school.com"
                        />
                      </div>

                      <div className="col-12">
                        <label className="gq-form-label">City, State / Region</label>
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="gq-form-control"
                          placeholder="e.g. Lagos, Abuja, Port Harcourt, Accra, Nairobi"
                        />
                      </div>

                      <div className="col-12">
                        <label className="gq-form-label">How Can We Assist Your School?</label>
                        <textarea
                          rows={3}
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          className="gq-form-control"
                          placeholder="Tell us about your student population, grading requirements, CBT exam lab, or fee collection needs..."
                        />
                      </div>

                      <div className="col-12 mt-4">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="gq-btn-contact-submit"
                        >
                          {submitting ? (
                            <>
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                              Submitting Enquiry...
                            </>
                          ) : (
                            <>
                              Submit School Request
                              <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                                <path
                                  d="M1 7h12M7 1l6 6-6 6"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
