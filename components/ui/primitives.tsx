import * as React from "react";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-sm font-medium text-ink-2 mb-1.5 block", className)}
      {...props}
    />
  )
);
Label.displayName = "Label";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-paper-line-2 bg-paper-raised px-3 py-2 text-sm text-ink placeholder:text-slate/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/40 focus-visible:border-amber",
        "disabled:cursor-not-allowed disabled:opacity-50",
        invalid && "border-brick focus-visible:ring-brick/30 focus-visible:border-brick",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-paper-line-2 bg-paper-raised px-3 py-2 text-sm text-ink",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/40 focus-visible:border-amber",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-paper-line bg-paper-raised shadow-[0_1px_2px_rgba(20,33,61,0.06)]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4 border-b border-paper-line", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-semibold text-ink text-base", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-slate mt-0.5", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4 border-t border-paper-line", className)} {...props} />;
}

const badgeVariants: Record<string, string> = {
  default: "bg-paper-line/70 text-ink-2",
  amber: "bg-amber/15 text-amber-dark",
  moss: "bg-moss-bg text-moss",
  brick: "bg-brick-bg text-brick",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof badgeVariants }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}
