"use client";

import { headerNav as N } from "@/data/headerNav";

// The navbar's four menus (Explore courses, Licences, Location, Help & guides), in the template's own menu row: white
// labels with a down arrow. A click opens one; the open one has a green bar along the header's bottom edge and its arrow
// points up. Each opens its card (components/header/NavCard), which HomeHeader shows under the header; `menu` is
// HomeHeader's useNavMenu. Shown from 1200px; below that the phone menu (HomeMobileMenu) has the four menus.
export default function HomeMenu({ allClasses, headerPosition, menu }) {
  return (
    <div className={`header-menu js-mobile-menu-toggle rt-menu-row ${headerPosition ? headerPosition : ""}`}>
      <div className="header-menu__content">
        <div className="mobile-bg js-mobile-bg"></div>

        <nav aria-label="Main" className="menu js-navList">
          <ul className={allClasses || ""}>
            {N.sections.map((s) => {
              const on = menu.open === s.id;
              return (
                <li key={s.id} className="menu-item-has-children">
                  <a
                    href="#"
                    role="button"
                    ref={menu.triggerRef(s.id)}
                    className={on ? "is-open" : undefined}
                    aria-expanded={on}
                    aria-controls={on ? "rt-nav-card" : undefined}
                    {...menu.triggerProps(s.id)}
                    onClick={(e) => {
                      e.preventDefault();
                      menu.triggerProps(s.id).onClick();
                    }}
                  >
                    {s.label}
                    <i className="icon-chevron-right text-13 ml-10" aria-hidden="true"></i>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
