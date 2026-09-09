import { useEffect, useState } from "react";
import { authApi } from "../../../utils/axios";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import PageTitle from "../../../components/PageTitle";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

interface TermInfo {
  id: number;
  name: string;
  start_date?: string;
  end_date?: string;
  status: string;
}

interface SessionInfo {
  id: number;
  name: string;
  status: string;
}

interface SchoolProfile {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string;
  motto?: string;
}

interface AcademicCalendarData {
  current_session: string;
  current_term: string;
  terms: TermInfo[];
  sessions: SessionInfo[];
}

export default function ParentSchoolInfoPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<SchoolProfile | null>(null);
  const [calendar, setCalendar] = useState<AcademicCalendarData | null>(null);

  const fetchSchoolInfo = async () => {
    try {
      setLoading(true);
      const res = await authApi.get("/parent/school-info");
      setSchool(res.data.school);
      setCalendar(res.data.academic_calendar);
    } catch (err: any) {
      console.error("Failed to load school information", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchoolInfo();
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        .p-info-main {
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: calc(66px + 24px) 28px 40px !important;
        }

        @media (max-width: 767.98px) {
          .p-info-main {
            padding: calc(66px + 16px) 14px 36px !important;
          }
        }

        .p-info-hero {
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
          .p-info-hero {
            padding: 20px 18px !important;
            border-radius: 14px !important;
            margin-bottom: 16px !important;
          }
        }

        .p-info-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }

        .p-info-hero-glow {
          position: absolute;
          top: -40px;
          right: -40px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.2) 0%, transparent 65%);
          pointer-events: none;
        }

        .p-info-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
        }

        .p-info-badge {
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

        .p-info-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 6px #10B981;
        }

        .p-info-title {
          font-size: 26px;
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.1;
          margin-bottom: 8px;
        }

        .p-info-title em {
          font-style: normal;
          color: #FBBF24;
        }

        .p-info-sub {
          font-size: 13.5px;
          color: #CBD5E1;
          line-height: 1.6;
          max-width: 620px;
          margin-bottom: 0;
        }

        @media (max-width: 767.98px) {
          .p-info-title {
            font-size: 20px !important;
          }
          .p-info-sub {
            font-size: 12.5px !important;
          }
        }

        /* Panels */
        .p-info-panel {
          background: #FFFFFF;
          border: 1px solid rgba(15, 39, 68, 0.08);
          border-radius: 18px;
          box-shadow: 0 4px 20px rgba(15, 39, 68, 0.06);
          overflow: hidden;
          margin-bottom: 24px;
        }

        .p-info-panel-head {
          padding: 18px 24px;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #FAFCFF;
        }

        .p-term-card {
          border: 1.5px solid #E2E8F0;
          border-radius: 14px;
          padding: 18px;
          transition: all 0.2s ease;
          background: #FFFFFF;
        }

        .p-term-card.active {
          border-color: #10B981;
          background: #F0FDF4;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.12);
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="School Information & Calendar - SchoolProfit" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto gq-app-main p-info-main d-flex flex-column min-vh-100">
            {loading && <Loader message="Loading academic calendar & school info..." />}

            {/* ── Signature Hero ── */}
            <div className="p-info-hero">
              <div className="p-info-hero-glow" />
              <div className="p-info-hero-inner">
                <div>
                  <div className="p-info-badge">
                    <span className="p-info-dot" />
                    Parent Portal · School Information & Calendar
                  </div>
                  <h1 className="p-info-title">
                    {school?.name || "School Directory"}, <em>Calendar</em>
                  </h1>
                  <p className="p-info-sub">
                    View active academic sessions, term milestones, holiday schedules, examination timelines, and school contact details.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Active Academic Period Card ── */}
            {calendar && (
              <div className="row g-3 mb-4">
                <div className="col-md-6 col-lg-4">
                  <div className="p-info-panel p-4 h-100">
                    <div className="d-flex align-items-center gap-3">
                      <div className="p-3 bg-primary-subtle text-primary rounded-3 fs-3">
                        <i className="bi bi-calendar3" />
                      </div>
                      <div>
                        <span className="small text-muted fw-bold text-uppercase">Active Session</span>
                        <h4 className="fw-bold text-dark mb-0">{calendar.current_session}</h4>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-6 col-lg-4">
                  <div className="p-info-panel p-4 h-100">
                    <div className="d-flex align-items-center gap-3">
                      <div className="p-3 bg-success-subtle text-success rounded-3 fs-3">
                        <i className="bi bi-bookmark-check" />
                      </div>
                      <div>
                        <span className="small text-muted fw-bold text-uppercase">Current Term</span>
                        <h4 className="fw-bold text-dark mb-0">{calendar.current_term}</h4>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-12 col-lg-4">
                  <div className="p-info-panel p-4 h-100">
                    <div className="d-flex align-items-center gap-3">
                      <div className="p-3 bg-warning-subtle text-warning rounded-3 fs-3">
                        <i className="bi bi-clock-history" />
                      </div>
                      <div>
                        <span className="small text-muted fw-bold text-uppercase">Portal Status</span>
                        <h4 className="fw-bold text-dark mb-0 text-success">
                          <i className="bi bi-circle-fill me-1 small" style={{ fontSize: 10 }} />
                          Online & Synchronized
                        </h4>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Terms & Milestones ── */}
            <div className="row g-4 mb-4">
              <div className="col-lg-8">
                <div className="p-info-panel h-100 mb-0">
                  <div className="p-info-panel-head">
                    <h2 className="fs-6 fw-bold mb-0 text-dark">
                      <i className="bi bi-calendar2-range me-2 text-primary" />
                      Academic Terms & Schedules
                    </h2>
                    <span className="badge bg-primary-subtle text-primary fw-bold">Active Year</span>
                  </div>
                  <div className="p-4">
                    <div className="row g-3">
                      {calendar?.terms && calendar.terms.length > 0 ? (
                        calendar.terms.map((term) => {
                          const isActive = term.status === "active" || term.name === calendar.current_term;
                          return (
                            <div key={term.id} className="col-12">
                              <div className={`p-term-card ${isActive ? "active" : ""}`}>
                                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="fw-bold fs-6 text-dark">{term.name}</span>
                                    {isActive && (
                                      <span className="badge bg-success fw-bold px-2 py-1">Current Active Term</span>
                                    )}
                                  </div>
                                </div>
                                <div className="row g-2 text-muted small mt-1">
                                  <div className="col-sm-6">
                                    <i className="bi bi-calendar-event me-1 text-primary" />
                                    Start Date: <strong>{term.start_date || "Set by School"}</strong>
                                  </div>
                                  <div className="col-sm-6">
                                    <i className="bi bi-calendar-check me-1 text-success" />
                                    Closing Date: <strong>{term.end_date || "Set by School"}</strong>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="col-12 text-center py-4 text-muted">
                          <i className="bi bi-calendar-x fs-1 d-block mb-2" />
                          No term breakdown currently configured.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── School Contact & Directory ── */}
              <div className="col-lg-4">
                <div className="p-info-panel h-100 mb-0">
                  <div className="p-info-panel-head">
                    <h2 className="fs-6 fw-bold mb-0 text-dark">
                      <i className="bi bi-building me-2 text-primary" />
                      School Information
                    </h2>
                  </div>
                  <div className="p-4">
                    <div className="text-center mb-4">
                      {school?.logo ? (
                        <img src={school.logo} alt="School Logo" className="rounded-circle mb-2" style={{ width: 70, height: 70, objectFit: "cover" }} />
                      ) : (
                        <div className="rounded-circle bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center mb-2" style={{ width: 70, height: 70 }}>
                          <i className="bi bi-mortarboard-fill fs-2" />
                        </div>
                      )}
                      <h5 className="fw-bold text-dark mb-1">{school?.name || "School Campus"}</h5>
                      <p className="text-muted small fst-italic mb-0">{school?.motto || "Dedicated to academic excellence"}</p>
                    </div>

                    <div className="border-top pt-3">
                      <div className="d-flex align-items-start gap-2 mb-3">
                        <i className="bi bi-geo-alt-fill text-danger mt-1" />
                        <div className="small">
                          <div className="text-muted">Campus Address</div>
                          <div className="fw-semibold text-dark">{school?.address || "Main Campus"}</div>
                        </div>
                      </div>

                      {school?.phone && (
                        <div className="d-flex align-items-start gap-2 mb-3">
                          <i className="bi bi-telephone-fill text-success mt-1" />
                          <div className="small">
                            <div className="text-muted">Administrative Helpline</div>
                            <div className="fw-semibold text-dark">{school.phone}</div>
                          </div>
                        </div>
                      )}

                      {school?.email && (
                        <div className="d-flex align-items-start gap-2 mb-3">
                          <i className="bi bi-envelope-fill text-primary mt-1" />
                          <div className="small">
                            <div className="text-muted">Official Email</div>
                            <div className="fw-semibold text-dark">{school.email}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}
