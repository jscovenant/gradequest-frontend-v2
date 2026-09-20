import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { publicApi } from "../utils/axios";
import { isCustomPortalHost } from "../utils/portal";

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

// Universal Bootstrap Icon Resolver (Maps Lucide/Backend Icon keys to valid Bootstrap Icons)
const resolveBootstrapIcon = (icon?: string, fallback: string = "bi-building"): string => {
  if (!icon) return fallback;
  const trimmed = icon.trim();
  if (trimmed.startsWith("bi-")) return trimmed;
  if (trimmed.startsWith("bi ")) return trimmed.replace(/^bi\s+/, "");

  const iconMap: Record<string, string> = {
    // Science & Lab
    FlaskConical: "bi-flask",
    flaskconical: "bi-flask",
    Flask: "bi-flask",
    flask: "bi-flask",
    Microscope: "bi-search",
    microscope: "bi-search",
    Atom: "bi-radioactive",

    // Tech & IT
    Monitor: "bi-laptop",
    monitor: "bi-laptop",
    Laptop: "bi-laptop",
    laptop: "bi-laptop",
    Computer: "bi-pc-display",
    computer: "bi-pc-display",
    Display: "bi-display",
    display: "bi-display",
    Cpu: "bi-cpu",
    cpu: "bi-cpu",
    Code: "bi-code-slash",
    code: "bi-code-slash",

    // Library & Books
    BookOpen: "bi-book",
    bookopen: "bi-book",
    "book-open": "bi-book",
    Book: "bi-book",
    book: "bi-book",
    journals: "bi-journals",
    Journals: "bi-journals",
    Library: "bi-collection",
    library: "bi-collection",

    // Sports & Awards
    Trophy: "bi-trophy",
    trophy: "bi-trophy",
    Medal: "bi-award",
    medal: "bi-award",
    Award: "bi-award",
    award: "bi-award",
    Activity: "bi-activity",
    activity: "bi-activity",

    // Arts & Creative
    Palette: "bi-palette",
    palette: "bi-palette",
    Music: "bi-music-note-beamed",
    music: "bi-music-note-beamed",
    Brush: "bi-brush",
    brush: "bi-brush",

    // Health & Safety
    HeartPulse: "bi-heart-pulse",
    heartpulse: "bi-heart-pulse",
    "heart-pulse": "bi-heart-pulse",
    ShieldCheck: "bi-shield-check",
    shieldcheck: "bi-shield-check",
    "shield-check": "bi-shield-check",
    Hospital: "bi-hospital",
    hospital: "bi-hospital",

    // Campus & Buildings
    House: "bi-house-check",
    house: "bi-house-check",
    "house-check": "bi-house-check",
    Building: "bi-building",
    building: "bi-building",
    Home: "bi-house",
    home: "bi-house",

    // Education & People
    GraduationCap: "bi-mortarboard",
    graduationcap: "bi-mortarboard",
    Mortarboard: "bi-mortarboard",
    mortarboard: "bi-mortarboard",
    Users: "bi-people",
    users: "bi-people",
    UserCheck: "bi-person-check",
    "user-check": "bi-person-check",

    // Others
    Calculator: "bi-calculator",
    calculator: "bi-calculator",
    EmojiSmile: "bi-emoji-smile",
    emojismile: "bi-emoji-smile",
    Smile: "bi-emoji-smile",
    smile: "bi-emoji-smile",
    Compass: "bi-compass",
    compass: "bi-compass",
    Eye: "bi-eye",
    eye: "bi-eye",
    BookmarkStar: "bi-bookmark-star",
    bookmarkstar: "bi-bookmark-star",
    Star: "bi-star-fill",
    star: "bi-star-fill",
    Clock: "bi-clock",
    clock: "bi-clock",
    Phone: "bi-telephone",
    phone: "bi-telephone",
    Envelope: "bi-envelope",
    envelope: "bi-envelope",
    CheckCircle: "bi-check-circle",
    checkcircle: "bi-check-circle",
    Check: "bi-check2",
    check: "bi-check2",
    Bus: "bi-bus-front",
    bus: "bi-bus-front",
    Camera: "bi-camera",
    camera: "bi-camera",
    Image: "bi-image",
    image: "bi-image",
    Images: "bi-images",
    images: "bi-images",
    Chat: "bi-chat-dots",
    chat: "bi-chat-dots",
    ChatSquareText: "bi-chat-square-text",
    Sparkles: "bi-stars",
    sparkles: "bi-stars",
    Stars: "bi-stars",
    stars: "bi-stars",
    Globe: "bi-globe",
    globe: "bi-globe",
  };

  if (iconMap[trimmed]) return iconMap[trimmed];
  const lower = trimmed.toLowerCase();
  if (iconMap[lower]) return iconMap[lower];

  // Fallback: convert CamelCase to kebab-case
  const kebab = trimmed.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  return `bi-${kebab}`;
};

// Default high-quality campus photography showcase
const DEFAULT_GALLERY = [
  {
    id: 1,
    title: "Ultra-Modern Science & Discovery Lab",
    category: "Science & ICT",
    image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1000&q=80",
    caption: "Students engaged in hands-on Chemistry and Physics practical experiments.",
  },
  {
    id: 2,
    title: "Digital ICT & Robotics Center",
    category: "Science & ICT",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=80",
    caption: "Networked CBT workstations and software programming suites.",
  },
  {
    id: 3,
    title: "Interactive Smart Classroom",
    category: "Campus & Classrooms",
    image: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1000&q=80",
    caption: "Air-conditioned classrooms with multimedia interactive digital displays.",
  },
  {
    id: 4,
    title: "Annual Inter-House Sports Champions",
    category: "Sports & Athletics",
    image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1000&q=80",
    caption: "Track and field events promoting teamwork, fitness, and school spirit.",
  },
  {
    id: 5,
    title: "Academic Research & Resource Library",
    category: "Campus & Classrooms",
    image: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1000&q=80",
    caption: "Thousands of curriculum texts, journals, and digital research archives.",
  },
  {
    id: 6,
    title: "Creative Arts & Cultural Day Exhibition",
    category: "Arts & Culture",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1000&q=80",
    caption: "Celebrating cultural heritage, instrumental music, drama, and fine arts.",
  },
  {
    id: 7,
    title: "Graduation & Valedictory Ceremony",
    category: "Graduation & Events",
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1000&q=80",
    caption: "Celebrating academic milestones and sending forth future global leaders.",
  },
  {
    id: 8,
    title: "Early Years Montessori Learning Studio",
    category: "Campus & Classrooms",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1000&q=80",
    caption: "Sensory learning materials nurturing curiosity in our youngest scholars.",
  },
];

export default function PublicSchoolWebsitePage() {
  const { slugOrId } = useParams<{ slugOrId?: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [logoLoaded, setLogoLoaded] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Gallery Filter & Lightbox
  const [galleryFilter, setGalleryFilter] = useState("All");
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchSchoolWebsiteData();
  }, [slugOrId]);

  // Scroll-triggered IntersectionObserver for smooth fade-in / reveal animations
  useEffect(() => {
    if (loading || error || !data) return;

    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("sp-visible");
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.08,
      rootMargin: "0px 0px -30px 0px",
    });

    const revealElements = document.querySelectorAll(
      ".sp-reveal, .sp-reveal-up, .sp-reveal-left, .sp-reveal-right, .sp-reveal-scale"
    );
    revealElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [loading, error, data, galleryFilter]);

  const fetchSchoolWebsiteData = async () => {
    setLoading(true);
    setError("");
    try {
      const identifier = slugOrId || "current";
      const res = await publicApi.get(`/public/school/${identifier}`);
      if (res.data.status) {
        setData(res.data);
      } else {
        setError("School website not found.");
      }
    } catch (err: any) {
      console.error("Error loading school website:", err);
      setError("Unable to load school profile. Please check the web address.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: "#0A192F" }}>
        <div className="text-center p-4">
          <div className="spinner-border text-warning mb-3" role="status" style={{ width: "3.5rem", height: "3.5rem" }}></div>
          <h4 className="fw-bold text-white mb-2">Connecting to School Portal...</h4>
          <p className="text-white-50 small mb-0">Loading verified campus profile, academic programs & admissions</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-4">
        <div className="card border-0 shadow-lg rounded-4 p-5 text-center" style={{ maxWidth: 460 }}>
          <div className="display-4 text-warning mb-3">
            <i className="bi bi-exclamation-triangle-fill"></i>
          </div>
          <h4 className="fw-bold text-dark mb-2">School Portal Not Found</h4>
          <p className="text-muted small mb-4">{error || "This custom school web address is not active yet."}</p>
          <Link to="/login" className="btn btn-primary fw-bold px-4 py-2 rounded-pill">
            <i className="bi bi-door-open me-2"></i> Return to Portal Login
          </Link>
        </div>
      </div>
    );
  }

  const { school, website, admission } = data;
  const primaryColor = website.theme_color_primary || "#0F2744";
  const secondaryColor = website.theme_color_secondary || "#D97706";
  const accentColor = website.theme_color_accent || "#2563EB";
  const fontFamily = website.font_family || "Plus Jakarta Sans";

  const schoolLogo = resolveMediaUrl(school.logo_url || school.logo);
  const heroBgImage = resolveMediaUrl(website.hero_image);
  const principalPhoto = resolveMediaUrl(website.principal_photo);
  const admissionUrl = `/school/${school.id}/admission`;
  const portalLoginUrl = isCustomPortalHost()
    ? "/auth/login"
    : `/school/${school.subdomain || school.id}/login`;

  // Programs
  const programsList = website.programs?.length > 0 ? website.programs : [
    {
      name: "Early Years & Crèche",
      age_range: "Ages 18 Months – 5 Years",
      desc: "Montessori-inspired foundation building sensory awareness, phonics mastery, numeracy, and social collaboration.",
      badge: "Early Foundation",
      icon: "bi-emoji-smile",
    },
    {
      name: "Primary Basic Education",
      age_range: "Grades 1 – 6 (Ages 5 – 11)",
      desc: "Comprehensive standard curriculum cultivating deep mathematics, science discovery, languages, moral character, and critical thinking.",
      badge: "Basic School",
      icon: "bi-book-half",
    },
    {
      name: "Junior Secondary School (JSS 1-3)",
      age_range: "Ages 11 – 14",
      desc: "Strong academic grounding in sciences, humanities, vocational skills, and preparatory BECE / NECO distinction.",
      badge: "Junior High",
      icon: "bi-calculator",
    },
    {
      name: "Senior Secondary School (SSS 1-3)",
      age_range: "Ages 14 – 17",
      desc: "Specialized Science, Arts & Commercial streams with rigorous preparation for WAEC, NECO, and JAMB UTME excellence.",
      badge: "Senior High",
      icon: "bi-award",
    },
  ];

  // Facilities
  const facilitiesList = website.facilities?.length > 0 ? website.facilities : [
    { title: "Standard Science Laboratories", desc: "Fully equipped Physics, Chemistry, and Biology practical laboratories.", icon: "bi-flask" },
    { title: "Ultra-Modern ICT & CBT Center", desc: "High-speed networked computer workstations for coding, digital literacy, and online CBT exams.", icon: "bi-laptop" },
    { title: "Academic Research Library", desc: "Extensive physical volumes and e-library access for independent study.", icon: "bi-journals" },
    { title: "Sports Complex & Pitch", desc: "Standard football field, basketball court, athletics track, and indoor games arena.", icon: "bi-trophy" },
    { title: "Creative Music & Arts Studio", desc: "Dedicated studios for instrumental music, cultural dance, painting, and public speaking.", icon: "bi-palette" },
    { title: "Smart Air-Conditioned Classrooms", desc: "Ergonomic furniture with digital interactive screens and ambient lighting.", icon: "bi-display" },
    { title: "Standard Infirmary & Clinic", desc: "24/7 registered nurse care ensuring comprehensive student health and safety.", icon: "bi-heart-pulse" },
    { title: "Comfortable Boarding Hostels", desc: "Safe, disciplined, and home-away-from-home residential facilities with dedicated house parents.", icon: "bi-house-check" },
  ];

  // Testimonials
  const testimonialsList = website.testimonials?.length > 0 ? website.testimonials : [
    {
      name: "Dr. O. Adebayo",
      role: "Parent (JSS 2 & SS 1 Scholars)",
      content: "The academic rigor and moral discipline instilled in our children at this academy has been exemplary. The online portal allows us to view live attendance and broadsheets effortlessly.",
      rating: 5,
    },
    {
      name: "Mrs. N. Okonkwo",
      role: "Parent (Primary 5)",
      content: "The teachers are dedicated, patient, and knowledgeable. My daughter's reading fluency and mathematical problem-solving skyrocketed within two terms.",
      rating: 5,
    },
    {
      name: "Engr. T. Danjuma",
      role: "Alumni Parent & PTA Executive",
      content: "An outstanding institution with world-class ICT facilities. The seamless CBT examination system prepares students for university and international standards.",
      rating: 5,
    },
  ];

  // FAQs
  const faqsList = website.faqs?.length > 0 ? website.faqs : [
    {
      question: "How do I apply for online student admission?",
      answer: "Click 'Apply for Admission' anywhere on this page to access our native digital application form. Complete the 4-step wizard, upload documents, pay the entrance fee via bank transfer or card, and instantly print your entrance examination pass.",
    },
    {
      question: "How can parents and students access their dashboard?",
      answer: "Click 'Portal Login' at the top of the website. Parents receive their secure login credentials upon admission to track daily attendance, term results, continuous assessment scores, and pay school fees.",
    },
    {
      question: "What curriculum does the school offer?",
      answer: "We offer a rich blended curriculum integrating the Nigerian National Curriculum with modern STEAM learning, coding/robotics, and British international standards.",
    },
    {
      question: "Does the school provide school bus transportation?",
      answer: "Yes, we operate a fleet of modern, air-conditioned, GPS-tracked school buses covering key residential routes across the city.",
    },
    {
      question: "Are boarding facilities available?",
      answer: "Yes, we provide modern, well-supervised male and female boarding hostels with round-the-clock security, nutritious meal plans, and supervised prep study hours.",
    },
  ];

  // Gallery items (Custom or Curated Defaults)
  const galleryItems = (website.gallery && website.gallery.length > 0) ? website.gallery : DEFAULT_GALLERY;

  // Filtered gallery
  const filteredGallery = galleryFilter === "All"
    ? galleryItems
    : galleryItems.filter((item: any) => (item.category || "").toLowerCase() === galleryFilter.toLowerCase() || (item.category || "").includes(galleryFilter));

  const galleryCategories = ["All", "Science & ICT", "Campus & Classrooms", "Sports & Athletics", "Arts & Culture", "Graduation & Events"];

  return (
    <div style={{ fontFamily: `${fontFamily}, system-ui, -apple-system, sans-serif`, color: "#1E293B", backgroundColor: "#F8FAFC", overflowX: "hidden" }}>
      <style>{`
        :root {
          --sp-primary: ${primaryColor};
          --sp-secondary: ${secondaryColor};
          --sp-accent: ${accentColor};
        }

        /* Scroll-triggered Fade-In & Reveal Animations */
        .sp-reveal, .sp-reveal-up {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }

        .sp-reveal-left {
          opacity: 0;
          transform: translateX(-36px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }

        .sp-reveal-right {
          opacity: 0;
          transform: translateX(36px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }

        .sp-reveal-scale {
          opacity: 0;
          transform: scale(0.92);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }

        .sp-visible {
          opacity: 1 !important;
          transform: translate(0, 0) scale(1) !important;
        }

        /* Staggered transition delays for grid cards */
        .sp-delay-1 { transition-delay: 0.08s; }
        .sp-delay-2 { transition-delay: 0.16s; }
        .sp-delay-3 { transition-delay: 0.24s; }
        .sp-delay-4 { transition-delay: 0.32s; }
        .sp-delay-5 { transition-delay: 0.40s; }
        .sp-delay-6 { transition-delay: 0.48s; }
        .sp-delay-7 { transition-delay: 0.56s; }
        .sp-delay-8 { transition-delay: 0.64s; }

        /* Floating and pulsing animations */
        @keyframes spFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes spPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }

        .sp-float { animation: spFloat 4s ease-in-out infinite; }
        .sp-pulse { animation: spPulse 2.5s ease-in-out infinite; }

        /* Hero Entrance Keyframes */
        @keyframes spHeroFade {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .sp-hero-fade {
          animation: spHeroFade 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Typography & Headings */
        .sp-heading-gradient {
          background: linear-gradient(135deg, #FFFFFF 0%, #FBBF24 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* Buttons */
        .sp-btn-gold {
          background: linear-gradient(135deg, var(--sp-secondary) 0%, #B45309 100%);
          color: #FFFFFF !important;
          font-weight: 700;
          font-size: 14px;
          border: none;
          padding: 12px 28px;
          border-radius: 50px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 16px rgba(217, 119, 6, 0.35);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }
        .sp-btn-gold:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 10px 28px rgba(217, 119, 6, 0.50);
          color: #FFFFFF !important;
          filter: brightness(1.08);
        }

        .sp-btn-outline-white {
          border: 1.5px solid rgba(255, 255, 255, 0.6);
          color: #FFFFFF !important;
          font-weight: 700;
          font-size: 14px;
          padding: 11px 24px;
          border-radius: 50px;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(8px);
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }
        .sp-btn-outline-white:hover {
          background: #FFFFFF;
          color: var(--sp-primary) !important;
          transform: translateY(-3px);
          box-shadow: 0 8px 22px rgba(0, 0, 0, 0.20);
        }

        /* Hero Wrapper */
        .sp-hero-section {
          position: relative;
          background: ${heroBgImage ? `linear-gradient(135deg, rgba(10, 25, 47, 0.92) 0%, rgba(15, 39, 68, 0.94) 100%), url('${heroBgImage}') center/cover no-repeat` : `linear-gradient(135deg, ${primaryColor} 0%, #0A192F 100%)`};
          color: #FFFFFF;
          overflow: hidden;
          padding-top: 52px;
          padding-bottom: 96px;
        }
        .sp-hero-mesh {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 80% 20%, rgba(217, 119, 6, 0.18) 0%, transparent 50%),
                      radial-gradient(circle at 20% 80%, rgba(37, 99, 235, 0.15) 0%, transparent 50%);
          pointer-events: none;
        }

        /* Glassmorphism Card */
        .sp-glass-card {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 24px;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.30);
          transition: transform 0.4s ease, box-shadow 0.4s ease;
        }
        .sp-glass-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 28px 56px rgba(0, 0, 0, 0.38);
        }

        /* Section Styling */
        .sp-section {
          padding: 84px 0;
          position: relative;
        }
        .sp-section-light { background: #FFFFFF; }
        .sp-section-muted { background: #F8FAFC; }
        .sp-section-dark { background: #0A192F; color: #FFFFFF; }

        .sp-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11.5px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 6px 14px;
          border-radius: 100px;
          margin-bottom: 14px;
        }

        /* Cards & Hover Effects */
        .sp-card-interactive {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 20px;
          padding: 30px 26px;
          height: 100%;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.35s ease;
          box-shadow: 0 4px 16px rgba(15, 39, 68, 0.04);
          position: relative;
          overflow: hidden;
        }
        .sp-card-interactive:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(15, 39, 68, 0.11);
          border-color: var(--sp-secondary);
        }

        /* Facility Icon Box */
        .sp-icon-box {
          width: 58px;
          height: 58px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: rgba(15, 39, 68, 0.08);
          color: var(--sp-primary);
          transition: transform 0.3s ease, background-color 0.3s ease, color 0.3s ease;
        }
        .sp-card-interactive:hover .sp-icon-box {
          transform: scale(1.1) rotate(4deg);
          background: var(--sp-secondary);
          color: #FFFFFF;
        }

        /* Gallery Grid & Hover Zoom */
        .sp-gallery-card {
          position: relative;
          border-radius: 18px;
          overflow: hidden;
          background: #000;
          cursor: pointer;
          aspect-ratio: 4 / 3;
          box-shadow: 0 6px 20px rgba(15, 39, 68, 0.08);
          transition: transform 0.35s ease, box-shadow 0.35s ease;
        }
        .sp-gallery-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 36px rgba(15, 39, 68, 0.18);
        }
        .sp-gallery-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sp-gallery-card:hover .sp-gallery-img {
          transform: scale(1.10);
        }
        .sp-gallery-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(10, 25, 47, 0.92) 0%, rgba(10, 25, 47, 0.25) 60%, transparent 100%);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 20px;
          opacity: 0;
          transition: opacity 0.35s ease;
        }
        .sp-gallery-card:hover .sp-gallery-overlay {
          opacity: 1;
        }

        /* Category Filter Tabs */
        .sp-filter-btn {
          padding: 8px 18px;
          font-size: 13px;
          font-weight: 700;
          border-radius: 100px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          color: #64748B;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sp-filter-btn.active {
          background: var(--sp-primary);
          color: #FFFFFF;
          border-color: var(--sp-primary);
          box-shadow: 0 4px 14px rgba(15, 39, 68, 0.22);
          transform: scale(1.04);
        }
        .sp-filter-btn:hover:not(.active) {
          background: #F1F5F9;
          color: #0F2744;
          transform: translateY(-1px);
        }

        /* Principal Portrait Frame */
        .sp-principal-frame {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 24px 48px rgba(15, 39, 68, 0.16);
          border: 4px solid #FFFFFF;
          transition: transform 0.4s ease;
        }
        .sp-principal-frame:hover {
          transform: scale(1.02);
        }

        /* FAQ Card */
        .sp-faq-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 20px 24px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sp-faq-card:hover {
          transform: translateX(4px);
          border-color: #CBD5E1;
        }
        .sp-faq-card.active {
          border-color: var(--sp-secondary);
          background: #FFFDF8;
          box-shadow: 0 8px 22px rgba(217, 119, 6, 0.10);
        }

        @media (max-width: 991.98px) {
          .sp-section { padding: 54px 0; }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* 1. SUPER TOP ANNOUNCEMENT & CONTACT BAR */}
      {/* ========================================================================= */}
      <div className="py-2 px-3 text-white small" style={{ backgroundColor: "#06101E", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
        <div className="container d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="d-flex align-items-center gap-3 gap-md-4">
            <a href={`tel:${school.phone || "+2348000000000"}`} className="text-white-50 text-decoration-none d-flex align-items-center gap-1.5 hover-text-white">
              <i className="bi bi-telephone-fill text-warning"></i>
              <span>{school.phone || "+234 800 000 0000"}</span>
            </a>
            <a href={`mailto:${school.email || "info@school.edu.ng"}`} className="text-white-50 text-decoration-none d-none d-sm-flex align-items-center gap-1.5 hover-text-white">
              <i className="bi bi-envelope-fill text-warning"></i>
              <span>{school.email || "admissions@school.edu.ng"}</span>
            </a>
            <span className="d-none d-lg-inline text-white-50">
              <i className="bi bi-geo-alt-fill text-warning me-1"></i> {school.address || "Nigeria"}
            </span>
          </div>

          <div className="d-flex align-items-center gap-2">
            {admission.is_open && (
              <span className="badge rounded-pill bg-warning text-dark fw-bold px-2.5 py-1 font-monospace" style={{ fontSize: "11px" }}>
                <i className="bi bi-stars me-1"></i> {admission.session_name || "2026/2027 Admissions Open"}
              </span>
            )}
            <Link to={portalLoginUrl} className="btn btn-sm btn-outline-light rounded-pill py-0.5 px-2.5 d-flex align-items-center gap-1" style={{ fontSize: "11.5px" }}>
              <i className="bi bi-lock-fill text-warning"></i> Portal Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STICKY BRANDED NAVIGATION BAR (ICONS REMOVED FROM NAV LINKS) */}
      {/* ========================================================================= */}
      <nav className="navbar navbar-expand-lg sticky-top shadow-sm py-2.5" style={{ backgroundColor: primaryColor, backdropFilter: "blur(12px)", zIndex: 1030 }}>
        <div className="container">
          {/* Logo & Brand */}
          <Link to={`/school/${school.id}`} className="navbar-brand d-flex align-items-center gap-2.5 text-white text-decoration-none">
            {schoolLogo && logoLoaded ? (
              <img
                src={schoolLogo}
                alt={school.name}
                onError={() => setLogoLoaded(false)}
                className="rounded-3 bg-white p-1 shadow-sm"
                style={{ height: 46, width: 46, objectFit: "contain" }}
              />
            ) : (
              <div
                className="rounded-3 fw-extrabold d-flex align-items-center justify-content-center shadow-sm"
                style={{ width: 46, height: 46, backgroundColor: secondaryColor, color: "#FFFFFF", fontSize: 20 }}
              >
                {school.name?.[0] || "S"}
              </div>
            )}
            <div>
              <div className="fw-extrabold fs-5 lh-1 text-white">{website.site_title || school.name}</div>
              <small className="opacity-75 d-block text-white-50 mt-1" style={{ fontSize: "11px", letterSpacing: "0.02em" }}>
                {website.tagline || "Knowledge, Character & Leadership"}
              </small>
            </div>
          </Link>

          {/* Mobile Toggler */}
          <button
            className="navbar-toggler border-0 text-white p-2"
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation"
          >
            <i className={`bi ${mobileMenuOpen ? "bi-x-lg" : "bi-list"} fs-3 text-white`}></i>
          </button>

          {/* Nav Links - Clean without icons */}
          <div className={`collapse navbar-collapse ${mobileMenuOpen ? "show pt-3" : ""}`} id="schoolNavbar">
            <ul className="navbar-nav mx-auto mb-2 mb-lg-0 gap-lg-2">
              <li className="nav-item">
                <a className="nav-link text-white fw-semibold px-2" href="#about" onClick={() => setMobileMenuOpen(false)}>
                  About
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link text-white fw-semibold px-2" href="#principal" onClick={() => setMobileMenuOpen(false)}>
                  Leadership
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link text-white fw-semibold px-2" href="#academics" onClick={() => setMobileMenuOpen(false)}>
                  Academics
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link text-white fw-semibold px-2" href="#gallery" onClick={() => setMobileMenuOpen(false)}>
                  Photo Gallery
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link text-white fw-semibold px-2" href="#facilities" onClick={() => setMobileMenuOpen(false)}>
                  Facilities
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link text-white fw-semibold px-2" href="#admissions" onClick={() => setMobileMenuOpen(false)}>
                  Admissions
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link text-white fw-semibold px-2" href="#contact" onClick={() => setMobileMenuOpen(false)}>
                  Contact
                </a>
              </li>
            </ul>

            <div className="d-flex align-items-center gap-2 mt-3 mt-lg-0">
              {admission.is_open && (
                <Link to={admissionUrl} className="sp-btn-gold py-2 px-3.5" onClick={() => setMobileMenuOpen(false)}>
                  Apply Online
                </Link>
              )}
              <Link to={portalLoginUrl} className="btn btn-outline-light rounded-pill fw-bold py-2 px-3 small" onClick={() => setMobileMenuOpen(false)}>
                Portal Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 3. HERO SECTION WITH LAYERED DEPTH & GRAPHICS */}
      {/* ========================================================================= */}
      <section className="sp-hero-section">
        <div className="sp-hero-mesh"></div>
        <div className="container position-relative" style={{ zIndex: 2 }}>
          <div className="row align-items-center g-5">
            {/* Left Hero Content */}
            <div className="col-12 col-lg-7 sp-hero-fade">
              {website.hero_badge && (
                <div className="sp-badge-pill" style={{ background: "rgba(217, 119, 6, 0.22)", border: "1px solid rgba(217, 119, 6, 0.40)", color: "#FBBF24" }}>
                  <span className="rounded-circle bg-warning sp-pulse" style={{ width: 7, height: 7, display: "inline-block" }} />
                  {website.hero_badge}
                </div>
              )}

              <h1 className="display-4 fw-extrabold text-white mb-3 lh-sm">
                {website.hero_title || `Empowering Future Leaders at ${school.name}`}
              </h1>

              <p className="lead text-white-50 mb-4" style={{ fontSize: "1.1rem", lineHeight: 1.7, maxWidth: 620 }}>
                {website.hero_subtitle || "Delivering world-class academic distinction, disciplined moral character, and hands-on digital skills preparing our students to lead and thrive globally."}
              </p>

              <div className="d-flex flex-wrap gap-3 mb-5">
                {admission.is_open && (
                  <Link to={admissionUrl} className="sp-btn-gold">
                    <i className="bi bi-check2-circle fs-5"></i>
                    {website.hero_cta_text || "Apply for Admission"}
                  </Link>
                )}
                <a href="#gallery" className="sp-btn-outline-white">
                  <i className="bi bi-camera-fill fs-5"></i>
                  Explore Campus Tour
                </a>
                <Link to={portalLoginUrl} className="sp-btn-outline-white d-none d-sm-inline-flex">
                  <i className="bi bi-mortarboard fs-5"></i>
                  Portal Sign In
                </Link>
              </div>

              {/* 4 Quick Stat Pills */}
              <div className="row g-2 g-sm-3">
                <div className="col-6 col-sm-3">
                  <div className="p-3 rounded-4 bg-white bg-opacity-10 border border-white border-opacity-10 text-center">
                    <div className="fs-4 fw-extrabold text-warning">100%</div>
                    <div className="text-white-50" style={{ fontSize: "11px" }}>Exam Success</div>
                  </div>
                </div>
                <div className="col-6 col-sm-3">
                  <div className="p-3 rounded-4 bg-white bg-opacity-10 border border-white border-opacity-10 text-center">
                    <div className="fs-4 fw-extrabold text-warning">15 : 1</div>
                    <div className="text-white-50" style={{ fontSize: "11px" }}>Student Ratio</div>
                  </div>
                </div>
                <div className="col-6 col-sm-3">
                  <div className="p-3 rounded-4 bg-white bg-opacity-10 border border-white border-opacity-10 text-center">
                    <div className="fs-4 fw-extrabold text-warning">STEAM</div>
                    <div className="text-white-50" style={{ fontSize: "11px" }}>Robotics Labs</div>
                  </div>
                </div>
                <div className="col-6 col-sm-3">
                  <div className="p-3 rounded-4 bg-white bg-opacity-10 border border-white border-opacity-10 text-center">
                    <div className="fs-4 fw-extrabold text-warning">24 / 7</div>
                    <div className="text-white-50" style={{ fontSize: "11px" }}>Campus Security</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Hero Card / Accreditation Seal */}
            <div className="col-12 col-lg-5 position-relative text-center sp-hero-fade" style={{ animationDelay: "0.2s" }}>
              <div className="sp-glass-card p-4 p-sm-5 text-start position-relative">
                <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom border-white border-opacity-20">
                  {schoolLogo && logoLoaded ? (
                    <img
                      src={schoolLogo}
                      alt="Logo"
                      className="rounded-3 bg-white p-1"
                      style={{ width: 56, height: 56, objectFit: "contain" }}
                      onError={() => setLogoLoaded(false)}
                    />
                  ) : (
                    <div className="rounded-3 bg-warning text-dark fw-bold d-flex align-items-center justify-content-center" style={{ width: 56, height: 56, fontSize: 26 }}>
                      {school.name?.[0] || "S"}
                    </div>
                  )}
                  <div>
                    <h5 className="fw-bold text-white mb-0">{school.name}</h5>
                    <span className="badge bg-success bg-opacity-25 text-success small mt-1">
                      <i className="bi bi-patch-check-fill me-1"></i> Accredited Institution
                    </span>
                  </div>
                </div>

                {/* Hero Feature Badges with Guaranteed Visible Icons */}
                <div className="d-flex flex-column gap-3 text-white-50 small mb-4">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                      style={{
                        width: 38,
                        height: 38,
                        minWidth: 38,
                        minHeight: 38,
                        flexShrink: 0,
                        backgroundColor: "rgba(245, 158, 11, 0.22)",
                        color: "#FBBF24",
                        border: "1px solid rgba(245, 158, 11, 0.35)",
                      }}
                    >
                      <i className="bi bi-mortarboard-fill fs-5" style={{ display: "inline-block", lineHeight: 1 }}></i>
                    </div>
                    <div className="text-white fw-medium">Holistic Academic & Moral Formation</div>
                  </div>

                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                      style={{
                        width: 38,
                        height: 38,
                        minWidth: 38,
                        minHeight: 38,
                        flexShrink: 0,
                        backgroundColor: "rgba(245, 158, 11, 0.22)",
                        color: "#FBBF24",
                        border: "1px solid rgba(245, 158, 11, 0.35)",
                      }}
                    >
                      <i className="bi bi-laptop fs-5" style={{ display: "inline-block", lineHeight: 1 }}></i>
                    </div>
                    <div className="text-white fw-medium">CBT Examination & Digital Learning Suites</div>
                  </div>

                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                      style={{
                        width: 38,
                        height: 38,
                        minWidth: 38,
                        minHeight: 38,
                        flexShrink: 0,
                        backgroundColor: "rgba(245, 158, 11, 0.22)",
                        color: "#FBBF24",
                        border: "1px solid rgba(245, 158, 11, 0.35)",
                      }}
                    >
                      <i className="bi bi-shield-check fs-5" style={{ display: "inline-block", lineHeight: 1 }}></i>
                    </div>
                    <div className="text-white fw-medium">Strict Child Safety & Secure Campus Environment</div>
                  </div>
                </div>

                <Link to={admissionUrl} className="btn btn-warning w-100 fw-bold py-2.5 rounded-pill shadow d-flex align-items-center justify-content-center gap-2">
                  <i className="bi bi-file-earmark-plus"></i> Apply for {(admission.session_name || "2026/2027 Session")}
                </Link>
              </div>

              {/* Floating SVG Badges */}
              <div className="position-absolute top-0 start-0 translate-middle sp-float d-none d-md-block">
                <div className="rounded-circle p-3 shadow-lg" style={{ background: "linear-gradient(135deg, #D97706, #F59E0B)", color: "#fff" }}>
                  <i className="bi bi-trophy-fill fs-4"></i>
                </div>
              </div>
              <div className="position-absolute bottom-0 end-0 translate-middle-x sp-float d-none d-md-block" style={{ animationDelay: "2s" }}>
                <div className="rounded-circle p-3 shadow-lg" style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)", color: "#fff" }}>
                  <i className="bi bi-stars fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Curved Wave Divider */}
        <div className="position-absolute bottom-0 start-0 w-100 overflow-hidden" style={{ lineHeight: 0, zIndex: 1 }}>
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ position: "relative", display: "block", width: "calc(100% + 1.3px)", height: "46px" }}>
            <path d="M0,0 C150,90 350,-40 500,45 C650,130 900,10 1200,40 L1200,120 L0,120 Z" fill="#F8FAFC"></path>
          </svg>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. PILLARS OF EXCELLENCE (LAYER 1) */}
      {/* ========================================================================= */}
      <section id="about" className="sp-section sp-section-muted">
        <div className="container">
          <div className="text-center mx-auto mb-5 sp-reveal-up" style={{ maxWidth: 680 }}>
            <div className="sp-badge-pill" style={{ background: "rgba(15, 39, 68, 0.08)", color: primaryColor }}>
              <i className="bi bi-gem me-1"></i> Core Institutional Foundation
            </div>
            <h2 className="fw-extrabold text-dark display-6">
              Why Parents Choose <span className="text-primary">{school.name}</span>
            </h2>
            <p className="text-muted">
              {website.about_content || "Dedicated educators, individualized mentoring, modern technology, and a proven track record of producing top scorers and responsible citizens."}
            </p>
          </div>

          <div className="row g-4">
            <div className="col-12 col-md-6 col-lg-3 sp-reveal-up sp-delay-1">
              <div className="sp-card-interactive">
                <div className="rounded-3 p-3 d-inline-flex mb-3" style={{ background: "rgba(37, 99, 235, 0.12)", color: "#2563EB" }}>
                  <i className="bi bi-mortarboard fs-3"></i>
                </div>
                <h5 className="fw-bold text-dark mb-2">Academic Mastery</h5>
                <p className="text-muted small mb-0" style={{ lineHeight: 1.6 }}>
                  Blended Nigerian and British curriculum with focus on critical inquiry, mathematics, and science distinctions.
                </p>
              </div>
            </div>

            <div className="col-12 col-md-6 col-lg-3 sp-reveal-up sp-delay-2">
              <div className="sp-card-interactive">
                <div className="rounded-3 p-3 d-inline-flex mb-3" style={{ background: "rgba(217, 119, 6, 0.12)", color: "#D97706" }}>
                  <i className="bi bi-cpu fs-3"></i>
                </div>
                <h5 className="fw-bold text-dark mb-2">STEAM & Digital CBT</h5>
                <p className="text-muted small mb-0" style={{ lineHeight: 1.6 }}>
                  Hands-on coding, computer science labs, robotics club, and state-of-the-art CBT exam readiness.
                </p>
              </div>
            </div>

            <div className="col-12 col-md-6 col-lg-3 sp-reveal-up sp-delay-3">
              <div className="sp-card-interactive">
                <div className="rounded-3 p-3 d-inline-flex mb-3" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#059669" }}>
                  <i className="bi bi-heart-pulse fs-3"></i>
                </div>
                <h5 className="fw-bold text-dark mb-2">Moral & Pastoral Care</h5>
                <p className="text-muted small mb-0" style={{ lineHeight: 1.6 }}>
                  Disciplined character molding, integrity, peer collaboration, and strong ethical values.
                </p>
              </div>
            </div>

            <div className="col-12 col-md-6 col-lg-3 sp-reveal-up sp-delay-4">
              <div className="sp-card-interactive">
                <div className="rounded-3 p-3 d-inline-flex mb-3" style={{ background: "rgba(147, 51, 234, 0.12)", color: "#9333EA" }}>
                  <i className="bi bi-trophy fs-3"></i>
                </div>
                <h5 className="fw-bold text-dark mb-2">Sports & Co-Curricular</h5>
                <p className="text-muted small mb-0" style={{ lineHeight: 1.6 }}>
                  Football, track, chess, debate society, music ensembles, and inter-school academic championships.
                </p>
              </div>
            </div>
          </div>

          {/* Mission, Vision & Motto Strip */}
          <div className="mt-5 p-4 p-md-5 rounded-4 bg-white border shadow-sm sp-reveal-up sp-delay-3">
            <div className="row g-4 align-items-center">
              <div className="col-12 col-md-4 border-md-end">
                <div className="d-flex align-items-center gap-2 mb-2 text-warning fw-bold">
                  <i className="bi bi-compass-fill fs-5"></i>
                  <span>OUR MISSION</span>
                </div>
                <p className="text-muted small mb-0" style={{ lineHeight: 1.6 }}>
                  {website.mission || "To deliver high-impact education through modern pedagogies, ethical values, and digital technology that empowers every student."}
                </p>
              </div>

              <div className="col-12 col-md-4 border-md-end">
                <div className="d-flex align-items-center gap-2 mb-2 text-primary fw-bold">
                  <i className="bi bi-eye-fill fs-5"></i>
                  <span>OUR VISION</span>
                </div>
                <p className="text-muted small mb-0" style={{ lineHeight: 1.6 }}>
                  {website.vision || "To be a premier learning institution raising globally competitive leaders of integrity, competence, and compassion."}
                </p>
              </div>

              <div className="col-12 col-md-4">
                <div className="d-flex align-items-center gap-2 mb-2 text-success fw-bold">
                  <i className="bi bi-bookmark-star-fill fs-5"></i>
                  <span>SCHOOL MOTTO</span>
                </div>
                <h6 className="fw-bold text-dark mb-0 fst-italic">
                  "{website.motto || "Excellence in Knowledge and Character"}"
                </h6>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. PRINCIPAL'S WELCOME DESK (LAYER 2) */}
      {/* ========================================================================= */}
      <section id="principal" className="sp-section sp-section-light border-top">
        <div className="container">
          <div className="row align-items-center g-5">
            {/* Principal Photo */}
            <div className="col-12 col-lg-5 text-center sp-reveal-left">
              <div className="sp-principal-frame mx-auto" style={{ maxWidth: 360, height: 430 }}>
                {principalPhoto ? (
                  <img src={principalPhoto} alt={website.principal_name || "The Principal"} className="w-100 h-100 object-fit-cover" />
                ) : (
                  <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-white" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #0F2744 100%)` }}>
                    {schoolLogo && logoLoaded ? (
                      <img src={schoolLogo} alt="Emblem" style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 16 }} />
                    ) : (
                      <i className="bi bi-mortarboard-fill display-2 text-warning mb-3"></i>
                    )}
                    <h5 className="fw-bold text-white mb-1">{website.principal_name || "Principal's Desk"}</h5>
                    <small className="text-warning">{website.principal_title || "Head of School"}</small>
                  </div>
                )}
              </div>
            </div>

            {/* Principal Message Content */}
            <div className="col-12 col-lg-7 sp-reveal-right">
              <div className="sp-badge-pill" style={{ background: "rgba(15, 39, 68, 0.08)", color: primaryColor }}>
                <i className="bi bi-quote fs-6"></i> Leadership Message
              </div>
              <h2 className="fw-extrabold text-dark mb-3 display-6">
                {website.principal_welcome_title || `Welcome to ${school.name}`}
              </h2>
              <p className="text-muted lead mb-4" style={{ fontSize: "1.05rem", lineHeight: 1.8 }}>
                {website.principal_welcome_message || "At our school, we believe every child is endowed with unique gifts waiting to be unlocked. Through innovative teaching methodologies, disciplined values, and holistic extracurricular growth, our dedicated educators mentor every learner into a confident leader ready for higher education and global impact."}
              </p>

              <div className="d-flex align-items-center gap-3 pt-3 border-top mt-4">
                <div>
                  <h5 className="fw-bold text-dark mb-0">{website.principal_name || "The Principal"}</h5>
                  <small className="text-muted">{website.principal_title || "Principal & Head of School"}</small>
                </div>
                <div className="ms-auto">
                  <span className="badge bg-light text-dark border px-3 py-2">
                    <i className="bi bi-patch-check-fill text-primary me-1"></i> Verified Office
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. ACADEMIC PROGRAMS & CURRICULUM (LAYER 3) */}
      {/* ========================================================================= */}
      <section id="academics" className="sp-section sp-section-muted border-top">
        <div className="container">
          <div className="text-center mx-auto mb-5 sp-reveal-up" style={{ maxWidth: 680 }}>
            <div className="sp-badge-pill" style={{ background: "rgba(37, 99, 235, 0.10)", color: accentColor }}>
              <i className="bi bi-mortarboard me-1"></i> Educational Streams
            </div>
            <h2 className="fw-extrabold text-dark display-6">Academic Programs</h2>
            <p className="text-muted">Structured learning pathways designed for intellectual curiosity, foundational mastery, and examination distinction.</p>
          </div>

          <div className="row g-4">
            {programsList.map((prog: any, idx: number) => (
              <div key={idx} className={`col-12 col-md-6 col-lg-3 sp-reveal-up sp-delay-${(idx % 4) + 1}`}>
                <div className="sp-card-interactive d-flex flex-column">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <span className="badge bg-warning bg-opacity-15 text-dark fw-bold px-3 py-1.5 rounded-pill font-monospace" style={{ fontSize: "11px" }}>
                      {prog.badge || "Academic"}
                    </span>
                    <i className={`bi ${resolveBootstrapIcon(prog.icon, "bi-book")} text-primary fs-4`}></i>
                  </div>
                  <h5 className="fw-bold text-dark mb-1">{prog.name || prog.title}</h5>
                  <div className="text-primary small fw-bold mb-3">
                    <i className="bi bi-person-check me-1"></i> {prog.age_range || "All Grades"}
                  </div>
                  <p className="text-muted small flex-grow-1" style={{ lineHeight: 1.65 }}>
                    {prog.desc || prog.description}
                  </p>
                  <Link to={admissionUrl} className="text-decoration-none fw-bold small mt-3 text-primary d-inline-flex align-items-center gap-1.5">
                    <span>Apply for this Level</span>
                    <i className="bi bi-arrow-right"></i>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. PHOTO GALLERY & CAMPUS TOUR (LAYER 4) */}
      {/* ========================================================================= */}
      <section id="gallery" className="sp-section sp-section-light border-top">
        <div className="container">
          <div className="text-center mx-auto mb-4 sp-reveal-up" style={{ maxWidth: 680 }}>
            <div className="sp-badge-pill" style={{ background: "rgba(217, 119, 6, 0.12)", color: secondaryColor }}>
              <i className="bi bi-camera-fill me-1"></i> Campus Life & Facilities
            </div>
            <h2 className="fw-extrabold text-dark display-6">Photo Gallery & Campus Tour</h2>
            <p className="text-muted">Explore vibrant student life, state-of-the-art laboratories, sports events, and modern learning spaces.</p>
          </div>

          {/* Category Filter Pills */}
          <div className="d-flex justify-content-center flex-wrap gap-2 mb-5 sp-reveal-up sp-delay-1">
            {galleryCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`sp-filter-btn ${galleryFilter === cat ? "active" : ""}`}
                onClick={() => setGalleryFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Gallery Masonry Grid */}
          <div className="row g-3 g-md-4">
            {filteredGallery.map((item: any, idx: number) => (
              <div key={idx} className={`col-12 col-sm-6 col-lg-3 sp-reveal-scale sp-delay-${(idx % 4) + 1}`}>
                <div className="sp-gallery-card" onClick={() => setActiveLightboxIndex(idx)}>
                  <img src={resolveMediaUrl(item.image || item.image_url)} alt={item.title} className="sp-gallery-img" />
                  <div className="sp-gallery-overlay">
                    <span className="badge bg-warning text-dark fw-bold align-self-start mb-2 px-2.5 py-1" style={{ fontSize: "10px" }}>
                      {item.category || "Campus"}
                    </span>
                    <h6 className="fw-bold text-white mb-1" style={{ fontSize: "14px" }}>{item.title}</h6>
                    <small className="text-white-50 text-truncate">{item.caption || "Click to expand image"}</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      {activeLightboxIndex !== null && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ background: "rgba(10, 25, 47, 0.94)", backdropFilter: "blur(12px)", zIndex: 1080 }}
          onClick={() => setActiveLightboxIndex(null)}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content bg-transparent border-0 text-white">
              <div className="d-flex justify-content-between align-items-center p-3">
                <span className="badge bg-warning text-dark fw-bold px-3 py-1 font-monospace">
                  {filteredGallery[activeLightboxIndex]?.category || "Campus Photo"} ({activeLightboxIndex + 1} of {filteredGallery.length})
                </span>
                <button
                  type="button"
                  className="btn btn-close btn-close-white"
                  onClick={() => setActiveLightboxIndex(null)}
                ></button>
              </div>

              <div className="modal-body p-0 position-relative text-center">
                <img
                  src={resolveMediaUrl(filteredGallery[activeLightboxIndex]?.image || filteredGallery[activeLightboxIndex]?.image_url)}
                  alt={filteredGallery[activeLightboxIndex]?.title}
                  className="img-fluid rounded-4 shadow-2xl"
                  style={{ maxHeight: "70vh", objectFit: "contain" }}
                />

                {/* Left/Right Navigation */}
                {filteredGallery.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="btn btn-dark rounded-circle position-absolute top-50 start-0 translate-middle-y ms-2 opacity-75 hover-opacity-100"
                      style={{ width: 44, height: 44 }}
                      onClick={() => setActiveLightboxIndex((prev) => (prev! > 0 ? prev! - 1 : filteredGallery.length - 1))}
                    >
                      <i className="bi bi-chevron-left fs-5"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-dark rounded-circle position-absolute top-50 end-0 translate-middle-y me-2 opacity-75 hover-opacity-100"
                      style={{ width: 44, height: 44 }}
                      onClick={() => setActiveLightboxIndex((prev) => (prev! < filteredGallery.length - 1 ? prev! + 1 : 0))}
                    >
                      <i className="bi bi-chevron-right fs-5"></i>
                    </button>
                  </>
                )}
              </div>

              <div className="p-3 text-center">
                <h5 className="fw-bold mb-1">{filteredGallery[activeLightboxIndex]?.title}</h5>
                <p className="text-white-50 small mb-0">{filteredGallery[activeLightboxIndex]?.caption}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. CAMPUS FACILITIES & INFRASTRUCTURE (LAYER 5) */}
      {/* ========================================================================= */}
      <section id="facilities" className="sp-section sp-section-muted border-top">
        <div className="container">
          <div className="text-center mx-auto mb-5 sp-reveal-up" style={{ maxWidth: 680 }}>
            <div className="sp-badge-pill" style={{ background: "rgba(15, 39, 68, 0.08)", color: primaryColor }}>
              <i className="bi bi-building me-1"></i> Infrastructure & Environment
            </div>
            <h2 className="fw-extrabold text-dark display-6">State-of-the-Art Facilities</h2>
            <p className="text-muted">Purpose-built physical and digital infrastructure inspiring creativity, experimentation, and wellness.</p>
          </div>

          <div className="row g-4">
            {facilitiesList.map((fac: any, idx: number) => {
              const iconClass = resolveBootstrapIcon(fac.icon, "bi-building");
              return (
                <div key={idx} className={`col-12 col-md-6 col-lg-3 sp-reveal-up sp-delay-${(idx % 4) + 1}`}>
                  <div className="sp-card-interactive">
                    <div className="sp-icon-box mb-3">
                      <i className={`bi ${iconClass} fs-3`}></i>
                    </div>
                    <h5 className="fw-bold text-dark mb-2">{fac.title}</h5>
                    <p className="text-muted small mb-0" style={{ lineHeight: 1.65 }}>{fac.desc || fac.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. TESTIMONIALS & PARENT VOICES (LAYER 6) */}
      {/* ========================================================================= */}
      <section className="sp-section sp-section-light border-top">
        <div className="container">
          <div className="text-center mx-auto mb-5 sp-reveal-up" style={{ maxWidth: 680 }}>
            <div className="sp-badge-pill" style={{ background: "rgba(217, 119, 6, 0.12)", color: secondaryColor }}>
              <i className="bi bi-chat-heart-fill me-1"></i> Parent & Alumni Reviews
            </div>
            <h2 className="fw-extrabold text-dark display-6">Voices of Our Community</h2>
            <p className="text-muted">Read genuine feedback from parents who entrust us with their children's formative education.</p>
          </div>

          <div className="row g-4">
            {testimonialsList.map((t: any, idx: number) => (
              <div key={idx} className={`col-12 col-lg-4 sp-reveal-up sp-delay-${(idx % 3) + 1}`}>
                <div className="sp-card-interactive d-flex flex-column">
                  <div className="d-flex text-warning mb-3">
                    {[...Array(t.rating || 5)].map((_, i) => (
                      <i key={i} className="bi bi-star-fill me-1" style={{ fontSize: "14px" }}></i>
                    ))}
                  </div>
                  <p className="text-muted fst-italic mb-4 flex-grow-1" style={{ lineHeight: 1.7, fontSize: "14.5px" }}>
                    "{t.content}"
                  </p>
                  <div className="d-flex align-items-center gap-3 pt-3 border-top">
                    <div className="rounded-circle bg-primary bg-opacity-10 text-primary fw-bold d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, fontSize: "16px" }}>
                      {t.name?.[0] || "P"}
                    </div>
                    <div>
                      <h6 className="fw-bold text-dark mb-0">{t.name}</h6>
                      <small className="text-muted">{t.role || "Verified Parent"}</small>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. ADMISSIONS ROADMAP & CTA BANNER (LAYER 7) */}
      {/* ========================================================================= */}
      {admission.is_open && (
        <section id="admissions" className="sp-section sp-section-dark">
          <div className="container">
            <div className="text-center mx-auto mb-5 sp-reveal-up" style={{ maxWidth: 700 }}>
              <span className="badge rounded-pill bg-warning text-dark fw-bold px-3 py-2 mb-3">
                <i className="bi bi-stars me-1"></i> 4-STEP ADMISSION PROCESS
              </span>
              <h2 className="display-6 fw-extrabold text-white mb-3">
                Join Our Next Academic Cohort
              </h2>
              <p className="lead text-white-50" style={{ fontSize: "1.05rem" }}>
                Enrolling your child is quick, transparent, and completely digital.
              </p>
            </div>

            {/* 4 Step Roadmap */}
            <div className="row g-4 mb-5">
              <div className="col-6 col-md-3 sp-reveal-up sp-delay-1">
                <div className="p-4 rounded-4 bg-white bg-opacity-10 border border-white border-opacity-10 text-center h-100">
                  <div className="rounded-circle bg-warning text-dark fw-bold d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 40, height: 40 }}>
                    1
                  </div>
                  <h6 className="fw-bold text-white mb-1">Apply Online</h6>
                  <small className="text-white-50">Fill student & guardian details in 10 mins.</small>
                </div>
              </div>
              <div className="col-6 col-md-3 sp-reveal-up sp-delay-2">
                <div className="p-4 rounded-4 bg-white bg-opacity-10 border border-white border-opacity-10 text-center h-100">
                  <div className="rounded-circle bg-warning text-dark fw-bold d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 40, height: 40 }}>
                    2
                  </div>
                  <h6 className="fw-bold text-white mb-1">Instant Payment</h6>
                  <small className="text-white-50">Direct Wema Bank transfer or card verification.</small>
                </div>
              </div>
              <div className="col-6 col-md-3 sp-reveal-up sp-delay-3">
                <div className="p-4 rounded-4 bg-white bg-opacity-10 border border-white border-opacity-10 text-center h-100">
                  <div className="rounded-circle bg-warning text-dark fw-bold d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 40, height: 40 }}>
                    3
                  </div>
                  <h6 className="fw-bold text-white mb-1">Entrance Assessment</h6>
                  <small className="text-white-50">Computer-based testing and interview.</small>
                </div>
              </div>
              <div className="col-6 col-md-3 sp-reveal-up sp-delay-4">
                <div className="p-4 rounded-4 bg-white bg-opacity-10 border border-white border-opacity-10 text-center h-100">
                  <div className="rounded-circle bg-warning text-dark fw-bold d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 40, height: 40 }}>
                    4
                  </div>
                  <h6 className="fw-bold text-white mb-1">Enrollment Letter</h6>
                  <small className="text-white-50">Print admission slip & portal access.</small>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-center gap-3 flex-wrap text-center sp-reveal-up sp-delay-2">
              <Link to={admissionUrl} className="sp-btn-gold py-3 px-5 fs-6">
                <i className="bi bi-file-earmark-text fs-5"></i> Start Online Application Now
              </Link>
              <Link to="/admissions/status" className="sp-btn-outline-white py-3 px-4 fs-6">
                <i className="bi bi-search fs-5"></i> Check Application Status
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 11. FAQS ACCORDION (LAYER 8) */}
      {/* ========================================================================= */}
      <section id="faqs" className="sp-section sp-section-light border-top">
        <div className="container" style={{ maxWidth: 840 }}>
          <div className="text-center mb-5 sp-reveal-up">
            <div className="sp-badge-pill" style={{ background: "rgba(15, 39, 68, 0.08)", color: primaryColor }}>
              <i className="bi bi-question-circle me-1"></i> Questions & Answers
            </div>
            <h2 className="fw-extrabold text-dark display-6">Frequently Asked Questions</h2>
            <p className="text-muted">Clear answers to common questions regarding admissions, academics, and school life.</p>
          </div>

          <div className="d-flex flex-column gap-3">
            {faqsList.map((faq: any, idx: number) => (
              <div
                key={idx}
                className={`sp-faq-card sp-reveal-up sp-delay-${(idx % 4) + 1} ${activeFaq === idx ? "active" : ""}`}
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                    <i className="bi bi-patch-question text-warning"></i>
                    <span>{faq.question}</span>
                  </h6>
                  <i className={`bi ${activeFaq === idx ? "bi-chevron-up text-warning" : "bi-chevron-down text-muted"}`}></i>
                </div>
                {activeFaq === idx && (
                  <p className="text-muted small mt-3 mb-0 pt-2 border-top" style={{ lineHeight: 1.75 }}>
                    {faq.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 12. CONTACT & LOCATION INFO (LAYER 9) */}
      {/* ========================================================================= */}
      <section id="contact" className="sp-section sp-section-muted border-top">
        <div className="container">
          <div className="row g-4 align-items-center">
            <div className="col-12 col-lg-5 sp-reveal-left">
              <div className="sp-badge-pill" style={{ background: "rgba(15, 39, 68, 0.08)", color: primaryColor }}>
                <i className="bi bi-envelope-paper me-1"></i> Get In Touch
              </div>
              <h2 className="fw-extrabold text-dark mb-3 display-6">
                Visit Our Campus or Contact Us
              </h2>
              <p className="text-muted mb-4" style={{ lineHeight: 1.7 }}>
                Our admissions officers and academic counselors are available to answer your questions and guide you through enrollment.
              </p>

              <div className="d-flex flex-column gap-3 mb-4">
                <div className="d-flex align-items-start gap-3">
                  <div className="rounded-circle bg-primary bg-opacity-10 text-primary p-2.5 d-flex align-items-center justify-content-center" style={{ width: 42, height: 42 }}>
                    <i className="bi bi-geo-alt-fill fs-5"></i>
                  </div>
                  <div>
                    <h6 className="fw-bold text-dark mb-0">Campus Location</h6>
                    <small className="text-muted">{school.address || "Main Campus, Nigeria"}</small>
                  </div>
                </div>

                <div className="d-flex align-items-start gap-3">
                  <div className="rounded-circle bg-primary bg-opacity-10 text-primary p-2.5 d-flex align-items-center justify-content-center" style={{ width: 42, height: 42 }}>
                    <i className="bi bi-telephone-fill fs-5"></i>
                  </div>
                  <div>
                    <h6 className="fw-bold text-dark mb-0">Admissions Hotline</h6>
                    <small className="text-muted">{school.phone || "+234 800 000 0000"}</small>
                  </div>
                </div>

                <div className="d-flex align-items-start gap-3">
                  <div className="rounded-circle bg-primary bg-opacity-10 text-primary p-2.5 d-flex align-items-center justify-content-center" style={{ width: 42, height: 42 }}>
                    <i className="bi bi-clock-fill fs-5"></i>
                  </div>
                  <div>
                    <h6 className="fw-bold text-dark mb-0">Visiting & Office Hours</h6>
                    <small className="text-muted">Monday – Friday: 7:30 AM – 4:30 PM</small>
                  </div>
                </div>
              </div>

              <a
                href={`https://wa.me/${(school.phone || "+2348000000000").replace(/[^0-9]/g, "")}?text=Hello%20${encodeURIComponent(school.name)},%20I%20would%20like%20to%20inquire%20about%20admissions.`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-success fw-bold py-2.5 px-4 rounded-pill shadow-sm d-inline-flex align-items-center gap-2"
              >
                <i className="bi bi-whatsapp fs-5"></i> Chat With Admissions on WhatsApp
              </a>
            </div>

            <div className="col-12 col-lg-7 sp-reveal-right">
              <div className="p-4 p-md-5 rounded-4 bg-white border shadow-sm">
                <h5 className="fw-bold text-dark mb-1">Send an Official Inquiry</h5>
                <p className="text-muted small mb-4">Our admissions desk responds to all messages within 24 hours.</p>

                <form onSubmit={(e) => { e.preventDefault(); alert("Thank you! Your inquiry has been received. Our admissions team will contact you shortly."); }}>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold text-dark">Your Name *</label>
                      <input type="text" required className="form-control" placeholder="Parent / Guardian Name" />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold text-dark">Phone Number *</label>
                      <input type="tel" required className="form-control" placeholder="0801 234 5678" />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold text-dark">Email Address</label>
                      <input type="email" className="form-control" placeholder="parent@example.com" />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold text-dark">Interested Level</label>
                      <select className="form-select">
                        <option value="nursery">Early Years / Nursery</option>
                        <option value="primary">Primary Basic School</option>
                        <option value="jss">Junior Secondary (JSS)</option>
                        <option value="sss">Senior Secondary (SSS)</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-bold text-dark">Your Message / Question *</label>
                      <textarea rows={3} required className="form-control" placeholder="How can we assist you with admissions or school tours?"></textarea>
                    </div>
                    <div className="col-12">
                      <button type="submit" className="btn btn-primary fw-bold py-2.5 px-4 rounded-pill w-100">
                        <i className="bi bi-send-fill me-1"></i> Submit Message
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 13. MODERN ACADEMIC FOOTER */}
      {/* ========================================================================= */}
      <footer className="text-white pt-5 pb-4 sp-reveal-up" style={{ backgroundColor: "#06101E", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
        <div className="container">
          <div className="row g-4 mb-5">
            <div className="col-12 col-md-4">
              <div className="d-flex align-items-center gap-3 mb-3">
                {schoolLogo && logoLoaded ? (
                  <img
                    src={schoolLogo}
                    alt="Logo"
                    className="rounded-3 bg-white p-1"
                    style={{ width: 48, height: 48, objectFit: "contain" }}
                    onError={() => setLogoLoaded(false)}
                  />
                ) : (
                  <div className="rounded-3 bg-warning text-dark fw-bold d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
                    {school.name?.[0] || "S"}
                  </div>
                )}
                <h5 className="fw-bold text-white mb-0">{school.name}</h5>
              </div>
              <p className="text-white-50 small mb-3" style={{ lineHeight: 1.7 }}>
                {website.about_content || "Excellence in holistic academic education, digital innovation, and moral character formation."}
              </p>
              <div className="small text-white-50">
                <div><i className="bi bi-geo-alt-fill text-warning me-2"></i> {school.address || "Nigeria"}</div>
                <div className="mt-1"><i className="bi bi-telephone-fill text-warning me-2"></i> {school.phone || "+234 800 000 0000"}</div>
              </div>
            </div>

            <div className="col-6 col-md-2">
              <h6 className="fw-bold text-white mb-3">Quick Links</h6>
              <ul className="list-unstyled small d-flex flex-column gap-2 text-white-50">
                <li><a href="#about" className="text-white-50 text-decoration-none">About Us</a></li>
                <li><a href="#principal" className="text-white-50 text-decoration-none">Principal's Desk</a></li>
                <li><a href="#academics" className="text-white-50 text-decoration-none">Academics</a></li>
                <li><a href="#gallery" className="text-white-50 text-decoration-none">Photo Gallery</a></li>
                <li><a href="#facilities" className="text-white-50 text-decoration-none">Facilities</a></li>
              </ul>
            </div>

            <div className="col-6 col-md-3">
              <h6 className="fw-bold text-white mb-3">Portal Services</h6>
              <ul className="list-unstyled small d-flex flex-column gap-2 text-white-50">
                <li><Link to={admissionUrl} className="text-white-50 text-decoration-none">Apply for Admission</Link></li>
                <li><Link to="/admissions/status" className="text-white-50 text-decoration-none">Admission Status Checker</Link></li>
                <li><Link to={portalLoginUrl} className="text-white-50 text-decoration-none">Student & Parent Portal</Link></li>
                <li><Link to="/check-result" className="text-white-50 text-decoration-none">Term Result Checker</Link></li>
              </ul>
            </div>

            <div className="col-12 col-md-3">
              <h6 className="fw-bold text-white mb-3">Accreditation & Trust</h6>
              <p className="text-white-50 small mb-3">
                Government-approved institution upholding national education excellence and continuous digital learning.
              </p>
              <span className="badge bg-white bg-opacity-10 text-white border border-white border-opacity-10 py-2 px-3">
                <i className="bi bi-shield-check text-success me-1"></i> HTTPS SSL Encrypted Portal
              </span>
            </div>
          </div>

          <div className="border-top border-white border-opacity-10 pt-4 d-flex flex-column flex-md-row justify-content-between align-items-center gap-2 small text-white-50">
            <div>© {new Date().getFullYear()} {school.name}. All rights reserved.</div>
            <div>Powered by <a href="https://schoolprofit.ng" className="text-warning text-decoration-none fw-bold">SchoolProfit.ng</a></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
