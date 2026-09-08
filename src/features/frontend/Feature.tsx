import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

const FEATURES = [
  {
    id: "results",
    badge: "Academic Leadership",
    badgeColor: "#059669",
    badgeBg: "rgba(5, 150, 105, 0.1)",
    icon: "📊",
    title: "Instant Master Broadsheets & Report Cards",
    subtitle: "Automated Standard & Cumulative Grading",
    text: "Upload Continuous Assessment (CA) and exam scores in bulk. SchoolProfit automatically calculates totals, grades, positions, subject rankings, and generates print-ready master broadsheets in seconds.",
    highlights: [
      "Auto-calculates standardized grades, cumulative GPAs, and class positions",
      "One-click broadsheet download in publication-ready Excel and PDF",
      "Pre-filled teacher remarks & psychomotor domain evaluations",
    ],
    span: "col-lg-7",
  },
  {
    id: "fees",
    badge: "Bursary Governance",
    badgeColor: "#D97706",
    badgeBg: "rgba(217, 119, 6, 0.1)",
    icon: "💳",
    title: "Comprehensive Student Fees Ledger",
    subtitle: "Real-Time Tracking & Digital Receipts",
    text: "Maintain complete financial clarity over tuition and termly levies. Track student payment statuses, record direct bank settlements, and issue automated electronic receipts with zero reconciliation gaps.",
    highlights: [
      "Term-by-term financial collection and balance breakdown",
      "Instant electronic receipts delivered automatically to parents",
      "Automated financial reports for school administration",
    ],
    span: "col-lg-5",
  },
  {
    id: "cbt",
    badge: "Assessment Engine",
    badgeColor: "#1D4ED8",
    badgeBg: "rgba(29, 78, 216, 0.1)",
    icon: "💻",
    title: "Online & Offline LAN CBT Exam Center",
    subtitle: "Dual Infrastructure for School Computer Labs",
    text: "Administer timed continuous assessment tests and mock examinations in school computer laboratories. Our local synchronization engine ensures exams proceed smoothly even during network disruptions.",
    highlights: [
      "Offline local network (LAN) sync engine with local state recovery",
      "Instant student auto-grading & direct score export into broadsheets",
      "Supports complex mathematical equations, diagrams, and timed test sessions",
    ],
    span: "col-lg-6",
  },
  {
    id: "verification",
    badge: "Credential Protection",
    badgeColor: "#7C3AED",
    badgeBg: "rgba(124, 58, 237, 0.1)",
    icon: "🛡️",
    title: "Cryptographic QR Academic Verification",
    subtitle: "Tamper-Proof Result & Transcript Security",
    text: "Every generated report card and academic transcript carries a cryptographic QR verification seal that tertiary institutions, embassies, and parents can verify with any mobile camera.",
    highlights: [
      "Instant real-time verification portal on your institution's profile",
      "Protects institutional credibility against forged credentials",
      "Encrypted digital certificate issuance and archival",
    ],
    span: "col-lg-6",
  },
  {
    id: "whatsapp",
    badge: "Mobile Connectivity",
    badgeColor: "#059669",
    badgeBg: "rgba(5, 150, 105, 0.1)",
    icon: "💬",
    title: "Direct WhatsApp & SMS Parent Dispatches",
    subtitle: "Delivered Directly to Parents' Phones",
    text: "Deliver digital report cards, daily student attendance clock-ins, fee invoices, and urgent administrative announcements directly to parents' WhatsApp with one single click.",
    highlights: [
      "1-click broadcast result link dispatch with secure access PINs",
      "Automated daily student clock-in and attendance notifications",
      "Broadcast PTA meeting and term resumption notices",
    ],
    span: "col-lg-6",
  },
  {
    id: "ai",
    badge: "Faculty Assistant",
    badgeColor: "#DB2777",
    badgeBg: "rgba(219, 39, 119, 0.1)",
    icon: "🤖",
    title: "AI Lesson Planner & Academic Assistant",
    subtitle: "Intelligent Curricular Support for Teachers",
    text: "Empower your teaching staff with intelligent tools to structure curriculum-aligned schemes of work, generate weekly lesson notes, and compose personalized student evaluations without fatigue.",
    highlights: [
      "Curriculum-compliant schemes of work and lesson notes generation",
      "Intelligent score outlier alerts and academic trend diagnostics",
      "Automated personalized remarks based on student performance",
    ],
    span: "col-lg-6",
  },
];

export default function Feature() {
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

    const items = sectionRef.current?.querySelectorAll(".gq-feature-card");
    items?.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,800;1,600&display=swap');

        .gq-features-section {
          background-color: #F8FAFC;
          position: relative;
          padding: 104px 0;
          color: #0F172A;
          font-family: 'Plus Jakarta Sans', sans-serif;
          overflow: hidden;
          border-top: 1px solid #E2E8F0;
        }

        .gq-feat-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 999px;
          background: #FFFFFF;
          border: 1px solid rgba(217, 119, 6, 0.3);
          color: #B45309;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 18px;
          box-shadow: 0 2px 8px rgba(15, 39, 68, 0.04);
        }

        .gq-feat-heading {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(30px, 3.8vw, 48px);
          font-weight: 800;
          color: #0F2744;
          line-height: 1.18;
          margin-bottom: 18px;
          letter-spacing: -0.01em;
        }

        .gq-feat-heading em {
          font-style: italic;
          color: #D97706;
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .gq-feat-subtitle {
          font-size: 16px;
          color: #475569;
          max-width: 620px;
          margin: 0 auto 56px auto;
          line-height: 1.7;
        }

        /* ── Bento Grid Feature Card ── */
        .gq-feature-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 20px;
          padding: 36px 32px;
          height: 100%;
          display: flex;
          flex-direction: column;
          position: relative;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 20px rgba(15, 39, 68, 0.04);
          opacity: 0;
          transform: translateY(24px);
        }

        .gq-feature-card.gq-revealed {
          opacity: 1;
          transform: translateY(0);
        }

        .gq-feature-card:hover {
          border-color: rgba(217, 119, 6, 0.45);
          transform: translateY(-6px);
          box-shadow: 0 16px 40px rgba(15, 39, 68, 0.09);
        }

        .gq-feat-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 22px;
        }

        .gq-feat-icon-wrap {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
        }

        .gq-feat-pill {
          font-size: 11.5px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 999px;
          letter-spacing: 0.03em;
        }

        .gq-feat-title {
          font-size: 20px;
          font-weight: 700;
          color: #0F2744;
          margin-bottom: 6px;
          line-height: 1.3;
        }

        .gq-feat-sub {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #D97706;
          margin-bottom: 14px;
        }

        .gq-feat-desc {
          font-size: 14.5px;
          color: #475569;
          line-height: 1.68;
          margin-bottom: 24px;
          flex-grow: 1;
        }

        .gq-feat-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-top: 1px solid #F1F5F9;
          padding-top: 20px;
        }

        .gq-feat-list-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
          color: #334155;
          font-weight: 500;
        }

        .gq-feat-check {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ECFDF5;
          color: #059669;
          border: 1px solid #A7F3D0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          flex-shrink: 0;
        }

        /* ── Bottom Banner CTA ── */
        .gq-feat-banner {
          margin-top: 72px;
          background: linear-gradient(135deg, #0F2744 0%, #1E3A8A 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 48px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 28px;
          box-shadow: 0 20px 50px rgba(15, 39, 68, 0.15);
        }

        .gq-banner-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(22px, 2.5vw, 32px);
          font-weight: 800;
          color: #FFFFFF;
          margin-bottom: 8px;
        }

        .gq-banner-desc {
          font-size: 14.5px;
          color: #E2E8F0;
          max-width: 580px;
          margin: 0;
          line-height: 1.6;
        }

        .gq-btn-cta-main {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px 28px;
          font-size: 15px;
          font-weight: 700;
          color: #0F2744;
          background: #FFFFFF;
          border-radius: 10px;
          text-decoration: none;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
          transition: all 0.25s ease;
        }

        .gq-btn-cta-main:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(255, 255, 255, 0.25);
          color: #1D4ED8;
          background: #FFFFFF;
        }

        .gq-btn-cta-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px 24px;
          font-size: 15px;
          font-weight: 600;
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.25s ease;
        }

        .gq-btn-cta-secondary:hover {
          background: rgba(255, 255, 255, 0.18);
          border-color: rgba(255, 255, 255, 0.4);
          color: #FFFFFF;
          transform: translateY(-2px);
        }
      `}</style>

      <section id="features" ref={sectionRef} className="gq-features-section gq-scroll-reveal">
        <div className="container-xl">
          {/* Section Header */}
          <div className="text-center">
            <div className="gq-feat-kicker">
              <span>⚡</span> Purpose-Built Architecture
            </div>
            <h2 className="gq-feat-heading">
              Everything Your School Needs to Run <em>Flawlessly</em>
            </h2>
            <p className="gq-feat-subtitle">
              We studied the biggest operational hurdles in primary and secondary schools — from delayed score submissions to fee collection deficits — and engineered a unified operating system to solve them permanently.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="row g-4">
            {FEATURES.map((feat) => (
              <div key={feat.id} className={feat.span}>
                <div className="gq-feature-card">
                  <div className="gq-feat-top">
                    <div className="gq-feat-icon-wrap">{feat.icon}</div>
                    <span
                      className="gq-feat-pill"
                      style={{
                        color: feat.badgeColor,
                        backgroundColor: feat.badgeBg,
                        border: `1px solid ${feat.badgeColor}40`,
                      }}
                    >
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="gq-feat-title">{feat.title}</h3>
                  <div className="gq-feat-sub">{feat.subtitle}</div>
                  <p className="gq-feat-desc">{feat.text}</p>

                  <ul className="gq-feat-list">
                    {feat.highlights.map((h, i) => (
                      <li key={i} className="gq-feat-list-item">
                        <span className="gq-feat-check">✓</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Conversion Banner */}
          <div className="gq-feat-banner">
            <div>
              <h3 className="gq-banner-title">Ready to modernize your school operations?</h3>
              <p className="gq-banner-desc">
                Join leading private schools that rely on SchoolProfit every term to stop fee defaults, scale admissions, and deliver error-free broadsheets.
              </p>
            </div>
            <div className="d-flex flex-wrap gap-3">
              <Link to="/book-demo" className="gq-btn-cta-main" style={{ padding: "13px 26px" }}>
                Book a Live Demo / Request Setup
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <a
                href="https://wa.me/2348165748374?text=Hello%20SchoolProfit%2C%20I%20want%20to%20request%20a%20demo%20for%20my%20school"
                target="_blank"
                rel="noreferrer"
                className="gq-btn-cta-secondary"
                style={{ padding: "13px 22px" }}
              >
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
