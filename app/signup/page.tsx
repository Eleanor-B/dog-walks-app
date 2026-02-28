"use client";

import { Suspense, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeSlash } from "@phosphor-icons/react";

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    email: "",
    password: "",
  });

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.firstName,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/signup/check-email?redirect=" + encodeURIComponent(redirectTo));
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Sign Up</h1>
        <p className="auth-subtitle">Create your GoWalkTheDog account</p>

        <form onSubmit={handleSignUp}>
          <label style={{ display: "block", marginBottom: "var(--spacing-md)" }}>
            <span className="auth-form-label">First Name</span>
            <input
              type="text"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="auth-input"
              style={{ marginBottom: 0 }}
            />
          </label>

          <label style={{ display: "block", marginBottom: "var(--spacing-md)" }}>
            <span className="auth-form-label">Email</span>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="auth-input"
              style={{ marginBottom: 0 }}
            />
          </label>

          <label style={{ display: "block", marginBottom: "var(--spacing-lg)" }}>
            <span className="auth-form-label">Password</span>
            <div className="auth-password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="auth-input"
                style={{ marginBottom: 0 }}
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <Eye size={20} weight="regular" />
                ) : (
                  <EyeSlash size={20} weight="regular" />
                )}
              </button>
            </div>
            <span className="auth-hint">At least 8 characters</span>
          </label>

          {error && (
            <div className="auth-error-banner">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 600 }}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="auth-footer-text" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          Already have an account?{" "}
          <Link
            href={redirectTo !== "/" ? "/login?redirect=" + encodeURIComponent(redirectTo) : "/login"}
            className="btn-secondary"
            style={{ textDecoration: "none" }}
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Sign Up</h1>
          <p className="auth-subtitle">Create your GoWalkTheDog account</p>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading...</p>
        </div>
      </div>
    }>
      <SignUpContent />
    </Suspense>
  );
}
