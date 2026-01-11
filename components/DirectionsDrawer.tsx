"use client";

import { X, PersonSimpleWalk, Car, Train } from "@phosphor-icons/react";
import { useState } from "react";

type DirectionsDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  spaceName: string;
  spaceLat: number;
  spaceLng: number;
  userLocation: { lat: number; lng: number } | null;
  onRequestLocation: () => void;
  onShowRoute: (routeData: any) => void;
};

export default function DirectionsDrawer({
  isOpen,
  onClose,
  spaceName,
  spaceLat,
  spaceLng,
  userLocation,
  onRequestLocation,
  onShowRoute,
}: DirectionsDrawerProps) {
  const [isLoading, setIsLoading] = useState(false);

  const getDirections = async (mode: "walking" | "driving" | "transit") => {
    if (!userLocation) {
      onRequestLocation();
      return;
    }

    setIsLoading(true);

    try {
      // Map our modes to Mapbox profiles
      const profile = mode === "walking" ? "walking" : mode === "driving" ? "driving" : "driving";
      
      const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${userLocation.lng},${userLocation.lat};${spaceLng},${spaceLat}?geometries=geojson&steps=true&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        // Pass route data to parent
        onShowRoute({
          mode,
          duration: route.duration, // in seconds
          distance: route.distance, // in meters
          geometry: route.geometry,
          steps: route.legs[0].steps,
          origin: userLocation,
          destination: { lat: spaceLat, lng: spaceLng },
          destinationName: spaceName,
        });
        
        onClose();
      } else {
        alert("Could not find a route. Please try a different transport mode.");
      }
    } catch (error) {
      console.error("Error fetching directions:", error);
      alert("Failed to get directions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.4)",
          zIndex: 999,
          animation: "fadeIn 0.2s ease-out",
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#fff",
          borderRadius: "24px 24px 0 0",
          padding: "20px 24px 24px 24px",
          zIndex: 1000,
          maxWidth: 900,
          margin: "0 auto",
          boxShadow: "0 -4px 24px rgba(0, 0, 0, 0.1)",
          animation: isLoading ? "slideDownOut 0.4s ease-in forwards" : "slideUpBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>Get directions</h2>
            <p style={{ margin: "4px 0 0 0", fontSize: 14, color: "#555" }}>to {spaceName}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              background: "transparent",
              border: "none",
              padding: 8,
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              marginTop: 0,
              opacity: isLoading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => !isLoading && (e.currentTarget.style.background = "#f5f5f5")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <X size={24} weight="regular" color="#02301F" />
          </button>
        </div>

        {/* Location Check */}
        {!userLocation && (
          <div
            style={{
              background: "#FFF4E6",
              border: "1px solid #FFD699",
              borderRadius: 8,
              padding: 10,
              marginBottom: 12,
              fontSize: 13,
              color: "#8B5000",
            }}
          >
            📍 Share your location to get personalized directions
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div
            style={{
              background: "#E8F5F1",
              border: "1px solid #B8E6D5",
              borderRadius: 8,
              padding: 10,
              marginBottom: 12,
              fontSize: 13,
              color: "#006947",
              textAlign: "center",
            }}
          >
            🗺️ Finding the best route...
          </div>
        )}

        {/* Direction Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Walking */}
          <button
            onClick={() => getDirections("walking")}
            disabled={isLoading}
            className="btn-secondary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              justifyContent: "flex-start",
              marginTop: 0,
              fontSize: 15,
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "#E8F5F1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <PersonSimpleWalk size={22} weight="regular" color="#006947" />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 600, color: "#02301F" }}>Walking</div>
              <div style={{ fontSize: 13, color: "#555", fontWeight: 400 }}>Best for nearby parks</div>
            </div>
          </button>

          {/* Driving */}
          <button
            onClick={() => getDirections("driving")}
            disabled={isLoading}
            className="btn-secondary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              justifyContent: "flex-start",
              marginTop: 0,
              fontSize: 15,
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "#E8F5F1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Car size={22} weight="regular" color="#006947" />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 600, color: "#02301F" }}>Driving</div>
              <div style={{ fontSize: 13, color: "#555", fontWeight: 400 }}>Fastest route by car</div>
            </div>
          </button>

          {/* Public Transport */}
          <button
            onClick={() => getDirections("transit")}
            disabled={isLoading}
            className="btn-secondary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              justifyContent: "flex-start",
              marginTop: 0,
              fontSize: 15,
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "#E8F5F1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Train size={22} weight="regular" color="#006947" />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 600, color: "#02301F" }}>Public transport</div>
              <div style={{ fontSize: 13, color: "#555", fontWeight: 400 }}>Bus, tube, and train options</div>
            </div>
          </button>
        </div>

        {/* Safe area for iPhone home indicator */}
        <div style={{ height: 16 }} />
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUpBounce {
          0% {
            transform: translateY(100%);
            opacity: 0;
          }
          60% {
            transform: translateY(-8px);
            opacity: 1;
          }
          80% {
            transform: translateY(4px);
          }
          100% {
            transform: translateY(0);
          }
        }
        @keyframes slideDownOut {
          0% {
            transform: translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateY(100%);
            opacity: 0.8;
          }
        }
      `}</style>
    </>
  );
}
