"use client";

import { useState, useEffect } from "react";
import { MapPin, Heart } from "@phosphor-icons/react";

export default function StickyNav() {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 80);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      style={{
        position: isSticky ? "fixed" : "relative",
        top: isSticky ? 0 : "auto",
        left: 0,
        right: 0,
        background: "#fff",
        padding: "10px 16px",
        zIndex: 50,
        transition: "all 0.2s ease",
        boxShadow: isSticky ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          display: "flex",
          gap: 20,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <button
          onClick={() => {
            const section = document.getElementById("my-spaces");
            if (section) {
              section.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "transparent",
            border: "none",
            color: "#02301F",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: 6,
            transition: "background 0.15s ease",
            marginTop: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#F5F5F5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <MapPin size={16} weight="bold" style={{ color: "#006947" }} />
          My Spaces
        </button>

        <div
          style={{
            width: 1,
            height: 16,
            background: "#E5E7EB",
          }}
        />

        <button
          onClick={() => {
            const section = document.getElementById("my-favourites");
            if (section) {
              section.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "transparent",
            border: "none",
            color: "#02301F",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: 6,
            transition: "background 0.15s ease",
            marginTop: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#F5F5F5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <Heart size={16} weight="bold" style={{ color: "#DD6616" }} />
          My Favourites
        </button>
      </div>
    </nav>
  );
}
