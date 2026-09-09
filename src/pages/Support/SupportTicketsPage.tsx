import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import TopNav from "../../components/LayoutComponents/TopNav";
import PageTitle from "../../components/PageTitle";
import Footer from "../../components/LayoutComponents/Footer";
import { supportApi } from "../../api/supportApi";
import type { SupportTicket } from "../../api/supportApi";
import { getUser } from "../../utils/token";

const statusLabels: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting_for_school: "Awaiting Reply",
  resolved: "Resolved",
  closed: "Closed",
};

const statusClasses: Record<string, string> = {
  open: "db-badge--red",
  in_progress: "db-badge--blue",
  waiting_for_school: "db-badge--amber",
  resolved: "db-badge--green",
  closed: "db-badge--gray",
};

const categories = ["technical", "billing", "results", "account", "training", "other"];
const priorities = ["low", "normal", "high", "urgent"];

const fullName = (user?: any) =>
  user ? user.name || `${user.firstname || ""} ${user.surname || ""}`.trim() || user.email : "Unassigned";

const formatDate = (value?: string) => (value ? new Date(value).toLocaleString() : "");

export default function SupportTicketsPage() {
  const currentUser = getUser();
  const platform = ["super-admin", "platform-staff"].includes(String(currentUser?.role || "").toLowerCase());
  const [params, setParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [assignees, setAssignees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [reply, setReply] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "technical", priority: "normal", message: "" });

  const openCount = useMemo(
    () => tickets.filter((ticket) => !["resolved", "closed"].includes(ticket.status)).length,
    [tickets]
  );
  const resolvedCount = useMemo(
    () => tickets.filter((ticket) => ["resolved", "closed"].includes(ticket.status)).length,
    [tickets]
  );

  const loadTickets = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await supportApi.list({
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
      });
      setTickets(data.tickets?.data || []);
      const requested = params.get("ticket");
      if (requested) await openTicket(requested);
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to load support tickets.");
    } finally {
      setLoading(false);
    }
  };

  const openTicket = async (publicId: string) => {
    setError("");
    try {
      const { data } = await supportApi.show(publicId);
      setSelected(data.ticket);
      setParams({ ticket: publicId });
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to open this ticket.");
    }
  };

  useEffect(() => {
    loadTickets();
  }, [status]);

  useEffect(() => {
    if (platform) {
      supportApi
        .assignees()
        .then(({ data }) => setAssignees(data.assignees || []))
        .catch(() => undefined);
    }
  }, [platform]);

  const createTicket = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { data } = await supportApi.create(form);
      setShowCreate(false);
      setForm({ subject: "", category: "technical", priority: "normal", message: "" });
      await loadTickets();
      await openTicket(data.ticket.public_id);
    } catch (e: any) {
      setError(
        e.response?.data?.message ||
          Object.values(e.response?.data?.errors || {})?.flat()?.[0] ||
          "Unable to create ticket."
      );
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !reply.trim()) return;
    setSaving(true);
    setError("");
    try {
      const { data } = await supportApi.reply(selected.public_id, reply, internalNote);
      setSelected(data.ticket);
      setReply("");
      setInternalNote(false);
      await loadTickets();
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to send reply.");
    } finally {
      setSaving(false);
    }
  };

  const updateTicket = async (payload: { status?: string; priority?: string }) => {
    if (!selected) return;
    setSaving(true);
    try {
      await supportApi.update(selected.public_id, payload);
      await openTicket(selected.public_id);
      await loadTickets();
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to update ticket.");
    } finally {
      setSaving(false);
    }
  };

  const assignTicket = async (value: string) => {
    if (!selected) return;
    setSaving(true);
    try {
      await supportApi.assign(selected.public_id, value ? Number(value) : null);
      await openTicket(selected.public_id);
      await loadTickets();
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to assign ticket.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageTitle title={platform ? "Support Desk" : "Support & Helpdesk"} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        :root {
          --sp-dark: #0F2744;
          --sp-accent: #D97706;
          --sp-accent-dim: rgba(217, 119, 6, 0.10);
          --sp-accent-border: rgba(217, 119, 6, 0.25);
          --sp-light: #FFFFFF;
          --sp-border: #E2E8F0;
        }

        .db-main {
          min-height: 100vh;
          margin-left: 280px;
          width: calc(100% - 280px);
          padding: max(96px, calc(78px + env(safe-area-inset-top))) 28px 48px;
          background: #F8FAFC;
          color: #0F172A;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        }

        @media (max-width: 1199px) {
          .db-main {
            margin-left: 0;
            width: 100%;
            padding: max(88px, calc(72px + env(safe-area-inset-top))) 16px 32px;
          }
        }

        /* Hero */
        .db-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 18px;
          padding: 32px 36px;
          position: relative;
          overflow: hidden;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
        }
        .db-hero-glow {
          position: absolute;
          top: -90px;
          right: -40px;
          width: 380px;
          height: 380px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.15), transparent 70%);
          pointer-events: none;
        }
        .db-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          flex-wrap: wrap;
        }
        .db-kicker {
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
          border-radius: 999px;
          padding: 4px 12px;
          margin-bottom: 12px;
        }
        .db-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
        }
        .db-title {
          font-size: 26px;
          font-weight: 800;
          color: #fff;
          line-height: 1.15;
          margin: 0 0 8px;
        }
        .db-title em {
          color: #FBBF24;
          font-style: normal;
        }
        .db-hero-sub {
          font-size: 13.5px;
          color: #CBD5E1;
          line-height: 1.6;
          max-width: 600px;
          margin: 0;
        }
        .db-btn-gold {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #D97706;
          color: #FFFFFF;
          font-weight: 700;
          font-size: 13px;
          padding: 9px 18px;
          border-radius: 10px;
          border: none;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .db-btn-gold:hover {
          background: #B45309;
          transform: translateY(-1px);
          color: #FFFFFF;
        }
        .db-hero-stats {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 16px 20px;
          min-width: 260px;
          backdrop-filter: blur(10px);
        }
        .db-hero-row {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          padding: 6px 0;
          color: #94a3b8;
          font-size: 12.5px;
        }
        .db-hero-row + .db-hero-row {
          border-top: 1px solid rgba(255,255,255,0.08);
        }
        .db-hero-row strong {
          font-family: "Playfair Display", Georgia, serif;
          color: #fff;
          font-size: 16px;
        }

        /* KPI Cards */
        .db-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .db-stat {
          background: #fff;
          border: 1px solid var(--sp-border);
          border-radius: 16px;
          padding: 20px;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .db-stat:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(5,0,8,0.06);
        }
        .db-stat::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--sc, #c9a84c);
        }
        .db-stat-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .db-stat-label {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #7a6a5a;
        }
        .db-stat-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--si, rgba(201,168,76,0.12));
          color: var(--sc, #c9a84c);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        .db-stat-val {
          font-family: "Playfair Display", Georgia, serif;
          font-size: 26px;
          font-weight: 700;
          color: #1a1a2e;
          line-height: 1.1;
        }
        .db-stat-sub {
          font-size: 11.5px;
          color: #9a8a7a;
          margin-top: 4px;
        }

        /* Panel */
        .db-panel {
          background: #fff;
          border: 1px solid var(--sp-border);
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(5,0,8,0.04);
          overflow: hidden;
        }
        .db-panel-head {
          padding: 18px 22px;
          border-bottom: 1px solid var(--sp-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          background: #faf8f5;
        }
        .db-panel-title {
          font-family: "Playfair Display", Georgia, serif;
          font-size: 16px;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0;
        }
        .db-panel-sub {
          font-size: 11.5px;
          color: #7a6a5a;
          margin: 2px 0 0;
        }

        /* Badges */
        .db-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11.5px;
          font-weight: 700;
          white-space: nowrap;
        }
        .db-badge--blue { background: rgba(59,130,246,0.12); color: #1d4ed8; }
        .db-badge--green { background: rgba(34,197,94,0.14); color: #15803d; }
        .db-badge--amber { background: rgba(245,158,11,0.14); color: #b45309; }
        .db-badge--red { background: rgba(239,68,68,0.12); color: #dc2626; }
        .db-badge--gray { background: rgba(100,116,139,0.14); color: #475569; }

        /* Ticket card list */
        .sp-ticket-item {
          width: 100%;
          text-align: left;
          background: #fff;
          border: none;
          border-bottom: 1px solid var(--sp-border);
          padding: 16px 20px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: block;
        }
        .sp-ticket-item:hover {
          background: #faf8f5;
        }
        .sp-ticket-item--active {
          background: rgba(255,200,87,0.1) !important;
          border-left: 4px solid var(--sp-accent);
        }

        /* Modal */
        .sp-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(5,0,8,0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1050;
          padding: 20px;
        }
        .sp-modal {
          background: #fff;
          border-radius: 18px;
          border: 1px solid var(--sp-border);
          box-shadow: 0 20px 48px rgba(5,0,8,0.25);
          width: 100%;
          max-width: 580px;
          overflow: hidden;
          animation: spModalIn 0.2s ease-out;
        }
        @keyframes spModalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .sp-modal-head {
          padding: 20px 24px;
          background: linear-gradient(135deg, #050008 0%, #140a20 100%);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .sp-modal-title {
          font-family: "Playfair Display", Georgia, serif;
          font-size: 18px;
          font-weight: 700;
          margin: 0;
        }
        .sp-modal-close {
          background: rgba(255,255,255,0.1);
          border: none;
          color: #fff;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        .sp-modal-close:hover {
          background: rgba(255,255,255,0.2);
        }
        .sp-modal-body {
          padding: 24px;
        }
        .sp-modal-foot {
          padding: 16px 24px;
          background: #faf8f5;
          border-top: 1px solid var(--sp-border);
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
      `}</style>

      <TopNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        title={platform ? "Support Desk" : "SchoolProfit Support"}
      />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="db-main d-flex flex-column">
            {/* ═══ HERO ═══ */}
            <div className="db-hero">
              <div className="db-hero-glow" />
              <div className="db-hero-inner">
                <div>
                  <div className="db-kicker">
                    <span className="db-dot" />
                    {platform ? "Platform Support Operations" : "Technical Helpdesk & Inquiries"}
                  </div>
                  <h1 className="db-title">
                    {platform ? "Customer Support " : "Support & "}
                    <em>{platform ? "Desk" : "Assistance"}</em>
                  </h1>
                  <p className="db-hero-sub">
                    {platform
                      ? "Manage incoming support tickets, triage technical questions, and reply to school administrators."
                      : "Submit technical inquiries, report discrepancies, and chat directly with SchoolProfit support engineers."}
                  </p>
                  {!platform && (
                    <div className="mt-3">
                      <button className="db-btn-gold" onClick={() => setShowCreate(true)}>
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                          <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Open New Support Ticket
                      </button>
                    </div>
                  )}
                </div>

                <div className="db-hero-stats d-none d-md-block">
                  <div className="db-hero-row">
                    <span>Active Tickets</span>
                    <strong>{openCount}</strong>
                  </div>
                  <div className="db-hero-row">
                    <span>Resolved Tickets</span>
                    <strong>{resolvedCount}</strong>
                  </div>
                  <div className="db-hero-row">
                    <span>Official Email</span>
                    <strong style={{ fontSize: 13, fontFamily: "sans-serif" }}>support@gradequest.com.ng</strong>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert">
                <i className="bi bi-exclamation-triangle-fill" />
                <div>{error}</div>
              </div>
            )}

            {/* ═══ KPI STATS ═══ */}
            <div className="db-stats">
              <div className="db-stat" style={{ "--sc": "#2563eb", "--si": "rgba(37,99,235,0.10)" } as any}>
                <div className="db-stat-head">
                  <span className="db-stat-label">Total Tickets</span>
                  <div className="db-stat-icon">
                    <i className="bi bi-ticket-detailed" />
                  </div>
                </div>
                <div className="db-stat-val">{tickets.length}</div>
                <div className="db-stat-sub">All time recorded tickets</div>
              </div>

              <div className="db-stat" style={{ "--sc": "#dc2626", "--si": "rgba(220,38,38,0.10)" } as any}>
                <div className="db-stat-head">
                  <span className="db-stat-label">Open / In Progress</span>
                  <div className="db-stat-icon">
                    <i className="bi bi-hourglass-split" />
                  </div>
                </div>
                <div className="db-stat-val">{openCount}</div>
                <div className="db-stat-sub">Currently awaiting resolution</div>
              </div>

              <div className="db-stat" style={{ "--sc": "#15803d", "--si": "rgba(34,197,94,0.12)" } as any}>
                <div className="db-stat-head">
                  <span className="db-stat-label">Resolved / Closed</span>
                  <div className="db-stat-icon">
                    <i className="bi bi-check-circle" />
                  </div>
                </div>
                <div className="db-stat-val">{resolvedCount}</div>
                <div className="db-stat-sub">Successfully addressed</div>
              </div>

              <div className="db-stat" style={{ "--sc": "#b45309", "--si": "rgba(245,158,11,0.12)" } as any}>
                <div className="db-stat-head">
                  <span className="db-stat-label">Response SLA</span>
                  <div className="db-stat-icon">
                    <i className="bi bi-lightning-charge" />
                  </div>
                </div>
                <div className="db-stat-val" style={{ fontSize: 20 }}>
                  Active
                </div>
                <div className="db-stat-sub">Email notifications enabled</div>
              </div>
            </div>

            {/* ═══ TICKET WORKSTATION ═══ */}
            <div className="row g-4">
              {/* Ticket Directory */}
              <div className="col-xl-5">
                <div className="db-panel h-100">
                  <div className="db-panel-head">
                    <div className="w-100 d-flex gap-2">
                      <div className="position-relative flex-grow-1">
                        <input
                          className="form-control"
                          style={{ borderRadius: 10, borderColor: "#e5ddd3", fontSize: 13, paddingLeft: 34 }}
                          placeholder="Search tickets, subject, school..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && loadTickets()}
                        />
                        <i
                          className="bi bi-search position-absolute text-muted"
                          style={{ left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13 }}
                        />
                      </div>
                      <select
                        className="form-select"
                        style={{ maxWidth: 140, borderRadius: 10, borderColor: "#e5ddd3", fontSize: 13 }}
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="">All Statuses</option>
                        {Object.entries(statusLabels).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn"
                        style={{ background: "#f5f1eb", border: "1px solid #e5ddd3", borderRadius: 10 }}
                        onClick={loadTickets}
                        title="Refresh Tickets"
                      >
                        <i className="bi bi-arrow-clockwise" />
                      </button>
                    </div>
                  </div>

                  <div style={{ maxHeight: "68vh", overflowY: "auto" }}>
                    {loading ? (
                      <div className="p-5 text-center text-muted">
                        <div className="spinner-border spinner-border-sm text-warning me-2" />
                        Loading tickets…
                      </div>
                    ) : tickets.length === 0 ? (
                      <div className="p-5 text-center text-muted">
                        <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary opacity-50" />
                        <strong>No support tickets found</strong>
                        <p className="small mb-0 text-muted">
                          {search ? "No tickets matched your search criteria." : "You have not submitted any support tickets."}
                        </p>
                      </div>
                    ) : (
                      tickets.map((ticket) => (
                        <button
                          key={ticket.public_id}
                          className={`sp-ticket-item ${selected?.public_id === ticket.public_id ? "sp-ticket-item--active" : ""}`}
                          onClick={() => openTicket(ticket.public_id)}
                        >
                          <div className="d-flex justify-content-between align-items-start gap-2">
                            <strong className="text-truncate" style={{ color: "#1a1a2e", fontSize: 14 }}>
                              {ticket.subject}
                            </strong>
                            <span className={`db-badge ${statusClasses[ticket.status] || "db-badge--gray"}`}>
                              {statusLabels[ticket.status] || ticket.status}
                            </span>
                          </div>
                          <div className="small text-muted mt-1 d-flex align-items-center gap-2 flex-wrap">
                            <span style={{ fontWeight: 600, color: "#7a6a5a" }}>{ticket.ticket_number}</span>
                            {platform && (ticket.school as any)?.school_name && (
                              <span>· {(ticket.school as any).school_name}</span>
                            )}
                            <span className="text-capitalize">· {ticket.category}</span>
                          </div>
                          <div className="d-flex justify-content-between align-items-center small mt-2 pt-1">
                            <span
                              className={`badge ${ticket.priority === "urgent" ? "bg-danger" : ticket.priority === "high" ? "bg-warning text-dark" : "bg-light text-secondary border"}`}
                              style={{ fontSize: 10, textTransform: "uppercase" }}
                            >
                              {ticket.priority} priority
                            </span>
                            <span className="text-muted" style={{ fontSize: 11 }}>
                              {formatDate(ticket.last_reply_at)}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Conversation View */}
              <div className="col-xl-7">
                {!selected ? (
                  <div className="db-panel h-100 d-flex align-items-center justify-content-center py-5 text-center text-muted">
                    <div className="p-4">
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 16,
                          background: "var(--sp-accent-dim)",
                          color: "rgb(180,83,9)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 24,
                          marginBottom: 12,
                        }}
                      >
                        <i className="bi bi-chat-left-text" />
                      </div>
                      <h5 style={{ fontFamily: "Playfair Display, serif", color: "#1a1a2e", marginBottom: 6 }}>
                        Select a Ticket
                      </h5>
                      <p className="text-muted small mb-0" style={{ maxWidth: 300 }}>
                        Click on any ticket in the list on the left to view the messages, status, and replies.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="db-panel h-100 d-flex flex-column">
                    <div className="p-4 border-bottom" style={{ background: "#faf8f5" }}>
                      <div className="d-flex justify-content-between align-items-start gap-3">
                        <div>
                          <div className="small text-muted" style={{ fontWeight: 600 }}>
                            {selected.ticket_number}
                          </div>
                          <h4 className="mb-1" style={{ fontFamily: "Playfair Display, serif", color: "#1a1a2e" }}>
                            {selected.subject}
                          </h4>
                          <div className="small text-muted">
                            {(selected.school as any)?.school_name || selected.school?.name || "Your School"} · Category:{" "}
                            <span className="text-capitalize fw-semibold">{selected.category}</span>
                          </div>
                        </div>
                        <span className={`db-badge ${statusClasses[selected.status] || "db-badge--gray"}`}>
                          {statusLabels[selected.status] || selected.status}
                        </span>
                      </div>

                      {platform && (
                        <div className="row g-2 mt-3 pt-3 border-top">
                          <div className="col-md-6">
                            <label className="form-label small mb-1 fw-bold text-muted">Assignee</label>
                            <select
                              className="form-select form-select-sm"
                              value={selected.assignee?.id || ""}
                              disabled={saving}
                              onChange={(e) => assignTicket(e.target.value)}
                            >
                              <option value="">Unassigned</option>
                              {assignees.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.name} ({user.email})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small mb-1 fw-bold text-muted">Status</label>
                            <select
                              className="form-select form-select-sm"
                              value={selected.status}
                              disabled={saving}
                              onChange={(e) => updateTicket({ status: e.target.value })}
                            >
                              {Object.entries(statusLabels).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small mb-1 fw-bold text-muted">Priority</label>
                            <select
                              className="form-select form-select-sm"
                              value={selected.priority}
                              disabled={saving}
                              onChange={(e) => updateTicket({ priority: e.target.value })}
                            >
                              {priorities.map((v) => (
                                <option key={v} value={v}>
                                  {v.toUpperCase()}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 flex-grow-1" style={{ maxHeight: "48vh", overflowY: "auto", background: "#f8f6f2" }}>
                      {(selected.messages || []).map((message) => {
                        const mine = message.sender_type === (platform ? "support" : "school");
                        return (
                          <div
                            key={message.id}
                            className={`d-flex mb-3 ${mine ? "justify-content-end" : "justify-content-start"}`}
                          >
                            <div
                              style={{
                                maxWidth: "82%",
                                background: message.is_internal_note ? "#fffbeb" : mine ? "#050008" : "#ffffff",
                                color: message.is_internal_note || !mine ? "#1a1a2e" : "#ffffff",
                                border: message.is_internal_note
                                  ? "1px solid #fde68a"
                                  : mine
                                  ? "1px solid rgba(255,200,87,0.2)"
                                  : "1px solid #ede8e0",
                                borderRadius: 14,
                                padding: "12px 16px",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                              }}
                            >
                              <div className="small fw-bold mb-1 d-flex align-items-center gap-1">
                                {message.is_internal_note && <i className="bi bi-lock text-warning me-1" />}
                                {message.is_internal_note ? "Internal Note · " : ""}
                                <span style={{ color: mine ? "#e8c97a" : "#7a6a5a" }}>{fullName(message.user)}</span>
                              </div>
                              <div style={{ whiteSpace: "pre-wrap", fontSize: 13.5, lineHeight: 1.5 }}>
                                {message.message}
                              </div>
                              <div className="small mt-1 text-end" style={{ opacity: 0.65, fontSize: 11 }}>
                                {formatDate(message.created_at)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <form className="p-4 border-top" style={{ background: "#fff" }} onSubmit={sendReply}>
                      {selected.status === "closed" ? (
                        <div className="alert alert-secondary d-flex align-items-center justify-content-between mb-0">
                          <span>This ticket is closed.</span>
                          {platform && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => updateTicket({ status: "open" })}
                            >
                              Reopen Ticket
                            </button>
                          )}
                        </div>
                      ) : (
                        <>
                          <textarea
                            className="form-control mb-2"
                            rows={3}
                            placeholder="Write your response..."
                            style={{ borderRadius: 10, borderColor: "#e5ddd3", fontSize: 13.5 }}
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            required
                          />
                          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                            {platform ? (
                              <label className="form-check mb-0">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={internalNote}
                                  onChange={(e) => setInternalNote(e.target.checked)}
                                />
                                <span className="form-check-label small text-muted">
                                  Internal note (school cannot see this)
                                </span>
                              </label>
                            ) : (
                              <small className="text-muted">
                                <i className="bi bi-envelope me-1" />
                                Support engineers are notified instantly by email.
                              </small>
                            )}
                            <button
                              className="db-btn-gold"
                              disabled={saving || !reply.trim()}
                              style={{ padding: "8px 18px", fontSize: 12.5 }}
                            >
                              {saving ? "Sending…" : internalNote ? "Add Internal Note" : "Send Reply"}
                            </button>
                          </div>
                        </>
                      )}
                    </form>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5">
              <Footer />
            </div>
          </main>
        </div>
      </div>

      {/* ═══ CREATE TICKET MODAL ═══ */}
      {showCreate && (
        <div className="sp-modal-overlay">
          <div className="sp-modal">
            <form onSubmit={createTicket}>
              <div className="sp-modal-head">
                <h5 className="sp-modal-title">Open Support Ticket</h5>
                <button type="button" className="sp-modal-close" onClick={() => setShowCreate(false)}>
                  <i className="bi bi-x-lg" />
                </button>
              </div>
              <div className="sp-modal-body">
                <label className="form-label small fw-bold text-muted">Subject / Summary</label>
                <input
                  className="form-control mb-3"
                  maxLength={180}
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="e.g. Issue generating third term broadsheet"
                  style={{ borderRadius: 8, borderColor: "#e5ddd3" }}
                />
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Category</label>
                    <select
                      className="form-select"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      style={{ borderRadius: 8, borderColor: "#e5ddd3" }}
                    >
                      {categories.map((value) => (
                        <option key={value} value={value} className="text-capitalize">
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Priority</label>
                    <select
                      className="form-select"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      style={{ borderRadius: 8, borderColor: "#e5ddd3" }}
                    >
                      {priorities.map((value) => (
                        <option key={value} value={value} className="text-capitalize">
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="form-label small fw-bold text-muted">Detailed Description</label>
                <textarea
                  className="form-control"
                  rows={5}
                  minLength={10}
                  maxLength={10000}
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Provide complete details including the page, steps to reproduce, or any error message..."
                  style={{ borderRadius: 8, borderColor: "#e5ddd3" }}
                />
              </div>
              <div className="sp-modal-foot">
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: "#f5f1eb", color: "#7a6a5a" }}
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button className="db-btn-gold" disabled={saving}>
                  {saving ? "Creating…" : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
