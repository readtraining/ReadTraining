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
import FaqSection from "@/components/marketing/FaqSection";
import { business } from "@/data/business";
import FinalCta from "@/components/business/FinalCta";
import { faqItems } from "@/lib/siteContent";
import { loadSiteContent } from "@/lib/siteContentServer";

export const metadata = {
  title: "ReadTraining for Business | Buy, assign and manage team training",
  description: "Buy course places for your team, assign them now or later, and manage learners, certificates and renewals from one Business account.",
};

export default async function ForBusinessPage() {
  await loadSiteContent();
  const faq = faqItems("for-business", business.faq.items);
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
        <FaqSection eyebrow={business.faq.eyebrow} title={business.faq.title} text={business.faq.text} items={faq} idPrefix="biz-faq" />
        <FinalCta />
        <HomeBrands />
        <HomeHelp />
        <HomeFooter />
      </div>
    </div>
  );
}
