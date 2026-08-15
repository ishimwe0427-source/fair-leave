"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { decideLeaveAction } from "@/lib/actions/leave-actions";

export function ApprovalActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function decide(decision: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      const result = await decideLeaveAction(requestId, decision, comment);
      setMessage(result.error || result.message || null);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment"
        rows={2}
        className="w-full rounded-xl border border-border bg-canvas px-3 py-2 text-sm outline-none ring-primary focus:ring-2"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => decide("APPROVED")}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Approve"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => decide("REJECTED")}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          Deny / Cancel
        </button>
      </div>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
