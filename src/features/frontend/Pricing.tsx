import React, { useState } from "react";
import { Link } from "react-router-dom";
import { usePlatformInfo } from "../../hooks/usePlatformInfo";

export default function Pricing() {
  const { platform, whatsappLink, formattedPlatformFee } = usePlatformInfo();
  const feeText = formattedPlatformFee || "₦500";

  return (
    <>
      <style>{`
        :root {
          --pr-ink: #0F2744;
          --pr-dark: #0A192F;
          --pr-gold: #D97706;
          --pr-gold-light: #F59E0B;
          --pr-cream: #FFFFFF;
          --pr-muted: #64748B;
          --pr-line: #E2E8F0;
          --pr-green: #059669;
          --pr-bg: #F8FAFC;
        }

        .pr-wave {
          display: block;
          background: #FFFFFF;
          line-height: 0;
          overflow: hidden;
        }
        .pr-wave svg {
          display: block;
          width: 100%;
          height: 54px;
        }

        .pr-section {
          position: relative;
          overflow: hidden;
          background: #F8FAFC;
          padding: 96px 0 112px;
          color: var(--pr-ink);
          border-top: 1px solid #E2E8F0;
        }
        .pr-section:before {
          content: "";
          position: absolute;
          width: 620px;
          height: 620px;
          border-radius: 50%;
          right: -230px;
          top: -280px;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.08), transparent 68%);
          pointer-events: none;
        }
        .pr-section:after {
          content: "";
          position: absolute;
          width: 540px;
          height: 540px;
          border-radius: 50%;
          left: -260px;
          bottom: -300px;
          background: radial-gradient(circle, rgba(29, 78, 216, 0.06), transparent 68%);
          pointer-events: none;
        }

        .pr-shell {
          position: relative;
          z-index: 1;
          max-width: 1200px;
        }

        .pr-kicker {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          color: #B45309;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .16em;
          text-transform: uppercase;
          background: #FEF3C7;
          padding: 7px 18px;
          border-radius: 999px;
          border: 1px solid #FDE68A;
          box-shadow: 0 2px 8px rgba(217, 119, 6, 0.08);
        }

        .pr-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(34px, 4.8vw, 54px);
          font-weight: 900;
          line-height: 1.15;
          letter-spacing: -.02em;
          max-width: 900px;
          margin: 18px auto 0;
          color: #0F2744;
        }
        .pr-title em {
          font-style: italic;
          color: #D97706;
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .pr-subtitle {
          max-width: 760px;
          margin: 20px auto 0;
          color: var(--pr-muted);
          font-size: 16.5px;
          line-height: 1.7;
        }

        .pr-badges-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-top: 26px;
        }
        .pr-badge-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          color: #334155;
          box-shadow: 0 2px 6px rgba(15, 39, 68, 0.04);
        }
        .pr-badge-item i {
          color: #059669;
          font-size: 15px;
        }

        /* ── 3-Card Grid ── */
        .pr-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          align-items: stretch;
          margin-top: 48px;
        }

        .pr-card-main {
          position: relative;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 24px;
          padding: 34px 28px;
          box-shadow: 0 10px 30px rgba(15, 39, 68, 0.05);
          display: flex;
          flex-direction: column;
          transition: all 0.25s ease;
        }
        .pr-card-main:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(15, 39, 68, 0.09);
        }

        .pr-card-featured {
          border: 2.5px solid #D97706;
          box-shadow: 0 18px 48px rgba(217, 119, 6, 0.16);
          background: linear-gradient(180deg, #FFFFFF 0%, #FFFDF9 100%);
        }

        .pr-pop-tag {
          position: absolute;
          top: -14px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
          color: #FFFFFF;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .14em;
          text-transform: uppercase;
          padding: 5px 18px;
          border-radius: 999px;
          box-shadow: 0 4px 12px rgba(217, 119, 6, 0.4);
          white-space: nowrap;
        }

        .pr-card-head {
          margin-bottom: 20px;
        }
        .pr-plan-label {
          font-size: 11.5px;
          font-weight: 900;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: #B45309;
          margin-bottom: 8px;
        }
        .pr-plan-name {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 26px;
          font-weight: 900;
          color: #0F2744;
          margin: 0;
        }
        .pr-plan-desc {
          font-size: 13.5px;
          color: #64748B;
          margin-top: 8px;
          line-height: 1.55;
          min-height: 42px;
        }

        .pr-price-box {
          padding: 16px;
          background: #F8FAFC;
          border-radius: 14px;
          border: 1px solid #E2E8F0;
          margin-bottom: 24px;
        }
        .pr-card-featured .pr-price-box {
          background: #FFFBEB;
          border-color: #FDE68A;
        }
        .pr-price-val {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 36px;
          font-weight: 900;
          color: #0F2744;
          line-height: 1;
        }
        .pr-card-featured .pr-price-val {
          color: #B45309;
        }
        .pr-price-sub {
          font-size: 12px;
          font-weight: 700;
          color: #64748B;
          margin-top: 4px;
        }

        .pr-feature-list {
          list-style: none;
          padding: 0;
          margin: 0 0 28px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
        }
        .pr-feature-list li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13.5px;
          color: #334155;
          line-height: 1.45;
          font-weight: 600;
        }
        .pr-icon-check {
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
          border-radius: 50%;
          background: #ECFDF5;
          color: #059669;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          margin-top: 2px;
          border: 1px solid #A7F3D0;
        }

        .pr-btn-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 13px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 800;
          text-decoration: none;
          transition: all 0.2s ease;
          background: #0F2744;
          color: #FFFFFF;
          border: none;
        }
        .pr-btn-primary:hover {
          background: #1E3A8A;
          color: #FFFFFF;
          transform: translateY(-2px);
        }

        .pr-btn-gold {
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
          color: #FFFFFF;
          box-shadow: 0 6px 18px rgba(217, 119, 6, 0.35);
        }
        .pr-btn-gold:hover {
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
          color: #FFFFFF;
          box-shadow: 0 8px 24px rgba(217, 119, 6, 0.45);
        }

        .pr-btn-outline {
          background: #FFFFFF;
          color: #0F2744;
          border: 1.5px solid #CBD5E1;
        }
        .pr-btn-outline:hover {
          background: #F1F5F9;
          border-color: #0F2744;
          color: #0F2744;
        }

        /* ── Add-On & Session Banner ── */
        .pr-session-banner {
          margin-top: 36px;
          background: linear-gradient(135deg, #0F2744 0%, #1E3A8A 100%);
          border-radius: 20px;
          padding: 28px 34px;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
          box-shadow: 0 10px 30px rgba(15, 39, 68, 0.12);
        }

        .pr-addon-box {
          margin-top: 24px;
          background: #FFFFFF;
          border: 1.5px dashed #D97706;
          border-radius: 20px;
          padding: 24px 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }

        /* ── Comparison Banner ── */
        .pr-compare-box {
          margin-top: 48px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 8px 28px rgba(15, 39, 68, 0.05);
        }
        .pr-compare-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .pr-compare-col {
          padding: 20px;
          border-radius: 14px;
        }
        .pr-compare-old {
          background: #FFF1F2;
          border: 1px solid #FFE4E6;
        }
        .pr-compare-gq {
          background: #F0FDF4;
          border: 1.5px solid #BBF7D0;
        }

        /* ── WhatsApp Banner ── */
        .pr-wa-strip {
          margin-top: 36px;
          background: #0F2744;
          border-radius: 18px;
          padding: 26px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
          color: #FFFFFF;
        }

        @media(max-width: 960px) {
          .pr-grid-3 { grid-template-columns: 1fr; max-width: 520px; margin: 40px auto 0; }
          .pr-compare-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="pr-wave" aria-hidden="true">
        <svg viewBox="0 0 1440 54" preserveAspectRatio="none">
          <path d="M0 15C260 55 470 0 720 28c250 28 455-15 720 0v26H0z" fill="#F8FAFC" />
        </svg>
      </div>

      <section className="pr-section gq-scroll-reveal" id="pricing">
        <div className="container-xl pr-shell">
          {/* Header */}
          <header className="text-center">
            <span className="pr-kicker">100% Free Core OS • Pay When Tuition is Cleared</span>
            <h2 className="pr-title">
              Complete School Management is <em>100% Free.</em><br />
              Transparent Pay-As-You-Go Fee Clearance.
            </h2>
            <p className="pr-subtitle">
              Say goodbye to expensive yearly software licenses and mid-term student lockouts. SchoolProfit provides full day-to-day administrative tools completely free, earning only a tiny platform fee when school tuition is cleared.
            </p>

            <div className="pr-badges-row">
              <span className="pr-badge-item">
                <i className="bi bi-shield-check" /> ₦0 Upfront Setup Fee
              </span>
              <span className="pr-badge-item">
                <i className="bi bi-infinity" /> Unlimited Students & Staff
              </span>
              <span className="pr-badge-item">
                <i className="bi bi-file-earmark-check" /> Free Result Checking for Parents
              </span>
              <span className="pr-badge-item">
                <i className="bi bi-arrow-repeat" /> No Annual Expirations
              </span>
            </div>
          </header>

          {/* 3-Card Value Architecture */}
          <div className="pr-grid-3">
            {/* Card 1: 100% Free Core OS */}
            <article className="pr-card-main">
              <div className="pr-card-head">
                <div className="pr-plan-label">Core School Operating System</div>
                <h3 className="pr-plan-name">SchoolProfit Free Core</h3>
                <p className="pr-plan-desc">
                  Everything your school needs for everyday management with zero subscription charges forever.
                </p>
              </div>

              <div className="pr-price-box">
                <div className="pr-price-val">₦0</div>
                <div className="pr-price-sub">Free Forever • No Monthly Fees</div>
              </div>

              <ul className="pr-feature-list">
                <li>
                  <span className="pr-icon-check"><i className="bi bi-check" /></span>
                  <span>Unlimited Student, Teacher & Parent Profiles</span>
                </li>
                <li>
                  <span className="pr-icon-check"><i className="bi bi-check" /></span>
                  <span>Continuous Assessment & Broadsheet Compilation</span>
                </li>
                <li>
                  <span className="pr-icon-check"><i className="bi bi-check" /></span>
                  <span>Digital School Fee Ledger & Bank Account Integration</span>
                </li>
                <li>
                  <span className="pr-icon-check"><i className="bi bi-check" /></span>
                  <span>Attendance Tracking & Staff QR Clock-in</span>
                </li>
                <li>
                  <span className="pr-icon-check"><i className="bi bi-check" /></span>
                  <span>Offline Local CBT Examination Engine</span>
                </li>
                <li>
                  <span className="pr-icon-check"><i className="bi bi-check" /></span>
                  <span>Dedicated Bursar, Teacher & Parent Portals</span>
                </li>
              </ul>

              <Link to="/book-demo" className="pr-btn-primary pr-btn-outline">
                Book a Free Demo <i className="bi bi-arrow-right" />
              </Link>
            </article>

            {/* Card 2: Basic Result Management Tier */}
            <article className="pr-card-main">
              <div className="pr-card-head">
                <div className="pr-plan-label">Result Management Edition</div>
                <h3 className="pr-plan-name">Basic Result Tier</h3>
                <p className="pr-plan-desc">
                  Pay only when students settle tuition. Unlocks digital report cards, CA broadsheets, and parent access.
                </p>
              </div>

              <div className="pr-price-box">
                <div className="pr-price-val">₦300</div>
                <div className="pr-price-sub">per active student / term</div>
              </div>

              <ul className="pr-feature-list">
                <li>
                  <span className="pr-icon-check"><i className="bi bi-check" /></span>
                  <span><strong>Everything in Free Core OS</strong></span>
                </li>
                <li>
                  <span className="pr-icon-check"><i className="bi bi-check" /></span>
                  <span><strong>Official Digital Report Cards:</strong> Publish termly report sheets</span>
                </li>
                <li>
                  <span className="pr-icon-check"><i className="bi bi-check" /></span>
                  <span><strong>₦0 Scratch Card Fees:</strong> Parents view & download results free</span>
                </li>
                <li>
                  <span className="pr-icon-check"><i className="bi bi-check" /></span>
                  <span><strong>Anti-Tamper QR Verification:</strong> Scannable validation on all results</span>
                </li>
                <li>
                  <span className="pr-icon-check"><i className="bi bi-check" /></span>
                  <span><strong>Student Promotion Engine:</strong> Automated carry-over & class advancement</span>
                </li>
                <li>
                  <span className="pr-icon-check"><i className="bi bi-check" /></span>
                  <span><strong>Flexible Clearance:</strong> Automated Paystack split or 1-click wallet clearance</span>
                </li>
              </ul>

              <Link to="/book-demo" className="pr-btn-primary pr-btn-outline">
                Explore Basic Tier <i className="bi bi-arrow-right" />
              </Link>
            </article>

            {/* Card 3: Standard CBT & Cloud Examination Tier (Featured) */}
            <article className="pr-card-main pr-card-featured">
              <div className="pr-pop-tag">MOST POPULAR • ALL-INCLUSIVE</div>

              <div className="pr-card-head">
                <div className="pr-plan-label">Cloud CBT & All-Inclusive Edition</div>
                <h3 className="pr-plan-name">Standard CBT Tier</h3>
                <p className="pr-plan-desc">
                  The complete power package. Combines full digital results with multi-school cloud CBT examination.
                </p>
              </div>

              <div className="pr-price-box">
                <div className="pr-price-val">₦500</div>
                <div className="pr-price-sub">per active student / term</div>
              </div>

              <ul className="pr-feature-list">
                <li>
                  <span className="pr-icon-check"><i className="bi bi-check" /></span>
                  <span><strong>Everything in Basic Result Tier (₦300)</strong></span>
                </li>
                <li>
                  <span className="pr-icon-check"><i className="bi bi-check" /></span>
                  <span><strong>Online Cloud CBT Portal:</strong> 3,000+ simultaneous student concurrency</span>
                </li>
                <li>
                  <span className="pr-icon-check"><i className="bi bi-check" /></span>
                  <span><strong>Instant Auto-Grading:</strong> Direct computation into term broadsheets</span>
                </li>
                <li>
                  <span className="pr-icon-check"><i className="bi bi-check" /></span>
                  <span><strong>Anti-Cheating Security:</strong> Fullscreen lockdown & tab-switch logging</span>
                </li>
                <li>
                  <span className="pr-icon-check"><i className="bi bi-check" /></span>
                  <span><strong>Comprehension & Math Engines:</strong> Passages, formulas & scientific calculator</span>
                </li>
                <li>
                  <span className="pr-icon-check"><i className="bi bi-check" /></span>
                  <span><strong>Offline-First Resilience:</strong> Never lose answers even during network flickers</span>
                </li>
              </ul>

              <Link to="/book-demo" className="pr-btn-primary pr-btn-gold">
                Book a Live Demo with SchoolProfit <i className="bi bi-lightning-charge-fill" />
              </Link>
            </article>
          </div>

          {/* Full Session Clearance Banner */}
          <div className="pr-session-banner">
            <div>
              <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: ".14em", color: "#FDE68A", fontWeight: 900 }}>
                FULL SESSION BUNDLE
              </div>
              <h3 style={{ fontSize: "22px", fontWeight: 900, margin: "6px 0", color: "#FFFFFF" }}>
                Pay 3 Terms Upfront for the Entire Academic Year
              </h3>
              <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.85)", maxWidth: "700px", lineHeight: 1.6 }}>
                Proprietors can clear their entire student body for all 3 terms upfront in a single click with zero termly renewal stress.
              </p>
            </div>
            <Link to="/book-demo" className="pr-btn-primary pr-btn-gold" style={{ width: "auto", padding: "12px 26px", whiteSpace: "nowrap" }}>
              Inquire Full Session <i className="bi bi-arrow-right" />
            </Link>
          </div>

          {/* On-Demand AI & WhatsApp Add-ons Strip */}
          <div className="pr-addon-box">
            <div>
              <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: ".14em", color: "#D97706", fontWeight: 900 }}>
                OPTIONAL ON-DEMAND ADD-ONS
              </div>
              <h4 style={{ fontSize: "18px", fontWeight: 900, margin: "4px 0", color: "#0F2744" }}>
                AI Curriculum Tools & WhatsApp Parent Dispatch
              </h4>
              <p style={{ margin: 0, fontSize: "13.5px", color: "#64748B", maxWidth: "720px", lineHeight: 1.55 }}>
                Top up your wallet only when you need credits: Instant WhatsApp fee receipts, attendance alerts, report cards, AI lesson note generation, and WAEC-standard CBT question creators.
              </p>
            </div>
            <Link to="/book-demo" className="pr-btn-primary pr-btn-outline" style={{ width: "auto", padding: "11px 22px", whiteSpace: "nowrap" }}>
              Explore Add-Ons <i className="bi bi-stars" />
            </Link>
          </div>

          {/* Comparison Table: Traditional Software vs SchoolProfit */}
          <div className="pr-compare-box">
            <h3 style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: "22px", fontWeight: 900, color: "#0F2744", textAlign: "center", marginBottom: "20px" }}>
              Why School Proprietors Choose SchoolProfit Over Traditional Portals
            </h3>

            <div className="pr-compare-grid">
              <div className="pr-compare-col pr-compare-old">
                <div style={{ fontWeight: 800, color: "#BE123C", fontSize: "15px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <i className="bi bi-x-circle-fill" /> Traditional School Software
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", color: "#881337" }}>
                  <li>❌ Expensive upfront setup fees (₦150,000 – ₦500,000/yr).</li>
                  <li>❌ Strict termly subscription renewals or software is locked.</li>
                  <li>❌ Charges parents ₦1,500 – ₦3,000 for result checker scratch cards.</li>
                  <li>❌ School pays for students who haven't paid fees or dropped out.</li>
                  <li>❌ Slow manual bank reconciliation.</li>
                </ul>
              </div>

              <div className="pr-compare-col pr-compare-gq">
                <div style={{ fontWeight: 800, color: "#15803D", fontSize: "15px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <i className="bi bi-check-circle-fill" /> SchoolProfit Intelligent Cloud
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", color: "#14532D" }}>
                  <li>✅ <strong>₦0 setup fees & ₦0 yearly subscriptions forever.</strong></li>
                  <li>✅ Complete core school management is 100% free with unlimited access.</li>
                  <li>✅ <strong>₦0 scratch card fee for parents</strong> — Instant digital report cards.</li>
                  <li>✅ Choose <strong>Basic (₦300)</strong> or <strong>Standard CBT (₦500)</strong> only when tuition is settled.</li>
                  <li>✅ Instant automated Paystack split direct to your school bank account.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* WhatsApp Support Strip */}
          <div className="pr-wa-strip">
            <div>
              <div style={{ fontSize: "17px", fontWeight: 800 }}>
                Need a Personalized Onboarding Demo for Your School?
              </div>
              <div style={{ fontSize: "13.5px", color: "#94A3B8", marginTop: "4px" }}>
                Our education consultants are available 24/7 to help set up your classes, staff, and student records.
              </div>
            </div>

            <a
              href={whatsappLink("Hello SchoolProfit Team! I am a school proprietor/principal and I would like to onboard my school on the Free Core model.")}
              target="_blank"
              rel="noopener noreferrer"
              className="pr-btn-primary pr-btn-gold"
              style={{ width: "auto", padding: "12px 24px", whiteSpace: "nowrap" }}
            >
              <i className="bi bi-whatsapp" /> Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
