import { useState } from "react";
import { Link } from "react-router-dom";

export default function Hero() {
  const [showcaseMode, setShowcaseMode] = useState<"experience" | "software">("experience");
  const [activeTab, setActiveTab] = useState<"broadsheet" | "reportcard" | "fees" | "cbt" | "whatsapp">("broadsheet");
  const [activeHotspot, setActiveHotspot] = useState<number | null>(null);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,800;1,600;1,700&display=swap');

        :root {
          --gq-hero-bg: #F8FAFC;
          --gq-hero-surface: #FFFFFF;
          --gq-hero-surface-active: #F1F5F9;
          --gq-hero-border: rgba(15, 39, 68, 0.08);
          --gq-hero-navy: #0F2744;
          --gq-hero-navy-dark: #0A192F;
          --gq-hero-gold: #D97706;
          --gq-hero-gold-light: #F59E0B;
          --gq-hero-emerald: #059669;
          --gq-hero-blue: #1D4ED8;
          --gq-hero-text: #0F172A;
          --gq-hero-muted: #475569;
        }

        .gq-hero-section {
          background-color: var(--gq-hero-bg);
          position: relative;
          overflow: hidden;
          font-family: 'Plus Jakarta Sans', sans-serif;
          padding-top: max(130px, calc(100px + env(safe-area-inset-top)));
          padding-bottom: 84px;
          min-height: 100vh;
          display: flex;
          align-items: center;
          opacity: 1 !important;
          transform: none !important;
          visibility: visible !important;
        }

        /* Subtle grid background */
        .gq-hero-section::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(15, 39, 68, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15, 39, 68, 0.035) 1px, transparent 1px);
          background-size: 56px 56px;
          pointer-events: none;
          z-index: 0;
        }

        /* Ambient Glow Spheres */
        .gq-glow-tl {
          position: absolute;
          top: -15%;
          left: -10%;
          width: 580px;
          height: 580px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.09) 0%, transparent 65%);
          pointer-events: none;
          z-index: 0;
        }

        .gq-glow-br {
          position: absolute;
          bottom: -15%;
          right: -10%;
          width: 640px;
          height: 640px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(29, 78, 216, 0.08) 0%, transparent 65%);
          pointer-events: none;
          z-index: 0;
        }

        .gq-hero-inner {
          position: relative;
          z-index: 1;
          width: 100%;
        }

        /* ── Badge / Kicker ── */
        .gq-hero-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 18px;
          border-radius: 999px;
          background: #FEF3C7;
          border: 1px solid #F59E0B;
          color: #92400E !important;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 18px;
          box-shadow: 0 2px 10px rgba(217, 119, 6, 0.15);
        }

        .gq-kicker-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #059669;
          box-shadow: 0 0 8px #059669;
          animation: pulseDot 2s infinite ease-in-out;
        }

        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.6; }
        }

        /* ── Trust Avatars ── */
        .gq-trust-avatars {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 22px;
        }

        .gq-avatar-stack {
          display: flex;
          align-items: center;
        }

        .gq-avatar-img {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 2.5px solid #FFFFFF;
          object-fit: cover;
          margin-left: -10px;
          box-shadow: 0 2px 6px rgba(15, 39, 68, 0.15);
          transition: transform 0.2s ease;
        }

        .gq-avatar-img:first-child {
          margin-left: 0;
        }

        .gq-avatar-img:hover {
          transform: translateY(-3px) scale(1.1);
          z-index: 10;
        }

        /* ── Headline ── */
        .gq-hero-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(34px, 4.5vw, 56px);
          font-weight: 800;
          line-height: 1.18;
          color: #0A192F !important;
          letter-spacing: -0.02em;
          margin-bottom: 20px;
          display: block;
          opacity: 1 !important;
          visibility: visible !important;
        }

        .gq-hero-title-main {
          color: #0A192F !important;
          display: inline;
        }

        .gq-hero-title-highlight {
          font-style: italic;
          font-family: 'Playfair Display', serif;
          color: #D97706 !important;
          display: inline;
        }

        @supports (-webkit-background-clip: text) {
          .gq-hero-title-highlight {
            background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
        }

        .gq-hero-desc {
          font-size: clamp(15px, 1.2vw, 17px);
          font-weight: 400;
          line-height: 1.75;
          color: #334155 !important;
          max-width: 540px;
          margin-bottom: 32px;
        }

        .gq-hero-desc strong {
          color: #0A192F !important;
          font-weight: 700;
        }

        /* ── Action Buttons ── */
        .gq-hero-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 14px;
          margin-bottom: 36px;
        }

        .gq-btn-cta-main {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px 28px;
          font-size: 15px;
          font-weight: 700;
          color: #FFFFFF;
          background: linear-gradient(135deg, #0F2744 0%, #1E3A8A 100%);
          border-radius: 10px;
          text-decoration: none;
          box-shadow: 0 6px 20px rgba(15, 39, 68, 0.22);
          transition: all 0.25s ease;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .gq-btn-cta-main:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(30, 58, 138, 0.35);
          color: #FFFFFF;
          background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);
        }

        .gq-btn-cta-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px 24px;
          font-size: 15px;
          font-weight: 600;
          color: #0F2744;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.25s ease;
          box-shadow: 0 2px 8px rgba(15, 39, 68, 0.05);
        }

        .gq-btn-cta-secondary:hover {
          background: #F8FAFC;
          border-color: #CBD5E1;
          color: #1D4ED8;
          transform: translateY(-2px);
        }

        /* ── Statistics Bar ── */
        .gq-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          padding-top: 24px;
          border-top: 1px solid #E2E8F0;
          max-width: 580px;
        }

        @media (max-width: 600px) {
          .gq-stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
          }
        }

        .gq-stat-item {
          display: flex;
          flex-direction: column;
        }

        .gq-stat-num {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 21px;
          font-weight: 800;
          color: #0F2744;
          line-height: 1.1;
        }

        .gq-stat-num span {
          color: var(--gq-hero-gold);
        }

        .gq-stat-lbl {
          font-size: 11.5px;
          font-weight: 500;
          color: #64748B;
          margin-top: 3px;
        }

        /* ── Showcase Card & Switcher ── */
        .gq-showcase-mode-bar {
          display: inline-flex;
          background: #E2E8F0;
          padding: 4px;
          border-radius: 12px;
          margin-bottom: 16px;
          gap: 4px;
        }

        .gq-mode-btn {
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 700;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .gq-mode-btn.active {
          background: #0F2744;
          color: #FFFFFF;
          box-shadow: 0 2px 8px rgba(15, 39, 68, 0.2);
        }

        .gq-preview-card {
          background: #FFFFFF;
          border: 1px solid rgba(15, 39, 68, 0.1);
          border-radius: 20px;
          box-shadow: 0 20px 50px -10px rgba(15, 39, 68, 0.14);
          overflow: hidden;
          position: relative;
        }

        /* ── Human Experience Showcase ── */
        .gq-human-showcase-wrap {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          height: 440px;
          background: #0F2744;
        }

        .gq-hero-main-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 25%;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .gq-human-showcase-wrap:hover .gq-hero-main-img {
          transform: scale(1.03);
        }

        .gq-hero-img-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(15, 39, 68, 0.15) 0%, rgba(15, 39, 68, 0.4) 60%, rgba(15, 39, 68, 0.85) 100%);
          pointer-events: none;
        }

        /* ── Floating Badges with Human Avatars ── */
        .gq-floating-card {
          position: absolute;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 14px;
          padding: 10px 14px;
          box-shadow: 0 12px 30px rgba(10, 25, 47, 0.25);
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 5;
          animation: gqFloat 4s ease-in-out infinite alternate;
          transition: transform 0.2s ease;
        }

        .gq-floating-card:hover {
          transform: scale(1.04);
        }

        .gq-card-top-left {
          top: 18px;
          left: 18px;
          animation-delay: 0s;
        }

        .gq-card-bottom-right {
          bottom: 22px;
          right: 18px;
          animation-delay: 1.5s;
        }

        .gq-card-bottom-left {
          bottom: 22px;
          left: 18px;
          animation-delay: 2.5s;
        }

        @keyframes gqFloat {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-8px); }
        }

        .gq-float-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #D97706;
          flex-shrink: 0;
        }

        /* Hotspot Pins on Hero */
        .gq-hotspot-pin {
          position: absolute;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #F59E0B;
          color: #0F2744;
          font-weight: 800;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7);
          animation: hotspotPulse 2s infinite;
          z-index: 6;
        }

        @keyframes hotspotPulse {
          0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.8); }
          70% { box-shadow: 0 0 0 14px rgba(245, 158, 11, 0); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }

        .gq-hotspot-1 { top: 38%; right: 28%; }
        .gq-hotspot-2 { top: 58%; left: 32%; }

        /* ── Software Mode Header & Tabs ── */
        .gq-preview-header {
          padding: 16px 20px;
          background: #F8FAFC;
          border-bottom: 1px solid #E2E8F0;
        }

        .gq-preview-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .gq-preview-dots {
          display: flex;
          gap: 6px;
        }

        .gq-p-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .gq-p-dot--red { background: #EF4444; }
        .gq-p-dot--yellow { background: #F59E0B; }
        .gq-p-dot--green { background: #10B981; }

        .gq-preview-school-name {
          font-size: 12.5px;
          font-weight: 700;
          color: #0F2744;
        }

        .gq-showcase-tabs {
          display: flex;
          gap: 6px;
        }

        .gq-tab-btn {
          padding: 6px 12px;
          font-size: 11.5px;
          font-weight: 700;
          border: 1px solid transparent;
          border-radius: 8px;
          background: #FFFFFF;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .gq-tab-btn.active {
          background: #0F2744;
          color: #FFFFFF;
          border-color: #0F2744;
        }

        .gq-preview-body {
          padding: 24px;
          min-height: 340px;
        }

        /* ── Tab Views Styles ── */
        .gq-bs-table-wrap {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
        }

        .gq-bs-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
        }

        .gq-bs-table th {
          background: #F1F5F9;
          padding: 8px 10px;
          text-align: left;
          font-weight: 700;
          color: #475569;
          border-bottom: 1px solid #E2E8F0;
        }

        .gq-bs-table td {
          padding: 10px;
          border-bottom: 1px solid #F1F5F9;
          color: #1E293B;
        }

        .gq-rank-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          font-size: 11px;
          font-weight: 800;
        }

        .gq-rank-1 { background: #FEF3C7; color: #B45309; }
        .gq-rank-2 { background: #E2E8F0; color: #475569; }
        .gq-rank-3 { background: #FFEDD5; color: #C2410C; }

        .gq-rc-card {
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 16px;
          background: #FFFFFF;
        }

        .gq-rc-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1.5px solid #0F2744;
          padding-bottom: 10px;
          margin-bottom: 14px;
        }

        .gq-rc-school {
          font-weight: 800;
          font-size: 13px;
          color: #0F2744;
          letter-spacing: 0.04em;
        }

        .gq-rc-meta {
          font-size: 11px;
          color: #64748B;
        }

        .gq-rc-qr-box {
          width: 48px;
          height: 48px;
          background: #0F2744;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #FBBF24;
          font-weight: 800;
          font-size: 9px;
        }

        .gq-fee-card {
          background: #ECFDF5;
          border: 1px solid #A7F3D0;
          border-radius: 14px;
          padding: 18px;
        }

        .gq-fee-amount {
          font-size: 26px;
          font-weight: 800;
          color: #047857;
          margin: 6px 0;
        }

        .gq-wa-bubble {
          background: #DCF8C6;
          border-radius: 12px 12px 0 12px;
          padding: 14px 16px;
          font-size: 12.5px;
          color: #111827;
          border: 1px solid #B7E4C7;
          position: relative;
        }

        .gq-wa-sender {
          font-size: 11px;
          font-weight: 700;
          color: #059669;
          margin-bottom: 4px;
        }

        .gq-wa-link-btn {
          display: block;
          margin-top: 8px;
          font-weight: 700;
          color: #1E40AF;
          text-decoration: underline;
        }
      `}</style>

      <section className="gq-hero-section">
        <div className="gq-glow-tl" />
        <div className="gq-glow-br" />

        <div className="container-xl gq-hero-inner">
          <div className="row align-items-center g-5">
            {/* ── Left Content Column ── */}
            <div className="col-lg-6">
              <div className="gq-hero-kicker">
                <span className="gq-kicker-dot" />
                The School Growth &amp; Profit Operating System
              </div>

              <h1 className="gq-hero-title" style={{ color: "#0A192F" }}>
                <span className="gq-hero-title-main" style={{ color: "#0A192F" }}>
                  Stop Fee Debts. Scale Admissions.{" "}
                </span>
                <em className="gq-hero-title-highlight" style={{ color: "#059669" }}>
                  Make Your School Profitable.
                </em>
              </h1>

              <p className="gq-hero-desc">
                SchoolProfit combines <strong>automated fee debt recovery and instant multi-bank settlements</strong> with{" "}
                <strong>1-click error-free broadsheets</strong>, <strong>offline hybrid CBT exams</strong>, and <strong>AI lesson planning</strong>.
                Cut running costs, eliminate payment defaults, and give your school the financial strength to grow.
              </p>

              {/* Trust Avatars Stack */}
              <div className="gq-trust-avatars">
                <div className="gq-avatar-stack">
                  <img src="/images/testimonials/adaeze-okonkwo.jpg" alt="Principal" className="gq-avatar-img" />
                  <img src="/images/testimonials/tunde-adeyemi.jpg" alt="Administrator" className="gq-avatar-img" />
                  <img src="/images/testimonials/funmi-bello.jpg" alt="Proprietress" className="gq-avatar-img" />
                  <img src="/images/testimonials/emeka-nwosu.jpg" alt="Director" className="gq-avatar-img" />
                </div>
                <div>
                  <div className="d-flex align-items-center gap-1" style={{ color: "#D97706", fontSize: "13px" }}>
                    <span>★★★★★</span>
                    <strong style={{ color: "#0F2744", fontSize: "12px", marginLeft: "4px" }}>4.9/5 Rating</strong>
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>
                    Trusted by <strong>500+ School Proprietors &amp; Principals</strong>
                  </div>
                </div>
              </div>

              <div className="gq-hero-actions">
                <Link to="/book-demo" className="gq-btn-cta-main" style={{ background: "linear-gradient(135deg, #059669 0%, #047857 100%)" }}>
                  Book a Live Demo / Request Setup
                  <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M1 7h12M7 1l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
                <a href="#why-schoolprofit" className="gq-btn-cta-secondary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 16 16 12 12 8" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  Why SchoolProfit
                </a>
              </div>

              {/* Verified Statistics Bar */}
              <div className="gq-stats-grid">
                <div className="gq-stat-item">
                  <span className="gq-stat-num">500<span>+</span></span>
                  <span className="gq-stat-lbl">Institutions Powered</span>
                </div>
                <div className="gq-stat-item">
                  <span className="gq-stat-num">2.4M<span>+</span></span>
                  <span className="gq-stat-lbl">Results Delivered</span>
                </div>
                <div className="gq-stat-item">
                  <span className="gq-stat-num">99.9<span>%</span></span>
                  <span className="gq-stat-lbl">System Reliability</span>
                </div>
                <div className="gq-stat-item">
                  <span className="gq-stat-num">100<span>%</span></span>
                  <span className="gq-stat-lbl">Audit Compliance</span>
                </div>
              </div>
            </div>

            {/* ── Right Column: Dynamic Interactive School Showcase ── */}
            <div className="col-lg-6">
              {/* Dual Mode Switcher Bar */}
              <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                <div className="gq-showcase-mode-bar">
                  <button
                    type="button"
                    className={`gq-mode-btn ${showcaseMode === "experience" ? "active" : ""}`}
                    onClick={() => setShowcaseMode("experience")}
                  >
                    🎓 School Experience
                  </button>
                  <button
                    type="button"
                    className={`gq-mode-btn ${showcaseMode === "software" ? "active" : ""}`}
                    onClick={() => setShowcaseMode("software")}
                  >
                    ⚡ Software Simulator
                  </button>
                </div>
                <span className="badge bg-light text-dark fw-bold px-2.5 py-1.5" style={{ fontSize: "11px", border: "1px solid #E2E8F0" }}>
                  {showcaseMode === "experience" ? "Live School Impact" : "Interactive Prototype"}
                </span>
              </div>

              {showcaseMode === "experience" ? (
                /* ── MODE 1: HUMAN & CAMPUS EXPERIENCE ── */
                <div className="gq-preview-card p-2">
                  <div className="gq-human-showcase-wrap">
                    <img
                      src="/images/hero/hero-nigerian-students.jpg"
                      alt="Nigerian secondary school students in modern classroom"
                      className="gq-hero-main-img"
                    />
                    <div className="gq-hero-img-gradient" />

                    {/* Floating Badge 1: Principal Headshot */}
                    <div className="gq-floating-card gq-card-top-left">
                      <img
                        src="/images/hero/hero-principal-portrait.jpg"
                        alt="School Principal"
                        className="gq-float-avatar"
                      />
                      <div>
                        <div style={{ fontSize: "10.5px", fontWeight: 800, color: "#D97706", textTransform: "uppercase" }}>
                          VERIFIED PRINCIPAL
                        </div>
                        <div style={{ fontSize: "12.5px", fontWeight: 800, color: "#0F2744" }}>
                          Broadsheets ready in 30 seconds
                        </div>
                      </div>
                    </div>

                    {/* Interactive Hotspot 1 */}
                    <div
                      className="gq-hotspot-pin gq-hotspot-1"
                      onClick={() => setActiveHotspot(activeHotspot === 1 ? null : 1)}
                      title="Click to view CBT exam info"
                    >
                      <i className="bi bi-laptop" />
                    </div>

                    {activeHotspot === 1 && (
                      <div
                        className="p-3 bg-white rounded shadow-lg position-absolute"
                        style={{ top: "45%", right: "10%", zIndex: 20, width: "240px", fontSize: "12px", border: "1.5px solid #F59E0B" }}
                      >
                        <strong className="d-block text-dark mb-1">💻 Offline CBT Exam Engine</strong>
                        <span className="text-muted">65 systems synchronized simultaneously with zero internet bandwidth requirement.</span>
                      </div>
                    )}

                    {/* Floating Badge 2: Student Achiever */}
                    <div className="gq-floating-card gq-card-bottom-right">
                      <img
                        src="/images/hero/hero-student-achiever.jpg"
                        alt="Academic Achiever"
                        className="gq-float-avatar"
                        style={{ borderColor: "#059669" }}
                      />
                      <div>
                        <div style={{ fontSize: "10.5px", fontWeight: 800, color: "#059669", textTransform: "uppercase" }}>
                          ACADEMIC DISTINCTION
                        </div>
                        <div style={{ fontSize: "12.5px", fontWeight: 800, color: "#0F2744" }}>
                          96.4% GPA · PIN #GQ-9821
                        </div>
                      </div>
                    </div>

                    {/* Bottom Floating Bar */}
                    <div
                      className="position-absolute bottom-0 start-0 end-0 p-3 d-flex justify-content-between align-items-center text-white"
                      style={{ background: "rgba(15, 39, 68, 0.88)", backdropFilter: "blur(8px)" }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <span className="p-1.5 rounded-circle bg-success text-white" style={{ fontSize: "10px" }}>
                          <i className="bi bi-check-lg" />
                        </span>
                        <span style={{ fontSize: "12px", fontWeight: 700 }}>
                          DIKOR Comprehensive College, Lagos · Active Database
                        </span>
                      </div>
                      <span className="badge bg-warning text-dark fw-bold" style={{ fontSize: "10.5px" }}>
                        Active Term
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── MODE 2: SOFTWARE SIMULATOR ── */
                <div className="gq-preview-card">
                  <div className="gq-preview-header">
                    <div className="gq-preview-title">
                      <div className="gq-preview-dots">
                        <span className="gq-p-dot gq-p-dot--red" />
                        <span className="gq-p-dot gq-p-dot--yellow" />
                        <span className="gq-p-dot gq-p-dot--green" />
                      </div>
                      <span className="gq-preview-school-name">DIKOR Comprehensive College · Active Portal</span>
                    </div>

                    {/* Interactive Tab Switcher */}
                    <div className="gq-showcase-tabs" style={{ overflowX: "auto", maxWidth: "100%" }}>
                      <button
                        className={`gq-tab-btn ${activeTab === "broadsheet" ? "active" : ""}`}
                        onClick={() => setActiveTab("broadsheet")}
                      >
                        📊 Broadsheet
                      </button>
                      <button
                        className={`gq-tab-btn ${activeTab === "reportcard" ? "active" : ""}`}
                        onClick={() => setActiveTab("reportcard")}
                      >
                        📜 Report Card
                      </button>
                      <button
                        className={`gq-tab-btn ${activeTab === "fees" ? "active" : ""}`}
                        onClick={() => setActiveTab("fees")}
                      >
                        💳 School Fees
                      </button>
                      <button
                        className={`gq-tab-btn ${activeTab === "cbt" ? "active" : ""}`}
                        onClick={() => setActiveTab("cbt")}
                      >
                        💻 CBT Exams
                      </button>
                      <button
                        className={`gq-tab-btn ${activeTab === "whatsapp" ? "active" : ""}`}
                        onClick={() => setActiveTab("whatsapp")}
                      >
                        💬 WhatsApp
                      </button>
                    </div>
                  </div>

                  <div className="gq-preview-body">
                    {/* Tab 1: Instant Broadsheet Preview */}
                    {activeTab === "broadsheet" && (
                      <div>
                        <div className="d-flex align-items-center justify-content-between mb-3">
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#0F2744" }}>
                            SS 2 First Term Academic Broadsheet
                          </span>
                          <span style={{ fontSize: 11, color: "#059669", fontWeight: 700 }}>
                            ✅ NERDC & WAEC Standard
                          </span>
                        </div>
                        <div className="gq-bs-table-wrap">
                          <table className="gq-bs-table">
                            <thead>
                              <tr>
                                <th>Pos</th>
                                <th>Student Name</th>
                                <th>Math</th>
                                <th>Eng</th>
                                <th>Sci</th>
                                <th>Avg</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td><span className="gq-rank-badge gq-rank-1">1</span></td>
                                <td><strong style={{ color: "#0F2744" }}>Chukwudi Okafor</strong></td>
                                <td>94</td>
                                <td>88</td>
                                <td>92</td>
                                <td style={{ color: "#059669", fontWeight: 700 }}>91.3%</td>
                              </tr>
                              <tr>
                                <td><span className="gq-rank-badge gq-rank-2">2</span></td>
                                <td><strong style={{ color: "#0F2744" }}>Amina Bello</strong></td>
                                <td>88</td>
                                <td>92</td>
                                <td>86</td>
                                <td style={{ color: "#059669", fontWeight: 700 }}>88.6%</td>
                              </tr>
                              <tr>
                                <td><span className="gq-rank-badge gq-rank-3">3</span></td>
                                <td><strong style={{ color: "#0F2744" }}>Oluwaseun Adeyemi</strong></td>
                                <td>85</td>
                                <td>86</td>
                                <td>89</td>
                                <td style={{ color: "#059669", fontWeight: 700 }}>86.6%</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-3 pt-2" style={{ borderTop: "1px solid #E2E8F0" }}>
                          <span style={{ fontSize: "11.5px", color: "#64748B" }}>Class Weighted Average: <strong style={{ color: "#0F2744" }}>76.4%</strong></span>
                          <span style={{ fontSize: "11.5px", color: "#D97706", fontWeight: 700 }}>Export Master Broadsheets (PDF & Excel)</span>
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Verified Digital Report Card */}
                    {activeTab === "reportcard" && (
                      <div className="gq-rc-card">
                        <div className="gq-rc-header">
                          <div>
                            <div className="gq-rc-school">DIKOR COMPREHENSIVE COLLEGE</div>
                            <div className="gq-rc-meta">First Term Continuous Assessment & Exam Report</div>
                          </div>
                          <div className="gq-rc-qr-box">
                            <span>VERIFIED</span>
                            <span style={{ fontSize: 6 }}>QR AUTH</span>
                          </div>
                        </div>

                        <div className="d-flex justify-content-between mb-2" style={{ fontSize: 12.5 }}>
                          <span>Student: <strong style={{ color: "#0F2744" }}>David Adesina</strong></span>
                          <span>Class: <strong>SS 2 Science</strong></span>
                          <span>Position: <strong style={{ color: "#B45309" }}>1st of 58</strong></span>
                        </div>

                        <div style={{ background: "#F8FAFC", padding: "10px 14px", borderRadius: 8, fontSize: 12, color: "#334155", fontStyle: "italic", borderLeft: "3px solid #D97706", marginBottom: 8 }}>
                          "Principal's Remark: Outstanding academic result. Demonstrates exceptional problem-solving and discipline across all STEM subjects."
                        </div>

                        <div className="d-flex justify-content-between align-items-center mt-3 pt-2" style={{ borderTop: "1px solid #E2E8F0", fontSize: 11.5 }}>
                          <span style={{ color: "#64748B" }}>Official Digital Stamp: Approved by Head of Academics</span>
                          <span style={{ color: "#047857", fontWeight: 700 }}>Grade: A+ (Distinction)</span>
                        </div>
                      </div>
                    )}

                    {/* Tab 3: School Fees Tracking */}
                    {activeTab === "fees" && (
                      <div className="gq-fee-card">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#047857" }}>TERM 1 SCHOOL FEE COLLECTION</span>
                          <span style={{ fontSize: 11, background: "rgba(5, 150, 105, 0.15)", color: "#047857", padding: "3px 9px", borderRadius: 6, fontWeight: 700 }}>96.8% Collected</span>
                        </div>
                        <div className="gq-fee-amount">₦14,850,000</div>
                        <div style={{ fontSize: 12.5, color: "#065F46", marginBottom: 14 }}>
                          Direct Digital & Bank Settlements · Automated Verified Receipts
                        </div>
                        <div style={{ background: "rgba(255, 255, 255, 0.75)", padding: "12px 14px", borderRadius: 8, fontSize: 12.5, color: "#1E293B", border: "1px solid rgba(5, 150, 105, 0.2)" }}>
                          <div className="d-flex justify-content-between mb-1">
                            <span>Total Students Billed:</span>
                            <strong style={{ color: "#0F2744" }}>300 Enrolled</strong>
                          </div>
                          <div className="d-flex justify-content-between" style={{ color: "#047857" }}>
                            <span>Settled Accounts:</span>
                            <strong>291 Students</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 4: CBT Exam Center */}
                    {activeTab === "cbt" && (
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#1D4ED8" }}>
                            💻 COMPUTER LAB & ONLINE CBT HUB
                          </span>
                          <span style={{ fontSize: 11, background: "rgba(29, 78, 216, 0.1)", color: "#1D4ED8", padding: "3px 9px", borderRadius: 6, fontWeight: 700 }}>
                            Offline & Cloud Hybrid
                          </span>
                        </div>

                        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px", marginBottom: 14 }}>
                          <div className="d-flex justify-content-between align-items-center mb-2" style={{ fontSize: 12.5 }}>
                            <span style={{ color: "#64748B" }}>Scheduled Assessment:</span>
                            <strong style={{ color: "#0F2744" }}>Mock BECE / Senior Secondary Exam</strong>
                          </div>
                          <div className="d-flex justify-content-between align-items-center" style={{ fontSize: 12.5 }}>
                            <span style={{ color: "#64748B" }}>Active Terminals:</span>
                            <span style={{ color: "#059669", fontWeight: 700 }}>● 65 Lab Systems Synchronized</span>
                          </div>
                        </div>

                        <div style={{ background: "#F1F5F9", padding: "12px 14px", borderRadius: 8, fontSize: 12, color: "#1E293B", border: "1px solid #E2E8F0" }}>
                          <div className="d-flex justify-content-between mb-1">
                            <span>Continuous Local Caching:</span>
                            <strong style={{ color: "#059669" }}>Zero Data Loss Protection</strong>
                          </div>
                          <div className="d-flex justify-content-between">
                            <span>Grading Architecture:</span>
                            <strong style={{ color: "#1D4ED8" }}>Direct Sync into Term Broadsheets</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 5: WhatsApp Parent Notification */}
                    {activeTab === "whatsapp" && (
                      <div>
                        <div className="gq-wa-bubble">
                          <div className="gq-wa-sender">DIKOR Comprehensive College Official</div>
                          Dear <strong>Mrs. Adesina</strong>, David's <strong>First Term Report Card</strong> is now verified and published!
                          <br /><br />
                          📈 <strong>Position:</strong> 1st of 58 students (Average: 89.6%)<br />
                          💳 <strong>Tuition Status:</strong> Cleared (Receipt #GQ-4491)<br />
                          📅 <strong>Resumption Date:</strong> 12th January
                          <br />
                          <span className="gq-wa-link-btn">👉 Click to View David's Verified Result</span>
                        </div>
                        <div className="text-center mt-3" style={{ fontSize: 11.5, color: "#64748B" }}>
                          Delivered directly to parents with zero app installation required.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
