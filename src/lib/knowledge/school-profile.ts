/**
 * 高校画像匹配接口（Phase A+ A7 地域维度 provider 层）
 *
 * 数据在 data/school-profile-data.ts（Record<string, SchoolProfile>，2952 所教育部名单）。
 * 本文件只提供抽象接口（matchSchool/getSchoolProfile），未来迁移 DB 只替换 provider。
 *
 * matchSchool 模糊匹配通用（精确→校名含输入→输入含校名，非特调）。
 */
import { SCHOOL_PROFILES, type SchoolProfile } from "./data/school-profile-data";

/**
 * 模糊匹配学校名 → SchoolProfile。
 *
 * 匹配优先级：
 * 1. 精确匹配（O(1) Record 查询）
 * 2. 校名包含输入（"南京航空航天" → "南京航空航天大学"）
 * 3. 输入包含校名（用户填全称带后缀）
 * 4. 未匹配 → null（上层让用户手动选城市）
 *
 * @param schoolText 用户输入的学校名
 */
export function matchSchool(schoolText: string | null): SchoolProfile | null {
  if (!schoolText) return null;
  const text = schoolText.trim();

  // 1. 精确匹配 O(1)
  if (SCHOOL_PROFILES[text]) return SCHOOL_PROFILES[text];

  // 2. 模糊：校名包含输入（"南京航空航天" → "南京航空航天大学"）
  const match = Object.keys(SCHOOL_PROFILES).find((k) => k.includes(text));
  if (match) return SCHOOL_PROFILES[match] ?? null;

  // 3. 模糊：输入包含校名（用户填全称带后缀）
  const match2 = Object.keys(SCHOOL_PROFILES).find((k) => text.includes(k));
  if (match2) return SCHOOL_PROFILES[match2] ?? null;

  // 4. 未匹配 → null
  return null;
}

/** getSchoolProfile 别名（语义化接口） */
export function getSchoolProfile(schoolText: string | null): SchoolProfile | null {
  return matchSchool(schoolText);
}

/** 取地域（region）从学校名，未匹配返回 null */
export function getSchoolRegion(schoolText: string | null): SchoolProfile["region"] | null {
  return matchSchool(schoolText)?.region ?? null;
}
