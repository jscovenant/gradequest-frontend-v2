import { useEffect, useMemo, useRef, useState } from "react";
import TopNav from "../components/LayoutComponents/TopNav";
import Sidebar from "../components/LayoutComponents/Sidebar";
import Footer from "../components/LayoutComponents/Footer";
import Loader from "../components/ui/dashboardLoader";
import { authApi } from "../utils/axios";
import { useToast } from "../contexts/ToastContext";
import { getUser, setUser as setStoredUser } from "../utils/token";

type UserProfile = {
  id: number;
  firstname?: string;
  surname?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  photo?: string | null;
  role?: string;
  school_id?: number | null;
  created_at?: string;
};

function roleIsStudent(role?: string) {
  return (role || "").toLowerCase() === "student";
}

function roleIsAdmin(role?: string) {
  const r = (role || "").toLowerCase();
  return r === "admin" || r === "superadmin" || r === "super-admin" || r === "owner";
}

export default function ProfileSettingsPage() {
  const { showToast } = useToast();

  // Layout state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Loading state
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);

  // User Data
  const [user, setUser] = useState<UserProfile | null>(null);

  // Form State
  const [firstname, setFirstname] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Photo
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Password Form
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const isStudent = useMemo(() => roleIsStudent(user?.role), [user?.role]);
  const isAdmin = useMemo(() => roleIsAdmin(user?.role), [user?.role]);

  const canEditProfile = useMemo(() => !isStudent, [isStudent]);
  const canEditEmail = useMemo(() => !isStudent && !isAdmin, [isStudent, isAdmin]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await authApi.get<UserProfile>("/user-profile");
      const u = res.data;

      setUser(u);
      setFirstname(u.firstname || "");
      setSurname(u.surname || "");
      setEmail(u.email || "");
      setPhone(u.phone || "");
      setAddress(u.address || "");
      setPhotoPreview(u.photo || null);

      // Sync with stored user
      const currentUser = getUser();
      if (currentUser) {
        setStoredUser({
          ...currentUser,
          firstname: u.firstname || currentUser.firstname,
          surname: u.surname || currentUser.surname,
          email: u.email || currentUser.email,
          photo_url: u.photo || currentUser.photo_url,
        });
      }
    } catch (e: any) {
      // Fallback to local session user if API had any hiccup
      const local = getUser();
      if (local) {
        setUser(local as any);
        setFirstname(local.firstname || "");
        setSurname(local.surname || "");
        setEmail(local.email || "");
        setPhone(local.phone || "");
        setAddress(local.address || "");
        setPhotoPreview(local.photo_url || null);
      } else {
        showToast(e?.response?.data?.message || "Failed to load profile.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const pickPhoto = () => {
    if (!canEditProfile) return;
    fileInputRef.current?.click();
  };

  const onPhotoChange = (file: File | null) => {
    if (!file) return;
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const resetPhotoSelection = () => {
    setPhotoFile(null);
    setPhotoPreview(user?.photo || null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSaveProfile = async () => {
    if (!canEditProfile) return;

    if (!firstname.trim() || !surname.trim()) {
      showToast("Firstname and surname are required.", "error");
      return;
    }

    const emailToSend = (canEditEmail ? email : user?.email) || email;

    setSavingProfile(true);
    try {
      const fd = new FormData();
      fd.append("firstname", firstname.trim());
      fd.append("surname", surname.trim());
      fd.append("email", emailToSend.trim());
      fd.append("phone", phone.trim());
      fd.append("address", address.trim());
      if (photoFile) fd.append("photo", photoFile);

      // Method spoofing for PUT
      fd.append("_method", "PUT");

      const res = await authApi.post<UserProfile>("/user-profile/update", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUser(res.data);
      showToast("Profile information updated successfully! ✅", "success");
      setPhotoFile(null);
      setPhotoPreview(res.data.photo || photoPreview);

      // Update cached session
      const currentUser = getUser();
      if (currentUser) {
        setStoredUser({
          ...currentUser,
          firstname: res.data.firstname || currentUser.firstname,
          surname: res.data.surname || currentUser.surname,
          email: res.data.email || currentUser.email,
          photo_url: res.data.photo || currentUser.photo_url,
        });
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.data?.errors ? "Please fix validation errors." : "Failed to update profile.");
      showToast(msg, "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!window.confirm("Are you sure you want to log out all other devices and staff assistants?\n\nAll other active login sessions will be terminated immediately.")) {
      return;
    }
    setRevokingSessions(true);
    try {
      const res = await authApi.post("/security/sessions/revoke-all");
      showToast(res.data?.message || "All other active sessions have been revoked successfully.", "success");
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to revoke active sessions.", "error");
    } finally {
      setRevokingSessions(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!oldPassword || !newPassword || !newPasswordConfirm) {
      showToast("Please fill in all password fields.", "error");
      return;
    }
    if (newPassword.length < 8) {
      showToast("New password must be at least 8 characters.", "error");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      showToast("New password confirmation does not match.", "error");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await authApi.post("/user/update-password", {
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirm,
      });

      showToast(res?.data?.message || "Password updated successfully! ✅", "success");
      setOldPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.data?.errors ? "Password validation failed." : "Failed to update password.");
      showToast(msg, "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const getInitials = (f?: string, s?: string) => {
    const p1 = (f || "").trim().charAt(0).toUpperCase();
    const p2 = (s || "").trim().charAt(0).toUpperCase();
    return p1 + p2 || "GQ";
  };

  const profileStyles = `
    .gq-profile-main {
      min-height: 100vh;
      margin-left: 280px;
      width: calc(100% - 280px);
      padding: max(96px, calc(78px + env(safe-area-inset-top))) 28px 40px;
      background: #F8FAFC;
      color: #0F172A;
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    }

    .gq-profile-shell {
      width: 100%;
      max-width: 1280px;
      margin: 0 auto;
    }

    /* ── Hero Banner ── */
    .gq-profile-hero {
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 20px;
      padding: 32px 36px;
      margin-bottom: 28px;
      border-radius: 20px;
      color: #FFFFFF;
      background: linear-gradient(135deg, #0A192F 0%, #0F2744 55%, #1E3A8A 100%);
      box-shadow: 0 16px 40px rgba(15, 39, 68, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .gq-profile-hero::after {
      content: "";
      position: absolute;
      width: 320px;
      height: 320px;
      right: -80px;
      top: -120px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, transparent 70%);
      pointer-events: none;
    }

    .gq-profile-hero-copy {
      position: relative;
      z-index: 1;
    }

    .gq-profile-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #FBBF24;
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: .16em;
      text-transform: uppercase;
      background: rgba(251, 191, 36, 0.15);
      border: 1px solid rgba(251, 191, 36, 0.3);
      padding: 4px 14px;
      border-radius: 999px;
      margin-bottom: 12px;
    }

    .gq-profile-hero h1 {
      margin: 0 0 8px;
      font-size: clamp(26px, 3.2vw, 36px);
      font-weight: 900;
      letter-spacing: -.02em;
      color: #FFFFFF;
    }

    .gq-profile-hero p {
      margin: 0;
      max-width: 620px;
      color: #CBD5E1;
      font-size: 14.5px;
      line-height: 1.6;
    }

    .gq-btn-refresh-profile {
      border: 1px solid rgba(255, 255, 255, 0.25) !important;
      background: rgba(255, 255, 255, 0.1) !important;
      color: #FFFFFF !important;
      font-weight: 700 !important;
      font-size: 13.5px !important;
      padding: 10px 18px !important;
      border-radius: 10px !important;
      transition: all 0.2s ease !important;
      white-space: nowrap;
    }

    .gq-btn-refresh-profile:hover {
      background: rgba(255, 255, 255, 0.2) !important;
      border-color: rgba(255, 255, 255, 0.4) !important;
      transform: translateY(-1px);
    }

    /* ── Cards ── */
    .gq-card-box {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(15, 39, 68, 0.05);
      padding: 28px;
      margin-bottom: 24px;
      transition: all 0.2s ease;
    }

    .gq-card-box:hover {
      box-shadow: 0 10px 30px rgba(15, 39, 68, 0.08);
      border-color: #CBD5E1;
    }

    .gq-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 14px;
      padding-bottom: 20px;
      margin-bottom: 24px;
      border-bottom: 1px solid #F1F5F9;
    }

    .gq-card-header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .gq-icon-badge {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }

    .gq-card-title {
      font-size: 18px;
      font-weight: 800;
      color: #0F2744;
      margin: 0;
    }

    .gq-card-subtitle {
      font-size: 13px;
      color: #64748B;
      margin: 2px 0 0;
    }

    /* ── Avatar Section ── */
    .gq-avatar-upload-wrap {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 18px 22px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .gq-avatar-preview {
      width: 76px;
      height: 76px;
      border-radius: 18px;
      object-fit: cover;
      border: 3px solid #FFFFFF;
      box-shadow: 0 6px 18px rgba(15, 39, 68, 0.15);
      background: linear-gradient(135deg, #0F2744 0%, #1E3A8A 100%);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      font-weight: 800;
      flex-shrink: 0;
    }

    /* ── Form Controls ── */
    .gq-form-label {
      display: block;
      font-size: 12.5px;
      font-weight: 700;
      color: #1E293B;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .gq-form-input {
      width: 100%;
      min-height: 46px;
      padding: 10px 14px;
      border: 1.5px solid #CBD5E1;
      border-radius: 10px;
      font-size: 14px;
      color: #0F172A;
      background: #FFFFFF;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .gq-form-input:focus {
      outline: none;
      border-color: #1D4ED8;
      box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.12);
    }

    .gq-form-input:disabled, .gq-form-input[readonly] {
      background: #F1F5F9;
      color: #64748B;
      cursor: not-allowed;
      border-color: #E2E8F0;
    }

    /* ── Buttons ── */
    .gq-btn-save-profile {
      background: linear-gradient(135deg, #0F2744 0%, #1E3A8A 100%);
      color: #FFFFFF;
      font-size: 14px;
      font-weight: 800;
      padding: 12px 24px;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(15, 39, 68, 0.2);
    }

    .gq-btn-save-profile:hover {
      background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);
      transform: translateY(-1px);
      box-shadow: 0 8px 20px rgba(30, 58, 138, 0.3);
      color: #FFFFFF;
    }

    .gq-btn-update-password {
      background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
      color: #FFFFFF;
      font-size: 14px;
      font-weight: 800;
      padding: 12px 24px;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(217, 119, 6, 0.25);
    }

    .gq-btn-update-password:hover {
      background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
      transform: translateY(-1px);
      box-shadow: 0 8px 20px rgba(217, 119, 6, 0.35);
      color: #FFFFFF;
    }

    .gq-pass-wrap {
      position: relative;
    }

    .gq-pass-toggle-btn {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: #64748B;
      cursor: pointer;
      font-size: 16px;
      padding: 4px;
    }

    .gq-pass-toggle-btn:hover {
      color: #0F2744;
    }

    @media(max-width: 1199px) {
      .gq-profile-main {
        margin-left: 0;
        width: 100%;
        padding: max(88px, calc(72px + env(safe-area-inset-top))) 16px 32px;
      }
    }

    @media(max-width: 767px) {
      .gq-profile-hero {
        flex-direction: column;
        align-items: flex-start;
        padding: 24px 20px;
      }
      .gq-btn-refresh-profile {
        width: 100%;
        text-align: center;
        justify-content: center;
      }
      .gq-card-box {
        padding: 20px 16px;
      }
    }
  `;

  if (loading && !user) {
    return (
      <>
        <style>{profileStyles}</style>
        <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="container-fluid">
          <div className="row">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <main className="gq-profile-main d-flex flex-column">
              <div className="py-5 text-center">
                <Loader message="Loading profile settings..." />
              </div>
              <Footer />
            </main>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{profileStyles}</style>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="gq-profile-main d-flex flex-column">
            {(savingProfile || savingPassword || revokingSessions) && (
              <Loader
                message={
                  savingProfile
                    ? "Updating personal details..."
                    : savingPassword
                    ? "Securing new password..."
                    : "Revoking active sessions..."
                }
              />
            )}

            <div className="gq-profile-shell">
              {/* ── Top Hero Banner ── */}
              <section className="gq-profile-hero">
                <div className="gq-profile-hero-copy">
                  <span className="gq-profile-eyebrow">
                    <i className="bi bi-shield-lock-fill" /> User Account & Security
                  </span>
                  <h1>Profile & Account Settings</h1>
                  <p>
                    Manage your personal credentials, contact details, authentication keys, and active session permissions.
                  </p>
                </div>
                <div>
                  <button
                    className="btn gq-btn-refresh-profile d-inline-flex align-items-center gap-2"
                    onClick={loadProfile}
                    disabled={loading}
                  >
                    <i className="bi bi-arrow-clockwise" />
                    Refresh Profile
                  </button>
                </div>
              </section>

              {/* Student Notice Banner */}
              {isStudent && (
                <div
                  className="alert alert-info py-3 px-4 mb-4 d-flex align-items-center gap-3"
                  style={{
                    background: "#EFF6FF",
                    border: "1.5px solid #BFDBFE",
                    borderRadius: "14px",
                    color: "#1E40AF",
                  }}
                >
                  <i className="bi bi-info-circle-fill fs-5" />
                  <span style={{ fontSize: "13.5px", fontWeight: 600 }}>
                    Student record details (names, contact info, and profile photos) are managed by your School Administrator. You can update your account password in the security section below.
                  </span>
                </div>
              )}

              <div className="row g-4">
                {/* ── Left Column: Personal Information ── */}
                <div className="col-12 col-lg-7">
                  <div className="gq-card-box">
                    <div className="gq-card-header">
                      <div className="gq-card-header-left">
                        <div className="gq-icon-badge" style={{ background: "#EEF2FF", color: "#4F46E5", border: "1px solid #E0E7FF" }}>
                          <i className="bi bi-person-bounding-box" />
                        </div>
                        <div>
                          <h2 className="gq-card-title">Personal Profile Details</h2>
                          <p className="gq-card-subtitle">Keep your official contact records updated.</p>
                        </div>
                      </div>

                      <span
                        className="badge px-3 py-2 fw-bold"
                        style={{
                          background: "#FEF3C7",
                          color: "#92400E",
                          border: "1px solid #FDE68A",
                          borderRadius: "8px",
                          fontSize: "12px",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        Role: {user?.role || "User"}
                      </span>
                    </div>

                    {/* Avatar Upload Banner */}
                    <div className="gq-avatar-upload-wrap">
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Avatar Preview"
                          className="gq-avatar-preview"
                          onError={() => setPhotoPreview(null)}
                        />
                      ) : (
                        <div className="gq-avatar-preview">
                          {getInitials(firstname, surname)}
                        </div>
                      )}

                      <div className="flex-grow-1">
                        <h6 style={{ fontWeight: 800, color: "#0F2744", marginBottom: "4px" }}>
                          Profile Avatar
                        </h6>
                        <p style={{ fontSize: "12.5px", color: "#64748B", marginBottom: "10px" }}>
                          PNG, JPG, or WebP up to 2MB. Displayed across the portal topnav and reports.
                        </p>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          className="d-none"
                          onChange={(e) => onPhotoChange(e.target.files?.[0] || null)}
                        />

                        {canEditProfile && (
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={pickPhoto}
                              className="btn btn-sm btn-outline-primary fw-bold px-3 py-1.5"
                              style={{ borderRadius: "8px", fontSize: "12.5px" }}
                            >
                              <i className="bi bi-upload me-1" />
                              {photoFile ? "Change Selected Photo" : "Upload New Photo"}
                            </button>

                            {photoFile && (
                              <button
                                type="button"
                                onClick={resetPhotoSelection}
                                className="btn btn-sm btn-outline-secondary fw-semibold px-2.5 py-1.5"
                                style={{ borderRadius: "8px", fontSize: "12px" }}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="gq-form-label">First Name</label>
                        <input
                          type="text"
                          value={firstname}
                          onChange={(e) => setFirstname(e.target.value)}
                          disabled={!canEditProfile || savingProfile}
                          className="gq-form-input"
                          placeholder="First Name"
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="gq-form-label">Surname / Last Name</label>
                        <input
                          type="text"
                          value={surname}
                          onChange={(e) => setSurname(e.target.value)}
                          disabled={!canEditProfile || savingProfile}
                          className="gq-form-input"
                          placeholder="Surname"
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="gq-form-label">Email Address</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={!canEditEmail || savingProfile}
                          className="gq-form-input"
                          placeholder="name@school.com"
                        />
                        {!canEditEmail && (
                          <small style={{ fontSize: "11px", color: "#64748B", marginTop: "3px", display: "block" }}>
                            {isAdmin ? "Admin email is locked for institutional security." : "Managed by school admin."}
                          </small>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="gq-form-label">Phone Number</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={!canEditProfile || savingProfile}
                          className="gq-form-input"
                          placeholder="+234 812 000 0000"
                        />
                      </div>

                      <div className="col-12">
                        <label className="gq-form-label">Residential / Campus Address</label>
                        <textarea
                          rows={2}
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          disabled={!canEditProfile || savingProfile}
                          className="gq-form-input"
                          placeholder="Enter your current address..."
                          style={{ minHeight: "72px" }}
                        />
                      </div>

                      {canEditProfile && (
                        <div className="col-12 pt-2">
                          <button
                            type="button"
                            onClick={handleSaveProfile}
                            disabled={savingProfile}
                            className="gq-btn-save-profile"
                          >
                            <i className="bi bi-check2-circle fs-6" />
                            Save Profile Information
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Right Column: Security, Passwords & Sessions ── */}
                <div className="col-12 col-lg-5">
                  {/* Security Card: Change Password */}
                  <div className="gq-card-box">
                    <div className="gq-card-header">
                      <div className="gq-card-header-left">
                        <div className="gq-icon-badge" style={{ background: "#FEF3C7", color: "#B45309", border: "1px solid #FDE68A" }}>
                          <i className="bi bi-key-fill" />
                        </div>
                        <div>
                          <h2 className="gq-card-title">Change Password</h2>
                          <p className="gq-card-subtitle">Ensure your account uses a strong password.</p>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex flex-column gap-3">
                      <div>
                        <label className="gq-form-label">Current Password</label>
                        <div className="gq-pass-wrap">
                          <input
                            type={showOldPass ? "text" : "password"}
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            disabled={savingPassword}
                            className="gq-form-input"
                            placeholder="Enter current password"
                          />
                          <button
                            type="button"
                            className="gq-pass-toggle-btn"
                            onClick={() => setShowOldPass(!showOldPass)}
                            tabIndex={-1}
                          >
                            <i className={`bi ${showOldPass ? "bi-eye-slash" : "bi-eye"}`} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="gq-form-label">New Password (Min 8 Characters)</label>
                        <div className="gq-pass-wrap">
                          <input
                            type={showNewPass ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={savingPassword}
                            className="gq-form-input"
                            placeholder="Enter new strong password"
                          />
                          <button
                            type="button"
                            className="gq-pass-toggle-btn"
                            onClick={() => setShowNewPass(!showNewPass)}
                            tabIndex={-1}
                          >
                            <i className={`bi ${showNewPass ? "bi-eye-slash" : "bi-eye"}`} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="gq-form-label">Confirm New Password</label>
                        <div className="gq-pass-wrap">
                          <input
                            type={showConfirmPass ? "text" : "password"}
                            value={newPasswordConfirm}
                            onChange={(e) => setNewPasswordConfirm(e.target.value)}
                            disabled={savingPassword}
                            className="gq-form-input"
                            placeholder="Confirm new password"
                          />
                          <button
                            type="button"
                            className="gq-pass-toggle-btn"
                            onClick={() => setShowConfirmPass(!showConfirmPass)}
                            tabIndex={-1}
                          >
                            <i className={`bi ${showConfirmPass ? "bi-eye-slash" : "bi-eye"}`} />
                          </button>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleUpdatePassword}
                          disabled={savingPassword}
                          className="gq-btn-update-password w-100 justify-content-center"
                        >
                          <i className="bi bi-shield-lock" />
                          Update Password
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Device & Session Revocation */}
                  <div className="gq-card-box">
                    <div className="gq-card-header">
                      <div className="gq-card-header-left">
                        <div className="gq-icon-badge" style={{ background: "#FEE2E2", color: "#DC2626", border: "1px solid #FECACA" }}>
                          <i className="bi bi-laptop" />
                        </div>
                        <div>
                          <h2 className="gq-card-title">Session Security</h2>
                          <p className="gq-card-subtitle">Manage devices logged into your account.</p>
                        </div>
                      </div>
                    </div>

                    <p style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.6, marginBottom: "16px" }}>
                      If you suspect any unauthorized access or left your account logged in on a public computer, you can terminate all other active device sessions immediately.
                    </p>

                    <button
                      type="button"
                      onClick={handleRevokeAllSessions}
                      disabled={revokingSessions}
                      className="btn btn-outline-danger fw-bold w-100 py-2.5 d-flex align-items-center justify-content-center gap-2"
                      style={{ borderRadius: "10px", fontSize: "13.5px" }}
                    >
                      <i className="bi bi-box-arrow-right" />
                      Log Out All Other Devices
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}
