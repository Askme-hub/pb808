import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/predictions")({
  head: () => ({ meta: [{ title: "Predictions Admin · Pressureboy808" }] }),
  component: AdminPredictions,
});

type Row = {
  id: string;
  category: "free" | "vip" | "correct_score" | "over_under" | "btts" | "ht_ft" | "accumulator";
  match_name: string;
  league: string;
  match_date: string;
  match_time: string;
  tip: string;
  odds: number;
  confidence: "low" | "medium" | "high" | "very_high";
  status: "pending" | "won" | "lost" | "void";
  is_published: boolean;
  analysis: string | null;
  result_score: string | null;
};

const CATEGORIES = ["free","vip","correct_score","over_under","btts","ht_ft","accumulator"] as const;
const CONFIDENCES = ["low","medium","high","very_high"] as const;
const STATUSES = ["pending","won","lost","void"] as const;

const empty: Partial<Row> = {
  category: "free", match_name: "", league: "", match_date: new Date().toISOString().slice(0,10),
  match_time: "20:00", tip: "", odds: 1.5, confidence: "medium", status: "pending",
  is_published: true, analysis: "", result_score: "",
};

function AdminPredictions() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Row> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-predictions"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions").select("*")
        .order("match_date", { ascending: false }).limit(200);
      if (error) throw error;
      return data as Row[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (r: Partial<Row>) => {
      const payload = {
        category: r.category, match_name: r.match_name?.trim(), league: r.league?.trim(),
        match_date: r.match_date, match_time: r.match_time, tip: r.tip?.trim(),
        odds: Number(r.odds), confidence: r.confidence, status: r.status,
        is_published: !!r.is_published, analysis: r.analysis || null,
        result_score: r.result_score || null,
      };
      if (r.id) {
        const { error } = await supabase.from("predictions").update(payload).eq("id", r.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("predictions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin-predictions"] });
      setOpen(false); setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("predictions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-predictions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return null;
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container mx-auto flex flex-1 items-center justify-center px-4 py-20">
          <Card className="p-12 text-center">Admins only.</Card>
        </main>
        <Footer />
      </div>
    );
  }

  const openNew = () => { setEditing({ ...empty }); setOpen(true); };
  const openEdit = (r: Row) => { setEditing(r); setOpen(true); };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Overview
            </Link>
            <h1 className="mt-2 font-display text-3xl font-extrabold">Predictions</h1>
            <p className="text-sm text-muted-foreground">Create, edit, and mark results.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="bg-gradient-primary"><Plus className="mr-1 h-4 w-4" /> New tip</Button>
            </DialogTrigger>
            <PredictionDialog
              value={editing}
              onChange={setEditing}
              onSubmit={() => editing && upsert.mutate(editing)}
              saving={upsert.isPending}
            />
          </Dialog>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Match</TableHead>
                  <TableHead>League</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Odds</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pub.</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>
                ) : data && data.length ? data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.match_name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.league}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(r.match_date)} {r.match_time?.slice(0,5)}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate">{r.tip}</TableCell>
                    <TableCell>{Number(r.odds).toFixed(2)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] uppercase">{r.category}</Badge></TableCell>
                    <TableCell><Badge variant={r.status === "won" ? "default" : r.status === "lost" ? "destructive" : "secondary"}>{r.status}</Badge></TableCell>
                    <TableCell>{r.is_published ? "✓" : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this tip?")) del.mutate(r.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">No predictions yet. Click "New tip" to add one.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

function PredictionDialog({
  value, onChange, onSubmit, saving,
}: {
  value: Partial<Row> | null;
  onChange: (v: Partial<Row>) => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  if (!value) return null;
  const set = <K extends keyof Row>(k: K, v: Row[K]) => onChange({ ...value, [k]: v });

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{value.id ? "Edit prediction" : "New prediction"}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>Match</Label>
          <Input value={value.match_name ?? ""} onChange={(e) => set("match_name", e.target.value)} placeholder="Arsenal vs Chelsea" />
        </div>
        <div>
          <Label>League</Label>
          <Input value={value.league ?? ""} onChange={(e) => set("league", e.target.value)} placeholder="Premier League" />
        </div>
        <div>
          <Label>Category</Label>
          <Select value={value.category} onValueChange={(v) => set("category", v as Row["category"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Date</Label>
          <Input type="date" value={value.match_date ?? ""} onChange={(e) => set("match_date", e.target.value)} />
        </div>
        <div>
          <Label>Time</Label>
          <Input type="time" value={value.match_time ?? ""} onChange={(e) => set("match_time", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label>Tip</Label>
          <Input value={value.tip ?? ""} onChange={(e) => set("tip", e.target.value)} placeholder="Over 2.5 goals" />
        </div>
        <div>
          <Label>Odds</Label>
          <Input type="number" step="0.01" min="1.01" value={value.odds ?? 1.5} onChange={(e) => set("odds", Number(e.target.value))} />
        </div>
        <div>
          <Label>Confidence</Label>
          <Select value={value.confidence} onValueChange={(v) => set("confidence", v as Row["confidence"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CONFIDENCES.map((c) => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={value.status} onValueChange={(v) => set("status", v as Row["status"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Final score (optional)</Label>
          <Input value={value.result_score ?? ""} onChange={(e) => set("result_score", e.target.value)} placeholder="2-1" />
        </div>
        <div className="md:col-span-2">
          <Label>Analysis (optional)</Label>
          <Textarea rows={4} value={value.analysis ?? ""} onChange={(e) => set("analysis", e.target.value)} placeholder="Why this tip..." />
        </div>
        <div className="flex items-center gap-3 md:col-span-2">
          <Switch checked={!!value.is_published} onCheckedChange={(v) => set("is_published", v)} />
          <Label className="!m-0">Published</Label>
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
