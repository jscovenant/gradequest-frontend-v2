// src/pages/SuperAdmin/TestimonialsPage.tsx
import { useEffect, useMemo, useState } from "react";

import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import { authApi } from "../../utils/axios";
import { useToast } from "../../contexts/ToastContext";

/* =========================
   TYPES
========================= */

type Testimonial = {
  id: number;
  quote: string;
  author: string;
  org: string;
  img?: string | null;
  color?: string | null;
  rating: number;
  created_at?: string | null;
  updated_at?: string | null;
};

type TestimonialForm = {
  quote: string;
  author: string;
  org: string;
  img: string;
  color: string;
  rating: number;
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

function clampRating(n: any) {
  const v = Number(n);
  if (Number.isNaN(v)) return 5;
  return Math.min(5, Math.max(1, Math.floor(v)));
}

function stars(n: number) {
  const r = clampRating(n);
  return "★★★★★☆☆☆☆☆".slice(5 - r, 10 - r);
}

/* =========================
   COMPONENT
========================= */

export default function TestimonialsPage() {
  const { showError, showSuccess } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [rows, setRows] = useState<Testimonial[]>([]);

  // filters
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<"all" | "5" | "4" | "3" | "2" | "1">("all");

  // modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);

  const emptyForm: TestimonialForm = {
    quote: "",
    author: "",
    org: "",
    img: "",
    color: "",
    rating: 5,
  };

  const [form, setForm] = useState<TestimonialForm>(emptyForm);

  /* =========================
     FETCH
  ========================= */

  const fetchTestimonials = async () => {
    const res = await authApi.get<Testimonial[]>("/testimonials");
    const data = Array.isArray(res.data) ? res.data : [];
    setRows(data);
  };

  useEffect(() => {
    setLoading(true);
    fetchTestimonials()
      .catch((err) => {
        console.error(err);
        showError(err?.response?.data?.message || "Failed to load testimonials.");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     MODAL SCROLL SAFE
  ========================= */

  useEffect(() => {
    if (!showModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showModal]);

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = async (id: number) => {
    setSaving(true);
    try {
      // optional: load fresh record from server
      const res = await authApi.get<Testimonial>(`/testimonials/${id}`);
      const t = res.data;

      setEditing(t);
      setForm({
        quote: t.quote || "",
        author: t.author || "",
        org: t.org || "",
        img: t.img || "",
        color: t.color || "",
        rating: clampRating(t.rating),
      });

      setShowModal(true);
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Failed to load testimonial.");
    } finally {
      setSaving(false);
    }
  };

  /* =========================
     FILTERS
  ========================= */

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((t) => {
      if (ratingFilter !== "all" && String(clampRating(t.rating)) !== ratingFilter) return false;
      if (!q) return true;

      return (
        (t.quote || "").toLowerCase().includes(q) ||
        (t.author || "").toLowerCase().includes(q) ||
        (t.org || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, ratingFilter]);

  const stats = useMemo(() => {
    const total = rows.length;
    const byRating = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>;
    rows.forEach((r) => {
      const rr = clampRating(r.rating);
      byRating[rr] = (byRating[rr] || 0) + 1;
    });
    return { total, byRating };
  }, [rows]);

  /* =========================
     CRUD
  ========================= */

  const validateForm = () => {
    if (!form.quote.trim()) return "Quote is required.";
    if (!form.author.trim()) return "Author is required.";
    if (!form.org.trim()) return "Organization is required.";
    const r = clampRating(form.rating);
    if (r < 1 || r > 5) return "Rating must be between 1 and 5.";

    if (form.img.trim()) {
      try {
        // eslint-disable-next-line no-new
        new URL(form.img.trim());
      } catch {
        return "Image must be a valid URL (or leave empty).";
      }
    }
    return "";
  };

  const buildPayload = () => {
    return {
      quote: form.quote.trim(),
      author: form.author.trim(),
      org: form.org.trim(),
      img: form.img.trim() || null,
      color: form.color.trim() || null,
      rating: clampRating(form.rating),
    };
  };

  const saveTestimonial = async () => {
    const msg = validateForm();
    if (msg) return showError(msg);

    setSaving(true);
    try {
      const payload = buildPayload();

      if (editing?.id) {
        await authApi.put(`/testimonials/${editing.id}`, payload);
        showSuccess("Updated successfully.");
      } else {
        await authApi.post(`/testimonials`, payload);
        showSuccess("Created successfully.");
      }

      closeModal();
      await fetchTestimonials();
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Failed to save testimonial.");
    } finally {
      setSaving(false);
    }
  };

  const deleteTestimonial = async (t: Testimonial) => {
    const ok = window.confirm(`Delete testimonial by "${t.author}"? This cannot be undone.`);
    if (!ok) return;

    setSaving(true);
    try {
      await authApi.delete(`/testimonials/${t.id}`);
      showSuccess("Deleted successfully.");
      await fetchTestimonials();
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Failed to delete testimonial.");
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
            {(loading || saving) && <Loader message={saving ? "Saving changes..." : "Loading testimonials..."} />}

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
                      <i className="bi bi-chat-quote-fill me-1" />
                      Testimonials
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
                      /testimonials
                    </span>
                  </div>

                  <h2 className="fw-bold text-white mb-2">Testimonials Management</h2>
                  <p className="text-white mb-0" style={{ opacity: 0.9 }}>
                    Create, update and delete testimonials used on your landing pages.
                  </p>

                  <div className="d-flex flex-wrap gap-2 mt-3">
                    <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                      Total: <b>{stats.total}</b>
                    </span>
                    <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                      5★: <b>{stats.byRating[5]}</b>
                    </span>
                    <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                      4★: <b>{stats.byRating[4]}</b>
                    </span>
                    <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                      3★: <b>{stats.byRating[3]}</b>
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
                          Create Testimonial
                        </button>

                        <button
                          className="btn btn-outline-light btn-sm"
                          style={{ borderRadius: 10 }}
                          onClick={() => {
                            setLoading(true);
                            fetchTestimonials()
                              .then(() => showSuccess("Testimonials refreshed."))
                              .catch(() => showError("Failed to refresh testimonials."))
                              .finally(() => setLoading(false));
                          }}
                          disabled={saving}
                        >
                          <i className="bi bi-arrow-repeat me-1" />
                          Refresh
                        </button>
                      </div>

                      <div className="mt-2 text-white small" style={{ opacity: 0.9 }}>
                        Uses: GET/POST/PUT/DELETE <code>/testimonials</code>
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
                    <div className="text-muted small">Search by quote, author, org and filter by rating.</div>
                  </div>

                  <div className="d-flex flex-wrap gap-2">
                    <select className="form-select form-select-sm" style={{ width: 160, borderRadius: 10 }} value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value as any)}>
                      <option value="all">All ratings</option>
                      <option value="5">5 stars</option>
                      <option value="4">4 stars</option>
                      <option value="3">3 stars</option>
                      <option value="2">2 stars</option>
                      <option value="1">1 star</option>
                    </select>

                    <div className="input-group input-group-sm" style={{ width: 360 }}>
                      <span className="input-group-text">
                        <i className="bi bi-search" />
                      </span>
                      <input className="form-control" placeholder="Search quote, author, org..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                        <th style={{ width: 70 }}>Img</th>
                        <th>Quote</th>
                        <th>Author</th>
                        <th>Org</th>
                        <th style={{ width: 120 }}>Rating</th>
                        <th style={{ width: 140 }}>Created</th>
                        <th style={{ width: 220 }}>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {visibleRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center text-muted py-4">
                            No testimonials found.
                          </td>
                        </tr>
                      ) : (
                        visibleRows.map((t) => (
                          <tr key={t.id}>
                            <td className="text-muted">{t.id}</td>

                            <td>
                              {t.img ? (
                                <img
                                  src={t.img}
                                  alt={t.author}
                                  style={{
                                    width: 44,
                                    height: 44,
                                    objectFit: "cover",
                                    borderRadius: 12,
                                    border: "1px solid rgba(15, 23, 42, 0.08)",
                                    background: "#fff",
                                  }}
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <div
                                  className="d-flex align-items-center justify-content-center"
                                  style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    background: "#f1f5f9",
                                    color: "#64748b",
                                    border: "1px dashed #cbd5e1",
                                  }}
                                  title="No image"
                                >
                                  <i className="bi bi-person" />
                                </div>
                              )}
                            </td>

                            <td>
                              <div className="fw-semibold" style={{ color: "#0f172a" }}>
                                “{t.quote}”
                              </div>
                              <div className="text-muted small">
                                Color: <code>{t.color || "—"}</code>
                              </div>
                            </td>

                            <td className="text-muted">{t.author}</td>
                            <td className="text-muted">{t.org}</td>

                            <td>
                              <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                                {clampRating(t.rating)} / 5
                              </span>
                              <div className="text-muted small">{stars(t.rating)}</div>
                            </td>

                            <td className="text-muted">{fmtDate(t.created_at)}</td>

                            <td>
                              <div className="d-flex gap-2 flex-wrap">
                                <button className="btn btn-sm btn-outline-primary" style={{ borderRadius: 10 }} onClick={() => openEdit(t.id)} disabled={saving}>
                                  <i className="bi bi-pencil-square me-1" />
                                  Edit
                                </button>

                                <button className="btn btn-sm btn-outline-danger" style={{ borderRadius: 10 }} onClick={() => deleteTestimonial(t)} disabled={saving}>
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
                  Backend routes: GET/POST/PUT/DELETE <code>/testimonials</code>
                </div>
              </div>
            </div>

            {/* MODAL (Create/Edit) */}
            {showModal && (
              <div
                className="position-fixed top-0 start-0 w-100 h-100"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  backdropFilter: "blur(6px)",
                  zIndex: 1100,
                  overflowY: "auto",
                  padding: "1.5rem 0.5rem",
                }}
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) closeModal();
                }}
              >
                <div className="d-flex align-items-start justify-content-center" style={{ minHeight: "100%" }}>
                  <div
                    className="card shadow-lg border-0"
                    style={{
                      width: "100%",
                      maxWidth: 860,
                      borderRadius: 20,
                      maxHeight: "calc(100vh - 3rem)",
                      overflow: "hidden",
                    }}
                  >
                    {/* Header (sticky) */}
                    <div className="p-4 border-bottom" style={{ background: "#fff", position: "sticky", top: 0, zIndex: 2 }}>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h5 className="fw-bold mb-0">{editing ? "Edit Testimonial" : "Create Testimonial"}</h5>
                          <small className="text-muted">
                            {editing ? `Updating ID: ${editing.id}` : "Add quote, author, org, rating, optional image URL and color."}
                          </small>
                        </div>

                        <button className="btn-close" onClick={closeModal} disabled={saving} />
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-4" style={{ overflowY: "auto", maxHeight: "calc(100vh - 3rem - 90px)" }}>
                      <div className="row g-3">
                        <div className="col-md-12">
                          <label className="form-label small text-muted">Quote</label>
                          <textarea className="form-control" rows={4} value={form.quote} onChange={(e) => setForm((p) => ({ ...p, quote: e.target.value }))} placeholder="Write the testimonial quote..." />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label small text-muted">Author</label>
                          <input className="form-control" value={form.author} onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))} placeholder="e.g. Mrs. Ade" />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label small text-muted">Organization</label>
                          <input className="form-control" value={form.org} onChange={(e) => setForm((p) => ({ ...p, org: e.target.value }))} placeholder="e.g. Graceville Schools" />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label small text-muted">Image URL (optional)</label>
                          <input className="form-control" value={form.img} onChange={(e) => setForm((p) => ({ ...p, img: e.target.value }))} placeholder="https://..." />
                          <div className="text-muted small mt-1">Backend requires this to be a valid URL if provided.</div>
                        </div>

                        <div className="col-md-3">
                          <label className="form-label small text-muted">Color (optional)</label>
                          <input className="form-control" value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} placeholder="e.g. #0ea5e9" />
                        </div>

                        <div className="col-md-3">
                          <label className="form-label small text-muted">Rating (1–5)</label>
                          <select className="form-select" value={form.rating} onChange={(e) => setForm((p) => ({ ...p, rating: clampRating(e.target.value) }))}>
                            {[5, 4, 3, 2, 1].map((n) => (
                              <option key={n} value={n}>
                                {n} star{n > 1 ? "s" : ""}
                              </option>
                            ))}
                          </select>
                          <div className="text-muted small mt-1">{stars(form.rating)}</div>
                        </div>

                        <div className="col-md-12 d-flex align-items-center justify-content-between">
                          <div className="text-muted small">
                            {editing ? (
                              <>
                                Endpoint: <code>PUT /testimonials/{editing.id}</code>
                              </>
                            ) : (
                              <>
                                Endpoint: <code>POST /testimonials</code>
                              </>
                            )}
                          </div>

                          <div className="d-flex gap-2">
                            <button className="btn btn-light" style={{ borderRadius: 10 }} type="button" onClick={closeModal} disabled={saving}>
                              Cancel
                            </button>

                            <button className="btn btn-primary" style={{ borderRadius: 10, fontWeight: 700 }} type="button" onClick={saveTestimonial} disabled={saving}>
                              {saving ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-save me-1" />
                                  {editing ? "Update" : "Create"}
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="mt-2 text-muted small">
                          <i className="bi bi-info-circle me-1" />
                          Delete uses: <code>DELETE /testimonials/:id</code>
                        </div>
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
