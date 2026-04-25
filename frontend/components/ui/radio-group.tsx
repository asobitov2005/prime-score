"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type RadioGroupContextValue = {
  name: string;
  value?: string;
  onValueChange?: (value: string) => void;
};

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

type RadioGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: string;
  onValueChange?: (value: string) => void;
  name?: string;
};

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, name, ...props }, ref) => {
    const generatedName = React.useId();

    return (
      <RadioGroupContext.Provider value={{ name: name ?? generatedName, value, onValueChange }}>
        <div ref={ref} role="radiogroup" className={cn("grid gap-2", className)} {...props} />
      </RadioGroupContext.Provider>
    );
  }
);
RadioGroup.displayName = "RadioGroup";

type RadioGroupItemProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
  value: string;
};

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext);

    return (
      <input
        {...props}
        ref={ref}
        type="radio"
        name={context?.name}
        value={value}
        checked={context?.value === value}
        onChange={() => context?.onValueChange?.(value)}
        className={cn("h-4 w-4 rounded-full border border-primary text-primary accent-current", className)}
      />
    );
  }
);
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };
