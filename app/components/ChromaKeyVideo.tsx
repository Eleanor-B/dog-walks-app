"use client";

import { useRef, useEffect, useState } from "react";

/** Chroma key removes cyan background; keeps dog with solid white fill.
 *  Uses canvas to process each frame.
 *  Safari-safe: handles iOS autoplay restrictions, cross-origin canvas,
 *  and widened colour tolerance for mobile GPU colour shift. */
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
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Safari requires willReadFrequently hint for canvas pixel access performance
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let rafId: number;
    let playing = false;

    const setCanvasSize = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w > 0 && h > 0) {
        canvas.width = w;
        canvas.height = h;
        setDimensions({ w, h });
      }
    };

    const drawFrame = () => {
      // Wait until video has actual pixel data (readyState 4 = HAVE_ENOUGH_DATA)
      // Safari needs readyState >= 3, but >= 4 is safest for getImageData
      if (!playing || video.readyState < 3 || canvas.width === 0) {
        rafId = requestAnimationFrame(drawFrame);
        return;
      }

      try {
        ctx.drawImage(video, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Widened cyan tolerance to handle iOS GPU YUV colour shift.
        // Original: r < 80, g > 180, b > 180
        // Mobile Safari YUV can push R up to ~120 and drop G/B to ~160
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Primary cyan key: low red, high green and blue
          if (r < 120 && g > 160 && b > 160 && g > r + 60 && b > r + 60) {
            data[i + 3] = 0; // fully transparent

          // Soft edge: semi-transparent for pixels on the border
          } else if (r < 150 && g > 140 && b > 140 && g > r + 40 && b > r + 40) {
            // Blend based on how cyan-ish it is - creates smoother edge
            const cyanAmount = Math.min(1, ((g - r) + (b - r)) / 160);
            data[i + 3] = Math.round((1 - cyanAmount) * 255);
          }
        }

        ctx.putImageData(imgData, 0, 0);
      } catch {
        // getImageData can throw on Safari if video isn't truly ready yet
        // Just skip this frame and try again
      }

      rafId = requestAnimationFrame(drawFrame);
    };

    const onLoadedMetadata = () => {
      setCanvasSize();
    };

    const onCanPlay = () => {
      setCanvasSize();
      // Safari needs an explicit play() call triggered by a readiness event
      video.play().then(() => {
        playing = true;
        setVideoReady(true);
      }).catch(() => {
        // If autoplay is blocked, try once more after a short delay
        setTimeout(() => {
          video.play().then(() => {
            playing = true;
            setVideoReady(true);
          }).catch(() => {});
        }, 300);
      });
    };

    const onPlaying = () => {
      // Belt-and-braces: mark as playing when the browser confirms it
      playing = true;
      setVideoReady(true);
      setCanvasSize();
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("playing", onPlaying);

    // If video is already loaded (e.g. cached), trigger manually
    if (video.readyState >= 3) {
      setCanvasSize();
      video.play().then(() => {
        playing = true;
        setVideoReady(true);
      }).catch(() => {});
    }

    // Start the draw loop regardless — it'll wait internally until ready
    rafId = requestAnimationFrame(drawFrame);

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("playing", onPlaying);
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
        // Safari requires crossOrigin for canvas getImageData to work
        crossOrigin="anonymous"
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
          // Hide canvas until video is actually playing to avoid flash of empty canvas
          opacity: videoReady ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
        aria-label={ariaLabel}
        role="img"
      />
    </div>
  );
}
