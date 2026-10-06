/*
# Create users profile table with multi-tenant RLS

## Purpose
Creates a `users` profile table that extends Supabase's built-in `auth.users` with
app-specific fields (display name, avatar). This is the foundation for multi-tenant
data isolation — every other table will reference `user_id` to scope rows to their owner.

## New Tables
1. `users` (public schema)
   - `id` — uuid, primary key, references `auth.users.id` with CASCADE delete
   - `display_name` — text, the user's display name
   - `avatar_url` — text, nullable, URL to profile picture
   - `created_at` — timestamptz, defaults to now()
   - `updated_at` — timestamptz, defaults to now()

## Security
- Row Level Security ENABLED on `users`.
- SELECT: authenticated users can read only their own profile row.
- INSERT: authenticated users can insert only their own profile row (id must match auth.uid()).
- UPDATE: authenticated users can update only their own profile row.
- DELETE: authenticated users can delete only their own profile row.
- All policies use `auth.uid()` for ownership checks (never `current_user`).

## Notes
1. The `users.id` column IS the foreign key to `auth.users.id` — there is no separate
   `user_id` column because the profile row's primary key IS the auth user's ID.
2. INSERT policy ensures a user can only create a profile for themselves (id = auth.uid()).
3. This table is the anchor for all other tables' foreign-key-based ownership checks.
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON users;
CREATE POLICY "select_own_profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON users;
CREATE POLICY "insert_own_profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON users;
CREATE POLICY "update_own_profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON users;
CREATE POLICY "delete_own_profile"
  ON users FOR DELETE
  TO authenticated
  USING (auth.uid() = id);
