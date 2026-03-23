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

type Plan = {
  id: number;
  name: string;
  price: number;
  duration_in_days: number;
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
  if (s === "paystack") return "Paystack";
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

  const selectedPlan = useMemo(() => {
    const id = Number(selectedPlanId);
    return plans.find((p) => p.id === id) || null;
  }, [plans, selectedPlanId]);

  const referenceFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("reference");
  }, [location.search]);

  const subPill = useMemo(() => statusPillFrom(subDetails?.status), [subDetails?.status]);

  useEffect(() => {
    const fetchAll = async () => {
      setPageLoading(true);
      try {
        const [profileRes, detailsRes, plansRes] = await Promise.all([
          authApi.get("/subscription/user"),
          authApi.get("/user/subscription/details").catch(() => null),
          authApi.get("/subscription/plans"),
        ]);

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

        const fetchedPlans = Array.isArray(plansRes.data) ? plansRes.data : [];
        setPlans(fetchedPlans);

        const currentPlanName = detailsRes?.data?.subscription_type;
        if (currentPlanName && fetchedPlans.length) {
          const match = fetchedPlans.find((p: Plan) => p.name === currentPlanName);
          if (match) {
            setSelectedPlanId(String(match.id));
          }
        }
      } catch (err: any) {
        console.error(err);
        showError?.(err?.response?.data?.message || "Failed to load subscription checkout data.");
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

    setProcessing(true);

    try {
      if (paymentMethod === "wallet") {
        await updateRenewalSource("wallet");

        const res = await authApi.post("/payment/wallet-charge", {
          subscription_plan_id: selectedPlan.id,
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
                    Choose a plan and complete checkout securely. Paystack payments are one-time only, while wallet payments can optionally auto-renew.
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
                          Pay & Renew
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

                        return (
                          <div className="col-12 col-md-6" key={p.id}>
                            <div
                              className={`db-radio ${active ? "active" : ""}`}
                              role="button"
                              onClick={() => setSelectedPlanId(String(p.id))}
                              aria-pressed={active}
                              style={{ userSelect: "none" }}
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
                                </div>

                                {active ? (
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
                                  {fmtNaira(p.price)}
                                </div>
                                <div className="db-muted" style={{ fontSize: 12 }}>
                                  / {p.duration_in_days} days
                                </div>
                              </div>

                              <div
                                style={{
                                  marginTop: 12,
                                  paddingTop: 10,
                                  borderTop: "1px solid rgba(0,0,0,0.06)",
                                }}
                              >
                                <span className="db-muted" style={{ fontSize: 12 }}>
                                  <i className="bi bi-shield-lock-fill me-1" />
                                  Secure renewal
                                </span>
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
                              Confirm your <code>/subscription/plans</code> endpoint returns an array of plans.
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
                          {selectedPlan ? `${selectedPlan.duration_in_days} days` : "—"}
                        </span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 10 }}>
                        <span className="db-muted" style={{ fontSize: 12 }}>Amount</span>
                        <span className="db-strong" style={{ fontFamily: "Lora, serif", fontSize: 18 }}>
                          {selectedPlan ? fmtNaira(selectedPlan.price) : "—"}
                        </span>
                      </div>
                    </div>

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
                            Paystack
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
                          ? "Paystack payments are one-time only. Auto-renew is not available for card payments."
                          : "When enabled, wallet renewal will attempt to renew automatically from your wallet balance."}
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      {paymentMethod === "card" ? (
                        <div className="db-note">
                          <i className="bi bi-info-circle me-1" />
                          You will be redirected to Paystack to complete this payment. Future renewals will require a fresh payment.
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
                        disabled={processing || !selectedPlan}
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
                            {paymentMethod === "wallet" ? "Pay with Wallet" : "Pay with Paystack"}
                          </>
                        )}
                      </button>

                      <div className="db-muted" style={{ fontSize: 12, marginTop: 10 }}>
                        <i className="bi bi-info-circle me-1" />
                        {paymentMethod === "card"
                          ? "After Paystack payment, you’ll be redirected back for verification."
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