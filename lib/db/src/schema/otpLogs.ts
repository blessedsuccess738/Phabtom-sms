import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const otpStatusEnum = pgEnum("otp_status", [
  "pending",
  "sent",
  "delivered",
  "failed",
  "verified",
  "expired",
]);

export const otpChannelEnum = pgEnum("otp_channel", [
  "modem",
  "email-sms",
  "dev",
]);

export const otpLogsTable = pgTable("otp_logs", {
  id: serial("id").primaryKey(),
  requestId: text("request_id").notNull().unique(),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  status: otpStatusEnum("status").notNull().default("pending"),
  channel: otpChannelEnum("channel"),
  appId: text("app_id"),
  attemptsUsed: integer("attempts_used").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
});

export const insertOtpLogSchema = createInsertSchema(otpLogsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertOtpLog = z.infer<typeof insertOtpLogSchema>;
export type OtpLog = typeof otpLogsTable.$inferSelect;
