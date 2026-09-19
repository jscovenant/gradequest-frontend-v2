import React, { useState, useEffect, useRef } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import PageTitle from "../../../components/PageTitle";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import { getUser } from "../../../utils/token";

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
  is_active: boolean;
  category?: Category;
}

interface CartItem {
  item: StoreItem;
  quantity: number;
  unit_price: number;
}

export default function StorePosPage() {
  const { showSuccess, showError, showWarning } = useToast();
  const user = getUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState<StoreItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Student Autocomplete Search
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");

  // Cart & Checkout
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "pos_card" | "bank_transfer" | "wallet">("cash");
  const [amountTendered, setAmountTendered] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<string>("0");
  const [orderNotes, setOrderNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt Modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const receiptPrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [itemsRes, catRes] = await Promise.all([
        authApi.get("/store/items?active_only=1"),
        authApi.get("/store/categories"),
      ]);

      if (itemsRes.data?.status === "success" || Array.isArray(itemsRes.data?.data)) {
        setItems(itemsRes.data.data || []);
      }
      if (catRes.data?.status === "success" || Array.isArray(catRes.data?.data)) {
        setCategories(catRes.data.data || []);
      }
    } catch (err: any) {
      console.error("Error fetching POS data:", err);
      showError?.(err?.response?.data?.message || "Failed to load store inventory.");
    } finally {
      setLoading(false);
    }
  };

  // Search Students
  useEffect(() => {
    if (!studentSearch.trim() || studentSearch.length < 2) {
      setStudentResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingStudent(true);
      try {
        const res = await authApi.get(`/students/search?query=${encodeURIComponent(studentSearch)}`);
        setStudentResults(res.data?.data || res.data || []);
      } catch (err) {
        console.error("Error searching students:", err);
      } finally {
        setIsSearchingStudent(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [studentSearch]);

  const addToCart = (item: StoreItem) => {
    if (item.current_stock <= 0) {
      showWarning?.(`"${item.name}" is currently out of stock!`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        if (existing.quantity >= item.current_stock) {
          showWarning?.(`Cannot add more than available stock (${item.current_stock} ${item.unit}).`);
          return prev;
        }
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { item, quantity: 1, unit_price: Number(item.selling_price) }];
    });
  };

  const updateQuantity = (itemId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.item.id === itemId) {
            const nextQty = c.quantity + delta;
            if (nextQty <= 0) return null;
            if (nextQty > c.item.current_stock) {
              showWarning?.(`Maximum available stock is ${c.item.current_stock}.`);
              return c;
            }
            return { ...c, quantity: nextQty };
          }
          return c;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (itemId: number) => {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedStudent(null);
    setStudentSearch("");
    setBuyerName("");
    setBuyerPhone("");
    setAmountTendered("");
    setDiscountAmount("0");
    setOrderNotes("");
  };

  // Calculations
  const subtotal = cart.reduce((sum, c) => sum + c.quantity * c.unit_price, 0);
  const discount = Math.max(0, Number(discountAmount) || 0);
  const grandTotal = Math.max(0, subtotal - discount);
  const tendered = amountTendered === "" ? grandTotal : Number(amountTendered) || 0;
  const changeDue = Math.max(0, tendered - grandTotal);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      showWarning?.("Your POS cart is empty. Add items to checkout.");
      return;
    }

    if (tendered < grandTotal && paymentMethod === "cash") {
      showError?.(`Amount tendered (₦${tendered.toLocaleString()}) is less than total (₦${grandTotal.toLocaleString()}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        items: cart.map((c) => ({
          item_id: c.item.id,
          quantity: c.quantity,
          unit_price: c.unit_price,
        })),
        student_id: selectedStudent?.id || null,
        buyer_name: buyerName.trim() || (selectedStudent ? selectedStudent.name : "Walk-in Customer"),
        buyer_phone: buyerPhone.trim() || null,
        payment_method: paymentMethod,
        amount_tendered: tendered,
        discount: discount,
        notes: orderNotes.trim() || null,
      };

      const res = await authApi.post("/store/pos/checkout", payload);

      if (res.data?.status === "success" || res.data?.data) {
        const saleData = res.data.data;
        showSuccess?.("Sale completed & receipt generated!");
        setCompletedSale(saleData);
        setShowReceiptModal(true);
        clearCart();
        fetchInitialData(); // Refresh stock
      } else {
        showError?.(res.data?.message || "Checkout could not be processed.");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      showError?.(err?.response?.data?.message || "Checkout failed. Please check stock.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const filteredItems = items.filter((item) => {
    const matchCat = selectedCategory === "all" || String(item.category_id) === selectedCategory;
    const matchSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.item_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.class_target && item.class_target.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

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

        .pos-item-card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 16px; cursor: pointer; transition: all 0.2s ease; position: relative; display: flex; flex-direction: column; justify-content: space-between; height: 100%; }
        .pos-item-card:hover { border-color: #D97706; transform: translateY(-2px); box-shadow: 0 8px 16px -4px rgba(217, 119, 6, 0.12); }
        .pos-item-code { font-size: 10.5px; font-weight: 700; color: #94A3B8; letter-spacing: 0.05em; text-transform: uppercase; }
        .pos-item-name { font-size: 14px; font-weight: 700; color: #0F2744; margin: 4px 0 6px; line-height: 1.3; }
        .pos-item-price { font-size: 16px; font-weight: 800; color: #D97706; }
        .pos-cart-panel { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 18px; box-shadow: 0 4px 20px -2px rgba(15, 39, 68, 0.08); position: sticky; top: 80px; }
        .pos-cart-item { padding: 12px 16px; border-bottom: 1px solid #F1F5F9; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .pos-cart-item:last-child { border-bottom: none; }
        .qty-btn { width: 28px; height: 28px; border-radius: 8px; border: 1px solid #CBD5E1; background: #FFFFFF; color: #0F2744; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: all 0.15s; }
        .qty-btn:hover { background: #0F2744; color: #FFFFFF; border-color: #0F2744; }
        @media print {
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area { position: absolute; left: 0; top: 0; width: 80mm; margin: 0 auto; }
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="School Store POS & Cashier Desk | SchoolProfit" />

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
                    POINT OF SALE & CASHIER DESK
                  </div>
                  <h1 className="db-greeting">
                    School Store <em>POS Terminal</em>
                  </h1>
                  <p className="db-hero-sub">
                    Quick uniform, book, crest & stationery checkout. Real-time stock sync, student linking, automated change calculation, and instant thermal receipts.
                  </p>
                </div>

                <div className="d-flex align-items-center gap-3">
                  <a href="/store/inventory" className="db-btn-outline" style={{ textDecoration: "none" }}>
                    <i className="bi bi-boxes"></i> Manage Stock
                  </a>
                  <a href="/store/sales" className="db-btn-gold" style={{ textDecoration: "none" }}>
                    <i className="bi bi-receipt"></i> Sales Ledger
                  </a>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="py-5 text-center">
                <Loader />
                <p className="text-muted mt-3 fw-semibold">Loading store inventory & POS catalog...</p>
              </div>
            ) : (
              <div className="row g-4">
                {/* LEFT: Product Catalog & Fast Grid */}
                <div className="col-12 col-xl-7">
                  {/* Search & Categories Bar */}
                  <div className="db-card p-3 mb-3">
                    <div className="row g-2 align-items-center">
                      <div className="col-12 col-md-7">
                        <div className="input-group">
                          <span className="input-group-text bg-white border-end-0" style={{ borderColor: "#CBD5E1" }}>
                            <i className="bi bi-search text-muted"></i>
                          </span>
                          <input
                            type="text"
                            className="form-control border-start-0 ps-0"
                            style={{ borderColor: "#CBD5E1", fontSize: "13.5px" }}
                            placeholder="Search items by name, barcode, SKU or class..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                          {searchQuery && (
                            <button className="btn btn-outline-secondary border-start-0" type="button" onClick={() => setSearchQuery("")}>
                              <i className="bi bi-x-lg"></i>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="col-12 col-md-5">
                        <select
                          className="form-select"
                          style={{ borderColor: "#CBD5E1", fontSize: "13.5px", fontWeight: 600 }}
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                          <option value="all">All Categories ({items.length})</option>
                          {categories.map((c) => (
                            <option key={c.id} value={String(c.id)}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Category Fast Filter Pills */}
                    <div className="d-flex gap-2 overflow-auto mt-3 pb-1">
                      <button
                        type="button"
                        className={`db-tab-btn ${selectedCategory === "all" ? "active" : ""}`}
                        onClick={() => setSelectedCategory("all")}
                      >
                        <i className="bi bi-grid"></i> All Items
                      </button>
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`db-tab-btn ${selectedCategory === String(c.id) ? "active" : ""}`}
                          onClick={() => setSelectedCategory(String(c.id))}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Items Grid */}
                  {filteredItems.length === 0 ? (
                    <div className="db-card p-5 text-center">
                      <i className="bi bi-box-seam text-muted" style={{ fontSize: "42px" }}></i>
                      <h6 className="fw-bold mt-3 mb-1 text-dark">No Items Found</h6>
                      <p className="text-muted small mb-3">No products match your search or selected category.</p>
                      <a href="/store/inventory" className="btn btn-sm btn-primary">
                        <i className="bi bi-plus-circle me-1"></i> Add Inventory Items
                      </a>
                    </div>
                  ) : (
                    <div className="row g-3">
                      {filteredItems.map((item) => {
                        const inCart = cart.find((c) => c.item.id === item.id);
                        const isOutOfStock = item.current_stock <= 0;
                        const isLowStock = item.current_stock <= item.reorder_level && !isOutOfStock;

                        return (
                          <div key={item.id} className="col-12 col-sm-6 col-md-4">
                            <div
                              className="pos-item-card"
                              onClick={() => !isOutOfStock && addToCart(item)}
                              style={{ opacity: isOutOfStock ? 0.6 : 1 }}
                            >
                              <div>
                                <div className="d-flex align-items-center justify-content-between mb-1">
                                  <span className="pos-item-code">{item.item_code}</span>
                                  {isOutOfStock ? (
                                    <span className="badge-soft-danger">Out of Stock</span>
                                  ) : isLowStock ? (
                                    <span className="badge-soft-warning">Low ({item.current_stock} left)</span>
                                  ) : (
                                    <span className="badge-soft-success">{item.current_stock} {item.unit}</span>
                                  )}
                                </div>

                                <h6 className="pos-item-name" title={item.name}>
                                  {item.name}
                                </h6>

                                <div className="d-flex flex-wrap gap-1 mb-2">
                                  {item.size && (
                                    <span className="badge bg-light text-dark border small" style={{ fontSize: "10.5px" }}>
                                      Size: {item.size}
                                    </span>
                                  )}
                                  {item.class_target && (
                                    <span className="badge bg-light text-muted border small" style={{ fontSize: "10.5px" }}>
                                      {item.class_target}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                                <span className="pos-item-price">₦{Number(item.selling_price).toLocaleString()}</span>

                                {inCart ? (
                                  <span className="badge bg-primary rounded-pill px-2 py-1 fw-bold">
                                    {inCart.quantity} in Cart
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary py-1 px-2 rounded-3"
                                    disabled={isOutOfStock}
                                  >
                                    <i className="bi bi-cart-plus"></i> Add
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* RIGHT: Live Checkout Slip / POS Terminal */}
                <div className="col-12 col-xl-5">
                  <div className="pos-cart-panel p-4">
                    <div className="d-flex align-items-center justify-content-between pb-3 border-bottom mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <div className="db-stat-icon" style={{ background: "rgba(217, 119, 6, 0.15)", color: "#D97706", width: "36px", height: "36px" }}>
                          <i className="bi bi-cart3"></i>
                        </div>
                        <div>
                          <h6 className="fw-bold mb-0 text-dark">Checkout Slip</h6>
                          <small className="text-muted">{cart.length} unique items</small>
                        </div>
                      </div>

                      {cart.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger py-1 px-2"
                          onClick={clearCart}
                          title="Clear cart"
                        >
                          <i className="bi bi-trash3"></i> Clear
                        </button>
                      )}
                    </div>

                    {/* Student / Customer Linker */}
                    <div className="mb-3">
                      <label className="form-label fw-bold text-dark small mb-1">
                        <i className="bi bi-person-badge me-1 text-primary"></i> Link to Student (Optional)
                      </label>

                      {selectedStudent ? (
                        <div className="p-2 border rounded-3 bg-light d-flex align-items-center justify-content-between">
                          <div>
                            <div className="fw-bold text-dark small">{selectedStudent.name}</div>
                            <div className="text-muted" style={{ fontSize: "11px" }}>
                              Reg: {selectedStudent.reg_no || selectedStudent.identification_number || "N/A"} | Class: {selectedStudent.student_class?.name || "General"}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-link text-danger p-0"
                            onClick={() => {
                              setSelectedStudent(null);
                              setBuyerName("");
                            }}
                          >
                            <i className="bi bi-x-circle-fill"></i>
                          </button>
                        </div>
                      ) : (
                        <div className="position-relative">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Type student name or reg number..."
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                          />
                          {isSearchingStudent && (
                            <div className="position-absolute top-50 end-0 translate-middle-y me-2 spinner-border spinner-border-sm text-primary"></div>
                          )}

                          {studentResults.length > 0 && (
                            <div
                              className="position-absolute w-100 bg-white border rounded-3 shadow-lg mt-1 overflow-auto"
                              style={{ maxHeight: "180px", zIndex: 100 }}
                            >
                              {studentResults.map((s) => (
                                <div
                                  key={s.id}
                                  className="p-2 border-bottom cursor-pointer hover-bg-light small"
                                  style={{ cursor: "pointer" }}
                                  onClick={() => {
                                    setSelectedStudent(s);
                                    setBuyerName(s.name);
                                    setStudentSearch("");
                                    setStudentResults([]);
                                  }}
                                >
                                  <div className="fw-bold text-dark">{s.name}</div>
                                  <div className="text-muted" style={{ fontSize: "11px" }}>
                                    {s.reg_no || s.identification_number} - {s.student_class?.name || "Class"}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Walk-in Buyer Fields */}
                    {!selectedStudent && (
                      <div className="row g-2 mb-3">
                        <div className="col-7">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Buyer Name (e.g. Walk-in / Parent)"
                            value={buyerName}
                            onChange={(e) => setBuyerName(e.target.value)}
                          />
                        </div>
                        <div className="col-5">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Phone No"
                            value={buyerPhone}
                            onChange={(e) => setBuyerPhone(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Cart Items List */}
                    <div className="border rounded-3 mb-3 overflow-auto" style={{ maxHeight: "280px" }}>
                      {cart.length === 0 ? (
                        <div className="p-4 text-center text-muted small">
                          <i className="bi bi-cart-x mb-2 d-block" style={{ fontSize: "28px" }}></i>
                          No items added yet. Click on any item from the catalog to add to slip.
                        </div>
                      ) : (
                        cart.map((c) => (
                          <div key={c.item.id} className="pos-cart-item">
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="fw-bold text-dark text-truncate small">{c.item.name}</div>
                              <div className="text-muted" style={{ fontSize: "11px" }}>
                                ₦{c.unit_price.toLocaleString()} × {c.quantity}
                              </div>
                            </div>

                            <div className="d-flex align-items-center gap-2">
                              <button
                                type="button"
                                className="qty-btn"
                                onClick={() => updateQuantity(c.item.id, -1)}
                              >
                                -
                              </button>
                              <span className="fw-bold small px-1">{c.quantity}</span>
                              <button
                                type="button"
                                className="qty-btn"
                                onClick={() => updateQuantity(c.item.id, 1)}
                              >
                                +
                              </button>
                            </div>

                            <div className="text-end" style={{ minWidth: "75px" }}>
                              <div className="fw-bold text-dark small">
                                ₦{(c.quantity * c.unit_price).toLocaleString()}
                              </div>
                              <button
                                type="button"
                                className="btn btn-sm btn-link text-danger p-0 text-decoration-none"
                                style={{ fontSize: "11px" }}
                                onClick={() => removeFromCart(c.item.id)}
                              >
                                remove
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Payment Form */}
                    <form onSubmit={handleCheckout}>
                      <div className="mb-3">
                        <label className="form-label fw-bold text-dark small mb-1">Payment Method</label>
                        <div className="d-grid gap-2 grid-flow-col" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                          {[
                            { id: "cash", label: "Cash", icon: "cash" },
                            { id: "pos_card", label: "POS Card", icon: "credit-card" },
                            { id: "bank_transfer", label: "Transfer", icon: "bank" },
                            { id: "wallet", label: "Wallet", icon: "wallet2" },
                          ].map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              className={`btn btn-sm py-2 ${paymentMethod === m.id ? "btn-primary fw-bold" : "btn-outline-secondary"}`}
                              onClick={() => setPaymentMethod(m.id as any)}
                              style={{ fontSize: "11.5px" }}
                            >
                              <i className={`bi bi-${m.icon} d-block mb-1`}></i>
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="row g-2 mb-3">
                        <div className="col-6">
                          <label className="form-label text-muted small mb-1">Discount (₦)</label>
                          <input
                            type="number"
                            min="0"
                            className="form-control form-control-sm"
                            placeholder="0"
                            value={discountAmount}
                            onChange={(e) => setDiscountAmount(e.target.value)}
                          />
                        </div>
                        <div className="col-6">
                          <label className="form-label text-muted small mb-1">Amount Tendered (₦)</label>
                          <input
                            type="number"
                            min="0"
                            className="form-control form-control-sm"
                            placeholder={grandTotal.toString()}
                            value={amountTendered}
                            onChange={(e) => setAmountTendered(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Summary Totals */}
                      <div className="p-3 bg-light rounded-3 mb-3">
                        <div className="d-flex justify-content-between text-muted small mb-1">
                          <span>Subtotal:</span>
                          <span>₦{subtotal.toLocaleString()}</span>
                        </div>
                        {discount > 0 && (
                          <div className="d-flex justify-content-between text-danger small mb-1">
                            <span>Discount Applied:</span>
                            <span>-₦{discount.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="d-flex justify-content-between fw-bold text-dark pt-2 border-top" style={{ fontSize: "16px" }}>
                          <span>Total Due:</span>
                          <span className="text-primary">₦{grandTotal.toLocaleString()}</span>
                        </div>

                        {paymentMethod === "cash" && tendered > grandTotal && (
                          <div className="d-flex justify-content-between fw-bold text-success pt-1" style={{ fontSize: "14px" }}>
                            <span>Change Due:</span>
                            <span>₦{changeDue.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary w-100 py-3 fw-bold rounded-3 shadow-sm d-flex align-items-center justify-content-center gap-2"
                        disabled={cart.length === 0 || isSubmitting}
                        style={{ fontSize: "14.5px" }}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm"></span> Processing Sale...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-printer"></i> Complete Sale & Issue Receipt (₦{grandTotal.toLocaleString()})
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
      <Footer />

            {/* Viewport-Responsive Thermal Receipt Modal with Top Print Button */}
      {showReceiptModal && completedSale && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ background: "rgba(15, 39, 68, 0.75)", backdropFilter: "blur(6px)", zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: "440px", maxHeight: "92vh" }}>
            <div className="modal-content rounded-4 border-0 shadow-2xl overflow-hidden d-flex flex-column" style={{ maxHeight: "90vh" }}>
              {/* Header */}
              <div className="modal-header border-bottom py-3 px-4 bg-white d-flex align-items-center justify-content-between flex-shrink-0">
                <div className="d-flex align-items-center gap-2">
                  <div className="rounded-circle bg-success bg-opacity-10 p-2 text-success d-flex align-items-center justify-content-center" style={{ width: "34px", height: "34px" }}>
                    <i className="bi bi-check-circle-fill" style={{ fontSize: "16px" }}></i>
                  </div>
                  <div>
                    <h6 className="modal-title fw-bold text-success mb-0" style={{ fontSize: "14px" }}>
                      Sale Successful!
                    </h6>
                    <small className="text-muted font-monospace" style={{ fontSize: "11px" }}>{completedSale.receipt_number}</small>
                  </div>
                </div>
                <button type="button" className="btn-close" onClick={() => setShowReceiptModal(false)}></button>
              </div>

              {/* TOP Action Bar with Prominent Print Button */}
              <div className="p-3 bg-light border-bottom flex-shrink-0 d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-primary fw-bold flex-grow-1 py-2 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                  onClick={handlePrintReceipt}
                  style={{ fontSize: "14px" }}
                >
                  <i className="bi bi-printer-fill"></i> Print Receipt
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary px-3"
                  onClick={() => setShowReceiptModal(false)}
                >
                  Next Sale
                </button>
              </div>

              {/* Scrollable Receipt Body */}
              <div className="modal-body p-3 overflow-y-auto" style={{ background: "#F1F5F9" }}>
                {/* Thermal Slip View */}
                <div
                  ref={receiptPrintRef}
                  id="receipt-print-area"
                  className="p-4 border rounded-3 bg-white text-dark font-monospace shadow-sm mx-auto"
                  style={{ fontSize: "12px", lineHeight: "1.4", maxWidth: "380px" }}
                >
                  <div className="text-center pb-3 border-bottom border-dashed mb-3">
                    <h6 className="fw-bold mb-0" style={{ fontSize: "15px" }}>{user?.school?.name || "GradeQuest International School"}</h6>
                    <small className="text-muted d-block">{user?.school?.address || "Official Store & Uniform Department"}</small>
                    <span className="badge bg-light text-dark border font-monospace mt-1 px-2 py-0.5" style={{ fontSize: "10px" }}>
                      OFFICIAL POS RECEIPT
                    </span>
                  </div>

                  <div className="mb-2">
                    <div><strong>Receipt No:</strong> <span className="text-primary">{completedSale.receipt_number}</span></div>
                    <div><strong>Date:</strong> {new Date(completedSale.created_at).toLocaleString()}</div>
                    <div><strong>Customer:</strong> {completedSale.buyer_name}</div>
                    {completedSale.buyer_phone && <div><strong>Phone:</strong> {completedSale.buyer_phone}</div>}
                    <div><strong>Payment:</strong> <span className="text-uppercase fw-bold">{completedSale.payment_method?.toUpperCase()}</span></div>
                  </div>

                  <table className="w-100 my-2 border-top border-bottom border-dashed">
                    <thead>
                      <tr className="border-bottom">
                        <th className="py-1">Item</th>
                        <th className="py-1 text-center">Qty</th>
                        <th className="py-1 text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedSale.items?.map((item: any) => (
                        <tr key={item.id}>
                          <td className="py-1 text-truncate" style={{ maxWidth: "150px" }}>{item.item_name}</td>
                          <td className="py-1 text-center">{item.quantity}</td>
                          <td className="py-1 text-end">₦{Number(item.total_price).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="pt-1">
                    <div className="d-flex justify-content-between">
                      <span>Subtotal:</span>
                      <span>₦{Number(completedSale.subtotal).toLocaleString()}</span>
                    </div>
                    {Number(completedSale.discount) > 0 && (
                      <div className="d-flex justify-content-between text-danger">
                        <span>Discount:</span>
                        <span>-₦{Number(completedSale.discount).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="d-flex justify-content-between fw-bold pt-1 border-top" style={{ fontSize: "14px" }}>
                      <span>Total Paid:</span>
                      <span className="text-primary">₦{Number(completedSale.total_amount).toLocaleString()}</span>
                    </div>
                    {Number(completedSale.change_due) > 0 && (
                      <div className="d-flex justify-content-between text-success fw-bold">
                        <span>Change Given:</span>
                        <span>₦{Number(completedSale.change_due).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-center pt-3 mt-3 border-top border-dashed text-muted" style={{ fontSize: "10.5px" }}>
                    <div>Thank you for your purchase!</div>
                    <div className="fw-semibold">Powered by SchoolProfit.ng</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}