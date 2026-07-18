/**
 * 搜索 API（Route Handler）
 * 护栏2：API 只调 searchItems()，不写 SQL
 *
 * GET /api/search?q=数学建模&level=national&recognition=official_A&suitableGrade=大二&sort=relevance&page=1&pageSize=20
 */
import { type NextRequest, NextResponse } from "next/server";

import { searchItems } from "@/lib/search";
import type {
  CompetitionLevel,
  CompetitionRecognition,
  SearchSortBy,
} from "@/lib/search";

function parseLevel(v: string | null): CompetitionLevel | undefined {
  if (!v) return undefined;
  return ["school", "provincial", "national", "international"].includes(v)
    ? (v as CompetitionLevel)
    : undefined;
}

function parseRecognition(v: string | null): CompetitionRecognition | undefined {
  if (!v) return undefined;
  return ["official_A", "leaderboard_listed", "normal"].includes(v)
    ? (v as CompetitionRecognition)
    : undefined;
}

function parseSort(v: string | null): SearchSortBy {
  if (v === "credibility" || v === "closing") return v;
  return "relevance";
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const query = sp.get("q") ?? undefined;
  const level = parseLevel(sp.get("level"));
  const recognition = parseRecognition(sp.get("recognition"));
  const suitableGrade = sp.get("suitableGrade") ?? undefined;
  const closingWithinDays = sp.get("closingWithinDays");
  const sort = parseSort(sp.get("sort"));
  const page = Number(sp.get("page") ?? "1");
  const pageSize = Number(sp.get("pageSize") ?? "20");

  const result = await searchItems({
    query,
    filters: {
      level,
      recognition,
      suitableGrade,
      closingWithinDays:
        closingWithinDays && Number(closingWithinDays) > 0
          ? Number(closingWithinDays)
          : undefined,
    },
    sort: { by: sort },
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 20,
  });

  return NextResponse.json(result);
}
