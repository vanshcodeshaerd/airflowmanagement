import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { delayFlight, cancelFlight, changeFlightGate, changeFlightStatus, listGatesForAirport } from "@/lib/admin-flights.functions";
import { useQuery } from "@tanstack/react-query";

type Flight = {
  id: string;
  flight_number: string;
  source_code: string;
  flight_status: string;
  terminal: string | null;
  gate_number: string | null;
};

const STATUSES = ["Scheduled", "Check-in", "Boarding", "Active", "Departed", "Arrived", "Delayed", "Cancelled"] as const;

export function FlightActionsBar({ flight, airportCode, onDone }: { flight: Flight; airportCode: string; onDone: () => void }) {
  const [open, setOpen] = useState<null | "delay" | "cancel" | "gate" | "status">(null);
  return (
    <div className="flex flex-wrap gap-1">
      <Btn onClick={() => setOpen("delay")} color="#ff7300">Delay</Btn>
      <Btn onClick={() => setOpen("cancel")} color="#dc3545">Cancel</Btn>
      <Btn onClick={() => setOpen("gate")} color="#0099d8">Gate</Btn>
      <Btn onClick={() => setOpen("status")} color="#28a745">Status</Btn>
      {open === "delay" && <DelayDialog flight={flight} onClose={() => setOpen(null)} onDone={onDone} />}
      {open === "cancel" && <CancelDialog flight={flight} onClose={() => setOpen(null)} onDone={onDone} />}
      {open === "gate" && <GateDialog flight={flight} airportCode={airportCode} onClose={() => setOpen(null)} onDone={onDone} />}
      {open === "status" && <StatusDialog flight={flight} onClose={() => setOpen(null)} onDone={onDone} />}
    </div>
  );
}

function Btn({ children, color, onClick }: { children: React.ReactNode; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="text-[10px] font-ui font-bold uppercase tracking-wider px-2 py-1 rounded-none text-white hover:opacity-90 transition"
      style={{ backgroundColor: color }}>{children}</button>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1a2940] border border-[#2a3f5a] w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-bold text-lg text-white mb-3">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function DelayDialog({ flight, onClose, onDone }: { flight: Flight; onClose: () => void; onDone: () => void }) {
  const fn = useServerFn(delayFlight);
  const qc = useQueryClient();
  const [mins, setMins] = useState(15);
  const [reason, setReason] = useState("Technical");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={`Delay ${flight.flight_number}`} onClose={onClose}>
      <Field label="Delay minutes">
        <input type="number" min={1} max={999} value={mins} onChange={(e) => setMins(Number(e.target.value))}
          className="w-full bg-[#0d1b2a] border border-[#2a3f5a] text-white px-3 py-2 rounded-none" />
      </Field>
      <Field label="Reason">
        <select value={reason} onChange={(e) => setReason(e.target.value)}
          className="w-full bg-[#0d1b2a] border border-[#2a3f5a] text-white px-3 py-2 rounded-none">
          {["Technical", "Weather", "ATC", "Crew", "Late Aircraft", "Security", "Other"].map((r) => <option key={r}>{r}</option>)}
        </select>
      </Field>
      <p className="text-[11px] text-white/50 mt-2">Cascades: flight times, boarding passes, status history, passenger notifications.</p>
      <div className="flex gap-2 justify-end mt-4">
        <button onClick={onClose} className="px-4 py-2 text-[12px] font-ui uppercase tracking-wider text-white/70 hover:text-white">Cancel</button>
        <button disabled={busy} onClick={async () => {
          setBusy(true);
          try { await fn({ data: { flightId: flight.id, delayMinutes: mins, reason } }); toast.success(`Delayed by ${mins} min`); qc.invalidateQueries(); onDone(); onClose(); }
          catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Delay failed"); }
          finally { setBusy(false); }
        }}
          className="bg-[#ff7300] hover:bg-[#cc5c00] text-white text-[12px] font-ui font-bold uppercase tracking-wider px-4 py-2 rounded-none disabled:opacity-50">
          {busy ? "Applying…" : "Apply Delay"}
        </button>
      </div>
    </Modal>
  );
}

function CancelDialog({ flight, onClose, onDone }: { flight: Flight; onClose: () => void; onDone: () => void }) {
  const fn = useServerFn(cancelFlight);
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={`Cancel ${flight.flight_number}`} onClose={onClose}>
      <Field label="Cancellation reason">
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
          className="w-full bg-[#0d1b2a] border border-[#2a3f5a] text-white px-3 py-2 rounded-none" placeholder="Required" />
      </Field>
      <div className="bg-[#dc3545]/10 border border-[#dc3545]/40 p-3 text-[11px] text-white/80 my-2">
        Cascades: bookings → Cancelled, refunds created, boarding passes invalidated, gate released, passengers notified.
      </div>
      <Field label='Type "CANCEL" to confirm'>
        <input value={confirm} onChange={(e) => setConfirm(e.target.value)}
          className="w-full bg-[#0d1b2a] border border-[#2a3f5a] text-white px-3 py-2 rounded-none font-mono" />
      </Field>
      <div className="flex gap-2 justify-end mt-4">
        <button onClick={onClose} className="px-4 py-2 text-[12px] font-ui uppercase tracking-wider text-white/70 hover:text-white">Back</button>
        <button disabled={busy || confirm !== "CANCEL" || !reason.trim()} onClick={async () => {
          setBusy(true);
          try { await fn({ data: { flightId: flight.id, reason } }); toast.success("Flight cancelled"); qc.invalidateQueries(); onDone(); onClose(); }
          catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Cancel failed"); }
          finally { setBusy(false); }
        }}
          className="bg-[#dc3545] hover:bg-[#b02a37] text-white text-[12px] font-ui font-bold uppercase tracking-wider px-4 py-2 rounded-none disabled:opacity-50">
          {busy ? "Cancelling…" : "Confirm Cancellation"}
        </button>
      </div>
    </Modal>
  );
}

function GateDialog({ flight, airportCode, onClose, onDone }: { flight: Flight; airportCode: string; onClose: () => void; onDone: () => void }) {
  const fn = useServerFn(changeFlightGate);
  const gatesFn = useServerFn(listGatesForAirport);
  const qc = useQueryClient();
  const { data: gates } = useQuery({
    queryKey: ["admin", "gates", airportCode],
    queryFn: () => gatesFn({ data: { airportCode } }),
  });
  const [terminal, setTerminal] = useState(flight.terminal ?? "");
  const [gate, setGate] = useState(flight.gate_number ?? "");
  const [busy, setBusy] = useState(false);
  const terminals = Array.from(new Set((gates ?? []).map((g) => g.terminal))).sort();
  const gatesInTerminal = (gates ?? []).filter((g) => g.terminal === terminal);

  return (
    <Modal title={`Change gate — ${flight.flight_number}`} onClose={onClose}>
      <Field label="Terminal">
        <select value={terminal} onChange={(e) => { setTerminal(e.target.value); setGate(""); }}
          className="w-full bg-[#0d1b2a] border border-[#2a3f5a] text-white px-3 py-2 rounded-none">
          <option value="">— Select —</option>
          {terminals.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Gate">
        <select value={gate} onChange={(e) => setGate(e.target.value)} disabled={!terminal}
          className="w-full bg-[#0d1b2a] border border-[#2a3f5a] text-white px-3 py-2 rounded-none disabled:opacity-50">
          <option value="">— Select —</option>
          {gatesInTerminal.map((g) => <option key={g.id}>{g.gate_number}</option>)}
        </select>
      </Field>
      <p className="text-[11px] text-white/50 mt-2">Server checks for time-window conflicts.</p>
      <div className="flex gap-2 justify-end mt-4">
        <button onClick={onClose} className="px-4 py-2 text-[12px] font-ui uppercase tracking-wider text-white/70 hover:text-white">Cancel</button>
        <button disabled={busy || !terminal || !gate} onClick={async () => {
          setBusy(true);
          try { await fn({ data: { flightId: flight.id, terminal, gate } }); toast.success(`Gate → ${terminal}/${gate}`); qc.invalidateQueries(); onDone(); onClose(); }
          catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Gate change failed"); }
          finally { setBusy(false); }
        }}
          className="bg-[#0099d8] hover:bg-[#007cad] text-white text-[12px] font-ui font-bold uppercase tracking-wider px-4 py-2 rounded-none disabled:opacity-50">
          {busy ? "Assigning…" : "Assign Gate"}
        </button>
      </div>
    </Modal>
  );
}

function StatusDialog({ flight, onClose, onDone }: { flight: Flight; onClose: () => void; onDone: () => void }) {
  const fn = useServerFn(changeFlightStatus);
  const qc = useQueryClient();
  const [status, setStatus] = useState<typeof STATUSES[number]>(flight.flight_status as typeof STATUSES[number]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={`Change status — ${flight.flight_number}`} onClose={onClose}>
      <Field label="New status">
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof STATUSES[number])}
          className="w-full bg-[#0d1b2a] border border-[#2a3f5a] text-white px-3 py-2 rounded-none">
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Reason (optional)">
        <input value={reason} onChange={(e) => setReason(e.target.value)}
          className="w-full bg-[#0d1b2a] border border-[#2a3f5a] text-white px-3 py-2 rounded-none" />
      </Field>
      <div className="flex gap-2 justify-end mt-4">
        <button onClick={onClose} className="px-4 py-2 text-[12px] font-ui uppercase tracking-wider text-white/70 hover:text-white">Cancel</button>
        <button disabled={busy} onClick={async () => {
          setBusy(true);
          try { await fn({ data: { flightId: flight.id, newStatus: status, reason: reason || undefined } }); toast.success(`Status → ${status}`); qc.invalidateQueries(); onDone(); onClose(); }
          catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Status change failed"); }
          finally { setBusy(false); }
        }}
          className="bg-[#28a745] hover:bg-[#1e7e34] text-white text-[12px] font-ui font-bold uppercase tracking-wider px-4 py-2 rounded-none disabled:opacity-50">
          {busy ? "Saving…" : "Update Status"}
        </button>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="block text-[10px] font-ui font-bold uppercase tracking-wider text-white/60 mb-1">{label}</span>
      {children}
    </label>
  );
}
