"use server";

import { redirect } from "next/navigation";
import { signIn, signUp } from "@/lib/auth";

export interface AuthState {
  error?: string;
}

export async function signupAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const workspace = String(formData.get("workspace") ?? "").trim();

  if (!name) return { error: "Please enter your name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const result = await signUp(email, password, name, workspace);
  if (!result.ok) return { error: result.error };
  redirect("/dashboard");
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Enter your email and password." };

  const result = await signIn(email, password);
  if (!result.ok) return { error: result.error };
  redirect("/dashboard");
}
