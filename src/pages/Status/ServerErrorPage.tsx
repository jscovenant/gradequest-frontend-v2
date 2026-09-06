import { useNavigate } from "react-router-dom";

export default function ServerErrorPage({ error }: { error?: Error }) {
  let navigate = (path: string) => {
    window.location.href = path;
  };
  try {
    const routerNav = useNavigate();
    navigate = (path: string) => {
      try {
        routerNav(path);
      } catch {
        window.location.href = path;
      }
    };
  } catch {
    // Router context not available, fallback to direct location change
  }

  return (
    <main className="gq-status-page">
      <style>{`
        .gq-status-page {
          min-height: 100vh;
          background: radial-gradient(circle at 50% 20%, rgba(245, 158, 11, 0.08) 0%, transparent 60%), #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
          color: #0f172a;
        }
        .gq-status-card {
          width: 100%;
          max-width: 580px;
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
          background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
        }
        .gq-status-code {
          font-size: clamp(72px, 12vw, 108px);
          font-weight: 950;
          line-height: 0.9;
          letter-spacing: -3px;
          background: linear-gradient(135deg, #d97706 30%, #b45309 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 12px;
        }
        .gq-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #fffbeb;
          color: #b45309;
          border: 1px solid #fde68a;
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
          max-width: 440px;
          margin: 0 auto 28px;
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
        <div className="gq-status-code">500</div>
        <div className="gq-status-badge">
          <i className="bi bi-exclamation-triangle-fill" /> Internal Server Error
        </div>
        <h1 className="gq-status-title">Something Went Wrong</h1>
        <p className="gq-status-desc">
          Our servers encountered an unexpected issue while processing your request. Our engineering team has been notified automatically.
        </p>
        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "10px", padding: "12px 14px", color: "#991B1B", fontSize: "12.5px", textAlign: "left", marginBottom: "20px", wordBreak: "break-word" }}>
            <strong>Client Error Details:</strong> {error.message || String(error)}
          </div>
        )}

        <div className="gq-status-actions">
          <button className="gq-status-btn-primary" onClick={() => window.location.reload()}>
            <i className="bi bi-arrow-clockwise" /> Reload Page
          </button>
          <button className="gq-status-btn-secondary" onClick={() => navigate("/dashboard")}>
            <i className="bi bi-speedometer2" /> Back to Dashboard
          </button>
        </div>

        <div className="gq-status-footer">
          <a href="/dashboard">Dashboard</a>
          <span>&bull;</span>
          <a href="/contact">Report Issue</a>
        </div>
      </div>
    </main>
  );
}
