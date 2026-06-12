---
name: Serialport native build approval
description: serialport requires pnpm approve-builds before native addon compiles
---

When installing `serialport` or `@serialport/bindings-cpp`, pnpm warns:
"Ignored build scripts: @serialport/bindings-cpp. Run pnpm approve-builds..."

The native addon won't compile until approved. Modem AT-command mode will fail silently at runtime.

**Rule:** After installing serialport, run `pnpm approve-builds` and select `@serialport/bindings-cpp` before testing modem functionality.

**Why:** Replit's pnpm sandboxes block native build scripts by default for security. The package installs without error but the bindings are missing.

**How to apply:** For any GSM modem feature using serialport, document this in onboarding/setup notes and run approve-builds in CI or setup scripts.
