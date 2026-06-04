import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Shield, Trash2, UserPlus } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { listAdmins, addAdminByEmail, revokeAdminByUserId } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/roles")({
  head: () => ({ meta: [{ title: "Admin Roles · Pressureboy808" }] }),
  component: AdminRolesPage,
});

function AdminRolesPage() {
  const { isAdmin, loading, user } = useAuth();
  const qc = useQueryClient();
  const list = useServerFn(listAdmins);
  const add = useServerFn(addAdminByEmail);
  const revoke = useServerFn(revokeAdminByUserId);
  const [email, setEmail] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-roles"],
    enabled: isAdmin,
    queryFn: () => list(),
  });

  const addMut = useMutation({
    mutationFn: (e: string) => add({ data: { email: e } }),
    onSuccess: (r) => {
      toast.success(`Granted admin to ${r.email}`);
      setEmail("");
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to add admin"),
  });

  const revokeMut = useMutation({
    mutationFn: (uid: string) => revoke({ data: { user_id: uid } }),
    onSuccess: () => {
      toast.success("Admin access revoked");
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to revoke"),
  });

  if (loading) return null;
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container mx-auto flex flex-1 items-center justify-center px-4 py-20">
          <Card className="p-12 text-center">
            <h1 className="font-display text-2xl font-bold">Admins only</h1>
            <Link to="/dashboard" className="mt-4 inline-block text-primary-glow hover:underline">→ Back to dashboard</Link>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-12">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-extrabold">Admin Roles</h1>
            <p className="mt-1 text-sm text-muted-foreground">Grant or revoke admin access by email.</p>
          </div>
          <Link to="/admin" className="text-sm text-primary-glow hover:underline">← Admin home</Link>
        </div>

        <Card className="p-6">
          <h2 className="font-display text-lg font-bold flex items-center gap-2"><UserPlus className="h-4 w-4" /> Add Admin</h2>
          <form
            className="mt-4 flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!email.trim()) return;
              addMut.mutate(email.trim());
            }}
          >
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1"
            />
            <Button type="submit" disabled={addMut.isPending} className="bg-gradient-primary">
              {addMut.isPending ? "Adding…" : "Grant Admin"}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">User must have signed up first.</p>
        </Card>

        <Card className="mt-6 p-6">
          <h2 className="font-display text-lg font-bold flex items-center gap-2"><Shield className="h-4 w-4" /> Current Admins</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2">Email</th>
                  <th className="py-2">Name</th>
                  <th className="py-2">Since</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Loading…</td></tr>}
                {data?.admins.map((a) => (
                  <tr key={a.user_id} className="border-t border-border/60">
                    <td className="py-3">{a.email}</td>
                    <td className="py-3 text-muted-foreground">{a.display_name ?? "—"}</td>
                    <td className="py-3 text-muted-foreground">{formatDate(a.created_at)}</td>
                    <td className="py-3 text-right">
                      {a.user_id === user?.id ? (
                        <span className="text-xs text-muted-foreground">You</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={revokeMut.isPending}
                          onClick={() => {
                            if (confirm(`Revoke admin from ${a.email}?`)) revokeMut.mutate(a.user_id);
                          }}
                        >
                          <Trash2 className="mr-1 h-3 w-3" /> Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {!isLoading && !data?.admins.length && (
                  <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No admins found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
