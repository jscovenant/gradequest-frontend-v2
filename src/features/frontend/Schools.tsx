import { useState, useEffect, useMemo } from "react";
import { api } from "../../utils/api";

type School = { name: string; tag: string; location: string };

const FALLBACK_REAL_SCHOOLS: School[] = [
  { name: "DIKOR Comprehensive College", tag: "Comprehensive College", location: "Badagry, Lagos" },
  { name: "Samjane Arise & Shine Schools", tag: "Nursery, Primary & College", location: "Badagry, Lagos" },
  { name: "Sam Favour Schools", tag: "Creche, Primary & College", location: "Ikorodu, Lagos" },
  { name: "Jacktem Academic Excellence", tag: "Primary & Secondary", location: "Sango Ota, Ogun" },
  { name: "Power of Success Int'l School", tag: "Basic & Senior Secondary", location: "Lagos" },
  { name: "Gibraltar College", tag: "Comprehensive College", location: "Lagos" },
  { name: "Heart International School", tag: "Nursery, Primary & Secondary", location: "Sagamu, Ogun" },
  { name: "Anas Best Way to Success Academy", tag: "Model Academy", location: "Oka Akoko, Ondo" },
  { name: "Legacy Institute of Health Technology", tag: "Higher Institute & College", location: "Kaduna" },
  { name: "Christine Primary School", tag: "Nursery & Primary", location: "Badagry, Lagos" },
  { name: "Learning Hills School", tag: "Early Years & Secondary", location: "Abeokuta, Ogun" },
  { name: "Dr. Raphael Arinze Memorial College", tag: "Comprehensive College", location: "Ukpor, Anambra" },
  { name: "Borgu School of Excellence", tag: "Model Academy & College", location: "New Bussa, Niger" },
  { name: "Abec College", tag: "Secondary College", location: "Lagos" },
  { name: "LCC College", tag: "Comprehensive College", location: "Lagos" },
  { name: "Emmanuel International School", tag: "Basic & Secondary", location: "Lagos" },
  { name: "DRAMTEC Academy", tag: "Technical & Secondary", location: "Anambra" },
];

function initials(name: string) {
  const words = name.trim().split(/\s+/);
  return words.length === 1
    ? words[0].slice(0, 2).toUpperCase()
    : (words[0][0] + words[1][0]).toUpperCase();
}

const PALETTE = [
  { bg: "rgba(217, 119, 6, 0.12)", fg: "#B45309", border: "rgba(217, 119, 6, 0.25)" },
  { bg: "rgba(5, 150, 105, 0.12)", fg: "#047857", border: "rgba(5, 150, 105, 0.25)" },
  { bg: "rgba(29, 78, 216, 0.12)", fg: "#1E40AF", border: "rgba(29, 78, 216, 0.25)" },
  { bg: "rgba(124, 58, 237, 0.12)", fg: "#6D28D9", border: "rgba(124, 58, 237, 0.25)" },
  { bg: "rgba(219, 39, 119, 0.12)", fg: "#BE185D", border: "rgba(219, 39, 119, 0.25)" },
];

function SchoolPill({ school, index }: { school: School; index: number }) {
  const color = PALETTE[index % PALETTE.length];
  return (
    <div className="gq-school-pill">
      <span className="gq-sp-mono" style={{ background: color.bg, color: color.fg, border: `1px solid ${color.border}` }}>
        {initials(school.name)}
      </span>
      <div className="gq-sp-content">
        <span className="gq-sp-name">{school.name}</span>
        <span className="gq-sp-tag">{school.tag}</span>
      </div>
      <span className="gq-sp-loc">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        {school.location}
      </span>
    </div>
  );
}

export default function Schools() {
  const [schools, setSchools] = useState<School[]>(FALLBACK_REAL_SCHOOLS);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const res = await api.get("/frontend/active-schools");
        if (res.data?.status && Array.isArray(res.data?.data) && res.data.data.length > 0) {
          setSchools(res.data.data);
        }
      } catch {
        // Fallback already pre-set to real database institutions
      }
    };
    fetchSchools();
  }, []);

  const mid = Math.ceil(schools.length / 2);
  const firstHalf = schools.slice(0, mid);
  const secondHalf = schools.slice(mid);

  const rowA = useMemo(() => [...firstHalf, ...firstHalf, ...firstHalf, ...firstHalf], [firstHalf]);
  const rowB = useMemo(() => [...secondHalf, ...secondHalf, ...secondHalf, ...secondHalf], [secondHalf]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,800;1,600&display=swap');

        .gq-schools-section {
          background-color: #FFFFFF;
          padding: 88px 0 96px;
          position: relative;
          overflow: hidden;
          font-family: 'Plus Jakarta Sans', sans-serif;
          border-top: 1px solid #E2E8F0;
        }

        .gq-schools-kicker {
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
          border-radius: 100px;
          padding: 5px 16px;
          margin-bottom: 20px;
        }

        .gq-schools-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(28px, 3.4vw, 44px);
          font-weight: 800;
          color: #0F2744;
          line-height: 1.2;
          margin-bottom: 20px;
        }

        .gq-schools-title em {
          font-style: italic;
          color: #D97706;
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .gq-schools-subtitle {
          font-size: 15.5px;
          color: #475569;
          max-width: 540px;
          margin: 0 auto 36px;
        }

        .gq-schools-meta-bar {
          display: inline-flex;
          align-items: center;
          gap: 24px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 999px;
          padding: 12px 28px;
          margin-bottom: 60px;
          box-shadow: 0 2px 10px rgba(15, 39, 68, 0.04);
        }

        @media (max-width: 768px) {
          .gq-schools-meta-bar {
            display: flex;
            flex-direction: column;
            border-radius: 16px;
            gap: 10px;
          }
        }

        .gq-meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #1E293B;
          font-weight: 600;
        }

        .gq-meta-dot {
          color: #059669;
        }

        /* ── Marquee Track ── */
        .gq-marquee-track {
          display: flex;
          gap: 16px;
          width: max-content;
          will-change: transform;
        }

        .gq-marquee-left {
          animation: gqMarqueeLeft 40s linear infinite;
        }

        .gq-marquee-right {
          animation: gqMarqueeRight 44s linear infinite;
        }

        .gq-marquee-wrapper:hover .gq-marquee-track {
          animation-play-state: paused;
        }

        @keyframes gqMarqueeLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        @keyframes gqMarqueeRight {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }

        .gq-marquee-fade {
          position: relative;
          overflow: hidden;
          padding: 8px 0;
        }

        .gq-marquee-fade::before,
        .gq-marquee-fade::after {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          width: 120px;
          z-index: 2;
          pointer-events: none;
        }

        .gq-marquee-fade::before {
          left: 0;
          background: linear-gradient(90deg, #FFFFFF 0%, transparent 100%);
        }

        .gq-marquee-fade::after {
          right: 0;
          background: linear-gradient(270deg, #FFFFFF 0%, transparent 100%);
        }

        /* ── Pill Card ── */
        .gq-school-pill {
          display: flex;
          align-items: center;
          gap: 14px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 12px 18px;
          transition: all 0.25s ease;
          user-select: none;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(15, 39, 68, 0.04);
        }

        .gq-school-pill:hover {
          background: #F8FAFC;
          border-color: rgba(217, 119, 6, 0.45);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(15, 39, 68, 0.08);
        }

        .gq-sp-mono {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .gq-sp-content {
          display: flex;
          flex-direction: column;
        }

        .gq-sp-name {
          font-size: 14px;
          font-weight: 700;
          color: #0F2744;
        }

        .gq-sp-tag {
          font-size: 11px;
          color: #64748B;
          font-weight: 500;
        }

        .gq-sp-loc {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 6px;
          background: #F1F5F9;
          font-size: 11px;
          font-weight: 600;
          color: #1D4ED8;
          margin-left: 8px;
        }
      `}</style>

      <section id="schools" className="gq-schools-section gq-scroll-reveal">
        <div className="container-xl text-center">
          <div className="gq-schools-kicker">
            <span>🏫</span> Active Partner Institutions
          </div>

          <h2 className="gq-schools-title">
            Powering Leading <em>Academies, Colleges & International School Groups</em>
          </h2>

          <p className="gq-schools-subtitle">
            Progressive private and international institutions operating their academic broadsheets, fees collection, and CBT assessments on SchoolProfit.
          </p>

          <div className="gq-schools-meta-bar">
            <div className="gq-meta-item">
              <span className="gq-meta-dot">●</span> Verified Active Schools
            </div>
            <div className="gq-meta-item">
              <span className="gq-meta-dot">●</span> Multi-Campus & Regional Deployments
            </div>
            <div className="gq-meta-item">
              <span className="gq-meta-dot">●</span> Early Years to Senior Secondary
            </div>
            <div className="gq-meta-item">
              <span className="gq-meta-dot">●</span> 100% Data Protection
            </div>
          </div>
        </div>

        {/* Marquee Row 1 */}
        <div className="gq-marquee-wrapper gq-marquee-fade mb-3">
          <div className="gq-marquee-track gq-marquee-left">
            {rowA.map((s, i) => (
              <SchoolPill key={`a-${i}`} school={s} index={i} />
            ))}
          </div>
        </div>

        {/* Marquee Row 2 */}
        <div className="gq-marquee-wrapper gq-marquee-fade">
          <div className="gq-marquee-track gq-marquee-right">
            {rowB.map((s, i) => (
              <SchoolPill key={`b-${i}`} school={s} index={i + 7} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
