# Phantom Business SMS Gateway

A self-hosted SMS OTP gateway for WhatsApp-style app authentication. No external SMS APIs. Node.js backend with pluggable send channels (GSM modem, email-to-SMS, dev mode) + Kotlin Android SDK.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/phantom-sms run dev` — run the dashboard frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind v4 + shadcn/ui
- SMS dispatch: nodemailer (email-to-SMS), serialport (GSM modem AT commands)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/otpLogs.ts` — OTP log table
- `lib/db/src/schema/gatewayConfig.ts` — gateway config table
- `artifacts/api-server/src/routes/otp.ts` — OTP send/verify routes
- `artifacts/api-server/src/routes/gateway.ts` — gateway config/status/stats routes
- `artifacts/api-server/src/lib/smsDispatch.ts` — SMS send logic (modem/email-sms/dev)
- `artifacts/phantom-sms/src/pages/` — Dashboard, Logs, Config, Sdk pages
- `attached_assets/phantom-sdk/` — Kotlin Android SDK source files

## Architecture decisions

- No external SMS APIs — pluggable channel system: `modem` (AT commands via serialport), `email-sms` (SMTP + carrier gateways), `dev` (log only)
- Single gateway config row in DB; defaults to `dev` mode on first run
- OTPs auto-expire old pending/sent codes when a new one is requested for the same phone
- Rate limiting is enforced in the OTP send route (configurable window + max per window)
- OTP codes are never returned in API log responses (security)
- Kotlin SDK uses standard Android `HttpURLConnection` — no extra dependencies needed beyond `kotlinx-coroutines`

## Product

- **Dashboard** `/` — gateway status, live OTP stats, recent activity feed
- **Logs** `/logs` — full OTP history with filter by status
- **Config** `/config` — switch channels, set OTP/rate params, modem port, SMTP settings, test SMS
- **SDK** `/sdk` — Kotlin integration guide and code snippets

## Kotlin Android SDK

Located at `attached_assets/phantom-sdk/`:
- `PhantomSMS.kt` — main SDK class (sendOtp, verifyOtp, getStatus)
- `PhantomSMSViewModel.kt` — optional Jetpack Compose ViewModel wrapper
- `build.gradle.kts` — Android library build config

Usage in Android app:
```kotlin
val sms = PhantomSMS("https://your-gateway.railway.app", appId = "my-app")
val result = sms.sendOtp("+12025551234")
val check  = sms.verifyOtp("+12025551234", userCode, result.requestId)
```

## Gotchas

- GSM modem mode requires `pnpm approve-builds` for `@serialport/bindings-cpp` native addon
- In Tailwind v4, `@apply dark` is invalid — use `class="dark"` on `<html>` in index.html instead
- serialport native bindings need to be approved before modem mode works in production
- Gateway config defaults to `dev` mode (OTPs logged, not sent) until configured via `/config`

## User preferences

- No external SMS APIs (Twilio, Vonage, etc.)
- Kotlin/Android SDK target (not web SDK)
- Brand name: Phantom Business

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
