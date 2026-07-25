import { useEffect, useMemo, useState } from "react";
import { publicApi } from "../utils/axios";

type SchoolInfo = {
  id: number;
  name: string;
  code: string;
  email?: string | null;
  phone?: string | null;
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

type StudentLookupResponse = {
  school: SchoolInfo;
  student: StudentInfo;
  summary: {
    total_amount: number;
    amount_paid: number;
    balance: number;
    outstanding_items: number;
  };
  fees: FeeItem[];
};

const money = (value: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(value || 0));

export default function PublicFeePaymentPage() {
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialReference = query.get("reference") || "";

  const [schoolCode, setSchoolCode] = useState(query.get("school_code") || "");
  const [studentRegNo, setStudentRegNo] = useState(query.get("student_reg_no") || "");
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

  const balance = Number(studentData?.summary.balance || 0);
  const canPay = !!school && !!studentData && Number(amount) >= 100 && Number(amount) <= balance && !paying;

  useEffect(() => {
    if (!initialReference) return;

    setVerifying(true);
    setError(null);
    setMessage(null);

    publicApi
      .get(`/public/fee-payment/verify/${encodeURIComponent(initialReference)}`)
      .then((res) => {
        setMessage(`Payment confirmed. Reference: ${res.data.reference}`);
      })
      .catch((err) => {
        setError(err?.response?.data?.message || "Unable to verify payment yet. Please try again.");
      })
      .finally(() => setVerifying(false));
  }, [initialReference]);

  useEffect(() => {
    const value = schoolCode.trim();
    setSchool(null);
    setStudentData(null);

    if (value.length < 2) return;

    const timer = window.setTimeout(() => {
      setSchoolLoading(true);
      setError(null);

      publicApi
        .get("/public/fee-payment/school", { params: { school_code: value } })
        .then((res) => setSchool(res.data.school))
        .catch((err) => setError(err?.response?.data?.message || "School code not found."))
        .finally(() => setSchoolLoading(false));
    }, 450);

    return () => window.clearTimeout(timer);
  }, [schoolCode]);

  useEffect(() => {
    const schoolValue = schoolCode.trim();
    const studentValue = studentRegNo.trim();
    setStudentData(null);

    if (!schoolValue || !studentValue || studentValue.length < 2) return;

    const timer = window.setTimeout(() => {
      setStudentLoading(true);
      setError(null);

      publicApi
        .get<StudentLookupResponse>("/public/fee-payment/student", {
          params: { school_code: schoolValue, student_reg_no: studentValue },
        })
        .then((res) => {
          setStudentData(res.data);
          if (!school) setSchool(res.data.school);
          if (!amount && Number(res.data.summary.balance || 0) > 0) {
            setAmount(String(res.data.summary.balance));
          }
        })
        .catch((err) => setError(err?.response?.data?.message || "Student was not found for this school."))
        .finally(() => setStudentLoading(false));
    }, 450);

    return () => window.clearTimeout(timer);
  }, [schoolCode, studentRegNo]);

  const initializePayment = async () => {
    if (!canPay) return;

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
      });

      window.location.href = res.data.authorization_url;
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to start payment.");
      setPaying(false);
    }
  };

  return (
    <main className="pf-page">
      <style>{`
        .pf-page{min-height:100vh;background:linear-gradient(180deg,rgba(211,0,176,.045),transparent 260px),#fcf8f8;color:#050008;padding:32px 16px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .pf-shell{max-width:1120px;margin:0 auto}
        .pf-hero{background:linear-gradient(135deg,#050008,#18091f);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:28px;display:flex;justify-content:space-between;gap:24px;align-items:flex-end;color:#fff;position:relative;overflow:hidden}
        .pf-hero:before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,.05) 1px,transparent 1px);background-size:24px 24px}
        .pf-hero>*{position:relative;z-index:1}
        .pf-kicker{display:inline-flex;align-items:center;gap:8px;background:rgba(255,200,87,.12);border:1px solid rgba(255,200,87,.24);color:rgb(255,200,87);border-radius:999px;padding:6px 12px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px}
        .pf-title{font-size:clamp(26px,4vw,42px);line-height:1.05;margin:0 0 10px;font-weight:900}
        .pf-sub{max-width:620px;color:rgba(255,255,255,.68);margin:0;font-size:14px;line-height:1.7}
        .pf-secure{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:16px;min-width:220px}
        .pf-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(320px,.95fr);gap:18px;margin-top:18px}
        .pf-card{background:#fff;border:1px solid rgba(5,0,8,.08);border-radius:16px;box-shadow:0 12px 30px rgba(5,0,8,.055);overflow:hidden}
        .pf-card-head{padding:18px 20px;border-bottom:1px solid rgba(5,0,8,.08)}
        .pf-card-title{margin:0;font-size:16px;font-weight:850}
        .pf-card-sub{margin:4px 0 0;color:#8c7f8f;font-size:12.5px}
        .pf-card-body{padding:20px}
        .pf-form{display:grid;gap:14px}
        .pf-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .pf-label{display:block;font-size:12px;font-weight:800;color:#4a3a4f;margin-bottom:6px}
        .pf-input{width:100%;min-height:44px;border:1px solid #eadfec;border-radius:10px;padding:10px 12px;font-size:14px;outline:0;background:#fff}
        .pf-input:focus{border-color:rgba(211,0,176,.4);box-shadow:0 0 0 4px rgba(211,0,176,.08)}
        .pf-hint{font-size:12px;color:#9a8a7a;margin-top:6px}
        .pf-found{display:flex;align-items:flex-start;gap:10px;padding:12px;border-radius:12px;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.18);color:#065f46;font-size:13px}
        .pf-warn{padding:12px;border-radius:12px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.2);color:#92400e;font-size:13px}
        .pf-error{padding:12px;border-radius:12px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.18);color:#991b1b;font-size:13px}
        .pf-success{padding:12px;border-radius:12px;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.18);color:#065f46;font-size:13px}
        .pf-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}
        .pf-stat{background:#fcf8f8;border:1px solid rgba(5,0,8,.06);border-radius:12px;padding:12px}
        .pf-stat-label{font-size:11px;color:#8c7f8f;margin-bottom:5px}
        .pf-stat-value{font-weight:900;font-size:16px}
        .pf-student{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:14px}
        .pf-avatar{width:46px;height:46px;border-radius:13px;background:rgba(211,0,176,.08);color:rgb(211,0,176);display:flex;align-items:center;justify-content:center;font-weight:900}
        .pf-fees{display:grid;gap:8px;max-height:360px;overflow:auto}
        .pf-fee{border:1px solid rgba(5,0,8,.07);border-radius:12px;padding:12px;display:flex;justify-content:space-between;gap:12px}
        .pf-fee-name{font-weight:800;font-size:13px}
        .pf-fee-meta{font-size:12px;color:#8c7f8f;margin-top:3px}
        .pf-fee-bal{text-align:right;font-weight:900;color:#050008;white-space:nowrap}
        .pf-btn{min-height:46px;border:0;border-radius:12px;background:rgb(211,0,176);color:#fff;font-weight:850;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 18px;cursor:pointer}
        .pf-btn:disabled{opacity:.55;cursor:not-allowed}
        .pf-btn-secondary{background:#fff;color:#050008;border:1px solid rgba(5,0,8,.12)}
        @media(max-width:900px){.pf-grid{grid-template-columns:1fr}.pf-hero{align-items:flex-start;flex-direction:column}.pf-row,.pf-summary{grid-template-columns:1fr}}
      `}</style>

      <div className="pf-shell">
        <section className="pf-hero">
          <div>
            <div className="pf-kicker">
              <i className="bi bi-shield-check" />
              GradeQuest Secure Fee Payment
            </div>
            <h1 className="pf-title">Pay School Fees Online</h1>
            <p className="pf-sub">
              Enter the school code and student admission number to confirm the student record and outstanding balance before payment.
            </p>
          </div>
          <div className="pf-secure">
            <div style={{ fontWeight: 900, marginBottom: 4 }}>No login required</div>
            <div style={{ color: "rgba(255,255,255,.62)", fontSize: 13, lineHeight: 1.6 }}>
              Payment is processed through Paystack and posted to the student fee ledger after confirmation.
            </div>
          </div>
        </section>

        <div className="pf-grid">
          <section className="pf-card">
            <div className="pf-card-head">
              <h2 className="pf-card-title">Payment Details</h2>
              <p className="pf-card-sub">Confirm school, student, and amount before going to checkout.</p>
            </div>
            <div className="pf-card-body">
              <div className="pf-form">
                {verifying && <div className="pf-warn">Verifying payment...</div>}
                {message && <div className="pf-success">{message}</div>}
                {error && <div className="pf-error">{error}</div>}

                <div>
                  <label className="pf-label">School Code</label>
                  <input className="pf-input" value={schoolCode} onChange={(e) => setSchoolCode(e.target.value)} placeholder="Admin reg no, e.g. R123456" />
                  <div className="pf-hint">{schoolLoading ? "Checking school..." : "This is the school owner/admin registration number."}</div>
                </div>

                {school && (
                  <div className="pf-found">
                    <i className="bi bi-building" />
                    <div>
                      <strong>{school.name}</strong>
                      <div>School code: {school.code}</div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="pf-label">Student Admission Number</label>
                  <input className="pf-input" value={studentRegNo} onChange={(e) => setStudentRegNo(e.target.value)} placeholder="Student reg no" />
                  <div className="pf-hint">{studentLoading ? "Checking student..." : "The student must belong to the selected school."}</div>
                </div>

                <div>
                  <label className="pf-label">Amount to Pay</label>
                  <input className="pf-input" type="number" min="100" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" />
                  {balance > 0 && <div className="pf-hint">Outstanding balance: {money(balance)}</div>}
                </div>

                <div className="pf-row">
                  <div>
                    <label className="pf-label">Receipt Email</label>
                    <input className="pf-input" type="email" value={payerEmail} onChange={(e) => setPayerEmail(e.target.value)} placeholder="Optional" />
                  </div>
                  <div>
                    <label className="pf-label">Phone Number</label>
                    <input className="pf-input" value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} placeholder="Optional" />
                  </div>
                </div>

                <div>
                  <label className="pf-label">Payer Name</label>
                  <input className="pf-input" value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="Optional" />
                </div>

                <button className="pf-btn" disabled={!canPay} onClick={initializePayment}>
                  {paying ? "Starting checkout..." : "Proceed to Paystack"}
                </button>
              </div>
            </div>
          </section>

          <aside className="pf-card">
            <div className="pf-card-head">
              <h2 className="pf-card-title">Student Fee Summary</h2>
              <p className="pf-card-sub">Student information appears after a valid admission number.</p>
            </div>
            <div className="pf-card-body">
              {!studentData ? (
                <div className="pf-warn">Enter a school code and admission number to load the student's outstanding fees.</div>
              ) : (
                <>
                  <div className="pf-student">
                    <div className="d-flex gap-3 align-items-start">
                      <div className="pf-avatar">{studentData.student.name?.charAt(0) || "S"}</div>
                      <div>
                        <div style={{ fontWeight: 900 }}>{studentData.student.name}</div>
                        <div style={{ color: "#8c7f8f", fontSize: 13 }}>{studentData.student.reg_no}</div>
                        <div style={{ color: "#8c7f8f", fontSize: 13 }}>
                          {[studentData.student.class, studentData.student.section].filter(Boolean).join(" - ") || "Class not set"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pf-summary">
                    <div className="pf-stat">
                      <div className="pf-stat-label">Total Fees</div>
                      <div className="pf-stat-value">{money(studentData.summary.total_amount)}</div>
                    </div>
                    <div className="pf-stat">
                      <div className="pf-stat-label">Paid</div>
                      <div className="pf-stat-value">{money(studentData.summary.amount_paid)}</div>
                    </div>
                    <div className="pf-stat">
                      <div className="pf-stat-label">Owing</div>
                      <div className="pf-stat-value">{money(studentData.summary.balance)}</div>
                    </div>
                  </div>

                  <div className="pf-fees">
                    {studentData.fees.length === 0 ? (
                      <div className="pf-found">
                        <i className="bi bi-check-circle" />
                        <div>This student has no outstanding fee balance.</div>
                      </div>
                    ) : (
                      studentData.fees.map((fee) => (
                        <div className="pf-fee" key={fee.id}>
                          <div>
                            <div className="pf-fee-name">{fee.name}</div>
                            <div className="pf-fee-meta">{[fee.term, fee.session].filter(Boolean).join(" - ") || "Fee item"}</div>
                          </div>
                          <div className="pf-fee-bal">{money(fee.balance)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
