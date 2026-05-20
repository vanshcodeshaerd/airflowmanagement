import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Plane, Users, Receipt, CreditCard, Ticket, Bell, Settings, LogOut, Building2, IndianRupee,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const links: Array<{ to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; hint?: string; disabled?: boolean }> = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/airports", label: "Airport Management", icon: Building2 },
  { to: "/admin/airports", label: "Flight Management", icon: Plane, hint: "(via airport)" },
  { to: "/admin/operations", label: "Operations", icon: Settings },
  { to: "/admin/refunds", label: "Refunds", icon: IndianRupee },
  { to: "#", label: "Passenger Mgmt", icon: Users, disabled: true },
  { to: "#", label: "Bookings", icon: Ticket, disabled: true },
  { to: "#", label: "Transactions", icon: CreditCard, disabled: true },
  { to: "#", label: "Boarding Passes", icon: Receipt, disabled: true },
  { to: "#", label: "Notifications", icon: Bell, disabled: true },
];

export function AdminSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("userRole");
    localStorage.removeItem("adminVerified");
    window.location.href = "/auth";
  };

  return (
    <aside className="w-[260px] shrink-0 bg-[#001429] text-white flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-white/10">
        <h1 className="font-display font-extrabold text-xl tracking-tight">AirFlow Admin</h1>
        <p className="text-[11px] text-white/50 font-ui uppercase tracking-wider mt-0.5">Control Center</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {links.map((l, i) => {
          const Icon = l.icon;
          const active = !l.disabled && (l.exact ? path === l.to : path.startsWith(l.to));
          if (l.disabled) {
            return (
              <div key={i} className="flex items-center gap-3 px-5 py-2.5 text-[13px] font-ui text-white/30 cursor-not-allowed">
                <Icon className="w-4 h-4" />
                <span>{l.label}</span>
                <span className="ml-auto text-[9px] uppercase tracking-wider">Soon</span>
              </div>
            );
          }
          return (
            <Link
              key={i}
              to={l.to}
              className={`flex items-center gap-3 px-5 py-2.5 text-[13px] font-ui transition border-l-2 ${
                active ? "border-[#0099d8] bg-white/5 text-white" : "border-transparent text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{l.label}</span>
              {l.hint && <span className="ml-auto text-[10px] text-white/40">{l.hint}</span>}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={handleLogout}
        className="m-3 flex items-center justify-center gap-2 bg-[#dc3545] hover:bg-[#b02a37] text-white text-[12px] font-ui font-bold uppercase tracking-wider py-2.5 rounded-none transition"
      >
        <LogOut className="w-4 h-4" /> Logout
      </button>
    </aside>
  );
}
