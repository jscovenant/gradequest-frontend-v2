import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "aos/dist/aos.css";
import RequireAuth from "./auth/RequireAuth";
import { FeatureProvider } from "./contexts/FeatureContext";
import OnboardingGuard from "./auth/OnboardingGuard";
import Loader from "./components/ui/dashboardLoader";

const Login = lazy(() => import("./pages/login"));
const HomePage = lazy(() => import("./pages/HomePage"));
const Signup = lazy(() => import("./pages/signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));
const StudentsPage = lazy(() => import("./pages/Admin/students/StudentsPage"));
const AttendancePage = lazy(() => import("./pages/Admin/students/AttendancePage"));
const StudentReportPage = lazy(() => import("./pages/Admin/students/StudentReportPage"));
const StudentRegisterPage = lazy(() => import("./pages/Admin/students/StudentRegisterPage"));
const FinancialRecords = lazy(() => import("./pages/Admin/fianance/FinancialRecord"));
const AddResultV2Page = lazy(() => import("./pages/Admin/StudentResult/AddResultV2Page"));
const ResultBatchSetupPage = lazy(() => import("./pages/Admin/StudentResult/ResultBatchSetupPage"));
const ResultUploadPage = lazy(() => import("./pages/Admin/StudentResult/ResultUploadPage"));
const AdminResultReviewPage = lazy(() => import("./pages/Admin/StudentResult/AdminResultReviewPage"));
const ResultTemplateSettingsPage = lazy(() => import("./pages/Admin/StudentResult/ResultTemplateSettingsPage"));
const ShowResult = lazy(() => import("./pages/Admin/StudentResult/ShowResult"));
const TermsPage = lazy(() => import("./pages/Admin/Academics/AcademicCalendarPage"));
const BroadsheetPage = lazy(() => import("./pages/Admin/StudentResult/BroadsheetPage"));
const LevelsPage = lazy(() => import("./pages/Admin/Level/LevelsPage"));
const SubjectsPage = lazy(() => import("./pages/Admin/Subjects/SubjectsPage"));
const DepartmentPage = lazy(() => import("./pages/Admin/Academics/DepartmentPage"));
const SectionsPage = lazy(() => import("./pages/Admin/Academics/SectionsPage"));
const FeeMethodsPage = lazy(() => import("./pages/Admin/Fees/FeeMethodsPage"));
const FeeStructurePage = lazy(() => import("./pages/Admin/Fees/FeeStructurePage"));
const StudentFeePaymentPage = lazy(() => import("./pages/Admin/Fees/StudentFeePaymentPage"));
const ReceiptApprovalPage = lazy(() => import("./pages/Admin/Fees/ReceiptApprovalPage"));
const SchoolFeesReportPage = lazy(() => import("./pages/Admin/Fees/FeesReport"));
const SettingsPage = lazy(() => import("./pages/Admin/School/SettingsPage"));
const PromoteStudentsPage = lazy(() => import("./pages/Admin/students/PromoteStudentsPage"));
const BillingPage = lazy(() => import("./pages/Admin/Billing/BillingPage"));
const CheckoutPage = lazy(() => import("./pages/Admin/Billing/CheckoutPage"));
const GradequestInvoicePaymentPage = lazy(() => import("./pages/Admin/Billing/GradequestInvoicePaymentPage"));
const WalletPage = lazy(() => import("./pages/Admin/Wallet/WalletPage"));
const AdminUserDetailsPage = lazy(() => import("./pages/Super-Admin/AdminUserDetailsPage"));
const SubscribersManagementPage = lazy(() => import("./pages/Super-Admin/SubscribersManagementPage"));
const MarketingEmailPage = lazy(() => import("./pages/Super-Admin/MarketingEmailPage"));
const SalesRepresentativesPage = lazy(() => import("./pages/Super-Admin/SalesRepresentativesPage"));
const SalesLeadsManagementPage = lazy(() => import("./pages/Super-Admin/SalesLeadsPage"));
const SalesPayoutsPage = lazy(() => import("./pages/Super-Admin/SalesPayoutsPage"));
const PlatformStaffPage = lazy(() => import("./pages/Super-Admin/PlatformStaffPage"));
const SubscriptionPlansPage = lazy(() => import("./pages/Super-Admin/SubscriptionPlansPage"));
const BillingPolicyPage = lazy(() => import("./pages/Super-Admin/BillingPolicyPage"));
const TwilioWhatsappPage = lazy(() => import("./pages/Super-Admin/TwilioWhatsappPage"));
const BlogsPage = lazy(() => import("./pages/Super-Admin/BlogsPage"));
const TestimonialsPage = lazy(() => import("./pages/Super-Admin/TestimonialsPage"));
const StaffQrAttendancePage = lazy(() => import("./pages/Admin/Biometric/StaffQrAttendancePage"));
const StaffAttendanceLogsPage = lazy(() => import("./pages/Admin/Biometric/StaffAttendanceLogsPage"));
const StaffAttendanceSettingsPage = lazy(() => import("./pages/Admin/Biometric/AttendanceSettingsPage"));
const TeachersPage = lazy(() => import("./pages/Admin/Teacher/TeachersPage"));
const TeacherSubjectsPage = lazy(() => import("./pages/Admin/Teacher/TeacherSubjectsPage"));
const ParentsPage = lazy(() => import("./pages/Admin/Parent/ParentsPage"));
const StudentMyFeesPage = lazy(() => import("./pages/Admin/students/StudentMyFeesPage"));
const StudentMySubjectsPage = lazy(() => import("./pages/Admin/students/StudentMySubjectsPage"));
const ParentChildrenPage = lazy(() => import("./pages/Admin/Parent/ParentChildrenPage"));
const SchoolBankAccountsPage = lazy(() => import("./pages/Admin/School/SchoolBankAccountsPage"));
const ChildFeeDetailsPage = lazy(() => import("./pages/Admin/Parent/ChildFeeDetailsPage"));
const ReceiptUploadPage = lazy(() => import("./pages/Admin/Fees/ReceiptUploadPage"));
const ParentPaymentSummaryPage = lazy(() => import("./pages/Admin/Parent/ParentPaymentSummaryPage"));
const ResultPinsPage = lazy(() => import("./pages/Admin/StudentResult/ResultPinsPage"));
const CheckResultPage = lazy(() => import("./pages/Admin/StudentResult/CheckResultPage"));
const OnboardingPage = lazy(() => import("./pages/Onboarding/OnboardingPage"));
const ProfileSettingsPage = lazy(() => import("./pages/ProfileSettingsPage"));
const NotificationsPage = lazy(() => import("./pages/Notification/NotificationsPage"));
const InvoiceNotificationsPage = lazy(() => import("./pages/Invoices/InvoiceNotificationsPage"));
const InvoiceNotificationDetailsPage = lazy(() => import("./pages/Invoices/InvoiceNotificationDetailsPage"));
const PaymentInstructionsPage = lazy(() => import("./pages/Invoices/PaymentInstructionsPage"));
const BookDemo = lazy(() => import("./pages/Bookdemo "));
const DemoBookingsPage = lazy(() => import("./pages/Super-Admin/DemoBookingsPage"));
const BursarsPage = lazy(() => import("./pages/Admin/Bursar/BursarsPage"));
const ForgotPasswordPage = lazy(() => import("./pages/Forgotpasswordpage"));
const ResetPasswordPage = lazy(() => import("./pages/Resetpasswordpage"));
const ResultSubmissionDeadlinePage = lazy(() => import("./pages/Admin/StudentResult/ResultSubmissionDeadlinePage"));
const ResultMonitoringPage = lazy(() => import("./pages/Admin/StudentResult/Resultmonitoringpage"));
const CbtExamsPage = lazy(() => import("./pages/Admin/CBT/CbtExamsPage"));
const StudentCbtExamsPage = lazy(() => import("./pages/Student/CBT/StudentCbtExamsPage"));
const WhatsAppSettingsPage = lazy(() => import("./pages/Admin/School/WhatsAppSettingsPage"));
const OnlinePayFeesPage = lazy(() => import("./pages/Admin/Billing/OnlinePayFeesPage"));
const PublicFeePaymentPage = lazy(() => import("./pages/PublicFeePaymentPage"));
const PublicCbtAccessPage = lazy(() => import("./pages/PublicCbtAccessPage"));
const OfflineCbtRunnerPage = lazy(() => import("./pages/OfflineCbtRunnerPage"));
const SalesLeadsPage = lazy(() => import("./pages/Sales/SalesLeadsPage"));
const SalesCommissionsPage = lazy(() => import("./pages/Sales/SalesCommissionsPage"));
const SalesPayoutSettingsPage = lazy(() => import("./pages/Sales/SalesPayoutSettingsPage"));
const ChangeInitialPasswordPage = lazy(() => import("./pages/ChangeInitialPasswordPage"));

function App() {
  return (
    <BrowserRouter>
      <FeatureProvider>
        <Suspense fallback={<Loader message="Preparing page..." />}>
        <Routes>
          {/* Ã¢Å“â€¦ PUBLIC ROUTES (NO GUARDS) */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Signup />} />
          <Route path="/check-result" element={<CheckResultPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/payment-instructions/" element={<PaymentInstructionsPage />} />
          <Route path="/pay-school-fee" element={<PublicFeePaymentPage />} />
          <Route path="/cbt/access" element={<PublicCbtAccessPage />} />
          <Route path="/cbt/offline-runner" element={<OfflineCbtRunnerPage />} />
          <Route path="/book-demo" element={<BookDemo />} />
           <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Ã¢Å“â€¦ PROTECTED ROUTES (RequireAuth + OnboardingGuard) */}
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
              <RequireAuth roles={["Admin", "Teacher", "Student"]}>
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
                  <TermsPage />
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
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <SettingsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

            <Route
            path="/school/settings"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <SettingsPage />
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
            path="/teacher/subjects"
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
                  <GradequestInvoicePaymentPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          
          <Route
            path="/payonline"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <OnlinePayFeesPage studentFeeId={123} studentName="John Doe" termLabel="First Term, 2025/2026" balanceDue={5000} />
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
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <CheckoutPage />
                </OnboardingGuard>
              </RequireAuth>
            }
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
              <RequireAuth roles={["Student", "Parent", "Teacher", "Admin", "Bursar", "Super-Admin", "Platform-Staff", "Sales-Representative"]}>
                <OnboardingGuard>
                  <ProfileSettingsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />


     

        </Routes>
        </Suspense>
      </FeatureProvider>
    </BrowserRouter>
  );
}

export default App;

















