"use client";

import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEffect, useState, type ReactNode } from "react";

interface DialogProps {
  open: boolean;
  title: string;
  description?: string;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, title, description, onOpenChange, children, className }: DialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-card/55 p-4 backdrop-blur-sm">
      <button aria-label="Close dialog" className="absolute inset-0" onClick={() => onOpenChange(false)} type="button" />
      <Card className={cn("relative z-10 w-full max-w-3xl overflow-hidden", className)}>
        <div className="flex items-start justify-between gap-4 border-b border-border/70 px-6 py-5">
          <div className="space-y-1">
            <h2 className=" text-2xl font-semibold">{title}</h2>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </Card>
    </div>,
    document.body
  );
}
