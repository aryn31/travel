import { signOut } from "@/auth";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button type="submit" className="text-sm text-muted transition-colors hover:text-foreground">
        Sign out
      </button>
    </form>
  );
}
