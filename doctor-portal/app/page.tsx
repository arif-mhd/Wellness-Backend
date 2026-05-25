import LandingLayout from "@/components/landing/LandingLayout";
import LandingHeroImage from "@/components/landing/LandingHeroImage";
import LandingContent from "@/components/landing/LandingContent";

export default function HomePage() {
  return (
    <LandingLayout
      heroImage={<LandingHeroImage />}
      content={<LandingContent />}
    />
  );
}
