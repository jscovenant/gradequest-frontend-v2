// src/pages/Public/CheckResultPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { publicApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import Footer from "../../../components/LayoutComponents/Footer";

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
import PageTitle from "../../../components/PageTitle";

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
  const matched = rules
    .map((rule) => {
      const ruleSection = rule.section_id ?? "all";
      const sectionMatches = ruleSection === "all" || Number(ruleSection) === Number(sectionId);
      const termMatches = normalizeTerm(rule.term) === "all" || normalizeTerm(rule.term) === normalizeTerm(term);
      const score = (ruleSection === "all" ? 0 : 2) + (normalizeTerm(rule.term) === "all" ? 0 : 1);
      return { rule, score: sectionMatches && termMatches ? score : -1 };
    })
    .filter((item) => item.score >= 0)
    .sort((a, b) => a.score - b.score);

  return matched.reduce(
    (columns, item) => ({ ...columns, ...(item.rule.columns || {}) }),
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
      const verificationBaseUrl = "https://gradequest.com.ng";
      const verificationUrl = `${verificationBaseUrl}/verify-result?data=${encodedPayload}`;

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
    for (let subject of term_result) {
      const caArray = parseCA((subject as any).ca);
      if (caArray.length > 0) {
        caColValue = Math.round(40 / caArray.length);
        break;
      }
    }
    const max = Math.max(...term_result.map((s) => parseCA((s as any).ca).length), 0);
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

  const hasLegacyColumns = !isV2 && term_result.length > 0;
  const hideFirstTermLegacy = hasLegacyColumns
    ? !activeReportColumns.show_first_term || (term_result as LegacyTermResult[]).every((s) => isEmpty((s as any).firstterm))
    : true;
  const hideSecondTerm = hasLegacyColumns
    ? !activeReportColumns.show_second_term || (term_result as LegacyTermResult[]).every((s) => isEmpty(s.secondterm))
    : true;
  const hideCummAvgLegacy = hasLegacyColumns
    ? !activeReportColumns.show_cumulative_average || (term_result as LegacyTermResult[]).every((s) => isEmpty(s.average))
    : true;

  const hideGrade = term_result.every((s: any) => isEmpty(s.grade));
  const hideRemark = term_result.every((s: any) => isEmpty(s.remark));
  const performanceRows = term_result
    .map((subject: any) => ({
      name: getSubjectName(subject),
      total: Math.max(0, Math.min(100, Number(subject.total) || 0)),
      grade: String(subject.grade || "N/A").toUpperCase(),
    }))
    .sort((a, b) => b.total - a.total);
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

  return (
    <>
    <PageTitle title="Check Result" />
      <div className="container" style={{ maxWidth: 1200 }}>
        {/* Hero */}
        <div
          className="mt-4 p-4 position-relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${themePrimary} 0%, #6366f1 100%)`,
            borderRadius: "16px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-50px",
              right: "-50px",
              width: "220px",
              height: "220px",
              background: "rgba(255, 255, 255, 0.12)",
              borderRadius: "50%",
              filter: "blur(40px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-30px",
              left: "-30px",
              width: "160px",
              height: "160px",
              background: "rgba(255, 255, 255, 0.12)",
              borderRadius: "50%",
              filter: "blur(40px)",
            }}
          />

          <div className="row align-items-center position-relative">
            <div className="col-md-8">
              <span
                className="badge px-3 py-2 mb-3 d-inline-flex align-items-center gap-2"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  color: "#fff",
                  borderRadius: "20px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                <i className="bi bi-search"></i>
                Public Result Portal
              </span>

              <h2 className="fw-bold text-white mb-2">Check Result with PIN</h2>
              <p className="text-white mb-0" style={{ opacity: 0.95 }}>
                Enter your registration number and result PIN to view the current term result.
              </p>
            </div>

            {data?.school_info?.name ? (
              <div className="col-md-4 d-none d-md-block text-end">
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.16)",
                    backdropFilter: "blur(10px)",
                    borderRadius: "16px",
                    padding: "1.25rem",
                    border: "1px solid rgba(255, 255, 255, 0.25)",
                  }}
                >
                  <div className="text-white fw-semibold">{data.school_info.name}</div>
                  <small className="text-white d-block" style={{ opacity: 0.85 }}>
                    {data.class_name}
                  </small>
                  <small className="text-white d-block mt-2" style={{ opacity: 0.75 }}>
                    Source: {String(data.source).toUpperCase()}
                  </small>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="row g-4 mt-2">
          {/* LEFT: form + actions */}
          <div className="col-lg-4">
            <form onSubmit={onCheck}>
              <div className="card shadow-sm border-0" style={{ borderRadius: 12 }}>
                <div className="card-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Registration Number</label>
                    <input
                      className="form-control"
                      placeholder="e.g. GQA/2025/001"
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value)}
                      autoComplete="off"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Result PIN</label>
                    <input
                      className="form-control"
                      placeholder="Enter PIN"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      autoComplete="off"
                      required
                    />
                  </div>

                  <div className="d-grid gap-2 mt-3">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{
                        borderRadius: 12,
                        padding: "10px 14px",
                        fontWeight: 800,
                        backgroundColor: themePrimary,
                        borderColor: themePrimary,
                      }}
                      disabled={!canSubmit}
                    >
                      {checking ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-search me-2" />
                          Check Result
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="btn btn-light"
                      style={{ borderRadius: 12, padding: "10px 14px" }}
                      onClick={resetForm}
                      disabled={checking}
                    >
                      <i className="bi bi-arrow-counterclockwise me-2" />
                      Clear
                    </button>

                    <div className="alert alert-light border mb-0">
                      <i className="bi bi-shield-lock me-2" />
                      If fees are unpaid, access may be restricted by the school.
                    </div>
                  </div>
                </div>
              </div>
            </form>

            {data && (
              <div className="card border-0 shadow-sm mt-4" style={{ borderRadius: 12 }}>
                <div className="card-body p-3 d-grid gap-2">
                

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    style={{ borderRadius: 12 }}
                    onClick={downloadPDF}
                    disabled={downloading}
                  >
                    {downloading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-file-earmark-pdf me-2" />
                        Download PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: actual report sheet (same layout logic as ShowResult) */}
          <div className="col-lg-8">
            {!data ? (
              <div className="card shadow-sm border-0" style={{ borderRadius: 12 }}>
                <div className="card-body p-4">
                  <div className="alert alert-light border mb-0">
                    <i className="bi bi-info-circle me-2" />
                    Enter Reg No and PIN, then click <b>Check Result</b>.
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "10px",
                  background: themeBg,
                  borderRadius: 12,
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
                      {displayOptions.show_signature ? (
                        <div style={{ display: "flex", alignItems: "end", gap: 18 }}>
                          <div style={{ textAlign: "center" }}>
                            <img
                              src={school_info?.principal_signature || "/media/result/default-signature.svg"}
                              alt="Principal/HM Signature"
                              style={{
                                width: "120px",
                                height: "60px",
                                objectFit: "contain",
                              }}
                            />
                            <p style={{ margin: 0, color: themePrimary, fontWeight: 700 }}>Principal/HM Signature</p>
                          </div>
                          <img
                            src="/media/result/default-stamp.svg"
                            alt="School stamp"
                            style={{ width: 68, height: 68, objectFit: "contain", transform: "rotate(-8deg)" }}
                          />
                        </div>
                      ) : <div />}

                      {displayOptions.show_qr_code ? <div style={{ textAlign: "center" }}>
                        <img src={qrDataUrl || "/media/result/default-qrcode.svg"} alt="QR Code" style={{ width: "100px", height: "100px" }} />
                        <p style={{ margin: 0, color: themePrimary, fontWeight: 700 }}>Verify Result</p>
                      </div> : <div />}
                    </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <Footer />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-4" />
      </div>
    </>
  );
}
