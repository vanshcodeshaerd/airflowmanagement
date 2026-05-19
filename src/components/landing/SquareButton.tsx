import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  "inline-flex items-center justify-center font-ui font-bold uppercase tracking-wider text-sm transition-all duration-300 rounded-none cursor-pointer";

const styles: Record<Variant, string> = {
  primary:
    "bg-accent text-white px-9 py-3.5 hover:bg-accent-strong hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,153,216,0.3)]",
  outline:
    "bg-transparent border-2 border-accent text-accent px-8 py-3 hover:bg-sky-soft hover:border-accent-strong",
};

export const SquareButton = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", className = "", ...props }, ref) => (
    <button ref={ref} className={`${base} ${styles[variant]} ${className}`} {...props} />
  ),
);
SquareButton.displayName = "SquareButton";
