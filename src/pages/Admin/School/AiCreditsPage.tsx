import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";

type AiCreditSummary = {
  allocated_credits: number;
  used_credits: number;
  remaining_credits: number;
  cycle_start?: string | null;
  cycle_end?: string | null;
  wallet_valid_from?: string | null;
  access_valid_until?: string | null;
  credits_given_with_current_plan?: number;
  current_package?: string | null;
  subscription_id?: number;
  ai_result_comment_credit_cost?: number;
  ai_cbt_question_credit_cost?: number;
  ai_lesson_plan_credit_cost?: number;
  ai_fee_collection_credit_cost?: number;
  ai_credit_unit_price?: number | string;
};

type AiCreditQuote = {
  unit_price: number;
  quantity: number;
  total_amount: number;
  currency: string;
  wallet_balance: number;
};

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtMoney(value?: number | string | null) {
  return `NGN ${Number(value || 0).toLocaleString()}`;
}

function StatTile({ label, value, tone }: { label: string; value: string | number; tone: "primary" | "success" | "warning" }) {
  return (
    <div className={`ai-credit-tile ai-credit-tile--${tone}`}>
      <div className="ai-credit-tile-label">{label}</div>
      <div className="ai-credit-tile-value">{value}</div>
    </div>
  );
}

export default function AiCreditsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showError, showSuccess } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AiCreditSummary | null>(null);
  const [quote, setQuote] = useState<AiCreditQuote | null>(null);
  const [quantity, setQuantity] = useState(50);
  const [buying, setBuying] = useState<"wallet" | "paystack" | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usagePercent = useMemo(() => {
                    <StatTile label="Allocated" value={summary?.allocated_credits ?? 0} tone="success" />
    const used = Number(summary?.used_credits || 0);
    if (allocated <= 0) return 0;
    return Math.min(100, Math.round((used / allocated) * 100));
  }, [summary]);

  const estimatedTotal = Number(quote?.total_amount || quantity * Number(summary?.ai_credit_unit_price || quote?.unit_price || 0));
  const canPayWithWallet = Number(quote?.wallet_balance || 0) >= estimatedTotal && estimatedTotal > 0;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.get<{ data: AiCreditSummary }>("/admin/ai/credits");
      setSummary(res.data?.data || null);
    } catch (err: any) {
      const message = err?.response?.data?.message || "Unable to load AI credit balance.";
      setError(message);
      showError?.(message);
    } finally {
      setLoading(false);
    }
  };

  const loadQuote = async (nextQuantity = quantity) => {
    try {
      const res = await authApi.get<AiCreditQuote>(`/admin/ai/credits/quote?quantity=${nextQuantity}`);
      setQuote(res.data || null);
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to load AI credit price.");
    }
  };

  const updateQuantity = (value: number) => {
    const next = Math.max(1, Math.min(1000000, Number.isFinite(value) ? value : 1));
    setQuantity(next);
    loadQuote(next);
  };

  const buyWithWallet = async () => {
    setBuying("wallet");
    try {
      const res = await authApi.post("/admin/ai/credits/buy-wallet", { quantity });
      setSummary(res.data?.credits || null);
      showSuccess?.(res.data?.message || "AI credits purchased successfully.");
      await loadQuote(quantity);
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to buy AI credits with wallet.");
    } finally {
      setBuying(null);
    }
  };

  const buyWithPaystack = async () => {
    setBuying("paystack");
    try {
      const res = await authApi.post("/admin/ai/credits/initialize-online", { quantity });
      const url = res.data?.authorization_url;
      if (!url) throw new Error("Paystack authorization URL was not returned.");
      window.location.href = url;
    } catch (err: any) {
      showError?.(err?.response?.data?.message || err?.message || "Unable to start Paystack checkout.");
      setBuying(null);
    }
  };

  const verifyReturnedPayment = async (reference: string) => {
    setVerifying(true);
    try {
      const res = await authApi.get(`/admin/ai/credits/verify/${encodeURIComponent(reference)}`);
      setSummary(res.data?.credits || null);
      showSuccess?.(res.data?.message || "AI credit payment verified.");
      setSearchParams({});
      await loadQuote(quantity);
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Payment has not been confirmed yet.");
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    load();
    loadQuote(50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    if (reference) verifyReturnedPayment(reference);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <>
      <style>{`
        .ai-credit-main{background:linear-gradient(180deg,rgba(211,0,176,.035),transparent 260px),var(--bs-light,#fcf8f8);min-height:100vh;padding:28px 28px 0;overflow-x:hidden;font-family:"DM Sans",system-ui,sans-serif}
        .ai-credit-hero{background:linear-gradient(135deg,var(--bs-dark,#050008),#16081d);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:28px 30px;color:#fff;box-shadow:0 18px 44px rgba(5,0,8,.10);position:relative;overflow:hidden;margin-bottom:20px}.ai-credit-hero:before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,.045) 1px,transparent 1px);background-size:24px 24px;pointer-events:none}.ai-credit-hero>*{position:relative;z-index:1}
        .ai-credit-kicker{font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--bs-secondary,rgb(255,200,87));margin-bottom:8px}.ai-credit-title{font-family:"Playfair Display",serif;font-size:clamp(25px,3vw,36px);font-weight:900;margin:0}.ai-credit-sub{max-width:760px;color:rgba(255,255,255,.62);font-size:13.5px;line-height:1.7;margin:10px 0 0}
        .ai-credit-grid{display:grid;grid-template-columns:1fr 360px;gap:18px;align-items:start}.ai-credit-card{background:#fff;border:1px solid rgba(5,0,8,.08);border-radius:14px;box-shadow:0 10px 28px rgba(5,0,8,.045);overflow:hidden}.ai-credit-pad{padding:20px}.ai-credit-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:16px}.ai-credit-card-title{font-weight:900;color:#1a1a2e;margin:0}.ai-credit-muted{font-size:12.5px;color:#8d7d70;line-height:1.6;margin:3px 0 0}
        .ai-credit-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.ai-credit-tile{border-radius:13px;padding:16px;border:1px solid rgba(5,0,8,.08);background:#fff;position:relative;overflow:hidden}.ai-credit-tile:after{content:"";position:absolute;right:-36px;top:-36px;width:110px;height:110px;border-radius:50%;opacity:.12}.ai-credit-tile--primary:after{background:rgb(211,0,176)}.ai-credit-tile--success:after{background:rgb(34,197,94)}.ai-credit-tile--warning:after{background:rgb(255,200,87)}.ai-credit-tile-label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#9a8a7a;font-weight:900}.ai-credit-tile-value{font-family:"Playfair Display",serif;font-size:34px;font-weight:900;color:#050008;line-height:1;margin-top:8px}
        .ai-credit-progress{height:10px;background:#f4efe8;border-radius:999px;overflow:hidden}.ai-credit-progress-fill{height:100%;background:linear-gradient(90deg,var(--bs-primary,rgb(211,0,176)),var(--bs-secondary,rgb(255,200,87)));border-radius:999px;transition:width .35s ease}.ai-credit-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid rgba(5,0,8,.06)}.ai-credit-row:last-child{border-bottom:0}.ai-credit-label{font-size:12px;color:#8d7d70}.ai-credit-value{font-weight:900;color:#1a1a2e;text-align:right}.ai-credit-tool{border:1px solid rgba(5,0,8,.08);border-radius:12px;padding:14px;background:linear-gradient(180deg,#fff,#fffcf7);display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px}.ai-credit-tool-title{font-weight:900;color:#1a1a2e}.ai-credit-tool-sub{font-size:12px;color:#8d7d70;line-height:1.5}.ai-credit-btn{border:0;border-radius:10px;background:var(--bs-secondary,rgb(255,200,87));color:#050008;font-weight:900;padding:10px 14px;white-space:nowrap}.ai-credit-btn-outline{border:1px solid rgba(5,0,8,.12);border-radius:10px;background:#fff;color:#1a1a2e;font-weight:850;padding:10px 14px;white-space:nowrap}.ai-credit-btn-paystack{background:var(--bs-primary,rgb(211,0,176));color:#fff}.ai-credit-btn:disabled,.ai-credit-btn-outline:disabled{opacity:.65;cursor:not-allowed}.ai-credit-alert{display:flex;align-items:flex-start;gap:10px;background:rgba(245,158,11,.10);border:1px solid rgba(245,158,11,.20);color:#9a3412;border-radius:12px;padding:13px 14px;font-size:13px;line-height:1.6}
        .ai-credit-buy-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ai-credit-input{width:100%;border:1px solid rgba(5,0,8,.12);border-radius:10px;padding:11px 12px;font-weight:800;color:#1a1a2e;outline:none}.ai-credit-input:focus{border-color:var(--bs-primary,rgb(211,0,176));box-shadow:0 0 0 3px rgba(211,0,176,.10)}.ai-credit-summary-box{background:#fffcf7;border:1px solid rgba(5,0,8,.08);border-radius:12px;padding:13px 14px;margin-top:12px}.ai-credit-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
        @media(max-width:1199.98px){.ai-credit-grid{grid-template-columns:1fr}.ai-credit-tiles{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:767.98px){.ai-credit-main{padding:20px 16px 0}.ai-credit-tiles,.ai-credit-buy-grid{grid-template-columns:1fr}.ai-credit-tool{align-items:flex-start;flex-direction:column}.ai-credit-tool .ai-credit-btn-outline,.ai-credit-tool .ai-credit-btn,.ai-credit-actions .ai-credit-btn{width:100%}}
      `}</style>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="AI Credits" />
      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="col-md-9 col-lg-10 ms-auto db-main ai-credit-main">
            <PageTitle title="AI Credits" />
            {loading && <Loader message="Loading AI credits..." />}

            <section className="ai-credit-hero">
              <div className="ai-credit-kicker">GradeQuest Plus AI usage</div>
              <h1 className="ai-credit-title">AI Credit Dashboard</h1>
              <p className="ai-credit-sub">
                Track AI balance separately from WhatsApp credits. Schools can use plan credits first, then buy extra credits when the balance is low.
              </p>
            </section>

            {error && <div className="ai-credit-alert mb-3"><i className="bi bi-exclamation-circle mt-1" /><div>{error}</div></div>}
            {verifying && <div className="ai-credit-alert mb-3"><i className="bi bi-hourglass-split mt-1" /><div>Confirming Paystack payment and adding AI credits...</div></div>}

            <div className="ai-credit-grid">
              <section className="ai-credit-card">
                <div className="ai-credit-pad">
                  <div className="ai-credit-head">
                    <div>
                      <h2 className="ai-credit-card-title">Current AI Balance</h2>
                      <p className="ai-credit-muted">Credits remain available while the school has an active Plus subscription.</p>
                    </div>
                    <button className="ai-credit-btn-outline" onClick={() => { load(); loadQuote(quantity); }} disabled={loading || verifying}>
                      <i className="bi bi-arrow-clockwise me-1" /> Refresh
                    </button>
                  </div>

                  <div className="ai-credit-tiles">
                    <StatTile label="Remaining" value={summary?.remaining_credits ?? 0} tone="primary" />
                <StatTile label="Used" value={summary?.used_credits ?? 0} tone="warning" />
                    <StatTile label="Allocated" value={summary?.allocated_credits ?? 0} tone="success" />
                  </div>

                  <div className="mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="ai-credit-label">AI wallet used</span>
                      <span className="ai-credit-value">{usagePercent}%</span>
                    </div>
                    <div className="ai-credit-progress"><div className="ai-credit-progress-fill" style={{ width: `${usagePercent}%` }} /></div>
                  </div>

                  <div className="mt-4">
                    <div className="ai-credit-row"><span className="ai-credit-label">Current Package</span><span className="ai-credit-value">{summary?.current_package || "GradeQuest Plus"}</span></div>
                    <StatTile label="Allocated" value={summary?.allocated_credits ?? 0} tone="success" />
                    <div className="ai-credit-row"><span className="ai-credit-label">AI Access Valid Until</span><span className="ai-credit-value">{fmtDate(summary?.access_valid_until || summary?.cycle_end)}</span></div>
                    <div className="ai-credit-row"><span className="ai-credit-label">Extra AI Credit Price</span><span className="ai-credit-value">{fmtMoney(summary?.ai_credit_unit_price)}</span></div>
                  </div>

                  <div className="mt-4">
                    <div className="ai-credit-head mb-2">
                      <div>
                        <h2 className="ai-credit-card-title">Buy Extra Credits</h2>
                        <p className="ai-credit-muted">Use this when the school has exhausted its AI balance before the subscription expires.</p>
                      </div>
                    </div>
                    <div className="ai-credit-buy-grid">
                      <div>
                        <label className="ai-credit-label d-block mb-1">Credit quantity</label>
                        <input className="ai-credit-input" type="number" min={1} max={1000000} value={quantity} onChange={(e) => updateQuantity(Number(e.target.value))} />
                      </div>
                      <div>
                        <label className="ai-credit-label d-block mb-1">Amount to pay</label>
                        <div className="ai-credit-input" style={{ background: "#fff", minHeight: 46 }}>{fmtMoney(estimatedTotal)}</div>
                      </div>
                    </div>
                    <div className="ai-credit-summary-box">
                      <div className="ai-credit-row"><span className="ai-credit-label">Unit Price</span><span className="ai-credit-value">{fmtMoney(quote?.unit_price || summary?.ai_credit_unit_price)}</span></div>
                      <div className="ai-credit-row"><span className="ai-credit-label">Wallet Balance</span><span className="ai-credit-value">{fmtMoney(quote?.wallet_balance)}</span></div>
                    </div>
                    <div className="ai-credit-actions">
                      <button className="ai-credit-btn" disabled={!!buying || verifying || !canPayWithWallet} onClick={buyWithWallet}>
                        {buying === "wallet" ? "Processing..." : "Pay With Wallet"}
                      </button>
                      <button className="ai-credit-btn ai-credit-btn-paystack" disabled={!!buying || verifying} onClick={buyWithPaystack}>
                        {buying === "paystack" ? "Opening Paystack..." : "Pay With Paystack"}
                      </button>
                    </div>
                    {!canPayWithWallet && estimatedTotal > 0 && <p className="ai-credit-muted mt-2">Wallet payment is disabled because the wallet balance is lower than the selected amount.</p>}
                  </div>
                </div>
              </section>

              <aside className="ai-credit-card">
                <div className="ai-credit-pad">
                  <div className="ai-credit-head">
                    <div>
                      <h2 className="ai-credit-card-title">AI Tools</h2>
                      <p className="ai-credit-muted">Each successful AI generation deducts the configured credit cost.</p>
                    </div>
                  </div>

                  <div className="ai-credit-tool">
                    <div>
                      <div className="ai-credit-tool-title">Result Comment Generator</div>
                      <div className="ai-credit-tool-sub">Cost: {summary?.ai_result_comment_credit_cost ?? 0} credit(s) per generation.</div>
                    </div>
                    <button className="ai-credit-btn" onClick={() => navigate("/students/results/add")}>Open</button>
                  </div>

                  <div className="ai-credit-tool">
                    <div>
                      <div className="ai-credit-tool-title">CBT Question Generator</div>
                      <div className="ai-credit-tool-sub">Cost: {summary?.ai_cbt_question_credit_cost ?? 0} credit(s) per generation.</div>
                    </div>
                    <button className="ai-credit-btn" onClick={() => navigate("/cbt/exams")}>Open</button>
                  </div>
                  <div className="ai-credit-tool">
                    <div>
                      <div className="ai-credit-tool-title">Lesson Plan Generator</div>
                      <div className="ai-credit-tool-sub">Cost: {summary?.ai_lesson_plan_credit_cost ?? 0} credit(s) per generation.</div>
                    </div>
                    <button className="ai-credit-btn" onClick={() => navigate("/settings/ai-lesson-plans")}>Open</button>
                  </div>

                  <div className="ai-credit-tool">
                    <div>
                      <div className="ai-credit-tool-title">Fee Collection Assistant</div>
                      <div className="ai-credit-tool-sub">Cost: {summary?.ai_fee_collection_credit_cost ?? 0} credit(s) per analysis.</div>
                    </div>
                    <button className="ai-credit-btn" onClick={() => navigate("/fees/ai-collection")}>Open</button>
                  </div>

                  <div className="ai-credit-alert mt-3">
                    <i className="bi bi-info-circle mt-1" />
                    <div>AI credits are not WhatsApp credits. If AI credits are exhausted, WhatsApp messages will still work if WhatsApp credits are available.</div>
                  </div>
                </div>
              </aside>
            </div>

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}

