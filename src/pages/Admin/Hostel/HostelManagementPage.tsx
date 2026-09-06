import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import TopNav from "../../../components/LayoutComponents/TopNav";
import PageTitle from "../../../components/PageTitle";
import Footer from "../../../components/LayoutComponents/Footer";
import { hostelApi } from "../../../api/hostelApi";

type Room = { id: number; name: string; floor?: string; capacity: number; occupied: number; is_active: boolean };
type Hostel = { id: number; name: string; gender: string; warden_name?: string; warden_phone?: string; is_active: boolean; occupied: number; rooms: Room[] };
type Student = { id: number; firstname: string; surname: string; reg_no?: string; email?: string; sex?: string };
type Period = { id: number; name: string; is_current?: boolean };
type Allocation = { id: number; allocated_at: string; student: Student; hostel: { name: string; gender?: string }; room: Room; session?: Period; term?: Period };
type History = { id: number; action: string; reason?: string; created_at: string; student: Student; from_hostel?: { name: string }; from_room?: { name: string }; to_hostel?: { name: string }; to_room?: { name: string }; actor?: Student };
type Dashboard = { hostels: Hostel[]; students: Student[]; allocations: Allocation[]; history: History[]; sessions: Period[]; terms: Period[]; selected_session_id?: number; selected_term_id?: number; summary: { hostels: number; rooms: number; capacity: number; occupied: number } };

const emptyHostel = { name: "", gender: "mixed", warden_name: "", warden_phone: "", address: "" };
const errorMessage = (error: any) => error?.response?.data?.message || Object.values(error?.response?.data?.errors || {}).flat()[0] || "Something went wrong.";
const studentName = (student: Student) => `${student.firstname || ""} ${student.surname || ""}`.trim();

export default function HostelManagementPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState<Dashboard>({ hostels: [], students: [], allocations: [], history: [], sessions: [], terms: [], summary: { hostels: 0, rooms: 0, capacity: 0, occupied: 0 } });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [hostelForm, setHostelForm] = useState(emptyHostel);
  const [roomForm, setRoomForm] = useState({ hostel_id: "", name: "", floor: "", capacity: 1 });
  const [allocationForm, setAllocationForm] = useState({ student_id: "", hostel_room_id: "", session_id: "", term_id: "", notes: "" });
  const [search, setSearch] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [termFilter, setTermFilter] = useState("");
  const [transfer, setTransfer] = useState({ allocation_id: 0, room_id: "", reason: "" });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await hostelApi.dashboard({
        ...(sessionFilter ? { session_id: sessionFilter } : {}),
        ...(termFilter ? { term_id: termFilter } : {}),
      });
      setData(response.data);
      setAllocationForm((form) => ({
        ...form,
        session_id: form.session_id || String(response.data.selected_session_id || ""),
        term_id: form.term_id || String(response.data.selected_term_id || ""),
      }));
    } catch (err) {
      setError(String(errorMessage(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [sessionFilter, termFilter]);

  const rooms = useMemo(() => data.hostels.flatMap((hostel) => hostel.rooms.map((room) => ({ ...room, hostel }))), [data.hostels]);
  const availableRooms = rooms.filter((room) => room.is_active && room.hostel.is_active && room.occupied < room.capacity);
  const filtered = data.allocations.filter((item) => `${studentName(item.student)} ${item.student.reg_no || ""} ${item.hostel.name} ${item.room.name}`.toLowerCase().includes(search.toLowerCase()));
  const occupancy = data.summary.capacity ? Math.round((data.summary.occupied / data.summary.capacity) * 100) : 0;

  const run = async (action: () => Promise<unknown>, success: string) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
      await load();
      return true;
    } catch (err) {
      setError(String(errorMessage(err)));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const createHostel = async (event: FormEvent) => {
    event.preventDefault();
    if (await run(() => hostelApi.createHostel(hostelForm), "Hostel created successfully.")) {
      setHostelForm(emptyHostel);
    }
  };

  const createRoom = async (event: FormEvent) => {
    event.preventDefault();
    if (await run(() => hostelApi.createRoom(Number(roomForm.hostel_id), roomForm), "Room added successfully.")) {
      setRoomForm({ hostel_id: "", name: "", floor: "", capacity: 1 });
    }
  };

  const allocate = async (event: FormEvent) => {
    event.preventDefault();
    if (await run(() => hostelApi.allocate(allocationForm), "Student allocated successfully.")) {
      setAllocationForm((form) => ({ student_id: "", hostel_room_id: "", session_id: form.session_id, term_id: form.term_id, notes: "" }));
    }
  };

  const editHostel = (hostel: Hostel) => {
    const name = window.prompt("Hostel name", hostel.name);
    if (!name) return;
    const warden_name = window.prompt("Warden name", hostel.warden_name || "") ?? hostel.warden_name;
    run(() => hostelApi.updateHostel(hostel.id, { name, warden_name }), "Hostel updated.");
  };

  const editRoom = (room: Room) => {
    const name = window.prompt("Room name", room.name);
    if (!name) return;
    const capacity = Number(window.prompt("Bed capacity", String(room.capacity)));
    if (!capacity) return;
    run(() => hostelApi.updateRoom(room.id, { name, capacity }), "Room updated.");
  };

  const submitTransfer = async () => {
    if (!transfer.allocation_id || !transfer.room_id || transfer.reason.trim().length < 3) return;
    if (await run(() => hostelApi.transfer(transfer.allocation_id, Number(transfer.room_id), transfer.reason), "Student transferred successfully.")) {
      setTransfer({ allocation_id: 0, room_id: "", reason: "" });
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Admission No", "Student", "Gender", "Hostel", "Room", "Session", "Term", "Allocated"],
      ...filtered.map((item) => [
        item.student.reg_no || "",
        studentName(item.student),
        item.student.sex || "",
        item.hostel.name,
        item.room.name,
        item.session?.name || "",
        item.term?.name || "",
        new Date(item.allocated_at).toLocaleDateString(),
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "hostel-allocations.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <>
      <PageTitle title="Hostel Management" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        :root {
          --sp-dark: #0F2744;
          --sp-accent: #D97706;
          --sp-accent-dim: rgba(217, 119, 6, 0.10);
          --sp-accent-border: rgba(217, 119, 6, 0.25);
          --sp-light: #FFFFFF;
          --sp-border: #E2E8F0;
        }

        .db-main {
          padding: 24px 28px 48px;
          background: #F8FAFC;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          min-height: 100vh;
        }

        /* Hero */
        .db-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 18px;
          padding: 32px 36px;
          position: relative;
          overflow: hidden;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
        }
        .db-hero-glow {
          position: absolute;
          top: -90px;
          right: -40px;
          width: 380px;
          height: 380px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.15), transparent 70%);
          pointer-events: none;
        }
        .db-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          flex-wrap: wrap;
        }
        .db-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #FBBF24;
          background: rgba(217, 119, 6, 0.20);
          border: 1px solid rgba(217, 119, 6, 0.35);
          border-radius: 999px;
          padding: 4px 12px;
          margin-bottom: 12px;
        }
        .db-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
        }
        .db-title {
          font-size: 26px;
          font-weight: 800;
          color: #fff;
          line-height: 1.15;
          margin: 0 0 8px;
        }
        .db-title em {
          color: #FBBF24;
          font-style: normal;
        }
        .db-hero-sub {
          font-size: 13.5px;
          color: #CBD5E1;
          line-height: 1.6;
          max-width: 600px;
          margin: 0;
        }
        .db-btn-gold {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #D97706;
          color: #FFFFFF;
          font-weight: 700;
          font-size: 13px;
          padding: 9px 18px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .db-btn-gold:hover {
          background: #B45309;
          transform: translateY(-1px);
          color: #FFFFFF;
        }
          text-decoration: none;
        }
        .db-btn-gold:hover {
          background: linear-gradient(135deg, #d4b55a 0%, #c4a245 100%);
          transform: translateY(-1px);
          color: #050008;
        }
        .db-hero-stats {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 16px 20px;
          min-width: 260px;
          backdrop-filter: blur(10px);
        }
        .db-hero-row {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          padding: 6px 0;
          color: #94a3b8;
          font-size: 12.5px;
        }
        .db-hero-row + .db-hero-row {
          border-top: 1px solid rgba(255,255,255,0.08);
        }
        .db-hero-row strong {
          font-family: "Playfair Display", Georgia, serif;
          color: #fff;
          font-size: 16px;
        }

        /* KPI Cards */
        .db-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .db-stat {
          background: #fff;
          border: 1px solid var(--sp-border);
          border-radius: 16px;
          padding: 20px;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .db-stat:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(5,0,8,0.06);
        }
        .db-stat::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--sc, #c9a84c);
        }
        .db-stat-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .db-stat-label {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #7a6a5a;
        }
        .db-stat-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--si, rgba(201,168,76,0.12));
          color: var(--sc, #c9a84c);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        .db-stat-val {
          font-family: "Playfair Display", Georgia, serif;
          font-size: 26px;
          font-weight: 700;
          color: #1a1a2e;
          line-height: 1.1;
        }
        .db-stat-sub {
          font-size: 11.5px;
          color: #9a8a7a;
          margin-top: 4px;
        }

        /* Panel */
        .db-panel {
          background: #fff;
          border: 1px solid var(--sp-border);
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(5,0,8,0.04);
          overflow: hidden;
        }
        .db-panel-head {
          padding: 18px 22px;
          border-bottom: 1px solid var(--sp-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          background: #faf8f5;
        }
        .db-panel-title {
          font-family: "Playfair Display", Georgia, serif;
          font-size: 16px;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0;
        }
        .db-panel-sub {
          font-size: 11.5px;
          color: #7a6a5a;
          margin: 2px 0 0;
        }

        /* Forms */
        .db-form-label {
          font-size: 12px;
          font-weight: 600;
          color: #5a4d41;
          margin-bottom: 5px;
        }
        .db-form-control, .db-form-select {
          border: 1px solid #e5ddd3;
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 13px;
          background: #fff;
          color: #1a1a2e;
        }
        .db-form-control:focus, .db-form-select:focus {
          border-color: #c9a84c;
          box-shadow: 0 0 0 3px rgba(201,168,76,0.18);
          outline: none;
        }

        /* Badges */
        .db-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11.5px;
          font-weight: 700;
          white-space: nowrap;
        }
        .db-badge--blue { background: rgba(59,130,246,0.12); color: #1d4ed8; }
        .db-badge--green { background: rgba(34,197,94,0.14); color: #15803d; }
        .db-badge--amber { background: rgba(245,158,11,0.14); color: #b45309; }
        .db-badge--red { background: rgba(239,68,68,0.12); color: #dc2626; }
        .db-badge--gray { background: rgba(100,116,139,0.14); color: #475569; }

        /* Icon action buttons */
        .db-icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 8px;
          font-size: 14px;
          border: 1px solid #e5ddd3;
          background: #f5f1eb;
          color: #7a6a5a;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .db-icon-btn:hover { background: #ede8e0; transform: translateY(-1px); }
        .db-icon-btn--p { background: rgba(99,102,241,0.12); border-color: rgba(99,102,241,0.25); color: #4338ca; }
        .db-icon-btn--p:hover { background: rgba(99,102,241,0.22); }
        .db-icon-btn--r { background: rgba(244,63,94,0.10); border-color: rgba(244,63,94,0.25); color: #be123c; }
        .db-icon-btn--r:hover { background: rgba(244,63,94,0.20); }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Hostel Management" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {/* ═══ HERO ═══ */}
            <div className="db-hero">
              <div className="db-hero-glow" />
              <div className="db-hero-inner">
                <div>
                  <div className="db-kicker">
                    <span className="db-dot" />
                    Accommodation Operations & Housing
                  </div>
                  <h1 className="db-title">
                    Hostel <em>Management</em>
                  </h1>
                  <p className="db-hero-sub">
                    Configure dormitory buildings, manage bed space capacity, allocate student accommodation, and track live occupancy.
                  </p>
                </div>

                <div className="db-hero-stats d-none d-md-block">
                  <div className="db-hero-row">
                    <span>Occupancy Rate</span>
                    <strong>{occupancy}%</strong>
                  </div>
                  <div className="db-hero-row">
                    <span>Available Spaces</span>
                    <strong>{Math.max(0, data.summary.capacity - data.summary.occupied)}</strong>
                  </div>
                  <div className="db-hero-row">
                    <span>Active Hostels</span>
                    <strong>{data.summary.hostels}</strong>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert">
                <i className="bi bi-exclamation-triangle-fill" />
                <div>{error}</div>
              </div>
            )}
            {notice && (
              <div className="alert alert-success d-flex align-items-center gap-2 mb-4" role="alert">
                <i className="bi bi-check-circle-fill" />
                <div>{notice}</div>
              </div>
            )}

            {/* Filter toolbar */}
            <div className="db-panel mb-4">
              <div className="p-3 d-flex flex-wrap align-items-end gap-3" style={{ background: "#faf8f5" }}>
                <div>
                  <label className="db-form-label">Academic Session</label>
                  <select
                    className="form-select db-form-select"
                    value={sessionFilter}
                    onChange={(e) => setSessionFilter(e.target.value)}
                  >
                    <option value="">Current Session</option>
                    {data.sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="db-form-label">Term</label>
                  <select
                    className="form-select db-form-select"
                    value={termFilter}
                    onChange={(e) => setTermFilter(e.target.value)}
                  >
                    <option value="">All Terms</option>
                    {data.terms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="db-btn-gold ms-auto"
                  onClick={exportCsv}
                  disabled={!filtered.length}
                  style={{ padding: "8px 16px", fontSize: 12.5 }}
                >
                  <i className="bi bi-download" />
                  Export Allocations CSV
                </button>
              </div>
            </div>

            {/* ═══ KPI STATS ═══ */}
            <div className="db-stats">
              <div className="db-stat" style={{ "--sc": "#2563eb", "--si": "rgba(37,99,235,0.10)" } as any}>
                <div className="db-stat-head">
                  <span className="db-stat-label">Hostels</span>
                  <div className="db-stat-icon">
                    <i className="bi bi-buildings" />
                  </div>
                </div>
                <div className="db-stat-val">{data.summary.hostels}</div>
                <div className="db-stat-sub">Accommodation buildings</div>
              </div>

              <div className="db-stat" style={{ "--sc": "#0891b2", "--si": "rgba(8,145,178,0.10)" } as any}>
                <div className="db-stat-head">
                  <span className="db-stat-label">Rooms</span>
                  <div className="db-stat-icon">
                    <i className="bi bi-door-open" />
                  </div>
                </div>
                <div className="db-stat-val">{data.summary.rooms}</div>
                <div className="db-stat-sub">Configured dormitory rooms</div>
              </div>

              <div className="db-stat" style={{ "--sc": "#b45309", "--si": "rgba(245,158,11,0.12)" } as any}>
                <div className="db-stat-head">
                  <span className="db-stat-label">Bed Capacity</span>
                  <div className="db-stat-icon">
                    <i className="bi bi-grid-3x3-gap" />
                  </div>
                </div>
                <div className="db-stat-val">{data.summary.capacity}</div>
                <div className="db-stat-sub">Total student bed spaces</div>
              </div>

              <div className="db-stat" style={{ "--sc": "#15803d", "--si": "rgba(34,197,94,0.12)" } as any}>
                <div className="db-stat-head">
                  <span className="db-stat-label">Students Housed</span>
                  <div className="db-stat-icon">
                    <i className="bi bi-people" />
                  </div>
                </div>
                <div className="db-stat-val">{data.summary.occupied}</div>
                <div className="db-stat-sub">{occupancy}% occupancy rate</div>
              </div>
            </div>

            {/* ═══ 3-COLUMN CREATION FORMS ═══ */}
            <div className="row g-4 mb-4">
              <div className="col-xl-4">
                <div className="db-panel h-100">
                  <div className="db-panel-head">
                    <div>
                      <h5 className="db-panel-title">Add Hostel</h5>
                      <p className="db-panel-sub">Create an accommodation building</p>
                    </div>
                  </div>
                  <form className="p-4" onSubmit={createHostel}>
                    <div className="mb-3">
                      <label className="db-form-label">Hostel Name</label>
                      <input
                        className="form-control db-form-control"
                        required
                        value={hostelForm.name}
                        onChange={(e) => setHostelForm({ ...hostelForm, name: e.target.value })}
                        placeholder="e.g. Mandela Hall"
                      />
                    </div>
                    <div className="row g-2 mb-3">
                      <div className="col-5">
                        <label className="db-form-label">Gender</label>
                        <select
                          className="form-select db-form-select"
                          value={hostelForm.gender}
                          onChange={(e) => setHostelForm({ ...hostelForm, gender: e.target.value })}
                        >
                          <option value="mixed">Mixed</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <div className="col-7">
                        <label className="db-form-label">Warden Name</label>
                        <input
                          className="form-control db-form-control"
                          value={hostelForm.warden_name}
                          onChange={(e) => setHostelForm({ ...hostelForm, warden_name: e.target.value })}
                          placeholder="e.g. Mr. Okon"
                        />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="db-form-label">Warden Phone</label>
                      <input
                        className="form-control db-form-control"
                        value={hostelForm.warden_phone}
                        onChange={(e) => setHostelForm({ ...hostelForm, warden_phone: e.target.value })}
                        placeholder="e.g. 08012345678"
                      />
                    </div>
                    <button className="db-btn-gold w-100 justify-content-center" disabled={saving}>
                      Create Hostel
                    </button>
                  </form>
                </div>
              </div>

              <div className="col-xl-4">
                <div className="db-panel h-100">
                  <div className="db-panel-head">
                    <div>
                      <h5 className="db-panel-title">Add Room</h5>
                      <p className="db-panel-sub">Capacity is the available bed count</p>
                    </div>
                  </div>
                  <form className="p-4" onSubmit={createRoom}>
                    <div className="mb-3">
                      <label className="db-form-label">Hostel</label>
                      <select
                        className="form-select db-form-select"
                        required
                        value={roomForm.hostel_id}
                        onChange={(e) => setRoomForm({ ...roomForm, hostel_id: e.target.value })}
                      >
                        <option value="">Select hostel</option>
                        {data.hostels
                          .filter((h) => h.is_active)
                          .map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="row g-2 mb-3">
                      <div className="col-7">
                        <label className="db-form-label">Room Name / No.</label>
                        <input
                          className="form-control db-form-control"
                          required
                          value={roomForm.name}
                          onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                          placeholder="e.g. Room 101"
                        />
                      </div>
                      <div className="col-5">
                        <label className="db-form-label">Capacity</label>
                        <input
                          className="form-control db-form-control"
                          type="number"
                          min={1}
                          max={1000}
                          required
                          value={roomForm.capacity}
                          onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="db-form-label">Floor / Block</label>
                      <input
                        className="form-control db-form-control"
                        value={roomForm.floor}
                        onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })}
                        placeholder="e.g. Ground Floor"
                      />
                    </div>
                    <button className="db-btn-gold w-100 justify-content-center" disabled={saving || !data.hostels.length}>
                      Add Room
                    </button>
                  </form>
                </div>
              </div>

              <div className="col-xl-4">
                <div className="db-panel h-100">
                  <div className="db-panel-head">
                    <div>
                      <h5 className="db-panel-title">Allocate Student</h5>
                      <p className="db-panel-sub">Only rooms with vacant spaces shown</p>
                    </div>
                  </div>
                  <form className="p-4" onSubmit={allocate}>
                    <div className="mb-3">
                      <label className="db-form-label">Student</label>
                      <select
                        className="form-select db-form-select"
                        required
                        value={allocationForm.student_id}
                        onChange={(e) => setAllocationForm({ ...allocationForm, student_id: e.target.value })}
                      >
                        <option value="">Select student</option>
                        {data.students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {studentName(s)} {s.reg_no ? `(${s.reg_no})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="db-form-label">Room</label>
                      <select
                        className="form-select db-form-select"
                        required
                        value={allocationForm.hostel_room_id}
                        onChange={(e) => setAllocationForm({ ...allocationForm, hostel_room_id: e.target.value })}
                      >
                        <option value="">Select available room</option>
                        {availableRooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.hostel.name} · {r.name} ({r.capacity - r.occupied} vacant)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="row g-2 mb-3">
                      <div className="col-7">
                        <label className="db-form-label">Session</label>
                        <select
                          className="form-select db-form-select"
                          required
                          value={allocationForm.session_id}
                          onChange={(e) => setAllocationForm({ ...allocationForm, session_id: e.target.value })}
                        >
                          {data.sessions.map((session) => (
                            <option key={session.id} value={session.id}>
                              {session.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-5">
                        <label className="db-form-label">Term</label>
                        <select
                          className="form-select db-form-select"
                          value={allocationForm.term_id}
                          onChange={(e) => setAllocationForm({ ...allocationForm, term_id: e.target.value })}
                        >
                          <option value="">All Year</option>
                          {data.terms.map((term) => (
                            <option key={term.id} value={term.id}>
                              {term.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="db-form-label">Notes (Optional)</label>
                      <input
                        className="form-control db-form-control"
                        value={allocationForm.notes}
                        onChange={(e) => setAllocationForm({ ...allocationForm, notes: e.target.value })}
                        placeholder="e.g. Special medical need"
                      />
                    </div>
                    <button
                      className="db-btn-gold w-100 justify-content-center"
                      disabled={saving || !availableRooms.length}
                    >
                      Allocate Student
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* ═══ HOSTEL & ROOMS VISUAL CARDS ═══ */}
            <div className="db-panel mb-4">
              <div className="db-panel-head">
                <div>
                  <h5 className="db-panel-title">Hostels and Room Occupancy</h5>
                  <p className="db-panel-sub">Real-time capacity and occupant breakdown</p>
                </div>
              </div>
              <div className="p-4">
                <div className="row g-3">
                  {data.hostels.map((hostel) => (
                    <div className="col-xl-6" key={hostel.id}>
                      <div className="p-3 border rounded-3 h-100" style={{ background: "#faf8f5" }}>
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h5 className="mb-1" style={{ fontFamily: "Playfair Display, serif", color: "#1a1a2e" }}>
                              {hostel.name}
                            </h5>
                            <div className="small text-muted text-capitalize">
                              {hostel.gender} · Warden: {hostel.warden_name || "Unassigned"}
                            </div>
                          </div>
                          <span className={`db-badge ${hostel.is_active ? "db-badge--green" : "db-badge--gray"}`}>
                            {hostel.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="row g-2 mt-2">
                          {hostel.rooms.map((room) => {
                            const pct = Math.min(100, room.capacity ? (room.occupied / room.capacity) * 100 : 0);
                            return (
                              <div className="col-sm-6" key={room.id}>
                                <div className="p-2 bg-white rounded-3 border" style={{ borderColor: "#e5ddd3" }}>
                                  <div className="d-flex justify-content-between small fw-bold">
                                    <span>{room.name}</span>
                                    <span style={{ color: pct >= 100 ? "#dc2626" : "#15803d" }}>
                                      {room.occupied}/{room.capacity}
                                    </span>
                                  </div>
                                  <div className="progress mt-2" style={{ height: 6, background: "#f0ece4" }}>
                                    <div
                                      className="progress-bar"
                                      style={{
                                        width: `${pct}%`,
                                        background: pct >= 100 ? "#dc2626" : pct >= 75 ? "#f59e0b" : "#22c55e",
                                      }}
                                    />
                                  </div>
                                  <div className="d-flex justify-content-between mt-1 text-muted" style={{ fontSize: 11 }}>
                                    <span>{room.floor || "Ground Floor"}</span>
                                    <span>{room.capacity - room.occupied} left</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {!hostel.rooms.length && (
                            <div className="text-muted small p-2">No rooms added to this hostel yet.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!loading && !data.hostels.length && (
                    <div className="text-center text-muted py-5">No hostels configured yet. Use the form above to add your first hostel.</div>
                  )}
                </div>
              </div>
            </div>

            {/* ═══ CURRENT RESIDENTS TABLE ═══ */}
            <div className="db-panel mb-4">
              <div className="db-panel-head">
                <div>
                  <h5 className="db-panel-title">Current Residents</h5>
                  <p className="db-panel-sub">Active student room allocations</p>
                </div>
                <div className="position-relative" style={{ maxWidth: 280 }}>
                  <input
                    className="form-control db-form-control"
                    placeholder="Search student or room..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ paddingLeft: 32 }}
                  />
                  <i
                    className="bi bi-search position-absolute text-muted"
                    style={{ left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12 }}
                  />
                </div>
              </div>
              <div className="table-responsive">
                <table className="table align-middle mb-0" style={{ fontSize: 13.5 }}>
                  <thead style={{ background: "#faf8f5" }}>
                    <tr>
                      <th className="ps-4 text-muted small fw-bold">Student</th>
                      <th className="text-muted small fw-bold">Hostel</th>
                      <th className="text-muted small fw-bold">Room</th>
                      <th className="text-muted small fw-bold">Allocated Date</th>
                      <th className="text-end pe-4 text-muted small fw-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                      <tr key={item.id} style={{ borderBottom: "1px solid #ede8e0" }}>
                        <td className="ps-4">
                          <strong style={{ color: "#1a1a2e" }}>{studentName(item.student)}</strong>
                          <div className="small text-muted">{item.student.reg_no || item.student.email}</div>
                        </td>
                        <td>
                          <span className="db-badge db-badge--blue">{item.hostel.name}</span>
                        </td>
                        <td>{item.room.name}</td>
                        <td className="text-muted">{new Date(item.allocated_at).toLocaleDateString()}</td>
                        <td className="text-end pe-4">
                          <button
                            className="db-icon-btn db-icon-btn--r"
                            disabled={saving}
                            title="Check out student from room"
                            onClick={() =>
                              window.confirm("Check this student out of the hostel?") &&
                              run(() => hostelApi.checkout(item.id), "Student checked out successfully.")
                            }
                          >
                            <i className="bi bi-box-arrow-right" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!loading && !filtered.length && (
                      <tr>
                        <td colSpan={5} className="text-center text-muted py-5">
                          No active student allocations found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ═══ TRANSFER RESIDENT ═══ */}
            <div className="db-panel mb-4">
              <div className="db-panel-head">
                <div>
                  <h5 className="db-panel-title">Transfer a Resident</h5>
                  <p className="db-panel-sub">Move an active resident to another room while preserving history</p>
                </div>
              </div>
              <div className="p-4">
                <div className="row g-3 align-items-end">
                  <div className="col-md-4">
                    <label className="db-form-label">Resident</label>
                    <select
                      className="form-select db-form-select"
                      value={transfer.allocation_id || ""}
                      onChange={(e) => setTransfer({ ...transfer, allocation_id: Number(e.target.value) })}
                    >
                      <option value="">Select resident</option>
                      {data.allocations.map((item) => (
                        <option key={item.id} value={item.id}>
                          {studentName(item.student)} · {item.hostel.name}/{item.room.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="db-form-label">Destination Room</label>
                    <select
                      className="form-select db-form-select"
                      value={transfer.room_id}
                      onChange={(e) => setTransfer({ ...transfer, room_id: e.target.value })}
                    >
                      <option value="">Select destination room</option>
                      {availableRooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.hostel.name} · {room.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="db-form-label">Reason for Transfer</label>
                    <input
                      className="form-control db-form-control"
                      value={transfer.reason}
                      onChange={(e) => setTransfer({ ...transfer, reason: e.target.value })}
                      placeholder="e.g. Upgraded room"
                    />
                  </div>
                  <div className="col-md-2">
                    <button
                      className="db-btn-gold w-100 justify-content-center"
                      disabled={
                        saving || !transfer.allocation_id || !transfer.room_id || transfer.reason.trim().length < 3
                      }
                      onClick={submitTransfer}
                    >
                      Transfer
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ MANAGE ACCOMMODATION TABLE ═══ */}
            <div className="db-panel mb-4">
              <div className="db-panel-head">
                <div>
                  <h5 className="db-panel-title">Manage Buildings & Rooms</h5>
                  <p className="db-panel-sub">Edit details or toggle operational status</p>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table align-middle mb-0" style={{ fontSize: 13.5 }}>
                  <thead style={{ background: "#faf8f5" }}>
                    <tr>
                      <th className="ps-4 text-muted small fw-bold">Building / Room</th>
                      <th className="text-muted small fw-bold">Gender / Floor</th>
                      <th className="text-muted small fw-bold">Bed Spaces</th>
                      <th className="text-muted small fw-bold">Status</th>
                      <th className="text-end pe-4 text-muted small fw-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.hostels.flatMap((hostel) => [
                      <tr key={`h-${hostel.id}`} style={{ background: "#fbf9f6", borderBottom: "1px solid #ede8e0" }}>
                        <td className="ps-4 fw-bold" style={{ color: "#1a1a2e" }}>
                          <i className="bi bi-building me-2 text-warning" />
                          {hostel.name}
                        </td>
                        <td className="text-capitalize">{hostel.gender}</td>
                        <td>
                          <strong>{hostel.rooms.reduce((sum, room) => sum + room.capacity, 0)}</strong> total beds
                        </td>
                        <td>
                          <span className={`db-badge ${hostel.is_active ? "db-badge--green" : "db-badge--gray"}`}>
                            {hostel.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="text-end pe-4">
                          <button
                            className="db-icon-btn db-icon-btn--p me-2"
                            title="Edit Hostel"
                            onClick={() => editHostel(hostel)}
                          >
                            <i className="bi bi-pencil" />
                          </button>
                          <button
                            className="db-icon-btn"
                            title={hostel.is_active ? "Deactivate Hostel" : "Activate Hostel"}
                            onClick={() =>
                              run(
                                () => hostelApi.updateHostel(hostel.id, { is_active: !hostel.is_active }),
                                hostel.is_active ? "Hostel deactivated." : "Hostel activated."
                              )
                            }
                          >
                            <i className={`bi ${hostel.is_active ? "bi-toggle-on text-success" : "bi-toggle-off text-muted"}`} />
                          </button>
                        </td>
                      </tr>,
                      ...hostel.rooms.map((room) => (
                        <tr key={`r-${room.id}`} style={{ borderBottom: "1px solid #ede8e0" }}>
                          <td className="ps-5 text-muted">
                            <span className="me-2">↳</span>
                            {room.name}
                          </td>
                          <td className="text-muted">{room.floor || "—"}</td>
                          <td>
                            {room.occupied}/{room.capacity} beds
                          </td>
                          <td>
                            <span className={`db-badge ${room.is_active ? "db-badge--green" : "db-badge--gray"}`}>
                              {room.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="text-end pe-4">
                            <button
                              className="db-icon-btn db-icon-btn--p me-2"
                              title="Edit Room"
                              onClick={() => editRoom(room)}
                            >
                              <i className="bi bi-pencil" />
                            </button>
                            <button
                              className="db-icon-btn"
                              title={room.is_active ? "Deactivate Room" : "Activate Room"}
                              onClick={() =>
                                run(
                                  () => hostelApi.updateRoom(room.id, { is_active: !room.is_active }),
                                  room.is_active ? "Room deactivated." : "Room activated."
                                )
                              }
                            >
                              <i className={`bi ${room.is_active ? "bi-toggle-on text-success" : "bi-toggle-off text-muted"}`} />
                            </button>
                          </td>
                        </tr>
                      )),
                    ])}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ═══ ALLOCATION HISTORY TABLE ═══ */}
            <div className="db-panel mb-4">
              <div className="db-panel-head">
                <div>
                  <h5 className="db-panel-title">Allocation History Log</h5>
                  <p className="db-panel-sub">Auditable history of assignments, check-outs, and transfers</p>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table align-middle mb-0" style={{ fontSize: 13.5 }}>
                  <thead style={{ background: "#faf8f5" }}>
                    <tr>
                      <th className="ps-4 text-muted small fw-bold">Student</th>
                      <th className="text-muted small fw-bold">Action</th>
                      <th className="text-muted small fw-bold">Movement</th>
                      <th className="text-muted small fw-bold">Reason</th>
                      <th className="text-muted small fw-bold">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.history.map((event) => (
                      <tr key={event.id} style={{ borderBottom: "1px solid #ede8e0" }}>
                        <td className="ps-4">
                          <strong style={{ color: "#1a1a2e" }}>{studentName(event.student)}</strong>
                          <div className="small text-muted">{event.student.reg_no}</div>
                        </td>
                        <td>
                          <span
                            className={`db-badge ${
                              event.action.includes("checkout")
                                ? "db-badge--red"
                                : event.action.includes("transfer")
                                ? "db-badge--amber"
                                : "db-badge--green"
                            }`}
                          >
                            {event.action.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td>
                          {event.from_hostel?.name
                            ? `${event.from_hostel.name}/${event.from_room?.name || ""} → `
                            : ""}
                          {event.to_hostel?.name
                            ? `${event.to_hostel.name}/${event.to_room?.name || ""}`
                            : "Checked out"}
                        </td>
                        <td className="text-muted">{event.reason || "—"}</td>
                        <td className="text-muted">{new Date(event.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                    {!data.history.length && (
                      <tr>
                        <td colSpan={5} className="text-center text-muted py-4">
                          No allocation history recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-5">
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

