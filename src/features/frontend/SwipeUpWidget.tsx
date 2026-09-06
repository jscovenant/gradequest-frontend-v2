import { useState, useEffect } from "react";

export default function SwipeUpWidget() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      
      if (scrollHeight > 0) {
        const progress = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));
        setScrollProgress(progress);
      }

      if (scrollTop > 320) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY - touchEndY;

    // Swiping up (finger moved up by at least 40px)
    if (diff > 40) {
      scrollToTop();
    }
    setTouchStartY(null);
  };

  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scrollProgress / 100) * circumference;

  return (
    <>
      <style>{`
        .gq-swipe-up-container {
          position: fixed;
          bottom: 28px;
          right: 28px;
          z-index: 999;
          display: flex;
          align-items: center;
          gap: 10px;
          opacity: 0;
          visibility: hidden;
          transform: translateY(20px) scale(0.9);
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .gq-swipe-up-container.visible {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1);
        }

        .gq-swipe-up-btn {
          position: relative;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #0F2744;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #FFFFFF;
          box-shadow: 0 10px 30px rgba(15, 39, 68, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.15);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          user-select: none;
          outline: none;
        }

        .gq-swipe-up-btn:hover {
          transform: translateY(-4px) scale(1.06);
          box-shadow: 0 14px 36px rgba(15, 39, 68, 0.45), 0 0 20px rgba(217, 119, 6, 0.4);
          background: linear-gradient(135deg, #0F2744 0%, #1D4ED8 100%);
        }

        .gq-swipe-up-btn:active {
          transform: translateY(-1px) scale(0.96);
        }

        .gq-progress-svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 52px;
          height: 52px;
          transform: rotate(-90deg);
          pointer-events: none;
        }

        .gq-progress-bg {
          fill: none;
          stroke: rgba(255, 255, 255, 0.12);
          stroke-width: 3.5;
        }

        .gq-progress-bar {
          fill: none;
          stroke: #F59E0B;
          stroke-width: 3.5;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.15s ease;
        }

        .gq-arrow-icon {
          animation: gqArrowBounce 1.8s infinite ease-in-out;
          color: #FFFFFF;
          z-index: 2;
        }

        @keyframes gqArrowBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        /* Tooltip Pill */
        .gq-swipe-pill-label {
          background: rgba(15, 39, 68, 0.94);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: #FFFFFF;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 4px 16px rgba(15, 39, 68, 0.2);
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          letter-spacing: 0.02em;
        }

        .gq-swipe-pill-label:hover {
          background: #0F2744;
          border-color: #F59E0B;
          color: #FBBF24;
          transform: translateX(-2px);
        }

        @media (max-width: 576px) {
          .gq-swipe-up-container {
            bottom: 20px;
            right: 20px;
          }
          .gq-swipe-pill-label {
            display: none;
          }
        }
      `}</style>

      <div
        className={`gq-swipe-up-container ${isVisible ? "visible" : ""}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="gq-swipe-pill-label" onClick={scrollToTop}>
          <span>⚡ Swipe Up</span>
          <span style={{ color: "#F59E0B", fontSize: "11px" }}>{Math.round(scrollProgress)}%</span>
        </div>

        <button
          type="button"
          className="gq-swipe-up-btn"
          onClick={scrollToTop}
          title="Swipe up to top"
          aria-label="Swipe up to top"
        >
          <svg className="gq-progress-svg" viewBox="0 0 52 52">
            <circle
              className="gq-progress-bg"
              cx="26"
              cy="26"
              r={radius}
            />
            <circle
              className="gq-progress-bar"
              cx="26"
              cy="26"
              r={radius}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>

          <svg
            className="gq-arrow-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      </div>
    </>
  );
}
