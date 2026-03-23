import { BrowserRouter, Routes, Route } from "react-router-dom";
import "aos/dist/aos.css";
import Login from "./pages/login";
import HomePage from "./pages/HomePage";
import Signup from "./pages/signup";
import Dashboard from "./pages/Dashboard";
import RequireAuth from "./auth/RequireAuth";
import Unauthorized from "./pages/Unauthorized";

import StudentsPage from "./pages/Admin/students/StudentsPage";
import AttendancePage from "./pages/Admin/students/AttendancePage";
import StudentReportPage from "./pages/Admin/students/StudentReportPage";
import StudentRegisterPage from "./pages/Admin/students/StudentRegisterPage";
import FinancialRecords from "./pages/Admin/fianance/FinancialRecord";
import AddResultV2Page from "./pages/Admin/StudentResult/AddResultV2Page";
import ResultBatchSetupPage from "./pages/Admin/StudentResult/ResultBatchSetupPage";
import ResultUploadPage from "./pages/Admin/StudentResult/ResultUploadPage";
import ShowResult from "./pages/Admin/StudentResult/ShowResult";
import TermsPage from "./pages/Admin/Academics/AcademicCalendarPage";
import BroadsheetPage from "./pages/Admin/StudentResult/BroadsheetPage";
import LevelsPage from "./pages/Admin/Level/LevelsPage";
import SubjectsPage from "./pages/Admin/Subjects/SubjectsPage";
import DepartmentPage from "./pages/Admin/Academics/DepartmentPage";
import SectionsPage from "./pages/Admin/Academics/SectionsPage";
import FeeMethodsPage from "./pages/Admin/Fees/FeeMethodsPage";
import FeeStructurePage from "./pages/Admin/Fees/FeeStructurePage";
import StudentFeePaymentPage from "./pages/Admin/Fees/StudentFeePaymentPage";
import ReceiptApprovalPage from "./pages/Admin/Fees/ReceiptApprovalPage";
import SchoolFeesReportPage from "./pages/Admin/Fees/FeesReport";
import SettingsPage from "./pages/Admin/School/SettingsPage";
import PromoteStudentsPage from "./pages/Admin/students/PromoteStudentsPage";
import BillingPage from "./pages/Admin/Billing/BillingPage";
import CheckoutPage from "./pages/Admin/Billing/CheckoutPage";
import WalletPage from "./pages/Admin/Wallet/WalletPage";
import AdminUserDetailsPage from "./pages/Super-Admin/AdminUserDetailsPage";
import SubscribersManagementPage from "./pages/Super-Admin/SubscribersManagementPage";
import MarketingEmailPage from "./pages/Super-Admin/MarketingEmailPage";
import SubscriptionPlansPage from "./pages/Super-Admin/SubscriptionPlansPage";
import BlogsPage from "./pages/Super-Admin/BlogsPage";
import TestimonialsPage from "./pages/Super-Admin/TestimonialsPage";
import BiometricGeneratePage from "./pages/Admin/Biometric/BiometricGeneratePage";
import StaffQrAttendancePage from "./pages/Admin/Biometric/StaffQrAttendancePage";
import StaffAttendanceLogsPage from "./pages/Admin/Biometric/StaffAttendanceLogsPage";
import StaffAttendanceSettingsPage from "./pages/Admin/Biometric/AttendanceSettingsPage";
import TeachersPage from "./pages/Admin/Teacher/TeachersPage";
import TeacherSubjectsPage from "./pages/Admin/Teacher/TeacherSubjectsPage";
import ParentsPage from "./pages/Admin/Parent/ParentsPage";
import StudentMyFeesPage from "./pages/Admin/students/StudentMyFeesPage";
import StudentMySubjectsPage from "./pages/Admin/students/StudentMySubjectsPage";
import ParentChildrenPage from "./pages/Admin/Parent/ParentChildrenPage";
import SchoolBankAccountsPage from "./pages/Admin/School/SchoolBankAccountsPage";
import ChildFeeDetailsPage from "./pages/Admin/Parent/ChildFeeDetailsPage";
import ReceiptUploadPage from "./pages/Admin/Fees/ReceiptUploadPage";
import ParentPaymentSummaryPage from "./pages/Admin/Parent/ParentPaymentSummaryPage";
import ResultPinsPage from "./pages/Admin/StudentResult/ResultPinsPage";
import CheckResultPage from "./pages/Admin/StudentResult/CheckResultPage";

import { FeatureProvider } from "./contexts/FeatureContext";
import OnboardingPage from "./pages/Onboarding/OnboardingPage";
import OnboardingGuard from "./auth/OnboardingGuard";
import ProfileSettingsPage from "./pages/ProfileSettingsPage";
import NotificationsPage from "./pages/Notification/NotificationsPage";
import InvoiceNotificationsPage from "./pages/Invoices/InvoiceNotificationsPage";
import InvoiceNotificationDetailsPage from "./pages/Invoices/InvoiceNotificationDetailsPage";
import PaymentInstructionsPage from "./pages/Invoices/PaymentInstructionsPage";
import BookDemo from "./pages/Bookdemo ";
import DemoBookingsPage from "./pages/Super-Admin/DemoBookingsPage";
import BursarsPage from "./pages/Admin/Bursar/BursarsPage";
import ForgotPasswordPage from "./pages/Forgotpasswordpage";
import ResetPasswordPage from "./pages/Resetpasswordpage";
import ResultSubmissionDeadlinePage from "./pages/Admin/StudentResult/ResultSubmissionDeadlinePage";
import SchoolWhatsappSettingsPage from "./pages/Admin/School/SchoolWhatsappSettingsPage";
import ParentWhatsappVerificationPage from "./pages/Admin/Parent/ParentWhatsappVerificationPage";

function App() {
  return (
    <BrowserRouter>
      <FeatureProvider>
        <Routes>
          {/* ✅ PUBLIC ROUTES (NO GUARDS) */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Signup />} />
          <Route path="/check-result" element={<CheckResultPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/payment-instructions/" element={<PaymentInstructionsPage />} />
          <Route path="/book-demo" element={<BookDemo />} />
           <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* ✅ PROTECTED ROUTES (RequireAuth + OnboardingGuard) */}
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
              <RequireAuth roles={["Admin", "Teacher", "Super-Admin", "Student", "Parent", "Bursar"]}>
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
            path="/settings/school-wp-settings"
            element={
              <RequireAuth roles={["Super-Admin"]}>
                <OnboardingGuard>
                  <SchoolWhatsappSettingsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

            <Route
            path="/settings/parent-wp-verification"
            element={
              <RequireAuth roles={["Super-Admin"]}>
                <OnboardingGuard>
                  <ParentWhatsappVerificationPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />


             <Route
            path="/notifications"
            element={
              <RequireAuth roles={["Admin", "Teacher", "Super-Admin", "Student", "Parent", "Bursar"]}>
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
            path="/students/results/show"
            element={
              <RequireAuth roles={["Admin", "Teacher"]}>
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
            path="/qr-code"
            element={
              <RequireAuth roles={["Admin"]}>
                <OnboardingGuard>
                  <BiometricGeneratePage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />

          <Route
            path="/scan-qr"
            element={
              <RequireAuth roles={["Admin"]}>
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

          {/* Super Admin */}
          <Route
            path="/superadmin/subscribers"
            element={
              <RequireAuth roles={["Super-Admin"]}>
                <OnboardingGuard>
                  <SubscribersManagementPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
              <Route
            path="/demo-bookers"
            element={
              <RequireAuth roles={["Super-Admin"]}>
                <OnboardingGuard>
                  <DemoBookingsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/superadmin/send-message"
            element={
              <RequireAuth roles={["Super-Admin"]}>
                <OnboardingGuard>
                  <MarketingEmailPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/subplan"
            element={
              <RequireAuth roles={["Super-Admin"]}>
                <OnboardingGuard>
                  <SubscriptionPlansPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/blogs"
            element={
              <RequireAuth roles={["Super-Admin"]}>
                <OnboardingGuard>
                  <BlogsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/testimonials"
            element={
              <RequireAuth roles={["Super-Admin"]}>
                <OnboardingGuard>
                  <TestimonialsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/admin-users/view/:id"
            element={
              <RequireAuth roles={["Super-Admin"]}>
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
              <RequireAuth roles={["Student", "Parent", "Teacher", "Admin", "Bursar", "Super-Admin"]}>
                <OnboardingGuard>
                  <ProfileSettingsPage />
                </OnboardingGuard>
              </RequireAuth>
            }
          />
        </Routes>
      </FeatureProvider>
    </BrowserRouter>
  );
}

export default App;