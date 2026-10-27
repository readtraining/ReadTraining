'use client'

import React from "react";
import { lineKey, mergeLines } from "@/lib/basket";
import { useContext ,useEffect ,useRef ,useState } from "react";
const dataContext = React.createContext();
export const useContextElement = () => {

    return useContext(dataContext);
  };

  export default function Context({ children }) {
    const [cartProducts, setCartProducts] = useState([])
  
    const [cartCourses, setCartCourses] = useState([])
    const [cartEvents, setCartEvents] = useState([])

    // The basket survives a refresh: read it once after mount (so the server and first client render match), then save every change.
    const CART_KEY = "rt-cart"
    const cartLoaded = useRef(false)
    useEffect(() => {
        try {
            const saved = JSON.parse(window.localStorage.getItem(CART_KEY) || "null")
            if (saved) {
                // a line from the old sample catalogue (course numbers below 1000, no address) can't be booked: it is dropped
                if (Array.isArray(saved.courses)) setCartCourses(mergeLines(saved.courses.filter((c) => Number(c.id) >= 1000 && c.slug)))
                if (Array.isArray(saved.products)) setCartProducts(saved.products)
                if (Array.isArray(saved.events)) setCartEvents(saved.events)
            }
        } catch {}
        cartLoaded.current = true
    }, [])
    useEffect(() => {
        if (!cartLoaded.current) return
        try {
            window.localStorage.setItem(CART_KEY, JSON.stringify({ courses: cartCourses, products: cartProducts, events: cartEvents }))
        } catch {}
    }, [cartCourses, cartProducts, cartEvents])
    // A basket line is a course on one date (lib/basket.js lineKey): the same course can be added on two dates, never twice on one,
    // and a dated line replaces the course's undated one (mergeLines).
    // Our pages always pass the course. Only the template's demo pages pass an id alone: their data loads on demand, so it is not
    // part of every page's download (the same for the template's shop products and events below).
    const addCourseToCart = async (id, course)=>{
        const found = course || (await import("@/data/courses")).coursesData.filter(elm=>elm.id == id)[0]
        const item = {...found,quantity:1}
        setCartCourses(pre=>pre.some((elm)=>lineKey(elm) === lineKey(item)) ? pre : mergeLines([...pre,item]))
    }
    // With a session id: is that date in the basket. Without: is the course in it on any date.
    const isAddedToCartCourses = (id, sessionId)=>{
        return cartCourses.some((elm)=>elm.id == id && (sessionId === undefined || (elm.sessionId || "") === sessionId))
    }
    const addProductToCart = (id)=>{

        if (!cartProducts.filter((elm)=>elm.id == id)[0]) {

           import("@/data/products").then(({ productData })=>{
             const item = {...productData.filter(elm=>elm.id == id)[0],quantity:1}
             setCartProducts(pre=>pre.some((elm)=>elm.id == id) ? pre : [...pre,item])
           })
            
        }

    }
    const isAddedToCartProducts = (id)=>{
        if (cartProducts.filter((elm)=>elm.id == id)[0]) {
            return true
         }
         return false

    }
    const addEventToCart = (id)=>{

        if (!cartEvents.filter((elm)=>elm.id == id)[0]) {

           import("@/data/events").then(({ events })=>{
             const item = {...events.filter(elm=>elm.id == id)[0],quantity:1}
             setCartEvents(pre=>pre.some((elm)=>elm.id == id) ? pre : [...pre,item])
           })
            
        }

    }
    const isAddedToCartEvents = (id)=>{
        if (cartEvents.filter((elm)=>elm.id == id)[0]) {
            return true
         }
         return false

    }

    const contextElement = {
        
        cartProducts,
        setCartProducts,
        addProductToCart,
        isAddedToCartProducts,


        addCourseToCart,
        isAddedToCartCourses,
        cartCourses,
        setCartCourses,


        cartEvents,
        setCartEvents,
        addEventToCart,
        isAddedToCartEvents

      };
    return (
        <dataContext.Provider value={contextElement}>{children}</dataContext.Provider>
      );
  }