
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_boarding_pass_on_booking()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()         FROM PUBLIC, anon, authenticated;
-- has_role and confirm_booking_with_payment must remain executable:
-- has_role is invoked inside RLS USING clauses by authenticated users,
-- confirm_booking_with_payment is called by users from the booking flow and self-checks auth.uid().
