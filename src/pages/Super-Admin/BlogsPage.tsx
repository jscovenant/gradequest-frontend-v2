// src/pages/SuperAdmin/BlogsPage.tsx
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

type Blog = {
  id: number;
  title: string;
  slug?: string | null;
  category: string;
  excerpt?: string | null;
  body?: string | null;
  youtube_url?: string | null;
  thumbnail?: string | null; // e.g. "blogs/file.png"
  thumbnail_url?: string | null; // backend may add full url
  created_at?: string | null;
  updated_at?: string | null;
};

type BlogForm = {
  title: string;
  category: string;
  youtube_url: string;
  body: string;
  thumbnailFile: File | null;
};

type BackendListResponse = {
  status: boolean;
  data: Blog[];
};

type BackendSingleResponse = {
  status: boolean;
  data: Blog;
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

function truncate(s?: string | null, n = 90) {
  const t = (s || "").trim();
  if (!t) return "—";
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function resolveThumbUrl(b?: Blog | null) {
  if (!b) return "";
  if (b.thumbnail_url) return b.thumbnail_url;
  if (b.thumbnail) {
    // if backend returns relative path like "blogs/x.png"
    // and your app is same domain, this works:
    return `/${b.thumbnail}`; // "/blogs/x.png"
  }
  return "";
}

/* =========================
   COMPONENT
========================= */

export default function BlogsPage() {
  const { showError, showSuccess } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [blogs, setBlogs] = useState<Blog[]>([]);

  // filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Blog | null>(null);

  const emptyForm: BlogForm = {
    title: "",
    category: "",
    youtube_url: "",
    body: "",
    thumbnailFile: null,
  };

  const [form, setForm] = useState<BlogForm>(emptyForm);

  // thumbnail preview
  const [thumbPreview, setThumbPreview] = useState<string>("");

  /* =========================
     FETCH
  ========================= */

  const fetchBlogs = async () => {
    const res = await authApi.get<BackendListResponse>("/blogs");
    const rows = Array.isArray(res.data?.data) ? res.data.data : [];
    setBlogs(rows);
  };

  useEffect(() => {
    setLoading(true);
    fetchBlogs()
      .catch((err) => {
        console.error(err);
        showError(err?.response?.data?.message || "Failed to load blogs.");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     MODAL SCROLL + CLEANUP
  ========================= */

  useEffect(() => {
    if (!showModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showModal]);

  useEffect(() => {
    return () => {
      if (thumbPreview?.startsWith("blob:")) URL.revokeObjectURL(thumbPreview);
    };
  }, [thumbPreview]);

  const resetForm = () => {
    setEditing(null);
    setForm(emptyForm);
    if (thumbPreview?.startsWith("blob:")) URL.revokeObjectURL(thumbPreview);
    setThumbPreview("");
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = async (b: Blog) => {
    setSaving(true);
    try {
      const res = await authApi.get<BackendSingleResponse>(`/edit-blog/${b.id}`);
      const blog = res.data?.data;

      if (!blog?.id) {
        showError("Failed to load blog details.");
        return;
      }

      setEditing(blog);
      setForm({
        title: blog.title || "",
        category: blog.category || "",
        youtube_url: blog.youtube_url || "",
        body: blog.body || "",
        thumbnailFile: null,
      });

      setThumbPreview(resolveThumbUrl(blog));
      setShowModal(true);
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Failed to load blog for editing.");
    } finally {
      setSaving(false);
    }
  };

  /* =========================
     FILTERS
  ========================= */

  const categories = useMemo(() => {
    const set = new Set<string>();
    blogs.forEach((b) => {
      const c = (b.category || "").trim();
      if (c) set.add(c);
    });
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [blogs]);

  const visibleBlogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return blogs.filter((b) => {
      if (categoryFilter !== "all" && (b.category || "") !== categoryFilter) return false;
      if (!q) return true;

      return (
        (b.title || "").toLowerCase().includes(q) ||
        (b.slug || "").toLowerCase().includes(q) ||
        (b.category || "").toLowerCase().includes(q)
      );
    });
  }, [blogs, search, categoryFilter]);

  const stats = useMemo(() => {
    const total = blogs.length;
    const withThumb = blogs.filter((b) => !!resolveThumbUrl(b)).length;
    const withYoutube = blogs.filter((b) => !!(b.youtube_url || "").trim()).length;
    return { total, withThumb, withYoutube };
  }, [blogs]);

  /* =========================
     CRUD
  ========================= */

  const validateForm = () => {
    if (!form.title.trim()) return "Title is required.";
    if (!form.category.trim()) return "Category is required.";
    // your update() requires body, store() allows nullable but we keep consistent:
    if (!form.body.trim()) return "Body is required.";
    return "";
  };

  const buildCreateFormData = () => {
    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("category", form.category.trim());
    fd.append("body", form.body);
    if (form.youtube_url.trim()) fd.append("youtube_url", form.youtube_url.trim());
    if (form.thumbnailFile) fd.append("thumbnail", form.thumbnailFile);
    return fd;
  };

  const buildUpdateFormData = () => {
    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("category", form.category.trim());
    fd.append("body", form.body);
    if (form.youtube_url.trim()) fd.append("youtube_url", form.youtube_url.trim());
    if (form.thumbnailFile) fd.append("thumbnail", form.thumbnailFile);
    return fd;
  };

  const saveBlog = async () => {
    const msg = validateForm();
    if (msg) return showError(msg);

    setSaving(true);
    try {
      if (editing?.id) {
        await authApi.post(`/update-blog/${editing.id}`, buildUpdateFormData(), {
          headers: { "Content-Type": "multipart/form-data" },
        });
        showSuccess("Blog updated successfully!");
      } else {
        await authApi.post(`/create-blog`, buildCreateFormData(), {
          headers: { "Content-Type": "multipart/form-data" },
        });
        showSuccess("Blog created successfully!");
      }

      setShowModal(false);
      resetForm();
      await fetchBlogs();
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Failed to save blog.");
    } finally {
      setSaving(false);
    }
  };

  const deleteBlog = async (b: Blog) => {
    const ok = window.confirm(`Delete blog "${b.title}"? This cannot be undone.`);
    if (!ok) return;

    setSaving(true);
    try {
      await authApi.delete(`/blogs/${b.id}`);
      showSuccess("Blog deleted successfully.");
      await fetchBlogs();
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Failed to delete blog.");
    } finally {
      setSaving(false);
    }
  };

  /* =========================
     UI
  ========================= */

  return (
    <>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto px-4 d-flex flex-column min-vh-100" style={{ backgroundColor: "#f8f9fa" }}>
            {(loading || saving) && <Loader message={saving ? "Saving changes..." : "Loading blogs..."} />}

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
                      <i className="bi bi-journal-richtext me-1" />
                      Blog Management
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
                      /blogs
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
                      title="Frontend list endpoint"
                    >
                      <i className="bi bi-globe2 me-1" />
                      /frontend-blogs
                    </span>
                  </div>

                  <h2 className="fw-bold text-white mb-2">Blogs</h2>
                  <p className="text-white mb-0" style={{ opacity: 0.9 }}>
                    Create, edit, and delete blog posts (thumbnail, category, YouTube).
                  </p>

                  <div className="d-flex flex-wrap gap-2 mt-3">
                    <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                      Total: <b>{stats.total}</b>
                    </span>
                    <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                      With Thumbnail: <b>{stats.withThumb}</b>
                    </span>
                    <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                      With YouTube: <b>{stats.withYoutube}</b>
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
                          Create Blog
                        </button>

                        <button
                          className="btn btn-outline-light btn-sm"
                          style={{ borderRadius: 10 }}
                          onClick={() => {
                            setLoading(true);
                            fetchBlogs()
                              .then(() => showSuccess("Blogs refreshed."))
                              .catch(() => showError("Failed to refresh blogs."))
                              .finally(() => setLoading(false));
                          }}
                          disabled={saving}
                        >
                          <i className="bi bi-arrow-repeat me-1" />
                          Refresh
                        </button>
                      </div>

                      <div className="mt-2 text-white small" style={{ opacity: 0.9 }}>
                        Tip: Update uses <b>POST /update-blog/:id</b> (multipart).
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
                    <div className="text-muted small">Search by title/slug or filter by category.</div>
                  </div>

                  <div className="d-flex flex-wrap gap-2">
                    <select className="form-select form-select-sm" style={{ width: 220, borderRadius: 10 }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c === "all" ? "All categories" : c}
                        </option>
                      ))}
                    </select>

                    <div className="input-group input-group-sm" style={{ width: 360 }}>
                      <span className="input-group-text">
                        <i className="bi bi-search" />
                      </span>
                      <input className="form-control" placeholder="Search title, slug, category..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                        <th style={{ width: 90 }}>Thumb</th>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Slug</th>
                        <th>Excerpt</th>
                        <th>Updated</th>
                        <th style={{ width: 220 }}>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {visibleBlogs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center text-muted py-4">
                            No blogs found.
                          </td>
                        </tr>
                      ) : (
                        visibleBlogs.map((b) => {
                          const img = resolveThumbUrl(b);
                          return (
                            <tr key={b.id}>
                              <td className="text-muted">{b.id}</td>

                              <td>
                                {img ? (
                                  <img
                                    src={img}
                                    alt={b.title}
                                    style={{
                                      width: 56,
                                      height: 40,
                                      objectFit: "cover",
                                      borderRadius: 10,
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
                                      width: 56,
                                      height: 40,
                                      borderRadius: 10,
                                      background: "#f1f5f9",
                                      color: "#64748b",
                                      border: "1px dashed #cbd5e1",
                                    }}
                                    title="No thumbnail"
                                  >
                                    <i className="bi bi-image" />
                                  </div>
                                )}
                              </td>

                              <td>
                                <div className="fw-semibold">{b.title}</div>
                                <div className="text-muted small">
                                  YouTube:{" "}
                                  {b.youtube_url ? (
                                    <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                                      <i className="bi bi-youtube me-1 text-danger" />
                                      linked
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </div>
                              </td>

                              <td className="text-muted">{b.category || "—"}</td>
                              <td className="text-muted">
                                <code style={{ fontSize: 12 }}>{b.slug || "—"}</code>
                              </td>
                              <td className="text-muted">{truncate(b.excerpt, 90)}</td>
                              <td className="text-muted">{fmtDate(b.updated_at || b.created_at)}</td>

                              <td>
                                <div className="d-flex gap-2 flex-wrap">
                                  <button className="btn btn-sm btn-outline-primary" style={{ borderRadius: 10 }} onClick={() => openEdit(b)} disabled={saving}>
                                    <i className="bi bi-pencil-square me-1" />
                                    Edit
                                  </button>

                                  <button className="btn btn-sm btn-outline-danger" style={{ borderRadius: 10 }} onClick={() => deleteBlog(b)} disabled={saving}>
                                    <i className="bi bi-trash me-1" />
                                    Delete
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

                <div className="mt-3 text-muted small">
                  <i className="bi bi-info-circle me-1" />
                  Frontend routes: GET <code>/frontend-blogs</code>, GET <code>/blog/:slug</code> (rendered elsewhere)
                </div>
              </div>
            </div>

            {/* MODAL (scroll-safe) */}
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
                      maxWidth: 980,
                      borderRadius: 20,
                      maxHeight: "calc(100vh - 3rem)",
                      overflow: "hidden",
                    }}
                  >
                    {/* Header (sticky) */}
                    <div className="p-4 border-bottom" style={{ background: "#fff", position: "sticky", top: 0, zIndex: 2 }}>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h5 className="fw-bold mb-0">{editing ? "Edit Blog" : "Create Blog"}</h5>
                          <small className="text-muted">Title, category, thumbnail, YouTube link, and body.</small>
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

                    {/* Body */}
                    <div className="p-4" style={{ overflowY: "auto", maxHeight: "calc(100vh - 3rem - 90px)" }}>
                      <div className="row g-3">
                        <div className="col-md-8">
                          <label className="form-label small text-muted">Title</label>
                          <input className="form-control" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Enter blog title..." />
                        </div>

                        <div className="col-md-4">
                          <label className="form-label small text-muted">Category</label>
                          <input className="form-control" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} placeholder="e.g. Updates, Tips, News" />
                        </div>

                        <div className="col-md-8">
                          <label className="form-label small text-muted">YouTube URL (optional)</label>
                          <input className="form-control" value={form.youtube_url} onChange={(e) => setForm((p) => ({ ...p, youtube_url: e.target.value }))} placeholder="https://youtube.com/..." />
                        </div>

                        <div className="col-md-4">
                          <label className="form-label small text-muted">Thumbnail (optional)</label>
                          <input
                            className="form-control"
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setForm((p) => ({ ...p, thumbnailFile: file }));

                              if (thumbPreview?.startsWith("blob:")) URL.revokeObjectURL(thumbPreview);

                              if (file) {
                                setThumbPreview(URL.createObjectURL(file));
                              } else {
                                setThumbPreview(editing ? resolveThumbUrl(editing) : "");
                              }
                            }}
                          />
                          <div className="text-muted small mt-1">
                            Stored in <code>/public/blogs</code>.
                          </div>
                        </div>

                        <div className="col-md-12">
                          {(thumbPreview || resolveThumbUrl(editing)) && (
                            <div className="p-3 rounded-3" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14 }}>
                              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                <div className="fw-semibold" style={{ color: "#0f172a" }}>
                                  Thumbnail Preview
                                </div>

                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  style={{ borderRadius: 10 }}
                                  onClick={() => {
                                    setForm((p) => ({ ...p, thumbnailFile: null }));
                                    if (thumbPreview?.startsWith("blob:")) URL.revokeObjectURL(thumbPreview);
                                    setThumbPreview(editing ? resolveThumbUrl(editing) : "");
                                  }}
                                >
                                  <i className="bi bi-x-circle me-1" />
                                  Clear new upload
                                </button>
                              </div>

                              <div className="mt-2">
                                <img
                                  src={thumbPreview || resolveThumbUrl(editing)}
                                  alt="Thumbnail preview"
                                  style={{
                                    width: "100%",
                                    maxHeight: 260,
                                    objectFit: "cover",
                                    borderRadius: 12,
                                    border: "1px solid rgba(15, 23, 42, 0.08)",
                                    background: "#fff",
                                  }}
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="col-md-12">
                          <label className="form-label small text-muted">Body</label>
                          <textarea className="form-control" rows={10} value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} placeholder="Write blog content here..." />
                          <div className="text-muted small mt-1">
                            Backend creates <code>slug</code> + <code>excerpt</code> automatically.
                          </div>
                        </div>

                        <div className="col-md-12 d-flex align-items-center justify-content-between">
                          <div className="text-muted small">
                            {editing ? (
                              <>
                                ID: <b>{editing.id}</b> • Slug: <code>{editing.slug || "—"}</code>
                              </>
                            ) : (
                              <>Creating a new blog post</>
                            )}
                          </div>

                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-light"
                              style={{ borderRadius: 10 }}
                              type="button"
                              onClick={() => {
                                setShowModal(false);
                                resetForm();
                              }}
                              disabled={saving}
                            >
                              Cancel
                            </button>

                            <button className="btn btn-primary" style={{ borderRadius: 10, fontWeight: 700 }} type="button" onClick={saveBlog} disabled={saving}>
                              {saving ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-save me-1" />
                                  {editing ? "Update Blog" : "Create Blog"}
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="mt-2 text-muted small">
                          <i className="bi bi-info-circle me-1" />
                          This page uses: GET <code>/blogs</code>, GET <code>/edit-blog/:id</code>, POST <code>/create-blog</code>, POST <code>/update-blog/:id</code>, DELETE <code>/blogs/:id</code>.
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
