import { useEffect, useMemo, useRef, useState, FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import PageTitle from "../../../components/PageTitle";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
import { getAppBaseUrl } from "../../../utils/apiUrl";

type Student = {
  id: number;
  reg_no: string;
  firstname: string;
  surname: string;
  othername?: string | null;
  photo?: string | null;
  gender?: string | null;
  school_id: number;
  level_id?: number | null;
  department_id?: number | null;
  level?: { id: number; name: string } | null;
  department?: { id: number; name: string } | null;
  section?: { id: number; name: string } | null;
};

type Subject = {
  id: number;
  name: string;
  code?: string;
};

type OptionItem = {
  id: number;
  name: string;
};

type SubjectRow = {
  subject_id: number;
  subject_name: string;
  ca: Record<string, number | string>;
  exam: number | string;
  total: number;
  grade: string;
  remark: string;
  firstterm?: number | string;
  secondterm?: number | string;
  average?: number | string;
};

type SummaryState = {
  total_grade: string;
  principal_comment: string;
  class_teacher_comment: string;
  total_average: number | string;
  school_open: number | string;
  school_close: number | string;
  no_present: number | string;
  no_absent: number | string;
  general_remark: string;
  resumption_date: string;
  class_teacher: string;
  class_size: number | string;
  position: string;
};

type RatingsState = {
  punctuality: number;
  attendance: number;
  neatness: number;
  politeness: number;
  honesty: number;
  relationship_with_others: number;
  leadership: number;
  emotional_stability: number;
  sports: number;
  handwriting: number;
  crafts: number;
  music: number;
};

interface SchoolInfo {
  name: string;
  address: string;
  phone: string;
  logo?: string | null;
  principal_signature?: string | null;
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
  };
}

const SCORE_TYPES = [
  { label: "10 / 10 / 10 / 10 / 60 (4 CAs + Exam)", value: "10/10/10/10/60", caCount: 4, caMax: 10, examMax: 60 },
  { label: "20 / 20 / 60 (2 CAs + Exam)", value: "20/20/60", caCount: 2, caMax: 20, examMax: 60 },
  { label: "40 / 60 (1 CA + Exam)", value: "40/60", caCount: 1, caMax: 40, examMax: 60 },
  { label: "30 / 70 (1 CA + Exam)", value: "30/70", caCount: 1, caMax: 30, examMax: 70 },
];

function getGradeAndRemark(total: number) {
  if (total >= 75) return { grade: "A1", remark: "Distinction" };
  if (total >= 70) return { grade: "B2", remark: "Very Good" };
  if (total >= 65) return { grade: "B3", remark: "Good" };
  if (total >= 60) return { grade: "C4", remark: "Credit" };
  if (total >= 55) return { grade: "C5", remark: "Credit" };
  if (total >= 50) return { grade: "C6", remark: "Credit" };
  if (total >= 45) return { grade: "D7", remark: "Pass" };
  if (total >= 40) return { grade: "E8", remark: "Pass" };
  return { grade: "F9", remark: "Fail" };
}

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

export default function AdminStudentResultLookupPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // Search States
  const [searchRegNo, setSearchRegNo] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("First Term");
  const [selectedClassId, setSelectedClassId] = useState<number | string>("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  // Lookup Result Data
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [studentPhotoBase64, setStudentPhotoBase64] = useState<string | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>({
    name: "GradiosEdu Academic Partner School",
    address: "Academic Campus",
    phone: "",
    primary_color: "#0d47a1",
    secondary_color: "#ffc107",
    background_color: "#ffffff",
  });
  const [resultTemplate, setResultTemplate] = useState<ResultTemplateSetting | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const [sessions, setSessions] = useState<OptionItem[]>([]);
  const [terms, setTerms] = useState<OptionItem[]>([]);
  const [classes, setClasses] = useState<OptionItem[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);

  // Editor States
  const [scoreType, setScoreType] = useState("40/60");
  const [rows, setRows] = useState<SubjectRow[]>([]);
  const [summary, setSummary] = useState<SummaryState>({
    total_grade: "",
    principal_comment: "",
    class_teacher_comment: "",
    total_average: 0,
    school_open: 110,
    school_close: 0,
    no_present: 105,
    no_absent: 5,
    general_remark: "",
    resumption_date: "",
    class_teacher: "",
    class_size: 30,
    position: "",
  });

  const [ratings, setRatings] = useState<RatingsState>({
    punctuality: 4,
    attendance: 4,
    neatness: 5,
    politeness: 4,
    honesty: 5,
    relationship_with_others: 4,
    leadership: 4,
    emotional_stability: 4,
    sports: 3,
    handwriting: 4,
    crafts: 4,
    music: 3,
  });

  const activeScoreConfig = useMemo(() => {
    return SCORE_TYPES.find((s) => s.value === scoreType) || SCORE_TYPES[2];
  }, [scoreType]);

  // Read URL query params on load or preload initial dropdowns
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qReg = params.get("reg_no");
    const qSession = params.get("session");
    const qTerm = params.get("term");
    const qClass = params.get("class_id");

    if (qReg) setSearchRegNo(qReg);
    if (qSession) setSelectedSession(qSession);
    if (qTerm) setSelectedTerm(qTerm);
    if (qClass) setSelectedClassId(qClass);

    if (qReg) {
      handleLookup(qReg, qSession || undefined, qTerm || undefined, qClass || undefined);
    } else {
      // Preload initial dropdown options fast
      authApi
        .get("/admin/student-result-lookup")
        .then(({ data }) => {
          if (data.sessions?.length) setSessions(data.sessions);
          if (data.terms?.length) setTerms(data.terms);
          if (data.classes?.length) setClasses(data.classes);
          if (data.current_session) setSelectedSession((prev) => prev || data.current_session);
          if (data.current_term) setSelectedTerm((prev) => prev || data.current_term);
          if (data.current_class_id) setSelectedClassId((prev) => prev || data.current_class_id);
        })
        .catch(() => undefined);
    }
  }, [location.search]);

  // Core Lookup Handler
  const handleLookup = async (
    regNoToSearch?: string,
    overrideSession?: string,
    overrideTerm?: string,
    overrideClass?: string | number
  ) => {
    const reg = (regNoToSearch || searchRegNo).trim();
    if (!reg) {
      showError("Please enter a student registration number / admission number.");
      return;
    }

    setLoading(true);
    try {
      const sess = overrideSession ?? selectedSession;
      const t = overrideTerm ?? selectedTerm;
      const c = overrideClass ?? selectedClassId;

      const { data } = await authApi.get("/admin/student-result-lookup", {
        params: {
          reg_no: reg,
          ...(sess ? { session: sess } : {}),
          ...(t ? { term: t } : {}),
          ...(c ? { class_id: c } : {}),
        },
      });

      const st: Student = data.student;
      setStudent(st);
      if (data.sessions?.length) setSessions(data.sessions);
      if (data.terms?.length) setTerms(data.terms);
      if (data.classes?.length) setClasses(data.classes);
      if (data.subjects?.length) setAllSubjects(data.subjects);

      const resolvedSession = data.current_session || sess || (data.sessions?.[0]?.name ?? "2025/2026");
      const resolvedTerm = data.current_term || t || (data.terms?.[0]?.name ?? "First Term");
      const resolvedClassId = data.current_class_id || c || st.level_id || (data.classes?.[0]?.id ?? "");

      setSelectedSession(resolvedSession);
      setSelectedTerm(resolvedTerm);
      setSelectedClassId(resolvedClassId);

      if (data.score_type) {
        setScoreType(data.score_type);
      }

      // Populate Existing Results or Template
      const existingResults = data.results || [];
      const subjectsList: Subject[] = data.subjects || [];

      if (existingResults.length > 0) {
        const mappedRows: SubjectRow[] = existingResults.map((r: any) => {
          let caObj: Record<string, number | string> = {};
          try {
            const rawCa = typeof r.ca === "string" ? JSON.parse(r.ca) : r.ca || {};
            if (typeof rawCa === "number") {
              caObj = { ca1: rawCa };
            } else if (typeof rawCa === "object" && rawCa !== null) {
              const keys = Object.keys(rawCa);
              const hasCa0 = keys.includes("ca0") || (keys.includes("0") && !keys.includes("ca1"));
              keys.forEach((k) => {
                const val = rawCa[k] !== null && rawCa[k] !== undefined && rawCa[k] !== "" ? Number(rawCa[k]) : "";
                if (k === "ca0" || k === "0") {
                  caObj["ca1"] = val;
                } else if (k === "ca1" || k === "1") {
                  caObj[hasCa0 ? "ca2" : "ca1"] = val;
                } else if (k === "ca2" || k === "2") {
                  caObj[hasCa0 ? "ca3" : "ca2"] = val;
                } else if (k === "ca3" || k === "3") {
                  caObj[hasCa0 ? "ca4" : "ca3"] = val;
                } else if (k === "ca4" || k === "4") {
                  caObj["ca4"] = val;
                } else {
                  caObj[k] = val;
                }
              });
              if (Object.keys(caObj).length === 0 && keys.length > 0) {
                caObj["ca1"] = Number(rawCa[keys[0]]) || 0;
              }
            }
          } catch {
            caObj = {};
          }

          const examVal = r.exam !== null && r.exam !== undefined && r.exam !== "" ? Number(r.exam) : "";
          const totalVal = r.total !== null && r.total !== undefined ? Number(r.total) : 0;
          const { grade, remark } = getGradeAndRemark(totalVal);

          return {
            subject_id: r.subject_id,
            subject_name: r.subject?.name || `Subject #${r.subject_id}`,
            ca: caObj,
            exam: examVal,
            total: totalVal,
            grade: r.grade || grade,
            remark: r.remark || remark,
            firstterm: r.firstterm ?? "",
            secondterm: r.secondterm ?? "",
            average: r.average ?? "",
          };
        });
        setRows(mappedRows);
      } else {
        // Build initial empty rows from class subjects
        const initialRows: SubjectRow[] = subjectsList.map((sb) => ({
          subject_id: sb.id,
          subject_name: sb.name,
          ca: {},
          exam: "",
          total: 0,
          grade: "-",
          remark: "-",
        }));
        setRows(initialRows);
      }

      // Populate Summary
      if (data.average) {
        const avg = data.average;
        setSummary({
          total_grade: avg.total_grade || "",
          principal_comment: avg.principal_comment || "",
          class_teacher_comment: avg.class_teacher_comment || "",
          total_average: avg.total_average ?? 0,
          school_open: avg.school_open ?? 110,
          school_close: avg.school_close ?? 0,
          no_present: avg.no_present ?? 105,
          no_absent: avg.no_absent ?? 5,
          general_remark: avg.general_remark || "",
          resumption_date: avg.resumption_date || "",
          class_teacher: avg.class_teacher || "",
          class_size: avg.class_size ?? 30,
          position: avg.position || "",
        });
      } else {
        setSummary((prev) => ({
          ...prev,
          total_average: 0,
          total_grade: "",
          position: "",
        }));
      }

      // Populate Ratings
      if (data.ratings) {
        const rat = data.ratings;
        setRatings({
          punctuality: Number(rat.punctuality) || 4,
          attendance: Number(rat.attendance) || 4,
          neatness: Number(rat.neatness) || 5,
          politeness: Number(rat.politeness) || 4,
          honesty: Number(rat.honesty) || 5,
          relationship_with_others: Number(rat.relationship_with_others) || 4,
          leadership: Number(rat.leadership) || 4,
          emotional_stability: Number(rat.emotional_stability) || 4,
          sports: Number(rat.sports) || 3,
          handwriting: Number(rat.handwriting) || 4,
          crafts: Number(rat.crafts) || 4,
          music: Number(rat.music) || 3,
        });
      }

      // Populate School Branding & Template
      if (data.school_info) {
        setSchoolInfo(data.school_info);
      }
      if (data.result_template) {
        setResultTemplate(data.result_template);
      }
      if (data.student_photo_base64) {
        setStudentPhotoBase64(data.student_photo_base64);
      }

      // Generate Verification QR Code
      const qrPayload = {
        studentId: st.id,
        reg_no: st.reg_no,
        term: resolvedTerm,
        session: resolvedSession,
      };
      const encodedPayload = encodeURIComponent(JSON.stringify(qrPayload));
      const verificationBaseUrl = getAppBaseUrl();
      const verificationUrl = `${verificationBaseUrl}/verify-result?data=${encodedPayload}&reg_no=${encodeURIComponent(
        st.reg_no || ""
      )}&term=${encodeURIComponent(resolvedTerm)}&session=${encodeURIComponent(resolvedSession)}`;
      QRCode.toDataURL(verificationUrl).then(setQrDataUrl).catch(() => undefined);

      // Update URL search query cleanly
      navigate(
        `/results/student-editor?reg_no=${encodeURIComponent(reg)}&session=${encodeURIComponent(
          resolvedSession
        )}&term=${encodeURIComponent(resolvedTerm)}&class_id=${resolvedClassId}`,
        { replace: true }
      );
      showSuccess(`Loaded academic record for ${st.firstname} ${st.surname} (${st.reg_no})`);
    } catch (e: any) {
      showError(e.response?.data?.message || "Student record could not be loaded. Please verify the Reg No.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!student) return;
    setDownloadingPdf(true);
    try {
      const sheet = document.getElementById("admin-result-sheet");
      if (!sheet) return;
      const canvas = await html2canvas(sheet, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");
      const imgWidth = 595.28;
      const pageHeight = 841.89;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
      pdf.save(`Result_${student.reg_no || student.id}.pdf`);
      showSuccess("Downloaded official result sheet PDF!");
    } catch (err) {
      console.error(err);
      showError("Unable to export PDF. Please try printing directly.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Recalculate row totals & overall average
  const handleScoreChange = (index: number, field: "ca" | "exam", caKey?: string, value?: string | number) => {
    const updated = [...rows];
    const target = { ...updated[index] };

    if (field === "ca" && caKey) {
      const num = value === "" || value === undefined ? 0 : Number(value);
      target.ca = { ...target.ca, [caKey]: num };
    } else if (field === "exam") {
      target.exam = value === "" || value === undefined ? "" : Number(value);
    }

    // Sum CAs
    const caSum = Object.values(target.ca).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
    const examNum = Number(target.exam) || 0;
    const newTotal = Math.min(100, Math.max(0, caSum + examNum));
    const { grade, remark } = getGradeAndRemark(newTotal);

    target.total = newTotal;
    target.grade = grade;
    target.remark = remark;
    updated[index] = target;

    setRows(updated);
    recalcSummary(updated);
  };

  const recalcSummary = (currentRows: SubjectRow[]) => {
    const validRows = currentRows.filter((r) => r.total > 0 || r.exam !== "");
    if (validRows.length === 0) return;

    const grandTotal = validRows.reduce((acc, r) => acc + r.total, 0);
    const avg = Number((grandTotal / validRows.length).toFixed(1));
    const { grade } = getGradeAndRemark(avg);

    setSummary((prev) => ({
      ...prev,
      total_average: avg,
      total_grade: grade,
    }));
  };

  // Add a new subject row to student
  const handleAddSubject = (subjectId: number) => {
    const sb = allSubjects.find((s) => s.id === subjectId);
    if (!sb) return;
    if (rows.some((r) => r.subject_id === subjectId)) {
      showError("Subject is already present in the result sheet.");
      return;
    }

    const newRow: SubjectRow = {
      subject_id: sb.id,
      subject_name: sb.name,
      ca: {},
      exam: "",
      total: 0,
      grade: "-",
      remark: "-",
    };
    const updated = [...rows, newRow];
    setRows(updated);
    recalcSummary(updated);
    showSuccess(`Added ${sb.name} to student score sheet.`);
  };

  const handleRemoveSubject = (index: number) => {
    const target = rows[index];
    const updated = rows.filter((_, i) => i !== index);
    setRows(updated);
    recalcSummary(updated);
    showSuccess(`Removed ${target.subject_name}`);
  };

  // AI Comment Generator helper
  const handleAiCommentSuggest = () => {
    if (!student) return;
    const avg = Number(summary.total_average) || 0;
    let teacher = "";
    let principal = "";

    if (avg >= 75) {
      teacher = `${student.firstname} has shown exceptional brilliance and consistency throughout this academic term. Highly commendable performance!`;
      principal = `An outstanding academic result. Keep up the high intellectual curiosity and dedication to excellence.`;
    } else if (avg >= 60) {
      teacher = `${student.firstname} is a dedicated and hardworking student with strong analytical potential. Good performance overall.`;
      principal = `A very commendable term report. With further effort in continuous assessments, top honours can be achieved.`;
    } else if (avg >= 50) {
      teacher = `${student.firstname} possesses steady academic capabilities but needs more focus and active revision during study periods.`;
      principal = `A satisfactory result with clear room for significant improvement. Focus on weaker subject areas next term.`;
    } else {
      teacher = `${student.firstname} requires intensive tutorial attention and close supervision in continuous class assessments.`;
      principal = `Performance is below required academic standards. Urgent remedial support and focused studying recommended.`;
    }

    setSummary((prev) => ({
      ...prev,
      class_teacher_comment: teacher,
      principal_comment: principal,
      general_remark: avg >= 50 ? "Promoted with Credit" : "Advised to work harder",
    }));
    showSuccess("Generated intelligent academic remarks based on student average.");
  };

  // Save / Update Student Result
  const handleSaveResult = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!student) {
      showError("Please look up a student first before saving.");
      return;
    }

    if (rows.length === 0) {
      showError("Please add at least one subject to the score sheet.");
      return;
    }

    setSaving(true);
    try {
      const payloadResults = rows.map((r) => ({
        subject_id: r.subject_id,
        ca: JSON.stringify(r.ca),
        exam: r.exam === "" ? 0 : Number(r.exam),
        total: r.total,
        grade: r.grade,
        remark: r.remark,
        firstterm: r.firstterm ? Number(r.firstterm) : null,
        secondterm: r.secondterm ? Number(r.secondterm) : null,
        average: r.average ? Number(r.average) : null,
      }));

      const payloadSummary = {
        total_grade: summary.total_grade,
        principal_comment: summary.principal_comment,
        class_teacher_comment: summary.class_teacher_comment,
        total_average: Number(summary.total_average) || 0,
        school_open: Number(summary.school_open) || 0,
        school_close: Number(summary.school_close) || 0,
        no_present: Number(summary.no_present) || 0,
        no_absent: Number(summary.no_absent) || 0,
        general_remark: summary.general_remark,
        resumption_date: summary.resumption_date || null,
        class_teacher: summary.class_teacher,
        class_size: Number(summary.class_size) || 0,
      };

      // 1. Save or update results
      await authApi.put(
        `/update-result/${student.id}/${encodeURIComponent(selectedSession)}/${selectedClassId}/${encodeURIComponent(
          selectedTerm
        )}`,
        {
          results: payloadResults,
          summary: payloadSummary,
        }
      );

      // 2. Save domain ratings safely if student belongs to school
      if (student.school_id) {
        await authApi
          .post("/save-ratings", {
            user_id: student.id,
            school_id: student.school_id,
            affective: [
              { id: 1, rate: ratings.punctuality || 4 },
              { id: 2, rate: ratings.attendance || 4 },
              { id: 3, rate: ratings.neatness || 5 },
              { id: 4, rate: ratings.politeness || 4 },
              { id: 5, rate: ratings.honesty || 5 },
            ],
            psychomotor: [
              { id: 1, rate: ratings.sports || 3 },
              { id: 2, rate: ratings.crafts || 4 },
              { id: 3, rate: ratings.music || 3 },
            ],
          })
          .catch(() => undefined);
      }

      showSuccess(`Successfully saved and computed results for ${student.firstname} ${student.surname}!`);
      // Reload lookup to ensure database synchronization
      handleLookup(student.reg_no, selectedSession, selectedTerm, selectedClassId);
    } catch (e: any) {
      showError(e.response?.data?.message || "Unable to save student result. Please review inputs.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-result-editor-layout">
      <PageTitle title="Student Result Lookup & Editor | GradiosEdu" />

      <style>{`
        .db-main {
          min-height: 100vh;
          margin-left: 280px;
          width: calc(100% - 280px);
          padding: max(96px, calc(78px + env(safe-area-inset-top))) 28px 48px;
          background: #F8FAFC;
          color: #0F172A;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        }

        @media (max-width: 1199px) {
          .db-main {
            margin-left: 0;
            width: 100%;
            padding: max(88px, calc(72px + env(safe-area-inset-top))) 16px 32px;
          }
        }

        /* Hero Banner */
        .re-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 20px;
          padding: 32px 36px;
          position: relative;
          overflow: hidden;
          margin-bottom: 28px;
          box-shadow: 0 12px 35px -5px rgba(15, 39, 68, 0.18);
          color: #FFFFFF;
        }
        .re-hero-glow {
          position: absolute;
          top: -90px;
          right: -40px;
          width: 380px;
          height: 380px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.20), transparent 70%);
          pointer-events: none;
        }
        .re-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
        }
        .re-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11.5px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #FBBF24;
          background: rgba(217, 119, 6, 0.22);
          border: 1px solid rgba(217, 119, 6, 0.40);
          border-radius: 999px;
          padding: 5px 14px;
          margin-bottom: 12px;
        }
        .re-title {
          font-size: 26px;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
        }
        .re-title em {
          color: #FBBF24;
          font-style: normal;
        }
        .re-sub {
          font-size: 13.5px;
          color: #CBD5E1;
          line-height: 1.6;
          max-width: 680px;
          margin: 0;
        }
        .re-badge-permanent {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.35);
          color: #34D399;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 999px;
        }

        /* Search Card */
        .re-search-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 18px;
          padding: 24px 28px;
          margin-bottom: 28px;
          box-shadow: 0 4px 20px rgba(15, 39, 68, 0.04);
        }
        .re-input-group {
          display: flex;
          align-items: center;
          background: #F8FAFC;
          border: 1px solid #CBD5E1;
          border-radius: 12px;
          padding: 4px 12px;
          transition: all 0.2s ease;
        }
        .re-input-group:focus-within {
          border-color: #D97706;
          background: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.15);
        }
        .re-input-group input {
          border: none;
          background: transparent;
          outline: none;
          padding: 10px 8px;
          width: 100%;
          font-size: 14.5px;
          font-weight: 600;
          color: #0F172A;
        }
        .re-select {
          background: #F8FAFC;
          border: 1px solid #CBD5E1;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 13.5px;
          font-weight: 600;
          color: #0F172A;
          width: 100%;
          outline: none;
          transition: all 0.2s ease;
        }
        .re-select:focus {
          border-color: #D97706;
          box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.15);
          background: #FFFFFF;
        }
        .re-btn-search {
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
          color: #FFFFFF;
          border: none;
          border-radius: 12px;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
          box-shadow: 0 4px 14px rgba(217, 119, 6, 0.25);
        }
        .re-btn-search:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(217, 119, 6, 0.35);
        }

        /* Student Profile Card */
        .re-profile-bar {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 18px;
          padding: 22px 28px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
          box-shadow: 0 4px 20px rgba(15, 39, 68, 0.04);
        }
        .re-avatar {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          background: #0F2744;
          color: #FBBF24;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 800;
          object-fit: cover;
          border: 2px solid #E2E8F0;
        }
        .re-stat-pill {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 10px 18px;
          text-align: center;
        }
        .re-stat-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748B;
          letter-spacing: 0.04em;
        }
        .re-stat-value {
          font-size: 18px;
          font-weight: 800;
          color: #0F172A;
          margin-top: 2px;
        }

        /* Tabs */
        .re-tab-pill {
          padding: 10px 22px;
          border-radius: 12px;
          font-size: 13.5px;
          font-weight: 700;
          border: 1px solid transparent;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
          background: #F1F5F9;
          color: #475569;
        }
        .re-tab-pill.active {
          background: #0F2744;
          color: #FFFFFF;
          border-color: #0F2744;
          box-shadow: 0 4px 12px rgba(15, 39, 68, 0.15);
        }

        /* Tables & Score Editor */
        .re-table-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 18px;
          overflow: hidden;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(15, 39, 68, 0.04);
        }
        .re-table {
          width: 100%;
          margin: 0;
          border-collapse: collapse;
        }
        .re-table th {
          background: #F8FAFC;
          color: #475569;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 14px 18px;
          border-bottom: 2px solid #E2E8F0;
        }
        .re-table td {
          padding: 12px 18px;
          border-bottom: 1px solid #F1F5F9;
          vertical-align: middle;
          font-size: 13.5px;
        }
        .re-score-input {
          width: 68px;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          font-size: 14px;
          font-weight: 700;
          text-align: center;
          outline: none;
          background: #FFFFFF;
          color: #0F172A;
          transition: all 0.2s ease;
        }
        .re-score-input:focus {
          border-color: #D97706;
          box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.20);
        }
        .re-grade-tag {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 38px;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 800;
        }
        .re-grade-A { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
        .re-grade-B { background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; }
        .re-grade-C { background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; }
        .re-grade-D { background: #FFF7ED; color: #C2410C; border: 1px solid #FED7AA; }
        .re-grade-E { background: #FAF5FF; color: #7E22CE; border: 1px solid #E9D5FF; }
        .re-grade-F { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }

        /* Save Button */
        .re-btn-save {
          background: linear-gradient(135deg, #10B981 0%, #047857 100%);
          color: #FFFFFF;
          border: none;
          border-radius: 12px;
          padding: 14px 28px;
          font-size: 15px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.30);
          transition: all 0.2s ease;
        }
        .re-btn-save:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.40);
        }

        /* Printable Result Sheet Styling */
        .re-print-sheet {
          background: #FFFFFF;
          border: 2px solid #E2E8F0;
          border-radius: 18px;
          padding: 40px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }
        .re-sheet-header {
          text-align: center;
          border-bottom: 2px solid #0F2744;
          padding-bottom: 20px;
          margin-bottom: 24px;
        }
        .re-sheet-school-name {
          font-size: 24px;
          font-weight: 900;
          color: #0F2744;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          margin: 0 0 6px;
        }
        .re-sheet-school-sub {
          font-size: 13px;
          font-weight: 600;
          color: #64748B;
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Student Result Editor" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="db-main d-flex flex-column">
            {/* ═══ HERO BANNER ═══ */}
            <div className="re-hero">
              <div className="re-hero-glow" />
              <div className="re-hero-inner">
                <div>
                  <div className="re-kicker">
                    <i className="bi bi-shield-check" /> Admin Result Command Center
                  </div>
                  <h1 className="re-title">
                    Student Result <em>Search & Quick Editor</em>
                  </h1>
                  <p className="re-sub">
                    Instantly look up any student by Registration / Admission Number to view, audit, modify,
                    recalculate, and print complete terminal academic reports.
                  </p>
                </div>
                <div>
                  <span className="re-badge-permanent">
                    <i className="bi bi-unlock-fill" /> Perpetual Academic Access Active (Sub-Exemption)
                  </span>
                </div>
              </div>
            </div>

            {/* ═══ SEARCH & FILTER CONTROLS ═══ */}
            <div className="re-search-card">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLookup();
                }}
                className="row g-3 align-items-end"
              >
                <div className="col-12 col-md-4">
                  <label className="form-label text-xs fw-bold text-uppercase text-muted">
                    Student Admission / Reg No <span className="text-danger">*</span>
                  </label>
                  <div className="re-input-group">
                    <i className="bi bi-person-badge text-muted fs-5 me-2" />
                    <input
                      type="text"
                      placeholder="e.g. STU/2026/001 or ID"
                      value={searchRegNo}
                      onChange={(e) => setSearchRegNo(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="col-6 col-md-2">
                  <label className="form-label text-xs fw-bold text-uppercase text-muted">Academic Session</label>
                  <select
                    className="re-select"
                    value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value)}
                  >
                    {sessions.length === 0 ? (
                      <option value="2025/2026">2025/2026</option>
                    ) : (
                      sessions.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="col-6 col-md-2">
                  <label className="form-label text-xs fw-bold text-uppercase text-muted">Academic Term</label>
                  <select className="re-select" value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)}>
                    <option value="First Term">First Term</option>
                    <option value="Second Term">Second Term</option>
                    <option value="Third Term">Third Term</option>
                  </select>
                </div>

                <div className="col-6 col-md-2">
                  <label className="form-label text-xs fw-bold text-muted text-uppercase">Class / Level</label>
                  <select
                    className="re-select"
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                  >
                    <option value="">Default Student Class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-6 col-md-2">
                  <button type="submit" className="re-btn-search" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" /> Loading...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-search" /> Load Result
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* ═══ WHEN STUDENT LOADED ═══ */}
            {student ? (
              <>
                {/* Profile Banner */}
                <div className="re-profile-bar">
                  <div className="d-flex align-items-center gap-3">
                    {student.photo ? (
                      <img
                        src={`/uploads/users/${student.photo}`}
                        alt={student.firstname}
                        className="re-avatar"
                        onError={(e) => {
                          (e.target as any).src = "";
                          (e.target as any).className = "re-avatar d-flex align-items-center justify-content-center";
                        }}
                      />
                    ) : (
                      <div className="re-avatar">
                        {student.firstname[0]}
                        {student.surname[0]}
                      </div>
                    )}
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <h3 className="fs-5 fw-bold text-dark m-0">
                          {student.firstname} {student.surname} {student.othername || ""}
                        </h3>
                        <span className="badge bg-primary-subtle text-primary fw-bold text-uppercase px-2 py-1">
                          {student.level?.name || "General"}
                        </span>
                      </div>
                      <div className="d-flex align-items-center gap-3 text-muted text-sm mt-1">
                        <span>
                          <strong>Reg No:</strong> {student.reg_no}
                        </span>
                        <span>&bull;</span>
                        <span>
                          <strong>Dept:</strong> {student.department?.name || "General"}
                        </span>
                        <span>&bull;</span>
                        <span>
                          <strong>Period:</strong> {selectedSession} &bull; {selectedTerm}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-3">
                    <div className="re-stat-pill">
                      <div className="re-stat-label">Term Average</div>
                      <div className="re-stat-value text-primary">{summary.total_average}%</div>
                    </div>
                    <div className="re-stat-pill">
                      <div className="re-stat-label">Grade</div>
                      <div className="re-stat-value text-warning">{summary.total_grade || "-"}</div>
                    </div>
                    <div className="re-stat-pill">
                      <div className="re-stat-label">Position</div>
                      <div className="re-stat-value text-success">{summary.position || "N/A"}</div>
                    </div>
                  </div>
                </div>

                {/* Tab Switcher */}
                <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className={`re-tab-pill ${activeTab === "edit" ? "active" : ""}`}
                      onClick={() => setActiveTab("edit")}
                    >
                      <i className="bi bi-pencil-square" /> Live Score Editor
                    </button>
                    <button
                      type="button"
                      className={`re-tab-pill ${activeTab === "preview" ? "active" : ""}`}
                      onClick={() => setActiveTab("preview")}
                    >
                      <i className="bi bi-file-earmark-text" /> Official Result Sheet Preview
                    </button>
                  </div>

                  {activeTab === "edit" && (
                    <div className="d-flex align-items-center gap-2">
                      <label className="text-xs fw-bold text-muted text-uppercase me-1">CA Scoring Model:</label>
                      <select
                        className="form-select form-select-sm fw-bold border-secondary-subtle"
                        style={{ width: "auto" }}
                        value={scoreType}
                        onChange={(e) => setScoreType(e.target.value)}
                      >
                        {SCORE_TYPES.map((st) => (
                          <option key={st.value} value={st.value}>
                            {st.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* ════ TAB 1: LIVE SCORE EDITOR ════ */}
                {activeTab === "edit" && (
                  <form onSubmit={handleSaveResult}>
                    <div className="re-table-card">
                      <div className="p-3 bg-light border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <div className="fw-bold text-dark fs-6 d-flex align-items-center gap-2">
                          <i className="bi bi-card-checklist text-primary" /> Subject Continuous Assessment & Exam
                          Scores ({rows.length} Subjects)
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <select
                            className="form-select form-select-sm fw-semibold"
                            style={{ width: "220px" }}
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAddSubject(Number(e.target.value));
                                e.target.value = "";
                              }
                            }}
                            defaultValue=""
                          >
                            <option value="" disabled>
                              + Add Additional Subject...
                            </option>
                            {allSubjects
                              .filter((sb) => !rows.some((r) => r.subject_id === sb.id))
                              .map((sb) => (
                                <option key={sb.id} value={sb.id}>
                                  {sb.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>

                      <div className="table-responsive">
                        <table className="re-table">
                          <thead>
                            <tr>
                              <th style={{ width: "40px" }}>#</th>
                              <th>Subject Name</th>
                              {Array.from({ length: activeScoreConfig.caCount }).map((_, caIdx) => (
                                <th key={caIdx} style={{ width: "90px", textAlign: "center" }}>
                                  CA {caIdx + 1} ({activeScoreConfig.caMax})
                                </th>
                              ))}
                              <th style={{ width: "100px", textAlign: "center" }}>
                                Exam ({activeScoreConfig.examMax})
                              </th>
                              <th style={{ width: "90px", textAlign: "center" }}>Total (100)</th>
                              <th style={{ width: "80px", textAlign: "center" }}>Grade</th>
                              <th style={{ width: "130px" }}>Remark</th>
                              <th style={{ width: "60px", textAlign: "center" }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, idx) => {
                              const gradeChar = row.grade?.charAt(0) || "F";
                              return (
                                <tr key={row.subject_id || idx}>
                                  <td className="text-muted fw-bold">{idx + 1}</td>
                                  <td className="fw-bold text-dark">{row.subject_name}</td>
                                  {Array.from({ length: activeScoreConfig.caCount }).map((_, caIdx) => {
                                    const caKey = `ca${caIdx + 1}`;
                                    const currentVal = row.ca?.[caKey] ?? "";
                                    return (
                                      <td key={caKey} style={{ textAlign: "center" }}>
                                        <input
                                          type="number"
                                          min="0"
                                          max={activeScoreConfig.caMax}
                                          className="re-score-input"
                                          value={currentVal}
                                          onChange={(e) =>
                                            handleScoreChange(idx, "ca", caKey, e.target.value)
                                          }
                                        />
                                      </td>
                                    );
                                  })}
                                  <td style={{ textAlign: "center" }}>
                                    <input
                                      type="number"
                                      min="0"
                                      max={activeScoreConfig.examMax}
                                      className="re-score-input"
                                      value={row.exam}
                                      onChange={(e) => handleScoreChange(idx, "exam", undefined, e.target.value)}
                                    />
                                  </td>
                                  <td style={{ textAlign: "center" }} className="fw-bold fs-6 text-dark">
                                    {row.total}
                                  </td>
                                  <td style={{ textAlign: "center" }}>
                                    <span className={`re-grade-tag re-grade-${gradeChar}`}>{row.grade}</span>
                                  </td>
                                  <td>
                                    <span className="text-sm fw-semibold text-muted">{row.remark}</span>
                                  </td>
                                  <td style={{ textAlign: "center" }}>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger p-1 border-0"
                                      title="Remove Subject"
                                      onClick={() => handleRemoveSubject(idx)}
                                    >
                                      <i className="bi bi-trash3" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Summary & Assessment Settings Card */}
                    <div className="row g-4 mb-4">
                      <div className="col-12 col-lg-6">
                        <div className="bg-white p-4 rounded-4 border shadow-sm h-100">
                          <div className="d-flex align-items-center justify-content-between mb-3">
                            <h5 className="fs-6 fw-bold text-dark m-0 d-flex align-items-center gap-2">
                              <i className="bi bi-chat-quote-fill text-primary" /> Teacher & Principal Comments
                            </h5>
                            <button
                              type="button"
                              className="btn btn-xs btn-outline-primary rounded-pill px-3 py-1 fw-bold"
                              onClick={handleAiCommentSuggest}
                            >
                              <i className="bi bi-magic" /> AI Suggest Comments
                            </button>
                          </div>

                          <div className="mb-3">
                            <label className="form-label text-xs fw-bold text-muted text-uppercase">
                              Class Teacher's Comment
                            </label>
                            <textarea
                              className="form-control"
                              rows={2}
                              value={summary.class_teacher_comment}
                              onChange={(e) =>
                                setSummary({ ...summary, class_teacher_comment: e.target.value })
                              }
                              placeholder="e.g. An active and promising learner with outstanding performance."
                            />
                          </div>

                          <div className="mb-3">
                            <label className="form-label text-xs fw-bold text-muted text-uppercase">
                              Principal / Headteacher Remark
                            </label>
                            <textarea
                              className="form-control"
                              rows={2}
                              value={summary.principal_comment}
                              onChange={(e) => setSummary({ ...summary, principal_comment: e.target.value })}
                              placeholder="e.g. Excellent academic results. Keep striving for the highest honours."
                            />
                          </div>

                          <div className="row g-3">
                            <div className="col-6">
                              <label className="form-label text-xs fw-bold text-muted text-uppercase">
                                Class Teacher Name
                              </label>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={summary.class_teacher}
                                onChange={(e) => setSummary({ ...summary, class_teacher: e.target.value })}
                              />
                            </div>
                            <div className="col-6">
                              <label className="form-label text-xs fw-bold text-muted text-uppercase">
                                Resumption Date
                              </label>
                              <input
                                type="date"
                                className="form-control form-control-sm"
                                value={summary.resumption_date}
                                onChange={(e) => setSummary({ ...summary, resumption_date: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-12 col-lg-6">
                        <div className="bg-white p-4 rounded-4 border shadow-sm h-100">
                          <h5 className="fs-6 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                            <i className="bi bi-calendar2-check-fill text-primary" /> Attendance & Class Analytics
                          </h5>

                          <div className="row g-3 mb-3">
                            <div className="col-6 col-sm-3">
                              <label className="form-label text-xs fw-bold text-muted text-uppercase">
                                School Opened
                              </label>
                              <input
                                type="number"
                                className="form-control form-control-sm text-center fw-bold"
                                value={summary.school_open}
                                onChange={(e) => setSummary({ ...summary, school_open: e.target.value })}
                              />
                            </div>
                            <div className="col-6 col-sm-3">
                              <label className="form-label text-xs fw-bold text-muted text-uppercase">
                                Days Present
                              </label>
                              <input
                                type="number"
                                className="form-control form-control-sm text-center fw-bold"
                                value={summary.no_present}
                                onChange={(e) => setSummary({ ...summary, no_present: e.target.value })}
                              />
                            </div>
                            <div className="col-6 col-sm-3">
                              <label className="form-label text-xs fw-bold text-muted text-uppercase">
                                Days Absent
                              </label>
                              <input
                                type="number"
                                className="form-control form-control-sm text-center fw-bold"
                                value={summary.no_absent}
                                onChange={(e) => setSummary({ ...summary, no_absent: e.target.value })}
                              />
                            </div>
                            <div className="col-6 col-sm-3">
                              <label className="form-label text-xs fw-bold text-muted text-uppercase">
                                Class Size
                              </label>
                              <input
                                type="number"
                                className="form-control form-control-sm text-center fw-bold"
                                value={summary.class_size}
                                onChange={(e) => setSummary({ ...summary, class_size: e.target.value })}
                              />
                            </div>
                          </div>

                          {/* Affective / Psychomotor Ratings Scale */}
                          <div className="border-top pt-3 mt-3">
                            <label className="form-label text-xs fw-bold text-muted text-uppercase mb-2">
                              Behavioural & Skill Ratings (1 = Low, 5 = Excellent)
                            </label>
                            <div className="row g-2 text-xs">
                              {(
                                [
                                  ["punctuality", "Punctuality"],
                                  ["neatness", "Neatness"],
                                  ["politeness", "Politeness"],
                                  ["honesty", "Honesty"],
                                  ["sports", "Sports/Games"],
                                  ["crafts", "Handicrafts"],
                                ] as const
                              ).map(([key, label]) => (
                                <div key={key} className="col-6 col-md-4 d-flex align-items-center justify-content-between bg-light p-2 rounded">
                                  <span className="fw-semibold text-dark">{label}:</span>
                                  <select
                                    className="form-select form-select-sm p-1 text-center fw-bold"
                                    style={{ width: "50px" }}
                                    value={ratings[key]}
                                    onChange={(e) =>
                                      setRatings({ ...ratings, [key]: Number(e.target.value) })
                                    }
                                  >
                                    {[5, 4, 3, 2, 1].map((n) => (
                                      <option key={n} value={n}>
                                        {n}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Floating Bar */}
                    <div className="d-flex align-items-center justify-content-between p-4 bg-white rounded-4 border shadow-sm flex-wrap gap-3">
                      <div>
                        <span className="text-muted text-sm">
                          Editing results for <strong>{student.firstname} {student.surname}</strong> ({student.reg_no}) &bull; {selectedTerm}, {selectedSession}
                        </span>
                      </div>
                      <div className="d-flex align-items-center gap-3">
                        <button
                          type="button"
                          className="btn btn-outline-secondary px-4 py-2 rounded-3 fw-bold"
                          onClick={() => handleLookup()}
                        >
                          Discard Changes
                        </button>
                        <button type="submit" className="re-btn-save" disabled={saving}>
                          {saving ? (
                            <>
                              <span className="spinner-border spinner-border-sm" /> Saving...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-cloud-arrow-up-fill" /> Save & Update Result
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* ════ TAB 2: OFFICIAL RESULT PREVIEW ════ */}
                {activeTab === "preview" && (
                  <div className="re-preview-container">
                    {/* Top Action Bar */}
                    <div className="d-flex align-items-center justify-content-between mb-4 p-3 bg-white rounded-4 border shadow-sm flex-wrap gap-3 d-print-none">
                      <div>
                        <h4 className="fs-6 fw-bold text-dark m-0">Official Student Terminal Assessment Report</h4>
                        <span className="text-muted text-xs">Formatted to match official school report card layout</span>
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm rounded-pill px-3 fw-bold"
                          onClick={() => {
                            const params = new URLSearchParams({
                              school_id: String(student.school_id),
                              class_id: String(selectedClassId || student.level_id || ""),
                              student_id: String(student.id),
                              term: selectedTerm,
                              session: selectedSession,
                            });
                            window.open(`/results/show-result?${params.toString()}`, "_blank");
                          }}
                        >
                          <i className="bi bi-box-arrow-up-right me-1" /> Open in Full ShowResult Page
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm rounded-pill px-3 fw-bold"
                          onClick={() => window.print()}
                        >
                          <i className="bi bi-printer-fill me-1" /> Print
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm rounded-pill px-4 fw-bold"
                          disabled={downloadingPdf}
                          onClick={handleDownloadPdf}
                        >
                          {downloadingPdf ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1" /> Generating PDF...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-file-earmark-pdf-fill me-1" /> Download Official PDF
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Official Result Sheet matching ShowResult */}
                    <div
                      id="admin-result-sheet"
                      style={{
                        width: "min(780px, 100%)",
                        margin: "auto",
                        padding: "20px",
                        background: schoolInfo.background_color || "#ffffff",
                        fontFamily: resultTemplate?.font_family || "Arial, sans-serif",
                        fontSize: "12px",
                        border: `3px solid ${schoolInfo.primary_color || "#0d47a1"}`,
                        borderRadius: "8px",
                        boxSizing: "border-box",
                        position: "relative",
                        overflow: "visible",
                        color: "#111827",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                      }}
                    >
                      {/* Watermark */}
                      {schoolInfo.logo && (
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            backgroundImage: `url(${schoolInfo.logo})`,
                            backgroundRepeat: "repeat",
                            backgroundSize: "150px 150px",
                            opacity: 0.04,
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
                            gridTemplateColumns: "90px 1fr 90px",
                            gap: "12px",
                            alignItems: "center",
                            borderBottom: `2px solid ${schoolInfo.primary_color || "#0d47a1"}`,
                            paddingBottom: "10px",
                          }}
                        >
                          <img
                            src={schoolInfo.logo || "https://via.placeholder.com/90x90.png?text=Logo"}
                            alt="School Logo"
                            onError={(e) => {
                              (e.target as any).src = "https://via.placeholder.com/90x90.png?text=Logo";
                            }}
                            style={{
                              width: "90px",
                              height: "90px",
                              borderRadius: "6px",
                              objectFit: "cover",
                              border: `2px solid ${schoolInfo.secondary_color || "#ffc107"}`,
                            }}
                          />

                          <div style={{ flex: 1, textAlign: "center" }}>
                            <h1
                              style={{
                                margin: 0,
                                fontSize: "20px",
                                fontWeight: "bold",
                                color: schoolInfo.primary_color || "#0d47a1",
                              }}
                            >
                              {schoolInfo.name}
                            </h1>
                            <p style={{ margin: "3px 0", fontSize: "12px" }}>{schoolInfo.address}</p>
                            <p style={{ margin: "3px 0", fontSize: "12px" }}>Tel: {schoolInfo.phone}</p>

                            <h2
                              style={{
                                margin: "6px 0",
                                fontSize: "15px",
                                textTransform: "uppercase",
                                background: schoolInfo.primary_color || "#0d47a1",
                                color: getTextColor(schoolInfo.primary_color || "#0d47a1"),
                                padding: "6px 12px",
                                borderRadius: "6px",
                                textAlign: "center",
                                letterSpacing: "1px",
                                border: `1px solid ${schoolInfo.secondary_color || "#ffc107"}`,
                                fontWeight: 700,
                              }}
                            >
                              {selectedTerm} REPORT SHEET &bull; {selectedSession}
                            </h2>
                          </div>

                          {studentPhotoBase64 || student.photo ? (
                            <img
                              src={studentPhotoBase64 || `/uploads/users/${student.photo}`}
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
                                border: `2px solid ${schoolInfo.secondary_color || "#ffc107"}`,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "90px",
                                height: "90px",
                                border: `2px dashed ${schoolInfo.primary_color || "#0d47a1"}`,
                                borderRadius: "6px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "11px",
                                color: "#666",
                                textAlign: "center",
                              }}
                            >
                              Student Photo
                            </div>
                          )}
                        </div>

                        {/* STUDENT INFO MATRIX */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                            gap: 6,
                            marginTop: 10,
                            fontSize: "11.5px",
                          }}
                        >
                          {[
                            ["Name", `${student.surname} ${student.firstname} ${student.othername || ""}`.trim()],
                            ["Admission No", student.reg_no],
                            [
                              "Class",
                              student.level?.name ||
                                classes.find((c) => String(c.id) === String(selectedClassId))?.name ||
                                "SS2",
                            ],
                            ["Session", selectedSession],
                            ["Gender", student.gender || "N/A"],
                            ["Term", selectedTerm],
                            ["Class Size", summary.class_size || "N/A"],
                            ...(summary.position &&
                            String(summary.position).trim() !== "" &&
                            String(summary.position).trim().toLowerCase() !== "n/a" &&
                            String(summary.position).trim() !== "-" &&
                            String(summary.position).trim().toLowerCase() !== "recorded"
                              ? [["Position", summary.position]]
                              : []),
                            ["Times School Opened", summary.school_open || 0],
                            ["Times Present", summary.no_present || 0],
                            ["Times Absent", summary.no_absent || 0],
                            ["Resumption Date", summary.resumption_date || "To Be Announced"],
                          ].map(([label, val]) => (
                            <div
                              key={label}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                padding: "4px 8px",
                                background: "#f8fafc",
                                border: `1px solid ${hexToRgba(schoolInfo.primary_color || "#0d47a1", 0.2)}`,
                                borderRadius: "4px",
                              }}
                            >
                              <strong style={{ color: schoolInfo.primary_color || "#0d47a1" }}>{label}:</strong>
                              <span style={{ fontWeight: 600 }}>{val}</span>
                            </div>
                          ))}
                        </div>

                        {/* ACADEMIC SCORES TABLE */}
                        <div style={{ marginTop: 12 }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px" }}>
                            <thead>
                              <tr>
                                <th
                                  style={{
                                    border: `1px solid ${schoolInfo.primary_color || "#0d47a1"}`,
                                    padding: "6px 4px",
                                    textAlign: "center",
                                    background: schoolInfo.primary_color || "#0d47a1",
                                    color: getTextColor(schoolInfo.primary_color || "#0d47a1"),
                                    width: "30px",
                                  }}
                                >
                                  #
                                </th>
                                <th
                                  style={{
                                    border: `1px solid ${schoolInfo.primary_color || "#0d47a1"}`,
                                    padding: "6px 8px",
                                    textAlign: "left",
                                    background: schoolInfo.primary_color || "#0d47a1",
                                    color: getTextColor(schoolInfo.primary_color || "#0d47a1"),
                                  }}
                                >
                                  Subject
                                </th>
                                {Array.from({ length: activeScoreConfig.caCount }).map((_, caIdx) => (
                                  <th
                                    key={caIdx}
                                    style={{
                                      border: `1px solid ${schoolInfo.primary_color || "#0d47a1"}`,
                                      padding: "6px 4px",
                                      textAlign: "center",
                                      background: schoolInfo.primary_color || "#0d47a1",
                                      color: getTextColor(schoolInfo.primary_color || "#0d47a1"),
                                      width: "65px",
                                    }}
                                  >
                                    CA {caIdx + 1} ({activeScoreConfig.caMax})
                                  </th>
                                ))}
                                <th
                                  style={{
                                    border: `1px solid ${schoolInfo.primary_color || "#0d47a1"}`,
                                    padding: "6px 4px",
                                    textAlign: "center",
                                    background: schoolInfo.primary_color || "#0d47a1",
                                    color: getTextColor(schoolInfo.primary_color || "#0d47a1"),
                                    width: "65px",
                                  }}
                                >
                                  Exam ({activeScoreConfig.examMax})
                                </th>
                                <th
                                  style={{
                                    border: `1px solid ${schoolInfo.primary_color || "#0d47a1"}`,
                                    padding: "6px 4px",
                                    textAlign: "center",
                                    background: schoolInfo.primary_color || "#0d47a1",
                                    color: getTextColor(schoolInfo.primary_color || "#0d47a1"),
                                    width: "65px",
                                  }}
                                >
                                  Total (100)
                                </th>
                                <th
                                  style={{
                                    border: `1px solid ${schoolInfo.primary_color || "#0d47a1"}`,
                                    padding: "6px 4px",
                                    textAlign: "center",
                                    background: schoolInfo.primary_color || "#0d47a1",
                                    color: getTextColor(schoolInfo.primary_color || "#0d47a1"),
                                    width: "55px",
                                  }}
                                >
                                  Grade
                                </th>
                                <th
                                  style={{
                                    border: `1px solid ${schoolInfo.primary_color || "#0d47a1"}`,
                                    padding: "6px 8px",
                                    textAlign: "left",
                                    background: schoolInfo.primary_color || "#0d47a1",
                                    color: getTextColor(schoolInfo.primary_color || "#0d47a1"),
                                  }}
                                >
                                  Remark
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((r, i) => {
                                const caKeys = Array.from({ length: activeScoreConfig.caCount }).map(
                                  (_, caIdx) => `ca${caIdx + 1}`
                                );
                                const examVal = r.exam === "" ? 0 : Number(r.exam);
                                return (
                                  <tr key={i} style={{ background: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                                    <td
                                      style={{
                                        border: `1px solid ${hexToRgba(schoolInfo.primary_color || "#0d47a1", 0.3)}`,
                                        padding: "6px 4px",
                                        textAlign: "center",
                                        fontWeight: "bold",
                                        color: "#64748B",
                                      }}
                                    >
                                      {i + 1}
                                    </td>
                                    <td
                                      style={{
                                        border: `1px solid ${hexToRgba(schoolInfo.primary_color || "#0d47a1", 0.3)}`,
                                        padding: "6px 8px",
                                        textAlign: "left",
                                        fontWeight: "bold",
                                        color: "#0F2744",
                                      }}
                                    >
                                      {r.subject_name}
                                    </td>
                                    {caKeys.map((k, caIdx) => (
                                      <td
                                        key={k}
                                        style={{
                                          border: `1px solid ${hexToRgba(schoolInfo.primary_color || "#0d47a1", 0.3)}`,
                                          padding: "6px 4px",
                                          textAlign: "center",
                                        }}
                                      >
                                        {r.ca?.[k] !== undefined && r.ca?.[k] !== null && r.ca?.[k] !== ""
                                          ? r.ca[k]
                                          : caIdx === 0
                                          ? r.ca?.["ca0"] ?? r.ca?.["0"] ?? "-"
                                          : "-"}
                                      </td>
                                    ))}
                                    <td
                                      style={{
                                        border: `1px solid ${hexToRgba(schoolInfo.primary_color || "#0d47a1", 0.3)}`,
                                        padding: "6px 4px",
                                        textAlign: "center",
                                      }}
                                    >
                                      {examVal}
                                    </td>
                                    <td
                                      style={{
                                        border: `1px solid ${hexToRgba(schoolInfo.primary_color || "#0d47a1", 0.3)}`,
                                        padding: "6px 4px",
                                        textAlign: "center",
                                        fontWeight: "bold",
                                        color: "#0F2744",
                                      }}
                                    >
                                      {r.total}
                                    </td>
                                    <td
                                      style={{
                                        border: `1px solid ${hexToRgba(schoolInfo.primary_color || "#0d47a1", 0.3)}`,
                                        padding: "6px 4px",
                                        textAlign: "center",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      <span className={`re-grade-tag re-grade-${r.grade?.charAt(0) || "F"}`}>
                                        {r.grade}
                                      </span>
                                    </td>
                                    <td
                                      style={{
                                        border: `1px solid ${hexToRgba(schoolInfo.primary_color || "#0d47a1", 0.3)}`,
                                        padding: "6px 8px",
                                        textAlign: "left",
                                      }}
                                    >
                                      {r.remark}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* SUMMARY SCORECARD */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              summary.position &&
                              String(summary.position).trim() !== "" &&
                              String(summary.position).trim().toLowerCase() !== "n/a" &&
                              String(summary.position).trim() !== "-" &&
                              String(summary.position).trim().toLowerCase() !== "recorded"
                                ? "repeat(4, 1fr)"
                                : "repeat(3, 1fr)",
                            gap: 8,
                            marginTop: 12,
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              padding: "8px",
                              background: "#f8fafc",
                              border: `1px solid ${hexToRgba(schoolInfo.primary_color || "#0d47a1", 0.3)}`,
                              borderRadius: "6px",
                            }}
                          >
                            <div style={{ fontSize: "10px", color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>
                              Total Marks
                            </div>
                            <div style={{ fontSize: "16px", fontWeight: 800, color: schoolInfo.primary_color || "#0d47a1" }}>
                              {rows.reduce((acc, r) => acc + Number(r.total || 0), 0)}
                            </div>
                          </div>
                          <div
                            style={{
                              padding: "8px",
                              background: "#f8fafc",
                              border: `1px solid ${hexToRgba(schoolInfo.primary_color || "#0d47a1", 0.3)}`,
                              borderRadius: "6px",
                            }}
                          >
                            <div style={{ fontSize: "10px", color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>
                              Overall Average
                            </div>
                            <div style={{ fontSize: "16px", fontWeight: 800, color: "#16A34A" }}>
                              {summary.total_average}%
                            </div>
                          </div>
                          <div
                            style={{
                              padding: "8px",
                              background: "#f8fafc",
                              border: `1px solid ${hexToRgba(schoolInfo.primary_color || "#0d47a1", 0.3)}`,
                              borderRadius: "6px",
                            }}
                          >
                            <div style={{ fontSize: "10px", color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>
                              Overall Grade
                            </div>
                            <div style={{ fontSize: "16px", fontWeight: 800, color: schoolInfo.primary_color || "#0d47a1" }}>
                              {summary.total_grade || getGradeAndRemark(Number(summary.total_average) || 0).grade}
                            </div>
                          </div>
                          {summary.position &&
                            String(summary.position).trim() !== "" &&
                            String(summary.position).trim().toLowerCase() !== "n/a" &&
                            String(summary.position).trim() !== "-" &&
                            String(summary.position).trim().toLowerCase() !== "recorded" && (
                              <div
                                style={{
                                  padding: "8px",
                                  background: "#f8fafc",
                                  border: `1px solid ${hexToRgba(schoolInfo.primary_color || "#0d47a1", 0.3)}`,
                                  borderRadius: "6px",
                                }}
                              >
                                <div style={{ fontSize: "10px", color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>
                                  Class Position
                                </div>
                                <div style={{ fontSize: "16px", fontWeight: 800, color: schoolInfo.primary_color || "#0d47a1" }}>
                                  {summary.position}
                                </div>
                              </div>
                            )}
                        </div>

                        {/* DOMAINS & RATINGS */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                          {/* Affective Domains */}
                          <div>
                            <div
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                color: schoolInfo.primary_color || "#0d47a1",
                                textTransform: "uppercase",
                                marginBottom: 4,
                              }}
                            >
                              Affective Domain Traits
                            </div>
                            <table
                              style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                border: `1px solid ${schoolInfo.primary_color || "#0d47a1"}`,
                                fontSize: "11px",
                              }}
                            >
                              <thead>
                                <tr>
                                  <th
                                    style={{
                                      background: schoolInfo.primary_color || "#0d47a1",
                                      color: getTextColor(schoolInfo.primary_color || "#0d47a1"),
                                      fontSize: "10.5px",
                                      padding: "4px",
                                      textAlign: "left",
                                    }}
                                  >
                                    Trait / Attribute
                                  </th>
                                  <th
                                    style={{
                                      background: schoolInfo.primary_color || "#0d47a1",
                                      color: getTextColor(schoolInfo.primary_color || "#0d47a1"),
                                      fontSize: "10.5px",
                                      padding: "4px",
                                      width: "70px",
                                      textAlign: "center",
                                    }}
                                  >
                                    Score (1-5)
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  ["Punctuality", ratings.punctuality],
                                  ["Attendance", ratings.attendance],
                                  ["Neatness", ratings.neatness],
                                  ["Politeness", ratings.politeness],
                                  ["Honesty", ratings.honesty],
                                ].map(([label, val], idx) => (
                                  <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                                    <td
                                      style={{
                                        border: `1px solid ${hexToRgba(schoolInfo.primary_color || "#0d47a1", 0.3)}`,
                                        textAlign: "left",
                                        padding: "3px 6px",
                                      }}
                                    >
                                      {label}
                                    </td>
                                    <td
                                      style={{
                                        border: `1px solid ${hexToRgba(schoolInfo.primary_color || "#0d47a1", 0.3)}`,
                                        padding: "3px",
                                        fontWeight: "bold",
                                        textAlign: "center",
                                      }}
                                    >
                                      {val}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Psychomotor Domains */}
                          <div>
                            <div
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                color: schoolInfo.primary_color || "#0d47a1",
                                textTransform: "uppercase",
                                marginBottom: 4,
                              }}
                            >
                              Psychomotor & Skills
                            </div>
                            <table
                              style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                border: `1px solid ${schoolInfo.primary_color || "#0d47a1"}`,
                                fontSize: "11px",
                              }}
                            >
                              <thead>
                                <tr>
                                  <th
                                    style={{
                                      background: schoolInfo.primary_color || "#0d47a1",
                                      color: getTextColor(schoolInfo.primary_color || "#0d47a1"),
                                      fontSize: "10.5px",
                                      padding: "4px",
                                      textAlign: "left",
                                    }}
                                  >
                                    Skill / Domain
                                  </th>
                                  <th
                                    style={{
                                      background: schoolInfo.primary_color || "#0d47a1",
                                      color: getTextColor(schoolInfo.primary_color || "#0d47a1"),
                                      fontSize: "10.5px",
                                      padding: "4px",
                                      width: "70px",
                                      textAlign: "center",
                                    }}
                                  >
                                    Score (1-5)
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  ["Sports & Athletics", ratings.sports],
                                  ["Handicrafts & Arts", ratings.crafts],
                                  ["Music & Performance", ratings.music],
                                  ["Handwriting", ratings.handwriting],
                                  ["Leadership Ability", ratings.leadership],
                                ].map(([label, val], idx) => (
                                  <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                                    <td
                                      style={{
                                        border: `1px solid ${hexToRgba(schoolInfo.primary_color || "#0d47a1", 0.3)}`,
                                        textAlign: "left",
                                        padding: "3px 6px",
                                      }}
                                    >
                                      {label}
                                    </td>
                                    <td
                                      style={{
                                        border: `1px solid ${hexToRgba(schoolInfo.primary_color || "#0d47a1", 0.3)}`,
                                        padding: "3px",
                                        fontWeight: "bold",
                                        textAlign: "center",
                                      }}
                                    >
                                      {val}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* AUTHENTICATION & SIGNATURES */}
                        <div
                          style={{
                            marginTop: 12,
                            border: `1px solid ${hexToRgba(schoolInfo.primary_color || "#0d47a1", 0.3)}`,
                            borderRadius: "6px",
                            padding: "10px",
                            background: "#f8fafc",
                          }}
                        >
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 12, alignItems: "center" }}>
                            <div>
                              <div style={{ marginBottom: "6px", fontSize: "11.5px" }}>
                                <strong>Class Teacher's Remark:</strong>{" "}
                                <span style={{ color: "#334155" }}>
                                  {summary.class_teacher_comment || "Commendable effort this term."}
                                </span>
                              </div>
                              <div style={{ marginBottom: "6px", fontSize: "11.5px" }}>
                                <strong>Principal's Remark:</strong>{" "}
                                <span style={{ color: "#334155" }}>
                                  {summary.principal_comment || "Good academic progress recorded."}
                                </span>
                              </div>
                              <div style={{ fontSize: "11px", color: "#64748B" }}>
                                <strong>Next Term Resumption:</strong>{" "}
                                {summary.resumption_date || "To be communicated"} &bull;{" "}
                                <strong>General Remark:</strong> {summary.general_remark || "Promoted with Credit"}
                              </div>
                            </div>

                            <div style={{ textAlign: "center" }}>
                              {qrDataUrl && (
                                <img
                                  src={qrDataUrl}
                                  alt="QR Verification"
                                  style={{ width: "70px", height: "70px", margin: "auto", display: "block" }}
                                />
                              )}
                              <div style={{ fontSize: "8.5px", color: "#64748B", marginTop: "2px", fontWeight: 700 }}>
                                VERIFIED SEAL
                              </div>
                            </div>
                          </div>

                          {schoolInfo.principal_signature && (
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                marginTop: "8px",
                                borderTop: "1px dashed #cbd5e1",
                                paddingTop: "6px",
                              }}
                            >
                              <div style={{ textAlign: "center" }}>
                                <img
                                  src={schoolInfo.principal_signature}
                                  alt="Principal Signature"
                                  style={{ height: "35px", display: "block", margin: "auto" }}
                                />
                                <div
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    color: schoolInfo.primary_color || "#0d47a1",
                                  }}
                                >
                                  Principal's Authorized Stamp
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Empty Search Guide */
              <div className="bg-white p-5 rounded-4 border text-center my-4 shadow-sm">
                <div
                  className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
                  style={{ width: "80px", height: "80px", background: "rgba(217, 119, 6, 0.12)", color: "#D97706" }}
                >
                  <i className="bi bi-search fs-1" />
                </div>
                <h3 className="fs-5 fw-bold text-dark mb-2">Search Student by Admission / Registration Number</h3>
                <p className="text-muted text-sm max-w-md mx-auto mb-4" style={{ maxWidth: "540px" }}>
                  Enter any student's registered admission number above to retrieve their complete continuous
                  assessment, examination marks, and affective ratings for live editing or printing.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <span className="badge bg-light text-muted border px-3 py-2">
                    <i className="bi bi-check-circle-fill text-success me-1" /> Live CA & Exam Recalculation
                  </span>
                  <span className="badge bg-light text-muted border px-3 py-2">
                    <i className="bi bi-check-circle-fill text-success me-1" /> Permanent Academic Access
                  </span>
                </div>
              </div>
            )}

            <Footer />
          </main>
        </div>
      </div>
    </div>
  );
}
