import { redirect } from "next/navigation";
export default async function Explore({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams,
    s = new URLSearchParams();
  for (const k of [
    "q",
    "kind",
    "mode",
    "state",
    "sort",
    "within",
    "tag",
    "region",
    "entry",
    "fee",
  ])
    if (typeof p[k] === "string") s.set(k, p[k] as string);
  redirect("/" + (s.size ? "?" + s : ""));
}
