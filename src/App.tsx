import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import "aos/dist/aos.css";
import RequireAuth from "./auth/RequireAuth";
import { FeatureProvider } from "./contexts/FeatureContext";
import OnboardingGuard from "./auth/OnboardingGuard";
import Loader from "./components/ui/dashboardLoader";
import { isCustomPortalHost } from "./utils/portal";
import ErrorBoundary from "./components/ErrorBoundary";

import Login from "./pages/login";
import HomePage from "./pages/HomePage";
import Signup from "./pages/signup";
import Dashboard from "./pages/Dashboard";

function lazyWithRetry<T extends React.ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error: any) {
      console.warn("Chunk load failed, checking for new deployment...", error);
      const msg = String(error?.message || error || "");
      if (
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed") ||
        msg.includes("error loading dynamically imported module") ||
        msg.includes("Loading chunk")
      ) {
        try {
          const key = "sp_lazy_reload_ts";
          const last = sessionStorage.getItem(key);
          const now = Date.now();
          if (!last || now - parseInt(last, 10) > 10000) {
            sessionStorage.setItem(key, String(now));
            window.location.reload();
          }
        } catch (e) {
          window.location.reload();
        }
      }
      await new Promise((r) => setTimeout(r, 400));
      return await factory();
    }
  });
}
const Unauthorized = lazyWithRetry(() => import("./pages/Unauthorized"));
const NotFoundPage = lazyWithRetry(() => import("./pages/Status/NotFoundPage"));
const ForbiddenPage = lazyWithRetry(() => import("./pages/Status/ForbiddenPage"));
const ServerErrorPage = lazyWithRetry(() => import("./pages/Status/ServerErrorPage"));
const MaintenancePage = lazyWithRetry(() => import("./pages/Status/MaintenancePage"));
const SubscriptionRequiredPage = lazyWithRetry(() => import("./pages/Status/SubscriptionRequiredPage"));
const SuperAdminDashboard = lazyWithRetry(() => import("./components/DashboardPages/SuperAdminDashboard"));
const StudentsPage = lazyWithRetry(() => import("./pages/Admin/students/StudentsPage"));
const AttendancePage = lazyWithRetry(() => import("./pages/Admin/students/AttendancePage"));
const StudentReportPage = lazyWithRetry(() => import("./pages/Admin/students/StudentReportPage"));
const StudentRegisterPage = lazyWithRetry(() => import("./pages/Admin/students/StudentRegisterPage"));
const FinancialRecords = lazyWithRetry(() => import("./pages/Admin/fianance/FinancialRecord"));
const AddResultV2Page = lazyWithRetry(() => import("./pages/Admin/StudentResult/AddResultV2Page"));
const AdminStudentResultLookupPage = lazyWithRetry(() => import("./pages/Admin/StudentResult/AdminStudentResultLookupPage"));
const ResultBatchSetupPage = lazyWithRetry(() => import("./pages/Admin/StudentResult/ResultBatchSetupPage"));
const ResultUploadPage = lazyWithRetry(() => import("./pages/Admin/StudentResult/ResultUploadPage"));
const AdminResultReviewPage = lazyWithRetry(() => import("./pages/Admin/StudentResult/AdminResultReviewPage"));
const ResultTemplateSettingsPage = lazyWithRetry(() => import("./pages/Admin/StudentResult/ResultTemplateSettingsPage"));
const ShowResult = lazyWithRetry(() => import("./pages/Admin/StudentResult/ShowResult"));
const AcademicCalendarPage = lazyWithRetry(() => import("./pages/Admin/Academics/AcademicCalendarPage"));
const PrivacyPolicyPage = lazyWithRetry(() => import("./pages/LegalPage").then(module => ({ default: module.PrivacyPolicyPage })));
const TermsAndConditionsPage = lazyWithRetry(() => import("./pages/LegalPage").then(module => ({ default: module.TermsAndConditionsPage })));
const BroadsheetPage = lazyWithRetry(() => import("./pages/Admin/StudentResult/BroadsheetPage"));
const LevelsPage = lazyWithRetry(() => import("./pages/Admin/Level/LevelsPage"));
const SubjectsPage = lazyWithRetry(() => import("./pages/Admin/Subjects/SubjectsPage"));
const DepartmentPage = lazyWithRetry(() => import("./pages/Admin/Academics/DepartmentPage"));
const SectionsPage = lazyWithRetry(() => import("./pages/Admin/Academics/SectionsPage"));
const FeeMethodsPage = lazyWithRetry(() => import("./pages/Admin/Fees/FeeMethodsPage"));
const FeeStructurePage = lazyWithRetry(() => import("./pages/Admin/Fees/FeeStructurePage"));
const StudentFeePaymentPage = lazyWithRetry(() => import("./pages/Admin/Fees/StudentFeePaymentPage"));
const ReceiptApprovalPage = lazyWithRetry(() => import("./pages/Admin/Fees/ReceiptApprovalPage"));
const SchoolFeesReportPage = lazyWithRetry(() => import("./pages/Admin/Fees/FeesReport"));
const SettingsPage = lazyWithRetry(() => import("./pages/Admin/School/SettingsPage"));
const PromoteStudentsPage = lazyWithRetry(() => import("./pages/Admin/students/PromoteStudentsPage"));
const BillingPage = lazyWithRetry(() => import("./pages/Admin/Billing/BillingPage"));
const CheckoutPage = lazyWithRetry(() => import("./pages/Admin/Billing/CheckoutPage"));
const SchoolProfitInvoicePaymentPage = lazyWithRetry(() => import("./pages/Admin/Billing/SchoolProfitInvoicePaymentPage"));
const WalletPage = lazyWithRetry(() => import("./pages/Admin/Wallet/WalletPage"));
const AdminUserDetailsPage = lazyWithRetry(() => import("./pages/Super-Admin/AdminUserDetailsPage"));
const SubscribersManagementPage = lazyWithRetry(() => import("./pages/Super-Admin/SubscribersManagementPage"));
const MarketingEmailPage = lazyWithRetry(() => import("./pages/Super-Admin/MarketingEmailPage"));
const SalesRepresentativesPage = lazyWithRetry(() => import("./pages/Super-Admin/SalesRepresentativesPage"));
const SalesLeadsManagementPage = lazyWithRetry(() => import("./pages/Super-Admin/SalesLeadsPage"));
const SalesPayoutsPage = lazyWithRetry(() => import("./pages/Super-Admin/SalesPayoutsPage"));
const PlatformStaffPage = lazyWithRetry(() => import("./pages/Super-Admin/PlatformStaffPage"));
const SubscriptionPlansPage = lazyWithRetry(() => import("./pages/Super-Admin/SubscriptionPlansPage"));
const BillingPolicyPage = lazyWithRetry(() => import("./pages/Super-Admin/BillingPolicyPage"));
const TwilioWhatsappPage = lazyWithRetry(() => import("./pages/Super-Admin/TwilioWhatsappPage"));
const BlogsPage = lazyWithRetry(() => import("./pages/Super-Admin/BlogsPage"));
const TestimonialsPage = lazyWithRetry(() => import("./pages/Super-Admin/TestimonialsPage"));
const StaffQrAttendancePage = lazyWithRetry(() => import("./pages/Admin/Biometric/StaffQrAttendancePage"));
const StaffAttendanceLogsPage = lazyWithRetry(() => import("./pages/Admin/Biometric/StaffAttendanceLogsPage"));
const StaffAttendanceSettingsPage = lazyWithRetry(() => import("./pages/Admin/Biometric/AttendanceSettingsPage"));
const TeachersPage = lazyWithRetry(() => import("./pages/Admin/Teacher/TeachersPage"));
const TeacherSubjectsPage = lazyWithRetry(() => import("./pages/Admin/Teacher/TeacherSubjectsPage"));
const ParentsPage = lazyWithRetry(() => import("./pages/Admin/Parent/ParentsPage"));
const StudentMyFeesPage = lazyWithRetry(() => import("./pages/Admin/students/StudentMyFeesPage"));
const StudentMySubjectsPage = lazyWithRetry(() => import("./pages/Admin/students/StudentMySubjectsPage"));
const ParentChildrenPage = lazyWithRetry(() => import("./pages/Admin/Parent/ParentChildrenPage"));
const SchoolBankAccountsPage = lazyWithRetry(() => import("./pages/Admin/School/SchoolBankAccountsPage"));
const SchoolOperatorsPage = lazyWithRetry(() => import("./pages/Admin/School/SchoolOperatorsPage"));
const ChildFeeDetailsPage = lazyWithRetry(() => import("./pages/Admin/Parent/ChildFeeDetailsPage"));
const ParentAttendancePage = lazyWithRetry(() => import("./pages/Admin/Parent/ParentAttendancePage"));
const ParentCommunicationPage = lazyWithRetry(() => import("./pages/Admin/Parent/ParentCommunicationPage"));
const ParentSchoolInfoPage = lazyWithRetry(() => import("./pages/Admin/Parent/ParentSchoolInfoPage"));
const ParentResultsPage = lazyWithRetry(() => import("./pages/Admin/Parent/ParentResultsPage"));
const ReceiptUploadPage = lazyWithRetry(() => import("./pages/Admin/Fees/ReceiptUploadPage"));
const ParentPaymentSummaryPage = lazyWithRetry(() => import("./pages/Admin/Parent/ParentPaymentSummaryPage"));
const ResultPinsPage = lazyWithRetry(() => import("./pages/Admin/StudentResult/ResultPinsPage"));
const CheckResultPage = lazyWithRetry(() => import("./pages/Admin/StudentResult/CheckResultPage"));
const VerifyResultPage = lazyWithRetry(() => import("./pages/VerifyResultPage"));
const OnboardingPage = lazyWithRetry(() => import("./pages/Onboarding/OnboardingPage"));
const ProfileSettingsPage = lazyWithRetry(() => import("./pages/ProfileSettingsPage"));
const NotificationsPage = lazyWithRetry(() => import("./pages/Notification/NotificationsPage"));
const InvoiceNotificationsPage = lazyWithRetry(() => import("./pages/Invoices/InvoiceNotificationsPage"));
const InvoiceNotificationDetailsPage = lazyWithRetry(() => import("./pages/Invoices/InvoiceNotificationDetailsPage"));
const PaymentInstructionsPage = lazyWithRetry(() => import("./pages/Invoices/PaymentInstructionsPage"));
const BookDemo = lazyWithRetry(() => import("./pages/Bookdemo"));
const DemoBookingsPage = lazyWithRetry(() => import("./pages/Super-Admin/DemoBookingsPage"));
const BursarsPage = lazyWithRetry(() => import("./pages/Admin/Bursar/BursarsPage"));
const ForgotPasswordPage = lazyWithRetry(() => import("./pages/Forgotpasswordpage"));
const ResetPasswordPage = lazyWithRetry(() => import("./pages/Resetpasswordpage"));
const ResultSubmissionDeadlinePage = lazyWithRetry(() => import("./pages/Admin/StudentResult/ResultSubmissionDeadlinePage"));
const ResultMonitoringPage = lazyWithRetry(() => import("./pages/Admin/StudentResult/Resultmonitoringpage"));
const CbtExamsPage = lazyWithRetry(() => import("./pages/Admin/CBT/CbtExamsPage"));
const StudentCbtExamsPage = lazyWithRetry(() => import("./pages/Student/CBT/StudentCbtExamsPage"));
const StudentLessonNotesPage = lazyWithRetry(() => import("./pages/Student/Lessons/StudentLessonNotesPage"));
const WhatsAppSettingsPage = lazyWithRetry(() => import("./pages/Admin/School/WhatsAppSettingsPage"));
const AiCreditsPage = lazyWithRetry(() => import("./pages/Admin/School/AiCreditsPage"));
const AiLessonPlanPage = lazyWithRetry(() => import("./pages/Admin/School/AiLessonPlanPage"));
const AiFeeCollectionAssistantPage = lazyWithRetry(() => import("./pages/Admin/Fees/AiFeeCollectionAssistantPage"));
const FeePolicyPage = lazyWithRetry(() => import("./pages/Admin/Fees/FeePolicyPage"));
const OnlinePayFeesPage = lazyWithRetry(() => import("./pages/Admin/Billing/OnlinePayFeesPage"));
const PublicFeePaymentPage = lazyWithRetry(() => import("./pages/PublicFeePaymentPage"));
const PublicCbtAccessPage = lazyWithRetry(() => import("./pages/PublicCbtAccessPage"));
const OfflineCbtRunnerPage = lazyWithRetry(() => import("./pages/OfflineCbtRunnerPage"));
const SalesLeadsPage = lazyWithRetry(() => import("./pages/Sales/SalesLeadsPage"));
const SalesCommissionsPage = lazyWithRetry(() => import("./pages/Sales/SalesCommissionsPage"));
const SalesPayoutSettingsPage = lazyWithRetry(() => import("./pages/Sales/SalesPayoutSettingsPage"));
const SalesMarketingKitPage = lazyWithRetry(() => import("./pages/Sales/SalesMarketingKitPage"));
const SalesMarketingMaterialsPage = lazyWithRetry(() => import("./pages/Super-Admin/SalesMarketingMaterialsPage"));
const PublicRepresentativeSalesPage = lazyWithRetry(() => import("./pages/PublicRepresentativeSalesPage"));
const PublicRepresentativeRegisterPage = lazyWithRetry(() => import("./pages/PublicRepresentativeRegisterPage"));
const ChangeInitialPasswordPage = lazyWithRetry(() => import("./pages/ChangeInitialPasswordPage"));
const SupportTicketsPage = lazyWithRetry(() => import("./pages/Support/SupportTicketsPage"));
const HostelManagementPage = lazyWithRetry(() => import("./pages/Admin/Hostel/HostelManagementPage"));
const TransportManagementPage = lazyWithRetry(() => import("./pages/Admin/Transport/TransportManagementPage"));
const WithdrawnStudentResultsPage = lazyWithRetry(() => import("./pages/Admin/StudentResult/WithdrawnStudentResultsPage"));
const TranscriptsPage = lazyWithRetry(() => import("./pages/Admin/StudentResult/TranscriptsPage"));
const NewsletterSubscribersPage = lazyWithRetry(() => import("./pages/Super-Admin/NewsletterSubscribersPage"));
const PublicBlogDetailPage = lazyWithRetry(() => import("./pages/PublicBlogDetailPage"));

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <FeatureProvider>
          <Suspense fallback={<Loader message="Preparing page..." />}>
        <Routes>
          {/*  PUBLIC ROUTES (NO GUARDS) */}
          <Route path="/" element={isCustomPortalHost() ? <Navigate to="/login" replace /> : <HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Signup />} />
          <Route path="/sales-representative/register" element={<PublicRepresentativeRegisterPage />} />
          <Route path="/become-a-partner" element={<PublicRepresentativeRegisterPage />} />
          <Route path="/sales-page/:code" element={<PublicRepresentativeSalesPage />} />
          <Route path="/check-result" element={<CheckResultPage />} />
          <Route path="/results/check" element={<CheckResultPage />} />
          <Route path="/results/check-result" element={<CheckResultPage />} />
          <Route path="/check-term-result" element={<CheckResultPage />} />
          <Route path="/student/check-result" element={<CheckResultPage />} />
          <Route path="/verify-result" element={<VerifyResultPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/payment-instructions/" element={<PaymentInstructionsPage />} />
          <Route path="/pay-school-fee" element={<PublicFeePaymentPage />} />
          <Route path="/pay-fees" element={<PublicFeePaymentPage />} />
          <Route path="/pay-fee" element={<PublicFeePaymentPage />} />
          <Route path="/payonline" element={<PublicFeePaymentPage />} />
          <Route path="/cbt/access" element={<PublicCbtAccessPage />} />
          <Route path="/cbt/offline-runner" element={<OfflineCbtRunnerPage />} />
          <Route path="/book-demo" element={<BookDemo />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
          <Route path="/blog/:slug" element={<PublicBlogDetailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/*  PROTECTED ROUTES (RequireAuth + OnboardingGuard) */}
          <Route
            path="/change-password"
            element={
              <RequireAuth roles={["Admin", "Sales-Representative", "Platform-Staff"]}>
                <ChangeInitialPasswordPage />
              </RequireAuth>
            }
          />

          <Route
            path="/onboarding"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingPage />
              </RequireAuth>
            }
          />

          <Route
            path="/support"
            element={
              <RequireAuth roles={["Admin", "Teacher", "Super-Admin", "Platform-Staff", "Student", "Parent", "Bursar", "Sales-Representative"]}>
                <SupportTicketsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/helpdesk"
            element={
              <RequireAuth roles={["Admin", "Teacher", "Super-Admin", "Platform-Staff", "Student", "Parent", "Bursar", "Sales-Representative"]}>
                <SupportTicketsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/contact-support"
            element={
              <RequireAuth roles={["Admin", "Teacher", "Super-Admin", "Platform-Staff", "Student", "Parent", "Bursar", "Sales-Representative"]}>
                <SupportTicketsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/hostels"
            element={
              <RequireAuth roles={["Admin"]}>
                <HostelManagementPage />
              </RequireAuth>
            }
          />
          <Route
            path="/transport"
            element={
              <RequireAuth roles={["Admin"]}>
                <TransportManagementPage />
              </RequireAuth>
            }
          />
          <Route
            path="/superadmin/support"
            element={
              <RequireAuth roles={["Super-Admin", "Platform-Staff"]} permissions={["support"]}>
                <SupportTicketsPage />
              </RequireAuth>
            }
          />

          <Route
            path="/dashboard"
            element={
              <RequireAuth roles={["Admin", "Teacher", "Super-Admin", "Platform-Staff", "Student", "Parent", "Bursar", "Sales-Representative"]}>
                <OnboardingGuard>
                  <Dashboard />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/results/deadlines"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <ResultSubmissionDeadlinePage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route path="/results/withdrawn-archive" element={<RequireAuth roles={["Admin"]}><OnboardingGuard><WithdrawnStudentResultsPage /></OnboardingGuard></RequireAuth>} />
          <Route path="/transcripts" element={<RequireAuth roles={["Admin"]}><OnboardingGuard><TranscriptsPage /></OnboardingGuard></RequireAuth>} />
             <Route
            path="/notifications"
            element={
              <RequireAuth roles={["Admin", "Teacher", "Super-Admin", "Platform-Staff", "Student", "Parent", "Bursar"]}>
                <OnboardingGuard>
                  <NotificationsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/students"
            element={
              <RequireAuth roles={["Admin", "Teacher"]}>
                <OnboardingGuard>
                  <StudentsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          
          <Route
            path="/bursar"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <BursarsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />


          <Route
            path="/students/attendance"
            element={
              <RequireAuth roles={["Admin", "Teacher"]}>
                <OnboardingGuard>
                  <AttendancePage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/students/report"
            element={
              <RequireAuth roles={["Admin", "Teacher"]}>
                <OnboardingGuard>
                  <StudentReportPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/students/register"
            element={
              <RequireAuth roles={["Admin", "Teacher"]}>
                <OnboardingGuard>
                  <StudentRegisterPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/students/promote"
            element={
              <RequireAuth roles={["Admin", "Teacher"]}>
                <OnboardingGuard>
                  <PromoteStudentsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/report/finance"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <FinancialRecords />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/students/results/add"
            element={
              <RequireAuth roles={["Admin", "Teacher"]}>
                <OnboardingGuard>
                  <AddResultV2Page />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/results/student-editor"
            element={
              <RequireAuth roles={["Admin", "Teacher", "Super-Admin", "Platform-Staff"]}>
                <OnboardingGuard>
                  <AdminStudentResultLookupPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/results/lookup"
            element={
              <RequireAuth roles={["Admin", "Teacher", "Super-Admin", "Platform-Staff"]}>
                <OnboardingGuard>
                  <AdminStudentResultLookupPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/students/results/edit"
            element={
              <RequireAuth roles={["Admin", "Teacher", "Super-Admin", "Platform-Staff"]}>
                <OnboardingGuard>
                  <AdminStudentResultLookupPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/result-editor"
            element={
              <RequireAuth roles={["Admin", "Teacher", "Super-Admin", "Platform-Staff"]}>
                <OnboardingGuard>
                  <AdminStudentResultLookupPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/students/results/lookup"
            element={
              <RequireAuth roles={["Admin", "Teacher", "Super-Admin", "Platform-Staff"]}>
                <OnboardingGuard>
                  <AdminStudentResultLookupPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/students/results/batch"
            element={
              <RequireAuth roles={["Admin", "Teacher"]}>
                <OnboardingGuard>
                  <ResultBatchSetupPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

             <Route
            path="/result/monitor"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <ResultMonitoringPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/results/review"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <AdminResultReviewPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/results/upload"
            element={
              <RequireAuth roles={["Admin", "Teacher"]}>
                <OnboardingGuard>
                  <ResultUploadPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/results/pins"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <ResultPinsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/admin/result-monitoring"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <Navigate to="/result/monitor" replace />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/admin/academic-alerts"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <Navigate to="/result/monitor" replace />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/results/design"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <ResultTemplateSettingsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/students/results/show"
            element={
              <RequireAuth roles={["Admin", "Teacher", "Student", "Parent", "Super Admin", "SuperAdmin"]}>
                <OnboardingGuard>
                  <ShowResult />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/show-result"
            element={
              <RequireAuth roles={["Admin", "Teacher", "Student", "Parent", "Super Admin", "SuperAdmin"]}>
                <OnboardingGuard>
                  <ShowResult />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/results/show"
            element={
              <RequireAuth roles={["Admin", "Teacher", "Student", "Parent", "Super Admin", "SuperAdmin"]}>
                <OnboardingGuard>
                  <ShowResult />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/results/show-result"
            element={
              <RequireAuth roles={["Admin", "Teacher", "Student", "Parent", "Super Admin", "SuperAdmin"]}>
                <OnboardingGuard>
                  <ShowResult />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/academics/calendar"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <AcademicCalendarPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/results/broadsheet"
            element={
              <RequireAuth roles={["Admin", "Teacher"]}>
                <OnboardingGuard>
                  <AdminResultReviewPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/results/broadsheet/:batchId"
            element={
              <RequireAuth roles={["Admin", "Teacher"]}>
                <OnboardingGuard>
                  <BroadsheetPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/cbt/exams"
            element={
              <RequireAuth roles={["Admin", "Teacher"]}>
                <OnboardingGuard>
                  <CbtExamsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/student/cbt/exams"
            element={
              <RequireAuth roles={["Student"]}>
                <OnboardingGuard>
                  <StudentCbtExamsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />          <Route
            path="/student/lesson-notes"
            element={
              <RequireAuth roles={["Student"]}>
                <OnboardingGuard>
                  <StudentLessonNotesPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/levels"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <LevelsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/subjects"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <SubjectsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/departments"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <DepartmentPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/sections"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <SectionsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/fees/methods"
            element={
              <RequireAuth roles={["Admin", "Bursar"]}>
                <OnboardingGuard>
                  <FeeMethodsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/fees/structure"
            element={
              <RequireAuth roles={["Admin", "Bursar"]}>
                <OnboardingGuard>
                  <FeeStructurePage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/invoice-notifications"
            element={
              <RequireAuth roles={["Parent"]}>
                <OnboardingGuard>
                  <InvoiceNotificationsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

                <Route
            path="/invoice-notifications/:id"
            element={
              <RequireAuth roles={["Parent"]}>
                <OnboardingGuard>
                  <InvoiceNotificationDetailsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

     

        


          <Route
            path="/fees/payments"
            element={
              <RequireAuth roles={["Admin", "Bursar"]}>
                <OnboardingGuard>
                  <StudentFeePaymentPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/fees/receipts/approval"
            element={
              <RequireAuth roles={["Admin", "Bursar"]}>
                <OnboardingGuard>
                  <ReceiptApprovalPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/fees/report"
            element={
              <RequireAuth roles={["Admin", "Bursar"]}>
                <OnboardingGuard>
                  <SchoolFeesReportPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/school/settings"
            element={
              <RequireAuth roles={["Admin", "Bursar"]}>
                <OnboardingGuard>
                  <SettingsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/settings"
            element={
              <RequireAuth roles={["Admin", "Bursar"]}>
                <OnboardingGuard>
                  <SettingsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/fees/policy"
            element={
              <RequireAuth roles={["Admin", "Bursar"]}>
                <OnboardingGuard>
                  <FeePolicyPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/settings/ai-credits"
            element={
              <RequireAuth roles={["Admin", "Teacher", "Bursar"]}>
                <OnboardingGuard>
                  <AiCreditsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />          <Route
            path="/settings/ai-lesson-plans"
            element={
              <RequireAuth roles={["Admin", "Teacher"]}>
                <OnboardingGuard>
                  <AiLessonPlanPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/fees/ai-collection"
            element={
              <RequireAuth roles={["Admin", "Bursar"]}>
                <OnboardingGuard>
                  <AiFeeCollectionAssistantPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/settings/whatsapp"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <WhatsAppSettingsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/school/bank-account-setting"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <SchoolBankAccountsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/school/operators"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <SchoolOperatorsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/school/operators"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <SchoolOperatorsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/scan-qr"
            element={
              <RequireAuth roles={["Admin", "Teacher"]}>
                <OnboardingGuard>
                  <StaffQrAttendancePage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/attendance/logs"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <StaffAttendanceLogsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/attendance/settings"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <StaffAttendanceSettingsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/teachers"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <TeachersPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/teacher-subjects"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <TeacherSubjectsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/parents"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <ParentsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/parent/children"
            element={
              <RequireAuth roles={["Parent"]}>
                <OnboardingGuard>
                  <ParentChildrenPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/parent/students/:studentId/fees"
            element={
              <RequireAuth roles={["Parent"]}>
                <OnboardingGuard>
                  <ChildFeeDetailsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/parent/upload-receipt"
            element={
              <RequireAuth roles={["Parent"]}>
                <OnboardingGuard>
                  <ReceiptUploadPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/parent/payments"
            element={
              <RequireAuth roles={["Parent"]}>
                <OnboardingGuard>
                  <ParentPaymentSummaryPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/parent/results"
            element={
              <RequireAuth roles={["Parent"]}>
                <OnboardingGuard>
                  <ParentResultsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/parent/students/:studentId/results"
            element={
              <RequireAuth roles={["Parent"]}>
                <OnboardingGuard>
                  <ParentResultsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/parent/attendance"
            element={
              <RequireAuth roles={["Parent"]}>
                <OnboardingGuard>
                  <ParentAttendancePage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/parent/attendance/history"
            element={
              <RequireAuth roles={["Parent"]}>
                <OnboardingGuard>
                  <ParentAttendancePage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/parent/communication"
            element={
              <RequireAuth roles={["Parent"]}>
                <OnboardingGuard>
                  <ParentCommunicationPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/parent/messages"
            element={
              <RequireAuth roles={["Parent"]}>
                <OnboardingGuard>
                  <ParentCommunicationPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/parent/announcements"
            element={
              <RequireAuth roles={["Parent"]}>
                <OnboardingGuard>
                  <ParentCommunicationPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/parent/calendar"
            element={
              <RequireAuth roles={["Parent"]}>
                <OnboardingGuard>
                  <ParentSchoolInfoPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/parent/events"
            element={
              <RequireAuth roles={["Parent"]}>
                <OnboardingGuard>
                  <ParentSchoolInfoPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/billing"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <BillingPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/billing/invoice-payment/:invoiceId"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <SchoolProfitInvoicePaymentPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          



          <Route
            path="/wallet"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <WalletPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/checkout"
            element={<Navigate to="/wallet" replace />}
          />
          <Route
            path="/subscriptions/checkout"
            element={<Navigate to="/wallet" replace />}
          />


          <Route
            path="/sales/leads"
            element={
              <RequireAuth roles={["Sales-Representative"]}>
                <OnboardingGuard>
                  <SalesLeadsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/sales/commissions"
            element={
              <RequireAuth roles={["Sales-Representative"]}>
                <OnboardingGuard>
                  <SalesCommissionsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/sales/payout-settings"
            element={
              <RequireAuth roles={["Sales-Representative"]}>
                <OnboardingGuard>
                  <SalesPayoutSettingsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/sales/marketing-kit"
            element={
              <RequireAuth roles={["Sales-Representative"]}>
                <OnboardingGuard>
                  <SalesMarketingKitPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          {/* Super Admin */}
          <Route
            path="/superadmin/subscribers"
            element={
              <RequireAuth roles={["Super-Admin", "Platform-Staff"]} permissions={["billing"]}>
                <OnboardingGuard>
                  <SubscribersManagementPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
              <Route
            path="/demo-bookers"
            element={
              <RequireAuth roles={["Super-Admin", "Platform-Staff"]} permissions={["sales"]}>
                <OnboardingGuard>
                  <DemoBookingsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/superadmin/platform-staff"
            element={
              <RequireAuth roles={["Super-Admin", "Platform-Staff"]} permissions={["staff"]}>
                <OnboardingGuard>
                  <PlatformStaffPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />          <Route
            path="/superadmin/sales-representatives"
            element={
              <RequireAuth roles={["Super-Admin", "Platform-Staff"]} permissions={["sales"]}>
                <OnboardingGuard>
                  <SalesRepresentativesPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/superadmin/sales-leads"
            element={
              <RequireAuth roles={["Super-Admin", "Platform-Staff"]} permissions={["sales"]}>
                <OnboardingGuard>
                  <SalesLeadsManagementPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />          <Route
            path="/superadmin/sales-payouts"
            element={
              <RequireAuth roles={["Super-Admin", "Platform-Staff"]} permissions={["finance"]}>
                <OnboardingGuard>
                  <SalesPayoutsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/superadmin/sales-marketing-materials"
            element={
              <RequireAuth roles={["Super-Admin", "Platform-Staff"]} permissions={["marketing"]}>
                <OnboardingGuard>
                  <SalesMarketingMaterialsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/superadmin/newsletter-subscribers"
            element={
              <RequireAuth roles={["Super-Admin", "Platform-Staff"]} permissions={["marketing"]}>
                <OnboardingGuard>
                  <NewsletterSubscribersPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/superadmin/send-message"
            element={
              <RequireAuth roles={["Super-Admin", "Platform-Staff"]} permissions={["marketing"]}>
                <OnboardingGuard>
                  <MarketingEmailPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/subplan"
            element={
              <RequireAuth roles={["Super-Admin", "Platform-Staff"]} permissions={["billing"]}>
                <OnboardingGuard>
                  <SubscriptionPlansPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/superadmin/billing-policy"
            element={
              <RequireAuth roles={["Super-Admin", "Platform-Staff"]} permissions={["billing"]}>
                <OnboardingGuard>
                  <BillingPolicyPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/superadmin/twilio-whatsapp"
            element={
              <RequireAuth roles={["Super-Admin", "Platform-Staff"]} permissions={["support"]}>
                <OnboardingGuard>
                  <TwilioWhatsappPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/blogs"
            element={
              <RequireAuth roles={["Super-Admin", "Platform-Staff"]} permissions={["content"]}>
                <OnboardingGuard>
                  <BlogsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/testimonials"
            element={
              <RequireAuth roles={["Super-Admin", "Platform-Staff"]} permissions={["content"]}>
                <OnboardingGuard>
                  <TestimonialsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/admin-users/view/:id"
            element={
              <RequireAuth roles={["Super-Admin", "Platform-Staff"]} permissions={["support"]}>
                <OnboardingGuard>
                  <AdminUserDetailsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/superadmin"
            element={
              <RequireAuth roles={["Super-Admin", "Platform-Staff"]}>
                <OnboardingGuard>
                  <SuperAdminDashboard />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/superadmin/dashboard"
            element={
              <RequireAuth roles={["Super-Admin", "Platform-Staff"]}>
                <OnboardingGuard>
                  <SuperAdminDashboard />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/superadmin/command-center"
            element={
              <RequireAuth roles={["Super-Admin", "Platform-Staff"]}>
                <OnboardingGuard>
                  <SuperAdminDashboard />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          {/* Student */}
          <Route
            path="/student/my-fees"
            element={
              <RequireAuth roles={["Student"]}>
                <OnboardingGuard>
                  <StudentMyFeesPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/student/my-subjects"
            element={
              <RequireAuth roles={["Student"]}>
                <OnboardingGuard>
                  <StudentMySubjectsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

             <Route
            path="/user/profile"
            element={
              <RequireAuth>
                <OnboardingGuard>
                  <ProfileSettingsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          {/* SaaS Status & Error Pages */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="/unauthorized" element={<ForbiddenPage />} />
          <Route path="/500" element={<ServerErrorPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/upgrade-required" element={<SubscriptionRequiredPage />} />

          {/* Wildcard 404 Catch-All */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
      </FeatureProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;





















