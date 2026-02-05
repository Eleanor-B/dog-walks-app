"use client";

import { CaretLeft } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import AppFooter from "../components/AppFooter";

export default function CookiePolicy() {
  const router = useRouter();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "hsl(48, 71%, 97%)" }}>
      <main style={{ flex: 1 }}>
        <div
          style={{
            maxWidth: 700,
            margin: "0 auto",
            padding: "40px 24px 80px",
          }}
        >
          {/* Back link */}
          <button
            onClick={() => router.push("/")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginBottom: 32,
              fontSize: 14,
              color: "#006947",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontFamily: "var(--font-outfit), sans-serif",
              fontWeight: 500,
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            <CaretLeft size={14} />
            Back to home
          </button>

          <h1>Cookie Policy</h1>

          <p
            style={{
              fontSize: 14,
              color: "#6B7280",
              marginBottom: 32,
              fontFamily: "var(--font-outfit), sans-serif",
            }}
          >
            Last updated: January 2026
          </p>

          <div
            style={{
              lineHeight: 1.7,
              fontSize: 15,
              color: "#02301F",
              fontFamily: "var(--font-outfit), sans-serif",
            }}
          >
            <p style={{ marginBottom: 16 }}>
              Go Walk The Dog uses cookies to make the app work properly and to help us understand how people use it. This page explains what cookies we use and why.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>What Are Cookies?</h2>
            <p style={{ marginBottom: 16 }}>
              Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences and understand how you use it.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>Essential Cookies</h2>
            <p style={{ marginBottom: 16 }}>
              These are required for the app to work. They keep you logged in and remember your session. You cannot opt out of these cookies as the app would not function without them.
            </p>

            <div
              style={{
                background: "#fff",
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
                border: "1px solid hsl(48 30% 88%)",
                fontSize: 14,
                fontFamily: "var(--font-outfit), sans-serif",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <strong>Session cookie</strong>
                <span style={{ color: "#006947", fontSize: 12, fontWeight: 500 }}>Required</span>
              </div>
              <p style={{ margin: 0, color: "#6B7280" }}>Keeps you logged in while you use the app.</p>
            </div>

            <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>Analytics Cookies</h2>
            <p style={{ marginBottom: 16 }}>
              We use analytics cookies to understand how people use Go Walk The Dog — for example, which pages are most visited and whether users encounter any errors. This helps us improve the app. You can opt out of these cookies using the cookie banner when you first visit.
            </p>

            <div
              style={{
                background: "#fff",
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
                border: "1px solid hsl(48 30% 88%)",
                fontSize: 14,
                fontFamily: "var(--font-outfit), sans-serif",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <strong>Google Analytics</strong>
                <span style={{ color: "#D78203", fontSize: 12, fontWeight: 500 }}>Optional</span>
              </div>
              <p style={{ margin: 0, color: "#6B7280" }}>Helps us see how people use the app so we can make it better.</p>
            </div>

            <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>Managing Your Preferences</h2>
            <p style={{ marginBottom: 16 }}>
              When you first visit the app, a cookie banner will ask for your consent for non-essential cookies. You can also manage cookies through your browser settings. Note that disabling essential cookies may prevent the app from working correctly.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>Questions?</h2>
            <p style={{ marginBottom: 16 }}>
              If you have any questions about how we use cookies, please{" "}
              <a href="/contact" style={{ color: "#006947", textDecoration: "underline", textUnderlineOffset: 3 }}>
                get in touch
              </a>.
            </p>
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
