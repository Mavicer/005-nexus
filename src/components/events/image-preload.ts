import { preload } from "react-dom";

type Entry = { src: string; urgent: boolean; element?: HTMLImageElement };
const warmed = new Map<string, Entry>();
const queue: Entry[] = [];
let active = 0;

function pump() {
  while (active < 2 && queue.length) {
    const entry = queue.shift()!;
    active++;
    void load(entry).finally(() => {
      active--;
      pump();
    });
  }
}

async function load(entry: Entry) {
  // Use the exact original URL from the detail header: no resizing or re-encoding.
  preload(entry.src, {
    as: "image",
    fetchPriority: entry.urgent ? "high" : "low",
  });
  const img = new Image();
  entry.element = img;
  img.fetchPriority = entry.urgent ? "high" : "low";
  img.decoding = "async";
  img.src = entry.src;
  try {
    await img.decode();
  } catch {
    // Offline/failed speculation can retry when the user actually targets a link.
    warmed.delete(entry.src);
  } finally {
    entry.element = undefined;
  }
}

export function warmEventImage(src?: string, urgent = false) {
  if (!src) return;
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (
    !urgent &&
    (connection?.saveData ||
      ["slow-2g", "2g"].includes(connection?.effectiveType ?? ""))
  )
    return;
  const existing = warmed.get(src);
  if (existing) {
    if (urgent) {
      existing.urgent = true;
      if (existing.element) existing.element.fetchPriority = "high";
      const index = queue.indexOf(existing);
      if (index >= 0) queue.unshift(...queue.splice(index, 1));
    }
    return;
  }
  const entry: Entry = { src, urgent };
  warmed.set(src, entry);
  if (urgent) queue.unshift(entry);
  else queue.push(entry);
  pump();
}

export function observeEventImage(element: Element, src: string) {
  if (!("IntersectionObserver" in window)) return () => {};
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        warmEventImage(src);
      }
    },
    { rootMargin: "200px" },
  );
  observer.observe(element);
  return () => observer.disconnect();
}
