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
      // Success - redirect to home
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(48, 71%, 97%)", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400, background: "#fff", padding: 32, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, color: "#006947", fontFamily: "var(--font-fraunces), serif" }}>
          Log In
        </h1>
        <p style={{ fontSize: 14, color: "#555", marginBottom: 24 }}>
          Welcome back to GoWalkTheDog
        </p>

        <form onSubmit={handleLogin}>
          <label style={{ display: "block", marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#02301F", display: "block", marginBottom: 6 }}>
              Email
            </span>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14 }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 24 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#02301F", display: "block", marginBottom: 6 }}>
              Password
            </span>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14 }}
            />
          </label>

          {error && (
            <div style={{ padding: 12, background: "#fee", border: "1px solid #fcc", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "#c00" }}>
              {error}
            </div>
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

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#666" }}>
          Don't have an account?{" "}
          <Link href="/signup" style={{ color: "#006947", fontWeight: 600, textDecoration: "underline" }}>
            Sign up
          </Link>
        </p>

        <p style={{ textAlign: "center", marginTop: 12, fontSize: 13 }}>
          <Link href="/reset-password" style={{ color: "#666", textDecoration: "underline" }}>
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  );
}
