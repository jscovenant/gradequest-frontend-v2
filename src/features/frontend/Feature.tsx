import { useEffect, useRef } from "react";

/**
 * Feature.jsx — wired to your Bootstrap Sass variables
 *
 * Color hierarchy (no riot):
 *   $light  (#fcf8f8)   → section background, card surfaces           [~85%]
 *   $dark   (#050008)   → text, banner background                     [text]
 *   $secondary (amber)  → tag, CTA button, banner accent, ornament    [~8%]
 *   $primary (magenta)  → tag dot, title italic, active check ticks   [~5%]
 *   $info/$success/$warning → per-card data accents only              [~2%]
 *
 * Bootstrap classes used:
 *   Layout:  container-xl, row, col-md-6, col-lg-4, g-4
 *   Display: d-flex, flex-column, flex-wrap, align-items-center
 *   Spacing: gap-2/3/4, mb-3/4/5, mt-5, pt-4, px-4, py-3
 *   Text:    text-center, fw-light
 *   Misc:    position-relative, overflow-hidden
 */

const FEATURES = [
  {
    id: "students",
    number: "01",
    icon: (
      <svg viewBox="0 0 40 40" width="36" height="36" fill="none" aria-hidden="true">
        <circle cx="15" cy="13" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M4 33c0-6.075 4.925-11 11-11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <circle cx="28" cy="17" r="4" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M20 33c0-4.418 3.582-8 8-8h.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M33 25v8M29 29h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    /* $warning tint — warm amber, close to $secondary but distinct enough for data */
    accent: "rgb(245,158,11)",
    accentBg: "rgba(245,158,11,0.10)",
    title: "Student & Parent Management",
    text: "Every profile, guardian record, and document — organized and instantly accessible. No more paper trails.",
    bullets: ["Unified student records", "Live parent portal", "Bulk CSV import"],
  },
  {
    id: "results",
    number: "02",
    icon: (
      <svg viewBox="0 0 40 40" width="36" height="36" fill="none" aria-hidden="true">
        <rect x="8" y="5" width="24" height="30" rx="3" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M13 14h14M13 19h10M13 24h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M23 28l3 3 5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    /* $success tint */
    accent: "rgb(34,197,94)",
    accentBg: "rgba(34,197,94,0.09)",
    title: "Results & PIN System",
    text: "Publish results securely with scratch-card PINs, multi-step approval, and complete audit trails.",
    bullets: ["Scratch card generation", "Approval workflow", "Downloadable report cards"],
  },
  {
    id: "fees",
    number: "03",
    icon: (
      <svg viewBox="0 0 40 40" width="36" height="36" fill="none" aria-hidden="true">
        <rect x="5" y="10" width="30" height="22" rx="3" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M5 16h30" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="20" cy="25" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M20 22.5v5M18 24h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M10 10V8a2 2 0 012-2h16a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
    /* $info tint */
    accent: "rgb(59,130,246)",
    accentBg: "rgba(59,130,246,0.09)",
    title: "School Fees Tracking",
    text: "Know exactly who has paid, who owes, and how much — term by term. Send reminders without the awkward calls.",
    bullets: ["Payment ledger per student", "Outstanding balance alerts", "Term-wise fee structure"],
  },
  {
    id: "ai",
    number: "04",
    icon: (
      <svg viewBox="0 0 40 40" width="36" height="36" fill="none" aria-hidden="true">
        <rect x="6" y="10" width="28" height="20" rx="4" stroke="currentColor" strokeWidth="1.6"/>
        <circle cx="20" cy="20" r="4" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M20 10v3M20 27v3M6 20H9M31 20h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M13 15l1.8 1.8M25.2 23.2L27 25M27 15l-1.8 1.8M12.8 23.2L11 25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    /* $primary (magenta) tint — used for AI since it's the "smart" feature */
    accent: "rgb(211,0,176)",
    accentBg: "rgba(211,0,176,0.09)",
    title: "AI Result Monitoring",
    text: "Missing scores, grade anomalies, and outlier results get flagged automatically — before parents ever see them.",
    bullets: ["Score anomaly alerts", "Outlier detection", "Auto-reminder dispatch"],
  },
  {
    id: "analytics",
    number: "05",
    icon: (
      <svg viewBox="0 0 40 40" width="36" height="36" fill="none" aria-hidden="true">
        <path d="M6 32V22M13 32V16M20 32V10M27 32V19M34 32V13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M6 22l7-6 7-6 7 9 7-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="6" cy="22" r="2" fill="currentColor"/>
        <circle cx="20" cy="10" r="2" fill="currentColor"/>
        <circle cx="34" cy="13" r="2" fill="currentColor"/>
      </svg>
    ),
    /* $secondary (amber) tint — analytics = results = value */
    accent: "rgb(255,200,87)",
    accentBg: "rgba(255,200,87,0.12)",
    title: "Analytics & Insights",
    text: "See which subjects are struggling, which teachers are thriving, and which students need attention — at a glance.",
    bullets: ["Class & student rankings", "Term-on-term comparisons", "One-click export"],
  },
  {
    id: "attendance",
    number: "06",
    icon: (
      <svg viewBox="0 0 40 40" width="36" height="36" fill="none" aria-hidden="true">
        <rect x="7" y="9" width="26" height="24" rx="3" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M7 16h26" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M14 5v6M26 5v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M13 23l3 3 7-7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    /* $info tint, slightly cooler than fees */
    accent: "rgb(59,130,246)",
    accentBg: "rgba(59,130,246,0.08)",
    title: "Attendance Tracking",
    text: "Daily registers, absence summaries, and lesson notes — logged digitally and available to parents in real time.",
    bullets: ["Daily digital registers", "Absence summary reports", "Lesson note attachments"],
  },
  {
    id: "security",
    number: "07",
    icon: (
      <svg viewBox="0 0 40 40" width="36" height="36" fill="none" aria-hidden="true">
        <path d="M20 5l13 5v9c0 8-5.5 14-13 16C13 33 7 27 7 19V10l13-5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
        <path d="M15 20l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    /* $danger tint — security/risk context */
    accent: "rgb(239,68,68)",
    accentBg: "rgba(239,68,68,0.08)",
    title: "Security & Compliance",
    text: "Role-based access, automated daily backups, and tamper-proof audit logs keep your school's data airtight.",
    bullets: ["Granular permissions", "Full audit trails", "Automated backups"],
  },
];

function useScrollReveal(ref) {
  useEffect(() => {
    const els = ref.current?.querySelectorAll("[data-reveal]");
    if (!els) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            setTimeout(() => el.classList.add("revealed"), Number(el.dataset.delay || 0));
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.1 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ref]);
}

export default function Feature() {
  const sectionRef = useRef(null);
  useScrollReveal(sectionRef);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500&display=swap');

        /*
         * Token bridge — your Sass vars compile to these.
         * Fallbacks make it work regardless of BS CSS var emission.
         */
        :root {
          --f-bg:       var(--bs-light,     #fcf8f8);
          --f-dark:     var(--bs-dark,      #050008);
          --f-accent:   var(--bs-secondary, rgb(255,200,87));   /* amber — CTA, tag bg, ornament */
          --f-magenta:  var(--bs-primary,   rgb(211,0,176));    /* magenta — tag dot, italic, sparingly */
          --f-success:  var(--bs-success,   rgb(34,197,94));
          --f-info:     var(--bs-info,      rgb(59,130,246));
          --f-warning:  var(--bs-warning,   rgb(245,158,11));
          --f-danger:   var(--bs-danger,    rgb(239,68,68));

          --f-muted:    #6b6b7b;
          --f-border:   #e8e2d9;
          --f-num-idle: rgba(5,0,8,0.05);

          --f-accent-bg:     rgba(255,200,87,0.13);
          --f-accent-border: rgba(255,200,87,0.30);
          --f-magenta-bg:    rgba(211,0,176,0.08);
        }

        /* ── Section ── */
        .f-section {
          background: var(--f-bg);
          padding: 108px 0 120px;
          position: relative;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }

        /* Subtle paper texture */
        .f-section::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
        }

        /* Scallop wave bridging from dark hero bg */
        .f-scallop {
          display: block;
          width: 100%;
          overflow: hidden;
          line-height: 0;
          background: var(--f-dark);
        }
        .f-scallop svg { display: block; width: 100%; height: 64px; }

        .f-inner { position: relative; z-index: 1; }

        @media (max-width: 700px) {
          .f-section { padding: 72px 0 88px; }
        }

        /* ── Header ── */
        .f-header { margin-bottom: 68px; }

        /*
         * Tag chip — amber bg ($secondary), magenta dot ($primary)
         * This is the ONLY place both colours share a single element,
         * and they're kept at tiny scale so they don't fight.
         */
        .f-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--f-dark);
          background: var(--f-accent-bg);
          border: 1px solid var(--f-accent-border);
          border-radius: 100px;
          padding: 5px 14px;
        }
        .f-tag__dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--f-magenta);     /* magenta dot — tiny, punchy */
          animation: tagPulse 2s ease infinite;
        }
        @keyframes tagPulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:.4; transform:scale(1.5); }
        }

        .f-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(30px, 4vw, 52px);
          font-weight: 900;
          line-height: 1.12;
          color: var(--f-dark);
          max-width: 640px;
        }

        /* Italic = magenta highlight, same rule as hero em */
        .f-title em {
          font-style: italic;
          color: var(--f-magenta);
        }

        .f-subtitle {
          font-size: 16px;
          font-weight: 300;
          line-height: 1.8;
          color: var(--f-muted);
          max-width: 500px;
        }

        .f-ornament {
          display: flex;
          align-items: center;
          gap: 14px;
          color: var(--f-accent);           /* amber ornament line */
          opacity: 0.7;
        }
        .f-ornament__line { width: 72px; height: 1px; background: currentColor; }

        /* ── Cards ── */
        .f-card {
          background: #ffffff;
          border: 1px solid var(--f-border);
          border-radius: 14px;
          padding: 34px 30px 30px;
          position: relative;
          overflow: hidden;
          transition: box-shadow .3s ease, transform .3s ease, border-color .3s;
          height: 100%;        /* fills Bootstrap column height */
        }

        .f-card:hover {
          box-shadow: 0 16px 48px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04);
          transform: translateY(-5px);
          border-color: var(--c-bg);
        }

        /* Watermark number */
        .f-num {
          position: absolute;
          top: 18px; right: 22px;
          font-family: 'Playfair Display', serif;
          font-size: 44px;
          font-weight: 700;
          color: var(--f-num-idle);
          line-height: 1;
          user-select: none;
          pointer-events: none;
          transition: color .3s;
        }
        .f-card:hover .f-num { color: var(--c-bg); }

        /* Icon box */
        .f-icon {
          width: 50px; height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--c-bg);
          color: var(--c-fg);
          transition: transform .3s cubic-bezier(0.34,1.56,0.64,1);
          position: relative;
          z-index: 1;
        }
        .f-card:hover .f-icon { transform: scale(1.1) rotate(-4deg); }

        .f-card-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 17px;
          font-weight: 700;
          color: var(--f-dark);
          line-height: 1.3;
          position: relative;
          z-index: 1;
        }

        .f-card-text {
          font-size: 13.5px;
          font-weight: 300;
          line-height: 1.75;
          color: var(--f-muted);
          position: relative;
          z-index: 1;
        }

        .f-rule {
          height: 1px;
          background: var(--f-border);
          border: none;
        }

        .f-bullets {
          list-style: none;
          padding: 0; margin: 0;
          display: flex;
          flex-direction: column;
          gap: 7px;
          position: relative;
          z-index: 1;
        }
        .f-bullets li {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 12.5px;
          color: #8a8a9a;
          line-height: 1.4;
          transition: color .25s;
        }
        .f-card:hover .f-bullets li { color: var(--f-dark); opacity: .7; }

        .f-check {
          width: 16px; height: 16px;
          flex-shrink: 0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--c-bg);
        }

        /* ── Scroll reveal ── */
        [data-reveal] {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity .6s cubic-bezier(.4,0,.2,1), transform .6s cubic-bezier(.4,0,.2,1);
        }
        [data-reveal].revealed { opacity: 1; transform: translateY(0); }

        /* ── Bottom CTA banner ── */
        .f-banner {
          border-radius: 16px;
          padding: 48px 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 32px;
          flex-wrap: wrap;
          position: relative;
          overflow: hidden;

          /* $dark bg — same as hero, feels like one brand */
          background: var(--f-dark);
          border: 1px solid rgba(255,200,87,0.12);
        }

        /* Amber glow top-right */
        .f-banner::before {
          content: '';
          position: absolute;
          top: -80px; right: -80px;
          width: 280px; height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,200,87,0.10), transparent 70%);
          pointer-events: none;
        }
        /* Magenta glow bottom-left — very subtle */
        .f-banner::after {
          content: '';
          position: absolute;
          bottom: -60px; left: -60px;
          width: 200px; height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(211,0,176,0.07), transparent 70%);
          pointer-events: none;
        }

        .f-banner-kicker {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--f-accent);           /* amber kicker */
          display: block;
        }

        .f-banner-text {
          font-family: 'Playfair Display', serif;
          font-size: clamp(20px, 2.5vw, 28px);
          font-weight: 700;
          color: #ffffff;
          max-width: 440px;
          line-height: 1.35;
        }
        /* Highlighted phrase = amber ($secondary) */
        .f-banner-text span { color: var(--f-accent); }

        /* CTA — amber button, same pattern as hero */
        .btn-f-cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: var(--f-accent);
          color: var(--f-dark);
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 500;
          border: none;
          border-radius: 6px;
          padding: 14px 30px;
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
          position: relative;
          z-index: 1;
          transition: background .2s, transform .2s, box-shadow .2s;
        }
        .btn-f-cta:hover {
          background: #ffe0a0;
          color: var(--f-dark);
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(255,200,87,.22);
        }

        @media (max-width: 700px) {
          .f-banner { padding: 36px 28px; }
          .btn-f-cta { width: 100%; justify-content: center; }
        }
      `}</style>

      {/* Scallop wave — keeps the dark hero flowing into the light section */}
      <div className="f-scallop">
        <svg viewBox="0 0 1440 64" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0,0 C200,64 400,0 600,40 C800,80 1000,20 1200,48 C1320,64 1380,40 1440,32 L1440,64 L0,64 Z"
            fill="#fcf8f8"
          />
        </svg>
      </div>

      <section className="f-section" ref={sectionRef} id="features">
        <div className="f-inner container-xl">

          {/* Header — Bootstrap centering utilities */}
          <div
            className="f-header d-flex flex-column align-items-center text-center"
            data-reveal data-delay="0"
          >
            <span className="f-tag mb-4">
              <span className="f-tag__dot" />
              What's inside
            </span>

            <h2 className="f-title mb-4">
              Every tool your school needs,<br />
              <em>none of the clutter.</em>
            </h2>

            <p className="f-subtitle mb-0">
              Designed around the real daily work of Nigerian school administrators —
              not a generic checklist of SaaS features.
            </p>

            <div className="f-ornament mt-4">
              <span className="f-ornament__line" />
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 1l1.6 4.8H15l-4.4 3.2 1.7 4.8L8 11.2l-4.3 2.6 1.7-4.8L1 5.8h5.4z"
                  fill="currentColor"
                />
              </svg>
              <span className="f-ornament__line" />
            </div>
          </div>

          {/* Cards — Bootstrap grid replaces custom f-grid */}
          <div className="row g-4">
            {FEATURES.map((f, i) => (
              <div
                key={f.id}
                className="col-12 col-md-6 col-lg-4"
                data-reveal
                data-delay={100 + (i % 3) * 90}
              >
                <div
                  className="f-card"
                  style={{ "--c-fg": f.accent, "--c-bg": f.accentBg }}
                >
                  <span className="f-num" aria-hidden="true">{f.number}</span>

                  <div className="f-icon mb-3">{f.icon}</div>

                  <h3 className="f-card-title mb-2">{f.title}</h3>
                  <p className="f-card-text mb-3">{f.text}</p>

                  <hr className="f-rule mb-3" />

                  <ul className="f-bullets">
                    {f.bullets.map((b, idx) => (
                      <li key={idx}>
                        <span className="f-check">
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path
                              d="M1.5 4l2 2 3-3"
                              stroke={f.accent}
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Banner */}
          <div className="f-banner mt-5" data-reveal data-delay="200">
            <div className="position-relative" style={{ zIndex: 1 }}>
              <span className="f-banner-kicker mb-2">Get started today</span>
              <p className="f-banner-text mb-0">
                Ready to see how it fits your school?<br />
                <span>Free walkthrough — no commitment needed.</span>
              </p>
            </div>
            <a href="#" className="btn btn-f-cta">
              Book a Demo
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 7h12M7 1l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>

        </div>
      </section>
    </>
  );
}