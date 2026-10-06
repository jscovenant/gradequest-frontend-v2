import React, { useState, useEffect, useRef } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import PageTitle from "../../../components/PageTitle";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";

// Helper to sanitize and normalize asset URLs
const resolveMediaUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  const clean = url.replace(/^\/+/, "");
  if (clean.startsWith("uploads/")) {
    return `https://schoolprofit.ng/${clean}`;
  }
  if (clean.startsWith("storage/")) {
    return `https://schoolprofit.ng/${clean}`;
  }
  return `https://schoolprofit.ng/storage/${clean}`;
};

interface DomainPricingTier {
  domain: string;
  tld: string;
  available: boolean;
  price: number;
  label: string;
  popular: boolean;
  includes: string[];
}

export default function DomainAndWebsitePage() {
  const { showSuccess, showError, showInfo, showWarning } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "domain" | "branding" | "hero" | "pillars" | "programs" | "facilities" | "gallery" | "principal" | "testimonials_faq" | "contact" | "admissions"
  >("domain");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  // File input refs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroImageInputRef = useRef<HTMLInputElement>(null);
  const principalPhotoInputRef = useRef<HTMLInputElement>(null);

  // Domain state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchingDomain, setSearchingDomain] = useState(false);
  const [domainSuggestions, setDomainSuggestions] = useState<DomainPricingTier[]>([]);
  const [domainStatus, setDomainStatus] = useState<any>(null);
  const [existingDomainInput, setExistingDomainInput] = useState("");
  const [setupChoice, setSetupChoice] = useState<"subdomain" | "full_website">("subdomain");
  const [connectingExisting, setConnectingExisting] = useState(false);
  const [verifyingDns, setVerifyingDns] = useState(false);
  const [dnsVerificationResult, setDnsVerificationResult] = useState<any>(null);
  const [removingDomain, setRemovingDomain] = useState(false);
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false);
  const [purchasingDomain, setPurchasingDomain] = useState<string | null>(null);
  const [schoolMeta, setSchoolMeta] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [newValueTag, setNewValueTag] = useState("");
  const [retryingOrderId, setRetryingOrderId] = useState<number | null>(null);

  // Website Settings state
  const [website, setWebsite] = useState<any>({
    theme_color_primary: "#0F2744",
    theme_color_secondary: "#D97706",
    theme_color_accent: "#2563EB",
    theme_color_text: "#1E293B",
    theme_color_background: "#FFFFFF",
    font_family: "Plus Jakarta Sans",
    site_title: "",
    tagline: "Knowledge, Character & Leadership",
    hero_badge: "Admissions Open for 2026/2027 Academic Session",
    hero_title: "",
    hero_subtitle: "",
    hero_image: "",
    hero_cta_text: "Apply for Admission",
    hero_cta_url: "#admission",
    hero_secondary_cta_text: "School Portal Login",
    hero_secondary_cta_url: "/login",
    principal_name: "",
    principal_title: "Principal & Head of School",
    principal_photo: "",
    principal_welcome_title: "Welcome to Our School",
    principal_welcome_message: "",
    about_title: "Why Choose Our School",
    about_content: "",
    motto: "Excellence in Knowledge and Character",
    mission: "",
    vision: "",
    core_values: ["Academic Excellence", "Moral Integrity", "Innovation & STEM", "Discipline & Leadership", "Creativity"],
    facilities: [],
    programs: [],
    gallery: [],
    testimonials: [],
    faqs: [],
    custom_pages: [],
    nav_links: [],
    contact_email: "",
    contact_phone: "",
    contact_address: "",
    google_map_embed_url: "",
    facebook_url: "",
    instagram_url: "",
    twitter_url: "",
    linkedin_url: "",
    youtube_url: "",
    show_admissions_cta: true,
    show_fee_payment_cta: true,
    show_result_checker_cta: true,
    show_portal_login_cta: true,
    is_published: true,
  });

  // Admission Settings state
  const [admissionSettings, setAdmissionSettings] = useState<any>({
    is_open: true,
    admission_session_name: "2026/2027 Academic Session",
    application_fee: 5000,
    platform_fee: 1000,
    require_payment: true,
    instructions: "",
    requirements: [],
    contact_email: "",
    contact_phone: "",
  });

  // Active registered domain resolver (safe: evaluated after states are declared)
  const activeRegisteredDomain =
    domainStatus?.school?.custom_domain ||
    domainStatus?.active_domain?.domain ||
    schoolMeta?.custom_domain ||
    null;

  const isPlatformPurchased = Boolean(
    domainStatus?.is_platform_purchased ||
    domainStatus?.auto_configured ||
    domainStatus?.orders?.some((o: any) => 
      o.paid_at && 
      (o.domain_name === activeRegisteredDomain || (existingDomainInput && o.domain_name === existingDomainInput.trim()))
    )
  );

  // Color preset options
  const colorPresets = [
    { name: "Royal Navy & Gold", primary: "#0F2744", secondary: "#D97706", accent: "#2563EB" },
    { name: "Emerald Academic Green", primary: "#064E3B", secondary: "#10B981", accent: "#F59E0B" },
    { name: "Maroon & Crimson Crest", primary: "#881337", secondary: "#E11D48", accent: "#F59E0B" },
    { name: "Oxford Sapphire", primary: "#1E3A8A", secondary: "#3B82F6", accent: "#F97316" },
    { name: "Imperial Purple & Amber", primary: "#4C1D95", secondary: "#8B5CF6", accent: "#F59E0B" },
    { name: "Charcoal Platinum", primary: "#18181B", secondary: "#64748B", accent: "#3B82F6" },
  ];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference");
    if (ref) {
      setActiveTab("domain");
      verifyDomainOrder(ref);
    } else {
      fetchInitialData();
    }
  }, []);

  const verifyDomainOrder = async (reference: string) => {
    setLoading(true);
    try {
      const res = await authApi.get(`/admin/domain-orders/verify/${reference}`);
      if (res.data.status) {
        showSuccess?.(res.data.message || "Domain payment confirmed and configured!");
      } else {
        showWarning?.(res.data.message || "Domain order verification pending.");
      }
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to verify domain payment.");
    } finally {
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchInitialData();
    }
  };

  const handleRetryProvision = async (orderId: number) => {
    setRetryingOrderId(orderId);
    try {
      showInfo?.("Triggering domain registration with Whogohost...");
      const res = await authApi.post(`/admin/domain-orders/${orderId}/retry-provision`);
      if (res.data.status) {
        showSuccess?.(res.data.message || "Domain registration action completed!");
        fetchInitialData();
      } else {
        showError?.(res.data.message || "Provisioning attempt failed.");
      }
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to communicate with domain registrar.");
    } finally {
      setRetryingOrderId(null);
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch domain status
      try {
        const domainRes = await authApi.get("/admin/domain-orders/status");
        if (domainRes.data.status) {
          setDomainStatus(domainRes.data);
          if (domainRes.data?.school?.custom_domain) {
            setExistingDomainInput(domainRes.data.school.custom_domain);
          }
        }
      } catch (e) {
        console.warn("Domain status endpoint notice:", e);
      }

      // 2. Fetch website settings
      const siteRes = await authApi.get("/admin/website-settings");
      if (siteRes.data.status) {
        setWebsite(siteRes.data.website || {});
        setSchoolMeta(siteRes.data.school);
        setPreviewUrl(siteRes.data.preview_url);
        if (siteRes.data.school?.name && !siteRes.data.website?.site_title) {
          setWebsite((prev: any) => ({
            ...prev,
            site_title: siteRes.data.school.name,
            hero_title: prev.hero_title || `Empowering Future Leaders at ${siteRes.data.school.name}`,
          }));
        }
      }

      // 3. Fetch admission settings
      try {
        const admRes = await authApi.get("/admin/admissions/settings");
        if (admRes.data.status) {
          setAdmissionSettings(admRes.data.settings || {});
        }
      } catch (e) {
        console.warn("Admission settings fetch notice:", e);
      }
    } catch (err: any) {
      console.error("Error loading domain/website settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "hero_image" | "principal_photo") => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    setUploadingImage(type);
    try {
      const res = await authApi.post("/admin/website-settings/upload-media", formData);
      if (res.data.status) {
        showSuccess?.(`${type.replace("_", " ")} uploaded successfully!`);
        if (type === "logo") {
          setSchoolMeta((prev: any) => ({ ...prev, logo: res.data.url }));
        } else if (type === "hero_image") {
          setWebsite((prev: any) => ({ ...prev, hero_image: res.data.url }));
        } else if (type === "principal_photo") {
          setWebsite((prev: any) => ({ ...prev, principal_photo: res.data.url }));
        }
      }
    } catch (err: any) {
      showError?.(err?.response?.data?.message || `Failed to upload ${type}.`);
    } finally {
      setUploadingImage(null);
    }
  };

  const handleSearchDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      showWarning?.("Please enter a domain name to search.");
      return;
    }

    setSearchingDomain(true);
    try {
      const res = await authApi.post("/admin/domain-orders/check", { query: searchQuery });
      if (res.data.status) {
        setDomainSuggestions(res.data.suggestions || []);
        showSuccess?.("Domain availability verified!");
      }
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Domain check failed.");
    } finally {
      setSearchingDomain(false);
    }
  };

  const handlePurchaseDomain = async (domainItem: DomainPricingTier) => {
    setPurchasingDomain(domainItem.domain);
    try {
      const res = await authApi.post("/admin/domain-orders/initiate", {
        domain_name: domainItem.domain,
        duration_years: 1,
      });

      if (res.data.status && res.data.authorization_url) {
        showInfo?.("Redirecting to Paystack checkout...");
        window.location.href = res.data.authorization_url;
      } else {
        showError?.(res.data.message || "Could not initialize checkout.");
      }
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to initiate domain purchase.");
    } finally {
      setPurchasingDomain(null);
    }
  };

  const handleConnectExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingDomainInput.trim()) {
      showWarning?.("Please enter your custom domain name.");
      return;
    }

    setConnectingExisting(true);
    try {
      const res = await authApi.post("/admin/domain-orders/connect-existing", {
        domain: existingDomainInput.trim(),
        setup_type: setupChoice,
      });

      if (res.data.status) {
        if (res.data.requires_payment && res.data.authorization_url) {
          showInfo?.("Redirecting to Paystack for custom domain setup fee checkout...");
          window.location.href = res.data.authorization_url;
        } else {
          showSuccess?.(res.data.message || "Domain registered! Please configure DNS records.");
          fetchInitialData();
        }
      } else {
        showError?.(res.data.message || "Failed to connect domain.");
      }
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to connect domain.");
    } finally {
      setConnectingExisting(false);
    }
  };

  const handleVerifyDns = async () => {
    setVerifyingDns(true);
    setDnsVerificationResult(null);
    try {
      showInfo?.("Checking domain DNS records for propagation...");
      const res = await authApi.post("/admin/domain-orders/verify-dns", {
        domain: existingDomainInput.trim() || domainStatus?.school?.custom_domain || domainStatus?.active_domain?.domain,
      });

      setDnsVerificationResult(res.data);
      if (res.data.status && res.data.verified) {
        showSuccess?.(res.data.message || "DNS verified! Your domain is active and routed to SchoolProfit.");
        fetchInitialData();
      } else {
        showWarning?.(res.data.message || "DNS records not detected yet. DNS changes can take 5-15 minutes to propagate.");
      }
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "DNS verification check failed.");
    } finally {
      setVerifyingDns(false);
    }
  };

  const handleRemoveDomain = async () => {
    setRemovingDomain(true);
    try {
      const res = await authApi.post("/admin/domain-orders/remove");
      if (res.data.status) {
        showSuccess?.(res.data.message || "Custom domain removed successfully.");
        setExistingDomainInput("");
        setDomainStatus((prev: any) => ({
          ...prev,
          school: {
            ...(prev?.school || {}),
            custom_domain: null,
          },
          active_domain: null,
        }));
        setShowRemoveConfirmModal(false);
        fetchInitialData();
      } else {
        showError?.(res.data.message || "Failed to remove custom domain.");
      }
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to remove custom domain.");
    } finally {
      setRemovingDomain(false);
    }
  };

  const handleSaveWebsiteSettings = async () => {
    setSaving(true);
    try {
      // Save Website Settings
      const sitePromise = authApi.put("/admin/website-settings", website);

      // Save Admission Settings in parallel if admission settings tab or fee changed
      const admPromise = authApi.put("/admin/admissions/settings", admissionSettings).catch(() => null);

      const [res] = await Promise.all([sitePromise, admPromise]);

      if (res.data.status) {
        showSuccess?.("Website & section settings saved successfully!");
        setWebsite(res.data.website);
      }
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const applyColorPreset = (preset: { name: string; primary: string; secondary: string; accent: string }) => {
    setWebsite((prev: any) => ({
      ...prev,
      theme_color_primary: preset.primary,
      theme_color_secondary: preset.secondary,
      theme_color_accent: preset.accent,
    }));
    showInfo?.(`Applied ${preset.name} palette!`);
  };

  // ── Core Values Helpers ──
  const handleAddCoreValue = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newValueTag.trim()) return;
    const current = website.core_values || [];
    if (!current.includes(newValueTag.trim())) {
      setWebsite((prev: any) => ({ ...prev, core_values: [...current, newValueTag.trim()] }));
    }
    setNewValueTag("");
  };

  const handleRemoveCoreValue = (index: number) => {
    const updated = (website.core_values || []).filter((_: any, i: number) => i !== index);
    setWebsite((prev: any) => ({ ...prev, core_values: updated }));
  };

  // ── Programs Helpers ──
  const handleAddProgram = () => {
    const item = {
      name: "New Academic Program",
      age_range: "Ages 5 – 11",
      desc: "Provide an inspiring description of this academic grade, subjects taught, and developmental goals...",
      badge: "Curriculum Standard",
    };
    setWebsite((prev: any) => ({ ...prev, programs: [...(prev.programs || []), item] }));
  };

  const handleRemoveProgram = (index: number) => {
    const updated = (website.programs || []).filter((_: any, idx: number) => idx !== index);
    setWebsite((prev: any) => ({ ...prev, programs: updated }));
  };

  const handleUpdateProgram = (index: number, field: string, value: any) => {
    const updated = [...(website.programs || [])];
    updated[index] = { ...updated[index], [field]: value };
    setWebsite((prev: any) => ({ ...prev, programs: updated }));
  };

  // ── Facilities Helpers ──
  const handleAddFacility = () => {
    const item = {
      title: "New Campus Facility",
      desc: "Describe this state-of-the-art facility, its equipment, and how students benefit from it...",
      icon: "FlaskConical",
    };
    setWebsite((prev: any) => ({ ...prev, facilities: [...(prev.facilities || []), item] }));
  };

  const handleRemoveFacility = (index: number) => {
    const updated = (website.facilities || []).filter((_: any, idx: number) => idx !== index);
    setWebsite((prev: any) => ({ ...prev, facilities: updated }));
  };

  const handleUpdateFacility = (index: number, field: string, value: any) => {
    const updated = [...(website.facilities || [])];
    updated[index] = { ...updated[index], [field]: value };
    setWebsite((prev: any) => ({ ...prev, facilities: updated }));
  };

  // ── Gallery Helpers ──
  const handleAddGalleryPhoto = () => {
    const item = {
      title: "Campus Activity",
      category: "Campus & Classrooms",
      image: "",
      caption: "Photo description...",
    };
    setWebsite((prev: any) => ({ ...prev, gallery: [...(prev.gallery || []), item] }));
  };

  const handleRemoveGalleryPhoto = (index: number) => {
    const updated = (website.gallery || []).filter((_: any, idx: number) => idx !== index);
    setWebsite((prev: any) => ({ ...prev, gallery: updated }));
  };

  const handleUpdateGalleryPhoto = (index: number, field: string, value: any) => {
    const updated = [...(website.gallery || [])];
    updated[index] = { ...updated[index], [field]: value };
    setWebsite((prev: any) => ({ ...prev, gallery: updated }));
  };

  // ── Testimonials Helpers ──
  const handleAddTestimonial = () => {
    const item = {
      name: "Parent Name",
      role: "Parent of JSS 1 Student",
      content: "Share parent feedback, appreciation for teachers, and student growth testimony...",
      rating: 5,
    };
    setWebsite((prev: any) => ({ ...prev, testimonials: [...(prev.testimonials || []), item] }));
  };

  const handleRemoveTestimonial = (index: number) => {
    const updated = (website.testimonials || []).filter((_: any, idx: number) => idx !== index);
    setWebsite((prev: any) => ({ ...prev, testimonials: updated }));
  };

  const handleUpdateTestimonial = (index: number, field: string, value: any) => {
    const updated = [...(website.testimonials || [])];
    updated[index] = { ...updated[index], [field]: value };
    setWebsite((prev: any) => ({ ...prev, testimonials: updated }));
  };

  // ── FAQs Helpers ──
  const handleAddFaq = () => {
    const item = {
      question: "Frequently Asked Question?",
      answer: "Clear, helpful answer for prospective and current parents...",
    };
    setWebsite((prev: any) => ({ ...prev, faqs: [...(prev.faqs || []), item] }));
  };

  const handleRemoveFaq = (index: number) => {
    const updated = (website.faqs || []).filter((_: any, idx: number) => idx !== index);
    setWebsite((prev: any) => ({ ...prev, faqs: updated }));
  };

  const handleUpdateFaq = (index: number, field: string, value: any) => {
    const updated = [...(website.faqs || [])];
    updated[index] = { ...updated[index], [field]: value };
    setWebsite((prev: any) => ({ ...prev, faqs: updated }));
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .db-main { background: #F8FAFC; min-height: 100vh; font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; padding: 24px 28px 60px; }
        .db-hero { background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%); border-radius: 18px; padding: 30px 34px; position: relative; overflow: hidden; margin: 10px 0 24px; box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15); }
        .db-hero-glow { position: absolute; top: -60px; right: -60px; width: 320px; height: 320px; border-radius: 50%; background: radial-gradient(circle, rgba(217, 119, 6, 0.15) 0%, transparent 65%); pointer-events: none; }
        .db-hero-glow2 { position: absolute; bottom: -40px; left: 30%; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(37, 99, 235, 0.10) 0%, transparent 70%); pointer-events: none; }
        .db-hero-inner { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
        .db-session-badge { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #FBBF24; background: rgba(217, 119, 6, 0.20); border: 1px solid rgba(217, 119, 6, 0.35); border-radius: 100px; padding: 4px 12px; margin-bottom: 10px; }
        .db-session-dot { width: 6px; height: 6px; border-radius: 50%; background: #10B981; }
        .db-greeting { font-size: 24px; font-weight: 800; color: #fff; line-height: 1.2; margin-bottom: 6px; }
        .db-greeting em { font-style: normal; color: #FBBF24; }
        .db-hero-sub { font-size: 13px; color: #CBD5E1; line-height: 1.5; max-width: 600px; margin-bottom: 16px; }
        .db-hero-btns { display: flex; gap: 10px; flex-wrap: wrap; }
        .db-btn-gold { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; font-size: 13px; font-weight: 700; color: #FFFFFF; background: #D97706; border: none; border-radius: 10px; cursor: pointer; transition: all 0.2s ease; text-decoration: none; }
        .db-btn-gold:hover { background: #B45309; color: #FFFFFF; transform: translateY(-1px); }
        .db-btn-outline { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; font-size: 13px; font-weight: 600; color: #FFFFFF; background: rgba(255, 255, 255, 0.10); border: 1px solid rgba(255, 255, 255, 0.20); border-radius: 10px; cursor: pointer; transition: all 0.2s ease; text-decoration: none; }
        .db-btn-outline:hover { background: rgba(255, 255, 255, 0.18); color: #fff; }
        
        .db-panel { background: #fff; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(15,39,68,0.03); margin-bottom: 24px; }
        .db-panel-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 22px; border-bottom: 1px solid #F1F5F9; gap: 12px; flex-wrap: wrap; background: #FFFFFF; }
        .db-panel-title { font-size: 15.5px; font-weight: 700; color: #0F2744; margin: 0; display: flex; align-items: center; gap: 8px; }
        .db-panel-sub { font-size: 12px; font-weight: 400; color: #64748B; margin: 2px 0 0; }
        .db-pill { display: inline-flex; align-items: center; font-size: 11.5px; font-weight: 700; padding: 5px 10px; border-radius: 999px; }
        
        .db-tabs-bar { display: flex; gap: 4px; border-bottom: 2px solid #E2E8F0; margin-bottom: 22px; overflow-x: auto; padding-bottom: 2px; }
        .db-tab-item { padding: 9px 15px; font-size: 13px; font-weight: 700; color: #64748B; border: none; background: transparent; border-bottom: 3px solid transparent; cursor: pointer; transition: all 0.2s; white-space: nowrap; display: flex; align-items: center; gap: 6px; }
        .db-tab-item.active { color: #0F2744; border-bottom-color: #D97706; background: rgba(217, 119, 6, 0.05); border-radius: 8px 8px 0 0; }
        .db-tab-item:hover { color: #0F2744; }

        .palette-card { border: 2px solid #E2E8F0; border-radius: 12px; padding: 12px 14px; cursor: pointer; transition: all 0.2s ease; background: #fff; }
        .palette-card:hover { border-color: #D97706; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.06); }
        .palette-swatch { width: 26px; height: 26px; border-radius: 6px; border: 1px solid rgba(0,0,0,0.1); }

        .section-item-card { border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; background: #FAFAFC; position: relative; transition: all 0.2s; }
        .section-item-card:hover { border-color: #CBD5E1; background: #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }

        .floating-save-bar { position: sticky; bottom: 15px; z-index: 100; background: rgba(15, 39, 68, 0.95); backdrop-filter: blur(8px); border-radius: 14px; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; box-shadow: 0 10px 25px rgba(15,39,68,0.25); margin-top: 20px; }

        @media (max-width: 991.98px) { .db-main { padding: 18px 14px 60px; } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Website & Section Content Editor" />

      {/* Hidden File Inputs */}
      <input type="file" ref={logoInputRef} className="d-none" accept="image/*" onChange={(e) => handleFileUpload(e, "logo")} />
      <input type="file" ref={heroImageInputRef} className="d-none" accept="image/*" onChange={(e) => handleFileUpload(e, "hero_image")} />
      <input type="file" ref={principalPhotoInputRef} className="d-none" accept="image/*" onChange={(e) => handleFileUpload(e, "principal_photo")} />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loading && <Loader message="Loading website configurations..." />}

            {/* HERO BANNER */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    School Website & Public Portal Management
                  </div>

                  <h1 className="db-greeting">
                    Website & <em>Section Content Editor</em>
                  </h1>

                  <p className="db-hero-sub">
                    Customize every section of your public website: Hero banners, Academic Programs, Campus Facilities, Mission & Vision, Principal Desk, Photo Gallery, Testimonials, FAQs, Brand colors, and Admission settings.
                  </p>

                  <div className="db-hero-btns">
                    {previewUrl && (
                      <a href={previewUrl} target="_blank" rel="noreferrer" className="db-btn-gold">
                        <i className="bi bi-box-arrow-up-right"></i>
                        View Live Website
                      </a>
                    )}
                    <button className="db-btn-outline" onClick={fetchInitialData} disabled={loading || saving}>
                      <i className="bi bi-arrow-clockwise"></i>
                      Refresh
                    </button>
                    <button className="db-btn-gold" onClick={handleSaveWebsiteSettings} disabled={saving}>
                      <i className="bi bi-check2-circle"></i>
                      {saving ? "Saving Changes..." : "Save All Changes"}
                    </button>
                  </div>
                </div>

                <div className="db-hero-stat-card d-none d-lg-block" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 14, padding: "16px 20px", minWidth: 260 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#FBBF24", marginBottom: 10 }}>
                    Live Website Status
                  </div>
                  <div className="d-flex flex-column gap-2 text-white">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-white-50">Web Address:</span>
                      <span className="fw-bold small">{domainStatus?.school?.custom_domain || "Active"}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-white-50">School Logo:</span>
                      <span className="badge bg-success bg-opacity-25 text-white">{schoolMeta?.logo ? "Uploaded ✓" : "Default"}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-white-50">Admissions Portal:</span>
                      <span className="badge bg-warning bg-opacity-25 text-warning">{admissionSettings?.is_open ? "Open ✓" : "Closed"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* TOP NAVIGATION TABS */}
            <div className="db-tabs-bar">
              <button className={`db-tab-item ${activeTab === "domain" ? "active" : ""}`} onClick={() => setActiveTab("domain")}>
                <i className="bi bi-globe"></i> 1. Custom Domain & DNS
              </button>
              <button className={`db-tab-item ${activeTab === "branding" ? "active" : ""}`} onClick={() => setActiveTab("branding")}>
                <i className="bi bi-palette"></i> 2. Brand & Colors
              </button>
              <button className={`db-tab-item ${activeTab === "hero" ? "active" : ""}`} onClick={() => setActiveTab("hero")}>
                <i className="bi bi-megaphone"></i> 3. Hero & Announcement
              </button>
              <button className={`db-tab-item ${activeTab === "pillars" ? "active" : ""}`} onClick={() => setActiveTab("pillars")}>
                <i className="bi bi-bank"></i> 4. Mission, Vision & Pillars
              </button>
              <button className={`db-tab-item ${activeTab === "programs" ? "active" : ""}`} onClick={() => setActiveTab("programs")}>
                <i className="bi bi-mortarboard"></i> 5. Academic Programs ({(website.programs || []).length})
              </button>
              <button className={`db-tab-item ${activeTab === "facilities" ? "active" : ""}`} onClick={() => setActiveTab("facilities")}>
                <i className="bi bi-building"></i> 6. Campus Facilities ({(website.facilities || []).length})
              </button>
              <button className={`db-tab-item ${activeTab === "gallery" ? "active" : ""}`} onClick={() => setActiveTab("gallery")}>
                <i className="bi bi-images"></i> 7. Photo Gallery ({(website.gallery || []).length})
              </button>
              <button className={`db-tab-item ${activeTab === "principal" ? "active" : ""}`} onClick={() => setActiveTab("principal")}>
                <i className="bi bi-person-lines-fill"></i> 8. Principal's Desk
              </button>
              <button className={`db-tab-item ${activeTab === "testimonials_faq" ? "active" : ""}`} onClick={() => setActiveTab("testimonials_faq")}>
                <i className="bi bi-chat-heart"></i> 9. Reviews & FAQs
              </button>
              <button className={`db-tab-item ${activeTab === "contact" ? "active" : ""}`} onClick={() => setActiveTab("contact")}>
                <i className="bi bi-telephone"></i> 10. Contact & Socials
              </button>
              <button className={`db-tab-item ${activeTab === "admissions" ? "active" : ""}`} onClick={() => setActiveTab("admissions")}>
                <i className="bi bi-clipboard-check"></i> 11. Admission Fee & Settings
              </button>
            </div>

            {/* ══════════════════════════════════════════════════════════ */}
            {/* TAB 1: BRANDING, LOGO & COLORS */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeTab === "branding" && (
              <div className="d-flex flex-column gap-4">
                {/* School Logo */}
                <div className="db-panel">
                  <div className="db-panel-head">
                    <div>
                      <h4 className="db-panel-title">
                        <i className="bi bi-shield-check text-warning"></i> School Crest & Logo
                      </h4>
                      <p className="db-panel-sub">Upload your official high-resolution school badge or emblem.</p>
                    </div>
                    <button
                      className="btn btn-outline-dark btn-sm fw-bold"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingImage === "logo"}
                    >
                      <i className="bi bi-upload me-1"></i>
                      {uploadingImage === "logo" ? "Uploading..." : "Upload New Logo"}
                    </button>
                  </div>
                  <div className="p-4 d-flex align-items-center gap-4 flex-wrap">
                    <div className="p-3 bg-light border rounded-3 text-center" style={{ width: 110, height: 110, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {schoolMeta?.logo ? (
                        <img src={resolveMediaUrl(schoolMeta.logo)} alt="School Logo" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                      ) : (
                        <span className="text-muted small">No Logo</span>
                      )}
                    </div>
                    <div>
                      <div className="fw-bold text-dark mb-1">{schoolMeta?.name || "Official School Logo"}</div>
                      <div className="text-muted small mb-3">Recommended format: Transparent PNG or SVG (Max: 4MB).</div>
                      <button className="btn btn-warning btn-sm fw-bold" onClick={() => logoInputRef.current?.click()}>
                        Change Logo Image
                      </button>
                    </div>
                  </div>
                </div>

                {/* Brand Colors Customizer */}
                <div className="db-panel">
                  <div className="db-panel-head">
                    <div>
                      <h4 className="db-panel-title">
                        <i className="bi bi-palette text-primary"></i> School Brand Color Customizer
                      </h4>
                      <p className="db-panel-sub">Pick your school’s unique primary, secondary, and accent colors.</p>
                    </div>
                    <button className="db-btn-gold" onClick={handleSaveWebsiteSettings} disabled={saving}>
                      <i className="bi bi-check2"></i> Save Colors
                    </button>
                  </div>

                  <div className="p-4">
                    <h6 className="fw-bold mb-3 text-dark">Curated Academic Color Palettes:</h6>
                    <div className="row g-3 mb-4">
                      {colorPresets.map((preset, idx) => (
                        <div key={idx} className="col-12 col-md-4">
                          <div className="palette-card" onClick={() => applyColorPreset(preset)}>
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <span className="fw-bold text-dark small">{preset.name}</span>
                            </div>
                            <div className="d-flex gap-2">
                              <div className="palette-swatch" style={{ background: preset.primary }} title="Primary" />
                              <div className="palette-swatch" style={{ background: preset.secondary }} title="Secondary" />
                              <div className="palette-swatch" style={{ background: preset.accent }} title="Accent" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <hr className="my-4" />

                    <h6 className="fw-bold mb-3 text-dark">Custom Color Codes (HEX):</h6>
                    <div className="row g-3">
                      <div className="col-12 col-md-4">
                        <label className="form-label fw-bold small text-dark">Primary Brand Color (Navbar & Hero):</label>
                        <div className="input-group">
                          <input
                            type="color"
                            className="form-control form-control-color"
                            value={website.theme_color_primary || "#0F2744"}
                            onChange={(e) => setWebsite((p: any) => ({ ...p, theme_color_primary: e.target.value }))}
                          />
                          <input
                            type="text"
                            className="form-control"
                            value={website.theme_color_primary || "#0F2744"}
                            onChange={(e) => setWebsite((p: any) => ({ ...p, theme_color_primary: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label fw-bold small text-dark">Secondary Color (Gold Buttons & Badges):</label>
                        <div className="input-group">
                          <input
                            type="color"
                            className="form-control form-control-color"
                            value={website.theme_color_secondary || "#D97706"}
                            onChange={(e) => setWebsite((p: any) => ({ ...p, theme_color_secondary: e.target.value }))}
                          />
                          <input
                            type="text"
                            className="form-control"
                            value={website.theme_color_secondary || "#D97706"}
                            onChange={(e) => setWebsite((p: any) => ({ ...p, theme_color_secondary: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label fw-bold small text-dark">Accent Color (Links & Interactive Accents):</label>
                        <div className="input-group">
                          <input
                            type="color"
                            className="form-control form-control-color"
                            value={website.theme_color_accent || "#2563EB"}
                            onChange={(e) => setWebsite((p: any) => ({ ...p, theme_color_accent: e.target.value }))}
                          />
                          <input
                            type="text"
                            className="form-control"
                            value={website.theme_color_accent || "#2563EB"}
                            onChange={(e) => setWebsite((p: any) => ({ ...p, theme_color_accent: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* TAB 2: HERO & ANNOUNCEMENT */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeTab === "hero" && (
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <h4 className="db-panel-title">
                      <i className="bi bi-megaphone text-warning"></i> Hero Banner & Call-to-Actions
                    </h4>
                    <p className="db-panel-sub">Customize the hero headline, announcement badge, button links, and background campus picture.</p>
                  </div>
                  <button className="db-btn-gold" onClick={handleSaveWebsiteSettings} disabled={saving}>
                    <i className="bi bi-check2"></i> Save Changes
                  </button>
                </div>

                <div className="p-4 row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold small text-dark">Hero Announcement Badge:</label>
                    <input
                      type="text"
                      className="form-control"
                      value={website.hero_badge || ""}
                      onChange={(e) => setWebsite((p: any) => ({ ...p, hero_badge: e.target.value }))}
                      placeholder="e.g. Admissions Open for 2026/2027 Session"
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold small text-dark">Hero Main Headline:</label>
                    <input
                      type="text"
                      className="form-control"
                      value={website.hero_title || ""}
                      onChange={(e) => setWebsite((p: any) => ({ ...p, hero_title: e.target.value }))}
                      placeholder="e.g. Empowering Tomorrow's Leaders Today"
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-bold small text-dark">Hero Subtitle / Description:</label>
                    <textarea
                      rows={3}
                      className="form-control"
                      value={website.hero_subtitle || ""}
                      onChange={(e) => setWebsite((p: any) => ({ ...p, hero_subtitle: e.target.value }))}
                      placeholder="Inspiring summary of your institution's academic excellence and holistic character formation..."
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold small text-dark">Primary CTA Button Text:</label>
                    <input
                      type="text"
                      className="form-control"
                      value={website.hero_cta_text || "Apply for Admission"}
                      onChange={(e) => setWebsite((p: any) => ({ ...p, hero_cta_text: e.target.value }))}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold small text-dark">Primary CTA Target URL / Anchor:</label>
                    <input
                      type="text"
                      className="form-control"
                      value={website.hero_cta_url || "#admission"}
                      onChange={(e) => setWebsite((p: any) => ({ ...p, hero_cta_url: e.target.value }))}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold small text-dark">Secondary CTA Button Text:</label>
                    <input
                      type="text"
                      className="form-control"
                      value={website.hero_secondary_cta_text || "School Portal Login"}
                      onChange={(e) => setWebsite((p: any) => ({ ...p, hero_secondary_cta_text: e.target.value }))}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold small text-dark">Secondary CTA Target URL:</label>
                    <input
                      type="text"
                      className="form-control"
                      value={website.hero_secondary_cta_url || "/login"}
                      onChange={(e) => setWebsite((p: any) => ({ ...p, hero_secondary_cta_url: e.target.value }))}
                    />
                  </div>

                  {/* Hero Background Image Upload */}
                  <div className="col-12">
                    <label className="form-label fw-bold small text-dark">Optional Hero Campus Background Photo:</label>
                    <div className="d-flex align-items-center gap-3 p-3 border rounded-3 bg-light">
                      {website.hero_image ? (
                        <div className="position-relative" style={{ width: 140, height: 80 }}>
                          <img src={resolveMediaUrl(website.hero_image)} alt="Hero Background" className="rounded-2 w-100 h-100 object-fit-cover" />
                          <button
                            type="button"
                            className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1 p-0 rounded-circle d-flex align-items-center justify-content-center"
                            style={{ width: 22, height: 22 }}
                            onClick={() => setWebsite((p: any) => ({ ...p, hero_image: "" }))}
                            title="Remove background photo"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="text-muted small">No background photo uploaded (Clean modern navy & gold SVG geometry is active).</div>
                      )}
                      <button
                        type="button"
                        className="btn btn-outline-dark btn-sm fw-bold ms-auto"
                        onClick={() => heroImageInputRef.current?.click()}
                        disabled={uploadingImage === "hero_image"}
                      >
                        <i className="bi bi-image me-1"></i>
                        {uploadingImage === "hero_image" ? "Uploading..." : "Upload Campus Photo"}
                      </button>
                    </div>
                  </div>

                  <hr className="my-3" />

                  {/* Feature CTA Toggles */}
                  <div className="col-12">
                    <h6 className="fw-bold text-dark mb-3">Homepage Feature Badges & Quick Action Links:</h6>
                    <div className="row g-3">
                      <div className="col-12 col-md-3">
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="switchAdmissionsCta"
                            checked={website.show_admissions_cta !== false}
                            onChange={(e) => setWebsite((p: any) => ({ ...p, show_admissions_cta: e.target.checked }))}
                          />
                          <label className="form-check-label fw-bold small" htmlFor="switchAdmissionsCta">Online Admissions CTA</label>
                        </div>
                      </div>

                      <div className="col-12 col-md-3">
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="switchFeePaymentCta"
                            checked={website.show_fee_payment_cta !== false}
                            onChange={(e) => setWebsite((p: any) => ({ ...p, show_fee_payment_cta: e.target.checked }))}
                          />
                          <label className="form-check-label fw-bold small" htmlFor="switchFeePaymentCta">Fee Payment CTA</label>
                        </div>
                      </div>

                      <div className="col-12 col-md-3">
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="switchResultCheckerCta"
                            checked={website.show_result_checker_cta !== false}
                            onChange={(e) => setWebsite((p: any) => ({ ...p, show_result_checker_cta: e.target.checked }))}
                          />
                          <label className="form-check-label fw-bold small" htmlFor="switchResultCheckerCta">Result Checker CTA</label>
                        </div>
                      </div>

                      <div className="col-12 col-md-3">
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="switchPortalLoginCta"
                            checked={website.show_portal_login_cta !== false}
                            onChange={(e) => setWebsite((p: any) => ({ ...p, show_portal_login_cta: e.target.checked }))}
                          />
                          <label className="form-check-label fw-bold small" htmlFor="switchPortalLoginCta">Portal Login CTA</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* TAB 3: MISSION, VISION & PILLARS */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeTab === "pillars" && (
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <h4 className="db-panel-title">
                      <i className="bi bi-bank text-primary"></i> School Motto, Mission, Vision & Core Values
                    </h4>
                    <p className="db-panel-sub">Articulate your institution’s educational philosophy, guiding vision, and foundational pillars.</p>
                  </div>
                  <button className="db-btn-gold" onClick={handleSaveWebsiteSettings} disabled={saving}>
                    <i className="bi bi-check2"></i> Save Changes
                  </button>
                </div>

                <div className="p-4 row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold small text-dark">School Motto / Slogan:</label>
                    <input
                      type="text"
                      className="form-control"
                      value={website.motto || ""}
                      onChange={(e) => setWebsite((p: any) => ({ ...p, motto: e.target.value }))}
                      placeholder="e.g. Excellence in Knowledge and Character"
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold small text-dark">About Section Title:</label>
                    <input
                      type="text"
                      className="form-control"
                      value={website.about_title || "Why Choose Our School"}
                      onChange={(e) => setWebsite((p: any) => ({ ...p, about_title: e.target.value }))}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-bold small text-dark">About School Narrative / Story:</label>
                    <textarea
                      rows={4}
                      className="form-control"
                      value={website.about_content || ""}
                      onChange={(e) => setWebsite((p: any) => ({ ...p, about_content: e.target.value }))}
                      placeholder="Describe your school's rich history, standards, experienced faculty, and commitment to student achievement..."
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold small text-dark">Mission Statement:</label>
                    <textarea
                      rows={3}
                      className="form-control"
                      value={website.mission || ""}
                      onChange={(e) => setWebsite((p: any) => ({ ...p, mission: e.target.value }))}
                      placeholder="To deliver high-impact education through modern pedagogies, ethical values, and digital technology..."
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold small text-dark">Vision Statement:</label>
                    <textarea
                      rows={3}
                      className="form-control"
                      value={website.vision || ""}
                      onChange={(e) => setWebsite((p: any) => ({ ...p, vision: e.target.value }))}
                      placeholder="To be a premier learning institution raising globally competitive leaders of integrity and competence..."
                    />
                  </div>

                  {/* Core Values Tag Manager */}
                  <div className="col-12 mt-3">
                    <label className="form-label fw-bold small text-dark">Core Values & Institutional Pillars:</label>
                    <div className="p-3 border rounded-3 bg-light">
                      <div className="d-flex flex-wrap gap-2 mb-3">
                        {(website.core_values || []).map((val: string, idx: number) => (
                          <span key={idx} className="badge bg-white text-dark border p-2 d-inline-flex align-items-center gap-2 shadow-sm">
                            <i className="bi bi-award-fill text-warning"></i>
                            <span className="fw-semibold">{val}</span>
                            <button
                              type="button"
                              className="btn-close btn-close-dark"
                              style={{ fontSize: 9 }}
                              onClick={() => handleRemoveCoreValue(idx)}
                            />
                          </span>
                        ))}
                      </div>

                      <div className="input-group" style={{ maxWidth: 400 }}>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. Discipline, Integrity, STEM Innovation"
                          value={newValueTag}
                          onChange={(e) => setNewValueTag(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCoreValue())}
                        />
                        <button type="button" className="btn btn-warning btn-sm fw-bold" onClick={handleAddCoreValue}>
                          + Add Value
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* TAB 4: ACADEMIC PROGRAMS */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeTab === "programs" && (
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <h4 className="db-panel-title">
                      <i className="bi bi-mortarboard text-warning"></i> Academic Programs Builder
                    </h4>
                    <p className="db-panel-sub">Define the education levels offered (Creche, Primary, Junior & Senior Secondary streams).</p>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-outline-primary btn-sm fw-bold" onClick={handleAddProgram}>
                      <i className="bi bi-plus-circle me-1"></i> Add New Program
                    </button>
                    <button className="db-btn-gold" onClick={handleSaveWebsiteSettings} disabled={saving}>
                      <i className="bi bi-check2"></i> Save Changes
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  {(!website.programs || website.programs.length === 0) ? (
                    <div className="p-4 text-center border rounded-3 bg-light">
                      <i className="bi bi-journal-bookmark text-muted" style={{ fontSize: "32px" }}></i>
                      <p className="text-muted small mt-2 mb-3">No programs added yet. Default curriculum levels are currently displayed on the website.</p>
                      <button type="button" className="btn btn-primary btn-sm fw-bold" onClick={handleAddProgram}>
                        + Add First Program
                      </button>
                    </div>
                  ) : (
                    <div className="row g-3">
                      {website.programs.map((prog: any, idx: number) => (
                        <div key={idx} className="col-12 col-md-6">
                          <div className="section-item-card">
                            <button
                              type="button"
                              className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 p-1 rounded-circle d-flex align-items-center justify-content-center"
                              style={{ width: 24, height: 24, zIndex: 10 }}
                              onClick={() => handleRemoveProgram(idx)}
                              title="Delete program"
                            >
                              ✕
                            </button>

                            <div className="mb-2">
                              <label className="form-label small fw-bold text-dark mb-1">Program Name:</label>
                              <input
                                type="text"
                                className="form-control form-control-sm fw-bold"
                                value={prog.name || ""}
                                placeholder="e.g. Senior Secondary (Science Stream)"
                                onChange={(e) => handleUpdateProgram(idx, "name", e.target.value)}
                              />
                            </div>

                            <div className="row g-2 mb-2">
                              <div className="col-6">
                                <label className="form-label small fw-bold text-dark mb-1">Age / Grade Range:</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={prog.age_range || ""}
                                  placeholder="e.g. Ages 14 – 17 or SS 1 - 3"
                                  onChange={(e) => handleUpdateProgram(idx, "age_range", e.target.value)}
                                />
                              </div>
                              <div className="col-6">
                                <label className="form-label small fw-bold text-dark mb-1">Badge / Tag:</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={prog.badge || ""}
                                  placeholder="e.g. Upper Secondary"
                                  onChange={(e) => handleUpdateProgram(idx, "badge", e.target.value)}
                                />
                              </div>
                            </div>

                            <div className="mb-0">
                              <label className="form-label small fw-bold text-dark mb-1">Curriculum & Learning Description:</label>
                              <textarea
                                rows={2}
                                className="form-control form-control-sm"
                                value={prog.desc || ""}
                                placeholder="Specialized focus on Physics, Chemistry, Biology, Further Maths, and WAEC/JAMB mastery..."
                                onChange={(e) => handleUpdateProgram(idx, "desc", e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* TAB 5: CAMPUS FACILITIES */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeTab === "facilities" && (
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <h4 className="db-panel-title">
                      <i className="bi bi-building text-primary"></i> Campus Facilities Builder
                    </h4>
                    <p className="db-panel-sub">Showcase physical infrastructure: Science Labs, ICT Suite, Sports Arena, Library, CCTV Security.</p>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-outline-primary btn-sm fw-bold" onClick={handleAddFacility}>
                      <i className="bi bi-plus-circle me-1"></i> Add Facility
                    </button>
                    <button className="db-btn-gold" onClick={handleSaveWebsiteSettings} disabled={saving}>
                      <i className="bi bi-check2"></i> Save Changes
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  {(!website.facilities || website.facilities.length === 0) ? (
                    <div className="p-4 text-center border rounded-3 bg-light">
                      <i className="bi bi-building text-muted" style={{ fontSize: "32px" }}></i>
                      <p className="text-muted small mt-2 mb-3">No facilities added yet. Standard campus facilities are currently active.</p>
                      <button type="button" className="btn btn-primary btn-sm fw-bold" onClick={handleAddFacility}>
                        + Add First Facility
                      </button>
                    </div>
                  ) : (
                    <div className="row g-3">
                      {website.facilities.map((fac: any, idx: number) => (
                        <div key={idx} className="col-12 col-md-6">
                          <div className="section-item-card">
                            <button
                              type="button"
                              className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 p-1 rounded-circle d-flex align-items-center justify-content-center"
                              style={{ width: 24, height: 24, zIndex: 10 }}
                              onClick={() => handleRemoveFacility(idx)}
                              title="Delete facility"
                            >
                              ✕
                            </button>

                            <div className="row g-2 mb-2">
                              <div className="col-8">
                                <label className="form-label small fw-bold text-dark mb-1">Facility Title:</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm fw-bold"
                                  value={fac.title || ""}
                                  placeholder="e.g. Ultra-Modern ICT & CBT Center"
                                  onChange={(e) => handleUpdateFacility(idx, "title", e.target.value)}
                                />
                              </div>
                              <div className="col-4">
                                <label className="form-label small fw-bold text-dark mb-1">Icon:</label>
                                <select
                                  className="form-select form-select-sm"
                                  value={fac.icon || "FlaskConical"}
                                  onChange={(e) => handleUpdateFacility(idx, "icon", e.target.value)}
                                >
                                  <option value="FlaskConical">🔬 Science Lab</option>
                                  <option value="Monitor">💻 ICT / Computer</option>
                                  <option value="BookOpen">📚 Library</option>
                                  <option value="Trophy">🏆 Sports & Pitch</option>
                                  <option value="ShieldCheck">🛡️ Child Safety / Security</option>
                                  <option value="Palette">🎨 Fine Arts</option>
                                  <option value="Music">🎵 Music Studio</option>
                                  <option value="Building">🏢 Auditorium</option>
                                </select>
                              </div>
                            </div>

                            <div className="mb-0">
                              <label className="form-label small fw-bold text-dark mb-1">Description:</label>
                              <textarea
                                rows={2}
                                className="form-control form-control-sm"
                                value={fac.desc || ""}
                                placeholder="High-speed networked computer workstations for coding, digital literacy, and CBT exams..."
                                onChange={(e) => handleUpdateFacility(idx, "desc", e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* TAB 6: PHOTO GALLERY */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeTab === "gallery" && (
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <h4 className="db-panel-title">
                      <i className="bi bi-images text-warning"></i> Campus Photo Gallery Showcase
                    </h4>
                    <p className="db-panel-sub">Upload real event photos, science experiments, sports competitions, and campus buildings.</p>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-outline-primary btn-sm fw-bold" onClick={handleAddGalleryPhoto}>
                      <i className="bi bi-plus-circle me-1"></i> Add Photo
                    </button>
                    <button className="db-btn-gold" onClick={handleSaveWebsiteSettings} disabled={saving}>
                      <i className="bi bi-check2"></i> Save Changes
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  {(!website.gallery || website.gallery.length === 0) ? (
                    <div className="p-4 text-center border rounded-3 bg-light">
                      <i className="bi bi-camera text-muted" style={{ fontSize: "32px" }}></i>
                      <p className="text-muted small mt-2 mb-3">No custom gallery photos uploaded yet.</p>
                      <button type="button" className="btn btn-primary btn-sm fw-bold" onClick={handleAddGalleryPhoto}>
                        + Add First Photo
                      </button>
                    </div>
                  ) : (
                    <div className="row g-3">
                      {website.gallery.map((photo: any, idx: number) => (
                        <div key={idx} className="col-12 col-md-6 col-lg-4">
                          <div className="section-item-card h-100">
                            <button
                              type="button"
                              className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 p-1 rounded-circle d-flex align-items-center justify-content-center"
                              style={{ width: 24, height: 24, zIndex: 10 }}
                              onClick={() => handleRemoveGalleryPhoto(idx)}
                              title="Remove photo"
                            >
                              ✕
                            </button>

                            <div className="mb-2 rounded-2 overflow-hidden bg-white border" style={{ height: 120 }}>
                              {photo.image || photo.image_url ? (
                                <img src={resolveMediaUrl(photo.image || photo.image_url)} alt={photo.title} className="w-100 h-100 object-fit-cover" />
                              ) : (
                                <div className="w-100 h-100 d-flex align-items-center justify-content-center text-muted small">
                                  <i className="bi bi-image me-1"></i> Enter Image URL below
                                </div>
                              )}
                            </div>

                            <div className="mb-2">
                              <label className="form-label small fw-bold text-dark mb-1">Photo Title:</label>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={photo.title || ""}
                                placeholder="e.g. Robotics & Coding Workshop"
                                onChange={(e) => handleUpdateGalleryPhoto(idx, "title", e.target.value)}
                              />
                            </div>

                            <div className="mb-2">
                              <label className="form-label small fw-bold text-dark mb-1">Category:</label>
                              <select
                                className="form-select form-select-sm"
                                value={photo.category || "Campus & Classrooms"}
                                onChange={(e) => handleUpdateGalleryPhoto(idx, "category", e.target.value)}
                              >
                                <option value="Science & ICT">Science & ICT</option>
                                <option value="Campus & Classrooms">Campus & Classrooms</option>
                                <option value="Sports & Athletics">Sports & Athletics</option>
                                <option value="Arts & Culture">Arts & Culture</option>
                                <option value="Graduation & Events">Graduation & Events</option>
                              </select>
                            </div>

                            <div className="mb-2">
                              <label className="form-label small fw-bold text-dark mb-1">Image URL / Link:</label>
                              <input
                                type="text"
                                className="form-control form-control-sm font-monospace"
                                value={photo.image || photo.image_url || ""}
                                placeholder="https://... or /uploads/..."
                                onChange={(e) => handleUpdateGalleryPhoto(idx, "image", e.target.value)}
                              />
                            </div>

                            <div className="mb-0">
                              <label className="form-label small fw-bold text-dark mb-1">Caption / Description:</label>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={photo.caption || ""}
                                placeholder="Brief description of the event..."
                                onChange={(e) => handleUpdateGalleryPhoto(idx, "caption", e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* TAB 7: PRINCIPAL'S DESK */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeTab === "principal" && (
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <h4 className="db-panel-title">
                      <i className="bi bi-person-lines-fill text-primary"></i> Principal’s Welcome Message & Portrait
                    </h4>
                    <p className="db-panel-sub">Upload the principal's official portrait and write an inspirational welcome address to prospective parents.</p>
                  </div>
                  <button className="db-btn-gold" onClick={handleSaveWebsiteSettings} disabled={saving}>
                    <i className="bi bi-check2"></i> Save Changes
                  </button>
                </div>

                <div className="p-4 row g-3">
                  <div className="col-12 col-md-3 text-center">
                    <label className="form-label fw-bold small text-dark d-block">Principal's Photo Portrait:</label>
                    <div className="mx-auto mb-2 border rounded-4 overflow-hidden bg-light d-flex align-items-center justify-content-center" style={{ width: 130, height: 160 }}>
                      {website.principal_photo ? (
                        <img src={resolveMediaUrl(website.principal_photo)} alt="Principal" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <i className="bi bi-person-bounding-box fs-1 text-muted"></i>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline-dark btn-sm fw-bold w-100"
                      onClick={() => principalPhotoInputRef.current?.click()}
                      disabled={uploadingImage === "principal_photo"}
                    >
                      {uploadingImage === "principal_photo" ? "Uploading..." : "Upload Portrait"}
                    </button>
                  </div>

                  <div className="col-12 col-md-9">
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold small text-dark">Principal / Head of School Name:</label>
                        <input
                          type="text"
                          className="form-control"
                          value={website.principal_name || ""}
                          onChange={(e) => setWebsite((p: any) => ({ ...p, principal_name: e.target.value }))}
                          placeholder="e.g. Dr. Arthur Vance, Ph.D"
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold small text-dark">Official Title:</label>
                        <input
                          type="text"
                          className="form-control"
                          value={website.principal_title || "Principal & Head of School"}
                          onChange={(e) => setWebsite((p: any) => ({ ...p, principal_title: e.target.value }))}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-bold small text-dark">Welcome Message Headline:</label>
                        <input
                          type="text"
                          className="form-control"
                          value={website.principal_welcome_title || ""}
                          onChange={(e) => setWebsite((p: any) => ({ ...p, principal_welcome_title: e.target.value }))}
                          placeholder="e.g. Building A Foundation for Lifelong Success & Moral Leadership"
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-bold small text-dark">Full Welcome Letter:</label>
                        <textarea
                          rows={5}
                          className="form-control"
                          value={website.principal_welcome_message || ""}
                          onChange={(e) => setWebsite((p: any) => ({ ...p, principal_welcome_message: e.target.value }))}
                          placeholder="At our academy, we are dedicated to academic distinction, sound discipline, and innovative skills that prepare our students to thrive globally..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* TAB 8: TESTIMONIALS & FAQS */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeTab === "testimonials_faq" && (
              <div className="d-flex flex-column gap-4">
                {/* Parent Testimonials */}
                <div className="db-panel">
                  <div className="db-panel-head">
                    <div>
                      <h4 className="db-panel-title">
                        <i className="bi bi-chat-heart text-danger"></i> Parent Reviews & Testimonials
                      </h4>
                      <p className="db-panel-sub">Add real words of appreciation from parents and guardians.</p>
                    </div>
                    <button type="button" className="btn btn-outline-primary btn-sm fw-bold" onClick={handleAddTestimonial}>
                      <i className="bi bi-plus-circle me-1"></i> Add Review
                    </button>
                  </div>
                  <div className="p-4">
                    {(!website.testimonials || website.testimonials.length === 0) ? (
                      <div className="text-center py-4 text-muted">No custom reviews added yet.</div>
                    ) : (
                      <div className="row g-3">
                        {website.testimonials.map((test: any, idx: number) => (
                          <div key={idx} className="col-12 col-md-6">
                            <div className="section-item-card">
                              <button
                                type="button"
                                className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 p-1 rounded-circle d-flex align-items-center justify-content-center"
                                style={{ width: 24, height: 24, zIndex: 10 }}
                                onClick={() => handleRemoveTestimonial(idx)}
                                title="Delete review"
                              >
                                ✕
                              </button>

                              <div className="row g-2 mb-2">
                                <div className="col-6">
                                  <label className="form-label small fw-bold text-dark mb-1">Parent Name:</label>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm fw-bold"
                                    value={test.name || ""}
                                    placeholder="e.g. Dr. A. Adebayo"
                                    onChange={(e) => handleUpdateTestimonial(idx, "name", e.target.value)}
                                  />
                                </div>
                                <div className="col-4">
                                  <label className="form-label small fw-bold text-dark mb-1">Ward / Role:</label>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={test.role || ""}
                                    placeholder="e.g. Parent (JSS 2)"
                                    onChange={(e) => handleUpdateTestimonial(idx, "role", e.target.value)}
                                  />
                                </div>
                                <div className="col-2">
                                  <label className="form-label small fw-bold text-dark mb-1">Stars:</label>
                                  <select
                                    className="form-select form-select-sm"
                                    value={test.rating || 5}
                                    onChange={(e) => handleUpdateTestimonial(idx, "rating", Number(e.target.value))}
                                  >
                                    <option value={5}>5 ★</option>
                                    <option value={4}>4 ★</option>
                                    <option value={3}>3 ★</option>
                                  </select>
                                </div>
                              </div>

                              <div className="mb-0">
                                <label className="form-label small fw-bold text-dark mb-1">Testimonial Quote:</label>
                                <textarea
                                  rows={2}
                                  className="form-control form-control-sm"
                                  value={test.content || ""}
                                  placeholder="The positive transformation in my children's confidence and academic performance has been phenomenal..."
                                  onChange={(e) => handleUpdateTestimonial(idx, "content", e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* FAQs */}
                <div className="db-panel">
                  <div className="db-panel-head">
                    <div>
                      <h4 className="db-panel-title">
                        <i className="bi bi-question-circle text-primary"></i> Frequently Asked Questions (FAQs)
                      </h4>
                      <p className="db-panel-sub">Answer common queries on admission procedure, curriculum, and school portal access.</p>
                    </div>
                    <button type="button" className="btn btn-outline-primary btn-sm fw-bold" onClick={handleAddFaq}>
                      <i className="bi bi-plus-circle me-1"></i> Add FAQ
                    </button>
                  </div>
                  <div className="p-4">
                    {(!website.faqs || website.faqs.length === 0) ? (
                      <div className="text-center py-4 text-muted">No custom FAQs added yet.</div>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {website.faqs.map((faq: any, idx: number) => (
                          <div key={idx} className="section-item-card">
                            <button
                              type="button"
                              className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 p-1 rounded-circle d-flex align-items-center justify-content-center"
                              style={{ width: 24, height: 24, zIndex: 10 }}
                              onClick={() => handleRemoveFaq(idx)}
                              title="Delete FAQ"
                            >
                              ✕
                            </button>

                            <div className="mb-2 pe-4">
                              <label className="form-label small fw-bold text-dark mb-1">Question:</label>
                              <input
                                type="text"
                                className="form-control form-control-sm fw-bold"
                                value={faq.question || ""}
                                placeholder="e.g. How can I apply for online admission?"
                                onChange={(e) => handleUpdateFaq(idx, "question", e.target.value)}
                              />
                            </div>

                            <div className="mb-0">
                              <label className="form-label small fw-bold text-dark mb-1">Answer:</label>
                              <textarea
                                rows={2}
                                className="form-control form-control-sm"
                                value={faq.answer || ""}
                                placeholder="Parents can complete the application form online directly on this website..."
                                onChange={(e) => handleUpdateFaq(idx, "answer", e.target.value)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* TAB 9: CONTACT & SOCIAL LINKS */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeTab === "contact" && (
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <h4 className="db-panel-title">
                      <i className="bi bi-telephone text-success"></i> Contact Information & Social Channels
                    </h4>
                    <p className="db-panel-sub">Make it effortless for prospective parents to contact, visit, or chat with the admissions office on WhatsApp.</p>
                  </div>
                  <button className="db-btn-gold" onClick={handleSaveWebsiteSettings} disabled={saving}>
                    <i className="bi bi-check2"></i> Save Changes
                  </button>
                </div>

                <div className="p-4 row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold small text-dark">Official Contact Phone:</label>
                    <input
                      type="text"
                      className="form-control"
                      value={website.contact_phone || ""}
                      onChange={(e) => setWebsite((p: any) => ({ ...p, contact_phone: e.target.value }))}
                      placeholder="e.g. +234 803 000 0000"
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold small text-dark">Official Admissions Email:</label>
                    <input
                      type="email"
                      className="form-control"
                      value={website.contact_email || ""}
                      onChange={(e) => setWebsite((p: any) => ({ ...p, contact_email: e.target.value }))}
                      placeholder="e.g. admissions@yourschool.edu.ng"
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-bold small text-dark">Campus Physical Address:</label>
                    <input
                      type="text"
                      className="form-control"
                      value={website.contact_address || ""}
                      onChange={(e) => setWebsite((p: any) => ({ ...p, contact_address: e.target.value }))}
                      placeholder="e.g. Plot 12, Academic Crescent, Victoria Island, Lagos State"
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-bold small text-dark">Google Maps Embed Link (Optional):</label>
                    <input
                      type="text"
                      className="form-control font-monospace small"
                      value={website.google_map_embed_url || ""}
                      onChange={(e) => setWebsite((p: any) => ({ ...p, google_map_embed_url: e.target.value }))}
                      placeholder="https://www.google.com/maps/embed?pb=..."
                    />
                  </div>

                  <hr className="my-3" />

                  <h6 className="fw-bold text-dark mb-2">Social Media Channels:</h6>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold small text-dark">Facebook Page URL:</label>
                    <input
                      type="url"
                      className="form-control"
                      value={website.facebook_url || ""}
                      onChange={(e) => setWebsite((p: any) => ({ ...p, facebook_url: e.target.value }))}
                      placeholder="https://facebook.com/yourschool"
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold small text-dark">Instagram Profile URL:</label>
                    <input
                      type="url"
                      className="form-control"
                      value={website.instagram_url || ""}
                      onChange={(e) => setWebsite((p: any) => ({ ...p, instagram_url: e.target.value }))}
                      placeholder="https://instagram.com/yourschool"
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold small text-dark">Twitter / X Profile URL:</label>
                    <input
                      type="url"
                      className="form-control"
                      value={website.twitter_url || ""}
                      onChange={(e) => setWebsite((p: any) => ({ ...p, twitter_url: e.target.value }))}
                      placeholder="https://x.com/yourschool"
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold small text-dark">YouTube Channel URL:</label>
                    <input
                      type="url"
                      className="form-control"
                      value={website.youtube_url || ""}
                      onChange={(e) => setWebsite((p: any) => ({ ...p, youtube_url: e.target.value }))}
                      placeholder="https://youtube.com/@yourschool"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* TAB 10: ADMISSION SETTINGS & APPLICATION FEE */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeTab === "admissions" && (
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <h4 className="db-panel-title">
                      <i className="bi bi-clipboard-check text-warning"></i> Online Admissions & Application Fee Configuration
                    </h4>
                    <p className="db-panel-sub">Set your school's application fee (₦), toggle portal status, and configure candidate instructions.</p>
                  </div>
                  <button className="db-btn-gold" onClick={handleSaveWebsiteSettings} disabled={saving}>
                    <i className="bi bi-check2"></i> Save Admission Settings
                  </button>
                </div>

                <div className="p-4 row g-3">
                  <div className="col-12 col-md-6">
                    <div className="form-check form-switch p-3 border rounded-3 bg-light">
                      <input
                        className="form-check-input ms-0 me-3"
                        type="checkbox"
                        id="isOpenSwitch"
                        checked={!!admissionSettings.is_open}
                        onChange={(e) => setAdmissionSettings((p: any) => ({ ...p, is_open: e.target.checked }))}
                      />
                      <label className="form-check-label fw-bold text-dark" htmlFor="isOpenSwitch">
                        Admissions Portal is Active & Accepting Candidate Applications
                      </label>
                      <div className="text-muted small mt-1">When active, the "Apply for Admission" buttons are live and active on your website.</div>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <div className="form-check form-switch p-3 border rounded-3 bg-light">
                      <input
                        className="form-check-input ms-0 me-3"
                        type="checkbox"
                        id="requirePaymentSwitch"
                        checked={!!admissionSettings.require_payment}
                        onChange={(e) => setAdmissionSettings((p: any) => ({ ...p, require_payment: e.target.checked }))}
                      />
                      <label className="form-check-label fw-bold text-dark" htmlFor="requirePaymentSwitch">
                        Require Online Application Fee Payment
                      </label>
                      <div className="text-muted small mt-1">Directly generates a dedicated Wema Bank virtual account for instant split settlement to your bank account.</div>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold small text-dark">
                      School Application Form Fee (₦): <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text fw-bold bg-white">₦</span>
                      <input
                        type="number"
                        className="form-control form-control-lg fw-bold text-primary"
                        value={admissionSettings.application_fee ?? 5000}
                        onChange={(e) => setAdmissionSettings((p: any) => ({ ...p, application_fee: Number(e.target.value) }))}
                        placeholder="5000"
                        min={0}
                      />
                    </div>
                    <span className="text-muted small">This amount is credited directly to the school's bank account upon candidate submission.</span>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold small text-dark">Admission Session Label:</label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      value={admissionSettings.admission_session_name || "2026/2027 Academic Session"}
                      onChange={(e) => setAdmissionSettings((p: any) => ({ ...p, admission_session_name: e.target.value }))}
                      placeholder="e.g. 2026/2027 Academic Session"
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-bold small text-dark">Candidate Instructions & Guidelines:</label>
                    <textarea
                      rows={4}
                      className="form-control"
                      value={admissionSettings.instructions || ""}
                      onChange={(e) => setAdmissionSettings((p: any) => ({ ...p, instructions: e.target.value }))}
                      placeholder="Explain entrance exam dates, venue, requirements, required documents, and registration instructions..."
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold small text-dark">Admissions Office Phone:</label>
                    <input
                      type="text"
                      className="form-control"
                      value={admissionSettings.contact_phone || ""}
                      onChange={(e) => setAdmissionSettings((p: any) => ({ ...p, contact_phone: e.target.value }))}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold small text-dark">Admissions Office Email:</label>
                    <input
                      type="email"
                      className="form-control"
                      value={admissionSettings.contact_email || ""}
                      onChange={(e) => setAdmissionSettings((p: any) => ({ ...p, contact_email: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* TAB 11: CUSTOM DOMAIN & DNS */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeTab === "domain" && (
              <div className="d-flex flex-column gap-4">
                {/* Active Custom Domain Showcase */}
                {domainStatus?.school?.custom_domain && (
                  <div className="db-panel" style={{ border: "2px solid #10B981" }}>
                    <div className="db-panel-head bg-success bg-opacity-10">
                      <div>
                        <div className="badge bg-success mb-1">
                          <i className="bi bi-shield-check me-1"></i> Live & Active
                        </div>
                        <h4 className="db-panel-title text-success">
                          Active School Domain: {domainStatus.school.custom_domain}
                        </h4>
                        <p className="db-panel-sub text-dark">
                          Your custom school domain is live, secured with automated Let's Encrypt SSL, and fully configured.
                        </p>
                      </div>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <a
                          href={`https://${domainStatus.school.custom_domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-success fw-bold text-white px-3"
                        >
                          <i className="bi bi-box-arrow-up-right me-1"></i> Visit Live Portal
                        </a>
                        <button
                          type="button"
                          className="btn btn-outline-danger fw-bold px-3"
                          onClick={() => setShowRemoveConfirmModal(true)}
                          disabled={removingDomain}
                        >
                          <i className="bi bi-trash3 me-1"></i> Disconnect Domain
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="row g-3">
                        <div className="col-12 col-md-4">
                          <div className="p-3 bg-light rounded-3 border">
                            <div className="small text-muted fw-bold">Primary Domain:</div>
                            <div className="fs-6 fw-bold text-dark">{domainStatus.school.custom_domain}</div>
                          </div>
                        </div>
                        <div className="col-12 col-md-4">
                          <div className="p-3 bg-light rounded-3 border">
                            <div className="small text-muted fw-bold">SSL Certificate:</div>
                            <div className="fs-6 fw-bold text-success">
                              <i className="bi bi-lock-fill me-1"></i> HTTPS Enabled (Active)
                            </div>
                          </div>
                        </div>
                        <div className="col-12 col-md-4">
                          <div className="p-3 bg-light rounded-3 border">
                            <div className="small text-muted fw-bold">Nameservers:</div>
                            <div className="small text-dark font-monospace">ns1.schoolprofit.ng, ns2.schoolprofit.ng</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Domain Orders & Provisioning Log */}
                {domainStatus?.orders && domainStatus.orders.length > 0 && (
                  <div className="db-panel">
                    <div className="db-panel-head">
                      <div>
                        <h4 className="db-panel-title">
                          <i className="bi bi-clock-history me-1 text-primary"></i> Domain Purchase & Provisioning Log
                        </h4>
                        <p className="db-panel-sub">Track real-time registrar status and renewal schedules for your domains.</p>
                      </div>
                    </div>
                    <div className="p-0 table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light small text-uppercase">
                          <tr>
                            <th className="ps-4">Domain Name</th>
                            <th>Term</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th className="pe-4 text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {domainStatus.orders.map((ord: any) => (
                            <tr key={ord.id}>
                              <td className="ps-4 fw-bold text-dark">
                                {ord.domain_name}
                                {ord.registrar_name && (
                                  <div className="text-muted small fw-normal">
                                    Registrar: <span className="badge bg-secondary bg-opacity-25 text-dark">{ord.registrar_name}</span>
                                  </div>
                                )}
                              </td>
                              <td>{ord.duration_years} Year{ord.duration_years > 1 ? "s" : ""}</td>
                              <td className="fw-bold">₦{Number(ord.amount).toLocaleString()}</td>
                              <td>
                                {ord.status === "active" && (
                                  <span className="badge bg-success">Active & Registered ✓</span>
                                )}
                                {ord.status === "provisioning_pending" && (
                                  <span className="badge bg-warning text-dark">
                                    <i className="bi bi-hourglass-split me-1"></i> Provisioning Queued
                                  </span>
                                )}
                                {ord.status === "pending_payment" && (
                                  <span className="badge bg-secondary">Pending Payment</span>
                                )}
                                {ord.status === "failed" && (
                                  <span className="badge bg-danger">Registration Failed</span>
                                )}
                              </td>
                              <td className="small text-muted">
                                {ord.created_at ? new Date(ord.created_at).toLocaleDateString() : "-"}
                              </td>
                              <td className="pe-4 text-end">
                                {ord.status === "provisioning_pending" || ord.status === "failed" ? (
                                  <button
                                    className="btn btn-warning btn-sm fw-bold"
                                    onClick={() => handleRetryProvision(ord.id)}
                                    disabled={retryingOrderId === ord.id}
                                  >
                                    {retryingOrderId === ord.id ? "Registering..." : "Retry Provision"}
                                  </button>
                                ) : (
                                  <span className="text-muted small">Managed</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="row g-4">
                  <div className="col-12 col-lg-8">
                    {/* Search & Register Card */}
                    <div className="db-panel">
                      <div className="db-panel-head">
                        <div>
                          <h4 className="db-panel-title">Search & Register a Custom Domain</h4>
                          <p className="db-panel-sub">
                            Get your official school web address (e.g. yourschool.com.ng, .sch.ng, .ng, .com) with instant Paystack checkout & automated Whogohost setup.
                          </p>
                        </div>
                        <span className="db-pill bg-light text-dark border">
                          <i className="bi bi-credit-card me-1 text-success"></i> Paystack Powered
                        </span>
                      </div>

                      <div className="p-4">
                        {domainStatus?.school?.custom_domain && (
                          <div
                            className="p-3 mb-4 rounded-3 border d-flex flex-wrap align-items-center justify-content-between gap-3"
                            style={{ background: "rgba(16, 185, 129, 0.06)", borderColor: "rgba(16, 185, 129, 0.25)" }}
                          >
                            <div className="d-flex align-items-center gap-3">
                              <div
                                style={{
                                  width: 38,
                                  height: 38,
                                  borderRadius: "50%",
                                  background: "#10B981",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#fff",
                                  fontSize: 16,
                                }}
                              >
                                <i className="bi bi-shield-check"></i>
                              </div>
                              <div>
                                <div className="small text-muted fw-bold text-uppercase" style={{ fontSize: 11 }}>
                                  Active Registered Domain
                                </div>
                                <div className="fs-6 fw-bold text-dark font-monospace">
                                  {domainStatus.school.custom_domain}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm fw-bold px-3 py-1 d-inline-flex align-items-center gap-2"
                              onClick={() => setShowRemoveConfirmModal(true)}
                              disabled={removingDomain}
                            >
                              <i className="bi bi-trash3"></i>
                              {removingDomain ? "Disconnecting..." : "Remove / Disconnect"}
                            </button>
                          </div>
                        )}

                        <form onSubmit={handleSearchDomain} className="mb-4">
                          <label className="form-label fw-bold small text-dark">
                            {domainStatus?.school?.custom_domain
                              ? "Search for another custom domain to register:"
                              : "Enter your desired school domain name:"}
                          </label>
                          <div className="input-group">
                            <span className="input-group-text bg-white"><i className="bi bi-search text-muted"></i></span>
                            <input
                              type="text"
                              className="form-control form-control-lg"
                              placeholder="e.g. kingscollege or greatacademy"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button className="btn btn-warning px-4 fw-bold" type="submit" disabled={searchingDomain}>
                              {searchingDomain ? "Checking Registrar..." : "Search Availability"}
                            </button>
                          </div>
                        </form>

                        {/* Suggestions List */}
                        {domainSuggestions.length > 0 && (
                          <div className="mt-4">
                            <h6 className="fw-bold mb-3 text-dark">Registrar Availability & Pricing:</h6>
                            <div className="d-flex flex-column gap-3">
                              {domainSuggestions.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 border rounded-3 d-flex flex-wrap align-items-center justify-content-between gap-3 bg-white shadow-sm"
                                  style={{ borderColor: item.popular ? "#D97706" : "#E2E8F0" }}
                                >
                                  <div>
                                    <div className="d-flex align-items-center gap-2">
                                      <span className="fs-5 fw-bold text-dark">{item.domain}</span>
                                      {item.popular && <span className="badge bg-warning text-dark small">Recommended</span>}
                                      {item.available ? (
                                        <span className="badge bg-success bg-opacity-10 text-success small">Available ✓</span>
                                      ) : (
                                        <span className="badge bg-danger bg-opacity-10 text-danger small">Taken / Registered</span>
                                      )}
                                    </div>
                                    <div className="text-muted small mt-1">{item.label} • Includes free automated SSL & cloud routing</div>
                                  </div>

                                  <div className="d-flex align-items-center gap-3">
                                    <div className="text-end">
                                      <div className="fs-5 fw-bold text-dark">₦{Number(item.price).toLocaleString()}</div>
                                      <div className="text-muted small">/ year</div>
                                    </div>
                                    {item.available ? (
                                      <button
                                        className="btn btn-warning fw-bold px-3 py-2"
                                        onClick={() => handlePurchaseDomain(item)}
                                        disabled={purchasingDomain === item.domain}
                                      >
                                        {purchasingDomain === item.domain ? "Initializing..." : "Buy via Paystack"}
                                      </button>
                                    ) : (
                                      <button className="btn btn-secondary btn-sm" disabled>
                                        Unavailable
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Connect Existing Custom Domain */}
                    <div className="db-panel">
                      <div className="db-panel-head">
                        <div>
                          <h4 className="db-panel-title">
                            <i className="bi bi-link-45deg me-1 text-primary"></i> Connect Existing Custom Domain
                          </h4>
                          <p className="db-panel-sub">
                            Link a domain you already registered from Whogohost, GoDaddy, Namecheap, Cloudflare, or any external registrar.
                          </p>
                        </div>
                        {activeRegisteredDomain && (
                          <span className="badge bg-success bg-opacity-10 text-success px-3 py-2 border border-success border-opacity-25">
                            <i className="bi bi-check-circle-fill me-1"></i> {domainStatus?.school?.custom_domain ? "Active & Connected" : "Configured"}
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        {/* Active Registered Domain Banner & Verification Controls */}
                        {activeRegisteredDomain && (
                          <div
                            className="p-3 mb-4 rounded-3 border"
                            style={{ background: "rgba(16, 185, 129, 0.08)", borderColor: "rgba(16, 185, 129, 0.3)" }}
                          >
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
                              <div className="d-flex align-items-center gap-3">
                                <div
                                  style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    background: "#10B981",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#fff",
                                    fontSize: 22,
                                    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                                  }}
                                >
                                  <i className="bi bi-shield-check"></i>
                                </div>
                                <div>
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="badge bg-success text-white" style={{ fontSize: 10 }}>
                                      {isPlatformPurchased ? "AUTO-CONFIGURED SCHOOL DOMAIN" : "REGISTERED SCHOOL DOMAIN"}
                                    </span>
                                    <span className="text-muted small">
                                      {isPlatformPurchased ? "Managed & Hosted by SchoolProfit" : "Configured for your school portal"}
                                    </span>
                                  </div>
                                  <div className="fs-5 fw-bold text-dark font-monospace mt-1">
                                    {activeRegisteredDomain}
                                  </div>
                                </div>
                              </div>

                              <div className="d-flex align-items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm fw-bold px-3 py-2 d-inline-flex align-items-center gap-2"
                                  onClick={handleVerifyDns}
                                  disabled={verifyingDns}
                                >
                                  {verifyingDns ? (
                                    <>
                                      <span className="spinner-border spinner-border-sm" />
                                      {isPlatformPurchased ? "Checking Auto-Routing..." : "Checking DNS..."}
                                    </>
                                  ) : (
                                    <>
                                      <i className="bi bi-arrow-repeat"></i> {isPlatformPurchased ? "Check Configuration Status" : "Verify DNS Records"}
                                    </>
                                  )}
                                </button>
                                <a
                                  href={`https://${activeRegisteredDomain}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-outline-success btn-sm fw-bold px-3 py-2"
                                >
                                  <i className="bi bi-box-arrow-up-right me-1"></i> Visit
                                </a>
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm fw-bold px-3 py-2 d-inline-flex align-items-center gap-2"
                                  onClick={() => setShowRemoveConfirmModal(true)}
                                  disabled={removingDomain}
                                >
                                  <i className="bi bi-trash3-fill"></i>
                                  {removingDomain ? "Disconnecting..." : "Remove"}
                                </button>
                              </div>
                            </div>

                            {/* Live DNS Verification Feedback */}
                            {dnsVerificationResult && (
                              <div
                                className={`p-3 rounded-3 border small ${
                                  dnsVerificationResult.verified
                                    ? "bg-success bg-opacity-10 text-success border-success border-opacity-25"
                                    : "bg-warning bg-opacity-10 text-dark border-warning border-opacity-50"
                                }`}
                              >
                                <div className="fw-bold d-flex align-items-center gap-2 mb-1">
                                  <i
                                    className={`bi ${
                                      dnsVerificationResult.verified ? "bi-check-circle-fill text-success" : "bi-exclamation-triangle-fill text-warning"
                                    } fs-6`}
                                  />
                                  {dnsVerificationResult.verified ? "DNS Propagation Confirmed!" : "DNS Propagation In Progress"}
                                </div>
                                <div>{dnsVerificationResult.message}</div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Step 1: Two Clear Setup Choices */}
                        <div className="mb-4">
                          <label className="form-label fw-bold small text-dark mb-2">
                            Select How You Want to Connect Your Domain:
                          </label>
                          <div className="row g-3">
                            <div className="col-12 col-md-6">
                              <div
                                className={`p-3 rounded-3 border h-100 cursor-pointer transition-all ${
                                  setupChoice === "subdomain"
                                    ? "border-primary bg-primary bg-opacity-10 shadow-sm"
                                    : "bg-light border-light-subtle"
                                }`}
                                style={{ cursor: "pointer", border: setupChoice === "subdomain" ? "2px solid #2563EB" : "1.5px solid #E2E8F0" }}
                                onClick={() => setSetupChoice("subdomain")}
                              >
                                <div className="d-flex align-items-start gap-3">
                                  <input
                                    type="radio"
                                    name="domainSetupChoice"
                                    className="form-check-input mt-1"
                                    checked={setupChoice === "subdomain"}
                                    onChange={() => setSetupChoice("subdomain")}
                                  />
                                  <div>
                                    <div className="fw-bold text-dark d-flex align-items-center gap-2">
                                      <i className="bi bi-browser-edge text-primary" />
                                      Choice 1: Dedicated Portal Subdomain Only
                                    </div>
                                    <span className="badge bg-primary text-white my-1" style={{ fontSize: 10 }}>
                                      RECOMMENDED FOR EXISTING WEBSITES
                                    </span>
                                    <p className="text-muted small mb-1" style={{ lineHeight: 1.4 }}>
                                      Keep your existing WordPress/Webflow website <strong>100% untouched</strong>. Connect SchoolProfit strictly for logins, student report cards, CBT, and fee payments.
                                    </p>
                                    <div className="small font-monospace text-primary fw-bold">
                                      e.g. portal.yourschool.com or app.yourschool.sch.ng
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="col-12 col-md-6">
                              <div
                                className={`p-3 rounded-3 border h-100 cursor-pointer transition-all ${
                                  setupChoice === "full_website"
                                    ? "border-primary bg-primary bg-opacity-10 shadow-sm"
                                    : "bg-light border-light-subtle"
                                }`}
                                style={{ cursor: "pointer", border: setupChoice === "full_website" ? "2px solid #2563EB" : "1.5px solid #E2E8F0" }}
                                onClick={() => setSetupChoice("full_website")}
                              >
                                <div className="d-flex align-items-start gap-3">
                                  <input
                                    type="radio"
                                    name="domainSetupChoice"
                                    className="form-check-input mt-1"
                                    checked={setupChoice === "full_website"}
                                    onChange={() => setSetupChoice("full_website")}
                                  />
                                  <div>
                                    <div className="fw-bold text-dark d-flex align-items-center gap-2">
                                      <i className="bi bi-window-fullscreen text-success" />
                                      Choice 2: Complete School Website + Portal
                                    </div>
                                    <span className="badge bg-secondary text-white my-1" style={{ fontSize: 10 }}>
                                      FULL SCHOOLPROFIT HOSTING
                                    </span>
                                    <p className="text-muted small mb-1" style={{ lineHeight: 1.4 }}>
                                      SchoolProfit powers your school's full public homepage, online admissions form, principal desk, photo gallery, <strong>AND</strong> portal.
                                    </p>
                                    <div className="small font-monospace text-success fw-bold">
                                      e.g. www.yourschool.sch.ng or yourschool.com
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Setup Fee Notice */}
                        {Number(domainStatus?.setup_fee ?? 10000) > 0 && (
                          <div
                            className="p-3 mb-3 rounded-3 border d-flex align-items-center justify-content-between flex-wrap gap-2"
                            style={{ background: "rgba(217, 119, 6, 0.07)", borderColor: "rgba(217, 119, 6, 0.25)" }}
                          >
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-credit-card-2-front text-warning fs-5" />
                              <div>
                                <span className="fw-bold text-dark small">One-Time Domain Setup & DNS Routing Fee: </span>
                                <span className="fw-bold text-primary">₦{Number(domainStatus?.setup_fee ?? 10000).toLocaleString()}</span>
                                <span className="text-muted small d-block" style={{ fontSize: 11.5 }}>
                                  One-time fee processed via Paystack. If you remove and connect another domain later, the fee applies to the new domain.
                                </span>
                              </div>
                            </div>
                            <span className="badge bg-warning text-dark fw-bold">Paystack Checkout</span>
                          </div>
                        )}

                        {/* Domain Input Form */}
                        <label className="form-label fw-bold small text-dark mb-1">
                          {setupChoice === "subdomain"
                            ? "Enter your dedicated portal subdomain:"
                            : "Enter your full school domain name:"}
                        </label>
                        <form onSubmit={handleConnectExisting} className="d-flex flex-wrap gap-2">
                          <div className="input-group" style={{ flex: "1 1 260px" }}>
                            <span className="input-group-text bg-white">
                              <i className="bi bi-globe2 text-muted"></i>
                            </span>
                            <input
                              type="text"
                              className="form-control"
                              placeholder={
                                setupChoice === "subdomain"
                                  ? "e.g. portal.yourschool.com or app.yourschool.sch.ng"
                                  : "e.g. www.yourschool.sch.ng or yourschool.com"
                              }
                              value={existingDomainInput}
                              onChange={(e) => setExistingDomainInput(e.target.value)}
                            />
                          </div>

                          <button
                            className="btn btn-primary fw-bold text-nowrap px-4"
                            type="submit"
                            disabled={connectingExisting || !existingDomainInput.trim()}
                          >
                            {connectingExisting ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" />
                                Processing...
                              </>
                            ) : Number(domainStatus?.setup_fee ?? 10000) > 0 ? (
                              `Pay ₦${Number(domainStatus?.setup_fee ?? 10000).toLocaleString()} & Connect`
                            ) : activeRegisteredDomain ? (
                              "Update Domain"
                            ) : (
                              "Connect Domain"
                            )}
                          </button>

                          {activeRegisteredDomain && (
                            <button
                              type="button"
                              className="btn btn-outline-danger fw-bold text-nowrap px-3"
                              onClick={() => setShowRemoveConfirmModal(true)}
                              disabled={removingDomain}
                            >
                              <i className="bi bi-trash3 me-1"></i> Disconnect
                            </button>
                          )}
                        </form>
                        <div className="text-muted small mt-2">
                          {setupChoice === "subdomain" ? (
                            <>Recommended: <code>portal.yourschool.com</code>, <code>app.yourschool.sch.ng</code>, or <code>portal.yourschool.edu.ng</code></>
                          ) : (
                            <>Recommended: <code>www.yourschool.sch.ng</code> or <code>yourschool.com.ng</code></>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Dynamic DNS Setup */}
                  <div className="col-12 col-lg-4">
                    {isPlatformPurchased ? (
                      <div className="db-panel border border-success border-opacity-25" style={{ background: "rgba(16, 185, 129, 0.03)" }}>
                        <div className="db-panel-head">
                          <div>
                            <h4 className="db-panel-title text-success">
                              <i className="bi bi-patch-check-fill text-success me-1"></i> Auto-Configured Domain
                            </h4>
                            <p className="db-panel-sub">Purchased on SchoolProfit — 100% automated hosting & routing.</p>
                          </div>
                        </div>
                        <div className="p-4 small">
                          <div className="alert alert-success py-2 px-3 small mb-3">
                            <i className="bi bi-check2-circle me-1 fw-bold"></i>
                            <strong>No Manual Action Required:</strong> Because this domain was purchased directly on SchoolProfit, nameservers, DNS A-records, and SSL security are automatically provisioned.
                          </div>

                          <div className="p-3 bg-white rounded-3 border mb-3 shadow-sm">
                            <div className="fw-bold text-dark mb-2">Automated Configuration Checklist:</div>
                            <div className="d-flex align-items-center gap-2 mb-2 text-success">
                              <i className="bi bi-check-circle-fill"></i>
                              <span>Payment Confirmed & Verified</span>
                            </div>
                            <div className="d-flex align-items-center gap-2 mb-2 text-success">
                              <i className="bi bi-check-circle-fill"></i>
                              <span>Nameservers Auto-Assigned</span>
                            </div>
                            <div className="d-flex align-items-center gap-2 mb-2 text-success">
                              <i className="bi bi-check-circle-fill"></i>
                              <span>Portal Route: <code>18.133.82.13</code></span>
                            </div>
                            <div className="d-flex align-items-center gap-2 text-success">
                              <i className="bi bi-shield-lock-fill"></i>
                              <span>Automated Let's Encrypt SSL</span>
                            </div>
                          </div>

                          <div className="p-3 rounded-3 border bg-white shadow-sm text-muted">
                            <div className="fw-bold text-dark small mb-1">
                              <i className="bi bi-info-circle me-1 text-primary"></i> Registry Propagation
                            </div>
                            New domains may take a few minutes for global DNS propagation across internet providers. Your school portal is automatically routed as soon as registry propagation finishes.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="db-panel">
                        <div className="db-panel-head">
                          <div>
                            <h4 className="db-panel-title">
                              <i className="bi bi-hdd-network text-primary"></i> DNS Setup Records
                            </h4>
                            <p className="db-panel-sub">Add these in your domain control panel (GoDaddy, Namecheap, cPanel).</p>
                          </div>
                        </div>
                        <div className="p-4 small">
                          {setupChoice === "subdomain" ? (
                            <>
                              <div className="alert alert-info py-2 px-3 small mb-3">
                                <strong>Zero Website Interruption:</strong> Since you are connecting a subdomain, your main website remains completely untouched!
                              </div>
                              <div className="p-3 bg-light rounded-3 border mb-3">
                                <div className="fw-bold text-primary mb-1">Required Subdomain CNAME Record:</div>
                                <div className="text-muted">Type: <span className="badge bg-dark">CNAME</span></div>
                                <div className="text-muted mt-1">
                                  Host / Name: <code>{existingDomainInput ? existingDomainInput.split(".")[0] : "portal"}</code>
                                </div>
                                <div className="text-dark fw-bold mt-1">
                                  Target / Value: <code className="text-primary">portal.schoolprofit.ng</code>
                                </div>
                                <div className="text-muted small mt-1">TTL: <code>Auto / 300s</code></div>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-muted mb-2">Configure these two records to point your entire website & portal to SchoolProfit:</p>
                              <div className="p-3 bg-light rounded-3 mb-2 border">
                                <div className="fw-bold text-dark">Record 1 (Root Domain):</div>
                                <div className="text-muted mt-1">Type: <span className="badge bg-dark">A</span></div>
                                <div className="text-muted">Host: <code>@</code></div>
                                <div className="text-dark fw-bold mt-1">Value: <code>18.133.82.13</code></div>
                              </div>
                              <div className="p-3 bg-light rounded-3 border mb-3">
                                <div className="fw-bold text-dark">Record 2 (WWW / Subdomain):</div>
                                <div className="text-muted mt-1">Type: <span className="badge bg-dark">CNAME</span></div>
                                <div className="text-muted">Host: <code>www</code></div>
                                <div className="text-dark fw-bold mt-1">Value: <code className="text-primary">portal.schoolprofit.ng</code></div>
                              </div>
                            </>
                          )}

                          <div className="p-3 rounded-3 border bg-white shadow-sm text-muted">
                            <div className="fw-bold text-dark small mb-1">
                              <i className="bi bi-clock-history me-1 text-warning"></i> Propagation Time
                            </div>
                            DNS changes typically take <strong>5 to 15 minutes</strong>. Once saved, click <strong>"Verify DNS Records"</strong> to activate.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STICKY BOTTOM SAVE BAR */}
            <div className="floating-save-bar">
              <div className="text-white d-flex align-items-center gap-3">
                <i className="bi bi-info-circle text-warning fs-5"></i>
                <div className="small">
                  <strong>Changes saved here</strong> instantly update your public school website & admission portal.
                </div>
              </div>

              <div className="d-flex gap-2">
                {previewUrl && (
                  <a href={previewUrl} target="_blank" rel="noreferrer" className="btn btn-outline-light btn-sm fw-bold">
                    <i className="bi bi-box-arrow-up-right me-1"></i> Preview
                  </a>
                )}
                <button className="btn btn-warning btn-sm fw-bold px-4" onClick={handleSaveWebsiteSettings} disabled={saving}>
                  <i className="bi bi-check2-circle me-1"></i>
                  {saving ? "Saving Changes..." : "Save Website Settings"}
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Remove Custom Domain Confirmation Modal */}
      {showRemoveConfirmModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0, 0, 0, 0.6)", zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 16, overflow: "hidden" }}>
              <div className="modal-header bg-danger text-white border-0 py-3">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2 mb-0">
                  <i className="bi bi-exclamation-triangle-fill"></i> Disconnect Custom Domain?
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowRemoveConfirmModal(false)}
                  disabled={removingDomain}
                ></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-dark mb-3 fs-6">
                  Are you sure you want to disconnect <strong>{domainStatus?.school?.custom_domain}</strong> from your school?
                </p>
                <div className="p-3 bg-light rounded-3 border small text-muted">
                  <i className="bi bi-info-circle me-1 text-primary"></i> After disconnecting, your school website and portal will instantly fallback to your free default subdomain (<code>{domainStatus?.school?.subdomain ? `${domainStatus.school.subdomain}.schoolprofit.ng` : "your default link"}</code>).
                </div>
              </div>
              <div className="modal-footer bg-light border-0 py-3 d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary fw-bold px-3"
                  onClick={() => setShowRemoveConfirmModal(false)}
                  disabled={removingDomain}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger fw-bold px-4 d-inline-flex align-items-center gap-2"
                  onClick={handleRemoveDomain}
                  disabled={removingDomain}
                >
                  {removingDomain ? (
                    <>
                      <span className="spinner-border spinner-border-sm" />
                      Disconnecting...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-trash3"></i> Yes, Disconnect Domain
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
