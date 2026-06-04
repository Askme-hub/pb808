import { useState, useEffect } from "react";
import logoAsset from "@/assets/logo.asset.json";

export function Preloader({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => setIsLoading(false), 600);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!isLoading) return <>{children}</>;

  return (
    <>
      <div
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <div className="heartbeat-container">
          <img
            src={logoAsset.url}
            alt="Pressureboy808"
            className="heartbeat-logo h-32 w-32 rounded-full object-cover shadow-glow"
          />
        </div>
        <p className="mt-6 font-display text-sm font-semibold tracking-widest text-primary-glow uppercase animate-pulse">
          Loading...
        </p>
      </div>
      {!fadeOut && <div className="hidden">{children}</div>}
    </>
  );
}
