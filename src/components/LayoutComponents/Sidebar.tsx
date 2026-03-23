import { useState } from "react";
import { NavLink } from "react-router-dom";
import { getUser } from "../../utils/token";
import { useFeatures } from "../../contexts/FeatureContext";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen?: (value: boolean) => void;
}

interface MenuChild {
  label: string;
  href: string;
  roles?: string[];
  featureKey?: string; // ✅ gate child
}

interface MenuItem {
  label: string;
  icon: string;
  href?: string;
  collapseId?: string;
  children?: MenuChild[];
  roles: string[];
  badge?: string;

  // ✅ Feature gating
  featureKey?: string; // gate whole group/item
  lockIfNoFeature?: boolean; // show but locked (Upgrade badge)

  // Existing
  disabled?: boolean;
  comingSoon?: boolean;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const user = getUser();
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const { loading: featuresLoading, can } = useFeatures();

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
    if (setSidebarOpen && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const isLockedByPlan = (item: MenuItem) =>
    !!item.lockIfNoFeature && !!item.featureKey && !can(item.featureKey);

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

  const UpgradeBadge = () => (
    <span
      className="badge ms-2"
      style={{
        background: "rgba(239, 68, 68, 0.15)",
        border: "1px solid rgba(239, 68, 68, 0.3)",
        color: "#fca5a5",
        fontSize: "0.6rem",
        padding: "2px 8px",
        borderRadius: 999,
        fontWeight: 700,
        letterSpacing: "0.02em",
      }}
    >
      Upgrade
    </span>
  );

  /**
   * ✅ Add featureKey values that match what your plan->features uses.
   * Examples used below: "fees", "results", "finance", "attendance"
   * Adjust to your real feature_key strings.
   */
  const menuItems: MenuItem[] = [
    {
      label: "Dashboard",
      icon: "speedometer2",
      href: "/dashboard",
      roles: ["Admin", "Teacher", "Student", "Super-Admin", "Parent", "Bursar"],
    },

    {
      label: "Students",
      icon: "people",
      collapseId: "studentsMenu",
      // featureKey: "students", lockIfNoFeature: true, // optional if you monetize it
      children: [
        { label: "All Students", href: "/students" },
        { label: "Mark Attendance", href: "/students/attendance" },
        { label: "Promote Students", href: "/students/promote" },
      ],
      roles: ["Admin", "Teacher"],
      featureKey: "support_student_management",
      lockIfNoFeature: true,
    },

    {
      label: "Teachers",
      icon: "people",
      collapseId: "teachersMenu",
      // featureKey: "teachers", lockIfNoFeature: true, // optional
      children: [
        { label: "All Teachers", href: "/teachers" },
       
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
      label: "Fees",
      icon: "cash",
      collapseId: "feesMenu",
      featureKey: "support_fee_management",
      lockIfNoFeature: true,
      children: [
        { label: "Fee Structure", href: "/fees/structure" },
        { label: "Payment Methods", href: "/fees/methods" },
        { label: "Student Payments", href: "/fees/payments" },
        { label: "Receipt Approvals", href: "/fees/receipts/approval" },
        { label: "Financial Records", href: "/fees/report" },
      ],
      roles: ["Admin", "Bursar"],
    },

      {
      label: "Accounting Mnager",
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
      featureKey: "support_staff_attendance",
      lockIfNoFeature: true,
      children: [
        { label: "Qrcode Registration", href: "/qr-code" },
        { label: "Staff Attendance", href: "/scan-qr" },
        { label: "Staff Attendance Logs", href: "/attendance/logs" },
        { label: "Attendance Settings", href: "/attendance/settings" },
      ],
      roles: ["Admin"],
    },

    // Super-Admin
    {
      label: "Subscribers & Billing",
      icon: "cash",
      collapseId: "billingMenu",
      children: [{ label: "Subscribers", href: "/superadmin/subscribers" },
        { label: "Bookings", href: "/demo-bookers" }
      ],
      
      roles: ["Super-Admin"],
    },
    {
      label: "Marketing",
      icon: "megaphone",
      collapseId: "marketingMenu",
      children: [{ label: "Broadcast", href: "/superadmin/send-message" }],
      roles: ["Super-Admin"],
    },
    {
      label: "SubPlans",
      icon: "card-list",
      collapseId: "subPlansMenu",
      children: [{ label: "Subscription-Plans", href: "/subplan" }],
      roles: ["Super-Admin"],
    },
    {
      label: "Media & Blogs",
      icon: "file-earmark-richtext",
      collapseId: "blogsMenu",
      children: [{ label: "Blogs", href: "/blogs" }],
      roles: ["Super-Admin"],
    },
     {
      label: "Whatsapp Broadcast",
      icon: "chat-dots",
      collapseId: "blogsMenu",
      children: [{ label: "WP Settings", href: "/settings/school-wp-settings" },
        { label: "WP Verification", href: "/settings/parent-wp-verification" }
      ],
      roles: ["Super-Admin"],
    },

    {
      label: "Results",
      icon: "file-earmark-text",
      collapseId: "resultsMenu",
      featureKey: "support_results_upload",
      lockIfNoFeature: true,
      children: [
        { label: "Prepare Term Results", href: "/students/results/batch", roles: ["Admin"], },
        { label: "Enter Student Scores", href: "/students/results/add", roles: ["Admin", "Teacher"], },

        { label: "Generate PIN", href: "/results/pins", roles: ["Admin"], },
      ],
      roles: ["Admin", "Teacher"],
    },

    // {
    //   label: "Finance",
    //   icon: "wallet2",
    //   collapseId: "financeMenu",
    //   featureKey: "support_finance_management",
    //   lockIfNoFeature: true,
    //   children: [
    //     { label: "Financial Records", href: "/report/finance" },
    //     { label: "Categories", href: "/finance/categories" },
    //     { label: "Expense Report", href: "/finance/reports/expense" },
    //     { label: "Profit & Loss", href: "/finance/reports/profit-loss" },
    //   ],
    //   roles: ["Admin", "Bursar"],
    // },

    {
      label: "Reports",
      icon: "bar-chart",
      collapseId: "reportsMenu",
      // featureKey: "reports", lockIfNoFeature: true, // optional
      children: [{ label: "Student Attendance Report", href: "/students/report" }],
      roles: ["Admin"],
    },

   

    {
      label: "Subscriptions & Billing",
      icon: "receipt-cutoff",
      collapseId: "billingMenu_admin",
      children: [
        { label: "Billing", href: "/billing" },
        { label: "Wallet", href: "/wallet" },
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

        
        

        
      ],
      roles: ["Admin"],
    },

    // Student
    {
      label: "Academics",
      icon: "book",
      collapseId: "studentAcademicsMenu",
      children: [{ label: "My Subjects", href: "/student/my-subjects" }],
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

    // Disabled + Coming Soon
    {
      label: "Attendance",
      icon: "calendar-check",
      collapseId: "parentAttendanceMenu",
      roles: ["Parent"],
      disabled: true,
      comingSoon: true,
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
      disabled: true,
      comingSoon: true,
      children: [
        { label: "Messages", href: "/parent/messages" },
        { label: "Announcements", href: "/parent/announcements" },
      ],
    },

    {
      label: "School Information",
      icon: "building",
      collapseId: "parentSchoolMenu",
      roles: ["Parent"],
      disabled: true,
      comingSoon: true,
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
          .sidebar-scroll::-webkit-scrollbar { width: 8px; }
          .sidebar-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.06); }
          .sidebar-scroll::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.18);
            border-radius: 10px;
          }
          .sidebar-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(255,255,255,0.28);
          }
        `}
      </style>

      {sidebarOpen && (
        <div
          className="sidebar-overlay d-md-none"
          onClick={() => setSidebarOpen?.(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1040,
            transition: "opacity 0.3s ease",
          }}
        />
      )}

      <aside
        className={`sidebar ${sidebarOpen ? "show" : ""}`}
        style={{
          background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
          minHeight: "100vh",
          position: "fixed",
          top: 0,
          left: sidebarOpen ? 0 : "-100%",
          width: "280px",
          maxWidth: "80vw",
          boxShadow: "4px 0 20px rgba(0, 0, 0, 0.1)",
          zIndex: 1050,
          transition: "left 0.3s ease",
          overflow: "hidden",
        }}
      >
        <div className="sidebar-scroll">
          <div className="p-4">
            <div className="d-md-none d-flex justify-content-end mb-3">
              <button
                className="btn btn-sm"
                onClick={() => setSidebarOpen?.(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {/* Logo & School Name */}
            <div
              className="d-flex align-items-center mb-4 pb-3"
              style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}
            >
              {user.school?.logo ? (
                <img
                  src={user.school.logo}
                  alt={user.school.name}
                  className="me-3 rounded-3"
                  style={{
                    width: 48,
                    height: 48,
                    objectFit: "contain",
                    background: "rgba(255, 255, 255, 0.1)",
                    padding: "6px",
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div
                  className="me-3 rounded-3 d-flex align-items-center justify-content-center"
                  style={{
                    width: 48,
                    height: 48,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    fontWeight: 700,
                    fontSize: 18,
                    color: "#fff",
                    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
                  }}
                >
                  {getSchoolInitials(user.school?.name)}
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <h6
                  className="text-white mb-0 text-truncate fw-semibold"
                  title={user.school?.name}
                  style={{ fontSize: "0.95rem", letterSpacing: "-0.01em" }}
                >
                  {user.school?.name || "My School"}
                </h6>
                <small
                  className="d-block text-truncate"
                  style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.75rem" }}
                >
                  {user.role}
                </small>
              </div>
            </div>

            {/* User Profile Card */}
            <div
              className="mb-4 p-3 rounded-3 position-relative overflow-hidden"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div className="d-flex align-items-center">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center me-3"
                  style={{
                    width: 40,
                    height: 40,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                  }}
                >
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="text-white mb-0 text-truncate fw-semibold" style={{ fontSize: "0.85rem" }}>
                    {user.name || "User"}
                  </p>
                  <small
                    className="text-truncate d-block"
                    style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.7rem" }}
                  >
                    {user.email || ""}
                  </small>
                </div>
              </div>
            </div>

            {/* Navigation Label */}
            <div className="mb-3">
              <small
                className="text-uppercase fw-semibold"
                style={{
                  color: "rgba(255, 255, 255, 0.5)",
                  fontSize: "0.7rem",
                  letterSpacing: "0.05em",
                }}
              >
                Navigation
              </small>
            </div>

            {/* NAVIGATION */}
            <ul className="nav flex-column gap-1">
              {menuItems
                .filter((item) => item.roles.includes(user.role))
                .map((item) => {
                  const lockedByPlan = isLockedByPlan(item);
                  const disabled = item.disabled || lockedByPlan || featuresLoading;

                  // If it’s a single link and gated, hide it
                  if (!item.children && item.featureKey && !can(item.featureKey)) {
                    return null;
                  }

                  return (
                    <li key={item.label}>
                      {item.children ? (
                        <>
                          <button
                            className="nav-link btn text-start w-100 d-flex align-items-center justify-content-between p-0"
                            onClick={() => toggleMenu(item.collapseId!, disabled)}
                            disabled={disabled}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: disabled ? "rgba(255, 255, 255, 0.45)" : "rgba(255, 255, 255, 0.8)",
                              fontSize: "0.875rem",
                              fontWeight: 500,
                              padding: "0.65rem 0.75rem",
                              borderRadius: "8px",
                              transition: "all 0.2s ease",
                              cursor: disabled ? "not-allowed" : "pointer",
                              opacity: disabled ? 0.9 : 1,
                            }}
                            onMouseEnter={(e) => {
                              if (disabled) return;
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                              e.currentTarget.style.color = "#fff";
                            }}
                            onMouseLeave={(e) => {
                              if (disabled) return;
                              if (!openMenus.includes(item.collapseId!)) {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
                              }
                            }}
                          >
                            <span className="d-flex align-items-center gap-2">
                              <i className={`bi bi-${item.icon}`} style={{ fontSize: "1rem" }}></i>
                              <span>{item.label}</span>

                              {item.comingSoon && <ComingSoonBadge />}
                              {lockedByPlan && !item.comingSoon && <UpgradeBadge />}

                              {item.badge && (
                                <span
                                  className="badge"
                                  style={{
                                    backgroundColor: "#10b981",
                                    fontSize: "0.6rem",
                                    padding: "2px 6px",
                                  }}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </span>

                            {!disabled && (
                              <i
                                className={`bi bi-chevron-${openMenus.includes(item.collapseId!) ? "down" : "right"}`}
                                style={{ fontSize: "0.75rem", transition: "transform 0.2s ease" }}
                              ></i>
                            )}
                          </button>

                          {!disabled && (
                            <div
                              className="submenu"
                              style={{
                                maxHeight: openMenus.includes(item.collapseId!) ? "500px" : "0",
                                overflow: "hidden",
                                transition: "max-height 0.3s ease",
                              }}
                            >
                              <div className="mt-1 mb-2">
                                {item.children
                                  .filter((child) => !child.roles || child.roles.includes(user.role))
                                  .filter((child) => can(child.featureKey))
                                  .map((child) => (
                                    <NavLink
                                      key={child.label}
                                      to={child.href}
                                      onClick={handleLinkClick}
                                      className={({ isActive }) =>
                                        `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : ""}`
                                      }
                                      style={({ isActive }) => ({
                                        color: isActive ? "#fff" : "rgba(255, 255, 255, 0.7)",
                                        fontSize: "0.8rem",
                                        padding: "0.5rem 0.75rem 0.5rem 2.75rem",
                                        borderRadius: "6px",
                                        background: isActive
                                          ? "linear-gradient(90deg, rgba(102, 126, 234, 0.2) 0%, transparent 100%)"
                                          : "transparent",
                                        borderLeft: isActive ? "3px solid #667eea" : "3px solid transparent",
                                        marginLeft: "0.5rem",
                                        transition: "all 0.2s ease",
                                        fontWeight: isActive ? 600 : 400,
                                      })}
                                      onMouseEnter={(e) => {
                                        if (!e.currentTarget.classList.contains("active")) {
                                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                                          e.currentTarget.style.color = "#fff";
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!e.currentTarget.classList.contains("active")) {
                                          e.currentTarget.style.background = "transparent";
                                          e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
                                        }
                                      }}
                                    >
                                      <span
                                        style={{
                                          width: "4px",
                                          height: "4px",
                                          borderRadius: "50%",
                                          backgroundColor: "currentColor",
                                          opacity: 0.6,
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
                          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                          style={({ isActive }) => ({
                            color: isActive ? "#fff" : "rgba(255, 255, 255, 0.8)",
                            fontSize: "0.875rem",
                            fontWeight: isActive ? 600 : 500,
                            padding: "0.65rem 0.75rem",
                            borderRadius: "8px",
                            background: isActive
                              ? "linear-gradient(90deg, rgba(102, 126, 234, 0.3) 0%, rgba(102, 126, 234, 0.1) 100%)"
                              : "transparent",
                            borderLeft: isActive ? "3px solid #667eea" : "3px solid transparent",
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          })}
                          onMouseEnter={(e) => {
                            if (!e.currentTarget.classList.contains("active")) {
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                              e.currentTarget.style.color = "#fff";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!e.currentTarget.classList.contains("active")) {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
                            }
                          }}
                        >
                          <i className={`bi bi-${item.icon}`} style={{ fontSize: "1rem" }}></i>
                          <span>{item.label}</span>
                          {item.badge && (
                            <span
                              className="badge ms-auto"
                              style={{
                                backgroundColor: "#10b981",
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

            {/* Help Section */}
            {/* <div
              className="mt-4 p-3 rounded-3 position-relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)",
                border: "1px solid rgba(102, 126, 234, 0.3)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-20px",
                  right: "-20px",
                  width: "60px",
                  height: "60px",
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "50%",
                  filter: "blur(20px)",
                }}
              />
              <div className="position-relative">
                <i className="bi bi-question-circle d-block mb-2" style={{ fontSize: "1.5rem", color: "#a78bfa" }} />
                <h6 className="text-white fw-semibold mb-1" style={{ fontSize: "0.85rem" }}>
                  Need Help?
                </h6>
                <p
                  className="mb-2"
                  style={{
                    color: "rgba(255, 255, 255, 0.7)",
                    fontSize: "0.75rem",
                    lineHeight: 1.4,
                  }}
                >
                  Check our documentation or contact support
                </p>
                <button
                  className="btn btn-sm w-100"
                  style={{
                    background: "rgba(255, 255, 255, 0.15)",
                    color: "#fff",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    padding: "0.4rem",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                  }}
                >
                  Get Support
                </button>
              </div>
            </div> */}

            {/* Footer - Version Info */}
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <div className="d-flex align-items-center justify-content-between">
                <small style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "0.7rem" }}>Version 2.0.1</small>
                <div className="d-flex gap-2">
                  <i className="bi bi-shield-check" style={{ color: "#10b981", fontSize: "0.9rem" }}></i>
                  <small style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "0.7rem" }}>Secured</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}