import React, { useEffect, useState } from "react";
import { authApi } from "../../utils/axios";
import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";

interface Investor {
  id: number;
  name: string;
  email: string;
  phone: string;
  tier: string;
  capital_invested: number;
  equity_percentage: number;
  recoup_percentage: number;
  tenure_years: number;
  total_principal_repaid: number;
  total_dividends_paid: number;
  remaining_principal: number;
  recoup_progress_percentage: number;
  current_phase: "recoup_phase" | "dividend_phase" | "completed";
  investment_date: string;
  status: string;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  contract_ref?: string;
  disbursements?: any[];
}

interface PortfolioMetrics {
  total_capital_raised: number;
  total_principal_repaid: number;
  total_dividends_paid: number;
  total_investors_count: number;
  active_investors_count: number;
  recoup_phase_count: number;
  dividend_phase_count: number;
  tier_distribution: {
    bronze: number;
    silver: number;
    gold: number;
    custom: number;
  };
}

export default function SuperAdminInvestorsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [targetInvestor, setTargetInvestor] = useState<Investor | null>(null);

  // Form states
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    phone: "",
    tier: "silver",
    capital_invested: 1000000,
    equity_percentage: 7.0,
    recoup_percentage: 25.0,
    tenure_years: 5,
    investment_date: new Date().toISOString().split("T")[0],
    bank_name: "",
    account_number: "",
    account_name: "",
    notes: "",
    create_user_account: true,
    user_password: "Invest@2026",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    tier: "silver",
    capital_invested: 1000000,
    equity_percentage: 7.0,
    recoup_percentage: 25.0,
    tenure_years: 5,
    investment_date: "",
    status: "active",
    current_phase: "recoup_phase",
    bank_name: "",
    account_number: "",
    account_name: "",
    contract_ref: "",
    notes: "",
  });

  const [disburseForm, setDisburseForm] = useState({
    type: "principal_recoup",
    amount: 0,
    academic_session: "2026/2027",
    term: "First Term",
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "Direct NIP Bank Transfer",
    bank_reference: "",
    notes: "",
  });

  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "danger"; text: string } | null>(null);

  const fetchInvestors = async () => {
    try {
      setLoading(true);
      const res = await authApi.get("/super-admin/investors");
      if (res.data?.status) {
        setInvestors(res.data.investors || []);
        setMetrics(res.data.metrics || null);
      }
    } catch (err: any) {
      console.error("Failed to load investors", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestors();
  }, []);

  useEffect(() => {
    if (showAddModal || showDisburseModal || showEditModal || showViewModal || showDeleteModal || selectedReceipt) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showAddModal, showDisburseModal, showEditModal, showViewModal, showDeleteModal, selectedReceipt]);

  const handleTierChange = (tier: string) => {
    let cap = 1000000;
    let eq = 7.0;
    if (tier === "bronze") {
      cap = 500000;
      eq = 5.0;
    } else if (tier === "silver") {
      cap = 1000000;
      eq = 7.0;
    } else if (tier === "gold") {
      cap = 3000000;
      eq = 10.0;
    }
    setAddForm((prev) => ({
      ...prev,
      tier,
      capital_invested: cap,
      equity_percentage: eq,
    }));
  };

  const handleEditTierChange = (tier: string) => {
    let cap = editForm.capital_invested;
    let eq = editForm.equity_percentage;
    if (tier === "bronze") {
      cap = 500000;
      eq = 5.0;
    } else if (tier === "silver") {
      cap = 1000000;
      eq = 7.0;
    } else if (tier === "gold") {
      cap = 3000000;
      eq = 10.0;
    }
    setEditForm((prev) => ({
      ...prev,
      tier,
      capital_invested: cap,
      equity_percentage: eq,
    }));
  };

  const handleAddInvestor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await authApi.post("/super-admin/investors", addForm);
      if (res.data?.status) {
        setActionMessage({ type: "success", text: "Strategic investor onboarded successfully with portal access!" });
        setShowAddModal(false);
        fetchInvestors();
      }
    } catch (err: any) {
      setActionMessage({
        type: "danger",
        text: err.response?.data?.message || "Failed to onboard investor.",
      });
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (inv: Investor) => {
    setTargetInvestor(inv);
    setEditForm({
      name: inv.name || "",
      email: inv.email || "",
      phone: inv.phone || "",
      tier: inv.tier || "silver",
      capital_invested: inv.capital_invested || 1000000,
      equity_percentage: inv.equity_percentage || 7.0,
      recoup_percentage: inv.recoup_percentage || 25.0,
      tenure_years: inv.tenure_years || 5,
      investment_date: inv.investment_date || "",
      status: inv.status || "active",
      current_phase: inv.current_phase || "recoup_phase",
      bank_name: inv.bank_name || "",
      account_number: inv.account_number || "",
      account_name: inv.account_name || "",
      contract_ref: inv.contract_ref || "ST/SP-INV/2026/01",
      notes: (inv as any).notes || "",
    });
    setShowEditModal(true);
  };

  const handleUpdateInvestor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetInvestor) return;
    try {
      setSaving(true);
      const res = await authApi.put(`/super-admin/investors/${targetInvestor.id}`, editForm);
      if (res.data?.status) {
        setActionMessage({
          type: "success",
          text: `Investor "${editForm.name}" updated successfully!`,
        });
        setShowEditModal(false);
        fetchInvestors();
      }
    } catch (err: any) {
      setActionMessage({
        type: "danger",
        text: err.response?.data?.message || "Failed to update investor details.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (inv: Investor) => {
    const nextStatus = inv.status === "active" ? "paused" : "active";
    try {
      setLoading(true);
      const res = await authApi.put(`/super-admin/investors/${inv.id}`, { status: nextStatus });
      if (res.data?.status) {
        setActionMessage({
          type: "success",
          text: `Investor "${inv.name}" status updated to ${nextStatus.toUpperCase()}!`,
        });
        fetchInvestors();
      }
    } catch (err: any) {
      setActionMessage({
        type: "danger",
        text: err.response?.data?.message || "Failed to update status.",
      });
    } finally {
      setLoading(false);
    }
  };

  const openViewModal = (inv: Investor) => {
    setTargetInvestor(inv);
    setShowViewModal(true);
  };

  const handleDeleteInvestor = async () => {
    if (!targetInvestor) return;
    try {
      setSaving(true);
      const url = forceDelete ? `/super-admin/investors/${targetInvestor.id}?force=1` : `/super-admin/investors/${targetInvestor.id}`;
      const res = await authApi.delete(url);
      if (res.data?.status) {
        setActionMessage({
          type: "success",
          text: `Investor "${targetInvestor.name}" deleted successfully.`,
        });
        setShowDeleteModal(false);
        setForceDelete(false);
        fetchInvestors();
      }
    } catch (err: any) {
      setActionMessage({
        type: "danger",
        text: err.response?.data?.message || "Failed to delete investor.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRecordDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetInvestor) return;
    try {
      setSaving(true);
      const res = await authApi.post(`/super-admin/investors/${targetInvestor.id}/disbursements`, disburseForm);
      if (res.data?.status) {
        setActionMessage({
          type: "success",
          text: `Disbursement of ₦${Number(disburseForm.amount).toLocaleString()} successfully recorded for ${targetInvestor.name}!`,
        });
        setShowDisburseModal(false);
        fetchInvestors();
      }
    } catch (err: any) {
      setActionMessage({
        type: "danger",
        text: err.response?.data?.message || "Failed to record disbursement.",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatNaira = (val?: number) => {
    return "₦" + Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const filteredInvestors = investors.filter((inv) => {
    const s = searchTerm.toLowerCase();
    const matchSearch =
      inv.name.toLowerCase().includes(s) ||
      inv.email.toLowerCase().includes(s) ||
      (inv.phone && inv.phone.includes(s)) ||
      inv.tier.toLowerCase().includes(s);
    const matchTier = tierFilter === "all" || inv.tier.toLowerCase() === tierFilter.toLowerCase();
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchSearch && matchTier && matchStatus;
  });

  return (
    <>
      <style>{`
        .sp-filter-card {
          border-radius: 12px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          padding: 16px;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .sp-filter-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 14px rgba(15, 39, 68, 0.08);
        }
        .sp-filter-card.active {
          border-color: #1D4ED8;
          background: #EFF6FF;
        }

        /* ── RESPONSIVE MODAL SYSTEM (PINNED FOOTER BUTTONS) ── */
        .investor-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(4px);
          z-index: 1060;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          overflow-y: auto;
        }
        .investor-modal-card {
          background: #ffffff;
          border-radius: 18px;
          width: 100%;
          max-width: 620px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
          overflow: hidden;
          margin: auto;
          position: relative;
        }
        .investor-modal-lg {
          max-width: 820px;
        }
        .investor-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .investor-modal-form {
          display: flex;
          flex-direction: column;
          flex: 1 1 auto;
          min-height: 0;
          overflow: hidden;
          margin: 0;
        }
        .investor-modal-body {
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .investor-modal-footer {
          flex-shrink: 0;
          position: sticky;
          bottom: 0;
          z-index: 10;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Strategic Investors & Capital" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main p-3 p-md-4 d-flex flex-column min-vh-100">
            {loading && <Loader message="Loading investor portfolio..." />}

            {/* HERO HEADER */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
              <div>
                <div className="d-flex align-items-center gap-2">
                  <h4 className="fw-bold mb-0 text-dark" style={{ letterSpacing: "-0.02em" }}>
                    Strategic Investors &amp; Capital Portfolio
                  </h4>
                  <span className="badge bg-primary text-white" style={{ fontSize: "11px", fontWeight: 700 }}>
                    SchoolProfit™
                  </span>
                </div>
                <p className="text-muted small mb-0">
                  Powered by <strong>SamaritanTech</strong> &bull; Seed growth capital recoup tracking, 25% termly amortization, and 5-year equity dividend governance.
                </p>
              </div>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
                  style={{ borderRadius: 10, fontWeight: 600 }}
                  onClick={fetchInvestors}
                  disabled={loading}
                >
                  <i className="bi bi-arrow-clockwise" /> Refresh
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary d-flex align-items-center gap-2"
                  style={{ borderRadius: 10, fontWeight: 600, background: "#0F2744", borderColor: "#0F2744" }}
                  onClick={() => setShowAddModal(true)}
                >
                  <i className="bi bi-plus-circle-fill" /> Onboard New Investor
                </button>
              </div>
            </div>

            {actionMessage && (
              <div className={`alert alert-${actionMessage.type} alert-dismissible fade show`} role="alert">
                {actionMessage.text}
                <button type="button" className="btn-close" onClick={() => setActionMessage(null)}></button>
              </div>
            )}

            {/* QUICK STATS CARDS */}
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-3">
                <div
                  className={`sp-filter-card ${tierFilter === "all" ? "active" : ""}`}
                  onClick={() => setTierFilter("all")}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted small fw-bold">Total Capital Raised</span>
                    <i className="bi bi-wallet2 text-primary fs-5" />
                  </div>
                  <h4 className="fw-bold text-dark mt-2 mb-0">{formatNaira(metrics?.total_capital_raised)}</h4>
                  <small className="text-muted" style={{ fontSize: 11 }}>
                    {metrics?.total_investors_count || 0} Registered Partners
                  </small>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="sp-filter-card">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-success small fw-bold">Principal Repaid</span>
                    <i className="bi bi-shield-check text-success fs-5" />
                  </div>
                  <h4 className="fw-bold text-success mt-2 mb-0">{formatNaira(metrics?.total_principal_repaid)}</h4>
                  <small className="text-muted" style={{ fontSize: 11 }}>25% Termly Software Collections</small>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="sp-filter-card">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-primary small fw-bold">5-Year Dividends Paid</span>
                    <i className="bi bi-award text-warning fs-5" />
                  </div>
                  <h4 className="fw-bold text-primary mt-2 mb-0">{formatNaira(metrics?.total_dividends_paid)}</h4>
                  <small className="text-muted" style={{ fontSize: 11 }}>{metrics?.dividend_phase_count || 0} in Phase 2 Dividend</small>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="sp-filter-card">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-info small fw-bold">Recoup Phase Active</span>
                    <i className="bi bi-clock-history text-info fs-5" />
                  </div>
                  <h4 className="fw-bold text-info mt-2 mb-0">{metrics?.recoup_phase_count || 0} Partners</h4>
                  <small className="text-muted" style={{ fontSize: 11 }}>Receiving 25% Term Payback</small>
                </div>
              </div>
            </div>

            {/* FILTER & SEARCH BAR */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 14 }}>
              <div className="card-body p-3">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                  <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: 450 }}>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text bg-light border-end-0" style={{ borderRadius: "10px 0 0 10px" }}>
                        <i className="bi bi-search text-muted" />
                      </span>
                      <input
                        type="text"
                        className="form-control form-control-sm bg-light border-start-0"
                        style={{ borderRadius: "0 10px 10px 0" }}
                        placeholder="Search partner by name, email, phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center gap-2">
                      <label className="form-label small text-muted fw-bold mb-0">Status:</label>
                      <select
                        className="form-select form-select-sm"
                        style={{ borderRadius: 10, minWidth: 120 }}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <label className="form-label small text-muted fw-bold mb-0">Tier:</label>
                      <select
                        className="form-select form-select-sm"
                        style={{ borderRadius: 10, minWidth: 130 }}
                        value={tierFilter}
                        onChange={(e) => setTierFilter(e.target.value)}
                      >
                        <option value="all">All Tiers</option>
                        <option value="bronze">Bronze (5%)</option>
                        <option value="silver">Silver (7%)</option>
                        <option value="gold">Gold (10%)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* INVESTORS TABLE */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 14, overflow: "hidden" }}>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4">Partner Name &amp; Contact</th>
                      <th>Investment Package</th>
                      <th>Equity &amp; Terms</th>
                      <th>Recoup Progress</th>
                      <th>Status &amp; Phase</th>
                      <th>Settlement Bank</th>
                      <th className="text-end pe-4" style={{ minWidth: 200 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvestors.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-5 text-muted">
                          <i className="bi bi-people display-6 d-block mb-2 text-secondary opacity-50" />
                          No investors found matching your search and filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredInvestors.map((inv) => (
                        <tr key={inv.id}>
                          <td className="ps-4">
                            <div className="fw-bold text-dark">{inv.name}</div>
                            <div className="text-muted small">{inv.email}</div>
                            {inv.phone && <div className="text-muted small" style={{ fontSize: "0.75rem" }}>{inv.phone}</div>}
                          </td>
                          <td>
                            <span className="badge bg-primary-subtle text-primary border border-primary text-uppercase fw-bold">
                              {inv.tier} Tier
                            </span>
                            <div className="fw-bold text-dark mt-1">{formatNaira(inv.capital_invested)}</div>
                          </td>
                          <td>
                            <div className="fw-bold text-success">{inv.equity_percentage}% Profit Share</div>
                            <div className="text-muted small" style={{ fontSize: "0.75rem" }}>
                              {inv.recoup_percentage}% term recoup &bull; {inv.tenure_years} yrs
                            </div>
                          </td>
                          <td style={{ minWidth: 160 }}>
                            <div className="d-flex justify-content-between small mb-1">
                              <span>{formatNaira(inv.total_principal_repaid)}</span>
                              <span className="fw-bold">{inv.recoup_progress_percentage}%</span>
                            </div>
                            <div className="progress" style={{ height: 8, borderRadius: 4 }}>
                              <div
                                className="progress-bar bg-success"
                                style={{ width: `${inv.recoup_progress_percentage}%` }}
                              ></div>
                            </div>
                            <div className="text-muted small mt-1" style={{ fontSize: "0.72rem" }}>
                              Rem: <strong className="text-danger">{formatNaira(inv.remaining_principal)}</strong>
                            </div>
                          </td>
                          <td>
                            <div>
                              {inv.status === "active" ? (
                                <span className="badge bg-success-subtle text-success border border-success fw-bold d-inline-flex align-items-center gap-1">
                                  <span className="spinner-grow spinner-grow-sm text-success" style={{ width: 6, height: 6 }} />
                                  Active
                                </span>
                              ) : inv.status === "paused" ? (
                                <span className="badge bg-warning-subtle text-warning border border-warning fw-bold d-inline-flex align-items-center gap-1">
                                  <i className="bi bi-pause-circle-fill text-warning" />
                                  Paused
                                </span>
                              ) : (
                                <span className="badge bg-secondary-subtle text-secondary border border-secondary fw-bold">
                                  Completed
                                </span>
                              )}
                            </div>
                            <div className="mt-1">
                              {inv.current_phase === "dividend_phase" ? (
                                <span className="badge bg-success text-white" style={{ fontSize: "0.72rem" }}>Phase 2: Dividend</span>
                              ) : (
                                <span className="badge bg-info text-white" style={{ fontSize: "0.72rem" }}>Phase 1: Recoup</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="small text-dark fw-semibold">{inv.bank_name || "Not set"}</div>
                            <div className="text-muted small" style={{ fontSize: "0.75rem" }}>
                              {inv.account_number || "No account logged"}
                            </div>
                          </td>
                          <td className="text-end pe-4">
                            <div className="d-inline-flex align-items-center gap-1 justify-content-end">
                              {/* Log Payout */}
                              <button
                                onClick={() => {
                                  setTargetInvestor(inv);
                                  setDisburseForm((prev) => ({
                                    ...prev,
                                    type: inv.current_phase === "dividend_phase" ? "dividend_payout" : "principal_recoup",
                                    amount: Math.min(250000, inv.remaining_principal || 250000),
                                  }));
                                  setShowDisburseModal(true);
                                }}
                                className="btn btn-sm btn-success d-inline-flex align-items-center gap-1"
                                style={{ borderRadius: 8, fontWeight: 600, fontSize: "0.78rem", padding: "4px 8px" }}
                                title="Record Remittance / Payout"
                              >
                                <i className="bi bi-cash-stack" /> Payout
                              </button>

                              {/* View Dossier */}
                              <button
                                onClick={() => openViewModal(inv)}
                                className="btn btn-sm btn-outline-primary d-inline-flex align-items-center"
                                style={{ borderRadius: 8, padding: "4px 8px" }}
                                title="View Investor Dossier"
                              >
                                <i className="bi bi-eye" />
                              </button>

                              {/* Edit Profile */}
                              <button
                                onClick={() => openEditModal(inv)}
                                className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center"
                                style={{ borderRadius: 8, padding: "4px 8px" }}
                                title="Edit Investor Details"
                              >
                                <i className="bi bi-pencil" />
                              </button>

                              {/* Toggle Status (Activate / Pause) */}
                              <button
                                onClick={() => handleToggleStatus(inv)}
                                className={`btn btn-sm ${inv.status === "active" ? "btn-outline-warning" : "btn-outline-success"} d-inline-flex align-items-center`}
                                style={{ borderRadius: 8, padding: "4px 8px" }}
                                title={inv.status === "active" ? "Pause Investor" : "Activate Investor"}
                              >
                                <i className={`bi ${inv.status === "active" ? "bi-pause-circle" : "bi-play-circle"}`} />
                              </button>

                              {/* Delete Investor */}
                              <button
                                onClick={() => {
                                  setTargetInvestor(inv);
                                  setForceDelete(false);
                                  setShowDeleteModal(true);
                                }}
                                className="btn btn-sm btn-outline-danger d-inline-flex align-items-center"
                                style={{ borderRadius: 8, padding: "4px 8px" }}
                                title="Delete Investor"
                              >
                                <i className="bi bi-trash3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <Footer />
          </main>
        </div>
      </div>

      {/* ── ONBOARD NEW INVESTOR MODAL ── */}
      {showAddModal && (
        <div
          className="investor-modal-overlay"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="investor-modal-card investor-modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="investor-modal-header py-3 px-4 text-white"
              style={{ background: "#0F2744" }}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-person-plus-fill text-warning fs-5" />
                <h5 className="modal-title fw-bold text-white mb-0">Onboard New Strategic Partner</h5>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShowAddModal(false)}
              ></button>
            </div>

            <form onSubmit={handleAddInvestor} className="investor-modal-form">
              <div className="investor-modal-body p-4 bg-white">
                <div className="alert alert-info py-2 small mb-3" style={{ borderRadius: 10 }}>
                  <strong>Proposal Standard:</strong> Provisions investor terms under SchoolProfit™ Ref: <code>ST/SP-INV/2026/01</code>, calculates 25% termly recoup, and provisions portal credentials.
                </div>

                {/* Tier Selection */}
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted text-uppercase">Investment Package Tier</label>
                  <div className="row g-2">
                    <div className="col-4">
                      <div
                        className={`p-3 border rounded-3 text-center cursor-pointer ${
                          addForm.tier === "bronze" ? "border-primary bg-primary-subtle" : "bg-light"
                        }`}
                        onClick={() => handleTierChange("bronze")}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="fw-bold text-dark">Bronze</div>
                        <div className="text-muted small">₦500,000</div>
                        <div className="badge bg-secondary mt-1">5% Profit Share</div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div
                        className={`p-3 border rounded-3 text-center cursor-pointer ${
                          addForm.tier === "silver" ? "border-primary bg-primary-subtle" : "bg-light"
                        }`}
                        onClick={() => handleTierChange("silver")}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="fw-bold text-primary">Silver (Rec.)</div>
                        <div className="text-muted small">₦1,000,000</div>
                        <div className="badge bg-primary mt-1">7% Profit Share</div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div
                        className={`p-3 border rounded-3 text-center cursor-pointer ${
                          addForm.tier === "gold" ? "border-primary bg-primary-subtle" : "bg-light"
                        }`}
                        onClick={() => handleTierChange("gold")}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="fw-bold text-warning">Gold</div>
                        <div className="text-muted small">₦3,000,000</div>
                        <div className="badge bg-warning text-dark mt-1">10% Profit Share</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small">Full Legal Name</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      required
                      placeholder="e.g. Engr. Tunde Babalola"
                      value={addForm.name}
                      onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small">Email Address (Login ID)</label>
                    <input
                      type="email"
                      className="form-control form-control-sm"
                      required
                      placeholder="e.g. partner@example.com"
                      value={addForm.email}
                      onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small">Phone Number</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. 08012345678"
                      value={addForm.phone}
                      onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small">Investment Date</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={addForm.investment_date}
                      onChange={(e) => setAddForm({ ...addForm, investment_date: e.target.value })}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-bold small">Capital Invested (₦)</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={addForm.capital_invested}
                      onChange={(e) => setAddForm({ ...addForm, capital_invested: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold small">5-Year Equity %</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control form-control-sm"
                      value={addForm.equity_percentage}
                      onChange={(e) => setAddForm({ ...addForm, equity_percentage: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold small">Termly Recoup %</label>
                    <input
                      type="number"
                      step="1"
                      className="form-control form-control-sm"
                      value={addForm.recoup_percentage}
                      onChange={(e) => setAddForm({ ...addForm, recoup_percentage: Number(e.target.value) })}
                    />
                  </div>

                  <div className="col-12">
                    <hr className="my-2" />
                    <div className="fw-bold small text-muted text-uppercase mb-2">Settlement Bank Details</div>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label small">Bank Name</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. GTBank"
                      value={addForm.bank_name}
                      onChange={(e) => setAddForm({ ...addForm, bank_name: e.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Account Number</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="10 Digits"
                      value={addForm.account_number}
                      onChange={(e) => setAddForm({ ...addForm, account_number: e.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Account Name</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Beneficiary Name"
                      value={addForm.account_name}
                      onChange={(e) => setAddForm({ ...addForm, account_name: e.target.value })}
                    />
                  </div>

                  <div className="col-12">
                    <div className="form-check mt-2">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="createUserAccount"
                        checked={addForm.create_user_account}
                        onChange={(e) => setAddForm({ ...addForm, create_user_account: e.target.checked })}
                      />
                      <label className="form-check-label small" htmlFor="createUserAccount">
                        Create live portal user login account for this investor (Initial Password:{" "}
                        <code>{addForm.user_password}</code>)
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="investor-modal-footer bg-light py-3 px-4 border-top d-flex justify-content-between align-items-center">
                <button
                  type="button"
                  className="btn btn-outline-secondary px-3"
                  style={{ borderRadius: 8, fontWeight: 600 }}
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary px-4 shadow-sm"
                  style={{ borderRadius: 8, background: "#0F2744", borderColor: "#0F2744", fontWeight: 700 }}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle-fill me-1" />
                      Register &amp; Onboard Partner
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RECORD DISBURSEMENT MODAL ── */}
      {showDisburseModal && targetInvestor && (
        <div
          className="investor-modal-overlay"
          onClick={() => setShowDisburseModal(false)}
        >
          <div
            className="investor-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="investor-modal-header py-3 px-4 text-white"
              style={{ background: "#0F2744" }}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-cash-stack text-warning fs-5" />
                <h5 className="modal-title fw-bold text-white mb-0">Record Remittance / Disbursement</h5>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShowDisburseModal(false)}
              ></button>
            </div>

            <form onSubmit={handleRecordDisbursement} className="investor-modal-form">
              <div className="investor-modal-body p-4 bg-white">
                <div className="p-3 bg-light rounded-3 border mb-3">
                  <div className="fw-bold text-dark">{targetInvestor.name}</div>
                  <div className="small text-muted">
                    {targetInvestor.tier.toUpperCase()} TIER &bull; Capital: {formatNaira(targetInvestor.capital_invested)}
                  </div>
                  <div className="small text-success mt-1">
                    Already Recouped: {formatNaira(targetInvestor.total_principal_repaid)} (Remaining:{" "}
                    <strong>{formatNaira(targetInvestor.remaining_principal)}</strong>)
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold small">Disbursement Type</label>
                  <select
                    className="form-select form-select-sm"
                    value={disburseForm.type}
                    onChange={(e) => setDisburseForm({ ...disburseForm, type: e.target.value })}
                  >
                    <option value="principal_recoup">Principal Recoup (25% Termly Repayment)</option>
                    <option value="dividend_payout">5-Year Equity Dividend Payout</option>
                  </select>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small">Disbursed Amount (₦)</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      required
                      value={disburseForm.amount}
                      onChange={(e) => setDisburseForm({ ...disburseForm, amount: Number(e.target.value) })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold small">Payment Date</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      required
                      value={disburseForm.payment_date}
                      onChange={(e) => setDisburseForm({ ...disburseForm, payment_date: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small">Academic Session</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. 2026/2027"
                      value={disburseForm.academic_session}
                      onChange={(e) => setDisburseForm({ ...disburseForm, academic_session: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small">Academic Term</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. First Term"
                      value={disburseForm.term}
                      onChange={(e) => setDisburseForm({ ...disburseForm, term: e.target.value })}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label small">Bank Transfer Transaction Reference</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. NIP/GTB/20261020/00912"
                      value={disburseForm.bank_reference}
                      onChange={(e) => setDisburseForm({ ...disburseForm, bank_reference: e.target.value })}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label small">Internal Notes / Memo</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Optional remarks"
                      value={disburseForm.notes}
                      onChange={(e) => setDisburseForm({ ...disburseForm, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="investor-modal-footer bg-light py-3 px-4 border-top d-flex justify-content-between align-items-center">
                <button
                  type="button"
                  className="btn btn-outline-secondary px-3"
                  style={{ borderRadius: 8, fontWeight: 600 }}
                  onClick={() => setShowDisburseModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-success px-4 shadow-sm"
                  style={{ borderRadius: 8, fontWeight: 700 }}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-cash-stack me-1" />
                      Record &amp; Disburse Payment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT INVESTOR MODAL ── */}
      {showEditModal && targetInvestor && (
        <div
          className="investor-modal-overlay"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="investor-modal-card investor-modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="investor-modal-header py-3 px-4 text-white"
              style={{ background: "#0F2744" }}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-pencil-square text-warning fs-5" />
                <h5 className="modal-title fw-bold text-white mb-0">Edit Strategic Partner &bull; {targetInvestor.name}</h5>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShowEditModal(false)}
              ></button>
            </div>

            <form onSubmit={handleUpdateInvestor} className="investor-modal-form">
              <div className="investor-modal-body p-4 bg-white">
                {/* Status & Phase Controls */}
                <div className="row g-3 mb-3 p-3 bg-light rounded-3 border">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-dark">Account Status</label>
                    <select
                      className="form-select form-select-sm"
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    >
                      <option value="active">Active (Eligible for Term Payouts)</option>
                      <option value="paused">Paused (Payouts Held Temporarily)</option>
                      <option value="completed">Completed (Tenure &amp; Payback Fulfilled)</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-dark">Portfolio Phase</label>
                    <select
                      className="form-select form-select-sm"
                      value={editForm.current_phase}
                      onChange={(e) => setEditForm({ ...editForm, current_phase: e.target.value })}
                    >
                      <option value="recoup_phase">Phase 1: Capital Recoup (25% Termly Payback)</option>
                      <option value="dividend_phase">Phase 2: 5-Year Equity Profit Dividend</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                {/* Tier Selection */}
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted text-uppercase">Investment Package Tier</label>
                  <div className="row g-2">
                    <div className="col-4">
                      <div
                        className={`p-3 border rounded-3 text-center cursor-pointer ${
                          editForm.tier === "bronze" ? "border-primary bg-primary-subtle" : "bg-light"
                        }`}
                        onClick={() => handleEditTierChange("bronze")}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="fw-bold text-dark">Bronze</div>
                        <div className="text-muted small">₦500,000</div>
                        <div className="badge bg-secondary mt-1">5% Profit Share</div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div
                        className={`p-3 border rounded-3 text-center cursor-pointer ${
                          editForm.tier === "silver" ? "border-primary bg-primary-subtle" : "bg-light"
                        }`}
                        onClick={() => handleEditTierChange("silver")}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="fw-bold text-primary">Silver (Rec.)</div>
                        <div className="text-muted small">₦1,000,000</div>
                        <div className="badge bg-primary mt-1">7% Profit Share</div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div
                        className={`p-3 border rounded-3 text-center cursor-pointer ${
                          editForm.tier === "gold" ? "border-primary bg-primary-subtle" : "bg-light"
                        }`}
                        onClick={() => handleEditTierChange("gold")}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="fw-bold text-warning">Gold</div>
                        <div className="text-muted small">₦3,000,000</div>
                        <div className="badge bg-warning text-dark mt-1">10% Profit Share</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small">Full Legal Name</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small">Email Address (Login ID)</label>
                    <input
                      type="email"
                      className="form-control form-control-sm"
                      required
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small">Phone Number</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small">Investment Date</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={editForm.investment_date}
                      onChange={(e) => setEditForm({ ...editForm, investment_date: e.target.value })}
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label fw-bold small">Capital Invested (₦)</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={editForm.capital_invested}
                      onChange={(e) => setEditForm({ ...editForm, capital_invested: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-bold small">5-Year Equity %</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control form-control-sm"
                      value={editForm.equity_percentage}
                      onChange={(e) => setEditForm({ ...editForm, equity_percentage: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-bold small">Termly Recoup %</label>
                    <input
                      type="number"
                      step="1"
                      className="form-control form-control-sm"
                      value={editForm.recoup_percentage}
                      onChange={(e) => setEditForm({ ...editForm, recoup_percentage: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-bold small">Tenure (Years)</label>
                    <input
                      type="number"
                      step="1"
                      className="form-control form-control-sm"
                      value={editForm.tenure_years}
                      onChange={(e) => setEditForm({ ...editForm, tenure_years: Number(e.target.value) })}
                    />
                  </div>

                  <div className="col-12">
                    <hr className="my-2" />
                    <div className="fw-bold small text-muted text-uppercase mb-2">Settlement Bank Details</div>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label small">Bank Name</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={editForm.bank_name}
                      onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Account Number</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={editForm.account_number}
                      onChange={(e) => setEditForm({ ...editForm, account_number: e.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Account Name</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={editForm.account_name}
                      onChange={(e) => setEditForm({ ...editForm, account_name: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small">Contract Reference Number</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={editForm.contract_ref}
                      onChange={(e) => setEditForm({ ...editForm, contract_ref: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Internal Memo / Notes</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="investor-modal-footer bg-light py-3 px-4 border-top d-flex justify-content-between align-items-center">
                <button
                  type="button"
                  className="btn btn-outline-secondary px-3"
                  style={{ borderRadius: 8, fontWeight: 600 }}
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary px-4 shadow-sm"
                  style={{ borderRadius: 8, background: "#0F2744", borderColor: "#0F2744", fontWeight: 700 }}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle-fill me-1" />
                      Update Strategic Partner
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── VIEW INVESTOR DOSSIER MODAL ── */}
      {showViewModal && targetInvestor && (
        <div
          className="investor-modal-overlay"
          onClick={() => setShowViewModal(false)}
        >
          <div
            className="investor-modal-card investor-modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="investor-modal-header py-3 px-4 text-white"
              style={{ background: "#0F2744" }}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-folder2-open text-warning fs-5" />
                <h5 className="modal-title fw-bold text-white mb-0">Investor Dossier &bull; {targetInvestor.name}</h5>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShowViewModal(false)}
              ></button>
            </div>

            <div className="investor-modal-body p-4 bg-white">
              {/* Partner Overview Header */}
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 p-3 bg-light rounded-3 border mb-4">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span className="badge bg-primary text-uppercase fw-bold">{targetInvestor.tier} Tier</span>
                    {targetInvestor.status === "active" ? (
                      <span className="badge bg-success text-white">Active Partner</span>
                    ) : targetInvestor.status === "paused" ? (
                      <span className="badge bg-warning text-dark">Paused</span>
                    ) : (
                      <span className="badge bg-secondary text-white">Completed</span>
                    )}
                    {targetInvestor.current_phase === "dividend_phase" ? (
                      <span className="badge bg-success-subtle text-success border border-success">Phase 2: Dividend Active</span>
                    ) : (
                      <span className="badge bg-info-subtle text-info border border-info">Phase 1: Recoup Active</span>
                    )}
                  </div>
                  <h4 className="fw-bold text-dark mb-0">{targetInvestor.name}</h4>
                  <div className="small text-muted mt-1">
                    <i className="bi bi-envelope me-1" /> {targetInvestor.email} &bull;{" "}
                    <i className="bi bi-telephone me-1" /> {targetInvestor.phone || "No phone logged"}
                  </div>
                </div>
                <div className="text-md-end">
                  <div className="small text-muted">Contract Ref:</div>
                  <div className="fw-bold text-dark"><code>{targetInvestor.contract_ref || "ST/SP-INV/2026/01"}</code></div>
                  <div className="small text-muted mt-1">Date Joined: {targetInvestor.investment_date || "2026-10-20"}</div>
                </div>
              </div>

              {/* Financial Summary KPIs */}
              <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                  <div className="p-3 bg-light rounded-3 border text-center">
                    <div className="small text-muted fw-bold text-uppercase">Capital Invested</div>
                    <div className="h5 fw-bold text-dark mt-1 mb-0">{formatNaira(targetInvestor.capital_invested)}</div>
                    <small className="text-muted">{targetInvestor.equity_percentage}% Equity Share</small>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="p-3 bg-light rounded-3 border text-center">
                    <div className="small text-muted fw-bold text-uppercase">Principal Recouped</div>
                    <div className="h5 fw-bold text-success mt-1 mb-0">{formatNaira(targetInvestor.total_principal_repaid)}</div>
                    <small className="text-success fw-bold">{targetInvestor.recoup_progress_percentage}% Amortized</small>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="p-3 bg-light rounded-3 border text-center">
                    <div className="small text-muted fw-bold text-uppercase">Remaining Recoup</div>
                    <div className="h5 fw-bold text-danger mt-1 mb-0">{formatNaira(targetInvestor.remaining_principal)}</div>
                    <small className="text-muted">Zero Risk Target</small>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="p-3 bg-light rounded-3 border text-center">
                    <div className="small text-muted fw-bold text-uppercase">Dividends Paid</div>
                    <div className="h5 fw-bold text-primary mt-1 mb-0">{formatNaira(targetInvestor.total_dividends_paid)}</div>
                    <small className="text-muted">Phase 2 Earnings</small>
                  </div>
                </div>
              </div>

              {/* Settlement Banking Details */}
              <div className="p-3 bg-light rounded-3 border mb-4">
                <div className="fw-bold text-dark small text-uppercase mb-2">Designated Settlement Bank</div>
                <div className="row g-2 small">
                  <div className="col-md-4">
                    <strong>Bank Name:</strong> {targetInvestor.bank_name || "Guaranty Trust Bank"}
                  </div>
                  <div className="col-md-4">
                    <strong>Account Number:</strong> {targetInvestor.account_number || "0123456789"}
                  </div>
                  <div className="col-md-4">
                    <strong>Account Name:</strong> {targetInvestor.account_name || targetInvestor.name}
                  </div>
                </div>
              </div>

              {/* Remittance & Disbursement History Table */}
              <div className="border rounded-3 overflow-hidden mb-3">
                <div className="bg-light py-2 px-3 border-bottom d-flex justify-content-between align-items-center">
                  <span className="fw-bold small text-dark">Historical Disbursements &amp; Remittance Ledger</span>
                  <span className="badge bg-secondary">{targetInvestor.disbursements?.length || 0} Records</span>
                </div>
                {(!targetInvestor.disbursements || targetInvestor.disbursements.length === 0) ? (
                  <div className="p-4 text-center text-muted small">
                    No remittances logged for this investor yet. Click "Log Remittance Payout" to credit a payback.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover align-middle mb-0" style={{ fontSize: 12 }}>
                      <thead className="table-light">
                        <tr>
                          <th className="ps-3">Reference</th>
                          <th>Type</th>
                          <th>Academic Period</th>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Bank Ref</th>
                          <th className="text-end pe-3">Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {targetInvestor.disbursements.map((d: any) => (
                          <tr key={d.id}>
                            <td className="ps-3 fw-bold text-dark">{d.reference}</td>
                            <td>
                              <span className="badge bg-primary-subtle text-primary border border-primary">
                                {d.type === "principal_recoup" ? "Capital Recoup" : "5-Yr Dividend"}
                              </span>
                            </td>
                            <td>{d.academic_session} &bull; {d.term}</td>
                            <td className="text-muted">{d.payment_date}</td>
                            <td className="fw-bold text-success">{formatNaira(d.amount)}</td>
                            <td className="text-muted">{d.bank_reference || "N/A"}</td>
                            <td className="text-end pe-3">
                              <button
                                onClick={() => setSelectedReceipt(d)}
                                className="btn btn-xs btn-outline-primary d-inline-flex align-items-center gap-1"
                                style={{ fontSize: 11, padding: "2px 6px", borderRadius: 6 }}
                              >
                                <i className="bi bi-receipt" /> Slip
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

            <div className="investor-modal-footer bg-light py-3 px-4 border-top d-flex justify-content-between align-items-center">
              <button
                type="button"
                className="btn btn-outline-secondary px-3"
                style={{ borderRadius: 8, fontWeight: 600 }}
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className={`btn ${targetInvestor.status === "active" ? "btn-warning" : "btn-success"} px-3 shadow-sm`}
                  style={{ borderRadius: 8, fontWeight: 600 }}
                  onClick={() => {
                    handleToggleStatus(targetInvestor);
                    setShowViewModal(false);
                  }}
                >
                  <i className={`bi ${targetInvestor.status === "active" ? "bi-pause-circle" : "bi-play-circle"} me-1`} />
                  {targetInvestor.status === "active" ? "Pause Partner" : "Activate Partner"}
                </button>

                <button
                  type="button"
                  className="btn btn-outline-secondary px-3"
                  style={{ borderRadius: 8, fontWeight: 600 }}
                  onClick={() => {
                    setShowViewModal(false);
                    openEditModal(targetInvestor);
                  }}
                >
                  <i className="bi bi-pencil me-1" /> Edit Profile
                </button>

                <button
                  type="button"
                  className="btn btn-success px-3 shadow-sm"
                  style={{ borderRadius: 8, fontWeight: 700 }}
                  onClick={() => {
                    setShowViewModal(false);
                    setDisburseForm((prev) => ({
                      ...prev,
                      type: targetInvestor.current_phase === "dividend_phase" ? "dividend_payout" : "principal_recoup",
                      amount: Math.min(250000, targetInvestor.remaining_principal || 250000),
                    }));
                    setShowDisburseModal(true);
                  }}
                >
                  <i className="bi bi-cash-stack me-1" /> Log Payout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE INVESTOR MODAL ── */}
      {showDeleteModal && targetInvestor && (
        <div
          className="investor-modal-overlay"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="investor-modal-card"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="investor-modal-header py-3 px-4 text-white bg-danger">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-exclamation-triangle-fill fs-5" />
                <h5 className="modal-title fw-bold text-white mb-0">Confirm Investor Deletion</h5>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShowDeleteModal(false)}
              ></button>
            </div>

            <div className="investor-modal-body p-4 bg-white">
              <p className="text-dark mb-3">
                Are you sure you want to delete strategic investor <strong>{targetInvestor.name}</strong> ({targetInvestor.tier.toUpperCase()} TIER &bull; {targetInvestor.email})?
              </p>

              {targetInvestor.disbursements && targetInvestor.disbursements.length > 0 ? (
                <div className="alert alert-warning border-warning p-3 small mb-3" style={{ borderRadius: 12 }}>
                  <div className="fw-bold mb-1 d-flex align-items-center gap-1">
                    <i className="bi bi-shield-exclamation text-danger" /> Active Financial Audit Trail
                  </div>
                  <div>
                    This partner has <strong>{targetInvestor.disbursements.length} logged disbursement(s)</strong> totaling{" "}
                    <strong>{formatNaira(targetInvestor.total_principal_repaid + targetInvestor.total_dividends_paid)}</strong>.
                  </div>
                  <div className="mt-2 text-muted">
                    We recommend setting their status to <strong>"Paused"</strong> to freeze activity without erasing audit records.
                  </div>
                  <div className="form-check mt-3 pt-2 border-top">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="confirmForceDelete"
                      checked={forceDelete}
                      onChange={(e) => setForceDelete(e.target.checked)}
                    />
                    <label className="form-check-label text-danger fw-bold" htmlFor="confirmForceDelete">
                      I understand and explicitly request force purging this investor &amp; all disbursement records.
                    </label>
                  </div>
                </div>
              ) : (
                <div className="alert alert-info py-2 small" style={{ borderRadius: 10 }}>
                  This partner has zero disbursement records. Deletion is immediate and safe.
                </div>
              )}
            </div>

            <div className="investor-modal-footer bg-light py-3 px-4 border-top d-flex justify-content-between align-items-center">
              <button
                type="button"
                className="btn btn-outline-secondary px-3"
                style={{ borderRadius: 8, fontWeight: 600 }}
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>

              <div className="d-flex gap-2">
                {targetInvestor.disbursements && targetInvestor.disbursements.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-warning px-3"
                    style={{ borderRadius: 8, fontWeight: 600 }}
                    onClick={() => {
                      handleToggleStatus(targetInvestor);
                      setShowDeleteModal(false);
                    }}
                  >
                    Pause Investor Instead
                  </button>
                )}

                <button
                  type="button"
                  disabled={saving || (Boolean(targetInvestor.disbursements && targetInvestor.disbursements.length > 0) && !forceDelete)}
                  className="btn btn-danger px-4 shadow-sm"
                  style={{ borderRadius: 8, fontWeight: 700 }}
                  onClick={handleDeleteInvestor}
                >
                  {saving ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── OFFICIAL PAYMENT SLIP MODAL (FROM ADMIN VIEW) ── */}
      {selectedReceipt && (
        <div
          className="investor-modal-overlay"
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            className="investor-modal-card investor-modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="investor-modal-header py-3 px-4 text-white" style={{ background: "#0F2744" }}>
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-receipt text-warning fs-5" />
                <h5 className="modal-title fw-bold text-white mb-0">Official Disbursement Payment Slip</h5>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setSelectedReceipt(null)}
              ></button>
            </div>

            <div className="investor-modal-body p-4 bg-white">
              <div className="border-bottom pb-3 mb-3">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h4 className="fw-black text-primary mb-0" style={{ letterSpacing: "0.5px" }}>
                      SAMARITAN TECHNOLOGIES
                    </h4>
                    <div className="text-warning fw-bold text-uppercase small" style={{ fontSize: "0.75rem" }}>
                      SchoolProfit™ Platform Operators
                    </div>
                    <div className="text-muted small" style={{ fontSize: "0.75rem" }}>
                      Lagos &amp; Ogun State, Nigeria
                    </div>
                  </div>
                  <div className="text-end">
                    <span className="badge bg-success-subtle text-success border border-success fw-bold px-2 py-1 mb-1">
                      Remittance Completed
                    </span>
                    <div className="text-muted small"><strong>Slip Ref:</strong> {selectedReceipt.reference}</div>
                    <div className="text-muted small"><strong>Date:</strong> {selectedReceipt.payment_date}</div>
                  </div>
                </div>
              </div>

              <div className="bg-light p-3 rounded-3 text-center border mb-3">
                <div className="text-muted small fw-bold text-uppercase">Total Disbursed Amount</div>
                <h2 className="fw-black text-success mb-0">{formatNaira(selectedReceipt.amount)}</h2>
                <div className="text-dark small fw-semibold mt-1">
                  {selectedReceipt.type === "principal_recoup"
                    ? "Capital Recoup Disbursement (Principal Amortization)"
                    : "5-Year Equity Dividend Payout (Annual Profit Share)"}
                </div>
              </div>

              <div className="row g-3 small">
                <div className="col-sm-6">
                  <div className="p-2 border rounded-2 bg-light">
                    <div className="text-muted">Investor / Partner:</div>
                    <div className="fw-bold text-dark">{targetInvestor?.name}</div>
                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>Tier: {targetInvestor?.tier} TIER</div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="p-2 border rounded-2 bg-light">
                    <div className="text-muted">Academic Period:</div>
                    <div className="fw-bold text-dark">{selectedReceipt.academic_session || "2026/2027"}</div>
                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>{selectedReceipt.term || "Term Collections"}</div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="p-2 border rounded-2 bg-light">
                    <div className="text-muted">Disbursement Method:</div>
                    <div className="fw-bold text-dark">{selectedReceipt.payment_method}</div>
                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>Bank Ref: {selectedReceipt.bank_reference || "N/A"}</div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="p-2 border rounded-2 bg-light">
                    <div className="text-muted">Beneficiary Bank Account:</div>
                    <div className="fw-bold text-dark">{targetInvestor?.bank_name} &bull; {targetInvestor?.account_number}</div>
                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>Acct Name: {targetInvestor?.account_name || targetInvestor?.name}</div>
                  </div>
                </div>
              </div>

              {selectedReceipt.notes && (
                <div className="mt-3 p-2 bg-light border rounded-2 small text-muted">
                  <strong>Memo / Notes:</strong> {selectedReceipt.notes}
                </div>
              )}

              <div className="border-top mt-4 pt-3 text-center text-muted small" style={{ fontSize: "0.75rem" }}>
                This payment statement certifies official capital/dividend remittance under Samaritan Technologies Contract Ref:{" "}
                <strong>{targetInvestor?.contract_ref || "ST/SP-INV/2026/01"}</strong>.
              </div>
            </div>

            <div className="investor-modal-footer bg-light py-3 px-4 border-top d-flex justify-content-between align-items-center">
              <button
                type="button"
                className="btn btn-outline-secondary px-3"
                style={{ borderRadius: 8, fontWeight: 600 }}
                onClick={() => setSelectedReceipt(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary px-4 d-flex align-items-center gap-2 shadow-sm"
                style={{ borderRadius: 8, background: "#0F2744", borderColor: "#0F2744", fontWeight: 700 }}
                onClick={() => window.print()}
              >
                <i className="bi bi-printer" /> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
