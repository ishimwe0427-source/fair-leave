"use client";

import { useActionState } from "react";
import {
  importWorkersAction,
  type ImportActionResult,
} from "@/lib/actions/import-actions";

const initial: ImportActionResult = { ok: false };

export function ImportForm() {
  const [state, action, pending] = useActionState(importWorkersAction, initial);

  return (
    <div className="space-y-4">
      <form
        action={action}
        className="space-y-4 rounded-2xl border border-border bg-white p-6 shadow-sm"
      >
        <div>
          <h2 className="font-display text-xl font-semibold">Upload workforce file</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            CSV or Excel (.xlsx). Designed for large imports in batches — suitable for
            companies with hundreds of thousands of workers.
          </p>
        </div>

        <input
          type="file"
          name="file"
          accept=".csv,.xlsx,.xls"
          required
          className="block w-full text-sm"
        />

        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Importing workers..." : "Start import"}
        </button>
      </form>

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      {state.ok ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
          <p className="font-semibold">{state.message}</p>
          {state.jobId ? (
            <a
              href={`/api/imports/${state.jobId}/credentials`}
              className="mt-3 inline-flex rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white"
            >
              Download credentials CSV
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
