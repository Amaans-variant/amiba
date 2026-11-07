"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { BackgroundPickerModal } from "./BackgroundPickerModal";

export function BackgroundPickerButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="glass-chip flex items-center gap-1.5 transition-colors hover:border-glass-borderStrong hover:text-ink cursor-pointer"
        title="Customize background art and atmosphere"
      >
        <ImageIcon className="h-3.5 w-3.5 text-accent" />
        <span className="text-xs font-medium">Background Art</span>
      </button>

      <BackgroundPickerModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
