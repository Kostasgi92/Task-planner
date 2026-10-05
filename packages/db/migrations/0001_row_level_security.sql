-- Row-level security: the database itself refuses to show or change another user's rows.
--
-- Every API request runs as the restricted role `tasknest_app` (via SET LOCAL ROLE) with
-- `app.user_id` set to the Clerk user id for that transaction. The role owns nothing and
-- has no BYPASSRLS, so the policies below always apply to it. If the setting is missing,
-- current_setting(..., true) returns NULL and the policies match no rows at all.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tasknest_app') THEN
    CREATE ROLE tasknest_app NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;
  END IF;
END
$$;
--> statement-breakpoint
-- Lets the connecting (owner) role switch into tasknest_app for each request.
GRANT tasknest_app TO CURRENT_USER;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO tasknest_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE categories, tasks TO tasknest_app;
--> statement-breakpoint
GRANT USAGE, SELECT ON SEQUENCE categories_id_seq, tasks_id_seq TO tasknest_app;
--> statement-breakpoint
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY categories_owner_only ON categories
  FOR ALL TO tasknest_app
  USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));
--> statement-breakpoint
CREATE POLICY tasks_owner_only ON tasks
  FOR ALL TO tasknest_app
  USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));
