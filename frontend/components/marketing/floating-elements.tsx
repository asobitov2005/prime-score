"use client";

import { useEffect, useState } from "react";

export function FloatingElements() {
  const [elements, setElements] = useState<{ id: number; size: number; x: number; y: number; duration: number; delay: number }[]>([]);

  useEffect(() => {
    // Client-side only generation to avoid hydration mismatch
    const newElements = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      size: Math.random() * 40 + 20,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 5,
    }));
    setElements(newElements);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {elements.map((el) => (
        <div
          key={el.id}
          className="absolute rounded-full"
          style={{
            width: el.size,
            height: el.size,
            left: `${el.x}%`,
            top: `${el.y}%`,
            background: "radial-gradient(circle at center, hsl(var(--primary) / 0.15) 0%, transparent 70%)",
            willChange: "transform", // GPU optimization
            animation: `float-element ${el.duration}s linear infinite`,
            animationDelay: `${el.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
