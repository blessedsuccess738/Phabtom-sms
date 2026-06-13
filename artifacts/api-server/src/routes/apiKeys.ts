import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, apiKeysTable } from "@workspace/db";
import { randomBytes } from "crypto";

const router: IRouter = Router();

function generateKey(): string {
  return "pk_live_" + randomBytes(24).toString("hex");
}

// GET /api/keys
router.get("/keys", async (req, res): Promise<void> => {
  const keys = await db
    .select({
      id: apiKeysTable.id,
      key: apiKeysTable.key,
      name: apiKeysTable.name,
      appId: apiKeysTable.appId,
      webhookUrl: apiKeysTable.webhookUrl,
      isActive: apiKeysTable.isActive,
      createdAt: apiKeysTable.createdAt,
      lastUsedAt: apiKeysTable.lastUsedAt,
    })
    .from(apiKeysTable)
    .orderBy(apiKeysTable.createdAt);

  // Mask key — only show last 8 chars
  const masked = keys.map((k) => ({
    ...k,
    key: k.key.replace(/^(pk_live_).{8}/, "$1••••••••"),
  }));

  res.json(masked);
});

// POST /api/keys
router.post("/keys", async (req, res): Promise<void> => {
  const { name, appId, senderName, webhookUrl } = req.body as {
    name?: string;
    appId?: string;
    senderName?: string;
    webhookUrl?: string;
  };

  if (!appId) {
    res.status(400).json({ error: "appId is required" });
    return;
  }

  const key = generateKey();

  const [created] = await db
    .insert(apiKeysTable)
    .values({
      key,
      name: name ?? "My App",
      appId,
      senderName: senderName ?? null,
      webhookUrl: webhookUrl ?? null,
      isActive: true,
    })
    .returning();

  req.log.info({ appId, name }, "API key created");

  // Return full key once — never shown again in full
  res.status(201).json({ ...created });
});

// DELETE /api/keys/:keyId
router.delete("/keys/:keyId", async (req, res): Promise<void> => {
  const id = parseInt(req.params.keyId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid key ID" });
    return;
  }

  const [deleted] = await db
    .delete(apiKeysTable)
    .where(eq(apiKeysTable.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Key not found" });
    return;
  }

  res.json({ success: true });
});

// PATCH /api/keys/:keyId
router.patch("/keys/:keyId", async (req, res): Promise<void> => {
  const id = parseInt(req.params.keyId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid key ID" });
    return;
  }

  const { webhookUrl, name, senderName, isActive } = req.body as {
    webhookUrl?: string | null;
    name?: string;
    senderName?: string | null;
    isActive?: boolean;
  };

  const updates: Partial<typeof apiKeysTable.$inferInsert> = {};
  if (webhookUrl !== undefined) updates.webhookUrl = webhookUrl;
  if (name !== undefined) updates.name = name;
  if (senderName !== undefined) updates.senderName = senderName;
  if (isActive !== undefined) updates.isActive = isActive;

  const [updated] = await db
    .update(apiKeysTable)
    .set(updates)
    .where(eq(apiKeysTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Key not found" });
    return;
  }

  res.json(updated);
});

export default router;
