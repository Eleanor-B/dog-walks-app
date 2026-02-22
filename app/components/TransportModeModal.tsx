"use client";

import { X, Footprints, Car, Train } from "@phosphor-icons/react";

export type TransportMode = "walking" | "driving" | "transit";

type Props = {
  onSelect: (mode: TransportMode) => void;
  onClose: () => void;
  /** When set, shows login prompt instead of transport options */
  showLoginPrompt?: boolean;
  parkName?: string;
  onLogin?: () => void;
  onSignup?: () => void;
};

export default function TransportModeModal({
  onSelect,
  onClose,
  showLoginPrompt = false,
  parkName = "",
  onLogin,
  onSignup,
}: Props) {
  return (
    <>
      <div
        className="drawer-overlay"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="transport-modal"
        role="dialog"
        aria-labelledby="transport-modal-title"
        aria-modal="true"
        data-transport-modal="v2"
      >
        <div className="transport-modal-header">
          <h3 id="transport-modal-title">
            How are you getting there?
          </h3>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={24} weight="bold" />
          </button>
        </div>
        {showLoginPrompt ? (
          <div className="transport-modal-login-prompt">
            <p>
              Please sign in to get directions{parkName ? ` to ${parkName}` : ""}.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={onLogin}
              >
                Log in
              </button>
              <button
                className="btn-primary"
                onClick={onSignup}
              >
                Sign up free
              </button>
            </div>
          </div>
        ) : (
          <div className="transport-options">
            <button
              type="button"
              className="transport-option"
              onClick={() => onSelect("walking")}
            >
              <Footprints size={32} weight="regular" />
              <span>Walking</span>
            </button>
            <button
              type="button"
              className="transport-option"
              onClick={() => onSelect("driving")}
            >
              <Car size={32} weight="regular" />
              <span>Driving</span>
            </button>
            <button
              type="button"
              className="transport-option"
              onClick={() => onSelect("transit")}
            >
              <Train size={32} weight="regular" />
              <span>Public transport</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
