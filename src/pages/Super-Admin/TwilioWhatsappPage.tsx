import { useEffect, useState } from "react";
import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import PageTitle from "../../components/PageTitle";
import { useToast } from "../../contexts/ToastContext";
import { authApi } from "../../utils/axios";

type TwilioStatus = {
  twilio: {
    sid: boolean;
    auth_token: boolean;
    from: boolean;
    from_number?: string | null;
    ready: boolean;
  };
  schools_enabled: number;
  messages_sent_this_month: number;
};

export default function TwilioWhatsappPage() {
  const { showSuccess, showError } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [status, setStatus] = useState<TwilioStatus | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await authApi.get("/superadmin/twilio-whatsapp/status");
      setStatus(res.data?.data ?? null);
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to load Twilio WhatsApp status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendTest = async () => {
    if (!testPhone.trim()) {
      showError?.("Enter a WhatsApp number to test.");
      return;
    }

    setTesting(true);
    try {
      const res = await authApi.post("/superadmin/twilio-whatsapp/test", { phone: testPhone.trim() });
      showSuccess?.(res.data?.message || "Twilio test sent.");
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Twilio test failed.");
    } finally {
      setTesting(false);
    }
  };

  const ready = !!status?.twilio.ready;

  return (
    <>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Twilio WhatsApp" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main sa-main">
            {loading && <Loader message="Loading Twilio WhatsApp settings..." />}

            <section style={{ background: "#0f172a", color: "#fff", borderRadius: 16, padding: 28, marginBottom: 18 }}>
              <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
                <div>
                  <div style={{ color: "#4ade80", fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8 }}>
                    Platform WhatsApp
                  </div>
                  <h1 style={{ fontFamily: "Lora, Georgia, serif", fontWeight: 800, margin: 0 }}>Twilio Configuration</h1>
                  <p style={{ color: "#94a3b8", margin: "8px 0 0", maxWidth: 680 }}>
                    Manage the platform WhatsApp sender used by schools. Credentials stay in the backend environment file.
                  </p>
                </div>

                <span className="badge" style={{ background: ready ? "rgba(34,197,94,.18)" : "rgba(239,68,68,.18)", color: ready ? "#4ade80" : "#fca5a5", padding: "10px 14px", borderRadius: 999 }}>
                  {ready ? "Twilio Ready" : "Twilio Not Ready"}
                </span>
              </div>
            </section>

            <div className="row g-3">
              <div className="col-12 col-lg-6">
                <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
                  <div className="card-body">
                    <h5 className="fw-bold mb-1">Configuration Status</h5>
                    <p className="text-muted small mb-3">Read-only check from backend environment variables.</p>

                    {[
                      ["Account SID", status?.twilio.sid],
                      ["Auth Token", status?.twilio.auth_token],
                      ["WhatsApp Sender", status?.twilio.from],
                    ].map(([label, ok]) => (
                      <div className="d-flex align-items-center justify-content-between py-2 border-bottom" key={String(label)}>
                        <span>{label}</span>
                        <span className={`badge ${ok ? "bg-success" : "bg-danger"}`}>{ok ? "Set" : "Missing"}</span>
                      </div>
                    ))}

                    <div className="mt-3 p-3 rounded" style={{ background: "#f8fafc" }}>
                      <div className="text-muted small">Sender number</div>
                      <div className="fw-bold">{status?.twilio.from_number || "Not configured"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-lg-6">
                <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
                  <div className="card-body">
                    <h5 className="fw-bold mb-1">Platform Test</h5>
                    <p className="text-muted small mb-3">Use this only as Super Admin to confirm Twilio delivery.</p>

                    <label className="form-label fw-semibold small">WhatsApp number</label>
                    <div className="input-group">
                      <span className="input-group-text">+</span>
                      <input
                        className="form-control"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="2348012345678"
                        disabled={!ready || testing}
                      />
                    </div>

                    <button className="btn btn-success w-100 mt-3" onClick={sendTest} disabled={!ready || testing || !testPhone.trim()}>
                      {testing ? "Sending..." : "Send Twilio Test"}
                    </button>

                    <div className="alert alert-warning mt-3 mb-0 small">
                      In Twilio Sandbox, the test number must first join the sandbox. In production, schools and parents should not see this step.
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12">
                <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
                  <div className="card-body d-flex gap-3 flex-wrap">
                    <div>
                      <div className="text-muted small">Schools with WhatsApp enabled</div>
                      <div className="h4 fw-bold mb-0">{status?.schools_enabled ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-muted small">Messages sent this month</div>
                      <div className="h4 fw-bold mb-0">{status?.messages_sent_this_month ?? 0}</div>
                    </div>
                    <button className="btn btn-outline-secondary ms-auto" onClick={loadStatus} disabled={loading}>Refresh</button>
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
