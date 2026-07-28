import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../../utils/axios";

import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";

type SubjectRow = {
  id: number;
  name: string;
  subject_id?: string | null;
};

type MySubjectsResponse = {
  message?: string;
  department?: string | null;
  subjects: SubjectRow[];
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function StudentMySubjectsPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [department, setDepartment] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [serverMsg, setServerMsg] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setErrorMsg("");

    authApi
      .get<MySubjectsResponse>("/student/my-subjects")
      .then((res) => {
        if (!mounted) return;
        setDepartment(res.data?.department ?? null);
        setSubjects(Array.isArray(res.data?.subjects) ? res.data.subjects : []);
        setServerMsg(res.data?.message ?? "");
      })
      .catch((err) => {
        if (!mounted) return;
        setErrorMsg(err?.response?.data?.message || "Failed to load subjects.");
        setSubjects([]);
        setDepartment(null);
        setServerMsg("");
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subjects;

    return subjects.filter((subject) => {
      const name = (subject.name || "").toLowerCase();
      const code = (subject.subject_id || "").toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [subjects, search]);

  return (
    <>
      <style>{`
        .sp-hero{background:linear-gradient(135deg,var(--gq-dark,#050008),#180820);border-radius:14px;padding:26px;position:relative;overflow:hidden;color:#fff;box-shadow:0 18px 42px rgba(5,0,8,.12);margin-bottom:18px}
        .sp-hero:before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,.045) 1px,transparent 1px);background-size:22px 22px}
        .sp-hero-inner{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:20px;align-items:center}
        .sp-pill-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}.sp-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);font-size:11.5px;color:rgba(255,255,255,.78)}
        .sp-title{font-size:clamp(24px,3vw,34px);font-weight:900;letter-spacing:0;margin:0 0 8px}.sp-title span{color:var(--gq-secondary,#ffc857)}
        .sp-sub{font-size:13.5px;color:rgba(255,255,255,.64);line-height:1.65;max-width:650px;margin:0}
        .sp-panel{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:18px}.sp-panel-row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.08)}.sp-panel-row:last-child{border-bottom:0}.sp-panel-label{font-size:11.5px;color:rgba(255,255,255,.5)}.sp-panel-value{font-size:14px;font-weight:850;color:var(--gq-secondary,#ffc857);text-align:right}
        .sp-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:18px}.sp-card{background:#fff;border:1px solid var(--gq-border,rgba(5,0,8,.09));border-radius:14px;box-shadow:0 10px 28px rgba(5,0,8,.045);min-width:0}.sp-stat{padding:16px}.sp-stat-icon{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;background:rgba(211,0,176,.08);color:var(--gq-primary,#d300b0)}.sp-stat-label{font-size:11.5px;color:#8a7d72;margin:0 0 5px}.sp-stat-value{font-size:22px;font-weight:900;color:var(--gq-dark,#050008);margin:0}.sp-stat-sub{font-size:11.5px;color:#a3978d;margin-top:6px}
        .sp-card-pad{padding:18px}.sp-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.sp-card-title{font-size:15px;font-weight:900;color:var(--gq-dark,#050008);margin:0}.sp-card-sub{font-size:12px;color:#8a7d72;margin:2px 0 0}
        .sp-search{display:flex;gap:10px;align-items:center}.sp-input-wrap{flex:1;position:relative}.sp-input-wrap i{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#9b8f86}.sp-input{width:100%;height:42px;border:1px solid rgba(5,0,8,.09);border-radius:10px;padding:0 14px 0 38px;outline:none}.sp-input:focus{border-color:rgba(211,0,176,.4);box-shadow:0 0 0 4px rgba(211,0,176,.08)}
        .sp-btn{border:0;border-radius:10px;padding:10px 15px;font-size:13px;font-weight:750;display:inline-flex;align-items:center;gap:8px;text-decoration:none;cursor:pointer}.sp-btn-gold{background:var(--gq-secondary,#ffc857);color:var(--gq-dark,#050008)}.sp-btn-soft{background:var(--gq-surface-soft,#fbf7f8);color:#5f5147;border:1px solid rgba(5,0,8,.08)}
        .sp-subjects{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.sp-subject{padding:16px;transition:transform .18s ease,box-shadow .18s ease}.sp-subject:hover{transform:translateY(-3px);box-shadow:0 16px 34px rgba(5,0,8,.07)}.sp-subject-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.sp-subject-icon{width:42px;height:42px;border-radius:12px;background:rgba(255,200,87,.16);color:#b77900;display:flex;align-items:center;justify-content:center;flex:0 0 auto}.sp-subject-name{font-size:15px;font-weight:900;color:var(--gq-dark,#050008);margin:0}.sp-subject-code{font-size:12px;color:#8a7d72;margin:2px 0 0}.sp-subject-foot{display:flex;justify-content:space-between;align-items:center;margin-top:18px;padding-top:12px;border-top:1px solid rgba(5,0,8,.06);font-size:12px;color:#7a6a5a}
        .sp-empty,.sp-error{border-radius:12px;padding:18px;font-size:13px}.sp-empty{border:1px dashed rgba(5,0,8,.14);background:var(--gq-surface-soft,#fbf7f8);color:#7a6a5a;text-align:center}.sp-error{background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.18);color:#b91c1c;margin-bottom:16px}
        @media(max-width:1199.98px){.sp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sp-subjects{grid-template-columns:repeat(2,minmax(0,1fr))}.sp-hero-inner{grid-template-columns:1fr}}
        @media(max-width:575.98px){.sp-hero{padding:20px}.sp-grid,.sp-subjects{grid-template-columns:1fr}.sp-search{align-items:stretch;flex-direction:column}.sp-panel{display:none}.sp-btn{justify-content:center;width:100%}}
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="My Subjects" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto gq-app-main d-flex flex-column">
            {loading && <Loader message="Loading subjects..." />}
            {errorMsg && <div className="sp-error"><i className="bi bi-exclamation-circle me-2" />{errorMsg}</div>}

            <section className="sp-hero">
              <div className="sp-hero-inner">
                <div>
                  <div className="sp-pill-row">
                    <span className="sp-pill"><i className="bi bi-diagram-3" />{department || "Department not assigned"}</span>
                    <span className="sp-pill"><i className="bi bi-book" />{subjects.length} subject{subjects.length === 1 ? "" : "s"}</span>
                  </div>
                  <h1 className="sp-title">{greeting()}, <span>Student.</span></h1>
                  <p className="sp-sub">See all subjects assigned to you. Use the search box to quickly find a subject by name or code.</p>
                  {serverMsg && <div className="sp-pill-row mt-3"><span className="sp-pill"><i className="bi bi-info-circle" />{serverMsg}</span></div>}
                </div>

                <div className="sp-panel">
                  <div className="sp-panel-row"><span className="sp-panel-label">Department</span><span className="sp-panel-value">{department || "Not set"}</span></div>
                  <div className="sp-panel-row"><span className="sp-panel-label">Subjects</span><span className="sp-panel-value">{subjects.length}</span></div>
                  <div className="sp-panel-row"><span className="sp-panel-label">Showing</span><span className="sp-panel-value">{filtered.length}</span></div>
                </div>
              </div>
            </section>

            <section className="sp-grid">
              {[
                { label: "Department", value: department || "Not set", sub: "Your learning group", icon: "diagram-3" },
                { label: "Total Subjects", value: subjects.length, sub: "Assigned to you", icon: "book" },
                { label: "Showing", value: filtered.length, sub: "After search filter", icon: "filter" },
                { label: "Search", value: search.trim() ? "On" : "Off", sub: "Find subjects faster", icon: "search" },
              ].map((item) => (
                <div className="sp-card sp-stat" key={item.label}>
                  <div className="sp-stat-icon"><i className={`bi bi-${item.icon}`} /></div>
                  <p className="sp-stat-label">{item.label}</p>
                  <p className="sp-stat-value">{item.value}</p>
                  <div className="sp-stat-sub">{item.sub}</div>
                </div>
              ))}
            </section>

            <section className="sp-card sp-card-pad mb-3">
              <div className="sp-card-head">
                <div>
                  <h2 className="sp-card-title">Find a Subject</h2>
                  <p className="sp-card-sub">Search by subject name or subject code.</p>
                </div>
              </div>
              <div className="sp-search">
                <div className="sp-input-wrap">
                  <i className="bi bi-search" />
                  <input
                    className="sp-input"
                    placeholder="Example: Mathematics or MTH101"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <button className="sp-btn sp-btn-soft" onClick={() => setSearch("")} disabled={!search.trim()}>
                  <i className="bi bi-x-circle" /> Clear
                </button>
                <button className="sp-btn sp-btn-gold" onClick={() => navigate("/dashboard")}>
                  <i className="bi bi-speedometer2" /> Dashboard
                </button>
              </div>
            </section>

            <section className="sp-subjects mb-4">
              {!filtered.length ? (
                <div className="sp-empty sp-card" style={{ gridColumn: "1 / -1" }}>
                  <i className="bi bi-book fs-2 d-block mb-2" />
                  <strong>No subjects found</strong>
                  <div>Try another search word or contact the school if your subjects are missing.</div>
                </div>
              ) : (
                filtered.map((subject) => (
                  <article className="sp-card sp-subject" key={subject.id}>
                    <div className="sp-subject-top">
                      <div className="d-flex gap-3">
                        <div className="sp-subject-icon"><i className="bi bi-book-half" /></div>
                        <div>
                          <h3 className="sp-subject-name">{subject.name}</h3>
                          <p className="sp-subject-code">{subject.subject_id ? `Code: ${subject.subject_id}` : "No subject code"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="sp-subject-foot">
                      <span><i className="bi bi-check2-circle me-1" />Available</span>
                      <span>#{subject.id}</span>
                    </div>
                  </article>
                ))
              )}
            </section>

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}
