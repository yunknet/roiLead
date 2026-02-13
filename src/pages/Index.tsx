
import Navbar from "@/components/landing/Navbar";
import { HeroRoiLead } from "@/components/hero-roilead";
import VideoSection from "@/components/landing/VideoSection";
import { RoiLeadFeatures } from "@/components/roilead-features";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background pt-20">
      <Navbar />
      <HeroRoiLead />
      <VideoSection />
      <RoiLeadFeatures />
      <PricingSection />
      <FAQSection />
      <Footer />
    </div>
  );
};

export default Index;
