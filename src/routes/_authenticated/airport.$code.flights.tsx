import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Plane, Clock, IndianRupee, Search } from "lucide-react";
import { toast } from "sonner";
import {
  searchFlights,
  getDestinationsForSource,
  createBooking,
  type FlightRow,
  type CabinClass,
} from "@/lib/flights.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { UpiPaymentBox } from "@/components/payments/UpiPaymentBox";

export const Route = createFileRoute("/_authenticated/airport/$code/flights")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.code?.toUpperCase()} — Book a Flight | AirFlow` },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: FlightsPage,
});

const CABINS: CabinClass[] = ["Economy", "Premium Economy", "Business", "First Class"];

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDur(min: number) {
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}
function priceFor(f: FlightRow, c: CabinClass) {
  return c === "Economy"
    ? f.economy_price
    : c === "Premium Economy"
      ? f.premium_economy_price
      : c === "Business"
        ? f.business_price
        : f.first_class_price;
}

function FlightsPage() {
  const { code } = Route.useParams();
  const source = code.toUpperCase();
  const navigate = useNavigate();

  const destFn = useServerFn(getDestinationsForSource);
  const destQ = useQuery({
    queryKey: ["destinations", source],
    queryFn: () => destFn({ data: { source } }),
  });

  const [destination, setDestination] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [airline, setAirline] = useState<string>("any");
  const [cabin, setCabin] = useState<CabinClass>("Economy");
  const [sortBy, setSortBy] = useState<"departure" | "price" | "duration">("departure");
  const [searched, setSearched] = useState(false);

  const searchFn = useServerFn(searchFlights);
  const flightsQ = useQuery({
    queryKey: ["flights", source, destination, date, airline, cabin, sortBy],
    queryFn: () =>
      searchFn({
        data: {
          source,
          destination: destination || undefined,
          date: date || undefined,
          airline: airline === "any" ? undefined : airline,
          cabinClass: cabin,
          sortBy,
        },
      }),
    enabled: searched,
  });

  const [bookingFlight, setBookingFlight] = useState<FlightRow | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/airport/$code/dashboard" params={{ code: source }}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <h1 className="text-xl font-semibold">Book a Flight from {source}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Card className="mb-6 p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearched(true);
            }}
            className="grid grid-cols-1 gap-4 md:grid-cols-6"
          >
            <div className="md:col-span-1">
              <Label>From</Label>
              <Input value={source} disabled className="mt-1 font-semibold" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="destination">To</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger id="destination" className="mt-1">
                  <SelectValue placeholder="Any destination" />
                </SelectTrigger>
                <SelectContent>
                  {(destQ.data?.destinations ?? []).map((d) => (
                    <SelectItem key={d.code} value={d.code}>
                      {d.code} — {d.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                min={new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="md:col-span-1">
              <Label>Cabin</Label>
              <Select value={cabin} onValueChange={(v) => setCabin(v as CabinClass)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CABINS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1 flex items-end">
              <Button type="submit" className="w-full">
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>
          </form>

          {searched && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Label className="text-sm text-muted-foreground">Sort by</Label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="departure">Departure time</SelectItem>
                  <SelectItem value="price">Price (low to high)</SelectItem>
                  <SelectItem value="duration">Duration</SelectItem>
                </SelectContent>
              </Select>
              <Label className="ml-4 text-sm text-muted-foreground">Airline</Label>
              <Select value={airline} onValueChange={setAirline}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any airline</SelectItem>
                  <SelectItem value="AI">Air India</SelectItem>
                  <SelectItem value="6E">IndiGo</SelectItem>
                  <SelectItem value="UK">Vistara</SelectItem>
                  <SelectItem value="SG">SpiceJet</SelectItem>
                  <SelectItem value="QP">Akasa Air</SelectItem>
                  <SelectItem value="I5">Air India Express</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </Card>

        {!searched && (
          <Card className="p-12 text-center text-muted-foreground">
            <Plane className="mx-auto mb-3 h-10 w-10" />
            Select a destination (or leave blank) and click Search to find flights departing more than 24 hours from now.
          </Card>
        )}

        {searched && flightsQ.isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {searched && flightsQ.data && flightsQ.data.flights.length === 0 && (
          <Card className="p-12 text-center text-muted-foreground">
            No flights match your filters.
          </Card>
        )}

        <div className="space-y-3">
          {(flightsQ.data?.flights ?? []).map((f) => (
            <FlightCard key={f.id} flight={f} cabin={cabin} onBook={() => setBookingFlight(f)} />
          ))}
        </div>
      </main>

      {bookingFlight && (
        <BookingDialog
          flight={bookingFlight}
          cabin={cabin}
          onClose={() => setBookingFlight(null)}
          onBooked={(bookingId) => {
            setBookingFlight(null);
            navigate({
              to: "/airport/$code/boarding-pass",
              params: { code: source },
              search: { booking: bookingId },
            });
          }}
        />
      )}
    </div>
  );
}

function FlightCard({
  flight,
  cabin,
  onBook,
}: {
  flight: FlightRow;
  cabin: CabinClass;
  onBook: () => void;
}) {
  const price = priceFor(flight, cabin);
  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_2fr_auto] md:items-center">
        <div className="flex items-center gap-3">
          {flight.airline_logo ? (
            <img src={flight.airline_logo} alt={flight.airline_name} className="h-10 w-10 rounded object-contain" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
              <Plane className="h-5 w-5" />
            </div>
          )}
          <div>
            <div className="font-semibold">{flight.airline_name}</div>
            <div className="text-xs text-muted-foreground">
              {flight.flight_number} · {flight.aircraft_type}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="text-center">
            <div className="text-lg font-bold">{fmtTime(flight.departure_datetime)}</div>
            <div className="text-xs text-muted-foreground">{flight.source_code}</div>
          </div>
          <div className="flex flex-1 flex-col items-center text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {fmtDur(flight.duration_minutes)}
            </div>
            <div className="my-1 h-px w-full bg-border" />
            <Badge variant="secondary" className="text-[10px]">
              {flight.number_of_stops === 0 ? "Non-stop" : `${flight.number_of_stops} stop`}
            </Badge>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{fmtTime(flight.arrival_datetime)}</div>
            <div className="text-xs text-muted-foreground">{flight.destination_code}</div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center text-2xl font-bold">
            <IndianRupee className="h-5 w-5" />
            {price.toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-muted-foreground">{cabin}</div>
          <Button size="sm" onClick={onBook}>
            Book
          </Button>
        </div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{fmtDate(flight.departure_datetime)}</div>
    </Card>
  );
}

function BookingDialog({
  flight,
  cabin,
  onClose,
  onBooked,
}: {
  flight: FlightRow;
  cabin: CabinClass;
  onClose: () => void;
  onBooked: (id: string) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [bookingId, setBookingId] = useState<string>("");
  const [form, setForm] = useState({
    passengerName: "",
    passengerAge: "",
    passengerPhone: "",
    passengerPassportId: "",
    email: "",
  });

  const createFn = useServerFn(createBooking);
  const mut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          flightId: flight.id,
          passengerName: form.passengerName.trim(),
          passengerAge: Number(form.passengerAge),
          passengerPhone: form.passengerPhone.trim(),
          passengerPassportId: form.passengerPassportId.trim(),
          email: form.email.trim(),
          cabinClass: cabin,
        },
      }),
    onSuccess: (res) => {
      setBookingId(res.bookingId);
      setStep(3);
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setStep(2);
    },
  });

  const price = priceFor(flight, cabin);
  const valid =
    form.passengerName.length >= 2 &&
    Number(form.passengerAge) > 0 &&
    form.passengerPhone.length >= 7 &&
    form.passengerPassportId.length >= 4 &&
    /^[^@]+@[^@]+\.[^@]+$/.test(form.email);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Passenger details"}
            {step === 2 && "Review booking"}
            {step === 3 && "Pay with UPI"}
            {step === 4 && "Creating booking…"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3">
            <div>
              <Label>Full name</Label>
              <Input
                value={form.passengerName}
                onChange={(e) => setForm({ ...form, passengerName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Age</Label>
                <Input
                  type="number"
                  value={form.passengerAge}
                  onChange={(e) => setForm({ ...form, passengerAge: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={form.passengerPhone}
                  onChange={(e) => setForm({ ...form, passengerPhone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Passport / ID</Label>
              <Input
                value={form.passengerPassportId}
                onChange={(e) => setForm({ ...form, passengerPassportId: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Used to derive your booking ID. Boarding pass is saved to your profile.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 text-sm">
            <Card className="p-3">
              <div className="flex items-center gap-2 font-semibold">
                {flight.airline_name} · {flight.flight_number}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold">{fmtTime(flight.departure_datetime)}</div>
                  <div className="text-xs">{flight.source_code}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {fmtDur(flight.duration_minutes)} · {fmtDate(flight.departure_datetime)}
                </div>
                <div>
                  <div className="text-lg font-bold">{fmtTime(flight.arrival_datetime)}</div>
                  <div className="text-xs">{flight.destination_code}</div>
                </div>
              </div>
            </Card>
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Passenger:</span> {form.passengerName}</div>
              <div><span className="text-muted-foreground">Age:</span> {form.passengerAge}</div>
              <div><span className="text-muted-foreground">Phone:</span> {form.passengerPhone}</div>
              <div><span className="text-muted-foreground">ID:</span> {form.passengerPassportId}</div>
              <div className="col-span-2"><span className="text-muted-foreground">Email:</span> {form.email}</div>
              <div><span className="text-muted-foreground">Cabin:</span> {cabin}</div>
              <div className="text-right font-bold flex items-center justify-end">
                <IndianRupee className="h-4 w-4" />
                {price.toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        <DialogFooter>
          {step === 1 && (
            <>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button disabled={!valid} onClick={() => setStep(2)}>Review</Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button
                onClick={() => {
                  setStep(3);
                  mut.mutate();
                }}
              >
                Confirm booking
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
