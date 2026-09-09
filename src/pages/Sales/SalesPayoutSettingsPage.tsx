import { FormEvent, useEffect, useState } from "react";
import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import { useToast } from "../../contexts/ToastContext";
import { authApi } from "../../utils/axios";
import "./SalesWorkspace.css";
import { currency, fmtDate } from "./salesApi";

type Rep = {
  id: number;
  code: string;
  name: string;
  email?: string | null;
  commission_rate: number;
  bank_name?: string | null;
  bank_code?: string | null;
  account_number?: string | null;
  account_name?: string | null;
  paystack_recipient_code?: string | null;
  payout_verified_at?: string | null;
  pending_commission: number;
  approved_commission: number;
  paid_commission: number;
};

type Bank = {
  name: string;
  code: string;
};

type Payout = {
  id: number;
  reference: string;
  total_amount: number;
  commission_count: number;
  status: string;
  initiated_at?: string | null;
  paid_at?: string | null;
  failure_reason?: string | null;
};

export default function SalesPayoutSettingsPage() {
  const { showSuccess, showError } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifyingAccount, setVerifyingAccount] = useState(false);
  const [rep, setRep] = useState<Rep | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [resolvedName, setResolvedName] = useState("");
  const [form, setForm] = useState({ bank_name: "", bank_code: "", account_number: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [profileRes, banksRes] = await Promise.all([
        authApi.get("/sales/payout-profile"),
        authApi.get("/banks"),
      ]);

      const representative = profileRes.data?.representative || null;
      const bankList = (banksRes.data || [])
        .map((bank: any) => ({ name: bank.name, code: bank.code }))
        .filter((bank: Bank) => bank.name && bank.code);

      setRep(representative);
      setBanks(bankList);
      setPayouts(profileRes.data?.payouts || []);
      setResolvedName(representative?.account_name || "");
      setForm({
        bank_name: representative?.bank_name || "",
        bank_code: representative?.bank_code || "",
        account_number: "",
      });
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to load payout settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const accountNumber = form.account_number.trim();
    const bankCode = form.bank_code.trim();

    if (!bankCode || accountNumber.length !== 10) {
      setResolvedName(rep?.account_name || "");
      return;
    }

    const timer = window.setTimeout(async () => {
      setVerifyingAccount(true);
      try {
        const res = await authApi.get("/bank-account/verify", {
          params: { bank_code: bankCode, account_number: accountNumber },
        });
        setResolvedName(res.data?.account_name || "");
      } catch {
        setResolvedName("");
      } finally {
        setVerifyingAccount(false);
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [form.bank_code, form.account_number, rep?.account_name]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await authApi.post("/sales/payout-profile/bank", form);
      showSuccess?.(res.data?.message || "Payout bank verified successfully.");
      await load();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Could not verify payout bank account.");
    } finally {
      setSaving(false);
    }
  };

  return <><TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Payout Settings" />
    <div className="container-fluid"><div className="row"><Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <main className="col-md-9 col-lg-10 ms-auto db-main sales-work-main">{loading && <Loader message="Loading payout settings..." />}<div className="sales-work-shell">
        <section className="sales-work-hero"><div><div className="sales-work-eyebrow"><i className="bi bi-bank" /> Payout account</div><h1>My Payout Settings</h1><p>Add and verify the bank account where SchoolProfit will send your approved sales commissions.</p></div><div className="sales-work-actions"><button className="sales-work-btn sales-work-btn-light" onClick={load}><i className="bi bi-arrow-repeat" /> Refresh</button></div></section>

        {rep && <section className="sales-work-grid"><article className="sales-work-card"><span className="sales-work-icon"><i className="bi bi-hourglass-split" /></span><div><p>Pending</p><h3>{currency.format(rep.pending_commission)}</h3><small>Awaiting approval</small></div></article><article className="sales-work-card"><span className="sales-work-icon"><i className="bi bi-check-circle" /></span><div><p>Approved</p><h3>{currency.format(rep.approved_commission)}</h3><small>Ready for payout</small></div></article><article className="sales-work-card"><span className="sales-work-icon"><i className="bi bi-wallet2" /></span><div><p>Paid</p><h3>{currency.format(rep.paid_commission)}</h3><small>Received payout</small></div></article><article className="sales-work-card"><span className="sales-work-icon"><i className="bi bi-shield-check" /></span><div><p>Bank Status</p><h3>{rep.paystack_recipient_code ? "Verified" : "Not Set"}</h3><small>{rep.payout_verified_at ? fmtDate(rep.payout_verified_at) : "Add bank details"}</small></div></article></section>}

        <section className="sales-work-panel"><div className="sales-work-head"><div><h2>Bank Details</h2><p>Select your bank and enter your account number. The verified account name will appear automatically.</p></div>{rep?.account_name && <span className="sales-work-pill sales-work-green">{rep.account_name}</span>}</div>
          <form className="sales-work-form" onSubmit={submit}><label>Bank<select value={form.bank_code} onChange={(e) => { const bank = banks.find((item) => item.code === e.target.value); setForm({ ...form, bank_code: e.target.value, bank_name: bank?.name || "" }); }} required><option value="">Select bank</option>{banks.map((bank) => <option key={bank.code} value={bank.code}>{bank.name}</option>)}</select></label><label>Account Number<input value={form.account_number} maxLength={10} onChange={(e) => setForm({ ...form, account_number: e.target.value.replace(/\D/g, "") })} placeholder="10 digit account number" required /></label><label>Verified Account Name<input value={verifyingAccount ? "Checking account name..." : resolvedName} readOnly placeholder="Account name will appear here" /></label><div className="sales-work-form-actions"><button className="sales-work-btn sales-work-btn-primary" type="submit" disabled={saving || verifyingAccount || !resolvedName}>{saving ? "Verifying..." : "Verify & Save Bank"}</button></div></form>
        </section>

        <section className="sales-work-panel"><div className="sales-work-head"><div><h2>Payout History</h2><p>Track every transfer. A payout is only paid after Paystack confirms it.</p></div></div><div className="sales-work-table-wrap"><table className="sales-work-table"><thead><tr><th>Reference</th><th>Status</th><th>Amount</th><th>Items</th><th>Initiated</th><th>Paid</th></tr></thead><tbody>{payouts.map((item) => <tr key={item.id}><td><strong>{item.reference}</strong><br /><small>{item.failure_reason || ""}</small></td><td><span className={`sales-work-pill ${item.status === "paid" ? "sales-work-green" : ["failed", "reversed"].includes(item.status) ? "sales-work-red" : "sales-work-gold"}`}>{item.status.replaceAll("_", " ")}</span></td><td>{currency.format(Number(item.total_amount || 0))}</td><td>{item.commission_count}</td><td>{fmtDate(item.initiated_at)}</td><td>{fmtDate(item.paid_at)}</td></tr>)}</tbody></table>{!loading && payouts.length === 0 && <div className="sales-work-empty">No payout has been created yet.</div>}</div></section>
        <Footer /></div></main>
    </div></div></>;
}
