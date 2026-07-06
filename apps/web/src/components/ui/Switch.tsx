export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
        checked ? "bg-brand" : "border border-border/15 bg-surface-raised"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full transition ${
          checked ? "translate-x-6 bg-bg" : "translate-x-1 bg-ink-muted"
        }`}
      />
    </button>
  );
}
