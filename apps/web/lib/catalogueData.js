import { coursePath } from "@/lib/routes";

// The real catalogue (API catalogue.listings / catalogue.course) in the shapes the public pages read: the listing card and the
// filters (toCatalogueCourse), and the course page (toCourseDetail). Prices arrive in pence and include VAT; the pages work in
// pounds. Nothing the courses don't have yet (ratings, reviews, learner numbers) is made up. Plain functions, safe in the browser and on the server.

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
    // every price it can be booked at (a date's, with its way of study and venue; a self-paced course's), for the search's "From"
    // on a method or town page (lib/catalogueFilters.js priceWhere)
    prices: (l.prices || []).map((p) => ({ method: p.method, venue: p.venue == null ? null : p.venue, price: pounds(p.pence), wasPrice: pounds(p.wasPence) })),
    providers: l.providers,
    popularity: l.popularity,
    upcoming: l.upcoming,
    price: pounds(l.fromPence),
    wasPrice: pounds(l.wasPence),
    duration: l.duration,
    validity: "",
    addedAt: (l.publishedAt || "").slice(0, 10),
    imageSrc: l.imageUrl || "",
    imageAlt: l.imageAlt || l.title,
    detailsHref: coursePath(l.slug),
    nextDate: l.nextDate,
    skillSaver: l.skillSaver,
    badge: isNew(l.publishedAt) ? "New" : "",
  };
}

// A link to one YouTube or Vimeo video as its player's address; null for anything else (a channel, a playlist, another site), so
// the page never shows a player that can't play. The API refuses the same links with the same rules (videoEmbed in
// apps/api/src/modules/provider/courses.mts): keep the two the same.
// YouTube: watch?v= (in any place among the parameters), youtu.be/<id>, /embed/, /shorts/, /live/, /v/, on www. or m.
// Vimeo: vimeo.com/<id>, an unlisted vimeo.com/<id>/<hash> (the hash goes to the player as ?h=), /channels/<name>/<id>,
// /showcase|album/<name>/video/<id>, /groups/<name>/videos/<id>, player.vimeo.com/video/<id>.
const YT_ID = /^[\w-]{11}$/;
const VIMEO_ID = /^\d{1,12}$/;
const VIMEO_HASH = /^[\da-f]{6,20}$/i;
export function videoEmbed(link) {
  let url;
  try {
    url = new URL(String(link || "").trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "");
  const path = url.pathname.split("/").filter(Boolean);
  if (host === "youtube.com" || host === "youtu.be") {
    const id = host === "youtu.be" ? (path.length === 1 ? path[0] : null) : path[0] === "watch" && path.length === 1 ? url.searchParams.get("v") : ["embed", "shorts", "live", "v"].includes(path[0]) && path.length === 2 ? path[1] : null;
    // "videoseries" is 11 letters too: /embed/videoseries?list= is a playlist
    return id && YT_ID.test(id) && id !== "videoseries" ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  let id = null;
  let hash = url.searchParams.get("h");
  if (host === "player.vimeo.com") id = path[0] === "video" && path.length === 2 ? path[1] : null;
  else if (host === "vimeo.com") {
    if (path.length <= 2 && VIMEO_ID.test(path[0] || "")) [id, hash] = [path[0], path[1] || hash];
    else if (path[0] === "video" && path.length === 2) id = path[1];
    else if (path[0] === "channels" && path.length === 3) id = path[2];
    else if (["showcase", "album"].includes(path[0]) && path[2] === "video" && path.length === 4) id = path[3];
    else if (path[0] === "groups" && path[2] === "videos" && path.length === 4) id = path[3];
  }
  if (!id || !VIMEO_ID.test(id) || (hash && !VIMEO_HASH.test(hash))) return null;
  return `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ""}`;
}

// When a date's sessions ({ date, end, from, to }) are. `time`: one time when every session has the same ("09:30 to 16:30"),
// otherwise "Times vary by day". `schedule`: what the date's first and last day and that one time don't say, or "": the days
// when they aren't one run in a row ("Sat 14, Sun 15, Sat 21, Sun 22 Nov"; three or more days in a row are joined: "Wed 11 to
// Fri 13, Mon 16 to Wed 18 Nov"), or, when the times differ, every session with its own times.
const utcDay = (iso) => new Date(`${iso}T00:00:00Z`);
const dayText = (iso, month) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", ...(month ? { month: "short" } : {}) }).format(utcDay(iso)).replace(",", "");
const monthOf = (iso) => iso.slice(0, 7);
const nextDay = (iso) => {
  const d = utcDay(iso);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
// days (sorted ISO dates) as their runs, written out; the month goes after the last day of each month
function daysText(days) {
  const runs = [];
  for (const day of days) {
    const run = runs[runs.length - 1];
    if (run && nextDay(run[run.length - 1]) === day) run.push(day);
    else runs.push([day]);
  }
  const items = runs.flatMap((r) => (r.length >= 3 ? [[r[0], r[r.length - 1]]] : r.map((day) => [day])));
  return items
    .map(([from, to], i) => {
      const month = i === items.length - 1 || monthOf(to || from) !== monthOf(items[i + 1][0]);
      // a run over the end of a month names both months
      const across = to && monthOf(from) !== monthOf(to);
      return to ? `${dayText(from, across)} to ${dayText(to, month || across)}` : dayText(from, month);
    })
    .join(", ");
}
function timetable(list = []) {
  if (!list.length) return { time: "", schedule: "" };
  const sorted = [...list].sort((a, b) => (a.date + a.from).localeCompare(b.date + b.from));
  const sameTimes = sorted.every((s) => s.from === sorted[0].from && s.to === sorted[0].to);
  if (!sameTimes) {
    const each = sorted.map((s) => `${s.end && s.end !== s.date ? `${dayText(s.date, monthOf(s.date) !== monthOf(s.end))} to ${dayText(s.end, true)}` : dayText(s.date, true)}, ${s.from} to ${s.to}`);
    return { time: "Times vary by day", schedule: each.join("; ") };
  }
  const days = new Set();
  for (const s of sorted) for (let d = s.date; d <= (s.end || s.date); d = nextDay(d)) days.add(d);
  const all = [...days].sort();
  const inARow = all.every((d, i) => i === 0 || nextDay(all[i - 1]) === d);
  return { time: `${sorted[0].from} to ${sorted[0].to}`, schedule: inARow ? "" : daysText(all) };
}

const saverOf = (list) => (list.length && list.every((x) => x.skillSaver) ? "all" : list.some((x) => x.skillSaver) ? "some" : null);

// A course page (catalogue.course) as the course page's parts read it. `related`: listings to show under it.
export function toCourseDetail(page, related = []) {
  const sessions = [];
  for (const o of page.offerings) {
    if (o.method === "self-paced" && o.selfPacedPence != null) {
      sessions.push({
        id: `sp-${o.courseId}`, mode: "ondemand", date: today(), endDate: today(), time: "Start any time", location: "Online", city: "", venue: "", address: "", postcode: "",
        provider: o.provider.name, providerSlug: o.provider.slug, courseId: o.courseId, courseSlug: o.slug, price: pounds(o.selfPacedPence), wasPrice: null, skillSaver: o.skillSaver,
      });
    }
    for (const d of o.dates) {
      const v = d.venue;
      sessions.push({
        id: d.id,
        mode: d.method === "classroom" ? "classroom" : "online",
        date: d.startsOn,
        endDate: d.endsOn,
        ...timetable(d.sessions),
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
        places: d.capacity || null, // the date's places (no booking takes any yet: payments come later)
        details: d.details, // what the provider wrote for learners about this date (shown under it)
        price: pounds(d.pricePence),
        wasPrice: pounds(d.wasPricePence),
        skillSaver: o.skillSaver, // the provider's course is in Skill Saver (its discount applies in the basket)
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
    // the cover's description as the provider wrote it (course editor, ALT text), or the course's name
    imageAlt: page.images[0]?.alt || page.title,
    images: page.images,
    videoUrl: page.videoUrl,
    video: videoEmbed(page.videoUrl),
    features: page.features,
    learningOutcomes: page.outcomes,
    audience,
    showAudience: audience.length > 0,
    // left blank, the provider hasn't said (not "none"), so the page leaves the section out
    requirements: entry.length ? { title: `Entry requirements for the ${page.title}`, paragraphs: entry, list: [] } : null,
    modules: page.units.map((u) => ({ title: u.title, duration: "", topics: lines(u.body) })),
    exams: page.exams.length ? { title: "How will I be assessed?", intro: [], rows: page.exams, outro: [] } : undefined,
    faqs: page.faqs,
    sessions,
    upcoming: dated.length,
    popularMode,
    inHouse: methods.some((m) => m === "classroom" || m === "live-online"),
    providerCount: providers.size,
    providers: providers.size,
    provider: page.provider,
    parent: page.parent,
    price: cheapest?.price ?? null,
    wasPrice: cheapest?.wasPrice ?? null,
    duration: dated[0]?.days ? `${dated[0].days} ${dated[0].days === 1 ? "day" : "days"}` : methods.length === 1 && methods[0] === "self-paced" ? "Self-paced" : "",
    // Skill Saver: "all" when every date (or, with none yet, every provider's course) is in it, "some" when only some are (the
    // dates in it are then marked), else null
    skillSaver: saverOf(sessions.length ? sessions : page.offerings),
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    updatedAt: page.updatedAt,
    badge: isNew(page.publishedAt) ? "New" : "",
    mockTest: null, // its free mock test, set on the server (lib/testPrep.js mockTestFor)
    trust: { noBookingFee: true, approvedProviders: true },
    related: related.map(toCatalogueCourse),
  };
}

// Whether a course (catalogue course or course page: subject, sub, topic) sits under a pick ("category/sub-category/topic").
export function matchesPick(course, pick) {
  const [subject, sub, topic] = pick.split("/");
  return course.subject === subject && (!sub || course.sub === sub) && (!topic || course.topic === topic);
}

// The courses filed under a page's picks (data/courseTopics.js: "category/sub-category/topic"), from catalogue courses
// (toCatalogueCourse): each pick's courses most popular first, in the order of the picks, each course once, at most `limit`.
export function pickCourses(courses, picks, limit = 4) {
  const out = [];
  for (const pick of picks) {
    const found = courses.filter((c) => matchesPick(c, pick)).sort((a, b) => b.popularity - a.popularity);
    for (const c of found) if (!out.includes(c)) out.push(c);
  }
  return out.slice(0, limit);
}
