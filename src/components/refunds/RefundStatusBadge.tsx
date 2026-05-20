import { Badge } from "@/components/ui/badge";

export function RefundStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Pending: "bg-orange-100 text-orange-800 border-orange-300",
    Approved: "bg-green-100 text-green-800 border-green-300",
    Completed: "bg-emerald-100 text-emerald-900 border-emerald-300",
    Rejected: "bg-red-100 text-red-800 border-red-300",
    "Refund Requested": "bg-orange-100 text-orange-800 border-orange-300",
    Refunded: "bg-emerald-100 text-emerald-900 border-emerald-300",
  };
  return (
    <Badge variant="outline" className={`rounded-none font-ui uppercase tracking-wider text-[10px] ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </Badge>
  );
}
