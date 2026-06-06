import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { Preloader } from "@/components/Preloader";
import { StaffNotificationsMount } from "@/hooks/use-staff-notifications";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Back to Pressureboy808
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Pressureboy808 Prediction Hub — Daily Football Tips & VIP Predictions" },
      { name: "description", content: "Ghana's sharpest football predictions. Free daily tips, premium VIP slips, accumulators, correct scores, and verified results." },
      { name: "author", content: "Pressureboy808" },
      { name: "theme-color", content: "#1d2dd6" },
      { property: "og:title", content: "Pressureboy808 Prediction Hub — Daily Football Tips & VIP Predictions" },
      { property: "og:description", content: "Ghana's sharpest football predictions. Free daily tips, premium VIP slips, accumulators, correct scores, and verified results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Pressureboy808 Prediction Hub — Daily Football Tips & VIP Predictions" },
      { name: "twitter:description", content: "Ghana's sharpest football predictions. Free daily tips, premium VIP slips, accumulators, correct scores, and verified results." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/RwW4F6XG3CdbbP0J23KpEpp6ubf2/social-images/social-1780318378212-WhatsApp_Image_2026-06-01_at_4.41.45_AM.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/RwW4F6XG3CdbbP0J23KpEpp6ubf2/social-images/social-1780318378212-WhatsApp_Image_2026-06-01_at_4.41.45_AM.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <Preloader>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StaffNotificationsMount />
          <Outlet />
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </QueryClientProvider>
    </Preloader>
  );
}
