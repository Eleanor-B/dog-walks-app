"use client";

import { HandWaving } from "@phosphor-icons/react";

export default function WelcomeBanner({ user }: { user: any }) {
  if (!user) {
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
          textAlign: "center"
        }}>
          <p style={{ 
            fontSize: 15, 
            color: "#02301F", 
            margin: 0,
            fontWeight: 500
          }}>
            🐕 Sign up to save your favourite dog spots!
          </p>
        </div>
      </div>
    );
  }

  // Logged in state - personalized greeting, no buttons
  const firstName = user.user_metadata?.first_name || "there";

  return (
    <div style={{ 
      background: "#EEFFE3", 
      borderBottom: "1px solid #D4E8D4",
      padding: "16px 24px",
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
        gap: 8
      }}>
        <HandWaving size={20} weight="regular" style={{ color: "#DD6616" }} />
        <p style={{ 
          fontSize: 15, 
          color: "#02301F", 
          margin: 0,
          fontWeight: 500
        }}>
          Welcome back {firstName}, where do you want to walk your dog today?
        </p>
      </div>
    </div>
  );
}
