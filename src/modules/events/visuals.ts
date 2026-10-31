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
  "smartcar-21-2026": {
    src: "/images/events/smartcar-track-75e0977ca8.webp",
    width: 1280,
    height: 853,
    position: "66% 75%",
    desktopWidth: "70%",
    sourceUrl: "https://cs.zjol.com.cn/kzl/202508/t20250821_31184961.shtml",
  },
  "embedded-soc-application-2026": {
    src: "/images/events/embedded-robot-d79afdd5ef.webp",
    width: 1192,
    height: 894,
    position: "50% 100%",
    desktopWidth: "58%",
    sourceUrl: "https://news.uestc.edu.cn/info/1004/2777.htm",
  },
  "tme-build-with-ai-2026": {
    src: "/images/events/tme-ai-hackathon-ea76873201.webp",
    width: 1920,
    height: 1180,
    position: "70% 55%",
    desktopWidth: "64%",
    sourceUrl: "https://join.tencentmusic.com/h5/ai-hackathon/index.html",
  },
  "computer-design-4c-2026": {
    src: "/images/events/computer-design-robot-26a3c2df46.webp",
    width: 1920,
    height: 1280,
    position: "0% 65%",
    desktopWidth: "52%",
    sourceUrl: "https://eelab.tongji.edu.cn/d1/dc/c16335a381404/page.htm",
  },
  "nuedc-ti-analog-2026": {
    src: "/images/events/ti-analog-circuit-9426907bc3.webp",
    width: 1600,
    height: 1067,
    position: "50% 50%",
    desktopWidth: "56%",
    sourceUrl: "https://news.hnist.cn/info/1008/38756.htm",
  },
};

export function eventVisual(slug: string): EventVisual | undefined {
  return visuals[slug];
}
