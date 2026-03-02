"use client";

import { Heart } from "@phosphor-icons/react";

type AppFooterProps = { showDonateStrip?: boolean };

export default function AppFooter({ showDonateStrip = true }: AppFooterProps) {
  return (
    <>
      {showDonateStrip && (
        <div className="footer-donate-strip">
          <div className="footer-donate-strip-inner">
            <p className="footer-donate-intro">
              Love dogs? Donate to Dogs Trust.*
            </p>
            <a
              href="https://www.dogstrust.org.uk/support-us/ways-to-give"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-donate"
            >
              <Heart size={14} weight="fill" className="footer-donate-icon footer-donate-heart" />
              Support Dogs Trust
            </a>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <div className="footer-inner">
          {/* Footer Links */}
        <nav aria-label="Footer navigation" className="footer-nav">
          <a href="/privacy-policy">Privacy Policy</a>
          <a href="/cookie-policy">Cookie Policy</a>
          <a href="/contact">Contact</a>
        </nav>

        {/* Disclaimer + Copyright */}
        <p className="footer-disclaimer">
          *Not affiliated with Dogs Trust.
        </p>
        <p className="footer-copyright">
          &copy; {new Date().getFullYear()} Go Walk The Dog. All rights reserved.
        </p>
        </div>
      </footer>
    </>
  );
}
