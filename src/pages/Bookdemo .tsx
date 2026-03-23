import { useState, useRef, useEffect } from "react";
import { publicApi } from "../utils/axios";

/**
 * BookDemo.tsx — full-page demo booking form
 */

type Step = 1 | 2 | 3;

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  schoolName: string;
  schoolType: string;
  studentCount: string;
  date: string;
  time: string;
  message: string;
};

const ROLES = [
  "School Proprietor / Owner",
  "School Principal",
  "Head of Academics",
  "School Administrator",
  "IT / Tech Coordinator",
  "Other",
];

const SCHOOL_TYPES = [
  "Primary School",
  "Secondary School",
  "Primary & Secondary (Combined)",
  "International School",
  "Tertiary Institution",
];

const STUDENT_COUNTS = [
  "Under 200",
  "200 – 500",
  "500 – 1,000",
  "1,000 – 2,500",
  "2,500+",
];

const TIME_SLOTS = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
];

const STEPS = [
  { n: 1 as Step, label: "Your details" },
  { n: 2 as Step, label: "Your school" },
  { n: 3 as Step, label: "Pick a time" },
];

const TRUST = [
  { val: "500+", label: "Schools onboarded" },
  { val: "4.9★", label: "Avg rating" },
  { val: "30 min", label: "Demo length" },
  { val: "Free", label: "No commitment" },
];

function useReveal(ref: React.RefObject<HTMLElement | null>, delay = 0) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => el.classList.add("bd-visible"), delay);
          io.disconnect();
        }
      },
      { threshold: 0.05 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [ref, delay]);
}

export default function BookDemo() {
  const [step, setStep] = useState<Step>(1);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const [form, setForm] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "",
    schoolName: "",
    schoolType: "",
    studentCount: "",
    date: "",
    time: "",
    message: "",
  });

  const panelRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useReveal(panelRef, 0);
  useReveal(formRef, 120);

  const set =
    (key: keyof FormData) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): boolean => {
    const e: Partial<FormData> = {};

    if (step === 1) {
      if (!form.firstName.trim()) e.firstName = "Required";
      if (!form.lastName.trim()) e.lastName = "Required";
      if (!form.email.trim() || !form.email.includes("@")) {
        e.email = "Valid email required";
      }
      if (!form.phone.trim()) e.phone = "Required";
    }

    if (step === 2) {
      if (!form.role) e.role = "Select a role";
      if (!form.schoolName.trim()) e.schoolName = "Required";
      if (!form.schoolType) e.schoolType = "Select a type";
      if (!form.studentCount) e.studentCount = "Select a range";
    }

    if (step === 3) {
      if (!form.date) e.date = "Pick a date";
      if (!form.time) e.time = "Pick a time";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    setServerError("");
    if (validate()) {
      setStep((s) => Math.min(s + 1, 3) as Step);
    }
  };

  const back = () => {
    setErrors({});
    setServerError("");
    setStep((s) => Math.max(s - 1, 1) as Step);
  };

  const submit = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);
      setServerError("");

      await publicApi.post("/demo-bookings", {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        role: form.role,
        schoolName: form.schoolName,
        schoolType: form.schoolType,
        studentCount: form.studentCount,
        date: form.date,
        time: form.time,
        message: form.message,
      });

      setDone(true);
    } catch (err: any) {
      const res = err?.response?.data;

      if (res?.errors) {
        const backendErrors: Partial<FormData> = {};

        if (res.errors.firstName) {
          backendErrors.firstName = res.errors.firstName[0];
        }
        if (res.errors.lastName) {
          backendErrors.lastName = res.errors.lastName[0];
        }
        if (res.errors.email) {
          backendErrors.email = res.errors.email[0];
        }
        if (res.errors.phone) {
          backendErrors.phone = res.errors.phone[0];
        }
        if (res.errors.role) {
          backendErrors.role = res.errors.role[0];
        }
        if (res.errors.schoolName) {
          backendErrors.schoolName = res.errors.schoolName[0];
        }
        if (res.errors.schoolType) {
          backendErrors.schoolType = res.errors.schoolType[0];
        }
        if (res.errors.studentCount) {
          backendErrors.studentCount = res.errors.studentCount[0];
        }
        if (res.errors.date) {
          backendErrors.date = res.errors.date[0];
        }
        if (res.errors.time) {
          backendErrors.time = res.errors.time[0];
        }
        if (res.errors.message) {
          backendErrors.message = res.errors.message[0];
        }

        setErrors(backendErrors);
      } else {
        setServerError(
          res?.message || "Unable to submit booking. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Minimum date = tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500&display=swap');

        :root {
          --bd-dark:     var(--bs-dark,      #050008);
          --bd-accent:   var(--bs-secondary, rgb(255,200,87));
          --bd-magenta:  var(--bs-primary,   rgb(211,0,176));
          --bd-success:  var(--bs-success,   rgb(34,197,94));
          --bd-danger:   var(--bs-danger,    rgb(239,68,68));

          --bd-border:   rgba(255,255,255,0.08);
          --bd-surface:  rgba(255,255,255,0.04);
          --bd-muted:    rgba(255,255,255,0.35);

          --bd-accent-dim:    rgba(255,200,87,0.10);
          --bd-accent-border: rgba(255,200,87,0.28);
          --bd-accent-glow:   rgba(255,200,87,0.22);
          --bd-magenta-dim:   rgba(211,0,176,0.08);
        }

        .bd-page {
          min-height: 100vh;
          background: var(--bd-dark);
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: stretch;
        }

        .bd-page::before {
          content: '';
          position: absolute; inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
          z-index: 0;
        }

        .bd-page::after {
          content: '';
          position: absolute;
          top: -120px; left: 10%;
          width: 700px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(255,200,87,0.07) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .bd-magenta-glow {
          position: absolute;
          bottom: -100px; right: -80px;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(211,0,176,0.05) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .bd-z { position: relative; z-index: 1; width: 100%; }

        .bd-split {
          display: grid;
          grid-template-columns: 420px 1fr;
          min-height: 100vh;
        }

        @media (max-width: 960px) {
          .bd-split { grid-template-columns: 1fr; }
        }

        .bd-panel {
          background: rgba(255,255,255,0.025);
          border-right: 1px solid var(--bd-border);
          padding: 64px 48px;
          display: flex;
          flex-direction: column;
          gap: 0;
          opacity: 0;
          transform: translateX(-24px);
          transition: opacity .7s ease, transform .7s ease;
        }

        .bd-panel.bd-visible { opacity: 1; transform: translateX(0); }

        @media (max-width: 960px) {
          .bd-panel {
            border-right: none;
            border-bottom: 1px solid var(--bd-border);
            padding: 48px 32px 40px;
          }
        }

        .bd-back {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 400;
          color: var(--bd-muted);
          text-decoration: none;
          margin-bottom: 52px;
          transition: color .2s;
        }

        .bd-back:hover { color: rgba(255,255,255,0.7); }

        .bd-panel-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          margin-bottom: 36px;
        }

        .bd-panel-logo-mark {
          width: 34px; height: 34px;
          border-radius: 9px;
          background: linear-gradient(135deg, var(--bd-accent), #ffe0a0);
          display: flex; align-items: center; justify-content: center;
        }

        .bd-panel-logo-name {
          font-family: 'Playfair Display', serif;
          font-size: 18px; font-weight: 700;
          color: #fff; letter-spacing: -0.01em;
        }

        .bd-panel-eyebrow {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--bd-muted);
          margin-bottom: 12px;
        }

        .bd-panel-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 3vw, 40px);
          font-weight: 900;
          color: #fff;
          line-height: 1.1;
          margin-bottom: 16px;
        }

        .bd-panel-title em {
          font-style: italic;
          color: var(--bd-magenta);
        }

        .bd-panel-desc {
          font-size: 14.5px;
          font-weight: 300;
          color: var(--bd-muted);
          line-height: 1.8;
          margin-bottom: 48px;
        }

        .bd-steps {
          display: flex;
          flex-direction: column;
          gap: 0;
          margin-bottom: 48px;
        }

        .bd-step-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 0;
          position: relative;
        }

        .bd-step-row:not(:last-child)::after {
          content: '';
          position: absolute;
          left: 15px; top: 44px;
          width: 1px; height: calc(100% - 14px);
          background: var(--bd-border);
        }

        .bd-step-num {
          width: 30px; height: 30px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 500;
          flex-shrink: 0;
          transition: background .3s, border-color .3s, color .3s;
          border: 1px solid var(--bd-border);
          color: var(--bd-muted);
          background: transparent;
        }

        .bd-step-row--active .bd-step-num {
          background: var(--bd-accent);
          border-color: var(--bd-accent);
          color: var(--bd-dark);
          box-shadow: 0 0 16px var(--bd-accent-glow);
        }

        .bd-step-row--done .bd-step-num {
          background: var(--bd-magenta-dim);
          border-color: var(--bd-magenta);
          color: var(--bd-magenta);
        }

        .bd-step-label {
          font-size: 13.5px; font-weight: 400;
          color: var(--bd-muted);
          transition: color .3s;
        }

        .bd-step-row--active .bd-step-label {
          color: rgba(255,255,255,0.9);
          font-weight: 500;
        }

        .bd-step-row--done .bd-step-label {
          color: rgba(255,255,255,0.45);
        }

        .bd-trust {
          margin-top: auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .bd-trust-item {
          background: var(--bd-surface);
          border: 1px solid var(--bd-border);
          border-radius: 10px;
          padding: 14px 16px;
        }

        .bd-trust-val {
          font-family: 'Playfair Display', serif;
          font-size: 20px; font-weight: 700;
          color: var(--bd-accent);
          line-height: 1;
          display: block;
          margin-bottom: 3px;
        }

        .bd-trust-label {
          font-size: 11px; font-weight: 300;
          color: var(--bd-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .bd-form-area {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 64px 48px;
          opacity: 0;
          transform: translateY(24px);
          transition: opacity .7s ease .1s, transform .7s ease .1s;
        }

        .bd-form-area.bd-visible { opacity: 1; transform: translateY(0); }

        @media (max-width: 640px) {
          .bd-form-area { padding: 40px 24px; }
        }

        .bd-form-wrap { width: 100%; max-width: 520px; }

        .bd-form-step-label {
          font-size: 11px; font-weight: 500;
          letter-spacing: 0.18em; text-transform: uppercase;
          color: var(--bd-accent);
          margin-bottom: 8px;
          display: block;
        }

        .bd-form-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(22px, 3vw, 32px);
          font-weight: 700; color: #fff;
          line-height: 1.15;
          margin-bottom: 32px;
        }

        .bd-field { display: flex; flex-direction: column; gap: 6px; }

        .bd-label {
          font-size: 12px; font-weight: 500;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: rgba(255,255,255,0.45);
        }

        .bd-input, .bd-select, .bd-textarea {
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--bd-border);
          border-radius: 8px;
          padding: 12px 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 300;
          color: rgba(255,255,255,0.88);
          outline: none;
          width: 100%;
          transition: border-color .2s, background .2s, box-shadow .2s;
          -webkit-appearance: none;
        }

        .bd-input::placeholder, .bd-textarea::placeholder {
          color: rgba(255,255,255,0.2);
        }

        .bd-input:focus, .bd-select:focus, .bd-textarea:focus {
          border-color: var(--bd-accent-border);
          background: rgba(255,200,87,0.03);
          box-shadow: 0 0 0 3px rgba(255,200,87,0.08);
        }

        .bd-input--error, .bd-select--error, .bd-textarea--error {
          border-color: rgba(239,68,68,0.5) !important;
        }

        .bd-error-msg {
          font-size: 11.5px;
          color: var(--bd-danger);
          margin-top: 2px;
        }

        .bd-select-wrap { position: relative; }

        .bd-select-wrap::after {
          content: '';
          position: absolute;
          right: 14px; top: 50%;
          transform: translateY(-50%);
          width: 0; height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 5px solid rgba(255,255,255,0.3);
          pointer-events: none;
        }

        .bd-select { cursor: pointer; padding-right: 36px; }
        .bd-select option { background: #1a1a2e; color: #fff; }

        .bd-time-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .bd-time-pill {
          padding: 8px 16px;
          border: 1px solid var(--bd-border);
          border-radius: 7px;
          font-size: 13px; font-weight: 400;
          color: var(--bd-muted);
          cursor: pointer;
          background: transparent;
          transition: border-color .2s, color .2s, background .2s;
        }

        .bd-time-pill:hover {
          border-color: rgba(255,200,87,0.3);
          color: rgba(255,255,255,0.8);
        }

        .bd-time-pill--selected {
          border-color: var(--bd-accent) !important;
          background: var(--bd-accent-dim) !important;
          color: var(--bd-accent) !important;
        }

        .bd-progress-bar {
          height: 3px;
          background: var(--bd-border);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 32px;
        }

        .bd-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--bd-accent), #ffe0a0);
          border-radius: 2px;
          transition: width .4s cubic-bezier(.4,0,.2,1);
        }

        .bd-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 32px;
          background: var(--bd-accent);
          color: var(--bd-dark);
          font-family: 'DM Sans', sans-serif;
          font-size: 14.5px; font-weight: 500;
          border: none; border-radius: 8px;
          cursor: pointer;
          transition: background .2s, transform .2s, box-shadow .2s, opacity .2s;
          width: 100%;
        }

        .bd-btn-primary:hover:not(:disabled) {
          background: #ffe0a0;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px var(--bd-accent-glow);
        }

        .bd-btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .bd-btn-ghost {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 24px;
          background: transparent;
          color: var(--bd-muted);
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 400;
          border: 1px solid var(--bd-border);
          border-radius: 8px;
          cursor: pointer;
          transition: background .2s, color .2s, border-color .2s;
          flex: 1;
        }

        .bd-btn-ghost:hover {
          background: var(--bd-surface);
          color: rgba(255,255,255,0.8);
          border-color: rgba(255,255,255,0.16);
        }

        .bd-success {
          text-align: center;
          padding: 40px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .bd-success-icon {
          width: 72px; height: 72px;
          border-radius: 50%;
          background: rgba(34,197,94,0.1);
          border: 1px solid rgba(34,197,94,0.25);
          display: flex; align-items: center; justify-content: center;
          color: var(--bd-success);
          animation: bd-pop .5s cubic-bezier(.34,1.56,.64,1);
        }

        @keyframes bd-pop {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }

        .bd-success-title {
          font-family: 'Playfair Display', serif;
          font-size: 28px; font-weight: 700;
          color: #fff; line-height: 1.2;
        }

        .bd-success-title em {
          font-style: italic;
          color: var(--bd-accent);
        }

        .bd-success-desc {
          font-size: 15px; font-weight: 300;
          color: var(--bd-muted); line-height: 1.8;
          max-width: 380px;
        }

        .bd-success-detail {
          background: var(--bd-surface);
          border: 1px solid var(--bd-border);
          border-radius: 12px;
          padding: 20px 24px;
          width: 100%;
          display: flex; flex-direction: column; gap: 10px;
        }

        .bd-success-row {
          display: flex; align-items: center;
          justify-content: space-between;
          font-size: 13.5px;
          gap: 12px;
        }

        .bd-success-row-label {
          color: var(--bd-muted);
          font-weight: 300;
        }

        .bd-success-row-val {
          color: rgba(255,255,255,.8);
          font-weight: 400;
          text-align: right;
        }

        .bd-server-error {
          color: var(--bd-danger);
          font-size: 12px;
          margin: 0;
          text-align: center;
        }
      `}</style>

      <div className="bd-page">
        <span className="bd-magenta-glow" aria-hidden="true" />

        <div className="bd-z">
          <div className="bd-split">
            <div ref={panelRef} className="bd-panel">
              <a href="/" className="bd-back">
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M13 7H1M7 1L1 7l6 6"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Back to site
              </a>

              <a href="/" className="bd-panel-logo">
                <span className="bd-panel-logo-mark">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <polygon
                      points="12,2 22,19 2,19"
                      stroke="var(--bd-dark)"
                      strokeWidth="2"
                      strokeLinejoin="round"
                      fill="none"
                    />
                    <path
                      d="M12 8v5M12 15.5v.5"
                      stroke="var(--bd-dark)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <span className="bd-panel-logo-name">GradeQuest</span>
              </a>

              <p className="bd-panel-eyebrow">Book your session</p>
              <h1 className="bd-panel-title">
                See it in action.
                <br />
                <em>30 minutes.</em>
                <br />
                No pressure.
              </h1>
              <p className="bd-panel-desc">
                A GradeQuest specialist will walk you through the platform live
                — results, fees, AI monitoring, and analytics — tailored to your
                school&apos;s size and needs.
              </p>

              <div className="bd-steps">
                {STEPS.map((s) => (
                  <div
                    key={s.n}
                    className={`bd-step-row ${
                      done || step > s.n
                        ? "bd-step-row--done"
                        : step === s.n
                        ? "bd-step-row--active"
                        : ""
                    }`}
                  >
                    <span className="bd-step-num">
                      {done || step > s.n ? (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        s.n
                      )}
                    </span>
                    <span className="bd-step-label">{s.label}</span>
                  </div>
                ))}
              </div>

              <div className="bd-trust">
                {TRUST.map((t) => (
                  <div key={t.label} className="bd-trust-item">
                    <span className="bd-trust-val">{t.val}</span>
                    <span className="bd-trust-label">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div ref={formRef} className="bd-form-area">
              <div className="bd-form-wrap">
                {done ? (
                  <div className="bd-success">
                    <div className="bd-success-icon">
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <path
                          d="M6 16l7 7 13-13"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>

                    <h2 className="bd-success-title">
                      You&apos;re <em>booked in.</em>
                    </h2>

                    <p className="bd-success-desc">
                      We&apos;ve sent a confirmation to{" "}
                      <strong style={{ color: "rgba(255,255,255,.7)" }}>
                        {form.email}
                      </strong>
                      . A specialist will reach out within 1 business hour to
                      confirm the slot.
                    </p>

                    <div className="bd-success-detail w-100">
                      <div className="bd-success-row">
                        <span className="bd-success-row-label">Name</span>
                        <span className="bd-success-row-val">
                          {form.firstName} {form.lastName}
                        </span>
                      </div>
                      <div className="bd-success-row">
                        <span className="bd-success-row-label">School</span>
                        <span className="bd-success-row-val">{form.schoolName}</span>
                      </div>
                      <div className="bd-success-row">
                        <span className="bd-success-row-label">Date</span>
                        <span className="bd-success-row-val">{form.date}</span>
                      </div>
                      <div className="bd-success-row">
                        <span className="bd-success-row-label">Time</span>
                        <span className="bd-success-row-val">
                          {form.time} (WAT)
                        </span>
                      </div>
                    </div>

                    <a
                      href="/"
                      className="bd-btn-primary"
                      style={{ textDecoration: "none" }}
                    >
                      Back to GradeQuest
                    </a>
                  </div>
                ) : (
                  <>
                    <div className="bd-progress-bar">
                      <div
                        className="bd-progress-fill"
                        style={{ width: `${(step / 3) * 100}%` }}
                      />
                    </div>

                    {step === 1 && (
                      <>
                        <span className="bd-form-step-label">Step 1 of 3</span>
                        <h2 className="bd-form-title">Tell us about yourself</h2>

                        <div className="d-flex flex-column gap-4">
                          <div className="row g-3">
                            <div className="col-6">
                              <div className="bd-field">
                                <label className="bd-label">First name</label>
                                <input
                                  className={`bd-input ${
                                    errors.firstName ? "bd-input--error" : ""
                                  }`}
                                  type="text"
                                  placeholder="Adaeze"
                                  value={form.firstName}
                                  onChange={set("firstName")}
                                />
                                {errors.firstName && (
                                  <span className="bd-error-msg">
                                    {errors.firstName}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="col-6">
                              <div className="bd-field">
                                <label className="bd-label">Last name</label>
                                <input
                                  className={`bd-input ${
                                    errors.lastName ? "bd-input--error" : ""
                                  }`}
                                  type="text"
                                  placeholder="Okonkwo"
                                  value={form.lastName}
                                  onChange={set("lastName")}
                                />
                                {errors.lastName && (
                                  <span className="bd-error-msg">
                                    {errors.lastName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="bd-field">
                            <label className="bd-label">Work email</label>
                            <input
                              className={`bd-input ${
                                errors.email ? "bd-input--error" : ""
                              }`}
                              type="email"
                              placeholder="you@yourschool.edu.ng"
                              value={form.email}
                              onChange={set("email")}
                            />
                            {errors.email && (
                              <span className="bd-error-msg">{errors.email}</span>
                            )}
                          </div>

                          <div className="bd-field">
                            <label className="bd-label">Phone / WhatsApp</label>
                            <input
                              className={`bd-input ${
                                errors.phone ? "bd-input--error" : ""
                              }`}
                              type="tel"
                              placeholder="+234 800 000 0000"
                              value={form.phone}
                              onChange={set("phone")}
                            />
                            {errors.phone && (
                              <span className="bd-error-msg">{errors.phone}</span>
                            )}
                          </div>

                          <button className="bd-btn-primary" onClick={next} type="button">
                            Continue
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                              <path
                                d="M1 7h12M7 1l6 6-6 6"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}

                    {step === 2 && (
                      <>
                        <span className="bd-form-step-label">Step 2 of 3</span>
                        <h2 className="bd-form-title">About your school</h2>

                        <div className="d-flex flex-column gap-4">
                          <div className="bd-field">
                            <label className="bd-label">Your role</label>
                            <div className="bd-select-wrap">
                              <select
                                className={`bd-select ${
                                  errors.role ? "bd-select--error" : ""
                                }`}
                                value={form.role}
                                onChange={set("role")}
                              >
                                <option value="">Select your role…</option>
                                {ROLES.map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {errors.role && (
                              <span className="bd-error-msg">{errors.role}</span>
                            )}
                          </div>

                          <div className="bd-field">
                            <label className="bd-label">School name</label>
                            <input
                              className={`bd-input ${
                                errors.schoolName ? "bd-input--error" : ""
                              }`}
                              type="text"
                              placeholder="Greenfield Model School"
                              value={form.schoolName}
                              onChange={set("schoolName")}
                            />
                            {errors.schoolName && (
                              <span className="bd-error-msg">
                                {errors.schoolName}
                              </span>
                            )}
                          </div>

                          <div className="bd-field">
                            <label className="bd-label">School type</label>
                            <div className="bd-select-wrap">
                              <select
                                className={`bd-select ${
                                  errors.schoolType ? "bd-select--error" : ""
                                }`}
                                value={form.schoolType}
                                onChange={set("schoolType")}
                              >
                                <option value="">Select type…</option>
                                {SCHOOL_TYPES.map((t) => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {errors.schoolType && (
                              <span className="bd-error-msg">
                                {errors.schoolType}
                              </span>
                            )}
                          </div>

                          <div className="bd-field">
                            <label className="bd-label">Number of students</label>
                            <div className="bd-select-wrap">
                              <select
                                className={`bd-select ${
                                  errors.studentCount ? "bd-select--error" : ""
                                }`}
                                value={form.studentCount}
                                onChange={set("studentCount")}
                              >
                                <option value="">Select range…</option>
                                {STUDENT_COUNTS.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {errors.studentCount && (
                              <span className="bd-error-msg">
                                {errors.studentCount}
                              </span>
                            )}
                          </div>

                          <div className="d-flex gap-3">
                            <button className="bd-btn-ghost" onClick={back} type="button">
                              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                                <path
                                  d="M13 7H1M7 1L1 7l6 6"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              Back
                            </button>

                            <button className="bd-btn-primary" onClick={next} type="button">
                              Continue
                              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                                <path
                                  d="M1 7h12M7 1l6 6-6 6"
                                  stroke="currentColor"
                                  strokeWidth="1.7"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {step === 3 && (
                      <>
                        <span className="bd-form-step-label">Step 3 of 3</span>
                        <h2 className="bd-form-title">Pick a date & time</h2>

                        <div className="d-flex flex-column gap-4">
                          <div className="bd-field">
                            <label className="bd-label">Preferred date</label>
                            <input
                              className={`bd-input ${
                                errors.date ? "bd-input--error" : ""
                              }`}
                              type="date"
                              min={minDateStr}
                              value={form.date}
                              onChange={set("date")}
                              style={{ colorScheme: "dark" }}
                            />
                            {errors.date && (
                              <span className="bd-error-msg">{errors.date}</span>
                            )}
                          </div>

                          <div className="bd-field">
                            <label className="bd-label">Preferred time (WAT)</label>
                            <div className="bd-time-grid">
                              {TIME_SLOTS.map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  className={`bd-time-pill ${
                                    form.time === t ? "bd-time-pill--selected" : ""
                                  }`}
                                  onClick={() => {
                                    setForm((f) => ({ ...f, time: t }));
                                    setErrors((e) => ({ ...e, time: undefined }));
                                  }}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                            {errors.time && (
                              <span className="bd-error-msg">{errors.time}</span>
                            )}
                          </div>

                          <div className="bd-field">
                            <label className="bd-label">
                              Anything we should know?{" "}
                              <span style={{ opacity: 0.4 }}>(optional)</span>
                            </label>
                            <textarea
                              className="bd-textarea"
                              rows={3}
                              placeholder="e.g. We currently use Excel for results and want to see how migration works…"
                              value={form.message}
                              onChange={set("message")}
                              style={{ resize: "vertical" }}
                            />
                            {errors.message && (
                              <span className="bd-error-msg">{errors.message}</span>
                            )}
                          </div>

                          {serverError && (
                            <p className="bd-server-error">{serverError}</p>
                          )}

                          <div className="d-flex gap-3">
                            <button className="bd-btn-ghost" onClick={back} type="button">
                              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                                <path
                                  d="M13 7H1M7 1L1 7l6 6"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              Back
                            </button>

                            <button
                              className="bd-btn-primary"
                              onClick={submit}
                              disabled={submitting}
                              type="button"
                            >
                              {submitting ? "Submitting..." : "Book my demo"}
                              {!submitting && (
                                <svg
                                  width="13"
                                  height="13"
                                  viewBox="0 0 14 14"
                                  fill="none"
                                >
                                  <path
                                    d="M1 7h12M7 1l6 6-6 6"
                                    stroke="currentColor"
                                    strokeWidth="1.7"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>

                          <p
                            style={{
                              fontSize: 12,
                              color: "var(--bd-muted)",
                              textAlign: "center",
                              fontWeight: 300,
                            }}
                          >
                            No credit card. No commitment. Cancel any time.
                          </p>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}