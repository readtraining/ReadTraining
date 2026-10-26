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
import { toCourseCard } from "@/lib/courses";
import { pickCourses } from "@/lib/catalogueData";
import { loadCatalogue } from "@/lib/catalogueServer";
import { featuredGroups, seoSettings } from "@/lib/siteContent";
import { contentDefaults } from "@/data/home";
import { loadSiteContent } from "@/lib/siteContentServer";
import { loadTaxonomy } from "@/lib/taxonomyServer";

// the homepage's search-engine words (admin > Platform settings)
export async function generateMetadata() {
  await loadSiteContent();
  const { homeTitle, homeDescription } = seoSettings();
  return { title: homeTitle, description: homeDescription };
}

// The featured courses as course cards, from the live courses on the server: the ones an admin picked (lib/siteContent.js; a
// course no longer live is skipped), or each tab's subjects' most popular. A tab with no live course is left out, and the
// section with it when none has one. The first card in each tab is marked "Most booked".
export default async function HomePage() {
  const [, , courses] = await Promise.all([loadTaxonomy(), loadSiteContent(), loadCatalogue()]);
  const byId = new Map(courses.map((c) => [c.id, c]));
  const tabs = (groups) => groups
    .map((g) => ({ name: g.name, cards: (g.courses ? g.courses.map((id) => byId.get(id)).filter(Boolean) : pickCourses(courses, g.picks)).map((c, i) => ({ ...toCourseCard(c), popular: i === 0 })) }))
    .filter((g) => g.cards.length);
  // the admin's choice; if none of those courses is live any more (or they were the old sample numbers), the built-in tabs
  const chosen = tabs(featuredGroups());
  const featured = chosen.length ? chosen : tabs(contentDefaults.featured.groups);
  return (
    <div className="main-content rt-home">
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper overflow-hidden">
        <HomeHero />
        <HomeSearchBand />
        {featured.length > 0 && <HomeCourses groups={featured} />}
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
