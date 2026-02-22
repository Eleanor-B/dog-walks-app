"use client";

import { useRef, useEffect, useState } from "react";

/** Chroma key removes cyan background; keeps dog with solid white fill.
 *  Uses canvas to process each frame - works on all browsers including mobile Safari. */
export default function ChromaKeyVideo({
  src,
  className,
  width,
  height,
  "aria-label": ariaLabel,
}: {
  src: string;
  className?: string;
  width?: number;
  height?: number;
  "aria-label"?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const onLoadedMetadata = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w > 0 && h > 0) {
        canvas.width = w;
        canvas.height = h;
        setDimensions({ w, h });
      }
    };

    let rafId: number;
    const drawFrame = () => {
      if (video.readyState < 2 || canvas.width === 0) {
        rafId = requestAnimationFrame(drawFrame);
        return;
      }
      ctx.drawImage(video, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Key out cyan: low R, high G, high B (tolerance for slight variations)
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Cyan-ish: R very low, G and B high
        if (r < 80 && g > 180 && b > 180) {
          data[i + 3] = 0; // transparent
        }
      }
      ctx.putImageData(imgData, 0, 0);
      rafId = requestAnimationFrame(drawFrame);
    };

    const tryPlay = () => {
      video.play().catch(() => {});
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("canplay", tryPlay);
    if (video.readyState >= 1) onLoadedMetadata();
    tryPlay();
    rafId = requestAnimationFrame(drawFrame);

    return () => {
      video.removeEventListener("canplay", tryPlay);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      cancelAnimationFrame(rafId);
    };
  }, [src]);

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        style={{
          position: "absolute",
          width: "max(1px, 100%)",
          height: "max(1px, 100%)",
          left: -9999,
          top: 0,
          opacity: 0.0001,
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />
      <canvas
        ref={canvasRef}
        width={dimensions.w}
        height={dimensions.h}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
        aria-label={ariaLabel}
        role="img"
      />
    </div>
  );
}
