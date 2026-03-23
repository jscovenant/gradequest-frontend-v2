import { useState } from "react";
import { whatsappApi } from "../../../api/whatsappApi";
import { useToast } from "../../../contexts/ToastContext";

export default function ParentWhatsappVerificationPage() {
  const { showToast } = useToast();

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
    <div className="container-fluid py-4">
      <div className="row justify-content-center">
        <div className="col-lg-6 col-xl-5">

          <div className="card shadow-sm border-0">

            <div className="card-header bg-white border-bottom">
              <h5 className="mb-0 fw-semibold">
                WhatsApp Verification
              </h5>
              <small className="text-muted">
                Verify your WhatsApp number to receive school notifications.
              </small>
            </div>

            <div className="card-body">

              {!verificationId && (
                <div className="text-center py-3">
                  <p className="text-muted mb-3">
                    Click the button below to receive a WhatsApp OTP.
                  </p>

                  <button
                    className="btn btn-primary px-4"
                    disabled={loading}
                    onClick={startVerification}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Sending...
                      </>
                    ) : (
                      "Send OTP"
                    )}
                  </button>
                </div>
              )}

              {verificationId && (
                <div className="mt-2">

                  <div className="alert alert-info">
                    Enter the OTP code sent to your WhatsApp number.
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-medium">
                      OTP Code
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter 6-digit code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </div>

                  <div className="d-flex justify-content-between">

                    <button
                      className="btn btn-outline-secondary"
                      disabled={loading}
                      onClick={startVerification}
                    >
                      Resend OTP
                    </button>

                    <button
                      className="btn btn-success px-4"
                      disabled={loading || !code}
                      onClick={verifyCode}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Verifying...
                        </>
                      ) : (
                        "Verify"
                      )}
                    </button>

                  </div>

                </div>
              )}

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}