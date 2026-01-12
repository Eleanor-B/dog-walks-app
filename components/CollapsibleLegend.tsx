"use client";

import { useState, useEffect } from "react";
import { MapTrifold, X } from "@phosphor-icons/react";

type CollapsibleLegendProps = {
  top?: number | string;
  left?: number | string;
  showSelected?: boolean;
};

export default function CollapsibleLegend({ 
  top = 12, 
  left = 12,
  showSelected = true 
}: CollapsibleLegendProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Load saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('legendExpanded');
    if (saved !== null) {
      setIsExpanded(saved === 'true');
    }
  }, []);

  // Save preference to localStorage
  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem('legendExpanded', String(newState));
  };

  return (
    <div
      onClick={toggleExpanded}
      style={{
        position: "absolute",
        top,
        left,
        background: "rgba(255, 255, 255, 0.95)",
        borderRadius: 8,
        padding: isExpanded ? 12 : 8,
        display: "flex",
        alignItems: isExpanded ? "flex-start" : "center",
        gap: isExpanded ? 12 : 0,
        fontSize: 12,
        fontFamily: "var(--font-dm-sans), sans-serif",
        color: "#000",
        zIndex: 10001,
        cursor: "pointer",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        width: isExpanded ? "auto" : 32,
        height: isExpanded ? "auto" : 32,
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
      title={isExpanded ? "Click to collapse" : "Click to expand legend"}
    >
      {/* Icon */}
      <div
        style={{
          flexShrink: 0,
          width: 16,
          height: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MapTrifold size={16} weight="regular" color="#006947" />
      </div>

      {/* Legend Items */}
      {isExpanded && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            opacity: isExpanded ? 1 : 0,
            transition: "opacity 0.2s ease 0.1s",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#31A6FF", flexShrink: 0 }}></div>
            <span style={{ whiteSpace: "nowrap" }}>Your location</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#2B5B2F", flexShrink: 0 }}></div>
            <span style={{ whiteSpace: "nowrap" }}>Dog spaces</span>
          </div>
          {showSelected && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#DD6616", flexShrink: 0 }}></div>
              <span style={{ whiteSpace: "nowrap" }}>Selected space</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
