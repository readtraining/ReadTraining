import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import HomeBrands from "@/components/home/HomeBrands";
import BizHero from "@/components/business/BizHero";
import HowItWorks from "@/components/business/HowItWorks";
import AssignDemo from "@/components/business/AssignDemo";
import LearnerTable from "@/components/business/LearnerTable";
import RenewalTimeline from "@/components/business/RenewalTimeline";
import CreditPanel from "@/components/business/CreditPanel";
import BizFaq from "@/components/business/BizFaq";
import FinalCta from "@/components/business/FinalCta";

export const metadata = {
  title: "ReadTraining for Business | Buy, assign and manage team training",
  description: "Buy course places for your team, assign them now or later, and manage learners, certificates and renewals from one Business account.",
};

export default function ForBusinessPage() {
  return (
    <div className="main-content rt-home fb-page">
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper overflow-hidden">
        <BizHero />
        <HowItWorks />
        <AssignDemo />
        <LearnerTable />
        <RenewalTimeline />
        <CreditPanel />
        <BizFaq />
        <FinalCta />
        <HomeBrands />
        <HomeHelp />
        <HomeFooter />
      </div>
    </div>
  );
}
