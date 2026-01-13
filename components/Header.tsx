"use client";

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
    <>
      <style jsx>{`
        .header-logo {
          height: 24px;
          width: auto;
          cursor: pointer;
        }
        @media (min-width: 640px) {
          .header-logo {
            height: 31px;
          }
        }
        .signup-btn {
          padding: 5px 10px;
          margin-top: 0;
          font-size: 12px;
          white-space: nowrap;
        }
        @media (min-width: 640px) {
          .signup-btn {
            padding: 6px 14px;
            font-size: 13px;
          }
        }
        .login-link {
          background: transparent;
          border: none;
          color: #006947;
          font-size: 12px;
          cursor: pointer;
          padding: 0;
          margin-top: 0;
          font-family: var(--font-outfit), sans-serif;
          transition: color 0.15s ease;
          font-weight: 500;
          white-space: nowrap;
        }
        @media (min-width: 640px) {
          .login-link {
            font-size: 13px;
            text-decoration: underline;
            text-underline-offset: 3px;
          }
        }
        .login-link:hover {
          color: #004d33;
        }
        .logout-link {
          background: transparent;
          border: none;
          color: #006947;
          font-size: 12px;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
          padding: 0;
          margin-top: 0;
          font-family: var(--font-outfit), sans-serif;
          transition: color 0.15s ease;
          font-weight: 500;
        }
        @media (min-width: 640px) {
          .logout-link {
            font-size: 13px;
          }
        }
        .logout-link:hover {
          color: #004d33;
        }
      `}</style>
      <header
        style={{
          background: "hsl(48, 71%, 97%)",
          boxShadow: "0 6px 20px rgba(0, 105, 71, 0.12)",
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
            padding: "14px 24px",
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
              className="header-logo"
            />
          </Link>

          {/* Navigation - Right Side */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {user ? (
              <button
                onClick={handleLogout}
                className="logout-link"
              >
                Log out
              </button>
            ) : (
              <>
                <Link href="/signup">
                  <button className="btn-primary signup-btn">
                    Sign up
                  </button>
                </Link>
                <Link href="/login">
                  <button className="login-link">
                    Log in
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
