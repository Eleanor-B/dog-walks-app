"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { X, Plus, Minus, Crosshair } from "@phosphor-icons/react";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

type Space = {
  name: string;
  lat: number;
  lng: number;
};

export default function MapboxFullMap({
  space,
  userLocation,
  selectedSpaceNames,
  allSpaces,
  zoom,
  onZoomIn,
  onZoomOut,
  onRecentre,
  onClose,
  isNavigating,
  transportMode,
}: {
  space: Space | null;
  userLocation: { lat: number; lng: number } | null;
  selectedSpaceNames: string[];
  allSpaces: Space[];
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecentre?: () => void;
  onClose: () => void;
  isNavigating: boolean;
  transportMode: string | null;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);


  // Recentre map on user location
  const handleRecentre = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 15,
        duration: 1000
      });
    }
  };
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    // Clean up existing map
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Determine center - prioritize space, then user location, then London
    let centerPoint: [number, number] = [-0.1276, 51.5072]; // London fallback
    
    if (userLocation) {
      centerPoint = [userLocation.lng, userLocation.lat];
    } else if (space) {
      centerPoint = [space.lng, space.lat];
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: centerPoint,
      zoom: zoom || 14,
    });

    mapRef.current = map;

    map.on("load", () => {
      console.log("MAP LOADED - userLocation:", userLocation);
      // Add user location marker (blue pulsing circle)
      if (userLocation) {
        const userEl = document.createElement("div");
        userEl.innerHTML = `
          <div style="
            width: 32px;
            height: 32px;
            background: #2F80EA;
            border: 4px solid white;
            border-radius: 50%;
            box-shadow: 0 0 0 8px rgba(47,128,234,0.3), 0 2px 8px rgba(0,0,0,0.3);
            animation: pulse 2s ease-in-out infinite;
          "></div>
        `;
        userEl.style.cssText = "cursor: pointer;";

        const userMarker = new mapboxgl.Marker({ element: userEl })
          .setLngLat([userLocation.lng, userLocation.lat])
          .addTo(map);
        
        userMarkerRef.current = userMarker;
      }

      // Add space marker (orange pin)
      if (userLocation) {
        const pinEl = document.createElement("div");
        pinEl.innerHTML = `
          <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 0C8.954 0 0 8.954 0 20c0 11.046 20 30 20 30s20-18.954 20-30c0-11.046-8.954-20-20-20z" fill="#DD6616"/>
            <circle cx="20" cy="18" r="8" fill="white"/>
          </svg>
        `;
        pinEl.style.cssText = "cursor: pointer; transform: translate(-50%, -100%);";

        // Create popup for space
        const popup = new mapboxgl.Popup({
          offset: [0, -50],
          closeButton: false,
          closeOnClick: false,
        }).setHTML(`
          <div style="
            padding: 10px 14px;
            background: #dcfce7;
            border-radius: 8px;
            font-family: system-ui, sans-serif;
            font-size: 14px;
            font-weight: 600;
            color: #006947;
            white-space: nowrap;
          ">
            ${space.name}
          </div>
        `);

        const marker = new mapboxgl.Marker({ element: pinEl })
          .setLngLat([space.lng, space.lat])
          .setPopup(popup)
          .addTo(map);

        // Show popup by default
        popup.addTo(map);

        markersRef.current.push(marker);
      }

      console.log("DIRECTIONS CHECK - isNavigating:", isNavigating, "transportMode:", transportMode);
      // Draw route if navigating and we have both locations
      if (isNavigating && userLocation && space && transportMode) {
        const profile = transportMode === "driving" ? "driving" : 
                       transportMode === "walking" ? "walking" : "driving";
        
        const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${userLocation.lng},${userLocation.lat};${space.lng},${space.lat}?geometries=geojson&access_token=${mapboxgl.accessToken}`;

        fetch(directionsUrl)
          .then((res) => res.json())
          .then((data) => {
            if (data.routes && data.routes[0]) {
              const route = data.routes[0].geometry;

              // Add route line to map
              if (map.getSource("route")) {
                (map.getSource("route") as mapboxgl.GeoJSONSource).setData({
                  type: "Feature",
                  properties: {},
                  geometry: route,
                });
              } else {
                map.addSource("route", {
                  type: "geojson",
                  data: {
                    type: "Feature",
                    properties: {},
                    geometry: route,
                  },
                });

                map.addLayer({
                  id: "route",
                  type: "line",
                  source: "route",
                  layout: {
                    "line-join": "round",
                    "line-cap": "round",
                  },
                  paint: {
                    "line-color": "#006947",
                    "line-width": 5,
                    "line-opacity": 0.8,
                  },
                });
              }

              // Fit map to show entire route
              const coordinates = route.coordinates;
              const bounds = coordinates.reduce(
                (bounds: mapboxgl.LngLatBounds, coord: [number, number]) => {
                  return bounds.extend(coord as mapboxgl.LngLatLike);
                },
                new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
              );

              map.fitBounds(bounds, {
                padding: { top: 100, bottom: 100, left: 50, right: 50 },
              });
            }
          })
          .catch((err) => {
            console.error("Error fetching directions:", err);
          });
      }
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
      }
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [space, userLocation, allSpaces, selectedSpaceNames, isNavigating, transportMode]);

  // Update zoom when it changes
  useEffect(() => {
    if (mapRef.current) {
      console.log("ZOOM UPDATE:", zoom, mapRef.current);
      mapRef.current.setZoom(zoom);
    }
  }, [zoom]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Add pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.7;
          }
        }
        .mapboxgl-popup-content {
          padding: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }
        .mapboxgl-popup-tip {
          border-top-color: #dcfce7 !important;
        }
      `}</style>

      {/* Map container */}
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      {/* Zoom controls */}
      <div
        style={{
          position: "absolute",
          top: "280px", /* ADJUST: Position below drawer initially */
          right: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <button
          onClick={() => mapRef.current?.zoomIn()}
          style={{
            width: 40,
            height: 40,
            background: "white",
            border: "none",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          <Plus size={20} weight="bold" color="#006947" />
        </button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          style={{
            width: 40,
            height: 40,
            background: "white",
            border: "none",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          <Minus size={20} weight="bold" color="#006947" />
        </button>
        <button
          onClick={handleRecentre}
          style={{
            width: 40,
            height: 40,
            background: "white",
            border: "none",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            marginTop: 8,
          }}
        >
          <Crosshair size={20} weight="bold" color="#006947" />
        </button>
      </div>


    </div>
  );
}
