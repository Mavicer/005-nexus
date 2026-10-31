# Event detail photography

Use strong, recognisable event photography, not a completeness quota. The user approved RoboMaster pit-work photographs and the Huawei ICT final competition-room photograph on 2026-10-31. A sharp subject, characteristic equipment, lighting and a clean crop matter as much as pixel dimensions. Reject logos, certificates, award groups, dense posters, generic stock photos and weak screenshots. Events without an accepted image retain the original header. Never substitute another event or track just to fill a space.

## Accepted assets

| Asset                              | Provenance                                                                                                                                                                                                                                                     | Display scope                                                                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `robomaster-pit-29be18e8e7.webp`   | User-supplied original `diankong.CYojPT7G_Z2kSURM.webp`, 4000 × 2667, featuring RoboMaster participants preparing a robot; RoboMaster watermark preserved. Exact season and original source URL not established.                                               | RMUC/RMUL as a **past RoboMaster scene**, not evidence of a particular upcoming edition. Not used for RMUA, whose format differs.      |
| `huawei-ict-final-4e00a58223.webp` | [Huawei ICT 2025–2026 final report](https://tech.ifeng.com/c/8tnQIycTR6o), [original 1600 × 1067 photograph](https://x0.ifengimg.com/ucms/2026_24/8E08DFD01C17364359AC90CAA0B729B1E30D3885_size328_w1600_h1067.jpg). User explicitly accepted this photograph. | ICT innovation detail as a **past ICT competition scene**; does not claim the photograph depicts the innovation track or 2027 edition. |

Local WebP derivatives preserve the originals' aspect ratios. No generative enhancement. Sources and existing watermarks are not invented or replaced. Image provenance stays in this document; no caption is overlaid on the header.

## Layout and loading

Artwork is an absolute decorative layer; its dimensions do not depend on image decoding. Desktop artwork fades softly from a line running from one third of the header width at its top to one half at its bottom. The SVG mask uses normalised coordinates so those anchors remain stable across desktop aspect ratios. Mobile artwork has a reserved 230 px area above the text with a diagonal fade along its lower edge. Native eager/high-priority loading is used on detail pages. Pointer hover, keyboard focus and touch on discovery links prewarm the corresponding image; repeated requests are deduplicated, and speculative failures can retry. Existing route prefetch remains enabled. Images are kept out of catalog cards.

Other catalog entries remain without artwork unless a suitable image is accepted. Earlier rejected candidates are intentionally excluded; keep the same quality threshold when suitable originals become available.

## Second selection — 2026-10-31

Added three visuals after checking the rendered crop, not only the source image:

- **Smart car:** a 2025 national-final trackside preparation photograph from [潮新闻](https://cs.zjol.com.cn/kzl/202508/t20250821_31184961.shtml). The car and competitor remain visible; do not describe it as the 2026 final.
- **Embedded application track:** a 2024 competition robot/embedded-board close-up from [电子科技大学](https://news.uestc.edu.cn/info/1004/2777.htm). Kept separate from the FPGA track. The vehicle, circuitry and blue lighting carry the image; a group photograph is not substituted.
- **Tencent Music AI Hackathon:** the organiser's vivid 1920 × 1180 AI/music key visual from the [official event page](https://join.tencentmusic.com/h5/ai-hackathon/index.html). This is publicity artwork, never labelled as a competition photograph.

Exact original URLs, dimensions and historical scope are recorded in `data/event-visual-sources.json`. No candidate has been upscaled or generatively enhanced. Local WebP payloads are approximately 213 KB, 293 KB and 84 KB respectively. These three files together add approximately 590 KiB; only the selected event image is loaded on a detail visit.

Reviewed and omitted in this round: CCSP classroom wide shots/award boards, Blue Bridge notices/logos, Renesas award and conference slides, Intel award groups, TI analog posters and weak booth snapshots, computer-design lecture-room shots and certificates, and software-cup ranking screenshots. None meets the accepted visual bar for an engaging header.

Mobile fades begin near the bottom edge so low-placed vehicles and circuit boards stay visible above the title. Desktop masks and absence of overlay captions follow the user-approved RoboMaster treatment.

## Rejected third selection — 2026-10-31

The user rejected the computer-design robot-course photograph and TI analog circuit close-up as too rough and unfinished. Both visual mappings and shipped assets have been removed. Do not reuse them. Those two event headers return to their original artwork-free layout. Previously approved RoboMaster, Huawei ICT, smart-car, embedded-robot and Tencent Music artwork remain unchanged.

Clear equipment alone is insufficient: future candidates also need deliberate composition, controlled lighting, clean surroundings and a polished photographic finish. Raw prototype wiring, improvised test layouts and flat campus snapshots are not acceptable substitutes for engaging event photography.
