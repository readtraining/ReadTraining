import { blogAuthor, blogCategories, blogPosts } from "@/data/blogPosts";
import { formatLongDate } from "@/lib/legal";

// All blog reads go through here (server side). Swap the bodies for a CMS or API call later; the pages only read these shapes.

export const BLOG_HREF = "/blog";
export const postHref = (slug) => `${BLOG_HREF}/${slug}`;

const WORDS_PER_MINUTE = 200;
const textOf = (b) => (typeof b === "string" ? b : b.type === "ul" ? b.items.join(" ") : b.rows.flat().join(" "));
const readMinutes = (post) => {
  const words = [post.lead, ...post.sections.flatMap((s) => [s.title, ...s.blocks.map(textOf)])].join(" ").split(/\s+/).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
};
const categoryOf = (key) => {
  const c = blogCategories.find((x) => x.key === key);
  if (!c) throw new Error(`Blog: unknown category "${key}"`);
  return c;
};

// newest first
const sorted = [...blogPosts].sort((a, b) => b.published.localeCompare(a.published));

// What a card needs: plain data, so it can be passed to client components.
export const toPostCard = (p) => ({
  slug: p.slug,
  href: postHref(p.slug),
  title: p.title,
  summary: p.summary,
  category: categoryOf(p.category),
  published: p.published,
  date: formatLongDate(p.published),
  readTime: `${readMinutes(p)} min read`,
});

export const getPostCards = () => sorted.map(toPostCard);

// Categories that have posts, in their listed order, with counts.
export const getBlogCategories = () =>
  blogCategories.map((c) => ({ ...c, count: blogPosts.filter((p) => p.category === c.key).length })).filter((c) => c.count > 0);

export const getPostSlugs = () => blogPosts.map((p) => p.slug);

export function getPost(slug) {
  const p = blogPosts.find((x) => x.slug === slug);
  if (!p) return null;
  return {
    ...p,
    ...toPostCard(p),
    author: blogAuthor,
    updatedDate: p.updated ? formatLongDate(p.updated) : null,
  };
}

// Same category first, then the newest of the rest.
export function getMorePosts(post, count = 3) {
  const others = sorted.filter((p) => p.slug !== post.slug);
  return [...others.filter((p) => p.category === post.category.key), ...others.filter((p) => p.category !== post.category.key)].slice(0, count).map(toPostCard);
}
