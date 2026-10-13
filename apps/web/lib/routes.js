// The site's shop routes in one place. Pure constants (no data imports), so data files can use them too.
export const CATALOGUE_HREF = "/courses";
export const BASKET_HREF = "/basket";
export const QUOTE_HREF = "/quote";

// A course details page. Pass the course's slug; lib/courses.js `courseHref` also accepts a catalogue id.
export const coursePath = (slug) => `/course/${slug}`;

// The auth pages. Kept here, not in lib/auth/authClient.js: that file is "use client", so a server page importing from it gets nothing.
export const AUTH_ROUTES = {
  afterLogin: "/account",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  signUp: "/signup",
  login: "/login",
  terms: "/terms-and-conditions",
  privacy: "/privacy-policy",
};
