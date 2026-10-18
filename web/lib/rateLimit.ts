import type { NextRequest } from "next/server";

// Best-effort process-local budget guard. Server instances do not share this map.
const windows = new Map<string, { count: number; expires: number }>();
export function clientKey(request: NextRequest): string {
  return (
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}
export function allowRequest(
  key: string,
  limit = 30,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  if (windows.size > 2000) {
    for (const [candidate, record] of windows)
      if (record.expires <= now) windows.delete(candidate);
  }
  const record = windows.get(key);
  if (!record || record.expires <= now) {
    windows.set(key, { count: 1, expires: now + windowMs });
    return true;
  }
  if (record.count >= limit) return false;
  record.count += 1;
  return true;
}
