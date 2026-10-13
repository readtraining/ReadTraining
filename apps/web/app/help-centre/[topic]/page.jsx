import React from "react";
import { notFound } from "next/navigation";
import HelpShell from "@/components/help/HelpShell";
import HelpLinks from "@/components/help/HelpLinks";
import { getHelpPage, getHelpTopic, getHelpTopics, getHelpTopicSlugs, HELP_HREF } from "@/lib/help";
import { pageMetadata } from "@/lib/seo";

// A Help Centre topic (/help-centre/<topic>): the topics beside the topic's title, summary and its articles.

export function generateStaticParams() {
  return getHelpTopicSlugs();
}

export async function generateMetadata(props) {
  const { topic: slug } = await props.params;
  const topic = getHelpTopic(slug);
  if (!topic) return { title: "Help topic not found | ReadTraining" };
  return pageMetadata({ title: `${topic.title} | Help Centre | ReadTraining`, description: topic.summary, path: topic.href });
}

export default async function HelpTopicPage(props) {
  const { topic: slug } = await props.params;
  const topic = getHelpTopic(slug);
  if (!topic) notFound();
  const help = getHelpPage();
  const crumbs = [{ label: "Home", href: "/" }, { label: help.hero.eyebrow, href: HELP_HREF }, { label: topic.title }];
  const topics = getHelpTopics().map((t) => ({ key: t.slug, label: t.title, href: t.href }));
  return (
    <HelpShell crumbs={crumbs} title={topic.title} lead={topic.summary} path={topic.href} side={{ title: "Topics", items: topics, current: topic.slug }}>
      <div className="rt-help__list">
        <HelpLinks items={topic.articles} />
      </div>
    </HelpShell>
  );
}
