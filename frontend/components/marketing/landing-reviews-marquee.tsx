"use client";

import { useEffect, useRef, useState } from "react";
import type { ReviewItem } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function LandingReviewsMarquee({ reviews }: { reviews: ReviewItem[] }) {
  const [isVisible, setIsVisible] = useState(false);
  const reviewsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    if (reviewsRef.current) {
      observer.observe(reviewsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={reviewsRef}
      className={cn("relative h-[600px] overflow-hidden", isVisible ? "opacity-100" : "opacity-0 transition-opacity duration-1000")}
      style={{
        maskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full px-2">
        <div className={cn("flex flex-col gap-6", isVisible && "animate-marquee-down hover:[animation-play-state:paused]")}>
          {[...reviews, ...reviews].map((review, index) => (
            <ReviewCard key={`col1-${index}`} review={review} />
          ))}
        </div>

        <div className={cn("hidden md:flex flex-col gap-6", isVisible && "animate-marquee-up hover:[animation-play-state:paused]")}>
          {[...reviews].reverse().concat([...reviews].reverse()).map((review, index) => (
            <ReviewCard key={`col2-${index}`} review={review} />
          ))}
        </div>

        <div className={cn("hidden md:flex flex-col gap-6", isVisible && "animate-marquee-down hover:[animation-play-state:paused]")}>
          {[...reviews.slice(3), ...reviews.slice(0, 3), ...reviews.slice(3), ...reviews.slice(0, 3)].map((review, index) => (
            <ReviewCard key={`col3-${index}`} review={review} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewItem }) {
  return (
    <div className="group relative p-6 rounded-[2rem] bg-card/40 border border-border/50 hover:border-primary/40 hover:-translate-y-1 transition-[transform,box-shadow,border-color] duration-200 flex flex-col justify-between gap-6 shadow-sm hover:shadow-[0_0_40px_rgba(255,107,0,0.1)] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="space-y-4 relative z-10">
        <svg className="h-6 w-6 text-primary/40 group-hover:text-primary transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
        </svg>
        <p className="text-sm font-medium text-muted-foreground leading-relaxed italic group-hover:text-foreground/90 transition-colors">&quot;{review.text}&quot;</p>
      </div>
      <div className="flex items-center gap-3 pt-2 border-t border-border/40 relative z-10">
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shadow-inner ring-2 ring-background group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
          {review.name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{review.name}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-500">Band {review.band}</p>
        </div>
      </div>
    </div>
  );
}
