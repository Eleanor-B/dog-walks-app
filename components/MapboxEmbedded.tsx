"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

type Space = {
  name: string;
  lat: number;
  lng: number;
};

export default function MapboxEmbedded({ spaces }: { spaces: Space[] }) {
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

    spaces.forEach((space) => {
      new mapboxgl.Marker({ color: "#111" })
        .setLngLat([space.lng, space.lat])
        .setPopup(new mapboxgl.Popup().setText(space.name))
        .addTo(mapRef.current!);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [spaces]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: "100%",
        height: 360,
        borderRadius: 8,
        border: "1px solid #ddd",
        marginTop: 8,
      }}
    />
  );
}