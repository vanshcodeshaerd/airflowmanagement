import { useEffect, useRef } from "react";

const SCRIPT_ID = "google-maps-js";
const CALLBACK_NAME = "__initGoogleMapsForAirports";

let loadPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).google?.maps) return Promise.resolve();
  if (loadPromise) return loadPromise;

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
  if (!key) return Promise.reject(new Error("Google Maps browser key missing"));

  loadPromise = new Promise((resolve, reject) => {
    (window as any)[CALLBACK_NAME] = () => resolve();
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=${CALLBACK_NAME}${channel ? `&channel=${channel}` : ""}`;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return loadPromise;
}

interface Props {
  lat: number;
  lng: number;
  label: string;
}

export function AirportMap({ lat, lng, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !ref.current) return;
        const g = (window as any).google;
        const map = new g.maps.Map(ref.current, {
          center: { lat, lng },
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        new g.maps.Marker({ position: { lat, lng }, map, title: label });
      })
      .catch((e) => {
        if (ref.current) {
          ref.current.innerHTML = `<div style="padding:16px;font-size:13px;color:#666;">Map unavailable: ${e.message}</div>`;
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng, label]);

  return <div ref={ref} className="w-full h-64 bg-muted" />;
}
