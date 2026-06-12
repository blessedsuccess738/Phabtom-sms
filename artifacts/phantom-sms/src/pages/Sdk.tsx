import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Terminal, ServerCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function Sdk() {
  const { toast } = useToast();
  
  const baseUrl = window.location.origin;

  const kotlinCode = `// PhantomSMS Android Client
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

class PhantomSMS(private val baseUrl: String, private val appId: String) {

    suspend fun sendOtp(phone: String): String = withContext(Dispatchers.IO) {
        val url = URL("$baseUrl/api/otp/send")
        with(url.openConnection() as HttpURLConnection) {
            requestMethod = "POST"
            setRequestProperty("Content-Type", "application/json")
            doOutput = true
            
            val json = JSONObject().apply {
                put("phone", phone)
                put("appId", appId)
            }
            
            outputStream.write(json.toString().toByteArray())
            
            val response = inputStream.bufferedReader().readText()
            val result = JSONObject(response)
            if (result.getBoolean("success")) {
                return@withContext result.getString("requestId")
            } else {
                throw Exception("Failed to send OTP")
            }
        }
    }

    suspend fun verifyOtp(phone: String, code: String, requestId: String? = null): Boolean = withContext(Dispatchers.IO) {
        val url = URL("$baseUrl/api/otp/verify")
        with(url.openConnection() as HttpURLConnection) {
            requestMethod = "POST"
            setRequestProperty("Content-Type", "application/json")
            doOutput = true
            
            val json = JSONObject().apply {
                put("phone", phone)
                put("code", code)
                requestId?.let { put("requestId", it) }
            }
            
            outputStream.write(json.toString().toByteArray())
            
            val response = inputStream.bufferedReader().readText()
            val result = JSONObject(response)
            return@withContext result.getBoolean("verified")
        }
    }
}`;

  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: description,
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">SDK Integration</h1>
        <p className="text-muted-foreground mt-1">Client libraries and endpoint specifications</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-border shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <Terminal className="w-32 h-32" />
            </div>
            <CardHeader className="border-b border-border bg-muted/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="uppercase tracking-widest text-sm text-primary">Kotlin / Android Client</CardTitle>
                <CardDescription className="text-xs font-mono mt-1">PhantomSMS.kt</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard(kotlinCode, "Kotlin SDK code copied")}
                className="border-primary/50 text-primary hover:bg-primary/10 uppercase tracking-widest text-xs h-8"
              >
                <Copy className="w-3 h-3 mr-2" /> Copy SDK
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <pre className="p-6 text-xs font-mono text-muted-foreground overflow-x-auto bg-black/40 m-0">
                <code dangerouslySetInnerHTML={{__html: highlightKotlin(kotlinCode)}} />
              </pre>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card border-border shadow-2xl">
            <CardHeader className="border-b border-border bg-muted/20">
              <CardTitle className="uppercase tracking-widest text-sm flex items-center text-primary">
                <ServerCog className="w-4 h-4 mr-2" />
                API Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Base URL</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => copyToClipboard(baseUrl, "Base URL copied")}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <div className="p-2 bg-black/40 rounded border border-border/50 font-mono text-xs break-all text-primary">
                  {baseUrl}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">1. Send Payload</span>
                <div className="p-3 bg-black/40 rounded border border-border/50 space-y-2 relative group">
                  <div className="flex items-center text-xs font-mono">
                    <span className="text-green-500 mr-2 font-bold">POST</span>
                    <span className="text-muted-foreground">/api/otp/send</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 font-mono">
                    {`{ "phone": "+1...", "appId": "..." }`}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">2. Verify Payload</span>
                <div className="p-3 bg-black/40 rounded border border-border/50 space-y-2 relative group">
                  <div className="flex items-center text-xs font-mono">
                    <span className="text-green-500 mr-2 font-bold">POST</span>
                    <span className="text-muted-foreground">/api/otp/verify</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 font-mono">
                    {`{ "phone": "+1...", "code": "123456" }`}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Super simple syntax highlighter for the brutalist aesthetic
function highlightKotlin(code: string) {
  return code
    .replace(/val /g, '<span class="text-blue-400">val </span>')
    .replace(/var /g, '<span class="text-blue-400">var </span>')
    .replace(/class /g, '<span class="text-purple-400">class </span>')
    .replace(/fun /g, '<span class="text-purple-400">fun </span>')
    .replace(/suspend /g, '<span class="text-purple-400">suspend </span>')
    .replace(/private /g, '<span class="text-orange-400">private </span>')
    .replace(/return /g, '<span class="text-orange-400">return </span>')
    .replace(/if /g, '<span class="text-orange-400">if </span>')
    .replace(/else /g, '<span class="text-orange-400">else </span>')
    .replace(/throw /g, '<span class="text-orange-400">throw </span>')
    .replace(/true/g, '<span class="text-primary">true</span>')
    .replace(/false/g, '<span class="text-destructive">false</span>')
    .replace(/null/g, '<span class="text-destructive">null</span>')
    .replace(/"(.*?)"/g, '<span class="text-green-400">"$1"</span>')
    .replace(/\/\/(.*)/g, '<span class="text-muted-foreground/50">//$1</span>');
}
