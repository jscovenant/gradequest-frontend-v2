import React from 'react';
import { Link } from 'react-router-dom';

const FEATURES = [
  {
    badge: 'Academic Leadership',
    badgeColor: '#059669',
    badgeBg: '#ECFDF5',
    title: 'Automated Master Broadsheets & Transcripts',
    subtitle: 'Generate print-ready grade sheets in 30 seconds',
    desc: 'Input continuous assessments (CA) and terminal exam scores. The platform automatically tabulates class averages, term GPAs, subject positions, and cumulative session grades without formula errors.',
    bullets: [
      'Zero-error automatic arithmetic computation',
      'One-click export to Excel and publication PDF',
      'Pre-populated psychomotor and teacher evaluation remarks',
    ],
    span: '2',
  },
  {
    badge: 'Bursary Governance',
    badgeColor: '#D97706',
    badgeBg: '#FEF3C7',
    title: 'Live Fee Ledgers & Instant Receipts',
    subtitle: 'Zero cash leakage and complete accounting transparency',
    desc: 'Track tuition payments across all classes in real time. Generate encrypted digital payment receipts sent directly to parents on WhatsApp, with multi-bank settlement verification.',
    bullets: [
      'Instant Monnify, Wema and Paystack settlement',
      'Automatic fee-gate locks on exam results',
      'Real-time arrears breakdown per classroom',
    ],
    span: '1',
  },
  {
    badge: 'Assessment Infrastructure',
    badgeColor: '#1D4ED8',
    badgeBg: '#EFF6FF',
    title: 'Offline & Online LAN CBT Testing Center',
    subtitle: 'Resilient computer-based testing for school labs',
    desc: 'Administer timed continuous assessment tests and mock exams in your school laboratory with dual-network synchronization that never crashes during power cuts or network dips.',
    bullets: [
      'Local network (LAN) resilience with real-time sync',
      'Supports equations, scientific symbols and diagrams',
      'Instant auto-grading directly into academic broadsheets',
    ],
    span: '1',
  },
  {
    badge: 'Institutional Prestige',
    badgeColor: '#7C3AED',
    badgeBg: '#F5F3FF',
    title: 'Verified School Domain & Web Portal',
    subtitle: 'Own your prestigious .com.ng identity',
    desc: 'Equip your school with its own custom domain, principal welcome message, admissions portal, and public events gallery that attracts high-caliber prospective families.',
    bullets: [
      'Official domain registration (.com.ng, .sch.ng, .org.ng)',
      'Self-service public parent admission application engine',
      'Fully responsive, mobile-first school website',
    ],
    span: '2',
  },
  {
    badge: 'Direct Parent Engagement',
    badgeColor: '#059669',
    badgeBg: '#ECFDF5',
    title: 'Direct WhatsApp Result & Alert Broadcasts',
    subtitle: 'Instant parent notification on their favorite app',
    desc: 'Dispatch terminal report cards, student daily attendance clock-ins, fee invoices, and urgent administrative notices directly to parents\' phones with a single click.',
    bullets: [
      'Direct WhatsApp dispatches with encrypted PIN access',
      'Instant student attendance SMS & WhatsApp alerts',
      'High open-rate parent broadcast notifications',
    ],
    span: '1',
  },
  {
    badge: 'Faculty Copilot',
    badgeColor: '#DB2777',
    badgeBg: '#FDF2F8',
    title: 'AI Lesson Planner & Curricular Assistant',
    subtitle: 'Empower teachers to deliver standard curriculum',
    desc: 'Accelerate lesson preparation with intelligent assistants that build curriculum-aligned schemes of work, detailed weekly lesson plans, and actionable diagnostics on struggling students.',
    bullets: [
      'Curriculum-compliant weekly scheme generator',
      'Automated personalized student report remarks',
      'Score outlier detection & academic trend analysis',
    ],
    span: '2',
  },
];

export default function Feature() {
  return (
    <section id="features" className="sp-feat-section">
      <style>{`
        .sp-feat-section {
          background-color: #F8FAFC;
          padding: 100px 0 110px;
          position: relative;
          overflow: hidden;
          border-top: 1px solid #E2E8F0;
        }

        .sp-feat-container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .sp-feat-header {
          text-align: center;
          max-width: 760px;
          margin: 0 auto 64px;
        }

        .sp-feat-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 999px;
          background: #EFF6FF;
          border: 1px solid #BFDBFE;
          color: #1D4ED8;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .sp-feat-title {
          font-size: clamp(28px, 3.8vw, 44px);
          font-weight: 800;
          color: #0A192F;
          line-height: 1.2;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
        }

        .sp-feat-title span {
          color: #D97706;
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .sp-feat-desc {
          font-size: 16px;
          line-height: 1.7;
          color: #64748B;
          margin: 0;
        }

        /* ── Bento Grid ── */
        .sp-bento-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
        }

        @media (max-width: 1024px) {
          .sp-bento-grid {
            grid-template-columns: 1fr;
          }
        }

        .sp-bento-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 24px;
          padding: 36px 32px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 20px rgba(10, 25, 47, 0.04);
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
        }

        .sp-bento-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 16px 36px rgba(10, 25, 47, 0.08);
          border-color: #CBD5E1;
        }

        .sp-bento-span-2 {
          grid-column: span 2;
        }

        @media (max-width: 1024px) {
          .sp-bento-span-2 {
            grid-column: span 1;
          }
        }

        .sp-bento-badge {
          display: inline-block;
          font-size: 11.5px;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 6px;
          margin-bottom: 18px;
          width: fit-content;
        }

        .sp-bento-title {
          font-size: 22px;
          font-weight: 800;
          color: #0A192F;
          line-height: 1.3;
          margin-bottom: 8px;
        }

        .sp-bento-sub {
          font-size: 13.5px;
          font-weight: 700;
          color: #D97706;
          margin-bottom: 14px;
        }

        .sp-bento-text {
          font-size: 14.5px;
          line-height: 1.65;
          color: #64748B;
          margin-bottom: 24px;
        }

        .sp-bento-bullets {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: auto;
          border-top: 1px solid #F1F5F9;
          padding-top: 20px;
        }

        .sp-bento-bullet-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
          font-weight: 600;
          color: #1E293B;
        }

        .sp-bento-check {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ECFDF5;
          color: #059669;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 11px;
          font-weight: 800;
        }
      `}</style>

      <div className="sp-feat-container">
        <div className="sp-feat-header">
          <div className="sp-feat-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>Core Functional Architecture</span>
          </div>
          <h2 className="sp-feat-title">
            Every Tool Needed to Run a <span>World-Class Institution</span>
          </h2>
          <p className="sp-feat-desc">
            Designed specifically for Nigerian primary and secondary school administrators, bursars, teachers, and parents.
          </p>
        </div>

        <div className="sp-bento-grid">
          {FEATURES.map((f, index) => (
            <div
              key={index}
              className={`sp-bento-card ${f.span === '2' ? 'sp-bento-span-2' : ''}`}
            >
              <span className="sp-bento-badge" style={{ background: f.badgeBg, color: f.badgeColor }}>
                {f.badge}
              </span>
              <h3 className="sp-bento-title">{f.title}</h3>
              <div className="sp-bento-sub">{f.subtitle}</div>
              <p className="sp-bento-text">{f.desc}</p>
              <ul className="sp-bento-bullets">
                {f.bullets.map((b, bIdx) => (
                  <li key={bIdx} className="sp-bento-bullet-item">
                    <span className="sp-bento-check">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
