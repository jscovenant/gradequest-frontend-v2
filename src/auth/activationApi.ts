import { authApi } from "../utils/axios";

export type OnboardingStatus = {
  email_verified: boolean;
  current_session: boolean;
  all_terms_exist: boolean;
  bonus_given: boolean;
};

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const res = await authApi.get("/user/onboarding-status");
  return res.data as OnboardingStatus;
}

export async function verifyEmailCode(code: string) {
  const res = await authApi.post("/verify-email-code", { code });
  return res.data;
}

export async function resendEmailCode() {
  const res = await authApi.post("/resend-email-code");
  return res.data;
}

/** ✅ UPDATED: supports make_current */
export type SetCurrentSessionPayload = {
  // legacy support (if any older code still uses it)
  session?: string;

  // current recommended fields
  name?: string;
  start_date?: string;
  end_date?: string;

  // ✅ NEW
  make_current?: boolean;
};

export async function setCurrentSession(payload: SetCurrentSessionPayload) {
  const res = await authApi.post("/set-current-session", payload);
  return res.data;
}

/** ✅ UPDATED: supports creating terms + selecting active/current term */
export type CreateAllTermsPayload = {
  // legacy support
  session_id?: number;
  session?: string;

  // ✅ NEW
  terms?: string[];
  make_current?: boolean;
  current_term?: string;
};

export async function createAllTerms(payload: CreateAllTermsPayload = {}) {
  const res = await authApi.post("/create-all-terms", payload);
  return res.data;
}

export async function activateBonus() {
  const res = await authApi.post("/activate-bonus");
  return res.data;
}

/**
 * Optional: if your backend has checkOnboardingComplete
 * GET /user/onboarding-complete
 */
export async function checkOnboardingComplete(): Promise<{ complete: boolean }> {
  const res = await authApi.get("/user/onboarding-complete");
  return res.data as { complete: boolean };
}