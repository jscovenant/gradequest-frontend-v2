// src/pages/Invoices/InvoiceNotificationsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import { useToast } from "../../contexts/ToastContext";
import {
  getAllInvoiceNotifications,
  markInvoiceNotificationRead,
  type InvoiceNote,
} from "../../api/invoiceNotificationsApi";
import PageTitle from "../../components/PageTitle";

function statusPill(status?: string) {
  const s = (status || "").toLowerCase();
  if (s === "paid") return { bg: "rgba(34,197,94,0.14)", fg: "#16a34a", text: "PAID" };
  if (s === "overdue") return { bg: "rgba(239,68,68,0.14)", fg: "#dc2626", text: "OVERDUE" };
  return { bg: "rgba(245,158,11,0.14)", fg: "#d97706", text: (status || "PENDING").toUpperCase() };
}

function resolveInvoiceFromNote(note: InvoiceNote) {
  return (note.invoice ?? note.meta?.invoice ?? note.meta ?? {}) as any;
}

export default function InvoiceNotificationsPage() {
  const { showError, showSuccess } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InvoiceNote[]>([]);

  const unreadCount = useMemo(() => items.filter((x) => !x.is_read).length, [items]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllInvoiceNotifications();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      showError?.("Failed to load invoice notifications.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markRead = async (id: number) => {
    setItems((p) => p.map((x) => (x.id === id ? { ...x, is_read: true } : x)));
    try {
      await markInvoiceNotificationRead(id);
    } catch {
      setItems((p) => p.map((x) => (x.id === id ? { ...x, is_read: false } : x)));
      showError?.("Could not mark as read.");
    }
  };

  return (
    <>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Invoice Notifications" />
      <PageTitle title="Invoice Notifications" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto" style={{ padding: 24, background: "#f5f1eb", minHeight: "100vh" }}>
            {loading && <Loader message="Loading invoice notifications..." />}

            <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
              <div className="card-body d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <h5 className="mb-1 fw-bold">Invoices</h5>
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    View invoice alerts, open details, and proceed to payment.
                  </div>
                </div>

                <div className="d-flex gap-2 align-items-center">
                  <span className="badge" style={{ background: "#fef3c7", color: "#92400e", padding: "8px 10px", borderRadius: 999 }}>
                    {unreadCount} unread
                  </span>
                  <button className="btn btn-outline-secondary" onClick={load} disabled={loading}>
                    <i className="bi bi-arrow-clockwise me-1" /> Refresh
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 card border-0 shadow-sm" style={{ borderRadius: 14 }}>
              <div className="card-body p-0">
                {items.length === 0 && !loading ? (
                  <div className="p-4 text-muted">No invoice notifications.</div>
                ) : (
                  <div className="list-group list-group-flush">
                    {items.map((note) => {
                      const inv = resolveInvoiceFromNote(note);
                      const pill = statusPill(inv?.status);
                      const amount =
                        inv?.amount != null ? `${inv?.currency || "₦"}${inv.amount}` : "—";
                      const invoiceNo = inv?.invoice_no || inv?.reference || inv?.id || "—";

                      return (
                        <div key={note.id} className="list-group-item d-flex justify-content-between align-items-start gap-3">
                          <div style={{ minWidth: 0 }}>
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                              <span
                                className="badge"
                                style={{ background: pill.bg, color: pill.fg, borderRadius: 999, padding: "6px 10px" }}
                              >
                                {pill.text}
                              </span>

                              {!note.is_read && (
                                <span className="badge" style={{ background: "#dbeafe", color: "#1e40af", borderRadius: 999, padding: "6px 10px" }}>
                                  NEW
                                </span>
                              )}

                              <span className="text-muted" style={{ fontSize: 12 }}>
                                {note.time || note.created_at || ""}
                              </span>
                            </div>

                            <div className="mt-1 fw-semibold" style={{ wordBreak: "break-word" }}>
                              {note.message}
                            </div>

                            <div className="text-muted mt-1" style={{ fontSize: 13 }}>
                              Invoice: <b>{invoiceNo}</b> • Amount: <b>{amount}</b>
                              {inv?.due_date ? <> • Due: <b>{inv.due_date}</b></> : null}
                            </div>
                          </div>

                          <div className="d-flex gap-2 flex-wrap">
                            {!note.is_read && (
                              <button className="btn btn-light" onClick={() => markRead(note.id)}>
                                <i className="bi bi-check2 me-1" /> Mark read
                              </button>
                            )}
                            <Link className="btn btn-primary" to={`/invoice-notifications/${note.id}`}>
                              View <i className="bi bi-arrow-right ms-1" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto pt-3">
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}