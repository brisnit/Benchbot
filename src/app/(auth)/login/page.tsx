"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { loginAction, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: AuthState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gradient" className="w-full" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? "Signing in…" : "Log in"}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, initial);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-sm text-muted-foreground">Log in to your BenchBot workspace.</p>

      <div className="mt-6 rounded-lg border border-brand-50 bg-brand-50/60 px-4 py-3 text-sm">
        <p className="font-medium text-brand">Demo account</p>
        <p className="mt-0.5 font-mono text-xs text-slate-600">demo@benchbot.app · benchbot</p>
      </div>

      <form action={formAction} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@agency.com" autoComplete="email" required defaultValue="demo@benchbot.app" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" placeholder="Your password" autoComplete="current-password" required defaultValue="benchbot" />
        </div>

        {state.error && (
          <p className="rounded-md bg-critical/10 px-3 py-2 text-sm text-critical">{state.error}</p>
        )}

        <SubmitButton />
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to BenchBot?{" "}
        <Link href="/signup" className="font-medium text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
