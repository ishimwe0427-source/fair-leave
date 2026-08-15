import { Download, Eye, FileText } from "lucide-react";

export function AttachmentActions({
  requestId,
  fileLabel,
  compact = false,
}: {
  requestId: string;
  fileLabel?: string | null;
  compact?: boolean;
}) {
  const viewHref = `/api/leave-attachments/${requestId}?mode=view`;
  const downloadHref = `/api/leave-attachments/${requestId}?mode=download`;
  const label = fileLabel?.split("/").pop() || "Supporting document";

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={viewHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </a>
        <a
          href={downloadHref}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </a>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-canvas/80 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Supporting document</p>
            <p className="truncate text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={viewHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold transition hover:bg-secondary"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </a>
          <a
            href={downloadHref}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </a>
        </div>
      </div>
    </div>
  );
}
