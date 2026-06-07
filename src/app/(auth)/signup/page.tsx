"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { signupAction, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormStatus } from "react-dom";

const initial: AuthState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gradient" className="w-full" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? "Creating account…" : "Create account"}
    </Button>
  );
}

export default function SignupPage() {
  const [state, formAction] = useActionState(signupAction, initial);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Create your workspace</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Start running competitive audits in minutes. No credit card required.
      </p>

      <form action={formAction} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" placeholder="Alex Rivera" autoComplete="name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="workspace">Workspace name</Label>
          <Input id="workspace" name="workspace" placeholder="Northstar Agency" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" name="email" type="email" placeholder="you@agency.com" autoComplete="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" placeholder="At least 6 characters" autoComplete="new-password" required />
        </div>

        {state.error && (
          <p className="rounded-md bg-critical/10 px-3 py-2 text-sm text-critical">{state.error}</p>
        )}

        <SubmitButton />
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
