import { useRef, useEffect } from "react";

/**
 * Testimonials.tsx — wired to your Bootstrap Sass variables
 *
 * Color hierarchy (no riot):
 *   $light  (#fcf8f8)   → section bg (warm near-white)               [~85%]
 *   $dark   (#050008)   → all headings, names, summary bar bg        [text + bar]
 *   $secondary (amber)  → kicker line, stars, summary values,
 *                         open-quote tint, card hover stripe         [~8%]
 *   $primary (magenta)  → kicker dot, title italic                   [~4%]
 *   per-card semantics  → tag chip + avatar bg (data context only)   [~3%]
 *
 * Bootstrap classes used:
 *   Layout:  container-xl, row, col-12, col-md-6, col-lg-4
 *   Display: d-flex, flex-column, flex-wrap, align-items-*
 *   Spacing: gap-2/3/4/5, mb-2/3/4, mt-5, py-3/4, pt-4
 *   Text:    text-center, fw-light
 *   Misc:    position-relative, overflow-hidden, w-100
 */

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  school: string;
  location: string;
  initials: string;
  color: string;
  colorBg: string;
  rating: number;
  tag: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Before GradeQuest, computing results for 600 students took our staff nearly two weeks. Now it's done in a single afternoon — and the broadsheet is ready before we even leave the office.",
    name: "Mrs. Adaeze Okonkwo",
    role: "Head of Academics",
    school: "Greenfield Model School",
    location: "Enugu",
    initials: "AO",
    /* $success tint */
    color: "rgb(34,197,94)",
    colorBg: "rgba(34,197,94,0.10)",
    rating: 5,
    tag: "Results & Broadsheet",
  },
  {
    quote:
      "The AI monitoring flagged three teachers who hadn't submitted scores three days before the deadline. No chasing, no embarrassing last-minute scrambles. It just handled itself.",
    name: "Mr. Tunde Adeyemi",
    role: "School Administrator",
    school: "Cedar Heights College",
    location: "Ibadan",
    initials: "TA",
    /* $info tint */
    color: "rgb(59,130,246)",
    colorBg: "rgba(59,130,246,0.10)",
    rating: 5,
    tag: "AI Monitoring",
  },
  {
    quote:
      "Parents were calling the office constantly asking for results. Since we launched the PIN portal, those calls have stopped entirely. Parents check themselves — any time, anywhere.",
    name: "Mrs. Funmi Bello",
    role: "School Principal",
    school: "Royal Scholars College",
    location: "Lagos",
    initials: "FB",
    /* $secondary (amber) tint — most prominent testimonial */
    color: "rgb(255,200,87)",
    colorBg: "rgba(255,200,87,0.13)",
    rating: 5,
    tag: "Parent Portal",
  },
  {
    quote:
      "Tracking who has paid school fees used to be a nightmare of Excel sheets and phone calls. GradeQuest's fees module gave us a clear ledger and automated reminders — term one collections improved by 40%.",
    name: "Barr. Emeka Nwosu",
    role: "Proprietor",
    school: "Prime Scholars Institute",
    location: "Owerri",
    initials: "EN",
    /* $primary (magenta) tint */
    color: "rgb(211,0,176)",
    colorBg: "rgba(211,0,176,0.09)",
    rating: 5,
    tag: "Fees Tracking",
  },
  {
    quote:
      "The analytics dashboard helped us identify that JSS 2 was consistently underperforming in Mathematics. We acted, hired a specialist, and by the next term their average improved by 18 points.",
    name: "Mrs. Ngozi Eze",
    role: "Deputy Principal",
    school: "Unity High School",
    location: "Abuja",
    initials: "NE",
    /* $info tint (cooler) */
    color: "rgb(59,130,246)",
    colorBg: "rgba(59,130,246,0.08)",
    rating: 5,
    tag: "Analytics",
  },
  {
    quote:
      "I was skeptical about switching from our old system. The onboarding team migrated three years of student records in one day and walked every admin through the platform personally. Zero disruption.",
    name: "Dr. Seun Fashola",
    role: "Director",
    school: "Heritage International School",
    location: "Port Harcourt",
    initials: "SF",
    /* $danger tint */
    color: "rgb(239,68,68)",
    colorBg: "rgba(239,68,68,0.09)",
    rating: 5,
    tag: "Onboarding",
  },
];

function Stars({ count }: { count: number }) {
  return (
    <span className="tm-stars d-inline-flex gap-1" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 12 12"
          fill={i < count ? "var(--tm-accent)" : "none"} aria-hidden="true">
          <path
            d="M6 1l1.4 3.4H11L8.2 6.7l1.1 3.3L6 8.3 2.7 10l1.1-3.3L1 4.4h3.6z"
            stroke="var(--tm-accent)" strokeWidth="0.6"
          />
        </svg>
      ))}
    </span>
  );
}

function useReveal(ref: React.RefObject<HTMLElement | null>, delay = 0) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => el.classList.add("tm-visible"), delay);
          io.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, delay]);
}

function TestimonialCard({ t, index }: { t: Testimonial; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref, 100 + (index % 2) * 110);

  return (
    <div
      ref={ref}
      className="tm-card"
      style={{ "--c": t.color, "--c-bg": t.colorBg } as React.CSSProperties}
    >
      <span className="tm-tag mb-2">{t.tag}</span>

      <div className="mb-3">
        <Stars count={t.rating} />
      </div>

      <blockquote className="tm-quote mb-4">
        <span className="tm-open-quote" aria-hidden="true">"</span>
        {t.quote}
      </blockquote>

      <div className="tm-author d-flex align-items-center gap-3 pt-3">
        <span className="tm-avatar flex-shrink-0"
          style={{ background: t.colorBg, color: t.color }}
          aria-hidden="true">
          {t.initials}
        </span>
        <div className="d-flex flex-column gap-1">
          <span className="tm-name">{t.name}</span>
          <span className="tm-role">{t.role} · {t.school}</span>
          <span className="tm-location d-inline-flex align-items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1C4.067 1 2.5 2.567 2.5 4.5c0 3 3.5 6.5 3.5 6.5s3.5-3.5 3.5-6.5C9.5 2.567 7.933 1 6 1z"
                stroke="currentColor" strokeWidth="1.2"/>
              <circle cx="6" cy="4.5" r="1.2" fill="currentColor"/>
            </svg>
            {t.location}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Testimonials() {
  const headerRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  useReveal(headerRef, 0);
  useReveal(summaryRef, 350);

  const col1 = TESTIMONIALS.filter((_, i) => i % 2 === 0);
  const col2 = TESTIMONIALS.filter((_, i) => i % 2 !== 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500&display=swap');

        /*
         * Token bridge — Bootstrap compiles your Sass vars to these.
         * Fallbacks ensure it works regardless of BS CSS var emission.
         */
        :root {
          --tm-bg:       var(--bs-light,     #fcf8f8);
          --tm-dark:     var(--bs-dark,      #050008);
          --tm-accent:   var(--bs-secondary, rgb(255,200,87));   /* amber */
          --tm-magenta:  var(--bs-primary,   rgb(211,0,176));    /* magenta */
          --tm-muted:    #7a6a5a;
          --tm-border:   #ede8e0;
          --tm-card-bg:  #ffffff;

          --tm-accent-dim:  rgba(255,200,87,0.18);
          --tm-accent-glow: rgba(255,200,87,0.06);
        }

        /* ── Wave from dark Pricing ── */
        .tm-wave {
          display: block;
          width: 100%;
          overflow: hidden;
          line-height: 0;
          background: var(--bs-dark, #050008);
        }
        .tm-wave svg { display: block; width: 100%; height: 60px; }

        /* ── Section ── */
        .tm-section {
          background: var(--tm-bg);
          padding: 108px 0 128px;
          position: relative;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }

        /* Amber glow top-left — $secondary */
        .tm-section::before {
          content: '';
          position: absolute;
          top: -100px; left: -100px;
          width: 560px; height: 560px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,200,87,0.06) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        /* Magenta glow bottom-right — $primary, very dim */
        .tm-section::after {
          content: '';
          position: absolute;
          bottom: -80px; right: -80px;
          width: 480px; height: 480px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(211,0,176,0.04) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .tm-inner { position: relative; z-index: 1; }

        @media (max-width: 640px) {
          .tm-section { padding: 72px 0 88px; }
        }

        /* ── Header layout — two-col on wide, stacked on mobile ── */
        .tm-header {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: end;
          gap: 32px;
          margin-bottom: 64px;
        }
        @media (max-width: 760px) {
          .tm-header { grid-template-columns: 1fr; }
          .tm-header-right { display: none; }
        }

        /* Kicker — amber line, no extra colour needed */
        .tm-kicker {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--tm-dark);
          opacity: 0.55;
        }
        .tm-kicker__line {
          display: block;
          width: 28px; height: 1px;
          background: var(--tm-accent);     /* amber line — $secondary */
          opacity: 0.8;
        }

        /* Title */
        .tm-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(32px, 4vw, 52px);
          font-weight: 900;
          color: var(--tm-dark);
          line-height: 1.1;
        }
        /* Italic = magenta — consistent rule across all sections */
        .tm-title em {
          font-style: italic;
          color: var(--tm-magenta);
        }

        .tm-desc {
          font-size: 15.5px;
          font-weight: 300;
          color: var(--tm-muted);
          max-width: 460px;
          line-height: 1.8;
        }

        /* Aggregate rating pill */
        .tm-rating-pill {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          background: var(--tm-card-bg);
          border: 1px solid var(--tm-border);
          border-radius: 14px;
          padding: 22px 28px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.05);
          min-width: 140px;
        }
        .tm-rating-val {
          font-family: 'Playfair Display', serif;
          font-size: 40px;
          font-weight: 700;
          color: var(--tm-dark);
          line-height: 1;
        }
        .tm-rating-label {
          font-size: 11px;
          font-weight: 400;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--tm-muted);
        }

        /* ── Masonry two-col ── */
        .tm-col { display: flex; flex-direction: column; gap: 20px; }

        @media (max-width: 760px) {
          .tm-col + .tm-col { margin-top: 0; }
        }

        /* ── Card ── */
        .tm-card {
          background: var(--tm-card-bg);
          border: 1px solid var(--tm-border);
          border-radius: 14px;
          padding: 28px 26px;
          position: relative;
          overflow: hidden;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity .6s ease, transform .6s ease,
                      box-shadow .3s ease, border-color .3s;
        }
        .tm-card.tm-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .tm-card:hover {
          box-shadow: 0 12px 40px rgba(0,0,0,0.07);
          border-color: #ddd5c8;
        }

        /* Accent left stripe — per-card semantic colour on hover */
        .tm-card::before {
          content: '';
          position: absolute;
          left: 0; top: 20px; bottom: 20px;
          width: 3px;
          border-radius: 0 3px 3px 0;
          background: var(--c, var(--tm-accent));
          opacity: 0;
          transition: opacity .3s;
        }
        .tm-card:hover::before { opacity: 0.8; }

        /* Tag chip */
        .tm-tag {
          display: inline-block;
          font-size: 10.5px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--c);
          background: var(--c-bg);
          border-radius: 100px;
          padding: 3px 10px;
        }

        /* Quote */
        .tm-quote {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 15px;
          font-weight: 400;
          font-style: italic;
          line-height: 1.75;
          color: var(--tm-dark);
          opacity: 0.82;
          margin: 0;
          border: none;
          padding: 0;
        }

        /* Opening quote mark — amber tint, not per-card colour */
        .tm-open-quote {
          font-family: 'Playfair Display', serif;
          font-size: 56px;
          line-height: 0;
          vertical-align: -22px;
          color: var(--tm-accent);          /* amber — consistent, not per-card */
          opacity: 0.22;
          margin-right: 4px;
          font-style: normal;
        }

        /* Author row */
        .tm-author {
          border-top: 1px solid var(--tm-border);
        }
        .tm-avatar {
          width: 40px; height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Playfair Display', serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.03em;
        }
        .tm-name {
          font-size: 13.5px;
          font-weight: 500;
          color: var(--tm-dark);
          line-height: 1.2;
        }
        .tm-role {
          font-size: 12px;
          font-weight: 300;
          color: var(--tm-muted);
          line-height: 1.3;
        }
        .tm-location {
          font-size: 11px;
          color: #c0b0a0;
        }

        /* ── Summary bar ── */
        .tm-summary {
          border-radius: 16px;
          padding: 36px 40px;
          background: var(--tm-dark);       /* $dark — echoes hero/pricing bg */
          border: 1px solid rgba(255,200,87,0.10);
          opacity: 0;
          transform: translateY(18px);
          transition: opacity .65s ease, transform .65s ease;
        }
        .tm-summary.tm-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .tm-summary-val {
          font-family: 'Playfair Display', serif;
          font-size: 30px;
          font-weight: 700;
          color: var(--tm-accent);          /* amber values — $secondary, consistent */
          line-height: 1;
        }
        .tm-summary-label {
          font-size: 11px;
          font-weight: 400;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.3);
        }
        .tm-summary-sep {
          width: 1px; height: 44px;
          background: rgba(255,255,255,0.07);
          flex-shrink: 0;
        }

        /* ── Scroll reveal ── */
        [data-tm-reveal] {
          opacity: 0;
          transform: translateY(18px);
          transition: opacity .65s ease, transform .65s ease;
        }
        [data-tm-reveal].tm-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      {/* Wave from dark Pricing section */}
      <div className="tm-wave">
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0,30 C360,60 720,0 1080,30 C1260,45 1380,20 1440,12 L1440,60 L0,60 Z"
            fill="var(--tm-bg, #fcf8f8)"
          />
        </svg>
      </div>

      <section className="tm-section" id="testimonials">
        <div className="tm-inner container-xl">

          {/* Header */}
          <div ref={headerRef} data-tm-reveal="" className="tm-header">
            <div>
              <div className="tm-kicker mb-3">
                <span className="tm-kicker__line" />
                From the schools themselves
              </div>
              <h2 className="tm-title mb-3">
                Real words from<br />
                <em>real administrators.</em>
              </h2>
              <p className="tm-desc mb-0">
                No marketing copy. These are things actual principals, proprietors,
                and HODs told us after using the platform — in their own words.
              </p>
            </div>

            {/* Aggregate rating pill */}
            <div className="tm-header-right">
              <div className="tm-rating-pill">
                <span className="tm-rating-val">4.9</span>
                <span className="d-flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} width="14" height="14" viewBox="0 0 12 12"
                      fill="var(--tm-accent)" aria-hidden="true">
                      <path d="M6 1l1.4 3.4H11L8.2 6.7l1.1 3.3L6 8.3 2.7 10l1.1-3.3L1 4.4h3.6z"/>
                    </svg>
                  ))}
                </span>
                <span className="tm-rating-label">from 500+ schools</span>
              </div>
            </div>
          </div>

          {/* Masonry two-col — Bootstrap row/col on mobile, custom CSS on wider */}
          <div className="row g-4">
            <div className="col-12 col-md-6">
              <div className="tm-col">
                {col1.map((t, i) => (
                  <TestimonialCard key={t.name} t={t} index={i * 2} />
                ))}
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className="tm-col">
                {col2.map((t, i) => (
                  <TestimonialCard key={t.name} t={t} index={i * 2 + 1} />
                ))}
              </div>
            </div>
          </div>

          {/* Summary bar */}
          <div
            ref={summaryRef}
            data-tm-reveal=""
            className="tm-summary d-flex align-items-center justify-content-center flex-wrap gap-5 mt-5"
          >
            {[
              { val: "500+", label: "Schools onboarded" },
              { val: "4.9★", label: "Average rating" },
              { val: "2M+",  label: "Results processed" },
              { val: "98%",  label: "Renewal rate" },
            ].map((s, i, arr) => (
              <>
                <div key={s.label} className="d-flex flex-column align-items-center gap-1">
                  <span className="tm-summary-val">{s.val}</span>
                  <span className="tm-summary-label">{s.label}</span>
                </div>
                {i < arr.length - 1 && (
                  <span key={`sep-${i}`} className="tm-summary-sep d-none d-sm-block" />
                )}
              </>
            ))}
          </div>

        </div>
      </section>
    </>
  );
}