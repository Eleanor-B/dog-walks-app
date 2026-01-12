"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { X, Signpost, CaretLeft, PersonSimpleWalk, Car, List } from "@phosphor-icons/react";
import CollapsibleLegend from "./CollapsibleLegend";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

type Space = {
  name: string;
  lat: number;
  lng: number;
  fenced: boolean;
  unfenced: boolean;
  partFenced: boolean;
  bins: boolean;
  toilets: boolean;
  coffee: boolean;
  parking: boolean;
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
  const [isNavigating, setIsNavigating] = useState(false);
  const [liveDistance, setLiveDistance] = useState<number | null>(null);
  const [liveDuration, setLiveDuration] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Calculate distance between two points in meters
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000; // Earth's radius in meters
    const toRad = (n: number) => (n * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  };

  // Start navigation with live tracking
  const startNavigation = () => {
    if (!routeData || !myLocation) return;

    setIsNavigating(true);

    // Start watching user's position
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const currentLat = position.coords.latitude;
          const currentLng = position.coords.longitude;
          const destLat = routeData.destination.lat;
          const destLng = routeData.destination.lng;

          // Calculate remaining distance
          const distanceMeters = calculateDistance(currentLat, currentLng, destLat, destLng);
          setLiveDistance(distanceMeters);

          // Estimate duration based on mode and distance
          let speedMps; // meters per second
          if (routeData.mode === 'walking') {
            speedMps = 1.4; // ~5 km/h walking speed
          } else if (routeData.mode === 'driving') {
            speedMps = 13.9; // ~50 km/h average city driving
          } else {
            speedMps = 8.3; // ~30 km/h for transit
          }
          const durationSeconds = distanceMeters / speedMps;
          setLiveDuration(durationSeconds);
        },
        (error) => {
          console.error('Error watching position:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    }
  };

  // Stop navigation
  const stopNavigation = () => {
    setIsNavigating(false);
    setLiveDistance(null);
    setLiveDuration(null);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

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

      // Add user location marker (#31A6FF blue with pulse)
      if (myLocation) {
        const el = document.createElement("div");
        el.style.width = "20px";
        el.style.height = "20px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor = "#31A6FF";
        el.style.border = "3px solid white";
        el.style.boxShadow = "0 0 10px rgba(49, 166, 255, 0.5)";
        el.style.animation = "pulse 2s ease-in-out infinite";

        const popup = new mapboxgl.Popup({ 
          offset: 25,
          closeButton: false,
          className: "custom-popup"
        }).setHTML(`
          <div style="background: #E8F5FE; padding: 8px 12px; border-radius: 6px; border: none;">
            <strong style="color: #1976D2;">Your location</strong>
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

          {/* Back to spaces Button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              padding: "10px 12px",
              background: "#fff",
              color: "#02301F",
              border: "1px solid #ddd",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              zIndex: 10,
            }}
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
              padding: "10px 12px",
              background: "#006947",
              color: "#fff",
              border: "1px solid #006947",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              zIndex: 10002,
            }}
          >
            <X size={16} weight="bold" />
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
                marginBottom: 16,
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
                      {isNavigating && liveDistance !== null && liveDuration !== null ? (
                        <>
                          {Math.round(liveDuration / 60)} min · {(liveDistance / 1000).toFixed(1)} km remaining
                        </>
                      ) : (
                        <>
                          {Math.round(routeData.duration / 60)} min · {(routeData.distance / 1000).toFixed(1)} km
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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

                <button
                  type="button"
                  onClick={isNavigating ? stopNavigation : startNavigation}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    marginTop: 0,
                    background: isNavigating ? "#DC2626" : "#006947",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isNavigating ? "#B91C1C" : "#004d33";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isNavigating ? "#DC2626" : "#006947";
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: "rotate(0deg)" }}>
                    <path d="M8 2L8 14M8 2L4 6M8 2L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {isNavigating ? 'Exit' : 'Start'}
                </button>
              </div>
            </div>
          )}

          {/* Collapsible Map Legend */}
          <CollapsibleLegend 
            top={routeData ? 240 : 80}
            left={16}
            showSelected={true}
          />

          {/* Get Directions Button */}
          {!routeData && selectedSpaceName && onGetDirections && (
            <button
              type="button"
              onClick={() => {
                const selectedSpace = spaces.find(s => s.name === selectedSpaceName);
                if (selectedSpace && onGetDirections) {
                  onGetDirections(selectedSpace);
                }
              }}
              style={{
                position: "absolute",
                top: 16,
                right: 68,
                padding: "10px 12px",
                background: "#006947",
                color: "#fff",
                border: "1px solid #006947",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                zIndex: 10002,
                whiteSpace: "nowrap",
              }}
            >
              <Signpost size={16} weight="regular" />
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
