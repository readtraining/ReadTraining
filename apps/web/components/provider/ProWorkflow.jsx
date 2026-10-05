import { provider } from "@/data/provider";
import StepsSection from "@/components/marketing/StepsSection";

export default function ProWorkflow() {
  return <StepsSection workflow={provider.workflow} />;
}
