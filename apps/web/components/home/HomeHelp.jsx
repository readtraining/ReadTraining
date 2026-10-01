import Link from "next/link";
import React from "react";
import { help } from "@/data/home";

const icons = ["icon-message", "icon-person-3", "icon-book"];

// Need help (shadcnblocks Contact 7 pattern, light variant): header, then three tonal cards.
export default function HomeHelp() {
  const [call, chat, centre] = help.options;
  const cards = [
    { icon: icons[0], label: "Live chat", meta: "Online now", live: true, link: "Start a chat", href: chat.href },
    { icon: icons[1], label: "Call us", meta: call.meta, link: call.value, href: call.href },
    { icon: icons[2], label: "Help centre", meta: centre.meta, link: "Browse articles", href: centre.href },
  ];
  return (
    <section className="rt-helpcta">
      <div className="container">
        <header className="rt-helpcta__head">
          <p className="rt-helpcta__eyebrow">{help.eyebrow}</p>
          <h2 className="rt-helpcta__title">{help.title}</h2>
          <p className="rt-helpcta__lead">{help.text}</p>
        </header>

        <div className="rt-helpcta__grid">
          {cards.map((c) => (
            <Link key={c.label} href={c.href} className="rt-helpcard">
              <span className="rt-helpcard__icon"><i className={`${c.icon} text-16`}></i></span>
              <span className="rt-helpcard__label">{c.label}</span>
              <span className="rt-helpcard__meta">{c.live && <span className="rt-helpcard__dot"></span>}{c.meta}</span>
              <span className="rt-helpcard__link">{c.link} <i className="icon-arrow-right text-12 ml-5"></i></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
