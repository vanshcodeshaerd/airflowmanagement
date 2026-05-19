import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { X, Loader2, Navigation, MapPin } from "lucide-react";
import { getAirport } from "@/lib/airports.functions";
import { getDirectionsUrl, getPinUrl } from "./utils";

interface Props {
  id: string;
  onClose: () => void;
}

export function AirportDetailModal({ id, onClose }: Props) {
  const fn = useServerFn(getAirport);
  const q = useQuery({
    queryKey: ["airport", id],
    queryFn: () => fn({ data: { id } }),
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white max-w-2xl w-full max-h-[90vh] overflow-auto p-7 relative"
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 text-muted-foreground hover:text-primary"
          >
            <X className="w-5 h-5" />
          </button>
          {q.isLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          )}
          {q.data && (
            <>
              <div className="flex items-baseline gap-3">
                <span className="font-display font-black text-3xl text-primary">
                  {q.data.airport.iata_code}
                </span>
                <span className="text-[12px] text-muted-foreground font-sans">
                  {q.data.airport.icao_code}
                </span>
              </div>
              <h2 className="font-display font-extrabold text-2xl text-primary mt-1">
                {q.data.airport.airport_name}
              </h2>
              <p className="text-[14px] text-muted-foreground font-sans">
                {q.data.airport.city}, {q.data.airport.state}, {q.data.airport.country}
              </p>

              <dl className="grid grid-cols-2 gap-3 mt-5 text-[13px] font-sans">
                <Row label="Category" value={q.data.airport.category} />
                <Row label="Status" value={q.data.airport.status} />
                <Row label="Operator" value={q.data.airport.operator ?? "—"} />
                <Row
                  label="Coordinates"
                  value={`${q.data.airport.latitude}°N, ${q.data.airport.longitude}°E`}
                />
                <Row label="Gates" value={`${q.data.airport.total_gates ?? "—"}`} />
                <Row label="Terminals" value={`${q.data.airport.total_terminals ?? "—"}`} />
                <Row label="Runways" value={`${q.data.airport.total_runways ?? "—"}`} />
                <Row
                  label="Annual passengers"
                  value={
                    q.data.airport.annual_passengers_million != null
                      ? `${q.data.airport.annual_passengers_million}M`
                      : "—"
                  }
                />
                <Row label="Phone" value={q.data.airport.contact_phone ?? "—"} />
                <Row label="Email" value={q.data.airport.contact_email ?? "—"} />
              </dl>

              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href={getDirectionsUrl(q.data.airport)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-accent hover:bg-accent-strong text-white font-ui font-bold uppercase tracking-wider text-[12px] px-4 py-2.5 transition"
                >
                  <Navigation className="w-4 h-4" />
                  Get Directions
                </a>
                <a
                  href={getPinUrl(q.data.airport)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border-2 border-accent text-accent hover:bg-sky-soft font-ui font-bold uppercase tracking-wider text-[12px] px-4 py-2 transition"
                >
                  <MapPin className="w-4 h-4" />
                  View on Map
                </a>
              </div>

              {q.data.services.length > 0 && (
                <div className="mt-5">
                  <h3 className="font-display font-bold text-[14px] text-primary mb-2">
                    Services
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {q.data.services.map((s) => (
                      <span
                        key={s.id}
                        className="text-[11px] font-ui font-semibold bg-sky-soft text-accent-strong px-2 py-1"
                      >
                        {s.service_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {q.data.airlines.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-display font-bold text-[14px] text-primary mb-2">
                    Airlines
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {q.data.airlines.map((a) => (
                      <span
                        key={a.id}
                        className="text-[11px] font-ui font-semibold bg-muted text-primary px-2 py-1"
                      >
                        {a.airline_code} {a.airline_name ? `— ${a.airline_name}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider font-ui font-semibold text-muted-foreground">
        {label}
      </dt>
      <dd className="text-primary">{value}</dd>
    </div>
  );
}
