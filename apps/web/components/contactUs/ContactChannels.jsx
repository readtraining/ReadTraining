import React from "react";
import WhatsAppIcon from "@/components/common/WhatsAppIcon";

// "Ways to reach us": phone, WhatsApp and email as the benefit rows (.rt-benefit: icon tile, label, the value as a link,
// hours or reply time), beside the form (`children`) in /for-business's split layout (.fb-split) on a white band.
export default function ContactChannels({ channels: c, children }) {
  return (
    <section className="fb-section -white" aria-labelledby="rt-contact-channels-h">
      <div className="container">
        <div className="fb-split rt-contact__split">
          <div>
            <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{c.eyebrow}</div>
            <h2 className="fb-title" id="rt-contact-channels-h">{c.title}</h2>
            <p className="fb-lede">{c.text}</p>
            <ul className="rt-benefits rt-contact__channels">
              {c.items.map((x) => (
                <li key={x.label} className="rt-benefit">
                  <span className="rt-benefit__icon" aria-hidden="true">{x.icon === "whatsapp" ? <WhatsAppIcon className="text-16" /> : <i className={`${x.icon} text-16`}></i>}</span>
                  <div>
                    <h3 className="rt-benefit__title">{x.label}</h3>
                    <a href={x.href} className="rt-contact__value" {...(x.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{x.value}{x.external && <span className="rt-sr"> (opens in a new tab)</span>}</a>
                    <p className="rt-benefit__text">{x.meta}</p>
                    {x.note && <p className="rt-benefit__text">{x.note}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}
