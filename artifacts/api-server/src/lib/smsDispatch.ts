import nodemailer from "nodemailer";
import { logger } from "./logger";

export type SmsChannel = "modem" | "email-sms" | "dev";

export interface SendSmsOptions {
  phone: string;
  message: string;
  channel: SmsChannel;
  modemPort?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  senderName?: string | null;
}

export interface SendSmsResult {
  success: boolean;
  channel: SmsChannel;
  error?: string;
}

// Carrier email-to-SMS gateways map
const CARRIER_GATEWAYS: Record<string, string> = {
  att: "txt.att.net",
  tmobile: "tmomail.net",
  verizon: "vtext.com",
  sprint: "messaging.sprintpcs.com",
  boost: "sms.myboostmobile.com",
  cricket: "mms.cricketwireless.net",
  metropcs: "mymetropcs.com",
  uscellular: "email.uscc.net",
};

function phoneToEmailSms(phone: string): string {
  // Strip to digits only, remove leading +1 or 1
  const digits = phone.replace(/\D/g, "").replace(/^1/, "");
  // Default to att gateway; in production user can configure carrier
  return `${digits}@txt.att.net`;
}

async function sendViaEmailSms(opts: SendSmsOptions): Promise<SendSmsResult> {
  if (!opts.smtpHost || !opts.smtpUser || !opts.smtpPassword) {
    return {
      success: false,
      channel: "email-sms",
      error: "SMTP not configured. Set smtpHost, smtpUser, smtpPassword in gateway config.",
    };
  }

  const transporter = nodemailer.createTransport({
    host: opts.smtpHost,
    port: opts.smtpPort ?? 587,
    secure: (opts.smtpPort ?? 587) === 465,
    auth: {
      user: opts.smtpUser,
      pass: opts.smtpPassword,
    },
  });

  const toAddress = phoneToEmailSms(opts.phone);

  try {
    await transporter.sendMail({
      from: opts.smtpUser,
      to: toAddress,
      subject: "",
      text: opts.message,
    });
    logger.info({ phone: opts.phone, toAddress }, "Email-to-SMS sent");
    return { success: true, channel: "email-sms" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, phone: opts.phone }, "Email-to-SMS failed");
    return { success: false, channel: "email-sms", error: message };
  }
}

async function sendViaModem(opts: SendSmsOptions): Promise<SendSmsResult> {
  if (!opts.modemPort) {
    return {
      success: false,
      channel: "modem",
      error: "Modem port not configured. Set modemPort in gateway config (e.g. /dev/ttyUSB0).",
    };
  }

  try {
    // Dynamic import so serialport is only loaded when modem mode is active
    const { SerialPort } = await import("serialport");
    const { ReadlineParser } = await import("@serialport/parser-readline");

    const port = new SerialPort({
      path: opts.modemPort,
      baudRate: 115200,
      autoOpen: false,
    });

    return await new Promise<SendSmsResult>((resolve) => {
      const timeout = setTimeout(() => {
        port.close();
        resolve({ success: false, channel: "modem", error: "Modem timeout" });
      }, 15000);

      const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));
      let step = 0;
      // Sanitize phone and message for AT commands
      const safePhone = opts.phone.replace(/[^+\d]/g, "");
      const safeMsg = opts.message.replace(/[^\x20-\x7E]/g, "");

      parser.on("data", (line: string) => {
        const l = line.trim();
        logger.debug({ step, line: l }, "Modem response");

        if (step === 0 && l === "OK") {
          // AT responded, set SMS text mode
          step = 1;
          port.write('AT+CMGF=1\r');
        } else if (step === 1 && l === "OK") {
          // Text mode set, send CMGS
          step = 2;
          port.write(`AT+CMGS="${safePhone}"\r`);
        } else if (step === 2 && l.includes(">")) {
          // Prompt received, send message body + CTRL+Z
          step = 3;
          port.write(`${safeMsg}\x1A`);
        } else if (step === 3 && l.startsWith("+CMGS:")) {
          // Success
          clearTimeout(timeout);
          port.close();
          resolve({ success: true, channel: "modem" });
        } else if (l === "ERROR" || l.startsWith("+CMS ERROR")) {
          clearTimeout(timeout);
          port.close();
          resolve({ success: false, channel: "modem", error: `AT error: ${l}` });
        }
      });

      port.open((err) => {
        if (err) {
          clearTimeout(timeout);
          resolve({ success: false, channel: "modem", error: err.message });
          return;
        }
        // Start with basic AT handshake
        port.write("AT\r");
      });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "Modem send error");
    return { success: false, channel: "modem", error: message };
  }
}

async function sendViaDev(opts: SendSmsOptions): Promise<SendSmsResult> {
  logger.info(
    { phone: opts.phone, message: opts.message },
    "[DEV MODE] SMS OTP — would send this message in production"
  );
  return { success: true, channel: "dev" };
}

export async function sendSms(opts: SendSmsOptions): Promise<SendSmsResult> {
  switch (opts.channel) {
    case "modem":
      return sendViaModem(opts);
    case "email-sms":
      return sendViaEmailSms(opts);
    case "dev":
    default:
      return sendViaDev(opts);
  }
}

export async function checkModemStatus(modemPort: string | null | undefined): Promise<{
  connected: boolean;
  signal: number | null;
  error?: string;
}> {
  if (!modemPort) return { connected: false, signal: null, error: "No modem port configured" };

  try {
    const { SerialPort } = await import("serialport");
    const { ReadlineParser } = await import("@serialport/parser-readline");

    const port = new SerialPort({ path: modemPort, baudRate: 115200, autoOpen: false });

    return await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        port.close();
        resolve({ connected: false, signal: null, error: "Modem check timeout" });
      }, 5000);

      const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));
      let gotOk = false;

      parser.on("data", (line: string) => {
        const l = line.trim();
        if (!gotOk && l === "OK") {
          gotOk = true;
          port.write("AT+CSQ\r");
        } else if (l.startsWith("+CSQ:")) {
          const match = l.match(/\+CSQ:\s*(\d+)/);
          const signal = match ? parseInt(match[1], 10) : null;
          clearTimeout(timeout);
          port.close();
          resolve({ connected: true, signal: signal === 99 ? null : signal });
        }
      });

      port.open((err) => {
        if (err) {
          clearTimeout(timeout);
          resolve({ connected: false, signal: null, error: err.message });
          return;
        }
        port.write("AT\r");
      });
    });
  } catch (err) {
    return { connected: false, signal: null, error: err instanceof Error ? err.message : String(err) };
  }
}
