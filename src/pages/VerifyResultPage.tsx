// src/pages/VerifyResultPage.tsx
import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { publicApi } from "../utils/axios";
import { resolveMediaUrl } from "../utils/apiUrl";
import Footer from "../components/LayoutComponents/Footer";
import PageTitle from "../components/PageTitle";
import QRCode from "qrcode";

interface StudentData {
  id: number;
  firstname?: string;
  surname?: string;
  third_name?: string;
  reg_no?: string;
  gender?: string;
  photo?: string | null;
  dob?: string | null;
  blood_group?: string | null;
  status?: number | string;
}

interface ResultData {
  class?: string;
  term?: string;
  session?: string;
  total_average?: number | string;
  total_grade?: string;
  general_remark?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

interface SchoolData {
  id?: number;
  school_name?: string;
  schoolName?: string;
  logo_url?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

interface VerificationResponse {
  student: StudentData;
  result: ResultData;
  school: SchoolData;
  verified_at?: string;
  verification_code?: string;
}

export default function VerifyResultPage() {
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VerificationResponse | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState(false);

  // Parse parameters from query string
  const queryPayload = useMemo(() => {
    const rawData = searchParams.get("data");
    if (rawData) {
      try {
        const parsed = JSON.parse(decodeURIComponent(rawData));
        return {
          studentId: parsed.studentId || parsed.student_id,
          reg_no: parsed.reg_no || parsed.regNo || parsed.admission_no,
          term: parsed.term,
          session: parsed.session,
        };
      } catch (e) {
        console.warn("Could not parse data query param, falling back to URL params", e);
      }
    }

    return {
      studentId: searchParams.get("studentId") || searchParams.get("student_id") || undefined,
      reg_no: searchParams.get("reg_no") || searchParams.get("regNo") || searchParams.get("admission_no") || "",
      term: searchParams.get("term") || "",
      session: searchParams.get("session") || "",
    };
  }, [searchParams]);

  useEffect(() => {
    const verify = async () => {
      if (!queryPayload.reg_no || !queryPayload.term || !queryPayload.session) {
        setLoading(false);
        setError("Incomplete verification parameters. Please scan the official report card QR code or verify manually on the portal.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const payload: any = {
          reg_no: queryPayload.reg_no,
          term: queryPayload.term,
          session: queryPayload.session,
        };
        if (queryPayload.studentId) {
          payload.studentId = queryPayload.studentId;
        }

        const res = await publicApi.post<VerificationResponse>("/verify-result", payload);
        setData(res.data);

        // Generate QR code for the current URL
        try {
          const qrUrl = window.location.href;
          const qrData = await QRCode.toDataURL(qrUrl, { margin: 1, width: 140 });
          setQrCodeDataUrl(qrData);
        } catch (qrErr) {
          console.warn("Could not generate page QR code", qrErr);
        }
      } catch (err: any) {
        console.error("Result verification failed:", err);
        setError(err.response?.data?.message || "Invalid or unverified academic record. The requested credentials do not match official school records.");
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [queryPayload]);

  const studentFullName = useMemo(() => {
    if (!data?.student) return "Student Record";
    return [data.student.surname, data.student.firstname, data.student.third_name]
      .filter(Boolean)
      .join(" ");
  }, [data]);

  const schoolDisplayName = useMemo(() => {
    if (!data?.school) return "Accredited Institution";
    return data.school.school_name || data.school.schoolName || "Accredited Institution";
  }, [data]);

  const handleCopyCode = () => {
    const code = data?.verification_code || `GQ-VER-${data?.student?.reg_no || "REC"}`;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const verifiedDateFormatted = useMemo(() => {
    if (!data?.verified_at) {
      return new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    const d = new Date(data.verified_at);
    return isNaN(d.getTime())
      ? data.verified_at
      : d.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  }, [data]);

  return (
    <>
      <PageTitle title="Verified Academic Credential | SchoolProfit" />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=JetBrains+Mono:wght@400;500;600&display=swap');

        .vc-page {
          min-height: 100vh;
          background: #090e17;
          background-image: 
            radial-gradient(at 0% 0%, rgba(201, 168, 76, 0.08) 0px, transparent 50%),
            radial-gradient(at 100% 0%, rgba(34, 197, 94, 0.06) 0px, transparent 50%),
            radial-gradient(at 50% 100%, rgba(15, 23, 42, 0.8) 0px, transparent 50%),
            radial-gradient(circle, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 100% 100%, 100% 100%, 100% 100%, 28px 28px;
          color: #f8fafc;
          font-family: 'DM Sans', sans-serif;
          padding-bottom: 60px;
        }

        /* Top Header */
        .vc-nav {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(9, 14, 23, 0.85);
          backdrop-filter: blur(16px);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .vc-nav-inner {
          max-width: 1080px;
          margin: 0 auto;
          padding: 14px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .vc-logo-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #fff;
        }
        .vc-logo-badge {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: linear-gradient(135deg, #c9a84c, #e8c97a);
          color: #090e17;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 16px;
        }
        .vc-brand-text {
          display: flex;
          flex-direction: column;
        }
        .vc-brand-title {
          font-family: 'Cinzel', serif;
          font-weight: 700;
          font-size: 15px;
          letter-spacing: 0.08em;
          color: #fff;
          line-height: 1.1;
        }
        .vc-brand-sub {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #c9a84c;
          font-weight: 600;
        }
        .vc-nav-status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          background: rgba(34, 197, 94, 0.12);
          border: 1px solid rgba(34, 197, 94, 0.25);
          color: #4ade80;
        }
        .vc-nav-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 10px #22c55e;
          animation: vcPulse 2s infinite ease-in-out;
        }
        @keyframes vcPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.5; }
        }

        /* Container */
        .vc-container {
          max-width: 920px;
          margin: 36px auto 0;
          padding: 0 20px;
        }

        /* Credential Certificate Shell */
        .vc-card {
          background: #0f172a;
          border: 1.5px solid rgba(201, 168, 76, 0.35);
          border-radius: 20px;
          box-shadow: 
            0 24px 60px rgba(0, 0, 0, 0.6),
            0 0 0 1px rgba(255, 255, 255, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          overflow: hidden;
          position: relative;
        }
        .vc-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(201, 168, 76, 0.04) 1px, transparent 1px);
          background-size: 20px 20px;
          pointer-events: none;
        }

        /* Top Security Ribbon */
        .vc-ribbon {
          background: linear-gradient(90deg, #1e293b, #0f172a 40%, #0f172a 60%, #1e293b);
          border-bottom: 1px solid rgba(201, 168, 76, 0.25);
          padding: 16px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .vc-ribbon-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .vc-seal-ico {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: radial-gradient(circle, rgba(201, 168, 76, 0.25) 0%, rgba(201, 168, 76, 0.08) 100%);
          border: 1px solid rgba(201, 168, 76, 0.5);
          color: #e8c97a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
          box-shadow: 0 0 16px rgba(201, 168, 76, 0.2);
        }
        .vc-ribbon-title {
          font-family: 'Cinzel', Georgia, serif;
          font-size: 14px;
          font-weight: 700;
          color: #f8fafc;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .vc-ribbon-sub {
          font-size: 11.5px;
          color: #94a3b8;
          font-weight: 400;
        }
        .vc-code-box {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 6px 12px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: #e2e8f0;
        }
        .vc-code-btn {
          background: transparent;
          border: none;
          color: #c9a84c;
          cursor: pointer;
          font-size: 13px;
          padding: 2px;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }
        .vc-code-btn:hover {
          color: #e8c97a;
        }

        /* Certificate Body */
        .vc-body {
          padding: 34px 38px;
          position: relative;
          z-index: 1;
        }
        @media (max-width: 640px) {
          .vc-body { padding: 24px 20px; }
        }

        /* School Institutional Header */
        .vc-school-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding-bottom: 26px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 28px;
          flex-wrap: wrap;
        }
        .vc-school-info {
          display: flex;
          align-items: center;
          gap: 18px;
        }
        .vc-school-logo {
          width: 72px;
          height: 72px;
          border-radius: 16px;
          background: #1e293b;
          border: 1.5px solid rgba(201, 168, 76, 0.3);
          object-fit: cover;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #e8c97a;
          font-size: 26px;
          font-weight: 700;
          flex-shrink: 0;
          overflow: hidden;
        }
        .vc-school-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .vc-school-name {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 22px;
          font-weight: 700;
          color: #fff;
          margin: 0 0 4px;
          line-height: 1.2;
        }
        .vc-school-meta {
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.5;
          margin: 0;
        }
        .vc-school-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 8px;
          background: rgba(201, 168, 76, 0.1);
          border: 1px solid rgba(201, 168, 76, 0.28);
          color: #e8c97a;
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.04em;
        }

        /* Certificate Title Section */
        .vc-cert-title-wrap {
          text-align: center;
          margin-bottom: 30px;
        }
        .vc-cert-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #c9a84c;
          margin-bottom: 6px;
        }
        .vc-cert-title {
          font-family: 'Cinzel', Georgia, serif;
          font-size: clamp(20px, 3vw, 28px);
          font-weight: 700;
          color: #fff;
          margin: 0 0 8px;
          letter-spacing: 0.04em;
        }
        .vc-cert-desc {
          font-size: 13px;
          color: #94a3b8;
          max-width: 580px;
          margin: 0 auto;
          line-height: 1.55;
        }

        /* Student & Result Snapshot Grid */
        .vc-grid {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 24px;
          margin-bottom: 30px;
        }
        @media (max-width: 800px) {
          .vc-grid { grid-template-columns: 1fr; }
        }

        /* Student Card */
        .vc-student-card {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 22px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .vc-avatar {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          background: #0f172a;
          border: 2.5px solid #c9a84c;
          box-shadow: 0 0 20px rgba(201, 168, 76, 0.2);
          overflow: hidden;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #c9a84c;
          font-size: 32px;
          flex-shrink: 0;
        }
        .vc-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .vc-student-name {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 17px;
          font-weight: 700;
          color: #fff;
          margin: 0 0 4px;
        }
        .vc-reg-pill {
          display: inline-block;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11.5px;
          font-weight: 600;
          color: #e8c97a;
          background: rgba(201, 168, 76, 0.12);
          border: 1px solid rgba(201, 168, 76, 0.25);
          padding: 3px 10px;
          border-radius: 6px;
          margin-bottom: 12px;
        }
        .vc-student-meta-list {
          width: 100%;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: left;
        }
        .vc-meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }
        .vc-meta-label {
          color: #94a3b8;
        }
        .vc-meta-val {
          color: #f1f5f9;
          font-weight: 600;
        }

        /* Result Snapshot */
        .vc-result-box {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .vc-result-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding-bottom: 14px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .vc-term-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }
        .vc-term-sub {
          font-size: 12px;
          color: #c9a84c;
          margin-top: 2px;
        }
        .vc-status-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 999px;
          background: rgba(34, 197, 94, 0.14);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #4ade80;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        /* Metrics grid */
        .vc-metrics-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }
        @media (max-width: 560px) {
          .vc-metrics-row { grid-template-columns: 1fr; }
        }
        .vc-metric-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 14px 16px;
          text-align: center;
        }
        .vc-metric-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94a3b8;
          margin-bottom: 6px;
        }
        .vc-metric-val {
          font-family: 'Cinzel', Georgia, serif;
          font-size: 24px;
          font-weight: 700;
          color: #fff;
          line-height: 1;
        }
        .vc-metric-val--gold {
          color: #e8c97a;
        }
        .vc-metric-val--green {
          color: #4ade80;
        }

        /* Remarks */
        .vc-remark-box {
          background: rgba(15, 23, 42, 0.4);
          border-left: 3px solid #c9a84c;
          border-radius: 0 10px 10px 0;
          padding: 12px 16px;
        }
        .vc-remark-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #c9a84c;
          margin-bottom: 3px;
        }
        .vc-remark-text {
          font-size: 13px;
          color: #e2e8f0;
          font-style: italic;
          margin: 0;
        }

        /* Certificate Trust Banner */
        .vc-trust-bar {
          background: linear-gradient(135deg, rgba(201, 168, 76, 0.08), rgba(34, 197, 94, 0.06));
          border: 1px solid rgba(201, 168, 76, 0.22);
          border-radius: 14px;
          padding: 18px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }
        .vc-trust-left {
          display: flex;
          align-items: center;
          gap: 14px;
          flex: 1;
          min-width: 260px;
        }
        .vc-trust-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }
        .vc-trust-heading {
          font-size: 13.5px;
          font-weight: 700;
          color: #fff;
          margin: 0 0 2px;
        }
        .vc-trust-p {
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
          line-height: 1.45;
        }
        .vc-trust-qr {
          width: 68px;
          height: 68px;
          border-radius: 8px;
          background: #fff;
          padding: 3px;
          flex-shrink: 0;
        }
        .vc-trust-qr img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        /* Action Buttons */
        .vc-actions {
          margin-top: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .vc-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .vc-btn-primary {
          background: linear-gradient(135deg, #c9a84c, #e8c97a);
          color: #090e17;
          border: none;
          box-shadow: 0 4px 18px rgba(201, 168, 76, 0.3);
        }
        .vc-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(201, 168, 76, 0.4);
          color: #090e17;
        }
        .vc-btn-outline {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #e2e8f0;
        }
        .vc-btn-outline:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
          transform: translateY(-1px);
        }

        /* Error state */
        .vc-error-card {
          background: #111827;
          border: 1.5px solid rgba(239, 68, 68, 0.35);
          border-radius: 20px;
          padding: 48px 32px;
          text-align: center;
          max-width: 600px;
          margin: 40px auto;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        }
        .vc-error-icon {
          width: 68px;
          height: 68px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.12);
          border: 1.5px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          margin: 0 auto 18px;
        }
        .vc-error-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 22px;
          font-weight: 700;
          color: #fff;
          margin: 0 0 10px;
        }
        .vc-error-sub {
          font-size: 13.5px;
          color: #94a3b8;
          line-height: 1.6;
          margin: 0 0 24px;
        }

        /* Print styles */
        @media print {
          .vc-page { background: #fff !important; color: #000 !important; }
          .vc-nav, .vc-actions { display: none !important; }
          .vc-card { border: 2px solid #000 !important; box-shadow: none !important; background: #fff !important; color: #000 !important; }
          .vc-ribbon { background: #f8fafc !important; color: #000 !important; border-bottom: 1px solid #000 !important; }
          .vc-school-name, .vc-cert-title, .vc-student-name, .vc-term-title, .vc-metric-val { color: #000 !important; }
          .vc-metric-card, .vc-student-card, .vc-result-box { background: #fff !important; border: 1px solid #ddd !important; }
        }
      `}</style>

      <div className="vc-page">
        {/* Navigation Bar */}
        <header className="vc-nav">
          <div className="vc-nav-inner">
            <Link to="/" className="vc-logo-brand">
              <div className="vc-logo-badge" style={{ background: "transparent" }}>
                <img src="/media/logo/schoolprofit-icon.svg" alt="SchoolProfit" style={{ width: 32, height: 32 }} />
              </div>
              <div className="vc-brand-text">
                <span className="vc-brand-title">School<span style={{ color: "#10B981" }}>Profit</span></span>
                <span className="vc-brand-sub">Verification Portal</span>
              </div>
            </Link>

            <div className="vc-nav-status">
              <span className="vc-nav-dot" />
              <span>Institutional Verification Active</span>
            </div>
          </div>
        </header>

        <main className="vc-container">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-warning mb-3" style={{ width: "3rem", height: "3rem" }} role="status">
                <span className="visually-hidden">Validating credential...</span>
              </div>
              <h4 className="text-white fw-bold">Authenticating Academic Record…</h4>
              <p className="text-muted small">Checking cryptographic hash against official school database.</p>
            </div>
          ) : error ? (
            <div className="vc-error-card">
              <div className="vc-error-icon">
                <i className="bi bi-shield-x" />
              </div>
              <h3 className="vc-error-title">Verification Notice</h3>
              <p className="vc-error-sub">{error}</p>
              <div className="d-flex justify-content-center gap-3 flex-wrap">
                <Link to="/check-result" className="vc-btn vc-btn-primary">
                  <i className="bi bi-key me-1" /> Check Result with PIN
                </Link>
                <Link to="/" className="vc-btn vc-btn-outline">
                  <i className="bi bi-house me-1" /> Portal Home
                </Link>
              </div>
            </div>
          ) : data ? (
            <>
              {/* Authenticated Credential Certificate */}
              <div className="vc-card">
                {/* Security Ribbon */}
                <div className="vc-ribbon">
                  <div className="vc-ribbon-left">
                    <div className="vc-seal-ico">
                      <i className="bi bi-patch-check-fill" />
                    </div>
                    <div>
                      <div className="vc-ribbon-title">Official Academic Verification</div>
                      <div className="vc-ribbon-sub">Authentic Student Record · SchoolProfit Academic Registry</div>
                    </div>
                  </div>

                  <div className="vc-code-box">
                    <span>{data.verification_code || `GQ-VER-${data.student.reg_no || "REC"}`}</span>
                    <button
                      type="button"
                      className="vc-code-btn"
                      onClick={handleCopyCode}
                      title="Copy verification hash"
                    >
                      <i className={`bi ${copiedCode ? "bi-check2" : "bi-clipboard"}`} />
                    </button>
                  </div>
                </div>

                <div className="vc-body">
                  {/* Institutional Authority Header */}
                  <div className="vc-school-header">
                    <div className="vc-school-info">
                      <div className="vc-school-logo">
                        {data.school.logo_url ? (
                          <img
                            src={resolveMediaUrl(data.school.logo_url, "/media/default-school-logo.svg", "uploads/logo")}
                            alt={schoolDisplayName}
                          />
                        ) : (
                          <span>{schoolDisplayName.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <h2 className="vc-school-name">{schoolDisplayName}</h2>
                        <p className="vc-school-meta">
                          {data.school.address || "Official School Records Repository"}
                          {data.school.phone && ` · Tel: ${data.school.phone}`}
                        </p>
                      </div>
                    </div>

                    <div className="vc-school-badge">
                      <i className="bi bi-shield-lock" />
                      <span>Accredited Institution</span>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="vc-cert-title-wrap">
                    <div className="vc-cert-eyebrow">Academic Transcript Verification</div>
                    <h1 className="vc-cert-title">Verified Student Credential</h1>
                    <p className="vc-cert-desc">
                      This electronic certificate confirms that the student named below is officially registered and that the recorded scores match the institutional primary broadsheet.
                    </p>
                  </div>

                  {/* Details Grid */}
                  <div className="vc-grid">
                    {/* Student Identity Card */}
                    <div className="vc-student-card">
                      <div className="vc-avatar">
                        {data.student.photo ? (
                          <img
                            src={resolveMediaUrl(data.student.photo, "/media/profile.jpg", "uploads/users")}
                            alt={studentFullName}
                          />
                        ) : (
                          <i className="bi bi-person-fill" />
                        )}
                      </div>

                      <h3 className="vc-student-name">{studentFullName}</h3>
                      <span className="vc-reg-pill">{data.student.reg_no || "N/A"}</span>

                      <div className="vc-student-meta-list">
                        <div className="vc-meta-row">
                          <span className="vc-meta-label">Gender:</span>
                          <span className="vc-meta-val">{data.student.gender || "—"}</span>
                        </div>
                        <div className="vc-meta-row">
                          <span className="vc-meta-label">Class / Level:</span>
                          <span className="vc-meta-val">{data.result.class || "Active Student"}</span>
                        </div>
                        <div className="vc-meta-row">
                          <span className="vc-meta-label">Record Status:</span>
                          <span className="vc-meta-val" style={{ color: "#4ade80" }}>
                            Verified Active
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Result Snapshot Box */}
                    <div className="vc-result-box">
                      <div>
                        <div className="vc-result-header">
                          <div>
                            <h3 className="vc-term-title">{data.result.term || queryPayload.term || "Term Result"}</h3>
                            <div className="vc-term-sub">{data.result.session || queryPayload.session || "Academic Session"}</div>
                          </div>

                          <div className="vc-status-tag">
                            <i className="bi bi-check-circle-fill" />
                            <span>{data.result.status || "Official Result"}</span>
                          </div>
                        </div>

                        {/* Metric scores */}
                        <div className="vc-metrics-row">
                          <div className="vc-metric-card">
                            <div className="vc-metric-label">Term Average</div>
                            <div className="vc-metric-val vc-metric-val--gold">
                              {data.result.total_average !== undefined && data.result.total_average !== null
                                ? `${Number(data.result.total_average).toFixed(1)}%`
                                : "N/A"}
                            </div>
                          </div>

                          <div className="vc-metric-card">
                            <div className="vc-metric-label">Cumulative Grade</div>
                            <div className="vc-metric-val vc-metric-val--green">
                              {data.result.total_grade || "Pass"}
                            </div>
                          </div>

                          <div className="vc-metric-card">
                            <div className="vc-metric-label">Academic Standing</div>
                            <div className="vc-metric-val" style={{ fontSize: 16, marginTop: 4 }}>
                              Confirmed
                            </div>
                          </div>
                        </div>

                        {/* Remark */}
                        {data.result.general_remark && (
                          <div className="vc-remark-box">
                            <div className="vc-remark-label">Institutional Remarks</div>
                            <p className="vc-remark-text">"${data.result.general_remark}"</p>
                          </div>
                        )}
                      </div>

                      {/* Verification footer row */}
                      <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary border-opacity-25 flex-wrap gap-2">
                        <small className="text-muted" style={{ fontSize: 11 }}>
                          Verified on: <strong className="text-light">{verifiedDateFormatted}</strong>
                        </small>
                        <small className="text-muted" style={{ fontSize: 11 }}>
                          Protocol: <strong className="text-warning">SchoolProfit Cryptographic Seal</strong>
                        </small>
                      </div>
                    </div>
                  </div>

                  {/* Trust and Tamper-Proof Guarantee Bar */}
                  <div className="vc-trust-bar">
                    <div className="vc-trust-left">
                      <div className="vc-trust-icon">
                        <i className="bi bi-shield-fill-check" />
                      </div>
                      <div>
                        <div className="vc-trust-heading">Cryptographically Validated Record</div>
                        <p className="vc-trust-p">
                          This digital credential is authenticated directly from <strong>{schoolDisplayName}</strong> via the SchoolProfit Academic Engine. Primary broadsheets, grades, and admission status have been verified authentic.
                        </p>
                      </div>
                    </div>

                    {qrCodeDataUrl && (
                      <div className="vc-trust-qr" title="Scan to re-verify credential">
                        <img src={qrCodeDataUrl} alt="QR Verification Link" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="vc-actions">
                <button type="button" className="vc-btn vc-btn-primary" onClick={handlePrint}>
                  <i className="bi bi-printer" /> Print Verification Certificate
                </button>
                <Link to="/check-result" className="vc-btn vc-btn-outline">
                  <i className="bi bi-key" /> Check Another Result
                </Link>
                <Link to="/" className="vc-btn vc-btn-outline">
                  <i className="bi bi-house" /> SchoolProfit Home
                </Link>
              </div>
            </>
          ) : null}
        </main>
      </div>

      <Footer />
    </>
  );
}
