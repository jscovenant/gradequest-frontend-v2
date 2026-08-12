import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import TopNav from "../../components/LayoutComponents/TopNav";
import { supportApi } from "../../api/supportApi";
import type { SupportTicket } from "../../api/supportApi";
import { getUser } from "../../utils/token";

const statusLabels: Record<string, string> = {
  open: "Open", in_progress: "In progress", waiting_for_school: "Waiting for school", resolved: "Resolved", closed: "Closed",
};
const statusColors: Record<string, string> = {
  open: "#dc2626", in_progress: "#2563eb", waiting_for_school: "#d97706", resolved: "#059669", closed: "#64748b",
};
const categories = ["technical", "billing", "results", "account", "training", "other"];
const priorities = ["low", "normal", "high", "urgent"];
const fullName = (user?: any) => user ? (user.name || `${user.firstname || ""} ${user.surname || ""}`.trim() || user.email) : "Unassigned";
const formatDate = (value?: string) => value ? new Date(value).toLocaleString() : "";

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

  const openCount = useMemo(() => tickets.filter((ticket) => !["resolved", "closed"].includes(ticket.status)).length, [tickets]);

  const loadTickets = async () => {
    setLoading(true); setError("");
    try {
      const { data } = await supportApi.list({ ...(search ? { search } : {}), ...(status ? { status } : {}) });
      setTickets(data.tickets?.data || []);
      const requested = params.get("ticket");
      if (requested) await openTicket(requested);
    } catch (e: any) { setError(e.response?.data?.message || "Unable to load support tickets."); }
    finally { setLoading(false); }
  };

  const openTicket = async (publicId: string) => {
    setError("");
    try {
      const { data } = await supportApi.show(publicId);
      setSelected(data.ticket);
      setParams({ ticket: publicId });
    } catch (e: any) { setError(e.response?.data?.message || "Unable to open this ticket."); }
  };

  useEffect(() => { loadTickets(); }, [status]);
  useEffect(() => {
    if (platform) supportApi.assignees().then(({ data }) => setAssignees(data.assignees || [])).catch(() => undefined);
  }, [platform]);

  const createTicket = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const { data } = await supportApi.create(form);
      setShowCreate(false); setForm({ subject: "", category: "technical", priority: "normal", message: "" });
      await loadTickets(); await openTicket(data.ticket.public_id);
    } catch (e: any) { setError(e.response?.data?.message || Object.values(e.response?.data?.errors || {})?.flat()?.[0] || "Unable to create ticket."); }
    finally { setSaving(false); }
  };

  const sendReply = async (event: FormEvent) => {
    event.preventDefault(); if (!selected || !reply.trim()) return;
    setSaving(true); setError("");
    try {
      const { data } = await supportApi.reply(selected.public_id, reply, internalNote);
      setSelected(data.ticket); setReply(""); setInternalNote(false); await loadTickets();
    } catch (e: any) { setError(e.response?.data?.message || "Unable to send reply."); }
    finally { setSaving(false); }
  };

  const updateTicket = async (payload: { status?: string; priority?: string }) => {
    if (!selected) return;
    setSaving(true);
    try { await supportApi.update(selected.public_id, payload); await openTicket(selected.public_id); await loadTickets(); }
    catch (e: any) { setError(e.response?.data?.message || "Unable to update ticket."); }
    finally { setSaving(false); }
  };

  const assignTicket = async (value: string) => {
    if (!selected) return;
    setSaving(true);
    try { await supportApi.assign(selected.public_id, value ? Number(value) : null); await openTicket(selected.public_id); await loadTickets(); }
    catch (e: any) { setError(e.response?.data?.message || "Unable to assign ticket."); }
    finally { setSaving(false); }
  };

  return <>
    <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title={platform ? "Support Desk" : "GradeQuest Support"} />
    <div className="container-fluid"><div className="row">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <main className="col-md-9 col-lg-10 ms-auto gq-app-main">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div><h2 className="mb-1">{platform ? "Customer support tickets" : "Technical support"}</h2>
            <p className="text-muted mb-0">{openCount} active ticket{openCount === 1 ? "" : "s"} · Replies are emailed from support@gradequest.com.ng</p></div>
          {!platform && <button className="btn btn-primary" onClick={() => setShowCreate(true)}><i className="bi bi-plus-lg me-2" />Create ticket</button>}
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="row g-3">
          <div className="col-xl-5">
            <div className="card border-0 shadow-sm">
              <div className="card-body border-bottom d-flex gap-2">
                <input className="form-control" placeholder="Search ticket or school" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadTickets()} />
                <select className="form-select" style={{ maxWidth: 155 }} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
                <button className="btn btn-outline-secondary" onClick={loadTickets}><i className="bi bi-search" /></button>
              </div>
              <div style={{ maxHeight: "68vh", overflowY: "auto" }}>
                {loading ? <div className="p-5 text-center text-muted">Loading tickets…</div> : tickets.length === 0 ? <div className="p-5 text-center"><i className="bi bi-life-preserver fs-1 text-muted" /><p className="mt-2 mb-0">No tickets found.</p></div> : tickets.map((ticket) =>
                  <button key={ticket.public_id} className="w-100 text-start border-0 border-bottom p-3" onClick={() => openTicket(ticket.public_id)} style={{ background: selected?.public_id === ticket.public_id ? "#eef2ff" : "white" }}>
                    <div className="d-flex justify-content-between gap-2"><strong className="text-truncate">{ticket.subject}</strong><small style={{ color: statusColors[ticket.status], whiteSpace: "nowrap", fontWeight: 700 }}>{statusLabels[ticket.status]}</small></div>
                    <div className="small text-muted mt-1">{ticket.ticket_number}{platform && ticket.school?.name ? ` · ${ticket.school.name}` : ""}</div>
                    <div className="d-flex justify-content-between small mt-2"><span className={`badge ${ticket.priority === "urgent" ? "bg-danger" : ticket.priority === "high" ? "bg-warning text-dark" : "bg-light text-dark"}`}>{ticket.priority}</span><span className="text-muted">{formatDate(ticket.last_reply_at)}</span></div>
                  </button>)}
              </div>
            </div>
          </div>
          <div className="col-xl-7">
            {!selected ? <div className="card border-0 shadow-sm"><div className="card-body text-center py-5 text-muted"><i className="bi bi-chat-square-text fs-1" /><p className="mt-3">Select a ticket to view the conversation.</p></div></div> :
              <div className="card border-0 shadow-sm">
                <div className="card-body border-bottom">
                  <div className="d-flex justify-content-between gap-3"><div><div className="small text-muted">{selected.ticket_number}</div><h4 className="mb-1">{selected.subject}</h4><div className="small text-muted">{selected.school?.name || "Your school"} · {selected.category}</div></div><span className="badge align-self-start" style={{ background: statusColors[selected.status] }}>{statusLabels[selected.status]}</span></div>
                  {platform && <div className="row g-2 mt-3"><div className="col-md-6"><label className="form-label small">Assigned support user</label><select className="form-select" value={selected.assignee?.id || ""} disabled={saving} onChange={(e) => assignTicket(e.target.value)}><option value="">Unassigned</option>{assignees.map((user) => <option key={user.id} value={user.id}>{user.name} — {user.email}</option>)}</select></div><div className="col-md-3"><label className="form-label small">Status</label><select className="form-select" value={selected.status} disabled={saving} onChange={(e) => updateTicket({ status: e.target.value })}>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div><div className="col-md-3"><label className="form-label small">Priority</label><select className="form-select" value={selected.priority} disabled={saving} onChange={(e) => updateTicket({ priority: e.target.value })}>{priorities.map((value) => <option key={value}>{value}</option>)}</select></div></div>}
                </div>
                <div className="card-body" style={{ maxHeight: "48vh", overflowY: "auto", background: "#fbfcff" }}>
                  {(selected.messages || []).map((message) => { const mine = message.sender_type === (platform ? "support" : "school"); return <div key={message.id} className={`d-flex mb-3 ${mine ? "justify-content-end" : "justify-content-start"}`}><div style={{ maxWidth: "82%", background: message.is_internal_note ? "#fff7d6" : mine ? "#4f46e5" : "white", color: message.is_internal_note || !mine ? "#172033" : "white", border: message.is_internal_note ? "1px solid #facc15" : "1px solid #e5e7eb", borderRadius: 14, padding: "10px 13px" }}><div className="small fw-bold mb-1">{message.is_internal_note ? "Internal note · " : ""}{fullName(message.user)}</div><div style={{ whiteSpace: "pre-wrap" }}>{message.message}</div><div className="small mt-1" style={{ opacity: .72 }}>{formatDate(message.created_at)}</div></div></div>; })}
                </div>
                <form className="card-body border-top" onSubmit={sendReply}>
                  {selected.status === "closed" ? <div className="alert alert-secondary mb-0">This ticket is closed.{platform && <button type="button" className="btn btn-sm btn-outline-primary ms-2" onClick={() => updateTicket({ status: "open" })}>Reopen</button>}</div> : <><textarea className="form-control" rows={3} placeholder="Write a reply…" value={reply} onChange={(e) => setReply(e.target.value)} required />
                    <div className="d-flex justify-content-between align-items-center mt-2">{platform ? <label className="form-check"><input className="form-check-input" type="checkbox" checked={internalNote} onChange={(e) => setInternalNote(e.target.checked)} /><span className="form-check-label">Internal note (school cannot see this)</span></label> : <small className="text-muted">A support agent will be notified by email.</small>}<button className="btn btn-primary" disabled={saving || !reply.trim()}>{saving ? "Sending…" : internalNote ? "Add note" : "Send reply"}</button></div></>}
                </form>
              </div>}
          </div>
        </div>
      </main>
    </div></div>
    {showCreate && <div className="modal d-block" style={{ background: "rgba(15,23,42,.55)" }}><div className="modal-dialog modal-dialog-centered"><form className="modal-content" onSubmit={createTicket}><div className="modal-header"><h5 className="modal-title">Create support ticket</h5><button type="button" className="btn-close" onClick={() => setShowCreate(false)} /></div><div className="modal-body"><label className="form-label">Subject</label><input className="form-control mb-3" maxLength={180} required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Briefly describe the problem" /><div className="row g-3 mb-3"><div className="col-6"><label className="form-label">Category</label><select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((value) => <option key={value}>{value}</option>)}</select></div><div className="col-6"><label className="form-label">Priority</label><select className="form-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{priorities.map((value) => <option key={value}>{value}</option>)}</select></div></div><label className="form-label">What happened?</label><textarea className="form-control" rows={6} minLength={10} maxLength={10000} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Include the page, action, expected result, and error message." /></div><div className="modal-footer"><button type="button" className="btn btn-light" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving ? "Creating…" : "Create ticket"}</button></div></form></div></div>}
  </>;
}
