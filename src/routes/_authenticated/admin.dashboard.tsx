import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Plane, Users, AlertTriangle, DoorOpen, ArrowRight, LogOut } from "lucide-react";
import { getAdminDashboardKpis } from "@/lib/admin-airports.functions";
import { getCurrentRole } from "@/lib/airport-role.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Control Center | AirFlow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const navigate = useNavigate();
  const kpisFn = useServerFn(getAdminDashboardKpis);
  const roleFn = useServerFn(getCurrentRole);

  const role = useQuery({ queryKey: ["role"], queryFn: () => roleFn(), staleTime: 60_000 });
  useEffect(() => {
    if (role.data && role.data.role !== "admin") {
      toast.error("Admin access required");
      navigate({ to: "/dashboard/airports" as never });
    }
  }, [role.data, navigate]);

  const kpis = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: () => kpisFn(),
    enabled: role.data?.role === "admin",
    refetchInterval: 30_000,
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" as never });
  }

  const k = kpis.data;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[#001f3f] text-white">
        <div className="max-w-7xl mx-auto px-5 h-[60px] flex items-center justify-between">
          <div className="font-display font-extrabold text-lg">AirFlow Admin</div>
          <div className="flex items-center gap-4 text-[12px] font-ui">
            <Link to="/admin/airports" className="hover:underline">Airports</Link>
            <Link to="/admin/passengers" className="hover:underline">Passengers</Link>
            <button onClick={signOut} className="flex items-center gap-1.5 hover:text-accent">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-10">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display font-extrabold text-[36px] text-primary">Control Center</h1>
          <p className="text-muted-foreground font-sans text-[15px]">Manage airports, flights and passengers in real time.</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <Kpi icon={<Plane />} label="Flights today" value={k?.flightsToday ?? "—"} />
          <Kpi icon={<AlertTriangle />} label="Delayed" value={k?.delayedFlights ?? "—"} />
          <Kpi icon={<DoorOpen />} label="Gates in use" value={`${k?.gatesInUse ?? "—"} / ${k?.gatesTotal ?? "—"}`} />
          <Kpi icon={<Users />} label="Bookings today" value={k?.bookingsToday ?? "—"} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">
          <ModuleCard
            to="/admin/airports"
            title="Airport Management"
            desc="Manage airport directory, flights, gates and schedules"
            stats={[
              { label: "Active airports", value: k?.activeAirports ?? "—" },
              { label: "Cancelled today", value: k?.cancelledToday ?? "—" },
            ]}
          />
          <ModuleCard
            to="/admin/passengers"
            title="Passenger Management"
            desc="View users, today's passengers, and boarding tracker"
            stats={[
              { label: "Bookings today", value: k?.bookingsToday ?? "—" },
              { label: "Revenue today", value: `₹${(k?.revenueToday ?? 0).toLocaleString()}` },
            ]}
          />
        </div>
      </main>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="bg-white border border-border p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-[11px] font-ui font-bold uppercase tracking-wider">
        <span className="w-4 h-4 text-accent">{icon}</span>{label}
      </div>
      <div className="font-display font-extrabold text-[28px] text-primary mt-1">{value}</div>
    </div>
  );
}

function ModuleCard({ to, title, desc, stats }: { to: string; title: string; desc: string; stats: { label: string; value: React.ReactNode }[] }) {
  return (
    <Link to={to as never} className="block bg-white border border-border p-6 hover:border-accent hover:-translate-y-0.5 transition-all group">
      <div className="flex items-start justify-between">
        <h2 className="font-display font-extrabold text-[22px] text-primary">{title}</h2>
        <ArrowRight className="w-5 h-5 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-[14px] text-muted-foreground font-sans mt-1">{desc}</p>
      <div className="grid grid-cols-2 gap-3 mt-5">
        {stats.map((s) => (
          <div key={s.label} className="border-t border-border pt-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-ui">{s.label}</div>
            <div className="font-display font-bold text-[20px] text-primary">{s.value}</div>
          </div>
        ))}
      </div>
    </Link>
  );
}
