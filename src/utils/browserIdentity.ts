/**
 * Helper to sanitize and normalize media URLs (for logos, emblems, favicons)
 */
export const resolveSchoolLogoUrl = (url?: string | null): string => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  const clean = url.replace(/^\/+/, "");
  if (clean.startsWith("uploads/") || clean.startsWith("storage/")) {
    return `https://schoolprofit.ng/${clean}`;
  }
  return `https://schoolprofit.ng/storage/${clean}`;
};

/**
 * Dynamically updates the browser tab title and favicon to reflect the school's identity.
 */
export const setSchoolBrowserIdentity = (
  schoolName?: string | null,
  logoUrl?: string | null,
  subtitleOrTagline?: string | null
) => {
  if (typeof document === "undefined") return;

  // 1. Set Browser Tab Title
  if (schoolName && schoolName.trim()) {
    const cleanName = schoolName.trim();
    if (subtitleOrTagline && subtitleOrTagline.trim()) {
      document.title = `${cleanName} - ${subtitleOrTagline.trim()}`;
    } else {
      document.title = `${cleanName} | Official Website & Portal`;
    }
  }

  // 2. Set Favicon & Mobile App Icons
  const resolvedLogo = resolveSchoolLogoUrl(logoUrl);
  if (resolvedLogo) {
    const iconSelectors = [
      "link[rel='icon']",
      "link[rel='shortcut icon']",
      "link[rel='alternate icon']",
      "link[rel='apple-touch-icon']",
    ];

    let foundAny = false;
    iconSelectors.forEach((selector) => {
      const el = document.querySelector<HTMLLinkElement>(selector);
      if (el) {
        el.href = resolvedLogo;
        foundAny = true;
      }
    });

    if (!foundAny) {
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = resolvedLogo;
      document.head.appendChild(link);
    }
  }
};
