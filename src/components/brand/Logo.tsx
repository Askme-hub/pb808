import logo from "@/assets/logo.asset.json";

export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <img
      src={logo.url}
      alt="Pressureboy808 Prediction Hub"
      className={`${className} rounded-md ring-1 ring-primary/40`}
      width={48}
      height={48}
    />
  );
}

export function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <Logo />
      <div className="leading-none">
        <div className="font-display text-base font-bold tracking-tight">
          PRESSUREBOY<span className="text-primary-glow">808</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Prediction Hub
        </div>
      </div>
    </div>
  );
}
