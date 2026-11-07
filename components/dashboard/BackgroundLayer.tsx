"use client";

import { useEffect } from "react";
import { useBackgroundStore } from "@/store/useBackgroundStore";

export function BackgroundLayer() {
  const { currentUrl, dimOpacity, blurAmount, hydrate } = useBackgroundStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-20 overflow-hidden pointer-events-none select-none transition-all duration-700"
    >
      {/* Background Image Layer */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-out"
        style={{
          backgroundImage: `url("${currentUrl}")`,
          filter: blurAmount > 0 ? `blur(${blurAmount}px)` : undefined,
          transform: blurAmount > 0 ? "scale(1.04)" : "scale(1)",
        }}
      />

      {/* Dimming & Vignette Glassy Overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          backgroundColor: `rgba(5, 7, 11, ${dimOpacity / 100})`,
        }}
      />

      {/* Subtle Radial Vignette for spatial focus */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.65)_100%)] pointer-events-none" />
    </div>
  );
}
