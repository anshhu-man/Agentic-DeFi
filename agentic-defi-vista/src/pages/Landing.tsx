import HeroSection from "@/components/HeroSection";
import SponsorsSection from "@/components/SponsorsSection";
import Navigation from "@/components/Navigation";

const Landing = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <HeroSection />
      <SponsorsSection />
    </div>
  );
};

export default Landing;