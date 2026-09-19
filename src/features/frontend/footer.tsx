import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlatformInfo } from '../../hooks/usePlatformInfo';
import { api } from '../../utils/api';

export default function Footer() {
  const { whatsappLink, platform } = usePlatformInfo();
  const year = new Date().getFullYear();
  const term1Rate = platform.sales_partner_term_1_commission || 30;

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [newsletterMessage, setNewsletterMessage] = useState('');
  const [newsletterError, setNewsletterError] = useState('');

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterError('');
    const trimmed = newsletterEmail.trim();
    if (!trimmed) {
      setNewsletterError('Please enter your email.');
      return;
    }

    setNewsletterSubmitting(true);
    try {
      const response = await api.post('/frontend/newsletter-subscribe', {
        email: trimmed,
        source: 'homepage_footer',
      });

      setNewsletterSuccess(true);
      setNewsletterMessage(response.data?.message || 'Subscribed successfully! Thank you for staying connected.');
      setNewsletterEmail('');
      setTimeout(() => {
        setNewsletterSuccess(false);
        setNewsletterMessage('');
      }, 7000);
    } catch (err: any) {
      setNewsletterError(err?.response?.data?.message || 'Subscription failed. Please check your email and try again.');
    } finally {
      setNewsletterSubmitting(false);
    }
  };

  return (
    <footer className="sp-footer">
      <style>{`
        .sp-footer {
          background-color: #0A192F;
          color: #94A3B8;
          padding: 80px 0 40px;
          position: relative;
          overflow: hidden;
          font-family: inherit;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .sp-footer-container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* ── Partner Banner Strip ── */
        .sp-footer-partner-strip {
          background: linear-gradient(135deg, #0F2744 0%, #1E3A8A 100%);
          border: 1px solid rgba(217, 119, 6, 0.3);
          border-radius: 20px;
          padding: 28px 36px;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
          margin-bottom: 64px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .sp-fps-text h4 {
          font-size: 18px;
          font-weight: 800;
          color: #FFFFFF;
          margin-bottom: 4px;
        }

        .sp-fps-text p {
          font-size: 14px;
          color: #CBD5E1;
          margin: 0;
        }

        .sp-btn-partner {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
          color: #FFFFFF;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 800;
          text-decoration: none;
          white-space: nowrap;
          transition: transform 0.2s ease;
        }

        .sp-btn-partner:hover {
          color: #FFFFFF;
          transform: translateY(-2px);
        }

        /* ── Main Footer Columns ── */
        .sp-footer-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1.3fr;
          gap: 48px;
          margin-bottom: 60px;
        }

        @media (max-width: 1024px) {
          .sp-footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 36px;
          }
        }

        @media (max-width: 640px) {
          .sp-footer-grid {
            grid-template-columns: 1fr;
            gap: 32px;
          }
        }

        .sp-foot-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          margin-bottom: 16px;
        }

        .sp-foot-logo-badge {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, #0F2744 0%, #1E3A8A 100%);
          border: 1px solid rgba(217, 119, 6, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sp-foot-brand-name {
          font-size: 20px;
          font-weight: 800;
          color: #FFFFFF;
        }

        .sp-foot-brand-name span {
          color: #D97706;
        }

        .sp-foot-about {
          font-size: 14px;
          line-height: 1.65;
          color: #94A3B8;
          margin-bottom: 20px;
        }

        .sp-foot-socials {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sp-social-btn {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #CBD5E1;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .sp-social-btn:hover {
          background: #D97706;
          color: #FFFFFF;
          border-color: #D97706;
          transform: translateY(-2px);
        }

        .sp-foot-col-title {
          font-size: 15px;
          font-weight: 800;
          color: #FFFFFF;
          margin-bottom: 18px;
          letter-spacing: 0.02em;
        }

        .sp-foot-links {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .sp-foot-link-item a {
          font-size: 14px;
          color: #94A3B8;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .sp-foot-link-item a:hover {
          color: #F59E0B;
        }

        /* ── Newsletter Form ── */
        .sp-nl-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .sp-nl-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.06);
          color: #FFFFFF;
          font-size: 13.5px;
          outline: none;
        }

        .sp-nl-input:focus {
          border-color: #D97706;
          background: rgba(255, 255, 255, 0.1);
        }

        .sp-nl-btn {
          background: #D97706;
          color: #FFFFFF;
          border: none;
          padding: 12px 18px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .sp-nl-btn:hover {
          background: #B45309;
        }

        .sp-nl-msg {
          font-size: 12.5px;
          color: #10B981;
        }

        .sp-nl-err {
          font-size: 12.5px;
          color: #EF4444;
        }

        /* ── Bottom Bar ── */
        .sp-footer-bottom {
          padding-top: 32px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 13px;
          color: #64748B;
        }

        .sp-foot-legal {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .sp-foot-legal a {
          color: #64748B;
          text-decoration: none;
        }

        .sp-foot-legal a:hover {
          color: #CBD5E1;
        }
      `}</style>

      <div className="sp-footer-container">
        {/* Partner Referral Strip */}
        <div className="sp-footer-partner-strip">
          <div className="sp-fps-text">
            <h4>Become an Official SchoolProfit Sales Partner</h4>
            <p>Earn {term1Rate}% upfront commission per enrolled school + 12% recurring annual retention.</p>
          </div>
          <Link to="/sales-representative/register" className="sp-btn-partner">
            <span>Register as Partner →</span>
          </Link>
        </div>

        {/* Columns */}
        <div className="sp-footer-grid">
          {/* Col 1: Brand */}
          <div>
            <Link to="/" className="sp-foot-brand">
              <div className="sp-foot-logo-badge">
                <img src="/images/logo/logo-icon.png" alt="SchoolProfit" width="22" height="22" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
              </div>
              <span className="sp-foot-brand-name">
                School<span>Profit</span>
              </span>
            </Link>
            <p className="sp-foot-about">
              The complete institutional management operating system for Nigerian primary and secondary schools. Zero fee debt, rapid master broadsheets, and hybrid CBT testing.
            </p>
            <div className="sp-foot-socials">
              <a href="https://web.facebook.com/profile.php?id=61585446674333" target="_blank" rel="noreferrer" className="sp-social-btn" aria-label="Facebook">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3V2z" />
                </svg>
              </a>
              <a href={whatsappLink('Hello SchoolProfit team,')} target="_blank" rel="noreferrer" className="sp-social-btn" aria-label="WhatsApp">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Col 2: Product & Modules */}
          <div>
            <h4 className="sp-foot-col-title">Product & Modules</h4>
            <ul className="sp-foot-links">
              <li className="sp-foot-link-item"><a href="#why-schoolprofit">Why SchoolProfit</a></li>
              <li className="sp-foot-link-item"><a href="#features">Master Broadsheets</a></li>
              <li className="sp-foot-link-item"><a href="#features">Hybrid CBT Testing</a></li>
              <li className="sp-foot-link-item"><a href="#features">Fee Ledgers & Bursary</a></li>
              <li className="sp-foot-link-item"><a href="#features">WhatsApp Dispatches</a></li>
              <li className="sp-foot-link-item"><a href="#features">Custom School Websites</a></li>
            </ul>
          </div>

          {/* Col 3: Company & Trust */}
          <div>
            <h4 className="sp-foot-col-title">Institution & Trust</h4>
            <ul className="sp-foot-links">
              <li className="sp-foot-link-item"><a href="#schools">Our Partner Schools</a></li>
              <li className="sp-foot-link-item"><a href="#faq">Pricing & Billing FAQ</a></li>
              <li className="sp-foot-link-item"><a href="#testimonials">Testimonials</a></li>
              <li className="sp-foot-link-item"><a href="#faq">Frequently Asked Questions</a></li>
              <li className="sp-foot-link-item"><Link to="/login">School Portal Login</Link></li>
              <li className="sp-foot-link-item"><Link to="/signup">Register New School</Link></li>
            </ul>
          </div>

          {/* Col 4: Newsletter */}
          <div>
            <h4 className="sp-foot-col-title">Stay Connected</h4>
            <p style={{ fontSize: '13.5px', color: '#94A3B8', marginBottom: '14px' }}>
              Subscribe for educational leadership guides, compliance updates, and feature launches.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="sp-nl-form">
              <input
                type="email"
                required
                placeholder="principal@school.com"
                className="sp-nl-input"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
              />
              <button type="submit" disabled={newsletterSubmitting} className="sp-nl-btn">
                {newsletterSubmitting ? 'Subscribing...' : 'Subscribe'}
              </button>
              {newsletterSuccess && <span className="sp-nl-msg">✓ {newsletterMessage}</span>}
              {newsletterError && <span className="sp-nl-err">✕ {newsletterError}</span>}
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="sp-footer-bottom">
          <div>
            © {year} SchoolProfit.ng. All rights reserved. Powered by Samaritan Technologies.
          </div>
          <div className="sp-foot-legal">
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms-and-conditions">Terms of Service</Link>
            <a href="#contact">Support Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
