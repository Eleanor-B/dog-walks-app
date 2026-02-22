"use client";

import { useState, useEffect } from "react";
import {
  X,
  Heart,
  Pencil,
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
  onAdjustPinLocation?: () => void;
  /** When set, drawer shows compact "confirm pin" view (title, heart, edit, Save only) */
  mode?: "full" | "confirmPin";
  isFavourite?: boolean;
  onToggleFavourite?: () => void;
  onShowFullEdit?: () => void;
};

async function lookupLocation(query: string): Promise<{ lat: number; lng: number; name: string } | null> {
  const q = query.trim();
  if (!q) return null;

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (mapboxToken) {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?country=GB&limit=1&types=place,postcode,address,poi,locality&access_token=${mapboxToken}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const features = data.features;
        if (Array.isArray(features) && features.length > 0) {
          const f = features[0];
          const coords = f.geometry?.coordinates ?? f.center;
          if (Array.isArray(coords) && coords.length >= 2) {
            const lng = Number(coords[0]);
            const lat = Number(coords[1]);
            const name = (f.properties?.name ?? f.text ?? f.place_name ?? query).toString().split(",")[0] || query;
            if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng, name };
          }
        }
      }
    } catch {
      /* fall through to Nominatim */
    }
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=gb`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0];
    let lat = Number(first.lat);
    let lng = Number(first.lon);
    const bbox = first.boundingbox;
    if (Array.isArray(bbox) && bbox.length >= 4) {
      const south = Number(bbox[0]);
      const north = Number(bbox[1]);
      const west = Number(bbox[2]);
      const east = Number(bbox[3]);
      if (Number.isFinite(south) && Number.isFinite(north) && Number.isFinite(west) && Number.isFinite(east)) {
        lat = (south + north) / 2;
        lng = (west + east) / 2;
      }
    }
    const name = first.display_name?.split(",")[0] || query;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, name };
  } catch {
    return null;
  }
}

export default function EditPlaceDrawer({
  park,
  onClose,
  onSave,
  onDelete,
  onAdjustPinLocation,
  mode = "full",
  isFavourite = false,
  onToggleFavourite,
  onShowFullEdit,
}: Props) {
  const [placeName, setPlaceName] = useState(park.name);
  const [locationInput, setLocationInput] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number }>({ lat: park.lat, lng: park.lng });

  // Sync location when parent updates it (e.g. after "Adjust pin location")
  useEffect(() => {
    setLocation({ lat: park.lat, lng: park.lng });
  }, [park.lat, park.lng]);
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

  const handleConfirmPinSave = () => {
    onSave({
      name: park.name,
      lat: park.lat,
      lng: park.lng,
      fenced: park.fenced,
      unfenced: park.unfenced,
      partFenced: park.partFenced,
      bins: park.bins,
      toilets: park.toilets,
      coffee: park.coffee,
      parking: park.parking,
    });
  };

  if (mode === "confirmPin") {
    return (
      <>
        <div className="drawer-overlay" onClick={onClose} />
        <div className="drawer edit-place-drawer edit-place-drawer-confirm">
          <div className="drawer-header drawer-header-compact">
            <h2 className="edit-place-confirm-title">{park.name}</h2>
            <div className="edit-place-confirm-actions">
              {onToggleFavourite && (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={onToggleFavourite}
                  title={isFavourite ? "Remove from favourites" : "Add to favourites"}
                >
                  <Heart
                    size={24}
                    weight={isFavourite ? "fill" : "regular"}
                    color={isFavourite ? "#DD6616" : "#209326"}
                  />
                </button>
              )}
              {onShowFullEdit && (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={onShowFullEdit}
                  title="Edit details"
                >
                  <Pencil size={20} weight="regular" color="#209326" />
                </button>
              )}
              <button onClick={onClose} className="close-btn" aria-label="Close">
                <X size={24} />
              </button>
            </div>
          </div>
          <div className="drawer-content drawer-content-compact edit-place-confirm-content">
            <p className="form-hint" style={{ margin: 0 }}>
              Pin location updated. Save to confirm.
            </p>
          </div>
          <div className="drawer-footer drawer-footer-compact">
            <button className="btn-primary" onClick={handleConfirmPinSave} style={{ width: "100%", maxWidth: 280 }}>
              Save
            </button>
          </div>
        </div>
      </>
    );
  }

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
            <label className="form-label edit-place-label">
              Place name
              <input
                type="text"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder="e.g. Dulwich Park - dog field"
                className="edit-place-input"
              />
            </label>
          </div>

          {/* Location */}
          <div className="form-section">
            <label className="form-label edit-place-label">
              Update location (optional)
              <div className="search-input-wrapper edit-place-search-wrapper">
                <MagnifyingGlass size={18} className="edit-place-search-icon" />
                <input
                  type="text"
                  placeholder="Enter new postcode or place name"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLocationSearch()}
                  className="search-input"
                />
              </div>
              <span className="form-hint">To change the location, search for a new place or adjust the pin on the map.</span>
            </label>
            {onAdjustPinLocation && (
              <p className="form-hint" style={{ marginTop: 8, marginBottom: 0 }}>
                Tap the map to set the exact spot for this place.
              </p>
            )}

            {onAdjustPinLocation && (
              <button
                type="button"
                className="btn-secondary adjust-pin-btn"
                onClick={onAdjustPinLocation}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <MapPin size={18} weight="fill" className="adjust-pin-icon" />
                Adjust pin location
              </button>
            )}

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
            <p className="form-label edit-place-label" style={{ marginBottom: 8 }}>Facilities</p>
            
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
        <div className="drawer-footer modal-actions-row">
          <button
            onClick={onDelete}
            className="delete-btn"
          >
            <TrashSimple size={18} color="#209326" />
            Delete this place
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
          >
            Save changes
          </button>
        </div>
      </div>
    </>
  );
}
