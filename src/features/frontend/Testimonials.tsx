import React from 'react';

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  school: string;
  location: string;
  initials: string;
  color: string;
  colorBg: string;
  rating: number;
  tag: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Before SchoolProfit, computing results for 600 students took our staff nearly two weeks. Now it's done in a single afternoon — and the master broadsheet is ready before we even leave the office.",
    name: "Mrs. Janet Avoseh",
    role: "Head of Administration",
    school: "Samjane Arise & Shine Schools",
    location: "Badagry, Lagos",
    initials: "JA",
    color: "#059669",
    colorBg: "#ECFDF5",
    rating: 5,
    tag: "Master Broadsheets",
  },
  {
    quote:
      "The automatic fee-gatekeeper completely solved our fee recovery issues. Parents settle tuition before the exam week because they know report cards and CBT tests lock automatically.",
    name: "Mr. Silvanus Segun",
    role: "School Administrator",
    school: "Jacktem Academic Excellence",
    location: "Sango Ota, Ogun",
    initials: "SS",
    color: "#1D4ED8",
    colorBg: "#EFF6FF",
    rating: 5,
    tag: "Zero Fee Debt",
  },
  {
    quote:
      "Parents were calling the office constantly asking for report cards. Since we launched the PIN portal and WhatsApp dispatches, those calls stopped completely. Parents check results securely on their phones.",
    name: "Mrs. Deborah Afolabi",
    role: "School Principal",
    school: "Power of Success Int'l School",
    location: "Lagos State",
    initials: "DA",
    color: "#D97706",
    colorBg: "#FEF3C7",
    rating: 5,
    tag: "WhatsApp Dispatches",
  },
  {
    quote:
      "Tracking fee payments used to be a nightmare of paper bank tellers and reconciliations. SchoolProfit gave us a clear digital ledger and instant receipts — term one collections improved significantly.",
    name: "Dr. Leonard John",
    role: "Proprietor & Director",
    school: "Dr. Raphael Arinze Memorial College",
    location: "Ukpor, Anambra",
    initials: "LJ",
    color: "#7C3AED",
    colorBg: "#F5F3FF",
    rating: 5,
    tag: "Bursary Ledger",
  },
  {
    quote:
      "The offline LAN CBT exam engine allowed us to conduct mid-term mock assessments for 400 students across 3 computer labs without relying on expensive campus internet.",
    name: "Mr. Benjamin John",
    role: "Academic Director",
    school: "Heart International School",
    location: "Sagamu, Ogun",
    initials: "BJ",
    color: "#059669",
    colorBg: "#ECFDF5",
    rating: 5,
    tag: "Hybrid CBT Lab",
  },
  {
    quote:
      "I was impressed by how smooth the onboarding was. The SchoolProfit team migrated our multi-year student records in one day and trained our teachers personally. Zero classroom disruption.",
    name: "Alh. Kabir Banuso",
    role: "Director of Education",
    school: "Borgu School of Excellence",
    location: "New Bussa, Niger",
    initials: "KB",
    color: "#DB2777",
    colorBg: "#FDF2F8",
    rating: 5,
    tag: "Rapid Migration",
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', gap: '3px' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={i < count ? "#D97706" : "#E2E8F0"}
          stroke={i < count ? "#D97706" : "#CBD5E1"}
          strokeWidth="1"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section id="testimonials" className="sp-testi-section">
      <style>{`
        .sp-testi-section {
          background-color: #FFFFFF;
          padding: 100px 0 110px;
          position: relative;
          overflow: hidden;
          border-top: 1px solid #E2E8F0;
        }

        .sp-testi-container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .sp-testi-header {
          text-align: center;
          max-width: 760px;
          margin: 0 auto 60px;
        }

        .sp-testi-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 999px;
          background: #ECFDF5;
          border: 1px solid #A7F3D0;
          color: #059669;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .sp-testi-title {
          font-size: clamp(28px, 3.8vw, 44px);
          font-weight: 800;
          color: #0A192F;
          line-height: 1.2;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
        }

        .sp-testi-title span {
          color: #D97706;
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .sp-testi-desc {
          font-size: 16px;
          line-height: 1.7;
          color: #64748B;
          margin: 0;
        }

        /* ── Testimonial Grid ── */
        .sp-testi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
        }

        @media (max-width: 1024px) {
          .sp-testi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .sp-testi-grid {
            grid-template-columns: 1fr;
          }
        }

        .sp-testi-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 20px;
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 16px rgba(10, 25, 47, 0.04);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .sp-testi-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 16px 36px rgba(10, 25, 47, 0.08);
          border-color: #CBD5E1;
        }

        .sp-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .sp-testi-tag {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
        }

        .sp-testi-quote {
          font-size: 14.5px;
          line-height: 1.65;
          color: #334155;
          margin-bottom: 24px;
          flex: 1;
          font-style: normal;
        }

        .sp-testi-author {
          display: flex;
          align-items: center;
          gap: 12px;
          border-top: 1px solid #F1F5F9;
          padding-top: 16px;
        }

        .sp-testi-avatar {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 14px;
          flex-shrink: 0;
        }

        .sp-author-details {
          display: flex;
          flex-direction: column;
        }

        .sp-author-name {
          font-size: 14px;
          font-weight: 800;
          color: #0A192F;
        }

        .sp-author-role {
          font-size: 12px;
          color: #64748B;
        }

        .sp-author-school {
          font-size: 11.5px;
          font-weight: 700;
          color: #059669;
        }
      `}</style>

      <div className="sp-testi-container">
        <div className="sp-testi-header">
          <div className="sp-testi-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Verified Administrator Feedback</span>
          </div>
          <h2 className="sp-testi-title">
            Loved by <span>Proprietors & Principals</span>
          </h2>
          <p className="sp-testi-desc">
            Real stories from school leaders who eliminated manual calculation errors and recovered lost tuition revenues.
          </p>
        </div>

        <div className="sp-testi-grid">
          {TESTIMONIALS.map((t, idx) => (
            <div key={idx} className="sp-testi-card">
              <div className="sp-card-head">
                <span className="sp-testi-tag" style={{ background: t.colorBg, color: t.color }}>
                  {t.tag}
                </span>
                <Stars count={t.rating} />
              </div>
              <p className="sp-testi-quote">"{t.quote}"</p>
              <div className="sp-testi-author">
                <div className="sp-testi-avatar" style={{ background: t.colorBg, color: t.color }}>
                  {t.initials}
                </div>
                <div className="sp-author-details">
                  <span className="sp-author-name">{t.name}</span>
                  <span className="sp-author-role">{t.role}</span>
                  <span className="sp-author-school">{t.school} · {t.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
