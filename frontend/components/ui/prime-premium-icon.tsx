import Image from "next/image";
import { cn } from "@/lib/utils";

export function PrimePremiumIcon({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex aspect-square items-center justify-center", className)}>
      <div className="absolute inset-[12%] rounded-full bg-current opacity-5 blur-[2px]" />
      <Image
        src="/icons/premium-quality-9967681.png"
        alt=""
        aria-hidden="true"
        width={64}
        height={64}
        className="relative z-10 h-full w-full object-contain drop-shadow-[0_2px_4px_rgba(15,23,42,0.12)]"
      />
    </div>
  );
}
