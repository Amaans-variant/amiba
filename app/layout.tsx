import type { Metadata } from "next";
import { Space_Grotesk, Manrope } from "next/font/google";
import { MotionProvider } from "@/components/providers/MotionProvider";
import { BackgroundLayer } from "@/components/dashboard/BackgroundLayer";
import "./globals.css";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Manrope({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: "Study Dashboard",
  description: "A spatial, glassy productivity dashboard for focused studying.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-sans antialiased relative min-h-screen">
        <BackgroundLayer />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
