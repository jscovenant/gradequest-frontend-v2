import React from 'react';
import { Link } from 'react-router-dom';

const PILLARS = [
  {
    number: '01',
    title: 'Zero-Debt Bursary & Multi-Bank Settlement',
    tagline: 'Eliminate Unpaid Term Fees & Cash Leakage',
    description:
      'Collect tuition effortlessly via Monnify, Wema, and Paystack with instant direct bank credit. Automatic fee-gatekeepers prevent students from accessing report cards or CBT exams until balances are cleared.',
    metrics: '95% On-Time Fee Recovery',
    badge: 'Financial Governance',
    badgeColor: '#D97706',
    badgeBg: '#FEF3C7',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <circle cx="12" cy="15" r="2" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Automated Master Broadsheets & Transcripts',
    tagline: 'From 2 Weeks of Arithmetic Stress to 30 Seconds',
    description:
      'Upload Continuous Assessment (CA) and exam marks in bulk. SchoolProfit calculates cumulative GPAs, subject ranks, standardized grades, and generates publication-ready broadsheets with zero math errors.',
    metrics: '99% Faster Term Processing',
    badge: 'Academic Engine',
    badgeColor: '#059669',
    badgeBg: '#ECFDF5',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Hybrid Online & Offline LAN CBT Exam Center',
    tagline: 'Run Lab Assessments with Zero Internet Anxiety',
    description:
      'Conduct timed mock exams and mid-term assessments in your school computer lab. Our dual sync architecture runs smoothly on local networks with automatic score synchronization into master broadsheets.',
    metrics: '100% Lab Exam Uptime',
    badge: 'Exam Infrastructure',
    badgeColor: '#1D4ED8',
    badgeBg: '#EFF6FF',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    number: '04',
    title: 'Direct WhatsApp & SMS Parent Dispatches',
    tagline: 'Instant Results, Attendance & Invoices on Mobile',
    description:
      'Deliver digital report cards, daily attendance clock-in alerts, and fee statements straight to parents on WhatsApp. Every transcript features an encrypted QR seal for instantaneous public verification.',
    metrics: '100% Parent Engagement',
    badge: 'Parent Trust',
    badgeColor: '#059669',
    badgeBg: '#ECFDF5',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
      </svg>
    ),
  },
  {
    number: '05',
    title: 'Custom School Domain & Admissions Engine',
    tagline: 'Elevate Your School with a Verified .com.ng Web Portal',
    description:
      'Equip your school with its own official web address, principal message, interactive photo gallery, and online admission application form to attract prospective parents and enroll new students effortlessly.',
    metrics: '3x Enrollment Growth',
    badge: 'Institutional Prestige',
    badgeColor: '#7C3AED',
    badgeBg: '#F5F3FF',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
  },
  {
    number: '06',
    title: 'AI Teacher Assistant & Lesson Planner',
    tagline: 'Curricular Standard Compliance in Minutes',
    description:
      'Save teachers 10+ hours per week with automated scheme-of-work alignment, structured weekly lesson notes, and individualized student remarks that elevate instructional quality across all classes.',
    metrics: '10+ Hours Saved / Week',
    badge: 'Faculty Copilot',
    badgeColor: '#DB2777',
    badgeBg: '#FDF2F8',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
  },
];

const COMPARISON = [
  {
    feature: 'Tuition & Fee Collection',
    manual: 'Cash leakage, counterfeit teller slips & unpaid arrears',
    schoolprofit: 'Automated bank settlements + strict result & exam locks',
  },
  {
    feature: 'Master Broadsheets & Reports',
    manual: '2–3 weeks of manual math, typo errors, exhausted teachers',
    schoolprofit: 'One-click automated broadsheet computation in 30 seconds',
  },
  {
    feature: 'CBT Lab Examinations',
    manual: 'Expensive paper printouts or exam crashes during power cuts',
    schoolprofit: 'Dual offline LAN + cloud engine with 100% exam resilience',
  },
  {
    feature: 'Parent Result Delivery',
    manual: 'Physical card printing costs and delayed parent distribution',
    schoolprofit: 'Direct WhatsApp dispatches + QR verified online portals',
  },
  {
    feature: 'Teacher Lesson Planning',
    manual: 'Handwritten notes with inconsistent curriculum standards',
    schoolprofit: 'AI-assisted lesson plans aligned with approved curricula',
  },
];

export default function WhySchoolProfit() {
  return (
    <section id="why-schoolprofit" className="sp-why-section">
      <style>{`
        .sp-why-section {
          background-color: #FFFFFF;
          padding: 100px 0 110px;
          position: relative;
          overflow: hidden;
        }

        .sp-why-container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .sp-why-header {
          text-align: center;
          max-width: 760px;
          margin: 0 auto 64px;
        }

        .sp-why-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 999px;
          background: #FEF3C7;
          border: 1px solid #FDE68A;
          color: #B45309;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .sp-why-title {
          font-size: clamp(28px, 3.8vw, 44px);
          font-weight: 800;
          color: #0A192F;
          line-height: 1.2;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
        }

        .sp-why-title span {
          color: #D97706;
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .sp-why-desc {
          font-size: 16px;
          line-height: 1.7;
          color: #64748B;
          margin: 0;
        }

        /* ── 6 Pillar Grid ── */
        .sp-pillar-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
          margin-bottom: 64px;
        }

        @media (max-width: 1024px) {
          .sp-pillar-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .sp-pillar-grid {
            grid-template-columns: 1fr;
          }
        }

        .sp-pillar-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 20px;
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          position: relative;
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
          box-shadow: 0 4px 16px rgba(10, 25, 47, 0.04);
        }

        .sp-pillar-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 36px rgba(10, 25, 47, 0.09);
          border-color: #CBD5E1;
        }

        .sp-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .sp-card-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sp-card-num {
          font-size: 14px;
          font-weight: 800;
          color: #94A3B8;
          font-family: monospace;
        }

        .sp-card-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          margin-bottom: 12px;
          width: fit-content;
        }

        .sp-card-title {
          font-size: 18px;
          font-weight: 800;
          color: #0A192F;
          line-height: 1.35;
          margin-bottom: 8px;
        }

        .sp-card-tagline {
          font-size: 12.5px;
          font-weight: 700;
          color: #D97706;
          margin-bottom: 12px;
        }

        .sp-card-desc {
          font-size: 14px;
          line-height: 1.6;
          color: #64748B;
          margin-bottom: 20px;
          flex: 1;
        }

        .sp-card-metric-bar {
          padding-top: 16px;
          border-top: 1px solid #F1F5F9;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          font-weight: 700;
          color: #059669;
        }

        /* ── Comparison Banner ── */
        .sp-compare-wrap {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 8px 30px rgba(10, 25, 47, 0.03);
        }

        @media (max-width: 768px) {
          .sp-compare-wrap {
            padding: 24px 16px;
          }
        }

        .sp-compare-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .sp-compare-title {
          font-size: 22px;
          font-weight: 800;
          color: #0A192F;
          margin-bottom: 6px;
        }

        .sp-compare-table {
          width: 100%;
          border-collapse: collapse;
        }

        .sp-compare-row {
          border-bottom: 1px solid #E2E8F0;
        }

        .sp-compare-row:last-child {
          border-bottom: none;
        }

        .sp-compare-cell {
          padding: 16px 12px;
          font-size: 13.5px;
          vertical-align: middle;
        }

        .sp-cell-label {
          font-weight: 700;
          color: #0A192F;
          width: 28%;
        }

        .sp-cell-manual {
          color: #EF4444;
          background: #FEF2F2;
          border-radius: 8px;
          font-weight: 500;
          width: 36%;
        }

        .sp-cell-sp {
          color: #059669;
          background: #ECFDF5;
          border-radius: 8px;
          font-weight: 700;
          width: 36%;
        }

        @media (max-width: 640px) {
          .sp-compare-table, .sp-compare-table tbody, .sp-compare-row {
            display: block;
          }
          .sp-compare-cell {
            display: block;
            width: 100% !important;
            margin-bottom: 6px;
          }
          .sp-cell-label {
            margin-top: 14px;
            font-size: 15px;
          }
        }

        .sp-why-cta-row {
          text-align: center;
          margin-top: 48px;
        }

        .sp-btn-get-started {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 100%);
          color: #FFFFFF;
          padding: 14px 32px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 800;
          text-decoration: none;
          transition: all 0.25s ease;
          box-shadow: 0 8px 24px rgba(10, 25, 47, 0.2);
        }

        .sp-btn-get-started:hover {
          background: #1E3A8A;
          color: #FFFFFF;
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(10, 25, 47, 0.28);
        }
      `}</style>

      <div className="sp-why-container">
        <div className="sp-why-header">
          <div className="sp-why-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Why School Leaders Choose Us</span>
          </div>
          <h2 className="sp-why-title">
            Engineered to Eliminate Bottlenecks & <span>Maximize School Profit</span>
          </h2>
          <p className="sp-why-desc">
            Nigeria's premier school management infrastructure designed for maximum revenue recovery, rapid continuous assessment calculations, and prestigious parent satisfaction.
          </p>
        </div>

        {/* 6 Strategic Pillars Grid */}
        <div className="sp-pillar-grid">
          {PILLARS.map((p, idx) => (
            <div key={idx} className="sp-pillar-card">
              <div className="sp-card-top">
                <div className="sp-card-icon" style={{ background: p.badgeBg, color: p.badgeColor }}>
                  {p.icon}
                </div>
                <span className="sp-card-num">{p.number}</span>
              </div>
              <span className="sp-card-badge" style={{ background: p.badgeBg, color: p.badgeColor }}>
                {p.badge}
              </span>
              <h3 className="sp-card-title">{p.title}</h3>
              <div className="sp-card-tagline">{p.tagline}</div>
              <p className="sp-card-desc">{p.description}</p>
              <div className="sp-card-metric-bar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{p.metrics}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Side-by-Side Comparison Box */}
        <div className="sp-compare-wrap">
          <div className="sp-compare-header">
            <h3 className="sp-compare-title">Old Manual Operations vs. SchoolProfit Automation</h3>
            <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
              See why forward-thinking school administrators are replacing manual spreadsheets.
            </p>
          </div>

          <table className="sp-compare-table">
            <tbody>
              {COMPARISON.map((row, index) => (
                <tr key={index} className="sp-compare-row">
                  <td className="sp-compare-cell sp-cell-label">{row.feature}</td>
                  <td className="sp-compare-cell sp-cell-manual">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px' }}>✕</span>
                      <span>{row.manual}</span>
                    </div>
                  </td>
                  <td className="sp-compare-cell sp-cell-sp">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px' }}>✓</span>
                      <span>{row.schoolprofit}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sp-why-cta-row">
          <Link to="/signup" className="sp-btn-get-started">
            <span>Transform Your School Today</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
