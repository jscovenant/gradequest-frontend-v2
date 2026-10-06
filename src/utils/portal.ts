export const isCustomPortalHost = (): boolean => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();

  // If accessed directly via server IP address, localhost, or official SchoolProfit main domains -> Show the homepage!
  if (
    /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "schoolprofit.ng" ||
    host === "www.schoolprofit.ng" ||
    host === "gradequest.com.ng" ||
    host === "www.gradequest.com.ng"
  ) {
    return false;
  }

  // Any custom school domain (e.g. samjaneariseandshineschool.com.ng) or school subdomain (e.g. samjane.schoolprofit.ng) or app/portal
  return true;
};

export const portalLoginUrl = (origin = window.location.origin): string => {
  if (isCustomPortalHost()) {
    return `${origin.replace(/\/+$/, "")}/auth/login`;
  }
  return `${origin.replace(/\/+$/, "")}/login`;
};
