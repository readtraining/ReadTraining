import React from "react";
import { notFound } from "next/navigation";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import HomeCourseCard from "@/components/home/HomeCourseCard";
import HomeTextLink from "@/components/home/HomeTextLink";
import DocSidebar from "@/components/doc/DocSidebar";
import DocHeader from "@/components/doc/DocHeader";
import DocToc from "@/components/doc/DocToc";
import DocBlocks from "@/components/doc/DocBlocks";
import InfoCard from "@/components/doc/InfoCard";
import BackToTop from "@/components/doc/BackToTop";
import PostCard from "@/components/blog/PostCard";
import { blogPage } from "@/data/blogPosts";
import { BLOG_HREF, getMorePosts, getPost, getPostSlugs } from "@/lib/blog";
import { toCourseCard } from "@/lib/courses";
import { abs, breadcrumbLd, jsonLd, pageMetadata, SITE_URL } from "@/lib/seo";
import { loadTaxonomy } from "@/lib/taxonomyServer";

// A blog article (/blog/<slug>), in the legal pages' reading layout (components/doc): the contents pinned beside the text from
// 992px (a collapsible list above it on smaller screens), the header (breadcrumb, title, intro, author, dates, reading time),
// the text in one 680px column and its official sources. After it, full width: the courses on the topic (home's course cards)
// and more articles (the blog's cards), then need help and the footer.

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(props) {
  await loadTaxonomy(); // catalogue names (categories, methods) on the server
  const { slug } = await props.params;
  const post = getPost(slug);
  if (!post) return { title: "Article not found | ReadTraining" };
  return pageMetadata({ title: `${post.title} | ReadTraining`, description: post.summary, path: post.href });
}

export default async function BlogArticlePage(props) {
  await loadTaxonomy(); // catalogue names (categories, methods) on the server
  const { slug } = await props.params;
  const post = getPost(slug);
  if (!post) notFound();
  const a = blogPage.article;
  const more = getMorePosts(post);
  const crumbs = [{ label: "Home", href: "/" }, { label: "Blog", href: BLOG_HREF }, { label: post.category.label, href: `${BLOG_HREF}?category=${post.category.key}` }, { label: post.title }];
  const toc = post.sections.map((s) => ({ id: s.id, label: s.title }));
  const meta = [
    { label: "By", value: post.author },
    { label: "Published", value: post.date, dateTime: post.published },
    post.updated && { label: "Updated", value: post.updatedDate, dateTime: post.updated },
    { label: "", value: post.readTime },
  ].filter(Boolean);
  const postLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary,
    url: abs(post.href),
    mainEntityOfPage: abs(post.href),
    datePublished: post.published,
    dateModified: post.updated || post.published,
    inLanguage: "en-GB",
    articleSection: post.category.label,
    author: { "@type": "Organization", name: post.author, url: SITE_URL },
    publisher: { "@type": "Organization", name: "ReadTraining", url: SITE_URL },
  };

  return (
    <div className="main-content rt-home rt-doc-page rt-blog-article">
      <a href="#rt-doc-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-doc-main" tabIndex={-1}>
          <div className="rt-doc__body">
            <div className="container rt-doc__layout">
              <DocSidebar items={toc} />
              <div className="rt-doc__main">
                <DocHeader crumbs={crumbs} title={post.title} lead={post.lead} meta={meta} />
                <div className="rt-doc__mtoc">
                  <DocToc title="Contents" items={toc} />
                </div>
                <article className="rt-doc__text" aria-labelledby="rt-doc-title">
                  {post.sections.map((s) => (
                    <section key={s.id} id={s.id} className="rt-doc__section" aria-labelledby={`${s.id}-h`}>
                      <h2 className="rt-doc__h2" id={`${s.id}-h`} tabIndex={-1}>{s.title}</h2>
                      <DocBlocks blocks={s.blocks} />
                    </section>
                  ))}
                </article>
                <aside className="rt-doc__end rt-blog__end" aria-label={a.sources}>
                  <InfoCard icon="icon-document" title={a.sources} text={a.note}>
                    <ul className="rt-blog__sources">
                      {post.sources.map((s) => (
                        <li key={s.href}>
                          <a href={s.href} rel="noopener">{s.label}<i className="icon-arrow-top-right text-10" aria-hidden="true"></i></a>
                        </li>
                      ))}
                    </ul>
                  </InfoCard>
                </aside>
              </div>
            </div>
          </div>
          <BackToTop targetId="rt-doc-title" />

          {post.courses.length > 0 && (
            <section className="rt-blog__courses layout-pt-lg layout-pb-lg bg-light-4" aria-labelledby="rt-blog-courses-h">
              <div className="container">
                <h2 className="sectionTitle__title" id="rt-blog-courses-h">{a.courses.title}</h2>
                <p className="sectionTitle__text mt-5">{a.courses.text}</p>
                <div className="row y-gap-20 pt-30">
                  {post.courses.map((c) => (
                    <HomeCourseCard key={c.id} data={toCourseCard(c)} href={c.detailsHref} className="col-lg-4 col-md-6" />
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="rt-blog__more layout-pt-lg layout-pb-lg" aria-labelledby="rt-blog-more-h">
            <div className="container">
              <div className="row y-gap-20 justify-between items-end">
                <div className="col-auto">
                  <h2 className="sectionTitle__title" id="rt-blog-more-h">{a.more.title}</h2>
                </div>
                <div className="col-auto">
                  <HomeTextLink href={BLOG_HREF}>{a.more.link}</HomeTextLink>
                </div>
              </div>
              <ul className="rt-blog__grid">
                {more.map((p) => (
                  <li key={p.slug}>
                    <PostCard post={p} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, post.href)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(postLd) }} />
    </div>
  );
}
