"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function FloatingElements() {
  const [elements, setElements] = useState<{ id: number; size: number; x: number; y: number; duration: number; delay: number }[]>([]);

  useEffect(() => {
    // Client-side only generation to avoid hydration mismatch
    const newElements = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      size: Math.random() * 40 + 10,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
    }));
    setElements(newElements);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {elements.map((el) => (
        <motion.div
          key={el.id}
          className="absolute rounded-full bg-primary/10 blur-2xl"
          style={{
            width: el.size,
            height: el.size,
            left: `${el.x}%`,
            top: `${el.y}%`,
          }}
          animate={{
            y: [0, -150, 0],
            x: [0, 80, 0],
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.4, 0.1],
          }}
          transition={{
            duration: el.duration,
            repeat: Infinity,
            delay: el.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
