import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Megaphone } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/ads")({
  head: () => ({ meta: [{ title: "Ads · Admin" }] }),
  component: AdminAds,
});

type Placement = "banner_home" | "banner_sidebar" | "banner_inline" | "banner_footer" | "native_prediction" | "native_blog" | "popup";

type Ad = {
  id: string;
  name: string;
  placement: Placement;
  network: string | null;
  code: string;
  is_active: boolean;
  popup_delay_seconds: number | null;
  popup_frequency_hours: number | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

const PLACEMENTS: Placement[] = ["banner_home", "banner_sidebar", "banner_inline", "banner_footer", "native_prediction", "native_blog", "popup"];

const empty: Partial<Ad> = {
  name: "",
  placement: "banner_home",
  network: "",
  code: "",
  is_active: true,
  popup_delay_seconds: 5,
  popup_frequency_hours: 24,
  starts_at: null,
  ends_at: null,
};

function AdminAds() {
  const { isStaff, loading } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Ad> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-ads"],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Ad[];
    },
  });

  useEffect(() => {
    if (!isStaff) return;
    const ch = supabase
      .channel("admin-ads-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "ad_campaigns" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-ads"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isStaff, qc]);

  const upsert = useMutation({
    mutationFn: async (r: Partial<Ad>) => {
      if (!r.name || !r.code || !r.placement) throw new Error("Name, placement, and code are required.");
      const payload = {
        name: r.name.trim(),
        placement: r.placement,
        network: r.network?.trim() || null,
        code: r.code,
        is_active: !!r.is_active,
        popup_delay_seconds: r.popup_delay_seconds ?? null,
        popup_frequency_hours: r.popup_frequency_hours ?? null,
        starts_at: r.starts_at || null,
        ends_at: r.ends_at || null,
      };
      if (r.id) {
        const { error } = await supabase.from("ad_campaigns").update(payload).eq("id", r.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ad_campaigns").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin-ads"] });
      setOpen(false); setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ad_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-ads"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("ad_campaigns").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-ads"] }),
    onError: (e: Error) => toast.error(e.message),
  });

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

  const openNew = () => { setEditing({ ...empty }); setOpen(true); };
  const openEdit = (r: Ad) => { setEditing(r); setOpen(true); };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-10">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to admin
        </Link>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
              <Megaphone className="h-7 w-7 text-primary-glow" /> Ad Campaigns
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage ad placements and code snippets.
              <Badge variant="outline" className="ml-2"><span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />realtime</Badge>
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="bg-gradient-primary"><Plus className="mr-1 h-4 w-4" /> New ad</Button>
            </DialogTrigger>
            <AdDialog value={editing} onChange={setEditing} onSubmit={() => editing && upsert.mutate(editing)} saving={upsert.isPending} />
          </Dialog>
        </div>

        <Card className="mt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead>Network</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : !data?.length ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No ad campaigns yet.</TableCell></TableRow>
              ) : data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{r.placement.replace("_", " ")}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{r.network ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.starts_at ? formatDate(r.starts_at) : "—"} → {r.ends_at ? formatDate(r.ends_at) : "∞"}
                  </TableCell>
                  <TableCell>
                    <Switch checked={r.is_active} onCheckedChange={(v) => toggle.mutate({ id: r.id, is_active: v })} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this ad?")) del.mutate(r.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
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

function AdDialog({
  value, onChange, onSubmit, saving,
}: {
  value: Partial<Ad> | null;
  onChange: (v: Partial<Ad>) => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  if (!value) return null;
  const set = <K extends keyof Ad>(k: K, v: Ad[K]) => onChange({ ...value, [k]: v });
  const isPopup = value.placement === "popup" || value.placement === "interstitial";

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{value.id ? "Edit ad campaign" : "New ad campaign"}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>Name</Label>
          <Input value={value.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="Header banner – AdSense" />
        </div>
        <div>
          <Label>Placement</Label>
          <Select value={value.placement} onValueChange={(v) => set("placement", v as Placement)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PLACEMENTS.map((p) => <SelectItem key={p} value={p}>{p.replace("_", " ")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Network (optional)</Label>
          <Input value={value.network ?? ""} onChange={(e) => set("network", e.target.value)} placeholder="AdSense / Adsterra / Custom" />
        </div>
        <div className="md:col-span-2">
          <Label>Ad code (HTML / JS snippet)</Label>
          <Textarea rows={8} value={value.code ?? ""} onChange={(e) => set("code", e.target.value)} placeholder="<script>...</script>" className="font-mono text-xs" />
        </div>
        {isPopup && (
          <>
            <div>
              <Label>Popup delay (seconds)</Label>
              <Input type="number" min={0} value={value.popup_delay_seconds ?? 5} onChange={(e) => set("popup_delay_seconds", Number(e.target.value))} />
            </div>
            <div>
              <Label>Show every (hours)</Label>
              <Input type="number" min={1} value={value.popup_frequency_hours ?? 24} onChange={(e) => set("popup_frequency_hours", Number(e.target.value))} />
            </div>
          </>
        )}
        <div>
          <Label>Starts at (optional)</Label>
          <Input type="datetime-local" value={value.starts_at?.slice(0, 16) ?? ""} onChange={(e) => set("starts_at", e.target.value ? new Date(e.target.value).toISOString() : null)} />
        </div>
        <div>
          <Label>Ends at (optional)</Label>
          <Input type="datetime-local" value={value.ends_at?.slice(0, 16) ?? ""} onChange={(e) => set("ends_at", e.target.value ? new Date(e.target.value).toISOString() : null)} />
        </div>
        <div className="flex items-center gap-3 md:col-span-2">
          <Switch checked={!!value.is_active} onCheckedChange={(v) => set("is_active", v)} />
          <Label className="!m-0">Active</Label>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={onSubmit} disabled={saving} className="bg-gradient-primary">
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
