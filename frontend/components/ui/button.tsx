import { cloneElement, forwardRef, isValidElement } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive" | "link";
type ButtonSize = "sm" | "default" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground dark:text-slate-950 shadow-sm hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "border border-border bg-background hover:bg-accent hover:text-accent-foreground",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  link: "text-primary underline-offset-4 hover:underline"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 rounded-md px-3 text-sm",
  default: "h-11 rounded-md px-4",
  lg: "h-12 rounded-md px-6 text-base"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild, type = "button", children, ...props }, ref) => {
    const classes = cn(
      "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
      variant !== "link" && "shadow-sm",
      variantClasses[variant],
      sizeClasses[size],
      className
    );

    if (asChild && isValidElement(children)) {
      return cloneElement(children, {
        className: cn(classes, children.props.className),
        ...props
      });
    }

    return (
      <button ref={ref} className={classes} type={type} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
