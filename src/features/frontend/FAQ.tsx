import { useState, useRef, useEffect } from "react";

/**
 * FAQ.tsx — wired to your Bootstrap Sass variables
 *
 * Updated:
 * - improved spacing between question and answer
 * - cleaner answer padding/margins
 * - smoother open-state layout
 */

type FAQ = { q: string; a: string; tag: string };

const FAQS: FAQ[] = [
  {
    tag: "Security",
    q: "Is our school's data safe on GradeQuest?",
    a: "Absolutely. Every account uses role-based access control — meaning teachers only see their classes, admins see their school, and proprietors see everything they own. All data is encrypted at rest and in transit. We run automated daily backups, maintain a full audit trail of every action, and our infrastructure is hosted on enterprise-grade cloud servers with 99.9% uptime SLA.",
  },
  {
    tag: "Results",
    q: "How does result computation and the PIN system work?",
    a: "Teachers upload Continuous Assessment (CA) and exam scores through their portal. GradeQuest automatically computes totals, grades, positions, and generates a broadsheet — in seconds, not days. Once an admin approves the results, scratch-card PINs are generated for parents to check their child's report card securely online. No more printing, no more calls.",
  },
  {
    tag: "AI",
    q: "What exactly does the AI monitoring do?",
    a: "The AI engine continuously scans for incomplete submissions — if a teacher hasn't uploaded scores for a class three days before the deadline, it sends automated reminders to both the teacher and the admin. It also flags statistical outliers: if a student who averaged 70% suddenly scores 5%, or if an entire class's scores are suspiciously uniform, the system alerts the academic team before results are published.",
  },
  {
    tag: "Fees",
    q: "Can we track school fees payments per student?",
    a: "Yes. The fees module gives you a term-by-term ledger for every student — showing what was billed, what was paid, and what's outstanding. You can set up different fee structures per class or category, record payments manually or via integration, and send automated balance reminders to parents through the parent portal. Collection reports are available at any time.",
  },
  {
    tag: "Migration",
    q: "We have years of student records. How difficult is migration?",
    a: "Much easier than you'd expect. Our onboarding team provides a standard CSV template, and once you fill it with your existing student data, we import everything into the system for you — typically within one business day. Schools with three or more years of records have been fully migrated without any disruption to ongoing operations. We also offer on-site staff training as part of the Professional and Enterprise plans.",
  },
  {
    tag: "Access",
    q: "Can parents and teachers access the system too?",
    a: "Yes — each user type has their own portal. Teachers log in to submit scores, view their class lists, and track attendance. Parents use their child's unique PIN to access report cards, see attendance summaries, and check outstanding fees. Admins control what each role can see and do. There are no shared logins and no risk of data leakage between accounts.",
  },
  {
    tag: "Pricing",
    q: "Is there a free trial? What happens to our data if we cancel?",
    a: "Every plan starts with a 14-day free trial — no credit card required. If you decide GradeQuest isn't right for your school, you can export a full copy of all your data (students, results, fees records) in CSV format before your account closes. We don't hold your data hostage. Schools that cancel within the trial period owe nothing.",
  },
  {
    tag: "Support",
    q: "What kind of support do you offer?",
    a: "Starter plans get email support with a 24-hour response time. Professional plans get priority support — typically under 4 hours — plus access to our onboarding call and live chat during business hours. Enterprise schools get a dedicated account manager who knows your school setup personally and is reachable directly via phone or WhatsApp.",
  },
];

const TAG_COLORS: Record<string, { color: string; bg: string }> = {
  Security: { color: "rgb(59,130,246)", bg: "rgba(59,130,246,0.10)" },
  Results: { color: "rgb(34,197,94)", bg: "rgba(34,197,94,0.10)" },
  AI: { color: "rgb(211,0,176)", bg: "rgba(211,0,176,0.09)" },
  Fees: { color: "rgb(59,130,246)", bg: "rgba(59,130,246,0.08)" },
  Migration: { color: "rgb(245,158,11)", bg: "rgba(245,158,11,0.10)" },
  Access: { color: "rgb(34,197,94)", bg: "rgba(34,197,94,0.08)" },
  Pricing: { color: "rgb(239,68,68)", bg: "rgba(239,68,68,0.09)" },
  Support: { color: "rgb(255,200,87)", bg: "rgba(255,200,87,0.13)" },
};

function AccordionItem({
  faq,
  index,
  open,
  onToggle,
}: {
  faq: FAQ;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const tc = TAG_COLORS[faq.tag] ?? TAG_COLORS["Support"];

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    if (open) {
      el.style.maxHeight = el.scrollHeight + "px";
      el.style.opacity = "1";
    } else {
      el.style.maxHeight = "0px";
      el.style.opacity = "0";
    }
  }, [open]);

  return (
    <div
      className={`fq-item ${open ? "fq-item--open" : ""}`}
      style={{ "--c": tc.color, "--c-bg": tc.bg } as React.CSSProperties}
    >
      <button className="fq-question w-100" onClick={onToggle} aria-expanded={open}>
        <span className="fq-question-left d-flex flex-column gap-2 flex-grow-1">
          <span className="fq-tag">{faq.tag}</span>
          <span className="fq-q-text">{faq.q}</span>
        </span>

        <span className="fq-icon flex-shrink-0" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      <div ref={bodyRef} className="fq-body" style={{ maxHeight: 0, opacity: 0 }}>
        <p className="fq-answer">{faq.a}</p>
      </div>
    </div>
  );
}

function useReveal(ref: React.RefObject<HTMLElement | null>, delay = 0) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => el.classList.add("fq-visible"), delay);
          io.disconnect();
        }
      },
      { threshold: 0.08 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [ref, delay]);
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useReveal(headerRef, 0);
  useReveal(ctaRef, 300);

  const leftFaqs = FAQS.filter((_, i) => i % 2 === 0);
  const rightFaqs = FAQS.filter((_, i) => i % 2 !== 0);

  const toggle = (globalIndex: number) =>
    setOpenIndex((prev) => (prev === globalIndex ? null : globalIndex));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500&display=swap');

        :root {
          --fq-bg:       #f7f3ed;
          --fq-source:   var(--bs-light,     #fcf8f8);
          --fq-dark:     var(--bs-dark,      #050008);
          --fq-accent:   var(--bs-secondary, rgb(255,200,87));
          --fq-magenta:  var(--bs-primary,   rgb(211,0,176));
          --fq-muted:    #7a6a5a;
          --fq-border:   #e8e0d5;
          --fq-card-bg:  #ffffff;

          --fq-accent-glow:   rgba(255,200,87,0.07);
          --fq-accent-border: rgba(255,200,87,0.22);
          --fq-accent-ring:   rgba(255,200,87,0.10);
        }

        .fq-wave {
          display: block;
          width: 100%;
          overflow: hidden;
          line-height: 0;
          background: var(--fq-source);
        }
        .fq-wave svg {
          display: block;
          width: 100%;
          height: 56px;
        }

        .fq-section {
          background: var(--fq-bg);
          padding: 108px 0 128px;
          position: relative;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }

        .fq-section::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: repeating-linear-gradient(
            45deg,
            rgba(211,0,176,0.012) 0px,
            rgba(211,0,176,0.012) 1px,
            transparent 1px,
            transparent 14px
          );
          pointer-events: none;
          z-index: 0;
        }

        .fq-section::after {
          content: '';
          position: absolute;
          bottom: -80px;
          left: -80px;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,200,87,0.07) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .fq-inner {
          position: relative;
          z-index: 1;
        }

        @media (max-width: 640px) {
          .fq-section {
            padding: 72px 0 88px;
          }
        }

        .fq-header {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: end;
          margin-bottom: 72px;
        }
        @media (max-width: 800px) {
          .fq-header {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }

        .fq-kicker {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--fq-dark);
          opacity: 0.55;
        }

        .fq-kicker__line {
          display: block;
          width: 28px;
          height: 1px;
          background: var(--fq-accent);
          opacity: 0.8;
        }

        .fq-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(30px, 3.8vw, 50px);
          font-weight: 900;
          color: var(--fq-dark);
          line-height: 1.1;
        }

        .fq-title em {
          font-style: italic;
          color: var(--fq-magenta);
        }

        .fq-desc {
          font-size: 15.5px;
          font-weight: 300;
          color: var(--fq-muted);
          max-width: 380px;
          line-height: 1.8;
        }

        .fq-filter-pill {
          font-size: 11.5px;
          font-weight: 400;
          color: #9a8a7a;
          background: var(--fq-card-bg);
          border: 1px solid var(--fq-border);
          border-radius: 100px;
          padding: 5px 14px;
          cursor: default;
          transition: background .2s, border-color .2s, color .2s;
        }
        .fq-filter-pill:hover {
          background: rgba(255,200,87,0.12);
          border-color: rgba(255,200,87,0.35);
          color: var(--fq-dark);
        }

        .fq-col {
          display: flex;
          flex-direction: column;
        }

        .fq-item {
          border-bottom: 1px solid var(--fq-border);
          transition: background .2s;
        }
        .fq-item:first-child {
          border-top: 1px solid var(--fq-border);
        }
        .fq-item--open {
          background: var(--fq-card-bg);
        }

        .fq-question {
          background: none;
          border: none;
          padding: 22px 20px 18px 0;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          cursor: pointer;
          text-align: left;
        }

        .fq-tag {
          display: inline-block;
          width: fit-content;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--c);
          background: var(--c-bg);
          border-radius: 100px;
          padding: 2px 9px;
          transition: opacity .2s;
        }
        .fq-item:not(.fq-item--open) .fq-tag {
          opacity: 0.65;
        }

        .fq-q-text {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 16px;
          font-weight: 700;
          color: var(--fq-dark);
          line-height: 1.35;
          transition: color .2s;
        }

        .fq-question:hover .fq-q-text,
        .fq-item--open .fq-q-text {
          color: var(--c);
        }

        .fq-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(5,0,8,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 4px;
          color: #9a8a7a;
          transition: background .25s, color .25s, transform .3s;
        }
        .fq-item--open .fq-icon {
          background: var(--c-bg);
          color: var(--c);
          transform: rotate(180deg);
        }

        .fq-body {
          overflow: hidden;
          transition: max-height .4s cubic-bezier(.4,0,.2,1), opacity .35s ease;
        }

        .fq-item--open .fq-body {
          margin-top: -2px;
        }

        .fq-answer {
          font-size: 14.5px;
          font-weight: 300;
          line-height: 1.9;
          color: rgba(5,0,8,0.58);
          margin: 0;
          padding: 2px 8px 28px 0;
          max-width: 520px;
        }

        @media (min-width: 768px) {
          .fq-answer {
            padding-right: 12px;
            padding-bottom: 30px;
          }
        }

        .fq-cta {
          border-radius: 16px;
          padding: 44px 52px;
          background: var(--fq-dark);
          border: 1px solid var(--fq-accent-border);
          position: relative;
          overflow: hidden;
          opacity: 0;
          transform: translateY(18px);
          transition: opacity .65s ease, transform .65s ease;
        }
        .fq-cta.fq-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .fq-cta-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid var(--fq-accent-ring);
          pointer-events: none;
        }
        .fq-cta-ring--lg {
          width: 300px;
          height: 300px;
          top: -120px;
          right: -60px;
        }
        .fq-cta-ring--sm {
          width: 180px;
          height: 180px;
          top: -60px;
          right: 60px;
        }

        .fq-cta-eyebrow {
          display: block;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--fq-accent);
        }

        .fq-cta-heading {
          font-family: 'Playfair Display', serif;
          font-size: clamp(18px, 2.4vw, 26px);
          font-weight: 700;
          color: #ffffff;
          line-height: 1.3;
          max-width: 400px;
        }
        .fq-cta-heading span {
          color: var(--fq-accent);
        }

        .btn-fq-primary {
          background: var(--fq-accent);
          color: var(--fq-dark);
          border-color: var(--fq-accent);
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          border-radius: 7px;
          transition: background .2s, transform .2s, box-shadow .2s;
          white-space: nowrap;
        }
        .btn-fq-primary:hover {
          background: #ffe0a0;
          border-color: #ffe0a0;
          color: var(--fq-dark);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(255,200,87,.22);
        }

        .btn-fq-ghost {
          background: transparent;
          color: rgba(255,255,255,.65);
          border: 1px solid rgba(255,255,255,.12);
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 400;
          border-radius: 7px;
          transition: background .2s, color .2s, transform .2s;
          white-space: nowrap;
        }
        .btn-fq-ghost:hover {
          background: rgba(255,255,255,.06);
          color: #ffffff;
          border-color: rgba(255,255,255,.22);
          transform: translateY(-2px);
        }

        [data-fq-reveal] {
          opacity: 0;
          transform: translateY(18px);
          transition: opacity .65s ease, transform .65s ease;
        }
        [data-fq-reveal].fq-visible {
          opacity: 1;
          transform: translateY(0);
        }

        @media (max-width: 640px) {
          .fq-cta {
            padding: 32px 24px;
          }
        }
      `}</style>

      <div className="fq-wave">
        <svg viewBox="0 0 1440 56" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0,12 C360,56 720,0 1080,32 C1260,48 1380,18 1440,8 L1440,56 L0,56 Z"
            fill="#f7f3ed"
          />
        </svg>
      </div>

      <section className="fq-section" id="faq">
        <div className="fq-inner container-xl">
          <div ref={headerRef} data-fq-reveal="" className="fq-header">
            <div>
              <div className="fq-kicker mb-3">
                <span className="fq-kicker__line" />
                Common questions
              </div>

              <h2 className="fq-title mb-3">
                Everything you
                <br />
                <em>wanted to ask.</em>
              </h2>

              <p className="fq-desc mb-0">
                Straight answers about security, results, fees, onboarding, and pricing —
                no fluff, no sales spin.
              </p>
            </div>

            <div className="d-flex flex-wrap gap-2 align-self-end">
              {Object.keys(TAG_COLORS).map((tag) => (
                <span key={tag} className="fq-filter-pill">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="row g-4">
            <div className="col-12 col-md-6">
              <div className="fq-col">
                {leftFaqs.map((faq) => {
                  const globalIndex = FAQS.indexOf(faq);
                  return (
                    <AccordionItem
                      key={faq.q}
                      faq={faq}
                      index={globalIndex}
                      open={openIndex === globalIndex}
                      onToggle={() => toggle(globalIndex)}
                    />
                  );
                })}
              </div>
            </div>

            <div className="col-12 col-md-6">
              <div className="fq-col">
                {rightFaqs.map((faq) => {
                  const globalIndex = FAQS.indexOf(faq);
                  return (
                    <AccordionItem
                      key={faq.q}
                      faq={faq}
                      index={globalIndex}
                      open={openIndex === globalIndex}
                      onToggle={() => toggle(globalIndex)}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div
            ref={ctaRef}
            className="fq-cta d-flex align-items-center justify-content-between flex-wrap gap-4 mt-5"
          >
            <span className="fq-cta-ring fq-cta-ring--lg" aria-hidden="true" />
            <span className="fq-cta-ring fq-cta-ring--sm" aria-hidden="true" />

            <div className="position-relative" style={{ zIndex: 1 }}>
              <span className="fq-cta-eyebrow mb-2">Still have questions?</span>
              <h3 className="fq-cta-heading mb-0">
                Talk to a real person who knows
                <br />
                <span>Nigerian schools.</span>
              </h3>
            </div>

            <div className="d-flex flex-wrap gap-3 position-relative" style={{ zIndex: 1 }}>
              <a
                href="#"
                className="btn btn-fq-primary d-inline-flex align-items-center gap-2 px-4 py-3"
              >
                Book a Free Call
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M1 7h12M7 1l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>

              <a
                href="#"
                className="btn btn-fq-ghost d-inline-flex align-items-center gap-2 px-4 py-3"
              >
                Chat on WhatsApp
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}