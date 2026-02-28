"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: "var(--spacing-md)" }}>📧</div>

        <h1 className="auth-title" style={{ fontSize: 28 }}>
          Check Your Email
        </h1>

        <p className="auth-subtitle" style={{ marginBottom: "var(--spacing-lg)", lineHeight: 1.6 }}>
          We&apos;ve sent you a confirmation email. Click the link in the email to verify your account and complete sign up.
        </p>

        <div className="content-card" style={{ marginBottom: "var(--spacing-lg)" }}>
          <p style={{ fontSize: 13, color: "var(--color-text)", margin: 0 }}>
            <strong>Didn&apos;t receive it?</strong><br />
            Check your spam folder or try signing up again.
          </p>
        </div>

        <Link
          href={redirectTo}
          className="btn-primary"
          style={{ display: "inline-block", padding: "10px 20px", textDecoration: "none" }}
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <h1 className="auth-title" style={{ fontSize: 28 }}>Check Your Email</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading...</p>
        </div>
      </div>
    }>
      <CheckEmailContent />
    </Suspense>
  );
}
