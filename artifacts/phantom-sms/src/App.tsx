import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Dashboard } from "@/pages/Dashboard";
import { Logs } from "@/pages/Logs";
import { Config } from "@/pages/Config";
import { Sdk } from "@/pages/Sdk";
import { Keys } from "@/pages/Keys";
import { Login } from "@/pages/Login";
import { Loader2, ShieldX } from "lucide-react";

// Only these emails can access the admin panel
const ADMIN_EMAILS = ["blessedsuccess538@gmail.com"];

const queryClient = new QueryClient();

function Unauthorized() {
  const { logout, user } = useAuth();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center font-mono">
      <div className="text-center space-y-4 max-w-sm mx-4">
        <ShieldX className="w-12 h-12 text-destructive mx-auto" />
        <h1 className="text-xl font-bold tracking-widest uppercase text-destructive">Access Denied</h1>
        <p className="text-muted-foreground text-sm">
          <span className="font-medium text-foreground">{user?.email}</span> is not authorized to access this panel.
        </p>
        <button
          onClick={logout}
          className="mt-4 px-6 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
        >
          Sign out and try a different account
        </button>
      </div>
    </div>
  );
}

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Login />;

  if (!ADMIN_EMAILS.includes(user.email ?? "")) return <Unauthorized />;

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/logs" component={Logs} />
        <Route path="/config" component={Config} />
        <Route path="/keys" component={Keys} />
        <Route path="/sdk" component={Sdk} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
