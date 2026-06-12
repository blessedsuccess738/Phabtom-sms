import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gatewayConfigTable = pgTable("gateway_config", {
  id: serial("id").primaryKey(),
  channel: text("channel").notNull().default("email-sms"),
  otpLength: integer("otp_length").notNull().default(6),
  otpExpirySeconds: integer("otp_expiry_seconds").notNull().default(300),
  maxAttempts: integer("max_attempts").notNull().default(3),
  rateWindowSeconds: integer("rate_window_seconds").notNull().default(60),
  maxPerWindow: integer("max_per_window").notNull().default(3),
  modemPort: text("modem_port"),
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpUser: text("smtp_user"),
  smtpPassword: text("smtp_password"),
  smsGatewayDomain: text("sms_gateway_domain"),
  senderName: text("sender_name").notNull().default("PhantomBusiness"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertGatewayConfigSchema = createInsertSchema(gatewayConfigTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertGatewayConfig = z.infer<typeof insertGatewayConfigSchema>;
export type GatewayConfig = typeof gatewayConfigTable.$inferSelect;
