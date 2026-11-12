'use client'

import React from "react";
import { lineKey, maxDelegates, mergeLines } from "@/lib/basket";
import { isDay } from "@/lib/format";
import { useContext ,useEffect ,useRef ,useState } from "react";
const dataContext = React.createContext();
export const useContextElement = () => {

    return useContext(dataContext);
  };

  export default function Context({ children }) {
    const [cartCourses, setCartCourses] = useState([])

    // The basket survives a refresh: read it once after mount (so the server and first client render match), then save every change.
    const CART_KEY = "rt-cart"
    const cartLoaded = useRef(false)
    useEffect(() => {
        try {
            const saved = JSON.parse(window.localStorage.getItem(CART_KEY) || "null")
            if (saved) {
                // a line from the old sample catalogue (course numbers below 1000, no address) can't be booked: it is dropped, and so is
                // one whose date isn't a real day (an older saved shape or a hand edit)
                // and one saved with a course page package as an `add` on the date's price takes that package's price instead
                const fresh = (c) => (c.bundle?.add > 0 && !c.packages ? { ...c, price: Math.round((Number(c.price) + c.bundle.add) * 100) / 100, wasPrice: null, bundle: { key: c.bundle.key, name: c.bundle.name } } : c)
                if (Array.isArray(saved.courses)) setCartCourses(mergeLines(saved.courses.filter((c) => c && Number(c.id) >= 1000 && c.slug && (c.date == null || isDay(c.date))).map(fresh)))
            }
        } catch {}
        cartLoaded.current = true
    }, [])
    useEffect(() => {
        if (!cartLoaded.current) return
        try {
            window.localStorage.setItem(CART_KEY, JSON.stringify({ courses: cartCourses }))
        } catch {}
    }, [cartCourses])
    // A basket line is a course on one date (lib/basket.js lineKey): the same course can be added on two dates, never twice on one,
    // and a dated line replaces the course's undated one (mergeLines).
    const addCourseToCart = (id, course)=>{
        const found = course
        // the delegates chosen with the date (the dates pop-up's counter), 1 otherwise; the same date already in the basket gets them
        // added to its line (as Hurak's), up to the date's places
        const quantity = Math.min(maxDelegates(found), Math.max(1, Number(found.quantity) || 1))
        const item = {...found,quantity}
        setCartCourses(pre=>pre.some((elm)=>lineKey(elm) === lineKey(item)) ? pre.map((elm)=>lineKey(elm) === lineKey(item) ? {...elm,quantity:Math.min(maxDelegates(elm),(Number(elm.quantity) || 1) + quantity)} : elm) : mergeLines([...pre,item]))
    }
    // With a session id: is that date in the basket. Without: is the course in it on any date. With a package key (lib/basket.js
    // bundleOf): that date with that package ("" for none).
    const isAddedToCartCourses = (id, sessionId, bundleKey)=>{
        return cartCourses.some((elm)=>elm.id == id && (sessionId === undefined || (elm.sessionId || "") === sessionId) && (bundleKey === undefined || (elm.bundle?.key || "") === (bundleKey || "")))
    }
    const contextElement = {
        addCourseToCart,
        isAddedToCartCourses,
        cartCourses,
        setCartCourses,
      };
    return (
        <dataContext.Provider value={contextElement}>{children}</dataContext.Provider>
      );
  }