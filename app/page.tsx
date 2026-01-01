"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
const MapView = dynamic(() => import("../components/MapView"), { ssr: false });


const SPACES = [
  {
    name: "Dulwich Park – enclosed field",
    lat: 51.4429,
    lng: -0.0869,
    fenced: true,
    bins: true,
    toilets: false,
    coffee: true,
    parking: false,
  },
  {
    name: "Peckham Rye – dog exercise area",
    lat: 51.45972456481489,
    lng: -0.0643467561865794,
    fenced: false,
    bins: true,
    toilets: true,
    coffee: false,
    parking: true,
  },
  {
    name: "Greenwich Peninsula – riverside green",
    lat: 51.5007,
    lng: 0.0056,
    fenced: false,
    bins: false,
    toilets: true,
    coffee: true,
    parking: true,
  },
];

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
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
}
const buttonStyle = {
  padding: "8px 12px",
  background: "#111",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};
export default function Home() {

  
  const [filters, setFilters] = useState({
    fenced: false,
    bins: false,
    toilets: false,
    coffee: false,
    parking: false,
  });

  const [myLocation, setMyLocation] = useState<null | { lat: number; lng: number }>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [selectedSpaceName, setSelectedSpaceName] = useState<string | null>(null);
  const [spaces, setSpaces] = useState(SPACES);
  const [newSpace, setNewSpace] = useState({
    name: "",
    lat: "",
    lng: "",
    fenced: false,
    bins: false,
    toilets: false,
    coffee: false,
    parking: false,
  });
  



  function getMyLocation() {
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Your browser can’t share location.");
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setIsGettingLocation(false);
      },
      (err) => {
        setIsGettingLocation(false);
        if (err.code === 1) setLocationError("Location permission was blocked.");
        else setLocationError("Couldn’t get your location. Try again.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const filteredSpaces = spaces.filter((space) => {
    if (filters.fenced && !space.fenced) return false;
    if (filters.bins && !space.bins) return false;
    if (filters.toilets && !space.toilets) return false;
    if (filters.coffee && !space.coffee) return false;
    if (filters.parking && !space.parking) return false;
    return true;
  })
    .map((space) => {
      const km = myLocation ? distanceKm(myLocation.lat, myLocation.lng, space.lat, space.lng) : null;
      return { ...space, km };
    })
    .sort((a, b) => {
      if (a.km === null || b.km === null) return 0;
      return a.km - b.km;
    });

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Find a safe dog walk near you</h1>

      <div style={{ marginTop: 12 }}>
      <button
  onClick={getMyLocation}
  style={buttonStyle}
  disabled={isGettingLocation}
>
  {isGettingLocation ? "Getting your location…" : "Use my location"}
</button>



        {myLocation && <span style={{ marginLeft: 12 }}>Location set ✓</span>}
        {locationError && <p style={{ marginTop: 8 }}>{locationError}</p>}
      </div>

      <section style={{ marginTop: 24 }}>
        <h2>Filters</h2>

        {[
          ["fenced", "Fenced area"],
          ["bins", "Dog bins available"],
          ["toilets", "Public toilets nearby"],
          ["coffee", "Coffee nearby"],
          ["parking", "Car park"],
        ].map(([key, label]) => (
          <label key={key} style={{ display: "block" }}>
            <input
              type="checkbox"
              checked={filters[key as keyof typeof filters]}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  [key]: e.target.checked,
                })
              }
            />{" "}
            {label}
          </label>
        ))}
      </section>
    
      <section style={{ marginTop: 24 }}>
  <h2>Add a space</h2>

  <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
    <label>
      Name
      <input
        value={newSpace.name}
        onChange={(e) => setNewSpace({ ...newSpace, name: e.target.value })}
        style={{
          display: "block",
          width: "100%",
          padding: 8,
          marginTop: 4,
          border: "1px solid #ccc",
          borderRadius: 6,
          background: "white",
        }}
        
        placeholder="e.g. Peckham Rye Park – meadow"
      />
    </label>

    <label>
      Latitude (number)
      <input
        value={newSpace.lat}
        onChange={(e) => setNewSpace({ ...newSpace, lat: e.target.value })}
        style={{
          display: "block",
          width: "100%",
          padding: 8,
          marginTop: 4,
          border: "1px solid #ccc",
          borderRadius: 6,
          background: "white",
        }}
        
        placeholder="e.g. 51.4823"
      />
    </label>

    <label>
      Longitude (number)
      <input
        value={newSpace.lng}
        onChange={(e) => setNewSpace({ ...newSpace, lng: e.target.value })}
        style={{
          display: "block",
          width: "100%",
          padding: 8,
          marginTop: 4,
          border: "1px solid #ccc",
          borderRadius: 6,
          background: "white",
        }}
        
        placeholder="e.g. -0.0601"
      />
    </label>

    <div style={{ display: "grid", gap: 6 }}>
      <label>
        <input
          type="checkbox"
          checked={newSpace.fenced}
          onChange={(e) => setNewSpace({ ...newSpace, fenced: e.target.checked })}
        />{" "}
        Fenced
      </label>

      <label>
        <input
          type="checkbox"
          checked={newSpace.bins}
          onChange={(e) => setNewSpace({ ...newSpace, bins: e.target.checked })}
        />{" "}
        Dog bins
      </label>

      <label>
        <input
          type="checkbox"
          checked={newSpace.toilets}
          onChange={(e) => setNewSpace({ ...newSpace, toilets: e.target.checked })}
        />{" "}
        Toilets
      </label>

      <label>
        <input
          type="checkbox"
          checked={newSpace.coffee}
          onChange={(e) => setNewSpace({ ...newSpace, coffee: e.target.checked })}
        />{" "}
        Coffee
      </label>

      <label>
        <input
          type="checkbox"
          checked={newSpace.parking}
          onChange={(e) => setNewSpace({ ...newSpace, parking: e.target.checked })}
        />{" "}
        Parking
      </label>
    </div>

    <button
      onClick={() => {
        const latNum = Number(newSpace.lat);
        const lngNum = Number(newSpace.lng);

        if (!newSpace.name.trim()) {
          alert("Please add a name.");
          return;
        }
        if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
          alert("Please add valid latitude and longitude numbers.");
          return;
        }

        setSpaces([
          ...spaces,
          {
            name: newSpace.name.trim(),
            lat: latNum,
            lng: lngNum,
            fenced: newSpace.fenced,
            bins: newSpace.bins,
            toilets: newSpace.toilets,
            coffee: newSpace.coffee,
            parking: newSpace.parking,
          },
        ]);

        setNewSpace({
          name: "",
          lat: "",
          lng: "",
          fenced: false,
          bins: false,
          toilets: false,
          coffee: false,
          parking: false,
        });
      }}
      style={buttonStyle}

    >
      Add space
    </button>
  </div>
</section>

      <section style={{ marginTop: 32 }}>
        <h2>Nearby spaces</h2>

        {filteredSpaces.length === 0 ? (
          <p>No spaces match your filters.</p>
        ) : (
          <ul>
            {filteredSpaces.map((space) => (
            <li
            key={space.name}
            style={{
              marginBottom: 12,
              padding: 10,
              border: "1px solid #ddd",
              borderRadius: 8,
              background: selectedSpaceName === space.name ? "#f3f4f6" : "white",
            }}
          >
          
                <strong>{space.name}</strong>
                {typeof (space as any).km === "number" && (
                  <span> — {(space as any).km.toFixed(1)} km</span>
                )}
                <br />
                {space.fenced && "Fenced · "}
                {space.bins && "Dog bins · "}
                {space.toilets && "Toilets · "}
                {space.coffee && "Coffee · "}
                {space.parking && "Parking"}
                <div style={{ marginTop: 6 }}>
  <button
onClick={() => {
  setSelectedSpaceName(space.name);
  document.getElementById("map")?.scrollIntoView({ behavior: "smooth" });
}}
    style={buttonStyle}
  >
    View on map
  </button>
</div>
              </li>
            ))}
          </ul>
        )}
    </section>

    <section id="map" style={{ marginTop: 24 }}>
  <h2>Map</h2>
  <MapView
    spaces={filteredSpaces as any}
    myLocation={myLocation}
    selectedSpaceName={selectedSpaceName}
  />
</section>

    </main>
  );
}
