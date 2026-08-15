"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/actions/notification-actions";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
};

export function NotificationsPanel({ items }: { items: NotificationItem[] }) {
  const [pending, start] = useTransition();

  return (
    <section className="animate-rise app-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Notifications</h2>
        {items.some((n) => !n.read) ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => start(async () => { await markAllNotificationsReadAction(); })}
            className="text-xs font-semibold text-primary"
          >
            Mark all read
          </button>
        ) : null}
      </div>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border px-3 py-3 ${n.read ? "border-border" : "border-primary/30 bg-accent"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>
                  {n.href ? (
                    <Link href={n.href} className="mt-2 inline-block text-xs font-semibold text-primary">
                      Open
                    </Link>
                  ) : null}
                </div>
                {!n.read ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => start(async () => { await markNotificationReadAction(n.id); })}
                    className="text-[11px] font-semibold text-muted-foreground"
                  >
                    Read
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
