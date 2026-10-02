import AdminDashboard from "../components/DashboardPages/AdminDasboard";
import TeacherDashboard from "../components/DashboardPages/TeacherDashboard";
import StudentDashboard from "../components/DashboardPages/StudentDashboard";
import { getUser } from "../utils/token";
import SuperAdminDashboard from "../components/DashboardPages/SuperAdminDashboard";
import ParentDashboardPage from "./Admin/Parent/ParentDashboardPage";
import BursarDashboard from "../components/DashboardPages/BursarDashboard";
import SalesDashboardPage from "./Sales/SalesDashboardPage";

export default function Dashboard() {
  const user = getUser();

  if (!user) {
    return (
      <div className="text-center mt-5">
        <h3>User not found. Please login again.</h3>
      </div>
    );
  }

  const role = (user.normalized_role || user.role || "")
    .toLowerCase()
    .replace(/[\s-]/g, "_");

  switch (role) {
    case "super_admin":
    case "superadmin":
    case "platform_staff":
    case "platformstaff":
      return (
        <div className="pt-5">
          <SuperAdminDashboard />
        </div>
      );

    case "admin":
    case "proprietor":
    case "owner":
    case "principal":
    case "operator":
    case "registrar":
    case "secretary":
      return (
        <div className="pt-5">
          <AdminDashboard />
        </div>
      );

    case "teacher":
    case "class_teacher":
    case "subject_teacher":
      return (
        <div className="pt-5">
          <TeacherDashboard />
        </div>
      );

    case "student":
    case "pupil":
      return (
        <div className="pt-5">
          <StudentDashboard />
        </div>
      );

    case "bursar":
    case "accountant":
      return (
        <div className="pt-5">
          <BursarDashboard />
        </div>
      );

    case "parent":
    case "guardian":
      return (
        <div className="pt-5">
          <ParentDashboardPage />
        </div>
      );

    case "sales_representative":
    case "sales_rep":
    case "salesrep":
      return (
        <div className="pt-5">
          <SalesDashboardPage />
        </div>
      );

    default:
      return (
        <div className="text-center mt-5">
          <h3>Unauthorized role ({user.role}). Please contact admin.</h3>
        </div>
      );
  }
}
