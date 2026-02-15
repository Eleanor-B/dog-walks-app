"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Log In</h1>
        <p className="auth-subtitle">Welcome back to GoWalkTheDog</p>

        <form onSubmit={handleLogin}>
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
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="auth-input"
              style={{ marginBottom: 0 }}
            />
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
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="auth-footer-text">
          Don&apos;t have an account?{" "}
          <Link href="/signup">Sign up</Link>
        </p>

        <p className="auth-footer-text" style={{ marginTop: 12 }}>
          <Link href="/reset-password" style={{ fontWeight: "inherit" }}>
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  );
}
