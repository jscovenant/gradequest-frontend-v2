import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { publicApi } from "../utils/axios";
import { usePlatformInfo } from "../hooks/usePlatformInfo";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export default function AiSalesChatWidget() {
  const { formattedBasicPrice, formattedStandardCbtPrice, basicTierPrice, standardCbtTierPrice, whatsappNumber } = usePlatformInfo();
  const basicPrice = formattedBasicPrice || `₦${basicTierPrice || 300}`;
  const cbtPrice = formattedStandardCbtPrice || `₦${standardCbtTierPrice || 500}`;

  const [isOpen, setIsOpen] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);
  const [showNotificationBubble, setShowNotificationBubble] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  
  // Agent Config & Rates
  const [agentInfo, setAgentInfo] = useState({
    agent_name: "Sarah - SchoolProfit Growth Consultant",
    demo_booking_url: "/book-demo",
    support_whatsapp_number: whatsappNumber || "+2348165748374",
    rates: {
      basic_tier_price_per_student: basicTierPrice || 300,
      standard_cbt_tier_price_per_student: standardCbtTierPrice || 500,
    },
  });

  // Session ID & Messages
  const [sessionId, setSessionId] = useState<string>(() => {
    const saved = sessionStorage.getItem("sp_sales_session_id");
    if (saved) return saved;
    const fresh = "prospect_" + Math.random().toString(36).substring(2, 11);
    sessionStorage.setItem("sp_sales_session_id", fresh);
    return fresh;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = sessionStorage.getItem("sp_sales_messages");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [
      {
        role: "assistant",
        content:
          "Hello! 👋 I am Sarah, your Lead Growth Advisor at SchoolProfit.\n\nI can help explain how our platform **eliminates unpaid school fee debts** with automated parent accounts, compiles **1-click broadsheets**, and runs **offline CBT exams** at **zero cost (₦0.00)** to your school.\n\nHow can I help your school today?",
        timestamp: new Date().toISOString(),
      },
    ];
  });

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Sync messages to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem("sp_sales_messages", JSON.stringify(messages));
    } catch (e) {
      // ignore
    }
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Keep rates and contact synced with usePlatformInfo
  useEffect(() => {
    setAgentInfo((prev) => ({
      ...prev,
      support_whatsapp_number: whatsappNumber || prev.support_whatsapp_number,
      rates: {
        basic_tier_price_per_student: basicTierPrice || prev.rates.basic_tier_price_per_student,
        standard_cbt_tier_price_per_student: standardCbtTierPrice || prev.rates.standard_cbt_tier_price_per_student,
      },
    }));
  }, [whatsappNumber, basicTierPrice, standardCbtTierPrice]);

  // Fetch agent public info
  useEffect(() => {
    publicApi
      .get("/public/ai-sales-agent/info")
      .then((res) => {
        if (res.data?.status) {
          setAgentInfo((prev) => ({
            ...prev,
            agent_name: res.data.agent_name || prev.agent_name,
            demo_booking_url: res.data.demo_booking_url || prev.demo_booking_url,
            support_whatsapp_number: res.data.support_whatsapp_number || prev.support_whatsapp_number,
            rates: res.data.rates || prev.rates,
          }));
        }
      })
      .catch(() => {
        // Fallback info remains active
      });
  }, []);

  // Trigger floating callout teaser after 4s
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen && !hasPrompted) {
        setShowNotificationBubble(true);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [isOpen, hasPrompted]);

  const handleSendMessage = async (customText?: string) => {
    const text = customText || inputMessage.trim();
    if (!text || sendingMessage) return;

    setShowNotificationBubble(false);
    setHasPrompted(true);

    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    if (!customText) setInputMessage("");
    setSendingMessage(true);

    try {
      const res = await publicApi.post("/public/ai-sales-agent/chat", {
        session_id: sessionId,
        messages: updated,
        channel: "website_floating_widget",
      });

      if (res.data?.status && res.data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: res.data.reply,
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        const lower = text.toLowerCase();
        let fallbackAnswer = "";
        if (lower.match(/pricing|price|cost|how much|package|edition|tier|rate|fee|charge|bill|plan|300|500/)) {
          fallbackAnswer = `SchoolProfit operates on a transparent, purely per-student fee model with **₦0 upfront software license fees** and two flexible editions:\n\n1. **Basic Result Edition (${basicPrice} per student / term)**:\n   • 1-Click Automated Broadsheets & WAEC/NECO format Report Cards\n   • Automated Grading, Cumulative Averages & AI Teacher Remarks\n   • Dedicated Student Virtual Accounts for direct tuition collections\n   • Complete Bursary Accounting & Defaulter Tracking\n\n2. **Standard CBT & AI Edition (${cbtPrice} per student / term)**:\n   • **Everything in the Basic Package** +\n   • Full Offline & Online Computer-Based Testing (CBT) Examination suite\n   • Automated WhatsApp Broadsheet & Report Card Delivery to Parents\n   • AI Lesson Plan & Scheme of Work Generators\n\n💡 **Zero-Cost Advantage (₦0.00 Expense to School)**:\nYour school can pass this small platform fee to parents on their termly fee payment invoices, meaning the platform costs your school **₦0.00** from your pocket!\n\n📅 Would you like to schedule a 15-minute live screen walkthrough for your school? You can book at [schoolprofit.ng/book-demo](/book-demo) or message our growth desk on WhatsApp (${agentInfo.support_whatsapp_number})!`;
        } else {
          fallbackAnswer = "Thank you for reaching out! You can book a direct 15-minute onboarding walkthrough with our team at [schoolprofit.ng/book-demo](/book-demo) or message our WhatsApp desk: " + agentInfo.support_whatsapp_number;
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: fallbackAnswer,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (err: any) {
      console.warn("AI Sales chat request error, activating dynamic response:", err);
      const lower = text.toLowerCase();
      let smartAnswer = "";

      if (lower.match(/pricing|price|cost|how much|package|edition|tier|rate|fee|charge|bill|plan|300|500/)) {
        smartAnswer = `SchoolProfit operates on a transparent, purely per-student fee model with **₦0 upfront software license fees** and two flexible editions:\n\n1. **Basic Result Edition (${basicPrice} per student / term)**:\n   • 1-Click Automated Broadsheets & WAEC/NECO format Report Cards\n   • Automated Grading, Cumulative Averages & AI Teacher Remarks\n   • Dedicated Student Virtual Accounts for direct tuition collections\n   • Complete Bursary Accounting & Defaulter Tracking\n\n2. **Standard CBT & AI Edition (${cbtPrice} per student / term)**:\n   • **Everything in the Basic Package** +\n   • Full Offline & Online Computer-Based Testing (CBT) Examination suite\n   • Automated WhatsApp Broadsheet & Report Card Delivery to Parents\n   • AI Lesson Plan & Scheme of Work Generators\n\n💡 **Zero-Cost Advantage (₦0.00 Expense to School)**:\nYour school can pass this small platform fee to parents on their termly fee payment invoices, meaning the platform costs your school **₦0.00** from your pocket!\n\n📅 Would you like to schedule a 15-minute live screen walkthrough for your school? You can book at [schoolprofit.ng/book-demo](/book-demo) or message our growth desk on WhatsApp (${agentInfo.support_whatsapp_number})!`;
      } else if (lower.match(/zero|0\.00|parent|pass|recover|free/)) {
        smartAnswer = `With SchoolProfit's **Zero-Cost (₦0.00) Model**, your school pays nothing out-of-pocket for full digital portal management:\n\n• **How It Works**: Every enrolled student receives a dedicated Wema Bank Virtual Account. When parents pay termly tuition fees, the small platform fee (${basicPrice} Basic or ${cbtPrice} Full CBT) is added to the parent's invoice.\n• **Instant Settlement**: 100% of your tuition fees settle directly into your school bank account with automated digital payment receipts sent to parents on WhatsApp.\n• **Alternative Option**: You can also choose to absorb the fee by having it automatically deducted from school fee collections upon settlement.\n\nWould you like to see how this works in a live 15-minute demo? Book here: [schoolprofit.ng/book-demo](/book-demo)!`;
      } else if (lower.match(/broadsheet|report|result|card|grade|waec|domain/)) {
        smartAnswer = `SchoolProfit completely eliminates manual report card errors and broadsheet calculation stress:\n\n• **1-Click Generation**: Teachers enter Continuous Assessment (CA) and exam scores once, and the system instantly compiles 100% accurate master broadsheets.\n• **WAEC/NECO Standard**: Beautiful, printable PDF report cards with student photos, grading keys, class positions, and automated AI teacher remarks.\n• **Pricing**: Only **${basicPrice}/student/term** for Basic or **${cbtPrice}/student/term** for Full CBT & AI delivery.\n\nReady to eliminate end-of-term stress? Book an onboarding session at [schoolprofit.ng/book-demo](/book-demo)!`;
      } else if (lower.match(/cbt|exam|offline|test|mock|question/)) {
        smartAnswer = `Our **Full CBT & AI Edition (${cbtPrice}/student/term)** brings state-of-the-art testing to your school:\n\n• **Offline-First Engine**: Conduct Computer-Based Tests in your lab with **zero internet reliance** during exam sessions.\n• **Instant Auto-Grading**: Real-time scoring and student performance analytics.\n• **AI Question Generator**: Generate curriculum-compliant exam questions and lesson plans in seconds.\n\nLet us set up a test CBT simulation for your school. Book a demo at [schoolprofit.ng/book-demo](/book-demo)!`;
      } else if (lower.match(/demo|onboard|start|book|signup|sign up|meeting|checklist|prepare/)) {
        smartAnswer = `Getting started with SchoolProfit is fast and personalized:\n\n1. **Book a Walkthrough**: Schedule a 15-minute live screen demo at [schoolprofit.ng/book-demo](/book-demo).\n2. **What to Prepare**:\n   • Estimated student count and class list.\n   • Current tuition fee structure.\n   • Invite your Bursar or Academic Coordinator to join.\n3. **Free Data Migration**: Our onboarding team will import your student roster and configure your school portal for free!\n\nFeel free to message our support desk directly on WhatsApp: ${agentInfo.support_whatsapp_number}!`;
      } else {
        smartAnswer = `Hello! I am Sarah, your Senior Growth Advisor at SchoolProfit.\n\nWe help Nigerian private schools **eliminate unpaid fee debts**, generate **1-click error-free broadsheets**, and run **offline CBT exams** at **zero cost (₦0.00)** to the school:\n\n• **Basic Result Edition**: ${basicPrice} per student / term\n• **Standard CBT & AI Edition**: ${cbtPrice} per student / term\n• **Zero School Cost Option**: Pass the small per-student fee to parents during tuition payments!\n\nHow can I help your school today? You can also book a live walkthrough at [schoolprofit.ng/book-demo](/book-demo) or chat with us on WhatsApp (${agentInfo.support_whatsapp_number}).`;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: smartAnswer,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleReset = () => {
    const freshSession = "prospect_" + Math.random().toString(36).substring(2, 11);
    setSessionId(freshSession);
    sessionStorage.setItem("sp_sales_session_id", freshSession);
    const initial: ChatMessage[] = [
      {
        role: "assistant",
        content:
          "Hello! 👋 I am Sarah, your AI Growth Consultant at SchoolProfit.\n\nAsk me anything about eliminating fee debts, automated broadsheets, or our zero-cost per-student model!",
        timestamp: new Date().toISOString(),
      },
    ];
    setMessages(initial);
    sessionStorage.setItem("sp_sales_messages", JSON.stringify(initial));
  };

  return (
    <>
      <style>{`
        .sp-ai-widget-container {
          position: fixed;
          bottom: 24px;
          left: 24px;
          z-index: 9999;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .sp-ai-trigger-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          background: linear-gradient(135deg, #0F2744 0%, #173860 60%, #1E4678 100%);
          color: #FFFFFF;
          border: 2px solid #F59E0B;
          border-radius: 999px;
          padding: 8px 18px 8px 8px;
          box-shadow: 0 10px 25px -3px rgba(15, 39, 68, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .sp-ai-trigger-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 14px 30px -4px rgba(245, 158, 11, 0.35);
          border-color: #FBBF24;
        }

        .sp-ai-avatar-wrap {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 2px solid #F59E0B;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          overflow: visible;
          flex-shrink: 0;
        }

        .sp-ai-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
          display: block;
        }

        .sp-ai-online-dot {
          position: absolute;
          bottom: 1px;
          right: 1px;
          width: 11px;
          height: 11px;
          background: #10B981;
          border: 2px solid #0F2744;
          border-radius: 50%;
        }

        .sp-ai-trigger-text {
          display: flex;
          flex-direction: column;
          text-align: left;
        }

        .sp-ai-trigger-title {
          font-size: 13.5px;
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.2;
        }

        .sp-ai-trigger-sub {
          font-size: 11px;
          color: #FDE68A;
          font-weight: 600;
        }

        /* Teaser Notification Bubble */
        .sp-ai-teaser-bubble {
          position: absolute;
          bottom: 70px;
          left: 0;
          background: #FFFFFF;
          color: #0F172A;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 12px 16px;
          width: 290px;
          box-shadow: 0 12px 30px rgba(15, 39, 68, 0.18);
          font-size: 12.5px;
          line-height: 1.45;
          animation: spSlideUp 0.3s ease-out forwards;
        }

        .sp-ai-teaser-bubble::after {
          content: "";
          position: absolute;
          bottom: -8px;
          left: 24px;
          width: 14px;
          height: 14px;
          background: #FFFFFF;
          border-right: 1px solid #E2E8F0;
          border-bottom: 1px solid #E2E8F0;
          transform: rotate(45deg);
        }

        /* Chat Modal Panel */
        .sp-ai-chat-window {
          position: fixed;
          bottom: 24px;
          left: 24px;
          width: 395px;
          max-width: calc(100vw - 32px);
          height: 620px;
          max-height: calc(100vh - 48px);
          background: #FFFFFF;
          border-radius: 20px;
          box-shadow: 0 20px 40px -8px rgba(15, 39, 68, 0.35), 0 0 0 1px rgba(15, 39, 68, 0.08);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 10000;
          animation: spPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .sp-ai-chat-header {
          background: linear-gradient(135deg, #0F2744 0%, #173860 60%, #1E4678 100%);
          padding: 14px 18px;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .sp-ai-chat-body {
          flex: 1;
          background: #F8FAFC;
          padding: 14px 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .sp-ai-msg-bubble {
          padding: 10px 14px;
          border-radius: 14px;
          max-width: 86%;
          font-size: 13px;
          line-height: 1.55;
          word-break: break-word;
          white-space: pre-wrap;
        }

        .sp-ai-msg-assistant {
          background: #FFFFFF;
          color: #0F172A;
          border-bottom-left-radius: 4px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }

        .sp-ai-msg-user {
          background: #0F2744;
          color: #FFFFFF;
          align-self: flex-end;
          border-bottom-right-radius: 4px;
        }

        .sp-ai-chip {
          background: #FFFBEB;
          border: 1px solid #FDE68A;
          color: #92400E;
          font-size: 11px;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 99px;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .sp-ai-chip:hover {
          background: #FEF3C7;
          border-color: #F59E0B;
        }

        .sp-ai-chat-footer {
          padding: 12px 14px;
          background: #FFFFFF;
          border-top: 1px solid #F1F5F9;
        }

        .sp-ai-input-wrap {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .sp-ai-input {
          flex: 1;
          border: 1px solid #CBD5E1;
          border-radius: 12px;
          padding: 9px 14px;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s;
        }

        .sp-ai-input:focus {
          border-color: #2563EB;
        }

        .sp-ai-send-btn {
          background: #F59E0B;
          color: #0F2744;
          border: none;
          border-radius: 12px;
          padding: 9px 14px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sp-ai-send-btn:hover:not(:disabled) {
          background: #D97706;
          color: #FFFFFF;
        }

        .sp-ai-send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .sp-ai-banner-strip {
          background: #EFF6FF;
          border-bottom: 1px solid #DBEAFE;
          padding: 6px 12px;
          font-size: 11px;
          color: #1E40AF;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        @keyframes spPopIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes spSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 480px) {
          .sp-ai-widget-container { bottom: 16px; left: 16px; }
          .sp-ai-chat-window { bottom: 12px; left: 12px; width: calc(100vw - 24px); height: calc(100vh - 24px); }
        }
      `}</style>

      {/* FLOATING TRIGGER BUTTON & CALLOUT */}
      {!isOpen && (
        <div className="sp-ai-widget-container">
          {showNotificationBubble && (
            <div className="sp-ai-teaser-bubble">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <div className="d-flex align-items-center gap-1">
                  <img
                    src="/images/sarah_advisor.jpg"
                    alt="Sarah"
                    style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }}
                  />
                  <span className="fw-bold" style={{ color: "#D97706", fontSize: 11.5 }}>
                    Sarah • Senior Growth Advisor
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotificationBubble(false)}
                  style={{ border: "none", background: "transparent", color: "#94A3B8", cursor: "pointer", padding: 0 }}
                >
                  ✕
                </button>
              </div>
              <p className="m-0" style={{ color: "#334155" }}>
                Eliminate unpaid fees &amp; generate broadsheets in 1 click at <strong>₦0.00 cost</strong>. Have questions? Chat with me!
              </p>
            </div>
          )}

          <button
            type="button"
            className="sp-ai-trigger-btn"
            onClick={() => {
              setIsOpen(true);
              setShowNotificationBubble(false);
              setHasPrompted(true);
            }}
            aria-label="Chat with Sarah - AI Growth Advisor"
          >
            <div className="sp-ai-avatar-wrap">
              <img
                src="/images/sarah_advisor.jpg"
                alt="Sarah"
                className="sp-ai-avatar-img"
              />
              <span className="sp-ai-online-dot" />
            </div>
            <div className="sp-ai-trigger-text">
              <span className="sp-ai-trigger-title">Chat with Sarah</span>
              <span className="sp-ai-trigger-sub">AI Growth Advisor • ₦0 Setup</span>
            </div>
          </button>
        </div>
      )}

      {/* EXPANDED INTERACTIVE CHAT WINDOW */}
      {isOpen && (
        <div className="sp-ai-chat-window">
          {/* Header */}
          <div className="sp-ai-chat-header">
            <div className="d-flex align-items-center gap-2">
              <div className="sp-ai-avatar-wrap" style={{ width: 40, height: 40 }}>
                <img
                  src="/images/sarah_advisor.jpg"
                  alt="Sarah"
                  className="sp-ai-avatar-img"
                />
                <span className="sp-ai-online-dot" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.2 }}>
                  Sarah
                </div>
                <div style={{ fontSize: 11, color: "#93C5FD", fontWeight: 500 }}>
                  Senior Growth Advisor • Online
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-1">
              <button
                type="button"
                onClick={handleReset}
                title="Restart conversation"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "none",
                  borderRadius: 6,
                  color: "#FFFFFF",
                  padding: "4px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ↻ New
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Minimize chat"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "none",
                  borderRadius: 6,
                  color: "#FFFFFF",
                  padding: "4px 8px",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Pricing Ribbon */}
          <div className="sp-ai-banner-strip">
            <span>✨ Zero-Cost (₦0.00) School Option</span>
            <Link
              to="/book-demo"
              onClick={() => setIsOpen(false)}
              style={{ color: "#1D4ED8", textDecoration: "underline", fontSize: 11 }}
            >
              Book 15-Min Demo →
            </Link>
          </div>

          {/* Preset Prompts Carousel */}
          <div className="px-3 pt-2 pb-1 bg-white border-bottom d-flex gap-1 overflow-auto" style={{ scrollbarWidth: "none" }}>
            <button
              type="button"
              className="sp-ai-chip"
              onClick={() =>
                handleSendMessage(
                  "How does the zero-cost (₦0.00) parent payment option work?"
                )
              }
            >
              💡 ₦0 School Cost
            </button>
            <button
              type="button"
              className="sp-ai-chip"
              onClick={() =>
                handleSendMessage(
                  `What is included in the Basic (${basicPrice}) vs Full CBT (${cbtPrice}) Package?`
                )
              }
            >
              📊 Basic ({basicPrice}) vs Full CBT ({cbtPrice})
            </button>
            <button
              type="button"
              className="sp-ai-chip"
              onClick={() =>
                handleSendMessage(
                  "How do we get started and book our onboarding session?"
                )
              }
            >
              📅 How to Onboard
            </button>
          </div>

          {/* Chat Messages */}
          <div className="sp-ai-chat-body">
            {messages.map((m, idx) => (
              <React.Fragment key={idx}>
                {m.role === "assistant" ? (
                  <div className="d-flex gap-2 align-items-start">
                    <img
                      src="/images/sarah_advisor.jpg"
                      alt="Sarah"
                      style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0, marginTop: 2 }}
                    />
                    <div className="sp-ai-msg-bubble sp-ai-msg-assistant">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div className="sp-ai-msg-bubble sp-ai-msg-user">
                    {m.content}
                  </div>
                )}
              </React.Fragment>
            ))}

            {sendingMessage && (
              <div className="d-flex gap-2 align-items-center">
                <img
                  src="/images/sarah_advisor.jpg"
                  alt="Sarah"
                  style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                />
                <div className="sp-ai-msg-bubble sp-ai-msg-assistant d-flex align-items-center gap-2">
                  <span className="spinner-grow spinner-grow-sm text-warning" role="status" />
                  <span className="small text-muted">Sarah is typing...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input & CTA */}
          <div className="sp-ai-chat-footer">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="sp-ai-input-wrap"
            >
              <input
                type="text"
                className="sp-ai-input"
                placeholder="Ask Sarah about pricing, broadsheets, CBT..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={sendingMessage}
              />
              <button
                type="submit"
                className="sp-ai-send-btn"
                disabled={sendingMessage || !inputMessage.trim()}
              >
                Send
              </button>
            </form>

            <div className="d-flex justify-content-between align-items-center mt-2 pt-1 border-top" style={{ fontSize: 11 }}>
              <span className="text-muted">Sarah • SchoolProfit AI</span>
              <Link
                to="/book-demo"
                onClick={() => setIsOpen(false)}
                className="fw-bold"
                style={{ color: "#D97706", textDecoration: "none" }}
              >
                📅 Book Full Demo Walkthrough
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
