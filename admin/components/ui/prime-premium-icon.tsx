import { Gem } from "lucide-react";
import { cn } from "@/lib/utils";

export function PrimePremiumIcon({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex aspect-square items-center justify-center", className)}>
      {/* Subtle Glow Effect */}
      <div className="absolute inset-0 rounded-full blur-[4px] bg-current opacity-30" />
      
      {/* Crisp Outline */}
      <Gem className="relative z-10 w-full h-full text-inherit" strokeWidth={2.2} />
      
      {/* Translucent Solid Fill for Premium Feel */}
      <Gem className="absolute inset-0 z-0 w-full h-full text-inherit opacity-[0.35] fill-current" />
    </div>
  );
}
