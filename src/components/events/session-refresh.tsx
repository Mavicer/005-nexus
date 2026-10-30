"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function SessionRefresh() {
  const router = useRouter();
  useEffect(() => {
    let refreshedAt = Date.now();
    const refresh = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - refreshedAt > 3000
      ) {
        refreshedAt = Date.now();
        router.refresh();
      }
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [router]);
  return null;
}
