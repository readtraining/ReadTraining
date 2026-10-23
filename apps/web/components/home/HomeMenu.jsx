"use client";

import Link from "next/link";
import { AUTH_ROUTES } from "@/lib/routes";
import { headerNav as N } from "@/data/headerNav";
import { NavIcon } from "@/components/header/navIcons";

// The navbar's four menus (Explore courses, Licences, Near you, Help & guides), in the template's menu row, grouped in one
// box. Each opens its card (components/header/NavCard), which HomeHeader shows under the header; `menu` is HomeHeader's
// useNavMenu.
export default function HomeMenu({ allClasses, headerPosition, menu }) {
  return (
    <div className={`header-menu js-mobile-menu-toggle ${headerPosition ? headerPosition : ""}`}>
      <div className="header-menu__content">
        <div className="mobile-bg js-mobile-bg"></div>

        <div className="d-none xl:d-flex items-center px-20 py-20 border-bottom-light">
          <Link href={AUTH_ROUTES.login} className="text-dark-1">
            Log in
          </Link>
          <Link href={AUTH_ROUTES.signUp} className="text-dark-1 ml-30">
            Sign Up
          </Link>
        </div>

        <nav aria-label="Main" className="menu js-navList">
          <ul className={`${allClasses ? allClasses : ""} rt-navpill`}>
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
                    <NavIcon name="chevronDown" size={12} strokeWidth={2.6} className="rt-navpill__chev" />
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
