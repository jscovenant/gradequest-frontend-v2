// src/pages/Wallet/WalletPage.tsx
import { useEffect, useMemo, useState } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";

type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: number; // in Naira
};

type WalletTx = {
  id: number;
  type: "credit" | "debit" | string;
  amount: number;
  description?: string | null;
  reference_id?: string | null;
  created_at?: string | null;
};

type Pagination<T> = {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
};

type TransactionsResponse = {
  transactions: Pagination<WalletTx>;
};

function fmtNaira(n: number) {
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(n);
  } catch {
    return `₦${Number(n || 0).toLocaleString()}`;
  }
}

function fmtDate(val?: string | null) {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function txPill(type: string) {
  const t = (type || "").toLowerCase();
  if (t === "credit") return { bg: "rgba(34,197,94,0.14)", fg: "#22c55e", text: "CREDIT" };
  if (t === "debit") return { bg: "rgba(239,68,68,0.14)", fg: "#ef4444", text: "DEBIT" };
  return { bg: "rgba(148,163,184,0.14)", fg: "#94a3b8", text: (type || "OTHER").toUpperCase() };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export default function WalletPage() {
  const { showError, showSuccess } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Wallet
  const [balance, setBalance] = useState<number>(0);
  const [product, setProduct] = useState<Product | null>(null);
  const [bonusInfo, setBonusInfo] = useState<{
    has_bonus: boolean;
    amount: number;
    remaining_amount: number;
    is_activated: boolean;
    is_expired: boolean;
    expires_at: string | null;
    days_remaining: number;
  } | null>(null);

  // Topup form
  const [amount, setAmount] = useState<number>(5000);
  const [initLoading, setInitLoading] = useState(false);

  // Transactions
  const [txLoading, setTxLoading] = useState(false);
  const [q, setQ] = useState("");
  const [tx, setTx] = useState<WalletTx[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  // Minimum top-up is ₦100
  const MIN_TOPUP = 100;

  const canInit = useMemo(() => {
    return Number(amount || 0) >= MIN_TOPUP;
  }, [amount]);

  const fetchBalance = async () => {
    const res = await authApi.get("/user/wallet");
    setBalance(Number(res.data?.balance ?? 0));
    setBonusInfo(res.data?.welcome_bonus ?? null);
  };

  const fetchProduct = async () => {
    const res = await authApi.get("/product/student-slot");
    setProduct(res.data as Product);
  };

  const fetchTransactions = async (nextPage = page, nextPerPage = perPage) => {
    setTxLoading(true);
    try {
      const res = await authApi.get<TransactionsResponse>("/user/transactions", {
        params: { page: nextPage, perPage: nextPerPage },
      });
      const p = res.data.transactions;
      setTx(p.data || []);
      setPage(p.current_page || nextPage);
      setPerPage(p.per_page || nextPerPage);
      setTotal(p.total || 0);
      setLastPage(p.last_page || 1);
    } catch (err: any) {
      console.error(err);
      showError?.(err?.response?.data?.message || "Failed to load wallet transactions.");
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    async function boot() {
      setLoading(true);
      try {
        // Check if returning from Paystack redirect with reference
        const params = new URLSearchParams(window.location.search);
        const ref = params.get("reference") || params.get("trxref");
        if (ref) {
          try {
            const verifyRes = await authApi.get(`/verify-payment/${encodeURIComponent(ref)}`);
            if (verifyRes.data?.status === "success" || verifyRes.data?.message) {
              showSuccess?.(verifyRes.data?.message || "Payment verified and wallet credited!");
            }
          } catch (verErr: any) {
            console.error("Verification error:", verErr);
            showError?.(verErr?.response?.data?.message || "Could not verify transaction with Paystack.");
          } finally {
            // Clean up URL parameters
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
          }
        }

        await Promise.all([fetchBalance(), fetchProduct(), fetchTransactions(1, perPage)]);
      } catch (err: any) {
        console.error(err);
        showError?.(err?.response?.data?.message || "Failed to load wallet page.");
      } finally {
        setLoading(false);
      }
    }

    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Client-side filter (within loaded page)
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tx;
    return tx.filter((t) =>
      (t.reference_id || "").toLowerCase().includes(s) ||
      (t.description || "").toLowerCase().includes(s) ||
      (t.type || "").toLowerCase().includes(s)
    );
  }, [tx, q]);

  const handleInitialize = async () => {
    if (!canInit) {
      return showError?.(`Minimum top-up is ${fmtNaira(MIN_TOPUP)}.`);
    }
    setInitLoading(true);
    try {
      const callback_url = window.location.origin + "/wallet";
      const res = await authApi.post("/initialize-payment", { amount, callback_url });
      const url = res.data?.authorization_url;
      if (!url) throw new Error("Authorization URL not returned.");
      window.location.href = url;
    } catch (err: any) {
      console.error(err);
      showError?.(err?.response?.data?.error || err?.response?.data?.message || "Failed to initialize payment.");
    } finally {
      setInitLoading(false);
    }
  };

  const safePage = clamp(page, 1, lastPage);

  const pageNumbers = useMemo(() => {
    const windowSize = 2;
    const start = Math.max(1, safePage - windowSize);
    const end = Math.min(lastPage, safePage + windowSize);
    const nums: number[] = [];
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  }, [safePage, lastPage]);

  const creditTotal = useMemo(
    () => tx.reduce((acc, t) => acc + ((t.type || "").toLowerCase() === "credit" ? Number(t.amount || 0) : 0), 0),
    [tx]
  );
  const debitTotal = useMemo(
    () => tx.reduce((acc, t) => acc + ((t.type || "").toLowerCase() === "debit" ? Number(t.amount || 0) : 0), 0),
    [tx]
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .db-main {
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: 24px 28px 0;
        }
        .db-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 18px;
          padding: 32px 36px;
          position: relative;
          overflow: hidden;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
        }
        .db-hero-glow {
          position: absolute; top: -60px; right: -60px; width: 320px; height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.15) 0%, transparent 65%);
          pointer-events: none;
        }
        .db-hero-glow2 {
          position: absolute; bottom: -40px; left: 30%; width: 200px; height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.10) 0%, transparent 70%);
          pointer-events: none;
        }
        .db-hero-inner {
          position: relative; z-index: 1;
          display: flex; align-items: center; justify-content: space-between;
          gap: 32px; flex-wrap: wrap;
        }
        @media (min-width: 768px) { .db-hero-inner { flex-wrap: nowrap; } }

        .db-session-badge {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 11.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
          color: #FBBF24; background: rgba(217, 119, 6, 0.20);
          border: 1px solid rgba(217, 119, 6, 0.35);
          border-radius: 100px; padding: 4px 12px; margin-bottom: 12px;
        }
        .db-session-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #10B981;
          animation: dbPulse 2s ease infinite;
        }
        @keyframes dbPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.5); }
        }
        .db-greeting {
          font-size: 26px; font-weight: 800; color: #fff;
          line-height: 1.1; margin-bottom: 8px;
        }
        .db-greeting em { font-style: normal; color: #FBBF24; }
        .db-hero-sub {
          font-size: 13.5px; color: #CBD5E1;
          line-height: 1.6; max-width: 560px; margin-bottom: 18px;
        }
        .db-hero-btns { display: flex; gap: 10px; flex-wrap: wrap; }
        .db-btn-gold {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 9px 18px; font-size: 13px; font-weight: 700; color: #FFFFFF;
          background: #D97706; border: none;
          border-radius: 10px;
          cursor: pointer; transition: all 0.2s ease; white-space: nowrap;
        }
        .db-btn-gold:hover { background: #B45309; transform: translateY(-1px); color: #FFFFFF; }
        .db-btn-gold:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
        .db-btn-outline {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 9px 18px; font-size: 13px; font-weight: 600; color: #FFFFFF;
          background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.20);
          border-radius: 10px;
          cursor: pointer; transition: all 0.2s ease; white-space: nowrap;
        }
        .db-btn-outline:hover { background: rgba(255,255,255,0.18); color: #fff; }
        .db-btn-outline:disabled { opacity: 0.55; cursor: not-allowed; }
        .db-hero-stat-card {
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(8px); border-radius: 14px;
          padding: 18px 20px; min-width: 270px; margin-left: auto; align-self: flex-end;
        }
        .db-hero-stat-row { display: flex; flex-direction: column; gap: 10px; }
        .db-hero-stat-item { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .db-hero-stat-label { font-size: 12px; font-weight: 400; color: #CBD5E1; }
        .db-hero-stat-val { font-size: 18px; font-weight: 800; color: #FBBF24; }
        .db-hero-stat-sep { height: 1px; background: rgba(255,255,255,0.08); }
        .db-panel {
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          overflow: hidden; box-shadow: 0 4px 16px rgba(15,39,68,0.03); margin-bottom: 20px;
        }
        .db-panel-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 20px; border-bottom: 1px solid #E2E8F0; gap: 12px; flex-wrap: wrap;
        }
        .db-panel-title { font-size: 16px; font-weight: 800; color: #0F2744; margin: 0; }
        .db-panel-sub { font-size: 12px; color: #64748B; margin: 0; }
        .db-refresh-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; font-size: 12.5px; font-weight: 600; color: #0F2744;
          background: #F1F5F9; border: 1px solid #E2E8F0;
          border-radius: 8px;
          cursor: pointer; transition: all 0.2s ease; white-space: nowrap;
        }
        .db-refresh-btn:hover { background: #E2E8F0; }
        .db-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .db-pill {
          display: inline-flex; align-items: center;
          font-size: 11.5px; font-weight: 700; padding: 5px 10px;
          border-radius: 999px; white-space: nowrap; border: 1px solid rgba(0,0,0,0.06);
        }
        .db-search {
          display: flex; align-items: center; gap: 10px;
          background: #fff; border: 1px solid #E2E8F0;
          border-radius: 10px; padding: 10px 14px; min-width: 260px;
        }
        .db-search input { border: none; outline: none; width: 100%; font-size: 13px; color: #0F2744; }
        .db-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .db-table th {
          padding: 12px 16px; font-size: 11.5px; font-weight: 700; letter-spacing: 0.04em;
          text-transform: uppercase; color: #64748B; background: #F8FAFC;
          border-bottom: 1px solid #E2E8F0; text-align: left; white-space: nowrap;
        }
        .db-table td {
          padding: 14px 16px; font-size: 13px; color: #334155;
          border-bottom: 1px solid #E2E8F0; vertical-align: middle;
        }
        .db-table tbody tr:last-child td { border-bottom: none; }
        .db-table tbody tr:hover { background: #F8FAFC; }
        .db-muted { color: #64748B; }
        .db-strong { font-weight: 700; color: #0F2744; }

        /* ── qty input stepper ── */
        .wlt-qty-wrap {
          display: flex; align-items: center; gap: 0;
          border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden;
          background: #fff; width: fit-content;
        }
        .wlt-qty-btn {
          width: 44px; height: 46px; border: none; background: #F1F5F9;
          color: #0F2744; font-size: 20px; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s ease; flex-shrink: 0; line-height: 1;
        }
        .wlt-qty-btn:hover { background: #E2E8F0; color: #0F2744; }
        .wlt-qty-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .wlt-qty-input {
          width: 90px; height: 46px; border: none; outline: none;
          text-align: center; font-size: 16px; font-weight: 700; color: #0F2744;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #fff;
        }
        /* hide native number arrows */
        .wlt-qty-input::-webkit-inner-spin-button,
        .wlt-qty-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .wlt-qty-input[type=number] { -moz-appearance: textfield; }

        /* ── qty input stepper ── */
        .wlt-qty-wrap {
          display: flex; align-items: center; gap: 0;
          border: 1px solid #e5ddd3; border-radius: 10px; overflow: hidden;
          background: #fff; width: fit-content;
        }
        .wlt-qty-btn {
          width: 44px; height: 46px; border: none; background: #f5f1eb;
          color: #7a6a5a; font-size: 20px; font-weight: 300; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, color 0.15s; flex-shrink: 0; line-height: 1;
        }
        .wlt-qty-btn:hover { background: #ede8e0; color: #1a1a2e; }
        .wlt-qty-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .wlt-qty-input {
          width: 90px; height: 46px; border: none; outline: none;
          text-align: center; font-size: 16px; font-weight: 700; color: #1a1a2e;
          font-family: "DM Sans", sans-serif; background: #fff;
        }
        /* hide native number arrows */
        .wlt-qty-input::-webkit-inner-spin-button,
        .wlt-qty-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .wlt-qty-input[type=number] { -moz-appearance: textfield; }

        /* ── cost preview card ── */
        .wlt-cost-card {
          background: linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(201,168,76,0.03) 100%);
          border: 1px solid rgba(201,168,76,0.22); border-radius: 12px; padding: 16px 20px;
        }
        .wlt-cost-label { font-size: 12px; color: #9a8a7a; margin: 0 0 4px; }
        .wlt-cost-val { font-family: "Lora", serif; font-size: 28px; font-weight: 700; color: #1a1a2e; margin: 0; line-height: 1; }
        .wlt-cost-sub { font-size: 12px; color: #9a8a7a; margin: 6px 0 0; }

        /* ── min-topup notice ── */
        .wlt-min-notice {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px; border-radius: 9px; font-size: 12.5px; line-height: 1.5;
        }
        .wlt-min-notice--warn {
          background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.16); color: #dc2626;
        }
        .wlt-min-notice--ok {
          background: rgba(34,197,94,0.05); border: 1px solid rgba(34,197,94,0.18); color: #16a34a;
        }

        @media (max-width: 991.98px) { .db-main { padding: 18px 14px 0; } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="My Wallet" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loading && <Loader message="Loading wallet..." />}

            {/* ── HERO ── */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Wallet — Top up & Transactions
                  </div>
                  <h1 className="db-greeting">Wallet <em>&amp;</em> Balance</h1>
                  <p className="db-hero-sub">
                    Top up your wallet and monitor all credits and debits in one place.
                    Minimum top-up is {fmtNaira(MIN_TOPUP)}.
                  </p>
                  <div className="db-hero-btns">
                    <button
                      className="db-btn-gold"
                      disabled={initLoading || !canInit}
                      onClick={handleInitialize}
                      title={!canInit ? `Minimum top-up is ${fmtNaira(MIN_TOPUP)}` : "Make Payment"}
                    >
                      {initLoading ? (
                        <><span className="spinner-border spinner-border-sm" /> Initializing…</>
                      ) : (
                        <><i className="bi bi-shield-lock-fill" /> Make Payment</>
                      )}
                    </button>
                    <button
                      className="db-btn-outline"
                      disabled={loading}
                      onClick={async () => {
                        try { await fetchBalance(); showSuccess?.("Wallet balance refreshed."); } catch {}
                      }}
                    >
                      <i className="bi bi-arrow-clockwise" /> Refresh Balance
                    </button>
                    <button
                      className="db-btn-outline"
                      disabled={txLoading}
                      onClick={() => fetchTransactions(1, perPage)}
                    >
                      <i className="bi bi-arrow-clockwise" /> Refresh Transactions
                    </button>
                  </div>
                </div>

                {/* Right stat card */}
                <div className="db-hero-stat-card d-none d-md-block">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c9a84c" }}>
                      Quick glance
                    </span>
                    <i className="bi bi-wallet2" style={{ color: "#64748b" }} />
                  </div>
                    <div className="db-hero-stat-row">
                      <div className="db-hero-stat-item">
                        <span className="db-hero-stat-label">Available Balance</span>
                        <span className="db-hero-stat-val">{fmtNaira(balance)}</span>
                      </div>
                      <div className="db-hero-stat-sep" />
                      <div className="db-hero-stat-item">
                        <span className="db-hero-stat-label">Min. Top-up</span>
                        <span className="db-hero-stat-val" style={{ fontSize: 14 }}>
                          {fmtNaira(MIN_TOPUP)}
                        </span>
                      </div>
                      <div className="db-hero-stat-sep" />
                      <div className="db-hero-stat-item">
                        <span className="db-hero-stat-label">Usage Float</span>
                        <span className="db-hero-stat-val" style={{ fontSize: 13, color: "#34D399" }}>
                          All Services Active
                        </span>
                      </div>
                    </div>
                </div>
              </div>
            </div>

            {/* ── WELCOME BONUS BANNER ── */}
            {bonusInfo && bonusInfo.has_bonus && !bonusInfo.is_expired && (
              <div
                style={{
                  marginTop: 16,
                  marginBottom: 16,
                  padding: "16px 20px",
                  borderRadius: 14,
                  background: bonusInfo.is_activated
                    ? "linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.12))"
                    : "linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.16))",
                  border: bonusInfo.is_activated
                    ? "1px solid rgba(16, 185, 129, 0.3)"
                    : "1px solid rgba(245, 158, 11, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: bonusInfo.is_activated ? "#10b981" : "#f59e0b",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    {bonusInfo.is_activated ? <i className="bi bi-check-circle-fill" /> : <i className="bi bi-gift-fill" />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                      <span>₦{Number(bonusInfo.amount).toLocaleString()} Welcome Bonus</span>
                      <span
                        className="badge"
                        style={{
                          background: bonusInfo.is_activated ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)",
                          color: bonusInfo.is_activated ? "#065f46" : "#92400e",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {bonusInfo.is_activated ? "ACTIVATED & PERMANENT" : `EXPIRES IN ${bonusInfo.days_remaining} DAY(S)`}
                      </span>
                    </div>
                    <p style={{ margin: "3px 0 0", fontSize: 13, color: "#64748b", maxWidth: 680, lineHeight: 1.5 }}>
                      {bonusInfo.is_activated
                        ? "Congratulations! Your welcome bonus has been permanently unlocked and will not expire."
                        : "Your ₦5,000 welcome bonus is active for 30 days. Fund your wallet with any top-up amount before the 30-day countdown ends to permanently activate and lock it in!"}
                    </p>
                  </div>
                </div>

                {!bonusInfo.is_activated && (
                  <button
                    className="db-btn-gold"
                    style={{ padding: "8px 16px", fontSize: 13, minHeight: "auto" }}
                    onClick={() => {
                      const el = document.getElementById("walletTopupInput");
                      el?.focus();
                    }}
                  >
                    <i className="bi bi-lightning-charge-fill me-1" /> Fund Wallet to Activate
                  </button>
                )}
              </div>
            )}

            {/* ── KPI STRIP ── */}
            <div className="row g-3 mt-1 mb-3">
              {[
                { title: "Wallet Balance", value: fmtNaira(balance), icon: "cash-coin", toneBg: "#dbeafe", toneFg: "#1e40af" },
                { title: "Total Credits", value: fmtNaira(creditTotal), icon: "arrow-down-circle", toneBg: "#d1fae5", toneFg: "#065f46" },
                { title: "Total Debits", value: fmtNaira(debitTotal), icon: "arrow-up-circle", toneBg: "#ffe4e6", toneFg: "#be123c" },
                { title: "Top-up Selection", value: fmtNaira(amount), icon: "wallet2", toneBg: "#fef3c7", toneFg: "#b45309" },
              ].map((c) => (
                <div className="col-md-6 col-lg-3" key={c.title}>
                  <div className="db-panel" style={{ padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: c.toneBg, color: c.toneFg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className={`bi bi-${c.icon}`} style={{ fontSize: 18 }} />
                      </div>
                      <i className="bi bi-three-dots-vertical" style={{ color: "#c8bfb5" }} />
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <div className="db-muted" style={{ fontSize: 12 }}>{c.title}</div>
                      <div className="db-strong" style={{ fontFamily: "Lora, serif", fontSize: 22, marginTop: 2 }}>{c.value}</div>
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                        <span className="db-muted" style={{ fontSize: 12 }}>
                          <i className="bi bi-info-circle me-1" />Treasury Account
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── TOP UP PANEL ── */}
            <div className="db-panel">
              <div className="db-panel-head">
                <div>
                  <p className="db-panel-title">Fund School Wallet</p>
                  <p className="db-panel-sub">
                    Add money to your school wallet balance via Paystack (Debit Card, Bank Transfer, USSD). Minimum top-up is {fmtNaira(MIN_TOPUP)}.
                  </p>
                </div>
                <span className="db-pill" style={{ background: "rgba(217, 119, 6, 0.12)", color: "#D97706", fontWeight: 700 }}>
                  Top-up: {fmtNaira(amount)}
                </span>
              </div>

              <div style={{ padding: "20px 20px 24px" }}>
                <div className="row g-4 align-items-start">

                  {/* Left: amount selection */}
                  <div className="col-12 col-md-6">
                    <label style={{ fontSize: 13, fontWeight: 700, color: "#0F2744", display: "block", marginBottom: 8 }}>
                      Select or Enter Amount (₦)
                    </label>

                    {/* Preset Amount Chips */}
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      {[2000, 5000, 10000, 20000, 50000, 100000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className="btn"
                          onClick={() => setAmount(preset)}
                          style={{
                            borderRadius: "10px",
                            padding: "8px 14px",
                            fontSize: "13px",
                            fontWeight: 700,
                            border: amount === preset ? "2px solid #D97706" : "1px solid #E2E8F0",
                            background: amount === preset ? "#FEF3C7" : "#F8FAFC",
                            color: amount === preset ? "#B45309" : "#334155",
                            transition: "all 0.2s ease",
                          }}
                        >
                          {fmtNaira(preset)}
                        </button>
                      ))}
                    </div>

                    {/* Custom Amount Input */}
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 14, top: 12, fontWeight: 700, color: "#64748B", fontSize: 16 }}>₦</span>
                      <input
                        id="walletTopupInput"
                        className="form-control"
                        type="number"
                        min={100}
                        step={100}
                        value={amount}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setAmount(Number.isNaN(v) ? 0 : v);
                        }}
                        style={{
                          paddingLeft: 34,
                          height: 48,
                          borderRadius: 10,
                          fontSize: 16,
                          fontWeight: 700,
                          color: "#0F2744",
                          border: "1px solid #CBD5E1",
                          background: "#FFFFFF",
                        }}
                        placeholder="Enter custom amount in Naira"
                      />
                    </div>

                    {/* min-topup notice */}
                    <div className={`wlt-min-notice mt-3 ${canInit ? "wlt-min-notice--ok" : "wlt-min-notice--warn"}`}>
                      {canInit ? (
                        <>
                          <i className="bi bi-check-circle-fill text-success" />
                          <span>Amount of <strong>{fmtNaira(amount)}</strong> meets the minimum top-up requirement.</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-exclamation-triangle-fill text-danger" />
                          <span>Minimum top-up is <strong>{fmtNaira(MIN_TOPUP)}</strong>. Current amount: {fmtNaira(amount)}.</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: cost preview + CTA */}
                  <div className="col-12 col-md-6">
                    <div className="wlt-cost-card" style={{ marginBottom: 16, padding: "18px 20px", borderRadius: "14px", background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                      <p className="wlt-cost-label" style={{ fontSize: "12px", color: "#64748B", marginBottom: "4px" }}>Total Amount to Pay</p>
                      <p className="wlt-cost-val" style={{ fontSize: "28px", fontWeight: 800, color: "#0F2744", marginBottom: "6px" }}>{fmtNaira(amount)}</p>
                      <p className="wlt-cost-sub" style={{ fontSize: "12px", color: "#64748B", margin: 0 }}>
                        Estimated wallet balance after funding: <strong>{fmtNaira(balance + (canInit ? amount : 0))}</strong>
                      </p>
                    </div>

                    <button
                      className="db-btn-gold w-100 justify-content-center"
                      style={{
                        padding: "13px 18px",
                        fontSize: "14.5px",
                        fontWeight: 800,
                        borderRadius: "12px",
                      }}
                      disabled={initLoading || !canInit}
                      onClick={handleInitialize}
                    >
                      {initLoading ? (
                        <><span className="spinner-border spinner-border-sm me-2" /> Initializing Payment…</>
                      ) : (
                        <><i className="bi bi-shield-lock-fill me-2" /> Make Payment ({fmtNaira(amount)})</>
                      )}
                    </button>

                    <div className="db-muted mt-2 text-center" style={{ fontSize: "12px" }}>
                      <i className="bi bi-shield-check me-1 text-success" />
                      Multi-purpose treasury: Usable for Student Clearances, AI Credits, and WhatsApp Messaging.
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* ── TRANSACTIONS ── */}
            <div className="db-panel">
              <div className="db-panel-head">
                <div>
                  <p className="db-panel-title">Wallet transactions</p>
                  <p className="db-panel-sub">All credits and debits. Search applies to the current page.</p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div className="db-search">
                    <i className="bi bi-search" style={{ color: "#9a8a7a" }} />
                    <input
                      placeholder="Search reference or description…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                  </div>

                  <select
                    className="form-select"
                    style={{ width: 140, borderRadius: 12, borderColor: "#e5ddd3" }}
                    value={perPage}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setPerPage(n);
                      fetchTransactions(1, n);
                    }}
                  >
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n}>{n}/page</option>
                    ))}
                  </select>

                  <button className="db-refresh-btn" disabled={txLoading} onClick={() => fetchTransactions(1, perPage)}>
                    <i className="bi bi-arrow-clockwise" /> Refresh
                  </button>
                </div>
              </div>

              {txLoading && (
                <div style={{ padding: 16 }}>
                  <Loader message="Loading transactions..." />
                </div>
              )}

              <div style={{ overflowX: "auto" }}>
                <table className="db-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Reference</th>
                      <th>Type</th>
                      <th style={{ textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: 46, textAlign: "center", color: "#b5a090" }}>
                          <div style={{ fontWeight: 800, color: "#1a1a2e" }}>No transactions found</div>
                          <div style={{ fontSize: 12.5, marginTop: 4 }}>Try a different keyword or switch pages.</div>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((t) => {
                        const pill = txPill(t.type);
                        return (
                          <tr key={t.id}>
                            <td className="db-muted">{fmtDate(t.created_at)}</td>
                            <td className="db-strong" style={{ fontWeight: 600 }}>{t.description || "—"}</td>
                            <td><code style={{ fontSize: 12, color: "#1a1a2e" }}>{t.reference_id || "—"}</code></td>
                            <td>
                              <span className="db-pill" style={{ background: pill.bg, color: pill.fg }}>{pill.text}</span>
                            </td>
                            <td style={{ textAlign: "right" }} className="db-strong">{fmtNaira(Number(t.amount || 0))}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div className="db-muted" style={{ fontSize: 12.5 }}>
                  Page <b>{safePage}</b> of <b>{lastPage}</b> · Total <b>{total}</b> record{total !== 1 ? "s" : ""}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <button className="db-refresh-btn" disabled={safePage <= 1 || txLoading} onClick={() => fetchTransactions(safePage - 1, perPage)}>
                    <i className="bi bi-chevron-left" /> Prev
                  </button>

                  {safePage > 3 && (
                    <>
                      <button className="db-refresh-btn" disabled={txLoading} onClick={() => fetchTransactions(1, perPage)}>1</button>
                      <span className="db-muted">…</span>
                    </>
                  )}

                  {pageNumbers.map((n) => (
                    <button
                      key={n}
                      className="db-refresh-btn"
                      disabled={txLoading}
                      onClick={() => fetchTransactions(n, perPage)}
                      style={{
                        background: n === safePage ? "#c9a84c" : undefined,
                        color: n === safePage ? "#0f172a" : undefined,
                        borderColor: n === safePage ? "#c9a84c" : undefined,
                        fontWeight: n === safePage ? 800 : 400,
                        minWidth: 44,
                        justifyContent: "center",
                      }}
                    >
                      {n}
                    </button>
                  ))}

                  {safePage < lastPage - 2 && (
                    <>
                      <span className="db-muted">…</span>
                      <button className="db-refresh-btn" disabled={txLoading} onClick={() => fetchTransactions(lastPage, perPage)}>{lastPage}</button>
                    </>
                  )}

                  <button className="db-refresh-btn" disabled={safePage >= lastPage || txLoading} onClick={() => fetchTransactions(safePage + 1, perPage)}>
                    Next <i className="bi bi-chevron-right" />
                  </button>
                </div>
              </div>

              <div style={{ padding: "0 16px 16px" }} className="db-muted">
                <i className="bi bi-info-circle me-1" />
                If you paid and weren't credited, contact support with the transaction reference.
              </div>
            </div>

            <div className="mt-auto"><Footer /></div>
          </main>
        </div>
      </div>
    </>
  );
}