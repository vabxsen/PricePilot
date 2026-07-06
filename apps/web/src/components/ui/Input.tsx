import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-md border border-border/15 bg-surface px-4 py-3 text-ink outline-none transition placeholder:text-ink-faint focus:border-brand ${className}`}
      {...props}
    />
  );
}

export function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full resize-none rounded-md border border-border/15 bg-surface px-4 py-3 text-ink outline-none transition placeholder:text-ink-faint focus:border-brand ${className}`}
      {...props}
    />
  );
}
