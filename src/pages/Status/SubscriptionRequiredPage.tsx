import { useNavigate } from "react-router-dom";
import { getUser } from "../../utils/token";

export default function SubscriptionRequiredPage() {
  const navigate = useNavigate();
  const user = getUser();
  const isAdmin = user && (user.role?.toLowerCase() === "admin" || user.role?.toLowerCase() === "super-admin");

  return (
    <main className="gq-status-page">
      <style>{`
        .gq-status-page {
          min-height: 100vh;
          background: radial-gradient(circle at 50% 20%, rgba(201, 168, 76, 0.12) 0%, transparent 60%), #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
          color: #0f172a;
        }
        .gq-status-card {
          width: 100%;
          max-width: 600px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 44px 36px;
          text-align: center;
          box-shadow: 0 20px 45px rgba(15, 23, 42, 0.06);
          position: relative;
          overflow: hidden;
        }
        .gq-status-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 5px;
          background: linear-gradient(90deg, #c5a059 0%, #facc15 100%);
        }
        .gq-status-code {
          font-size: clamp(72px, 12vw, 108px);
          font-weight: 950;
          line-height: 0.9;
          letter-spacing: -3px;
          background: linear-gradient(135deg, #b45309 30%, #f59e0b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 12px;
        }
        .gq-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #fefce8;
          color: #854d0e;
          border: 1px solid #fef08a;
          padding: 5px 14px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 16px;
        }
        .gq-status-title {
          font-size: 24px;
          font-weight: 900;
          color: #0f172a;
          margin: 0 0 10px;
        }
        .gq-status-desc {
          color: #64748b;
          font-size: 14.5px;
          line-height: 1.6;
          max-width: 460px;
          margin: 0 auto 28px;
        }
        .gq-status-actions {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .gq-status-btn-gold {
          background: linear-gradient(135deg, #c5a059 0%, #a88238 100%);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 12px 24px;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(197, 160, 89, 0.35);
          transition: transform 0.15s ease;
        }
        .gq-status-btn-gold:hover {
          transform: translateY(-1px);
        }
        .gq-status-btn-secondary {
          background: #ffffff;
          color: #334155;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 12px 20px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .gq-status-footer {
          margin-top: 32px;
          padding-top: 20px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          justify-content: center;
          gap: 20px;
          font-size: 12.5px;
          color: #94a3b8;
        }
        .gq-status-footer a {
          color: #64748b;
          text-decoration: none;
          font-weight: 600;
        }
      `}</style>

      <div className="gq-status-card">
        <div className="gq-status-code">402</div>
        <div className="gq-status-badge">
          <i className="bi bi-gem" /> Premium Module
        </div>
        <h1 className="gq-status-title">Upgrade Package Required</h1>
        <p className="gq-status-desc">
          This feature is exclusive to the <strong>SchoolProfit Plus</strong> suite or your active subscription period has expired. Upgrade or renew to unlock full access.
        </p>

        <div className="gq-status-actions">
          {isAdmin ? (
            <button className="gq-status-btn-gold" onClick={() => navigate("/checkout")}>
              <i className="bi bi-arrow-up-circle-fill" /> Upgrade / Renew Now
            </button>
          ) : (
            <button className="gq-status-btn-gold" onClick={() => navigate("/dashboard")}>
              <i className="bi bi-speedometer2" /> Back to Dashboard
            </button>
          )}
          <button className="gq-status-btn-secondary" onClick={() => navigate("/billing")}>
            <i className="bi bi-card-checklist" /> View Subscription
          </button>
        </div>

        <div className="gq-status-footer">
          <a href="/dashboard">Dashboard</a>
          <span>&bull;</span>
          <a href="/checkout">Plans & Pricing</a>
          <span>&bull;</span>
          <a href="/contact">Billing Support</a>
        </div>
      </div>
    </main>
  );
}
