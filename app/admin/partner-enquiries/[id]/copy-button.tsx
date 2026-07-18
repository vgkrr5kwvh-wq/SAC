"use client";

import { useEffect, useRef, useState } from "react";

type CopyButtonProps = {
  label: string;
  value?: string;
};

export default function CopyButton({ label, value }: CopyButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  function scheduleReset() {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setStatus("idle"), 2_000);
  }

  async function copyValue() {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }

    scheduleReset();
  }

  const buttonLabel =
    status === "copied"
      ? "Copied!"
      : status === "failed"
        ? "Copy failed"
        : label;

  return (
    <button
      className="button secondary admin-copy-button"
      type="button"
      disabled={!value}
      onClick={copyValue}
      aria-live="polite"
    >
      {buttonLabel}
    </button>
  );
}
