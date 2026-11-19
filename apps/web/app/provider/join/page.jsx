import ProviderJoin from "@/components/providerWorkspace/ProviderJoin";
import { pageMetadata } from "@/lib/seo";

// Where a provider's team invite link lands: the invited person joins (a new account first adds its name and password).
// Private, so kept out of search.
export const metadata = pageMetadata({ title: "Join your team | ReadTraining", description: "Join a training provider's team on ReadTraining.", path: "/provider/join", noindex: true });

export default function Page() {
  return <ProviderJoin />;
}
