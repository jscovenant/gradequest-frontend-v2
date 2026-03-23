import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, logout } from "../../utils/token";
import { getUnreadNotifications, markNotificationRead, type SystemNote } from "../../api/notificationsApi";
import {
  getUnreadInvoiceNotifications,
  markInvoiceNotificationRead,
  type InvoiceNote,
} from "../../api/invoiceNotificationsApi";

interface TopNavProps {
  sidebarOpen?: boolean;
  setSidebarOpen?: (value: boolean) => void;
  toggleSidebar?: () => void;
  title?: string;
}

function invoiceBadgeStyle(status?: string) {
  const s = (status || "").toLowerCase();
  if (s === "paid") return { bg: "#dcfce7", fg: "#16a34a", icon: "bi-check-circle" };
  if (s === "overdue") return { bg: "#fee2e2", fg: "#dc2626", icon: "bi-exclamation-octagon" };
  return { bg: "#fef3c7", fg: "#d97706", icon: "bi-receipt" }; // pending/default
}

function resolveInvoiceFromNote(note: InvoiceNote) {
  const inv = note.invoice ?? note.meta?.invoice ?? note.meta ?? {};
  return inv as any;
}

function badgeStyle(type?: string) {
  const t = (type || "info").toLowerCase();
  if (t === "success") return { bg: "#dcfce7", fg: "#16a34a", icon: "bi-check-circle" };
  if (t === "warning") return { bg: "#fef3c7", fg: "#d97706", icon: "bi-exclamation-triangle" };
  if (t === "danger" || t === "error") return { bg: "#fee2e2", fg: "#dc2626", icon: "bi-x-circle" };
  return { bg: "#dbeafe", fg: "#2563eb", icon: "bi-info-circle" };
}

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}



export default function TopNav({ sidebarOpen = true, setSidebarOpen, toggleSidebar, title }: TopNavProps) {
  const navigate = useNavigate();

    // invoice notifications
  const [invLoading, setInvLoading] = useState(false);
  const [invNotes, setInvNotes] = useState<InvoiceNote[]>([]);
  const invUnreadCount = useMemo(() => invNotes.length, [invNotes]);

  
  const loadUnreadInvoiceNotifications = async () => {
  if (!isParent) return;
  setInvLoading(true);
  try {
    const data = await getUnreadInvoiceNotifications();
    setInvNotes(data);
  } catch {
    setInvNotes([]);
  } finally {
    setInvLoading(false);
  }
};

   




    const handleOpenInvoiceNotification = async (note: InvoiceNote) => {
    // optimistic remove
    setInvNotes((prev) => prev.filter((n) => n.id !== note.id));

    try {
      await markInvoiceNotificationRead(note.id);
    } catch {
      setInvNotes((prev) => [note, ...prev].slice(0, 10));
      return;
    }

    // Navigate to invoice notification detail page
    navigate(`/invoice-notifications/${note.id}`);
  };

  const [user, setUser] = useState<{
    firstname: string;
    role: string;
    email: string;
    photo_url?: string;
  } | null>(null);

  const [imageError, setImageError] = useState(false);

 const isParent = (user?.role || "") === "Parent";


  useEffect(() => {
  if (!isParent) return;
  loadUnreadInvoiceNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isParent]);

  // notifications
  const [notesLoading, setNotesLoading] = useState(false);
  const [notes, setNotes] = useState<SystemNote[]>([]);
  const unreadCount = useMemo(() => notes.length, [notes]);

  useEffect(() => {
    const currentUser = getUser();
    if (currentUser) setUser(currentUser);
  }, []);

  useEffect(() => {
    setImageError(false);
  }, [user?.photo_url]);

  const handleLogout = () => {
    logout();
  };

  const getInitials = (fullName: string) => {
    if (!fullName) return "U";
    const names = fullName.trim().split(" ");
    if (names.length === 1) return names[0][0].toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const loadUnreadNotifications = async () => {
    setNotesLoading(true);
    try {
      const data = await getUnreadNotifications(); // unread (10)
      setNotes(data);
    } catch {
      // do not toast here to avoid noisy UX on every nav render
      setNotes([]);
    } finally {
      setNotesLoading(false);
    }
  };

  useEffect(() => {
    loadUnreadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenNotification = async (note: SystemNote) => {
    // optimistic: remove instantly
    setNotes((prev) => prev.filter((n) => n.id !== note.id));

    try {
      await markNotificationRead(note.id);
    } catch {
      // rollback if it fails
      setNotes((prev) => [note, ...prev].slice(0, 10));
      return;
    }

    // navigate/open action
    if (note.action_url) {
      if (isExternalUrl(note.action_url)) {
        window.open(note.action_url, "_blank", "noopener,noreferrer");
      } else {
        navigate(note.action_url);
      }
    }
  };

  return (
    <nav
      className="navbar bg-white shadow-sm px-3 d-flex justify-content-between align-items-center"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1030,
        height: "64px",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      {/* LEFT: Toggle + Title */}
      <div className="d-flex align-items-center gap-3">
        <button
          className="btn btn-light d-md-none border-0"
          onClick={() => {
            if (toggleSidebar) return toggleSidebar();
            if (setSidebarOpen) return setSidebarOpen(!sidebarOpen);
          }}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f3f4f6";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#f9fafb";
          }}
        >
          <i className="bi bi-list fs-5"></i>
        </button>

        <div className="d-none d-md-block">
          <h5 className="mb-0 fw-bold" style={{ color: "#1e293b" }}>
            {title ?? "Dashboard"}
          </h5>
        </div>
      </div>

      {/* RIGHT: Search, Notifications + Profile */}
      <div className="d-flex align-items-center gap-2 gap-md-3">
     

        {/* Notifications */}
        <div className="dropdown">
          <button
            className="btn btn-light border-0 position-relative"
            data-bs-toggle="dropdown"
            onClick={() => loadUnreadNotifications()}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f3f4f6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f9fafb";
            }}
            aria-label="Notifications"
          >
            <i className="bi bi-bell" style={{ fontSize: "1.1rem" }}></i>

            {unreadCount > 0 && (
              <span
                className="position-absolute badge rounded-pill"
                style={{
                  top: "6px",
                  right: "6px",
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  fontSize: "0.65rem",
                  padding: "2px 5px",
                  border: "2px solid #fff",
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          <ul
            className="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-2"
            style={{
              borderRadius: "12px",
              minWidth: "320px",
              maxHeight: "420px",
              overflowY: "auto",
            }}
          >
            {/* Header */}
            <li className="px-3 py-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-semibold" style={{ fontSize: "0.9rem" }}>
                  Notifications
                </h6>
                <span
                  className="badge"
                  style={{
                    backgroundColor: "#dbeafe",
                    color: "#1e40af",
                    fontSize: "0.7rem",
                    padding: "4px 8px",
                  }}
                >
                  {notesLoading ? "..." : `${unreadCount} New`}
                </span>
              </div>
            </li>

            {/* Body */}
            {notesLoading ? (
              <li className="px-3 py-3 text-muted" style={{ fontSize: "0.85rem" }}>
                Loading...
              </li>
            ) : notes.length === 0 ? (
              <li className="px-3 py-3 text-muted" style={{ fontSize: "0.85rem" }}>
                You have no unread notifications.
              </li>
            ) : (
              notes.map((note) => {
                const st = badgeStyle(note.type);
                return (
                  <li key={note.id}>
                    <button
                      type="button"
                      className="dropdown-item py-3"
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        transition: "background 0.2s ease",
                        whiteSpace: "normal",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                      onClick={() => handleOpenNotification(note)}
                    >
                      <div className="d-flex gap-3">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center"
                          style={{
                            width: "40px",
                            height: "40px",
                            backgroundColor: st.bg,
                            flexShrink: 0,
                          }}
                        >
                          <i className={`bi ${st.icon}`} style={{ color: st.fg }}></i>
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="mb-1 fw-semibold" style={{ fontSize: "0.85rem", wordBreak: "break-word" }}>
                            {note.message}
                          </p>
                          <small className="text-muted" style={{ fontSize: "0.75rem" }}>
                            {note.time}
                          </small>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })
            )}

            {/* Footer */}
            <li>
              <Link
                className="dropdown-item text-center py-2"
                to="/notifications"
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  color: "#6366f1",
                }}
              >
                View all notifications
              </Link>
            </li>
          </ul>
        </div>

                {/* Invoice Notifications */}
                {isParent && (
                  <div className="dropdown">
          <button
            className="btn btn-light border-0 position-relative"
            data-bs-toggle="dropdown"
            onClick={() => loadUnreadInvoiceNotifications()}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#f9fafb")}
            aria-label="Invoice notifications"
            title="Invoices"
          >
            <i className="bi bi-receipt" style={{ fontSize: "1.1rem" }} />

            {invUnreadCount > 0 && (
              <span
                className="position-absolute badge rounded-pill"
                style={{
                  top: "6px",
                  right: "6px",
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  fontSize: "0.65rem",
                  padding: "2px 5px",
                  border: "2px solid #fff",
                }}
              >
                {invUnreadCount > 99 ? "99+" : invUnreadCount}
              </span>
            )}
          </button>

          <ul
            className="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-2"
            style={{
              borderRadius: "12px",
              minWidth: "340px",
              maxHeight: "420px",
              overflowY: "auto",
            }}
          >
            <li className="px-3 py-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-semibold" style={{ fontSize: "0.9rem" }}>
                  Invoices
                </h6>
                <span
                  className="badge"
                  style={{
                    backgroundColor: "#fef3c7",
                    color: "#92400e",
                    fontSize: "0.7rem",
                    padding: "4px 8px",
                  }}
                >
                  {invLoading ? "..." : `${invUnreadCount} New`}
                </span>
              </div>
            </li>

            {invLoading ? (
              <li className="px-3 py-3 text-muted" style={{ fontSize: "0.85rem" }}>
                Loading...
              </li>
            ) : invNotes.length === 0 ? (
              <li className="px-3 py-3 text-muted" style={{ fontSize: "0.85rem" }}>
                No new invoice notifications.
              </li>
            ) : (
              invNotes.map((note) => {
                const inv = resolveInvoiceFromNote(note);
                const st = invoiceBadgeStyle(inv?.status);
                const amount = inv?.amount != null ? `${inv?.currency || "₦"}${inv.amount}` : "";
                const invoiceNo = inv?.invoice_no || inv?.reference || inv?.id || "";

                return (
                  <li key={note.id}>
                    <button
                      type="button"
                      className="dropdown-item py-3"
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        transition: "background 0.2s ease",
                        whiteSpace: "normal",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      onClick={() => handleOpenInvoiceNotification(note)}
                    >
                      <div className="d-flex gap-3">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center"
                          style={{
                            width: "40px",
                            height: "40px",
                            backgroundColor: st.bg,
                            flexShrink: 0,
                          }}
                        >
                          <i className={`bi ${st.icon}`} style={{ color: st.fg }} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="mb-1 fw-semibold" style={{ fontSize: "0.85rem", wordBreak: "break-word" }}>
                            {note.message}
                          </p>
                          <small className="text-muted" style={{ fontSize: "0.75rem" }}>
                            {invoiceNo ? `Invoice: ${invoiceNo} • ` : ""}
                            {amount ? `${amount} • ` : ""}
                            {note.time || note.created_at || ""}
                          </small>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })
            )}

            <li>
              <Link
                className="dropdown-item text-center py-2"
                to="/invoice-notifications"
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  color: "#d97706",
                }}
              >
                View all invoices
              </Link>
            </li>
          </ul>
        </div>
                ) }
        


        {/* Profile */}
        <div className="dropdown">
          <button
            className="btn btn-light border-0 d-flex align-items-center gap-2 px-2 px-md-3"
            data-bs-toggle="dropdown"
            style={{
              height: "40px",
              borderRadius: "8px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f3f4f6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f9fafb";
            }}
          >
            {user?.photo_url && !imageError ? (
              <img
                src={user.photo_url}
                alt={user.firstname}
                className="rounded-circle"
                style={{ width: 32, height: 32, objectFit: "cover" }}
                onError={handleImageError}
              />
            ) : (
              <div
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{
                  width: 32,
                  height: 32,
                  fontSize: 14,
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "#fff",
                }}
              >
                {user ? getInitials(user.firstname) : "U"}
              </div>
            )}
            <span className="d-none d-md-inline fw-semibold" style={{ fontSize: "0.875rem" }}>
              {user?.firstname || "User"}
            </span>
            <i className="bi bi-chevron-down d-none d-md-inline" style={{ fontSize: "0.75rem" }}></i>
          </button>

          <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-2" style={{ borderRadius: "12px", minWidth: "240px" }}>
            <li className="px-3 py-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
              <div>
                <p className="mb-0 fw-semibold" style={{ fontSize: "0.9rem" }}>
                  {user?.firstname || "User"}
                </p>
                <small className="text-muted" style={{ fontSize: "0.75rem" }}>
                  {user?.role || "User"}
                </small>
                <br />
                <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                  {user?.email || "user@example.com"}
                </small>
              </div>
            </li>

            <li>
              <Link
                to="/user/profile"
                className="dropdown-item py-2 d-flex align-items-center gap-2"
                style={{
                  fontSize: "0.85rem",
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <i className="bi bi-person"></i>
                Profile Settings
              </Link>
            </li>

            <li>
              <hr className="dropdown-divider my-2" />
            </li>

            <li>
              <button
                className="dropdown-item py-2 d-flex align-items-center gap-2"
                onClick={handleLogout}
                style={{
                  fontSize: "0.85rem",
                  color: "#ef4444",
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#fef2f2";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <i className="bi bi-box-arrow-right"></i>
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}