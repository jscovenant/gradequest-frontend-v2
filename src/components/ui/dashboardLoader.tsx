interface LoaderProps {
  message?: string;
  eyebrow?: string;
}

export default function Loader({ message = "Loading…", eyebrow = "GradiosEdu" }: LoaderProps) {
  return (
    <div className="gq-loader-backdrop" role="status" aria-live="polite" aria-label={message}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');

        .gq-loader-backdrop {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(15, 39, 68, 0.55);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          font-family: 'Plus Jakarta Sans', sans-serif;
          animation: gqFadeIn 0.2s ease-out both;
        }

        .gq-loader-box {
          width: 100%;
          max-width: 320px;
          background: #FFFFFF;
          border-radius: 20px;
          padding: 32px 24px 28px;
          text-align: center;
          box-shadow: 0 20px 40px -10px rgba(15, 39, 68, 0.3), 0 0 0 1px rgba(226, 232, 240, 0.8);
          animation: gqScaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
          position: relative;
        }

        .gq-loader-icon-wrap {
          position: relative;
          width: 68px;
          height: 68px;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .gq-loader-spinner-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 3px solid #E2E8F0;
          border-top-color: #D97706;
          border-right-color: #0F2744;
          animation: gqSpin 0.9s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .gq-loader-logo {
          width: 34px;
          height: 34px;
          object-fit: contain;
          border-radius: 8px;
          animation: gqPulse 2s ease-in-out infinite;
        }

        .gq-loader-eyebrow {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #D97706;
          margin-bottom: 6px;
        }

        .gq-loader-message {
          font-size: 14.5px;
          font-weight: 700;
          color: #0F2744;
          margin: 0;
          line-height: 1.4;
        }

        .gq-loader-bar {
          height: 3px;
          background: #F1F5F9;
          border-radius: 999px;
          margin-top: 20px;
          overflow: hidden;
          position: relative;
        }

        .gq-loader-bar::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 40%;
          background: linear-gradient(90deg, #D97706, #0F2744);
          border-radius: 999px;
          animation: gqSlide 1.2s ease-in-out infinite;
        }

        @keyframes gqFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes gqScaleUp {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes gqSpin {
          to { transform: rotate(360deg); }
        }

        @keyframes gqPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.92); opacity: 0.85; }
        }

        @keyframes gqSlide {
          0% { left: -40%; }
          100% { left: 100%; }
        }
      `}</style>

      <div className="gq-loader-box">
        <div className="gq-loader-icon-wrap">
          <div className="gq-loader-spinner-ring" />
          <img
            src="/media/logo/gradiosedu-logo.png?v=3"
            alt="GradiosEdu"
            className="gq-loader-logo"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        </div>
        <div className="gq-loader-eyebrow">{eyebrow}</div>
        <p className="gq-loader-message">{message}</p>
        <div className="gq-loader-bar" />
      </div>
    </div>
  );
}
