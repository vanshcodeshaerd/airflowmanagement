import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ProfileSchema = z.object({
  age_group: z.string().min(1).max(20),
  mobility: z.enum(["standard", "limited", "wheelchair"]),
  luggage: z.enum(["carry_on_only", "checked", "both"]),
  walking_speed_kmh: z.number().min(1).max(10),
  sprint_capable: z.enum(["low", "moderate", "high"]),
});

export type TravelProfile = z.infer<typeof ProfileSchema>;

export const getTravelProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TravelProfile | null> => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("user_travel_profile")
      .select("age_group, mobility, luggage, walking_speed_kmh, sprint_capable")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) return null;
    return {
      age_group: data.age_group,
      mobility: data.mobility as TravelProfile["mobility"],
      luggage: data.luggage as TravelProfile["luggage"],
      walking_speed_kmh: Number(data.walking_speed_kmh),
      sprint_capable: data.sprint_capable as TravelProfile["sprint_capable"],
    };
  });

export const saveTravelProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProfileSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("user_travel_profile")
      .upsert({ user_id: userId, ...data }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recordWalkingSpeedSample = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ airport_code: z.string().min(2).max(8), speed_kmh: z.number().min(1).max(10) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("user_travel_profile")
      .select("walking_speed_samples")
      .eq("user_id", userId)
      .maybeSingle();
    const samples: Array<{ a: string; s: number; t: string }> =
      (existing?.walking_speed_samples as never) ?? [];
    const next = [
      ...samples.slice(-19),
      { a: data.airport_code, s: data.speed_kmh, t: new Date().toISOString() },
    ];
    const avg = next.reduce((sum, x) => sum + x.s, 0) / next.length;
    const { error } = await supabase
      .from("user_travel_profile")
      .upsert(
        {
          user_id: userId,
          walking_speed_samples: next,
          walking_speed_kmh: Math.round(avg * 100) / 100,
        },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true, avg };
  });
