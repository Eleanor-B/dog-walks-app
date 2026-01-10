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
    
    // Clean up existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Clean up existing map
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Determine center point
    const hasRowSelection = selectedSpaceName !== null;
    const selectedSpace = spaces.find((s) => s.name === selectedSpaceName);
    
    const centerPoint = hasRowSelection && selectedSpace
      ? [selectedSpace.lng, selectedSpace.lat]
      : myLocation
      ? [myLocation.lng, myLocation.lat]
      : [-0.1276, 51.5072];

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: centerPoint as [number, number],
      zoom: hasRowSelection ? 14 : myLocation ? 13 : 12,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Wait for map to load before adding markers
    mapRef.current.on('load', () => {
      if (!mapRef.current) return;

      // Add user location marker (orange with pulse)
      if (myLocation) {
        const el = document.createElement("div");
        el.style.width = "20px";
        el.style.height = "20px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor = "#F88912";
        el.style.border = "3px solid white";
        el.style.boxShadow = "0 0 10px rgba(248, 137, 18, 0.5)";
        el.style.animation = "pulse 2s ease-in-out infinite";

        const popup = new mapboxgl.Popup({ 
          offset: 25,
          closeButton: false,
          className: "custom-popup"
        }).setHTML(`
          <div style="background: #FEF3E7; padding: 8px 12px; border-radius: 6px; border: none;">
            <strong style="color: #C4690A;">Your location</strong>
          </div>
        `);

        const marker = new mapboxgl.Marker({ 
          element: el,
          anchor: 'center'
        })
          .setLngLat([myLocation.lng, myLocation.lat])
          .setPopup(popup)
          .addTo(mapRef.current!);

        markersRef.current.push(marker);

        // Show popup on hover
        el.addEventListener("mouseenter", () => marker.togglePopup());
        el.addEventListener("mouseleave", () => marker.togglePopup());
      }

      // Add space markers with custom colored pins
      spaces.forEach((space) => {
        if (!mapRef.current) return;

        const isSelectedByCheckbox = selectedSpaceNames.includes(space.name);
        const isSelectedByRow = selectedSpaceName === space.name;
        const isSelected = isSelectedByCheckbox || isSelectedByRow;
        
        const color = isSelected ? "#22c55e" : "#507153";

        const popupBg = isSelected ? "#dcfce7" : "#f3f4f6";
        const textColor = isSelected ? "#166534" : "#111";

        
        // Create custom pin element
        const el = document.createElement("div");
        el.innerHTML = `
          <svg width="27" height="41" viewBox="0 0 27 41" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.5 0C6.04416 0 0 6.04416 0 13.5C0 23.625 13.5 41 13.5 41C13.5 41 27 23.625 27 13.5C27 6.04416 20.9558 0 13.5 0Z" fill="${color}"/>
            <circle cx="13.5" cy="13.5" r="5" fill="white"/>
          </svg>
        `;
        el.style.width = "27px";
        el.style.height = "41px";
        el.style.cursor = "pointer";

        const popup = new mapboxgl.Popup({ 
          offset: 25,
          closeButton: false,
          className: "custom-popup"
        }).setHTML(`
          <div style="background: ${popupBg}; padding: 8px 12px; border-radius: 6px; border: none;">
            <strong style="color: ${textColor};">${space.name}</strong>
          </div>
        `);

        const marker = new mapboxgl.Marker({ 
          element: el,
          anchor: 'bottom'
        })
          .setLngLat([space.lng, space.lat])
          .setPopup(popup)
          .addTo(mapRef.current!);

      

        markersRef.current.push(marker);

        // Show popup on hover
        el.addEventListener("mouseenter", () => marker.togglePopup());
        el.addEventListener("mouseleave", () => marker.togglePopup());
      });
    });

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [spaces, myLocation, selectedSpaceName, selectedSpaceNames]);

  return (
    <div style={{ position: "relative", marginTop: 8 }}>
      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: 180,
          borderRadius: 8,
          border: "4px solid #fff",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        }}
      />
      
      {/* Map Legend */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          background: "rgba(255, 255, 255, 0.95)",
          borderRadius: 8,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontSize: 12,
          fontFamily: "var(--font-dm-sans), sans-serif",
          color: "#000",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "orange", flexShrink: 0 }}></div>
          <span>Your location</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgb(80, 113, 83)", flexShrink: 0 }}></div>
          <span>Nearby spaces</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgb(34, 197, 94)", flexShrink: 0 }}></div>
          <span>Your selected space</span>
          </div>
      </div>
      
      {/* View Large Map Button */}
      <button
        type="button"
        onClick={onViewLargeMap}
        style={{
          position: "absolute",
          bottom: 8,
          left: 8,
          background: "#fff",
          color: "#006947",
          border: "1px solid #ddd",
          borderRadius: 10,
          padding: "10px 10px",
          fontSize: 13,
          fontWeight: 500,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          zIndex: 10,
        }}
      >
        <MapTrifold size={16} weight="regular" />
        View large map
      </button>
    </div>
    
  );
}