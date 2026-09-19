import React, { useState, useEffect } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import PageTitle from "../../../components/PageTitle";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";

interface Category {
  id: number;
  name: string;
}

interface StoreItem {
  id: number;
  category_id?: number;
  name: string;
  item_code: string;
  item_type: string;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  reorder_level: number;
  unit: string;
  size?: string;
  class_target?: string;
  description?: string;
  is_active: boolean;
  category?: Category;
}

export default function StoreInventoryPage() {
  const { showSuccess, showError, showWarning } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState<StoreItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<any>({
    total_items: 0,
    total_units: 0,
    valuation_cost: 0,
    valuation_retail: 0,
    potential_profit: 0,
    low_stock_count: 0,
  });

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>("");
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockTarget, setRestockTarget] = useState<StoreItem | null>(null);

  // Form States
  const [itemForm, setItemForm] = useState({
    name: "",
    item_code: "",
    category_id: "",
    item_type: "uniform",
    cost_price: 0,
    selling_price: 0,
    current_stock: 0,
    reorder_level: 5,
    unit: "pcs",
    size: "",
    class_target: "",
    description: "",
  });

  const [restockForm, setRestockForm] = useState({
    quantity: 10,
    unit_cost: 0,
    reason: "Supplier Delivery Restock",
    reference: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, [search, selectedCat, lowStockFilter]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (selectedCat) params.append("category_id", selectedCat);
      if (lowStockFilter) params.append("low_stock_only", "1");

      const [itemsRes, catRes] = await Promise.all([
        authApi.get(`/store/items?${params.toString()}`),
        authApi.get("/store/categories"),
      ]);

      if (itemsRes.data?.status === "success" || Array.isArray(itemsRes.data?.data)) {
        setItems(itemsRes.data.data || []);
        if (itemsRes.data.summary) {
          setSummary(itemsRes.data.summary);
        }
      }
      if (catRes.data?.status === "success" || Array.isArray(catRes.data?.data)) {
        setCategories(catRes.data.data || []);
      }
    } catch (err: any) {
      console.error("Error loading inventory:", err);
      showError?.(err?.response?.data?.message || "Failed to load inventory data.");
    } finally {
      setLoading(false);
    }
  };

  const openAddItemModal = () => {
    setEditingItem(null);
    setItemForm({
      name: "",
      item_code: "",
      category_id: categories[0]?.id ? String(categories[0].id) : "",
      item_type: "uniform",
      cost_price: 0,
      selling_price: 0,
      current_stock: 0,
      reorder_level: 5,
      unit: "pcs",
      size: "",
      class_target: "",
      description: "",
    });
    setShowItemModal(true);
  };

  const openEditItemModal = (item: StoreItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      item_code: item.item_code,
      category_id: item.category_id ? String(item.category_id) : "",
      item_type: item.item_type || "uniform",
      cost_price: Number(item.cost_price),
      selling_price: Number(item.selling_price),
      current_stock: item.current_stock,
      reorder_level: item.reorder_level,
      unit: item.unit || "pcs",
      size: item.size || "",
      class_target: item.class_target || "",
      description: item.description || "",
    });
    setShowItemModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name.trim()) {
      showWarning?.("Please provide an item name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...(editingItem ? { id: editingItem.id } : {}),
        ...itemForm,
        category_id: itemForm.category_id ? Number(itemForm.category_id) : null,
      };

      const res = await authApi.post("/store/items/save", payload);
      if (res.data?.status === "success" || res.data?.data) {
        showSuccess?.(editingItem ? "Item updated successfully!" : "New store item created!");
        setShowItemModal(false);
        fetchInventory();
      } else {
        showError?.(res.data?.message || "Failed to save item.");
      }
    } catch (err: any) {
      console.error("Save item error:", err);
      showError?.(err?.response?.data?.message || "Error saving inventory item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRestockModal = (item: StoreItem) => {
    setRestockTarget(item);
    setRestockForm({
      quantity: 10,
      unit_cost: Number(item.cost_price),
      reason: "Supplier Delivery Restock",
      reference: "",
    });
    setShowRestockModal(true);
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockTarget) return;

    setIsSubmitting(true);
    try {
      const payload = {
        item_id: restockTarget.id,
        quantity: Number(restockForm.quantity),
        unit_cost: Number(restockForm.unit_cost),
        reason: restockForm.reason,
        reference: restockForm.reference || "RESTOCK",
      };

      const res = await authApi.post("/store/items/restock", payload);
      if (res.data?.status === "success" || res.data?.data) {
        showSuccess?.(`Stock for "${restockTarget.name}" adjusted successfully!`);
        setShowRestockModal(false);
        fetchInventory();
      } else {
        showError?.(res.data?.message || "Restock failed.");
      }
    } catch (err: any) {
      console.error("Restock error:", err);
      showError?.(err?.response?.data?.message || "Failed to restock item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (item: StoreItem) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}" from the store catalog?`)) {
      return;
    }

    try {
      const res = await authApi.delete(`/store/items/${item.id}`);
      if (res.data?.status === "success") {
        showSuccess?.("Item deleted successfully.");
        fetchInventory();
      }
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to delete item.");
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
      <PageTitle title="Store Inventory & Stock Manager | SchoolProfit" />

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
                    INVENTORY & STOCK VALUATION
                  </div>
                  <h1 className="db-greeting">
                    Store & <em>Inventory Manager</em>
                  </h1>
                  <p className="db-hero-sub">
                    Track uniforms, books, stationery, and crest balances. Monitor cost vs retail valuation, profit margins, and reorder thresholds.
                  </p>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <a href="/store/pos" className="db-btn-gold" style={{ textDecoration: "none" }}>
                    <i className="bi bi-cart3"></i> Launch POS Slip
                  </a>
                  <button type="button" className="db-btn-primary" onClick={openAddItemModal}>
                    <i className="bi bi-plus-circle"></i> Add New Product
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Valuation Summary Cards */}
            <div className="row g-3 mb-4">
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="db-stat-card">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="db-stat-label">Total Catalog Items</span>
                    <div className="db-stat-icon" style={{ background: "rgba(15, 39, 68, 0.08)", color: "#0F2744" }}>
                      <i className="bi bi-box-seam"></i>
                    </div>
                  </div>
                  <h3 className="db-stat-value">{summary.total_items}</h3>
                  <span className="text-muted small">{summary.total_units} total units in stock</span>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-xl-3">
                <div className="db-stat-card">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="db-stat-label">Total Cost Valuation</span>
                    <div className="db-stat-icon" style={{ background: "rgba(37, 99, 235, 0.12)", color: "#2563EB" }}>
                      <i className="bi bi-wallet2"></i>
                    </div>
                  </div>
                  <h3 className="db-stat-value">₦{Number(summary.valuation_cost || 0).toLocaleString()}</h3>
                  <span className="text-muted small">Capital tied in stock</span>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-xl-3">
                <div className="db-stat-card">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="db-stat-label">Total Retail Valuation</span>
                    <div className="db-stat-icon" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10B981" }}>
                      <i className="bi bi-cash-stack"></i>
                    </div>
                  </div>
                  <h3 className="db-stat-value">₦{Number(summary.valuation_retail || 0).toLocaleString()}</h3>
                  <span className="text-success small fw-bold">
                    <i className="bi bi-graph-up-arrow me-1"></i>+₦{Number(summary.potential_profit || 0).toLocaleString()} Profit
                  </span>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-xl-3">
                <div className="db-stat-card">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="db-stat-label">Low Stock Warnings</span>
                    <div className="db-stat-icon" style={{ background: "rgba(239, 68, 68, 0.12)", color: "#DC2626" }}>
                      <i className="bi bi-exclamation-triangle"></i>
                    </div>
                  </div>
                  <h3 className="db-stat-value text-danger">{summary.low_stock_count}</h3>
                  <span className="text-muted small">Items below reorder level</span>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="db-card p-3 mb-4">
              <div className="row g-3 align-items-center">
                <div className="col-12 col-md-5">
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0">
                      <i className="bi bi-search text-muted"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0 ps-0"
                      placeholder="Search by product name, SKU, or class..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="col-12 col-md-3">
                  <select
                    className="form-select"
                    value={selectedCat}
                    onChange={(e) => setSelectedCat(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-md-4 d-flex align-items-center justify-content-md-end gap-2">
                  <button
                    type="button"
                    className={`btn btn-sm ${lowStockFilter ? "btn-danger fw-bold" : "btn-outline-danger"}`}
                    onClick={() => setLowStockFilter((prev) => !prev)}
                  >
                    <i className="bi bi-exclamation-circle me-1"></i> Low Stock Only
                  </button>
                  <a href="/store/categories" className="btn btn-sm btn-outline-secondary">
                    <i className="bi bi-tags me-1"></i> Categories ({categories.length})
                  </a>
                </div>
              </div>
            </div>

            {/* Inventory Table */}
            {loading ? (
              <div className="py-5 text-center">
                <Loader />
                <p className="text-muted mt-3">Loading inventory items...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="db-card p-5 text-center">
                <i className="bi bi-box2 text-muted" style={{ fontSize: "42px" }}></i>
                <h6 className="fw-bold mt-3 mb-1">No Inventory Items Found</h6>
                <p className="text-muted small mb-3">Create products, uniforms, textbooks, and stationery to start selling.</p>
                <button type="button" className="btn btn-primary btn-sm" onClick={openAddItemModal}>
                  <i className="bi bi-plus-circle me-1"></i> Add First Item
                </button>
              </div>
            ) : (
              <div className="db-card overflow-hidden">
                <div className="table-responsive">
                  <table className="table mb-0">
                    <thead className="db-table-head">
                      <tr>
                        <th>Product Details</th>
                        <th>Category & Type</th>
                        <th>Class / Specs</th>
                        <th className="text-end">Cost Price</th>
                        <th className="text-end">Selling Price</th>
                        <th className="text-center">Stock Level</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const isOutOfStock = item.current_stock <= 0;
                        const isLow = item.current_stock <= item.reorder_level && !isOutOfStock;

                        return (
                          <tr key={item.id} className="db-table-row">
                            <td>
                              <div className="fw-bold text-dark">{item.name}</div>
                              <div className="text-muted" style={{ fontSize: "11px" }}>
                                SKU: <span className="font-monospace">{item.item_code}</span>
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-light text-dark border">
                                {item.category?.name || "Uncategorized"}
                              </span>
                              <small className="d-block text-muted text-capitalize mt-1" style={{ fontSize: "11px" }}>
                                {item.item_type}
                              </small>
                            </td>
                            <td>
                              {item.class_target && (
                                <div className="small text-dark font-semibold">{item.class_target}</div>
                              )}
                              {item.size && (
                                <div className="text-muted small" style={{ fontSize: "11px" }}>Size: {item.size}</div>
                              )}
                              {!item.class_target && !item.size && <span className="text-muted small">-</span>}
                            </td>
                            <td className="text-end font-monospace">
                              ₦{Number(item.cost_price).toLocaleString()}
                            </td>
                            <td className="text-end font-monospace fw-bold text-dark">
                              ₦{Number(item.selling_price).toLocaleString()}
                            </td>
                            <td className="text-center">
                              {isOutOfStock ? (
                                <span className="badge-soft-danger">0 {item.unit} (Out)</span>
                              ) : isLow ? (
                                <span className="badge-soft-warning">
                                  {item.current_stock} {item.unit} (Low)
                                </span>
                              ) : (
                                <span className="badge-soft-success">
                                  {item.current_stock} {item.unit}
                                </span>
                              )}
                            </td>
                            <td className="text-end">
                              <div className="d-flex align-items-center justify-content-end gap-1">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-success py-1 px-2"
                                  title="Restock / Adjust"
                                  onClick={() => openRestockModal(item)}
                                >
                                  <i className="bi bi-plus-slash-minus"></i> Restock
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary py-1 px-2"
                                  title="Edit item"
                                  onClick={() => openEditItemModal(item)}
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger py-1 px-2"
                                  title="Delete item"
                                  onClick={() => handleDeleteItem(item)}
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
      <Footer />

            {/* Add / Edit Item Modal with Top Save Button */}
      {showItemModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ background: "rgba(15, 39, 68, 0.75)", backdropFilter: "blur(6px)", zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg" style={{ maxWidth: "720px", maxHeight: "92vh" }}>
            <div className="modal-content rounded-4 border-0 shadow-2xl overflow-hidden d-flex flex-column" style={{ maxHeight: "90vh" }}>
              <form onSubmit={handleSaveItem} className="d-flex flex-column h-100 overflow-hidden m-0">
                <div className="modal-header border-bottom py-3 px-4 bg-white d-flex align-items-center justify-content-between flex-shrink-0">
                  <div className="d-flex align-items-center gap-2">
                    <div className="rounded-circle bg-primary bg-opacity-10 p-2 text-primary d-flex align-items-center justify-content-center" style={{ width: "34px", height: "34px" }}>
                      <i className="bi bi-box-seam" style={{ fontSize: "16px" }}></i>
                    </div>
                    <h6 className="modal-title fw-bold text-dark mb-0">
                      {editingItem ? `Edit "${editingItem.name}"` : "Add New Store / Inventory Product"}
                    </h6>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setShowItemModal(false)}></button>
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
                        <span className="spinner-border spinner-border-sm"></span> Saving Product...
                      </>
                    ) : editingItem ? (
                      <>
                        <i className="bi bi-check-circle-fill"></i> Save Changes
                      </>
                    ) : (
                      <>
                        <i className="bi bi-plus-circle-fill"></i> Create Product Now
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-3"
                    onClick={() => setShowItemModal(false)}
                  >
                    Cancel
                  </button>
                </div>

                <div className="modal-body p-4 overflow-y-auto" style={{ background: "#F8FAFC" }}>
                  <div className="row g-3">
                    <div className="col-12 col-md-8">
                      <label className="form-label fw-bold small text-dark">Product Name *</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        placeholder="e.g. Senior Secondary Blazer, Mathematics JSS 1"
                        value={itemForm.name}
                        onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label fw-bold small text-dark">SKU / Barcode Code</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Auto-generated if blank"
                        value={itemForm.item_code}
                        onChange={(e) => setItemForm({ ...itemForm, item_code: e.target.value })}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label fw-bold small text-dark">Category</label>
                      <select
                        className="form-select"
                        value={itemForm.category_id}
                        onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                      >
                        <option value="">-- No Category --</option>
                        {categories.map((c) => (
                          <option key={c.id} value={String(c.id)}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label fw-bold small text-dark">Item Classification</label>
                      <select
                        className="form-select"
                        value={itemForm.item_type}
                        onChange={(e) => setItemForm({ ...itemForm, item_type: e.target.value })}
                      >
                        <option value="uniform">School Uniform & Sports Wear</option>
                        <option value="book">Textbook & Notebooks</option>
                        <option value="stationery">Stationery & Math Sets</option>
                        <option value="crest">School Crest, Badges & Ties</option>
                        <option value="accessory">Footwear, Cardigans & Accessories</option>
                        <option value="other">Other Store Item</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label fw-bold small text-dark">Cost / Purchase Price (₦) *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        className="form-control"
                        placeholder="0.00"
                        value={itemForm.cost_price}
                        onChange={(e) => setItemForm({ ...itemForm, cost_price: Number(e.target.value) })}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label fw-bold small text-dark">Selling Price (₦) *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        className="form-control"
                        placeholder="0.00"
                        value={itemForm.selling_price}
                        onChange={(e) => setItemForm({ ...itemForm, selling_price: Number(e.target.value) })}
                      />
                    </div>

                    {!editingItem && (
                      <div className="col-12 col-md-4">
                        <label className="form-label fw-bold small text-dark">Initial Stock Count</label>
                        <input
                          type="number"
                          min="0"
                          className="form-control"
                          placeholder="0"
                          value={itemForm.current_stock}
                          onChange={(e) => setItemForm({ ...itemForm, current_stock: Number(e.target.value) })}
                        />
                      </div>
                    )}

                    <div className="col-12 col-md-4">
                      <label className="form-label fw-bold small text-dark">Reorder Alert Level</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        placeholder="5"
                        value={itemForm.reorder_level}
                        onChange={(e) => setItemForm({ ...itemForm, reorder_level: Number(e.target.value) })}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label fw-bold small text-dark">Size Specification</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. S, M, L, XL, 34, 38"
                        value={itemForm.size}
                        onChange={(e) => setItemForm({ ...itemForm, size: e.target.value })}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label fw-bold small text-dark">Target Class</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. JSS 1, Primary 3, All"
                        value={itemForm.class_target}
                        onChange={(e) => setItemForm({ ...itemForm, class_target: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal with Top Save Button */}
      {showRestockModal && restockTarget && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ background: "rgba(15, 39, 68, 0.75)", backdropFilter: "blur(6px)", zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: "480px", maxHeight: "92vh" }}>
            <div className="modal-content rounded-4 border-0 shadow-2xl overflow-hidden d-flex flex-column" style={{ maxHeight: "90vh" }}>
              <form onSubmit={handleRestockSubmit} className="d-flex flex-column h-100 overflow-hidden m-0">
                {/* Header with Title & Close */}
                <div className="modal-header border-bottom py-3 px-4 bg-white d-flex align-items-center justify-content-between flex-shrink-0">
                  <div className="d-flex align-items-center gap-2">
                    <div className="rounded-circle bg-success bg-opacity-10 p-2 text-success d-flex align-items-center justify-content-center" style={{ width: "36px", height: "36px" }}>
                      <i className="bi bi-box-arrow-in-down" style={{ fontSize: "18px" }}></i>
                    </div>
                    <div>
                      <h6 className="modal-title fw-bold text-dark mb-0" style={{ fontSize: "15px" }}>
                        Restock / Adjust Stock
                      </h6>
                      <small className="text-muted text-truncate d-inline-block" style={{ maxWidth: "240px", fontSize: "11.5px" }}>
                        {restockTarget.name}
                      </small>
                    </div>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setShowRestockModal(false)}></button>
                </div>

                {/* TOP Action Bar with Primary Confirm Button */}
                <div className="p-3 bg-light border-bottom flex-shrink-0 d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-success fw-bold flex-grow-1 py-2 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                    disabled={isSubmitting || !restockForm.quantity}
                    style={{ fontSize: "14px" }}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm"></span> Saving Stock...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle-fill"></i> Save Stock Adjustment
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-3"
                    onClick={() => setShowRestockModal(false)}
                  >
                    Cancel
                  </button>
                </div>

                {/* Scrollable Form Body */}
                <div className="modal-body p-4 overflow-y-auto" style={{ background: "#F8FAFC" }}>
                  <div className="p-3 bg-white border rounded-3 mb-3 shadow-xs">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted small">Current In-Stock Balance:</span>
                      <span className="badge bg-primary fs-6 px-3 py-1 font-monospace">
                        {restockTarget.current_stock} {restockTarget.unit}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold small text-dark mb-1">
                      Quantity to Add / Adjust *
                    </label>
                    <input
                      type="number"
                      required
                      className="form-control form-control-lg fw-bold font-monospace"
                      placeholder="e.g. 20"
                      value={restockForm.quantity || ""}
                      onChange={(e) => setRestockForm({ ...restockForm, quantity: Number(e.target.value) })}
                    />
                    <small className="text-muted d-block mt-1" style={{ fontSize: "11px" }}>
                      💡 Enter positive number (e.g. 25) to restock. Enter negative (e.g. -3) for damaged/defective write-offs.
                    </small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold small text-dark mb-1">Batch Cost Price per unit (₦)</label>
                    <div className="input-group">
                      <span className="input-group-text bg-white">₦</span>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        placeholder={String(restockTarget.cost_price || 0)}
                        value={restockForm.unit_cost || ""}
                        onChange={(e) => setRestockForm({ ...restockForm, unit_cost: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold small text-dark mb-1">Supplier Reference / Invoice #</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. INV-2026-088, Direct Market Purchase"
                      value={restockForm.reference}
                      onChange={(e) => setRestockForm({ ...restockForm, reference: e.target.value })}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="form-label fw-bold small text-dark mb-1">Reason / Note (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Term 1 Supply, Returned Defect"
                      value={restockForm.reason}
                      onChange={(e) => setRestockForm({ ...restockForm, reason: e.target.value })}
                    />
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
