import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Plane, Users, AlertTriangle, IndianRupee, Activity } from "lucide-react";
import { getAdminDashboardKpis, listRecentAdminActions, listRecentBookings } from "@/lib/admin-dashboard.functions";

export const Route = createFileRoute("/_admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const kpisFn = useServerFn(getAdminDashboardKpis);
  const actionsFn = useServerFn(listRecentAdminActions);
  const bookingsFn = useServerFn(listRecentBookings);

  const kpis = useQuery({ queryKey: ["admin", "kpis"], queryFn: () => kpisFn({}) });
  const actions = useQuery({ queryKey: ["admin", "actions"], queryFn: () => actionsFn({}) });
  const bookings = useQuery({ queryKey: ["admin", "bookings"], queryFn: () => bookingsFn({}) });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-extrabold text-3xl">Operations Dashboard</h1>
        <p className="text-white/60 text-sm font-sans mt-1">Real-time overview of today's activity.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Plane className="w-5 h-5" />} label="Flights Today" value={kpis.data?.totalFlights ?? "—"} accent="#0099d8" />
        <KpiCard icon={<Users className="w-5 h-5" />} label="Bookings Today" value={kpis.data?.totalBookings ?? "—"} accent="#0099d8" />
        <KpiCard icon={<AlertTriangle className="w-5 h-5" />} label="Delayed / Cancelled"
          value={`${kpis.data?.delayedCount ?? 0} / ${kpis.data?.cancelledCount ?? 0}`} accent="#ff7300" />
        <KpiCard icon={<IndianRupee className="w-5 h-5" />} label="Revenue Today"
          value={kpis.data ? `₹${kpis.data.revenueToday.toLocaleString("en-IN")}` : "—"} accent="#28a745" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Status Overview">
          <div className="flex flex-wrap gap-2">
            {Object.entries(kpis.data?.statusCounts ?? {}).map(([s, n]) => (
              <span key={s} className="px-3 py-1.5 bg-[#2a3f5a]/60 border border-[#2a3f5a] text-[12px] font-ui">
                {s}: <b className="font-mono">{n}</b>
              </span>
            ))}
            {!kpis.data && <span className="text-white/40 text-[12px]">Loading…</span>}
            {kpis.data && Object.keys(kpis.data.statusCounts).length === 0 && (
              <span className="text-white/40 text-[12px]">No flights today.</span>
            )}
          </div>
        </Panel>
        <Panel title="Recent Admin Actions">
          <ul className="space-y-1.5">
            {(actions.data ?? []).map((a) => (
              <li key={a.id} className="flex items-start gap-2 text-[12px]">
                <Activity className="w-3.5 h-3.5 mt-0.5 text-[#0099d8] shrink-0" />
                <span className="text-white/80">
                  <b className="text-white">{a.action_type.replace(/_/g, " ")}</b> on {a.target_table}
                  {a.reason ? ` — ${a.reason}` : ""}
                </span>
                <span className="ml-auto text-white/40 font-mono text-[10px]">
                  {new Date(a.created_at).toLocaleTimeString()}
                </span>
              </li>
            ))}
            {actions.data?.length === 0 && <li className="text-white/40 text-[12px]">No recent actions.</li>}
          </ul>
        </Panel>
      </div>

      <Panel title="Recent Bookings (last 10)">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="text-white/50 text-left uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2 pr-3">Booking</th>
                <th className="py-2 pr-3">Passenger</th>
                <th className="py-2 pr-3">Class</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {(bookings.data ?? []).map((b) => (
                <tr key={b.booking_id} className="border-t border-white/5">
                  <td className="py-2 pr-3 font-mono">{b.booking_id}</td>
                  <td className="py-2 pr-3">{b.passenger_name}</td>
                  <td className="py-2 pr-3">{b.cabin_class}</td>
                  <td className="py-2 pr-3 font-mono">₹{Number(b.total_amount).toLocaleString("en-IN")}</td>
                  <td className="py-2 pr-3">{b.booking_status}</td>
                  <td className="py-2 pr-3 text-white/60 font-mono text-[11px]">{new Date(b.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {bookings.data?.length === 0 && (
                <tr><td colSpan={6} className="py-4 text-center text-white/40">No bookings yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="flex gap-3">
        <Link to="/admin/airports" className="bg-[#0099d8] hover:bg-[#007cad] text-white font-ui font-bold uppercase tracking-wider text-[12px] px-5 py-2.5 rounded-none transition">
          Manage Airports →
        </Link>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: React.ReactNode; accent: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-[#1a2940] border border-[#2a3f5a] p-5"
      style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="flex items-center justify-between text-white/60">
        <span className="text-[11px] font-ui uppercase tracking-wider">{label}</span>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div className="font-mono font-bold text-3xl mt-2 text-white">{value}</div>
    </motion.div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-[#1a2940] border border-[#2a3f5a] p-5">
      <h3 className="font-display font-bold text-base mb-3">{title}</h3>
      {children}
    </section>
  );
}
