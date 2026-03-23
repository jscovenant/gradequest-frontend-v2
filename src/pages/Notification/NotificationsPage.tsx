import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import { useToast } from "../../contexts/ToastContext";
import PageTitle from "../../components/PageTitle";

import {
  getAllNotifications,
  getUnreadNotifications,
  markNotificationRead,
  type SystemNote,
} from "../../api/notificationsApi";

type TabKey = "unread" | "all";

function badgeStyle(type?: string) {
  const t = (type || "info").toLowerCase();
  if (t === "success") return { bg: "rgba(16,185,129,0.14)", fg: "#065f46", bd: "rgba(16,185,129,0.25)" };
  if (t === "warning") return { bg: "rgba(245,158,11,0.14)", fg: "#92400e", bd: "rgba(245,158,11,0.25)" };
  if (t === "danger" || t === "error") return { bg: "rgba(239,68,68,0.14)", fg: "#991b1b", bd: "rgba(239,68,68,0.25)" };
  return { bg: "rgba(59,130,246,0.14)", fg: "#1e40af", bd: "rgba(59,130,246,0.25)" };
}

function iconForType(type?: string) {
  const t = (type || "info").toLowerCase();
  if (t === "success") return "bi-check-circle-fill";
  if (t === "warning") return "bi-exclamation-triangle-fill";
  if (t === "danger" || t === "error") return "bi-x-circle-fill";
  return "bi-info-circle-fill";
}

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [tab, setTab] = useState<TabKey>("unread");
  const [loading, setLoading] = useState(true);

  const [unread, setUnread] = useState<SystemNote[]>([]);
  const [all, setAll] = useState<SystemNote[]>([]);

  const visible = useMemo(() => (tab === "unread" ? unread : all), [tab, unread, all]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [u, a] = await Promise.all([getUnreadNotifications(), getAllNotifications()]);
      setUnread(u);
      setAll(a);
    } catch (e: any) {
      showToast(e?.response?.data?.message || "Failed to load notifications.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markReadLocal = (id: string) => {
    // remove from unread
    setUnread((prev) => prev.filter((n) => n.id !== id));
    // update all list read_at (optimistic)
    setAll((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n))
    );
  };

  const handleOpen = async (note: SystemNote) => {
    try {
      // mark read if needed
      if (tab === "unread" || !note.read_at) {
        await markNotificationRead(note.id);
        markReadLocal(note.id);
      }

      // open action_url if exists
      if (note.action_url) {
        if (isExternalUrl(note.action_url)) {
          window.open(note.action_url, "_blank", "noopener,noreferrer");
        } else {
          // treat as internal route e.g. /results/pins
          navigate(note.action_url);
        }
      }
    } catch (e: any) {
      showToast(e?.response?.data?.message || "Failed to open notification.", "error");
    }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      markReadLocal(id);
      showToast("Marked as read ✅", "success");
    } catch (e: any) {
      showToast(e?.response?.data?.message || "Failed to mark as read.", "error");
    }
  };

  const handleMarkVisibleRead = async () => {
    if (tab !== "unread") return;

    const ids = unread.map((n) => n.id);
    if (ids.length === 0) return;

    // batch sequential to avoid backend changes; works with your existing route
    try {
      for (const id of ids) {
        // eslint-disable-next-line no-await-in-loop
        await markNotificationRead(id);
        markReadLocal(id);
      }
      showToast("All unread notifications marked as read ✅", "success");
    } catch (e: any) {
      showToast(e?.response?.data?.message || "Failed to mark all as read.", "error");
    }
  };

  return (
    <>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Notifications" />
      <PageTitle title="Notifiactions" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto px-4 d-flex flex-column min-vh-100" style={{ backgroundColor: "#f8f9fa" }}>
            {loading && <Loader message="Loading notifications..." />}

            <div className="pt-4 pb-2 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div>
                <h4 className="mb-1" style={{ fontWeight: 900 }}>
                  Notifications
                </h4>
                <div className="text-muted" style={{ fontSize: "0.95rem" }}>
                  System updates and activity alerts for your account.
                </div>
              </div>

              <div className="d-flex gap-2 flex-wrap">
                <button className="btn btn-outline-secondary btn-sm" onClick={fetchAll} disabled={loading} style={{ borderRadius: 10 }}>
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Refresh
                </button>

                {tab === "unread" && (
                  <button className="btn btn-primary btn-sm" onClick={handleMarkVisibleRead} disabled={loading || unread.length === 0} style={{ borderRadius: 10 }}>
                    <i className="bi bi-check2-all me-1"></i>
                    Mark all as read
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="d-flex gap-2 mt-2">
              <button
                className={`btn btn-sm ${tab === "unread" ? "btn-primary" : "btn-outline-primary"}`}
                style={{ borderRadius: 10 }}
                onClick={() => setTab("unread")}
              >
                Unread <span className="badge ms-2" style={{ background: "rgba(255,255,255,0.25)" }}>{unread.length}</span>
              </button>

              <button
                className={`btn btn-sm ${tab === "all" ? "btn-primary" : "btn-outline-primary"}`}
                style={{ borderRadius: 10 }}
                onClick={() => setTab("all")}
              >
                All <span className="badge ms-2" style={{ background: "rgba(255,255,255,0.25)" }}>{all.length}</span>
              </button>
            </div>

            {/* List */}
            <div className="mt-3">
              {visible.length === 0 ? (
                <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-bell-slash" style={{ fontSize: 22, color: "#64748b" }}></i>
                      <div>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>No notifications</div>
                        <div className="text-muted" style={{ fontSize: "0.9rem" }}>
                          {tab === "unread" ? "You're all caught up." : "Nothing to show yet."}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
                  <div className="card-body p-0">
                    {visible.map((note, idx) => {
                      const bs = badgeStyle(note.type);
                      const isRead = !!note.read_at;

                      return (
                        <div
                          key={note.id}
                          className="px-3 px-md-4 py-3 d-flex align-items-start justify-content-between gap-3"
                          style={{
                            borderBottom: idx === visible.length - 1 ? "none" : "1px solid #f1f5f9",
                            background: tab === "unread" ? "rgba(99,102,241,0.03)" : isRead ? "#fff" : "rgba(99,102,241,0.03)",
                            cursor: "pointer",
                          }}
                          onClick={() => handleOpen(note)}
                        >
                          <div className="d-flex gap-3" style={{ minWidth: 0, flex: 1 }}>
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center"
                              style={{
                                width: 40,
                                height: 40,
                                background: bs.bg,
                                border: `1px solid ${bs.bd}`,
                                flexShrink: 0,
                              }}
                            >
                              <i className={`bi ${iconForType(note.type)}`} style={{ color: bs.fg }}></i>
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div className="d-flex align-items-center gap-2 flex-wrap">
                                <span
                                  className="badge"
                                  style={{
                                    background: bs.bg,
                                    color: bs.fg,
                                    border: `1px solid ${bs.bd}`,
                                    fontWeight: 700,
                                  }}
                                >
                                  {(note.type || "info").toUpperCase()}
                                </span>

                                {!isRead && tab === "all" && (
                                  <span className="badge" style={{ background: "rgba(239,68,68,0.12)", color: "#991b1b", border: "1px solid rgba(239,68,68,0.2)" }}>
                                    UNREAD
                                  </span>
                                )}

                                {note.action_url && (
                                  <span className="badge" style={{ background: "rgba(2,6,23,0.06)", color: "#0f172a", border: "1px solid rgba(2,6,23,0.10)" }}>
                                    Action
                                  </span>
                                )}
                              </div>

                              <div className="mt-1" style={{ fontWeight: 700, color: "#0f172a", wordBreak: "break-word" }}>
                                {note.message}
                              </div>

                              <div className="text-muted mt-1" style={{ fontSize: "0.85rem" }}>
                                {note.time}
                              </div>
                            </div>
                          </div>

                          <div className="d-flex flex-column align-items-end gap-2" style={{ flexShrink: 0 }}>
                            {(tab === "unread" || (!isRead && tab === "all")) && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                style={{ borderRadius: 10 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkOneRead(note.id);
                                }}
                              >
                                Mark read
                              </button>
                            )}

                            <i className="bi bi-chevron-right" style={{ color: "#94a3b8" }}></i>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto">
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}