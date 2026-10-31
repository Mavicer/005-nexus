"use client";

import { preload } from "react-dom";

// Next supports resource hints in SSR-rendered Client Components, rather than
// calls made directly in a Server Component's RSC render.
export function ImagePreloadHint({ src }: { src: string }) {
  preload(src, { as: "image", fetchPriority: "low" });
  return null;
}
