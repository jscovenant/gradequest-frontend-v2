// src/pages/Subscriptions/SubscriptionCheckoutPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";

type PromoInfo = {
  enabled?: boolean;
  applied?: boolean;
  title?: string;
  description?: string;
  target_plan?: string;
  min_students?: number;
  current_students?: number;
  has_min_students?: boolean;
  is_target_plan?: boolean;
  is_annual_billing?: boolean;
  bonus_days?: number;
  ends_at?: string | null;
  max_claims?: number | null;
  claims_count?: number;
  reason?: string;
};

type Plan = {
  id: number;
  is_active?: boolean | number;
  name: string;
  price: number;
  price_per_student?: number;
  active_students?: number;
  billable_students?: number;
  current_amount?: number;
  billing_interval?: string;
  limit_exceeded?: boolean;
  duration_in_days: number;
  max_students?: number | null;
  can_select?: boolean;
  disabled_reason?: string | null;
  subscription_action?: "purchase" | "renewal" | "upgrade";
  upgrade_credit_amount?: number;
  current_package_value?: number;
  used_value_amount?: number;
  payable_amount?: number | null;
  carried_days?: number;
  projected_expiry?: string | null;
  promo?: PromoInfo | null;
};

type SubDetails = {
  subscription_type: string;
  amount: number;
  status: string;
  auto_renew: boolean;
  start_date?: string | null;
  end_date?: string | null;
  duration?: number | null;
  auto_renew_source?: "wallet" | "paystack" | "card" | string;
  subscription_plan_id?: number | null;
  is_unexpired?: boolean;
  days_used?: number;
  days_remaining?: number;
  unused_value?: number;
  used_value?: number;
};

function fmtNaira(n: number) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(n);
  } catch {
    return `₦${Number(n || 0).toLocaleString()}`;
  }
}

function fmtDate(val?: string | null) {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusPillFrom(status?: string | null) {
  const s = (status || "").toLowerCase();
  if (!s) return { bg: "rgba(245,158,11,0.16)", fg: "#fbbf24", text: "NO SUBSCRIPTION" };
  if (s.includes("active")) return { bg: "rgba(34,197,94,0.16)", fg: "#22c55e", text: "ACTIVE" };
  if (s.includes("pending")) return { bg: "rgba(245,158,11,0.16)", fg: "#fbbf24", text: "PENDING" };
  if (s.includes("expired") || s.includes("inactive")) {
    return { bg: "rgba(148,163,184,0.14)", fg: "#94a3b8", text: "INACTIVE" };
  }
  return { bg: "rgba(0,0,0,0.04)", fg: "#7a6a5a", text: status || "UNKNOWN" };
}

function prettyRenewalSource(source?: string | null) {
  const s = (source || "").toLowerCase();
  if (!s) return "—";
  if (s === "wallet") return "Wallet";
  if (s === "paystack") return "Card / Online";
  if (s === "card") return "Card";
  return source || "—";
}

export default function CheckoutPage() {
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  const [userEmail, setUserEmail] = useState<string>("");
  const [subDetails, setSubDetails] = useState<SubDetails | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet">("card");
  const [autoRenew, setAutoRenew] = useState<boolean>(false);
  const [yearlyBilling, setYearlyBilling] = useState<boolean>(false);

  const selectedPlan = useMemo(() => {
    const id = Number(selectedPlanId);
    return plans.find((p) => p.id === id) || null;
  }, [plans, selectedPlanId]);

  // Yearly billing only makes sense for plans shorter than a year
  const yearlyEligible = !!selectedPlan && selectedPlan.duration_in_days > 0 && selectedPlan.duration_in_days < 365;

  // How many of the plan's billing cycles fit into ~365 days
  const yearlyCycles = useMemo(() => {
    if (!selectedPlan || !selectedPlan.duration_in_days) return 1;
    return Math.max(1, Math.floor(365 / selectedPlan.duration_in_days));
  }, [selectedPlan]);

  const billingCycles = yearlyBilling && yearlyEligible ? yearlyCycles : 1;

  const YEARLY_DISCOUNT_RATE = 0.1;

  const subtotal = useMemo(() => {
    if (!selectedPlan) return 0;
    return Number(selectedPlan.current_amount ?? selectedPlan.price ?? 0) * billingCycles;
  }, [selectedPlan, billingCycles]);

  const discountAmount = useMemo(() => {
    if (!yearlyBilling || !yearlyEligible) return 0;
    return subtotal * YEARLY_DISCOUNT_RATE;
  }, [subtotal, yearlyBilling, yearlyEligible]);

  const amountBeforeUpgradeCredit = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);
  const upgradeCredit = Number(selectedPlan?.upgrade_credit_amount || 0);
  const totalAmount = useMemo(
    () => Math.max(0, amountBeforeUpgradeCredit - upgradeCredit),
    [amountBeforeUpgradeCredit, upgradeCredit]
  );

  const promo = selectedPlan?.promo;
  const isPromoEligible = !!promo?.enabled && !!promo?.is_target_plan && (yearlyBilling || (selectedPlan?.duration_in_days || 0) >= 300);
  const isPromoQualified = isPromoEligible && !!promo?.has_min_students;
  const promoBonusDays = isPromoQualified ? (Number(promo?.bonus_days) || 365) : 0;

  const totalDurationDays = useMemo(() => {
    if (!selectedPlan) return 0;
    return selectedPlan.duration_in_days * billingCycles + Number(selectedPlan.carried_days || 0) + promoBonusDays;
  }, [selectedPlan, billingCycles, promoBonusDays]);

  const expiryDate = useMemo(() => {
    if (!totalDurationDays) return null;
    const d = new Date();
    d.setDate(d.getDate() + totalDurationDays);
    return d;
  }, [totalDurationDays]);

  const referenceFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("reference") || params.get("trxref");
  }, [location.search]);

  const planFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("plan");
  }, [location.search]);

  const subPill = useMemo(() => statusPillFrom(subDetails?.status), [subDetails?.status]);

  useEffect(() => {
    const fetchAll = async () => {
      setPageLoading(true);
      const [profileResult, detailsResult, plansResult] = await Promise.allSettled([
        authApi.get("/subscription/user"),
        authApi.get("/user/subscription/details"),
        authApi.get("/subscription/plans"),
      ]);

      const profileRes = profileResult.status === "fulfilled" ? profileResult.value : null;
      const detailsRes = detailsResult.status === "fulfilled" ? detailsResult.value : null;
      const plansRes = plansResult.status === "fulfilled" ? plansResult.value : null;
      const fetchedPlans = (Array.isArray(plansRes?.data) ? plansRes.data : [])
        .filter((plan: Plan) => plan.is_active === undefined || plan.is_active === true || Number(plan.is_active) === 1);

      // A successful plans response must never be cleared because optional
      // profile or current-subscription metadata is malformed/unavailable.
      setPlans(fetchedPlans);

      try {

        const email = profileRes?.data?.email || "";
        setUserEmail(email);

        if (detailsRes?.data) {
          setSubDetails(detailsRes.data);

          const currentRenewalSource = (detailsRes.data?.auto_renew_source || "").toLowerCase();
          if (currentRenewalSource === "wallet") {
            setPaymentMethod("wallet");
            setAutoRenew(Boolean(detailsRes.data?.auto_renew));
          } else {
            setPaymentMethod("card");
            setAutoRenew(false);
          }
        }

        if (planFromQuery && fetchedPlans.length) {
          const normalizedQueryPlan = planFromQuery.toLowerCase().replace(/[^a-z0-9]+/g, "");
          const queryMatch = fetchedPlans.find((p: Plan) => p.name.toLowerCase().replace(/[^a-z0-9]+/g, "") === normalizedQueryPlan);
          if (queryMatch?.can_select !== false) {
            setSelectedPlanId(String(queryMatch.id));
            return;
          }
        }

        const currentPlanName = detailsRes?.data?.subscription_type;
        if (currentPlanName && fetchedPlans.length) {
          const match = fetchedPlans.find((p: Plan) => p.name === currentPlanName);
          if (match?.can_select !== false) {
            setSelectedPlanId(String(match.id));
            return;
          }
        }

        const firstAvailable = fetchedPlans.find((p: Plan) => p.can_select !== false && !p.limit_exceeded);
        if (firstAvailable) setSelectedPlanId(String(firstAvailable.id));
      } catch (err: any) {
        console.error(err);
      } finally {
        setPageLoading(false);
      }
    };

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

 useEffect(() => {
  if (!referenceFromQuery) return;

  setProcessing(true);

  authApi
    .get(`/subscription/verify/${referenceFromQuery}`)
    .then(() => {
      showSuccess?.("Payment verified successfully.");
      navigate("/billing", { replace: true });
    })
    .catch((err) => {
      console.error(err);
      showError?.(err?.response?.data?.message || "Verification failed.");
    })
    .finally(() => {
      setProcessing(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [referenceFromQuery]);



  useEffect(() => {
    // Card/Paystack should never auto-renew now
    if (paymentMethod === "card" && autoRenew) {
      setAutoRenew(false);
    }
  }, [paymentMethod, autoRenew]);

  useEffect(() => {
    setYearlyBilling(false);
  }, [selectedPlanId]);

  const updateRenewalSource = async (source: "wallet" | "paystack") => {
    try {
      await authApi.post("/subscription/renewal-source", { source });
    } catch (err: any) {
      console.error(err);
      throw new Error(err?.response?.data?.message || "Failed to update renewal source.");
    }
  };



  const handlePay = async () => {
    if (!selectedPlan) {
      showError?.("Please select a plan.");
      return;
    }

    if (!userEmail) {
      showError?.("User email not found.");
      return;
    }

    if (selectedPlan.can_select === false) {
      showError?.(selectedPlan.disabled_reason || "This package cannot be selected while your current subscription is active.");
      return;
    }

    setProcessing(true);

    try {
      if (paymentMethod === "wallet") {
        await updateRenewalSource("wallet");

        const res = await authApi.post("/payment/wallet-charge", {
          subscription_plan_id: selectedPlan.id,
          cycles: billingCycles,
          auto_renew: autoRenew,
          auto_renew_source: "wallet",
        });

      if (res.data?.success || res.data?.status === "success") {
        showSuccess?.(res.data?.message || "Subscription successful via wallet.");
        navigate("/billing", { replace: true });
        return;
      }

        showError?.(res.data?.message || "Wallet charge failed.");
        return;
      }

      // Paystack/card: one-time payment only, no auto-renew
      await updateRenewalSource("paystack");

      const res = await authApi.post("/subscription/initialize", {
        plan_id: selectedPlan.id,
        cycles: billingCycles,
        email: userEmail,
      });

      const authUrl = res.data?.authorization_url;
      if (!authUrl) {
        showError?.("Paystack authorization URL not returned.");
        return;
      }

      window.location.href = authUrl;
    } catch (err: any) {
      console.error(err);
      showError?.(err?.response?.data?.message || err?.message || "Checkout failed.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <style>{`
        .db-main {
          background: var(--bs-body-bg, #f5f1eb);
          min-height: 100vh;
          font-family: "DM Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          padding: 28px 28px 0;
        }

        .db-hero {
          background: #0f172a;
          border-radius: var(--bs-border-radius-lg, 16px);
          padding: 32px 36px;
          position: relative;
          overflow: hidden;
          margin: 10px 0 18px;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .db-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
        }
        .db-hero-glow {
          position: absolute;
          top: -60px;
          right: -60px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(201,168,76,0.10) 0%, transparent 65%);
          pointer-events: none;
        }
        .db-hero-glow2 {
          position: absolute;
          bottom: -40px;
          left: 25%;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .db-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 32px;
          flex-wrap: wrap;
        }
        @media (min-width: 768px) {
          .db-hero-inner {
            flex-wrap: nowrap;
          }
        }

        .db-session-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #e8c97a;
          background: rgba(201,168,76,0.10);
          border: 1px solid rgba(201,168,76,0.22);
          border-radius: 100px;
          padding: 4px 12px;
          margin-bottom: 14px;
        }
        .db-session-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          animation: dbPulse 2s ease infinite;
        }
        @keyframes dbPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.5); }
        }

        .db-greeting {
          font-family: "Lora", Georgia, serif;
          font-size: clamp(22px, 2.5vw, 32px);
          font-weight: 700;
          color: #fff;
          line-height: 1.1;
          margin-bottom: 8px;
        }
        .db-greeting em {
          font-style: italic;
          color: #e8c97a;
        }

        .db-hero-sub {
          font-size: 13.5px;
          font-weight: 300;
          color: #94a3b8;
          line-height: 1.65;
          max-width: 560px;
          margin-bottom: 18px;
        }

        .db-hero-btns {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .db-btn-gold {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 20px;
          font-family: "DM Sans", sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
          background: #c9a84c;
          border: none;
          border-radius: var(--bs-border-radius, 8px);
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
          white-space: nowrap;
        }
        .db-btn-gold:hover {
          background: #e8c97a;
          transform: translateY(-1px);
        }
        .db-btn-gold:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .db-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 20px;
          font-family: "DM Sans", sans-serif;
          font-size: 13px;
          font-weight: 400;
          color: rgba(255,255,255,0.7);
          background: transparent;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: var(--bs-border-radius, 8px);
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
          white-space: nowrap;
        }
        .db-btn-outline:hover {
          background: rgba(255,255,255,0.06);
          color: #fff;
          border-color: rgba(255,255,255,0.28);
        }
        .db-btn-outline:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .db-hero-stat-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          backdrop-filter: blur(8px);
          border-radius: var(--bs-border-radius, 12px);
          padding: 20px 24px;
          min-width: 270px;
          margin-left: auto;
          align-self: flex-end;
        }
        .db-hero-stat-row {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .db-hero-stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }
        .db-hero-stat-label {
          font-size: 12px;
          font-weight: 300;
          color: #94a3b8;
        }
        .db-hero-stat-val {
          font-family: "Lora", serif;
          font-size: 18px;
          font-weight: 700;
          color: #fff;
        }
        .db-hero-stat-sep {
          height: 1px;
          background: rgba(255,255,255,0.06);
        }

        .db-panel {
          background: var(--bs-body-bg, #fff);
          border: 1px solid var(--bs-border-color, #ede8e0);
          border-radius: var(--bs-border-radius-lg, 14px);
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(15,23,42,0.04);
          margin-bottom: 18px;
        }

        .db-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 18px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          gap: 12px;
          flex-wrap: wrap;
        }

        .db-panel-title {
          font-family: "Lora", serif;
          font-size: 16px;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0;
        }

        .db-panel-sub {
          font-size: 11.5px;
          font-weight: 300;
          color: #9a8a7a;
          margin: 0;
        }

        .db-pill {
          display: inline-flex;
          align-items: center;
          font-size: 12px;
          font-weight: 800;
          padding: 6px 10px;
          border-radius: 999px;
          white-space: nowrap;
          border: 1px solid rgba(0,0,0,0.06);
        }

        .db-muted {
          color: #9a8a7a;
        }

        .db-strong {
          font-weight: 900;
          color: #1a1a2e;
        }

        .db-tile {
          background: #faf8f5;
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 14px;
          padding: 14px;
          height: 100%;
        }

        .db-radio {
          background: #fff;
          border: 1px solid #e5ddd3;
          border-radius: 12px;
          padding: 12px;
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
          height: 100%;
        }
        .db-radio:hover {
          transform: translateY(-1px);
        }
        .db-radio.active {
          border-color: rgba(201,168,76,0.55);
          box-shadow: 0 10px 22px rgba(201,168,76,0.18);
          background: rgba(201,168,76,0.06);
        }

        .db-method-btn {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid #e5ddd3;
          background: #fff;
          color: #1a1a2e;
          font-weight: 600;
          transition: all 0.18s ease;
          cursor: pointer;
        }
        .db-method-btn:hover {
          transform: translateY(-1px);
        }
        .db-method-btn.active {
          background: rgba(201,168,76,0.14);
          border-color: rgba(201,168,76,0.35);
          color: #6b4f00;
          box-shadow: 0 8px 18px rgba(201,168,76,0.12);
        }
        .db-method-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .db-pay-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          font-weight: 900;
        }

        .db-note {
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid rgba(59,130,246,0.16);
          background: rgba(59,130,246,0.06);
          color: #334155;
          font-size: 12.5px;
          line-height: 1.6;
        }

        @media (max-width: 991.98px) {
          .db-main {
            padding: 18px 14px 0;
          }
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Checkout" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {pageLoading && <Loader message="Loading checkout..." />}

            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Subscriptions — Checkout
                  </div>

                  <h1 className="db-greeting">
                    Renew <em>Subscription</em>
                  </h1>

                  <p className="db-hero-sub">
                    Choose a plan and complete checkout securely. Online card and transfer payments are processed through our 256-bit encrypted gateway, while wallet payments can optionally auto-renew.
                  </p>

                  <div className="db-hero-btns">
                    <button className="db-btn-gold" onClick={handlePay} disabled={processing || pageLoading}>
                      {processing ? (
                        <>
                          <span className="spinner-border spinner-border-sm" />
                          Processing…
                        </>
                      ) : (
                        <>
                          <i className="bi bi-lock-fill" />
                          Make Payment
                        </>
                      )}
                    </button>

                    <button
                      className="db-btn-outline"
                      onClick={() => navigate("/subscriptions/billing")}
                      disabled={processing}
                    >
                      <i className="bi bi-receipt-cutoff" />
                      Billing
                    </button>

                    <button
                      className="db-btn-outline"
                      onClick={() => navigate("/billing")}
                      disabled={processing}
                    >
                      <i className="bi bi-arrow-left" />
                      Back
                    </button>
                  </div>
                </div>

                <div className="db-hero-stat-card d-none d-md-block">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 16,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "#c9a84c",
                      }}
                    >
                      Current subscription
                    </span>
                    <i className="bi bi-shield-check" style={{ color: "#64748b" }} />
                  </div>

                  <div className="db-hero-stat-row">
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Plan</span>
                      <span className="db-hero-stat-val" style={{ fontSize: 14, fontFamily: "DM Sans" }}>
                        {subDetails?.subscription_type || "—"}
                      </span>
                    </div>

                    <div className="db-hero-stat-sep" />

                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Status</span>
                      <span className="db-pill" style={{ background: subPill.bg, color: subPill.fg }}>
                        {subPill.text}
                      </span>
                    </div>

                    <div className="db-hero-stat-sep" />

                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Ends</span>
                      <span className="db-hero-stat-val" style={{ fontSize: 14, fontFamily: "DM Sans" }}>
                        {fmtDate(subDetails?.end_date)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-12 col-lg-7">
                <div className="db-panel">
                  <div className="db-panel-head">
                    <div>
                      <p className="db-panel-title">Select plan</p>
                      <p className="db-panel-sub">Pick a plan and proceed to payment.</p>
                    </div>

                    <span className="db-pill" style={{ background: "rgba(0,0,0,0.04)", color: "#7a6a5a" }}>
                      {plans.length ? `${plans.length} plans` : "No plans"}
                    </span>
                  </div>

                  <div style={{ padding: 16 }}>
                    <div className="row g-3">
                      {plans.map((p) => {
                        const active = String(p.id) === selectedPlanId;
                        const disabled = p.can_select === false || !!p.limit_exceeded;

                        return (
                          <div className="col-12 col-md-6" key={p.id}>
                            <div
                              className={`db-radio ${active ? "active" : ""}`}
                              role="button"
                              onClick={() => !disabled && setSelectedPlanId(String(p.id))}
                              aria-pressed={active}
                              aria-disabled={disabled}
                              title={disabled ? (p.disabled_reason || "This plan cannot support the school's current students.") : ""}
                              style={{ userSelect: "none", opacity: disabled ? 0.55 : 1, cursor: disabled ? "not-allowed" : "pointer", filter: disabled ? "grayscale(0.35)" : "none" }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  gap: 10,
                                }}
                              >
                                <div>
                                  <div className="db-strong" style={{ fontWeight: 800 }}>
                                    {p.name}
                                  </div>
                                  <div className="db-muted" style={{ fontSize: 12, marginTop: 2 }}>
                                    {p.duration_in_days} days access
                                  </div>
                                  {p.promo?.enabled && p.promo?.is_target_plan && (
                                    <span className="db-pill mt-1 d-inline-block" style={{ background: "rgba(245,158,11,0.15)", color: "#b45309", border: "1px solid rgba(245,158,11,0.3)", fontSize: 10 }}>
                                      <i className="bi bi-gift-fill me-1" /> 2-for-1 Promo
                                    </span>
                                  )}
                                </div>

                                {disabled ? (
                                  <span className="db-pill" style={{ background: "rgba(239,68,68,0.10)", color: "#dc2626" }}>
                                    <i className="bi bi-lock-fill me-1" /> Unavailable
                                  </span>
                                ) : active ? (
                                  <span
                                    className="db-pill"
                                    style={{ background: "rgba(201,168,76,0.16)", color: "#c9a84c" }}
                                  >
                                    Selected
                                  </span>
                                ) : (
                                  <span className="db-pill" style={{ background: "rgba(0,0,0,0.04)", color: "#7a6a5a" }}>
                                    Choose
                                  </span>
                                )}
                              </div>

                              <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 8 }}>
                                <div
                                  style={{
                                    fontFamily: "Lora, serif",
                                    fontSize: 22,
                                    fontWeight: 900,
                                    color: "#1a1a2e",
                                  }}
                                >
                                {fmtNaira(Number(p.price_per_student ?? p.price ?? 0))}
                                </div>
                                <div className="db-muted" style={{ fontSize: 12 }}>
                                  per student / {p.billing_interval || `${p.duration_in_days} days`}
                                </div>
                              </div>

                              <div className="db-muted" style={{ fontSize: 12, marginTop: 4 }}>
                                {Number(p.billable_students ?? p.active_students ?? 0).toLocaleString()} billable students = {fmtNaira(Number(p.current_amount ?? 0))}
                              </div>

                              {disabled && (
                                <div style={{ marginTop: 10, padding: "9px 10px", borderRadius: 9, background: "rgba(239,68,68,0.07)", color: "#b91c1c", fontSize: 11.5 }}>
                                  {p.disabled_reason || "Your active student count exceeds this package limit."}
                                </div>
                              )}

                              {!disabled && p.subscription_action === "upgrade" && (
                                <div style={{ marginTop: 10, padding: "9px 10px", borderRadius: 9, background: "rgba(34,197,94,0.08)", color: "#166534", fontSize: 11.5 }}>
                                  Upgrade available: {Number(p.carried_days || 0)} remaining days and {fmtNaira(Number(p.upgrade_credit_amount || 0))} unused value will be carried forward.
                                </div>
                              )}

                              <div
                                style={{
                                  marginTop: 12,
                                  paddingTop: 10,
                                  borderTop: "1px solid rgba(0,0,0,0.06)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  flexWrap: "wrap",
                                  gap: 6,
                                }}
                              >
                                <span className="db-muted" style={{ fontSize: 12 }}>
                                  <i className="bi bi-shield-lock-fill me-1" />
                                  Secure renewal
                                </span>

                                {Number(p.max_students ?? 0) > 0 ? (
                                  <span
                                    className="db-pill"
                                    style={{ background: p.limit_exceeded ? "rgba(239,68,68,0.12)" : "rgba(15,23,42,0.05)", color: p.limit_exceeded ? "#dc2626" : "#1a1a2e" }}
                                  >
                                    <i className="bi bi-people-fill me-1" />
                                    Up to {p.max_students.toLocaleString()} students
                                  </span>
                                ) : (
                                  <span className="db-pill" style={{ background: "rgba(15,23,42,0.05)", color: "#1a1a2e" }}>
                                    <i className="bi bi-infinity me-1" />
                                    Unlimited students
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {!plans.length && !pageLoading && (
                        <div className="col-12">
                          <div
                            style={{
                              padding: 18,
                              borderRadius: 14,
                              background: "#faf8f5",
                              border: "1px solid rgba(0,0,0,0.06)",
                            }}
                          >
                            <div className="db-strong">No plans available</div>
                            <div className="db-muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                              There are currently no active subscription plans. Please check again later or contact SchoolProfit Support.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-lg-5">
                <div className="db-panel">
                  <div className="db-panel-head">
                    <div>
                      <p className="db-panel-title">Checkout summary</p>
                      <p className="db-panel-sub">Review and pay securely.</p>
                    </div>

                    <span className="db-pill" style={{ background: subPill.bg, color: subPill.fg }}>
                      {subPill.text}
                    </span>
                  </div>

                  <div style={{ padding: 16 }}>
                    <div className="db-tile">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <span className="db-muted" style={{ fontSize: 12 }}>Email</span>
                        <span className="db-strong" style={{ fontWeight: 800 }}>{userEmail || "—"}</span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 10 }}>
                        <span className="db-muted" style={{ fontSize: 12 }}>Plan</span>
                        <span className="db-strong" style={{ fontWeight: 800 }}>
                          {selectedPlan?.name || "Select a plan"}
                        </span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 10 }}>
                        <span className="db-muted" style={{ fontSize: 12 }}>Duration</span>
                        <span className="db-strong" style={{ fontWeight: 800 }}>
                          {selectedPlan
                            ? `${totalDurationDays} days${promoBonusDays > 0 ? ` (${selectedPlan.duration_in_days * billingCycles} paid + ${promoBonusDays} Promo Bonus Free)` : Number(selectedPlan.carried_days || 0) > 0 ? ` (${selectedPlan.duration_in_days * billingCycles} new + ${selectedPlan.carried_days} carried)` : yearlyBilling && yearlyEligible ? ` (${billingCycles} cycles)` : ""}`
                            : "—"}
                        </span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 10 }}>
                        <span className="db-muted" style={{ fontSize: 12 }}>Max students</span>
                        <span className="db-strong" style={{ fontWeight: 800 }}>
                          {selectedPlan?.max_students ? selectedPlan.max_students.toLocaleString() : "—"}
                        </span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 10 }}>
                        <span className="db-muted" style={{ fontSize: 12 }}>Billable students</span>
                        <span className="db-strong" style={{ fontWeight: 800 }}>
                          {Number(selectedPlan?.billable_students ?? selectedPlan?.active_students ?? 0).toLocaleString()}
                        </span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 10 }}>
                        <span className="db-muted" style={{ fontSize: 12 }}>Price per student</span>
                        <span className="db-strong" style={{ fontWeight: 800 }}>
                          {selectedPlan ? fmtNaira(Number(selectedPlan.price_per_student ?? selectedPlan.price ?? 0)) : "—"}
                        </span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 10 }}>
                        <span className="db-muted" style={{ fontSize: 12 }}>Expires on</span>
                        <span className="db-strong" style={{ fontWeight: 800 }}>
                          {expiryDate ? fmtDate(expiryDate.toISOString()) : "—"}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          marginTop: 10,
                          paddingTop: 10,
                          borderTop: "1px solid rgba(0,0,0,0.06)",
                        }}
                      >
                        <span className="db-muted" style={{ fontSize: 12 }}>Amount</span>
                        <span style={{ textAlign: "right" }}>
                          {(discountAmount > 0 || upgradeCredit > 0) && (
                            <div className="db-muted" style={{ fontSize: 11.5, textDecoration: "line-through" }}>
                              {fmtNaira(amountBeforeUpgradeCredit)}
                            </div>
                          )}
                          <span className="db-strong" style={{ fontFamily: "Lora, serif", fontSize: 18 }}>
                            {selectedPlan ? fmtNaira(totalAmount) : "—"}
                          </span>
                        </span>
                      </div>

                      {discountAmount > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 6 }}>
                          <span className="db-muted" style={{ fontSize: 12 }}>Yearly discount (10%)</span>
                          <span style={{ fontWeight: 800, color: "#16a34a", fontSize: 12.5 }}>
                            − {fmtNaira(discountAmount)}
                          </span>
                        </div>
                      )}

                      {upgradeCredit > 0 && (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 6 }}>
                            <span className="db-muted" style={{ fontSize: 12 }}>Unused current-plan value</span>
                            <span style={{ fontWeight: 800, color: "#16a34a", fontSize: 12.5 }}>− {fmtNaira(upgradeCredit)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 6 }}>
                            <span className="db-muted" style={{ fontSize: 12 }}>Remaining days carried forward</span>
                            <span className="db-strong" style={{ fontSize: 12.5 }}>+ {Number(selectedPlan?.carried_days || 0)} days</span>
                          </div>
                          <div className="db-note" style={{ marginTop: 10 }}>
                            Current package used: {Number(subDetails?.days_used || 0)} days ({fmtNaira(Number(selectedPlan?.used_value_amount ?? subDetails?.used_value ?? 0))}). Remaining: {Number(subDetails?.days_remaining || 0)} days ({fmtNaira(upgradeCredit)}). You pay the higher package price minus the unused value; your remaining days are added to its duration.
                          </div>
                        </>
                      )}

                      {isPromoQualified && (
                        <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 12, background: "linear-gradient(135deg, rgba(255,200,87,0.18) 0%, rgba(245,158,11,0.08) 100%)", border: "1px solid rgba(245,158,11,0.3)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#92400e", fontWeight: 800, fontSize: 13 }}>
                            <i className="bi bi-gift-fill" /> {promo?.title || "🎉 2-for-1 Launch Promo Applied!"}
                          </div>
                          <div style={{ fontSize: 12, color: "#78350f", marginTop: 4, lineHeight: 1.5 }}>
                            You are paying for 1 Year and receiving <strong>+{promoBonusDays} Bonus Days FREE</strong> (2 Full Years Total Access).
                          </div>
                          <div style={{ fontSize: 11.5, color: "#16a34a", marginTop: 6, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                            <i className="bi bi-shield-check" /> ₦0 Platform Software Fee on School Fees for 2 Full Years
                          </div>
                        </div>
                      )}

                      {isPromoEligible && !isPromoQualified && (
                        <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 12, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#4338ca", fontWeight: 800, fontSize: 12.5 }}>
                            <i className="bi bi-stars" /> {promo?.title || "Buy 1 Year, Get +1 Year Free Promo"}
                          </div>
                          <div style={{ fontSize: 12, color: "#3730a3", marginTop: 4, lineHeight: 1.5 }}>
                            This promo requires at least <strong>{promo?.min_students} active students</strong>. Your school currently has <strong>{promo?.current_students || 0} active students</strong>. Enroll {Math.max(1, (promo?.min_students || 100) - (promo?.current_students || 0))} more students to unlock 1 Year Free!
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedPlan && yearlyEligible && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: 14,
                          borderRadius: 14,
                          border: "1px solid rgba(0,0,0,0.06)",
                          background: "#fff",
                        }}
                      >
                        <div className="form-check form-switch" style={{ marginBottom: 0 }}>
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={yearlyBilling}
                            onChange={(e) => setYearlyBilling(e.target.checked)}
                            id="yearlyBillingSwitch"
                            disabled={processing}
                          />
                          <label className="form-check-label fw-semibold" htmlFor="yearlyBillingSwitch">
                            Pay for a full year <span style={{ color: "#16a34a" }}>(save 10%)</span>
                          </label>
                        </div>

                        <div className="db-muted" style={{ fontSize: 12, marginTop: 6 }}>
                          {yearlyBilling
                            ? `Covers ${yearlyCycles} × ${selectedPlan.duration_in_days}-day cycles (${totalDurationDays} days). ${fmtNaira(subtotal)} − 10% (${fmtNaira(discountAmount)}) = ${fmtNaira(totalAmount)}.`
                            : `Switch on to cover ${yearlyCycles} cycles upfront (${selectedPlan.duration_in_days * yearlyCycles} days) and get 10% off, instead of renewing every ${selectedPlan.duration_in_days} days.`}
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: 14 }}>
                      <label className="form-label fw-semibold small mb-2">Payment method</label>

                      <div className="row g-2">
                        <div className="col-6">
                          <button
                            type="button"
                            className={`db-method-btn ${paymentMethod === "card" ? "active" : ""}`}
                            onClick={() => setPaymentMethod("card")}
                            disabled={processing}
                          >
                            <i className="bi bi-credit-card" />
                            Card / Bank
                          </button>
                        </div>

                        <div className="col-6">
                          <button
                            type="button"
                            className={`db-method-btn ${paymentMethod === "wallet" ? "active" : ""}`}
                            onClick={() => setPaymentMethod("wallet")}
                            disabled={processing}
                          >
                            <i className="bi bi-wallet2" />
                            Wallet
                          </button>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        padding: 14,
                        borderRadius: 14,
                        border: "1px solid rgba(0,0,0,0.06)",
                        background: "#fff",
                      }}
                    >
                      <div className="form-check form-switch" style={{ marginBottom: 0 }}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={paymentMethod === "wallet" ? autoRenew : false}
                          onChange={(e) => setAutoRenew(e.target.checked)}
                          id="autoRenewSwitch"
                          disabled={processing || paymentMethod !== "wallet"}
                        />
                        <label className="form-check-label fw-semibold" htmlFor="autoRenewSwitch">
                          Enable auto-renew
                        </label>
                      </div>

                      <div className="db-muted" style={{ fontSize: 12, marginTop: 6 }}>
                        {paymentMethod === "card"
                          ? "Online card and bank payments are one-time only. Auto-renew is not available for card payments."
                          : "When enabled, wallet renewal will attempt to renew automatically from your wallet balance."}
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      {paymentMethod === "card" ? (
                        <div className="db-note">
                          <i className="bi bi-info-circle me-1" />
                          You will be redirected to the secure 256-bit encrypted checkout to complete this payment.
                        </div>
                      ) : (
                        <div className="db-note">
                          <i className="bi bi-info-circle me-1" />
                          Wallet payment is processed inside your account. Auto-renew only applies when wallet is selected.
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <button
                        className="db-btn-gold db-pay-btn"
                        onClick={handlePay}
                        disabled={processing || !selectedPlan || selectedPlan.can_select === false || !!selectedPlan.limit_exceeded}
                        title={!selectedPlan ? "Select a plan first" : ""}
                      >
                        {processing ? (
                          <>
                            <span className="spinner-border spinner-border-sm" />
                            Processing…
                          </>
                        ) : (
                          <>
                            <i className="bi bi-lock-fill" />
                            {paymentMethod === "wallet"
                              ? `Pay ${selectedPlan ? fmtNaira(totalAmount) : ""} with Wallet`
                              : `Make Payment ${selectedPlan ? fmtNaira(totalAmount) : ""}`}
                          </>
                        )}
                      </button>

                      <div className="db-muted" style={{ fontSize: 12, marginTop: 10 }}>
                        <i className="bi bi-shield-check me-1" />
                        {paymentMethod === "card"
                          ? "After completing payment, you will be redirected back for instant verification."
                          : "Wallet payment updates your subscription immediately after successful debit."}
                      </div>
                    </div>

                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                      <div
                        className="db-strong"
                        style={{ fontFamily: "Lora, serif", fontSize: 14, marginBottom: 10 }}
                      >
                        Current subscription
                      </div>

                      <div className="row g-3">
                        {[
                          { k: "Plan", v: subDetails?.subscription_type || "—" },
                          { k: "Status", v: subDetails?.status || "—" },
                          { k: "End Date", v: fmtDate(subDetails?.end_date) },
                          { k: "Auto Renew", v: subDetails?.auto_renew ? "Enabled" : "Disabled" },
                          { k: "Renewal Source", v: prettyRenewalSource(subDetails?.auto_renew_source) },
                        ].map((it) => (
                          <div className="col-12 col-md-6" key={it.k}>
                            <div className="db-tile">
                              <div className="db-muted" style={{ fontSize: 12 }}>{it.k}</div>
                              <div className="db-strong" style={{ marginTop: 6 }}>{it.v}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
