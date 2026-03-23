import { useNavigate } from "react-router-dom";
import { getUser } from "../utils/token";

export default function Unauthorized() {
  const navigate = useNavigate();
  const user = getUser(); 
  // console.log(user);

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card shadow-lg p-5 text-center">
        <div className="mb-4">
          <i className="bi bi-shield-exclamation display-1 text-danger"></i>
        </div>
        <h1 className="display-1 fw-bold text-danger">403</h1>
        <h3 className="mb-3">Access Denied</h3>
        <p className="text-muted mb-2">
          You do not have permission to view this page.
        </p>

      

        <button
          className="btn btn-primary btn-lg mt-3"
          onClick={() => navigate("/dashboard")}
        >
          <i className="bi bi-house-door-fill me-2"></i> Go to Home
        </button>
      </div>
    </div>
  );
}
