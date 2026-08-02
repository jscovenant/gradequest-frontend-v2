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
        .scbt-main{min-height:100vh;background:#f8fafc;margin-left:280px;width:calc(100% - 280px);padding:96px 26px 32px}
        .scbt-shell{max-width:1180px;margin:0 auto}.scbt-hero{background:linear-gradient(135deg,#171222,#3c1237);color:#fff;border-radius:18px;padding:26px}.scbt-hero h1{font-family:'Playfair Display',serif;font-weight:900;margin:4px 0 8px;font-size:clamp(28px,4vw,42px)}.scbt-hero p{margin:0;color:rgba(255,255,255,.76);line-height:1.7}
        .scbt-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin-top:16px}.scbt-card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 12px 30px rgba(15,23,42,.06);padding:18px}.scbt-title{font-size:18px;font-weight:900;color:#111827;margin:0}.scbt-sub{color:#64748b;font-size:13px;margin:6px 0 0}.scbt-meta{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.scbt-pill{display:inline-flex;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900;background:#eef2ff;color:#3730a3}.scbt-btn{border:0;border-radius:10px;padding:10px 14px;font-weight:900;background:var(--bs-primary,#d300b0);color:#fff}.scbt-btn-soft{background:#f1f5f9;color:#0f172a}.scbt-attempt{background:#ecfeff;border:1px solid #a5f3fc;color:#155e75;border-radius:14px;padding:14px;margin-top:16px;font-weight:800;overflow:auto}
        .scbt-paper{margin-top:16px;background:#fff;border:1px solid #e5e7eb;border-radius:18px;box-shadow:0 12px 30px rgba(15,23,42,.06);overflow:hidden;user-select:none}.scbt-paper-head{padding:20px 22px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.scbt-paper-head h2{font-size:24px;font-weight:900;margin:0;color:#111827}.scbt-paper-body{padding:20px 22px}.scbt-instruction{background:#fff7ed;border:1px solid #fed7aa;color:#7c2d12;border-radius:14px;padding:14px;margin-bottom:16px}.scbt-warning{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:14px;padding:12px 14px;margin-bottom:16px;font-weight:800}.scbt-security{display:flex;align-items:flex-start;gap:10px;background:#f8fafc;border:1px solid #dbe3ef;color:#334155;border-radius:14px;padding:12px 14px;margin-bottom:16px;font-size:13px;line-height:1.55}.scbt-security strong{display:block;color:#0f172a}.scbt-qnav{display:grid;grid-template-columns:repeat(auto-fill,minmax(40px,1fr));gap:8px;margin-bottom:16px}.scbt-qnav button{height:38px;border:1px solid #dbe3ef;border-radius:10px;background:#fff;font-weight:900;color:#475569}.scbt-qnav button.active{background:#111827;color:#fff}.scbt-qnav button.done{border-color:#22c55e;color:#166534}.scbt-block{border:1px solid #e5e7eb;border-radius:16px;margin-bottom:16px;overflow:hidden}.scbt-block-head{background:#f8fafc;border-bottom:1px solid #e5e7eb;padding:16px}.scbt-block-head h3{font-size:17px;font-weight:900;margin:0;color:#111827}.scbt-passage{white-space:pre-wrap;color:#334155;line-height:1.7;margin-top:10px}.scbt-question{padding:18px}.scbt-question h4{font-size:18px;font-weight:900;color:#111827;margin:12px 0 14px;line-height:1.45}.scbt-option{display:flex;gap:10px;align-items:flex-start;border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-bottom:10px}.scbt-textarea{width:100%;min-height:110px;border:1px solid #dbe3ef;border-radius:12px;padding:12px;user-select:text}.scbt-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:12px}.scbt-pager{display:flex;justify-content:space-between;gap:12px;align-items:center;border-top:1px solid #eef2f7;padding-top:14px;margin-top:14px}.cbt-html{color:#111827;line-height:1.6}.cbt-html p{margin:0 0 10px}.cbt-html table{width:100%;border-collapse:collapse;margin:10px 0;table-layout:fixed}.cbt-html th,.cbt-html td{border:1px solid #cbd5e1;padding:8px;vertical-align:top}.cbt-html th{background:#f1f5f9;font-weight:900}.cbt-html img{max-width:100%;height:auto;border-radius:10px;border:1px solid #e5e7eb;margin:8px 0}.scbt-option .cbt-html{flex:1}
        @media(max-width:1199px){.scbt-main{margin-left:0;width:100%;padding:92px 16px 28px}.scbt-paper-head{flex-direction:column}}
      `}</style>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="My CBT Exams" />
      <PageTitle title="My CBT Exams" />
      <div className="container-fluid"><div className="row"><Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="scbt-main">{loading && <Loader message="Loading CBT exams..." />}<div className="scbt-shell">
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
