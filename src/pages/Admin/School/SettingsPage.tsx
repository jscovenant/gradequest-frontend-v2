// src/pages/Settings/SettingsPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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

type FeeReminderSettings = {
  enabled: boolean;
  intervalDays: number; // every X days
  maxCount: number; // 0 = unlimited (if backend supports) OR max reminders
  sendEmail: boolean;
  sendWhatsApp: boolean;
  quietHoursStart: string | null; // "22:00"
  quietHoursEnd: string | null; // "06:00"
};

type FeeReminderResponse = {
  fee_reminders_enabled: boolean;
  interval_days: number;
  max_count: number;
  send_email: boolean;
  send_whatsapp: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
};

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

function SectionHeading({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="db-section-head">
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
  const [savingFee, setSavingFee] = useState(false);

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
  status: "pending" | "verified" | "active" | "rejected";
  verification_token: string | null;
  verified_at: string | null;
};

// Add these to your component state
const [domainRecord, setDomainRecord] = useState<DomainRecord | null>(null);
const [domainInput,  setDomainInput]  = useState("");
const [domainBusy,   setDomainBusy]   = useState(false);

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

  const [feeReminder, setFeeReminder] = useState<FeeReminderSettings>({
    enabled: true,
    intervalDays: 5,
    maxCount: 6,
    sendEmail: true,
    sendWhatsApp: false,
    quietHoursStart: null,
    quietHoursEnd: null,
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

  const mapFeeReminderFromResponse = (data: FeeReminderResponse) => {
    setFeeReminder({
      enabled: !!data.fee_reminders_enabled,
      intervalDays: clampInt(data.interval_days, 1, 60, 5),
      maxCount: clampInt(data.max_count, 0, 50, 6),
      sendEmail: !!data.send_email,
      sendWhatsApp: !!data.send_whatsapp,
      quietHoursStart: data.quiet_hours_start ?? null,
      quietHoursEnd: data.quiet_hours_end ?? null,
    });
  };

  const openLogoPicker = () => logoInputRef.current?.click();
  const openSigPicker = () => sigInputRef.current?.click();

  const clearLogo = () => setLogoFile(null);
  const clearSignature = () => setSignatureFile(null);

  useEffect(() => {
    setLoading(true);

   // In your existing useEffect, add a third Promise
Promise.all([
  authApi.get<SettingsResponse>("/get-settings"),
  authApi.get<FeeReminderResponse>("/settings/fee-reminders"),
  authApi.get<{ data: DomainRecord | null }>("/settings/domain").catch(() => ({ data: { data: null } })),
])
  .then(([settingsRes, feeRes, domainRes]) => {
    mapSettingsFromResponse(settingsRes.data);
    mapFeeReminderFromResponse(feeRes.data);

    const dr = domainRes.data?.data ?? null;
    setDomainRecord(dr);
    setDomainInput(dr?.domain ?? "");
  })
      .catch((err: any) => {
        console.error(err);
        showError?.("Failed to load settings. Please refresh.");
      })
      .finally(() => setLoading(false));
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

  const saveFeeReminderSettings = async () => {
    setSavingFee(true);
    try {
      const payload = {
        fee_reminders_enabled: feeReminder.enabled,
        interval_days: clampInt(feeReminder.intervalDays, 1, 60, 5),
        max_count: clampInt(feeReminder.maxCount, 0, 50, 6),
        send_email: !!feeReminder.sendEmail,
        send_whatsapp: !!feeReminder.sendWhatsApp,
        quiet_hours_start: feeReminder.quietHoursStart || null,
        quiet_hours_end: feeReminder.quietHoursEnd || null,
      };

      const res = await authApi.put("/settings/fee-reminders", payload);
      showSuccess?.(res?.data?.message || "Fee reminder settings updated.");
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
      setSavingFee(false);
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

      // WhatsApp settings -> backend expects snake_case
      fd.append("whatsapp_enabled", app.whatsapp.enabled ? "1" : "0");
      fd.append("whatsapp_fee_reminders", app.whatsapp.feeReminders ? "1" : "0");
      fd.append("whatsapp_activity_notices", app.whatsapp.activityNotices ? "1" : "0");

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

      // Also persist fee reminder settings (separate endpoint)
      // (If you prefer "Save All", keep it here. Otherwise user can use the "Save fee reminder setup" button.)
      await saveFeeReminderSettings();
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
    const res = await authApi.post<{ data: DomainRecord }>("/settings/domain", {
      domain: domainInput.trim(),
    });
    setDomainRecord(res.data.data);
    showSuccess?.("Domain registered. Add the TXT record to your DNS then click Verify.");
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
    const res = await authApi.post<{ data: DomainRecord }>("/settings/domain/verify", {
      domain_id: domainRecord.id,
    });
    setDomainRecord(res.data.data);
    showSuccess?.("Domain verified successfully!");
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
      const [settingsRes, feeRes] = await Promise.all([
        authApi.get<SettingsResponse>("/get-settings"),
        authApi.get<FeeReminderResponse>("/settings/fee-reminders"),
      ]);
      mapSettingsFromResponse(settingsRes.data);
      mapFeeReminderFromResponse(feeRes.data);

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
  const feeBusy = loading || saving || savingFee;

  return (
    <>
      <style>{`
        /* existing styles */
        .db-main { background: var(--bs-body-bg, #f5f1eb); min-height: 100vh; font-family: "DM Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 28px 28px 0; }
        .db-hero { background: #0f172a; border-radius: var(--bs-border-radius-lg, 16px); padding: 32px 36px; position: relative; overflow: hidden; margin: 10px 0 18px; border: 1px solid rgba(255,255,255,0.06); }
        .db-hero::before { content: ""; position: absolute; inset: 0; background-image: radial-gradient(circle, rgba(255, 255, 255, 0.045) 1px, transparent 1px); background-size: 24px 24px; pointer-events: none; }
        .db-hero-glow { position: absolute; top: -60px; right: -60px; width: 320px; height: 320px; border-radius: 50%; background: radial-gradient(circle, rgba(201, 168, 76, 0.10) 0%, transparent 65%); pointer-events: none; }
        .db-hero-glow2 { position: absolute; bottom: -40px; left: 30%; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(99, 102, 241, 0.07) 0%, transparent 70%); pointer-events: none; }
        .db-hero-inner { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 32px; flex-wrap: wrap; }
        @media (min-width: 768px) { .db-hero-inner { flex-wrap: nowrap; } }
        .db-session-badge { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: #e8c97a; background: rgba(201, 168, 76, 0.10); border: 1px solid rgba(201, 168, 76, 0.22); border-radius: 100px; padding: 4px 12px; margin-bottom: 14px; }
        .db-session-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; animation: dbPulse 2s ease infinite; }
        @keyframes dbPulse { 0%,100% { opacity: 1; transform: scale(1);} 50% { opacity: 0.4; transform: scale(1.5);} }
        .db-greeting { font-family: "Lora", Georgia, serif; font-size: clamp(22px, 2.5vw, 32px); font-weight: 700; color: #fff; line-height: 1.1; margin-bottom: 8px; }
        .db-greeting em { font-style: italic; color: #e8c97a; }
        .db-hero-sub { font-size: 13.5px; font-weight: 300; color: #64748b; line-height: 1.65; max-width: 620px; margin-bottom: 18px; }
        .db-hero-btns { display: flex; gap: 10px; flex-wrap: wrap; }
        .db-btn-gold { display: inline-flex; align-items: center; gap: 7px; padding: 10px 20px; font-family: "DM Sans", sans-serif; font-size: 13px; font-weight: 500; color: #0f172a; background: #c9a84c; border: none; border-radius: var(--bs-border-radius, 8px); cursor: pointer; transition: background 0.2s, transform 0.2s; white-space: nowrap; }
        .db-btn-gold:hover { background: #e8c97a; transform: translateY(-1px); }
        .db-btn-gold:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
        .db-btn-outline { display: inline-flex; align-items: center; gap: 7px; padding: 10px 20px; font-family: "DM Sans", sans-serif; font-size: 13px; font-weight: 400; color: rgba(255, 255, 255, 0.7); background: transparent; border: 1px solid rgba(255, 255, 255, 0.14); border-radius: var(--bs-border-radius, 8px); cursor: pointer; transition: background 0.2s, border-color 0.2s, color 0.2s; white-space: nowrap; }
        .db-btn-outline:hover { background: rgba(255, 255, 255, 0.06); color: #fff; border-color: rgba(255, 255, 255, 0.28); }
        .db-btn-outline:disabled { opacity: 0.55; cursor: not-allowed; }
        .db-hero-stat-card { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.09); backdrop-filter: blur(8px); border-radius: var(--bs-border-radius, 12px); padding: 20px 24px; min-width: 280px; margin-left: auto; align-self: flex-end; }
        .db-hero-stat-row { display: flex; flex-direction: column; gap: 10px; }
        .db-hero-stat-item { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .db-hero-stat-label { font-size: 12px; font-weight: 300; color: #64748b; }
        .db-hero-stat-val { font-family: "Lora", serif; font-size: 18px; font-weight: 700; color: #fff; }
        .db-hero-stat-sep { height: 1px; background: rgba(255, 255, 255, 0.06); }

        .db-panel { background: var(--bs-body-bg, #fff); border: 1px solid var(--bs-border-color, #ede8e0); border-radius: var(--bs-border-radius-lg, 14px); overflow: hidden; box-shadow: 0 2px 10px rgba(15,23,42,0.04); margin-bottom: 18px; }
        .db-panel-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 18px; border-bottom: 1px solid rgba(0, 0, 0, 0.06); gap: 12px; flex-wrap: wrap; }
        .db-panel-title { font-family: "Lora", serif; font-size: 16px; font-weight: 700; color: #1a1a2e; margin: 0; }
        .db-panel-sub { font-size: 11.5px; font-weight: 300; color: #9a8a7a; margin: 0; }
        .db-refresh-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; font-size: 12px; font-weight: 400; color: #7a6a5a; background: #f5f1eb; border: 1px solid #e5ddd3; border-radius: var(--bs-border-radius, 7px); cursor: pointer; transition: background 0.2s; white-space: nowrap; }
        .db-refresh-btn:hover { background: #ede8e0; }
        .db-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .db-pill { display: inline-flex; align-items: center; font-size: 12px; font-weight: 800; padding: 6px 10px; border-radius: 999px; white-space: nowrap; border: 1px solid rgba(0,0,0,0.06); }
        .db-muted { color: #9a8a7a; }
        .db-strong { font-weight: 900; color: #1a1a2e; }
        .db-card { border: 1px solid rgba(0,0,0,0.06); border-radius: 14px; background: #fff; box-shadow: 0 2px 10px rgba(15,23,42,0.04); }
        .db-kv { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 10px 12px; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; background: #faf8f5; }
        .db-kv label { font-size: 12px; color: #9a8a7a; }
        .db-kv b { color: #1a1a2e; }

        /* category headings */
        .db-section-head { margin: 10px 0 12px; display:flex; align-items:center; justify-content:space-between; }
        .db-section-left { display:flex; align-items:center; gap:12px; }
        .db-section-ico { width:40px; height:40px; border-radius:14px; display:flex; align-items:center; justify-content:center; background: rgba(15,23,42,0.06); border: 1px solid rgba(0,0,0,0.06); color:#0f172a; }
        .db-section-title { font-family:"Lora", serif; font-weight:800; color:#1a1a2e; font-size: 15px; line-height:1.1; }
        .db-section-sub { font-size: 12px; color:#9a8a7a; margin-top:4px; }

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
                    Settings — School, Reports & Messaging
                  </div>

                  <h1 className="db-greeting">
                    Configure <em>GradeQuest</em>
                  </h1>

                  <p className="db-hero-sub">
                    Update your school profile, branding, report theme, auto admission number, WhatsApp preferences, and fee reminder automation.
                  </p>

                  <div className="db-hero-btns">
                    <button className="db-btn-gold" type="button" onClick={refreshSettings} disabled={loading || saving || savingFee}>
                      <i className="bi bi-arrow-clockwise" />
                      Refresh
                    </button>

                    <button
                      className="db-btn-outline"
                      type="button"
                      onClick={() => updateAutoAdmission(!app.autoGenerateAdmissionNo)}
                      disabled={loading || saving || savingFee}
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
                      disabled={loading || saving || savingFee}
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
                      <span className="db-hero-stat-label">Fee Reminders</span>
                      <span
                        className="db-pill"
                        style={{
                          background: feeReminder.enabled ? "rgba(34,197,94,0.14)" : "rgba(245,158,11,0.14)",
                          color: feeReminder.enabled ? "#22c55e" : "#fbbf24",
                        }}
                      >
                        {feeReminder.enabled ? `ON • every ${feeReminder.intervalDays}d` : "OFF"}
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
                            placeholder="e.g. GradeQuest Academy"
                            required
                            disabled={loading || saving || savingFee}
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
                            disabled={loading || saving || savingFee}
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
                            disabled={loading || saving || savingFee}
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
                            disabled={loading || saving || savingFee}
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
                            disabled={loading || saving || savingFee}
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
                            domainRecord.status === "verified" ? "rgba(34,197,94,0.14)"
                            : domainRecord.status === "pending"  ? "rgba(245,158,11,0.14)"
                            : "rgba(239,68,68,0.14)",
                          color:
                            domainRecord.status === "verified" ? "#16a34a"
                            : domainRecord.status === "pending"  ? "#d97706"
                            : "#dc2626",
                        }}
                      >
                        <i className={`bi bi-${
                          domainRecord.status === "verified" ? "shield-check"
                          : domainRecord.status === "pending" ? "hourglass-split"
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
                  {domainRecord?.status === "pending" && domainRecord.verification_token && (
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
                        Add this DNS TXT record at your domain registrar, then click Verify:
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {[
                          { label: "Type",  value: "TXT" },
                          { label: "Host",  value: domainRecord.domain },
                          { label: "Value", value: domainRecord.verification_token },
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
                            <span style={{ width: 40, fontSize: 11, color: "#9a8a7a", textTransform: "uppercase", letterSpacing: "0.08em" }}>
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

                      <button
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
                      </button>
                    </div>
                  )}

                  {/* Success state */}
                  {domainRecord?.status === "verified" && (
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
                        <strong>{domainRecord.domain}</strong> is verified. Users can now log in via this domain.
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
                        <button className="db-refresh-btn" type="button" onClick={openLogoPicker} disabled={loading || saving || savingFee}>
                          <i className="bi bi-upload" />
                          Logo
                        </button>
                        <button className="db-refresh-btn" type="button" onClick={openSigPicker} disabled={loading || saving || savingFee}>
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
                                disabled={!logoFile || loading || saving || savingFee}
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
                                disabled={loading || saving || savingFee}
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
                                disabled={!signatureFile || loading || saving || savingFee}
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
                                disabled={loading || saving || savingFee}
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
                  <SectionHeading icon="palette" title="Reports" subtitle="Theme controls for result printing/export." />

                  <div className="db-panel">
                    <div className="db-panel-head">
                      <div>
                        <p className="db-panel-title">Report card theme</p>
                        <p className="db-panel-sub">Customize colors used in result printing/export.</p>
                      </div>

                      <span className="db-pill" style={{ background: "rgba(0,0,0,0.04)", color: "#7a6a5a" }}>
                        <i className="bi bi-palette me-1" />
                        Theme
                      </span>
                    </div>

                    <div style={{ padding: 16 }}>
                      <div className="row g-3">
                        <div className="col-12">
                          <label className="form-label fw-semibold small mb-1">Primary color</label>
                          <div className="d-flex align-items-center gap-2">
                            <input
                              type="color"
                              value={app.reportPrimaryColor}
                              onChange={(e) => setApp((p) => ({ ...p, reportPrimaryColor: e.target.value }))}
                              className="form-control form-control-color p-1"
                              style={{ width: 56, height: 42, borderRadius: 12 }}
                              disabled={loading || saving || savingFee}
                            />
                            <input
                              className="form-control"
                              value={app.reportPrimaryColor}
                              onChange={(e) => setApp((p) => ({ ...p, reportPrimaryColor: e.target.value }))}
                              disabled={loading || saving || savingFee}
                            />
                          </div>
                        </div>

                        <div className="col-12">
                          <label className="form-label fw-semibold small mb-1">Secondary color</label>
                          <div className="d-flex align-items-center gap-2">
                            <input
                              type="color"
                              value={app.reportSecondaryColor}
                              onChange={(e) => setApp((p) => ({ ...p, reportSecondaryColor: e.target.value }))}
                              className="form-control form-control-color p-1"
                              style={{ width: 56, height: 42, borderRadius: 12 }}
                              disabled={loading || saving || savingFee}
                            />
                            <input
                              className="form-control"
                              value={app.reportSecondaryColor}
                              onChange={(e) => setApp((p) => ({ ...p, reportSecondaryColor: e.target.value }))}
                              disabled={loading || saving || savingFee}
                            />
                          </div>
                        </div>

                        <div className="col-12">
                          <label className="form-label fw-semibold small mb-1">Background color</label>
                          <div className="d-flex align-items-center gap-2">
                            <input
                              type="color"
                              value={app.reportBackgroundColor}
                              onChange={(e) => setApp((p) => ({ ...p, reportBackgroundColor: e.target.value }))}
                              className="form-control form-control-color p-1"
                              style={{ width: 56, height: 42, borderRadius: 12 }}
                              disabled={loading || saving || savingFee}
                            />
                            <input
                              className="form-control"
                              value={app.reportBackgroundColor}
                              onChange={(e) => setApp((p) => ({ ...p, reportBackgroundColor: e.target.value }))}
                              disabled={loading || saving || savingFee}
                            />
                          </div>
                        </div>

                        <div className="col-12">
                          <div
                            className="db-card"
                            style={{
                              padding: 12,
                              background: app.reportBackgroundColor,
                              borderColor: "rgba(0,0,0,0.06)",
                            }}
                          >
                            <div
                              style={{
                                background: app.reportPrimaryColor,
                                borderRadius: 12,
                                padding: "10px 12px",
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <i className="bi bi-mortarboard-fill" />
                                <span style={{ fontWeight: 800 }}>Report Preview</span>
                              </div>
                              <span
                                className="db-pill"
                                style={{
                                  background: app.reportSecondaryColor,
                                  color: "#0f172a",
                                  borderColor: "rgba(0,0,0,0.06)",
                                }}
                              >
                                A+
                              </span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                              <span className="db-muted" style={{ fontSize: 12 }}>
                                Primary
                              </span>
                              <span className="db-muted" style={{ fontSize: 12 }}>
                                Secondary
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="col-12">
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
                                disabled={loading || saving || savingFee}
                              />
                            </div>
                          </div>

                          <div className="db-muted" style={{ fontSize: 12, marginTop: 8 }}>
                            This toggle applies instantly (no need to click Save).
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <SectionHeading icon="chat-dots" title="Notifications" subtitle="Control channels and what messages get sent." />

                  {/* WhatsApp */}
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
                            disabled={loading || saving || savingFee}
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
                                  disabled={!whatsappEnabled || loading || saving || savingFee}
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

                  <SectionHeading icon="bell" title="Fee Reminders Automation" subtitle="Schedule follow-ups and control channels per school." />

                  {/* Fee Reminder Setup */}
                  <div className="db-panel">
                    <div className="db-panel-head">
                      <div>
                        <p className="db-panel-title">Fee reminder setup</p>
                        <p className="db-panel-sub">Automatically re-send reminders if invoice remains unpaid.</p>
                      </div>

                      <span className="db-pill" style={{ background: "rgba(0,0,0,0.04)", color: "#7a6a5a" }}>
                        <i className="bi bi-alarm me-1" />
                        Automation
                      </span>
                    </div>

                    <div style={{ padding: 16 }}>
                      <div className="db-kv">
                        <div>
                          <label className="d-block">Enable fee reminders automation</label>
                          <b>{feeReminder.enabled ? "Enabled" : "Disabled"}</b>
                        </div>

                        <div className="form-check form-switch m-0">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            checked={feeReminder.enabled}
                            onChange={(e) => setFeeReminder((p) => ({ ...p, enabled: e.target.checked }))}
                            disabled={feeBusy}
                          />
                        </div>
                      </div>

                      <div className="row g-3 mt-2">
                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold small mb-1">Reminder interval (days)</label>
                          <input
                            type="number"
                            className="form-control"
                            value={feeReminder.intervalDays}
                            min={1}
                            max={60}
                            onChange={(e) => setFeeReminder((p) => ({ ...p, intervalDays: clampInt(e.target.value, 1, 60, 5) }))}
                            disabled={feeBusy || !feeReminder.enabled}
                          />
                          <div className="db-muted" style={{ fontSize: 12, marginTop: 6 }}>
                            Example: every 5 days after the first reminder.
                          </div>
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold small mb-1">Max reminders</label>
                          <input
                            type="number"
                            className="form-control"
                            value={feeReminder.maxCount}
                            min={0}
                            max={50}
                            onChange={(e) => setFeeReminder((p) => ({ ...p, maxCount: clampInt(e.target.value, 0, 50, 6) }))}
                            disabled={feeBusy || !feeReminder.enabled}
                          />
                          <div className="db-muted" style={{ fontSize: 12, marginTop: 6 }}>
                            Set to <b>0</b> to allow unlimited reminders (if enabled on backend).
                          </div>
                        </div>

                        <div className="col-12">
                          <div className="db-card" style={{ padding: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                              <div>
                                <div className="db-strong" style={{ fontWeight: 800 }}>
                                  Channels
                                </div>
                                <div className="db-muted" style={{ fontSize: 12.5 }}>
                                  Choose which channels the automation will use.
                                </div>
                              </div>
                              <span className="db-pill" style={{ background: "rgba(0,0,0,0.04)", color: "#7a6a5a" }}>
                                <i className="bi bi-send me-1" />
                                Delivery
                              </span>
                            </div>

                            <div className="row g-3 mt-2">
                              <div className="col-12">
                                <div className="db-kv">
                                  <div>
                                    <label className="d-block">Send email reminders</label>
                                    <b>{feeReminder.sendEmail ? "Yes" : "No"}</b>
                                  </div>
                                  <div className="form-check form-switch m-0">
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      role="switch"
                                      checked={feeReminder.sendEmail}
                                      onChange={(e) => setFeeReminder((p) => ({ ...p, sendEmail: e.target.checked }))}
                                      disabled={feeBusy || !feeReminder.enabled}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* <div className="col-12">
                                <div className="db-kv">
                                  <div>
                                    <label className="d-block">Send WhatsApp reminders</label>
                                    <b>{feeReminder.sendWhatsApp ? "Yes" : "No"}</b>
                                  </div>
                                  <div className="form-check form-switch m-0">
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      role="switch"
                                      checked={feeReminder.sendWhatsApp}
                                      onChange={(e) => {
                                        const next = e.target.checked;

                                        // If enabling WhatsApp reminders, ensure WhatsApp is enabled at app level
                                        if (next && !whatsappEnabled) {
                                          showError?.("Enable WhatsApp notifications first before turning on WhatsApp fee reminders.");
                                          return;
                                        }

                                        setFeeReminder((p) => ({ ...p, sendWhatsApp: next }));
                                      }}
                                      disabled={feeBusy || !feeReminder.enabled || !whatsappEnabled}
                                    />
                                  </div>
                                </div>
                                {!whatsappEnabled ? (
                                  <div className="db-muted" style={{ fontSize: 12, marginTop: 6 }}>
                                    WhatsApp is currently disabled. Turn on WhatsApp above to enable this channel.
                                  </div>
                                ) : null}
                              </div> */}
                            </div>
                          </div>
                        </div>

                        <div className="col-12">
                          <div className="db-card" style={{ padding: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                              <div>
                                <div className="db-strong" style={{ fontWeight: 800 }}>
                                  Quiet hours (optional)
                                </div>
                                <div className="db-muted" style={{ fontSize: 12.5 }}>
                                  Prevent reminders from sending during specific hours.
                                </div>
                              </div>
                              <span className="db-pill" style={{ background: "rgba(0,0,0,0.04)", color: "#7a6a5a" }}>
                                <i className="bi bi-moon-stars me-1" />
                                Quiet
                              </span>
                            </div>

                            <div className="row g-3 mt-2">
                              <div className="col-12 col-md-6">
                                <label className="form-label fw-semibold small mb-1">Start</label>
                                <input
                                  type="time"
                                  className="form-control"
                                  value={feeReminder.quietHoursStart ?? ""}
                                  onChange={(e) => setFeeReminder((p) => ({ ...p, quietHoursStart: e.target.value || null }))}
                                  disabled={feeBusy || !feeReminder.enabled}
                                />
                              </div>

                              <div className="col-12 col-md-6">
                                <label className="form-label fw-semibold small mb-1">End</label>
                                <input
                                  type="time"
                                  className="form-control"
                                  value={feeReminder.quietHoursEnd ?? ""}
                                  onChange={(e) => setFeeReminder((p) => ({ ...p, quietHoursEnd: e.target.value || null }))}
                                  disabled={feeBusy || !feeReminder.enabled}
                                />
                              </div>
                            </div>

                            <div className="db-muted" style={{ fontSize: 12, marginTop: 10 }}>
                              If set, reminders will not be sent during this period (supports overnight ranges).
                            </div>
                          </div>
                        </div>

                        <div className="col-12">
                          <button
                            type="button"
                            className="db-refresh-btn"
                            style={{ width: "100%", justifyContent: "center", padding: "12px 14px", borderRadius: 12 }}
                            onClick={saveFeeReminderSettings}
                            disabled={feeBusy}
                            title="Save fee reminder automation settings"
                          >
                            {savingFee ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" />
                                Saving fee reminders…
                              </>
                            ) : (
                              <>
                                <i className="bi bi-save2 me-1" />
                                Save fee reminder setup
                              </>
                            )}
                          </button>

                          <div className="db-muted" style={{ fontSize: 12, marginTop: 8 }}>
                            This saves only the automation settings. The main “Save settings” button also saves this automatically.
                          </div>
                        </div>
                      </div>
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
                        disabled={saving || loading || savingFee}
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