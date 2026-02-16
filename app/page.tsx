"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "../lib/useAuth";
import { supabase } from "../lib/supabase";
import { getPlaces, addPlace, updatePlace, deletePlace } from "../lib/places";
import { getFavourites, addFavourite, removeFavourite, removeAllFavourites } from "../lib/favourites";
import MainMap from "./components/MainMap";
import ParkBottomSheet from "./components/ParkBottomSheet";
import AddPlaceDrawer from "./components/AddPlaceDrawer";
import CookieBanner from "./components/CookieBanner";
import AppFooter from "./components/AppFooter";
import AccountSettings from "./components/AccountSettings";
import EditPlaceDrawer from "./components/EditPlaceDrawer";
import TransportModeModal from "./components/TransportModeModal";

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
  CaretDown,
  CaretUp,
  MagnifyingGlass,
  Crosshair,
  Heart,
  CircleHalf,
  Pencil,
  Warning,
  ArrowsOut,
  PersonSimpleWalk,
  Train,
  PawPrint,
} from "@phosphor-icons/react";

// ===== TYPES =====
export type Park = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  isAutoDiscovered: boolean;
  // User-added info (optional for auto-discovered)
  fenced?: boolean;
  unfenced?: boolean;
  partFenced?: boolean;
  bins?: boolean;
  toilets?: boolean;
  coffee?: boolean;
  parking?: boolean;
  user_id?: string;
  addedBy?: string; // Nickname
  addedAt?: string;
  // Auto-detected nearby amenities
  nearbyAmenities?: {
    cafes: number;
    toilets: number;
    parking: number;
  };
};

type Location = {
  lat: number;
  lng: number;
};

type RouteInfo = {
  coordinates: [number, number][];
  distance: number; // in meters
  duration: number; // in seconds
  mode: "walking" | "driving" | "transit";
};

type TransportMode = "walking" | "driving" | "transit";

type ViewState = "landing" | "map";

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

async function lookupLocation(query: string): Promise<Location | null> {
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
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

// Fetch parks from Mapbox (green spaces within radius)
async function fetchNearbyParks(center: Location, radiusKm: number = 3): Promise<Park[]> {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!mapboxToken) return [];

  try {
    // Use Mapbox Geocoding API to find parks
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/park.json?proximity=${center.lng},${center.lat}&limit=10&types=poi&access_token=${mapboxToken}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    
    if (!data.features) return [];

    const parks: Park[] = data.features
      .filter((f: any) => {
        // Filter by distance
        const dist = distanceKm(center.lat, center.lng, f.center[1], f.center[0]);
        return dist <= radiusKm;
      })
      .map((f: any) => ({
        id: `mapbox-${f.id}`,
        name: f.text || f.place_name?.split(",")[0] || "Unknown Park",
        lat: f.center[1],
        lng: f.center[0],
        isAutoDiscovered: true,
        nearbyAmenities: { cafes: 0, toilets: 0, parking: 0 },
      }));

    // Fetch nearby amenities for each park
    for (const park of parks) {
      park.nearbyAmenities = await fetchNearbyAmenities(park);
    }

    return parks;
  } catch (error) {
    console.error("Error fetching parks:", error);
    return [];
  }
}

// Fetch nearby amenities (cafes, toilets, parking) within 200m
async function fetchNearbyAmenities(park: Park): Promise<{ cafes: number; toilets: number; parking: number }> {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!mapboxToken) return { cafes: 0, toilets: 0, parking: 0 };

  const amenities = { cafes: 0, toilets: 0, parking: 0 };

  try {
    // Fetch cafes
    const cafeRes = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/cafe.json?proximity=${park.lng},${park.lat}&limit=5&types=poi&access_token=${mapboxToken}`
    );
    if (cafeRes.ok) {
      const cafeData = await cafeRes.json();
      amenities.cafes = (cafeData.features || []).filter((f: any) => {
        const dist = distanceKm(park.lat, park.lng, f.center[1], f.center[0]);
        return dist <= 0.2; // 200m
      }).length;
    }

    // Fetch parking
    const parkingRes = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/parking.json?proximity=${park.lng},${park.lat}&limit=5&types=poi&access_token=${mapboxToken}`
    );
    if (parkingRes.ok) {
      const parkingData = await parkingRes.json();
      amenities.parking = (parkingData.features || []).filter((f: any) => {
        const dist = distanceKm(park.lat, park.lng, f.center[1], f.center[0]);
        return dist <= 0.2;
      }).length;
    }

    // Note: Toilets are harder to find via Mapbox - would need OpenStreetMap Overpass API
    // For now, we'll set to 0 and rely on user data
    amenities.toilets = 0;
  } catch (error) {
    console.error("Error fetching amenities:", error);
  }

  return amenities;
}

// Fetch directions from Mapbox Directions API
async function fetchDirections(
  origin: Location,
  destination: Location,
  mode: TransportMode
): Promise<RouteInfo | null> {
  // Transit mode - just return straight line
  if (mode === "transit") {
    const dist = distanceKm(origin.lat, origin.lng, destination.lat, destination.lng) * 1000; // Convert to meters
    return {
      coordinates: [
        [origin.lng, origin.lat],
        [destination.lng, destination.lat],
      ],
      distance: dist,
      duration: 0, // Unknown for transit
      mode: "transit",
    };
  }

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!mapboxToken) return null;

  const profile = mode === "walking" ? "walking" : "driving";

  try {
    const res = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full&access_token=${mapboxToken}`
    );

    if (!res.ok) return null;

    const data = await res.json();

    if (!data.routes || data.routes.length === 0) return null;

    const route = data.routes[0];

    return {
      coordinates: route.geometry.coordinates,
      distance: route.distance, // in meters
      duration: route.duration, // in seconds
      mode: mode,
    };
  } catch (error) {
    console.error("Error fetching directions:", error);
    return null;
  }
}

// ===== MAIN COMPONENT =====
export default function Home() {
  // Auth
  const { user } = useAuth();
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);

  // View state
  const [viewState, setViewState] = useState<ViewState>("landing");
  
  // Location state
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [locationInput, setLocationInput] = useState("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showPinDropMap, setShowPinDropMap] = useState(false);

  // Parks state
  const [parks, setParks] = useState<Park[]>([]);
  const [userAddedPlaces, setUserAddedPlaces] = useState<Park[]>([]);
  const [isLoadingParks, setIsLoadingParks] = useState(false);
  const [selectedPark, setSelectedPark] = useState<Park | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    fenced: false,
    unfenced: false,
    partFenced: false,
    bins: false,
    toilets: false,
    coffee: false,
    parking: false,
  });

  // Carousel ref
  const carouselRef = useRef<HTMLDivElement>(null);
  const avatarDropdownRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = 150;
      carouselRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Drawers & Modals
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [editingPark, setEditingPark] = useState<Park | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showAdjustPlaceMap, setShowAdjustPlaceMap] = useState(false);

  // Toast
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Map state
  const [mapCenter, setMapCenter] = useState<Location | null>(null);
  const [mapZoom, setMapZoom] = useState(14);
  const [fitBoundsRequestId, setFitBoundsRequestId] = useState(0);
  const [filterBarCollapsed, setFilterBarCollapsed] = useState(true);
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
  const [showOnlyFavourites, setShowOnlyFavourites] = useState(false);
  const [showOnlyMyPlaces, setShowOnlyMyPlaces] = useState(false);

  // Directions state
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [directionsMode, setDirectionsMode] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<RouteInfo | null>(null);
  const [isLoadingDirections, setIsLoadingDirections] = useState(false);
  const [directionsPark, setDirectionsPark] = useState<Park | null>(null);

  // ===== EFFECTS =====

  // Load user-added places from Supabase
  useEffect(() => {
    async function loadPlaces() {
      const dbPlaces = await getPlaces();
      if (dbPlaces.length > 0) {
        const mappedPlaces: Park[] = dbPlaces.map((p) => ({
          id: p.id,
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          isAutoDiscovered: false,
          fenced: p.fenced,
          unfenced: p.unfenced,
          partFenced: p.part_fenced,
          bins: p.bins,
          toilets: p.toilets,
          coffee: p.coffee,
          parking: p.parking,
          user_id: p.user_id,
        }));
        setUserAddedPlaces(mappedPlaces);
      }
    }
    loadPlaces();
  }, []);

  // Load favourites when user logs in
  useEffect(() => {
    async function loadFavourites() {
      if (user) {
        const favs = await getFavourites(user.id);
        setFavouriteIds(favs);
      } else {
        setFavouriteIds([]);
      }
    }
    loadFavourites();
  }, [user]);

  // Close avatar dropdown when clicking outside
  useEffect(() => {
    if (!showAvatarDropdown) return;
    function handleClick(e: MouseEvent) {
      if (avatarDropdownRef.current && !avatarDropdownRef.current.contains(e.target as Node)) {
        setShowAvatarDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showAvatarDropdown]);

  // Fetch parks when location changes
  useEffect(() => {
    async function loadParks() {
      if (!userLocation) return;
      
      setIsLoadingParks(true);
      const nearbyParks = await fetchNearbyParks(userLocation, 3);
      setParks(nearbyParks);
      setIsLoadingParks(false);
    }
    loadParks();
  }, [userLocation]);

  // ===== HANDLERS =====

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleLocationSearch = async () => {
    if (!locationInput.trim()) return;

    setIsLoadingLocation(true);
    setLocationError(null);

    const location = await lookupLocation(locationInput);

    if (location) {
      setUserLocation(location);
      setMapCenter(location);
      setViewState("map");
      setFitBoundsRequestId((i) => i + 1);
    } else {
      setLocationError("Sorry, we couldn't find that location. Please try again or drop a pin on the map.");
    }

    setIsLoadingLocation(false);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Your browser doesn't support location services.");
      return;
    }

    setIsLoadingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(loc);
        setMapCenter(loc);
        setViewState("map");
        setFitBoundsRequestId((i) => i + 1);
        setIsLoadingLocation(false);
      },
      (err) => {
        setIsLoadingLocation(false);
        if (err.code === 1) {
          setLocationError("Location access was denied. Please enter a location or drop a pin.");
        } else {
          setLocationError("Couldn't get your location. Please try again or enter manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePinDrop = (location: Location) => {
    setUserLocation(location);
    setMapCenter(location);
    setShowPinDropMap(false);
    setViewState("map");
    setFitBoundsRequestId((i) => i + 1);
  };

  const handleParkClick = (park: Park) => {
    setSelectedPark(park);
  };

  const handleCloseBottomSheet = () => {
    setSelectedPark(null);
  };

  const toggleFavorite = async (parkId: string) => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    if (favouriteIds.includes(parkId)) {
      const success = await removeFavourite(user.id, parkId);
      if (success) {
        setFavouriteIds((prev) => prev.filter((id) => id !== parkId));
      }
    } else {
      const success = await addFavourite(user.id, parkId);
      if (success) {
        setFavouriteIds((prev) => [...prev, parkId]);
      }
    }
  };

  const handleAddPlace = async (placeData: any) => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    // Check at least one facility is selected
    const hasFacility = placeData.fenced || placeData.unfenced || placeData.partFenced || 
                        placeData.bins || placeData.toilets || placeData.coffee || placeData.parking;
    if (!hasFacility) {
      showToastMessage("Please add at least one facility to this place");
      return;
    }

    const dbPlace = await addPlace({
      name: placeData.name,
      lat: placeData.lat,
      lng: placeData.lng,
      fenced: placeData.fenced,
      unfenced: placeData.unfenced,
      part_fenced: placeData.partFenced,
      bins: placeData.bins,
      toilets: placeData.toilets,
      coffee: placeData.coffee,
      parking: placeData.parking,
      user_id: user.id,
    });

    if (dbPlace) {
      const newPark: Park = {
        id: dbPlace.id,
        name: placeData.name,
        lat: placeData.lat,
        lng: placeData.lng,
        isAutoDiscovered: false,
        fenced: placeData.fenced,
        unfenced: placeData.unfenced,
        partFenced: placeData.partFenced,
        bins: placeData.bins,
        toilets: placeData.toilets,
        coffee: placeData.coffee,
        parking: placeData.parking,
        user_id: user.id,
      };
      setUserAddedPlaces([...userAddedPlaces, newPark]);
      showToastMessage("Place added!");
      setShowAddDrawer(false);
    } else {
      showToastMessage("Failed to save place");
    }
  };

  const handleEditPlace = async (placeData: any) => {
    if (!editingPark?.id) return;

    const hasFacility = placeData.fenced || placeData.unfenced || placeData.partFenced ||
                        placeData.bins || placeData.toilets || placeData.coffee || placeData.parking;
    if (!hasFacility) {
      showToastMessage("Please add at least one facility to this place");
      return;
    }

    const success = await updatePlace(editingPark.id, {
      name: placeData.name,
      lat: placeData.lat,
      lng: placeData.lng,
      fenced: placeData.fenced,
      unfenced: placeData.unfenced,
      part_fenced: placeData.partFenced,
      bins: placeData.bins,
      toilets: placeData.toilets,
      coffee: placeData.coffee,
      parking: placeData.parking,
    });

    if (success) {
      setUserAddedPlaces(userAddedPlaces.map(p => 
        p.id === editingPark.id ? { ...p, ...placeData } : p
      ));
      showToastMessage("Place updated!");
      setShowEditDrawer(false);
      setEditingPark(null);
      if (selectedPark?.id === editingPark.id) {
        setSelectedPark({ ...selectedPark, ...placeData });
      }
    } else {
      showToastMessage("Failed to update place");
    }
  };

  const handleDeletePlace = async () => {
    if (!editingPark?.id) return;

    const success = await deletePlace(editingPark.id);

    if (success) {
      setUserAddedPlaces(userAddedPlaces.filter(p => p.id !== editingPark.id));
      showToastMessage("Place deleted");
      setShowDeleteConfirm(false);
      setShowEditDrawer(false);
      setEditingPark(null);
      if (selectedPark?.id === editingPark.id) {
        setSelectedPark(null);
      }
    } else {
      showToastMessage("Failed to delete place");
    }
  };

  const handleBackToLanding = () => {
    setViewState("landing");
    setSelectedPark(null);
    setLocationInput("");
    setDirectionsMode(false);
    setCurrentRoute(null);
  };

  const handleDeleteAccountConfirm = async () => {
    if (!user) return;
    setIsDeletingAccount(true);
    try {
      await removeAllFavourites(user.id);
      await supabase.from("places").delete().eq("user_id", user.id);
      await supabase.auth.signOut();
      setShowDeleteAccountConfirm(false);
      setFavouriteIds([]);
      setShowOnlyFavourites(false);
      setShowAvatarDropdown(false);
      window.location.href = "/";
    } catch {
      setIsDeletingAccount(false);
      showToastMessage("Something went wrong. Please try again.");
    }
  };

  // Directions handlers
  const handleGetDirections = () => {
    if (!selectedPark) return;
    setDirectionsPark(selectedPark);
    setShowTransportModal(true);
  };

  const handleSelectTransportMode = async (mode: TransportMode) => {
    if (!userLocation || !directionsPark) return;

    setShowTransportModal(false);
    setIsLoadingDirections(true);

    const route = await fetchDirections(userLocation, { lat: directionsPark.lat, lng: directionsPark.lng }, mode);

    if (route) {
      setCurrentRoute(route);
      setDirectionsMode(true);
      setSelectedPark(null); // Close bottom sheet
    } else {
      showToastMessage("Couldn't get directions. Please try again.");
    }

    setIsLoadingDirections(false);
  };

  const handleCloseDirections = () => {
    setDirectionsMode(false);
    setCurrentRoute(null);
    setDirectionsPark(null);
  };

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      showToastMessage("Your browser doesn't support location services.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(loc);
        showToastMessage("Location updated!");
      },
      (err) => {
        if (err.code === 1) {
          showToastMessage("Location access was denied.");
        } else {
          showToastMessage("Couldn't get your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Format distance for display
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Format duration for display
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)} sec`;
    }
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours} hr ${remainingMins} min`;
  };

  // Combine auto-discovered and user-added places (or only current user's places when "My places" toggle is on)
  const allParks =
    showOnlyMyPlaces && user
      ? userAddedPlaces.filter((p) => p.user_id === user.id)
      : [...parks, ...userAddedPlaces];

  // Filter parks based on selected filters
  let filteredParks = allParks.filter((park) => {
    // Auto-discovered parks without user data pass through unless specific dog filters are on
    if (park.isAutoDiscovered && !park.fenced && !park.unfenced && !park.partFenced && 
        !park.bins && !park.toilets && !park.coffee && !park.parking) {
      // Only filter out if user is specifically filtering for dog-specific features
      if (filters.fenced || filters.unfenced || filters.partFenced || filters.bins) {
        return false;
      }
      // For amenity filters, use auto-detected data
      if (filters.coffee && (!park.nearbyAmenities || park.nearbyAmenities.cafes === 0)) return false;
      if (filters.parking && (!park.nearbyAmenities || park.nearbyAmenities.parking === 0)) return false;
      if (filters.toilets && (!park.nearbyAmenities || park.nearbyAmenities.toilets === 0)) return false;
      return true;
    }

    // User-added data - use explicit values
    if (filters.fenced && !park.fenced) return false;
    if (filters.unfenced && !park.unfenced) return false;
    if (filters.partFenced && !park.partFenced) return false;
    if (filters.bins && !park.bins) return false;
    if (filters.toilets && !park.toilets) return false;
    if (filters.coffee && !park.coffee) return false;
    if (filters.parking && !park.parking) return false;
    return true;
  });

  // When "View my favourites" is on, show only favourited parks
  if (showOnlyFavourites && user) {
    filteredParks = filteredParks.filter((p) => favouriteIds.includes(p.id));
  }

  // Nearest park to user (for fitting map viewport)
  const nearestPark = useMemo(() => {
    if (!userLocation || filteredParks.length === 0) return null;
    const sorted = [...filteredParks].sort(
      (a, b) =>
        distanceKm(userLocation.lat, userLocation.lng, a.lat, a.lng) -
        distanceKm(userLocation.lat, userLocation.lng, b.lat, b.lng)
    );
    return sorted[0];
  }, [userLocation, filteredParks]);

  const boundsToFit = useMemo((): [Location, Location] | undefined => {
    if (!userLocation || !nearestPark) return undefined;
    return [userLocation, { lat: nearestPark.lat, lng: nearestPark.lng }];
  }, [userLocation?.lat, userLocation?.lng, nearestPark?.lat, nearestPark?.lng]);

  const hasActiveFilters = Object.values(filters).some(Boolean);

  // ===== RENDER =====

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // Landing view
  if (viewState === "landing") {
    return (
      <div className="app-container landing-page">
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <div className="header-logo">
              <img src="/GWTD-logov2.svg" alt="GoWalkTheDog" style={{ height: 24 }} />
            </div>
            <div className="header-buttons">
              {user ? (
                <div className="avatar-dropdown-wrap" ref={avatarDropdownRef}>
                  <button
                    type="button"
                    className="avatar-btn"
                    onClick={() => setShowAvatarDropdown((v) => !v)}
                    aria-label="Favourites menu"
                    aria-expanded={showAvatarDropdown}
                    aria-haspopup="true"
                  >
                    <PawPrint size={22} weight="fill" />
                  </button>
                  {showAvatarDropdown && (
                    <div className="avatar-dropdown">
                      <button
                        type="button"
                        className="avatar-dropdown-item"
                        onClick={() => {
                          setViewState("map");
                          setShowOnlyFavourites(true);
                          setShowAvatarDropdown(false);
                        }}
                      >
                        View my favourites
                      </button>
                      <button
                        type="button"
                        className="avatar-dropdown-item"
                        onClick={async () => {
                          if (!user) return;
                          const ok = await removeAllFavourites(user.id);
                          if (ok) {
                            setFavouriteIds([]);
                            setShowOnlyFavourites(false);
                            showToastMessage("All favourites cleared");
                          }
                          setShowAvatarDropdown(false);
                        }}
                      >
                        Clear my favourites
                      </button>
                      <button
                        type="button"
                        className="avatar-dropdown-item"
                        onClick={() => {
                          setShowDeleteAccountConfirm(true);
                          setShowAvatarDropdown(false);
                        }}
                      >
                        Delete my account
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button
                    className="btn-header-primary"
                    onClick={() => (window.location.href = "/signup")}
                  >
                    Sign up
                  </button>
                  <button
                    className="btn-header-text"
                    onClick={() => (window.location.href = "/login")}
                  >
                    Log in
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="landing-main">
          {/* Hero Section - Figma 435:2604 (mobile) & 435:2816 (desktop) */}
          <div className="hero-section">
            <div className="hero-ellipse" aria-hidden="true" />
            <div className="hero-image">
              <img
                src="/dog-hero.png"
                alt="Happy dog"
                className="dog-illustration"
              />
            </div>
            <div className="hero-content">
              <h1 className="hero-title">
                Find great places to walk your dog
              </h1>
              <p className="hero-subtitle">
                Discover parks, green spaces and the facilities you need
              </p>
            </div>
          </div>

          {/* Search Card - contains filters and location inputs */}
          <div className="search-card">
            {/* Filter Section */}
            <div className="filter-section-card">
              <div className="filter-section-header-row">
                <h3 className="filter-label">
                  Select facilities {activeFilterCount > 0 && `(${activeFilterCount})`}
                </h3>
                {user && (
                  <label className="my-favourites-toggle">
                    <Heart size={18} weight="fill" className="my-favourites-toggle-icon" />
                    <span className="my-favourites-toggle-label">My favourites</span>
                    <input
                      type="checkbox"
                      checked={showOnlyMyPlaces}
                      onChange={(e) => setShowOnlyMyPlaces(e.target.checked)}
                      className="my-favourites-toggle-input"
                      aria-label="Show only my added places"
                    />
                    <span className="my-favourites-toggle-slider" />
                  </label>
                )}
              </div>
              <div className="carousel-container">
                <button 
                  className="carousel-caret"
                  onClick={() => scrollCarousel("left")}
                  aria-label="Scroll left"
                >
                  <CaretLeft size={20} weight="bold" />
                </button>
                <div className="carousel-scroll-area">
                  <div className="filter-chips-landing" ref={carouselRef}>
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
                      <ArrowsOut size={16} weight="bold" />
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
                      className={`filter-chip ${filters.parking ? "is-on" : ""}`}
                      onClick={() => setFilters({ ...filters, parking: !filters.parking })}
                    >
                      <Car size={16} weight="bold" />
                      Parking
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
                  </div>
                </div>
                <button 
                  className="carousel-caret"
                  onClick={() => scrollCarousel("right")}
                  aria-label="Scroll right"
                >
                  <CaretRight size={20} weight="bold" />
                </button>
              </div>
            </div>

            {/* Location Search */}
            <div className="location-inputs">
              <div className="location-search-row">
                <div className="search-input-with-icon">
                  <div className="search-input-icon-container" aria-hidden>
                    <MagnifyingGlass size={20} weight="bold" />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter postcode or area name"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLocationSearch()}
                    className="search-input"
                  />
                </div>
                <div className="location-or-row">
                  <span className="location-or" aria-hidden="true">or</span>
                  <button
                    className="btn-secondary location-use-current"
                    onClick={handleUseMyLocation}
                    disabled={isLoadingLocation}
                  >
                    <Crosshair size={18} weight="bold" />
                    {isLoadingLocation ? "Finding..." : "Use my location"}
                  </button>
                </div>
              </div>

              <div className="location-find-row">
                <button
                  className="btn-primary"
                  onClick={handleLocationSearch}
                  disabled={isLoadingLocation || !locationInput.trim()}
                  style={{ width: "100%" }}
                >
                  {isLoadingLocation ? "Finding..." : "Find parks nearby"}
                </button>
              </div>

              {locationError && (
                <div className="location-error">
                  <Warning size={18} color="#c53030" />
                  <span>{locationError}</span>
                  <button
                    className="btn-text"
                    onClick={() => setShowPinDropMap(true)}
                    style={{ marginLeft: 8 }}
                  >
                    Drop a pin instead
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Pin Drop Map Modal */}
        {showPinDropMap && (
          <div className="modal-overlay">
            <div className="pin-drop-modal">
              <div className="modal-header">
                <h2>Drop a pin</h2>
                <button
                  onClick={() => setShowPinDropMap(false)}
                  className="close-btn"
                >
                  <X size={24} />
                </button>
              </div>
              <p style={{ color: "#666", marginBottom: 16 }}>
                Tap the map to set your location
              </p>
              <div className="pin-drop-map-container">
                <MainMap
                  center={{ lat: 51.5074, lng: -0.1278 }}
                  zoom={12}
                  parks={[]}
                  userLocation={null}
                  onPinDrop={handlePinDrop}
                  isPinDropMode={true}
                  filters={filters}
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <AppFooter />
        {/* Delete account confirmation modal */}
        {showDeleteAccountConfirm && (
          <>
            <div className="drawer-overlay" onClick={() => !isDeletingAccount && setShowDeleteAccountConfirm(false)} />
            <div className="login-prompt-modal">
              <h3>Delete your account?</h3>
              <p>Are you sure you want to delete your account? Your favourites will be deleted and this can&apos;t be undone.</p>
              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => !isDeletingAccount && setShowDeleteAccountConfirm(false)}
                  disabled={isDeletingAccount}
                >
                  No
                </button>
                <button
                  className="btn-primary btn-danger"
                  onClick={handleDeleteAccountConfirm}
                  disabled={isDeletingAccount}
                >
                  {isDeletingAccount ? "Deleting..." : "Yes"}
                </button>
              </div>
            </div>
          </>
        )}
        {/* Cookie Consent */}
        <CookieBanner />
        {/* Toast */}
        {showToast && <div className="toast">{toastMessage}</div>}
      </div>
    );
  }

  // Map view
  return (
    <div className="app-container map-view">
      {/* Floating Header */}
      <header className="map-header">
        <button onClick={handleBackToLanding} className="back-btn">
          <CaretLeft size={20} weight="bold" />
          <span>Back</span>
        </button>

        <div className="filter-bar-in-header">
          <div className={`filter-bar filter-bar-pill ${filterBarCollapsed ? "is-collapsed" : "is-open"}`}>
        <div className="filter-bar-pill-row">
          <button
            className="filter-bar-toggle"
            onClick={() => setFilterBarCollapsed(!filterBarCollapsed)}
            aria-label={filterBarCollapsed ? "Expand filters" : "Collapse filters"}
            aria-expanded={!filterBarCollapsed}
          >
            <span className="filter-bar-toggle-text">
              Search by facility {activeFilterCount > 0 && `(${activeFilterCount})`}
            </span>
            <CaretDown size={18} weight="bold" className="filter-bar-chevron" />
          </button>
          {activeFilterCount > 0 && (
            <button
              className="btn-text filter-clear-btn"
              onClick={(e) => {
                e.stopPropagation();
                setFilters({
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
              Clear
            </button>
          )}
        </div>
        <div className="filter-bar-dropdown">
          <div className="filter-bar-chips-inner">
            <div className="filter-chips">
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
                <ArrowsOut size={16} weight="bold" />
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
                className={`filter-chip ${filters.parking ? "is-on" : ""}`}
                onClick={() => setFilters({ ...filters, parking: !filters.parking })}
              >
                <Car size={16} weight="bold" />
                Parking
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
            </div>
          </div>
        </div>
        </div>
        </div>

        {user ? (
          <div className="avatar-dropdown-wrap" ref={avatarDropdownRef}>
            <button
              type="button"
              className="avatar-btn"
              onClick={() => setShowAvatarDropdown((v) => !v)}
              aria-label="Favourites menu"
              aria-expanded={showAvatarDropdown}
              aria-haspopup="true"
            >
              <PawPrint size={22} weight="fill" />
            </button>
            {showAvatarDropdown && (
              <div className="avatar-dropdown">
                <button
                  type="button"
                  className="avatar-dropdown-item"
                  onClick={() => {
                    setShowOnlyFavourites((v) => !v);
                    setShowAvatarDropdown(false);
                  }}
                >
                  {showOnlyFavourites ? "Show all places" : "View my favourites"}
                </button>
                <button
                  type="button"
                  className="avatar-dropdown-item"
                  onClick={async () => {
                    if (!user) return;
                    const ok = await removeAllFavourites(user.id);
                    if (ok) {
                      setFavouriteIds([]);
                      setShowOnlyFavourites(false);
                      showToastMessage("All favourites cleared");
                    }
                    setShowAvatarDropdown(false);
                  }}
                >
                  Clear my favourites
                </button>
                <button
                  type="button"
                  className="avatar-dropdown-item"
                  onClick={() => {
                    setShowDeleteAccountConfirm(true);
                    setShowAvatarDropdown(false);
                  }}
                >
                  Delete my account
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="header-actions">
            <button
              className="btn-text"
              onClick={() => (window.location.href = "/login")}
              style={{ margin: 0, color: "var(--color-primary)" }}
            >
              Log in
            </button>
          </div>
        )}
      </header>

      {/* Add Place Button */}
      <button
        className="add-place-fab"
        onClick={() => {
          if (!user) {
            setShowLoginPrompt(true);
          } else {
            setShowAddDrawer(true);
          }
        }}
        title="Add a place"
      >
        <Plus size={24} weight="bold" />
      </button>

      {/* Main Map */}
      <MainMap
        center={mapCenter || { lat: 51.5074, lng: -0.1278 }}
        zoom={mapZoom}
        parks={filteredParks}
        userLocation={userLocation}
        selectedPark={selectedPark}
        onParkClick={handleParkClick}
        onMapMove={(center, zoom) => {
          setMapCenter(center);
          setMapZoom(zoom);
        }}
        filters={filters}
        route={currentRoute}
        boundsToFit={boundsToFit}
        fitBoundsRequestId={fitBoundsRequestId}
      />

      {/* Loading Indicator */}
      {isLoadingParks && (
        <div className="loading-indicator">
          Finding parks nearby...
        </div>
      )}

      {/* Park Bottom Sheet */}
      {selectedPark && !directionsMode && (
        <ParkBottomSheet
          park={selectedPark}
          userLocation={userLocation}
          isFavourite={favouriteIds.includes(selectedPark.id)}
          canEdit={user?.id === selectedPark.user_id}
          onClose={handleCloseBottomSheet}
          onToggleFavourite={() => toggleFavorite(selectedPark.id)}
          onEdit={() => {
            setEditingPark(selectedPark);
            setShowEditDrawer(true);
          }}
          onGetDirections={handleGetDirections}
          onRequestLocation={handleRequestLocation}
        />
      )}

      {/* Add Place Drawer */}
      {showAddDrawer && (
        <AddPlaceDrawer
          onClose={() => setShowAddDrawer(false)}
          onSave={handleAddPlace}
          userLocation={userLocation}
        />
      )}

      {/* Edit Place Drawer */}
      {showEditDrawer && editingPark && (
        <EditPlaceDrawer
          park={editingPark}
          onClose={() => {
            setShowEditDrawer(false);
            setEditingPark(null);
          }}
          onSave={handleEditPlace}
          onDelete={() => setShowDeleteConfirm(true)}
          onAdjustPinLocation={() => {
            setShowEditDrawer(false);
            setShowAdjustPlaceMap(true);
          }}
        />
      )}

      {/* Adjust pin location – full-screen map with orange pin */}
      {showAdjustPlaceMap && editingPark && (
        <div className="adjust-pin-fullscreen">
          <div className="adjust-pin-header">
            <h2 className="adjust-pin-title">Adjust pin location</h2>
            <button
              type="button"
              onClick={() => {
                setShowAdjustPlaceMap(false);
                setShowEditDrawer(true);
              }}
              className="close-btn"
              aria-label="Cancel"
            >
              <X size={24} />
            </button>
          </div>
          <div className="adjust-pin-map-wrap">
            <MainMap
              center={{ lat: editingPark.lat, lng: editingPark.lng }}
              zoom={16}
              parks={[]}
              userLocation={null}
              onPinDrop={(loc) => {
                setEditingPark({ ...editingPark, lat: loc.lat, lng: loc.lng });
                setShowAdjustPlaceMap(false);
                setShowEditDrawer(true);
              }}
              isPinDropMode={true}
              initialPinDropLocation={{ lat: editingPark.lat, lng: editingPark.lng }}
              pinDropColor="#DD6616"
              filters={filters}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div className="drawer-overlay" onClick={() => setShowDeleteConfirm(false)} />
          <div className="delete-modal">
            <h3>Delete this space?</h3>
            <p>Are you sure you want to delete this space? This cannot be undone.</p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary btn-danger"
                onClick={handleDeletePlace}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <>
          <div className="drawer-overlay" onClick={() => setShowLoginPrompt(false)} />
          <div className="login-prompt-modal">
            <h3>Sign in to continue</h3>
            <p>You need to be signed in to add places or save favourites.</p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowLoginPrompt(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => (window.location.href = "/signup")}
              >
                Sign up free
              </button>
            </div>
            <button
              className="btn-text"
              onClick={() => (window.location.href = "/login")}
              style={{ marginTop: 12 }}
            >
              Already have an account? Log in
            </button>
          </div>
        </>
      )}

      {/* Delete account confirmation modal */}
      {showDeleteAccountConfirm && (
        <>
          <div className="drawer-overlay" onClick={() => !isDeletingAccount && setShowDeleteAccountConfirm(false)} />
          <div className="login-prompt-modal">
            <h3>Delete your account?</h3>
            <p>Are you sure you want to delete your account? Your favourites will be deleted and this can&apos;t be undone.</p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => !isDeletingAccount && setShowDeleteAccountConfirm(false)}
                disabled={isDeletingAccount}
              >
                No
              </button>
              <button
                className="btn-primary btn-danger"
                onClick={handleDeleteAccountConfirm}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? "Deleting..." : "Yes"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Transport Mode Modal */}
      {showTransportModal && (
        <TransportModeModal
          onSelect={handleSelectTransportMode}
          onClose={() => setShowTransportModal(false)}
        />
      )}

      {/* Directions Info Bar */}
      {directionsMode && currentRoute && (
        <div className="directions-bar">
          <div className="directions-info">
            {currentRoute.mode === "walking" && <PersonSimpleWalk size={24} weight="bold" />}
            {currentRoute.mode === "driving" && <Car size={24} weight="bold" />}
            {currentRoute.mode === "transit" && <Train size={24} weight="bold" />}
            <div className="directions-details">
              <span className="directions-distance">{formatDistance(currentRoute.distance)}</span>
              {currentRoute.mode === "transit" ? (
                <span className="directions-note">Sorry we can't show public transport guidance yet - please check your transit app for your options</span>
              ) : (
                <span className="directions-duration">{formatDuration(currentRoute.duration)}</span>
              )}
            </div>
          </div>
          <button
            className="btn-text directions-change-mode"
            onClick={() => setShowTransportModal(true)}
          >
            Change mode
          </button>
          <button
            className="directions-close"
            onClick={handleCloseDirections}
          >
            <X size={24} weight="bold" />
          </button>
        </div>
      )}

      {/* Loading Directions */}
      {isLoadingDirections && (
        <div className="loading-indicator">
          Getting directions...
        </div>
      )}

     
      {/* Cookie Consent */}
      <CookieBanner />
      {/* Toast */}
      {showToast && <div className="toast">{toastMessage}</div>}
    </div>
  );
}
