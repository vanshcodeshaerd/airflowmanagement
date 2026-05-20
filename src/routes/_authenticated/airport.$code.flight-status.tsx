import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Plane, Search, MapPin, Clock, DoorOpen } from "lucide-react";
import {
  listAirportFlights,
  findFlightByReference,
  ensureGateForFlight,
  type FlightStatusRow,
} from "@/lib/flight-status.functions";
import { getFlightAircraftAndStops } from "@/lib/legacy.functions";
import {
  computeLiveStatus,
  statusPalette,
  formatCountdown,
  timelineSteps,
} from "@/lib/flight-status-timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/airport/$code/flight-status")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.code?.toUpperCase()} — Flight Status | AirFlow` },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: FlightStatusPage,
});

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function FlightStatusPage() {
  const { code } = Route.useParams();
  const airportCode = code.toUpperCase();
  const now = useNow(30_000);

  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"flight" | "booking" | "email">("flight");
  const [searchInput, setSearchInput] = useState("");
  const [searchPayload, setSearchPayload] = useState<{
    flightNumber?: string;
    bookingId?: string;
    email?: string;
  } | null>(null);

  const listFn = useServerFn(listAirportFlights);
  const findFn = useServerFn(findFlightByReference);

  const listQuery = useQuery({
    queryKey: ["airport-flights", airportCode, tab, query],
    queryFn: () => listFn({ data: { code: airportCode, scope: tab, query: query || undefined } }),
    refetchInterval: 30_000,
  });

  const findQuery = useQuery({
    queryKey: ["find-flight", searchPayload],
    queryFn: () => findFn({ data: searchPayload! }),
    enabled: !!searchPayload,
  });

  const flights = searchPayload ? findQuery.data?.flights ?? [] : listQuery.data?.flights ?? [];
  const isLoading = searchPayload ? findQuery.isLoading : listQuery.isLoading;

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const v = searchInput.trim();
    if (!v) {
      setSearchPayload(null);
      return;
    }
    setSearchPayload(
      searchMode === "flight"
        ? { flightNumber: v }
        : searchMode === "booking"
          ? { bookingId: v }
          : { email: v },
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/airport/$code/dashboard" params={{ code: airportCode }}>
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Flight Status — {airportCode}</h1>
            <p className="text-sm text-muted-foreground">
              Live tracking · updates every 30s
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card className="p-4">
          <form onSubmit={submitSearch} className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex gap-2">
              {(["flight", "booking", "email"] as const).map((m) => (
                <Button
                  key={m}
                  type="button"
                  size="sm"
                  variant={searchMode === m ? "default" : "outline"}
                  onClick={() => setSearchMode(m)}
                >
                  {m === "flight" ? "Flight #" : m === "booking" ? "Booking ID" : "Email"}
                </Button>
              ))}
            </div>
            <div className="flex-1 flex gap-2">
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={
                  searchMode === "flight"
                    ? "AI-301"
                    : searchMode === "booking"
                      ? "AI-20240520-782541-AB7C3F"
                      : "passenger@example.com"
                }
              />
              <Button type="submit">
                <Search className="h-4 w-4" /> Search
              </Button>
              {searchPayload && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSearchInput("");
                    setSearchPayload(null);
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </form>
        </Card>

        {!searchPayload && (
          <Tabs value={tab} onValueChange={(v) => setTab(v as "upcoming" | "past")}>
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming (next 36h)</TabsTrigger>
              <TabsTrigger value="past">Past Flights</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="mt-4">
              <div className="mb-3">
                <Input
                  placeholder="Filter by flight number…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="max-w-xs"
                />
              </div>
            </TabsContent>
            <TabsContent value="past" className="mt-4" />
          </Tabs>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : flights.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <Plane className="h-10 w-10 mx-auto mb-3 opacity-40" />
            No flights found.
          </Card>
        ) : (
          <div className="space-y-4">
            {flights.map((f) => (
              <FlightStatusCard key={f.id} flight={f} now={now} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function FlightStatusCard({ flight, now }: { flight: FlightStatusRow; now: Date }) {
  const live = computeLiveStatus({
    departureISO: flight.departure_datetime,
    storedStatus: flight.flight_status,
    delayMinutes: flight.delay_minutes,
    now,
  });
  const palette = statusPalette(live);
  const steps = timelineSteps({
    departureISO: flight.departure_datetime,
    delayMinutes: flight.delay_minutes,
    now,
  });

  const dep = new Date(flight.departure_datetime);
  const arr = new Date(flight.arrival_datetime);
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  const fmtDate = (d: Date) =>
    d.toLocaleDateString([], { day: "2-digit", month: "short" });

  // Trigger on-demand gate assignment when we cross into the T-60 window
  const ensureFn = useServerFn(ensureGateForFlight);
  const gateMutation = useMutation({ mutationFn: ensureFn });
  const minsToDep = (dep.getTime() - now.getTime()) / 60_000;
  useEffect(() => {
    if (!flight.gate_number && minsToDep <= 60 && minsToDep > 0 && !gateMutation.isPending) {
      gateMutation.mutate({ data: { flightId: flight.id } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight.id, flight.gate_number, Math.floor(minsToDep / 5)]);

  const effectiveGate = gateMutation.data?.gate ?? flight.gate_number;
  const effectiveTerminal = gateMutation.data?.terminal ?? flight.terminal;
  const showGate = live === "Security" || live === "Boarding" || live === "Departed";

  return (
    <Card className="overflow-hidden">
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {flight.airline_logo && (
              <img src={flight.airline_logo} alt={flight.airline_name} className="h-8 w-auto" />
            )}
            <div>
              <div className="font-bold text-lg">{flight.flight_number}</div>
              <div className="text-xs text-muted-foreground">{flight.airline_name}</div>
            </div>
          </div>
          <Badge className={cn("font-semibold", palette.badgeClass)} variant="outline">
            {palette.label}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
          <div className="text-center md:text-right">
            <div className="text-3xl font-bold tabular-nums">{fmtTime(dep)}</div>
            <div className="text-sm font-semibold">{flight.source_code}</div>
            <div className="text-xs text-muted-foreground">{fmtDate(dep)}</div>
          </div>
          <div className="flex flex-col items-center text-muted-foreground">
            <Plane className="h-5 w-5 rotate-90" />
            <div className="text-xs mt-1">
              {Math.floor(flight.duration_minutes / 60)}h {flight.duration_minutes % 60}m
            </div>
            {flight.delay_minutes > 0 && (
              <div className="text-xs text-destructive font-medium mt-1">
                +{flight.delay_minutes}m delay
              </div>
            )}
          </div>
          <div className="text-center md:text-left">
            <div className="text-3xl font-bold tabular-nums">{fmtTime(arr)}</div>
            <div className="text-sm font-semibold">{flight.destination_code}</div>
            <div className="text-xs text-muted-foreground">{fmtDate(arr)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Info icon={<Plane className="h-4 w-4" />} label="Aircraft" value={flight.aircraft_type} />
          <Info
            icon={<Clock className="h-4 w-4" />}
            label={live === "Departed" ? "Departed" : "In"}
            value={live === "Departed" ? fmtTime(dep) : formatCountdown(flight.departure_datetime, now)}
          />
          <Info
            icon={<MapPin className="h-4 w-4" />}
            label="Terminal"
            value={showGate ? effectiveTerminal ?? "TBD" : "—"}
          />
          <Info
            icon={<DoorOpen className="h-4 w-4" />}
            label="Gate"
            value={showGate ? effectiveGate ?? "TBD" : "—"}
            highlight={live === "Boarding" && !!effectiveGate}
          />
        </div>

        {/* Timeline */}
        {live !== "Departed" && live !== "Cancelled" && (
          <div className="pt-2">
            <div className="flex items-center gap-1">
              {steps.map((s, i) => {
                const p = statusPalette(
                  s.key === "checkin"
                    ? "Check-in"
                    : s.key === "security"
                      ? "Security"
                      : s.key === "boarding"
                        ? "Boarding"
                        : "Departed",
                );
                return (
                  <div key={s.key} className="flex-1 flex items-center gap-1">
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full transition-colors",
                        s.reached ? p.dotClass : "bg-muted",
                        s.current && "ring-2 ring-offset-1 ring-offset-background ring-foreground/40",
                      )}
                    />
                    {i < steps.length - 1 && (
                      <div
                        className={cn(
                          "h-0.5 flex-1 rounded transition-colors",
                          steps[i + 1].reached ? p.dotClass : "bg-muted",
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              <span>T-60 Check-in</span>
              <span>T-45 Security</span>
              <span>T-30 Boarding</span>
              <span>T-0 Depart</span>
            </div>
          </div>
        )}

        {live === "Departed" && flight.actual_departure_time && (
          <div className="text-sm text-emerald-600 dark:text-emerald-400">
            Departed at {fmtTime(new Date(flight.actual_departure_time))}
          </div>
        )}
      </div>
    </Card>
  );
}

function Info({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border bg-card p-2.5",
        highlight && "border-primary bg-primary/5",
      )}
    >
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("font-semibold mt-0.5", highlight && "text-primary text-lg")}>
        {value}
      </div>
    </div>
  );
}
