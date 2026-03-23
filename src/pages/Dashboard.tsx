import AdminDashboard from "../components/DashboardPages/AdminDasboard";
import TeacherDashboard from "../components/DashboardPages/TeacherDashboard";
import StudentDashboard from "../components/DashboardPages/StudentDashboard";
import { getUser } from "../utils/token";
import SuperAdminDashboard from "../components/DashboardPages/SuperAdminDashboard";
import ParentDashboardPage from "./Admin/Parent/ParentDashboardPage";
import BursarDashboard from "../components/DashboardPages/BursarDashboard";

export default function Dashboard() {
  const user = getUser();

  if (!user) {
    return (
      <div className="text-center mt-5">
        <h3>User not found. Please login again.</h3>
      </div>
    );
  }

  switch (user.role) {
    case "Admin":
      return (
        <div className="pt-5">
          <AdminDashboard />
        </div>
      );

     case "Super-Admin":
      return (
        <div className="pt-5">
          <SuperAdminDashboard />
        </div>
      );

    case "Teacher":
      return (
        <div className="pt-5">
          <TeacherDashboard />
        </div>
      );

    case "Student":
      return (
        <div className="pt-5">
          <StudentDashboard />
        </div>
      );
    
       case "Bursar":
      return (
        <div className="pt-5">
          <BursarDashboard />
        </div>
      );

       case "Parent":
      return (
        <div className="pt-5">
          <ParentDashboardPage />
        </div>
      );

    default:
      return (
        <div className="text-center mt-5">
          <h3>Unauthorized role. Please contact admin.</h3>
        </div>
      );
  }
}
