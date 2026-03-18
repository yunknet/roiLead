
import Navbar from "@/components/landing/Navbar";
import { HeroRoiLead } from "@/components/hero-roilead";
import VideoSection from "@/components/landing/VideoSection";
import { RoiLeadFeatures } from "@/components/roilead-features";
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
      <PricingSection />
      <FAQSection />
      
      {/* Wrapper para os Depoimentos + Anúncios Laterais */}
      <div className="flex justify-between items-stretch max-w-[1600px] mx-auto xl:px-8">
        {/* Anúncio Esquerdo - Fixo só em telas grandes */}
        <div className="hidden xl:flex w-[300px] sticky top-32 flex-col justify-end pb-20 shrink-0">
          <AdBanner adSlot="2284407894" />
        </div>

        {/* Conteúdo Central */}
        <div className="flex-1 overflow-hidden">
          <Testimonials />
        </div>

        {/* Anúncio Direito - Fixo só em telas grandes */}
        <div className="hidden xl:flex w-[300px] sticky top-32 flex-col justify-end pb-20 shrink-0">
          <AdBanner adSlot="2284407894" />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Index;
