import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageTitle from "../components/PageTitle";
import CbtHtml from "../components/cbt/CbtHtml";

type BundleSummary = {
  id: number;
  school_name?: string;
  license_key?: string;
  generated_at?: string;
  expires_at?: string;
  imported_at?: string;
  is_expired?: boolean;
  exams_count?: number;
  students_count?: number;
  eligible_students_count?: number;
  blocked_students_count?: number;
  fee_policy_snapshot?: {
    included?: boolean;
    generated_at?: string;
    valid_hours?: number;
    message?: string;
  } | null;
};

type ServerInfo = {
  host?: string;
  port?: number;
  local_url?: string;
  network_ips?: string[];
  student_urls?: string[];
};

type Student = {
  id: number;
  name: string;
  reg_no: string;
  class?: string;
};

type ExamSummary = {
  id: number;
  title: string;
  exam_code?: string;
  duration_minutes: number;
  calculator_enabled?: boolean;
  questions_count?: number;
  subject?: { name?: string } | null;
  class?: { name?: string } | null;
  is_open?: boolean;
  submitted?: boolean;
};

type Option = {
  id: number;
  label?: string;
  option_text: string;
};

type Question = {
  id: number;
  question_group_id?: number | null;
  question_type: string;
  question_text: string;
  instructions?: string | null;
  marks?: number;
  options?: Option[];
};

type QuestionGroup = {
  id: number;
  group_type?: string;
  title?: string | null;
  instructions?: string | null;
  passage?: string | null;
};

type ExamPaper = {
  id: number;
  title: string;
  exam_code?: string;
  duration_minutes: number;
  shuffle_options?: boolean;
  calculator_enabled?: boolean;
  general_instructions?: string | null;
  subject?: { name?: string } | null;
  class?: { name?: string } | null;
  question_groups?: QuestionGroup[];
  questions?: Question[];
};

type Attempt = {
  offline_attempt_uuid: string;
  status: string;
  answers?: Answer[];
  started_at?: string | null;
  submitted_at?: string | null;
};

type Answer = {
  question_id: number;
  selected_option_ids?: number[];
  answer_text?: string | null;
};

const apiRoot = (() => {
  const isOfflineRunner = window.location.pathname.includes("/cbt/offline-runner");
  if (isOfflineRunner) {
    return `${window.location.origin}/api`;
  }

  const envBase = import.meta.env.VITE_OFFLINE_CBT_API_URL || import.meta.env.VITE_API_URL;
  if (envBase) {
    const normalized = String(envBase).replace(/\/+$/, "");
    return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
  }

  const sameHostBackend = `${window.location.protocol}//${window.location.hostname}:8000`;
  return `${sameHostBackend}/api`;
})();

const scientificButtons = ["7", "8", "9", "/", "sin", "4", "5", "6", "*", "cos", "1", "2", "3", "-", "tan", "0", ".", "^", "+", "sqrt", "(", ")", "log", "ln", "C"];
const maxSecurityViolations = 3;

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${apiRoot}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.message || "Offline CBT request failed.");
  }

  return res.json();
}

function shuffled<T>(items: T[], enabled?: boolean) {
  if (!enabled) return items;
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatDateTime(value?: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString();
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

export default function OfflineCbtRunnerPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [bundle, setBundle] = useState<BundleSummary | null>(null);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [attemptStats, setAttemptStats] = useState({ in_progress: 0, submitted: 0 });
  const [studentRegNo, setStudentRegNo] = useState("");
  const [student, setStudent] = useState<Student | null>(null);
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [examPaper, setExamPaper] = useState<ExamPaper | null>(null);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [pendingExam, setPendingExam] = useState<ExamSummary | null>(null);
  const [securityWarning, setSecurityWarning] = useState("");
  const [securityViolations, setSecurityViolations] = useState(0);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calcValue, setCalcValue] = useState("");
  const [message, setMessage] = useState("");
  const eventThrottleRef = useRef<Record<string, number>>({});
  const forcedSubmitRef = useRef(false);
  const isServerConsole = ["localhost", "127.0.0.1"].includes(window.location.hostname) || window.location.search.includes("server=1");

  const questions = examPaper?.questions || [];
  const activeQuestion = questions[activeIndex] || null;
  const activeGroup = activeQuestion?.question_group_id
    ? (examPaper?.question_groups || []).find((group) => group.id === activeQuestion.question_group_id)
    : null;
  const activeOptions = useMemo(
    () => shuffled(activeQuestion?.options || [], examPaper?.shuffle_options),
    [activeQuestion?.id, examPaper?.shuffle_options]
  );
  const answeredCount = Object.values(answers).filter((answer) =>
    Boolean((answer.selected_option_ids || []).length || answer.answer_text?.trim())
  ).length;
  const optionKeys = ["a", "b", "c", "d", "e", "f"];

  async function loadStatus() {
    setLoading(true);
    try {
      const res = await apiFetch<{ bundle: BundleSummary | null; server?: ServerInfo; attempts?: { in_progress: number; submitted: number } }>("/offline-cbt/status");
      setBundle(res.bundle || null);
      setServerInfo(res.server || null);
      setAttemptStats(res.attempts || { in_progress: 0, submitted: 0 });
    } catch (err: any) {
      setMessage(err.message || "Offline CBT server is not reachable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function importBundle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    try {
      const bundleJson = JSON.parse(await file.text());
      const res = await apiFetch<{ message: string; bundle: BundleSummary }>("/offline-cbt/bundle/import", {
        method: "POST",
        body: JSON.stringify({ bundle: bundleJson }),
      });
      setBundle(res.bundle);
      setStudent(null);
      setExams([]);
      setAttempt(null);
      setExamPaper(null);
      setMessage(res.message || "Bundle imported.");
      await loadStatus();
    } catch (err: any) {
      setMessage(err.message || "Unable to import offline CBT bundle.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function refreshStudentExams(regNo = studentRegNo) {
    setBusy(true);
    try {
      const res = await apiFetch<{ student: Student; exams: ExamSummary[]; school?: { name?: string } }>("/offline-cbt/students/lookup", {
        method: "POST",
        body: JSON.stringify({ student_reg_no: regNo }),
      });
      setStudent(res.student);
      setExams(res.exams || []);
      setMessage("");
    } catch (err: any) {
      setStudent(null);
      setExams([]);
      setMessage(err.message || "Admission number was not found.");
    } finally {
      setBusy(false);
    }
  }

  async function lookupStudent(e: FormEvent) {
    e.preventDefault();
    await refreshStudentExams();
  }

  async function startExam(exam: ExamSummary) {
    if (!student) return;
    setBusy(true);
    try {
      const res = await apiFetch<{ attempt: Attempt; exam: ExamPaper; student: Student }>("/offline-cbt/exams/" + exam.id + "/start", {
        method: "POST",
        body: JSON.stringify({ student_id: student.id }),
      });
      setAttempt(res.attempt);
      setExamPaper(res.exam);
      setStudent(res.student);
      setAnswers(Object.fromEntries((res.attempt.answers || []).map((answer) => [answer.question_id, answer])));
      setActiveIndex(0);
      setCalculatorOpen(false);
      setCalcValue("");
      setPendingExam(null);
      setConfirmingSubmit(false);
      setSecurityWarning("");
      setSecurityViolations(0);
      forcedSubmitRef.current = false;
      setMessage("");
      try {
        await document.documentElement.requestFullscreen?.();
      } catch {
        setSecurityWarning("Fullscreen could not open automatically. Please keep this exam window active.");
      }
    } catch (err: any) {
      setMessage(err.message || "Unable to start exam.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAnswer(answer: Answer) {
    if (!attempt) return;

    setAnswers((current) => ({ ...current, [answer.question_id]: answer }));
    try {
      const res = await apiFetch<{ attempt: Attempt }>("/offline-cbt/attempts/" + attempt.offline_attempt_uuid + "/answers", {
        method: "POST",
        body: JSON.stringify(answer),
      });
      setAttempt(res.attempt);
    } catch (err: any) {
      setMessage(err.message || "Unable to save answer on local server.");
    }
  }

  function chooseOption(optionId: number, checked: boolean) {
    if (!activeQuestion) return;
    const current = answers[activeQuestion.id]?.selected_option_ids || [];
    const selected = activeQuestion.question_type === "multiple_choice"
      ? checked
        ? Array.from(new Set([...current, optionId]))
        : current.filter((id) => id !== optionId)
      : [optionId];

    void saveAnswer({
      question_id: activeQuestion.id,
      selected_option_ids: selected,
      answer_text: answers[activeQuestion.id]?.answer_text || null,
    });
  }

  function writeAnswer(value: string) {
    if (!activeQuestion) return;
    void saveAnswer({
      question_id: activeQuestion.id,
      selected_option_ids: answers[activeQuestion.id]?.selected_option_ids || [],
      answer_text: value,
    });
  }

  async function submitExam(force = false) {
    if (!attempt) return;
    if (!force && !confirmingSubmit) {
      setConfirmingSubmit(true);
      return;
    }

    setBusy(true);
    try {
      await apiFetch("/offline-cbt/attempts/" + attempt.offline_attempt_uuid + "/submit", { method: "POST" });
      setMessage("Exam submitted on the local server.");
      setAttempt(null);
      setExamPaper(null);
      setAnswers({});
      setActiveIndex(0);
      setConfirmingSubmit(false);
      setCalculatorOpen(false);
      setCalcValue("");
      setSecurityWarning("");
      setSecurityViolations(0);
      forcedSubmitRef.current = true;
      if (document.fullscreenElement) {
        await document.exitFullscreen?.().catch(() => undefined);
      }
      await loadStatus();
      if (studentRegNo) {
        await refreshStudentExams(studentRegNo);
      }
    } catch (err: any) {
      setMessage(err.message || "Unable to submit exam.");
    } finally {
      setBusy(false);
    }
  }

  function exportResults() {
    window.location.href = `${apiRoot}/offline-cbt/results/export`;
  }

  const logSecurityEvent = useCallback(async (eventType: string, severity = "medium", metadata: Record<string, unknown> = {}) => {
    if (!attempt?.offline_attempt_uuid) return;

    const now = Date.now();
    const throttleKey = `${eventType}:${severity}`;
    if ((eventThrottleRef.current[throttleKey] || 0) + 5000 > now) return;
    eventThrottleRef.current[throttleKey] = now;

    await apiFetch(`/offline-cbt/attempts/${attempt.offline_attempt_uuid}/events`, {
      method: "POST",
      body: JSON.stringify({
        event_type: eventType,
        severity,
        metadata: {
          ...metadata,
          page_url: window.location.href,
          recorded_at: new Date().toISOString(),
        },
      }),
    }).catch(() => undefined);
  }, [attempt?.offline_attempt_uuid]);

  const recordViolation = useCallback((eventType: string, messageText: string, metadata: Record<string, unknown> = {}) => {
    if (!attempt?.offline_attempt_uuid || !examPaper || forcedSubmitRef.current) return;

    setSecurityWarning(messageText);
    setSecurityViolations((current) => {
      const next = current + 1;
      void logSecurityEvent(eventType, next >= maxSecurityViolations ? "high" : "medium", {
        ...metadata,
        warning_count: next,
        max_warning_count: maxSecurityViolations,
      });

      if (next >= maxSecurityViolations) {
        forcedSubmitRef.current = true;
        setSecurityWarning("Security limit reached. Your exam is being submitted automatically.");
        void submitExam(true);
      }

      return next;
    });
  }, [attempt?.offline_attempt_uuid, examPaper, logSecurityEvent]);

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
    if (!attempt?.started_at || !examPaper) {
      setRemainingSeconds(null);
      return;
    }

    const startedAt = new Date(attempt.started_at).getTime();
    if (Number.isNaN(startedAt)) {
      setRemainingSeconds(null);
      return;
    }

    const expiresAt = startedAt + Number(examPaper.duration_minutes || 60) * 60 * 1000;
    const updateTimer = () => {
      const secondsLeft = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(secondsLeft);
      if (secondsLeft <= 0 && !busy) {
        setConfirmingSubmit(true);
        void submitExam(true);
      }
    };

    updateTimer();
    const timerId = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timerId);
  }, [attempt?.started_at, examPaper?.id, examPaper?.duration_minutes, busy]);

  useEffect(() => {
    if (!examPaper || !activeQuestion) return;

    const blockAction = (event: Event, eventType: string, label: string, severity = "medium") => {
      event.preventDefault();
      event.stopPropagation();
      setSecurityWarning(`${label} is not allowed during this exam. This action has been recorded.`);
      void logSecurityEvent(eventType, severity, { action: label });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "TEXTAREA" || target?.tagName === "INPUT";
      const key = event.key.toLowerCase();
      const protectedShortcut = (event.ctrlKey || event.metaKey) && ["a", "c", "p", "s", "u", "v", "x"].includes(key);
      const developerShortcut = key === "f12" || ((event.ctrlKey || event.metaKey) && event.shiftKey && ["i", "j", "c"].includes(key));

      if (protectedShortcut || developerShortcut) {
        blockAction(event, developerShortcut ? "developer_shortcut_blocked" : "protected_shortcut_blocked", "This keyboard shortcut", "high");
        return;
      }

      if (isTyping) return;

      if (optionKeys.includes(key) && ["single_choice", "multiple_choice", "true_false"].includes(activeQuestion.question_type)) {
        const option = activeOptions[optionKeys.indexOf(key)];
        if (option) {
          event.preventDefault();
          const selected = answers[activeQuestion.id]?.selected_option_ids || [];
          chooseOption(option.id, !selected.includes(option.id));
        }
      }

      if (key === "arrowright") {
        event.preventDefault();
        setActiveIndex((index) => Math.min(questions.length - 1, index + 1));
      }

      if (key === "arrowleft") {
        event.preventDefault();
        setActiveIndex((index) => Math.max(0, index - 1));
      }

      if (key === "s") {
        event.preventDefault();
        setConfirmingSubmit(true);
      }

      if (key === "enter" && confirmingSubmit) {
        event.preventDefault();
        void submitExam(true);
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        recordViolation("tab_or_window_left", "You left the exam window. This action has been recorded.");
      }
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        recordViolation("fullscreen_exit", "You exited fullscreen mode. This action has been recorded.");
      }
    };

    const onWindowBlur = () => {
      recordViolation("window_blur", "You left the exam window. This action has been recorded.");
    };
    const onCopy = (event: ClipboardEvent) => blockAction(event, "copy_blocked", "Copy");
    const onCut = (event: ClipboardEvent) => blockAction(event, "cut_blocked", "Cut");
    const onPaste = (event: ClipboardEvent) => blockAction(event, "paste_blocked", "Paste");
    const onContextMenu = (event: MouseEvent) => blockAction(event, "right_click_blocked", "Right click");

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("blur", onWindowBlur);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [examPaper, activeQuestion, activeOptions, answers, questions.length, confirmingSubmit, logSecurityEvent, recordViolation]);

  return (
    <>
      <PageTitle title="Offline CBT Server" />
      <style>{`
        .offline-cbt{min-height:100vh;background:#eef2f7;color:#0f172a;padding:24px}.offline-shell{max-width:1180px;margin:0 auto}.offline-hero{background:linear-gradient(135deg,#101827,#4a1240);color:#fff;border-radius:20px;padding:26px;display:flex;justify-content:space-between;gap:16px;align-items:flex-end}.offline-hero h1{font-size:clamp(30px,5vw,50px);font-weight:900;margin:0}.offline-hero p{margin:8px 0 0;color:rgba(255,255,255,.78);line-height:1.6}.offline-card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 18px 44px rgba(15,23,42,.08);padding:18px}.offline-grid{display:grid;grid-template-columns:360px minmax(0,1fr);gap:16px;margin-top:16px}.offline-label{font-size:12px;text-transform:uppercase;font-weight:900;color:#475569;margin-bottom:6px}.offline-input{width:100%;border:1px solid #dbe3ef;border-radius:12px;padding:11px 12px;margin-bottom:12px;background:#fff}.offline-btn{border:0;border-radius:12px;padding:11px 15px;font-weight:900;background:var(--bs-primary,#d300b0);color:#fff;display:inline-flex;gap:8px;align-items:center;text-decoration:none}.offline-btn:disabled{opacity:.55}.offline-btn-soft{background:#f1f5f9;color:#0f172a}.offline-title{font-size:20px;font-weight:900;margin:0;color:#111827}.offline-sub{font-size:13px;color:#64748b;line-height:1.55}.offline-list{display:grid;gap:10px}.offline-pill{display:inline-flex;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900;background:#eef2ff;color:#3730a3}.offline-pill-danger{background:#fee2e2;color:#991b1b}.offline-meta{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.offline-alert{background:#fff7ed;border:1px solid #fed7aa;color:#7c2d12;border-radius:14px;padding:12px;margin-top:14px;font-weight:800}.offline-good{background:#ecfdf5;border-color:#bbf7d0;color:#065f46}.offline-danger{background:#fef2f2;border-color:#fecaca;color:#991b1b}.offline-kv{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}.offline-kv div{border:1px solid #e5e7eb;border-radius:12px;padding:10px;background:#f8fafc}.offline-kv strong{display:block;font-size:12px;text-transform:uppercase;color:#64748b}.offline-kv span{display:block;font-weight:900;color:#0f172a;margin-top:3px}.offline-paper{margin-top:16px;background:#fff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden}.offline-paper-head{padding:18px 20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;gap:12px;align-items:flex-start;position:sticky;top:0;background:#fff;z-index:20}.offline-timer{background:#111827;color:#fff;border-radius:14px;padding:10px 14px;text-align:center;min-width:120px}.offline-timer span{display:block;font-size:11px;text-transform:uppercase;color:#cbd5e1;font-weight:900}.offline-timer strong{display:block;font-size:22px;line-height:1.1}.offline-timer.danger{background:#991b1b}.offline-body{display:grid;grid-template-columns:250px minmax(0,1fr);gap:0;padding:0}.offline-nav{background:#f8fafc;border-right:1px solid #e5e7eb;padding:16px}.offline-nav-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.offline-qnav{height:38px;border:1px solid #dbe3ef;border-radius:10px;background:#fff;color:#475569;font-weight:900}.offline-qnav.active{background:#111827;color:#fff}.offline-qnav.done{border-color:#22c55e;color:#166534;background:#ecfdf5}.offline-content{padding:18px 20px;min-width:0}.offline-shortcuts{background:#f8fafc;border:1px solid #dbe3ef;color:#334155;border-radius:14px;padding:12px;margin-bottom:14px;font-size:13px}.offline-rules{margin:14px 0 0;padding-left:20px;color:#334155;line-height:1.65}.offline-rules li{margin-bottom:7px}.offline-group{background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin-bottom:14px}.offline-option{display:flex;gap:10px;border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-bottom:10px}.offline-option:has(input:checked){border-color:var(--bs-primary,#d300b0);background:#fdf2fb}.offline-textarea{width:100%;min-height:120px;border:1px solid #dbe3ef;border-radius:12px;padding:12px}.offline-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:12px}.offline-calc{position:fixed;right:24px;bottom:24px;z-index:40;width:min(340px,calc(100vw - 48px));background:#111827;color:#fff;border-radius:18px;padding:14px;box-shadow:0 24px 70px rgba(15,23,42,.34)}.offline-calc input{width:100%;border:0;border-radius:12px;padding:12px;background:#020617;color:#fff;font-size:22px;text-align:right;margin-bottom:10px}.offline-calc-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.offline-calc button{border:0;border-radius:10px;padding:10px 6px;background:#334155;color:#fff;font-weight:900}.offline-confirm{position:fixed;inset:0;background:rgba(15,23,42,.58);z-index:50;display:flex;align-items:center;justify-content:center;padding:18px}.offline-confirm-card{width:min(560px,100%);background:#fff;border-radius:18px;padding:22px;box-shadow:0 24px 80px rgba(15,23,42,.3)}.cbt-html{line-height:1.6}.cbt-html table{width:100%;border-collapse:collapse;margin:10px 0}.cbt-html td,.cbt-html th{border:1px solid #cbd5e1;padding:8px}.cbt-html img{max-width:100%;height:auto;border-radius:10px;border:1px solid #e5e7eb}@media(max-width:900px){.offline-cbt{padding:14px}.offline-grid{grid-template-columns:1fr}.offline-hero,.offline-paper-head{flex-direction:column;align-items:flex-start}.offline-kv{grid-template-columns:1fr}.offline-body{grid-template-columns:1fr}.offline-nav{border-right:0;border-bottom:1px solid #e5e7eb}}
      `}</style>

      <main className="offline-cbt">
        <div className="offline-shell">
          <section className="offline-hero">
            <div>
              <h1>{isServerConsole ? "Offline CBT Control Room" : "Student CBT Access"}</h1>
              <p>
                {isServerConsole
                  ? bundle?.school_name || "Upload the offline exam package on this server computer, then share the student link with devices on the same WiFi."
                  : bundle?.school_name || "Enter your admission number to load the exam assigned to you by your school."}
              </p>
            </div>
            {isServerConsole && <button className="offline-btn offline-btn-soft" type="button" disabled={!bundle || busy} onClick={exportResults}>Export Results</button>}
          </section>

          {message && <div className="offline-alert">{message}</div>}
          {loading && <div className="offline-alert">Checking local CBT server...</div>}

          {!examPaper && (
            <section className="offline-grid">
              <aside className="offline-card">
                <h2 className="offline-title">{isServerConsole ? "Server setup" : "Find your exam"}</h2>
                <p className="offline-sub">
                  {isServerConsole
                    ? "Upload the package once on this computer. Students should use the network link below on their own devices."
                    : "Ask your invigilator for the correct admission number if your exam does not appear."}
                </p>

                {isServerConsole && (
                  <>
                    <label className="offline-label">Import offline bundle</label>
                    <input className="offline-input" type="file" accept="application/json,.json" disabled={busy} onChange={importBundle} />
                  </>
                )}

                {isServerConsole && (
                  <>
                    <div className="offline-meta">
                      <span className="offline-pill">{bundle?.exams_count || 0} exam(s)</span>
                      <span className="offline-pill">{bundle?.students_count || 0} student(s)</span>
                      <span className="offline-pill">{bundle?.eligible_students_count || 0} eligible</span>
                      {!!bundle?.blocked_students_count && <span className="offline-pill offline-pill-danger">{bundle.blocked_students_count} blocked</span>}
                      <span className="offline-pill">{attemptStats.submitted} submitted</span>
                      <span className="offline-pill">{attemptStats.in_progress} active</span>
                    </div>
                    <div className="offline-kv">
                      <div><strong>Generated</strong><span>{formatDateTime(bundle?.generated_at)}</span></div>
                      <div><strong>Expires</strong><span>{formatDateTime(bundle?.expires_at)}</span></div>
                    </div>
                    <div className={`offline-alert ${bundle?.is_expired ? "offline-danger" : "offline-good"}`}>
                      {bundle?.is_expired
                        ? "This package has expired. Import a fresh package before students continue."
                        : "Access rules were checked when this package was generated. If payments, classes or exam settings changed, download a fresh package from the main portal."}
                    </div>
                  </>
                )}

                {isServerConsole ? (
                  <div className="offline-alert offline-good">
                    <div className="offline-label">Student access link</div>
                    {(serverInfo?.student_urls || []).length > 0 ? (
                      (serverInfo?.student_urls || []).map((url) => (
                        <div key={url} style={{ wordBreak: "break-all", marginTop: 6 }}>
                          <strong>{url}</strong>
                        </div>
                      ))
                    ) : (
                      <div>Connect this computer to WiFi or hotspot to show the student access link.</div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={lookupStudent}>
                    <label className="offline-label">Admission number</label>
                    <input className="offline-input" value={studentRegNo} onChange={(e) => setStudentRegNo(e.target.value)} placeholder="Enter admission number" required />
                    <button className="offline-btn" type="submit" disabled={busy || !bundle}>{busy ? "Checking..." : "Confirm Student"}</button>
                  </form>
                )}
              </aside>

              <section className="offline-card">
                {isServerConsole ? (
                  <>
                    <h2 className="offline-title">{bundle ? "Package dashboard" : "No package imported"}</h2>
                    <p className="offline-sub">
                      {bundle
                        ? "This is what the local server currently has ready for student devices."
                        : "Download an offline CBT package from the main GradeQuest portal, then import it here."}
                    </p>
                    <div className="offline-kv">
                      <div><strong>School</strong><span>{bundle?.school_name || "Not set"}</span></div>
                      <div><strong>Exams</strong><span>{bundle?.exams_count || 0}</span></div>
                      <div><strong>Students</strong><span>{bundle?.students_count || 0}</span></div>
                      <div><strong>Eligible</strong><span>{bundle?.eligible_students_count || 0}</span></div>
                      <div><strong>Blocked</strong><span>{bundle?.blocked_students_count || 0}</span></div>
                      <div><strong>Submitted</strong><span>{attemptStats.submitted}</span></div>
                    </div>
                    <div className="offline-alert">
                      If a verified student sees no exam, check that the exam is published, set to Offline/Hybrid, assigned to the student class/section/department, scheduled for the right time, and that the student is not blocked by the fee access rule used when the package was generated.
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="offline-title">{student ? student.name : "Student exams"}</h2>
                    {student && <p className="offline-sub">{student.reg_no} - {student.class || "Class not set"}</p>}
                    <div className="offline-list">
                      {!student ? <p className="offline-sub mb-0">Enter your admission number to load your available exams.</p> : exams.length === 0 ? (
                        <p className="offline-sub mb-0">No exam is available for this student. Please call the invigilator.</p>
                      ) : exams.map((exam) => (
                        <article className="offline-card" key={exam.id}>
                          <h3 className="offline-title">{exam.title}</h3>
                          <p className="offline-sub">{exam.subject?.name || "Subject"} - {exam.class?.name || student.class || "Class"} - {exam.duration_minutes} minutes</p>
                          <div className="offline-meta">
                            <span className="offline-pill">{exam.questions_count || 0} question(s)</span>
                            <span className="offline-pill">{exam.is_open ? "Open now" : "Not scheduled now"}</span>
                            {exam.calculator_enabled && <span className="offline-pill">Calculator allowed</span>}
                            {exam.submitted && <span className="offline-pill">Submitted</span>}
                          </div>
                          <button className="offline-btn" type="button" disabled={busy || !exam.is_open || exam.submitted} onClick={() => setPendingExam(exam)}>
                            {exam.submitted ? "Submitted" : "Start Exam"}
                          </button>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </section>
            </section>
          )}

          {examPaper && attempt && activeQuestion && (
            <section className="offline-paper">
              <div className="offline-paper-head">
                <div>
                  <h2 className="offline-title">{examPaper.title}</h2>
                  <p className="offline-sub mb-0">{student?.name} - Question {activeIndex + 1} of {questions.length}</p>
                  <div className="offline-meta">
                    <span className="offline-pill">{student?.reg_no || "Admission no"}</span>
                    <span className="offline-pill">{examPaper.subject?.name || "Subject"}</span>
                    <span className="offline-pill">{examPaper.class?.name || student?.class || "Class"}</span>
                  </div>
                </div>
                <div className="offline-actions">
                  <span className="offline-pill">{answeredCount}/{questions.length} answered</span>
                  {securityViolations > 0 && <span className="offline-pill offline-pill-danger">{securityViolations}/{maxSecurityViolations} warning(s)</span>}
                  <div className={`offline-timer ${(remainingSeconds ?? 9999) <= 300 ? "danger" : ""}`}>
                    <span>Time left</span>
                    <strong>{remainingSeconds === null ? "--:--" : formatTime(remainingSeconds)}</strong>
                  </div>
                  {examPaper.calculator_enabled && <button className="offline-btn offline-btn-soft" type="button" onClick={() => setCalculatorOpen((value) => !value)}>Calculator</button>}
                  <button className="offline-btn offline-btn-soft" type="button" disabled={busy} onClick={() => setExamPaper(null)}>Pause</button>
                  <button className="offline-btn" type="button" disabled={busy} onClick={() => submitExam()}>Submit</button>
                </div>
              </div>

              <div className="offline-body">
                <div className="offline-nav">
                  <div className="offline-label">Questions</div>
                  <div className="offline-nav-grid">
                    {questions.map((question, index) => {
                      const answer = answers[question.id];
                      const done = Boolean((answer?.selected_option_ids || []).length || answer?.answer_text?.trim());
                      return (
                        <button
                          key={question.id}
                          type="button"
                          className={`offline-qnav ${index === activeIndex ? "active" : ""} ${done ? "done" : ""}`}
                          onClick={() => setActiveIndex(index)}
                          title={done ? `Question ${index + 1} answered` : `Question ${index + 1} unanswered`}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>
                  <p className="offline-sub mt-2 mb-0">Green numbers are answered. Dark number is your current question.</p>
                </div>

                <div className="offline-content">
                  <div className="offline-shortcuts">
                    <strong>Shortcuts:</strong> A-F choose option, arrow keys move between questions, S opens submit confirmation, Enter confirms submission.
                  </div>
                  {securityWarning && <div className="offline-alert offline-danger">{securityWarning}</div>}
                  {examPaper.general_instructions && <div className="offline-alert">{examPaper.general_instructions}</div>}

                  {activeGroup && (
                    <div className="offline-group">
                      <span className="offline-pill">{activeGroup.group_type || "Passage"}</span>
                      <h3 className="offline-title">{activeGroup.title || "Read and answer"}</h3>
                      {activeGroup.instructions && <CbtHtml html={activeGroup.instructions} />}
                      {activeGroup.passage && <CbtHtml html={activeGroup.passage} />}
                    </div>
                  )}

                  <div className="offline-meta">
                    <span className="offline-pill">Question {activeIndex + 1}</span>
                    <span className="offline-pill">{activeQuestion.marks || 1} mark(s)</span>
                  </div>
                  <CbtHtml html={activeQuestion.question_text} />
                  {activeQuestion.instructions && <CbtHtml html={activeQuestion.instructions} />}

                  {["single_choice", "multiple_choice", "true_false"].includes(activeQuestion.question_type) ? (
                    activeOptions.map((option, index) => (
                      <label className="offline-option" key={option.id}>
                        <input
                          type={activeQuestion.question_type === "multiple_choice" ? "checkbox" : "radio"}
                          name={`question-${activeQuestion.id}`}
                          checked={(answers[activeQuestion.id]?.selected_option_ids || []).includes(option.id)}
                          onChange={(e) => chooseOption(option.id, e.target.checked)}
                        />
                        <strong>{String.fromCharCode(65 + index)}.</strong>
                        <CbtHtml html={option.option_text} />
                      </label>
                    ))
                  ) : (
                    <textarea className="offline-textarea" value={answers[activeQuestion.id]?.answer_text || ""} onChange={(e) => writeAnswer(e.target.value)} placeholder="Type your answer here." />
                  )}

                  <div className="offline-actions">
                    <button className="offline-btn offline-btn-soft" disabled={activeIndex === 0 || busy} type="button" onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}>Previous</button>
                    {activeIndex >= questions.length - 1 ? (
                      <button className="offline-btn" type="button" disabled={busy} onClick={() => submitExam()}>Submit Exam</button>
                    ) : (
                      <button className="offline-btn" type="button" disabled={busy} onClick={() => setActiveIndex((index) => Math.min(questions.length - 1, index + 1))}>Next</button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {calculatorOpen && examPaper?.calculator_enabled && (
            <div className="offline-calc">
              <input value={calcValue} onChange={(e) => setCalcValue(e.target.value)} placeholder="0" />
              <div className="offline-calc-grid">
                {scientificButtons.map((button) => <button key={button} type="button" onClick={() => pressCalc(button)}>{button}</button>)}
                <button type="button" onClick={() => setCalcValue((value) => value.slice(0, -1))}>DEL</button>
                <button type="button" onClick={calculate}>=</button>
              </div>
            </div>
          )}

          {pendingExam && (
            <div className="offline-confirm" role="dialog" aria-modal="true">
              <div className="offline-confirm-card">
                <span className="offline-pill">Exam instructions</span>
                <h2 className="offline-title mt-2">{pendingExam.title}</h2>
                <p className="offline-sub">
                  Read these rules carefully before starting. Your timer begins immediately after you click Start Exam.
                </p>
                <ul className="offline-rules">
                  <li>Stay on this exam window until you submit.</li>
                  <li>The exam will open in fullscreen mode where your browser supports it.</li>
                  <li>Copy, paste, right-click, print, save, and developer shortcuts are not allowed.</li>
                  <li>If you leave the exam window or exit fullscreen, the action will be recorded.</li>
                  <li>After {maxSecurityViolations} warning(s), the exam may be submitted automatically.</li>
                  <li>Use A, B, C, D, E, or F to choose answers, arrow keys to move questions, S to submit, and Enter to confirm.</li>
                </ul>
                <div className="offline-actions">
                  <button className="offline-btn offline-btn-soft" type="button" disabled={busy} onClick={() => setPendingExam(null)}>Cancel</button>
                  <button className="offline-btn" type="button" disabled={busy} onClick={() => startExam(pendingExam)}>{busy ? "Starting..." : "I Understand, Start Exam"}</button>
                </div>
              </div>
            </div>
          )}

          {confirmingSubmit && examPaper && (
            <div className="offline-confirm" role="dialog" aria-modal="true">
              <div className="offline-confirm-card">
                <h2 className="offline-title">Submit exam?</h2>
                <p className="offline-sub">You have answered {answeredCount} of {questions.length} question(s). Press Enter or click Submit Exam to finish.</p>
                <div className="offline-actions">
                  <button className="offline-btn offline-btn-soft" type="button" disabled={busy} onClick={() => setConfirmingSubmit(false)}>Continue Exam</button>
                  <button className="offline-btn" type="button" disabled={busy} onClick={() => submitExam(true)}>{busy ? "Submitting..." : "Submit Exam"}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
