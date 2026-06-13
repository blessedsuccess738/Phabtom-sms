import { Link, useLocation } from "wouter";
import {
  Activity,
  TerminalSquare,
  Settings,
  Code2,
  Signal,
  Radio,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useGetGatewayStatus, useHealthCheck } from "@workspace/api-client-react";
import { useAuth } from "@/lib/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: status } = useGetGatewayStatus();
  const { data: health } = useHealthCheck();
  const { user, logout } = useAuth();

  const navItems = [
    { href: "/", label: "Overview", icon: Activity },
    { href: "/logs", label: "Event Logs", icon: TerminalSquare },
    { href: "/config", label: "Configuration", icon: Settings },
    { href: "/sdk", label: "SDK Integration", icon: Code2 },
  ];

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-mono text-sm">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col z-10 shadow-2xl">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Radio className="w-5 h-5 text-primary mr-3" />
          <span className="font-bold tracking-tight text-primary uppercase">Phantom.SMS</span>
        </div>

        <div className="p-4">
          <div className="text-xs text-muted-foreground font-semibold mb-4 uppercase tracking-wider">Navigation</div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-md transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/5"
                  }`}
                >
                  <item.icon className="w-4 h-4 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-border space-y-4">
          {/* Gateway Status */}
          <div>
            <div className="text-xs text-muted-foreground font-semibold mb-3 uppercase tracking-wider flex justify-between items-center">
              <span>Gateway Status</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  health?.status === "ok"
                    ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"
                    : "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                }`}
                title={`API: ${health?.status || "Unknown"}`}
              />
            </div>
            {status ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">State</span>
                  <span className={`flex items-center ${status.online ? "text-green-500" : "text-destructive"}`}>
                    {status.online ? "Online" : "Offline"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Channel</span>
                  <span className="text-foreground capitalize">{status.channel}</span>
                </div>
                {status.channel === "modem" && status.signal !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Signal</span>
                    <span className="flex items-center text-primary">
                      <Signal className="w-3 h-3 mr-1" />
                      {status.signal}/31
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground animate-pulse text-xs">Checking status...</div>
            )}
          </div>

          {/* User menu */}
          {user && (
            <div className="border-t border-border/50 pt-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent/10 transition-colors text-left">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName ?? "User"}
                        className="w-7 h-7 rounded-full ring-1 ring-primary/30"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                        {user.displayName?.[0]?.toUpperCase() ?? "U"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {user.displayName ?? "User"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" className="w-48 bg-popover border-border">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-background/50">
        <header className="h-16 flex items-center px-8 border-b border-border bg-card/50 backdrop-blur-sm z-10">
          <div className="flex-1" />
          <div className="flex items-center space-x-4 text-xs">
            <span className="text-muted-foreground">SYSTEM.TIME</span>
            <span className="text-primary font-mono">
              {new Date().toISOString().replace("T", " ").slice(0, 19)}
            </span>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
