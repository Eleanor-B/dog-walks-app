// @ts-nocheck
"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect, useState } from "react";




// Fix marker icons (otherwise you often get missing markers)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: (markerIcon2x as any).src ?? markerIcon2x,
  iconUrl: (markerIcon as any).src ?? markerIcon,
  shadowUrl: (markerShadow as any).src ?? markerShadow,
});

type Space = {
  name: string;
  lat: number;
  lng: number;
  fenced: boolean;
  bins: boolean;
  toilets: boolean;
  coffee: boolean;
  parking: boolean;
  km?: number | null;
};
function MapMover({
    spaces,
    selectedSpaceName,
  }: {
    spaces: Space[];
    selectedSpaceName: string | null;
  }) {
    const map = useMap();
  
    useEffect(() => {
      if (!selectedSpaceName) return;
  
      const found = spaces.find((s) => s.name === selectedSpaceName);
      if (!found) return;
  
      map.flyTo([found.lat, found.lng], 16, { duration: 0.6 });

    }, [selectedSpaceName, spaces, map]);
  
    return null;
  }
  

  export default function MapView({
    spaces,
    myLocation,
    selectedSpaceName,
  }: {
    spaces: Space[];
    myLocation: { lat: number; lng: number } | null;
    selectedSpaceName: string | null;
  }) {
    const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  
    const center = myLocation ?? { lat: 51.5072, lng: -0.1276 };
  
    return (
      <div style={{ height: 360, marginTop: 12, border: "1px solid #ddd" }}>
        <MapContainer
        key="dog-walk-map"
          center={[center.lat, center.lng]}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
          whenCreated={(m) => setMapInstance(m as any)}
        >
          <TileLayer
  attribution='&copy; OpenStreetMap contributors'
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
/>

  
          <MapMover spaces={spaces} selectedSpaceName={selectedSpaceName} />
  
          {myLocation && (
            <Marker position={[myLocation.lat, myLocation.lng]}>
              <Popup>Your location</Popup>
            </Marker>
          )}
  
          {spaces.map((s) => (
            <Marker key={s.name} position={[s.lat, s.lng]}>
              <Popup>
                <strong>{s.name}</strong>
                {typeof s.km === "number" ? ` — ${s.km.toFixed(1)} km` : ""}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    );
  }
  