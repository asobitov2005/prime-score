"use client";

export async function copyTextToClipboard(value: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall back to execCommand for browsers or contexts that block Clipboard API.
    }
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard API unavailable");
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  input.style.pointerEvents = "none";
  document.body.appendChild(input);
  input.focus();
  input.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(input);

  if (!copied) {
    throw new Error("Copy command failed");
  }
}
