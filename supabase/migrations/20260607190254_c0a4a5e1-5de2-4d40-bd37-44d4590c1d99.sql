
CREATE TABLE public.user_travel_profile (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  age_group TEXT NOT NULL DEFAULT '30-40',
  mobility TEXT NOT NULL DEFAULT 'standard',
  luggage TEXT NOT NULL DEFAULT 'carry_on_only',
  walking_speed_kmh NUMERIC(4,2) NOT NULL DEFAULT 4.5,
  sprint_capable TEXT NOT NULL DEFAULT 'moderate',
  walking_speed_samples JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_travel_profile TO authenticated;
GRANT ALL ON public.user_travel_profile TO service_role;

ALTER TABLE public.user_travel_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own travel profile"
ON public.user_travel_profile FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_travel_profile_updated_at
BEFORE UPDATE ON public.user_travel_profile
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
