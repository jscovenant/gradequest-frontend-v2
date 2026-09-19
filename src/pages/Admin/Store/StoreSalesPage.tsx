import React, { useState, useEffect } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import PageTitle from "../../../components/PageTitle";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import { getUser } from "../../../utils/token";

interface StoreSale {
  id: number;
  receipt_number: string;
  student_id?: number;
  buyer_name: string;
  buyer_phone?: string;
  subtotal: number;
  discount: number;
  total_amount: number;
  total_cost: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  items?: any[];
  student?: any;
  served_by?: any;
}

export default function StoreSalesPage() {
  const { showSuccess, showError } = useToast();
  const user = getUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [sales, setSales] = useState<StoreSale[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    total_sales: 0,
    total_profit: 0,
    total_transactions: 0,
    avg_basket_value: 0,
    today_sales: 0,
    today_profit: 0,
  });

  // Filters
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [loadingReceiptId, setLoadingReceiptId] = useState<number | null>(null);

  useEffect(() => {
    fetchSalesData();
  }, [page, paymentMethod, startDate, endDate]);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (paymentMethod) params.append("payment_method", paymentMethod);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      params.append("page", String(page));

      const [salesRes, analyticsRes] = await Promise.all([
        authApi.get(`/store/sales?${params.toString()}`),
        authApi.get("/store/analytics"),
      ]);

      if (salesRes.data?.status === "success" || salesRes.data?.data) {
        const payload = salesRes.data.data;
        setSales(payload.data || payload || []);
        setTotalPages(payload.last_page || 1);
      }
      if (analyticsRes.data?.status === "success" || analyticsRes.data?.data) {
        setAnalytics(analyticsRes.data.data || {});
      }
    } catch (err: any) {
      console.error("Error loading sales history:", err);
      showError?.(err?.response?.data?.message || "Failed to load sales transactions.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSalesData();
  };

  const viewReceipt = async (sale: StoreSale) => {
    setLoadingReceiptId(sale.id);
    try {
      const res = await authApi.get(`/store/sales/${sale.id}/receipt`);
      if (res.data?.status === "success" && res.data?.data) {
        setSelectedReceipt(res.data.data);
      } else if (res.data?.data) {
        setSelectedReceipt(res.data.data);
      } else {
        setSelectedReceipt(sale);
      }
    } catch (err: any) {
      console.warn("Receipt fetch fallback to row item data:", err);
      setSelectedReceipt(sale);
    } finally {
      setLoadingReceiptId(null);
      setShowReceiptModal(true);
    }
  };

  const handlePrint = () => {
    window.print();
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
        .db-btn-gold { background: linear-gradient(135deg, #D97706 0%, #B45309 100%); color: #FFFFFF; font-weight: 700; font-size: 13px; border: none; border-radius: 10px; padding: 9px 18px; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25); display: inline-flex; align-items: center; gap: 7px; transition: opacity 0.2s; }
        .db-btn-gold:hover { opacity: 0.92; color: #FFFFFF; }
        .db-btn-primary { background: #0F2744; color: #FFFFFF; font-weight: 700; font-size: 13px; border: none; border-radius: 10px; padding: 9px 18px; display: inline-flex; align-items: center; gap: 7px; transition: opacity 0.2s; }
        .db-btn-primary:hover { opacity: 0.92; color: #FFFFFF; }
        .db-table-head { background: #F8FAFC; border-bottom: 1px solid #E2E8F0; }
        .db-table-head th { font-size: 11.5px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; padding: 13px 18px; }
        .db-table-row td { font-size: 13px; color: #1E293B; padding: 14px 18px; vertical-align: middle; border-bottom: 1px solid #F1F5F9; }
        .db-table-row:hover { background: #F8FAFC; }
        .badge-soft-info { background: rgba(37, 99, 235, 0.12); color: #2563EB; font-weight: 700; border-radius: 8px; padding: 4px 9px; font-size: 11px; }

        @media print {
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area { position: absolute; left: 0; top: 0; width: 80mm; margin: 0 auto; box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Sales & Receipts Ledger | SchoolProfit" />

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
                    REVENUE & PROFIT AUDIT
                  </div>
                  <h1 className="db-greeting">
                    Sales & <em>Receipt Ledger</em>
                  </h1>
                  <p className="db-hero-sub">
                    Complete POS audit trail, gross profit margins per order, cashier tracking, and instant thermal receipt reprinting.
                  </p>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <a href="/store/pos" className="db-btn-gold" style={{ textDecoration: "none" }}>
                    <i className="bi bi-cart-plus"></i> Open POS Checkout
                  </a>
                </div>
              </div>
            </div>

            {/* 4 Financial KPI Cards */}
            <div className="row g-3 mb-4">
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="db-stat-card">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="db-stat-label">Total Store Revenue</span>
                    <div className="db-stat-icon" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10B981" }}>
                      <i className="bi bi-cash-stack"></i>
                    </div>
                  </div>
                  <h3 className="db-stat-value">₦{Number(analytics.total_sales || 0).toLocaleString()}</h3>
                  <span className="text-muted small">From {analytics.total_transactions || 0} transactions</span>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-xl-3">
                <div className="db-stat-card">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="db-stat-label">Net Gross Profit</span>
                    <div className="db-stat-icon" style={{ background: "rgba(217, 119, 6, 0.12)", color: "#D97706" }}>
                      <i className="bi bi-graph-up-arrow"></i>
                    </div>
                  </div>
                  <h3 className="db-stat-value text-success">₦{Number(analytics.total_profit || 0).toLocaleString()}</h3>
                  <span className="text-muted small">Revenue minus product costs</span>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-xl-3">
                <div className="db-stat-card">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="db-stat-label">Today's Sales</span>
                    <div className="db-stat-icon" style={{ background: "rgba(37, 99, 235, 0.12)", color: "#2563EB" }}>
                      <i className="bi bi-calendar2-check"></i>
                    </div>
                  </div>
                  <h3 className="db-stat-value">₦{Number(analytics.today_sales || 0).toLocaleString()}</h3>
                  <span className="text-success small fw-bold">₦{Number(analytics.today_profit || 0).toLocaleString()} Today's Profit</span>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-xl-3">
                <div className="db-stat-card">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="db-stat-label">Avg. Basket Value</span>
                    <div className="db-stat-icon" style={{ background: "rgba(15, 39, 68, 0.08)", color: "#0F2744" }}>
                      <i className="bi bi-basket"></i>
                    </div>
                  </div>
                  <h3 className="db-stat-value">₦{Number(analytics.avg_basket_value || 0).toLocaleString()}</h3>
                  <span className="text-muted small">Per parent/student purchase</span>
                </div>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="db-card p-3 mb-4">
              <form onSubmit={handleSearchSubmit}>
                <div className="row g-2 align-items-center">
                  <div className="col-12 col-md-4">
                    <div className="input-group">
                      <span className="input-group-text bg-white border-end-0">
                        <i className="bi bi-search text-muted"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control border-start-0 ps-0"
                        placeholder="Receipt #, Customer or Phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="col-6 col-md-2">
                    <select
                      className="form-select"
                      value={paymentMethod}
                      onChange={(e) => {
                        setPaymentMethod(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">All Payments</option>
                      <option value="cash">Cash</option>
                      <option value="pos_card">POS Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="wallet">Wallet</option>
                    </select>
                  </div>

                  <div className="col-6 col-md-2">
                    <input
                      type="date"
                      className="form-control"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>

                  <div className="col-6 col-md-2">
                    <input
                      type="date"
                      className="form-control"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>

                  <div className="col-6 col-md-2 d-flex gap-1">
                    <button type="submit" className="btn btn-primary w-100 fw-bold">
                      Filter
                    </button>
                    {(search || paymentMethod || startDate || endDate) && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => {
                          setSearch("");
                          setPaymentMethod("");
                          setStartDate("");
                          setEndDate("");
                          setPage(1);
                        }}
                        title="Reset filters"
                      >
                        <i className="bi bi-arrow-counterclockwise"></i>
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* Sales History Table */}
            {loading ? (
              <div className="py-5 text-center">
                <Loader />
                <p className="text-muted mt-3">Loading sales ledger...</p>
              </div>
            ) : sales.length === 0 ? (
              <div className="db-card p-5 text-center">
                <i className="bi bi-receipt text-muted" style={{ fontSize: "42px" }}></i>
                <h6 className="fw-bold mt-3 mb-1">No Sales Transactions Found</h6>
                <p className="text-muted small mb-3">No store orders have been placed matching your search filter.</p>
                <a href="/store/pos" className="btn btn-primary btn-sm">
                  <i className="bi bi-cart3 me-1"></i> Make First Sale
                </a>
              </div>
            ) : (
              <div className="db-card overflow-hidden">
                <div className="table-responsive">
                  <table className="table mb-0">
                    <thead className="db-table-head">
                      <tr>
                        <th>Receipt #</th>
                        <th>Date & Time</th>
                        <th>Customer / Student</th>
                        <th>Payment Method</th>
                        <th className="text-center">Items</th>
                        <th className="text-end">Total (₦)</th>
                        <th className="text-end">Profit (₦)</th>
                        <th>Cashier</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((sale) => {
                        const profit = Number(sale.total_amount) - Number(sale.total_cost);
                        return (
                          <tr key={sale.id} className="db-table-row">
                            <td className="font-monospace fw-bold text-primary">
                              {sale.receipt_number}
                            </td>
                            <td className="small text-muted">
                              {new Date(sale.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                            </td>
                            <td>
                              <div className="fw-bold text-dark">{sale.buyer_name}</div>
                              {sale.student && (
                                <div className="text-muted small" style={{ fontSize: "11px" }}>
                                  Student: {sale.student.name}
                                </div>
                              )}
                            </td>
                            <td>
                              <span className="badge bg-light text-dark border text-uppercase" style={{ fontSize: "10.5px" }}>
                                {sale.payment_method?.replace("_", " ")}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className="badge-soft-info">
                                {sale.items?.length || 1} items
                              </span>
                            </td>
                            <td className="text-end font-monospace fw-bold text-dark">
                              ₦{Number(sale.total_amount).toLocaleString()}
                            </td>
                            <td className="text-end font-monospace fw-bold text-success">
                              +₦{profit.toLocaleString()}
                            </td>
                            <td className="small text-muted">
                              {sale.served_by?.name || "Staff"}
                            </td>
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary py-1 px-2 d-inline-flex align-items-center gap-1"
                                disabled={loadingReceiptId === sale.id}
                                onClick={() => viewReceipt(sale)}
                              >
                                {loadingReceiptId === sale.id ? (
                                  <span className="spinner-border spinner-border-sm"></span>
                                ) : (
                                  <i className="bi bi-printer"></i>
                                )}
                                <span>Receipt</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="p-3 border-top d-flex align-items-center justify-content-between">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      ← Previous
                    </button>
                    <span className="small text-muted">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
      <Footer />

      {/* Viewport-Responsive Thermal Receipt Viewer Modal */}
      {showReceiptModal && selectedReceipt && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ background: "rgba(15, 39, 68, 0.75)", backdropFilter: "blur(6px)", zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: "440px", maxHeight: "92vh" }}>
            <div className="modal-content rounded-4 border-0 shadow-2xl overflow-hidden d-flex flex-column" style={{ maxHeight: "90vh" }}>
              {/* Header */}
              <div className="modal-header border-bottom py-3 px-4 bg-light d-flex align-items-center justify-content-between flex-shrink-0">
                <h6 className="modal-title fw-bold text-dark d-flex align-items-center gap-2 mb-0">
                  <i className="bi bi-receipt text-primary"></i> Thermal Sales Receipt
                </h6>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowReceiptModal(false)}
                ></button>
              </div>

              {/* Scrollable Receipt Body */}
              <div className="modal-body p-3 overflow-y-auto" style={{ background: "#F1F5F9" }}>
                <div
                  id="receipt-print-area"
                  className="p-4 border rounded-3 bg-white text-dark font-monospace shadow-sm mx-auto"
                  style={{ fontSize: "12px", lineHeight: "1.4", maxWidth: "380px" }}
                >
                  <div className="text-center pb-3 border-bottom border-dashed mb-3">
                    <h6 className="fw-bold mb-0" style={{ fontSize: "15px" }}>{user?.school?.name || selectedReceipt.school?.school_name || "GradeQuest International School"}</h6>
                    <small className="text-muted d-block">{user?.school?.address || selectedReceipt.school?.school_address || "Official School Store & Uniform Department"}</small>
                    <span className="badge bg-light text-dark border font-monospace mt-1 px-2 py-0.5" style={{ fontSize: "10px" }}>
                      OFFICIAL POS RECEIPT
                    </span>
                  </div>

                  <div className="mb-2">
                    <div><strong>Receipt No:</strong> <span className="text-primary">{selectedReceipt.receipt_number}</span></div>
                    <div><strong>Date:</strong> {new Date(selectedReceipt.created_at).toLocaleString()}</div>
                    <div><strong>Customer:</strong> {selectedReceipt.buyer_name}</div>
                    {selectedReceipt.buyer_phone && <div><strong>Phone:</strong> {selectedReceipt.buyer_phone}</div>}
                    {selectedReceipt.student && <div><strong>Student:</strong> {selectedReceipt.student.name}</div>}
                    <div><strong>Payment:</strong> <span className="text-uppercase fw-bold">{selectedReceipt.payment_method?.replace("_", " ")}</span></div>
                    {selectedReceipt.served_by && <div><strong>Cashier:</strong> {selectedReceipt.served_by.name}</div>}
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
                      {selectedReceipt.items?.map((item: any) => (
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
                      <span>₦{Number(selectedReceipt.subtotal).toLocaleString()}</span>
                    </div>
                    {Number(selectedReceipt.discount) > 0 && (
                      <div className="d-flex justify-content-between text-danger">
                        <span>Discount:</span>
                        <span>-₦{Number(selectedReceipt.discount).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="d-flex justify-content-between fw-bold pt-1 border-top" style={{ fontSize: "14px" }}>
                      <span>Total Paid:</span>
                      <span className="text-primary">₦{Number(selectedReceipt.total_amount).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="text-center pt-3 mt-3 border-top border-dashed text-muted" style={{ fontSize: "10.5px" }}>
                    <div>Thank you for your patronage!</div>
                    <div className="fw-semibold">Powered by SchoolProfit.ng</div>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="modal-footer border-top p-3 bg-white flex-shrink-0 d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary flex-grow-1"
                  onClick={() => setShowReceiptModal(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary fw-bold flex-grow-1 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                  onClick={handlePrint}
                >
                  <i className="bi bi-printer-fill"></i> Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
