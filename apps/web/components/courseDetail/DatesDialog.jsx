"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBooking } from "./BookingProvider";
import { formatDateRange, formatPrice } from "@/lib/format";
import { Icon } from "./Icon";
import CatalogueDropdown from "@/components/courses/CatalogueDropdown";
import FilterScrollPill from "@/components/courses/FilterScrollPill";
import { modeLabel } from "@/lib/courseModes";
import { EmptyState } from "@/components/states/States";
import SaverBadge from "@/components/skillSaver/SaverBadge";
import { distanceLabel, nearestVenue } from "@/lib/catalogueFilters";
import { api } from "@/lib/trpc/react";
import { maxDelegates } from "@/lib/basket";
import PopShell from "./PopShell";
import { PackagePanel } from "./PackageChooser";

const SORTS = { classroom: [["cheapest", "Cheapest"], ["soonest", "Soonest"], ["name", "Name (A to Z)"]], online: [["cheapest", "Cheapest"], ["soonest", "Soonest"]] };
const DEFAULT_SORT = "cheapest";

const PinIcon = () => <Icon name="location" />;
const CloseIcon = () => <Icon name="close" />;
const Chevron = () => <Icon name="chevron-down" />;

// Self-paced has no date: it starts whenever the learner likes.
const whenLabel = (s) => (s.mode === "ondemand" ? s.time : formatDateRange(s.date, s.endDate));
const norm = (v) => String(v || "").toLowerCase().replace(/\s+/g, "");
const storeKey = (course, mode) => `rt-dates:${course.id}:${mode}`;
const readStore = (key) => {
  try {
    return JSON.parse(window.sessionStorage.getItem(key) || "null");
  } catch {
    return null;
  }
};

const tile = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  const f = (o) => new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "UTC" }).format(d);
  return { month: f({ month: "short" }), day: f({ day: "numeric" }), weekday: f({ weekday: "short" }) };
};

// One date: a calendar tile, the dates, how long and when, the days themselves when they aren't all in a row, what the provider
// wrote about the date, the price and Skill Saver when only some dates are in it. With `onBook` (course page, course cards) the
// date has its own delegates counter (as Hurak's, up to the places left) and "Book now", which books that many; otherwise the whole
// row picks it, with a tick once chosen (the basket's "Change date").
function DateRow({ s, selected, onSelect, onBook, classroom, markSaver }) {
  const [qty, setQty] = useState(1);
  const t = s.mode === "ondemand" ? null : tile(s.date);
  const was = s.wasPrice > s.price ? s.wasPrice : null;
  // sold in packages: the price is the cheapest package's, so it reads "From"
  const from = s.packages ? "From " : "";
  const meta = [s.days ? `${s.days} ${s.days === 1 ? "day" : "days"}` : "", s.mode === "ondemand" ? "Online" : s.time, !classroom && s.mode === "online" ? "Live online" : ""].filter(Boolean).join(" · ");
  // the date with its own "Book now" (course page and course cards): the button books it and goes to the basket
  if (onBook) {
    return (
      <li>
        <div className="rt-dd__slot rt-dd__slot--book">
          {t && (
            <span className="rt-dd__tile" aria-hidden="true">
              <span className="rt-dd__tile-m">{t.month}</span>
              <span className="rt-dd__tile-d">{t.day}</span>
              <span className="rt-dd__tile-w">{t.weekday}</span>
            </span>
          )}
          <span className="rt-dd__slot-main">
            <strong>{whenLabel(s)}</strong>
            {meta && <span>{meta}</span>}
            {s.schedule && <span>{s.schedule}</span>}
            {s.details && <span className="rt-dd__details">{s.details}</span>}
            {markSaver && s.skillSaver && <SaverBadge />}
          </span>
          <span className="rt-dd__slot-price">
            <span className="rt-dd__price-line">
              {was && <s><span className="rt-cd__sr">was </span>{formatPrice(was)}</s>}
              <strong>{from}{formatPrice(s.price)}</strong>
            </span>
            {qty > 1 ? <span className="rt-dd__total">{from}{formatPrice(s.price * qty)} for {qty}</span> : <span className="rt-dd__per">per delegate</span>}
          </span>
          <span className="rt-dd__actions">
            <span className="rt-dd__qty-label" aria-hidden="true">Delegates</span>
            <span className="rt-bk__qty" role="group" aria-label={`Delegates for ${whenLabel(s)}`}>
              <button type="button" aria-label="Remove one delegate" disabled={qty <= 1} onClick={() => setQty((n) => Math.max(1, n - 1))}>−</button>
              <output aria-live="polite"><span className="rt-cd__sr">Delegates: </span>{qty}</output>
              <button type="button" aria-label="Add one delegate" disabled={qty >= maxDelegates(s)} onClick={() => setQty((n) => Math.min(maxDelegates(s), n + 1))}>+</button>
            </span>
            <button type="button" className="button -sm -purple-1 text-white rt-dd__book" onClick={() => onBook(s.id, qty)} aria-label={`Book now: ${qty} ${qty === 1 ? "delegate" : "delegates"}, ${whenLabel(s)}${classroom ? `, ${s.address}` : ""}, ${from.toLowerCase()}${formatPrice(s.price * qty)}${s.packages ? ", then choose a package" : ""}`}>
              Book now
            </button>
          </span>
        </div>
      </li>
    );
  }
  return (
    <li>
      <button type="button" className={`rt-dd__slot${selected ? " is-selected" : ""}`} aria-pressed={selected} onClick={() => onSelect(s.id)}>
        {t && (
          <span className="rt-dd__tile" aria-hidden="true">
            <span className="rt-dd__tile-m">{t.month}</span>
            <span className="rt-dd__tile-d">{t.day}</span>
            <span className="rt-dd__tile-w">{t.weekday}</span>
          </span>
        )}
        <span className="rt-dd__slot-main">
          <strong>{whenLabel(s)}</strong>
          {meta && <span>{meta}</span>}
          {s.schedule && <span>{s.schedule}</span>}
          {s.details && <span className="rt-dd__details">{s.details}</span>}
        </span>
        <span className="rt-dd__slot-price">
          <strong>{from}{formatPrice(s.price)}</strong>
          {was && <s><span className="rt-cd__sr">was </span>{formatPrice(was)}</s>}
          {markSaver && s.skillSaver && <SaverBadge />}
        </span>
        <span className="rt-dd__tick" aria-hidden="true">{selected && <Icon name="check" />}</span>
        <span className="rt-cd__sr">{selected ? ", selected" : ""}{classroom ? `, ${s.address}` : ""}</span>
      </button>
    </li>
  );
}

// An open venue shows its first dates; more than FOLD_AT are folded under "Show N more dates". The list shows VENUES_STEP venues,
// then "Show more venues".
const SHOWN = 3;
const FOLD_AT = 4;
const VENUES_STEP = 10;

// A venue (as Hurak's): a plain row with its name, address, how far it is from the place searched for, next date and
// lowest price, and "Show dates" on the right; its dates open under it, one venue at a time, so many venues stay easy to scan.
function VenueCard({ v, current, onSelect, onBook, open, onToggle, more, onMore, markSaver }) {
  const id = `rt-dd-v-${v.key.replace(/\W+/g, "-")}`;
  const folds = v.sessions.length > FOLD_AT;
  const shown = folds && !more ? v.sessions.slice(0, SHOWN) : v.sessions;
  const hidden = v.sessions.length - SHOWN;
  const first = tile(v.sessions[0].date);
  return (
    <section className={`rt-dd__vcard${open ? " is-open" : ""}`} aria-labelledby={id}>
      <div className="rt-dd__vhead">
        <div className="rt-dd__vinfo">
          <h3 id={id}>{v.venue || v.city}</h3>
          <p className="rt-dd__addr">
            {[v.street, v.city].filter(Boolean).join(", ")}
            {v.postcode && <>{(v.street || v.city) && ", "}<span className="rt-nowrap">{v.postcode}</span></>}
            {v.near && <span className="rt-nowrap"> · {distanceLabel(v.near)}</span>}
          </p>
          <p className="rt-dd__vnext">Next course: <strong>{first.weekday} {first.day} {first.month}</strong></p>
        </div>
        <p className="rt-dd__vfrom">{v.sessions.length > 1 || v.sessions.some((x) => x.packages) ? "From " : ""}{formatPrice(v.from)}</p>
        <button type="button" className="rt-dd__vtoggle" aria-expanded={open} aria-controls={`${id}-dates`} onClick={onToggle}>
          {open ? "Hide dates" : "Show dates"}<span className="rt-cd__sr"> at {v.venue || v.city}</span>
          <span className="rt-dd__vchev" aria-hidden="true"><Chevron /></span>
        </button>
      </div>
      <div id={`${id}-dates`} hidden={!open}>
        {open && (
          <>
            <ul className="rt-dd__slots" aria-label={`Dates at ${v.venue || v.city}`}>
              {shown.map((s) => <DateRow key={s.id} s={s} selected={current === s.id} onSelect={onSelect} onBook={onBook} classroom markSaver={markSaver} />)}
            </ul>
            {folds && (
              <button type="button" className="rt-dd__more" aria-expanded={more} onClick={onMore}>
                {more ? "Show fewer dates" : `Show ${hidden} more ${hidden === 1 ? "date" : "dates"}`} <Chevron />
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// The pop-up body. It is mounted only while the pop-up is open (and again for each study method), so its state starts from what
// was remembered (sessionStorage). With `onBook` (course page, course cards) each date has its own Book now; without it a date
// picked is applied at once (the basket's "Change date").
function Panel({ course, mode, modes, onMode, selectedId, onPick, onBook, onClose, isDesktop }) {
  const listRef = useRef(null);
  const classroom = mode === "classroom";
  const key = storeKey(course, mode);
  const sorts = SORTS[classroom ? "classroom" : "online"];

  const all = useMemo(() => course.sessions.filter((s) => s.mode === mode), [course, mode]);
  const venues = useMemo(() => {
    if (!classroom) return [];
    const map = new Map();
    all.forEach((s) => {
      const k = `${s.address}|${s.postcode}`;
      if (!map.has(k)) map.set(k, { key: k, name: s.address, venue: s.venue, street: s.venue && s.address.startsWith(`${s.venue}, `) ? s.address.slice(s.venue.length + 2) : s.address === s.venue ? "" : s.address, city: s.city, postcode: s.postcode, lat: s.lat, lng: s.lng, sessions: [] });
      map.get(k).sessions.push(s);
    });
    return [...map.values()].map((v) => {
      const sessions = [...v.sessions].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      return { ...v, sessions, from: Math.min(...sessions.map((x) => x.price)), next: sessions[0].date };
    });
  }, [all, classroom]);

  const saved = useMemo(() => readStore(key), [key]);
  const [input, setInput] = useState(saved?.q || "");
  const [q, setQ] = useState(saved?.q || "");
  const [sort, setSort] = useState(sorts.some(([v]) => v === saved?.sort) ? saved.sort : DEFAULT_SORT);
  // the venue holding the chosen date starts open with all its dates, so the chosen date is never hidden
  const chosenVenue = useMemo(() => {
    const s = course.sessions.find((x) => x.id === selectedId && x.mode === mode);
    return s ? `${s.address}|${s.postcode}` : null;
  }, [course, selectedId, mode]);
  const [more, setMore] = useState(() => (chosenVenue ? [chosenVenue] : []));
  // the open venue: undefined = not chosen yet (see `openKey` below), null = all closed
  const [openPick, setOpenPick] = useState(undefined);
  const [venuesShown, setVenuesShown] = useState(VENUES_STEP);

  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);
  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify({ q, sort }));
    } catch {}
  }, [key, q, sort]);

  // Where the typed town or postcode is on the map (API catalogue.locate, as the course search): found, every venue shows,
  // nearest first, with how far it is ("Salford" finds the Manchester venues). Not found, or while it is being looked up, or
  // when it can't be looked up, the venues are matched by the words typed.
  const lookup = classroom && q.length >= 2 && q.length <= 80;
  const located = api.catalogue.locate.useQuery({ q }, { enabled: lookup, staleTime: Infinity, retry: false });
  const place = lookup ? located.data ?? null : null;
  const looking = lookup && located.fetchStatus === "fetching" && located.data === undefined;
  useEffect(() => {
    if (place) setSort("nearest"); // a place found: nearest first, until another order is chosen
  }, [place]);
  useEffect(() => {
    setOpenPick(undefined); // a new search opens the nearest venue again
    setVenuesShown(VENUES_STEP);
  }, [q]);
  const sortBy = sort === "nearest" && !place ? DEFAULT_SORT : sort;
  const sortOptions = place ? [["nearest", "Nearest"], ...sorts] : sorts;

  const list = useMemo(() => {
    if (!classroom) {
      const rows = [...all];
      rows.sort((a, b) => (sortBy === "soonest" ? (a.date < b.date ? -1 : 1) : a.price - b.price || (a.date < b.date ? -1 : 1)));
      return rows;
    }
    const needle = norm(q);
    const named = venues.filter((v) => !needle || [v.name, v.city, v.name + v.city, v.postcode].some((f) => norm(f).includes(needle)));
    // while the place is looked up, no match by name keeps every venue showing (not a flash of "No venues match")
    const rows = place ? venues.map((v) => ({ ...v, near: v.lat == null ? null : { km: nearestVenue({ venues: [v] }, place).km } })) : named.length || !looking ? named : [...venues];
    const far = (v) => v.near?.km ?? Infinity; // a venue not on the map goes last
    rows.sort((a, b) => (sortBy === "nearest" ? far(a) - far(b) : sortBy === "soonest" ? (a.next < b.next ? -1 : 1) : sortBy === "name" ? a.name.localeCompare(b.name) : a.from - b.from || (a.next < b.next ? -1 : 1)));
    return rows;
  }, [all, venues, classroom, q, sortBy, place, looking]);

  const filtered = q !== "" || sortBy !== DEFAULT_SORT;
  const clear = () => {
    setInput("");
    setQ("");
    setSort(DEFAULT_SORT);
  };
  // which place the distances are from (the visitor can tell which Newport was used), or why the words typed are matched instead
  const placeNote = !lookup ? "" : place ? `Nearest to ${[place.label, place.area].filter(Boolean).join(", ")} first` : located.isError ? "We can't look places up right now, so venues are matched by name." : "";
  const toggle = (k) => setMore((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k]));
  // Booking (Book now on each date): every venue starts closed, as Hurak's, so the visitor picks the venue first; only a course
  // with one venue opens it (there is nothing to pick). Changing a date in the basket opens the venue of the date already chosen.
  const autoOpen = !classroom ? null : list.length === 1 ? list[0].key : !onBook && chosenVenue && list.some((v) => v.key === chosenVenue) ? chosenVenue : null;
  const openKey = openPick === undefined ? autoOpen : openPick;
  const venueList = classroom ? list.slice(0, venuesShown) : [];
  const venuesLeft = classroom ? list.length - venueList.length : 0;
  const pick = onPick;
  const current = selectedId;
  // Skill Saver on only some of the course's dates: those dates are marked
  const markSaver = course.skillSaver === "some";

  const dates = classroom ? list.reduce((n, v) => n + v.sessions.length, 0) : list.length;
  const count = [classroom ? `${list.length} ${list.length === 1 ? "venue" : "venues"}` : "", `${dates} ${dates === 1 ? "date" : "dates"}`].filter(Boolean).join(" · ");

  return (
    <>
      <div className="rt-dd__head">
        <div className="rt-dd__heading">
          <h2 id="rt-dd-title" className="rt-dd__title" tabIndex={-1} data-initial={isDesktop ? undefined : ""}>Choose a date</h2>
          <p className="rt-dd__sub">{modes ? course.title : `${course.title} · ${modeLabel(mode)}`}</p>
        </div>
        <button type="button" className="rt-icon-btn rt-dd__close" aria-label="Close" onClick={onClose}><CloseIcon /></button>
      </div>

      {modes && modes.length > 1 && (
        <div className="rt-dd__modes" role="group" aria-label="How you want to study">
          {modes.map((m) => (
            <button key={m} type="button" className={`rt-tr__filter${m === mode ? " is-on" : ""}`} aria-pressed={m === mode} onClick={() => onMode(m)}>{modeLabel(m)}</button>
          ))}
        </div>
      )}

      <div className="rt-dd__filters">
        <div className="rt-dd__controls">
          {classroom && (
            <label className="rt-field rt-dd__search">
              <PinIcon />
              <input type="search" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Town or postcode" aria-label="Town or postcode" data-initial={isDesktop ? "" : undefined} autoComplete="off" />
            </label>
          )}
          {/* the catalogue's own dropdown (as its "Sort by"), not the browser's native list */}
          <div className="rt-dd__sort">
            <CatalogueDropdown label="Sort by" options={sortOptions.map(([v, l]) => ({ value: v, label: l }))} value={sortBy} onChange={setSort} clearable={false} />
          </div>
        </div>
        <div className="rt-dd__meta">
          <span aria-live="polite">{count}{placeNote && ` · ${placeNote}`}</span>
          {filtered && <button type="button" className="rt-cd__link" onClick={clear}>Clear filter</button>}
        </div>
      </div>

      <div className="rt-dd__list rt-pill-scroll" ref={listRef}>
        {list.length === 0 ? (
          <EmptyState inCard title="No venues match." text={located.isSuccess && !place ? `We couldn't find ${q} on the map. Try another town or postcode.` : "Try another town or postcode."} />
        ) : classroom ? (
          <div className="rt-dd__venues">
            {venueList.map((v) => <VenueCard key={v.key} v={v} current={current} onSelect={pick} open={openKey === v.key} onToggle={() => setOpenPick(openKey === v.key ? null : v.key)} more={more.includes(v.key)} onMore={() => toggle(v.key)} markSaver={markSaver} onBook={onBook} />)}
            {venuesLeft > 0 && (
              <button type="button" className="rt-dd__more rt-dd__more--venues" onClick={() => setVenuesShown((n) => n + VENUES_STEP)}>
                Show more venues ({venuesLeft}) <Chevron />
              </button>
            )}
          </div>
        ) : (
          <ul className="rt-dd__slots rt-dd__slots--flat">
            {list.map((s) => <DateRow key={s.id} s={s} selected={current === s.id} onSelect={pick} onBook={onBook} markSaver={markSaver} />)}
          </ul>
        )}
      </div>
      <FilterScrollPill scrollRef={listRef} />
    </>
  );
}

// The "choose a date" pop-up. Desktop: centred dialog. 575px and under: full-screen sheet (PopShell). `modes` + `onMode` add the
// study methods as chips (catalogue card, basket); `onBook(sessionId, delegates, packageKey)` gives each date its own Book now. A
// date sold in packages (a price plan) goes on to "Choose your package" in the same pop-up, with the delegates chosen and "Back to
// dates"; the package chosen goes with the booking. Focus goes back to the opener.
export function DatesPicker({ open: datesOpen, onClose: closeDates, course, mode, modes, onMode, selectedId, onPick, onBook }) {
  const [pkgFor, setPkgFor] = useState(null); // { id, qty }: the date whose packages are showing
  useEffect(() => {
    if (datesOpen) setPkgFor(null); // every opening starts on the dates
  }, [datesOpen]);
  const book = onBook
    ? (id, qty) => {
        const s = course.sessions.find((x) => x.id === id);
        if (s?.packages) setPkgFor({ id, qty });
        else onBook(id, qty);
      }
    : undefined;
  const pkgSession = pkgFor && course ? course.sessions.find((x) => x.id === pkgFor.id) : null;
  if (!course) return null;
  return (
    <PopShell open={datesOpen} onClose={closeDates} labelledBy="rt-dd-title">
      {(isDesktop) =>
        pkgSession ? (
          <PackagePanel titleId="rt-dd-title" course={course} session={pkgSession} quantity={pkgFor.qty} onSelect={(key) => onBook(pkgSession.id, pkgFor.qty, key)} onBack={() => setPkgFor(null)} onClose={() => closeDates()} />
        ) : (
          <Panel key={mode} course={course} mode={mode} modes={modes} onMode={onMode} selectedId={selectedId} onPick={onPick} onBook={book} onClose={() => closeDates()} isDesktop={isDesktop} />
        )
      }
    </PopShell>
  );
}

// The course page's pop-up for Classroom and Live online, on the page's booking state: every date has its own "Book now", which
// books it and goes to the basket (as Hurak's).
// When the course runs both, the pop-up's own tabs switch between their dates; the page follows only once a date is chosen.
export default function DatesDialog() {
  const { course, mode, session, selectSession, datesOpen, closeDates, book } = useBooking();
  const dated = useMemo(() => ["classroom", "online"].filter((m) => course.sessions.some((s) => s.mode === m)), [course]);
  const [view, setView] = useState(mode);
  useEffect(() => {
    if (datesOpen) setView(mode); // every opening starts on the page's study method
  }, [datesOpen, mode]);
  const pick = useCallback(
    (id) => {
      selectSession(id);
      setTimeout(() => closeDates({ afterSelect: true }), 150);
    },
    [selectSession, closeDates],
  );
  if (mode === "ondemand" || mode === "inhouse") return null;
  if (!session) return null;
  const shown = dated.includes(view) ? view : mode;
  return <DatesPicker open={datesOpen} onClose={closeDates} course={course} mode={shown} modes={dated.length > 1 ? dated : undefined} onMode={setView} selectedId={session.id} onPick={pick} onBook={book} />;
}
