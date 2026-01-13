"use client";

export default function WelcomeMessage({ firstName }: { firstName: string }) {
  return (
    <p style={{
      fontSize: 15,
      color: "#666",
      margin: "8px 0 0 0",
      fontWeight: 400,
      fontFamily: "var(--font-dm-sans), sans-serif"
    }}>
      Welcome back {firstName}, where do you want to walk today?
    </p>
  );
}
