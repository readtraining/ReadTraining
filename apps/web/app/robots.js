import { SITE_URL } from "@/lib/seo";

// /robots.txt: search engines may crawl the public site; private areas stay out.
// A rule means "starts with", so the provider workspace is "/provider/" plus "/provider$" (that address exactly): a bare
// "/provider" would also hide the public /providers directory, /provider-terms and /provider-skill-saver.
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/account", "/business", "/provider/", "/provider$", "/admin", "/basket", "/checkout", "/login", "/signup", "/reset-password"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
