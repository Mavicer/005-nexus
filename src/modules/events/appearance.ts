import { z } from "zod";
const image = z
  .instanceof(Blob)
  .refine(
    (b) =>
      b.size > 0 &&
      b.size <= 20 * 1024 * 1024 &&
      ["image/webp", "image/png", "image/jpeg", "image/avif"].includes(b.type),
  );
export const appearanceSnapshot = z
  .object({
    configured: z.boolean(),
    settings: z
      .object({
        background: z.enum(["default", "alpine", "reflection", "custom"]),
        brightness: z.number().min(60).max(120),
        blur: z.number().min(0).max(12),
        scrollBlur: z.boolean(),
        cardOpacity: z.number().min(40).max(100),
        fontSize: z.number().min(13).max(22),
      })
      .nullable(),
    theme: z.enum(["auto", "light", "dark"]),
    images: z
      .object({ light: image.optional(), dark: image.optional() })
      .optional(),
  })
  .refine((v) => !v.configured || v.settings !== null);
export type AppearanceSnapshot = z.infer<typeof appearanceSnapshot>;
export const presetPaths = {
  default: {
    light: "/images/wallhaven-wqery6-light.webp",
    dark: "/images/wallhaven-wqery6-dark.webp",
  },
  alpine: {
    light: "/images/backgrounds/alpine-day.webp",
    dark: "/images/backgrounds/alpine-evening.webp",
  },
  reflection: {
    light: "/images/backgrounds/reflection-day.webp",
    dark: "/images/backgrounds/reflection-evening.webp",
  },
};
export function effectiveTheme(
  theme: AppearanceSnapshot["theme"],
  date = new Date(),
): "light" | "dark" {
  return theme === "auto"
    ? date.getHours() >= 6 && date.getHours() < 18
      ? "light"
      : "dark"
    : theme;
}
