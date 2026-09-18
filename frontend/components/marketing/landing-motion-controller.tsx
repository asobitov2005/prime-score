"use client";

import { useEffect } from "react";
import { setupLandingMotion } from "@/lib/landing-motion";

export function LandingMotionController() {
  useEffect(() => {
    const root = document.getElementById("landing");
    if (root) return setupLandingMotion(root);
  }, []);
  return null;
}
