import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { initPaystackCheckout } from "@/lib/paystack.functions";

type Props = {
  plan: "daily" | "monthly" | "quarterly" | "lifetime";
  className?: string;
  children: React.ReactNode;
};

export function CheckoutButton({ plan, className, children }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const init = useServerFn(initPaystackCheckout);
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    if (!user) { navigate({ to: "/signup" }); return; }
    setLoading(true);
    try {
      const res = await init({
        data: { plan, callback_url: `${window.location.origin}/dashboard?paystack=verify` },
      });
      window.location.href = res.authorization_url;
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start checkout");
      setLoading(false);
    }
  };

  return (
    <Button onClick={onClick} disabled={loading} className={className}>
      {loading ? "Redirecting…" : children}
    </Button>
  );
}
