import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { sanitizeCallbackUrl } from "@/lib/auth-navigation";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Administrator login",
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session?.user) redirect("/admin");

  const params = await searchParams;
  const callbackUrl = sanitizeCallbackUrl(
    typeof params.callbackUrl === "string" ? params.callbackUrl : undefined,
  );

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-heading">
        <span className="login-eyebrow">Secure administrator access</span>
        <h1 id="login-heading">Self Apply Center Admin</h1>
        <p>Sign in with your administrator credentials to continue.</p>
        <LoginForm callbackUrl={callbackUrl} />
      </section>
    </main>
  );
}
