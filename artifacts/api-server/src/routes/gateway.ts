import { Router, type IRouter } from "express";
import { desc, sql, and, gte } from "drizzle-orm";
import { db, otpLogsTable, gatewayConfigTable } from "@workspace/db";
import {
  UpdateGatewayConfigBody,
  TestGatewayBody,
} from "@workspace/api-zod";
import { sendSms, checkModemStatus, type SmsChannel } from "../lib/smsDispatch";
import { v4 as uuidv4 } from "uuid";

const router: IRouter = Router();

async function getOrCreateConfig() {
  const [existing] = await db.select().from(gatewayConfigTable).limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(gatewayConfigTable)
    .values({
      channel: "dev",
      otpLength: 6,
      otpExpirySeconds: 300,
      maxAttempts: 3,
      rateWindowSeconds: 60,
      maxPerWindow: 3,
      senderName: "PhantomBusiness",
    })
    .returning();
  return created;
}

// GET /gateway/status
router.get("/gateway/status", async (req, res): Promise<void> => {
  const config = await getOrCreateConfig();
  const channel = config.channel as SmsChannel;

  let modemConnected = false;
  let signal: number | null = null;

  if (channel === "modem") {
    const modemStatus = await checkModemStatus(config.modemPort);
    modemConnected = modemStatus.connected;
    signal = modemStatus.signal;
  }

  const smtpReady =
    channel === "email-sms" &&
    !!config.smtpHost &&
    !!config.smtpUser &&
    !!config.smtpPassword;

  const online =
    channel === "dev" ||
    (channel === "modem" && modemConnected) ||
    (channel === "email-sms" && smtpReady);

  res.json({
    online,
    channel,
    modemConnected,
    modemPort: config.modemPort ?? null,
    smtpReady,
    lastChecked: new Date().toISOString(),
    signal,
  });
});

// GET /gateway/config
router.get("/gateway/config", async (req, res): Promise<void> => {
  const config = await getOrCreateConfig();
  res.json({
    ...config,
    smtpPassword: config.smtpPassword ? "••••••••" : null, // Never expose password
    updatedAt: config.updatedAt.toISOString(),
  });
});

// PUT /gateway/config
router.put("/gateway/config", async (req, res): Promise<void> => {
  const parsed = UpdateGatewayConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await getOrCreateConfig();
  const updates: Record<string, unknown> = { ...parsed.data };

  // If smtpPassword is null in update, keep existing
  if (updates.smtpPassword === null || updates.smtpPassword === undefined) {
    delete updates.smtpPassword;
  }

  const [updated] = await db
    .update(gatewayConfigTable)
    .set(updates)
    .where(sql`id = ${existing.id}`)
    .returning();

  req.log.info({ channel: updated.channel }, "Gateway config updated");
  res.json({
    ...updated,
    smtpPassword: updated.smtpPassword ? "••••••••" : null,
    updatedAt: updated.updatedAt.toISOString(),
  });
});

// GET /gateway/stats
router.get("/gateway/stats", async (req, res): Promise<void> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalStats] = await db
    .select({
      totalSent: sql<number>`count(*) filter (where status IN ('sent','delivered','verified','failed','expired'))`,
      totalVerified: sql<number>`count(*) filter (where status = 'verified')`,
      totalFailed: sql<number>`count(*) filter (where status = 'failed')`,
      totalExpired: sql<number>`count(*) filter (where status = 'expired')`,
    })
    .from(otpLogsTable);

  const [todayStats] = await db
    .select({
      todaySent: sql<number>`count(*) filter (where status IN ('sent','delivered','verified','failed'))`,
      todayVerified: sql<number>`count(*) filter (where status = 'verified')`,
    })
    .from(otpLogsTable)
    .where(gte(otpLogsTable.createdAt, todayStart));

  const total = Number(totalStats?.totalSent ?? 0);
  const verified = Number(totalStats?.totalVerified ?? 0);
  const successRate = total > 0 ? Math.round((verified / total) * 100) : 0;

  const recentLogs = await db
    .select()
    .from(otpLogsTable)
    .orderBy(desc(otpLogsTable.createdAt))
    .limit(10);

  res.json({
    totalSent: total,
    totalVerified: verified,
    totalFailed: Number(totalStats?.totalFailed ?? 0),
    totalExpired: Number(totalStats?.totalExpired ?? 0),
    successRate,
    todaySent: Number(todayStats?.todaySent ?? 0),
    todayVerified: Number(todayStats?.todayVerified ?? 0),
    recentLogs: recentLogs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
      expiresAt: l.expiresAt.toISOString(),
      verifiedAt: l.verifiedAt?.toISOString() ?? null,
      code: undefined,
    })),
  });
});

// POST /gateway/test
router.post("/gateway/test", async (req, res): Promise<void> => {
  const parsed = TestGatewayBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const config = await getOrCreateConfig();
  const result = await sendSms({
    phone: parsed.data.phone,
    message: `PhantomBusiness Gateway Test — ${new Date().toISOString()}`,
    channel: config.channel as SmsChannel,
    modemPort: config.modemPort,
    smtpHost: config.smtpHost,
    smtpPort: config.smtpPort,
    smtpUser: config.smtpUser,
    smtpPassword: config.smtpPassword,
    senderName: config.senderName ?? "PhantomBusiness",
  });

  req.log.info({ phone: parsed.data.phone, result }, "Gateway test SMS sent");
  res.json({
    success: result.success,
    message: result.success
      ? `Test message sent via ${result.channel}`
      : `Send failed: ${result.error}`,
    channel: result.channel,
  });
});

export default router;
