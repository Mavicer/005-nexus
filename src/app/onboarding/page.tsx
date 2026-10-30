import { redirect } from "next/navigation";
import { safeNext } from "@/lib/http";
export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  redirect(safeNext((await searchParams).next));
}
