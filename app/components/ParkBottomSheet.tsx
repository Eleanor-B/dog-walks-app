"use client";

import {
  Heart,
  Pencil,
  NavigationArrow,
  X,
  Barricade,
  TrashSimple,
  Toilet,
  Coffee,
  Car,
  CircleHalf,
  MapPin,
  Info,
  ArrowsOut,
  Crosshair,
} from "@phosphor-icons/react";
import type { Park } from "../page";

type Location = {
  lat: number;
  lng: number;
};

type Props = {
  park: Park;
  userLocation: Location | null;
  isFavourite: boolean;
  canEdit: boolean;
  onClose: () => void;
  onToggleFavourite: () => void;
  onEdit: () => void;
  onGetDirections: () => void;
  onRequestLocation: () => void;
  /** When true, sheet and backdrop animate down out of view (e.g. during adjust pin) */
  slideOut?: boolean;
  /** When true, user must sign in to save to favourites (show prompt) */
  requireLoginForFavourite?: boolean;
  /** Called when user taps "Add facilities" for a park with no facility info (user must be logged in) */
  onAddFacilities?: () => void;
};

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

export default function ParkBottomSheet({
  park,
  userLocation,
  isFavourite,
  canEdit,
  onClose,
  onToggleFavourite,
  onEdit,
  onGetDirections,
  onRequestLocation,
  slideOut = false,
  requireLoginForFavourite = false,
  onAddFacilities,
}: Props) {
  const distance = userLocation
    ? distanceKm(userLocation.lat, userLocation.lng, park.lat, park.lng)
    : null;

  const hasNoFacilityInfo =
    !park.fenced &&
    !park.unfenced &&
    !park.partFenced &&
    !park.bins &&
    !park.toilets &&
    !park.coffee &&
    !park.parking;

  // Collect facilities to display
  const facilities: { icon: React.ReactNode; label: string }[] = [];
  
  if (park.fenced) facilities.push({ icon: <Barricade size={16} weight="bold" />, label: "Fenced" });
  if (park.unfenced) facilities.push({ icon: <ArrowsOut size={16} weight="bold" />, label: "Unfenced" });
  if (park.partFenced) facilities.push({ icon: <CircleHalf size={16} weight="bold" />, label: "Part-fenced" });
  if (park.bins) facilities.push({ icon: <TrashSimple size={16} weight="bold" />, label: "Dog bins" });
  if (park.toilets) facilities.push({ icon: <Toilet size={16} weight="bold" />, label: "Toilets" });
  if (park.coffee) facilities.push({ icon: <Coffee size={16} weight="bold" />, label: "Coffee nearby" });
  if (park.parking) facilities.push({ icon: <Car size={16} weight="bold" />, label: "Parking" });

  // Auto-detected amenities
  if (park.isAutoDiscovered && park.nearbyAmenities) {
    if (park.nearbyAmenities.cafes > 0 && !park.coffee) {
      facilities.push({ icon: <Coffee size={16} weight="bold" />, label: `${park.nearbyAmenities.cafes} cafe${park.nearbyAmenities.cafes > 1 ? "s" : ""} nearby` });
    }
    if (park.nearbyAmenities.parking > 0 && !park.parking) {
      facilities.push({ icon: <Car size={16} weight="bold" />, label: `Parking nearby` });
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`bottom-sheet-backdrop ${slideOut ? "bottom-sheet-backdrop-slide-out" : ""}`}
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className={`bottom-sheet ${slideOut ? "bottom-sheet-slide-out" : ""}`}>
        {/* Handle */}
        <div className="sheet-handle" />

        {/* Header */}
        <div className="sheet-header">
          <div className="sheet-title-row">
            <h2 className="sheet-title">{park.name}</h2>
            <div className="sheet-actions">
              <button
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
              {canEdit && (
                <button
                  className="icon-btn edit-btn"
                  onClick={onEdit}
                  title="Edit this place"
                >
                  <Pencil size={20} weight="regular" color="#209326" />
                </button>
              )}
            </div>
          </div>
          
          {distance !== null && (
            <p className="sheet-distance">
              <MapPin size={14} weight="bold" color="#209326" />
              {distance.toFixed(1)} km away
            </p>
          )}
        </div>

        {/* Facilities */}
        <div className="sheet-section">
          {hasNoFacilityInfo ? (
            <div className="no-facilities-nudge">
              <p>Know this place? Help other dog walkers by adding its facilities.</p>
            </div>
          ) : facilities.length > 0 ? (
            <div className="facilities-list">
              {facilities.map((f, i) => (
                <span key={i} className="facility-tag">
                  {f.icon}
                  {f.label}
                </span>
              ))}
            </div>
          ) : (
            <div className="no-data-message">
              <Info size={18} color="#209326" />
              <span>No dog-friendly info yet</span>
            </div>
          )}
        </div>

        {/* Added by info */}
        {park.addedBy && (
          <p className="added-by">
            Added by {park.addedBy}
            {park.addedAt && ` · ${new Date(park.addedAt).toLocaleDateString()}`}
          </p>
        )}

        {/* Actions */}
        <div className="sheet-footer">
          {hasNoFacilityInfo && (requireLoginForFavourite || onAddFacilities) ? (
            <div className="modal-actions-row">
              {requireLoginForFavourite ? (
                <a href="/login" className="btn-secondary" style={{ textDecoration: "none" }}>
                  Log in
                </a>
              ) : onAddFacilities ? (
                <button type="button" className="btn-secondary" onClick={onAddFacilities}>
                  Add facilities
                </button>
              ) : null}
              {userLocation ? (
                <button
                  className="btn-primary"
                  onClick={onGetDirections}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <NavigationArrow size={18} weight="bold" />
                  Get directions
                </button>
              ) : (
                <button
                  className="btn-secondary"
                  onClick={onRequestLocation}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <Crosshair size={18} weight="bold" />
                  Share location to get directions
                </button>
              )}
            </div>
          ) : userLocation ? (
            <button
              className="btn-primary"
              onClick={onGetDirections}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "fit-content" }}
            >
              <NavigationArrow size={18} weight="bold" />
              Get directions
            </button>
          ) : (
            <button
              className="btn-secondary"
              onClick={onRequestLocation}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "fit-content" }}
            >
              <Crosshair size={18} weight="bold" />
              Share location to get directions
            </button>
          )}
        </div>
      </div>
    </>
  );
}
