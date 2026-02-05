"use client";

import { useState } from "react";
import {
  X,
  Barricade,
  TrashSimple,
  Toilet,
  Coffee,
  Car,
  CircleHalf,
  MapPin,
  MagnifyingGlass,
  Warning,
  ArrowsOut,
  MapPinLine,
  CaretRight,
} from "@phosphor-icons/react";

type Location = {
  lat: number;
  lng: number;
};

type LocationResult = {
  lat: number;
  lng: number;
  name: string;
  displayName: string;
  distance?: number;
};

type Props = {
  onClose: () => void;
  onSave: (data: any) => void;
  userLocation: Location | null;
};

// Calculate distance between two points
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

// Search for locations - returns multiple results
async function searchLocations(
  query: string,
  userLocation: Location | null
): Promise<LocationResult[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&countrycodes=gb`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    const results: LocationResult[] = data.map((item: any) => {
      const lat = Number(item.lat);
      const lng = Number(item.lon);
      const name = item.display_name?.split(",")[0] || query;
      const displayName = item.display_name || query;
      const distance = userLocation
        ? distanceKm(userLocation.lat, userLocation.lng, lat, lng)
        : undefined;

      return { lat, lng, name, displayName, distance };
    });

    // Sort by distance if user location is available
    if (userLocation) {
      results.sort((a, b) => (a.distance || 999) - (b.distance || 999));
    }

    return results;
  } catch {
    return [];
  }
}

export default function AddPlaceDrawer({ onClose, onSave, userLocation }: Props) {
  const [locationInput, setLocationInput] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [location, setLocation] = useState<Location | null>(null);
  const [locationName, setLocationName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [facilityError, setFacilityError] = useState(false);
  
  // Multiple results handling
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);

  const [facilities, setFacilities] = useState({
    fenced: false,
    unfenced: false,
    partFenced: false,
    bins: false,
    toilets: false,
    coffee: false,
    parking: false,
  });

  const handleLocationSearch = async () => {
    if (!locationInput.trim()) return;

    setIsSearching(true);
    setLocationError(null);
    setSearchResults([]);
    setShowResults(false);
    setShowAllResults(false);

    const results = await searchLocations(locationInput, userLocation);

    if (results.length === 0) {
      setLocationError("No locations found. Try a postcode or drop a pin on the map.");
    } else if (results.length === 1) {
      // Single result - select it directly
      handleSelectLocation(results[0]);
    } else {
      // Multiple results - show list
      setSearchResults(results);
      setShowResults(true);
    }

    setIsSearching(false);
  };

  const handleSelectLocation = (result: LocationResult) => {
    setLocation({ lat: result.lat, lng: result.lng });
    setLocationName(result.name);
    if (!placeName.trim()) {
      setPlaceName(result.name);
    }
    setShowResults(false);
    setSearchResults([]);
    setLocationError(null);
  };

  const handleDropPin = () => {
    // This would open a pin drop map - for now show message
    setLocationError("Pin drop coming soon. Please try entering a postcode instead.");
  };

  const handleSave = () => {
    if (!location) {
      setLocationError("Please set a location first");
      return;
    }

    const hasFacility = facilities.fenced || facilities.unfenced || facilities.partFenced ||
                        facilities.bins || facilities.toilets || facilities.coffee || facilities.parking;
    
    if (!hasFacility) {
      setFacilityError(true);
      return;
    }

    setFacilityError(false);

    onSave({
      name: placeName.trim() || locationName || "Unnamed Place",
      lat: location.lat,
      lng: location.lng,
      ...facilities,
    });
  };

  const toggleFacility = (key: keyof typeof facilities) => {
    setFacilities({ ...facilities, [key]: !facilities[key] });
    setFacilityError(false);
  };

  // How many results to show initially
  const visibleResults = showAllResults ? searchResults : searchResults.slice(0, 3);
  const hasMoreResults = searchResults.length > 3;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer add-place-drawer">
        {/* Header - no divider, tighter spacing */}
        <div className="drawer-header-compact">
          <h2>Add a place</h2>
          <button onClick={onClose} className="close-btn">
            <X size={24} />
          </button>
        </div>

        <div className="drawer-content-compact">
          {/* Location Search */}
          <div className="form-section-compact">
            <label className="form-label-green">
              Where is the new place?
            </label>
            <div className="search-input-wrapper" style={{ marginTop: 6 }}>
              <MagnifyingGlass size={18} color="#888" />
              <input
                type="text"
                placeholder="Enter postcode or place name"
                value={locationInput}
                onChange={(e) => {
                  setLocationInput(e.target.value);
                  setShowResults(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLocationSearch()}
                className="search-input"
              />
            </div>

            <button
              className="btn-secondary"
              onClick={handleLocationSearch}
              disabled={isSearching || !locationInput.trim()}
              style={{ marginTop: 8, width: "100%" }}
            >
              {isSearching ? "Searching..." : "Find location"}
            </button>

            {/* Multiple Results List */}
            {showResults && searchResults.length > 0 && (
              <div className="location-results">
                <p className="results-hint">
                  {searchResults.length} locations found. Nearest shown first.
                </p>
                {visibleResults.map((result, index) => (
                  <button
                    key={index}
                    className="location-result-item"
                    onClick={() => handleSelectLocation(result)}
                  >
                    <MapPinLine size={18} color="#006947" />
                    <div className="result-details">
                      <span className="result-name">{result.name}</span>
                      {result.distance !== undefined && (
                        <span className="result-distance">
                          {result.distance.toFixed(1)} km away
                        </span>
                      )}
                    </div>
                    <CaretRight size={16} color="#888" />
                  </button>
                ))}
                
                {hasMoreResults && !showAllResults && (
                  <button
                    className="btn-text show-more-btn"
                    onClick={() => setShowAllResults(true)}
                  >
                    Show {searchResults.length - 3} more results
                  </button>
                )}

                <div className="results-fallback">
                  <span>Can't find it?</span>
                  <button className="btn-text" onClick={handleDropPin}>
                    Drop a pin on map
                  </button>
                  <span>or try a postcode</span>
                </div>
              </div>
            )}

            {locationError && (
              <div className="error-message" style={{ marginTop: 8, display: "flex", alignItems: "flex-start", gap: 6 }}>
                <Warning size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{locationError}</span>
              </div>
            )}

            {location && !showResults && (
              <div className="location-confirmed">
                <MapPin size={18} color="#006947" weight="fill" />
                <span>Location pin added to map</span>
              </div>
            )}
          </div>

          {/* Place Name */}
          <div className="form-section-compact">
            <label className="form-label-green">
              Give your new place a name
            </label>
            <input
              type="text"
              placeholder="e.g. Dulwich Park - dog field"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              style={{ marginTop: 6 }}
            />
            <span className="form-hint-green">Or leave blank to use location name</span>
          </div>

          {/* Facilities */}
          <div className="form-section-compact">
            <p className="form-label-green" style={{ marginBottom: 8 }}>What's here?</p>
            
            {facilityError && (
              <div className="error-message" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <Warning size={16} />
                <span>Please select at least one facility</span>
              </div>
            )}

            <div className="facility-chips">
              <button
                className={`filter-chip ${facilities.fenced ? "is-on" : ""}`}
                onClick={() => toggleFacility("fenced")}
              >
                <Barricade size={16} weight="bold" />
                Fenced
              </button>
              <button
                className={`filter-chip ${facilities.unfenced ? "is-on" : ""}`}
                onClick={() => toggleFacility("unfenced")}
              >
                <ArrowsOut size={16} weight="bold" />
                Unfenced
              </button>
              <button
                className={`filter-chip ${facilities.partFenced ? "is-on" : ""}`}
                onClick={() => toggleFacility("partFenced")}
              >
                <CircleHalf size={16} weight="bold" />
                Part-fenced
              </button>
              <button
                className={`filter-chip ${facilities.bins ? "is-on" : ""}`}
                onClick={() => toggleFacility("bins")}
              >
                <TrashSimple size={16} weight="bold" />
                Dog bins
              </button>
              <button
                className={`filter-chip ${facilities.toilets ? "is-on" : ""}`}
                onClick={() => toggleFacility("toilets")}
              >
                <Toilet size={16} weight="bold" />
                Toilets
              </button>
              <button
                className={`filter-chip ${facilities.coffee ? "is-on" : ""}`}
                onClick={() => toggleFacility("coffee")}
              >
                <Coffee size={16} weight="bold" />
                Coffee nearby
              </button>
              <button
                className={`filter-chip ${facilities.parking ? "is-on" : ""}`}
                onClick={() => toggleFacility("parking")}
              >
                <Car size={16} weight="bold" />
                Parking
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="drawer-footer-compact">
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={!location}
            style={{ width: "100%" }}
          >
            Add place
          </button>
        </div>
      </div>
    </>
  );
}
