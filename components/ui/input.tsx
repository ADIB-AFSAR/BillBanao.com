import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, invalid, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border bg-paper-raised px-3 py-2 text-sm text-ink placeholder:text-slate/60 transition-colors",
          "border-paper-line-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/40 focus-visible:border-amber",
          "disabled:cursor-not-allowed disabled:opacity-50",
          invalid && "border-brick focus-visible:ring-brick/30 focus-visible:border-brick",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
