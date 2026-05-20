import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { listAirportFlightsByDate } from "@/lib/admin-flights.functions";
import { FlightActionsBar } from "@/components/admin/FlightActionsBar";

export const Route = createFileRoute("/admin/airports/$code")({
  component: AdminAirportFlightsPage,
});

function AdminAirportFlightsPage() {
  const { code } = Route.useParams();
  const airportCode = code.toUpperCase();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const listFlights = useServerFn(listAirportFlightsByDate);
  const flights = useQuery({
    queryKey: ["admin", "flights", airportCode, date],
    queryFn: () => listFlights({ data: { airportCode, date } }),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Link to="/admin/airports" className="inline-flex items-center gap-2 text-[12px] text-white/60 hover:text-white mb-3">
            <ArrowLeft className="h-3.5 w-3.5" /> Airports
          </Link>
          <h1 className="font-display font-extrabold text-3xl">{airportCode} Flight Operations</h1>
          <p className="text-white/60 text-sm font-sans mt-1">Manage flights, gates, delays, cancellations, and statuses by date.</p>
        </div>
        <label className="block">
          <span className="block text-[10px] font-ui font-bold uppercase tracking-wider text-white/60 mb-1">Flight date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-[#0d1b2a] border border-[#2a3f5a] text-white px-3 py-2 rounded-none" />
        </label>
      </div>

      <div className="bg-[#1a2940] border border-[#2a3f5a] overflow-x-auto">
        <table className="w-full min-w-[980px] text-[12px]">
          <thead className="bg-[#001429] text-white/50 text-left uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-3">Flight</th>
              <th className="py-3 px-3">Route</th>
              <th className="py-3 px-3">Departure</th>
              <th className="py-3 px-3">Arrival</th>
              <th className="py-3 px-3">Gate</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Passengers</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {flights.isLoading && <tr><td colSpan={8} className="py-10 text-center text-white/50"><Loader2 className="inline h-4 w-4 animate-spin mr-2" />Loading flights…</td></tr>}
            {flights.isError && <tr><td colSpan={8} className="py-10 text-center text-[#dc3545]">{flights.error instanceof Error ? flights.error.message : "Unable to load flights"}</td></tr>}
            {flights.data?.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-white/40">No flights for this airport and date.</td></tr>}
            {(flights.data ?? []).map((flight) => (
              <tr key={flight.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                <td className="py-3 px-3 font-mono font-bold text-white">{flight.flight_number}</td>
                <td className="py-3 px-3 font-mono">{flight.source_code} → {flight.destination_code}</td>
                <td className="py-3 px-3 font-mono text-white/80">{new Date(flight.departure_datetime).toLocaleString()}</td>
                <td className="py-3 px-3 font-mono text-white/80">{new Date(flight.arrival_datetime).toLocaleString()}</td>
                <td className="py-3 px-3 font-mono">{flight.terminal && flight.gate_number ? `${flight.terminal}/${flight.gate_number}` : "—"}</td>
                <td className="py-3 px-3"><span className="bg-white/10 px-2 py-1 font-ui uppercase tracking-wider text-[10px]">{flight.flight_status}</span></td>
                <td className="py-3 px-3 font-mono">{flight.passengers_confirmed}</td>
                <td className="py-3 px-3"><div className="flex justify-end"><FlightActionsBar flight={flight} airportCode={airportCode} onDone={() => flights.refetch()} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}