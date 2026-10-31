# Original-resolution event image loading

The user explicitly requires unchanged image clarity. All five approved original WebP assets, dimensions, source URLs and detail-page framing remain unchanged. No resized or re-encoded derivatives are used. File bytes were compared with production commit `0cacd80` before release.

## Approach and sources

- [React `preload`](https://react.dev/reference/react-dom/preload): issue image resource hints for only the first two catalog cards during server rendering. The shared RMUC/RMUL original URL is deduplicated. This starts before hydration; request `Save-Data: on` and `ECT: 2g/slow-2g` suppress these speculative hints.
- [GoogleChromeLabs Quicklink](https://github.com/GoogleChromeLabs/quicklink) and [instant.page viewport/intent modes](https://instant.page/intensity): apply their visible-link and intent-driven scheduling pattern to the image resource, while retaining Next's existing route prefetch. Cards within 200 px of the viewport warm the exact original and decode it; at most two speculative image downloads run concurrently. Offscreen cards do not trigger eager loading of every catalog image. Client save-data/2G preferences suppress passive warming. Hover, focus, pointer-down and touch elevate a targeted image; failures can retry.
- [Cloudflare fingerprinted asset caching](https://developers.cloudflare.com/workers/static-assets/headers/#configure-custom-browser-cache-behavior): original event WebP filenames contain content hashes, so `public/_headers` sets one-year immutable browser caching for this path only. The mutable SVG path is excluded.
- Embed the existing SVG mask in CSS, with identical gradient coordinates and opacity stops. A decoded original no longer waits for a separate mask request. The public SVG remains available for previously loaded stylesheets.

No third-party prefetch script is installed, avoiding duplicate HTML route requests alongside Next's own router. The existing backgrounds, photo composition and persistent navigation are retained.

## Evidence and limits

Baseline, Chrome with 100 ms simulated network latency and 150 KiB/s download bandwidth: the original 479,428-byte RM image took about 3.4 seconds from an immediate link click to decode. Its response required browser revalidation (`max-age=0, must-revalidate`); the SVG mask was another resource request.

Local browser checks with unchanged originals verified: first-row preload without JavaScript; deduplicated shared imagery; below-fold images left alone; save-data and intent behavior; failed speculation retry; and stable header geometry. Once the original preload completed, inserting the actual header decoded in 8 ms on desktop and 6 ms on a 2× mobile viewport with zero extra image requests. Both received the full 1920-pixel RM image. These are warm-cache decode measurements, not cold-load timing or a Core Web Vitals claim. A first-time immediate click on a constrained connection still depends on downloading the complete original; this change moves that work earlier and reuses it afterward.
