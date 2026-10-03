import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import HomeBrands from "@/components/home/HomeBrands";
import { BizHero, BizWorkflow, BizLicences, BizProgress, BizCertificates, BizCredit, BizFaq, BizCta } from "@/components/business/BizSections";

export const metadata = {
  title: "ReadTraining for Business | Buy, assign and manage team training",
  description: "Buy course places for your team, assign them now or later, and manage learners, certificates and renewals from one Business account.",
};

export default function ForBusinessPage() {
  return (
    <div className="main-content rt-home">
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper overflow-hidden">
        <BizHero />
        <BizWorkflow />
        <BizLicences />
        <BizProgress />
        <BizCertificates />
        <BizCredit />
        <BizFaq />
        <BizCta />
        <HomeBrands />
        <HomeHelp />
        <HomeFooter />
      </div>
    </div>
  );
}
