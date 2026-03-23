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

  // Topup form
  const [quantity, setQuantity] = useState<number>(50); // 50 * ₦100 = ₦5,000 (meets backend min)
  const [initLoading, setInitLoading] = useState(false);

  // Transactions
  const [txLoading, setTxLoading] = useState(false);
  const [q, setQ] = useState("");
  const [tx, setTx] = useState<WalletTx[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  const estimatedCost = useMemo(() => {
    const price = product?.price ?? 100;
    return Number(quantity || 0) * price;
  }, [quantity, product]);

  const canInit = useMemo(() => {
    return Number(quantity || 0) >= 1 && estimatedCost >= 5000; // backend enforces min ₦5000
  }, [quantity, estimatedCost]);

  const fetchBalance = async () => {
    const res = await authApi.get("/user/wallet");
    setBalance(Number(res.data?.balance ?? 0));
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
    setLoading(true);
    Promise.all([fetchBalance(), fetchProduct(), fetchTransactions(1, perPage)])
      .catch((err) => {
        console.error(err);
        showError?.(err?.response?.data?.message || "Failed to load wallet page.");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Client-side filter (within loaded page)
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tx;
    return tx.filter((t) => {
      return (
        (t.reference_id || "").toLowerCase().includes(s) ||
        (t.description || "").toLowerCase().includes(s) ||
        (t.type || "").toLowerCase().includes(s)
      );
    });
  }, [tx, q]);

  const handleInitialize = async () => {
    if (!canInit) {
      return showError?.("Minimum top-up is ₦5,000. Increase the number of slots.");
    }

    setInitLoading(true);
    try {
      const res = await authApi.post("/initialize-payment", { quantity });
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

  // Pagination UI helpers
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
        /* ===== AdminDashboard template styles (aligned with your upgraded pages) ===== */
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
          background-image: radial-gradient(circle, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
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
          background: radial-gradient(circle, rgba(201, 168, 76, 0.10) 0%, transparent 65%);
          pointer-events: none;
        }
        .db-hero-glow2 {
          position: absolute;
          bottom: -40px;
          left: 30%;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.07) 0%, transparent 70%);
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
        @media (min-width: 768px) { .db-hero-inner { flex-wrap: nowrap; } }

        .db-session-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #e8c97a;
          background: rgba(201, 168, 76, 0.10);
          border: 1px solid rgba(201, 168, 76, 0.22);
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
        .db-greeting em { font-style: italic; color: #e8c97a; }

        .db-hero-sub {
          font-size: 13.5px;
          font-weight: 300;
          color: #64748b;
          line-height: 1.65;
          max-width: 560px;
          margin-bottom: 18px;
        }

        .db-hero-btns { display: flex; gap: 10px; flex-wrap: wrap; }

        .db-btn-gold {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 20px;
          font-family: "DM Sans", sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: #0f172a;
          background: #c9a84c;
          border: none;
          border-radius: var(--bs-border-radius, 8px);
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
          white-space: nowrap;
        }
        .db-btn-gold:hover { background: #e8c97a; transform: translateY(-1px); }
        .db-btn-gold:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        .db-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 20px;
          font-family: "DM Sans", sans-serif;
          font-size: 13px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.7);
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: var(--bs-border-radius, 8px);
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
          white-space: nowrap;
        }
        .db-btn-outline:hover { background: rgba(255, 255, 255, 0.06); color: #fff; border-color: rgba(255, 255, 255, 0.28); }
        .db-btn-outline:disabled { opacity: 0.55; cursor: not-allowed; }

        .db-hero-stat-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.09);
          backdrop-filter: blur(8px);
          border-radius: var(--bs-border-radius, 12px);
          padding: 20px 24px;
          min-width: 270px;
          margin-left: auto;
          align-self: flex-end;
        }

        .db-hero-stat-row { display: flex; flex-direction: column; gap: 10px; }
        .db-hero-stat-item { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .db-hero-stat-label { font-size: 12px; font-weight: 300; color: #64748b; }
        .db-hero-stat-val { font-family: "Lora", serif; font-size: 18px; font-weight: 700; color: #fff; }
        .db-hero-stat-sep { height: 1px; background: rgba(255, 255, 255, 0.06); }

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
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
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

        .db-refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 400;
          color: #7a6a5a;
          background: #f5f1eb;
          border: 1px solid #e5ddd3;
          border-radius: var(--bs-border-radius, 7px);
          cursor: pointer;
          transition: background 0.2s;
          white-space: nowrap;
        }
        .db-refresh-btn:hover { background: #ede8e0; }
        .db-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

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

        .db-search {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          border: 1px solid #e5ddd3;
          border-radius: 12px;
          padding: 10px 12px;
          min-width: 260px;
        }
        .db-search input { border: none; outline: none; width: 100%; font-size: 13px; }

        .db-table { width: 100%; border-collapse: collapse; }
        .db-table th {
          padding: 10px 16px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #9a8a7a;
          background: #faf8f5;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          text-align: left;
          white-space: nowrap;
        }
        .db-table td {
          padding: 13px 16px;
          font-size: 13.5px;
          color: #4a4a5a;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          vertical-align: middle;
        }
        .db-table tbody tr:last-child td { border-bottom: none; }
        .db-table tbody tr:hover { background: #faf8f5; }

        .db-muted { color: #9a8a7a; }
        .db-strong { font-weight: 900; color: #1a1a2e; }

        @media (max-width: 991.98px) { .db-main { padding: 18px 14px 0; } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="My Wallet" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loading && <Loader message="Loading wallet..." />}

            {/* ===== HERO ===== */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Wallet — Top up & Transactions
                  </div>

                  <h1 className="db-greeting">
                    Wallet <em>&</em> Result Slots
                  </h1>

                  <p className="db-hero-sub">
                    Top up your wallet by purchasing student slots and monitor all credits/debits in one place.
                    Minimum top-up is ₦5,000.
                  </p>

                  <div className="db-hero-btns">
                    <button
                      className="db-btn-gold"
                      disabled={initLoading || !canInit}
                      onClick={handleInitialize}
                      title={!canInit ? "Minimum top-up is ₦5,000" : "Proceed to Paystack"}
                    >
                      {initLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm" />
                          Initializing…
                        </>
                      ) : (
                        <>
                          <i className="bi bi-credit-card" />
                          Proceed to Paystack
                        </>
                      )}
                    </button>

                    <button
                      className="db-btn-outline"
                      disabled={loading}
                      onClick={async () => {
                        try {
                          await fetchBalance();
                          showSuccess?.("Wallet balance refreshed.");
                        } catch (e) {
                          // handled
                        }
                      }}
                    >
                      <i className="bi bi-arrow-clockwise" />
                      Refresh Balance
                    </button>

                    <button
                      className="db-btn-outline"
                      disabled={txLoading}
                      onClick={() => fetchTransactions(1, perPage)}
                    >
                      <i className="bi bi-arrow-clockwise" />
                      Refresh Transactions
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
                      <span className="db-hero-stat-label">Balance</span>
                      <span className="db-hero-stat-val">{fmtNaira(balance)}</span>
                    </div>

                    <div className="db-hero-stat-sep" />

                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Product</span>
                      <span className="db-hero-stat-val" style={{ fontSize: 14, fontFamily: "DM Sans" }}>
                        {product?.name || "Student Slot"}
                      </span>
                    </div>

                    <div className="db-hero-stat-sep" />

                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Price / Slot</span>
                      <span className="db-hero-stat-val" style={{ fontSize: 14, fontFamily: "DM Sans" }}>
                        {fmtNaira(product?.price ?? 100)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== KPI STRIP ===== */}
            <div className="row g-3 mt-1 mb-3">
              {[
                { title: "Wallet Balance", value: fmtNaira(balance), icon: "cash-coin", toneBg: "#dbeafe", toneFg: "#1e40af" },
                { title: "This Page Credits", value: fmtNaira(creditTotal), icon: "arrow-down-circle", toneBg: "#d1fae5", toneFg: "#065f46" },
                { title: "This Page Debits", value: fmtNaira(debitTotal), icon: "arrow-up-circle", toneBg: "#ffe4e6", toneFg: "#be123c" },
                { title: "Estimated Top-up", value: fmtNaira(estimatedCost), icon: "calculator", toneBg: "#ede9fe", toneFg: "#7c3aed" },
              ].map((c) => (
                <div className="col-md-6 col-lg-3" key={c.title}>
                  <div className="db-panel" style={{ padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: c.toneBg,
                          color: c.toneFg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <i className={`bi bi-${c.icon}`} style={{ fontSize: 18 }} />
                      </div>
                      <i className="bi bi-three-dots-vertical" style={{ color: "#c8bfb5" }} />
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <div className="db-muted" style={{ fontSize: 12 }}>
                        {c.title}
                      </div>
                      <div className="db-strong" style={{ fontFamily: "Lora, serif", fontSize: 22, marginTop: 2 }}>
                        {c.value}
                      </div>
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                        <span className="db-muted" style={{ fontSize: 12 }}>
                          <i className="bi bi-info-circle me-1" />
                          Based on current view
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ===== TOP UP PANEL ===== */}
            <div className="db-panel">
              <div className="db-panel-head">
                <div>
                  <p className="db-panel-title">Top up wallet</p>
                  <p className="db-panel-sub">
                    Purchase student slot(s). Minimum top-up is ₦5,000.
                    {product?.price ? ` Price: ${fmtNaira(product.price)} / slot.` : ""}
                  </p>
                </div>

                <span className="db-pill" style={{ background: "rgba(0,0,0,0.04)", color: "#7a6a5a" }}>
                  Total: {fmtNaira(estimatedCost)}
                </span>
              </div>

              <div style={{ padding: 16 }}>
                <div className="row g-3 align-items-end">
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold small mb-1">Number of slots</label>
                    <input
                      type="number"
                      className="form-control"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      placeholder="e.g. 50"
                    />
                    <div className="db-muted" style={{ fontSize: 12, marginTop: 8 }}>
                      Product: <b>{product?.name || "Student Slot"}</b>{" "}
                      <span className="ms-2">•</span>{" "}
                      <span className="ms-2">Price: <b>{fmtNaira(product?.price ?? 100)}</b></span>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <button
                      className="db-refresh-btn"
                      style={{
                        width: "100%",
                        justifyContent: "center",
                        padding: "12px 14px",
                        borderRadius: 12,
                        fontWeight: 900,
                        background: canInit ? "#c9a84c" : undefined,
                        color: canInit ? "#0f172a" : undefined,
                        borderColor: canInit ? "#c9a84c" : undefined,
                      }}
                      disabled={initLoading || !canInit}
                      onClick={handleInitialize}
                    >
                      {initLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm" />
                          Initializing…
                        </>
                      ) : (
                        <>
                          <i className="bi bi-credit-card" />
                          Proceed to Paystack
                        </>
                      )}
                    </button>

                    {!canInit && (
                      <div className="text-danger small mt-2">
                        <i className="bi bi-exclamation-triangle me-1" />
                        Minimum top-up is ₦5,000. Increase slots (e.g. 50 slots at ₦100 each).
                      </div>
                    )}

                    <div className="db-muted" style={{ fontSize: 12, marginTop: 10 }}>
                      <i className="bi bi-info-circle me-1" />
                      After payment, your wallet will be credited automatically once verification completes.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== TRANSACTIONS ===== */}
            <div className="db-panel">
              <div className="db-panel-head">
                <div>
                  <p className="db-panel-title">Wallet transactions</p>
                  <p className="db-panel-sub">Credits and debits for this wallet. Search is applied to current page data.</p>
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
                      <option key={n} value={n}>
                        {n}/page
                      </option>
                    ))}
                  </select>

                  <button className="db-refresh-btn" disabled={txLoading} onClick={() => fetchTransactions(1, perPage)}>
                    <i className="bi bi-arrow-clockwise" />
                    Refresh
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
                          <div style={{ fontSize: 12.5, marginTop: 4 }}>
                            Try a different keyword or switch pages.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((t) => {
                        const pill = txPill(t.type);
                        return (
                          <tr key={t.id}>
                            <td className="db-muted">{fmtDate(t.created_at)}</td>
                            <td className="db-strong" style={{ fontWeight: 600 }}>
                              {t.description || "—"}
                            </td>
                            <td>
                              <code style={{ fontSize: 12, color: "#1a1a2e" }}>{t.reference_id || "—"}</code>
                            </td>
                            <td>
                              <span className="db-pill" style={{ background: pill.bg, color: pill.fg }}>
                                {pill.text}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }} className="db-strong">
                              {fmtNaira(Number(t.amount || 0))}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Server pagination controls */}
              <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div className="db-muted" style={{ fontSize: 12.5 }}>
                  Page <b>{safePage}</b> of <b>{lastPage}</b> • Total <b>{total}</b> record(s)
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="db-refresh-btn"
                    disabled={safePage <= 1 || txLoading}
                    onClick={() => fetchTransactions(safePage - 1, perPage)}
                  >
                    <i className="bi bi-chevron-left" />
                    Prev
                  </button>

                  {safePage > 3 && (
                    <>
                      <button className="db-refresh-btn" disabled={txLoading} onClick={() => fetchTransactions(1, perPage)}>
                        1
                      </button>
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
                      <button className="db-refresh-btn" disabled={txLoading} onClick={() => fetchTransactions(lastPage, perPage)}>
                        {lastPage}
                      </button>
                    </>
                  )}

                  <button
                    className="db-refresh-btn"
                    disabled={safePage >= lastPage || txLoading}
                    onClick={() => fetchTransactions(safePage + 1, perPage)}
                  >
                    Next
                    <i className="bi bi-chevron-right" />
                  </button>
                </div>
              </div>

              <div style={{ padding: "0 16px 16px" }} className="db-muted">
                <i className="bi bi-info-circle me-1" />
                Tip: If you paid and didn’t get credited, contact support with the reference.
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