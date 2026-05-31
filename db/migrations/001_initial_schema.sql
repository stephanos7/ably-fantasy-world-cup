CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE league_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (league_id, user_id)
);

CREATE TABLE players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  position TEXT,
  nationality TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fantasy_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  league_id uuid REFERENCES leagues(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fantasy_team_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fantasy_team_id uuid NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fantasy_team_id, player_id)
);

CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  match_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id uuid REFERENCES players(id),
  event_type TEXT NOT NULL,
  event_time INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE player_match_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id),
  match_id uuid NOT NULL REFERENCES matches(id),
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (player_id, match_id)
);

CREATE TABLE fantasy_team_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fantasy_team_id uuid NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  match_id uuid REFERENCES matches(id),
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fantasy_team_id, match_id)
);

CREATE TABLE leaderboard_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  fantasy_team_id uuid NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (league_id, fantasy_team_id)
);

CREATE TABLE activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid REFERENCES leagues(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  message TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (league_id, user_id, message)
);
-- LiveSync connector schema.
-- Source: https://ably.com/docs/livesync/postgres
-- Checked: 2026-05-31
-- Keep this aligned with Ably's official Postgres connector docs.

CREATE TABLE IF NOT EXISTS public.nodes (
  id TEXT PRIMARY KEY,
  expiry TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.outbox (
  sequence_id serial PRIMARY KEY,
  mutation_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  name TEXT NOT NULL,
  rejected boolean NOT NULL DEFAULT false,
  data JSONB,
  headers JSONB,
  locked_by TEXT,
  lock_expiry TIMESTAMP WITHOUT TIME ZONE,
  processed BOOLEAN NOT NULL DEFAULT false
);

CREATE OR REPLACE FUNCTION public.outbox_notify() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('ably_adbc'::text, ''::text);
  RETURN NULL;
EXCEPTION -- ensure this function can never throw an uncaught exception
  WHEN others THEN
    RAISE WARNING 'unexpected error in %s: %%', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER public_outbox_trigger
AFTER INSERT ON public.outbox
FOR EACH STATEMENT
EXECUTE PROCEDURE public.outbox_notify();
