import { useGetGatewayConfig, useUpdateGatewayConfig, useTestGateway, GatewayConfigInputChannel } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Send, Loader2, RefreshCw, Info } from "lucide-react";

const configSchema = z.object({
  channel: z.enum(["modem", "email-sms", "dev"]),
  otpLength: z.coerce.number().min(4).max(10),
  otpExpirySeconds: z.coerce.number().min(60).max(3600),
  maxAttempts: z.coerce.number().min(1).max(10),
  rateWindowSeconds: z.coerce.number().min(60),
  maxPerWindow: z.coerce.number().min(1),
  modemPort: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smsGatewayDomain: z.string().optional(),
  senderName: z.string().optional(),
});

type ConfigFormValues = z.infer<typeof configSchema>;

const CARRIER_GATEWAYS = [
  { label: "AT&T (USA)", domain: "txt.att.net" },
  { label: "T-Mobile (USA)", domain: "tmomail.net" },
  { label: "Verizon (USA)", domain: "vtext.com" },
  { label: "Sprint (USA)", domain: "messaging.sprintpcs.com" },
  { label: "Boost Mobile (USA)", domain: "sms.myboostmobile.com" },
  { label: "Cricket (USA)", domain: "mms.cricketwireless.net" },
  { label: "Metro PCS (USA)", domain: "mymetropcs.com" },
  { label: "Google Fi (USA)", domain: "msg.fi.google.com" },
  { label: "Rogers (Canada)", domain: "pcs.rogers.com" },
  { label: "Bell (Canada)", domain: "txt.bell.ca" },
  { label: "Telus (Canada)", domain: "msg.telus.com" },
];

export function Config() {
  const { data: config, isLoading: isConfigLoading } = useGetGatewayConfig();
  const updateConfig = useUpdateGatewayConfig();
  const testGateway = useTestGateway();
  const { toast } = useToast();

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      channel: "email-sms",
      otpLength: 6,
      otpExpirySeconds: 300,
      maxAttempts: 3,
      rateWindowSeconds: 3600,
      maxPerWindow: 5,
      modemPort: "",
      smtpHost: "",
      smtpPort: 587,
      smtpUser: "",
      smtpPassword: "",
      smsGatewayDomain: "",
      senderName: "Phantom",
    }
  });

  const initializedRef = useRef(false);

  useEffect(() => {
    if (config && !initializedRef.current) {
      form.reset({
        channel: config.channel,
        otpLength: config.otpLength,
        otpExpirySeconds: config.otpExpirySeconds,
        maxAttempts: config.maxAttempts,
        rateWindowSeconds: config.rateWindowSeconds,
        maxPerWindow: config.maxPerWindow,
        modemPort: config.modemPort || "",
        smtpHost: config.smtpHost || "",
        smtpPort: config.smtpPort || 587,
        smtpUser: config.smtpUser || "",
        smtpPassword: "",
        smsGatewayDomain: (config as any).smsGatewayDomain || "",
        senderName: config.senderName || "",
      });
      initializedRef.current = true;
    }
  }, [config, form]);

  const onSubmit = (values: ConfigFormValues) => {
    updateConfig.mutate({
      data: {
        ...values,
        channel: values.channel as GatewayConfigInputChannel,
        smtpPassword: values.smtpPassword ? values.smtpPassword : null,
        smsGatewayDomain: values.smsGatewayDomain || null,
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Configuration Saved",
          description: "Gateway settings updated successfully.",
        });
      },
      onError: (err: any) => {
        toast({
          title: "Update Failed",
          description: err?.error || "An unknown error occurred.",
          variant: "destructive",
        });
      }
    });
  };

  const onTestSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const phone = fd.get("phone") as string;
    if (!phone) return;

    testGateway.mutate({ data: { phone } }, {
      onSuccess: (res) => {
        toast({
          title: res.success ? "✓ Test SMS Sent" : "✗ Test Failed",
          description: res.message,
          variant: res.success ? "default" : "destructive",
        });
      },
      onError: (err: any) => {
        toast({
          title: "Transmission Error",
          description: err.error || "Network failure.",
          variant: "destructive",
        });
      }
    });
  };

  if (isConfigLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const channelWatch = form.watch("channel");

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">Configuration</h1>
        <p className="text-muted-foreground mt-1">Configure your SMS channel and delivery settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

              {/* Channel + Core */}
              <Card className="bg-card border-border shadow-2xl">
                <CardHeader className="bg-muted/20 border-b border-border">
                  <CardTitle className="uppercase tracking-widest text-sm flex items-center">
                    <RefreshCw className="w-4 h-4 mr-2 text-primary" />
                    Channel & Core Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="channel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">Active Channel</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background border-border font-mono uppercase">
                                <SelectValue placeholder="Select a channel" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-popover border-border">
                              <SelectItem value="email-sms">Email-to-SMS (Free, no API)</SelectItem>
                              <SelectItem value="modem">Hardware GSM Modem</SelectItem>
                              <SelectItem value="dev">Dev (Log only, no send)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="senderName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">Sender Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-background border-border font-mono" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/50">
                    <FormField
                      control={form.control}
                      name="otpLength"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">OTP Length</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="bg-background border-border font-mono" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="otpExpirySeconds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">Expiry (s)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="bg-background border-border font-mono" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maxAttempts"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">Max Attempts</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="bg-background border-border font-mono" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maxPerWindow"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">Max / Window</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="bg-background border-border font-mono" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Email-to-SMS config */}
              {channelWatch === "email-sms" && (
                <Card className="bg-card border-border shadow-2xl border-t-2 border-t-primary animate-in fade-in slide-in-from-top-4">
                  <CardHeader className="bg-muted/20 border-b border-border">
                    <CardTitle className="uppercase tracking-widest text-sm text-primary">Email-to-SMS Setup</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-1">
                      Your email server sends to <span className="font-mono text-foreground">phonenumber@gateway-domain</span> — the carrier converts it to SMS. No paid API required.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">

                    {/* Carrier Gateway Domain */}
                    <FormField
                      control={form.control}
                      name="smsGatewayDomain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">Carrier Gateway Domain <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="txt.att.net"
                              className="bg-background border-border font-mono text-primary"
                            />
                          </FormControl>
                          <FormDescription className="text-xs text-muted-foreground">
                            Enter the domain for the recipient's carrier. Examples below — pick the one that matches your target phone's network.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Carrier quick-pick */}
                    <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                        <Info className="w-3.5 h-3.5" />
                        Common carrier gateways — click to fill
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {CARRIER_GATEWAYS.map((c) => (
                          <button
                            key={c.domain}
                            type="button"
                            onClick={() => form.setValue("smsGatewayDomain", c.domain)}
                            className="px-2.5 py-1 rounded border border-border/70 bg-background text-xs font-mono text-foreground hover:border-primary hover:text-primary transition-colors"
                          >
                            {c.label}
                            <span className="ml-1.5 text-muted-foreground">{c.domain}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Not listed? Search "[carrier name] email to SMS gateway" — most carriers worldwide offer a free gateway domain.</p>
                    </div>

                    {/* SMTP credentials */}
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">SMTP Credentials (your email account)</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="smtpHost"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">SMTP Host</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="smtp.gmail.com" className="bg-background border-border font-mono" />
                              </FormControl>
                              <FormDescription className="text-xs">Gmail: smtp.gmail.com · Outlook: smtp-mail.outlook.com</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="smtpPort"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">Port</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} className="bg-background border-border font-mono" />
                              </FormControl>
                              <FormDescription className="text-xs">587 (TLS) or 465 (SSL)</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="smtpUser"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">Email / Username</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="you@gmail.com" className="bg-background border-border font-mono" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="smtpPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">Password / App Password</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} placeholder="Leave blank to keep current" className="bg-background border-border font-mono" />
                              </FormControl>
                              <FormDescription className="text-xs">Gmail: use an App Password (not your account password)</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Modem config */}
              {channelWatch === "modem" && (
                <Card className="bg-card border-border shadow-2xl border-t-2 border-t-primary animate-in fade-in slide-in-from-top-4">
                  <CardHeader className="bg-muted/20 border-b border-border">
                    <CardTitle className="uppercase tracking-widest text-sm text-primary">Hardware GSM Modem</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-1">
                      Requires a USB GSM stick (e.g. Huawei E3131) with an active SIM connected to this server.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <FormField
                      control={form.control}
                      name="modemPort"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">Serial Port</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="/dev/ttyUSB0" className="bg-background border-border font-mono" />
                          </FormControl>
                          <FormDescription className="text-xs">Linux: /dev/ttyUSB0 · Windows: COM3 · macOS: /dev/tty.usbmodem*</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}

              {channelWatch === "dev" && (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm text-yellow-400">
                  <strong className="uppercase tracking-widest text-xs">Dev mode active</strong> — OTPs are generated and logged to the server console but no SMS is sent. Switch to <em>Email-to-SMS</em> to deliver real messages.
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={updateConfig.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-widest font-bold px-8 shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all hover:shadow-[0_0_25px_rgba(0,255,255,0.5)]"
                >
                  {updateConfig.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Configuration
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="bg-card border-border shadow-2xl border-t-4 border-t-primary">
            <CardHeader className="bg-muted/10 border-b border-border">
              <CardTitle className="uppercase tracking-widest text-sm">Test Transmission</CardTitle>
              <CardDescription className="text-xs">Fire a real SMS to verify your settings.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={onTestSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground block">Target Number</label>
                  <Input
                    name="phone"
                    placeholder="+12025551234"
                    required
                    className="bg-background border-border font-mono"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={testGateway.isPending}
                  variant="outline"
                  className="w-full uppercase tracking-widest font-bold border-primary/50 text-primary hover:bg-primary/10"
                >
                  {testGateway.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Send Test SMS
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="uppercase tracking-widest text-xs">Quick Setup (Gmail)</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs text-muted-foreground">
              <p>1. Enable 2-Step Verification on your Google account</p>
              <p>2. Go to <span className="font-mono text-foreground">myaccount.google.com → Security → App Passwords</span></p>
              <p>3. Create an App Password and paste it as the SMTP password above</p>
              <p>4. Set Host to <span className="font-mono text-foreground">smtp.gmail.com</span>, Port <span className="font-mono text-foreground">587</span></p>
              <p>5. Click a carrier above, save, then hit Test</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
