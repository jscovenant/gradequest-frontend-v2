import React, { useEffect, useState } from "react";
import { authApi } from "../../utils/axios";
import {
  Users,
  Wallet,
  ShieldCheck,
  TrendingUp,
  PlusCircle,
  Receipt,
  CheckCircle,
  Clock,
  Award,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

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
  const [loading, setLoading] = useState(true);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDisburseModal, setShowDisburseModal] = useState(false);
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
      // Demo fallback if fresh migration
      setMetrics({
        total_capital_raised: 1000000,
        total_principal_repaid: 350000,
        total_dividends_paid: 0,
        total_investors_count: 1,
        active_investors_count: 1,
        recoup_phase_count: 1,
        dividend_phase_count: 0,
        tier_distribution: { bronze: 0, silver: 1, gold: 0, custom: 0 },
      });
      setInvestors([
        {
          id: 1,
          name: "Strategic Investor",
          email: "investor@samaritantech.ng",
          phone: "08012345678",
          tier: "silver",
          capital_invested: 1000000,
          equity_percentage: 7.0,
          recoup_percentage: 25.0,
          tenure_years: 5,
          total_principal_repaid: 350000,
          total_dividends_paid: 0,
          remaining_principal: 650000,
          recoup_progress_percentage: 35.0,
          current_phase: "recoup_phase",
          investment_date: "2026-10-20",
          status: "active",
          bank_name: "Guaranty Trust Bank",
          account_number: "0123456789",
          account_name: "Strategic Investor Partner",
          contract_ref: "ST/SP-INV/2026/01",
          disbursements: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestors();
  }, []);

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

  const handleAddInvestor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await authApi.post("/super-admin/investors", addForm);
      if (res.data?.status) {
        setActionMessage({ type: "success", text: "Investor onboarded successfully with portal access!" });
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
    return (
      inv.name.toLowerCase().includes(s) ||
      inv.email.toLowerCase().includes(s) ||
      (inv.phone && inv.phone.includes(s)) ||
      inv.tier.toLowerCase().includes(s)
    );
  });

  return (
    <div className="container-fluid py-4 px-md-5">
      {/* ── HEADER ── */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h3 className="fw-black text-dark mb-0">Investors & Capital Portfolio</h3>
            <span className="badge bg-primary text-white">SchoolProfit™</span>
          </div>
          <div className="text-muted small">
            Powered by <strong>SamaritanTech</strong> &bull; Growth capital amortization and 5-year dividend governance
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button onClick={fetchInvestors} className="btn btn-outline-secondary d-flex align-items-center gap-1">
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary d-flex align-items-center gap-1 shadow-sm"
          >
            <PlusCircle size={16} /> Onboard New Investor
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className={`alert alert-${actionMessage.type} alert-dismissible fade show`} role="alert">
          {actionMessage.text}
          <button type="button" className="btn-close" onClick={() => setActionMessage(null)}></button>
        </div>
      )}

      {/* ── KPI PORTFOLIO CARDS ── */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fw-bold small text-uppercase">Total Capital Raised</span>
              <div className="p-2 bg-primary-subtle text-primary rounded-2">
                <Wallet size={18} />
              </div>
            </div>
            <h3 className="fw-black text-dark mb-1">{formatNaira(metrics?.total_capital_raised)}</h3>
            <div className="small text-muted">{metrics?.total_investors_count || 0} Registered Partners</div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fw-bold small text-uppercase">Principal Repaid</span>
              <div className="p-2 bg-success-subtle text-success rounded-2">
                <ShieldCheck size={18} />
              </div>
            </div>
            <h3 className="fw-black text-success mb-1">{formatNaira(metrics?.total_principal_repaid)}</h3>
            <div className="small text-muted">Amortized from 25% Term Collections</div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fw-bold small text-uppercase">5-Year Dividends Paid</span>
              <div className="p-2 bg-warning-subtle text-warning rounded-2">
                <Award size={18} />
              </div>
            </div>
            <h3 className="fw-black text-primary mb-1">{formatNaira(metrics?.total_dividends_paid)}</h3>
            <div className="small text-muted">{metrics?.dividend_phase_count || 0} in Phase 2 Dividend</div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fw-bold small text-uppercase">Active Recoup Phase</span>
              <div className="p-2 bg-info-subtle text-info rounded-2">
                <Clock size={18} />
              </div>
            </div>
            <h3 className="fw-black text-info mb-1">{metrics?.recoup_phase_count || 0} Investors</h3>
            <div className="small text-muted">Currently Receiving 25% Payback</div>
          </div>
        </div>
      </div>

      {/* ── INVESTORS TABLE ── */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-header bg-white py-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <Users size={20} className="text-primary" />
            <h5 className="fw-bold text-dark mb-0">Strategic Investors List</h5>
          </div>

          <div className="input-group" style={{ maxWidth: "320px" }}>
            <span className="input-group-text bg-light border-end-0">
              <Search size={15} className="text-muted" />
            </span>
            <input
              type="text"
              className="form-control bg-light border-start-0 small"
              placeholder="Search partner by name, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4">Partner Name & Email</th>
                  <th>Tier & Capital</th>
                  <th>Equity & Terms</th>
                  <th>Recoup Progress</th>
                  <th>Phase Status</th>
                  <th>Settlement Bank</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvestors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      No investors found. Click "Onboard New Investor" to register your first partner.
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
                          {inv.recoup_percentage}% termly recoup &bull; {inv.tenure_years} yrs
                        </div>
                      </td>
                      <td style={{ minWidth: "160px" }}>
                        <div className="d-flex justify-content-between small mb-1">
                          <span>{formatNaira(inv.total_principal_repaid)}</span>
                          <span className="fw-bold">{inv.recoup_progress_percentage}%</span>
                        </div>
                        <div className="progress" style={{ height: "8px" }}>
                          <div
                            className="progress-bar bg-success"
                            style={{ width: `${inv.recoup_progress_percentage}%` }}
                          ></div>
                        </div>
                        <div className="text-muted small mt-1" style={{ fontSize: "0.72rem" }}>
                          Rem: {formatNaira(inv.remaining_principal)}
                        </div>
                      </td>
                      <td>
                        {inv.current_phase === "dividend_phase" ? (
                          <span className="badge bg-success text-white">Phase 2: Dividend</span>
                        ) : (
                          <span className="badge bg-info text-white">Phase 1: Recoup</span>
                        )}
                      </td>
                      <td>
                        <div className="small text-dark fw-semibold">{inv.bank_name || "Not set"}</div>
                        <div className="text-muted small" style={{ fontSize: "0.75rem" }}>
                          {inv.account_number || "No account logged"}
                        </div>
                      </td>
                      <td className="text-end pe-4">
                        <div className="d-inline-flex gap-1">
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
                            className="btn btn-sm btn-success d-flex align-items-center gap-1"
                          >
                            <Receipt size={14} /> Log Payout
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
      </div>

      {/* ── ONBOARD NEW INVESTOR MODAL ── */}
      {showAddModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.75)", zIndex: 1050 }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow-lg border-0 rounded-3">
              <div className="modal-header bg-dark text-white border-bottom border-secondary py-3 px-4">
                <h5 className="modal-title fw-bold text-white mb-0">Onboard New Strategic Partner</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>

              <form onSubmit={handleAddInvestor}>
                <div className="modal-body p-4 bg-white">
                  <div className="alert alert-info py-2 small mb-3">
                    <strong>Proposal Standard:</strong> Automatically provisions the investor's profile, calculates 25% recoup, and can create their login credentials for the SchoolProfit Investor Portal.
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
                        className="form-control"
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
                        className="form-control"
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
                        className="form-control"
                        placeholder="e.g. 08012345678"
                        value={addForm.phone}
                        onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold small">Investment Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={addForm.investment_date}
                        onChange={(e) => setAddForm({ ...addForm, investment_date: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-bold small">Capital Invested (₦)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={addForm.capital_invested}
                        onChange={(e) => setAddForm({ ...addForm, capital_invested: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-bold small">5-Year Equity %</label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control"
                        value={addForm.equity_percentage}
                        onChange={(e) => setAddForm({ ...addForm, equity_percentage: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-bold small">Termly Recoup %</label>
                      <input
                        type="number"
                        step="1"
                        className="form-control"
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
                        className="form-control"
                        placeholder="e.g. GTBank"
                        value={addForm.bank_name}
                        onChange={(e) => setAddForm({ ...addForm, bank_name: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small">Account Number</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="10 Digits"
                        value={addForm.account_number}
                        onChange={(e) => setAddForm({ ...addForm, account_number: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small">Account Name</label>
                      <input
                        type="text"
                        className="form-control"
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

                <div className="modal-footer bg-light py-2 px-4">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="btn btn-sm btn-primary">
                    {saving ? "Saving..." : "Register & Onboard Partner"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── RECORD DISBURSEMENT MODAL ── */}
      {showDisburseModal && targetInvestor && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.75)", zIndex: 1050 }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-3">
              <div className="modal-header bg-dark text-white border-bottom border-secondary py-3 px-4">
                <h5 className="modal-title fw-bold text-white mb-0">Record Remittance / Disbursement</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowDisburseModal(false)}
                ></button>
              </div>

              <form onSubmit={handleRecordDisbursement}>
                <div className="modal-body p-4 bg-white">
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
                      className="form-select"
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
                        className="form-control"
                        required
                        value={disburseForm.amount}
                        onChange={(e) => setDisburseForm({ ...disburseForm, amount: Number(e.target.value) })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold small">Payment Date</label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={disburseForm.payment_date}
                        onChange={(e) => setDisburseForm({ ...disburseForm, payment_date: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small">Academic Session</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 2026/2027"
                        value={disburseForm.academic_session}
                        onChange={(e) => setDisburseForm({ ...disburseForm, academic_session: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small">Academic Term</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. First Term"
                        value={disburseForm.term}
                        onChange={(e) => setDisburseForm({ ...disburseForm, term: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small">Bank Transfer Transaction Reference</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. NIP/GTB/20261020/00912"
                        value={disburseForm.bank_reference}
                        onChange={(e) => setDisburseForm({ ...disburseForm, bank_reference: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small">Internal Notes / Memo</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Optional remarks"
                        value={disburseForm.notes}
                        onChange={(e) => setDisburseForm({ ...disburseForm, notes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light py-2 px-4">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setShowDisburseModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="btn btn-sm btn-success">
                    {saving ? "Recording..." : "Record & Disburse Payment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
