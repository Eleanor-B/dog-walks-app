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
  MapPinPlus,
  CursorText,
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
  House,
  SignOut,
  List,
  SlidersHorizontal,
  Path,
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
  onLeadOnly?: boolean;
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

/** Distance in meters from a point to the nearest point on a route polyline. Coordinates are [lng, lat][]. */
function distanceToRouteMeters(point: Location, coordinates: [number, number][]): number {
  if (coordinates.length === 0) return Infinity;
  if (coordinates.length === 1) {
    const [lng, lat] = coordinates[0];
    return distanceKm(point.lat, point.lng, lat, lng) * 1000;
  }
  let minM = Infinity;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lngA, latA] = coordinates[i];
    const [lngB, latB] = coordinates[i + 1];
    for (let k = 0; k <= 4; k++) {
      const t = k / 4;
      const lat = latA + t * (latB - latA);
      const lng = lngA + t * (lngB - lngA);
      const m = distanceKm(point.lat, point.lng, lat, lng) * 1000;
      if (m < minM) minM = m;
    }
  }
  return minM;
}

const REROUTE_THRESHOLD_M = 80;
const REROUTE_COOLDOWN_MS = 20000;

async function lookupLocation(query: string): Promise<Location | null> {
  const q = query.trim();
  if (!q) return null;

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Prefer Mapbox Geocoding for better UK place/postcode accuracy
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
            if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
          }
        }
      }
    } catch {
      /* fall through to Nominatim */
    }
  }

  // Fallback: Nominatim; use bounding box center when available for better area pins (e.g. Goose Green)
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
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

async function getLocationFromIP(): Promise<Location | null> {
  try {
    const res = await fetch("http://ip-api.com/json/?fields=lat,lon,status");
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "success") return null;
    return { lat: Number(data.lat), lng: Number(data.lon) };
  } catch {
    return null;
  }
}

// Module-level cache: one result per unique (lat, lng, radius) to avoid 429 from Overpass during dev/Fast Refresh
const overpassCache = new Map<string, Park[]>();

function overpassCacheKey(lat: number, lng: number, radiusKm: number): string {
  return `${Number(lat.toFixed(4))},${Number(lng.toFixed(4))},${radiusKm}`;
}

// Fetch parks from OSM Overpass – polygon centroids for walker accuracy
async function fetchParksFromOverpass(center: Location, radiusKm: number): Promise<Park[]> {
  const radiusM = Math.round(radiusKm * 1000);
  const { lat, lng } = center;
  const cacheKey = overpassCacheKey(lat, lng, radiusKm);
  const cached = overpassCache.get(cacheKey);
  if (cached !== undefined) {
    console.log("[fetchParksFromOverpass] Cache hit for", cacheKey);
    return cached;
  }
  const query = `[out:json][timeout:20];
(
  way["leisure"="park"](around:${radiusM},${lat},${lng});
  relation["leisure"="park"](around:${radiusM},${lat},${lng});
  way["leisure"="common"](around:${radiusM},${lat},${lng});
  relation["leisure"="common"](around:${radiusM},${lat},${lng});
  way["leisure"="recreation_ground"](around:${radiusM},${lat},${lng});
  way["landuse"="recreation_ground"](around:${radiusM},${lat},${lng});
  way["landuse"="grass"]["name"](around:${radiusM},${lat},${lng});
  way["natural"="grassland"]["name"](around:${radiusM},${lat},${lng});
);
out center tags;`;
  // DEBUG: Log exact Overpass query (no PostGIS/RPC in Supabase – this is the external location API)
  console.log("[fetchParksFromOverpass] Exact query:", { radiusM, lat, lng, querySnippet: `around:${radiusM},${lat},${lng}` });
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "GoWalkTheDog/1.0 (gowalkthedog.com)" },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) {
      console.log("[fetchParksFromOverpass] Response not OK:", res.status, "- caller will show Supabase places if available");
      return [];
    }
    const data = await res.json();
    const elements = data.elements ?? [];
    const validElements = elements.filter((el: any) => {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      return (
        typeof lat === "number" &&
        typeof lng === "number" &&
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat !== 0 &&
        lng !== 0 &&
        lat >= 49 &&
        lat <= 61 &&
        lng >= -8 &&
        lng <= 2
      );
    });
    const invalidCount = elements.length - validElements.length;
    if (invalidCount > 0) {
      console.warn(`[fetchParksFromOverpass] Filtered out ${invalidCount} elements with invalid coordinates`);
    }
    // DEBUG: Overpass raw response and result count
    console.log("[fetchParksFromOverpass] Full response elements count:", elements.length);
    const parks: Park[] = validElements
      .filter((el: any) => {
        if (!el.center || !el.tags?.name) return false;
        // Relations (multi-polygon parks) have no nodes array; ways need ≥4 nodes for a valid polygon
        if (el.type === "relation") return true;
        return (el.nodes?.length ?? 0) >= 4;
      })
      .map((el: any) => {
        const c = el.center;
        const plat = Number(c?.lat);
        const plng = Number(c?.lon ?? c?.lng);
        if (!Number.isFinite(plat) || !Number.isFinite(plng)) return null;
        const name = String(el.tags?.name ?? "Green space").trim();
        return {
          id: `osm-${el.id}`,
          name,
          lat: plat,
          lng: plng,
          isAutoDiscovered: true,
          nearbyAmenities: { cafes: 0, toilets: 0, parking: 0 },
        };
      })
      .filter((p: Park | null): p is Park => p != null)
      .filter((p: Park) => {
        const n = p.name.toLowerCase();
        return !n.includes("east dulwich") &&
          !n.includes("roundabout") &&
          !n.includes("churchyard") &&
          !n.includes("cricket") &&
          !n.includes("rugby") &&
          !n.includes("football club") &&
          !n.includes("tennis") &&
          !n.includes("croquet") &&
          !n.includes("school") &&
          !n.includes("bmx") &&
          !n.includes("playing field") &&
          !n.includes("sports ground") &&
          !n.includes("allotment");
      });
    console.log("[fetchParksFromOverpass] Parks after filtering:", parks.length);
    overpassCache.set(cacheKey, parks);
    return parks;
  } catch {
    return [];
  }
}

// Debounce state: 1s delay before firing Overpass so rapid re-renders (e.g. Fast Refresh) don't trigger 429
const OVERPASS_DEBOUNCE_MS = 1000;
let overpassDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let overpassDebounceResolvers: { resolve: (value: Park[]) => void; reject: (reason: unknown) => void }[] = [];
let overpassDebounceArgs: { center: Location; radiusKm: number; skipAmenities: boolean } | null = null;

// Fetch parks: OSM Overpass only – polygon centroids, accurate for walkers
// When skipAmenities is true, returns immediately with zeros for amenities (faster first paint)
// Debounced by 1s so rapid calls (e.g. Fast Refresh) don't hit Overpass repeatedly (429).
async function fetchNearbyParks(center: Location, radiusKm: number = 3, skipAmenities = false): Promise<Park[]> {
  // DEBUG: Log search params
  console.log("[fetchNearbyParks] Search params (debounced 1s):", {
    centerLat: center.lat,
    centerLng: center.lng,
    radiusKm,
  });

  return new Promise<Park[]>((resolve, reject) => {
    if (overpassDebounceTimer) clearTimeout(overpassDebounceTimer);
    overpassDebounceArgs = { center, radiusKm, skipAmenities };
    overpassDebounceResolvers.push({ resolve, reject });

    overpassDebounceTimer = setTimeout(async () => {
      overpassDebounceTimer = null;
      const args = overpassDebounceArgs!;
      overpassDebounceArgs = null;
      const resolvers = overpassDebounceResolvers;
      overpassDebounceResolvers = [];
      try {
        const result = await fetchParksFromOverpass(args.center, args.radiusKm);
        resolvers.forEach((r) => r.resolve(result));
      } catch (e) {
        resolvers.forEach((r) => r.reject(e));
      }
    }, OVERPASS_DEBOUNCE_MS);
  });
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
  const [showNoResultsToast, setShowNoResultsToast] = useState(false);
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
    onLeadOnly: false,
  });

  // Carousel ref
  const carouselRef = useRef<HTMLDivElement>(null);
  const avatarDropdownRef = useRef<HTMLDivElement>(null);
  const burgerMenuRef = useRef<HTMLDivElement>(null);
  const loadingLocationStartedRef = useRef<number>(0);
  const LOCATION_SPINNER_MIN_MS = 800;
  const parksLoadingStartedRef = useRef<number>(0);
  const PARKS_SPINNER_MIN_MS = 3000;
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
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);
  const [fabPulsing, setFabPulsing] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showAdjustPlaceMap, setShowAdjustPlaceMap] = useState(false);
  const [editDrawerMode, setEditDrawerMode] = useState<"full" | "confirmPin">("full");
  const [showAddPlacePinMap, setShowAddPlacePinMap] = useState(false);
  const [addPlacePinMapPin, setAddPlacePinMapPin] = useState<{ lat: number; lng: number } | null>(null);
  const [addPlacePinResult, setAddPlacePinResult] = useState<{ lat: number; lng: number } | null>(null);
  const [addPlaceInitialName, setAddPlaceInitialName] = useState("");
  const [addPlaceInitialLocation, setAddPlaceInitialLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Toast
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Map state
  const [mapCenter, setMapCenter] = useState<Location | null>(null);
  const [mapZoom, setMapZoom] = useState(11);
  const [filterBarCollapsed, setFilterBarCollapsed] = useState(true);
  const filterInactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRerouteTimeRef = useRef<number>(0);
  const currentRouteRef = useRef<RouteInfo | null>(null);
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
  const [showBurgerMenu, setShowBurgerMenu] = useState(false);
  const [showOnlyFavourites, setShowOnlyFavourites] = useState(false);
  const [showOnlyMyPlaces, setShowOnlyMyPlaces] = useState(false);
  const [showFavouritesBigPulse, setShowFavouritesBigPulse] = useState(false);

  // Directions state
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [directionsMode, setDirectionsMode] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<RouteInfo | null>(null);
  const [isLoadingDirections, setIsLoadingDirections] = useState(false);
  const [directionsPark, setDirectionsPark] = useState<Park | null>(null);
  const [showDirectionsLoginPrompt, setShowDirectionsLoginPrompt] = useState(false);
  const [pendingDirectionsMode, setPendingDirectionsMode] = useState<TransportMode | null>(null);

  // ===== EFFECTS =====

  // On first login: clear map locations; places load only when user presses "Suggest green spaces"
  const prevUserRef = useRef<{ id: string } | null | undefined>(undefined);
  useEffect(() => {
    const didJustLogIn = prevUserRef.current == null && user != null;
    prevUserRef.current = user ?? null;
    if (didJustLogIn) {
      setParks([]);
      setUserAddedPlaces([]);
    }
  }, [user]);

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

  // Auto-resume directions after login/signup (from sessionStorage)
  useEffect(() => {
    if (!user) return;
    try {
      const stored = sessionStorage.getItem("pendingDirections");
      if (!stored) return;
      sessionStorage.removeItem("pendingDirections");
      const { park, mode } = JSON.parse(stored) as { park: Park; mode: TransportMode };
      if (!park || !mode) return;

      setViewState("map");
      setDirectionsPark(park);
      setMapCenter({ lat: park.lat, lng: park.lng });
      setMapZoom(15);
      setSelectedPark(null);
      setParks((prev) => (prev.some((p) => p.id === park.id) ? prev : [...prev, park]));

      async function resumeDirections() {
        let loc = userLocation;
        if (!loc) {
          loc = await getLocationFromIP();
          if (loc) setUserLocation(loc);
        }
        if (!loc) {
          setSelectedPark(park);
          return;
        }
        setIsLoadingDirections(true);
        const route = await fetchDirections(loc, { lat: park.lat, lng: park.lng }, mode);
        if (route) {
          setCurrentRoute(route);
          setDirectionsMode(true);
        } else {
          setSelectedPark(park);
          showToastMessage("Couldn't get directions. Please try again.");
        }
        setIsLoadingDirections(false);
      }
      resumeDirections();
    } catch (_) {}
  }, [user]);

  // On first load, use IP geolocation to show nearby parks before user searches.
  // Skip when user has just clicked "Use my location" so we don't overwrite with IP (e.g. Manchester) before GPS returns.
  useEffect(() => {
    if (viewState !== "map" || userLocation || isLoadingLocation) return;
    async function loadDefaultParks() {
      const ipLocation = await getLocationFromIP();
      if (!ipLocation) return;
      console.log("[Map debug] IP geolocation: using IP location", { lat: ipLocation.lat, lng: ipLocation.lng });
      setMapCenter(ipLocation);
      setMapZoom(13);
      const nearbyParks = await fetchParksFromOverpass(ipLocation, 3);
      setParks(nearbyParks);
    }
    loadDefaultParks();
  }, [viewState, userLocation, isLoadingLocation]);

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

  // Close burger menu when clicking outside
  useEffect(() => {
    if (!showBurgerMenu) return;
    function handleClick(e: MouseEvent) {
      if (burgerMenuRef.current && !burgerMenuRef.current.contains(e.target as Node)) {
        setShowBurgerMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showBurgerMenu]);

  // Re-route when user goes off-route during directions
  useEffect(() => {
    if (!directionsMode || !directionsPark || !currentRoute || !navigator.geolocation) return;

    currentRouteRef.current = currentRoute;
    const destination = { lat: directionsPark.lat, lng: directionsPark.lng };
    const mode = currentRoute.mode;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const route = currentRouteRef.current;
        if (!route || route.coordinates.length === 0) return;

        const distM = distanceToRouteMeters(loc, route.coordinates);
        const now = Date.now();
        if (distM <= REROUTE_THRESHOLD_M) return;
        if (now - lastRerouteTimeRef.current < REROUTE_COOLDOWN_MS) return;

        lastRerouteTimeRef.current = now;
        setIsLoadingDirections(true);
        showToastMessage("Re-routing…");

        const newRoute = await fetchDirections(loc, destination, mode);
        if (newRoute) {
          setCurrentRoute(newRoute);
          setUserLocation(loc);
          currentRouteRef.current = newRoute;
        }
        setIsLoadingDirections(false);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      currentRouteRef.current = null;
    };
  }, [directionsMode, directionsPark, currentRoute]);

  // Close filter dropdown after 8s inactivity; reset timer on any interaction inside the bar
  const startOrResetFilterInactivityTimer = useCallback(() => {
    if (filterInactivityTimeoutRef.current) clearTimeout(filterInactivityTimeoutRef.current);
    filterInactivityTimeoutRef.current = setTimeout(() => setFilterBarCollapsed(true), 8000);
  }, []);
  useEffect(() => {
    if (filterBarCollapsed) {
      if (filterInactivityTimeoutRef.current) {
        clearTimeout(filterInactivityTimeoutRef.current);
        filterInactivityTimeoutRef.current = null;
      }
      return;
    }
    startOrResetFilterInactivityTimer();
    return () => {
      if (filterInactivityTimeoutRef.current) {
        clearTimeout(filterInactivityTimeoutRef.current);
        filterInactivityTimeoutRef.current = null;
      }
    };
  }, [filterBarCollapsed, startOrResetFilterInactivityTimer]);

  // Parks are only fetched when user clicks "Suggest green spaces" (no auto-fetch)

  // ===== HANDLERS =====

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleLocationSearch = async () => {
    if (!locationInput.trim()) return;

    loadingLocationStartedRef.current = Date.now();
    setIsLoadingLocation(true);
    setLocationError(null);
    setViewState("map");
    setMapCenter((c) => c || { lat: 51.5074, lng: -0.1278 });

    const location = await lookupLocation(locationInput);

    const elapsed = Date.now() - loadingLocationStartedRef.current;
    const delay = Math.max(0, LOCATION_SPINNER_MIN_MS - elapsed);
    const hideSpinner = () => {
      setTimeout(() => setIsLoadingLocation(false), delay);
    };

    if (location) {
      setUserLocation(location);
      setMapCenter(location);
      setMapZoom(14);
      handleSuggestGreenSpaces(location);
    } else {
      setLocationError("Sorry, we couldn't find that location. Please try again or drop a pin on the map.");
    }
    hideSpinner();
  };

  const handleSuggestGreenSpaces = async (centerOverride?: Location) => {
    const center = centerOverride ?? userLocation;
    if (!center) return;
    parksLoadingStartedRef.current = Date.now();
    setIsLoadingParks(true);
    try {
      // DEBUG: User location and search params (Supabase query does not use location; logged for reference)
      const radiusKm = 3;
      console.log("[handleSuggestGreenSpaces] User lat/lng (for reference; Supabase query does not filter by location):", {
        lat: center.lat,
        lng: center.lng,
        latType: typeof center.lat,
        lngType: typeof center.lng,
      });
      console.log("[handleSuggestGreenSpaces] Search radius / bounding box:", {
        Supabase: "none – fetches all places, no radius or bbox",
        Overpass: `${radiusKm}km`,
      });
      if (radiusKm < 5) {
        console.log("[handleSuggestGreenSpaces] NOTE: Overpass radius is under 5km – could increase to 5km for testing if no results.");
      }

      // Fetch parks without amenities first for fast display, then enrich in background
      const [nearby, dbPlaces] = await Promise.all([
        fetchNearbyParks(center, radiusKm, true), // skipAmenities = true for faster first paint
        getPlaces(),
      ]);

      // DEBUG: Results immediately after Supabase + Overpass resolve
      console.log("[handleSuggestGreenSpaces] Supabase: full response (data) – count:", dbPlaces?.length ?? 0);
      if (dbPlaces && dbPlaces.length > 0) {
        console.log("[handleSuggestGreenSpaces] Supabase: first 3 places (id, name, lat, lng):", dbPlaces.slice(0, 3).map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng })));
      }
      console.log("[handleSuggestGreenSpaces] Overpass nearby – count:", nearby?.length ?? 0);
      const minDistanceKm = 0.04;
      const filtered = nearby.filter(
        (p) => distanceKm(center.lat, center.lng, p.lat, p.lng) > minDistanceKm
      );
      const MAX_RADIUS_KM = 5;
      const validParks = filtered.filter(
        (park) => distanceKm(center.lat, center.lng, park.lat, park.lng) <= MAX_RADIUS_KM
      );
      // If Overpass returned non-OK (e.g. 429), nearby is [] but we still show Supabase places (mappedPlaces) so the map is not empty
      const validDbPlaces = dbPlaces.filter((p) => {
        const lat = p.lat;
        const lng = p.lng;
        return (
          typeof lat === "number" &&
          typeof lng === "number" &&
          !Number.isNaN(lat) &&
          !Number.isNaN(lng) &&
          lat !== 0 &&
          lng !== 0 &&
          lat >= 49 &&
          lat <= 61 &&
          lng >= -8 &&
          lng <= 2
        );
      });
      const mappedPlaces: Park[] = validDbPlaces.map((p) => ({
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
        onLeadOnly: p.on_lead_only ?? false,
        user_id: p.user_id,
      }));
      setParks(validParks);
      setUserAddedPlaces(mappedPlaces);
      const elapsed = Date.now() - parksLoadingStartedRef.current;
      const delay = Math.max(0, PARKS_SPINNER_MIN_MS - elapsed);
      const hadNoResults = validParks.length === 0 && mappedPlaces.length === 0;
      setTimeout(() => {
        setIsLoadingParks(false);
        if (hadNoResults) setShowNoResultsToast(true);
      }, delay);

      if (validParks.length > 0 || mappedPlaces.length > 0) {
        setShowNoResultsToast(false);
        // So suggested results are visible: turn off "my places only" and "favourites only"
        setShowOnlyMyPlaces(false);
        setShowOnlyFavourites(false);
      }
      // No extra toast here: the persistent no-results-toast on the map already shows when filteredParks.length === 0

      // Enrich Overpass parks with amenities in background (cafes, parking nearby)
      if (validParks.length > 0) {
        Promise.all(
          validParks.map(async (p) => {
            const amenities = await fetchNearbyAmenities(p);
            return { ...p, nearbyAmenities: amenities };
          })
        )
          .then((withAmenities) => {
            setParks((prev) => {
              const byId = new Map(prev.map((p) => [p.id, p]));
              withAmenities.forEach((p) => byId.set(p.id, p));
              return [...byId.values()];
            });
          })
          .catch((err) => console.error("Background amenities fetch failed:", err));
      }
    } catch (e) {
      console.error("Suggest green spaces failed:", e);
      showToastMessage("Something went wrong. Please try again.");
      const elapsed = Date.now() - parksLoadingStartedRef.current;
      const delay = Math.max(0, PARKS_SPINNER_MIN_MS - elapsed);
      setTimeout(() => setIsLoadingParks(false), delay);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Your browser doesn't support location services.");
      return;
    }

    loadingLocationStartedRef.current = Date.now();
    setIsLoadingLocation(true);
    setLocationError(null);
    setViewState("map");
    setMapCenter((c) => c || { lat: 51.5074, lng: -0.1278 });
    console.log("[Map debug] Use my location: requesting GPS…");

    const hideSpinnerAfterMinTime = () => {
      const elapsed = Date.now() - loadingLocationStartedRef.current;
      const delay = Math.max(0, LOCATION_SPINNER_MIN_MS - elapsed);
      setTimeout(() => setIsLoadingLocation(false), delay);
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        console.log("[Map debug] Use my location: got position", { lat: loc.lat, lng: loc.lng });
        setUserLocation(loc);
        setMapCenter(loc);
        setMapZoom(14);
        hideSpinnerAfterMinTime();
        handleSuggestGreenSpaces(loc);
      },
      (err) => {
        hideSpinnerAfterMinTime();
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
    setMapZoom(14);
    setShowPinDropMap(false);
    setViewState("map");
    handleSuggestGreenSpaces(location);
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
      on_lead_only: placeData.onLeadOnly ?? false,
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
        onLeadOnly: placeData.onLeadOnly ?? false,
        user_id: user.id,
      };
      setUserAddedPlaces([...userAddedPlaces, newPark]);
      showToastMessage("Place added!");
      setShowAddDrawer(false);
    } else {
      showToastMessage("Failed to save place");
    }
  };

  const handleEditPlace = async (placeData: any): Promise<boolean> => {
    if (!editingPark?.id) return false;

    const hasFacility = placeData.fenced || placeData.unfenced || placeData.partFenced ||
                        placeData.bins || placeData.toilets || placeData.coffee || placeData.parking;
    if (!hasFacility) {
      showToastMessage("Please add at least one facility to this place");
      return false;
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
      on_lead_only: placeData.onLeadOnly ?? false,
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
      return true;
    } else {
      showToastMessage("Failed to update place");
      return false;
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

    if (!user) {
      setShowDirectionsLoginPrompt(true);
      setPendingDirectionsMode(mode);
      return;
    }

    setShowTransportModal(false);
    setIsLoadingDirections(true);

    const route = await fetchDirections(userLocation, { lat: directionsPark.lat, lng: directionsPark.lng }, mode);

    if (route) {
      setCurrentRoute(route);
      setDirectionsMode(true);
      setSelectedPark(null);
    } else {
      showToastMessage("Couldn't get directions. Please try again.");
    }

    setIsLoadingDirections(false);
  };

  const handleDirectionsLogin = () => {
    if (!directionsPark || !pendingDirectionsMode) return;
    try {
      sessionStorage.setItem(
        "pendingDirections",
        JSON.stringify({ park: directionsPark, mode: pendingDirectionsMode })
      );
    } catch (_) {}
    window.location.href = "/login?redirect=" + encodeURIComponent("/");
  };

  const handleDirectionsSignup = () => {
    if (!directionsPark || !pendingDirectionsMode) return;
    try {
      sessionStorage.setItem(
        "pendingDirections",
        JSON.stringify({ park: directionsPark, mode: pendingDirectionsMode })
      );
    } catch (_) {}
    window.location.href = "/signup?redirect=" + encodeURIComponent("/");
  };

  const handleCloseTransportModal = () => {
    setShowTransportModal(false);
    setShowDirectionsLoginPrompt(false);
    setPendingDirectionsMode(null);
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

  // Combine auto-discovered and user-added places. Only show user-added places after a search (userLocation set).
  const allParks = userLocation
    ? (showOnlyMyPlaces && user
        ? userAddedPlaces.filter((p) => p.user_id === user.id)
        : [...parks, ...userAddedPlaces])
    : [];

  // Filter parks based on selected filters
  let filteredParks = allParks.filter((park) => {
    // Auto-discovered parks without user data pass through unless specific dog filters are on
    if (park.isAutoDiscovered && !park.fenced && !park.unfenced && !park.partFenced && 
        !park.bins && !park.toilets && !park.coffee && !park.parking && !park.onLeadOnly) {
      // Only filter out if user is specifically filtering for dog-specific features
      if (filters.fenced || filters.unfenced || filters.partFenced || filters.bins || filters.onLeadOnly) {
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
    if (filters.onLeadOnly && !park.onLeadOnly) return false;
    return true;
  });

  // When "View my favourites" is on, show only favourited parks
  if (showOnlyFavourites && user) {
    filteredParks = filteredParks.filter((p) => favouriteIds.includes(p.id));
  }

  // Bounds for fitBounds: stable request id and bounds (no loop)
  const fitBoundsRequestId = useMemo((): number => {
    if (!userLocation) return 0;
    const nearbyParks = filteredParks.filter(
      (p) => distanceKm(userLocation.lat, userLocation.lng, p.lat, p.lng) <= 3
    );
    if (nearbyParks.length === 0) return 0;
    return Date.now(); // changes only when parks actually load
  }, [userLocation?.lat, userLocation?.lng, filteredParks.length]);

  const boundsToFit = useMemo((): [Location, Location] | undefined => {
    if (!userLocation) return undefined;
    const nearbyParks = filteredParks.filter(
      (p) => distanceKm(userLocation.lat, userLocation.lng, p.lat, p.lng) <= 3
    );
    if (nearbyParks.length === 0) return undefined;
    const points = [userLocation, ...nearbyParks.map((p) => ({ lat: p.lat, lng: p.lng }))];
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    return [
      { lat: Math.min(...lats), lng: Math.min(...lngs) },
      { lat: Math.max(...lats), lng: Math.max(...lngs) },
    ];
  }, [userLocation?.lat, userLocation?.lng, filteredParks.length]);

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
                        onClick={async () => {
                          await supabase.auth.signOut();
                          setShowAvatarDropdown(false);
                          window.location.href = "/";
                        }}
                      >
                        <SignOut size={18} weight="regular" />
                        Log out
                      </button>
                      <button
                        type="button"
                        className="avatar-dropdown-item avatar-dropdown-item-delete"
                        onClick={() => {
                          setShowDeleteAccountConfirm(true);
                          setShowAvatarDropdown(false);
                        }}
                      >
                        <TrashSimple size={18} weight="regular" />
                        Delete my account
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="header-burger-wrap" ref={burgerMenuRef}>
                    <button
                      type="button"
                      className="avatar-btn header-burger-btn"
                      onClick={() => setShowBurgerMenu((v) => !v)}
                      aria-label="Menu"
                      aria-expanded={showBurgerMenu}
                      aria-haspopup="true"
                    >
                      <List size={22} weight="bold" />
                    </button>
                    {showBurgerMenu && (
                      <div className="avatar-dropdown header-burger-dropdown">
                        <button
                          type="button"
                          className="avatar-dropdown-item"
                          onClick={() => {
                            setShowBurgerMenu(false);
                            window.location.href = "/signup";
                          }}
                        >
                          Sign up
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    className="btn-header-primary header-signup-btn"
                    onClick={() => (window.location.href = "/signup")}
                  >
                    Sign up
                  </button>
                  <button
                    className="btn-secondary"
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
          <div className="landing-top-with-fab">
          {/* Hero Section - Figma 435:2604 (mobile) & 435:2816 (desktop) */}
          <div className="hero-section">
            <div className="hero-ellipse" aria-hidden="true" />
            <div className="hero-sun-ellipse" aria-hidden="true" />
            <div className="hero-image">
            <img
  src="/dog_animation.apng"
  className="dog-illustration hero-dog-video"
  alt="Happy dog"
  width={202}
  height={202}
/>
            </div>
            <div className="hero-content">
              <h1 className="hero-title">
                <span className="hero-title-accent">Find great places</span> to walk your dog
              </h1>
              <p className="hero-subtitle">
                Discover parks, green spaces and the facilities you need
              </p>
            </div>
          </div>

          {/* Search Card - postcode, or, two buttons, primary, Add a place link */}
          <div className="search-card">
            <div className="location-inputs">
              {/* Postcode input - full width */}
              <div className="search-input-with-icon landing-search-input-full">
                <div className="search-input-icon-container" aria-hidden>
                  <CursorText size={20} weight="bold" />
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

              {/* or divider */}
              <div className="location-or-standalone" aria-hidden="true">
                <span className="location-or-line" />
                <span className="location-or">or</span>
                <span className="location-or-line" />
              </div>

              {/* Two buttons: Use my location | Filters (N) - 50% each */}
              <div className="landing-two-buttons-row">
                <button
                  className="btn-secondary location-use-current landing-half-btn"
                  onClick={handleUseMyLocation}
                  disabled={isLoadingLocation}
                >
                  <Crosshair size={18} weight="bold" />
                  {isLoadingLocation ? "Finding..." : "Use my location"}
                </button>
                <button
                  type="button"
                  className="btn-secondary landing-filters-btn landing-half-btn"
                  onClick={() => setShowFiltersDrawer(true)}
                  aria-label={activeFilterCount > 0 ? `Filters (${activeFilterCount} active)` : "Filters"}
                >
                  <SlidersHorizontal size={18} weight="bold" />
                  {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters"}
                </button>
              </div>

              {/* Find green spaces nearby - full width primary; Add a place - small link (desktop: same row) */}
              <div className="landing-primary-row">
                <button
                  className="find-green-fab landing-find-btn"
                  onClick={handleLocationSearch}
                  disabled={isLoadingLocation || !locationInput.trim()}
                  title="Find green spaces nearby"
                  aria-label="Find green spaces nearby"
                >
                  <MagnifyingGlass size={18} weight="bold" />
                  <span className="fab-label">
                    {isLoadingLocation ? "Finding..." : "Find green spaces nearby"}
                  </span>
                </button>
                <button
                  type="button"
                  className="add-place-link"
                  onClick={() => {
                    setFabPulsing(true);
                    setTimeout(() => {
                      if (!user) {
                        setShowLoginPrompt(true);
                      } else {
                        setViewState("map");
                        setShowAddDrawer(true);
                      }
                      setFabPulsing(false);
                    }, 400);
                  }}
                  title="Add a place"
                  aria-label="Add a place"
                >
                  <Plus size={16} weight="bold" />
                  Add a place
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

          {/* Filters drawer - slides up from bottom */}
          {showFiltersDrawer && (
            <>
              <div className="drawer-overlay" onClick={() => setShowFiltersDrawer(false)} aria-hidden="true" />
              <div className="drawer filters-drawer" role="dialog" aria-labelledby="filters-drawer-title" aria-modal="true">
                <div className="filters-drawer-header">
                  <h2 id="filters-drawer-title" className="filter-label">Select facilities</h2>
                  <button
                    type="button"
                    className="filters-drawer-close"
                    onClick={() => setShowFiltersDrawer(false)}
                    aria-label="Close"
                  >
                    <X size={24} weight="bold" />
                  </button>
                </div>
                <div className="filters-drawer-content">
                  <div className="filters-drawer-chips">
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
                    <button
                      className={`filter-chip ${filters.onLeadOnly ? "is-on" : ""}`}
                      onClick={() => setFilters({ ...filters, onLeadOnly: !filters.onLeadOnly })}
                    >
                      <Path size={16} weight="bold" />
                      On lead only
                    </button>
                  </div>
                  {user && (
                    <label className="my-favourites-toggle filters-drawer-favourites">
                      <span
                        className={`my-favourites-toggle-icon ${showFavouritesBigPulse ? "my-favourites-toggle-icon-big-pulse" : ""}`}
                        onAnimationEnd={() => setShowFavouritesBigPulse(false)}
                      >
                        <Heart size={18} weight="fill" />
                      </span>
                      <span className="my-favourites-toggle-label">My favourites</span>
                      <input
                        type="checkbox"
                        checked={showOnlyMyPlaces}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setShowOnlyMyPlaces(checked);
                          if (checked) setShowFavouritesBigPulse(true);
                        }}
                        className="my-favourites-toggle-input"
                        aria-label="Show only my added places"
                      />
                      <span className="my-favourites-toggle-slider" />
                    </label>
                  )}
                  <button
                    type="button"
                    className="btn-primary filters-drawer-done"
                    onClick={() => setShowFiltersDrawer(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            </>
          )}
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
        {showToast && !isLoadingLocation && !isLoadingParks && <div className="toast">{toastMessage}</div>}
      </div>
    );
  }

  // Map view
  return (
    <div className="app-container map-view">
      {/* Floating Header: Back (left of search bar), Search by facility, Paw menu (right) */}
      <header className="map-header">
        <button onClick={handleBackToLanding} className="back-btn map-header-back" aria-label="Back to home">
          <CaretLeft size={20} weight="bold" />
          <span>Back</span>
        </button>
        <div className="filter-bar-in-header">
          <div className="flex flex-col gap-3 p-4 bg-green-50 rounded-xl">
            {/* Row 1: Select facilities (n) ▾ left | Clear right */}
            <div className="flex justify-between items-center">
              <button
                type="button"
                className="filter-bar-toggle"
                onClick={() => setFilterBarCollapsed(!filterBarCollapsed)}
                aria-label={filterBarCollapsed ? "Expand filters" : "Collapse filters"}
                aria-expanded={!filterBarCollapsed}
              >
                <span className="filter-bar-toggle-text whitespace-nowrap">
                  Select facilities {activeFilterCount > 0 && `(${activeFilterCount})`}
                </span>
                <CaretDown size={18} weight="bold" className="filter-bar-chevron" />
              </button>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  className="btn-text filter-clear-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    startOrResetFilterInactivityTimer();
                    setFilters({
                      fenced: false,
                      unfenced: false,
                      partFenced: false,
                      bins: false,
                      toilets: false,
                      coffee: false,
                      parking: false,
                      onLeadOnly: false,
                    });
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Row 2: Find walks nearby left | Favourites toggle right */}
            {(userLocation || user) && (
              <div className="flex justify-between items-center">
                <div>
                  {userLocation && (
                    <button
                      type="button"
                      className="btn-primary suggest-green-btn-inline"
                      onClick={() => {
                        startOrResetFilterInactivityTimer();
                        handleSuggestGreenSpaces();
                      }}
                      disabled={isLoadingParks}
                    >
                      {isLoadingParks ? "Finding..." : "Find walks nearby"}
                    </button>
                  )}
                </div>
                <div>
                  {user && (
                  <label
                    className="my-favourites-toggle filter-bar-favourites-toggle"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span
                      className={`my-favourites-toggle-icon ${showFavouritesBigPulse ? "my-favourites-toggle-icon-big-pulse" : ""}`}
                      onAnimationEnd={() => setShowFavouritesBigPulse(false)}
                    >
                      <Heart size={18} weight="fill" />
                    </span>
                    <span className="my-favourites-toggle-label hidden sm:inline">Favourites</span>
                    <input
                      type="checkbox"
                      checked={showOnlyFavourites}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setShowOnlyFavourites(checked);
                        if (checked) setShowFavouritesBigPulse(true);
                      }}
                      className="my-favourites-toggle-input"
                      aria-label={showOnlyFavourites ? "Show all places" : "Show only favourites"}
                    />
                    <span className="my-favourites-toggle-slider" />
                  </label>
                  )}
                </div>
              </div>
            )}

            {/* Row 3+: facility filter pills — wrapping left-to-right */}
            {!filterBarCollapsed && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`filter-chip ${filters.fenced ? "is-on" : ""}`}
                  onClick={() => {
                    startOrResetFilterInactivityTimer();
                    setFilters({ ...filters, fenced: !filters.fenced });
                  }}
                >
                  <Barricade size={16} weight="bold" />
                  Fenced
                </button>
                <button
                  type="button"
                  className={`filter-chip ${filters.unfenced ? "is-on" : ""}`}
                  onClick={() => {
                    startOrResetFilterInactivityTimer();
                    setFilters({ ...filters, unfenced: !filters.unfenced });
                  }}
                >
                  <ArrowsOut size={16} weight="bold" />
                  Unfenced
                </button>
                <button
                  type="button"
                  className={`filter-chip ${filters.partFenced ? "is-on" : ""}`}
                  onClick={() => {
                    startOrResetFilterInactivityTimer();
                    setFilters({ ...filters, partFenced: !filters.partFenced });
                  }}
                >
                  <CircleHalf size={16} weight="bold" />
                  Part-fenced
                </button>
                <button
                  type="button"
                  className={`filter-chip ${filters.bins ? "is-on" : ""}`}
                  onClick={() => {
                    startOrResetFilterInactivityTimer();
                    setFilters({ ...filters, bins: !filters.bins });
                  }}
                >
                  <TrashSimple size={16} weight="bold" />
                  Dog bins
                </button>
                <button
                  type="button"
                  className={`filter-chip ${filters.parking ? "is-on" : ""}`}
                  onClick={() => {
                    startOrResetFilterInactivityTimer();
                    setFilters({ ...filters, parking: !filters.parking });
                  }}
                >
                  <Car size={16} weight="bold" />
                  Parking
                </button>
                <button
                  type="button"
                  className={`filter-chip ${filters.toilets ? "is-on" : ""}`}
                  onClick={() => {
                    startOrResetFilterInactivityTimer();
                    setFilters({ ...filters, toilets: !filters.toilets });
                  }}
                >
                  <Toilet size={16} weight="bold" />
                  Toilets
                </button>
                <button
                  type="button"
                  className={`filter-chip ${filters.coffee ? "is-on" : ""}`}
                  onClick={() => {
                    startOrResetFilterInactivityTimer();
                    setFilters({ ...filters, coffee: !filters.coffee });
                  }}
                >
                  <Coffee size={16} weight="bold" />
                  Coffee
                </button>
                <button
                  type="button"
                  className={`filter-chip ${filters.onLeadOnly ? "is-on" : ""}`}
                  onClick={() => {
                    startOrResetFilterInactivityTimer();
                    setFilters({ ...filters, onLeadOnly: !filters.onLeadOnly });
                  }}
                >
                  <Path size={16} weight="bold" />
                  On lead only
                </button>
              </div>
            )}
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
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setShowAvatarDropdown(false);
                    window.location.href = "/";
                  }}
                >
                  <SignOut size={18} weight="regular" />
                  Log out
                </button>
                <button
                  type="button"
                  className="avatar-dropdown-item avatar-dropdown-item-delete"
                  onClick={() => {
                    setShowDeleteAccountConfirm(true);
                    setShowAvatarDropdown(false);
                  }}
                >
                  <TrashSimple size={18} weight="regular" />
                  Delete my account
                </button>
              </div>
            )}
          </div>
        ) : null}
      </header>

      {/* Bottom bar: Log in (when not signed in) left – hidden when directions active */}
      {!directionsMode && (
        <div className="map-view-bottom-bar">
          <div className="map-view-bottom-left">
            {!user && (
              <button
                className="btn-secondary"
                onClick={() => (window.location.href = "/login")}
              >
                Log in
              </button>
            )}
          </div>
        </div>
      )}
      {/* Add a place – fixed bottom-right, hidden when drawer, bottom sheet, or directions */}
      {!directionsMode && !showAddDrawer && !selectedPark && !showEditDrawer && (
        <div className="add-place-fab-float">
          <button
            className={`add-place-fab ${fabPulsing ? "is-pulsing" : ""}`}
            onClick={() => {
              setFabPulsing(true);
              setTimeout(() => {
                if (!user) {
                  setShowLoginPrompt(true);
                } else {
                  setShowAddDrawer(true);
                }
                setFabPulsing(false);
              }, 400);
            }}
            title="Add a place"
            aria-label="Add a place"
          >
            <MapPinPlus size={18} weight="bold" />
            <span className="add-place-fab-label">Add a place</span>
          </button>
        </div>
      )}

      {/* Main Map */}
      <div className="map-view-map-wrap">
        {isLoadingLocation && (
          <div className="location-loading-overlay" aria-hidden="false" aria-busy="true" role="status">
            <div className="location-loading-card">
              <div
                className="w-8 h-8 rounded-full border-4 border-green-700 border-t-transparent animate-spin"
                aria-hidden
              />
              <p className="location-loading-label">Finding your location…</p>
            </div>
          </div>
        )}
        {(() => {
          console.log("[Map view] boundsToFit:", boundsToFit, "fitBoundsRequestId:", fitBoundsRequestId);
          return null;
        })()}
        <MainMap
          center={mapCenter || { lat: 51.5074, lng: -0.1278 }}
          zoom={mapZoom}
          parks={filteredParks}
          userLocation={userLocation}
          selectedPark={selectedPark}
          onParkClick={handleParkClick}
          filters={filters}
          route={currentRoute}
          boundsToFit={boundsToFit}
          fitBoundsRequestId={fitBoundsRequestId}
          onMapClick={() => {}}
          onResultsOutsideViewport={() => {}}
        />
        {userLocation && filteredParks.length === 0 && !isLoadingParks && showNoResultsToast && (
          <div
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[99999] max-w-xs w-full px-5 py-4 bg-white rounded-xl shadow-md border border-gray-100 text-center"
            role="status"
            aria-live="polite"
          >
            <p className="text-green-900 text-sm font-medium">
              Sorry, we couldn&apos;t find dog walks nearby. Try zooming out or adjusting your filters.
            </p>
          </div>
        )}
        {isLoadingParks && !isLoadingLocation && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md px-6 py-5 flex flex-col items-center gap-3">
              <div
                className="w-8 h-8 rounded-full border-4 border-green-700 border-t-transparent animate-spin"
                aria-hidden
              />
              <p className="text-sm text-green-900">Finding walks near you...</p>
            </div>
          </div>
        )}
      </div>

      {/* Park Bottom Sheet – slides down when adjusting pin, slides back up after Save */}
      {selectedPark && !directionsMode && (
        <ParkBottomSheet
          park={selectedPark}
          userLocation={userLocation}
          isFavourite={favouriteIds.includes(selectedPark.id)}
          canEdit={!!user}
          onClose={handleCloseBottomSheet}
          onToggleFavourite={() => toggleFavorite(selectedPark.id)}
          onEdit={() => {
            setEditingPark(selectedPark);
            setEditDrawerMode("full");
            setShowEditDrawer(true);
          }}
          onGetDirections={handleGetDirections}
          onRequestLocation={handleRequestLocation}
          slideOut={showAdjustPlaceMap}
          onAddFacilities={() => {
            if (!user) {
              setShowLoginPrompt(true);
              return;
            }
            if (selectedPark.isAutoDiscovered) {
              setAddPlaceInitialName(selectedPark.name);
              setAddPlaceInitialLocation({ lat: selectedPark.lat, lng: selectedPark.lng });
              setShowAddDrawer(true);
              setSelectedPark(null);
            } else {
              setEditingPark(selectedPark);
              setEditDrawerMode("full");
              setShowEditDrawer(true);
            }
          }}
          requireLoginForFavourite={!user}
        />
      )}

      {/* Add Place Drawer – slides down when dropping pin on map, slides back up after Use this location */}
      {showAddDrawer && (
        <AddPlaceDrawer
          onClose={() => {
            setShowAddDrawer(false);
            setAddPlacePinResult(null);
            setAddPlaceInitialName("");
            setAddPlaceInitialLocation(null);
          }}
          onSave={handleAddPlace}
          userLocation={userLocation}
          onOpenPinDropMap={(center) => {
            const c = center || userLocation || { lat: 51.5074, lng: -0.1278 };
            setAddPlacePinMapPin(c);
            setShowAddPlacePinMap(true);
          }}
          pinLocationFromMap={addPlacePinResult}
          slideOut={showAddPlacePinMap}
          initialName={addPlaceInitialName}
          initialLocation={addPlaceInitialLocation}
        />
      )}

      {/* Add place – drop pin full-screen map (above drawer so modal disappears) */}
      {showAddPlacePinMap && (
        <div className="adjust-pin-fullscreen add-place-pin-fullscreen">
          <div className="adjust-pin-floating-bar">
            <button
              type="button"
              onClick={() => {
                setShowAddPlacePinMap(false);
                setShowAddDrawer(false);
                setAddPlacePinMapPin(null);
                setAddPlacePinResult(null);
              }}
              className="adjust-pin-pill adjust-pin-pill-home"
              aria-label="Back to home"
            >
              <House size={20} weight="fill" />
              <span>Home</span>
            </button>
            <div className="adjust-pin-floating-actions">
              <button
                type="button"
                className="adjust-pin-pill btn-primary adjust-pin-save-btn"
                disabled={!addPlacePinMapPin}
                onClick={() => {
                  if (addPlacePinMapPin) {
                    setAddPlacePinResult(addPlacePinMapPin);
                    setShowAddPlacePinMap(false);
                    setAddPlacePinMapPin(null);
                  }
                }}
              >
                Use this location
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddPlacePinMap(false);
                  setAddPlacePinMapPin(null);
                }}
                className="adjust-pin-pill adjust-pin-pill-close"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>
          </div>
          <div className="adjust-pin-map-wrap">
            <MainMap
              center={addPlacePinMapPin || userLocation || { lat: 51.5074, lng: -0.1278 }}
              zoom={addPlacePinMapPin ? 16 : 12}
              parks={[]}
              userLocation={null}
              onPinDrop={(loc) => setAddPlacePinMapPin(loc)}
              isPinDropMode={true}
              initialPinDropLocation={addPlacePinMapPin}
              pinDropColor="#DD6616"
              hideConfirmPinButton
              filters={filters}
            />
          </div>
        </div>
      )}

      {/* Edit Place Drawer */}
      {showEditDrawer && editingPark && (
        <EditPlaceDrawer
          park={editingPark}
          onClose={() => {
            setShowEditDrawer(false);
            setEditingPark(null);
            setEditDrawerMode("full");
          }}
          onSave={handleEditPlace}
          onDelete={() => setShowDeleteConfirm(true)}
          onAdjustPinLocation={() => {
            setShowEditDrawer(false);
            setShowAdjustPlaceMap(true);
          }}
          mode={editDrawerMode}
          isFavourite={favouriteIds.includes(editingPark.id)}
          onToggleFavourite={() => toggleFavorite(editingPark.id)}
          onShowFullEdit={() => setEditDrawerMode("full")}
        />
      )}

      {/* Adjust pin location – full-screen map; drawer slides down; floating controls */}
      {showAdjustPlaceMap && editingPark && (
        <div className="adjust-pin-fullscreen">
          <div className="adjust-pin-floating-bar">
            <button
              type="button"
              onClick={() => {
                setShowAdjustPlaceMap(false);
                setShowEditDrawer(false);
                setEditingPark(null);
                setSelectedPark(null);
              }}
              className="adjust-pin-pill adjust-pin-pill-home"
              aria-label="Back to home"
            >
              <House size={20} weight="fill" />
              <span>Home</span>
            </button>
            <div className="adjust-pin-floating-actions">
              <button
                type="button"
                className="adjust-pin-pill btn-primary adjust-pin-save-btn"
                onClick={() => {
                  setShowAdjustPlaceMap(false);
                  setEditDrawerMode("full");
                  setShowEditDrawer(true);
                }}
              >
                Save location
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAdjustPlaceMap(false);
                  setEditDrawerMode("full");
                  setShowEditDrawer(true);
                }}
                className="adjust-pin-pill adjust-pin-pill-close"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>
          </div>
          <div className="adjust-pin-map-wrap">
            <MainMap
              center={{ lat: editingPark.lat, lng: editingPark.lng }}
              zoom={16}
              parks={[]}
              userLocation={null}
              onPinDrop={(loc) => {
                setEditingPark((prev) => prev ? { ...prev, lat: loc.lat, lng: loc.lng } : null);
              }}
              isPinDropMode={true}
              initialPinDropLocation={{ lat: editingPark.lat, lng: editingPark.lng }}
              pinDropColor="#DD6616"
              hideConfirmPinButton
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
              <button
                className="btn-secondary"
                onClick={() => (window.location.href = "/login")}
              >
                Already have an account? Log in
              </button>
            </div>
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
          onClose={handleCloseTransportModal}
          showLoginPrompt={showDirectionsLoginPrompt}
          parkName={directionsPark?.name}
          onLogin={handleDirectionsLogin}
          onSignup={handleDirectionsSignup}
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
            Change travel mode
          </button>
          <button
            className="directions-close"
            onClick={() => {
              setDirectionsMode(false);
              setCurrentRoute(null);
              if (directionsPark) {
                setSelectedPark(directionsPark);
              }
            }}
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
      {showToast && !isLoadingLocation && !isLoadingParks && <div className="toast">{toastMessage}</div>}
    </div>
  );
}
