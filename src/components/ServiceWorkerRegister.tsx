"use client";

import { useEffect } from "react";

type Props = Record<string, never>;

// PWA用の Service Worker を登録
const ServiceWorkerRegister: React.FC<Props> = () => {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      const unregister = async (): Promise<void> => {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
        } catch (error) {
          console.error("Failed to unregister service workers:", error);
        }
      };

      void unregister();
      return;
    }

    const register = async (): Promise<void> => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (error) {
        console.error("Failed to register service worker:", error);
      }
    };

    void register();
  }, []);

  return null;
};

export default ServiceWorkerRegister;
