import { useState } from "react";

/**
 * Shows the user's Google account profile picture when available, falling
 * back to an initial-letter circle otherwise (email/password accounts have
 * no photo, or the image URL fails to load). `className` should carry both
 * sizing (h-8 w-8, rounded-full) and the fallback's bg/text colors — the
 * extra color classes are harmless no-ops on the <img>.
 */
export function Avatar({
  photoUrl,
  fallbackText,
  className = "",
}: {
  photoUrl?: string | null;
  fallbackText: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (photoUrl && !failed) {
    return (
      <img
        src={photoUrl}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`shrink-0 object-cover ${className}`}
      />
    );
  }

  return <div className={`grid shrink-0 place-items-center ${className}`}>{fallbackText}</div>;
}
