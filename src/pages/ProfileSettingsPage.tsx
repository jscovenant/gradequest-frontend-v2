// src/pages/Settings/ProfileSettingsPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import TopNav from "../components/LayoutComponents/TopNav";
import Sidebar from "../components/LayoutComponents/Sidebar";
import Footer from "../components/LayoutComponents/Footer";
import Loader from "../components/ui/dashboardLoader";
import { authApi } from "../utils/axios";
import { useToast } from "../contexts/ToastContext";

type UserProfile = {
  id: number;
  firstname?: string;
  surname?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  photo?: string | null;
  role?: string; // "Admin" | "Teacher" | "Parent" | "Student" | etc.
};

function roleIsStudent(role?: string) {
  return (role || "").toLowerCase() === "student";
}

function roleIsAdmin(role?: string) {
  return (role || "").toLowerCase() === "admin";
}

export default function ProfileSettingsPage() {
  const { showToast } = useToast();

  // layout
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // loading
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // profile data
  const [user, setUser] = useState<UserProfile | null>(null);

  // form state
  const [firstname, setFirstname] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // photo
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // password form (everyone can change password, including students)
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  const isStudent = useMemo(() => roleIsStudent(user?.role), [user?.role]);
  const isAdmin = useMemo(() => roleIsAdmin(user?.role), [user?.role]);

  // ✅ rules:
  // - student cannot edit profile details (but CAN change password)
  // - admin cannot change email
  // - other roles can change details
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
    } catch (e: any) {
      showToast(e?.response?.data?.message || "Failed to load profile.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Backend requires email; admin can't change it; students can't edit profile anyway.
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

      // multipart + put via method spoofing
      fd.append("_method", "PUT");

      const res = await authApi.post<UserProfile>("/user-profile/update", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUser(res.data);
      showToast("Profile updated successfully ✅", "success");
      setPhotoFile(null);
      setPhotoPreview(res.data.photo || photoPreview);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.data?.errors ? "Please fix validation errors." : "Failed to update profile.");
      showToast(msg, "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!oldPassword || !newPassword || !newPasswordConfirm) {
      showToast("Please fill all password fields.", "error");
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

      showToast(res?.data?.message || "Password updated successfully ✅", "success");
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

  const profileStyles = `
    .profile-main { min-height:100vh; margin-left:280px; width:calc(100% - 280px); padding:96px 26px 32px; background:#f6f8fb; color:#0f172a; }
    .profile-shell { width:100%; max-width:1320px; margin:0 auto; }
    .profile-hero { position:relative; overflow:hidden; display:flex; align-items:flex-end; justify-content:space-between; gap:20px; padding:26px; margin-bottom:20px; border-radius:18px; color:#fff; background:linear-gradient(135deg,#171222 0%,#3c1237 58%,#0f766e 130%); box-shadow:0 18px 45px rgba(23,18,34,.16); }
    .profile-hero::after { content:""; position:absolute; width:220px; height:220px; right:-80px; top:-105px; border-radius:50%; background:rgba(250,204,21,.13); }
    .profile-hero-copy,.profile-hero-actions { position:relative; z-index:1; }
    .profile-eyebrow { display:inline-flex; align-items:center; gap:8px; color:#f7c948; font-size:11px; font-weight:900; letter-spacing:.14em; text-transform:uppercase; }
    .profile-hero h1 { margin:8px 0 5px; font-size:clamp(28px,4vw,40px); font-weight:950; letter-spacing:-.03em; }
    .profile-hero p { margin:0; max-width:680px; color:rgba(255,255,255,.76); line-height:1.6; }
    .profile-refresh { border:1px solid rgba(255,255,255,.24)!important; background:rgba(255,255,255,.1)!important; color:#fff!important; font-weight:850!important; padding:10px 14px!important; }
    .profile-grid { margin-top:0!important; }
    .profile-card { height:100%; border:1px solid #e5e7eb!important; border-radius:16px!important; box-shadow:0 12px 30px rgba(15,23,42,.06)!important; overflow:hidden; }
    .profile-section-icon { width:42px; height:42px; display:inline-flex; align-items:center; justify-content:center; border-radius:12px!important; }
    .profile-main .form-label { color:#334155; font-size:12px; font-weight:850!important; }
    .profile-main .form-control { min-height:44px; border:1px solid #dbe3ef; border-radius:11px; padding:10px 12px; box-shadow:none; }
    .profile-main .form-control:focus { border-color:#0f766e; box-shadow:0 0 0 3px rgba(15,118,110,.11); }
    .profile-main .form-control:disabled,.profile-main .form-control[readonly] { background:#f8fafc; color:#64748b; opacity:1; }
    .profile-main .btn { font-weight:850; }
    .profile-main .btn-primary { border-color:#0f766e; background:#0f766e; }
    .profile-main .btn-primary:hover { border-color:#115e59; background:#115e59; }
    .profile-main .btn-success { border-color:#166534; background:#166534; }
    .profile-avatar { width:82px!important; height:82px!important; border-radius:18px!important; border:3px solid #fff!important; box-shadow:0 8px 24px rgba(15,23,42,.14); }
    .profile-notice { margin:0 0 18px!important; border:1px solid #bae6fd; border-radius:13px!important; background:#f0f9ff; color:#075985; }
    .profile-support { padding:13px 14px; border:1px solid #e5e7eb; border-radius:12px; background:#fff; }
    @media(max-width:1199px) { .profile-main { margin-left:0; width:100%; padding:92px 18px 28px; } }
    @media(max-width:767px) { .profile-main { padding:82px 14px 24px; } .profile-hero { align-items:flex-start; flex-direction:column; padding:21px; } .profile-hero-actions,.profile-refresh { width:100%; } .profile-card .card-body { padding:20px!important; } }
  `;

  if (loading && !user) {
    return (
      <>
        <style>{profileStyles}</style>
        <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="container-fluid">
          <div className="row">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <main className="profile-main d-flex flex-column">
              <div className="py-4">
                <Loader message="Loading profile..." />
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

          <main className="profile-main d-flex flex-column">
            {(savingProfile || savingPassword) && <Loader message={savingProfile ? "Saving profile..." : "Updating password..."} />}

            <div className="profile-shell">
              <section className="profile-hero"><div className="profile-hero-copy"><span className="profile-eyebrow"><i className="bi bi-person-gear" /> Account settings</span><h1>Profile Settings</h1><p>Keep your personal information current and protect your GradeQuest account.</p></div><div className="profile-hero-actions"><button className="btn profile-refresh" onClick={loadProfile} disabled={loading}><i className="bi bi-arrow-clockwise me-1" /> Refresh Profile</button></div></section>

            {/* Student Notice: profile only */}
            {isStudent && (
              <div className="alert alert-info profile-notice">
                <i className="bi bi-info-circle me-2"></i>
                Students cannot edit profile details (name, email, phone, address, photo). You can still change your password below.
              </div>
            )}

            <div className="row g-4 profile-grid">
              {/* Profile Card */}
              <div className="col-lg-7">
                <div className="card profile-card">
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <div className="profile-section-icon" style={{ backgroundColor: "#e0e7ff" }}>
                          <i className="bi bi-person-circle" style={{ color: "#6366f1" }}></i>
                        </div>
                        <div>
                          <h6 className="mb-0" style={{ fontWeight: 800, color: "#0f172a" }}>
                            Personal Information
                          </h6>
                          <small className="text-muted">Update your name, phone, address, and photo.</small>
                        </div>
                      </div>

                      <span className="badge" style={{ background: "rgba(2,6,23,0.06)", color: "#0f172a", border: "1px solid rgba(2,6,23,0.10)" }}>
                        Role: {user?.role || "N/A"}
                      </span>
                    </div>

                    {/* Photo */}
                    <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
                      <div
                        style={{
                          width: 82,
                          height: 82,
                          borderRadius: 16,
                          background: "rgba(2,6,23,0.06)",
                          border: "1px solid rgba(2,6,23,0.10)",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }} className="profile-avatar"
                      >
                        {photoPreview ? (
                          <img src={photoPreview} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <i className="bi bi-person-fill" style={{ fontSize: 28, color: "#64748b" }}></i>
                        )}
                      </div>

                      <div className="d-flex flex-column gap-1">
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>
                          {firstname || "—"} {surname || ""}
                        </div>
                        <div className="text-muted" style={{ fontSize: "0.9rem" }}>
                          {user?.email || "—"}
                        </div>

                        <div className="d-flex gap-2 flex-wrap mt-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            style={{ borderRadius: 10 }}
                            onClick={pickPhoto}
                            disabled={!canEditProfile}
                            title={!canEditProfile ? "Students cannot change photo." : "Upload a new photo"}
                          >
                            <i className="bi bi-upload me-1"></i>
                            Upload Photo
                          </button>

                          {photoFile && (
                            <button type="button" className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 10 }} onClick={resetPhotoSelection}>
                              Undo
                            </button>
                          )}
                        </div>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="d-none"
                        onChange={(e) => onPhotoChange(e.target.files?.[0] || null)}
                        disabled={!canEditProfile}
                      />
                    </div>

                    {/* Form */}
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label" style={{ fontWeight: 600 }}>
                          Firstname
                        </label>
                        <input className="form-control" value={firstname} onChange={(e) => setFirstname(e.target.value)} disabled={!canEditProfile} />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label" style={{ fontWeight: 600 }}>
                          Surname
                        </label>
                        <input className="form-control" value={surname} onChange={(e) => setSurname(e.target.value)} disabled={!canEditProfile} />
                      </div>

                      <div className="col-md-12">
                        <label className="form-label d-flex align-items-center justify-content-between" style={{ fontWeight: 600 }}>
                          <span>Email</span>
                          {!canEditEmail && (
                            <small className="text-muted" style={{ fontWeight: 500 }}>
                              {isAdmin ? "Admin email cannot be changed" : isStudent ? "Students cannot edit" : "Read-only"}
                            </small>
                          )}
                        </label>

                        <input className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!canEditEmail} readOnly={!canEditEmail} />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label" style={{ fontWeight: 600 }}>
                          Phone
                        </label>
                        <input className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!canEditProfile} />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label" style={{ fontWeight: 600 }}>
                          Address
                        </label>
                        <input className="form-control" value={address} onChange={(e) => setAddress(e.target.value)} disabled={!canEditProfile} />
                      </div>
                    </div>

                    <div className="d-flex gap-2 mt-4 flex-wrap">
                      <button className="btn btn-primary" style={{ borderRadius: 12, minWidth: 160 }} onClick={handleSaveProfile} disabled={!canEditProfile || savingProfile}>
                        <i className="bi bi-check2-circle me-1"></i>
                        Save Changes
                      </button>

                      <button
                        className="btn btn-outline-secondary"
                        style={{ borderRadius: 12 }}
                        onClick={() => {
                          setFirstname(user?.firstname || "");
                          setSurname(user?.surname || "");
                          setEmail(user?.email || "");
                          setPhone(user?.phone || "");
                          setAddress(user?.address || "");
                          resetPhotoSelection();
                        }}
                        disabled={savingProfile}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Card (enabled for ALL including students) */}
              <div className="col-lg-5">
                <div className="card profile-card">
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <div className="profile-section-icon" style={{ backgroundColor: "#dcfce7" }}>
                        <i className="bi bi-shield-lock-fill" style={{ color: "#16a34a" }}></i>
                      </div>
                      <div>
                        <h6 className="mb-0" style={{ fontWeight: 800, color: "#0f172a" }}>
                          Security
                        </h6>
                        <small className="text-muted">Update your password.</small>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Old Password
                      </label>
                      <input type="password" className="form-control" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="Enter old password" />
                    </div>

                    <div className="mb-3">
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        New Password
                      </label>
                      <input type="password" className="form-control" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
                      <small className="text-muted">Minimum 8 characters.</small>
                    </div>

                    <div className="mb-3">
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Confirm New Password
                      </label>
                      <input type="password" className="form-control" value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} placeholder="Confirm new password" />
                    </div>

                    <button className="btn btn-success w-100" style={{ borderRadius: 12 }} onClick={handleUpdatePassword} disabled={savingPassword}>
                      <i className="bi bi-key-fill me-1"></i>
                      Update Password
                    </button>

                    <div className="text-muted mt-3" style={{ fontSize: "0.85rem" }}>
                      Tip: Use a strong password with letters, numbers, and symbols.
                    </div>
                  </div>
                </div>

                <div className="text-muted mt-3 profile-support" style={{ fontSize: "0.85rem" }}>
                  Having issues? Contact your school admin or support.
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <Footer />
            </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
