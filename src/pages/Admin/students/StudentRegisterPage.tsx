// src/pages/Admin/students/StudentRegisterPage.tsx
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../../utils/axios";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";

interface Option { id: number; name: string; }

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning"; if (h < 17) return "Good afternoon";
  return "Good evening";
}

/* ── Section header inside the form ── */
function SectionHead({
  icon, title, subtitle, tag,
}: { icon: React.ReactNode; title: string; subtitle: string; tag?: string }) {
  return (
    <div className="sr-section-head">
      <div className="sr-section-icon">{icon}</div>
      <div className="sr-section-info">
        <div className="sr-section-title">{title}</div>
        <div className="sr-section-sub">{subtitle}</div>
      </div>
      {tag && <span className="sr-section-tag">{tag}</span>}
    </div>
  );
}

/* ── Label + input wrapper ── */
function Field({
  label, required, hint, children,
}: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="sr-field">
      <label className="sr-label">
        {label}{required && <span className="sr-required">*</span>}
      </label>
      {children}
      {hint && <p className="sr-hint">{hint}</p>}
    </div>
  );
}

export default function StudentRegisterPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const { showSuccess, showError }    = useToast();
  const navigate = useNavigate();

  const [levels, setLevels]           = useState<Option[]>([]);
  const [sections, setSections]       = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [autoAdmission, setAutoAdmission] = useState(0);

  const [form, setForm] = useState({
    firstname: "", surname: "", third_name: "", gender: "", dob: "",
    reg_no: "", level_id: "", section_id: "", department_id: "",
    role: "Student", blood_group: "", religion: "", nationality: "Nigerian",
    phone: "", address: "",
  });

  const [photo, setPhoto]           = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const requiredOk = useMemo(() =>
    Boolean(form.firstname.trim() && form.surname.trim() && form.third_name.trim() &&
      form.gender.trim() && form.level_id && form.section_id && form.department_id),
  [form]);

  /* Progress — count filled fields */
  const progressPct = useMemo(() => {
    const all = [
      form.firstname, form.surname, form.third_name, form.gender, form.dob,
      form.level_id, form.section_id, form.department_id,
      form.blood_group, form.religion, form.nationality,
      form.phone, form.address, photo ? "photo" : "",
    ];
    const filled = all.filter(Boolean).length;
    return Math.round((filled / all.length) * 100);
  }, [form, photo]);

  useEffect(() => {
    (async () => {
      try {
        const [lv, sc, dp, au] = await Promise.all([
          authApi.get("/student-class"),
          authApi.get("/all-sections"),
          authApi.get("/student-department"),
          authApi.get("/settings/auto-admission-status"),
        ]);
        setLevels(lv.data); setSections(sc.data); setDepartments(dp.data);
        setAutoAdmission(Number(au.data.auto_admission ?? 0));
      } catch { showError("Failed to load registration options."); }
      finally  { setPageLoading(false); }
    })();
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setPhoto(f); setPhotoPreview(URL.createObjectURL(f));
  };

  const clearPhoto = () => { setPhoto(null); setPhotoPreview(null); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!requiredOk) return showError("Complete all required fields.");
    setLoading(true);
    try {
      const payload = { ...form, reg_no: autoAdmission === 1 ? "" : form.reg_no };
      const fd = new FormData();
      Object.entries(payload).forEach(([k,v]) => { if (v!==undefined && v!==null && String(v).trim()) fd.append(k, v); });
      if (photo) fd.append("photo", photo);
      const res = await authApi.post("/students/store", fd, { headers: { "Content-Type": "multipart/form-data" } });
      showSuccess(`Student registered!\nReg No: ${res.data.reg_no ?? "Generated"}`);
      navigate("/students");
    } catch (err: any) { showError(err.response?.data?.message || "Registration failed. Try again."); }
    finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        .sr-main { background:#f5f1eb; min-height:100vh; font-family:'DM Sans',sans-serif; padding:28px 28px 0; }

        /* ── Hero ── */
        .sr-hero { background:#0f172a; border-radius:16px; padding:32px 36px; position:relative; overflow:hidden; margin-bottom:28px; }
        .sr-hero::before { content:''; position:absolute; inset:0; background-image:radial-gradient(circle,rgba(255,255,255,.045) 1px,transparent 1px); background-size:24px 24px; pointer-events:none; }
        .sr-hero-glow  { position:absolute; top:-60px; right:-60px; width:320px; height:320px; border-radius:50%; background:radial-gradient(circle,rgba(201,168,76,.10) 0%,transparent 65%); pointer-events:none; }
        .sr-hero-glow2 { position:absolute; bottom:-40px; left:25%; width:240px; height:240px; border-radius:50%; background:radial-gradient(circle,rgba(99,102,241,.07) 0%,transparent 70%); pointer-events:none; }
        .sr-hero-inner { position:relative; z-index:1; display:flex; align-items:center; justify-content:space-between; gap:32px; flex-wrap:wrap; }
        .sr-kicker { display:inline-flex; align-items:center; gap:7px; font-size:11px; font-weight:500; letter-spacing:.12em; text-transform:uppercase; color:#e8c97a; background:rgba(201,168,76,.10); border:1px solid rgba(201,168,76,.2); border-radius:999px; padding:4px 12px; margin-bottom:14px; }
        .sr-kicker-dot { width:6px; height:6px; border-radius:50%; background:#c9a84c; }
        .sr-hero-title { font-family:'Lora',serif; font-size:clamp(22px,2.5vw,32px); font-weight:700; color:#fff; line-height:1.1; margin-bottom:8px; }
        .sr-hero-title em { font-style:italic; color:#e8c97a; }
        .sr-hero-sub { font-size:13.5px; font-weight:300; color:#64748b; line-height:1.65; max-width:480px; margin-bottom:24px; }
        .sr-hero-btns { display:flex; gap:10px; flex-wrap:wrap; }
        .sr-btn-back { display:inline-flex; align-items:center; gap:7px; padding:9px 18px; font-size:13px; font-weight:400; color:rgba(255,255,255,.7); background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.14); border-radius:9px; cursor:pointer; transition:background .2s,color .2s; }
        .sr-btn-back:hover { background:rgba(255,255,255,.12); color:#fff; }

        /* Right progress card */
        .sr-hero-card { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.09); backdrop-filter:blur(8px); border-radius:14px; padding:22px 26px; min-width:220px; }
        .sr-progress-label { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
        .sr-progress-text { font-size:11px; font-weight:500; letter-spacing:.14em; text-transform:uppercase; color:#c9a84c; }
        .sr-progress-pct { font-family:'Lora',serif; font-size:18px; font-weight:700; color:#fff; }
        .sr-progress-track { height:5px; background:rgba(255,255,255,.08); border-radius:999px; margin-bottom:18px; overflow:hidden; }
        .sr-progress-fill { height:5px; background:linear-gradient(90deg,#c9a84c,#e8c97a); border-radius:999px; transition:width .4s cubic-bezier(.4,0,.2,1); }
        .sr-status-row { display:flex; align-items:center; gap:7px; font-size:12.5px; font-weight:300; color:#64748b; }
        .sr-status-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
        .sr-status-dot--ok   { background:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,.2); }
        .sr-status-dot--warn { background:#f59e0b; box-shadow:0 0 0 3px rgba(245,158,11,.2); }

        /* ── Tip pills ── */
        .sr-tips { display:flex; flex-direction:column; gap:7px; margin-top:14px; padding-top:14px; border-top:1px solid rgba(255,255,255,.07); }
        .sr-tip { font-size:11.5px; font-weight:300; color:#94a3b8; display:flex; align-items:center; gap:6px; }
        .sr-tip-dot { width:4px; height:4px; border-radius:50%; background:#c9a84c; flex-shrink:0; }

        /* ── Form sections ── */
        .sr-form-wrap { display:flex; flex-direction:column; gap:16px; padding-bottom:120px; }

        .sr-section { background:#fff; border:1px solid #ede8e0; border-radius:14px; overflow:hidden; animation:srFadeUp .5s ease both; }
        @keyframes srFadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .sr-section:nth-child(1){ animation-delay:.04s; }
        .sr-section:nth-child(2){ animation-delay:.08s; }
        .sr-section:nth-child(3){ animation-delay:.12s; }
        .sr-section:nth-child(4){ animation-delay:.16s; }
        .sr-section:nth-child(5){ animation-delay:.20s; }

        /* Section head */
        .sr-section-head { display:flex; align-items:center; gap:12px; padding:18px 22px; border-bottom:1px solid #f0ebe3; flex-wrap:wrap; }
        .sr-section-icon { width:36px; height:36px; border-radius:9px; display:flex; align-items:center; justify-content:center; background:var(--si,#fef3c7); color:var(--sc,#b45309); flex-shrink:0; }
        .sr-section-info { flex:1; min-width:0; }
        .sr-section-title { font-family:'Lora',serif; font-size:14.5px; font-weight:700; color:#1a1a2e; }
        .sr-section-sub { font-size:11.5px; font-weight:300; color:#9a8a7a; }
        .sr-section-tag { font-size:10px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:#b45309; background:rgba(180,83,9,.08); border:1px solid rgba(180,83,9,.18); border-radius:100px; padding:2px 10px; white-space:nowrap; }

        .sr-section-body { padding:22px; }

        /* Grid */
        .sr-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
        @media(max-width:900px){ .sr-grid{grid-template-columns:1fr 1fr;} }
        @media(max-width:560px){ .sr-grid{grid-template-columns:1fr;} }
        .sr-col2 { grid-column:span 2; }
        @media(max-width:900px){ .sr-col2{grid-column:1/-1;} }

        /* Field */
        .sr-field { display:flex; flex-direction:column; gap:0; }
        .sr-label { font-size:12px; font-weight:500; color:#4a4a5a; margin-bottom:7px; letter-spacing:.02em; display:flex; align-items:center; gap:4px; }
        .sr-required { color:#ef4444; font-size:12px; }
        .sr-hint { font-size:11.5px; font-weight:300; color:#b5a090; margin-top:5px; }
        .sr-input, .sr-select {
          width:100%; background:#faf8f5; border:1.5px solid #e5ddd3; border-radius:9px;
          padding:10px 13px; font-family:'DM Sans',sans-serif; font-size:13.5px; color:#1a1a2e;
          outline:none; -webkit-appearance:none;
          transition:border-color .2s,box-shadow .2s,background .2s;
        }
        .sr-input:focus,.sr-select:focus { border-color:#c9a84c; box-shadow:0 0 0 3px rgba(201,168,76,.12); background:#fff; }
        .sr-input::placeholder { color:#bdb3a8; }
        .sr-input:disabled { opacity:.5; cursor:not-allowed; }

        /* Photo upload */
        .sr-photo-section { display:flex; align-items:center; gap:20px; flex-wrap:wrap; }
        .sr-avatar { width:82px; height:82px; border-radius:50%; overflow:hidden; background:#f5f1eb; border:2px solid #e5ddd3; flex-shrink:0; display:flex; align-items:center; justify-content:center; position:relative; }
        .sr-avatar img { width:100%; height:100%; object-fit:cover; }
        .sr-avatar-placeholder { display:flex; flex-direction:column; align-items:center; gap:4px; color:#b5a090; }
        .sr-avatar-placeholder span { font-size:10.5px; font-weight:400; }
        .sr-photo-actions { display:flex; flex-direction:column; gap:6px; }
        .sr-photo-name { font-weight:500; font-size:13.5px; color:#1a1a2e; margin-bottom:2px; }
        .sr-photo-desc { font-size:12px; font-weight:300; color:#9a8a7a; }
        .sr-photo-btns { display:flex; gap:8px; margin-top:6px; }
        .sr-upload-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; font-size:12.5px; font-weight:400; color:#b45309; background:rgba(180,83,9,.07); border:1.5px solid rgba(180,83,9,.2); border-radius:8px; cursor:pointer; transition:background .2s; }
        .sr-upload-btn:hover { background:rgba(180,83,9,.12); }
        .sr-remove-btn { display:inline-flex; align-items:center; gap:5px; padding:8px 12px; font-size:12.5px; font-weight:400; color:#64748b; background:#f5f1eb; border:1px solid #e5ddd3; border-radius:8px; cursor:pointer; transition:background .2s; }
        .sr-remove-btn:hover { background:#ede8e0; }

        /* ── Sticky action bar ── */
        .sr-action-bar {
          position:fixed; bottom:0; left:0; right:0; z-index:900;
          background:#fff; border-top:1px solid #ede8e0;
          box-shadow:0 -4px 24px rgba(0,0,0,.07);
          display:flex; align-items:center; justify-content:space-between; gap:12px;
          padding:14px 28px; flex-wrap:wrap;
        }
        .sr-action-status { display:flex; align-items:center; gap:8px; font-size:13px; font-weight:300; color:#9a8a7a; }
        .sr-action-status-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
        .sr-action-status-dot--ok   { background:#22c55e; }
        .sr-action-status-dot--warn { background:#f59e0b; }
        .sr-action-btns { display:flex; gap:10px; align-items:center; }

        .sr-cancel-btn { display:inline-flex; align-items:center; gap:7px; padding:11px 20px; font-size:13.5px; font-weight:400; color:#7a6a5a; background:#f5f1eb; border:1px solid #e5ddd3; border-radius:9px; cursor:pointer; transition:background .2s; }
        .sr-cancel-btn:hover { background:#ede8e0; }
        .sr-cancel-btn:disabled { opacity:.5; cursor:not-allowed; }

        .sr-submit-btn { display:inline-flex; align-items:center; gap:8px; padding:11px 24px; font-size:13.5px; font-weight:500; color:#fff; background:#1a1a2e; border:none; border-radius:9px; cursor:pointer; transition:background .2s,transform .2s,box-shadow .2s; }
        .sr-submit-btn:hover:not(:disabled) { background:#0a0f1e; transform:translateY(-1px); box-shadow:0 6px 20px rgba(0,0,0,.16); }
        .sr-submit-btn:disabled { opacity:.5; cursor:not-allowed; }
        .sr-submit-btn--ready { background:#c9a84c; color:#0f172a; }
        .sr-submit-btn--ready:hover:not(:disabled) { background:#e8c97a; }

        .sr-spinner { width:15px; height:15px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:srSpin .7s linear infinite; flex-shrink:0; }
        .sr-spinner--dark { border:2px solid rgba(0,0,0,.12); border-top-color:#0f172a; }
        @keyframes srSpin { to{transform:rotate(360deg)} }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Student Registration" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto sr-main">
            {pageLoading && <Loader message="Loading registration options…" />}

            {/* ── Hero ── */}
            <div className="sr-hero">
              <div className="sr-hero-glow"  aria-hidden="true" />
              <div className="sr-hero-glow2" aria-hidden="true" />

              <div className="sr-hero-inner">
                <div>
                  <div className="sr-kicker">
                    <span className="sr-kicker-dot" />
                    Student Registration
                  </div>
                  <h1 className="sr-hero-title">
                    {getGreeting()}, <em>Admin.</em>
                  </h1>
                  <p className="sr-hero-sub">
                    Register a new student into the school system. Fill in personal, academic, and contact details below.
                  </p>
                  <div className="sr-hero-btns">
                    <button type="button" className="sr-btn-back" onClick={() => navigate("/students")}>
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M13 7H1M7 13L1 7l6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Back to Students
                    </button>
                  </div>
                </div>

                {/* Progress card */}
                <div className="sr-hero-card d-none d-md-block">
                  <div className="sr-progress-label">
                    <span className="sr-progress-text">Form progress</span>
                    <span className="sr-progress-pct">{progressPct}%</span>
                  </div>
                  <div className="sr-progress-track">
                    <div className="sr-progress-fill" style={{ width:`${progressPct}%` }} />
                  </div>
                  <div className="sr-status-row">
                    <span className={`sr-status-dot ${requiredOk ? "sr-status-dot--ok" : "sr-status-dot--warn"}`} />
                    {requiredOk ? "Ready to submit" : "Complete required fields"}
                  </div>
                  <div className="sr-tips">
                    <div className="sr-tip"><span className="sr-tip-dot"/>&nbsp;Upload a photo for easy ID</div>
                    <div className="sr-tip"><span className="sr-tip-dot"/>&nbsp;Leave Admission No blank to auto-generate</div>
                    <div className="sr-tip"><span className="sr-tip-dot"/>&nbsp;Fields marked <b style={{ color:"#c9a84c" }}>*</b> are required</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit}>
              <div className="sr-form-wrap">

                {/* ── 1. Photo ── */}
                <div className="sr-section">
                  <SectionHead
                    icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M1 14c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
                    title="Student Photo"
                    subtitle="Optional — helps with quick identification in the directory."
                  />
                  <div className="sr-section-body">
                    <div className="sr-photo-section">
                      <div className="sr-avatar">
                        {photoPreview
                          ? <img src={photoPreview} alt="Preview"/>
                          : <div className="sr-avatar-placeholder">
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="9" r="4" stroke="currentColor" strokeWidth="1.4"/><path d="M3 20c0-4.418 4.03-8 9-8s9 3.582 9 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                              <span>No photo</span>
                            </div>
                        }
                      </div>
                      <div className="sr-photo-actions">
                        <div className="sr-photo-name">Student photo</div>
                        <div className="sr-photo-desc">JPEG or PNG. Recommended 200×200px or larger.</div>
                        <div className="sr-photo-btns">
                          <label className="sr-upload-btn">
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M1 11.5V4.5a1 1 0 011-1h1l1-2h6l1 2h1a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                            {photoPreview ? "Change photo" : "Upload photo"}
                            <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display:"none" }}/>
                          </label>
                          {photoPreview && (
                            <button type="button" className="sr-remove-btn" onClick={clearPhoto}>
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 2. Personal ── */}
                <div className="sr-section" style={{ "--si":"#fef3c7","--sc":"#b45309" } as React.CSSProperties}>
                  <SectionHead
                    icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M1 14c0-3.314 2.686-6 6-6h2c3.314 0 6 2.686 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
                    title="Personal Information"
                    subtitle="Full legal name, gender and date of birth."
                    tag="Required"
                  />
                  <div className="sr-section-body">
                    <div className="sr-grid">
                      <Field label="First Name" required>
                        <input name="firstname" className="sr-input" placeholder="e.g. Covenant"
                          value={form.firstname} onChange={handleChange} autoFocus/>
                      </Field>
                      <Field label="Surname" required>
                        <input name="surname" className="sr-input" placeholder="e.g. Okafor"
                          value={form.surname} onChange={handleChange}/>
                      </Field>
                      <Field label="Other Name" required>
                        <input name="third_name" className="sr-input" placeholder="e.g. Emmanuel"
                          value={form.third_name} onChange={handleChange}/>
                      </Field>
                      <Field label="Gender" required>
                        <select name="gender" className="sr-select" value={form.gender} onChange={handleChange}>
                          <option value="">Select gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </Field>
                      <Field label="Date of Birth" hint="Optional">
                        <input name="dob" type="date" className="sr-input" value={form.dob} onChange={handleChange}/>
                      </Field>
                    </div>
                  </div>
                </div>

                {/* ── 3. Academic ── */}
                <div className="sr-section" style={{ "--si":"#dbeafe","--sc":"#1e40af" } as React.CSSProperties}>
                  <SectionHead
                    icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L15 5.5l-7 3.5-7-3.5L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M3.5 7.5V12c0 1.5 2 2.5 4.5 2.5s4.5-1 4.5-2.5V7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
                    title="Academic Information"
                    subtitle="Class, section, department and admission number."
                    tag="Required"
                  />
                  <div className="sr-section-body">
                    <div className="sr-grid">
                      {autoAdmission === 0 && (
                        <Field label="Admission Number" hint="Leave blank to auto-generate">
                          <input name="reg_no" className="sr-input" placeholder="e.g. GQ/2026/001"
                            value={form.reg_no} onChange={handleChange}/>
                        </Field>
                      )}
                      <Field label="Class / Level" required>
                        <select name="level_id" className="sr-select" value={form.level_id} onChange={handleChange}>
                          <option value="">Select class</option>
                          {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                      </Field>
                      <Field label="Section" required>
                        <select name="section_id" className="sr-select" value={form.section_id} onChange={handleChange}>
                          <option value="">Select section</option>
                          {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </Field>
                      <Field label="Department" required>
                        <select name="department_id" className="sr-select" value={form.department_id} onChange={handleChange}>
                          <option value="">Select department</option>
                          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </Field>
                    </div>
                  </div>
                </div>

                {/* ── 4. Additional ── */}
                <div className="sr-section" style={{ "--si":"#d1fae5","--sc":"#065f46" } as React.CSSProperties}>
                  <SectionHead
                    icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3"/><path d="M8 5v3.5L10 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    title="Additional Details"
                    subtitle="Health, religious and nationality information."
                  />
                  <div className="sr-section-body">
                    <div className="sr-grid">
                      <Field label="Blood Group">
                        <select name="blood_group" className="sr-select" value={form.blood_group} onChange={handleChange}>
                          <option value="">Select</option>
                          {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(g => <option key={g}>{g}</option>)}
                        </select>
                      </Field>
                      <Field label="Religion">
                        <input name="religion" className="sr-input" placeholder="e.g. Christianity, Islam"
                          value={form.religion} onChange={handleChange}/>
                      </Field>
                      <Field label="Nationality">
                        <input name="nationality" className="sr-input" placeholder="e.g. Nigerian"
                          value={form.nationality} onChange={handleChange}/>
                      </Field>
                    </div>
                  </div>
                </div>

                {/* ── 5. Contact ── */}
                <div className="sr-section" style={{ "--si":"#ede9fe","--sc":"#7c3aed" } as React.CSSProperties}>
                  <SectionHead
                    icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2h3l1.5 4-1.5 1.5a9 9 0 004 4l1.5-1.5L14 11.5V14a1.5 1.5 0 01-1.5 1.5A13.5 13.5 0 011 2A1.5 1.5 0 012.5 .5H2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>}
                    title="Contact Information"
                    subtitle="Phone number and residential address."
                  />
                  <div className="sr-section-body">
                    <div className="sr-grid">
                      <Field label="Phone Number">
                        <input name="phone" className="sr-input" placeholder="e.g. 08012345678"
                          value={form.phone} onChange={handleChange}/>
                      </Field>
                      <div className="sr-col2">
                        <Field label="Address">
                          <input name="address" className="sr-input" placeholder="Residential address"
                            value={form.address} onChange={handleChange}/>
                        </Field>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </form>

            <div style={{ marginTop:"auto" }}><Footer /></div>
          </main>
        </div>
      </div>

      {/* ── Sticky action bar ── */}
      <div className="sr-action-bar">
        <div className="sr-action-status">
          <span className={`sr-action-status-dot ${requiredOk ? "sr-action-status-dot--ok" : "sr-action-status-dot--warn"}`} />
          {requiredOk
            ? "All required fields complete — ready to register."
            : "Complete required fields (*) to enable submission."}
        </div>
        <div className="sr-action-btns mb-5">
          <button type="button" className="sr-cancel-btn" onClick={() => navigate("/students")} disabled={loading}>
            Cancel
          </button>
          <button
            type="submit"
            form="sr-form"
            className={`sr-submit-btn ${requiredOk && !loading ? "sr-submit-btn--ready" : ""}`}
            disabled={loading || !requiredOk}
            onClick={handleSubmit}
          >
            {loading
              ? <><span className="sr-spinner"/>Registering…</>
              : <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Register Student
                </>
            }
          </button>
        </div>
      </div>
    </>
  );
}