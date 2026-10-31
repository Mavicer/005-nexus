import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { eventVisual } from "@/modules/events/visuals";

export function DetailHeading({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const visual = eventVisual(slug);
  return (
    <header
      className={[
        "panel detail-heading",
        visual ? "detail-heading-illustrated" : "",
      ].join(" ")}
      style={{ marginTop: 20 }}
    >
      {visual && (
        <div
          className="detail-artwork"
          aria-hidden="true"
          style={
            { "--event-photo-width": visual.desktopWidth } as CSSProperties
          }
        >
          <Image
            src={visual.src}
            alt=""
            width={visual.width}
            height={visual.height}
            unoptimized
            loading="eager"
            fetchPriority="high"
            style={{ objectPosition: visual.position }}
          />
        </div>
      )}
      <div className="detail-heading-copy">{children}</div>
    </header>
  );
}
