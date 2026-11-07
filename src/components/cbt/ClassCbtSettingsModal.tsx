import React, { useEffect, useState, useMemo } from "react";
import { authApi } from "../../utils/axios";
import { useToast } from "../../contexts/ToastContext";

export interface ClassCbtItem {
  id: number;
  name: string;
  class_group?: string | null;
  section_id?: number | null;
  section_name?: string | null;
  cbt_enabled: boolean;
  student_count: number;
  platform_fee_per_student: number;
  total_platform_fee: number;
  package_label: string;
}

export interface ClassCbtSummary {
  total_classes: number;
  cbt_classes_count: number;
  basic_classes_count: number;
  total_students: number;
  cbt_students_count: number;
  basic_students_count: number;
  projected_total_fee: number;
  has_mixed_structure: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

function fmtNaira(val: number): string {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(val);
  } catch {
    return `₦${Number(val || 0).toLocaleString()}`;
  }
}

export default function ClassCbtSettingsModal({ isOpen, onClose, onUpdated }: Props) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<ClassCbtItem[]>([]);
  const [cbtRate, setCbtRate] = useState<number>(1000);
  const [basicRate, setBasicRate] = useState<number>(500);
  const [isFullCbt, setIsFullCbt] = useState<boolean>(true);
  const [activeTier, setActiveTier] = useState<string>("standard_cbt");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "cbt" | "basic">("all");

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await authApi.get("/levels/cbt-settings");
      const data = res.data;
      setClasses(data.classes || []);
      setCbtRate(Number(data.cbt_rate_per_student || 1000));
      setBasicRate(Number(data.basic_rate_per_student || 500));
      setIsFullCbt(Boolean(data.is_full_cbt_package));
      setActiveTier(String(data.active_edition_tier || "standard_cbt"));
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to load class CBT settings", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const handleToggle = (id: number) => {
    setClasses((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const nextEnabled = !c.cbt_enabled;
        const rate = nextEnabled ? cbtRate : basicRate;
        return {
          ...c,
          cbt_enabled: nextEnabled,
          platform_fee_per_student: rate,
          total_platform_fee: c.student_count * rate,
          package_label: nextEnabled ? "Full CBT Package" : "Basic Plan (Results Only)",
        };
      })
    );
  };

  const handleEnableAll = () => {
    setClasses((prev) =>
      prev.map((c) => ({
        ...c,
        cbt_enabled: true,
        platform_fee_per_student: cbtRate,
        total_platform_fee: c.student_count * cbtRate,
        package_label: "Full CBT Package",
      }))
    );
  };

  const handleDisablePrimaryNursery = () => {
    setClasses((prev) =>
      prev.map((c) => {
        const lower = c.name.toLowerCase();
        const isNurseryOrPrimary =
          lower.includes("nursery") ||
          lower.includes("creche") ||
          lower.includes("kindergarten") ||
          lower.includes("primary") ||
          lower.includes("basic 1") ||
          lower.includes("basic 2") ||
          lower.includes("basic 3") ||
          lower.includes("basic 4") ||
          lower.includes("basic 5") ||
          lower.includes("basic 6") ||
          lower.includes("kg");
        const nextEnabled = !isNurseryOrPrimary;
        const rate = nextEnabled ? cbtRate : basicRate;
        return {
          ...c,
          cbt_enabled: nextEnabled,
          platform_fee_per_student: rate,
          total_platform_fee: c.student_count * rate,
          package_label: nextEnabled ? "Full CBT Package" : "Basic Plan (Results Only)",
        };
      })
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        classes: classes.map((c) => ({
          id: c.id,
          cbt_enabled: c.cbt_enabled,
        })),
      };
      const res = await authApi.put("/levels/cbt-settings", payload);
      showToast(res.data?.message || "Class CBT settings and platform fees updated successfully!", "success");
      if (onUpdated) onUpdated();
      onClose();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to update CBT class settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const liveSummary = useMemo<ClassCbtSummary>(() => {
    const total_classes = classes.length;
    const cbt_classes_count = classes.filter((c) => c.cbt_enabled).length;
    const basic_classes_count = total_classes - cbt_classes_count;
    const cbt_students_count = classes.filter((c) => c.cbt_enabled).reduce((sum, c) => sum + c.student_count, 0);
    const basic_students_count = classes.filter((c) => !c.cbt_enabled).reduce((sum, c) => sum + c.student_count, 0);
    const projected_total_fee = classes.reduce((sum, c) => sum + c.total_platform_fee, 0);

    return {
      total_classes,
      cbt_classes_count,
      basic_classes_count,
      total_students: cbt_students_count + basic_students_count,
      cbt_students_count,
      basic_students_count,
      projected_total_fee,
      has_mixed_structure: cbt_classes_count > 0 && basic_classes_count > 0,
    };
  }, [classes]);

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.section_name && c.section_name.toLowerCase().includes(search.toLowerCase()));
      if (!matchSearch) return false;
      if (filterType === "cbt") return c.cbt_enabled;
      if (filterType === "basic") return !c.cbt_enabled;
      return true;
    });
  }, [classes, search, filterType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#033987] to-[#0A4FB3] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl font-bold text-[#FEC602]">
              ⚡
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Class-Level CBT & Platform Fee Control</h2>
              <p className="text-xs text-blue-100 font-medium">
                Enable or disable CBT per class. Non-CBT classes automatically fall back to the Basic Plan rate (₦500/student).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition-all"
          >
            ✕
          </button>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-500">
            <div className="w-8 h-8 border-4 border-[#033987] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold">Loading class package allocations...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* CBT Card */}
              <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-[#033987]" />
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#033987]">Full CBT Classes</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-[#033987] border border-blue-200">
                    {fmtNaira(cbtRate)} / student
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900">{liveSummary.cbt_classes_count} Classes</div>
                <div className="text-xs text-slate-500 mt-1 font-medium">
                  {liveSummary.cbt_students_count} Active Students participating in CBT
                </div>
              </div>

              {/* Basic Result Card */}
              <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-amber-500" />
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Results Only Classes</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                    {fmtNaira(basicRate)} / student
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900">{liveSummary.basic_classes_count} Classes</div>
                <div className="text-xs text-slate-500 mt-1 font-medium">
                  {liveSummary.basic_students_count} Students on Basic Plan (₦500 rate)
                </div>
              </div>

              {/* Projected Total Fee */}
              <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-[#119940]" />
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#119940]">Total Term Fee</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-[#119940] border border-emerald-200">
                    Adjusted
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900">{fmtNaira(liveSummary.projected_total_fee)}</div>
                <div className="text-xs text-slate-500 mt-1 font-medium">
                  Across all {liveSummary.total_students} enrolled students
                </div>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleEnableAll}
                  className="px-3 py-1.5 text-xs font-bold text-[#033987] bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                >
                  Enable All Classes
                </button>
                <button
                  type="button"
                  onClick={handleDisablePrimaryNursery}
                  className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors"
                  title="Disables CBT for Nursery and Primary/Basic classes while keeping Secondary active"
                >
                  Disable Nursery & Primary (Results Only)
                </button>
              </div>

              {/* Search & Filter */}
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterType("all")}
                    className={`px-3 py-1.5 font-bold transition-colors ${
                      filterType === "all" ? "bg-[#033987] text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    All ({classes.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType("cbt")}
                    className={`px-3 py-1.5 font-bold transition-colors ${
                      filterType === "cbt" ? "bg-[#033987] text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    CBT Active ({liveSummary.cbt_classes_count})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType("basic")}
                    className={`px-3 py-1.5 font-bold transition-colors ${
                      filterType === "basic" ? "bg-[#033987] text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Results Only ({liveSummary.basic_classes_count})
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Search class or section..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#033987] focus:border-[#033987] w-48"
                />
              </div>
            </div>

            {/* Classes Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/75 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-600 tracking-wider">
                    <th className="py-3 px-4">Class Level</th>
                    <th className="py-3 px-4">Section</th>
                    <th className="py-3 px-4 text-center">Students</th>
                    <th className="py-3 px-4">Package Assigned</th>
                    <th className="py-3 px-4 text-right">Fee / Student</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                    <th className="py-3 px-4 text-center">CBT Exam Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredClasses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                        No classes match your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredClasses.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {item.name}
                          {item.class_group && (
                            <span className="ml-1.5 text-[10px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.class_group}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500">{item.section_name || "—"}</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700">{item.student_count}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              item.cbt_enabled
                                ? "bg-blue-50 text-[#033987] border border-blue-200"
                                : "bg-amber-50 text-amber-800 border border-amber-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.cbt_enabled ? "bg-[#033987]" : "bg-amber-500"
                              }`}
                            />
                            {item.cbt_enabled ? "Full CBT Package" : "Basic Plan (Results Only)"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-700">
                          {fmtNaira(item.platform_fee_per_student)}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                          {fmtNaira(item.total_platform_fee)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggle(item.id)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#033987] focus:ring-offset-2 ${
                              item.cbt_enabled ? "bg-[#033987]" : "bg-slate-300"
                            }`}
                            role="switch"
                            aria-checked={item.cbt_enabled}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                item.cbt_enabled ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Note banner */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-[#033987] flex items-start gap-2.5">
              <span className="text-base">💡</span>
              <div className="leading-relaxed font-medium">
                <strong>Examination Security & Billing Synchronization:</strong> When CBT is disabled for a class,
                students in that class are strictly barred from online and offline CBT exams on the backend, and their
                platform fee automatically drops from the full package rate to <strong>₦500</strong>. Historical already-paid
                records remain intact.
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-semibold">
            {liveSummary.cbt_classes_count} CBT &bull; {liveSummary.basic_classes_count} Basic &bull; Projected Total:{" "}
            <span className="text-[#033987] font-black">{fmtNaira(liveSummary.projected_total_fee)}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#033987] hover:bg-[#0A4FB3] shadow-md shadow-blue-900/10 transition-all flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Applying Changes...</span>
                </>
              ) : (
                <>
                  <span>Save & Apply Settings</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
