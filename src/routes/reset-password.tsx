import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password · Pressureboy808" }] }),
  component: ResetPage,
});

function ResetPage() {
  const [recovery, setRecovery] = useState(false);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) setRecovery(true);
  }, []);

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Check your email for the reset link.");
  };

  const updatePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Password updated. You can sign in."); window.location.href = "/login"; }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md p-8">
          <h1 className="font-display text-2xl font-bold">{recovery ? "Set a new password" : "Reset password"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {recovery ? "Choose a strong new password." : "We'll email you a secure reset link."}
          </p>
          {recovery ? (
            <form onSubmit={updatePw} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="np">New password</Label>
                <Input id="np" type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-primary">{loading ? "Updating…" : "Update password"}</Button>
            </form>
          ) : (
            <form onSubmit={sendLink} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-primary">{loading ? "Sending…" : "Send reset link"}</Button>
            </form>
          )}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary-glow hover:underline">Back to login</Link>
          </p>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
