import { sql, type SQL } from "drizzle-orm";
import { events } from "@/db/schema";

// State is ordered separately, so expired events never outrank open events.
export function recommendationScore(now: Date): SQL {
  const data = events.publishedData;
  return sql`(
    CASE
      WHEN ${data}->>'mainlandEligibility' = 'ineligible' THEN -5000
      WHEN ${data}->>'region' = 'domestic' AND ${events.mode} = 'online' AND ${data}->>'entry' = 'direct' AND ${data}->>'mainlandEligibility' = 'eligible' THEN 1400
      WHEN ${data}->>'region' = 'domestic' THEN 1200
      WHEN ${data}->>'region' = 'international' AND ${events.mode} = 'onsite' THEN -800
      WHEN ${data}->>'region' = 'international' AND ${events.mode} = 'hybrid' THEN -100
      WHEN ${data}->>'region' = 'international' AND ${events.mode} = 'online' AND ${data}->>'entry' = 'direct' AND ${data}->>'mainlandEligibility' = 'eligible' THEN 600
      WHEN ${data}->>'region' = 'international' AND ${events.mode} = 'online' THEN 250
      WHEN ${events.mode} = 'online' AND ${data}->>'entry' = 'direct' AND ${data}->>'mainlandEligibility' = 'eligible' THEN 800
      WHEN ${events.mode} = 'online' THEN 400
      WHEN ${events.mode} = 'hybrid' THEN 200
      ELSE 0 END
    + CASE WHEN ${events.kind} = 'hackathon' THEN 50 WHEN ${events.kind} = 'developer_challenge' THEN 40 ELSE 0 END
    + CASE WHEN ${data}->>'fee' = 'free' THEN 20 WHEN ${data}->>'fee' = 'paid' THEN -20 ELSE 0 END
    + CASE WHEN ${data}->>'mainlandEligibility' IS NULL OR ${data}->>'mainlandEligibility' = 'unknown' THEN -100 ELSE 0 END
    + CASE WHEN ${data}->>'entry' = 'qualification' THEN -60 WHEN ${data}->>'entry' = 'application' THEN -30 ELSE 0 END
    + CASE WHEN ${events.registrationClosesAt} > ${now.toISOString()}::timestamptz + interval '3 days'
        AND ${events.registrationClosesAt} <= ${now.toISOString()}::timestamptz + interval '30 days' THEN 25
        WHEN ${events.registrationClosesAt} <= ${now.toISOString()}::timestamptz + interval '1 day' THEN -30 ELSE 0 END
    + CASE WHEN ${events.verifiedAt} >= ${now.toISOString()}::timestamptz - interval '14 days' THEN 10 ELSE 0 END
    + CASE WHEN ${events.reviewState} = 'needs_review' THEN -3000 ELSE 0 END
  )`;
}
