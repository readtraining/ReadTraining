"use client";
import React from "react";

import HomeSearch from "./HomeSearch";
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
  // the four menus: the open one's card shows under the header, with the page dimmed behind it
  const menu = useNavMenu();
  const section = headerNav.sections.find((s) => s.id === menu.open);
  const dimTop = useHeaderBottom(Boolean(section));

  return (
    <>
      <HomeTopBar />
      <header className="header -type-1 " style={{ position: "sticky", top: 0 }} data-rt-nav>
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
              <div className="header-right d-flex items-center">
                <div className="header-right__icons text-white d-flex items-center">
                  {/* search toggle start */}
                  <HomeSearch />
                  {/* search toggle end */}

                  {/* cart toggle start */}
                  <CartToggle
                    parentClassess={"relative ml-30 xl:ml-20"}
                    allClasses={"d-flex items-center text-white"}
                  />
                  {/* cart toggle end */}

                  <div className="d-none xl:d-block ml-20">
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
                </div>

                <div className="header-right__buttons d-flex items-center ml-30 md:d-none">
                  <HeaderAuth />
                </div>
              </div>
            </div>
          </div>
        </div>
        {section && (
          <>
            <button type="button" className="rt-nav-dim" style={{ top: dimTop }} aria-label={headerNav.menu.close} tabIndex={-1} onClick={() => menu.close()}></button>
            <NavCard section={section} trigger={menu.trigger} cardProps={menu.cardProps} />
          </>
        )}
      </header>
    </>
  );
}
