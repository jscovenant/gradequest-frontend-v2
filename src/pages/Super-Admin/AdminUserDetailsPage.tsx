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

  // If no subscription or plan is Free => Free tier
  if (!sub || isFreePlanName(planName)) return "free";

  // Premium: active vs expired by ends_at (status may be unreliable)
  const ends = sub.ends_at ? new Date(sub.ends_at) : null;
  if (ends && !Number.isNaN(ends.getTime())) {
    return ends.getTime() >= Date.now() ? "premium_active" : "premium_expired";
  }

  // Premium, no ends_at => treat as active
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
  const { showError } = useToast();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [billing, setBilling] = useState<BillingPayload>({ subscription: null, payments: [] });

  const [q, setQ] = useState("");

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

  useEffect(() => {
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
  }, [id, showError]);

  const sub = billing.subscription;

  // ✅ tier + hero labels
  const tier = useMemo(() => deriveTierFromSub(sub), [sub]);
  const isPremium = tier !== "free";
  const isPremiumActive = tier === "premium_active";

  return (
    <>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto px-4 d-flex flex-column min-vh-100" style={{ backgroundColor: "#f8f9fa" }}>
            {loading && <Loader message="Loading admin details..." />}

            {/* HERO */}
            <div
              className="mt-4 p-4 position-relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: 16,
                boxShadow: "0 10px 30px rgba(102, 126, 234, 0.3)",
              }}
            >
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
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
                      Admin Details
                    </span>

                    {/* ✅ Tier chip */}
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

                    {/* ✅ Premium status chip (active vs expired) */}
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
                      /admin-users/view/{id}
                    </span>
                  </div>

                  <h2 className="fw-bold text-white mb-1">{fullName(admin)}</h2>
                  <p className="text-white mb-0" style={{ opacity: 0.9 }}>
                    Profile, school, and billing records.
                  </p>
                </div>

                <div className="d-flex gap-2">
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

            {/* BODY */}
            <div className="row g-4 my-3">
              {/* Profile */}
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
                  <div className="card-body p-3 p-md-4">
                    <div className="fw-semibold mb-1" style={{ color: "#1e293b" }}>
                      User Profile
                    </div>
                    <div className="text-muted small mb-3">Basic account details.</div>

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
                          <div className="fw-bold">{admin?.status ?? "—"}</div>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                          <div className="text-muted small">User ID</div>
                          <div className="fw-bold">{admin?.id ?? "—"}</div>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                          <div className="text-muted small">Created</div>
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
                          <div className="fw-bold">{admin?.school?.address || "—"}</div>
                        </div>
                      </div>
                    </div>

                    {!admin?.school && (
                      <div className="text-muted mt-3">
                        <i className="bi bi-info-circle me-1" />
                        No school record attached.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* BILLING SUMMARY */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
              <div className="card-body p-3 p-md-4">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div>
                    <div className="fw-semibold" style={{ color: "#1e293b" }}>
                      Billing Summary
                    </div>
                    <div className="text-muted small">Subscription tier (Free / Premium Active / Premium Expired).</div>
                  </div>

                  {/* ✅ Tier summary pill */}
                  <span className={`badge ${tierBadge(tier)}`} style={{ borderRadius: 999, padding: "0.6rem 0.9rem" }}>
                    <i className={`bi ${isPremium ? "bi-award-fill" : "bi-person-fill"} me-1`} />
                    {tierLabel(tier)}
                  </span>
                </div>

                <div className="row g-3 mt-1">
                  <div className="col-md-3">
                    <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                      <div className="text-muted small">Plan</div>
                      <div className="fw-bold">{sub?.plan?.name || (tier === "free" ? "Free" : "—")}</div>
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                      <div className="text-muted small">Subscription Status</div>
                      <div className="fw-bold">
                        <span className={`badge ${badge(sub?.status || "")}`} style={{ borderRadius: 999 }}>
                          {sub?.status || (tier === "free" ? "free" : "—")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                      <div className="text-muted small">Auto Renew</div>
                      <div className="fw-bold">{sub ? (sub.auto_renew ? "Enabled" : "Disabled") : "—"}</div>
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                      <div className="text-muted small">Renewal Source</div>
                      <div className="fw-bold">{sub?.auto_renew_source || "—"}</div>
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                      <div className="text-muted small">Start</div>
                      <div className="fw-bold">{fmtDate(sub?.starts_at)}</div>
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                      <div className="text-muted small">End</div>
                      <div className="fw-bold">{fmtDate(sub?.ends_at)}</div>
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                      <div className="text-muted small">Amount</div>
                      <div className="fw-bold">{sub?.plan?.price != null ? fmtNaira(Number(sub.plan.price)) : "—"}</div>
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="p-3 rounded-3" style={{ background: "#f8fafc" }}>
                      <div className="text-muted small">Duration</div>
                      <div className="fw-bold">{sub?.plan?.duration_in_days ? `${sub.plan.duration_in_days} days` : "—"}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-muted small">
                  <i className="bi bi-info-circle me-1" />
                  Premium is determined by <b>plan.name</b> (not Free) and expiry is determined by <b>ends_at</b>.
                  Expired subscriptions are still treated as <b>Premium (Expired)</b>.
                </div>
              </div>
            </div>

            {/* BILLING HISTORY */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
              <div className="card-body p-3 p-md-4">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                  <div>
                    <div className="fw-semibold" style={{ color: "#1e293b" }}>
                      Billing Records
                    </div>
                    <div className="text-muted small">Payments made by this admin account.</div>
                  </div>

                  <div className="input-group" style={{ maxWidth: 360 }}>
                    <span className="input-group-text">
                      <i className="bi bi-search" />
                    </span>
                    <input className="form-control" placeholder="Search by reference, plan, status..." value={q} onChange={(e) => setQ(e.target.value)} />
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{ background: "#eef2ff" }}>
                      <tr>
                        <th>Date</th>
                        <th>Plan</th>
                        <th>Amount</th>
                        <th>Channel</th>
                        <th>Reference</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center text-muted py-4">
                            No billing records found.
                          </td>
                        </tr>
                      ) : (
                        filteredPayments.map((p) => (
                          <tr key={p.id}>
                            <td className="text-muted">{fmtDate(p.created_at || p.starts_at)}</td>
                            <td>
                              <div className="fw-semibold">{p.plan?.name || "—"}</div>
                              <small className="text-muted">{p.card_type && p.last4 ? `${p.card_type} • ${p.last4}` : ""}</small>
                            </td>
                            <td className="fw-bold">{fmtNaira(Number(p.amount || 0))}</td>
                            <td className="text-capitalize">{p.channel || "—"}</td>
                            <td>
                              <code style={{ fontSize: 12 }}>{p.reference}</code>
                            </td>
                            <td>
                              <span className={`badge ${badge(p.status)}`} style={{ borderRadius: 999 }}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 text-muted small">
                  <i className="bi bi-info-circle me-1" />
                  This is a read-only view for Super Admin monitoring.
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
