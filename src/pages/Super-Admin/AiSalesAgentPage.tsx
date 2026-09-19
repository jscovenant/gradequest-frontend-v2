import React, { useState, useEffect, useRef } from "react";
import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import PageTitle from "../../components/PageTitle";
import Loader from "../../components/ui/dashboardLoader";
import { authApi } from "../../utils/axios";
import { useToast } from "../../contexts/ToastContext";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export default function AiSalesAgentPage() {
  const { showSuccess, showError, showInfo, showWarning } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"sandbox" | "scanner" | "leads" | "settings">("sandbox");
  const [loading, setLoading] = useState(true);

  // Analytics
  const [analytics, setAnalytics] = useState<any>({
    total_conversations: 0,
    qualified_leads: 0,
    outreach_sent: 0,
    converted_schools: 0,
    conversion_rate_pct: 0,
  });

  // Dynamic Billing Rates from Backend
  const [billingRates, setBillingRates] = useState<any>({
    basic_tier_price_per_student: 150,
    standard_cbt_tier_price_per_student: 250,
    platform_fee_per_student: 150,
    default_bank_charge_amount: 50,
    whatsapp_credit_unit_price: 5,
  });

  // Sandbox state
  const [sessionId, setSessionId] = useState<string>("sandbox_" + Math.random().toString(36).substring(7));
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I am your Senior AI Sales & Growth Consultant for SchoolProfit. I help school owners eliminate unpaid fee debts with automated virtual accounts, generate 1-click broadsheets & report cards, and conduct offline CBT exams at zero cost (₦0.00) to the school. How can I assist your school today?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Inactive scanner state
  const [stagedSchools, setStagedSchools] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [thresholdDays, setThresholdDays] = useState<number>(14);

  // Leads & Conversations state
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any>(null);

  // Settings state
  const [config, setConfig] = useState<any>({
    openai_api_key: "",
    model: "gpt-4o-mini",
    temperature: 0.7,
    agent_name: "Sarah - SchoolProfit Growth Consultant",
    custom_instructions: "",
    inactivity_threshold_days: 14,
    auto_scan_enabled: true,
    whatsapp_outreach_enabled: true,
    max_daily_outreach: 50,
    support_whatsapp_number: "+2348000000000",
    demo_booking_url: "https://schoolprofit.ng/book-demo",
    signup_url: "https://schoolprofit.ng/onboarding",
    pricing_url: "https://schoolprofit.ng/school-plans",
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Analytics
      try {
        const analyticsRes = await authApi.get("/super-admin/ai-sales-agent/analytics");
        if (analyticsRes.data.status) {
          setAnalytics(analyticsRes.data.analytics);
        }
      } catch (e) {
        console.warn("Analytics fetch note:", e);
      }

      // 2. Fetch Config & Dynamic Billing Rates
      try {
        const configRes = await authApi.get("/super-admin/ai-sales-agent/config");
        if (configRes.data.status) {
          setConfig(configRes.data.config || {});
          if (configRes.data.billing_rates) {
            setBillingRates(configRes.data.billing_rates);
          }
        }
      } catch (e) {
        console.warn("Config fetch note:", e);
      }

      // 3. Fetch Inactive Schools
      try {
        const scannerRes = await authApi.get("/super-admin/ai-sales-agent/inactive-schools");
        if (scannerRes.data.status) {
          setStagedSchools(scannerRes.data.staged_schools || []);
          setRecentLogs(scannerRes.data.recent_logs || []);
        }
      } catch (e) {
        console.warn("Scanner fetch note:", e);
      }

      // 4. Fetch Conversations
      try {
        const convRes = await authApi.get("/super-admin/ai-sales-agent/conversations");
        if (convRes.data.status) {
          setConversations(convRes.data.conversations?.data || []);
        }
      } catch (e) {
        console.warn("Conversations fetch note:", e);
      }
    } catch (err: any) {
      console.error("Error loading AI sales agent data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Send message in Sandbox
  const handleSendMessage = async (customPrompt?: string) => {
    const text = customPrompt || inputMessage.trim();
    if (!text || sendingMessage) return;

    const userMsg: Message = { role: "user", content: text, timestamp: new Date().toISOString() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    if (!customPrompt) setInputMessage("");
    setSendingMessage(true);

    try {
      const res = await authApi.post("/super-admin/ai-sales-agent/chat", {
        session_id: sessionId,
        messages: updatedMessages,
        channel: "web_sandbox",
      });

      if (res.data.status) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: res.data.reply,
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        showError(res.data.message || "Failed to get AI response");
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Error communicating with AI Sales Agent";
      showError(errMsg);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleResetChat = () => {
    setSessionId("sandbox_" + Math.random().toString(36).substring(7));
    setMessages([
      {
        role: "assistant",
        content:
          "Hello! I am your Senior AI Sales & Growth Consultant for SchoolProfit. I help school owners eliminate unpaid fee debts with automated virtual accounts, generate 1-click broadsheets & report cards, and conduct offline CBT exams at zero cost (₦0.00) to the school. How can I assist your school today?",
        timestamp: new Date().toISOString(),
      },
    ]);
    showInfo("Started a fresh sandbox conversation session.");
  };

  const renderFormattedMessage = (text: string) => {
    if (!text) return null;

    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];

    const parseInline = (lineText: string, keyPrefix: string) => {
      const parts: React.ReactNode[] = [];
      const regex = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(lineText)) !== null) {
        if (match.index > lastIndex) {
          parts.push(lineText.substring(lastIndex, match.index));
        }

        if (match[1]) {
          const label = match[2];
          const url = match[3];
          parts.push(
            <a
              key={`${keyPrefix}-link-${match.index}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="fw-bold"
              style={{ color: "#2563EB", textDecoration: "underline" }}
            >
              {label}
            </a>
          );
        } else if (match[4]) {
          const boldText = match[5];
          parts.push(
            <strong key={`${keyPrefix}-b-${match.index}`} style={{ fontWeight: 700, color: "#0F2744" }}>
              {boldText}
            </strong>
          );
        }
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < lineText.length) {
        parts.push(lineText.substring(lastIndex));
      }

      return parts.length > 0 ? parts : lineText;
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (!trimmed) {
        elements.push(<div key={`sp-${index}`} style={{ height: 6 }} />);
        return;
      }

      // Heading 3: ###
      if (trimmed.startsWith("### ")) {
        const headingText = trimmed.replace(/^###\s+/, "");
        elements.push(
          <div
            key={`h3-${index}`}
            className="fw-bold mt-2 mb-1"
            style={{ fontSize: 14, color: "#0F2744", borderLeft: "3px solid #F59E0B", paddingLeft: 6 }}
          >
            {parseInline(headingText, `h3-${index}`)}
          </div>
        );
        return;
      }

      // Heading 2: ##
      if (trimmed.startsWith("## ")) {
        const headingText = trimmed.replace(/^##\s+/, "");
        elements.push(
          <div
            key={`h2-${index}`}
            className="fw-bold mt-2 mb-1"
            style={{ fontSize: 14.5, color: "#0F2744", borderLeft: "3px solid #D97706", paddingLeft: 6 }}
          >
            {parseInline(headingText, `h2-${index}`)}
          </div>
        );
        return;
      }

      // Heading 1: #
      if (trimmed.startsWith("# ")) {
        const headingText = trimmed.replace(/^#\s+/, "");
        elements.push(
          <div
            key={`h1-${index}`}
            className="fw-bold mt-2 mb-1"
            style={{ fontSize: 15, color: "#0F2744", borderLeft: "4px solid #D97706", paddingLeft: 6 }}
          >
            {parseInline(headingText, `h1-${index}`)}
          </div>
        );
        return;
      }

      // Bullet points: • or - or *
      if (trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const bulletContent = trimmed.replace(/^[•\-\*]\s+/, "");
        elements.push(
          <div
            key={`b-${index}`}
            className="d-flex align-items-start gap-1.5 ms-1 my-0.5"
            style={{ fontSize: 13.5, lineHeight: 1.5 }}
          >
            <span style={{ color: "#D97706", fontWeight: "bold", marginRight: 4 }}>•</span>
            <div style={{ flex: 1 }}>{parseInline(bulletContent, `b-${index}`)}</div>
          </div>
        );
        return;
      }

      // Numbered items: 1. 2.
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        const num = numMatch[1];
        const numContent = numMatch[2];
        elements.push(
          <div
            key={`num-${index}`}
            className="d-flex align-items-start gap-1.5 ms-1 my-0.5"
            style={{ fontSize: 13.5, lineHeight: 1.5 }}
          >
            <span className="fw-bold" style={{ color: "#0F2744", minWidth: 16 }}>{num}.</span>
            <div style={{ flex: 1 }}>{parseInline(numContent, `num-${index}`)}</div>
          </div>
        );
        return;
      }

      // Regular paragraph line
      elements.push(
        <div key={`p-${index}`} style={{ lineHeight: 1.55 }}>
          {parseInline(line, `p-${index}`)}
        </div>
      );
    });

    return <>{elements}</>;
  };

  // Trigger Scanner
  const handleRunInactivityScan = async () => {
    setScanning(true);
    try {
      const res = await authApi.get(`/super-admin/ai-sales-agent/inactive-schools?threshold_days=${thresholdDays}`);
      if (res.data.status) {
        setStagedSchools(res.data.staged_schools || []);
        setRecentLogs(res.data.recent_logs || []);
        showSuccess(`Scan complete! Found ${res.data.staged_count || 0} dormant school(s) ready for outreach.`);
      }
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to scan inactive schools");
    } finally {
      setScanning(false);
    }
  };

  // Dispatch WhatsApp link
  const handleDispatchWhatsApp = async (logId: number, whatsappUrl: string) => {
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    try {
      await authApi.post("/super-admin/ai-sales-agent/outreach-dispatch", {
        log_id: logId,
        status: "sent",
      });
      setStagedSchools((prev) => prev.filter((item) => item.log_id !== logId));
      showSuccess("Outreach logged as sent! WhatsApp chat window opened.");
    } catch (err: any) {
      console.error("Failed to update outreach log status:", err);
    }
  };

  // Mark status of log
  const handleMarkStatus = async (logId: number, status: string) => {
    try {
      const res = await authApi.post("/super-admin/ai-sales-agent/outreach-dispatch", {
        log_id: logId,
        status: status,
      });
      if (res.data.status) {
        setRecentLogs((prev) =>
          prev.map((log) => (log.id === logId ? { ...log, status: status } : log))
        );
        showSuccess(`Marked as ${status}`);
      }
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to update status");
    }
  };

  // Save Settings
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await authApi.post("/super-admin/ai-sales-agent/config", config);
      if (res.data.status) {
        setConfig(res.data.config);
        showSuccess("AI Sales Agent settings saved successfully!");
      }
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to save configuration");
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <>
      <style>{`
        .db-main { background: #F8FAFC; min-height: 100vh; padding: 24px 28px 60px; }
        .db-hero {
          background: linear-gradient(135deg, #0F2744 0%, #173860 60%, #1E4678 100%);
          border-radius: 20px; padding: 28px 32px; margin-bottom: 24px;
          position: relative; overflow: hidden; color: #fff;
          box-shadow: 0 8px 32px rgba(15,39,68,0.18);
        }
        .db-hero-glow {
          position: absolute; right: -40px; top: -40px; width: 260px; height: 260px;
          border-radius: 50%; background: radial-gradient(circle, rgba(217,119,6,0.22) 0%, transparent 70%);
          pointer-events: none;
        }
        .db-hero-glow2 {
          position: absolute; left: 30%; bottom: -60px; width: 220px; height: 220px;
          border-radius: 50%; background: radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .db-hero-inner { position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }
        .db-session-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.18);
          border-radius: 20px; padding: 4px 12px; font-size: 11.5px; font-weight: 600;
          color: #E2E8F0; margin-bottom: 10px;
        }
        .db-session-dot { width: 6px; height: 6px; border-radius: 50%; background: #10B981; }
        .db-greeting { font-size: 24px; font-weight: 800; color: #fff; line-height: 1.2; margin-bottom: 6px; }
        .db-greeting em { font-style: normal; color: #FBBF24; }
        .db-hero-sub { font-size: 13px; color: #CBD5E1; line-height: 1.5; max-width: 640px; margin-bottom: 16px; }
        
        .db-panel { background: #fff; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(15,39,68,0.03); margin-bottom: 24px; }
        .db-panel-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 22px; border-bottom: 1px solid #F1F5F9; gap: 12px; flex-wrap: wrap; background: #FFFFFF; }
        .db-panel-title { font-size: 15.5px; font-weight: 700; color: #0F2744; margin: 0; display: flex; align-items: center; gap: 8px; }
        .db-panel-sub { font-size: 12px; font-weight: 400; color: #64748B; margin: 2px 0 0; }
        
        .db-tabs-bar { display: flex; gap: 6px; border-bottom: 2px solid #E2E8F0; margin-bottom: 22px; overflow-x: auto; padding-bottom: 2px; }
        .db-tab-item { padding: 9px 18px; font-size: 13.5px; font-weight: 700; color: #64748B; border: none; background: transparent; border-bottom: 3px solid transparent; cursor: pointer; transition: all 0.2s; white-space: nowrap; display: flex; align-items: center; gap: 6px; }
        .db-tab-item.active { color: #0F2744; border-bottom-color: #D97706; background: rgba(217, 119, 6, 0.05); border-radius: 8px 8px 0 0; }
        .db-tab-item:hover { color: #0F2744; }

        .stat-card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .stat-box { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 16px 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
        .stat-box-val { font-size: 22px; font-weight: 800; color: #0F2744; margin-top: 4px; }
        .stat-box-label { font-size: 11.5px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.04em; }

        .chat-bubble { padding: 12px 16px; border-radius: 14px; max-width: 84%; font-size: 13.5px; line-height: 1.55; white-space: pre-wrap; word-break: break-word; }
        .chat-user { background: #0F2744; color: #fff; margin-left: auto; border-bottom-right-radius: 2px; }
        .chat-assistant { background: #F1F5F9; color: #0F172A; border-bottom-left-radius: 2px; border: 1px solid #E2E8F0; }

        .prompt-chip { background: #FFFDF8; border: 1px solid #FDE68A; color: #92400E; font-size: 11.5px; font-weight: 600; border-radius: 100px; padding: 6px 14px; cursor: pointer; transition: all 0.2s; }
        .prompt-chip:hover { background: #FEF3C7; transform: translateY(-1px); }

        .rate-badge-card {
          background: linear-gradient(135deg, #F8FAFC 0%, #EEF2F6 100%);
          border: 1px solid #CBD5E1;
          border-radius: 12px;
          padding: 12px 16px;
        }

        @media (max-width: 991.98px) { .db-main { padding: 18px 14px 60px; } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="AI Sales & Growth Agent (OpenAI)" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loading && <Loader message="Loading AI Sales Agent..." />}

            {/* HERO */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Autonomous Sales &amp; Growth Consultant
                  </div>

                  <h1 className="db-greeting">
                    AI Sales &amp; <em>Growth Agent</em>
                  </h1>

                  <p className="db-hero-sub">
                    24/7 Senior AI Growth Consultant that pitches SchoolProfit’s vision, handles objections, guides demo bookers, explains the zero-cost parent payment model, and automatically re-engages dormant school owners via WhatsApp.
                  </p>

                  <div className="d-flex gap-2 flex-wrap">
                    <button className="btn btn-warning btn-sm fw-bold px-3 text-dark" onClick={() => setActiveTab("sandbox")}>
                      <i className="bi bi-chat-dots-fill me-1"></i> Open Live Sandbox
                    </button>
                    <button className="btn btn-outline-light btn-sm fw-bold" onClick={() => setActiveTab("scanner")}>
                      <i className="bi bi-search me-1"></i> Inactive Schools Scanner
                    </button>
                    <button className="btn btn-outline-light btn-sm fw-bold" onClick={() => setActiveTab("settings")}>
                      <i className="bi bi-gear-fill me-1"></i> OpenAI Directives &amp; Pricing
                    </button>
                  </div>
                </div>

                <div className="db-hero-stat-card d-none d-lg-block" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 14, padding: "16px 20px", minWidth: 280 }}>
                  <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom border-white border-opacity-10">
                    <img
                      src="/images/sarah_advisor.jpg"
                      alt="Sarah"
                      style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid #F59E0B" }}
                    />
                    <div>
                      <div className="fw-bold text-white" style={{ fontSize: 13.5, lineHeight: 1.2 }}>Sarah</div>
                      <div className="text-warning" style={{ fontSize: 11, fontWeight: 600 }}>Lead Growth Consultant</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#FBBF24", marginBottom: 8 }}>
                    Live Dynamic Rates
                  </div>
                  <div className="d-flex flex-column gap-2 text-white">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-white-50">Basic Package (Results/Core):</span>
                      <span className="badge bg-warning bg-opacity-25 text-warning font-monospace">₦{billingRates.basic_tier_price_per_student}/std/term</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-white-50">Full Package (with CBT):</span>
                      <span className="badge bg-info bg-opacity-25 text-info font-monospace">₦{billingRates.standard_cbt_tier_price_per_student}/std/term</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-white-50">Parent Pass-Through:</span>
                      <span className="badge bg-success bg-opacity-25 text-white">₦0.00 School Cost</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-white-50">AI Model:</span>
                      <span className="badge bg-secondary bg-opacity-50 text-white font-monospace">{config.model || "gpt-4o-mini"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* KPI STATS */}
            <div className="stat-card-grid">
              <div className="stat-box">
                <div className="stat-box-label">Total Conversations</div>
                <div className="stat-box-val">{analytics.total_conversations || 0}</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">Qualified Leads</div>
                <div className="stat-box-val text-primary">{analytics.qualified_leads || 0}</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">Dormant Schools Found</div>
                <div className="stat-box-val text-danger">{stagedSchools.length || 0}</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">WhatsApp Outreach Sent</div>
                <div className="stat-box-val text-success">{analytics.outreach_sent || recentLogs.length || 0}</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">Conversion Rate</div>
                <div className="stat-box-val text-warning">{analytics.conversion_rate_pct || 0}%</div>
              </div>
            </div>

            {/* NAVIGATION TABS */}
            <div className="db-tabs-bar">
              <button
                className={`db-tab-item ${activeTab === "sandbox" ? "active" : ""}`}
                onClick={() => setActiveTab("sandbox")}
              >
                <i className="bi bi-cpu"></i>
                1. AI Sales Agent Live Sandbox
              </button>
              <button
                className={`db-tab-item ${activeTab === "scanner" ? "active" : ""}`}
                onClick={() => setActiveTab("scanner")}
              >
                <i className="bi bi-whatsapp"></i>
                2. Inactive Schools Scanner &amp; WhatsApp Outreach ({stagedSchools.length})
              </button>
              <button
                className={`db-tab-item ${activeTab === "leads" ? "active" : ""}`}
                onClick={() => setActiveTab("leads")}
              >
                <i className="bi bi-people"></i>
                3. Qualified Leads &amp; Pipeline ({conversations.length})
              </button>
              <button
                className={`db-tab-item ${activeTab === "settings" ? "active" : ""}`}
                onClick={() => setActiveTab("settings")}
              >
                <i className="bi bi-sliders"></i>
                4. OpenAI API &amp; Sales Directives
              </button>
            </div>

            {/* ══════════════════════════════════════════════════════════ */}
            {/* TAB 1: LIVE INTERACTIVE SALES SANDBOX */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeTab === "sandbox" && (
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <h4 className="db-panel-title">
                      <i className="bi bi-chat-heart text-warning"></i> AI Sales Consultant Test Sandbox
                    </h4>
                    <p className="db-panel-sub">Simulate prospective school owners pitching, handling pricing questions, zero-cost options, and demo preparation.</p>
                  </div>
                  <button className="btn btn-outline-dark btn-sm fw-bold" onClick={handleResetChat}>
                    <i className="bi bi-arrow-repeat me-1"></i> New Session
                  </button>
                </div>

                <div className="p-4">
                  {/* Dynamic Pricing Info Ribbon */}
                  <div className="rate-badge-card mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-info-circle-fill text-primary"></i>
                      <span className="small text-dark fw-bold">Live Billing Rates Injected into AI Prompt:</span>
                    </div>
                    <div className="d-flex align-items-center gap-3 small">
                      <span><strong>Basic Package:</strong> ₦{billingRates.basic_tier_price_per_student}/std</span>
                      <span><strong>Full CBT Package:</strong> ₦{billingRates.standard_cbt_tier_price_per_student}/std</span>
                      <span className="text-success fw-bold"><strong>Zero School Cost:</strong> Active</span>
                    </div>
                  </div>

                  {/* Preset prompt chips */}
                  <div className="mb-3">
                    <span className="small text-muted fw-bold me-2">Quick Test Scenarios:</span>
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      <button
                        type="button"
                        className="prompt-chip border-0"
                        onClick={() =>
                          handleSendMessage(
                            "How is your pricing plan and what is included in each edition?"
                          )
                        }
                      >
                        💰 How is your pricing plan?
                      </button>
                      <button
                        type="button"
                        className="prompt-chip border-0"
                        onClick={() =>
                          handleSendMessage(
                            "I am a school proprietor with 350 students. How can I use SchoolProfit at zero cost (₦0.00) by letting parents pay the platform fee during tuition payment?"
                          )
                        }
                      >
                        💡 Zero Cost (₦0.00) to School &amp; Fee Recovery
                      </button>
                      <button
                        type="button"
                        className="prompt-chip border-0"
                        onClick={() =>
                          handleSendMessage(
                            "How does 1-click broadsheet compilation and WAEC-standard report card generation work?"
                          )
                        }
                      >
                        📊 1-Click Broadsheets &amp; Report Cards
                      </button>
                      <button
                        type="button"
                        className="prompt-chip border-0"
                        onClick={() =>
                          handleSendMessage(
                            "Can we conduct CBT mock and term exams in our computer lab without internet?"
                          )
                        }
                      >
                        💻 Offline CBT Examination Engine
                      </button>
                      <button
                        type="button"
                        className="prompt-chip border-0"
                        onClick={() =>
                          handleSendMessage(
                            "How does SchoolProfit eliminate unpaid school fee debts using parent virtual accounts?"
                          )
                        }
                      >
                        📱 Stop School Fee Debts
                      </button>
                      <button
                        type="button"
                        className="prompt-chip border-0"
                        onClick={() =>
                          handleSendMessage(
                            "I just booked a demo session at https://schoolprofit.ng/book-demo for tomorrow. What should our bursar and academic head prepare for the walkthrough?"
                          )
                        }
                      >
                        📅 Demo Meeting Next Steps &amp; Checklist
                      </button>
                    </div>
                  </div>

                  {/* Chat message stream */}
                  <div
                    className="p-3 border rounded-3 bg-white mb-3 d-flex flex-column gap-3"
                    style={{ minHeight: 380, maxHeight: 480, overflowY: "auto" }}
                  >
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`chat-bubble ${msg.role === "user" ? "chat-user" : "chat-assistant"}`}
                      >
                        <div className="d-flex align-items-center justify-content-between gap-3 mb-1" style={{ fontSize: 11, opacity: 0.8 }}>
                          <div className="d-flex align-items-center gap-1.5">
                            {msg.role === "assistant" && (
                              <img
                                src="/images/sarah_advisor.jpg"
                                alt="Sarah"
                                style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover" }}
                              />
                            )}
                            <strong>{msg.role === "user" ? "School Owner (Prospect)" : config.agent_name || "Sarah - AI Sales Consultant"}</strong>
                          </div>
                          <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</span>
                        </div>
                        <div>{msg.role === "assistant" ? renderFormattedMessage(msg.content) : msg.content}</div>
                      </div>
                    ))}
                    {sendingMessage && (
                      <div className="chat-bubble chat-assistant d-flex align-items-center gap-2">
                        <div className="spinner-border spinner-border-sm text-warning" role="status" />
                        <span className="small text-muted">AI Sales Consultant is analyzing and crafting persuasive response...</span>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Chat Input Bar */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="d-flex gap-2"
                  >
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      placeholder="Type a school owner question or objection (e.g. 'Can I get a custom website for my school?')..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      disabled={sendingMessage}
                    />
                    <button type="submit" className="btn btn-warning px-4 fw-bold text-dark text-nowrap" disabled={sendingMessage || !inputMessage.trim()}>
                      <i className="bi bi-send-fill me-1"></i> Send
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* TAB 2: INACTIVE SCHOOLS SCANNER & WHATSAPP OUTREACH */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeTab === "scanner" && (
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <h4 className="db-panel-title">
                      <i className="bi bi-whatsapp text-success"></i> Inactive Schools Detector &amp; WhatsApp Outreach
                    </h4>
                    <p className="db-panel-sub">Scan database for dormant school accounts and dispatch high-converting personalized AI WhatsApp messages.</p>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <select
                      className="form-select form-select-sm"
                      value={thresholdDays}
                      onChange={(e) => setThresholdDays(Number(e.target.value))}
                      style={{ width: 170 }}
                    >
                      <option value={7}>Inactive &gt; 7 Days</option>
                      <option value={14}>Inactive &gt; 14 Days</option>
                      <option value={21}>Inactive &gt; 21 Days</option>
                      <option value={30}>Inactive &gt; 30 Days</option>
                    </select>

                    <button
                      type="button"
                      className="btn btn-warning btn-sm fw-bold text-dark px-3"
                      onClick={handleRunInactivityScan}
                      disabled={scanning}
                    >
                      <i className="bi bi-search me-1"></i>
                      {scanning ? "Scanning Database..." : "Scan Inactive Schools"}
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  <h6 className="fw-bold text-dark mb-3">
                    Dormant Accounts Pending Outreach ({stagedSchools.length}):
                  </h6>

                  {stagedSchools.length === 0 ? (
                    <div className="p-4 text-center border rounded-3 bg-light text-muted">
                      <i className="bi bi-shield-check text-success fs-1"></i>
                      <p className="mt-2 mb-0 fw-semibold">No pending dormant schools found matching the {thresholdDays}-day inactivity threshold.</p>
                      <small>All active schools are either uploading students, collecting fees, or received recent outreach.</small>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light small">
                          <tr>
                            <th>School &amp; Contact</th>
                            <th>Phone / WhatsApp</th>
                            <th>Inactivity Reason</th>
                            <th>AI-Generated WhatsApp Copy</th>
                            <th className="text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stagedSchools.map((item, idx) => (
                            <tr key={idx}>
                              <td>
                                <div className="fw-bold text-dark">{item.school_name}</div>
                                <div className="text-muted small">{item.contact_person || "Proprietor / Admin"}</div>
                              </td>
                              <td>
                                <span className="badge bg-light text-dark border font-monospace">
                                  {item.phone_number}
                                </span>
                              </td>
                              <td>
                                {item.inactivity_reason === "0_students_uploaded" ? (
                                  <span className="badge bg-warning text-dark">0 Students Uploaded</span>
                                ) : (
                                  <span className="badge bg-danger">No Login &gt; {thresholdDays} Days</span>
                                )}
                              </td>
                              <td style={{ maxWidth: 360 }}>
                                <div className="small text-muted p-2 bg-light border rounded-2" style={{ maxHeight: 90, overflowY: "auto" }}>
                                  {item.message}
                                </div>
                              </td>
                              <td className="text-end">
                                <button
                                  type="button"
                                  className="btn btn-success btn-sm fw-bold text-nowrap"
                                  onClick={() => handleDispatchWhatsApp(item.log_id, item.whatsapp_url)}
                                >
                                  <i className="bi bi-whatsapp me-1"></i> Send on WhatsApp
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {recentLogs.length > 0 && (
                    <div className="mt-5">
                      <h6 className="fw-bold text-dark mb-3">Recent WhatsApp Outreach History:</h6>
                      <div className="table-responsive">
                        <table className="table table-sm table-hover align-middle">
                          <thead className="table-light small">
                            <tr>
                              <th>Date</th>
                              <th>School Name</th>
                              <th>Contact Phone</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentLogs.slice(0, 15).map((log) => (
                              <tr key={log.id}>
                                <td className="small text-muted">{new Date(log.created_at).toLocaleDateString()}</td>
                                <td className="fw-bold small">{log.school_name}</td>
                                <td className="font-monospace small">{log.phone_number}</td>
                                <td>
                                  {log.status === "converted" ? (
                                    <span className="badge bg-success">Converted ✓</span>
                                  ) : log.status === "replied" ? (
                                    <span className="badge bg-info text-dark">Replied</span>
                                  ) : log.status === "sent" ? (
                                    <span className="badge bg-primary">Sent</span>
                                  ) : (
                                    <span className="badge bg-secondary">Staged</span>
                                  )}
                                </td>
                                <td>
                                  <div className="d-flex gap-1">
                                    <button
                                      className="btn btn-outline-success btn-sm py-0 px-2 small"
                                      onClick={() => handleMarkStatus(log.id, "converted")}
                                    >
                                      Mark Won
                                    </button>
                                    <button
                                      className="btn btn-outline-info btn-sm py-0 px-2 small"
                                      onClick={() => handleMarkStatus(log.id, "replied")}
                                    >
                                      Replied
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* TAB 3: QUALIFIED LEADS & CONVERSATION LOGS */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeTab === "leads" && (
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <h4 className="db-panel-title">
                      <i className="bi bi-people text-primary"></i> Prospect Conversations &amp; Lead Pipeline
                    </h4>
                    <p className="db-panel-sub">All inbound interactions handled by the AI Sales Consultant with extracted school data.</p>
                  </div>
                </div>

                <div className="p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light small">
                        <tr>
                          <th className="ps-4">Prospect / School</th>
                          <th>Channel</th>
                          <th>Phone / Email</th>
                          <th>Messages</th>
                          <th>Lead Stage</th>
                          <th>Last Interaction</th>
                          <th className="pe-4 text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conversations.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-5 text-muted">
                              <i className="bi bi-inbox fs-2"></i>
                              <p className="mt-2 mb-0">No conversations logged yet. Test the agent in the Live Sandbox!</p>
                            </td>
                          </tr>
                        ) : (
                          conversations.map((conv) => (
                            <tr key={conv.id}>
                              <td className="ps-4">
                                <div className="fw-bold text-dark">{conv.school_name || conv.prospect_name || "Prospective School"}</div>
                                <div className="text-muted small">{conv.prospect_name || "Web Visitor"}</div>
                              </td>
                              <td>
                                <span className="badge bg-light text-dark border">{conv.channel}</span>
                              </td>
                              <td>
                                <div className="small font-monospace">{conv.phone_number || "—"}</div>
                                <div className="small text-muted">{conv.email || ""}</div>
                              </td>
                              <td>
                                <span className="badge bg-secondary bg-opacity-25 text-dark">{conv.message_count || 0} msgs</span>
                              </td>
                              <td>
                                {conv.lead_status === "qualified" ? (
                                  <span className="badge bg-success">Qualified Lead</span>
                                ) : conv.lead_status === "demo_booked" ? (
                                  <span className="badge bg-info text-dark">Demo Booked</span>
                                ) : (
                                  <span className="badge bg-secondary">Inquiry</span>
                                )}
                              </td>
                              <td className="small text-muted">
                                {conv.last_interaction_at ? new Date(conv.last_interaction_at).toLocaleString() : "—"}
                              </td>
                              <td className="pe-4 text-end">
                                <button
                                  type="button"
                                  className="btn btn-outline-dark btn-sm fw-bold"
                                  onClick={() => setSelectedConv(conv)}
                                >
                                  <i className="bi bi-eye me-1"></i> View Thread
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* TAB 4: OPENAI CONFIGURATION & SALES DIRECTIVES */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeTab === "settings" && (
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <h4 className="db-panel-title">
                      <i className="bi bi-sliders text-warning"></i> OpenAI API &amp; Sales Agent Directives
                    </h4>
                    <p className="db-panel-sub">Configure your OpenAI API credentials, model choice, and custom pitch directives.</p>
                  </div>
                </div>

                <form onSubmit={handleSaveConfig} className="p-4">
                  <div className="row g-4">
                    {/* Live Platform Billing Info Box */}
                    <div className="col-12">
                      <div className="p-3 border rounded-3 bg-light d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div>
                          <div className="fw-bold text-dark small">
                            <i className="bi bi-check-circle-fill text-success me-1"></i>
                            Dynamic Platform Pricing (Synced from Backend Billing Policy)
                          </div>
                          <div className="text-muted small">
                            The AI agent automatically pitches: Basic Package (₦{billingRates.basic_tier_price_per_student}/std), Full CBT Package (₦{billingRates.standard_cbt_tier_price_per_student}/std), and the Zero-Cost (₦0.00) parent payment option. No subscription packages are referenced.
                          </div>
                        </div>
                        <a href="/super-admin/billing-policy" className="btn btn-outline-primary btn-sm fw-bold text-nowrap">
                          <i className="bi bi-cash-stack me-1"></i> Edit Billing Policy
                        </a>
                      </div>
                    </div>

                    {/* OpenAI API Key */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-bold small text-dark">
                        OpenAI API Key (uses your OpenAI credits): <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <input
                          type={showApiKey ? "text" : "password"}
                          className="form-control font-monospace"
                          placeholder="sk-proj-..."
                          value={config.openai_api_key || ""}
                          onChange={(e) => setConfig((p: any) => ({ ...p, openai_api_key: e.target.value }))}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          <i className={`bi ${showApiKey ? "bi-eye-slash" : "bi-eye"}`}></i>
                        </button>
                      </div>
                      <span className="text-muted small">Your OpenAI API key is stored securely and used exclusively for sales conversations and re-engagement generation.</span>
                    </div>

                    {/* Model Selector */}
                    <div className="col-12 col-md-3">
                      <label className="form-label fw-bold small text-dark">OpenAI Model:</label>
                      <select
                        className="form-select"
                        value={config.model || "gpt-4o-mini"}
                        onChange={(e) => setConfig((p: any) => ({ ...p, model: e.target.value }))}
                      >
                        <option value="gpt-4o-mini">gpt-4o-mini (Fast &amp; Cost Efficient ★)</option>
                        <option value="gpt-4o">gpt-4o (Most Intelligent &amp; Persuasive)</option>
                        <option value="gpt-3.5-turbo">gpt-3.5-turbo (Legacy Standard)</option>
                      </select>
                    </div>

                    {/* Temperature */}
                    <div className="col-12 col-md-3">
                      <label className="form-label fw-bold small text-dark">Creativity / Temperature ({config.temperature}):</label>
                      <input
                        type="range"
                        className="form-range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={config.temperature || 0.7}
                        onChange={(e) => setConfig((p: any) => ({ ...p, temperature: parseFloat(e.target.value) }))}
                      />
                    </div>

                    {/* Agent Name */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-bold small text-dark">AI Sales Agent Display Name:</label>
                      <input
                        type="text"
                        className="form-control"
                        value={config.agent_name || ""}
                        onChange={(e) => setConfig((p: any) => ({ ...p, agent_name: e.target.value }))}
                        placeholder="e.g. Sarah - Senior Growth Consultant"
                      />
                    </div>

                    {/* Inactivity Threshold */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-bold small text-dark">Dormancy Threshold (Days before outreach):</label>
                      <input
                        type="number"
                        className="form-control"
                        min={3}
                        max={90}
                        value={config.inactivity_threshold_days || 14}
                        onChange={(e) => setConfig((p: any) => ({ ...p, inactivity_threshold_days: Number(e.target.value) }))}
                      />
                    </div>

                    {/* Demo Booking URL */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-bold small text-dark">Live Demo / Onboarding Booking URL:</label>
                      <input
                        type="text"
                        className="form-control"
                        value={config.demo_booking_url || "https://schoolprofit.ng/book-demo"}
                        onChange={(e) => setConfig((p: any) => ({ ...p, demo_booking_url: e.target.value }))}
                        placeholder="https://schoolprofit.ng/book-demo"
                      />
                      <span className="text-muted small">Where cold prospects are directed to book their personalized demo session.</span>
                    </div>

                    {/* Support WhatsApp */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-bold small text-dark">Growth &amp; Support WhatsApp Number:</label>
                      <input
                        type="text"
                        className="form-control"
                        value={config.support_whatsapp_number || "+2348000000000"}
                        onChange={(e) => setConfig((p: any) => ({ ...p, support_whatsapp_number: e.target.value }))}
                        placeholder="+2348000000000"
                      />
                    </div>

                    {/* Custom Directives */}
                    <div className="col-12">
                      <label className="form-label fw-bold small text-dark">Custom Sales Guidelines &amp; Promo Directives:</label>
                      <textarea
                        rows={4}
                        className="form-control"
                        value={config.custom_instructions || ""}
                        onChange={(e) => setConfig((p: any) => ({ ...p, custom_instructions: e.target.value }))}
                        placeholder="e.g. Emphasize our back-to-school promotion where schools get free student roster Excel upload and dedicated onboarding..."
                      />
                    </div>

                    <div className="col-12">
                      <button type="submit" className="btn btn-warning fw-bold px-4 text-dark" disabled={savingConfig}>
                        <i className="bi bi-check2-circle me-1"></i>
                        {savingConfig ? "Saving Configuration..." : "Save AI Sales Agent Settings"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Conversation Thread Modal */}
            {selectedConv && (
              <div className="modal d-block" style={{ backgroundColor: "rgba(15,39,68,0.7)", backdropFilter: "blur(4px)", zIndex: 1050 }}>
                <div className="modal-dialog modal-lg modal-dialog-centered">
                  <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                    <div className="modal-header bg-dark text-white p-3 px-4">
                      <h5 className="modal-title fw-bold fs-6">
                        <i className="bi bi-chat-left-text-fill me-2 text-warning"></i>
                        Conversation History: {selectedConv.school_name || selectedConv.prospect_name || "Prospect"}
                      </h5>
                      <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedConv(null)}></button>
                    </div>

                    <div className="modal-body p-4 bg-light" style={{ maxHeight: 450, overflowY: "auto" }}>
                      <div className="d-flex flex-column gap-3">
                        {(selectedConv.messages || []).map((msg: any, i: number) => (
                          <div
                            key={i}
                            className={`chat-bubble ${msg.role === "user" ? "chat-user" : "chat-assistant"}`}
                          >
                            <div className="small fw-bold mb-1 opacity-75">{msg.role === "user" ? "Prospect" : config.agent_name || "AI Sales Consultant"}</div>
                            <div>{msg.content}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="modal-footer p-3 bg-white">
                      <button type="button" className="btn btn-secondary btn-sm fw-bold" onClick={() => setSelectedConv(null)}>
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
      <Footer />
    </>
  );
}
