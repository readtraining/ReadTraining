import { business } from "@/data/business";
import StepsSection from "@/components/marketing/StepsSection";

export default function HowItWorks() {
  return <StepsSection workflow={business.workflow} />;
}
