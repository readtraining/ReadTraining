import React from "react";
import { notFound } from "next/navigation";
import HelpShell from "@/components/help/HelpShell";
import HelpLinks from "@/components/help/HelpLinks";
import HelpFeedback from "@/components/help/HelpFeedback";
import DocBlocks from "@/components/doc/DocBlocks";
import { getHelpArticle, getHelpArticleSlugs, getHelpPage, HELP_HREF } from "@/lib/help";
import { pageMetadata } from "@/lib/seo";

// A Help Centre article (/help-centre/<topic>/<article>): the topic's articles beside the article (its summary as the intro,
// then its text in the legal pages' text style, .rt-doc__text), "Was this article helpful?" and related articles.

export function generateStaticParams() {
  return getHelpArticleSlugs();
}

export async function generateMetadata(props) {
  const { topic, article } = await props.params;
  const hit = getHelpArticle(topic, article);
  if (!hit) return { title: "Help article not found | ReadTraining" };
  return pageMetadata({ title: `${hit.article.title} | Help Centre | ReadTraining`, description: hit.article.summary, path: hit.article.href });
}

export default async function HelpArticlePage(props) {
  const { topic: topicSlug, article: articleSlug } = await props.params;
  const hit = getHelpArticle(topicSlug, articleSlug);
  if (!hit) notFound();
  const { topic, article, related } = hit;
  const help = getHelpPage();
  const crumbs = [{ label: "Home", href: "/" }, { label: help.hero.eyebrow, href: HELP_HREF }, { label: topic.title, href: topic.href }, { label: article.title }];
  const articles = topic.articles.map((a) => ({ key: a.slug, label: a.title, href: a.href }));
  return (
    <HelpShell crumbs={crumbs} title={article.title} lead={article.summary} path={article.href} side={{ title: topic.title, items: articles, current: article.slug }}>
      <article className="rt-doc__text rt-help__article" aria-labelledby="rt-doc-title">
        <DocBlocks blocks={article.blocks} />
      </article>
      <HelpFeedback article={article.href} text={help.feedback} />
      {related.length > 0 && (
        <section className="rt-help__related" aria-labelledby="rt-help-related-h">
          <h2 className="rt-help__related-title" id="rt-help-related-h">Related articles</h2>
          <HelpLinks items={related} />
        </section>
      )}
    </HelpShell>
  );
}
