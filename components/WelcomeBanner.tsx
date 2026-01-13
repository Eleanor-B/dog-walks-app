"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { UserCircle, Heart, MapPin, SignOut } from "@phosphor-icons/react";

export default function WelcomeBanner({ user }: { user: any }) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  if (!user) {
    // Logged out state
    return (
      <div style={{ 
        background: "#EEFFE3", 
        border: "1px solid #D4E8D4",
        borderRadius: 12,
        padding: "16px 24px",
        marginBottom: 24,
        textAlign: "center"
      }}>
        <p style={{ 
          fontSize: 15, 
          color: "#02301F", 
          marginBottom: 12,
          fontWeight: 500
        }}>
          🐕 Sign up to save your favourite dog spots!
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center" }}>
          <Link href="/signup">
            <button className="btn-primary" style={{ marginTop: 0 }}>
              Sign Up
            </button>
          </Link>
          <Link href="/login">
            <button className="btn-secondary" style={{ marginTop: 0 }}>
              Log In
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // Logged in state
  const firstName = user.user_metadata?.first_name || "there";

  return (
    <div style={{ 
      background: "#EEFFE3", 
      border: "1px solid #D4E8D4",
      borderRadius: 12,
      padding: "16px 24px",
      marginBottom: 24,
      textAlign: "center"
    }}>
      <p style={{ 
        fontSize: 15, 
        color: "#02301F", 
        marginBottom: 12,
        fontWeight: 500
      }}>
        👋 Welcome back, {firstName}! Happy walking! 🐕
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
        <button 
          className="btn-secondary" 
          style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 6 }}
          onClick={() => {
            const mySpacesSection = document.getElementById("my-spaces");
            if (mySpacesSection) {
              mySpacesSection.scrollIntoView({ behavior: "smooth" });
            }
          }}
        >
          <MapPin size={16} weight="bold" />
          My Spaces
        </button>
        <button 
          className="btn-secondary" 
          style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 6 }}
          onClick={() => {
            const favouritesSection = document.getElementById("favourites");
            if (favouritesSection) {
              favouritesSection.scrollIntoView({ behavior: "smooth" });
            }
          }}
        >
          <Heart size={16} weight="bold" />
          My Favourites
        </button>
        <button 
          className="btn-text" 
          style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 6 }}
          onClick={handleLogout}
        >
          <SignOut size={16} weight="bold" />
          Log Out
        </button>
      </div>
    </div>
  );
}
