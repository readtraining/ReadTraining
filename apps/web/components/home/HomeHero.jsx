"use client";
import gsap from "gsap";
import Link from "next/link";
import { ShapeRendering } from "@/svg/index";
import { hero } from "@/data/home";
import React, { useEffect } from "react";
import Image, { StaticImageData } from "next/image";

import hero_bg from "@/public/assets/img/home-1/hero/bg.png";
import masthead_icon_1 from "@/public/assets/img/masthead/icons/1.svg";
import masthead_icon_2 from "@/public/assets/img/masthead/icons/2.svg";
import masthead_icon_3 from "@/public/assets/img/masthead/icons/3.svg";
// move img and icon
import move_img_1 from "@/public/assets/img/masthead/1.png";

import move_img_2 from "@/public/assets/img/masthead/2.png";
import move_img_3 from "@/public/assets/img/masthead/3.png";
import move_icon_1 from "@/public/assets/img/masthead/1.svg";
import move_icon_2 from "@/public/assets/img/masthead/4.png";
import move_icon_3 from "@/public/assets/img/masthead/2.svg";

const masthead_icons = [masthead_icon_1, masthead_icon_2, masthead_icon_3];
const masthead_info = hero.highlights.slice(0, 3).map((text, i) => ({ id: i + 1, icon: masthead_icons[i % 3], text }));

const hero_content = {
  title: hero.title,
  text_underline: hero.titleAccent,
  info_hero: hero.text,
  starts: [
    "icon-star text-yellow-1 text-11",
    "icon-star text-yellow-1 text-11",
    "icon-star text-yellow-1 text-11",
    "icon-star text-yellow-1 text-11",
    "icon-star text-yellow-1 text-11",
  ],
};
const { title, text_underline, info_hero, starts } = hero_content;

const HomeHero = () => {
  useEffect(() => {
    const parallaxIt = () => {
      const target = document.querySelectorAll(".js-mouse-move-container");

      target.forEach((container) => {
        const targets = container.querySelectorAll(".js-mouse-move");

        targets.forEach((el) => {
          const movement = el.getAttribute("data-move");

          document.addEventListener("mousemove", (e) => {
            const relX = e.pageX - container.offsetLeft;
            const relY = e.pageY - container.offsetTop;

            gsap.to(el, {
              x:
                ((relX - container.offsetWidth / 2) / container.offsetWidth) *
                Number(movement),
              y:
                ((relY - container.offsetHeight / 2) / container.offsetHeight) *
                Number(movement),
              duration: 0.2,
            });
          });
        });
      });
    };

    parallaxIt();
  }, []);

  return (
    <>
      <section className="masthead -type-1 js-mouse-move-container" style={{ paddingTop: 70 }}>
        <div className="masthead__bg">
          <Image src={hero_bg} alt="image" />
        </div>

        <div className="container">
          <div className="row y-gap-30 justify-between items-end">
            <div className="col-xl-6 col-lg-6 col-sm-10">
              <div
                className="masthead__content"
                data-aos="fade-up"
                data-aos-delay="500"
              >
                <div
                  data-aos="fade-up"
                  className="d-inline-flex items-center bg-dark-5 rounded-200 mb-15"
                  style={{ padding: "4px 14px 4px 4px", gap: 10, border: "1px solid rgba(255,255,255,.08)", marginLeft: 0 }}
                >
                  <div className="d-flex justify-center items-center bg-purple-1 rounded-full" style={{ width: 26, height: 26, flex: "0 0 auto" }}>
                    <i className="icon-badge text-12 text-white"></i>
                  </div>
                  <div className="text-13 fw-500 text-white lh-1">{hero.eyebrow}</div>
                </div>
                <h1 className="masthead__title">
                  {title}
                  <br />
                  {hero.titleLine2}{" "}
                  <span className="text-green-1 underline">
                    {text_underline}
                  </span>
                </h1>
                <p
                  data-aos="fade-up"
                  data-aos-duration="100"
                  className="masthead__text"
                  style={{ maxWidth: 560 }}
                >
                  {hero.text} {hero.text2}
                </p>
                <div
                  data-aos="fade-up"
                  data-aos-duration="200"
                  className="masthead__buttons d-flex flex-wrap items-center"
                  style={{ gap: "12px 28px" }}
                >
                  <Link
                    data-barba
                    href={hero.primaryButton.href}
                    className="button -md -purple-1 text-white"
                  >
                    {hero.primaryButton.label}
                    <i className="icon-arrow-right text-14 ml-10"></i>
                  </Link>
                  <Link
                    data-barba
                    href={hero.secondaryButton.href}
                    className="d-flex items-center text-white fw-500"
                  >
                    <span className="d-flex justify-center items-center rounded-full bg-dark-5 mr-10" style={{ width: 36, height: 36, border: "1px solid rgba(255,255,255,.12)" }}>
                      <i className="icon-person-3 text-14 text-green-1"></i>
                    </span>
                    {hero.secondaryButton.label}
                  </Link>
                </div>

                <div
                  data-aos="fade-up"
                  data-aos-duration="300"
                  className="d-flex flex-wrap items-center pt-40"
                  style={{ gap: "14px 18px" }}
                >
                  <div className="d-flex items-center">
                    {[1, 2, 3, 4, 5].map((n, i) => (
                      <Image
                        key={n}
                        width={40}
                        height={40}
                        src={`/assets/img/avatars/small/${n}.png`}
                        alt=""
                        className="rounded-full"
                        style={{ width: 40, height: 40, objectFit: "cover", border: "2px solid var(--color-dark-1)", marginLeft: i ? -12 : 0 }}
                      />
                    ))}
                  </div>
                  <div>
                    <div className="d-flex items-center" style={{ gap: 8 }}>
                      <div className="d-flex" style={{ gap: 2 }}>
                        {starts.map((start, index) => (
                          <div key={index} className={start}></div>
                        ))}
                      </div>
                      <span className="text-14 fw-500 text-white lh-1">{hero.socialProof.rating}</span>
                    </div>
                    <div className="text-13 text-white mt-5 lh-1" style={{ opacity: 0.75 }}>{hero.socialProof.text}</div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="col-xl-6 col-lg-6"
              data-aos="fade-up"
              data-aos-delay="700"
            >
              <div className="masthead-image">
                <div className="masthead-image__el1">
                  <Image
                    className="js-mouse-move"
                    data-move="40"
                    style={{ objectFit: "cover" }}
                    src={move_img_1}
                    alt="image"
                  />
                  <div
                    data-move="30"
                    className="lg:d-none img-el -w-250 px-20 py-20 d-flex items-center bg-white rounded-8 js-mouse-move"
                  >
                    <div className="size-50 d-flex justify-center items-center bg-red-2 rounded-full">
                      <Image src={move_icon_1} alt="icon" />
                    </div>
                    <div className="ml-20">
                      <div className="text-orange-1 text-16 fw-500 lh-1">
                        1,000 +
                      </div>
                      <div className="mt-3">Accredited courses</div>
                    </div>
                  </div>
                </div>

                <div className="masthead-image__el2">
                  <Image
                    className="js-mouse-move"
                    data-move="70"
                    src={move_img_2}
                    style={{ objectFit: "cover" }}
                    alt="image"
                  />
                  <div
                    data-move="60"
                    className="lg:d-none img-el -w-260 px-20 py-20 d-flex items-center bg-white rounded-8 js-mouse-move"
                  >
                    <Image src={move_icon_2} alt="icon" />
                    <div className="ml-20">
                      <div className="text-dark-1 text-16 fw-500 lh-1">
                        Oliver Okonjo
                      </div>
                      <div className="mt-3">SIA Door Supervisor</div>
                      <div className="d-flex x-gap-5 mt-3">
                        {starts.map((start, index) => (
                          <div key={index}>
                            <div className={start}></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="masthead-image__el3">
                  <Image
                    className="js-mouse-move"
                    data-move="40"
                    src={move_img_3}
                    style={{ objectFit: "cover" }}
                    alt="image"
                  />
                  <div
                    data-move="30"
                    className="shadow-4 img-el -w-260 px-30 py-20 d-flex items-center bg-white rounded-8 js-mouse-move"
                  >
                    <div className="img-el__side">
                      <div className="size-50 d-flex justify-center items-center bg-purple-1 rounded-full">
                        <Image
                          style={{ objectFit: "cover" }}
                          src={move_icon_3}
                          alt="icon"
                        />
                      </div>
                    </div>
                    <div className="">
                      <div className="text-purple-1 text-16 fw-500 lh-1">
                        Booked!
                      </div>
                      <div className="mt-3">Your place is confirmed</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* animated shape start */}
        <ShapeRendering />
        {/* animated shape end */}
      </section>
    </>
  );
};

export default HomeHero;
