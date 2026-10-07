'use client'

import { coursesData } from "@/data/courses";
import { events } from "@/data/events";
import { productData } from "@/data/products";
import React from "react";
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
                if (Array.isArray(saved.courses)) setCartCourses(saved.courses)
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
    const addCourseToCart = (id, course)=>{

        if (!cartCourses.filter((elm)=>elm.id == id)[0]) {

           const item = {...(course || coursesData.filter(elm=>elm.id == id)[0]),quantity:1}
           setCartCourses(pre=>[...pre,item])
            
        }

    }
    const isAddedToCartCourses = (id)=>{
        if (cartCourses.filter((elm)=>elm.id == id)[0]) {
            return true
         }
         return false

    }
    const addProductToCart = (id)=>{

        if (!cartProducts.filter((elm)=>elm.id == id)[0]) {

           const item = {...productData.filter(elm=>elm.id == id)[0],quantity:1}
           setCartProducts(pre=>[...pre,item])
            
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

           const item = {...events.filter(elm=>elm.id == id)[0],quantity:1}
           setCartEvents(pre=>[...pre,item])
            
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