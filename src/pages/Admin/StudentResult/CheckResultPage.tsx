// src/pages/Public/CheckResultPage.tsx
import React, { useMemo, useState } from "react";
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
  school_info: SchoolInfo;
  affective_domains: AffectiveDomain[];
  psychomotor_domains: PsychomotorDomain[];
}

type SaveErrors = Record<string, string[] | string>;

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

      // ✅ QR Code (same style as ShowResult)
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

  const themePrimary = school_info?.primary_color || "#0d47a1";
  const themeSecondary = school_info?.secondary_color || "#ffc107";
  const themeBg = school_info?.background_color || "#ffffff";
  const headerTextColor = getTextColor(themePrimary);

  const borderColor = themePrimary;

  const thStyle: React.CSSProperties = {
    border: `1px solid ${borderColor}`,
    padding: "4px",
    textAlign: "center",
  };

  const tdStyle: React.CSSProperties = {
    border: `1px solid ${borderColor}`,
    padding: "4px",
    textAlign: "center",
  };

  const domainTableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    border: `1px solid ${borderColor}`,
    fontSize: "11px",
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

  const hasLegacyColumns = !isV2 && term_result.length > 0;

  const hideSecondTerm = useMemo(() => {
    if (!hasLegacyColumns) return true;
    return (term_result as LegacyTermResult[]).every((s) => isEmpty(s.secondterm));
  }, [hasLegacyColumns, term_result]);

  const hideCummAvgLegacy = useMemo(() => {
    if (!hasLegacyColumns) return true;
    return (term_result as LegacyTermResult[]).every((s) => isEmpty(s.average));
  }, [hasLegacyColumns, term_result]);

  const hideGrade = useMemo(() => term_result.every((s: any) => isEmpty(s.grade)), [term_result]);
  const hideRemark = useMemo(() => term_result.every((s: any) => isEmpty(s.remark)), [term_result]);

  const showV2CarryCols = useMemo(() => {
    if (!isV2) return false;
    const v2Rows = term_result as V2SubjectResult[];
    return v2Rows.some((s) => {
      const enabled = s.carry_over?.enabled || isCarryEnabled(s);
      if (!enabled) return false;

      const co = parseCarry(s.carry_over_json) ?? s.carry_over;
      const hasTerms = !!co?.terms && Object.keys(co.terms).length > 0;
      const hasCurrent = !!co?.current_term && Object.keys(co.current_term).length > 0;

      const hasCumTotal = !isEmpty(s.cumulative_total) || !isEmpty(co?.cumulative_total);
      const hasCumAvg = !isEmpty(s.cumulative_average) || !isEmpty(co?.cumulative_average);

      return hasTerms || hasCurrent || hasCumTotal || hasCumAvg;
    });
  }, [isV2, term_result]);

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

      // watermark on pdf pages
      if (school_info?.logo) {
        const watermarkWidth = 150;
        const watermarkHeight = 150;
        const stepX = 200;
        const stepY = 200;

        for (let x = -100; x < imgWidth; x += stepX) {
          for (let y = -100; y < pageHeight; y += stepY) {
            pdf.addImage(
              school_info.logo,
              "PNG",
              x,
              y,
              watermarkWidth,
              watermarkHeight,
              undefined,
              "FAST"
            );
          }
        }
      }

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
                <div
                  id="result-sheet"
                  style={{
                    width: "680px",
                    margin: "auto",
                    padding: "15px",
                    background: themeBg,
                    fontFamily: "Arial",
                    fontSize: "12px",
                    border: `3px solid ${themePrimary}`,
                    borderRadius: "8px",
                    boxSizing: "border-box",
                    position: "relative",
                    overflow: "hidden",
                    color: "#111827",
                  }}
                >
                  {/* Watermark */}
                  {school_info?.logo && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        backgroundImage: `url(${school_info.logo})`,
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
                        display: "flex",
                        alignItems: "center",
                        borderBottom: `2px solid ${themePrimary}`,
                        paddingBottom: "8px",
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
                          {summary?.term} REPORT SHEET
                        </h2>
                      </div>

                      {studentPhoto ? (
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
                      ) : (
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
                      )}
                    </div>

                    {/* Student Info */}
                    <div style={{ marginTop: "10px", border: `1px solid ${themePrimary}`, padding: "8px" }}>
                      <h3 style={{ margin: "0 0 8px 0", textAlign: "center", color: themePrimary }}>
                        STUDENT INFORMATION
                      </h3>

                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div>
                          <p>
                            <strong style={{ color: themePrimary }}>Name:</strong>{" "}
                            {studentFullName || "N/A"}
                          </p>
                          <p>
                            <strong style={{ color: themePrimary }}>Gender:</strong>{" "}
                            {getValue(user?.sex, "N/A")}
                          </p>
                          <p>
                            <strong style={{ color: themePrimary }}>DOB:</strong>{" "}
                            {getValue(user?.dob, "N/A")}
                          </p>
                        </div>

                        <div>
                          <p>
                            <strong style={{ color: themePrimary }}>Admission No:</strong>{" "}
                            {getValue(user?.reg_no, regNo.trim())}
                          </p>
                          <p>
                            <strong style={{ color: themePrimary }}>Class:</strong>{" "}
                            {getValue(data.class_name, "N/A")}
                          </p>
                          <p>
                            <strong style={{ color: themePrimary }}>Session:</strong>{" "}
                            {getValue(summary?.session, "N/A")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div
                      style={{
                        marginTop: "10px",
                        border: `1px solid ${themePrimary}`,
                        display: "flex",
                        padding: "8px",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <p>
                          <strong style={{ color: themePrimary }}>Term:</strong>{" "}
                          {getValue(summary?.term, "N/A")}
                        </p>
                        <p>
                          <strong style={{ color: themePrimary }}>Class Size:</strong>{" "}
                          {getValue(summary?.class_size, "N/A")}
                        </p>
                        <p>
                          <strong style={{ color: themePrimary }}>Position:</strong>{" "}
                          {getValue(summary?.position, "N/A")}
                        </p>
                      </div>

                      <div style={{ flex: 1 }}>
                        <p>
                          <strong style={{ color: themePrimary }}>Times Open:</strong>{" "}
                          {getValue(summary?.school_open, "N/A")}{" "}
                          {!isEmpty(summary?.school_open) ? "Days" : ""}
                        </p>
                        <p>
                          <strong style={{ color: themePrimary }}>Present:</strong>{" "}
                          {getValue(summary?.no_present, "N/A")}{" "}
                          {!isEmpty(summary?.no_present) ? "Days" : ""}
                        </p>
                        <p>
                          <strong style={{ color: themePrimary }}>Absent:</strong>{" "}
                          {getValue(summary?.no_absent, "N/A")}{" "}
                          {!isEmpty(summary?.no_absent) ? "Days" : ""}
                        </p>
                      </div>

                      <div style={{ flex: 1 }}>
                        <p>
                          <strong style={{ color: themePrimary }}>Resumption Date:</strong>{" "}
                          {summary?.resumption_date
                            ? new Date(summary.resumption_date).toLocaleDateString("en-GB")
                            : "N/A"}
                        </p>
                        <p>
                          <strong style={{ color: themePrimary }}>Average:</strong>{" "}
                          {getValue(summary?.total_average, "N/A")}
                        </p>
                        <p>
                          <strong style={{ color: themePrimary }}>Grade:</strong>{" "}
                          {getValue(summary?.total_grade, "N/A")}
                        </p>
                      </div>
                    </div>

                    {/* Academic Performance */}
                    <h3 style={{ textAlign: "center", marginTop: "12px", color: themePrimary }}>
                      ACADEMIC PERFORMANCE
                    </h3>

                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                      <thead>
                        <tr style={{ background: themePrimary, color: headerTextColor }}>
                          <th style={thStyle}>Subject</th>

                          {Array.from({ length: maxCAColumns }).map((_, i) => (
                            <th key={i} style={thStyle}>
                              CA ({caColumnValue || 0})
                            </th>
                          ))}

                          <th style={thStyle}>Exam (60)</th>
                          <th style={thStyle}>Total</th>

                          {/* ✅ V2 carry columns */}
                          {isV2 && showV2CarryCols && (
                            <>
                              {v2CarryTermNames.map((t) => (
                                <th key={t} style={thStyle}>
                                  {t}
                                </th>
                              ))}
                              <th style={thStyle}>Cum Total</th>
                              <th style={thStyle}>Cum Avg</th>
                            </>
                          )}

                          {/* Legacy columns */}
                          {!hideSecondTerm && <th style={thStyle}>Second Term</th>}
                          {!hideCummAvgLegacy && <th style={thStyle}>Cumm Avg</th>}

                          {!hideGrade && <th style={thStyle}>Grade</th>}
                          {!hideRemark && <th style={thStyle}>Remark</th>}
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

                              {/* ✅ V2 carry values */}
                              {isV2 && showV2CarryCols && (
                                <>
                                  {v2CarryTermNames.map((t) => {
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

                                  <td style={tdStyle}>
                                    {getValue(
                                      (subject as V2SubjectResult).cumulative_total ??
                                        (parseCarry((subject as V2SubjectResult).carry_over_json)
                                          ?.cumulative_total ??
                                          (subject as V2SubjectResult).carry_over?.cumulative_total),
                                      ""
                                    )}
                                  </td>

                                  <td style={tdStyle}>
                                    {getValue(
                                      (subject as V2SubjectResult).cumulative_average ??
                                        (parseCarry((subject as V2SubjectResult).carry_over_json)
                                          ?.cumulative_average ??
                                          (subject as V2SubjectResult).carry_over?.cumulative_average),
                                      ""
                                    )}
                                  </td>
                                </>
                              )}

                              {/* Legacy values */}
                              {!hideSecondTerm && (
                                <td style={tdStyle}>{legacySubject.secondterm || ""}</td>
                              )}
                              {!hideCummAvgLegacy && (
                                <td style={tdStyle}>{legacySubject.average || ""}</td>
                              )}

                              {!hideGrade && <td style={tdStyle}>{(subject as any).grade || ""}</td>}
                              {!hideRemark && (
                                <td style={tdStyle}>{(subject as any).remark || ""}</td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Domains */}
                    {((data.affective_domains || []).length > 0 ||
                      (data.psychomotor_domains || []).length > 0) && (
                      <div style={{ display: "flex", marginTop: "12px", gap: "10px" }}>
                        {(data.affective_domains || []).length > 0 && (
                          <div style={{ flex: 1 }}>
                            <h4 style={{ textAlign: "center", color: themePrimary }}>
                              Affective Domain
                            </h4>
                            <table style={domainTableStyle}>
                              <tbody>
                                {(data.affective_domains || []).map((row, i) => (
                                  <tr key={i}>
                                    <td style={tdStyle}>{row.domain}</td>
                                    <td style={tdStyle}>{row.rating}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {(data.psychomotor_domains || []).length > 0 && (
                          <div style={{ flex: 1 }}>
                            <h4 style={{ textAlign: "center", color: themePrimary }}>
                              Psychomotor Skills
                            </h4>
                            <table style={domainTableStyle}>
                              <tbody>
                                {(data.psychomotor_domains || []).map((row, i) => (
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

                    {/* Remarks */}
                    <div style={{ marginTop: "12px" }}>
                      <p>
                        <strong style={{ color: themePrimary }}>Teacher's Remark:</strong>{" "}
                        {getValue(summary?.class_teacher_comment, "")}
                      </p>
                      <p>
                        <strong style={{ color: themePrimary }}>Principal's Remark:</strong>{" "}
                        {getValue(summary?.principal_comment, "")}
                      </p>

                      <p>
                        <strong style={{ color: themePrimary }}>Overall:</strong>{" "}
                        {getValue(summary?.total_average, "N/A")} •{" "}
                        <span
                          style={{
                            background: themeSecondary,
                            padding: "2px 6px",
                            borderRadius: 6,
                            border: `1px solid ${themePrimary}`,
                            fontWeight: 700,
                          }}
                        >
                          Grade: {getValue(summary?.total_grade, "N/A")}
                        </span>{" "}
                        • Status: {getValue(summary?.general_remark, "N/A")}
                      </p>
                    </div>

                    {/* Signature + QR */}
                    <div
                      style={{
                        marginTop: "20px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <img
                          src={
                            school_info?.principal_signature ||
                            "https://via.placeholder.com/120x60?text=Signature"
                          }
                          alt="Principal Signature"
                          style={{
                            width: "120px",
                            height: "60px",
                            objectFit: "contain",
                          }}
                        />
                        <p style={{ margin: 0, color: themePrimary, fontWeight: 700 }}>
                          Principal Signature
                        </p>
                      </div>

                      <div style={{ textAlign: "center" }}>
                        {qrDataUrl && (
                          <img
                            src={qrDataUrl}
                            alt="QR Code"
                            style={{ width: "100px", height: "100px" }}
                          />
                        )}
                        <p style={{ margin: 0, color: themePrimary, fontWeight: 700 }}>
                          Verify Result
                        </p>
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