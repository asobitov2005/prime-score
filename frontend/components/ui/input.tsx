import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  className,
  spellCheck = false,
  autoCorrect = "off",
  autoCapitalize = "none",
  ...props
}, ref) => {
  return (
    <input
      ref={ref}
      spellCheck={spellCheck}
      autoCorrect={autoCorrect}
      autoCapitalize={autoCapitalize}
      className={cn(
        "flex h-11 w-full rounded-md border border-border bg-background px-4 text-sm outline-none transition focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";
