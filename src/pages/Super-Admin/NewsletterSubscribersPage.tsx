import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import { authApi } from "../../utils/axios";
import { useToast } from "../../contexts/ToastContext";

interface Subscriber {
  id: number;
  email: string;
  status: "subscribed" | "unsubscribed";
  source: string | null;
  ip_address: string | null;
  created_at: string;
  unsubscribed_at: string | null;
}

interface Metrics {
  total: number;
  subscribed: number;
  unsubscribed: number;
  recent_30_days: number;
}

export default function NewsletterSubscribersPage() {
  const { showSuccess, showError } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    total: 0,
    subscribed: 0,
    unsubscribed: 0,
    recent_30_days: 0,
  });

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "subscribed" | "unsubscribed">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Action states
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subscriber | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchSubscribers = async (page = 1, searchQuery = search, status = statusFilter) => {
    setLoading(true);
    try {
      const response = await authApi.get("/superadmin/newsletter-subscribers", {
        params: {
          page,
          search: searchQuery,
          status,
          per_page: 15,
        },
      });

      if (response.data?.status === "success") {
        setSubscribers(response.data.data?.data || []);
        setCurrentPage(response.data.data?.current_page || 1);
        setLastPage(response.data.data?.last_page || 1);
        setTotalRecords(response.data.data?.total || 0);
        if (response.data.metrics) {
          setMetrics(response.data.metrics);
        }
      }
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to load newsletter subscribers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers(1, search, statusFilter);
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSubscribers(1, search, statusFilter);
  };

  const handleToggleStatus = async (sub: Subscriber) => {
    setActionLoading(sub.id);
    try {
      const response = await authApi.patch(`/superadmin/newsletter-subscribers/${sub.id}/toggle-status`);
      showSuccess(response.data?.message || "Subscriber status updated successfully.");
      fetchSubscribers(currentPage, search, statusFilter);
    } catch (err: any) {
      showError(err?.response?.data?.message || "Could not toggle subscriber status.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    try {
      const response = await authApi.delete(`/superadmin/newsletter-subscribers/${deleteTarget.id}`);
      showSuccess(response.data?.message || "Subscriber deleted successfully.");
      setDeleteTarget(null);
      fetchSubscribers(currentPage, search, statusFilter);
    } catch (err: any) {
      showError(err?.response?.data?.message || "Could not delete subscriber.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const response = await authApi.get("/superadmin/newsletter-subscribers/export", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `gradequest_newsletter_subscribers_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showSuccess("Subscribers list exported to CSV successfully.");
    } catch (err: any) {
      showError("Failed to export subscribers.");
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <style>{`
        .gq-ns-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 100%);
          color: #FFFFFF;
          border-radius: 16px;
          padding: 26px 30px;
          margin-bottom: 24px;
          box-shadow: 0 10px 25px -5px rgba(10, 25, 47, 0.25);
          position: relative;
          overflow: hidden;
        }
        .gq-ns-hero::after {
          content: "";
          position: absolute;
          right: -40px;
          bottom: -40px;
          width: 220px;
          height: 220px;
          background: radial-gradient(circle, rgba(251, 191, 36, 0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .gq-kpi-card {
          background: #FFFFFF;
          border-radius: 14px;
          border: 1px solid #E2E8F0;
          padding: 20px 22px;
          box-shadow: 0 4px 12px rgba(15, 39, 68, 0.04);
          transition: all 0.2s ease;
        }
        .gq-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(15, 39, 68, 0.08);
        }
        .gq-table-card {
          background: #FFFFFF;
          border-radius: 16px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 6px 18px rgba(15, 39, 68, 0.05);
          overflow: hidden;
        }
        .gq-table-head {
          background: #F8FAFC;
          border-bottom: 1.5px solid #E2E8F0;
        }
        .gq-table-head th {
          font-size: 11.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #475569;
          padding: 14px 18px;
        }
        .gq-table-body td {
          padding: 16px 18px;
          font-size: 13.5px;
          color: #1E293B;
          border-bottom: 1px solid #F1F5F9;
          vertical-align: middle;
        }
        .gq-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }
        .gq-status-badge.active {
          background: #DCFCE7;
          color: #15803D;
        }
        .gq-status-badge.unsubscribed {
          background: #FEE2E2;
          color: #B91C1C;
        }
        .gq-source-pill {
          background: #F1F5F9;
          color: #475569;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 600;
          font-family: monospace;
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Newsletter Subscribers" />
      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="col-md-9 col-lg-10 ms-auto db-main p-3 p-md-4">
            {loading && !subscribers.length && <Loader message="Loading subscribers list..." />}

            {/* Hero Banner */}
            <div className="gq-ns-hero d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <span className="badge mb-2 px-2.5 py-1" style={{ background: "#FBBF24", color: "#0F2744", fontWeight: 800 }}>
                  Marketing Audience
                </span>
                <h2 className="mb-1 fw-bold" style={{ fontSize: "24px" }}>Newsletter & Platform Subscribers</h2>
                <p className="mb-0 text-white-50" style={{ fontSize: "14px", maxWidth: "600px" }}>
                  Manage leads and visitors who signed up for platform updates via the homepage footer and website widgets.
                </p>
              </div>

              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={exporting || !subscribers.length}
                  className="btn btn-light fw-bold d-inline-flex align-items-center gap-2"
                  style={{ borderRadius: "10px", fontSize: "13.5px", padding: "9px 16px" }}
                >
                  <i className="bi bi-file-earmark-spreadsheet-fill text-success" />
                  {exporting ? "Exporting..." : "Export CSV"}
                </button>

                <Link
                  to="/superadmin/send-message"
                  className="btn btn-warning fw-bold d-inline-flex align-items-center gap-2"
                  style={{ borderRadius: "10px", fontSize: "13.5px", padding: "9px 18px", color: "#0F2744" }}
                >
                  <i className="bi bi-send-fill" />
                  Compose Broadcast
                </Link>
              </div>
            </div>

            {/* KPI Stat Cards */}
            <div className="row g-3 mb-4">
              <div className="col-6 col-lg-3">
                <div className="gq-kpi-card">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-muted fw-bold" style={{ fontSize: "12px", textTransform: "uppercase" }}>Total Subscribers</span>
                    <span className="p-2 rounded-circle" style={{ background: "#EFF6FF", color: "#1D4ED8" }}>
                      <i className="bi bi-envelope-paper-heart" />
                    </span>
                  </div>
                  <h3 className="mb-0 fw-black text-dark">{metrics.total.toLocaleString()}</h3>
                </div>
              </div>

              <div className="col-6 col-lg-3">
                <div className="gq-kpi-card">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-muted fw-bold" style={{ fontSize: "12px", textTransform: "uppercase" }}>Active Subscribed</span>
                    <span className="p-2 rounded-circle" style={{ background: "#DCFCE7", color: "#15803D" }}>
                      <i className="bi bi-check-circle-fill" />
                    </span>
                  </div>
                  <h3 className="mb-0 fw-black text-success">{metrics.subscribed.toLocaleString()}</h3>
                </div>
              </div>

              <div className="col-6 col-lg-3">
                <div className="gq-kpi-card">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-muted fw-bold" style={{ fontSize: "12px", textTransform: "uppercase" }}>Unsubscribed</span>
                    <span className="p-2 rounded-circle" style={{ background: "#FEE2E2", color: "#B91C1C" }}>
                      <i className="bi bi-x-circle-fill" />
                    </span>
                  </div>
                  <h3 className="mb-0 fw-black text-danger">{metrics.unsubscribed.toLocaleString()}</h3>
                </div>
              </div>

              <div className="col-6 col-lg-3">
                <div className="gq-kpi-card">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-muted fw-bold" style={{ fontSize: "12px", textTransform: "uppercase" }}>Last 30 Days</span>
                    <span className="p-2 rounded-circle" style={{ background: "#FEF3C7", color: "#D97706" }}>
                      <i className="bi bi-graph-up-arrow" />
                    </span>
                  </div>
                  <h3 className="mb-0 fw-black text-warning">{metrics.recent_30_days.toLocaleString()}</h3>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="gq-table-card mb-4">
              <div className="p-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-3 bg-white">
                <form onSubmit={handleSearchSubmit} className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: "420px" }}>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0">
                      <i className="bi bi-search text-muted" />
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0 ps-0"
                      placeholder="Search by subscriber email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ fontSize: "13.5px" }}
                    />
                    {search && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary border-start-0"
                        onClick={() => {
                          setSearch("");
                          fetchSubscribers(1, "", statusFilter);
                        }}
                      >
                        <i className="bi bi-x" />
                      </button>
                    )}
                  </div>
                  <button type="submit" className="btn btn-primary fw-bold" style={{ fontSize: "13px", padding: "7px 14px" }}>
                    Search
                  </button>
                </form>

                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted fw-bold" style={{ fontSize: "12.5px" }}>Status:</span>
                  <div className="btn-group" role="group">
                    <button
                      type="button"
                      className={`btn btn-sm ${statusFilter === "all" ? "btn-dark fw-bold" : "btn-outline-secondary"}`}
                      onClick={() => setStatusFilter("all")}
                    >
                      All ({metrics.total})
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${statusFilter === "subscribed" ? "btn-success fw-bold" : "btn-outline-secondary"}`}
                      onClick={() => setStatusFilter("subscribed")}
                    >
                      Active ({metrics.subscribed})
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${statusFilter === "unsubscribed" ? "btn-danger fw-bold" : "btn-outline-secondary"}`}
                      onClick={() => setStatusFilter("unsubscribed")}
                    >
                      Unsubscribed ({metrics.unsubscribed})
                    </button>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="table-responsive">
                <table className="table mb-0">
                  <thead className="gq-table-head">
                    <tr>
                      <th>#</th>
                      <th>Email Address</th>
                      <th>Status</th>
                      <th>Source</th>
                      <th>Subscribed On</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="gq-table-body">
                    {subscribers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-5 text-muted">
                          <i className="bi bi-inbox fs-2 d-block mb-2 text-secondary" />
                          No newsletter subscribers found.
                        </td>
                      </tr>
                    ) : (
                      subscribers.map((sub, idx) => (
                        <tr key={sub.id}>
                          <td className="text-muted fw-bold" style={{ width: "40px" }}>
                            {(currentPage - 1) * 15 + idx + 1}
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <span className="fw-bold" style={{ color: "#0F2744", fontSize: "14px" }}>
                                {sub.email}
                              </span>
                            </div>
                          </td>
                          <td>
                            {sub.status === "subscribed" ? (
                              <span className="gq-status-badge active">
                                <i className="bi bi-check-circle-fill" /> Active Subscribed
                              </span>
                            ) : (
                              <span className="gq-status-badge unsubscribed">
                                <i className="bi bi-x-circle-fill" /> Unsubscribed
                              </span>
                            )}
                          </td>
                          <td>
                            <span className="gq-source-pill">
                              {sub.source || "homepage_footer"}
                            </span>
                          </td>
                          <td className="text-muted" style={{ fontSize: "13px" }}>
                            {formatDate(sub.created_at)}
                          </td>
                          <td className="text-end">
                            <div className="d-inline-flex gap-1">
                              <button
                                type="button"
                                className={`btn btn-sm ${sub.status === "subscribed" ? "btn-outline-warning text-dark" : "btn-outline-success"}`}
                                disabled={actionLoading === sub.id}
                                onClick={() => handleToggleStatus(sub)}
                                title={sub.status === "subscribed" ? "Mark Unsubscribed" : "Reactivate Subscription"}
                                style={{ fontSize: "12px", padding: "4px 8px" }}
                              >
                                {actionLoading === sub.id ? (
                                  <span className="spinner-border spinner-border-sm" />
                                ) : sub.status === "subscribed" ? (
                                  <>
                                    <i className="bi bi-pause-circle" /> Unsubscribe
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-play-circle" /> Reactivate
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                disabled={actionLoading === sub.id}
                                onClick={() => setDeleteTarget(sub)}
                                title="Delete Subscriber"
                                style={{ fontSize: "12px", padding: "4px 8px" }}
                              >
                                <i className="bi bi-trash3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {lastPage > 1 && (
                <div className="p-3 border-top d-flex align-items-center justify-content-between bg-white flex-wrap gap-2">
                  <div className="text-muted" style={{ fontSize: "13px" }}>
                    Showing page <strong>{currentPage}</strong> of <strong>{lastPage}</strong> ({totalRecords} total)
                  </div>
                  <div className="btn-group">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      disabled={currentPage <= 1}
                      onClick={() => fetchSubscribers(currentPage - 1, search, statusFilter)}
                    >
                      <i className="bi bi-chevron-left" /> Previous
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      disabled={currentPage >= lastPage}
                      onClick={() => fetchSubscribers(currentPage + 1, search, statusFilter)}
                    >
                      Next <i className="bi bi-chevron-right" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
              <div
                className="modal fade show d-block"
                tabIndex={-1}
                style={{ background: "rgba(15, 39, 68, 0.6)", backdropFilter: "blur(4px)" }}
              >
                <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content border-0 shadow-lg" style={{ borderRadius: "16px" }}>
                    <div className="modal-header border-0 pb-0">
                      <h5 className="modal-title fw-bold text-danger">
                        <i className="bi bi-exclamation-triangle-fill me-2" />
                        Delete Subscriber
                      </h5>
                      <button type="button" className="btn-close" onClick={() => setDeleteTarget(null)} />
                    </div>
                    <div className="modal-body py-3">
                      <p className="mb-1 text-secondary">
                        Are you sure you want to permanently delete subscriber:
                      </p>
                      <p className="fw-bold text-dark fs-6 mb-0">{deleteTarget.email}</p>
                    </div>
                    <div className="modal-footer border-0 pt-0">
                      <button
                        type="button"
                        className="btn btn-light fw-bold"
                        onClick={() => setDeleteTarget(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger fw-bold"
                        disabled={actionLoading === deleteTarget.id}
                        onClick={handleDelete}
                      >
                        {actionLoading === deleteTarget.id ? "Deleting..." : "Confirm Delete"}
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
