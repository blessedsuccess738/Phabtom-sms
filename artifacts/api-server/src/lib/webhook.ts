import { logger } from "./logger";

export type WebhookEvent =
  | "otp.sent"
  | "otp.delivered"
  | "otp.verified"
  | "otp.failed"
  | "otp.expired";

export interface WebhookPayload {
  event: WebhookEvent;
  requestId: string;
  phone: string;
  appId?: string | null;
  timestamp: string;
  meta?: Record<string, unknown>;
}

/**
 * Fire-and-forget webhook POST. Never throws — failures are logged only.
 */
export async function fireWebhook(
  webhookUrl: string | null | undefined,
  payload: WebhookPayload,
): Promise<void> {
  if (!webhookUrl) return;

  const body = JSON.stringify(payload);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "PhantomSMS-Gateway/1.0",
        "X-Phantom-Event": payload.event,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      logger.warn(
        { webhookUrl, status: res.status, event: payload.event },
        "Webhook returned non-2xx",
      );
    } else {
      logger.info(
        { webhookUrl, event: payload.event, status: res.status },
        "Webhook delivered",
      );
    }
  } catch (err) {
    logger.warn(
      { webhookUrl, event: payload.event, err },
      "Webhook delivery failed (non-blocking)",
    );
  }
}
