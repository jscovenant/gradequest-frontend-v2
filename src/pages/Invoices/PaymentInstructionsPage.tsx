import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

import Loader from "../../components/ui/dashboardLoader";
import { useToast } from "../../contexts/ToastContext";
import { publicApi } from "../../utils/axios";
import PageTitle from "../../components/PageTitle";

type BankDetails = {
  school_id?: number;
  bank_name?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  instruction?: string | null;
};

export default function PaymentInstructionsPage() {
  const { id } = useParams();
  const noteId = Number(id);
  const { showError, showSuccess } = useToast();

  const [loading, setLoading] = useState(true);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!noteId || Number.isNaN(noteId)) {
        setLoading(false);
        return;
      }

      try {
        const res = await publicApi.get(`/invoice-notifications/${noteId}/bank-details`);
        setBankDetails(res?.data?.data ?? null);
      } catch (e) {
        console.error(e);
        showError?.("Failed to load school bank details.");
        setBankDetails(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [noteId, showError]);

  const copyText = async (value?: string | null, label = "Value") => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      showSuccess?.(`${label} copied.`);
    } catch {
      showError?.(`Failed to copy ${label.toLowerCase()}.`);
    }
  };

  return (
    <>
    <PageTitle title="Payment Instructions" />
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f6fb",
        padding: "40px 20px",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      {loading && <Loader message="Loading bank details..." />}

      {!loading && !bankDetails && (
        <div
          className="card border-0 shadow-sm"
          style={{ maxWidth: 500, borderRadius: 14 }}
        >
          <div className="card-body text-center">
            <div className="fw-bold mb-3">Bank details not found.</div>

            <Link to="/" className="btn btn-outline-secondary">
              Go back
            </Link>
          </div>
        </div>
      )}

      {!loading && bankDetails && (
        <div
          className="card border-0 shadow-sm"
          style={{ maxWidth: 720, width: "100%", borderRadius: 18 }}
        >
          <div
            style={{
              background: "linear-gradient(135deg,#0d47a1,#1976d2)",
              color: "#fff",
              padding: "24px",
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              textAlign: "center",
            }}
          >
            <h3 className="fw-bold mb-1">School Bank Details</h3>
            <div style={{ opacity: 0.9 }}>
              Use the account information below to complete your payment.
            </div>
          </div>

          <div className="card-body" style={{ padding: 28 }}>
            <div className="row g-3">

              <div className="col-12">
                <div className="border rounded-3 p-3" style={{ background: "#f8fafc" }}>
                  <div className="text-muted mb-1" style={{ fontSize: 12 }}>
                    Bank Name
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <div className="fw-semibold fs-6">
                      {bankDetails.bank_name || "—"}
                    </div>

                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => copyText(bankDetails.bank_name, "Bank name")}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-12">
                <div className="border rounded-3 p-3" style={{ background: "#f8fafc" }}>
                  <div className="text-muted mb-1" style={{ fontSize: 12 }}>
                    Account Name
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <div className="fw-semibold">
                      {bankDetails.account_name || "—"}
                    </div>

                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() =>
                        copyText(bankDetails.account_name, "Account name")
                      }
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-12">
                <div className="border rounded-3 p-3" style={{ background: "#f8fafc" }}>
                  <div className="text-muted mb-1" style={{ fontSize: 12 }}>
                    Account Number
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <div className="fw-bold fs-5">
                      {bankDetails.account_number || "—"}
                    </div>

                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() =>
                        copyText(bankDetails.account_number, "Account number")
                      }
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-12">
                <div
                  style={{
                    background: "#fff7ed",
                    border: "1px solid #fed7aa",
                    borderLeft: "4px solid #f97316",
                    borderRadius: 10,
                    padding: 16,
                  }}
                >
                  <div className="fw-bold mb-2" style={{ color: "#9a3412" }}>
                    Important Instruction
                  </div>

                  <div style={{ color: "#9a3412", lineHeight: 1.7 }}>
                    {bankDetails.instruction ||
                      "After making payment, please upload your payment receipt so the school can verify and update your payment record."}
                  </div>
                </div>
              </div>

            </div>

            <div className="mt-4 text-center">
              <Link to="/payments/upload-receipt" className="btn btn-primary">
                Upload Payment Receipt
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}