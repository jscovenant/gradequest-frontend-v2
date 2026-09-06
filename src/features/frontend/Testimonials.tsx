import { useRef, useEffect } from "react";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  school: string;
  location: string;
  initials: string;
  avatar: string;
  color: string;
  colorBg: string;
  rating: number;
  tag: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Before GradiosEdu, computing results for 600 students took our staff nearly two weeks. Now it's done in a single afternoon — and the master broadsheet is ready before we even leave the office.",
    name: "Mrs. Janet Avoseh",
    role: "Head of Administration",
    school: "Samjane Arise & Shine Schools",
    location: "Badagry, Lagos",
    initials: "JA",
    avatar: "/images/testimonials/adaeze-okonkwo.jpg",
    color: "#059669",
    colorBg: "rgba(5, 150, 105, 0.1)",
    rating: 5,
    tag: "Results & Broadsheets",
  },
  {
    quote:
      "The AI monitoring flagged three teachers who hadn't submitted scores three days before our term deadline. No chasing, no embarrassing last-minute scrambles. It handled the accountability automatically.",
    name: "Mr. Silvanus Segun",
    role: "School Administrator",
    school: "Jacktem Academic Excellence",
    location: "Sango Ota, Ogun",
    initials: "SS",
    avatar: "/images/testimonials/tunde-adeyemi.jpg",
    color: "#1D4ED8",
    colorBg: "rgba(29, 78, 216, 0.1)",
    rating: 5,
    tag: "AI Monitoring",
  },
  {
    quote:
      "Parents were calling the office constantly asking for report cards. Since we launched the PIN portal and WhatsApp dispatches, those calls stopped completely. Parents check results securely on their phones.",
    name: "Mrs. Deborah Afolabi",
    role: "School Principal",
    school: "Power of Success Int'l School",
    location: "Lagos State",
    initials: "DA",
    avatar: "/images/testimonials/funmi-bello.jpg",
    color: "#D97706",
    colorBg: "rgba(217, 119, 6, 0.12)",
    rating: 5,
    tag: "Parent Portal & WhatsApp",
  },
  {
    quote:
      "Tracking fee payments used to be a nightmare of paper bank tellers and reconciliations. GradiosEdu gave us a clear digital ledger and instant receipts — term one collections improved significantly.",
    name: "Dr. Leonard John",
    role: "Proprietor & Director",
    school: "Dr. Raphael Arinze Memorial College",
    location: "Ukpor, Anambra",
    initials: "LJ",
    avatar: "/images/testimonials/emeka-nwosu.jpg",
    color: "#7C3AED",
    colorBg: "rgba(124, 58, 237, 0.1)",
    rating: 5,
    tag: "Fees Tracking & Bursary",
  },
  {
    quote:
      "The analytics dashboard helped us identify class areas that needed academic reinforcement in Mathematics. We took immediate action, and by the next term our students' subject average rose by 18 points.",
    name: "Mr. Benjamin John",
    role: "Academic Director",
    school: "Heart International School",
    location: "Sagamu, Ogun",
    initials: "BJ",
    avatar: "/images/testimonials/ngozi-eze.jpg",
    color: "#0284C7",
    colorBg: "rgba(2, 132, 199, 0.1)",
    rating: 5,
    tag: "Academic Analytics",
  },
  {
    quote:
      "I was impressed by how smooth the onboarding was. The GradiosEdu team migrated our multi-year student records in one day and trained our teachers personally. Zero classroom disruption.",
    name: "Alh. Kabir Banuso",
    role: "Director of Education",
    school: "Borgu School of Excellence",
    location: "New Bussa, Niger",
    initials: "KB",
    avatar: "/images/testimonials/seun-fashola.jpg",
    color: "#E11D48",
    colorBg: "rgba(225, 29, 72, 0.1)",
    rating: 5,
    tag: "Seamless Onboarding",
  },
];

function Stars({ count }: { count: number }) {
  return (
    <span className="tm-stars d-inline-flex gap-1" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width="13"
          height="13"
          viewBox="0 0 12 12"
          fill={i < count ? "#D97706" : "none"}
          aria-hidden="true"
        >
          <path
            d="M6 1l1.4 3.4H11L8.2 6.7l1.1 3.3L6 8.3 2.7 10l1.1-3.3L1 4.4h3.6z"
            stroke="#D97706"
            strokeWidth="0.6"
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
          io.unobserve(el);
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
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="tm-tag">{t.tag}</span>
        <span className="badge bg-light text-dark fw-bold" style={{ fontSize: "10.5px", border: "1px solid #E2E8F0" }}>
          Verified School
        </span>
      </div>

      <div className="mb-3">
        <Stars count={t.rating} />
      </div>

      <blockquote className="tm-quote mb-4">
        <span className="tm-open-quote" aria-hidden="true">"</span>
        {t.quote}
      </blockquote>

      <div className="tm-author d-flex align-items-center gap-3 pt-3">
        <div className="position-relative flex-shrink-0">
          <img
            src={t.avatar}
            alt={t.name}
            className="tm-avatar-img"
            loading="lazy"
            onError={(e) => {
              // fallback to initials if missing
              (e.target as HTMLElement).style.display = "none";
            }}
          />
          <span
            className="position-absolute bottom-0 end-0 p-1 bg-success rounded-circle border border-white"
            style={{ width: "10px", height: "10px" }}
            title="Verified Administrator"
          />
        </div>

        <div className="d-flex flex-column gap-0.5">
          <span className="tm-name">{t.name}</span>
          <span className="tm-role">{t.role} · <strong>{t.school}</strong></span>
          <span className="tm-location d-inline-flex align-items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M6 1C4.067 1 2.5 2.567 2.5 4.5c0 3 3.5 6.5 3.5 6.5s3.5-3.5 3.5-6.5C9.5 2.567 7.933 1 6 1z"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <circle cx="6" cy="4.5" r="1.2" fill="currentColor" />
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
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        :root {
          --tm-dark:   #0F2744;
          --tm-navy:   #0A192F;
          --tm-gold:   #D97706;
          --tm-muted:  #475569;
          --tm-border: rgba(15, 39, 68, 0.08);
          --tm-bg:     #F8FAFC;
        }

        .tm-section {
          background: var(--tm-bg);
          padding: 100px 0 110px;
          position: relative;
          overflow: hidden;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .tm-inner { position: relative; z-index: 1; }

        .tm-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 24px;
          margin-bottom: 56px;
        }

        .tm-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--tm-gold);
          background: #FEF3C7;
          border: 1px solid #FDE68A;
          border-radius: 100px;
          padding: 5px 16px;
        }

        .tm-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(30px, 3.8vw, 48px);
          font-weight: 800;
          line-height: 1.18;
          color: var(--tm-dark);
          letter-spacing: -0.02em;
        }
        .tm-title em {
          font-style: italic;
          color: var(--tm-gold);
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .tm-desc {
          font-size: 15px;
          color: var(--tm-muted);
          max-width: 520px;
          line-height: 1.65;
        }

        .tm-rating-pill {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 14px 22px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 4px 16px rgba(15, 39, 68, 0.06);
        }
        .tm-rating-val {
          font-size: 26px;
          font-weight: 800;
          color: var(--tm-dark);
          line-height: 1;
        }
        .tm-rating-label {
          font-size: 12px;
          color: var(--tm-muted);
          font-weight: 600;
        }

        .tm-col {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .tm-card {
          background: #FFFFFF;
          border: 1px solid var(--tm-border);
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 4px 20px -4px rgba(15, 39, 68, 0.05);
          position: relative;
          overflow: hidden;
          transition: all .35s cubic-bezier(0.16, 1, 0.3, 1);
          opacity: 0;
          transform: translateY(20px);
        }
        .tm-card.tm-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .tm-card:hover {
          box-shadow: 0 16px 40px rgba(15, 39, 68, 0.12);
          border-color: rgba(217, 119, 6, 0.35);
          transform: translateY(-4px);
        }

        .tm-tag {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--c);
          background: var(--c-bg);
          border-radius: 100px;
          padding: 4px 12px;
        }

        .tm-quote {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 15.5px;
          font-weight: 400;
          font-style: italic;
          line-height: 1.75;
          color: #1E293B;
          margin: 0;
          border: none;
          padding: 0;
        }

        .tm-open-quote {
          font-family: 'Playfair Display', serif;
          font-size: 52px;
          line-height: 0;
          vertical-align: -20px;
          color: #D97706;
          opacity: 0.35;
          margin-right: 4px;
          font-style: normal;
        }

        .tm-author {
          border-top: 1px solid var(--tm-border);
        }

        .tm-avatar-img {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #D97706;
          box-shadow: 0 4px 10px rgba(15, 39, 68, 0.12);
        }

        .tm-name {
          font-size: 14.5px;
          font-weight: 800;
          color: var(--tm-dark);
          line-height: 1.2;
        }
        .tm-role {
          font-size: 12.5px;
          font-weight: 500;
          color: var(--tm-muted);
          line-height: 1.3;
        }
        .tm-location {
          font-size: 11.5px;
          color: #64748B;
          font-weight: 600;
        }

        .tm-summary {
          border-radius: 20px;
          padding: 36px 40px;
          background: #0F2744;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 16px 40px rgba(15, 39, 68, 0.15);
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
          font-size: 32px;
          font-weight: 800;
          color: #FBBF24;
          line-height: 1;
        }
        .tm-summary-label {
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #E2E8F0;
        }
        .tm-summary-sep {
          width: 1px; height: 44px;
          background: rgba(255,255,255,0.15);
          flex-shrink: 0;
        }
      `}</style>

      <section className="tm-section gq-scroll-reveal" id="testimonials">
        <div className="tm-inner container-xl">
          {/* Header */}
          <div ref={headerRef} className="tm-header">
            <div>
              <div className="tm-kicker mb-3">
                <span>💬</span> Real Voices From Partner Schools
              </div>
              <h2 className="tm-title mb-3">
                Proven impact from<br />
                <em>distinguished school leaders.</em>
              </h2>
              <p className="tm-desc mb-0">
                Authentic experiences from school proprietors, principals, and exam officers operating GradiosEdu Worldwide.
              </p>
            </div>

            {/* Aggregate rating pill */}
            <div className="tm-header-right">
              <div className="tm-rating-pill">
                <span className="tm-rating-val">4.9</span>
                <span className="d-flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} width="14" height="14" viewBox="0 0 12 12"
                      fill="#D97706" aria-hidden="true">
                      <path d="M6 1l1.4 3.4H11L8.2 6.7l1.1 3.3L6 8.3 2.7 10l1.1-3.3L1 4.4h3.6z"/>
                    </svg>
                  ))}
                </span>
                <span className="tm-rating-label">from 500+ schools</span>
              </div>
            </div>
          </div>

          {/* Masonry two-col */}
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
            className="tm-summary d-flex align-items-center justify-content-center flex-wrap gap-5 mt-5"
          >
            {[
              { val: "500+", label: "Schools onboarded" },
              { val: "4.9★", label: "Average rating" },
              { val: "2.4M+", label: "Results processed" },
              { val: "99.2%", label: "Term renewal rate" },
            ].map((s, i, arr) => (
              <div key={s.label} className="d-flex align-items-center gap-5">
                <div className="d-flex flex-column align-items-center gap-1">
                  <span className="tm-summary-val">{s.val}</span>
                  <span className="tm-summary-label">{s.label}</span>
                </div>
                {i < arr.length - 1 && (
                  <span className="tm-summary-sep d-none d-sm-block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
