import { SITE_URL } from "@/lib/seo";

// /robots.txt: search engines may crawl the public site; private areas and the template's demo pages stay out.
export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/account", "/business", "/provider", "/admin", "/basket", "/checkout", "/login", "/signup", "/reset-password", "/template"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
