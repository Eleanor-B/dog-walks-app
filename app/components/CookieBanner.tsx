"use client";

import { useState, useEffect } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if user already made a choice
    try {
      const consent = localStorage.getItem("gwtd-cookie-consent");
      if (!consent) {
        // Small delay so banner doesn't flash on load
        const timer = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage unavailable - show banner
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem("gwtd-cookie-consent", "accepted");
    } catch {}
    setVisible(false);
  };

  const handleDecline = () => {
    try {
      localStorage.setItem("gwtd-cookie-consent", "declined");
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie consent">
      <p>
        We use cookies to improve your experience and for analytics.{" "}
        <a href="/privacy-policy">Learn more</a>
      </p>
      <div className="cookie-banner-actions">
        <button className="cookie-decline-btn" onClick={handleDecline}>
          Decline
        </button>
        <button className="cookie-accept-btn" onClick={handleAccept}>
          Accept
        </button>
      </div>
    </div>
  );
}
