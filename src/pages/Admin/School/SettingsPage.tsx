// src/pages/Settings/SettingsPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";

type WhatsAppSettings = {
  enabled: boolean;
  feeReminders: boolean;
  activityNotices: boolean;
};

type AppSettings = {
  autoGenerateAdmissionNo: boolean;
  reportPrimaryColor: string;
  reportSecondaryColor: string;
  reportBackgroundColor: string;
  whatsapp: WhatsAppSettings;
};

type SchoolSettings = {
  schoolName: string;
  address: string;
  email: string | null;
  phone: string;
  prefix: string | null;
  customDomain: string | null;
  logo_url: string | null;
  principal_signature_url: string | null;
};

type SettingsResponse = {
  app_settings: AppSettings;
  school_settings: SchoolSettings;
};

type SaveErrors = Record<string, string[] | string>;




const clampPrefix = (v: string) => v.replace(/\s+/g, "").slice(0, 5).toUpperCase();

function fmtUrlLabel(url?: string | null) {
  if (!url) return "—";
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return url;
  }
}

function clampInt(n: any, min: number, max: number, fallback: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(x)));
}

function SectionHeading({ id, icon, title, subtitle }: { id?: string; icon: string; title: string; subtitle?: string }) {
  return (
    <div id={id} className="db-section-head">
      <div className="db-section-left">
        <div className="db-section-ico">
          <i className={`bi bi-${icon}`} />
        </div>
        <div>
          <div className="db-section-title">{title}</div>
          {subtitle ? <div className="db-section-sub">{subtitle}</div> : null}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { showSuccess, showError } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [app, setApp] = useState<AppSettings>({
    autoGenerateAdmissionNo: false,
    reportPrimaryColor: "#0d6efd",
    reportSecondaryColor: "#ffc107",
    reportBackgroundColor: "#ffffff",
    whatsapp: {
      enabled: false,
      feeReminders: false,
      activityNotices: false,
    },
  });

  type DomainRecord = {
  id: number;
  domain: string;
  status: "pending" | "verified" | "active" | "disabled" | "rejected";
  verification_token: string | null;
  verified_at: string | null;
  ownership_verified_at?: string | null;
  routing_verified_at?: string | null;
  activated_at?: string | null;
  last_checked_at?: string | null;
  last_error?: string | null;
};

type DomainInstructions = {
  ownership: { type: "TXT"; host: string; value: string };
  routing: { type: "CNAME"; host: string; value: string };
  portal_url: string;
};

// Add these to your component state
const [domainRecord, setDomainRecord] = useState<DomainRecord | null>(null);
const [domainInput,  setDomainInput]  = useState("");
const [domainBusy,   setDomainBusy]   = useState(false);
const [domainInstructions, setDomainInstructions] = useState<DomainInstructions | null>(null);

  const [school, setSchool] = useState<SchoolSettings>({
    schoolName: "",
    address: "",
    email: "",
    phone: "",
    prefix: "",
    customDomain: "",
    logo_url: null,
    principal_signature_url: null,
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const sigInputRef = useRef<HTMLInputElement | null>(null);

  const logoPreview = useMemo(() => (logoFile ? URL.createObjectURL(logoFile) : null), [logoFile]);
  const sigPreview = useMemo(() => (signatureFile ? URL.createObjectURL(signatureFile) : null), [signatureFile]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      if (sigPreview) URL.revokeObjectURL(sigPreview);
    };
  }, [logoPreview, sigPreview]);

  const parseBackendError = (err: any) => {
    const msg = err?.response?.data?.message || err?.message || "Something went wrong. Please try again.";
    const errors: SaveErrors | undefined = err?.response?.data?.errors;
    return { msg, errors };
  };

  const mapSettingsFromResponse = (data: SettingsResponse) => {
    setApp({
      autoGenerateAdmissionNo: !!data.app_settings.autoGenerateAdmissionNo,
      reportPrimaryColor: data.app_settings.reportPrimaryColor || "#0d6efd",
      reportSecondaryColor: data.app_settings.reportSecondaryColor || "#ffc107",
      reportBackgroundColor: data.app_settings.reportBackgroundColor || "#ffffff",
      whatsapp: {
        enabled: !!data.app_settings?.whatsapp?.enabled,
        feeReminders: !!data.app_settings?.whatsapp?.feeReminders,
        activityNotices: !!data.app_settings?.whatsapp?.activityNotices,
      },
    });

    setSchool({
      schoolName: data.school_settings.schoolName || "",
      address: data.school_settings.address || "",
      email: data.school_settings.email ?? "",
      phone: data.school_settings.phone || "",
      prefix: data.school_settings.prefix ?? "",
      customDomain: data.school_settings.customDomain ?? "",
      logo_url: data.school_settings.logo_url ?? null,
      principal_signature_url: data.school_settings.principal_signature_url ?? null,
    });
  };

  const openLogoPicker = () => logoInputRef.current?.click();
  const openSigPicker = () => sigInputRef.current?.click();

  const clearLogo = () => setLogoFile(null);
  const clearSignature = () => setSignatureFile(null);

  useEffect(() => {
    setLoading(true);

    Promise.all([
      authApi.get<SettingsResponse>("/get-settings"),
      authApi.get<{ data: DomainRecord | null; instructions: DomainInstructions | null }>("/settings/domain").catch(() => ({ data: { data: null, instructions: null } })),
    ])
      .then(([settingsRes, domainRes]) => {
        mapSettingsFromResponse(settingsRes.data);

        const dr = domainRes.data?.data ?? null;
        setDomainRecord(dr);
        setDomainInput(dr?.domain ?? "");
        setDomainInstructions(domainRes.data?.instructions ?? null);
      })
      .catch((err: any) => {
        console.error(err);
        showError?.("Failed to load settings. Please refresh.");
      })
      .finally(() => {
        setLoading(false);
        if (window.location.hash) {
          setTimeout(() => {
            const el = document.querySelector(window.location.hash);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 200);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateAutoAdmission = async (next: boolean) => {
    setApp((p) => ({ ...p, autoGenerateAdmissionNo: next }));

    try {
      const res = await authApi.post("/settings/auto-admission", {
        auto_admission: next ? 1 : 0,
      });

      if (res?.data?.message) showSuccess?.(res.data.message);
    } catch (err: any) {
      console.error(err);
      setApp((p) => ({ ...p, autoGenerateAdmissionNo: !next }));
      const { msg } = parseBackendError(err);
      showError?.(msg);
    }
  };




  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const fd = new FormData();
      fd.append("school_name", school.schoolName.trim());
      fd.append("address", school.address.trim());
      fd.append("phone", school.phone.trim());

      if (school.email) fd.append("email", String(school.email).trim());
      if (school.prefix) fd.append("prefix", clampPrefix(String(school.prefix)));

      fd.append("primary_color", app.reportPrimaryColor);
      fd.append("secondary_color", app.reportSecondaryColor);
      fd.append("background_color", app.reportBackgroundColor);
      fd.append("auto_admission", app.autoGenerateAdmissionNo ? "1" : "0");

      if (logoFile) fd.append("logo", logoFile);
      if (signatureFile) fd.append("principal_signature", signatureFile);

      const res = await authApi.post("/save-settings", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showSuccess?.(res?.data?.message || "Settings saved successfully.");

      const next = res?.data?.school_settings;
      if (next) {
        setSchool((p) => ({
          ...p,
          schoolName: next.school_name ?? p.schoolName,
          address: next.address ?? p.address,
          phone: next.phone ?? p.phone,
          email: next.email ?? p.email,
          prefix: next.prefix ?? p.prefix,
          customDomain: next.custom_domain ?? p.customDomain,
          logo_url: next.logo_url ?? p.logo_url,
          principal_signature_url: next.principal_signature_url ?? p.principal_signature_url,
        }));

        setApp((p) => ({
          ...p,
          reportPrimaryColor: next.primary_color ?? p.reportPrimaryColor,
          reportSecondaryColor: next.secondary_color ?? p.reportSecondaryColor,
          reportBackgroundColor: next.background_color ?? p.reportBackgroundColor,
          autoGenerateAdmissionNo:
            typeof next.auto_admission !== "undefined"
              ? String(next.auto_admission) === "1" || next.auto_admission === 1
              : p.autoGenerateAdmissionNo,
          whatsapp: {
            enabled:
              typeof next.whatsapp_enabled !== "undefined"
                ? String(next.whatsapp_enabled) === "1" || next.whatsapp_enabled === 1
                : p.whatsapp.enabled,
            feeReminders:
              typeof next.whatsapp_fee_reminders !== "undefined"
                ? String(next.whatsapp_fee_reminders) === "1" || next.whatsapp_fee_reminders === 1
                : p.whatsapp.feeReminders,
            activityNotices:
              typeof next.whatsapp_activity_notices !== "undefined"
                ? String(next.whatsapp_activity_notices) === "1" || next.whatsapp_activity_notices === 1
                : p.whatsapp.activityNotices,
          },
        }));
      }

      setLogoFile(null);
      setSignatureFile(null);


    } catch (err: any) {
      console.error(err);
      const { msg, errors } = parseBackendError(err);

      if (errors && typeof errors === "object") {
        const firstKey = Object.keys(errors)[0];
        const firstVal = (errors as any)[firstKey];
        const firstMsg = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
        showError?.(firstMsg || msg);
      } else {
        showError?.(msg);
      }
    } finally {
      setSaving(false);
    }
  };


  const registerDomain = async () => {
  if (!domainInput.trim()) return;
  setDomainBusy(true);
  try {
    const res = await authApi.post<{ data: DomainRecord; instructions: DomainInstructions }>("/settings/domain", {
      domain: domainInput.trim(),
    });
    setDomainRecord(res.data.data);
    setDomainInstructions(res.data.instructions);
    showSuccess?.("Domain registered. Add the TXT and CNAME records shown below.");
  } catch (err: any) {
    const { msg } = parseBackendError(err);
    showError?.(msg);
  } finally {
    setDomainBusy(false);
  }
};

const verifyDomain = async () => {
  if (!domainRecord) return;
  setDomainBusy(true);
  try {
    const res = await authApi.post<{ data: DomainRecord; instructions: DomainInstructions }>("/settings/domain/verify", {
      domain_id: domainRecord.id,
    });
    setDomainRecord(res.data.data);
    setDomainInstructions(res.data.instructions);
    showSuccess?.("Ownership verified. Activate the portal after the CNAME has propagated.");
  } catch (err: any) {
    const { msg } = parseBackendError(err);
    showError?.(msg);
  } finally {
    setDomainBusy(false);
  }
};

const activateDomain = async () => {
  if (!domainRecord) return;
  setDomainBusy(true);
  try {
    const res = await authApi.post<{ data: DomainRecord; instructions: DomainInstructions }>("/settings/domain/activate", {
      domain_id: domainRecord.id,
    });
    setDomainRecord(res.data.data);
    setDomainInstructions(res.data.instructions);
    showSuccess?.("Domain activated. Redirecting to the school portal login.");
    window.location.assign(`${res.data.instructions.portal_url.replace(/\/+$/, "")}/login`);
  } catch (err: any) {
    const { msg } = parseBackendError(err);
    showError?.(msg);
  } finally {
    setDomainBusy(false);
  }
};

const removeDomain = async () => {
  if (!domainRecord) return;
  setDomainBusy(true);
  try {
    await authApi.delete(`/settings/domain/${domainRecord.id}`);
    setDomainRecord(null);
    setDomainInput("");
    setDomainInstructions(null);
    showSuccess?.("Domain removed.");
  } catch (err: any) {
    const { msg } = parseBackendError(err);
    showError?.(msg);
  } finally {
    setDomainBusy(false);
  }
};

  const refreshSettings = async () => {
    setLoading(true);
    try {
      const [settingsRes] = await Promise.all([
        authApi.get<SettingsResponse>("/get-settings"),
      ]);
      mapSettingsFromResponse(settingsRes.data);

      setLogoFile(null);
      setSignatureFile(null);
      showSuccess?.("Settings refreshed.");
    } catch (err) {
      console.error(err);
      showError?.("Failed to refresh settings.");
    } finally {
      setLoading(false);
    }
  };

  const whatsappEnabled = app.whatsapp.enabled;
  const canSave = !loading && !saving;
  const feeBusy = loading || saving;

  return (
    <>
      <style>{`
        /* Modern SaaS styles */
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .db-main { background: #F8FAFC; min-height: 100vh; font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; padding: 24px 28px 0; }
        .db-hero { background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%); border-radius: 18px; padding: 32px 36px; position: relative; overflow: hidden; margin: 10px 0 24px; box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15); }
        .db-hero-glow { position: absolute; top: -60px; right: -60px; width: 320px; height: 320px; border-radius: 50%; background: radial-gradient(circle, rgba(217, 119, 6, 0.15) 0%, transparent 65%); pointer-events: none; }
        .db-hero-glow2 { position: absolute; bottom: -40px; left: 30%; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(37, 99, 235, 0.10) 0%, transparent 70%); pointer-events: none; }
        .db-hero-inner { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 32px; flex-wrap: wrap; }
        @media (min-width: 768px) { .db-hero-inner { flex-wrap: nowrap; } }
        .db-session-badge { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #FBBF24; background: rgba(217, 119, 6, 0.20); border: 1px solid rgba(217, 119, 6, 0.35); border-radius: 100px; padding: 4px 12px; margin-bottom: 12px; }
        .db-session-dot { width: 6px; height: 6px; border-radius: 50%; background: #10B981; animation: dbPulse 2s ease infinite; }
        @keyframes dbPulse { 0%,100% { opacity: 1; transform: scale(1);} 50% { opacity: 0.4; transform: scale(1.5);} }
        .db-greeting { font-size: 26px; font-weight: 800; color: #fff; line-height: 1.1; margin-bottom: 8px; }
        .db-greeting em { font-style: normal; color: #FBBF24; }
        .db-hero-sub { font-size: 13.5px; color: #CBD5E1; line-height: 1.6; max-width: 620px; margin-bottom: 20px; }
        .db-hero-btns { display: flex; gap: 10px; flex-wrap: wrap; }
        .db-btn-gold { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; font-size: 13px; font-weight: 700; color: #FFFFFF; background: #D97706; border: none; border-radius: 10px; cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
        .db-btn-gold:hover { background: #B45309; transform: translateY(-1px); color: #FFFFFF; }
        .db-btn-gold:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
        .db-btn-outline { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; font-size: 13px; font-weight: 600; color: #FFFFFF; background: rgba(255, 255, 255, 0.10); border: 1px solid rgba(255, 255, 255, 0.20); border-radius: 10px; cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
        .db-btn-outline:hover { background: rgba(255, 255, 255, 0.18); color: #fff; }
        .db-btn-outline:disabled { opacity: 0.55; cursor: not-allowed; }
        .db-hero-stat-card { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); backdrop-filter: blur(8px); border-radius: 14px; padding: 20px 24px; min-width: 280px; margin-left: auto; align-self: flex-end; }
        .db-hero-stat-row { display: flex; flex-direction: column; gap: 10px; }
        .db-hero-stat-item { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .db-hero-stat-label { font-size: 12px; font-weight: 400; color: #CBD5E1; }
        .db-hero-stat-val { font-size: 18px; font-weight: 800; color: #FBBF24; }
        .db-hero-stat-sep { height: 1px; background: rgba(255, 255, 255, 0.08); }

        .db-panel { background: #fff; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(15,39,68,0.03); margin-bottom: 24px; }
        .db-panel-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid #F1F5F9; gap: 12px; flex-wrap: wrap; }
        .db-panel-title { font-size: 16px; font-weight: 700; color: #0F2744; margin: 0; }
        .db-panel-sub { font-size: 11.5px; font-weight: 400; color: #64748B; margin: 0; }
        .db-refresh-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; font-size: 12px; font-weight: 700; color: #0F2744; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
        .db-refresh-btn:hover { background: #E2E8F0; }
        .db-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .db-pill { display: inline-flex; align-items: center; font-size: 12px; font-weight: 800; padding: 6px 10px; border-radius: 999px; white-space: nowrap; border: 1px solid rgba(0,0,0,0.06); }
        .db-muted { color: #64748B; }
        .db-strong { font-weight: 800; color: #0F2744; }
        .db-card { border: 1px solid #E2E8F0; border-radius: 16px; background: #fff; box-shadow: 0 4px 16px rgba(15,39,68,0.03); }
        .db-kv { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 10px 14px; border: 1px solid #E2E8F0; border-radius: 12px; background: #F8FAFC; }
        .db-kv label { font-size: 12px; color: #64748B; font-weight: 600; }
        .db-kv b { color: #0F2744; }

        /* category headings */
        .db-section-head { margin: 16px 0 14px; display:flex; align-items:center; justify-content:space-between; }
        .db-section-left { display:flex; align-items:center; gap:12px; }
        .db-section-ico { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; background: rgba(15,39,68,0.08); border: 1px solid #E2E8F0; color:#0F2744; font-size: 18px; }
        .db-section-title { font-weight:800; color:#0F2744; font-size: 16px; line-height:1.2; }
        .db-section-sub { font-size: 12px; color:#64748B; margin-top:3px; }

        @media (max-width: 991.98px) { .db-main { padding: 18px 14px 0; } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Settings" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loading && <Loader message="Loading settings..." />}

            {/* HERO */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Settings - School & Messaging
                  </div>

                  <h1 className="db-greeting">
                    Configure <em>SchoolProfit</em>
                  </h1>

                  <p className="db-hero-sub">
                    Update your school profile, branding, auto admission number, WhatsApp preferences, and fee reminder automation.
                  </p>

                  <div className="db-hero-btns">
                    <button className="db-btn-gold" type="button" onClick={refreshSettings} disabled={loading || saving}>
                      <i className="bi bi-arrow-clockwise" />
                      Refresh
                    </button>

                    <button
                      className="db-btn-outline"
                      type="button"
                      onClick={() => updateAutoAdmission(!app.autoGenerateAdmissionNo)}
                      disabled={loading || saving}
                    >
                      <i className="bi bi-hash" />
                      Auto Admission: {app.autoGenerateAdmissionNo ? "ON" : "OFF"}
                    </button>

                    <button
                      className="db-btn-outline"
                      type="button"
                      onClick={() =>
                        setApp((p) => ({
                          ...p,
                          whatsapp: {
                            ...p.whatsapp,
                            enabled: !p.whatsapp.enabled,
                            ...(!p.whatsapp.enabled
                              ? {}
                              : {
                                  feeReminders: false,
                                  activityNotices: false,
                                }),
                          },
                        }))
                      }
                      disabled={loading || saving}
                    >
                      <i className="bi bi-whatsapp" />
                      WhatsApp: {whatsappEnabled ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>

                <div className="db-hero-stat-card d-none d-md-block">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c9a84c" }}>
                      Quick glance
                    </span>
                    <i className="bi bi-gear" style={{ color: "#64748b" }} />
                  </div>

                  <div className="db-hero-stat-row">
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">School</span>
                      <span className="db-hero-stat-val" style={{ fontSize: 14, fontFamily: "DM Sans" }}>
                        {school.schoolName || "—"}
                      </span>
                    </div>

                    <div className="db-hero-stat-sep" />

                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Domain</span>
                      <span className="db-hero-stat-val" style={{ fontSize: 14, fontFamily: "DM Sans" }}>
                        {fmtUrlLabel(school.customDomain) || "—"}
                      </span>
                    </div>

                    <div className="db-hero-stat-sep" />

                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Auto Admission</span>
                      <span className="db-pill" style={{ background: "rgba(201,168,76,0.14)", color: "#e8c97a" }}>
                        {app.autoGenerateAdmissionNo ? "ENABLED" : "DISABLED"}
                      </span>
                    </div>

                    <div className="db-hero-stat-sep" />

                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">WhatsApp</span>
                      <span
                        className="db-pill"
                        style={{
                          background: whatsappEnabled ? "rgba(34,197,94,0.14)" : "rgba(245,158,11,0.14)",
                          color: whatsappEnabled ? "#22c55e" : "#fbbf24",
                        }}
                      >
                        {whatsappEnabled ? "ON" : "OFF"}
                      </span>
                    </div>

                    <div className="db-hero-stat-sep" />

                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Fee Policy</span>
                      <span
                        className="db-pill"
                        style={{
                          background: "rgba(34,197,94,0.14)",
                          color: "#22c55e",
                        }}
                      >
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CONTENT */}
            <form onSubmit={saveSettings}>
              <div className="row g-3">
                {/* LEFT COLUMN */}
                <div className="col-12 col-lg-7">
                  <SectionHeading icon="building" title="School & Branding" subtitle="Identity, contact details, and assets used across the portal." />

                  {/* School profile */}
                  <div className="db-panel">
                    <div className="db-panel-head">
                      <div>
                        <p className="db-panel-title">School profile</p>
                        <p className="db-panel-sub">Identity information used across the portal.</p>
                      </div>

                      <span className="db-pill" style={{ background: "rgba(0,0,0,0.04)", color: "#7a6a5a" }}>
                        <i className="bi bi-building me-1" />
                        Profile
                      </span>
                    </div>

                    <div style={{ padding: 16 }}>
                      <div className="row g-3">
                        <div className="col-12 col-md-8">
                          <label className="form-label fw-semibold small mb-1">School name</label>
                          <input
                            className="form-control"
                            value={school.schoolName}
                            onChange={(e) => setSchool((p) => ({ ...p, schoolName: e.target.value }))}
                            placeholder="e.g. SchoolProfit Academy"
                            required
                            disabled={loading || saving}
                          />
                        </div>

                        <div className="col-12 col-md-4">
                          <label className="form-label fw-semibold small mb-1">Prefix</label>
                          <input
                            className="form-control"
                            value={school.prefix ?? ""}
                            onChange={(e) => setSchool((p) => ({ ...p, prefix: clampPrefix(e.target.value) }))}
                            placeholder="e.g. GQA"
                            maxLength={5}
                            disabled={loading || saving}
                          />
                          <div className="db-muted" style={{ fontSize: 12, marginTop: 6 }}>
                            Max 5 chars
                          </div>
                        </div>

                        <div className="col-12">
                          <label className="form-label fw-semibold small mb-1">Address</label>
                          <input
                            className="form-control"
                            value={school.address}
                            onChange={(e) => setSchool((p) => ({ ...p, address: e.target.value }))}
                            placeholder="School address"
                            required
                            disabled={loading || saving}
                          />
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold small mb-1">Email</label>
                          <input
                            className="form-control"
                            value={school.email ?? ""}
                            onChange={(e) => setSchool((p) => ({ ...p, email: e.target.value }))}
                            placeholder="school@email.com"
                            type="email"
                            disabled={loading || saving}
                          />
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold small mb-1">Phone</label>
                          <input
                            className="form-control"
                            value={school.phone}
                            onChange={(e) => setSchool((p) => ({ ...p, phone: e.target.value }))}
                            placeholder="e.g. 080..."
                            required
                            disabled={loading || saving}
                          />
                        </div>

                                      <div className="col-12">
                  <label className="form-label fw-semibold small mb-1">Custom domain</label>

                  {/* Status pill */}
                  {domainRecord && (
                    <div style={{ marginBottom: 8 }}>
                      <span
                        className="db-pill"
                        style={{
                          background:
                            domainRecord.status === "active" ? "rgba(34,197,94,0.14)"
                            : ["pending", "verified"].includes(domainRecord.status) ? "rgba(245,158,11,0.14)"
                            : "rgba(239,68,68,0.14)",
                          color:
                            domainRecord.status === "active" ? "#16a34a"
                            : ["pending", "verified"].includes(domainRecord.status) ? "#d97706"
                            : "#dc2626",
                        }}
                      >
                        <i className={`bi bi-${
                          domainRecord.status === "active" ? "shield-check"
                          : ["pending", "verified"].includes(domainRecord.status) ? "hourglass-split"
                          : "x-circle"
                        } me-1`} />
                        {domainRecord.status.charAt(0).toUpperCase() + domainRecord.status.slice(1)}
                      </span>
                    </div>
                  )}

                  {/* Input + register button */}
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-globe2" />
                    </span>
                    <input
                      className="form-control"
                      value={domainInput}
                      onChange={(e) => setDomainInput(e.target.value)}
                      placeholder="e.g. portal.yourschool.com"
                      disabled={domainBusy || !!domainRecord}
                    />
                    {!domainRecord ? (
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={registerDomain}
                        disabled={domainBusy || !domainInput.trim()}
                      >
                        {domainBusy ? <span className="spinner-border spinner-border-sm" /> : "Register"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={removeDomain}
                        disabled={domainBusy}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* TXT record instructions — shown when pending */}
                  {domainRecord && domainRecord.status !== "active" && domainInstructions && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "12px 14px",
                        background: "rgba(245,158,11,0.06)",
                        border: "1px solid rgba(245,158,11,0.20)",
                        borderRadius: 12,
                        fontSize: 12.5,
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 8, color: "#92400e" }}>
                        <i className="bi bi-info-circle me-1" />
                        Add both DNS records at your domain registrar:
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {[
                          { label: "TXT host", value: domainInstructions.ownership.host },
                          { label: "TXT value", value: domainInstructions.ownership.value },
                          { label: "CNAME host", value: domainInstructions.routing.host },
                          { label: "CNAME value", value: domainInstructions.routing.value },
                        ].map(({ label, value }) => (
                          <div
                            key={label}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              background: "#fff",
                              border: "1px solid rgba(0,0,0,0.07)",
                              borderRadius: 8,
                              padding: "6px 10px",
                            }}
                          >
                            <span style={{ width: 86, fontSize: 10, color: "#9a8a7a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              {label}
                            </span>
                            <code style={{ flex: 1, fontSize: 12, wordBreak: "break-all", color: "#1a1a2e" }}>
                              {value}
                            </code>
                            <button
                              type="button"
                              className="db-refresh-btn"
                              style={{ padding: "3px 8px", fontSize: 11 }}
                              onClick={() => navigator.clipboard.writeText(value)}
                            >
                              <i className="bi bi-copy" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {domainRecord.status === "pending" ? <button
                        type="button"
                        className="db-btn-gold"
                        style={{ marginTop: 12, width: "100%", justifyContent: "center", borderRadius: 10 }}
                        onClick={verifyDomain}
                        disabled={domainBusy}
                      >
                        {domainBusy
                          ? <><span className="spinner-border spinner-border-sm me-2" />Verifying…</>
                          : <><i className="bi bi-patch-check me-1" />Verify domain</>
                        }
                      </button> : <button
                        type="button"
                        className="db-btn-gold"
                        style={{ marginTop: 12, width: "100%", justifyContent: "center", borderRadius: 10 }}
                        onClick={activateDomain}
                        disabled={domainBusy}
                      >
                        {domainBusy
                          ? <><span className="spinner-border spinner-border-sm me-2" />Checking routing…</>
                          : <><i className="bi bi-globe-check me-1" />Activate portal domain</>
                        }
                      </button>}
                    </div>
                  )}

                  {/* Success state */}
                  {domainRecord?.status === "active" && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: "10px 12px",
                        background: "rgba(34,197,94,0.06)",
                        border: "1px solid rgba(34,197,94,0.18)",
                        borderRadius: 10,
                        fontSize: 12.5,
                        color: "#166534",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <i className="bi bi-shield-check" />
                      <span>
                        <strong>{domainRecord.domain}</strong> is active. Users can now open the SchoolProfit portal through this domain.
                      </span>
                    </div>
                  )}

                  <div className="db-muted" style={{ fontSize: 12, marginTop: 6 }}>
                    Domain verification uses a DNS TXT record. Changes may take up to 24–48 hrs to propagate.
                  </div>
                </div>
                      </div>
                    </div>
                  </div>

                  {/* Uploads */}
                  <div className="db-panel">
                    <div className="db-panel-head">
                      <div>
                        <p className="db-panel-title">Branding assets</p>
                        <p className="db-panel-sub">Upload logo and principal signature (optional).</p>
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button className="db-refresh-btn" type="button" onClick={openLogoPicker} disabled={loading || saving}>
                          <i className="bi bi-upload" />
                          Logo
                        </button>
                        <button className="db-refresh-btn" type="button" onClick={openSigPicker} disabled={loading || saving}>
                          <i className="bi bi-pen" />
                          Signature
                        </button>
                      </div>
                    </div>

                    <div style={{ padding: 16 }}>
                      <div className="row g-3">
                        {/* Logo */}
                        <div className="col-12 col-md-6">
                          <div className="db-card" style={{ padding: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                              <div>
                                <div className="db-strong" style={{ fontWeight: 800 }}>
                                  School logo
                                </div>
                                <div className="db-muted" style={{ fontSize: 12 }}>
                                  PNG/JPG • optional
                                </div>
                              </div>

                              <button
                                type="button"
                                className="db-refresh-btn"
                                onClick={clearLogo}
                                disabled={!logoFile || loading || saving}
                                title="Clear selected logo"
                              >
                                <i className="bi bi-x-circle" />
                                Clear
                              </button>
                            </div>

                            <div
                              style={{
                                marginTop: 12,
                                height: 150,
                                borderRadius: 12,
                                background: "#faf8f5",
                                border: "1px dashed rgba(0,0,0,0.14)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                              }}
                            >
                              {logoPreview || school.logo_url ? (
                                <img
                                  src={logoPreview || school.logo_url || ""}
                                  alt="Logo preview"
                                  style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
                                />
                              ) : (
                                <div className="db-muted" style={{ textAlign: "center" }}>
                                  <i className="bi bi-building" style={{ fontSize: 28, display: "block", marginBottom: 6 }} />
                                  No logo uploaded
                                </div>
                              )}
                            </div>

                            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                              <button
                                type="button"
                                className="db-refresh-btn"
                                style={{ flex: 1, justifyContent: "center", padding: "10px 12px", borderRadius: 12 }}
                                onClick={openLogoPicker}
                                disabled={loading || saving}
                              >
                                <i className="bi bi-upload" />
                                Choose file
                              </button>
                              <span className="db-pill" style={{ background: "rgba(0,0,0,0.04)", color: "#7a6a5a" }}>
                                {logoFile ? "Selected" : school.logo_url ? "Uploaded" : "—"}
                              </span>
                            </div>

                            <input
                              ref={logoInputRef}
                              type="file"
                              accept="image/*"
                              className="d-none"
                              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                            />
                          </div>
                        </div>

                        {/* Signature */}
                        <div className="col-12 col-md-6">
                          <div className="db-card" style={{ padding: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                              <div>
                                <div className="db-strong" style={{ fontWeight: 800 }}>
                                  Principal signature
                                </div>
                                <div className="db-muted" style={{ fontSize: 12 }}>
                                  PNG/JPG • optional
                                </div>
                              </div>

                              <button
                                type="button"
                                className="db-refresh-btn"
                                onClick={clearSignature}
                                disabled={!signatureFile || loading || saving}
                                title="Clear selected signature"
                              >
                                <i className="bi bi-x-circle" />
                                Clear
                              </button>
                            </div>

                            <div
                              style={{
                                marginTop: 12,
                                height: 150,
                                borderRadius: 12,
                                background: "#faf8f5",
                                border: "1px dashed rgba(0,0,0,0.14)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                              }}
                            >
                              {sigPreview || school.principal_signature_url ? (
                                <img
                                  src={sigPreview || school.principal_signature_url || ""}
                                  alt="Signature preview"
                                  style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
                                />
                              ) : (
                                <div className="db-muted" style={{ textAlign: "center" }}>
                                  <i className="bi bi-pen" style={{ fontSize: 28, display: "block", marginBottom: 6 }} />
                                  No signature uploaded
                                </div>
                              )}
                            </div>

                            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                              <button
                                type="button"
                                className="db-refresh-btn"
                                style={{ flex: 1, justifyContent: "center", padding: "10px 12px", borderRadius: 12 }}
                                onClick={openSigPicker}
                                disabled={loading || saving}
                              >
                                <i className="bi bi-upload" />
                                Choose file
                              </button>
                              <span className="db-pill" style={{ background: "rgba(0,0,0,0.04)", color: "#7a6a5a" }}>
                                {signatureFile ? "Selected" : school.principal_signature_url ? "Uploaded" : "—"}
                              </span>
                            </div>

                            <input
                              ref={sigInputRef}
                              type="file"
                              accept="image/*"
                              className="d-none"
                              onChange={(e) => setSignatureFile(e.target.files?.[0] || null)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="db-muted" style={{ marginTop: 12, fontSize: 12.5 }}>
                        <i className="bi bi-info-circle me-1" />
                        Uploads are optional. New files replace old ones automatically.
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="col-12 col-lg-5">
                  <SectionHeading icon="person-badge" title="Student Setup" subtitle="Control how new student records are created." />

                  <div className="db-panel">
                    <div className="db-panel-head">
                      <div>
                        <p className="db-panel-title">Admission number</p>
                        <p className="db-panel-sub">Choose whether the system should create admission numbers automatically.</p>
                      </div>

                      <span className="db-pill" style={{ background: "rgba(0,0,0,0.04)", color: "#7a6a5a" }}>
                        <i className="bi bi-person-vcard me-1" />
                        Students
                      </span>
                    </div>

                    <div style={{ padding: 16 }}>
                      <div className="db-kv">
                        <div>
                          <label className="d-block">Auto-generate admission number</label>
                          <b>{app.autoGenerateAdmissionNo ? "Enabled" : "Disabled"}</b>
                        </div>

                        <div className="form-check form-switch m-0">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            checked={app.autoGenerateAdmissionNo}
                            onChange={(e) => updateAutoAdmission(e.target.checked)}
                            disabled={loading || saving}
                          />
                        </div>
                      </div>

                      <div className="db-muted" style={{ fontSize: 12, marginTop: 8 }}>
                        This toggle applies instantly without clicking Save.
                      </div>
                    </div>
                  </div>

                  <SectionHeading icon="chat-dots" title="Notifications" subtitle="Control channels and what messages get sent." />

                  {/* WhatsApp */}
                  {false && (
                  <div className="db-panel">
                    <div className="db-panel-head">
                      <div>
                        <p className="db-panel-title">WhatsApp notifications</p>
                        <p className="db-panel-sub">Enable and choose what messages to send.</p>
                      </div>

                      <span className="db-pill" style={{ background: "rgba(0,0,0,0.04)", color: "#7a6a5a" }}>
                        <i className="bi bi-whatsapp me-1" />
                        WhatsApp
                      </span>
                    </div>

                    <div style={{ padding: 16 }}>
                      <div className="db-kv">
                        <div>
                          <label className="d-block">WhatsApp enabled</label>
                          <b>{whatsappEnabled ? "Enabled" : "Disabled"}</b>
                        </div>

                        <div className="form-check form-switch m-0">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            checked={whatsappEnabled}
                            onChange={(e) =>
                              setApp((p) => ({
                                ...p,
                                whatsapp: {
                                  ...p.whatsapp,
                                  enabled: e.target.checked,
                                  ...(e.target.checked ? {} : { feeReminders: false, activityNotices: false }),
                                },
                              }))
                            }
                            disabled={loading || saving}
                          />
                        </div>
                      </div>

                      <div className="row g-3 mt-2">
                        {[
                          {
                            key: "feeReminders" as const,
                            title: "Fee reminders",
                            desc: "Send fee invoice reminders to parents.",
                            icon: "cash-coin",
                          },
                          {
                            key: "activityNotices" as const,
                            title: "School activities",
                            desc: "Send activity notices/broadcasts to parents.",
                            icon: "megaphone",
                          },
                        ].map((item) => (
                          <div className="col-12" key={item.key}>
                            <div className="db-card" style={{ padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                <div
                                  style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 12,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: "rgba(201,168,76,0.14)",
                                    color: "#c9a84c",
                                    border: "1px solid rgba(0,0,0,0.06)",
                                  }}
                                >
                                  <i className={`bi bi-${item.icon}`} />
                                </div>

                                <div>
                                  <div className="db-strong" style={{ fontWeight: 800 }}>
                                    {item.title}
                                  </div>
                                  <div className="db-muted" style={{ fontSize: 12.5 }}>
                                    {item.desc}
                                  </div>
                                </div>
                              </div>

                              <div className="form-check form-switch m-0">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  role="switch"
                                  checked={(app.whatsapp as any)[item.key]}
                                  disabled={!whatsappEnabled || loading || saving}
                                  onChange={(e) =>
                                    setApp((p) => ({
                                      ...p,
                                      whatsapp: { ...p.whatsapp, [item.key]: e.target.checked } as WhatsAppSettings,
                                    }))
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="db-muted" style={{ marginTop: 12, fontSize: 12.5 }}>
                        <i className="bi bi-info-circle me-1" />
                        WhatsApp sending typically requires approved templates and sufficient wallet balance.
                      </div>
                    </div>
                  </div>
                  )}

                  <div className="db-panel">
                    <div className="db-panel-head">
                      <div>
                        <p className="db-panel-title">WhatsApp notifications</p>
                        <p className="db-panel-sub">Connection, access and message credits are managed in WhatsApp Settings.</p>
                      </div>
                      <span className="db-pill" style={{ background: whatsappEnabled ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)", color: whatsappEnabled ? "#15803d" : "#b45309" }}>
                        <i className="bi bi-whatsapp me-1" />
                        {whatsappEnabled ? "Connected" : "Disabled"}
                      </span>
                    </div>
                    <div style={{ padding: 16 }}>
                      <div className="db-kv">
                        <div>
                          <label className="d-block">One WhatsApp configuration</label>
                          <b>Twilio with subscription message credits</b>
                        </div>
                        <a className="db-btn-gold" href="/settings/whatsapp">
                          <i className="bi bi-gear me-1" /> Manage WhatsApp
                        </a>
                      </div>
                      <div className="db-muted" style={{ marginTop: 12, fontSize: 12.5 }}>
                        <i className="bi bi-info-circle me-1" />
                        Select WhatsApp as a fee-reminder channel in the automation section below.
                      </div>
                    </div>
                  </div>

                  <SectionHeading id="fee-access" icon="lock" title="Fee & Installment Policy" subtitle="Result access controls, CBT exam gates, and installment payment rules." />

                  <div className="db-panel" style={{ padding: "20px 24px", marginBottom: 24 }}>
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                      <div>
                        <h4 className="fw-bold text-dark mb-1" style={{ fontSize: 15.5 }}>
                          <i className="bi bi-pie-chart-fill text-warning me-2" />
                          Fee Policy & Installment Controls (Dedicated Page)
                        </h4>
                        <p className="db-muted mb-0" style={{ fontSize: 13 }}>
                          Configure 70/30 installment payment splits, debt prevention schedules, result locks, and CBT exam gatekeepers on the dedicated Fee Policy page.
                        </p>
                      </div>
                      <Link
                        to="/fees/policy"
                        className="db-btn-gold"
                        style={{ textDecoration: "none" }}
                      >
                        <i className="bi bi-box-arrow-up-right" /> Open Fee Policy Page
                      </Link>
                    </div>
                  </div>



                  <SectionHeading icon="shield-check" title="Actions" subtitle="Save or refresh your configuration safely." />

                  {/* Save Actions */}
                  <div className="db-panel">
                    <div className="db-panel-head">
                      <div>
                        <p className="db-panel-title">Save changes</p>
                        <p className="db-panel-sub">Uploads are included when you click Save.</p>
                      </div>

                      <span className="db-pill" style={{ background: "rgba(0,0,0,0.04)", color: "#7a6a5a" }}>
                        <i className="bi bi-shield-check me-1" />
                        Secure
                      </span>
                    </div>

                    <div style={{ padding: 16 }}>
                      <button
                        type="submit"
                        className="db-btn-gold"
                        style={{ width: "100%", justifyContent: "center", padding: "12px 14px", borderRadius: 12, fontWeight: 800 }}
                        disabled={!canSave}
                      >
                        {saving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Saving…
                          </>
                        ) : (
                          <>
                            <i className="bi bi-save2 me-1" />
                            Save settings
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className="db-refresh-btn"
                        style={{ width: "100%", justifyContent: "center", marginTop: 10, padding: "12px 14px", borderRadius: 12 }}
                        disabled={saving || loading}
                        onClick={refreshSettings}
                      >
                        <i className="bi bi-arrow-clockwise me-1" />
                        Refresh settings
                      </button>

                      <div className="db-muted" style={{ marginTop: 12, fontSize: 12.5 }}>
                        <i className="bi bi-info-circle me-1" />
                        Tip: if you changed files, “Save” will upload them and update stored URLs.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            <div className="mt-auto">
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
