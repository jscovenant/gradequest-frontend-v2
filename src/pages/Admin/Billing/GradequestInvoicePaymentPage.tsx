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

export default function GradequestInvoicePaymentPage() {
  const { invoiceId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [payload, setPayload] = useState<PaymentPayload | null>(null);
  const [amount, setAmount] = useState("");

  const invoice = payload?.invoice || null;
  const balance = Number(invoice?.balance || 0);
  const due = Number(invoice?.amount_due || 0);
  const paid = Number(invoice?.amount_paid || 0);
  const progress = due <= 0 ? 0 : Math.min(100, Math.round((paid / due) * 100));

  const load = async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const res = await authApi.get<PaymentPayload>(`/school/billing/invoices/${invoiceId}/payment`);
      setPayload(res.data);
      setAmount(String(Number(res.data.invoice?.balance || 0)));
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

  const initializePayment = async () => {
    if (!invoice || payAmount <= 0) {
      showError?.("Enter a valid amount to pay.");
      return;
    }

    setProcessing(true);
    try {
      const res = await authApi.post(`/school/billing/invoices/${invoice.id}/payment/initialize`, {
        amount: payAmount,
      });

      window.location.href = res.data.authorization_url;
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to initialize invoice payment.");
      setProcessing(false);
    }
  };

  return (
    <>
      <style>{`
        .invoice-pay-main{font-family:"DM Sans",system-ui,sans-serif;overflow-x:hidden}
        .invoice-shell{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:20px;align-items:start}
        .invoice-hero{background:#050008;color:#fff;border-radius:18px;padding:28px;position:relative;overflow:hidden;margin-bottom:20px;border:1px solid rgba(255,255,255,0.08)}
        .invoice-hero:before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,0.06) 1px,transparent 1px);background-size:24px 24px}
        .invoice-hero > *{position:relative;z-index:1}
        .invoice-eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:0;font-weight:800;color:rgb(255,200,87);margin-bottom:8px}
        .invoice-title{font-family:"Lora",serif;font-size:34px;font-weight:900;margin:0}
        .invoice-sub{color:rgba(255,255,255,0.58);font-size:13px;line-height:1.6;max-width:720px;margin:10px 0 0}
        .invoice-card{background:#fff;border:1px solid rgba(5,0,8,0.08);border-radius:16px;box-shadow:0 12px 34px rgba(5,0,8,0.06);overflow:hidden}
        .invoice-card-pad{padding:20px}
        .invoice-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:20px}
        .invoice-stat{background:#faf8f5;border:1px solid rgba(5,0,8,0.06);border-radius:13px;padding:14px}
        .invoice-muted{font-size:12px;color:#9a8a7a}
        .invoice-strong{font-weight:850;color:#1a1a2e}
        .invoice-big{font-family:"Lora",serif;font-size:22px;font-weight:900;color:#1a1a2e;margin-top:4px}
        .invoice-paybox{background:linear-gradient(135deg,#fff,#fff8e6);border:1px solid rgba(255,200,87,0.35);border-radius:16px;padding:20px}
        .invoice-input{width:100%;border:1px solid rgba(5,0,8,0.12);border-radius:12px;padding:12px 14px;font-size:18px;font-weight:800;color:#1a1a2e;outline:none}
        .invoice-input:focus{border-color:rgba(211,0,176,0.42);box-shadow:0 0 0 4px rgba(211,0,176,0.08)}
        .invoice-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:none;border-radius:11px;background:rgb(255,200,87);color:#050008;font-weight:850;padding:12px 18px;cursor:pointer;transition:transform .2s,filter .2s;width:100%}
        .invoice-btn:hover{filter:brightness(1.03);transform:translateY(-1px)}
        .invoice-btn:disabled{opacity:.55;cursor:not-allowed;transform:none}
        .invoice-outline{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid rgba(5,0,8,0.12);border-radius:11px;background:#fff;color:#1a1a2e;font-weight:750;padding:11px 16px;cursor:pointer;text-decoration:none}
        .invoice-row{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(5,0,8,0.06);padding:13px 0}
        .invoice-row:last-child{border-bottom:none}
        .invoice-pill{display:inline-flex;align-items:center;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:850;background:rgba(34,197,94,0.12);color:#16a34a;text-transform:uppercase}
        .invoice-progress{height:9px;background:#f0ebe3;border-radius:999px;overflow:hidden;margin-top:14px}
        .invoice-progress-fill{height:100%;background:linear-gradient(90deg,#d300b0,rgb(255,200,87));border-radius:999px}
        @media(max-width:1199.98px){.invoice-shell{grid-template-columns:1fr}.invoice-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:575.98px){.invoice-hero{padding:22px}.invoice-title{font-size:26px}.invoice-grid{grid-template-columns:1fr}.invoice-card-pad{padding:16px}}
      `}</style>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Invoice Payment" />
      <PageTitle title="GradeQuest Invoice Payment" />
      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="col-md-9 col-lg-10 ms-auto db-main invoice-pay-main">
            {(loading || processing) && <Loader message={processing ? "Processing invoice payment..." : "Loading invoice..."} />}

            <div className="invoice-hero">
              <div className="invoice-eyebrow">GradeQuest revenue invoice</div>
              <h1 className="invoice-title">Settle Invoice</h1>
              <p className="invoice-sub">
                This page is for GradeQuest term invoices and online-to-offline transition invoices. Package upgrades still happen on the normal checkout page.
              </p>
            </div>

            {invoice && (
              <div className="invoice-shell">
                <section>
                  <div className="invoice-grid">
                    <div className="invoice-stat"><div className="invoice-muted">Invoice</div><div className="invoice-big">{invoice.invoice_no}</div></div>
                    <div className="invoice-stat"><div className="invoice-muted">Status</div><div className="invoice-big">{invoice.status}</div></div>
                    <div className="invoice-stat"><div className="invoice-muted">Active Students</div><div className="invoice-big">{Number(invoice.active_students_count || 0).toLocaleString()}</div></div>
                    <div className="invoice-stat"><div className="invoice-muted">Due Date</div><div className="invoice-big">{fmtDate(invoice.due_date)}</div></div>
                  </div>

                  <div className="invoice-card">
                    <div className="invoice-card-pad">
                      <div className="invoice-row"><span className="invoice-muted">School</span><span className="invoice-strong">{payload?.school?.name || "School"}</span></div>
                      <div className="invoice-row"><span className="invoice-muted">Amount Due</span><span className="invoice-strong">{fmtNaira(due)}</span></div>
                      <div className="invoice-row"><span className="invoice-muted">Amount Paid</span><span className="invoice-strong">{fmtNaira(paid)}</span></div>
                      <div className="invoice-row"><span className="invoice-muted">Balance</span><span className="invoice-strong">{fmtNaira(balance)}</span></div>
                      <div className="invoice-progress"><div className="invoice-progress-fill" style={{ width: `${progress}%` }} /></div>
                    </div>
                  </div>
                </section>

                <aside className="invoice-card">
                  <div className="invoice-card-pad">
                    <div className="invoice-paybox">
                      <div className="invoice-muted">Payment amount</div>
                      <input className="invoice-input mt-2" type="number" min="100" max={balance} value={amount} onChange={(e)=>setAmount(e.target.value)} disabled={balance <= 0 || processing} />
                      <div className="invoice-muted" style={{ marginTop: 8 }}>You can make full or partial invoice payment through Paystack.</div>
                      <button className="invoice-btn mt-3" onClick={initializePayment} disabled={balance <= 0 || payAmount <= 0 || processing}>
                        <i className="bi bi-credit-card" />
                        {balance <= 0 ? "Invoice Paid" : `Pay ${fmtNaira(payAmount)}`}
                      </button>
                      <button className="invoice-outline mt-2" style={{ width: "100%" }} onClick={() => navigate("/billing")}>
                        Back to Billing
                      </button>
                    </div>

                    <div style={{ marginTop: 20 }}>
                      <div className="invoice-strong" style={{ marginBottom: 8 }}>Recent payments</div>
                      {payload.payments.length ? payload.payments.slice(0, 5).map((p) => (
                        <div className="invoice-row" key={p.id}>
                          <div>
                            <div className="invoice-strong">{fmtNaira(Number(p.amount || 0))}</div>
                            <div className="invoice-muted">{fmtDate(p.paid_at || p.created_at)}</div>
                          </div>
                          <span className="invoice-pill">{p.status}</span>
                        </div>
                      )) : <div className="invoice-muted">No invoice payment recorded yet.</div>}
                    </div>
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
