import { Router, type IRouter } from "express";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db, otpLogsTable, gatewayConfigTable, apiKeysTable } from "@workspace/db";
import {
  SendOtpBody,
  VerifyOtpBody,
  ListOtpLogsQueryParams,
  GetOtpLogParams,
} from "@workspace/api-zod";
import { sendSms, type SmsChannel } from "../lib/smsDispatch";
import { fireWebhook } from "../lib/webhook";

const router: IRouter = Router();

function generateOtp(length: number): string {
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10).toString();
  }
  return otp;
}

async function getConfig() {
  const [config] = await db.select().from(gatewayConfigTable).orderBy(gatewayConfigTable.id).limit(1);
  if (!config) {
    return {
      channel: "email-sms" as SmsChannel,
      otpLength: 6,
      otpExpirySeconds: 300,
      maxAttempts: 3,
      rateWindowSeconds: 60,
      maxPerWindow: 3,
      modemPort: null,
      smtpHost: null,
      smtpPort: null,
      smtpUser: null,
      smtpPassword: null,
      smsGatewayDomain: null,
      senderName: "PhantomBusiness",
    };
  }
  return config;
}

/** Look up the webhook URL for an appId via the first active API key for that app */
async function getWebhookUrlForApp(appId: string | null | undefined): Promise<string | null> {
  if (!appId) return null;
  const [row] = await db
    .select({ webhookUrl: apiKeysTable.webhookUrl })
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.appId, appId), eq(apiKeysTable.isActive, true)))
    .limit(1);
  return row?.webhookUrl ?? null;
}

// POST /otp/send
router.post("/otp/send", async (req, res): Promise<void> => {
  const parsed = SendOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { phone, appId } = parsed.data;
  const config = await getConfig();

  // Rate limiting: count recent OTPs for this phone
  const windowStart = new Date(Date.now() - config.rateWindowSeconds * 1000);
  const recentCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(otpLogsTable)
    .where(and(eq(otpLogsTable.phone, phone), gte(otpLogsTable.createdAt, windowStart)));

  const count = Number(recentCount[0]?.count ?? 0);
  if (count >= config.maxPerWindow) {
    res.status(429).json({ error: "Rate limit exceeded. Please wait before requesting another OTP." });
    return;
  }

  // Expire any existing pending/sent OTPs for this phone
  await db
    .update(otpLogsTable)
    .set({ status: "expired" })
    .where(
      and(
        eq(otpLogsTable.phone, phone),
        sql`${otpLogsTable.status} IN ('pending', 'sent', 'delivered')`
      )
    );

  const code = generateOtp(config.otpLength);
  const requestId = uuidv4();
  const expiresAt = new Date(Date.now() + config.otpExpirySeconds * 1000);

  const senderName = config.senderName ?? "PhantomBusiness";
  const message = `${senderName}: Your verification code is ${code}. Valid for ${Math.floor(config.otpExpirySeconds / 60)} minutes. Do not share this code.`;

  // Insert log entry
  const [logEntry] = await db
    .insert(otpLogsTable)
    .values({
      requestId,
      phone,
      code,
      status: "pending",
      channel: config.channel as "modem" | "email-sms" | "dev",
      appId: appId ?? null,
      expiresAt,
    })
    .returning();

  // Fire webhook: otp.sent (non-blocking)
  const webhookUrl = await getWebhookUrlForApp(appId);
  void fireWebhook(webhookUrl, {
    event: "otp.sent",
    requestId,
    phone,
    appId,
    timestamp: new Date().toISOString(),
  });

  // Send SMS
  const result = await sendSms({
    phone,
    message,
    channel: config.channel as SmsChannel,
    modemPort: config.modemPort,
    smtpHost: config.smtpHost,
    smtpPort: config.smtpPort,
    smtpUser: config.smtpUser,
    smtpPassword: config.smtpPassword,
    smsGatewayDomain: config.smsGatewayDomain,
    senderName,
  });

  // Update log with send result
  await db
    .update(otpLogsTable)
    .set({
      status: result.success ? "sent" : "failed",
      errorMessage: result.error ?? null,
    })
    .where(eq(otpLogsTable.id, logEntry.id));

  if (!result.success) {
    req.log.warn({ phone, error: result.error }, "OTP send failed");
    // Fire webhook: otp.failed
    void fireWebhook(webhookUrl, {
      event: "otp.failed",
      requestId,
      phone,
      appId,
      timestamp: new Date().toISOString(),
      meta: { error: result.error },
    });
    res.status(500).json({ error: result.error ?? "Failed to send SMS" });
    return;
  }

  // Fire webhook: otp.delivered
  void fireWebhook(webhookUrl, {
    event: "otp.delivered",
    requestId,
    phone,
    appId,
    timestamp: new Date().toISOString(),
    meta: { channel: result.channel },
  });

  req.log.info({ phone, requestId, channel: result.channel }, "OTP sent");
  res.json({
    success: true,
    requestId,
    expiresAt: expiresAt.toISOString(),
    channel: result.channel,
  });
});

// POST /otp/verify
router.post("/otp/verify", async (req, res): Promise<void> => {
  const parsed = VerifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { phone, code, requestId } = parsed.data;
  const config = await getConfig();

  // Find matching OTP
  const conditions = [
    eq(otpLogsTable.phone, phone),
    sql`${otpLogsTable.status} IN ('sent', 'delivered', 'pending')`,
  ];
  if (requestId) {
    conditions.push(eq(otpLogsTable.requestId, requestId));
  }

  const [log] = await db
    .select()
    .from(otpLogsTable)
    .where(and(...conditions))
    .orderBy(desc(otpLogsTable.createdAt))
    .limit(1);

  if (!log) {
    res.json({ verified: false, attemptsRemaining: 0, reason: "No active OTP found for this phone number" });
    return;
  }

  // Check expiry
  if (new Date() > log.expiresAt) {
    await db.update(otpLogsTable).set({ status: "expired" }).where(eq(otpLogsTable.id, log.id));
    const webhookUrl = await getWebhookUrlForApp(log.appId);
    void fireWebhook(webhookUrl, {
      event: "otp.expired",
      requestId: log.requestId,
      phone,
      appId: log.appId,
      timestamp: new Date().toISOString(),
    });
    res.json({ verified: false, attemptsRemaining: 0, reason: "OTP has expired" });
    return;
  }

  // Check attempts
  const attemptsUsed = log.attemptsUsed + 1;
  const attemptsRemaining = config.maxAttempts - attemptsUsed;
  const webhookUrl = await getWebhookUrlForApp(log.appId);

  if (log.code !== code) {
    if (attemptsRemaining <= 0) {
      await db
        .update(otpLogsTable)
        .set({ status: "failed", attemptsUsed, errorMessage: "Max attempts exceeded" })
        .where(eq(otpLogsTable.id, log.id));
      void fireWebhook(webhookUrl, {
        event: "otp.failed",
        requestId: log.requestId,
        phone,
        appId: log.appId,
        timestamp: new Date().toISOString(),
        meta: { reason: "Max attempts exceeded" },
      });
      res.json({ verified: false, attemptsRemaining: 0, reason: "Max attempts exceeded" });
    } else {
      await db.update(otpLogsTable).set({ attemptsUsed }).where(eq(otpLogsTable.id, log.id));
      res.json({ verified: false, attemptsRemaining, reason: "Incorrect code" });
    }
    return;
  }

  // Success
  await db
    .update(otpLogsTable)
    .set({ status: "verified", attemptsUsed, verifiedAt: new Date() })
    .where(eq(otpLogsTable.id, log.id));

  // Fire webhook: otp.verified
  void fireWebhook(webhookUrl, {
    event: "otp.verified",
    requestId: log.requestId,
    phone,
    appId: log.appId,
    timestamp: new Date().toISOString(),
  });

  req.log.info({ phone, requestId: log.requestId }, "OTP verified successfully");
  res.json({ verified: true, attemptsRemaining });
});

// GET /otp/logs
router.get("/otp/logs", async (req, res): Promise<void> => {
  const params = ListOtpLogsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { limit = 50, offset = 0, status } = params.data;

  const conditions = status
    ? [sql`${otpLogsTable.status} = ${status}`]
    : [];

  const logs = await db
    .select()
    .from(otpLogsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(otpLogsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(
    logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
      expiresAt: l.expiresAt.toISOString(),
      verifiedAt: l.verifiedAt?.toISOString() ?? null,
      code: undefined,
    }))
  );
});

// GET /otp/logs/:id
router.get("/otp/logs/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetOtpLogParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [log] = await db
    .select()
    .from(otpLogsTable)
    .where(eq(otpLogsTable.id, params.data.id));

  if (!log) {
    res.status(404).json({ error: "OTP log not found" });
    return;
  }

  res.json({
    ...log,
    createdAt: log.createdAt.toISOString(),
    expiresAt: log.expiresAt.toISOString(),
    verifiedAt: log.verifiedAt?.toISOString() ?? null,
    code: undefined,
  });
});

export default router;
