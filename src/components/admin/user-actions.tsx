"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteUserAction,
  resetUserPasswordAction,
} from "@/lib/actions/user-actions";

export function UserRowActions({
  userId,
  allowDelete = true,
}: {
  userId: string;
  allowDelete?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => router.push(`/admin/users/${userId}`)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-canvas"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await resetUserPasswordAction(userId);
              setMessage(result.error || result.message || null);
              setTempPassword(result.tempPassword || null);
            })
          }
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-canvas"
        >
          Reset password
        </button>
        {allowDelete ? (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                if (!confirm("Delete this user permanently?")) return;
                const result = await deleteUserAction(userId);
                setMessage(result.error || result.message || null);
                if (result.ok) router.refresh();
              })
            }
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
        ) : null}
      </div>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
      {tempPassword ? (
        <p className="rounded-lg bg-amber-50 px-2 py-1 font-mono text-xs text-amber-900">
          Temp password: {tempPassword}
        </p>
      ) : null}
    </div>
  );
}
