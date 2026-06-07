import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Brain,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Bell,
  BellOff,
  BellRing,
  ShieldAlert,
  Send,
  RotateCw,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import {
  predictConnectionConfidence,
  type ConnectionInput,
  type ConnectionResult,
} from "@/lib/connection-confidence.functions";
import {
  getTravelProfile,
  saveTravelProfile,
  recordWalkingSpeedSample,
  type TravelProfile,
} from "@/lib/travel-profile.functions";
import { fetchLiveFlight } from "@/lib/aerodatabox.functions";
import { Plane, Footprints, Play, Square } from "lucide-react";
import {
  savePushSubscription,
  removePushSubscription,
  sendPushToSelf,
} from "@/lib/push.functions";
import {
  pushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push-client";

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
    gate_pair_distance_m: 650,
    same_terminal: false,
    terminal_change_required: true,
  },
  airport_conditions: {
    security_queue_wait_min: 8,
    immigration_queue_min: 12,
    fast_track_available: true,
    train_available: true,
    crowd_density: "moderate",
  },
};

const ALERT_THRESHOLD = 70;

function ConnectionConfidencePage() {
  const { code } = Route.useParams();
  const fn = useServerFn(predictConnectionConfidence);
  const getProfile = useServerFn(getTravelProfile);
  const saveProfile = useServerFn(saveTravelProfile);
  const fetchLive = useServerFn(fetchLiveFlight);
  const recordSpeed = useServerFn(recordWalkingSpeedSample);

  const [input, setInput] = useState<ConnectionInput>(DEFAULTS);
  const [auto, setAuto] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [alertsOn, setAlertsOn] = useState(false);
  const [liveFlightNumber, setLiveFlightNumber] = useState("");
  const [walkStart, setWalkStart] = useState<number | null>(null);
  const [walkElapsed, setWalkElapsed] = useState(0);
  const [walkDistance, setWalkDistance] = useState<number>(500);
  const lastAlertedAt = useRef<number>(0);

  // Load saved profile on mount
  const profileQuery = useQuery({
    queryKey: ["travel-profile"],
    queryFn: () => getProfile({}),
  });

  useEffect(() => {
    const p = profileQuery.data as TravelProfile | null | undefined;
    if (!p) return;
    setInput((prev) => ({ ...prev, passenger_profile: p }));
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => saveProfile({ data: input.passenger_profile }),
    onSuccess: () => toast.success("Travel profile saved"),
    onError: (e: Error) => toast.error(e.message),
  });

  const mutation = useMutation({
    mutationFn: (data: ConnectionInput) => fn({ data }),
  });

  const liveMutation = useMutation({
    mutationFn: (flight_number: string) => fetchLive({ data: { flight_number } }),
    onSuccess: (rows) => {
      if (!rows || rows.length === 0) {
        toast.error("No live data found for that flight today");
        return;
      }
      const f = rows[0];
      setInput((s) => ({
        ...s,
        inbound_flight: {
          ...s.inbound_flight,
          current_live_delay_min: Math.max(0, f.delay_minutes),
          gate_arrival: f.destination_gate || s.inbound_flight.gate_arrival,
          scheduled_landing: f.arrival_scheduled
            ? new Date(f.arrival_scheduled).toISOString().slice(11, 16) + " UTC"
            : s.inbound_flight.scheduled_landing,
        },
      }));
      toast.success(
        `Live: ${f.flight_number} ${f.status} — delay ${Math.max(0, f.delay_minutes)}m`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const speedMutation = useMutation({
    mutationFn: (vars: { airport_code: string; speed_kmh: number }) =>
      recordSpeed({ data: vars }),
    onSuccess: (r) => {
      const avg = (r as { avg?: number } | undefined)?.avg;
      if (typeof avg === "number") {
        updatePassenger({ walking_speed_kmh: Math.round(avg * 100) / 100 });
        toast.success(`Walk logged. New avg: ${avg.toFixed(2)} km/h`);
      } else {
        toast.success("Walk logged");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Tick walk timer
  useEffect(() => {
    if (walkStart === null) return;
    const id = setInterval(() => setWalkElapsed(Date.now() - walkStart), 1000);
    return () => clearInterval(id);
  }, [walkStart]);

  const result: ConnectionResult | undefined = mutation.data;

  // Auto-refresh
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

  const saveSub = useServerFn(savePushSubscription);
  const removeSub = useServerFn(removePushSubscription);
  const sendPush = useServerFn(sendPushToSelf);
  const [pushOn, setPushOn] = useState(false);
  const [pushSupport, setPushSupport] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [pushBusy, setPushBusy] = useState<null | "enable" | "disable" | "resub" | "test">(null);

  // Refresh push/permission state (on mount + when tab regains focus)
  const refreshPushState = async () => {
    if (!pushSupported()) {
      setPushSupport(false);
      setPermission("unsupported");
      return;
    }
    setPushSupport(true);
    setPermission(Notification.permission);
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    setPushOn(!!sub);
  };
  useEffect(() => {
    refreshPushState();
    const onFocus = () => refreshPushState();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Push alert when score drops below threshold
  useEffect(() => {
    if (!result || !alertsOn) return;
    if (result.confidence_score >= ALERT_THRESHOLD) return;
    const now = Date.now();
    if (now - lastAlertedAt.current < 120_000) return; // throttle 2 min
    lastAlertedAt.current = now;
    const title = `⚠️ Connection at risk: ${result.confidence_score}%`;
    const body = result.reasoning;
    toast.warning(title, { description: body, duration: 10_000 });
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification(title, { body });
      } catch {
        /* ignore */
      }
    }
    // Background push (works even if tab is closed)
    if (pushOn) {
      sendPush({ data: { title, body, url: window.location.pathname, tag: "connection-alert" } }).catch(
        () => {}
      );
    }
  }, [result, alertsOn, pushOn, sendPush]);

  const enableAlerts = async () => {
    if (typeof Notification === "undefined") {
      toast.error("Notifications not supported in this browser");
      return;
    }
    if (Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error("Permission denied");
        return;
      }
    }
    setAlertsOn(true);
    toast.success(`Alerts on — you'll be notified below ${ALERT_THRESHOLD}%`);
  };

  const togglePush = async () => {
    if (pushOn) {
      try {
        const endpoint = await unsubscribeFromPush();
        if (endpoint) await removeSub({ data: { endpoint } });
        setPushOn(false);
        toast.success("Background push disabled");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to disable push");
      }
      return;
    }
    try {
      const sub = await subscribeToPush();
      await saveSub({ data: sub });
      setPushOn(true);
      toast.success("Background push enabled — alerts work even with the tab closed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to enable push");
    }
  };

  const sendTestPush = async () => {
    try {
      const res = await sendPush({
        data: {
          title: "Test push ✈️",
          body: "Background notifications are working.",
          url: window.location.pathname,
          tag: "test",
        },
      });
      toast.success(`Sent to ${res.sent} device(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    }
  };

  const riskColor = useMemo(() => {
    if (!result) return "hsl(var(--muted-foreground))";
    if (result.confidence_score >= 80) return "#16a34a";
    if (result.confidence_score >= 60) return "#eab308";
    if (result.confidence_score >= 40) return "#f97316";
    return "#dc2626";
  }, [result]);

  const updatePassenger = (patch: Partial<ConnectionInput["passenger_profile"]>) =>
    setInput((s) => ({ ...s, passenger_profile: { ...s.passenger_profile, ...patch } }));
  const updateOutbound = (patch: Partial<ConnectionInput["outbound_flight"]>) =>
    setInput((s) => ({ ...s, outbound_flight: { ...s.outbound_flight, ...patch } }));
  const updateInbound = (patch: Partial<ConnectionInput["inbound_flight"]>) =>
    setInput((s) => ({ ...s, inbound_flight: { ...s.inbound_flight, ...patch } }));
  const updateConditions = (patch: Partial<ConnectionInput["airport_conditions"]>) =>
    setInput((s) => ({ ...s, airport_conditions: { ...s.airport_conditions, ...patch } }));

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
            <h1 className="font-display font-extrabold text-2xl text-primary">Will I Make It?</h1>
            <p className="text-[13px] text-muted-foreground font-sans mt-1">
              Real-time connection confidence powered by AI. Saves your walking speed and profile
              across visits.
            </p>
          </div>

          {/* Passenger profile */}
          <SectionHeader>You</SectionHeader>
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <Field label="Age group">
              <select
                value={input.passenger_profile.age_group}
                onChange={(e) => updatePassenger({ age_group: e.target.value })}
                className="w-full border border-border px-3 py-2"
              >
                <option value="under-18">Under 18</option>
                <option value="18-29">18–29</option>
                <option value="30-40">30–40</option>
                <option value="41-55">41–55</option>
                <option value="56-70">56–70</option>
                <option value="70+">70+</option>
              </select>
            </Field>
            <Field label="Sprint capability">
              <select
                value={input.passenger_profile.sprint_capable}
                onChange={(e) =>
                  updatePassenger({
                    sprint_capable: e.target.value as TravelProfile["sprint_capable"],
                  })
                }
                className="w-full border border-border px-3 py-2"
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </Field>
            <Field label="Walking speed (km/h)">
              <input
                type="number"
                step={0.1}
                min={1}
                max={10}
                value={input.passenger_profile.walking_speed_kmh}
                onChange={(e) =>
                  updatePassenger({ walking_speed_kmh: Number(e.target.value) || 4.5 })
                }
                className="w-full border border-border px-3 py-2 font-mono"
              />
            </Field>
            <Field label="Mobility">
              <select
                value={input.passenger_profile.mobility}
                onChange={(e) =>
                  updatePassenger({ mobility: e.target.value as TravelProfile["mobility"] })
                }
                className="w-full border border-border px-3 py-2"
              >
                <option value="standard">Standard</option>
                <option value="limited">Limited</option>
                <option value="wheelchair">Wheelchair</option>
              </select>
            </Field>
            <Field label="Luggage">
              <select
                value={input.passenger_profile.luggage}
                onChange={(e) =>
                  updatePassenger({ luggage: e.target.value as TravelProfile["luggage"] })
                }
                className="w-full border border-border px-3 py-2"
              >
                <option value="carry_on_only">Carry-on only</option>
                <option value="checked">Checked</option>
                <option value="both">Both</option>
              </select>
            </Field>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="self-end h-[38px] border border-primary text-primary hover:bg-primary hover:text-white text-[11px] font-ui font-bold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save profile
            </button>
          </div>

          {/* Walking speed recorder */}
          <div className="mt-4 bg-primary/5 border border-primary/20 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-ui font-bold uppercase tracking-wider text-primary inline-flex items-center gap-1.5">
                <Footprints className="w-3.5 h-3.5" /> Walk recorder
              </p>
              <span className="font-mono text-[12px] text-muted-foreground">
                {Math.floor(walkElapsed / 60000)}:
                {String(Math.floor((walkElapsed % 60000) / 1000)).padStart(2, "0")}
              </span>
            </div>
            <div className="flex items-end gap-2">
              <Field label="Distance (m)">
                <input
                  type="number"
                  min={50}
                  max={3000}
                  value={walkDistance}
                  onChange={(e) => setWalkDistance(Number(e.target.value) || 0)}
                  className="w-full border border-border px-3 py-2 font-mono text-[13px]"
                />
              </Field>
              {walkStart === null ? (
                <button
                  onClick={() => {
                    setWalkElapsed(0);
                    setWalkStart(Date.now());
                  }}
                  className="h-[38px] px-3 bg-accent text-white text-[11px] font-ui font-bold uppercase tracking-wider inline-flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" /> Start walk
                </button>
              ) : (
                <button
                  onClick={() => {
                    const seconds = (Date.now() - walkStart) / 1000;
                    setWalkStart(null);
                    if (seconds < 5 || walkDistance < 50) {
                      toast.error("Walk too short to log");
                      return;
                    }
                    const kmh = walkDistance / 1000 / (seconds / 3600);
                    if (kmh < 1 || kmh > 10) {
                      toast.error(`Speed ${kmh.toFixed(1)} km/h out of range`);
                      return;
                    }
                    speedMutation.mutate({
                      airport_code: code,
                      speed_kmh: Math.round(kmh * 100) / 100,
                    });
                  }}
                  className="h-[38px] px-3 bg-primary text-white text-[11px] font-ui font-bold uppercase tracking-wider inline-flex items-center gap-1.5"
                >
                  {speedMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                  Stop & log
                </button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-sans">
              Auto-updates your average walking speed for {code}.
            </p>
          </div>

          {/* Flights */}
          <SectionHeader>Flights</SectionHeader>
          <div className="flex items-end gap-2 mb-3">
            <Field label="Live flight # (e.g. EK503)">
              <input
                value={liveFlightNumber}
                onChange={(e) => setLiveFlightNumber(e.target.value.toUpperCase())}
                placeholder="AI201"
                className="w-full border border-border px-3 py-2 font-mono uppercase"
              />
            </Field>
            <button
              onClick={() => liveMutation.mutate(liveFlightNumber.trim())}
              disabled={liveMutation.isPending || liveFlightNumber.trim().length < 3}
              className="h-[38px] px-3 border border-accent text-accent hover:bg-accent hover:text-white text-[11px] font-ui font-bold uppercase tracking-wider inline-flex items-center gap-1.5 disabled:opacity-50"
              title="Fetch live flight status from AeroDataBox"
            >
              {liveMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plane className="w-3.5 h-3.5" />
              )}
              Pull live
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <Field label="Inbound delay (min)">
              <input
                type="number"
                min={0}
                value={input.inbound_flight.current_live_delay_min}
                onChange={(e) =>
                  updateInbound({ current_live_delay_min: Number(e.target.value) || 0 })
                }
                className="w-full border border-border px-3 py-2 font-mono"
              />
            </Field>
            <Field label="Inbound gate">
              <input
                value={input.inbound_flight.gate_arrival}
                onChange={(e) => updateInbound({ gate_arrival: e.target.value })}
                className="w-full border border-border px-3 py-2 font-mono"
              />
            </Field>
            <Field label="Outbound gate">
              <input
                value={input.outbound_flight.gate}
                onChange={(e) => updateOutbound({ gate: e.target.value })}
                className="w-full border border-border px-3 py-2 font-mono"
              />
            </Field>
            <Field label="Gate distance (m)">
              <input
                type="number"
                min={0}
                max={5000}
                value={input.outbound_flight.gate_pair_distance_m}
                onChange={(e) =>
                  updateOutbound({ gate_pair_distance_m: Number(e.target.value) || 0 })
                }
                className="w-full border border-border px-3 py-2 font-mono"
              />
            </Field>
            <Field label="Terminal layout">
              <input
                value={input.outbound_flight.terminal_layout}
                onChange={(e) => updateOutbound({ terminal_layout: e.target.value })}
                className="w-full border border-border px-3 py-2 col-span-2"
              />
            </Field>
            <div className="col-span-2 flex items-center gap-4 -mt-1">
              <label className="flex items-center gap-2 text-[12px] font-ui">
                <input
                  type="checkbox"
                  checked={input.outbound_flight.same_terminal}
                  onChange={(e) =>
                    updateOutbound({
                      same_terminal: e.target.checked,
                      terminal_change_required: !e.target.checked,
                    })
                  }
                />
                Same terminal
              </label>
            </div>
          </div>

          {/* Conditions */}
          <SectionHeader>Airport conditions</SectionHeader>
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <Field label="Security queue (min)">
              <input
                type="number"
                min={0}
                value={input.airport_conditions.security_queue_wait_min}
                onChange={(e) =>
                  updateConditions({ security_queue_wait_min: Number(e.target.value) || 0 })
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
                  updateConditions({ immigration_queue_min: Number(e.target.value) || 0 })
                }
                className="w-full border border-border px-3 py-2 font-mono"
              />
            </Field>
            <Field label="Crowd density">
              <select
                value={input.airport_conditions.crowd_density}
                onChange={(e) =>
                  updateConditions({
                    crowd_density: e.target.value as "low" | "moderate" | "high",
                  })
                }
                className="w-full border border-border px-3 py-2"
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </Field>
            <div className="flex flex-col gap-1.5 justify-end pb-1">
              <label className="flex items-center gap-2 text-[12px] font-ui">
                <input
                  type="checkbox"
                  checked={input.airport_conditions.fast_track_available}
                  onChange={(e) => updateConditions({ fast_track_available: e.target.checked })}
                />
                Fast-track
              </label>
              <label className="flex items-center gap-2 text-[12px] font-ui">
                <input
                  type="checkbox"
                  checked={input.airport_conditions.train_available}
                  onChange={(e) => updateConditions({ train_available: e.target.checked })}
                />
                Train
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
            <button
              onClick={() => (alertsOn ? setAlertsOn(false) : enableAlerts())}
              className={`px-3 py-2.5 text-[11px] font-ui font-bold uppercase tracking-wider border ${
                alertsOn
                  ? "bg-accent text-white border-accent"
                  : "bg-white text-primary border-border"
              }`}
              title={`Alert when score drops below ${ALERT_THRESHOLD}%`}
            >
              {alertsOn ? (
                <Bell className="w-3.5 h-3.5 inline" />
              ) : (
                <BellOff className="w-3.5 h-3.5 inline" />
              )}
            </button>
            <button
              onClick={togglePush}
              className={`px-3 py-2.5 text-[11px] font-ui font-bold uppercase tracking-wider border ${
                pushOn ? "bg-primary text-white border-primary" : "bg-white text-primary border-border"
              }`}
              title="Background push (works with tab closed)"
            >
              {pushOn ? "Push on" : "Push off"}
            </button>
            {pushOn && (
              <button
                onClick={sendTestPush}
                className="px-3 py-2.5 text-[11px] font-ui font-bold uppercase tracking-wider border bg-white text-primary border-border"
                title="Send a test push"
              >
                Test
              </button>
            )}
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
                            <span className="text-[11px] text-muted-foreground ml-2">
                              — {s.note}
                            </span>
                          )}
                        </span>
                        <span className="font-mono font-bold text-accent">{s.duration_min}m</span>
                      </li>
                    ))}
                  </ol>
                </div>

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

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-ui font-bold uppercase tracking-wider text-muted-foreground mt-5 mb-2 pb-1 border-b border-border">
      {children}
    </h2>
  );
}
