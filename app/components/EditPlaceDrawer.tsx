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
} from "@phosphor-icons/react";
import type { Park } from "../page";

type Props = {
  park: Park;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete: () => void;
};

async function lookupLocation(query: string): Promise<{ lat: number; lng: number; name: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=gb`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = Number(data[0].lat);
    const lng = Number(data[0].lon);
    const name = data[0].display_name?.split(",")[0] || query;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, name };
  } catch {
    return null;
  }
}

export default function EditPlaceDrawer({ park, onClose, onSave, onDelete }: Props) {
  const [placeName, setPlaceName] = useState(park.name);
  const [locationInput, setLocationInput] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number }>({ lat: park.lat, lng: park.lng });
  const [isSearching, setIsSearching] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [facilityError, setFacilityError] = useState(false);

  const [facilities, setFacilities] = useState({
    fenced: park.fenced || false,
    unfenced: park.unfenced || false,
    partFenced: park.partFenced || false,
    bins: park.bins || false,
    toilets: park.toilets || false,
    coffee: park.coffee || false,
    parking: park.parking || false,
  });

  const handleLocationSearch = async () => {
    if (!locationInput.trim()) return;

    setIsSearching(true);
    setLocationError(null);

    const result = await lookupLocation(locationInput);

    if (result) {
      setLocation({ lat: result.lat, lng: result.lng });
      setLocationError(null);
    } else {
      setLocationError("Sorry, we couldn't find that location. Please try again.");
    }

    setIsSearching(false);
  };

  const handleSave = () => {
    const hasFacility = facilities.fenced || facilities.unfenced || facilities.partFenced ||
                        facilities.bins || facilities.toilets || facilities.coffee || facilities.parking;
    
    if (!hasFacility) {
      setFacilityError(true);
      return;
    }

    setFacilityError(false);

    onSave({
      name: placeName.trim() || park.name,
      lat: location.lat,
      lng: location.lng,
      ...facilities,
    });
  };

  const toggleFacility = (key: keyof typeof facilities) => {
    setFacilities({ ...facilities, [key]: !facilities[key] });
    setFacilityError(false);
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer edit-place-drawer">
        {/* Header */}
        <div className="drawer-header">
          <h2>Edit place</h2>
          <button onClick={onClose} className="close-btn">
            <X size={24} />
          </button>
        </div>

        <div className="drawer-content">
          {/* Name */}
          <div className="form-section">
            <label className="form-label">
              Place name
              <input
                type="text"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder="e.g. Dulwich Park - dog field"
                style={{ marginTop: 8 }}
              />
            </label>
          </div>

          {/* Location */}
          <div className="form-section">
            <label className="form-label">
              Update location (optional)
              <div className="search-input-wrapper" style={{ marginTop: 8 }}>
                <MagnifyingGlass size={18} color="#888" />
                <input
                  type="text"
                  placeholder="Enter new postcode or place name"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLocationSearch()}
                  className="search-input"
                />
              </div>
              <span className="form-hint">To change the location, just type in a new place name or postcode</span>
            </label>

            {locationInput.trim() && (
              <button
                className="btn-secondary"
                onClick={handleLocationSearch}
                disabled={isSearching}
                style={{ marginTop: 8, width: "100%" }}
              >
                {isSearching ? "Searching..." : "Update location"}
              </button>
            )}

            {locationError && (
              <div className="error-message" style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <Warning size={16} />
                <span>{locationError}</span>
              </div>
            )}
          </div>

          {/* Facilities */}
          <div className="form-section">
            <p className="form-label" style={{ marginBottom: 12 }}>Facilities</p>
            
            {facilityError && (
              <div className="error-message" style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
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
        <div className="drawer-footer" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16 }}>
          <button
            onClick={onDelete}
            className="delete-btn"
          >
            <TrashSimple size={18} color="#666" />
            Delete this place
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            style={{ width: "auto", minWidth: 200 }}
          >
            Save changes
          </button>
        </div>
      </div>
    </>
  );
}
