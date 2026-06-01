import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const PLANS = {
  daily: { amount_pesewas: 5100, days: 1, label: "Daily Pass" },
  monthly: { amount_pesewas: 30000, days: 30, label: "Monthly" },
  quarterly: { amount_pesewas: 80000, days: 90, label: "Quarterly" },
  lifetime: { amount_pesewas: 500000, days: null as number | null, label: "Lifetime" },
} as const;

export type PlanKey = keyof typeof PLANS;

export const initPaystackCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      plan: z.enum(["daily", "monthly", "quarterly", "lifetime"]),
      callback_url: z.string().url(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const plan = PLANS[data.plan];
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Paystack not configured");

    // Get user email
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    const email = profile?.email;
    if (!email) throw new Error("Missing user email");

    const reference = `pb808_${data.plan}_${userId.slice(0, 8)}_${Date.now()}`;

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: plan.amount_pesewas, // pesewas
        currency: "GHS",
        reference,
        callback_url: data.callback_url,
        metadata: { user_id: userId, plan: data.plan },
      }),
    });
    const json = (await res.json()) as {
      status: boolean;
      message: string;
      data?: { authorization_url: string; reference: string; access_code: string };
    };
    if (!json.status || !json.data) {
      console.error("Paystack init failed", json);
      throw new Error(json.message || "Paystack init failed");
    }

    // Record pending payment
    await supabaseAdmin.from("payments").insert({
      user_id: userId,
      reference: json.data.reference,
      amount_pesewas: plan.amount_pesewas,
      plan: data.plan,
      status: "pending",
      provider: "paystack",
      currency: "GHS",
    });

    return { authorization_url: json.data.authorization_url, reference: json.data.reference };
  });

export const verifyPaystackPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reference: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Paystack not configured");

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const json = (await res.json()) as {
      status: boolean;
      data?: { status: string; reference: string; amount: number; metadata?: { user_id?: string; plan?: PlanKey } };
    };
    if (!json.status || !json.data) return { ok: false };

    const paid = json.data.status === "success";
    if (!paid) return { ok: false };

    const userId = context.userId;
    const planKey = (json.data.metadata?.plan ?? "daily") as PlanKey;
    await activateSubscription(userId, planKey, json.data.reference, json.data.amount);
    return { ok: true };
  });

async function activateSubscription(
  userId: string,
  planKey: PlanKey,
  reference: string,
  amount_pesewas: number,
) {
  const plan = PLANS[planKey];

  // Mark payment success (idempotent)
  await supabaseAdmin
    .from("payments")
    .update({ status: "success", paid_at: new Date().toISOString() })
    .eq("reference", reference);

  // Look for existing active sub to extend
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
    await supabaseAdmin
      .from("subscriptions")
      .update({ plan: planKey, expires_at: newExpires, payment_reference: reference, amount_pesewas })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin.from("subscriptions").insert({
      user_id: userId,
      plan: planKey,
      status: "active",
      starts_at: now.toISOString(),
      expires_at: newExpires,
      payment_reference: reference,
      amount_pesewas,
      currency: "GHS",
    });
  }

  await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    type: "subscription",
    title: "VIP activated 🎉",
    body: `${plan.label} plan activated${newExpires ? ` until ${new Date(newExpires).toUTCString()}` : " (lifetime)"}.`,
    url: "/dashboard",
  });

  await supabaseAdmin.from("activity_logs").insert({
    user_id: userId,
    action: "subscription_activated",
    metadata: { plan: planKey, reference, amount_pesewas },
  });
}
