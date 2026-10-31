"use client";

import Link from "next/link";
import type { ReactNode } from "react";

const warmed = new Set<string>();
function warmImage(src?: string) {
  if (!src || warmed.has(src)) return;
  warmed.add(src);
  const image = new window.Image();
  image.src = src;
  // Keep decoding off the navigation path; retry if the speculative request fails.
  void image.decode().catch(() => warmed.delete(src));
}

export function DetailLink({
  slug,
  imageSrc,
  children,
}: {
  slug: string;
  imageSrc?: string;
  children: ReactNode;
}) {
  return (
    <Link
      prefetch={true}
      href={`/events/${slug}`}
      onPointerEnter={() => warmImage(imageSrc)}
      onFocus={() => warmImage(imageSrc)}
      onTouchStart={() => warmImage(imageSrc)}
    >
      {children}
    </Link>
  );
}
