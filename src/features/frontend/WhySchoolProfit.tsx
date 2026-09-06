import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

const REASONS = [
  {
    number: "01",
    title: "Zero-Debt Bursary & Instant Multi-Bank Settlement",
    tagline: "Stop Fee Defaults & Eliminate Cash Leakage",
    description:
      "Collect fees via Monnify, Wema, and Paystack with instant bank credit. Gate report cards and CBT exams automatically so students cannot view results until fees are settled.",
    metrics: "95% On-Time Fee Recovery",
    badge: "Revenue & Profit",
    image: "/images/features/feature-bursary-pos.jpg",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <circle cx="12" cy="15" r="2" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Student Admissions & Enrollment Growth",
    tagline: "Fill Your Classrooms with Scalable Marketing",
    description:
      "Capture prospective parent leads directly through public sales pages. Power your admission campaigns with automated 30% sales representative partner tracking.",
    metrics: "3x Faster Student Growth",
    badge: "Admissions Engine",
    image: "/images/features/feature-parent-portal.jpg",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <polyline points="17 11 19 13 23 9" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Instant Master Broadsheets & Report Cards",
    tagline: "From Weeks of Stress to 30 Seconds",
    description:
      "Automate continuous assessment calculations, cumulative GPAs, and class rankings without spreadsheet errors. Generate publication-ready master broadsheets and transcripts in single clicks.",
    metrics: "95% Faster Termly Computation",
    badge: "Academic Operations",
    image: "/images/features/feature-broadsheet-mastery.jpg",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
        <polyline points="13 2 13 9 20 9" />
        <path d="M9 13h6M9 17h4" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Hybrid CBT Examination Engine",
    tagline: "Uninterrupted Computer Lab Assessments",
    description:
      "Conduct timed continuous assessment tests and mock exams with dual online and offline LAN resilience. Student progress is auto-saved continuously, ensuring zero data loss during power or network shifts.",
    metrics: "100% Exam Lab Uptime",
    badge: "Testing Hub",
    image: "/images/features/feature-cbt-lab.jpg",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    number: "05",
    title: "AI Teacher Assistant & Lesson Planning",
    tagline: "Curricular Precision in Seconds",
    description:
      "Empower your teaching faculty with intelligent assistants for outlining standardized curriculum schemes of work, generating structured lesson notes, and composing thoughtful student evaluations.",
    metrics: "10+ Hours Saved Per Teacher/Week",
    badge: "Faculty Superpowers",
    image: "/images/features/feature-ai-lesson-notes.jpg",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    number: "06",
    title: "Direct WhatsApp Dispatches & QR Seals",
    tagline: "Instant Alerts & Tamper-Evident Security",
    description:
      "Deliver digital report cards and payment receipts straight to parents' phones on WhatsApp. Every transcript carries an encrypted QR authentication seal for instant verification.",
    metrics: "100% Tamper-Evident Security",
    badge: "Parent & Trust",
    image: "/images/features/feature-qr-transcript.jpg",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
];

const COMPARISON_ROWS = [
  {
    feature: "Fee Collection & Debt Recovery",
    generic: "Manual bank teller tracking & high parent fee debts",
    schoolprofit: "Multi-bank instant settlement + result & CBT gatekeepers",
  },
  {
    feature: "Broadsheet & Report Compilation",
    generic: "Manual calculations prone to arithmetic errors (2-3 weeks)",
    schoolprofit: "Automated cumulative GPA & rankings compiled in seconds",
  },
  {
    feature: "Student Admission & Enrollment",
    generic: "Paper flyers with zero lead tracking",
    schoolprofit: "Public landing pages + automated sales partner tracking",
  },
  {
    feature: "CBT Examination Infrastructure",
    generic: "Requires constant high-speed internet; crashes on power cuts",
    schoolprofit: "Dual hybrid architecture: Offline LAN + Cloud sync",
  },
  {
    feature: "Teacher Lesson Planning",
    generic: "Hours of manual handwritten scheme formatting",
    schoolprofit: "AI-assisted standardized curriculum & lesson notes",
  },
  {
    feature: "Parent Communication & Trust",
    generic: "Delayed termly physical newsletters & paper cards",
    schoolprofit: "Direct WhatsApp alerts + QR verifiable digital transcripts",
  },
];

export default function WhySchoolProfit() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("gq-revealed");
          }
        });
      },
      { threshold: 0.1 }
    );

    const cards = document.querySelectorAll(".gq-why-card, .gq-compare-box");
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,800;1,600&display=swap');

        .gq-why-section {
          background-color: #FFFFFF;
          padding: 100px 0 110px;
          position: relative;
          font-family: 'Plus Jakarta Sans', sans-serif;
          overflow: hidden;
        }

        .gq-why-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #B45309;
          background: #FEF3C7;
          border: 1px solid #FDE68A;
          border-radius: 999px;
          padding: 5px 16px;
          margin-bottom: 16px;
        }

        .gq-why-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(30px, 3.8vw, 48px);
          font-weight: 800;
          color: #0F2744;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
          line-height: 1.2;
        }

        .gq-why-title em {
          font-style: italic;
          color: #D97706;
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .gq-why-subtitle {
          font-size: 16px;
          color: #64748B;
          max-width: 680px;
          margin: 0 auto 60px;
          line-height: 1.7;
        }

        .gq-why-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 20px;
          padding: 0;
          height: 100%;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 20px -4px rgba(15, 39, 68, 0.06);
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          opacity: 0;
          transform: translateY(24px);
          overflow: hidden;
        }

        .gq-why-card.gq-revealed {
          opacity: 1;
          transform: translateY(0);
        }

        .gq-why-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px -10px rgba(15, 39, 68, 0.14);
          border-color: #CBD5E1;
        }

        .gq-why-img-container {
          position: relative;
          height: 180px;
          width: 100%;
          overflow: hidden;
          background: #0F2744;
        }

        .gq-why-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }

        .gq-why-card:hover .gq-why-img {
          transform: scale(1.06);
        }

        .gq-why-img-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 40%, rgba(15, 39, 68, 0.7) 100%);
        }

        .gq-why-card-content {
          padding: 24px 26px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }

        .gq-why-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .gq-why-icon-wrap {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #EFF6FF;
          border: 1px solid #DBEAFE;
          color: #1D4ED8;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .gq-why-badge-pill {
          font-size: 11px;
          font-weight: 800;
          color: #B45309;
          background: #FEF3C7;
          border: 1px solid #FDE68A;
          padding: 4px 10px;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .gq-why-card-title {
          font-size: 18px;
          font-weight: 800;
          color: #0F2744;
          margin-bottom: 6px;
          line-height: 1.35;
        }

        .gq-why-card-tagline {
          font-size: 11.5px;
          font-weight: 800;
          color: #D97706;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .gq-why-card-desc {
          font-size: 13.5px;
          color: #475569;
          line-height: 1.65;
          margin-bottom: 20px;
          flex-grow: 1;
        }

        .gq-why-metric-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          font-size: 12px;
          font-weight: 700;
          color: #1E293B;
        }

        .gq-why-metric-pill span {
          color: #059669;
        }

        /* ── Comparison Matrix Box ── */
        .gq-compare-box {
          margin-top: 72px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 24px;
          padding: 44px 36px;
          box-shadow: 0 16px 40px rgba(15, 39, 68, 0.05);
          opacity: 0;
          transform: translateY(24px);
          transition: all 0.5s ease;
        }

        .gq-compare-box.gq-revealed {
          opacity: 1;
          transform: translateY(0);
        }

        .gq-compare-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 24px;
          background: #FFFFFF;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid #E2E8F0;
          box-shadow: 0 4px 16px rgba(15, 39, 68, 0.03);
        }

        .gq-compare-table th {
          padding: 16px 18px;
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border-bottom: 1px solid #E2E8F0;
        }

        .gq-compare-table td {
          padding: 16px 18px;
          font-size: 13.5px;
          border-bottom: 1px solid #F1F5F9;
          vertical-align: middle;
        }

        .gq-compare-table tr:hover td {
          background: #F8FAFC;
        }
      `}</style>

      <section id="why-schoolprofit" ref={sectionRef} className="gq-why-section gq-scroll-reveal">
        <div className="container-xl">
          <div className="text-center">
            <div className="gq-why-kicker" style={{ background: "#DCFCE7", color: "#065F46", borderColor: "#86EFAC" }}>
              <span>🚀</span> School Growth &amp; Profit Engine
            </div>
            <h2 className="gq-why-title">
              Engineered for <em>Profitable &amp; High-Standard Private Schools</em>
            </h2>
            <p className="gq-why-subtitle">
              SchoolProfit delivers the complete financial and academic operating system that eliminates fee defaults, expands student enrollment, and automates teacher workflows.
            </p>
          </div>

          <div className="row g-4">
            {REASONS.map((reason) => (
              <div key={reason.number} className="col-12 col-md-6 col-lg-4">
                <div className="gq-why-card">
                  {/* Photo Header */}
                  <div className="gq-why-img-container">
                    <img src={reason.image} alt={reason.title} className="gq-why-img" loading="lazy" />
                    <div className="gq-why-img-overlay" />
                    <div className="position-absolute bottom-0 start-0 p-3 text-white">
                      <span className="badge bg-warning text-dark fw-bold px-2 py-1" style={{ fontSize: "10.5px" }}>
                        Pillar {reason.number}
                      </span>
                    </div>
                  </div>

                  <div className="gq-why-card-content">
                    <div className="gq-why-card-top">
                      <div className="gq-why-icon-wrap">{reason.icon}</div>
                      <span className="gq-why-badge-pill">{reason.badge}</span>
                    </div>

                    <h3 className="gq-why-card-title">{reason.title}</h3>
                    <div className="gq-why-card-tagline">{reason.tagline}</div>
                    <p className="gq-why-card-desc">{reason.description}</p>

                    <div>
                      <span className="gq-why-metric-pill">
                        <span>●</span> {reason.metrics}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Comparison Matrix: SchoolProfit vs Legacy Systems ── */}
          <div className="gq-compare-box">
            <div className="text-center">
              <span className="gq-why-kicker" style={{ background: "#F0FDF4", color: "#047857", borderColor: "#BBF7D0" }}>
                Operational Advantage
              </span>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, color: "#0F2744", marginTop: 8, marginBottom: 8 }}>
                SchoolProfit Platform vs. Traditional Portals
              </h3>
              <p style={{ fontSize: 14.5, color: "#64748B", maxWidth: 600, margin: "0 auto 20px" }}>
                Experience the profit acceleration, automated fee recovery, and academic speed of an all-in-one operating platform.
              </p>
            </div>

            <div className="table-responsive">
              <table className="gq-compare-table">
                <thead>
                  <tr>
                    <th style={{ color: "#475569", width: "28%", background: "#F8FAFC" }}>Operational Dimension</th>
                    <th style={{ color: "#DC2626", width: "36%", background: "#FEF2F2" }}>Traditional Manual / Legacy Portals</th>
                    <th style={{ color: "#047857", width: "36%", background: "#ECFDF5" }}>SchoolProfit Operating System</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700, color: "#0F2744" }}>{row.feature}</td>
                      <td style={{ color: "#64748B" }}>{row.generic}</td>
                      <td style={{ color: "#047857", fontWeight: 700, background: "rgba(220, 252, 231, 0.4)" }}>{row.schoolprofit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-center mt-4 pt-2">
              <Link to="/register" className="gq-btn-cta-main" style={{ display: "inline-flex", background: "linear-gradient(135deg, #059669 0%, #047857 100%)" }}>
                Start Growing Your School with SchoolProfit
                <svg width="15" height="15" viewBox="0 0 14 14" fill="none" style={{ marginLeft: 8 }}>
                  <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
