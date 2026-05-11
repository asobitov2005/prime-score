import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  // Test comment: frontend utility merge helper.
  return twMerge(clsx(inputs));
}
