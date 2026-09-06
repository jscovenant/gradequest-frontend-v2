import { useEffect, useMemo, useState } from "react";
import { publicApi } from "../utils/axios";
import PageTitle from "../components/PageTitle";

type SchoolInfo = {
  id: number;
  name: string;
  code: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  logo?: string | null;
};

type StudentInfo = {
  id: number;
  name: string;
  reg_no: string;
  class?: string | null;
  section?: string | null;
};

type FeeItem = {
  id: number;
  name: string;
  session?: string | null;
  term?: string | null;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: string;
};

type InstallmentPlan = {
  enabled: boolean;
  installment_type: string;
  min_initial_percent: number;
  min_initial_amount: number;
  min_payable_now: number;
  presets: Array<{ label: string; percent: number; amount: number }>;
  message: string;
};

type ChargePolicy = {
  bank_charge_bearer: "parent" | "school";
  bank_charge_amount: number;
  platform_fee_bearer: "parent" | "school";
  platform_fee_amount: number;
  active_gateway?: string;
};

type VirtualAccountInfo = {
  account_number: string;
  account_name: string;
  bank_name: string;
  amount: number;
  expiry_date?: string;
  note?: string;
};

type StudentLookupResponse = {
  school: SchoolInfo;
  student: StudentInfo;
  summary: {
    total_amount: number;
    amount_paid: number;
    balance: number;
    outstanding_items: number;
  };
  installment_plan?: InstallmentPlan;
  charge_policy?: ChargePolicy;
  fees: FeeItem[];
};

type ReceiptData = {
  school?: { school_name?: string; name?: string; address?: string; email?: string; phone?: string; logo?: string };
  student?: { firstname?: string; surname?: string; name?: string; reg_no?: string; class?: string; level?: { name?: string }; section?: { name?: string } };
  reference: string;
  receipt_no: string;
  paid_at: string;
  payer_name?: string;
  payer_email?: string;
  amount: number;
  remaining_balance?: number;
  items: Array<{ name: string; session?: string; term?: string; amount: number }>;
  pdf_download_url?: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(value || 0));

export default function PublicFeePaymentPage() {
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialReference = query.get("paymentReference") || query.get("reference") || query.get("trxref") || query.get("ref") || "";
  const initialSchoolCode = query.get("school_code") || "";
  const initialRegNo = query.get("student_reg_no") || query.get("reg_no") || "";

  const [schoolCode, setSchoolCode] = useState(initialSchoolCode);
  const [studentRegNo, setStudentRegNo] = useState(initialRegNo);
  const [amount, setAmount] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");

  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [studentData, setStudentData] = useState<StudentLookupResponse | null>(null);
  const [schoolLoading, setSchoolLoading] = useState(false);
  const [studentLoading, setStudentLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const [virtualAccount, setVirtualAccount] = useState<VirtualAccountInfo | null>(null);
  const [activeReference, setActiveReference] = useState<string>("");
  const [checkoutUrl, setCheckoutUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const balance = Number(studentData?.summary?.balance || 0);
  const numAmount = Number(amount || 0);

  const chargePolicy = studentData?.charge_policy;
  const isParentBankBearer = chargePolicy?.bank_charge_bearer === "parent";
  const isParentPlatformBearer = chargePolicy?.platform_fee_bearer === "parent";
  const bankChargeAmount = isParentBankBearer && numAmount > 0 ? Number(chargePolicy?.bank_charge_amount ?? 200) : 0;
  const platformFeeAmount = isParentPlatformBearer && numAmount > 0 ? Number(chargePolicy?.platform_fee_amount ?? 500) : 0;
  const totalPayableWithSurcharges = numAmount + bankChargeAmount + platformFeeAmount;

  const canPay = !!school && !!studentData && numAmount >= 100 && numAmount <= (balance > 0 ? balance : Infinity) && !paying;

  // Handle Payment Verification on Return
  useEffect(() => {
    if (!initialReference) return;

    setVerifying(true);
    setError(null);
    setMessage(null);

    publicApi
      .get(`/public/fee-payment/verify/${encodeURIComponent(initialReference)}`)
      .then((res) => {
        setMessage(`Payment confirmed. Transaction Reference: ${res.data?.reference}`);
        if (res.data?.receipt) {
          setReceiptData({
            ...res.data.receipt,
            pdf_download_url: res.data.pdf_download_url,
          });
        }
      })
      .catch((err) => {
        setError(err?.response?.data?.message || "Unable to verify payment transaction. Please contact school bursary if debited.");
      })
      .finally(() => setVerifying(false));
  }, [initialReference]);

  // Lookup School by Code
  useEffect(() => {
    const value = schoolCode.trim();
    if (value.length < 2) {
      setSchool(null);
      setStudentData(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setSchoolLoading(true);
      setError(null);

      publicApi
        .get("/public/fee-payment/school", { params: { school_code: value } })
        .then((res) => {
          if (res.data?.school) {
            setSchool(res.data.school);
          }
        })
        .catch((err) => {
          setSchool(null);
          setError(err?.response?.data?.message || "School code not found. Please check your school ID/code.");
        })
        .finally(() => setSchoolLoading(false));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [schoolCode]);

  // Lookup Student by Reg No
  useEffect(() => {
    const schoolValue = schoolCode.trim();
    const studentValue = studentRegNo.trim();
    if (!schoolValue || !studentValue || studentValue.length < 2) {
      setStudentData(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setStudentLoading(true);
      setError(null);

      publicApi
        .get<StudentLookupResponse>("/public/fee-payment/student", {
          params: { school_code: schoolValue, student_reg_no: studentValue },
        })
        .then((res) => {
          setStudentData(res.data);
          if (res.data?.school) setSchool(res.data.school);
          if (!amount && Number(res.data?.summary?.balance || 0) > 0) {
            setAmount(String(res.data.summary.balance));
          }
        })
        .catch((err) => {
          setStudentData(null);
          setError(err?.response?.data?.message || "Student record was not found for this school admission number.");
        })
        .finally(() => setStudentLoading(false));
    }, 450);

    return () => window.clearTimeout(timer);
  }, [schoolCode, studentRegNo]);

  const initializePayment = async (gatewayOverride?: string | unknown) => {
    if (!canPay) return;

    const chosenGateway = typeof gatewayOverride === "string" ? gatewayOverride : undefined;

    setPaying(true);
    setError(null);
    setMessage(null);

    try {
      const res = await publicApi.post("/public/fee-payment/initialize", {
        school_code: schoolCode.trim(),
        student_reg_no: studentRegNo.trim(),
        amount: Number(amount),
        payer_email: payerEmail.trim() || undefined,
        payer_name: payerName.trim() || undefined,
        payer_phone: payerPhone.trim() || undefined,
        gateway: chosenGateway,
      });

      if (res.data?.virtual_account && !chosenGateway) {
        setVirtualAccount(res.data.virtual_account);
        setActiveReference(res.data.reference || "");
        setCheckoutUrl(res.data.checkout_url || res.data.authorization_url || "");
        setMessage("Dedicated Wema Bank Virtual Account generated. You can transfer funds directly from your bank mobile app.");
      } else {
        const gatewayUrl = res.data?.checkout_url || res.data?.authorization_url;
        if (gatewayUrl) {
          window.location.href = gatewayUrl;
        } else {
          throw new Error("Payment gateway checkout URL was not received.");
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Unable to initialize secure payment. Please verify details and try again.");
    } finally {
      setPaying(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!receiptData?.reference) return;
    const downloadUrl = receiptData.pdf_download_url || `/api/public/fee-payment/receipt/${encodeURIComponent(receiptData.reference)}/pdf`;
    window.open(downloadUrl, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleResetForNewPayment = () => {
    setReceiptData(null);
    setVirtualAccount(null);
    setActiveReference("");
    setCheckoutUrl("");
    setMessage(null);
    setError(null);
    setAmount("");
    const url = new URL(window.location.href);
    url.searchParams.delete("reference");
    url.searchParams.delete("trxref");
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <main className="gq-sec-page">
      <PageTitle title="Pay School Fees Online | SchoolProfit" />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,800;1,600&display=swap');

        .gq-sec-page {
          min-height: 100vh;
          background: #F8FAFC;
          color: #0F172A;
          padding: 24px 16px 60px;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        }

        .gq-sec-shell {
          max-width: 1140px;
          margin: 0 auto;
        }

        /* ── Top Bar ── */
        .gq-sec-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 12px 24px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
        }

        .gq-sec-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 800;
          font-size: 15px;
          color: #0F172A;
        }

        .gq-sec-badge-row {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 12px;
          color: #475569;
          font-weight: 600;
        }

        .gq-sec-badge-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .gq-sec-badge-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }

        /* ── Hero Banner ── */
        .gq-sec-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 20px;
          padding: 32px 36px;
          color: #FFFFFF;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 16px 36px rgba(15, 39, 68, 0.18);
          margin-bottom: 24px;
        }

        .gq-sec-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
        }

        .gq-sec-hero > * {
          position: relative;
          z-index: 1;
        }

        .gq-sec-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(245, 158, 11, 0.16);
          border: 1px solid rgba(245, 158, 11, 0.35);
          color: #FBBF24;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 11.5px;
          font-weight: 800;
          margin-bottom: 14px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .gq-sec-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(24px, 3.8vw, 36px);
          font-weight: 900;
          line-height: 1.15;
          margin: 0 0 10px;
          color: #FFFFFF;
        }

        .gq-sec-sub {
          max-width: 680px;
          color: #CBD5E1;
          font-size: 14px;
          line-height: 1.65;
          margin: 0;
        }

        /* ── Reassurance Pillars ── */
        .gq-sec-trust-bar {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 24px;
        }

        .gq-sec-trust-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
        }

        .gq-sec-trust-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #EFF6FF;
          color: #1D4ED8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          margin-bottom: 10px;
        }

        .gq-sec-trust-title {
          font-weight: 800;
          font-size: 13px;
          color: #0F172A;
          margin-bottom: 4px;
        }

        .gq-sec-trust-desc {
          font-size: 11.5px;
          color: #64748B;
          line-height: 1.5;
          margin: 0;
        }

        /* ── Main Layout ── */
        .gq-sec-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(340px, 0.85fr);
          gap: 24px;
          align-items: start;
        }

        .gq-sec-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 18px;
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.04);
          overflow: hidden;
        }

        .gq-sec-card-head {
          padding: 20px 24px;
          border-bottom: 1px solid #F1F5F9;
          background: #FAFCFF;
        }

        .gq-sec-card-title {
          font-size: 17px;
          font-weight: 800;
          color: #0F172A;
          margin: 0 0 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .gq-sec-card-sub {
          font-size: 12.5px;
          color: #64748B;
          margin: 0;
        }

        .gq-sec-card-body {
          padding: 24px;
        }

        /* ── Verified School Badge ── */
        .gq-school-profile {
          background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
          border: 1px solid #86EFAC;
          border-radius: 14px;
          padding: 16px 18px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .gq-school-avatar {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #FFFFFF;
          border: 1px solid #86EFAC;
          color: #166534;
          font-weight: 900;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 10px rgba(22, 101, 52, 0.08);
        }

        .gq-school-meta-title {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #15803D;
          margin-bottom: 2px;
        }

        .gq-school-name {
          font-size: 16.5px;
          font-weight: 900;
          color: #064E3B;
          margin: 0 0 2px;
        }

        .gq-school-address {
          font-size: 12px;
          color: #166534;
        }

        /* ── Form Controls ── */
        .gq-form-group {
          margin-bottom: 18px;
        }

        .gq-form-label {
          display: block;
          font-size: 12.5px;
          font-weight: 800;
          color: #334155;
          margin-bottom: 6px;
        }

        .gq-input {
          width: 100%;
          min-height: 46px;
          border: 1.5px solid #CBD5E1;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 14.5px;
          font-weight: 600;
          color: #0F172A;
          background: #FFFFFF;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }

        .gq-input:focus {
          border-color: #1D4ED8;
          box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.12);
        }

        .gq-form-hint {
          font-size: 12px;
          color: #64748B;
          margin-top: 5px;
        }

        .gq-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .gq-amount-presets {
          display: flex;
          gap: 8px;
          margin-top: 8px;
          flex-wrap: wrap;
        }

        .gq-preset-btn {
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 700;
          color: #334155;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .gq-preset-btn:hover {
          background: #E2E8F0;
          color: #0F172A;
        }

        .gq-pay-btn {
          width: 100%;
          min-height: 52px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #0F2744 0%, #1E3A8A 100%);
          color: #FFFFFF;
          font-size: 15.5px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
          box-shadow: 0 8px 24px rgba(15, 39, 68, 0.2);
          margin-top: 8px;
        }

        .gq-pay-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(15, 39, 68, 0.28);
        }

        .gq-pay-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
        }

        .gq-pay-notice {
          font-size: 11.5px;
          color: #64748B;
          text-align: center;
          margin-top: 10px;
          line-height: 1.5;
        }

        /* ── Right Panel ── */
        .gq-summary-box {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 18px;
        }

        .gq-stat-tile {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 12px;
        }

        .gq-stat-label {
          font-size: 11px;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .gq-stat-val {
          font-weight: 900;
          font-size: 16px;
          color: #0F172A;
        }

        .gq-stat-val-danger { color: #DC2626; }
        .gq-stat-val-success { color: #16A34A; }

        .gq-fee-list {
          display: grid;
          gap: 10px;
          max-height: 380px;
          overflow-y: auto;
        }

        .gq-fee-item {
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 12px 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          background: #FFFFFF;
        }

        .gq-fee-name {
          font-weight: 800;
          font-size: 13.5px;
          color: #0F172A;
        }

        .gq-fee-meta {
          font-size: 12px;
          color: #64748B;
          margin-top: 2px;
        }

        .gq-fee-balance {
          font-weight: 900;
          font-size: 14px;
          color: #0F172A;
          text-align: right;
          white-space: nowrap;
        }

        /* ── Official Stamped Receipt Card ── */
        .gq-receipt-card {
          background: #FFFFFF;
          border: 2px solid #10B981;
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 16px 40px rgba(16, 185, 129, 0.12);
        }

        .gq-receipt-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0F172A;
          padding-bottom: 18px;
          margin-bottom: 20px;
        }

        .gq-receipt-verified-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ECFDF5;
          color: #047857;
          border: 1px solid #A7F3D0;
          border-radius: 999px;
          padding: 4px 14px;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .gq-receipt-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 18px;
          margin-bottom: 20px;
        }

        .gq-receipt-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 18px;
        }

        .gq-receipt-table th {
          background: #0F2744;
          color: #FFFFFF;
          padding: 10px 14px;
          font-size: 11.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-align: left;
        }

        .gq-receipt-table td {
          padding: 11px 14px;
          border-bottom: 1px solid #E2E8F0;
          font-size: 13px;
        }

        .gq-receipt-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 24px;
        }

        .gq-btn-download {
          background: #047857;
          color: #FFFFFF;
          border: none;
          border-radius: 12px;
          padding: 12px 20px;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: background 0.15s ease;
        }

        .gq-btn-download:hover { background: #065F46; }

        .gq-btn-print {
          background: #FFFFFF;
          color: #0F172A;
          border: 1px solid #CBD5E1;
          border-radius: 12px;
          padding: 12px 20px;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .gq-btn-reset {
          background: transparent;
          color: #475569;
          border: 1px dashed #CBD5E1;
          border-radius: 12px;
          padding: 12px 20px;
          font-weight: 700;
          font-size: 13.5px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        /* ── Alert Notices ── */
        .gq-alert-warn {
          background: #FFFBEB;
          border: 1px solid #FDE68A;
          color: #92400E;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 13px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .gq-alert-error {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #991B1B;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 13px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .gq-alert-success {
          background: #F0FDF4;
          border: 1px solid #BBF7D0;
          color: #166534;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 13px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        @media (max-width: 900px) {
          .gq-sec-grid { grid-template-columns: 1fr; }
          .gq-sec-trust-bar { grid-template-columns: 1fr 1fr; }
          .gq-form-row { grid-template-columns: 1fr; }
          .gq-sec-topbar { flex-direction: column; align-items: flex-start; gap: 10px; }
          .gq-receipt-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 600px) {
          .gq-sec-trust-bar { grid-template-columns: 1fr; }
          .gq-summary-box { grid-template-columns: 1fr; }
        }

        @media print {
          body * { visibility: hidden; }
          .gq-receipt-card, .gq-receipt-card * { visibility: visible; }
          .gq-receipt-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none;
            box-shadow: none;
            padding: 0;
          }
          .gq-receipt-actions { display: none !important; }
        }
      `}</style>

      <div className="gq-sec-shell">
        {/* ── Top Bar ── */}
        <div className="gq-sec-topbar">
          <div className="gq-sec-brand">
            <i className="bi bi-shield-lock-fill text-success" style={{ fontSize: 20 }} />
            <span>SchoolProfit Official Electronic Payment Gateway</span>
          </div>
          <div className="gq-sec-badge-row">
            <div className="gq-sec-badge-item">
              <span className="gq-sec-badge-dot" />
              <span>Encrypted</span>
            </div>
            <div className="gq-sec-badge-item d-none d-sm-flex">
              <i className="bi bi-bank" />
              <span>Direct Bank Settlement</span>
            </div>
            <div className="gq-sec-badge-item d-none d-md-flex">
              <i className="bi bi-file-earmark-check" />
              <span>Instant Digital Receipt</span>
            </div>
          </div>
        </div>

        {/* ── Hero Section ── */}
        <section className="gq-sec-hero">
          <div>
            <div className="gq-sec-pill">
              <i className="bi bi-patch-check-fill" /> Official Verified School Fee Portal
            </div>
            <h1 className="gq-sec-title">Pay School Fees Online</h1>
            <p className="gq-sec-sub">
              Enter your school ID code and student admission number below to view the itemized fee schedule and make an authentic, instant, and confidential payment.
            </p>
          </div>
        </section>

        {/* ── 4 Reassurance Pillars ── */}
        <section className="gq-sec-trust-bar">
          <div className="gq-sec-trust-card">
            <div className="gq-sec-trust-icon"><i className="bi bi-shield-check" /></div>
            <div className="gq-sec-trust-title">Direct School Credit</div>
            <p className="gq-sec-trust-desc">All payments settle directly into the verified school bank account.</p>
          </div>
          <div className="gq-sec-trust-card">
            <div className="gq-sec-trust-icon"><i className="bi bi-lock-fill" /></div>
            <div className="gq-sec-trust-title">Bank-Grade Confidentiality</div>
            <p className="gq-sec-trust-desc">End-to-end encrypted direct bank transfer to verified institutional account.</p>
          </div>
          <div className="gq-sec-trust-card">
            <div className="gq-sec-trust-icon"><i className="bi bi-file-earmark-pdf-fill" /></div>
            <div className="gq-sec-trust-title">Official PDF Receipt</div>
            <p className="gq-sec-trust-desc">Instantly download an authenticated, stamped digital payment voucher.</p>
          </div>
          <div className="gq-sec-trust-card">
            <div className="gq-sec-trust-icon"><i className="bi bi-lightning-charge-fill" /></div>
            <div className="gq-sec-trust-title">Real-Time Ledger Update</div>
            <p className="gq-sec-trust-desc">Your child's fee status is cleared instantly on the school bursary records.</p>
          </div>
        </section>

        {/* ── SUCCESS RECEIPT CARD OR PAYMENT FORM ── */}
        {receiptData ? (
          <section className="gq-receipt-card">
            <div className="gq-receipt-header">
              <div>
                <span className="gq-receipt-verified-pill">
                  <i className="bi bi-patch-check-fill" /> Official Payment Confirmed
                </span>
                <h2 style={{ fontSize: 24, fontWeight: 950, margin: "10px 0 4px", color: "#0F172A" }}>
                  {receiptData.school?.school_name || receiptData.school?.name || "Official Payment Receipt"}
                </h2>
                <div style={{ color: "#64748B", fontSize: 13 }}>
                  Address: {receiptData.school?.address || "Registered Campus"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#0F172A" }}>
                  {receiptData.receipt_no}
                </div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                  Issued: {new Date(receiptData.paid_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                </div>
              </div>
            </div>

            <div className="gq-receipt-grid">
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase", marginBottom: 6 }}>
                  Student Credentials
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#0F172A" }}>
                  {receiptData.student?.name || `${receiptData.student?.firstname || ""} ${receiptData.student?.surname || ""}`}
                </div>
                <div style={{ fontSize: 13, color: "#475569", marginTop: 3 }}>
                  Admission Number: <strong>{receiptData.student?.reg_no}</strong>
                </div>
                {receiptData.student?.class && (
                  <div style={{ fontSize: 13, color: "#475569" }}>
                    Class / Level: <strong>{receiptData.student?.class}</strong>
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase", marginBottom: 6 }}>
                  Settlement Details
                </div>
                <div style={{ fontSize: 13, color: "#475569" }}>
                  Date & Time: <strong>{new Date(receiptData.paid_at).toLocaleString()}</strong>
                </div>
                <div style={{ fontSize: 13, color: "#475569" }}>
                  Payment Channel: <strong>Direct Bank Transfer (Wema ALAT / NIP)</strong>
                </div>
                {receiptData.payer_name && (
                  <div style={{ fontSize: 13, color: "#475569" }}>
                    Payer: <strong>{receiptData.payer_name}</strong>
                  </div>
                )}
              </div>
            </div>

            <table className="gq-receipt-table">
              <thead>
                <tr>
                  <th>Fee Description</th>
                  <th>Academic Session & Term</th>
                  <th style={{ textAlign: "right" }}>Amount Settled</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(receiptData.items) && receiptData.items.length > 0 ? (
                  receiptData.items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 800, color: "#0F172A" }}>{item.name}</td>
                      <td style={{ color: "#64748B" }}>
                        {[item.session, item.term].filter(Boolean).join(" - ") || "Current Period"}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 900, color: "#0F172A" }}>
                        {money(item.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={{ fontWeight: 800 }}>School Fee Installment</td>
                    <td style={{ color: "#64748B" }}>Current Term</td>
                    <td style={{ textAlign: "right", fontWeight: 900, color: "#0F172A" }}>
                      {money(receiptData.amount)}
                    </td>
                  </tr>
                )}
                <tr style={{ background: "#F8FAFC", borderTop: "2px solid #0F172A" }}>
                  <td colSpan={2} style={{ fontWeight: 900, fontSize: 15, textTransform: "uppercase" }}>
                    Total Amount Paid
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 950, fontSize: 20, color: "#047857" }}>
                    {money(receiptData.amount)}
                  </td>
                </tr>
              </tbody>
            </table>

            {receiptData.remaining_balance !== undefined && (
              <div style={{ padding: "12px 18px", background: receiptData.remaining_balance > 0 ? "#FFFBEB" : "#ECFDF5", border: `1px solid ${receiptData.remaining_balance > 0 ? "#FDE68A" : "#A7F3D0"}`, borderRadius: 12, fontSize: 13.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#334155", fontWeight: 700 }}>Remaining Student Balance:</span>
                <strong style={{ fontSize: 16, color: receiptData.remaining_balance > 0 ? "#B45309" : "#047857" }}>
                  {receiptData.remaining_balance > 0 ? money(receiptData.remaining_balance) : "₦0.00 (Fully Settled)"}
                </strong>
              </div>
            )}

            <div className="gq-receipt-actions">
              <button className="gq-btn-download" onClick={handleDownloadPdf}>
                <i className="bi bi-file-earmark-pdf-fill" /> Download Official PDF Receipt
              </button>
              <button className="gq-btn-print" onClick={handlePrint}>
                <i className="bi bi-printer-fill" /> Print Receipt
              </button>
              <button className="gq-btn-reset" onClick={handleResetForNewPayment}>
                <i className="bi bi-arrow-clockwise" /> Make Another Payment
              </button>
            </div>
          </section>
        ) : (
          <div className="gq-sec-grid">
            {/* ── Left Column: Checkout Form ── */}
            <section className="gq-sec-card">
              <div className="gq-sec-card-head">
                <h2 className="gq-sec-card-title">
                  <i className="bi bi-credit-card-2-front-fill" /> Payment Details
                </h2>
                <p className="gq-sec-card-sub">Enter your school code and student admission number.</p>
              </div>

              <div className="gq-sec-card-body">
                {verifying && (
                  <div className="gq-alert-warn">
                    <i className="bi bi-arrow-repeat spin" /> Verifying secure transaction status...
                  </div>
                )}
                {message && <div className="gq-alert-success"><i className="bi bi-check-circle-fill" /> {message}</div>}
                {error && <div className="gq-alert-error"><i className="bi bi-exclamation-octagon-fill" /> {error}</div>}

                {virtualAccount ? (
                  <div style={{ background: '#F0FDF4', border: '2px solid #10B981', borderRadius: 16, padding: '20px', marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <span style={{ background: '#10B981', color: '#FFFFFF', padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <i className="bi bi-bank me-1" /> Dedicated Wema Account Generated
                      </span>
                      <button
                        type="button"
                        onClick={() => setVirtualAccount(null)}
                        style={{ background: 'transparent', border: 'none', color: '#64748B', fontSize: 18, cursor: 'pointer', padding: 0 }}
                        title="Close / Pay another way"
                      >
                        <i className="bi bi-x-circle-fill" />
                      </button>
                    </div>

                    <div style={{ textAlign: 'center', margin: '12px 0 18px' }}>
                      <div style={{ fontSize: 12, color: '#166534', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Transfer Exact Amount To:
                      </div>
                      <div style={{ fontSize: 30, fontWeight: 950, color: '#0F172A', letterSpacing: '0.05em', margin: '6px 0', fontFamily: 'monospace' }}>
                        {virtualAccount.account_number}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(virtualAccount.account_number);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2500);
                        }}
                        style={{
                          background: copied ? '#10B981' : '#FFFFFF',
                          color: copied ? '#FFFFFF' : '#0F172A',
                          border: '1.5px solid #CBD5E1',
                          borderRadius: 8,
                          padding: '6px 14px',
                          fontSize: 12.5,
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <i className={`bi ${copied ? 'bi-check-lg' : 'bi-clipboard'} me-1`} />
                        {copied ? 'Account Number Copied!' : 'Copy Account Number'}
                      </button>
                    </div>

                    <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '14px 16px', border: '1px solid #E2E8F0', marginBottom: 18, fontSize: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Bank Name:</span>
                        <strong style={{ color: '#0F172A', fontWeight: 800 }}>{virtualAccount.bank_name || 'Wema Bank / ALAT'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Beneficiary Name:</span>
                        <strong style={{ color: '#0F172A', fontWeight: 800 }}>{virtualAccount.account_name}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Exact Payable Amount:</span>
                        <strong style={{ color: '#047857', fontWeight: 950, fontSize: 15 }}>{money(virtualAccount.amount)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Payment Reference:</span>
                        <strong style={{ color: '#334155', fontFamily: 'monospace', fontSize: 11 }}>{activeReference}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <button
                        type="button"
                        className="gq-btn-download"
                        style={{ width: '100%', justifyContent: 'center', minHeight: 48 }}
                        disabled={verifying}
                        onClick={() => {
                          setVerifying(true);
                          setError(null);
                          setMessage(null);
                          publicApi
                            .get(`/public/fee-payment/verify/${encodeURIComponent(activeReference)}`)
                            .then((res) => {
                              if (res.data?.receipt) {
                                setReceiptData({
                                  ...res.data.receipt,
                                  pdf_download_url: res.data.pdf_download_url,
                                });
                                setVirtualAccount(null);
                              } else {
                                setMessage("Payment verification in progress. Interbank NIP transfers take 30-60 seconds to clear.");
                              }
                            })
                            .catch((err) => {
                              setError(err?.response?.data?.message || "Transfer not detected yet. If you have sent the funds, please allow 1 minute for bank clearing.");
                            })
                            .finally(() => setVerifying(false));
                        }}
                      >
                        {verifying ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" />
                            Verifying Bank Clearing…
                          </>
                        ) : (
                          <>
                            <i className="bi bi-patch-check-fill" />
                            I Have Made This Transfer (Verify Payment)
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* School ID / Code Input */}
                    <div className="gq-form-group">
                      <label className="gq-form-label">School ID / Code / Reg No</label>
                      <input
                        className="gq-input"
                        value={schoolCode}
                        onChange={(e) => setSchoolCode(e.target.value)}
                        placeholder="Enter school code e.g. SCH-001 or school ID"
                      />
                      <div className="gq-form-hint">
                        {schoolLoading ? "Locating school..." : "Enter the unique identification code assigned to your school."}
                      </div>
                    </div>

                    {school && (
                      <div className="gq-school-profile">
                        <div className="gq-school-avatar">
                          {school.name.charAt(0)}
                        </div>
                        <div>
                          <div className="gq-school-meta-title">
                            <i className="bi bi-patch-check-fill" /> Verified Beneficiary School
                          </div>
                          <h3 className="gq-school-name">{school.name}</h3>
                          <div className="gq-school-address">
                            {school.address || "Official School Account"}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Student Admission Number */}
                    <div className="gq-form-group">
                      <label className="gq-form-label">Student Admission Number / Reg No</label>
                      <input
                        className="gq-input"
                        value={studentRegNo}
                        onChange={(e) => setStudentRegNo(e.target.value)}
                        placeholder="e.g. STU/2026/001"
                        disabled={!school}
                      />
                      <div className="gq-form-hint">
                        {!school
                          ? "Enter school code above first."
                          : studentLoading
                          ? "Validating student admission records..."
                          : "Enter the admission number assigned to your child."}
                      </div>
                    </div>

                    {/* Amount to Pay */}
                    <div className="gq-form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="gq-form-label" style={{ marginBottom: 0 }}>Amount to Pay (₦)</label>
                        {studentData?.installment_plan?.enabled && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#1D4ED8', background: '#DBEAFE', padding: '2px 8px', borderRadius: 6 }}>
                            Min {studentData.installment_plan.min_initial_percent}% Initial Installment
                          </span>
                        )}
                      </div>

                      {studentData?.installment_plan?.enabled && (
                        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 12px', marginTop: 8, marginBottom: 8, fontSize: 12, color: '#1E40AF', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <i className="bi bi-info-circle-fill text-primary" style={{ fontSize: 15, marginTop: 1, flexShrink: 0 }} />
                          <span>{studentData.installment_plan.message || `Minimum initial payment required is ${money(studentData.installment_plan.min_payable_now)}.`}</span>
                        </div>
                      )}

                      <input
                        className="gq-input"
                        type="number"
                        min={studentData?.installment_plan?.enabled ? studentData.installment_plan.min_payable_now : 100}
                        max={balance > 0 ? balance : undefined}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount in Naira"
                        disabled={!studentData}
                        style={{ marginTop: 6 }}
                      />

                      {balance > 0 && (
                        <div className="gq-amount-presets">
                          {studentData?.installment_plan?.presets && studentData.installment_plan.presets.length > 0 ? (
                            studentData.installment_plan.presets.map((preset, pIdx) => {
                              const isSelected = amount === String(preset.amount);
                              return (
                                <button
                                  key={pIdx}
                                  type="button"
                                  className="gq-preset-btn"
                                  style={isSelected ? { background: '#0F2744', color: '#FFFFFF', borderColor: '#0F2744' } : undefined}
                                  onClick={() => setAmount(String(preset.amount))}
                                >
                                  {preset.label} ({money(preset.amount)})
                                </button>
                              );
                            })
                          ) : (
                            <>
                              <button
                                type="button"
                                className="gq-preset-btn"
                                onClick={() => setAmount(String(balance))}
                              >
                                Pay Full Balance ({money(balance)})
                              </button>
                              {balance >= 200 && (
                                <button
                                  type="button"
                                  className="gq-preset-btn"
                                  onClick={() => setAmount(String(Math.round(balance / 2)))}
                                >
                                  Pay 50% ({money(Math.round(balance / 2))})
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="gq-form-row">
                      <div className="gq-form-group">
                        <label className="gq-form-label">Payer Email (for PDF Receipt)</label>
                        <input
                          className="gq-input"
                          type="email"
                          value={payerEmail}
                          onChange={(e) => setPayerEmail(e.target.value)}
                          placeholder="parent@example.com"
                        />
                      </div>
                      <div className="gq-form-group">
                        <label className="gq-form-label">Phone Number</label>
                        <input
                          className="gq-input"
                          type="tel"
                          value={payerPhone}
                          onChange={(e) => setPayerPhone(e.target.value)}
                          placeholder="0801 234 5678"
                        />
                      </div>
                    </div>

                    <div className="gq-form-group">
                      <label className="gq-form-label">Payer Full Name</label>
                      <input
                        className="gq-input"
                        value={payerName}
                        onChange={(e) => setPayerName(e.target.value)}
                        placeholder="Parent / Sponsor Name"
                      />
                    </div>

                    {/* Surcharge & Transparent Fee Breakdown */}
                    {numAmount >= 100 && (
                      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', color: '#64748B', marginBottom: 8, letterSpacing: '0.04em' }}>
                          Payment Summary & Settlement Breakdown
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#334155', marginBottom: 4 }}>
                          <span>Base Tuition Amount:</span>
                          <span style={{ fontWeight: 700 }}>{money(numAmount)}</span>
                        </div>
                        {isParentBankBearer && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#334155', marginBottom: 4 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className="bi bi-bank text-primary" /> Bank Processing Charge:
                            </span>
                            <span style={{ fontWeight: 700, color: '#1E40AF' }}>+{money(bankChargeAmount)}</span>
                          </div>
                        )}
                        {isParentPlatformBearer && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#334155', marginBottom: 4 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className="bi bi-cpu text-primary" /> Platform Electronic Access Fee:
                            </span>
                            <span style={{ fontWeight: 700, color: '#1E40AF' }}>+{money(platformFeeAmount)}</span>
                          </div>
                        )}
                        <div style={{ height: 1, background: '#CBD5E1', margin: '8px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 900, color: '#0F172A' }}>
                          <span>Total Amount Payable:</span>
                          <span style={{ color: '#047857' }}>{money(totalPayableWithSurcharges)}</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 6, lineHeight: 1.4 }}>
                          {isParentBankBearer
                            ? "✓ Verified direct settlement. School receives 100% of your tuition payment."
                            : "✓ Zero additional bank surcharge. School covers gateway processing fees."}
                        </div>
                      </div>
                    )}

                    <button
                      className="gq-pay-btn"
                      disabled={!canPay}
                      onClick={() => initializePayment()}
                    >
                      {paying ? (
                        <>
                          <span className="spinner-border spinner-border-sm" />
                          Generating Payment Details…
                        </>
                      ) : (
                        <>
                          <i className="bi bi-shield-lock-fill" />
                          Make Payment {numAmount >= 100 ? `— ${money(totalPayableWithSurcharges)}` : ""}
                        </>
                      )}
                    </button>

                    <div className="gq-pay-notice">
                      <i className="bi bi-lock me-1" />
                      Your payment is securely processed through encrypted banking channels.
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* ── Right Column: Student Fee Schedule ── */}
            <aside className="gq-sec-card">
              <div className="gq-sec-card-head">
                <h2 className="gq-sec-card-title">
                  <i className="bi bi-person-lines-fill" /> Student Fee Assessment
                </h2>
                <p className="gq-sec-card-sub">Current term charges and balance statement.</p>
              </div>

              <div className="gq-sec-card-body">
                {!studentData ? (
                  <div className="text-center py-4 text-muted">
                    <i className="bi bi-search fs-2 d-block mb-2 text-secondary" />
                    <strong>No student selected</strong>
                    <div style={{ fontSize: 13, marginTop: 4 }}>
                      Enter your school code and admission number on the left to display the student fee schedule.
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 14, padding: "14px 16px", marginBottom: 18, display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "#0F2744", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18 }}>
                        {studentData.student?.name?.charAt(0) || "S"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 15, color: "#0F2744" }}>
                          {studentData.student?.name}
                        </div>
                        <div style={{ fontSize: 12.5, color: "#64748B" }}>
                          Reg: <strong>{studentData.student?.reg_no}</strong> &bull; Class: <strong>{[studentData.student?.class, studentData.student?.section].filter(Boolean).join(" - ") || "Class not set"}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="gq-summary-box">
                      <div className="gq-stat-tile">
                        <div className="gq-stat-label">Total Fee</div>
                        <div className="gq-stat-val">{money(studentData.summary?.total_amount || 0)}</div>
                      </div>
                      <div className="gq-stat-tile">
                        <div className="gq-stat-label">Paid</div>
                        <div className="gq-stat-val gq-stat-val-success">{money(studentData.summary?.amount_paid || 0)}</div>
                      </div>
                      <div className="gq-stat-tile">
                        <div className="gq-stat-label">Owing</div>
                        <div className="gq-stat-val gq-stat-val-danger">{money(studentData.summary?.balance || 0)}</div>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "#64748B", marginBottom: 8, letterSpacing: "0.05em" }}>
                      Itemized Fee Breakdown
                    </div>

                    <div className="gq-fee-list">
                      {!Array.isArray(studentData.fees) || studentData.fees.length === 0 ? (
                        <div style={{ padding: 14, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, color: "#166534", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                          <i className="bi bi-check-circle-fill" />
                          <span>This student currently has zero outstanding balance.</span>
                        </div>
                      ) : (
                        studentData.fees.map((fee) => (
                          <div className="gq-fee-item" key={fee.id}>
                            <div>
                              <div className="gq-fee-name">{fee.name}</div>
                              <div className="gq-fee-meta">
                                {[fee.term, fee.session].filter(Boolean).join(" - ") || "Current Term"}
                              </div>
                            </div>
                            <div className="gq-fee-balance">
                              {money(fee.balance)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div style={{ marginTop: 18, padding: "12px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
                      <i className="bi bi-shield-check text-success me-1" />
                      <strong>Bursary Guarantee:</strong> Upon successful payment, your official receipt is issued immediately and your payment is recorded in the school bursary database.
                    </div>
                  </>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
