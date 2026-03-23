// src/pages/Students/PromoteStudentsPage.tsx
import { useEffect, useMemo, useState } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";

type Option = { id: number; name: string };

type StudentRow = {
  id: number;
  reg_no: string;
  firstname: string;
  surname: string;
  class_name: string;
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function PromoteStudentsPage() {
  const { showSuccess, showError } = useToast();

  // ===== Sidebar =====
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ===== Loading =====
  const [pageLoading, setPageLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [promoting, setPromoting] = useState(false);

  // ===== Role + Classes =====
  const [userRole, setUserRole] = useState<string>("");
  const [fromClasses, setFromClasses] = useState<Option[]>([]);
  const [allClasses, setAllClasses] = useState<Option[]>([]);

  const [fromClassId, setFromClassId] = useState<string>("");
  const [toClassId, setToClassId] = useState<string>("");

  // ===== Students =====
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [query, setQuery] = useState("");

  const isTeacher = String(userRole).toLowerCase() === "teacher";

  const canLoadStudents = useMemo(() => !!fromClassId, [fromClassId]);

  const canPromote = useMemo(() => {
    const from = Number(fromClassId);
    const to = Number(toClassId);
    return (
      !!fromClassId &&
      !!toClassId &&
      from > 0 &&
      to > 0 &&
      from !== to &&
      selectedIds.length > 0 &&
      !promoting
    );
  }, [fromClassId, toClassId, selectedIds, promoting]);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const name = `${s.surname} ${s.firstname}`.toLowerCase();
      return (
        name.includes(q) ||
        (s.reg_no || "").toLowerCase().includes(q) ||
        (s.class_name || "").toLowerCase().includes(q)
      );
    });
  }, [students, query]);

  const allVisibleSelected = useMemo(() => {
    if (filteredStudents.length === 0) return false;
    const set = new Set(selectedIds);
    return filteredStudents.every((s) => set.has(s.id));
  }, [filteredStudents, selectedIds]);

  // ===== Stats =====
  const stats = useMemo(() => {
    const totalLoaded = students.length;
    const totalVisible = filteredStudents.length;
    const selected = selectedIds.length;
    const selectable = totalVisible; // visible rows can be selected
    const completion = totalLoaded > 0 ? Math.round((selected / Math.max(1, totalLoaded)) * 100) : 0;
    return { totalLoaded, totalVisible, selected, selectable, completion };
  }, [students.length, filteredStudents.length, selectedIds.length]);

  // ===== Fetch classes (role-aware) =====
  useEffect(() => {
    setPageLoading(true);

    authApi
      .get("/getclasses")
      .then((res) => {
        const role = (res.data?.user_role || "").toString();
        setUserRole(role);

        const fc: Option[] = res.data?.from_classes || [];
        const ac: Option[] = res.data?.all_classes || [];

        setFromClasses(fc);
        setAllClasses(ac);

        if (!fromClassId && fc.length === 1) {
          setFromClassId(String(fc[0].id));
        }
      })
      .catch((err) => {
        console.error(err);
        showError("Failed to load classes.");
      })
      .finally(() => setPageLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If fromClass changes and equals toClass, clear toClass
  useEffect(() => {
    if (fromClassId && toClassId && fromClassId === toClassId) {
      setToClassId("");
    }
  }, [fromClassId, toClassId]);

  // ===== Fetch students by from_class =====
  useEffect(() => {
    if (!fromClassId) {
      setStudents([]);
      setSelectedIds([]);
      return;
    }

    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const res = await authApi.get("/students-by-class", {
          params: { class_id: Number(fromClassId) },
        });
        setStudents(res.data || []);
        setSelectedIds([]);
      } catch (err: any) {
        console.error(err);
        showError(err?.response?.data?.message || "Failed to load students for that class.");
        setStudents([]);
        setSelectedIds([]);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromClassId]);

  // ===== Selection helpers =====
  const toggleOne = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAllVisible = () => {
    const visibleIds = filteredStudents.map((s) => s.id);
    const set = new Set(selectedIds);

    if (allVisibleSelected) {
      const next = selectedIds.filter((id) => !visibleIds.includes(id));
      setSelectedIds(next);
    } else {
      visibleIds.forEach((id) => set.add(id));
      setSelectedIds(Array.from(set));
    }
  };

  const clearSelection = () => setSelectedIds([]);

  // ===== Promote =====
  const handlePromote = async () => {
    if (!canPromote) return;

    const from = Number(fromClassId);
    const to = Number(toClassId);

    setPromoting(true);
    try {
      const res = await authApi.post("/promote-students", {
        from_class: from,
        to_class: to,
        student_ids: selectedIds,
      });

      showSuccess(res?.data?.message || "Students promoted successfully.");

      const refreshed = await authApi.get("/students-by-class", { params: { class_id: from } });
      setStudents(refreshed.data || []);
      setSelectedIds([]);
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Failed to promote students.");
    } finally {
      setPromoting(false);
    }
  };

  return (
    <>
      <style>{`
/* ===== Uses the same template language as AdminDashboard ===== */
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
.db-hero-sub{ font-size:13.5px; font-weight:300; color:#94a3b8; line-height:1.7; max-width:560px; margin-bottom:18px; }

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
  min-width: 240px;
}
.db-hero-stat-item{ display:flex; align-items:center; justify-content:space-between; gap:14px; }
.db-hero-stat-label{ font-size:12px; font-weight:300; color:#94a3b8; }
.db-hero-stat-val{ font-family:"Lora", serif; font-size:18px; font-weight:700; color:#fff; }
.db-hero-stat-sep{ height:1px; background: rgba(255,255,255,0.06); margin:10px 0; }

.db-stats{
  display:grid;
  grid-template-columns: repeat(4, 1fr);
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

.db-panel{
  background:#fff;
  border:1px solid #ede8e0;
  border-radius:14px;
  overflow:hidden;
  margin-bottom: 22px;
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
  display:flex; align-items:flex-end; justify-content:space-between;
  flex-wrap:wrap; gap:12px;
}
.db-fields{
  display:grid;
  grid-template-columns: repeat(3, minmax(220px, 1fr));
  gap:12px;
  width:100%;
}
@media (max-width: 991.98px){ .db-fields{ grid-template-columns: 1fr; } }
.db-field-label{ font-size:12px; font-weight:700; color:#1a1a2e; margin-bottom:6px; }
.db-help{ font-size:12px; color:#9a8a7a; margin-top:6px; }
.db-select, .db-input{
  border:1px solid #e5ddd3;
  background:#fff;
  border-radius:10px;
  padding:10px 12px;
  font-size:13px;
  color:#1a1a2e;
  outline:none;
  min-height: 40px;
  width:100%;
}
.db-input:focus, .db-select:focus{
  border-color: rgba(201,168,76,0.7);
  box-shadow: 0 0 0 3px rgba(201,168,76,0.15);
}

.db-actions{
  display:flex; gap:10px; flex-wrap:wrap; align-items:center;
}
.db-mini-btn{
  display:inline-flex; align-items:center; justify-content:center;
  gap:6px;
  border-radius:10px;
  padding:10px 14px;
  font-size:12.5px;
  font-weight:700;
  border:1px solid #e5ddd3;
  background:#f5f1eb;
  color:#7a6a5a;
  cursor:pointer;
  transition: background .2s, transform .2s;
  min-height: 40px;
  white-space: nowrap;
}
.db-mini-btn:hover{ background:#ede8e0; transform: translateY(-1px); }
.db-mini-btn:disabled{ opacity:.55; cursor:not-allowed; transform:none; }

.db-mini-btn--g{ background: rgba(34,197,94,0.12); border-color: rgba(34,197,94,0.25); color:#15803d; }
.db-mini-btn--r{ background: rgba(244,63,94,0.10); border-color: rgba(244,63,94,0.22); color:#be123c; }
.db-mini-btn--p{ background: rgba(99,102,241,0.12); border-color: rgba(99,102,241,0.22); color:#4338ca; }

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

.db-pill{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:4px 10px;
  border-radius:999px;
  font-size:12.5px;
  font-weight:700;
}
.db-pill--info{ background: rgba(30,64,175,0.10); color:#1e40af; }
.db-pill--gold{ background: rgba(180,83,9,0.10); color:#b45309; }
.db-pill--muted{ background: rgba(148,163,184,0.18); color:#64748b; }

.db-empty{
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
      <PageTitle title="Promote Student" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {pageLoading && <Loader message="Loading promotion tool..." />}

            {/* ===== HERO ===== */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Promotion ·{" "}
                    <span style={{ color: "#94a3b8" }}>{fromClassId ? "From class selected" : "Pick a class"}</span>{" "}
                    ·{" "}
                    <span style={{ color: "#94a3b8" }}>
                      {selectedIds.length > 0 ? `${selectedIds.length} selected` : "No selection"}
                    </span>
                  </div>

                  <h1 className="db-greeting">
                    {getGreeting()}, <em>{isTeacher ? "Teacher" : "Admin"}.</em>
                  </h1>

                  <p className="db-hero-sub">
                    Promote students from one class to another in bulk. From and To classes must be different. Use search
                    + “Select Visible” for fast selection.
                  </p>

                  <div className="db-hero-btns">
                    <button
                      className="db-btn-gold"
                      onClick={handlePromote}
                      disabled={!canPromote}
                      title={
                        !fromClassId
                          ? "Select From Class"
                          : !toClassId
                          ? "Select To Class"
                          : fromClassId === toClassId
                          ? "To Class must be different"
                          : selectedIds.length === 0
                          ? "Select at least one student"
                          : "Promote selected students"
                      }
                    >
                      {promoting ? (
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
                          Promoting…
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M6 10l4-4"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                            />
                            <path
                              d="M8.5 5H11v2.5"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M3.5 12.5V4.5a2 2 0 012-2h7"
                              stroke="currentColor"
                              strokeWidth="1.3"
                              strokeLinecap="round"
                            />
                          </svg>
                          Promote Selected
                        </>
                      )}
                    </button>

                    <button
                      className="db-btn-outline"
                      onClick={toggleAllVisible}
                      disabled={!canLoadStudents || loadingStudents || filteredStudents.length === 0}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M3 8l3 3 7-7"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {allVisibleSelected ? "Unselect Visible" : "Select Visible"}
                    </button>

                    <button
                      className="db-btn-outline"
                      onClick={clearSelection}
                      disabled={selectedIds.length === 0}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M5 5l6 6M11 5L5 11"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>
                      Clear
                    </button>
                  </div>
                </div>

                {/* Hero mini stat */}
                <div className="db-hero-stat-card d-none d-md-block">
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c9a84c", marginBottom: 10 }}>
                    Quick glance
                  </div>

                  <div className="db-hero-stat-item">
                    <span className="db-hero-stat-label">Loaded</span>
                    <span className="db-hero-stat-val">{stats.totalLoaded}</span>
                  </div>
                  <div className="db-hero-stat-sep" />
                  <div className="db-hero-stat-item">
                    <span className="db-hero-stat-label">Visible</span>
                    <span className="db-hero-stat-val">{stats.totalVisible}</span>
                  </div>
                  <div className="db-hero-stat-sep" />
                  <div className="db-hero-stat-item">
                    <span className="db-hero-stat-label">Selected</span>
                    <span className="db-hero-stat-val">{stats.selected}</span>
                  </div>

                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      Completion: <b style={{ color: "#fff" }}>{stats.completion}%</b>
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      Role: <b style={{ color: "#fff" }}>{isTeacher ? "Teacher" : "Admin"}</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== KPI cards ===== */}
            <div className="db-stats">
              {[
                { title: "Students Loaded", value: stats.totalLoaded, color: "#1e40af", bg: "#dbeafe", hint: "current from-class list" },
                { title: "Visible", value: stats.totalVisible, color: "#065f46", bg: "#d1fae5", hint: "after search filter" },
                { title: "Selected", value: stats.selected, color: "#b45309", bg: "#fef3c7", hint: "ready to promote" },
                { title: "Completion", value: `${stats.completion}%`, color: "#7c3aed", bg: "#ede9fe", hint: "selection ratio" },
              ].map((c, i) => {
                const icons = [
                  <svg key="i1" width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M2 18c0-3.314 2.686-6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="15" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4"/></svg>,
                  <svg key="i2" width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 10h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M6 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M6 14h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
                  <svg key="i3" width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M16 6l-7 9-3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.2" opacity="0.35"/></svg>,
                  <svg key="i4" width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 12V7M7 12V4M11 12V8M15 12V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
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
                      <span className="db-stat-trend">{stats.completion}%</span>
                      <span>{c.hint}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ===== Panel: Controls + Table ===== */}
            <div className="db-panel">
              <div className="db-panel-head">
                <div className="db-panel-title-group">
                  <div className="db-panel-icon" style={{ "--pi": "#fef3c7", "--pc": "#b45309" } as React.CSSProperties}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 3h8M5 7h6M6 11h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="db-panel-title">Promotion Tool</p>
                    <p className="db-panel-sub">
                      Pick From Class → choose To Class → select students → promote.
                    </p>
                  </div>
                </div>

                <button
                  className="db-refresh-btn"
                  onClick={() => {
                    if (!fromClassId) return;
                    // re-trigger by setting fromClassId to itself? better: refetch explicitly
                    (async () => {
                      setLoadingStudents(true);
                      try {
                        const res = await authApi.get("/students-by-class", {
                          params: { class_id: Number(fromClassId) },
                        });
                        setStudents(res.data || []);
                        setSelectedIds([]);
                      } catch (err: any) {
                        console.error(err);
                        showError(err?.response?.data?.message || "Failed to refresh students.");
                      } finally {
                        setLoadingStudents(false);
                      }
                    })();
                  }}
                  disabled={!fromClassId || loadingStudents}
                  title={!fromClassId ? "Select From Class first" : "Refresh list"}
                >
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

              {/* Toolbar / fields */}
              <div className="db-toolbar">
                <div style={{ width: "100%" }}>
                  <div className="db-fields">
                    <div>
                      <div className="db-field-label">From Class</div>
                      <select
                        className="db-select"
                        value={fromClassId}
                        onChange={(e) => setFromClassId(e.target.value)}
                        disabled={fromClasses.length === 0}
                        title={fromClasses.length === 0 ? "No available class to promote from" : "Select from class"}
                      >
                        <option value="">
                          {fromClasses.length === 0 ? "No assigned class" : "Select class"}
                        </option>
                        {fromClasses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <div className="db-help">
                        {isTeacher ? "Teachers can only promote from assigned class." : "Loads students in this class."}
                      </div>
                    </div>

                    <div>
                      <div className="db-field-label">To Class</div>
                      <select
                        className="db-select"
                        value={toClassId}
                        onChange={(e) => setToClassId(e.target.value)}
                        disabled={!fromClassId}
                        title={!fromClassId ? "Select From Class first" : "Select destination class"}
                      >
                        <option value="">Select class</option>
                        {allClasses.map((c) => (
                          <option key={c.id} value={c.id} disabled={String(c.id) === fromClassId}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <div className="db-help">Students will be moved to this class.</div>
                    </div>

                    <div>
                      <div className="db-field-label">Search Students</div>
                      <input
                        className="db-input"
                        placeholder="Search by name / reg no / class..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        disabled={!canLoadStudents}
                      />
                      <div className="db-help">Search applies to loaded list only.</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }} className="db-actions">
                    <button
                      type="button"
                      className="db-mini-btn"
                      onClick={toggleAllVisible}
                      disabled={!canLoadStudents || loadingStudents || filteredStudents.length === 0}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M3 8l3 3 7-7"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {allVisibleSelected ? "Unselect Visible" : "Select Visible"}
                    </button>

                    <button
                      type="button"
                      className="db-mini-btn db-mini-btn--r"
                      onClick={clearSelection}
                      disabled={selectedIds.length === 0}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M5 5l6 6M11 5L5 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      Clear
                    </button>

                    <button
                      type="button"
                      className="db-mini-btn db-mini-btn--p"
                      onClick={handlePromote}
                      disabled={!canPromote}
                    >
                      {promoting ? (
                        <>
                          <span
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: "50%",
                              border: "2px solid rgba(67,56,202,0.25)",
                              borderTopColor: "#4338ca",
                              display: "inline-block",
                              animation: "dbSpin 0.8s linear infinite",
                            }}
                          />
                          Promoting…
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M6 10l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                            <path d="M8.5 5H11v2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Promote Selected
                        </>
                      )}
                    </button>

                    <span className="db-pill db-pill--muted" style={{ marginLeft: "auto" }}>
                      Selected: {selectedIds.length}
                    </span>
                    <span className="db-pill db-pill--gold">
                      From: {fromClassId ? selectedFromName(fromClasses, fromClassId) : "—"}
                    </span>
                    <span className="db-pill db-pill--info">
                      To: {toClassId ? selectedFromName(allClasses, toClassId) : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                <table className="db-table">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleAllVisible}
                          aria-label="Select all visible"
                          disabled={!canLoadStudents || loadingStudents || filteredStudents.length === 0}
                        />
                      </th>
                      <th>Student</th>
                      <th style={{ width: 180 }}>Admission No</th>
                      <th style={{ width: 240 }}>Current Class</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loadingStudents ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i}>
                          <td><div className="db-skeleton" style={{ width: 16 }} /></td>
                          <td><div className="db-skeleton" style={{ width: 220 }} /></td>
                          <td><div className="db-skeleton" style={{ width: 120 }} /></td>
                          <td><div className="db-skeleton" style={{ width: 160 }} /></td>
                        </tr>
                      ))
                    ) : !fromClassId ? (
                      <tr>
                        <td colSpan={4} className="db-empty">
                          <div style={{ fontWeight: 800, color: "#1a1a2e" }}>Select a From Class</div>
                          <div style={{ marginTop: 6 }}>Students will appear here after choosing a class.</div>
                        </td>
                      </tr>
                    ) : filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="db-empty">
                          <div style={{ fontWeight: 800, color: "#1a1a2e" }}>No students found</div>
                          <div style={{ marginTop: 6 }}>Try clearing search or check the selected class.</div>
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((s) => {
                        const checked = selectedIds.includes(s.id);
                        return (
                          <tr key={s.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleOne(s.id)}
                                aria-label={`Select ${s.surname} ${s.firstname}`}
                              />
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: "#1a1a2e" }}>
                                {s.surname} {s.firstname}
                              </div>
                              <div className="db-muted">ID: {s.id}</div>
                            </td>
                            <td>
                              <span className="db-pill db-pill--info">{s.reg_no || "—"}</span>
                            </td>
                            <td>{s.class_name || "—"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Panel footer helper */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "14px 20px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 12.5, color: "#9a8a7a" }}>
                  Tip: “Select Visible” respects your search filter. From Class and To Class must be different.
                </div>
                <button
                  type="button"
                  className="db-mini-btn db-mini-btn--p"
                  onClick={handlePromote}
                  disabled={!canPromote}
                >
                  Promote Selected
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

/* helper: find name from options safely */
function selectedFromName(list: Option[], id: string) {
  return list.find((x) => String(x.id) === String(id))?.name || "—";
}