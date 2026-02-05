"use client";

import { Heart } from "@phosphor-icons/react";

export default function AppFooter() {
  return (
    <footer
      style={{
        background: "#0A5740",
        marginTop: "auto",
        borderRadius: "16px 16px 0 0",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "48px 24px 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
        }}
      >
        {/* White Logo */}
        <div style={{ marginBottom: 40 }}>
          <img
            src="/GWTD-LogoWhiteSm.svg"
            alt="Go Walk The Dog"
            style={{
              height: 28,
              width: "auto",
              display: "block",
            }}
          />
        </div>

        {/* Footer Links */}
        <nav
          aria-label="Footer navigation"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 32,
            justifyContent: "center",
            marginBottom: 28,
          }}
        >
          <a
            href="/privacy-policy"
            style={{
              fontSize: 14,
              color: "#fff",
              textDecoration: "none",
              fontFamily: "var(--font-outfit), sans-serif",
              fontWeight: 400,
              transition: "opacity 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Privacy Policy
          </a>
          <a
            href="/cookie-policy"
            style={{
              fontSize: 14,
              color: "#fff",
              textDecoration: "none",
              fontFamily: "var(--font-outfit), sans-serif",
              fontWeight: 400,
              transition: "opacity 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Cookie Policy
          </a>
          <a
            href="/contact"
            style={{
              fontSize: 14,
              color: "#fff",
              textDecoration: "none",
              fontFamily: "var(--font-outfit), sans-serif",
              fontWeight: 400,
              transition: "opacity 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Contact
          </a>
        </nav>

        {/* Dogs Trust Donation Link */}
        <a
          href="https://www.dogstrust.org.uk/support-us/ways-to-give"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "rgba(255, 255, 255, 0.85)",
            textDecoration: "none",
            fontFamily: "var(--font-outfit), sans-serif",
            fontWeight: 400,
            marginBottom: 24,
            padding: "8px 16px",
            borderRadius: 999,
            border: "1px solid rgba(255, 255, 255, 0.2)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
          }}
        >
          <Heart size={14} weight="fill" style={{ color: "#DD6616" }} />
          Support Dogs Trust
        </a>

        {/* Copyright */}
        <div
          style={{
            textAlign: "center",
            fontSize: 13,
            color: "rgba(255, 255, 255, 0.7)",
            fontFamily: "var(--font-outfit), sans-serif",
            fontWeight: 400,
          }}
        >
          © Go Walk The Dog. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
