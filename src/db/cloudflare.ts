import { getCloudflareContext } from "@opennextjs/cloudflare";
export const usingD1 = () => process.env.NEXUS_DATABASE === "d1";
export async function getD1() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB.withSession("first-primary");
}
export async function d1Store() {
  const { D1Store } = await import("./d1-store");
  return new D1Store(await getD1());
}
