import { authApi } from "../utils/axios";

export type RevenueMetrics = {
  expected_revenue: number;
  collected_revenue: number;
  outstanding_revenue: number;
  overdue_revenue: number;
  collection_rate: number;
  billed_students: number;
};

export type AcademicSubjectInsight = {
  subject_id: number;
  subject?: string | null;
  score: number;
};

export type StudentAcademicInsight = {
  periods: Array<{
    batch_id: number;
    session: string;
    term: string;
    average: number | null;
    subjects: AcademicSubjectInsight[];
  }>;
  latest_average: number | null;
  previous_average: number | null;
  average_change: number | null;
  trend: "improved" | "declined" | "stable" | "insufficient_data";
  weakest_subjects: AcademicSubjectInsight[];
  strongest_subjects: AcademicSubjectInsight[];
  at_risk: boolean;
};

export const intelligenceApi = {
  revenue: (params?: { session_id?: number; term_id?: number; class_id?: number }) =>
    authApi.get<RevenueMetrics>("/intelligence/revenue", { params }),
  student: (studentId: number) =>
    authApi.get<StudentAcademicInsight>(`/intelligence/academic/students/${studentId}`),
};
