// src/pages/SuperAdmin/SubscriptionPlansPage.tsx
import { useEffect, useMemo, useState } from "react";

import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import { authApi } from "../../utils/axios";
import { useToast } from "../../contexts/ToastContext";

/* =========================
   TYPES (match your DB)
========================= */

type PlanFeature = {
  id?: number;
  subscription_plan_id?: string | number;
  feature_name?: string;
  feature_key?: string;
  is_enabled?: string | number | boolean;
};

type Plan = {
  id: number;
  name: string;
  paystack_plan_code?: string | null;
  price: number;
  duration_in_days: number;
  description?: string | null;
  features?: string | PlanFeature[] | null;
  max_teachers?: number | null;
  max_students?: number | null;
  currency: string;
  is_active?: number | boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type FeatureDraft = {
  feature_name: string;
  feature_key: string;
  is_enabled: boolean;
};

type PlanForm = {
  name: string;
  price: number | "";
  paystack_plan_code: string;
  currency: string;
  duration_in_days: number | "";
  max_teachers: number | "";
  max_students: number | "";
  description: string;
  is_active: boolean;

  features: FeatureDraft[];
  newFeatureName: string;
  newFeatureKey: string;
};

/* =========================
   HELPERS
========================= */

function fmtDate(val?: string | null) {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtMoney(n: number, currency = "NGN") {
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: currency || "NGN" }).format(n);
  } catch {
    return `${currency || "NGN"} ${Number(n || 0).toLocaleString()}`;
  }
}

function asBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  const s = String(v ?? "").toLowerCase().trim();
  return s === "1" || s === "true" || s === "yes" || s === "enabled";
}

function normalizeKey(input: string) {
  return (input || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function safeParseFeatures(raw: Plan["features"]): PlanFeature[] {
  try {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as PlanFeature[];
    const parsed = JSON.parse(raw as string);
    return Array.isArray(parsed) ? (parsed as PlanFeature[]) : [];
  } catch {
    return [];
  }
}

function toDraftFeatures(raw: Plan["features"]): FeatureDraft[] {
  const arr = safeParseFeatures(raw);
  return arr
    .map((f) => ({
      feature_name: String(f.feature_name ?? f.feature_key ?? "").trim(),
      feature_key: String(f.feature_key ?? "").trim() || normalizeKey(String(f.feature_name ?? "")),
      is_enabled: asBool(f.is_enabled),
    }))
    .filter((f) => f.feature_name || f.feature_key);
}

function isFreePlan(plan: Plan) {
  const name = (plan.name || "").trim().toLowerCase();
  return Number(plan.price || 0) === 0 || name === "free";
}

function badgePlan(plan: Plan) {
  const active = asBool(plan.is_active);
  if (!active) return "bg-secondary";
  if (isFreePlan(plan)) return "bg-success";
  return "bg-primary";
}

function badgeText(plan: Plan) {
  const active = asBool(plan.is_active);
  if (!active) return "Inactive";
  if (isFreePlan(plan)) return "Free";
  return "Active";
}

/* =========================
   COMPONENT
========================= */

export default function SubscriptionPlansPage() {
  const { showError, showSuccess } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [plans, setPlans] = useState<Plan[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);

  const emptyForm: PlanForm = {
    name: "",
    price: "",
    paystack_plan_code: "",
    currency: "NGN",
    duration_in_days: "",
    max_teachers: "",
    max_students: "",
    description: "",
    is_active: true,
    features: [],
    newFeatureName: "",
    newFeatureKey: "",
  };

  const [form, setForm] = useState<PlanForm>(emptyForm);

  const resetForm = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const fetchPlans = async () => {
    const res = await authApi.get("/subscription-plans");
    const rows: Plan[] = Array.isArray(res.data) ? res.data : res.data?.data || [];
    setPlans(rows);
  };

  useEffect(() => {
    setLoading(true);
    fetchPlans()
      .catch((err) => {
        console.error(err);
        showError(err?.response?.data?.message || "Failed to load subscription plans.");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Prevent background scroll when modal is open
  useEffect(() => {
    if (!showModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showModal]);

  const visiblePlans = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plans.filter((p) => {
      const active = asBool(p.is_active);
      if (statusFilter === "active" && !active) return false;
      if (statusFilter === "inactive" && active) return false;

      if (!q) return true;

      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.currency || "").toLowerCase().includes(q) ||
        String(p.duration_in_days ?? "").includes(q) ||
        String(p.price ?? "").includes(q) ||
        (p.paystack_plan_code || "").toLowerCase().includes(q)
      );
    });
  }, [plans, search, statusFilter]);

  const stats = useMemo(() => {
    const total = plans.length;
    const active = plans.filter((p) => asBool(p.is_active)).length;
    const inactive = total - active;
    const free = plans.filter((p) => isFreePlan(p)).length;
    return { total, active, inactive, free };
  }, [plans]);

  /* =========================
     MODAL OPENERS
  ========================= */

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (p: Plan) => {
    setEditing(p);
    setForm({
      name: p.name || "",
      price: typeof p.price === "number" ? p.price : Number(p.price || 0),
      paystack_plan_code: p.paystack_plan_code || "",
      currency: p.currency || "NGN",
      duration_in_days: p.duration_in_days ?? "",
      max_teachers: p.max_teachers ?? "",
      max_students: p.max_students ?? "",
      description: p.description || "",
      is_active: asBool(p.is_active),
      features: toDraftFeatures(p.features),
      newFeatureName: "",
      newFeatureKey: "",
    });
    setShowModal(true);
  };

  /* =========================
     FEATURES UI
  ========================= */

  const addFeature = () => {
    const name = form.newFeatureName.trim();
    const key = (form.newFeatureKey || "").trim() || normalizeKey(name);

    if (!name && !key) return showError("Enter a feature name (or key).");

    const exists = form.features.some((f) => (f.feature_key || "").toLowerCase() === key.toLowerCase());
    if (exists) return showError("A feature with this key already exists.");

    setForm((p) => ({
      ...p,
      features: [...p.features, { feature_name: name || key, feature_key: key, is_enabled: true }],
      newFeatureName: "",
      newFeatureKey: "",
    }));
  };

  const removeFeature = (idx: number) => {
    setForm((p) => ({ ...p, features: p.features.filter((_, i) => i !== idx) }));
  };

  const toggleFeatureEnabled = (idx: number) => {
    setForm((p) => ({
      ...p,
      features: p.features.map((f, i) => (i === idx ? { ...f, is_enabled: !f.is_enabled } : f)),
    }));
  };

  const updateFeatureField = (idx: number, field: keyof FeatureDraft, value: any) => {
    setForm((p) => ({
      ...p,
      features: p.features.map((f, i) => (i === idx ? { ...f, [field]: value } : f)),
    }));
  };

  /* =========================
     CRUD
  ========================= */

  const validateForm = () => {
    if (!form.name.trim()) return "Plan name is required.";
    if (form.price === "" || Number.isNaN(Number(form.price))) return "Price is required.";
    if (!form.currency.trim()) return "Currency is required.";
    if (form.duration_in_days === "" || Number(form.duration_in_days) < 1) return "Duration must be at least 1 day.";

    const keys = form.features.map((f) => (f.feature_key || "").trim()).filter(Boolean);
    const dupe = keys.find((k, i) => keys.findIndex((x) => x.toLowerCase() === k.toLowerCase()) !== i);
    if (dupe) return `Duplicate feature key: ${dupe}`;

    return "";
  };

  const buildPayload = () => {
    return {
      name: form.name.trim(),
      price: Number(form.price || 0),
      paystack_plan_code: form.paystack_plan_code.trim() || null,
      currency: form.currency.trim(),
      duration_in_days: Number(form.duration_in_days || 0),
      max_teachers: form.max_teachers === "" ? null : Number(form.max_teachers),
      max_students: form.max_students === "" ? null : Number(form.max_students),
      description: form.description.trim() || null,
      is_active: Boolean(form.is_active),
      features: form.features.map((f) => ({
        feature_name: (f.feature_name || "").trim() || f.feature_key,
        feature_key: normalizeKey(f.feature_key || f.feature_name || ""),
        is_enabled: f.is_enabled ? 1 : 0,
      })),
    };
  };

  const savePlan = async () => {
    const msg = validateForm();
    if (msg) return showError(msg);

    setSaving(true);
    try {
      const payload = buildPayload();

      if (editing?.id) {
        await authApi.put(`/subscription-plans/${editing.id}`, payload);
        showSuccess("Plan updated successfully.");
      } else {
        await authApi.post(`/subscription-plans`, payload);
        showSuccess("Plan created successfully.");
      }

      setShowModal(false);
      resetForm();
      await fetchPlans();
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Failed to save plan.");
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (p: Plan) => {
    if (isFreePlan(p)) return showError("The free plan cannot be deleted.");

    const ok = window.confirm(`Delete plan "${p.name}"? This cannot be undone.`);
    if (!ok) return;

    setSaving(true);
    try {
      await authApi.delete(`/subscription-plans/${p.id}`);
      showSuccess("Plan deleted successfully.");
      await fetchPlans();
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Failed to delete plan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto px-4 d-flex flex-column min-vh-100" style={{ backgroundColor: "#f8f9fa" }}>
            {(loading || saving) && <Loader message={saving ? "Saving changes..." : "Loading plans..."} />}

            {/* HERO */}
            <div
              className="mt-4 p-4 position-relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: 16,
                boxShadow: "0 10px 30px rgba(102, 126, 234, 0.3)",
              }}
            >
              <div className="row align-items-center g-3 position-relative">
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
                      <i className="bi bi-card-checklist me-1" />
                      Subscription Plans
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
                      /subscription-plans
                    </span>
                  </div>

                  <h2 className="fw-bold text-white mb-2">Plans Management</h2>
                  <p className="text-white mb-0" style={{ opacity: 0.9 }}>
                    Create, update, and manage subscription plans (features, limits, Paystack codes).
                  </p>

                  <div className="d-flex flex-wrap gap-2 mt-3">
                    <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                      Total: <b>{stats.total}</b>
                    </span>
                    <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                      Active: <b>{stats.active}</b>
                    </span>
                    <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                      Inactive: <b>{stats.inactive}</b>
                    </span>
                    <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                      Free: <b>{stats.free}</b>
                    </span>
                  </div>
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
                    <div className="text-white" style={{ opacity: 0.95 }}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span style={{ fontSize: "0.9rem", opacity: 0.9 }}>Quick Actions</span>
                        <i className="bi bi-lightning-charge text-white" />
                      </div>

                      <div className="d-flex flex-column gap-2">
                        <button className="btn btn-light btn-sm" style={{ borderRadius: 10, fontWeight: 700 }} onClick={openCreate} disabled={saving}>
                          <i className="bi bi-plus-circle me-1" />
                          Create Plan
                        </button>

                        <button
                          className="btn btn-outline-light btn-sm"
                          style={{ borderRadius: 10 }}
                          onClick={() => {
                            setLoading(true);
                            fetchPlans()
                              .then(() => showSuccess("Plans refreshed."))
                              .catch(() => showError("Failed to refresh plans."))
                              .finally(() => setLoading(false));
                          }}
                          disabled={saving}
                        >
                          <i className="bi bi-arrow-repeat me-1" />
                          Refresh
                        </button>
                      </div>

                      <div className="mt-2 text-white small" style={{ opacity: 0.9 }}>
                        Feature editor supports add (+), enable/disable, rename, delete.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FILTERS */}
            <div className="card border-0 shadow-sm my-4" style={{ borderRadius: 12 }}>
              <div className="card-body p-3 p-md-4">
                <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                  <div>
                    <div className="fw-semibold" style={{ color: "#1e293b" }}>
                      Filters
                    </div>
                    <div className="text-muted small">Search and filter plans.</div>
                  </div>

                  <div className="d-flex flex-wrap gap-2">
                    <select className="form-select form-select-sm" style={{ width: 160, borderRadius: 10 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>

                    <div className="input-group input-group-sm" style={{ width: 320 }}>
                      <span className="input-group-text">
                        <i className="bi bi-search" />
                      </span>
                      <input className="form-control" placeholder="Search name, currency, price..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>

                    <button className="btn btn-sm btn-primary" style={{ borderRadius: 10, fontWeight: 700 }} onClick={openCreate} disabled={saving}>
                      <i className="bi bi-plus me-1" />
                      New
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* TABLE */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
              <div className="card-body p-3 p-md-4">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{ background: "#eef2ff" }}>
                      <tr>
                        <th style={{ width: 70 }}>ID</th>
                        <th>Plan</th>
                        <th>Price</th>
                        <th>Duration</th>
                        <th>Limits</th>
                        <th>Status</th>
                        <th>Updated</th>
                        <th style={{ width: 220 }}>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {visiblePlans.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center text-muted py-4">
                            No plans found.
                          </td>
                        </tr>
                      ) : (
                        visiblePlans.map((p) => (
                          <tr key={p.id}>
                            <td className="text-muted">{p.id}</td>
                            <td>
                              <div className="fw-semibold">{p.name}</div>
                              <div className="text-muted small">
                                Paystack: <code>{p.paystack_plan_code || "—"}</code>
                              </div>
                              <div className="text-muted small">
                                Features: <b>{safeParseFeatures(p.features).length}</b>
                              </div>
                            </td>
                            <td className="fw-bold">{fmtMoney(Number(p.price || 0), p.currency)}</td>
                            <td className="text-muted">{p.duration_in_days ? `${p.duration_in_days} days` : "—"}</td>
                            <td className="text-muted">
                              <div>
                                Teachers: <b>{p.max_teachers ?? "—"}</b>
                              </div>
                              <div>
                                Students: <b>{p.max_students ?? "—"}</b>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${badgePlan(p)}`} style={{ borderRadius: 999 }}>
                                {badgeText(p)}
                              </span>
                            </td>
                            <td className="text-muted">{fmtDate(p.updated_at || p.created_at)}</td>
                            <td>
                              <div className="d-flex gap-2 flex-wrap">
                                <button className="btn btn-sm btn-outline-primary" style={{ borderRadius: 10 }} onClick={() => openEdit(p)} disabled={saving}>
                                  <i className="bi bi-pencil-square me-1" />
                                  Edit
                                </button>

                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  style={{ borderRadius: 10 }}
                                  onClick={() => deletePlan(p)}
                                  disabled={saving || isFreePlan(p)}
                                  title={isFreePlan(p) ? "Free plan cannot be deleted" : "Delete plan"}
                                >
                                  <i className="bi bi-trash me-1" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 text-muted small">
                  <i className="bi bi-info-circle me-1" />
                  Features are stored in DB as JSON string (array of objects).
                </div>
              </div>
            </div>

            {/* MODAL (✅ fixed overflow) */}
            {showModal && (
              <div
                className="position-fixed top-0 start-0 w-100 h-100"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  backdropFilter: "blur(6px)",
                  zIndex: 1100,
                  overflowY: "auto", // ✅ allow overlay scroll
                  padding: "1.5rem 0.5rem", // ✅ keeps space on small screens
                }}
                onMouseDown={(e) => {
                  // optional: click outside closes
                  if (e.target === e.currentTarget) {
                    setShowModal(false);
                    resetForm();
                  }
                }}
              >
                <div className="d-flex align-items-start justify-content-center" style={{ minHeight: "100%" }}>
                  <div
                    className="card shadow-lg border-0"
                    style={{
                      width: "100%",
                      maxWidth: 900,
                      borderRadius: 20,
                      maxHeight: "calc(100vh - 3rem)", // ✅ cap height
                      overflow: "hidden", // ✅ so inner body scroll works
                    }}
                  >
                    {/* Header (sticky) */}
                    <div
                      className="p-4 border-bottom"
                      style={{
                        background: "#fff",
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h5 className="fw-bold mb-0">{editing ? "Edit Plan" : "Create Plan"}</h5>
                          <small className="text-muted">Pricing, duration, limits, and features.</small>
                        </div>

                        <button
                          className="btn-close"
                          onClick={() => {
                            setShowModal(false);
                            resetForm();
                          }}
                          disabled={saving}
                        />
                      </div>
                    </div>

                    {/* Body (scrollable) */}
                    <div
                      className="p-4"
                      style={{
                        overflowY: "auto",
                        maxHeight: "calc(100vh - 3rem - 90px)", // overlay cap minus header
                      }}
                    >
                      <div className="row g-3">
                        {/* BASIC */}
                        <div className="col-md-6">
                          <label className="form-label small text-muted">Plan Name</label>
                          <input className="form-control" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Basic, Standard, Free" />
                        </div>

                        <div className="col-md-3">
                          <label className="form-label small text-muted">Price</label>
                          <input
                            className="form-control"
                            type="number"
                            min={0}
                            value={form.price}
                            onChange={(e) => setForm((p) => ({ ...p, price: e.target.value === "" ? "" : Number(e.target.value) }))}
                            placeholder="0"
                          />
                        </div>

                        <div className="col-md-3">
                          <label className="form-label small text-muted">Currency</label>
                          <input className="form-control" value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} placeholder="NGN" />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label small text-muted">Paystack Plan Code (optional)</label>
                          <input className="form-control" value={form.paystack_plan_code} onChange={(e) => setForm((p) => ({ ...p, paystack_plan_code: e.target.value }))} placeholder="PLN_xxxxx" />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label small text-muted">Duration (days)</label>
                          <input
                            className="form-control"
                            type="number"
                            min={1}
                            value={form.duration_in_days}
                            onChange={(e) => setForm((p) => ({ ...p, duration_in_days: e.target.value === "" ? "" : Number(e.target.value) }))}
                            placeholder="90"
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label small text-muted">Max Teachers (optional)</label>
                          <input
                            className="form-control"
                            type="number"
                            min={0}
                            value={form.max_teachers}
                            onChange={(e) => setForm((p) => ({ ...p, max_teachers: e.target.value === "" ? "" : Number(e.target.value) }))}
                            placeholder="0"
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label small text-muted">Max Students (optional)</label>
                          <input
                            className="form-control"
                            type="number"
                            min={0}
                            value={form.max_students}
                            onChange={(e) => setForm((p) => ({ ...p, max_students: e.target.value === "" ? "" : Number(e.target.value) }))}
                            placeholder="0"
                          />
                        </div>

                        <div className="col-md-12">
                          <label className="form-label small text-muted">Description (optional)</label>
                          <textarea className="form-control" rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Short plan description..." />
                        </div>

                        {/* FEATURES */}
                        <div className="col-md-12">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <div className="fw-semibold" style={{ color: "#1e293b" }}>
                                Features
                              </div>
                              <div className="text-muted small">Add features with +, toggle enable, edit name/key, remove.</div>
                            </div>

                            <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                              {form.features.length} feature(s)
                            </span>
                          </div>

                          <div className="row g-2 mt-2">
                            <div className="col-md-5">
                              <input
                                className="form-control"
                                placeholder="Feature name (e.g. Result Upload)"
                                value={form.newFeatureName}
                                onChange={(e) =>
                                  setForm((p) => ({
                                    ...p,
                                    newFeatureName: e.target.value,
                                    newFeatureKey: p.newFeatureKey ? p.newFeatureKey : normalizeKey(e.target.value),
                                  }))
                                }
                              />
                            </div>
                            <div className="col-md-5">
                              <input className="form-control" placeholder="Feature key (e.g. result_upload)" value={form.newFeatureKey} onChange={(e) => setForm((p) => ({ ...p, newFeatureKey: normalizeKey(e.target.value) }))} />
                              <div className="text-muted small mt-1">
                                Keys are normalized to <code>snake_case</code>.
                              </div>
                            </div>
                            <div className="col-md-2 d-grid">
                              <button className="btn btn-primary" style={{ borderRadius: 10, fontWeight: 700 }} type="button" onClick={addFeature}>
                                <i className="bi bi-plus-lg me-1" />
                                Add
                              </button>
                            </div>
                          </div>

                          <div className="mt-3" style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                            {form.features.length === 0 ? (
                              <div className="p-3 text-muted">No features yet. Add one above.</div>
                            ) : (
                              <div className="table-responsive">
                                <table className="table table-sm mb-0 align-middle">
                                  <thead style={{ background: "#f8fafc" }}>
                                    <tr>
                                      <th style={{ width: 70 }}>Enabled</th>
                                      <th>Feature Name</th>
                                      <th>Feature Key</th>
                                      <th style={{ width: 90 }}>Remove</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {form.features.map((f, idx) => (
                                      <tr key={`${f.feature_key}-${idx}`}>
                                        <td>
                                          <div className="form-check m-0 d-flex justify-content-center">
                                            <input className="form-check-input" type="checkbox" checked={f.is_enabled} onChange={() => toggleFeatureEnabled(idx)} />
                                          </div>
                                        </td>
                                        <td>
                                          <input className="form-control form-control-sm" value={f.feature_name} onChange={(e) => updateFeatureField(idx, "feature_name", e.target.value)} placeholder="Feature name" />
                                        </td>
                                        <td>
                                          <input className="form-control form-control-sm" value={f.feature_key} onChange={(e) => updateFeatureField(idx, "feature_key", normalizeKey(e.target.value))} placeholder="feature_key" />
                                        </td>
                                        <td>
                                          <button className="btn btn-sm btn-outline-danger" style={{ borderRadius: 10 }} type="button" onClick={() => removeFeature(idx)}>
                                            <i className="bi bi-x-lg" />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* FOOTER ACTIONS */}
                        <div className="col-md-12 d-flex align-items-center justify-content-between mt-2">
                          <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="isActive" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} />
                            <label className="form-check-label" htmlFor="isActive">
                              Plan is active
                            </label>
                          </div>

                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-light"
                              style={{ borderRadius: 10 }}
                              onClick={() => {
                                setShowModal(false);
                                resetForm();
                              }}
                              disabled={saving}
                              type="button"
                            >
                              Cancel
                            </button>

                            <button className="btn btn-primary" style={{ borderRadius: 10, fontWeight: 700 }} onClick={savePlan} disabled={saving} type="button">
                              {saving ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-save me-1" />
                                  {editing ? "Update Plan" : "Create Plan"}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-muted small">
                        <i className="bi bi-info-circle me-1" />
                        Modal is scrollable. If the screen is small, scroll inside the modal to reach the buttons.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-auto">
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
