"use client";

import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(48, 71%, 97%)", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400, background: "#fff", padding: 32, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
        
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: "#006947", fontFamily: "var(--font-fraunces), serif" }}>
          Check Your Email
        </h1>
        
        <p style={{ fontSize: 14, color: "#555", marginBottom: 24, lineHeight: 1.6 }}>
          We've sent you a confirmation email. Click the link in the email to verify your account and complete sign up.
        </p>

        <div style={{ background: "#f0f9f4", padding: 16, borderRadius: 8, marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: "#02301F", margin: 0 }}>
            <strong>Didn't receive it?</strong><br />
            Check your spam folder or try signing up again.
          </p>
        </div>

        <Link 
          href="/"
          className="btn-primary"
          style={{ display: "inline-block", padding: "10px 20px", textDecoration: "none" }}
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
