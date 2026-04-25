"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { emitNavigationStart } from "@/lib/navigation-transition";

interface FilterSelectProps {
  activeType: string;
  activeFormat: string;
  activeSource: string;
}

const options = [
  { id: "", label: "All Materials" },
  { id: "cambridge", label: "Cambridge Official" },
  { id: "real_exam", label: "Real Exam Recent Tests" },
  { id: "custom", label: "Custom Tests" },
];

export function FilterSelect({ activeType, activeFormat, activeSource }: FilterSelectProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.id === activeSource) || options[0];

  const handleSelect = (id: string) => {
    const url = `/tests?type=${activeType}&format=${activeFormat}${id ? `&source=${id}` : ""}`;
    emitNavigationStart(url);
    router.push(url);
    setIsOpen(false);
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full sm:w-[220px]" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 w-full h-11 px-4 rounded-xl border transition-all duration-300 text-left outline-none",
          isOpen 
            ? "bg-background border-slate-400 dark:border-slate-600 ring-4 ring-slate-400/10 dark:ring-slate-600/10 shadow-md" 
            : "bg-card/40 border-border/60 hover:border-slate-400/50 hover:bg-card shadow-sm",
          activeSource !== "" && !isOpen && "border-slate-500/30 bg-slate-500/5"
        )}
      >
        <SlidersHorizontal className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          activeSource !== "" || isOpen ? "text-slate-700 dark:text-slate-300" : "text-muted-foreground/60"
        )} />
        
        <span className={cn(
          "flex-1 text-[13px] font-bold truncate",
          activeSource !== "" ? "text-foreground" : "text-muted-foreground"
        )}>
          {selectedOption.label}
        </span>

        <ChevronDown className={cn(
          "h-4 w-4 shrink-0 transition-transform duration-300 text-muted-foreground/40",
          isOpen && "rotate-180 text-slate-700 dark:text-slate-300"
        )} />
      </button>

      {/* Custom Dropdown Menu */}
      <div className={cn(
        "absolute top-[calc(100%+8px)] right-0 w-full min-w-[240px] p-1.5 bg-card border border-border shadow-2xl shadow-black/10 rounded-2xl z-[100] transition-all duration-200 origin-top-right",
        isOpen 
          ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" 
          : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
      )}>
        <div className="space-y-0.5">
          {options.map((option) => {
            const isSelected = activeSource === option.id;
            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                className={cn(
                  "flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all group",
                  isSelected 
                    ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span>{option.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                {!isSelected && <div className="h-3.5 w-3.5 opacity-0 group-hover:opacity-20 transition-opacity"><Check className="h-3.5 w-3.5" /></div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
