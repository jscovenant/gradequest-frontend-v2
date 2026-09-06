// src/pages/Public/CheckResultPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { publicApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import Footer from "../../../components/LayoutComponents/Footer";

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
import PageTitle from "../../../components/PageTitle";
import { getAppBaseUrl } from "../../../utils/apiUrl";

/** -----------------------------
 * Types (same spirit as ShowResult)
 * ----------------------------- */

interface V2Average {
  id?: number;
  user_id?: number;
  class_id?: number;
  term: string;
  session: string;
  total_average: string | number;
  total_grade: string;
  position: string | number;
  class_size: string | number;
  no_present?: string | number;
  no_absent?: string | number;
  school_open?: string | number;
  class_teacher_comment?: string;
  principal_comment?: string;
  general_remark?: string;
  resumption_date?: string | null;
}

type CarryOverPayload = {
  enabled: boolean;
  terms?: Record<string, number>;
  current_term?: Record<string, number>;
  cumulative_total?: number;
  cumulative_average?: number;
};

interface V2SubjectResult {
  id: number;
  student_result_id: number;
  subject_id: number;
  subject_name: string;
  ca: string | Record<string, any>;
  exam: string | number;
  total: string | number;
  grade?: string;
  remark?: string;
  comment?: string;

  carry_over_json?: string | CarryOverPayload | null;
  carry_over?: CarryOverPayload | null;

  carry_over_enabled?: number | boolean | string;
  cumulative_total?: string | number | null;
  cumulative_average?: string | number | null;
}

interface LegacyUser {
  id: number;
  reg_no: string;
  surname: string;
  firstname: string;
  third_name?: string;
  sex?: string;
  dob?: string;
}

interface LegacyAverage {
  id?: number;
  user_id?: number;
  class_id?: number;
  term: string;
  session: string;
  total_average: number;
  total_grade: string;
  position: number;
  class_size: number;
  no_present: number;
  no_absent?: number;
  school_open: number;
  class_teacher_comment: string;
  principal_comment: string;
  general_remark: string;
  resumption_date: string;
}

interface LegacyTermResult {
  id: number;
  user_id: number;
  subject_id: number;
  subject: { id: number; name: string };
  ca: string | Record<string, any>;
  exam: number;
  total: number;
  firstterm?: number;
  secondterm?: number;
  average?: number;
  grade?: string;
  remark?: string;
}

interface SchoolInfo {
  name: string;
  address: string;
  phone: string;
  logo?: string; // base64 or url
  principal_signature?: string; // base64 or url

  primary_color?: string;
  secondary_color?: string;
  background_color?: string;
}

interface ResultTemplateSetting {
  template_key?: string;
  primary_color?: string;
  secondary_color?: string;
  background_color?: string;
  font_family?: string;
  display_options?: {
    show_position?: boolean;
    show_grade?: boolean;
    show_remarks?: boolean;
    show_attendance?: boolean;
    show_domains?: boolean;
    show_qr_code?: boolean;
    show_signature?: boolean;
    show_student_photo?: boolean;
    show_watermark?: boolean;
    report_column_rules?: ReportColumnRule[];
    custom_report_layout?: {
      enabled?: boolean;
      blocks?: CustomReportBlock[];
    };
  };
}

type CustomReportBlock = {
  id?: string;
  label?: string;
  type: string;
  width?: "full" | "half";
  visible?: boolean;
};

type ReportColumnOptions = {
  show_position: boolean;
  show_grade: boolean;
  show_remarks: boolean;
  show_first_term: boolean;
  show_second_term: boolean;
  show_cumulative_total: boolean;
  show_cumulative_average: boolean;
};

type ReportColumnRule = {
  id?: string;
  section_id?: number | "all" | null;
  section_name?: string;
  term?: string;
  columns?: Partial<ReportColumnOptions>;
};
interface AffectiveDomain {
  domain: string;
  rating: string;
}

interface PsychomotorDomain {
  domain: string;
  rating: string;
}

interface ReportCardData {
  source: "v2" | "legacy" | string;
  user: LegacyUser; // backend returns user object (same as reportCard payload)
  user_photo_base64?: string;
  average: V2Average | LegacyAverage;
  term_result: (V2SubjectResult | LegacyTermResult)[];
  class_name: string;
  class_section_id?: number | null;
  class_section_name?: string | null;
  school_info: SchoolInfo;
  result_template?: ResultTemplateSetting;
  affective_domains: AffectiveDomain[];
  psychomotor_domains: PsychomotorDomain[];
}

type SaveErrors = Record<string, string[] | string>;

const performanceChartColors = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];
const resultAnalyticColors = ["#0f766e", "#9333ea", "#ea580c", "#0284c7", "#be123c", "#4f46e5"];
const defaultReportColumnOptions: ReportColumnOptions = {
  show_position: true,
  show_grade: true,
  show_remarks: true,
  show_first_term: false,
  show_second_term: false,
  show_cumulative_total: false,
  show_cumulative_average: false,
};

function normalizeTerm(term: string | undefined) {
  return (term || "all").trim().toLowerCase();
}

function resolveReportColumns(
  rules: ReportColumnRule[] = [],
  sectionId: number | null | undefined,
  term: string
): ReportColumnOptions {
  if (!Array.isArray(rules) || rules.length === 0) {
    return { ...defaultReportColumnOptions };
  }
  const matched = rules
    .map((rule) => {
      if (!rule) return { rule, score: -1 };
      const ruleSection = rule.section_id ?? "all";
      const sectionMatches = ruleSection === "all" || Number(ruleSection) === Number(sectionId);
      const termMatches = normalizeTerm(rule.term) === "all" || normalizeTerm(rule.term) === normalizeTerm(term);
      const score = (ruleSection === "all" ? 0 : 2) + (normalizeTerm(rule.term) === "all" ? 0 : 1);
      return { rule, score: sectionMatches && termMatches ? score : -1 };
    })
    .filter((item) => item.score >= 0)
    .sort((a, b) => a.score - b.score);

  return matched.reduce(
    (columns, item) => ({ ...columns, ...(item?.rule?.columns || {}) }),
    { ...defaultReportColumnOptions }
  );
}

/** -----------------------------
 * Helpers (copied/adapted from ShowResult)
 * ----------------------------- */

const isEmpty = (val: any): boolean => {
  return (
    val === "" ||
    val === " " ||
    val === "0" ||
    val === 0 ||
    val === null ||
    val === undefined ||
    val === "N/A" ||
    val === "-" ||
    val === "null"
  );
};

const getValue = (val: any, fallback: string | number = "N/A"): string | number => {
  if (isEmpty(val)) return fallback;
  return val;
};

const isCarryEnabled = (s: any) => {
  const v = s?.carry_over_enabled;
  return v === true || v === 1 || v === "1";
};

const parseCarry = (raw: any): CarryOverPayload | null => {
  if (!raw) return null;
  if (typeof raw === "object") return raw as CarryOverPayload;
  try {
    return JSON.parse(raw) as CarryOverPayload;
  } catch {
    return null;
  }
};

const parseCA = (ca: any): number[] => {
  if (!ca) return [];
  if (typeof ca === "object") return Object.values(ca).map((x) => Number(x) || 0);
  try {
    return Object.values(JSON.parse(ca)).map((x: any) => Number(x) || 0);
  } catch {
    return [Number(ca) || 0];
  }
};

const getSubjectName = (subject: V2SubjectResult | LegacyTermResult): string => {
  if ("subject_name" in subject && subject.subject_name) return subject.subject_name;
  if ("subject" in subject && subject.subject?.name) return subject.subject.name;
  return "Unknown Subject";
};

const getTextColor = (bg: string) => {
  const hex = (bg || "").replace("#", "");
  if (hex.length !== 6) return "#fff";
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? "#111827" : "#fff";
};
const hexToRgba = (color: string, alpha: number) => {
  const hex = (color || "").replace("#", "");
  if (hex.length !== 6) return `rgba(13, 71, 161, ${alpha})`;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const mixHexWithWhite = (color: string, whitePercent = 82) => {
  const hex = (color || "").replace("#", "");
  if (hex.length !== 6) return "#f8fafc";
  const ratio = Math.max(0, Math.min(100, whitePercent)) / 100;
  const r = Math.round(parseInt(hex.substring(0, 2), 16) * (1 - ratio) + 255 * ratio);
  const g = Math.round(parseInt(hex.substring(2, 4), 16) * (1 - ratio) + 255 * ratio);
  const b = Math.round(parseInt(hex.substring(4, 6), 16) * (1 - ratio) + 255 * ratio);
  return `rgb(${r}, ${g}, ${b})`;
};

/** -----------------------------
 * Component
 * ----------------------------- */

export default function CheckResultPage() {
  const { showSuccess, showError } = useToast();

  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [regNo, setRegNo] = useState("");
  const [pin, setPin] = useState("");

  const [data, setData] = useState<ReportCardData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRegNo = params.get("reg_no") || params.get("student_reg_no") || "";
    const urlPin = params.get("pin") || "";

    if (urlRegNo) setRegNo(urlRegNo);
    if (urlPin) setPin(urlPin);
  }, []);

  const parseBackendError = (err: any) => {
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "Something went wrong. Please try again.";
    const errors: SaveErrors | undefined = err?.response?.data?.errors;
    const payload = err?.response?.data;
    return { msg, errors, payload };
  };

  const canSubmit = useMemo(() => {
    return regNo.trim().length > 0 && pin.trim().length > 0 && !checking;
  }, [regNo, pin, checking]);

  const onCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setData(null);
    setQrDataUrl("");

    try {
      const res = await publicApi.get<ReportCardData>("/public/check-result", {
        params: { reg_no: regNo.trim(), pin: pin.trim() },
      });

      setData(res.data);

      //  QR Code (same style as ShowResult)
      const term = (res.data.average as any)?.term;
      const session = (res.data.average as any)?.session;

      const qrPayload = {
        studentId: res.data.user.id,
        reg_no: res.data.user.reg_no || regNo.trim(),
        term,
        session,
      };
      const encodedPayload = encodeURIComponent(JSON.stringify(qrPayload));
      const verificationBaseUrl = getAppBaseUrl();
      const verificationUrl = `${verificationBaseUrl}/verify-result?data=${encodedPayload}&reg_no=${encodeURIComponent(qrPayload.reg_no || "")}&term=${encodeURIComponent(qrPayload.term)}&session=${encodeURIComponent(qrPayload.session)}`;

      const generatedQR = await QRCode.toDataURL(verificationUrl);
      setQrDataUrl(generatedQR);

      showSuccess("Result loaded successfully.");
    } catch (err: any) {
      console.error(err);
      const { msg, errors, payload } = parseBackendError(err);

      if (errors && typeof errors === "object") {
        const firstKey = Object.keys(errors)[0];
        const firstVal = (errors as any)[firstKey];
        const firstMsg = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
        showError(firstMsg || msg);
        return;
      }

      if (payload?.status === "fee_restricted") {
        showError(payload?.message || "Access restricted due to unpaid fees.");
        return;
      }

      showError(msg);
    } finally {
      setChecking(false);
    }
  };

  const resetForm = () => {
    setRegNo("");
    setPin("");
    setData(null);
    setQrDataUrl("");
  };

  /** ----------- derived state (same as ShowResult) ----------- */
  const isV2 = data?.source === "v2";
  const user = data?.user;
  const studentPhoto = data?.user_photo_base64;
  const school_info = data?.school_info;
  const term_result = data?.term_result || [];
  const summary = data?.average as any;

  const affective_domains = data?.affective_domains || [];
  const psychomotor_domains = data?.psychomotor_domains || [];
  const class_name = data?.class_name || "N/A";
  const resultTemplate = data?.result_template || {};
  const displayOptions = {
    show_position: true,
    show_grade: true,
    show_remarks: true,
    show_attendance: true,
    show_domains: true,
    show_qr_code: true,
    show_signature: true,
    show_student_photo: true,
    show_watermark: true,
    ...(resultTemplate.display_options || {}),
  };
  const activeReportColumns = resolveReportColumns(
    displayOptions.report_column_rules || [],
    data?.class_section_id,
    String(summary?.term || "")
  );
  const showResultPosition = displayOptions.show_position && activeReportColumns.show_position;
  const showResultGrade = displayOptions.show_grade && activeReportColumns.show_grade;
  const showResultRemarks = displayOptions.show_remarks && activeReportColumns.show_remarks;

  const themePrimary = resultTemplate.primary_color || school_info?.primary_color || "#0d47a1";
  const themeSecondary = resultTemplate.secondary_color || school_info?.secondary_color || "#ffc107";
  const themeBg = resultTemplate.background_color || school_info?.background_color || "#ffffff";
  const templateKey = resultTemplate.template_key || "classic_academic";
  const resultFont = resultTemplate.font_family || "Arial";
  const isModernTemplate = templateKey === "modern_scholar";
  const isPremiumTemplate = templateKey === "premium_letterhead";
  const customReportLayout = displayOptions.custom_report_layout;
  const isCustomTemplate = templateKey === "custom_builder" && customReportLayout?.enabled !== false;
  const customBlocks = customReportLayout?.blocks || [];
  const customBlockStyle = (type: string): React.CSSProperties => {
    if (!isCustomTemplate) return {};

    const index = customBlocks.findIndex((block) => block.type === type);
    const block = index >= 0 ? customBlocks[index] : undefined;

    return {
      order: index >= 0 ? index : customBlocks.length,
      gridColumn: block?.width === "half" ? "span 1" : "1 / -1",
      display: block?.visible === false ? "none" : undefined,
      minWidth: 0,
    };
  };
  const headerTextColor = getTextColor(themePrimary);

  const borderColor = themePrimary;

  const thStyle: React.CSSProperties = {
    border: `1px solid ${borderColor}`,
    padding: "7px 5px",
    textAlign: "center",
    background: themePrimary,
    color: headerTextColor,
  };

  const tdStyle: React.CSSProperties = {
    border: `1px solid ${hexToRgba(borderColor, 0.55)}`,
    padding: "6px 5px",
    textAlign: "center",
  };

  const domainTableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    border: `1px solid ${borderColor}`,
    fontSize: "11px",
  };
  const resultLayoutStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isModernTemplate ? "minmax(0, 1.25fr) minmax(245px, .75fr)" : "1fr",
    gap: 12,
    alignItems: "start",
    borderTop: isPremiumTemplate ? `1px solid ${themePrimary}55` : undefined,
    marginTop: isPremiumTemplate ? 12 : undefined,
    paddingTop: isPremiumTemplate ? 2 : undefined,
  };
  const insightPanelStyle: React.CSSProperties = {
    minWidth: 0,
    marginTop: isModernTemplate ? 12 : 0,
    display: isPremiumTemplate ? "grid" : undefined,
    gridTemplateColumns: isPremiumTemplate ? "1.2fr .8fr" : undefined,
    gap: isPremiumTemplate ? 10 : undefined,
    alignItems: isPremiumTemplate ? "start" : undefined,
  };
  const analyticsGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isModernTemplate ? "1fr" : "1.2fr .8fr",
    gap: 10,
    marginTop: 12,
  };
  const domainsGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isModernTemplate ? "1fr" : "1fr 1fr",
    marginTop: isPremiumTemplate ? 0 : 12,
    gap: 10,
  };
  // collect term names from carry_over.terms across all subjects
  const currentTermName = summary?.term || "";

  const v2CarryTermNames: string[] = useMemo(() => {
    if (!data || !isV2) return [];
    const set = new Set<string>();

    (term_result as V2SubjectResult[]).forEach((s) => {
      const enabled = s.carry_over?.enabled || isCarryEnabled(s);
      if (!enabled) return;

      const co = parseCarry(s.carry_over_json) ?? s.carry_over;
      const termsObj = co?.terms ?? {};
      Object.keys(termsObj).forEach((t) => {
        if (t && t !== currentTermName) set.add(t);
      });
    });

    const order: Record<string, number> = {
      "First Term": 1,
      "Second Term": 2,
      "Third Term": 3,
    };

    return Array.from(set).sort((a, b) => (order[a] ?? 99) - (order[b] ?? 99));
  }, [data, isV2, term_result, currentTermName]);

  // Determine CA columns
  const { maxCAColumns, caColumnValue } = useMemo(() => {
    let caColValue = 0;
    if (!Array.isArray(term_result) || term_result.length === 0) {
      return { maxCAColumns: 0, caColumnValue: 0 };
    }
    for (let subject of term_result) {
      const caArray = parseCA((subject as any)?.ca);
      if (caArray.length > 0) {
        caColValue = Math.round(40 / caArray.length);
        break;
      }
    }
    const max = Math.max(...term_result.map((s) => parseCA((s as any)?.ca).length), 0);
    return { maxCAColumns: max, caColumnValue: caColValue };
  }, [term_result]);

  const visibleV2CarryTermNames = v2CarryTermNames.filter((termName) => {
    const normalized = normalizeTerm(termName);
    if (normalized.includes("first")) return activeReportColumns.show_first_term;
    if (normalized.includes("second")) return activeReportColumns.show_second_term;
    return true;
  });
  const selectedV2CarryTermNames = Array.from(new Set([
    ...(activeReportColumns.show_first_term ? ["First Term"] : []),
    ...(activeReportColumns.show_second_term ? ["Second Term"] : []),
    ...visibleV2CarryTermNames,
  ]));
  const showCumulativeTotal = activeReportColumns.show_cumulative_total;
  const showCumulativeAverage = activeReportColumns.show_cumulative_average;

  const hasLegacyColumns = !isV2 && Array.isArray(term_result) && term_result.length > 0;
  const hideFirstTermLegacy = hasLegacyColumns
    ? !activeReportColumns.show_first_term || (term_result as LegacyTermResult[]).every((s) => isEmpty((s as any)?.firstterm))
    : true;
  const hideSecondTerm = hasLegacyColumns
    ? !activeReportColumns.show_second_term || (term_result as LegacyTermResult[]).every((s) => isEmpty(s?.secondterm))
    : true;
  const hideCummAvgLegacy = hasLegacyColumns
    ? !activeReportColumns.show_cumulative_average || (term_result as LegacyTermResult[]).every((s) => isEmpty(s?.average))
    : true;

  const hideGrade = Array.isArray(term_result) ? term_result.every((s: any) => isEmpty(s?.grade)) : true;
  const hideRemark = Array.isArray(term_result) ? term_result.every((s: any) => isEmpty(s?.remark)) : true;
  const performanceRows = Array.isArray(term_result)
    ? term_result
        .map((subject: any) => ({
          name: getSubjectName(subject),
          total: Math.max(0, Math.min(100, Number(subject?.total) || 0)),
          grade: String(subject?.grade || "N/A").toUpperCase(),
        }))
        .sort((a, b) => b.total - a.total)
    : [];
  const topPerformanceRows = performanceRows.slice(0, 6);
  const gradeCounts = performanceRows.reduce<Record<string, number>>((acc, row) => {
    const key = row.grade && row.grade !== "N/A" ? row.grade.charAt(0) : "N/A";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const attendancePercent = (() => {
    const present = Number(summary?.no_present) || 0;
    const open = Number(summary?.school_open) || 0;
    return open > 0 ? Math.round((present / open) * 100) : 0;
  })();

  const showV2CarryCols =
    !!isV2 &&
    (activeReportColumns.show_first_term ||
      activeReportColumns.show_second_term ||
      showCumulativeTotal ||
      showCumulativeAverage ||
      selectedV2CarryTermNames.length > 0);
  const studentFullName = useMemo(() => {
    if (!user) return "";
    return `${user.surname || ""} ${user.firstname || ""} ${user.third_name || ""}`.trim();
  }, [user]);

  /** ----------- PDF download (same as ShowResult) ----------- */
  const downloadPDF = async () => {
    if (!data) return;
    setDownloading(true);
    try {
      const resultDoc = document.getElementById("result-sheet");
      if (!resultDoc) return;

      const canvas = await html2canvas(resultDoc, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");

      const imgWidth = 595.28;
      const pageHeight = 841.89;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
      pdf.save(`Result_${user?.reg_no || regNo.trim() || "student"}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      showError("Failed to generate PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="gq-cr-page">
      <PageTitle title="Student Result Checker | GradiosEdu" />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Cinzel:wght@600;700;800&display=swap');

        .gq-cr-page {
          min-height: 100vh;
          background: #f8fafc;
          color: #0f172a;
          padding: 24px 16px 60px;
          font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
        }

        .gq-cr-shell {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* ── Top Bar with Security Badges ── */
        .gq-cr-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 12px 24px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
        }

        .gq-cr-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: #0f172a;
        }

        .gq-cr-logo-badge {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 16px;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
        }

        .gq-cr-brand-title {
          font-weight: 800;
          font-size: 16px;
          color: #0f172a;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }

        .gq-cr-brand-sub {
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
          font-weight: 700;
        }

        .gq-cr-badge-row {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 12px;
          color: #475569;
          font-weight: 600;
        }

        .gq-cr-badge-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .gq-cr-badge-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }

        /* ── Hero Banner ── */
        .gq-cr-hero {
          background: linear-gradient(135deg, #090e1f 0%, #151d38 60%, #1a2244 100%);
          border-radius: 20px;
          padding: 32px 36px;
          color: #ffffff;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 16px 36px rgba(9, 14, 31, 0.18);
          margin-bottom: 24px;
        }

        .gq-cr-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
        }

        .gq-cr-hero > * {
          position: relative;
          z-index: 1;
        }

        .gq-cr-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(245, 158, 11, 0.16);
          border: 1px solid rgba(245, 158, 11, 0.35);
          color: #fbbf24;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 11.5px;
          font-weight: 800;
          margin-bottom: 14px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .gq-cr-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(22px, 3.2vw, 32px);
          font-weight: 800;
          margin-bottom: 8px;
          color: #ffffff;
          line-height: 1.2;
        }

        .gq-cr-desc {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.82);
          max-width: 680px;
          line-height: 1.5;
          margin: 0;
        }

        /* ── Left Form Card ── */
        .gq-cr-form-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 24px;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
        }

        .gq-cr-card-head {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-bottom: 16px;
          margin-bottom: 20px;
          border-bottom: 1px solid #f1f5f9;
          font-weight: 800;
          font-size: 15px;
          color: #0f172a;
        }

        .gq-cr-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #334155;
          margin-bottom: 6px;
        }

        .gq-cr-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          font-size: 14px;
          font-family: inherit;
          color: #0f172a;
          background: #ffffff;
          transition: all 0.2s ease;
          outline: none;
        }

        .gq-cr-input:focus {
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18);
        }

        .gq-cr-btn-submit {
          width: 100%;
          padding: 13px 20px;
          border-radius: 12px;
          background: linear-gradient(135deg, #0f172a, #1e293b);
          color: #ffffff;
          font-weight: 800;
          font-size: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.15);
        }

        .gq-cr-btn-submit:hover:not(:disabled) {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #090e17;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(245, 158, 11, 0.3);
        }

        .gq-cr-btn-submit:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .gq-cr-btn-clear {
          width: 100%;
          padding: 10px 18px;
          border-radius: 12px;
          background: #f1f5f9;
          color: #475569;
          font-weight: 700;
          font-size: 13px;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s ease;
        }

        .gq-cr-btn-clear:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .gq-cr-notice-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 12px;
          color: #64748b;
          line-height: 1.5;
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin-top: 14px;
        }

        /* ── Empty State / Result Preview Area ── */
        .gq-cr-empty-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 48px 32px;
          text-align: center;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
        }

        .gq-cr-empty-icon {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          margin-bottom: 20px;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .gq-cr-step-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 28px;
          text-align: left;
        }

        .gq-cr-step-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px;
        }

        .gq-cr-step-num {
          font-weight: 900;
          font-size: 11px;
          color: #f59e0b;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .gq-cr-step-title {
          font-weight: 700;
          font-size: 13px;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .gq-cr-step-desc {
          font-size: 11.5px;
          color: #64748b;
          line-height: 1.4;
          margin: 0;
        }

        .gq-cr-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 12px 18px;
          margin-bottom: 16px;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
          flex-wrap: wrap;
          gap: 12px;
        }

        @media (max-width: 768px) {
          .gq-cr-topbar {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
          .gq-cr-badge-row {
            flex-wrap: wrap;
            gap: 10px;
          }
          .gq-cr-step-grid {
            grid-template-columns: 1fr;
          }
          .gq-cr-toolbar {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>

      <div className="gq-cr-shell">
        {/* ── Top Bar with Security Badges ── */}
        <header className="gq-cr-topbar">
          <Link to="/" className="gq-cr-brand">
            <div className="gq-cr-logo-badge">GQ</div>
            <div>
              <div className="gq-cr-brand-title">GradiosEdu Portal</div>
              <div className="gq-cr-brand-sub">Academic Records & Result Verification</div>
            </div>
          </Link>

          <div className="gq-cr-badge-row">
            <div className="gq-cr-badge-item">
              <span className="gq-cr-badge-dot" />
              <span>256-Bit Encrypted</span>
            </div>
            <div className="gq-cr-badge-item d-none d-md-flex">
              <i className="bi bi-shield-check text-warning" />
              <span>Cryptographic PIN Verification</span>
            </div>
            <Link to="/verify-result" className="btn btn-sm btn-outline-secondary" style={{ borderRadius: "8px", fontSize: "12px", fontWeight: 600 }}>
              Verify QR Seal
            </Link>
          </div>
        </header>

        {/* ── Hero Banner ── */}
        <section className="gq-cr-hero">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <div className="gq-cr-pill">
                <i className="bi bi-patch-check-fill" /> Official Result Checker
              </div>
              <h1 className="gq-cr-title">
                Student Academic Report & Result Portal
              </h1>
              <p className="gq-cr-desc">
                Access certified continuous assessment broadsheets, subject breakdowns, and official termly report cards with your school admission number and result PIN.
              </p>
            </div>

            {data?.school_info?.name && (
              <div className="col-lg-4 d-none d-lg-block text-end">
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.12)",
                    backdropFilter: "blur(12px)",
                    borderRadius: "16px",
                    padding: "16px 20px",
                    border: "1px solid rgba(255, 255, 255, 0.22)",
                    textAlign: "left",
                    display: "inline-block",
                  }}
                >
                  <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#fbbf24", fontWeight: 800 }}>Certified School</div>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#ffffff", marginTop: "2px" }}>{data.school_info.name}</div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", marginTop: "2px" }}>{data.class_name}</div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Main Layout: Form & Result Sheet ── */}
        <div className="row g-4">
          {/* Left Column: Form & Action Cards */}
          <div className="col-lg-4">
            <form onSubmit={onCheck}>
              <div className="gq-cr-form-card">
                <div className="gq-cr-card-head">
                  <i className="bi bi-shield-lock text-warning" style={{ fontSize: "18px" }} />
                  <span>Enter Student Credentials</span>
                </div>

                <div className="mb-3">
                  <label className="gq-cr-label">Student Registration / Admission No</label>
                  <div className="position-relative">
                    <input
                      className="gq-cr-input"
                      placeholder="e.g. GQA/2026/001"
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value)}
                      autoComplete="off"
                      required
                    />
                  </div>
                  <small style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>
                    Assigned admission identifier by the school
                  </small>
                </div>

                <div className="mb-3">
                  <label className="gq-cr-label">Result Checking PIN</label>
                  <input
                    className="gq-cr-input"
                    placeholder="e.g. GQ-7842-9901-X812"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    autoComplete="off"
                    required
                  />
                  <small style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>
                    12-digit authentic termly scratch PIN
                  </small>
                </div>

                <div className="d-grid gap-2 mt-4">
                  <button
                    type="submit"
                    className="gq-cr-btn-submit"
                    disabled={!canSubmit}
                  >
                    {checking ? (
                      <>
                        <span className="spinner-border spinner-border-sm" />
                        Verifying Credentials...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-search" />
                        Check Result
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="gq-cr-btn-clear"
                    onClick={resetForm}
                    disabled={checking}
                  >
                    <i className="bi bi-arrow-counterclockwise" />
                    Clear Form
                  </button>
                </div>

                <div className="gq-cr-notice-box">
                  <i className="bi bi-info-circle text-primary" style={{ fontSize: "16px", marginTop: "2px" }} />
                  <div>
                    <strong>Bursary Notice:</strong> Academic results are accessible to students with full fee clearance. Contact your institution's bursary if restricted.
                  </div>
                </div>
              </div>
            </form>

            {data && (
              <div className="gq-cr-form-card mt-3">
                <div className="gq-cr-card-head">
                  <i className="bi bi-file-earmark-text text-success" style={{ fontSize: "18px" }} />
                  <span>Document Export</span>
                </div>

                <div className="d-grid gap-2">
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ borderRadius: "12px", padding: "12px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                    onClick={downloadPDF}
                    disabled={downloading}
                  >
                    {downloading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-file-earmark-pdf" />
                        Download Official PDF
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    style={{ borderRadius: "12px", padding: "10px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                    onClick={handlePrint}
                  >
                    <i className="bi bi-printer" />
                    Print Report Sheet
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Result Sheet View or Empty Guidance State */}
          <div className="col-lg-8">
            {!data ? (
              <div className="gq-cr-empty-card">
                <div className="gq-cr-empty-icon">
                  <i className="bi bi-mortarboard-fill" />
                </div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: "24px", color: "#0f172a", marginBottom: "8px" }}>
                  Certified Academic Record Verification
                </h3>
                <p style={{ color: "#64748b", fontSize: "14px", maxWidth: "520px", margin: "0 auto 20px", lineHeight: 1.5 }}>
                  Enter your student admission number and result checking PIN on the left to securely retrieve, view, and print your certified termly report card.
                </p>

                <div className="gq-cr-step-grid">
                  <div className="gq-cr-step-item">
                    <div className="gq-cr-step-num">Step 01</div>
                    <div className="gq-cr-step-title">Enter Reg Number</div>
                    <p className="gq-cr-step-desc">Type your unique admission identifier assigned by your school.</p>
                  </div>
                  <div className="gq-cr-step-item">
                    <div className="gq-cr-step-num">Step 02</div>
                    <div className="gq-cr-step-title">Enter Result PIN</div>
                    <p className="gq-cr-step-desc">Input your 12-digit termly scratch card PIN obtained from the school.</p>
                  </div>
                  <div className="gq-cr-step-item">
                    <div className="gq-cr-step-num">Step 03</div>
                    <div className="gq-cr-step-title">View & Download</div>
                    <p className="gq-cr-step-desc">Instantly inspect cumulative broadsheet grades and download verified PDF.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {/* Result Toolbar */}
                <div className="gq-cr-toolbar">
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-success px-3 py-2" style={{ borderRadius: "8px", fontSize: "12px", fontWeight: 700 }}>
                      <i className="bi bi-patch-check-fill me-1" /> Certified Result
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                      {studentFullName} · {data.class_name}
                    </span>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      style={{ borderRadius: "8px", fontSize: "12px", fontWeight: 600 }}
                      onClick={handlePrint}
                    >
                      <i className="bi bi-printer me-1" /> Print
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      style={{ borderRadius: "8px", fontSize: "12px", fontWeight: 700 }}
                      onClick={downloadPDF}
                      disabled={downloading}
                    >
                      <i className="bi bi-file-earmark-pdf me-1" /> PDF
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    padding: "10px",
                    background: themeBg,
                    borderRadius: 16,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)",
                  }}
                >
                  {/* Result Sheet */}
                  <div
                    id="result-sheet"
                  style={{
                    width: "min(780px, 100%)",
                    margin: "auto",
                    padding: "18px",
                    background: themeBg,
                    fontFamily: resultFont,
                    fontSize: "12px",
                    border: `3px solid ${themePrimary}`,
                    borderRadius: templateKey === "modern_scholar" ? "18px" : "8px",
                    boxShadow: templateKey === "premium_letterhead" ? `inset 0 8px 0 ${themePrimary}` : undefined,
                    boxSizing: "border-box",
                    position: "relative",
                    overflow: "visible",
                    color: "#111827",
                  }}
                >
                  {/* Watermark */}
                  {displayOptions.show_watermark && school_info?.logo && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        backgroundImage: `url(${school_info?.logo})`,
                        backgroundRepeat: "repeat",
                        backgroundSize: "150px 150px",
                        opacity: 0.05,
                        transform: "rotate(-30deg)",
                        zIndex: 0,
                        pointerEvents: "none",
                      }}
                    />
                  )}

                  <div style={{ position: "relative", zIndex: 1 }}>
                    {/* HEADER */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: displayOptions.show_student_photo ? "90px 1fr 90px" : "90px 1fr",
                        gap: "12px",
                        alignItems: "center",
                        borderBottom: `2px solid ${themePrimary}`,
                        paddingBottom: "10px",
                      }}
                    >
                      <img
                        src={school_info?.logo || "https://via.placeholder.com/90x90.png?text=Logo"}
                        alt="School Logo"
                        style={{
                          width: "90px",
                          height: "90px",
                          borderRadius: "6px",
                          objectFit: "cover",
                          border: `2px solid ${themeSecondary}`,
                        }}
                      />

                      <div style={{ flex: 1, textAlign: "center" }}>
                        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: themePrimary }}>
                          {school_info?.name}
                        </h1>
                        <p style={{ margin: "3px 0" }}>{school_info?.address}</p>
                        <p style={{ margin: "3px 0" }}>Tel: {school_info?.phone}</p>

                        <h2
                          style={{
                            margin: "6px 0",
                            fontSize: "16px",
                            textTransform: "uppercase",
                            background: themePrimary,
                            color: headerTextColor,
                            padding: "6px 12px",
                            borderRadius: "6px",
                            textAlign: "center",
                            letterSpacing: "1px",
                            border: `1px solid ${themeSecondary}`,
                          }}
                        >
                          {(summary as any).term} REPORT SHEET
                        </h2>
                      </div>

                      {displayOptions.show_student_photo && studentPhoto ? (
                        <img
                          src={studentPhoto}
                          alt="student photo"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.style.display = "none";
                          }}
                          style={{
                            width: "90px",
                            height: "90px",
                            borderRadius: "6px",
                            objectFit: "cover",
                            border: `2px solid ${themeSecondary}`,
                          }}
                        />
                      ) : displayOptions.show_student_photo ? (
                        <div
                          style={{
                            width: "90px",
                            height: "90px",
                            border: `2px dashed ${themePrimary}`,
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            color: "#666",
                            textAlign: "center",
                          }}
                        >
                          Student Photo
                        </div>
                      ) : null}
                    </div>

                    <div
                      style={isCustomTemplate ? {
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 12,
                        alignItems: "start",
                      } : undefined}
                    >
                    {/* Student Info */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 8,
                        marginTop: 12,
                        ...customBlockStyle("student_info"),
                      }}
                    >
                      {[
                        ["Name", `${user?.surname} ${user?.firstname} ${user?.third_name || ""}`.trim()],
                        ["Admission No", user?.reg_no],
                        ["Class", class_name],
                        ["Session", (summary as any).session],
                        ["Gender", user?.sex],
                        ["DOB", user?.dob],
                        ["Term", (summary as any).term],
                        ["Class Size", getValue((summary as any).class_size, "N/A")],
                        ...(showResultPosition
                          ? [["Position", getValue((summary as any).position, "N/A")] as [string, any]]
                          : []),
                        ...(displayOptions.show_attendance
                          ? [
                              ["Present", `${getValue((summary as any).no_present, "N/A")} Days`] as [string, any],
                              ["Times Open", `${getValue((summary as any).school_open, "N/A")} Days`] as [string, any],
                            ]
                          : []),
                        [
                          "Resumption Date",
                          (summary as any).resumption_date
                            ? new Date((summary as any).resumption_date).toLocaleDateString("en-GB")
                            : "N/A",
                        ],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          style={{
                            border: `1px solid ${themePrimary}66`,
                            borderLeft: `4px solid ${themePrimary}`,
                            borderRadius: 9,
                            padding: 8,
                            fontSize: 11,
                            background: mixHexWithWhite(themeSecondary, 82),
                          }}
                        >
                          <strong style={{ color: themePrimary }}>{label}:</strong> {value}
                        </div>
                      ))}
                    </div>

                    <div style={isCustomTemplate ? { display: "contents" } : resultLayoutStyle}>
                      <section style={{ minWidth: 0, ...customBlockStyle("scores_table") }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginTop: 12 }}>
                      <thead>
                        <tr style={{ background: themePrimary, color: headerTextColor }}>
                          <th style={thStyle}>Subject</th>

                          {Array.from({ length: maxCAColumns }).map((_, i) => (
                            <th key={i} style={thStyle}>
                              CA ({caColumnValue})
                            </th>
                          ))}

                          <th style={thStyle}>Exam (60)</th>
                          <th style={thStyle}>Total</th>

                          {/*  V2 carry columns */}
                          {isV2 && showV2CarryCols && (
                            <>
                              {selectedV2CarryTermNames.map((t) => (
                                <th key={t} style={thStyle}>
                                  {t}
                                </th>
                              ))}
                              {showCumulativeTotal && <th style={thStyle}>Cum Total</th>}
                              {showCumulativeAverage && <th style={thStyle}>Cum Avg</th>}
                            </>
                          )}

                          {/* Legacy columns */}
                          {!hideFirstTermLegacy && <th style={thStyle}>First Term</th>}
                          {!hideSecondTerm && <th style={thStyle}>Second Term</th>}
                          {!hideCummAvgLegacy && <th style={thStyle}>Cumm Avg</th>}

                          {showResultGrade && !hideGrade && <th style={thStyle}>Grade</th>}
                          {showResultRemarks && !hideRemark && <th style={thStyle}>Remark</th>}
                        </tr>
                      </thead>

                      <tbody>
                        {term_result.map((subject, i) => {
                          const caArray = parseCA((subject as any).ca);
                          const legacySubject = subject as LegacyTermResult;

                          return (
                            <tr
                              key={i}
                              style={{
                                background: i % 2 === 0 ? "rgba(0,0,0,0.02)" : "transparent",
                              }}
                            >
                              <td style={tdStyle}>{getSubjectName(subject as any)}</td>

                              {caArray.map((score, j) => (
                                <td key={j} style={tdStyle}>
                                  {score}
                                </td>
                              ))}

                              {/* Empty CA cells */}
                              {Array(maxCAColumns - caArray.length)
                                .fill("")
                                .map((_, k) => (
                                  <td key={"empty-" + k} style={tdStyle}></td>
                                ))}

                              <td style={tdStyle}>{(subject as any).exam}</td>
                              <td style={tdStyle}>{(subject as any).total}</td>

                              {/*  V2 carry values */}
                              {isV2 && showV2CarryCols && (
                                <>
                                  {selectedV2CarryTermNames.map((t) => {
                                    const s = subject as V2SubjectResult;
                                    const enabled = s.carry_over?.enabled || isCarryEnabled(s);
                                    if (!enabled) return <td key={t} style={tdStyle}></td>;

                                    const co = parseCarry(s.carry_over_json) ?? s.carry_over;
                                    const val = co?.terms?.[t];

                                    return (
                                      <td key={t} style={tdStyle}>
                                        {!isEmpty(val) ? val : ""}
                                      </td>
                                    );
                                  })}

                                  {showCumulativeTotal && (
                                    <td style={tdStyle}>
                                      {getValue(
                                        (subject as V2SubjectResult).cumulative_total 
                                          (parseCarry((subject as V2SubjectResult).carry_over_json)?.cumulative_total 
                                            (subject as V2SubjectResult).carry_over?.cumulative_total),
                                        ""
                                      )}
                                    </td>
                                  )}

                                  {showCumulativeAverage && (
                                    <td style={tdStyle}>
                                      {getValue(
                                        (subject as V2SubjectResult).cumulative_average 
                                          (parseCarry((subject as V2SubjectResult).carry_over_json)?.cumulative_average 
                                            (subject as V2SubjectResult).carry_over?.cumulative_average),
                                        ""
                                      )}
                                    </td>
                                  )}
                                </>
                              )}

                              {/* Legacy values */}
                              {!hideFirstTermLegacy && <td style={tdStyle}>{legacySubject.firstterm || ""}</td>}
                              {!hideSecondTerm && <td style={tdStyle}>{legacySubject.secondterm || ""}</td>}
                              {!hideCummAvgLegacy && <td style={tdStyle}>{legacySubject.average || ""}</td>}

                              {showResultGrade && !hideGrade && <td style={tdStyle}>{(subject as any).grade || ""}</td>}
                              {showResultRemarks && !hideRemark && <td style={tdStyle}>{(subject as any).remark || ""}</td>}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 11 }}>
                      <span
                        style={{
                          background: themeSecondary,
                          border: `1px solid ${themePrimary}`,
                          borderRadius: 999,
                          padding: "5px 9px",
                          fontSize: 11,
                          fontWeight: 900,
                        }}
                      >
                        Average: {getValue((summary as any).total_average, "N/A")}%
                      </span>
                      {showResultGrade && (
                        <span
                          style={{
                            background: themeSecondary,
                            border: `1px solid ${themePrimary}`,
                            borderRadius: 999,
                            padding: "5px 9px",
                            fontSize: 11,
                            fontWeight: 900,
                          }}
                        >
                          Grade: {getValue((summary as any).total_grade, "N/A")}
                        </span>
                      )}
                      <span
                        style={{
                          background: themeSecondary,
                          border: `1px solid ${themePrimary}`,
                          borderRadius: 999,
                          padding: "5px 9px",
                          fontSize: 11,
                          fontWeight: 900,
                        }}
                      >
                        Status: {getValue((summary as any).general_remark, "N/A")}
                      </span>
                    </div>
                      </section>

                      <aside style={isCustomTemplate ? { display: "contents" } : insightPanelStyle}>

                    {displayOptions.show_domains && (
                      <div style={{ ...analyticsGridStyle, ...customBlockStyle("performance_chart") }}>
                        <div
                          style={{
                            border: `1px solid ${themePrimary}`,
                            borderRadius: 10,
                            padding: 10,
                            background: "rgba(255,255,255,0.62)",
                          }}
                        >
                          <h4
                            style={{
                              margin: "0 0 8px",
                              color: themePrimary,
                              fontSize: 12,
                              textTransform: "uppercase",
                              borderLeft: `4px solid ${themePrimary}`,
                              paddingLeft: 7,
                            }}
                          >
                            Subject Performance
                          </h4>
                          {topPerformanceRows.map((row, index) => (
                            <div
                              key={row.name}
                              style={{ display: "grid", gridTemplateColumns: "120px 1fr 42px", gap: 8, alignItems: "center", margin: "6px 0", fontSize: 10.5 }}
                            >
                              <span>{row.name}</span>
                              <span style={{ height: 8, borderRadius: 999, background: "rgba(15,23,42,0.08)", overflow: "hidden" }}>
                                <span
                                  style={{
                                    display: "block",
                                    height: "100%",
                                    width: `${row.total}%`,
                                    background: performanceChartColors[index % performanceChartColors.length],
                                    borderRadius: 999,
                                  }}
                                />
                              </span>
                              <b>{row.total}%</b>
                            </div>
                          ))}
                        </div>

                        <div
                          style={{
                            border: `1px solid ${themePrimary}`,
                            borderRadius: 10,
                            padding: 10,
                            background: "rgba(255,255,255,0.62)",
                          }}
                        >
                          <h4
                            style={{
                              margin: "0 0 8px",
                              color: themePrimary,
                              fontSize: 12,
                              textTransform: "uppercase",
                              borderLeft: `4px solid ${themePrimary}`,
                              paddingLeft: 7,
                            }}
                          >
                            Result Analytics
                          </h4>
                          {[
                            ...Object.entries(gradeCounts)
                              .filter(([grade]) => grade !== "N/A")
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([grade, count]) => [`${grade} grades`, count, Math.round((count / Math.max(performanceRows.length, 1)) * 100)] as const),
                            ...(displayOptions.show_attendance ? [[`Attendance`, `${attendancePercent}%`, attendancePercent] as const] : []),
                          ].map(([label, value, percent], index) => (
                            <div
                              key={label}
                              style={{ display: "grid", gridTemplateColumns: "92px 1fr 40px", gap: 8, alignItems: "center", margin: "6px 0", fontSize: 10.5 }}
                            >
                              <span>{label}</span>
                              <span style={{ height: 8, borderRadius: 999, background: "rgba(15,23,42,0.08)", overflow: "hidden" }}>
                                <span
                                  style={{
                                    display: "block",
                                    height: "100%",
                                    width: `${Math.max(0, Math.min(100, Number(percent) || 0))}%`,
                                    background: resultAnalyticColors[index % resultAnalyticColors.length],
                                    borderRadius: 999,
                                  }}
                                />
                              </span>
                              <b>{value}</b>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Domains */}
                    {displayOptions.show_domains && (affective_domains.length > 0 || psychomotor_domains.length > 0) && (
                      <div style={{ ...domainsGridStyle, ...customBlockStyle("domains") }}>
                        {affective_domains.length > 0 && (
                          <div>
                            <table style={domainTableStyle}>
                              <caption style={{ fontWeight: 900, color: themePrimary, paddingBottom: 6, borderBottom: `2px solid ${themePrimary}` }}>
                                Affective Domain
                              </caption>
                              <tbody>
                                {affective_domains.map((row, i) => (
                                  <tr key={i}>
                                    <td style={tdStyle}>{row.domain}</td>
                                    <td style={tdStyle}>{row.rating}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {psychomotor_domains.length > 0 && (
                          <div>
                            <table style={domainTableStyle}>
                              <caption style={{ fontWeight: 900, color: themePrimary, paddingBottom: 6, borderBottom: `2px solid ${themePrimary}` }}>
                                Psychomotor Skills
                              </caption>
                              <tbody>
                                {psychomotor_domains.map((row, i) => (
                                  <tr key={i}>
                                    <td style={tdStyle}>{row.domain}</td>
                                    <td style={tdStyle}>{row.rating}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                      </aside>
                    </div>

                    {/* Remarks */}
                    {displayOptions.show_remarks && <div
                      style={{
                        ...customBlockStyle("comments"),
                        marginTop: "12px",
                        border: `1px solid ${themePrimary}55`,
                        borderRadius: 12,
                        padding: 10,
                        background: "rgba(255,255,255,0.62)",
                        fontSize: 11,
                        lineHeight: 1.6,
                      }}
                    >
                      <p style={{ margin: "0 0 5px" }}>
                        <strong style={{ color: themePrimary }}>Teacher's Remark:</strong>{" "}
                        {getValue((summary as any).class_teacher_comment, "")}
                      </p>
                      <p style={{ margin: "0 0 8px" }}>
                        <strong style={{ color: themePrimary }}>Principal/HM Remark:</strong>{" "}
                        {getValue((summary as any).principal_comment, "")}
                      </p>
                    </div>}

                    {/* Signature + QR */}
                    <div
                      style={{
                        marginTop: "20px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderTop: isPremiumTemplate ? `1px solid ${themePrimary}55` : undefined,
                        paddingTop: isPremiumTemplate ? 12 : undefined,
                        ...customBlockStyle("signature"),
                      }}
                    >
                      {displayOptions.show_signature && (school_info?.principal_signature || (school_info as any)?.stamp) ? (
                        <div style={{ display: "flex", alignItems: "end", gap: 18 }}>
                          {school_info?.principal_signature ? (
                            <div style={{ textAlign: "center" }}>
                              <img
                                src={school_info.principal_signature}
                                alt="Principal/HM Signature"
                                style={{
                                  width: "120px",
                                  height: "60px",
                                  objectFit: "contain",
                                }}
                              />
                              <p style={{ margin: 0, color: themePrimary, fontWeight: 700 }}>Principal/HM Signature</p>
                            </div>
                          ) : null}
                          {(school_info as any)?.stamp ? (
                            <img
                              src={(school_info as any).stamp}
                              alt="School stamp"
                              style={{ width: 68, height: 68, objectFit: "contain", transform: "rotate(-8deg)" }}
                            />
                          ) : null}
                        </div>
                      ) : <div />}

                      {displayOptions.show_qr_code ? (
                        <div style={{ textAlign: "center" }}>
                          <img src={qrDataUrl || "/media/result/default-qrcode.svg"} alt="QR Code" style={{ width: "100px", height: "100px" }} />
                          <p style={{ margin: 0, color: themePrimary, fontWeight: 700 }}>Verify Result</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    <div className="mt-5">
      <Footer />
    </div>
  </div>
</main>
);
}
