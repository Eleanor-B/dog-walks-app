"use client";

import { useState, useEffect } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem("gwtd-cookie-consent");
      if (!consent) {
        const timer = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
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
    <div className={`cookie-banner ${visible ? "is-visible" : ""}`} role="dialog" aria-label="Cookie consent">
      <p className="cookie-text">
        We use cookies to improve your experience and for analytics.{" "}
        <a href="/privacy-policy" className="cookie-link">Learn more</a>
      </p>
      <div className="cookie-actions">
        <button className="cookie-decline" onClick={handleDecline}>
          Decline
        </button>
        <button className="cookie-accept" onClick={handleAccept}>
          Accept
        </button>
      </div>
    </div>
  );
}
