"use client";

import { useState, type ReactNode } from "react";
import { initials } from "@/lib/format";

/**
 * A person's avatar: their Google profile picture (`profiles.avatar_url`) on their colored circle,
 * falling back to initials when there's no picture or it fails to load.
 */
export function Avatar({
  name,
  url,
  color,
  className = "av",
  title,
  decorative,
  children,
}: {
  name: string;
  url?: string | null;
  color?: string;
  className?: string;
  title?: string;
  /** Hide from screen readers when the name is already said next to it. */
  decorative?: boolean;
  children?: ReactNode;
}) {
  // Remember which URL failed, so a new URL (say, after a profile refresh) gets a fresh try.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImg = !!url && url !== failedUrl;
  return (
    <span
      className={className || undefined}
      style={color ? { background: color } : undefined}
      title={title}
      aria-hidden={decorative || undefined}
    >
      {showImg ? (
        // Google's image host can refuse requests that carry a referrer, so send none.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" referrerPolicy="no-referrer" decoding="async" onError={() => setFailedUrl(url)} />
      ) : (
        initials(name)
      )}
      {children}
    </span>
  );
}
