"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

type Space = {
  name: string;
  lat: number;
  lng: number;
};

const animationStyles = (
  <style>{`
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `}</style>
);

export default function MapboxFullMap({
  spaces,
  myLocation,
  selectedSpaceNames,
  onClose,
}: {
  spaces: Space[];
  myLocation: { lat: number; lng: number } | null;
  selectedSpaceNames: string[];
  onClose: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const first = spaces[0];

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: first ? [first.lng, first.lat] : [-0.1276, 51.5072],
      zoom: 12,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add user location marker (blue)
    if (myLocation) {
      new mapboxgl.Marker({ color: "#3b82f6" })
        .setLngLat([myLocation.lng, myLocation.lat])
        .setPopup(new mapboxgl.Popup().setText("Your location"))
        .addTo(mapRef.current!);
    }

    // Add space markers
    spaces.forEach((space) => {
      const isSelected = selectedSpaceNames.includes(space.name);
      const color = isSelected ? "#22c55e" : "#111"; // Green if selected, black otherwise

      new mapboxgl.Marker({ color })
        .setLngLat([space.lng, space.lat])
        .setPopup(new mapboxgl.Popup().setText(space.name))
        .addTo(mapRef.current!);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [spaces, myLocation, selectedSpaceNames]);

  return (
    <>
      {animationStyles}

      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          zIndex: 10000,
          display: "flex",
          alignItems: "stretch",
          justifyContent: "stretch",
          padding: 0,
          animation: "fadeIn 160ms ease-out",
        }}
        onClick={onClose}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            background: "#fff",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.35)",
            boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
            overflow: "hidden",
            margin: 16,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

          <button
            type="button"
            onClick={onClose}
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              zIndex: 10001,
              padding: "10px 12px",
              background: "#111",
              color: "#fff",
              border: "1px solid #111",
              borderRadius: 10,
              fontWeight: 600,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}