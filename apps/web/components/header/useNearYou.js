"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { headerNav as N } from "@/data/headerNav";

// distance between two points on the map, good enough to compare (an equirectangular approximation)
const far = (a, b) => {
  const x = (b.lng - a.lng) * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  const y = b.lat - a.lat;
  return x * x + y * y;
};

// Near you: a town or postcode (and a course, if chosen) opens the course finder there. "Use my location" asks the browser where
// the person is and opens the finder at the nearest of the listed cities; nothing leaves the browser.
export function useNearYou() {
  const router = useRouter();
  const [locating, setLocating] = useState(false);
  const [failed, setFailed] = useState(false);

  const go = (town, course) => {
    const words = town.trim();
    if (!words) return false;
    router.push(N.near.href(words, course));
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
        const city = N.near.cities.reduce((best, c) => (far(here, c) < far(here, best) ? c : best));
        router.push(N.near.href(city.name, course));
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
