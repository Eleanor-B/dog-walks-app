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
  initialPinDropLocation?: Location | null;
  pinDropColor?: string;
  /** When true, hide the bottom "Confirm this location" button (e.g. adjust-pin uses "Save location" at top) */
  hideConfirmPinButton?: boolean;
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
  boundsToFit?: [Location, Location] | undefined;
  fitBoundsRequestId?: number;
  /** Called when user clicks the map background (not a marker); parent can trigger fitBounds */
  onMapClick?: () => void;
  /** Called when map moveend and no parks are visible; parent can trigger fitBounds */
  onResultsOutsideViewport?: () => void;
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
  initialPinDropLocation = null,
  pinDropColor = "#006947",
  hideConfirmPinButton = false,
  filters,
  route,
  boundsToFit,
  fitBoundsRequestId = 0,
  onMapClick,
  onResultsOutsideViewport,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const activePopupRef = useRef<mapboxgl.Popup | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const pinDropMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const parksRef = useRef<Park[]>(parks);
  const onResultsOutsideViewportRef = useRef(onResultsOutsideViewport);
  const onMapClickRef = useRef(onMapClick);
  parksRef.current = parks;
  onResultsOutsideViewportRef.current = onResultsOutsideViewport;
  onMapClickRef.current = onMapClick;

  const hasValidCoords = (loc: { lat: number; lng: number } | null | undefined): boolean => {
    if (loc == null) return false;
    const { lat, lng } = loc;
    if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return false;
    if (lat === 0 && lng === 0) return false;
    return Number.isFinite(lat) && Number.isFinite(lng);
  };

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

  const [pinDropLocation, setPinDropLocation] = useState<Location | null>(initialPinDropLocation ?? null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // When opening adjust-place modal, pre-set pin to current place location
  useEffect(() => {
    if (isPinDropMode && initialPinDropLocation) {
      setPinDropLocation(initialPinDropLocation);
    } else if (isPinDropMode && !initialPinDropLocation) {
      setPinDropLocation(null);
    }
  }, [isPinDropMode, initialPinDropLocation?.lat, initialPinDropLocation?.lng]);

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

    // Close popup when clicking map background; notify parent so they can trigger fitBounds (not in pin-drop mode)
    map.on("click", (e) => {
      const target = e.originalEvent.target as HTMLElement;
      if (target.classList.contains("mapboxgl-canvas")) {
        if (activePopupRef.current) {
          activePopupRef.current.remove();
          activePopupRef.current = null;
        }
        if (!isPinDropMode) onMapClickRef.current?.();
      }
    });

    map.on("moveend", () => {
      const mapCenter = map.getCenter();
      const mapZoom = map.getZoom();
      if (onMapMove) {
        onMapMove({ lat: mapCenter.lat, lng: mapCenter.lng }, mapZoom);
      }
      const currentParks = parksRef.current;
      const onOut = onResultsOutsideViewportRef.current;
      if (onOut && currentParks.length > 0) {
        const bounds = map.getBounds();
        const anyVisible = currentParks.some((p) => bounds.contains([p.lng, p.lat]));
        if (!anyVisible) onOut();
      }
    });

    if (isPinDropMode) {
      map.on("click", (e) => {
        const loc = { lat: e.lngLat.lat, lng: e.lngLat.lng };
        setPinDropLocation(loc);
        if (onPinDrop) onPinDrop(loc);
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

  // Fit viewport only after map loaded, user location confirmed, and pins available (not during loading).
  const lastFitRequestIdRef = useRef(0);
  useEffect(() => {
    if (
      !mapRef.current ||
      !mapLoaded ||
      route ||
      fitBoundsRequestId <= lastFitRequestIdRef.current ||
      !boundsToFit
    )
      return;
    lastFitRequestIdRef.current = fitBoundsRequestId;
    const bounds = new mapboxgl.LngLatBounds()
      .extend([boundsToFit[0].lng, boundsToFit[0].lat])
      .extend([boundsToFit[1].lng, boundsToFit[1].lat]);
    mapRef.current.fitBounds(bounds, {
      padding: { top: 80, bottom: 120, left: 60, right: 60 },
      maxZoom: 14,
      duration: 1000,
    });
  }, [fitBoundsRequestId, boundsToFit, mapLoaded, route]);

  // Update center (skip in pin-drop mode so the map doesn’t jump when the user moves the pin)
  useEffect(() => {
    if (!mapRef.current || !center || route || isPinDropMode) return;
    mapRef.current.flyTo({ center: [center.lng, center.lat], zoom, duration: 1000 });
  }, [center.lat, center.lng, zoom, route, isPinDropMode]);

  // Pin drop marker – only mount when we have valid coordinates (avoids rogue marker at 0,0)
  useEffect(() => {
    if (!mapRef.current || !isPinDropMode) return;
    if (!mapLoaded && !pinDropMarkerRef.current) return;
    if (!pinDropLocation || !hasValidCoords(pinDropLocation)) {
      if (pinDropMarkerRef.current) {
        pinDropMarkerRef.current.remove();
        pinDropMarkerRef.current = null;
      }
      return;
    }
    const lng = pinDropLocation.lng;
    const lat = pinDropLocation.lat;
    if (lng == null || lat == null || Number.isNaN(lng) || Number.isNaN(lat) || (lat === 0 && lng === 0)) return;
    const lngLat = [lng, lat] as [number, number];
    if (pinDropMarkerRef.current) {
      pinDropMarkerRef.current.setLngLat(lngLat);
      return;
    }
    const el = document.createElement("div");
    el.className = "pin-drop-marker";
    const fill = pinDropColor.replace("#", "%23");
    el.innerHTML = `<svg width="32" height="40" viewBox="0 0 32 40" fill="none"><path d="M16 0C7.164 0 0 7.164 0 16c0 12 16 24 16 24s16-12 16-24C32 7.164 24.836 0 16 0z" fill="${pinDropColor}"/><circle cx="16" cy="16" r="6" fill="white"/></svg>`;
    pinDropMarkerRef.current = new mapboxgl.Marker(el)
      .setLngLat(lngLat)
      .addTo(mapRef.current);
  }, [pinDropLocation, isPinDropMode, pinDropColor, mapLoaded]);

  // User location marker – only mount when map is loaded and we have valid coordinates (avoids rogue marker at 0,0)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    if (!userLocation || !hasValidCoords(userLocation)) return;
    const lng = userLocation.lng;
    const lat = userLocation.lat;
    if (lng == null || lat == null || Number.isNaN(lng) || Number.isNaN(lat) || (lat === 0 && lng === 0)) return;
    const el = document.createElement("div");
    el.className = "user-location-marker";
    el.innerHTML = `<div class="user-dot"></div><div class="user-dot-pulse"></div>`;
    userMarkerRef.current = new mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .addTo(mapRef.current);
  }, [userLocation, mapLoaded]);

  // Park markers – only after map loaded and with valid coordinates (avoids rogue pins)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Close any open popup
    if (activePopupRef.current) {
      activePopupRef.current.remove();
      activePopupRef.current = null;
    }

    parks.forEach((park, i) => {
      const lng = park.lng;
      const lat = park.lat;
      if (lng == null || lat == null || Number.isNaN(lng) || Number.isNaN(lat) || (lat === 0 && lng === 0)) return;
      if (!hasValidCoords({ lat, lng })) return;
      const distance = userLocation
        ? distanceKm(userLocation.lat, userLocation.lng, park.lat, park.lng)
        : null;

      const el = document.createElement("div");
      el.className = "park-marker";
      
      el.innerHTML = `<svg width="28" height="36" viewBox="0 0 28 36" fill="none"><path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="#006947"/><circle cx="14" cy="14" r="5" fill="white"/></svg>`;

      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
         anchor: "bottom",
        offset: [0, -36],
        className: "park-popup",
      }).setHTML(`<div class="map-popup-content"><div class="popup-name">${park.name}</div>${distance !== null ? `<div class="popup-distance">${distance.toFixed(1)} km away</div>` : ""}</div>`);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
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
            popup.setLngLat([lng, lat]).addTo(mapRef.current);
            activePopupRef.current = popup;
          }
        }, 50);
      });

      markersRef.current.push(marker);
    });
  }, [parks, userLocation, mapLoaded]);

  const handleConfirmPinDrop = () => {
    if (pinDropLocation && onPinDrop) onPinDrop(pinDropLocation);
  };

  return (
    <div className="map-container">
      <div ref={mapContainerRef} className="map" />
      {isPinDropMode && pinDropLocation && !hideConfirmPinButton && (
        <button className="btn-primary confirm-pin-btn" onClick={handleConfirmPinDrop}>
          Confirm this location
        </button>
      )}
    </div>
  );
}