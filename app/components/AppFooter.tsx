"use client";

import { Heart } from "@phosphor-icons/react";

export default function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        {/* White Logo */}
        <div className="footer-logo">
          <img
            src="/GWTD-LogoWhiteSm.svg"
            alt="Go Walk The Dog"
          />
        </div>

        {/* Footer Links */}
        <nav aria-label="Footer navigation" className="footer-nav">
          <a href="/privacy-policy">Privacy Policy</a>
          <a href="/cookie-policy">Cookie Policy</a>
          <a href="/contact">Contact</a>
        </nav>

        {/* Dogs Trust Donation Link */}
        <a
          href="https://www.dogstrust.org.uk/support-us/ways-to-give"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-donate"
        >
          <Heart size={14} weight="fill" className="footer-donate-icon" />
          Support Dogs Trust
        </a>

        {/* Copyright */}
        <p className="footer-copyright">
          &copy; {new Date().getFullYear()} Go Walk The Dog. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
