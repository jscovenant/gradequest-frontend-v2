import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import TopNav from "../../../components/LayoutComponents/TopNav";
import PageTitle from "../../../components/PageTitle";
import Footer from "../../../components/LayoutComponents/Footer";
import { transportApi } from "../../../api/transportApi";

type Student = { id: number; firstname: string; surname: string; reg_no?: string; email?: string };
type Stop = { id: number; name: string; pickup_time?: string; dropoff_time?: string; fee?: string };
type Vehicle = { id: number; name?: string; registration_number: string; capacity: number; occupied: number; driver_name?: string; driver_phone?: string; is_active: boolean };
type Route = { id: number; name: string; start_location?: string; end_location?: string; default_fee?: string; is_active: boolean; passengers: number; stops: Stop[]; vehicles: Vehicle[] };
type Assignment = { id: number; trip_type: string; assigned_at: string; student: Student; route: { name: string }; stop?: { name: string }; vehicle: Vehicle };
type Dashboard = { routes: Route[]; students: Student[]; assignments: Assignment[]; summary: { routes: number; stops: number; vehicles: number; capacity: number; passengers: number } };

const initial: Dashboard = { routes: [], students: [], assignments: [], summary: { routes: 0, stops: 0, vehicles: 0, capacity: 0, passengers: 0 } };
const nameOf = (student: Student) => `${student.firstname || ""} ${student.surname || ""}`.trim();
const messageOf = (error: any) => error?.response?.data?.message || Object.values(error?.response?.data?.errors || {}).flat()[0] || "Something went wrong.";

export default function TransportManagementPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState<Dashboard>(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const [routeForm, setRouteForm] = useState({ name: "", start_location: "", end_location: "", default_fee: "" });
  const [vehicleForm, setVehicleForm] = useState({ transport_route_id: "", registration_number: "", name: "", capacity: 1, driver_name: "", driver_phone: "" });
  const [stopForm, setStopForm] = useState({ transport_route_id: "", name: "", pickup_time: "", dropoff_time: "", fee: "" });
  const [assignmentForm, setAssignmentForm] = useState({ student_id: "", transport_vehicle_id: "", transport_stop_id: "", trip_type: "both", notes: "" });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setData((await transportApi.dashboard()).data);
    } catch (e) {
      setError(String(messageOf(e)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const vehicles = useMemo(() => data.routes.flatMap((route) => route.vehicles.map((vehicle) => ({ ...vehicle, route }))), [data.routes]);
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === Number(assignmentForm.transport_vehicle_id));
  const stops = selectedVehicle?.route.stops || [];
  const availableVehicles = vehicles.filter((vehicle) => vehicle.is_active && vehicle.route.is_active && vehicle.occupied < vehicle.capacity);
  const occupancy = data.summary.capacity ? Math.round((data.summary.passengers / data.summary.capacity) * 100) : 0;
  const assignments = data.assignments.filter((item) =>
    `${nameOf(item.student)} ${item.student.reg_no || ""} ${item.route.name} ${item.vehicle.registration_number}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const run = async (action: () => Promise<unknown>, success: string) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
      await load();
      return true;
    } catch (e) {
      setError(String(messageOf(e)));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const createRoute = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(() => transportApi.createRoute(routeForm), "Route created successfully.")) {
      setRouteForm({ name: "", start_location: "", end_location: "", default_fee: "" });
    }
  };

  const createVehicle = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(() => transportApi.createVehicle(vehicleForm), "Vehicle added successfully.")) {
      setVehicleForm({ transport_route_id: "", registration_number: "", name: "", capacity: 1, driver_name: "", driver_phone: "" });
    }
  };

  const createStop = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(() => transportApi.createStop(Number(stopForm.transport_route_id), stopForm), "Stop added successfully.")) {
      setStopForm({ transport_route_id: "", name: "", pickup_time: "", dropoff_time: "", fee: "" });
    }
  };

  const assign = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(() => transportApi.assign(assignmentForm), "Student assigned successfully.")) {
      setAssignmentForm({ student_id: "", transport_vehicle_id: "", transport_stop_id: "", trip_type: "both", notes: "" });
    }
  };

  return (
    <>
      <PageTitle title="Transport Management" />
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
          text-decoration: none;
        }
        .db-btn-gold:hover {
          background: #B45309;
          transform: translateY(-1px);
          color: #FFFFFF;
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
        .db-icon-btn--r { background: rgba(244,63,94,0.10); border-color: rgba(244,63,94,0.25); color: #be123c; }
        .db-icon-btn--r:hover { background: rgba(244,63,94,0.20); }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Transport Management" />

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
                    School Fleet & Mobility Operations
                  </div>
                  <h1 className="db-title">
                    Transport <em>Management</em>
                  </h1>
                  <p className="db-hero-sub">
                    Coordinate school bus routes, designated pickup/drop-off stops, vehicle capacity, and student transport assignments.
                  </p>
                </div>

                <div className="db-hero-stats d-none d-md-block">
                  <div className="db-hero-row">
                    <span>Fleet Occupancy</span>
                    <strong>{occupancy}%</strong>
                  </div>
                  <div className="db-hero-row">
                    <span>Available Seats</span>
                    <strong>{Math.max(0, data.summary.capacity - data.summary.passengers)}</strong>
                  </div>
                  <div className="db-hero-row">
                    <span>Active Passengers</span>
                    <strong>{data.summary.passengers}</strong>
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

            {/* ═══ KPI STATS ═══ */}
            <div className="db-stats">
              <div className="db-stat" style={{ "--sc": "#2563eb", "--si": "rgba(37,99,235,0.10)" } as any}>
                <div className="db-stat-head">
                  <span className="db-stat-label">Routes</span>
                  <div className="db-stat-icon">
                    <i className="bi bi-signpost-2" />
                  </div>
                </div>
                <div className="db-stat-val">{data.summary.routes}</div>
                <div className="db-stat-sub">Configured travel corridors</div>
              </div>

              <div className="db-stat" style={{ "--sc": "#0891b2", "--si": "rgba(8,145,178,0.10)" } as any}>
                <div className="db-stat-head">
                  <span className="db-stat-label">Stops</span>
                  <div className="db-stat-icon">
                    <i className="bi bi-geo-alt" />
                  </div>
                </div>
                <div className="db-stat-val">{data.summary.stops}</div>
                <div className="db-stat-sub">Pickup & drop-off locations</div>
              </div>

              <div className="db-stat" style={{ "--sc": "#b45309", "--si": "rgba(245,158,11,0.12)" } as any}>
                <div className="db-stat-head">
                  <span className="db-stat-label">Fleet Vehicles</span>
                  <div className="db-stat-icon">
                    <i className="bi bi-bus-front" />
                  </div>
                </div>
                <div className="db-stat-val">{data.summary.vehicles}</div>
                <div className="db-stat-sub">{data.summary.capacity} total seats</div>
              </div>

              <div className="db-stat" style={{ "--sc": "#15803d", "--si": "rgba(34,197,94,0.12)" } as any}>
                <div className="db-stat-head">
                  <span className="db-stat-label">Assigned Passengers</span>
                  <div className="db-stat-icon">
                    <i className="bi bi-people" />
                  </div>
                </div>
                <div className="db-stat-val">{data.summary.passengers}</div>
                <div className="db-stat-sub">{occupancy}% seat utilization</div>
              </div>
            </div>

            {/* ═══ 4 CREATION PANELS (2x2 Grid) ═══ */}
            <div className="row g-4 mb-4">
              {/* Add Route */}
              <div className="col-xl-6">
                <div className="db-panel h-100">
                  <div className="db-panel-head">
                    <div>
                      <h5 className="db-panel-title">Add Transport Route</h5>
                      <p className="db-panel-sub">Define a corridor and standard transportation fee</p>
                    </div>
                  </div>
                  <form className="p-4" onSubmit={createRoute}>
                    <div className="mb-3">
                      <label className="db-form-label">Route Name</label>
                      <input
                        required
                        className="form-control db-form-control"
                        value={routeForm.name}
                        onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
                        placeholder="e.g. Victoria Island - Lekki Corridor"
                      />
                    </div>
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="db-form-label">Starting Point</label>
                        <input
                          className="form-control db-form-control"
                          value={routeForm.start_location}
                          onChange={(e) => setRouteForm({ ...routeForm, start_location: e.target.value })}
                          placeholder="e.g. CMS / Marina"
                        />
                      </div>
                      <div className="col-6">
                        <label className="db-form-label">Destination</label>
                        <input
                          className="form-control db-form-control"
                          value={routeForm.end_location}
                          onChange={(e) => setRouteForm({ ...routeForm, end_location: e.target.value })}
                          placeholder="e.g. School Campus"
                        />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="db-form-label">Default Route Fee (₦)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control db-form-control"
                        value={routeForm.default_fee}
                        onChange={(e) => setRouteForm({ ...routeForm, default_fee: e.target.value })}
                        placeholder="e.g. 25000"
                      />
                    </div>
                    <button className="db-btn-gold w-100 justify-content-center" disabled={saving}>
                      Create Route
                    </button>
                  </form>
                </div>
              </div>

              {/* Add Vehicle */}
              <div className="col-xl-6">
                <div className="db-panel h-100">
                  <div className="db-panel-head">
                    <div>
                      <h5 className="db-panel-title">Add Vehicle to Fleet</h5>
                      <p className="db-panel-sub">Assign a bus or van and driver to a route</p>
                    </div>
                  </div>
                  <form className="p-4" onSubmit={createVehicle}>
                    <div className="mb-3">
                      <label className="db-form-label">Assigned Route</label>
                      <select
                        required
                        className="form-select db-form-select"
                        value={vehicleForm.transport_route_id}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, transport_route_id: e.target.value })}
                      >
                        <option value="">Select route</option>
                        {data.routes.map((route) => (
                          <option key={route.id} value={route.id}>
                            {route.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="row g-2 mb-3">
                      <div className="col-7">
                        <label className="db-form-label">Registration Number</label>
                        <input
                          required
                          className="form-control db-form-control"
                          value={vehicleForm.registration_number}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, registration_number: e.target.value })}
                          placeholder="e.g. KSF-123-XY"
                        />
                      </div>
                      <div className="col-5">
                        <label className="db-form-label">Passenger Seats</label>
                        <input
                          required
                          type="number"
                          min="1"
                          max="500"
                          className="form-control db-form-control"
                          value={vehicleForm.capacity}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="row g-2 mb-4">
                      <div className="col-6">
                        <label className="db-form-label">Driver Name</label>
                        <input
                          className="form-control db-form-control"
                          value={vehicleForm.driver_name}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, driver_name: e.target.value })}
                          placeholder="e.g. Driver Musa"
                        />
                      </div>
                      <div className="col-6">
                        <label className="db-form-label">Driver Phone</label>
                        <input
                          className="form-control db-form-control"
                          value={vehicleForm.driver_phone}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, driver_phone: e.target.value })}
                          placeholder="e.g. 08033344455"
                        />
                      </div>
                    </div>
                    <button className="db-btn-gold w-100 justify-content-center" disabled={saving || !data.routes.length}>
                      Add Vehicle
                    </button>
                  </form>
                </div>
              </div>

              {/* Add Stop */}
              <div className="col-xl-6">
                <div className="db-panel h-100">
                  <div className="db-panel-head">
                    <div>
                      <h5 className="db-panel-title">Add Route Stop</h5>
                      <p className="db-panel-sub">Configure designated pickup and drop-off points</p>
                    </div>
                  </div>
                  <form className="p-4" onSubmit={createStop}>
                    <div className="mb-3">
                      <label className="db-form-label">Route</label>
                      <select
                        required
                        className="form-select db-form-select"
                        value={stopForm.transport_route_id}
                        onChange={(e) => setStopForm({ ...stopForm, transport_route_id: e.target.value })}
                      >
                        <option value="">Select route</option>
                        {data.routes.map((route) => (
                          <option key={route.id} value={route.id}>
                            {route.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="db-form-label">Stop Name</label>
                      <input
                        required
                        className="form-control db-form-control"
                        value={stopForm.name}
                        onChange={(e) => setStopForm({ ...stopForm, name: e.target.value })}
                        placeholder="e.g. Chevron Tollgate Junction"
                      />
                    </div>
                    <div className="row g-2 mb-4">
                      <div className="col-6">
                        <label className="db-form-label">Pickup Time</label>
                        <input
                          type="time"
                          className="form-control db-form-control"
                          value={stopForm.pickup_time}
                          onChange={(e) => setStopForm({ ...stopForm, pickup_time: e.target.value })}
                        />
                      </div>
                      <div className="col-6">
                        <label className="db-form-label">Stop Specific Fee (₦)</label>
                        <input
                          type="number"
                          min="0"
                          className="form-control db-form-control"
                          value={stopForm.fee}
                          onChange={(e) => setStopForm({ ...stopForm, fee: e.target.value })}
                          placeholder="Optional override"
                        />
                      </div>
                    </div>
                    <button className="db-btn-gold w-100 justify-content-center" disabled={saving || !data.routes.length}>
                      Add Stop
                    </button>
                  </form>
                </div>
              </div>

              {/* Assign Student */}
              <div className="col-xl-6">
                <div className="db-panel h-100">
                  <div className="db-panel-head">
                    <div>
                      <h5 className="db-panel-title">Assign Student to Transport</h5>
                      <p className="db-panel-sub">Enroll student on a vehicle route and stop</p>
                    </div>
                  </div>
                  <form className="p-4" onSubmit={assign}>
                    <div className="mb-3">
                      <label className="db-form-label">Student</label>
                      <select
                        required
                        className="form-select db-form-select"
                        value={assignmentForm.student_id}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, student_id: e.target.value })}
                      >
                        <option value="">Select student</option>
                        {data.students.map((student) => (
                          <option key={student.id} value={student.id}>
                            {nameOf(student)} {student.reg_no ? `(${student.reg_no})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="db-form-label">Vehicle & Route</label>
                      <select
                        required
                        className="form-select db-form-select"
                        value={assignmentForm.transport_vehicle_id}
                        onChange={(e) =>
                          setAssignmentForm({
                            ...assignmentForm,
                            transport_vehicle_id: e.target.value,
                            transport_stop_id: "",
                          })
                        }
                      >
                        <option value="">Select vehicle</option>
                        {availableVehicles.map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>
                            {vehicle.route.name} · {vehicle.registration_number} ({vehicle.capacity - vehicle.occupied} seats free)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="row g-2 mb-4">
                      <div className="col-7">
                        <label className="db-form-label">Designated Stop</label>
                        <select
                          className="form-select db-form-select"
                          value={assignmentForm.transport_stop_id}
                          onChange={(e) => setAssignmentForm({ ...assignmentForm, transport_stop_id: e.target.value })}
                        >
                          <option value="">No specific stop</option>
                          {stops.map((stop) => (
                            <option key={stop.id} value={stop.id}>
                              {stop.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-5">
                        <label className="db-form-label">Trip Direction</label>
                        <select
                          className="form-select db-form-select"
                          value={assignmentForm.trip_type}
                          onChange={(e) => setAssignmentForm({ ...assignmentForm, trip_type: e.target.value })}
                        >
                          <option value="both">Both Ways</option>
                          <option value="pickup">Pickup Only</option>
                          <option value="dropoff">Drop-off Only</option>
                        </select>
                      </div>
                    </div>
                    <button
                      className="db-btn-gold w-100 justify-content-center"
                      disabled={saving || !availableVehicles.length}
                    >
                      Assign Student
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* ═══ ROUTES & FLEET CARDS ═══ */}
            <div className="db-panel mb-4">
              <div className="db-panel-head">
                <div>
                  <h5 className="db-panel-title">Active Routes and Fleet</h5>
                  <p className="db-panel-sub">Real-time status of corridors, stops, and vehicle capacity</p>
                </div>
              </div>
              <div className="p-4">
                <div className="row g-3">
                  {data.routes.map((route) => (
                    <div className="col-xl-6" key={route.id}>
                      <div className="p-3 border rounded-3 h-100" style={{ background: "#faf8f5" }}>
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h5 className="mb-1" style={{ fontFamily: "Playfair Display, serif", color: "#1a1a2e" }}>
                              {route.name}
                            </h5>
                            <div className="small text-muted">
                              {route.start_location || "Start"} → {route.end_location || "School Campus"}
                            </div>
                          </div>
                          <span className="db-badge db-badge--green">{route.passengers} passengers</span>
                        </div>
                        <div className="small text-muted mt-2 mb-3 fw-bold">
                          <i className="bi bi-geo-alt me-1 text-warning" />
                          {route.stops.length} designated stop(s)
                        </div>
                        {route.vehicles.map((vehicle) => {
                          const pct = Math.min(100, vehicle.capacity ? (vehicle.occupied / vehicle.capacity) * 100 : 0);
                          return (
                            <div className="bg-white rounded-3 p-3 border mb-2" key={vehicle.id} style={{ borderColor: "#e5ddd3" }}>
                              <div className="d-flex justify-content-between small fw-bold">
                                <span>
                                  <i className="bi bi-bus-front me-2 text-warning" />
                                  {vehicle.name || vehicle.registration_number}
                                </span>
                                <span style={{ color: pct >= 100 ? "#dc2626" : "#15803d" }}>
                                  {vehicle.occupied}/{vehicle.capacity} seats
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
                              <div className="small text-muted mt-1" style={{ fontSize: 11 }}>
                                Driver: {vehicle.driver_name || "Unassigned"} {vehicle.driver_phone ? `(${vehicle.driver_phone})` : ""}
                              </div>
                            </div>
                          );
                        })}
                        {!route.vehicles.length && <div className="text-muted small p-2">No vehicles assigned to this route yet.</div>}
                      </div>
                    </div>
                  ))}
                  {!loading && !data.routes.length && (
                    <div className="text-center text-muted py-5">No routes configured yet. Use the form above to add your first route.</div>
                  )}
                </div>
              </div>
            </div>

            {/* ═══ ACTIVE PASSENGERS TABLE ═══ */}
            <div className="db-panel mb-4">
              <div className="db-panel-head">
                <div>
                  <h5 className="db-panel-title">Student Passengers</h5>
                  <p className="db-panel-sub">Current active student transportation enrollments</p>
                </div>
                <div className="position-relative" style={{ maxWidth: 280 }}>
                  <input
                    className="form-control db-form-control"
                    placeholder="Search student, route, bus..."
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
                      <th className="text-muted small fw-bold">Route</th>
                      <th className="text-muted small fw-bold">Vehicle</th>
                      <th className="text-muted small fw-bold">Stop</th>
                      <th className="text-muted small fw-bold">Trip Type</th>
                      <th className="text-end pe-4 text-muted small fw-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((item) => (
                      <tr key={item.id} style={{ borderBottom: "1px solid #ede8e0" }}>
                        <td className="ps-4">
                          <strong style={{ color: "#1a1a2e" }}>{nameOf(item.student)}</strong>
                          <div className="small text-muted">{item.student.reg_no || item.student.email}</div>
                        </td>
                        <td>
                          <span className="db-badge db-badge--blue">{item.route.name}</span>
                        </td>
                        <td>
                          <span className="db-badge db-badge--gray">{item.vehicle.registration_number}</span>
                        </td>
                        <td>{item.stop?.name || "—"}</td>
                        <td className="text-capitalize">
                          <span className="db-badge db-badge--amber">{item.trip_type}</span>
                        </td>
                        <td className="text-end pe-4">
                          <button
                            className="db-icon-btn db-icon-btn--r"
                            disabled={saving}
                            title="End transport assignment"
                            onClick={() =>
                              window.confirm("End this transport assignment?") &&
                              run(() => transportApi.endAssignment(item.id), "Transport assignment ended.")
                            }
                          >
                            <i className="bi bi-x-circle" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!loading && !assignments.length && (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-5">
                          No active transport assignments found.
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

