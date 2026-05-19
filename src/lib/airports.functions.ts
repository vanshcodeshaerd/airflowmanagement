import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const categoryEnum = z.enum(["Domestic", "International", "Private"]);
const statusEnum = z.enum(["Active", "Under Construction", "Proposed"]);

const airportInputSchema = z.object({
  iata_code: z.string().trim().length(3).regex(/^[A-Z]{3}$/, "IATA must be 3 uppercase letters"),
  icao_code: z
    .string()
    .trim()
    .length(4)
    .regex(/^[A-Z]{4}$/)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  airport_name: z.string().trim().min(2).max(150),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  country: z.string().trim().min(1).max(80).default("India"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  operator: z.string().trim().max(150).optional().or(z.literal("").transform(() => undefined)),
  total_gates: z.number().int().min(0).max(500).optional().nullable(),
  total_terminals: z.number().int().min(0).max(50).optional().nullable(),
  total_runways: z.number().int().min(0).max(20).optional().nullable(),
  category: categoryEnum,
  status: statusEnum,
  annual_passengers_million: z.number().min(0).max(500).optional().nullable(),
  contact_phone: z.string().trim().max(40).optional().or(z.literal("").transform(() => undefined)),
  contact_email: z.string().trim().email().optional().or(z.literal("").transform(() => undefined)),
  website_url: z.string().trim().url().optional().or(z.literal("").transform(() => undefined)),
  description: z.string().trim().max(2000).optional().or(z.literal("").transform(() => undefined)),
});

const listInputSchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    category: categoryEnum.optional(),
    state: z.string().trim().max(80).optional(),
    status: statusEnum.optional(),
    sort: z.enum(["alpha", "passengers", "state"]).default("alpha"),
  })
  .default({ sort: "alpha" });

export type AirportInput = z.infer<typeof airportInputSchema>;

export const listAirports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listInputSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase.from("airports").select("*").eq("is_active", true);
    if (data.category) q = q.eq("category", data.category);
    if (data.state) q = q.eq("state", data.state);
    if (data.status) q = q.eq("status", data.status);
    if (data.search) {
      const s = `%${data.search}%`;
      q = q.or(
        `iata_code.ilike.${s},icao_code.ilike.${s},airport_name.ilike.${s},city.ilike.${s},state.ilike.${s}`,
      );
    }
    if (data.sort === "alpha") q = q.order("airport_name", { ascending: true });
    else if (data.sort === "passengers")
      q = q.order("annual_passengers_million", { ascending: false, nullsFirst: false });
    else q = q.order("state", { ascending: true }).order("airport_name", { ascending: true });
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getAirport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [airport, services, airlines] = await Promise.all([
      supabase.from("airports").select("*").eq("id", data.id).single(),
      supabase.from("airport_services").select("*").eq("airport_id", data.id),
      supabase.from("airport_airlines").select("*").eq("airport_id", data.id),
    ]);
    if (airport.error) throw new Error(airport.error.message);
    return {
      airport: airport.data,
      services: services.data ?? [],
      airlines: airlines.data ?? [],
    };
  });

export const getCurrentRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const roles = (data ?? []).map((r) => r.role as string);
    return { role: roles.includes("admin") ? "admin" : "user", roles };
  });

export const createAirport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => airportInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase.from("airports").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateAirport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), patch: airportInputSchema.partial() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("airports")
      .update(data.patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAirport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("airports").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
