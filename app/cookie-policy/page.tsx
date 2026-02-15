"use client";

import { CaretLeft } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import AppFooter from "../components/AppFooter";

export default function CookiePolicy() {
  const router = useRouter();

  return (
    <div className="content-page">
      <main style={{ flex: 1 }}>
        <div className="content-page-inner">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="page-back-link"
          >
            <CaretLeft size={14} />
            Back to home
          </button>

          <h1>Cookie Policy</h1>

          <p className="content-muted margin-bottom-xl">
            Last updated: January 2026
          </p>

          <div className="content-body">
            <p>
              Go Walk The Dog uses cookies to make the app work properly and to help us understand how people use it. This page explains what cookies we use and why.
            </p>

            <h2>What Are Cookies?</h2>
            <p>
              Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences and understand how you use it.
            </p>

            <h2>Essential Cookies</h2>
            <p>
              These are required for the app to work. They keep you logged in and remember your session. You cannot opt out of these cookies as the app would not function without them.
            </p>

            <div className="content-card">
              <div className="content-card-row">
                <strong>Session cookie</strong>
                <span className="content-card-badge">Required</span>
              </div>
              <p style={{ margin: 0 }} className="content-muted">Keeps you logged in while you use the app. Expires when you close your browser.</p>
            </div>

            <h2>Analytics Cookies</h2>
            <p>
              We use analytics cookies to understand how people use Go Walk The Dog — for example, which pages are most visited and whether users encounter any errors. This helps us improve the app. You can opt out of these cookies using the cookie banner when you first visit.
            </p>

            <div className="content-card">
              <div className="content-card-row">
                <strong>Google Analytics</strong>
                <span className="content-card-badge optional">Optional</span>
              </div>
              <p style={{ margin: 0 }} className="content-muted">Helps us see how people use the app so we can make it better. Duration: up to 2 years.</p>
              <p style={{ margin: "var(--spacing-sm) 0 0", fontSize: 13 }} className="content-muted">
                Google Analytics may process data outside the UK. Google has appropriate safeguards in place under UK GDPR Standard Contractual Clauses.
              </p>
            </div>

            <h2>Managing Your Preferences</h2>
            <p>
              When you first visit the app, a cookie banner will ask for your consent for non-essential cookies. You can also manage cookies through your browser settings. Note that disabling essential cookies may prevent the app from working correctly.
            </p>

            <h2>Questions?</h2>
            <p>
              If you have any questions about how we use cookies, please{" "}
              <a href="/contact">get in touch</a>.
            </p>
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
