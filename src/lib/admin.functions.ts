import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const StaffRole = z.enum(["admin", "sub_admin"]);
const GrantInput = z.object({
  email: z.string().trim().email().max(255),
  role: StaffRole.default("sub_admin"),
});
const RevokeInput = z.object({
  user_id: z.string().uuid(),
  role: StaffRole,
});

async function assertCallerIsAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: super-admin only");
}

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertCallerIsAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, created_at")
      .in("role", ["admin", "sub_admin"])
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
    if (!ids.length) {
      return { staff: [] as Array<{ user_id: string; role: "admin" | "sub_admin"; email: string; display_name: string | null; created_at: string }> };
    }
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, display_name")
      .in("id", ids);
    const map = new Map((profiles ?? []).map((p) => [p.id, p]));
    return {
      staff: (roles ?? []).map((r) => ({
        user_id: r.user_id,
        role: r.role as "admin" | "sub_admin",
        created_at: r.created_at as string,
        email: map.get(r.user_id)?.email ?? "—",
        display_name: map.get(r.user_id)?.display_name ?? null,
      })),
    };
  });

export const grantStaffByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GrantInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertCallerIsAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .ilike("email", data.email)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile) throw new Error("No user found with that email. They must sign up first.");
    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: profile.id, role: data.role });
    if (insErr && !insErr.message.includes("duplicate")) throw new Error(insErr.message);
    return { ok: true, email: profile.email, role: data.role };
  });

export const revokeStaffRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RevokeInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertCallerIsAdmin(context.userId);
    if (data.user_id === context.userId && data.role === "admin") {
      throw new Error("You cannot revoke your own admin access.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.role === "admin") {
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1) throw new Error("Cannot remove the last admin.");
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Legacy aliases (kept so old imports don't break during rollout)
export const listAdmins = listStaff;
export const addAdminByEmail = grantStaffByEmail;
export const revokeAdminByUserId = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCallerIsAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) <= 1) throw new Error("Cannot remove the last admin.");
    const { error } = await supabaseAdmin
      .from("user_roles").delete().eq("user_id", data.user_id).eq("role", "admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
