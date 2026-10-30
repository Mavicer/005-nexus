import { expect, it } from "vitest";
import { appearanceStyle, type AppearanceSnapshot } from "../appearance";
it("renders a known wallpaper and appearance values before client hydration", () => {
  const snapshot: AppearanceSnapshot = { configured: true, theme: "dark", settings: { background: "alpine", brightness: 85, blur: 2, cardOpacity: 60, fontSize: 18, scrollBlur: true } };
  expect(appearanceStyle(snapshot, "https://mavicer.cc")).toMatchObject({
    "--synced-wallpaper": 'url("https://mavicer.cc/images/backgrounds/alpine-evening.webp")',
    "--synced-brightness": "0.85", "--font-scale": "1.125",
  });
  expect(appearanceStyle(null, "https://mavicer.cc")).toBeUndefined();
  expect(appearanceStyle({ ...snapshot, configured: false }, "https://mavicer.cc")).toBeUndefined();
});
