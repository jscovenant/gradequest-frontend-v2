import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { publicApi } from "../utils/axios";
import PageTitle from "../components/PageTitle";

export type ReceiptItemBreakdown = {
  fee_name: string;
  gross_amount: number;
  discount_amount: number;
  net_amount: number;
  amount_paid: number;
  balance: number;
};

interface VerifiedReceipt {
  receipt_number: string;
  qr_code_token: string;
  date: string;
  student_name: string;
  admission_no: string;
  fee_name: string;
  section_name: string;
  session_name: string;
  term_name: string;
  school_name: string;
  school_logo?: string | null;
  amount_paid: number;
  gross_amount: number;
  discount_amount: number;
  net_amount: number;
  balance: number;
  payment_method: string;
  bursar_name: string;
  status: string;
  items?: ReceiptItemBreakdown[];
}

const naira = (v: number | null | undefined) => {
  return Number(v || 0).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  });
};

export default function PublicReceiptVerificationPage() {
  const { token } = useParams<{ token?: string }>();
  const [inputToken, setInputToken] = useState(token || "");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<VerifiedReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const verifyToken = async (tok: string) => {
    let clean = (tok || "").trim();
    if (!clean) return;

    // Handle full URL pasted or scanned by QR reader
    if (clean.includes("/receipt/verify/")) {
      const parts = clean.split("/receipt/verify/");
      clean = parts[parts.length - 1].split("?")[0].split("#")[0].trim();
    }
    if (!clean) return;

    setLoading(true);
    setError(null);
    setReceipt(null);
    setHasSearched(true);

    try {
      const res = await publicApi.get(`/receipt/verify/${clean}`);

      const data = res.data;
      const isSuccess = data?.status === "verified" || data?.is_valid === true;
      const r = data?.receipt || data?.verification;

      if (isSuccess && r) {
        setReceipt({
          receipt_number: r.receipt_number || clean,
          qr_code_token: r.qr_code_token || clean,
          date: r.date || r.issued_at || "N/A",
          student_name: r.student_name || "N/A",
          admission_no: r.admission_no || "N/A",
          fee_name: r.fee_name || r.fee_type || "School Fee",
          section_name: r.section_name || r.class_section || "General",
          session_name: r.session_name || "",
          term_name: r.term_name || "",
          school_name: r.school_name || "SchoolProfit Partner School",
          school_logo: r.school_logo || null,
          amount_paid: Number(r.amount_paid || 0),
          gross_amount: Number(r.gross_amount ?? r.amount_paid ?? 0),
          discount_amount: Number(r.discount_amount || 0),
          net_amount: Number(r.net_amount ?? r.amount_paid ?? 0),
          balance: Number(r.balance || 0),
          payment_method: r.payment_method || "OFFLINE",
          bursar_name: r.bursar_name || "Bursary Office",
          status: r.status || "PAID",
          items: Array.isArray(r.items) ? r.items : undefined,
        });
      } else {
        setError(res.data?.message || "Invalid or unverified receipt token.");
      }
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          "Receipt verification failed. The provided QR verification token does not match any official school record."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      setInputToken(token);
      verifyToken(token);
    }
  }, [token]);

  return (
    <>
      <PageTitle title="Official Receipt Verification — SchoolProfit" />
      <style>{`
        .sp-verify-bg {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a192f 0%, #0f2744 50%, #1e3a8a 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .sp-verify-card {
          background: #ffffff;
          border-radius: 20px;
          max-width: 640px;
          width: 100%;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4);
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.2);
        }
        .sp-verify-header {
          background: #0f2744;
          padding: 24px;
          text-align: center;
          color: #fff;
          border-bottom: 2px solid #d97706;
        }
        .sp-seal-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          border-radius: 100px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .sp-seal--valid {
          background: rgba(34,197,94,0.15);
          color: #15803d;
          border: 1.5px solid #22c55e;
        }
        .sp-seal--invalid {
          background: rgba(239,68,68,0.15);
          color: #dc2626;
          border: 1.5px solid #ef4444;
        }
      `}</style>

      <div className="sp-verify-bg">
        <div className="sp-verify-card">
          <div className="sp-verify-header">
            <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#fbbf24", fontWeight: 700 }}>
              SchoolProfit Security Cloud
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: "6px 0 0", color: "#fff" }}>
              Official Electronic Receipt Verification
            </h1>
          </div>

          <div style={{ padding: "28px" }}>
            {/* SEARCH INPUT BAR */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                verifyToken(inputToken);
              }}
              className="mb-4"
            >
              <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6, display: "block" }}>
                Enter Receipt QR Verification Token or Serial Number:
              </label>
              <div className="d-flex gap-2">
                <input
                  className="form-control"
                  style={{ fontWeight: 600, borderColor: "#cbd5e1" }}
                  placeholder="e.g. SP-REC-..."
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-warning"
                  style={{ fontWeight: 700, whiteSpace: "nowrap", background: "#d97706", borderColor: "#d97706", color: "#fff" }}
                  disabled={loading || !inputToken.trim()}
                >
                  {loading ? "Verifying…" : "Verify Seal"}
                </button>
              </div>
            </form>

            {loading && (
              <div className="text-center py-5">
                <div className="spinner-border text-primary mb-3" />
                <div style={{ fontSize: 14, color: "#64748b" }}>
                  Verifying cryptographic seal against official school ledger…
                </div>
              </div>
            )}

            {error && !loading && (
              <div className="text-center py-4">
                <div className="sp-seal-badge sp-seal--invalid mb-3">
                  ✕ Unverified / Invalid Seal
                </div>
                <div style={{ fontSize: 14, color: "#b91c1c", fontWeight: 600, maxWidth: 440, margin: "0 auto" }}>
                  {error}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 12 }}>
                  If you believe this is an error, please contact the issuing school bursary department.
                </div>
              </div>
            )}

            {receipt && !loading && (
              <div>
                <div className="text-center mb-4">
                  <div className="sp-seal-badge sp-seal--valid mb-2">
                    ✓ Authenticated Official Receipt
                  </div>
                  <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>
                    Verified & Recorded in SchoolProfit Financial Ledger
                  </div>
                </div>

                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 14,
                    padding: "20px",
                    marginBottom: 20,
                  }}
                >
                  <div className="text-center pb-3 border-bottom mb-3">
                    <h2 style={{ fontSize: 17, fontWeight: 800, color: "#0f2744", textTransform: "uppercase", margin: 0 }}>
                      {receipt.school_name}
                    </h2>
                    <div style={{ fontSize: 12, color: "#d97706", fontWeight: 700, marginTop: 4 }}>
                      Receipt Serial: {receipt.receipt_number}
                    </div>
                  </div>

                  <div className="row g-2" style={{ fontSize: 13 }}>
                    <div className="col-6">
                      <span style={{ color: "#64748b" }}>Student Name:</span>{" "}
                      <strong>{receipt.student_name}</strong>
                    </div>
                    <div className="col-6">
                      <span style={{ color: "#64748b" }}>Admission No:</span>{" "}
                      <strong>{receipt.admission_no}</strong>
                    </div>
                    <div className="col-6">
                      <span style={{ color: "#64748b" }}>Section:</span>{" "}
                      <strong>{receipt.section_name}</strong>
                    </div>
                    <div className="col-6">
                      <span style={{ color: "#64748b" }}>Period:</span>{" "}
                      <strong>{receipt.session_name} • {receipt.term_name}</strong>
                    </div>
                    <div className="col-6">
                      <span style={{ color: "#64748b" }}>Payment Channel:</span>{" "}
                      <strong>{receipt.payment_method}</strong>
                    </div>
                    <div className="col-6">
                      <span style={{ color: "#64748b" }}>Timestamp:</span>{" "}
                      <strong>{receipt.date}</strong>
                    </div>
                  </div>

                  <hr style={{ margin: "14px 0", opacity: 0.12 }} />

                  {/* Financial Double Entry Amounts */}
                  {receipt.items && receipt.items.length > 0 ? (
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b" }}>
                          Consolidated Fee Allocation ({receipt.items.length} Items)
                        </span>
                        <span className="badge" style={{ background: "#ecfdf5", color: "#059669", fontSize: 11, fontWeight: 600 }}>
                          Multi-Item Transaction
                        </span>
                      </div>

                      <div className="table-responsive mb-3" style={{ borderRadius: 6, border: "1px solid #e2e8f0" }}>
                        <table className="table table-sm table-borderless mb-0" style={{ fontSize: 12 }}>
                          <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                            <tr>
                              <th style={{ padding: "8px 10px", color: "#475569" }}>Fee Name</th>
                              <th className="text-end" style={{ padding: "8px 10px", color: "#475569" }}>Net Due</th>
                              <th className="text-end" style={{ padding: "8px 10px", color: "#475569" }}>Paid</th>
                              <th className="text-end" style={{ padding: "8px 10px", color: "#475569" }}>Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {receipt.items.map((item, idx) => (
                              <tr key={idx} style={{ borderBottom: idx < receipt.items!.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                                <td style={{ padding: "8px 10px", fontWeight: 600 }}>{item.fee_name}</td>
                                <td className="text-end" style={{ padding: "8px 10px", color: "#475569" }}>{naira(item.net_amount)}</td>
                                <td className="text-end" style={{ padding: "8px 10px", fontWeight: 700, color: "#16a34a" }}>{naira(item.amount_paid)}</td>
                                <td className="text-end" style={{ padding: "8px 10px", color: item.balance > 0 ? "#dc2626" : "#64748b" }}>
                                  {item.balance > 0 ? naira(item.balance) : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Summary Totals */}
                      <div style={{ fontSize: 13 }}>
                        <div className="d-flex justify-content-between mb-1">
                          <span style={{ color: "#64748b" }}>Total Gross Published:</span>
                          <strong>{naira(receipt.gross_amount)}</strong>
                        </div>
                        {receipt.discount_amount > 0 && (
                          <div className="d-flex justify-content-between mb-1">
                            <span style={{ color: "#7c3aed" }}>Total Approved Concessions:</span>
                            <strong style={{ color: "#7c3aed" }}>-{naira(receipt.discount_amount)}</strong>
                          </div>
                        )}
                        <div className="d-flex justify-content-between mb-2">
                          <span style={{ color: "#64748b" }}>Total Net Payable:</span>
                          <strong>{naira(receipt.net_amount)}</strong>
                        </div>
                        <div
                          className="d-flex justify-content-between pt-2 border-top"
                          style={{ fontSize: 15, fontWeight: 800 }}
                        >
                          <span style={{ color: "#16a34a" }}>Total Amount Realized:</span>
                          <span style={{ color: "#16a34a" }}>{naira(receipt.amount_paid)}</span>
                        </div>
                        <div className="d-flex justify-content-between mt-1" style={{ fontSize: 13 }}>
                          <span style={{ color: "#64748b" }}>Remaining Ledger Balance:</span>
                          <strong style={{ color: receipt.balance > 0 ? "#dc2626" : "#16a34a" }}>
                            {naira(receipt.balance)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Financial Single Fee Amounts */
                    <div style={{ fontSize: 13 }}>
                      <div className="d-flex justify-content-between mb-1">
                        <span style={{ color: "#64748b" }}>Fee Description:</span>
                        <strong>{receipt.fee_name}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span style={{ color: "#64748b" }}>Gross Published Fee:</span>
                        <strong>{naira(receipt.gross_amount)}</strong>
                      </div>
                      {receipt.discount_amount > 0 && (
                        <div className="d-flex justify-content-between mb-1">
                          <span style={{ color: "#7c3aed" }}>Approved Concession:</span>
                          <strong style={{ color: "#7c3aed" }}>-{naira(receipt.discount_amount)}</strong>
                        </div>
                      )}
                      <div className="d-flex justify-content-between mb-2">
                        <span style={{ color: "#64748b" }}>Net Payable:</span>
                        <strong>{naira(receipt.net_amount)}</strong>
                      </div>
                      <div
                        className="d-flex justify-content-between pt-2 border-top"
                        style={{ fontSize: 15, fontWeight: 800 }}
                      >
                        <span style={{ color: "#16a34a" }}>Amount Collected & Realized:</span>
                        <span style={{ color: "#16a34a" }}>{naira(receipt.amount_paid)}</span>
                      </div>
                      <div className="d-flex justify-content-between mt-1" style={{ fontSize: 13 }}>
                        <span style={{ color: "#64748b" }}>Remaining Balance:</span>
                        <strong style={{ color: receipt.balance > 0 ? "#dc2626" : "#16a34a" }}>
                          {naira(receipt.balance)}
                        </strong>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-top text-center" style={{ fontSize: 11.5, color: "#64748b" }}>
                    Verified by Authorized Bursar: <strong>{receipt.bursar_name}</strong>
                  </div>
                </div>
              </div>
            )}

            {!hasSearched && !loading && (
              <div className="text-center py-4 text-muted" style={{ fontSize: 13 }}>
                Scan the QR code printed on the official receipt or enter the verification token above to audit payment authenticity.
              </div>
            )}

            <div className="text-center pt-3 border-top">
              <Link to="/login" style={{ fontSize: 12.5, color: "#64748b", textDecoration: "none" }}>
                ← Return to SchoolProfit Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
