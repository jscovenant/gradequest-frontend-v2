import FAQ from "../features/frontend/FAQ";
import Feature from "../features/frontend/Feature";
import Footer from "../features/frontend/footer";
import Hero from "../features/frontend/Hero";
import Navbar from "../features/frontend/Navbar";
import Schools from "../features/frontend/Schools";
import Testimonials from "../features/frontend/Testimonials";
import WhySchoolProfit from "../features/frontend/WhySchoolProfit";
import SchoolProfitCalculator from "../features/frontend/SchoolProfitCalculator";
import BlogSection from "../features/frontend/BlogSection";
import ContactSection from "../features/frontend/ContactSection";
import SwipeUpWidget from "../features/frontend/SwipeUpWidget";
import AiSalesChatWidget from "../components/AiSalesChatWidget";
import { useEffect, useState } from "react";
import FrontendLoader from "../components/ui/FrontendLoader";

export default function HomePage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading (API, assets, etc.)
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  // Smooth 1-shot Scroll Reveal Observer
  useEffect(() => {
    if (loading) return;

    const observerOptions = {
      root: null,
      rootMargin: "0px 0px -40px 0px",
      threshold: 0.08,
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("sp-revealed");
          obs.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const sections = document.querySelectorAll(".sp-section-wrap");
    sections.forEach((sec) => observer.observe(sec));

    return () => observer.disconnect();
  }, [loading]);

  if (loading) {
    return <FrontendLoader />;
  }

  return (
    <div className="sp-landing-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        :root {
          --sp-navy: #0A192F;
          --sp-navy-surface: #0F2744;
          --sp-gold: #D97706;
          --sp-gold-light: #F59E0B;
          --sp-emerald: #059669;
          --sp-blue: #1D4ED8;
          --sp-bg-light: #F8FAFC;
          --sp-text: #0F172A;
          --sp-text-muted: #64748B;
          --sp-border: rgba(15, 39, 68, 0.08);
          --sp-radius-md: 16px;
          --sp-radius-lg: 24px;
        }

        .sp-landing-root {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: var(--sp-text);
          background-color: #FFFFFF;
          overflow-x: hidden;
          width: 100%;
        }

        /* Clean Progressive Reveal */
        .sp-section-wrap {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }

        .sp-section-wrap.sp-revealed {
          opacity: 1;
          transform: translateY(0);
        }

        html {
          scroll-behavior: smooth;
        }
      `}</style>

      <Navbar />
      <Hero />
      <div className="sp-section-wrap">
        <WhySchoolProfit />
      </div>
      <div className="sp-section-wrap">
        <SchoolProfitCalculator />
      </div>
      <div className="sp-section-wrap">
        <Feature />
      </div>
      <div className="sp-section-wrap">
        <Schools />
      </div>
            <div className="sp-section-wrap">
        <Testimonials />
      </div>
      <div className="sp-section-wrap">
        <BlogSection />
      </div>
      <div className="sp-section-wrap">
        <FAQ />
      </div>
      <div className="sp-section-wrap">
        <ContactSection />
      </div>
      <Footer />

      {/* AI Growth Consultant Floating Chat Widget */}
      <AiSalesChatWidget />

      {/* Interactive Swipe Up / Back to Top Widget */}
      <SwipeUpWidget />
    </div>
  );
}
