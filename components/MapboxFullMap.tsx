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
  selectedSpaceName,
  selectedSpaceNames,
  onClose,
}: {
  spaces: Space[];
  myLocation: { lat: number; lng: number } | null;
  selectedSpaceName: string | null;
  selectedSpaceNames: string[];
  onClose: () => void;
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

    // Determine center - prioritize selected space, then first space, then user location, then London
    let centerPoint: [number, number];
    
    if (selectedSpaceName) {
      // Find the selected space and center on it
      const selectedSpace = spaces.find(s => s.name === selectedSpaceName);
      if (selectedSpace) {
        centerPoint = [selectedSpace.lng, selectedSpace.lat];
      } else {
        // Fallback if selected space not found
        centerPoint = spaces.length > 0 
          ? [spaces[0].lng, spaces[0].lat]
          : myLocation
          ? [myLocation.lng, myLocation.lat]
          : [-0.1276, 51.5072];
      }
    } else {
      centerPoint = spaces.length > 0 
        ? [spaces[0].lng, spaces[0].lat]
        : myLocation
        ? [myLocation.lng, myLocation.lat]
        : [-0.1276, 51.5072];
    }

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: centerPoint as [number, number],
      zoom: 16,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Click map background to close all popups
    mapRef.current.on('click', () => {
      markersRef.current.forEach(marker => {
        const popup = marker.getPopup();
        if (popup && popup.isOpen()) {
          marker.togglePopup();
        }
      });
    });

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

      // Add space markers
      spaces.forEach((space) => {
        if (!mapRef.current) return;

        const isSelectedByCheckbox = selectedSpaceNames.includes(space.name);
        const isSelectedByRow = selectedSpaceName === space.name;
        const isSelected = isSelectedByCheckbox || isSelectedByRow;
        
        const color = isSelected ? "#22c55e" : "#507153";

        const popupBg = isSelected ? "#dcfce7" : "#f3f4f6";
        const textColor = isSelected ? "#166534" : "#111";

        const popupClass = isSelected ? "custom-popup selected-popup" : "custom-popup unselected-popup";
        
        const popup = new mapboxgl.Popup({ 
          offset: 50,
          closeButton: false,
          closeOnClick: false,
          className: popupClass
        }).setHTML(`
          <div style="background: ${popupBg}; padding: 8px 12px; border-radius: 6px; border: none;">
            <strong style="color: ${textColor};">${space.name}</strong>
          </div>
        `);
        const marker = new mapboxgl.Marker({ 
          color,
          anchor: 'bottom'
        })
          .setLngLat([space.lng, space.lat])
          .setPopup(popup)
          .addTo(mapRef.current!);

        // Show popup by default
        popup.addTo(mapRef.current!);

        markersRef.current.push(marker);

        // Click pin to toggle popup
        const markerEl = marker.getElement();
        markerEl.addEventListener("click", (e) => {
          e.stopPropagation();
          marker.togglePopup();
        });
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
              top: 8,
              right: 16,
              zIndex: 10002,
              padding: "10px 12px",
              background: "#006947",
              color: "#fff",
              border: "1px solid #006947",
              borderRadius: 10,
              fontWeight: 600,
            }}
          >
            Close
          </button>
         {/* Map Legend */}
         <div
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              background: "rgba(255, 255, 255, 0.95)",
              borderRadius: 8,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              fontSize: 12,
              fontFamily: "var(--font-dm-sans), sans-serif",
              color: "#000",
              zIndex: 10001,
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
        </div>
      </div>
      
      <style>{`
        .mapboxgl-ctrl-top-right {
          top: 70px !important;
          right: 10px !important;
        }
      `}</style>
    </>
  );
}