"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRoleAction } from "../actions";

const ROLES = ["user", "editor", "admin"] as const;

const LABEL: Record<(typeof ROLES)[number], string> = {
  user: "Reader",
  editor: "Editor",
  admin: "Admin",
};

/**
 * Changing what somebody is allowed to do.
 *
 * A select rather than a promote/demote pair: there are three states and
 * buttons for every transition between them is six controls where one
 * will do.
 */
export function RoleSelect({
  userId,
  role,
  isSelf,
}: {
  userId: string;
  role: (typeof ROLES)[number];
  /** Your own row: shown, never editable -- see setRole in lib/reports.ts. */
  isSelf: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(role);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (isSelf) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-muted">
        {LABEL[role]}
        <span className="text-xs text-faint">(you)</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <label className="sr-only" htmlFor={`role-${userId}`}>
        Role
      </label>
      <select
        id={`role-${userId}`}
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as (typeof ROLES)[number];
          const previous = value;
          setValue(next);
          setError(null);
          startTransition(async () => {
            const result = await setRoleAction(userId, next);
            if (result.ok) router.refresh();
            else {
              setValue(previous);
              setError(result.error);
            }
          });
        }}
        className="rounded-full border border-rule bg-background px-3 py-1 text-sm outline-none transition-colors hover:bg-surface-hover focus:border-accent disabled:opacity-50"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {LABEL[r]}
          </option>
        ))}
      </select>
      {error && (
        <span role="alert" className="text-xs text-accent">
          {error}
        </span>
      )}
    </span>
  );
}
