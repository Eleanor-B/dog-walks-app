"use client";

import { useState, useEffect } from "react";
import {
  Eye,
  EyeSlash,
  Trash,
  Pencil,
  X,
  Barricade,
  Coffee,
  Car,
  Toilet,
  ArrowsOut,
  CircleHalf,
  MapPinPlus,
  MapTrifold,
  CaretLeft,
  CaretRight,
  Check,
  Signpost,
  User,
} from "@phosphor-icons/react";
import MapboxFullMap from "../components/MapboxFullMap";
import MapboxEmbedded from "../components/MapboxEmbedded";
import DirectionsDrawer from "../components/DirectionsDrawer";
import Header from "../components/Header";
import Footer from "../components/Footer";

// ---- Place name lookup (no tracking, no accounts) ----
async function lookupPlaceName(place: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = `${place} park london`;

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      {
        headers: { Accept: "application/json" },
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
    unfenced: false,
    partFenced: false,
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
    unfenced: true,
    partFenced: false,
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
    unfenced: true,
    partFenced: false,
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

export default function Home() {
  const [filters, setFilters] = useState({
    fenced: false,
    unfenced: false,
    partFenced: false,
    bins: false,
    toilets: false,
    coffee: false,
    parking: false,
  });

  const [myLocation, setMyLocation] = useState<null | { lat: number; lng: number }>(null);
  const [showMyLocation, setShowMyLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [selectedSpaceName, setSelectedSpaceName] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<Space[]>(SPACES);
  const [newSpace, setNewSpace] = useState({
    locationText: "",
    name: "",
    lat: "",
    lng: "",
    fenced: false,
    unfenced: false,
    partFenced: false,
    bins: false,
    toilets: false,
    coffee: false,
    parking: false,
  });

  const [currentPage, setCurrentPage] = useState(0);
  const [selectedSpaceNames, setSelectedSpaceNames] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [showFullMap, setShowFullMap] = useState(false);
  const [formLocationError, setFormLocationError] = useState(false);
  const [locationNotFoundError, setLocationNotFoundError] = useState(false);
  const [spaceNamePrompt, setSpaceNamePrompt] = useState(false);
  const [showDirectionsDrawer, setShowDirectionsDrawer] = useState(false);
  const [directionsSpace, setDirectionsSpace] = useState<Space | null>(null);
  const [routeData, setRouteData] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Show filters when user scrolls past the map
  useEffect(() => {
    const handleScroll = () => {
      const mapSection = document.querySelector('#map');
      if (mapSection) {
        const mapBottom = mapSection.getBoundingClientRect().bottom;
        // Show filters when map is scrolled out of view
        if (mapBottom < window.innerHeight * 0.3) {
          setShowFilters(true);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
        setShowMyLocation(true);
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
      if (filters.unfenced && space.fenced) return false;
      if (filters.partFenced && !space.partFenced) return false;
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
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header onLogin={() => console.log("Login clicked")} user={null} />
      
      <main style={{ flex: 1, padding: 24, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto", width: "100%" }}>
      {/* Header */}
      <div style={{ maxWidth: 900, margin: "0 auto", paddingTop: 24 }}>
        <h1 style={{ fontSize: "40px", fontWeight: 700, marginBottom: "8px" }}>
          <span style={{ color: "#DD6616" }}>Find great places</span>
          <span style={{ color: "#006947" }}> to walk your dog</span>
        </h1>

        <p
          style={{
            maxWidth: 750,
            marginTop: 16,
            marginBottom: 0,
            color: "#555",
            lineHeight: 1.5,
          }}
        >
          Discover dog-friendly spaces nearby and what they offer.{" "}
          {!myLocation ? (
            <button
              type="button"
              className="btn-text"
              onClick={getMyLocation}
              disabled={isGettingLocation}
              style={{
                display: "inline",
                padding: 0,
                marginTop: 0,
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                color: "#006947",
                cursor: "pointer",
              }}
            >
              {isGettingLocation ? "Getting location..." : "Show my location"}
            </button>
          ) : (
            <button
              type="button"
              className="btn-text"
              onClick={() => setShowMyLocation(!showMyLocation)}
              style={{
                display: "inline",
                padding: 0,
                marginTop: 0,
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                color: "#006947",
                cursor: "pointer",
              }}
            >
              {showMyLocation ? "Hide my location" : "Show my location"}
            </button>
          )}
        </p>

        {locationError && <p style={{ marginTop: 16, color: "#d32f2f" }}>{locationError}</p>}
      </div>

      {/* Map */}
      <section style={{ marginTop: 40 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {/* Embedded map, fixed height */}
          <div id="map" className="mb-0 pb-0 overflow-hidden" style={{ height: "70vh" }}>
            <MapboxEmbedded
              spaces={filteredSpaces.slice(0, 10)}
              myLocation={showMyLocation ? myLocation : null}
              selectedSpaceName={selectedSpaceName}
              selectedSpaceNames={selectedSpaceNames}
              onViewLargeMap={() => setShowFullMap(true)}
            />
          </div>
        </div>
      </section>

      {/* Nearby spaces */}
      <section style={{ marginTop: 40 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ margin: 0, marginBottom: 8 }}>Nearby spaces</h2>

          {showFilters && (
            <div className="filter-chips" aria-label="Filter spaces by facilities">
            <button
              type="button"
              className={`filter-chip ${filters.fenced ? "is-on" : ""}`}
              onClick={() => setFilters({ ...filters, fenced: !filters.fenced })}
            >
              <Barricade size={16} weight="regular" style={{ color: filters.fenced ? "#fff" : "#006947" }} />
              Fenced
            </button>

            <button
              type="button"
              className={`filter-chip ${filters.unfenced ? "is-on" : ""}`}
              onClick={() => setFilters({ ...filters, unfenced: !filters.unfenced })}
            >
              <ArrowsOut size={16} weight="regular" style={{ color: filters.unfenced ? "#fff" : "#006947" }} />
              Unfenced
            </button>

            <button
              type="button"
              className={`filter-chip ${filters.partFenced ? "is-on" : ""}`}
              onClick={() => setFilters({ ...filters, partFenced: !filters.partFenced })}
            >
              <CircleHalf size={16} weight="regular" style={{ color: filters.partFenced ? "#fff" : "#006947" }} />
              Part fenced
            </button>

            <button
              type="button"
              className={`filter-chip ${filters.bins ? "is-on" : ""}`}
              onClick={() => setFilters({ ...filters, bins: !filters.bins })}
            >
              <Trash size={16} weight="regular" style={{ color: filters.bins ? "#fff" : "#006947" }} />
              Dog bins
            </button>

            <button
              type="button"
              className={`filter-chip ${filters.toilets ? "is-on" : ""}`}
              onClick={() => setFilters({ ...filters, toilets: !filters.toilets })}
            >
              <Toilet size={16} weight="regular" style={{ color: filters.toilets ? "#fff" : "#006947" }} />
              Toilets
            </button>

            <button
              type="button"
              className={`filter-chip ${filters.coffee ? "is-on" : ""}`}
              onClick={() => setFilters({ ...filters, coffee: !filters.coffee })}
            >
              <Coffee size={16} weight="regular" style={{ color: filters.coffee ? "#fff" : "#006947" }} />
              Coffee
            </button>

            <button
              type="button"
              className={`filter-chip ${filters.parking ? "is-on" : ""}`}
              onClick={() => setFilters({ ...filters, parking: !filters.parking })}
            >
              <Car size={16} weight="regular" style={{ color: filters.parking ? "#fff" : "#006947" }} />
              Parking
            </button>
          </div>
          )}

          {selectedSpaceNames.length > 0 && (
            <button
              type="button"
              style={{
                marginTop: 16,
                marginBottom: 16,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                color: "#111",
                border: "none",
                padding: "4px 6px",
                fontSize: 13,
                cursor: "pointer",
                borderRadius: 8,
              }}
              onClick={() => setShowDeleteModal(true)}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f3f3")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Trash size={16} weight="regular" />
              Delete {selectedSpaceNames.length} {selectedSpaceNames.length === 1 ? "space" : "spaces"}
            </button>
          )}

          {filteredSpaces.length === 0 ? (
            <div style={{ padding: "24px 0" }}>
              {myLocation ? (
                <p>Sorry we can't find a match - please try fewer filters and search again.</p>
              ) : (
                <p style={{ color: "#555" }}>
                  No spaces yet - please add your location and we will find you the nearest spot.
                </p>
              )}
            </div>
          ) : (
            <ul style={{ marginTop: 16 }}>
              {filteredSpaces.slice(currentPage * 3, currentPage * 3 + 3).map((space) => (
                <li
                  key={space.name}
                  style={{
                    marginBottom: 16,
                    padding: 16,
                    border: selectedSpaceName === space.name ? "1px solid #C1CFCA" : "1px solid #ddd",
                    borderRadius: 8,
                    background: selectedSpaceName === space.name ? "#F5FFEF" : "white",
                    boxShadow: selectedSpaceName === space.name ? "0 2px 8px rgba(0, 0, 0, 0.08)" : "none",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setSelectedSpaceName(space.name);
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1 }}>
                        <div style={{ position: "relative", width: 20, height: 20, flexShrink: 0, marginTop: 2 }}>
                          <input
                            type="checkbox"
                            checked={selectedSpaceNames.includes(space.name)}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (e.target.checked) {
                                if (selectedSpaceNames.length >= 5) {
                                  alert("You can only select up to 5 spaces at a time.");
                                  e.target.checked = false;
                                  return;
                                }
                                setSelectedSpaceNames([...selectedSpaceNames, space.name]);
                              } else {
                                setSelectedSpaceNames(selectedSpaceNames.filter((n) => n !== space.name));
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ margin: 0 }}
                          />
                          {selectedSpaceNames.includes(space.name) && (
                            <Check
                              size={12}
                              weight="bold"
                              style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                color: "white",
                                pointerEvents: "none",
                              }}
                            />
                          )}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <strong style={{ fontFamily: "var(--font-fraunces), serif", color: "#006947" }}>
                              {space.name}
                            </strong>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSpace(space);
                                setNewSpace({
                                  locationText: "",
                                  name: space.name,
                                  lat: space.lat.toString(),
                                  lng: space.lng.toString(),
                                  fenced: space.fenced,
                                  unfenced: space.unfenced,
                                  partFenced: space.partFenced,
                                  bins: space.bins,
                                  toilets: space.toilets,
                                  coffee: space.coffee,
                                  parking: space.parking,
                                });
                                setShowEditModal(true);
                              }}
                              style={{
                                background: "transparent",
                                border: "none",
                                padding: 2,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                color: "#006947",
                                marginTop: 0,
                                flexShrink: 0,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "#004d33")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "#006947")}
                            >
                              <Pencil size={16} weight="regular" />
                            </button>
                          </div>

                          {typeof (space as any).km === "number" && (
                            <span style={{ marginLeft: 0, color: "#555", fontSize: 14 }}>
                              {(space as any).km.toFixed(1)} km away
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowFullMap(true);
                          }}
                          style={{
                            padding: "6px 12px",
                            height: "fit-content",
                            marginTop: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <MapTrifold size={16} weight="regular" />
                          Open map
                        </button>

                        <button
                          type="button"
                          className="btn-primary"
                          disabled={selectedSpaceName !== space.name}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDirectionsSpace(space);
                            setShowDirectionsDrawer(true);
                          }}
                          style={{
                            padding: "6px 12px",
                            height: "fit-content",
                            marginTop: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Signpost size={16} weight="regular" />
                          Get directions
                        </button>
                      </div>
                    </div>

                    <div style={{ marginLeft: 32, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {(() => {
                        const facilities = [
                          space.fenced && { icon: <Barricade size={12} weight="regular" />, label: "Fenced" },
                          space.unfenced && { icon: <ArrowsOut size={12} weight="regular" />, label: "Unfenced" },
                          space.partFenced && { icon: <CircleHalf size={12} weight="regular" />, label: "Part fenced" },
                          space.bins && { icon: <Trash size={12} weight="regular" />, label: "Dog bins" },
                          space.toilets && { icon: <Toilet size={12} weight="regular" />, label: "Toilets" },
                          space.coffee && { icon: <Coffee size={12} weight="regular" />, label: "Coffee" },
                          space.parking && { icon: <Car size={12} weight="regular" />, label: "Parking" },
                        ].filter(Boolean);

                        return facilities.length > 0
                          ? facilities.map((facility: any, index: number) => (
                              <span
                                key={index}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  background: "#f5f5f5",
                                  border: "1px solid #e2e2e2",
                                  borderRadius: 999,
                                  padding: "4px 8px",
                                  fontSize: 11,
                                  color: "#02301F",
                                }}
                              >
                                <span style={{ color: "#006947", display: "flex" }}>{facility.icon}</span>
                                {facility.label}
                              </span>
                            ))
                          : (
                            <span style={{ fontSize: 11, color: "#555" }}>Facilities not listed</span>
                          );
                      })()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {filteredSpaces.length > 3 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                marginTop: 4,
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 0}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <CaretLeft size={16} weight="bold" />
                Previous
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={(currentPage + 1) * 3 >= filteredSpaces.length}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                Next
                <CaretRight size={16} weight="bold" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Add space drawer */}
      {showAddDrawer && (
        <>
          {/* Overlay */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 9998,
              animation: "fadeIn 200ms ease-out",
            }}
            onClick={() => setShowAddDrawer(false)}
          />

          {/* Drawer */}
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "calc(100% - 40px)",
              maxWidth: 520,
              background: "#fff",
              zIndex: 9999,
              boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              animation: "slideInFromRight 300ms ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky header */}
            <div
              style={{
                position: "sticky",
                top: 0,
                background: "#fff",
                padding: "20px 24px 16px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                zIndex: 10,
              }}
            >
              <h2>Add a new space</h2>
              <button
                type="button"
                onClick={() => setShowAddDrawer(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  color: "#555",
                }}
              >
                <X size={24} weight="regular" />
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 24px 24px 24px" }}>
              <div style={{ display: "grid", gap: 16, maxWidth: 520 }}>
                <label style={{ fontFamily: "var(--font-fraunces), serif" }}>
                  <h3 style={{ marginBottom: 4 }}>
                    Add the location
                  </h3>
                  <span
                    style={{
                      display: "block",
                      fontSize: 13,
                      color: "#555",
                      marginTop: 4,
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      fontWeight: 400,
                    }}
                  >
                    Just type the name as you see it on the map — we'll find the right spot for you.
                  </span>
                  <textarea
                    value={(newSpace as any).locationText ?? ""}
                    onChange={(e) => {
                      setNewSpace({
                        ...newSpace,
                        locationText: e.target.value,
                      });
                      setFormLocationError(false);
                      setLocationNotFoundError(false);
                    }}
                    placeholder="e.g. Greenwich Park, Hampstead Heath"
                    rows={1}
                    style={{ minHeight: 40 }}
                    className={formLocationError || locationNotFoundError ? "error" : ""}
                  />
                  {formLocationError && <div className="error-message">Please type in a place name</div>}
                  {locationNotFoundError && (
                    <div className="error-message">Sorry - we couldn't find that place name - please try an alternative.</div>
                  )}
                </label>

                <label style={{ fontFamily: "var(--font-fraunces), serif" }}>
                  <h3 style={{ marginBottom: 4 }}>
                    Give your space a name, if you'd like
                  </h3>
                  <input
                    value={newSpace.name}
                    onChange={(e) => {
                      setNewSpace({
                        ...newSpace,
                        name: e.target.value,
                      });
                      setSpaceNamePrompt(false);
                    }}
                    placeholder="e.g. Peckham Rye Park – meadow"
                    type="text"
                    className={spaceNamePrompt ? "warning" : ""}
                  />
                  {spaceNamePrompt && <div className="warning-message">We will use the location name instead</div>}
                </label>

                <div style={{ marginTop: 8 }}>
                  <h3>Facilities</h3>

                  <div style={{ fontSize: 13, color: "#555", marginBottom: 16 }}>
                    Select the facilities that are available in this new space.
                  </div>

                  <div
                    className="facilities-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: 8,
                      width: "100%",
                    }}
                  >
                    <label className="facility-option">
                      <input
                        type="checkbox"
                        checked={newSpace.fenced}
                        onChange={(e) => setNewSpace({ ...newSpace, fenced: e.target.checked })}
                        style={{ display: "none" }}
                      />
                      <span className="custom-checkbox"></span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Barricade size={16} weight="regular" style={{ color: "#006947" }} />
                        Fenced
                      </span>
                    </label>

                    <label className="facility-option">
                      <input
                        type="checkbox"
                        checked={newSpace.unfenced}
                        onChange={(e) => setNewSpace({ ...newSpace, unfenced: e.target.checked })}
                        style={{ display: "none" }}
                      />
                      <span className="custom-checkbox"></span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <ArrowsOut size={16} weight="regular" style={{ color: "#006947" }} />
                        Unfenced
                      </span>
                    </label>

                    <label className="facility-option">
                      <input
                        type="checkbox"
                        checked={newSpace.partFenced}
                        onChange={(e) => setNewSpace({ ...newSpace, partFenced: e.target.checked })}
                        style={{ display: "none" }}
                      />
                      <span className="custom-checkbox"></span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <CircleHalf size={16} weight="regular" style={{ color: "#006947" }} />
                        Part fenced
                      </span>
                    </label>

                    <label className="facility-option">
                      <input
                        type="checkbox"
                        checked={newSpace.bins}
                        onChange={(e) => setNewSpace({ ...newSpace, bins: e.target.checked })}
                        style={{ display: "none" }}
                      />
                      <span className="custom-checkbox"></span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Trash size={16} weight="regular" style={{ color: "#006947" }} />
                        Dog bins
                      </span>
                    </label>

                    <label className="facility-option">
                      <input
                        type="checkbox"
                        checked={newSpace.toilets}
                        onChange={(e) => setNewSpace({ ...newSpace, toilets: e.target.checked })}
                        style={{ display: "none" }}
                      />
                      <span className="custom-checkbox"></span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Toilet size={16} weight="regular" style={{ color: "#006947" }} />
                        Toilets
                      </span>
                    </label>

                    <label className="facility-option">
                      <input
                        type="checkbox"
                        checked={newSpace.coffee}
                        onChange={(e) => setNewSpace({ ...newSpace, coffee: e.target.checked })}
                        style={{ display: "none" }}
                      />
                      <span className="custom-checkbox"></span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Coffee size={16} weight="regular" style={{ color: "#006947" }} />
                        Coffee
                      </span>
                    </label>

                    <label className="facility-option">
                      <input
                        type="checkbox"
                        checked={newSpace.parking}
                        onChange={(e) => setNewSpace({ ...newSpace, parking: e.target.checked })}
                        style={{ display: "none" }}
                      />
                      <span className="custom-checkbox"></span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Car size={16} weight="regular" style={{ color: "#006947" }} />
                        Parking
                      </span>
                    </label>
                  </div>
                </div>
                
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: "fit-content", marginTop: 16, display: "inline-flex", alignItems: "center", gap: 6 }}
                  disabled={!(newSpace as any).locationText || !(newSpace as any).locationText.trim()}
                  onClick={async () => {
                    const locationText = (newSpace as any).locationText;
                    if (!locationText || !locationText.trim()) {
                      setFormLocationError(true);
                      return;
                    }

                    // Look up location first
                    let extracted = extractLatLngFromText(locationText);

                    if (!extracted) {
                      const lookedUp = await lookupPlaceName(locationText);
                      if (lookedUp) extracted = lookedUp;
                    }

                    if (!extracted) {
                      setLocationNotFoundError(true);
                      return;
                    }

                    // Check space name after location is validated
                    if (!newSpace.name.trim()) {
                      if (spaceNamePrompt) {
                        // proceed with location name
                      } else {
                        setSpaceNamePrompt(true);
                        return;
                      }
                    }

                    setSpaces([
                      ...spaces,
                      {
                        name: newSpace.name.trim() || locationText.trim(),
                        lat: roundCoord(extracted.lat),
                        lng: roundCoord(extracted.lng),
                        fenced: newSpace.fenced,
                        unfenced: newSpace.unfenced,
                        partFenced: newSpace.partFenced,
                        bins: newSpace.bins,
                        toilets: newSpace.toilets,
                        coffee: newSpace.coffee,
                        parking: newSpace.parking,
                      },
                    ]);

                    // Clear form after successful submission
                    setNewSpace({
                      locationText: "",
                      name: "",
                      lat: "",
                      lng: "",
                      fenced: false,
                      unfenced: false,
                      partFenced: false,
                      bins: false,
                      toilets: false,
                      coffee: false,
                      parking: false,
                    });

                    setShowAddDrawer(false);
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 3000);
                  }}
                >
                  <MapPinPlus size={18} weight="regular" />
                  Add space
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast notification */}
      {showToast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#111",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 10000,
            animation: "slideUp 200ms ease-out",
          }}
        >
          ✓ Space added successfully
        </div>
      )}

      {/* Edit modal */}
      {showEditModal && editingSpace && (
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
          onClick={() => {
            setShowEditModal(false);
            setEditingSpace(null);
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 24,
              maxWidth: 520,
              width: "100%",
              maxHeight: "80vh",
              overflowY: "auto",
              border: "1px solid #e6e6e6",
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Edit space</h2>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingSpace(null);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  color: "#555",
                }}
              >
                <X size={24} weight="regular" />
              </button>
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              <label>
                <span style={{ fontWeight: 700, color: "#006947" }}>Space name</span>
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

              <div>
                <h3>Facilities</h3>

                <div
                  className="facilities-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 8,
                  }}
                >
                  <label className="facility-option">
                    <input
                      type="checkbox"
                      checked={newSpace.fenced}
                      onChange={(e) => setNewSpace({ ...newSpace, fenced: e.target.checked })}
                      style={{ display: "none" }}
                    />
                    <span className="custom-checkbox"></span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Barricade size={16} weight="regular" style={{ color: "#006947" }} />
                      Fenced
                    </span>
                  </label>

                  <label className="facility-option">
                    <input
                      type="checkbox"
                      checked={newSpace.unfenced}
                      onChange={(e) => setNewSpace({ ...newSpace, unfenced: e.target.checked })}
                      style={{ display: "none" }}
                    />
                    <span className="custom-checkbox"></span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <ArrowsOut size={16} weight="regular" style={{ color: "#006947" }} />
                      Unfenced
                    </span>
                  </label>

                  <label className="facility-option">
                    <input
                      type="checkbox"
                      checked={newSpace.partFenced}
                      onChange={(e) => setNewSpace({ ...newSpace, partFenced: e.target.checked })}
                      style={{ display: "none" }}
                    />
                    <span className="custom-checkbox"></span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <CircleHalf size={16} weight="regular" style={{ color: "#006947" }} />
                      Part fenced
                    </span>
                  </label>

                  <label className="facility-option">
                    <input
                      type="checkbox"
                      checked={newSpace.bins}
                      onChange={(e) => setNewSpace({ ...newSpace, bins: e.target.checked })}
                      style={{ display: "none" }}
                    />
                    <span className="custom-checkbox"></span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Trash size={16} weight="regular" style={{ color: "#006947" }} />
                      Dog bins
                    </span>
                  </label>

                  <label className="facility-option">
                    <input
                      type="checkbox"
                      checked={newSpace.toilets}
                      onChange={(e) => setNewSpace({ ...newSpace, toilets: e.target.checked })}
                      style={{ display: "none" }}
                    />
                    <span className="custom-checkbox"></span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Toilet size={16} weight="regular" style={{ color: "#006947" }} />
                      Toilets
                    </span>
                  </label>

                  <label className="facility-option">
                    <input
                      type="checkbox"
                      checked={newSpace.coffee}
                      onChange={(e) => setNewSpace({ ...newSpace, coffee: e.target.checked })}
                      style={{ display: "none" }}
                    />
                    <span className="custom-checkbox"></span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Coffee size={16} weight="regular" style={{ color: "#006947" }} />
                      Coffee
                    </span>
                  </label>

                  <label className="facility-option">
                    <input
                      type="checkbox"
                      checked={newSpace.parking}
                      onChange={(e) => setNewSpace({ ...newSpace, parking: e.target.checked })}
                      style={{ display: "none" }}
                    />
                    <span className="custom-checkbox"></span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Car size={16} weight="regular" style={{ color: "#006947" }} />
                      Parking
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingSpace(null);
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    if (!newSpace.name.trim()) {
                      setSpaceNamePrompt(true);
                      return;
                    }

                    setSpaces(
                      spaces.map((s) =>
                        s.name === editingSpace!.name
                          ? {
                              ...s,
                              name: newSpace.name.trim(),
                              fenced: newSpace.fenced,
                              unfenced: newSpace.unfenced,
                              bins: newSpace.bins,
                              toilets: newSpace.toilets,
                              coffee: newSpace.coffee,
                              parking: newSpace.parking,
                            }
                          : s
                      )
                    );

                    setShowEditModal(false);
                    setEditingSpace(null);
                    setNewSpace({
                      locationText: "",
                      name: "",
                      lat: "",
                      lng: "",
                      fenced: false,
                      unfenced: false,
                      partFenced: false,
                      bins: false,
                      toilets: false,
                      coffee: false,
                      parking: false,
                    });
                  }}
                >
                  Update space
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
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
              padding: "20px 24px",
              maxWidth: 360,
              width: "100%",
              border: "1px solid #e6e6e6",
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 600, marginBottom: 16 }}>
              Are you sure you want to delete {selectedSpaceNames.length === 1 ? "this space" : "these spaces"}?
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button type="button" className="btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const remainingSpaces = spaces.filter((s) => !selectedSpaceNames.includes(s.name));

                  if (remainingSpaces.length === 0 && myLocation) {
                    const spacesWithDistance = SPACES.map((space) => ({
                      ...space,
                      distance: distanceKm(myLocation.lat, myLocation.lng, space.lat, space.lng),
                    })).sort((a, b) => a.distance - b.distance);

                    setSpaces([spacesWithDistance[0] as any]);
                  } else {
                    setSpaces(remainingSpaces);
                  }

                  setSelectedSpaceNames([]);
                  setShowDeleteModal(false);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full map modal */}
      {showFullMap && (
        <MapboxFullMap
          spaces={filteredSpaces}
          myLocation={showMyLocation ? myLocation : null}
          selectedSpaceName={selectedSpaceName}
          selectedSpaceNames={selectedSpaceNames}
          onClose={() => {
            setShowFullMap(false);
            setRouteData(null);
          }}
          onGetDirections={(space) => {
            setDirectionsSpace(space);
            setShowDirectionsDrawer(true);
          }}
          routeData={routeData}
          onChangeRoute={() => {
            setShowFullMap(false);
            setRouteData(null);
            setShowDirectionsDrawer(true);
          }}
        />
      )}

      {/* Directions Drawer */}
      <DirectionsDrawer
        isOpen={showDirectionsDrawer}
        onClose={() => setShowDirectionsDrawer(false)}
        spaceName={directionsSpace?.name || ""}
        spaceLat={directionsSpace?.lat || 0}
        spaceLng={directionsSpace?.lng || 0}
        userLocation={myLocation}
        onRequestLocation={getMyLocation}
        onShowRoute={(route) => {
          setRouteData(route);
          setShowFullMap(true);
          setShowDirectionsDrawer(false);
        }}
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInFromRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideUp {
          from { transform: translate(-50%, 20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>

      {/* Floating Action Button (FAB) */}
      <button
        type="button"
        onClick={() => setShowAddDrawer(true)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "#006947",
          color: "#fff",
          border: "none",
          boxShadow: "0 4px 16px rgba(0, 105, 71, 0.3)",
          fontSize: 28,
          fontWeight: 300,
          cursor: "pointer",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 105, 71, 0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 105, 71, 0.3)";
        }}
        aria-label="Add a new space"
      >
        +
      </button>
    </main>
    
    <Footer />
    </div>
  );
}
