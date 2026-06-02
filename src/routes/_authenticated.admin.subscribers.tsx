import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, Plus, Minus, Ban } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatGHS, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/subscribers")({
  head: () => ({ meta: [{ title: "Subscribers · Admin" }] }),
  component: AdminSubscribers,
});

type Sub = {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  starts_at: string;
  expires_at: string | null;
  amount_pesewas: number;
  payment_reference: string | null;
  created_at: string;
};

type Profile = { id: string; email: string | null; display_name: string | null };

function AdminSubscribers() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-subs"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data: subs, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = Array.from(new Set((subs ?? []).map((s) => s.user_id)));
      const profMap: Record<string, Profile> = {};
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles").select("id,email,display_name").in("id", ids);
        for (const p of profs ?? []) profMap[p.id] = p as Profile;
      }
      return { subs: (subs ?? []) as Sub[], profMap };
    },
  });

  const extend = useMutation({
    mutationFn: async ({ id, days, current }: { id: string; days: number; current: string | null }) => {
      const base = current && new Date(current) > new Date() ? new Date(current) : new Date();
      base.setUTCDate(base.getUTCDate() + days);
      const { error } = await supabase
        .from("subscriptions")
        .update({ expires_at: base.toISOString(), status: "active" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-subs"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("subscriptions").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cancelled"); qc.invalidateQueries({ queryKey: ["admin-subs"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const ql = q.toLowerCase().trim();
    if (!ql) return data?.subs ?? [];
    return (data?.subs ?? []).filter((s) => {
      const p = data?.profMap[s.user_id];
      return (
        p?.email?.toLowerCase().includes(ql) ||
        p?.display_name?.toLowerCase().includes(ql) ||
        s.plan.toLowerCase().includes(ql) ||
        s.status.toLowerCase().includes(ql) ||
        s.payment_reference?.toLowerCase().includes(ql)
      );
    });
  }, [data, q]);

  const exportCSV = () => {
    const header = ["email","name","plan","status","starts_at","expires_at","amount_ghs","reference"];
    const lines = [header.join(",")];
    for (const s of rows) {
      const p = data?.profMap[s.user_id];
      const cells = [
        p?.email ?? "", p?.display_name ?? "",
        s.plan, s.status, s.starts_at, s.expires_at ?? "",
        (s.amount_pesewas/100).toFixed(2), s.payment_reference ?? "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
      lines.push(cells.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `subscribers-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return null;
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container mx-auto flex flex-1 items-center justify-center px-4 py-20">
          <Card className="p-10 text-center">
            <h1 className="font-display text-xl font-bold">Admins only</h1>
            <Link to="/dashboard" className="mt-3 inline-block text-primary-glow hover:underline">→ Dashboard</Link>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-10">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to admin
        </Link>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-extrabold">Subscribers</h1>
            <p className="text-sm text-muted-foreground">Manage VIP subscriptions, extend or cancel access.</p>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Search email, plan, ref…" value={q} onChange={(e) => setQ(e.target.value)} className="md:w-72" />
            <Button variant="outline" onClick={exportCSV}><Download className="mr-2 h-4 w-4" />CSV</Button>
          </div>
        </div>

        <Card className="mt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No subscribers yet.</TableCell></TableRow>
              ) : rows.map((s) => {
                const p = data?.profMap[s.user_id];
                const expired = s.expires_at && new Date(s.expires_at) < new Date();
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{p?.display_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{p?.email ?? s.user_id.slice(0,8)}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{s.plan}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={s.status === "active" && !expired ? "default" : "secondary"} className="capitalize">
                        {expired ? "expired" : s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(s.starts_at)}</TableCell>
                    <TableCell className="text-xs">{s.expires_at ? formatDate(s.expires_at) : "Lifetime"}</TableCell>
                    <TableCell>{formatGHS(s.amount_pesewas)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => extend.mutate({ id: s.id, days: 7, current: s.expires_at })} title="Extend 7 days">
                          <Plus className="h-3 w-3" />7d
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => extend.mutate({ id: s.id, days: 30, current: s.expires_at })} title="Extend 30 days">
                          <Plus className="h-3 w-3" />30d
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => extend.mutate({ id: s.id, days: -7, current: s.expires_at })} title="Reduce 7 days">
                          <Minus className="h-3 w-3" />7d
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => { if (confirm("Cancel this subscription?")) cancel.mutate(s.id); }}>
                          <Ban className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
