// src/pages/Admin/StudentResult/AddResultV2Page.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import PageTitle from "../../../components/PageTitle";

const safeAiError = (message: string | undefined, fallback: string) => {
  const text = String(message || fallback);
  return /openai|api key|quota|billing|organization|insufficient_quota|provider/i.test(text)
    ? "Something went wrong while processing this AI request. Please try again later."
    : text;
};

type Subject = { id: number; name: string; department_id?: number | null };

type Student = {
  id: number;
  reg_no: string;
  firstname: string;
  surname: string;
  photo?: string | null;
  school_id: number;
  level?: { id: number; name: string } | null;
  department?: { name: string } | null;
};

type ClassOption = {
  id: number;
  name: string;
  section?: { id: number; name: string } | null;
  department?: { id: number; name: string } | null;
};

type ClassStudentItem = {
  id: number;
  reg_no: string;
  firstname: string;
  surname: string;
  photo?: string | null;
  status?: "completed" | "pending";
  saved_at?: string | null;
};

type CarryOverJson = {
  enabled: boolean;
  terms: Record<string, number>;
  current_term: Record<string, number>;
  cumulative_total: number;
  cumulative_average: number;
};

type ReportColumnPolicy = {
  carry_over_allowed?: boolean;
  columns?: {
    show_first_term?: boolean;
    show_second_term?: boolean;
    show_cumulative_total?: boolean;
    show_cumulative_average?: boolean;
  };
};

type ScoreRow = {
  subject_id: number;
  ca: Record<string, number>;
  exam?: number;
  total?: number;
  grade?: string;
  remark?: string;
  carry_over?: CarryOverJson;
};

type ScoresState = Record<string, ScoreRow>;

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const SCORE_TYPES = [
  { label: "20 / 20 / 60 (Standard 2 CAs + Exam)", value: "20/20/60" },
  { label: "40 / 60 (1 Single CA + Exam)", value: "40/60" },
  { label: "10 / 10 / 10 / 10 / 60 (4 Continuous Assessments + Exam)", value: "10/10/10/10/60" },
];

function parseParts(typeStr: string) {
  return typeStr
    .split("/")
    .map((x) => Number(x.trim()))
    .filter((n) => !Number.isNaN(n));
}

function detectScoreTypeFromExisting(
  existingRows: Array<{ ca?: Record<string, any>; exam?: number | null; total?: number | null }>
): string | null {
  const row = existingRows.find((r) => r?.ca && Object.keys(r.ca).length > 0);
  if (!row) return null;

  const ca = row.ca ?? {};
  const keys = Object.keys(ca).filter((k) => k.startsWith("ca"));
  const caCount = keys.length;

  const values = keys
    .map((k) => Number(ca[k]))
    .filter((n) => Number.isFinite(n));

  const guess = values.length ? Math.max(...values) : null;

  if (caCount === 4) return "10/10/10/10/60";
  if (caCount === 2) return "20/20/60";
  if (caCount === 1) return "40/60";

  if (guess !== null) {
    if (guess <= 10) return "10/10/10/10/60";
    if (guess <= 20) return "20/20/60";
    return "40/60";
  }

  return null;
}

function calcTotal(ca: Record<string, number>, exam?: number) {
  const caSum = Object.values(ca).reduce((a, b) => a + (Number(b) || 0), 0);
  return caSum + (Number(exam) || 0);
}

function getAutoGradeAndRemark(total: number | undefined | null) {
  if (total === undefined || total === null || Number.isNaN(total)) {
    return { grade: "", remark: "" };
  }
  const score = Number(total);
  if (score >= 70) return { grade: "A", remark: "Excellent" };
  if (score >= 60) return { grade: "B", remark: "Very Good" };
  if (score >= 50) return { grade: "C", remark: "Credit" };
  if (score >= 40) return { grade: "D", remark: "Pass" };
  if (score > 0) return { grade: "F", remark: "Fail" };
  return { grade: "", remark: "" };
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function sanitizeAdmission(raw: string) {
  return raw.replace(/[^a-zA-Z0-9_\-\/]/g, "").trim();
}

export default function AddResultV2Page() {
  const { showSuccess, showError, showInfo, showWarning } = useToast();
  const navigate = useNavigate();
  const query = useQuery();

  const urlBatchId = Number(query.get("batchId") || 0);
  const urlStudentId = Number(query.get("studentId") || 0);
  const urlClassId = Number(query.get("class_id") || query.get("classId") || 0);
  const urlTerm = query.get("term") || "";
  const urlSession = query.get("session") || "";

  // -----------------------------
  // Layout state
  // -----------------------------
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => window.innerWidth >= 768);
  const [pageLoading, setPageLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  // -----------------------------
  // Classes & Roster
  // -----------------------------
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | "">(urlClassId || "");
  const [classStudents, setClassStudents] = useState<ClassStudentItem[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentFilterText, setStudentFilterText] = useState("");

  // Stepper: 1: Pick Class & Student, 2: Score Entry & Summary, 3: Completed Batch Actions
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Search inputs (Direct Lookup Mode)
  const [admissionNo, setAdmissionNo] = useState("");
  const [searching, setSearching] = useState(false);

  // Loaded Active Student Data
  const [student, setStudent] = useState<Student | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [term, setTerm] = useState<string>(urlTerm || "");
  const [session, setSession] = useState<string>(urlSession || "");
  const [department, setDepartment] = useState<string>("");

  // Scoring config
  const [scoreType, setScoreType] = useState(SCORE_TYPES[0].value);
  const parts = useMemo(() => parseParts(scoreType), [scoreType]);
  const caParts = useMemo(() => parts.slice(0, Math.max(0, parts.length - 1)), [parts]);
  const examPart = useMemo(() => parts[parts.length - 1] ?? 0, [parts]);

  // Batch
  const [batchId, setBatchId] = useState<number | null>(urlBatchId || null);

  // Scores
  const [scores, setScores] = useState<ScoresState>({});

  // Summary form
  const [summary, setSummary] = useState({
    total_grade: "",
    principal_comment: "",
    class_teacher_comment: "",
    general_remark: "",
    position: "",
    class_teacher: "",
    class_size: "",
    meta: {
      resumption_date: "",
      school_open: "",
      school_close: "",
      no_present: "",
      no_absent: "",
    },
  });

  // Carry-over
  const [includeCarryOver, setIncludeCarryOver] = useState(false);
  const [schoolTerms, setSchoolTerms] = useState<string[]>([]);
  const [carryPreview, setCarryPreview] = useState<Record<number, Record<string, number>>>({});
  const [reportColumnPolicy, setReportColumnPolicy] = useState<ReportColumnPolicy | null>(null);
  const carryOverAllowed = Boolean(reportColumnPolicy?.carry_over_allowed);
  const [carryLoading, setCarryLoading] = useState(false);

  // Attendance
  const [autoAttendance, setAutoAttendance] = useState<{
    present: number;
    absent: number;
    total_open: number;
    available: boolean;
  } | null>(null);

  // AI Assistant
  const [aiCommenting, setAiCommenting] = useState(false);
  const [aiCredits, setAiCredits] = useState<any>(null);

  // Submission state
  const [saving, setSaving] = useState(false);
  const [computing, setComputing] = useState(false);

  // LocalStorage keys
  const DRAFT_KEY = "gq_result_draft_v2";
  const saveTimerRef = useRef<number | null>(null);

  // -----------------------------
  // Calculate Live Overall Average
  // -----------------------------
  const overallAverage = useMemo(() => {
    const validRows = Object.values(scores).filter((r) => r && typeof r.total === "number" && !Number.isNaN(r.total));
    if (validRows.length === 0) return "";
    const sum = validRows.reduce((a, b) => a + (b.total || 0), 0);
    return (sum / validRows.length).toFixed(1);
  }, [scores]);

  // Update summary total_grade automatically based on overall average
  useEffect(() => {
    if (overallAverage) {
      const avg = Number(overallAverage);
      const autoGrade = avg >= 70 ? "A" : avg >= 60 ? "B" : avg >= 50 ? "C" : avg >= 40 ? "D" : "F";
      setSummary((p) => (p.total_grade ? p : { ...p, total_grade: autoGrade }));
    }
  }, [overallAverage]);

  // -----------------------------
  // Initialize Page & Load Classes
  // -----------------------------
  useEffect(() => {
    let mounted = true;

    async function init() {
      setPageLoading(true);
      try {
        const [classesRes, currentRes, creditsRes] = await Promise.allSettled([
          authApi.get("/fstudent-classes"),
          authApi.get("/current-session-term"),
          authApi.get("/admin/ai/credits"),
        ]);

        if (!mounted) return;

        if (classesRes.status === "fulfilled") {
          const payload = classesRes.value.data;
          const clsList: ClassOption[] = Array.isArray(payload) ? payload : payload?.classes ?? [];
          setClasses(clsList);
        }

        if (currentRes.status === "fulfilled") {
          if (!term && currentRes.value.data?.term) setTerm(currentRes.value.data.term);
          if (!session && currentRes.value.data?.session) setSession(currentRes.value.data.session);
        }

        if (creditsRes.status === "fulfilled") {
          setAiCredits(creditsRes.value.data?.data || null);
        }
      } catch {
        // fallback
      } finally {
        if (mounted) setPageLoading(false);
      }
    }

    init();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------
  // Load Class Students Roster
  // -----------------------------
  const loadClassRoster = async (classId: number, targetBatchId?: number | null) => {
    if (!classId) return;
    setLoadingStudents(true);
    try {
      let bId = targetBatchId || batchId;

      // If batchId is not known yet, resolve or fetch
      if (!bId && term && session) {
        try {
          const resolveRes = await authApi.post("/result-batches/resolve", {
            class_id: classId,
            term,
            session,
          });
          bId = resolveRes.data?.batch?.id;
          if (bId) setBatchId(bId);
        } catch {
          // ignore
        }
      }

      if (bId) {
        const res = await authApi.get(`/result-batches/${bId}/students`);
        const list = res.data?.data || [];
        setClassStudents(list);
      } else {
        const res = await authApi.get("/students-by-class", { params: { class_id: classId } });
        const raw = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setClassStudents(
          raw.map((s: any) => ({
            id: s.id,
            reg_no: s.reg_no || s.admission_no || "",
            firstname: s.firstname || "",
            surname: s.surname || "",
            photo: s.photo || null,
            status: "pending",
          }))
        );
      }
    } catch {
      setClassStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // When class changes
  useEffect(() => {
    if (selectedClassId) {
      loadClassRoster(Number(selectedClassId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId, term, session]);

  // Direct Mode bootstrap
  useEffect(() => {
    if (!urlBatchId || !urlStudentId) return;
    loadStudentInBatch(urlBatchId, urlStudentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlBatchId, urlStudentId]);

  // -----------------------------
  // Load Single Student in Batch
  // -----------------------------
  const loadStudentInBatch = async (bId: number, stId: number) => {
    setPageLoading(true);
    try {
      const res = await authApi.get(`/result-batches/${bId}/students/${stId}/result-form`);
      const data = res.data;

      const st: Student = data.student;
      const subjs: Subject[] = data.subjects || [];

      setStudent(st);
      setSubjects(subjs);
      setBatchId(bId);
      if (st.level?.id) setSelectedClassId(st.level.id);

      if (data.term) setTerm(data.term);
      if (data.session) setSession(data.session);
      setDepartment(st.department?.name || data.student?.department?.name || "");

      setReportColumnPolicy(data.report_column_policy ?? null);
      setSchoolTerms(data.terms ?? []);
      setCarryPreview(data.carry_over_preview ?? {});
      if (!data.report_column_policy?.carry_over_allowed) {
        setIncludeCarryOver(false);
      }

      // Initialize score state
      const existingRows: any[] = data.existing?.results || [];
      const detectedType = detectScoreTypeFromExisting(existingRows);
      if (detectedType) setScoreType(detectedType);

      const init: ScoresState = {};
      for (const s of subjs) {
        const row = existingRows.find((r) => Number(r.subject_id) === Number(s.id));
        const auto = getAutoGradeAndRemark(row?.total);

        init[s.name] = {
          subject_id: s.id,
          ca: row?.ca ?? {},
          exam: row?.exam ?? undefined,
          total: row?.total ?? undefined,
          grade: row?.grade || auto.grade,
          remark: row?.remark || auto.remark,
          carry_over: row?.carry_over ?? undefined,
        };
      }

      // Recompute totals
      Object.keys(init).forEach((k) => {
        init[k].total = calcTotal(init[k].ca, init[k].exam);
      });

      setScores(init);

      if (data.attendance?.available) {
        setAutoAttendance(data.attendance);
      } else {
        setAutoAttendance(null);
      }

      if (data.existing?.summary) {
        const exMeta = data.existing.summary.meta ?? {};
        setSummary((p) => ({
          ...p,
          ...data.existing.summary,
          meta: {
            ...p.meta,
            ...exMeta,
            no_present: exMeta.no_present ?? (data.attendance?.available ? String(data.attendance.present) : p.meta.no_present),
            no_absent: exMeta.no_absent ?? (data.attendance?.available ? String(data.attendance.absent) : p.meta.no_absent),
            school_open: exMeta.school_open ?? (data.attendance?.available ? String(data.attendance.total_open) : p.meta.school_open),
          },
        }));
      } else if (data.attendance?.available) {
        setSummary((p) => ({
          ...p,
          meta: {
            ...p.meta,
            no_present: String(data.attendance.present),
            no_absent: String(data.attendance.absent),
            school_open: String(data.attendance.total_open),
          },
        }));
      }

      setStep(2);
      loadClassRoster(st.level?.id || Number(selectedClassId), bId);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to load student result form.");
    } finally {
      setPageLoading(false);
    }
  };

  // -----------------------------
  // Direct Search by Admission No
  // -----------------------------
  const handleSearch = async () => {
    const adm = sanitizeAdmission(admissionNo.trim());
    if (!adm) return showWarning("Enter a valid admission number.");

    setSearching(true);
    try {
      const res = await authApi.get(`/search-stu/${adm}`);
      const data = res.data;

      const st: Student = data.student;
      const subjs: Subject[] = data.subjects || [];

      setStudent(st);
      setSubjects(subjs);
      if (st.level?.id) setSelectedClassId(st.level.id);

      const targetTerm = data.term || term;
      const targetSession = data.session || session;
      if (targetTerm) setTerm(targetTerm);
      if (targetSession) setSession(targetSession);
      setDepartment(st.department?.name || data.student?.department?.name || "");

      // Check if batch is already resolved or existing
      let resolvedBatchId = data.batch_id || batchId;

      if (!resolvedBatchId && st.school_id && st.level?.id && targetTerm && targetSession) {
        try {
          const batchRes = await authApi.post("/result-batches/resolve", {
            school_id: st.school_id,
            class_id: st.level.id,
            term: targetTerm,
            session: targetSession,
          });
          resolvedBatchId = batchRes.data?.batch?.id;
        } catch {
          // ignore
        }
      }

      if (resolvedBatchId) {
        setBatchId(resolvedBatchId);
        await loadStudentInBatch(resolvedBatchId, st.id);
        showSuccess(`Loaded saved result for ${st.firstname} ${st.surname} ✅`);
        return;
      }

      // If no batch exists yet, initialize fresh score state
      const init: ScoresState = {};
      for (const s of subjs) {
        init[s.name] = { subject_id: s.id, ca: {}, exam: undefined, total: undefined, grade: "", remark: "" };
      }
      setScores(init);

      if (data.attendance?.available) {
        setAutoAttendance(data.attendance);
        setSummary((p) => ({
          ...p,
          meta: {
            ...p.meta,
            no_present: p.meta.no_present || String(data.attendance.present),
            no_absent: p.meta.no_absent || String(data.attendance.absent),
            school_open: p.meta.school_open || String(data.attendance.total_open),
          },
        }));
      } else {
        setAutoAttendance(null);
      }

      setStep(2);
      showSuccess(`Loaded ${st.firstname} ${st.surname}`);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Student not found with this admission number.");
    } finally {
      setSearching(false);
    }
  };

  // -----------------------------
  // Score Input Change Handlers
  // -----------------------------
  const handleCaChange = (subjectName: string, caKey: string, value: string, max: number) => {
    const cleaned = value.replace(/^0+(?=\d)/, "");

    if (cleaned === "") {
      setScores((prev) => {
        const current = prev[subjectName];
        if (!current) return prev;
        const nextCa = { ...current.ca };
        delete nextCa[caKey];
        const nextRow = { ...current, ca: nextCa };
        nextRow.total = calcTotal(nextRow.ca, nextRow.exam);
        const auto = getAutoGradeAndRemark(nextRow.total);
        nextRow.grade = auto.grade;
        nextRow.remark = auto.remark;
        return { ...prev, [subjectName]: nextRow };
      });
      return;
    }

    const num = Number(cleaned);
    if (Number.isFinite(num) && num > max) {
      showWarning(`${subjectName}: ${caKey.toUpperCase()} cannot exceed ${max}`);
      return;
    }

    setScores((prev) => {
      const current = prev[subjectName];
      if (!current) return prev;
      const nextCa = { ...current.ca, [caKey]: Number.isFinite(num) ? num : 0 };
      const nextRow = { ...current, ca: nextCa };
      nextRow.total = calcTotal(nextCa, nextRow.exam);
      const auto = getAutoGradeAndRemark(nextRow.total);
      nextRow.grade = auto.grade;
      nextRow.remark = auto.remark;
      return { ...prev, [subjectName]: nextRow };
    });
  };

  const handleExamChange = (subjectName: string, value: string) => {
    const cleaned = value.replace(/^0+(?=\d)/, "");

    if (cleaned === "") {
      setScores((prev) => {
        const current = prev[subjectName];
        if (!current) return prev;
        const nextRow = { ...current, exam: undefined };
        nextRow.total = calcTotal(nextRow.ca, nextRow.exam);
        const auto = getAutoGradeAndRemark(nextRow.total);
        nextRow.grade = auto.grade;
        nextRow.remark = auto.remark;
        return { ...prev, [subjectName]: nextRow };
      });
      return;
    }

    const num = Number(cleaned);
    if (Number.isFinite(num) && num > examPart) {
      showWarning(`${subjectName}: Exam score cannot exceed ${examPart}`);
      return;
    }

    setScores((prev) => {
      const current = prev[subjectName];
      if (!current) return prev;
      const nextRow = { ...current, exam: Number.isFinite(num) ? num : 0 };
      nextRow.total = calcTotal(nextRow.ca, nextRow.exam);
      const auto = getAutoGradeAndRemark(nextRow.total);
      nextRow.grade = auto.grade;
      nextRow.remark = auto.remark;
      return { ...prev, [subjectName]: nextRow };
    });
  };

  const handleTextField = (subjectName: string, field: "grade" | "remark", value: string) => {
    setScores((prev) => {
      const current = prev[subjectName];
      if (!current) return prev;
      return {
        ...prev,
        [subjectName]: {
          ...current,
          [field]: field === "grade" ? value.toUpperCase() : value,
        },
      };
    });
  };

  // Focus helper: clean 0 on focus
  const handleFocusClean = (subjectName: string, key: string, isExam = false) => {
    setScores((prev) => {
      const current = prev[subjectName];
      if (!current) return prev;
      if (isExam && current.exam === 0) {
        const nextRow = { ...current, exam: undefined };
        return { ...prev, [subjectName]: nextRow };
      }
      if (!isExam && current.ca?.[key] === 0) {
        const nextCa = { ...current.ca };
        delete nextCa[key];
        return { ...prev, [subjectName]: { ...current, ca: nextCa } };
      }
      return prev;
    });
  };

  // -----------------------------
  // Smart Score Type Switcher
  // -----------------------------
  const handleScoreTypeChange = (newType: string) => {
    setScoreType(newType);

    const newParts = parseParts(newType);
    const newCaParts = newParts.slice(0, Math.max(0, newParts.length - 1));

    setScores((prev) => {
      const keys = Object.keys(prev).length ? Object.keys(prev) : subjects.map((s) => s.name);
      const next: ScoresState = {};

      for (const k of keys) {
        const subj = subjects.find((s) => s.name === k);
        const prevRow = prev[k] || (subj ? { subject_id: subj.id, ca: {}, exam: 0, total: 0, grade: "", remark: "" } : undefined);
        if (!prevRow) continue;

        const newCa: Record<string, number> = {};
        const oldCaEntries = Object.values(prevRow.ca || {});

        for (let i = 0; i < newCaParts.length; i++) {
          newCa[`ca${i}`] = oldCaEntries[i] !== undefined ? oldCaEntries[i] : 0;
        }

        const total = calcTotal(newCa, prevRow.exam);
        const auto = getAutoGradeAndRemark(total);

        next[k] = {
          ...prevRow,
          ca: newCa,
          total,
          grade: prevRow.grade || auto.grade,
          remark: prevRow.remark || auto.remark,
        };
      }

      return next;
    });

    showInfo(`Score format adjusted to ${newType}`);
  };

  // -----------------------------
  // Carry Over Builder
  // -----------------------------
  function buildCarryOver(subjectId: number, currentTermName: string, currentTotal: number): CarryOverJson {
    const prev = carryPreview[subjectId] ?? {};
    const prevTotals = Object.values(prev).map((x) => Number(x) || 0);

    const cumulativeTotal = prevTotals.reduce((a, b) => a + b, 0) + (Number(currentTotal) || 0);
    const termCount = prevTotals.length + 1;

    return {
      enabled: true,
      terms: prev,
      current_term: { [currentTermName]: Number(currentTotal) || 0 },
      cumulative_total: cumulativeTotal,
      cumulative_average: termCount ? Number((cumulativeTotal / termCount).toFixed(1)) : 0,
    };
  }

  // -----------------------------
  // AI Comments Generator
  // -----------------------------
  const generateAiComments = async () => {
    if (!student) return showWarning("Please select or search a student first.");
    if (!batchId) return showWarning("Please resolve the result batch first.");

    setAiCommenting(true);
    try {
      const subjectsPayload = Object.entries(scores).map(([subject_name, row]) => ({
        subject_name,
        subject_id: row.subject_id,
        ca: row.ca,
        exam: row.exam ?? null,
        total: row.total ?? null,
        grade: row.grade ?? null,
        remark: row.remark ?? null,
      }));

      const res = await authApi.post(`/result-batches/${batchId}/students/${student.id}/ai-comments`, {
        summary: {
          total_average: overallAverage || null,
          total_grade: summary.total_grade || null,
          position: summary.position || null,
          class_size: summary.class_size || null,
        },
        subjects: subjectsPayload,
        attendance: summary.meta,
        behavior_notes: "",
        performance_trend:
          includeCarryOver && carryOverAllowed
            ? "Cumulative result columns are enabled for this report."
            : "Use current term scores only.",
      });

      const comments = res.data?.comments || {};
      setSummary((p) => ({
        ...p,
        general_remark: comments.general_remark ?? p.general_remark,
        principal_comment: comments.principal_comment ?? p.principal_comment,
        class_teacher_comment: comments.class_teacher_comment ?? p.class_teacher_comment,
      }));

      showSuccess("✨ AI Remarks generated successfully! You can review or edit them before saving.");
    } catch (e: any) {
      showError(safeAiError(e?.response?.data?.message, "Unable to generate AI comments."));
    } finally {
      setAiCommenting(false);
    }
  };

  // -----------------------------
  // Save Student Result
  // -----------------------------
  const handleSave = async (andNext = false) => {
    if (!student) return showWarning("Please select a student first.");

    let activeBatchId = batchId;
    if (!activeBatchId) {
      if (!student.school_id || !student.level?.id || !term || !session) {
        return showWarning("Active term/session is required to save results.");
      }
      try {
        const resolveRes = await authApi.post("/result-batches/resolve", {
          school_id: student.school_id,
          class_id: student.level.id,
          term,
          session,
        });
        activeBatchId = resolveRes.data?.batch?.id;
        if (activeBatchId) setBatchId(activeBatchId);
      } catch (err: any) {
        showError(err?.response?.data?.message || "Failed to resolve result batch.");
        return;
      }
    }

    setSaving(true);
    try {
      const resultsPayload = Object.values(scores).map((row) => {
        const carry = includeCarryOver && carryOverAllowed ? buildCarryOver(row.subject_id, term, row.total ?? 0) : null;
        return {
          subject_id: row.subject_id,
          ca: row.ca,
          exam: row.exam ?? null,
          total: row.total ?? null,
          grade: row.grade ?? null,
          remark: row.remark ?? null,
          comment: null,
          signature: null,
          carry_over: carry,
        };
      });

      const payload = {
        rollno: student.reg_no,
        department,
        section_id: null,
        summary: {
          total_grade: summary.total_grade,
          principal_comment: summary.principal_comment,
          class_teacher_comment: summary.class_teacher_comment,
          general_remark: summary.general_remark,
          total_average: overallAverage,
          position: summary.position,
          class_teacher: summary.class_teacher,
          class_size: summary.class_size,
          meta: summary.meta,
        },
        results: resultsPayload,
      };

      await authApi.post(`/result-batches/${activeBatchId}/students/${student.id}/upsert`, payload);

      showSuccess(`Saved result for ${student.firstname} ${student.surname} ✅`);

      // Update student status in classStudents
      setClassStudents((prev) =>
        prev.map((st) => (st.id === student.id ? { ...st, status: "completed", saved_at: new Date().toISOString() } : st))
      );

      if (andNext) {
        // Find next student in roster
        const currentIndex = classStudents.findIndex((st) => st.id === student.id);
        if (currentIndex !== -1 && currentIndex + 1 < classStudents.length) {
          const nextStudent = classStudents[currentIndex + 1];
          loadStudentInBatch(activeBatchId!, nextStudent.id);
        } else {
          showInfo("You have reached the end of the class roster! 🎉");
          setStep(3);
        }
      } else {
        setStep(3);
      }
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to save student result.");
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------
  // Compute Batch
  // -----------------------------
  const handleComputeBatch = async () => {
    if (!batchId) return showWarning("No active batch selected.");
    setComputing(true);
    try {
      await authApi.post(`/result-batches/${batchId}/compute`);
      showSuccess("Batch compilation completed! Rankings and averages calculated. ✅");
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to compute batch");
    } finally {
      setComputing(false);
    }
  };

  // Filtered roster students
  const filteredRoster = useMemo(() => {
    if (!studentFilterText.trim()) return classStudents;
    const q = studentFilterText.trim().toLowerCase();
    return classStudents.filter(
      (st) =>
        st.firstname.toLowerCase().includes(q) ||
        st.surname.toLowerCase().includes(q) ||
        st.reg_no.toLowerCase().includes(q)
    );
  }, [classStudents, studentFilterText]);

  // Quick navigation next/previous
  const currentRosterIndex = useMemo(() => {
    if (!student) return -1;
    return classStudents.findIndex((st) => st.id === student.id);
  }, [classStudents, student]);

  const hasPrevious = currentRosterIndex > 0;
  const hasNext = currentRosterIndex !== -1 && currentRosterIndex < classStudents.length - 1;

  const navigateToStudent = (direction: "prev" | "next") => {
    if (!batchId) return;
    const targetIdx = direction === "prev" ? currentRosterIndex - 1 : currentRosterIndex + 1;
    if (targetIdx >= 0 && targetIdx < classStudents.length) {
      loadStudentInBatch(batchId, classStudents[targetIdx].id);
    }
  };

  return (
    <>
      <PageTitle title="Enter Student Results | SchoolProfit" />
      <style>{`
        /* ================= Advanced Score Entry Styles ================= */
        .gq-se-main {
          background-color: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: 24px 28px 60px;
        }

        /* Banner */
        .gq-se-hero {
          background: linear-gradient(135deg, #0F172A 0%, #1E293B 55%, #0B192C 100%);
          border-radius: 20px;
          padding: 26px 32px;
          color: #FFFFFF;
          margin-bottom: 22px;
          box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.18);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        .gq-se-hero-tag {
          font-size: 11.5px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #38BDF8;
          font-weight: 800;
          margin-bottom: 4px;
        }
        .gq-se-hero-title {
          font-size: 24px;
          font-weight: 800;
          margin: 0 0 6px 0;
          color: #FFFFFF;
        }
        .gq-se-hero-desc {
          font-size: 13px;
          color: #CBD5E1;
          margin: 0;
          max-width: 580px;
        }

        /* Workflow Step Tabs */
        .gq-se-steps {
          display: flex;
          gap: 10px;
          background: #FFFFFF;
          padding: 8px 12px;
          border-radius: 14px;
          border: 1px solid #E2E8F0;
          margin-bottom: 22px;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
          flex-wrap: wrap;
        }
        .gq-se-step-btn {
          flex: 1;
          min-width: 180px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          border-radius: 10px;
          border: 1px solid transparent;
          background: transparent;
          color: #64748B;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .gq-se-step-btn.active {
          background: #EFF6FF;
          border-color: #BFDBFE;
          color: #1D4ED8;
          box-shadow: 0 2px 6px rgba(29, 78, 216, 0.08);
        }
        .gq-se-step-btn.completed {
          color: #059669;
        }
        .gq-se-step-num {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #E2E8F0;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11.5px;
          font-weight: 800;
        }
        .gq-se-step-btn.active .gq-se-step-num {
          background: #2563EB;
          color: #FFFFFF;
        }
        .gq-se-step-btn.completed .gq-se-step-num {
          background: #10B981;
          color: #FFFFFF;
        }

        /* Panel */
        .gq-se-panel {
          background: #FFFFFF;
          border-radius: 16px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
          overflow: hidden;
          margin-bottom: 20px;
        }
        .gq-se-panel-header {
          padding: 16px 20px;
          border-bottom: 1px solid #E2E8F0;
          background: #FAFAFC;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .gq-se-panel-title {
          font-size: 15px;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Student Roster Sidebar */
        .gq-se-roster-list {
          max-height: 520px;
          overflow-y: auto;
          padding: 8px;
        }
        .gq-se-roster-item {
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid #F1F5F9;
          margin-bottom: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: #FFFFFF;
        }
        .gq-se-roster-item:hover {
          border-color: #CBD5E1;
          background: #F8FAFC;
        }
        .gq-se-roster-item.active {
          border-color: #93C5FD;
          background: #EFF6FF;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.08);
        }
        .gq-se-roster-name {
          font-size: 12.5px;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
        }
        .gq-se-roster-reg {
          font-size: 11px;
          color: #64748B;
        }

        /* Score Table Matrix */
        .gq-se-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .gq-se-table th {
          background: #F8FAFC;
          color: #475569;
          font-size: 11.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 12px 14px;
          border-bottom: 1px solid #E2E8F0;
        }
        .gq-se-table td {
          padding: 10px 14px;
          border-bottom: 1px solid #F1F5F9;
          vertical-align: middle;
        }
        .gq-se-table tr:hover td {
          background: #FAFAFC;
        }

        /* Score Inputs */
        .gq-se-input-score {
          width: 80px;
          padding: 7px 10px;
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          font-size: 13px;
          font-weight: 700;
          text-align: center;
          color: #0F172A;
          background: #FFFFFF;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .gq-se-input-score:focus {
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        .gq-se-input-text {
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          font-size: 12.5px;
          outline: none;
          width: 100%;
        }
        .gq-se-input-text:focus {
          border-color: #2563EB;
        }

        /* Badges */
        .gq-se-badge-total {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 44px;
          padding: 5px 10px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 800;
          background: #F1F5F9;
          color: #0F172A;
          border: 1px solid #E2E8F0;
        }
        .gq-se-badge-total.high { background: #ECFDF5; color: #047857; border-color: #A7F3D0; }
        .gq-se-badge-total.mid { background: #EFF6FF; color: #1D4ED8; border-color: #BFDBFE; }
        .gq-se-badge-total.low { background: #FEF2F2; color: #B91C1C; border-color: #FECACA; }

        /* Floating Sticky Action Bar */
        .gq-se-sticky-bar {
          position: sticky;
          bottom: 16px;
          z-index: 100;
          background: #0F172A;
          color: #FFFFFF;
          border-radius: 16px;
          padding: 14px 22px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.35);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-top: 24px;
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto gq-app-main gq-se-main d-flex flex-column min-vh-100">
            {/* HERO BANNER */}
            <div className="gq-se-hero">
              <div>
                <div className="gq-se-hero-tag">Academic Records • Score Matrix</div>
                <h1 className="gq-se-hero-title">Student Result Entry Sheet</h1>
                <p className="gq-se-hero-desc">
                  Effortlessly record continuous assessments, terminal exams, and generate AI-powered performance remarks for {term || "Active Term"} {session || "Academic Session"}.
                </p>
              </div>

              <div className="d-flex gap-2 align-items-center flex-wrap">
                <button
                  className="btn btn-outline-light btn-sm"
                  style={{ borderRadius: 8, fontWeight: 700 }}
                  onClick={() => navigate("/results")}
                >
                  ← Results Command Hub
                </button>
                {batchId && (
                  <button
                    className="btn btn-warning btn-sm"
                    style={{ borderRadius: 8, fontWeight: 700, color: "#0F172A" }}
                    onClick={handleComputeBatch}
                    disabled={computing}
                  >
                    {computing ? "Computing..." : "⚡ 1-Click Compute Batch"}
                  </button>
                )}
              </div>
            </div>

            {/* 3-STEP WORKFLOW STEPPER */}
            <div className="gq-se-steps">
              <button
                className={`gq-se-step-btn ${step === 1 ? "active" : student ? "completed" : ""}`}
                onClick={() => setStep(1)}
              >
                <span className="gq-se-step-num">1</span>
                <span>Select Class & Student</span>
              </button>

              <button
                className={`gq-se-step-btn ${step === 2 ? "active" : ""}`}
                onClick={() => student && setStep(2)}
                disabled={!student}
              >
                <span className="gq-se-step-num">2</span>
                <span>Enter Subject Scores</span>
              </button>

              <button
                className={`gq-se-step-btn ${step === 3 ? "active" : ""}`}
                onClick={() => setStep(3)}
                disabled={step !== 3}
              >
                <span className="gq-se-step-num">3</span>
                <span>Review & AI Remarks</span>
              </button>
            </div>

            {/* STEP 1: CLASS ROSTER & SEARCH PICKER */}
            {step === 1 && (
              <div className="row g-4">
                {/* Class Selection & Quick Roster */}
                <div className="col-lg-7">
                  <div className="gq-se-panel h-100">
                    <div className="gq-se-panel-header">
                      <h3 className="gq-se-panel-title">
                        <span>🏫 Step 1A: Choose Class Roster</span>
                      </h3>
                      <span className="badge bg-primary">Recommended for Teachers</span>
                    </div>

                    <div className="p-4">
                      <div className="mb-3">
                        <label className="form-label fw-bold text-dark small">Select Your Class</label>
                        <select
                          className="form-select"
                          style={{ padding: "10px 14px", borderRadius: 10, fontWeight: 700 }}
                          value={selectedClassId}
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : "";
                            setSelectedClassId(val);
                            setStudent(null);
                          }}
                        >
                          <option value="">-- Choose Class to Load Students --</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name} {cls.section?.name ? `(${cls.section.name})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedClassId ? (
                        <div>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="small fw-bold text-secondary">
                              Class Students ({classStudents.length})
                            </span>
                            <input
                              type="text"
                              placeholder="Filter students by name..."
                              className="form-control form-control-sm"
                              style={{ width: 220, borderRadius: 8 }}
                              value={studentFilterText}
                              onChange={(e) => setStudentFilterText(e.target.value)}
                            />
                          </div>

                          {loadingStudents ? (
                            <div className="p-4 text-center text-muted">
                              <span className="spinner-border spinner-border-sm me-2" /> Loading class roster...
                            </div>
                          ) : filteredRoster.length === 0 ? (
                            <div className="alert alert-light border text-center text-muted p-4">
                              No students found in this class.
                            </div>
                          ) : (
                            <div className="gq-se-roster-list border rounded-3">
                              {filteredRoster.map((st) => (
                                <div
                                  key={st.id}
                                  className={`gq-se-roster-item ${student?.id === st.id ? "active" : ""}`}
                                  onClick={() => loadStudentInBatch(batchId || 0, st.id)}
                                >
                                  <div>
                                    <div className="gq-se-roster-name">
                                      {st.firstname} {st.surname}
                                    </div>
                                    <div className="gq-se-roster-reg">{st.reg_no}</div>
                                  </div>

                                  <div className="d-flex align-items-center gap-2">
                                    {st.status === "completed" ? (
                                      <span className="badge bg-success-subtle text-success border border-success-subtle">
                                        ✓ Saved
                                      </span>
                                    ) : (
                                      <span className="badge bg-secondary-subtle text-secondary">Pending</span>
                                    )}
                                    <button
                                      className="btn btn-sm btn-primary"
                                      style={{ borderRadius: 6, fontSize: 11.5, fontWeight: 700 }}
                                    >
                                      Enter Scores →
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="alert alert-light border text-center p-4 text-muted">
                          Select a class above to load students.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Direct Lookup Alternative */}
                <div className="col-lg-5">
                  <div className="gq-se-panel h-100">
                    <div className="gq-se-panel-header">
                      <h3 className="gq-se-panel-title">
                        <span>🔍 Step 1B: Direct Student Lookup</span>
                      </h3>
                    </div>

                    <div className="p-4">
                      <p className="small text-muted mb-3">
                        Want to enter or edit a single student without selecting a whole class? Search by admission number:
                      </p>

                      <div className="mb-3">
                        <label className="form-label fw-bold text-dark small">Admission Number</label>
                        <input
                          className="form-control"
                          style={{ padding: "10px 14px", borderRadius: 10 }}
                          value={admissionNo}
                          onChange={(e) => setAdmissionNo(e.target.value)}
                          placeholder="e.g. STU-2024-001"
                          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                      </div>

                      <button
                        className="btn btn-dark w-100 py-2 fw-bold"
                        style={{ borderRadius: 10 }}
                        onClick={handleSearch}
                        disabled={searching}
                      >
                        {searching ? "Searching..." : "Search & Open Sheet →"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: SCORE ENTRY MATRIX */}
            {step === 2 && student && (
              <div className="row g-4">
                {/* Left Sidebar Student Roster (Quick Switcher) */}
                <div className="col-lg-3 d-none d-lg-block">
                  <div className="gq-se-panel position-sticky" style={{ top: 20 }}>
                    <div className="gq-se-panel-header">
                      <h4 className="gq-se-panel-title" style={{ fontSize: 13.5 }}>
                        <span>👥 Class Roster</span>
                      </h4>
                      <span className="badge bg-dark">{classStudents.length}</span>
                    </div>

                    <div className="p-2">
                      <input
                        type="text"
                        placeholder="Search student..."
                        className="form-control form-control-sm mb-2"
                        value={studentFilterText}
                        onChange={(e) => setStudentFilterText(e.target.value)}
                        style={{ borderRadius: 6 }}
                      />

                      <div className="gq-se-roster-list" style={{ maxHeight: 420 }}>
                        {filteredRoster.map((st) => (
                          <div
                            key={st.id}
                            className={`gq-se-roster-item ${student.id === st.id ? "active" : ""}`}
                            onClick={() => loadStudentInBatch(batchId || 0, st.id)}
                          >
                            <div style={{ overflow: "hidden" }}>
                              <div className="gq-se-roster-name text-truncate">
                                {st.firstname} {st.surname}
                              </div>
                              <div className="gq-se-roster-reg">{st.reg_no}</div>
                            </div>
                            {st.status === "completed" && <span className="text-success small fw-bold">✓</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Score Sheet */}
                <div className="col-lg-9">
                  {/* Current Active Student Header Card */}
                  <div className="gq-se-panel mb-3">
                    <div className="p-3 d-flex justify-content-between align-items-center gap-3 flex-wrap bg-light border-bottom">
                      <div>
                        <div className="d-flex align-items-center gap-2">
                          <h4 className="mb-0 fw-bold text-dark">
                            {student.firstname} {student.surname}
                          </h4>
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                            {student.reg_no}
                          </span>
                        </div>
                        <div className="text-muted small mt-1">
                          Class: <strong>{student.level?.name || "N/A"}</strong> • Term: <strong>{term}</strong> • Session: <strong>{session}</strong>
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        {/* Previous/Next Navigation */}
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => navigateToStudent("prev")}
                            disabled={!hasPrevious}
                            title="Previous Student"
                          >
                            ◀ Prev
                          </button>
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => navigateToStudent("next")}
                            disabled={!hasNext}
                            title="Next Student"
                          >
                            Next ▶
                          </button>
                        </div>

                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => setStep(1)}
                        >
                          Change Class
                        </button>
                      </div>
                    </div>

                    {/* Score Format & View Mode Controls */}
                    <div className="p-3 d-flex justify-content-between align-items-center gap-3 flex-wrap">
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <label className="small fw-bold text-dark mb-0">Score Format:</label>
                        <select
                          className="form-select form-select-sm"
                          style={{ width: "auto", fontWeight: 700, borderRadius: 8 }}
                          value={scoreType}
                          onChange={(e) => handleScoreTypeChange(e.target.value)}
                        >
                          {SCORE_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        <span className="badge bg-secondary-subtle text-secondary small">
                          CA: {caParts.join(" + ")} marks | Exam: {examPart} marks | Total: 100
                        </span>
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        <div className="btn-group btn-group-sm">
                          <button
                            className={`btn ${viewMode === "table" ? "btn-dark" : "btn-outline-dark"}`}
                            onClick={() => setViewMode("table")}
                          >
                            📊 Table Grid
                          </button>
                          <button
                            className={`btn ${viewMode === "card" ? "btn-dark" : "btn-outline-dark"}`}
                            onClick={() => setViewMode("card")}
                          >
                            🎴 Cards
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Carry Over Toggle Banner */}
                  {carryOverAllowed && (
                    <div className="alert alert-info py-2 px-3 d-flex justify-content-between align-items-center mb-3">
                      <div className="form-check mb-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="includeCarryOverCheck"
                          checked={includeCarryOver}
                          onChange={(e) => setIncludeCarryOver(e.target.checked)}
                        />
                        <label className="form-check-label small fw-bold" htmlFor="includeCarryOverCheck">
                          Include previous term scores (Cumulative Carry-Over)
                        </label>
                      </div>
                      {carryLoading && <span className="spinner-border spinner-border-sm" />}
                    </div>
                  )}

                  {/* SUBJECT SCORES MATRIX: SPREADSHEET TABLE VIEW */}
                  {viewMode === "table" ? (
                    <div className="gq-se-panel mb-4">
                      <div className="table-responsive">
                        <table className="gq-se-table">
                          <thead>
                            <tr>
                              <th style={{ width: 40 }}>#</th>
                              <th>Subject Name</th>
                              {caParts.map((max, idx) => (
                                <th key={`th-ca-${idx}`} style={{ textAlign: "center", width: 100 }}>
                                  CA {idx + 1} (/{max})
                                </th>
                              ))}
                              <th style={{ textAlign: "center", width: 110 }}>Exam (/{examPart})</th>
                              <th style={{ textAlign: "center", width: 90 }}>Total (100)</th>
                              <th style={{ textAlign: "center", width: 80 }}>Grade</th>
                              <th style={{ width: 150 }}>Remark</th>
                            </tr>
                          </thead>

                          <tbody>
                            {subjects.map((subj, sIdx) => {
                              const row = scores[subj.name];
                              const total = row?.total ?? 0;
                              const totalClass = total >= 70 ? "high" : total >= 50 ? "mid" : total > 0 ? "low" : "";

                              return (
                                <tr key={subj.id}>
                                  <td className="text-muted fw-bold small">{sIdx + 1}</td>
                                  <td>
                                    <div className="fw-bold text-dark">{subj.name}</div>
                                  </td>

                                  {/* CA Inputs */}
                                  {caParts.map((max, idx) => {
                                    const caKey = `ca${idx}`;
                                    const val = row?.ca?.[caKey];

                                    return (
                                      <td key={`${subj.id}-ca-${idx}`} style={{ textAlign: "center" }}>
                                        <input
                                          type="number"
                                          min={0}
                                          max={max}
                                          className="gq-se-input-score"
                                          value={val !== undefined ? val : ""}
                                          placeholder="0"
                                          onFocus={() => handleFocusClean(subj.name, caKey, false)}
                                          onChange={(e) => handleCaChange(subj.name, caKey, e.target.value, max)}
                                        />
                                      </td>
                                    );
                                  })}

                                  {/* Exam Input */}
                                  <td style={{ textAlign: "center" }}>
                                    <input
                                      type="number"
                                      min={0}
                                      max={examPart}
                                      className="gq-se-input-score"
                                      value={row?.exam !== undefined ? row.exam : ""}
                                      placeholder="0"
                                      onFocus={() => handleFocusClean(subj.name, "exam", true)}
                                      onChange={(e) => handleExamChange(subj.name, e.target.value)}
                                    />
                                  </td>

                                  {/* Auto Total */}
                                  <td style={{ textAlign: "center" }}>
                                    <span className={`gq-se-badge-total ${totalClass}`}>
                                      {total}
                                    </span>
                                  </td>

                                  {/* Grade Input */}
                                  <td style={{ textAlign: "center" }}>
                                    <input
                                      type="text"
                                      maxLength={3}
                                      className="gq-se-input-text text-center fw-bold"
                                      style={{ width: 55, textTransform: "uppercase" }}
                                      value={row?.grade || ""}
                                      onChange={(e) => handleTextField(subj.name, "grade", e.target.value)}
                                      placeholder="A"
                                    />
                                  </td>

                                  {/* Remark Input */}
                                  <td>
                                    <input
                                      type="text"
                                      className="gq-se-input-text"
                                      value={row?.remark || ""}
                                      onChange={(e) => handleTextField(subj.name, "remark", e.target.value)}
                                      placeholder="e.g. Excellent"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* CARDS VIEW */
                    <div className="row g-3 mb-4">
                      {subjects.map((subj) => {
                        const row = scores[subj.name];
                        return (
                          <div className="col-md-6" key={subj.id}>
                            <div className="card border-1 shadow-sm h-100 rounded-3">
                              <div className="card-header bg-light d-flex justify-content-between align-items-center py-2">
                                <span className="fw-bold text-dark">{subj.name}</span>
                                <span className="badge bg-primary">Total: {row?.total ?? 0}</span>
                              </div>
                              <div className="card-body p-3">
                                <div className="row g-2 mb-2">
                                  {caParts.map((max, idx) => (
                                    <div className="col" key={`card-ca-${idx}`}>
                                      <label className="small text-muted fw-bold">CA {idx + 1} (/{max})</label>
                                      <input
                                        type="number"
                                        className="form-control form-control-sm text-center fw-bold"
                                        value={row?.ca?.[`ca${idx}`] ?? ""}
                                        placeholder="0"
                                        onChange={(e) => handleCaChange(subj.name, `ca${idx}`, e.target.value, max)}
                                      />
                                    </div>
                                  ))}
                                  <div className="col">
                                    <label className="small text-muted fw-bold">Exam (/{examPart})</label>
                                    <input
                                      type="number"
                                      className="form-control form-control-sm text-center fw-bold"
                                      value={row?.exam ?? ""}
                                      placeholder="0"
                                      onChange={(e) => handleExamChange(subj.name, e.target.value)}
                                    />
                                  </div>
                                </div>
                                <div className="row g-2">
                                  <div className="col-4">
                                    <label className="small text-muted fw-bold">Grade</label>
                                    <input
                                      className="form-control form-control-sm text-center fw-bold"
                                      value={row?.grade || ""}
                                      onChange={(e) => handleTextField(subj.name, "grade", e.target.value)}
                                    />
                                  </div>
                                  <div className="col-8">
                                    <label className="small text-muted fw-bold">Remark</label>
                                    <input
                                      className="form-control form-control-sm"
                                      value={row?.remark || ""}
                                      onChange={(e) => handleTextField(subj.name, "remark", e.target.value)}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* SUMMARY & REMARKS PANEL */}
                  <div className="gq-se-panel mb-4">
                    <div className="gq-se-panel-header">
                      <h4 className="gq-se-panel-title">
                        <span>📝 Performance Summary & AI Remarks</span>
                      </h4>
                      <div className="d-flex align-items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary fw-bold"
                          onClick={generateAiComments}
                          disabled={aiCommenting || saving}
                        >
                          {aiCommenting ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1" /> Generating AI Remarks...
                            </>
                          ) : (
                            <>✨ 1-Click AI Remarks</>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="p-4">
                      {/* Live Stats Row */}
                      <div className="row g-3 mb-4">
                        <div className="col-md-4">
                          <div className="p-3 border rounded-3 bg-light text-center">
                            <span className="small text-muted text-uppercase fw-bold d-block">Overall Average</span>
                            <span className="fs-4 fw-bold text-primary">{overallAverage || "0.0"}%</span>
                          </div>
                        </div>

                        <div className="col-md-4">
                          <div className="p-3 border rounded-3 bg-light text-center">
                            <span className="small text-muted text-uppercase fw-bold d-block">Calculated Grade</span>
                            <span className="fs-4 fw-bold text-success">{summary.total_grade || "—"}</span>
                          </div>
                        </div>

                        <div className="col-md-4">
                          <div className="p-3 border rounded-3 bg-light text-center">
                            <span className="small text-muted text-uppercase fw-bold d-block">Attendance</span>
                            <span className="fs-6 fw-bold text-dark">
                              {summary.meta.no_present || "0"} Present / {summary.meta.school_open || "0"} Open
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Comments Form */}
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label small fw-bold text-dark">Class Teacher Comment</label>
                          <textarea
                            rows={2}
                            className="form-control"
                            value={summary.class_teacher_comment}
                            onChange={(e) => setSummary((p) => ({ ...p, class_teacher_comment: e.target.value }))}
                            placeholder="Personalized feedback on academic performance and character..."
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label small fw-bold text-dark">Principal / Headmaster Comment</label>
                          <textarea
                            rows={2}
                            className="form-control"
                            value={summary.principal_comment}
                            onChange={(e) => setSummary((p) => ({ ...p, principal_comment: e.target.value }))}
                            placeholder="Executive recommendation and encouragement..."
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label small fw-bold text-dark">General Remark</label>
                          <input
                            className="form-control"
                            value={summary.general_remark}
                            onChange={(e) => setSummary((p) => ({ ...p, general_remark: e.target.value }))}
                            placeholder="e.g. Promoted to Next Class / Excellent Term Performance"
                          />
                        </div>

                        <div className="col-md-3">
                          <label className="form-label small fw-bold text-dark">Days Present</label>
                          <input
                            type="number"
                            className="form-control"
                            value={summary.meta.no_present}
                            onChange={(e) => setSummary((p) => ({ ...p, meta: { ...p.meta, no_present: e.target.value } }))}
                          />
                        </div>

                        <div className="col-md-3">
                          <label className="form-label small fw-bold text-dark">Days Absent</label>
                          <input
                            type="number"
                            className="form-control"
                            value={summary.meta.no_absent}
                            onChange={(e) => setSummary((p) => ({ ...p, meta: { ...p.meta, no_absent: e.target.value } }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* STICKY BOTTOM ACTION BAR */}
                  <div className="gq-se-sticky-bar">
                    <div className="d-flex align-items-center gap-3">
                      <div>
                        <div className="fw-bold" style={{ fontSize: 14 }}>
                          {student.firstname} {student.surname}
                        </div>
                        <div style={{ fontSize: 11.5, color: "#94A3B8" }}>
                          Average: {overallAverage || "0.0"}% • Total Subjects: {subjects.length}
                        </div>
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <button
                        className="btn btn-outline-light btn-sm"
                        style={{ borderRadius: 8, fontWeight: 700 }}
                        onClick={() => handleSave(false)}
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "💾 Save Result"}
                      </button>

                      <button
                        className="btn btn-success btn-sm"
                        style={{ borderRadius: 8, fontWeight: 700, padding: "8px 16px" }}
                        onClick={() => handleSave(true)}
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "💾 Save & Next Student ➔"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: RESULT SAVED CONFIRMATION & BATCH ACTIONS */}
            {step === 3 && student && (
              <div className="gq-se-panel p-5 text-center">
                <div className="mb-3">
                  <span style={{ fontSize: 54 }}>🎉</span>
                </div>
                <h2 className="fw-bold text-dark mb-2">Result Saved Successfully!</h2>
                <p className="text-muted mb-4" style={{ maxWidth: 520, margin: "0 auto" }}>
                  The result record for <strong>{student.firstname} {student.surname}</strong> ({student.reg_no}) has been securely recorded.
                </p>

                <div className="d-flex justify-content-center gap-3 flex-wrap">
                  <button
                    className="btn btn-outline-primary"
                    style={{ borderRadius: 10, fontWeight: 700 }}
                    onClick={() => setStep(2)}
                  >
                    ✏️ Edit This Student's Scores
                  </button>

                  <button
                    className="btn btn-success"
                    style={{ borderRadius: 10, fontWeight: 700 }}
                    onClick={() => {
                      const nextIdx = currentRosterIndex + 1;
                      if (nextIdx < classStudents.length) {
                        loadStudentInBatch(batchId!, classStudents[nextIdx].id);
                      } else {
                        setStep(1);
                      }
                    }}
                  >
                    👤 Enter Next Student in Class ➔
                  </button>

                  <button
                    className="btn btn-dark"
                    style={{ borderRadius: 10, fontWeight: 700 }}
                    onClick={() => navigate("/results")}
                  >
                    ⚡ Results Command Hub
                  </button>
                </div>
              </div>
            )}

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}
