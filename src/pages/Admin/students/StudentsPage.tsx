// src/pages/Admin/students/StudentsPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { authApi } from "../../../utils/axios";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { useToast } from "../../../contexts/ToastContext";
import { useNavigate } from "react-router-dom";
import PageTitle from "../../../components/PageTitle";

/**
 * StudentsPage.tsx — wired to Bootstrap Sass variables
 *
 * Color hierarchy (no riot):
 *   $light  (#fcf8f8)   → page bg, panel bg, table header, stat footer border  [~85%]
 *   $dark   (#050008)   → hero bg, headings, stat values, modal header          [dark surfaces]
 *   $secondary (amber)  → hero CTA, session badge, hero stat values, chart line,
 *                         search focus, active tab underline, view btn,
 *                         "Current" session badge, form section headers,
 *                         save-ratings btn amber text, avatar gradient           [~8%]
 *   $primary (magenta)  → hero greeting italic, kicker dot                      [~4%]
 *   per-card semantics  → stat icon bg, summary icon bg (data only, ≤42px)      [~3%]
 *   $success/$danger    → session live dot, active/inactive badges, password ok  [~1%]
 *
 * Bootstrap classes used:
 *   Layout:  container-fluid, row, col-md-9, col-lg-10, ms-auto
 *   Display: d-flex, flex-column, flex-wrap, align-items-*, d-none d-md-block
 *   Spacing: gap-2/3/4, mb-3/4, overflow-auto
 */

/* ========================= TYPES ========================= */
interface Student {
  id: number; firstname: string; surname: string; third_name?: string;
  reg_no: string; level?: { id: number; name: string };
  department?: { id: number; name: string }; section?: { id: number; name: string };
  sex?: string; status?: number; photo?: string; email?: string; phone?: string;
  dob?: string; address?: string; blood_group?: string | null;
  religion?: string | null; nationality?: string | null;
  username?: string | null; school_id?: number;
}

interface CachedProfile {
  profile: any;
  performance: { labels: string[]; data: number[] };
}

type ModalTab = "overview" | "sessions" | "performance" | "ratings" | "security";

/* ========================= HELPERS ========================= */
const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";
const fullName   = (s?: any) =>
  [capitalize(s?.firstname ?? ""), capitalize(s?.third_name ?? ""), capitalize(s?.surname ?? "")]
    .filter(Boolean).join(" ").trim();

const InfoRow = ({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) => (
  <div className="sp-info-row">
    <div className="sp-info-label">
      {icon && <span className="sp-info-icon">{icon}</span>}
      {label}
    </div>
    <div className="sp-info-val">{value && value !== "" ? value : <span style={{ color: "#c8bfb5" }}>N/A</span>}</div>
  </div>
);

const RatingRow = ({
  label, id, value, onChange,
}: { label: string; id: number; value?: number; onChange: (v: number) => void; prefix: string }) => (
  <div className="sp-rating-row">
    <span className="sp-rating-label">{label}</span>
    <div className="sp-rating-btns">
      {[1, 2, 3, 4].map(n => (
        <button key={n} type="button"
          className={`sp-rating-btn ${value === n ? "sp-rating-btn--active" : ""}`}
          onClick={() => onChange(n)}>
          {n}
        </button>
      ))}
    </div>
  </div>
);

/* ========================= COMPONENT ========================= */
export default function StudentsPage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* List */
  const [students, setStudents]     = useState<Student[]>([]);
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [perPage]                   = useState(8);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(false);

  /* Profile */
  const [selectedStudent, setSelectedStudent]   = useState<Student | null>(null);
  const [studentDetails, setStudentDetails]     = useState<any>(null);
  const [loadingProfile, setLoadingProfile]     = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<ModalTab>("overview");

  /* Edit */
  const [savingStudent, setSavingStudent] = useState(false);
  const [isEditMode, setIsEditMode]       = useState(false);
  const [editedStudent, setEditedStudent] = useState<any>({});
  const [photoFile, setPhotoFile]         = useState<File | null>(null);
  const [photoPreview, setPhotoPreview]   = useState<string>("");

  /* Password */
  const [decryptedPassword, setDecryptedPassword] = useState("");
  const [passwordVisible, setPasswordVisible]     = useState(false);
  const [loadingPassword, setLoadingPassword]     = useState(false);

  /* Performance */
  const [performanceLabels, setPerformanceLabels] = useState<string[]>([]);
  const [performanceData, setPerformanceData]     = useState<number[]>([]);

  /* Ratings */
  const [affectiveDomains, setAffectiveDomains]     = useState<any[]>([]);
  const [psychomotorDomains, setPsychomotorDomains] = useState<any[]>([]);
  const [affectiveRatings, setAffectiveRatings]     = useState<Record<number, number>>({});
  const [psychomotorRatings, setPsychomotorRatings] = useState<Record<number, number>>({});
  const [savingRatings, setSavingRatings]           = useState(false);

  const chartRef      = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);
  const profileCache  = useRef<Record<number, CachedProfile>>({});

  const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const getPhoto = (photo?: string) => photo ? `${BASE_URL}/uploads/users/${photo}` : "/media/profile.jpg";
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning"; if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  /* ─── Fetch ─── */
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await authApi.get("/all-students", { params: { page, perPage, search } });
      const d = res.data.students;
      setStudents(d?.data || d || []);
      setTotalPages(d?.last_page || 1);
    } catch (err: any) { showError(err?.response?.data?.message ?? "Failed to load students"); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchStudents(); }, [page, search]);

  /* ─── Open student ─── */
  const openStudent = async (student: Student) => {
    setSelectedStudent(student); setLoadingProfile(true);
    setIsEditMode(false); setEditedStudent({}); setPhotoFile(null); setPhotoPreview("");
    setPasswordVisible(false); setDecryptedPassword(""); setActiveProfileTab("overview");

    if (profileCache.current[student.id]) {
      const c = profileCache.current[student.id];
      setStudentDetails(c.profile); setPerformanceLabels(c.performance.labels); setPerformanceData(c.performance.data);
      setAffectiveDomains(c.profile.affectiveDomains || []); setPsychomotorDomains(c.profile.psychomotorDomains || []);
      const aff: Record<number, number> = {}; const psy: Record<number, number> = {};
      Object.values(c.profile.affectiveRatings   || {}).forEach((r: any) => (aff[r.affective_id]  = r.rate));
      Object.values(c.profile.psychomotorRatings || {}).forEach((r: any) => (psy[r.psychomotor_id] = r.rate));
      setAffectiveRatings(aff); setPsychomotorRatings(psy); setLoadingProfile(false); return;
    }

    try {
      const [pr, perf] = await Promise.all([
        authApi.get(`/students/show/${student.id}`),
        authApi.get(`/students/${student.id}/performance`),
      ]);
      setStudentDetails(pr.data);
      setAffectiveDomains(pr.data.affectiveDomains || []); setPsychomotorDomains(pr.data.psychomotorDomains || []);
      const aff: Record<number, number> = {}; const psy: Record<number, number> = {};
      Object.values(pr.data.affectiveRatings   || {}).forEach((r: any) => (aff[r.affective_id]  = r.rate));
      Object.values(pr.data.psychomotorRatings || {}).forEach((r: any) => (psy[r.psychomotor_id] = r.rate));
      setAffectiveRatings(aff); setPsychomotorRatings(psy);
      const labels = perf.data.averages?.map((a: any) => a.term) || [];
      const data   = perf.data.averages?.map((a: any) => Number(a.total_average)) || [];
      setPerformanceLabels(labels); setPerformanceData(data);
      profileCache.current[student.id] = { profile: pr.data, performance: { labels, data } };
    } catch (err: any) { showError(err?.response?.data?.message ?? "Failed to load profile"); }
    finally { setLoadingProfile(false); }
  };

  const closeModal = () => {
    setSelectedStudent(null); setStudentDetails(null); setIsEditMode(false);
    setEditedStudent({}); setPhotoFile(null); setPhotoPreview("");
    setPasswordVisible(false); setDecryptedPassword(""); setActiveProfileTab("overview");
  };

  /* ─── Edit ─── */
  const enableEdit = () => {
    if (!studentDetails) return;
    setIsEditMode(true);
    setEditedStudent({
      firstname: studentDetails.student?.firstname || "", surname: studentDetails.student?.surname || "",
      third_name: studentDetails.student?.third_name || "", email: studentDetails.student?.email || "",
      phone: studentDetails.student?.phone || "", dob: studentDetails.student?.dob || "",
      address: studentDetails.student?.address || "", sex: studentDetails.student?.sex || "",
      level_id: studentDetails.student?.level?.id || "", department_id: studentDetails.student?.department?.id || "",
      section_id: studentDetails.student?.section?.id || "", blood_group: studentDetails.student?.blood_group || "",
      religion: studentDetails.student?.religion || "", nationality: studentDetails.student?.nationality || "",
      password: "",
    });
    setPhotoPreview(getPhoto(studentDetails.student?.photo));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setPhotoFile(f);
    const r = new FileReader(); r.onloadend = () => setPhotoPreview(r.result as string); r.readAsDataURL(f);
  };

  const saveStudent = async () => {
    if (!selectedStudent) return;
    setSavingStudent(true);
    try {
      const fd = new FormData();
      Object.entries(editedStudent).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v as any); });
      if (photoFile) fd.append("photo", photoFile);
      fd.append("_method", "PUT");
      const res = await authApi.post(`/students/update/${selectedStudent.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      showSuccess(res.data.message || "Student updated!");
      if (profileCache.current[selectedStudent.id]) profileCache.current[selectedStudent.id].profile.student = res.data.data;
      setStudentDetails({ ...studentDetails, student: res.data.data });
      setStudents(students.map(s => s.id === selectedStudent.id ? res.data.data : s));
      setIsEditMode(false); setPhotoFile(null); setPhotoPreview("");
    } catch (err: any) { showError(err?.response?.data?.message || "Failed to update"); }
    finally { setSavingStudent(false); }
  };

  /* ─── Chart — amber line ($secondary), $dark tooltip ─── */
  useEffect(() => {
    if (!selectedStudent || !chartRef.current || performanceData.length === 0) return;
    chartInstance.current?.destroy();
    chartInstance.current = new Chart(chartRef.current, {
      type: "line",
      data: {
        labels: performanceLabels,
        datasets: [{
          label: "Average Score",
          data: performanceData,
          borderWidth: 2.5,
          pointRadius: 5,
          /* Point colour = semantic data (score range indicator) */
          pointBackgroundColor: performanceData.map(v =>
            v < 50 ? "var(--sp-danger, rgb(239,68,68))"
            : v < 70 ? "var(--sp-warning, rgb(245,158,11))"
            : "var(--sp-success, rgb(34,197,94))"
          ),
          borderColor: "rgb(255,200,87)",         /* $secondary amber line */
          backgroundColor: "rgba(255,200,87,0.08)",
          tension: 0.4, fill: true,
        }],
      },
      options: {
        animation: { duration: 800, easing: "easeOutQuart" },
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#050008",            /* $dark */
            padding: 12, cornerRadius: 8,
            titleColor: "rgb(255,200,87)",         /* $secondary */
            bodyColor: "#94a3b8",
            callbacks: { label: ctx => `Average: ${ctx.raw}%` },
          },
        },
        scales: {
          y: { beginAtZero: true, max: 100, grid: { color: "rgba(0,0,0,0.04)" }, ticks: { color: "#9a8a7a" }, border: { display: false } },
          x: { grid: { display: false }, ticks: { color: "#9a8a7a" }, border: { display: false } },
        },
      },
    });
  }, [selectedStudent, performanceLabels, performanceData]);

  /* ─── Password ─── */
  const togglePassword = async () => {
    if (!selectedStudent) return;
    if (passwordVisible) { setPasswordVisible(false); setDecryptedPassword(""); return; }
    setLoadingPassword(true);
    try {
      const res = await authApi.post("/decrypt-password", { user_id: selectedStudent.id });
      if (res.data.decrypted_password) { setDecryptedPassword(res.data.decrypted_password); setPasswordVisible(true); showSuccess("Decrypted."); }
      else showError("Failed to decrypt.");
    } catch (err: any) { showError(err?.response?.data?.message || "Failed to decrypt."); }
    finally { setLoadingPassword(false); }
  };

  const copyPassword = () => {
    if (!decryptedPassword) return showError("Decrypt password first.");
    navigator.clipboard.writeText(decryptedPassword).then(() => showSuccess("Copied!"));
  };

  /* ─── Ratings ─── */
  const saveRatings = async () => {
    if (!selectedStudent || !studentDetails) return showError("No student selected.");
    const aff = Object.entries(affectiveRatings).map(([id, rate]) => ({ id: parseInt(id), rate }));
    const psy = Object.entries(psychomotorRatings).map(([id, rate]) => ({ id: parseInt(id), rate }));
    if (!aff.length && !psy.length) return showError("Select at least one rating.");
    if ([...aff, ...psy].some(r => r.rate < 1 || r.rate > 4)) return showError("Ratings must be 1–4.");
    setSavingRatings(true);
    try {
      const res = await authApi.post("/save-ratings", {
        user_id: selectedStudent.id, school_id: studentDetails.student.school_id,
        affective: aff, psychomotor: psy,
      });
      showSuccess(res.data.message || "Ratings saved!");
    } catch (err: any) { showError(err?.response?.data?.message || "Failed to save ratings."); }
    finally { setSavingRatings(false); }
  };

  /* ─── Derived stats ─── */
  const activeCount = useMemo(() => students.filter(s => s.status === 1).length, [students]);
  const maleCount   = useMemo(() => students.filter(s => (s.sex ?? "").toLowerCase() === "male").length, [students]);
  const femaleCount = useMemo(() => students.filter(s => (s.sex ?? "").toLowerCase() === "female").length, [students]);

  const modalStudent = studentDetails?.student ?? selectedStudent;

  /* ========================= RENDER ========================= */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500&display=swap');

        /*
         * Token bridge — Bootstrap compiles your Sass vars to these CSS custom props.
         * Fallbacks ensure correct values even without Bootstrap's CSS var emission.
         */
        :root {
          --sp-light:    var(--bs-light,     #fcf8f8);
          --sp-dark:     var(--bs-dark,      #050008);
          --sp-accent:   var(--bs-secondary, rgb(255,200,87));   /* amber  */
          --sp-magenta:  var(--bs-primary,   rgb(211,0,176));    /* magenta */
          --sp-success:  var(--bs-success,   rgb(34,197,94));
          --sp-danger:   var(--bs-danger,    rgb(239,68,68));
          --sp-warning:  var(--bs-warning,   rgb(245,158,11));
          --sp-info:     var(--bs-info,      rgb(59,130,246));
          --sp-border:   var(--bs-border-color, #ede8e0);
          --sp-radius:   var(--bs-border-radius-lg, 14px);

          --sp-accent-dim:    rgba(255,200,87,0.10);
          --sp-accent-border: rgba(255,200,87,0.22);
          --sp-accent-glow:   rgba(255,200,87,0.10);
          --sp-magenta-dim:   rgba(211,0,176,0.08);
        }

        /* ── Page ── */
        .db-main {
          background: var(--sp-light);
          min-height: 100vh;
          font-family: 'DM Sans', sans-serif;
          padding: 28px 28px 0;
        }

        /* ── Hero ── */
        .db-hero {
          background: var(--sp-dark);          /* $dark — same dark sandwich pattern */
          border-radius: var(--sp-radius);
          padding: 32px 36px;
          position: relative; overflow: hidden;
          margin-bottom: 24px;
        }
        .db-hero::before {
          content: ''; position: absolute; inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,.045) 1px, transparent 1px);
          background-size: 24px 24px; pointer-events: none;
        }
        /* Amber glow — $secondary */
        .db-hero-glow  { position:absolute; top:-60px; right:-60px; width:320px; height:320px; border-radius:50%; background:radial-gradient(circle, rgba(255,200,87,.10) 0%, transparent 65%); pointer-events:none; }
        /* Magenta glow — $primary, dim */
        .db-hero-glow2 { position:absolute; bottom:-40px; left:30%; width:200px; height:200px; border-radius:50%; background:radial-gradient(circle, rgba(211,0,176,.06) 0%, transparent 70%); pointer-events:none; }

        .db-hero-inner { position:relative; z-index:1; display:flex; align-items:center; justify-content:space-between; gap:32px; flex-wrap:wrap; }

        /* Session badge — amber, $secondary */
        .db-session-badge {
          display:inline-flex; align-items:center; gap:7px;
          font-size:11px; font-weight:500; letter-spacing:.12em; text-transform:uppercase;
          color: var(--sp-accent);
          background: var(--sp-accent-dim);
          border: 1px solid var(--sp-accent-border);
          border-radius:999px; padding:4px 12px; margin-bottom:14px;
        }
        /* Live dot — $success, data context */
        .db-session-dot { width:6px; height:6px; border-radius:50%; background: var(--sp-success); animation:dbPulse 2s ease infinite; }
        @keyframes dbPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.5)} }

        /* Greeting — Playfair Display, consistent with all hero sections */
        .db-greeting { font-family:'Playfair Display',serif; font-size:clamp(22px,2.5vw,32px); font-weight:900; color:#fff; line-height:1.1; margin-bottom:8px; }
        /* Italic = magenta — consistent rule across all components */
        .db-greeting em { font-style:italic; color: var(--sp-magenta); }

        .db-hero-sub { font-size:13.5px; font-weight:300; color:rgba(255,255,255,0.38); line-height:1.65; max-width:540px; margin-bottom:24px; }

        /* CTA buttons — amber primary + ghost, same as all dark-bg CTAs */
        .db-btn-gold { display:inline-flex; align-items:center; gap:8px; padding:10px 20px; font-size:13px; font-weight:500; color:var(--sp-dark); background:var(--sp-accent); border:none; border-radius:10px; cursor:pointer; transition:background .2s,transform .2s; white-space:nowrap; }
        .db-btn-gold:hover { background:#ffe0a0; transform:translateY(-1px); }
        .db-btn-outline { display:inline-flex; align-items:center; gap:8px; padding:10px 20px; font-size:13px; font-weight:400; color:rgba(255,255,255,.75); background:transparent; border:1px solid rgba(255,255,255,.14); border-radius:10px; cursor:pointer; transition:background .2s,border-color .2s,color .2s; white-space:nowrap; }
        .db-btn-outline:hover { background:rgba(255,255,255,.06); color:#fff; border-color:rgba(255,255,255,.28); }
        .db-btn-outline:disabled { opacity:.5; cursor:not-allowed; }

        /* Hero stat card — frosted dark surface */
        .db-hero-stat-card { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.09); backdrop-filter:blur(8px); border-radius:var(--sp-radius); padding:20px 24px; min-width:220px; }
        .db-hero-stat-item { display:flex; justify-content:space-between; align-items:center; gap:16px; }
        .db-hero-stat-label { font-size:12px; font-weight:300; color:rgba(255,255,255,0.28); }
        /* Stat values — amber, $secondary */
        .db-hero-stat-val { font-family:'Playfair Display',serif; font-size:18px; font-weight:700; color:var(--sp-accent); }
        .db-hero-stat-sep { height:1px; background:rgba(255,255,255,.06); }

        /* ── KPI stat cards ── */
        .db-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
        @media(max-width:1100px){ .db-stats{grid-template-columns:repeat(2,1fr);} }
        @media(max-width:600px) { .db-stats{grid-template-columns:1fr;} }

        .db-stat { background:#fff; border:1px solid var(--sp-border); border-radius:var(--sp-radius); padding:24px 22px; position:relative; overflow:hidden; transition:box-shadow .25s,transform .25s; animation:dbFadeUp .5s ease both; }
        @keyframes dbFadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .db-stat:hover { box-shadow:0 8px 28px rgba(0,0,0,.08); transform:translateY(-3px); }
        /* Top stripe — per-card semantic colour, 3px only */
        .db-stat::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:var(--sc); transform:scaleX(0); transform-origin:left; transition:transform .3s ease; }
        .db-stat:hover::before { transform:scaleX(1); }
        .db-stat-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
        .db-stat-icon { width:42px; height:42px; border-radius:10px; background:var(--si); color:var(--sc); display:flex; align-items:center; justify-content:center; transition:transform .3s cubic-bezier(.34,1.56,.64,1); }
        .db-stat:hover .db-stat-icon { transform:scale(1.1) rotate(-4deg); }
        .db-stat-label { font-size:12px; font-weight:400; color:#9a8a7a; margin-bottom:5px; letter-spacing:.03em; }
        /* Values — $dark, consistent with dashboard */
        .db-stat-val { font-family:'Playfair Display',serif; font-size:30px; font-weight:700; color:var(--sp-dark); line-height:1; }
        .db-stat-footer { display:flex; align-items:center; gap:6px; margin-top:14px; padding-top:12px; border-top:1px solid var(--sp-light); font-size:12px; color:#9a8a7a; }

        /* ── Panel ── */
        .db-panel { background:#fff; border:1px solid var(--sp-border); border-radius:var(--sp-radius); overflow:hidden; margin-bottom:24px; }
        .db-panel-head { display:flex; align-items:center; justify-content:space-between; padding:20px 24px 16px; border-bottom:1px solid rgba(0,0,0,0.06); gap:12px; flex-wrap:wrap; }
        .db-panel-icon { width:36px; height:36px; border-radius:9px; display:flex; align-items:center; justify-content:center; background:var(--pi); color:var(--pc); flex-shrink:0; }
        .db-panel-title { font-family:'Playfair Display',serif; font-size:16px; font-weight:700; color:var(--sp-dark); margin:0; }
        .db-panel-sub { font-size:11.5px; font-weight:300; color:#9a8a7a; margin:0; }

        /* ── Search bar ── */
        .db-search-wrap { position:relative; }
        .db-search-icon { position:absolute; left:13px; top:50%; transform:translateY(-50%); color:#b5a090; pointer-events:none; display:flex; align-items:center; }
        .db-search { width:100%; min-width:280px; background:var(--sp-light); border:1.5px solid var(--sp-border); border-radius:9px; padding:10px 36px 10px 38px; font-family:'DM Sans',sans-serif; font-size:13.5px; color:var(--sp-dark); outline:none; transition:border-color .2s,box-shadow .2s; }
        .db-search::placeholder { color:#bdb3a8; }
        /* Focus — amber border, $secondary */
        .db-search:focus { border-color:var(--sp-accent-border); box-shadow:0 0 0 3px var(--sp-accent-dim); background:#fff; }
        .db-search-clear { position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; color:#b5a090; cursor:pointer; display:flex; align-items:center; padding:4px; transition:color .2s; }
        .db-search-clear:hover { color:#7a6a5a; }

        .db-sm-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; font-size:12.5px; font-weight:400; color:#7a6a5a; background:var(--sp-light); border:1px solid var(--sp-border); border-radius:8px; cursor:pointer; transition:background .2s; white-space:nowrap; }
        .db-sm-btn:hover { background:#ede8e0; color:var(--sp-dark); }
        .db-sm-btn:disabled { opacity:.45; cursor:not-allowed; }
        /* Primary sm-btn — $dark bg, amber hover hint */
        .db-sm-btn-primary { background:var(--sp-dark); color:#fff; border-color:var(--sp-dark); }
        .db-sm-btn-primary:hover { background:#1a1a2e; color:#fff; }

        /* ── Table ── */
        .db-table { width:100%; border-collapse:collapse; }
        .db-table th { padding:10px 16px; font-size:11px; font-weight:500; letter-spacing:.1em; text-transform:uppercase; color:#9a8a7a; background:var(--sp-light); border-bottom:1px solid rgba(0,0,0,0.06); text-align:left; white-space:nowrap; }
        .db-table td { padding:14px 16px; font-size:13.5px; color:#4a4a5a; border-bottom:1px solid rgba(0,0,0,0.04); vertical-align:middle; }
        .db-table tbody tr:last-child td { border-bottom:none; }
        .db-table tbody tr { transition:background .15s; }
        .db-table tbody tr:hover { background:var(--sp-light); }
        .db-table-empty { padding:56px 16px; text-align:center; color:#b5a090; font-size:13.5px; }

        /* Student avatar — amber gradient initials */
        .db-avatar { width:40px; height:40px; border-radius:50%; object-fit:cover; border:2px solid rgba(0,0,0,0.06); flex-shrink:0; }
        .db-avatar-initials { width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg, var(--sp-accent-dim), rgba(255,200,87,0.25)); color:rgb(180,83,9); font-family:'Playfair Display',serif; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; border:2px solid var(--sp-accent-border); }

        .db-student-name { font-weight:500; color:var(--sp-dark); line-height:1.2; }
        .db-student-dept { font-size:11.5px; color:#9a8a7a; }

        /* Semantic badges — data context */
        .db-badge { display:inline-flex; align-items:center; font-size:11.5px; font-weight:500; padding:3px 10px; border-radius:100px; white-space:nowrap; }
        .db-badge--blue   { background:rgba(59,130,246,.10);  color:rgb(59,130,246);  }
        .db-badge--amber  { background:var(--sp-accent-dim);  color:rgb(180,83,9);    }
        .db-badge--green  { background:rgba(34,197,94,.10);   color:rgb(21,128,61);   }
        .db-badge--gray   { background:rgba(100,116,139,.09); color:#64748b;          }
        .db-badge--violet { background:rgba(124,58,237,.09);  color:#7c3aed;          }

        /* View button — amber tint, $secondary at low opacity */
        .db-view-btn { display:inline-flex; align-items:center; gap:5px; padding:6px 13px; font-size:12.5px; font-weight:400; color:rgb(180,83,9); background:var(--sp-accent-dim); border:1px solid var(--sp-accent-border); border-radius:7px; cursor:pointer; transition:background .2s,border-color .2s; white-space:nowrap; }
        .db-view-btn:hover { background:rgba(255,200,87,0.18); border-color:rgba(255,200,87,0.4); }

        /* ── Pagination ── */
        .db-pagination { display:flex; align-items:center; justify-content:space-between; padding:14px 20px; flex-wrap:wrap; gap:10px; border-top:1px solid rgba(0,0,0,0.06); }
        .db-page-info { font-size:12px; font-weight:300; color:#9a8a7a; }
        .db-page-btn { display:inline-flex; align-items:center; gap:5px; padding:6px 12px; font-size:12.5px; font-weight:400; color:#7a6a5a; background:var(--sp-light); border:1px solid var(--sp-border); border-radius:7px; cursor:pointer; transition:background .2s; }
        .db-page-btn:hover:not(:disabled) { background:#ede8e0; color:var(--sp-dark); }
        .db-page-btn:disabled { opacity:.4; cursor:not-allowed; }
        .db-page-current { padding:6px 12px; font-size:12px; color:#9a8a7a; }

        /* ══════════════════════════════════════
           PROFILE MODAL
        ══════════════════════════════════════ */
        .sp-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); backdrop-filter:blur(8px); z-index:1200; display:flex; align-items:center; justify-content:center; padding:16px; }

        .sp-card { width:min(1100px,96vw); max-height:92vh; border-radius:20px; overflow:hidden; background:var(--sp-light); box-shadow:0 24px 72px rgba(0,0,0,.4); display:flex; flex-direction:column; animation:spCardIn .3s cubic-bezier(.34,1.2,.64,1) both; }
        @keyframes spCardIn { from{opacity:0;transform:scale(.96) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }

        /* Modal header — $dark bg, same as hero/pricing/footer */
        .sp-header { background:var(--sp-dark); padding:0; position:relative; overflow:hidden; flex-shrink:0; }
        .sp-header::before { content:''; position:absolute; inset:0; background-image:radial-gradient(circle,rgba(255,255,255,.04) 1px,transparent 1px); background-size:22px 22px; pointer-events:none; }
        /* Amber glow — $secondary */
        .sp-header-glow { position:absolute; top:-40px; right:-40px; width:280px; height:280px; border-radius:50%; background:radial-gradient(circle,rgba(255,200,87,.10) 0%,transparent 65%); pointer-events:none; }

        .sp-header-top { position:relative; z-index:1; padding:24px 28px 0; display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap; }

        /* Modal avatar — amber gradient initials, consistent with table initials */
        .sp-modal-avatar-wrap { position:relative; flex-shrink:0; }
        .sp-modal-avatar { width:64px; height:64px; border-radius:50%; object-fit:cover; border:3px solid rgba(255,255,255,.2); }
        .sp-modal-avatar-initials { width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg, var(--sp-accent), #ffe0a0); color:var(--sp-dark); font-family:'Playfair Display',serif; font-size:20px; font-weight:700; display:flex; align-items:center; justify-content:center; border:3px solid rgba(255,255,255,.2); flex-shrink:0; }
        /* Online dot — $success */
        .sp-online-dot { position:absolute; bottom:2px; right:2px; width:12px; height:12px; background:var(--sp-success); border:2px solid var(--sp-dark); border-radius:50%; }

        .sp-header-info { flex:1; min-width:0; }
        .sp-modal-name { font-family:'Playfair Display',serif; font-size:20px; font-weight:700; color:#fff; line-height:1.15; margin-bottom:4px; }
        .sp-modal-meta { display:flex; flex-wrap:wrap; gap:12px; }
        .sp-modal-meta-item { display:flex; align-items:center; gap:5px; font-size:12px; font-weight:300; color:rgba(255,255,255,0.35); }

        .sp-header-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }

        /* Modal action buttons */
        .sp-btn-edit { display:inline-flex; align-items:center; gap:7px; padding:8px 16px; font-size:13px; font-weight:500; color:var(--sp-dark); background:var(--sp-accent); border:none; border-radius:8px; cursor:pointer; transition:background .2s; }
        .sp-btn-edit:hover { background:#ffe0a0; }
        /* Save — $success, data context (confirm action) */
        .sp-btn-save { display:inline-flex; align-items:center; gap:7px; padding:8px 16px; font-size:13px; font-weight:500; color:#fff; background:var(--sp-success); border:none; border-radius:8px; cursor:pointer; transition:background .2s; }
        .sp-btn-save:hover { background:rgb(21,128,61); }
        .sp-btn-save:disabled { opacity:.6; cursor:not-allowed; }
        .sp-btn-cancel { display:inline-flex; align-items:center; gap:7px; padding:8px 14px; font-size:13px; font-weight:400; color:rgba(255,255,255,.65); background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.15); border-radius:8px; cursor:pointer; transition:background .2s; }
        .sp-btn-cancel:hover { background:rgba(255,255,255,.12); color:#fff; }
        .sp-btn-close { width:32px; height:32px; border-radius:8px; background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12); display:flex; align-items:center; justify-content:center; cursor:pointer; color:rgba(255,255,255,.6); transition:background .2s,color .2s; padding:0; }
        .sp-btn-close:hover { background:rgba(255,255,255,.14); color:#fff; }

        /* Status badge */
        .sp-status { display:inline-flex; align-items:center; gap:5px; font-size:10.5px; font-weight:500; border-radius:100px; padding:2px 9px; }
        /* Active = $success, Inactive = neutral gray — data context */
        .sp-status--active   { background:rgba(34,197,94,.15);   color:var(--sp-success); border:1px solid rgba(34,197,94,.3); }
        .sp-status--inactive { background:rgba(100,116,139,.12); color:#94a3b8; border:1px solid rgba(100,116,139,.2); }
        .sp-status-dot { width:5px; height:5px; border-radius:50%; background:currentColor; }

        /* Tabs — amber active tab, $secondary */
        .sp-tabs { position:relative; z-index:1; display:flex; gap:2px; padding:16px 28px 0; overflow-x:auto; scrollbar-width:none; }
        .sp-tabs::-webkit-scrollbar { display:none; }
        .sp-tab { display:inline-flex; align-items:center; gap:7px; padding:9px 16px; font-size:13px; font-weight:400; color:rgba(255,255,255,.5); background:transparent; border:none; border-radius:8px 8px 0 0; cursor:pointer; white-space:nowrap; transition:color .2s,background .2s; border-bottom:2px solid transparent; }
        .sp-tab:hover { color:rgba(255,255,255,.85); background:rgba(255,255,255,.05); }
        .sp-tab--active { color:var(--sp-accent); background:var(--sp-accent-dim); border-bottom-color:var(--sp-accent); font-weight:500; }
        .sp-tab:disabled { opacity:.4; cursor:not-allowed; }

        /* Modal body */
        .sp-body { overflow-y:auto; flex:1; padding:24px 28px 28px; }

        /* ── Info rows ── */
        .sp-info-row { display:flex; align-items:baseline; justify-content:space-between; padding:11px 0; border-bottom:1px solid var(--sp-border); gap:16px; }
        .sp-info-row:last-child { border-bottom:none; }
        .sp-info-label { font-size:12px; font-weight:500; color:#9a8a7a; text-transform:uppercase; letter-spacing:.08em; display:flex; align-items:center; gap:5px; white-space:nowrap; flex-shrink:0; }
        /* Info icon — amber tint at very small size */
        .sp-info-icon { color:rgb(180,83,9); display:flex; align-items:center; }
        .sp-info-val { font-size:13.5px; font-weight:400; color:var(--sp-dark); text-align:right; }

        /* ── Content cards ── */
        .sp-content-card { background:#fff; border:1px solid var(--sp-border); border-radius:var(--sp-radius); overflow:hidden; margin-bottom:16px; }
        .sp-content-card-head { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid rgba(0,0,0,0.06); gap:8px; flex-wrap:wrap; }
        .sp-content-card-title { font-family:'Playfair Display',serif; font-size:14.5px; font-weight:700; color:var(--sp-dark); }
        .sp-content-card-sub   { font-size:11.5px; font-weight:300; color:#9a8a7a; margin-top:1px; }
        .sp-count-badge { font-size:11px; font-weight:500; color:#9a8a7a; background:var(--sp-light); border:1px solid var(--sp-border); border-radius:100px; padding:2px 9px; }

        /* 3-col summary cards */
        .sp-summary-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:16px; }
        @media(max-width:700px){ .sp-summary-grid{grid-template-columns:1fr;} }
        .sp-summary-card { background:#fff; border:1px solid var(--sp-border); border-radius:12px; padding:16px; display:flex; align-items:center; gap:12px; }
        .sp-summary-icon { width:36px; height:36px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .sp-summary-label { font-size:11px; font-weight:500; text-transform:uppercase; letter-spacing:.08em; color:#9a8a7a; margin-bottom:2px; }
        .sp-summary-val   { font-size:13.5px; font-weight:500; color:var(--sp-dark); }
        .sp-summary-sub   { font-size:11.5px; color:#9a8a7a; }

        /* Edit form */
        .sp-form-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
        @media(max-width:700px){ .sp-form-grid{grid-template-columns:1fr 1fr;} }
        @media(max-width:480px){ .sp-form-grid{grid-template-columns:1fr;} }
        .sp-form-full { grid-column:1/-1; }
        /* Form section label — amber, $secondary at small size */
        .sp-form-section { font-size:10.5px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:rgb(180,83,9); margin:18px 0 4px; grid-column:1/-1; }
        .sp-label { display:block; font-size:12px; font-weight:500; color:#4a4a5a; margin-bottom:6px; letter-spacing:.02em; }
        .sp-input, .sp-select { width:100%; background:var(--sp-light); border:1.5px solid var(--sp-border); border-radius:8px; padding:9px 12px; font-family:'DM Sans',sans-serif; font-size:13px; color:var(--sp-dark); outline:none; transition:border-color .2s,box-shadow .2s; -webkit-appearance:none; }
        /* Focus — amber, $secondary */
        .sp-input:focus, .sp-select:focus { border-color:var(--sp-accent-border); box-shadow:0 0 0 3px var(--sp-accent-dim); background:#fff; }
        .sp-input::placeholder { color:#bdb3a8; }

        /* Sessions table */
        .sp-session-table { width:100%; border-collapse:collapse; }
        .sp-session-table th { padding:9px 16px; font-size:11px; font-weight:500; letter-spacing:.1em; text-transform:uppercase; color:#9a8a7a; background:var(--sp-light); border-bottom:1px solid rgba(0,0,0,0.06); text-align:left; white-space:nowrap; }
        .sp-session-table td { padding:12px 16px; font-size:13px; color:#4a4a5a; border-bottom:1px solid rgba(0,0,0,0.04); vertical-align:middle; }
        .sp-session-table tbody tr:last-child td { border-bottom:none; }
        .sp-session-table tbody tr:hover { background:var(--sp-light); }
        /* "Current" session badge — amber tint, $secondary */
        .sp-current-badge { font-size:9.5px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; background:var(--sp-accent-dim); color:rgb(180,83,9); border:1px solid var(--sp-accent-border); border-radius:100px; padding:2px 7px; margin-left:6px; }

        /* Performance chart */
        .sp-chart-area { padding:20px; height:320px; }

        /* Ratings */
        .sp-rating-section { margin-bottom:16px; }
        .sp-rating-head { display:flex; align-items:center; gap:8px; padding:14px 20px; border-bottom:1px solid rgba(0,0,0,0.06); }
        .sp-rating-head-icon { width:30px; height:30px; border-radius:7px; display:flex; align-items:center; justify-content:center; }
        .sp-rating-head-title { font-family:'Playfair Display',serif; font-size:14px; font-weight:700; color:var(--sp-dark); }
        .sp-rating-head-sub   { font-size:11.5px; color:#9a8a7a; }
        .sp-rating-body { padding:12px 20px; }
        .sp-rating-row { display:flex; align-items:center; justify-content:space-between; padding:9px 0; border-bottom:1px solid rgba(0,0,0,0.04); gap:12px; }
        .sp-rating-row:last-child { border-bottom:none; }
        .sp-rating-label { font-size:13px; font-weight:400; color:#4a4a5a; flex:1; min-width:0; }
        .sp-rating-btns { display:flex; gap:5px; }
        .sp-rating-btn { width:32px; height:32px; border-radius:8px; font-size:12.5px; font-weight:500; background:var(--sp-light); border:1.5px solid var(--sp-border); color:#7a6a5a; cursor:pointer; transition:background .2s,border-color .2s,color .2s; }
        .sp-rating-btn:hover { background:#ede8e0; }
        /* Active rating — $dark bg, amber text = $secondary */
        .sp-rating-btn--active { background:var(--sp-dark); border-color:var(--sp-dark); color:var(--sp-accent); }

        .sp-save-ratings-row { display:flex; justify-content:flex-end; padding-top:8px; }
        /* Save ratings CTA — amber, $secondary */
        .sp-save-ratings-btn { display:inline-flex; align-items:center; gap:7px; padding:11px 22px; font-size:13.5px; font-weight:500; color:var(--sp-dark); background:var(--sp-accent); border:none; border-radius:9px; cursor:pointer; transition:background .2s,transform .2s; }
        .sp-save-ratings-btn:hover:not(:disabled) { background:#ffe0a0; transform:translateY(-1px); }
        .sp-save-ratings-btn:disabled { opacity:.55; cursor:not-allowed; }

        /* Security tab */
        .sp-credential-box { background:var(--sp-light); border:1.5px solid var(--sp-border); border-radius:10px; padding:16px 18px; }
        .sp-credential-label { font-size:11.5px; font-weight:500; color:#9a8a7a; text-transform:uppercase; letter-spacing:.1em; margin-bottom:8px; display:block; }
        .sp-credential-val { font-size:15px; font-weight:500; color:var(--sp-dark); font-family:monospace; }
        .sp-pw-row { display:flex; gap:8px; align-items:center; }
        .sp-pw-input { flex:1; background:#fff; border:1.5px solid var(--sp-border); border-radius:8px; padding:10px 14px; font-family:monospace; font-size:14px; color:var(--sp-dark); outline:none; transition:border-color .2s; }
        .sp-pw-input:focus { border-color:var(--sp-accent-border); }
        .sp-icon-btn { width:36px; height:36px; border-radius:8px; background:var(--sp-light); border:1.5px solid var(--sp-border); display:flex; align-items:center; justify-content:center; cursor:pointer; color:#7a6a5a; transition:background .2s,color .2s; flex-shrink:0; }
        .sp-icon-btn:hover { background:#ede8e0; color:var(--sp-dark); }
        .sp-icon-btn:disabled { opacity:.4; cursor:not-allowed; }
        /* Security warning — $danger tint, data context */
        .sp-security-warn { display:flex; align-items:flex-start; gap:10px; background:rgba(239,68,68,0.05); border:1px solid rgba(239,68,68,0.18); border-radius:9px; padding:12px 14px; font-size:12.5px; color:rgb(185,28,28); line-height:1.55; margin-bottom:18px; }

        /* Modal footer */
        .sp-footer { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 28px; border-top:1px solid var(--sp-border); background:#fff; flex-wrap:wrap; flex-shrink:0; }
        .sp-footer-hint { font-size:12px; color:#b5a090; font-weight:300; }
        .sp-footer-close { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; font-size:13px; font-weight:400; color:#7a6a5a; background:var(--sp-light); border:1px solid var(--sp-border); border-radius:8px; cursor:pointer; transition:background .2s; }
        .sp-footer-close:hover { background:#ede8e0; }

        /* Spinner */
        .sp-spinner { width:18px; height:18px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spSpin .7s linear infinite; flex-shrink:0; }
        .sp-spinner--dark { border:2px solid rgba(0,0,0,.12); border-top-color:var(--sp-dark); }
        @keyframes spSpin { to{transform:rotate(360deg)} }

        /* Skeleton */
        .sp-skel { border-radius:6px; background:linear-gradient(90deg,#ece8e0 25%,#e0dad2 50%,#ece8e0 75%); background-size:200% 100%; animation:spSkelAnim 1.4s ease infinite; }
        @keyframes spSkelAnim { from{background-position:200% 0} to{background-position:-200% 0} }

        /* Photo upload btn */
        .sp-photo-btn { display:inline-flex; align-items:center; gap:6px; padding:6px 13px; font-size:12px; font-weight:400; color:rgba(255,255,255,.75); background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.15); border-radius:7px; cursor:pointer; transition:background .2s; }
        .sp-photo-btn:hover { background:rgba(255,255,255,.15); color:#fff; }

        /* Empty state */
        .sp-empty { padding:52px 20px; text-align:center; }
        .sp-empty-title { font-family:'Playfair Display',serif; font-size:15px; font-weight:700; color:#4a4a5a; margin-bottom:5px; }
        .sp-empty-sub { font-size:13px; color:#b5a090; }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Student page" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loading && <Loader message="Loading students…" />}

            {/* ── Hero ── */}
            <div className="db-hero">
              <div className="db-hero-glow"  aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />
              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Students Registry
                  </div>
                  <h1 className="db-greeting">{getGreeting()}, <em>Admin.</em></h1>
                  <p className="db-hero-sub">
                    Search, view full profiles, edit details, manage ratings, and decrypt credentials where needed.
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    <button className="db-btn-gold" onClick={() => navigate("/students/register")}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M2 15c0-3.314 2.686-6 6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M13 10v4M11 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      Add Student
                    </button>
                    <button className="db-btn-outline" onClick={fetchStudents} disabled={loading}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                        style={{ animation: loading ? "spSpin .8s linear infinite" : "none" }}>
                        <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="db-hero-stat-card d-none d-md-block">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--sp-accent)" }}>
                      Quick glance
                    </span>
                  </div>
                  <div className="d-flex flex-column gap-3">
                    {[["Active", activeCount], ["Male", maleCount], ["Female", femaleCount]].map(([l, v]) => (
                      <React.Fragment key={l as string}>
                        <div className="db-hero-stat-item">
                          <span className="db-hero-stat-label">{l}</span>
                          <span className="db-hero-stat-val">{v}</span>
                        </div>
                        {l !== "Female" && <div className="db-hero-stat-sep" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── KPI cards ── */}
            <div className="db-stats">
              {([
                { title: "Total on Page", value: students.length,
                  color: "var(--bs-warning, rgb(245,158,11))",  bg: "rgba(245,158,11,0.10)",
                  icon: <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M1 17c0-3.314 2.686-6 6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="14" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M10.5 17c0-1.933 1.567-3.5 3.5-3.5s3.5 1.567 3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
                { title: "Active", value: activeCount,
                  color: "var(--bs-success, rgb(34,197,94))",   bg: "rgba(34,197,94,0.10)",
                  icon: <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5.5 9.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
                { title: "Male", value: maleCount,
                  color: "var(--bs-info, rgb(59,130,246))",     bg: "rgba(59,130,246,0.10)",
                  icon: <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><circle cx="8" cy="10" r="5" stroke="currentColor" strokeWidth="1.4"/><path d="M12 6l4-4M16 2h-4M16 2v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg> },
                { title: "Female", value: femaleCount,
                  color: "var(--bs-primary, rgb(211,0,176))",   bg: "rgba(211,0,176,0.08)",
                  icon: <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="7" r="5" stroke="currentColor" strokeWidth="1.4"/><path d="M9 12v5M6.5 15h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
              ] as const).map((c, i) => (
                <div key={c.title} className="db-stat"
                  style={{ "--sc": c.color, "--si": c.bg, animationDelay: `${i * 0.06}s` } as React.CSSProperties}>
                  <div className="db-stat-head">
                    <div className="db-stat-icon">{c.icon}</div>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#c8bfb5" }}><circle cx="3" cy="7" r="1.2" fill="currentColor"/><circle cx="7" cy="7" r="1.2" fill="currentColor"/><circle cx="11" cy="7" r="1.2" fill="currentColor"/></svg>
                  </div>
                  <p className="db-stat-label">{c.title}</p>
                  <div className="db-stat-val">{c.value}</div>
                  <div className="db-stat-footer">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 9l3-4 2 2 3-5" stroke="var(--sp-success)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span style={{ color: "var(--sp-success)", fontWeight: 500 }}>Page {page}</span>
                    &nbsp;of {totalPages}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Directory panel ── */}
            <div className="db-panel">
              <div className="db-panel-head">
                <div className="d-flex align-items-center gap-3">
                  <div className="db-panel-icon"
                    style={{ "--pi": "var(--sp-accent-dim)", "--pc": "rgb(180,83,9)" } as React.CSSProperties}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M2 14c0-2.76 2.24-5 4-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M9 14c0-1.657 1.343-3 3-3s3 1.343 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  </div>
                  <div>
                    <p className="db-panel-title">Student Directory</p>
                    <p className="db-panel-sub">Search by name or registration number.</p>
                  </div>
                </div>

                <div className="d-flex align-items-center flex-wrap gap-2">
                  <div className="db-search-wrap">
                    <span className="db-search-icon">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </span>
                    <input className="db-search" placeholder="Search name or reg. no…"
                      value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    {search && (
                      <button className="db-search-clear" onClick={() => { setSearch(""); setPage(1); }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                      </button>
                    )}
                  </div>
                  <button className="db-sm-btn" onClick={fetchStudents} disabled={loading}>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none"
                      style={{ animation: loading ? "spSpin .8s linear infinite" : "none" }}>
                      <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Refresh
                  </button>
                  <button className="db-sm-btn db-sm-btn-primary" onClick={() => navigate("/students/register")}>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
                    Add Student
                  </button>
                </div>
              </div>

              <div className="overflow-auto">
                <table className="db-table">
                  <thead>
                    <tr>
                      <th>Student</th><th>Reg. No</th><th>Class</th><th>Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td>
                            <div className="d-flex align-items-center gap-3">
                              <div className="sp-skel" style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0 }} />
                              <div>
                                <div className="sp-skel" style={{ width: 120, height: 12, marginBottom: 6 }} />
                                <div className="sp-skel" style={{ width: 80, height: 10 }} />
                              </div>
                            </div>
                          </td>
                          {[80, 90, 70].map((w, j) => <td key={j}><div className="sp-skel" style={{ width: w, height: 12 }} /></td>)}
                          <td style={{ textAlign: "right" }}><div className="sp-skel" style={{ width: 60, height: 28, borderRadius: 7, marginLeft: "auto" }} /></td>
                        </tr>
                      ))
                    ) : students.length === 0 ? (
                      <tr><td colSpan={5} className="db-table-empty">No students found.</td></tr>
                    ) : students.map(s => {
                      const isActive = s.status === 1;
                      const initials = [s.firstname?.[0], s.surname?.[0]].filter(Boolean).join("").toUpperCase();
                      return (
                        <tr key={s.id}>
                          <td>
                            <div className="d-flex align-items-center gap-3">
                              {s.photo
                                ? <img src={getPhoto(s.photo)} className="db-avatar" alt={fullName(s)} />
                                : <div className="db-avatar-initials">{initials}</div>
                              }
                              <div>
                                <div className="db-student-name">{fullName(s)}</div>
                                <div className="db-student-dept">{s.department?.name || "—"}</div>
                              </div>
                            </div>
                          </td>
                          <td><span className="db-badge db-badge--blue">{s.reg_no}</span></td>
                          <td><span className="db-badge db-badge--amber">{s.level?.name || "—"}</span></td>
                          <td>
                            <span className={`db-badge ${isActive ? "db-badge--green" : "db-badge--gray"}`}>
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button className="db-view-btn" onClick={() => openStudent(s)}>
                              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.3"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/></svg>
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="db-pagination">
                <span className="db-page-info">Page {page} of {totalPages}</span>
                <div className="d-flex align-items-center gap-2">
                  <button className="db-page-btn" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Prev
                  </button>
                  <span className="db-page-current">{page} / {totalPages}</span>
                  <button className="db-page-btn" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                    Next
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "auto" }}><Footer /></div>
          </main>
        </div>
      </div>

      {/* ══════════════════════════════════════
          PROFILE MODAL
      ══════════════════════════════════════ */}
      {selectedStudent && (
        <div className="sp-overlay" onMouseDown={closeModal}>
          <div className="sp-card" onMouseDown={e => e.stopPropagation()}>

            {/* ── Modal header ── */}
            <div className="sp-header">
              <div className="sp-header-glow" aria-hidden="true" />

              <div className="sp-header-top">
                {/* Avatar + name */}
                <div className="d-flex align-items-center gap-3" style={{ flex: 1, minWidth: 0 }}>
                  <div className="sp-modal-avatar-wrap">
                    {(photoPreview || modalStudent?.photo)
                      ? <img src={photoPreview || getPhoto(modalStudent?.photo)} className="sp-modal-avatar" alt={fullName(modalStudent)} />
                      : <div className="sp-modal-avatar-initials">
                          {[modalStudent?.firstname?.[0], modalStudent?.surname?.[0]].filter(Boolean).join("").toUpperCase()}
                        </div>
                    }
                    {modalStudent?.status === 1 && <div className="sp-online-dot" />}
                  </div>

                  <div className="sp-header-info">
                    <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                      <span className="sp-modal-name">{fullName(modalStudent)}</span>
                      <span className={`sp-status ${modalStudent?.status === 1 ? "sp-status--active" : "sp-status--inactive"}`}>
                        <span className="sp-status-dot" />
                        {modalStudent?.status === 1 ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="sp-modal-meta">
                      <span className="sp-modal-meta-item">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1 4h10" stroke="currentColor" strokeWidth="1.1"/></svg>
                        {modalStudent?.reg_no ?? selectedStudent.reg_no}
                      </span>
                      <span className="sp-modal-meta-item">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 10V4l4-3 4 3v6H2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                        {modalStudent?.level?.name ?? selectedStudent.level?.name ?? "—"}
                      </span>
                      <span className="sp-modal-meta-item">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/><path d="M4 6h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                        {modalStudent?.department?.name ?? selectedStudent.department?.name ?? "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Header actions */}
                <div className="sp-header-actions">
                  {!loadingProfile && studentDetails && (
                    isEditMode ? (
                      <>
                        <label className="sp-photo-btn">
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M1 10V5a1 1 0 011-1h1l1-2h6l1 2h1a1 1 0 011 1v5a1 1 0 01-1 1H2a1 1 0 01-1-1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                          Photo
                          <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
                        </label>
                        <button className="sp-btn-save" onClick={saveStudent} disabled={savingStudent}>
                          {savingStudent ? <><span className="sp-spinner" />Saving…</> : <>
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5 6.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            Save
                          </>}
                        </button>
                        <button className="sp-btn-cancel"
                          onClick={() => { setIsEditMode(false); setEditedStudent({}); setPhotoFile(null); setPhotoPreview(""); }}
                          disabled={savingStudent}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button className="sp-btn-edit" onClick={enableEdit}>
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2L5 11H3V9l6.5-6.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                        Edit
                      </button>
                    )
                  )}
                  <button className="sp-btn-close" onClick={closeModal} aria-label="Close">
                    <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="sp-tabs">
                {([
                  { key: "overview",    label: "Overview",    icon: <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="1" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="8" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="8" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/></svg> },
                  { key: "sessions",    label: "Sessions",    icon: <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 6h12M5 1v2M9 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
                  { key: "performance", label: "Performance", icon: <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M1 11L4 6l3 3 3-6 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg> },
                  { key: "ratings",     label: "Ratings",     icon: <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.8 3.6L13 5.3l-3 2.9.7 4.1L7 10.2l-3.7 2.1.7-4.1L1 5.3l4.2-.7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg> },
                  { key: "security",    label: "Security",    icon: <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1.5L2 3.5v4c0 2.9 2.2 5.6 5 6.5 2.8-.9 5-3.6 5-6.5v-4L7 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg> },
                ] as { key: ModalTab; label: string; icon: React.ReactNode }[]).map(t => (
                  <button key={t.key}
                    className={`sp-tab ${activeProfileTab === t.key ? "sp-tab--active" : ""}`}
                    onClick={() => setActiveProfileTab(t.key)} disabled={loadingProfile}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Body ── */}
            <div className="sp-body">
              {loadingProfile ? (
                <div className="d-flex flex-column align-items-center gap-3" style={{ padding: "48px 0" }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none"
                    style={{ animation: "spSpin .8s linear infinite", color: "rgb(180,83,9)" }}>
                    <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round"/>
                  </svg>
                  <span style={{ fontSize: 13, color: "#9a8a7a" }}>Loading student details…</span>
                </div>
              ) : !studentDetails ? (
                <div className="sp-empty">
                  <div className="sp-empty-title">No details available</div>
                  <div className="sp-empty-sub">Failed to load student data.</div>
                </div>
              ) : (
                <>
                  {/* ═══ OVERVIEW ═══ */}
                  {activeProfileTab === "overview" && (
                    <>
                      <div className="sp-summary-grid">
                        <div className="sp-summary-card">
                          <div className="sp-summary-icon" style={{ background: "var(--sp-accent-dim)", color: "rgb(180,83,9)" }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 13a4 4 0 018 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="6" cy="6" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M13 9v4M11 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                          </div>
                          <div>
                            <div className="sp-summary-label">Contact</div>
                            <div className="sp-summary-val">{studentDetails.student?.phone || "N/A"}</div>
                            <div className="sp-summary-sub">{studentDetails.student?.email || "—"}</div>
                          </div>
                        </div>
                        <div className="sp-summary-card">
                          <div className="sp-summary-icon" style={{ background: "rgba(59,130,246,0.08)", color: "rgb(59,130,246)" }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 14V7l6-5 6 5v7H2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><rect x="5.5" y="9" width="2" height="5" rx=".5" fill="currentColor" opacity=".4"/><rect x="8.5" y="9" width="2" height="5" rx=".5" fill="currentColor" opacity=".4"/></svg>
                          </div>
                          <div>
                            <div className="sp-summary-label">Academic</div>
                            <div className="sp-summary-val">{studentDetails.student?.level?.name || "N/A"}</div>
                            <div className="sp-summary-sub">{studentDetails.student?.section?.name || "—"} · {studentDetails.student?.department?.name || "—"}</div>
                          </div>
                        </div>
                        <div className="sp-summary-card">
                          <div className="sp-summary-icon" style={{ background: "rgba(211,0,176,0.08)", color: "rgb(211,0,176)" }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M1 14c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                          </div>
                          <div>
                            <div className="sp-summary-label">Bio</div>
                            <div className="sp-summary-val">{studentDetails.student?.sex || "N/A"}</div>
                            <div className="sp-summary-sub">{studentDetails.student?.nationality || "—"} · {studentDetails.student?.religion || "—"}</div>
                          </div>
                        </div>
                      </div>

                      {isEditMode ? (
                        <div className="sp-content-card">
                          <div className="sp-content-card-head">
                            <div>
                              <div className="sp-content-card-title">Edit Student</div>
                              <div className="sp-content-card-sub">Update personal, academic and contact details.</div>
                            </div>
                          </div>
                          <div style={{ padding: "20px" }}>
                            <div className="sp-form-grid">
                              <div className="sp-form-section">Personal details</div>
                              {([
                                { id: "firstname",   label: "First Name",    type: "text", required: true },
                                { id: "third_name",  label: "Middle Name",   type: "text" },
                                { id: "surname",     label: "Surname",       type: "text", required: true },
                                { id: "dob",         label: "Date of Birth", type: "date" },
                                { id: "nationality", label: "Nationality",   type: "text" },
                                { id: "religion",    label: "Religion",      type: "text" },
                              ] as const).map(f => (
                                <div key={f.id}>
                                  <label className="sp-label">{f.label}{("required" in f && f.required) ? " *" : ""}</label>
                                  <input className="sp-input" type={f.type}
                                    value={editedStudent[f.id] || ""}
                                    onChange={e => setEditedStudent({ ...editedStudent, [f.id]: e.target.value })} />
                                </div>
                              ))}
                              <div>
                                <label className="sp-label">Gender *</label>
                                <select className="sp-select" value={editedStudent.sex || ""}
                                  onChange={e => setEditedStudent({ ...editedStudent, sex: e.target.value })}>
                                  <option value="">Select</option>
                                  <option>Male</option><option>Female</option>
                                </select>
                              </div>
                              <div>
                                <label className="sp-label">Blood Group</label>
                                <select className="sp-select" value={editedStudent.blood_group || ""}
                                  onChange={e => setEditedStudent({ ...editedStudent, blood_group: e.target.value })}>
                                  <option value="">Select</option>
                                  {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(g => <option key={g}>{g}</option>)}
                                </select>
                              </div>

                              <div className="sp-form-section">Academic</div>
                              <div>
                                <label className="sp-label">Class *</label>
                                <select className="sp-select" value={editedStudent.level_id || ""}
                                  onChange={e => setEditedStudent({ ...editedStudent, level_id: e.target.value })}>
                                  <option value="">Select class</option>
                                  {studentDetails.levels?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="sp-label">Department *</label>
                                <select className="sp-select" value={editedStudent.department_id || ""}
                                  onChange={e => setEditedStudent({ ...editedStudent, department_id: e.target.value })}>
                                  <option value="">Select department</option>
                                  {studentDetails.departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="sp-label">Section</label>
                                <select className="sp-select" value={editedStudent.section_id || ""}
                                  onChange={e => setEditedStudent({ ...editedStudent, section_id: e.target.value ? parseInt(e.target.value) : "" })}>
                                  <option value="">Select section</option>
                                  {studentDetails.sections?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                              </div>

                              <div className="sp-form-section">Contact</div>
                              <div>
                                <label className="sp-label">Email</label>
                                <input className="sp-input" type="email" value={editedStudent.email || ""}
                                  onChange={e => setEditedStudent({ ...editedStudent, email: e.target.value })} />
                              </div>
                              <div>
                                <label className="sp-label">Phone</label>
                                <input className="sp-input" type="tel" value={editedStudent.phone || ""}
                                  onChange={e => setEditedStudent({ ...editedStudent, phone: e.target.value })} />
                              </div>
                              <div className="sp-form-full">
                                <label className="sp-label">Address</label>
                                <input className="sp-input" value={editedStudent.address || ""}
                                  onChange={e => setEditedStudent({ ...editedStudent, address: e.target.value })} />
                              </div>

                              <div className="sp-form-section">Security</div>
                              <div className="sp-form-full">
                                <label className="sp-label">New password <span style={{ color: "#b5a090", fontWeight: 300 }}>(leave blank to keep current)</span></label>
                                <input className="sp-input" type="text" placeholder="Enter new password"
                                  value={editedStudent.password || ""}
                                  onChange={e => setEditedStudent({ ...editedStudent, password: e.target.value })} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="sp-content-card">
                          <div className="sp-content-card-head">
                            <div>
                              <div className="sp-content-card-title">Student Details</div>
                              <div className="sp-content-card-sub">Personal, academic and contact information.</div>
                            </div>
                            <span className="sp-count-badge">ID #{studentDetails.student?.id}</span>
                          </div>
                          <div style={{ padding: "4px 20px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
                            <div>
                              {[["Gender", studentDetails.student?.sex], ["Date of Birth", studentDetails.student?.dob], ["Blood Group", studentDetails.student?.blood_group], ["Religion", studentDetails.student?.religion], ["Nationality", studentDetails.student?.nationality]].map(([l, v]) => (
                                <InfoRow key={l as string} label={l as string} value={v as string} />
                              ))}
                            </div>
                            <div>
                              {[["Email", studentDetails.student?.email], ["Phone", studentDetails.student?.phone], ["Address", studentDetails.student?.address], ["Section", studentDetails.student?.section?.name], ["Class", studentDetails.student?.level?.name]].map(([l, v]) => (
                                <InfoRow key={l as string} label={l as string} value={v as string} />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* ═══ SESSIONS ═══ */}
                  {activeProfileTab === "sessions" && (
                    <div className="sp-content-card">
                      <div className="sp-content-card-head">
                        <div>
                          <div className="sp-content-card-title">Academic Sessions</div>
                          <div className="sp-content-card-sub">History of all sessions assigned to this student.</div>
                        </div>
                        <span className="sp-count-badge">{studentDetails.sessions?.length ?? 0} sessions</span>
                      </div>
                      {!studentDetails.sessions?.length ? (
                        <div className="sp-empty"><div className="sp-empty-title">No sessions</div><div className="sp-empty-sub">No session history for this student.</div></div>
                      ) : (
                        <div className="overflow-auto">
                          <table className="sp-session-table">
                            <thead><tr><th>Session</th><th>Start</th><th>End</th><th>Status</th></tr></thead>
                            <tbody>
                              {studentDetails.sessions.map((sess: any) => (
                                <tr key={sess.id}>
                                  <td>
                                    <span style={{ fontWeight: 500, color: "var(--sp-dark)" }}>{sess.name}</span>
                                    {sess.is_current === 1 && <span className="sp-current-badge">Current</span>}
                                  </td>
                                  <td>{sess.start_date || "—"}</td>
                                  <td>{sess.end_date || "—"}</td>
                                  <td>
                                    <span className={`db-badge ${sess.status === "Active" ? "db-badge--green" : "db-badge--gray"}`}>
                                      {sess.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ═══ PERFORMANCE ═══ */}
                  {activeProfileTab === "performance" && (
                    <div className="sp-content-card">
                      <div className="sp-content-card-head">
                        <div>
                          <div className="sp-content-card-title">Academic Performance</div>
                          <div className="sp-content-card-sub">Average score per term (0–100).</div>
                        </div>
                        <span className="sp-count-badge">{performanceData.length} data points</span>
                      </div>
                      {performanceData.length > 0
                        ? <div className="sp-chart-area"><canvas ref={chartRef} /></div>
                        : <div className="sp-empty"><div className="sp-empty-title">No performance data</div><div className="sp-empty-sub">Results haven't been uploaded yet for this student.</div></div>
                      }
                    </div>
                  )}

                  {/* ═══ RATINGS ═══ */}
                  {activeProfileTab === "ratings" && (
                    <>
                      {psychomotorDomains.length === 0 && affectiveDomains.length === 0 && (
                        <div className="sp-content-card">
                          <div className="sp-empty"><div className="sp-empty-title">No rating domains</div><div className="sp-empty-sub">No affective or psychomotor domains configured for this school.</div></div>
                        </div>
                      )}
                      {psychomotorDomains.length > 0 && (
                        <div className="sp-content-card sp-rating-section">
                          <div className="sp-rating-head">
                            <div className="sp-rating-head-icon" style={{ background: "rgba(34,197,94,0.10)", color: "rgb(21,128,61)" }}>
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.6 3.3H12L9.3 6.5l1 3L7 7.9 3.7 9.5l1-3L2 4.3h3.4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                            </div>
                            <div>
                              <div className="sp-rating-head-title">Psychomotor Domain</div>
                              <div className="sp-rating-head-sub">Rate 1 (low) to 4 (excellent)</div>
                            </div>
                            <span className="sp-count-badge" style={{ marginLeft: "auto" }}>{psychomotorDomains.length} skills</span>
                          </div>
                          <div className="sp-rating-body">
                            {psychomotorDomains.map(d => (
                              <RatingRow key={d.id} label={d.title} id={d.id} value={psychomotorRatings[d.id]}
                                onChange={v => setPsychomotorRatings(p => ({ ...p, [d.id]: v }))} prefix="psy" />
                            ))}
                          </div>
                        </div>
                      )}
                      {affectiveDomains.length > 0 && (
                        <div className="sp-content-card sp-rating-section">
                          <div className="sp-rating-head">
                            <div className="sp-rating-head-icon" style={{ background: "rgba(59,130,246,0.09)", color: "rgb(59,130,246)" }}>
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 12s-5-3.5-5-7a3 3 0 015-2.24A3 3 0 0112 5c0 3.5-5 7-5 7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                            </div>
                            <div>
                              <div className="sp-rating-head-title">Affective Domain</div>
                              <div className="sp-rating-head-sub">Rate 1 (low) to 4 (excellent)</div>
                            </div>
                            <span className="sp-count-badge" style={{ marginLeft: "auto" }}>{affectiveDomains.length} traits</span>
                          </div>
                          <div className="sp-rating-body">
                            {affectiveDomains.map(d => (
                              <RatingRow key={d.id} label={d.title} id={d.id} value={affectiveRatings[d.id]}
                                onChange={v => setAffectiveRatings(p => ({ ...p, [d.id]: v }))} prefix="aff" />
                            ))}
                          </div>
                        </div>
                      )}
                      {(affectiveDomains.length > 0 || psychomotorDomains.length > 0) && (
                        <div className="sp-save-ratings-row">
                          <button className="sp-save-ratings-btn" onClick={saveRatings} disabled={savingRatings}>
                            {savingRatings
                              ? <><span className="sp-spinner sp-spinner--dark" style={{ borderTopColor: "var(--sp-dark)" }} />Saving…</>
                              : <><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5 6.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>Save Ratings</>
                            }
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* ═══ SECURITY ═══ */}
                  {activeProfileTab === "security" && (
                    <div className="sp-content-card">
                      <div className="sp-content-card-head">
                        <div>
                          <div className="sp-content-card-title">Login Credentials</div>
                          <div className="sp-content-card-sub">Admin-only utilities to assist a student's login.</div>
                        </div>
                      </div>
                      <div className="d-flex flex-column gap-3" style={{ padding: "20px" }}>
                        <div className="sp-security-warn">
                          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                            <path d="M8 2L14 14H2L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                            <path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                          </svg>
                          Handle decrypted credentials securely. Do not share or screenshot in unsecured environments.
                        </div>
                        <div>
                          <span className="sp-credential-label">Username</span>
                          <div className="sp-credential-box">
                            <span className="sp-credential-val">{studentDetails.student?.username || "N/A"}</span>
                          </div>
                        </div>
                        <div>
                          <span className="sp-credential-label">Default Password</span>
                          <div className="sp-pw-row">
                            <input className="sp-pw-input"
                              type={passwordVisible ? "text" : "password"}
                              value={passwordVisible ? decryptedPassword : "••••••••••"} readOnly />
                            <button className="sp-icon-btn" onClick={togglePassword} disabled={loadingPassword}
                              title={passwordVisible ? "Hide" : "Decrypt & Show"}>
                              {loadingPassword ? <span className="sp-spinner sp-spinner--dark" /> : passwordVisible
                                ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M3 3l10 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                                : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/></svg>
                              }
                            </button>
                            <button className="sp-icon-btn" onClick={copyPassword} disabled={!passwordVisible} title="Copy">
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M3 11V3a1 1 0 011-1h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                            </button>
                          </div>
                          {passwordVisible && (
                            <p className="d-flex align-items-center gap-1" style={{ fontSize: 11.5, color: "var(--sp-success)", marginTop: 6 }}>
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 6l3 3 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              Decrypted successfully
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Modal footer ── */}
            <div className="sp-footer">
              <span className="sp-footer-hint">Use tabs to navigate overview, performance, and ratings.</span>
              <button className="sp-footer-close" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}