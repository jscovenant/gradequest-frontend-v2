import { useState } from "react";
import { usePlatformInfo } from "../../hooks/usePlatformInfo";
import { api } from "../../utils/api";

export default function Footer() {
  const { whatsappLink, platform } = usePlatformInfo();
  const year = new Date().getFullYear();
  const term1Rate = platform.sales_partner_term_1_commission || 30;
  const retentionRate = platform.sales_partner_retention_commission || 12;

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const [newsletterError, setNewsletterError] = useState("");

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterError("");
    const trimmed = newsletterEmail.trim();
    if (!trimmed) {
      setNewsletterError("Please enter your email.");
      return;
    }

    setNewsletterSubmitting(true);
    try {
      const response = await api.post("/frontend/newsletter-subscribe", {
        email: trimmed,
        source: "homepage_footer",
      });

      setNewsletterSuccess(true);
      setNewsletterMessage(response.data?.message || "Subscribed successfully! Thank you for staying connected.");
      setNewsletterEmail("");
      setTimeout(() => {
        setNewsletterSuccess(false);
        setNewsletterMessage("");
      }, 7000);
    } catch (err: any) {
      setNewsletterError(err?.response?.data?.message || "Subscription failed. Please check your email and try again.");
    } finally {
      setNewsletterSubmitting(false);
    }
  };

  const navLinks = {
    Product: [
      { label: "Student Management", href: "#features" },
      { label: "Why SchoolProfit", href: "#why-schoolprofit" },
      { label: "Results & PIN System", href: "#features" },
      { label: "Fee Collections & Debt Control", href: "#features" },
      { label: "AI Teacher Assistant", href: "#features" },
      { label: "Parent Portal", href: "#features" },
    ],
    Partners: [
      { label: "Become a Sales Partner", href: "/sales-representative/register" },
      { label: `Earn ${term1Rate}% Commission`, href: "/sales-representative/register" },
      { label: "Partner Login Portal", href: "/login" },
      { label: "Marketing Kit & Tools", href: "/login" },
    ],
    Company: [
      { label: "About Us", href: "#" },
      { label: "Our Schools", href: "#schools" },
      { label: "Educational Blog", href: "#blog" },
      { label: "Pricing", href: "#pricing" },
      { label: "Facebook Page", href: "https://web.facebook.com/profile.php?id=61585446674333" },
      { label: "Testimonials", href: "#testimonials" },
      { label: "Book a Demo", href: "/book-demo" },
    ],
    Support: [
      { label: "Help Centre", href: "#" },
      { label: "WhatsApp Support", href: whatsappLink("Hello SchoolProfit, I would like support regarding my school portal.") },
      { label: "Facebook Community", href: "https://web.facebook.com/profile.php?id=61585446674333" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms of Service", href: "/terms-and-conditions" },
    ],
  };

  const socials = [
    {
      label: "Facebook",
      href: "https://web.facebook.com/profile.php?id=61585446674333",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3V2z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      label: "WhatsApp",
      href: whatsappLink("Hello GradiosEdu, I want to connect with your team."),
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      label: "Twitter / X",
      href: "#",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 4l16 16M4 20L20 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "LinkedIn",
      href: "#",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="1.6" />
          <path d="M7 10v7M7 7v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path
            d="M12 17v-4a2 2 0 014 0v4M12 10v7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      label: "Instagram",
      href: "#",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
        </svg>
      ),
    },
  ];

  const trustBadges = [
    {
      label: "99.9% uptime SLA",
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 2l2 4h4l-3 2.6 1.2 4L8 10.3 3.8 12.6 5 8.6 2 6h4z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      label: "End-to-end encrypted",
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 2l5 2v4c0 3.5-2.5 6-5 7C5.5 14 3 11.5 3 8V4l5-2z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path d="M5.5 8l2 2 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: "Daily automated backups",
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M13 8A5 5 0 113 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M13 4v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: "Verified data compliance",
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        :root {
          --ft-dark: #0A192F;
          --ft-dark-navy: #0F2744;
          --ft-accent: #FBBF24;
          --ft-gold: #D97706;
          --ft-slate: rgba(255,255,255,0.32);
          --ft-muted: #94A3B8;
          --ft-border: rgba(255,255,255,0.08);
          --ft-surface: rgba(255,255,255,0.05);
        }

        .ft-footer {
          background-color: var(--ft-dark);
          color: #CBD5E1;
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          position: relative;
          overflow: hidden;
        }

        .ft-footer::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 10% 20%, rgba(29, 78, 216, 0.07) 0%, transparent 50%),
                      radial-gradient(circle at 90% 80%, rgba(217, 119, 6, 0.05) 0%, transparent 50%);
          pointer-events: none;
        }

        .ft-z {
          position: relative;
          z-index: 2;
        }

        .ft-wave {
          display: block;
          width: 100%;
          line-height: 0;
          background: #F8FAFC;
        }
        .ft-wave svg {
          display: block;
          width: 100%;
          height: 38px;
        }

        .ft-logo {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }

        .ft-logo-wrap {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #0F2744 0%, #1D4ED8 100%);
          border: 1px solid rgba(251, 191, 36, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(0,0,0,0.3);
        }

        .ft-logo-img {
          width: 26px;
          height: 26px;
          object-fit: contain;
        }

        .ft-logo-text {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: #FFFFFF;
          letter-spacing: -0.02em;
        }
        .ft-logo-text span {
          color: #FBBF24;
        }

        .ft-tagline {
          font-size: 13.5px;
          line-height: 1.7;
          color: var(--ft-muted);
          max-width: 300px;
        }

        .ft-social-btn {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: var(--ft-surface);
          border: 1px solid var(--ft-border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .ft-social-btn:hover {
          background: #D97706;
          color: #FFFFFF;
          border-color: #D97706;
          transform: translateY(-2px);
        }

        .ft-partner-cta-box {
          background: linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, rgba(29, 78, 216, 0.12) 100%);
          border: 1px solid rgba(251, 191, 36, 0.3);
          border-radius: 14px;
          padding: 18px 22px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .ft-partner-cta-btn {
          background: linear-gradient(135deg, #FBBF24 0%, #D97706 100%);
          color: #0F2744;
          font-weight: 800;
          font-size: 13.5px;
          padding: 10px 20px;
          border-radius: 999px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25);
          transition: all 0.2s ease;
        }

        .ft-partner-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(217, 119, 6, 0.35);
          color: #0A192F;
        }

        .ft-nav-heading {
          font-size: 11.5px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #FBBF24;
          display: block;
          margin-bottom: 16px;
        }

        .ft-nav-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .ft-nav-list a {
          font-size: 13.5px;
          color: #CBD5E1;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .ft-nav-list a:hover {
          color: #FFFFFF;
        }

        .ft-trust {
          border-top: 1px solid var(--ft-border);
          border-bottom: 1px solid var(--ft-border);
        }

        .ft-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          color: #CBD5E1;
        }
        .ft-badge-icon {
          color: #FBBF24;
          display: flex;
        }

        .ft-newsletter-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ft-newsletter-label {
          font-size: 12.5px;
          color: #CBD5E1;
        }
        .ft-newsletter-input {
          background: rgba(255,255,255,0.06);
          border: 1px solid var(--ft-border);
          border-radius: 8px 0 0 8px;
          padding: 9px 14px;
          font-size: 13px;
          color: #fff;
          outline: none;
        }
        .ft-newsletter-input:focus {
          border-color: #FBBF24;
        }
        .ft-newsletter-btn {
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
          border: none;
          color: #FFFFFF;
          font-weight: 700;
          font-size: 13px;
          padding: 9px 18px;
          border-radius: 0 8px 8px 0;
          cursor: pointer;
        }

        .ft-bottom {
          padding: 24px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 12.5px;
          color: var(--ft-muted);
        }
        .ft-bottom-links {
          display: flex;
          gap: 18px;
          flex-wrap: wrap;
        }
        .ft-bottom-links a {
          color: var(--ft-muted);
          text-decoration: none;
          transition: color 0.2s;
        }
        .ft-bottom-links a:hover {
          color: #FFFFFF;
        }
      `}</style>

      <div className="ft-wave">
        <svg viewBox="0 0 1440 56" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,8 C240,56 480,0 720,24 C960,48 1200,12 1440,28 L1440,56 L0,56 Z" fill="#0A192F" />
        </svg>
      </div>

      <footer className="ft-footer" aria-label="Site footer">
        <div className="ft-z container-xl">
          {/* ── Partner Banner Callout ── */}
          <div className="pt-5">
            <div className="ft-partner-cta-box">
              <div>
                <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#FBBF24" }}>
                  Partner Network
                </span>
                <h4 style={{ margin: "4px 0 2px 0", color: "#FFFFFF", fontSize: "17px", fontWeight: 800 }}>
                  Earn up to {term1Rate}% First-Term Commission + {retentionRate}% Recurring Retention
                </h4>
                <p style={{ margin: 0, fontSize: "13px", color: "#CBD5E1" }}>
                  Register schools in your region as an authorized SchoolProfit Sales Partner.
                </p>
              </div>
              <a href="/sales-representative/register" className="ft-partner-cta-btn">
                Apply as a Sales Partner →
              </a>
            </div>
          </div>

          {/* ── Top: brand + nav ── */}
          <div className="py-4">
            <div className="row g-5">
              {/* Brand column */}
              <div className="col-12 col-lg-3">
                <div className="d-flex flex-column h-100">
                  <a href="/" className="ft-logo mb-4" aria-label="SchoolProfit home">
                    <div className="ft-logo-wrap" style={{ background: "transparent", border: "none" }}>
                      <img src="/media/logo/schoolprofit-logo.svg" alt="SchoolProfit logo" className="ft-logo-img" style={{ width: "auto", height: "36px" }} />
                    </div>
                    <span className="ft-logo-text">School<span style={{ color: "#10B981" }}>Profit</span></span>
                  </a>

                  <p className="ft-tagline mb-4">
                    The School Growth &amp; Profit Operating System — stop fee defaults, scale student admissions, and deliver error-free academic results.
                  </p>

                  <div className="d-flex gap-2 mt-auto">
                    {socials.map((s) => (
                      <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="ft-social-btn" aria-label={s.label}>
                        {s.icon}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nav columns */}
              <div className="col-12 col-lg-9">
                <nav aria-label="Footer navigation">
                  <div className="row g-4">
                    {Object.entries(navLinks).map(([heading, links]) => (
                      <div key={heading} className="col-6 col-md-3">
                        <span className="ft-nav-heading">{heading}</span>
                        <ul className="ft-nav-list">
                          {links.map((link) => (
                            <li key={link.label}>
                              <a href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}>
                                {link.label}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </nav>
              </div>
            </div>
          </div>

          {/* ── Trust band ── */}
          <div className="ft-trust py-4 d-flex align-items-center justify-content-between flex-wrap gap-4">
            <div className="d-flex flex-wrap gap-4">
              {trustBadges.map((b) => (
                <span key={b.label} className="ft-badge">
                  <span className="ft-badge-icon">{b.icon}</span>
                  {b.label}
                </span>
              ))}
            </div>

            <div id="footer-subscribe" className="ft-newsletter-wrap">
              <span className="ft-newsletter-label">Platform updates:</span>
              {newsletterSuccess ? (
                <div className="d-flex align-items-center gap-2 px-3 py-1.5 rounded" style={{ background: "rgba(34, 197, 94, 0.2)", border: "1px solid rgba(34, 197, 94, 0.4)", color: "#4ADE80", fontSize: "13px", fontWeight: 700 }}>
                  <i className="bi bi-check-circle-fill" /> {newsletterMessage || "Subscribed! Thank you."}
                </div>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="d-flex flex-column gap-1">
                  <div className="d-flex">
                    <input
                      type="email"
                      required
                      value={newsletterEmail}
                      onChange={(e) => {
                        setNewsletterEmail(e.target.value);
                        setNewsletterError("");
                      }}
                      className="ft-newsletter-input"
                      placeholder="Your email address"
                      aria-label="Subscribe to updates"
                      disabled={newsletterSubmitting}
                    />
                    <button
                      type="submit"
                      disabled={newsletterSubmitting}
                      className="ft-newsletter-btn"
                    >
                      {newsletterSubmitting ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      ) : (
                        "Subscribe"
                      )}
                    </button>
                  </div>
                  {newsletterError && (
                    <span style={{ fontSize: "11.5px", color: "#F87171", marginTop: "2px" }}>
                      {newsletterError}
                    </span>
                  )}
                </form>
              )}
            </div>
          </div>

          {/* ── Bottom bar ── */}
          <div className="ft-bottom">
            <div>© {year} SchoolProfit (schoolprofit.ng). All rights reserved.</div>
            <div className="ft-bottom-links">
              <a href="/sales-representative/register" style={{ color: "#FBBF24", fontWeight: 700 }}>
                ★ Partner Program (Earn {term1Rate}%)
              </a>
              <a href="/privacy-policy">Privacy Policy</a>
              <a href="/terms-and-conditions">Terms of Service</a>
              <a href="/book-demo">Book Demo</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
