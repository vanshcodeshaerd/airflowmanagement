import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { X, Loader2 } from "lucide-react";
import { createAirport, updateAirport, type AirportInput } from "@/lib/airports.functions";
import type { Airport } from "./types";
import { ALL_CATEGORIES, ALL_STATUSES } from "./types";
import { toast } from "sonner";

interface Props {
  mode: "create" | "edit";
  airport?: Airport;
  onClose: () => void;
  onSuccess: () => void;
}

type FormValues = {
  iata_code: string;
  icao_code?: string;
  airport_name: string;
  city: string;
  state: string;
  country: string;
  latitude: string;
  longitude: string;
  operator?: string;
  total_gates?: string;
  total_terminals?: string;
  total_runways?: string;
  category: Airport["category"];
  status: Airport["status"];
  annual_passengers_million?: string;
  contact_phone?: string;
  contact_email?: string;
  website_url?: string;
  description?: string;
};

const inp =
  "w-full rounded-none border-2 border-border bg-white text-[13px] font-sans px-3 py-2 focus:outline-none focus:border-accent transition";
const lbl =
  "block text-[11px] font-display font-semibold tracking-[0.1em] uppercase text-primary mb-1";

export function AirportFormModal({ mode, airport, onClose, onSuccess }: Props) {
  const create = useServerFn(createAirport);
  const update = useServerFn(updateAirport);

  const { register, handleSubmit, formState } = useForm<FormValues>({
    defaultValues: airport
      ? {
          iata_code: airport.iata_code,
          icao_code: airport.icao_code ?? "",
          airport_name: airport.airport_name,
          city: airport.city,
          state: airport.state,
          country: airport.country,
          latitude: String(airport.latitude),
          longitude: String(airport.longitude),
          operator: airport.operator ?? "",
          total_gates: airport.total_gates != null ? String(airport.total_gates) : "",
          total_terminals:
            airport.total_terminals != null ? String(airport.total_terminals) : "",
          total_runways: airport.total_runways != null ? String(airport.total_runways) : "",
          category: airport.category,
          status: airport.status,
          annual_passengers_million:
            airport.annual_passengers_million != null
              ? String(airport.annual_passengers_million)
              : "",
          contact_phone: airport.contact_phone ?? "",
          contact_email: airport.contact_email ?? "",
          website_url: airport.website_url ?? "",
          description: airport.description ?? "",
        }
      : {
          country: "India",
          category: "Domestic",
          status: "Active",
        } as FormValues,
  });

  const mut = useMutation({
    mutationFn: async (v: FormValues) => {
      const numOrUndef = (s?: string) => (s === "" || s == null ? undefined : Number(s));
      const payload: AirportInput = {
        iata_code: v.iata_code.toUpperCase().trim(),
        icao_code: v.icao_code ? v.icao_code.toUpperCase().trim() : undefined,
        airport_name: v.airport_name.trim(),
        city: v.city.trim(),
        state: v.state.trim(),
        country: v.country.trim() || "India",
        latitude: Number(v.latitude),
        longitude: Number(v.longitude),
        operator: v.operator?.trim() || undefined,
        total_gates: numOrUndef(v.total_gates) ?? null,
        total_terminals: numOrUndef(v.total_terminals) ?? null,
        total_runways: numOrUndef(v.total_runways) ?? null,
        category: v.category,
        status: v.status,
        annual_passengers_million: numOrUndef(v.annual_passengers_million) ?? null,
        contact_phone: v.contact_phone?.trim() || undefined,
        contact_email: v.contact_email?.trim() || undefined,
        website_url: v.website_url?.trim() || undefined,
        description: v.description?.trim() || undefined,
      };
      if (mode === "create") return create({ data: payload });
      return update({ data: { id: airport!.id, patch: payload } });
    },
    onSuccess: () => {
      toast.success(mode === "create" ? "Airport created" : "Airport updated");
      onSuccess();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message ?? "Save failed"),
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white max-w-3xl w-full max-h-[90vh] overflow-auto p-7 relative"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 text-muted-foreground hover:text-primary"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="font-display font-extrabold text-2xl text-primary mb-1">
          {mode === "create" ? "Add Airport" : "Edit Airport"}
        </h2>
        <p className="text-[13px] text-muted-foreground font-sans mb-5">
          All required fields are marked.
        </p>

        <form
          onSubmit={handleSubmit((v) => mut.mutate(v))}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <Field label="IATA Code *" error={formState.errors.iata_code?.message}>
            <input className={inp} maxLength={3} {...register("iata_code", { required: true })} />
          </Field>
          <Field label="ICAO Code">
            <input className={inp} maxLength={4} {...register("icao_code")} />
          </Field>
          <Field label="Airport Name *" className="md:col-span-2">
            <input className={inp} {...register("airport_name", { required: true })} />
          </Field>
          <Field label="City *">
            <input className={inp} {...register("city", { required: true })} />
          </Field>
          <Field label="State *">
            <input className={inp} {...register("state", { required: true })} />
          </Field>
          <Field label="Country">
            <input className={inp} {...register("country")} />
          </Field>
          <Field label="Operator">
            <input className={inp} {...register("operator")} />
          </Field>
          <Field label="Latitude *">
            <input
              className={inp}
              type="number"
              step="any"
              {...register("latitude", { required: true })}
            />
          </Field>
          <Field label="Longitude *">
            <input
              className={inp}
              type="number"
              step="any"
              {...register("longitude", { required: true })}
            />
          </Field>
          <Field label="Category *">
            <select className={inp + " appearance-none"} {...register("category")}>
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status *">
            <select className={inp + " appearance-none"} {...register("status")}>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Gates">
            <input className={inp} type="number" min={0} {...register("total_gates")} />
          </Field>
          <Field label="Terminals">
            <input className={inp} type="number" min={0} {...register("total_terminals")} />
          </Field>
          <Field label="Runways">
            <input className={inp} type="number" min={0} {...register("total_runways")} />
          </Field>
          <Field label="Annual passengers (millions)">
            <input
              className={inp}
              type="number"
              min={0}
              step="0.1"
              {...register("annual_passengers_million")}
            />
          </Field>
          <Field label="Contact phone">
            <input className={inp} {...register("contact_phone")} />
          </Field>
          <Field label="Contact email">
            <input className={inp} type="email" {...register("contact_email")} />
          </Field>
          <Field label="Website URL" className="md:col-span-2">
            <input className={inp} type="url" {...register("website_url")} />
          </Field>
          <Field label="Description" className="md:col-span-2">
            <textarea className={inp + " min-h-[80px]"} {...register("description")} />
          </Field>

          <div className="md:col-span-2 flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border-2 border-border text-primary font-ui font-bold uppercase tracking-wider text-[12px] rounded-none hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mut.isPending}
              className="px-5 py-2.5 bg-accent hover:bg-accent-strong text-white font-ui font-bold uppercase tracking-wider text-[12px] rounded-none transition-all disabled:opacity-60 flex items-center gap-2"
            >
              {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "create" ? "Create" : "Save Changes"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function Field({
  label,
  children,
  error,
  className,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={lbl}>{label}</label>
      {children}
      {error && <p className="text-[11px] text-destructive mt-1">{error}</p>}
    </div>
  );
}
