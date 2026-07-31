import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTitle from "../components/PageTitle";
import { authApi } from "../utils/axios";
import { getUser, setUser } from "../utils/token";

export default function ChangeInitialPasswordPage() {
  const navigate = useNavigate();
  const currentUser = getUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (password !== passwordConfirmation) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    try {
      const res = await authApi.post("/auth/change-initial-password", {
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      });

      setUser({ ...(currentUser || {}), ...(res.data?.user || {}), must_change_password: false });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to change password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageTitle title="Change Password" />
      <style>{`
        .cp-page { min-height: 100vh; display: grid; place-items: center; background: #0f172a; padding: 24px; font-family: "DM Sans", system-ui, sans-serif; }
        .cp-card { width: min(100%, 460px); background: #fff; border-radius: 18px; padding: 28px; box-shadow: 0 28px 80px rgba(0,0,0,.28); }
        .cp-badge { display:inline-flex; align-items:center; gap:8px; color:#92400e; background:#fffbeb; border:1px solid #fde68a; border-radius:999px; padding:7px 10px; font-size:12px; font-weight:800; }
        .cp-card h1 { margin:16px 0 8px; font-size:26px; color:#0f172a; font-weight:900; letter-spacing:0; }
        .cp-card p { color:#64748b; line-height:1.6; margin-bottom:20px; }
        .cp-form { display:grid; gap:14px; }
        .cp-form label { display:grid; gap:6px; color:#334155; font-size:13px; font-weight:800; }
        .cp-form input { border:1px solid #dbe3ef; border-radius:12px; padding:12px 13px; outline:none; }
        .cp-form input:focus { border-color:#c9a84c; box-shadow:0 0 0 3px rgba(201,168,76,.15); }
        .cp-btn { border:0; border-radius:12px; background:#c9a84c; color:#111827; font-weight:900; padding:12px 14px; display:inline-flex; align-items:center; justify-content:center; gap:8px; }
        .cp-error { background:#fef2f2; color:#991b1b; border:1px solid #fecaca; border-radius:12px; padding:10px 12px; font-size:13px; }
        .cp-note { margin-top:14px; font-size:12px; color:#94a3b8; }
      `}</style>
      <main className="cp-page">
        <section className="cp-card">
          <span className="cp-badge"><i className="bi bi-shield-lock" /> Required security step</span>
          <h1>Create your own password</h1>
          <p>
            You signed in with a temporary password. Please create a private password before continuing to your account.
          </p>
          {error && <div className="cp-error">{error}</div>}
          <form className="cp-form" onSubmit={submit}>
            <label>
              Temporary password
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </label>
            <label>
              New password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
            </label>
            <label>
              Confirm new password
              <input type="password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} minLength={8} required />
            </label>
            <button className="cp-btn" disabled={saving}>
              {saving ? "Saving..." : "Save new password"}
            </button>
          </form>
          <div className="cp-note">Use at least 8 characters with uppercase, lowercase, and numbers.</div>
        </section>
      </main>
    </>
  );
}
