"use client";
import { useEffect } from "react";
import {
  appearanceSnapshot,
  effectiveTheme,
  presetPaths,
  type AppearanceSnapshot,
} from "@/modules/events/appearance";
const properties = [
  "--synced-wallpaper",
  "--synced-brightness",
  "--synced-blur",
  "--synced-card-opacity",
  "--font-scale",
];
export function BlogAppearanceSync({
  origin,
  initial = null,
}: {
  origin: string;
  initial?: AppearanceSnapshot | null;
}) {
  const initialKey = JSON.stringify(initial);
  useEffect(() => {
    const initial = JSON.parse(initialKey) as AppearanceSnapshot | null;
    const root = document.documentElement;
    const bridgeOrigin = new URL(origin).origin;
    const frame = document.createElement("iframe");
    frame.hidden = true;
    frame.tabIndex = -1;
    frame.setAttribute("aria-hidden", "true");
    frame.title = "博客外观同步";
    frame.src = bridgeOrigin + "/appearance-bridge";
    const nonce = crypto.randomUUID();
    let current: AppearanceSnapshot | null = initial;
    let urls: { light?: string; dark?: string } = {};
    let timer: ReturnType<typeof setTimeout> | undefined;
    let raf = 0;
    function reset() {
      properties.forEach((p) => root.style.removeProperty(p));
      delete root.dataset.blogTheme;
      delete root.dataset.blogAppearance;
    }
    function paint() {
      if (timer) clearTimeout(timer);
      if (!current?.configured || !current.settings) {
        reset();
        return;
      }
      const settings = current.settings,
        mode = effectiveTheme(current.theme);
      const custom =
        settings.background === "custom"
          ? (urls[mode] ?? urls.light ?? urls.dark)
          : undefined;
      const preset =
        presetPaths[
          settings.background === "custom" ? "default" : settings.background
        ];
      const wallpaper = custom ?? new URL(preset[mode], bridgeOrigin).href;
      const blur = Math.max(
        settings.blur,
        settings.scrollBlur && window.scrollY >= window.innerHeight * 0.5
          ? 15
          : 0,
      );
      root.dataset.blogAppearance = "synced";
      root.dataset.blogTheme = mode;
      root.style.setProperty("--synced-wallpaper", `url("${wallpaper}")`);
      root.style.setProperty(
        "--synced-brightness",
        String(settings.brightness / 100),
      );
      root.style.setProperty("--synced-blur", blur + "px");
      root.style.setProperty(
        "--synced-card-opacity",
        String(settings.cardOpacity / 100),
      );
      root.style.setProperty("--font-scale", String(settings.fontSize / 16));
      if (current.theme === "auto") {
        const now = new Date(),
          next = new Date(now);
        if (now.getHours() < 6) next.setHours(6, 0, 0, 0);
        else if (now.getHours() < 18) next.setHours(18, 0, 0, 0);
        else {
          next.setDate(next.getDate() + 1);
          next.setHours(6, 0, 0, 0);
        }
        timer = setTimeout(paint, next.getTime() - now.getTime() + 10);
      }
    }
    function request() {
      frame.contentWindow?.postMessage(
        { type: "NEXUS_APPEARANCE_REQUEST", nonce },
        bridgeOrigin,
      );
    }
    function receive(event: MessageEvent) {
      if (
        event.origin !== bridgeOrigin ||
        event.source !== frame.contentWindow ||
        event.data?.type !== "BLOG_APPEARANCE_SNAPSHOT" ||
        event.data.nonce !== nonce
      )
        return;
      const parsed = appearanceSnapshot.safeParse(event.data.snapshot);
      if (!parsed.success) {
        current = null;
        reset();
        return;
      }
      const old = urls;
      urls = {};
      current = !parsed.data.configured && initial ? initial : parsed.data;
      if (current.images?.light)
        urls.light = URL.createObjectURL(current.images.light);
      if (current.images?.dark)
        urls.dark = URL.createObjectURL(current.images.dark);
      paint();
      Object.values(old).forEach((u) => u && URL.revokeObjectURL(u));
    }
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (current?.settings?.scrollBlur) paint();
      });
    }
    paint();
    window.addEventListener("message", receive);
    window.addEventListener("focus", request);
    window.addEventListener("scroll", onScroll, { passive: true });
    frame.addEventListener("load", request);
    document.body.append(frame);
    return () => {
      window.removeEventListener("message", receive);
      window.removeEventListener("focus", request);
      window.removeEventListener("scroll", onScroll);
      frame.remove();
      if (timer) clearTimeout(timer);
      cancelAnimationFrame(raf);
      Object.values(urls).forEach((u) => u && URL.revokeObjectURL(u));
      reset();
    };
  }, [origin, initialKey]);
  return null;
}
