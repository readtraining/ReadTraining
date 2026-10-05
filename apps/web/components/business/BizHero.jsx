import { business } from "@/data/business";
import MastheadHero from "@/components/marketing/MastheadHero";

export default function BizHero() {
  return <MastheadHero hero={business.hero} id="biz-hero" />;
}
