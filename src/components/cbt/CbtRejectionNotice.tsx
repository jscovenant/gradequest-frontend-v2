export type CbtRejection = {
  reason: "school_fee" | "platform_fee" | "no_exam_set" | string;
  title: string;
  message: string;
  fee_access?: {
    allowed?: boolean;
    message?: string | null;
    required_percent?: number;
    summary?: {
      total_amount?: number;
      amount_paid?: number;
      balance?: number;
      payment_percent?: number;
    };
  } | null;
};

interface CbtRejectionNoticeProps {
  rejection: CbtRejection;
  onRetry?: () => void;
}

export default function CbtRejectionNotice({ rejection, onRetry }: CbtRejectionNoticeProps) {
  const isSchoolFee = rejection.reason === "school_fee";
  const isPlatformFee = rejection.reason === "platform_fee";
  const isNoExam = rejection.reason === "no_exam_set";

  const config = isSchoolFee
    ? {
        badgeBg: "#fee2e2",
        badgeColor: "#991b1b",
        badgeBorder: "#fca5a5",
        badgeText: "School Fee Issue",
        icon: "bi-cash-coin",
        iconColor: "#dc2626",
        cardBg: "#fff5f5",
        cardBorder: "#fed7d7",
        titleColor: "#991b1b",
        advice: "Tuition clearance is required by the school to write CBT exams. Please visit the Bursar or School Administration to update your payment status.",
      }
    : isPlatformFee
    ? {
        badgeBg: "#fef3c7",
        badgeColor: "#92400e",
        badgeBorder: "#fcd34d",
        badgeText: "Platform Subscription Issue",
        icon: "bi-shield-lock-fill",
        iconColor: "#d97706",
        cardBg: "#fffbeb",
        cardBorder: "#fde68a",
        titleColor: "#92400e",
        advice: "The school's CBT examination platform license or offline package is expired or restricted to the Basic edition. Please notify your school administrator or IT department.",
      }
    : {
        badgeBg: "#e0f2fe",
        badgeColor: "#075985",
        badgeBorder: "#7dd3fc",
        badgeText: "No Exam Scheduled",
        icon: "bi-calendar2-x-fill",
        iconColor: "#0284c7",
        cardBg: "#f0f9ff",
        cardBorder: "#bae6fd",
        titleColor: "#075985",
        advice: "No active or upcoming CBT exam was found for your assigned class or department today. If you have an exam scheduled right now, please inform your exam hall invigilator.",
      };

  const summary = rejection.fee_access?.summary;
  const requiredPercent = rejection.fee_access?.required_percent;

  return (
    <>
      <style>{`
        .cbt-reject-card {
          border-radius: 16px;
          padding: 24px;
          margin-top: 16px;
          border: 1px solid;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
          animation: fadeIn 0.25s ease;
        }
        .cbt-reject-head {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }
        .cbt-reject-icon-box {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
          flex-shrink: 0;
        }
        .cbt-reject-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border: 1px solid;
          margin-bottom: 8px;
        }
        .cbt-reject-title {
          font-size: 18px;
          font-weight: 900;
          margin: 0 0 6px;
        }
        .cbt-reject-body {
          font-size: 13.5px;
          line-height: 1.6;
          color: #334155;
          margin: 0 0 14px;
        }
        .cbt-reject-advice {
          background: rgba(255, 255, 255, 0.7);
          border-left: 3px solid;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 12.5px;
          line-height: 1.5;
          margin-top: 12px;
        }
        .cbt-fee-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 8px;
          margin: 14px 0;
        }
        .cbt-fee-cell {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 10px;
          padding: 8px 12px;
        }
        .cbt-fee-cell span {
          display: block;
          font-size: 10.5px;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
        }
        .cbt-fee-cell strong {
          display: block;
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
          margin-top: 2px;
        }
      `}</style>

      <div
        className="cbt-reject-card"
        style={{
          background: config.cardBg,
          borderColor: config.cardBorder,
        }}
      >
        <div className="cbt-reject-head">
          <div className="cbt-reject-icon-box" style={{ color: config.iconColor }}>
            <i className={`bi ${config.icon}`} />
          </div>

          <div style={{ flex: 1 }}>
            <span
              className="cbt-reject-badge"
              style={{
                background: config.badgeBg,
                color: config.badgeColor,
                borderColor: config.badgeBorder,
              }}
            >
              <i className="bi bi-exclamation-circle-fill" /> {config.badgeText}
            </span>

            <h3 className="cbt-reject-title" style={{ color: config.titleColor }}>
              {rejection.title}
            </h3>

            <p className="cbt-reject-body">{rejection.message}</p>

            {/* If fee breakdown is available */}
            {summary && (
              <div className="cbt-fee-grid">
                <div className="cbt-fee-cell">
                  <span>Term Tuition</span>
                  <strong>₦{Number(summary.total_amount || 0).toLocaleString()}</strong>
                </div>
                <div className="cbt-fee-cell">
                  <span>Amount Paid</span>
                  <strong style={{ color: "#059669" }}>
                    ₦{Number(summary.amount_paid || 0).toLocaleString()}
                  </strong>
                </div>
                <div className="cbt-fee-cell">
                  <span>Outstanding Balance</span>
                  <strong style={{ color: "#dc2626" }}>
                    ₦{Number(summary.balance || 0).toLocaleString()}
                  </strong>
                </div>
                <div className="cbt-fee-cell">
                  <span>Paid Percentage</span>
                  <strong>
                    {summary.payment_percent || 0}% / {requiredPercent || 100}% needed
                  </strong>
                </div>
              </div>
            )}

            <div
              className="cbt-reject-advice"
              style={{
                borderLeftColor: config.iconColor,
                color: "#1e293b",
              }}
            >
              <strong>Next Action:</strong> {config.advice}
            </div>

            {onRetry && (
              <div className="mt-3">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-dark fw-bold px-3"
                  style={{ borderRadius: 8 }}
                  onClick={onRetry}
                >
                  <i className="bi bi-arrow-repeat me-1" /> Recheck Access Status
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
