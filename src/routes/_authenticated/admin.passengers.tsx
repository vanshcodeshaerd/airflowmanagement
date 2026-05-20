import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Plane, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  listAllUsers,
  listTodaysPassengers,
  forceCheckIn,
  markBoarded,
  markNoShow,
  cancelBooking,
} from "@/lib/admin-passengers.functions";
import { getCurrentRole } from "@/lib/airport-role.functions";

export const Route = createFileRoute("/_authenticated/admin/passengers")({
  head: () => ({ meta: [{ title: "Passenger Management — Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminPassengers,
});

function AdminPassengers() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const roleFn = useServerFn(getCurrentRole);
  const usersFn = useServerFn(listAllUsers);
  const todayFn = useServerFn(listTodaysPassengers);
  const checkInFn = useServerFn(forceCheckIn);
  const boardFn = useServerFn(markBoarded);
  const noShowFn = useServerFn(markNoShow);
  const cancelFn = useServerFn(cancelBooking);

  const role = useQuery({ queryKey: ["role"], queryFn: () => roleFn(), staleTime: 60_000 });
  useEffect(() => {
    if (role.data && role.data.role !== "admin") {
      toast.error("Admin access required");
      navigate({ to: "/dashboard/airports" as never });
    }
  }, [role.data, navigate]);

  const [tab, setTab] = useState<"users" | "today" | "boarding">("today");

  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => usersFn(), enabled: tab === "users" && role.data?.role === "admin" });
  const today = useQuery({ queryKey: ["admin-today-pax"], queryFn: () => todayFn(), enabled: (tab === "today" || tab === "boarding") && role.data?.role === "admin" });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-today-pax"] });
  const handle = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast.success(msg); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  };

  // boarding tracker grouped by flight
  const byFlight = new Map<string, { flight: NonNullable<typeof today.data>["passengers"][number]["flight"]; pax: NonNullable<typeof today.data>["passengers"] }>();
  (today.data?.passengers ?? []).forEach((p) => {
    if (!p.flight) return;
    const e = byFlight.get(p.flight.id) ?? { flight: p.flight, pax: [] };
    e.pax.push(p); byFlight.set(p.flight.id, e);
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[#001f3f] text-white">
        <div className="max-w-7xl mx-auto px-5 h-[60px] flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center gap-2 hover:text-accent">
            <ArrowLeft className="w-4 h-4" /><span className="font-display font-extrabold">AirFlow Admin</span>
          </Link>
          <div className="flex items-center gap-4 text-[12px] font-ui">
            <Link to="/admin/airports" className="hover:underline">Airports</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-8">
        <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="font-display font-extrabold text-[32px] text-primary">Passenger Management</motion.h1>

        <div className="flex border-b border-border mt-6 text-[12px] font-ui font-semibold uppercase tracking-wider">
          {([["users","All users",<Users key="u" className="w-4 h-4" />],["today","Today's flights",<Plane key="t" className="w-4 h-4" />],["boarding","Boarding tracker",<CheckCircle2 key="b" className="w-4 h-4" />]] as const).map(([k,label,icon]) => (
            <button key={k} onClick={() => setTab(k as typeof tab)}
              className={`flex items-center gap-2 px-4 py-3 ${tab === k ? "bg-white text-primary border-b-2 border-accent" : "text-muted-foreground hover:text-primary"}`}>
              {icon}{label}
            </button>
          ))}
        </div>

        {tab === "users" && (
          <div className="bg-white border border-border mt-4 overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-muted/30 text-muted-foreground text-[11px] uppercase tracking-wider">
                <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Joined</th><th className="text-right p-3">Trips</th><th className="text-right p-3">Total spent</th></tr>
              </thead>
              <tbody>
                {users.isLoading && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
                {users.data?.users.map((u) => (
                  <tr key={u.id} className="border-t border-border hover:bg-muted/20">
                    <td className="p-3 font-semibold text-primary">{u.full_name || "—"}</td>
                    <td className="p-3">{new Date(u.joined_at).toLocaleDateString("en-IN")}</td>
                    <td className="p-3 text-right">{u.trips}</td>
                    <td className="p-3 text-right">₹{u.total_spent.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "today" && (
          <div className="bg-white border border-border mt-4 overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-muted/30 text-muted-foreground text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="text-left p-3">Passenger</th>
                  <th className="text-left p-3">Flight</th>
                  <th className="text-left p-3">Seat</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {today.isLoading && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
                {(today.data?.passengers ?? []).map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/20">
                    <td className="p-3"><div className="font-semibold text-primary">{p.passenger_name}</div><div className="text-[11px] text-muted-foreground">{p.email}</div></td>
                    <td className="p-3">{p.flight?.flight_number} · {p.flight?.source_code}→{p.flight?.destination_code}</td>
                    <td className="p-3">{p.seat_number}</td>
                    <td className="p-3"><StatusPill status={p.booking_status} /></td>
                    <td className="p-3 text-right">
                      <PaxActions status={p.booking_status}
                        onCheckIn={() => handle(() => checkInFn({ data: { bookingRowId: p.id } }), "Checked in")}
                        onBoard={() => handle(() => boardFn({ data: { bookingRowId: p.id } }), "Boarded")}
                        onNoShow={() => handle(() => noShowFn({ data: { bookingRowId: p.id } }), "Marked no-show")}
                        onCancel={() => {
                          const r = prompt("Cancellation reason?");
                          if (r && r.length >= 2) handle(() => cancelFn({ data: { bookingRowId: p.id, reason: r } }), "Booking cancelled");
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "boarding" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {[...byFlight.values()].map(({ flight, pax }) => {
              const boarded = pax.filter((p) => p.booking_status === "Boarded").length;
              const checkedIn = pax.filter((p) => p.booking_status === "Checked-In").length;
              const total = pax.filter((p) => p.booking_status !== "Cancelled").length;
              const pct = total > 0 ? Math.round((boarded / total) * 100) : 0;
              return (
                <div key={flight!.id} className="bg-white border border-border p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-display font-extrabold text-primary text-[18px]">{flight!.flight_number}</div>
                    <StatusPill status={flight!.flight_status} />
                  </div>
                  <div className="text-[12px] text-muted-foreground">{flight!.source_code}→{flight!.destination_code} · {new Date(flight!.departure_datetime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                  <div className="mt-3">
                    <div className="h-2 bg-muted">
                      <div className="h-full bg-success transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-[11px] font-ui mt-1 text-muted-foreground">
                      <span>{boarded} boarded · {checkedIn} checked-in</span>
                      <span>{pct}% of {total}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {byFlight.size === 0 && !today.isLoading && <p className="text-muted-foreground col-span-2">No flights today.</p>}
          </div>
        )}
      </main>
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
    Confirmed: "bg-muted text-foreground",
    "Checked-In": "bg-accent/15 text-accent-strong",
    Boarded: "bg-success/15 text-success",
    NoShow: "bg-destructive/15 text-destructive",
  };
  return <span className={`text-[10px] font-ui font-bold uppercase tracking-wider px-2 py-1 rounded-none ${map[status] ?? "bg-muted"}`}>{status}</span>;
}

function PaxActions({ status, onCheckIn, onBoard, onNoShow, onCancel }: { status: string; onCheckIn: () => void; onBoard: () => void; onNoShow: () => void; onCancel: () => void }) {
  if (status === "Cancelled") return null;
  return (
    <div className="inline-flex gap-1">
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
