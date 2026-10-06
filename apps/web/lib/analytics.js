// Minimal analytics hook: pushes GA4-style events to dataLayer (and gtag when present). Safe to call anywhere.
export function trackEvent(name, params = {}) {
  if (typeof window === "undefined") return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, ...params });
    if (typeof window.gtag === "function") window.gtag("event", name, params);
  } catch {}
}

// GA4 ecommerce item shape from a catalogue course.
export const toItem = (course, index) => ({
  item_id: String(course.id),
  item_name: course.title,
  item_category: course.subject,
  price: course.price,
  ...(index !== undefined ? { index } : {}),
});
