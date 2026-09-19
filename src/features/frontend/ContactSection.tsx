import { useState } from 'react';
import { usePlatformInfo } from '../../hooks/usePlatformInfo';
import { api } from '../../utils/api';

export default function ContactSection() {
  const { whatsappLink } = usePlatformInfo();
  const [formData, setFormData] = useState({
    name: '',
    school_name: '',
    phone: '',
    email: '',
    location: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/frontend/demo-booking', {
        contact_name: formData.name,
        prospect_school_name: formData.school_name,
        contact_phone: formData.phone,
        contact_email: formData.email,
        location: formData.location,
        additional_notes: formData.message,
        source: 'homepage_contact_section',
      });
      setSubmitted(true);
      setFormData({
        name: '',
        school_name: '',
        phone: '',
        email: '',
        location: '',
        message: '',
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Unable to send message right now. Please message us directly on WhatsApp or call our support line.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="sp-contact-section">
      <style>{`
        .sp-contact-section {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #172554 100%);
          padding: 100px 0 110px;
          position: relative;
          overflow: hidden;
          color: #FFFFFF;
        }

        .sp-contact-container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .sp-contact-grid {
          display: grid;
          grid-template-columns: 1fr 1.15fr;
          gap: 56px;
          align-items: center;
        }

        @media (max-width: 1024px) {
          .sp-contact-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
        }

        .sp-contact-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 999px;
          background: rgba(217, 119, 6, 0.2);
          border: 1px solid rgba(245, 158, 11, 0.4);
          color: #FCD34D;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .sp-contact-title {
          font-size: clamp(28px, 3.8vw, 44px);
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.2;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
        }

        .sp-contact-title span {
          color: #F59E0B;
        }

        .sp-contact-desc {
          font-size: 16px;
          line-height: 1.7;
          color: #CBD5E1;
          margin-bottom: 36px;
        }

        .sp-contact-channels {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .sp-channel-item {
          display: flex;
          align-items: center;
          gap: 16px;
          text-decoration: none;
          color: #FFFFFF;
          transition: transform 0.2s ease;
        }

        .sp-channel-item:hover {
          transform: translateX(4px);
          color: #F59E0B;
        }

        .sp-channel-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #F59E0B;
        }

        .sp-channel-label {
          font-size: 12px;
          color: #94A3B8;
          text-transform: uppercase;
          font-weight: 700;
        }

        .sp-channel-val {
          font-size: 15px;
          font-weight: 700;
        }

        /* ── Form Card ── */
        .sp-form-card {
          background: #FFFFFF;
          border-radius: 24px;
          padding: 40px;
          color: #0A192F;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        }

        @media (max-width: 640px) {
          .sp-form-card {
            padding: 24px 20px;
          }
        }

        .sp-form-title {
          font-size: 22px;
          font-weight: 800;
          color: #0A192F;
          margin-bottom: 6px;
        }

        .sp-form-subtitle {
          font-size: 13.5px;
          color: #64748B;
          margin-bottom: 24px;
        }

        .sp-form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 640px) {
          .sp-form-row-2 {
            grid-template-columns: 1fr;
          }
        }

        .sp-form-group {
          margin-bottom: 16px;
        }

        .sp-form-group label {
          display: block;
          font-size: 12.5px;
          font-weight: 700;
          color: #334155;
          margin-bottom: 6px;
        }

        .sp-form-input, .sp-form-textarea {
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid #CBD5E1;
          font-size: 14px;
          color: #0A192F;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          background: #F8FAFC;
          font-family: inherit;
        }

        .sp-form-input:focus, .sp-form-textarea:focus {
          border-color: #1D4ED8;
          background: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.15);
        }

        .sp-btn-submit {
          width: 100%;
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 100%);
          color: #FFFFFF;
          padding: 14px 24px;
          border-radius: 12px;
          border: none;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.25s ease;
          margin-top: 8px;
        }

        .sp-btn-submit:hover:not(:disabled) {
          background: #1E3A8A;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(10, 25, 47, 0.2);
        }

        .sp-alert-success {
          background: #ECFDF5;
          border: 1px solid #A7F3D0;
          color: #065F46;
          padding: 16px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 20px;
        }

        .sp-alert-err {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #991B1B;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 13.5px;
          margin-bottom: 16px;
        }
      `}</style>

      <div className="sp-contact-container">
        <div className="sp-contact-grid">
          {/* Left Column: Channels */}
          <div>
            <div className="sp-contact-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>Connect With Our Team</span>
            </div>
            <h2 className="sp-contact-title">
              Ready to Upgrade Your <span>School Management?</span>
            </h2>
            <p className="sp-contact-desc">
              Schedule a personalized 15-minute live demonstration for your school board or chat directly with our implementation engineers.
            </p>

            <div className="sp-contact-channels">
              <a
                href={whatsappLink('Hello SchoolProfit, I would like to book a demo for my school.')}
                target="_blank"
                rel="noreferrer"
                className="sp-channel-item"
              >
                <div className="sp-channel-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                  </svg>
                </div>
                <div>
                  <div className="sp-channel-label">Instant WhatsApp Chat</div>
                  <div className="sp-channel-val">+234 810 000 0000 / Online 24/7</div>
                </div>
              </a>

              <a href="mailto:support@schoolprofit.ng" className="sp-channel-item">
                <div className="sp-channel-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div>
                  <div className="sp-channel-label">Official Email Support</div>
                  <div className="sp-channel-val">support@schoolprofit.ng</div>
                </div>
              </a>

              <div className="sp-channel-item">
                <div className="sp-channel-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div>
                  <div className="sp-channel-label">Headquarters</div>
                  <div className="sp-channel-val">Lagos State, Nigeria</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Demo Form */}
          <div className="sp-form-card">
            <h3 className="sp-form-title">Book a Free Live Demo</h3>
            <p className="sp-form-subtitle">Fill in your institution details and our onboarding team will contact you within 2 hours.</p>

            {submitted && (
              <div className="sp-alert-success">
                ✓ Thank you! Your demo request has been received. Our team will contact you shortly.
              </div>
            )}

            {error && <div className="sp-alert-err">✕ {error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="sp-form-row-2">
                <div className="sp-form-group">
                  <label>Your Full Name *</label>
                  <input
                    type="text"
                    required
                    className="sp-form-input"
                    placeholder="e.g. Pastor John Eze"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="sp-form-group">
                  <label>School Name *</label>
                  <input
                    type="text"
                    required
                    className="sp-form-input"
                    placeholder="e.g. Grace International College"
                    value={formData.school_name}
                    onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="sp-form-row-2">
                <div className="sp-form-group">
                  <label>Phone Number (WhatsApp) *</label>
                  <input
                    type="tel"
                    required
                    className="sp-form-input"
                    placeholder="0801 234 5678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="sp-form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    className="sp-form-input"
                    placeholder="principal@school.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="sp-form-group">
                <label>School Location (City / State) *</label>
                <input
                  type="text"
                  required
                  className="sp-form-input"
                  placeholder="e.g. Ikeja, Lagos State"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="sp-form-group">
                <label>Specific Questions or Requirements</label>
                <textarea
                  rows={3}
                  className="sp-form-textarea"
                  placeholder="Tell us about your student population, CBT lab setup, or bursary requirements..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <button type="submit" disabled={submitting} className="sp-btn-submit">
                {submitting ? 'Submitting Request...' : 'Schedule My Live Demo →'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
