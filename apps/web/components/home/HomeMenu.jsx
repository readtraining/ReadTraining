"use client";

import React, { useState } from "react";
import Link from "next/link";
import { subjects, licenceGroups, regions, popularByLocation, resources, menuFooters } from "@/data/home/menu";

// Navbar dropdowns. Layout and proportions follow Hurak's menus (three columns: browse list →
// related list → featured card, plus a footer strip); colours and type come from the template.
// Rendered inside the template's `.mega` container so open/close behaviour is unchanged.

const Eyebrow = ({ children }) => <h3 className="rt-menu-eyebrow">{children}</h3>;

const ArrowLink = ({ href, children }) => (
  <Link href={href} className="rt-menu-link">
    <span>{children}</span>
    <i className="icon-arrow-right text-11"></i>
  </Link>
);

// Column with an eyebrow, scrollable body and an optional pinned bottom link.
const Column = ({ title, link, children, last }) => (
  <div className={`rt-menu-col${last ? " -last" : ""}`}>
    <Eyebrow>{title}</Eyebrow>
    <div className="rt-menu-col__body">{children}</div>
    {link && <div className="rt-menu-col__foot">{link}</div>}
  </div>
);

const BrowseList = ({ items, active, onHover }) => (
  <div className="rt-menu-browse">
    {items.map((item, i) => (
      <Link
        key={item.label}
        href={item.href}
        onMouseEnter={() => onHover(i)}
        className={`rt-menu-browse__item${i === active ? " is-active" : ""}`}
      >
        <span>{item.label}</span>
        <i className="icon-chevron-right text-9"></i>
      </Link>
    ))}
  </div>
);

const ListLinks = ({ items, columns = 2 }) => (
  <div className="rt-menu-list" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
    {items.map((it) => (
      <Link key={it.label} href={it.href} className="rt-menu-list__item">
        <span>{it.label}</span>
        <i className="icon-chevron-right text-9"></i>
      </Link>
    ))}
  </div>
);

const IconRow = ({ href, icon, label, text }) => (
  <Link href={href} className="rt-menu-iconrow">
    <span className="rt-menu-iconrow__icon">
      <i className={`${icon} text-14`}></i>
    </span>
    <span className="rt-menu-iconrow__body">
      <span className="rt-menu-iconrow__title">{label}</span>
      {text && <span className="rt-menu-iconrow__text">{text}</span>}
    </span>
  </Link>
);

const FeatureCard = ({ img, tag, eyebrow, title, text, link }) => (
  <div className="rt-menu-card">
    <div className="rt-menu-card__img">
      <img src={img} alt="" />
      {tag && <span className="rt-menu-card__tag">{tag}</span>}
    </div>
    {eyebrow && <div className="rt-menu-card__eyebrow">{eyebrow}</div>}
    <div className="rt-menu-card__title">{title}</div>
    <div className="rt-menu-card__text">{text}</div>
    {link && (
      <div className="rt-menu-card__foot">
        <ArrowLink href={link.href}>{link.label}</ArrowLink>
      </div>
    )}
  </div>
);

const Footer = ({ links, action }) => (
  <div className="rt-menu-footer">
    <div className="rt-menu-footer__links">
      {links.map((l, i) => (
        <React.Fragment key={l.label}>
          {i > 0 && <span className="rt-menu-footer__dot">·</span>}
          <Link href={l.href}>{l.label}</Link>
        </React.Fragment>
      ))}
    </div>
    {action && (
      <Link href={action.href} className="rt-menu-footer__action">
        <i className={`${action.icon} text-12`}></i>
        {action.label}
      </Link>
    )}
  </div>
);

const Panel = ({ children, footer }) => (
  <div className="mega xl:d-none rt-menu-panel">
    <div className="rt-menu-grid">{children}</div>
    <Footer {...footer} />
  </div>
);

const Item = ({ title, children }) => (
  <li className="menu-item-has-children -has-mega-menu">
    <Link data-barba href="#">
      {title} <i className="icon-chevron-right text-13 ml-10"></i>
    </Link>
    {children}
  </li>
);

export default function HomeMenu({ allClasses, headerPosition }) {
  const [subjectIdx, setSubjectIdx] = useState(0);
  const [licenceIdx, setLicenceIdx] = useState(0);
  const [regionIdx, setRegionIdx] = useState(0);
  const subject = subjects[subjectIdx];
  const licence = licenceGroups[licenceIdx];
  const region = regions[regionIdx];

  return (
    <div className={`header-menu js-mobile-menu-toggle ${headerPosition ? headerPosition : ""}`}>
      <div className="header-menu__content">
        <div className="mobile-bg js-mobile-bg"></div>

        <div className="d-none xl:d-flex items-center px-20 py-20 border-bottom-light">
          <Link href="/template/login" className="text-dark-1">
            Log in
          </Link>
          <Link href="/template/signup" className="text-dark-1 ml-30">
            Sign Up
          </Link>
        </div>

        <div className="menu js-navList">
          <ul className={`${allClasses ? allClasses : ""}`}>
            {/* ---------- Courses ---------- */}
            <Item title="Courses">
              <Panel footer={menuFooters.courses}>
                <Column title="Browse by subject" link={<ArrowLink href="/template/courses-list-1">View all subjects</ArrowLink>}>
                  <BrowseList items={subjects} active={subjectIdx} onHover={setSubjectIdx} />
                </Column>
                <Column title={`Popular in ${subject.label}`} link={<ArrowLink href={subject.href}>View all {subject.label} courses</ArrowLink>}>
                  <ListLinks items={subject.courses} columns={1} />
                </Column>
                <Column title="Exploration" last>
                  <FeatureCard
                    img={subject.img}
                    eyebrow={`${subject.count} courses available`}
                    title={subject.label}
                    text={`Accredited ${subject.label.toLowerCase()} training from vetted UK providers. Compare dates, venues and prices in one place.`}
                    link={{ label: `View all ${subject.label} courses`, href: subject.href }}
                  />
                </Column>
              </Panel>
            </Item>

            {/* ---------- Licences & Cards ---------- */}
            <Item title="Licences & Cards">
              <Panel footer={menuFooters.licences}>
                <Column title="Browse licences & cards">
                  <BrowseList items={licenceGroups} active={licenceIdx} onHover={setLicenceIdx} />
                </Column>
                <Column title={`Popular ${licence.label} routes`} link={<ArrowLink href={licence.href}>View all {licence.label} routes</ArrowLink>}>
                  <ListLinks items={licence.routes} columns={1} />
                </Column>
                <Column title="Regulated qualifications" last>
                  <FeatureCard img={licence.img} title={licence.label} text={licence.text} link={{ label: "Explore routes", href: licence.href }} />
                </Column>
              </Panel>
            </Item>

            {/* ---------- Locations ---------- */}
            <Item title="Locations">
              <Panel footer={menuFooters.locations}>
                <Column title="Browse by region" link={<ArrowLink href="/template/courses-list-3">View all locations</ArrowLink>}>
                  <BrowseList items={regions} active={regionIdx} onHover={setRegionIdx} />
                </Column>
                <Column title={`Training in ${region.label}`} link={<ArrowLink href={region.href}>All venues in {region.label}</ArrowLink>}>
                  <ListLinks items={region.cities.map((city) => ({ label: city, href: "/template/courses-list-3" }))} />
                </Column>
                <Column title="Popular near you" last>
                  <FeatureCard
                    img={region.img}
                    eyebrow={`${region.cities.length} towns and cities`}
                    title={`Classroom dates in ${region.label}`}
                    text={`${popularByLocation.slice(0, 4).map((p) => p.label).join(", ")} and more, at venues across ${region.label}.`}
                    link={{ label: "Search by postcode", href: "/template/courses-list-3" }}
                  />
                </Column>
              </Panel>
            </Item>

            {/* ---------- Resources ---------- */}
            <Item title="Resources">
              <Panel footer={menuFooters.resources}>
                <Column title="Prepare & learn" link={<ArrowLink href={resources.prepareLink.href}>{resources.prepareLink.label}</ArrowLink>}>
                  {resources.prepare.map((r) => (
                    <IconRow key={r.label} {...r} />
                  ))}
                </Column>
                <Column title="Help & information" link={<ArrowLink href={resources.helpLink.href}>{resources.helpLink.label}</ArrowLink>}>
                  {resources.help.map((r) => (
                    <IconRow key={r.label} {...r} />
                  ))}
                  <div className="rt-menu-sub">
                    <h4 className="rt-menu-eyebrow">From ReadTraining</h4>
                    {resources.company.map((r) => (
                      <IconRow key={r.label} {...r} />
                    ))}
                  </div>
                </Column>
                <Column title="Featured guide" last>
                  <FeatureCard {...resources.featured} />
                </Column>
              </Panel>
            </Item>
          </ul>
        </div>
      </div>
    </div>
  );
}
