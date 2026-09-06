import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import { authApi } from "../../utils/axios";
import { useToast } from "../../contexts/ToastContext";

type Plan = {
  id: number;
  name: string;
  price?: number | null;
  duration_in_days?: number | null;
};

type AdminUser = {
  id: number;
  firstname?: string;
  surname?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  role?: string | null;
  status?: string | number | null;
  created_at?: string | null;
  school_id?: number | null;
  school?: {
    id?: number;
    school_name?: string;
    email?: string;
    phone?: string;
    address?: string;
  } | null;
};

type SubscriptionDetails = {
  id: number;
  status: string;
  auto_renew: boolean;
  auto_renew_source: "wallet" | "card" | string;
  starts_at?: string | null;
  ends_at?: string | null;
  plan?: Plan | null;
};

type PaymentRow = {
  id: number;
  reference: string;
  amount: number;
  status: string;
  channel?: string | null;
  card_type?: string | null;
  last4?: string | null;
  starts_at?: string | null;
  created_at?: string | null;
  plan?: Plan | null;
};

type BillingPayload = {
  subscription: SubscriptionDetails | null;
  payments: PaymentRow[];
};

/* =========================
   HELPERS
========================= */

type Tier = "free" | "premium_active" | "premium_expired";

function isFreePlanName(name?: string | null) {
  const n = (name || "").trim().toLowerCase();
  return !n || n === "free";
}

function deriveTierFromSub(sub?: SubscriptionDetails | null): Tier {
  const planName = sub?.plan?.name ?? null;

  if (!sub || isFreePlanName(planName)) return "free";

  const ends = sub.ends_at ? new Date(sub.ends_at) : null;
  if (ends && !Number.isNaN(ends.getTime())) {
    return ends.getTime() >= Date.now() ? "premium_active" : "premium_expired";
  }

  return "premium_active";
}

function tierLabel(t: Tier) {
  if (t === "premium_active") return "Premium (Active)";
  if (t === "premium_expired") return "Premium (Expired)";
  return "Free";
}

function tierBadge(t: Tier) {
  if (t === "premium_active") return "bg-success";
  if (t === "premium_expired") return "bg-warning text-dark";
  return "bg-secondary";
}

function fmtDate(val?: string | null) {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtNaira(n: number) {
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(n);
  } catch {
    return `₦${Number(n || 0).toLocaleString()}`;
  }
}

function fullName(u?: AdminUser | null) {
  if (!u) return "—";
  const composed = `${u.surname ?? ""} ${u.firstname ?? ""}`.trim();
  return composed || u.name || u.email || "—";
}

function badge(status: string) {
  const s = (status || "").toLowerCase();
  if (s.includes("success")) return "bg-success";
  if (s.includes("pending")) return "bg-warning text-dark";
  if (s.includes("fail")) return "bg-danger";
  if (s.includes("cancel")) return "bg-secondary";
  if (s.includes("active")) return "bg-success";
  if (s.includes("expire")) return "bg-danger";
  return "bg-light text-dark";
}

export default function AdminUserDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { showSuccess, showError, showToast } = useToast();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [billing, setBilling] = useState<BillingPayload>({ subscription: null, payments: [] });

  const [q, setQ] = useState("");

  // Edit profile state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    firstname: "",
    surname: "",
    email: "",
    phone: "",
    address: "",
    school_name: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Password reset state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [customPassword, setCustomPassword] = useState("");
  const [passwordResult, setPasswordResult] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Status toggle state
  const [togglingStatus, setTogglingStatus] = useState(false);

  const loadAdminDetails = () => {
    if (!id) return;
    setLoading(true);
    authApi
      .get(`/admin-users/view/${id}`)
      .then((res) => {
        setAdmin(res.data?.admin || null);
        setBilling(res.data?.billing || { subscription: null, payments: [] });
      })
      .catch((err) => {
        console.error(err);
        showError(err?.response?.data?.message || "Failed to load admin details.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAdminDetails();
  }, [id]);

  const filteredPayments = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return billing.payments;
    return billing.payments.filter((p) => {
      return (
        (p.reference || "").toLowerCase().includes(s) ||
        (p.plan?.name || "").toLowerCase().includes(s) ||
        (p.status || "").toLowerCase().includes(s) ||
        (p.channel || "").toLowerCase().includes(s)
      );
    });
  }, [billing.payments, q]);

  const sub = billing.subscription;
  const tier = useMemo(() => deriveTierFromSub(sub), [sub]);
  const isPremium = tier !== "free";
  const isPremiumActive = tier === "premium_active";
  const isSuspended = admin && String(admin.status) === "0";

  const openEditModal = () => {
    if (!admin) return;
    setEditForm({
      firstname: admin.firstname || "",
      surname: admin.surname || "",
      email: admin.email || "",
      phone: admin.phone || "",
      address: admin.address || "",
      school_name: admin.school?.school_name || "",
    });
    setShowEditModal(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin) return;
    setSavingEdit(true);
    try {
      const res = await authApi.put(`/admin-users/${admin.id}`, editForm);
      showSuccess(res.data?.message || "Admin profile updated successfully.");
      setShowEditModal(false);
      loadAdminDetails();
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to update admin profile.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!admin) return;
    const willSuspend = !isSuspended;
    const msg = willSuspend
      ? `Suspend and deactivate school admin ${fullName(admin)} (${admin.email})?\n\nAll active logins for this school will be terminated immediately.`
      : `Reactivate and reinstate school admin ${fullName(admin)} (${admin.email})?`;
    if (!window.confirm(msg)) return;

    setTogglingStatus(true);
    try {
      const res = await authApi.patch(`/admin-users/${admin.id}/toggle-status`, {
        status: willSuspend ? 0 : 1,
      });
      showSuccess(res.data?.message || "Admin status updated.");
      loadAdminDetails();
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to update admin status.");
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin) return;
    setResettingPassword(true);
    try {
      const payload = customPassword.trim() ? { password: customPassword.trim() } : {};
      const res = await authApi.post(`/admin-users/${admin.id}/reset-password`, payload);
      setPasswordResult(res.data?.temporary_password);
      showSuccess(res.data?.message || "Admin password reset successfully.");
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to reset admin password.");
    } finally {
      setResettingPassword(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!", "success");
  };

  return (
    <>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto px-4 d-flex flex-column min-vh-100 sa-main">
            {loading && <Loader message="Loading admin details..." />}

            {/* HERO */}
            <div
              className="mt-4 p-4 position-relative overflow-hidden sa-hero"
              style={{
                borderRadius: 16,
                background: isSuspended
                  ? "linear-gradient(135deg, #450a0a 0%, #1e092b 100%)"
                  : undefined,
              }}
            >
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                <div>
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
                      <i className="bi bi-person-lines-fill me-1" />
                      School Admin
                    </span>

                    {/* Account Status Badge */}
                    <span
                      className={`badge px-3 py-2 ${isSuspended ? "bg-danger text-white" : "bg-success text-white"}`}
                      style={{
                        borderRadius: 999,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    >
                      <i className={`bi ${isSuspended ? "bi-shield-x" : "bi-shield-check"} me-1`} />
                      {isSuspended ? "ACCOUNT SUSPENDED" : "ACCOUNT ACTIVE"}
                    </span>

                    {/* Tier chip */}
                    <span
                      className={`badge px-3 py-2 ${tierBadge(tier)}`}
                      style={{
                        borderRadius: 999,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    >
                      <i className={`bi ${isPremium ? "bi-award-fill" : "bi-person-fill"} me-1`} />
                      {tierLabel(tier)}
                    </span>

                    {/* Premium status chip */}
                    {isPremium && (
                      <span
                        className="badge px-3 py-2"
                        style={{
                          backgroundColor: isPremiumActive ? "rgba(16, 185, 129, 0.9)" : "rgba(245, 158, 11, 0.9)",
                          color: "#fff",
                          borderRadius: 999,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                        }}
                      >
                        <i className={`bi ${isPremiumActive ? "bi-check-circle-fill" : "bi-exclamation-triangle-fill"} me-1`} />
                        {isPremiumActive ? "Premium Active" : "Premium Expired"}
                      </span>
                    )}
                  </div>

                  <h2 className="fw-bold text-white mb-1">{fullName(admin)}</h2>
                  <p className="text-white mb-0" style={{ opacity: 0.9 }}>
                    {admin?.school?.school_name ? `${admin.school.school_name} — ` : ""}
                    Profile, operations, and billing records.
                  </p>
                </div>

                <div className="d-flex gap-2 flex-wrap">
                  <button className="btn btn-light btn-sm" style={{ borderRadius: 10, fontWeight: 700 }} onClick={() => navigate(-1)}>
                    <i className="bi bi-arrow-left me-1" />
                    Back
                  </button>
                  <button className="btn btn-outline-light btn-sm" style={{ borderRadius: 10, fontWeight: 700 }} onClick={() => navigate("/superadmin/subscribers")}>
                    <i className="bi bi-people me-1" />
                    Subscribers
                  </button>
                </div>
              </div>
            </div>

            {/* SUSPENSION WARNING BANNER */}
            {isSuspended && (
              <div className="alert alert-danger mt-3 d-flex align-items-center justify-content-between p-3" style={{ borderRadius: 12 }}>
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-octagon-fill fs-4 text-danger" />
                  <div>
                    <strong>This School Admin Account is Currently Suspended</strong>
                    <div className="small">All school staff, teachers, and student portal logins are blocked from signing in.</div>
                  </div>
                </div>
                <button className="btn btn-success btn-sm fw-bold px-3" onClick={handleToggleStatus} disabled={togglingStatus}>
                  <i className="bi bi-play-circle me-1" />
                  Reinstate / Activate Account
                </button>
              </div>
            )}

            {/* SUPER ADMIN OPERATIONS TOOLBAR */}
            <div className="card border-0 shadow-sm mt-3" style={{ borderRadius: 14, background: "#0f172a", color: "#fff" }}>
              <div className="card-body p-3 p-md-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div>
                  <div className="fw-bold text-white fs-6">
                    <i className="bi bi-sliders text-warning me-2" />
                    Super-Admin Management Operations
                  </div>
                  <div className="text-muted small" style={{ color: "#94a3b8" }}>
                    Modify personal profile details, reset master credentials, or suspend account access.
                  </div>
                </div>

                <div className="d-flex gap-2 flex-wrap">
                  <button className="btn btn-primary btn-sm px-3" style={{ borderRadius: 8, fontWeight: 700 }} onClick={openEditModal}>
                    <i className="bi bi-pencil-square me-1" />
                    Edit Profile
                  </button>

                  <button
                    className="btn btn-secondary btn-sm px-3"
                    style={{ borderRadius: 8, fontWeight: 700 }}
                    onClick={() => {
                      setPasswordResult(null);
                      setCustomPassword("");
                      setShowPasswordModal(true);
                    }}
                  >
                    <i className="bi bi-key me-1" />
                    Reset Password
                  </button>

                  {isSuspended ? (
                    <button className="btn btn-success btn-sm px-3" style={{ borderRadius: 8, fontWeight: 700 }} onClick={handleToggleStatus} disabled={togglingStatus}>
                      <i className="bi bi-shield-check me-1" />
                      {togglingStatus ? "Activating..." : "Reinstate Account"}
                    </button>
                  ) : (
                    <button className="btn btn-danger btn-sm px-3" style={{ borderRadius: 8, fontWeight: 700 }} onClick={handleToggleStatus} disabled={togglingStatus}>
                      <i className="bi bi-shield-x me-1" />
                      {togglingStatus ? "Suspending..." : "Suspend Account"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* BODY */}
            <div className="row g-4 my-3">
              {/* Profile */}
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
                  <div className="card-body p-3 p-md-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <div className="fw-semibold" style={{ color: "#1e293b" }}>
                          User Profile
                        </div>
                        <div className="text-muted small">Personal account & contact details.</div>
                      </div>
                      <button className="btn btn-outline-primary btn-sm" onClick={openEditModal}>
                        <i className="bi bi-pencil me-1" /> Edit
                      </button>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                          <div className="text-muted small">Full Name</div>
                          <div className="fw-bold">{fullName(admin)}</div>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                          <div className="text-muted small">Email</div>
                          <div className="fw-bold">{admin?.email || "—"}</div>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                          <div className="text-muted small">Phone</div>
                          <div className="fw-bold">{admin?.phone || "—"}</div>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                          <div className="text-muted small">Status</div>
                          <div className="fw-bold">
                            {isSuspended ? (
                              <span className="text-danger">● Suspended</span>
                            ) : (
                              <span className="text-success">● Active</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                          <div className="text-muted small">User ID</div>
                          <div className="fw-bold">#{admin?.id ?? "-"}</div>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                          <div className="text-muted small">Registered Date</div>
                          <div className="fw-bold">{fmtDate(admin?.created_at)}</div>
                        </div>
                      </div>
                    </div>

                    {!admin && <div className="text-muted">No admin record found.</div>}
                  </div>
                </div>
              </div>

              {/* School */}
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
                  <div className="card-body p-3 p-md-4">
                    <div className="fw-semibold mb-1" style={{ color: "#1e293b" }}>
                      School Information
                    </div>
                    <div className="text-muted small mb-3">School linked to this admin account.</div>

                    <div className="row g-3">
                      <div className="col-md-12">
                        <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                          <div className="text-muted small">School Name</div>
                          <div className="fw-bold">{admin?.school?.school_name || "—"}</div>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                          <div className="text-muted small">School Email</div>
                          <div className="fw-bold">{admin?.school?.email || "—"}</div>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                          <div className="text-muted small">School Phone</div>
                          <div className="fw-bold">{admin?.school?.phone || "—"}</div>
                        </div>
                      </div>

                      <div className="col-md-12">
                        <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                          <div className="text-muted small">Address</div>
                          <div className="fw-bold">{admin?.school?.address || admin?.address || "—"}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subscription */}
              <div className="col-12">
                <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                  <div className="card-body p-3 p-md-4">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                      <div>
                        <div className="fw-semibold" style={{ color: "#1e293b" }}>
                          Subscription Details
                        </div>
                        <div className="text-muted small">Current active package and renewal info.</div>
                      </div>
                      <span className={`badge ${badge(sub?.status || "Free")} px-3 py-2`} style={{ borderRadius: 999 }}>
                        {sub?.status || "Free"}
                      </span>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-3">
                        <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                          <div className="text-muted small">Plan</div>
                          <div className="fw-bold">{sub?.plan?.name || "Free"}</div>
                        </div>
                      </div>

                      <div className="col-md-3">
                        <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                          <div className="text-muted small">Price</div>
                          <div className="fw-bold">{sub?.plan?.price ? fmtNaira(sub.plan.price) : "—"}</div>
                        </div>
                      </div>

                      <div className="col-md-3">
                        <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                          <div className="text-muted small">Starts</div>
                          <div className="fw-bold">{fmtDate(sub?.starts_at)}</div>
                        </div>
                      </div>

                      <div className="col-md-3">
                        <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                          <div className="text-muted small">Ends</div>
                          <div className="fw-bold">{sub?.ends_at ? fmtDate(sub?.ends_at) : "Lifetime"}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="col-12">
                <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                  <div className="card-body p-3 p-md-4">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                      <div>
                        <div className="fw-semibold" style={{ color: "#1e293b" }}>
                          Billing History
                        </div>
                        <div className="text-muted small">All payments made by this school admin.</div>
                      </div>

                      <input
                        type="text"
                        className="form-control form-control-sm"
                        style={{ maxWidth: 260, borderRadius: 8 }}
                        placeholder="Search payments..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                      />
                    </div>

                    {filteredPayments.length === 0 ? (
                      <div className="text-center py-4 text-muted small">No payment records found.</div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                          <thead className="table-light small">
                            <tr>
                              <th>Reference</th>
                              <th>Plan</th>
                              <th>Amount</th>
                              <th>Channel</th>
                              <th>Status</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredPayments.map((p) => (
                              <tr key={p.id}>
                                <td className="font-monospace small">{p.reference}</td>
                                <td>{p.plan?.name || "—"}</td>
                                <td className="fw-bold">{fmtNaira(p.amount)}</td>
                                <td className="text-uppercase small">{p.channel || "—"}</td>
                                <td>
                                  <span className={`badge ${badge(p.status)} px-2 py-1`}>{p.status}</span>
                                </td>
                                <td className="small text-muted">{fmtDate(p.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
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

      {/* EDIT ADMIN PROFILE MODAL */}
      {showEditModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: 16, overflow: "hidden" }}>
              <div className="modal-header bg-dark text-white p-3 border-0">
                <h5 className="modal-title fs-6 fw-bold text-white d-flex align-items-center gap-2 m-0">
                  <i className="bi bi-pencil-square text-warning" />
                  Edit Admin Profile Details
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowEditModal(false)} />
              </div>
              <form onSubmit={handleUpdateProfile}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold small">First Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={editForm.firstname}
                        onChange={(e) => setEditForm({ ...editForm, firstname: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold small">Surname *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={editForm.surname}
                        onChange={(e) => setEditForm({ ...editForm, surname: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold small">Email Address *</label>
                      <input
                        type="email"
                        className="form-control"
                        required
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold small">Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold small">School Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.school_name}
                        onChange={(e) => setEditForm({ ...editForm, school_name: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold small">Address</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light p-3">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm px-4 fw-bold" disabled={savingEdit}>
                    {savingEdit ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* RESET ADMIN PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: 16, overflow: "hidden" }}>
              <div className="modal-header bg-dark text-white p-3 border-0">
                <h5 className="modal-title fs-6 fw-bold text-white d-flex align-items-center gap-2 m-0">
                  <i className="bi bi-key-fill text-warning" />
                  Reset Admin Password
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowPasswordModal(false)} />
              </div>
              <form onSubmit={handleResetPassword}>
                <div className="modal-body p-4">
                  {passwordResult ? (
                    <div className="text-center">
                      <i className="bi bi-check-circle-fill text-success fs-1 mb-2" />
                      <h6>Password Reset Successful</h6>
                      <p className="small text-muted mb-3">
                        The password for <strong>{admin?.email}</strong> has been updated. Active sessions were logged out.
                      </p>
                      <div className="p-3 bg-light rounded-3 border d-flex justify-content-between align-items-center mb-3">
                        <code className="fs-4 fw-bold text-primary">{passwordResult}</code>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => copyToClipboard(passwordResult)}>
                          <i className="bi bi-clipboard me-1" /> Copy
                        </button>
                      </div>
                      <button type="button" className="btn btn-primary w-100" onClick={() => setShowPasswordModal(false)}>
                        Done
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-muted small mb-3">
                        Reset the password for <strong>{fullName(admin)}</strong> (<code>{admin?.email}</code>). Leave blank to automatically generate a secure 10-character password.
                      </p>

                      <div className="mb-3">
                        <label className="form-label fw-bold small">Custom Password (Optional)</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Leave blank to auto-generate"
                          value={customPassword}
                          onChange={(e) => setCustomPassword(e.target.value)}
                        />
                      </div>

                      <div className="alert alert-warning py-2 px-3 small d-flex align-items-center gap-2">
                        <i className="bi bi-exclamation-triangle-fill" />
                        Resetting the password will immediately revoke all active sessions for this admin.
                      </div>
                    </>
                  )}
                </div>
                {!passwordResult && (
                  <div className="modal-footer bg-light p-3">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPasswordModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary btn-sm px-4 fw-bold" disabled={resettingPassword}>
                      {resettingPassword ? "Resetting..." : "Confirm Password Reset"}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
