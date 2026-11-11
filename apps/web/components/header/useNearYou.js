"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNav } from "@/lib/navContext";
import { cityHref, courseInTown } from "@/lib/nav";
import { findNear } from "@/app/course-locations/actions";

// distance between two points on the map, good enough to compare (an equirectangular approximation)
const far = (a, b) => {
  const x = (b.lng - a.lng) * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  const y = b.lat - a.lat;
  return x * x + y * y;
};

// Near you: a town or postcode (and a course, if chosen) opens the course finder there. "Use my location" asks the browser where
// the person is and opens the finder at the nearest town with live dates (useNav); the position itself never leaves the browser.
// The server checks the place first (app/course-locations/actions.js findNear): a chosen course that runs nowhere near it opens
// its own page instead, and a place with nothing near it every course, so it never lands on "No courses match".
export function useNearYou() {
  const router = useRouter();
  const nav = useNav();
  // where to go: the chosen course (its slug) in that town, or every course there
  const open = async (town, slug) => {
    const course = slug ? nav.courses.find((c) => c.slug === slug) : null;
    let href = course ? courseInTown(course, town) : cityHref(town);
    try {
      href = await findNear({ slug: course?.slug, location: town });
    } catch {} // the check couldn't be made: the search there
    router.push(href);
  };
  const [locating, setLocating] = useState(false);
  const [failed, setFailed] = useState(false);

  const go = (town, course) => {
    const words = town.trim();
    if (!words) return false;
    open(words, course);
    return true;
  };

  const locate = (course) => {
    setFailed(false);
    if (!navigator.geolocation) return setFailed(true);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const here = { lat: coords.latitude, lng: coords.longitude };
        const towns = nav.towns.filter((t) => t.lat != null && t.lng != null);
        if (!towns.length) return setFailed(true);
        const city = towns.reduce((best, c) => (far(here, c) < far(here, best) ? c : best));
        open(city.name, course);
      },
      () => {
        setLocating(false);
        setFailed(true);
      },
      { maximumAge: 600000, timeout: 10000 },
    );
  };

  return { go, locate, locating, failed };
}
