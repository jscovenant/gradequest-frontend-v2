import { useRef, useEffect, useState, useCallback } from "react";
import { publicApi } from "../../utils/axios";

type Feature = {
  text: string;
  note: string | null;
};

type Plan = {
  id: string;
  name: string;
  price: string;
  raw_price: number;
  period: string;
  tagline: string;
  popular: boolean;
  cta: string;
  paystack_plan_code: string | null;
  max_teachers: number | null;
  max_students: number | null;
  duration_in_days: number;
  currency: string;
  features: Feature[];
};

const ACCENT: { color: string; colorBg: string }[] = [
  { color: "rgb(59,130,246)", colorBg: "rgba(59,130,246,0.12)" },
  { color: "rgb(255,200,87)", colorBg: "rgba(255,200,87,0.15)" },
  { color: "rgb(34,197,94)", colorBg: "rgba(34,197,94,0.12)" },
  { color: "rgb(168,85,247)", colorBg: "rgba(168,85,247,0.12)" },
  { color: "rgb(251,146,60)", colorBg: "rgba(251,146,60,0.12)" },
];

function PlanIcon({ index }: { index: number }) {
  const i = index % 3;

  if (i === 0) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }

  if (i === 1) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2l3 6.3L22 9.3l-5 4.9 1.2 6.8L12 18l-6.2 3 1.2-6.8L2 9.3l7-1z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 12v4M10 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function useReveal(ref: React.RefObject<HTMLElement | null>, delay = 0) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => el.classList.add("pr-visible"), delay);
          io.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [ref, delay]);
}

function SkeletonCard() {
  return (
    <div className="pr-card pr-card--skeleton pr-visible" aria-hidden="true">
      <div className="pr-skel pr-skel--icon mb-3" />
      <div className="pr-skel pr-skel--name mb-2" />
      <div className="pr-skel pr-skel--tag mb-4" />
      <div className="pr-skel pr-skel--price mb-3" />
      <div className="pr-skel pr-skel--meta mb-4" />
      <div className="pr-skel pr-skel--btn mb-4" />
      <hr className="pr-rule mb-4" />
      {[80, 65, 90, 70, 55].map((w, i) => (
        <div key={i} className="d-flex align-items-center gap-2 mb-3">
          <div className="pr-skel pr-skel--check" />
          <div className="pr-skel" style={{ height: 11, width: `${w}%`, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

function formatFeatureLabel(value?: string | null) {
  if (!value) return "";

  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatPlanMeta(plan: Plan) {
  const items: string[] = [];

  if (plan.duration_in_days) {
    if (plan.duration_in_days === 7) items.push("7-day access");
    else if (plan.duration_in_days === 30) items.push("30-day access");
    else if (plan.duration_in_days === 90) items.push("90-day access");
    else items.push(`${plan.duration_in_days}-day access`);
  }

  if ((plan.max_students ?? 0) > 0) {
    items.push(`Up to ${plan.max_students} students`);
  } else {
    items.push("Unlimited students");
  }

  if ((plan.max_teachers ?? 0) > 0) {
    items.push(`Up to ${plan.max_teachers} teachers`);
  } else {
    items.push("Unlimited teachers");
  }

  return items;
}

function sanitizePlans(plans: Plan[]): Plan[] {
  return plans.map((plan) => ({
    ...plan,
    tagline:
      plan.tagline && plan.tagline.trim().length > 0
        ? plan.tagline
        : "A flexible subscription plan for your school.",
    features: (plan.features || [])
      .map((feature) => ({
        text: formatFeatureLabel(feature?.text),
        note: null,
      }))
      .filter((feature) => feature.text.length > 0),
  }));
}

function PriceCard({ plan, index }: { plan: Plan; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref, 120 + index * 120);

  const { color, colorBg } = ACCENT[index % ACCENT.length];
  const ctaHref = plan.paystack_plan_code ? `#subscribe?plan=${plan.paystack_plan_code}` : "#contact";
  const metaItems = formatPlanMeta(plan);

  return (
    <div
      ref={ref}
      className={`pr-card ${plan.popular ? "pr-card--popular" : ""}`}
      data-pr-reveal=""
      style={{ "--c": color, "--c-bg": colorBg } as React.CSSProperties}
    >
      {plan.popular && (
        <div className="pr-popular-badge">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M6 1l1.4 3.6H11L8.2 6.9l1.1 3.5L6 8.5 2.7 10.4l1.1-3.5L1 4.6h3.6z"
              fill="var(--pr-dark)"
            />
          </svg>
          Most popular
        </div>
      )}

      <div className="pr-card-head mb-4">
        <div className="pr-plan-icon mb-3">
          <PlanIcon index={index} />
        </div>
        <h3 className="pr-plan-name mb-1">{plan.name}</h3>
        <p className="pr-plan-tagline mb-0">{plan.tagline}</p>
      </div>

      <div className="d-flex align-items-baseline gap-2 mb-3">
        <span className="pr-price">{plan.price}</span>
        <span className="pr-period">{plan.period}</span>
      </div>

      <div className="pr-meta-wrap mb-4">
        {metaItems.map((item) => (
          <span key={item} className="pr-meta-pill">
            {item}
          </span>
        ))}
      </div>

      <a
        href={ctaHref}
        className={`btn pr-cta w-100 d-flex align-items-center justify-content-center gap-2 mb-4 ${
          plan.popular ? "pr-cta--primary" : "pr-cta--ghost"
        }`}
      >
        {plan.cta}
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M1 7h12M7 1l6 6-6 6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>

      <hr className="pr-rule mb-4" />

      <div className="pr-feature-head mb-3">
        <span className="pr-feature-headline">Included features</span>
      </div>

      <ul className="pr-features d-flex flex-column gap-3">
        {plan.features.map((f, i) => (
          <li key={i} className="pr-feature d-flex align-items-start gap-2">
            <span className="pr-feature-check flex-shrink-0">
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                <path
                  d="M1.5 5l2.5 2.5 4.5-4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="pr-feature-text">{f.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Pricing() {
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  useReveal(headerRef, 0);
  useReveal(footerRef, 300);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await publicApi.get("/frontend/subscription-plans");
      const data = res.data?.data ?? res.data ?? [];

      setPlans(sanitizePlans(data));
    } catch (err: any) {
      console.error("[Pricing] fetch failed:", err?.response?.data || err?.message);
      setError("Unable to load plans right now. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500&display=swap');

        :root {
          --pr-dark:     var(--bs-dark,      #050008);
          --pr-light:    var(--bs-light,     #fcf8f8);
          --pr-accent:   var(--bs-secondary, rgb(255,200,87));
          --pr-magenta:  var(--bs-primary,   rgb(211,0,176));
          --pr-success:  var(--bs-success,   rgb(34,197,94));
          --pr-info:     var(--bs-info,      rgb(59,130,246));
          --pr-slate:    rgba(255,255,255,0.45);
          --pr-surface:  rgba(255,255,255,0.04);
          --pr-border:   rgba(255,255,255,0.07);
          --pr-accent-glow:   rgba(255,200,87,0.08);
          --pr-accent-border: rgba(255,200,87,0.25);
          --pr-magenta-glow:  rgba(211,0,176,0.08);
        }

        .pr-wave { display:block; width:100%; overflow:hidden; line-height:0; background:#f0ece5; }
        .pr-wave svg { display:block; width:100%; height:56px; }

        .pr-section {
          background: var(--pr-dark);
          padding: 108px 0 128px;
          position: relative;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }
        .pr-section::before {
          content: '';
          position: absolute; top:-10%; left:50%; transform:translateX(-50%);
          width:900px; height:600px; border-radius:50%;
          background: radial-gradient(ellipse, rgba(255,200,87,0.07) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }
        .pr-section-glow-b {
          position: absolute; bottom:-10%; left:50%; transform:translateX(-50%);
          width:600px; height:400px; border-radius:50%;
          background: radial-gradient(ellipse, rgba(211,0,176,0.06) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }
        .pr-section::after {
          content: ''; position:absolute; inset:0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 28px 28px; pointer-events:none; z-index:0;
        }
        .pr-inner { position: relative; z-index: 1; }

        .pr-kicker {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 500; letter-spacing: 0.2em;
          text-transform: uppercase; color: var(--pr-accent);
        }
        .pr-kicker__dot {
          width:5px; height:5px; border-radius:50%;
          background: var(--pr-magenta);
          animation: prPulse 2s ease infinite;
        }
        @keyframes prPulse {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:.35; transform:scale(1.6); }
        }

        .pr-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(34px, 4.5vw, 56px); font-weight: 900;
          color: #ffffff; line-height: 1.1;
        }
        .pr-title em { font-style:italic; color: var(--pr-accent); }
        .pr-subtitle {
          font-size: 16px; font-weight: 300;
          color: var(--pr-slate); max-width: 540px; line-height: 1.8;
        }

        .pr-trust-item {
          display: flex; align-items: center; gap: 7px;
          font-size: 13px; font-weight: 400; color: rgba(255,255,255,0.35);
        }
        .pr-trust-item svg { color: var(--pr-accent); }
        .pr-trust-sep {
          width:3px; height:3px; border-radius:50%; background:rgba(255,255,255,0.12);
        }

        .pr-card {
          background: rgba(255,255,255,0.04); border:1px solid var(--pr-border);
          border-radius: 18px; padding:32px 28px; position:relative; height:100%;
          opacity: 0; transform: translateY(22px);
          transition: opacity .65s ease, transform .65s ease, box-shadow .3s ease, border-color .3s;
        }
        .pr-card.pr-visible { opacity:1; transform:translateY(0); }
        .pr-card:hover { box-shadow:0 20px 60px rgba(0,0,0,0.4); border-color:rgba(255,255,255,0.12); }

        .pr-card--popular {
          background: var(--pr-light); border-color: var(--pr-accent-border);
          box-shadow: 0 8px 40px rgba(0,0,0,0.3), 0 0 0 1px var(--pr-accent-border);
          transform: translateY(-10px) scale(1.015); z-index: 2;
        }
        .pr-card--popular.pr-visible { transform:translateY(-10px) scale(1.015); }
        .pr-card--popular:hover {
          box-shadow: 0 24px 64px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,200,87,0.4);
          border-color: rgba(255,200,87,0.45);
        }

        .pr-popular-badge {
          position:absolute; top:-13px; left:50%; transform:translateX(-50%);
          display:inline-flex; align-items:center; gap:5px;
          background: var(--pr-accent); border:1px solid rgba(255,200,87,0.5);
          color: var(--pr-dark); font-size:11px; font-weight:500; letter-spacing:.08em;
          padding:4px 14px; border-radius:100px; white-space:nowrap;
        }

        .pr-plan-icon {
          width:40px; height:40px; border-radius:10px;
          background: var(--c-bg); color: var(--c);
          display:flex; align-items:center; justify-content:center;
        }
        .pr-plan-name {
          font-family:'Playfair Display',serif; font-size:20px; font-weight:700;
          color:rgba(255,255,255,0.92); line-height:1;
        }
        .pr-card--popular .pr-plan-name { color: var(--pr-dark); }

        .pr-plan-tagline {
          font-size:13px; font-weight:300; color:var(--pr-slate); line-height:1.6;
          min-height: 42px;
        }
        .pr-card--popular .pr-plan-tagline { color:rgba(5,0,8,0.55); }

        .pr-price {
          font-family:'Playfair Display',serif; font-size:36px;
          font-weight:700; color:#ffffff; line-height:1;
        }
        .pr-card--popular .pr-price { color: var(--pr-dark); }
        .pr-period { font-size:13px; font-weight:300; color:var(--pr-slate); }
        .pr-card--popular .pr-period { color:rgba(5,0,8,0.45); }

        .pr-meta-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .pr-meta-pill {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11.5px;
          font-weight: 500;
          color: rgba(255,255,255,0.78);
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .pr-card--popular .pr-meta-pill {
          color: rgba(5,0,8,0.72);
          background: rgba(5,0,8,0.05);
          border-color: rgba(5,0,8,0.08);
        }

        .pr-cta {
          border-radius:10px; font-family:'DM Sans',sans-serif;
          font-size:14px; font-weight:500;
          transition: background .2s, transform .2s, box-shadow .2s; padding:13px 20px;
        }
        .pr-cta--primary {
          background:var(--pr-dark); color:#ffffff; border-color:var(--pr-dark);
          box-shadow: 0 2px 12px rgba(0,0,0,0.2);
        }
        .pr-cta--primary:hover {
          background:#1a001f; border-color:#1a001f; color:#ffffff;
          transform:translateY(-2px); box-shadow:0 6px 20px rgba(0,0,0,0.3);
        }
        .pr-cta--ghost {
          background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.75);
          border:1px solid rgba(255,255,255,0.10);
        }
        .pr-cta--ghost:hover {
          background:rgba(255,255,255,0.09); color:#ffffff;
          border-color:rgba(255,255,255,0.2); transform:translateY(-2px);
        }

        .pr-rule { border:none; height:1px; background:var(--pr-border); }
        .pr-card--popular .pr-rule { background:rgba(5,0,8,0.08); }

        .pr-feature-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .pr-feature-headline {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--pr-accent);
        }
        .pr-card--popular .pr-feature-headline {
          color: rgb(120,80,0);
        }

        .pr-features { list-style:none; padding:0; margin:0; }
        .pr-feature {
          font-size:13.5px; color:var(--pr-slate); line-height:1.45;
          padding-bottom: 2px;
        }
        .pr-card--popular .pr-feature { color:rgba(5,0,8,0.68); }

        .pr-feature-check {
          width:18px; height:18px; border-radius:50%;
          background:rgba(255,255,255,0.06); color:var(--c);
          display:flex; align-items:center; justify-content:center; margin-top:1px;
        }
        .pr-card--popular .pr-feature-check { background:var(--c-bg); color:var(--c); }

        .pr-feature-text { flex:1; }

        .pr-card--skeleton { pointer-events:none; }
        .pr-skel {
          display: block;
          background: linear-gradient(90deg,
            rgba(255,255,255,.06) 25%,
            rgba(255,255,255,.12) 50%,
            rgba(255,255,255,.06) 75%);
          background-size: 200% 100%;
          border-radius: 6px;
          animation: prShimmer 1.5s ease infinite;
        }
        @keyframes prShimmer {
          from { background-position: 200% 0; }
          to   { background-position: -200% 0; }
        }
        .pr-skel--icon  { width:40px;  height:40px; border-radius:10px; }
        .pr-skel--name  { height:18px; width:55%; }
        .pr-skel--tag   { height:12px; width:80%; }
        .pr-skel--price { height:36px; width:45%; }
        .pr-skel--meta  { height:28px; width:85%; }
        .pr-skel--btn   { height:48px; border-radius:8px; }
        .pr-skel--check { width:18px;  height:18px; border-radius:50%; flex-shrink:0; }

        .pr-error-state {
          display:flex; flex-direction:column; align-items:center;
          gap:16px; padding:64px 24px; text-align:center;
        }
        .pr-error-icon {
          width:52px; height:52px; border-radius:50%;
          background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.2);
          display:flex; align-items:center; justify-content:center; color:#ef4444;
        }
        .pr-error-title {
          font-family:'Playfair Display',serif; font-size:18px;
          font-weight:700; color:#fff; margin:0;
        }
        .pr-error-msg {
          font-size:14px; font-weight:300; color:var(--pr-slate);
          max-width:340px; margin:0;
        }
        .pr-retry-btn {
          display:inline-flex; align-items:center; gap:8px;
          font-family:'DM Sans',sans-serif; font-size:13.5px; font-weight:500;
          color:var(--pr-dark); background:var(--pr-accent); border:none;
          border-radius:8px; padding:11px 22px; cursor:pointer;
          transition:background .2s, transform .2s;
        }
        .pr-retry-btn:hover { background:#ffe0a0; transform:translateY(-1px); }

        .pr-empty-state {
          text-align:center; padding:64px 24px;
          font-size:15px; font-weight:300; color:var(--pr-slate);
        }

        .pr-footer {
          border-radius:14px; padding:36px 40px;
          background:var(--pr-surface); border:1px solid var(--pr-border);
          opacity:0; transform:translateY(18px);
          transition:opacity .65s ease, transform .65s ease;
        }
        .pr-footer.pr-visible { opacity:1; transform:translateY(0); }
        .pr-footer-text {
          font-size:15px; font-weight:300; color:var(--pr-slate);
          max-width:480px; line-height:1.7;
        }
        .pr-footer-text strong { color:rgba(255,255,255,0.82); font-weight:500; }
        .pr-footer-link {
          display:inline-flex; align-items:center; gap:7px;
          font-size:14px; font-weight:500; color:var(--pr-accent);
          text-decoration:none; border-bottom:1px solid rgba(255,200,87,0.3);
          padding-bottom:1px; white-space:nowrap; flex-shrink:0;
          transition:color .2s, border-color .2s;
        }
        .pr-footer-link:hover { color:#ffe0a0; border-color:#ffe0a0; }

        [data-pr-reveal] {
          opacity:0; transform:translateY(20px);
          transition:opacity .65s ease, transform .65s ease;
        }
        [data-pr-reveal].pr-visible { opacity:1; transform:translateY(0); }

        @media (max-width: 640px) {
          .pr-section { padding:72px 0 88px; }
          .pr-footer  { padding:28px 24px; }
          .pr-card--popular { transform:none; }
          .pr-card--popular.pr-visible { transform:none; }
        }
      `}</style>

      <div className="pr-wave">
        <svg viewBox="0 0 1440 56" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0,20 C240,56 480,0 720,28 C960,56 1200,10 1440,24 L1440,56 L0,56 Z"
            fill="var(--pr-dark, #050008)"
          />
        </svg>
      </div>

      <section className="pr-section" id="pricing">
        <div className="pr-section-glow-b" aria-hidden="true" />

        <div className="pr-inner container-xl">
          <div
            ref={headerRef}
            data-pr-reveal=""
            className="d-flex flex-column align-items-center text-center mb-5"
            style={{ paddingBottom: "2rem" }}
          >
            <div className="pr-kicker mb-3">
              <span className="pr-kicker__dot" />
              Pricing
            </div>

            <h2 className="pr-title mb-3">
              Pay for what you use.
              <br />
              <em>Stop when you want.</em>
            </h2>

            <p className="pr-subtitle mb-4">
              Clear school pricing, no hidden charges, flexible billing, and all your core modules explained up front.
            </p>

            <div className="d-flex align-items-center flex-wrap justify-content-center gap-3">
              {["No setup fee", "Simple pricing", "Cancel any time", "Free onboarding"].map((t, i, arr) => (
                <div key={t} className="d-flex align-items-center gap-3">
                  <span className="pr-trust-item">
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M2 7l3.5 3.5 6.5-6"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {t}
                  </span>
                  {i < arr.length - 1 && <span className="pr-trust-sep" />}
                </div>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="row g-4 align-items-start">
              {[0, 1, 2].map((i) => (
                <div key={i} className="col-12 col-md-6 col-lg-4">
                  <SkeletonCard />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="pr-error-state">
              <div className="pr-error-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 7v5M12 15.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <p className="pr-error-title">Could not load plans</p>
              <p className="pr-error-msg">{error}</p>
              <button className="pr-retry-btn" onClick={fetchPlans}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M14 8A6 6 0 112 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M14 4v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Try again
              </button>
            </div>
          ) : plans.length === 0 ? (
            <p className="pr-empty-state">
              No plans are currently available. Please check back soon.
            </p>
          ) : (
            <div className="row g-4 align-items-start">
              {plans.map((plan, i) => (
                <div key={plan.id} className="col-12 col-md-6 col-lg-4">
                  <PriceCard plan={plan} index={i} />
                </div>
              ))}
            </div>
          )}

          {!loading && !error && plans.length > 0 && (
            <div
              ref={footerRef}
              data-pr-reveal=""
              className="pr-footer d-flex align-items-center justify-content-between flex-wrap gap-4 mt-5"
            >
              <p className="pr-footer-text mb-0">
                <strong>Not sure which plan fits?</strong> Compare student limits, teacher limits, and included modules to choose the right plan for your school.
              </p>
              <a href="#contact" className="pr-footer-link">
                Talk to us about the right plan
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
            </div>
          )}
        </div>
      </section>
    </>
  );
}