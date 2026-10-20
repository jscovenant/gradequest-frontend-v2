import React, { useEffect, useState } from "react";
import { authApi } from "../../utils/axios";
import { getUser } from "../../utils/token";
import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import {
  TrendingUp,
  ShieldCheck,
  Building2,
  Wallet,
  Receipt,
  Printer,
  RefreshCw,
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      // Fallback demo preview mode if testing
      setInvestor({
        id: 1,
        name: currentUser?.name || currentUser?.first_name || "Engr. Tunde Babalola (Demo Partner)",
        email: currentUser?.email || "demo.investor@schoolprofit.com",
        phone: "+234 801 234 5678",
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
        account_name: "Engr. Tunde Babalola",
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (selectedDisbursement) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedDisbursement]);

  const formatNaira = (val?: number) => {
    return "₦" + Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <>
      <style>{`
        .sp-investor-card {
          border-radius: 12px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          padding: 16px;
          transition: all 0.2s ease;
        }
        .sp-investor-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 14px rgba(15, 39, 68, 0.08);
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

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="SchoolProfit™ Investor Portal" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main p-3 p-md-4 d-flex flex-column min-vh-100">
            {loading && <Loader message="Accessing SchoolProfit™ Investor Portal..." />}

            {/* HERO HEADER */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
              <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className="badge bg-success-subtle text-success border border-success fw-bold px-2 py-1" style={{ fontSize: 11 }}>
                    <ShieldCheck size={13} className="me-1 inline" /> Certified Strategic Partner
                  </span>
                  <span className="badge bg-info-subtle text-info border border-info fw-bold px-2 py-1" style={{ fontSize: 11 }}>
                    5-Year Profit Share Entitlement
                  </span>
                </div>
                <h4 className="fw-bold mb-0 text-dark" style={{ letterSpacing: "-0.02em" }}>
                  Welcome, {investor?.name || "Strategic Partner"}
                </h4>
                <p className="text-muted small mb-0">
                  <strong>SchoolProfit™</strong> &bull; Powered by <strong>SamaritanTech</strong> &bull; Tracking your seed capital recoup and 5-year equity dividend distributions (Doc Ref: <code>{branding?.proposal_ref || "ST/SP-INV/2026/01"}</code>).
                </p>
              </div>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
                  style={{ borderRadius: 10, fontWeight: 600 }}
                  onClick={fetchDashboardData}
                  disabled={loading}
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
            </div>

            {error && (
              <div className="alert alert-warning alert-dismissible fade show" role="alert">
                <strong>Notice:</strong> {error}
                <button type="button" className="btn-close" onClick={() => setError(null)}></button>
              </div>
            )}

            {/* ── PHASE RECOUP BANNER ── */}
            <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: 16, overflow: "hidden" }}>
              <div
                className="py-3 px-4 d-flex justify-content-between align-items-center text-white"
                style={{
                  background:
                    investor?.current_phase === "dividend_phase"
                      ? "linear-gradient(135deg, #065f46 0%, #059669 100%)"
                      : "linear-gradient(135deg, #0F2744 0%, #1E3A8A 100%)",
                }}
              >
                <div className="d-flex align-items-center gap-2">
                  <Sparkles size={18} className="text-warning" />
                  <span className="fw-bold text-uppercase" style={{ letterSpacing: "0.5px", fontSize: 13 }}>
                    {investor?.current_phase === "dividend_phase"
                      ? "Phase 2: 5-Year Equity Profit Dividend Active"
                      : "Phase 1: Capital Recoup Active (Zero Principal Risk)"}
                  </span>
                </div>
                <span className="badge bg-light text-dark fw-bold px-3 py-1 rounded-pill" style={{ fontSize: 11 }}>
                  {investor?.current_phase === "dividend_phase" ? "Principal 100% Repaid" : "25% Termly Payout Active"}
                </span>
              </div>

              <div className="card-body p-4 bg-white">
                <div className="row align-items-center">
                  <div className="col-md-7 mb-3 mb-md-0">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="fw-bold text-dark small">
                        Principal Repayment: {formatNaira(investor?.total_principal_repaid)} of {formatNaira(investor?.capital_invested)}
                      </span>
                      <span className="fw-bold text-primary small">{investor?.recoup_progress_percentage}% Recouped</span>
                    </div>
                    <div className="progress" style={{ height: 14, borderRadius: 8 }}>
                      <div
                        className="progress-bar progress-bar-striped progress-bar-animated bg-success"
                        role="progressbar"
                        style={{ width: `${investor?.recoup_progress_percentage || 0}%` }}
                      ></div>
                    </div>
                    <div className="d-flex justify-content-between text-muted small mt-2" style={{ fontSize: "0.8rem" }}>
                      <span>Remaining Balance: <strong className="text-danger">{formatNaira(investor?.remaining_principal)}</strong></span>
                      <span>Formula: 25% of net termly software collections</span>
                    </div>
                  </div>

                  <div className="col-md-5 border-start-md ps-md-4">
                    <div className="p-3 rounded-3" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                      <div className="d-flex align-items-center gap-2 text-dark fw-bold small mb-1">
                        <Award size={16} className="text-warning" />
                        {investor?.tier || "SILVER"} TIER &bull; {investor?.equity_percentage}% Dividend Share
                      </div>
                      <p className="text-muted small mb-0" style={{ fontSize: "0.8rem", lineHeight: 1.4 }}>
                        Once your initial capital is 100% recouped, you receive your chosen tier's profit dividend annually for 5 consecutive years.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── KPI FINANCIAL CARDS ── */}
            <div className="row g-3 mb-4">
              <div className="col-sm-6 col-lg-3">
                <div className="sp-investor-card">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-muted fw-bold small text-uppercase">Capital Invested</span>
                    <i className="bi bi-wallet2 text-primary fs-5" />
                  </div>
                  <h4 className="fw-bold text-dark mb-0">{formatNaira(investor?.capital_invested)}</h4>
                  <small className="text-muted" style={{ fontSize: 11 }}>Package: <strong>{investor?.tier} TIER</strong></small>
                </div>
              </div>

              <div className="col-sm-6 col-lg-3">
                <div className="sp-investor-card">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-success small fw-bold text-uppercase">Total Recouped</span>
                    <i className="bi bi-shield-check text-success fs-5" />
                  </div>
                  <h4 className="fw-bold text-success mb-0">{formatNaira(investor?.total_principal_repaid)}</h4>
                  <small className="text-muted" style={{ fontSize: 11 }}>{investor?.recoup_progress_percentage}% Principal Returned</small>
                </div>
              </div>

              <div className="col-sm-6 col-lg-3">
                <div className="sp-investor-card">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-danger small fw-bold text-uppercase">Remaining Principal</span>
                    <i className="bi bi-clock-history text-danger fs-5" />
                  </div>
                  <h4 className="fw-bold text-danger mb-0">{formatNaira(investor?.remaining_principal)}</h4>
                  <small className="text-muted" style={{ fontSize: 11 }}>Priority Termly Amortization</small>
                </div>
              </div>

              <div className="col-sm-6 col-lg-3">
                <div className="sp-investor-card">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-primary small fw-bold text-uppercase">5-Year Equity Share</span>
                    <i className="bi bi-award text-warning fs-5" />
                  </div>
                  <h4 className="fw-bold text-primary mb-0">{investor?.equity_percentage}%</h4>
                  <small className="text-muted" style={{ fontSize: 11 }}>Annual Net Profit Dividend</small>
                </div>
              </div>
            </div>

            {/* ── OPERATIONAL TRANSPARENCY PULSE ── */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 14 }}>
              <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <Building2 size={18} className="text-primary" />
                  Platform Scale &amp; Operational Health (Transparency Pulse)
                </h6>
                <span className="badge bg-light text-secondary border small">Safe Aggregate Metrics</span>
              </div>
              <div className="card-body p-3 p-md-4">
                <div className="row g-3 text-center">
                  <div className="col-6 col-md-3">
                    <div className="p-3 bg-light rounded-3">
                      <div className="text-muted small fw-bold text-uppercase mb-1" style={{ fontSize: 11 }}>Active Schools</div>
                      <div className="h4 fw-bold text-dark mb-0">{metrics?.active_onboarded_schools || 14}</div>
                      <div className="text-muted small" style={{ fontSize: "0.75rem" }}>Partner Institutions</div>
                    </div>
                  </div>

                  <div className="col-6 col-md-3">
                    <div className="p-3 bg-light rounded-3">
                      <div className="text-muted small fw-bold text-uppercase mb-1" style={{ fontSize: 11 }}>Billed Students</div>
                      <div className="h4 fw-bold text-dark mb-0">{metrics?.active_students_billed?.toLocaleString() || "4,200"}</div>
                      <div className="text-muted small" style={{ fontSize: "0.75rem" }}>Active Platform Licenses</div>
                    </div>
                  </div>

                  <div className="col-6 col-md-3">
                    <div className="p-3 bg-light rounded-3">
                      <div className="text-muted small fw-bold text-uppercase mb-1" style={{ fontSize: 11 }}>Term Collections Pool</div>
                      <div className="h4 fw-bold text-primary mb-0">{formatNaira(metrics?.term_collections_pool)}</div>
                      <div className="text-muted small" style={{ fontSize: "0.75rem" }}>Gross Term Volume</div>
                    </div>
                  </div>

                  <div className="col-6 col-md-3">
                    <div className="p-3 bg-light rounded-3">
                      <div className="text-muted small fw-bold text-uppercase mb-1" style={{ fontSize: 11 }}>Payback Reserve Rate</div>
                      <div className="h4 fw-bold text-success mb-0">{metrics?.payback_reserve_rate || "25%"}</div>
                      <div className="text-muted small" style={{ fontSize: "0.75rem" }}>Designated Recoup Pool</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── DISBURSEMENTS TABLE ── */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 14, overflow: "hidden" }}>
              <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                    <Receipt size={18} className="text-primary" />
                    Disbursement Statements &amp; Remittance History
                  </h6>
                  <div className="text-muted small" style={{ fontSize: "0.75rem" }}>Official remittances wired directly to your designated bank account</div>
                </div>
              </div>

              <div className="card-body p-0">
                {disbursements.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <Receipt size={32} className="mb-2 text-secondary opacity-50" />
                    <h6>No disbursements recorded yet.</h6>
                    <p className="small mb-0">Your first 25% recoup payment will be logged here upon term billing reconciliation.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                      <thead className="table-light">
                        <tr>
                          <th className="ps-4">Reference</th>
                          <th>Disbursement Type</th>
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
                              <span className="small text-dark fw-semibold">{d.academic_session || "2026/2027"}</span>
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
                                style={{ borderRadius: 8, fontSize: 12, fontWeight: 600 }}
                              >
                                <i className="bi bi-receipt" /> View Slip
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

            {/* ── SETTLEMENT BANK CARD ── */}
            <div className="card border-0 shadow-sm p-4 mb-4" style={{ borderRadius: 14 }}>
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h6 className="fw-bold text-dark mb-1">Designated Settlement Bank Account</h6>
                  <p className="text-muted small mb-0">
                    Termly disbursements and profit share dividends are remitted directly into this bank account.
                  </p>
                  <div className="mt-2 text-dark small">
                    <strong>Bank:</strong> {investor?.bank_name || "Guaranty Trust Bank"} &bull;{" "}
                    <strong>Account Number:</strong> {investor?.account_number || "0123456789"} &bull;{" "}
                    <strong>Account Name:</strong> {investor?.account_name || investor?.name}
                  </div>
                </div>
                <div className="col-md-4 text-md-end mt-3 mt-md-0">
                  <div className="small text-muted">
                    Governing Law: <strong>Federal Republic of Nigeria</strong>
                  </div>
                  <div className="small text-muted">
                    Issued By: <strong>Samaritan Technologies &bull; Operators of SchoolProfit™</strong>
                  </div>
                </div>
              </div>
            </div>

            <Footer />
          </main>
        </div>
      </div>

      {/* ── OFFICIAL PAYMENT SLIP MODAL ── */}
      {selectedDisbursement && (
        <div
          className="investor-modal-overlay"
          onClick={() => setSelectedDisbursement(null)}
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
                onClick={() => setSelectedDisbursement(null)}
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
                    <div className="text-muted small"><strong>Slip Ref:</strong> {selectedDisbursement.reference}</div>
                    <div className="text-muted small"><strong>Date:</strong> {selectedDisbursement.payment_date}</div>
                  </div>
                </div>
              </div>

              <div className="bg-light p-3 rounded-3 text-center border mb-3">
                <div className="text-muted small fw-bold text-uppercase">Total Disbursed Amount</div>
                <h2 className="fw-black text-success mb-0">{formatNaira(selectedDisbursement.amount)}</h2>
                <div className="text-dark small fw-semibold mt-1">
                  {selectedDisbursement.type === "principal_recoup"
                    ? "Capital Recoup Disbursement (Principal Amortization)"
                    : "5-Year Equity Dividend Payout (Annual Profit Share)"}
                </div>
              </div>

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
                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>Bank Ref: {selectedDisbursement.bank_reference || "N/A"}</div>
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

            <div className="investor-modal-footer bg-light py-3 px-4 border-top d-flex justify-content-between align-items-center">
              <button
                type="button"
                className="btn btn-outline-secondary px-3"
                style={{ borderRadius: 8, fontWeight: 600 }}
                onClick={() => setSelectedDisbursement(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary px-4 d-flex align-items-center gap-2 shadow-sm"
                style={{ borderRadius: 8, background: "#0F2744", borderColor: "#0F2744", fontWeight: 700 }}
                onClick={() => window.print()}
              >
                <Printer size={16} /> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
