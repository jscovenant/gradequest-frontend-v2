import { FormEvent, useEffect, useState } from "react";

import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import PageTitle from "../../components/PageTitle";
import { useToast } from "../../contexts/ToastContext";
import { authApi } from "../../utils/axios";

type StaffType = { key: string; label: string; permissions: string[] };
type Staff = { id: number; firstname?: string; surname?: string; email: string; phone?: string; status: number; super_admin_type: string; super_admin_type_label: string; super_admin_permissions: string[]; created_at?: string };

const emptyForm = { firstname: "", surname: "", email: "", phone: "", super_admin_type: "operations", status: true };

function creationTypes(types: StaffType[]) {
  return types.filter((type) => type.key !== "owner");
}

function nameOf(staff: Staff) {
  return `${staff.firstname || ""} ${staff.surname || ""}`.trim() || staff.email;
}

export default function PlatformStaffPage() {
  const { showError, showSuccess } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [types, setTypes] = useState<StaffType[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [lastPassword, setLastPassword] = useState("");
  const [sendingLoginId, setSendingLoginId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await authApi.get("/superadmin/platform-staff");
      setTypes(Array.isArray(res.data?.types) ? res.data.types : []);
      setStaff(Array.isArray(res.data?.staff?.data) ? res.data.staff.data : []);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to load platform staff.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function createStaff(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setLastPassword("");
    try {
      const res = await authApi.post("/superadmin/platform-staff", form);
      setLastPassword(res.data?.default_password || "");
      setForm(emptyForm);
      showSuccess("Platform staff account created.");
      await load();
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to create platform staff.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStaff(id: number, data: Partial<Staff>) {
    try {
      await authApi.put(`/superadmin/platform-staff/${id}`, data);
      showSuccess("Staff account updated.");
      await load();
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to update staff account.");
    }
  }

  async function sendLoginDetails(id: number) {
    setSendingLoginId(id);
    try {
      await authApi.post(`/superadmin/platform-staff/${id}/send-login`);
      showSuccess("Login details sent to the staff email.");
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to send login details.");
    } finally {
      setSendingLoginId(null);
    }
  }

  async function deleteStaff(item: Staff) {
    if (item.super_admin_type === "owner") {
      showError("The Super Admin owner account cannot be deleted.");
      return;
    }

    const ok = window.confirm(`Delete ${nameOf(item)}? This action cannot be undone.`);
    if (!ok) return;

    setSaving(true);
    try {
      await authApi.delete(`/superadmin/platform-staff/${item.id}`);
      showSuccess("Platform staff account deleted.");
      await load();
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to delete platform staff.");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <style>{`
      .ps-main{min-height:100vh;background:#f8fafc;margin-left:280px;width:calc(100% - 280px);padding:96px 26px 32px}.ps-shell{max-width:1320px;margin:0 auto}.ps-hero{background:linear-gradient(135deg,#171222,#3c1237);color:#fff;border-radius:18px;padding:26px;display:flex;align-items:flex-end;justify-content:space-between;gap:18px}.ps-eyebrow{color:#f7c948;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.14em}.ps-hero h1{font-family:'Playfair Display',serif;font-weight:900;margin:8px 0;font-size:clamp(28px,4vw,42px)}.ps-hero p{margin:0;color:rgba(255,255,255,.76);max-width:760px;line-height:1.7}.ps-grid{display:grid;grid-template-columns:360px minmax(0,1fr);gap:16px;margin-top:16px}.ps-panel{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 12px 30px rgba(15,23,42,.06);overflow:hidden}.ps-head{padding:18px 20px;border-bottom:1px solid #e5e7eb}.ps-head h2{font-size:19px;font-weight:900;margin:0;color:#111827}.ps-head p{margin:4px 0 0;color:#64748b;font-size:13px}.ps-body{padding:18px 20px}.ps-label{font-size:12px;font-weight:900;color:#475569;text-transform:uppercase;margin-bottom:6px}.ps-input,.ps-select{width:100%;height:42px;border:1px solid #dbe3ef;border-radius:10px;padding:0 11px;margin-bottom:12px}.ps-btn{border:0;border-radius:10px;padding:10px 14px;font-weight:900;display:inline-flex;align-items:center;gap:8px}.ps-btn-primary{background:var(--bs-primary,#d300b0);color:#fff}.ps-btn-soft{background:#f1f5f9;color:#0f172a}.ps-btn-mail{background:#ecfeff;color:#155e75;border:1px solid #a5f3fc}.ps-actions{display:flex;gap:8px;flex-wrap:wrap}.ps-note{background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px;margin-top:12px;color:#92400e;font-weight:800;overflow-wrap:anywhere}.ps-table-wrap{overflow:auto}.ps-table{width:100%;min-width:760px;border-collapse:separate;border-spacing:0}.ps-table th{background:#f8fafc;color:#64748b;text-transform:uppercase;font-size:11px;letter-spacing:.08em;padding:12px;border-bottom:1px solid #e5e7eb}.ps-table td{padding:13px 12px;border-bottom:1px solid #eef2f7;vertical-align:top}.ps-name{font-weight:900;color:#111827}.ps-sub{color:#64748b;font-size:12px}.ps-pill{display:inline-flex;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900;background:#eef2ff;color:#3730a3}.ps-perms{display:flex;gap:6px;flex-wrap:wrap}.ps-perm{font-size:11px;font-weight:800;color:#475569;background:#f1f5f9;border-radius:999px;padding:4px 8px}@media(max-width:1199px){.ps-main{margin-left:0;width:100%;padding:92px 16px 28px}.ps-grid{grid-template-columns:1fr}.ps-hero{align-items:flex-start;flex-direction:column}}`}</style>
    <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Platform Staff" />
    <PageTitle title="Platform Staff" />
    <div className="container-fluid"><div className="row"><Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <main className="ps-main">{loading && <Loader message="Loading platform staff..." />}<div className="ps-shell">
        <section className="ps-hero"><div><span className="ps-eyebrow"><i className="bi bi-shield-check" /> Super Admin Access</span><h1>Platform staff management</h1><p>Create trusted platform staff and assign their operating area. Owner accounts keep full authority while Finance, Support, Operations, and Sales Manager accounts see only what they need.</p></div><button className="ps-btn ps-btn-soft" onClick={load}><i className="bi bi-arrow-repeat" /> Refresh</button></section>
        <section className="ps-grid">
          <form className="ps-panel" onSubmit={createStaff}><div className="ps-head"><h2>Create staff</h2><p>New users must change their default password after first login.</p></div><div className="ps-body">
            <label className="ps-label">First name</label><input className="ps-input" value={form.firstname} onChange={(e) => setForm((p) => ({ ...p, firstname: e.target.value }))} required />
            <label className="ps-label">Surname</label><input className="ps-input" value={form.surname} onChange={(e) => setForm((p) => ({ ...p, surname: e.target.value }))} />
            <label className="ps-label">Email</label><input className="ps-input" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
            <label className="ps-label">Phone</label><input className="ps-input" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            <label className="ps-label">Access type</label><select className="ps-select" value={form.super_admin_type} onChange={(e) => setForm((p) => ({ ...p, super_admin_type: e.target.value }))}>{creationTypes(types).map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}</select>
            <button className="ps-btn ps-btn-primary" disabled={saving}><i className="bi bi-person-plus" /> {saving ? "Creating" : "Create account"}</button>
            {lastPassword && <div className="ps-note">Default password: {lastPassword}</div>}
          </div></form>
          <section className="ps-panel"><div className="ps-head"><h2>Platform staff</h2><p>Toggle active status or change responsibility when a staff member changes position.</p></div><div className="ps-table-wrap"><table className="ps-table"><thead><tr><th>Staff</th><th>Access type</th><th>Permissions</th><th>Status</th><th>Action</th></tr></thead><tbody>{staff.map((item) => <tr key={item.id}><td><div className="ps-name">{nameOf(item)}</div><div className="ps-sub">{item.email}</div></td><td><span className="ps-pill">{item.super_admin_type_label}</span></td><td><div className="ps-perms">{item.super_admin_permissions.map((p) => <span className="ps-perm" key={p}>{p}</span>)}</div></td><td>{item.status ? "Active" : "Inactive"}</td><td><div className="ps-actions"><button className="ps-btn ps-btn-mail" disabled={sendingLoginId === item.id || saving} onClick={() => sendLoginDetails(item.id)}><i className="bi bi-envelope" /> {sendingLoginId === item.id ? "Sending" : "Send login"}</button><button className="ps-btn ps-btn-soft" disabled={saving} onClick={() => updateStaff(item.id, { status: item.status ? 0 : 1 } as any)}>{item.status ? "Deactivate" : "Activate"}</button>{item.super_admin_type !== "owner" && <button className="ps-btn ps-btn-soft" disabled={saving} onClick={() => deleteStaff(item)}><i className="bi bi-trash" /> Delete</button>}</div></td></tr>)}</tbody></table></div></section>
        </section>
        <Footer />
      </div></main>
    </div></div>
  </>;
}


