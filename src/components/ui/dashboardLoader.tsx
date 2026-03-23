// src/components/ui/dashboardLoader.tsx
import React from "react";

interface LoaderProps {
  message?: string;
}

const Loader: React.FC<LoaderProps> = ({ message = "Loading…" }) => {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@700&family=DM+Sans:wght@300;400&display=swap');

        .gq-loader-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(10, 15, 30, 0.55);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          pointer-events: none;
          animation: gqOverlayIn .2s ease both;
        }
        @keyframes gqOverlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .gq-loader-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          background: #fff;
          border: 1px solid rgba(0,0,0,.07);
          border-radius: 20px;
          padding: 36px 44px 32px;
          box-shadow: 0 24px 64px rgba(0,0,0,.22), 0 4px 16px rgba(0,0,0,.1);
          min-width: 220px;
          animation: gqCardIn .3s cubic-bezier(.34,1.2,.64,1) both;
        }
        @keyframes gqCardIn {
          from { opacity: 0; transform: scale(.92) translateY(10px); }
          to   { opacity: 1; transform: scale(1)  translateY(0); }
        }

        /* Logo mark */
        .gq-loader-mark {
          width: 48px;
          height: 48px;
          border-radius: 13px;
          background: linear-gradient(135deg, #c9a84c, #e8c97a);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          box-shadow: 0 4px 14px rgba(201,168,76,.35);
          animation: gqMarkPulse 2.4s ease-in-out infinite;
        }
        @keyframes gqMarkPulse {
          0%,100% { box-shadow: 0 4px 14px rgba(201,168,76,.35); }
          50%      { box-shadow: 0 4px 24px rgba(201,168,76,.6); }
        }

        /* Ring spinner */
        .gq-loader-ring-wrap {
          position: relative;
          width: 52px;
          height: 52px;
          margin-bottom: 20px;
        }

        .gq-loader-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 3px solid transparent;
        }

        .gq-loader-ring--track {
          border-color: #f0ebe3;
        }

        .gq-loader-ring--spin {
          border-top-color: #c9a84c;
          border-right-color: rgba(201,168,76,.3);
          animation: gqRingSpin .9s linear infinite;
        }

        .gq-loader-ring--inner {
          inset: 8px;
          border-top-color: #1a1a2e;
          border-right-color: transparent;
          animation: gqRingSpin .6s linear infinite reverse;
        }

        @keyframes gqRingSpin {
          to { transform: rotate(360deg); }
        }

        /* Center dot */
        .gq-loader-dot {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%,-50%);
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #c9a84c;
          animation: gqDotBeat 1.2s ease-in-out infinite;
        }
        @keyframes gqDotBeat {
          0%,100% { transform: translate(-50%,-50%) scale(1);   opacity: 1; }
          50%      { transform: translate(-50%,-50%) scale(1.5); opacity: .7; }
        }

        /* Message */
        .gq-loader-msg {
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          font-weight: 400;
          color: #7a6a5a;
          letter-spacing: .01em;
          white-space: nowrap;
          animation: gqMsgPulse 1.8s ease-in-out infinite;
        }
        @keyframes gqMsgPulse {
          0%,100% { opacity: 1; }
          50%      { opacity: .55; }
        }

        /* Dots trail */
        .gq-loader-dots {
          display: flex;
          gap: 5px;
          margin-top: 14px;
        }
        .gq-loader-dots span {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #e5ddd3;
          animation: gqDotTrail 1.2s ease-in-out infinite;
        }
        .gq-loader-dots span:nth-child(1) { animation-delay: 0s;    }
        .gq-loader-dots span:nth-child(2) { animation-delay: .18s;  }
        .gq-loader-dots span:nth-child(3) { animation-delay: .36s;  }
        @keyframes gqDotTrail {
          0%,80%,100% { background: #e5ddd3; transform: scale(1);    }
          40%          { background: #c9a84c; transform: scale(1.4);  }
        }
      `}</style>

      <div className="gq-loader-overlay" role="status" aria-live="polite" aria-label={message}>
        <div className="gq-loader-card">

          {/* Logo mark */}
          <div className="gq-loader-mark">
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L17 6v8l-7 4-7-4V6l7-4z"
                stroke="#0f172a" strokeWidth="1.6" strokeLinejoin="round"/>
              <path d="M10 10l7-4M10 10v8M10 10L3 6"
                stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>

          {/* Dual-ring spinner */}
          <div className="gq-loader-ring-wrap">
            <div className="gq-loader-ring gq-loader-ring--track" />
            <div className="gq-loader-ring gq-loader-ring--spin" />
            <div className="gq-loader-ring gq-loader-ring--inner" />
            <div className="gq-loader-dot" />
          </div>

          {/* Message */}
          <span className="gq-loader-msg">{message}</span>

          {/* Trailing dots */}
          <div className="gq-loader-dots" aria-hidden="true">
            <span /><span /><span />
          </div>

        </div>
      </div>
    </>
  );
};

export default Loader;