import { track } from "@vercel/analytics";

/**
 * Privacy-respecting analytics wrapper.
 * Never include: usernames, resume content, file names, or any PII.
 * Silently swallows errors so analytics never breaks the app.
 */
export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean>
) {
  try {
    track(name, properties);
  } catch {
    // silent fail
  }
}

export const Events = {
  RESUME_CREATED: "resume_created",
  TEMPLATE_APPLIED: "template_applied",
  AI_IMPROVE_STARTED: "ai_improve_started",
  AI_IMPROVE_COMPLETED: "ai_improve_completed",
  AI_IMPROVE_FAILED: "ai_improve_failed",
  PDF_DOWNLOADED: "pdf_downloaded",
  JOB_MATCH_COMPLETED: "job_match_completed",
  PROVIDER_CONFIGURED: "provider_configured",
  // Star gate events
  STAR_GATE_SHOWN: "star_gate_shown",
  OAUTH_STARTED: "oauth_started",
  OAUTH_COMPLETED: "oauth_completed",
  OAUTH_FAILED_STATE: "oauth_failed_state",
  OAUTH_FAILED_NOT_STARRED: "oauth_failed_not_starred",
  DOWNLOAD_AFTER_GATE: "download_after_gate",
  GATE_DISMISSED: "gate_dismissed",
} as const;
