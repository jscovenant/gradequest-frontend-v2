import { Link } from 'react-router-dom';
import { usePlatformInfo } from '../../hooks/usePlatformInfo';

export default function Pricing() {
  const {
    whatsappLink,
    formattedBasicPrice,
    formattedStandardCbtPrice,
    annualSessionDiscountPercent,
  } = usePlatformInfo();

  const basicPrice = formattedBasicPrice || '₦300';
  const standardPrice = formattedStandardCbtPrice || '₦500';
  const discount = annualSessionDiscountPercent || 15;

  return (
    <section id="pricing" className="sp-pricing-section">
      <style>{`
        .sp-pricing-section {
          background-color: #F8FAFC;
          padding: 100px 0 110px;
          position: relative;
          overflow: hidden;
          border-top: 1px solid #E2E8F0;
        }

        .sp-pricing-container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .sp-pricing-header {
          text-align: center;
          max-width: 760px;
          margin: 0 auto 60px;
        }

        .sp-pricing-pill {
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

        .sp-pricing-title {
          font-size: clamp(28px, 3.8vw, 44px);
          font-weight: 800;
          color: #0A192F;
          line-height: 1.2;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
        }

        .sp-pricing-title span {
          color: #D97706;
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .sp-pricing-desc {
          font-size: 16px;
          line-height: 1.7;
          color: #64748B;
          margin: 0;
        }

        /* ── 3-Card Grid ── */
        .sp-pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
          align-items: stretch;
          margin-bottom: 48px;
        }

        @media (max-width: 1024px) {
          .sp-pricing-grid {
            grid-template-columns: 1fr;
            max-width: 500px;
            margin-left: auto;
            margin-right: auto;
          }
        }

        .sp-price-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 24px;
          padding: 36px 30px;
          display: flex;
          flex-direction: column;
          position: relative;
          box-shadow: 0 4px 20px rgba(10, 25, 47, 0.04);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .sp-price-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 16px 36px rgba(10, 25, 47, 0.08);
        }

        .sp-card-featured {
          border: 2px solid #D97706;
          box-shadow: 0 12px 36px rgba(217, 119, 6, 0.12);
          background: linear-gradient(180deg, #FFFFFF 0%, #FFFDF9 100%);
        }

        .sp-pop-badge {
          position: absolute;
          top: -14px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
          color: #FFFFFF;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 5px 16px;
          border-radius: 999px;
          box-shadow: 0 4px 12px rgba(217, 119, 6, 0.3);
          white-space: nowrap;
        }

        .sp-plan-name {
          font-size: 22px;
          font-weight: 800;
          color: #0A192F;
          margin-bottom: 8px;
        }

        .sp-plan-desc {
          font-size: 13.5px;
          color: #64748B;
          min-height: 42px;
          line-height: 1.5;
          margin-bottom: 24px;
        }

        .sp-price-tag-box {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 16px 20px;
          margin-bottom: 24px;
        }

        .sp-card-featured .sp-price-tag-box {
          background: #FEF3C7;
          border-color: #FDE68A;
        }

        .sp-price-num {
          font-size: 34px;
          font-weight: 800;
          color: #0A192F;
          line-height: 1;
        }

        .sp-card-featured .sp-price-num {
          color: #B45309;
        }

        .sp-price-period {
          font-size: 12.5px;
          font-weight: 700;
          color: #64748B;
          margin-top: 4px;
        }

        .sp-checklist {
          list-style: none;
          padding: 0;
          margin: 0 0 32px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
        }

        .sp-check-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13.5px;
          font-weight: 600;
          color: #1E293B;
          line-height: 1.4;
        }

        .sp-check-icon {
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
          margin-top: 2px;
        }

        .sp-btn-plan {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 20px;
          border-radius: 12px;
          font-size: 14.5px;
          font-weight: 800;
          text-decoration: none;
          transition: all 0.2s ease;
          width: 100%;
        }

        .sp-btn-navy {
          background: #0A192F;
          color: #FFFFFF;
        }

        .sp-btn-navy:hover {
          background: #1E3A8A;
          color: #FFFFFF;
          transform: translateY(-2px);
        }

        .sp-btn-gold {
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
          color: #FFFFFF;
          box-shadow: 0 6px 18px rgba(217, 119, 6, 0.3);
        }

        .sp-btn-gold:hover {
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
          color: #FFFFFF;
          box-shadow: 0 8px 24px rgba(217, 119, 6, 0.4);
          transform: translateY(-2px);
        }

        .sp-btn-outline {
          background: #FFFFFF;
          border: 1.5px solid #CBD5E1;
          color: #0A192F;
        }

        .sp-btn-outline:hover {
          background: #F8FAFC;
          border-color: #0A192F;
          color: #0A192F;
          transform: translateY(-2px);
        }

        /* ── Annual Discount Banner ── */
        .sp-annual-banner {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 100%);
          border-radius: 20px;
          padding: 28px 36px;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
          box-shadow: 0 10px 30px rgba(10, 25, 47, 0.12);
        }

        .sp-banner-text h4 {
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 4px;
          color: #FFFFFF;
        }

        .sp-banner-text p {
          font-size: 14px;
          color: #94A3B8;
          margin: 0;
        }

        .sp-banner-badge {
          background: #D97706;
          color: #FFFFFF;
          font-size: 13px;
          font-weight: 800;
          padding: 8px 20px;
          border-radius: 999px;
          white-space: nowrap;
        }
      `}</style>

      <div className="sp-pricing-container">
        <div className="sp-pricing-header">
          <div className="sp-pricing-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            <span>Simple, Transparent Pricing</span>
          </div>
          <h2 className="sp-pricing-title">
            Affordable Investment, <span>Unlimited Return</span>
          </h2>
          <p className="sp-pricing-desc">
            No expensive server setup fees. Pay term-by-term per enrolled student with all essential features included.
          </p>
        </div>

        {/* 3 Pricing Cards */}
        <div className="sp-pricing-grid">
          {/* Card 1: Basic Result Management */}
          <div className="sp-price-card">
            <h3 className="sp-plan-name">Basic Academic</h3>
            <p className="sp-plan-desc">For schools automating continuous assessment broadsheets and report card generation.</p>
            <div className="sp-price-tag-box">
              <div className="sp-price-num">{basicPrice}</div>
              <div className="sp-price-period">per student / academic term</div>
            </div>
            <ul className="sp-checklist">
              <li className="sp-check-item">
                <span className="sp-check-icon">✓</span>
                <span>Automated Master Broadsheets (PDF & Excel)</span>
              </li>
              <li className="sp-check-item">
                <span className="sp-check-icon">✓</span>
                <span>Terminal Student Report Card Generation</span>
              </li>
              <li className="sp-check-item">
                <span className="sp-check-icon">✓</span>
                <span>Scratch Card / PIN Result Portal</span>
              </li>
              <li className="sp-check-item">
                <span className="sp-check-icon">✓</span>
                <span>Cryptographic QR Verification Seals</span>
              </li>
              <li className="sp-check-item">
                <span className="sp-check-icon">✓</span>
                <span>Student Fee Tracking & Receipts</span>
              </li>
            </ul>
            <Link to="/signup" className="sp-btn-plan sp-btn-navy">
              <span>Get Started</span>
            </Link>
          </div>

          {/* Card 2: Standard CBT & AI (Featured) */}
          <div className="sp-price-card sp-card-featured">
            <div className="sp-pop-badge">⭐ Most Popular Plan</div>
            <h3 className="sp-plan-name">Standard CBT + AI</h3>
            <p className="sp-plan-desc">Complete digital campus with Computer Lab CBT examinations and AI lesson planning.</p>
            <div className="sp-price-tag-box">
              <div className="sp-price-num">{standardPrice}</div>
              <div className="sp-price-period">per student / academic term</div>
            </div>
            <ul className="sp-checklist">
              <li className="sp-check-item">
                <span className="sp-check-icon">✓</span>
                <span><strong>Everything in Basic Academic Plan</strong></span>
              </li>
              <li className="sp-check-item">
                <span className="sp-check-icon">✓</span>
                <span>Hybrid Online & Offline LAN CBT Exam Center</span>
              </li>
              <li className="sp-check-item">
                <span className="sp-check-icon">✓</span>
                <span>AI Teacher Lesson Planner & Notes Generator</span>
              </li>
              <li className="sp-check-item">
                <span className="sp-check-icon">✓</span>
                <span>Direct WhatsApp Dispatches (Results & Invoices)</span>
              </li>
              <li className="sp-check-item">
                <span className="sp-check-icon">✓</span>
                <span>Multi-Bank Online Fee Collection (Monnify / Paystack)</span>
              </li>
              <li className="sp-check-item">
                <span className="sp-check-icon">✓</span>
                <span>Priority Onboarding & Staff Training</span>
              </li>
            </ul>
            <Link to="/signup" className="sp-btn-plan sp-btn-gold">
              <span>Choose Standard CBT</span>
            </Link>
          </div>

          {/* Card 3: Custom Enterprise */}
          <div className="sp-price-card">
            <h3 className="sp-plan-name">Enterprise / Multi-Branch</h3>
            <p className="sp-plan-desc">For large multi-campus institutions requiring custom domains and dedicated servers.</p>
            <div className="sp-price-tag-box">
              <div className="sp-price-num">Custom</div>
              <div className="sp-price-period">tailored to your school branches</div>
            </div>
            <ul className="sp-checklist">
              <li className="sp-check-item">
                <span className="sp-check-icon">✓</span>
                <span><strong>Everything in Standard CBT Plan</strong></span>
              </li>
              <li className="sp-check-item">
                <span className="sp-check-icon">✓</span>
                <span>Dedicated Custom Domain (.com.ng / .sch.ng)</span>
              </li>
              <li className="sp-check-item">
                <span className="sp-check-icon">✓</span>
                <span>Multi-Campus Centralized Oversight Dashboard</span>
              </li>
              <li className="sp-check-item">
                <span className="sp-check-icon">✓</span>
                <span>Dedicated Account Manager & 24/7 Phone Support</span>
              </li>
              <li className="sp-check-item">
                <span className="sp-check-icon">✓</span>
                <span>Custom ERP & Accounting System Integrations</span>
              </li>
            </ul>
            <a
              href={whatsappLink('Hello SchoolProfit, I would like to discuss an Enterprise Multi-Branch deployment.')}
              target="_blank"
              rel="noreferrer"
              className="sp-btn-plan sp-btn-outline"
            >
              <span>Contact Enterprise Sales</span>
            </a>
          </div>
        </div>

        {/* Annual Session Discount Banner */}
        <div className="sp-annual-banner">
          <div className="sp-banner-text">
            <h4>Save {discount}% with Full Session Advance Payment</h4>
            <p>Pay for 3 academic terms upfront and enjoy a guaranteed discount plus free staff refresher training.</p>
          </div>
          <div className="sp-banner-badge">
            <span>{discount}% Session Discount</span>
          </div>
        </div>
      </div>
    </section>
  );
}
