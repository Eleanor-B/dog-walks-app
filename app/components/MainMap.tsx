"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import type { Park } from "../page";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

type Location = {
  lat: number;
  lng: number;
};

type RouteInfo = {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  mode: "walking" | "driving" | "transit";
};

type Props = {
  center: Location;
  zoom: number;
  parks: Park[];
  userLocation: Location | null;
  selectedPark?: Park | null;
  onParkClick?: (park: Park) => void;
  onMapMove?: (center: Location, zoom: number) => void;
  onPinDrop?: (location: Location) => void;
  isPinDropMode?: boolean;
  filters: {
    fenced: boolean;
    unfenced: boolean;
    partFenced: boolean;
    bins: boolean;
    toilets: boolean;
    coffee: boolean;
    parking: boolean;
  };
  route?: RouteInfo | null;
};

export default function MainMap({
  center,
  zoom,
  parks,
  userLocation,
  selectedPark,
  onParkClick,
  onMapMove,
  onPinDrop,
  isPinDropMode = false,
  filters,
  route,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const activePopupRef = useRef<mapboxgl.Popup | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const pinDropMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number): number => {
    const R = 6371;
    const toRad = (n: number) => (n * Math.PI) / 180;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const lat1 = toRad(aLat);
    const lat2 = toRad(bLat);
    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * c;
  };

  const [pinDropLocation, setPinDropLocation] = useState<Location | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map - runs once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [center.lng, center.lat],
      zoom: zoom,
    });

    map.addControl(new mapboxgl.NavigationControl(), "bottom-right");

    map.on("load", () => {
      setMapLoaded(true);

      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        },
      });

      map.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#2F80EA", "line-width": 5, "line-opacity": 0.8 },
      });
    });

    mapRef.current = map;

    // Close popup when clicking map background
    map.on("click", (e) => {
      // Only close if clicking on the map itself, not on a marker
      const target = e.originalEvent.target as HTMLElement;
      if (target.classList.contains("mapboxgl-canvas")) {
        if (activePopupRef.current) {
          activePopupRef.current.remove();
          activePopupRef.current = null;
        }
      }
    });

    map.on("moveend", () => {
      const mapCenter = map.getCenter();
      const mapZoom = map.getZoom();
      if (onMapMove) {
        onMapMove({ lat: mapCenter.lat, lng: mapCenter.lng }, mapZoom);
      }
    });

    if (isPinDropMode) {
      map.on("click", (e) => {
        setPinDropLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update route
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const source = mapRef.current.getSource("route") as mapboxgl.GeoJSONSource;
    if (!source) return;

    if (route && route.coordinates.length > 0) {
      source.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: route.coordinates },
      });
      const bounds = route.coordinates.reduce(
        (b, coord) => b.extend(coord as [number, number]),
        new mapboxgl.LngLatBounds(route.coordinates[0], route.coordinates[0])
      );
      mapRef.current.fitBounds(bounds, {
        padding: { top: 100, bottom: 150, left: 50, right: 50 },
        duration: 1000,
      });
    } else {
      source.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
      });
    }
  }, [route, mapLoaded]);

  // Update center
  useEffect(() => {
    if (mapRef.current && center && !route) {
      mapRef.current.flyTo({ center: [center.lng, center.lat], zoom, duration: 1000 });
    }
  }, [center.lat, center.lng]);

  // Pin drop marker
  useEffect(() => {
    if (!mapRef.current || !isPinDropMode) return;
    if (pinDropMarkerRef.current) pinDropMarkerRef.current.remove();
    if (pinDropLocation) {
      const el = document.createElement("div");
      el.className = "pin-drop-marker";
      el.innerHTML = `<svg width="32" height="40" viewBox="0 0 32 40" fill="none"><path d="M16 0C7.164 0 0 7.164 0 16c0 12 16 24 16 24s16-12 16-24C32 7.164 24.836 0 16 0z" fill="#006947"/><circle cx="16" cy="16" r="6" fill="white"/></svg>`;
      pinDropMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([pinDropLocation.lng, pinDropLocation.lat])
        .addTo(mapRef.current);
    }
  }, [pinDropLocation, isPinDropMode]);

  // User location marker
  useEffect(() => {
    if (!mapRef.current) return;
    if (userMarkerRef.current) userMarkerRef.current.remove();
    if (userLocation) {
      const el = document.createElement("div");
      el.className = "user-location-marker";
      el.innerHTML = `<div class="user-dot"></div><div class="user-dot-pulse"></div>`;
      userMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(mapRef.current);
    }
  }, [userLocation]);

  // Park markers - only recreate when parks change, NOT when selectedPark changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Close any open popup
    if (activePopupRef.current) {
      activePopupRef.current.remove();
      activePopupRef.current = null;
    }

    parks.forEach((park) => {
      const hasUserData = !park.isAutoDiscovered || park.fenced || park.unfenced ||
        park.partFenced || park.bins || park.toilets || park.coffee || park.parking;

      const distance = userLocation
        ? distanceKm(userLocation.lat, userLocation.lng, park.lat, park.lng)
        : null;

      const el = document.createElement("div");
      el.className = `park-marker ${hasUserData ? "has-data" : ""}`;
      const pinColor = hasUserData ? "#006947" : "#4CAF50";

      el.innerHTML = `<svg width="28" height="36" viewBox="0 0 28 36" fill="none"><path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="${pinColor}"/><circle cx="14" cy="14" r="5" fill="white"/>${hasUserData ? `<circle cx="14" cy="14" r="2" fill="${pinColor}"/>` : ""}</svg>`;

      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        anchor: "bottom",
        offset: [0, -36],
        className: "park-popup",
      }).setHTML(`<div class="map-popup-content"><div class="popup-name">${park.name}</div>${distance !== null ? `<div class="popup-distance">${distance.toFixed(1)} km away</div>` : ""}</div>`);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([park.lng, park.lat])
        .addTo(mapRef.current!);

      el.addEventListener("click", (e) => {
        e.stopPropagation();

        // Close existing popup
        if (activePopupRef.current) {
          activePopupRef.current.remove();
        }

        // Open bottom sheet first
        if (onParkClick) {
          onParkClick(park);
        }

        // Show popup after short delay
        setTimeout(() => {
          if (mapRef.current) {
            popup.setLngLat([park.lng, park.lat]).addTo(mapRef.current);
            activePopupRef.current = popup;
          }
        }, 50);
      });

      markersRef.current.push(marker);
    });
  }, [parks, userLocation]);

  const handleConfirmPinDrop = () => {
    if (pinDropLocation && onPinDrop) onPinDrop(pinDropLocation);
  };

  return (
    <div className="map-container">
      <div ref={mapContainerRef} className="map" />
      {isPinDropMode && pinDropLocation && (
        <button className="btn-primary confirm-pin-btn" onClick={handleConfirmPinDrop}>
          Confirm this location
        </button>
      )}
    </div>
  );
}