// src/pages/Admin/Fees/FeePolicyPage.tsx
import { useEffect, useState } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";

type InstallmentType =
  | "two_installments_70_30"
  | "two_installments_50_50"
  | "three_installments_40_30_30"
  | "full_only"
  | "custom";

type FeeAccessPolicy = {
  bank_charge_bearer?: "parent" | "school";
  bank_charge_amount?: number;
  platform_fee_bearer?: "parent" | "school";
  active_payment_gateway?: "wema_alat" | "monnify" | "paystack";
  enabled: boolean;
  result_access_enabled: boolean;
  result_min_payment_percent: number;
  result_scope: "selected_period" | "all_outstanding";
  cbt_access_enabled: boolean;
  cbt_min_payment_percent: number;
  cbt_scope: "selected_period" | "all_outstanding";
  installment_enabled: boolean;
  installment_type: InstallmentType;
  min_initial_installment_percent: number;
  message: string;
  cbt_message: string;
  installment_message: string;
};

type FeeAccessPolicyResponse = {
  policy: FeeAccessPolicy;
  message?: string;
};

const clampInt = (val: any, min: number, max: number, fallback: number) => {
  const n = parseInt(String(val), 10);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
};

export default function FeePolicyPage() {
  const { showSuccess, showError } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [policy, setPolicy] = useState<FeeAccessPolicy>({
    enabled: true,
    result_access_enabled: true,
    result_min_payment_percent: 100,
    result_scope: "selected_period",
    cbt_access_enabled: false,
    cbt_min_payment_percent: 100,
    cbt_scope: "selected_period",
    installment_enabled: true,
    installment_type: "two_installments_70_30",
    min_initial_installment_percent: 70,
    message: "Result access is currently unavailable because the required school fee payment has not been completed.",
    cbt_message: "Access denied. Complete the required school fee payment before starting this exam.",
    installment_message: "This school requires a minimum initial payment of :percent% (:amount) for the term.",
    bank_charge_bearer: "parent",
    bank_charge_amount: 200,
    platform_fee_bearer: "school",
    active_payment_gateway: "wema_alat",
  });

  const fetchPolicy = async () => {
    setLoading(true);
    try {
      const res = await authApi.get<FeeAccessPolicyResponse>("/settings/fee-access-policy");
      if (res.data?.policy) {
        const p = res.data.policy;
        setPolicy({
          enabled: p.enabled !== false,
          result_access_enabled: p.result_access_enabled !== false,
          result_min_payment_percent: clampInt(p.result_min_payment_percent, 0, 100, 100),
          result_scope: p.result_scope === "all_outstanding" ? "all_outstanding" : "selected_period",
          cbt_access_enabled: Boolean(p.cbt_access_enabled),
          cbt_min_payment_percent: clampInt(p.cbt_min_payment_percent, 0, 100, 100),
          cbt_scope: p.cbt_scope === "all_outstanding" ? "all_outstanding" : "selected_period",
          installment_enabled: Boolean(p.installment_enabled),
          installment_type: p.installment_type || "two_installments_70_30",
          min_initial_installment_percent: clampInt(p.min_initial_installment_percent, 1, 100, 70),
          message: p.message || "Result access is currently unavailable because the required school fee payment has not been completed.",
          cbt_message: p.cbt_message || "Access denied. Complete the required school fee payment before starting this exam.",
          installment_message: p.installment_message || "This school requires a minimum initial payment of :percent% (:amount) for the term.",
          bank_charge_bearer: p.bank_charge_bearer === "school" ? "school" : "parent",
          bank_charge_amount: Number(p.bank_charge_amount || 200),
          platform_fee_bearer: p.platform_fee_bearer === "parent" ? "parent" : "school",
          active_payment_gateway: (p.active_payment_gateway as any) || "wema_alat",
        });
      }
    } catch (err: any) {
      console.error(err);
      showError("Failed to load fee policy settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicy();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authApi.put<FeeAccessPolicyResponse>("/settings/fee-access-policy", policy);
      if (res.data?.policy) {
        const p = res.data.policy;
        setPolicy({
          enabled: p.enabled !== false,
          result_access_enabled: p.result_access_enabled !== false,
          result_min_payment_percent: clampInt(p.result_min_payment_percent, 0, 100, 100),
          result_scope: p.result_scope === "all_outstanding" ? "all_outstanding" : "selected_period",
          cbt_access_enabled: Boolean(p.cbt_access_enabled),
          cbt_min_payment_percent: clampInt(p.cbt_min_payment_percent, 0, 100, 100),
          cbt_scope: p.cbt_scope === "all_outstanding" ? "all_outstanding" : "selected_period",
          installment_enabled: Boolean(p.installment_enabled),
          installment_type: p.installment_type || "two_installments_70_30",
          min_initial_installment_percent: clampInt(p.min_initial_installment_percent, 1, 100, 70),
          message: p.message || "Result access is currently unavailable because the required school fee payment has not been completed.",
          cbt_message: p.cbt_message || "Access denied. Complete the required school fee payment before starting this exam.",
          installment_message: p.installment_message || "This school requires a minimum initial payment of :percent% (:amount) for the term.",
          bank_charge_bearer: p.bank_charge_bearer === "school" ? "school" : "parent",
          bank_charge_amount: Number(p.bank_charge_amount || 200),
          platform_fee_bearer: p.platform_fee_bearer === "parent" ? "parent" : "school",
          active_payment_gateway: (p.active_payment_gateway as any) || "wema_alat",
        });
      }
      showSuccess(res.data?.message || "Fee and installment policy saved successfully.");
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Could not save fee policy. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectSchedule = (type: InstallmentType) => {
    let minP = policy.min_initial_installment_percent;
    if (type === "two_installments_70_30") minP = 70;
    else if (type === "two_installments_50_50") minP = 50;
    else if (type === "three_installments_40_30_30") minP = 40;
    else if (type === "full_only") minP = 100;

    setPolicy((p) => ({
      ...p,
      installment_type: type,
      min_initial_installment_percent: minP,
    }));
  };

  // Sample Simulation Calculation
  const sampleFee = 30000;
  const initialReq = Math.round((policy.min_initial_installment_percent / 100) * sampleFee);
  const balanceReq = sampleFee - initialReq;

  return (
    <>
      <PageTitle title="Fee Policy & Installments | GradiosEdu" />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');
        
        .fp-main {
          min-height: 100vh;
          background: #F8FAFC;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: calc(var(--gq-topnav-height, 66px) + 20px) 24px 60px;
          overflow-x: hidden;
          box-sizing: border-box;
          color: #0F172A;
        }
        @media(max-width: 767.98px) {
          .fp-main { padding: calc(var(--gq-topnav-height, 66px) + 12px) 12px 36px; }
        }

        .fp-shell {
          max-width: 1100px;
          margin: 0 auto;
          width: 100%;
        }

        /* ── Hero ── */
        .fp-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 55%, #1E3A8A 100%);
          border-radius: 20px;
          padding: 32px 36px;
          position: relative;
          overflow: hidden;
          margin-bottom: 28px;
          box-shadow: 0 12px 32px -6px rgba(15, 39, 68, 0.2);
          color: #FFFFFF;
        }
        @media(max-width: 767.98px) {
          .fp-hero { padding: 22px 18px; border-radius: 14px; }
        }

        .fp-hero-glow {
          position: absolute;
          top: -80px;
          right: -80px;
          width: 340px;
          height: 340px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.2) 0%, transparent 65%);
          pointer-events: none;
        }

        .fp-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
        }

        .fp-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #FBBF24;
          background: rgba(217, 119, 6, 0.20);
          border: 1px solid rgba(217, 119, 6, 0.35);
          border-radius: 100px;
          padding: 4px 14px;
          margin-bottom: 10px;
        }

        .fp-title {
          font-size: 26px;
          font-weight: 850;
          margin: 0 0 6px;
          letter-spacing: -0.02em;
        }
        @media(max-width: 767.98px) {
          .fp-title { font-size: 22px; }
        }

        .fp-sub {
          font-size: 14px;
          color: #94A3B8;
          max-width: 600px;
          margin: 0;
          line-height: 1.5;
        }

        .fp-btn-save {
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
          color: #0A192F;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(217, 119, 6, 0.35);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .fp-btn-save:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(217, 119, 6, 0.45);
        }

        .fp-btn-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ── Cards ── */
        .fp-card {
          background: #FFFFFF;
          border-radius: 18px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.05);
          padding: 28px;
          margin-bottom: 24px;
        }
        @media(max-width: 767.98px) {
          .fp-card { padding: 18px 16px; border-radius: 14px; }
        }

        .fp-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 20px;
          border-bottom: 1px solid #F1F5F9;
          margin-bottom: 24px;
        }

        .fp-card-ico {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #EEF2FF;
          color: #1D4ED8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .fp-card-title {
          font-size: 18px;
          font-weight: 800;
          color: #0F172A;
          margin: 0 0 4px;
        }

        .fp-card-desc {
          font-size: 13px;
          color: #64748B;
          margin: 0;
        }

        /* ── Schedule Presets Grid ── */
        .fp-presets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px;
          margin-top: 14px;
        }

        .fp-preset-card {
          border: 2px solid #E2E8F0;
          border-radius: 14px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #FFFFFF;
          position: relative;
        }

        .fp-preset-card:hover {
          border-color: #93C5FD;
          background: #F8FAFC;
        }

        .fp-preset-card.active {
          border-color: #1D4ED8;
          background: #EFF6FF;
          box-shadow: 0 4px 12px rgba(29, 78, 216, 0.12);
        }

        .fp-preset-title {
          font-size: 14.5px;
          font-weight: 800;
          color: #0F172A;
          margin-bottom: 4px;
        }

        .fp-preset-desc {
          font-size: 12px;
          color: #64748B;
        }

        .fp-preset-pill {
          display: inline-block;
          font-size: 10.5px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 6px;
          background: #DBEAFE;
          color: #1E40AF;
          margin-bottom: 8px;
        }

        /* ── Live Simulation Box ── */
        .fp-sim-box {
          background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
          border: 1px solid #BBF7D0;
          border-radius: 14px;
          padding: 18px 22px;
          margin-top: 20px;
        }

        .fp-sim-head {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          font-weight: 800;
          color: #166534;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 10px;
        }

        .fp-sim-steps {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .fp-sim-step {
          background: #FFFFFF;
          border: 1px solid #86EFAC;
          border-radius: 10px;
          padding: 10px 16px;
          flex: 1;
          min-width: 140px;
        }

        .fp-sim-step-title {
          font-size: 11px;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
        }

        .fp-sim-step-val {
          font-size: 17px;
          font-weight: 900;
          color: #047857;
          margin-top: 2px;
        }

        /* ── Forms ── */
        .fp-form-label {
          font-size: 13px;
          font-weight: 700;
          color: #1E293B;
          margin-bottom: 6px;
          display: block;
        }

        .fp-input, .fp-select, .fp-textarea {
          width: 100%;
          border: 1.5px solid #CBD5E1;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 14px;
          font-weight: 600;
          color: #0F172A;
          background: #FFFFFF;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .fp-input:focus, .fp-select:focus, .fp-textarea:focus {
          border-color: #1D4ED8;
          box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.12);
        }

        .fp-help {
          font-size: 12px;
          color: #64748B;
          margin-top: 5px;
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Fee Policy & Installments" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main fp-main">
            {loading && <Loader message="Loading Fee Policy..." />}

            <div className="fp-shell">
              {/* ── Top Hero ── */}
              <div className="fp-hero">
                <div className="fp-hero-glow" />
                <div className="fp-hero-inner">
                  <div>
                    <div className="fp-badge">
                      <i className="bi bi-shield-check" /> Bursar & Financial Management
                    </div>
                    <h1 className="fp-title">Fee Policy & Installments</h1>
                    <p className="fp-sub">
                      Control how students pay their fees. Set installment requirements (e.g. 70% 1st payment / 30% 2nd payment) to prevent debt, and enforce exam & result gates.
                    </p>
                  </div>

                  <button className="fp-btn-save" onClick={handleSave} disabled={saving || loading}>
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm" /> Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2-circle" style={{ fontSize: 18 }} /> Save Policy Settings
                      </>
                    )}
                  </button>
                </div>
              </div>

              {!loading && (
                <>
                  {/* ── CARD 1: Installment Payment & Debt Prevention ── */}
                  <div className="fp-card">
                    <div className="fp-card-header">
                      <div style={{ display: "flex", gap: 14 }}>
                        <div className="fp-card-ico" style={{ background: "#FEF3C7", color: "#D97706" }}>
                          <i className="bi bi-pie-chart-fill" />
                        </div>
                        <div>
                          <h2 className="fp-card-title">Installment Payment Schedule (Debt Control)</h2>
                          <p className="fp-card-desc">
                            Enforce structured partial payments so parents cannot pay less than your approved threshold per term.
                          </p>
                        </div>
                      </div>

                      <div className="form-check form-switch m-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          style={{ width: 44, height: 22, cursor: "pointer" }}
                          checked={policy.installment_enabled}
                          onChange={(e) => setPolicy((p) => ({ ...p, installment_enabled: e.target.checked }))}
                        />
                      </div>
                    </div>

                    {policy.installment_enabled ? (
                      <div>
                        <label className="fp-form-label">Select Approved Payment Schedule for Terms</label>
                        <div className="fp-presets-grid">
                          <div
                            className={`fp-preset-card ${policy.installment_type === "two_installments_70_30" ? "active" : ""}`}
                            onClick={() => handleSelectSchedule("two_installments_70_30")}
                          >
                            <span className="fp-preset-pill">Recommended</span>
                            <div className="fp-preset-title">70% / 30% Split</div>
                            <div className="fp-preset-desc">70% initial installment, 30% balance before exam.</div>
                          </div>

                          <div
                            className={`fp-preset-card ${policy.installment_type === "two_installments_50_50" ? "active" : ""}`}
                            onClick={() => handleSelectSchedule("two_installments_50_50")}
                          >
                            <span className="fp-preset-pill" style={{ background: "#E0E7FF", color: "#3730A3" }}>2 Equal Halves</span>
                            <div className="fp-preset-title">50% / 50% Split</div>
                            <div className="fp-preset-desc">Pay half at resumption, remaining half at mid-term.</div>
                          </div>

                          <div
                            className={`fp-preset-card ${policy.installment_type === "three_installments_40_30_30" ? "active" : ""}`}
                            onClick={() => handleSelectSchedule("three_installments_40_30_30")}
                          >
                            <span className="fp-preset-pill" style={{ background: "#F3E8FF", color: "#6B21A8" }}>3 Installments</span>
                            <div className="fp-preset-title">40% / 30% / 30%</div>
                            <div className="fp-preset-desc">Flexible three-part payment structure.</div>
                          </div>

                          <div
                            className={`fp-preset-card ${policy.installment_type === "full_only" ? "active" : ""}`}
                            onClick={() => handleSelectSchedule("full_only")}
                          >
                            <span className="fp-preset-pill" style={{ background: "#FEE2E2", color: "#991B1B" }}>Strict 100%</span>
                            <div className="fp-preset-title">Full Payment Only</div>
                            <div className="fp-preset-desc">No partial payments allowed. 100% required upfront.</div>
                          </div>

                          <div
                            className={`fp-preset-card ${policy.installment_type === "custom" ? "active" : ""}`}
                            onClick={() => handleSelectSchedule("custom")}
                          >
                            <span className="fp-preset-pill" style={{ background: "#FEF9C3", color: "#854D0E" }}>Custom</span>
                            <div className="fp-preset-title">Custom Percentage</div>
                            <div className="fp-preset-desc">Define your own custom initial payment minimum %.</div>
                          </div>
                        </div>

                        {policy.installment_type === "custom" && (
                          <div style={{ marginTop: 18, maxWidth: 300 }}>
                            <label className="fp-form-label">Custom Minimum Initial Payment (%)</label>
                            <div className="input-group">
                              <input
                                type="number"
                                className="form-control"
                                min={1}
                                max={100}
                                value={policy.min_initial_installment_percent}
                                onChange={(e) =>
                                  setPolicy((p) => ({
                                    ...p,
                                    min_initial_installment_percent: clampInt(e.target.value, 1, 100, 70),
                                  }))
                                }
                              />
                              <span className="input-group-text">%</span>
                            </div>
                            <div className="fp-help">Enter the minimum percentage parents must pay on 1st installment.</div>
                          </div>
                        )}

                        {/* Live Simulation Preview */}
                        <div className="fp-sim-box">
                          <div className="fp-sim-head">
                            <i className="bi bi-lightning-charge-fill" /> Live Calculation Preview (Example on ₦30,000 School Fee)
                          </div>
                          <div className="fp-sim-steps">
                            <div className="fp-sim-step">
                              <div className="fp-sim-step-title">Total Term Tuition</div>
                              <div className="fp-sim-step-val" style={{ color: "#0F172A" }}>₦30,000</div>
                            </div>
                            <div className="fp-sim-step">
                              <div className="fp-sim-step-title">1st Payment Required ({policy.min_initial_installment_percent}%)</div>
                              <div className="fp-sim-step-val">₦{initialReq.toLocaleString()}</div>
                            </div>
                            <div className="fp-sim-step">
                              <div className="fp-sim-step-title">Remaining Balance (2nd Installment)</div>
                              <div className="fp-sim-step-val" style={{ color: "#2563EB" }}>₦{balanceReq.toLocaleString()}</div>
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: 20 }}>
                          <label className="fp-form-label">Warning Message Shown to Parents (if payment is below threshold)</label>
                          <textarea
                            className="fp-textarea"
                            rows={2}
                            value={policy.installment_message}
                            onChange={(e) => setPolicy((p) => ({ ...p, installment_message: e.target.value }))}
                            placeholder="This school requires a minimum initial payment of :percent% (:amount) for the term."
                          />
                          <div className="fp-help">
                            Use <code>:percent</code> and <code>:amount</code> as automatic placeholders.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: "16px 20px", background: "#F1F5F9", borderRadius: 12, fontSize: 13.5, color: "#475569" }}>
                        <i className="bi bi-info-circle me-2" />
                        Installment control is currently <strong>disabled</strong>. Parents can enter and pay any random partial amount.
                      </div>
                    )}
                  </div>

                  {/* ── CARD 2: Result Viewing Access Control ── */}
                  <div className="fp-card">
                    <div className="fp-card-header">
                      <div style={{ display: "flex", gap: 14 }}>
                        <div className="fp-card-ico" style={{ background: "#DCFCE7", color: "#166534" }}>
                          <i className="bi bi-file-earmark-bar-graph-fill" />
                        </div>
                        <div>
                          <h2 className="fp-card-title">Student Result & Report Card Gate</h2>
                          <p className="fp-card-desc">
                            Block parents and students from viewing or downloading terminal report cards until fee requirements are satisfied.
                          </p>
                        </div>
                      </div>

                      <div className="form-check form-switch m-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          style={{ width: 44, height: 22, cursor: "pointer" }}
                          checked={policy.result_access_enabled}
                          onChange={(e) => setPolicy((p) => ({ ...p, result_access_enabled: e.target.checked }))}
                        />
                      </div>
                    </div>

                    {policy.result_access_enabled && (
                      <div className="row g-3">
                        <div className="col-12 col-md-6">
                          <label className="fp-form-label">Minimum Payment Required to View Results</label>
                          <div className="input-group">
                            <input
                              type="number"
                              className="form-control"
                              min={0}
                              max={100}
                              value={policy.result_min_payment_percent}
                              onChange={(e) =>
                                setPolicy((p) => ({
                                  ...p,
                                  result_min_payment_percent: clampInt(e.target.value, 0, 100, 100),
                                }))
                              }
                            />
                            <span className="input-group-text">%</span>
                          </div>
                          <div className="fp-help">Set to 100% to demand complete settlement before result viewing.</div>
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="fp-form-label">Fees Scope to Check</label>
                          <select
                            className="fp-select"
                            value={policy.result_scope}
                            onChange={(e) =>
                              setPolicy((p) => ({
                                ...p,
                                result_scope: e.target.value === "all_outstanding" ? "all_outstanding" : "selected_period",
                              }))
                            }
                          >
                            <option value="selected_period">Only Current Term Fees</option>
                            <option value="all_outstanding">All Outstanding Historical Arrears</option>
                          </select>
                          <div className="fp-help">Choose whether older session arrears also block result viewing.</div>
                        </div>

                        <div className="col-12">
                          <label className="fp-form-label">Result Lock Message Shown to Parents</label>
                          <textarea
                            className="fp-textarea"
                            rows={2}
                            value={policy.message}
                            onChange={(e) => setPolicy((p) => ({ ...p, message: e.target.value }))}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── CARD 3: CBT Exam Access Control ── */}
                  <div className="fp-card">
                    <div className="fp-card-header">
                      <div style={{ display: "flex", gap: 14 }}>
                        <div className="fp-card-ico" style={{ background: "#EDE9FE", color: "#6D28D9" }}>
                          <i className="bi bi-laptop-fill" />
                        </div>
                        <div>
                          <h2 className="fp-card-title">CBT Exam Room Gatekeeper</h2>
                          <p className="fp-card-desc">
                            Prevent students with unpaid school fees from launching and taking online CBT examinations.
                          </p>
                        </div>
                      </div>

                      <div className="form-check form-switch m-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          style={{ width: 44, height: 22, cursor: "pointer" }}
                          checked={policy.cbt_access_enabled}
                          onChange={(e) => setPolicy((p) => ({ ...p, cbt_access_enabled: e.target.checked }))}
                        />
                      </div>
                    </div>

                    {policy.cbt_access_enabled && (
                      <div className="row g-3">
                        <div className="col-12 col-md-6">
                          <label className="fp-form-label">Minimum Payment Required for CBT</label>
                          <div className="input-group">
                            <input
                              type="number"
                              className="form-control"
                              min={0}
                              max={100}
                              value={policy.cbt_min_payment_percent}
                              onChange={(e) =>
                                setPolicy((p) => ({
                                  ...p,
                                  cbt_min_payment_percent: clampInt(e.target.value, 0, 100, 100),
                                }))
                              }
                            />
                            <span className="input-group-text">%</span>
                          </div>
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="fp-form-label">CBT Fees Scope to Check</label>
                          <select
                            className="fp-select"
                            value={policy.cbt_scope}
                            onChange={(e) =>
                              setPolicy((p) => ({
                                ...p,
                                cbt_scope: e.target.value === "all_outstanding" ? "all_outstanding" : "selected_period",
                              }))
                            }
                          >
                            <option value="selected_period">Only Current Term Fees</option>
                            <option value="all_outstanding">All Outstanding Historical Arrears</option>
                          </select>
                        </div>

                        <div className="col-12">
                          <label className="fp-form-label">CBT Block Message Shown on Exam Screen</label>
                          <textarea
                            className="fp-textarea"
                            rows={2}
                            value={policy.cbt_message}
                            onChange={(e) => setPolicy((p) => ({ ...p, cbt_message: e.target.value }))}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── CARD 4: Bank Processing Charge & Platform Fee Allocation ── */}
                  <div className="fp-card">
                    <div className="fp-card-header">
                      <div style={{ display: "flex", gap: 14 }}>
                        <div className="fp-card-ico" style={{ background: "#EFF6FF", color: "#1D4ED8" }}>
                          <i className="bi bi-bank2" />
                        </div>
                        <div>
                          <h2 className="fp-card-title">Bank Processing Charge & Platform Fee Allocation</h2>
                          <p className="fp-card-desc">
                            Control who pays bank processing charges and the SchoolProfit electronic platform access fee (Parent vs. School).
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="row g-4">
                      {/* Bank Processing Charge Bearer */}
                      <div className="col-12 col-md-6">
                        <label className="fp-form-label">
                          <i className="bi bi-bank me-1 text-primary" /> Bank Processing Charge Bearer
                        </label>
                        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                          <button
                            type="button"
                            className={`fp-preset-card ${policy.bank_charge_bearer === "parent" ? "active" : ""}`}
                            style={{ flex: 1, padding: "12px 14px", cursor: "pointer", textAlign: "left" }}
                            onClick={() => setPolicy((p) => ({ ...p, bank_charge_bearer: "parent" }))}
                          >
                            <span className="fp-preset-pill">Recommended</span>
                            <div className="fp-preset-title" style={{ fontSize: 13 }}>Parent Pays (Surcharge)</div>
                            <div className="fp-preset-desc" style={{ fontSize: 11.5 }}>
                              Bank fee added to parent checkout. School receives 100% tuition.
                            </div>
                          </button>

                          <button
                            type="button"
                            className={`fp-preset-card ${policy.bank_charge_bearer === "school" ? "active" : ""}`}
                            style={{ flex: 1, padding: "12px 14px", cursor: "pointer", textAlign: "left" }}
                            onClick={() => setPolicy((p) => ({ ...p, bank_charge_bearer: "school" }))}
                          >
                            <span className="fp-preset-pill" style={{ background: "#F1F5F9", color: "#475569" }}>Absorbed</span>
                            <div className="fp-preset-title" style={{ fontSize: 13 }}>School Pays (Absorbed)</div>
                            <div className="fp-preset-desc" style={{ fontSize: 11.5 }}>
                              School absorbs the bank fee. Parent pays only exact tuition.
                            </div>
                          </button>
                        </div>

                        <label className="fp-form-label">Bank Processing Charge Amount (₦)</label>
                        <div className="input-group">
                          <span className="input-group-text">₦</span>
                          <input
                            type="number"
                            className="form-control"
                            min={0}
                            value={policy.bank_charge_amount ?? 200}
                            onChange={(e) =>
                              setPolicy((p) => ({
                                ...p,
                                bank_charge_amount: Math.max(0, Number(e.target.value || 0)),
                              }))
                            }
                          />
                        </div>
                        <div className="fp-help">Interbank NIP transfer & virtual account processing fee (Default: ₦200).</div>
                      </div>

                      {/* SchoolProfit Platform Fee Bearer */}
                      <div className="col-12 col-md-6">
                        <label className="fp-form-label">
                          <i className="bi bi-cpu me-1 text-primary" /> SchoolProfit Platform Fee Bearer (₦500 / term)
                        </label>
                        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                          <button
                            type="button"
                            className={`fp-preset-card ${policy.platform_fee_bearer === "school" ? "active" : ""}`}
                            style={{ flex: 1, padding: "12px 14px", cursor: "pointer", textAlign: "left" }}
                            onClick={() => setPolicy((p) => ({ ...p, platform_fee_bearer: "school" }))}
                          >
                            <span className="fp-preset-pill">Standard</span>
                            <div className="fp-preset-title" style={{ fontSize: 13 }}>School Pays (Deducted)</div>
                            <div className="fp-preset-desc" style={{ fontSize: 11.5 }}>
                              ₦500 is deducted from tuition settlement. Parents pay zero extra.
                            </div>
                          </button>

                          <button
                            type="button"
                            className={`fp-preset-card ${policy.platform_fee_bearer === "parent" ? "active" : ""}`}
                            style={{ flex: 1, padding: "12px 14px", cursor: "pointer", textAlign: "left" }}
                            onClick={() => setPolicy((p) => ({ ...p, platform_fee_bearer: "parent" }))}
                          >
                            <span className="fp-preset-pill" style={{ background: "#DBEAFE", color: "#1D4ED8" }}>Surcharge</span>
                            <div className="fp-preset-title" style={{ fontSize: 13 }}>Parent Pays (Added)</div>
                            <div className="fp-preset-desc" style={{ fontSize: 11.5 }}>
                              ₦500 is added to parent checkout as electronic portal access fee.
                            </div>
                          </button>
                        </div>

                        <div style={{ padding: "12px 16px", background: "#F8FAFC", borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12.5, color: "#475569" }}>
                          <i className="bi bi-info-circle me-1 text-primary" />
                          Platform access fee is only charged once per student per academic term.
                        </div>
                      </div>
                    </div>

                    {/* Live Fee Settlement Simulator */}
                    <div className="fp-sim-box" style={{ marginTop: 22 }}>
                      <div className="fp-sim-head">
                        <i className="bi bi-calculator-fill" /> Live Settlement Simulation (Example on ₦30,000 School Fee)
                      </div>
                      <div className="fp-sim-steps">
                        <div className="fp-sim-step">
                          <div className="fp-sim-step-title">School Fee (Tuition)</div>
                          <div className="fp-sim-step-val" style={{ color: "#0F172A" }}>₦30,000</div>
                        </div>
                        <div className="fp-sim-step">
                          <div className="fp-sim-step-title">Parent Checkout Total</div>
                          <div className="fp-sim-step-val" style={{ color: "#047857" }}>
                            ₦{(
                              30000 +
                              (policy.bank_charge_bearer === "parent" ? (policy.bank_charge_amount || 200) : 0) +
                              (policy.platform_fee_bearer === "parent" ? 500 : 0)
                            ).toLocaleString()}
                          </div>
                        </div>
                        <div className="fp-sim-step">
                          <div className="fp-sim-step-title">School Net Bank Payout</div>
                          <div className="fp-sim-step-val" style={{ color: "#2563EB" }}>
                            ₦{(
                              30000 -
                              (policy.bank_charge_bearer === "school" ? (policy.bank_charge_amount || 200) : 0) -
                              (policy.platform_fee_bearer === "school" ? 500 : 0)
                            ).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Save Bar */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
                    <button className="fp-btn-save" onClick={handleSave} disabled={saving} style={{ padding: "14px 32px", fontSize: 15 }}>
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm" /> Saving Policy...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check2-circle" style={{ fontSize: 20 }} /> Save All Policy Changes
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
      <Footer />
    </>
  );
}
