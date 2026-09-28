import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHero from "@/components/home/HomeHero";
import HomeSearchBand from "@/components/home/HomeSearchBand";
import HomeBrands from "@/components/home/HomeBrands";
import HomeCourses from "@/components/home/HomeCourses";
import HomeBookingOptions from "@/components/home/HomeBookingOptions";
import HomeRoles from "@/components/home/HomeRoles";
import HomeSubjects from "@/components/home/HomeSubjects";
import HomeTestimonials from "@/components/home/HomeTestimonials";
import HomeTeamBooking from "@/components/home/HomeTeamBooking";
import HomeProviders from "@/components/home/HomeProviders";
import HomeStats from "@/components/home/HomeStats";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";

export const metadata = {
  title: "ReadTraining | Accredited training courses across the UK",
  description:
    "Search vocational and compliance training from trusted UK training providers, explore dates and locations, and book with confidence.",
};

export default function HomePage() {
  return (
    <div className="main-content">
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper overflow-hidden">
        <HomeHero />
        <HomeSearchBand />
        <HomeBrands />
        <HomeCourses />
        <HomeBookingOptions />
        <HomeRoles />
        <HomeSubjects />
        <HomeTestimonials />
        <HomeTeamBooking />
        <HomeProviders />
        <HomeStats />
        <HomeHelp />
        <HomeFooter />
      </div>
    </div>
  );
}
