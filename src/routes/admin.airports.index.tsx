import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/admin/airports/")({
  component: AdminAirportsList,
});

function AdminAirportsList() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "airports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("airports")
        .select("id, iata_code, airport_name, city, state, category, status, total_gates, total_terminals")
        .eq("is_active", true)
        .order("iata_code");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-3xl">Airport Management</h1>
          <p className="text-white/60 text-sm font-sans mt-1">Click an airport to manage its flights for any date.</p>
        </div>
      </div>

      {isLoading && <p className="text-white/50 text-sm">Loading airports…</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {(data ?? []).map((a) => (
          <Link
            key={a.id}
            to="/admin/airports/$code"
            params={{ code: a.iata_code }}
            className="bg-[#1a2940] border border-[#2a3f5a] hover:border-[#0099d8] p-5 transition group"
          >
            <div className="flex items-start justify-between">
              <span className="font-display font-black text-2xl">{a.iata_code}</span>
              <span className="text-[10px] font-ui font-bold uppercase tracking-wider px-2 py-1 bg-[#0099d8]/15 text-[#0099d8]">
                {a.category}
              </span>
            </div>
            <h3 className="font-display font-bold text-sm mt-2 leading-snug">{a.airport_name}</h3>
            <p className="text-[12px] text-white/50 font-sans">{a.city}, {a.state}</p>
            <div className="flex items-center gap-3 mt-3 text-[11px] text-white/60 font-mono">
              <span><Building2 className="w-3 h-3 inline mr-1" />{a.total_gates ?? 0} gates</span>
              <span>{a.total_terminals ?? 0} term.</span>
            </div>
            <div className="mt-4 bg-[#0099d8] group-hover:bg-[#007cad] text-white text-[11px] font-ui font-bold uppercase tracking-wider py-2 text-center transition">
              Manage Flights →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}