import { hseTest } from "@/data/hseTest";
import { testCentres } from "@/data/testCentres";
import { getLicence } from "@/lib/licences";
import { nearestTo } from "@/lib/testCentreSearch";

// Reads for the CITB HS&E test pages (server side). Swap for API calls when the centre list comes from the backend.
const PREFIX = "cscs-citb-tests-"; // the centre page's URL segment, as the client's: /tests-locations/cscs-citb-tests-leeds
export const centreParams = () => testCentres.map((c) => `${PREFIX}${c.slug}`);
export const getCentreByParam = (param) => (param.startsWith(PREFIX) ? testCentres.find((c) => c.slug === param.slice(PREFIX.length)) || null : null);
export const nearbyCentres = (centre, n = 3) => nearestTo(centre).filter((c) => c.slug !== centre.slug).slice(0, n);

// The CSCS cards each test leads to, from the CSCS card guide's own data, so both pages always agree.
export function cardsForTest(match) {
  const cards = getLicence("cscs-cards")?.cards || [];
  return cards.filter((c) => c.test && c.test.includes(match)).map((c) => c.name);
}

