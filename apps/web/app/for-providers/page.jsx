import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import HomeBrands from "@/components/home/HomeBrands";
import ProHero from "@/components/provider/ProHero";
import ProWorkflow from "@/components/provider/ProWorkflow";
import ProCohorts from "@/components/provider/ProCohorts";
import ProLearners from "@/components/provider/ProLearners";
import ProCampaigns from "@/components/provider/ProCampaigns";
import ProLms from "@/components/provider/ProLms";
import ProMarketplace from "@/components/provider/ProMarketplace";
import ProPricing from "@/components/provider/ProPricing";
import ProFaq from "@/components/provider/ProFaq";
import ProCta from "@/components/provider/ProCta";

export const metadata = {
  title: "ReadTraining for Training Providers | List courses, manage cohorts and learners",
  description: "Run your training business in one provider workspace and list eligible dates on the ReadTraining marketplace. No monthly subscription.",
};

export default function ForProvidersPage() {
  return (
    <div className="main-content rt-home fb-page">
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper overflow-hidden">
        <ProHero />
        <ProWorkflow />
        <ProCohorts />
        <ProLearners />
        <ProCampaigns />
        <ProLms />
        <ProMarketplace />
        <ProPricing />
        <ProFaq />
        <ProCta />
        <HomeBrands />
        <HomeHelp />
        <HomeFooter />
      </div>
    </div>
  );
}
