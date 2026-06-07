import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, X, LogOut, User as UserIcon, Crown, Shield } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wordmark } from "@/components/brand/Logo";
import { useAuth } from "@/lib/auth";
import { useStaffNotifications } from "@/hooks/use-staff-notifications";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/predictions", label: "Free Tips" },
  { to: "/vip", label: "VIP" },
  { to: "/results", label: "Results" },
  { to: "/blog", label: "Blog" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const { user, isVip, isStaff, signOut } = useAuth();
  const { unread } = useStaffNotifications();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="shrink-0"><Wordmark /></Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "rounded-md px-3 py-2 text-sm font-medium text-foreground bg-accent" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              {isStaff && (
                <Button asChild variant="outline" size="sm" className="relative">
                  <Link to="/admin">
                    <Shield className="mr-1 h-4 w-4" />Admin
                    {unread > 0 && (
                      <Badge className="ml-1 h-5 min-w-5 justify-center rounded-full bg-gradient-primary px-1.5 text-[10px] font-bold text-primary-foreground shadow-glow">
                        {unread > 99 ? "99+" : unread}
                      </Badge>
                    )}
                  </Link>
                </Button>
              )}
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard">
                  {isVip ? <Crown className="mr-1 h-4 w-4 text-gold" /> : <UserIcon className="mr-1 h-4 w-4" />}
                  Dashboard
                </Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/login">Login</Link></Button>
              <Button asChild size="sm" className="bg-gradient-primary shadow-glow">
                <Link to="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        <button
          aria-label="Toggle menu"
          className="rounded-md p-2 text-foreground md:hidden"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <div className="container mx-auto flex flex-col gap-1 px-4 py-3">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                {n.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 pt-2 border-t border-border/60">
              {user ? (
                <>
                  {isStaff && (
                    <Button asChild variant="outline" className="w-full justify-start" onClick={() => setOpen(false)}>
                      <Link to="/admin">
                        <Shield className="mr-2 h-4 w-4" />Admin Panel
                        {unread > 0 && (
                          <Badge className="ml-auto h-5 min-w-5 justify-center rounded-full bg-gradient-primary px-1.5 text-[10px] font-bold text-primary-foreground shadow-glow">
                            {unread > 99 ? "99+" : unread}
                          </Badge>
                        )}
                      </Link>
                    </Button>
                  )}
                  <div className="flex gap-2">
                    <Button asChild variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                      <Link to="/dashboard">Dashboard</Link>
                    </Button>
                    <Button variant="ghost" onClick={async () => { await signOut(); setOpen(false); navigate({ to: "/" }); }}>
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex gap-2">
                  <Button asChild variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button asChild className="flex-1 bg-gradient-primary" onClick={() => setOpen(false)}>
                    <Link to="/signup">Sign Up</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
