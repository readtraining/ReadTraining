"use client";
import React, { useRef } from "react";

import HomeSearch, { SEARCH_WIDTH } from "./HomeSearch";
import CartToggle from "@/components/layout/component/CartToggle";
import HomeMenu from "./HomeMenu";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import HomeMobileMenu from "./HomeMobileMenu";
import { topBar } from "@/data/home";
import HomeTopBar from "./HomeTopBar";
import HeaderAuth from "./HeaderAuth";
import NavCard from "@/components/header/NavCard";
import { useNavMenu } from "@/components/header/useNavMenu";
import { useHeaderBottom } from "@/components/header/useHeaderBottom";
import { headerNav } from "@/data/headerNav";

export default function HomeHeader() {
  const [activeMobileMenu, setActiveMobileMenu] = useState(false);
  // the search box opening: the menu slides left by just the room it needs (to the space beside the logo at most), and where
  // even that isn't enough the box opens narrower; closing slides the menu back
  const headerRef = useRef(null);
  const [menuShift, setMenuShift] = useState(0);
  const [searchWidth, setSearchWidth] = useState(SEARCH_WIDTH);
  const searchOpened = (open) => {
    const header = headerRef.current;
    const items = header ? [...header.querySelectorAll(".menu__nav > li")].map((li) => li.getBoundingClientRect()).filter((r) => r.width) : [];
    if (!open || !items.length) {
      setMenuShift(0);
      setSearchWidth(SEARCH_WIDTH);
      return;
    }
    const GAP = 16; // between the menu's last item and the box
    const right = header.querySelector(".header-right").getBoundingClientRect().left; // where the box's right side sits
    const logo = header.querySelector(".header__logo").getBoundingClientRect().right;
    const menuLeft = Math.min(...items.map((r) => r.left));
    const menuRight = Math.max(...items.map((r) => r.right));
    const need = Math.max(0, menuRight + GAP - (right - SEARCH_WIDTH)); // how far the menu must move for the full box
    const room = Math.max(0, menuLeft - logo - 24); // how far it can move before reaching the logo
    setMenuShift(Math.min(need, room));
    setSearchWidth(need > room ? Math.max(180, SEARCH_WIDTH - (need - room)) : SEARCH_WIDTH);
  };
  // the four menus: the open one's card shows under the header, with the page dimmed behind it
  const menu = useNavMenu();
  const section = headerNav.sections.find((s) => s.id === menu.open);
  const dimTop = useHeaderBottom(Boolean(section));

  return (
    <>
      <HomeTopBar />
      <header ref={headerRef} className="header -type-1 " style={{ position: "sticky", top: 0, "--rt-menu-shift": `${menuShift}px` }} data-rt-nav>
        <div className="header__container">
          <div className="row justify-between items-center">
            <div className="col-auto">
              <div className="header-left">
                <div className="header__logo ">
                  <Link href="/">
                    <Image
                      width={176}
                      height={44}
                      src="/assets/img/general/readtraining-logo.svg"
                      alt="ReadTraining"
                      priority
                    />
                  </Link>
                </div>
              </div>
            </div>

            <HomeMenu allClasses={"menu__nav text-white -is-active"} menu={menu} />
            <HomeMobileMenu
              setActiveMobileMenu={setActiveMobileMenu}
              activeMobileMenu={activeMobileMenu}
            />

            <div className="col-auto">
              {/* search, basket, the phone menu button and the account in one row (rt-hactions): 18px apart when signed in,
                  the old spacing when signed out (custom.scss) */}
              <div className="header-right rt-hactions text-white d-flex items-center">
                <HomeSearch onOpenChange={searchOpened} width={searchWidth} />

                <CartToggle
                  parentClassess={"relative"}
                  allClasses={"d-flex items-center text-white"}
                />

                <div className="d-none xl:d-block">
                  <button
                    onClick={() => setActiveMobileMenu(true)}
                    className="text-white items-center"
                    aria-label="Open menu"
                    aria-expanded={activeMobileMenu}
                    data-el-toggle=".js-mobile-menu-toggle"
                  >
                    <i className="text-11 icon icon-mobile-menu"></i>
                  </button>
                </div>

                <div className="header-right__buttons rt-hactions__auth d-flex items-center md:d-none">
                  <HeaderAuth />
                </div>
              </div>
            </div>
          </div>
        </div>
        {section && (
          <>
            <button type="button" className="rt-nav-dim" style={{ top: dimTop }} aria-label={headerNav.menu.close} tabIndex={-1} onClick={() => menu.close()}></button>
            <NavCard section={section} trigger={menu.trigger} />
          </>
        )}
      </header>
    </>
  );
}
