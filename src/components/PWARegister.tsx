"use client";
 
import { useEffect } from "react";
 
export function PWARegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      (window as any).workbox === undefined
    ) {
      const registerSW = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("[Service Worker] Registered successfully:", reg.scope);
          })
          .catch((err) => {
            console.warn("[Service Worker] Registration failed:", err);
          });
      };
 
      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
        return () => window.removeEventListener("load", registerSW);
      }
    }
  }, []);
 
  return null;
}
