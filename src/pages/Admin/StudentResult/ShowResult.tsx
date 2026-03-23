// src/pages/Results/ShowResult.tsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authApi } from "../../../utils/axios";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
import PageTitle from "../../../components/PageTitle";

/** -----------------------------
 * Types
 * ----------------------------- */

// Types for V2 format
interface V2Average {
  id: number;
  user_id: number;
  class_id: number;
  term: string;
  session: string;
  total_average: string | number;
  total_grade: string;
  position: string | number;
  class_size: string | number;
  no_present?: string | number;
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

// Types for Legacy format
interface LegacyUser {
  id: number;
  reg_no: string;
  surname: string;
  firstname: string;
  third_name?: string;
  sex: string;
  dob: string;
}

interface LegacyAverage {
  id: number;
  user_id: number;
  class_id: number;
  term: string;
  session: string;
  total_average: number;
  total_grade: string;
  position: number;
  class_size: number;
  no_present: number;
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
  subject: {
    id: number;
    name: string;
  };
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

  // ✅ Theme colors from backend
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

// Unified interface
interface ReportCardData {
  source: "v2" | "legacy";
  user: LegacyUser;
  user_photo_base64?: string;
  average: V2Average | LegacyAverage;
  term_result: (V2SubjectResult | LegacyTermResult)[];
  class_name: string;
  school_info: SchoolInfo;
  affective_domains: AffectiveDomain[];
  psychomotor_domains: PsychomotorDomain[];
}

/** -----------------------------
 * Component
 * ----------------------------- */

export default function ShowResult() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportCardData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const { studentId, classId, term, session, schoolId } = location.state || {};

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

  // Basic contrast helper for header text
  const getTextColor = (bg: string) => {
    const hex = (bg || "").replace("#", "");
    if (hex.length !== 6) return "#fff";
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 140 ? "#111827" : "#fff";
  };

  useEffect(() => {
    if (!studentId || !classId || !term || !session || !schoolId) {
      alert("Missing parameters.");
      navigate("/students-results");
      return;
    }

    const fetchData = async () => {
      setFetching(true);
      try {
        const params = new URLSearchParams({
          school_id: schoolId.toString(),
          class_id: classId.toString(),
          student_id: studentId.toString(),
          term: term,
          session: session,
        });

        const res = await authApi.get(`/report-card?${params.toString()}`);
        setData(res.data);

        const qrPayload = {
          studentId: res.data.user.id,
          reg_no: res.data.user.reg_no,
          term,
          session,
        };

        const encodedPayload = encodeURIComponent(JSON.stringify(qrPayload));
        const verificationBaseUrl = "https://gradequest.com.ng";
        const verificationUrl = `${verificationBaseUrl}/verify-result?data=${encodedPayload}`;

        const generatedQR = await QRCode.toDataURL(verificationUrl);
        setQrDataUrl(generatedQR);
      } catch (err: any) {
        console.error(err);
        alert(err.response?.data?.message || "Failed to fetch result");
        navigate("/students-results");
      } finally {
        setFetching(false);
      }
    };

    fetchData();
  }, [studentId, classId, term, session, schoolId, navigate]);

  if (fetching) return <p>Loading result...</p>;
  if (!data) return null;

  const user = data.user;
  const studentPhoto = data.user_photo_base64;
  const school_info = data.school_info;
  const affective_domains = data.affective_domains || [];
  const psychomotor_domains = data.psychomotor_domains || [];
  const class_name = data.class_name || "N/A";
  const term_result = data.term_result;
  const summary = data.average;
  const isV2 = data.source === "v2";

  // ✅ Theme colors from backend
  const themePrimary = school_info?.primary_color || "#0d47a1";
  const themeSecondary = school_info?.secondary_color || "#ffc107";
  const themeBg = school_info?.background_color || "#ffffff";
  const headerTextColor = getTextColor(themePrimary);

  const borderColor = themePrimary;

  // Styles that depend on theme
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

  const currentTermName = (summary as any)?.term || "";

  // collect term names from carry_over.terms across all subjects
  const v2CarryTermNames: string[] = (() => {
    if (!isV2) return [];
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
  })();

  // Determine CA columns
  let caColumnValue = 0;
  for (let subject of term_result) {
    const caArray = parseCA((subject as any).ca);
    if (caArray.length > 0) {
      caColumnValue = Math.round(40 / caArray.length);
      break;
    }
  }

  const maxCAColumns = Math.max(...term_result.map((s) => parseCA((s as any).ca).length), 0);

  // Legacy-only columns visibility
  const hasLegacyColumns = !isV2 && term_result.length > 0;
  const hideSecondTerm = hasLegacyColumns
    ? (term_result as LegacyTermResult[]).every((s) => isEmpty(s.secondterm))
    : true;
  const hideCummAvgLegacy = hasLegacyColumns
    ? (term_result as LegacyTermResult[]).every((s) => isEmpty(s.average))
    : true;

  const hideGrade = term_result.every((s: any) => isEmpty(s.grade));
  const hideRemark = term_result.every((s: any) => isEmpty(s.remark));

  // ✅ V2 carry columns (show only if any row truly has carry content)
  const v2Rows = isV2 ? (term_result as V2SubjectResult[]) : [];
  const showV2CarryCols =
    isV2 &&
    v2Rows.some((s) => {
      const enabled = s.carry_over?.enabled || isCarryEnabled(s);
      if (!enabled) return false;

      const co = parseCarry(s.carry_over_json) ?? s.carry_over;
      const hasTerms = !!co?.terms && Object.keys(co.terms).length > 0;
      const hasCurrent = !!co?.current_term && Object.keys(co.current_term).length > 0;

      const hasCumTotal = !isEmpty(s.cumulative_total) || !isEmpty(co?.cumulative_total);
      const hasCumAvg = !isEmpty(s.cumulative_average) || !isEmpty(co?.cumulative_average);

      return hasTerms || hasCurrent || hasCumTotal || hasCumAvg;
    });

  const downloadPDF = async () => {
    if (!data) return;
    setLoading(true);
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
      if (school_info.logo) {
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
      pdf.save(`Result_${user.reg_no || studentId}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
   
    <>
     <PageTitle title="Show Result" />
    <div style={{ padding: "10px" }}>
      {/* Top Action Bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 999,
          background: themeBg,
          padding: "10px",
          display: "flex",
          gap: "10px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          borderBottom: `2px solid ${themePrimary}`,
        }}
      >
        <button
          onClick={downloadPDF}
          disabled={loading}
          style={{
            padding: "8px 14px",
            background: themePrimary,
            color: headerTextColor,
            border: `1px solid ${themeSecondary}`,
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          {loading ? "Downloading..." : "📄 Download PDF"}
        </button>
      </div>

      {/* Result Sheet */}
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
        {school_info.logo && (
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
              src={school_info.logo || "https://via.placeholder.com/90x90.png?text=Logo"}
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
                {school_info.name}
              </h1>
              <p style={{ margin: "3px 0" }}>{school_info.address}</p>
              <p style={{ margin: "3px 0" }}>Tel: {school_info.phone}</p>

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
                  <strong style={{ color: themePrimary }}>Name:</strong> {user.surname} {user.firstname}{" "}
                  {user.third_name || ""}
                </p>
                <p>
                  <strong style={{ color: themePrimary }}>Gender:</strong> {user.sex}
                </p>
                <p>
                  <strong style={{ color: themePrimary }}>DOB:</strong> {user.dob}
                </p>
              </div>

              <div>
                <p>
                  <strong style={{ color: themePrimary }}>Admission No:</strong> {user.reg_no}
                </p>
                <p>
                  <strong style={{ color: themePrimary }}>Class:</strong> {class_name}
                </p>
                <p>
                  <strong style={{ color: themePrimary }}>Session:</strong> {(summary as any).session}
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
                <strong style={{ color: themePrimary }}>Term:</strong> {(summary as any).term}
              </p>
              <p>
                <strong style={{ color: themePrimary }}>Class Size:</strong>{" "}
                {getValue((summary as any).class_size, "N/A")}
              </p>
              <p>
                <strong style={{ color: themePrimary }}>Position:</strong>{" "}
                {getValue((summary as any).position, "N/A")}
              </p>
            </div>

            <div style={{ flex: 1 }}>
              <p>
                <strong style={{ color: themePrimary }}>Times Open:</strong>{" "}
                {getValue((summary as any).school_open, "N/A")}{" "}
                {!isEmpty((summary as any).school_open) ? "Days" : ""}
              </p>
              <p>
                <strong style={{ color: themePrimary }}>Present:</strong>{" "}
                {getValue((summary as any).no_present, "N/A")}{" "}
                {!isEmpty((summary as any).no_present) ? "Days" : ""}
              </p>
            </div>

            <div style={{ flex: 1 }}>
              <p>
                <strong style={{ color: themePrimary }}>Resumption Date:</strong>{" "}
                {(summary as any).resumption_date
                  ? new Date((summary as any).resumption_date).toLocaleDateString("en-GB")
                  : "N/A"}
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
                    CA ({caColumnValue})
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
                              (parseCarry((subject as V2SubjectResult).carry_over_json)?.cumulative_total ??
                                (subject as V2SubjectResult).carry_over?.cumulative_total),
                            ""
                          )}
                        </td>

                        <td style={tdStyle}>
                          {getValue(
                            (subject as V2SubjectResult).cumulative_average ??
                              (parseCarry((subject as V2SubjectResult).carry_over_json)?.cumulative_average ??
                                (subject as V2SubjectResult).carry_over?.cumulative_average),
                            ""
                          )}
                        </td>
                      </>
                    )}

                    {/* Legacy values */}
                    {!hideSecondTerm && <td style={tdStyle}>{legacySubject.secondterm || ""}</td>}
                    {!hideCummAvgLegacy && <td style={tdStyle}>{legacySubject.average || ""}</td>}

                    {!hideGrade && <td style={tdStyle}>{(subject as any).grade || ""}</td>}
                    {!hideRemark && <td style={tdStyle}>{(subject as any).remark || ""}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Domains */}
          {(affective_domains.length > 0 || psychomotor_domains.length > 0) && (
            <div style={{ display: "flex", marginTop: "12px", gap: "10px" }}>
              {affective_domains.length > 0 && (
                <div style={{ flex: 1 }}>
                  <h4 style={{ textAlign: "center", color: themePrimary }}>Affective Domain</h4>
                  <table style={domainTableStyle}>
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
                <div style={{ flex: 1 }}>
                  <h4 style={{ textAlign: "center", color: themePrimary }}>Psychomotor Skills</h4>
                  <table style={domainTableStyle}>
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

          {/* Remarks */}
          <div style={{ marginTop: "12px" }}>
            <p>
              <strong style={{ color: themePrimary }}>Teacher's Remark:</strong>{" "}
              {getValue((summary as any).class_teacher_comment, "")}
            </p>
            <p>
              <strong style={{ color: themePrimary }}>Principal's Remark:</strong>{" "}
              {getValue((summary as any).principal_comment, "")}
            </p>

            <p>
              <strong style={{ color: themePrimary }}>Overall:</strong>{" "}
              {getValue((summary as any).total_average, "N/A")} •{" "}
              <span
                style={{
                  background: themeSecondary,
                  padding: "2px 6px",
                  borderRadius: 6,
                  border: `1px solid ${themePrimary}`,
                  fontWeight: 700,
                }}
              >
                Grade: {getValue((summary as any).total_grade, "N/A")}
              </span>{" "}
              • Status: {getValue((summary as any).general_remark, "N/A")}
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
                src={school_info.principal_signature || "https://via.placeholder.com/120x60?text=Signature"}
                alt="Principal Signature"
                style={{
                  width: "120px",
                  height: "60px",
                  objectFit: "contain",
                }}
              />
              <p style={{ margin: 0, color: themePrimary, fontWeight: 700 }}>Principal Signature</p>
            </div>

            <div style={{ textAlign: "center" }}>
              {qrDataUrl && (
                <img src={qrDataUrl} alt="QR Code" style={{ width: "100px", height: "100px" }} />
              )}
              <p style={{ margin: 0, color: themePrimary, fontWeight: 700 }}>Verify Result</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
