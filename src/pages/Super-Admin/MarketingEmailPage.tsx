import { useEffect, useMemo, useState } from "react";

import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import { authApi } from "../../utils/axios";
import { useToast } from "../../contexts/ToastContext";

type RecipientTier = "free" | "premium_active" | "premium_expired";

type Recipient = {
  id?: number;
  firstname?: string;
  surname?: string;
  email: string;
  status?: string | number | null;

  // NEW (from backend)
  tier?: RecipientTier;
  plan_name?: string | null;
  subscription_status?: string | null;
  subscription_starts_at?: string | null;
  subscription_ends_at?: string | null;
};

function fullName(r: Recipient) {
  return `${r.firstname ?? ""} ${r.surname ?? ""}`.trim() || r.email;
}

function safeEmail(e?: string) {
  return (e || "").trim().toLowerCase();
}

function fmtDate(val?: string | null) {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function tierLabel(t?: string) {
  const x = (t || "free").toLowerCase();
  if (x === "premium_active") return "Premium (Active)";
  if (x === "premium_expired") return "Premium (Expired)";
  return "Free";
}

function tierBadge(t?: string) {
  const x = (t || "").toLowerCase();
  if (x === "premium_active") return "bg-success";
  if (x === "premium_expired") return "bg-warning text-dark";
  if (x === "free") return "bg-secondary";
  return "bg-light text-dark";
}

export default function MarketingEmailPage() {
  const { showError, showSuccess } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // recipients list (from backend list endpoint)
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({}); // keyed by email
  const [search, setSearch] = useState("");

  // NEW: audience filter
  const [tierFilter, setTierFilter] = useState<
    "all" | "free" | "premium_all" | "premium_active" | "premium_expired"
  >("all");

  // form
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState(
    "Hello {firstname},\n\nWe have a quick update for you...\n\nRegards,\nGradeQuest Team"
  );

  // optional: paste emails
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteEmails, setPasteEmails] = useState("");

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  const filteredRecipients = useMemo(() => {
    const q = search.trim().toLowerCase();

    return recipients.filter((r) => {
      // tier filter first
      const tier = (r.tier || "free").toLowerCase();

      if (tierFilter === "free" && tier !== "free") return false;

      if (tierFilter === "premium_active" && tier !== "premium_active") return false;

      if (tierFilter === "premium_expired" && tier !== "premium_expired") return false;

      if (
        tierFilter === "premium_all" &&
        !(tier === "premium_active" || tier === "premium_expired")
      )
        return false;

      // search
      if (!q) return true;

      const name = `${r.firstname ?? ""} ${r.surname ?? ""}`.toLowerCase();
      const email = (r.email || "").toLowerCase();
      const plan = (r.plan_name || "").toLowerCase();

      return name.includes(q) || email.includes(q) || plan.includes(q) || tier.includes(q);
    });
  }, [recipients, search, tierFilter]);

  const allFilteredChecked = useMemo(() => {
    if (filteredRecipients.length === 0) return false;
    return filteredRecipients.every((r) => selected[safeEmail(r.email)] === true);
  }, [filteredRecipients, selected]);

  const loadRecipients = async () => {
    // returns: { users: [...] }
    const res = await authApi.get("/mail/admin-users");
    const users = (res.data?.users || []) as any[];

    const mapped: Recipient[] = users
      .filter((u) => u?.email)
      .map((u) => ({
        id: u.id,
        firstname: u.firstname,
        surname: u.surname,
        email: u.email,
        status: u.status,

        tier: u.tier,
        plan_name: u.plan_name,
        subscription_status: u.subscription_status,
        subscription_starts_at: u.subscription_starts_at,
        subscription_ends_at: u.subscription_ends_at,
      }));

    setRecipients(mapped);
    setSelected((prev) => prev); // keep previous selection if any
  };

  useEffect(() => {
    setLoading(true);
    loadRecipients()
      .catch((err) => {
        console.error(err);
        showError(err?.response?.data?.message || "Failed to load recipients.");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleAllFiltered = () => {
    const next = { ...selected };
    filteredRecipients.forEach((r) => {
      next[safeEmail(r.email)] = !allFilteredChecked;
    });
    setSelected(next);
  };

  const toggleOne = (email: string) => {
    const key = safeEmail(email);
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const clearSelection = () => setSelected({});

  // selectAll removed because it was declared but never used

  const selectPremiumAll = () => {
    const next: Record<string, boolean> = {};
    recipients.forEach((r) => {
      const t = (r.tier || "free").toLowerCase();
      if (t === "premium_active" || t === "premium_expired") next[safeEmail(r.email)] = true;
    });
    setSelected(next);
  };

  const selectFreeOnly = () => {
    const next: Record<string, boolean> = {};
    recipients.forEach((r) => {
      const t = (r.tier || "free").toLowerCase();
      if (t === "free") next[safeEmail(r.email)] = true;
    });
    setSelected(next);
  };

  const resolveRecipientsPayload = (): { email: string; firstname?: string }[] => {
    // If paste mode, parse and send those addresses.
    if (pasteMode) {
      const emails = pasteEmails
        .split(/[\n,; ]+/)
        .map((x) => x.trim())
        .filter(Boolean)
        .filter((x) => x.includes("@"));

      const uniq = Array.from(new Set(emails.map((e) => e.toLowerCase())));

      return uniq.map((email) => {
        const match = recipients.find((r) => safeEmail(r.email) === safeEmail(email));
        return { email, firstname: match?.firstname || "dear Sir/Ma" };
      });
    }

    // else use selected list from table
    const chosen = recipients.filter((r) => selected[safeEmail(r.email)]);
    return chosen.map((r) => ({ email: r.email, firstname: r.firstname || "dear Sir/Ma" }));
  };

  const validateForm = (): string | null => {
    if (!subject.trim()) return "Subject is required.";
    if (!content.trim()) return "Content is required.";

    const payload = resolveRecipientsPayload();
    if (payload.length === 0) return "Please select at least one recipient.";

    return null;
  };

  const sendEmails = async () => {
    const errMsg = validateForm();
    if (errMsg) return showError(errMsg);

    const payload = {
      subject: subject.trim(),
      content,
      recipients: resolveRecipientsPayload(),
    };

    setSending(true);
    try {
      await authApi.post("/send-marketing-emails", payload);
      showSuccess("Emails sent successfully.");
      clearSelection();
      setPasteEmails("");
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Failed to send emails.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto px-4 d-flex flex-column min-vh-100" style={{ backgroundColor: "#f8f9fa" }}>
            {(loading || sending) && <Loader message={loading ? "Loading recipients..." : "Sending emails..."} />}

            {/* HERO */}
            <div
              className="mt-4 p-4 position-relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: 16,
                boxShadow: "0 10px 30px rgba(102, 126, 234, 0.3)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-50px",
                  right: "-50px",
                  width: 220,
                  height: 220,
                  background: "rgba(255, 255, 255, 0.10)",
                  borderRadius: "50%",
                  filter: "blur(40px)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "-30px",
                  left: "-30px",
                  width: 160,
                  height: 160,
                  background: "rgba(255, 255, 255, 0.10)",
                  borderRadius: "50%",
                  filter: "blur(40px)",
                }}
              />

              <div className="row align-items-center position-relative g-3">
                <div className="col-lg-8">
                  <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                    <span
                      className="badge px-3 py-2"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        color: "#fff",
                        borderRadius: 999,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      <i className="bi bi-megaphone-fill me-1" />
                      Marketing Email
                    </span>

                    <span
                      className="badge px-3 py-2"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        color: "#fff",
                        borderRadius: 999,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      <i className="bi bi-link-45deg me-1" />
                      POST /send-marketing-emails
                    </span>

                    <span
                      className="badge px-3 py-2"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        color: "#fff",
                        borderRadius: 999,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      <i className="bi bi-people-fill me-1" />
                      Selected: {selectedCount}
                    </span>
                  </div>

                  <h2 className="fw-bold text-white mb-2">Send Marketing Emails</h2>
                  <p className="text-white mb-0" style={{ opacity: 0.9, fontSize: "1rem" }}>
                    Target <b>Free</b>, <b>Premium Active</b>, or <b>Premium Expired</b> users. Use{" "}
                    <b>{"{firstname}"}</b> to personalize.
                  </p>
                </div>

                <div className="col-lg-4 d-none d-lg-block">
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(10px)",
                      borderRadius: 16,
                      padding: "1.25rem",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-white" style={{ fontSize: "0.9rem", opacity: 0.9 }}>
                        Quick Actions
                      </span>
                      <i className="bi bi-lightning-charge text-white" />
                    </div>

                    <div className="d-flex flex-column gap-2">
                      <button className="btn btn-light btn-sm" style={{ borderRadius: 10, fontWeight: 700 }} onClick={sendEmails} disabled={sending || loading}>
                        <i className="bi bi-send-fill me-1" />
                        Send Now
                      </button>

                      <button className="btn btn-outline-light btn-sm" style={{ borderRadius: 10 }} onClick={selectPremiumAll} disabled={sending || loading}>
                        <i className="bi bi-star-fill me-1" />
                        Select Premium
                      </button>

                      <button className="btn btn-outline-light btn-sm" style={{ borderRadius: 10 }} onClick={selectFreeOnly} disabled={sending || loading}>
                        <i className="bi bi-person-x-fill me-1" />
                        Select Free
                      </button>

                      <button className="btn btn-outline-light btn-sm" style={{ borderRadius: 10 }} onClick={clearSelection} disabled={sending || loading}>
                        <i className="bi bi-x-circle me-1" />
                        Clear Selection
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COMPOSE */}
            <div className="card border-0 shadow-sm my-4" style={{ borderRadius: 12 }}>
              <div className="card-body p-3 p-md-4">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                  <div>
                    <div className="fw-semibold" style={{ color: "#1e293b" }}>
                      Compose Email
                    </div>
                    <div className="text-muted small">
                      Tip: Use <code>{"{firstname}"}</code> to personalize each recipient.
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="pasteMode" checked={pasteMode} onChange={(e) => setPasteMode(e.target.checked)} />
                      <label className="form-check-label small" htmlFor="pasteMode">
                        Paste emails mode
                      </label>
                    </div>

                    <button className="btn btn-primary" style={{ borderRadius: 10, fontWeight: 700 }} onClick={sendEmails} disabled={sending || loading}>
                      <i className="bi bi-send me-2" />
                      Send Campaign
                    </button>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-lg-6">
                    <label className="form-label fw-semibold">Subject</label>
                    <input className="form-control" placeholder="e.g. New Feature Update for Your School" value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </div>

                  <div className="col-lg-6">
                    <label className="form-label fw-semibold">Audience</label>
                    <div className="d-flex gap-2 flex-wrap">
                      <select className="form-select" style={{ width: 260, borderRadius: 10 }} value={tierFilter} onChange={(e) => setTierFilter(e.target.value as any)} disabled={pasteMode}>
                        <option value="all">All users</option>
                        <option value="free">Free users</option>
                        <option value="premium_all">Premium (Active + Expired)</option>
                        <option value="premium_active">Premium (Active)</option>
                        <option value="premium_expired">Premium (Expired)</option>
                      </select>

                      <div className="p-2 px-3 rounded-3 text-muted small" style={{ background: "#f8fafc", border: "1px solid #e5e7eb" }}>
                        Paste mode ignores audience filter.
                      </div>
                    </div>
                  </div>

                  {pasteMode && (
                    <div className="col-12">
                      <label className="form-label fw-semibold">Paste Emails</label>
                      <textarea className="form-control" rows={3} placeholder="example1@email.com&#10;example2@email.com" value={pasteEmails} onChange={(e) => setPasteEmails(e.target.value)} />
                    </div>
                  )}

                  <div className="col-12">
                    <label className="form-label fw-semibold">Content</label>
                    <textarea className="form-control" rows={10} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your email here..." />
                    <div className="mt-2 text-muted small">
                      <i className="bi bi-info-circle me-1" />
                      Personalization supported: <code>{"{firstname}"}</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RECIPIENTS TABLE */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12, opacity: pasteMode ? 0.6 : 1 }}>
              <div className="card-body p-3 p-md-4">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                  <div>
                    <div className="fw-semibold" style={{ color: "#1e293b" }}>
                      Recipient List (Admin Users)
                    </div>
                    <div className="text-muted small">Loaded from: GET /mail/admin-users</div>
                  </div>

                  <div className="input-group" style={{ maxWidth: 420 }}>
                    <span className="input-group-text">
                      <i className="bi bi-search" />
                    </span>
                    <input className="form-control" placeholder="Search name/email/plan/tier..." value={search} onChange={(e) => setSearch(e.target.value)} disabled={pasteMode} />
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{ background: "#eef2ff" }}>
                      <tr>
                        <th style={{ width: 56 }}>
                          <input type="checkbox" className="form-check-input" checked={allFilteredChecked} onChange={toggleAllFiltered} disabled={pasteMode} />
                        </th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Tier</th>
                        <th>Plan</th>
                        <th>Ends</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRecipients.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center text-muted py-4">
                            No recipients found.
                          </td>
                        </tr>
                      ) : (
                        filteredRecipients.map((r) => {
                          const key = safeEmail(r.email);
                          return (
                            <tr key={key}>
                              <td>
                                <input type="checkbox" className="form-check-input" checked={!!selected[key]} onChange={() => toggleOne(r.email)} disabled={pasteMode} />
                              </td>

                              <td className="fw-semibold">{fullName(r)}</td>
                              <td className="text-muted">{r.email}</td>

                              <td>
                                <span className={`badge ${tierBadge(r.tier)}`} style={{ borderRadius: 999 }}>
                                  {tierLabel(r.tier)}
                                </span>
                              </td>

                              <td className="text-muted">{r.plan_name || "Free"}</td>
                              <td className="text-muted">{fmtDate(r.subscription_ends_at)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 d-flex flex-wrap gap-2 justify-content-between align-items-center">
                  <div className="text-muted small">
                    <i className="bi bi-info-circle me-1" />
                    In paste mode, selection list is ignored; only pasted emails will be used.
                  </div>

                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-light" style={{ borderRadius: 10 }} onClick={loadRecipients} disabled={sending || loading}>
                      <i className="bi bi-arrow-repeat me-1" />
                      Reload List
                    </button>
                    <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 10 }} onClick={clearSelection} disabled={pasteMode}>
                      Clear Selection
                    </button>
                  </div>
                </div>
              </div>
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
