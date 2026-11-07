import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        deep: "#05070B",
        base: "#0B0F16",
        panel: "#10141D",
        glass: {
          // Liquid crystal effect: darker fill with a hint of white sheen, stronger borders
          fill: "rgba(20, 20, 20, 0.4)",
          strong: "rgba(20, 20, 20, 0.6)",
          border: "rgba(255, 255, 255, 0.15)",
          borderStrong: "rgba(255, 255, 255, 0.3)",
        },
        ink: {
          DEFAULT: "#FFFFFF",
          soft: "rgba(255, 255, 255, 0.7)",
          faint: "rgba(255, 255, 255, 0.4)",
        },
        accent: {
          DEFAULT: "#E8A855",
          soft: "rgba(232,168,85,0.16)",
          ring: "rgba(232,168,85,0.45)",
        },
        ambient: {
          violet: "#6C7BD8",
          cyan: "#4FB8C9",
        },
        danger: "#E5677A",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      backdropBlur: {
        xs: "2px",
        '2xl': "40px",
        '3xl': "64px",
      },
      boxShadow: {
        glass: "0 10px 40px -10px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -1px 1px rgba(255,255,255,0.02)",
        "glass-lg": "0 24px 64px -12px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.2), inset 0 -1px 1px rgba(255,255,255,0.05)",
        glow: "0 0 0 1px rgba(232,168,85,0.35), 0 0 24px rgba(232,168,85,0.25)",
      },
      borderRadius: {
        xl2: "1.5rem",   // 24px
        xl3: "2rem",     // 32px
        '4xl': "2.5rem", // 40px
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.6" },
          "70%": { transform: "scale(1.4)", opacity: "0" },
          "100%": { transform: "scale(1.4)", opacity: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.4,0,0.6,1) infinite",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
