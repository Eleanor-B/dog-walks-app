"use client";

import { CaretLeft, EnvelopeSimple } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import AppFooter from "../components/AppFooter";

const CONTACT_EMAIL = "hello@gowalkthedog.com";
const MAILTO_URL = `mailto:${CONTACT_EMAIL}?subject=Go%20Walk%20The%20Dog%20-%20Contact`;

export default function Contact() {
  const router = useRouter();

  const openMailClient = () => {
    window.location.href = MAILTO_URL;
  };

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

          <h1>Contact</h1>

          <p className="content-lead">
            Got a question, spotted a problem, or just want to say hello? We&apos;d love to hear from you.
          </p>

          <a
            href={MAILTO_URL}
            className="email-card-link"
            onClick={(e) => {
              e.preventDefault();
              openMailClient();
            }}
            rel="noopener noreferrer"
          >
            <div className="email-card-icon-wrap">
              <EnvelopeSimple size={22} weight="regular" style={{ color: "var(--color-icon)" }} />
            </div>
            <div>
              <div className="email-card-title">Email us</div>
              <div className="email-card-value">{CONTACT_EMAIL}</div>
            </div>
          </a>

          <p className="content-muted content-muted-margin-top">
            We aim to respond within a few days. For privacy-related requests, please include &quot;Privacy&quot; in the subject line and we&apos;ll prioritise your message.
          </p>
          <p className="content-muted" style={{ marginTop: "var(--spacing-sm)" }}>
            For data protection and privacy requests, we will respond within 30 days as required by UK GDPR.
          </p>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
