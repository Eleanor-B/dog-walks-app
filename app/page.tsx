"use client";
import MapboxFullMap from "./components/MapboxFullMap";
import { useState, useEffect } from "react";

import {
  MapPin,
  NavigationArrow,
  Barricade,
  TrashSimple,
  Toilet,
  Coffee,
  Car,
  Plus,
  X,
  CaretLeft,
  CaretRight,
  ArrowLeft,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  PersonSimpleWalk,
  Train,
  CaretDown,
  Check,
  Warning,
  Heart,
  CircleHalf,
} from "@phosphor-icons/react";

// ===== TYPES =====
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

type Location = {
  lat: number;
  lng: number;
};

type TransportMode = "walking" | "driving" | "transit" | null;

// ===== SAMPLE DATA =====
const SPACES: Space[] = [
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
  {
    name: "Brockwell Park – fenced meadow",
    lat: 51.4516,
    lng: -0.1065,
    fenced: true,
    unfenced: false,
    partFenced: false,
    bins: true,
    toilets: true,
    coffee: true,
    parking: false,
  },
  {
    name: "Burgess Park – open fields",
    lat: 51.4833,
    lng: -0.0833,
    fenced: false,
    unfenced: true,
    partFenced: false,
    bins: true,
    toilets: false,
    coffee: false,
    parking: true,
  },
];

// ===== UTILITIES =====
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
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

async function lookupPostcode(postcode: string): Promise<Location | null> {
  try {
    const query = postcode.trim();
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=gb`,
      { headers: { Accept: "application/json" } }
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

// ===== MAIN COMPONENT =====
 // State declarations
export default function Home() {
  // Location state
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [failedSearchAttempts, setFailedSearchAttempts] = useState(0);
  const [postcodeInput, setPostcodeInput] = useState("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Space state
  const [spaces, setSpaces] = useState<Space[]>(SPACES);
  const [selectedSpaceNames, setSelectedSpaceNames] = useState<string[]>([]);
  const [expandedCardNames, setExpandedCardNames] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 3;

  // Filter state
  const [filters, setFilters] = useState({
    fenced: false,
    unfenced: false,
    partFenced: false,
    bins: false,
    toilets: false,
    coffee: false,
    parking: false,
  });

// Map view state
const [showMapView, setShowMapView] = useState(false);
const [mapZoom, setMapZoom] = useState(16); // Default zoom level - adjust here (16 = street level detail for walking)

  // Directions state
  const [showDirectionsDrawer, setShowDirectionsDrawer] = useState(false);
  const [showPickSpaceDrawer, setShowPickSpaceDrawer] = useState(false);
  const [selectedTransportMode, setSelectedTransportMode] = useState<TransportMode>(null);
  const [directionsTarget, setDirectionsTarget] = useState<Space | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Add space state
  const [showAddDrawer, setShowAddDrawer] = useState(false);
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

  // Selection view state (Great Choice panel + map)
const [showSelectionView, setShowSelectionView] = useState(false);
const [hideTopDrawer, setHideTopDrawer] = useState(false); /* Controls drawer slide-up animation */

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Favorites state
const [favorites, setFavorites] = useState<string[]>([]);

const toggleFavorite = (spaceName: string) => {
  setFavorites((prev) =>
    prev.includes(spaceName)
      ? prev.filter((name) => name !== spaceName)
      : [...prev, spaceName]
  );
};
// Login alert state (for favorites)
const [showLoginAlert, setShowLoginAlert] = useState<string | null>(null);

  // ===== LOCATION HANDLERS =====
  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Your browser doesn't support location services.");
      setLocationDenied(true);
      return;
    }

    setIsLoadingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setShowLocationModal(false);
        setShowMapView(true);
        setShowDirectionsDrawer(false);
        setIsNavigating(true);
        /* DELAY_DRAWER_HIDE: Wait before sliding drawer up - adjust 800ms as needed */
        setTimeout(() => setHideTopDrawer(true), 800);
        setIsLoadingLocation(false);
      },
      (err) => {
        setIsLoadingLocation(false);
        setLocationDenied(true);
        if (err.code === 1) {
          setLocationError("Location access was denied.");
        } else {
          setLocationError("Couldn't get your location. Please try again or enter manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePostcodeSubmit = async () => {
    if (!postcodeInput.trim()) return;

    setIsLoadingLocation(true);
    setLocationError(null);

    const location = await lookupPostcode(postcodeInput);

    if (location) {
      setUserLocation(location);
      setShowLocationModal(false);
        setShowMapView(true);
        setShowDirectionsDrawer(false);
        setIsNavigating(true);
        /* DELAY_DRAWER_HIDE: Wait before sliding drawer up - adjust 800ms as needed */
        setTimeout(() => setHideTopDrawer(true), 800);
    } else {
      setLocationError("Sorry we can't find that location, please try another area name");
      setFailedSearchAttempts(prev => prev + 1);
    }

    setIsLoadingLocation(false);
  };

  // ===== FILTER & SORT LOGIC =====
  const filteredSpaces = spaces
    .filter((space) => {
      if (filters.fenced && !space.fenced) return false;
      if (filters.unfenced && !space.unfenced) return false;
      if (filters.partFenced && !space.partFenced) return false;
      if (filters.bins && !space.bins) return false;
      if (filters.toilets && !space.toilets) return false;
      if (filters.coffee && !space.coffee) return false;
      if (filters.parking && !space.parking) return false;
      return true;
    })
    .map((space) => ({
      ...space,
      km: userLocation ? distanceKm(userLocation.lat, userLocation.lng, space.lat, space.lng) : null,
    }))
    .sort((a, b) => {
      if (a.km === null || b.km === null) return 0;
      return a.km - b.km;
    });

  const totalPages = Math.ceil(filteredSpaces.length / ITEMS_PER_PAGE);
  const paginatedSpaces = filteredSpaces.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  // ===== SELECTION HANDLERS =====
const toggleSpaceSelection = (name: string) => {
  if (selectedSpaceNames.includes(name)) {
    // Deselect - close selection view and map
    setSelectedSpaceNames([]);
    setShowSelectionView(false);
    setShowMapView(false);
    setDirectionsTarget(null);
  } else {
    // Select - open selection view and load map
    const space = filteredSpaces.find(s => s.name === name);
    setSelectedSpaceNames([name]);
    setShowSelectionView(true);
    setShowMapView(true);
    setDirectionsTarget(space || null);
  }
};

// Back to search - full reset
const handleBackToSearch = () => {
  setShowSelectionView(false);
  setShowMapView(false);
  setSelectedSpaceNames([]);
  setDirectionsTarget(null);
  setShowDirectionsDrawer(false);
  setSelectedTransportMode(null);
  setIsNavigating(false);
  setHideTopDrawer(false); /* Reset drawer state when going back */
};

  const handleGetDirections = () => {
    if (selectedSpaceNames.length === 0) return;

    if (selectedSpaceNames.length === 1) {
      const space = spaces.find((s) => s.name === selectedSpaceNames[0]);
      if (space) {
        setDirectionsTarget(space);
        setShowMapView(true);
        setShowDirectionsDrawer(true);
      }
    } else {
      setShowPickSpaceDrawer(true);
    }
  };

  const handlePickSpaceForDirections = (space: Space) => {
    setDirectionsTarget(space);
    setShowPickSpaceDrawer(false);
    setShowMapView(true);
    setShowDirectionsDrawer(true);
  };

  const handleSelectTransportMode = (mode: TransportMode) => {
    // Check if we have user location, if not show modal
    setSelectedTransportMode(mode);
    if (!userLocation) {
      setShowLocationModal(true);
      return;
    }
    setSelectedTransportMode(mode);
    setIsNavigating(true);
        /* DELAY_DRAWER_HIDE: Wait before sliding drawer up - adjust 800ms as needed */
        setTimeout(() => setHideTopDrawer(true), 800);
    setShowDirectionsDrawer(false);
        setIsNavigating(true);
        /* DELAY_DRAWER_HIDE: Wait before sliding drawer up - adjust 800ms as needed */
        setTimeout(() => setHideTopDrawer(true), 800);
    setShowMapView(true);
    // In real app, this would fetch directions from Mapbox API
  };

  // ===== ADD SPACE HANDLER =====
  const handleAddSpace = async () => {
    if (!newSpace.name.trim()) return;

    let lat = parseFloat(newSpace.lat);
    let lng = parseFloat(newSpace.lng);

    if (newSpace.locationText && (!lat || !lng)) {
      const location = await lookupPostcode(newSpace.locationText);
      if (location) {
        lat = location.lat;
        lng = location.lng;
      }
    }

    if (!lat || !lng) {
      setToastMessage("Please enter a valid location");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    const space: Space = {
      name: newSpace.name,
      lat,
      lng,
      fenced: newSpace.fenced,
      unfenced: newSpace.unfenced,
      partFenced: newSpace.partFenced,
      bins: newSpace.bins,
      toilets: newSpace.toilets,
      coffee: newSpace.coffee,
      parking: newSpace.parking,
    };

    setSpaces([...spaces, space]);
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
    setToastMessage("Space added successfully!");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const clearFilters = () => {
    setFilters({
      fenced: false,
      unfenced: false,
      partFenced: false,
      bins: false,
      toilets: false,
      coffee: false,
      parking: false,
    });
  };

  // ===== RENDER =====
  return (
    <div className="page-container">
      {/* ===== LOCATION PERMISSION MODAL ===== */}
      {showLocationModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ gap: "16px", display: "flex", flexDirection: "column", paddingTop: "48px" }}>
            {/* Close button - top right */}
            <button onClick={() => setShowLocationModal(false)} style={{ position: "fixed", top: "12px", right: "12px", background: "none", border: "none", padding: 12, margin: 0, cursor: "pointer" }}>
              <X size={24} color="var(--color-text-secondary)" />
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h3 className="modal-title" style={{ margin: 0 }}>Enter your postcode or location to find spaces</h3>
            </div>
            {!locationDenied ? (
              <div className="modal-actions" style={{ gap: "10px", display: "flex", flexDirection: "column" }}>
                <button
                  className="btn-primary"
                  onClick={requestGeolocation}
                  disabled={isLoadingLocation}
                  style={{ width: "100%", margin: 0 }}
                >
                  {isLoadingLocation ? "Getting location..." : "Allow once"}
                </button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    requestGeolocation();
                    // In real app, would set preference for always allowing
                  }}
                  disabled={isLoadingLocation}
                  style={{ width: "100%", margin: 0 }}
                >
                  Allow every time
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setLocationDenied(true)}
                  style={{ width: "100%", margin: 0 }}
                >
                  Dont allow
                </button>
              </div>
            ) : failedSearchAttempts >= 3 ? (
              <>
                <p className="modal-text" style={{ margin: 0, color: "var(--color-terracotta)" }}>
                  We are sorry we are having trouble locating you. To get directions please allow us to use your location.
                </p>
                <div className="modal-actions" style={{ gap: "10px", display: "flex", flexDirection: "column" }}>
                  <button
                    className="btn-primary"
                    onClick={requestGeolocation}
                    disabled={isLoadingLocation}
                    style={{ width: "100%", margin: 0 }}
                  >
                    {isLoadingLocation ? "Getting location..." : "Allow once"}
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      requestGeolocation();
                    }}
                    disabled={isLoadingLocation}
                    style={{ width: "100%", margin: 0 }}
                  >
                    Allow every time
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="modal-text" style={{ margin: 0, color: "var(--color-terracotta)" }}>
                  {locationError}
                </p>
                <div style={{ marginBottom: 16 }}>
                  <input
                    type="text"
                    placeholder="e.g. SE22 9QA or Peckham"
                    value={postcodeInput}
                    onChange={(e) => setPostcodeInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePostcodeSubmit()}
                    style={{ marginTop: 0 }}
                  />
                </div>
                <div className="modal-actions" style={{ gap: "10px", display: "flex", flexDirection: "column" }}>
                  <button
                    className="btn-primary"
                    onClick={handlePostcodeSubmit}
                    disabled={isLoadingLocation || !postcodeInput.trim()}
                    style={{ width: "100%", margin: 0 }}
                  >
                    {isLoadingLocation ? "Finding..." : "Find spaces"}
                  </button>
                  <button
                    className="btn-text"
                    onClick={() => {
                      setLocationError(null);
                      setPostcodeInput("");
                    }}
                    style={{ marginTop: 12, textAlign: "center" }}
                  >
                    Try location again
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== HEADER ===== */}
      <header className="header">
        <div className="header-content" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px" }}>
          {hideTopDrawer ? (
            /* Map mode - show Back button only */
            <button
              onClick={handleBackToSearch}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                color: "#006947",
              }}
            >
              <CaretLeft size={18} weight="bold" />
              Back
            </button>
          ) : (
            /* Normal mode - show logo and auth buttons */
            <>
              <div style={{ flex: "1 1 0", minWidth: 0 }}>
                <img src="/GWTD-logov2.svg" alt="GoWalkTheDog" style={{ height: 24 }} />
              </div>
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <button className="btn-primary" onClick={() => window.location.href = "/signup"} style={{ height: "32px", padding: "0 12px", fontSize: "13px", margin: 0, display: "flex", alignItems: "center" }}>
                  Sign up
                </button>
                <button className="btn-text" onClick={() => window.location.href = "/login"} style={{ height: "32px", padding: "0 12px", fontSize: "13px", margin: 0, display: "flex", alignItems: "center", color: "var(--color-primary)" }}>
                  Log in
                </button>
              </div>
            </>
          )}
        </div>
      </header>
      {/* ===== MAIN CONTENT ===== */}
      <main className="main-content">
        {/* Main Headline */}
        <section style={{ paddingTop: "16px", marginBottom: "24px" }}>
          <h1 style={{ margin: "0 0 24px 0", padding: 0 }}>
            Find great places to walk your dog
          </h1>
          <p style={{ fontSize: "18px", lineHeight: "1.4", color: "var(--color-primary)", margin: "0 0 24px 0", padding: 0, fontWeight: 500 }}>
            Discover the facilities you need and get directions
          </p>
        </section>

        {/* Filters */}
        <section style={{ marginBottom: "24px" }}>
          <div style={{ padding: 0, marginBottom: "4px" }}>
          <p style={{ fontSize: "14px", fontWeight: 500, color: "#333333", margin: 0 }}>
              Select facilities {hasActiveFilters && `(${Object.values(filters).filter(Boolean).length})`}
            </p>
          </div>

          <div className="filter-chips" style={{ padding: "12px 0", overflowX: "auto", display: "flex", gap: "10px" }}>
            <button
              className={`filter-chip ${filters.fenced ? "is-on" : ""}`}
              onClick={() => setFilters({ ...filters, fenced: !filters.fenced })}
            >
              <Barricade size={16} weight="bold" />
              Fenced
            </button>
            <button
              className={`filter-chip ${filters.unfenced ? "is-on" : ""}`}
              onClick={() => setFilters({ ...filters, unfenced: !filters.unfenced })}
            >
              Unfenced
            </button>
            <button
              className={`filter-chip ${filters.partFenced ? "is-on" : ""}`}
              onClick={() => setFilters({ ...filters, partFenced: !filters.partFenced })}
            >
              <CircleHalf size={16} weight="bold" />
              Part-fenced
            </button>
            <button
              className={`filter-chip ${filters.bins ? "is-on" : ""}`}
              onClick={() => setFilters({ ...filters, bins: !filters.bins })}
            >
              <TrashSimple size={16} weight="bold" />
              Dog bins
            </button>
            <button
              className={`filter-chip ${filters.toilets ? "is-on" : ""}`}
              onClick={() => setFilters({ ...filters, toilets: !filters.toilets })}
            >
              <Toilet size={16} weight="bold" />
              Toilets
            </button>
            <button
              className={`filter-chip ${filters.coffee ? "is-on" : ""}`}
              onClick={() => setFilters({ ...filters, coffee: !filters.coffee })}
            >
              <Coffee size={16} weight="bold" />
              Coffee
            </button>
            <button
              className={`filter-chip ${filters.parking ? "is-on" : ""}`}
              onClick={() => setFilters({ ...filters, parking: !filters.parking })}
            >
              <Car size={16} weight="bold" />
              Parking
            </button>
          </div>
        </section>
{/* ===== GREAT CHOICE PANEL ===== */}
{showSelectionView && selectedSpaceNames.length > 0 && (
  <>
    {/* Great Choice Panel - Fixed at top */}
<div 
  style={{
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    background: "rgba(255, 255, 255, 0.85)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    zIndex: 200,
    padding: "24px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    transform: hideTopDrawer ? "translateY(-100%)" : "translateY(0)",
    transition: "transform 0.5s ease-in-out", /* ANIMATION_SPEED: Adjust drawer slide duration here */
    animation: !hideTopDrawer ? "slideDownPanel 0.5s ease-out" : "none"
  }}
>
  <div style={{ maxWidth: "800px", margin: "0 auto" }}>
    <h1 style={{ fontSize: "32px", margin: "0 0 16px 0" }}>Great choice</h1>
    
    {/* Selected space card */}
    {(() => {
      const space = filteredSpaces.find(s => s.name === selectedSpaceNames[0]);
      if (!space) return null;
      
      return (
        <div 
          className="space-card selected"
          style={{ marginBottom: "16px" }}
        >
          <div className="space-card-header" style={{ marginBottom: "6px" }}>
            <div className="space-card-content" style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "19px", marginBottom: "6px" }}>
                <h3 className="space-card-name" style={{ flex: 1, margin: 0 }}>{space.name}</h3>
                <button
                  className="heart-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLoginAlert(space.name);
                  }}
                  style={{ width: "24px", height: "24px", flexShrink: 0 }}
                >
                  <Heart 
                    size={24} 
                    weight="regular" 
                    color="#DDDDDD"
                  />
                </button>
              </div>
              {space.km !== null && (
                <p className="space-card-distance" style={{ margin: 0 }}>{space.km.toFixed(1)}km away</p>
              )}
            </div>
          </div>

          {/* Facilities - always expanded in Great Choice */}
          <div className="space-card-facilities" style={{ marginTop: "8px" }}>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-primary)", margin: "0 0 8px 0" }}>
              Facilities
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {space.unfenced && <span className="facility-tag">Unfenced</span>}
              {space.fenced && <span className="facility-tag"><Barricade size={14} weight="bold" />Fenced</span>}
              {space.bins && <span className="facility-tag"><TrashSimple size={14} weight="bold" />Dog bins</span>}
              {space.toilets && <span className="facility-tag"><Toilet size={14} weight="bold" />Toilets</span>}
              {space.parking && <span className="facility-tag"><Car size={14} weight="bold" />Parking</span>}
              {space.coffee && <span className="facility-tag"><Coffee size={14} weight="bold" />Coffee</span>}
            </div>
          </div>
          
          {/* Login alert for favorites */}
          {showLoginAlert === space.name && (
            <p style={{ 
              fontSize: "14px", 
              fontWeight: 400, 
              lineHeight: 1.3, 
              color: "#D35603", 
              margin: "12px 0 0 0" 
            }}>
              To add a place to your favourites please <a href="/login" style={{ color: "#D35603", textDecoration: "underline" }}>Login</a> or <a href="/signup" style={{ color: "#D35603", textDecoration: "underline" }}>Sign up</a> - for free!
            </p>
          )}
        </div>
      );
    })()}
    
    {/* Button row - Back to search and Get directions */}
    <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
      <button 
        className="btn-secondary"
        onClick={handleBackToSearch}
        style={{ 
          flex: 1,
          padding: "14px 24px",
          fontSize: "16px",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          height: "40px"
        }}
      >
        <CaretLeft size={20} weight="bold" />
        Back
      </button>
      <button 
        className="btn-primary"
        onClick={() => setShowDirectionsDrawer(true)}
        style={{ 
          flex: 2,
          padding: "14px 24px",
          fontSize: "16px",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          height: "40px"
        }}
      >
        <MapPin size={20} weight="bold" />
        Get directions
      </button>
    </div>
  </div>
</div>
</>
)}
        {/* Spaces List */}
<section 
  style={{ 
    marginTop: 0, 
    padding: "0 0 58px",
    transform: showSelectionView ? "translateY(100vh)" : "translateY(0)",
    opacity: showSelectionView ? 0 : 1,
    transition: "transform 0.6s ease-out, opacity 0.5s ease-out 0.1s",
    pointerEvents: showSelectionView ? "none" : "auto"
  }}
>
<h2 style={{ margin: "0 0 14px 0", fontSize: "22px", lineHeight: "1.25" }}>
    Nearby places
  </h2>
  <p style={{ fontSize: "14px", fontWeight: 500, color: "#333333", margin: 0 }}>
    Choose a place
  </p>

  <div style={{ marginTop: 14 }}>
    {paginatedSpaces.map((space) => {
              const isSelected = selectedSpaceNames.includes(space.name);
              const isExpanded = expandedCardNames.includes(space.name);
              
              const toggleExpanded = (e: React.MouseEvent) => {
                e.stopPropagation();
                setExpandedCardNames((prev) =>
                  prev.includes(space.name)
                    ? prev.filter((n) => n !== space.name)
                    : [...prev, space.name]
                );
              };
              
              return (
              <div
                key={space.name}
                className={`space-card ${isSelected ? "selected" : ""}`}
                onClick={() => toggleSpaceSelection(space.name)}
                style={{ cursor: "pointer", marginBottom: "14px" }}
              >
                <div className="space-card-header" style={{ marginBottom: "6px" }}>
                  <div className="space-card-content" style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "19px", marginBottom: "6px" }}>
                      <h3 className="space-card-name" style={{ flex: 1, margin: 0 }}>{space.name}</h3>
                      <button
  className="heart-btn"
  onClick={(e) => {
    e.stopPropagation();
    setShowLoginAlert(space.name);
  }}
  style={{ width: "24px", height: "24px", flexShrink: 0 }}
>
  <Heart 
    size={24} 
    weight="regular" 
    color="#DDDDDD"
  />
</button>
                    </div>
                    {space.km !== null && (
                      <p className="space-card-distance" style={{ margin: 0 }}>{space.km.toFixed(1)}km away</p>
                    )}
                  </div>
                </div>

                <div className="space-card-facilities" style={{ marginTop: "8px" }}>
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", cursor: "pointer" }}
       onClick={toggleExpanded}>
    <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-primary)", margin: 0 }}>
      {isExpanded ? "Hide facilities" : "Show facilities"}
    </p>
    <CaretDown size={20} weight="bold" color="var(--color-primary)" style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
  </div>
  {isExpanded && (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
      {space.unfenced && (
        <span className="facility-tag">
          Unfenced
        </span>
      )}
      {space.fenced && (
        <span className="facility-tag">
          <Barricade size={14} weight="bold" />
          Fenced
        </span>
      )}
      {space.bins && (
        <span className="facility-tag">
          <TrashSimple size={14} weight="bold" />
          Dog bins
        </span>
      )}
      {space.toilets && (
        <span className="facility-tag">
          <Toilet size={14} weight="bold" />
          Toilets
        </span>
      )}
      {space.parking && (
        <span className="facility-tag">
          <Car size={14} weight="bold" />
          Parking
        </span>
      )}
      {space.coffee && (
        <span className="facility-tag">
          <Coffee size={14} weight="bold" />
          Coffee
        </span>
      )}
    </div>
  )}
</div>

{/* Login alert for favorites */}
                
                {/* Login alert for favorites */}
                {showLoginAlert === space.name && (
                  <p style={{ 
                    fontSize: "14px", 
                    fontWeight: 400, 
                    lineHeight: 1.3, 
                    color: "#D35603", 
                    margin: "12px 0 0 0" 
                  }}>
                    To add a place to your favourites please <a href="/login" style={{ color: "#D35603", textDecoration: "underline" }}>Login</a> or <a href="/signup" style={{ color: "#D35603", textDecoration: "underline" }}>Sign up</a> - for free!
                  </p>
                )}
              </div>
              );
            })}

            {filteredSpaces.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: 40,
                  color: "var(--color-text-secondary)",
                }}
              >
                <p>No spaces match your filters</p>
                <button className="btn-text" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            )}
          </div>

      {/* Pagination Link */}
{totalPages > 1 && (
  <div style={{ marginTop: "0px" }}>
    {currentPage < totalPages - 1 ? (
      <div 
        className="pagination-link"
        onClick={() => setCurrentPage((p) => p + 1)}
      >
        See {filteredSpaces.length - (currentPage + 1) * 3} more
        <CaretRight size={18} weight="bold" />
      </div>
    ) : (
      <div 
        className="pagination-link"
        onClick={() => setCurrentPage(0)}
      >
        <CaretLeft size={18} weight="bold" />
        Go back
      </div>
    )}
  </div>
)}

{/* ===== ADD PLACE CTA CARD ===== */}
<div 
  onClick={() => setShowAddDrawer(true)}
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#FFE6D7",
    border: "1px solid #FFBF96",
    borderRadius: "var(--radius-lg)",
    marginTop: "18px",
    cursor: "pointer",
    overflow: "hidden",
    transition: "border-color 0.15s ease"
  }}
  onMouseEnter={(e) => e.currentTarget.style.borderColor = "#FB873C"}
  onMouseLeave={(e) => e.currentTarget.style.borderColor = "#FFBF96"}
>
  <p style={{ 
    fontSize: "14px", 
    fontWeight: 500, 
    color: "var(--color-text-primary)", 
    margin: 0,
    padding: "12px 16px"
  }}>
    Know a great place? Add it for others to enjoy
  </p>
  <div style={{
    display: "flex",
    alignItems: "center",
    background: "#FFE6D7",
    padding: "8px 16px",
    alignSelf: "stretch"
  }}>
    <div style={{
      width: "28px",
      height: "28px",
      borderRadius: "50%",
      background: "var(--color-terracotta)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <Plus size={16} weight="bold" color="white" />
    </div>
  </div>
</div>
        </section>

        
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="footer" style={{ background: "var(--color-footer)", padding: "24px", textAlign: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "56px", alignItems: "center" }}>
        <div style={{ marginBottom: 24 }}>
  <img src="/GWTD-LogoWhiteSm.svg" alt="GoWalkTheDog" style={{ height: 24 }} />
</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "26px", alignItems: "center", fontSize: "16px", lineHeight: "1.2" }}>
            <div style={{ display: "flex", gap: "29px", alignItems: "center" }}>
              <a href="#" style={{ color: "var(--color-white)", textDecoration: "none" }}>Privacy Policy</a>
              <a href="#" style={{ color: "var(--color-white)", textDecoration: "none" }}>Cookie Policy</a>
              <a href="#" style={{ color: "var(--color-white)", textDecoration: "none" }}>Contact</a>
            </div>
            <p style={{ color: "var(--color-white)", margin: 0 }}>© Go Walk The Dog. All rights reserved.</p>
          </div>
        </div>
      </footer>

    

      {/* ===== MAP VIEW ===== */}
{showSelectionView && showMapView && directionsTarget && (
  <div style={{ 
    position: "fixed", 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    zIndex: 50,
    background: "#9DD87D", /* Skeleton color while map loads */
    
  }}>
    <MapboxFullMap
      space={directionsTarget}
      userLocation={userLocation}
      selectedSpaceNames={selectedSpaceNames}
      allSpaces={filteredSpaces}
      zoom={mapZoom}
      onZoomIn={() => setMapZoom((z) => Math.min(18, z + 1))}
      onZoomOut={() => setMapZoom((z) => Math.max(10, z - 1))}
      onClose={handleBackToSearch}
      isNavigating={isNavigating}
      transportMode={selectedTransportMode}
    />
    
  </div>
)}
       
      {/* ===== PICK SPACE DRAWER (when multiple selected) ===== */}
      {showPickSpaceDrawer && (
        <>
          <div className="drawer-overlay" onClick={() => setShowPickSpaceDrawer(false)} />
          <div className="drawer">
            <div className="drawer-handle" />
            <h3 className="drawer-title">Choose a destination</h3>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 16 }}>
              You have {selectedSpaceNames.length} spaces selected. Pick one to get directions.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selectedSpaceNames.map((name) => {
                const space = filteredSpaces.find((s) => s.name === name);
                if (!space) return null;
                return (
                  <button
                    key={name}
                    className="transport-option"
                    onClick={() => handlePickSpaceForDirections(space)}
                  >
                    <div className="transport-option-icon">
                      <MapPin size={20} weight="fill" />
                    </div>
                    <div className="transport-option-content">
                      <p className="transport-option-title">{space.name}</p>
                      {space.km !== null && (
                        <p className="transport-option-subtitle">{space.km.toFixed(1)} km away</p>
                      )}
                    </div>
                    <CaretRight size={20} color="var(--color-text-secondary)" />
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ===== TRANSPORT MODE DRAWER ===== */}
      {showDirectionsDrawer && !isNavigating && (
  <>
    <div
      className="drawer-overlay"
      onClick={() => setShowDirectionsDrawer(false)}
      style={{ zIndex: 600 }}
    />
    <div className="drawer" style={{ zIndex: 601 }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div className="drawer-handle" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-lg)" }}>
          <h3 className="drawer-title" style={{ margin: 0, fontSize: "22px" }}>Choose how to get there</h3>
          <button
            onClick={() => setShowDirectionsDrawer(false)}
            style={{
              background: "none",
              border: "none",
              padding: 8,
              margin: 0,
              cursor: "pointer",
              color: "var(--color-primary)",
            }}
          >
            <X size={24} weight="bold" />
          </button>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Walking option */}
          <button
            onClick={() => handleSelectTransportMode("walking")}
            style={{ 
              display: "flex",
              alignItems: "center",
              gap: "16px",
              width: "100%",
              padding: "16px",
              background: selectedTransportMode === "walking" ? "var(--color-card-selected)" : "var(--color-card)", 
              border: selectedTransportMode === "walking" ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              cursor: "pointer",
              textAlign: "left"
            }}
          >
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: selectedTransportMode === "walking" ? "var(--color-primary)" : "var(--color-background)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              <PersonSimpleWalk size={24} weight="bold" color={selectedTransportMode === "walking" ? "white" : "var(--color-primary)"} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-primary)", margin: 0 }}>Walking</p>
              <p style={{ fontSize: "13px", color: "var(--color-text-primary)", margin: "4px 0 0 0" }}>Best for footpaths, bridleways</p>
            </div>
          </button>

          {/* Driving option */}
          <button
            onClick={() => handleSelectTransportMode("driving")}
            style={{ 
              display: "flex",
              alignItems: "center",
              gap: "16px",
              width: "100%",
              padding: "16px",
              background: selectedTransportMode === "driving" ? "var(--color-card-selected)" : "var(--color-card)", 
              border: selectedTransportMode === "driving" ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              cursor: "pointer",
              textAlign: "left"
            }}
          >
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: selectedTransportMode === "driving" ? "var(--color-primary)" : "var(--color-background)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              <Car size={24} weight="bold" color={selectedTransportMode === "driving" ? "white" : "var(--color-primary)"} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-primary)", margin: 0 }}>Driving</p>
              <p style={{ fontSize: "13px", color: "var(--color-text-primary)", margin: "4px 0 0 0" }}>Fastest route by car</p>
            </div>
          </button>

          {/* Public transport option */}
          <button
            onClick={() => handleSelectTransportMode("transit")}
            style={{ 
              display: "flex",
              alignItems: "center",
              gap: "16px",
              width: "100%",
              padding: "16px",
              background: selectedTransportMode === "transit" ? "var(--color-card-selected)" : "var(--color-card)", 
              border: selectedTransportMode === "transit" ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              cursor: "pointer",
              textAlign: "left"
            }}
          >
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: selectedTransportMode === "transit" ? "var(--color-primary)" : "var(--color-background)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              <Train size={24} weight="bold" color={selectedTransportMode === "transit" ? "white" : "var(--color-primary)"} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-primary)", margin: 0 }}>Public transport</p>
              <p style={{ fontSize: "13px", color: "var(--color-text-primary)", margin: "4px 0 0 0" }}>Bus, tube and train options</p>
            </div>
          </button>
        </div>

      </div>
    </div>
  </>
)}

      {/* ===== ADD SPACE DRAWER ===== */}
      {showAddDrawer && (
        <>
          <div className="drawer-overlay" onClick={() => setShowAddDrawer(false)} />
          <div className="drawer" style={{ maxHeight: "85vh", maxWidth: "800px", margin: "0 auto" }}> {/* CONTENT_MAX_WIDTH */}
            <div className="drawer-handle" />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3 className="drawer-title" style={{ margin: 0 }}>
                Add a new space
              </h3>
              <button
                onClick={() => setShowAddDrawer(false)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 8,
                  margin: 0,
                  cursor: "pointer",
                }}
              >
                <X size={24} color="var(--color-text-secondary)" />
              </button>
            </div>

            <label>
              Space name
              <input
                type="text"
                placeholder="e.g. Dulwich Park – enclosed field"
                value={newSpace.name}
                onChange={(e) => setNewSpace({ ...newSpace, name: e.target.value })}
              />
            </label>

            <label>
              Location (postcode or place name)
              <input
                type="text"
                placeholder="e.g. SE22 9QA or Dulwich Park"
                value={newSpace.locationText}
                onChange={(e) => setNewSpace({ ...newSpace, locationText: e.target.value })}
              />
            </label>

            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Facilities</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  className={`filter-chip ${newSpace.fenced ? "is-on" : ""}`}
                  onClick={() => setNewSpace({ ...newSpace, fenced: !newSpace.fenced })}
                >
                  <Barricade size={16} weight="bold" />
                  Fenced
                </button>
                <button
                  className={`filter-chip ${newSpace.unfenced ? "is-on" : ""}`}
                  onClick={() => setNewSpace({ ...newSpace, unfenced: !newSpace.unfenced })}
                >
                  Unfenced
                </button>
                <button
                  className={`filter-chip ${newSpace.partFenced ? "is-on" : ""}`}
                  onClick={() => setNewSpace({ ...newSpace, partFenced: !newSpace.partFenced })}
                >
                  <CircleHalf size={16} weight="bold" />
                  Part-fenced
                </button>
                <button
                  className={`filter-chip ${newSpace.bins ? "is-on" : ""}`}
                  onClick={() => setNewSpace({ ...newSpace, bins: !newSpace.bins })}
                >
                  <TrashSimple size={16} weight="bold" />
                  Bins
                </button>
                <button
                  className={`filter-chip ${newSpace.toilets ? "is-on" : ""}`}
                  onClick={() => setNewSpace({ ...newSpace, toilets: !newSpace.toilets })}
                >
                  <Toilet size={16} weight="bold" />
                  Toilets
                </button>
                <button
                  className={`filter-chip ${newSpace.coffee ? "is-on" : ""}`}
                  onClick={() => setNewSpace({ ...newSpace, coffee: !newSpace.coffee })}
                >
                  <Coffee size={16} weight="bold" />
                  Coffee
                </button>
                <button
                  className={`filter-chip ${newSpace.parking ? "is-on" : ""}`}
                  onClick={() => setNewSpace({ ...newSpace, parking: !newSpace.parking })}
                >
                  <Car size={16} weight="bold" />
                  Parking
                </button>
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={handleAddSpace}
              disabled={!newSpace.name.trim() || !newSpace.locationText.trim()}
              style={{ width: "100%", marginTop: 24 }}
            >
              Add space
            </button>
          </div>
        </>
      )}

      {/* ===== TOAST ===== */}
      {showToast && <div className="toast">{toastMessage}</div>}
    </div>
  );
}
