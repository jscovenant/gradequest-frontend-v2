import { useState, useRef, useEffect } from "react";
import { usePlatformInfo } from "../../hooks/usePlatformInfo";

type FAQ = { q: string; a: string; tag: string };

const FAQS: FAQ[] = [
  {
    tag: "Security",
    q: "How secure is our school's academic and financial data on SchoolProfit?",
    a: "Bank-grade. All data is encrypted both at rest (AES-256) and in transit (SSL/TLS). Every account uses strict role-based access control — meaning teachers only access their assigned classes, bursars manage finance ledgers, and proprietors maintain overarching branch oversight. We perform automated daily backups and maintain detailed audit logs.",
  },
  {
    tag: "Results",
    q: "How does automated result computation and broadsheet compilation work?",
    a: "Teachers upload Continuous Assessment (CA) and examination scores through their authenticated portal. SchoolProfit automatically computes totals, weighted averages, class positions, and cumulative GPAs adhering to NERDC standards — generating print-ready master broadsheets and transcripts in seconds.",
  },
  {
    tag: "CBT Exams",
    q: "Can we conduct computer-based assessments in our lab without full-time internet?",
    a: "Yes. SchoolProfit features a hybrid LAN offline testing engine. Computer laboratories can administer continuous assessments, mock exams, and timed tests on a local network. Student answers are auto-saved locally in real-time and synchronize seamlessly to academic records when connected.",
  },
  {
    tag: "Bursary",
    q: "How does the fee management module track tuition and receipts?",
    a: "The bursary module provides a clear, real-time ledger for every enrolled student — detailing billed amounts, payment history, and outstanding balances. You can record payments, generate electronic receipts with cryptographic verification seals, and automate statements for parents.",
  },
  {
    tag: "AI Tools",
    q: "How does the AI Assistant support teaching staff?",
    a: "The AI Assistant helps teachers structure curriculum-compliant schemes of work, generate weekly lesson notes, and compose personalized student evaluations. It also alerts academic coordinators to incomplete score submissions before publishing deadlines.",
  },
  {
    tag: "Parent Access",
    q: "How do parents receive report cards and school updates?",
    a: "Parents access authenticated result links, daily attendance logs, and school notices directly on their mobile phones via direct WhatsApp and SMS notifications, eliminating the friction of unread portal emails or lost physical reports.",
  },
  {
    tag: "Migration",
    q: "We have years of existing student records in Excel. How difficult is migration?",
    a: "Effortless. Our onboarding team provides standard Excel/CSV templates. Once uploaded, we validate and import all historical student and academic records within 24 hours with zero operational downtime.",
  },
];

const TAG_COLORS: Record<string, { color: string; bg: string }> = {
  Security: { color: "#1D4ED8", bg: "rgba(29, 78, 216, 0.1)" },
  Results: { color: "#059669", bg: "rgba(5, 150, 105, 0.1)" },
  "CBT Exams": { color: "#1D4ED8", bg: "rgba(29, 78, 216, 0.12)" },
  Bursary: { color: "#D97706", bg: "rgba(217, 119, 6, 0.12)" },
  "AI Tools": { color: "#DB2777", bg: "rgba(219, 39, 119, 0.12)" },
  "Parent Access": { color: "#059669", bg: "rgba(5, 150, 105, 0.12)" },
  Migration: { color: "#7C3AED", bg: "rgba(124, 58, 237, 0.12)" },
  Support: { color: "#D97706", bg: "rgba(217, 119, 6, 0.12)" },
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
  const { whatsappLink } = usePlatformInfo();
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
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        :root {
          --fq-bg: #F8FAFC;
          --fq-source: #FFFFFF;
          --fq-dark: #0F2744;
          --fq-accent: #D97706;
          --fq-gold-light: #F59E0B;
          --fq-muted: #64748B;
          --fq-border: #E2E8F0;
          --fq-card-bg: #FFFFFF;

          --fq-accent-glow: rgba(217, 119, 6, 0.07);
          --fq-accent-border: rgba(217, 119, 6, 0.22);
          --fq-accent-ring: rgba(217, 119, 6, 0.10);
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
          font-family: 'Plus Jakarta Sans', sans-serif;
          border-top: 1px solid #E2E8F0;
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
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #B45309;
          background: #FFFFFF;
          border: 1px solid rgba(217, 119, 6, 0.25);
          padding: 5px 14px;
          border-radius: 999px;
        }

        .fq-kicker__line {
          display: block;
          width: 20px;
          height: 2px;
          background: #D97706;
          border-radius: 99px;
        }

        .fq-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(30px, 3.8vw, 50px);
          font-weight: 900;
          color: var(--fq-dark);
          line-height: 1.15;
        }

        .fq-title em {
          font-style: italic;
          color: #D97706;
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .fq-desc {
          font-size: 15.5px;
          font-weight: 400;
          color: var(--fq-muted);
          max-width: 380px;
          line-height: 1.7;
        }

        .fq-filter-pill {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          background: var(--fq-card-bg);
          border: 1px solid var(--fq-border);
          border-radius: 100px;
          padding: 6px 16px;
          cursor: default;
          transition: background .2s, border-color .2s, color .2s;
        }
        .fq-filter-pill:hover {
          background: rgba(217, 119, 6, 0.1);
          border-color: rgba(217, 119, 6, 0.35);
          color: #0F2744;
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
          border-radius: 12px;
          padding: 0 16px;
          border: 1px solid #E2E8F0;
          margin-bottom: 10px;
          box-shadow: 0 4px 16px rgba(15, 39, 68, 0.04);
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
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--c);
          background: var(--c-bg);
          border-radius: 100px;
          padding: 3px 10px;
          transition: opacity .2s;
        }
        .fq-item:not(.fq-item--open) .fq-tag {
          opacity: 0.85;
        }

        .fq-q-text {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 16.5px;
          font-weight: 700;
          color: var(--fq-dark);
          line-height: 1.35;
          transition: color .2s;
        }

        .fq-question:hover .fq-q-text,
        .fq-item--open .fq-q-text {
          color: #0F2744;
        }

        .fq-icon {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 4px;
          color: #64748B;
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
          font-weight: 400;
          line-height: 1.8;
          color: #475569;
          margin: 0;
          padding: 2px 8px 26px 0;
          max-width: 520px;
        }

        .fq-cta {
          border-radius: 20px;
          padding: 44px 52px;
          background: #0F2744;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 16px 40px rgba(15, 39, 68, 0.15);
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

        .fq-cta-eyebrow {
          display: block;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #FBBF24;
        }

        .fq-cta-heading {
          font-family: 'Playfair Display', serif;
          font-size: clamp(20px, 2.4vw, 28px);
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.3;
          max-width: 400px;
        }

        .btn-fq-primary {
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
          color: #FFFFFF;
          border: none;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px;
          font-weight: 700;
          border-radius: 10px;
          transition: all .2s ease;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(217, 119, 6, 0.3);
        }
        .btn-fq-primary:hover {
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
          color: #FFFFFF;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(217, 119, 6, 0.45);
        }

        .btn-fq-ghost {
          background: rgba(255, 255, 255, 0.08);
          color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.2);
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          border-radius: 10px;
          transition: all .2s ease;
          white-space: nowrap;
        }
        .btn-fq-ghost:hover {
          background: rgba(255, 255, 255, 0.16);
          color: #FFFFFF;
          border-color: rgba(255, 255, 255, 0.4);
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
            fill="#F8FAFC"
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
            <div className="position-relative" style={{ zIndex: 1 }}>
              <span className="fq-cta-eyebrow mb-2">Still have questions?</span>
              <h3 className="fq-cta-heading mb-0">
                Talk to a school operations specialist.
              </h3>
            </div>

            <div className="d-flex flex-wrap gap-3 position-relative" style={{ zIndex: 1 }}>
              <a
                href="/book-demo"
                className="btn btn-fq-primary d-inline-flex align-items-center gap-2 px-4 py-3"
              >
                Book a Live Demo
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
                href={whatsappLink("Hello SchoolProfit, I have a few questions regarding the platform for our school.")}
                target="_blank"
                rel="noopener noreferrer"
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
