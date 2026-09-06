import { useNavigate } from "react-router-dom";
import { getUser, logout } from "../../utils/token";

export default function ForbiddenPage() {
  const navigate = useNavigate();
  const user = getUser();

  const handleLogoutAndSwitch = () => {
    logout();
  };

  return (
    <main className="gq-status-page">
      <style>{`
        .gq-status-page {
          min-height: 100vh;
          background: radial-gradient(circle at 50% 20%, rgba(220, 38, 38, 0.06) 0%, transparent 60%), #f8fafc;
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
          background: linear-gradient(90deg, #ef4444 0%, #b91c1c 100%);
        }
        .gq-status-code {
          font-size: clamp(72px, 12vw, 108px);
          font-weight: 950;
          line-height: 0.9;
          letter-spacing: -3px;
          background: linear-gradient(135deg, #991b1b 30%, #ef4444 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 12px;
        }
        .gq-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fee2e2;
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
          margin: 0 auto 20px;
        }
        .gq-user-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 12px 18px;
          margin: 0 auto 24px;
          max-width: 420px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
        }
        .gq-user-role-badge {
          background: #e2e8f0;
          color: #1e293b;
          padding: 3px 10px;
          border-radius: 8px;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 11px;
        }
        .gq-status-actions {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .gq-status-btn-primary {
          background: #0f172a;
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
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .gq-status-btn-primary:hover {
          background: #1e293b;
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
          transition: all 0.15s ease;
        }
        .gq-status-btn-secondary:hover {
          background: #f8fafc;
          border-color: #94a3b8;
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
        <div className="gq-status-code">403</div>
        <div className="gq-status-badge">
          <i className="bi bi-shield-lock-fill" /> Access Restricted
        </div>
        <h1 className="gq-status-title">Permission Denied</h1>
        <p className="gq-status-desc">
          You do not have the required role or administrative privileges to access this resource. Please contact your school administrator if you believe this is an error.
        </p>

        {user && (
          <div className="gq-user-box">
            <span style={{ color: "#64748b" }}>Logged in as: <strong>{user.name || user.email}</strong></span>
            <span className="gq-user-role-badge">{user.role || "User"}</span>
          </div>
        )}

        <div className="gq-status-actions">
          <button className="gq-status-btn-primary" onClick={() => navigate("/dashboard")}>
            <i className="bi bi-speedometer2" /> Go to Dashboard
          </button>
          <button className="gq-status-btn-secondary" onClick={handleLogoutAndSwitch}>
            <i className="bi bi-box-arrow-right" /> Switch Account
          </button>
        </div>

        <div className="gq-status-footer">
          <a href="/dashboard">Dashboard</a>
          <span>&bull;</span>
          <a href="/billing">Billing & Plans</a>
          <span>&bull;</span>
          <a href="/contact">Support</a>
        </div>
      </div>
    </main>
  );
}
