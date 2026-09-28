"use client";

import Image from "next/image";

import React, { useState } from "react";
import { bookingOptions } from "@/data/home";
const pricingData = bookingOptions.tiers;
import Link from "next/link";

export default function HomeBookingOptions() {
  const [isYearly, setIsYearly] = useState(false);
  const handleCheckboxChange = (event) => {
    setIsYearly(event.target.checked);
  };
  return (
    <section className="layout-pt-lg layout-pb-md">
      <div className="container">
        <div className="row justify-center text-center">
          <div className="col-auto">
            <div className="sectionTitle ">
              <h2 className="sectionTitle__title ">{bookingOptions.title}</h2>

              <p className="sectionTitle__text ">{bookingOptions.text}</p>
              <p className="text-14 text-light-1 mt-10">{bookingOptions.example}</p>
            </div>

            <div className="d-flex justify-center items-center pt-60 lg:pt-40">
              <div className="text-14 text-dark-1">{bookingOptions.toggleLeft}</div>
              <div className="form-switch px-20">
                <div className="switch" data-switch=".js-switch-content">
                  <input
                    checked={isYearly}
                    onChange={handleCheckboxChange}
                    type="checkbox"
                  />
                  <span className="switch__slider"></span>
                </div>
              </div>
              <div className="text-14 text-dark-1">
                {bookingOptions.toggleRight} <span className="text-purple-1">{bookingOptions.toggleNote}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="row y-gap-30 justify-between pt-60 lg:pt-40">
          <div className="col-lg-4 col-md-6">
            <div className="priceCard -type-1 rounded-16 bg-white shadow-2">
              <div className="priceCard__content py-45 px-60 xl:px-40 text-center">
                <div className="priceCard__type text-18 lh-11 fw-500 text-dark-1">
                  {pricingData[0].type}
                </div>
                <div className="priceCard__price text-45 lh-11 fw-700 text-dark-1 mt-15">
                  £{isYearly ? (pricingData[0].price * 0.9).toFixed(0) : pricingData[0].price}
                </div>
                <div className="priceCard__period">{pricingData[0].period}</div>
                <Image
                  width={90}
                  height={90}
                  className="mt-30"
                  src="/assets/img/pricing/1.svg"
                  alt="icon"
                />
                <div className="priceCard__text text-left pr-15 mt-40">
                  {pricingData[0].text}
                </div>

                <div className="text-left y-gap-15 mt-35">
                  {pricingData[0].features.map((elm, i) => (
                    <div key={i}>
                      <i
                        className="text-purple-1 fa fa-check pr-8"
                        style={{ strokeWidth: 2 }}
                        data-feather="check"
                      ></i>
                      {elm}
                    </div>
                  ))}
                </div>

                <div className="d-inline-block mt-30">
                  <Link
                    className="button px-40 py-20 fw-500 -purple-3 text-purple-1"
                    href="/template/course-checkout"
                  >
                    Book {pricingData[0].type}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4 col-md-6">
            <div className="priceCard -type-1 rounded-16 bg-white shadow-2">
              <div className="priceCard__content py-45 px-60 xl:px-40 text-center">
                <div className="priceCard__type text-18 lh-11 fw-500 text-dark-1">
                  {pricingData[1].type}
                </div>
                <div className="priceCard__price text-45 lh-11 fw-700 text-dark-1 mt-15">
                  £
                  {isYearly
                    ? (pricingData[1].price * 0.9).toFixed(0)
                    : pricingData[1].price}
                </div>
                <div className="priceCard__period">
                  {pricingData[1].period}
                </div>
                <Image
                  width={90}
                  height={90}
                  className="mt-30"
                  src="/assets/img/pricing/2.svg"
                  alt="icon"
                />
                <div className="priceCard__text text-left pr-15 mt-40">
                  {pricingData[1].text}
                </div>

                <div className="text-left y-gap-15 mt-35">
                  {pricingData[1].features.map((elm, i) => (
                    <div key={i}>
                      <i
                        className="text-purple-1 fa fa-check pr-8"
                        style={{ strokeWidth: 2 }}
                        data-feather="check"
                      ></i>
                      {elm}
                    </div>
                  ))}
                </div>

                <div className="d-inline-block mt-30">
                  <Link
                    className="button px-40 py-20 fw-500 -purple-3 text-purple-1"
                    href="/template/course-checkout"
                  >
                    Book {pricingData[1].type}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4 col-md-6">
            <div className="priceCard -type-1 rounded-16 bg-white shadow-2">
              <div className="priceCard__content py-45 px-60 xl:px-40 text-center">
                <div className="priceCard__type text-18 lh-11 fw-500 text-dark-1">
                  {pricingData[2].type}
                </div>
                <div className="priceCard__price text-45 lh-11 fw-700 text-dark-1 mt-15">
                  £
                  {isYearly
                    ? (pricingData[2].price * 0.9).toFixed(0)
                    : pricingData[2].price}
                </div>
                <div className="priceCard__period">
                  {pricingData[2].period}
                </div>
                <Image
                  width={90}
                  height={90}
                  className="mt-30"
                  src="/assets/img/pricing/3.svg"
                  alt="icon"
                />
                <div className="priceCard__text text-left pr-15 mt-40">
                  {pricingData[2].text}
                </div>

                <div className="text-left y-gap-15 mt-35">
                  {pricingData[2].features.map((elm, i) => (
                    <div key={i}>
                      <i
                        className="text-purple-1 fa fa-check pr-8"
                        style={{ strokeWidth: 2 }}
                        data-feather="check"
                      ></i>
                      {elm}
                    </div>
                  ))}
                </div>

                <div className="d-inline-block mt-30">
                  <Link
                    className="button px-40 py-20 fw-500 -purple-3 text-purple-1"
                    href="/template/course-checkout"
                  >
                    Book {pricingData[2].type}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
