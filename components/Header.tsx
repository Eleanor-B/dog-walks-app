"use client";

import Image from "next/image";
import { User } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

type HeaderProps = {
  onLogin?: () => void;
  user?: {
    name: string;
    avatar?: string;
  } | null;
};

export default function Header({ onLogin, user }: HeaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 10) {
        // At top of page, always show
        setIsVisible(true);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up, show header
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down and past 100px, hide header
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [lastScrollY]);

  return (
    <header
      style={{
        background: "hsl(48, 71%, 97%)",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
        position: "sticky",
        top: 0,
        zIndex: 1000,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(-100%)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo - Left Side */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <img
            src="/GWTD-logov2.svg"
            alt="Go Walk The Dog"
            style={{
              height: 26,
              width: "auto",
              cursor: "pointer",
            }}
          />
        </div>

        {/* Navigation - Right Side */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {user ? (
            // Logged in state - Avatar
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: "2px solid #006947",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#006947",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#02301F",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                }}
              >
                {user.name}
              </span>
            </div>
          ) : (
            // Logged out state - Login button
            <button
              onClick={onLogin}
              className="btn-secondary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                marginTop: 0,
                fontSize: 14,
              }}
            >
              <User size={18} weight="regular" />
              Log in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
