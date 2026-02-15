"use client";

import { CaretLeft } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import AppFooter from "../components/AppFooter";

export default function PrivacyPolicy() {
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

          <h1>Privacy Policy</h1>

          <p className="content-muted margin-bottom-xl">
            Last updated: January 2026
          </p>

          <div className="content-body">
            <p>
              Eleanor Broderick trading as Go Walk The Dog (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our website and services.
            </p>

            <h2>Data Controller</h2>
            <p>
              Eleanor Broderick trading as Go Walk The Dog.
            </p>

            <h2>Data Controller Address</h2>
            <p>
              56 Nutfield Road, London SE22 9DG
            </p>

            <h2>Information We Collect</h2>
            <p>
              When you create an account, we collect your email address and first name. When you add a dog-walking space, we store the location data you provide. We also collect usage data via Google Analytics to improve the app experience.
            </p>

            <h2>How We Use Your Information</h2>
            <p>
              We use your information to provide and maintain the service, to allow you to save favourite spaces and contribute new ones, and to communicate with you about your account. We do not sell your personal information to third parties.
            </p>

            <h2>Legal Basis for Processing</h2>
            <p>
              We process your account data (name and email) on the basis of contract — it is necessary to provide the service. We process analytics data on the basis of your consent, which you can withdraw at any time.
            </p>

            <h2>Data Retention</h2>
            <p>
              We retain your personal data for as long as your account is active. If you delete your account, your personal data is removed within 30 days. Analytics data is retained for 26 months.
            </p>

            <h2>Cookies</h2>
            <p>
              We use essential cookies to keep you logged in and Google Analytics cookies to understand how people use the app. You can manage your cookie preferences at any time. See our{" "}
              <a href="/cookie-policy">Cookie Policy</a>{" "}
              for more details.
            </p>

            <h2>Your Rights (UK GDPR)</h2>
            <p>
              You have the right to access, correct, or delete your personal data at any time. You can delete your account from your account settings. If you have questions about your data, please{" "}
              <a href="/contact">contact us</a>.
            </p>
            <p>
              You have the right to lodge a complaint with the UK&apos;s data protection authority, the Information Commissioner&apos;s Office (ICO), at{" "}
              <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>.
            </p>

            <h2>Data Storage</h2>
            <p>
              Your data is stored securely using Supabase, which provides enterprise-grade encryption and security. Passwords are hashed and never stored in plain text.
            </p>

            <h2>Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. We will notify you of any significant changes by posting a notice on the app.
            </p>

            <h2>Contact</h2>
            <p>
              If you have any questions about this Privacy Policy, please{" "}
              <a href="/contact">get in touch</a>.
            </p>
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
