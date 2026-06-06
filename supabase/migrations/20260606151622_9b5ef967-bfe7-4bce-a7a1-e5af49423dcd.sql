-- Lock down Realtime channel subscriptions: deny all by default.
-- This app does not use Realtime broadcast/presence channels;
-- postgres_changes for app tables is controlled by table RLS, not realtime.messages.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny all realtime messages" ON realtime.messages;
CREATE POLICY "deny all realtime messages"
  ON realtime.messages
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);
