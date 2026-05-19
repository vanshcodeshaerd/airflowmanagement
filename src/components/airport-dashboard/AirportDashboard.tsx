import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building,
  Calendar,
  Check,
  Headphones,
  LayoutGrid,
  LogOut,
  Loader2,
  Map,
  Navigation,
  Phone,
  Plane,
  Search,
  Settings,
  Ticket,
  TrendingUp,
  User,
} from "lucide-react";
import { getAirportByCode } from "@/lib/airports.functions";
import { supabase } from "@/integrations/supabase/client";
import { getDirectionsUrl } from "@/components/airports/utils";
import type { Airport } from "@/components/airports/types";
import { SupportModal } from "./SupportModal";

interface Props {
  code: string;
}

export function AirportDashboard({ code }: Props) {
  const navigate = useNavigate();
  const fn = useServerFn(getAirportByCode);
  const q = useQuery({
    queryKey: ["airport-by-code", code],
    queryFn: () => fn({ data: { code } }),
  });

  const [now, setNow] = useState(new Date());
  const [supportOpen, setSupportOpen] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" as never });
  }

  if (q.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const airport = q.data as Airport | null | undefined;

  if (!airport) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-5 text-center">
        <h1 className="font-display font-extrabold text-3xl text-primary">Airport not found</h1>
        <p className="text-muted-foreground font-sans mt-2">
          We couldn't find an airport with code "{code}".
        </p>
        <Link
          to="/dashboard/airports"
          className="mt-6 inline-flex items-center gap-2 bg-accent hover:bg-accent-strong text-white font-ui font-bold uppercase tracking-wider text-[12px] px-5 py-2.5 rounded-none transition"
        >
          <ArrowLeft className="w-4 h-4" /> Select an airport
        </Link>
      </div>
    );
  }

  // Mock today-stats derived deterministically from the airport
  const seed = airport.iata_code.charCodeAt(0) + airport.iata_code.charCodeAt(1);
  const flightsToday = 180 + (seed % 120);
  const onTimeRate = 88 + (seed % 10);
  const activeGates = airport.total_gates
    ? Math.max(1, Math.round(airport.total_gates * 0.85))
    : 12;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-5 sm:px-7 h-[70px] flex items-center justify-between gap-4">
          <Link
            to="/dashboard/airports"
            className="flex items-center gap-2 text-primary hover:text-accent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-ui font-semibold text-[13px]">Back</span>
          </Link>
          <Link to="/dashboard/airports" className="font-display font-extrabold text-xl text-primary">
            AirFlow
          </Link>
          <div className="flex items-center gap-3">
            <button
              aria-label="Profile"
              className="w-9 h-9 grid place-items-center bg-sky-soft text-accent-strong rounded-none"
            >
              <User className="w-4 h-4" />
            </button>
            <button
              onClick={handleSignOut}
              className="hidden sm:inline text-[12px] font-ui font-semibold text-accent hover:underline"
            >
              Logout
            </button>
            <button
              aria-label="Settings"
              className="w-9 h-9 grid place-items-center text-muted-foreground hover:text-primary"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Airport info card */}
      <motion.section
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="border-b-2 border-accent bg-gradient-to-b from-sky-soft to-white"
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-7 py-8 grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
          <div className="lg:col-span-3">
            <div className="font-display font-black text-5xl text-primary leading-none">
              {airport.iata_code}
            </div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-primary mt-3 leading-tight">
              {airport.airport_name}
            </h1>
            <p className="text-[15px] text-muted-foreground font-sans mt-1">
              {airport.city}, {airport.state}
            </p>
            {airport.operator && (
              <p className="text-[12px] text-muted-foreground font-sans mt-2">
                Operator: {airport.operator}
              </p>
            )}
          </div>
          <div className="lg:col-span-2 grid grid-cols-3 gap-4">
            <QuickStat
              icon={<LayoutGrid className="w-4 h-4" />}
              value={`${airport.total_gates ?? "—"}`}
              label="Gates"
            />
            <QuickStat
              icon={<Building className="w-4 h-4" />}
              value={`${airport.total_terminals ?? "—"}`}
              label="Terminals"
            />
            <QuickStat
              icon={<TrendingUp className="w-4 h-4" />}
              value={
                airport.annual_passengers_million != null
                  ? `${airport.annual_passengers_million}M+`
                  : "—"
              }
              label="Annual"
            />
          </div>
        </div>
      </motion.section>

      {/* Quick stats bar */}
      <section className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-5 sm:px-7 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatItem
            value={flightsToday.toString()}
            label="Flights Today"
            tone="primary"
          />
          <StatItem value={`${onTimeRate}%`} label="On-Time Rate" tone="success" />
          <StatItem
            value={`${activeGates} / ${airport.total_gates ?? "—"}`}
            label="Gates in Use"
            tone="primary"
          />
          <StatItem
            value={now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            label={now.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
            tone="primary"
          />
        </div>
      </section>

      {/* Action cards */}
      <main className="max-w-7xl mx-auto px-5 sm:px-7 py-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mb-7"
        >
          <h2 className="font-display font-extrabold text-2xl sm:text-[28px] text-primary">
            What would you like to do?
          </h2>
          <p className="text-[14px] text-muted-foreground font-sans mt-1">
            Select an option to get started
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ActionCard
            delay={0.5}
            icon={<Ticket className="w-7 h-7" />}
            iconColor="text-accent"
            iconBg="bg-sky-soft"
            buttonColor="bg-accent hover:bg-accent-strong"
            title="Generate Boarding Pass"
            description="Create and download your digital boarding pass instantly. Quick, secure, and paperless."
            features={["Instant generation", "Email it to yourself", "Mobile friendly"]}
            cta="Generate Now"
            footer="Takes less than 60 seconds"
            to="/airport/$code/boarding-pass"
            code={code}
          />
          <ActionCard
            delay={0.7}
            pulse
            icon={<Plane className="w-7 h-7" />}
            iconColor="text-warning"
            iconBg="bg-[hsl(28,100%,95%)]"
            buttonColor="bg-warning hover:opacity-90"
            title="Check Flight Status"
            description="View real-time flight updates, departure times, gate information, and delays. Stay informed."
            features={["Real-time updates", "Gate information", "Delay notifications"]}
            cta="Check Status"
            footer="Live data, updated every minute"
            to="/airport/$code/flight-status"
            code={code}
          />
          <ActionCard
            delay={0.9}
            icon={<Search className="w-7 h-7" />}
            iconColor="text-success"
            iconBg="bg-[hsl(140,60%,92%)]"
            buttonColor="bg-success hover:opacity-90"
            title="Book a Flight"
            description="Search and book flights from this airport. Compare prices, airlines, and times. Find your perfect flight."
            features={["Compare all airlines", "Best price guarantee", "Instant confirmation"]}
            cta="Book Flight"
            footer="Free cancellation on most fares"
            to="/airport/$code/flights"
            code={code}
          />
        </div>

        {/* Quick links */}
        <section className="bg-muted mt-10 p-7 grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickLink
            icon={<Map className="w-5 h-5" />}
            label="Directions"
            href={getDirectionsUrl(airport)}
            external
          />
          <QuickLink
            icon={<Phone className="w-5 h-5" />}
            label="Contact Info"
            href={airport.contact_phone ? `tel:${airport.contact_phone}` : undefined}
          />
          <QuickLink
            icon={<Calendar className="w-5 h-5" />}
            label="Facilities"
          />
          <QuickLink
            icon={<Headphones className="w-5 h-5" />}
            label="Customer Support"
            onClick={() => setSupportOpen(true)}
          />
        </section>
      </main>

      <SupportModal
        airport={airport}
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
      />
    </div>
  );
}

function QuickStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex w-9 h-9 items-center justify-center text-accent bg-white border border-border">
        {icon}
      </div>
      <div className="font-display font-extrabold text-primary text-lg mt-2">{value}</div>
      <div className="text-[11px] text-muted-foreground font-ui">{label}</div>
    </div>
  );
}

function StatItem({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: "primary" | "success";
}) {
  return (
    <div className="text-center">
      <div
        className={`font-display font-extrabold text-2xl sm:text-[28px] ${
          tone === "success" ? "text-success" : "text-primary"
        }`}
      >
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground font-ui mt-1">{label}</div>
    </div>
  );
}

interface ActionCardProps {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  buttonColor: string;
  title: string;
  description: string;
  features: string[];
  cta: string;
  footer: string;
  to: string;
  code: string;
  delay?: number;
  pulse?: boolean;
}

function ActionCard({
  icon,
  iconColor,
  iconBg,
  buttonColor,
  title,
  description,
  features,
  cta,
  footer,
  to,
  code,
  delay = 0,
  pulse,
}: ActionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -12 }}
      className={`group bg-white border-2 border-border hover:border-accent p-7 sm:p-8 rounded-none shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_50px_rgba(0,153,216,0.2)] transition-all flex flex-col min-h-[320px] ${
        pulse ? "animate-pulse-soft" : ""
      }`}
    >
      <div className="flex items-center justify-center">
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className={`w-[80px] h-[80px] rounded-full grid place-items-center ${iconBg} ${iconColor}`}
        >
          {icon}
        </motion.div>
      </div>
      <h3 className="font-display font-bold text-[22px] text-primary mt-5 text-center">{title}</h3>
      <p className="text-[14px] text-muted-foreground font-sans leading-relaxed mt-2 text-center">
        {description}
      </p>
      <ul className="mt-5 space-y-1.5">
        {features.map((f) => (
          <li
            key={f}
            className="flex items-center gap-2 text-[12px] font-ui font-medium text-primary"
          >
            <Check className="w-3.5 h-3.5 text-success shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        to={to}
        params={{ code }}
        className={`mt-6 w-full inline-flex items-center justify-center px-7 py-3 ${buttonColor} text-white font-ui font-bold uppercase tracking-wider text-[14px] rounded-none transition hover:-translate-y-0.5`}
      >
        {cta}
      </Link>
      <p className="text-[11px] text-muted-foreground font-sans italic text-center mt-3 mt-auto pt-3">
        {footer}
      </p>
    </motion.div>
  );
}

function QuickLink({
  icon,
  label,
  href,
  external,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  external?: boolean;
}) {
  const cls =
    "flex items-center gap-2 bg-white border border-border px-4 py-3 text-primary hover:border-accent hover:text-accent-strong transition rounded-none";
  if (href) {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={cls}
      >
        {icon}
        <span className="font-ui font-semibold text-[12px]">{label}</span>
      </a>
    );
  }
  return (
    <button className={cls} type="button">
      {icon}
      <span className="font-ui font-semibold text-[12px]">{label}</span>
    </button>
  );
}
