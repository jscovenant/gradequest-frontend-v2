import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import PageTitle from "../components/PageTitle";
import CbtHtml from "../components/cbt/CbtHtml";
import { publicApi } from "../utils/axios";
import { useToast } from "../contexts/ToastContext";

type ExamSummary = {
  id: number;
  title: string;
  exam_code?: string;
  duration_minutes: number;
  access_code_required: boolean;
  calculator_enabled: boolean;
  questions_count: number;
  subject?: { name?: string };
  class?: { name?: string };
  fee_access?: {
    allowed: boolean;
    message?: string | null;
    required_percent?: number;
    summary?: {
      total_amount?: number;
      amount_paid?: number;
      balance?: number;
      payment_percent?: number;
    };
  } | null;
  schedule?: { exam_date?: string; starts_at?: string; ends_at?: string; venue?: string } | null;
};

type Question = {
  id: number;
  question_type: string;
  question_text: string;
  instructions?: string;
  marks: number;
  options?: { id: number; label?: string; option_text: string }[];
};

type QuestionBlock = {
  type: "question" | "group";
  group_id?: number;
  group_type?: string;
  title?: string;
  instructions?: string;
  passage?: string;
  questions: Question[];
};

type ExamPaper = {
  id: number;
  title: string;
  exam_code?: string;
  duration_minutes: number;
  general_instructions?: string;
  calculator_enabled?: boolean;
  subject?: { name?: string };
  class?: { name?: string };
  question_blocks?: QuestionBlock[];
  total_questions?: number;
};

type AnswerDraft = {
  selected_option_ids?: number[];
  answer_text?: string;
};

const optionKeys = ["a", "b", "c", "d", "e", "f"];
const scientificButtons = ["7", "8", "9", "/", "sin", "4", "5", "6", "*", "cos", "1", "2", "3", "-", "tan", "0", ".", "^", "+", "sqrt", "(", ")", "log", "ln", "C"];
const maxSecurityViolations = 3;

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${minutes}:${String(secs).padStart(2, "0")}`;
}

export default function PublicCbtAccessPage() {
  const { showError, showSuccess } = useToast();
  const [searchParams] = useSearchParams();
  const routeSchoolCode = (searchParams.get("school_code") || "").trim();
  const [form, setForm] = useState({ school_code: routeSchoolCode, student_reg_no: "", access_code: "" });
  const [loading, setLoading] = useState(false);
  const [startingId, setStartingId] = useState<number | null>(null);
  const [school, setSchool] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [selectedExam, setSelectedExam] = useState<ExamSummary | null>(null);
  const [pendingExam, setPendingExam] = useState<ExamSummary | null>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [examPaper, setExamPaper] = useState<ExamPaper | null>(null);
  const [answers, setAnswers] = useState<Record<number, AnswerDraft>>({});
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingQuestionId, setSavingQuestionId] = useState<number | null>(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calcValue, setCalcValue] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [securityViolations, setSecurityViolations] = useState(0);
  const [securityWarning, setSecurityWarning] = useState("");
  const eventThrottleRef = useRef<Record<string, number>>({});
  const saveTimersRef = useRef<Record<number, number>>({});
  const forcedSubmitRef = useRef(false);
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const flatQuestions = useMemo(() => (examPaper?.question_blocks || []).flatMap((block) => block.questions || []), [examPaper]);
  const activeQuestion = flatQuestions[activeQuestionIndex] || null;
  const activeBlock = useMemo(() => {
    if (!activeQuestion) return null;
    return (examPaper?.question_blocks || []).find((block) => (block.questions || []).some((question) => question.id === activeQuestion.id)) || null;
  }, [activeQuestion, examPaper]);
  const selectedNeedsCode = Boolean(selectedExam?.access_code_required);
  const answeredCount = flatQuestions.filter((question) => {
    const answer = answers[question.id];
    return Boolean((answer?.selected_option_ids || []).length || answer?.answer_text?.trim());
  }).length;

  async function lookup(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSelectedExam(null);
    setAttempt(null);
    setExamPaper(null);
    setAnswers({});
    setPendingExam(null);
    try {
      const res = await publicApi.get("/public/cbt/access/lookup", { params: form });
      setSchool(res.data?.school || null);
      setStudent(res.data?.student || null);
      const list = Array.isArray(res.data?.exams) ? res.data.exams : [];
      setExams(list);
      setSelectedExam(list[0] || null);
      if (list.length === 0) showError("No CBT exam is scheduled for this student right now.");
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to check CBT access.");
    } finally {
      setLoading(false);
    }
  }

  function openInstructions(exam: ExamSummary) {
    setSelectedExam(exam);
    setPendingExam(exam);
  }

  async function startExam(exam: ExamSummary) {
    setPendingExam(null);
    setStartingId(exam.id);
    try {
      const res = await publicApi.post("/public/cbt/access/start", {
        ...form,
        exam_id: exam.id,
        access_code: exam.access_code_required ? form.access_code : null,
      });
      setAttempt(res.data?.attempt || null);
      setExamPaper(res.data?.exam || null);
      setAnswers({});
      setActiveQuestionIndex(0);
      setSecurityViolations(0);
      setSecurityWarning("");
      forcedSubmitRef.current = false;
      setRemainingSeconds(res.data?.attempt?.expires_at ? Math.max(0, Math.floor((new Date(res.data.attempt.expires_at).getTime() - Date.now()) / 1000)) : null);
      setConfirmingSubmit(false);
      try {
        await document.documentElement.requestFullscreen?.();
      } catch {
        // Some browsers/devices block fullscreen. The exam remains usable.
      }
      showSuccess("CBT exam started.");
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to start CBT exam.");
    } finally {
      setStartingId(null);
    }
  }

  const logSecurityEvent = useCallback(async (eventType: string, severity: "low" | "medium" | "high" = "medium", metadata: Record<string, unknown> = {}) => {
    if (!attempt?.token) return;
    const now = Date.now();
    const lastLoggedAt = eventThrottleRef.current[eventType] || 0;
    if (now - lastLoggedAt < 5000) return;
    eventThrottleRef.current[eventType] = now;

    try {
      await publicApi.post(`/public/cbt/attempts/${attempt.token}/events`, {
        event_type: eventType,
        severity,
        page_url: window.location.href,
        metadata,
      });
    } catch {
      // Keep the exam usable even when a security log request fails.
    }
  }, [attempt?.token]);

  const recordViolation = useCallback((eventType: string, severity: "low" | "medium" | "high" = "high") => {
    if (!attempt?.token || !examPaper || forcedSubmitRef.current) return;

    setSecurityWarning("You left the exam window. This action has been recorded.");
    setSecurityViolations((count) => {
      const nextCount = Math.min(maxSecurityViolations, count + 1);
      void logSecurityEvent(eventType, severity, {
        violation_count: nextCount,
        max_violations: maxSecurityViolations,
      });

      if (nextCount >= maxSecurityViolations && !forcedSubmitRef.current) {
        forcedSubmitRef.current = true;
        setSecurityWarning("Security limit reached. Your exam is being submitted automatically.");
        void submitExam();
      }

      return nextCount;
    });
  }, [attempt?.token, examPaper, logSecurityEvent]);

  const saveAnswerPayload = useCallback(async (question: Question, answer: AnswerDraft, silent = true) => {
    if (!attempt?.token) return;
    const hasAnswerContent = Boolean((answer.selected_option_ids || []).length || answer.answer_text?.trim());
    if (!hasAnswerContent) return;
    if (saveTimersRef.current[question.id]) {
      window.clearTimeout(saveTimersRef.current[question.id]);
      delete saveTimersRef.current[question.id];
    }
    setSavingQuestionId(question.id);
    try {
      await publicApi.post(`/public/cbt/attempts/${attempt.token}/answers`, {
        question_id: question.id,
        selected_option_ids: answer.selected_option_ids || [],
        answer_text: answer.answer_text || null,
      });
      if (!silent) showSuccess("Answer saved.");
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to save answer.");
    } finally {
      setSavingQuestionId((current) => (current === question.id ? null : current));
    }
  }, [attempt?.token, showError, showSuccess]);

  function queueAnswerSave(question: Question, answer: AnswerDraft, delay = 350) {
    if (saveTimersRef.current[question.id]) {
      window.clearTimeout(saveTimersRef.current[question.id]);
    }
    saveTimersRef.current[question.id] = window.setTimeout(() => {
      void saveAnswerPayload(question, answer);
    }, delay);
  }

  function chooseOption(question: Question, optionId: number, checked: boolean) {
    setAnswers((prev) => {
      const current = prev[question.id]?.selected_option_ids || [];
      const next = question.question_type === "multiple_choice"
        ? checked
          ? Array.from(new Set([...current, optionId]))
          : current.filter((id) => id !== optionId)
        : [optionId];

      const nextAnswer = { ...prev[question.id], selected_option_ids: next };
      void saveAnswerPayload(question, nextAnswer);
      return { ...prev, [question.id]: nextAnswer };
    });
  }

  function writeAnswer(question: Question, value: string) {
    setAnswers((prev) => {
      const nextAnswer = { ...prev[question.id], answer_text: value };
      queueAnswerSave(question, nextAnswer, 800);
      return { ...prev, [question.id]: nextAnswer };
    });
  }

  async function saveAnswer(question: Question) {
    await saveAnswerPayload(question, answers[question.id] || {}, false);
  }

  async function submitExam() {
    if (!attempt?.token) return;
    setSubmitting(true);
    try {
      if (activeQuestion) {
        await saveAnswerPayload(activeQuestion, answers[activeQuestion.id] || {});
      }
      await publicApi.post(`/public/cbt/attempts/${attempt.token}/submit`);
      showSuccess("CBT exam submitted.");
      setAttempt(null);
      setExamPaper(null);
      setAnswers({});
      setConfirmingSubmit(false);
      setCalculatorOpen(false);
      await lookup(new Event("submit") as any);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to submit CBT exam.");
    } finally {
      setSubmitting(false);
    }
  }

  async function jumpToQuestion(index: number) {
    if (activeQuestion) {
      await saveAnswerPayload(activeQuestion, answers[activeQuestion.id] || {});
    }
    const safeIndex = Math.max(0, Math.min(index, flatQuestions.length - 1));
    setActiveQuestionIndex(safeIndex);
    const question = flatQuestions[safeIndex];
    setTimeout(() => question && questionRefs.current[question.id]?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
  }

  function pressCalc(value: string) {
    if (value === "C") return setCalcValue("");
    setCalcValue((prev) => `${prev}${value}`);
  }

  function calculate() {
    try {
      const expression = calcValue
        .replace(/\^/g, "**")
        .replace(/sqrt/g, "Math.sqrt")
        .replace(/sin/g, "Math.sin")
        .replace(/cos/g, "Math.cos")
        .replace(/tan/g, "Math.tan")
        .replace(/log/g, "Math.log10")
        .replace(/ln/g, "Math.log");
      const result = Function(`"use strict"; return (${expression})`)();
      setCalcValue(Number.isFinite(result) ? String(Number(result.toFixed(8))) : "Error");
    } catch {
      setCalcValue("Error");
    }
  }

  useEffect(() => {
    if (!attempt?.token || !examPaper) return;

    const blockEvent = (event: Event, eventType: string, severity: "low" | "medium" | "high" = "medium") => {
      event.preventDefault();
      event.stopPropagation();
      void logSecurityEvent(eventType, severity, {
        target: event.target instanceof HTMLElement ? event.target.tagName.toLowerCase() : null,
      });
    };

    const onCopy = (event: ClipboardEvent) => blockEvent(event, "copy_attempt", "high");
    const onCut = (event: ClipboardEvent) => blockEvent(event, "cut_attempt", "high");
    const onPaste = (event: ClipboardEvent) => blockEvent(event, "paste_attempt", "high");
    const onContextMenu = (event: MouseEvent) => blockEvent(event, "right_click_attempt", "medium");
    const onVisibilityChange = () => document.visibilityState === "hidden" && recordViolation("tab_hidden", "high");
    const onBlur = () => recordViolation("window_blur", "medium");
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        recordViolation("fullscreen_exit", "high");
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "TEXTAREA" || target?.tagName === "INPUT";
      const key = event.key.toLowerCase();
      const protectedShortcut = (event.ctrlKey || event.metaKey) && ["a", "c", "p", "s", "u", "v", "x"].includes(key);
      const developerShortcut = key === "f12" || ((event.ctrlKey || event.metaKey) && event.shiftKey && ["i", "j", "c"].includes(key));

      if (protectedShortcut || developerShortcut) {
        blockEvent(event, `keyboard_${key}_attempt`, developerShortcut ? "high" : "medium");
        return;
      }

      if (isTyping) return;

      if (optionKeys.includes(key) && activeQuestion) {
        const option = activeQuestion.options?.[optionKeys.indexOf(key)];
        if (option) {
          event.preventDefault();
          chooseOption(activeQuestion, option.id, true);
          void logSecurityEvent("keyboard_answer_selected", "low", { question_id: activeQuestion.id, option: key.toUpperCase() });
        }
        return;
      }

      if (key === "arrowright") {
        event.preventDefault();
        void jumpToQuestion(activeQuestionIndex + 1);
      }

      if (key === "arrowleft") {
        event.preventDefault();
        void jumpToQuestion(activeQuestionIndex - 1);
      }

      if (key === "s") {
        event.preventDefault();
        setConfirmingSubmit(true);
      }

      if (key === "enter" && confirmingSubmit) {
        event.preventDefault();
        void submitExam();
      }
    };

    document.addEventListener("copy", onCopy, true);
    document.addEventListener("cut", onCut, true);
    document.addEventListener("paste", onPaste, true);
    document.addEventListener("contextmenu", onContextMenu, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("copy", onCopy, true);
      document.removeEventListener("cut", onCut, true);
      document.removeEventListener("paste", onPaste, true);
      document.removeEventListener("contextmenu", onContextMenu, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("blur", onBlur);
    };
  }, [activeQuestion, activeQuestionIndex, attempt?.token, confirmingSubmit, examPaper, logSecurityEvent, recordViolation]);

  useEffect(() => {
    if (routeSchoolCode) {
      setForm((prev) => ({ ...prev, school_code: routeSchoolCode }));
    }
  }, [routeSchoolCode]);

  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  useEffect(() => {
    if (!attempt?.expires_at || !attempt?.token || !examPaper) {
      setRemainingSeconds(null);
      return;
    }

    const updateTimer = () => {
      const secondsLeft = Math.max(0, Math.floor((new Date(attempt.expires_at).getTime() - Date.now()) / 1000));
      setRemainingSeconds(secondsLeft);
      if (secondsLeft <= 0 && !submitting) {
        void submitExam();
      }
    };

    updateTimer();
    const timerId = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timerId);
  }, [attempt?.expires_at, attempt?.token, examPaper, submitting]);

  return (
    <>
      <PageTitle title="CBT Access" />
      <style>{`
        .pcbt-page{min-height:100vh;background:#eef2f7;color:#0f172a;padding:24px}.pcbt-shell{max-width:1280px;margin:0 auto}.pcbt-hero{background:linear-gradient(135deg,#151827,#42103a);color:#fff;border-radius:20px;padding:28px;display:flex;justify-content:space-between;gap:20px;align-items:flex-end}.pcbt-hero h1{font-family:'Playfair Display',serif;font-size:clamp(30px,5vw,52px);font-weight:900;margin:4px 0}.pcbt-hero p{margin:0;color:rgba(255,255,255,.76);line-height:1.65}.pcbt-card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;box-shadow:0 18px 50px rgba(15,23,42,.08);padding:20px}.pcbt-grid{display:grid;grid-template-columns:390px minmax(0,1fr);gap:16px;margin-top:16px}.pcbt-label{font-size:12px;text-transform:uppercase;font-weight:900;color:#475569;margin-bottom:6px}.pcbt-input,.pcbt-select,.pcbt-textarea{width:100%;border:1px solid #dbe3ef;border-radius:12px;padding:11px 12px;margin-bottom:12px;background:#fff}.pcbt-btn{border:0;border-radius:12px;padding:11px 15px;font-weight:900;background:var(--bs-primary,#d300b0);color:#fff;display:inline-flex;align-items:center;gap:8px}.pcbt-btn:disabled{opacity:.55;cursor:not-allowed}.pcbt-btn-soft{background:#f1f5f9;color:#0f172a}.pcbt-btn-gold{background:#f7c948;color:#201827}.pcbt-title{font-size:20px;font-weight:900;margin:0;color:#111827}.pcbt-sub{font-size:13px;color:#64748b;line-height:1.55}.pcbt-pill{display:inline-flex;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900;background:#eef2ff;color:#3730a3;text-transform:capitalize}.pcbt-exam-list{display:grid;gap:12px}.pcbt-exam-item{border:1px solid #e5e7eb;border-radius:16px;padding:15px;background:#fff}.pcbt-meta{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.pcbt-paper{margin-top:16px;background:#fff;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden;user-select:none}.pcbt-paper-head{padding:18px 20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;gap:14px;align-items:flex-start;background:#fff;position:sticky;top:0;z-index:20}.pcbt-timer{background:#111827;color:#fff;border-radius:14px;padding:10px 14px;text-align:center;min-width:128px}.pcbt-timer span{display:block;font-size:11px;text-transform:uppercase;color:#cbd5e1;font-weight:900}.pcbt-timer strong{display:block;font-size:22px;line-height:1.1}.pcbt-timer.danger{background:#991b1b}.pcbt-paper-body{display:grid;grid-template-columns:260px minmax(0,1fr);gap:0}.pcbt-nav{border-right:1px solid #e5e7eb;background:#f8fafc;padding:16px;max-height:calc(100vh - 210px);overflow:auto}.pcbt-nav-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.pcbt-qnav{border:1px solid #dbe3ef;border-radius:10px;background:#fff;height:38px;font-weight:900;color:#475569}.pcbt-qnav.active{background:#1f2937;color:#fff}.pcbt-qnav.done{border-color:#22c55e;color:#166534}.pcbt-content{padding:18px 20px;max-height:calc(100vh - 210px);overflow:auto}.pcbt-alert{background:#fff7ed;border:1px solid #fed7aa;color:#7c2d12;border-radius:14px;padding:13px;margin-bottom:14px}.pcbt-warning{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:14px;padding:12px 14px;margin-bottom:14px;font-weight:800}.pcbt-security{background:#f8fafc;border:1px solid #dbe3ef;color:#334155;border-radius:14px;padding:12px 14px;margin-bottom:14px;font-size:13px}.pcbt-rules{margin:14px 0 0;padding-left:18px;color:#334155;line-height:1.65}.pcbt-rules li{margin-bottom:7px}.pcbt-block{border:1px solid #e5e7eb;border-radius:16px;margin-bottom:16px;overflow:hidden}.pcbt-block-head{background:#f8fafc;border-bottom:1px solid #e5e7eb;padding:16px}.pcbt-passage{white-space:pre-wrap;line-height:1.75;color:#334155}.pcbt-question{padding:18px;border-bottom:1px solid #eef2f7}.pcbt-question:last-child{border-bottom:0}.pcbt-question h3{font-size:18px;font-weight:900;margin:0 0 14px;line-height:1.45}.pcbt-option{display:flex;gap:10px;border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-bottom:10px;align-items:flex-start}.pcbt-option strong{min-width:22px}.pcbt-textarea{min-height:120px;user-select:text}.pcbt-pager{display:flex;justify-content:space-between;gap:12px;align-items:center;border-top:1px solid #eef2f7;padding-top:14px}.pcbt-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:12px}.pcbt-calc{position:fixed;right:24px;bottom:24px;z-index:30;width:min(340px,calc(100vw - 48px));background:#111827;color:#fff;border-radius:18px;padding:14px;box-shadow:0 24px 70px rgba(15,23,42,.34)}.pcbt-calc input{width:100%;border:0;border-radius:12px;padding:12px;background:#020617;color:#fff;font-size:22px;text-align:right;margin-bottom:10px}.pcbt-calc-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.pcbt-calc button{border:0;border-radius:10px;padding:10px 6px;background:#334155;color:#fff;font-weight:900}.pcbt-confirm{position:fixed;inset:0;background:rgba(15,23,42,.58);z-index:50;display:flex;align-items:center;justify-content:center;padding:18px}.pcbt-confirm-card{width:min(520px,100%);background:#fff;border-radius:18px;padding:22px;box-shadow:0 24px 80px rgba(15,23,42,.3)}.cbt-html{color:#111827;line-height:1.6}.cbt-html p{margin:0 0 10px}.cbt-html table{width:100%;border-collapse:collapse;margin:10px 0;table-layout:fixed}.cbt-html th,.cbt-html td{border:1px solid #cbd5e1;padding:8px;vertical-align:top}.cbt-html th{background:#f1f5f9;font-weight:900}.cbt-html img{max-width:100%;height:auto;border-radius:10px;border:1px solid #e5e7eb;margin:8px 0}.pcbt-option .cbt-html{flex:1}
        @media(max-width:900px){.pcbt-page{padding:14px}.pcbt-hero{align-items:flex-start;flex-direction:column}.pcbt-grid,.pcbt-paper-body{grid-template-columns:1fr}.pcbt-nav{border-right:0;border-bottom:1px solid #e5e7eb;max-height:none}.pcbt-content{max-height:none}}
      `}</style>

      <main className="pcbt-page">
        <div className="pcbt-shell">
          <section className="pcbt-hero">
            <div>
              <span className="pcbt-pill">Public CBT access</span>
              <h1>Enter CBT Exam</h1>
              <p>Students can access scheduled exams with their admission number. Access code appears only when the school requires it.</p>
            </div>
            <a className="pcbt-btn pcbt-btn-soft" href="/login">Portal Login</a>
          </section>

          {!examPaper && (
            <section className="pcbt-grid">
              <form className="pcbt-card" onSubmit={lookup}>
                <h2 className="pcbt-title">Find scheduled exam</h2>
                <p className="pcbt-sub">Use the details given by your school.</p>
                {!routeSchoolCode && (
                  <>
                    <label className="pcbt-label">School code</label>
                    <input className="pcbt-input" value={form.school_code} onChange={(e) => setForm((p) => ({ ...p, school_code: e.target.value }))} required placeholder="e.g. R109374" />
                  </>
                )}
                <label className="pcbt-label">Admission number</label>
                <input className="pcbt-input" value={form.student_reg_no} onChange={(e) => setForm((p) => ({ ...p, student_reg_no: e.target.value }))} required placeholder="Student admission number" />
                <button className="pcbt-btn" disabled={loading}>{loading ? "Checking..." : "Check Exam"}</button>
              </form>

              <div className="pcbt-card">
                <h2 className="pcbt-title">{school ? school.name : "Scheduled exams"}</h2>
                {student && <p className="pcbt-sub">{student.name} - {student.reg_no} - {student.class || "Class not set"}</p>}
                <div className="pcbt-exam-list">
                  {exams.length === 0 ? <p className="pcbt-sub mb-0">No exam loaded yet.</p> : exams.map((exam) => (
                    <article className="pcbt-exam-item" key={exam.id}>
                      <h3 className="pcbt-title">{exam.title}</h3>
                      <p className="pcbt-sub">{exam.subject?.name || "Subject"} - {exam.class?.name || "Assigned class"} - {exam.duration_minutes} minutes</p>
                      {exam.fee_access && !exam.fee_access.allowed && (
                        <div className="pcbt-warning">
                          {exam.fee_access.message || "Access denied. Complete the required school fee payment before starting this exam."}
                        </div>
                      )}
                      <div className="pcbt-meta">
                        <span className="pcbt-pill">{exam.questions_count} questions</span>
                        {exam.access_code_required && <span className="pcbt-pill">Access code required</span>}
                        {exam.calculator_enabled && <span className="pcbt-pill">Calculator allowed</span>}
                        {exam.schedule && <span className="pcbt-pill">{exam.schedule.starts_at?.slice(0, 5)} - {exam.schedule.ends_at?.slice(0, 5)}</span>}
                      </div>
                      {selectedExam?.id === exam.id && selectedNeedsCode && (
                        <>
                          <label className="pcbt-label">Access code</label>
                          <input className="pcbt-input" value={form.access_code} onChange={(e) => setForm((p) => ({ ...p, access_code: e.target.value }))} placeholder="Enter exam access code" />
                        </>
                      )}
                      <div className="pcbt-actions">
                        {exams.length > 1 && <button className="pcbt-btn pcbt-btn-soft" type="button" onClick={() => setSelectedExam(exam)}>Select</button>}
                        <button className="pcbt-btn pcbt-btn-gold" type="button" disabled={startingId === exam.id || exam.fee_access?.allowed === false || (exam.access_code_required && !form.access_code.trim())} onClick={() => openInstructions(exam)}>
                          Read Instructions
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}

          {examPaper && (
            <section className="pcbt-paper">
              <div className="pcbt-paper-head">
                <div>
                  <h2 className="pcbt-title">{examPaper.title}</h2>
                  <p className="pcbt-sub mb-0">{examPaper.exam_code || `Exam #${examPaper.id}`} - {answeredCount}/{flatQuestions.length} answered</p>
                  <div className="pcbt-meta">
                    <span className="pcbt-pill">{student?.name || "Student"}</span>
                    <span className="pcbt-pill">{student?.reg_no || "Admission no"}</span>
                    <span className="pcbt-pill">{examPaper.class?.name || student?.class || "Class not set"}</span>
                    <span className="pcbt-pill">{examPaper.subject?.name || "Subject not set"}</span>
                  </div>
                </div>
                <div className="pcbt-actions">
                  <div className={`pcbt-timer ${(remainingSeconds ?? 9999) <= 300 ? "danger" : ""}`}>
                    <span>Time left</span>
                    <strong>{remainingSeconds === null ? "--:--" : formatTime(remainingSeconds)}</strong>
                  </div>
                  {examPaper.calculator_enabled && <button className="pcbt-btn pcbt-btn-soft" type="button" onClick={() => setCalculatorOpen((value) => !value)}><i className="bi bi-calculator" /> Calculator</button>}
                  <button className="pcbt-btn" type="button" onClick={() => setConfirmingSubmit(true)} disabled={submitting}>S - Submit</button>
                </div>
              </div>
              <div className="pcbt-paper-body">
                <aside className="pcbt-nav">
                  <p className="pcbt-sub"><strong>Shortcuts:</strong> A-F choose option, arrows move, S submit, Enter confirm.</p>
                  <div className="pcbt-nav-grid">
                    {flatQuestions.map((question, index) => {
                      const done = Boolean((answers[question.id]?.selected_option_ids || []).length || answers[question.id]?.answer_text?.trim());
                      return <button key={question.id} className={`pcbt-qnav ${index === activeQuestionIndex ? "active" : ""} ${done ? "done" : ""}`} onClick={() => void jumpToQuestion(index)}>{index + 1}</button>;
                    })}
                  </div>
                </aside>
                <div className="pcbt-content">
                  {examPaper.general_instructions && <div className="pcbt-alert">{examPaper.general_instructions}</div>}
                  <div className="pcbt-security"><strong>Exam security is active.</strong> Copy, paste, right-click, protected shortcuts, and tab switching may be recorded.</div>
                  {securityWarning && (
                    <div className="pcbt-warning">
                      {securityWarning} {securityViolations > 0 && securityViolations < maxSecurityViolations ? `Violation ${securityViolations} of ${maxSecurityViolations}.` : ""}
                    </div>
                  )}
                  {activeQuestion && (
                    <div className="pcbt-block">
                      {activeBlock?.type === "group" && (
                        <div className="pcbt-block-head">
                          <span className="pcbt-pill">{(activeBlock.group_type || "passage").replace(/_/g, " ")}</span>
                          <h3 className="pcbt-title">{activeBlock.title || "Read the passage and answer the question"}</h3>
                          {activeBlock.instructions && <p className="pcbt-sub">{activeBlock.instructions}</p>}
                          {activeBlock.passage && <div className="pcbt-passage">{activeBlock.passage}</div>}
                        </div>
                      )}
                      {(() => {
                        const answer = answers[activeQuestion.id] || {};
                        return (
                          <div className="pcbt-question" key={activeQuestion.id} ref={(node) => { questionRefs.current[activeQuestion.id] = node; }}>
                            <span className="pcbt-pill">Question {activeQuestionIndex + 1} of {flatQuestions.length}</span>
                            <CbtHtml html={activeQuestion.question_text} />
                            {activeQuestion.instructions && <CbtHtml html={activeQuestion.instructions} className="pcbt-sub" />}
                            {["single_choice", "multiple_choice", "true_false"].includes(activeQuestion.question_type) ? (
                              (activeQuestion.options || []).map((option, optionIndex) => (
                                <label className="pcbt-option" key={option.id}>
                                  <input
                                    type={activeQuestion.question_type === "multiple_choice" ? "checkbox" : "radio"}
                                    name={`question-${activeQuestion.id}`}
                                    checked={(answer.selected_option_ids || []).includes(option.id)}
                                    onChange={(e) => chooseOption(activeQuestion, option.id, e.target.checked)}
                                  />
                                  <strong>{String.fromCharCode(65 + optionIndex)}.</strong>
                                  <CbtHtml html={option.option_text} />
                                </label>
                              ))
                            ) : (
                              <textarea className="pcbt-textarea" value={answer.answer_text || ""} onChange={(e) => writeAnswer(activeQuestion, e.target.value)} placeholder="Type your answer here." />
                            )}
                            <div className="pcbt-actions">
                              <span className="pcbt-pill">{activeQuestion.marks} mark(s)</span>
                              <button className="pcbt-btn pcbt-btn-soft" type="button" disabled={savingQuestionId === activeQuestion.id} onClick={() => saveAnswer(activeQuestion)}>
                                {savingQuestionId === activeQuestion.id ? "Saving..." : "Save Answer"}
                              </button>
                            </div>
                            <div className="pcbt-pager">
                              <button className="pcbt-btn pcbt-btn-soft" type="button" disabled={activeQuestionIndex === 0} onClick={() => void jumpToQuestion(activeQuestionIndex - 1)}>
                                Previous
                              </button>
                              <span className="pcbt-sub mb-0">{answeredCount} of {flatQuestions.length} answered</span>
                              {activeQuestionIndex >= flatQuestions.length - 1 ? (
                                <button className="pcbt-btn" type="button" onClick={() => setConfirmingSubmit(true)}>Submit Exam</button>
                              ) : (
                                <button className="pcbt-btn" type="button" onClick={() => void jumpToQuestion(activeQuestionIndex + 1)}>
                                  Next
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {calculatorOpen && (
            <div className="pcbt-calc">
              <input value={calcValue} onChange={(e) => setCalcValue(e.target.value)} placeholder="0" />
              <div className="pcbt-calc-grid">
                {scientificButtons.map((button) => <button key={button} type="button" onClick={() => pressCalc(button)}>{button}</button>)}
                <button type="button" onClick={() => setCalcValue((value) => value.slice(0, -1))}>DEL</button>
                <button type="button" onClick={calculate}>=</button>
              </div>
            </div>
          )}

          {pendingExam && (
            <div className="pcbt-confirm">
              <div className="pcbt-confirm-card">
                <span className="pcbt-pill">Exam instructions</span>
                <h2 className="pcbt-title">{pendingExam.title}</h2>
                <p className="pcbt-sub">Read these rules carefully before starting. Your timer begins immediately after you click Start Exam.</p>
                <ul className="pcbt-rules">
                  <li>Answer all questions within the time allowed. The exam may auto-submit when the timer reaches zero.</li>
                  <li>Use A, B, C, D, E, or F on the keyboard to choose options. Use the arrow keys to move between questions.</li>
                  <li>Copy, paste, right-click, protected shortcuts, and leaving the exam window may be recorded.</li>
                  <li>Comprehension questions stay attached to their passage. Read the passage before answering the questions under it.</li>
                  <li>Save answers as you work, then submit when you are done. After submission, you cannot continue the same attempt.</li>
                </ul>
                <div className="pcbt-actions">
                  <button className="pcbt-btn pcbt-btn-soft" type="button" onClick={() => setPendingExam(null)}>Cancel</button>
                  <button className="pcbt-btn" type="button" disabled={startingId === pendingExam.id} onClick={() => startExam(pendingExam)}>
                    {startingId === pendingExam.id ? "Starting..." : "I Understand, Start Exam"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {confirmingSubmit && (
            <div className="pcbt-confirm">
              <div className="pcbt-confirm-card">
                <h2 className="pcbt-title">Submit exam?</h2>
                <p className="pcbt-sub">You have answered {answeredCount} of {flatQuestions.length} question(s). Press Enter or click Submit to finish.</p>
                <div className="pcbt-actions">
                  <button className="pcbt-btn pcbt-btn-soft" type="button" onClick={() => setConfirmingSubmit(false)}>Cancel</button>
                  <button className="pcbt-btn" type="button" disabled={submitting} onClick={submitExam}>{submitting ? "Submitting..." : "Submit Exam"}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
