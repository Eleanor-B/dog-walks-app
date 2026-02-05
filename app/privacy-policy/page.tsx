"use client";

import { CaretLeft } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import AppFooter from "../components/AppFooter";

export default function PrivacyPolicy() {
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

          <h1 style={{ marginBottom: 16 }}>Privacy Policy</h1>

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
              Go Walk The Dog (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our website and services.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>Information We Collect</h2>
            <p style={{ marginBottom: 16 }}>
              When you create an account, we collect your email address and first name. When you add a dog-walking space, we store the location data you provide. We also collect basic usage data to improve the app experience.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>How We Use Your Information</h2>
            <p style={{ marginBottom: 16 }}>
              We use your information to provide and maintain the service, to allow you to save favourite spaces and contribute new ones, and to communicate with you about your account. We do not sell your personal information to third parties.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>Cookies</h2>
            <p style={{ marginBottom: 16 }}>
              We use essential cookies to keep you logged in and analytics cookies to understand how people use the app. You can manage your cookie preferences at any time. See our{" "}
              <a href="/cookie-policy" style={{ color: "#006947", textDecoration: "underline", textUnderlineOffset: 3 }}>
                Cookie Policy
              </a>{" "}
              for more details.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>Your Rights (GDPR)</h2>
            <p style={{ marginBottom: 16 }}>
              You have the right to access, correct, or delete your personal data at any time. You can delete your account from your account settings. If you have questions about your data, please{" "}
              <a href="/contact" style={{ color: "#006947", textDecoration: "underline", textUnderlineOffset: 3 }}>
                contact us
              </a>.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>Data Storage</h2>
            <p style={{ marginBottom: 16 }}>
              Your data is stored securely using Supabase, which provides enterprise-grade encryption and security. Passwords are hashed and never stored in plain text.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>Changes to This Policy</h2>
            <p style={{ marginBottom: 16 }}>
              We may update this policy from time to time. We will notify you of any significant changes by posting a notice on the app.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>Contact</h2>
            <p style={{ marginBottom: 16 }}>
              If you have any questions about this Privacy Policy, please{" "}
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
