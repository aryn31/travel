import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";
import { SignInForm } from "./SignInForm";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  if (await getViewer()) redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 text-sm opacity-60 hover:opacity-100">
        ← Home
      </Link>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mb-8 text-sm opacity-70">
        to write and publish travel stories.
      </p>
      <SignInForm />
    </main>
  );
}
