"use client";

import { PawPrint } from "@phosphor-icons/react";

export default function WelcomeBanner({ user }: { user: any }) {
  // Only show for logged out users
  if (user) {
    return null;
  }

  // Logged out state - show sign up CTA
  return (
    <div style={{ 
      background: "#EEFFE3", 
      borderBottom: "1px solid #D4E8D4",
      padding: "20px 24px",
      width: "100%",
      boxShadow: "0 2px 4px rgba(0,0,0,0.04)"
    }}>
      <div style={{
        maxWidth: 900,
        margin: "0 auto",
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10
      }}>
        <PawPrint size={20} weight="fill" style={{ color: "#DD6616" }} />
        <p style={{ 
          fontSize: 15, 
          color: "#02301F", 
          margin: 0,
          fontWeight: 500
        }}>
          Sign up to save your favourite dog spots!
        </p>
      </div>
    </div>
  );
}
