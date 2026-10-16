// The site's shop routes in one place. Pure constants (no data imports), so data files can use them too.
export const CATALOGUE_HREF = "/courses";
export const BASKET_HREF = "/basket";
export const QUOTE_HREF = "/quote";
export const CHECKOUT_HREF = "/checkout";

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
  providerTerms: "/provider-terms",
  privacy: "/privacy-policy",
};

// The CITB HS&E test (the "CSCS test"): the test page, the test centre directory and a centre's page (the client's URLs).
export const HSE_TEST_HREF = "/tests/citb-health-safety-and-environment-test";
export const TEST_CENTRES_HREF = "/cscs-test-centres";
export const testCentreHref = (slug) => `/tests-locations/cscs-citb-tests-${slug}`;
