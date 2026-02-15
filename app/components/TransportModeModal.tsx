"use client";

import { X, Footprints, Car, Train } from "@phosphor-icons/react";

export type TransportMode = "walking" | "driving" | "transit";

type Props = {
  onSelect: (mode: TransportMode) => void;
  onClose: () => void;
};

// Figma design tokens from Design-playground
const tokens = {
  textPrimary: "#105A42",
  primaryForest: "#036908",
  white: "#FFFFFF",
  chipBg: "#FBFBFB",
  secondaryBorderAcc: "#CDE0D9",
  borderRadiusMd: 8,
  spacing7: 16,
  spacing8: 20,
  spacing9: 24,
};

export default function TransportModeModal({ onSelect, onClose }: Props) {
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
      </div>
    </>
  );
}
