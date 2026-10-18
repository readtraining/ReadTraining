import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHero from "@/components/home/HomeHero";
import HomeSearchBand from "@/components/home/HomeSearchBand";
import HomeBrands from "@/components/home/HomeBrands";
import HomeCourses from "@/components/home/HomeCourses";
import HomeBookingOptions from "@/components/home/HomeBookingOptions";
import HomeRoles from "@/components/home/HomeRoles";
import HomeSubjects from "@/components/home/HomeSubjects";
import HomeStories from "@/components/home/HomeStories";
import HomeTeamBooking from "@/components/home/HomeTeamBooking";
import HomeProviders from "@/components/home/HomeProviders";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import { getCoursesByIds, toCourseCard } from "@/lib/courses";
import { featuredGroups } from "@/lib/siteContent";
import { loadSiteContent } from "@/lib/siteContentServer";
import { loadTaxonomy } from "@/lib/taxonomyServer";

export const metadata = {
  title: "ReadTraining | Accredited training courses across the UK",
  description:
    "Search vocational and compliance training from trusted UK training providers, explore dates and locations, and book with confidence.",
};

// The featured courses (an admin picks them; lib/siteContent.js) as course cards, read from the catalogue on the server so the
// catalogue never reaches the browser. The first card in each tab is marked "Most booked".
export default async function HomePage() {
  await Promise.all([loadTaxonomy(), loadSiteContent()]);
  const featured = featuredGroups().map((g) => ({ name: g.name, cards: getCoursesByIds(g.courses).map((c, i) => ({ ...toCourseCard(c), popular: i === 0 })) }));
  return (
    <div className="main-content rt-home">
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper overflow-hidden">
        <HomeHero />
        <HomeSearchBand />
        <HomeCourses groups={featured} />
        <HomeBookingOptions />
        <HomeSubjects />
        <HomeRoles />
        <HomeStories />
        <HomeTeamBooking />
        <HomeProviders />
        <HomeBrands />
        <HomeHelp />
        <HomeFooter />
      </div>
    </div>
  );
}
