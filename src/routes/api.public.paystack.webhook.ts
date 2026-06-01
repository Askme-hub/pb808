import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PLANS, type PlanKey } from "@/lib/paystack.functions";

export const Route = createFileRoute("/api/public/paystack/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) return new Response("Not configured", { status: 500 });

        const sig = request.headers.get("x-paystack-signature") ?? "";
        const body = await request.text();
        const expected = createHmac("sha512", secret).update(body).digest("hex");
        try {
          const a = Buffer.from(sig, "hex");
          const b = Buffer.from(expected, "hex");
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response("Invalid signature", { status: 401 });
          }
        } catch {
          return new Response("Invalid signature", { status: 401 });
        }

        let evt: any;
        try { evt = JSON.parse(body); } catch { return new Response("Bad payload", { status: 400 }); }

        if (evt?.event !== "charge.success") {
          return new Response("ok"); // ignore other events
        }
        const d = evt.data ?? {};
        const reference: string | undefined = d.reference;
        const amount: number = Number(d.amount ?? 0);
        const userId: string | undefined = d.metadata?.user_id;
        const planKey = (d.metadata?.plan ?? "daily") as PlanKey;
        if (!reference || !userId || !(planKey in PLANS)) {
          return new Response("Missing fields", { status: 400 });
        }

        // Idempotency: if payment already success, exit early
        const { data: existingPay } = await supabaseAdmin
          .from("payments")
          .select("status")
          .eq("reference", reference)
          .maybeSingle();
        if (existingPay?.status === "success") return new Response("ok");

        const plan = PLANS[planKey];

        await supabaseAdmin
          .from("payments")
          .upsert({
            user_id: userId,
            reference,
            amount_pesewas: amount,
            plan: planKey,
            status: "success",
            provider: "paystack",
            currency: "GHS",
            paid_at: new Date().toISOString(),
            provider_response: d,
          }, { onConflict: "reference" });

        const { data: existing } = await supabaseAdmin
          .from("subscriptions")
          .select("id, expires_at")
          .eq("user_id", userId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const now = new Date();
        let newExpires: string | null = null;
        if (plan.days !== null) {
          const base = existing?.expires_at && new Date(existing.expires_at) > now
            ? new Date(existing.expires_at)
            : now;
          base.setUTCDate(base.getUTCDate() + plan.days);
          newExpires = base.toISOString();
        }

        if (existing) {
          await supabaseAdmin.from("subscriptions").update({
            plan: planKey, expires_at: newExpires, payment_reference: reference, amount_pesewas: amount,
          }).eq("id", existing.id);
        } else {
          await supabaseAdmin.from("subscriptions").insert({
            user_id: userId, plan: planKey, status: "active",
            starts_at: now.toISOString(), expires_at: newExpires,
            payment_reference: reference, amount_pesewas: amount, currency: "GHS",
          });
        }

        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          type: "payment_confirmation",
          title: "VIP activated 🎉",
          body: `${plan.label} plan activated${newExpires ? ` until ${new Date(newExpires).toUTCString()}` : " (lifetime)"}.`,
          url: "/dashboard",
        });

        await supabaseAdmin.from("activity_logs").insert({
          user_id: userId, action: "subscription_activated_webhook",
          metadata: { plan: planKey, reference, amount_pesewas: amount },
        });

        return new Response("ok");
      },
    },
  },
});
