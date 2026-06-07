import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Brain, Clock, RefreshCw, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import {
  predictConnectionConfidence,
  type ConnectionInput,
  type ConnectionResult,
} from "@/lib/connection-confidence.functions";

export const Route = createFileRoute("/_authenticated/airport/$code/connection")({
  component: ConnectionConfidencePage,
});

const DEFAULTS: ConnectionInput = {
  passenger_profile: {
    age_group: "30-40",
    mobility: "standard",
    luggage: "carry_on_only",
    walking_speed_kmh: 4.5,
    sprint_capable: "moderate",
  },
  inbound_flight: {
    scheduled_landing: "14:35 UTC",
    current_live_delay_min: 22,
    gate_arrival: "A12",
  },
  outbound_flight: {
    scheduled_departure: "15:45 UTC",
    gate: "B47",
    final_boarding_call: "15:40 UTC",
    airport: "Dubai International",
    terminal_layout: "Terminal 3, concourse distance: 650 meters",
  },
  airport_conditions: {
    security_queue_wait_min: 8,
    immigration_queue_min: 12,
    fast_track_available: true,
    train_available: true,
    crowd_density: "moderate",
  },
};

function ConnectionConfidencePage() {
  const { code } = Route.useParams();
  const fn = useServerFn(predictConnectionConfidence);
  const [input, setInput] = useState<ConnectionInput>(DEFAULTS);
  const [auto, setAuto] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const mutation = useMutation({
    mutationFn: (data: ConnectionInput) => fn({ data }),
  });

  const result: ConnectionResult | undefined = mutation.data;

  // Auto-refresh every 60s
  useEffect(() => {
    if (!auto) return;
    setCountdown(60);
    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          mutation.mutate(input);
          return 60;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, input]);

  const riskColor = useMemo(() => {
    if (!result) return "hsl(var(--muted-foreground))";
    if (result.confidence_score >= 80) return "#16a34a";
    if (result.confidence_score >= 60) return "#eab308";
    if (result.confidence_score >= 40) return "#f97316";
    return "#dc2626";
  }, [result]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-white border-b border-border">
        <div className="max-w-6xl mx-auto px-5 h-[60px] flex items-center justify-between">
          <Link
            to="/airport/$code/dashboard"
            params={{ code }}
            className="flex items-center gap-2 text-primary hover:text-accent"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-display font-extrabold">Back to {code}</span>
          </Link>
          <div className="flex items-center gap-2 text-[11px] font-ui font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1">
            <Brain className="w-3.5 h-3.5" /> AI Predictor
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT: Inputs */}
        <section className="lg:col-span-2 bg-white border border-border p-5">
          <div className="mb-4">
            <h1 className="font-display font-extrabold text-2xl text-primary">
              Will I Make It?
            </h1>
            <p className="text-[13px] text-muted-foreground font-sans mt-1">
              Real-time connection confidence score powered by AI. Adjust your trip details below.
            </p>
          </div>

          <div className="space-y-4 text-[13px]">
            <Field label="Inbound delay (min)">
              <input
                type="number"
                min={0}
                value={input.inbound_flight.current_live_delay_min}
                onChange={(e) =>
                  setInput({
                    ...input,
                    inbound_flight: {
                      ...input.inbound_flight,
                      current_live_delay_min: Number(e.target.value) || 0,
                    },
                  })
                }
                className="w-full border border-border px-3 py-2 font-mono"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Inbound gate">
                <input
                  value={input.inbound_flight.gate_arrival}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      inbound_flight: { ...input.inbound_flight, gate_arrival: e.target.value },
                    })
                  }
                  className="w-full border border-border px-3 py-2 font-mono"
                />
              </Field>
              <Field label="Outbound gate">
                <input
                  value={input.outbound_flight.gate}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      outbound_flight: { ...input.outbound_flight, gate: e.target.value },
                    })
                  }
                  className="w-full border border-border px-3 py-2 font-mono"
                />
              </Field>
            </div>
            <Field label="Terminal layout">
              <input
                value={input.outbound_flight.terminal_layout}
                onChange={(e) =>
                  setInput({
                    ...input,
                    outbound_flight: { ...input.outbound_flight, terminal_layout: e.target.value },
                  })
                }
                className="w-full border border-border px-3 py-2"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Security queue (min)">
                <input
                  type="number"
                  min={0}
                  value={input.airport_conditions.security_queue_wait_min}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      airport_conditions: {
                        ...input.airport_conditions,
                        security_queue_wait_min: Number(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full border border-border px-3 py-2 font-mono"
                />
              </Field>
              <Field label="Immigration (min)">
                <input
                  type="number"
                  min={0}
                  value={input.airport_conditions.immigration_queue_min}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      airport_conditions: {
                        ...input.airport_conditions,
                        immigration_queue_min: Number(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full border border-border px-3 py-2 font-mono"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Luggage">
                <select
                  value={input.passenger_profile.luggage}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      passenger_profile: {
                        ...input.passenger_profile,
                        luggage: e.target.value as ConnectionInput["passenger_profile"]["luggage"],
                      },
                    })
                  }
                  className="w-full border border-border px-3 py-2"
                >
                  <option value="carry_on_only">Carry-on only</option>
                  <option value="checked">Checked</option>
                  <option value="both">Both</option>
                </select>
              </Field>
              <Field label="Mobility">
                <select
                  value={input.passenger_profile.mobility}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      passenger_profile: {
                        ...input.passenger_profile,
                        mobility: e.target.value as ConnectionInput["passenger_profile"]["mobility"],
                      },
                    })
                  }
                  className="w-full border border-border px-3 py-2"
                >
                  <option value="standard">Standard</option>
                  <option value="limited">Limited</option>
                  <option value="wheelchair">Wheelchair</option>
                </select>
              </Field>
            </div>
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-[12px] font-ui">
                <input
                  type="checkbox"
                  checked={input.airport_conditions.fast_track_available}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      airport_conditions: {
                        ...input.airport_conditions,
                        fast_track_available: e.target.checked,
                      },
                    })
                  }
                />
                Fast-track immigration
              </label>
              <label className="flex items-center gap-2 text-[12px] font-ui">
                <input
                  type="checkbox"
                  checked={input.airport_conditions.train_available}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      airport_conditions: {
                        ...input.airport_conditions,
                        train_available: e.target.checked,
                      },
                    })
                  }
                />
                Train available
              </label>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <button
              onClick={() => mutation.mutate(input)}
              disabled={mutation.isPending}
              className="flex-1 bg-accent hover:bg-accent-strong disabled:opacity-50 text-white font-ui font-bold uppercase tracking-wider text-[12px] px-4 py-2.5 inline-flex items-center justify-center gap-2"
            >
              {mutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Brain className="w-4 h-4" />
              )}
              Calculate
            </button>
            <button
              onClick={() => setAuto((a) => !a)}
              className={`px-3 py-2.5 text-[11px] font-ui font-bold uppercase tracking-wider border ${
                auto ? "bg-primary text-white border-primary" : "bg-white text-primary border-border"
              }`}
              title="Auto-refresh every 60s"
            >
              <RefreshCw className={`w-3.5 h-3.5 inline mr-1 ${auto ? "animate-spin-slow" : ""}`} />
              {auto ? `Auto ${countdown}s` : "Auto off"}
            </button>
          </div>
        </section>

        {/* RIGHT: Result */}
        <section className="lg:col-span-3 space-y-4">
          {mutation.isError && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 text-sm">
              {(mutation.error as Error).message}
            </div>
          )}

          {!result && !mutation.isPending && (
            <div className="bg-white border border-dashed border-border p-10 text-center">
              <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-display font-bold text-lg text-primary">No prediction yet</p>
              <p className="text-[13px] text-muted-foreground font-sans">
                Fill your trip details and hit Calculate.
              </p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key={result.computed_at}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Score */}
                <div
                  className="bg-white border-l-4 border border-border p-6"
                  style={{ borderLeftColor: riskColor }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-ui font-bold uppercase tracking-wider text-muted-foreground">
                        Connection Confidence
                      </p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span
                          className="font-mono font-black text-6xl leading-none"
                          style={{ color: riskColor }}
                        >
                          {result.confidence_score}
                        </span>
                        <span className="font-display font-bold text-2xl text-muted-foreground">
                          %
                        </span>
                      </div>
                      <p
                        className="mt-2 text-[12px] font-ui font-bold uppercase tracking-wider"
                        style={{ color: riskColor }}
                      >
                        {result.risk_level === "LOW" ? (
                          <CheckCircle2 className="w-4 h-4 inline mr-1" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 inline mr-1" />
                        )}
                        {result.risk_level} RISK
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground font-ui uppercase tracking-wider">
                        Time available
                      </p>
                      <p className="font-mono font-bold text-3xl text-primary">
                        <Clock className="w-5 h-5 inline mr-1" />
                        {result.time_available_minutes}m
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-1">
                        Updated {new Date(result.computed_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-[14px] text-primary font-sans border-t border-border pt-3">
                    {result.reasoning}
                  </p>
                </div>

                {/* Critical Path */}
                <div className="bg-white border border-border p-5">
                  <h3 className="font-display font-extrabold text-primary mb-3">Critical Path</h3>
                  <ol className="space-y-2">
                    {result.critical_path.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-3 text-[13px] py-2 border-b border-border last:border-0"
                      >
                        <span className="w-6 h-6 bg-primary text-white font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="flex-1 font-sans">
                          <b>{s.step}</b>
                          {s.note && (
                            <span className="text-[11px] text-muted-foreground ml-2">— {s.note}</span>
                          )}
                        </span>
                        <span className="font-mono font-bold text-accent">{s.duration_min}m</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Actions */}
                <div className="bg-primary/5 border border-primary/20 p-5">
                  <h3 className="font-display font-extrabold text-primary mb-3">
                    Recommended Actions
                  </h3>
                  <ul className="space-y-1.5 text-[13px] font-sans">
                    {result.recommended_actions.map((a, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-ui font-bold uppercase tracking-wider text-muted-foreground block mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
