import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlatformInfo } from '../../hooks/usePlatformInfo';

export default function SchoolProfitCalculator() {
  const { whatsappLink, standardCbtTierPrice } = usePlatformInfo();
  
  // Interactive Slider States
  const [studentCount, setStudentCount] = useState<number>(300);
  const [avgTuition, setAvgTuition] = useState<number>(65000);
  const [parentLevy, setParentLevy] = useState<number>(1500);

  // Platform unit fee assumption dynamically pulled from DB (defaults to ₦500)
  const platformUnitCost = standardCbtTierPrice || 500;

  // 1. Exam & Paper Printing Savings (Estimated at ₦1,000 per student per term for test question papers, colored result cards, typing)
  const printingSavings = studentCount * 1000;

  // 2. Result PIN / ICT Levy Profit (Parent pays e.g. ₦1,500, School pays ₦500 to platform -> School earns ₦1,000 margin per student)
  const pinProfitPerStudent = Math.max(0, parentLevy - platformUnitCost);
  const totalPinProfit = studentCount * pinProfitPerStudent;

  // 3. Unpaid Debt Recovery (Estimated ~5% to 8% of total student fees recovered through automated exam and result card gatekeepers)
  const recoveredDebts = Math.round(studentCount * avgTuition * 0.045);

  // Total Termly Financial Gain
  const totalTermGain = printingSavings + totalPinProfit + recoveredDebts;
  const annualSessionGain = totalTermGain * 3;

  const formatNaira = (amount: number) => {
    return '₦' + amount.toLocaleString('en-NG');
  };

  return (
    <section id="calculator" className="sp-calc-section">
      <style>{`
        .sp-calc-section {
          background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%);
          padding: 100px 0 110px;
          position: relative;
          overflow: hidden;
          border-top: 1px solid #E2E8F0;
        }

        .sp-calc-container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .sp-calc-header {
          text-align: center;
          max-width: 820px;
          margin: 0 auto 56px;
        }

        .sp-calc-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 18px;
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

        .sp-proprietor-badge {
          display: inline-block;
          background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
          border: 1.5px solid #F59E0B;
          color: #92400E;
          font-size: 13.5px;
          font-weight: 800;
          padding: 8px 20px;
          border-radius: 999px;
          margin-bottom: 20px;
          box-shadow: 0 4px 14px rgba(217, 119, 6, 0.15);
        }

        .sp-calc-title {
          font-size: clamp(28px, 3.8vw, 44px);
          font-weight: 800;
          color: #0A192F;
          line-height: 1.2;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
        }

        .sp-calc-title span {
          color: #D97706;
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .sp-calc-desc {
          font-size: 16px;
          line-height: 1.7;
          color: #64748B;
          margin: 0;
        }

        /* ── Main Calculator Grid ── */
        .sp-calc-grid {
          display: grid;
          grid-template-columns: 1fr 1.25fr;
          gap: 40px;
          align-items: stretch;
        }

        @media (max-width: 1024px) {
          .sp-calc-grid {
            grid-template-columns: 1fr;
          }
        }

        /* ── Left Interactive Controls ── */
        .sp-calc-controls-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 24px;
          padding: 36px 32px;
          box-shadow: 0 10px 30px rgba(10, 25, 47, 0.04);
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .sp-ctrl-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .sp-ctrl-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sp-ctrl-label {
          font-size: 14px;
          font-weight: 800;
          color: #0A192F;
        }

        .sp-ctrl-val-badge {
          background: #0A192F;
          color: #FFFFFF;
          font-size: 14px;
          font-weight: 800;
          padding: 4px 14px;
          border-radius: 8px;
          font-family: monospace;
        }

        .sp-range-slider {
          width: 100%;
          height: 8px;
          border-radius: 5px;
          background: #E2E8F0;
          outline: none;
          -webkit-appearance: none;
          cursor: pointer;
        }

        .sp-range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #D97706;
          cursor: pointer;
          border: 3px solid #FFFFFF;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          transition: transform 0.15s ease;
        }

        .sp-range-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }

        .sp-preset-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .sp-preset-btn {
          background: #F8FAFC;
          border: 1px solid #CBD5E1;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12.5px;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sp-preset-btn.active {
          background: #FEF3C7;
          border-color: #F59E0B;
          color: #B45309;
        }

        /* ── Right Results Display ── */
        .sp-calc-results-card {
          background: #0A192F;
          border-radius: 24px;
          padding: 36px 32px;
          color: #FFFFFF;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 16px 40px rgba(10, 25, 47, 0.18);
          position: relative;
          overflow: hidden;
        }

        .sp-calc-results-card::before {
          content: '';
          position: absolute;
          top: -50px;
          right: -50px;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.2) 0%, transparent 70%);
          pointer-events: none;
        }

        .sp-result-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 28px;
        }

        @media (max-width: 640px) {
          .sp-result-cards-grid {
            grid-template-columns: 1fr;
          }
        }

        .sp-mini-res-card {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 16px 14px;
          display: flex;
          flex-direction: column;
        }

        .sp-mrc-title {
          font-size: 11.5px;
          font-weight: 700;
          color: #94A3B8;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .sp-mrc-val {
          font-size: 19px;
          font-weight: 800;
          color: #FCD34D;
          margin-bottom: 6px;
        }

        .sp-mrc-desc {
          font-size: 11px;
          line-height: 1.4;
          color: #CBD5E1;
        }

        /* ── Big Total Strip ── */
        .sp-total-strip {
          background: linear-gradient(135deg, rgba(217, 119, 6, 0.25) 0%, rgba(5, 150, 105, 0.25) 100%);
          border: 1.5px solid rgba(245, 158, 11, 0.4);
          border-radius: 18px;
          padding: 24px;
          margin-bottom: 24px;
          text-align: center;
        }

        .sp-total-label {
          font-size: 13px;
          font-weight: 800;
          color: #CBD5E1;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 6px;
        }

        .sp-total-num {
          font-size: clamp(32px, 4vw, 46px);
          font-weight: 900;
          color: #FFFFFF;
          line-height: 1;
          margin-bottom: 6px;
        }

        .sp-annual-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          font-weight: 700;
          color: #34D399;
          background: rgba(5, 150, 105, 0.2);
          padding: 4px 12px;
          border-radius: 999px;
        }

        .sp-calc-actions {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .sp-btn-calc-signup {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
          color: #FFFFFF;
          padding: 14px 20px;
          border-radius: 12px;
          font-size: 14.5px;
          font-weight: 800;
          text-decoration: none;
          transition: all 0.2s ease;
          box-shadow: 0 6px 18px rgba(217, 119, 6, 0.4);
        }

        .sp-btn-calc-signup:hover {
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
          color: #FFFFFF;
          transform: translateY(-2px);
        }

        .sp-btn-calc-demo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.1);
          color: #FFFFFF;
          padding: 14px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s ease;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .sp-btn-calc-demo:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #FFFFFF;
        }
      `}</style>

      <div className="sp-calc-container">
        <div className="sp-calc-header">
          <div className="sp-calc-kicker">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span>Proprietor Revenue & ROI Simulator</span>
          </div>

          <div className="sp-proprietor-badge">
            🚀 Designed to turn your school's IT from an operational headache into a profitable revenue engine.
          </div>

          <h2 className="sp-calc-title">
            Calculate Your School's Projected <span>Profit & Termly Savings</span>
          </h2>
          <p className="sp-calc-desc">
            Drag the sliders below to match your school's enrollment and term tuition. See the immediate financial returns SchoolProfit generates for your institution every academic term.
          </p>
        </div>

        <div className="sp-calc-grid">
          {/* Controls */}
          <div className="sp-calc-controls-card">
            {/* 1. Student Enrollment Slider */}
            <div className="sp-ctrl-group">
              <div className="sp-ctrl-label-row">
                <span className="sp-ctrl-label">Total Enrolled Students:</span>
                <span className="sp-ctrl-val-badge">{studentCount} Students</span>
              </div>
              <input
                type="range"
                min={50}
                max={1500}
                step={25}
                value={studentCount}
                onChange={(e) => setStudentCount(Number(e.target.value))}
                className="sp-range-slider"
              />
              <div className="sp-preset-pills">
                {[150, 300, 500, 800, 1200].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setStudentCount(count)}
                    className={`sp-preset-btn ${studentCount === count ? 'active' : ''}`}
                  >
                    {count} Students
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Average Term Tuition Slider */}
            <div className="sp-ctrl-group">
              <div className="sp-ctrl-label-row">
                <span className="sp-ctrl-label">Average Tuition Fee / Term:</span>
                <span className="sp-ctrl-val-badge">{formatNaira(avgTuition)}</span>
              </div>
              <input
                type="range"
                min={20000}
                max={250000}
                step={5000}
                value={avgTuition}
                onChange={(e) => setAvgTuition(Number(e.target.value))}
                className="sp-range-slider"
              />
              <div className="sp-preset-pills">
                {[35000, 65000, 100000, 180000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAvgTuition(amt)}
                    className={`sp-preset-btn ${avgTuition === amt ? 'active' : ''}`}
                  >
                    {formatNaira(amt)}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Parent Result PIN / Portal Levy */}
            <div className="sp-ctrl-group">
              <div className="sp-ctrl-label-row">
                <span className="sp-ctrl-label">Result PIN / ICT Levy Charged to Parents:</span>
                <span className="sp-ctrl-val-badge">{formatNaira(parentLevy)}</span>
              </div>
              <input
                type="range"
                min={500}
                max={3000}
                step={250}
                value={parentLevy}
                onChange={(e) => setParentLevy(Number(e.target.value))}
                className="sp-range-slider"
              />
              <div className="sp-preset-pills">
                {[1000, 1500, 2000, 2500].map((levy) => (
                  <button
                    key={levy}
                    type="button"
                    onClick={() => setParentLevy(levy)}
                    className={`sp-preset-btn ${parentLevy === levy ? 'active' : ''}`}
                  >
                    {formatNaira(levy)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Card */}
          <div className="sp-calc-results-card">
            <div>
              <div className="sp-result-cards-grid">
                {/* Metric 1 */}
                <div className="sp-mini-res-card">
                  <div className="sp-mrc-title">1. Exam & Paper Savings</div>
                  <div className="sp-mrc-val">{formatNaira(printingSavings)}</div>
                  <div className="sp-mrc-desc">Eliminates paper question printing, toner, photocopies & colored card booklets.</div>
                </div>

                {/* Metric 2 */}
                <div className="sp-mini-res-card">
                  <div className="sp-mrc-title">2. Result PIN Net Profit</div>
                  <div className="sp-mrc-val">{formatNaira(totalPinProfit)}</div>
                  <div className="sp-mrc-desc">Surplus revenue kept by school from parent digital result PIN levies.</div>
                </div>

                {/* Metric 3 */}
                <div className="sp-mini-res-card">
                  <div className="sp-mrc-title">3. Unpaid Debt Recovery</div>
                  <div className="sp-mrc-val">{formatNaira(recoveredDebts)}</div>
                  <div className="sp-mrc-desc">Recovered from fee-locks on exams and report cards that stop runaway debtor parents.</div>
                </div>
              </div>

              {/* Big Highlight Box */}
              <div className="sp-total-strip">
                <div className="sp-total-label">Total Projected Financial Gain to Your School</div>
                <div className="sp-total-num">{formatNaira(totalTermGain)} <span style={{ fontSize: '18px', fontWeight: 600, color: '#FCD34D' }}>/ term</span></div>
                <div className="sp-annual-pill">
                  <span>✦ Over {formatNaira(annualSessionGain)} per full academic session (3 terms)</span>
                </div>
              </div>
            </div>

            <div className="sp-calc-actions">
              <Link to="/signup" className="sp-btn-calc-signup">
                <span>Start Capturing Your Profit →</span>
              </Link>
              <a
                href={whatsappLink(`Hello SchoolProfit, I simulated my school with ${studentCount} students and would like to start capturing the projected ${formatNaira(totalTermGain)} termly profit.`)}
                target="_blank"
                rel="noreferrer"
                className="sp-btn-calc-demo"
              >
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
