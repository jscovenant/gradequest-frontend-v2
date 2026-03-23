
import FAQ from "../features/frontend/FAQ";
import Feature from "../features/frontend/Feature";
import Footer from "../features/frontend/footer";
import Hero from "../features/frontend/Hero";
import Navbar from "../features/frontend/Navbar";
import Pricing from "../features/frontend/Pricing";
import Schools from "../features/frontend/Schools";
import Testimonials from "../features/frontend/Testimonials";
import { useEffect, useState } from "react";
import FrontendLoader from "../components/ui/FrontendLoader";

export default function HomePage() {

   const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading (API, assets, etc.)
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <FrontendLoader />;
  }
  return (
    <>
    
    <Navbar />
    <Hero />
    <Feature />
    <Schools />
    <Pricing />
    <Testimonials />
    <FAQ />
  
    <Footer />
    
    </>
  );
}





