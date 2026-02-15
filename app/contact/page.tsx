"use client";

import { CaretLeft, EnvelopeSimple } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import AppFooter from "../components/AppFooter";

export default function Contact() {
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

          <h1 style={{ marginBottom: 16 }}>Contact</h1>

          <p
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: "#02301F",
              fontFamily: "var(--font-outfit), sans-serif",
              marginBottom: 32,
            }}
          >
            Got a question, spotted a problem, or just want to say hello? We&apos;d love to hear from you.
          </p>

          {/* Email card */}
          <a
            href="mailto:hello@gowalkthedog.com"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: "#fff",
              borderRadius: 12,
              padding: "20px 24px",
              border: "1px solid hsl(48 30% 88%)",
              textDecoration: "none",
              color: "#02301F",
              transition: "all 0.2s ease",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#006947";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "hsl(48 30% 88%)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "#EEFFE3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <EnvelopeSimple size={22} weight="regular" style={{ color: "#209326" }} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: "var(--font-outfit), sans-serif",
                  marginBottom: 2,
                }}
              >
                Email us
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "#006947",
                  fontFamily: "var(--font-outfit), sans-serif",
                }}
              >
                hello@gowalkthedog.com
              </div>
            </div>
          </a>

          {/* Additional info */}
          <p
            style={{
              fontSize: 14,
              color: "#6B7280",
              fontFamily: "var(--font-outfit), sans-serif",
              marginTop: 24,
              lineHeight: 1.6,
            }}
          >
            We aim to respond within a few days. For privacy-related requests, please include &quot;Privacy&quot; in the subject line and we&apos;ll prioritise your message.
          </p>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
