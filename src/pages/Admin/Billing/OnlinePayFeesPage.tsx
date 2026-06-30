import React, { useState } from "react";
import axios from "axios";

interface PayFeesPageProps {
  studentFeeId: number;
  studentName: string;
  termLabel: string; // e.g. "First Term, 2025/2026"
  balanceDue?: number; // naira, optional — just for display
}

const OnlinePayFeesPage: React.FC<PayFeesPageProps> = ({
  studentFeeId,
  studentName,
  termLabel,
  balanceDue,
}) => {
  const [amount, setAmount] = useState<string>(
    balanceDue ? String(balanceDue) : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    const naira = Number(amount);

    if (!naira || naira < 100) {
      setError("Enter an amount of at least ₦100.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { data } = await axios.post("/api/fees/initialize", {
        student_fee_id: studentFeeId,
        amount: naira,
      });

      window.location.href = data.authorization_url;
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? "Could not start payment. Please try again."
      );
      setLoading(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 520 }}>
      <div
        className="card border-0 shadow-sm"
        style={{ borderRadius: 16, overflow: "hidden" }}
      >
        <div
          className="card-header text-white py-4 border-0"
          style={{
            background: "#0F1216", // swap for your dark-hero background token
            fontFamily: "'Playfair Display', serif",
          }}
        >
          <div className="small text-uppercase" style={{ color: "#C9A227", letterSpacing: 1 }}>
            School Fees
          </div>
          <h4 className="mb-0 mt-1">{studentName}</h4>
          <div className="small text-white-50">{termLabel}</div>
        </div>

        <div className="card-body p-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {balanceDue !== undefined && (
            <div className="mb-3 text-muted small">
              Balance due: <strong>₦{balanceDue.toLocaleString()}</strong>
            </div>
          )}

          <label className="form-label small text-muted">Amount to pay (₦)</label>
          <input
            type="number"
            className="form-control form-control-lg mb-3"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 25000"
            min={100}
          />

          {error && <div className="alert alert-danger small">{error}</div>}

          <button
            className="btn w-100 fw-semibold text-white"
            style={{ background: "#C9A227", border: "none", borderRadius: 10, padding: "12px 0" }}
            onClick={handlePay}
            disabled={loading}
          >
            {loading ? "Redirecting to Paystack…" : "Pay Now"}
          </button>

          <div className="text-center text-muted mt-3" style={{ fontSize: 12 }}>
            Payments go directly to the school's account, secured by Paystack.
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnlinePayFeesPage;