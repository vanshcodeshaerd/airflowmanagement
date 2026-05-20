import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, CheckCircle2, AlertTriangle, Clock, IndianRupee, XCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/payments-refunds.functions";

function iconFor(type: string) {
  switch (type) {
    case "CANCELLATION":
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    case "DELAY":
      return <Clock className="h-4 w-4 text-orange-600" />;
    case "REFUND_INITIATED":
      return <IndianRupee className="h-4 w-4 text-orange-600" />;
    case "REFUND_APPROVED":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "REFUND_REJECTED":
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const listFn = useServerFn(listMyNotifications);
  const markFn = useServerFn(markNotificationRead);
  const markAllFn = useServerFn(markAllNotificationsRead);

  const q = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => listFn({}),
    refetchInterval: 30000,
  });

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest("[data-notif-bell]")) setOpen(false);
    }
    if (open) window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [open]);

  const unread = q.data?.unread ?? 0;

  return (
    <div className="relative" data-notif-bell>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="relative inline-flex h-9 w-9 items-center justify-center text-white hover:bg-white/10"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-h-[450px] overflow-y-auto bg-background border-2 border-muted shadow-xl">
          <div className="flex items-center justify-between border-b border-muted px-3 py-2">
            <div className="font-display font-bold text-sm">Notifications</div>
            {unread > 0 && (
              <button
                className="text-[10px] uppercase tracking-wider text-accent hover:underline"
                onClick={async () => {
                  await markAllFn({});
                  q.refetch();
                }}
              >
                Mark all read
              </button>
            )}
          </div>
          {q.isLoading && <div className="p-6 text-center text-xs text-muted-foreground">Loading…</div>}
          {q.data && q.data.notifications.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">No notifications yet</div>
          )}
          {q.data?.notifications.map((n: any) => (
            <button
              key={n.id}
              onClick={async () => {
                if (!n.is_read) {
                  await markFn({ data: { id: n.id } });
                  q.refetch();
                }
              }}
              className={`w-full text-left flex items-start gap-2 border-b border-muted px-3 py-2 hover:bg-muted/50 ${!n.is_read ? "bg-accent/5" : ""}`}
            >
              <div className="mt-0.5">{iconFor(n.notification_type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-sans font-bold text-xs text-primary truncate">{n.title}</div>
                  {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />}
                </div>
                <div className="text-[11px] text-muted-foreground line-clamp-2">{n.message}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(n.sent_at)}</div>
              </div>
            </button>
          ))}
          <Link
            to="/refund"
            className="block border-t border-muted px-3 py-2 text-center text-[11px] uppercase tracking-wider text-accent hover:bg-muted/30"
            onClick={() => setOpen(false)}
          >
            Request a Refund
          </Link>
        </div>
      )}
    </div>
  );
}
