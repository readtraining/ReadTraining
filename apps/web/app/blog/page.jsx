import React from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import MarketingHero from "@/components/marketing/MarketingHero";
import CtaBand from "@/components/marketing/CtaBand";
import BlogList from "@/components/blog/BlogList";
import { blogPage as b } from "@/data/blogPosts";
import { BLOG_HREF, getBlogCategories, getPostCards } from "@/lib/blog";
import { abs, breadcrumbLd, jsonLd, pageMetadata } from "@/lib/seo";

// The blog (/blog), in the marketing-page language of /about-us: centred dark hero > the articles (topic chips with the count,
// the newest article as a featured card, the rest three to a row, page links past 12) > call to action >
// need help > footer. Copy: data/blogPosts.js; reads: lib/blog.js. The page reads the address (?category=&page=) on the server,
// so the list is in the HTML.

const crumbs = [{ label: "Home", href: "/" }, { label: "Blog" }];

export const metadata = pageMetadata({ title: b.title, description: b.description, path: BLOG_HREF });

export default async function BlogPage(props) {
  const query = (await props.searchParams) || {};
  const posts = getPostCards();
  const blogLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "ReadTraining blog",
    url: abs(BLOG_HREF),
    blogPost: posts.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: abs(p.href), datePublished: p.published })),
  };
  return (
    <div className="main-content rt-home fb-page rt-tpage rt-blog-page">
      <a href="#rt-blog-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-blog-main" tabIndex={-1}>
          <MarketingHero hero={b.hero} />
          <BlogList
            posts={posts}
            categories={getBlogCategories()}
            copy={b.list}
            baseHref={BLOG_HREF}
            initialCategory={String(query.category || "")}
            initialPage={Number(query.page) || 1}
          />
          <CtaBand cta={b.cta} id="rt-blog-cta-h" />
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, BLOG_HREF)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(blogLd) }} />
    </div>
  );
}
