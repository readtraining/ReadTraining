import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import HomeBrands from "@/components/home/HomeBrands";
import { ProHero, ProWorkflow, ProCohorts, ProLearners, ProCampaigns, ProLms, ProMarketplace, ProPricing, ProFaq, ProCta } from "@/components/provider/ProSections";

export const metadata = {
  title: "ReadTraining for Training Providers | List courses, manage cohorts and learners",
  description: "Run your training business in one provider workspace and list eligible dates on the ReadTraining marketplace. No monthly subscription.",
};

export default function ForProvidersPage() {
  return (
    <div className="main-content rt-home">
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
