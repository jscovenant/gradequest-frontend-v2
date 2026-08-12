import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { publicApi } from "../../utils/axios";

type Feature = { text: string; note?: string | null };
type Plan = {
  id: string;
  name: string;
  price: string;
  raw_price: number;
  period: string;
  tagline?: string;
  duration_in_days?: number;
  max_students?: number | null;
  features?: Feature[];
};

const CORE_FEATURES = [
  "Student, teacher, parent and bursar records",
  "Results, report cards and PIN access",
  "Fee management and online payments",
  "Student attendance and school settings",
  "Staff attendance and QR clock-in",
];

const PLUS_FALLBACK_FEATURES = [
  "Everything in GradeQuest Core",
  "WhatsApp notifications and communication tools",
  "CBT examinations and advanced result workflows",
  "Hostel and transport management",
  "Custom report-card designer and premium support",
];

const COMPARISON = [
  ["Student and staff records", true, true],
  ["Results, fees and attendance", true, true],
  ["Online school-fee collection", true, true],
  ["WhatsApp communication", false, true],
  ["Staff QR attendance", true, true],
  ["CBT, hostel and transport", false, true],
  ["Custom report-card designer", false, true],
] as const;

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function cleanFeature(value?: string | null) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function Check({ included = true }: { included?: boolean }) {
  return included ? (
    <span className="pr-check" aria-label="Included">
      <i className="bi bi-check-lg" />
    </span>
  ) : (
    <span className="pr-not-included" aria-label="Not included">-</span>
  );
}

export default function Pricing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await publicApi.get("/frontend/subscription-plans");
      setPlans(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchPlans(); }, [fetchPlans]);

  const plusPlan = useMemo(() => {
    const namedPlus = plans.find((plan) => {
      const name = normalize(plan.name);
      return name.includes("gradequestplus") || name === "legacyplus";
    });
    return namedPlus || plans.find((plan) => Number(plan.raw_price) > 0) || null;
  }, [plans]);

  const plusFeatures = useMemo(() => {
    const configured = (plusPlan?.features || [])
      .map((feature) => cleanFeature(feature.text))
      .filter(Boolean);
    return configured.length ? configured.slice(0, 7) : PLUS_FALLBACK_FEATURES;
  }, [plusPlan]);

  const plusPrice = loading ? "Loading..." : plusPlan?.price || "Talk to us";
  const plusPeriod = plusPlan?.period || "";

  return (
    <>
      <style>{`
        :root{--pr-ink:#1d151f;--pr-dark:#050008;--pr-magenta:#d300b0;--pr-gold:#ffc857;--pr-cream:#fcf8f8;--pr-muted:#786c79;--pr-line:rgba(29,21,31,.11);--pr-green:#16a34a}
        .pr-wave{display:block;background:#f0ece5;line-height:0;overflow:hidden}.pr-wave svg{display:block;width:100%;height:54px}
        .pr-section{position:relative;overflow:hidden;background:linear-gradient(180deg,#fbf8f5 0%,#f5efe9 100%);padding:96px 0 112px;color:var(--pr-ink)}
        .pr-section:before{content:"";position:absolute;width:620px;height:620px;border-radius:50%;right:-230px;top:-280px;background:radial-gradient(circle,rgba(211,0,176,.1),transparent 68%);pointer-events:none}
        .pr-section:after{content:"";position:absolute;width:540px;height:540px;border-radius:50%;left:-260px;bottom:-300px;background:radial-gradient(circle,rgba(255,200,87,.18),transparent 68%);pointer-events:none}
        .pr-shell{position:relative;z-index:1;max-width:1180px}
        .pr-kicker{display:inline-flex;align-items:center;gap:9px;color:var(--pr-magenta);font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}.pr-kicker:before{content:"";width:24px;height:2px;background:var(--pr-magenta)}
        .pr-title{font-family:'Playfair Display',Georgia,serif;font-size:clamp(38px,5.2vw,66px);font-weight:900;line-height:1.02;letter-spacing:-.035em;max-width:850px;margin:18px auto 0}.pr-title em{font-style:italic;color:var(--pr-magenta)}
        .pr-subtitle{max-width:720px;margin:22px auto 0;color:var(--pr-muted);font-size:16px;line-height:1.75}
        .pr-model{display:inline-flex;align-items:center;gap:10px;margin-top:26px;padding:9px 14px;border:1px solid rgba(29,21,31,.1);border-radius:999px;background:rgba(255,255,255,.72);color:#665a67;font-size:12px;font-weight:700}.pr-model i{color:var(--pr-green)}
        .pr-path-label{display:flex;align-items:center;justify-content:center;gap:12px;margin:42px 0 22px;color:#8d7e8c;font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.pr-path-label:before,.pr-path-label:after{content:"";height:1px;max-width:180px;flex:1;background:var(--pr-line)}
        .pr-grid{display:grid;grid-template-columns:1fr 1.08fr;gap:20px;align-items:stretch}
        .pr-card{position:relative;border:1px solid var(--pr-line);border-radius:24px;background:rgba(255,255,255,.86);padding:34px;box-shadow:0 18px 55px rgba(45,28,43,.08);display:flex;flex-direction:column;min-width:0}
        .pr-card-plus{background:linear-gradient(145deg,#1d151f 0%,#321b34 58%,#50103f 100%);border-color:rgba(211,0,176,.32);color:#fff;box-shadow:0 28px 70px rgba(29,21,31,.24)}
        .pr-recommended{position:absolute;right:22px;top:20px;border-radius:999px;background:var(--pr-gold);color:#251a00;padding:6px 11px;font-size:9px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
        .pr-card-kicker{font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:var(--pr-magenta);margin-bottom:14px}.pr-card-plus .pr-card-kicker{color:var(--pr-gold)}
        .pr-card-title{font-family:'Playfair Display',Georgia,serif;font-size:31px;font-weight:900;line-height:1.05;margin:0}.pr-card-copy{color:var(--pr-muted);font-size:13.5px;line-height:1.65;margin:12px 0 0;max-width:480px}.pr-card-plus .pr-card-copy{color:rgba(255,255,255,.68)}
        .pr-price-row{display:flex;align-items:flex-end;gap:8px;margin:28px 0 8px}.pr-price{font-family:'Playfair Display',Georgia,serif;font-size:38px;font-weight:900;line-height:1;letter-spacing:-.03em}.pr-period{color:var(--pr-muted);font-size:12px;padding-bottom:4px}.pr-card-plus .pr-period{color:rgba(255,255,255,.48)}
        .pr-billing-note{min-height:42px;color:#796d79;font-size:11.5px;line-height:1.55}.pr-card-plus .pr-billing-note{color:rgba(255,255,255,.54)}
        .pr-divider{height:1px;background:var(--pr-line);margin:24px 0}.pr-card-plus .pr-divider{background:rgba(255,255,255,.1)}
        .pr-feature-title{font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px}.pr-features{list-style:none;padding:0;margin:0 0 28px;display:grid;gap:12px}.pr-features li{display:flex;align-items:flex-start;gap:10px;font-size:12.5px;line-height:1.45;color:#5f535f}.pr-card-plus .pr-features li{color:rgba(255,255,255,.82)}
        .pr-check{width:19px;height:19px;flex:0 0 19px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:rgba(22,163,74,.12);color:var(--pr-green);font-size:11px}.pr-card-plus .pr-check{background:rgba(255,200,87,.13);color:var(--pr-gold)}
        .pr-cta{min-height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:9px;text-decoration:none;font-size:13px;font-weight:900;margin-top:auto;transition:.2s}.pr-cta-core{border:1px solid var(--pr-ink);color:var(--pr-ink);background:#fff}.pr-cta-core:hover{background:var(--pr-ink);color:#fff}.pr-cta-plus{background:var(--pr-gold);color:#251a00}.pr-cta-plus:hover{background:#ffda88;color:#251a00;transform:translateY(-1px)}
        .pr-route{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:18px;margin:22px 0 0;padding:18px 20px;border:1px solid var(--pr-line);border-radius:16px;background:rgba(255,255,255,.68)}.pr-route-item{display:flex;gap:12px;align-items:center}.pr-route-icon{width:38px;height:38px;border-radius:11px;background:rgba(211,0,176,.08);color:var(--pr-magenta);display:flex;align-items:center;justify-content:center;font-size:17px}.pr-route strong{display:block;font-size:12.5px}.pr-route small{display:block;color:var(--pr-muted);font-size:11px;margin-top:2px}.pr-route-arrow{color:#a597a4}
        .pr-compare{margin-top:24px;border:1px solid var(--pr-line);border-radius:20px;background:rgba(255,255,255,.76);overflow:hidden}.pr-compare-head,.pr-compare-row{display:grid;grid-template-columns:minmax(0,1fr) 140px 170px;align-items:center}.pr-compare-head{background:var(--pr-ink);color:#fff}.pr-compare-head>div,.pr-compare-row>div{padding:15px 20px}.pr-compare-head>div:not(:first-child),.pr-compare-row>div:not(:first-child){text-align:center}.pr-compare-head strong{font-size:12px}.pr-compare-row{border-top:1px solid var(--pr-line);font-size:12.5px}.pr-compare-row>div:first-child{color:#5f535f}.pr-not-included{color:#b5aab3;font-weight:700}
        .pr-addon{display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:center;margin-top:24px;padding:22px 24px;border-radius:18px;background:#fff;border:1px solid var(--pr-line);box-shadow:0 12px 35px rgba(45,28,43,.05)}.pr-addon-icon{width:48px;height:48px;border-radius:14px;background:rgba(211,0,176,.09);color:var(--pr-magenta);display:flex;align-items:center;justify-content:center;font-size:21px}.pr-addon h3{font-size:15px;font-weight:900;margin:0}.pr-addon p{font-size:12px;color:var(--pr-muted);margin:4px 0 0}.pr-addon a{font-size:12px;font-weight:900;color:var(--pr-magenta);text-decoration:none;white-space:nowrap}
        .pr-error{margin-top:18px;color:#a33b3b;font-size:12px}.pr-error button{border:0;background:none;color:var(--pr-magenta);font-weight:800;padding:0 0 0 5px}
        @media(max-width:900px){.pr-grid{grid-template-columns:1fr}.pr-card{padding:28px}.pr-compare-head,.pr-compare-row{grid-template-columns:minmax(0,1fr) 88px 104px}.pr-compare-head>div,.pr-compare-row>div{padding:13px 12px}.pr-route{grid-template-columns:1fr}.pr-route-arrow{transform:rotate(90deg);justify-self:center}.pr-addon{grid-template-columns:auto 1fr}.pr-addon a{grid-column:2}}
        @media(max-width:560px){.pr-section{padding:74px 0 84px}.pr-title{font-size:38px}.pr-card{padding:24px 20px;border-radius:19px}.pr-recommended{position:static;align-self:flex-start;margin-bottom:14px}.pr-compare-head,.pr-compare-row{grid-template-columns:minmax(0,1fr) 66px 76px}.pr-compare-head>div,.pr-compare-row>div{padding:12px 8px;font-size:10.5px}.pr-addon{padding:18px}.pr-addon-icon{display:none}.pr-addon{grid-template-columns:1fr}.pr-addon a{grid-column:1}}
      `}</style>

      <div className="pr-wave" aria-hidden="true">
        <svg viewBox="0 0 1440 54" preserveAspectRatio="none"><path d="M0 15C260 55 470 0 720 28c250 28 455-15 720 0v26H0z" fill="#fbf8f5" /></svg>
      </div>

      <section className="pr-section" id="pricing">
        <div className="container-xl pr-shell">
          <header className="text-center">
            <span className="pr-kicker">Simple package structure</span>
            <h2 className="pr-title">Choose how your school wants to <em>run GradeQuest.</em></h2>
            <p className="pr-subtitle">Start with Core for essential school operations, or choose GradeQuestPlus for the complete platform and advanced automation.</p>
            <span className="pr-model"><i className="bi bi-check-circle-fill" /> No setup fee • Free onboarding • Cancel at renewal</span>
          </header>

          <div className="pr-path-label">Two clear access options</div>

          <div className="pr-grid">
            <article className="pr-card">
              <div className="pr-card-kicker">Essential operations</div>
              <h3 className="pr-card-title">GradeQuest Core</h3>
              <p className="pr-card-copy">For schools that need the essential management system and want platform costs tied to active students.</p>
              <div className="pr-price-row"><span className="pr-price">₦1,000</span><span className="pr-period">/ active student / term</span></div>
              <div className="pr-billing-note">Use GradeQuest online fee collection, or receive a term invoice based on active student records.</div>
              <div className="pr-divider" />
              <div className="pr-feature-title">Core includes</div>
              <ul className="pr-features">{CORE_FEATURES.map((feature) => <li key={feature}><Check />{feature}</li>)}</ul>
              <Link to="/register" className="pr-cta pr-cta-core">Start with Core <i className="bi bi-arrow-right" /></Link>
            </article>

            <article className="pr-card pr-card-plus">
              <div className="pr-recommended">Complete platform</div>
              <div className="pr-card-kicker">Advanced automation</div>
              <h3 className="pr-card-title">GradeQuestPlus</h3>
              <p className="pr-card-copy">For schools ready to automate more departments, strengthen communication and unlock premium operational tools.</p>
              <div className="pr-price-row"><span className="pr-price">{plusPrice}</span>{plusPeriod && <span className="pr-period">{plusPeriod}</span>}</div>
              <div className="pr-billing-note">One subscription package. Existing active GradeQuestPlus subscriptions remain protected until their renewal date.</div>
              <div className="pr-divider" />
              <div className="pr-feature-title">GradeQuestPlus includes</div>
              <ul className="pr-features">{plusFeatures.map((feature) => <li key={feature}><Check />{feature}</li>)}</ul>
              <Link to="/register" className="pr-cta pr-cta-plus">Get GradeQuestPlus <i className="bi bi-arrow-right" /></Link>
            </article>
          </div>

          <div className="pr-route">
            <div className="pr-route-item"><span className="pr-route-icon"><i className="bi bi-credit-card" /></span><div><strong>Collect fees online?</strong><small>Core access is supported through the online payment model.</small></div></div>
            <i className="bi bi-arrow-right pr-route-arrow" />
            <div className="pr-route-item"><span className="pr-route-icon"><i className="bi bi-stars" /></span><div><strong>Need the full suite?</strong><small>Choose GradeQuestPlus for premium modules and automation.</small></div></div>
          </div>

          <div className="pr-compare">
            <div className="pr-compare-head"><div><strong>Feature comparison</strong></div><div><strong>Core</strong></div><div><strong>GradeQuestPlus</strong></div></div>
            {COMPARISON.map(([label, core, plus]) => <div className="pr-compare-row" key={label}><div>{label}</div><div><Check included={core} /></div><div><Check included={plus} /></div></div>)}
          </div>

          <div className="pr-addon">
            <span className="pr-addon-icon"><i className="bi bi-globe2" /></span>
            <div><h3>Optional service: custom school website and domain</h3><p>This is a separate branding and implementation service—not another GradeQuest subscription plan.</p></div>
            <a href="#contact">Request a quote <i className="bi bi-arrow-right" /></a>
          </div>

          {error && <div className="pr-error text-center">Live GradeQuestPlus pricing could not be loaded.<button onClick={fetchPlans}>Try again</button></div>}
        </div>
      </section>
    </>
  );
}
