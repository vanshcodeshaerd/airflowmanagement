import { Building, Info, LayoutGrid, Navigation, Users } from "lucide-react";
import type { Airport } from "./types";
import { getDirectionsUrl } from "./utils";

interface Props {
  airport: Airport;
  onView: () => void;
  onSelect: () => void;
}

const categoryBadge: Record<Airport["category"], string> = {
  Domestic: "bg-success/15 text-success",
  International: "bg-accent/15 text-accent-strong",
  Private: "bg-destructive/15 text-destructive",
};

const statusBadge: Record<Airport["status"], string> = {
  Active: "bg-success/15 text-success",
  "Under Construction": "bg-warning/15 text-warning",
  Proposed: "bg-muted text-muted-foreground",
};

export function AirportCard({ airport, onView, onSelect }: Props) {
  return (
    <article className="group bg-white border border-border rounded-none p-5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.12)] hover:border-accent hover:-translate-y-1 transition-all duration-300 flex flex-col">
      <header className="flex items-start justify-between gap-3">
        <span className="font-display font-black text-[24px] text-primary leading-none">
          {airport.iata_code}
        </span>
        <span
          className={`text-[10px] font-ui font-bold uppercase tracking-wider px-2 py-1 rounded-none ${categoryBadge[airport.category]}`}
        >
          {airport.category}
        </span>
      </header>

      <h3 className="font-display font-bold text-[16px] text-primary mt-2 leading-snug">
        {airport.airport_name}
      </h3>
      <p className="text-[13px] text-muted-foreground font-sans mt-0.5">
        {airport.city}, {airport.state}
      </p>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <Stat icon={<LayoutGrid className="w-3.5 h-3.5" />} label={`${airport.total_gates ?? "—"} Gates`} />
        <Stat
          icon={<Building className="w-3.5 h-3.5" />}
          label={`${airport.total_terminals ?? "—"} Term.`}
        />
        <Stat
          icon={<Users className="w-3.5 h-3.5" />}
          label={
            airport.annual_passengers_million != null
              ? `${airport.annual_passengers_million}M`
              : "—"
          }
        />
      </div>

      <hr className="my-3 border-border" />

      <a
        href={getDirectionsUrl(airport)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title="Open directions in Google Maps"
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-accent-strong font-sans group/map"
      >
        <Navigation className="w-3 h-3 shrink-0 group-hover/map:text-accent-strong" />
        <span className="underline-offset-2 group-hover/map:underline">
          {airport.latitude.toFixed(4)}°N, {airport.longitude.toFixed(4)}°E · Directions
        </span>
      </a>
      {airport.operator && (
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground font-sans mt-1">
          <Info className="w-3 h-3 shrink-0" />
          <span className="truncate">{airport.operator}</span>
        </div>
      )}

      <div className="mt-3">
        <span
          className={`text-[10px] font-ui font-bold uppercase tracking-wider px-2 py-1 rounded-none ${statusBadge[airport.status]}`}
        >
          {airport.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={onSelect}
          className="bg-accent hover:bg-accent-strong text-white font-ui font-bold uppercase tracking-wider text-[12px] py-2.5 rounded-none transition"
        >
          Select
        </button>
        <button
          onClick={onView}
          className="border-2 border-accent text-accent hover:bg-sky-soft font-ui font-bold uppercase tracking-wider text-[12px] py-2 rounded-none transition"
        >
          Details
        </button>
      </div>
    </article>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1 text-[11px] font-ui font-semibold text-primary">
      {icon}
      <span className="truncate">{label}</span>
    </div>
  );
}
