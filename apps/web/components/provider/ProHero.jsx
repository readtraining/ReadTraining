import { provider } from "@/data/provider";
import MastheadHero from "@/components/marketing/MastheadHero";

export default function ProHero() {
  return <MastheadHero hero={provider.hero} id="pro-hero" />;
}
