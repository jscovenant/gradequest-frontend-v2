import React, { useEffect, useState } from "react";
import PageTitle from "../components/PageTitle";
import CbtNetworkStatus from "../components/cbt/CbtNetworkStatus";
import { QRCodeSVG } from "qrcode.react";

type BundleSummary = {
  id: number;
  school_name?: string;
  license_key?: string;
  generated_at?: string;
  expires_at?: string;
  imported_at?: string;
  is_expired?: boolean;
  exams_count?: number;
  students_count?: number;
  eligible_students_count?: number;
  blocked_students_count?: number;
  fee_policy_snapshot?: {
    included?: boolean;
    generated_at?: string;
    valid_hours?: number;
    message?: string;
  } | null;
};

type ServerInfo = {
  host?: string;
  port?: number;
  local_url?: string;
  network_ips?: string[];
  student_urls?: string[];
};

const apiRoot = (() => {
  const isOfflineRunner = window.location.pathname.includes("/cbt/offline-runner") || window.location.pathname.includes("/cbt/offline-server");
  if (isOfflineRunner) {
    return `${window.location.origin}/api`;
  }

  const envBase = import.meta.env.VITE_OFFLINE_CBT_API_URL || import.meta.env.VITE_API_URL;
  if (envBase) {
    const normalized = String(envBase).replace(/\/+$/, "");
    return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
  }

  const sameHostBackend = `${window.location.protocol}//${window.location.hostname}:8000`;
  return `${sameHostBackend}/api`;
})();

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${apiRoot}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const err: any = new Error(payload?.message || "Offline CBT server request failed.");
    throw err;
  }

  return res.json();
}

function formatDateTime(value?: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString();
}

export default function OfflineCbtServerPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [bundle, setBundle] = useState<BundleSummary | null>(null);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [attemptStats, setAttemptStats] = useState({ in_progress: 0, submitted: 0 });

  const [cloudUrl, setCloudUrl] = useState<string>("https://gradequestschool.com.ng");
  const [licenseKeyInput, setLicenseKeyInput] = useState<string>("");
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [cloudSyncLoading, setCloudSyncLoading] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showManualUpload, setShowManualUpload] = useState<boolean>(false);
  const [message, setMessage] = useState("");

  async function loadStatus() {
    setLoading(true);
    try {
      const res = await apiFetch<{ bundle: BundleSummary | null; server?: ServerInfo; attempts?: { in_progress: number; submitted: number } }>("/offline-cbt/status");
      setBundle(res.bundle || null);
      setServerInfo(res.server || null);
      setAttemptStats(res.attempts || { in_progress: 0, submitted: 0 });
    } catch (err: any) {
      setMessage(err.message || "Offline CBT server engine is not responding.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function pullBundleFromCloud() {
    setCloudSyncLoading(true);
    setSyncFeedback(null);
    try {
      const res = await apiFetch<{ message: string; bundle: BundleSummary }>("/offline-cbt/cloud/pull-bundle", {
        method: "POST",
        body: JSON.stringify({
          cloud_url: cloudUrl.trim(),
          license_key: licenseKeyInput.trim() || undefined,
          admin_email: adminEmail.trim() || undefined,
          admin_password: adminPassword || undefined,
        }),
      });
      setBundle(res.bundle);
      setSyncFeedback({ type: "success", text: res.message || "Exam package successfully pulled from Cloud!" });
      await loadStatus();
    } catch (err: any) {
      setSyncFeedback({ type: "error", text: err.message || "Failed to pull exams from Cloud." });
    } finally {
      setCloudSyncLoading(false);
    }
  }

  async function pushResultsToCloud() {
    setCloudSyncLoading(true);
    setSyncFeedback(null);
    try {
      const res = await apiFetch<{ message: string; summary?: any }>("/offline-cbt/cloud/push-results", {
        method: "POST",
        body: JSON.stringify({
          cloud_url: cloudUrl.trim(),
          license_key: licenseKeyInput.trim() || undefined,
          admin_email: adminEmail.trim() || undefined,
          admin_password: adminPassword || undefined,
        }),
      });
      setSyncFeedback({ type: "success", text: res.message || "Exam results pushed to Cloud and recorded in report cards!" });
      await loadStatus();
    } catch (err: any) {
      setSyncFeedback({ type: "error", text: err.message || "Failed to push results to Cloud." });
    } finally {
      setCloudSyncLoading(false);
    }
  }

  async function importBundle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setMessage("");
    try {
      const bundleJson = JSON.parse(await file.text());
      const res = await apiFetch<{ message: string; bundle: BundleSummary }>("/offline-cbt/bundle/import", {
        method: "POST",
        body: JSON.stringify({ bundle: bundleJson }),
      });
      setBundle(res.bundle);
      setMessage(res.message || "Bundle imported successfully.");
      await loadStatus();
    } catch (err: any) {
      setMessage(err.message || "Unable to import offline CBT bundle file.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  function exportResults() {
    window.location.href = `${apiRoot}/offline-cbt/results/export`;
  }

  return (
    <>
      <PageTitle title="GradeQuest Offline CBT" />

      <style>{`
        .offline-server-root {
          min-height: 100vh;
          background: #F8FAFC;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          color: #0F172A;
          padding: 24px 16px;
        }

        .server-console-container {
          max-width: 1100px;
          margin: 0 auto;
        }

        .server-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 18px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
          padding: 24px;
          margin-bottom: 20px;
        }

        .server-label {
          font-size: 11.5px;
          text-transform: uppercase;
          font-weight: 800;
          color: #475569;
          margin-bottom: 6px;
          display: block;
        }

        .server-input {
          width: 100%;
          border: 1px solid #CBD5E1;
          border-radius: 10px;
          padding: 10px 14px;
          background: #FFFFFF;
          font-size: 14px;
          outline: none;
        }

        .server-input:focus {
          border-color: #033987;
          box-shadow: 0 0 0 3px rgba(3, 57, 135, 0.1);
        }

        .server-btn {
          border: 0;
          border-radius: 12px;
          padding: 11px 20px;
          font-weight: 800;
          background: #033987;
          color: #FFFFFF;
          display: inline-flex;
          gap: 8px;
          align-items: center;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .server-btn:hover:not(:disabled) {
          background: #0A4FB3;
          color: #FFFFFF;
        }

        .server-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .server-btn-soft {
          background: #F1F5F9;
          color: #0F172A;
          border: 1px solid #CBD5E1;
        }

        .server-btn-soft:hover:not(:disabled) {
          background: #E2E8F0;
          color: #0F172A;
        }

        .server-alert {
          border-radius: 12px;
          padding: 14px 18px;
          margin-bottom: 16px;
          font-size: 13.5px;
          font-weight: 600;
        }

        .server-alert-good {
          background: #ECFDF5;
          border: 1px solid #BBF7D0;
          color: #065F46;
        }

        .server-alert-danger {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #991B1B;
        }

        .server-kv {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          margin: 16px 0;
        }

        .server-kv div {
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 12px;
          background: #F8FAFC;
        }

        .server-kv strong {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          color: #64748B;
          letter-spacing: 0.04em;
        }

        .server-kv span {
          display: block;
          font-weight: 800;
          color: #0F172A;
          margin-top: 4px;
          font-size: 15px;
        }

        .server-pill {
          display: inline-flex;
          border-radius: 999px;
          padding: 5px 12px;
          font-size: 11px;
          font-weight: 800;
          background: #EEF2FF;
          color: #1E40AF;
        }

        .server-pill-danger {
          background: #FEE2E2;
          color: #991B1B;
        }
      `}</style>

      <div className="offline-server-root">
        <div className="server-console-container">
          {/* Network Connectivity Status Monitor */}
          <CbtNetworkStatus
            pingUrl={`${apiRoot}/offline-cbt/ping`}
            serverLabel="Local Server Engine"
            isHostServer={true}
          />

          {/* Application Header */}
          <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
            <div>
              <h1 className="h3 fw-bold mb-1">GradeQuest Offline CBT</h1>
              <p className="text-muted mb-0">Host management console for packages, Wi-Fi connections, and cloud synchronization.</p>
            </div>
            {bundle && (
              <button
                className="server-btn server-btn-soft"
                type="button"
                disabled={busy}
                onClick={exportResults}
              >
                <i className="bi bi-download me-1" /> Export Results
              </button>
            )}
          </div>

          {message && (
            <div className="server-alert server-alert-danger">
              <i className="bi bi-exclamation-triangle-fill me-2" /> {message}
            </div>
          )}

          {/* Cloud Sync Section */}
          <div className="server-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="fw-bold fs-6 text-dark">
                <i className="bi bi-cloud-arrow-down-fill text-primary me-2" />
                Cloud Direct Synchronization
              </div>
              <span className="badge bg-primary">LAN Direct</span>
            </div>
            <p className="text-muted small mb-3">
              Pull offline exam packages from SchoolProfit cloud or sync completed student results back to update report cards with 1 click.
            </p>

            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="server-label">Cloud Server URL</label>
                <input
                  className="server-input"
                  value={cloudUrl}
                  onChange={(e) => setCloudUrl(e.target.value)}
                  placeholder="https://gradequestschool.com.ng"
                />
              </div>
              <div className="col-md-6">
                <label className="server-label">License Key</label>
                <input
                  className="server-input"
                  value={licenseKeyInput}
                  onChange={(e) => setLicenseKeyInput(e.target.value)}
                  placeholder="e.g. GQ-OFF-XXXX-XXXX"
                />
              </div>
            </div>

            {syncFeedback && (
              <div className={`server-alert ${syncFeedback.type === "success" ? "server-alert-good" : "server-alert-danger"}`}>
                <i className={`bi ${syncFeedback.type === "success" ? "bi-check-circle-fill" : "bi-exclamation-triangle-fill"} me-2`} />
                {syncFeedback.text}
              </div>
            )}

            <div className="d-flex gap-2 flex-wrap">
              <button
                className="server-btn"
                type="button"
                disabled={cloudSyncLoading || busy}
                onClick={pullBundleFromCloud}
              >
                {cloudSyncLoading ? "Syncing..." : "📥 Pull Exams Package"}
              </button>
              <button
                className="server-btn server-btn-soft"
                type="button"
                disabled={cloudSyncLoading || busy || attemptStats.submitted === 0}
                onClick={pushResultsToCloud}
              >
                {cloudSyncLoading ? "Pushing..." : "📤 Push Results to Cloud"}
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                type="button"
                onClick={() => setShowManualUpload(!showManualUpload)}
              >
                {showManualUpload ? "Hide File Upload" : "📁 USB File Import"}
              </button>
            </div>

            {showManualUpload && (
              <div className="mt-3 p-3 bg-light rounded border">
                <label className="server-label">Import Offline Bundle File (.json)</label>
                <input
                  type="file"
                  accept="application/json,.json"
                  className="form-control"
                  disabled={busy}
                  onChange={importBundle}
                />
                <small className="text-muted mt-1 d-block">
                  Use this if your examination hall has zero internet connectivity. Export the bundle from cloud on an internet PC, copy via flash drive, and import here.
                </small>
              </div>
            )}
          </div>

          {/* Wi-Fi & LAN Client Connection Section */}
          <div className="server-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="fw-bold fs-6 text-dark">
                <i className="bi bi-router-fill text-success me-2" />
                Examination Hall Wi-Fi / LAN Network Status
              </div>
              <span className="badge bg-success">Hotspot / Router Active</span>
            </div>
            <p className="text-muted small mb-3">
              Students connect to this local offline server over your TP-Link router or mobile hotspot without consuming any mobile data.
            </p>

            {(serverInfo?.network_ips || []).length > 0 ? (
              <div className="p-3 bg-light rounded border">
                <div className="d-flex justify-content-center mb-3">
                  <QRCodeSVG
                    value={(serverInfo?.student_urls || [])[0] || serverInfo?.local_url || window.location.href}
                    size={140}
                    level="M"
                    includeMargin
                  />
                </div>
                <div className="text-center text-success small mb-3 fw-bold">
                  Students can scan this QR code or navigate to the connection URL from their devices:
                </div>
                {(serverInfo?.student_urls || []).map((url) => (
                  <div key={url} className="p-2 bg-white rounded border mb-2 font-monospace fw-bold text-primary text-center">
                    {url}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted small">Connect this computer to the exam Wi-Fi or hotspot to display client connection URLs.</p>
            )}
          </div>

          {/* Package Overview & Attempts Monitor */}
          <div className="server-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="fw-bold fs-6 text-dark">
                <i className="bi bi-journal-text text-info me-2" />
                Active Exam Package & Candidate Attempts
              </div>
              <span className="badge bg-secondary">{bundle?.school_name || "No Package Loaded"}</span>
            </div>

            <div className="d-flex gap-2 flex-wrap mb-3">
              <span className="server-pill">{bundle?.exams_count || 0} exam(s)</span>
              <span className="server-pill">{bundle?.students_count || 0} student(s)</span>
              <span className="server-pill">{bundle?.eligible_students_count || 0} eligible</span>
              {!!bundle?.blocked_students_count && (
                <span className="server-pill server-pill-danger">{bundle.blocked_students_count} blocked</span>
              )}
              <span className="server-pill" style={{ background: "#DCFCE7", color: "#166534" }}>
                {attemptStats.submitted} submitted
              </span>
              <span className="server-pill" style={{ background: "#FEF3C7", color: "#92400E" }}>
                {attemptStats.in_progress} active writing
              </span>
            </div>

            <div className="server-kv">
              <div>
                <strong>Generated Date</strong>
                <span>{formatDateTime(bundle?.generated_at)}</span>
              </div>
              <div>
                <strong>Expiration Date</strong>
                <span>{formatDateTime(bundle?.expires_at)}</span>
              </div>
              <div>
                <strong>License Key</strong>
                <span>{bundle?.license_key || "None"}</span>
              </div>
            </div>

            {bundle?.is_expired ? (
              <div className="server-alert server-alert-danger mb-0">
                <i className="bi bi-exclamation-octagon-fill me-2" />
                This offline package has expired. Pull or import a fresh package before students begin examinations.
              </div>
            ) : (
              <div className="server-alert server-alert-good mb-0">
                <i className="bi bi-check-circle-fill me-2" />
                Offline CBT Server Engine is operational and ready for examination sessions.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
