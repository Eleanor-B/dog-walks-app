"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import MapboxFullMap from "../components/MapboxFullMap";

// ---- Place name lookup (no tracking, no accounts) ----
async function lookupPlaceName(place: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = `${place} park london`;

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=1`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const lat = Number(data[0].lat);
    const lng = Number(data[0].lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
  } catch {
    return null;
  }
}

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

function roundCoord(n: number, decimals = 3) {
  return Number(n.toFixed(decimals));
}

function extractLatLngFromText(input: string): { lat: number; lng: number } | null {
  const text = input.trim();

  // Google Maps often contains "@lat,lng"
  const atMatch = text.match(/@(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
  if (atMatch) {
    return { lat: Number(atMatch[1]), lng: Number(atMatch[3]) };
  }

  // Sometimes links contain "q=lat,lng"
  const qMatch = text.match(/[?&]q=(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
  if (qMatch) {
    return { lat: Number(qMatch[1]), lng: Number(qMatch[3]) };
  }

  // OpenStreetMap often contains "#map=zoom/lat/lng"
  const osmMatch = text.match(/#map=\d+\/(-?\d+(\.\d+)?)\/(-?\d+(\.\d+)?)/);
  if (osmMatch) {
    return { lat: Number(osmMatch[1]), lng: Number(osmMatch[3]) };
  }

  return null;
}

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
    locationText: "",
    name: "",
    lat: "",
    lng: "",
    fenced: false,
    bins: false,
    toilets: false,
    coffee: false,
    parking: false,
  });

  const [currentPage, setCurrentPage] = useState(0);
  const [selectedSpaceNames, setSelectedSpaceNames] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddSpace, setShowAddSpace] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFullMap, setShowFullMap] = useState(false);

  function getMyLocation() {
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Your browser can't share location.");
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
        else setLocationError("Couldn't get your location. Try again.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const filteredSpaces = spaces
    .filter((space) => {
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
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ height: 32 }} />
        <h1>Better dog walks. Closer than you think.</h1>

        <p
          style={{
            maxWidth: 520,
            marginBottom: 20,
            color: "#555",
            lineHeight: 1.5,
          }}
        >
          Browse nearby places for dog walks, with facilities listed for each space.
          You can look further afield, or add your own spot and name it. Enjoy your walk.
        </p>

        <div style={{ height: 20 }} />
      </div>

      <div style={{ marginTop: 12 }}>
        {myLocation && (
          <span style={{ marginLeft: 12, color: "#111", fontWeight: 500 }}>
            Your current location is set ✓
          </span>
        )}
        {locationError && <p style={{ marginTop: 8 }}>{locationError}</p>}
      </div>

      <section style={{ marginTop: 16 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div className="filter-row">
            <h2 className="text-base font-semibold" style={{ margin: 0 }}>
              Filters
            </h2>

            {(filters.fenced ||
              filters.bins ||
              filters.toilets ||
              filters.coffee ||
              filters.parking) && (
              <button
                type="button"
                className="btn-text"
                onClick={() =>
                  setFilters({
                    fenced: false,
                    bins: false,
                    toilets: false,
                    coffee: false,
                    parking: false,
                  })
                }
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="filter-chips" aria-label="Filter spaces by facilities">
            <button
              type="button"
              className={`filter-chip ${filters.fenced ? "is-on" : ""}`}
              onClick={() => setFilters({ ...filters, fenced: !filters.fenced })}
            >
              Fenced
            </button>

            <button
              type="button"
              className={`filter-chip ${filters.bins ? "is-on" : ""}`}
              onClick={() => setFilters({ ...filters, bins: !filters.bins })}
            >
              Dog bins
            </button>

            <button
              type="button"
              className={`filter-chip ${filters.toilets ? "is-on" : ""}`}
              onClick={() => setFilters({ ...filters, toilets: !filters.toilets })}
            >
              Toilets
            </button>

            <button
              type="button"
              className={`filter-chip ${filters.coffee ? "is-on" : ""}`}
              onClick={() => setFilters({ ...filters, coffee: !filters.coffee })}
            >
              Coffee
            </button>

            <button
              type="button"
              className={`filter-chip ${filters.parking ? "is-on" : ""}`}
              onClick={() => setFilters({ ...filters, parking: !filters.parking })}
            >
              Parking
            </button>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <h2 style={{ margin: 0 }}>Nearby spaces</h2>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button type="button" className="btn-secondary" onClick={getMyLocation}>
                Use my location
              </button>

              <button
                type="button"
                className="btn-location"
                onClick={() => {
                  if (selectedSpaceNames.length === 0) {
                    alert("Please select at least one space to delete.");
                    return;
                  }
                  setShowDeleteModal(true);
                }}
              >
                Delete a space
              </button>
            </div>
          </div>

          {filteredSpaces.length === 0 ? (
            <p>No spaces match your filters.</p>
          ) : (
            <ul>
              {filteredSpaces.slice(currentPage * 4, currentPage * 4 + 4).map((space) => (
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
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={selectedSpaceNames.includes(space.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSpaceNames([...selectedSpaceNames, space.name]);
                          } else {
                            setSelectedSpaceNames(selectedSpaceNames.filter((n) => n !== space.name));
                          }
                        }}
                        style={{ marginTop: 4 }}
                      />
                      <div style={{ flex: 1 }}>
                        <strong>{space.name}</strong>
                        {typeof (space as any).km === "number" && (
                          <span style={{ marginLeft: 6, color: "#555" }}>
                            · {(space as any).km.toFixed(1)} km away
                          </span>
                        )}

                        <div style={{ marginTop: 4, fontSize: 13, color: "#555" }}>
                          {(() => {
                            const facilities = [
                              space.fenced ? "Fenced" : null,
                              space.bins ? "Dog bins" : null,
                              space.toilets ? "Toilets" : null,
                              space.coffee ? "Coffee" : null,
                              space.parking ? "Parking" : null,
                            ].filter(Boolean);

                            return facilities.length > 0
                              ? facilities.join(" · ")
                              : "Facilities not listed";
                          })()}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setSelectedSpaceName(space.name);
                        setShowFullMap(true);
                      }}
                    >
                      View on map
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {filteredSpaces.length > 4 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                marginTop: 16,
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 0}
              >
                Previous
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={(currentPage + 1) * 4 >= filteredSpaces.length}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </section>

      {filteredSpaces.length > 0 ? (
        <section id="map" style={{ marginTop: 24 }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <h2>Map preview</h2>
            <p style={{ marginTop: 8, fontSize: 13, color: "#555" }}>
              This is a preview to help orient you. Tap a space above to view details in your maps app.
            </p>
            <button
              type="button"
              onClick={() => setShowFullMap(true)}
              style={{
                marginTop: 10,
                padding: "10px 12px",
                width: "fit-content",
                display: "inline-flex",
              }}
            >
              View larger map
            </button>

            <img
              src={`https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${filteredSpaces
                .slice(0, 10)
                .map((s) => `pin-s+111(${s.lng},${s.lat})`)
                .join(",")}/auto/600x220?padding=40&access_token=${
                process.env.NEXT_PUBLIC_MAPBOX_TOKEN
              }`}
              alt="Map showing nearby green spaces"
              style={{
                width: "100%",
                borderRadius: 8,
                border: "1px solid #ddd",
                marginTop: 8,
              }}
            />
          </div>
        </section>
      ) : null}

      <section style={{ marginTop: 24 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div id="add-space-anchor" />

          <div
            style={{
              marginTop: 32,
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <h2 style={{ margin: 0, textAlign: "left" }}>Add a new space</h2>

            <button
              className="btn btn-primary"
              onClick={() => setShowAddSpace(!showAddSpace)}
            >
              Add a space
            </button>
          </div>

          <p style={{ marginTop: 6, maxWidth: 520, color: "#555", fontSize: 14 }}>
            Add your favourite dog walking space to your list.
          </p>

          {showAddSpace && (
            <div style={{ display: "grid", gap: 10, maxWidth: 520, marginTop: 12 }}>
              <label>
                Add the location
                <span style={{ fontSize: 13, color: "#555" }}>
                  Just type the name — we'll find the right spot on the map for you.
                </span>
                <textarea
                  value={(newSpace as any).locationText ?? ""}
                  onChange={(e) =>
                    setNewSpace({
                      ...newSpace,
                      locationText: e.target.value,
                    })
                  }
                  placeholder="e.g. Greenwich Park, Hampstead Heath"
                  rows={2}
                />
              </label>

              <label>
                Give your space a name
                <input
                  value={newSpace.name}
                  onChange={(e) =>
                    setNewSpace({
                      ...newSpace,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g. Peckham Rye Park – meadow"
                  type="text"
                />
              </label>

              <div style={{ marginTop: 16, width: "100%" }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Facilities</div>

                <div style={{ fontSize: 13, color: "#555", marginBottom: 12, maxWidth: 520 }}>
                  Select the facilities that are available in this new space.
                </div>

                <div
                  className="facilities-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 12,
                    width: "100%",
                  }}
                >
                  <label className="facility-option">
                    <input
                      type="checkbox"
                      checked={newSpace.fenced}
                      onChange={(e) => setNewSpace({ ...newSpace, fenced: e.target.checked })}
                    />
                    <span>Fenced</span>
                  </label>

                  <label className="facility-option">
                    <input
                      type="checkbox"
                      checked={newSpace.bins}
                      onChange={(e) => setNewSpace({ ...newSpace, bins: e.target.checked })}
                    />
                    <span>Dog bins</span>
                  </label>

                  <label className="facility-option">
                    <input
                      type="checkbox"
                      checked={newSpace.toilets}
                      onChange={(e) => setNewSpace({ ...newSpace, toilets: e.target.checked })}
                    />
                    <span>Toilets</span>
                  </label>

                  <label className="facility-option">
                    <input
                      type="checkbox"
                      checked={newSpace.coffee}
                      onChange={(e) => setNewSpace({ ...newSpace, coffee: e.target.checked })}
                    />
                    <span>Coffee</span>
                  </label>

                  <label className="facility-option">
                    <input
                      type="checkbox"
                      checked={newSpace.parking}
                      onChange={(e) => setNewSpace({ ...newSpace, parking: e.target.checked })}
                    />
                    <span>Parking</span>
                  </label>
                </div>
              </div>

              <button
                type="button"
                style={{
                  alignSelf: "flex-start",
                  width: "fit-content",
                  display: "inline-flex",
                  padding: "10px 14px",
                }}
                onClick={async () => {
                  if (!newSpace.name.trim()) {
                    alert("Please add a name.");
                    return;
                  }

                  const locationText = (newSpace as any).locationText;
                  if (!locationText || !locationText.trim()) {
                    alert("Please add a location.");
                    return;
                  }

                  let extracted = extractLatLngFromText(locationText);

                  if (!extracted) {
                    const lookedUp = await lookupPlaceName(locationText);
                    if (lookedUp) extracted = lookedUp;
                  }

                  if (!extracted) {
                    alert("Couldn't find that place. Try a clearer name like 'Greenwich Park'.");
                    return;
                  }

                  setSpaces([
                    ...spaces,
                    {
                      name: newSpace.name.trim(),
                      lat: roundCoord(extracted.lat),
                      lng: roundCoord(extracted.lng),
                      fenced: newSpace.fenced,
                      bins: newSpace.bins,
                      toilets: newSpace.toilets,
                      coffee: newSpace.coffee,
                      parking: newSpace.parking,
                    },
                  ]);

                  setNewSpace({
                    ...newSpace,
                    name: "",
                    locationText: "",
                    fenced: false,
                    bins: false,
                    toilets: false,
                    coffee: false,
                    parking: false,
                  });
                  setShowSuccessModal(true);
                  setShowAddSpace(false);
                }}
              >
                Add space
              </button>
            </div>
          )}
        </div>
      </section>

      {showSuccessModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 9999,
          }}
          onClick={() => setShowSuccessModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: "14px 16px",
              maxWidth: 360,
              width: "100%",
              border: "1px solid #e6e6e6",
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                aria-hidden="true"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  background: "#111",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                ✓
              </div>

              <div style={{ fontWeight: 600 }}>Your space has been added.</div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button type="button" onClick={() => setShowSuccessModal(false)} style={{ padding: "8px 12px" }}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 9999,
          }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: "14px 16px",
              maxWidth: 360,
              width: "100%",
              border: "1px solid #e6e6e6",
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 600, marginBottom: 12 }}>
              Are you sure you want to delete {selectedSpaceNames.length === 1 ? "this space" : "these spaces"}?
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                style={{ padding: "8px 12px" }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  setSpaces(spaces.filter((s) => !selectedSpaceNames.includes(s.name)));
                  setSelectedSpaceNames([]);
                  setShowDeleteModal(false);
                }}
                style={{ padding: "8px 12px", background: "#111", color: "#fff" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showFullMap && <MapboxFullMap spaces={filteredSpaces} onClose={() => setShowFullMap(false)} />}
    </main>
  );
}