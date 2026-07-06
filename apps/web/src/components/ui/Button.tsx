import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-brand text-bg shadow-glow hover:bg-brand-hover",
  secondary: "border border-border/15 bg-surface text-ink hover:bg-surface-raised",
  ghost: "text-ink-muted hover:text-ink",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

/** Shared class builder so non-<button> elements (e.g. <Link>) can match exactly. */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = "",
): string {
  return `rounded-md font-medium transition disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = "primary", size = "md", className = "", ...props }: Props) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}
