"use client";

import { useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  mapLoginError,
  sanitizeCallbackUrl,
} from "@/lib/auth-navigation";

type LoginFormProps = {
  callbackUrl: string;
};

export default function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const passwordInput = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");
    const safeCallbackUrl = sanitizeCallbackUrl(callbackUrl);

    setIsPending(true);
    setErrorMessage(null);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        redirectTo: safeCallbackUrl,
      });

      if (!result || result.error) {
        setErrorMessage(mapLoginError(result?.error));
        if (passwordInput.current) passwordInput.current.value = "";
        return;
      }

      router.push(safeCallbackUrl);
      router.refresh();
    } catch {
      setErrorMessage(mapLoginError(true));
      if (passwordInput.current) passwordInput.current.value = "";
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <label htmlFor="admin-email">Email address</label>
      <input
        id="admin-email"
        name="email"
        type="email"
        autoComplete="username"
        inputMode="email"
        required
        autoFocus
      />

      <div className="login-password-label">
        <label htmlFor="admin-password">Password</label>
        <button
          type="button"
          aria-controls="admin-password"
          aria-pressed={showPassword}
          onClick={() => setShowPassword((visible) => !visible)}
        >
          {showPassword ? "Hide password" : "Show password"}
        </button>
      </div>
      <input
        ref={passwordInput}
        id="admin-password"
        name="password"
        type={showPassword ? "text" : "password"}
        autoComplete="current-password"
        required
      />

      <p className="login-error" role="alert" aria-live="polite">
        {errorMessage}
      </p>

      <button className="button primary login-submit" type="submit" disabled={isPending}>
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
