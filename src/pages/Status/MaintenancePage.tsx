import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { publicApi } from "../../utils/axios";
import { getToken } from "../../utils/token";

export default function MaintenancePage() {
  const navigate = useNavigate();
  const token = getToken();
  const [maintenance, setMaintenance] = useState<{
    maintenance_mode: boolean;
    message?: string;
    activated_at?: string;
  } | null>(null);
  const [checking, setChecking] = useState(false);

  const checkStatus = () => {
    setChecking(true);
    publicApi
      .get("/platform-status")
      .then((res) => {
        setMaintenance(res.data);
        if (!res.data.maintenance_mode) {
          if (token) {
            navigate("/dashboard");
          } else {
            navigate("/");
          }
        }
      })
      .catch(() => {
        // Keep default
      })
      .finally(() => setChecking(false));
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <main className="gq-status-page">
      <style>{`
        .gq-status-page {
          min-height: 100vh;
          background: radial-gradient(circle at 50% 20%, rgba(15, 23, 42, 0.06) 0%, transparent 60%), #f8fafc;
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
          background: linear-gradient(90deg, #0284c7 0%, #0369a1 100%);
        }
        .gq-status-icon-wrap {
          width: 80px;
          height: 80px;
          border-radius: 24px;
          background: #f0f9ff;
          color: #0284c7;
          border: 1px solid #bae6fd;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          margin: 0 auto 20px;
        }
        .gq-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #e0f2fe;
          color: #0369a1;
          border: 1px solid #bae6fd;
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
          color: #475569;
          font-size: 14.5px;
          line-height: 1.6;
          max-width: 460px;
          margin: 0 auto 24px;
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
        .gq-status-footer {
          margin-top: 32px;
          padding-top: 20px;
          border-top: 1px solid #f1f5f9;
          font-size: 12.5px;
          color: #94a3b8;
        }
      `}</style>

      <div className="gq-status-card">
        <div className="gq-status-icon-wrap">
          <i className="bi bi-tools" />
        </div>
        <div className="gq-status-badge">
          <i className="bi bi-clock-history" /> Scheduled Maintenance
        </div>
        <h1 className="gq-status-title">Routine System Upgrades</h1>
        <p className="gq-status-desc">
          {maintenance?.message ||
            "We are currently performing routine infrastructure upgrades to enhance performance and security. All systems will be fully operational shortly."}
        </p>

        {maintenance?.activated_at && (
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 20 }}>
            Maintenance started: <strong>{new Date(maintenance.activated_at).toLocaleString()}</strong>
          </div>
        )}

        <div className="gq-status-actions">
          <button className="gq-status-btn-primary" onClick={checkStatus} disabled={checking}>
            <i className={`bi bi-arrow-clockwise ${checking ? "spin" : ""}`} />
            {checking ? "Checking System Status..." : "Check Again"}
          </button>
        </div>

        <div className="gq-status-footer">
          Thank you for your patience &bull; GradiosEdu Operations Team
        </div>
      </div>
    </main>
  );
}
