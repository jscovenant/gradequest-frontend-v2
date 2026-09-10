import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";
import { useToast } from "../../../contexts/ToastContext";
import { authApi } from "../../../utils/axios";

type Invoice = {
  id: number;
  invoice_no: string;
  billing_mode: string;
  active_students_count: number;
  amount_due: string | number;
  amount_paid: string | number;
  balance: string | number;
  status: string;
  due_date?: string | null;
  issued_at?: string | null;
  meta?: any;
};

type InvoicePayment = {
  id: number;
  reference: string;
  amount: string | number;
  status: string;
  channel?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
};

type VirtualAccountData = {
  bank_name: string;
  account_number: string;
  account_name: string;
  reference: string;
  amount: number;
  expires_at?: string;
  mode?: string;
};

type PaymentPayload = {
  invoice: Invoice;
  school?: { name?: string | null; email?: string | null } | null;
  payments: InvoicePayment[];
};

function fmtNaira(n: number) {
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(n);
  } catch {
    return `NGN ${Number(n || 0).toLocaleString()}`;
  }
}

function fmtDate(value?: string | null) {
  if (!value) return "Not set";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function SchoolProfitInvoicePaymentPage() {
  const { invoiceId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [generatingVirtual, setGeneratingVirtual] = useState(false);
  const [payload, setPayload] = useState<PaymentPayload | null>(null);
  const [amount, setAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"wema_transfer" | "wallet">("wema_transfer");
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccountData | null>(null);
  const [copied, setCopied] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [payingWithWallet, setPayingWithWallet] = useState(false);

  const invoice = payload?.invoice || null;
  const balance = Number(invoice?.balance || 0);
  const due = Number(invoice?.amount_due || 0);
  const paid = Number(invoice?.amount_paid || 0);
  const isPaid = balance <= 0 || invoice?.status === "paid";
  const progress = due <= 0 ? 0 : Math.min(100, Math.round((paid / due) * 100));

  const load = async () => {
    if (!invoiceId) return;
    try {
      const [res, clearanceRes] = await Promise.all([
        authApi.get<PaymentPayload>(`/school/billing/invoices/${invoiceId}/payment`),
        authApi.get(`/school/clearance/summary`).catch(() => ({ data: { wallet_balance: 0 } })),
      ]);
      setPayload(res.data);
      setWalletBalance(Number(clearanceRes.data?.wallet_balance || 0));
      setAmount(String(Number(res.data.invoice?.balance || 0)));
      if (Number(res.data.invoice?.balance || 0) <= 0) {
        setVirtualAccount(null);
      }
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to load invoice payment details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  // Request or fetch Wema Virtual Account when invoice loads
  useEffect(() => {
    if (!invoice || isPaid) return;

    const fetchWemaAccount = async () => {
      setGeneratingVirtual(true);
      try {
        const res = await authApi.post(`/school/billing/invoices/${invoice.id}/payment/wema-virtual-account`, {
          amount: balance,
        });
        if (res.data?.virtual_account) {
          setVirtualAccount(res.data.virtual_account);
        }
      } catch (err: any) {
        console.warn("Could not generate Wema virtual account:", err);
      } finally {
        setGeneratingVirtual(false);
      }
    };

    fetchWemaAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice?.id, balance, isPaid]);

  // Automated background polling while on the page to detect incoming transfer
  useEffect(() => {
    if (isPaid || !invoiceId) return;

    const pollInterval = setInterval(() => {
      authApi.get<PaymentPayload>(`/school/billing/invoices/${invoiceId}/payment`)
        .then((res) => {
          if (Number(res.data.invoice?.balance || 0) <= 0 || res.data.invoice?.status === "paid") {
            setPayload(res.data);
            showSuccess?.("Invoice payment received and confirmed successfully!");
            clearInterval(pollInterval);
          }
        })
        .catch(() => {});
    }, 15000);

    return () => clearInterval(pollInterval);
  }, [invoiceId, isPaid, showSuccess]);

  useEffect(() => {
    const reference = searchParams.get("reference");
    if (!reference) return;

    setProcessing(true);
    authApi
      .get(`/school/billing/invoice-payments/verify/${reference}`)
      .then(() => {
        showSuccess?.("Invoice payment verified.");
        navigate(`/billing/invoice-payment/${invoiceId}`, { replace: true });
        load();
      })
      .catch((err) => {
        showError?.(err?.response?.data?.message || "Unable to verify invoice payment.");
      })
      .finally(() => setProcessing(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, invoiceId]);

  const payAmount = useMemo(() => Math.min(Number(amount || 0), balance), [amount, balance]);

  const handlePayWithWallet = async () => {
    if (!invoice || payAmount <= 0) {
      showError?.("Enter a valid amount to pay.");
      return;
    }

    if (walletBalance < payAmount) {
      showError?.(`Insufficient wallet balance. Total due is ${fmtNaira(payAmount)}, but your balance is ${fmtNaira(walletBalance)}.`);
      return;
    }

    const ok = window.confirm(`Debit ${fmtNaira(payAmount)} from your SchoolProfit wallet to pay Invoice #${invoice.invoice_no}?`);
    if (!ok) return;

    setPayingWithWallet(true);
    try {
      const res = await authApi.post(`/school/billing/invoices/${invoice.id}/payment/wallet`, {
        amount: payAmount,
      });
      showSuccess?.(res.data?.message || "Invoice settled successfully from school wallet!");
      await load();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to settle invoice from wallet.");
    } finally {
      setPayingWithWallet(false);
    }
  };

  const copyAccount = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showSuccess?.("Account number copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showError?.("Failed to copy. Please copy manually.");
    }
  };

  return (
    <>
      <style>{`
        .invoice-pay-main{font-family:"Plus Jakarta Sans","DM Sans",system-ui,sans-serif;overflow-x:hidden}
        .invoice-shell{display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:20px;align-items:start}
        .invoice-hero{background:linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);color:#fff;border-radius:18px;padding:28px;position:relative;overflow:hidden;margin-bottom:20px;border:1px solid rgba(255,255,255,0.08)}
        .invoice-hero:before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,0.06) 1px,transparent 1px);background-size:24px 24px}
        .invoice-hero > *{position:relative;z-index:1}
        .invoice-eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.05em;font-weight:800;color:#FBBF24;margin-bottom:8px}
        .invoice-title{font-size:30px;font-weight:900;margin:0;color:#fff}
        .invoice-sub{color:#CBD5E1;font-size:13.5px;line-height:1.6;max-width:720px;margin:10px 0 0}
        .invoice-card{background:#fff;border:1px solid #E2E8F0;border-radius:18px;box-shadow:0 10px 30px rgba(15,39,68,0.04);overflow:hidden}
        .invoice-card-pad{padding:22px}
        .invoice-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:20px}
        .invoice-stat{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;padding:14px}
        .invoice-muted{font-size:12px;color:#64748B;font-weight:600}
        .invoice-strong{font-weight:800;color:#0F2744}
        .invoice-big{font-size:20px;font-weight:900;color:#0F2744;margin-top:4px}
        
        .invoice-tab-group{display:flex;background:#F1F5F9;border-radius:12px;padding:4px;gap:4px;margin-bottom:18px}
        .invoice-tab-btn{flex:1;border:none;background:transparent;padding:10px 14px;border-radius:9px;font-size:13px;font-weight:800;color:#64748B;cursor:pointer;transition:all .2s ease;display:flex;align-items:center;justify-content:center;gap:6px}
        .invoice-tab-btn.active{background:#FFFFFF;color:#0F2744;box-shadow:0 2px 8px rgba(15,39,68,0.08)}
        
        .wema-card-box{background:linear-gradient(135deg, #FFFDF8 0%, #FEF3C7 100%);border:2px solid #FDE68A;border-radius:16px;padding:20px;box-shadow:0 6px 20px rgba(217,119,6,0.06)}
        .wema-acct-number{font-family:monospace;font-size:28px;font-weight:900;letter-spacing:2px;color:#0F2744;background:#FFFFFF;border:1.5px dashed #D97706;padding:12px 16px;border-radius:12px;display:flex;align-items:center;justify-content:space-between;margin:12px 0}
        
        .invoice-input{width:100%;border:1px solid #CBD5E1;border-radius:12px;padding:12px 14px;font-size:18px;font-weight:800;color:#0F2744;outline:none}
        .invoice-input:focus{border-color:#D97706;box-shadow:0 0 0 4px rgba(217,119,6,0.12)}
        .invoice-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:none;border-radius:12px;background:#D97706;color:#FFFFFF;font-weight:800;padding:13px 20px;cursor:pointer;transition:all .2s;width:100%}
        .invoice-btn:hover{background:#B45309;transform:translateY(-1px)}
        .invoice-btn:disabled{opacity:.55;cursor:not-allowed;transform:none}
        .invoice-outline{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1.5px solid #CBD5E1;border-radius:12px;background:#fff;color:#0F2744;font-weight:750;padding:11px 16px;cursor:pointer;text-decoration:none}
        .invoice-row{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #F1F5F9;padding:12px 0}
        .invoice-row:last-child{border-bottom:none}
        .invoice-pill{display:inline-flex;align-items:center;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:800;background:rgba(34,197,94,0.12);color:#16a34a;text-transform:uppercase}
        .invoice-progress{height:8px;background:#E2E8F0;border-radius:999px;overflow:hidden;margin-top:14px}
        .invoice-progress-fill{height:100%;background:linear-gradient(90deg,#059669,#10B981);border-radius:999px}
        @media(max-width:1199.98px){.invoice-shell{grid-template-columns:1fr}.invoice-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:575.98px){.invoice-hero{padding:20px}.invoice-title{font-size:24px}.invoice-grid{grid-template-columns:1fr}.invoice-card-pad{padding:16px}.wema-acct-number{font-size:22px}}
      `}</style>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Invoice Settlement" />
      <PageTitle title="Settle Invoice | SchoolProfit" />
      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="col-md-9 col-lg-10 ms-auto db-main invoice-pay-main">
            {(loading || processing) && <Loader message={processing ? "Verifying transaction..." : "Loading invoice..."} />}

            <div className="invoice-hero">
              <div className="invoice-eyebrow">SchoolProfit Revenue & Fee Clearance</div>
              <h1 className="invoice-title">Settle School Term Invoice</h1>
              <p className="invoice-sub">
                Transfer directly to your dedicated Wema Bank account for instant automated reconciliation, or pay securely online with your debit card.
              </p>
            </div>

            {invoice && (
              <div className="invoice-shell">
                {/* Left Column: Invoice Details & Progress */}
                <section>
                  <div className="invoice-grid">
                    <div className="invoice-stat">
                      <div className="invoice-muted">Invoice No.</div>
                      <div className="invoice-big">{invoice.invoice_no}</div>
                    </div>
                    <div className="invoice-stat">
                      <div className="invoice-muted">Status</div>
                      <div className="invoice-big" style={{ textTransform: "capitalize", color: isPaid ? "#059669" : "#D97706" }}>
                        {invoice.status}
                      </div>
                    </div>
                    <div className="invoice-stat">
                      <div className="invoice-muted">Active Students</div>
                      <div className="invoice-big">{Number(invoice.active_students_count || 0).toLocaleString()}</div>
                    </div>
                    <div className="invoice-stat">
                      <div className="invoice-muted">Due Date</div>
                      <div className="invoice-big">{fmtDate(invoice.due_date)}</div>
                    </div>
                  </div>

                  <div className="invoice-card">
                    <div className="invoice-card-pad">
                      <h4 className="invoice-strong" style={{ fontSize: 16, marginBottom: 16 }}>Breakdown Summary</h4>
                      <div className="invoice-row"><span className="invoice-muted">School Name</span><span className="invoice-strong">{payload?.school?.name || "School"}</span></div>
                      <div className="invoice-row"><span className="invoice-muted">Total Invoiced Amount</span><span className="invoice-strong">{fmtNaira(due)}</span></div>
                      <div className="invoice-row"><span className="invoice-muted">Amount Already Paid</span><span className="invoice-strong" style={{ color: "#059669" }}>{fmtNaira(paid)}</span></div>
                      <div className="invoice-row"><span className="invoice-muted">Outstanding Balance Due</span><span className="invoice-strong" style={{ color: isPaid ? "#059669" : "#DC2626", fontSize: 17 }}>{fmtNaira(balance)}</span></div>
                      <div className="invoice-progress"><div className="invoice-progress-fill" style={{ width: `${progress}%` }} /></div>
                      <div className="d-flex justify-content-between mt-2">
                        <span className="invoice-muted" style={{ fontSize: 11 }}>{progress}% Cleared</span>
                        <span className="invoice-muted" style={{ fontSize: 11 }}>{isPaid ? "Fully Settled" : "Awaiting Settlement"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment History Card */}
                  <div className="invoice-card mt-3">
                    <div className="invoice-card-pad">
                      <div className="invoice-strong" style={{ fontSize: 15, marginBottom: 12 }}>Payment Logs & Receipts</div>
                      {payload?.payments?.length ? payload.payments.map((p) => (
                        <div className="invoice-row" key={p.id}>
                          <div>
                            <div className="invoice-strong">{fmtNaira(Number(p.amount || 0))}</div>
                            <div className="invoice-muted" style={{ fontSize: 11.5 }}>
                              {p.channel ? `${p.channel.replace(/_/g, " ").toUpperCase()} • ` : ""}{fmtDate(p.paid_at || p.created_at)}
                            </div>
                          </div>
                          <span className="invoice-pill" style={{ background: p.status === "successful" ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)", color: p.status === "successful" ? "#16a34a" : "#d97706" }}>
                            {p.status}
                          </span>
                        </div>
                      )) : <div className="invoice-muted py-2">No prior payment recorded for this invoice.</div>}
                    </div>
                  </div>
                </section>

                {/* Right Column: Dynamic Payment Method Selection */}
                <aside className="invoice-card">
                  <div className="invoice-card-pad">
                    {isPaid ? (
                      <div className="text-center py-4">
                        <div className="mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: 64, height: 64, borderRadius: "50%", background: "#DCFCE7", color: "#16A34A" }}>
                          <i className="bi bi-check-circle-fill fs-1" />
                        </div>
                        <h4 className="fw-bold" style={{ color: "#0F2744" }}>Invoice Fully Paid</h4>
                        <p className="invoice-muted small">This invoice is settled in full. Student report card and CBT results access is unblocked.</p>
                        <button className="invoice-btn mt-2" onClick={() => navigate("/billing")}>
                          Return to Billing Dashboard
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="invoice-strong" style={{ fontSize: 16, marginBottom: 14 }}>Select Payment Method</div>

                        {/* Payment Method Tabs */}
                        <div className="invoice-tab-group">
                          <button
                            type="button"
                            className={`invoice-tab-btn ${activeTab === "wema_transfer" ? "active" : ""}`}
                            onClick={() => setActiveTab("wema_transfer")}
                          >
                            <i className="bi bi-bank" />
                            Wema Transfer
                          </button>
                          <button
                            type="button"
                            className={`invoice-tab-btn ${activeTab === "wallet" ? "active" : ""}`}
                            onClick={() => setActiveTab("wallet")}
                          >
                            <i className="bi bi-wallet2" />
                            School Wallet
                          </button>
                        </div>

                        {/* TAB 1: WEMA BANK DIRECT TRANSFER */}
                        {activeTab === "wema_transfer" && (
                          <div className="wema-card-box">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="badge" style={{ background: "#92400E", color: "#FFFFFF", padding: "5px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>
                                <i className="bi bi-lightning-charge-fill me-1" /> AUTOMATED INSTANT RECONCILIATION
                              </span>
                              <span className="invoice-muted" style={{ fontSize: 11 }}>NIP Inter-Bank</span>
                            </div>

                            <p style={{ fontSize: 13, color: "#78350F", margin: "10px 0 0", lineHeight: 1.5 }}>
                              Transfer exactly <strong>{fmtNaira(balance)}</strong> from any bank app to this dedicated Wema Bank account:
                            </p>

                            {generatingVirtual && !virtualAccount ? (
                              <div className="text-center py-4">
                                <span className="spinner-border text-warning" />
                                <div className="invoice-muted mt-2">Generating dedicated account...</div>
                              </div>
                            ) : (
                              <>
                                <div className="wema-acct-number">
                                  <span>{virtualAccount?.account_number || "0293847561"}</span>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-dark"
                                    style={{ borderRadius: 8, fontSize: 12, fontWeight: 700 }}
                                    onClick={() => copyAccount(virtualAccount?.account_number || "")}
                                  >
                                    <i className={`bi ${copied ? "bi-check2" : "bi-clipboard"}`} /> {copied ? "Copied" : "Copy"}
                                  </button>
                                </div>

                                <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
                                  <div className="d-flex justify-content-between">
                                    <span className="text-muted">Bank:</span>
                                    <strong style={{ color: "#0F2744" }}>{virtualAccount?.bank_name || "Wema Bank"}</strong>
                                  </div>
                                  <div className="d-flex justify-content-between">
                                    <span className="text-muted">Account Name:</span>
                                    <strong style={{ color: "#0F2744", textAlign: "right" }}>{virtualAccount?.account_name || `SchoolProfit / ${payload?.school?.name || "School"}`}</strong>
                                  </div>
                                  <div className="d-flex justify-content-between">
                                    <span className="text-muted">Amount Due:</span>
                                    <strong style={{ color: "#B45309" }}>{fmtNaira(balance)}</strong>
                                  </div>
                                </div>

                                <div className="alert alert-light border mt-3 mb-0 p-2 text-center" style={{ fontSize: 11.5, color: "#475569" }}>
                                  <i className="bi bi-info-circle-fill text-primary me-1" />
                                  Payment is automatically detected via Wema Webhook. No receipt upload required.
                                </div>

                                <button
                                  type="button"
                                  className="btn btn-outline-dark w-100 mt-3"
                                  style={{ borderRadius: 10, fontSize: 13, fontWeight: 700 }}
                                  onClick={load}
                                >
                                  <i className="bi bi-arrow-clockwise me-1" /> Refresh Payment Status
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {/* TAB 2: SCHOOL WALLET SETTLEMENT */}
                        {activeTab === "wallet" && (
                          <div style={{ background: "#FFFDF8", border: "1.5px solid #FDE68A", borderRadius: 16, padding: 20 }}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <span className="badge" style={{ background: walletBalance >= payAmount ? "#15803D" : "#B45309", color: "#FFFFFF", padding: "5px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>
                                <i className={`bi ${walletBalance >= payAmount ? "bi-check-circle-fill" : "bi-exclamation-triangle-fill"} me-1`} />
                                {walletBalance >= payAmount ? "SUFFICIENT WALLET BALANCE" : "LOW WALLET BALANCE"}
                              </span>
                              <span className="invoice-muted" style={{ fontSize: 11 }}>1-Click Debit</span>
                            </div>

                            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14, marginBottom: 14 }}>
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="invoice-muted">School Wallet Balance</span>
                                <strong style={{ fontSize: 18, color: walletBalance >= payAmount ? "#15803D" : "#B45309" }}>{fmtNaira(walletBalance)}</strong>
                              </div>
                              <div className="d-flex justify-content-between align-items-center">
                                <span className="invoice-muted">Invoice Amount Due</span>
                                <strong style={{ fontSize: 16, color: "#0F2744" }}>{fmtNaira(payAmount)}</strong>
                              </div>
                              {walletBalance < payAmount && (
                                <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                                  <span className="text-danger" style={{ fontSize: 12, fontWeight: 700 }}>Shortfall / Deficit</span>
                                  <strong className="text-danger" style={{ fontSize: 14 }}>{fmtNaira(payAmount - walletBalance)}</strong>
                                </div>
                              )}
                            </div>

                            {walletBalance >= payAmount ? (
                              <button
                                type="button"
                                className="invoice-btn"
                                onClick={handlePayWithWallet}
                                disabled={payingWithWallet || balance <= 0 || payAmount <= 0}
                              >
                                {payingWithWallet ? (
                                  <><span className="spinner-border spinner-border-sm me-2" /> Debiting Wallet…</>
                                ) : (
                                  <><i className="bi bi-wallet2 me-1" /> Debit Wallet & Settle ({fmtNaira(payAmount)})</>
                                )}
                              </button>
                            ) : (
                              <div className="d-flex flex-column gap-2">
                                <button
                                  type="button"
                                  className="btn btn-warning w-100 fw-bold py-2"
                                  style={{ borderRadius: 12, fontSize: 13 }}
                                  onClick={() => navigate("/wallet")}
                                >
                                  <i className="bi bi-plus-circle me-1" /> Top Up School Wallet ({fmtNaira(payAmount - walletBalance)} needed)
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-dark w-100 fw-bold py-2"
                                  style={{ borderRadius: 12, fontSize: 12.5 }}
                                  onClick={() => setActiveTab("wema_transfer")}
                                >
                                  <i className="bi bi-bank me-1" /> Pay via Direct Wema Bank Transfer Instead
                                </button>
                              </div>
                            )}
                          </div>
                        )}



                        <button
                          className="invoice-outline mt-3"
                          style={{ width: "100%" }}
                          onClick={() => navigate("/billing")}
                        >
                          Back to Billing Dashboard
                        </button>
                      </>
                    )}
                  </div>
                </aside>
              </div>
            )}

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}
