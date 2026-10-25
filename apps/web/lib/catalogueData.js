import { coursePath } from "@/lib/routes";

// The real catalogue (API catalogue.listings / catalogue.course) in the shapes the public pages read: the listing card and the
// filters (toCatalogueCourse), and the course page (toCourseDetail). Prices arrive in pence and include VAT; the pages work in
// pounds. Anything the courses don't have yet (ratings, reviews, learner numbers) is left empty, never made up: the pages hide
// what is empty. Plain functions, safe in the browser and on the server.

const pounds = (p) => (p == null ? null : p / 100);
const paragraphs = (text) => (text || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
const lines = (text) => (text || "").split("\n").map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
const today = () => new Date().toISOString().slice(0, 10);
const NEW_DAYS = 21;
const isNew = (iso) => Boolean(iso) && Date.now() - Date.parse(iso) < NEW_DAYS * 86400000;

// A listing, as the catalogue's filters, sorting and cards read a course.
export function toCatalogueCourse(l) {
  return {
    id: l.id,
    slug: l.slug,
    kind: l.kind,
    title: l.title,
    description: l.summary,
    subject: l.category || "",
    sub: l.subcategory || "",
    topic: l.topic || "",
    level: l.level || "",
    methods: l.methods,
    venues: l.venues.map((v) => ({ city: v.city, postcode: v.postcode || "", lat: v.lat, lng: v.lng })),
    providers: l.providers,
    popularity: l.popularity,
    upcoming: l.upcoming,
    price: pounds(l.fromPence),
    wasPrice: pounds(l.wasPence),
    duration: l.duration,
    validity: "",
    addedAt: (l.publishedAt || "").slice(0, 10),
    imageSrc: l.imageUrl || "",
    detailsHref: coursePath(l.slug),
    rating: null,
    nextDate: l.nextDate,
    skillSaver: l.skillSaver,
    badge: isNew(l.publishedAt) ? "New" : "",
    real: true,
  };
}

// a YouTube or Vimeo link as an embeddable player address (null for anything else)
export function videoEmbed(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return vm ? `https://player.vimeo.com/video/${vm[1]}` : null;
}

// A course page (catalogue.course) as the course page's parts read it. `related`: listings to show under it.
export function toCourseDetail(page, related = []) {
  const sessions = [];
  for (const o of page.offerings) {
    if (o.method === "self-paced" && o.selfPacedPence != null) {
      sessions.push({
        id: `sp-${o.courseId}`, mode: "ondemand", date: today(), endDate: today(), time: "Start any time", location: "Online", city: "", venue: "", address: "", postcode: "",
        provider: o.provider.name, providerSlug: o.provider.slug, courseId: o.courseId, courseSlug: o.slug, price: pounds(o.selfPacedPence), wasPrice: null,
      });
    }
    for (const d of o.dates) {
      const first = d.sessions[0] || {};
      const v = d.venue;
      sessions.push({
        id: d.id,
        mode: d.method === "classroom" ? "classroom" : "online",
        date: d.startsOn,
        endDate: d.endsOn,
        time: first.from ? `${first.from} to ${first.to}` : "",
        location: v ? [v.city, v.postcode].filter(Boolean).join(", ") : "Live online",
        city: v?.city || "",
        venue: v?.name || "",
        address: v ? [v.name, v.street].filter(Boolean).join(", ") : "",
        postcode: v?.postcode || "",
        lat: v?.lat ?? null,
        lng: v?.lng ?? null,
        provider: o.provider.name,
        providerSlug: o.provider.slug,
        courseId: o.courseId,
        courseSlug: o.slug,
        days: d.days,
        details: d.details,
        price: pounds(d.pricePence),
        wasPrice: pounds(d.wasPricePence),
      });
    }
  }
  sessions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.price - b.price));

  const dated = sessions.filter((s) => s.mode !== "ondemand");
  const countBy = (m) => sessions.filter((s) => s.mode === m).length;
  const popularMode = ["classroom", "online", "ondemand"].sort((a, b) => countBy(b) - countBy(a))[0];
  const cheapest = sessions.reduce((best, s) => (!best || s.price < best.price ? s : best), null);
  const methods = [...new Set(page.offerings.map((o) => o.method).filter(Boolean))];
  const providers = new Set(page.offerings.map((o) => o.provider.slug));
  const description = paragraphs(page.description);
  const entry = paragraphs(page.entryRequirements);
  const audience = lines(page.audience);

  return {
    id: page.id,
    slug: page.slug,
    kind: page.kind,
    title: page.title,
    summary: page.summary || description[0] || "",
    description: description.length ? description : [page.summary].filter(Boolean),
    subject: page.category || "",
    sub: page.subcategory || "",
    topic: page.topic || "",
    level: page.level || "",
    methods,
    imageSrc: page.images[0]?.url || "",
    images: page.images,
    videoUrl: page.videoUrl,
    video: videoEmbed(page.videoUrl),
    features: page.features,
    learningOutcomes: page.outcomes,
    audience,
    showAudience: audience.length > 0,
    requirements: { title: `Entry requirements for the ${page.title}`, paragraphs: entry.length ? entry : ["There are no entry requirements for this course."], list: [] },
    modules: page.units.map((u) => ({ title: u.title, duration: "", topics: lines(u.body) })),
    exams: page.exams.length ? { title: "How will I be assessed?", intro: [], rows: page.exams, outro: [] } : undefined,
    faqs: page.faqs,
    sessions,
    upcoming: dated.length,
    popularMode,
    inHouse: methods.some((m) => m === "classroom" || m === "live-online"),
    providerCount: providers.size,
    providers: providers.size,
    offerings: page.offerings,
    provider: page.provider,
    parent: page.parent,
    price: cheapest?.price ?? null,
    wasPrice: cheapest?.wasPrice ?? null,
    duration: dated[0]?.days ? `${dated[0].days} ${dated[0].days === 1 ? "day" : "days"}` : methods.length === 1 && methods[0] === "self-paced" ? "Self-paced" : "",
    skillSaver: page.offerings.some((o) => o.skillSaver),
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    updatedAt: page.updatedAt,
    badge: isNew(page.publishedAt) ? "New" : "",
    // not collected yet (reviews and learner numbers come with bookings): the page hides them
    rating: null,
    reviewCount: 0,
    reviews: [],
    ratingBreakdown: null,
    learnerCount: null,
    mockTest: null,
    trust: { noBookingFee: true, approvedProviders: true },
    related: related.map(toCatalogueCourse),
    real: true,
  };
}
