import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PassengerSchema = z.object({
  age_group: z.string().min(1).max(20),
  mobility: z.enum(["standard", "limited", "wheelchair"]),
  luggage: z.enum(["carry_on_only", "checked", "both"]),
  walking_speed_kmh: z.number().min(1).max(10).default(4.5),
  sprint_capable: z.enum(["low", "moderate", "high"]).default("moderate"),
});

const InboundSchema = z.object({
  scheduled_landing: z.string().min(1).max(40),
  current_live_delay_min: z.number().int().min(0).max(720),
  gate_arrival: z.string().min(1).max(20),
});

const OutboundSchema = z.object({
  scheduled_departure: z.string().min(1).max(40),
  gate: z.string().min(1).max(20),
  final_boarding_call: z.string().min(1).max(40),
  airport: z.string().min(1).max(80),
  terminal_layout: z.string().min(1).max(200),
  gate_pair_distance_m: z.number().int().min(0).max(5000).default(500),
  same_terminal: z.boolean().default(true),
  terminal_change_required: z.boolean().default(false),
});

const ConditionsSchema = z.object({
  security_queue_wait_min: z.number().int().min(0).max(240),
  immigration_queue_min: z.number().int().min(0).max(240),
  fast_track_available: z.boolean().default(false),
  train_available: z.boolean().default(false),
  crowd_density: z.enum(["low", "moderate", "high"]).default("moderate"),
});

const InputSchema = z.object({
  passenger_profile: PassengerSchema,
  inbound_flight: InboundSchema,
  outbound_flight: OutboundSchema,
  airport_conditions: ConditionsSchema,
});

export type ConnectionInput = z.infer<typeof InputSchema>;

export interface ConnectionResult {
  confidence_score: number;
  reasoning: string;
  time_available_minutes: number;
  critical_path: { step: string; duration_min: number; note?: string }[];
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommended_actions: string[];
  computed_at: string;
}

const SYSTEM_PROMPT = `You are an AI airport navigation assistant. Predict the probability a passenger will make their connecting flight.

Use this formula:
1. Time buffer = departure_time - (landing_time + immigration + security + walk + deplaning)
2. Risk multipliers: age, mobility, luggage type, airport congestion
3. Mitigation: fast-track, train, sprint capability
4. Output integer confidence 0-100

Risk levels: >=80 LOW, 60-79 MEDIUM, 40-59 HIGH, <40 CRITICAL.

Respond ONLY with raw JSON (no markdown, no code fences) matching exactly:
{
  "confidence_score": <int 0-100>,
  "reasoning": "<one sentence>",
  "time_available_minutes": <int>,
  "critical_path": [{"step": "<str>", "duration_min": <int>, "note": "<optional>"}],
  "risk_level": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL",
  "recommended_actions": ["<str>", ...]
}`;

export const predictConnectionConfidence = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<ConnectionResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI service unavailable");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(data) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Rate limited. Try again in a minute.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Settings.");
      throw new Error(`AI gateway error (${res.status}): ${txt.slice(0, 200)}`);
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: ConnectionResult;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI returned invalid JSON");
    }

    return {
      ...parsed,
      confidence_score: Math.max(0, Math.min(100, Math.round(parsed.confidence_score ?? 0))),
      computed_at: new Date().toISOString(),
    };
  });
