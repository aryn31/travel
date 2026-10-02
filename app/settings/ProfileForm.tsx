"use client";

import Link from "next/link";
import { useActionState, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { HANDLE_RULES } from "@/lib/handles";
import { LIMITS } from "@/lib/profile";
import { uploadAvatar } from "@/lib/upload-client";
import {
  setAvatar,
  updateProfile,
  type ProfileState,
  type ProfileValues,
} from "./actions";

export function ProfileForm({
  initial,
  initialAvatarKey,
}: {
  initial: ProfileValues;
  initialAvatarKey: string | null;
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    updateProfile,
    {},
  );

  /*
   * Controlled, and seeded from whatever the action last echoed back. The
   * preview beside the form needs to move as you type anyway, so there is no
   * uncontrolled version of this to fall back on.
   */
  const [values, setValues] = useState<ProfileValues>(initial);
  const [avatarKey, setAvatarKey] = useState(initialAvatarKey);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const [, startAvatarTransition] = useTransition();

  async function pickAvatar(file: File) {
    setAvatarError(null);
    setAvatarBusy(true);
    try {
      const key = await uploadAvatar(file);
      const result = await setAvatar(key);
      if (!result.ok) throw new Error(result.error);
      setAvatarKey(result.avatarKey);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Could not upload that.");
    } finally {
      setAvatarBusy(false);
    }
  }
  const set = (k: keyof ProfileValues) => (v: string) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const handlePreview = values.handle.trim().toLowerCase().replace(/^@/, "");
  const handleChanged =
    handlePreview !== initial.handle.toLowerCase() && handlePreview.length > 0;

  return (
    <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
      <form action={action} className="flex flex-col gap-7">
        {state.saved && (
          <p
            role="status"
            className="rounded-xl border-2 border-moss/40 bg-moss/10 px-4 py-3 text-sm"
          >
            <strong className="font-medium">Saved.</strong>{" "}
            {state.movedTo ? (
              <>
                You are now at{" "}
                <Link
                  href={`/@${state.movedTo}`}
                  className="text-accent underline underline-offset-2"
                >
                  @{state.movedTo}
                </Link>
                . Links to your old handle no longer work.
              </>
            ) : (
              <Link
                href={`/@${handlePreview}`}
                className="text-accent underline underline-offset-2"
              >
                View your profile
              </Link>
            )}
          </p>
        )}

        {/* Outside the <form>: uploading is its own action and must not be
            able to submit the profile form by accident. */}
        <div className="flex flex-wrap items-center gap-5 border-b border-rule pb-7">
          <Avatar
            key={avatarKey ?? "none"}
            name={values.displayName || "?"}
            handle={handlePreview}
            avatarKey={avatarKey}
            size="lg"
          />
          <div>
            <p className="text-sm font-medium">Profile photo</p>
            <p className="mt-0.5 text-xs text-muted">
              Square, cropped from the middle. JPEG, PNG or WebP.
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-sm">
              <button
                type="button"
                onClick={() => avatarInput.current?.click()}
                disabled={avatarBusy}
                className="rounded-full border border-rule px-3.5 py-1.5 transition-colors hover:bg-surface-hover disabled:opacity-40"
              >
                {avatarBusy ? "Uploading…" : avatarKey ? "Replace" : "Upload a photo"}
              </button>
              {avatarKey && !avatarBusy && (
                <button
                  type="button"
                  onClick={() =>
                    startAvatarTransition(async () => {
                      const result = await setAvatar(null);
                      if (result.ok) setAvatarKey(null);
                    })
                  }
                  className="text-muted underline underline-offset-2 transition-colors hover:text-foreground"
                >
                  Remove
                </button>
              )}
            </div>
            {avatarError && (
              <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
                {avatarError}
              </p>
            )}
          </div>

          <input
            ref={avatarInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void pickAvatar(file);
            }}
          />
        </div>

        <Field
          label="Display name"
          htmlFor="displayName"
          error={state.field === "displayName" ? state.error : null}
          hint="Shown on your byline and above every story."
        >
          <input
            id="displayName"
            name="displayName"
            value={values.displayName}
            onChange={(e) => set("displayName")(e.target.value)}
            maxLength={LIMITS.displayName}
            autoComplete="name"
            className={inputClass}
          />
        </Field>

        <Field
          label="Handle"
          htmlFor="handle"
          error={state.field === "handle" ? state.error : null}
          hint={HANDLE_RULES}
        >
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-lg text-faint">
              @
            </span>
            <input
              id="handle"
              name="handle"
              value={values.handle}
              onChange={(e) => set("handle")(e.target.value)}
              spellCheck={false}
              autoCapitalize="none"
              autoComplete="off"
              className={inputClass}
            />
          </div>
        </Field>

        {/* The handle is the first segment of every story URL, so changing it
            is not a cosmetic edit -- say so before they save, not after. */}
        {handleChanged && (
          <p className="-mt-4 rounded-xl border-2 border-dashed border-sun/50 bg-sun/10 px-4 py-3 text-sm leading-relaxed">
            <strong className="font-medium">This moves every story.</strong>{" "}
            Your addresses change from{" "}
            <code className="font-mono text-xs">/@{initial.handle}/…</code> to{" "}
            <code className="font-mono text-xs">/@{handlePreview}/…</code>, and
            any link anyone has already shared will stop working.
          </p>
        )}

        <Field
          label="Bio"
          htmlFor="bio"
          error={state.field === "bio" ? state.error : null}
          hint={`${values.bio.length}/${LIMITS.bio} — a line or two about what you write.`}
        >
          <textarea
            id="bio"
            name="bio"
            value={values.bio}
            onChange={(e) => set("bio")(e.target.value)}
            maxLength={LIMITS.bio}
            rows={3}
            className={`${inputClass} resize-y`}
          />
        </Field>

        <Field
          label="Where you're based"
          htmlFor="homeCountry"
          error={state.field === "homeCountry" ? state.error : null}
          hint="Optional. Shown as “Based in …” on your profile."
        >
          <input
            id="homeCountry"
            name="homeCountry"
            value={values.homeCountry}
            onChange={(e) => set("homeCountry")(e.target.value)}
            maxLength={LIMITS.homeCountry}
            placeholder="Marseille, France"
            className={inputClass}
          />
        </Field>

        <Field
          label="Website"
          htmlFor="website"
          error={state.field === "website" ? state.error : null}
          hint="Optional. A bare domain is fine — https:// is added for you."
        >
          <input
            id="website"
            name="website"
            type="url"
            inputMode="url"
            value={values.website}
            onChange={(e) => set("website")(e.target.value)}
            maxLength={LIMITS.website}
            placeholder="example.com"
            spellCheck={false}
            className={inputClass}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
          <Link
            href={`/@${initial.handle}`}
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            Cancel
          </Link>
        </div>
      </form>

      {/* ------------------------------------------------------------ *
       * Live preview
       * ------------------------------------------------------------ */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="mb-4 flex items-baseline gap-4">
          <h2 className="eyebrow">How you appear</h2>
          <span aria-hidden className="h-px flex-1 bg-rule" />
        </div>

        <div className="overflow-hidden rounded-2xl border-2 border-sea/45 bg-background">
          <span aria-hidden className="block h-1.5 w-full bg-sea" />
          <div className="p-6">
            <div className="flex items-center gap-4">
              {/* Keyed on the handle: the tint is derived from it, so the
                  preview has to re-derive as it changes. */}
              <Avatar
                key={handlePreview + (avatarKey ?? "")}
                name={values.displayName || "?"}
                handle={handlePreview}
                avatarKey={avatarKey}
                size="lg"
              />
              <div className="min-w-0">
                <p className="font-display truncate text-2xl font-semibold leading-tight">
                  {values.displayName || "Your name"}
                </p>
                <p className="mt-0.5 truncate text-sm text-sea">
                  @{handlePreview || "handle"}
                </p>
              </div>
            </div>

            {values.bio && (
              <p className="mt-4 leading-relaxed text-muted">{values.bio}</p>
            )}

            <dl className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-rule pt-4 text-sm text-muted">
              {values.homeCountry && (
                <div>
                  <dt className="sr-only">Based in</dt>
                  <dd>Based in {values.homeCountry}</dd>
                </div>
              )}
              {values.website && (
                <div className="min-w-0">
                  <dt className="sr-only">Website</dt>
                  <dd className="truncate text-accent">
                    {values.website.replace(/^https?:\/\//, "")}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-faint">
          A preview — nothing is saved until you press the button.
        </p>
      </div>
    </div>
  );
}
