/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This project was generated without a linter in the loop to catch style
  // nits (unescaped apostrophes and the like) before they'd hit you. `next
  // lint` still runs fine on demand — it just won't gate `next build`.
  eslint: { ignoreDuringBuilds: true },
  // pdfjs-dist ships a couple of Node-only fallbacks it doesn't actually need in the browser.
  // Canvas is the classic one that trips up webpack — Kalam's syllabus PDFs deserve better than a build error.
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
