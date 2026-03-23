import { useMemo } from "react";

/**
 * Schools.jsx — wired to your Bootstrap Sass variables
 *
 * Color hierarchy (no riot):
 *   $light  (#fcf8f8)   → wave source bg                              [transition]
 *   #f0ece5 (warm off-white derived from $light) → section bg        [~85%]
 *   $dark   (#050008)   → all headings, pill names                   [text]
 *   $secondary (amber)  → kicker dot, count values, pill hover border [~8%]
 *   $primary (magenta)  → title italic, bg-circle glow               [~5%]
 *   $warning/$info/$success/$danger → per-pill monogram palettes only [~2%]
 *
 * Bootstrap classes used:
 *   Layout:  container-xl
 *   Display: d-flex, flex-column, flex-wrap, align-items-center, justify-content-center
 *   Spacing: gap-2/3/4, mb-3/4/5, mt-4, py-5
 *   Text:    text-center, fw-light
 */

type School = { name: string; tag: string; location?: string };

const SCHOOLS: School[] = [
  { name: "Bright Future Academy",      tag: "Primary · Secondary", location: "Lagos" },
  { name: "Royal Scholars College",     tag: "Secondary",           location: "Abuja" },
  { name: "Unity High School",          tag: "Secondary",           location: "Port Harcourt" },
  { name: "Greenfield School",          tag: "Primary",             location: "Ibadan" },
  { name: "Cedar Heights College",      tag: "Secondary",           location: "Kano" },
  { name: "Prime Scholars Institute",   tag: "Tertiary",            location: "Enugu" },
  { name: "Heritage International School", tag: "Primary · Secondary", location: "Lagos" },
  { name: "Pinnacle Academy",           tag: "Secondary",           location: "Benin City" },
  { name: "Sunrise Model School",       tag: "Primary",             location: "Kaduna" },
  { name: "Excellence Preparatory",     tag: "Secondary",           location: "Owerri" },
  { name: "St. Michael's College",      tag: "Secondary",           location: "Calabar" },
  { name: "Diamond Scholars School",    tag: "Primary",             location: "Abeokuta" },
];

function initials(name: string) {
  const words = name.trim().split(/\s+/);
  return words.length === 1
    ? words[0][0]
    : (words[0][0] + words[1][0]).toUpperCase();
}

/*
 * Monogram palette — uses your BS semantic colours at low opacity backgrounds.
 * fg colours are dark enough for legibility on their bg.
 * $primary (magenta) and $secondary (amber) are included but capped to 2 slots
 * so no single hue dominates the marquee visually.
 */
const PALETTE = [
  { bg: "rgba(255,200,87,0.15)",  fg: "rgb(180,120,0)" },      // $secondary tint
  { bg: "rgba(59,130,246,0.12)",  fg: "rgb(30,64,175)" },      // $info tint
  { bg: "rgba(34,197,94,0.12)",   fg: "rgb(6,95,70)" },        // $success tint
  { bg: "rgba(211,0,176,0.10)",   fg: "rgb(155,0,128)" },      // $primary tint
  { bg: "rgba(245,158,11,0.13)",  fg: "rgb(120,53,15)" },      // $warning tint
  { bg: "rgba(59,130,246,0.10)",  fg: "rgb(12,74,110)" },      // $info tint (cooler)
  { bg: "rgba(34,197,94,0.10)",   fg: "rgb(20,83,45)" },       // $success tint (deep)
  { bg: "rgba(255,200,87,0.12)",  fg: "rgb(113,63,18)" },      // $secondary tint (deep)
  { bg: "rgba(239,68,68,0.10)",   fg: "rgb(153,27,27)" },      // $danger tint
  { bg: "rgba(245,158,11,0.10)",  fg: "rgb(146,64,14)" },      // $warning tint (muted)
  { bg: "rgba(59,130,246,0.09)",  fg: "rgb(30,58,138)" },      // $info tint (deep)
  { bg: "rgba(211,0,176,0.08)",   fg: "rgb(131,24,67)" },      // $primary tint (muted)
];

interface PillProps { school: School; index: number; }

function SchoolPill({ school, index }: PillProps) {
  const color = PALETTE[index % PALETTE.length];
  return (
    <div className="sp-pill">
      <span className="sp-mono" style={{ background: color.bg, color: color.fg }}>
        {initials(school.name)}
      </span>
      <span className="sp-name">{school.name}</span>
      <span className="sp-divider" aria-hidden="true" />
      <span className="sp-tag">{school.tag}</span>
      {school.location && (
        <>
          <span className="sp-divider" aria-hidden="true" />
          <span className="sp-loc">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1C4.067 1 2.5 2.567 2.5 4.5c0 3 3.5 6.5 3.5 6.5s3.5-3.5 3.5-6.5C9.5 2.567 7.933 1 6 1z"
                stroke="currentColor" strokeWidth="1.2" fill="none"/>
              <circle cx="6" cy="4.5" r="1.2" fill="currentColor"/>
            </svg>
            {school.location}
          </span>
        </>
      )}
    </div>
  );
}

export default function Schools() {
  const rowA = useMemo(() => {
    const half = SCHOOLS.slice(0, Math.ceil(SCHOOLS.length / 2));
    return [...half, ...half, ...half];
  }, []);

  const rowB = useMemo(() => {
    const half = SCHOOLS.slice(Math.ceil(SCHOOLS.length / 2));
    return [...half, ...half, ...half];
  }, []);

  const offsetB = Math.ceil(SCHOOLS.length / 2);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500&display=swap');

        /*
         * Token bridge — Bootstrap compiles your Sass vars to these.
         * Fallbacks ensure it works regardless of BS CSS var emission.
         */
        :root {
          --sp-bg:       #f0ece5;                                /* slightly warmer than $light — own surface */
          --sp-source:   var(--bs-light,      #fcf8f8);          /* wave source = Feature section bg */
          --sp-dark:     var(--bs-dark,       #050008);
          --sp-accent:   var(--bs-secondary,  rgb(255,200,87));  /* amber — dots, counts, hover */
          --sp-magenta:  var(--bs-primary,    rgb(211,0,176));   /* magenta — italic, glow */
          --sp-muted:    #7a6a5a;
          --sp-border:   #e5ddd3;
          --sp-pill-bg:  #ffffff;
          --sp-pill-bd:  #e8e0d5;
        }

        /* ── Wave transition from Feature cream ── */
        .sp-wave {
          display: block;
          width: 100%;
          overflow: hidden;
          line-height: 0;
          background: var(--sp-source);
        }
        .sp-wave svg { display: block; width: 100%; height: 56px; }

        /* ── Section shell ── */
        .sp-section {
          background: var(--sp-bg);
          padding: 108px 0 120px;
          position: relative;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }

        /* Grain texture */
        .sp-section::before {
          content: '';
          position: absolute; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
        }

        /* Decorative bg circle — magenta glow, very dim */
        .sp-bg-circle {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 700px; height: 700px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(211,0,176,0.04) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .sp-inner { position: relative; z-index: 1; }

        @media (max-width: 640px) {
          .sp-section { padding: 72px 0 88px; }
        }

        /* ── Kicker ── */
        .sp-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--sp-dark);
          opacity: 0.6;
        }
        /* Amber dot — $secondary, consistent with hero/feature dots */
        .sp-kicker__dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--sp-accent);
          animation: spPulse 2s ease infinite;
        }
        @keyframes spPulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:.35; transform:scale(1.55); }
        }

        /* ── Title ── */
        .sp-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(32px, 4vw, 50px);
          font-weight: 900;
          color: var(--sp-dark);
          line-height: 1.12;
        }
        /* Italic = magenta — same rule across all sections */
        .sp-title em {
          font-style: italic;
          color: var(--sp-magenta);
        }

        .sp-subtitle {
          font-size: 15.5px;
          font-weight: 300;
          color: var(--sp-muted);
          max-width: 480px;
          line-height: 1.75;
        }

        /* ── Count pill ── */
        .sp-counts {
          display: inline-flex;
          align-items: center;
          gap: 24px;
          background: var(--sp-pill-bg);
          border: 1px solid var(--sp-border);
          border-radius: 100px;
          padding: 10px 28px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }

        .sp-count-val {
          font-family: 'Playfair Display', serif;
          font-size: 22px;
          font-weight: 700;
          color: var(--sp-accent);          /* amber — numbers = value, consistent with hero stats */
          line-height: 1;
        }

        .sp-count-label {
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--sp-muted);
        }

        .sp-counts-sep {
          width: 1px; height: 32px;
          background: var(--sp-border);
          flex-shrink: 0;
        }

        /* ── Marquee rails ── */
        .sp-rails {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .sp-rail {
          position: relative;
          overflow: hidden;
        }

        /* Fade edges — use section bg for perfect blend */
        .sp-rail::before,
        .sp-rail::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          width: 120px;
          z-index: 2;
          pointer-events: none;
        }
        .sp-rail::before {
          left: 0;
          background: linear-gradient(to right, var(--sp-bg), transparent);
        }
        .sp-rail::after {
          right: 0;
          background: linear-gradient(to left, var(--sp-bg), transparent);
        }

        .sp-track {
          display: flex;
          gap: 14px;
          width: max-content;
        }
        .sp-track--fwd { animation: scrollFwd 38s linear infinite; }
        .sp-track--rev { animation: scrollRev 44s linear infinite; }
        .sp-track--fwd:hover,
        .sp-track--rev:hover { animation-play-state: paused; }

        @keyframes scrollFwd {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.333%); }
        }
        @keyframes scrollRev {
          from { transform: translateX(-33.333%); }
          to   { transform: translateX(0); }
        }

        /* ── School pill ── */
        .sp-pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: var(--sp-pill-bg);
          border: 1px solid var(--sp-pill-bd);
          border-radius: 10px;
          padding: 12px 18px;
          white-space: nowrap;
          cursor: default;
          flex-shrink: 0;
          transition: border-color .25s, box-shadow .25s, transform .25s;
        }
        /* Hover: amber border tint — $secondary at low opacity */
        .sp-pill:hover {
          border-color: rgba(255,200,87,0.55);
          box-shadow: 0 6px 20px rgba(0,0,0,0.06);
          transform: translateY(-3px);
        }

        /* Monogram */
        .sp-mono {
          width: 32px; height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Playfair Display', serif;
          font-size: 12px;
          font-weight: 700;
          flex-shrink: 0;
          letter-spacing: 0.03em;
        }

        .sp-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--sp-dark);
        }

        .sp-divider {
          display: block;
          width: 3px; height: 3px;
          border-radius: 50%;
          background: #c8bfb5;
          flex-shrink: 0;
        }

        .sp-tag {
          font-size: 12px;
          font-weight: 300;
          color: var(--sp-muted);
        }

        .sp-loc {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11.5px;
          font-weight: 400;
          color: #b5a090;
        }

        /* ── Bottom note ── */
        .sp-note-inner {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          font-weight: 300;
          color: var(--sp-muted);
        }
        .sp-note-inner::before,
        .sp-note-inner::after {
          content: '';
          display: block;
          width: 40px; height: 1px;
          background: rgba(255,200,87,0.4);   /* amber line — subtle brand touch */
        }

        /* ── Scroll reveal ── */
        [data-sp-reveal] {
          opacity: 0;
          transform: translateY(18px);
          transition: opacity .65s ease, transform .65s ease;
        }
        [data-sp-reveal].sp-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      {/* Wave from Feature cream section */}
      <div className="sp-wave">
        <svg viewBox="0 0 1440 56" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0,0 C300,56 600,0 900,32 C1080,52 1260,16 1440,28 L1440,56 L0,56 Z"
            fill="#f0ece5"
          />
        </svg>
      </div>

      <section className="sp-section" id="schools">
        <div className="sp-bg-circle" aria-hidden="true" />

        <div className="sp-inner container-xl">

          {/* Header — Bootstrap centering utilities */}
          <SpReveal delay={0}>
            <div className="d-flex flex-column align-items-center text-center mb-5">

              <div className="sp-kicker mb-3">
                <span className="sp-kicker__dot" />
                Trusted by schools
              </div>

              <h2 className="sp-title mb-3">
                Schools that chose to run<br />
                <em>smarter.</em>
              </h2>

              <p className="sp-subtitle mb-4">
                From neighbourhood primaries to large secondary colleges —
                schools across Nigeria use our platform every single day.
              </p>

              {/* Count pill — Bootstrap gap utilities inside */}
              <div className="sp-counts">
                <div className="d-flex flex-column align-items-center gap-1">
                  <span className="sp-count-val">500+</span>
                  <span className="sp-count-label">Schools</span>
                </div>
                <span className="sp-counts-sep" />
                <div className="d-flex flex-column align-items-center gap-1">
                  <span className="sp-count-val">3</span>
                  <span className="sp-count-label">Categories</span>
                </div>
                <span className="sp-counts-sep" />
                <div className="d-flex flex-column align-items-center gap-1">
                  <span className="sp-count-val">19</span>
                  <span className="sp-count-label">States</span>
                </div>
              </div>

            </div>
          </SpReveal>

          {/* Marquee rails */}
          <SpReveal delay={160}>
            <div className="sp-rails mb-5">

              {/* Row A — scrolls left */}
              <div className="sp-rail">
                <div className="sp-track sp-track--fwd" aria-hidden="true">
                  {rowA.map((s, i) => (
                    <SchoolPill
                      key={`a-${i}`}
                      school={s}
                      index={i % Math.ceil(SCHOOLS.length / 2)}
                    />
                  ))}
                </div>
              </div>

              {/* Row B — scrolls right */}
              <div className="sp-rail">
                <div className="sp-track sp-track--rev" aria-hidden="true">
                  {rowB.map((s, i) => (
                    <SchoolPill
                      key={`b-${i}`}
                      school={s}
                      index={(i % Math.ceil(SCHOOLS.length / 2)) + offsetB}
                    />
                  ))}
                </div>
              </div>

            </div>
          </SpReveal>

          {/* Bottom note */}
          <SpReveal delay={280}>
            <div className="text-center">
              <span className="sp-note-inner">
                And growing every term — your school could be next.
              </span>
            </div>
          </SpReveal>

        </div>
      </section>
    </>
  );
}

/* ── Reveal wrapper ── */
function SpReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = (el: HTMLDivElement | null) => {
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => el.classList.add("sp-visible"), delay);
          io.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    io.observe(el);
  };

  return (
    <div ref={ref} data-sp-reveal="">
      {children}
    </div>
  );
}