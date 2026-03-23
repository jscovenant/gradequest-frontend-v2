import { useEffect, useMemo, useState } from "react";
import { authApi } from "../../utils/axios";
import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";

type DemoBooking = {
  id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  school_name: string;
  school_type: string;
  student_count: string;
  preferred_date: string;
  preferred_time: string;
  message?: string | null;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  source?: string;
  created_at?: string;
};

type PaginatedResponse<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

function formatDate(date?: string | null) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString();
}

function statusStyle(status: DemoBooking["status"]) {
  switch (status) {
    case "confirmed":
      return { bg: "#d1fae5", color: "#065f46" };
    case "completed":
      return { bg: "#dbeafe", color: "#1e40af" };
    case "cancelled":
      return { bg: "#fee2e2", color: "#b91c1c" };
    default:
      return { bg: "#fef3c7", color: "#b45309" };
  }
}

export default function DemoBookingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bookings, setBookings] = useState<DemoBooking[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [selected, setSelected] = useState<DemoBooking | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchBookings = async (pageNumber = 1) => {
    try {
      setTableLoading(true);
      setError(null);

      const res = await authApi.get<PaginatedResponse<DemoBooking>>("/admin/demo-bookings", {
        params: {
          page: pageNumber,
          per_page: 10,
          search: search || undefined,
          status: status || undefined,
          date: date || undefined,
        },
      });

      setBookings(res.data.data || []);
      setMeta({
        current_page: res.data.current_page,
        last_page: res.data.last_page,
        per_page: res.data.per_page,
        total: res.data.total,
      });
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to load demo bookings.");
      setBookings([]);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(1);
  }, []);

  useEffect(() => {
    if (page !== 1) {
      fetchBookings(page);
    }
  }, [page]);

  const totalPages = useMemo(() => Math.max(1, meta.last_page || 1), [meta.last_page]);

  const applyFilters = () => {
    setPage(1);
    fetchBookings(1);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setDate("");
    setPage(1);
    setTimeout(() => fetchBookings(1), 0);
  };

  const updateStatus = async (id: number, newStatus: DemoBooking["status"]) => {
    try {
      setUpdatingId(id);

      await authApi.patch(`/admin/demo-bookings/${id}/status`, {
        status: newStatus,
      });

      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
      );

      if (selected?.id === id) {
        setSelected({ ...selected, status: newStatus });
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to update booking status.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <style>{`
        .db-main {
          background: var(--bs-body-bg, #f5f1eb);
          min-height: 100vh;
          font-family: "DM Sans", system-ui, sans-serif;
          padding: 28px 28px 0;
        }

        .db-hero {
          background: #0f172a;
          border-radius: 16px;
          padding: 32px 36px;
          position: relative;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .db-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px);
          background-size: 24px 24px;
        }

        .db-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
          align-items: center;
        }

        .db-greeting {
          font-size: clamp(22px, 2.5vw, 32px);
          font-weight: 700;
          color: #fff;
          margin: 0 0 10px;
        }

        .db-greeting em {
          font-style: italic;
          color: #e8c97a;
        }

        .db-hero-sub {
          font-size: 13.5px;
          font-weight: 300;
          color: #94a3b8;
          line-height: 1.7;
          max-width: 650px;
          margin: 0;
        }

        .db-mini-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 14px;
          padding: 18px 20px;
          min-width: 220px;
        }

        .db-mini-label {
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #c9a84c;
          margin-bottom: 6px;
        }

        .db-mini-value {
          font-size: 28px;
          font-weight: 700;
          color: #fff;
        }

        .db-panel {
          background: #fff;
          border: 1px solid #ede8e0;
          border-radius: 14px;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .db-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 22px 24px 18px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          flex-wrap: wrap;
        }

        .db-panel-title {
          font-size: 18px;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0;
        }

        .db-panel-sub {
          font-size: 12px;
          color: #9a8a7a;
          margin: 4px 0 0;
        }

        .db-filter-wrap {
          padding: 18px 24px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          display: grid;
          grid-template-columns: 2fr 1fr 1fr auto auto;
          gap: 12px;
        }

        @media (max-width: 991.98px) {
          .db-filter-wrap {
            grid-template-columns: 1fr;
          }
        }

        .db-input,
        .db-select {
          width: 100%;
          border: 1px solid #e5ddd3;
          background: #fff;
          border-radius: 10px;
          padding: 11px 14px;
          font-size: 14px;
          outline: none;
        }

        .db-input:focus,
        .db-select:focus {
          border-color: #c9a84c;
          box-shadow: 0 0 0 3px rgba(201,168,76,0.12);
        }

        .db-btn-gold,
        .db-btn-outline {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 10px;
          padding: 11px 16px;
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
        }

        .db-btn-gold {
          background: #c9a84c;
          color: #0f172a;
          border: none;
        }

        .db-btn-outline {
          background: #fff;
          color: #7a6a5a;
          border: 1px solid #e5ddd3;
        }

        .db-btn-gold:hover { background: #e8c97a; }
        .db-btn-outline:hover { background: #f8f5ef; }

        .db-table-wrap {
          overflow-x: auto;
        }

        .db-table {
          width: 100%;
          border-collapse: collapse;
        }

        .db-table th {
          padding: 12px 16px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #9a8a7a;
          background: #faf8f5;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          text-align: left;
          white-space: nowrap;
        }

        .db-table td {
          padding: 14px 16px;
          font-size: 13.5px;
          color: #4a4a5a;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          vertical-align: top;
        }

        .db-table tbody tr:hover {
          background: #faf8f5;
        }

        .db-name {
          font-weight: 600;
          color: #1a1a2e;
        }

        .db-subtext {
          font-size: 12px;
          color: #9a8a7a;
          margin-top: 3px;
        }

        .db-status-pill {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
        }

        .db-action-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .db-icon-btn {
          border: 1px solid #e5ddd3;
          background: #fff;
          border-radius: 8px;
          padding: 7px 10px;
          font-size: 12px;
          cursor: pointer;
        }

        .db-icon-btn:hover {
          background: #f8f5ef;
        }

        .db-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-top: 1px solid rgba(0,0,0,0.06);
          flex-wrap: wrap;
          gap: 10px;
        }

        .db-page-info {
          font-size: 12px;
          color: #9a8a7a;
        }

        .db-page-btns {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .db-page-btn {
          border: 1px solid #e5ddd3;
          background: #f5f1eb;
          color: #7a6a5a;
          border-radius: 8px;
          padding: 7px 12px;
          font-size: 12px;
          cursor: pointer;
        }

        .db-page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .db-empty {
          padding: 48px 16px;
          text-align: center;
          color: #9a8a7a;
          font-size: 14px;
        }

        .db-error {
          margin: 16px 24px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          color: #9a3412;
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 13px;
        }

        .db-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 2000;
        }

        .db-modal {
          width: 100%;
          max-width: 680px;
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #ede8e0;
          box-shadow: 0 20px 60px rgba(0,0,0,0.18);
        }

        .db-modal-head {
          padding: 20px 22px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .db-modal-body {
          padding: 22px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px 18px;
        }

        @media (max-width: 767.98px) {
          .db-modal-body {
            grid-template-columns: 1fr;
          }
        }

        .db-detail {
          background: #faf8f5;
          border: 1px solid #efe8dc;
          border-radius: 12px;
          padding: 14px;
        }

        .db-detail-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #9a8a7a;
          margin-bottom: 6px;
        }

        .db-detail-value {
          font-size: 14px;
          color: #1a1a2e;
          word-break: break-word;
        }

        .db-detail-full {
          grid-column: 1 / -1;
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loading && <Loader message="Loading demo bookings…" />}

            <div className="db-hero">
              <div className="db-hero-inner">
                <div>
                  <h1 className="db-greeting">
                    Demo <em>Bookers</em>
                  </h1>
                  <p className="db-hero-sub">
                    View, search, filter, and manage all demo booking requests submitted from your public website form.
                  </p>
                </div>

                <div className="db-mini-card">
                  <div className="db-mini-label">Total bookings</div>
                  <div className="db-mini-value">{meta.total}</div>
                </div>
              </div>
            </div>

            <div className="db-panel">
              <div className="db-panel-head">
                <div>
                  <h2 className="db-panel-title">Booking Requests</h2>
                  <p className="db-panel-sub">Authenticated dashboard view powered by authApi</p>
                </div>
              </div>

              <div className="db-filter-wrap">
                <input
                  className="db-input"
                  type="text"
                  placeholder="Search by name, email, phone, or school..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <select
                  className="db-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>

                <input
                  className="db-input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />

                <button className="db-btn-gold" onClick={applyFilters}>
                  Apply Filters
                </button>

                <button className="db-btn-outline" onClick={clearFilters}>
                  Clear
                </button>
              </div>

              {error && <div className="db-error">{error}</div>}

              <div className="db-table-wrap">
                <table className="db-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>School</th>
                      <th>Contact</th>
                      <th>Preferred Slot</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableLoading ? (
                      <tr>
                        <td colSpan={6} className="db-empty">Loading bookings...</td>
                      </tr>
                    ) : bookings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="db-empty">No booking requests found.</td>
                      </tr>
                    ) : (
                      bookings.map((b) => {
                        const pill = statusStyle(b.status);

                        return (
                          <tr key={b.id}>
                            <td>
                              <div className="db-name">{b.full_name}</div>
                              <div className="db-subtext">{b.role}</div>
                            </td>

                            <td>
                              <div className="db-name">{b.school_name}</div>
                              <div className="db-subtext">{b.school_type}</div>
                            </td>

                            <td>
                              <div>{b.email}</div>
                              <div className="db-subtext">{b.phone}</div>
                            </td>

                            <td>
                              <div>{formatDate(b.preferred_date)}</div>
                              <div className="db-subtext">{b.preferred_time} (WAT)</div>
                            </td>

                            <td>
                              <span
                                className="db-status-pill"
                                style={{ background: pill.bg, color: pill.color }}
                              >
                                {b.status}
                              </span>
                            </td>

                            <td>
                              <div className="db-action-row">
                                <button
                                  className="db-icon-btn"
                                  onClick={() => setSelected(b)}
                                >
                                  View
                                </button>

                                <button
                                  className="db-icon-btn"
                                  disabled={updatingId === b.id}
                                  onClick={() => updateStatus(b.id, "confirmed")}
                                >
                                  Confirm
                                </button>

                                <button
                                  className="db-icon-btn"
                                  disabled={updatingId === b.id}
                                  onClick={() => updateStatus(b.id, "completed")}
                                >
                                  Complete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="db-pagination">
                <span className="db-page-info">
                  Showing page {meta.current_page} of {totalPages} · {meta.total} total
                </span>

                <div className="db-page-btns">
                  <button
                    className="db-page-btn"
                    disabled={page <= 1 || tableLoading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </button>

                  <button
                    className="db-page-btn"
                    disabled={page >= totalPages || tableLoading}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            <Footer />
          </main>
        </div>
      </div>

      {selected && (
        <div className="db-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="db-modal" onClick={(e) => e.stopPropagation()}>
            <div className="db-modal-head">
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: "#1a1a2e" }}>
                  {selected.full_name}
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9a8a7a" }}>
                  Demo booking details
                </p>
              </div>

              <button className="db-icon-btn" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>

            <div className="db-modal-body">
              <div className="db-detail">
                <div className="db-detail-label">Email</div>
                <div className="db-detail-value">{selected.email}</div>
              </div>

              <div className="db-detail">
                <div className="db-detail-label">Phone</div>
                <div className="db-detail-value">{selected.phone}</div>
              </div>

              <div className="db-detail">
                <div className="db-detail-label">School</div>
                <div className="db-detail-value">{selected.school_name}</div>
              </div>

              <div className="db-detail">
                <div className="db-detail-label">Role</div>
                <div className="db-detail-value">{selected.role}</div>
              </div>

              <div className="db-detail">
                <div className="db-detail-label">School Type</div>
                <div className="db-detail-value">{selected.school_type}</div>
              </div>

              <div className="db-detail">
                <div className="db-detail-label">Student Count</div>
                <div className="db-detail-value">{selected.student_count}</div>
              </div>

              <div className="db-detail">
                <div className="db-detail-label">Preferred Date</div>
                <div className="db-detail-value">{formatDate(selected.preferred_date)}</div>
              </div>

              <div className="db-detail">
                <div className="db-detail-label">Preferred Time</div>
                <div className="db-detail-value">{selected.preferred_time} (WAT)</div>
              </div>

              <div className="db-detail">
                <div className="db-detail-label">Status</div>
                <div className="db-detail-value">{selected.status}</div>
              </div>

              <div className="db-detail">
                <div className="db-detail-label">Submitted</div>
                <div className="db-detail-value">{formatDate(selected.created_at || "")}</div>
              </div>

              <div className="db-detail db-detail-full">
                <div className="db-detail-label">Message</div>
                <div className="db-detail-value">{selected.message || "No additional note provided."}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}