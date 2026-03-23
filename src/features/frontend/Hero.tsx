/**
 * Hero.jsx — wired to your Bootstrap Sass variables
 *
 * Color hierarchy (no riot):
 *   $dark  (#050008)  → section bg, card surfaces, sidebar         [~85% weight]
 *   $secondary (amber)→ CTAs, stat values, chart primary bars       [~10% weight]
 *   $primary (magenta)→ label dot, headline underline, active strip  [~4% weight]
 *   $info/$success    → data-only: chart alt bars, status pills      [~1% weight]
 *
 * Bootstrap classes used:
 *   Layout:  container-xl, row, col-lg-6, g-5, align-items-center
 *   Display: d-flex, flex-column, flex-wrap
 *   Spacing: gap-2/3/4/5, mb-3/4, mt-5, pt-4, px-4, py-3, py-lg-5
 *   Text:    text-white, fw-light
 */

export default function Hero() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500&display=swap');

        /*
         * Bridge: Bootstrap compiles your Sass vars to CSS custom properties.
         * --bs-primary   = rgb(211,0,176)
         * --bs-secondary = rgb(255,200,87)
         * --bs-dark      = #050008
         * --bs-info      = rgb(59,130,246)
         * --bs-success   = rgb(34,197,94)
         *
         * We alias them here with fallbacks so the hero works
         * even if BS CSS vars are not emitted by your build.
         */
        :root {
          --h-bg:       var(--bs-dark,       #050008);
          --h-accent:   var(--bs-secondary,  rgb(255,200,87));
          --h-magenta:  var(--bs-primary,    rgb(211,0,176));
          --h-info:     var(--bs-info,       rgb(59,130,246));
          --h-success:  var(--bs-success,    rgb(34,197,94));
          --h-slate:    rgba(255,255,255,0.45);
          --h-white:    #ffffff;

          --h-accent-glow:   rgba(255,200,87,0.18);
          --h-accent-border: rgba(255,200,87,0.22);
          --h-surface:       rgba(255,255,255,0.035);
          --h-border:        rgba(255,255,255,0.07);
        }

        .hero-section {
          background-color: var(--h-bg);
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }

        .hero-section::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,200,87,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,200,87,0.025) 1px, transparent 1px);
          background-size: 64px 64px;
          pointer-events: none;
          z-index: 0;
        }

        .h-glow {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
        }
        .h-glow--tl {
          top: -12%; left: -10%;
          width: 560px; height: 560px;
          background: radial-gradient(circle, rgba(211,0,176,0.08) 0%, transparent 68%);
        }
        .h-glow--br {
          bottom: -18%; right: -8%;
          width: 640px; height: 640px;
          background: radial-gradient(circle, rgba(255,200,87,0.07) 0%, transparent 68%);
        }

        .hero-inner { position: relative; z-index: 1; }

        /* Label — magenta, used sparingly */
        .hero-label {
          display: inline-flex;
          align-items: center;
          gap: .5rem;
          font-size: 10.5px;
          font-weight: 500;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: var(--h-magenta);
          opacity: 0;
          animation: fadeUp .6s ease .1s forwards;
        }
        .hero-label__dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--h-magenta);
          animation: blink 2s ease infinite;
        }

        .hero-headline {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(40px, 5vw, 68px);
          font-weight: 900;
          line-height: 1.07;
          color: var(--h-white);
          opacity: 0;
          animation: fadeUp .7s ease .2s forwards;
        }
        .hero-headline em {
          font-style: normal;
          color: var(--h-accent);
          position: relative;
        }
        .hero-headline em::after {
          content: '';
          position: absolute;
          left: 0; right: 0; bottom: 3px;
          height: 2px;
          background: linear-gradient(90deg, var(--h-magenta), transparent);
          border-radius: 2px;
        }

        .hero-desc {
          font-size: 16px;
          font-weight: 300;
          line-height: 1.8;
          color: var(--h-slate);
          max-width: 460px;
          opacity: 0;
          animation: fadeUp .7s ease .3s forwards;
        }

        .hero-ctas {
          opacity: 0;
          animation: fadeUp .7s ease .4s forwards;
        }

        /* Primary CTA — amber ($secondary), warm + readable on near-black */
        .btn-hero-cta {
          background: var(--h-accent);
          color: var(--h-bg);
          border-color: var(--h-accent);
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: .02em;
          border-radius: 4px;
          transition: background .2s, transform .2s, box-shadow .2s;
        }
        .btn-hero-cta:hover {
          background: #ffe0a0;
          border-color: #ffe0a0;
          color: var(--h-bg);
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(255,200,87,.22);
        }

        /* Ghost CTA — white ghost, doesn't add a 3rd hue */
        .btn-hero-ghost {
          background: transparent;
          color: rgba(255,255,255,.82);
          border: 1px solid rgba(255,255,255,.16);
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 400;
          border-radius: 4px;
          transition: border-color .2s, background .2s, transform .2s;
        }
        .btn-hero-ghost:hover {
          border-color: rgba(255,255,255,.38);
          background: rgba(255,255,255,.05);
          color: #fff;
          transform: translateY(-2px);
        }

        .hero-stats {
          border-top: 1px solid var(--h-border);
          opacity: 0;
          animation: fadeUp .7s ease .55s forwards;
        }
        .stat-value {
          font-family: 'Playfair Display', serif;
          font-size: 26px;
          font-weight: 700;
          color: var(--h-accent);
        }
        .stat-label {
          font-size: 11px;
          color: var(--h-slate);
          letter-spacing: .06em;
        }

        .hero-right {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          opacity: 0;
          animation: fadeIn 1s ease .5s forwards;
        }

        .float-card {
          position: absolute;
          background: rgba(5,0,8,.75);
          border: 1px solid var(--h-accent-border);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-radius: 10px;
          padding: 14px 18px;
          font-size: 13px;
          color: var(--h-white);
          white-space: nowrap;
          box-shadow: 0 4px 28px rgba(0,0,0,.5);
        }
        .float-card--a { top: 8%;    right: -16px; animation: floatA 4s ease-in-out infinite; }
        .float-card--b { bottom: 10%; left: -28px; animation: floatB 5s ease-in-out infinite; }

        .float-card__tag {
          font-size: 9.5px; font-weight: 500;
          letter-spacing: .14em; text-transform: uppercase;
          color: var(--h-accent);
          margin-bottom: 5px;
        }
        .float-card__value {
          font-family: 'Playfair Display', serif;
          font-size: 21px; font-weight: 700;
          color: var(--h-white);
        }
        .float-card__sub { font-size: 11px; color: var(--h-slate); margin-top: 3px; }

        .pill-ai {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--h-accent-glow);
          border: 1px solid var(--h-accent-border);
          border-radius: 100px;
          padding: 3px 11px;
          font-size: 10.5px;
          color: var(--h-accent);
          font-weight: 500;
        }
        .pill-ai__dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--h-success);
          animation: blink 1.8s ease infinite;
        }

        .orbit-ring          { transform-origin: center; animation: spin 30s linear infinite; }
        .orbit-ring--slow    { animation-duration: 48s; }
        .orbit-ring--reverse { animation-direction: reverse; animation-duration: 22s; }

        .hero-divider {
          position: absolute;
          left: 0; right: 0; bottom: 0; height: 1px;
          background: linear-gradient(90deg, transparent, var(--h-accent-border), transparent);
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes blink {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: .35; transform: scale(1.55); }
        }
        @keyframes floatA {
          0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); }
        }
        @keyframes floatB {
          0%,100% { transform: translateY(0); } 50% { transform: translateY(7px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); } to { transform: rotate(360deg); }
        }
      `}</style>

      <section className="hero-section position-relative">
        <div className="h-glow h-glow--tl" />
        <div className="h-glow h-glow--br" />

        <div className="hero-inner container-xl py-5">
          <div className="row align-items-center g-5 min-vh-100">

            {/* ── LEFT COLUMN ── */}
            <div className="col-lg-6 d-flex flex-column py-lg-5">

              <span className="hero-label mb-3">
                <span className="hero-label__dot" />
                School Intelligence Platform
              </span>

              <h1 className="hero-headline mb-4">
                Run Every School
                <br /><em>Smarter.</em> Not Harder.
              </h1>

              <p className="hero-desc mb-4">
                A unified platform for Nigerian schools — from student records and
                result computation to parent portals and compliance reporting.
                Built for administrators who mean business.
              </p>

              <div className="hero-ctas d-flex flex-wrap gap-3">
                <a href="#" className="btn btn-hero-cta d-inline-flex align-items-center gap-2 px-4 py-3">
                  Request Access
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
                <a href="#" className="btn btn-hero-ghost d-inline-flex align-items-center gap-2 px-4 py-3">
                  Watch Demo
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M5.5 5l4 2-4 2V5z" fill="currentColor"/>
                  </svg>
                </a>
              </div>

              <div className="hero-stats d-flex gap-5 mt-5 pt-4">
                {[
                  { value: '500+',  label: 'Schools onboarded' },
                  { value: '2M+',   label: 'Results processed' },
                  { value: '99.9%', label: 'Uptime SLA' },
                ].map(s => (
                  <div key={s.value} className="d-flex flex-column gap-1">
                    <span className="stat-value">{s.value}</span>
                    <span className="stat-label">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT COLUMN — SVG Dashboard ── */}
            <div className="col-lg-6">
              <div className="hero-right">

                <svg viewBox="0 0 520 520" width="520" height="520"
                     aria-hidden="true" style={{ maxWidth: '100%' }}>
                  <defs>
                    <linearGradient id="g-amber" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%"   stopColor="rgb(255,200,87)" />
                      <stop offset="100%" stopColor="#ffe0a0" />
                    </linearGradient>
                    <linearGradient id="g-magenta" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%"   stopColor="rgb(211,0,176)" />
                      <stop offset="100%" stopColor="rgb(240,60,210)" />
                    </linearGradient>
                    <linearGradient id="g-info" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%"   stopColor="rgb(59,130,246)" />
                      <stop offset="100%" stopColor="rgb(99,102,241)" />
                    </linearGradient>
                    <linearGradient id="g-panel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#130015" />
                      <stop offset="100%" stopColor="#050008" />
                    </linearGradient>
                    <filter id="f-shadow">
                      <feDropShadow dx="0" dy="10" stdDeviation="18"
                        floodColor="#000" floodOpacity="0.55"/>
                    </filter>
                    <filter id="f-glow-amber">
                      <feGaussianBlur stdDeviation="5" result="blur"/>
                      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                  </defs>

                  {/* Orbit rings */}
                  <g transform="translate(260,260)">
                    <g className="orbit-ring">
                      <ellipse cx="0" cy="0" rx="230" ry="230"
                        fill="none" stroke="rgba(255,200,87,0.07)" strokeWidth="1"/>
                      <circle cx="230" cy="0" r="4" fill="rgba(255,200,87,0.45)"/>
                      <circle cx="-230" cy="0" r="2.5" fill="rgba(255,200,87,0.25)"/>
                    </g>
                    <g className="orbit-ring orbit-ring--slow">
                      <ellipse cx="0" cy="0" rx="190" ry="190"
                        fill="none" stroke="rgba(211,0,176,0.07)"
                        strokeWidth="1" strokeDasharray="4 8"/>
                      <circle cx="0" cy="-190" r="3" fill="rgba(211,0,176,0.35)"/>
                    </g>
                    <g className="orbit-ring orbit-ring--reverse">
                      <ellipse cx="0" cy="0" rx="155" ry="155"
                        fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                      <circle cx="155" cy="0" r="2" fill="rgba(255,255,255,0.15)"/>
                      <circle cx="0" cy="155" r="3" fill="rgba(255,200,87,0.2)"/>
                    </g>
                  </g>

                  {/* Dashboard card shell */}
                  <rect x="85" y="85" width="350" height="350" rx="16"
                    fill="url(#g-panel)" filter="url(#f-shadow)"/>
                  <rect x="85" y="85" width="350" height="350" rx="16"
                    fill="none" stroke="rgba(255,200,87,0.12)" strokeWidth="1"/>

                  {/* Title bar */}
                  <rect x="85" y="85" width="350" height="48" rx="16"
                    fill="rgba(255,255,255,0.025)"/>
                  <rect x="85" y="117" width="350" height="16"
                    fill="rgba(255,255,255,0.025)"/>
                  <circle cx="112" cy="109" r="5" fill="rgba(239,68,68,0.55)"/>
                  <circle cx="130" cy="109" r="5" fill="rgba(255,200,87,0.55)"/>
                  <circle cx="148" cy="109" r="5" fill="rgba(34,197,94,0.55)"/>
                  <rect x="195" y="104" width="150" height="10" rx="5"
                    fill="rgba(255,255,255,0.04)"/>

                  {/* Sidebar */}
                  <rect x="85" y="133" width="60" height="302" fill="rgba(0,0,0,0.2)"/>
                  <rect x="85" y="142" width="3" height="18" rx="1.5" fill="url(#g-magenta)"/>
                  <rect x="93" y="148" width="44" height="6" rx="3" fill="rgba(255,200,87,0.45)"/>
                  {[165,181,197,213,229].map((y,i) => (
                    <rect key={i} x="93" y={y} width={[36,40,32,38,34][i]}
                      height="5" rx="2.5" fill="rgba(255,255,255,0.10)"/>
                  ))}

                  {/* KPI 1 */}
                  <rect x="155" y="143" width="90" height="62" rx="8"
                    fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
                  <rect x="163" y="151" width="28" height="4" rx="2" fill="rgba(255,255,255,0.2)"/>
                  <text x="163" y="183" fontFamily="Georgia,serif" fontSize="20" fontWeight="700" fill="#fff">1,284</text>
                  <rect x="163" y="189" width="40" height="3" rx="1.5" fill="rgba(34,197,94,0.55)"/>

                  {/* KPI 2 — amber */}
                  <rect x="255" y="143" width="90" height="62" rx="8"
                    fill="rgba(255,200,87,0.07)" stroke="rgba(255,200,87,0.18)" strokeWidth="1"/>
                  <rect x="263" y="151" width="34" height="4" rx="2" fill="rgba(255,200,87,0.38)"/>
                  <text x="263" y="183" fontFamily="Georgia,serif" fontSize="20" fontWeight="700" fill="rgb(255,200,87)">96.4%</text>
                  <rect x="263" y="189" width="50" height="3" rx="1.5" fill="rgba(255,200,87,0.3)"/>

                  {/* KPI 3 — info blue */}
                  <rect x="355" y="143" width="72" height="62" rx="8"
                    fill="rgba(59,130,246,0.07)" stroke="rgba(59,130,246,0.18)" strokeWidth="1"/>
                  <rect x="363" y="151" width="28" height="4" rx="2" fill="rgba(59,130,246,0.35)"/>
                  <text x="363" y="183" fontFamily="Georgia,serif" fontSize="20" fontWeight="700" fill="rgb(59,130,246)">48</text>
                  <rect x="363" y="189" width="36" height="3" rx="1.5" fill="rgba(59,130,246,0.35)"/>

                  {/* Bar chart */}
                  <rect x="155" y="220" width="272" height="120" rx="8"
                    fill="rgba(255,255,255,0.018)" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                  <rect x="164" y="228" width="72" height="5" rx="2.5" fill="rgba(255,255,255,0.15)"/>
                  {[
                    {x:170,h:55,c:'url(#g-amber)'},
                    {x:196,h:40,c:'rgba(59,130,246,0.5)'},
                    {x:222,h:65,c:'url(#g-amber)'},
                    {x:248,h:30,c:'rgba(59,130,246,0.5)'},
                    {x:274,h:72,c:'url(#g-amber)'},
                    {x:300,h:50,c:'rgba(59,130,246,0.5)'},
                    {x:326,h:82,c:'url(#g-amber)'},
                    {x:352,h:44,c:'rgba(59,130,246,0.5)'},
                    {x:378,h:60,c:'url(#g-amber)'},
                    {x:404,h:34,c:'rgba(59,130,246,0.5)'},
                  ].map((b,i) => (
                    <rect key={i} x={b.x} y={325-b.h} width="18" height={b.h}
                      rx="3" fill={b.c} opacity="0.88"/>
                  ))}
                  <line x1="163" y1="325" x2="425" y2="325"
                    stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>

                  {/* Table */}
                  <rect x="155" y="356" width="272" height="64" rx="8"
                    fill="rgba(255,255,255,0.018)" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                  <rect x="163" y="362" width="256" height="14" rx="4" fill="rgba(255,255,255,0.035)"/>
                  {[[167,40],[280,32],[370,32]].map(([x,w],i) => (
                    <rect key={i} x={x} y="365" width={w} height="5" rx="2.5" fill="rgba(255,255,255,0.2)"/>
                  ))}
                  {[382,396,407].map((y,i) => (
                    <g key={i}>
                      <rect x="167" y={y} width="48" height="4" rx="2" fill="rgba(255,255,255,0.12)"/>
                      <rect x="280" y={y} width="24" height="4" rx="2"
                        fill={['rgba(34,197,94,0.5)','rgba(255,200,87,0.5)','rgba(59,130,246,0.5)'][i]}/>
                      <rect x="370" y={y} width="32" height="4" rx="2" fill="rgba(255,200,87,0.28)"/>
                    </g>
                  ))}

                  {/* School badge — amber */}
                  <circle cx="435" cy="85" r="28"
                    fill="url(#g-amber)" filter="url(#f-glow-amber)"/>
                  <polygon points="435,71 452,79 435,87 418,79" fill="#050008"/>
                  <rect x="433" y="87" width="4" height="8" rx="1" fill="#050008"/>
                  <line x1="452" y1="79" x2="452" y2="90"
                    stroke="#050008" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="452" cy="91" r="2.5" fill="#050008"/>

                  {/* AI sparkle — magenta */}
                  <g transform="translate(85,435)">
                    <circle cx="0" cy="0" r="20"
                      fill="rgba(211,0,176,0.1)" stroke="rgba(211,0,176,0.25)" strokeWidth="1"/>
                    <path d="M0,-10 L2,-2 L10,0 L2,2 L0,10 L-2,2 L-10,0 L-2,-2Z"
                      fill="url(#g-magenta)" opacity="0.85"/>
                  </g>
                </svg>

                {/* Floating card A */}
                <div className="float-card float-card--a">
                  <div className="float-card__tag">Today's Summary</div>
                  <div className="float-card__value">1,284</div>
                  <div className="float-card__sub">Students present · 96.4% attendance</div>
                </div>

                {/* Floating card B */}
                <div className="float-card float-card--b">
                  <div className="mb-2">
                    <span className="pill-ai">
                      <span className="pill-ai__dot" />
                      AI Engine
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)' }}>
                    Broadsheet generated{' '}
                    <strong style={{ color: 'rgb(255,200,87)' }}>0.8s</strong>
                  </div>
                  <div className="float-card__sub mt-1">JSS 3 · 58 students · Term 2</div>
                </div>

              </div>
            </div>

          </div>
        </div>

        <div className="hero-divider" />
      </section>
    </>
  );
}