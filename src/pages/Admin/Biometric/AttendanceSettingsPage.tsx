// src/pages/Attendance/AttendanceSettingsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";

import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";

type Settings = {
  id: number;
  school_id: number;
  staff_checkin_time: string; // "08:00:00"
  grace_minutes: number;
  staff_checkout_time: string | null;
  absent_after_time: string | null;
  is_active: boolean;
};

function toHHMM(time?: string | null) {
  if (!time) return "";
  return time.slice(0, 5);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function addMinutesToHHMM(hhmm: string, minutes: number) {
  if (!hhmm) return "";
  const [hh, mm] = hhmm.split(":").map((x) => Number(x));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return "";
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  d.setMinutes(d.getMinutes() + (Number(minutes) || 0));
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AttendanceSettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { showError, showSuccess } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    staff_checkin_time: "08:00",
    grace_minutes: 10,
    staff_checkout_time: "",
    absent_after_time: "",
    is_active: true,
  });

  const load = async () => {
    try {
      setLoading(true);
      const res = await authApi.get("/attendance-settings");
      const s: Settings = res.data?.data;

      setForm({
        staff_checkin_time: toHHMM(s.staff_checkin_time) || "08:00",
        grace_minutes: s.grace_minutes ?? 10,
        staff_checkout_time: toHHMM(s.staff_checkout_time),
        absent_after_time: toHHMM(s.absent_after_time),
        is_active: !!s.is_active,
      });
    } catch (err: any) {
      console.error(err);
      showError?.(err?.response?.data?.message || "Failed to load attendance settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    try {
      setSaving(true);

      if (!form.staff_checkin_time) return showError?.("Check-in time is required");
      if (Number(form.grace_minutes) < 0 || Number(form.grace_minutes) > 180)
        return showError?.("Grace minutes must be between 0 and 180");

      const payload = {
        staff_checkin_time: form.staff_checkin_time, // backend expects HH:MM
        grace_minutes: Number(form.grace_minutes),
        staff_checkout_time: form.staff_checkout_time || null,
        absent_after_time: form.absent_after_time || null,
        is_active: form.is_active,
      };

      const res = await authApi.put("/attendance-settings", payload);
      showSuccess?.(res.data?.message || "Saved");
      await load();
    } catch (err: any) {
      console.error(err);
      showError?.(err?.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // ===== same template css (inline) =====
  const templateCss = `
    .db-main {
      background: var(--bs-body-bg, #f5f1eb);
      min-height: 100vh;
      font-family: "DM Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      padding: 28px 28px 0;
    }
    @media (max-width: 991.98px) { .db-main { padding: 18px 14px 0; } }

    .db-hero {
      background: #0f172a;
      border-radius: 16px;
      padding: 32px 36px;
      position: relative;
      overflow: hidden;
      margin: 10px 0 18px;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .db-hero::before {
      content: "";
      position: absolute;
      inset: 0;
      background-image: radial-gradient(circle, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
      background-size: 24px 24px;
      pointer-events: none;
    }
    .db-hero-glow {
      position: absolute;
      top: -60px;
      right: -60px;
      width: 320px;
      height: 320px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(201, 168, 76, 0.12) 0%, transparent 65%);
      pointer-events: none;
    }
    .db-hero-glow2 {
      position: absolute;
      bottom: -40px;
      left: 26%;
      width: 220px;
      height: 220px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%);
      pointer-events: none;
    }
    .db-hero-inner {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 28px;
      flex-wrap: wrap;
    }

    .db-session-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #e8c97a;
      background: rgba(201, 168, 76, 0.10);
      border: 1px solid rgba(201, 168, 76, 0.22);
      border-radius: 100px;
      padding: 4px 12px;
      margin-bottom: 14px;
    }
    .db-session-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22c55e;
      animation: dbPulse 2s ease infinite;
    }
    @keyframes dbPulse {
      0%,100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.5); }
    }
    .db-greeting {
      font-family: "Lora", Georgia, serif;
      font-size: clamp(22px, 2.5vw, 32px);
      font-weight: 700;
      color: #fff;
      line-height: 1.1;
      margin-bottom: 8px;
    }
    .db-greeting em { font-style: italic; color: #e8c97a; }

    .db-hero-sub {
      font-size: 13.5px;
      font-weight: 300;
      color: #cbd5e1;
      line-height: 1.65;
      max-width: 760px;
      margin-bottom: 16px;
      opacity: 0.9;
    }
    .db-hero-btns { display: flex; gap: 10px; flex-wrap: wrap; }

    .db-btn-gold {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
      background: #c9a84c;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s, transform 0.2s;
      white-space: nowrap;
    }
    .db-btn-gold:hover { background: #e8c97a; transform: translateY(-1px); }
    .db-btn-gold:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

    .db-btn-outline {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.75);
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s, color 0.2s;
      white-space: nowrap;
    }
    .db-btn-outline:hover { background: rgba(255, 255, 255, 0.06); color: #fff; border-color: rgba(255, 255, 255, 0.28); }
    .db-btn-outline:disabled { opacity: 0.55; cursor: not-allowed; }

    .db-hero-stat-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.09);
      backdrop-filter: blur(8px);
      border-radius: 14px;
      padding: 18px 20px;
      min-width: 330px;
    }
    @media (max-width: 991.98px) { .db-hero { padding: 24px 20px; } .db-hero-stat-card { min-width: 0; width: 100%; } }
    .db-hero-stat-row { display: flex; flex-direction: column; gap: 10px; }
    .db-hero-stat-item { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
    .db-hero-stat-label { font-size: 12px; font-weight: 300; color: #94a3b8; }
    .db-hero-stat-val {
      font-family: "Lora", serif;
      font-size: 18px;
      font-weight: 700;
      color: #fff;
    }
    .db-hero-stat-sep { height: 1px; background: rgba(255, 255, 255, 0.06); }

    .db-panel {
      background: #ffffff;
      border: 1px solid #ede8e0;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(15,23,42,0.04);
    }
    .db-panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 18px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      gap: 12px;
      flex-wrap: wrap;
    }
    .db-panel-title {
      font-family: "Lora", serif;
      font-size: 16px;
      font-weight: 800;
      color: #1a1a2e;
      margin: 0;
    }
    .db-panel-sub { font-size: 11.5px; font-weight: 300; color: #9a8a7a; margin: 0; }

    .db-refresh-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #7a6a5a;
      background: #f5f1eb;
      border: 1px solid #e5ddd3;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s;
      white-space: nowrap;
    }
    .db-refresh-btn:hover { background: #ede8e0; }
    .db-refresh-btn:disabled { opacity: 0.55; cursor: not-allowed; }

    .db-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 16px 0 18px; }
    @media (max-width: 991.98px) { .db-grid2 { grid-template-columns: 1fr; } }

    .db-input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid #e5ddd3;
      outline: none;
      font-size: 13px;
      background: #fff;
    }
    .db-input:focus { border-color: rgba(201,168,76,0.7); box-shadow: 0 0 0 3px rgba(201,168,76,0.18); }

    .miniCard {
      background: #fff;
      border: 1px solid #ede8e0;
      border-radius: 14px;
      box-shadow: 0 2px 10px rgba(15,23,42,0.04);
      overflow: hidden;
    }
    .miniCardTop { height: 4px; background: linear-gradient(135deg, #c9a84c 0%, #e8c97a 100%); }
    .miniCardBody { padding: 14px 14px; display: grid; gap: 8px; }
    .miniCardLabel { font-size: 11px; color: #9a8a7a; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
    .miniCardValue { font-family: "Lora", serif; font-size: 22px; font-weight: 900; color: #1a1a2e; line-height: 1.1; }
    .miniCardHint { font-size: 12px; color: #9a8a7a; }
    .miniCardIcon {
      width: 38px; height: 38px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(201,168,76,0.12);
      border: 1px solid rgba(201,168,76,0.18);
      color: #b45309;
    }

    .db-pill {
      display: inline-flex;
      align-items: center;
      font-size: 12px;
      font-weight: 800;
      padding: 6px 10px;
      border-radius: 999px;
      white-space: nowrap;
      border: 1px solid rgba(0,0,0,0.06);
    }
    .db-muted { color: #9a8a7a; }
    .db-strong { font-weight: 900; color: #1a1a2e; }
  `;

  const activeBadge = useMemo(() => {
    return form.is_active
      ? { bg: "rgba(34,197,94,0.18)", fg: "#22c55e", text: "Enabled", dot: "#22c55e" }
      : { bg: "rgba(239,68,68,0.18)", fg: "#f87171", text: "Disabled", dot: "#f87171" };
  }, [form.is_active]);

  const derivedLateAfter = useMemo(() => {
    return addMinutesToHHMM(form.staff_checkin_time, Number(form.grace_minutes) || 0) || "—";
  }, [form.staff_checkin_time, form.grace_minutes]);

  const summaryCards = useMemo(
    () => [
      {
        label: "Check-in",
        value: form.staff_checkin_time || "—",
        hint: "Expected time",
        icon: "clock",
        top: "linear-gradient(135deg,#3b82f6 0%,#60a5fa 100%)",
      },
      {
        label: "Grace",
        value: `${Number(form.grace_minutes) || 0} min`,
        hint: "Late buffer",
        icon: "hourglass-split",
        top: "linear-gradient(135deg,#f59e0b 0%,#fbbf24 100%)",
      },
      {
        label: "Late after",
        value: derivedLateAfter,
        hint: "Check-in + grace",
        icon: "alarm",
        top: "linear-gradient(135deg,#16a34a 0%,#22c55e 100%)",
      },
      {
        label: "Status",
        value: activeBadge.text,
        hint: "Rule engine",
        icon: form.is_active ? "check2-circle" : "x-circle",
        top: form.is_active
          ? "linear-gradient(135deg,#22c55e 0%,#86efac 100%)"
          : "linear-gradient(135deg,#ef4444 0%,#fda4af 100%)",
      },
    ],
    [form.staff_checkin_time, form.grace_minutes, derivedLateAfter, activeBadge.text, form.is_active]
  );

  return (
    <>
      <style>{templateCss}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Attendance Settings" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {(loading || saving) && <Loader message={loading ? "Loading settings..." : "Saving settings..."} />}

            {/* HERO (same template) */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Attendance • Settings
                  </div>

                  <h1 className="db-greeting">
                    {getGreeting()}, <em>Admin.</em>
                  </h1>

                  <p className="db-hero-sub">
                    Configure check-in policy (late, grace time, optional checkout/absent cutoffs). These settings apply per school.
                  </p>

                  <div className="db-hero-btns">
                    <button className="db-btn-gold" onClick={save} disabled={loading || saving}>
                      <i className="bi bi-save" />
                      Save
                    </button>

                    <button className="db-btn-outline" onClick={load} disabled={loading || saving}>
                      <i className="bi bi-arrow-clockwise" />
                      Reload
                    </button>

                    <button
                      className="db-btn-outline"
                      onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
                      disabled={loading || saving}
                    >
                      <i className={`bi ${form.is_active ? "bi-toggle-on" : "bi-toggle-off"}`} />
                      Toggle
                    </button>
                  </div>
                </div>

                <div className="db-hero-stat-card d-none d-md-block">
                  <div className="db-hero-stat-row">
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Rule engine</span>
                      <span className="db-hero-stat-val" style={{ color: activeBadge.fg }}>
                        {activeBadge.text}
                      </span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Check-in</span>
                      <span className="db-hero-stat-val">{form.staff_checkin_time || "—"}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Grace minutes</span>
                      <span className="db-hero-stat-val">{Number(form.grace_minutes) || 0}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Late after</span>
                      <span className="db-hero-stat-val">{derivedLateAfter}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MINI CARDS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, margin: "14px 0 8px" }}
                 className="d-none d-lg-grid">
              {summaryCards.map((c) => (
                <div className="miniCard" key={c.label}>
                  <div className="miniCardTop" style={{ background: c.top }} />
                  <div className="miniCardBody">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
                      <div>
                        <div className="miniCardLabel">{c.label}</div>
                        <div className="miniCardValue">{c.value}</div>
                      </div>
                      <div className="miniCardIcon" style={{ background: "rgba(0,0,0,0.04)", borderColor: "rgba(0,0,0,0.06)", color: "#0f172a" }}>
                        <i className={`bi bi-${c.icon}`} />
                      </div>
                    </div>
                    <div className="miniCardHint">{c.hint}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* CONTENT */}
            <div className="db-grid2" style={{ marginTop: 14 }}>
              {/* form panel */}
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <p className="db-panel-title">Staff attendance policy</p>
                    <p className="db-panel-sub">Controls present / late + optional time-based rules</p>
                  </div>

                  <span
                    className="db-pill"
                    style={{
                      background: activeBadge.bg,
                      color: activeBadge.fg,
                      borderColor: "rgba(255,255,255,0.12)",
                    }}
                    title="Whether the rule engine is active"
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: activeBadge.dot,
                        display: "inline-block",
                        marginRight: 8,
                      }}
                    />
                    {activeBadge.text.toUpperCase()}
                  </span>
                </div>

                <div style={{ padding: 16, display: "grid", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div className="miniCardLabel" style={{ marginBottom: 6 }}>Expected check-in time</div>
                      <input
                        type="time"
                        className="db-input"
                        value={form.staff_checkin_time}
                        onChange={(e) => setForm((p) => ({ ...p, staff_checkin_time: e.target.value }))}
                        disabled={loading || saving}
                      />
                      <div className="db-muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.55 }}>
                        Late is calculated after <b>{form.staff_checkin_time || "—"}</b> + grace minutes.
                      </div>
                    </div>

                    <div>
                      <div className="miniCardLabel" style={{ marginBottom: 6 }}>Grace minutes (0–180)</div>
                      <input
                        type="number"
                        className="db-input"
                        value={form.grace_minutes}
                        min={0}
                        max={180}
                        onChange={(e) => setForm((p) => ({ ...p, grace_minutes: Number(e.target.value) }))}
                        disabled={loading || saving}
                      />
                      <div className="db-muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.55 }}>
                        Example: 10 means late after +10 minutes.
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div className="miniCardLabel" style={{ marginBottom: 6 }}>Optional checkout time</div>
                      <input
                        type="time"
                        className="db-input"
                        value={form.staff_checkout_time}
                        onChange={(e) => setForm((p) => ({ ...p, staff_checkout_time: e.target.value }))}
                        disabled={loading || saving}
                      />
                      <div className="db-muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.55 }}>
                        Used for reporting (not required).
                      </div>
                    </div>

                    <div>
                      <div className="miniCardLabel" style={{ marginBottom: 6 }}>Optional absent-after time</div>
                      <input
                        type="time"
                        className="db-input"
                        value={form.absent_after_time}
                        onChange={(e) => setForm((p) => ({ ...p, absent_after_time: e.target.value }))}
                        disabled={loading || saving}
                      />
                      <div className="db-muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.55 }}>
                        For future automation: mark absent if no check-in by this time.
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 14,
                      border: "1px solid #ede8e0",
                      background: "#faf8f5",
                      padding: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "grid", gap: 4 }}>
                      <div className="db-strong" style={{ fontSize: 13.5 }}>Enable attendance marking</div>
                      <div className="db-muted" style={{ fontSize: 12, lineHeight: 1.55 }}>
                        If disabled, your QR attendance endpoint should reject marking attendance.
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span className="db-muted" style={{ fontSize: 12 }}>Active</span>
                      <div className="form-check form-switch m-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={form.is_active}
                          onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                          disabled={loading || saving}
                          id="attendanceActive"
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                    <button className="db-refresh-btn" onClick={load} disabled={loading || saving}>
                      <i className="bi bi-arrow-clockwise" /> Reset to saved
                    </button>

                    <button className="db-btn-gold" onClick={save} disabled={loading || saving}>
                      <i className="bi bi-save" /> Save settings
                    </button>
                  </div>
                </div>
              </div>

              {/* info panel */}
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <p className="db-panel-title">Rule preview</p>
                    <p className="db-panel-sub">Quick explanation of what the system will do</p>
                  </div>
                </div>

                <div style={{ padding: 16, display: "grid", gap: 12 }}>
                  <div
                    style={{
                      borderRadius: 14,
                      padding: 16,
                      color: "#fff",
                      background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 800, marginBottom: 6 }}>
                          How “late” is calculated
                        </div>
                        <div style={{ opacity: 0.92, fontSize: 13.5, lineHeight: 1.65 }}>
                          Check-in time is <b>{form.staff_checkin_time || "—"}</b> and grace is{" "}
                          <b>{Number(form.grace_minutes) || 0} mins</b>. Staff are marked <b>late</b> after{" "}
                          <b>{derivedLateAfter}</b>.
                        </div>
                      </div>
                      <i className="bi bi-info-circle" style={{ fontSize: 20, opacity: 0.95 }} />
                    </div>
                  </div>

                  <div style={{ border: "1px solid #ede8e0", background: "#fff", borderRadius: 14, padding: 14 }}>
                    <div className="miniCardLabel" style={{ marginBottom: 8 }}>Current values</div>

                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <span className="db-muted">Check-in</span>
                        <span className="db-strong">{form.staff_checkin_time || "—"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <span className="db-muted">Grace minutes</span>
                        <span className="db-strong">{Number(form.grace_minutes) || 0}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <span className="db-muted">Late after</span>
                        <span className="db-strong">{derivedLateAfter}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <span className="db-muted">Checkout time</span>
                        <span className="db-strong">{form.staff_checkout_time || "—"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <span className="db-muted">Absent-after</span>
                        <span className="db-strong">{form.absent_after_time || "—"}</span>
                      </div>

                      <div style={{ height: 1, background: "rgba(0,0,0,0.06)" }} />

                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                        <span className="db-muted">Engine status</span>
                        <span
                          className="db-pill"
                          style={{
                            background: activeBadge.bg,
                            color: activeBadge.fg,
                            borderColor: "rgba(0,0,0,0.06)",
                          }}
                        >
                          {activeBadge.text.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="db-muted" style={{ fontSize: 12, lineHeight: 1.65 }}>
                    <i className="bi bi-shield-check" style={{ marginRight: 6 }} />
                    Tip: Keep “Absent-after” empty unless your backend is already using it to auto-mark absent.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}