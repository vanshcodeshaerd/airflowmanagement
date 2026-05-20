import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { ArrowLeft, AlertTriangle, Clock, X, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import {
  listAirportFlightsByDate,
  delayFlight,
  cancelFlight,
  changeFlightStatus,
  changeFlightGate,
  listGatesForAirport,
} from "@/lib/admin-flights.functions";
import { getAirportOpsSummary } from "@/lib/admin-airports.functions";
import { listFlightPassengers, forceCheckIn, markBoarded, markNoShow, cancelBooking } from "@/lib/admin-passengers.functions";
import { getCurrentRole } from "@/lib/airport-role.functions";

export const Route = createFileRoute("/_authenticated/admin/airports/$code")({
  head: () => ({ meta: [{ title: "Airport Ops — Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminAirportOps,
});

const STATUSES = ["Scheduled", "Boarding", "Departed", "Arrived", "Delayed", "Cancelled"] as const;

function todayStr() { return new Date().toISOString().slice(0, 10); }

function AdminAirportOps() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const roleFn = useServerFn(getCurrentRole);
  const listFn = useServerFn(listAirportFlightsByDate);
  const summaryFn = useServerFn(getAirportOpsSummary);
  const role = useQuery({ queryKey: ["role"], queryFn: () => roleFn(), staleTime: 60_000 });
  useEffect(() => {
    if (role.data && role.data.role !== "admin") {
      toast.error("Admin access required");
      navigate({ to: "/dashboard/airports" as never });
    }
  }, [role.data, navigate]);

  const [date, setDate] = useState(todayStr());
  const [selected, setSelected] = useState<string | null>(null);

  const flights = useQuery({
    queryKey: ["admin-flights", code, date],
    queryFn: () => listFn({ data: { code, date } }),
    enabled: role.data?.role === "admin",
  });
  const summary = useQuery({
    queryKey: ["admin-airport-summary", code],
    queryFn: () => summaryFn({ data: { code } }),
    enabled: role.data?.role === "admin",
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-flights", code, date] });
    qc.invalidateQueries({ queryKey: ["admin-airport-summary", code] });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[#001f3f] text-white">
        <div className="max-w-7xl mx-auto px-5 h-[60px] flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center gap-2 hover:text-accent">
            <ArrowLeft className="w-4 h-4" /><span className="font-display font-extrabold">AirFlow Admin</span>
          </Link>
          <div className="flex items-center gap-4 text-[12px] font-ui">
            <Link to="/admin/airports" className="hover:underline">All airports</Link>
            <Link to="/admin/passengers" className="hover:underline">Passengers</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <nav className="text-[12px] text-muted-foreground font-sans mb-2">
            <Link to="/admin/dashboard" className="hover:text-accent">Admin</Link> ›{" "}
            <Link to="/admin/airports" className="hover:text-accent">Airports</Link> ›{" "}
            <span className="text-primary">{code}</span>
          </nav>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display font-extrabold text-[32px] text-primary">
                {summary.data?.airport?.airport_name ?? code} ({code})
              </h1>
              <p className="text-[13px] text-muted-foreground font-sans">
                {summary.data?.airport?.city}, {summary.data?.airport?.state}
              </p>
            </div>
            <div className="flex items-center gap-4 text-[12px] font-ui">
              <Stat label="Today" value={summary.data?.flightsToday ?? 0} />
              <Stat label="Delayed" value={summary.data?.delayed ?? 0} tone="warning" />
              <Stat label="Cancelled" value={summary.data?.cancelled ?? 0} tone="danger" />
              <Stat label="Gates" value={`${summary.data?.gatesInUse ?? 0}/${summary.data?.gatesTotal ?? 0}`} />
            </div>
          </div>
        </motion.div>

        <div className="flex items-center gap-3 mt-6 mb-4">
          <label className="text-[12px] font-ui font-bold uppercase tracking-wider text-muted-foreground">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="border border-border bg-white px-3 py-1.5 text-[13px] rounded-none" />
          <button onClick={() => setDate(todayStr())} className="text-[12px] font-ui font-semibold text-accent hover:underline">Today</button>
        </div>

        <div className="bg-white border border-border overflow-x-auto">
          <table className="w-full text-[13px] font-sans">
            <thead className="bg-muted/30 text-muted-foreground text-[11px] uppercase tracking-wider">
              <tr>
                <th className="text-left p-3">Flight</th>
                <th className="text-left p-3">Route</th>
                <th className="text-left p-3">Departure</th>
                <th className="text-left p-3">Gate</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Pax</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {flights.isLoading && (<tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>)}
              {!flights.isLoading && (flights.data?.flights.length ?? 0) === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No flights on this date.</td></tr>
              )}
              {flights.data?.flights.map((f) => (
                <tr key={f.id} className="border-t border-border hover:bg-muted/20">
                  <td className="p-3 font-display font-bold text-primary">{f.flight_number}<div className="text-[11px] font-sans font-normal text-muted-foreground">{f.airline_name}</div></td>
                  <td className="p-3">{f.source_code} → {f.destination_code}</td>
                  <td className="p-3">{new Date(f.departure_datetime).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                    {f.delay_minutes > 0 && <span className="ml-1 text-warning text-[11px]">+{f.delay_minutes}m</span>}
                  </td>
                  <td className="p-3">{f.terminal ? `T${f.terminal} · ` : ""}{f.gate_number ?? "TBD"}</td>
                  <td className="p-3"><StatusPill status={f.flight_status} /></td>
                  <td className="p-3">{f.passengers_count}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => setSelected(f.id)} className="text-accent hover:underline font-ui font-semibold text-[12px]">Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {selected && (
        <FlightPanel
          flightId={selected}
          airportCode={code}
          onClose={() => setSelected(null)}
          onMutated={invalidate}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "warning" | "danger" }) {
  const color = tone === "warning" ? "text-warning" : tone === "danger" ? "text-destructive" : "text-primary";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display font-extrabold text-[18px] ${color}`}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Scheduled: "bg-muted text-foreground",
    Boarding: "bg-accent/15 text-accent-strong",
    Departed: "bg-primary/10 text-primary",
    Arrived: "bg-success/15 text-success",
    Delayed: "bg-warning/15 text-warning",
    Cancelled: "bg-destructive/15 text-destructive",
  };
  return <span className={`text-[10px] font-ui font-bold uppercase tracking-wider px-2 py-1 rounded-none ${map[status] ?? "bg-muted"}`}>{status}</span>;
}

function FlightPanel({ flightId, airportCode, onClose, onMutated }: { flightId: string; airportCode: string; onClose: () => void; onMutated: () => void }) {
  const qc = useQueryClient();
  const passengersFn = useServerFn(listFlightPassengers);
  const gatesFn = useServerFn(listGatesForAirport);
  const delayFn = useServerFn(delayFlight);
  const cancelFn = useServerFn(cancelFlight);
  const statusFn = useServerFn(changeFlightStatus);
  const gateFn = useServerFn(changeFlightGate);
  const checkInFn = useServerFn(forceCheckIn);
  const boardFn = useServerFn(markBoarded);
  const noShowFn = useServerFn(markNoShow);
  const cancelBookingFn = useServerFn(cancelBooking);

  const pax = useQuery({ queryKey: ["admin-pax", flightId], queryFn: () => passengersFn({ data: { flightId } }) });
  const gates = useQuery({ queryKey: ["admin-gates", airportCode], queryFn: () => gatesFn({ data: { code: airportCode } }) });

  const flight = pax.data?.flight;
  const [tab, setTab] = useState<"overview" | "delay" | "cancel" | "gate" | "passengers">("overview");
  const [delayMin, setDelayMin] = useState(30);
  const [delayReason, setDelayReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelConfirm, setCancelConfirm] = useState("");
  const [gateId, setGateId] = useState("");

  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-pax", flightId] }); onMutated(); };

  const handle = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast.success(msg); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={onClose}>
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        className="bg-white w-full max-w-2xl h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#001f3f] text-white p-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <div className="font-display font-extrabold text-lg">{flight?.flight_number ?? "Flight"}</div>
            <div className="text-[12px] opacity-80">{flight?.source_code} → {flight?.destination_code}</div>
          </div>
          <button onClick={onClose} className="text-white hover:text-accent"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex border-b border-border text-[12px] font-ui font-semibold uppercase tracking-wider">
          {(["overview","delay","cancel","gate","passengers"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 px-3 py-3 ${tab === t ? "bg-white text-primary border-b-2 border-accent" : "bg-muted/20 text-muted-foreground hover:text-primary"}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="p-5">
          {!flight && <p className="text-muted-foreground">Loading…</p>}
          {flight && tab === "overview" && (
            <div className="space-y-3 text-[14px]">
              <Row label="Status"><StatusPill status={flight.flight_status} /></Row>
              <Row label="Departure">{new Date(flight.departure_datetime).toLocaleString("en-IN")}</Row>
              <Row label="Arrival">{new Date(flight.arrival_datetime).toLocaleString("en-IN")}</Row>
              <Row label="Gate">{flight.terminal ? `T${flight.terminal} · ` : ""}{flight.gate_number ?? "TBD"}</Row>
              <Row label="Aircraft">{flight.aircraft_type}</Row>
              <Row label="Passengers">{pax.data?.passengers.length ?? 0}</Row>
              <div className="pt-3 border-t border-border">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Quick status change</div>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <button key={s} disabled={s === flight.flight_status}
                      onClick={() => handle(() => statusFn({ data: { flightId, status: s } }), `Status → ${s}`)}
                      className="text-[12px] font-ui font-semibold px-3 py-1.5 border border-border hover:border-accent hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {flight && tab === "delay" && (
            <div className="space-y-3">
              <div className="bg-warning/10 border border-warning/40 p-3 text-[13px] text-warning flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />Delaying shifts departure/arrival and notifies all booked passengers.</div>
              <Field label="Delay (minutes)">
                <input type="number" min={1} max={720} value={delayMin}
                  onChange={(e) => setDelayMin(parseInt(e.target.value || "0", 10))}
                  className="border border-border w-full px-3 py-2 text-[14px] rounded-none" />
              </Field>
              <Field label="Reason">
                <textarea value={delayReason} onChange={(e) => setDelayReason(e.target.value)} rows={2}
                  className="border border-border w-full px-3 py-2 text-[14px] rounded-none" />
              </Field>
              <button disabled={!delayReason || delayMin < 1}
                onClick={() => handle(() => delayFn({ data: { flightId, delayMinutes: delayMin, reason: delayReason } }), `Flight delayed +${delayMin}m`)}
                className="bg-warning text-white font-ui font-bold uppercase text-[12px] tracking-wider px-5 py-2.5 disabled:opacity-40">
                <Clock className="w-4 h-4 inline mr-1" /> Apply delay
              </button>
            </div>
          )}

          {flight && tab === "cancel" && (
            <div className="space-y-3">
              <div className="bg-destructive/10 border border-destructive/40 p-3 text-[13px] text-destructive flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />This cancels all bookings, invalidates boarding passes, and issues refunds.</div>
              <Field label="Reason">
                <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={2}
                  className="border border-border w-full px-3 py-2 text-[14px] rounded-none" />
              </Field>
              <Field label='Type "CANCEL" to confirm'>
                <input value={cancelConfirm} onChange={(e) => setCancelConfirm(e.target.value)}
                  className="border border-border w-full px-3 py-2 text-[14px] rounded-none" />
              </Field>
              <button disabled={!cancelReason || cancelConfirm !== "CANCEL"}
                onClick={() => handle(() => cancelFn({ data: { flightId, reason: cancelReason, confirm: "CANCEL" } }), "Flight cancelled")}
                className="bg-destructive text-white font-ui font-bold uppercase text-[12px] tracking-wider px-5 py-2.5 disabled:opacity-40">
                Cancel flight
              </button>
            </div>
          )}

          {flight && tab === "gate" && (
            <div className="space-y-3">
              <Field label="Select gate">
                <select value={gateId} onChange={(e) => setGateId(e.target.value)}
                  className="border border-border w-full px-3 py-2 text-[14px] rounded-none bg-white">
                  <option value="">— pick a gate —</option>
                  {gates.data?.gates.map((g) => (
                    <option key={g.id} value={g.id}>T{g.terminal} · Gate {g.gate_number}</option>
                  ))}
                </select>
              </Field>
              <button disabled={!gateId}
                onClick={() => handle(() => gateFn({ data: { flightId, gateId } }), "Gate updated")}
                className="bg-accent text-white font-ui font-bold uppercase text-[12px] tracking-wider px-5 py-2.5 disabled:opacity-40">
                <MapPin className="w-4 h-4 inline mr-1" /> Assign gate
              </button>
            </div>
          )}

          {flight && tab === "passengers" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground"><Users className="w-4 h-4" />{pax.data?.passengers.length ?? 0} passengers</div>
              {(pax.data?.passengers ?? []).map((p) => (
                <div key={p.booking_id} className="border border-border p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display font-bold text-primary text-[14px]">{p.passenger_name} <span className="text-muted-foreground font-sans font-normal text-[12px]">· {p.seat_number} · {p.cabin_class}</span></div>
                    <div className="text-[11px] text-muted-foreground truncate">{p.booking_id} · {p.email}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusPill status={p.booking_status} />
                    <PaxActions
                      status={p.booking_status}
                      onCheckIn={() => handle(() => checkInFn({ data: { bookingRowId: p.booking_id } }), "Checked in")}
                      onBoard={() => handle(() => boardFn({ data: { bookingRowId: p.booking_id } }), "Boarded")}
                      onNoShow={() => handle(() => noShowFn({ data: { bookingRowId: p.booking_id } }), "Marked no-show")}
                      onCancel={() => {
                        const r = prompt("Cancellation reason?");
                        if (r && r.length >= 2) handle(() => cancelBookingFn({ data: { bookingRowId: p.booking_id, reason: r } }), "Booking cancelled");
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-primary">{children}</span>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-ui mb-1">{label}</div>
      {children}
    </label>
  );
}
function PaxActions({ status, onCheckIn, onBoard, onNoShow, onCancel }: { status: string; onCheckIn: () => void; onBoard: () => void; onNoShow: () => void; onCancel: () => void }) {
  if (status === "Cancelled") return null;
  return (
    <div className="flex gap-1">
      {status === "Confirmed" && <Mini onClick={onCheckIn}>Check in</Mini>}
      {(status === "Confirmed" || status === "Checked-In") && <Mini onClick={onBoard}>Board</Mini>}
      {status !== "Boarded" && status !== "NoShow" && <Mini onClick={onNoShow}>No-show</Mini>}
      <Mini onClick={onCancel} danger>Cancel</Mini>
    </div>
  );
}
function Mini({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={`text-[10px] font-ui font-bold uppercase tracking-wider px-2 py-1 border ${danger ? "border-destructive/30 text-destructive hover:bg-destructive hover:text-white" : "border-border text-primary hover:bg-primary hover:text-white"}`}>
      {children}
    </button>
  );
}
