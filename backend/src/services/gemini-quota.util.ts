import { Logger } from '@nestjs/common';

/** After 429 / free-tier quota, skip Gemini calls until this elapses (default 24h). */
let blockedUntilMs = 0;
let lastQuotaInfoLogMs = 0;
const THROTTLE_LOG_MS = 300_000;

export function getGeminiCooldownMs(): number {
  const raw = process.env.GEMINI_COOLDOWN_MS;
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 86_400_000;
}

export function isGeminiQuotaCooldownActive(): boolean {
  return Date.now() < blockedUntilMs;
}

export function armGeminiQuotaCooldown(): void {
  blockedUntilMs = Math.max(blockedUntilMs, Date.now() + getGeminiCooldownMs());
}

export function isLikelyGeminiQuotaError(err: unknown): boolean {
  const m = err instanceof Error ? err.message : String(err);
  return /429|Too Many Requests|quota exceeded|QuotaFailure|resource_exhausted|generate_content_free_tier|free_tier_requests/i.test(
    m,
  );
}

/** One info line every ~5 minutes when Gemini is silenced (avoids Render log floods). */
export function logGeminiQuotaThrottled(logger: Logger, where: string): void {
  const now = Date.now();
  if (now - lastQuotaInfoLogMs < THROTTLE_LOG_MS) return;
  lastQuotaInfoLogMs = now;
  logger.warn(
    `${where}: Gemini calls paused until quota resets (cooldown ${Math.round(getGeminiCooldownMs() / 3600000)}h, override with GEMINI_COOLDOWN_MS). Using Yahoo/demo fallbacks.`,
  );
}
