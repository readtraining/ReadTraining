import { helpPage, helpTopics, popularHelp } from "@/data/help";

// Help Centre reads (topics > articles). Pages read through here, not from data/ directly, so the articles can move to the API
// or a CMS later with the same return shape.

export const HELP_HREF = "/help-centre";
export const topicHref = (topic) => `${HELP_HREF}/${topic}`;
export const articleHref = (topic, article) => `${HELP_HREF}/${topic}/${article}`;

export const getHelpPage = () => helpPage;

// Every topic with its article count, for the hub tiles and the topic sidebar.
export const getHelpTopics = () => helpTopics.map(({ articles, ...t }) => ({ ...t, href: topicHref(t.slug), count: articles.length }));

// One topic with its articles' links, or null.
export function getHelpTopic(slug) {
  const t = helpTopics.find((x) => x.slug === slug);
  if (!t) return null;
  return { ...t, href: topicHref(t.slug), articles: t.articles.map((a) => ({ ...a, href: articleHref(t.slug, a.slug) })) };
}

// One article with its topic and up to three related articles from the same topic, or null.
export function getHelpArticle(topicSlug, articleSlug) {
  const topic = getHelpTopic(topicSlug);
  const article = topic?.articles.find((a) => a.slug === articleSlug);
  if (!article) return null;
  const related = topic.articles.filter((a) => a.slug !== articleSlug).slice(0, 3);
  return { topic, article, related };
}

// The hub's popular articles.
export const getPopularHelp = () => popularHelp.map(([t, a]) => getHelpArticle(t, a)).map(({ topic, article }) => ({ ...article, topic: topic.title }));

// What the search box looks through: every article's title, summary and topic.
export const getHelpSearchIndex = () =>
  helpTopics.flatMap((t) => t.articles.map((a) => ({ title: a.title, summary: a.summary, topic: t.title, href: articleHref(t.slug, a.slug) })));

// For generateStaticParams.
export const getHelpTopicSlugs = () => helpTopics.map((t) => ({ topic: t.slug }));
export const getHelpArticleSlugs = () => helpTopics.flatMap((t) => t.articles.map((a) => ({ topic: t.slug, article: a.slug })));
