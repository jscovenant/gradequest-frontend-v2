import FAQ from "../features/frontend/FAQ";
import Feature from "../features/frontend/Feature";
import Footer from "../features/frontend/footer";
import Hero from "../features/frontend/Hero";
import Navbar from "../features/frontend/Navbar";
import Pricing from "../features/frontend/Pricing";
import Schools from "../features/frontend/Schools";
import Testimonials from "../features/frontend/Testimonials";
import WhySchoolProfit from "../features/frontend/WhySchoolProfit";
import BlogSection from "../features/frontend/BlogSection";
import ContactSection from "../features/frontend/ContactSection";
import SwipeUpWidget from "../features/frontend/SwipeUpWidget";
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

  // Smooth Scroll Fade-In and Fade-Out Intersection Observer
  useEffect(() => {
    if (loading) return;

    const observerOptions = {
      root: null,
      rootMargin: "0px 0px -60px 0px",
      threshold: [0.05, 0.2],
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("gq-fade-in-active");
          entry.target.classList.remove("gq-fade-out-active");
        } else {
          // If scrolled out of view, apply gentle fade-out
          if (entry.boundingClientRect.top < 0) {
            entry.target.classList.add("gq-fade-out-active");
          }
        }
      });
    }, observerOptions);

    const sections = document.querySelectorAll(".gq-section-wrap, .gq-scroll-reveal");
    sections.forEach((sec) => observer.observe(sec));

    return () => observer.disconnect();
  }, [loading]);

  if (loading) {
    return <FrontendLoader />;
  }

  return (
    <>
      <style>{`
        /* Global Fade-In / Fade-Out Animation Architecture */
        .gq-section-wrap,
        .gq-scroll-reveal {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }

        .gq-section-wrap.gq-fade-in-active,
        .gq-scroll-reveal.gq-fade-in-active {
          opacity: 1;
          transform: translateY(0);
        }

        .gq-section-wrap.gq-fade-out-active,
        .gq-scroll-reveal.gq-fade-out-active {
          opacity: 0.92;
          transform: translateY(0);
        }

        /* Initial Hero Presentation */
        .gq-hero-wrap {
          opacity: 1 !important;
          transform: none !important;
          visibility: visible !important;
          display: block;
          position: relative;
          z-index: 1;
        }

        html {
          scroll-behavior: smooth;
        }
      `}</style>

      <Navbar />
      <div className="gq-hero-wrap">
        <Hero />
      </div>
      <div className="gq-section-wrap">
        <WhySchoolProfit />
      </div>
      <div className="gq-section-wrap">
        <Feature />
      </div>
      <div className="gq-section-wrap">
        <Schools />
      </div>
      <div className="gq-section-wrap">
        <Pricing />
      </div>
      <div className="gq-section-wrap">
        <Testimonials />
      </div>
      <div className="gq-section-wrap">
        <BlogSection />
      </div>
      <div className="gq-section-wrap">
        <FAQ />
      </div>
      <div className="gq-section-wrap">
        <ContactSection />
      </div>
      <Footer />

      {/* Interactive Swipe Up / Back to Top Widget */}
      <SwipeUpWidget />
    </>
  );
}
