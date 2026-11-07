"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Wraps ONLY the page slot, never the root layout. If AnimatePresence sat
 * higher up (around the whole <body>), every route transition would briefly
 * unmount persistent chrome too, and Next would fight us on Cumulative
 * Layout Shift. `min-h-dvh` gives the browser a layout box to commit to
 * before the fade-in even starts, so nothing jumps.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-dvh"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
