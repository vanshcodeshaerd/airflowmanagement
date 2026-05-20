DROP FUNCTION IF EXISTS public.admin_delay_flight(uuid, integer, text);
DROP FUNCTION IF EXISTS public.admin_cancel_flight(uuid, text);
DROP FUNCTION IF EXISTS public.admin_change_gate(uuid, uuid);
DROP TABLE IF EXISTS public.boarding_pass_updates CASCADE;
DROP TABLE IF EXISTS public.refund_records CASCADE;
DROP TABLE IF EXISTS public.passenger_notifications CASCADE;
DROP TABLE IF EXISTS public.admin_actions CASCADE;