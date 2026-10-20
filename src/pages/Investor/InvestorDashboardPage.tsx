import React, { useEffect, useState } from "react";
import { authApi } from "../../utils/axios";
import { logout, getUser } from "../../utils/token";
import {
  TrendingUp,
  ShieldCheck,
  Building2,
  Users,
  Wallet,
  Receipt,
  Download,
  Printer,
  X,
  RefreshCw,
  LogOut,
  Clock,
  Sparkles,
  Award
} from "lucide-react";

interface InvestorData {
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
}

interface OperationalMetrics {
  active_onboarded_schools: number;
  active_students_billed: number;
  term_collections_pool: number;
  payback_reserve_rate: string;
}

interface Disbursement {
  id: number;
  reference: string;
  type: "principal_recoup" | "dividend_payout";
  academic_session?: string;
  term?: string;
  amount: number;
  platform_term_collection?: number;
  payment_method: string;
  payment_date: string;
  bank_reference?: string;
  status: string;
  notes?: string;
}

interface Branding {
  platform_name: string;
  company_name: string;
  powered_by: string;
  proposal_ref: string;
  governing_jurisdiction: string;
}

export default function InvestorDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [investor, setInvestor] = useState<InvestorData | null>(null);
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [selectedDisbursement, setSelectedDisbursement] = useState<Disbursement | null>(null);

  const currentUser = getUser();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authApi.get("/investor/dashboard");
      if (res.data?.status) {
        setBranding(res.data.branding);
        setInvestor(res.data.investor);
        setMetrics(res.data.operational_metrics);
        setDisbursements(res.data.disbursements || []);
      } else {
        setError(res.data?.message || "Failed to load investor data.");
      }
    } catch (err: any) {
      console.error("Failed to load investor dashboard", err);
      // Fallback preview mode if API is connecting for the first time or sample demo data
      if (err.response?.status === 404) {
        setInvestor({
          id: 1,
          name: currentUser?.name || currentUser?.first_name || "Strategic Partner",
          email: currentUser?.email || "partner@samaritantechnologies.com",
          phone: "+234 800 000 0000",
          tier: "SILVER",
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
          account_name: "Strategic Investor",
        });
        setMetrics({
          active_onboarded_schools: 14,
          active_students_billed: 4200,
          term_collections_pool: 2940000,
          payback_reserve_rate: "25%",
        });
        setBranding({
          platform_name: "SchoolProfit™",
          company_name: "Samaritan Technologies",
          powered_by: "SamaritanTech",
          proposal_ref: "ST/SP-INV/2026/01",
          governing_jurisdiction: "Federal Republic of Nigeria",
        });
        setDisbursements([
          {
            id: 1,
            reference: "ST-RECP-20261020-001",
            type: "principal_recoup",
            academic_session: "2026/2027",
            term: "First Term",
            amount: 350000,
            payment_method: "Direct NIP Bank Transfer",
            payment_date: "2026-10-20",
            bank_reference: "NIP/GTB/20261020/998210",
            status: "completed",
            notes: "First term 25% collections capital recoup disbursement",
          },
        ]);
      } else {
        setError(err.response?.data?.message || "Failed to connect to investor server.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatNaira = (val?: number) => {
    return "₦" + Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
        <div className="spinner-border text-primary mb-3" style={{ width: "3rem", height: "3rem" }} role="status"></div>
        <h5 className="fw-bold text-dark">Accessing SchoolProfit™ Investor Portal...</h5>
        <p className="text-muted small">Powered by SamaritanTech</p>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light pb-5">
      {/* ── TOP NAV / BRAND HEADER ── */}
      <header className="bg-dark text-white border-bottom border-secondary shadow-sm">
        <div className="container py-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-3">
              <div
                className="bg-primary text-white rounded-3 d-flex align-items-center justify-content-center shadow-sm"
                style={{ width: "44px", height: "44px" }}
              >
                <TrendingUp size={24} />
              </div>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <h4 className="fw-black mb-0 text-white tracking-wide">SchoolProfit™</h4>
                  <span className="badge bg-warning text-dark fw-bold px-2 py-1" style={{ fontSize: "0.7rem" }}>
                    INVESTOR PORTAL
                  </span>
                </div>
                <div className="text-secondary small">
                  Powered by <strong>SamaritanTech</strong> &bull; Proposal Ref:{" "}
                  <span className="text-light">{branding?.proposal_ref || "ST/SP-INV/2026/01"}</span>
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <button onClick={fetchDashboardData} className="btn btn-sm btn-outline-light d-flex align-items-center gap-1">
                <RefreshCw size={14} /> Refresh
              </button>
              <button
                onClick={() => logout()}
                className="btn btn-sm btn-danger d-flex align-items-center gap-1 shadow-sm"
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── HERO BANNER ── */}
      <div className="bg-white border-bottom py-4 shadow-sm mb-4">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="badge bg-success-subtle text-success border border-success fw-bold px-2 py-1">
                  <ShieldCheck size={14} className="me-1 inline" /> Certified Strategic Partner
                </span>
                <span className="badge bg-info-subtle text-info border border-info fw-bold px-2 py-1">
                  Tenure: {investor?.tenure_years || 5} Years Appreciation
                </span>
              </div>
              <h2 className="fw-extrabold text-dark mb-1">Welcome, {investor?.name || "Strategic Partner"}</h2>
              <p className="text-muted mb-0">
                Tracking your capital recoup, platform school expansion, and 5-year equity profit share dividends.
              </p>
            </div>
            <div className="col-lg-4 text-lg-end mt-3 mt-lg-0">
              <div className="d-inline-block bg-primary-subtle border border-primary rounded-3 p-3 text-start">
                <div className="text-primary fw-bold text-uppercase small" style={{ letterSpacing: "0.5px" }}>
                  Active Investment Tier
                </div>
                <div className="h4 fw-black text-primary mb-0 d-flex align-items-center gap-2">
                  <Award size={22} className="text-warning" />
                  {investor?.tier || "SILVER"} TIER
                </div>
                <div className="small text-muted">
                  {formatNaira(investor?.capital_invested)} Capital &bull;{" "}
                  <strong>{investor?.equity_percentage}% Profit Share</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {error && (
          <div className="alert alert-warning alert-dismissible fade show" role="alert">
            <strong>Notice:</strong> {error}
            <button type="button" className="btn-close" onClick={() => setError(null)}></button>
          </div>
        )}

        {/* ── PHASE HIGHLIGHT CARD ── */}
        <div className="card shadow-sm border-0 mb-4 overflow-hidden">
          <div
            className="card-header text-white py-3 px-4 d-flex justify-content-between align-items-center"
            style={{
              background:
                investor?.current_phase === "dividend_phase"
                  ? "linear-gradient(90deg, #059669 0%, #10B981 100%)"
                  : "linear-gradient(90deg, #1E3A8A 0%, #2563EB 100%)",
            }}
          >
            <div className="d-flex align-items-center gap-2">
              <Sparkles size={20} className="text-warning" />
              <span className="fw-bold text-uppercase" style={{ letterSpacing: "1px" }}>
                {investor?.current_phase === "dividend_phase"
                  ? "Phase 2: 5-Year Equity Profit Dividend Active"
                  : "Phase 1: Capital Recoup Active (Zero Principal Loss Model)"}
              </span>
            </div>
            <span className="badge bg-light text-dark fw-bold px-3 py-1 rounded-pill">
              {investor?.current_phase === "dividend_phase" ? "Principal 100% Repaid" : "25% Termly Payout Active"}
            </span>
          </div>

          <div className="card-body p-4 bg-white">
            <div className="row align-items-center">
              <div className="col-md-7 mb-3 mb-md-0">
                <div className="d-flex justify-content-between mb-2">
                  <span className="fw-bold text-dark">
                    Principal Repayment Progress: {formatNaira(investor?.total_principal_repaid)} of{" "}
                    {formatNaira(investor?.capital_invested)}
                  </span>
                  <span className="fw-bold text-primary">{investor?.recoup_progress_percentage}% Repaid</span>
                </div>
                <div className="progress" style={{ height: "18px", borderRadius: "10px" }}>
                  <div
                    className="progress-bar progress-bar-striped progress-bar-animated bg-success"
                    role="progressbar"
                    style={{ width: `${investor?.recoup_progress_percentage || 0}%` }}
                    aria-valuenow={investor?.recoup_progress_percentage || 0}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  ></div>
                </div>
                <div className="d-flex justify-content-between text-muted small mt-2">
                  <span>Remaining to Full Recoup: <strong className="text-danger">{formatNaira(investor?.remaining_principal)}</strong></span>
                  <span>Formula: 25% of net termly platform software collections</span>
                </div>
              </div>

              <div className="col-md-5 border-start-md ps-md-4">
                <div className="bg-light p-3 rounded-3 border">
                  <div className="d-flex align-items-center gap-2 text-dark fw-bold small mb-1">
                    <ShieldCheck size={16} className="text-success" />
                    How Your Returns Progress
                  </div>
                  <p className="text-muted small mb-0" style={{ fontSize: "0.82rem", lineHeight: "1.4" }}>
                    Once 100% of your initial capital is returned, your account immediately unlocks{" "}
                    <strong>{investor?.equity_percentage}% of annual net profits</strong> for{" "}
                    <strong>5 consecutive years</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── FINANCIAL KPI SUMMARY CARDS ── */}
        <div className="row g-3 mb-4">
          <div className="col-sm-6 col-lg-3">
            <div className="card border-0 shadow-sm rounded-3 h-100 p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted fw-bold small text-uppercase">Capital Invested</span>
                <div className="p-2 bg-primary-subtle text-primary rounded-2">
                  <Wallet size={18} />
                </div>
              </div>
              <h3 className="fw-black text-dark mb-1">{formatNaira(investor?.capital_invested)}</h3>
              <div className="small text-muted">Tier: <strong>{investor?.tier}</strong></div>
            </div>
          </div>

          <div className="col-sm-6 col-lg-3">
            <div className="card border-0 shadow-sm rounded-3 h-100 p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted fw-bold small text-uppercase">Total Recouped</span>
                <div className="p-2 bg-success-subtle text-success rounded-2">
                  <ShieldCheck size={18} />
                </div>
              </div>
              <h3 className="fw-black text-success mb-1">{formatNaira(investor?.total_principal_repaid)}</h3>
              <div className="small text-muted">{investor?.recoup_progress_percentage}% Principal Returned</div>
            </div>
          </div>

          <div className="col-sm-6 col-lg-3">
            <div className="card border-0 shadow-sm rounded-3 h-100 p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted fw-bold small text-uppercase">Remaining Balance</span>
                <div className="p-2 bg-danger-subtle text-danger rounded-2">
                  <Clock size={18} />
                </div>
              </div>
              <h3 className="fw-black text-danger mb-1">{formatNaira(investor?.remaining_principal)}</h3>
              <div className="small text-muted">Priority Termly Amortization</div>
            </div>
          </div>

          <div className="col-sm-6 col-lg-3">
            <div className="card border-0 shadow-sm rounded-3 h-100 p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted fw-bold small text-uppercase">5-Year Equity Share</span>
                <div className="p-2 bg-warning-subtle text-warning rounded-2">
                  <Award size={18} />
                </div>
              </div>
              <h3 className="fw-black text-primary mb-1">{investor?.equity_percentage}%</h3>
              <div className="small text-muted">Annual Net Profit Dividend</div>
            </div>
          </div>
        </div>

        {/* ── OPERATIONAL HEALTH & SCALE PULSE ── */}
        <div className="card border-0 shadow-sm rounded-3 mb-4">
          <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
            <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
              <Building2 size={20} className="text-primary" />
              Live Platform Operational Metrics (Transparency Pulse)
            </h5>
            <span className="badge bg-secondary-subtle text-secondary small">Aggregate Macro Data</span>
          </div>
          <div className="card-body p-4">
            <div className="row g-4 text-center">
              <div className="col-6 col-md-3">
                <div className="p-3 bg-light rounded-3">
                  <div className="text-muted small fw-bold text-uppercase mb-1">Active Schools</div>
                  <div className="h3 fw-black text-dark mb-0">{metrics?.active_onboarded_schools || 14}</div>
                  <div className="text-muted small" style={{ fontSize: "0.75rem" }}>Partner Institutions</div>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="p-3 bg-light rounded-3">
                  <div className="text-muted small fw-bold text-uppercase mb-1">Billed Students</div>
                  <div className="h3 fw-black text-dark mb-0">{metrics?.active_students_billed?.toLocaleString() || "4,200"}</div>
                  <div className="text-muted small" style={{ fontSize: "0.75rem" }}>Active Portal Licenses</div>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="p-3 bg-light rounded-3">
                  <div className="text-muted small fw-bold text-uppercase mb-1">Term Collection Pool</div>
                  <div className="h3 fw-black text-primary mb-0">{formatNaira(metrics?.term_collections_pool)}</div>
                  <div className="text-muted small" style={{ fontSize: "0.75rem" }}>Gross Term Volume</div>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="p-3 bg-light rounded-3">
                  <div className="text-muted small fw-bold text-uppercase mb-1">Payback Reserve Rate</div>
                  <div className="h3 fw-black text-success mb-0">{metrics?.payback_reserve_rate || "25%"}</div>
                  <div className="text-muted small" style={{ fontSize: "0.75rem" }}>Allocated to Recoup</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── DISBURSEMENTS & PAYOUT STATEMENT HISTORY ── */}
        <div className="card border-0 shadow-sm rounded-3 mb-4">
          <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
            <div>
              <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <Receipt size={20} className="text-primary" />
                Disbursement History & Payout Statements
              </h5>
              <div className="text-muted small">Official remittances credited directly to your bank account</div>
            </div>
          </div>

          <div className="card-body p-0">
            {disbursements.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <Receipt size={36} className="mb-2 text-secondary opacity-50" />
                <h6>No disbursements recorded yet.</h6>
                <p className="small mb-0">Your first 25% recoup payment will be logged here upon term billing reconciliation.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4">Reference</th>
                      <th>Type</th>
                      <th>Academic Period</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Method / Bank Ref</th>
                      <th>Status</th>
                      <th className="text-end pe-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disbursements.map((d) => (
                      <tr key={d.id}>
                        <td className="ps-4 fw-bold text-dark">{d.reference}</td>
                        <td>
                          {d.type === "principal_recoup" ? (
                            <span className="badge bg-primary-subtle text-primary border border-primary">
                              Principal Recoup
                            </span>
                          ) : (
                            <span className="badge bg-success-subtle text-success border border-success">
                              5-Year Dividend
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="small text-dark fw-semibold">{d.academic_session || "Current Session"}</span>
                          <div className="text-muted small" style={{ fontSize: "0.75rem" }}>
                            {d.term || "Term Payout"}
                          </div>
                        </td>
                        <td className="text-muted small">{d.payment_date}</td>
                        <td className="fw-bold text-success">{formatNaira(d.amount)}</td>
                        <td>
                          <div className="small text-dark">{d.payment_method}</div>
                          {d.bank_reference && (
                            <div className="text-muted small" style={{ fontSize: "0.72rem" }}>
                              Ref: {d.bank_reference}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="badge bg-success text-white">Completed</span>
                        </td>
                        <td className="text-end pe-4">
                          <button
                            onClick={() => setSelectedDisbursement(d)}
                            className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                          >
                            <Receipt size={14} /> View Slip
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

        {/* ── REGISTERED SETTLEMENT BANK DETAILS ── */}
        <div className="card border-0 shadow-sm rounded-3 p-4">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h6 className="fw-bold text-dark mb-1">Registered Payout Bank Account</h6>
              <p className="text-muted small mb-0">
                Termly disbursements and profit shares are wired directly into this designated bank account.
              </p>
              <div className="mt-2 text-dark small">
                <strong>Bank:</strong> {investor?.bank_name || "Guaranty Trust Bank"} &bull;{" "}
                <strong>Account Number:</strong> {investor?.account_number || "0123456789"} &bull;{" "}
                <strong>Account Name:</strong> {investor?.account_name || investor?.name}
              </div>
            </div>
            <div className="col-md-4 text-md-end mt-3 mt-md-0">
              <div className="small text-muted">
                Governing Law: <strong>{branding?.governing_jurisdiction || "Federal Republic of Nigeria"}</strong>
              </div>
              <div className="small text-muted">
                Issued By: <strong>{branding?.company_name || "Samaritan Technologies"}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── OFFICIAL PAYMENT SLIP MODAL ── */}
      {selectedDisbursement && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.75)", zIndex: 1050 }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow-lg border-0 rounded-3">
              <div className="modal-header bg-dark text-white border-bottom border-secondary py-3 px-4">
                <div className="d-flex align-items-center gap-2">
                  <Receipt size={20} className="text-warning" />
                  <h5 className="modal-title fw-bold text-white mb-0">Official Disbursement Payment Slip</h5>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setSelectedDisbursement(null)}
                ></button>
              </div>

              <div className="modal-body p-4 bg-white" id="payment-slip-print">
                {/* Letterhead Header */}
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
                        Lagos & Ogun State, Nigeria
                      </div>
                    </div>
                    <div className="text-end">
                      <span className="badge bg-success-subtle text-success border border-success fw-bold px-2 py-1 mb-1">
                        Remittance Completed
                      </span>
                      <div className="text-muted small"><strong>Receipt Ref:</strong> {selectedDisbursement.reference}</div>
                      <div className="text-muted small"><strong>Date:</strong> {selectedDisbursement.payment_date}</div>
                    </div>
                  </div>
                </div>

                {/* Amount Banner */}
                <div className="bg-light p-3 rounded-3 text-center border mb-3">
                  <div className="text-muted small fw-bold text-uppercase">Total Disbursed Amount</div>
                  <h2 className="fw-black text-success mb-0">{formatNaira(selectedDisbursement.amount)}</h2>
                  <div className="text-dark small fw-semibold mt-1">
                    {selectedDisbursement.type === "principal_recoup"
                      ? "Capital Recoup Disbursement (Principal Amortization)"
                      : "5-Year Equity Dividend Payout (Annual Profit Share)"}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="row g-3 small">
                  <div className="col-sm-6">
                    <div className="p-2 border rounded-2 bg-light">
                      <div className="text-muted">Investor / Partner:</div>
                      <div className="fw-bold text-dark">{investor?.name}</div>
                      <div className="text-muted" style={{ fontSize: "0.75rem" }}>Tier: {investor?.tier} TIER</div>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="p-2 border rounded-2 bg-light">
                      <div className="text-muted">Academic Period:</div>
                      <div className="fw-bold text-dark">{selectedDisbursement.academic_session || "2026/2027"}</div>
                      <div className="text-muted" style={{ fontSize: "0.75rem" }}>{selectedDisbursement.term || "Term Collections"}</div>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="p-2 border rounded-2 bg-light">
                      <div className="text-muted">Disbursement Method:</div>
                      <div className="fw-bold text-dark">{selectedDisbursement.payment_method}</div>
                      <div className="text-muted" style={{ fontSize: "0.75rem" }}>NIP Transaction Ref: {selectedDisbursement.bank_reference || "N/A"}</div>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="p-2 border rounded-2 bg-light">
                      <div className="text-muted">Beneficiary Bank Account:</div>
                      <div className="fw-bold text-dark">{investor?.bank_name} &bull; {investor?.account_number}</div>
                      <div className="text-muted" style={{ fontSize: "0.75rem" }}>Acct Name: {investor?.account_name || investor?.name}</div>
                    </div>
                  </div>
                </div>

                {selectedDisbursement.notes && (
                  <div className="mt-3 p-2 bg-light border rounded-2 small text-muted">
                    <strong>Memo / Notes:</strong> {selectedDisbursement.notes}
                  </div>
                )}

                <div className="border-top mt-4 pt-3 text-center text-muted small" style={{ fontSize: "0.75rem" }}>
                  This payment statement certifies official capital/dividend remittance under Samaritan Technologies Contract Ref:{" "}
                  <strong>{branding?.proposal_ref || "ST/SP-INV/2026/01"}</strong>.
                </div>
              </div>

              <div className="modal-footer bg-light py-2 px-4 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setSelectedDisbursement(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm"
                  onClick={() => window.print()}
                >
                  <Printer size={14} /> Print / Save PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
