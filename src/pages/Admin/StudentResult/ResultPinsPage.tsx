// src/pages/Results/ResultPinsPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type Term = { id: number; name: string };
type Session = { id: number; name: string };

type ResultPinRow = {
  id: number;
  school_id: number;
  pin: string;
  term: string;
  session: string;
  max_uses: number;
  uses?: number | null;
  expires_at?: string | null;
  created_at?: string;
};

type SaveErrors = Record<string, string[] | string>;

type SchoolBrand = {
  name: string;
  logoUrl?: string | null;
};

const fmtDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const toInputDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getInitials = (name?: string) => {
  if (!name) return "SC";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "SC";
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function safeAssetUrl(url?: string | null) {
  if (!url) return null;

  // If backend returns absolute URL, keep it but encode spaces/specials safely.
  // This preserves "http://localhost:8000/uploads/logo/.. WhatsApp Image .. .jpeg"
  try {
    // encodeURI keeps : / ? & etc intact but encodes spaces to %20
    return encodeURI(url);
  } catch {
    return url;
  }
}

function makeApiAbsoluteIfNeeded(url?: string | null) {
  if (!url) return null;

  // If it already looks absolute, leave it.
  if (/^https?:\/\//i.test(url)) return safeAssetUrl(url);

  // If it is stored like "uploads/logo/xxx.jpg", prefix with your API base.
  // Adjust if your API base differs.
  const base = (authApi.defaults.baseURL || "").replace(/\/+$/, "");
  const path = url.replace(/^\/+/, "");
  return safeAssetUrl(`${base}/${path}`);
}

/**
 * Your backend returns (example):
 * {
 *   app_settings: {...},
 *   school_settings: { schoolName: "...", logo_url: "http://localhost:8000/uploads/logo/..." }
 * }
 */
async function fetchSchoolBrand(): Promise<SchoolBrand> {
  const fallback: SchoolBrand = { name: "Your School", logoUrl: null };

  try {
    const res = await authApi.get("/get-settings");
    const d = res?.data;

    const name =
      d?.school_settings?.schoolName ||
      d?.school_settings?.school_name ||
      d?.school_settings?.name ||
      fallback.name;

    const rawLogo =
      d?.school_settings?.logo_url ||
      d?.school_settings?.logoUrl ||
      d?.school_settings?.logo ||
      null;

    // normalize (handles spaces + relative paths)
    const logoUrl = makeApiAbsoluteIfNeeded(rawLogo);

    return { name, logoUrl };
  } catch {
    return fallback;
  }
}

/** Card modal payload */
type PinCardPayload = {
  pin: string;
  term: string;
  session: string;
  max_uses: number;
  uses?: number | null;
  expires_at?: string | null;
  created_at?: string | null;
};

export default function ResultPinsPage() {
  const { showSuccess, showError } = useToast();

  // ===== Sidebar State =====
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ===== Loading State =====
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ===== Brand =====
  const [brand, setBrand] = useState<SchoolBrand>({ name: "Your School", logoUrl: null });

  // ===== Data =====
  const [pins, setPins] = useState<ResultPinRow[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  // ===== Form State =====
  const [term, setTerm] = useState<string>("");
  const [session, setSession] = useState<string>("");
  const [maxUses, setMaxUses] = useState<number>(1);
  const [expiresAt, setExpiresAt] = useState<string>(""); // YYYY-MM-DD
  const [quantity, setQuantity] = useState<number>(1);

  // ===== Result State =====
  const [generatedPins, setGeneratedPins] = useState<string[]>([]);

  // ===== Card Modal =====
  const [cardOpen, setCardOpen] = useState(false);
  const [cardPin, setCardPin] = useState<PinCardPayload | null>(null);

  // ===== Card export ref =====
  const cardPrintRef = useRef<HTMLDivElement | null>(null);

  const parseBackendError = (err: any) => {
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "Something went wrong. Please try again.";
    const errors: SaveErrors | undefined = err?.response?.data?.errors;
    return { msg, errors };
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess("Copied to clipboard.");
    } catch {
      showError("Copy failed. Please copy manually.");
    }
  };

  const openPinCard = (payload: PinCardPayload) => {
    setCardPin(payload);
    setCardOpen(true);
  };

  const closePinCard = () => {
    setCardOpen(false);
    setCardPin(null);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pinsRes, termsRes, sessionsRes, brandRes] = await Promise.all([
        authApi.get<ResultPinRow[]>("/all-result-pins"),
        authApi.get<Term[]>("/get-terms"),
        authApi.get<Session[]>("/get-academic-sessions"),
        fetchSchoolBrand(),
      ]);

      setPins(Array.isArray(pinsRes.data) ? pinsRes.data : []);
      setTerms(Array.isArray(termsRes.data) ? termsRes.data : []);
      setSessions(Array.isArray(sessionsRes.data) ? sessionsRes.data : []);
      setBrand(brandRes);

      // smart defaults
      const firstTermName = termsRes.data?.[0]?.name;
      const firstSessionName = sessionsRes.data?.[0]?.name;

      setTerm((p) => p || firstTermName || "");
      setSession((p) => p || firstSessionName || "");
    } catch (err: any) {
      console.error(err);
      showError("Failed to load Result PIN data. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshPins = async () => {
    setRefreshing(true);
    try {
      const res = await authApi.get<ResultPinRow[]>("/all-result-pins");
      setPins(Array.isArray(res.data) ? res.data : []);
      showSuccess("PIN list refreshed.");
    } catch (err: any) {
      console.error(err);
      showError("Failed to refresh PIN list.");
    } finally {
      setRefreshing(false);
    }
  };

  const createPins = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setGeneratedPins([]);

    try {
      const payload = {
        term,
        session,
        max_uses: Number(maxUses),
        expires_at: expiresAt ? expiresAt : null,
        quantity: Number(quantity),
      };

      const res = await authApi.post("/result-pins", payload);

      showSuccess(res?.data?.message || "PIN(s) generated successfully.");
      const pinsFromApi: string[] = Array.isArray(res?.data?.pins) ? res.data.pins : [];
      setGeneratedPins(pinsFromApi);

      await refreshPins();
    } catch (err: any) {
      console.error(err);
      const { msg, errors } = parseBackendError(err);

      if (errors && typeof errors === "object") {
        const firstKey = Object.keys(errors)[0];
        const firstVal = (errors as any)[firstKey];
        const firstMsg = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
        showError(firstMsg || msg);
      } else {
        showError(msg);
      }
    } finally {
      setCreating(false);
    }
  };

  const filteredPins = useMemo(() => pins, [pins]);

  const downloadPinsTxt = () => {
    if (!generatedPins.length) return;
    const content = generatedPins.join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `result-pins_${term}_${session}.txt`.replace(/\s+/g, "_");
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCardPdf = async () => {
    if (!cardPrintRef.current || !cardPin) return;

    try {
      // If your logo is hosted on a different origin, ensure CORS allows it.
      const canvas = await html2canvas(cardPrintRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      const margin = 28;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;

      const imgW = canvas.width;
      const imgH = canvas.height;

      const ratio = Math.min(maxW / imgW, maxH / imgH);
      const renderW = imgW * ratio;
      const renderH = imgH * ratio;

      const x = (pageW - renderW) / 2;
      const y = (pageH - renderH) / 2;

      pdf.addImage(imgData, "PNG", x, y, renderW, renderH);

      const safeSchool = (brand?.name || "school").replace(/[^\w]+/g, "_");
      const safeTerm = (cardPin.term || "term").replace(/[^\w]+/g, "_");
      const safeSession = (cardPin.session || "session").replace(/[^\w]+/g, "_");

      pdf.save(`WAEC_style_PIN_${safeSchool}_${safeTerm}_${safeSession}_${cardPin.pin}.pdf`);
      showSuccess("Card downloaded as PDF.");
    } catch (e) {
      console.error(e);
      showError("Failed to download card. If logo is missing, enable CORS on the backend for images.");
    }
  };

  return (
    <>
      <style>{`
        /* ===== Result Pins (Modern SaaS template) ===== */
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .rp-main{
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: 24px 28px 0;
        }

        .rp-hero{
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 18px;
          padding: 32px 36px;
          position: relative;
          overflow: hidden;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
        }
        .rp-glow{ position:absolute; top:-60px; right:-60px; width:320px; height:320px; border-radius:50%;
          background: radial-gradient(circle, rgba(217,119,6,0.15) 0%, transparent 65%); pointer-events:none; }
        .rp-glow2{ position:absolute; bottom:-50px; left:25%; width:220px; height:220px; border-radius:50%;
          background: radial-gradient(circle, rgba(37,99,235,0.10) 0%, transparent 70%); pointer-events:none; }

        .rp-hero-inner{ position:relative; z-index:1; display:flex; align-items:flex-start; justify-content:space-between; gap:18px; flex-wrap:wrap; }

        .rp-badge{
          display:inline-flex; align-items:center; gap:7px;
          font-size:11.5px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase;
          color:#FBBF24;
          background: rgba(217,119,6,0.20);
          border:1px solid rgba(217,119,6,0.35);
          border-radius:100px;
          padding: 4px 12px;
          margin-bottom: 12px;
        }
        .rp-dot{ width:6px; height:6px; border-radius:50%; background:#10B981; animation: rpPulse 2s ease infinite; }
        @keyframes rpPulse { 0%,100%{ opacity:1; transform:scale(1);} 50%{ opacity:.4; transform:scale(1.5);} }

        .rp-title{
          font-size: 26px;
          font-weight: 800;
          color: #fff;
          margin: 0 0 8px;
          line-height:1.1;
        }
        .rp-title em{ font-style: normal; color:#FBBF24; }
        .rp-sub{
          color:#CBD5E1; font-size: 13.5px; line-height:1.6;
          margin:0;
          max-width: 620px;
        }

        .rp-hero-card{
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(8px);
          border-radius: 14px;
          padding: 18px 20px;
          min-width: 240px;
        }
        .rp-mini-row{ display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .rp-mini-label{ font-size:12px; color:#CBD5E1; font-weight:400; }
        .rp-mini-val{ font-size:18px; color:#FBBF24; font-weight:800; }

        .rp-grid{
          display:grid;
          grid-template-columns: 420px 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }
        @media (max-width: 991.98px){
          .rp-grid{ grid-template-columns: 1fr; }
        }

        .rp-panel{
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(15,39,68,0.03);
        }
        .rp-panel-head{
          display:flex; align-items:center; justify-content:space-between;
          padding: 18px 20px;
          border-bottom: 1px solid #E2E8F0;
          gap: 10px;
          flex-wrap: wrap;
        }
        .rp-panel-title{
          font-size:16px; font-weight:800; color:#0F2744; margin:0;
        }
        .rp-panel-sub{ font-size:12px; color:#64748B; margin:0; }

        .rp-icon{
          width: 38px; height: 38px; border-radius: 10px;
          display:flex; align-items:center; justify-content:center;
          background: rgba(217,119,6,0.12);
          color: #D97706;
          flex-shrink:0;
        }

        .rp-body{ padding: 20px; }

        .rp-btn{
          display:inline-flex; align-items:center; gap:8px;
          padding: 9px 16px;
          font-size: 13px;
          font-weight: 700;
          border-radius: 10px;
          border: 1px solid #E2E8F0;
          background: #F1F5F9;
          color: #0F2744;
          cursor: pointer;
          transition: all .2s ease;
          text-decoration:none;
          user-select:none;
          white-space:nowrap;
        }
        .rp-btn:hover{ background:#E2E8F0; transform: translateY(-1px); }
        .rp-btn:disabled{ opacity:.55; cursor:not-allowed; transform:none; }

        .rp-btn-primary{
          background:#0F2744; color:#fff; border: none;
        }
        .rp-btn-primary:hover{ background:#1E3A8A; color:#fff; }
        .rp-btn-gold{
          background:#D97706; color:#FFFFFF; border: none;
        }
        .rp-btn-gold:hover{ background:#B45309; color:#FFFFFF; }

        .rp-field label{ font-size:12px; font-weight:700; color:#0F2744; margin-bottom:6px; }
        .rp-field .form-control, .rp-field .form-select{
          border-radius: 10px;
          border: 1px solid #E2E8F0;
          padding: 10px 14px;
          font-size: 13px;
          color: #0F2744;
          font-weight: 600;
        }
        .rp-field .form-control:focus, .rp-field .form-select:focus{
          border-color: #D97706;
          box-shadow: 0 0 0 3px rgba(217,119,6,0.12);
        }
        .rp-help{ font-size: 12px; color:#64748B; margin-top: 6px; }

        .rp-table{
          width:100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .rp-table th{
          padding: 12px 16px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color:#64748B;
          background:#F8FAFC;
          border-bottom: 1px solid #E2E8F0;
          text-align:left;
          white-space:nowrap;
        }
        .rp-table td{
          padding: 12px 14px;
          font-size: 13.5px;
          color:#4a4a5a;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          vertical-align: middle;
        }
        .rp-mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        .rp-pill{
          display:inline-flex; align-items:center; gap:6px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          border: 1px solid rgba(0,0,0,0.06);
          background: #f8fafc;
          color:#1a1a2e;
        }
        .rp-actions{ display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap; }

        .rp-empty{
          padding: 40px 16px;
          text-align: center;
          color: #b5a090;
          font-size: 13.5px;
        }

        /* ===== PIN Card Modal ===== */
        .rp-modal-backdrop{
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.55);
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 18px;
          z-index: 2000;
        }
        .rp-modal{
          width: min(760px, 100%);
          background: #fff;
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.08);
          overflow: hidden;
          box-shadow: 0 18px 60px rgba(0,0,0,0.25);
        }
        .rp-modal-head{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 12px;
          padding: 14px 16px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          background: #faf8f5;
        }
        .rp-modal-title{
          font-family:"Lora", serif;
          font-weight:700;
          color:#1a1a2e;
          margin:0;
          font-size: 15px;
        }
        .rp-x{
          width: 36px; height: 36px;
          border-radius: 10px;
          border: 1px solid rgba(0,0,0,0.10);
          background: #fff;
          cursor:pointer;
          display:flex; align-items:center; justify-content:center;
        }

        .rp-card{
          padding: 18px;
          background: #f5f1eb;
        }

        /* ===== WAEC-like scratch card styling (inspired) ===== */
        .rp-card-inner{
          border-radius: 16px;
          overflow:hidden;
          position:relative;
          padding: 18px;
          color:#fff;
        }

        .rp-waec{
          background: linear-gradient(135deg, #0b3b2e 0%, #0f172a 55%, #0b3b2e 100%);
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: 0 16px 50px rgba(0,0,0,0.24);
        }

        .rp-waec::before{
          content:"";
          position:absolute; inset:0;
          background-image:
            radial-gradient(circle at 20% 30%, rgba(201,168,76,0.14) 0%, transparent 55%),
            radial-gradient(circle at 80% 60%, rgba(201,168,76,0.10) 0%, transparent 60%),
            repeating-linear-gradient(45deg,
              rgba(255,255,255,0.04) 0px,
              rgba(255,255,255,0.04) 2px,
              transparent 2px,
              transparent 8px
            );
          mix-blend-mode: overlay;
          opacity: .75;
          pointer-events:none;
        }

        .rp-card-top{
          position:relative;
          z-index:1;
          display:flex; align-items:center; justify-content:space-between; gap: 12px; flex-wrap:wrap;
          padding-bottom: 10px;
          border-bottom: 1px dashed rgba(232,201,122,0.35);
          margin-bottom: 14px;
        }

        .rp-school{
          display:flex; align-items:center; gap: 10px; min-width: 240px;
        }
        .rp-logo{
          width: 46px; height: 46px;
          border-radius: 14px;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.16);
          display:flex; align-items:center; justify-content:center;
          overflow:hidden;
          flex-shrink:0;
        }
        .rp-logo img{ width:100%; height:100%; object-fit: cover; }
        .rp-school-name{
          font-weight: 700;
          font-family: "Lora", serif;
          line-height: 1.1;
          margin:0;
          font-size: 16px;
        }
        .rp-card-meta{
          color: rgba(255,255,255,0.65);
          font-size: 12px;
          font-weight: 300;
          margin: 2px 0 0;
        }

        .rp-card-badge{
          display:inline-flex; align-items:center; gap:6px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(232,201,122,0.14);
          border: 1px solid rgba(232,201,122,0.28);
          color: #ffd98a;
          font-size: 11px;
          letter-spacing: .10em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .rp-pin-box{
          position:relative; z-index:1;
          margin-top: 6px;
          background: rgba(0,0,0,0.22);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          padding: 14px;
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .rp-pin-label{
          font-size: 11px;
          color: rgba(255,255,255,0.70);
          letter-spacing: .12em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .rp-pin{
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 0.18em;
          margin: 0;
          color: #fff;
          user-select: text;
        }
        .rp-pin-sub{
          font-size: 12px;
          color: rgba(255,255,255,0.70);
          font-weight: 300;
          margin-top: 6px;
        }

        .rp-scratch{
          margin-top: 10px;
          position: relative;
          z-index: 1;
          background: linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06));
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 14px;
          padding: 12px 14px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 12px;
          flex-wrap:wrap;
        }
        .rp-scratch-title{
          font-size: 11px;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.78);
        }
        .rp-scratch-sub{
          font-size: 12px;
          color: rgba(232,201,122,0.92);
          font-weight: 600;
          margin-top: 2px;
        }

        .rp-card-btns{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }

        .rp-card-btn{
          display:inline-flex; align-items:center; gap:7px;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.08);
          color:#fff;
          cursor:pointer;
          transition: transform .2s, background .2s;
          user-select:none;
          white-space: nowrap;
        }
        .rp-card-btn:hover{ background: rgba(255,255,255,0.12); transform: translateY(-1px); }

        .rp-card-btn--gold{
          background: #c9a84c;
          color: #0f172a;
          border: none;
        }
        .rp-card-btn--gold:hover{ background: #e8c97a; }

        /* Make modal footer buttons consistent */
        .rp-modal-footer{
          margin-top: 12px;
          display:flex;
          justify-content: space-between;
          align-items:center;
          gap: 10px;
          flex-wrap: wrap;
        }

        @media (max-width: 575.98px){
          .rp-main{ padding: 18px 14px 0; }
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Generate PINs" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main rp-main">
            {loading && <Loader message="Loading result PINs..." />}

            {/* ===== Hero ===== */}
            <div className="rp-hero">
              <div className="rp-glow" aria-hidden="true" />
              <div className="rp-glow2" aria-hidden="true" />

              <div className="rp-hero-inner">
                <div>
                  <div className="rp-badge">
                    <span className="rp-dot" />
                    Result PINs — {brand?.name || "School"}
                  </div>

                  <h1 className="rp-title">
                    {getGreeting()}, <em>Admin.</em>
                  </h1>

                  <p className="rp-sub">
                    Generate secure result access PINs by <b>Term</b> and <b>Session</b>, set usage limits, and
                    export a WAEC-style PIN card as PDF.
                  </p>
                </div>

                <div className="rp-hero-card d-none d-md-block">
                  <div className="rp-mini-row">
                    <span className="rp-mini-label">Current PINs</span>
                    <span className="rp-mini-val">{pins.length}</span>
                  </div>
                  <div style={{ height: 10 }} />
                  <div className="rp-mini-row">
                    <span className="rp-mini-label">Default max uses</span>
                    <span className="rp-mini-val">{maxUses}</span>
                  </div>
                  <div style={{ height: 12 }} />
                  <button
                    type="button"
                    className="rp-btn rp-btn-gold"
                    onClick={refreshPins}
                    disabled={refreshing || loading}
                    title="Refresh list"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      <path
                        d="M12 3v4h-4"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {refreshing ? "Refreshing…" : "Refresh"}
                  </button>
                </div>
              </div>
            </div>

            {/* ===== Main Grid ===== */}
            <div className="rp-grid">
              {/* ===== Create PINs ===== */}
              <div className="rp-panel">
                <div className="rp-panel-head">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="rp-icon" style={{ ["--pi" as any]: "#fef3c7", ["--pc" as any]: "#b45309" }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M8 1.8a3.2 3.2 0 013.2 3.2v1.4h.8a2.2 2.2 0 012.2 2.2v3.8a2.2 2.2 0 01-2.2 2.2H4a2.2 2.2 0 01-2.2-2.2V8.6A2.2 2.2 0 014 6.4h.8V5A3.2 3.2 0 018 1.8Z"
                          stroke="currentColor"
                          strokeWidth="1.25"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M6.2 6.4V5a1.8 1.8 0 113.6 0v1.4"
                          stroke="currentColor"
                          strokeWidth="1.25"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="rp-panel-title">Generate PINs</p>
                      <p className="rp-panel-sub">Choose Term & Session, set Max Uses, optional Expiry</p>
                    </div>
                  </div>
                </div>

                <div className="rp-body">
                  <form onSubmit={createPins}>
                    <div className="rp-field mb-3">
                      <label className="form-label">Term</label>
                      <select className="form-select" value={term} onChange={(e) => setTerm(e.target.value)} required>
                        <option value="" disabled>
                          Select term
                        </option>
                        {terms.map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rp-field mb-3">
                      <label className="form-label">Academic Session</label>
                      <select
                        className="form-select"
                        value={session}
                        onChange={(e) => setSession(e.target.value)}
                        required
                      >
                        <option value="" disabled>
                          Select session
                        </option>
                        {sessions.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <div className="rp-help">Backend returns only current session(s) (is_current = 1).</div>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6 rp-field">
                        <label className="form-label">Max Uses</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          className="form-control"
                          value={maxUses}
                          onChange={(e) => setMaxUses(Number(e.target.value))}
                          required
                        />
                        <div className="rp-help">Allowed range: 1–10</div>
                      </div>

                      <div className="col-md-6 rp-field">
                        <label className="form-label">Quantity</label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          className="form-control"
                          value={quantity}
                          onChange={(e) => setQuantity(Number(e.target.value))}
                          required
                        />
                        <div className="rp-help">Max 100 at a time</div>
                      </div>
                    </div>

                    <div className="rp-field mt-3">
                      <label className="form-label">Expiry Date (optional)</label>
                      <input
                        type="date"
                        className="form-control"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                      />
                      <div className="rp-help">
                        Must be a future date (backend validates <code>after:today</code>).
                      </div>
                    </div>

                    <div className="d-flex gap-2 mt-4 flex-wrap">
                      <button type="submit" className="rp-btn rp-btn-primary" disabled={creating || loading}>
                        {creating ? (
                          <>
                            <span className="spinner-border spinner-border-sm" />
                            Generating…
                          </>
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                              <path
                                d="M6.2 7.2a2.6 2.6 0 115.2 0v2.1"
                                stroke="currentColor"
                                strokeWidth="1.4"
                                strokeLinecap="round"
                              />
                              <path
                                d="M3.2 9.3h9.6a1.8 1.8 0 011.8 1.8v1.9a1.8 1.8 0 01-1.8 1.8H3.2a1.8 1.8 0 01-1.8-1.8v-1.9a1.8 1.8 0 011.8-1.8Z"
                                stroke="currentColor"
                                strokeWidth="1.3"
                                strokeLinejoin="round"
                              />
                              <circle cx="8" cy="12" r="1" fill="currentColor" />
                            </svg>
                            Generate PINs
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className="rp-btn"
                        disabled={creating || loading}
                        onClick={() => {
                          setGeneratedPins([]);
                          setMaxUses(1);
                          setQuantity(1);
                          setExpiresAt("");
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M3 4h10M6 4V2.8h4V4M5 6v7m3-7v7m3-7v7M4.5 4l.8 10.2A1.2 1.2 0 006.5 15h3a1.2 1.2 0 001.2-1.1L11.5 4"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                          />
                        </svg>
                        Clear
                      </button>

                      <button type="button" className="rp-btn rp-btn-gold" onClick={refreshPins} disabled={refreshing || loading}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          <path
                            d="M12 3v4h-4"
                            stroke="currentColor"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Refresh list
                      </button>
                    </div>

                    <div className="mt-3" style={{ fontSize: 12.5, color: "#9a8a7a" }}>
                      <span className="rp-pill">
                        <b style={{ color: "#1a1a2e" }}>Note:</b> Old pins are deleted automatically if session changes (backend logic).
                      </span>
                    </div>
                  </form>

                  {/* Newly Generated */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div>
                        <div className="rp-panel-title" style={{ fontSize: 14 }}>
                          Newly Generated PINs
                        </div>
                        <div className="rp-panel-sub">Copy, download TXT, or open a WAEC-style card.</div>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="rp-btn"
                          disabled={!generatedPins.length}
                          onClick={() => copyToClipboard(generatedPins.join("\n"))}
                          title="Copy all"
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.2" />
                            <rect x="2" y="2" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.2" opacity=".6" />
                          </svg>
                          Copy all
                        </button>

                        <button type="button" className="rp-btn" disabled={!generatedPins.length} onClick={downloadPinsTxt} title="Download .txt">
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M8 2v7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            <path d="M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M3 12v2a1 1 0 001 1h8a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                          </svg>
                          TXT
                        </button>
                      </div>
                    </div>

                    {!generatedPins.length ? (
                      <div className="rp-empty" style={{ padding: "18px 12px" }}>
                        No newly generated PINs yet. Generate above to display them here.
                      </div>
                    ) : (
                      <div style={{ marginTop: 10 }}>
                        {generatedPins.map((p) => (
                          <div
                            key={p}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                              padding: "10px 12px",
                              border: "1px solid rgba(0,0,0,0.06)",
                              borderRadius: 12,
                              background: "#faf8f5",
                              marginBottom: 8,
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div className="rp-mono" style={{ fontWeight: 800, letterSpacing: ".08em", color: "#1a1a2e" }}>
                                {p}
                              </div>
                              <div style={{ fontSize: 12, color: "#9a8a7a", marginTop: 2 }}>
                                {term} · {session} · Max uses {maxUses}
                              </div>
                            </div>

                            <div className="rp-actions">
                              <button type="button" className="rp-btn" onClick={() => copyToClipboard(p)}>
                                Copy
                              </button>
                              <button
                                type="button"
                                className="rp-btn rp-btn-gold"
                                onClick={() =>
                                  openPinCard({
                                    pin: p,
                                    term,
                                    session,
                                    max_uses: maxUses,
                                    uses: 0,
                                    expires_at: expiresAt ? expiresAt : null,
                                    created_at: null,
                                  })
                                }
                              >
                                View card
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ===== All PINs List ===== */}
              <div className="rp-panel">
                <div className="rp-panel-head">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="rp-icon" style={{ ["--pi" as any]: "#dbeafe", ["--pc" as any]: "#1e40af" }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 4h10M3 8h10M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="rp-panel-title">All Result PINs</p>
                      <p className="rp-panel-sub">Includes Term & Session each PIN was created for</p>
                    </div>
                  </div>

                  <button type="button" className="rp-btn" onClick={refreshPins} disabled={refreshing || loading}>
                    {refreshing ? (
                      <>
                        <span className="spinner-border spinner-border-sm" />
                        Refreshing…
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          <path
                            d="M12 3v4h-4"
                            stroke="currentColor"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Refresh
                      </>
                    )}
                  </button>
                </div>

                <div style={{ overflowX: "auto" }}>
                  {filteredPins.length === 0 ? (
                    <div className="rp-empty">No PINs found for this school yet. Generate a batch to begin.</div>
                  ) : (
                    <table className="rp-table">
                      <thead>
                        <tr>
                          <th>PIN</th>
                          <th>Term</th>
                          <th>Session</th>
                          <th>Uses</th>
                          <th>Expires</th>
                          <th>Created</th>
                          <th style={{ textAlign: "right" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPins.map((r) => {
                          const usesNow = r.uses ?? 0;
                          return (
                            <tr key={r.id}>
                              <td className="rp-mono" style={{ fontWeight: 800, letterSpacing: ".06em" }}>
                                {r.pin}
                              </td>
                              <td>{r.term}</td>
                              <td>{r.session}</td>
                              <td>
                                <span className="rp-pill">
                                  {usesNow}/{r.max_uses}
                                </span>
                              </td>
                              <td>{r.expires_at ? toInputDate(r.expires_at) : "—"}</td>
                              <td>{fmtDateTime(r.created_at)}</td>
                              <td>
                                <div className="rp-actions">
                                  <button type="button" className="rp-btn" onClick={() => copyToClipboard(r.pin)}>
                                    Copy
                                  </button>
                                  <button
                                    type="button"
                                    className="rp-btn rp-btn-gold"
                                    onClick={() =>
                                      openPinCard({
                                        pin: r.pin,
                                        term: r.term,
                                        session: r.session,
                                        max_uses: r.max_uses,
                                        uses: r.uses ?? 0,
                                        expires_at: r.expires_at ?? null,
                                        created_at: r.created_at ?? null,
                                      })
                                    }
                                  >
                                    View card
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="rp-body" style={{ paddingTop: 12 }}>
                  <div style={{ fontSize: 12.5, color: "#9a8a7a" }}>
                    <b style={{ color: "#1a1a2e" }}>Backend rules:</b> Quantity 1–100 · Max uses 1–10 · Expiry must be after today · Term & Session stored as strings.
                  </div>
                </div>
              </div>
            </div>

            <Footer />
          </main>
        </div>
      </div>

      {/* ===== PIN CARD MODAL ===== */}
      {cardOpen && cardPin && (
        <div
          className="rp-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) closePinCard();
          }}
        >
          <div className="rp-modal">
            <div className="rp-modal-head">
              <p className="rp-modal-title">Result PIN Card</p>
              <button className="rp-x" onClick={closePinCard} aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3l8 8M11 3L3 11" stroke="#1a1a2e" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="rp-card">
              {/* The REF is attached here so PDF export captures ONLY the card */}
              <div className="rp-card-inner rp-waec" ref={cardPrintRef}>
                <div className="rp-card-top">
                  <div className="rp-school">
                    <div className="rp-logo" aria-label="School logo">
                      {brand.logoUrl ? (
                        <img
                          src={brand.logoUrl}
                          alt={`${brand.name} logo`}
                          onError={(e) => {
                            // fallback to initials if image fails
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : null}

                      {/* Fallback initials when logo missing or failed */}
                      {(!brand.logoUrl) && (
                        <span style={{ fontWeight: 900, color: "#ffd98a" }}>{getInitials(brand.name)}</span>
                      )}
                    </div>
                    <div>
                      <p className="rp-school-name">{brand.name}</p>
                      <p className="rp-card-meta">
                        {cardPin.term} · {cardPin.session}
                        {cardPin.expires_at ? ` · Expires ${toInputDate(cardPin.expires_at)}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="rp-card-badge">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M8 1.8a3.2 3.2 0 013.2 3.2v1.4h.8a2.2 2.2 0 012.2 2.2v3.8a2.2 2.2 0 01-2.2 2.2H4a2.2 2.2 0 01-2.2-2.2V8.6A2.2 2.2 0 014 6.4h.8V5A3.2 3.2 0 018 1.8Z"
                        stroke="currentColor"
                        strokeWidth="1.15"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M6.2 6.4V5a1.8 1.8 0 113.6 0v1.4"
                        stroke="currentColor"
                        strokeWidth="1.15"
                        strokeLinecap="round"
                      />
                    </svg>
                    Result access card
                  </div>
                </div>

                <div className="rp-pin-box">
                  <div>
                    <div className="rp-pin-label">PIN</div>
                    <p className="rp-pin">{cardPin.pin}</p>
                    <div className="rp-pin-sub">
                      Term/Session: <b style={{ color: "#ffd98a" }}>{cardPin.term}</b> ·{" "}
                      <b style={{ color: "#ffd98a" }}>{cardPin.session}</b>
                      <br />
                      Uses:{" "}
                      <b style={{ color: "#ffd98a" }}>{cardPin.uses ?? 0}</b> /{" "}
                      <b style={{ color: "#ffd98a" }}>{cardPin.max_uses}</b>
                      {cardPin.created_at ? ` · Created ${fmtDateTime(cardPin.created_at)}` : ""}
                    </div>
                  </div>

                  <div className="rp-card-btns">
                    <button type="button" className="rp-card-btn rp-card-btn--gold" onClick={() => copyToClipboard(cardPin.pin)}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.2" />
                        <rect x="2" y="2" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.2" opacity=".7" />
                      </svg>
                      Copy PIN
                    </button>

                    <button
                      type="button"
                      className="rp-card-btn"
                      onClick={() =>
                        copyToClipboard(
                          `${brand.name}\nPIN: ${cardPin.pin}\n${cardPin.term} · ${cardPin.session}\nMax uses: ${cardPin.max_uses}`
                        )
                      }
                      title="Copy card details"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M3 3h7a2 2 0 012 2v8H5a2 2 0 01-2-2V3Z" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M12 6h1a2 2 0 012 2v5a1 1 0 01-1 1h-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                      Copy details
                    </button>

                    <button type="button" className="rp-card-btn" onClick={downloadCardPdf} title="Download card as PDF">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2v7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M3 12v2a1 1 0 001 1h8a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                      Download PDF
                    </button>
                  </div>
                </div>

                <div className="rp-scratch">
                  <div>
                    <div className="rp-scratch-title">Scratch panel</div>
                    <div className="rp-scratch-sub">Keep this PIN confidential</div>
                  </div>

                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.78)" }}>
                    Max uses: <b style={{ color: "#ffd98a" }}>{cardPin.max_uses}</b>
                    {cardPin.expires_at ? ` · Expires: ${toInputDate(cardPin.expires_at)}` : ""}
                  </div>
                </div>
              </div>

              <div className="rp-modal-footer">
               

                <button className="rp-btn" onClick={closePinCard}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}