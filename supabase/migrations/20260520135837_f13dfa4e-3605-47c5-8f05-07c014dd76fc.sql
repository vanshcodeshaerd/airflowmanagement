
REVOKE EXECUTE ON FUNCTION public.admin_delay_flight(uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_cancel_flight(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_change_gate(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_gate_for_flight(uuid) FROM PUBLIC, anon, authenticated;
