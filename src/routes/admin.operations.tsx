import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  listOriginalPassengers,
  listOriginalPayments,
  listOriginalBaggage,
  listOriginalCheckIns,
  listOriginalFlightStops,
  listOriginalAircraftModels,
  listOriginalTerminals,
  updatePaymentStatus,
  updateBaggageStatus,
  updateCheckInStatus,
} from "@/lib/legacy.functions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/operations")({
  component: OperationsPage,
});

const cellCls = "px-3 py-2 text-[12px] text-white/85 font-ui border-b border-white/5";
const headCls = "px-3 py-2 text-[10px] uppercase tracking-wider text-white/50 font-ui font-bold text-left bg-white/5";

function Section<T>({ fn, columns, rowKey, renderRow }: {
  fn: () => Promise<T[]>;
  columns: string[];
  rowKey: (r: T) => string;
  renderRow: (r: T) => React.ReactNode;
}) {
  const { data, isLoading } = useQuery({ queryKey: [fn.name || Math.random().toString()], queryFn: fn });
  if (isLoading) return <div className="flex items-center justify-center py-10 text-white/60"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  const rows = (data ?? []) as T[];
  return (
    <Card className="bg-[#001429] border-white/10 rounded-none overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr>{columns.map((c) => <th key={c} className={headCls}>{c}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-white/40 text-[12px]">No records</td></tr>}
            {rows.map((r) => <tr key={rowKey(r)}>{renderRow(r)}</tr>)}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function StatusPill({ value, tone }: { value: string; tone: "ok" | "warn" | "bad" | "info" }) {
  const map = { ok: "bg-emerald-500/20 text-emerald-300", warn: "bg-amber-500/20 text-amber-300", bad: "bg-red-500/20 text-red-300", info: "bg-sky-500/20 text-sky-300" };
  return <span className={`px-2 py-0.5 rounded-none text-[10px] uppercase tracking-wider font-bold ${map[tone]}`}>{value}</span>;
}

function OperationsPage() {
  const qc = useQueryClient();
  const passengersFn = useServerFn(listOriginalPassengers);
  const paymentsFn = useServerFn(listOriginalPayments);
  const baggageFn = useServerFn(listOriginalBaggage);
  const checkInsFn = useServerFn(listOriginalCheckIns);
  const stopsFn = useServerFn(listOriginalFlightStops);
  const aircraftFn = useServerFn(listOriginalAircraftModels);
  const terminalsFn = useServerFn(listOriginalTerminals);

  const updPay = useServerFn(updatePaymentStatus);
  const updBag = useServerFn(updateBaggageStatus);
  const updChk = useServerFn(updateCheckInStatus);

  const payMut = useMutation({ mutationFn: (v: { payment_id: string; payment_status: "Successful" | "Failed" | "Refunded" | "Pending" }) => updPay({ data: v }), onSuccess: () => { toast.success("Payment updated"); qc.invalidateQueries(); }, onError: (e: Error) => toast.error(e.message) });
  const bagMut = useMutation({ mutationFn: (v: { tag_id: string; baggage_status: "Checked-in" | "Loaded" | "In-transit" | "Arrived" | "Claimed" | "Lost" }) => updBag({ data: v }), onSuccess: () => { toast.success("Baggage updated"); qc.invalidateQueries(); }, onError: (e: Error) => toast.error(e.message) });
  const chkMut = useMutation({ mutationFn: (v: { checkin_id: string; checkin_status: "Checked-in" | "Pending" | "Cancelled" | "No-show" }) => updChk({ data: v }), onSuccess: () => { toast.success("Check-in updated"); qc.invalidateQueries(); }, onError: (e: Error) => toast.error(e.message) });

  const [tab, setTab] = useState("payments");

  type Pax = { ticket_number: string; passenger_name: string; email?: string | null; contact_info?: string | null; nationality?: string | null; age?: number | null };
  type Pay = { payment_id: string; ticket_number: string; booking_id?: string | null; amount: number; payment_method: string; payment_status: string };
  type Bag = { tag_id: string; ticket_number: string; flight_number?: string | null; weight?: number | null; baggage_type?: string | null; baggage_status?: string | null };
  type Chk = { checkin_id: string; ticket_number: string; flight_number?: string | null; seat_confirmed?: string | null; checkin_status?: string | null; checkin_method?: string | null };
  type Stop = { flight_number: string; stop_number: number; stop_location: string };
  type Ac = { model_id: string; airline_name: string; aircraft_type?: string | null; seating_capacity: number; economy_price?: number | null; business_price?: number | null; first_class_price?: number | null };
  type Term = { terminal_number: string; location_id: string; terminal_name: string; capacity?: number | null };

  const payTone = (s: string) => s === "Successful" ? "ok" : s === "Refunded" ? "info" : s === "Failed" ? "bad" : "warn";
  const bagTone = (s?: string | null) => s === "Claimed" || s === "Arrived" ? "ok" : s === "Lost" ? "bad" : "info";
  const chkTone = (s?: string | null) => s === "Checked-in" ? "ok" : s === "No-show" || s === "Cancelled" ? "bad" : "warn";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Operations</h1>
        <p className="text-white/50 text-[13px] font-ui mt-1">Manage passengers, payments, baggage, check-ins, stops, aircraft & terminals. Changes sync to passenger views instantly.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-[#001429] border border-white/10 rounded-none p-0 h-auto flex-wrap">
          {["payments", "baggage", "checkins", "passengers", "stops", "aircraft", "terminals"].map((t) => (
            <TabsTrigger key={t} value={t} className="rounded-none data-[state=active]:bg-[#0099d8] data-[state=active]:text-white text-[12px] uppercase tracking-wider font-ui font-bold px-4 py-2">{t}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="payments" className="mt-4">
          <Section<Pay>
            fn={paymentsFn as never}
            columns={["Payment ID", "Ticket", "Booking", "Amount", "Method", "Status", "Actions"]}
            rowKey={(r) => r.payment_id}
            renderRow={(r) => (<>
              <td className={cellCls}>{r.payment_id}</td>
              <td className={cellCls}>{r.ticket_number}</td>
              <td className={cellCls}>{r.booking_id ?? "—"}</td>
              <td className={cellCls}>₹{Number(r.amount).toLocaleString()}</td>
              <td className={cellCls}>{r.payment_method}</td>
              <td className={cellCls}><StatusPill value={r.payment_status} tone={payTone(r.payment_status)} /></td>
              <td className={cellCls}>
                <select
                  defaultValue={r.payment_status}
                  className="bg-black/40 border border-white/10 text-white text-[11px] px-2 py-1 rounded-none"
                  onChange={(e) => payMut.mutate({ payment_id: r.payment_id, payment_status: e.target.value as never })}
                >
                  {["Successful","Pending","Failed","Refunded"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
            </>)}
          />
        </TabsContent>

        <TabsContent value="baggage" className="mt-4">
          <Section<Bag>
            fn={baggageFn as never}
            columns={["Tag", "Ticket", "Flight", "Weight", "Type", "Status", "Actions"]}
            rowKey={(r) => r.tag_id}
            renderRow={(r) => (<>
              <td className={cellCls}>{r.tag_id}</td>
              <td className={cellCls}>{r.ticket_number}</td>
              <td className={cellCls}>{r.flight_number ?? "—"}</td>
              <td className={cellCls}>{r.weight ? `${r.weight} kg` : "—"}</td>
              <td className={cellCls}>{r.baggage_type ?? "—"}</td>
              <td className={cellCls}><StatusPill value={r.baggage_status ?? "—"} tone={bagTone(r.baggage_status)} /></td>
              <td className={cellCls}>
                <select
                  defaultValue={r.baggage_status ?? "Checked-in"}
                  className="bg-black/40 border border-white/10 text-white text-[11px] px-2 py-1 rounded-none"
                  onChange={(e) => bagMut.mutate({ tag_id: r.tag_id, baggage_status: e.target.value as never })}
                >
                  {["Checked-in","Loaded","In-transit","Arrived","Claimed","Lost"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
            </>)}
          />
        </TabsContent>

        <TabsContent value="checkins" className="mt-4">
          <Section<Chk>
            fn={checkInsFn as never}
            columns={["Check-in ID", "Ticket", "Flight", "Seat", "Method", "Status", "Actions"]}
            rowKey={(r) => r.checkin_id}
            renderRow={(r) => (<>
              <td className={cellCls}>{r.checkin_id}</td>
              <td className={cellCls}>{r.ticket_number}</td>
              <td className={cellCls}>{r.flight_number ?? "—"}</td>
              <td className={cellCls}>{r.seat_confirmed ?? "—"}</td>
              <td className={cellCls}>{r.checkin_method ?? "—"}</td>
              <td className={cellCls}><StatusPill value={r.checkin_status ?? "—"} tone={chkTone(r.checkin_status)} /></td>
              <td className={cellCls}>
                <select
                  defaultValue={r.checkin_status ?? "Pending"}
                  className="bg-black/40 border border-white/10 text-white text-[11px] px-2 py-1 rounded-none"
                  onChange={(e) => chkMut.mutate({ checkin_id: r.checkin_id, checkin_status: e.target.value as never })}
                >
                  {["Checked-in","Pending","Cancelled","No-show"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
            </>)}
          />
        </TabsContent>

        <TabsContent value="passengers" className="mt-4">
          <Section<Pax>
            fn={passengersFn as never}
            columns={["Ticket", "Name", "Email", "Contact", "Nationality", "Age"]}
            rowKey={(r) => r.ticket_number}
            renderRow={(r) => (<>
              <td className={cellCls}>{r.ticket_number}</td>
              <td className={cellCls}>{r.passenger_name}</td>
              <td className={cellCls}>{r.email ?? "—"}</td>
              <td className={cellCls}>{r.contact_info ?? "—"}</td>
              <td className={cellCls}>{r.nationality ?? "—"}</td>
              <td className={cellCls}>{r.age ?? "—"}</td>
            </>)}
          />
        </TabsContent>

        <TabsContent value="stops" className="mt-4">
          <Section<Stop>
            fn={stopsFn as never}
            columns={["Flight", "Stop #", "Location"]}
            rowKey={(r) => `${r.flight_number}-${r.stop_number}`}
            renderRow={(r) => (<>
              <td className={cellCls}>{r.flight_number}</td>
              <td className={cellCls}>{r.stop_number}</td>
              <td className={cellCls}>{r.stop_location}</td>
            </>)}
          />
        </TabsContent>

        <TabsContent value="aircraft" className="mt-4">
          <Section<Ac>
            fn={aircraftFn as never}
            columns={["Model", "Airline", "Type", "Capacity", "Economy", "Business", "First"]}
            rowKey={(r) => r.model_id}
            renderRow={(r) => (<>
              <td className={cellCls}>{r.model_id}</td>
              <td className={cellCls}>{r.airline_name}</td>
              <td className={cellCls}>{r.aircraft_type ?? "—"}</td>
              <td className={cellCls}>{r.seating_capacity}</td>
              <td className={cellCls}>{r.economy_price ? `₹${r.economy_price}` : "—"}</td>
              <td className={cellCls}>{r.business_price ? `₹${r.business_price}` : "—"}</td>
              <td className={cellCls}>{r.first_class_price ? `₹${r.first_class_price}` : "—"}</td>
            </>)}
          />
        </TabsContent>

        <TabsContent value="terminals" className="mt-4">
          <Section<Term>
            fn={terminalsFn as never}
            columns={["Terminal #", "Location", "Name", "Capacity"]}
            rowKey={(r) => `${r.location_id}-${r.terminal_number}`}
            renderRow={(r) => (<>
              <td className={cellCls}>{r.terminal_number}</td>
              <td className={cellCls}>{r.location_id}</td>
              <td className={cellCls}>{r.terminal_name}</td>
              <td className={cellCls}>{r.capacity ?? "—"}</td>
            </>)}
          />
        </TabsContent>
      </Tabs>
      {/* avoid unused warn */}
      <span className="hidden"><Button variant="ghost" /></span>
    </div>
  );
}
