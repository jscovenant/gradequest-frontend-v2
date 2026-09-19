import React, { useState, useEffect } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import PageTitle from "../../../components/PageTitle";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";

interface StoreCategory {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  is_active: boolean;
  items_count?: number;
}

export default function StoreCategoriesPage() {
  const { showSuccess, showError, showWarning } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<StoreCategory[]>([]);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<StoreCategory | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await authApi.get("/store/categories");
      if (res.data?.status === "success" || Array.isArray(res.data?.data)) {
        setCategories(res.data.data || []);
      }
    } catch (err: any) {
      console.error("Error loading categories:", err);
      showError?.(err?.response?.data?.message || "Failed to load store categories.");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingCategory(null);
    setName("");
    setDescription("");
    setShowModal(true);
  };

  const openEditModal = (cat: StoreCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || "");
    setShowModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showWarning?.("Category name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...(editingCategory ? { id: editingCategory.id } : {}),
        name: name.trim(),
        description: description.trim() || null,
      };

      const res = await authApi.post("/store/categories/save", payload);
      if (res.data?.status === "success" || res.data?.data) {
        showSuccess?.(editingCategory ? "Category updated!" : "Category created successfully!");
        setShowModal(false);
        fetchCategories();
      } else {
        showError?.(res.data?.message || "Failed to save category.");
      }
    } catch (err: any) {
      console.error("Category save error:", err);
      showError?.(err?.response?.data?.message || "Error saving category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat: StoreCategory) => {
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
      return;
    }

    try {
      const res = await authApi.delete(`/store/categories/${cat.id}`);
      if (res.data?.status === "success") {
        showSuccess?.("Category deleted successfully.");
        fetchCategories();
      }
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to delete category.");
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .db-main { background: #F8FAFC; min-height: 100vh; font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; padding: 24px 28px 40px; }
        @media (max-width: 991.98px) { .db-main { padding: 18px 14px 40px; } }
        .db-hero { background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%); border-radius: 18px; padding: 30px 34px; position: relative; overflow: hidden; margin: 10px 0 24px; box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15); }
        .db-hero-glow { position: absolute; top: -60px; right: -60px; width: 320px; height: 320px; border-radius: 50%; background: radial-gradient(circle, rgba(217, 119, 6, 0.18) 0%, transparent 65%); pointer-events: none; }
        .db-hero-glow2 { position: absolute; bottom: -40px; left: 30%; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, transparent 70%); pointer-events: none; }
        .db-hero-inner { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
        .db-session-badge { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #FBBF24; background: rgba(217, 119, 6, 0.20); border: 1px solid rgba(217, 119, 6, 0.35); border-radius: 100px; padding: 4px 12px; margin-bottom: 12px; }
        .db-session-dot { width: 6px; height: 6px; border-radius: 50%; background: #10B981; }
        .db-greeting { font-size: 24px; font-weight: 800; color: #fff; line-height: 1.15; margin-bottom: 8px; }
        .db-greeting em { font-style: normal; color: #FBBF24; }
        .db-hero-sub { font-size: 13.5px; color: #CBD5E1; line-height: 1.5; max-width: 600px; margin-bottom: 0; }
        .db-card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
        .db-stat-card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 20px 22px; height: 100%; transition: transform 0.2s, box-shadow 0.2s; }
        .db-stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px -4px rgba(0,0,0,0.06); }
        .db-stat-label { font-size: 12px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.03em; }
        .db-stat-value { font-size: 22px; font-weight: 800; color: #0F2744; margin: 8px 0 4px; }
        .db-stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .db-tab-btn { padding: 9px 18px; font-size: 13px; font-weight: 600; border-radius: 10px; border: none; background: transparent; color: #64748B; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; }
        .db-tab-btn.active { background: #0F2744; color: #FFFFFF; box-shadow: 0 4px 12px rgba(15, 39, 68, 0.2); }
        .db-tab-btn:hover:not(.active) { background: #F1F5F9; color: #0F2744; }
        .db-btn-gold { background: linear-gradient(135deg, #D97706 0%, #B45309 100%); color: #FFFFFF; font-weight: 700; font-size: 13px; border: none; border-radius: 10px; padding: 9px 18px; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25); display: inline-flex; align-items: center; gap: 7px; transition: opacity 0.2s; }
        .db-btn-gold:hover { opacity: 0.92; color: #FFFFFF; }
        .db-btn-primary { background: #0F2744; color: #FFFFFF; font-weight: 700; font-size: 13px; border: none; border-radius: 10px; padding: 9px 18px; display: inline-flex; align-items: center; gap: 7px; transition: opacity 0.2s; }
        .db-btn-primary:hover { opacity: 0.92; color: #FFFFFF; }
        .db-btn-outline { background: #FFFFFF; color: #0F2744; font-weight: 600; font-size: 13px; border: 1px solid #CBD5E1; border-radius: 10px; padding: 8px 16px; display: inline-flex; align-items: center; gap: 7px; transition: all 0.2s; }
        .db-btn-outline:hover { background: #F8FAFC; border-color: #94A3B8; }
        .db-table-head { background: #F8FAFC; border-bottom: 1px solid #E2E8F0; }
        .db-table-head th { font-size: 11.5px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; padding: 13px 18px; }
        .db-table-row td { font-size: 13px; color: #1E293B; padding: 14px 18px; vertical-align: middle; border-bottom: 1px solid #F1F5F9; }
        .db-table-row:hover { background: #F8FAFC; }
        .badge-soft-success { background: rgba(16, 185, 129, 0.12); color: #059669; font-weight: 700; border-radius: 8px; padding: 4px 9px; font-size: 11px; }
        .badge-soft-warning { background: rgba(245, 158, 11, 0.15); color: #D97706; font-weight: 700; border-radius: 8px; padding: 4px 9px; font-size: 11px; }
        .badge-soft-danger { background: rgba(239, 68, 68, 0.12); color: #DC2626; font-weight: 700; border-radius: 8px; padding: 4px 9px; font-size: 11px; }
        .badge-soft-info { background: rgba(37, 99, 235, 0.12); color: #2563EB; font-weight: 700; border-radius: 8px; padding: 4px 9px; font-size: 11px; }
`}</style>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Store Categories | SchoolProfit" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {/* Hero Banner */}
            <div className="db-hero">
              <div className="db-hero-glow"></div>
              <div className="db-hero-glow2"></div>
              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot"></span>
                    STORE CLASSIFICATIONS
                  </div>
                  <h1 className="db-greeting">
                    Store <em>Categories</em>
                  </h1>
                  <p className="db-hero-sub">
                    Group your school inventory into distinct departments: Uniforms, Textbooks, Stationery, Crests & Ties, and Sports Wear.
                  </p>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <a href="/store/inventory" className="db-btn-outline" style={{ textDecoration: "none" }}>
                    <i className="bi bi-box-seam"></i> View Inventory
                  </a>
                  <button type="button" className="db-btn-gold" onClick={openAddModal}>
                    <i className="bi bi-plus-circle"></i> Create Category
                  </button>
                </div>
              </div>
            </div>

            {/* Categories Cards & List */}
            {loading ? (
              <div className="py-5 text-center">
                <Loader />
                <p className="text-muted mt-3">Loading store categories...</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="db-card p-5 text-center">
                <i className="bi bi-tags text-muted" style={{ fontSize: "42px" }}></i>
                <h6 className="fw-bold mt-3 mb-1">No Categories Created Yet</h6>
                <p className="text-muted small mb-3">Organize your store by adding categories like Uniforms, Books, and Badges.</p>
                <button type="button" className="btn btn-primary btn-sm" onClick={openAddModal}>
                  <i className="bi bi-plus-circle me-1"></i> Add First Category
                </button>
              </div>
            ) : (
              <div className="row g-3">
                {categories.map((cat) => (
                  <div key={cat.id} className="col-12 col-md-6 col-xl-4">
                    <div className="db-card p-4 h-100 d-flex flex-column justify-content-between">
                      <div>
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <div className="db-stat-icon" style={{ background: "rgba(217, 119, 6, 0.12)", color: "#D97706", width: "36px", height: "36px" }}>
                            <i className="bi bi-tag"></i>
                          </div>
                          <span className="badge-soft-info">{cat.items_count || 0} Products</span>
                        </div>

                        <h5 className="fw-bold text-dark mb-1">{cat.name}</h5>
                        <p className="text-muted small mb-3" style={{ minHeight: "36px" }}>
                          {cat.description || "General merchandise and school store supplies."}
                        </p>
                      </div>

                      <div className="d-flex align-items-center justify-content-between pt-3 border-top">
                        <a href={`/store/inventory?category_id=${cat.id}`} className="btn btn-sm btn-link p-0 text-decoration-none fw-bold text-primary">
                          Browse items →
                        </a>

                        <div className="d-flex align-items-center gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary py-1 px-2"
                            onClick={() => openEditModal(cat)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger py-1 px-2"
                            onClick={() => handleDeleteCategory(cat)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
      <Footer />

            {/* Add / Edit Category Modal with Top Save Button */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ background: "rgba(15, 39, 68, 0.75)", backdropFilter: "blur(6px)", zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: "480px", maxHeight: "92vh" }}>
            <div className="modal-content rounded-4 border-0 shadow-2xl overflow-hidden d-flex flex-column" style={{ maxHeight: "90vh" }}>
              <form onSubmit={handleSaveCategory} className="d-flex flex-column h-100 overflow-hidden m-0">
                <div className="modal-header border-bottom py-3 px-4 bg-white d-flex align-items-center justify-content-between flex-shrink-0">
                  <div className="d-flex align-items-center gap-2">
                    <div className="rounded-circle bg-primary bg-opacity-10 p-2 text-primary d-flex align-items-center justify-content-center" style={{ width: "34px", height: "34px" }}>
                      <i className="bi bi-tag-fill" style={{ fontSize: "16px" }}></i>
                    </div>
                    <h6 className="modal-title fw-bold text-dark mb-0">
                      {editingCategory ? `Edit Category: ${editingCategory.name}` : "Create New Store Category"}
                    </h6>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>

                {/* TOP Action Bar with Primary Save Button */}
                <div className="p-3 bg-light border-bottom flex-shrink-0 d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary fw-bold flex-grow-1 py-2 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                    disabled={isSubmitting}
                    style={{ fontSize: "14px" }}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm"></span> Saving Category...
                      </>
                    ) : editingCategory ? (
                      <>
                        <i className="bi bi-check-circle-fill"></i> Save Changes
                      </>
                    ) : (
                      <>
                        <i className="bi bi-plus-circle-fill"></i> Create Category Now
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-3"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                </div>

                <div className="modal-body p-4 overflow-y-auto" style={{ background: "#F8FAFC" }}>
                  <div className="mb-3">
                    <label className="form-label fw-bold small text-dark">Category Name *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      placeholder="e.g. School Uniforms, Textbooks, Sports Wear"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="form-label fw-bold small text-dark">Description</label>
                    <textarea
                      rows={3}
                      className="form-control"
                      placeholder="Brief note on what products belong here..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    ></textarea>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
