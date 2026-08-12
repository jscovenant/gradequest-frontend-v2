export const isCustomPortalHost = (): boolean => {
  const host = window.location.hostname.toLowerCase();

  return (
    import.meta.env.PROD &&
    host !== "gradequest.com.ng" &&
    !host.endsWith(".gradequest.com.ng")
  );
};

export const portalLoginUrl = (origin = window.location.origin): string =>
  `${origin.replace(/\/+$/, "")}/login`;
