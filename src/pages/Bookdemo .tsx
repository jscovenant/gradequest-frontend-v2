import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { publicApi } from "../utils/axios";
import Navbar from "../features/frontend/Navbar";
import Footer from "../features/frontend/footer";
import SwipeUpWidget from "../features/frontend/SwipeUpWidget";
import PageTitle from "../components/PageTitle";
import { usePlatformInfo } from "../hooks/usePlatformInfo";

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
  "School Principal / Director",
  "Head of Academics / Vice Principal",
  "Bursar / Financial Officer",
  "School Administrator",
  "IT / Computer Coordinator",
  "Other",
];

const SCHOOL_TYPES = [
  "Nursery & Primary School",
  "Secondary School / College",
  "Nursery, Primary & College (Combined)",
  "International School Group",
  "Technical / Vocational College",
];

const STUDENT_COUNTS = [
  "Under 100 students",
  "100 - 300 students",
  "300 - 700 students",
  "700 - 1,500 students",
  "1,500+ students",
];

const TIME_SLOTS = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
];

const STEPS = [
  { n: 1 as Step, label: "Your Details", sub: "Contact information" },
  { n: 2 as Step, label: "Your School", sub: "Institution profile" },
  { n: 3 as Step, label: "Schedule Demo", sub: "Date & preferred time" },
];

const HIGHLIGHTS = [
  {
    iconType: "wallet",
    title: "Zero Fee Debt Recovery",
    desc: "Automated installment tracking, debt gatekeepers, and instant multi-bank settlement to prevent revenue leakages.",
  },
  {
    iconType: "chart",
    title: "1-Click Master Broadsheets",
    desc: "Compile entire school terminal positions, GPAs, and tamper-proof QR verified report cards in under 3 minutes.",
  },
  {
    iconType: "laptop",
    title: "Offline Computer Lab CBT",
    desc: "Conduct massive terminal exams with hundreds of students concurrently without internet or power interruption risks.",
  },
  {
    iconType: "sparkles",
    title: "AI Lesson Note Generator",
    desc: "Empower teachers to generate Nigerian NERDC-compliant lesson plans and schemes of work in seconds.",
  },
];

export default function BookDemo() {
  const { whatsappLink } = usePlatformInfo();
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

  const formTopRef = useRef<HTMLDivElement>(null);

  // Minimum date = tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  const set =
    (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      if (errors[key]) {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
      }
    };

  const validate = (): boolean => {
    const e: Partial<FormData> = {};

    if (step === 1) {
      if (!form.firstName.trim()) e.firstName = "First name is required";
      if (!form.lastName.trim()) e.lastName = "Last name is required";
      if (!form.email.trim() || !form.email.includes("@")) {
        e.email = "Valid email address is required";
      }
      if (!form.phone.trim()) e.phone = "Phone or WhatsApp number is required";
    }

    if (step === 2) {
      if (!form.role) e.role = "Please select your role";
      if (!form.schoolName.trim()) e.schoolName = "School name is required";
      if (!form.schoolType) e.schoolType = "Please select institution type";
      if (!form.studentCount) e.studentCount = "Please select student count";
    }

    if (step === 3) {
      if (!form.date) e.date = "Please select a date";
      if (!form.time) e.time = "Please choose a time slot";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    setServerError("");
    if (validate()) {
      setStep((s) => Math.min(s + 1, 3) as Step);
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const back = () => {
    setErrors({});
    setServerError("");
    setStep((s) => Math.max(s - 1, 1) as Step);
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      const res = err?.response?.data;
      if (res?.errors) {
        const backendErrors: Partial<FormData> = {};
        if (res.errors.firstName) backendErrors.firstName = res.errors.firstName[0];
        if (res.errors.lastName) backendErrors.lastName = res.errors.lastName[0];
        if (res.errors.email) backendErrors.email = res.errors.email[0];
        if (res.errors.phone) backendErrors.phone = res.errors.phone[0];
        if (res.errors.role) backendErrors.role = res.errors.role[0];
        if (res.errors.schoolName) backendErrors.schoolName = res.errors.schoolName[0];
        if (res.errors.schoolType) backendErrors.schoolType = res.errors.schoolType[0];
        if (res.errors.studentCount) backendErrors.studentCount = res.errors.studentCount[0];
        if (res.errors.date) backendErrors.date = res.errors.date[0];
        if (res.errors.time) backendErrors.time = res.errors.time[0];
        if (res.errors.message) backendErrors.message = res.errors.message[0];
        setErrors(backendErrors);
      } else {
        setServerError(res?.message || "Unable to submit your booking. Please check your network and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageTitle title="Book a Free Live Demo | SchoolProfit — School Growth & Profit OS" />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,800;1,600&display=swap');

        .gq-demo-page {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background-color: #F8FAFC;
          color: #0F172A;
          min-height: 100vh;
        }

        /* Hero Section */
        .gq-demo-hero {
          background: linear-gradient(135deg, #0F2744 0%, #0A192F 100%);
          color: #FFFFFF;
          padding: 130px 0 70px;
          position: relative;
          overflow: hidden;
        }

        .gq-demo-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
        }

        .gq-demo-hero::after {
          content: '';
          position: absolute;
          top: -100px;
          right: -100px;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .gq-demo-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #FBBF24;
          background: rgba(217, 119, 6, 0.18);
          border: 1px solid rgba(217, 119, 6, 0.35);
          border-radius: 100px;
          padding: 6px 18px;
          margin-bottom: 22px;
        }

        .gq-demo-hero-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(32px, 4vw, 52px);
          font-weight: 800;
          line-height: 1.15;
          color: #FFFFFF;
          margin-bottom: 20px;
          max-width: 820px;
        }

        .gq-demo-hero-title em {
          font-style: italic;
          color: #F59E0B;
          background: linear-gradient(135deg, #FBBF24 0%, #D97706 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .gq-demo-hero-sub {
          font-size: 17px;
          line-height: 1.7;
          color: #CBD5E1;
          max-width: 680px;
          margin-bottom: 36px;
        }

        .gq-demo-trust-row {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-top: 24px;
        }

        .gq-demo-trust-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 10px 18px;
          font-size: 13.5px;
          color: #E2E8F0;
          backdrop-filter: blur(8px);
        }

        .gq-demo-trust-badge strong {
          color: #FBBF24;
          font-weight: 800;
        }

        /* Main Booking Layout */
        .gq-demo-body-section {
          padding: 60px 0 90px;
        }

        .gq-demo-grid {
          display: grid;
          grid-template-columns: 1fr 1.15fr;
          gap: 48px;
          align-items: start;
        }

        @media (max-width: 991px) {
          .gq-demo-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
        }

        /* Left Feature Highlights Card */
        .gq-demo-side-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 20px;
          padding: 36px 32px;
          box-shadow: 0 4px 20px rgba(15, 39, 68, 0.04);
        }

        .gq-demo-side-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 24px;
          font-weight: 800;
          color: #0F2744;
          margin-bottom: 12px;
        }

        .gq-demo-side-desc {
          font-size: 14.5px;
          color: #64748B;
          line-height: 1.6;
          margin-bottom: 28px;
        }

        .gq-demo-feature-item {
          display: flex;
          gap: 16px;
          margin-bottom: 22px;
        }

        .gq-demo-feature-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #FEF3C7;
          border: 1px solid #FDE68A;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .gq-demo-feature-title {
          font-size: 15px;
          font-weight: 700;
          color: #0F2744;
          margin-bottom: 4px;
        }

        .gq-demo-feature-text {
          font-size: 13px;
          color: #64748B;
          line-height: 1.55;
          margin: 0;
        }

        .gq-demo-whatsapp-cta {
          margin-top: 32px;
          padding: 20px;
          background: #ECFDF5;
          border: 1px solid #A7F3D0;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .gq-demo-whatsapp-cta-text {
          font-size: 13px;
          color: #065F46;
          font-weight: 600;
          line-height: 1.4;
        }

        .gq-demo-whatsapp-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #10B981;
          color: #FFFFFF;
          font-size: 13px;
          font-weight: 700;
          padding: 9px 16px;
          border-radius: 10px;
          text-decoration: none;
          white-space: nowrap;
          transition: background 0.2s;
        }

        .gq-demo-whatsapp-btn:hover {
          background: #059669;
          color: #FFFFFF;
        }

        /* Right Booking Form Card */
        .gq-demo-form-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 10px 30px rgba(15, 39, 68, 0.06);
          position: relative;
        }

        @media (max-width: 640px) {
          .gq-demo-form-card {
            padding: 26px 20px;
          }
        }

        /* Step Progress Header */
        .gq-demo-steps-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
          position: relative;
        }

        .gq-demo-steps-bar::before {
          content: '';
          position: absolute;
          top: 18px;
          left: 30px;
          right: 30px;
          height: 2px;
          background: #E2E8F0;
          z-index: 0;
        }

        .gq-demo-step-indicator {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          background: #FFFFFF;
          padding: 0 8px;
        }

        .gq-demo-step-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2px solid #E2E8F0;
          background: #FFFFFF;
          color: #94A3B8;
          font-size: 14px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .gq-demo-step-active .gq-demo-step-circle {
          border-color: #D97706;
          background: #D97706;
          color: #FFFFFF;
          box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.15);
        }

        .gq-demo-step-completed .gq-demo-step-circle {
          border-color: #10B981;
          background: #10B981;
          color: #FFFFFF;
        }

        .gq-demo-step-name {
          font-size: 11.5px;
          font-weight: 700;
          color: #64748B;
          text-align: center;
          white-space: nowrap;
        }

        .gq-demo-step-active .gq-demo-step-name {
          color: #0F2744;
          font-weight: 800;
        }

        /* Form Inputs */
        .gq-field-group {
          margin-bottom: 20px;
        }

        .gq-field-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #1E293B;
          margin-bottom: 6px;
        }

        .gq-field-label span {
          color: #EF4444;
        }

        .gq-input, .gq-select, .gq-textarea {
          width: 100%;
          padding: 12px 16px;
          font-family: inherit;
          font-size: 14px;
          color: #0F172A;
          background: #FFFFFF;
          border: 1.5px solid #CBD5E1;
          border-radius: 10px;
          outline: none;
          transition: all 0.2s ease;
        }

        .gq-input:focus, .gq-select:focus, .gq-textarea:focus {
          border-color: #D97706;
          box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.12);
        }

        .gq-input--error, .gq-select--error, .gq-textarea--error {
          border-color: #EF4444 !important;
          background: #FFF5F5;
        }

        .gq-error-text {
          font-size: 12px;
          color: #DC2626;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .gq-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 600px) {
          .gq-grid-2 {
            grid-template-columns: 1fr;
          }
        }

        /* Time slot selection pills */
        .gq-time-slots-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 10px;
          margin-top: 8px;
        }

        .gq-time-slot-btn {
          padding: 10px 12px;
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          background: #F8FAFC;
          border: 1.5px solid #E2E8F0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .gq-time-slot-btn:hover {
          border-color: #CBD5E1;
          background: #F1F5F9;
        }

        .gq-time-slot-btn--active {
          border-color: #D97706 !important;
          background: #FEF3C7 !important;
          color: #B45309 !important;
          font-weight: 800;
          box-shadow: 0 2px 6px rgba(217, 119, 6, 0.2);
        }

        /* Actions */
        .gq-demo-actions {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #F1F5F9;
        }

        .gq-demo-btn-next {
          flex: 1;
          height: 48px;
          background: #0F2744;
          color: #FFFFFF;
          font-family: inherit;
          font-size: 14.5px;
          font-weight: 700;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(15, 39, 68, 0.2);
        }

        .gq-demo-btn-next:hover:not(:disabled) {
          background: #1E3A8A;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(30, 58, 138, 0.3);
        }

        .gq-demo-btn-next:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .gq-demo-btn-back {
          height: 48px;
          padding: 0 22px;
          background: #FFFFFF;
          color: #475569;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          border: 1.5px solid #CBD5E1;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .gq-demo-btn-back:hover {
          background: #F8FAFC;
          color: #0F172A;
          border-color: #94A3B8;
        }

        /* Success State Screen */
        .gq-demo-success-box {
          text-align: center;
          padding: 30px 10px;
        }

        .gq-demo-success-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #DCFCE7;
          border: 2px solid #86EFAC;
          color: #15803D;
          font-size: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          animation: popIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes popIn {
          0% { transform: scale(0.6); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        .gq-demo-success-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 30px;
          font-weight: 800;
          color: #0F2744;
          margin-bottom: 12px;
        }

        .gq-demo-success-sub {
          font-size: 15.5px;
          color: #475569;
          line-height: 1.6;
          max-width: 460px;
          margin: 0 auto 30px;
        }

        .gq-demo-summary-card {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 20px 24px;
          text-align: left;
          margin-bottom: 30px;
        }

        .gq-demo-summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 13.5px;
          border-bottom: 1px dashed #E2E8F0;
        }

        .gq-demo-summary-row:last-child {
          border-bottom: none;
        }

        .gq-demo-summary-label {
          color: #64748B;
          font-weight: 500;
        }

        .gq-demo-summary-val {
          color: #0F2744;
          font-weight: 700;
          text-align: right;
        }
      `}</style>

      <div className="gq-demo-page">
        {/* Universal Top Navigation */}
        <Navbar />

        {/* Hero Section */}
        <section className="gq-demo-hero">
          <div className="container-xl">
            <div className="gq-demo-kicker">
              Schedule Your Interactive Walkthrough
            </div>

            <h1 className="gq-demo-hero-title">
              See How SchoolProfit Powers <em>School Growth &amp; Eliminates Fee Debts.</em>
            </h1>

            <p className="gq-demo-hero-sub">
              Get a tailored, 1-on-1 walkthrough showing how top schools recover 100% of termly tuition, generate 1-click broadsheets, and run offline CBT exams effortlessly.
            </p>

            <div className="gq-demo-trust-row">
              <div className="gq-demo-trust-badge">
                <i className="bi bi-building-check" style={{ color: "#FBBF24" }} />
                <span><strong>500+</strong> Partner Schools</span>
              </div>
              <div className="gq-demo-trust-badge">
                <i className="bi bi-star-fill" style={{ color: "#FBBF24" }} />
                <span><strong>4.9/5</strong> Satisfaction Rating</span>
              </div>
              <div className="gq-demo-trust-badge">
                <i className="bi bi-clock-history" style={{ color: "#FBBF24" }} />
                <span><strong>30 Mins</strong> Guided Session</span>
              </div>
              <div className="gq-demo-trust-badge">
                <i className="bi bi-shield-check" style={{ color: "#FBBF24" }} />
                <span><strong>100% Free</strong> No Commitment</span>
              </div>
            </div>
          </div>
        </section>

        {/* Body Section */}
        <section className="gq-demo-body-section" ref={formTopRef}>
          <div className="container-xl">
            <div className="gq-demo-grid">
              {/* Left Column: Feature Highlights */}
              <div className="gq-demo-side-card">
                <div className="gq-demo-side-title">What You'll Discover in the Demo</div>
                <p className="gq-demo-side-desc">
                  Our growth specialists will walk you through live configurations configured specifically for your school's curriculum and billing needs.
                </p>

                {HIGHLIGHTS.map((h, i) => (
                  <div className="gq-demo-feature-item" key={i}>
                    <div className="gq-demo-feature-icon">
                      {h.iconType === "wallet" && <i className="bi bi-wallet2" style={{ color: "#D97706", fontSize: 18 }} />}
                      {h.iconType === "chart" && <i className="bi bi-bar-chart-line-fill" style={{ color: "#D97706", fontSize: 18 }} />}
                      {h.iconType === "laptop" && <i className="bi bi-laptop" style={{ color: "#D97706", fontSize: 18 }} />}
                      {h.iconType === "sparkles" && <i className="bi bi-stars" style={{ color: "#D97706", fontSize: 18 }} />}
                    </div>
                    <div>
                      <div className="gq-demo-feature-title">{h.title}</div>
                      <p className="gq-demo-feature-text">{h.desc}</p>
                    </div>
                  </div>
                ))}

                {/* Instant WhatsApp Support Box */}
                <div className="gq-demo-whatsapp-cta">
                  <div className="gq-demo-whatsapp-cta-text">
                    Prefer an instant conversation? Chat directly with an expert on WhatsApp.
                  </div>
                  <a
                    href={whatsappLink("Hello SchoolProfit, I'd like to ask a few questions before booking a live demo")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gq-demo-whatsapp-btn"
                  >
                    <i className="bi bi-whatsapp me-1" />
                    <span>Chat Now</span>
                  </a>
                </div>
              </div>

              {/* Right Column: Interactive Booking Form */}
              <div className="gq-demo-form-card">
                {done ? (
                  <div className="gq-demo-success-box">
                    <div className="gq-demo-success-icon"><i className="bi bi-check-lg" /></div>
                    <h2 className="gq-demo-success-title">Demo Successfully Booked!</h2>
                    <p className="gq-demo-success-sub">
                      Thank you, <strong>{form.firstName}</strong>. We've reserved your 30-minute demonstration slot. A growth specialist will reach out on WhatsApp and Email to confirm the meeting link.
                    </p>

                    <div className="gq-demo-summary-card">
                      <div className="gq-demo-summary-row">
                        <span className="gq-demo-summary-label">Institution:</span>
                        <span className="gq-demo-summary-val">{form.schoolName}</span>
                      </div>
                      <div className="gq-demo-summary-row">
                        <span className="gq-demo-summary-label">Contact Person:</span>
                        <span className="gq-demo-summary-val">{form.firstName} {form.lastName} ({form.role})</span>
                      </div>
                      <div className="gq-demo-summary-row">
                        <span className="gq-demo-summary-label">Scheduled Date:</span>
                        <span className="gq-demo-summary-val">{form.date}</span>
                      </div>
                      <div className="gq-demo-summary-row">
                        <span className="gq-demo-summary-label">Selected Time:</span>
                        <span className="gq-demo-summary-val">{form.time} (WAT)</span>
                      </div>
                      <div className="gq-demo-summary-row">
                        <span className="gq-demo-summary-label">Confirmation Sent To:</span>
                        <span className="gq-demo-summary-val">{form.email}</span>
                      </div>
                    </div>

                    <div className="d-flex gap-3 justify-content-center flex-wrap">
                      <Link to="/" className="gq-demo-btn-next" style={{ flex: "none", padding: "0 28px" }}>
                        Back to Homepage
                      </Link>
                      <Link to="/#pricing" className="gq-demo-btn-back">
                        Explore Platform Pricing
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Step Progress Bar */}
                    <div className="gq-demo-steps-bar">
                      {STEPS.map((s) => {
                        const isCompleted = step > s.n;
                        const isActive = step === s.n;
                        return (
                          <div
                            key={s.n}
                            className={`gq-demo-step-indicator ${
                              isActive
                                ? "gq-demo-step-active"
                                : isCompleted
                                ? "gq-demo-step-completed"
                                : ""
                            }`}
                          >
                            <div className="gq-demo-step-circle">
                              {isCompleted ? <i className="bi bi-check-lg" /> : `0${s.n}`}
                            </div>
                            <span className="gq-demo-step-name">{s.label}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Server Error Alert */}
                    {serverError && (
                      <div
                        style={{
                          background: "#FEF2F2",
                          border: "1px solid #FEE2E2",
                          color: "#B91C1C",
                          padding: "12px 16px",
                          borderRadius: 10,
                          fontSize: 13,
                          marginBottom: 20,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <i className="bi bi-exclamation-circle-fill me-1" /> {serverError}
                      </div>
                    )}

                    {/* Step 1: Contact Details */}
                    {step === 1 && (
                      <div>
                        <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0F2744", marginBottom: 6 }}>
                          Step 1: Your Contact Information
                        </h3>
                        <p style={{ fontSize: 13.5, color: "#64748B", marginBottom: 24 }}>
                          Tell us who we'll be speaking with during the live demonstration.
                        </p>

                        <div className="gq-grid-2">
                          <div className="gq-field-group">
                            <label className="gq-field-label">
                              First Name <span>*</span>
                            </label>
                            <input
                              type="text"
                              className={`gq-input ${errors.firstName ? "gq-input--error" : ""}`}
                              placeholder="e.g. Samuel"
                              value={form.firstName}
                              onChange={set("firstName")}
                            />
                            {errors.firstName && <div className="gq-error-text">{errors.firstName}</div>}
                          </div>

                          <div className="gq-field-group">
                            <label className="gq-field-label">
                              Last Name <span>*</span>
                            </label>
                            <input
                              type="text"
                              className={`gq-input ${errors.lastName ? "gq-input--error" : ""}`}
                              placeholder="e.g. Adebayo"
                              value={form.lastName}
                              onChange={set("lastName")}
                            />
                            {errors.lastName && <div className="gq-error-text">{errors.lastName}</div>}
                          </div>
                        </div>

                        <div className="gq-field-group">
                          <label className="gq-field-label">
                            Official Email Address <span>*</span>
                          </label>
                          <input
                            type="email"
                            className={`gq-input ${errors.email ? "gq-input--error" : ""}`}
                            placeholder="principal@yourschool.com"
                            value={form.email}
                            onChange={set("email")}
                          />
                          {errors.email && <div className="gq-error-text">{errors.email}</div>}
                        </div>

                        <div className="gq-field-group">
                          <label className="gq-field-label">
                            Phone / WhatsApp Number <span>*</span>
                          </label>
                          <input
                            type="tel"
                            className={`gq-input ${errors.phone ? "gq-input--error" : ""}`}
                            placeholder="08012345678"
                            value={form.phone}
                            onChange={set("phone")}
                          />
                          {errors.phone && <div className="gq-error-text">{errors.phone}</div>}
                        </div>
                      </div>
                    )}

                    {/* Step 2: School Profile */}
                    {step === 2 && (
                      <div>
                        <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0F2744", marginBottom: 6 }}>
                          Step 2: Tell Us About Your School
                        </h3>
                        <p style={{ fontSize: 13.5, color: "#64748B", marginBottom: 24 }}>
                          We'll customize your demonstration to fit your exact school size and level.
                        </p>

                        <div className="gq-field-group">
                          <label className="gq-field-label">
                            Your Role in the School <span>*</span>
                          </label>
                          <select
                            className={`gq-select ${errors.role ? "gq-select--error" : ""}`}
                            value={form.role}
                            onChange={set("role")}
                          >
                            <option value="">-- Select Your Role --</option>
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          {errors.role && <div className="gq-error-text">{errors.role}</div>}
                        </div>

                        <div className="gq-field-group">
                          <label className="gq-field-label">
                            School / Institution Name <span>*</span>
                          </label>
                          <input
                            type="text"
                            className={`gq-input ${errors.schoolName ? "gq-input--error" : ""}`}
                            placeholder="e.g. Gracefield Model Academy"
                            value={form.schoolName}
                            onChange={set("schoolName")}
                          />
                          {errors.schoolName && <div className="gq-error-text">{errors.schoolName}</div>}
                        </div>

                        <div className="gq-grid-2">
                          <div className="gq-field-group">
                            <label className="gq-field-label">
                              School Level / Type <span>*</span>
                            </label>
                            <select
                              className={`gq-select ${errors.schoolType ? "gq-select--error" : ""}`}
                              value={form.schoolType}
                              onChange={set("schoolType")}
                            >
                              <option value="">-- Select Level --</option>
                              {SCHOOL_TYPES.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                            {errors.schoolType && <div className="gq-error-text">{errors.schoolType}</div>}
                          </div>

                          <div className="gq-field-group">
                            <label className="gq-field-label">
                              Approximate Student Population <span>*</span>
                            </label>
                            <select
                              className={`gq-select ${errors.studentCount ? "gq-select--error" : ""}`}
                              value={form.studentCount}
                              onChange={set("studentCount")}
                            >
                              <option value="">-- Select Range --</option>
                              {STUDENT_COUNTS.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                            {errors.studentCount && <div className="gq-error-text">{errors.studentCount}</div>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Schedule Date & Time */}
                    {step === 3 && (
                      <div>
                        <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0F2744", marginBottom: 6 }}>
                          Step 3: Choose Your Preferred Time
                        </h3>
                        <p style={{ fontSize: 13.5, color: "#64748B", marginBottom: 24 }}>
                          Pick an appointment time that works for you. Demonstrations typically take 30 minutes.
                        </p>

                        <div className="gq-field-group">
                          <label className="gq-field-label">
                            Preferred Date <span>*</span>
                          </label>
                          <input
                            type="date"
                            min={minDateStr}
                            className={`gq-input ${errors.date ? "gq-input--error" : ""}`}
                            value={form.date}
                            onChange={set("date")}
                          />
                          {errors.date && <div className="gq-error-text">{errors.date}</div>}
                        </div>

                        <div className="gq-field-group">
                          <label className="gq-field-label">
                            Preferred Time Slot (West Africa Time) <span>*</span>
                          </label>
                          <div className="gq-time-slots-grid">
                            {TIME_SLOTS.map((t) => (
                              <button
                                key={t}
                                type="button"
                                className={`gq-time-slot-btn ${
                                  form.time === t ? "gq-time-slot-btn--active" : ""
                                }`}
                                onClick={() => {
                                  setForm((f) => ({ ...f, time: t }));
                                  if (errors.time) setErrors((prev) => ({ ...prev, time: undefined }));
                                }}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                          {errors.time && <div className="gq-error-text">{errors.time}</div>}
                        </div>

                        <div className="gq-field-group">
                          <label className="gq-field-label">
                            Specific Questions or Key Focus Areas (Optional)
                          </label>
                          <textarea
                            rows={3}
                            className="gq-textarea"
                            placeholder="Tell us what you'd like to see (e.g. offline CBT, installment fees, automated broadsheets...)"
                            value={form.message}
                            onChange={set("message")}
                          />
                        </div>
                      </div>
                    )}

                    {/* Form Buttons */}
                    <div className="gq-demo-actions">
                      {step > 1 && (
                        <button type="button" className="gq-demo-btn-back" onClick={back}>
                          <i className="bi bi-arrow-left me-1" /> Back
                        </button>
                      )}

                      {step < 3 ? (
                        <button type="button" className="gq-demo-btn-next" onClick={next}>
                          Continue to Step {step + 1} <i className="bi bi-arrow-right ms-1" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="gq-demo-btn-next"
                          onClick={submit}
                          disabled={submitting}
                        >
                          {submitting ? "Booking Your Demo..." : "Confirm & Schedule Demo"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Global Footer */}
        <Footer />

        {/* Swipe Up Widget */}
        <SwipeUpWidget />
      </div>
    </>
  );
}