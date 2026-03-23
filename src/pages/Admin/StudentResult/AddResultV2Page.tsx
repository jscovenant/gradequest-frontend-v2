import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import PageTitle from "../../../components/PageTitle";

type Subject = { id: number; name: string };

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

type CompletedStudent = {
  student_id: number;
  reg_no: string;
  name: string;
  saved_at: string; // ISO
};

type CarryOverJson = {
  enabled: boolean;
  terms: Record<string, number>; // previous terms totals
  current_term: Record<string, number>; // current term total
  cumulative_total: number;
  cumulative_average: number;
};

type ScoresState = Record<
  string,
  {
    subject_id: number;
    ca: Record<string, number>;
    exam?: number;
    total?: number;
    grade?: string;
    remark?: string;
    carry_over?: CarryOverJson;
  }
>;

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const SCORE_TYPES = [
  { label: "10/10/10/10/60", value: "10/10/10/10/60" },
  { label: "20/20/60", value: "20/20/60" },
  { label: "40/60", value: "40/60" },
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

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function CenterLoader({ label }: { label?: string }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: 280 }}>
      <div className="spinner-border" role="status" aria-label="Loading" />
      <div className="text-muted mt-2 small">{label || "Loading..."}</div>
    </div>
  );
}

export default function AddResultV2Page() {
  const { showSuccess, showError, showInfo, showWarning } = useToast();
  const query = useQuery();
  const urlBatchId = Number(query.get("batchId") || 0);
  const urlStudentId = Number(query.get("studentId") || 0);
  const [carryLoading, setCarryLoading] = useState(false);


  // -----------------------------
  // Layout state (TopNav/Sidebar)
  // -----------------------------
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => window.innerWidth >= 768);
  const [isDesktop, setIsDesktop] = useState<boolean>(() => window.innerWidth >= 768);

  // Carry-over
  const [includeCarryOver, setIncludeCarryOver] = useState(false);
  const [schoolTerms, setSchoolTerms] = useState<string[]>([]);
  const [carryPreview, setCarryPreview] = useState<Record<number, Record<string, number>>>({});

  

  useEffect(() => {
    const onResize = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      if (desktop) setSidebarOpen(true);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);






  // -----------------------------
  // LocalStorage keys
  // -----------------------------
  const DRAFT_KEY = "gq_result_draft_v2";
  const COMPLETED_KEY_PREFIX = "gq_result_completed_v2_batch_";

  // -----------------------------
  // Page init loading
  // -----------------------------
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setPageLoading(false), 120);
    return () => window.clearTimeout(t);
  }, []);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const directMode = !!urlBatchId && !!urlStudentId;

  // Search inputs
  const [admissionNo, setAdmissionNo] = useState("");
  const [searching, setSearching] = useState(false);

  // Loaded data
  const [student, setStudent] = useState<Student | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [term, setTerm] = useState<string>("");
  const [session, setSession] = useState<string>("");
  const [department, setDepartment] = useState<string>("");

  // Scoring config
  const [scoreType, setScoreType] = useState(SCORE_TYPES[0].value);
  const parts = useMemo(() => parseParts(scoreType), [scoreType]);
  const caParts = useMemo(() => parts.slice(0, Math.max(0, parts.length - 1)), [parts]);
  const examPart = useMemo(() => parts[parts.length - 1] ?? 0, [parts]);

  // Batch
  const [batchId, setBatchId] = useState<number | null>(null);

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

  // Sidebar: completed
  const [completedStudents, setCompletedStudents] = useState<CompletedStudent[]>([]);

  const [saving, setSaving] = useState(false);
  const [computing, setComputing] = useState(false);

  const overallAverage = useMemo(() => {
  // no scores yet
  const rows = Object.values(scores);

  // If checkbox is ON, average the cumulative averages (per subject)
  if (includeCarryOver) {
    const cumAverages = rows
      .map((r) => buildCarryOver(r.subject_id, term, r.total ?? 0).cumulative_average)
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (!cumAverages.length) return "";
    return (cumAverages.reduce((a, b) => a + b, 0) / cumAverages.length).toFixed(1);
  }

  // Normal mode: average current-term totals
  const totals = rows
    .map((r) => Number(r.total) || 0)
    .filter((t) => t > 0);

  if (!totals.length) return "";
  return (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1);
}, [scores, includeCarryOver, carryPreview, term]);


  // -----------------------------
  // Context helper (HOISTED EARLY)
  // -----------------------------
  function applyContext(nextTerm?: string, nextSession?: string) {
    if (nextTerm) setTerm(nextTerm);
    if (nextSession) setSession(nextSession);
  }

  const sanitizeAdmission = (value: string) => value.replace(/[^a-zA-Z0-9\-\/]/g, "");

  // -----------------------------
  // Draft: Auto-save (debounced)
  // -----------------------------
  const saveTimerRef = useRef<number | null>(null);

  const saveDraftNow = () => {
    const draft = {
      step,
      admissionNo,
      student,
      subjects,
      term,
      session,
      department,
      scoreType,
      scores,
      summary,
      batchId,
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (step === 1) return;
    if (!student) return;

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    saveTimerRef.current = window.setTimeout(() => {
      saveDraftNow();
    }, 450);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, admissionNo, student, subjects, term, session, department, scoreType, scores, summary, batchId]);

  const loadDraft = () => {
    const draft = safeJsonParse<any>(localStorage.getItem(DRAFT_KEY));
    if (!draft) {
      showInfo("No saved draft found.");
      return;
    }

    setStep(draft.step ?? 1);
    setAdmissionNo(draft.admissionNo ?? "");
    setStudent(draft.student ?? null);
    setSubjects(draft.subjects ?? []);

    // IMPORTANT: Do not override backend context in direct mode.
    // Also, only apply draft context if current context is empty.
    if (!directMode) {
      if (!term) setTerm(draft.term ?? "");
      if (!session) setSession(draft.session ?? "");
    }

    setDepartment(draft.department ?? "");
    setScoreType(draft.scoreType ?? SCORE_TYPES[0].value);
    setScores(draft.scores ?? {});
    setSummary(
      draft.summary ?? {
        total_grade: "",
        principal_comment: "",
        class_teacher_comment: "",
        general_remark: "",
        position: "",
        class_teacher: "",
        class_size: "",
        meta: { resumption_date: "", school_open: "", school_close: "", no_present: "", no_absent: "" },
      }
    );
    setBatchId(draft.batchId ?? null);

    showSuccess("Draft loaded ✅");
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    showInfo("Draft cleared.");
  };

  // -----------------------------
  // Completed sidebar storage (per batch)
  // -----------------------------
  const loadCompletedForBatch = (id: number) => {
    const key = `${COMPLETED_KEY_PREFIX}${id}`;
    const list = safeJsonParse<CompletedStudent[]>(localStorage.getItem(key)) ?? [];
    setCompletedStudents(list);
  };

  useEffect(() => {
    if (batchId) loadCompletedForBatch(batchId);
    else setCompletedStudents([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  const addCompletedStudent = (bId: number, st: Student) => {
    const key = `${COMPLETED_KEY_PREFIX}${bId}`;
    const existing = safeJsonParse<CompletedStudent[]>(localStorage.getItem(key)) ?? [];

    const item: CompletedStudent = {
      student_id: st.id,
      reg_no: st.reg_no,
      name: `${st.firstname} ${st.surname}`,
      saved_at: new Date().toISOString(),
    };

    const next = [item, ...existing.filter((x) => x.student_id !== st.id)];
    localStorage.setItem(key, JSON.stringify(next));
    setCompletedStudents(next);
  };

  const clearCompletedForBatch = () => {
    if (!batchId) return;
    localStorage.removeItem(`${COMPLETED_KEY_PREFIX}${batchId}`);
    setCompletedStudents([]);
    showInfo("Batch completed list cleared.");
  };

  

  // -----------------------------
  // Reset
  // -----------------------------
  const resetAll = () => {
    setStep(1);
    setAdmissionNo("");
    setStudent(null);
    setSubjects([]);
    setTerm("");
    setSession("");
    setDepartment("");
    setBatchId(null);
    setScores({});
    setSummary({
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
    setCompletedStudents([]);
    showInfo("Reset complete.");
  };

  // -----------------------------
  // Carry Over builder
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
  // Boot from batch (direct mode)
  // -----------------------------
  useEffect(() => {
    let mounted = true;

    async function bootFromBatch() {
      if (!urlBatchId || !urlStudentId) return;

      setPageLoading(true);

      try {
        const res = await authApi.get(`/result-batches/${urlBatchId}/students/${urlStudentId}/result-form`);
        if (!mounted) return;

        const data = res.data;

        setSchoolTerms(data.terms ?? []);
        setCarryPreview(data.carry_over_preview ?? {});

        const existingRows = data.existing?.results ?? [];
        const detected = detectScoreTypeFromExisting(existingRows);
        if (detected) setScoreType(detected);

        setBatchId(data.batch?.id ?? urlBatchId);
        setStudent(data.student ?? null);
        setSubjects(data.subjects ?? []);
        applyContext(data.term ?? "", data.session ?? "");
        setDepartment(data.student?.department?.name ?? "");

        // init scores
        const init: ScoresState = {};
        for (const s of data.subjects ?? []) {
          init[s.name] = { subject_id: s.id, ca: {}, exam: undefined, total: undefined, grade: "", remark: "" };
        }

        // overlay saved results
        for (const row of existingRows) {
          const subj = (data.subjects ?? []).find((x: any) => x.id === row.subject_id);
          if (!subj) continue;

          init[subj.name] = {
            subject_id: row.subject_id,
            ca: row.ca ?? {},
            exam: row.exam ?? undefined,
            total: row.total ?? undefined,
            grade: row.grade ?? "",
            remark: row.remark ?? "",
            carry_over: row.carry_over ?? undefined,
          };
        }

        // recompute totals
        Object.keys(init).forEach((k) => {
          init[k].total = calcTotal(init[k].ca, init[k].exam);
        });

        setScores(init);

        if (data.existing?.summary) {
          setSummary((p) => ({
            ...p,
            ...data.existing.summary,
            meta: { ...p.meta, ...(data.existing.summary.meta ?? {}) },
          }));
        }

        setStep(2);
      } catch (e: any) {
        const status = e?.response?.status;
        const data = e?.response?.data;

        // OPTION B mismatch handler (409)
        if (status === 409) {
          showError(data?.message || "Batch term does not match active term.");
          // hard stop
          setStudent(null);
          setSubjects([]);
          setScores({});
          setBatchId(null);
          setStep(1);
          return;
        }

        showError(data?.message || "Failed to load student result form.");
      } finally {
        if (mounted) setPageLoading(false);
      }
    }

    bootFromBatch();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlBatchId, urlStudentId]);

  // -----------------------------
  // Search student (non-direct mode)
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
      applyContext(data.term || "", data.session || "");
      setDepartment(st.department?.name || data.student?.department?.name || "");

      // init scores
      const init: ScoresState = {};
      for (const s of subjs) {
        init[s.name] = { subject_id: s.id, ca: {}, exam: undefined, total: undefined, grade: "", remark: "" };
      }
      setScores(init);

      setStep(2);
      showSuccess("Student loaded successfully.");
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Student not found";
      showError(msg);
      setStudent(null);
      setSubjects([]);
      setScores({});
      setStep(1);
    } finally {
      setSearching(false);
    }
  };

  // -----------------------------
  // Resolve batch
  // -----------------------------
  const handleResolveBatch = async () => {
    if (!student?.school_id || !student.level?.id || !term || !session) {
      return showWarning("Current term/session is not set. Please set it in Settings before uploading results.");
    }

    try {
      const { data } = await authApi.post("/result-batches/resolve", {
        school_id: student.school_id,
        class_id: student.level.id,
        term,
        session,
      });

      setBatchId(data.batch.id);
      showSuccess(`Batch ready (#${data.batch.id}).`);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to resolve batch");
    }
  };


  
  useEffect(() => {
  if (directMode) return;
  if (!includeCarryOver) return;
  if (!session || !term) return;

  const studentId = student?.id; // capture
  if (!studentId) return;

  let mounted = true;

  async function loadCarry(id: number) {
    setCarryLoading(true);
    try {
      const res = await authApi.get(`/students/${id}/carry-over-preview`, {
        params: { session, term },
      });

      if (!mounted) return;

      setSchoolTerms(res.data?.terms ?? []);
      setCarryPreview(res.data?.carry_over_preview ?? {});
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to load carry-over preview");
      setCarryPreview({});
      setSchoolTerms([]);
    } finally {
      if (mounted) setCarryLoading(false);
    }
  }

  loadCarry(studentId);

  return () => {
    mounted = false;
  };
}, [includeCarryOver, student?.id, session, term, directMode, showError]);


  // -----------------------------
  // Score editing helpers
  // -----------------------------
  const setScoreValue = (subjectName: string, updater: (prev: ScoresState[string]) => ScoresState[string]) => {
    setScores((prev) => {
      const current = prev[subjectName];
      if (!current) return prev;

      const nextRow = updater(current);
      nextRow.total = calcTotal(nextRow.ca, nextRow.exam);

      return { ...prev, [subjectName]: { ...nextRow } };
    });
  };

  // When the score type changes, optionally reset all score input fields (CA parts and exam) to 0
  const handleScoreTypeChange = (newType: string) => {
    // If there are any non-zero CA or exam values, confirm with the user before wiping them.
    const hasNonZero = Object.values(scores).some((r) => {
      if (!r) return false;
      const caVals = Object.values(r.ca ?? {}).map((v) => Number(v) || 0);
      if (caVals.some((v) => v !== 0)) return true;
      if (r.exam != null && Number(r.exam) !== 0) return true;
      return false;
    });

    if (hasNonZero) {
      const ok = window.confirm("Changing score type will reset all CA and Exam inputs to 0. Continue?");
      if (!ok) return; // user cancelled
    }

    setScoreType(newType);

    // compute new CA keys length from newType
    const newParts = parseParts(newType);
    const newCaParts = newParts.slice(0, Math.max(0, newParts.length - 1));

    setScores((prev) => {
      // If we don't have any existing rows but do have subjects, initialize from subjects
      const keys = Object.keys(prev).length ? Object.keys(prev) : subjects.map((s) => s.name);
      const next: ScoresState = {} as ScoresState;

      for (const k of keys) {
        const subj = subjects.find((s) => s.name === k);
        const prevRow = prev[k] ?? (subj ? { subject_id: subj.id, ca: {}, exam: 0, total: 0, grade: "", remark: "" } : undefined);
        if (!prevRow) continue;

        const newCa: Record<string, number> = {};
        for (let i = 0; i < newCaParts.length; i++) {
          newCa[`ca${i}`] = 0;
        }

        next[k] = {
          ...prevRow,
          ca: newCa,
          exam: 0,
          total: calcTotal(newCa, 0),
        };
      }

      return next;
    });
  };

  const handleCaChange = (subjectName: string, caKey: string, value: string, max: number) => {
    // Normalize leading zeros so typing '10' while default is '0' doesn't produce '010'
    const cleaned = value.replace(/^0+(?=\d)/, "");

    // If user cleared the input, remove the CA key so the input shows blank
    if (cleaned === "") {
      setScores((prev) => {
        const current = prev[subjectName];
        if (!current) return prev;
        const nextCa = { ...current.ca };
        delete nextCa[caKey];
        const nextRow = { ...current, ca: nextCa };
        nextRow.total = calcTotal(nextRow.ca, nextRow.exam);
        return { ...prev, [subjectName]: nextRow };
      });
      return;
    }

    const num = Number(cleaned);
    if (Number.isFinite(num) && num > max) {
      return showWarning(`${subjectName}: ${caKey.toUpperCase()} cannot be more than ${max}`);
    }

    setScoreValue(subjectName, (row) => ({
      ...row,
      ca: { ...row.ca, [caKey]: Number.isFinite(num) ? num : 0 },
    }));
  };

  const handleExamChange = (subjectName: string, value: string) => {
    // Normalize leading zeros to avoid '010' when user types '10'
    const cleaned = value.replace(/^0+(?=\d)/, "");

    // If user cleared the input, set exam to undefined so the input shows blank
    if (cleaned === "") {
      setScores((prev) => {
        const current = prev[subjectName];
        if (!current) return prev;
        const nextRow = { ...current, exam: undefined };
        nextRow.total = calcTotal(nextRow.ca, nextRow.exam);
        return { ...prev, [subjectName]: nextRow };
      });
      return;
    }

    const num = Number(cleaned);
    if (Number.isFinite(num) && num > examPart) {
      return showWarning(`${subjectName}: Exam cannot be more than ${examPart}`);
    }

    setScoreValue(subjectName, (row) => ({ ...row, exam: Number.isFinite(num) ? num : 0 }));
  };

  // Focus handlers: if the current value is exactly 0, clear it so typing replaces it visually
  const handleCaFocus = (subjectName: string, caKey: string) => {
    setScores((prev) => {
      const current = prev[subjectName];
      if (!current) return prev;
      const val = current.ca?.[caKey];
      if (val === 0) {
        const nextCa = { ...current.ca };
        delete nextCa[caKey];
        const nextRow = { ...current, ca: nextCa };
        nextRow.total = calcTotal(nextRow.ca, nextRow.exam);
        return { ...prev, [subjectName]: nextRow };
      }
      return prev;
    });
  };

  const handleExamFocus = (subjectName: string) => {
    setScores((prev) => {
      const current = prev[subjectName];
      if (!current) return prev;
      if (current.exam === 0) {
        const nextRow = { ...current, exam: undefined };
        nextRow.total = calcTotal(nextRow.ca, nextRow.exam);
        return { ...prev, [subjectName]: nextRow };
      }
      return prev;
    });
  };

  const handleTextField = (subjectName: string, field: "grade" | "remark", value: string) => {
    setScoreValue(subjectName, (row) => ({
      ...row,
      [field]: field === "grade" ? value.toUpperCase() : value,
    }));
  };

  // -----------------------------
  // Save result
  // -----------------------------
  const handleSave = async () => {
    if (!student) return showWarning("Search a student first.");
    if (!batchId) return showWarning("Resolve batch first (click 'Prepare Batch').");

    setSaving(true);
    try {
      const resultsPayload = Object.values(scores).map((row) => {
        const carry = includeCarryOver ? buildCarryOver(row.subject_id, term, row.total ?? 0) : null;

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

      await authApi.post(`/result-batches/${batchId}/students/${student.id}/upsert`, payload);

      addCompletedStudent(batchId, student);
      showSuccess("Result saved successfully ✅");
      setStep(3);
      saveDraftNow();
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to save result");
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------
  // Compute batch
  // -----------------------------
  const handleComputeBatch = async () => {
    if (!batchId) return showWarning("No batch selected.");

    setComputing(true);
    try {
      await authApi.post(`/result-batches/${batchId}/compute`);
      showSuccess("Batch compute started ✅");
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to compute batch");
    } finally {
      setComputing(false);
    }
  };

  const showBatchSidebar = step !== 1;

  const contentStyle: React.CSSProperties = {
    paddingLeft: isDesktop ? 280 : 0,
    minHeight: "calc(100vh - 64px)",
    background: "#f8fafc",
  };

  return (
    <>
    <PageTitle title="Add New Result" />
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={contentStyle}>
        <div className="container-fluid py-4">
          {pageLoading ? (
            <CenterLoader label="Preparing Result Module..." />
          ) : (
            <>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h4 className="mb-0">Upload Results</h4>
                  <div className="text-muted small">Auto-save drafts • Batch progress sidebar • Faster entry for teachers</div>
                </div>

                <div className="d-flex gap-2 flex-wrap justify-content-end">
                  <button className="btn btn-outline-primary btn-sm" onClick={loadDraft}>
                    Load saved draft
                  </button>
                  <button className="btn btn-outline-danger btn-sm" onClick={clearDraft}>
                    Clear draft
                  </button>
                  <button className="btn btn-outline-secondary btn-sm" onClick={resetAll}>
                    Reset
                  </button>
                </div>
              </div>

              <div className="row g-3">
                {/* MAIN */}
                <div className={showBatchSidebar ? "col-lg-9" : "col-12"}>
                  {/* Stepper */}
                  {!directMode && (
                    <ul className="nav nav-pills mb-4">
                      <li className="nav-item">
                        <button className={`nav-link ${step === 1 ? "active" : ""}`} onClick={() => setStep(1)}>
                          1. Search
                        </button>
                      </li>
                      <li className="nav-item">
                        <button
                          className={`nav-link ${step === 2 ? "active" : ""}`}
                          onClick={() => student && setStep(2)}
                          disabled={!student}
                        >
                          2. Scores
                        </button>
                      </li>
                      <li className="nav-item">
                        <button className={`nav-link ${step === 3 ? "active" : ""}`} onClick={() => setStep(3)} disabled={step !== 3}>
                          3. Review
                        </button>
                      </li>
                    </ul>
                  )}

                  {/* STEP 1 */}
                  {!directMode && step === 1 && (
                    <div className="card">
                      <div className="card-body">
                        <div className="row g-2 align-items-end">
                          <div className="col-md-8">
                            <label className="form-label">Admission Number</label>
                            <input
                              className="form-control"
                              value={admissionNo}
                              onChange={(e) => setAdmissionNo(e.target.value)}
                              placeholder="Enter admission number"
                            />
                          </div>
                          <div className="col-md-4">
                            <button className="btn btn-primary w-100" onClick={handleSearch} disabled={searching}>
                              {searching ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" />
                                  Searching...
                                </>
                              ) : (
                                "Search"
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="alert alert-info mt-3 mb-0">
                          Tip: Use <strong>Load saved draft</strong> to continue where you stopped.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Student Info */}
                  {student && step !== 1 && (
                    <div className="card mb-3">
                      <div className="card-body">
                        <div className="row align-items-center g-3">
                          <div className="col">
                            <div className="fw-bold">
                              {student.firstname} {student.surname} <span className="text-muted">({student.reg_no})</span>
                            </div>
                            <div className="text-muted small">
                              Class: {student.level?.name || "N/A"} • Dept: {department || "N/A"} • Term: {term || "N/A"} • Session:{" "}
                              {session || "N/A"}
                            </div>
                          </div>
                          <div className="col-md-4 text-md-end">
                            <button className="btn btn-outline-primary me-2" onClick={handleResolveBatch} disabled={!!batchId}>
                              {batchId ? `Batch Ready (#${batchId})` : "Prepare Batch"}
                            </button>
                            <button className="btn btn-outline-secondary" onClick={() => setStep(1)}>
                              Search another
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2 */}
                  {step === 2 && student && (
                    <>
                      <div className="form-check mt-3">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="includeCarryOver"
                          checked={includeCarryOver}
                          onChange={(e) => setIncludeCarryOver(e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="includeCarryOver">
                          Include previous term scores (carry over)
                        </label>
                      </div>

                     {includeCarryOver && (
                      <div className="alert alert-info mt-2 mb-0">
                        {carryLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Loading previous term totals…
                          </>
                        ) : (
                          <>
                            This school has <strong>{schoolTerms.length}</strong> term(s). Previous term totals were loaded for this session
                            (<strong>{session}</strong>).
                          </>
                        )}
                      </div>
                    )}


                      <div className="card mb-3">
                        <div className="card-body">
                          <div className="row g-3">
                            <div className="col-md-4">
                              <label className="form-label">Score Type</label>
                              <select className="form-select" value={scoreType} onChange={(e) => handleScoreTypeChange(e.target.value)}>
                                {SCORE_TYPES.map((t) => (
                                  <option key={t.value} value={t.value}>
                                    {t.label}
                                  </option>
                                ))}
                              </select>
                              <div className="form-text">
                                CA parts: {caParts.join(", ")} | Exam: {examPart}
                              </div>
                            </div>

                            <div className="col-md-4">
                              <label className="form-label">Term (Auto)</label>
                              <input className="form-control" value={term} readOnly />
                            </div>

                            <div className="col-md-4">
                              <label className="form-label">Session (Auto)</label>
                              <input className="form-control" value={session} readOnly />
                            </div>
                          </div>

                          <div className="alert alert-warning mt-3 mb-0">
                            <strong>Auto-save is ON:</strong> your progress is saved as draft automatically.
                          </div>
                        </div>
                      </div>

                      {/* Subjects */}
                      <div className="row g-3">
                        {subjects.map((subj) => {
                          const row = scores[subj.name];
                          return (
                            <div className="col-12 col-md-6 col-lg-4" key={subj.id}>
                              <div className="card h-100">
                                <div className="card-body">
                                  <div className="d-flex align-items-center justify-content-between mb-2">
                                    <div className="fw-semibold">{subj.name}</div>
                                    <span className="badge text-bg-secondary">Total: {row?.total ?? 0}</span>
                                  </div>

                                  {caParts.map((max, idx) => (
                                    <div className="mb-2" key={`${subj.id}-ca-${idx}`}>
                                      <label className="form-label small mb-1">
                                        CA {idx + 1} (/{max})
                                      </label>
                                      <input
                                        type="number"
                                        className="form-control"
                                        value={row?.ca?.[`ca${idx}`] ?? ""}
                                        onChange={(e) => handleCaChange(subj.name, `ca${idx}`, e.target.value, max)}
                                        onFocus={() => handleCaFocus(subj.name, `ca${idx}`)}
                                      />
                                    </div>
                                  ))}

                                  <div className="mb-2">
                                    <label className="form-label small mb-1">Exam (/{examPart})</label>
                                    <input
                                      type="number"
                                      className="form-control"
                                      value={row?.exam ?? ""}
                                      onChange={(e) => handleExamChange(subj.name, e.target.value)}
                                      onFocus={() => handleExamFocus(subj.name)}
                                    />
                                  </div>

                                  <div className="row g-2">
                                    <div className="col-4">
                                      <label className="form-label small mb-1">Grade</label>
                                      <input
                                        className="form-control"
                                        value={row?.grade ?? ""}
                                        onChange={(e) => handleTextField(subj.name, "grade", e.target.value)}
                                        maxLength={3}
                                        placeholder="A1"
                                      />
                                    </div>
                                    <div className="col-8">
                                      <label className="form-label small mb-1">Remark</label>
                                      <input
                                        className="form-control"
                                        value={row?.remark ?? ""}
                                        onChange={(e) => handleTextField(subj.name, "remark", e.target.value)}
                                        placeholder="optional"
                                      />
                                    </div>

                                    {includeCarryOver && row && (
                                      <div className="mt-3 p-2 border rounded bg-light">
                                        <div className="small fw-semibold mb-1">Previous terms (auto)</div>

                                        {Object.keys(carryPreview[row.subject_id] ?? {}).length === 0 ? (
                                          <div className="small text-muted">No previous term scores found for this subject in this session.</div>
                                        ) : (
                                          <ul className="small mb-2 ps-3">
                                            {Object.entries(carryPreview[row.subject_id] ?? {}).map(([tName, tScore]) => (
                                              <li key={tName}>
                                                {tName}: <strong>{tScore}</strong>
                                              </li>
                                            ))}
                                          </ul>
                                        )}

                                        {(() => {
                                          const co = buildCarryOver(row.subject_id, term, row.total ?? 0);
                                          return (
                                            <div className="small">
                                              Cumulative Total: <strong>{co.cumulative_total}</strong>
                                              <br />
                                              Cumulative Average: <strong>{co.cumulative_average}</strong>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Summary */}
                      <div className="card mt-4">
                        <div className="card-body">
                          <div className="d-flex align-items-center justify-content-between">
                            <h5 className="mb-0">Summary</h5>
                            <span className="badge text-bg-primary">Overall Average: {overallAverage || "—"}</span>
                          </div>

                          <div className="row g-3 mt-2">
                            <div className="col-md-3">
                              <label className="form-label">Total Grade</label>
                              <input
                                className="form-control"
                                value={summary.total_grade}
                                onChange={(e) => setSummary((p) => ({ ...p, total_grade: e.target.value.toUpperCase() }))}
                                maxLength={3}
                              />
                            </div>

                            <div className="col-md-9">
                              <label className="form-label">General Remark</label>
                              <input
                                className="form-control"
                                value={summary.general_remark}
                                onChange={(e) => setSummary((p) => ({ ...p, general_remark: e.target.value }))}
                              />
                            </div>

                            <div className="col-md-6">
                              <label className="form-label">Principal Comment</label>
                              <input
                                className="form-control"
                                value={summary.principal_comment}
                                onChange={(e) => setSummary((p) => ({ ...p, principal_comment: e.target.value }))}
                              />
                            </div>

                            <div className="col-md-6">
                              <label className="form-label">Class Teacher Comment</label>
                              <input
                                className="form-control"
                                value={summary.class_teacher_comment}
                                onChange={(e) => setSummary((p) => ({ ...p, class_teacher_comment: e.target.value }))}
                              />
                            </div>

                            <div className="col-md-4">
                              <label className="form-label">Class Teacher</label>
                              <input
                                className="form-control"
                                value={summary.class_teacher}
                                onChange={(e) => setSummary((p) => ({ ...p, class_teacher: e.target.value }))}
                              />
                            </div>

                            <div className="col-md-4">
                              <label className="form-label">Class Size</label>
                              <input
                                className="form-control"
                                value={summary.class_size}
                                onChange={(e) => setSummary((p) => ({ ...p, class_size: e.target.value }))}
                              />
                            </div>

                            <div className="col-md-4">
                              <label className="form-label">Position (optional)</label>
                              <input
                                className="form-control"
                                value={summary.position}
                                onChange={(e) => setSummary((p) => ({ ...p, position: e.target.value }))}
                              />
                            </div>
                          </div>

                          <div className="row g-3 mt-3">
                            <div className="col-md-4">
                              <label className="form-label">Resumption Date</label>
                              <input
                                type="date"
                                className="form-control"
                                value={summary.meta.resumption_date}
                                onChange={(e) => setSummary((p) => ({ ...p, meta: { ...p.meta, resumption_date: e.target.value } }))}
                              />
                            </div>

                            <div className="col-md-4">
                              <label className="form-label">Times Open</label>
                              <input
                                className="form-control"
                                value={summary.meta.school_open}
                                onChange={(e) => setSummary((p) => ({ ...p, meta: { ...p.meta, school_open: e.target.value } }))}
                                placeholder="e.g. 180"
                              />
                            </div>

                            <div className="col-md-4">
                              <label className="form-label">Times Close</label>
                              <input
                                className="form-control"
                                value={summary.meta.school_close}
                                onChange={(e) => setSummary((p) => ({ ...p, meta: { ...p.meta, school_close: e.target.value } }))}
                                placeholder="e.g. 5pm"
                              />
                            </div>

                            <div className="col-md-4">
                              <label className="form-label">No. Present</label>
                              <input
                                type="number"
                                className="form-control"
                                value={summary.meta.no_present}
                                onChange={(e) => setSummary((p) => ({ ...p, meta: { ...p.meta, no_present: e.target.value } }))}
                                placeholder="e.g. 120"
                              />
                            </div>

                            <div className="col-md-4">
                              <label className="form-label">No. Absent</label>
                              <input
                                type="number"
                                className="form-control"
                                value={summary.meta.no_absent}
                                onChange={(e) => setSummary((p) => ({ ...p, meta: { ...p.meta, no_absent: e.target.value } }))}
                                placeholder="e.g. 10"
                              />
                            </div>
                          </div>

                          <div className="d-flex gap-2 justify-content-end mt-4">
                            <button className="btn btn-outline-secondary" onClick={() => setStep(1)}>
                              Back
                            </button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                              {saving ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" />
                                  Saving...
                                </>
                              ) : (
                                "Save Result"
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* STEP 3 */}
                  {step === 3 && student && (
                    <div className="card">
                      <div className="card-body">
                        <h5 className="mb-3">Review & Actions</h5>

                        <div className="alert alert-success">
                          Result saved successfully for{" "}
                          <strong>
                            {student.firstname} {student.surname}
                          </strong>
                          .
                        </div>

                        <div className="d-flex flex-wrap gap-2">
                          <button className="btn btn-outline-primary" onClick={() => setStep(2)}>
                            Edit Scores
                          </button>

                          <button className="btn btn-primary" onClick={handleComputeBatch} disabled={computing || !batchId}>
                            {computing ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" />
                                Computing...
                              </>
                            ) : (
                              "Compute Batch (Positions)"
                            )}
                          </button>

                          <button className="btn btn-outline-secondary" onClick={resetAll}>
                            Enter Another Student
                          </button>
                        </div>

                        <hr />
                        <div className="small text-muted">
                          Tip: Draft stays saved. You can load it anytime using <strong>Load saved draft</strong>.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* BATCH SIDEBAR */}
                {showBatchSidebar && (
                  <div className="col-lg-3">
                    <div className="card position-sticky" style={{ top: 16 }}>
                      <div className="card-body">
                        <div className="d-flex align-items-center justify-content-between">
                          <h6 className="mb-0">Batch Sidebar</h6>
                          <span className="badge text-bg-dark">{batchId ? `#${batchId}` : "No Batch"}</span>
                        </div>

                        <div className="text-muted small mt-2">
                          {term || "—"} • {session || "—"} <br />
                          Class: {student?.level?.name || "—"}
                        </div>

                        <hr />

                        <div className="d-flex align-items-center justify-content-between">
                          <div className="fw-semibold">Students completed</div>
                          <span className="badge text-bg-success">{completedStudents.length}</span>
                        </div>

                        <div className="mt-2" style={{ maxHeight: 260, overflow: "auto" }}>
                          {completedStudents.length === 0 ? (
                            <div className="text-muted small">No saved students yet for this batch.</div>
                          ) : (
                            <ul className="list-group">
                              {completedStudents.map((s) => (
                                <li key={s.student_id} className="list-group-item py-2">
                                  <div className="fw-semibold">{s.name}</div>
                                  <div className="small text-muted">{s.reg_no}</div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="d-grid gap-2 mt-3">
                          <button className="btn btn-outline-primary" onClick={handleComputeBatch} disabled={!batchId || computing}>
                            {computing ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" />
                                Computing...
                              </>
                            ) : (
                              "Compute Batch"
                            )}
                          </button>

                          <button className="btn btn-outline-secondary" onClick={loadDraft}>
                            Load Draft
                          </button>

                          <button className="btn btn-outline-danger" onClick={clearCompletedForBatch} disabled={!batchId}>
                            Clear Completed List
                          </button>
                        </div>

                        <div className="small text-muted mt-3">
                          This completed list is stored locally on this device. If you want it shared across devices/users, we’ll add a backend
                          endpoint to list completed students per batch.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <Footer />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
