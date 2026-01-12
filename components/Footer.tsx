"use client";

export default function Footer() {
  return (
    <footer
      style={{
        background: "#3B5149",
        marginTop: "auto",
        position: "relative",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "32px 24px",
        }}
      >
        {/* White Logo - Full Opacity */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 24,
            opacity: 1,
          }}
        >
          <img
            src="/GWTD-LogoWhiteSm.svg"
            alt="Go Walk The Dog"
            style={{
              height: 24,
              width: "auto",
            }}
          />
        </div>

        {/* Footer Links */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <a
            href="/privacy"
            style={{
              fontSize: 14,
              color: "#fff",
              textDecoration: "none",
              fontFamily: "var(--font-dm-sans), sans-serif",
              transition: "opacity 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Privacy Policy
          </a>
          <a
            href="/terms"
            style={{
              fontSize: 14,
              color: "#fff",
              textDecoration: "none",
              fontFamily: "var(--font-dm-sans), sans-serif",
              transition: "opacity 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Terms of Service
          </a>
          <a
            href="/cookies"
            style={{
              fontSize: 14,
              color: "#fff",
              textDecoration: "none",
              fontFamily: "var(--font-dm-sans), sans-serif",
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
              fontFamily: "var(--font-dm-sans), sans-serif",
              transition: "opacity 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Contact
          </a>
          <a
            href="/about"
            style={{
              fontSize: 14,
              color: "#fff",
              textDecoration: "none",
              fontFamily: "var(--font-dm-sans), sans-serif",
              transition: "opacity 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            About
          </a>
        </div>

        {/* Copyright */}
        <div
          style={{
            textAlign: "center",
            fontSize: 13,
            color: "rgba(255, 255, 255, 0.7)",
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          © {new Date().getFullYear()} Go Walk The Dog. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
