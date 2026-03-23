import { useEffect, useState } from "react";

const STEPS = [
  "Initialising platform…",
  "Loading student records…",
  "Preparing result engine…",
  "Syncing parent portal…",
  "Almost ready…",
];

export default function FrontendLoader() {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress]   = useState(0);
  const [leaving, setLeaving]     = useState(false);

  /* Progress counter */
  useEffect(() => {
    const tick = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(tick); return 100; }
        return p + 1;
      });
    }, 28); // ~2.8s to reach 100
    return () => clearInterval(tick);
  }, []);

  /* Step text cycling */
  useEffect(() => {
    if (progress >= 100) {
      setStepIndex(STEPS.length - 1);
      setTimeout(() => setLeaving(true), 400);
      return;
    }
    const idx = Math.min(
      Math.floor((progress / 100) * (STEPS.length - 1)),
      STEPS.length - 2
    );
    setStepIndex(idx);
  }, [progress]);

  return (
    <>
     

      <div className={`ld-wrap ${leaving ? "ld-wrap--leaving" : ""}`} role="status" aria-live="polite">

        {/* Background orbit rings */}
        <div className="ld-bg-ring" aria-hidden="true" />
        <div className="ld-bg-ring" aria-hidden="true" />
        <div className="ld-bg-ring" aria-hidden="true" />

        <div className="ld-card">

          {/* Logo */}
          <div className="ld-logo">
            <span className="ld-logo-mark" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <polygon points="12,2 22,19 2,19"
                  stroke="#0a0f1e" strokeWidth="2"
                  strokeLinejoin="round" fill="none"/>
                <path d="M12 8v5M12 15.5v.5"
                  stroke="#0a0f1e" strokeWidth="2.2"
                  strokeLinecap="round"/>
              </svg>
            </span>
            <span className="ld-logo-name">GradeQuest</span>
            <span className="ld-logo-pill">AI</span>
          </div>

          {/* Animated SVG dashboard */}
          <div className="ld-illustration" aria-hidden="true">
            <svg viewBox="0 0 260 160" width="260" height="160" fill="none">
              <defs>
                <linearGradient id="ldGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c9a84c"/>
                  <stop offset="100%" stopColor="#92400e" stopOpacity="0.6"/>
                </linearGradient>
                <linearGradient id="ldBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1"/>
                  <stop offset="100%" stopColor="#3730a3" stopOpacity="0.6"/>
                </linearGradient>
                <linearGradient id="ldGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e"/>
                  <stop offset="100%" stopColor="#14532d" stopOpacity="0.5"/>
                </linearGradient>
              </defs>

              {/* Main panel */}
              <rect x="0" y="0" width="260" height="160" rx="12" className="ld-svg-panel"/>

              {/* Top bar */}
              <rect x="0" y="0" width="260" height="32" rx="12" fill="rgba(255,255,255,0.025)"/>
              <rect x="0" y="20" width="260" height="12" fill="rgba(255,255,255,0.025)"/>
              <circle cx="16" cy="16" r="4" fill="rgba(239,68,68,0.5)"/>
              <circle cx="30" cy="16" r="4" fill="rgba(234,179,8,0.5)"/>
              <circle cx="44" cy="16" r="4" fill="rgba(34,197,94,0.5)"/>
              <rect x="90" y="12" width="80" height="8" rx="4" fill="rgba(255,255,255,0.04)"/>

              {/* KPI cards */}
              <g className="ld-kpi">
                <rect x="8" y="40" width="72" height="36" rx="6" fill="rgba(201,168,76,0.08)"
                  stroke="rgba(201,168,76,0.18)" strokeWidth="1"/>
                <rect x="14" y="46" width="28" height="4" rx="2" fill="rgba(148,163,184,0.35)"/>
                <rect x="14" y="55" width="36" height="7" rx="2" fill="rgba(201,168,76,0.6)"/>
              </g>

              <g className="ld-kpi">
                <rect x="88" y="40" width="72" height="36" rx="6" fill="rgba(99,102,241,0.08)"
                  stroke="rgba(99,102,241,0.18)" strokeWidth="1"/>
                <rect x="94" y="46" width="24" height="4" rx="2" fill="rgba(148,163,184,0.3)"/>
                <rect x="94" y="55" width="40" height="7" rx="2" fill="rgba(99,102,241,0.6)"/>
              </g>

              <g className="ld-kpi">
                <rect x="168" y="40" width="84" height="36" rx="6" fill="rgba(34,197,94,0.08)"
                  stroke="rgba(34,197,94,0.15)" strokeWidth="1"/>
                <rect x="174" y="46" width="32" height="4" rx="2" fill="rgba(148,163,184,0.3)"/>
                <rect x="174" y="55" width="44" height="7" rx="2" fill="rgba(34,197,94,0.55)"/>
              </g>

              {/* Bar chart panel */}
              <rect x="8" y="84" width="152" height="68" rx="6" fill="rgba(255,255,255,0.02)"
                stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>

              {/* Bars */}
              <g>
                {[
                  { x: 18,  h: 34, fill: "url(#ldGold)" },
                  { x: 36,  h: 24, fill: "url(#ldBlue)" },
                  { x: 54,  h: 42, fill: "url(#ldGold)" },
                  { x: 72,  h: 18, fill: "url(#ldBlue)" },
                  { x: 90,  h: 48, fill: "url(#ldGold)" },
                  { x: 108, h: 30, fill: "url(#ldBlue)" },
                ].map((b, i) => (
                  <rect
                    key={i}
                    x={b.x} y={143 - b.h}
                    width="14" height={b.h}
                    rx="3" fill={b.fill}
                    className="ld-bar"
                    style={{ animationDelay: `${0.2 + i * 0.15}s` }}
                  />
                ))}
              </g>

              {/* Baseline */}
              <line x1="14" y1="143" x2="152" y2="143"
                stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>

              {/* Trend line on right panel */}
              <rect x="168" y="84" width="84" height="68" rx="6" fill="rgba(255,255,255,0.02)"
                stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>

              {/* Animated trend line */}
              <polyline
                points="174,142 187,132 200,136 213,118 226,122 240,106"
                fill="none"
                stroke="#22c55e"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ld-line"
                style={{ strokeDasharray: 120, strokeDashoffset: 120, animationDelay: "0.8s" }}
              />

              {/* Dots on trend */}
              {[
                { cx: 174, cy: 142 },
                { cx: 200, cy: 136 },
                { cx: 226, cy: 122 },
                { cx: 240, cy: 106 },
              ].map((d, i) => (
                <circle key={i} cx={d.cx} cy={d.cy} r="2.5"
                  fill="#22c55e" className="ld-dot-fade"
                  style={{ animationDelay: `${1.0 + i * 0.2}s` }}
                />
              ))}
            </svg>
          </div>

          {/* Status row */}
          <div className="ld-status-row">
            <span className="ld-step-text">{STEPS[stepIndex]}</span>
            <span className="ld-pct">{progress}%</span>
          </div>

          {/* Progress bar */}
          <div className="ld-track">
            <div className="ld-fill" style={{ width: `${progress}%` }} />
          </div>

          {/* Orbiting dot decoration */}
          <div className="ld-orbit" aria-hidden="true">
            <div className="ld-orbit-ring">
              <div className="ld-orbit-dot" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}