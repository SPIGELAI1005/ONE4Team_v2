import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import DualWorldSection from "@/components/landing/DualWorldSection";
import Footer from "@/components/landing/Footer";

const Index = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <HeroSection />
    <div id="features">
      <FeaturesSection />
    </div>
    <div id="worlds">
      <DualWorldSection />
    </div>
    <Footer />
  </div>
);

export default Index;
