"use client";

import { useActionState, useMemo, useState } from "react";
import {
  updateBrandingAction,
  type ActionResult,
} from "@/lib/actions/system-actions";

const initial: ActionResult = { ok: false };

export function BrandingForm({
  settings,
}: {
  settings: {
    companyName: string;
    productName: string;
    tagline: string;
    supportEmail: string;
    primaryColor: string;
    secondaryColor: string;
    canvasColor: string;
    accentColor: string;
    designPreset: string;
    loginTitle: string;
    loginSubtitle: string;
    landingHeadline: string;
    landingBody: string;
    footerText: string;
    showLandingStats: boolean;
    showMarketingPage: boolean;
    employeeCodePrefix: string;
    logoUrl: string;
  };
}) {
  const [state, action, pending] = useActionState(updateBrandingAction, initial);
  const [preview, setPreview] = useState({
    companyName: settings.companyName,
    productName: settings.productName,
    tagline: settings.tagline,
    primaryColor: settings.primaryColor,
    secondaryColor: settings.secondaryColor,
    canvasColor: settings.canvasColor,
    accentColor: settings.accentColor,
    designPreset: settings.designPreset,
    loginTitle: settings.loginTitle,
    loginSubtitle: settings.loginSubtitle,
    landingHeadline: settings.landingHeadline,
    landingBody: settings.landingBody,
  });

  const previewStyle = useMemo(
    () =>
      ({
        ["--primary" as string]: preview.primaryColor,
        ["--sidebar" as string]: preview.secondaryColor,
      }) as React.CSSProperties,
    [preview.primaryColor, preview.secondaryColor],
  );

  function onField(name: keyof typeof preview, value: string) {
    setPreview((prev) => ({ ...prev, [name]: value }));
  }

  return (
    <form action={action} className="space-y-5 rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">1. Company branding</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Logo, colors, and public copy for this deployment. Save, then open the landing page to verify.
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-primary hover:underline"
        >
          Preview landing ↗
        </a>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              name="companyName"
              label="Company name"
              defaultValue={settings.companyName}
              onChange={(v) => onField("companyName", v)}
            />
            <Field
              name="productName"
              label="Product name"
              defaultValue={settings.productName}
              onChange={(v) => onField("productName", v)}
            />
            <Field
              name="tagline"
              label="Tagline (under logo)"
              defaultValue={settings.tagline}
              onChange={(v) => onField("tagline", v)}
            />
            <Field
              name="supportEmail"
              label="Support email"
              type="email"
              defaultValue={settings.supportEmail}
            />
            <Field
              name="primaryColor"
              label="Primary color"
              type="color"
              defaultValue={settings.primaryColor}
              onChange={(v) => onField("primaryColor", v)}
            />
            <Field
              name="secondaryColor"
              label="Sidebar color"
              type="color"
              defaultValue={settings.secondaryColor}
              onChange={(v) => onField("secondaryColor", v)}
            />
            <Field
              name="canvasColor"
              label="Page background"
              type="color"
              defaultValue={settings.canvasColor || "#eef2f6"}
              onChange={(v) => onField("canvasColor", v)}
            />
            <Field
              name="accentColor"
              label="Accent / highlight"
              type="color"
              defaultValue={settings.accentColor || "#fdecec"}
              onChange={(v) => onField("accentColor", v)}
            />
            <label className="block space-y-2 text-sm">
              <span className="font-medium">Design look</span>
              <select
                name="designPreset"
                defaultValue={settings.designPreset || "industrial"}
                onChange={(e) => onField("designPreset", e.target.value)}
                className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5"
              >
                <option value="industrial">Industrial (default)</option>
                <option value="soft">Soft (rounder)</option>
                <option value="sharp">Sharp (enterprise)</option>
              </select>
              <span className="block text-xs text-muted-foreground">
                Change corner radius and feel per buyer company without redeploying code.
              </span>
            </label>
            <Field
              name="loginTitle"
              label="Login title"
              defaultValue={settings.loginTitle}
              onChange={(v) => onField("loginTitle", v)}
            />
            <Field
              name="loginSubtitle"
              label="Login subtitle"
              defaultValue={settings.loginSubtitle}
              onChange={(v) => onField("loginSubtitle", v)}
            />
          </div>

          <label className="block space-y-2 text-sm">
            <span className="font-medium">Landing headline</span>
            <input
              name="landingHeadline"
              defaultValue={settings.landingHeadline}
              onChange={(e) => onField("landingHeadline", e.target.value)}
              className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5"
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span className="font-medium">Landing body</span>
            <textarea
              name="landingBody"
              rows={3}
              defaultValue={settings.landingBody}
              onChange={(e) => onField("landingBody", e.target.value)}
              className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <Field name="footerText" label="Footer text" defaultValue={settings.footerText} />
            <Field
              name="employeeCodePrefix"
              label="Employee code prefix"
              defaultValue={settings.employeeCodePrefix}
            />
          </div>

          <div className="flex flex-wrap gap-6 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                name="showLandingStats"
                defaultChecked={settings.showLandingStats}
                className="accent-[var(--primary)]"
              />
              Show landing proof strip
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                name="showMarketingPage"
                defaultChecked={settings.showMarketingPage}
                className="accent-[var(--primary)]"
              />
              Show marketing landing page
            </label>
          </div>

          <div className="rounded-xl bg-canvas p-4">
            <p className="text-sm font-medium">Current logo</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="mt-2 h-12 w-auto object-contain"
            />
            <label className="mt-3 block space-y-2 text-sm">
              <span className="font-medium">Upload new logo (PNG/JPG/SVG, max 2MB)</span>
              <input type="file" name="logo" accept="image/*" className="block w-full text-sm" />
            </label>
          </div>
        </div>

        <div className="space-y-4" style={previewStyle}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Live preview
          </p>
          <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
            <div
              className="px-4 py-3 text-white"
              style={{ background: preview.secondaryColor }}
            >
              <p className="font-display text-sm font-semibold">{preview.productName}</p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/70">
                {preview.tagline.slice(0, 42)}
                {preview.tagline.length > 42 ? "…" : ""}
              </p>
            </div>
            <div className="space-y-3 bg-canvas p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                {preview.companyName}
              </p>
              <p className="font-display text-2xl font-semibold tracking-tight">
                {preview.productName}
              </p>
              <p className="text-sm font-medium text-foreground">
                {preview.landingHeadline}
              </p>
              <p className="line-clamp-3 text-xs text-muted-foreground">
                {preview.landingBody}
              </p>
              <div
                className="inline-flex rounded-lg px-3 py-2 text-xs font-semibold text-white"
                style={{ background: preview.primaryColor }}
              >
                Launch product
              </div>
            </div>
            <div className="border-t border-border bg-white p-4">
              <p className="font-display text-lg font-semibold">{preview.loginTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">{preview.loginSubtitle}</p>
              <div className="mt-3 h-8 rounded-lg border border-border bg-canvas" />
              <div className="mt-2 h-8 rounded-lg border border-border bg-canvas" />
              <div
                className="mt-3 h-9 rounded-lg text-center text-xs font-semibold leading-9 text-white"
                style={{ background: preview.primaryColor }}
              >
                Sign in securely
              </div>
            </div>
          </div>
        </div>
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
        {pending ? "Saving..." : "Save branding"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  onChange,
}: {
  name: string;
  label: string;
  defaultValue: string;
  type?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5"
      />
    </label>
  );
}
