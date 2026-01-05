"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

type Space = {
  name: string;
  lat: number;
  lng: number;
};

export default function MapboxEmbedded({
  spaces,
  myLocation,
  selectedSpaceNames,
}: {
  spaces: Space[];
  myLocation: { lat: number; lng: number } | null;
  selectedSpaceNames: string[];
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Determine what to show and where to center
    const selectedSpaces = spaces.filter((s) => selectedSpaceNames.includes(s.name));
    const hasSelections = selectedSpaces.length > 0;

    // Center on first selected space, or user location, or default London
    const centerPoint = hasSelections
      ? [selectedSpaces[0].lng, selectedSpaces[0].lat]
      : myLocation
      ? [myLocation.lng, myLocation.lat]
      : [-0.1276, 51.5072];

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: centerPoint as [number, number],
      zoom: hasSelections ? 12 : myLocation ? 13 : 12,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // If there are selected spaces, show them (green pins)
    if (hasSelections) {
      selectedSpaces.forEach((space) => {
        new mapboxgl.Marker({ color: "#22c55e" }) // Green color
          .setLngLat([space.lng, space.lat])
          .setPopup(new mapboxgl.Popup().setText(space.name))
          .addTo(mapRef.current!);
      });
    }
    // Otherwise, if user has set location, show just that
    else if (myLocation) {
      new mapboxgl.Marker({ color: "#3b82f6" }) // Blue for user location
        .setLngLat([myLocation.lng, myLocation.lat])
        .setPopup(new mapboxgl.Popup().setText("Your location"))
        .addTo(mapRef.current!);
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [spaces, myLocation, selectedSpaceNames]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: "100%",
        height: 180,
        borderRadius: 8,
        border: "1px solid #ddd",
        marginTop: 8,
      }}
    />
  );
}