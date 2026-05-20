import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefundStatusBadge } from "@/components/refunds/RefundStatusBadge";
import { adminListRefunds } from "@/lib/payments-refunds.functions";
import { ApproveRefundModal } from "@/components/admin/refunds/ApproveRefundModal";
import { RejectRefundModal } from "@/components/admin/refunds/RejectRefundModal";

export const Route = createFileRoute("/admin/refunds")({
  head: () => ({
    meta: [
      { title: "Refund Management | AirFlow Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminRefundsPage,
});

type Tab = "Pending" | "Approved" | "Rejected" | "Auto";

function AdminRefundsPage() {
  const [tab, setTab] = useState<Tab>("Pending");
  const [search, setSearch] = useState("");
  const [approveTarget, setApproveTarget] = useState<any | null>(null);
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);

  const fn = useServerFn(adminListRefunds);
  const q = useQuery({
    queryKey: ["admin-refunds", tab, search],
    queryFn: () =>
      fn({
        data: {
          status: tab === "Auto" ? "All" : tab,
          auto_only: tab === "Auto",
          search: search || undefined,
        },
      }),
  });

  const counts = q.data?.counts ?? { pending: 0, approved: 0, rejected: 0, completed: 0, auto: 0, totalRefunded: 0 };

  const rows = useMemo(() => q.data?.refunds ?? [], [q.data]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display font-bold text-2xl">Refund Management</h1>
        <p className="text-white/50 text-[13px] font-ui mt-1">
          Review user refund requests. Approved refunds are initiated to the passenger's UPI ID; rejected ones notify the passenger.
        </p>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Pending" value={counts.pending} tone="warn" />
        <Kpi label="Approved" value={counts.approved} tone="ok" />
        <Kpi label="Rejected" value={counts.rejected} tone="bad" />
        <Kpi label="Total Refunded" value={`₹${counts.totalRefunded.toLocaleString("en-IN")}`} tone="info" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10">
        {(["Pending", "Approved", "Rejected", "Auto"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-[12px] font-ui uppercase tracking-wider transition border-b-2 ${
              tab === t ? "border-[#0099d8] text-[#0099d8]" : "border-transparent text-white/50 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            placeholder="Search by Refund ID, email, booking, txn, flight…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 rounded-none border border-white/10 bg-[#001429] text-white placeholder:text-white/30"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#001429] border border-white/10 overflow-x-auto rounded-none">
        {q.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-white/40" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-white/40">No refunds match.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-white/50">
              <tr>
                <th className="px-3 py-2 text-left">Refund ID</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Flight</th>
                <th className="px-3 py-2 text-left">Booking</th>
                <th className="px-3 py-2 text-left">Txn</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-left">UPI</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr
                  key={r.id}
                  className={`border-t border-white/5 text-white/85 ${r.is_auto_refund ? "border-l-4 border-l-[#0099d8]" : ""}`}
                >
                  <td className="px-3 py-2 font-mono text-[11px]">{r.refund_request_id ?? r.id.slice(0, 8)}</td>
                  <td className="px-3 py-2 text-[11px]">{r.refund_type}</td>
                  <td className="px-3 py-2 text-[11px]">{r.request_email}</td>
                  <td className="px-3 py-2 text-[11px] font-mono">{r.flight_number}</td>
                  <td className="px-3 py-2 text-[11px] font-mono">{r.request_booking_id}</td>
                  <td className="px-3 py-2 font-mono text-[10px] break-all max-w-[180px]">{r.request_txn_id}</td>
                  <td className="px-3 py-2 text-right font-bold">₹{Number(r.refund_amount).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{r.refund_to_upi}</td>
                  <td className="px-3 py-2">
                    <RefundStatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.status === "Pending" && (
                      <div className="inline-flex gap-1">
                        <Button
                          size="sm"
                          className="rounded-none bg-green-600 hover:bg-green-700 text-white h-7 text-[10px]"
                          onClick={() => setApproveTarget(r)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-none bg-red-600 hover:bg-red-700 text-white h-7 text-[10px]"
                          onClick={() => setRejectTarget(r)}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {approveTarget && (
        <ApproveRefundModal refund={approveTarget} onClose={() => setApproveTarget(null)} onDone={() => q.refetch()} />
      )}
      {rejectTarget && (
        <RejectRefundModal refund={rejectTarget} onClose={() => setRejectTarget(null)} onDone={() => q.refetch()} />
      )}
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white border-2 border-muted p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 inline-block px-2 py-0.5 font-display font-extrabold text-xl ${color}`}>{value}</div>
    </div>
  );
}
