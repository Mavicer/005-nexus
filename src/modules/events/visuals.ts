export type EventVisual = {
  src: string;
  width: number;
  height: number;
  position: string;
  desktopWidth?: string;
  sourceUrl?: string;
};

// Deliberately selective: no logo, generic stock photo or low-resolution fallback.
// Past-season photographs illustrate the event, never the upcoming edition.
const robomaster: EventVisual = {
  src: "/images/events/robomaster-pit-29be18e8e7.webp",
  width: 1920,
  height: 1280,
  position: "56% 100%",
  desktopWidth: "58%",
};

const visuals: Record<string, EventVisual> = {
  "robomaster-rmuc-2027": robomaster,
  "robomaster-rmul-2027": robomaster,
  "huawei-ict-innovation-2027": {
    src: "/images/events/huawei-ict-final-4e00a58223.webp",
    width: 1600,
    height: 1067,
    position: "60% 58%",
    sourceUrl: "https://tech.ifeng.com/c/8tnQIycTR6o",
  },
};

export function eventVisual(slug: string): EventVisual | undefined {
  return visuals[slug];
}
