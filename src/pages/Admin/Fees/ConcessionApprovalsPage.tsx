// src/pages/Admin/Fees/ConcessionApprovalsPage.tsx
import { useEffect, useMemo, useState } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";

/* =========================
   TYPES
========================= */
interface StudentUser {
  id: number;
  firstname: string;
  surname: string;
  reg_no: string;
  level_id?: number;
  section_id?: number;
}

interface ConcessionFeeItem {
  id: number;
  student_id: number;
  school_id: number;
  section_id: number;
  fee_type_id: number;
  gross_amount?: number;
  discount_amount?: number;
  discount_type?: "percentage" | "fixed";
  discount_rate?: number;
  discount_reason?: string;
  discount_status: "none" | "pending" | "approved" | "rejected";
  discount_notes?: string;
  discount_approved_by?: number;
  net_amount?: number;
  total_amount: number;
  amount_paid: number;
  balance: number;
  created_at: string;
  updated_at: string;

  student?: StudentUser | null;
  feeType?: { id: number; name: string; amount: number } | null;
  section?: { id: number; name: string } | null;
  session?: { id: number; name: string } | null;
  term?: { id: number; name: string } | null;
  discountApprover?: { id: number; firstname: string; surname: string } | null;
}

interface ConcessionsApiResponse {
  data: ConcessionFeeItem[];
  current_page: number;
  last_page: number;
  total: number;
  pending_count: number;
}

function formatNaira(amount: number | undefined | null) {
  return "₦" + Number(amount || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatReason(reason?: string) {
  if (!reason) return "Custom Relief";
  const map: Record<string, string> = {
    staff_child: "Staff Child Concession",
    sibling: "Sibling Discount",
    scholarship: "Merit / Academic Scholarship",
    hardship: "Hardship Relief",
    custom: "Board Discretionary Relief",
  };
  return map[reason] || reason;
}

export default function ConcessionApprovalsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [records, setRecords] = useState<ConcessionFeeItem[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  // Reject Modal State
  const [rejectItem, setRejectItem] = useState<ConcessionFeeItem | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const { showSuccess, showError } = useToast();

  const fetchConcessions = async (status: string, p = 1) => {
    setLoading(true);
    try {
      const res = await authApi.get<ConcessionsApiResponse>("/fees/concessions/pending", {
        params: { status, page: p, per_page: 20 },
      });
      setRecords(res.data.data || []);
      setPendingCount(res.data.pending_count ?? 0);
      setTotalPages(res.data.last_page || 1);
      setPage(res.data.current_page || 1);
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to load concessions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConcessions(activeTab, 1);
  }, [activeTab]);

  const handleApprove = async (item: ConcessionFeeItem) => {
    if (!window.confirm(`Approve concession of ${formatNaira(item.discount_amount)} for ${item.student?.firstname} ${item.student?.surname}?`)) {
      return;
    }

    setActionLoadingId(item.id);
    try {
      const res = await authApi.post(`/fees/concessions/${item.id}/approve`);
      showSuccess(res.data.message || "Concession approved successfully.");
      fetchConcessions(activeTab, page);
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to approve concession.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectItem) return;
    setIsRejecting(true);
    try {
      const res = await authApi.post(`/fees/concessions/${rejectItem.id}/reject`, {
        notes: rejectNotes || "Declined by School Administration.",
      });
      showSuccess(res.data.message || "Concession request rejected.");
      setRejectItem(null);
      setRejectNotes("");
      fetchConcessions(activeTab, page);
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to reject concession.");
    } finally {
      setIsRejecting(false);
    }
  };

  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const q = searchTerm.toLowerCase();
    return records.filter((r) => {
      const name = `${r.student?.firstname || ""} ${r.student?.surname || ""}`.toLowerCase();
      const reg = (r.student?.reg_no || "").toLowerCase();
      const fee = (r.feeType?.name || "").toLowerCase();
      const reason = (r.discount_reason || "").toLowerCase();
      return name.includes(q) || reg.includes(q) || fee.includes(q) || reason.includes(q);
    });
  }, [records, searchTerm]);

  return (
    <>
      <style>{`
        :root {
          --sp-navy: #0f2744;
          --sp-gold: #d97706;
          --sp-border: #e2e8f0;
          --sp-light: #f8fafc;
        }

        .sp-page-main {
          background: #f8fafc;
          min-height: 100vh;
          padding-top: calc(var(--gq-topnav-height, 66px) + 24px) !important;
          padding-bottom: 54px !important;
        }
        @media (min-width: 768px) {
          .sp-page-main {
            padding-left: 28px !important;
            padding-right: 28px !important;
            width: calc(100% - var(--gq-sidebar-width, 280px)) !important;
            max-width: calc(100% - var(--gq-sidebar-width, 280px)) !important;
            margin-left: auto !important;
          }
          .gq-sidebar-collapsed .sp-page-main {
            width: calc(100% - var(--gq-sidebar-collapsed-width, 86px)) !important;
            max-width: calc(100% - var(--gq-sidebar-collapsed-width, 86px)) !important;
          }
        }
        @media (max-width: 767.98px) {
          .sp-page-main {
            width: 100% !important;
            max-width: 100% !important;
            padding-top: calc(var(--gq-topnav-height, 66px) + 16px) !important;
            padding-left: 14px !important;
            padding-right: 14px !important;
          }
        }

        .sp-hero {
          background: linear-gradient(135deg, #0f2744 0%, #1e3a5f 60%, #172554 100%);
          border-radius: 16px;
          padding: 28px 32px;
          position: relative;
          overflow: hidden;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
        }
        .sp-hero-glow {
          position: absolute;
          top: -60px; right: -60px;
          width: 320px; height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.18) 0%, transparent 65%);
          pointer-events: none;
        }
        .sp-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #fbbf24;
          background: rgba(217, 119, 6, 0.2);
          border: 1px solid rgba(217, 119, 6, 0.35);
          border-radius: 999px;
          padding: 4px 12px;
          margin-bottom: 12px;
        }

        .sp-card {
          background: #ffffff;
          border: 1px solid var(--sp-border);
          border-radius: 14px;
          box-shadow: 0 4px 16px rgba(15, 39, 68, 0.04);
          overflow: hidden;
          margin-bottom: 24px;
        }
        .sp-card-head {
          padding: 18px 24px;
          border-bottom: 1px solid var(--sp-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .sp-tabs {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid #e2e8f0;
          padding: 0 24px;
          background: #f8fafc;
        }
        .sp-tab-btn {
          padding: 14px 18px;
          font-size: 13.5px;
          font-weight: 600;
          color: #64748b;
          border: none;
          background: transparent;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.18s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .sp-tab-btn:hover { color: #0f2744; }
        .sp-tab-btn.active {
          color: #0f2744;
          border-bottom-color: #d97706;
          font-weight: 700;
        }

        .sp-table {
          width: 100%;
          border-collapse: collapse;
        }
        .sp-table th {
          background: #f8fafc;
          padding: 12px 18px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #64748b;
          border-bottom: 1px solid var(--sp-border);
          text-align: left;
        }
        .sp-table td {
          padding: 14px 18px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 13px;
          color: #1e293b;
          vertical-align: middle;
        }
        .sp-table tr:hover td {
          background: #fafafa;
        }

        .sp-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }
        .sp-status--pending {
          background: #fef3c7;
          color: #b45309;
          border: 1px solid rgba(217, 119, 6, 0.3);
        }
        .sp-status--approved {
          background: #dcfce7;
          color: #15803d;
          border: 1px solid rgba(22, 163, 74, 0.3);
        }
        .sp-status--rejected {
          background: #fee2e2;
          color: #b91c1c;
          border: 1px solid rgba(220, 38, 38, 0.3);
        }

        .sp-btn-approve {
          background: #10b981;
          color: #fff;
          border: none;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.18s;
        }
        .sp-btn-approve:hover { background: #059669; }
        .sp-btn-reject {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid rgba(220, 38, 38, 0.2);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s;
        }
        .sp-btn-reject:hover { background: #fecaca; }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Concession & Scholarship Approvals — SchoolProfit" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto gq-app-main db-main sp-page-main d-flex flex-column min-vh-100">
            {loading && <Loader message="Loading concession records…" />}

            {/* HERO */}
            <div className="sp-hero">
              <div className="sp-hero-glow" aria-hidden="true" />
              <div className="sp-badge-pill">
                🔒 Proprietor / School Owner Authorization Desk
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
                School Fee Concession & Scholarship Approvals
              </h1>
              <p style={{ fontSize: 13.5, color: "#cbd5e1", maxWidth: 680, lineHeight: 1.6, marginBottom: 0 }}>
                Review and approve all tuition waivers, staff-child discounts, sibling reductions, and merit scholarships requested by bursars before they are deducted from legal student fee obligations.
              </p>
            </div>

            {/* MAIN CARD */}
            <div className="sp-card">
              {/* TABS */}
              <div className="sp-tabs">
                <button
                  type="button"
                  className={`sp-tab-btn ${activeTab === "pending" ? "active" : ""}`}
                  onClick={() => setActiveTab("pending")}
                >
                  ⏳ Pending Signoff
                  {pendingCount > 0 && (
                    <span
                      style={{
                        background: "#d97706",
                        color: "#fff",
                        fontSize: 11,
                        padding: "2px 7px",
                        borderRadius: 100,
                        fontWeight: 700,
                      }}
                    >
                      {pendingCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className={`sp-tab-btn ${activeTab === "approved" ? "active" : ""}`}
                  onClick={() => setActiveTab("approved")}
                >
                  ✅ Approved Concessions
                </button>
                <button
                  type="button"
                  className={`sp-tab-btn ${activeTab === "rejected" ? "active" : ""}`}
                  onClick={() => setActiveTab("rejected")}
                >
                  ❌ Rejected Requests
                </button>
                <button
                  type="button"
                  className={`sp-tab-btn ${activeTab === "all" ? "active" : ""}`}
                  onClick={() => setActiveTab("all")}
                >
                  📑 All Concession History
                </button>
              </div>

              {/* SEARCH & FILTERS BAR */}
              <div className="sp-card-head">
                <div style={{ flex: 1, maxWidth: 360 }}>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Search student, reg no, or reason…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ borderRadius: 8, fontSize: 13 }}
                  />
                </div>

                <div style={{ fontSize: 12.5, color: "#64748b" }}>
                  Showing <strong>{filteredRecords.length}</strong> record(s)
                </div>
              </div>

              {/* TABLE */}
              <div className="table-responsive">
                <table className="sp-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Section</th>
                      <th>Fee Item</th>
                      <th>Standard Gross</th>
                      <th>Concession Requested</th>
                      <th>Net Payable</th>
                      <th>Reason & Justification</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: "center", padding: "48px 16px", color: "#94a3b8" }}>
                          No concession records found in this view.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((item) => {
                        const gross = Number(item.gross_amount ?? item.total_amount ?? 0);
                        const discount = Number(item.discount_amount ?? 0);
                        const net = Number(item.net_amount ?? (gross - discount));

                        return (
                          <tr key={item.id}>
                            <td>
                              <div style={{ fontWeight: 700, color: "#0f2744" }}>
                                {item.student?.firstname} {item.student?.surname}
                              </div>
                              <div style={{ fontSize: 11, color: "#64748b" }}>
                                {item.student?.reg_no || "No Reg No"}
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                                {item.section?.name || "General"}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: "#1e293b" }}>
                                {item.feeType?.name || "Tuition Fee"}
                              </div>
                              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                                {item.term?.name} • {item.session?.name}
                              </div>
                            </td>
                            <td>
                              <strong style={{ color: "#0f2744" }}>{formatNaira(gross)}</strong>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: "#d97706" }}>
                                - {formatNaira(discount)}
                              </div>
                              <div style={{ fontSize: 11, color: "#64748b" }}>
                                {item.discount_type === "percentage" ? `${item.discount_rate}% deduction` : "Fixed deduction"}
                              </div>
                            </td>
                            <td>
                              <strong style={{ color: "#15803d" }}>{formatNaira(net)}</strong>
                            </td>
                            <td style={{ maxWidth: 220 }}>
                              <div style={{ fontWeight: 600, color: "#0f2744", fontSize: 12 }}>
                                {formatReason(item.discount_reason)}
                              </div>
                              {item.discount_notes && (
                                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                                  "{item.discount_notes}"
                                </div>
                              )}
                              {item.discountApprover && (
                                <div style={{ fontSize: 10.5, color: "#16a34a", marginTop: 4 }}>
                                  Signed off by: {item.discountApprover.firstname} {item.discountApprover.surname}
                                </div>
                              )}
                            </td>
                            <td>
                              {item.discount_status === "pending" && (
                                <span className="sp-status-badge sp-status--pending">
                                  ⏳ Awaiting Owner
                                </span>
                              )}
                              {item.discount_status === "approved" && (
                                <span className="sp-status-badge sp-status--approved">
                                  ✅ Approved
                                </span>
                              )}
                              {item.discount_status === "rejected" && (
                                <span className="sp-status-badge sp-status--rejected">
                                  ❌ Declined
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {item.discount_status === "pending" ? (
                                <div className="d-flex align-items-center justify-content-end gap-2">
                                  <button
                                    type="button"
                                    className="sp-btn-approve"
                                    disabled={actionLoadingId === item.id}
                                    onClick={() => handleApprove(item)}
                                  >
                                    {actionLoadingId === item.id ? "…" : "✓ Approve"}
                                  </button>
                                  <button
                                    type="button"
                                    className="sp-btn-reject"
                                    disabled={actionLoadingId === item.id}
                                    onClick={() => {
                                      setRejectItem(item);
                                      setRejectNotes("");
                                    }}
                                  >
                                    ✕ Reject
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: 11.5, color: "#94a3b8" }}>Processed</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="p-3 d-flex justify-content-between align-items-center border-top">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={page <= 1}
                    onClick={() => fetchConcessions(activeTab, page - 1)}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={page >= totalPages}
                    onClick={() => fetchConcessions(activeTab, page + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {/* REJECTION MODAL */}
            {rejectItem && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(15, 23, 42, 0.65)",
                  backdropFilter: "blur(4px)",
                  zIndex: 1090,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 16,
                }}
              >
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: 14,
                    width: "100%",
                    maxWidth: 480,
                    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      background: "#fee2e2",
                      padding: "16px 20px",
                      borderBottom: "1px solid #fecaca",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <h6 style={{ margin: 0, fontWeight: 700, color: "#991b1b" }}>
                      Decline Concession Request
                    </h6>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setRejectItem(null)}
                    />
                  </div>

                  <div style={{ padding: 20 }}>
                    <p style={{ fontSize: 13, color: "#475569", marginBottom: 16 }}>
                      You are declining the concession of{" "}
                      <strong>{formatNaira(rejectItem.discount_amount)}</strong> for{" "}
                      <strong>
                        {rejectItem.student?.firstname} {rejectItem.student?.surname}
                      </strong>
                      . The student's fee balance will be restored to the full gross amount.
                    </p>

                    <label style={{ fontSize: 12, fontWeight: 700, color: "#0f2744", marginBottom: 6, display: "block" }}>
                      Reason for Rejection (Optional Note)
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="e.g. Sibling discount quota exceeded for this session…"
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      style={{ fontSize: 13 }}
                    />
                  </div>

                  <div
                    style={{
                      padding: "12px 20px",
                      background: "#f8fafc",
                      borderTop: "1px solid #e2e8f0",
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setRejectItem(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger fw-bold"
                      disabled={isRejecting}
                      onClick={handleConfirmReject}
                    >
                      {isRejecting ? "Declining…" : "Confirm Rejection"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-auto pt-4">
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
