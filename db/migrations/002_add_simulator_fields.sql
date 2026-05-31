ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS slug text;

UPDATE matches
SET slug = lower(
  regexp_replace(home_team || '-' || away_team || '-' || left(id::text, 8), '[^a-zA-Z0-9]+', '-', 'g')
)
WHERE slug IS NULL;

ALTER TABLE matches
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS matches_slug_unique_idx
  ON matches (slug);

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS league_id uuid REFERENCES leagues(id);

UPDATE matches
SET league_id = leagues.id
FROM leagues
WHERE matches.league_id IS NULL
  AND leagues.slug = 'friends';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM matches WHERE league_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot set matches.league_id NOT NULL because existing matches could not be associated with a league.';
  END IF;
END;
$$;

ALTER TABLE matches
  ALTER COLUMN league_id SET NOT NULL;

ALTER TABLE fantasy_team_players
  ADD COLUMN IF NOT EXISTS is_captain boolean NOT NULL DEFAULT false;

