import { useState, useEffect, useMemo } from 'react';
import { api } from '../../utils/api';

type School = {
  id?: number;
  name: string;
  tag: string;
  location: string;
  logo_url?: string | null;
  logo?: string | null;
};

const FALLBACK_REAL_SCHOOLS: School[] = [
  { name: 'DIKOR Comprehensive College', tag: 'Comprehensive College', location: 'Badagry, Lagos' },
  { name: 'Samjane Arise & Shine Schools', tag: 'Nursery, Primary & College', location: 'Badagry, Lagos' },
  { name: 'Sam Favour Schools', tag: 'Creche, Primary & College', location: 'Ikorodu, Lagos' },
  { name: 'Jacktem Academic Excellence', tag: 'Primary & Secondary', location: 'Sango Ota, Ogun' },
  { name: 'Power of Success Int\'l School', tag: 'Basic & Senior Secondary', location: 'Lagos' },
  { name: 'Gibraltar College', tag: 'Comprehensive College', location: 'Lagos' },
  { name: 'Heart International School', tag: 'Nursery, Primary & Secondary', location: 'Sagamu, Ogun' },
  { name: 'Anas Best Way to Success Academy', tag: 'Model Academy', location: 'Oka Akoko, Ondo' },
  { name: 'Legacy Institute of Health Technology', tag: 'Higher Institute & College', location: 'Kaduna' },
  { name: 'Christine Primary School', tag: 'Nursery & Primary', location: 'Badagry, Lagos' },
  { name: 'Learning Hills School', tag: 'Early Years & Secondary', location: 'Abeokuta, Ogun' },
  { name: 'Dr. Raphael Arinze Memorial College', tag: 'Comprehensive College', location: 'Ukpor, Anambra' },
  { name: 'Borgu School of Excellence', tag: 'Model Academy & College', location: 'New Bussa, Niger' },
  { name: 'Abec College', tag: 'Secondary College', location: 'Lagos' },
  { name: 'LCC College', tag: 'Comprehensive College', location: 'Lagos' },
  { name: 'Emmanuel International School', tag: 'Basic & Secondary', location: 'Lagos' },
  { name: 'DRAMTEC Academy', tag: 'Technical & Secondary', location: 'Anambra' },
];

function initials(name: string) {
  const words = name.trim().split(/\s+/);
  return words.length === 1
    ? words[0].slice(0, 2).toUpperCase()
    : (words[0][0] + words[1][0]).toUpperCase();
}

const PALETTE = [
  { bg: 'rgba(217, 119, 6, 0.12)', fg: '#B45309', border: 'rgba(217, 119, 6, 0.25)' },
  { bg: 'rgba(5, 150, 105, 0.12)', fg: '#047857', border: 'rgba(5, 150, 105, 0.25)' },
  { bg: 'rgba(29, 78, 216, 0.12)', fg: '#1E40AF', border: 'rgba(29, 78, 216, 0.25)' },
  { bg: 'rgba(124, 58, 237, 0.12)', fg: '#6D28D9', border: 'rgba(124, 58, 237, 0.25)' },
  { bg: 'rgba(219, 39, 119, 0.12)', fg: '#BE185D', border: 'rgba(219, 39, 119, 0.25)' },
];

function SchoolPill({ school, index }: { school: School; index: number }) {
  const [imgError, setImgError] = useState(false);
  const color = PALETTE[index % PALETTE.length];
  const logoSrc = (!imgError && (school.logo_url || school.logo)) ? (school.logo_url || school.logo) : null;

  return (
    <div className="sp-school-pill">
      {logoSrc ? (
        <div className="sp-school-logo-wrap">
          <img
            src={logoSrc}
            alt={school.name}
            className="sp-school-logo-img"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <span className="sp-school-mono" style={{ background: color.bg, color: color.fg, border: `1px solid ${color.border}` }}>
          {initials(school.name)}
        </span>
      )}
      <div className="sp-school-details">
        <span className="sp-school-name">{school.name}</span>
        <span className="sp-school-type">{school.tag}</span>
      </div>
      <span className="sp-school-loc">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
        const res = await api.get('/frontend/active-schools');
        if (res.data?.status && Array.isArray(res.data?.data) && res.data.data.length > 0) {
          setSchools(res.data.data);
        }
      } catch {
        // Fallback initialized
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
    <section id="schools" className="sp-schools-section">
      <style>{`
        .sp-schools-section {
          background-color: #FFFFFF;
          padding: 100px 0 110px;
          position: relative;
          overflow: hidden;
          border-top: 1px solid #E2E8F0;
        }

        .sp-schools-container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .sp-schools-header {
          text-align: center;
          max-width: 760px;
          margin: 0 auto 48px;
        }

        .sp-schools-pill {
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

        .sp-schools-title {
          font-size: clamp(28px, 3.8vw, 44px);
          font-weight: 800;
          color: #0A192F;
          line-height: 1.2;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
        }

        .sp-schools-title span {
          color: #D97706;
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .sp-schools-desc {
          font-size: 16px;
          line-height: 1.7;
          color: #64748B;
          margin: 0;
        }

        /* ── Metrics Strip ── */
        .sp-metrics-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 32px;
          flex-wrap: wrap;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 999px;
          padding: 14px 36px;
          margin: 0 auto 56px;
          max-width: fit-content;
          box-shadow: 0 2px 10px rgba(10, 25, 47, 0.04);
        }

        @media (max-width: 768px) {
          .sp-metrics-bar {
            border-radius: 16px;
            gap: 16px;
            padding: 16px 20px;
          }
        }

        .sp-metric-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          font-weight: 700;
          color: #0A192F;
        }

        .sp-metric-dot {
          color: #059669;
        }

        /* ── Marquee ── */
        .sp-marquee-wrapper {
          position: relative;
          overflow: hidden;
          padding: 8px 0;
        }

        .sp-marquee-wrapper::before,
        .sp-marquee-wrapper::after {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          width: 140px;
          z-index: 2;
          pointer-events: none;
        }

        .sp-marquee-wrapper::before {
          left: 0;
          background: linear-gradient(90deg, #FFFFFF 0%, transparent 100%);
        }

        .sp-marquee-wrapper::after {
          right: 0;
          background: linear-gradient(270deg, #FFFFFF 0%, transparent 100%);
        }

        .sp-marquee-track {
          display: flex;
          gap: 18px;
          width: max-content;
          will-change: transform;
        }

        .sp-marquee-left {
          animation: spMarqueeLeft 45s linear infinite;
        }

        .sp-marquee-right {
          animation: spMarqueeRight 50s linear infinite;
        }

        .sp-marquee-wrapper:hover .sp-marquee-track {
          animation-play-state: paused;
        }

        @keyframes spMarqueeLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        @keyframes spMarqueeRight {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }

        /* ── Pill Card ── */
        .sp-school-pill {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 18px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          box-shadow: 0 2px 8px rgba(10, 25, 47, 0.04);
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .sp-school-pill:hover {
          border-color: #CBD5E1;
          box-shadow: 0 6px 16px rgba(10, 25, 47, 0.08);
          transform: translateY(-2px);
        }

        .sp-school-logo-wrap {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }

        .sp-school-logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .sp-school-mono {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 13px;
          flex-shrink: 0;
        }

        .sp-school-details {
          display: flex;
          flex-direction: column;
        }

        .sp-school-name {
          font-size: 13.5px;
          font-weight: 800;
          color: #0A192F;
        }

        .sp-school-type {
          font-size: 11px;
          font-weight: 600;
          color: #64748B;
        }

        .sp-school-loc {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11.5px;
          font-weight: 700;
          color: #059669;
          background: #ECFDF5;
          padding: 4px 8px;
          border-radius: 6px;
          margin-left: 8px;
        }
      `}</style>

      <div className="sp-schools-container">
        <div className="sp-schools-header">
          <div className="sp-schools-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Verified Educational Institutions</span>
          </div>
          <h2 className="sp-schools-title">
            Trusted by <span>500+ Leading Schools</span> Across Nigeria
          </h2>
          <p className="sp-schools-desc">
            Empowering nursery, primary, and secondary colleges nationwide with seamless academic automation and zero fee defaults.
          </p>
        </div>

        {/* Key Metrics Bar */}
        <div className="sp-metrics-bar">
          <div className="sp-metric-item">
            <span className="sp-metric-dot">●</span>
            <span>50,000+ Students Managed</span>
          </div>
          <div className="sp-metric-item">
            <span className="sp-metric-dot">●</span>
            <span>₦250M+ Fees Recovered</span>
          </div>
          <div className="sp-metric-item">
            <span className="sp-metric-dot">●</span>
            <span>99.9% Platform Uptime</span>
          </div>
          <div className="sp-metric-item">
            <span className="sp-metric-dot">●</span>
            <span>36 States Covered</span>
          </div>
        </div>
      </div>

      {/* Marquee Ticker Row 1 */}
      <div className="sp-marquee-wrapper mb-3">
        <div className="sp-marquee-track sp-marquee-left">
          {rowA.map((s, idx) => (
            <SchoolPill key={idx} school={s} index={idx} />
          ))}
        </div>
      </div>

      {/* Marquee Ticker Row 2 */}
      <div className="sp-marquee-wrapper">
        <div className="sp-marquee-track sp-marquee-right">
          {rowB.map((s, idx) => (
            <SchoolPill key={idx} school={s} index={idx + 2} />
          ))}
        </div>
      </div>
    </section>
  );
}
