import { Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/brand/Logo";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card/40 mt-24">
      <div className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-4">
        <div className="space-y-3 md:col-span-2">
          <Wordmark />
          <p className="max-w-sm text-sm text-muted-foreground">
            Ghana's sharpest football prediction hub. Daily free tips, premium VIP
            slips, and verified results — straight to your screen.
          </p>
          <p className="text-xs text-muted-foreground">
            18+. Bet responsibly. Predictions are for entertainment and analysis
            purposes only.
          </p>
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold">Platform</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/predictions" className="hover:text-foreground">Free Tips</Link></li>
            <li><Link to="/vip" className="hover:text-foreground">VIP Predictions</Link></li>
            <li><Link to="/results" className="hover:text-foreground">Results & Stats</Link></li>
            <li><Link to="/blog" className="hover:text-foreground">Blog</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold">Account</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/login" className="hover:text-foreground">Login</Link></li>
            <li><Link to="/signup" className="hover:text-foreground">Sign Up</Link></li>
            <li><Link to="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Pressureboy808 Prediction Hub. All rights reserved.
      </div>
    </footer>
  );
}
