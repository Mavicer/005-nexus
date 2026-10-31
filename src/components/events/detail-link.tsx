"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { observeEventImage, warmEventImage } from "./image-preload";

export function DetailLink({
  slug,
  imageSrc,
  children,
}: {
  slug: string;
  imageSrc?: string;
  children: ReactNode;
}) {
  const link = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (!imageSrc || !link.current) return;
    return observeEventImage(
      link.current.closest(".event-card") ?? link.current,
      imageSrc,
    );
  }, [imageSrc]);
  return (
    <Link
      ref={link}
      prefetch={true}
      href={`/events/${slug}`}
      onPointerEnter={() => warmEventImage(imageSrc, true)}
      onPointerDown={() => warmEventImage(imageSrc, true)}
      onFocus={() => warmEventImage(imageSrc, true)}
      onTouchStart={() => warmEventImage(imageSrc, true)}
    >
      {children}
    </Link>
  );
}
