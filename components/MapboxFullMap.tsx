"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { X, Signpost, CaretLeft, PersonSimpleWalk, Car, List } from "@phosphor-icons/react";

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
  onGetDirections,
  routeData,
  onChangeRoute,
}: {
  spaces: Space[];
  myLocation: { lat: number; lng: number } | null;
  selectedSpaceName: string | null;
  selectedSpaceNames: string[];
  onClose: () => void;
  onGetDirections?: (space: Space) => void;
  routeData?: any;
  onChangeRoute?: () => void;
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
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: centerPoint as [number, number],
      zoom: 16,
    });

    // Draw route if routeData is provided
    if (routeData && mapRef.current) {
      const map = mapRef.current;

      map.on('load', () => {
        if (!map.getSource('route')) {
          map.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: routeData.geometry
            }
          });

          map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': routeData.mode === 'walking' ? '#2F80ED' : routeData.mode === 'driving' ? '#DD6616' : '#006947',
              'line-width': 4,
              'line-opacity': 0.8
            }
          });

          const coordinates = routeData.geometry.coordinates;
          const bounds = coordinates.reduce((bounds: any, coord: any) => {
            return bounds.extend(coord);
          }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

          map.fitBounds(bounds, {
            padding: { top: 100, bottom: 100, left: 50, right: 50 }
          });
        }
      });
    }

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

      // Add user location marker (#2F80EA with pulse)
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
        
        const color = isSelected ? "#DD6616" : "#2B5B2F";

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
  }, [spaces, myLocation, selectedSpaceName, selectedSpaceNames, routeData]);

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

          {/* Breadcrumb */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: "8px 12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 500,
              color: "#02301F",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              zIndex: 10,
            }}
            className="btn-text"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f5f5f5";
              e.currentTarget.style.borderColor = "#006947";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.borderColor = "#ddd";
            }}
          >
            <CaretLeft size={16} weight="bold" />
            Back to spaces
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: 10002,
              padding: "10px 12px",
              background: "#006947",
              color: "#fff",
              border: "1px solid #006947",
              borderRadius: 10,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <X size={20} weight="bold" />
          </button>

          {/* Route Info Card */}
          {routeData && (
            <div
              style={{
                position: "absolute",
                top: 70,
                left: 16,
                right: 16,
                maxWidth: 400,
                background: "#fff",
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                zIndex: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {routeData.mode === 'walking' && <PersonSimpleWalk size={24} weight="regular" color="#006947" />}
                  {routeData.mode === 'driving' && <Car size={24} weight="regular" color="#006947" />}
                  {routeData.mode === 'transit' && <Car size={24} weight="regular" color="#006947" />}
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#02301F", fontFamily: "var(--font-fraunces), serif" }}>
                      {routeData.mode === 'walking' ? 'Walking' : routeData.mode === 'driving' ? 'Driving' : 'Transit'} to {routeData.destinationName}
                    </div>
                    <div style={{ fontSize: 14, color: "#555", marginTop: 2 }}>
                      {Math.round(routeData.duration / 60)} min · {(routeData.distance / 1000).toFixed(1)} km
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={onChangeRoute}
                className="btn-text"
                style={{
                  padding: "6px 0",
                  fontSize: 13,
                  color: "#006947",
                  textDecoration: "underline",
                  marginTop: 0,
                }}
              >
                Change route
              </button>
            </div>
          )}

          {/* Map Legend */}
          <div
            style={{
              position: "absolute",
              top: routeData ? 220 : 70,
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
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#F88912", flexShrink: 0 }}></div>
              <span>Your location</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#2B5B2F", flexShrink: 0 }}></div>
              <span>Dog spaces</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#DD6616", flexShrink: 0 }}></div>
              <span>Selected space</span>
            </div>
          </div>

          {/* Get Directions Button - Only show when no route */}
          {!routeData && selectedSpaceName && onGetDirections && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                const selectedSpace = spaces.find(s => s.name === selectedSpaceName);
                if (selectedSpace && onGetDirections) {
                  onGetDirections(selectedSpace);
                }
              }}
              style={{
                position: "absolute",
                top: "calc(70px + 90px + 32px)",
                left: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: 600,
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                zIndex: 10,
                whiteSpace: "nowrap",
              }}
            >
              <Signpost size={20} weight="regular" />
              Get directions
            </button>
          )}
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
