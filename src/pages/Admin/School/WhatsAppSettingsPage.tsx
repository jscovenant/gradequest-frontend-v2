// src/pages/Settings/WhatsAppSettingsPage.tsx
import React, { useEffect, useState } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";

// ✅ Simplified — no more Twilio credential fields
type WhatsAppSettings = {
  whatsapp_enabled: boolean;
  whatsapp_messages_sent: number;
  whatsapp_monthly_limit: number;
  whatsapp_remaining?: number | null;
  whatsapp_unlimited?: boolean;
  whatsapp_has_access?: boolean;
  twilio?: {
    sid: boolean;
    auth_token: boolean;
    from: boolean;
    from_number?: string | null;
    ready: boolean;
  };
};

type BroadcastForm = {
  term: string;
  session: string;
  class_id: string;
};

type BroadcastType = "results" | "fee_reminders" | "custom";
type ClassOption = { id: number; name: string };
type SessionOption = { id: number; name: string };
type TermOption = { id: number; name: string };





function SectionHeading({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="db-section-head">
      <div className="db-section-left">
        <div className="db-section-ico"><i className={`bi bi-${icon}`} /></div>
        <div>
          <div className="db-section-title">{title}</div>
          {subtitle && <div className="db-section-sub">{subtitle}</div>}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <span className="db-pill" style={{
      background: enabled ? "rgba(34,197,94,0.14)" : "rgba(245,158,11,0.14)",
      color: enabled ? "#22c55e" : "#fbbf24",
    }}>
      <i className={`bi bi-${enabled ? "check-circle" : "x-circle"} me-1`} />
      {enabled ? "Active" : "Inactive"}
    </span>
  );
}

export default function WhatsAppSettingsPage() {
  const { showSuccess, showError } = useToast();

  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [testing,      setTesting]      = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  const [settings, setSettings] = useState<WhatsAppSettings>({
    whatsapp_enabled:       false,
    whatsapp_messages_sent: 0,
    whatsapp_monthly_limit: 0,
    whatsapp_remaining: null,
    whatsapp_unlimited: false,
    whatsapp_has_access: false,
    twilio: undefined,
  });

  const [classes,       setClasses]       = useState<ClassOption[]>([]);
  const [sessions,      setSessions]      = useState<SessionOption[]>([]);
  const [terms,         setTerms]         = useState<TermOption[]>([]);
  const [testPhone,     setTestPhone]     = useState("");
  const [broadcastType, setBroadcastType] = useState<BroadcastType>("results");
  const [broadcastForm, setBroadcastForm] = useState<BroadcastForm>({ term: "", session: "", class_id: "" });
  const [customMessage, setCustomMessage] = useState("");
  const [queueStats,    setQueueStats]    = useState<{ pending: number; failed: number } | null>(null);

  const parseBackendError = (err: any) =>
    err?.response?.data?.message || err?.message || "Something went wrong.";

  useEffect(() => {
    setLoading(true);
    Promise.all([
      authApi.get("/settings/whatsapp"),
      authApi.get("/classes"),
      authApi.get("/sessions"),
      authApi.get("/terms"),
      authApi.get("/settings/whatsapp/queue-stats").catch(() => ({ data: null })),
    ])
      .then(([waRes, classRes, sessionRes, termRes, queueRes]) => {
        const d = waRes.data?.data ?? waRes.data;
        setSettings({
          whatsapp_enabled:       !!d?.whatsapp_enabled,
          whatsapp_messages_sent: d?.whatsapp_messages_sent ?? 0,
          whatsapp_monthly_limit: d?.whatsapp_monthly_limit ?? 0,
          whatsapp_remaining: d?.whatsapp_remaining ?? null,
          whatsapp_unlimited: !!d?.whatsapp_unlimited,
          whatsapp_has_access: !!d?.whatsapp_has_access,
          twilio: d?.twilio,
        });
        setClasses(classRes.data?.data ?? classRes.data ?? []);
        setSessions(sessionRes.data?.data ?? sessionRes.data ?? []);
        setTerms(termRes.data?.data ?? termRes.data ?? []);
        if (queueRes.data) setQueueStats(queueRes.data);
      })
      .catch((err) => { showError?.("Failed to load WhatsApp settings."); console.error(err); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Simple toggle — calls /settings/whatsapp/toggle
  const toggleWhatsApp = async (next: boolean) => {
    setSettings((p) => ({ ...p, whatsapp_enabled: next }));
    setSaving(true);
    try {
      const res = await authApi.post("/settings/whatsapp/toggle", {
        whatsapp_enabled: next,
      });
      showSuccess?.(res.data?.message ?? "WhatsApp setting updated.");
    } catch (err: any) {
      setSettings((p) => ({ ...p, whatsapp_enabled: !next })); 
      showError?.(parseBackendError(err));
    } finally {
      setSaving(false);
    }
  };

  const sendTestMessage = async () => {
    if (!testPhone.trim()) { showError?.("Enter a phone number to test."); return; }
    setTesting(true);
    try {
      const res = await authApi.post("/settings/whatsapp/test", { phone: testPhone.trim() });
      showSuccess?.(res.data?.message ?? "Test message sent!");
    } catch (err: any) {
      showError?.(parseBackendError(err));
    } finally {
      setTesting(false);
    }
  };

  const sendBroadcast = async () => {
    if (broadcastType === "results") {
      if (!broadcastForm.term || !broadcastForm.session || !broadcastForm.class_id) {
        showError?.("Please fill in Term, Session and Class.");
        return;
      }
    }
    if (broadcastType === "custom" && !customMessage.trim()) {
      showError?.("Enter a message to broadcast.");
      return;
    }

    setBroadcasting(true);
    try {
      let res;
      if (broadcastType === "results") {
        res = await authApi.post("/whatsapp/broadcast/results", broadcastForm);
      } else if (broadcastType === "fee_reminders") {
        res = await authApi.post("/whatsapp/broadcast/fee-reminders");
      } else {
        res = await authApi.post("/whatsapp/broadcast/custom", { message: customMessage.trim() });
      }
      showSuccess?.(res.data?.message ?? "Broadcast queued successfully.");
    } catch (err: any) {
      showError?.(parseBackendError(err));
    } finally {
      setBroadcasting(false);
    }
  };

  // Usage percentage for progress bar
  const usagePct = settings.whatsapp_monthly_limit > 0
    ? Math.min(100, Math.round((settings.whatsapp_messages_sent / settings.whatsapp_monthly_limit) * 100))
    : 0;

  const isUnlimited = !!settings.whatsapp_unlimited || settings.whatsapp_monthly_limit === -1;
  const twilioReady = true;
  const remainingMessages = isUnlimited
    ? "Unlimited"
    : settings.whatsapp_remaining ?? Math.max(0, settings.whatsapp_monthly_limit - settings.whatsapp_messages_sent);

  return (
    <>
      <style>{`
        .db-main { background: var(--bs-body-bg, #f5f1eb); min-height: 100vh; font-family: "DM Sans", system-ui, sans-serif; padding: 28px 28px 0; }
        .db-hero { background: #0f172a; border-radius: 16px; padding: 32px 36px; position: relative; overflow: hidden; margin: 10px 0 18px; border: 1px solid rgba(255,255,255,0.06); }
        .db-hero::before { content: ""; position: absolute; inset: 0; background-image: radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px); background-size: 24px 24px; pointer-events: none; }
        .db-hero-glow  { position: absolute; top: -60px; right: -60px; width: 320px; height: 320px; border-radius: 50%; background: radial-gradient(circle, rgba(37,211,102,0.10) 0%, transparent 65%); pointer-events: none; }
        .db-hero-glow2 { position: absolute; bottom: -40px; left: 30%; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%); pointer-events: none; }
        .db-hero-inner { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 32px; flex-wrap: wrap; }
        @media (min-width: 768px) { .db-hero-inner { flex-wrap: nowrap; } }
        .db-session-badge { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: #4ade80; background: rgba(37,211,102,0.10); border: 1px solid rgba(37,211,102,0.22); border-radius: 100px; padding: 4px 12px; margin-bottom: 14px; }
        .db-session-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; animation: dbPulse 2s ease infinite; }
        @keyframes dbPulse { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.4;transform:scale(1.5);} }
        .db-greeting { font-family: "Lora", Georgia, serif; font-size: clamp(22px,2.5vw,32px); font-weight: 700; color: #fff; line-height: 1.1; margin-bottom: 8px; }
        .db-greeting em { font-style: italic; color: #4ade80; }
        .db-hero-sub { font-size: 13.5px; font-weight: 300; color: #64748b; line-height: 1.65; max-width: 620px; margin-bottom: 18px; }
        .db-hero-btns { display: flex; gap: 10px; flex-wrap: wrap; }
        .db-btn-gold  { display:inline-flex;align-items:center;gap:7px;padding:10px 20px;font-family:"DM Sans",sans-serif;font-size:13px;font-weight:500;color:#0f172a;background:#c9a84c;border:none;border-radius:8px;cursor:pointer;transition:background .2s,transform .2s;white-space:nowrap; }
        .db-btn-gold:hover { background:#e8c97a;transform:translateY(-1px); }
        .db-btn-gold:disabled { opacity:.55;cursor:not-allowed;transform:none; }
        .db-btn-green { display:inline-flex;align-items:center;gap:7px;padding:10px 20px;font-family:"DM Sans",sans-serif;font-size:13px;font-weight:500;color:#fff;background:#16a34a;border:none;border-radius:8px;cursor:pointer;transition:background .2s,transform .2s;white-space:nowrap; }
        .db-btn-green:hover { background:#15803d;transform:translateY(-1px); }
        .db-btn-green:disabled { opacity:.55;cursor:not-allowed;transform:none; }
        .db-hero-stat-card { background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);backdrop-filter:blur(8px);border-radius:12px;padding:20px 24px;min-width:280px;margin-left:auto;align-self:flex-end; }
        .db-hero-stat-row { display:flex;flex-direction:column;gap:10px; }
        .db-hero-stat-item { display:flex;justify-content:space-between;align-items:center;gap:16px; }
        .db-hero-stat-label { font-size:12px;font-weight:300;color:#64748b; }
        .db-hero-stat-val { font-size:14px;font-weight:700;color:#fff;font-family:"DM Sans"; }
        .db-hero-stat-sep { height:1px;background:rgba(255,255,255,0.06); }
        .db-panel { background:#fff;border:1px solid #ede8e0;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(15,23,42,0.04);margin-bottom:18px; }
        .db-panel-head { display:flex;align-items:center;justify-content:space-between;padding:18px;border-bottom:1px solid rgba(0,0,0,0.06);gap:12px;flex-wrap:wrap; }
        .db-panel-title { font-family:"Lora",serif;font-size:16px;font-weight:700;color:#1a1a2e;margin:0; }
        .db-panel-sub { font-size:11.5px;font-weight:300;color:#9a8a7a;margin:0; }
        .db-pill { display:inline-flex;align-items:center;font-size:12px;font-weight:800;padding:6px 10px;border-radius:999px;white-space:nowrap;border:1px solid rgba(0,0,0,0.06); }
        .db-muted { color:#9a8a7a; }
        .db-strong { font-weight:900;color:#1a1a2e; }
        .db-card { border:1px solid rgba(0,0,0,0.06);border-radius:14px;background:#fff;box-shadow:0 2px 10px rgba(15,23,42,0.04); }
        .db-kv { display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 12px;border:1px solid rgba(0,0,0,0.06);border-radius:12px;background:#faf8f5; }
        .db-kv label { font-size:12px;color:#9a8a7a; }
        .db-kv b { color:#1a1a2e; }
        .db-section-head { margin:10px 0 12px;display:flex;align-items:center;justify-content:space-between; }
        .db-section-left { display:flex;align-items:center;gap:12px; }
        .db-section-ico { width:40px;height:40px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.06);border:1px solid rgba(0,0,0,0.06);color:#0f172a; }
        .db-section-title { font-family:"Lora",serif;font-weight:800;color:#1a1a2e;font-size:15px;line-height:1.1; }
        .db-section-sub { font-size:12px;color:#9a8a7a;margin-top:4px; }
        .wa-tab-row { display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap; }
        .wa-tab { display:inline-flex;align-items:center;gap:7px;padding:9px 16px;font-size:13px;font-weight:500;border-radius:10px;border:1px solid rgba(0,0,0,0.10);background:#faf8f5;color:#7a6a5a;cursor:pointer;transition:all .15s; }
        .wa-tab:hover { background:#f0ebe3; }
        .wa-tab.active       { background:#0f172a;color:#fff;border-color:#0f172a; }
        .wa-tab.active.green { background:#16a34a;border-color:#16a34a; }
        .wa-tab.active.amber { background:#d97706;border-color:#d97706; }
        .wa-tab.active.blue  { background:#2563eb;border-color:#2563eb; }
        .wa-cred-item label { font-size:12px;font-weight:600;color:#1a1a2e;display:block;margin-bottom:5px; }
        .wa-cred-hint { font-size:11.5px;color:#9a8a7a;margin-top:5px; }
        .wa-callout { border-radius:12px;padding:12px 14px;font-size:12.5px; }
        .wa-callout-warn    { background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.20);color:#92400e; }
        .wa-callout-info    { background:rgba(37,99,235,0.05);border:1px solid rgba(37,99,235,0.15);color:#1e40af; }
        .wa-callout-success { background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.18);color:#166534; }
        .wa-stat-row { display:flex;gap:12px;flex-wrap:wrap; }
        .wa-stat-card { flex:1;min-width:120px;background:#faf8f5;border:1px solid rgba(0,0,0,0.07);border-radius:12px;padding:14px 16px; }
        .wa-stat-num { font-family:"Lora",serif;font-size:28px;font-weight:700;color:#1a1a2e;line-height:1; }
        .wa-stat-label { font-size:11.5px;color:#9a8a7a;margin-top:4px; }
        .wa-progress-bar { height:6px;border-radius:999px;background:rgba(0,0,0,0.07);overflow:hidden;margin-top:8px; }
        .wa-progress-fill { height:100%;border-radius:999px;transition:width .4s; }
        @media (max-width: 991.98px) { .db-main { padding: 18px 14px 0; } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="WhatsApp Notifications" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loading && <Loader message="Loading WhatsApp settings..." />}

            {/* HERO */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />
              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    WhatsApp Notifications
                  </div>
                  <h1 className="db-greeting">
                    Send via <em>WhatsApp</em>
                  </h1>
                  <p className="db-hero-sub">
                    Send result sheets, fee reminders and custom broadcasts to parents directly on WhatsApp — powered by GradeQuest. No setup required on your end.
                  </p>
                  <div className="db-hero-btns">
                    <span className="db-pill" style={{
                      background: settings.whatsapp_enabled ? "rgba(34,197,94,0.14)" : "rgba(245,158,11,0.14)",
                      color: settings.whatsapp_enabled ? "#22c55e" : "#fbbf24",
                      fontSize: 13, padding: "8px 14px",
                    }}>
                      <i className={`bi bi-${settings.whatsapp_enabled ? "wifi" : "wifi-off"} me-1`} />
                      {settings.whatsapp_enabled ? "WhatsApp Active" : "WhatsApp Inactive"}
                    </span>
                  </div>
                </div>

                {/* Quick glance */}
                <div className="db-hero-stat-card d-none d-md-block">
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                    <span style={{ fontSize:11, fontWeight:500, letterSpacing:"0.14em", textTransform:"uppercase", color:"#4ade80" }}>
                      Quick glance
                    </span>
                    <i className="bi bi-whatsapp" style={{ color:"#25d366" }} />
                  </div>
                  <div className="db-hero-stat-row">
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Status</span>
                      <StatusBadge enabled={settings.whatsapp_enabled} />
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Messages sent</span>
                      <span className="db-hero-stat-val">{settings.whatsapp_messages_sent}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Monthly limit</span>
                      <span className="db-hero-stat-val">
                        {isUnlimited ? "Unlimited" : settings.whatsapp_monthly_limit === 0 ? "No access" : settings.whatsapp_monthly_limit}
                      </span>
                    </div>
                    {queueStats && (
                      <>
                        <div className="db-hero-stat-sep" />
                        <div className="db-hero-stat-item">
                          <span className="db-hero-stat-label">Queued</span>
                          <span className="db-pill" style={{ background:"rgba(37,99,235,0.12)", color:"#3b82f6" }}>
                            {queueStats.pending}
                          </span>
                        </div>
                        <div className="db-hero-stat-sep" />
                        <div className="db-hero-stat-item">
                          <span className="db-hero-stat-label">Failed</span>
                          <span className="db-pill" style={{
                            background: queueStats.failed > 0 ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
                            color: queueStats.failed > 0 ? "#ef4444" : "#22c55e",
                          }}>
                            {queueStats.failed}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* CONTENT — no form wrapper needed, just a toggle */}
            <div className="row g-3">

              {/* LEFT */}
              <div className="col-12 col-lg-6">
                <SectionHeading icon="toggle-on" title="WhatsApp Access" subtitle="Enable or disable WhatsApp notifications for this school." />

                {/* Enable panel */}
                <div className="db-panel">
                  <div className="db-panel-head">
                    <div>
                      <p className="db-panel-title">WhatsApp notifications</p>
                      <p className="db-panel-sub">Messages are sent from GradeQuest's WhatsApp number on your behalf.</p>
                    </div>
                    <StatusBadge enabled={settings.whatsapp_enabled} />
                  </div>

                  <div style={{ padding: 16 }}>
                    <div className="wa-callout wa-callout-info mb-3">
                      <i className="bi bi-info-circle me-1" />
                      <strong>No setup required.</strong> GradeQuest handles all WhatsApp delivery via a shared number. Your school name is always included in every message so parents know who sent it.
                    </div>

                    <div className="db-kv">
                      <div>
                        <label className="d-block">Enable WhatsApp notifications</label>
                        <b>{settings.whatsapp_enabled ? "Enabled" : "Disabled"}</b>
                      </div>
                      <div className="form-check form-switch m-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          checked={settings.whatsapp_enabled}
                          onChange={(e) => toggleWhatsApp(e.target.checked)}
                          disabled={loading || saving || settings.whatsapp_monthly_limit === 0}
                        />
                      </div>
                    </div>

                    {/* ✅ Quota warning if on a limited plan */}
                    {settings.whatsapp_monthly_limit === 0 && (
                      <div className="wa-callout wa-callout-warn mt-3">
                        <i className="bi bi-lock me-1" />
                        WhatsApp is not included in your current plan. Please upgrade to enable this feature.
                      </div>
                    )}

                    {saving && (
                      <div className="db-muted mt-2" style={{ fontSize: 12.5 }}>
                        <span className="spinner-border spinner-border-sm me-1" />
                        Saving…
                      </div>
                    )}

                    <div className="db-muted mt-2" style={{ fontSize: 12.5 }}>
                      <i className="bi bi-whatsapp me-1" style={{ color: "#25d366" }} />
                      Messages appear from GradeQuest's number with your school name in the body.
                    </div>
                  </div>
                </div>

                {/* Usage panel */}
                {settings.whatsapp_monthly_limit !== 0 && (
                  <>
                    <SectionHeading icon="bar-chart" title="Usage This Month" subtitle="Track how many WhatsApp messages have been sent." />
                    <div className="db-panel">
                      <div className="db-panel-head">
                        <div>
                          <p className="db-panel-title">Message usage</p>
                          <p className="db-panel-sub">Resets at the start of each month.</p>
                        </div>
                        <span className="db-pill" style={{ background:"rgba(0,0,0,0.04)", color:"#7a6a5a" }}>
                          <i className="bi bi-graph-up me-1" />
                          {isUnlimited ? "Unlimited" : `${usagePct}%`}
                        </span>
                      </div>
                      <div style={{ padding: 16 }}>
                        <div className="wa-stat-row">
                          <div className="wa-stat-card">
                            <div className="wa-stat-num" style={{ color:"#2563eb" }}>
                              {settings.whatsapp_messages_sent}
                            </div>
                            <div className="wa-stat-label">Sent this month</div>
                          </div>
                          <div className="wa-stat-card">
                            <div className="wa-stat-num" style={{ color:"#16a34a" }}>
                              {isUnlimited ? "∞" : Math.max(0, settings.whatsapp_monthly_limit - settings.whatsapp_messages_sent)}
                            </div>
                            <div className="wa-stat-label">Remaining</div>
                          </div>
                        </div>

                        {!isUnlimited && (
                          <>
                            <div className="wa-progress-bar mt-3">
                              <div className="wa-progress-fill" style={{
                                width: `${usagePct}%`,
                                background: usagePct >= 90 ? "#ef4444" : usagePct >= 70 ? "#f59e0b" : "#16a34a",
                              }} />
                            </div>
                            <div className="d-flex justify-content-between mt-1">
                              <span className="db-muted" style={{ fontSize: 11.5 }}>0</span>
                              <span className="db-muted" style={{ fontSize: 11.5 }}>{settings.whatsapp_monthly_limit} msgs/month</span>
                            </div>
                            {usagePct >= 90 && (
                              <div className="wa-callout wa-callout-warn mt-2">
                                <i className="bi bi-exclamation-triangle me-1" />
                                You've used {usagePct}% of your monthly WhatsApp quota. Consider upgrading your plan.
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {false && (
                  <>
                {/* Test message */}
                <SectionHeading icon="send" title="Test Message" subtitle="Send a test to verify WhatsApp is working." />
                <div className="db-panel">
                  <div className="db-panel-head">
                    <div>
                      <p className="db-panel-title">Send test message</p>
                      <p className="db-panel-sub">Confirm messages are reaching parents correctly.</p>
                    </div>
                    <span className="db-pill" style={{ background:"rgba(0,0,0,0.04)", color:"#7a6a5a" }}>
                      <i className="bi bi-bug me-1" />Test
                    </span>
                  </div>
                  <div style={{ padding: 16 }}>
                    {!settings.whatsapp_enabled && (
                      <div className="wa-callout wa-callout-warn mb-3">
                        <i className="bi bi-exclamation-triangle me-1" />
                        Enable WhatsApp notifications above before testing.
                      </div>
                    )}
                    <div className="wa-cred-item">
                      <label>Test phone number</label>
                      <div className="input-group">
                        <span className="input-group-text"><i className="bi bi-phone" /></span>
                        <input
                          className="form-control"
                          value={testPhone}
                          onChange={(e) => setTestPhone(e.target.value)}
                          placeholder="e.g. 08012345678"
                          disabled={!settings.whatsapp_enabled || !twilioReady || testing}
                        />
                      </div>
                      <div className="wa-cred-hint">Enter a number with an active WhatsApp account.</div>
                    </div>
                    <button
                      type="button"
                      className="db-btn-green mt-3"
                      style={{ width:"100%", justifyContent:"center", padding:"12px 14px", borderRadius:12 }}
                      onClick={sendTestMessage}
                      disabled={!settings.whatsapp_enabled || !twilioReady || testing || !testPhone.trim()}
                    >
                      {testing
                        ? <><span className="spinner-border spinner-border-sm me-2" />Sending test…</>
                        : <><i className="bi bi-whatsapp me-1" />Send test message</>}
                    </button>
                  </div>
                </div>
                  </>
                )}
              </div>

              {/* RIGHT — Broadcast */}
              <div className="col-12 col-lg-6">
                <SectionHeading icon="megaphone" title="Broadcast Notifications" subtitle="Send results, fee reminders or custom messages to parents." />

                <div className="db-panel">
                  <div className="db-panel-head">
                    <div>
                      <p className="db-panel-title">Send broadcast</p>
                      <p className="db-panel-sub">Choose a type and fill the required fields.</p>
                    </div>
                    <span className="db-pill" style={{ background:"rgba(0,0,0,0.04)", color:"#7a6a5a" }}>
                      <i className="bi bi-broadcast me-1" />Broadcast
                    </span>
                  </div>

                  <div style={{ padding: 16 }}>
                    {!settings.whatsapp_enabled && (
                      <div className="wa-callout wa-callout-warn mb-3">
                        <i className="bi bi-exclamation-triangle me-1" />
                        Enable WhatsApp above to send broadcasts.
                      </div>
                    )}

                    {/* Type tabs */}
                    <div className="wa-tab-row">
                      {([
                        { type: "results"      as BroadcastType, icon: "file-earmark-text", label: "Results",       color: "green" },
                        { type: "fee_reminders"as BroadcastType, icon: "cash-coin",         label: "Fee Reminders", color: "amber" },
                        { type: "custom"       as BroadcastType, icon: "chat-quote",        label: "Custom",        color: "blue"  },
                      ] as const).map((t) => (
                        <button
                          key={t.type}
                          type="button"
                          className={`wa-tab ${broadcastType === t.type ? `active ${t.color}` : ""}`}
                          onClick={() => setBroadcastType(t.type)}
                          disabled={!settings.whatsapp_enabled || !twilioReady}
                        >
                          <i className={`bi bi-${t.icon}`} />{t.label}
                        </button>
                      ))}
                    </div>

                    {/* Results */}
                    {broadcastType === "results" && (
                      <div className="row g-3">
                        <div className="col-12">
                          <div className="wa-callout wa-callout-success">
                            <i className="bi bi-info-circle me-1" />
                            Generates a PDF result sheet per student and sends it to their linked parents.
                          </div>
                        </div>
                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold small mb-1">Term</label>
                          <select className="form-select" value={broadcastForm.term}
                            onChange={(e) => setBroadcastForm((p) => ({ ...p, term: e.target.value }))}
                            disabled={!settings.whatsapp_enabled || !twilioReady || broadcasting}>
                            <option value="">Select term…</option>
                            {terms.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                          </select>
                        </div>
                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold small mb-1">Academic Session</label>
                          <select className="form-select" value={broadcastForm.session}
                            onChange={(e) => setBroadcastForm((p) => ({ ...p, session: e.target.value }))}
                            disabled={!settings.whatsapp_enabled || !twilioReady || broadcasting}>
                            <option value="">Select academic session…</option>
                            {sessions.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                          </select>
                        </div>
                        <div className="col-12">
                          <label className="form-label fw-semibold small mb-1">Class</label>
                          <select className="form-select" value={broadcastForm.class_id}
                            onChange={(e) => setBroadcastForm((p) => ({ ...p, class_id: e.target.value }))}
                            disabled={!settings.whatsapp_enabled || !twilioReady || broadcasting}>
                            <option value="">Select class…</option>
                            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Fee reminders */}
                    {broadcastType === "fee_reminders" && (
                      <div className="wa-callout wa-callout-info">
                        <i className="bi bi-info-circle me-1" />
                        <strong>All overdue invoices</strong> will be queued. Parents with WhatsApp numbers will receive a reminder for each unpaid invoice past due date.
                      </div>
                    )}

                    {/* Custom */}
                    {broadcastType === "custom" && (
                      <div>
                        <div className="wa-callout wa-callout-info mb-3">
                          <i className="bi bi-info-circle me-1" />
                          Sends your message to <strong>all parents</strong> with a registered WhatsApp number.
                        </div>
                        <label className="form-label fw-semibold small mb-1">Message</label>
                        <textarea className="form-control" rows={5} value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          placeholder="Type your broadcast message here…"
                          maxLength={1000}
                          disabled={!settings.whatsapp_enabled || !twilioReady || broadcasting} />
                        <div className="d-flex justify-content-between mt-1">
                          <span className="db-muted" style={{ fontSize:12 }}>Supports WhatsApp *bold* and _italic_.</span>
                          <span className="db-muted" style={{ fontSize:12 }}>{customMessage.length}/1000</span>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      className="db-btn-green mt-3"
                      style={{ width:"100%", justifyContent:"center", padding:"12px 14px", borderRadius:12, fontWeight:700 }}
                      onClick={sendBroadcast}
                      disabled={!settings.whatsapp_enabled || !twilioReady || broadcasting}
                    >
                      {broadcasting
                        ? <><span className="spinner-border spinner-border-sm me-2" />Queueing…</>
                        : <><i className="bi bi-send-fill me-1" />
                          {broadcastType === "results" ? "Send result sheets"
                            : broadcastType === "fee_reminders" ? "Send fee reminders"
                            : "Send custom broadcast"}</>}
                    </button>

                    <div className="db-muted mt-2" style={{ fontSize:12 }}>
                      <i className="bi bi-info-circle me-1" />
                      Messages are queued and sent in the background. Large classes may take a few minutes.
                    </div>
                  </div>
                </div>

                {/* Queue stats */}
                {queueStats && (
                  <>
                    <SectionHeading icon="activity" title="Queue Status" subtitle="Pending and failed WhatsApp jobs." />
                    <div className="db-panel">
                      <div className="db-panel-head">
                        <div>
                          <p className="db-panel-title">Message queue</p>
                          <p className="db-panel-sub">Processed by Laravel queue worker.</p>
                        </div>
                        <span className="db-pill" style={{ background:"rgba(0,0,0,0.04)", color:"#7a6a5a" }}>
                          <i className="bi bi-layers me-1" />Queue
                        </span>
                      </div>
                      <div style={{ padding:16 }}>
                        <div className="wa-stat-row">
                          <div className="wa-stat-card">
                            <div className="wa-stat-num" style={{ color:"#2563eb" }}>{queueStats.pending}</div>
                            <div className="wa-stat-label">Pending</div>
                          </div>
                          <div className="wa-stat-card">
                            <div className="wa-stat-num" style={{ color: queueStats.failed > 0 ? "#ef4444" : "#22c55e" }}>
                              {queueStats.failed}
                            </div>
                            <div className="wa-stat-label">Failed</div>
                          </div>
                        </div>
                        {queueStats.failed > 0 && (
                          <div className="wa-callout wa-callout-warn mt-3">
                            <i className="bi bi-exclamation-triangle me-1" />
                            Some jobs failed. Run <code>php artisan queue:retry all</code> to retry.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* ✅ Updated checklist — no Twilio credential items */}
                <SectionHeading icon="check2-circle" title="Setup Checklist" subtitle="Steps to complete before going live." />
                <div className="db-panel">
                  <div className="db-panel-head">
                    <div>
                      <p className="db-panel-title">Checklist</p>
                      <p className="db-panel-sub">Complete these before sending to parents.</p>
                    </div>
                  </div>
                  <div style={{ padding:16 }}>
                    {[
                      { done: settings.whatsapp_monthly_limit !== 0, text: "School is on a plan that includes WhatsApp" },
                      { done: settings.whatsapp_enabled,             text: "WhatsApp notifications toggled ON" },
                      { done: false,                                  text: "Parents have WhatsApp numbers on their profiles" },
                      { done: false,                                  text: "Queue worker running (php artisan queue:work)" },
                      { done: false,                                  text: "Students are linked to their parents via the portal" },
                    ].map((item, i, arr) => (
                      <div key={i} style={{
                        display:"flex", alignItems:"center", gap:10, padding:"8px 0",
                        borderBottom: i < arr.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                      }}>
                        <div style={{
                          width:22, height:22, borderRadius:"50%", flexShrink:0, fontSize:12,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          background: item.done ? "rgba(34,197,94,0.14)" : "rgba(0,0,0,0.06)",
                          color: item.done ? "#16a34a" : "#9a8a7a",
                        }}>
                          <i className={`bi bi-${item.done ? "check" : "circle"}`} />
                        </div>
                        <span style={{ fontSize:13, color: item.done ? "#1a1a2e" : "#9a8a7a" }}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto"><Footer /></div>
          </main>
        </div>
      </div>
    </>
  );
}
