import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../../contexts/ToastContext";
import {
  Plus,
  Wallet,
  AlertTriangle,
  Percent,
  Calendar,
} from "lucide-react";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

import { authApi } from "../../../utils/axios";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import { Pencil } from "lucide-react";
import PageTitle from "../../../components/PageTitle";




ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

/* ================= TYPES ================= */

interface Category {
id: number;
  name: string;
  type: "income" | "expense";
  school_id: number;
  created_at?: string;
  updated_at?: string;
}

interface FinancialRecord {
  id: number;
  date: string;
  title: string;
  type: "income" | "expense";
  amount: number;
  category: Category;
}

interface DashboardResponse {
  kpi: {
    total_income: number;
    total_expense: number;
    net_profit: number;
    profit_margin: number;
    salary_burden: number;
  };
  monthly_trend: {
    month: string;
    income: number;
    expense: number;
  }[];
  records: FinancialRecord[];
}

/* ================= COMPONENT ================= */

export default function FinancialRecords() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
const [submitting, setSubmitting] = useState(false);
const [categories, setCategories] = useState<Category[]>([]);

const [showCategoryModal, setShowCategoryModal] = useState(false);
const [categorySubmitting, setCategorySubmitting] = useState(false);
const { showSuccess, showError } = useToast();
const [showEditModal, setShowEditModal] = useState(false);
const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
const [showReportModal, setShowReportModal] = useState(false);
const [reportLoading, setReportLoading] = useState(false);
const [incomeReport, setIncomeReport] = useState<any>(null);

const [reportFilters, setReportFilters] = useState({
  start_date: "",
  end_date: "",
  category_id: "",
});

const API_BASE_URL = import.meta.env.VITE_API_URL;


const generateIncomeReport = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    setReportLoading(true);

    const res = await authApi.get("finance/reports/income", {
      params: reportFilters,
    });

    setIncomeReport(res.data);
    showSuccess("Income report generated successfully 📊");
  } catch (error: any) {
    showError(
      error.response?.data?.message || "Failed to generate income report"
    );
  } finally {
    setReportLoading(false);
  }
};


const [categoryForm, setCategoryForm] = useState({
  name: "",
  type: "income",
});

const [filters, setFilters] = useState({
  start_date: "",
  end_date: "",
  type: "",
  category_id: "",
});


const handleCategorySubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    setCategorySubmitting(true);

    await authApi.post("finance/categories", categoryForm);

    showSuccess("Category created successfully 🎉");

    setShowCategoryModal(false);
    setCategoryForm({ name: "", type: "income" });

    fetchCategories();
  } catch (error: any) {
    showError(
      error.response?.data?.message || "Failed to create category"
    );
  } finally {
    setCategorySubmitting(false);
  }
};

const handleEditClick = (record: FinancialRecord) => {
  setEditingRecordId(record.id);

  setForm({
    title: record.title,
    date: record.date,
    amount: String(record.amount),
    type: record.type,
    category_id: String(record.category?.id || ""),
    status: "paid", 
  });

  setShowEditModal(true);
};

const handleUpdate = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!editingRecordId) return;

  try {
    setSubmitting(true);

    await authApi.put(`finance/records/${editingRecordId}`, {
      ...form,
      amount: Number(form.amount),
    });

    showSuccess("Record updated successfully ✨");

    setShowEditModal(false);
    setEditingRecordId(null);

    fetchDashboard();
  } catch (error: any) {
    showError(
      error.response?.data?.message || "Failed to update record"
    );
  } finally {
    setSubmitting(false);
  }
};


const [form, setForm] = useState({
  title: "",
  date: "",
  amount: "",
  type: "income",
  category_id: "",
  status: "paid",
});

useEffect(() => {
  fetchDashboard();
  fetchCategories();
}, []);


const fetchCategories = async () => {
  try {
    const res = await authApi.get("finance/categories");
    setCategories(res.data);
  } catch (error) {
    showError("Failed to fetch categories");
  }
};


const handleChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
) => {
  setForm({ ...form, [e.target.name]: e.target.value });
};


const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    setSubmitting(true);

    await authApi.post("finance/records", {
      ...form,
      amount: Number(form.amount),
    });

    showSuccess("Financial record saved successfully ✅");

    setShowModal(false);
    setForm({
      title: "",
      date: "",
      amount: "",
      type: "income",
      category_id: "",
      status: "paid",
    });

    fetchDashboard();
  } catch (error: any) {
    showError(
      error.response?.data?.message || "Failed to save record"
    );
  } finally {
    setSubmitting(false);
  }
};



  /* ================= FETCH DATA ================= */

  useEffect(() => {
    fetchDashboard();
  }, []);

 
 const fetchDashboard = async () => {
  try {
    setLoading(true);

    const res = await authApi.get("finance/dashboard", {
      params: filters,
    });

    setData(res.data);
  } catch (error) {
    showError("Failed to load financial dashboard");
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchDashboard();
}, [filters]);



  /* ================= MONTHLY TREND FORMAT ================= */

  const monthlyData = useMemo(() => {
    if (!data) return null;

    const labels = data.monthly_trend.map((m) => m.month);

    return {
      labels,
      datasets: [
        {
          label: "Income",
          data: data.monthly_trend.map((m) => m.income),
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.1)",
          tension: 0.4,
          fill: true,
        },
        {
          label: "Expense",
          data: data.monthly_trend.map((m) => m.expense),
          borderColor: "#ef4444",
          backgroundColor: "rgba(239,68,68,0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }, [data]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(n);

  const isEmpty = data?.records.length === 0;

  /* ================= RENDER ================= */

  return (
    <>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Finacial Record" />

      <div className="container-fluid py-5">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto px-4">

            {/* HEADER */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h3 className="fw-bold">Financial Intelligence</h3>
                <p className="text-muted mb-0">
                  Real-time financial health overview
                </p>
              </div>

              <button
  className="btn btn-outline-primary d-flex align-items-center gap-2"
  onClick={() => setShowReportModal(true)}
>
  <Calendar size={18} />
  Generate Income Report
</button>


              <button
              className="btn btn-outline-secondary"
              onClick={() => setShowCategoryModal(true)}
            >
              Manage Categories
            </button>


              <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary d-flex align-items-center gap-2"
            >
              <Plus size={18} />
              Add Record
            </button>

            </div>

            {loading ? (
              <div className="text-center py-5">Loading...</div>
           ) : isEmpty ? (
  <div className="card border-0 shadow-sm p-5 mb-4">
    <div className="row align-items-center">

      {/* LEFT SIDE – VISUAL */}
      <div className="col-md-5 text-center mb-4 mb-md-0">
        <div
          className="d-flex align-items-center justify-content-center mx-auto"
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #eef2ff, #e0f2fe)",
          }}
        >
          <Wallet size={48} color="#6366f1" />
        </div>

        <h4 className="fw-bold mt-4">No Financial Records Yet</h4>
        <p className="text-muted px-4">
          Your financial dashboard is ready — but it needs data to
          generate insights.
        </p>

        <button className="btn btn-primary btn-lg mt-3 d-flex align-items-center gap-2 mx-auto"
         onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Add First Financial Record
        </button>
      </div>

      {/* RIGHT SIDE – VALUE PREVIEW */}
      <div className="col-md-7">

        <div className="row g-3">

          <div className="col-sm-6">
            <div className="border rounded-3 p-3 h-100">
              <div className="d-flex align-items-center gap-2 mb-2">
                <Wallet size={18} className="text-success" />
                <strong>Track Profit</strong>
              </div>
              <small className="text-muted">
                Instantly see if your school is making profit or losing money.
              </small>
            </div>
          </div>

          <div className="col-sm-6">
            <div className="border rounded-3 p-3 h-100">
              <div className="d-flex align-items-center gap-2 mb-2">
                <Percent size={18} className="text-warning" />
                <strong>Monitor Salary Burden</strong>
              </div>
              <small className="text-muted">
                Know if salaries are consuming too much of your income.
              </small>
            </div>
          </div>

          <div className="col-sm-6">
            <div className="border rounded-3 p-3 h-100">
              <div className="d-flex align-items-center gap-2 mb-2">
                <Calendar size={18} className="text-primary" />
                <strong>Monthly Trends</strong>
              </div>
              <small className="text-muted">
                Visualize income vs expenses month by month.
              </small>
            </div>
          </div>

          <div className="col-sm-6">
            <div className="border rounded-3 p-3 h-100">
              <div className="d-flex align-items-center gap-2 mb-2">
                <AlertTriangle size={18} className="text-danger" />
                <strong>Spot Financial Risks</strong>
              </div>
              <small className="text-muted">
                Detect dangerous spending patterns before they become problems.
              </small>
            </div>
          </div>

        </div>

      </div>
    </div>
  </div>

          )  : data && monthlyData ? (
              <>
                {/* KPI CARDS */}
                <div className="row g-4 mb-4">

                  <KpiCard
                    icon={<Wallet />}
                    title="Net Profit"
                    value={formatCurrency(data.kpi.net_profit)}
                    color={data.kpi.net_profit >= 0 ? "success" : "danger"}
                  />

                  <KpiCard
                    icon={<Percent />}
                    title="Profit Margin"
                    value={`${data.kpi.profit_margin}%`}
                    color={
                      data.kpi.profit_margin > 20
                        ? "success"
                        : data.kpi.profit_margin > 10
                        ? "warning"
                        : "danger"
                    }
                  />

                  <KpiCard
                    icon={<AlertTriangle />}
                    title="Salary Burden"
                    value={`${data.kpi.salary_burden}%`}
                    color={
                      data.kpi.salary_burden < 50
                        ? "success"
                        : data.kpi.salary_burden < 70
                        ? "warning"
                        : "danger"
                    }
                  />

                </div>

                {/* MONTHLY TREND */}
                <div className="card shadow-sm border-0 mb-4">
                  <div className="card-body">
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <Calendar size={18} />
                      <h6 className="mb-0">
                        Monthly Income vs Expense Trend
                      </h6>
                    </div>

                    <Line
                      data={monthlyData}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { position: "top" },
                          tooltip: {
                            callbacks: {
                              label: (ctx) =>
                                `${ctx.dataset.label}: ${formatCurrency(
                                  Number(ctx.parsed.y ?? 0)
                                )}`,
                            },
                          },
                        },
                        scales: {
                          y: { beginAtZero: true },
                        },
                      }}
                    />
                  </div>
                </div>

                <div className="card shadow-sm border-0 mb-4">
  <div className="card-body">
    <div className="row g-3">

      {/* Start Date */}
      <div className="col-md-3">
        <label className="form-label">Start Date</label>
        <input
          type="date"
          className="form-control"
          value={filters.start_date}
          onChange={(e) =>
            setFilters({ ...filters, start_date: e.target.value })
          }
        />
      </div>

      {/* End Date */}
      <div className="col-md-3">
        <label className="form-label">End Date</label>
        <input
          type="date"
          className="form-control"
          value={filters.end_date}
          onChange={(e) =>
            setFilters({ ...filters, end_date: e.target.value })
          }
        />
      </div>

      {/* Type */}
      <div className="col-md-2">
        <label className="form-label">Type</label>
        <select
          className="form-select"
          value={filters.type}
          onChange={(e) =>
            setFilters({ ...filters, type: e.target.value })
          }
        >
          <option value="">All</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      {/* Category */}
      <div className="col-md-2">
        <label className="form-label">Category</label>
        <select
          className="form-select"
          value={filters.category_id}
          onChange={(e) =>
            setFilters({ ...filters, category_id: e.target.value })
          }
        >
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Reset */}
      <div className="col-md-2 d-flex align-items-end">
        <button
          className="btn btn-outline-secondary w-100"
          onClick={() =>
            setFilters({
              start_date: "",
              end_date: "",
              type: "",
              category_id: "",
            })
          }
        >
          Reset
        </button>
      </div>

    </div>
  </div>
</div>


                {/* TRANSACTION TABLE */}
                <div className="card shadow-sm border-0">
                  <div className="card-body p-0">
                    <table className="table mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Date</th>
                          <th>Title</th>
                          <th>Category</th>
                          <th>Type</th>
                          <th>Amount</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.records.map((r) => (
                          <tr key={r.id}>
                            <td>{r.date}</td>
                            <td>{r.title}</td>
                            <td>{r.category?.name}</td>
                            <td>
                              <span
                                className={`badge bg-${
                                  r.type === "income"
                                    ? "success"
                                    : "danger"
                                }`}
                              >
                                {r.type}
                              </span>
                            </td>
                            <td>{formatCurrency(r.amount)}</td>
                            <td>
                          <button
                            className="btn btn-sm btn-light border"
                            onClick={() => handleEditClick(r)}
                          >
                            <Pencil size={16} />
                          </button>
                        </td>

                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}

            {showModal && (
  <div
    className="position-fixed top-0 start-0 w-100 h-100 d-flex  align-items-center justify-content-center"
    style={{
      backgroundColor: "rgba(0,0,0,0.5)",
      backdropFilter: "blur(4px)",
      zIndex: 1050,
    }}
  >
    <div
      className="card shadow-lg border-0 p-4"
      style={{
        width: "100%",
        maxWidth: 600,
        borderRadius: 16,
        animation: "fadeIn 0.2s ease-in-out",
      }}
    >
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold mb-0">Add Financial Record</h5>
        <button
          className="btn-close"
          onClick={() => setShowModal(false)}
        ></button>
      </div>

      
      <form onSubmit={handleSubmit}>

        {/* TITLE */}
        <div className="mb-3">
          <label className="form-label">Title</label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            className="form-control"
            placeholder="e.g. SS2 Tuition Payment"
            required
          />
        </div>

        {/* DATE */}
        <div className="mb-3">
          <label className="form-label">Date</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="form-control"
            required
          />
        </div>

        {/* AMOUNT */}
        <div className="mb-3">
          <label className="form-label">Amount (₦)</label>
          <input
            type="number"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            className="form-control"
            placeholder="Enter amount"
            required
          />
        </div>

        {/* TYPE */}
        <div className="mb-3">
          <label className="form-label">Type</label>
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="form-select"
            required
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>

        {/* CATEGORY */}
        <div className="mb-3">
          <label className="form-label">Category</label>
          <select
            name="category_id"
            value={form.category_id}
            onChange={handleChange}
            className="form-select"
            required
          >
            <option value="">Select Category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* STATUS */}
        <div className="mb-4">
          <label className="form-label">Payment Status</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="form-select"
            required
          >
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* ACTIONS */}
                    <div className="d-flex pb-5 justify-content-end gap-2">
                      <button
                        type="button"
                        className="btn btn-light"
                        onClick={() => setShowModal(false)}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={submitting}
                      >
                        {submitting ? "Saving..." : "Save Record"}
                      </button>
                    </div>

                  </form>
                </div>
              </div>
            )}


            {showCategoryModal && (
  <div
    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
    style={{
      background: "rgba(0,0,0,0.4)",
      backdropFilter: "blur(6px)",
      zIndex: 1100,
    }}
  >
    <div
      className="card shadow-lg border-0 p-4"
      style={{
        width: "100%",
        maxWidth: 500,
        borderRadius: 20,
      }}
    >
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="fw-bold mb-0">Create Financial Category</h5>
        <button
          className="btn-close"
          onClick={() => setShowCategoryModal(false)}
        />
      </div>

      <form onSubmit={handleCategorySubmit}>

        {/* Category Name */}
        <div className="mb-3">
          <label className="form-label">Category Name</label>
          <input
            type="text"
            className="form-control form-control-lg"
            placeholder="e.g. Tuition, Salaries, Utilities"
            value={categoryForm.name}
            onChange={(e) =>
              setCategoryForm({ ...categoryForm, name: e.target.value })
            }
            required
          />
        </div>

        {/* Type Toggle */}
        <div className="mb-4">
          <label className="form-label">Category Type</label>

          <div className="d-flex gap-3">

            <button
              type="button"
              className={`flex-fill btn ${
                categoryForm.type === "income"
                  ? "btn-success"
                  : "btn-outline-success"
              }`}
              onClick={() =>
                setCategoryForm({ ...categoryForm, type: "income" })
              }
            >
              Income
            </button>

            <button
              type="button"
              className={`flex-fill btn ${
                categoryForm.type === "expense"
                  ? "btn-danger"
                  : "btn-outline-danger"
              }`}
              onClick={() =>
                setCategoryForm({ ...categoryForm, type: "expense" })
              }
            >
              Expense
            </button>

          </div>
        </div>

        {/* Actions */}
        <div className="d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-light"
            onClick={() => setShowCategoryModal(false)}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={categorySubmitting}
          >
            {categorySubmitting ? "Saving..." : "Create Category"}
          </button>
        </div>

      </form>
    </div>
  </div>
)}

{showEditModal && (
  <div
    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
    style={{
      backgroundColor: "rgba(0,0,0,0.5)",
      backdropFilter: "blur(4px)",
      zIndex: 1050,
    }}
  >
    <div
      className="card shadow-lg border-0 p-4"
      style={{
        width: "100%",
        maxWidth: 600,
        borderRadius: 18,
      }}
    >
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold mb-0">Edit Financial Record</h5>
        <button
          className="btn-close"
          onClick={() => setShowEditModal(false)}
        ></button>
      </div>

      <form onSubmit={handleUpdate}>

        <div className="mb-3">
          <label className="form-label">Title</label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            className="form-control"
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Date</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="form-control"
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Amount (₦)</label>
          <input
            type="number"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            className="form-control"
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Type</label>
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="form-select"
            required
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="form-label">Category</label>
          <select
            name="category_id"
            value={form.category_id}
            onChange={handleChange}
            className="form-select"
            required
          >
            <option value="">Select Category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-light"
            onClick={() => setShowEditModal(false)}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? "Updating..." : "Update Record"}
          </button>
        </div>

      </form>
    </div>
  </div>
)}


{showReportModal && (
  <div
    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
    style={{
      background: "rgba(0,0,0,0.4)",
      backdropFilter: "blur(6px)",
      zIndex: 1100,
    }}
  >
    <div
      className="card shadow-lg border-0 p-4"
      style={{
        width: "100%",
        maxWidth: 700,
        borderRadius: 20,
      }}
    >
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="fw-bold mb-0">Income Report</h5>
          <small className="text-muted">
            Generate income summary by date and category
          </small>
        </div>

        <button
          className="btn-close"
          onClick={() => {
            setShowReportModal(false);
            setIncomeReport(null);
          }}
        />
      </div>

      {/* FILTERS */}
      <form onSubmit={generateIncomeReport}>

        <div className="row g-3 mb-3">

          <div className="col-md-4">
            <label className="form-label">Start Date</label>
            <input
              type="date"
              className="form-control"
              value={reportFilters.start_date}
              onChange={(e) =>
                setReportFilters({
                  ...reportFilters,
                  start_date: e.target.value,
                })
              }
            />
          </div>

          <div className="col-md-4">
            <label className="form-label">End Date</label>
            <input
              type="date"
              className="form-control"
              value={reportFilters.end_date}
              onChange={(e) =>
                setReportFilters({
                  ...reportFilters,
                  end_date: e.target.value,
                })
              }
            />
          </div>

          <div className="col-md-4">
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={reportFilters.category_id}
              onChange={(e) =>
                setReportFilters({
                  ...reportFilters,
                  category_id: e.target.value,
                })
              }
            >
              <option value="">All Categories</option>
              {categories
                .filter((c) => c.type === "income")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

        </div>

        <div className="d-flex justify-content-end gap-2 mb-4">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={reportLoading}
          >
            {reportLoading ? "Generating..." : "Generate Report"}
          </button>
        </div>

      </form>

      {/* REPORT RESULT */}
      {incomeReport && (
        <div className="border rounded-4 p-4 bg-light">

          <div className="row text-center mb-4">

            <div className="col-md-4">
              <small className="text-muted">Total Income</small>
              <h4 className="fw-bold text-success">
                {formatCurrency(incomeReport.total_income)}
              </h4>
            </div>

            <div className="col-md-4">
              <small className="text-muted">Transactions</small>
              <h4 className="fw-bold">
                {incomeReport.transaction_count}
              </h4>
            </div>

            <div className="col-md-4">
              <small className="text-muted">Average Transaction</small>
              <h4 className="fw-bold">
                {formatCurrency(incomeReport.average_income)}
              </h4>
            </div>

          </div>

          <div className="text-end">
           <a
  href={`${API_BASE_URL}/finance/reports/income/export?start_date=${reportFilters.start_date}&end_date=${reportFilters.end_date}&category_id=${reportFilters.category_id}`}
  target="_blank"
  rel="noopener noreferrer"
  className="btn btn-outline-secondary"
>
  Download PDF
</a>

          </div>

        </div>
      )}
    </div>
  </div>
)}


            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}

/* ================= KPI CARD ================= */

function KpiCard({
  icon,
  title,
  value,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  color: "success" | "warning" | "danger";
}) {
  return (
    <div className="col-md-4">
      <div className={`card shadow-sm border-0 text-${color}`}>
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <small className="text-muted">{title}</small>
              <h5 className="fw-bold mb-0">{value}</h5>
            </div>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}
