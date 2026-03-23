import { useEffect, useMemo, useState } from "react";
import { authApi } from "../../../utils/axios";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";

/* ================= INTERFACES ================= */
type AttendanceStatus = "present" | "absent" | "late" | "excused";

interface Attendance {
  status: AttendanceStatus;
  remarks?: string;
}

interface Student {
  id: number;
  firstname: string;
  surname: string;
  adm_no: string;
  photo?: string | null;
  attendances?: Attendance[];
}

interface StudentClass {
  id: number;
  name: string;
}

type Role = "admin" | "teacher" | "other";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function AttendancePage() {
  const BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:8000" ||
    "https://gradequest.com.ng";

  const { showSuccess, showError } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // meta
  const [role, setRole] = useState<Role>("other");

  // filters
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [classId, setClassId] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // data
  const [students, setStudents] = useState<Student[]>([]);

  // loading
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  const isTeacher = role === "teacher";
  const disableClassSelect = isTeacher && classes.length <= 1;

  const getStudentPhoto = (photo?: string | null) =>
    photo ? `${BASE_URL}/uploads/users/${photo}` : "/media/profile.jpg";

  const selectedClassName = useMemo(() => {
    return classes.find((c) => String(c.id) === String(classId))?.name || "Select class";
  }, [classes, classId]);

  /* ================= STATS ================= */
  const totals = useMemo(() => {
    const total = students.length;

    let present = 0,
      absent = 0,
      late = 0,
      excused = 0;

    students.forEach((s) => {
      const st = s.attendances?.[0]?.status;
      if (st === "present") present++;
      else if (st === "absent") absent++;
      else if (st === "late") late++;
      else if (st === "excused") excused++;
    });

    const unmarked = students.filter((s) => !s.attendances?.[0]?.status).length;
    return { total, present, absent, late, excused, unmarked };
  }, [students]);

  const completionPct = useMemo(() => {
    if (!totals.total) return 0;
    return Math.round(((totals.total - totals.unmarked) / totals.total) * 100);
  }, [totals.total, totals.unmarked]);

  /* ================= LOAD ALLOWED CLASSES ================= */
  const loadAllowedClasses = async () => {
    setLoadingPage(true);
    try {
      const res = await authApi.get("/attendance/classes");
      const payload = res.data;

      const cls: StudentClass[] = payload.classes || payload || [];
      setClasses(cls);

      const r = String(payload.role || "").toLowerCase();
      setRole(r === "admin" ? "admin" : r === "teacher" ? "teacher" : "other");

      if (payload.default_class_id) {
        setClassId(String(payload.default_class_id));
      } else if (cls.length === 1) {
        setClassId(String(cls[0].id));
      }
    } catch (err) {
      console.error(err);
      showError("Failed to load classes");
    } finally {
      setLoadingPage(false);
    }
  };

  /* ================= LOAD STUDENTS ================= */
  const loadStudents = async () => {
    if (!classId) {
      setStudents([]);
      return;
    }

    setLoadingStudents(true);
    try {
      const res = await authApi.get("/attendance", {
        params: { class_id: classId, date },
      });

      const data: Student[] = (res.data || []).map((stu: any) => ({
        id: stu.id,
        firstname: stu.firstname,
        surname: stu.surname,
        adm_no: stu.reg_no || `STD-${stu.id}`,
        photo: stu.photo,
        attendances: stu.attendances,
      }));

      setStudents(data);
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message ?? "Failed to load students");
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  /* ================= SAVE ATTENDANCE ================= */
  const saveAttendance = async () => {
    if (!classId || students.length === 0) return;

    setSaving(true);
    try {
      await authApi.post("/attendance", {
        class_id: classId,
        date,
        students: students.map((stu) => ({
          student_id: stu.id,
          status: stu.attendances?.[0]?.status || "absent",
          remarks: stu.attendances?.[0]?.remarks || null,
        })),
      });

      showSuccess("Saved attendance successfully");
      loadStudents();
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message ?? "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  /* ================= HANDLERS ================= */
  const handleStatusChange = (index: number, status: AttendanceStatus) => {
    const updated = [...students];
    updated[index].attendances = [
      { status, remarks: updated[index].attendances?.[0]?.remarks || "" },
    ];
    setStudents(updated);
  };

  const handleRemarkChange = (index: number, remark: string) => {
    const updated = [...students];
    if (!updated[index].attendances) updated[index].attendances = [{ status: "absent" }];
    updated[index].attendances![0].remarks = remark;
    setStudents(updated);
  };

  /* ================= EFFECTS ================= */
  useEffect(() => {
    loadAllowedClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, date]);

  /* ================= UI HELPERS ================= */
  const statusPill = (s?: AttendanceStatus) => {
    if (!s) return { bg: "rgba(148,163,184,0.18)", color: "#64748b", label: "Unmarked" };
    if (s === "present") return { bg: "rgba(34,197,94,0.14)", color: "#16a34a", label: "Present" };
    if (s === "absent") return { bg: "rgba(244,63,94,0.12)", color: "#e11d48", label: "Absent" };
    if (s === "late") return { bg: "rgba(14,165,233,0.14)", color: "#0284c7", label: "Late" };
    return { bg: "rgba(245,158,11,0.14)", color: "#b45309", label: "Excused" };
  };

  const btnTone = (active: boolean, tone: "g" | "r" | "b" | "o") => {
    if (!active) return "db-mini-btn";
    if (tone === "g") return "db-mini-btn db-mini-btn--g";
    if (tone === "r") return "db-mini-btn db-mini-btn--r";
    if (tone === "b") return "db-mini-btn db-mini-btn--b";
    return "db-mini-btn db-mini-btn--o";
  };

  return (
    <>
      <style>{`
/* ========= Attendance page uses AdminDashboard template styles ========= */
.db-main{
  background: var(--bs-body-bg, #f5f1eb);
  min-height: 100vh;
  font-family: "DM Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  padding: 28px 28px 0;
}
.db-hero{
  background:#0f172a;
  border-radius:16px;
  padding:32px 36px;
  position:relative;
  overflow:hidden;
  margin-bottom:22px;
  border:1px solid rgba(255,255,255,0.06);
}
.db-hero::before{
  content:"";
  position:absolute; inset:0;
  background-image: radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px);
  background-size:24px 24px;
  pointer-events:none;
}
.db-hero-glow{
  position:absolute; top:-60px; right:-60px;
  width:320px; height:320px; border-radius:50%;
  background: radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 65%);
  pointer-events:none;
}
.db-hero-glow2{
  position:absolute; bottom:-40px; left:25%;
  width:220px; height:220px; border-radius:50%;
  background: radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%);
  pointer-events:none;
}
.db-hero-inner{ position:relative; z-index:1; display:flex; align-items:center; justify-content:space-between; gap:28px; flex-wrap:wrap; }
.db-session-badge{
  display:inline-flex; align-items:center; gap:7px;
  font-size:11px; font-weight:500; letter-spacing:0.12em; text-transform:uppercase;
  color:#e8c97a; background: rgba(201,168,76,0.10);
  border:1px solid rgba(201,168,76,0.22);
  border-radius:999px; padding:4px 12px; margin-bottom:12px;
}
.db-session-dot{ width:6px; height:6px; border-radius:50%; background:#22c55e; animation:dbPulse 2s ease infinite; }
@keyframes dbPulse{ 0%,100%{opacity:1; transform:scale(1);} 50%{opacity:.4; transform:scale(1.5);} }

.db-greeting{
  font-family:"Lora", Georgia, serif;
  font-size: clamp(22px, 2.5vw, 32px);
  font-weight:700; color:#fff; line-height:1.1; margin-bottom:8px;
}
.db-greeting em{ font-style:italic; color:#e8c97a; }
.db-hero-sub{ font-size:13.5px; font-weight:300; color:#94a3b8; line-height:1.7; max-width:520px; margin-bottom:18px; }

.db-hero-btns{ display:flex; gap:10px; flex-wrap:wrap; }
.db-btn-gold{
  display:inline-flex; align-items:center; gap:7px;
  padding:10px 18px;
  font-size:13px; font-weight:600;
  color:#0f172a; background:#c9a84c; border:none;
  border-radius:10px; cursor:pointer;
  transition: background .2s, transform .2s;
  text-decoration:none; white-space:nowrap;
}
.db-btn-gold:hover{ background:#e8c97a; transform: translateY(-1px); }
.db-btn-outline{
  display:inline-flex; align-items:center; gap:7px;
  padding:10px 18px;
  font-size:13px; font-weight:500;
  color: rgba(255,255,255,0.78);
  background:transparent;
  border:1px solid rgba(255,255,255,0.16);
  border-radius:10px; cursor:pointer;
  transition: background .2s, border-color .2s, color .2s;
}
.db-btn-outline:hover{ background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.28); color:#fff; }

.db-hero-stat-card{
  background: rgba(255,255,255,0.05);
  border:1px solid rgba(255,255,255,0.09);
  backdrop-filter: blur(8px);
  border-radius:12px;
  padding:18px 20px;
  min-width: 220px;
}
.db-hero-stat-item{ display:flex; align-items:center; justify-content:space-between; gap:14px; }
.db-hero-stat-label{ font-size:12px; font-weight:300; color:#94a3b8; }
.db-hero-stat-val{ font-family:"Lora", serif; font-size:18px; font-weight:700; color:#fff; }
.db-hero-stat-sep{ height:1px; background: rgba(255,255,255,0.06); margin:10px 0; }

.db-stats{
  display:grid;
  grid-template-columns: repeat(5, 1fr);
  gap:16px;
  margin-bottom: 18px;
}
@media (max-width: 1199.98px){ .db-stats{ grid-template-columns: repeat(2, 1fr);} }
@media (max-width: 575.98px){ .db-stats{ grid-template-columns: 1fr;} }

.db-stat{
  background:#fff;
  border:1px solid #ede8e0;
  border-radius:14px;
  padding:22px 20px;
  position:relative;
  overflow:hidden;
  transition: box-shadow .25s, transform .25s;
}
.db-stat:hover{ box-shadow: 0 8px 28px rgba(0,0,0,0.08); transform: translateY(-3px); }
.db-stat::before{
  content:""; position:absolute; top:0; left:0; right:0; height:3px;
  background: var(--sc, #b45309);
  transform: scaleX(0); transform-origin:left;
  transition: transform .3s ease;
}
.db-stat:hover::before{ transform: scaleX(1); }
.db-stat-head{ display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:14px; }
.db-stat-icon{
  width:42px; height:42px; border-radius:10px;
  background: var(--si, #fef3c7);
  color: var(--sc, #b45309);
  display:flex; align-items:center; justify-content:center;
}
.db-stat-label{ font-size:12px; font-weight:400; color:#9a8a7a; margin-bottom:5px; letter-spacing:.03em; }
.db-stat-val{ font-family:"Lora", Georgia, serif; font-size:28px; font-weight:700; color:#1a1a2e; line-height:1; }
.db-stat-footer{
  display:flex; align-items:center; gap:6px;
  margin-top:12px; padding-top:12px;
  border-top:1px solid rgba(0,0,0,0.06);
  font-size:12px; color:#9a8a7a;
}
.db-stat-trend{ color:#22c55e; font-weight:600; }

.db-grid{
  display:grid;
  grid-template-columns: 1fr;
  gap:20px;
  margin-bottom: 22px;
}

.db-panel{
  background:#fff;
  border:1px solid #ede8e0;
  border-radius:14px;
  overflow:hidden;
}
.db-panel-head{
  display:flex; align-items:center; justify-content:space-between;
  padding:18px 20px;
  border-bottom:1px solid rgba(0,0,0,0.06);
  gap:12px;
}
.db-panel-title-group{ display:flex; align-items:center; gap:12px; }
.db-panel-icon{
  width:36px; height:36px; border-radius:9px;
  display:flex; align-items:center; justify-content:center;
  background: var(--pi, #fef3c7);
  color: var(--pc, #b45309);
  flex-shrink:0;
}
.db-panel-title{
  font-family:"Lora", serif;
  font-size:16px; font-weight:700;
  color:#1a1a2e; margin:0;
}
.db-panel-sub{ font-size:11.5px; font-weight:300; color:#9a8a7a; margin:0; }

.db-refresh-btn{
  display:inline-flex; align-items:center; gap:6px;
  padding:7px 14px;
  font-size:12px; font-weight:500;
  color:#7a6a5a;
  background:#f5f1eb;
  border:1px solid #e5ddd3;
  border-radius:7px;
  cursor:pointer;
  transition: background .2s;
}
.db-refresh-btn:hover{ background:#ede8e0; }
.db-refresh-btn:disabled{ opacity:.55; cursor:not-allowed; }

.db-toolbar{
  padding: 14px 20px;
  display:flex; align-items:center; justify-content:space-between;
  flex-wrap:wrap; gap:12px;
}
.db-field{
  display:flex; align-items:center; gap:10px; flex-wrap:wrap;
}
.db-select, .db-input{
  border:1px solid #e5ddd3;
  background:#fff;
  border-radius:10px;
  padding:10px 12px;
  font-size:13px;
  color:#1a1a2e;
  outline:none;
  min-height: 40px;
}
.db-select{ min-width: 220px; }
.db-input{ width: 170px; }
.db-select:disabled, .db-input:disabled{ opacity:.65; cursor:not-allowed; background:#faf8f5; }

.db-mini-btn{
  display:inline-flex; align-items:center; justify-content:center;
  gap:6px;
  border-radius:10px;
  padding:9px 12px;
  font-size:12.5px;
  font-weight:600;
  border:1px solid #e5ddd3;
  background:#f5f1eb;
  color:#7a6a5a;
  cursor:pointer;
  transition: background .2s, transform .2s;
  min-height: 40px;
}
.db-mini-btn:hover{ background:#ede8e0; transform: translateY(-1px); }
.db-mini-btn:disabled{ opacity:.55; cursor:not-allowed; transform:none; }
.db-mini-btn--g{ background: rgba(34,197,94,0.12); border-color: rgba(34,197,94,0.25); color:#15803d; }
.db-mini-btn--r{ background: rgba(244,63,94,0.10); border-color: rgba(244,63,94,0.22); color:#be123c; }
.db-mini-btn--b{ background: rgba(14,165,233,0.10); border-color: rgba(14,165,233,0.22); color:#0369a1; }
.db-mini-btn--o{ background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.22); color:#b45309; }

.db-table{
  width:100%;
  border-collapse:collapse;
}
.db-table th{
  padding:10px 16px;
  font-size:11px;
  font-weight:600;
  letter-spacing:0.1em;
  text-transform:uppercase;
  color:#9a8a7a;
  background:#faf8f5;
  border-bottom:1px solid rgba(0,0,0,0.06);
  text-align:left;
  white-space:nowrap;
}
.db-table td{
  padding:13px 16px;
  font-size:13.5px;
  color:#4a4a5a;
  border-bottom:1px solid rgba(0,0,0,0.06);
  vertical-align:middle;
}
.db-table tbody tr{ transition: background .15s; }
.db-table tbody tr:hover{ background:#faf8f5; }

.db-avatar{
  width:42px; height:42px;
  border-radius:999px;
  border:1px solid rgba(0,0,0,0.08);
  object-fit:cover;
}
.db-name{ font-weight:600; color:#1a1a2e; }
.db-muted{ color:#9a8a7a; font-size:12.5px; }

.db-score-pill{
  display:inline-flex;
  align-items:center;
  font-size:12.5px;
  font-weight:600;
  padding:4px 10px;
  border-radius:999px;
}

.db-remark{
  width: 100%;
  border:1px solid #e5ddd3;
  background:#fff;
  border-radius:10px;
  padding:9px 10px;
  font-size:13px;
  outline:none;
}
.db-remark:focus{ border-color: rgba(201,168,76,0.7); box-shadow: 0 0 0 3px rgba(201,168,76,0.15); }

.db-table-empty{
  padding:46px 16px;
  text-align:center;
  color:#b5a090;
  font-size:13.5px;
}

.db-skeleton{
  height: 14px;
  border-radius: 7px;
  background: linear-gradient(90deg, #f0ebe3 25%, #e8e0d5 50%, #f0ebe3 75%);
  background-size: 200% 100%;
  animation: dbSkeleton 1.4s ease infinite;
}
@keyframes dbSkeleton { from { background-position: 200% 0; } to { background-position: -200% 0; } }

@keyframes dbSpin { to { transform: rotate(360deg); } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Attendance" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {(loadingPage || saving) && (
              <Loader message={saving ? "Saving attendance..." : "Loading attendance page..."} />
            )}

            {/* ===== HERO ===== */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Attendance · <span style={{ color: "#94a3b8" }}>{selectedClassName}</span> ·{" "}
                    <span style={{ color: "#94a3b8" }}>{date}</span>
                  </div>

                  <h1 className="db-greeting">
                    {getGreeting()}, <em>{isTeacher ? "Teacher" : "Admin"}.</em>
                  </h1>

                  <p className="db-hero-sub">
                    Mark daily attendance quickly. Unmarked students will default to <b style={{ color: "#e8c97a" }}>Absent</b>{" "}
                    when you save.
                  </p>

                  <div className="db-hero-btns">
                    <button
                      className="db-btn-gold"
                      onClick={saveAttendance}
                      disabled={saving || !classId || students.length === 0}
                      title={!classId ? "Select a class" : students.length === 0 ? "No students loaded" : "Save attendance"}
                    >
                      {saving ? (
                        <>
                          <span
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: "50%",
                              border: "2px solid rgba(15,23,42,0.35)",
                              borderTopColor: "#0f172a",
                              display: "inline-block",
                              animation: "dbSpin 0.8s linear infinite",
                            }}
                          />
                          Saving…
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M13.5 4.5l-6.5 7L2.5 7"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          Save Attendance
                        </>
                      )}
                    </button>

                    <button
                      className="db-btn-outline"
                      onClick={loadStudents}
                      disabled={loadingStudents || !classId}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                        style={{ animation: loadingStudents ? "dbSpin 0.8s linear infinite" : "none" }}
                      >
                        <path
                          d="M14 8A6 6 0 112 8"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M14 4v4h-4"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {loadingStudents ? "Loading…" : "Refresh List"}
                    </button>

                    <button
                      className="db-btn-outline"
                      onClick={() => setDate(new Date().toISOString().slice(0, 10))}
                      disabled={loadingStudents || loadingPage}
                      title="Jump to today"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M5 2v2M11 2v2M2.5 6.2h11"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                        <rect
                          x="2.5"
                          y="3.5"
                          width="11"
                          height="10"
                          rx="2"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        />
                      </svg>
                      Today
                    </button>
                  </div>
                </div>

                {/* Hero mini stat */}
                <div className="db-hero-stat-card d-none d-md-block">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c9a84c" }}>
                      Quick glance
                    </span>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M2 10V6M5 10V4M8 10V7M11 10V3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div className="db-hero-stat-item">
                    <span className="db-hero-stat-label">Total students</span>
                    <span className="db-hero-stat-val">{totals.total}</span>
                  </div>
                  <div className="db-hero-stat-sep" />
                  <div className="db-hero-stat-item">
                    <span className="db-hero-stat-label">Completion</span>
                    <span className="db-hero-stat-val">{completionPct}%</span>
                  </div>
                  <div className="db-hero-stat-sep" />
                  <div className="db-hero-stat-item">
                    <span className="db-hero-stat-label">Unmarked</span>
                    <span className="db-hero-stat-val">{totals.unmarked}</span>
                  </div>

                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      Role: <b style={{ color: "#fff" }}>{isTeacher ? "Teacher" : "Admin"}</b>
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      Class: <b style={{ color: "#fff" }}>{selectedClassName}</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== KPI / Stat cards (dashboard style) ===== */}
            <div className="db-stats">
              {[
                { title: "Students Loaded", value: totals.total, color: "#1e40af", bg: "#dbeafe", hint: "class list" },
                { title: "Present", value: totals.present, color: "#065f46", bg: "#d1fae5", hint: "checked in" },
                { title: "Late", value: totals.late, color: "#0284c7", bg: "rgba(14,165,233,0.12)", hint: "arrived late" },
                { title: "Absent + Excused", value: totals.absent + totals.excused, color: "#be123c", bg: "rgba(244,63,94,0.10)", hint: "not in class" },
                { title: "Unmarked", value: totals.unmarked, color: "#b45309", bg: "#fef3c7", hint: "needs action" },
              ].map((c, i) => {
                const icons = [
                  <svg key="i1" width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M2 18c0-3.314 2.686-6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="15" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4"/></svg>,
                  <svg key="i2" width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M16 6l-7 9-3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.2" opacity="0.35"/></svg>,
                  <svg key="i3" width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 6v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.2"/></svg>,
                  <svg key="i4" width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.2" opacity="0.35"/></svg>,
                  <svg key="i5" width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 6v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M10 14v.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.2"/></svg>,
                ];

                return (
                  <div
                    className="db-stat"
                    key={c.title}
                    style={{ "--sc": c.color, "--si": c.bg } as React.CSSProperties}
                  >
                    <div className="db-stat-head">
                      <div className="db-stat-icon">{icons[i]}</div>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: "#c8bfb5" }}>
                        <circle cx="4" cy="8" r="1.2" fill="currentColor" />
                        <circle cx="8" cy="8" r="1.2" fill="currentColor" />
                        <circle cx="12" cy="8" r="1.2" fill="currentColor" />
                      </svg>
                    </div>
                    <p className="db-stat-label">{c.title}</p>
                    <div className="db-stat-val">{c.value}</div>
                    <div className="db-stat-footer">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 9l3-4 2 2 3-5" stroke="#22c55e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="db-stat-trend">{completionPct}%</span>
                      <span>{c.hint}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ===== Main panel: Filters + Table ===== */}
            <div className="db-panel">
              <div className="db-panel-head">
                <div className="db-panel-title-group">
                  <div className="db-panel-icon" style={{ "--pi": "#fef3c7", "--pc": "#b45309" } as React.CSSProperties}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 3h8M5 7h6M6 11h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="db-panel-title">Attendance Register</p>
                    <p className="db-panel-sub">
                      {isTeacher ? "Teacher access · assigned class" : "Admin access · all classes"} ·{" "}
                      <span style={{ fontWeight: 500 }}>{selectedClassName}</span>
                    </p>
                  </div>
                </div>

                <button className="db-refresh-btn" onClick={loadStudents} disabled={loadingStudents || !classId}>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 14 14"
                    fill="none"
                    style={{ animation: loadingStudents ? "dbSpin 0.8s linear infinite" : "none" }}
                  >
                    <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {loadingStudents ? "Loading…" : "Refresh"}
                </button>
              </div>

              {/* Toolbar */}
              <div className="db-toolbar">
                <div>
                  <div style={{ fontWeight: 700, color: "#1a1a2e" }}>Filters</div>
                  <div style={{ fontSize: 12.5, color: "#9a8a7a" }}>
                    Select class & date. {isTeacher ? "Your class may be locked." : "Admins can switch classes."}
                  </div>
                </div>

                <div className="db-field">
                  <select
                    className="db-select"
                    value={classId}
                    disabled={loadingStudents || loadingPage || disableClassSelect}
                    onChange={(e) => setClassId(e.target.value)}
                    title={disableClassSelect ? "Teacher class is fixed" : "Select class"}
                  >
                    <option value="">{loadingPage ? "Loading classes…" : "Select Class"}</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="date"
                    className="db-input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={loadingStudents || loadingPage}
                  />

                  <button className="db-mini-btn" onClick={loadStudents} disabled={loadingStudents || !classId}>
                    {loadingStudents ? (
                      <>
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            border: "2px solid rgba(122,106,90,0.35)",
                            borderTopColor: "#7a6a5a",
                            display: "inline-block",
                            animation: "dbSpin 0.8s linear infinite",
                          }}
                        />
                        Load
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M13.5 8A5.5 5.5 0 113 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M13.5 4.5V8H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Load
                      </>
                    )}
                  </button>

                  <button className="db-mini-btn db-mini-btn--g" onClick={saveAttendance} disabled={saving || !classId || students.length === 0}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M13.5 4.5l-6.5 7L2.5 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Save
                  </button>
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                <table className="db-table">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>#</th>
                      <th style={{ width: 160 }}>Adm No</th>
                      <th style={{ width: 360 }}>Student</th>
                      <th style={{ width: 160 }}>Status</th>
                      <th style={{ width: 420 }}>Mark</th>
                      <th style={{ width: 320 }}>Remark</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loadingStudents ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i}>
                          <td><div className="db-skeleton" style={{ width: 36 }} /></td>
                          <td><div className="db-skeleton" style={{ width: 120 }} /></td>
                          <td><div className="db-skeleton" style={{ width: 220 }} /></td>
                          <td><div className="db-skeleton" style={{ width: 110 }} /></td>
                          <td><div className="db-skeleton" style={{ width: 280 }} /></td>
                          <td><div className="db-skeleton" style={{ width: 220 }} /></td>
                        </tr>
                      ))
                    ) : !classId ? (
                      <tr>
                        <td colSpan={6} className="db-table-empty">
                          <div style={{ fontWeight: 700, color: "#1a1a2e" }}>Select a class</div>
                          <div style={{ marginTop: 6 }}>Choose a class to load students for attendance.</div>
                        </td>
                      </tr>
                    ) : students.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="db-table-empty">
                          <div style={{ fontWeight: 700, color: "#1a1a2e" }}>No students found</div>
                          <div style={{ marginTop: 6 }}>This class has no students or you don’t have permission.</div>
                        </td>
                      </tr>
                    ) : (
                      students.map((stu, i) => {
                        const st = stu.attendances?.[0]?.status;
                        const pill = statusPill(st);

                        return (
                          <tr key={stu.id}>
                            <td>
                              <img
                                src={getStudentPhoto(stu.photo)}
                                alt={`${stu.firstname} ${stu.surname}`}
                                className="db-avatar"
                              />
                            </td>

                            <td>
                              <span
                                className="db-score-pill"
                                style={{ background: "rgba(30,64,175,0.10)", color: "#1e40af" }}
                              >
                                {stu.adm_no}
                              </span>
                            </td>

                            <td>
                              <div className="db-name">
                                {stu.firstname} {stu.surname}
                              </div>
                              <div className="db-muted">{selectedClassName} · {date}</div>
                            </td>

                            <td>
                              <span className="db-score-pill" style={{ background: pill.bg, color: pill.color }}>
                                {pill.label}
                              </span>
                            </td>

                            <td>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button
                                  className={btnTone(st === "present", "g")}
                                  onClick={() => handleStatusChange(i, "present")}
                                  type="button"
                                >
                                  Present
                                </button>
                                <button
                                  className={btnTone(st === "absent", "r")}
                                  onClick={() => handleStatusChange(i, "absent")}
                                  type="button"
                                >
                                  Absent
                                </button>
                                <button
                                  className={btnTone(st === "late", "b")}
                                  onClick={() => handleStatusChange(i, "late")}
                                  type="button"
                                >
                                  Late
                                </button>
                                <button
                                  className={btnTone(st === "excused", "o")}
                                  onClick={() => handleStatusChange(i, "excused")}
                                  type="button"
                                >
                                  Excused
                                </button>
                              </div>
                            </td>

                            <td>
                              <input
                                className="db-remark"
                                value={stu.attendances?.[0]?.remarks || ""}
                                onChange={(e) => handleRemarkChange(i, e.target.value)}
                                placeholder="Optional remark…"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer bar */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "14px 20px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 12.5, color: "#9a8a7a" }}>
                  Tip: Save once after marking everyone. Unmarked students default to <b>Absent</b>.
                </div>

                <button
                  className="db-mini-btn db-mini-btn--g"
                  onClick={saveAttendance}
                  disabled={saving || !classId || students.length === 0}
                  type="button"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M13.5 4.5l-6.5 7L2.5 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Save Attendance
                </button>
              </div>
            </div>

            <div className="mt-auto" style={{ paddingTop: 18 }}>
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}