import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";
import CbtHtml from "../../../components/cbt/CbtHtml";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";

type Exam = {
  id: number;
  title: string;
  exam_code?: string;
  duration_minutes: number;
  delivery_mode: string;
  questions_count?: number;
  subject?: { name?: string };
  class?: { name?: string };
  term?: { name?: string };
  academic_session?: { name?: string };
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

type StartedExam = {
  id: number;
  title: string;
  exam_code?: string;
  duration_minutes: number;
  general_instructions?: string;
  subject?: { name?: string };
  class?: { name?: string };
  question_blocks?: QuestionBlock[];
  total_questions?: number;
  total_marks?: number;
};

type StudentIdentity = {
  id?: number;
  name?: string;
  reg_no?: string;
  class?: string;
  section?: string;
  department?: string;
};

type AnswerDraft = {
  selected_option_ids?: number[];
  answer_text?: string;
};

const maxSecurityViolations = 3;

export default function StudentCbtExamsPage() {
  const { showError, showSuccess } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<number | null>(null);
  const [savingQuestionId, setSavingQuestionId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempt, setAttempt] = useState<any>(null);
  const [examPaper, setExamPaper] = useState<StartedExam | null>(null);
  const [student, setStudent] = useState<StudentIdentity | null>(null);
  const [answers, setAnswers] = useState<Record<number, AnswerDraft>>({});
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [securityViolations, setSecurityViolations] = useState(0);
  const [securityWarning, setSecurityWarning] = useState("");
  const eventThrottleRef = useRef<Record<string, number>>({});
  const saveTimersRef = useRef<Record<number, number>>({});
  const forcedSubmitRef = useRef(false);

  const flatQuestions = useMemo(() => (examPaper?.question_blocks || []).flatMap((block) => block.questions || []), [examPaper]);
  const activeQuestion = flatQuestions[activeQuestionIndex] || null;
  const activeBlock = useMemo(() => {
    if (!activeQuestion) return null;
    return (examPaper?.question_blocks || []).find((block) => (block.questions || []).some((question) => question.id === activeQuestion.id)) || null;
  }, [activeQuestion, examPaper]);
  const answeredCount = flatQuestions.filter((question) => {
    const answer = answers[question.id];
    return Boolean((answer?.selected_option_ids || []).length || answer?.answer_text?.trim());
  }).length;

  async function load() {
    setLoading(true);
    try {
      const res = await authApi.get("/cbt/student/exams");
      setExams(Array.isArray(res.data?.exams) ? res.data.exams : []);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to load CBT exams.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  const logSecurityEvent = useCallback(async (eventType: string, severity: "low" | "medium" | "high" = "medium", metadata: Record<string, unknown> = {}) => {
    if (!attempt?.id) return;

    const now = Date.now();
    const lastLoggedAt = eventThrottleRef.current[eventType] || 0;
    if (now - lastLoggedAt < 5000) return;

    eventThrottleRef.current[eventType] = now;

    try {
      await authApi.post(`/cbt/student/attempts/${attempt.id}/events`, {
        event_type: eventType,
        severity,
        page_url: window.location.href,
        metadata,
      });
    } catch {
      // Security logging should not interrupt the student's active exam session.
    }
  }, [attempt?.id]);

  const recordViolation = useCallback((eventType: string, severity: "low" | "medium" | "high" = "high") => {
    if (!attempt?.id || !examPaper || forcedSubmitRef.current) return;

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
        void autoSubmitExam();
      }

      return nextCount;
    });
  }, [attempt?.id, examPaper, logSecurityEvent]);

  useEffect(() => {
    if (!attempt?.id || !examPaper) return;

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
    const onDragStart = (event: DragEvent) => blockEvent(event, "drag_attempt", "medium");
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const protectedShortcut = (event.ctrlKey || event.metaKey) && ["a", "c", "p", "s", "u", "v", "x"].includes(key);
      const developerShortcut = key === "f12" || ((event.ctrlKey || event.metaKey) && event.shiftKey && ["i", "j", "c"].includes(key));

      if (protectedShortcut || developerShortcut) {
        blockEvent(event, `keyboard_${key}_attempt`, developerShortcut ? "high" : "medium");
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        recordViolation("tab_hidden", "high");
      }
    };
    const onBlur = () => {
      recordViolation("window_blur", "medium");
    };
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        recordViolation("fullscreen_exit", "high");
      }
    };

    document.addEventListener("copy", onCopy, true);
    document.addEventListener("cut", onCut, true);
    document.addEventListener("paste", onPaste, true);
    document.addEventListener("contextmenu", onContextMenu, true);
    document.addEventListener("dragstart", onDragStart, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("copy", onCopy, true);
      document.removeEventListener("cut", onCut, true);
      document.removeEventListener("paste", onPaste, true);
      document.removeEventListener("contextmenu", onContextMenu, true);
      document.removeEventListener("dragstart", onDragStart, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("blur", onBlur);
    };
  }, [attempt?.id, examPaper, logSecurityEvent, recordViolation]);

  async function startExam(id: number) {
    setStartingId(id);
    setAttempt(null);
    setExamPaper(null);
    setAnswers({});
    try {
      const res = await authApi.post(`/cbt/student/exams/${id}/start`);
      setAttempt(res.data?.attempt || null);
      setExamPaper(res.data?.exam || null);
      setStudent(res.data?.student || null);
      setActiveQuestionIndex(0);
      setSecurityViolations(0);
      setSecurityWarning("");
      forcedSubmitRef.current = false;
      try {
        await document.documentElement.requestFullscreen?.();
      } catch {
        // Fullscreen may be blocked by the browser or device.
      }
      showSuccess("CBT exam started.");
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to start CBT exam.");
    } finally {
      setStartingId(null);
    }
  }

  const saveAnswerPayload = useCallback(async (question: Question, answer: AnswerDraft, silent = true) => {
    if (!attempt?.id) return;
    const hasAnswerContent = Boolean((answer.selected_option_ids || []).length || answer.answer_text?.trim());
    if (!hasAnswerContent) return;
    if (saveTimersRef.current[question.id]) {
      window.clearTimeout(saveTimersRef.current[question.id]);
      delete saveTimersRef.current[question.id];
    }
    setSavingQuestionId(question.id);
    try {
      await authApi.post(`/cbt/student/attempts/${attempt.id}/answers`, {
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
  }, [attempt?.id, showError, showSuccess]);

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
    if (!attempt?.id) return;
    const ok = window.confirm("Submit this CBT exam now?");
    if (!ok) return;

    setSubmitting(true);
    try {
      if (activeQuestion) {
        await saveAnswerPayload(activeQuestion, answers[activeQuestion.id] || {});
      }
      await authApi.post(`/cbt/student/attempts/${attempt.id}/submit`);
      showSuccess("CBT exam submitted.");
      setAttempt(null);
      setExamPaper(null);
      setAnswers({});
      await load();
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to submit exam.");
    } finally {
      setSubmitting(false);
    }
  }

  async function autoSubmitExam() {
    if (!attempt?.id) return;

    setSubmitting(true);
    try {
      if (activeQuestion) {
        await saveAnswerPayload(activeQuestion, answers[activeQuestion.id] || {});
      }
      await authApi.post(`/cbt/student/attempts/${attempt.id}/submit`);
      showError("Security limit reached. Your exam has been submitted automatically.");
      setAttempt(null);
      setExamPaper(null);
      setAnswers({});
      setActiveQuestionIndex(0);
      await load();
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to submit exam.");
    } finally {
      setSubmitting(false);
    }
  }

  async function jumpToQuestion(index: number) {
    if (activeQuestion) {
      await saveAnswerPayload(activeQuestion, answers[activeQuestion.id] || {});
    }
    setActiveQuestionIndex(Math.max(0, Math.min(index, flatQuestions.length - 1)));
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .scbt-main{min-height:100vh;background:#F8FAFC;padding:calc(var(--gq-topnav-height, 66px) + 24px) 26px 32px;font-family:'Plus Jakarta Sans',system-ui,-apple-system,sans-serif;overflow-x:hidden;max-width:100vw;box-sizing:border-box;}
        @media(max-width:767.98px){.scbt-main{padding:calc(var(--gq-topnav-height, 66px) + 12px) 12px 28px;}}
        .scbt-shell{max-width:1180px;margin:0 auto;width:100%;box-sizing:border-box;}
        .scbt-hero{background:linear-gradient(135deg,#0A192F 0%,#0F2744 60%,#1E3A8A 100%);color:#fff;border-radius:18px;padding:32px 36px;box-shadow:0 10px 30px -5px rgba(15,39,68,0.15);position:relative;overflow:hidden;}
        @media(max-width:767.98px){.scbt-hero{padding:20px 16px;border-radius:14px;}}
        .scbt-hero::after{content:"";position:absolute;top:-60px;right:-60px;width:320px;height:320px;border-radius:50%;background:radial-gradient(circle,rgba(217,119,6,0.15) 0%,transparent 65%);pointer-events:none;}
        .scbt-hero > *{position:relative;z-index:1;}
        .scbt-hero h1{font-weight:800;margin:4px 0 8px;font-size:26px;color:#fff;}
        @media(max-width:767.98px){.scbt-hero h1{font-size:20px;}}
        .scbt-hero p{margin:0;color:#CBD5E1;line-height:1.6;font-size:13.5px;}
        .scbt-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:20px;}
        @media(max-width:767.98px){.scbt-grid{grid-template-columns:1fr;gap:12px;margin-top:14px;}}
        .scbt-card{background:#fff;border:1px solid #E2E8F0;border-radius:16px;box-shadow:0 4px 16px rgba(15,39,68,0.03);padding:20px;box-sizing:border-box;}
        @media(max-width:767.98px){.scbt-card{padding:16px;border-radius:14px;}}
        .scbt-title{font-size:16px;font-weight:800;color:#0F2744;margin:0;word-break:break-word;}
        .scbt-sub{color:#64748B;font-size:12.5px;margin:6px 0 0;line-height:1.5;word-break:break-word;}
        .scbt-meta{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0;}
        .scbt-pill{display:inline-flex;border-radius:999px;padding:4px 10px;font-size:11.5px;font-weight:700;background:#EEF2FF;color:#3730A3;white-space:normal;word-break:break-word;}
        .scbt-btn{border:0;border-radius:10px;padding:9px 18px;font-weight:700;font-size:13px;background:#D97706;color:#FFFFFF;cursor:pointer;transition:all .2s ease;display:inline-flex;align-items:center;justify-content:center;}
        .scbt-btn:hover{background:#B45309;transform:translateY(-1px);color:#FFFFFF;}
        .scbt-btn-soft{background:#F1F5F9;color:#0F2744;border:1px solid #E2E8F0;}
        .scbt-attempt{background:#ECFEFF;border:1px solid #A5F3FC;color:#155E75;border-radius:14px;padding:14px;margin-top:16px;font-weight:800;overflow:auto;}
        .scbt-paper{margin-top:20px;background:#fff;border:1px solid #E2E8F0;border-radius:18px;box-shadow:0 4px 20px rgba(15,39,68,0.04);overflow:hidden;user-select:none;box-sizing:border-box;width:100%;}
        @media(max-width:767.98px){.scbt-paper{margin-top:14px;border-radius:14px;}}
        .scbt-paper-head{padding:20px 24px;border-bottom:1px solid #E2E8F0;display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap;}
        @media(max-width:767.98px){.scbt-paper-head{padding:14px 16px;flex-direction:column;align-items:stretch;}}
        .scbt-paper-head h2{font-size:22px;font-weight:800;margin:0;color:#0F2744;word-break:break-word;}
        @media(max-width:767.98px){.scbt-paper-head h2{font-size:18px;}}
        .scbt-paper-body{padding:22px 24px;box-sizing:border-box;}
        @media(max-width:767.98px){.scbt-paper-body{padding:14px 12px;}}
        .scbt-instruction{background:#FFFBEB;border:1px solid #FDE68A;color:#92400E;border-radius:14px;padding:14px 16px;margin-bottom:16px;font-size:13px;line-height:1.6;word-break:break-word;}
        .scbt-warning{background:#FEF2F2;border:1px solid #FECACA;color:#991B1B;border-radius:14px;padding:12px 14px;margin-bottom:16px;font-weight:700;font-size:13px;word-break:break-word;}
        .scbt-security{display:flex;align-items:flex-start;gap:10px;background:#F8FAFC;border:1px solid #E2E8F0;color:#334155;border-radius:14px;padding:12px 14px;margin-bottom:16px;font-size:12.5px;line-height:1.55;word-break:break-word;}
        .scbt-security strong{display:block;color:#0F2744;font-weight:700;}
        .scbt-qnav{display:grid;grid-template-columns:repeat(auto-fill,minmax(38px,1fr));gap:6px;margin-bottom:16px;}
        .scbt-qnav button{height:36px;border:1px solid #E2E8F0;border-radius:8px;background:#fff;font-weight:700;color:#475569;cursor:pointer;font-size:12.5px;}
        .scbt-qnav button.active{background:#0F2744;color:#fff;border-color:#0F2744;}
        .scbt-qnav button.done{border-color:#10B981;color:#166534;background:#DCFCE7;}
        .scbt-block{border:1px solid #E2E8F0;border-radius:16px;margin-bottom:16px;overflow:hidden;box-sizing:border-box;}
        .scbt-block-head{background:#F8FAFC;border-bottom:1px solid #E2E8F0;padding:16px;}
        @media(max-width:767.98px){.scbt-block-head{padding:12px;}}
        .scbt-block-head h3{font-size:16px;font-weight:800;margin:0;color:#0F2744;word-break:break-word;}
        .scbt-passage{white-space:pre-wrap;color:#334155;line-height:1.7;margin-top:10px;word-break:break-word;overflow-wrap:break-word;}
        .scbt-question{padding:18px;box-sizing:border-box;}
        @media(max-width:767.98px){.scbt-question{padding:14px 10px;}}
        .scbt-question h4{font-size:16px;font-weight:700;color:#0F2744;margin:12px 0 14px;line-height:1.45;word-break:break-word;}
        .scbt-option{display:flex;gap:10px;align-items:flex-start;border:1px solid #E2E8F0;border-radius:12px;padding:12px;margin-bottom:10px;cursor:pointer;word-break:break-word;overflow-wrap:break-word;box-sizing:border-box;}
        @media(max-width:767.98px){.scbt-option{padding:10px 8px;gap:8px;}}
        .scbt-textarea{width:100%;min-height:110px;border:1px solid #E2E8F0;border-radius:12px;padding:12px;user-select:text;outline:none;box-sizing:border-box;}
        .scbt-textarea:focus{border-color:#D97706;}
        .scbt-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px;}
        @media(max-width:767.98px){.scbt-actions{width:100%;}.scbt-actions .scbt-btn{flex:1;}}
        .scbt-pager{display:flex;justify-content:space-between;gap:12px;align-items:center;border-top:1px solid #E2E8F0;padding-top:14px;margin-top:14px;flex-wrap:wrap;}
        @media(max-width:767.98px){.scbt-pager{flex-direction:column;align-items:stretch;gap:8px;}.scbt-pager .scbt-btn{width:100%;}}
        .cbt-html{color:#0F2744;line-height:1.6;word-break:break-word;overflow-wrap:break-word;}
        .cbt-html p{margin:0 0 10px;}
        .cbt-html table{width:100%;border-collapse:collapse;margin:10px 0;table-layout:fixed;display:block;overflow-x:auto;-webkit-overflow-scrolling:touch;}
        .cbt-html th,.cbt-html td{border:1px solid #CBD5E1;padding:8px;vertical-align:top;word-break:break-word;}
        .cbt-html th{background:#F1F5F9;font-weight:700;}
        .cbt-html img{max-width:100% !important;height:auto !important;border-radius:10px;border:1px solid #E2E8F0;margin:8px 0;box-sizing:border-box;}
        .scbt-option .cbt-html{flex:1;min-width:0;}
        @media(max-width:1199px){.scbt-paper-head{flex-direction:column;align-items:stretch;}}
      `}</style>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="My CBT Exams" />
      <PageTitle title="My CBT Exams" />
      <div className="container-fluid"><div className="row"><Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="col-md-9 col-lg-10 ms-auto db-main scbt-main">{loading && <Loader message="Loading CBT exams..." />}<div className="scbt-shell">
          <section className="scbt-hero"><h1>My CBT Exams</h1><p>Start only when your teacher or school tells you to begin. Passages will stay attached to their questions.</p></section>

          {!examPaper && (
            <section className="scbt-grid">
              {exams.length === 0 ? <div className="scbt-card"><p className="scbt-title">No CBT exam available</p><p className="scbt-sub">Published exams assigned to your class will appear here.</p></div> : exams.map((exam) => (
                <article className="scbt-card" key={exam.id}>
                  <h2 className="scbt-title">{exam.title}</h2>
                  <p className="scbt-sub">{exam.subject?.name || "Subject"} - {exam.term?.name || "Term"} {exam.academic_session?.name || ""}</p>
                  {exam.fee_access && !exam.fee_access.allowed && (
                    <div className="scbt-warning">
                      {exam.fee_access.message || "Access denied. Complete the required school fee payment before starting this exam."}
                    </div>
                  )}
                  <div className="scbt-meta"><span className="scbt-pill">{exam.duration_minutes} minutes</span><span className="scbt-pill">{exam.questions_count ?? 0} questions</span><span className="scbt-pill">{exam.delivery_mode}</span></div>
                  <button className="scbt-btn" disabled={startingId === exam.id || exam.fee_access?.allowed === false} onClick={() => startExam(exam.id)}>{startingId === exam.id ? "Starting..." : "Start Exam"}</button>
                </article>
              ))}
            </section>
          )}

          {examPaper && (
            <section className="scbt-paper">
              <div className="scbt-paper-head">
                <div>
                  <h2>{examPaper.title}</h2>
                  <p className="scbt-sub mb-0">{examPaper.exam_code || `Exam #${examPaper.id}`} - {examPaper.duration_minutes} minutes - {examPaper.total_questions || flatQuestions.length} question(s)</p>
                  <div className="scbt-meta">
                    <span className="scbt-pill">{student?.name || "Student"}</span>
                    <span className="scbt-pill">{student?.reg_no || "Admission no"}</span>
                    <span className="scbt-pill">{examPaper.class?.name || student?.class || "Class not set"}</span>
                    <span className="scbt-pill">{examPaper.subject?.name || "Subject not set"}</span>
                  </div>
                </div>
                <div className="text-end">
                  <div className="scbt-pill">{answeredCount}/{flatQuestions.length} answered</div>
                  <div className="scbt-actions">
                    <button className="scbt-btn scbt-btn-soft" type="button" onClick={() => { setExamPaper(null); setAttempt(null); setActiveQuestionIndex(0); }}>Close</button>
                    <button className="scbt-btn" type="button" disabled={submitting} onClick={submitExam}>{submitting ? "Submitting..." : "Submit Exam"}</button>
                  </div>
                </div>
              </div>
              <div className="scbt-paper-body">
                {examPaper.general_instructions && <div className="scbt-instruction">{examPaper.general_instructions}</div>}
                <div className="scbt-security">
                  <i className="bi bi-shield-lock" />
                  <span><strong>Exam security is active</strong>Copy, paste, right-click, printing shortcuts, and tab switching are restricted and may be recorded for review.</span>
                </div>
                {securityWarning && (
                  <div className="scbt-warning">
                    {securityWarning} {securityViolations > 0 && securityViolations < maxSecurityViolations ? `Violation ${securityViolations} of ${maxSecurityViolations}.` : ""}
                  </div>
                )}
                <div className="scbt-qnav">
                  {flatQuestions.map((question, index) => {
                    const done = Boolean((answers[question.id]?.selected_option_ids || []).length || answers[question.id]?.answer_text?.trim());
                    return <button key={question.id} className={`${index === activeQuestionIndex ? "active" : ""} ${done ? "done" : ""}`} type="button" onClick={() => void jumpToQuestion(index)}>{index + 1}</button>;
                  })}
                </div>
                {activeQuestion && (
                  <div className="scbt-block">
                    {activeBlock?.type === "group" && (
                      <div className="scbt-block-head">
                        <span className="scbt-pill">{(activeBlock.group_type || "passage").replace(/_/g, " ")}</span>
                        <h3>{activeBlock.title || "Read the passage and answer the question"}</h3>
                        {activeBlock.instructions && <p className="scbt-sub">{activeBlock.instructions}</p>}
                        {activeBlock.passage && <div className="scbt-passage">{activeBlock.passage}</div>}
                      </div>
                    )}
                    {(() => {
                      const answer = answers[activeQuestion.id] || {};
                      return (
                        <div className="scbt-question" key={activeQuestion.id}>
                          <span className="scbt-pill">Question {activeQuestionIndex + 1} of {flatQuestions.length}</span>
                          <CbtHtml html={activeQuestion.question_text} />
                          {activeQuestion.instructions && <CbtHtml html={activeQuestion.instructions} className="scbt-sub" />}
                          {["single_choice", "multiple_choice", "true_false"].includes(activeQuestion.question_type) ? (
                            (activeQuestion.options || []).map((option, optionIndex) => (
                              <label className="scbt-option" key={option.id}>
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
                            <textarea className="scbt-textarea" value={answer.answer_text || ""} onChange={(e) => writeAnswer(activeQuestion, e.target.value)} placeholder="Type your answer here." />
                          )}
                          <div className="scbt-actions">
                            <span className="scbt-pill">{activeQuestion.marks} mark(s)</span>
                            <button className="scbt-btn scbt-btn-soft" type="button" disabled={savingQuestionId === activeQuestion.id} onClick={() => saveAnswer(activeQuestion)}>
                              {savingQuestionId === activeQuestion.id ? "Saving..." : "Save Answer"}
                            </button>
                          </div>
                          <div className="scbt-pager">
                            <button className="scbt-btn scbt-btn-soft" type="button" disabled={activeQuestionIndex === 0} onClick={() => void jumpToQuestion(activeQuestionIndex - 1)}>Previous</button>
                            <span className="scbt-sub mb-0">{answeredCount} of {flatQuestions.length} answered</span>
                            {activeQuestionIndex >= flatQuestions.length - 1 ? (
                              <button className="scbt-btn" type="button" disabled={submitting} onClick={submitExam}>Submit Exam</button>
                            ) : (
                              <button className="scbt-btn" type="button" onClick={() => void jumpToQuestion(activeQuestionIndex + 1)}>Next</button>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </section>
          )}

          <Footer />
        </div></main>
      </div></div>
    </>
  );
}
