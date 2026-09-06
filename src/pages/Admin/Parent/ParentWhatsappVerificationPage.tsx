import { useState } from "react";
import { whatsappApi } from "../../../api/whatsappApi";
import { useToast } from "../../../contexts/ToastContext";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import PageTitle from "../../../components/PageTitle";
import { useNavigate } from "react-router-dom";

export default function ParentWhatsappVerificationPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationId, setVerificationId] = useState<number | null>(null);
  const [code, setCode] = useState("");

  async function startVerification() {
    try {
      setLoading(true);

      const res = await whatsappApi.startParentVerification();
      setVerificationId(res.verification_id);

      showToast(res.message, "success");
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "Failed to send OTP",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    if (!verificationId) return;

    try {
      setLoading(true);

      const res = await whatsappApi.verifyCode({
        verification_id: verificationId,
        code,
      });

      showToast(res.message, "success");
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "Verification failed",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        .parent-wa-main {
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: 24px 28px 40px;
        }

        .parent-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 18px;
          padding: 32px 36px;
          color: #FFFFFF;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
          position: relative;
          overflow: hidden;
        }

        .parent-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }

        .parent-hero-glow {
          position: absolute;
          top: -40px;
          right: -40px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 65%);
          pointer-events: none;
        }

        .parent-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 24px;
        }

        .parent-session-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #10B981;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 100px;
          padding: 4px 12px;
          margin-bottom: 12px;
        }

        .parent-session-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 6px #10B981;
        }

        .parent-greeting {
          font-size: 26px;
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.1;
          margin-bottom: 8px;
        }

        .parent-hero-sub {
          font-size: 13.5px;
          color: #CBD5E1;
          line-height: 1.6;
          max-width: 520px;
          margin-bottom: 0;
        }

        .parent-panel {
          background: #FFFFFF;
          border: 1px solid rgba(15, 39, 68, 0.08);
          border-radius: 18px;
          box-shadow: 0 4px 20px rgba(15, 39, 68, 0.06);
          overflow: hidden;
        }

        .parent-panel-head {
          padding: 20px 26px;
          border-bottom: 1px solid #E2E8F0;
          background: #FFFFFF;
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="WhatsApp Verification" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto gq-app-main parent-wa-main d-flex flex-column min-vh-100">
            {/* ── Signature Hero ── */}
            <div className="parent-hero">
              <div className="parent-hero-glow" />
              <div className="parent-hero-inner">
                <div>
                  <div className="parent-session-badge">
                    <span className="parent-session-dot" />
                    Direct Mobile Channel
                  </div>

                  <h1 className="parent-greeting">
                    Parent WhatsApp Verification
                  </h1>

                  <p className="parent-hero-sub">
                    Authenticate your WhatsApp contact to receive automated attendance pings, fee payment confirmations, and term broadsheets directly on your phone.
                  </p>
                </div>

                <button
                  className="btn btn-warning px-4 py-2"
                  style={{ borderRadius: 10, fontWeight: 700, color: "#0F2744", background: "#FBBF24" }}
                  onClick={() => navigate("/dashboard")}
                >
                  <i className="bi bi-speedometer2 me-2" />
                  Dashboard
                </button>
              </div>
            </div>

            <div className="row justify-content-center my-4">
              <div className="col-lg-7 col-xl-6">
                <div className="parent-panel">
                  <div className="parent-panel-head">
                    <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#0F2744", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                      <i className="bi bi-whatsapp text-success" />
                      Verify WhatsApp Phone Number
                    </h2>
                    <small className="text-muted">
                      Instant one-time passcode verification for verified parents
                    </small>
                  </div>

                  <div className="p-4 p-md-5">
                    {!verificationId && (
                      <div className="text-center py-4">
                        <div
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: "50%",
                            background: "rgba(16, 185, 129, 0.12)",
                            color: "#10B981",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "28px",
                            marginBottom: "16px",
                          }}
                        >
                          <i className="bi bi-shield-lock-fill" />
                        </div>
                        <h4 style={{ fontWeight: 800, color: "#0F2744", marginBottom: "8px" }}>
                          Activate Instant Notifications
                        </h4>
                        <p className="text-muted mb-4" style={{ fontSize: "13.5px", maxWidth: 400, margin: "0 auto 24px" }}>
                          Click the button below to generate and send a secure verification PIN to your registered WhatsApp mobile number.
                        </p>

                        <button
                          className="btn btn-primary px-5 py-2"
                          style={{
                            borderRadius: 10,
                            fontWeight: 700,
                            background: "linear-gradient(135deg, #0F2744 0%, #1E3A8A 100%)",
                            border: "none",
                            boxShadow: "0 4px 14px rgba(15, 39, 68, 0.2)",
                          }}
                          disabled={loading}
                          onClick={startVerification}
                        >
                          {loading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" />
                              Generating Passcode...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-send-fill me-2" />
                              Send Verification OTP
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {verificationId && (
                      <div className="mt-2">
                        <div
                          className="p-3 mb-4 rounded-3 d-flex align-items-center gap-3"
                          style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", color: "#065F46", fontSize: "13px" }}
                        >
                          <i className="bi bi-check-circle-fill fs-5" />
                          <div>A 6-digit OTP code was sent to your registered WhatsApp phone number. Enter it below to complete verification.</div>
                        </div>

                        <div className="mb-4">
                          <label className="form-label" style={{ fontSize: "12.5px", fontWeight: 700, color: "#0F2744" }}>
                            6-Digit Verification PIN
                          </label>

                          <input
                            type="text"
                            className="form-control"
                            style={{
                              borderRadius: 10,
                              fontSize: "18px",
                              fontWeight: 800,
                              letterSpacing: "4px",
                              textAlign: "center",
                              padding: "12px",
                            }}
                            placeholder="• • • • • •"
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                          />
                        </div>

                        <div className="d-flex justify-content-between align-items-center">
                          <button
                            className="btn btn-outline-secondary"
                            style={{ borderRadius: 10, fontWeight: 700 }}
                            disabled={loading}
                            onClick={startVerification}
                          >
                            Resend Code
                          </button>

                          <button
                            className="btn btn-success px-4 py-2"
                            style={{
                              borderRadius: 10,
                              fontWeight: 700,
                              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                              border: "none",
                              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)",
                            }}
                            disabled={loading || !code}
                            onClick={verifyCode}
                          >
                            {loading ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" />
                                Verifying...
                              </>
                            ) : (
                              "Verify & Connect WhatsApp"
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}