import { useGetGatewayConfig, useUpdateGatewayConfig, useTestGateway, GatewayConfigInputChannel } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Send, Loader2, RefreshCw } from "lucide-react";

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
  senderName: z.string().optional(),
});

type ConfigFormValues = z.infer<typeof configSchema>;

export function Config() {
  const { data: config, isLoading: isConfigLoading } = useGetGatewayConfig();
  const updateConfig = useUpdateGatewayConfig();
  const testGateway = useTestGateway();
  const { toast } = useToast();

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      channel: "dev",
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
        smtpPassword: values.smtpPassword ? values.smtpPassword : null
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Configuration Saved",
          description: "Gateway settings have been updated successfully.",
        });
      },
      onError: (err) => {
        toast({
          title: "Update Failed",
          description: err.error || "An unknown error occurred.",
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
          title: res.success ? "Test Passed" : "Test Failed",
          description: res.message,
          variant: res.success ? "default" : "destructive",
        });
      },
      onError: (err: any) => {
        toast({
          title: "Test Transmission Error",
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
        <p className="text-muted-foreground mt-1">Adjust core behavior and routing protocols</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Card className="bg-card border-border shadow-2xl">
                <CardHeader className="bg-muted/20 border-b border-border">
                  <CardTitle className="uppercase tracking-widest text-sm flex items-center">
                    <RefreshCw className="w-4 h-4 mr-2 text-primary" />
                    Routing & Core Rules
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
                              <SelectItem value="dev">DEV (Mock)</SelectItem>
                              <SelectItem value="email-sms">Email-to-SMS (SMTP)</SelectItem>
                              <SelectItem value="modem">Hardware Modem</SelectItem>
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
                          <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">Sender ID</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-background border-border font-mono" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/50">
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
                          <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">Expiry (Seconds)</FormLabel>
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
                          <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">Max Requests / Window</FormLabel>
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

              {channelWatch === "modem" && (
                <Card className="bg-card border-border shadow-2xl animate-in fade-in slide-in-from-top-4">
                  <CardHeader className="bg-muted/20 border-b border-border">
                    <CardTitle className="uppercase tracking-widest text-sm text-primary">Hardware Interface</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <FormField
                      control={form.control}
                      name="modemPort"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">Serial Port (e.g. /dev/ttyUSB0 or COM3)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="/dev/ttyUSB0" className="bg-background border-border font-mono" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}

              {channelWatch === "email-sms" && (
                <Card className="bg-card border-border shadow-2xl animate-in fade-in slide-in-from-top-4">
                  <CardHeader className="bg-muted/20 border-b border-border">
                    <CardTitle className="uppercase tracking-widest text-sm text-primary">SMTP Relay</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="smtpHost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">Host</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="smtp.gmail.com" className="bg-background border-border font-mono" />
                            </FormControl>
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
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="smtpUser"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">Username</FormLabel>
                            <FormControl>
                              <Input {...field} className="bg-background border-border font-mono" />
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
                            <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">Password (leave blank to keep)</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} className="bg-background border-border font-mono" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={updateConfig.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-widest font-bold px-8 shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all hover:shadow-[0_0_25px_rgba(0,255,255,0.5)]"
                >
                  {updateConfig.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Commit Changes
                </Button>
              </div>
            </form>
          </Form>
        </div>

        <div className="space-y-8">
          <Card className="bg-card border-border shadow-2xl border-t-4 border-t-primary">
            <CardHeader className="bg-muted/10 border-b border-border">
              <CardTitle className="uppercase tracking-widest text-sm">Diagnostic Test</CardTitle>
              <CardDescription className="text-xs">Fire a test payload to verify routing.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={onTestSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground block">Target Device</label>
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
                  Execute Test
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
