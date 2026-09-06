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

  // Only custom school domains (e.g. portal.kingscollege.sch.ng) or app subdomain redirect to login
  return (
    host === "app.schoolprofit.ng" ||
    host === "portal.schoolprofit.ng" ||
    host === "app.gradequest.com.ng" ||
    host === "portal.gradequest.com.ng" ||
    (!host.endsWith(".schoolprofit.ng") && host !== "schoolprofit.ng" && !host.endsWith(".gradequest.com.ng") && host !== "gradequest.com.ng")
  );
};

export const portalLoginUrl = (origin = window.location.origin): string =>
  `${origin.replace(/\/+$/, "")}/login`;
