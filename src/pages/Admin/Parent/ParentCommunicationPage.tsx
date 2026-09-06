import { useEffect, useState } from "react";
import { authApi } from "../../../utils/axios";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import PageTitle from "../../../components/PageTitle";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { Link } from "react-router-dom";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

interface CommunicationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  sender: string;
  action_url?: string;
  is_read: boolean;
  date: string;
  time_ago: string;
}

export default function ParentCommunicationPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [communications, setCommunications] = useState<CommunicationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeCategory, setActiveCategory] = useState<"all" | "notice" | "fee_alert" | "academic">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNotice, setSelectedNotice] = useState<CommunicationItem | null>(null);

  const fetchCommunications = async () => {
    try {
      setLoading(true);
      const res = await authApi.get("/parent/communication");
      setCommunications(res.data.communications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (err: any) {
      console.error("Failed to load communications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunications();
  }, []);

  const filteredItems = communications.filter((item) => {
    if (activeCategory === "notice" && item.category !== "notice" && item.category !== "general") return false;
    if (activeCategory === "fee_alert" && item.category !== "fee_alert" && item.type !== "fee") return false;
    if (activeCategory === "academic" && item.category !== "academic") return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q) ||
        item.sender.toLowerCase().includes(q) ||
        item.date.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getCategoryBadge = (item: CommunicationItem) => {
    if (item.type === "fee" || item.category === "fee_alert") {
      return <span className="badge bg-warning-subtle text-warning fw-bold px-2 py-1"><i className="bi bi-cash-stack me-1" />Fee Notice</span>;
    }
    if (item.category === "academic") {
      return <span className="badge bg-primary-subtle text-primary fw-bold px-2 py-1"><i className="bi bi-mortarboard-fill me-1" />Academic Alert</span>;
    }
    return <span className="badge bg-info-subtle text-info fw-bold px-2 py-1"><i className="bi bi-megaphone-fill me-1" />General Announcement</span>;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        .p-comm-main {
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: calc(66px + 24px) 28px 40px !important;
        }

        @media (max-width: 767.98px) {
          .p-comm-main {
            padding: calc(66px + 16px) 14px 36px !important;
          }
        }

        .p-comm-hero {
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
          .p-comm-hero {
            padding: 20px 18px !important;
            border-radius: 14px !important;
            margin-bottom: 16px !important;
          }
        }

        .p-comm-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }

        .p-comm-hero-glow {
          position: absolute;
          top: -40px;
          right: -40px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.2) 0%, transparent 65%);
          pointer-events: none;
        }

        .p-comm-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
        }

        .p-comm-badge {
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

        .p-comm-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 6px #10B981;
        }

        .p-comm-title {
          font-size: 26px;
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.1;
          margin-bottom: 8px;
        }

        .p-comm-title em {
          font-style: normal;
          color: #FBBF24;
        }

        .p-comm-sub {
          font-size: 13.5px;
          color: #CBD5E1;
          line-height: 1.6;
          max-width: 620px;
          margin-bottom: 0;
        }

        @media (max-width: 767.98px) {
          .p-comm-title {
            font-size: 20px !important;
          }
          .p-comm-sub {
            font-size: 12.5px !important;
          }
        }

        /* Notice Card */
        .p-notice-card {
          background: #FFFFFF;
          border: 1px solid rgba(15, 39, 68, 0.08);
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 16px;
          box-shadow: 0 2px 8px rgba(15, 39, 68, 0.04);
          transition: all 0.2s ease;
          position: relative;
        }

        .p-notice-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(15, 39, 68, 0.08);
          border-color: #CBD5E1;
        }

        .p-notice-card.unread {
          border-left: 4px solid #F59E0B;
          background: #FCFDFE;
        }

        .p-notice-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          color: #64748B;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .p-notice-title {
          font-size: 16px;
          font-weight: 700;
          color: #0F2744;
          margin-bottom: 8px;
        }

        .p-notice-body {
          font-size: 14px;
          color: #334155;
          line-height: 1.6;
          margin-bottom: 12px;
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Communication & Broadcasts - GradiosEdu" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto gq-app-main p-comm-main d-flex flex-column min-vh-100">
            {loading && <Loader message="Loading announcements and notices..." />}

            {/* ── Signature Hero Banner ── */}
            <div className="p-comm-hero">
              <div className="p-comm-hero-glow" />
              <div className="p-comm-hero-inner">
                <div>
                  <div className="p-comm-badge">
                    <span className="p-comm-dot" />
                    Parent Portal · Communication Center
                  </div>
                  <h1 className="p-comm-title">
                    {getGreeting()}, <em>Parent.</em>
                  </h1>
                  <p className="p-comm-sub">
                    Stay informed with official school announcements, administrative circulars, fee billing reminders, and academic notifications.
                  </p>
                </div>

                {unreadCount > 0 && (
                  <div className="badge bg-warning text-dark p-2 px-3 fw-bold rounded-pill">
                    <i className="bi bi-bell-fill me-1" />
                    {unreadCount} Unread Notice{unreadCount > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>

            {/* ── Filter Bar & Search Toolbar ── */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
              <div className="btn-group">
                <button
                  type="button"
                  className={`btn btn-sm ${activeCategory === "all" ? "btn-dark" : "btn-outline-secondary"}`}
                  onClick={() => setActiveCategory("all")}
                >
                  All Notices ({communications.length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${activeCategory === "notice" ? "btn-dark" : "btn-outline-secondary"}`}
                  onClick={() => setActiveCategory("notice")}
                >
                  Announcements
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${activeCategory === "fee_alert" ? "btn-dark" : "btn-outline-secondary"}`}
                  onClick={() => setActiveCategory("fee_alert")}
                >
                  Fee Alerts
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${activeCategory === "academic" ? "btn-dark" : "btn-outline-secondary"}`}
                  onClick={() => setActiveCategory("academic")}
                >
                  Academic
                </button>
              </div>

              <div className="d-flex gap-2 align-items-center">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  style={{ maxWidth: 240, borderRadius: 8 }}
                  placeholder="Search notices, senders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                  onClick={fetchCommunications}
                >
                  <i className="bi bi-arrow-clockwise" />
                  Refresh
                </button>
              </div>
            </div>

            {/* ── Notices Feed ── */}
            {filteredItems.length === 0 ? (
              <div className="card border-0 shadow-sm rounded-4 p-5 text-center my-4 bg-white">
                <i className="bi bi-chat-square-dots text-secondary fs-1 mb-3" />
                <h5 className="fw-bold text-dark mb-1">No Announcements or Messages Found</h5>
                <p className="text-muted small mb-0">
                  You are all caught up! New notices and school circulars will appear here as soon as they are published.
                </p>
              </div>
            ) : (
              <div className="row">
                <div className="col-12">
                  {filteredItems.map((item) => (
                    <div key={item.id} className={`p-notice-card ${!item.is_read ? "unread" : ""}`}>
                      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                        <div className="p-notice-meta">
                          {getCategoryBadge(item)}
                          <span className="fw-semibold text-dark">
                            <i className="bi bi-person-fill me-1 text-muted" />
                            {item.sender}
                          </span>
                          <span>•</span>
                          <span>{item.date} ({item.time_ago})</span>
                        </div>

                        {!item.is_read && (
                          <span className="badge bg-warning text-dark fw-bold" style={{ fontSize: "11px" }}>
                            New
                          </span>
                        )}
                      </div>

                      <h3 className="p-notice-title">{item.title}</h3>
                      <p className="p-notice-body">{item.message}</p>

                      <div className="d-flex align-items-center gap-2 mt-3 pt-2 border-top">
                        {item.action_url ? (
                          <Link to={item.action_url} className="btn btn-sm btn-primary rounded-pill px-3 fw-bold">
                            View Related Page <i className="bi bi-arrow-right ms-1" />
                          </Link>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                            onClick={() => setSelectedNotice(item)}
                          >
                            Read Full Details
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Notice Detail Modal ── */}
            {selectedNotice && (
              <div className="modal show d-block gq-modal-backdrop" style={{ background: "rgba(15, 39, 68, 0.55)", backdropFilter: "blur(4px)" }}>
                <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
                    <div className="modal-header text-white" style={{ background: "linear-gradient(135deg, #0A192F 0%, #0F2744 100%)" }}>
                      <h5 className="modal-title fw-bold fs-6">
                        <i className="bi bi-info-circle me-2 text-warning" />
                        Notice Details
                      </h5>
                      <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedNotice(null)} />
                    </div>
                    <div className="modal-body p-4">
                      <div className="mb-3">{getCategoryBadge(selectedNotice)}</div>
                      <h4 className="fw-bold text-dark mb-2">{selectedNotice.title}</h4>
                      <div className="small text-muted mb-3">
                        From: <strong>{selectedNotice.sender}</strong> · {selectedNotice.date}
                      </div>
                      <div className="p-3 bg-light rounded-3 text-dark mb-3" style={{ lineHeight: 1.7, fontSize: 14 }}>
                        {selectedNotice.message}
                      </div>
                    </div>
                    <div className="modal-footer bg-light">
                      <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setSelectedNotice(null)}>
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}
