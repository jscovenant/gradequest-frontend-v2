



import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useFeatures } from "../../contexts/FeatureContext";
import { getUser } from "../../utils/token";

interface SidebarProps {
  sidebarOpen?: boolean;
  setSidebarOpen?: (value: boolean) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

interface MenuChild {
  label: string;
  href: string;
  roles?: string[];
  featureKey?: string;
  superAdminPermission?: string;
  hideIfNoFeature?: boolean;
}

interface MenuItem {
  label: string;
  icon: string;
  href?: string;
  collapseId?: string;
  children?: MenuChild[];
  roles: string[];
  badge?: string;

  //  Feature gating
  featureKey?: string;
  superAdminPermission?: string;
  lockIfNoFeature?: boolean; 
  hideIfNoFeature?: boolean;

  // Existing
  disabled?: boolean;
  comingSoon?: boolean;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen, isOpen, onClose }: SidebarProps) {
  const resolvedSidebarOpen = sidebarOpen ?? isOpen ?? false;
  const user = getUser();
  const featureAccess = useFeatures();
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => localStorage.getItem("gq_sidebar_collapsed") === "1");
  const [isMobileScreen, setIsMobileScreen] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [copiedId, setCopiedId] = useState(false);

  const idNumber =
    user?.school_identification_number ||
    user?.identification_number ||
    user?.reg_no ||
    user?.school?.identification_number;

  const getIdBadgeLabel = (role?: string) => {
    const r = (role || "").toLowerCase().replace(/[\s-_]/g, "");
    if (r === "admin") return "School ID";
    if (r === "superadmin" || r === "platformstaff") return "Staff ID";
    if (r === "salesrepresentative" || r === "salesrep") return "Rep ID";
    if (r === "teacher") return "Staff ID";
    if (r === "student") return "Student ID";
    if (r === "parent") return "Parent ID";
    if (r === "bursar") return "Staff ID";
    return "ID";
  };

  const handleCopyId = (id: string) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isCollapsed = !isMobileScreen && desktopCollapsed;

  useEffect(() => {
    document.documentElement.classList.toggle("gq-sidebar-collapsed", isCollapsed);
    localStorage.setItem("gq_sidebar_collapsed", desktopCollapsed ? "1" : "0");

    return () => {
      document.documentElement.classList.remove("gq-sidebar-collapsed");
    };
  }, [isCollapsed, desktopCollapsed]);

  if (!user) return null;

  const getSchoolInitials = (name?: string) => {
    if (!name) return "S";
    const words = name.split(" ");
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  const toggleMenu = (collapseId: string, disabled?: boolean) => {
    if (disabled) return;
    setOpenMenus((prev) =>
      prev.includes(collapseId) ? prev.filter((id) => id !== collapseId) : [...prev, collapseId]
    );
  };

  const handleLinkClick = () => {
    if (window.innerWidth < 768) {
      if (setSidebarOpen) setSidebarOpen(false);
      else onClose?.();
    }
  };

  const superAdminPermissions = Array.isArray(user?.super_admin_permissions) ? user.super_admin_permissions : [];
  const canUseSuperAdminArea = (permission?: string) => !permission || superAdminPermissions.includes("all") || superAdminPermissions.includes(permission);
  const featureSet = new Set(
    [
      ...(Array.isArray(featureAccess.features) ? featureAccess.features : []),
      ...(Array.isArray(user?.features) ? user.features : []),
    ]
      .map((feature: any) => {
        if (typeof feature === "string") return feature;
        return feature?.feature_key || feature?.key || "";
      })
      .filter(Boolean)
      .map((key: string) => key.toLowerCase())
  );
  const featureAliases: Record<string, string[]> = {
    staff_attendance: ["staff_attendance", "support_staff_attendance", "attendance_management", "support_attendance_management"],
    ai_lesson_plan_generator: ["ai_lesson_plan_generator", "support_ai_lesson_plan_generator", "lesson_plan_ai", "ai_lesson_planner", "gradequest_plus"],
    ai_fee_collection_assistant: ["ai_fee_collection_assistant", "support_ai_fee_collection_assistant", "ai_fee_assistant", "fee_collection_ai", "gradequest_plus"],
    ai_result_comment_generator: ["ai_result_comment_generator", "support_ai_result_comment_generator", "ai_result_comments", "result_comment_ai", "gradequest_plus"],
    ai_cbt_question_generator: ["ai_cbt_question_generator", "support_ai_cbt_question_generator", "ai_question_generator", "cbt_ai", "gradequest_plus"],
  };

  const canUseFeature = (_featureKey?: string) => true;
  const shouldHideForPlan = (_item: MenuItem | MenuChild) => false;

  const ComingSoonBadge = () => (
    <span
      className="badge ms-2"
      style={{
        background: "rgba(245, 158, 11, 0.2)",
        border: "1px solid rgba(245, 158, 11, 0.35)",
        color: "#fbbf24",
        fontSize: "0.6rem",
        padding: "2px 8px",
        borderRadius: 999,
        fontWeight: 700,
        letterSpacing: "0.02em",
      }}
    >
      Coming Soon
    </span>
  );

  /**
   *  Add featureKey values that match what your plan->features uses.
   * Examples used below: "fees", "results", "finance", "attendance"
   * Adjust to your real feature_key strings.
   */
  const menuItems: MenuItem[] = [
    {
      label: "Platform Command Center",
      icon: "shield-lock",
      href: "/dashboard",
      roles: ["Super-Admin", "Platform-Staff"],
    },
    {
      label: "Dashboard",
      icon: "speedometer2",
      href: "/dashboard",
      roles: ["Admin", "Teacher", "Student", "Parent", "Bursar", "Sales-Representative"],
    },
    {
      label: "Support",
      icon: "life-preserver",
      href: "/support",
      roles: ["Admin"],
    },
    {
      label: "Hostel Management",
      icon: "buildings",
      href: "/hostels",
      roles: ["Admin"],
      featureKey: "hostel_management",
      hideIfNoFeature: true,
    },
    {
      label: "Transport Management",
      icon: "bus-front",
      href: "/transport",
      roles: ["Admin"],
      featureKey: "transport_management",
      hideIfNoFeature: true,
    },
    {
      label: "Support Desk",
      icon: "headset",
      href: "/superadmin/support",
      roles: ["Super-Admin", "Platform-Staff"],
      superAdminPermission: "support",
    },

    {
      label: "Students",
      icon: "people",
      collapseId: "studentsMenu",
      children: [
        { label: "All Students", href: "/students", roles: ["Admin"] },
        { label: "Mark Attendance", href: "/students/attendance" },
        { label: "Promote Students", href: "/students/promote", roles: ["Admin"] },
      ],
      roles: ["Admin", "Teacher"],
      featureKey: "support_student_management",
      lockIfNoFeature: true,
    },

    {
      label: "Teachers",
      icon: "people",
      collapseId: "teachersMenu",
      children: [
        { label: "All Teachers", href: "/teachers" },
        { label: "Assign Subjects", href: "/teacher-subjects" },
      ],
      roles: ["Admin"],
      featureKey: "support_teacher_management",
      lockIfNoFeature: true,
    },

    {
      label: "Parents",
      icon: "people",
      collapseId: "parentsMenu",
      children: [{ label: "All Parents", href: "/parents" }],
      roles: ["Admin"],
      featureKey: "support_parent_management",
      lockIfNoFeature: true,
    },

    {
      label: "School Operators",
      icon: "person-badge",
      collapseId: "operatorsMenu",
      children: [{ label: "All Operators", href: "/school/operators" }],
      roles: ["Admin"],
    },

    {
      label: "Academics",
      icon: "mortarboard",
      collapseId: "academicsMenu",
      children: [
        { label: "Classes", href: "/levels" },
        { label: "Subjects", href: "/subjects" },
        { label: "Sessions & Terms", href: "/academics/calendar" },
        { label: "Departments", href: "/departments" },
        { label: "Sections", href: "/sections" },
      ],
      roles: ["Admin"],
    },

    {
      label: "CBT",
      icon: "pc-display-horizontal",
      collapseId: "cbtMenu",
      featureKey: "cbt_online",
      lockIfNoFeature: true,
      hideIfNoFeature: true,
      children: [
        { label: "CBT Exams", href: "/cbt/exams", roles: ["Admin", "Teacher"], featureKey: "cbt_online", hideIfNoFeature: true },
      ],
      roles: ["Admin", "Teacher"],
    },

    {
      label: "AI Lesson Planner",
      icon: "journal-text",
      href: "/settings/ai-lesson-plans",
      roles: ["Admin", "Teacher"],
      featureKey: "ai_lesson_plan_generator",
      hideIfNoFeature: true,
    },
    {
      label: "AI Credits",
      icon: "stars",
      href: "/settings/ai-credits",
      roles: ["Admin", "Teacher", "Bursar"],
      featureKey: "gradequest_plus",
      hideIfNoFeature: true,
    },
    {
      label: "Fees",
      icon: "cash",
      collapseId: "feesMenu",
      featureKey: "support_fee_management",
      lockIfNoFeature: true,
      children: [
        { label: "Fee Structure", href: "/fees/structure" },
        { label: "Fee Assignments", href: "/fees/methods" },
        { label: "Student Payments", href: "/fees/payments" },
        { label: "Fee Policy & Installments", href: "/fees/policy" },
        { label: "Receipt Approvals", href: "/fees/receipts/approval" },
        { label: "Financial Records", href: "/fees/report" },
        { label: "AI Fee Collection", href: "/fees/ai-collection", roles: ["Admin", "Bursar"], featureKey: "ai_fee_collection_assistant", hideIfNoFeature: true },
      ],
      roles: ["Admin", "Bursar"],
    },
    {
      label: "Accounting Manager",
      icon: "people",
      collapseId: "accountMenu",
      featureKey: "support_bursar_management",
      lockIfNoFeature: true,
      children: [
        { label: "Bursar", href: "/bursar" },
      ],
      roles: ["Admin"],
    },
    {
      label: "Staff Attendance",
      icon: "calendar-check",
      collapseId: "staffAttendanceMenu",
      featureKey: "staff_attendance",
      lockIfNoFeature: true,
      hideIfNoFeature: true,
      children: [
        { label: "Staff Attendance", href: "/scan-qr", roles: ["Admin", "Teacher"] },
        { label: "Staff Attendance Logs", href: "/attendance/logs", roles: ["Admin"] },
        { label: "Attendance Settings", href: "/attendance/settings", roles: ["Admin"] },
      ],
      roles: ["Admin", "Teacher"],
    },

    {
      label: "Sales Workspace",
      icon: "briefcase",
      collapseId: "salesWorkspaceMenu",
      children: [
        { label: "My Leads", href: "/sales/leads" },
        { label: "Marketing Kit & Sales Page", href: "/sales/marketing-kit" },
        { label: "My Commissions", href: "/sales/commissions" },
        { label: "Payout Settings", href: "/sales/payout-settings" },
      ],
      roles: ["Sales-Representative"],
    },

    // Super-Admin
    {
      label: "Subscribers & Billing",
      icon: "cash",
      collapseId: "billingMenu",
      children: [{ label: "Platform Staff", href: "/superadmin/platform-staff", superAdminPermission: "staff" },
        { label: "Subscribers", href: "/superadmin/subscribers", superAdminPermission: "billing" },
        { label: "Billing Policy", href: "/superadmin/billing-policy", superAdminPermission: "billing" },
        { label: "Twilio WhatsApp", href: "/superadmin/twilio-whatsapp", superAdminPermission: "support" },
        { label: "Bookings", href: "/demo-bookers", superAdminPermission: "sales" }
      ],
      
      roles: ["Super-Admin", "Platform-Staff"],
    },
    {
      label: "Marketing",
      icon: "megaphone",
      collapseId: "marketingMenu",
      children: [
        { label: "Sales Representatives", href: "/superadmin/sales-representatives", superAdminPermission: "sales" },
        { label: "Sales Leads", href: "/superadmin/sales-leads", superAdminPermission: "sales" },
        { label: "Marketing Materials", href: "/superadmin/sales-marketing-materials", superAdminPermission: "marketing" },
        { label: "Sales Payouts", href: "/superadmin/sales-payouts", superAdminPermission: "finance" },
        { label: "Newsletter Subscribers", href: "/superadmin/newsletter-subscribers", superAdminPermission: "marketing" },
        { label: "Broadcast", href: "/superadmin/send-message", superAdminPermission: "marketing" },
      ],
      roles: ["Super-Admin", "Platform-Staff"],
    },
    {
      label: "SubPlans",
      icon: "card-list",
      collapseId: "subPlansMenu",
      children: [{ label: "Subscription-Plans", href: "/subplan", superAdminPermission: "billing" }],
      roles: ["Super-Admin", "Platform-Staff"],
    },
    {
      label: "Media & Blogs",
      icon: "file-earmark-richtext",
      collapseId: "blogsMenu",
      children: [{ label: "Blogs", href: "/blogs", superAdminPermission: "content" }],
      roles: ["Super-Admin", "Platform-Staff"],
    },
    {
      label: "Results",
      icon: "file-earmark-text",
      collapseId: "resultsMenu",
      featureKey: "support_results_upload",
      lockIfNoFeature: true,
      children: [
        { label: "Search & Edit Result", href: "/results/student-editor", roles: ["Admin", "Teacher"], },
        { label: "Prepare Term Results", href: "/students/results/batch", roles: ["Admin"], },
        { label: "Review Results", href: "/results/review", roles: ["Admin"], },
        { label: "Enter Student Scores", href: "/students/results/add", roles: ["Admin", "Teacher"], },
        { label: "Monitor Results", href: "/result/monitor", roles: ["Admin"], },
        { label: "Result Design", href: "/results/design", roles: ["Admin"], },
        { label: "Generate PIN", href: "/results/pins", roles: ["Admin"], },
        { label: "Withdrawn Result Archive", href: "/results/withdrawn-archive", roles: ["Admin"], },
        { label: "Student Transcripts", href: "/transcripts", roles: ["Admin"], },
      ],
      roles: ["Admin", "Teacher"],
    },

    {
      label: "Reports",
      icon: "bar-chart",
      collapseId: "reportsMenu",
      // featureKey: "reports", lockIfNoFeature: true, // optional
      children: [{ label: "Student Attendance Report", href: "/students/report" }],
      roles: ["Admin"],
    },

    {
      label: "Wallet & Billing",
      icon: "wallet2",
      collapseId: "billingMenu_admin",
      children: [
        { label: "Student Clearance", href: "/billing" },
        { label: "Wallet & Credits", href: "/wallet" },
      ],
      roles: ["Admin"],
    },

    {
      label: "Settings",
      icon: "gear",
      collapseId: "settingsMenu",
      children: [
        { label: "School Profile", href: "/school/settings" },
        { label: "Bank Accounts", href: "/school/bank-account-setting" },
        { label: "Result Deadline Setting", href: "/results/deadlines" },
        { label: "WhatsApp Notification Settings", href: "/settings/whatsapp", featureKey: "gradequest_plus", hideIfNoFeature: true },
      ],
      roles: ["Admin"],
    },

    // Student
    {
      label: "Academics",
      icon: "book",
      collapseId: "studentAcademicsMenu",
      children: [
        { label: "My Subjects", href: "/student/my-subjects" },
        { label: "Lesson Notes", href: "/student/lesson-notes" },
        { label: "My CBT Exams", href: "/student/cbt/exams", featureKey: "cbt_online", hideIfNoFeature: true },
      ],
      roles: ["Student"],
    },
    {
      label: "Fees & Payments",
      icon: "cash-stack",
      collapseId: "studentFeesMenu",
      featureKey: "",
      lockIfNoFeature: true,
      children: [{ label: "My Fees", href: "/student/my-fees", featureKey: "fees" }],
      roles: ["Student"],
    },

    // Parent
    {
      label: "My Children",
      icon: "people",
      collapseId: "parentChildrenMenu",
      roles: ["Parent"],
      children: [
        { label: "All Children", href: "/parent/children" },
      ],
    },

    {
      label: "Attendance",
      icon: "calendar-check",
      collapseId: "parentAttendanceMenu",
      roles: ["Parent"],
      children: [
        { label: "Attendance Report", href: "/parent/attendance" },
        { label: "Absence History", href: "/parent/attendance/history" },
      ],
    },

    {
      label: "Fees & Payments",
      icon: "cash-stack",
      collapseId: "parentFeesMenu",
      roles: ["Parent"],
      children: [
        { label: "Payment History", href: "/parent/payments", featureKey: "support_fee_management" },
        { label: "Upload Receipt", href: "/parent/upload-receipt", featureKey: "support_fee_management" },
      ],
    },

    {
      label: "Communication",
      icon: "chat-dots",
      collapseId: "parentCommunicationMenu",
      roles: ["Parent"],
      children: [
        { label: "Messages & Notices", href: "/parent/messages" },
        { label: "Announcements", href: "/parent/announcements" },
      ],
    },

    {
      label: "School Information",
      icon: "building",
      collapseId: "parentSchoolMenu",
      roles: ["Parent"],
      children: [
        { label: "Academic Calendar", href: "/parent/calendar" },
        { label: "School Events", href: "/parent/events" },
      ],
    },
  ];

  return (
    <>
      <style>
        {`
          .sidebar-scroll {
            overflow-y: auto;
            overflow-x: hidden;
            height: 100vh;
          }
          .sidebar-scroll::-webkit-scrollbar { width: 6px; }
          .sidebar-scroll::-webkit-scrollbar-track { background: #F8FAFC; }
          .sidebar-scroll::-webkit-scrollbar-thumb {
            background: #E2E8F0;
            border-radius: 10px;
          }
          .sidebar-scroll::-webkit-scrollbar-thumb:hover {
            background: #CBD5E1;
          }
          .gq-nav-text {
            display: inline-block !important;
            color: #1E293B !important;
            font-size: 13.5px !important;
            font-weight: 600 !important;
            opacity: 1 !important;
            visibility: visible !important;
          }
          .gq-nav-link, .gq-nav-btn {
            color: #1E293B !important;
          }
          .gq-nav-link.active .gq-nav-text, .gq-nav-btn.active .gq-nav-text {
            color: #0F2744 !important;
            font-weight: 700 !important;
          }
          .gq-submenu-link {
            color: #475569 !important;
            display: flex !important;
            align-items: center !important;
          }
          .gq-submenu-link.active {
            color: #B45309 !important;
            font-weight: 700 !important;
          }
          @media (max-width: 767.98px) {
            .gq-sidebar.sidebar,
            aside.sidebar.gq-sidebar {
              background: #FFFFFF !important;
              box-shadow: 0 0 30px rgba(15, 39, 68, 0.25) !important;
            }
            .gq-sidebar .gq-nav-text {
              display: inline-block !important;
              color: #1E293B !important;
              opacity: 1 !important;
              visibility: visible !important;
              font-size: 13.5px !important;
              font-weight: 600 !important;
            }
            .gq-sidebar .gq-nav-link, .gq-sidebar .gq-nav-btn {
              color: #1E293B !important;
            }
            .gq-sidebar .gq-submenu-link {
              color: #475569 !important;
            }
          }
        `}
      </style>

      {resolvedSidebarOpen && (
        <div
          className="gq-sidebar-overlay d-md-none"
          onClick={() => setSidebarOpen?.(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1040,
            transition: "opacity 0.3s ease",
          }}
        />
      )}

      <aside
        className={`sidebar gq-sidebar ${resolvedSidebarOpen ? "show" : ""} ${isCollapsed ? "is-collapsed" : ""}`}
        style={{
          minHeight: "100vh",
          position: "fixed",
          top: 0,
          zIndex: 1050,
          overflow: "hidden",
        }}
      >
        <div className="sidebar-scroll gq-sidebar-scroll">
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <button
                type="button"
                className="gq-sidebar-collapse d-none d-md-inline-flex"
                onClick={() => setDesktopCollapsed((value) => !value)}
                title={isCollapsed ? "Open sidebar" : "Collapse sidebar"}
                aria-label={isCollapsed ? "Open sidebar" : "Collapse sidebar"}
              >
                <i className={`bi bi-layout-sidebar${isCollapsed ? "-inset" : ""}`}></i>
              </button>

              <button
                className="btn btn-sm d-md-none"
                style={{
                  background: "#F1F5F9",
                  color: "#0F2744",
                  border: "1px solid #E2E8F0",
                  borderRadius: "6px",
                }}
                onClick={() => {
                  if (setSidebarOpen) setSidebarOpen(false);
                  else onClose?.();
                }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {/* Logo & School Name */}
            <div
              className="gq-sidebar__brand d-flex align-items-center"
            >
              {user.school?.logo ? (
                <img
                  src={user.school.logo}
                  alt={user.school.name}
                  className="gq-sidebar__logo me-3"
                  style={{
                    objectFit: "contain",
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div
                  className="gq-sidebar__logo gq-sidebar__initials me-3 d-flex align-items-center justify-content-center"
                  style={{
                    fontWeight: 800,
                    fontSize: 16,
                  }}
                >
                  {getSchoolInitials(user.school?.name)}
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <h6
                  className="mb-0 text-truncate fw-bold"
                  title={user.school?.name}
                  style={{ fontSize: "0.92rem", color: "#0F2744", letterSpacing: "-0.01em" }}
                >
                  {user.school?.name || "My School"}
                </h6>
                <small
                  className="d-block text-truncate fw-semibold"
                  style={{ color: "#64748B", fontSize: "0.72rem" }}
                >
                  {user.role}
                </small>
              </div>
            </div>

            {/* User Profile Card */}
            <div
              className="gq-sidebar__user position-relative overflow-hidden"
            >
              <div className="d-flex align-items-center">
                <div
                  className="gq-avatar me-3"
                  style={{
                    flex: "0 0 auto",
                  }}
                >
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="mb-0 text-truncate fw-bold" style={{ fontSize: "0.85rem", color: "#0F2744" }}>
                    {user.name || "User"}
                  </p>
                  <small
                    className="text-truncate d-block"
                    style={{ color: "#64748B", fontSize: "0.7rem" }}
                  >
                    {user.email || ""}
                  </small>
                </div>
              </div>
            </div>

            {/* School / Admin 10-Digit ID Chip */}
            {!isCollapsed && idNumber && (
              <div
                className="mt-2 mb-3 px-2 py-1 d-flex align-items-center justify-content-between"
                style={{
                  background: "rgba(15, 39, 68, 0.04)",
                  border: "1px solid rgba(15, 39, 68, 0.1)",
                  borderRadius: "8px",
                  fontSize: "0.75rem",
                }}
              >
                <div className="d-flex align-items-center gap-1 text-truncate" style={{ minWidth: 0 }}>
                  <i className="bi bi-person-badge text-primary" style={{ fontSize: "0.82rem" }}></i>
                  <span className="fw-semibold text-muted" style={{ fontSize: "0.68rem" }}>{getIdBadgeLabel(user.role)}:</span>
                  <span className="fw-bold font-monospace text-dark text-truncate" style={{ letterSpacing: "0.5px" }}>
                    {idNumber}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyId(String(idNumber))}
                  title="Copy ID"
                  className="btn btn-link p-0 text-muted ms-1 text-decoration-none"
                  style={{ fontSize: "0.78rem", lineHeight: 1 }}
                >
                  <i className={`bi ${copiedId ? "bi-check2 text-success fw-bold" : "bi-clipboard"}`}></i>
                </button>
              </div>
            )}

            {/* Navigation Label */}
            <div className="mb-3">
              <small
                className="gq-sidebar__label"
              >
                Navigation
              </small>
            </div>

            {/* NAVIGATION */}
            <ul className="nav flex-column gap-1">
              {menuItems
                .filter((item) => {
                  const userRole = (user.role || "").toLowerCase();
                  const isOperator = userRole === "operator";
                  const isItemAllowed = item.roles.some((r) => r.toLowerCase() === userRole)
                    || (isOperator && item.roles.some((r) => r.toLowerCase() === "admin") && item.collapseId !== "billingMenu_admin" && item.collapseId !== "settingsMenu" && item.collapseId !== "operatorsMenu");

                  if (!isItemAllowed || !canUseSuperAdminArea(item.superAdminPermission) || shouldHideForPlan(item)) {
                    return false;
                  }

                  if (!item.children) {
                    return true;
                  }

                  return item.children.some((child) => {
                    const isChildAllowed = !child.roles || child.roles.some((r) => r.toLowerCase() === userRole) || (isOperator && child.roles.some((r) => r.toLowerCase() === "admin"));
                    return isChildAllowed
                      && canUseSuperAdminArea(child.superAdminPermission)
                      && !shouldHideForPlan(child);
                  });
                })
                .map((item) => {
                  const disabled = item.disabled;

                  // If it's a single link and gated, hide it
                  return (
                    <li key={item.label}>
                      {item.children ? (
                        <>
                          <button
                            className="gq-nav-btn nav-link btn text-start justify-content-between"
                            onClick={() => toggleMenu(item.collapseId!, disabled)}
                            disabled={disabled}
                            title={isCollapsed ? item.label : undefined}
                            style={{
                              border: "none",
                              color: disabled ? "#94A3B8" : "#334155",
                              cursor: disabled ? "not-allowed" : "pointer",
                              opacity: disabled ? 0.8 : 1,
                            }}
                          >
                            <span className="d-flex align-items-center gap-2">
                              <span className="gq-nav-icon">
                                <i className={`bi bi-${item.icon}`}></i>
                              </span>
                              <span className="gq-nav-text" style={{ color: disabled ? "#94A3B8" : "#1E293B", fontSize: "13.5px", fontWeight: 600 }}>{item.label}</span>

                              {item.comingSoon && <ComingSoonBadge />}

                              {item.badge && (
                                <span
                                  className="badge"
                                  style={{
                                    backgroundColor: "#10B981",
                                    fontSize: "0.6rem",
                                    padding: "2px 6px",
                                  }}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </span>

                            {!disabled && !isCollapsed && (
                              <i
                                className={`bi bi-chevron-${openMenus.includes(item.collapseId!) ? "down" : "right"}`}
                                style={{ fontSize: "0.75rem", transition: "transform 0.2s ease", color: "#94A3B8" }}
                              ></i>
                            )}
                          </button>

                          {!disabled && (
                            <div
                              className={`gq-submenu ${openMenus.includes(item.collapseId!) ? "is-open" : ""}`}
                            >
                              <div className="mt-1 mb-2">
                                {item.children
                                  .filter((child) => {
                                    const userRole = (user.role || "").toLowerCase();
                                    const isOperator = userRole === "operator";
                                    const isChildAllowed = !child.roles || child.roles.some((r) => r.toLowerCase() === userRole) || (isOperator && child.roles.some((r) => r.toLowerCase() === "admin"));
                                    return isChildAllowed
                                      && canUseSuperAdminArea(child.superAdminPermission)
                                      && !shouldHideForPlan(child);
                                  })
                                  .map((child) => (
                                    <NavLink
                                      key={child.label}
                                      to={child.href}
                                      onClick={handleLinkClick}
                                      className={({ isActive }) =>
                                        `gq-submenu-link nav-link ${isActive ? "active" : ""}`
                                      }
                                      style={({ isActive }) => ({
                                        color: isActive ? "#B45309" : "#475569",
                                        fontWeight: isActive ? 700 : 550,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                      })}
                                    >
                                      <span
                                        style={{
                                          width: "5px",
                                          height: "5px",
                                          borderRadius: "50%",
                                          backgroundColor: "currentColor",
                                          opacity: 0.7,
                                        }}
                                      ></span>
                                      {child.label}
                                    </NavLink>
                                  ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <NavLink
                          to={item.href!}
                          onClick={handleLinkClick}
                          className={({ isActive }) => `gq-nav-link nav-link ${isActive ? "active" : ""}`}
                          title={isCollapsed ? item.label : undefined}
                          style={({ isActive }) => ({
                            fontWeight: isActive ? 700 : 600,
                            color: isActive ? "#0F2744" : "#1E293B",
                          })}
                        >
                          <span className="gq-nav-icon">
                            <i className={`bi bi-${item.icon}`}></i>
                          </span>
                          <span className="gq-nav-text" style={{ color: "#1E293B", fontSize: "13.5px", fontWeight: 600 }}>{item.label}</span>
                          {item.badge && (
                            <span
                              className="badge ms-auto"
                              style={{
                                backgroundColor: "#10B981",
                                fontSize: "0.6rem",
                                padding: "2px 6px",
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      )}
                    </li>
                  );
                })}
            </ul>

            {/* Footer - Version Info */}
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid #E2E8F0" }}>
              <div className="d-flex align-items-center justify-content-between">
                <small style={{ color: "#94A3B8", fontSize: "0.72rem", fontWeight: 600 }}>SchoolProfit v2.1</small>
                <div className="d-flex align-items-center gap-1.5">
                  <i className="bi bi-shield-check" style={{ color: "#10B981", fontSize: "0.85rem" }}></i>
                  <small style={{ color: "#10B981", fontSize: "0.72rem", fontWeight: 700 }}>Secured</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}








