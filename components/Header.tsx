"use client";

import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type HeaderProps = {
  user?: any;
};

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

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
        <Link href="/" style={{ display: "flex", alignItems: "center" }}>
          <img
            src="/GWTD-logov2.svg"
            alt="Go Walk The Dog"
            style={{
              height: 26,
              width: "auto",
              cursor: "pointer",
            }}
          />
        </Link>

        {/* Navigation - Right Side */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {user ? (
            // Logged in - Show Log Out text link in forest green
            <button
              onClick={handleLogout}
              style={{
                background: "transparent",
                border: "none",
                color: "#006947",
                fontSize: 13,
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 3,
                padding: 0,
                marginTop: 0,
                fontFamily: "var(--font-dm-sans), sans-serif",
                transition: "color 0.15s ease",
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#004d33";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#006947";
              }}
            >
              Log out
            </button>
          ) : (
            // Logged out - Show Sign Up and Log In buttons
            <>
              <Link href="/signup">
                <button
                  className="btn-primary"
                  style={{
                    padding: "8px 16px",
                    marginTop: 0,
                    fontSize: 13,
                  }}
                >
                  Sign up
                </button>
              </Link>
              <Link href="/login">
                <button
                  className="btn-secondary"
                  style={{
                    padding: "8px 16px",
                    marginTop: 0,
                    fontSize: 13,
                  }}
                >
                  Log in
                </button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
