
import Navbar from "@/components/landing/Navbar";
import { HeroRoiLead } from "@/components/hero-roilead";
import VideoSection from "@/components/landing/VideoSection";
import { RoiLeadFeatures } from "@/components/roilead-features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";
import { Testimonials } from "@/components/testimonials";
import Footer from "@/components/landing/Footer";
import { AdBanner } from "@/components/AdBanner";

const Index = () => {
  return (
    <div className="min-h-screen bg-background pt-16 md:pt-20">
      <Navbar />
      <HeroRoiLead />
      <VideoSection />
      <RoiLeadFeatures />
      <HowItWorks />
      <PricingSection />
      <FAQSection />
      
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="max-w-5xl mx-auto w-full flex justify-center items-center min-h-[100px] bg-secondary/5 rounded-xl border border-border/50 overflow-hidden shadow-inner">
          <AdBanner adSlot="2284407894" />
        </div>
      </div>

      <Testimonials />

      <Footer />
    </div>
  );
};

export default Index;
