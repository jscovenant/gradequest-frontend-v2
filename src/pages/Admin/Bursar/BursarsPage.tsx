import React, { useEffect, useMemo, useState } from "react";
import { authApi } from "../../../utils/axios";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";

/* ========================= TYPES ========================= */
interface Bursar {
  id: number;
  firstname: string;
  surname: string;
  email: string;
  phone: string;
  address?: string | null;
  role?: string;
  status?: number;
  school_id?: number;
  default_password?: string;
  created_at?: string;
  updated_at?: string;
}

type ModalTab = "overview" | "edit" | "security";

/* ========================= HELPERS ========================= */
const capitalize = (s?: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

const fullName = (b?: Partial<Bursar> | null) =>
  [capitalize(b?.firstname), capitalize(b?.surname)].filter(Boolean).join(" ").trim();

const InfoRow = ({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
}) => (
  <div className="sp-info-row">
    <div className="sp-info-label">
      {icon && <span className="sp-info-icon">{icon}</span>}
      {label}
    </div>
    <div className="sp-info-val">
      {value && value !== "" ? value : <span style={{ color: "#c8bfb5" }}>N/A</span>}
    </div>
  </div>
);

/* ========================= COMPONENT ========================= */
export default function BursarsPage() {
  const { showSuccess, showError } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* List */
  const [bursars, setBursars] = useState<Bursar[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(8);

  const [decryptedPassword, setDecryptedPassword] = useState("");
const [passwordVisible, setPasswordVisible] = useState(false);
const [decryptingPassword, setDecryptingPassword] = useState(false);

  /* Create */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newBursar, setNewBursar] = useState({
    firstname: "",
    surname: "",
    email: "",
    phone: "",
    address: "",
  });
  const [createdPassword, setCreatedPassword] = useState("");

  /* View / Edit */
  const [selectedBursar, setSelectedBursar] = useState<Bursar | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>("overview");
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editedBursar, setEditedBursar] = useState({
    firstname: "",
    surname: "",
    email: "",
    phone: "",
    address: "",
    status: "1",
     password: "",
  });

  /* ========================= FETCH ========================= */
  const fetchBursars = async () => {
    setLoading(true);
    try {
      const res = await authApi.get("/bursars");
      setBursars(res.data?.bursars || []);
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to load bursars");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBursars();
  }, []);

  /* ========================= DERIVED ========================= */
  const filteredBursars = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bursars;

    return bursars.filter((b) =>
      [
        b.firstname,
        b.surname,
        b.email,
        b.phone,
        b.address,
        `${b.firstname} ${b.surname}`,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [bursars, search]);

  const totalPages = Math.max(1, Math.ceil(filteredBursars.length / perPage));

  const paginatedBursars = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredBursars.slice(start, start + perPage);
  }, [filteredBursars, page, perPage]);

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const activeCount = useMemo(
    () => bursars.filter((b) => Number(b.status) === 1).length,
    [bursars]
  );

  const inactiveCount = useMemo(
    () => bursars.filter((b) => Number(b.status) !== 1).length,
    [bursars]
  );

  const withPhoneCount = useMemo(
    () => bursars.filter((b) => !!b.phone).length,
    [bursars]
  );

  const withAddressCount = useMemo(
    () => bursars.filter((b) => !!b.address).length,
    [bursars]
  );

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  /* ========================= CREATE ========================= */
  const resetCreateForm = () => {
    setNewBursar({
      firstname: "",
      surname: "",
      email: "",
      phone: "",
      address: "",
    });
    setCreatedPassword("");
  };

  const openCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (creating) return;
    setShowCreateModal(false);
    resetCreateForm();
  };

  const createBursar = async () => {
    setCreating(true);
    try {
      const res = await authApi.post("/bursars", newBursar);
      const created = res.data?.bursar;
      const defaultPassword = res.data?.default_password || "";

      showSuccess(res.data?.message || "Bursar created successfully");
      setCreatedPassword(defaultPassword);

      if (created) {
        setBursars((prev) => [created, ...prev]);
      }

      setNewBursar({
        firstname: "",
        surname: "",
        email: "",
        phone: "",
        address: "",
      });
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to create bursar");
    } finally {
      setCreating(false);
    }
  };

  /* ========================= VIEW / EDIT ========================= */
 const openBursar = async (bursar: Bursar) => {
  setSelectedBursar(null);
  setDetailsLoading(true);
  setActiveTab("overview");
  setEditMode(false);
  setPasswordVisible(false);
  setDecryptedPassword("");

  try {
    const res = await authApi.get(`/bursars/${bursar.id}`);
    const details = res.data?.bursar;
    setSelectedBursar(details);
    setEditedBursar({
      firstname: details?.firstname || "",
      surname: details?.surname || "",
      email: details?.email || "",
      phone: details?.phone || "",
      address: details?.address || "",
      status: String(details?.status ?? "1"),
      password: "",
    });
  } catch (err: any) {
    showError(err?.response?.data?.message || "Failed to load bursar details");
  } finally {
    setDetailsLoading(false);
  }
};

 const closeDetailsModal = () => {
  if (saving || deleting || decryptingPassword) return;
  setSelectedBursar(null);
  setDetailsLoading(false);
  setEditMode(false);
  setActiveTab("overview");
  setPasswordVisible(false);
  setDecryptedPassword("");
};

  const enableEdit = async () => {
    if (!selectedBursar) return;
    setDetailsLoading(true);
    try {
      const res = await authApi.get(`/bursars/${selectedBursar.id}/edit`);
      const b = res.data?.bursar;
      setSelectedBursar((prev) => ({ ...(prev || {}), ...b }));
      setEditedBursar({
        firstname: b?.firstname || "",
        surname: b?.surname || "",
        email: b?.email || "",
        phone: b?.phone || "",
        address: b?.address || "",
        status: String(b?.status ?? selectedBursar?.status ?? "1"),
         password: "",
      });
      setEditMode(true);
      setActiveTab("edit");
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to load bursar for editing");
    } finally {
      setDetailsLoading(false);
    }
  };

const saveBursar = async () => {
  if (!selectedBursar) return;
  setSaving(true);

  try {
    const payload: any = {
      firstname: editedBursar.firstname,
      surname: editedBursar.surname,
      email: editedBursar.email,
      phone: editedBursar.phone,
      address: editedBursar.address,
      status: Number(editedBursar.status),
    };

    if (editedBursar.password.trim()) {
      payload.password = editedBursar.password.trim();
    }

    const res = await authApi.put(`/bursars/${selectedBursar.id}`, payload);
    const updated = res.data?.bursar;

    showSuccess(res.data?.message || "Bursar updated successfully");

    setSelectedBursar((prev) => ({ ...(prev || {}), ...updated }));
    setBursars((prev) =>
      prev.map((b) => (b.id === selectedBursar.id ? { ...b, ...updated } : b))
    );

    setEditedBursar((prev) => ({
      ...prev,
      password: "",
    }));

    setEditMode(false);
    setActiveTab("overview");
  } catch (err: any) {
    showError(err?.response?.data?.message || "Failed to update bursar");
  } finally {
    setSaving(false);
  }
};

  const deleteBursar = async () => {
    if (!selectedBursar) return;
    const yes = window.confirm(
      `Are you sure you want to delete ${fullName(selectedBursar)}?`
    );
    if (!yes) return;

    setDeleting(true);
    try {
      const res = await authApi.delete(`/bursars/${selectedBursar.id}`);
      showSuccess(res.data?.message || "Bursar deleted successfully");

      setBursars((prev) => prev.filter((b) => b.id !== selectedBursar.id));
      closeDetailsModal();
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to delete bursar");
    } finally {
      setDeleting(false);
    }
  };

const copyPassword = async (password?: string) => {
  const valueToCopy = password || decryptedPassword;
  if (!valueToCopy) return showError("No password available");

  try {
    await navigator.clipboard.writeText(valueToCopy);
    showSuccess("Password copied");
  } catch {
    showError("Failed to copy password");
  }
};

  const decryptPassword = async () => {
  if (!selectedBursar) return;

  if (passwordVisible) {
    setPasswordVisible(false);
    setDecryptedPassword("");
    return;
  }

  setDecryptingPassword(true);
  try {
    const res = await authApi.post("/bursars/decrypt-password", {
      user_id: selectedBursar.id,
    });

    if (res.data?.success && res.data?.decrypted_password) {
      setDecryptedPassword(res.data.decrypted_password);
      setPasswordVisible(true);
      showSuccess(res.data?.message || "Password decrypted successfully");
    } else {
      showError(res.data?.message || "Failed to decrypt password");
    }
  } catch (err: any) {
    showError(err?.response?.data?.message || "Failed to decrypt password");
  } finally {
    setDecryptingPassword(false);
  }
};

  const initials = (b?: Partial<Bursar> | null) =>
    [b?.firstname?.[0], b?.surname?.[0]].filter(Boolean).join("").toUpperCase();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500&display=swap');

        :root {
          --sp-light:    var(--bs-light,     #fcf8f8);
          --sp-dark:     var(--bs-dark,      #050008);
          --sp-accent:   var(--bs-secondary, rgb(255,200,87));
          --sp-magenta:  var(--bs-primary,   rgb(211,0,176));
          --sp-success:  var(--bs-success,   rgb(34,197,94));
          --sp-danger:   var(--bs-danger,    rgb(239,68,68));
          --sp-warning:  var(--bs-warning,   rgb(245,158,11));
          --sp-info:     var(--bs-info,      rgb(59,130,246));
          --sp-border:   var(--bs-border-color, #ede8e0);
          --sp-radius:   var(--bs-border-radius-lg, 14px);

          --sp-accent-dim:    rgba(255,200,87,0.10);
          --sp-accent-border: rgba(255,200,87,0.22);
          --sp-magenta-dim:   rgba(211,0,176,0.08);
        }

        .db-main {
          background: var(--sp-light);
          min-height: 100vh;
          font-family: 'DM Sans', sans-serif;
          padding: 28px 28px 0;
        }

        .db-hero {
          background: var(--sp-dark);
          border-radius: var(--sp-radius);
          padding: 32px 36px;
          position: relative;
          overflow: hidden;
          margin-bottom: 24px;
        }
        .db-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,.045) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
        }
        .db-hero-glow {
          position:absolute; top:-60px; right:-60px; width:320px; height:320px; border-radius:50%;
          background:radial-gradient(circle, rgba(255,200,87,.10) 0%, transparent 65%);
          pointer-events:none;
        }
        .db-hero-glow2 {
          position:absolute; bottom:-40px; left:30%; width:200px; height:200px; border-radius:50%;
          background:radial-gradient(circle, rgba(211,0,176,.06) 0%, transparent 70%);
          pointer-events:none;
        }
        .db-hero-inner {
          position:relative; z-index:1; display:flex; align-items:center; justify-content:space-between; gap:32px; flex-wrap:wrap;
        }
        .db-session-badge {
          display:inline-flex; align-items:center; gap:7px;
          font-size:11px; font-weight:500; letter-spacing:.12em; text-transform:uppercase;
          color: var(--sp-accent);
          background: var(--sp-accent-dim);
          border: 1px solid var(--sp-accent-border);
          border-radius:999px; padding:4px 12px; margin-bottom:14px;
        }
        .db-session-dot {
          width:6px; height:6px; border-radius:50%; background: var(--sp-success);
          animation:dbPulse 2s ease infinite;
        }
        @keyframes dbPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.5)} }

        .db-greeting {
          font-family:'Playfair Display',serif; font-size:clamp(22px,2.5vw,32px); font-weight:900; color:#fff;
          line-height:1.1; margin-bottom:8px;
        }
        .db-greeting em { font-style:italic; color: var(--sp-magenta); }
        .db-hero-sub {
          font-size:13.5px; font-weight:300; color:rgba(255,255,255,0.38);
          line-height:1.65; max-width:560px; margin-bottom:24px;
        }

        .db-btn-gold {
          display:inline-flex; align-items:center; gap:8px; padding:10px 20px; font-size:13px; font-weight:500;
          color:var(--sp-dark); background:var(--sp-accent); border:none; border-radius:10px; cursor:pointer;
          transition:background .2s,transform .2s; white-space:nowrap;
        }
        .db-btn-gold:hover { background:#ffe0a0; transform:translateY(-1px); }

        .db-btn-outline {
          display:inline-flex; align-items:center; gap:8px; padding:10px 20px; font-size:13px; font-weight:400;
          color:rgba(255,255,255,.75); background:transparent; border:1px solid rgba(255,255,255,.14);
          border-radius:10px; cursor:pointer; transition:background .2s,border-color .2s,color .2s; white-space:nowrap;
        }
        .db-btn-outline:hover { background:rgba(255,255,255,.06); color:#fff; border-color:rgba(255,255,255,.28); }
        .db-btn-outline:disabled { opacity:.5; cursor:not-allowed; }

        .db-hero-stat-card {
          background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.09); backdrop-filter:blur(8px);
          border-radius:var(--sp-radius); padding:20px 24px; min-width:240px;
        }
        .db-hero-stat-item { display:flex; justify-content:space-between; align-items:center; gap:16px; }
        .db-hero-stat-label { font-size:12px; font-weight:300; color:rgba(255,255,255,0.28); }
        .db-hero-stat-val {
          font-family:'Playfair Display',serif; font-size:18px; font-weight:700; color:var(--sp-accent);
        }
        .db-hero-stat-sep { height:1px; background:rgba(255,255,255,.06); }

        .db-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
        @media(max-width:1100px){ .db-stats{grid-template-columns:repeat(2,1fr);} }
        @media(max-width:600px) { .db-stats{grid-template-columns:1fr;} }

        .db-stat {
          background:#fff; border:1px solid var(--sp-border); border-radius:var(--sp-radius); padding:24px 22px;
          position:relative; overflow:hidden; transition:box-shadow .25s,transform .25s; animation:dbFadeUp .5s ease both;
        }
        @keyframes dbFadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .db-stat:hover { box-shadow:0 8px 28px rgba(0,0,0,.08); transform:translateY(-3px); }
        .db-stat::before {
          content:''; position:absolute; top:0; left:0; right:0; height:3px; background:var(--sc);
          transform:scaleX(0); transform-origin:left; transition:transform .3s ease;
        }
        .db-stat:hover::before { transform:scaleX(1); }
        .db-stat-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
        .db-stat-icon {
          width:42px; height:42px; border-radius:10px; background:var(--si); color:var(--sc);
          display:flex; align-items:center; justify-content:center;
        }
        .db-stat-label { font-size:12px; font-weight:400; color:#9a8a7a; margin-bottom:5px; letter-spacing:.03em; }
        .db-stat-val {
          font-family:'Playfair Display',serif; font-size:30px; font-weight:700; color:var(--sp-dark); line-height:1;
        }
        .db-stat-footer {
          display:flex; align-items:center; gap:6px; margin-top:14px; padding-top:12px;
          border-top:1px solid var(--sp-light); font-size:12px; color:#9a8a7a;
        }

        .db-panel {
          background:#fff; border:1px solid var(--sp-border); border-radius:var(--sp-radius); overflow:hidden; margin-bottom:24px;
        }
        .db-panel-head {
          display:flex; align-items:center; justify-content:space-between; padding:20px 24px 16px;
          border-bottom:1px solid rgba(0,0,0,0.06); gap:12px; flex-wrap:wrap;
        }
        .db-panel-icon {
          width:36px; height:36px; border-radius:9px; display:flex; align-items:center; justify-content:center;
          background:var(--pi); color:var(--pc); flex-shrink:0;
        }
        .db-panel-title {
          font-family:'Playfair Display',serif; font-size:16px; font-weight:700; color:var(--sp-dark); margin:0;
        }
        .db-panel-sub { font-size:11.5px; font-weight:300; color:#9a8a7a; margin:0; }

        .db-search-wrap { position:relative; }
        .db-search-icon {
          position:absolute; left:13px; top:50%; transform:translateY(-50%); color:#b5a090;
          pointer-events:none; display:flex; align-items:center;
        }
        .db-search {
          width:100%; min-width:280px; background:var(--sp-light); border:1.5px solid var(--sp-border);
          border-radius:9px; padding:10px 36px 10px 38px; font-family:'DM Sans',sans-serif; font-size:13.5px;
          color:var(--sp-dark); outline:none; transition:border-color .2s,box-shadow .2s;
        }
        .db-search::placeholder { color:#bdb3a8; }
        .db-search:focus {
          border-color:var(--sp-accent-border); box-shadow:0 0 0 3px var(--sp-accent-dim); background:#fff;
        }
        .db-search-clear {
          position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none;
          color:#b5a090; cursor:pointer; display:flex; align-items:center; padding:4px;
        }

        .db-sm-btn {
          display:inline-flex; align-items:center; gap:6px; padding:8px 14px; font-size:12.5px; font-weight:400;
          color:#7a6a5a; background:var(--sp-light); border:1px solid var(--sp-border); border-radius:8px;
          cursor:pointer; transition:background .2s; white-space:nowrap;
        }
        .db-sm-btn:hover { background:#ede8e0; color:var(--sp-dark); }
        .db-sm-btn:disabled { opacity:.45; cursor:not-allowed; }
        .db-sm-btn-primary { background:var(--sp-dark); color:#fff; border-color:var(--sp-dark); }
        .db-sm-btn-primary:hover { background:#1a1a2e; color:#fff; }

        .db-table { width:100%; border-collapse:collapse; }
        .db-table th {
          padding:10px 16px; font-size:11px; font-weight:500; letter-spacing:.1em; text-transform:uppercase;
          color:#9a8a7a; background:var(--sp-light); border-bottom:1px solid rgba(0,0,0,0.06); text-align:left; white-space:nowrap;
        }
        .db-table td {
          padding:14px 16px; font-size:13.5px; color:#4a4a5a; border-bottom:1px solid rgba(0,0,0,0.04); vertical-align:middle;
        }
        .db-table tbody tr:last-child td { border-bottom:none; }
        .db-table tbody tr:hover { background:var(--sp-light); }
        .db-table-empty { padding:56px 16px; text-align:center; color:#b5a090; font-size:13.5px; }

        .db-avatar-initials {
          width:40px; height:40px; border-radius:50%;
          background:linear-gradient(135deg, var(--sp-accent-dim), rgba(255,200,87,0.25));
          color:rgb(180,83,9); font-family:'Playfair Display',serif; font-size:13px; font-weight:700;
          display:flex; align-items:center; justify-content:center; flex-shrink:0; border:2px solid var(--sp-accent-border);
        }
        .db-user-name { font-weight:500; color:var(--sp-dark); line-height:1.2; }
        .db-user-sub { font-size:11.5px; color:#9a8a7a; }

        .db-badge {
          display:inline-flex; align-items:center; font-size:11.5px; font-weight:500;
          padding:3px 10px; border-radius:100px; white-space:nowrap;
        }
        .db-badge--blue   { background:rgba(59,130,246,.10);  color:rgb(59,130,246); }
        .db-badge--amber  { background:var(--sp-accent-dim);  color:rgb(180,83,9); }
        .db-badge--green  { background:rgba(34,197,94,.10);   color:rgb(21,128,61); }
        .db-badge--gray   { background:rgba(100,116,139,.09); color:#64748b; }
        .db-badge--violet { background:rgba(124,58,237,.09);  color:#7c3aed; }

        .db-view-btn, .db-action-btn, .db-delete-btn {
          display:inline-flex; align-items:center; gap:5px; padding:6px 12px; font-size:12.5px; font-weight:400;
          border-radius:7px; cursor:pointer; transition:background .2s,border-color .2s; white-space:nowrap;
        }
        .db-view-btn {
          color:rgb(180,83,9); background:var(--sp-accent-dim); border:1px solid var(--sp-accent-border);
        }
        .db-view-btn:hover { background:rgba(255,200,87,0.18); border-color:rgba(255,200,87,0.4); }

        .db-action-btn {
          color:#475569; background:#f8fafc; border:1px solid #e2e8f0;
        }
        .db-action-btn:hover { background:#eef2f7; }

        .db-delete-btn {
          color:#b91c1c; background:rgba(239,68,68,.06); border:1px solid rgba(239,68,68,.18);
        }
        .db-delete-btn:hover { background:rgba(239,68,68,.12); }

        .db-pagination {
          display:flex; align-items:center; justify-content:space-between; padding:14px 20px;
          flex-wrap:wrap; gap:10px; border-top:1px solid rgba(0,0,0,0.06);
        }
        .db-page-info { font-size:12px; font-weight:300; color:#9a8a7a; }
        .db-page-btn {
          display:inline-flex; align-items:center; gap:5px; padding:6px 12px; font-size:12.5px; font-weight:400;
          color:#7a6a5a; background:var(--sp-light); border:1px solid var(--sp-border); border-radius:7px; cursor:pointer;
        }
        .db-page-btn:hover:not(:disabled) { background:#ede8e0; color:var(--sp-dark); }
        .db-page-btn:disabled { opacity:.4; cursor:not-allowed; }
        .db-page-current { padding:6px 12px; font-size:12px; color:#9a8a7a; }

        .sp-overlay {
          position:fixed; inset:0; background:rgba(0,0,0,.6); backdrop-filter:blur(8px);
          z-index:1200; display:flex; align-items:center; justify-content:center; padding:16px;
        }
        .sp-card {
          width:min(980px,96vw); max-height:92vh; border-radius:20px; overflow:hidden; background:var(--sp-light);
          box-shadow:0 24px 72px rgba(0,0,0,.4); display:flex; flex-direction:column;
        }
        .sp-header {
          background:var(--sp-dark); padding:0; position:relative; overflow:hidden; flex-shrink:0;
        }
        .sp-header::before {
          content:''; position:absolute; inset:0;
          background-image:radial-gradient(circle,rgba(255,255,255,.04) 1px,transparent 1px);
          background-size:22px 22px; pointer-events:none;
        }
        .sp-header-glow {
          position:absolute; top:-40px; right:-40px; width:280px; height:280px; border-radius:50%;
          background:radial-gradient(circle,rgba(255,200,87,.10) 0%,transparent 65%);
        }
        .sp-header-top {
          position:relative; z-index:1; padding:24px 28px 0; display:flex; align-items:flex-start; justify-content:space-between;
          gap:16px; flex-wrap:wrap;
        }
        .sp-modal-avatar-initials {
          width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg, var(--sp-accent), #ffe0a0);
          color:var(--sp-dark); font-family:'Playfair Display',serif; font-size:20px; font-weight:700;
          display:flex; align-items:center; justify-content:center; border:3px solid rgba(255,255,255,.2);
        }
        .sp-online-dot {
          position:absolute; bottom:2px; right:2px; width:12px; height:12px; background:var(--sp-success);
          border:2px solid var(--sp-dark); border-radius:50%;
        }
        .sp-header-info { flex:1; min-width:0; }
        .sp-modal-name {
          font-family:'Playfair Display',serif; font-size:20px; font-weight:700; color:#fff; line-height:1.15; margin-bottom:4px;
        }
        .sp-modal-meta { display:flex; flex-wrap:wrap; gap:12px; }
        .sp-modal-meta-item {
          display:flex; align-items:center; gap:5px; font-size:12px; font-weight:300; color:rgba(255,255,255,0.35);
        }
        .sp-header-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }

        .sp-btn-edit, .sp-btn-save, .sp-btn-cancel, .sp-btn-close, .sp-btn-danger {
          display:inline-flex; align-items:center; gap:7px; border-radius:8px; cursor:pointer;
        }
        .sp-btn-edit {
          padding:8px 16px; font-size:13px; font-weight:500; color:var(--sp-dark);
          background:var(--sp-accent); border:none;
        }
        .sp-btn-edit:hover { background:#ffe0a0; }

        .sp-btn-save {
          padding:8px 16px; font-size:13px; font-weight:500; color:#fff;
          background:var(--sp-success); border:none;
        }
        .sp-btn-save:hover { background:rgb(21,128,61); }
        .sp-btn-save:disabled { opacity:.6; cursor:not-allowed; }

        .sp-btn-cancel {
          padding:8px 14px; font-size:13px; font-weight:400; color:rgba(255,255,255,.65);
          background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.15);
        }
        .sp-btn-cancel:hover { background:rgba(255,255,255,.12); color:#fff; }

        .sp-btn-danger {
          padding:8px 14px; font-size:13px; font-weight:500; color:#fff;
          background:#b91c1c; border:none;
        }
        .sp-btn-danger:hover { background:#991b1b; }
        .sp-btn-danger:disabled { opacity:.6; cursor:not-allowed; }

        .sp-btn-close {
          width:32px; height:32px; background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12);
          justify-content:center; color:rgba(255,255,255,.6); padding:0;
        }

        .sp-status {
          display:inline-flex; align-items:center; gap:5px; font-size:10.5px; font-weight:500;
          border-radius:100px; padding:2px 9px;
        }
        .sp-status--active {
          background:rgba(34,197,94,.15); color:var(--sp-success); border:1px solid rgba(34,197,94,.3);
        }
        .sp-status--inactive {
          background:rgba(100,116,139,.12); color:#94a3b8; border:1px solid rgba(100,116,139,.2);
        }
        .sp-status-dot { width:5px; height:5px; border-radius:50%; background:currentColor; }

        .sp-tabs {
          position:relative; z-index:1; display:flex; gap:2px; padding:16px 28px 0; overflow-x:auto; scrollbar-width:none;
        }
        .sp-tabs::-webkit-scrollbar { display:none; }
        .sp-tab {
          display:inline-flex; align-items:center; gap:7px; padding:9px 16px; font-size:13px; font-weight:400;
          color:rgba(255,255,255,.5); background:transparent; border:none; border-radius:8px 8px 0 0; cursor:pointer;
          white-space:nowrap; border-bottom:2px solid transparent;
        }
        .sp-tab:hover { color:rgba(255,255,255,.85); background:rgba(255,255,255,.05); }
        .sp-tab--active {
          color:var(--sp-accent); background:var(--sp-accent-dim); border-bottom-color:var(--sp-accent); font-weight:500;
        }

        .sp-body { overflow-y:auto; flex:1; padding:24px 28px 28px; }
        .sp-summary-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:16px; }
        @media(max-width:700px){ .sp-summary-grid{grid-template-columns:1fr;} }

        .sp-summary-card {
          background:#fff; border:1px solid var(--sp-border); border-radius:12px; padding:16px;
          display:flex; align-items:center; gap:12px;
        }
        .sp-summary-icon {
          width:36px; height:36px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0;
        }
        .sp-summary-label {
          font-size:11px; font-weight:500; text-transform:uppercase; letter-spacing:.08em; color:#9a8a7a; margin-bottom:2px;
        }
        .sp-summary-val   { font-size:13.5px; font-weight:500; color:var(--sp-dark); }
        .sp-summary-sub   { font-size:11.5px; color:#9a8a7a; }

        .sp-content-card {
          background:#fff; border:1px solid var(--sp-border); border-radius:var(--sp-radius); overflow:hidden; margin-bottom:16px;
        }
        .sp-content-card-head {
          display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid rgba(0,0,0,0.06);
          gap:8px; flex-wrap:wrap;
        }
        .sp-content-card-title {
          font-family:'Playfair Display',serif; font-size:14.5px; font-weight:700; color:var(--sp-dark);
        }
        .sp-content-card-sub { font-size:11.5px; font-weight:300; color:#9a8a7a; margin-top:1px; }
        .sp-count-badge {
          font-size:11px; font-weight:500; color:#9a8a7a; background:var(--sp-light);
          border:1px solid var(--sp-border); border-radius:100px; padding:2px 9px;
        }

        .sp-info-row {
          display:flex; align-items:baseline; justify-content:space-between; padding:11px 0; border-bottom:1px solid var(--sp-border); gap:16px;
        }
        .sp-info-row:last-child { border-bottom:none; }
        .sp-info-label {
          font-size:12px; font-weight:500; color:#9a8a7a; text-transform:uppercase; letter-spacing:.08em;
          display:flex; align-items:center; gap:5px; white-space:nowrap; flex-shrink:0;
        }
        .sp-info-icon { color:rgb(180,83,9); display:flex; align-items:center; }
        .sp-info-val { font-size:13.5px; font-weight:400; color:var(--sp-dark); text-align:right; }

        .sp-form-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
        @media(max-width:700px){ .sp-form-grid{grid-template-columns:1fr;} }
        .sp-form-full { grid-column:1/-1; }
        .sp-label { display:block; font-size:12px; font-weight:500; color:#4a4a5a; margin-bottom:6px; letter-spacing:.02em; }
        .sp-input, .sp-select {
          width:100%; background:var(--sp-light); border:1.5px solid var(--sp-border); border-radius:8px;
          padding:9px 12px; font-family:'DM Sans',sans-serif; font-size:13px; color:var(--sp-dark); outline:none;
        }
        .sp-input:focus, .sp-select:focus {
          border-color:var(--sp-accent-border); box-shadow:0 0 0 3px var(--sp-accent-dim); background:#fff;
        }

        .sp-security-warn {
          display:flex; align-items:flex-start; gap:10px; background:rgba(239,68,68,0.05);
          border:1px solid rgba(239,68,68,0.18); border-radius:9px; padding:12px 14px;
          font-size:12.5px; color:rgb(185,28,28); line-height:1.55; margin-bottom:18px;
        }
        .sp-credential-box {
          background:var(--sp-light); border:1.5px solid var(--sp-border); border-radius:10px; padding:16px 18px;
        }
        .sp-credential-label {
          font-size:11.5px; font-weight:500; color:#9a8a7a; text-transform:uppercase; letter-spacing:.1em; margin-bottom:8px; display:block;
        }
        .sp-credential-val { font-size:15px; font-weight:500; color:var(--sp-dark); font-family:monospace; }
        .sp-pw-row { display:flex; gap:8px; align-items:center; }
        .sp-pw-input {
          flex:1; background:#fff; border:1.5px solid var(--sp-border); border-radius:8px; padding:10px 14px;
          font-family:monospace; font-size:14px; color:var(--sp-dark); outline:none;
        }
        .sp-icon-btn {
          width:36px; height:36px; border-radius:8px; background:var(--sp-light); border:1.5px solid var(--sp-border);
          display:flex; align-items:center; justify-content:center; cursor:pointer; color:#7a6a5a;
        }
        .sp-icon-btn:hover { background:#ede8e0; color:var(--sp-dark); }

        .sp-empty { padding:52px 20px; text-align:center; }
        .sp-empty-title {
          font-family:'Playfair Display',serif; font-size:15px; font-weight:700; color:#4a4a5a; margin-bottom:5px;
        }
        .sp-empty-sub { font-size:13px; color:#b5a090; }

        .sp-footer {
          display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 28px;
          border-top:1px solid var(--sp-border); background:#fff; flex-wrap:wrap; flex-shrink:0;
        }
        .sp-footer-hint { font-size:12px; color:#b5a090; font-weight:300; }
        .sp-footer-close {
          display:inline-flex; align-items:center; gap:6px; padding:8px 16px; font-size:13px; font-weight:400;
          color:#7a6a5a; background:var(--sp-light); border:1px solid var(--sp-border); border-radius:8px; cursor:pointer;
        }

        .sp-spinner {
          width:18px; height:18px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%;
          animation:spSpin .7s linear infinite; flex-shrink:0;
        }
        .sp-spinner--dark { border:2px solid rgba(0,0,0,.12); border-top-color:var(--sp-dark); }
        @keyframes spSpin { to{transform:rotate(360deg)} }

        .sp-modal-form-success {
          background:rgba(34,197,94,.08); border:1px solid rgba(34,197,94,.2); border-radius:10px;
          padding:14px 16px; margin-bottom:16px;
        }
        .sp-modal-form-success-title {
          color:rgb(21,128,61); font-weight:600; margin-bottom:6px; font-size:13px;
        }
        .sp-modal-form-success-sub {
          color:#4b5563; font-size:12.5px; margin-bottom:8px;
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Bursars page" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loading && <Loader message="Loading bursars…" />}

            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />
              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Bursar Management
                  </div>
                  <h1 className="db-greeting">
                    {getGreeting()}, <em>Admin.</em>
                  </h1>
                  <p className="db-hero-sub">
                    Register bursars, manage account access, update contact details,
                    review credentials, and control active staff records from one clean interface.
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    <button className="db-btn-gold" onClick={openCreateModal}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.4" />
                        <path d="M2 15c0-3.314 2.686-6 6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M13 10v4M11 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      Add Bursar
                    </button>
                    <button className="db-btn-outline" onClick={fetchBursars} disabled={loading}>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        style={{ animation: loading ? "spSpin .8s linear infinite" : "none" }}
                      >
                        <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="db-hero-stat-card d-none d-md-block">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "var(--sp-accent)",
                      }}
                    >
                      Quick glance
                    </span>
                  </div>

                  <div className="d-flex flex-column gap-3">
                    {[
                      ["Total", bursars.length],
                      ["Active", activeCount],
                      ["Inactive", inactiveCount],
                    ].map(([l, v]) => (
                      <React.Fragment key={String(l)}>
                        <div className="db-hero-stat-item">
                          <span className="db-hero-stat-label">{l}</span>
                          <span className="db-hero-stat-val">{v}</span>
                        </div>
                        {l !== "Inactive" && <div className="db-hero-stat-sep" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="db-stats">
              {([
                {
                  title: "Total Bursars",
                  value: bursars.length,
                  color: "var(--bs-warning, rgb(245,158,11))",
                  bg: "rgba(245,158,11,0.10)",
                  icon: (
                    <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
                      <circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M1 17c0-3.314 2.686-6 6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      <circle cx="14" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                    </svg>
                  ),
                },
                {
                  title: "Active",
                  value: activeCount,
                  color: "var(--bs-success, rgb(34,197,94))",
                  bg: "rgba(34,197,94,0.10)",
                  icon: (
                    <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
                      <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M5.5 9.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                },
                {
                  title: "With Phone",
                  value: withPhoneCount,
                  color: "var(--bs-info, rgb(59,130,246))",
                  bg: "rgba(59,130,246,0.10)",
                  icon: (
                    <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
                      <rect x="5" y="2.5" width="8" height="13" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M8 13h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  ),
                },
                {
                  title: "With Address",
                  value: withAddressCount,
                  color: "var(--bs-primary, rgb(211,0,176))",
                  bg: "rgba(211,0,176,0.08)",
                  icon: (
                    <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
                      <path d="M9 16s5-4.6 5-8.4A5 5 0 109 16z" stroke="currentColor" strokeWidth="1.4" />
                      <circle cx="9" cy="7" r="1.8" stroke="currentColor" strokeWidth="1.3" />
                    </svg>
                  ),
                },
              ] as const).map((c, i) => (
                <div
                  key={c.title}
                  className="db-stat"
                  style={
                    {
                      "--sc": c.color,
                      "--si": c.bg,
                      animationDelay: `${i * 0.06}s`,
                    } as React.CSSProperties
                  }
                >
                  <div className="db-stat-head">
                    <div className="db-stat-icon">{c.icon}</div>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#c8bfb5" }}>
                      <circle cx="3" cy="7" r="1.2" fill="currentColor" />
                      <circle cx="7" cy="7" r="1.2" fill="currentColor" />
                      <circle cx="11" cy="7" r="1.2" fill="currentColor" />
                    </svg>
                  </div>
                  <p className="db-stat-label">{c.title}</p>
                  <div className="db-stat-val">{c.value}</div>
                  <div className="db-stat-footer">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M2 9l3-4 2 2 3-5" stroke="var(--sp-success)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span style={{ color: "var(--sp-success)", fontWeight: 500 }}>Directory</span>
                    &nbsp;staff snapshot
                  </div>
                </div>
              ))}
            </div>

            <div className="db-panel">
              <div className="db-panel-head">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="db-panel-icon"
                    style={{ "--pi": "var(--sp-accent-dim)", "--pc": "rgb(180,83,9)" } as React.CSSProperties}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M2 14c0-2.76 2.24-5 4-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      <path d="M11 3h3M11 6h3M10 9h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="db-panel-title">Bursar Directory</p>
                    <p className="db-panel-sub">Search bursars by name, phone or email.</p>
                  </div>
                </div>

                <div className="d-flex align-items-center flex-wrap gap-2">
                  <div className="db-search-wrap">
                    <span className="db-search-icon">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
                        <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </span>
                    <input
                      className="db-search"
                      placeholder="Search name, email or phone…"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                    />
                    {search && (
                      <button
                        className="db-search-clear"
                        onClick={() => {
                          setSearch("");
                          setPage(1);
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <button className="db-sm-btn" onClick={fetchBursars} disabled={loading}>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 14 14"
                      fill="none"
                      style={{ animation: loading ? "spSpin .8s linear infinite" : "none" }}
                    >
                      <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Refresh
                  </button>

                  <button className="db-sm-btn db-sm-btn-primary" onClick={openCreateModal}>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                    Add Bursar
                  </button>
                </div>
              </div>

              <div className="overflow-auto">
                <table className="db-table">
                  <thead>
                    <tr>
                      <th>Bursar</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={5} style={{ padding: "16px" }}>
                            <div
                              style={{
                                height: 14,
                                borderRadius: 6,
                                background: "linear-gradient(90deg,#ece8e0 25%,#e0dad2 50%,#ece8e0 75%)",
                                backgroundSize: "200% 100%",
                                animation: "spSpin 1.2s linear infinite",
                                opacity: 0.25,
                              }}
                            />
                          </td>
                        </tr>
                      ))
                    ) : paginatedBursars.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="db-table-empty">
                          No bursars found.
                        </td>
                      </tr>
                    ) : (
                      paginatedBursars.map((b) => {
                        const isActive = Number(b.status) === 1;
                        return (
                          <tr key={b.id}>
                            <td>
                              <div className="d-flex align-items-center gap-3">
                                <div className="db-avatar-initials">{initials(b)}</div>
                                <div>
                                  <div className="db-user-name">{fullName(b)}</div>
                                  <div className="db-user-sub">Bursar · ID #{b.id}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="db-badge db-badge--blue">{b.email}</span>
                            </td>
                            <td>
                              <span className="db-badge db-badge--amber">{b.phone}</span>
                            </td>
                            <td>
                              <span className={`db-badge ${isActive ? "db-badge--green" : "db-badge--gray"}`}>
                                {isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button className="db-view-btn" onClick={() => openBursar(b)}>
                                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                                  <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.3" />
                                  <circle cx="7" cy="7" r="1.5" fill="currentColor" />
                                </svg>
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="db-pagination">
                <span className="db-page-info">
                  Page {page} of {totalPages}
                </span>
                <div className="d-flex align-items-center gap-2">
                  <button className="db-page-btn" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Prev
                  </button>
                  <span className="db-page-current">
                    {page} / {totalPages}
                  </span>
                  <button className="db-page-btn" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
                    Next
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "auto" }}>
              <Footer />
            </div>
          </main>
        </div>
      </div>

      {/* ========================= CREATE MODAL ========================= */}
      {showCreateModal && (
        <div className="sp-overlay" onMouseDown={closeCreateModal}>
          <div className="sp-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="sp-header">
              <div className="sp-header-glow" />
              <div className="sp-header-top">
                <div className="d-flex align-items-center gap-3" style={{ flex: 1 }}>
                  <div className="sp-modal-avatar-initials">
                    {[newBursar.firstname?.[0], newBursar.surname?.[0]].filter(Boolean).join("").toUpperCase() || "B"}
                  </div>
                  <div className="sp-header-info">
                    <div className="sp-modal-name">Register New Bursar</div>
                    <div className="sp-modal-meta">
                      <span className="sp-modal-meta-item">Create bursar account for this school</span>
                    </div>
                  </div>
                </div>

                <div className="sp-header-actions">
                  <button className="sp-btn-close" onClick={closeCreateModal}>
                    <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                      <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="sp-body">
              {createdPassword && (
                <div className="sp-modal-form-success">
                  <div className="sp-modal-form-success-title">Bursar created successfully</div>
                  <div className="sp-modal-form-success-sub">
                    Copy the default password now and share it securely with the bursar.
                  </div>

                 <div>
  <span className="sp-credential-label">Default Password</span>
  <div className="sp-pw-row">
    <input
      className="sp-pw-input"
      type={passwordVisible ? "text" : "password"}
      value={passwordVisible ? decryptedPassword : "••••••••••"}
      readOnly
    />

    <button
      className="sp-icon-btn"
      onClick={decryptPassword}
      disabled={decryptingPassword}
      title={passwordVisible ? "Hide password" : "Decrypt password"}
    >
      {decryptingPassword ? (
        <span className="sp-spinner sp-spinner--dark" />
      ) : passwordVisible ? (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M3 3l10 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M6.2 6.2A2.5 2.5 0 009.8 9.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M2 8s2.5-5 6-5c1.1 0 2.1.2 3 .7M14 8s-2.5 5-6 5c-1.1 0-2.1-.2-3-.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      )}
    </button>

    <button
      className="sp-icon-btn"
      onClick={() => copyPassword()}
      disabled={!passwordVisible || !decryptedPassword}
      title="Copy"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M3 11V3a1 1 0 011-1h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </button>
  </div>

  {passwordVisible && decryptedPassword && (
    <p style={{ fontSize: 11.5, color: "var(--sp-success)", marginTop: 8, marginBottom: 0 }}>
      Password decrypted successfully
    </p>
  )}
</div>
                </div>
              )}

              <div className="sp-content-card">
                <div className="sp-content-card-head">
                  <div>
                    <div className="sp-content-card-title">Bursar Details</div>
                    <div className="sp-content-card-sub">Enter the bursar's personal and contact information.</div>
                  </div>
                </div>

                <div style={{ padding: "20px" }}>
                  <div className="sp-form-grid">
                    <div>
                      <label className="sp-label">First Name *</label>
                      <input
                        className="sp-input"
                        value={newBursar.firstname}
                        onChange={(e) => setNewBursar({ ...newBursar, firstname: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="sp-label">Surname *</label>
                      <input
                        className="sp-input"
                        value={newBursar.surname}
                        onChange={(e) => setNewBursar({ ...newBursar, surname: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="sp-label">Email *</label>
                      <input
                        className="sp-input"
                        type="email"
                        value={newBursar.email}
                        onChange={(e) => setNewBursar({ ...newBursar, email: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="sp-label">Phone *</label>
                      <input
                        className="sp-input"
                        value={newBursar.phone}
                        onChange={(e) => setNewBursar({ ...newBursar, phone: e.target.value })}
                      />
                    </div>

                    <div className="sp-form-full">
                      <label className="sp-label">Address</label>
                      <input
                        className="sp-input"
                        value={newBursar.address}
                        onChange={(e) => setNewBursar({ ...newBursar, address: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sp-footer">
              <span className="sp-footer-hint">A random default password will be generated automatically by the backend.</span>
              <div className="d-flex gap-2">
                <button className="sp-footer-close" onClick={closeCreateModal}>
                  Cancel
                </button>
                <button className="sp-btn-edit" onClick={createBursar} disabled={creating}>
                  {creating ? (
                    <>
                      <span className="sp-spinner sp-spinner--dark" style={{ borderTopColor: "var(--sp-dark)" }} />
                      Creating…
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      </svg>
                      Create Bursar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================= DETAILS MODAL ========================= */}
      {(selectedBursar || detailsLoading) && (
        <div className="sp-overlay" onMouseDown={closeDetailsModal}>
          <div className="sp-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="sp-header">
              <div className="sp-header-glow" />

              <div className="sp-header-top">
                <div className="d-flex align-items-center gap-3" style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ position: "relative" }}>
                    <div className="sp-modal-avatar-initials">{initials(selectedBursar)}</div>
                    {Number(selectedBursar?.status) === 1 && <div className="sp-online-dot" />}
                  </div>

                  <div className="sp-header-info">
                    <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                      <span className="sp-modal-name">{fullName(selectedBursar) || "Loading…"}</span>
                      {selectedBursar && (
                        <span
                          className={`sp-status ${
                            Number(selectedBursar.status) === 1 ? "sp-status--active" : "sp-status--inactive"
                          }`}
                        >
                          <span className="sp-status-dot" />
                          {Number(selectedBursar.status) === 1 ? "Active" : "Inactive"}
                        </span>
                      )}
                    </div>

                    <div className="sp-modal-meta">
                      <span className="sp-modal-meta-item">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <path d="M2 3.5h8v5H2z" stroke="currentColor" strokeWidth="1.1" />
                          <path d="M2 4l4 3 4-3" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
                        </svg>
                        {selectedBursar?.email || "—"}
                      </span>
                      <span className="sp-modal-meta-item">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <path d="M3.2 1.5h1.6l.6 1.7-1 .8a7 7 0 003.6 3.6l.8-1 1.7.6v1.6c0 .4-.3.7-.7.7A8.7 8.7 0 012.5 2.2c0-.4.3-.7.7-.7z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
                        </svg>
                        {selectedBursar?.phone || "—"}
                      </span>
                      <span className="sp-modal-meta-item">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <path d="M6 10s3.5-3.1 3.5-5.6A3.5 3.5 0 102.5 4.4C2.5 6.9 6 10 6 10z" stroke="currentColor" strokeWidth="1.1" />
                          <circle cx="6" cy="4.4" r="1.1" stroke="currentColor" strokeWidth="1" />
                        </svg>
                        {selectedBursar?.address || "No address"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="sp-header-actions">
                  {!detailsLoading && selectedBursar && !editMode && (
                    <button className="sp-btn-edit" onClick={enableEdit}>
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                        <path d="M9.5 2.5l2 2L5 11H3V9l6.5-6.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                      </svg>
                      Edit
                    </button>
                  )}

                  {editMode && (
                    <>
                      <button className="sp-btn-save" onClick={saveBursar} disabled={saving}>
                        {saving ? (
                          <>
                            <span className="sp-spinner" />
                            Saving…
                          </>
                        ) : (
                          <>
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                              <path d="M2 7l3.5 3.5 6.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Save
                          </>
                        )}
                      </button>
                      <button
                        className="sp-btn-cancel"
                        onClick={() => {
                          setEditMode(false);
                          setActiveTab("overview");
                        }}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {!detailsLoading && selectedBursar && (
                    <button className="sp-btn-danger" onClick={deleteBursar} disabled={deleting}>
                      {deleting ? (
                        <>
                          <span className="sp-spinner" />
                          Deleting…
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                            <path d="M2.5 4h9M5.5 4V2.8c0-.4.3-.8.8-.8h1.4c.5 0 .8.4.8.8V4M4 4l.5 7.3c0 .4.3.7.7.7h3.6c.4 0 .7-.3.7-.7L10 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Delete
                        </>
                      )}
                    </button>
                  )}

                  <button className="sp-btn-close" onClick={closeDetailsModal} aria-label="Close">
                    <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                      <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="sp-tabs">
                {([
                  {
                    key: "overview",
                    label: "Overview",
                    icon: (
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                        <rect x="1" y="1" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                        <rect x="8" y="1" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                        <rect x="1" y="8" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                        <rect x="8" y="8" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                      </svg>
                    ),
                  },
                  {
                    key: "edit",
                    label: "Edit",
                    icon: (
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                        <path d="M9.5 2.5l2 2L5 11H3V9l6.5-6.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                      </svg>
                    ),
                  },
                  {
                    key: "security",
                    label: "Security",
                    icon: (
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1.5L2 3.5v4c0 2.9 2.2 5.6 5 6.5 2.8-.9 5-3.6 5-6.5v-4L7 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                      </svg>
                    ),
                  },
                ] as { key: ModalTab; label: string; icon: React.ReactNode }[]).map((t) => (
                  <button
                    key={t.key}
                    className={`sp-tab ${activeTab === t.key ? "sp-tab--active" : ""}`}
                    onClick={() => setActiveTab(t.key)}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sp-body">
              {detailsLoading ? (
                <div className="d-flex flex-column align-items-center gap-3" style={{ padding: "48px 0" }}>
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 22 22"
                    fill="none"
                    style={{ animation: "spSpin .8s linear infinite", color: "rgb(180,83,9)" }}
                  >
                    <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round" />
                  </svg>
                  <span style={{ fontSize: 13, color: "#9a8a7a" }}>Loading bursar details…</span>
                </div>
              ) : !selectedBursar ? (
                <div className="sp-empty">
                  <div className="sp-empty-title">No details available</div>
                  <div className="sp-empty-sub">Failed to load bursar data.</div>
                </div>
              ) : (
                <>
                  {activeTab === "overview" && (
                    <>
                      <div className="sp-summary-grid">
                        <div className="sp-summary-card">
                          <div className="sp-summary-icon" style={{ background: "var(--sp-accent-dim)", color: "rgb(180,83,9)" }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M2 13a4 4 0 018 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                              <circle cx="6" cy="6" r="3" stroke="currentColor" strokeWidth="1.3" />
                            </svg>
                          </div>
                          <div>
                            <div className="sp-summary-label">Role</div>
                            <div className="sp-summary-val">Bursar</div>
                            <div className="sp-summary-sub">Finance staff account</div>
                          </div>
                        </div>

                        <div className="sp-summary-card">
                          <div className="sp-summary-icon" style={{ background: "rgba(59,130,246,0.08)", color: "rgb(59,130,246)" }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M3 3h10v10H3z" stroke="currentColor" strokeWidth="1.3" />
                              <path d="M3 5.5h10" stroke="currentColor" strokeWidth="1.3" />
                            </svg>
                          </div>
                          <div>
                            <div className="sp-summary-label">Email</div>
                            <div className="sp-summary-val">{selectedBursar.email || "N/A"}</div>
                            <div className="sp-summary-sub">Primary login/contact email</div>
                          </div>
                        </div>

                        <div className="sp-summary-card">
                          <div className="sp-summary-icon" style={{ background: "rgba(34,197,94,0.10)", color: "rgb(21,128,61)" }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
                              <path d="M5.5 8l1.5 1.5L10.5 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                          <div>
                            <div className="sp-summary-label">Status</div>
                            <div className="sp-summary-val">
                              {Number(selectedBursar.status) === 1 ? "Active" : "Inactive"}
                            </div>
                            <div className="sp-summary-sub">Current account accessibility</div>
                          </div>
                        </div>
                      </div>

                      <div className="sp-content-card">
                        <div className="sp-content-card-head">
                          <div>
                            <div className="sp-content-card-title">Bursar Details</div>
                            <div className="sp-content-card-sub">Personal and contact profile information.</div>
                          </div>
                          <span className="sp-count-badge">ID #{selectedBursar.id}</span>
                        </div>

                        <div
                          style={{
                            padding: "4px 20px 12px",
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "0 32px",
                          }}
                        >
                          <div>
                            <InfoRow label="First Name" value={selectedBursar.firstname} />
                            <InfoRow label="Surname" value={selectedBursar.surname} />
                            <InfoRow label="Email" value={selectedBursar.email} />
                          </div>
                          <div>
                            <InfoRow label="Phone" value={selectedBursar.phone} />
                            <InfoRow label="Address" value={selectedBursar.address || "N/A"} />
                            <InfoRow
                              label="Status"
                              value={Number(selectedBursar.status) === 1 ? "Active" : "Inactive"}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {activeTab === "edit" && (
                    <div className="sp-content-card">
                      <div className="sp-content-card-head">
                        <div>
                          <div className="sp-content-card-title">Edit Bursar</div>
                          <div className="sp-content-card-sub">Update staff information and account status.</div>
                        </div>
                      </div>

                      <div style={{ padding: "20px" }}>
                        <div className="sp-form-grid">
                          <div>
                            <label className="sp-label">First Name *</label>
                            <input
                              className="sp-input"
                              value={editedBursar.firstname}
                              onChange={(e) => setEditedBursar({ ...editedBursar, firstname: e.target.value })}
                            />
                          </div>

                          <div>
                            <label className="sp-label">Surname *</label>
                            <input
                              className="sp-input"
                              value={editedBursar.surname}
                              onChange={(e) => setEditedBursar({ ...editedBursar, surname: e.target.value })}
                            />
                          </div>

                          <div>
                            <label className="sp-label">Email *</label>
                            <input
                              className="sp-input"
                              type="email"
                              value={editedBursar.email}
                              onChange={(e) => setEditedBursar({ ...editedBursar, email: e.target.value })}
                            />
                          </div>

                          <div>
                            <label className="sp-label">Phone *</label>
                            <input
                              className="sp-input"
                              value={editedBursar.phone}
                              onChange={(e) => setEditedBursar({ ...editedBursar, phone: e.target.value })}
                            />
                          </div>

                          <div className="sp-form-full">
                            <label className="sp-label">Address</label>
                            <input
                              className="sp-input"
                              value={editedBursar.address}
                              onChange={(e) => setEditedBursar({ ...editedBursar, address: e.target.value })}
                            />
                          </div>

                          <div>
                            <label className="sp-label">Status</label>
                            <select
                              className="sp-select"
                              value={editedBursar.status}
                              onChange={(e) => setEditedBursar({ ...editedBursar, status: e.target.value })}
                            >
                              <option value="1">Active</option>
                              <option value="0">Inactive</option>
                            </select>
                          </div>
                          <div className="sp-form-full">
                        <label className="sp-label">
                            New Password
                            <span style={{ color: "#9a8a7a", fontWeight: 400 }}> (optional)</span>
                        </label>
                        <input
                            className="sp-input"
                            type="text"
                            placeholder="Leave blank to keep current password"
                            value={editedBursar.password}
                            onChange={(e) => setEditedBursar({ ...editedBursar, password: e.target.value })}
                        />
                        </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "security" && (
                    <div className="sp-content-card">
                      <div className="sp-content-card-head">
                        <div>
                          <div className="sp-content-card-title">Login Credentials</div>
                          <div className="sp-content-card-sub">Admin-only credential visibility for secure onboarding.</div>
                        </div>
                      </div>

                      <div className="d-flex flex-column gap-3" style={{ padding: "20px" }}>
                        <div className="sp-security-warn">
                          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                            <path d="M8 2L14 14H2L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                            <path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          </svg>
                          Default passwords should only be shared through secure channels. Encourage the bursar to change the password after first login.
                        </div>

                        <div>
                          <span className="sp-credential-label">Account Email</span>
                          <div className="sp-credential-box">
                            <span className="sp-credential-val">{selectedBursar.email || "N/A"}</span>
                          </div>
                        </div>

                        <div>
                          <span className="sp-credential-label">Default Password</span>
                          <div className="sp-pw-row">
                            <input
                              className="sp-pw-input"
                              type="text"
                              value={selectedBursar.default_password || "N/A"}
                              readOnly
                            />
                            <button
                              className="sp-icon-btn"
                              onClick={() => copyPassword(selectedBursar.default_password)}
                              title="Copy"
                            >
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                                <path d="M3 11V3a1 1 0 011-1h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="sp-footer">
              <span className="sp-footer-hint">Use tabs to switch between profile overview, edit form and credentials.</span>
              <button className="sp-footer-close" onClick={closeDetailsModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}