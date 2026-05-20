REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_boarding_pass_on_booking() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_gate_for_flight(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_delay_flight(uuid, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_cancel_flight(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_change_gate(uuid, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delay_flight(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cancel_flight(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_change_gate(uuid, text, text) TO authenticated;