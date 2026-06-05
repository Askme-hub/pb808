import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Search } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users · Admin" }] }),
  component: AdminUsers,
});

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  phone: string | null;
  referral_code: string | null;
  created_at: string;
};

function AdminUsers() {
  const { isStaff, loading } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,display_name,phone,referral_code,created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as Profile[];
    },
  });

  useEffect(() => {
    if (!isStaff) return;
    const ch = supabase
      .channel("admin-users-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-users"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isStaff, qc]);

  const rows = useMemo(() => {
    const ql = q.toLowerCase().trim();
    if (!ql) return data ?? [];
    return (data ?? []).filter((p) =>
      p.email?.toLowerCase().includes(ql) ||
      p.display_name?.toLowerCase().includes(ql) ||
      p.phone?.toLowerCase().includes(ql) ||
      p.referral_code?.toLowerCase().includes(ql)
    );
  }, [data, q]);

  const exportCSV = () => {
    const header = ["email", "name", "phone", "referral_code", "created_at"];
    const lines = [header.join(",")];
    for (const p of rows) {
      const cells = [p.email ?? "", p.display_name ?? "", p.phone ?? "", p.referral_code ?? "", p.created_at]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`);
      lines.push(cells.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return null;
  if (!isStaff) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container mx-auto flex flex-1 items-center justify-center px-4 py-20">
          <Card className="p-10 text-center">
            <h1 className="font-display text-xl font-bold">Staff only</h1>
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
            <h1 className="font-display text-3xl font-extrabold">Registered Users</h1>
            <p className="text-sm text-muted-foreground">
              {rows.length.toLocaleString()} {rows.length === 1 ? "user" : "users"} · live updates
              <Badge variant="outline" className="ml-2"><span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />realtime</Badge>
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search email, name, phone…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 md:w-72" />
            </div>
            <Button variant="outline" onClick={exportCSV}><Download className="mr-2 h-4 w-4" />CSV</Button>
          </div>
        </div>

        <Card className="mt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Referral</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No users found.</TableCell></TableRow>
              ) : rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.display_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.phone ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.referral_code ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
