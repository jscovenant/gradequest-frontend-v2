import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getUser, logout } from "../../utils/token";

interface QuickActionItem {
  label: string;
  subtitle: string;
  icon: string;
  href: string;
  color: string;
  bg: string;
  badge?: string;
}

interface NavTabItem {
  label: string;
  icon: string;
  activeIcon: string;
  href: string;
  matchPrefixes?: string[];
}

export default function MobileAppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [canInstallPwa, setCanInstallPwa] = useState<boolean>(() => Boolean((window as any).__deferredPwaPrompt));
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("sp_mobile_banner_dismissed") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const checkStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);

    const onPwaAvailable = () => {
      setCanInstallPwa(Boolean((window as any).__deferredPwaPrompt));
    };

    window.addEventListener("pwa-install-available", onPwaAvailable);
    return () => window.removeEventListener("pwa-install-available", onPwaAvailable);
  }, []);

  // Close sheet on route change
  useEffect(() => {
    setSheetOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const rawRole = (user.role || "").toLowerCase().trim();
  const normRole = (user.normalized_role || user.role || "")
    .toLowerCase()
    .replace(/[\s-]/g, "_");

  const isOwnerOrAdmin =
    ["admin", "proprietor", "owner", "school_admin", "principal", "headteacher", "head_teacher", "operator", "registrar", "secretary"].includes(normRole) ||
    ["admin", "proprietor", "owner", "school-admin", "principal", "headteacher", "operator"].includes(rawRole);

  const isTeacher =
    ["teacher", "class_teacher", "subject_teacher", "staff"].includes(normRole) ||
    ["teacher", "class-teacher", "subject-teacher", "staff"].includes(rawRole);

  const isParent =
    ["parent", "guardian"].includes(normRole) ||
    ["parent", "guardian"].includes(rawRole);

  const isBursar =
    ["bursar", "accountant"].includes(normRole) ||
    ["bursar", "accountant"].includes(rawRole);

  const isInvestor =
    ["investor", "strategic_partner", "partner"].includes(normRole) ||
    ["investor", "strategic_partner", "partner"].includes(rawRole);

  const isSuperAdmin =
    ["super_admin", "superadmin", "platform_staff", "platformstaff"].includes(normRole) ||
    ["super-admin", "superadmin", "platform-staff"].includes(rawRole);

  // Role label for the command sheet
  const roleBadgeLabel = isOwnerOrAdmin
    ? "School Owner & Executive Console"
    : isTeacher
    ? "Teacher Classroom Companion"
    : isParent
    ? "Parent & Family Portal"
    : isBursar
    ? "Bursary & Finance Desk"
    : isInvestor
    ? "Strategic Partner Portal"
    : isSuperAdmin
    ? "HQ Command Center"
    : "SchoolProfit Mobile";

  // 4 Primary Tabs (2 left of center orb, 2 right of center orb)
  const getTabs = (): [NavTabItem, NavTabItem, NavTabItem, NavTabItem] => {
    if (isTeacher) {
      return [
        {
          label: "Pocket Hub",
          icon: "bi-grid-1x2",
          activeIcon: "bi-grid-1x2-fill",
          href: "/mobile-app",
          matchPrefixes: ["/mobile-app"],
        },
        {
          label: "Score Pad",
          icon: "bi-file-earmark-spreadsheet",
          activeIcon: "bi-file-earmark-spreadsheet-fill",
          href: "/results/add-v2",
          matchPrefixes: ["/results/add-v2", "/results/upload", "/results"],
        },
        {
          label: "AI Planner",
          icon: "bi-stars",
          activeIcon: "bi-stars",
          href: "/ai/lesson-planner",
          matchPrefixes: ["/ai/lesson-planner"],
        },
        {
          label: "QR Clock-In",
          icon: "bi-qr-code-scan",
          activeIcon: "bi-qr-code-scan",
          href: "/staff/qr-attendance",
          matchPrefixes: ["/staff/qr-attendance", "/students/attendance"],
        },
      ];
    }

    if (isParent) {
      return [
        {
          label: "Pocket Hub",
          icon: "bi-house-heart",
          activeIcon: "bi-house-heart-fill",
          href: "/mobile-app",
          matchPrefixes: ["/mobile-app"],
        },
        {
          label: "Pay Fees",
          icon: "bi-credit-card-2-front",
          activeIcon: "bi-credit-card-2-front-fill",
          href: "/parent/children",
          matchPrefixes: ["/parent/children", "/parent/fees"],
        },
        {
          label: "Report Card",
          icon: "bi-award",
          activeIcon: "bi-award-fill",
          href: "/parent/results",
          matchPrefixes: ["/parent/results"],
        },
        {
          label: "Alerts",
          icon: "bi-bell",
          activeIcon: "bi-bell-fill",
          href: "/invoice-notifications",
          matchPrefixes: ["/invoice-notifications", "/notifications"],
        },
      ];
    }

    if (isBursar) {
      return [
        {
          label: "Pocket Hub",
          icon: "bi-grid-1x2",
          activeIcon: "bi-grid-1x2-fill",
          href: "/mobile-app",
          matchPrefixes: ["/mobile-app"],
        },
        {
          label: "Collections",
          icon: "bi-cash-stack",
          activeIcon: "bi-cash-stack",
          href: "/fees/report",
          matchPrefixes: ["/fees/report", "/financial-records"],
        },
        {
          label: "Receipts",
          icon: "bi-patch-check",
          activeIcon: "bi-patch-check-fill",
          href: "/bursar/receipts/approval",
          matchPrefixes: ["/bursar/receipts/approval"],
        },
        {
          label: "Dashboard",
          icon: "bi-speedometer2",
          activeIcon: "bi-speedometer2",
          href: "/dashboard",
          matchPrefixes: ["/dashboard"],
        },
      ];
    }

    if (isInvestor) {
      return [
        {
          label: "Portfolio",
          icon: "bi-graph-up-arrow",
          activeIcon: "bi-graph-up-arrow",
          href: "/investor/dashboard",
          matchPrefixes: ["/investor/dashboard"],
        },
        {
          label: "Pocket Hub",
          icon: "bi-grid-1x2",
          activeIcon: "bi-grid-1x2-fill",
          href: "/mobile-app",
          matchPrefixes: ["/mobile-app"],
        },
        {
          label: "Alerts",
          icon: "bi-bell",
          activeIcon: "bi-bell-fill",
          href: "/notifications",
          matchPrefixes: ["/notifications"],
        },
        {
          label: "Profile",
          icon: "bi-person-circle",
          activeIcon: "bi-person-circle",
          href: "/user/profile",
          matchPrefixes: ["/user/profile"],
        },
      ];
    }

    if (isSuperAdmin) {
      return [
        {
          label: "HQ Console",
          icon: "bi-shield-check",
          activeIcon: "bi-shield-fill-check",
          href: "/superadmin/dashboard",
          matchPrefixes: ["/superadmin/dashboard", "/dashboard"],
        },
        {
          label: "Subscribers",
          icon: "bi-buildings",
          activeIcon: "bi-buildings-fill",
          href: "/superadmin/subscribers",
          matchPrefixes: ["/superadmin/subscribers"],
        },
        {
          label: "Investors",
          icon: "bi-cash-coin",
          activeIcon: "bi-cash-coin",
          href: "/superadmin/investors",
          matchPrefixes: ["/superadmin/investors"],
        },
        {
          label: "AI Sales",
          icon: "bi-robot",
          activeIcon: "bi-robot",
          href: "/super-admin/ai-sales-agent",
          matchPrefixes: ["/super-admin/ai-sales-agent"],
        },
      ];
    }

    // Default: School Owner / Proprietor / Admin / Principal
    return [
      {
        label: "CEO Pocket",
        icon: "bi-grid-1x2",
        activeIcon: "bi-grid-1x2-fill",
        href: "/mobile-app",
        matchPrefixes: ["/mobile-app"],
      },
      {
        label: "Fee Pulse",
        icon: "bi-cash-coin",
        activeIcon: "bi-cash-coin",
        href: "/fees/report",
        matchPrefixes: ["/fees/report", "/billing", "/bursar/receipts/approval"],
      },
      {
        label: "Results Hub",
        icon: "bi-bar-chart-line",
        activeIcon: "bi-bar-chart-line-fill",
        href: "/results/hub",
        matchPrefixes: ["/results/hub", "/admin/results/review", "/results"],
      },
      {
        label: "Full View",
        icon: "bi-speedometer2",
        activeIcon: "bi-speedometer2",
        href: "/dashboard",
        matchPrefixes: ["/dashboard"],
      },
    ];
  };

  // Role-specific Quick Actions inside the Center Orb Sheet
  const getQuickActions = (): QuickActionItem[] => {
    if (isTeacher) {
      return [
        {
          label: "Mobile Score-Entry Pad",
          subtitle: "Record CA1, CA2 & Exam scores fast on phone",
          icon: "bi-calculator-fill",
          href: "/mobile-app?tab=scorepad",
          color: "#059669",
          bg: "#ECFDF5",
          badge: "Touch Pad",
        },
        {
          label: "Master Result Sheet (V2)",
          subtitle: "Full class broadsheet & bulk upload",
          icon: "bi-file-earmark-spreadsheet-fill",
          href: "/results/add-v2",
          color: "#0F2744",
          bg: "#EFF6FF",
        },
        {
          label: "Scan QR Attendance",
          subtitle: "Clock in or scan student ID cards",
          icon: "bi-qr-code-scan",
          href: "/staff/qr-attendance",
          color: "#D97706",
          bg: "#FFFBEB",
        },
        {
          label: "Mark Class Attendance",
          subtitle: "Daily roll call for your assigned class",
          icon: "bi-person-check-fill",
          href: "/students/attendance",
          color: "#2563EB",
          bg: "#EFF6FF",
        },
        {
          label: "AI Lesson Note Generator",
          subtitle: "Generate NERDC-aligned lesson notes in seconds",
          icon: "bi-stars",
          href: "/ai/lesson-planner",
          color: "#7C3AED",
          bg: "#F5F3FF",
          badge: "AI Powered",
        },
        {
          label: "CBT Exam Manager",
          subtitle: "Create & monitor computer-based tests",
          icon: "bi-laptop-fill",
          href: "/cbt/exams",
          color: "#0891B2",
          bg: "#ECFEFF",
        },
      ];
    }

    if (isParent) {
      return [
        {
          label: "Family Pocket Wallet",
          subtitle: "Switch wards, check balances & quick summary",
          icon: "bi-wallet2",
          href: "/mobile-app",
          color: "#059669",
          bg: "#ECFDF5",
          badge: "Fast View",
        },
        {
          label: "Pay School Fees",
          subtitle: "Instant payment or upload bank transfer proof",
          icon: "bi-credit-card-2-front-fill",
          href: "/parent/children",
          color: "#0F2744",
          bg: "#EFF6FF",
        },
        {
          label: "Term Report Cards",
          subtitle: "View & download official signed PDF results",
          icon: "bi-file-earmark-pdf-fill",
          href: "/parent/results",
          color: "#D97706",
          bg: "#FFFBEB",
        },
        {
          label: "Fee Invoices & Receipts",
          subtitle: "Verified payment receipts & billing history",
          icon: "bi-receipt-cutoff",
          href: "/invoice-notifications",
          color: "#7C3AED",
          bg: "#F5F3FF",
        },
        {
          label: "School Announcements",
          subtitle: "Important notices & term calendar updates",
          icon: "bi-megaphone-fill",
          href: "/announcements",
          color: "#2563EB",
          bg: "#EFF6FF",
        },
        {
          label: "My Profile & Security",
          subtitle: "Update phone number, email or password",
          icon: "bi-shield-lock-fill",
          href: "/user/profile",
          color: "#475569",
          bg: "#F1F5F9",
        },
      ];
    }

    // Default: School Owner / Proprietor / Admin
    return [
      {
        label: "CEO Pocket Pulse",
        subtitle: "Live revenue, debt recovery & executive KPIs",
        icon: "bi-lightning-charge-fill",
        href: "/mobile-app",
        color: "#059669",
        bg: "#ECFDF5",
        badge: "Executive",
      },
      {
        label: "Approve Fee Receipts",
        subtitle: "Verify parent bank transfers & issue receipts",
        icon: "bi-patch-check-fill",
        href: "/bursar/receipts/approval",
        color: "#D97706",
        bg: "#FFFBEB",
      },
      {
        label: "Review & Publish Results",
        subtitle: "Approve teacher broadsheets & release results",
        icon: "bi-check2-circle",
        href: "/admin/results/review",
        color: "#0F2744",
        bg: "#EFF6FF",
      },
      {
        label: "AI Debt Recovery Assistant",
        subtitle: "Send automated fee reminders to defaulters",
        icon: "bi-whatsapp",
        href: "/bursar/ai-fee-assistant",
        color: "#16A34A",
        bg: "#DCFCE7",
        badge: "AI Recovery",
      },
      {
        label: "Wallet & Student Clearance",
        subtitle: "Fund school wallet & unlock term clearance",
        icon: "bi-wallet2",
        href: "/wallet",
        color: "#7C3AED",
        bg: "#F5F3FF",
      },
      {
        label: "Students & Admissions",
        subtitle: "Search student profiles & online enrollments",
        icon: "bi-people-fill",
        href: "/students",
        color: "#2563EB",
        bg: "#EFF6FF",
      },
    ];
  };

  const tabs = getTabs();
  const quickActions = getQuickActions();

  const isTabActive = (tab: NavTabItem) => {
    if (location.pathname === tab.href) return true;
    if (tab.matchPrefixes) {
      return tab.matchPrefixes.some((p) => location.pathname.startsWith(p));
    }
    return false;
  };

  const handleInstallClick = async () => {
    const promptEvent = (window as any).__deferredPwaPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice?.outcome === "accepted") {
        (window as any).__deferredPwaPrompt = null;
        setCanInstallPwa(false);
      }
    } else {
      setInstallModalOpen(true);
    }
  };

  const dismissBanner = () => {
    setBannerDismissed(true);
    try {
      sessionStorage.setItem("sp_mobile_banner_dismissed", "1");
    } catch {
      // ignore
    }
  };

  const isOnPocketPage = location.pathname.startsWith("/mobile-app");

  return (
    <>
      <style>{`
        /* ── SCHOOLPROFIT NATIVE MOBILE SHELL (20-YR PRINCIPAL UX EDITION) ── */
        @media (max-width: 991.98px) {
          body {
            padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px)) !important;
            -webkit-tap-highlight-color: transparent;
          }
          .db-main, main {
            padding-bottom: calc(92px + env(safe-area-inset-bottom, 0px)) !important;
          }
        }

        .sp-m-top-strip {
          display: none;
        }

        @media (max-width: 991.98px) {
          .sp-m-top-strip {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            background: linear-gradient(90deg, #0A192F 0%, #0F2744 60%, #064E3B 100%);
            color: #FFFFFF;
            padding: 8px 14px;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            position: sticky;
            top: 56px;
            z-index: 1025;
            box-shadow: 0 4px 12px rgba(10, 25, 47, 0.14);
          }
        }

        .sp-m-strip-left {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .sp-m-pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
          flex-shrink: 0;
        }

        .sp-m-strip-text {
          font-size: 12px;
          font-weight: 700;
          color: #F8FAFC;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sp-m-strip-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .sp-m-pill-btn {
          border: none;
          border-radius: 999px;
          padding: 5px 11px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.01em;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          transition: all 0.18s ease;
          white-space: nowrap;
        }

        .sp-m-pill-btn--pocket {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          color: #FFFFFF;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);
        }

        .sp-m-pill-btn--install {
          background: rgba(245, 158, 11, 0.18);
          border: 1px solid rgba(245, 158, 11, 0.5);
          color: #FCD34D;
        }

        .sp-m-strip-close {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          padding: 2px 4px;
          font-size: 14px;
          line-height: 1;
          cursor: pointer;
        }

        /* ── BOTTOM NAVIGATION DOCK ── */
        .sp-m-bottom-dock {
          display: none;
        }

        @media (max-width: 991.98px) {
          .sp-m-bottom-dock {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1045;
            background: rgba(255, 255, 255, 0.94);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border-top: 1px solid rgba(226, 232, 240, 0.95);
            box-shadow: 0 -8px 28px rgba(15, 39, 68, 0.10);
            padding: 6px 8px calc(6px + env(safe-area-inset-bottom, 0px));
            display: grid;
            grid-template-columns: 1fr 1fr 68px 1fr 1fr;
            align-items: center;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          }
        }

        .sp-m-tab {
          background: transparent;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 4px 2px;
          color: #64748B;
          border-radius: 12px;
          position: relative;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
          user-select: none;
        }

        .sp-m-tab:active {
          transform: scale(0.92);
        }

        .sp-m-tab.active {
          color: #0F2744;
        }

        .sp-m-tab-icon-wrap {
          width: 38px;
          height: 26px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          transition: all 0.2s ease;
        }

        .sp-m-tab.active .sp-m-tab-icon-wrap {
          background: rgba(5, 150, 105, 0.12);
          color: #059669;
        }

        .sp-m-tab-label {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: -0.01em;
          line-height: 1.1;
          white-space: nowrap;
        }

        .sp-m-tab.active .sp-m-tab-label {
          color: #0F2744;
          font-weight: 800;
        }

        /* ── CENTER ELEVATED COMMAND ORB ── */
        .sp-m-orb-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          top: -14px;
        }

        .sp-m-orb-btn {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          border: 3px solid #FFFFFF;
          background: linear-gradient(135deg, #0F2744 0%, #059669 100%);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          box-shadow: 0 10px 22px rgba(5, 150, 105, 0.38), 0 0 0 1px rgba(15, 39, 68, 0.08);
          cursor: pointer;
          transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .sp-m-orb-btn:active {
          transform: scale(0.92);
        }

        .sp-m-orb-btn.open {
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
          transform: rotate(45deg);
        }

        .sp-m-orb-label {
          font-size: 10px;
          font-weight: 800;
          color: #0F2744;
          margin-top: 2px;
          letter-spacing: -0.01em;
        }

        /* ── QUICK ACTION BOTTOM SHEET ── */
        .sp-m-sheet-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(10, 25, 47, 0.62);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          z-index: 1055;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          animation: spFadeIn 0.2s ease-out;
        }

        .sp-m-sheet-card {
          width: 100%;
          max-width: 540px;
          max-height: 86vh;
          background: #FFFFFF;
          border-radius: 26px 26px 0 0;
          box-shadow: 0 -18px 45px rgba(10, 25, 47, 0.28);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
          animation: spSlideUp 0.26s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        @keyframes spFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes spSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .sp-m-sheet-handle {
          width: 42px;
          height: 5px;
          border-radius: 999px;
          background: #CBD5E1;
          margin: 10px auto 6px;
          flex-shrink: 0;
        }

        .sp-m-sheet-header {
          padding: 10px 20px 14px;
          border-bottom: 1px solid #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sp-m-sheet-body {
          padding: 16px 18px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .sp-m-action-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .sp-m-action-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 13px 14px;
          border-radius: 16px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          text-align: left;
          width: 100%;
          transition: all 0.18s ease;
          cursor: pointer;
        }

        .sp-m-action-card:active {
          transform: scale(0.98);
          background: #F8FAFC;
        }

        .sp-m-action-icon {
          width: 44px;
          height: 44px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .sp-m-action-content {
          flex: 1;
          min-width: 0;
        }

        .sp-m-action-title {
          font-size: 14px;
          font-weight: 800;
          color: #0F2744;
          margin: 0 0 2px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sp-m-action-sub {
          font-size: 12px;
          color: #64748B;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sp-m-action-badge {
          font-size: 9.5px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 2px 7px;
          border-radius: 999px;
          background: rgba(5, 150, 105, 0.12);
          color: #059669;
          letter-spacing: 0.04em;
        }
      `}</style>

      {/* ── COMPACT MOBILE POCKET BAR (UNDER TOPNAV) ── */}
      {!bannerDismissed && (
        <div className="sp-m-top-strip">
          <div className="sp-m-strip-left">
            <span className="sp-m-pulse-dot" />
            <span className="sp-m-strip-text">
              {isOnPocketPage ? "Pocket App Mode Active" : "Mobile Pocket View Available"}
            </span>
          </div>
          <div className="sp-m-strip-actions">
            {!isOnPocketPage ? (
              <button
                type="button"
                className="sp-m-pill-btn sp-m-pill-btn--pocket"
                onClick={() => navigate("/mobile-app")}
              >
                <i className="bi bi-phone-fill" /> Open Pocket App
              </button>
            ) : (
              <button
                type="button"
                className="sp-m-pill-btn sp-m-pill-btn--pocket"
                onClick={() => navigate("/dashboard")}
              >
                <i className="bi bi-laptop" /> Full Desktop View
              </button>
            )}

            {!isStandalone && (
              <button
                type="button"
                className="sp-m-pill-btn sp-m-pill-btn--install"
                onClick={handleInstallClick}
              >
                <i className="bi bi-download" /> {canInstallPwa ? "Install" : "Get App"}
              </button>
            )}

            <button
              type="button"
              className="sp-m-strip-close"
              onClick={dismissBanner}
              aria-label="Dismiss mobile banner"
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>
        </div>
      )}

      {/* ── NATIVE 5-TAB BOTTOM NAVIGATION BAR ── */}
      <nav className="sp-m-bottom-dock" aria-label="Mobile Primary Navigation">
        {/* Tab 1 */}
        <button
          type="button"
          className={`sp-m-tab ${isTabActive(tabs[0]) ? "active" : ""}`}
          onClick={() => navigate(tabs[0].href)}
        >
          <div className="sp-m-tab-icon-wrap">
            <i className={`bi ${isTabActive(tabs[0]) ? tabs[0].activeIcon : tabs[0].icon}`} />
          </div>
          <span className="sp-m-tab-label">{tabs[0].label}</span>
        </button>

        {/* Tab 2 */}
        <button
          type="button"
          className={`sp-m-tab ${isTabActive(tabs[1]) ? "active" : ""}`}
          onClick={() => navigate(tabs[1].href)}
        >
          <div className="sp-m-tab-icon-wrap">
            <i className={`bi ${isTabActive(tabs[1]) ? tabs[1].activeIcon : tabs[1].icon}`} />
          </div>
          <span className="sp-m-tab-label">{tabs[1].label}</span>
        </button>

        {/* Center Command Orb */}
        <div className="sp-m-orb-wrap">
          <button
            type="button"
            className={`sp-m-orb-btn ${sheetOpen ? "open" : ""}`}
            onClick={() => setSheetOpen((prev) => !prev)}
            aria-label="Open Quick Actions"
          >
            <i className="bi bi-plus-lg" />
          </button>
          <span className="sp-m-orb-label">Actions</span>
        </div>

        {/* Tab 3 */}
        <button
          type="button"
          className={`sp-m-tab ${isTabActive(tabs[2]) ? "active" : ""}`}
          onClick={() => navigate(tabs[2].href)}
        >
          <div className="sp-m-tab-icon-wrap">
            <i className={`bi ${isTabActive(tabs[2]) ? tabs[2].activeIcon : tabs[2].icon}`} />
          </div>
          <span className="sp-m-tab-label">{tabs[2].label}</span>
        </button>

        {/* Tab 4 */}
        <button
          type="button"
          className={`sp-m-tab ${isTabActive(tabs[3]) ? "active" : ""}`}
          onClick={() => navigate(tabs[3].href)}
        >
          <div className="sp-m-tab-icon-wrap">
            <i className={`bi ${isTabActive(tabs[3]) ? tabs[3].activeIcon : tabs[3].icon}`} />
          </div>
          <span className="sp-m-tab-label">{tabs[3].label}</span>
        </button>
      </nav>

      {/* ── ROLE-AWARE QUICK ACTION BOTTOM SHEET ── */}
      {sheetOpen && (
        <div className="sp-m-sheet-backdrop" onClick={() => setSheetOpen(false)}>
          <div className="sp-m-sheet-card" onClick={(e) => e.stopPropagation()}>
            <div className="sp-m-sheet-handle" />
            <div className="sp-m-sheet-header">
              <div>
                <div
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#059669",
                  }}
                >
                  {roleBadgeLabel}
                </div>
                <h5 style={{ margin: 0, fontWeight: 800, color: "#0F2744", fontSize: "17px" }}>
                  Quick Mobile Actions
                </h5>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  border: "none",
                  background: "#F1F5F9",
                  color: "#475569",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="sp-m-sheet-body">
              <div className="sp-m-action-grid">
                {quickActions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="sp-m-action-card"
                    onClick={() => {
                      setSheetOpen(false);
                      navigate(item.href);
                    }}
                  >
                    <div
                      className="sp-m-action-icon"
                      style={{ background: item.bg, color: item.color }}
                    >
                      <i className={`bi ${item.icon}`} />
                    </div>
                    <div className="sp-m-action-content">
                      <div className="sp-m-action-title">
                        <span>{item.label}</span>
                        {item.badge && <span className="sp-m-action-badge">{item.badge}</span>}
                      </div>
                      <p className="sp-m-action-sub">{item.subtitle}</p>
                    </div>
                    <i className="bi bi-chevron-right text-muted" style={{ fontSize: "14px" }} />
                  </button>
                ))}
              </div>

              {/* Install App & Account Footer Row */}
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 14,
                  borderTop: "1px solid #F1F5F9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                {!isStandalone && (
                  <button
                    type="button"
                    onClick={() => {
                      setSheetOpen(false);
                      handleInstallClick();
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid #0F2744",
                      background: "#0F2744",
                      color: "#FFFFFF",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                    }}
                  >
                    <i className="bi bi-phone-vibrate-fill text-warning" />
                    Install App to Phone
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSheetOpen(false);
                    logout();
                  }}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid #FECACA",
                    background: "#FEF2F2",
                    color: "#DC2626",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <i className="bi bi-box-arrow-right" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── INSTALL APP GUIDE MODAL (FOR iOS SAFARI / BROWSERS) ── */}
      {installModalOpen && (
        <div className="sp-m-sheet-backdrop" onClick={() => setInstallModalOpen(false)}>
          <div className="sp-m-sheet-card" onClick={(e) => e.stopPropagation()}>
            <div className="sp-m-sheet-handle" />
            <div className="sp-m-sheet-header">
              <div className="d-flex align-items-center gap-2">
                <img
                  src="/media/logo/schoolprofit-logo.png"
                  alt="SchoolProfit"
                  style={{ width: 36, height: 36, borderRadius: 10, objectFit: "contain" }}
                />
                <div>
                  <h5 style={{ margin: 0, fontWeight: 800, color: "#0F2744", fontSize: "16px" }}>
                    Install SchoolProfit Mobile App
                  </h5>
                  <small className="text-muted">Fast, full-screen access on your phone</small>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInstallModalOpen(false)}
                className="btn btn-sm btn-light rounded-circle"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="sp-m-sheet-body">
              <div
                style={{
                  background: "#F8FAFC",
                  borderRadius: 16,
                  padding: 16,
                  border: "1px solid #E2E8F0",
                  marginBottom: 12,
                }}
              >
                <div className="fw-bold mb-2" style={{ color: "#0F2744", fontSize: "13.5px" }}>
                  <i className="bi bi-apple me-2" /> On iPhone / iPad (Safari):
                </div>
                <ol className="mb-0 ps-3" style={{ fontSize: "12.5px", color: "#334155", lineHeight: 1.7 }}>
                  <li>
                    Tap the <strong>Share</strong> button <i className="bi bi-box-arrow-up text-primary" /> at the bottom of Safari.
                  </li>
                  <li>
                    Scroll down and tap <strong>"Add to Home Screen"</strong> <i className="bi bi-plus-square" />.
                  </li>
                  <li>
                    Tap <strong>Add</strong> in the top-right corner to launch full-screen.
                  </li>
                </ol>
              </div>

              <div
                style={{
                  background: "#ECFDF5",
                  borderRadius: 16,
                  padding: 16,
                  border: "1px solid #A7F3D0",
                }}
              >
                <div className="fw-bold mb-2" style={{ color: "#065F46", fontSize: "13.5px" }}>
                  <i className="bi bi-android2 me-2" /> On Android (Chrome / Edge):
                </div>
                <ol className="mb-0 ps-3" style={{ fontSize: "12.5px", color: "#065F46", lineHeight: 1.7 }}>
                  <li>
                    Tap the <strong>3-dot menu</strong> <i className="bi bi-three-dots-vertical" /> in the top-right of Chrome.
                  </li>
                  <li>
                    Tap <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong>.
                  </li>
                </ol>
              </div>

              <button
                type="button"
                onClick={() => setInstallModalOpen(false)}
                className="btn w-100 mt-3 fw-bold text-white"
                style={{ background: "#0F2744", borderRadius: 12, padding: "11px" }}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
