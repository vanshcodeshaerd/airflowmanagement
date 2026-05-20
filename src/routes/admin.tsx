import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // Client-side gate: spec — email starts with admin_ AND adminVerified flag was set at login
    const role = localStorage.getItem("userRole");
    const verified = localStorage.getItem("adminVerified");
    const email = data.user.email ?? "";
    if (role !== "ADMIN" || verified !== "true" || !email.toLowerCase().startsWith("admin_")) {
      throw redirect({ to: "/auth" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  let title = "Dashboard";
  if (path === "/admin/airports") title = "Airport Management";
  else if (path.startsWith("/admin/airports/")) title = "Flight Operations";
  else if (path === "/admin/refunds") title = "Refund Management";
  else if (path === "/admin/operations") title = "Operations";

  return (
    <div className="min-h-screen flex bg-[#0d1b2a] text-white">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-[#001429] border-b border-white/10 flex items-center justify-between px-6">
          <h2 className="font-display font-bold text-lg">{title}</h2>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-ui font-bold uppercase tracking-wider bg-[#dc3545] text-white px-2.5 py-1 rounded-none">
              ADMIN
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
        <Toaster />
      </div>
    </div>
  );
}
