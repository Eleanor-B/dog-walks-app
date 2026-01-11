"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { MapTrifold } from "@phosphor-icons/react";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

type Space = {
  name: string;
  lat: number;
  lng: number;
};

export default function MapboxEmbedded({
  spaces,
  myLocation,
  selectedSpaceName,
  selectedSpaceNames,
  onViewLargeMap,
}: {
  spaces: any[];
  myLocation: { lat: number; lng: number } | null;
  selectedSpaceName: string | null;
  selectedSpaceNames: string[];
  onViewLargeMap: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const bounds = new mapboxgl.LngLatBounds();

    if (myLocation) {
      bounds.extend([myLocation.lng, myLocation.lat]);
    }

    spaces.forEach((space) => {
      bounds.extend([space.lng, space.lat]);
    });

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      bounds: bounds.isEmpty() ? undefined : bounds,
      fitBoundsOptions: { padding: 40 },
    });

    mapRef.current = map;

    // User location marker
    if (myLocation) {
      const userEl = document.createElement("div");
      userEl.style.width = "16px";
      userEl.style.height = "16px";
      userEl.style.borderRadius = "50%";
      userEl.style.backgroundColor = "#F88912";
      userEl.style.border = "3px solid white";
      userEl.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
      userEl.className = "marker-pulse";

      new mapboxgl.Marker({ element: userEl })
        .setLngLat([myLocation.lng, myLocation.lat])
        .addTo(map);
    }

    // Space markers
    spaces.forEach((space) => {
      const isSelected = selectedSpaceName === space.name;
      const isInList = selectedSpaceNames.includes(space.name);

      const markerEl = document.createElement("div");
      markerEl.style.width = "32px";
      markerEl.style.height = "32px";
      markerEl.style.cursor = "pointer";
      markerEl.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 2C11.0294 2 7 6.02944 7 11C7 17.5 16 30 16 30C16 30 25 17.5 25 11C25 6.02944 20.9706 2 16 2Z" 
                fill="${isSelected ? "#DD6616" : "#006947"}" 
                stroke="white" 
                stroke-width="2"/>
          <circle cx="16" cy="11" r="4" fill="white"/>
        </svg>
      `;

      const popup = new mapboxgl.Popup({
        offset: 15,
        closeButton: false,
        closeOnClick: false,
        className: isInList ? "custom-popup selected-popup" : "custom-popup unselected-popup",
      }).setHTML(`
        <div style="
          padding: 8px 12px;
          background: ${isInList ? "#dcfce7" : "#f3f4f6"};
          border-radius: 6px;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: #02301F;
          white-space: nowrap;
        ">
          ${space.name}
        </div>
      `);

      const marker = new mapboxgl.Marker({ element: markerEl })
        .setLngLat([space.lng, space.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);

      markerEl.addEventListener("mouseenter", () => {
        marker.togglePopup();
      });

      markerEl.addEventListener("mouseleave", () => {
        marker.togglePopup();
      });
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
    };
  }, [spaces, myLocation, selectedSpaceName, selectedSpaceNames]);

  return (
    <div style={{ position: "relative", marginTop: 4, marginBottom: 0 }}>
      <div 
        ref={mapContainerRef} 
        style={{ 
          width: "100%", 
          height: 216, 
          borderRadius: 8, 
          border: "4px solid #fff", 
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          display: "block",
          margin: 0,
          padding: 0
        }} 
      />

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          background: "white",
          padding: "8px 12px",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          fontSize: 12,
          fontFamily: "var(--font-dm-sans), sans-serif",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: "#F88912",
                border: "2px solid white",
              }}
            />
            <span>Your location</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
              <path
                d="M16 2C11.0294 2 7 6.02944 7 11C7 17.5 16 30 16 30C16 30 25 17.5 25 11C25 6.02944 20.9706 2 16 2Z"
                fill="#006947"
                stroke="white"
                strokeWidth="2"
              />
              <circle cx="16" cy="11" r="4" fill="white" />
            </svg>
            <span>Dog space</span>
          </div>
        </div>
      </div>

      {/* View large map button */}
      <button
        onClick={onViewLargeMap}
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          background: "white",
          border: "none",
          padding: "8px 12px",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          cursor: "pointer",
          fontSize: 13,
          fontFamily: "var(--font-dm-sans), sans-serif",
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "#02301F",
          zIndex: 10,
        }}
      >
        <MapTrifold size={16} weight="regular" />
        View large map
      </button>
    </div>
  );
}
