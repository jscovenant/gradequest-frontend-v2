import React, { useEffect, useState } from "react";
import axios from "axios";

type Status = "loading" | "success" | "failed" | "pending";

const PaymentCallbackPage: React.FC = () => {
  const [status, setStatus] = useState<Status>("loading");
  const [details, setDetails] = useState<{ amount?: number; platform_fee?: number }>({});

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get("reference");

    if (!reference) {
      setStatus("failed");
      return;
    }

    axios
      .get(`/api/fees/verify/${reference}`)
      .then(({ data }) => {
        setStatus(data.status as Status);
        setDetails({ amount: data.amount, platform_fee: data.platform_fee });
      })
      .catch(() => setStatus("failed"));
  }, []);

  return (
    <div className="container py-5 text-center" style={{ maxWidth: 480 }}>
      <div className="card border-0 shadow-sm p-4" style={{ borderRadius: 16, fontFamily: "'DM Sans', sans-serif" }}>
        {status === "loading" && (
          <>
            <div className="spinner-border mb-3" style={{ color: "#C9A227" }} />
            <p className="text-muted">Confirming your payment…</p>
          </>
        )}

        {status === "success" && (
          <>
            <h4 style={{ fontFamily: "'Playfair Display', serif" }}>Payment received</h4>
            {details.amount !== undefined && (
              <p className="text-muted mb-1">Amount paid: ₦{details.amount.toLocaleString()}</p>
            )}
            <p className="small text-muted">
              The school has been credited directly. A receipt will reflect on the student's record shortly.
            </p>
            <a href="/dashboard" className="btn mt-3 text-white" style={{ background: "#C9A227", border: "none" }}>
              Back to dashboard
            </a>
          </>
        )}

        {(status === "failed" || status === "pending") && (
          <>
            <h4 style={{ fontFamily: "'Playfair Display', serif" }}>
              {status === "pending" ? "Payment still processing" : "Payment not completed"}
            </h4>
            <p className="small text-muted">
              {status === "pending"
                ? "We're waiting on confirmation from Paystack. This page will update shortly — you can also check back later."
                : "The transaction wasn't completed. No amount was deducted, or it will be reversed automatically."}
            </p>
            <a href="/fees" className="btn btn-outline-secondary mt-3">
              Try again
            </a>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentCallbackPage;