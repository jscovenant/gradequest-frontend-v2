import { useEffect, useMemo, useState } from "react";
import { authApi } from "../../../utils/axios";

import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";

/* =========================
   TYPES
========================= */
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

interface StatCard {
  title: string;
  value: string | number;
  icon: string;
}

export default function StudentMySubjectsPage() {
  // ===== Sidebar State =====
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ===== Loading & Error =====
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // ===== Data =====
  const [department, setDepartment] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [serverMsg, setServerMsg] = useState("");

  // ===== Search =====
  const [search, setSearch] = useState("");

  // ===== Stats =====
  const [stats, setStats] = useState<StatCard[]>([
    { title: "Department", value: "—", icon: "diagram-3" },
    { title: "Total Subjects", value: 0, icon: "book" },
    { title: "Showing", value: 0, icon: "filter" },
    { title: "Search", value: "Off", icon: "search" },
  ]);

  // ===== Fetch Subjects =====
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setErrorMsg("");

    authApi
      .get<MySubjectsResponse>("/student/my-subjects")
      .then((res) => {
        if (!mounted) return;

        const dep = res.data?.department ?? null;
        const subs = res.data?.subjects ?? [];
        const msg = res.data?.message ?? "";

        setDepartment(dep);
        setSubjects(subs);
        setServerMsg(msg);
      })
      .catch((err) => {
        console.error(err);
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

    return subjects.filter((s) => {
      const name = (s.name || "").toLowerCase();
      const code = (s.subject_id || "").toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [subjects, search]);

  // keep stats synced
  useEffect(() => {
    setStats([
      { title: "Department", value: department || "—", icon: "diagram-3" },
      { title: "Total Subjects", value: subjects.length, icon: "book" },
      { title: "Showing", value: filtered.length, icon: "filter" },
      { title: "Search", value: search.trim() ? "On" : "Off", icon: "search" },
    ]);
  }, [department, subjects.length, filtered.length, search]);

  // Get current time greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="My Subjects" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main
            className="col-md-9 col-lg-10 ms-auto px-4 d-flex flex-column min-vh-100"
            style={{ backgroundColor: "#f8f9fa" }}
          >
            {loading && <Loader message="Loading subjects..." />}

            {/* Hero Section (same color template) */}
            <div
              className="mt-4 p-4 position-relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: "16px",
                boxShadow: "0 10px 30px rgba(102, 126, 234, 0.3)",
              }}
            >
              {/* Decorative elements */}
              <div
                style={{
                  position: "absolute",
                  top: "-50px",
                  right: "-50px",
                  width: "200px",
                  height: "200px",
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "50%",
                  filter: "blur(40px)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "-30px",
                  left: "-30px",
                  width: "150px",
                  height: "150px",
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "50%",
                  filter: "blur(40px)",
                }}
              />

              <div className="row align-items-center position-relative">
                <div className="col-md-8">
                  <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                    <span
                      className="badge px-3 py-2"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        color: "#fff",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                      }}
                    >
                      <i className="bi bi-diagram-3 me-1"></i>
                      {department || "Department —"}
                    </span>

                    <span
                      className="badge px-3 py-2"
                      style={{
                        backgroundColor: "rgba(16, 185, 129, 0.9)",
                        color: "#fff",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                      }}
                    >
                      <i className="bi bi-check-circle-fill me-1"></i>
                      Student Account
                    </span>
                  </div>

                  <h2 className="fw-bold text-white mb-2">{getGreeting()}, Student! 👋</h2>
                  <p className="text-white mb-0" style={{ opacity: 0.9, fontSize: "1rem" }}>
                    Here are the subjects available in your department. Use search to find any subject quickly.
                  </p>

                  {!!serverMsg && (
                    <div className="mt-3">
                      <span
                        className="badge px-3 py-2"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.2)",
                          color: "#fff",
                          borderRadius: "20px",
                          fontSize: "0.75rem",
                          fontWeight: "500",
                        }}
                      >
                        <i className="bi bi-info-circle me-1"></i>
                        {serverMsg}
                      </span>
                    </div>
                  )}
                </div>

                <div className="col-md-4 d-none d-md-block text-end">
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(10px)",
                      borderRadius: "16px",
                      padding: "1.5rem",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <span className="text-white" style={{ fontSize: "0.9rem", opacity: 0.9 }}>
                        Quick Stats
                      </span>
                      <i className="bi bi-book-half text-white"></i>
                    </div>
                    <div className="d-flex flex-column gap-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-white" style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                          Total Subjects
                        </span>
                        <span className="text-white fw-bold">{subjects.length}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-white" style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                          Showing
                        </span>
                        <span className="text-white fw-bold">{filtered.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Error */}
            {errorMsg && (
              <div className="alert alert-danger mt-3" role="alert">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {errorMsg}
              </div>
            )}

            {/* Stats Cards (same color template) */}
            <div className="row g-3 mb-4 mt-3">
              {stats.map(({ title, value, icon }, index) => {
                const colors = [
                  {
                    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    icon: "#667eea",
                    bg: "#f0edff",
                  },
                  {
                    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                    icon: "#f5576c",
                    bg: "#fff0f3",
                  },
                  {
                    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                    icon: "#00f2fe",
                    bg: "#e6f9ff",
                  },
                  {
                    gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                    icon: "#38f9d7",
                    bg: "#e6fff9",
                  },
                ];

                return (
                  <div className="col-md-6 col-lg-3" key={title}>
                    <div
                      className="card border-0 h-100 position-relative overflow-hidden"
                      style={{
                        borderRadius: "12px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                        transition: "transform 0.2s, box-shadow 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.12)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08)";
                      }}
                    >
                      {/* Gradient accent */}
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: "4px",
                          background: colors[index].gradient,
                        }}
                      />

                      <div className="card-body p-4">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div className="p-2 rounded-3" style={{ backgroundColor: colors[index].bg }}>
                            <i className={`bi bi-${icon} fs-4`} style={{ color: colors[index].icon }}></i>
                          </div>
                          <i className="bi bi-three-dots-vertical text-muted" style={{ cursor: "pointer" }}></i>
                        </div>

                        <p className="text-muted mb-1 small">{title}</p>
                        <h3 className="fw-bold mb-0" style={{ color: "#1e293b" }}>
                          {value}
                        </h3>

                        <div className="mt-3 pt-3" style={{ borderTop: "1px solid #f1f5f9" }}>
                          <small className="text-muted d-flex align-items-center gap-1">
                            <i className="bi bi-check-circle text-success"></i>
                            Updated
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Search */}
            <div className="card shadow-sm border-0 mb-3" style={{ borderRadius: "12px" }}>
              <div className="card-body p-4">
                <div className="row g-2 align-items-end">
                  <div className="col-md-8">
                    <label className="form-label small text-muted mb-1">Search subjects</label>
                    <div className="input-group">
                      <span className="input-group-text bg-white">
                        <i className="bi bi-search"></i>
                      </span>
                      <input
                        className="form-control"
                        placeholder="Search by subject name or subject code"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="col-md-4 d-flex justify-content-md-end">
                    <button className="btn btn-outline-secondary" onClick={() => setSearch("")} disabled={!search.trim()}>
                      <i className="bi bi-x-circle me-1"></i>
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Subjects List */}
            <div className="row g-3 mb-4">
              {!filtered.length ? (
                <div className="col-12">
                  <div className="card border-0 shadow-sm" style={{ borderRadius: "12px" }}>
                    <div className="card-body p-5 text-center text-muted">
                      <i className="bi bi-book fs-1 d-block mb-2"></i>
                      <div className="fw-semibold">No subjects found</div>
                      <small>Try changing your search term or contact the admin to confirm subject setup.</small>
                    </div>
                  </div>
                </div>
              ) : (
                filtered.map((s) => (
                  <div className="col-md-6 col-lg-4" key={s.id}>
                    <div
                      className="card border-0 h-100 position-relative overflow-hidden"
                      style={{
                        borderRadius: "12px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                        transition: "transform 0.2s, box-shadow 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.12)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08)";
                      }}
                    >
                      {/* small accent like dashboard */}
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: "4px",
                          background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                        }}
                      />

                      <div className="card-body p-4">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <div className="p-2 rounded-3" style={{ backgroundColor: "#e6f9ff" }}>
                              <i className="bi bi-book-half fs-5" style={{ color: "#00bcd4" }}></i>
                            </div>

                            <div>
                              <div className="fw-semibold" style={{ color: "#0f172a" }}>
                                {s.name}
                              </div>
                              <small className="text-muted">{s.subject_id ? `Code: ${s.subject_id}` : "Code: —"}</small>
                            </div>
                          </div>

                          <span className="badge text-bg-light">#{s.id}</span>
                        </div>

                        <p className="text-muted mb-0" style={{ fontSize: "0.9rem" }}>
                          Subject available for your department. Results will appear when published.
                        </p>
                      </div>

                      <div className="card-footer bg-white border-0 px-4 pb-4 pt-0">
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">
                            <i className="bi bi-check2-circle me-1"></i>
                            Available
                          </small>

                          <button className="btn btn-sm btn-outline-primary" disabled>
                            <i className="bi bi-arrow-right me-1"></i>
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}