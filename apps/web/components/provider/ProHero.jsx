import { provider } from "@/data/provider";
import MastheadHero from "@/components/marketing/MastheadHero";
import { ProviderHeroCta } from "./ProviderCta";

export default function ProHero() {
  return <MastheadHero hero={provider.hero} id="pro-hero" primary={<ProviderHeroCta link={provider.hero.primary} />} />;
}
