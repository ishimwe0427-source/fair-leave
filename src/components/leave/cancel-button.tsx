"use client";

import { useState, useTransition } from "react";
import { cancelLeaveAction } from "@/lib/actions/leave-actions";

export function CancelButton({ requestId }: { requestId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await cancelLeaveAction(requestId);
            setMessage(result.error || result.message || null);
          })
        }
        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-canvas disabled:opacity-60"
      >
        {pending ? "Cancelling..." : "Cancel"}
      </button>
      {message ? <p className="text-[11px] text-muted-foreground">{message}</p> : null}
    </div>
  );
}
