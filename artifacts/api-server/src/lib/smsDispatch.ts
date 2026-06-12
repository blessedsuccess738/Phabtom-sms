import nodemailer from "nodemailer";
import { logger } from "./logger";

export type SmsChannel = "modem" | "email-sms" | "dev";

// Common carrier email-to-SMS gateway domains (reference list)
export const CARRIER_GATEWAYS: Record<string, string> = {
  // United States
  att: "txt.att.net",
  tmobile: "tmomail.net",
  verizon: "vtext.com",
  sprint: "messaging.sprintpcs.com",
  boost: "sms.myboostmobile.com",
  cricket: "mms.cricketwireless.net",
  metropcs: "mymetropcs.com",
  uscellular: "email.uscc.net",
  googlefi: "msg.fi.google.com",
  // International examples
  rogers: "pcs.rogers.com",       // Canada
  bell: "txt.bell.ca",            // Canada
  telus: "msg.telus.com",         // Canada
  vodafone_uk: "vodafone.net",    // UK
  o2_uk: "mmail.co.uk",          // UK
};

export interface SendSmsOptions {
  phone: string;
  message: string;
  channel: SmsChannel;
  modemPort?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  smsGatewayDomain?: string | null;
  senderName?: string | null;
}

export interface SendSmsResult {
  success: boolean;
  channel: SmsChannel;
  deliveredTo?: string;
  error?: string;
}

function phoneToEmailSms(phone: string, gatewayDomain: string): string {
  // Strip to digits only — keep country code for international, but remove leading +
  const digits = phone.replace(/\D/g, "");
  // For US numbers with country code: strip leading 1 if 11 digits
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return `${local}@${gatewayDomain}`;
}

async function sendViaEmailSms(opts: SendSmsOptions): Promise<SendSmsResult> {
  if (!opts.smtpHost || !opts.smtpUser || !opts.smtpPassword) {
    return {
      success: false,
      channel: "email-sms",
      error: "SMTP not configured. Go to /config and set SMTP Host, User, and Password.",
    };
  }

  if (!opts.smsGatewayDomain) {
    return {
      success: false,
      channel: "email-sms",
      error: "SMS Gateway Domain not set. Go to /config and enter your carrier's gateway domain (e.g. txt.att.net for AT&T).",
    };
  }

  const toAddress = phoneToEmailSms(opts.phone, opts.smsGatewayDomain);

  const transporter = nodemailer.createTransport({
    host: opts.smtpHost,
    port: opts.smtpPort ?? 587,
    secure: (opts.smtpPort ?? 587) === 465,
    auth: {
      user: opts.smtpUser,
      pass: opts.smtpPassword,
    },
    tls: {
      rejectUnauthorized: false, // allow self-signed certs on dev SMTP servers
    },
  });

  try {
    // Verify SMTP connection before sending
    await transporter.verify();

    await transporter.sendMail({
      from: `"${opts.senderName ?? "PhantomBusiness"}" <${opts.smtpUser}>`,
      to: toAddress,
      subject: "", // Carriers ignore subject; keep empty so only OTP text arrives
      text: opts.message,
    });

    logger.info({ phone: opts.phone, toAddress, gateway: opts.smsGatewayDomain }, "Email-to-SMS sent successfully");
    return { success: true, channel: "email-sms", deliveredTo: toAddress };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, phone: opts.phone, toAddress }, "Email-to-SMS failed");
    return { success: false, channel: "email-sms", error: `SMTP error: ${message}` };
  }
}

async function sendViaModem(opts: SendSmsOptions): Promise<SendSmsResult> {
  if (!opts.modemPort) {
    return {
      success: false,
      channel: "modem",
      error: "Modem port not configured. Set modemPort in /config (e.g. /dev/ttyUSB0 on Linux, COM3 on Windows).",
    };
  }

  try {
    const { SerialPort } = await import("serialport");
    const { ReadlineParser } = await import("@serialport/parser-readline");

    const port = new SerialPort({
      path: opts.modemPort,
      baudRate: 115200,
      autoOpen: false,
    });

    return await new Promise<SendSmsResult>((resolve) => {
      const timeout = setTimeout(() => {
        try { port.close(); } catch (_) {}
        resolve({ success: false, channel: "modem", error: "Modem response timeout (15s). Check port and connection." });
      }, 15000);

      const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));
      let step = 0;
      const safePhone = opts.phone.replace(/[^+\d]/g, "");
      const safeMsg = opts.message.replace(/[^\x20-\x7E]/g, "");

      parser.on("data", (line: string) => {
        const l = line.trim();
        if (!l) return;
        logger.debug({ step, line: l }, "Modem AT response");

        if (step === 0 && l === "OK") {
          step = 1;
          port.write("AT+CMGF=1\r"); // text mode
        } else if (step === 1 && l === "OK") {
          step = 2;
          port.write(`AT+CMGS="${safePhone}"\r`);
        } else if (step === 2 && l.includes(">")) {
          step = 3;
          port.write(`${safeMsg}\x1A`); // CTRL+Z sends the SMS
        } else if (step === 3 && l.startsWith("+CMGS:")) {
          clearTimeout(timeout);
          try { port.close(); } catch (_) {}
          logger.info({ phone: safePhone }, "SMS sent via GSM modem");
          resolve({ success: true, channel: "modem", deliveredTo: safePhone });
        } else if (l === "ERROR" || l.startsWith("+CMS ERROR") || l.startsWith("+CME ERROR")) {
          clearTimeout(timeout);
          try { port.close(); } catch (_) {}
          resolve({ success: false, channel: "modem", error: `Modem AT error: ${l}` });
        }
      });

      port.open((err) => {
        if (err) {
          clearTimeout(timeout);
          resolve({ success: false, channel: "modem", error: `Cannot open port ${opts.modemPort}: ${err.message}` });
          return;
        }
        port.write("AT\r"); // handshake
      });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "Modem init error");
    return { success: false, channel: "modem", error: `Modem error: ${message}` };
  }
}

export async function sendSms(opts: SendSmsOptions): Promise<SendSmsResult> {
  switch (opts.channel) {
    case "modem":
      return sendViaModem(opts);
    case "email-sms":
      return sendViaEmailSms(opts);
    case "dev":
    default:
      logger.info(
        { phone: opts.phone, message: opts.message },
        "[DEV] SMS not sent — switch channel to email-sms or modem in /config"
      );
      return {
        success: false,
        channel: "dev",
        error: "Dev mode: SMS not sent. Configure email-sms or modem channel in /config to send real messages.",
      };
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
        try { port.close(); } catch (_) {}
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
          const raw = match ? parseInt(match[1], 10) : null;
          const signal = raw === 99 ? null : raw; // 99 = unknown
          clearTimeout(timeout);
          try { port.close(); } catch (_) {}
          resolve({ connected: true, signal });
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
