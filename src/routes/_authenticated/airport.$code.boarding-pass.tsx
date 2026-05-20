import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { QRCodeSVG } from "qrcode.react";
import { z } from "zod";
import { ArrowLeft, Loader2, Plane, Printer, Ticket } from "lucide-react";
import { getMyBookings, getBoardingPass } from "@/lib/flights.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const searchSchema = z.object({ booking: z.string().optional() });

export const Route = createFileRoute("/_authenticated/airport/$code/boarding-pass")({
  validateSearch: searchSchema,
  head: ({ params }) => ({
    meta: [
      { title: `${params.code?.toUpperCase()} — Boarding Pass | AirFlow` },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: BoardingPassPage,
});

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function BoardingPassPage() {
  const { code } = Route.useParams();
  const { booking } = Route.useSearch();
  const [selected, setSelected] = useState<string | null>(booking ?? null);

  useEffect(() => {
    if (booking) setSelected(booking);
  }, [booking]);

  const myFn = useServerFn(getMyBookings);
  const myQ = useQuery({ queryKey: ["my-bookings"], queryFn: () => myFn({}) });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b print:hidden">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/airport/$code/dashboard" params={{ code: code.toUpperCase() }}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <h1 className="text-xl font-semibold">My Boarding Passes</h1>
        </div>
      </header>

      <main className="container mx-auto grid gap-6 px-4 py-6 md:grid-cols-[320px_1fr]">
        <Card className="p-3 print:hidden">
          <div className="mb-2 px-2 text-sm font-semibold text-muted-foreground">Your bookings</div>
          {myQ.isLoading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {myQ.data && myQ.data.bookings.length === 0 && (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              No bookings yet.
              <div className="mt-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/airport/$code/flights" params={{ code: code.toUpperCase() }}>
                    Book a flight
                  </Link>
                </Button>
              </div>
            </div>
          )}
          <div className="space-y-1">
            {(myQ.data?.bookings ?? []).map((b) => (
              <button
                key={b.booking_id}
                onClick={() => setSelected(b.booking_id)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-muted ${
                  selected === b.booking_id ? "bg-muted" : ""
                }`}
              >
                <div className="font-semibold">
                  {b.flight?.source_code} → {b.flight?.destination_code}
                </div>
                <div className="text-xs text-muted-foreground">
                  {b.flight && fmtDateTime(b.flight.departure_datetime)}
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">{b.booking_id}</div>
              </button>
            ))}
          </div>
        </Card>

        <div>
          {selected ? (
            <BoardingPassView bookingId={selected} />
          ) : (
            <Card className="flex h-full min-h-[400px] items-center justify-center p-8 text-center text-muted-foreground">
              <div>
                <Ticket className="mx-auto mb-3 h-10 w-10" />
                Select a booking on the left to view its boarding pass.
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function BoardingPassView({ bookingId }: { bookingId: string }) {
  const fn = useServerFn(getBoardingPass);
  const q = useQuery({
    queryKey: ["boarding-pass", bookingId],
    queryFn: () => fn({ data: { bookingId } }),
  });

  if (q.isLoading) {
    return (
      <Card className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </Card>
    );
  }
  if (q.error || !q.data) {
    return <Card className="p-6 text-destructive">Unable to load boarding pass.</Card>;
  }

  const bp = q.data.boardingPass;
  const f = q.data.flight;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between bg-primary px-6 py-4 text-primary-foreground">
        <div className="flex items-center gap-3">
          {f?.airline_logo ? (
            <img src={f.airline_logo} alt={f.airline_name} className="h-10 w-10 rounded bg-white object-contain p-1" />
          ) : (
            <Plane className="h-8 w-8" />
          )}
          <div>
            <div className="text-lg font-bold">{f?.airline_name}</div>
            <div className="text-xs opacity-90">{f?.flight_number} · {f?.aircraft_type}</div>
          </div>
        </div>
        <Badge variant="secondary">BOARDING PASS</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs text-muted-foreground">From</div>
              <div className="text-3xl font-bold">{f?.source_code}</div>
            </div>
            <Plane className="mx-4 h-6 w-6 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">To</div>
              <div className="text-3xl font-bold">{f?.destination_code}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-y py-4 text-sm">
            <Field label="Passenger" value={bp.passenger_name} />
            <Field label="Seat" value={bp.seat_number} />
            <Field label="Cabin" value={bp.cabin_class} />
            <Field label="Boarding group" value={bp.boarding_group} />
            <Field label="Gate" value={bp.gate_number ?? "TBD"} />
            <Field label="Boarding time" value={fmtDateTime(bp.boarding_time)} />
            <Field label="Departure" value={f ? fmtDateTime(f.departure_datetime) : "—"} />
            <Field label="Arrival" value={f ? fmtDateTime(f.arrival_datetime) : "—"} />
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Booking ID</div>
            <div className="font-mono text-sm font-semibold">{bp.booking_id}</div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-2">
          <div className="rounded-md border bg-white p-2">
            <QRCodeSVG value={bp.qr_data} size={140} />
          </div>
          <div className="text-[10px] text-muted-foreground">Scan at gate</div>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t px-6 py-3 print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
