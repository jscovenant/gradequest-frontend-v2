import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../../../utils/axios";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import PageTitle from "../../../components/PageTitle";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";

interface Child {
  id: number;
  firstname: string;
  surname: string;
  reg_no: string;
  photo?: string | null;
  class_name?: string;
  level_id?: number;
}

interface SubjectScore {
  id: number;
  subject_id: number;
  subject_name: string;
  exam_score?: number | string;
  ca_total?: number | string;
  total_score?: number | string;
  exam?: number | string;
  ca?: any;
  total?: number | string;
  grade?: string;
  remark?: string;
}

interface TermResult {
  batch_id?: number | null;
  term: string;
  session: string;
  class_id: number;
  class_name?: string;
  total_score: number;
  average_score: number;
  position?: string | number;
  total_students?: string | number;
  class_teacher_comment?: string;
  principal_comment?: string;
  subjects: SubjectScore[];
  subjects_count: number;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

export default function ParentResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [results, setResults] = useState<TermResult[]>([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(0);

  // Parse student_id from query params
  const searchParams = new URLSearchParams(location.search);
  const initialStudentId = searchParams.get("student_id") || searchParams.get("child_id");

  const fetchResults = async (studentId?: number) => {
    try {
      setLoading(true);
      const url = studentId ? `/parent/child-results?student_id=${studentId}` : "/parent/child-results";
      const res = await authApi.get(url);
      const data = res.data;

      setChildren(data.children || []);
      if (data.selected_child) {
        setSelectedChildId(data.selected_child.id);
      } else if (data.children && data.children.length > 0 && !selectedChildId) {
        setSelectedChildId(data.children[0].id);
      }
      setResults(data.results || []);
      setSelectedResultIndex(0);
    } catch (err: any) {
      console.error("Failed to load child results", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults(initialStudentId ? Number(initialStudentId) : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handleChildSwitch = (childId: number) => {
    setSelectedChildId(childId);
    navigate(`/parent/results?student_id=${childId}`, { replace: true });
    fetchResults(childId);
  };

  const selectedChild = children.find((c) => c.id === selectedChildId);
  const activeResult = results[selectedResultIndex] || null;

  const getGradeBadge = (grade?: string) => {
    if (!grade) return <span className="badge bg-secondary">—</span>;
    const g = grade.toUpperCase();
    if (g.startsWith("A")) return <span className="badge bg-success-subtle text-success fw-bold px-2 py-1">{grade}</span>;
    if (g.startsWith("B")) return <span className="badge bg-primary-subtle text-primary fw-bold px-2 py-1">{grade}</span>;
    if (g.startsWith("C")) return <span className="badge bg-info-subtle text-info fw-bold px-2 py-1">{grade}</span>;
    if (g.startsWith("D") || g.startsWith("E")) return <span className="badge bg-warning-subtle text-warning fw-bold px-2 py-1">{grade}</span>;
    return <span className="badge bg-danger-subtle text-danger fw-bold px-2 py-1">{grade}</span>;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        .p-res-main {
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: calc(66px + 24px) 28px 40px !important;
        }

        @media (max-width: 767.98px) {
          .p-res-main {
            padding: calc(66px + 16px) 14px 36px !important;
          }
        }

        .p-res-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 18px;
          padding: 32px 36px;
          color: #FFFFFF;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
          position: relative;
          overflow: hidden;
        }

        @media (max-width: 767.98px) {
          .p-res-hero {
            padding: 20px 18px !important;
            border-radius: 14px !important;
            margin-bottom: 16px !important;
          }
        }

        .p-res-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }

        .p-res-hero-glow {
          position: absolute;
          top: -40px;
          right: -40px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.2) 0%, transparent 65%);
          pointer-events: none;
        }

        .p-res-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
        }

        .p-res-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #FBBF24;
          background: rgba(217, 119, 6, 0.20);
          border: 1px solid rgba(217, 119, 6, 0.35);
          border-radius: 100px;
          padding: 4px 12px;
          margin-bottom: 12px;
        }

        .p-res-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 6px #10B981;
        }

        .p-res-title {
          font-size: 26px;
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.1;
          margin-bottom: 8px;
        }

        .p-res-title em {
          font-style: normal;
          color: #FBBF24;
        }

        .p-res-sub {
          font-size: 13.5px;
          color: #CBD5E1;
          line-height: 1.6;
          max-width: 620px;
          margin-bottom: 0;
        }

        @media (max-width: 767.98px) {
          .p-res-title {
            font-size: 20px !important;
          }
          .p-res-sub {
            font-size: 12.5px !important;
          }
        }

        /* Child Selector Pills */
        .p-child-pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          border-radius: 12px;
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          color: #475569;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .p-child-pill:hover {
          background: #F1F5F9;
          border-color: #CBD5E1;
          transform: translateY(-1px);
        }

        .p-child-pill.active {
          background: #0A192F;
          border-color: #0A192F;
          color: #FFFFFF;
          box-shadow: 0 4px 14px rgba(10, 25, 47, 0.25);
        }

        .p-child-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 12px;
          color: #0F2744;
          overflow: hidden;
        }

        /* Panels */
        .p-res-panel {
          background: #FFFFFF;
          border: 1px solid rgba(15, 39, 68, 0.08);
          border-radius: 18px;
          box-shadow: 0 4px 20px rgba(15, 39, 68, 0.06);
          overflow: hidden;
          margin-bottom: 24px;
        }

        .p-res-panel-head {
          padding: 18px 24px;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        /* Stat Card */
        .p-stat-card {
          background: #FFFFFF;
          border: 1px solid rgba(15, 39, 68, 0.08);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(15, 39, 68, 0.04);
        }

        .p-res-table {
          width: 100%;
          border-collapse: collapse;
        }

        .p-res-table th {
          background: #F8FAFC;
          color: #64748B;
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 12px 18px;
          border-bottom: 1px solid #E2E8F0;
        }

        .p-res-table td {
          padding: 14px 18px;
          border-bottom: 1px solid #F1F5F9;
          font-size: 13.5px;
          color: #1E293B;
          vertical-align: middle;
        }

        .p-res-table tr:hover td {
          background: #F8FAFC;
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Academic Results & Broadsheet - SchoolProfit" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto gq-app-main p-res-main d-flex flex-column min-vh-100">
            {loading && <Loader message="Loading academic results..." />}

            {/* ── Signature Hero ── */}
            <div className="p-res-hero">
              <div className="p-res-hero-glow" />
              <div className="p-res-hero-inner">
                <div>
                  <div className="p-res-badge">
                    <span className="p-res-dot" />
                    Parent Portal · Academic Broadsheet & Results
                  </div>
                  <h1 className="p-res-title">
                    {getGreeting()}, <em>Academic Records</em>
                  </h1>
                  <p className="p-res-sub">
                    View official continuous assessments, examination scores, class positions, teacher remarks, and full term report cards.
                  </p>
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-light rounded-pill px-4"
                    onClick={() => navigate("/parent/children")}
                  >
                    <i className="bi bi-arrow-left me-1" />
                    All Children
                  </button>
                </div>
              </div>
            </div>

            {/* ── Child Selector ── */}
            {children.length > 0 && (
              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="fw-bold small text-uppercase text-muted" style={{ letterSpacing: "0.05em" }}>
                    Select Ward / Child
                  </span>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {children.map((child) => {
                    const isActive = child.id === selectedChildId;
                    const initials = `${child.surname?.[0] || ""}${child.firstname?.[0] || ""}`.toUpperCase();
                    return (
                      <button
                        key={child.id}
                        type="button"
                        className={`p-child-pill ${isActive ? "active" : ""}`}
                        onClick={() => handleChildSwitch(child.id)}
                      >
                        <div className="p-child-avatar">
                          {child.photo ? (
                            <img
                              src={child.photo}
                              alt={child.firstname}
                              className="w-100 h-100 object-fit-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : null}
                          <span>{initials}</span>
                        </div>
                        <div className="text-start">
                          <div className="fw-bold">{child.surname} {child.firstname}</div>
                          <div className="small text-muted" style={{ fontSize: "11.5px" }}>
                            {child.class_name || "Assigned Class"} · {child.reg_no}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Results Available or Empty State ── */}
            {results.length === 0 ? (
              <div className="card border-0 shadow-sm rounded-4 p-5 text-center my-4 bg-white">
                <i className="bi bi-journal-x text-secondary fs-1 mb-3" />
                <h5 className="fw-bold text-dark mb-1">No Published Results Found</h5>
                <p className="text-muted small mb-0">
                  There are no published term results or broadsheets available yet for {selectedChild ? `${selectedChild.surname} ${selectedChild.firstname}` : "this student"}. Results will be accessible once released by the school administration.
                </p>
              </div>
            ) : (
              <>
                {/* ── Term Result Selector Tabs ── */}
                <div className="d-flex align-items-center gap-2 mb-4 overflow-x-auto pb-2">
                  <span className="small fw-bold text-muted text-uppercase me-2">Terms Available:</span>
                  {results.map((r, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`btn btn-sm rounded-pill px-3 fw-bold ${
                        selectedResultIndex === idx ? "btn-dark" : "btn-outline-secondary"
                      }`}
                      onClick={() => setSelectedResultIndex(idx)}
                    >
                      <i className="bi bi-award-fill me-1 text-warning" />
                      {r.session} · {r.term}
                    </button>
                  ))}
                </div>

                {/* ── KPI Summary Cards for Selected Term ── */}
                {activeResult && (
                  <div className="row g-3 mb-4">
                    <div className="col-sm-6 col-xl-3">
                      <div className="p-stat-card border-start border-primary border-4">
                        <div className="small fw-bold text-uppercase text-muted mb-1">Term Average</div>
                        <div className="fs-3 fw-bold text-primary">{activeResult.average_score}%</div>
                        <div className="small text-muted">{activeResult.class_name || "Enrolled Class"}</div>
                      </div>
                    </div>

                    <div className="col-sm-6 col-xl-3">
                      <div className="p-stat-card border-start border-warning border-4">
                        <div className="small fw-bold text-uppercase text-muted mb-1">Class Position</div>
                        <div className="fs-3 fw-bold text-dark">
                          {activeResult.position || "—"}{" "}
                          <span className="fs-6 fw-normal text-muted">/ {activeResult.total_students || "—"}</span>
                        </div>
                        <div className="small text-muted">Class ranking for this term</div>
                      </div>
                    </div>

                    <div className="col-sm-6 col-xl-3">
                      <div className="p-stat-card border-start border-success border-4">
                        <div className="small fw-bold text-uppercase text-muted mb-1">Subjects Graded</div>
                        <div className="fs-3 fw-bold text-success">{activeResult.subjects_count} Subjects</div>
                        <div className="small text-muted">Total curriculum courses</div>
                      </div>
                    </div>

                    <div className="col-sm-6 col-xl-3">
                      <div className="p-stat-card border-start border-info border-4">
                        <div className="small fw-bold text-uppercase text-muted mb-1">Session & Term</div>
                        <div className="fs-5 fw-bold text-dark">{activeResult.term}</div>
                        <div className="small text-muted">{activeResult.session} Academic Year</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Subject Breakdown Table ── */}
                {activeResult && (
                  <div className="p-res-panel">
                    <div className="p-res-panel-head">
                      <div>
                        <h2 className="fs-6 fw-bold mb-0 text-dark">
                          <i className="bi bi-table me-2 text-primary" />
                          Subject Breakdown — {activeResult.term} ({activeResult.session})
                        </h2>
                        <small className="text-muted">Comprehensive subject assessment & exam scores</small>
                      </div>

                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary rounded-pill px-3 fw-bold"
                          onClick={() => window.print()}
                        >
                          <i className="bi bi-printer-fill me-1" />
                          Print Result Sheet
                        </button>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="p-res-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Subject Name</th>
                            <th>CA Score</th>
                            <th>Exam Score</th>
                            <th>Total (100%)</th>
                            <th>Grade</th>
                            <th>Teacher Remark</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeResult.subjects.map((sub, sIdx) => {
                            const caScore = sub.ca_total ?? (typeof sub.ca === "object" ? Object.values(sub.ca || {}).reduce((a: any, b: any) => Number(a || 0) + Number(b || 0), 0) : sub.ca);
                            const examScore = sub.exam_score ?? sub.exam ?? "—";
                            const totalScore = sub.total_score ?? sub.total ?? "—";

                            return (
                              <tr key={sub.id || sIdx}>
                                <td className="text-muted small">{sIdx + 1}</td>
                                <td className="fw-bold">{sub.subject_name}</td>
                                <td>{caScore !== undefined && caScore !== null ? caScore : "—"}</td>
                                <td>{examScore}</td>
                                <td className="fw-bold fs-6" style={{ color: "#0F2744" }}>{totalScore}</td>
                                <td>{getGradeBadge(sub.grade)}</td>
                                <td className="small text-muted">{sub.remark || "Satisfactory progress"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Teacher & Principal Remarks */}
                    {(activeResult.class_teacher_comment || activeResult.principal_comment) && (
                      <div className="p-4 bg-light border-top">
                        <div className="row g-3">
                          {activeResult.class_teacher_comment && (
                            <div className="col-md-6">
                              <div className="p-3 bg-white rounded-3 border">
                                <div className="small fw-bold text-muted text-uppercase mb-1">
                                  <i className="bi bi-chat-quote-fill me-1 text-primary" />
                                  Class Teacher's Remark
                                </div>
                                <div className="text-dark small fst-italic">"{activeResult.class_teacher_comment}"</div>
                              </div>
                            </div>
                          )}
                          {activeResult.principal_comment && (
                            <div className="col-md-6">
                              <div className="p-3 bg-white rounded-3 border">
                                <div className="small fw-bold text-muted text-uppercase mb-1">
                                  <i className="bi bi-patch-check-fill me-1 text-success" />
                                  Principal's Comment
                                </div>
                                <div className="text-dark small fst-italic">"{activeResult.principal_comment}"</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}
