"use client";

import { useActionState } from "react";
import {
  updateNavAction,
  type ActionResult,
} from "@/lib/actions/system-actions";
import { DEFAULT_NAV, type FeatureFlags, type NavOverride } from "@/lib/system";

const initial: ActionResult = { ok: false };

export function NavForm({
  navConfig,
  featureFlags,
}: {
  navConfig: unknown;
  featureFlags: unknown;
}) {
  const [state, action, pending] = useActionState(updateNavAction, initial);
  const overrides = Array.isArray(navConfig) ? (navConfig as NavOverride[]) : [];
  const flags = {
    allowEmployeeSelfRequest: true,
    showTeamCoverage: true,
    showReports: true,
    enableBulkImport: true,
    requireManagerApproval: false,
    ...((featureFlags as FeatureFlags) || {}),
  };

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div>
        <h2 className="font-display text-xl font-semibold">2. Navigation tabs & features</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Rename sidebar tabs, hide modules, and toggle product features per buyer. Changes apply after save.
        </p>
      </div>

      <div className="space-y-3">
        {DEFAULT_NAV.map((item) => {
          const override = overrides.find((o) => o.key === item.key);
          return (
            <div
              key={item.key}
              className="grid gap-3 rounded-xl border border-border px-3 py-3 md:grid-cols-[1fr_1.2fr_auto] md:items-center"
            >
              <div>
                <p className="text-sm font-semibold">{item.key}</p>
                <p className="text-xs text-muted-foreground">{item.href}</p>
              </div>
              <input
                name={`label_${item.key}`}
                defaultValue={override?.label || item.label}
                className="rounded-xl border border-border bg-canvas px-3 py-2 text-sm"
              />
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={`hidden_${item.key}`}
                  defaultChecked={Boolean(override?.hidden)}
                />
                Hide
              </label>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 rounded-xl bg-canvas p-4 text-sm md:grid-cols-2">
        {(
          [
            ["allowEmployeeSelfRequest", "Employee self-service leave requests"],
            ["showTeamCoverage", "Team coverage module"],
            ["showReports", "Reports module"],
            ["enableBulkImport", "Bulk worker import"],
            ["requireManagerApproval", "Manager first review before HR"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              name={key}
              defaultChecked={Boolean(flags[key])}
            />
            {label}
          </label>
        ))}
      </div>

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}
      {state.ok ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save navigation"}
      </button>
    </form>
  );
}
